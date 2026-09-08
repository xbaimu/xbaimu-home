# xbaimu-home

基于 Next.js App Router + TypeScript + 手写 CSS 的纸本风格个人主页。项目直接建立在当前仓库根目录。

灵感来源：[imsyy/home](https://github.com/imsyy/home)。

```bash
npm install
npm run setup
npm run dev
```

访问 http://localhost:3000 。生产运行：`npm run build` 后执行 `npm start`。

## Docker 部署

需要 Docker 和 Docker Compose v2，在仓库根目录运行：

```bash
docker compose up -d --build
docker compose ps
```

访问 http://localhost:3000 。自定义端口：`PORT=8088 docker compose up -d --build`。
停止并移除容器：`docker compose down`。修改内容或版本号后重新执行带 `--build` 的启动命令。

也可以直接构建、运行镜像：

```bash
docker build -t xbaimu-home:local .
docker run -d --name xbaimu-home -p 3000:3000 --memory=256m \
  -v xbaimu-home-data:/app/data \
  --read-only --tmpfs /tmp:size=16m,mode=1777 \
  --tmpfs /app/.next/cache:size=32m,uid=1000,gid=1000,mode=0700 xbaimu-home:local
```

Docker 使用 Node.js 22 Alpine 多阶段构建，启用 Next.js `output: 'standalone'`。运行镜像只复制 standalone 产物（包含追踪到的必要依赖、静态资源及可选的 `public/`），以非 root 用户直接执行 `node server.js`，不包含 Nginx 或完整的开发依赖。构建与运行使用相同的 Alpine 基础镜像，保持原生依赖的 libc 一致。

Compose 示例见 [compose.yaml](compose.yaml)，包含首页 HTTP 健康检查、重启策略、只读根文件系统、日志轮转和 256 MiB 运行内存上限。`/tmp` 和 Next.js 缓存目录使用可写 tmpfs；构建内存不受该运行上限控制。`npm run build` 会自动补齐 standalone 的静态资源，`npm start` 直接启动同一产物，无需 `next start`。

`home-data` 命名卷挂载到 `/app/data`，SQLite 数据库位于 `/app/data/home.sqlite`（通过 `DATABASE_PATH` 设置），非 root 用户可写。`docker compose down` 保留数据卷，`down -v` 会删除数据。SQLite 数据文件及 WAL/SHM 应放在此目录，避免写入镜像或临时目录；使用宿主机目录挂载时需确保 UID/GID 1000 可写。

standalone 保留 Next.js 服务端能力，已接入 `better-sqlite3` 原生驱动。Docker 构建阶段安装 Python、make 和 g++，在 Alpine 缺少预编译包时编译驱动；运行镜像不包含这些编译工具。接入后的内存占用应重新测量，256 MiB 为当前运行上限，并非实测保证。

内存优化依据、实测结果和复现步骤见 [运行时内存分析](docs/MEMORY.md)。

```bash
npm run lint
npm run typecheck
npm run build
```

- `app/tokens.css`：本地颜色、字体、尺寸、间距、圆角、阴影变量。
- `app/globals.css`：响应式布局与组件样式。
- `components/home.tsx`：主页组件及交互。
- `lib/site.ts`：数据库首次初始化的种子数据，以及天气示例。
- `lib/server/database.ts`：SQLite 连接、版本迁移、事务读写。
- `lib/server/home-content.ts`：首页数据缓存与保存后失效。
- `docs/DESIGN-SUMMARY.md`：设计摘要、模板差异与交互说明。
- `docs/DESIGN.md`、`docs/stitch_minimalist_personal_homepage/`：原始设计参考。

时间使用访问者的本地时区；地点可在后台「站点信息」中填写；天气、空气质量和运行率为模板静态示例。服务链接使用模板或公共站点示例，品牌与备案信息也沿用模板，发布前请替换为自己的配置。氛围音为点击后播放的本地合成和弦。

页脚 Copyright 同行、作者名后的版本号由 `app/page.tsx` 从 `package.json` 读取，随构建产物写入页面。只需修改 `package.json` 的 `version` 并重新构建；线上运行时不再读取版本文件。


## SQLite 数据存储

使用 `better-sqlite3`，无需单独的数据库服务。首次首页请求会自动创建数据库、建表，并在同一事务内导入 `lib/site.ts` 的现有内容。构建阶段不访问数据库；已有数据库不会被种子数据覆盖，即使服务或寄语列表被清空也不会重新导入。

- `site_settings`：固定 `id = 1` 的站点设置，包含名称、域名后缀、签名、邮箱、备案信息。
- `services`：服务链接，包含图标、分类、颜色、排序和启用状态。
- `quotes`：寄语及作者，包含排序和启用状态。

各表含 `updated_at`，保存时刷新；通过 `PRAGMA user_version` 管理结构版本。单个 Node.js 进程复用一个连接，启用 WAL、5 秒锁等待，页面缓存目标为 2 MiB。

`npm run dev` 和在仓库根目录执行的 `npm start` 默认使用 `data/home.sqlite`。可用绝对路径覆盖：

```bash
DATABASE_PATH=/absolute/path/home.sqlite npm start
npm test
```

首页改为运行时渲染，SQLite 查询结果通过 Next.js Data Cache 跨请求复用；此阶段缓存的是数据，页面仍在每次请求时渲染。`saveHomeContent()` 用事务整体保存站点设置、服务和寄语，提交成功后立即使数据缓存失效，下一次请求加载新内容，无需重新构建。该函数由通过 JWT 身份验证的服务端设置接口调用，管理页面位于 `/settings`，读取及保存接口均验证管理会话。整体保存必须传入包含隐藏项的完整数据，可通过 `readContent(getDatabase())` 读取；首页读取只返回启用项。位置名称（`site.location`）和地区编码（`site.areacode`）可在后台「站点信息」填写并保存到 SQLite，旧数据库自动迁移。位置名称用于首页展示，留空显示「未设置位置」；areacode 按文本保存（保留前导零），请按后续接入的天气服务填写，当前尚未请求实时天气。天气示例、其他写在组件内的静态文案和社交链接暂不入库。

直接通过 SQLite 工具修改数据不会触发缓存失效。维护时应停止服务，修改数据库，清除 `.next/standalone/.next/cache`（Docker 中为 `/app/.next/cache`；开发环境为 `.next/cache`）后启动；容器重建会清空缓存 tmpfs 并保留数据卷。备份可在服务停止后复制数据库文件，运行中应使用 SQLite 备份工具，不能只复制主文件而忽略 WAL。此方案面向单实例部署。


## 设置页面与登录

访问 `/settings`，输入 `.env` 中的 `ADMIN_KEY` 即可编辑站点信息、服务链接和寄语。支持新增、删除、调整顺序、隐藏，以及保存前还原修改。登录过期后再次输入密钥可继续编辑，当前页面内未保存的修改会保留。

首次运行 `npm run setup` 会生成随机的 16 位 `ADMIN_KEY` 和独立的 `ADMIN_JWT_SECRET`，写入仓库根目录 `.env`，文件权限为 `600`，重复执行不会替换已有非空配置。该文件已被 Git 和 Docker 构建上下文忽略，standalone 打包也会排除本地环境文件。不要使用 `NEXT_PUBLIC_` 前缀保存密钥。

| 环境变量 | 用途 |
| --- | --- |
| `ADMIN_KEY` | 16 位登录密钥，允许字母、数字、下划线和短横线 |
| `ADMIN_JWT_SECRET` | 独立 JWT 签名密钥，至少 32 个字符；setup 自动生成 |
| `ADMIN_COOKIE_SECURE` | 默认 `true`，仅通过 HTTPS 发送 Cookie；setup 为本地 HTTP 调试生成 `false` |
| `APP_ORIGIN` | 可选，反向代理部署时填写浏览器访问的完整源，例如 `https://home.example.com`，不带末尾斜杠 |

`npm run dev` 和 `npm start` 会读取根目录 `.env`（建议 Node.js 22）；Compose 自动将这些变量注入容器。直接使用 `docker run` 时增加 `--env-file .env`。HTTPS 上线前将 `ADMIN_COOKIE_SECURE` 设为 `true`，反向代理需保留 Host，或正确配置 `APP_ORIGIN`。修改密钥后重启 Node.js 服务；Compose 使用 `docker compose up -d --force-recreate` 重新注入环境变量。更换登录密钥或签名密钥都会使旧 JWT 失效。

登录成功后，服务端将有效期 12 小时的 HS256 JWT 写入 `HttpOnly`、`SameSite=Strict` Cookie，浏览器脚本无法读取令牌。每次读取管理数据、保存设置都会重新验证签名、过期时间、签发者、受众和管理员身份；写请求另校验 Origin。登录接口单实例全局每分钟最多尝试 10 次。退出会清除当前浏览器 Cookie。管理功能未配置时保持关闭，不影响公开首页。

接口：`POST /api/admin/login`、`POST /api/admin/logout`、`GET /api/admin/settings`、`PUT /api/admin/settings`。保存接口对所有字段进行服务端校验，并以事务整体保存；不会接受任意协议的链接。

验证命令：

```bash
npm test
npm run lint
npm run typecheck
npx playwright install chromium
npm run test:e2e
```

浏览器测试使用独立的测试密钥及 `.next/e2e/home.sqlite`，不会修改 `data/home.sqlite`。覆盖登录、Cookie、编辑保存、首页缓存更新、移动布局、过期续登、退出、伪造令牌及跨站请求拒绝。

服务链接支持从 16 种内置图标中选择，选择后即时预览，保存后显示在首页。数据库版本 2 自动新增 `services.icon`，保留原有服务的图标和内容；自定义服务默认使用链接图标。

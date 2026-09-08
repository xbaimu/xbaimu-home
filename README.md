# xbaimu-home

基于 Next.js App Router + TypeScript + 手写 CSS 的纸本风格个人主页。项目直接建立在当前仓库根目录。

```bash
npm install
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

`home-data` 命名卷挂载到 `/app/data`，已预留给后续 SQLite 数据库（例如 `/app/data/home.sqlite`），非 root 用户可写；当前尚未接入数据库驱动或业务逻辑。`docker compose down` 保留数据卷，`down -v` 会删除数据。SQLite 数据文件及 WAL/SHM 应放在此目录，避免写入镜像或临时目录；使用宿主机目录挂载时需确保 UID/GID 1000 可写。

standalone 保留 Next.js 服务端能力，可后续接入 Server Actions 和 SQLite。当前主页仍使用 `force-static`，版本号和内容在构建时生成；接入请求时数据库查询时需相应调整页面缓存/渲染策略，写入后使用 Next.js 的重新验证机制刷新页面。Alpine 使用 musl，后续选择原生 SQLite 驱动时需确认其支持，必要时在构建阶段安装编译工具。新增功能后应重新测量内存并调整 Compose 上限。

内存优化依据、实测结果和复现步骤见 [运行时内存分析](docs/MEMORY.md)。

```bash
npm run lint
npm run typecheck
npm run build
```

- `app/tokens.css`：本地颜色、字体、尺寸、间距、圆角、阴影变量。
- `app/globals.css`：响应式布局与组件样式。
- `components/home.tsx`：主页组件及交互。
- `lib/site.ts`：品牌、寄语与服务入口配置。
- `docs/DESIGN-SUMMARY.md`：设计摘要、模板差异与交互说明。
- `docs/DESIGN.md`、`docs/stitch_minimalist_personal_homepage/`：原始设计参考。

时间使用访问者的本地时区；天气、地点、空气质量和运行率为模板静态示例。服务链接使用模板或公共站点示例，品牌与备案信息也沿用模板，发布前请替换为自己的配置。氛围音为点击后播放的本地合成和弦。

页脚 Copyright 同行、作者名后的版本号由 `app/page.tsx` 从 `package.json` 读取，在 `npm run build` 静态生成时写入页面。只需修改 `package.json` 的 `version` 并重新构建；线上运行时不再读取版本文件。

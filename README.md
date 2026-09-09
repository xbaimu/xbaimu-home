# xbaimu-home

纸本风格的个人主页，基于 Next.js、React 和 TypeScript 构建，支持在线管理站点内容和 Docker 部署。
灵感来源：[imsyy/home](https://github.com/imsyy/home)。

## 功能

- 响应式布局，适配桌面和移动设备。
- 展示个人信息、服务链接、寄语、本地时间和天气。
- 内置管理后台，可编辑站点信息、页面标题、备案信息，以及服务链接和寄语。
- 接入和风天气，支持城市编码或经纬度定位。
- 使用 SQLite 保存配置，无需额外部署数据库。

## 快速开始

需要 Node.js 22。

```bash
git clone https://github.com/JayXGuan/xbaimu-home.git
cd xbaimu-home
npm ci
npm run setup
npm run dev
```

打开 <http://localhost:3000>。访问 `/settings`，使用 `.env` 中的 `ADMIN_KEY` 登录管理后台。站点内容保存后即可生效。

生产环境运行：

```bash
npm run build
npm start
```

## Docker 部署

### 使用发布镜像

准备 `.env` 文件，可通过 `npm run setup` 自动生成，或参考 [.env.example](.env.example) 填写管理密钥。

```bash
docker run -d \
  --name xbaimu-home \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  -v xbaimu-home-data:/app/data \
  ghcr.io/jayxguan/xbaimu-home:latest
```

镜像支持 `linux/amd64`，可选择以下标签：

| 标签 | 用途 |
| --- | --- |
| `latest` | 最近发布的正式版 |
| `v1.0.0` 等版本号 | 指定正式版本 |
| `test` | 最近发布的测试版 |

### 使用 Docker Compose 构建

克隆仓库并准备 `.env` 后运行：

```bash
docker compose up -d --build
```

默认端口为 `3000`，可通过 `PORT=8088 docker compose up -d --build` 修改。更新源码后，重新执行构建命令即可。

数据保存在 Docker 命名卷中，停止服务使用 `docker compose down`；加上 `-v` 会同时删除数据卷。

## 配置

`npm run setup` 会生成管理密钥并写入 `.env`，保留已有配置。

| 环境变量 | 说明 |
| --- | --- |
| `ADMIN_KEY` | 后台登录密钥，16 位字母、数字、下划线或短横线 |
| `ADMIN_JWT_SECRET` | 登录会话签名密钥，至少 32 个字符 |
| `ADMIN_COOKIE_SECURE` | HTTPS 部署设为 `true`，本地 HTTP 调试设为 `false` |
| `APP_ORIGIN` | 可选，站点完整访问地址，例如 `https://home.example.com` |
| `DATABASE_PATH` | 可选，SQLite 数据库路径，默认 `data/home.sqlite`，容器内为 `/app/data/home.sqlite` |

修改环境变量后需重启服务；Docker Compose 使用 `docker compose up -d --force-recreate`。未配置管理密钥时，后台登录不可用。

### 天气

在管理后台「站点信息」中填写位置名称、地区编码，以及和风天气 API Host、开发者 ID、项目 ID、凭据 ID 和 Ed25519 私钥。地区编码支持和风天气 Location ID 或 `经度,纬度`。

密钥创建方式见[和风天气官方认证文档](https://dev.qweather.com/docs/configuration/authentication/#generate-ed25519-key)。未配置时，首页显示「天气未配置」。

### 数据备份

站点配置保存在 SQLite 中。备份时先停止服务，再复制 `data` 目录或 Docker 数据卷中的文件。若配置了天气服务，备份也包含天气私钥，请妥善保存。

## 自动发布

[GitHub Actions](.github/workflows/docker-publish.yml) 根据推送的 Git tag 构建镜像并发布到 GHCR：

| Git tag | 镜像标签 |
| --- | --- |
| `v1.0.0` | `latest`、`v1.0.0` |
| `dev-1.0.0` | `test` |

版本格式为三段数字。正式版发布示例：

```bash
git tag v1.0.0
git push origin v1.0.0
```

测试版使用 `dev-` 前缀。流程使用内置 `GITHUB_TOKEN`，无需额外配置密钥；首次发布后，将 GHCR 包设为 Public 即可支持匿名拉取。

## 开发

```bash
npm run lint
npm run typecheck
npm test
```

浏览器测试：

```bash
npx playwright install chromium
npm run test:e2e
```

## 致谢

设计灵感来自 [imsyy/home](https://github.com/imsyy/home)。

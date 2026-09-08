# 运行时内存与部署体积

## 当前方案

部署采用 Next.js `output: 'standalone'` 和 Node.js 22 Alpine。构建阶段安装锁定依赖并编译，运行阶段只复制 `.next/standalone`，以非 root 用户直接执行 `node server.js`。`scripts/prepare-standalone.mjs` 补齐 Next.js 不自动复制的 `.next/static` 和可选 `public/`，因此本地 `npm start` 和容器都可直接提供完整页面。

standalone 通过文件追踪裁剪部署依赖，主要优化镜像内容；它仍运行 Node.js / V8，不能把磁盘体积下降等同于内存下降。当前镜像无 Nginx、完整开发依赖或构建缓存，保留 Server Actions、路由处理和请求时数据库访问所需的服务端能力。

Compose 使用 256 MiB 内存上限、128 个进程/线程上限，运行单个 Node.js 服务进程，不通过 npm 或额外进程管理器启动。根文件系统只读，`/tmp` 和 `.next/cache` 使用有大小上限的 tmpfs，`/app/data` 使用可写持久化卷。内存上限是保护边界，tmpfs 使用量也计入容器内存；构建阶段不受该上限控制。

后续 SQLite 数据库及其 WAL/SHM 文件应放到 `/app/data`，不要放入构建产物。当前未引入 SQLite 驱动；选择原生驱动时需验证 Alpine/musl 兼容性，构建与运行阶段应保持 libc 一致。主页当前为 `force-static`，接入请求时数据库查询时应调整页面渲染/缓存策略，Server Actions 写入后按需重新验证页面。

## 本机实测

2026-09-08，Linux / Docker 28.4.0 / cgroup v2，Next.js 16.3.4。

每个容器先请求首页 20 次预热，再用 Python 标准库执行 1,000 次完整首页响应读取，并发数 10，以 50 ms 间隔采样。指标为 `memory.current - inactive_file`，与 Linux `docker stats` 的工作集口径类似，包含容器内进程，排除非活跃文件缓存；不是 JS 堆或进程 RSS。

| 部署方式 | 预热后空闲 | 请求期间采样峰值 | 请求完成后 |
| --- | ---: | ---: | ---: |
| 原生产服务（此前测量，Node 22 Debian slim + next start） | 99.46 MiB | 108.75 MiB | 108.75 MiB |
| 当前 standalone（Node 22 Alpine + node server.js） | 35.20 MiB | 42.50 MiB | 41.34 MiB |

相对此前基线，本次空闲工作集下降约 64.6%，采样峰值下降约 60.9%。基础镜像、libc、启动入口和部署产物均有变化，此对比反映整体部署结果，不能归因于 standalone 单项配置。此前 Nginx 静态托管的数据不适用于当前 Node.js 部署。

当前镜像的本地未压缩大小为 219.94 MiB，其中 `/app` 约 67.1 MiB，追踪后的 `node_modules` 约 64.8 MiB；镜像仍包含 Node.js Alpine 基础运行环境。磁盘大小与运行内存是不同指标。容器在 256 MiB 上限下保持健康，未发生 OOM。

这是短时首页请求对比，不是长期泄漏测试或容量保证。50 ms 采样可能漏掉瞬时峰值；未来 SQLite 缓存、Server Actions 请求体、慢连接和并发写入都会改变内存消耗，接入后需要重新测量。未测量构建峰值和浏览器堆内存。

## 复现当前部署

需要本机 Linux cgroup v2、Docker、Python 3，脚本需能读取宿主机 `/proc` 与 `/sys/fs/cgroup`（不适用于远程 Docker daemon 或直接在 macOS 上读取 Docker VM 内的 cgroup）。在仓库根目录执行：

```bash
PORT=18302 docker compose -p xbaimu-home-verify up -d --build --wait
python3 scripts/measure-memory.py xbaimu-home-verify-home-1 http://127.0.0.1:18302/
docker image inspect xbaimu-home:local --format '{{.Size}}'
PORT=18302 docker compose -p xbaimu-home-verify down
```

`down` 保留数据卷。脚本支持 `--requests`、`--concurrency`；请求失败会终止并报错，不会输出成功结果。测量时不要同时重建、重启容器或对其执行其他负载。表中的原生产服务数值来自改为 standalone 之前的测量，以上命令仅复现当前方案。

## 浏览器侧观察

源码中的定时器和全屏事件在卸载时清理，分类菜单关闭时移除事件监听，AudioContext 仅点击后创建并在卸载时关闭，未发现明显的无限增长容器或重复注册泄漏。暂停音频使用 `suspend()`，会保留上下文以便恢复。主页每秒更新时间会触发整个 Home 组件重新渲染，可能带来额外分配和 CPU 开销，尚未通过浏览器堆快照定量验证。本次不修改页面交互，也不将服务端收益推算为浏览器内存收益。

## 验证范围

已通过 ESLint、TypeScript 检查、本地生产构建和 `npm start`、Docker standalone 构建、Compose 健康检查。HTTP 检查覆盖首页版本号、首页引用的 8 个脚本/样式资源的 MIME 和缓存头，以及未知页面和缺失资源的 404。

已验证非 root UID 1000 可写 `/app/data` 和 `.next/cache`，根文件系统只读，数据卷中的测试文件在容器重建后仍保留。该验证覆盖部署权限和持久化，不代表已测试尚未实现的 SQLite 业务或 Server Actions；未执行浏览器自动化交互测试。

# 设计落地摘要

依据 `docs/DESIGN.md` 与 `docs/stitch_minimalist_personal_homepage` 的 HTML / 截图还原。采用 Next.js App Router、TypeScript、手写 CSS；项目根目录就是仓库当前目录。

## 视觉原则

纸本浅底、稀疏点阵、白色卡片、1px 细边框和极轻接触阴影。用留白和字号组织层级，避免大面积渐变、重阴影。左栏放身份、手札、社交入口；右栏放寄语、时间及六个服务入口。

## 本地设计变量

`app/tokens.css` 是全站设计变量入口，由 `app/globals.css` 引入。

| 类别 | 主要变量 / 约定 |
| --- | --- |
| 背景 | `--bg-base: #f8f9fa`，`--bg-dot-pattern`，24px 点阵 |
| 卡片 | `--card-bg`、`--card-border`、`--card-hover-border` |
| 文本 | `--text-primary`、`--text-secondary`、`--text-muted`、`--text-tertiary` |
| 点缀 | `--accent-green/sky/rose/amber/clock-hand` |
| 字体 | `--font-sans` 正文、`--font-mono` 时间和版本、`--font-brand` 品牌、`--font-quote` 寄语 |
| 字号 | 正文 14px、模块 16px、标签 12px、数字时钟 36–38px |
| 间距 | `--space-xs/sm/md/lg/xl/2xl` 对应 4/8/16/24/32/48px |
| 圆角 | `--radius-sm/base/md/lg/xl/full` 对应 4/8/12/16/24px/胶囊 |
| 容器 | `--canvas-max: 1152px`，移动安全边距 24px |
| 动效 | `--motion-fast: 200ms`，服务 hover 上浮 2px，尊重减少动态效果设置 |

## 模板与规范差异处理

基础色、点阵和手札圆角以 DESIGN.md 为准。品牌沿用模板 Comfortaa 40–48px 字标，而非普通 28px 标题；桌面头像沿用模板 96px，移动端 80px；分针沿用模板浅蓝，秒针使用规范红色。桌面画布按模板保留 40px 内边距、40px 栏间距和 5:7 栅格比例。字体通过 @fontsource 打包到本地，不依赖 Google Fonts 或图标 CDN。

## 响应式与交互

- 1024px 起左右双栏；较小屏幕上下堆叠。
- 640px 起双组件、三列服务；移动端单组件、两列服务。
- 时钟客户端每秒刷新，数字时间和指针共享同一时间，使用浏览器本地时区。
- 一言点击循环切换；全屏支持进入、退出及错误提示。
- 氛围音由 Web Audio 本地合成，用户点击后才播放，可暂停。
- 分类导航和底部三个指示点对应全部、生活随笔、实用工具；支持键盘和焦点样式。
- 天气、空气质量、运行率为模板示例，未连接外部 API；保留来源内容用于视觉还原，通过 title 标明示例。
- 品牌、备案、社交与服务链接为模板/示例配置，发布前须在 `lib/site.ts`、`components/home.tsx` 替换为实际信息。

## 版本展示

版本号位于页脚 Copyright 同一行、作者名后，以等宽 11px 次要文字展示。`package.json` 为版本号唯一来源，服务端页面在构建时读取并传入主页组件，静态生成后随构建固定，不在客户端请求或读取配置文件。

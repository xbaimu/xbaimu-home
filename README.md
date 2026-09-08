# xbaimu-home

基于 Next.js App Router + TypeScript + 手写 CSS 的纸本风格个人主页。项目直接建立在当前仓库根目录。

```bash
npm install
npm run dev
```

访问 http://localhost:3000 。生产运行：`npm run build` 后执行 `npm start`。

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

---
name: Paper Craft Minimalist
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#44474c'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#75777c'
  outline-variant: '#c5c6cc'
  surface-tint: '#555f6f'
  primary: '#0a1422'
  on-primary: '#ffffff'
  primary-container: '#1f2937'
  on-primary-container: '#8690a1'
  inverse-primary: '#bdc7d9'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#001626'
  on-tertiary: '#ffffff'
  tertiary-container: '#002b45'
  on-tertiary-container: '#2f96db'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d9e3f6'
  primary-fixed-dim: '#bdc7d9'
  on-primary-fixed: '#121c2a'
  on-primary-fixed-variant: '#3d4756'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
  bg-base: '#F8F9FA'
  bg-dot-pattern: rgba(209, 213, 219, 0.2)
  card-bg: '#FFFFFF'
  card-border: rgba(229, 231, 235, 0.9)
  card-hover-border: rgba(16, 185, 129, 0.4)
  text-primary: '#1F2937'
  text-secondary: '#4B5563'
  text-tertiary: '#9CA3AF'
  text-muted: '#6B7280'
  accent-green: '#10B981'
  accent-sky: '#0284C7'
  accent-rose: '#E11D48'
  accent-amber: '#D97706'
  accent-clock-hand: '#EF4444'
typography:
  display-time:
    fontFamily: JetBrains Mono
    fontSize: 38px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: 0.04em
  headline-title:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-title-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-module:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-default:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.01em
  body-secondary:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-badge:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  caption-meta:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  canvas-max: 1152px
  gutter: 1.5rem
  margin-mobile: 1.5rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

# DESIGN.md — 日系轻氧 · 质感纸本手作个人主页设计规范

> **设计基调与定位**  
> 本设计遵循「克制、质感、人文、去 AI 塑料味」的核心哲学。以经典日系文具纸本、触感手作与轻氧晨光为灵感，拒绝浮夸的大面积霓虹渐变与虚浮光效，重塑纯粹、温润、清透、一目了然的独立开发者/创作者个人主页。

---

## 1. 核心设计哲学 (Design Philosophy)

1. **温润纸本触感 (Tactile Warmth)**：
   - 采用温和低饱和的米纸白底色，叠加轻微的点阵（Dot Grid）几何肌理，模拟精装手帐纸张的实体质感与秩序感。
2. **克制精巧层次 (Subtle Hierarchy)**：
   - 彻底摒弃深重阴影与强对比发光，采用 `1px` 微透明边框线（Hairline Border）与弥散极微的接触阴影，卡片轻盈悬浮于纸面之上。
3. **呼吸感与网格韵律 (Rhythm & Spacing)**：
   - 左右两栏分工明确：左栏专注于「个人身份与精神寄语（Identity & Manifest）」，右栏专注于「日常看板与核心导航（Dashboard & Tools）」，留白充沛，节奏舒缓。
4. **实体细节与人文温度 (Handcrafted Details)**：
   - 纯扁平红黑拟物时钟、淡雅莫兰迪色彩的微型服务图标、胶囊版本标、双引号手札质感，呈现真实独立匠人的生活与思考痕迹。

---

## 2. 色彩系统 (Color Palette)

### 2.1 背景与基础色 (Background & Surface)
| Token 名称 | 色值 | 用途说明 |
| :--- | :--- | :--- |
| `--bg-base` | `#F8F9FA` | 全局纸本底色，温润不刺眼 |
| `--bg-dot-pattern` | `#D1D5DB` (20% opacity) | 24px 网格点阵纹理，强化纸质手帐秩序感 |
| `--card-bg` | `#FFFFFF` | 卡片主体背景，纯净纸白 |
| `--card-border` | `rgba(229, 231, 235, 0.9)` | 1px 极细分界边框，提供恰到好处的轮廓定义 |
| `--card-hover-border` | `rgba(16, 185, 129, 0.4)` | 悬浮微绿交互边框 |

### 2.2 文本与层级 (Typography Colors)
| Token 名称 | 色值 | 用途说明 |
| :--- | :--- | :--- |
| `--text-primary` | `#1F2937` (Gray-800) | 主标题、时钟数字、核心文本 |
| `--text-secondary` | `#4B5563` (Gray-600) | 卡片正文、寄语内容、服务标题 |
| `--text-tertiary` | `#9CA3AF` (Gray-400) | 署名作者、引文标点、微小说明文案 |
| `--text-muted` | `#6B7280` (Gray-500) | 底部版权声明、备案号、状态辅助文本 |

### 2.3 品牌与点缀色 (Accents & Highlights)
| Token 名称 | 色值 | 用途说明 |
| :--- | :--- | :--- |
| `--accent-green` | `#10B981` (Emerald-500) | 在线状态指示灯、绿叶徽章、博客微图标 |
| `--accent-sky` | `#0284C7` (Sky-600) | 网盘服务微色调 |
| `--accent-rose` | `#E11D48` (Rose-600) | 音乐服务微色调、底栏爱心图标 |
| `--accent-amber` | `#D97706` (Amber-600) | 网址集、热榜、天气温润标识 |
| `--accent-clock-hand` | `#EF4444` (Red-500) | 实体表盘秒针点缀色 |

---

## 3. 字体排印 (Typography System)

- **无衬线字体栈 (Sans-serif Stack)**：
  `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;`
- **等宽代码字体栈 (Monospace Stack)**：
  `font-family: "JetBrains Mono", "Fira Code", SFMono-Regular, Menlo, Monaco, Consolas, monospace;`

### 层级规范：
- **时钟时间 Display**：`font-mono`, `text-4xl` (~36px - 40px), `font-semibold`, 字母微宽字距。
- **站点品牌 Title**：`text-3xl` (~28px), `font-bold`, 紧随小副标 `.top` (`text-gray-400`, `font-normal`)。
- **模块标题 Heading**：`text-base` (~16px), `font-semibold`, 配合精致小前缀图标。
- **正文与寄语 Body**：`text-sm` (~14px), 行高 `leading-relaxed` (1.6 - 1.7)，字间距舒缓。
- **微注与标签 Caption / Badge**：`text-xs` (~12px), `font-mono` 或 `font-medium`，背景浅灰圆角胶囊。

---

## 4. 间距、栅格与容器 (Layout & Spacing)

### 4.1 容器宽度
- **整体画布**：`max-w-6xl` (~1152px) 居中自适应布局。
- **水平安全边距**：`px-6 md:px-12`。
- **垂直对齐**：全屏自适应纵向居中（`min-h-screen flex flex-col justify-between`）。

### 4.2 栅格结构 (Grid Architecture)
- 左右双栏非对称排布（40% : 60%），兼顾大面积呼吸留白与紧凑的信息看板。

---

## 5. 组件设计规范 (Component Specifications)

### 5.1 实体拟物时钟表盘 (Analog Clock Avatar)
- **尺寸**：`w-20 h-20` (80px)。
- **质感**：深石板灰底，外嵌 3px 极淡边框与微柔阴影。
- **指针**：时针、分针白色条状，秒针亮红点睛（`#EF4444`）。

### 5.2 纸质随笔手账便签卡片 (Note Card)
- **圆角**：`rounded-2xl` (16px)。
- **装饰**：左右双引号水印，版本胶囊标签（`rounded-md`，等宽字体）。

### 5.3 服务应用磁贴 (Service Grid Tile)
- **布局**：6 格双行（2行3列）。
- **微图标背景**：淡彩低饱和底色配主题色图标。
- **Hover 微动效**：位移 `translate-y-[-2px]`，平滑投影扩展。

### 5.4 社交媒体矩阵条 (Social Dock)
- **容器**：`w-10 h-10` 浅灰圆角微块。
- **状态**：默认纯灰（`#4B5563`），Hover 转黑并微浮动。

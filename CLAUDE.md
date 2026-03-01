# 花儿与少年：星光之旅 — AI 综艺真人秀互动游戏

React 19 + Zustand 5 + Immer + Vite 7 + Tailwind CSS v4 + Framer Motion + Cloudflare Pages

## 架构

```
16list-huashao/
├── worker/index.js              - ☆ CF Worker API 代理（备用，未部署）
├── public/
│   ├── audio/bgm.mp3            - 背景音乐
│   ├── characters/              - 6 角色立绘 9:16 竖版 (1152x2048)
│   └── scenes/                  - 6 场景背景 9:16 竖版 (1152x2048)
├── src/
│   ├── main.tsx                 - ☆ React 入口
│   ├── vite-env.d.ts            - Vite 类型声明
│   ├── App.tsx                  - 根组件: 三幕开场(经纪人消息→热搜速览→化妆间通告单) + GameScreen + EndingModal + MenuOverlay
│   ├── lib/
│   │   ├── script.md            - ★ 剧本直通：五模块原文（零转换注入 prompt）
│   │   ├── data.ts              - ★ UI 薄层：类型(含富消息扩展) + 6角色 + 6场景 + 6道具 + 3章节 + 7事件 + 7结局
│   │   ├── store.ts             - ★ 状态中枢：Zustand + 富消息插入(场景/换日) + 抽屉状态 + StoryRecord + Analytics + 双轨解析
│   │   ├── parser.ts            - AI 回复解析（6角色着色 + 数值着色）
│   │   ├── analytics.ts         - Umami 埋点（hs_ 前缀，已集成到 store/App）
│   │   ├── stream.ts            - ☆ SSE 流式通信
│   │   ├── bgm.ts               - 背景音乐（useBgm hook + initBGM/toggleBGM 独立函数）
│   │   └── hooks.ts             - ☆ useMediaQuery / useIsMobile
│   ├── styles/
│   │   ├── globals.css          - 全局基础样式（hs- 前缀，深蓝星夜主题变量）
│   │   ├── opening.css          - 开场样式：经纪人消息 + 热搜速览 + 化妆间通告单
│   │   └── rich-cards.css       - 富UI组件：场景卡 + 日变卡 + 档案卡 + NPC气泡 + DashboardDrawer + RecordSheet + SVG关系图 + Toast
│   └── components/game/
│       ├── app-shell.tsx        - 桌面居中壳 + Header(📓+🎵+☰+📜) + 三向手势 + Tab路由 + TabBar + DashboardDrawer + RecordSheet + Toast
│       ├── dashboard-drawer.tsx - 旅程手账(左抽屉)：扉页+人气速览+角色轮播+场景缩略图+旅行目标+道具格+迷你播放器。Reorder拖拽排序
│       ├── tab-dialogue.tsx     - 对话 Tab：富消息路由(SceneCard/DayCard/NPC头像气泡) + 快捷操作 + 背包
│       ├── tab-scene.tsx        - 场景 Tab：9:16大图 + 真实头像人物标签 + 地点列表
│       └── tab-character.tsx    - 人物 Tab：立绘 + 属性 + SVG RelationGraph + 真实头像关系列表 + CharacterDossier 全屏档案
├── index.html
├── package.json
├── vite.config.ts               - ☆
├── tsconfig*.json               - ☆
└── wrangler.toml                - ☆
```

★ = 种子文件 ☆ = 零修改模板

## 核心设计

- **综艺真人秀 + 情商博弈**：6 嘉宾（2女前辈 + 2男攻略线 + 2男辅助）21天穷游
- **双轨数值**：5 全局属性（凝聚力/艺能感/生存技能/人气/身心状态）+ NPC 好感度
- **深蓝星夜主题**：深蓝底(#0c0e1a)+珊瑚粉(#FF7EB3)+星光金(#FFD700)，hs- CSS 前缀
- **4 时段制**：每天 4 时段（清晨/午间/午后/夜晚），共 84 时间槽
- **剧本直通**：script.md 存五模块原文，?raw import 注入 prompt
- **7 结局**：BE×2 + TE×2 + HE×2 + NE×1，优先级 BE→TE→HE→NE

## 富UI组件系统

| 组件 | 位置 | 触发 | 视觉风格 |
|------|------|------|----------|
| AgentChat | App.tsx | 开场Phase1 | 深夜手机界面+经纪人消息气泡逐条出现+打字指示器+粉色CTA |
| HotSearch | App.tsx | 开场Phase2 | 热搜信息流+6嘉宾头像卡片逐条滑入+火标签+玩家专属高亮卡 |
| MakeupNotice | App.tsx | 开场Phase3 | 暖光化妆间+镜前灯泡+通告单卡片+艺名输入+暖金CTA |
| DashboardDrawer | dashboard-drawer | Header📓+右滑手势 | 毛玻璃左抽屉：扉页+人气+角色轮播+场景缩略图+旅行目标+道具+播放器。Reorder拖拽 |
| RecordSheet | app-shell | Header📜+左滑手势 | 右侧滑入事件记录：时间线倒序+粉色圆点 |
| SceneTransitionCard | tab-dialogue | selectScene | 场景背景+Ken Burns(8s)+渐变遮罩 |
| DayCard | tab-dialogue | 换日 | 日历撕页风弹簧落入+逐字打字机(80ms) |
| RelationGraph | tab-character | 始终可见 | SVG环形布局，中心"我"+6NPC立绘节点+连线+关系标签 |
| CharacterDossier | tab-character | 点击角色 | 全屏右滑入+50vh立绘呼吸动画+好感阶段 |
| MiniPlayer | dashboard-drawer | 手账内 | 播放/暂停+5根音波柱动画 |
| Toast | app-shell | saveGame | TabBar上方弹出2s消失 |

## 三向手势导航

- **右滑**（任意主Tab内容区）→ 左侧旅程手账
- **左滑**（任意主Tab内容区）→ 右侧事件记录
- Header 按钮（📓/📜）同等触发
- 手账内组件支持拖拽排序（Reorder + localStorage `hs-dash-order` 持久化）

## Store 状态扩展

- `showDashboard: boolean` — 左抽屉开关
- `showRecords: boolean` — 右抽屉开关
- `storyRecords: StoryRecord[]` — 事件记录（sendMessage 和 advanceTime 自动追加）
- `selectCharacter` 末尾自动跳转 dialogue Tab

## 富消息机制

Message 类型扩展 `type` 字段路由渲染：
- `scene-transition` → SceneTransitionCard（selectScene 触发）
- `day-change` → DayCard（advanceTime 换日时触发）
- NPC 消息带 `character` 字段 → 32px 圆形立绘头像

## Analytics 集成

- `trackGameStart` / `trackPlayerCreate` → App.tsx 开场
- `trackGameContinue` → App.tsx 继续游戏
- `trackTimeAdvance` / `trackChapterEnter` → store.ts advanceTime
- `trackEndingReached` → store.ts checkEnding
- `trackWellbeingCrisis` → store.ts wellbeing≤30
- `trackSceneUnlock` → store.ts selectScene/advanceTime

## 链式反应

- 凝聚力≥80 → 全员好感+3
- 身心状态≤30 → 艺能感效果减半（触发预警）
- 人气≥5000万 → 凝聚力+2

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

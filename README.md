# CoC7 调查员建卡工坊

一个面向手机端的 CoC7 车卡软件：强调顺滑流程、即时反馈、低学习成本，并带一点“电子游戏感”的交互节奏。

## 项目目标

- 易懂：新手也能跟着分章流程快速完成一张可用角色卡。
- 有反馈：关键规则（技能池、职业约束、信用评级）给出实时提醒，不强制打断。
- 手机友好：优先支持 Android/iOS 封装，核心操作在触屏上可完成。
- 可开源协作：规则、数据、导出逻辑分层，便于扩展和维护。

## 当前能力

- 分阶段流程：序章 → 第一章 → 第二章 → 第三章 → 终章。
- 职业图鉴选择与搜索，支持切换职业时“清空职业点 / 保留当前职业点”。
- 属性骰点、快速分配、年龄修正预览与应用。
- 技能页职业技能高亮、可选组/自选项选择、规则软校验与超限提醒。
- 背景、关键链接、经历包与武器选择（可累加数量、可移除）。
- Excel 导出：写入模板关键单元格，并兼容原生端文件保存与分享。

## 技术栈

- 前端：Vue 3 + Vite
- 移动封装：Capacitor (Android / iOS)
- 导出：JSZip + 自定义 Excel XML 写入

## 本地开发

```powershell
npm install
npm run dev
```

或使用：

```powershell
.\serve.ps1
```

默认地址：`http://localhost:5173`

## 构建与移动端

```powershell
npm run build
npm run cap:sync
npm run cap:open:android
```

## 数据与模板来源

- 运行/构建前会执行 `sync:assets`，将 `data/*.json` 同步到 `public/data`。
- 空白卡模板会同步到 `public/templates/coc7-blank-card.xlsx`。
- 若外部数据不可用，运行时会回退到内置基础数据。

## 文档

- 产品介绍：`docs/open-source-intro.md`
- APK 发布说明：`docs/apk-release.md`
- 移动端路线：`docs/mobile-app-roadmap.md`

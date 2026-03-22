# 移动 App 实施路径（Android + iOS）

## 目标
- 基于现有 `Vue + Vite` 代码直接封装原生 App。
- 保持 CoC7 业务逻辑不重写，优先保证稳定、流畅、可上架。
- 为后续并行接入 DND 规则预留架构空间。

## 已落地基础
- 已接入 `Capacitor` 依赖与配置（`capacitor.config.ts`）。
- 导出链路已兼容原生端：
  - Web: 浏览器下载。
  - Native: 写入 Documents 并调起系统分享。
- 新增 `sync:assets` 流程，构建前自动同步：
  - `data/*.json` -> `public/data/*`
  - 空白卡模板 -> `public/templates/coc7-blank-card.xlsx`

## 打包命令
1. `npm run cap:add:android`
2. `npm run cap:sync`
3. `npm run cap:open:android`
4. iOS（需 macOS）:
   - `npm run cap:add:ios`
   - `npm run cap:sync`
   - `npm run cap:open:ios`

## 上架建议
- Android: 先发 `internal testing`，验证不同机型文件导出/分享流程。
- iOS: TestFlight 先做 1~2 轮灰度，再正式提交审核。
- 审核文案重点说明：
  - 本应用用于 TRPG 角色创建。
  - 不收集敏感个人信息。
  - 导出文件仅保存在用户设备本地。

## DND 扩展路线（不推翻 CoC）
- 保持 UI 流程层不变：身份 -> 属性 -> 技能 -> 背景 -> 导出。
- 将规则拆为并列模块：
  - `rules/coc7/*`
  - `rules/dnd5e/*`
- 公共层抽象：
  - 点数池计算器
  - 技能约束与软提醒引擎
  - 导出管线（按规则切换模板）
- 第一阶段先做 CoC 稳定发布，第二阶段再接 DND 规则与模板。

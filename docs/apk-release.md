# Android APK 发布说明

本文档用于 Release 阶段的 APK 产物与发布检查。

## 1. 环境准备

- Node.js 18+
- Android Studio（含 SDK / Build-Tools / Platform-Tools）
- JDK 17（建议与 Android Studio 一致）

## 2. 构建流程

在仓库根目录执行：

```powershell
npm install
npm run build
npm run cap:sync
```

然后在 `android/` 目录执行：

```powershell
.\gradlew.bat assembleRelease
```

APK 默认输出位置：

`android/app/build/outputs/apk/release/app-release.apk`

## 3. 基本验收项

- App 可正常启动并进入角色创建流程。
- 属性、技能、背景三个关键页面可在手机上顺畅操作。
- Excel 导出可成功保存/分享。
- 已生成文件名包含调查员名称。

## 4. Release 附件建议

- `app-release.apk`
- 本文档 `docs/apk-release.md`
- 可选：更新日志（新功能、修复、已知限制）

## 5. 已知说明

- 若需要上架商店，建议改为 AAB 构建并配置签名。
- 若导出失败，优先检查文件权限与系统分享能力。

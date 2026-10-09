# Changelog

## [0.2.0] - 2026-09-30

- **移除系统托盘图标功能（整体砍掉）**：删除 `tray` 配置项、`webUrl` 配置项、`scripts/tray.ps1`、`assets/dsh.ico` 及 lib 内全部托盘 spawn / 清理逻辑；插件只保留 Windows 原生 Toast 通知功能；
- **新增 Windows 环境系统提示段落注入**：经 `inject: ['systemPrompt']` 向 agent 系统提示词注入一段 Windows 环境要点（编码 / 路径 / 进程防坑提示），随总开关 `enabled` 启停；
- 文档与元数据同步：README（中/英）、banner、npm description / keywords 去除托盘相关内容，兼容性实测更新至 DSH 0.2.0-rc.2，相关插件表移除已弃用的 workbench。

## [0.1.7] - 2026-09-10

- 安全：spawn 子进程环境变量清洗——剔除变量名含 KEY / SECRET / TOKEN / PASSWORD 的环境变量，防止宿主凭据经子进程泄漏；
- 修复：卸载时托盘进程 kill 后等待其退出再结束，无残留进程；
- 文档：功能节补充安全加固说明；相关插件表格修复断行。

## [0.1.6] - 2026-08-29

- 文档：删除与 FAQ 重复的「排障/触发时机」节；新增兼容性行（Windows 10/11 · Node ≥ 22.5 · DSH 0.1.1-rc.2 实测）；
- 元数据：npm description 重写（唯一托盘 + workspace·session 标注），keywords 10 → 15；
- 新增英文版 README.en.md 与双语切换行；CHANGELOG.md 纳入 npm files。
## [0.1.5] - 2026-08-25

- 相关插件段新增 dsh-plugin-windows-guard（Windows 环境防坑守则 skill 插件，互相引流）。


## [0.1.4] - 2026-08-21

- README 新增「相关插件」互相引用段（列出同系列已发布插件，npm / GitHub 链接 + 一句话说明），互相引流。

## [0.1.3] - 2026-08-19

- Windows 原生通知 + 系统托盘常驻图标（dsh 生态唯一带托盘）。
- 触发时机：完成 / 停止 / 出错 / 等你选择 / 会话关闭。
- 发布 npm、GitHub topics、dsh-market 收录（issue #37/#41）。

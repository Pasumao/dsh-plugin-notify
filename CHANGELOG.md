# Changelog

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

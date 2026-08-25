# dsh-notify

![npm version](https://img.shields.io/npm/v/dsh-notify)
![License](https://img.shields.io/github/license/Pasumao/dsh-plugin-notify)
![AI Assisted](https://img.shields.io/badge/AI-Assisted-8A2BE2)

**唯一带系统托盘的 Windows 原生通知插件**：agent 不再运行时（完成 / 停止 / 出错 / 等你选择 / 会话关闭）自动弹原生 Toast，正文标注「工作区 · 会话」，任务栏托盘常驻鲸鱼图标——跑长任务时切走窗口，瞄一眼托盘就知道跑完了没。

零运行时依赖、零构建，`dsh plugin add` 一条命令装完即用。

## 功能

- **Windows 原生 Toast 通知**：agent 不再运行时（完成 / 停止 / 出错 / 达到输出上限 / 等你选择 / 会话关闭）自动弹系统通知，正文标注「工作区 · 会话」，一眼知道哪个会话跑完了；
- **系统托盘常驻图标**：任务栏托盘鲸鱼图标常驻，右键菜单可唤起 dsh web 页面 / 退出后台（竞品均明确不做托盘，本插件是 dsh 生态唯一）；
- **防刷屏**：`rootsOnly` 默认仅根会话通知，子代理不刷屏；`cooldownMs` 同会话同类型两次通知最小间隔；
- **零运行时依赖、零构建**，`dsh plugin add` 一条命令装完即用。

## 使用场景

- **跑长任务时切走窗口**：LLM 长生成 / 批处理跑着，切到别的应用，任务结束托盘弹通知，瞄一眼就知道结果；
- **挂机批量任务**：一晚上跑多轮任务，全部结束后收到 Toast，不用守着页面；
- **会话多开**：同时跑多个工作区会话，通知正文带「工作区 · 会话」标注，不会搞混；
- **子代理观察**：希望只关注根会话结果时保持 `rootsOnly: true` 默认值，需要观察子代理时再关掉。

## 安装

```powershell
dsh plugin --profile web add dsh-notify
```

GitHub 安装：`dsh plugin --profile web add github:Pasumao/dsh-plugin-notify`

源码安装（本地开发 / 调试）：

```bash
git clone https://github.com/Pasumao/dsh-plugin-notify.git
cd dsh-plugin-notify
npm install
# 以 link: 方式挂载进 profile（包名 dsh-notify）
```

装完重启 `dsh web`，任务栏出现鲸鱼图标即生效。

## 触发时机

任务完成、被中止、执行出错、达到输出上限、停下来等你选择、运行中的会话被关闭。

## 配置

在 profile 的 `cordis.patch.yml` 按 id `dsh-plugin-notify` 覆盖 config。常用项：

| key | 默认 | 说明 |
|---|---|---|
| `cooldownMs` | `10000` | 同会话同类型两次通知的最小间隔（毫秒） |
| `rootsOnly` | `true` | 仅根会话通知，子代理不刷屏 |
| `tray` | `true` | 托盘图标开关 |
| `titlePrefix` | `'dsh'` | 通知标题前缀 |

## 测试

```powershell
node scripts/test-harness.mjs   # 弹三条真实 Toast 自测
```

## 常见问题

- **收不到通知？** 检查 Windows「设置 → 系统 → 通知」是否允许 PowerShell 显示通知，
  以及是否处于专注助手 / 勿扰时段；
- **只想根会话通知？** 保持默认 `rootsOnly: true`；需要观察子代理时再改为 `false`；
- **通知太频繁？** 调大 `cooldownMs`（默认 10000ms）即可；
- **托盘图标不见了？** 重启 dsh web；仍无则检查 `tray: true` 配置项是否被覆盖。

## 排障

Toast 不出现：检查 Windows「通知与操作」是否允许 PowerShell 显示通知。

## 相关插件

本插件属于 **Pasumao 的 dsh 插件生态**，同系列已发布插件可搭配使用：

| 插件（npm） | GitHub | 说明 |
|---|---|---|
| [dsh-plugin-choice-refresh](https://www.npmjs.com/package/dsh-plugin-choice-refresh) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-choice-refresh) | 选择增强：重新生成选项 / 更多选项 |
| [dsh-plugin-dev-kb](https://www.npmjs.com/package/dsh-plugin-dev-kb) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-dev-kb) | 插件开发知识库（官方文档完整镜像 + 技能） |
| [dsh-plugin-image-tools](https://www.npmjs.com/package/dsh-plugin-image-tools) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-image-tools) | 图片选择卡 + 回复内嵌图片 + 盲模型收图 |
| [dsh-plugin-table-zoom](https://www.npmjs.com/package/dsh-plugin-table-zoom) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-table-zoom) | 聊天长表格浮窗查看 + 一键复制 Markdown |
| [dsh-plugin-windows-guard](https://www.npmjs.com/package/dsh-plugin-windows-guard) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-windows-guard) | Windows 环境防坑守则 skill（编码/转义/路径/进程/乱码预防） |
| [dsh-plugin-workbench](https://www.npmjs.com/package/dsh-plugin-workbench) | [GitHub 仓库](https://github.com/Pasumao/dsh-plugin-workbench) | VS Code 风格文件浏览器 + 可编辑预览 |

> 本系列其余插件见 [Pasumao · dsh 插件](https://github.com/Pasumao)；觉得好用欢迎到 GitHub 点 ⭐。

## AI 生成声明

代码与文档由 AI 辅助生成（DeepSeek Harness），均经人工审查与实机验证
（`scripts/test-harness.mjs` 弹真实 Toast 自测）。

## License

[MIT](./LICENSE)

# dsh-notify

> ⚠️ **AI 生成项目**：代码与文档由 AI 辅助生成，仅供学习参考，使用前请自行审查。

dsh 的 Windows 通知插件：agent 不再运行时（完成 / 停止 / 出错 / 等你选择 / 会话关闭）弹原生 Toast 提醒，正文标注「工作区 · 会话」，托盘常驻鲸鱼图标。

## 安装

```powershell
dsh plugin --profile web add dsh-notify
```

GitHub 安装：`dsh plugin --profile web add github:Pasumao/dsh-plugin-notify`

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

## 排障

Toast 不出现：检查 Windows「通知与操作」是否允许 PowerShell 显示通知。

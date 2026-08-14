# dsh-plugin-notify

当 dsh Web GUI 里的 agent **不再运行**时，弹一条 Windows 原生 Toast。适用于你发起绘画/生成等长任务后离开电脑、希望"完成 / 停止 / 出错 / 在等你选择"时被叫回来的场景。

- 通知**常驻**（`scenario="reminder"`，直到你手动关闭）；
- 用 dsh 鲸鱼 logo 作为通知图标；
- 通知正文标注**「工作区 · 会话」位置行**：一眼看出是哪个工作区的哪个会话完成了；
- **纯提示**：点击通知不触发任何动作；
- **系统托盘图标**：任务栏右下角常驻一个 dsh 鲸鱼小图标，表示后台运行中（双击/右键「打开 dsh」；右键「关闭进程」终止 dsh 后台；dsh 退出后图标自动消失）。

纯 host 端插件，零运行时依赖、零构建步骤。

## 触发条件

| 场景 | 信号 | 通知 |
|---|---|---|
| 任务正常完成 | `agent/status` running→idle + `turn/end: completed` | 「dsh · 任务完成」 |
| 你点了停止 / 被中止 | `turn/end: aborted` | 「dsh · 任务已停止」 |
| 执行出错 | `turn/end: error` | 「dsh · 任务出错」 |
| 达到输出上限 | `turn/end: max-tokens` | 「dsh · 达到输出上限」 |
| agent 停下来让你选择 | 未配对的 `ask_user_question` 工具调用 | 「dsh · 在等你选择」 |
| 运行中的会话被关闭 | `agent/disposed` | 「dsh · 会话已关闭」 |

> 每条通知正文还会带一行**位置标注**：`工作区「…」 · 会话「…」`。工作区取
> `workspaceRegistry` 中该会话的归属标题（兜底用会话 cwd 的目录名），会话取
> sidebar 显示的会话标题（无标题时兜底用会话 id 短号，如 `#a1b2c3d4`）。两个
> 服务都不可用时该行自动省略。

## 安装

1. 链接进 web profile 依赖（编辑 `C:\Users\18303\.dsh\profiles\web\package.json`）：
   ```jsonc
   "dependencies": {
     // ...已有依赖...
     "@dsh-external/dsh-plugin-notify": "link:C:/Users/18303/Desktop/dsh-plugin-notify"
   }
   ```
2. 在 profile 目录执行安装：
   ```powershell
   cd C:\Users\18303\.dsh\profiles\web
   pnpm install        # 或：dsh plugin --profile web install
   ```
3. 注册插件（编辑 `C:\Users\18303\.dsh\profiles\web\cordis.patch.yml`，追加）：
   ```yaml
   - insert:
       - id: dsh-plugin-notify
         name: '@dsh-external/dsh-plugin-notify'
         config:
           cooldownMs: 10000
   ```
4. **重启 `dsh web`**。重启后任务栏右下角会出现 dsh 鲸鱼小图标，说明已加载。

## 配置（`config`，均有默认值）

| key | 默认 | 说明 |
|---|---|---|
| `enabled` | `true` | 总开关 |
| `tray` | `true` | 系统托盘图标开关（`false` 关闭） |
| `rootsOnly` | `true` | 仅根会话通知；子代理不刷屏 |
| `notifyFinished` / `notifyAborted` / `notifyError` / `notifyWaiting` / `notifyDisposed` | 全 `true` | 分类型开关 |
| `cooldownMs` | `10000` | 同一会话、同一类型两次通知最小间隔（毫秒） |
| `titlePrefix` | `'dsh'` | 通知标题前缀（形如 `dsh · 任务完成`） |
| `iconPath` | 内置 `assets/dsh.png` | 通知 logo PNG 路径；设为空串 `''` 则不显示自定义图标 |
| `webUrl` | `http://127.0.0.1:3080` | dsh 页面地址（点击通知/托盘「打开 dsh」跳转的地址） |
| `aumid` | PowerShell 5.1 的 AUMID | Toast 归属的 AppUserModelID（一般无需改） |
| `summaryMaxChars` | `40` | 任务摘要截断长度 |
| `powershellPath` | 自动 | 覆盖 PowerShell 5.1 路径 |

## 测试

通知管道单测（英文 Toast）：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-notice.ps1
```

插件逻辑端到端自测（无需 dsh、无需重启，弹「等待选择/任务完成/任务已停止」三条中文 Toast）：

```powershell
node scripts/test-harness.mjs
```

## 排障

- **Toast 不出现**：确认 Windows「通知与操作」里允许 PowerShell 显示通知；首次加载 WinRT 模块稍慢属正常。
- **图标不显示**：确认 `assets/dsh.png`（通知）与 `assets/dsh.ico`（托盘）随插件目录一起存在。
- **中文乱码**：经环境变量（UTF-16）与 `-EncodedCommand`（UTF-16LE base64）传参，不应乱码。

详见 `设计文稿.md`。

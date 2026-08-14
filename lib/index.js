/**
 * dsh-plugin-notify — 任务结束 Windows 通知插件（纯 host 端）
 *
 * 当 agent「不再运行」时（正常运行完成 / 被中止 / 出错 / 达到输出上限 /
 * 停下来等待用户选择 / 会话被关闭），弹一条 Windows 原生 Toast 通知（纯提示，
 * 常驻到手动关闭，点击无动作）。
 *
 * 触发信号（均为主机端 Cordis 事件）：
 *   - `agent/status`（idle ⇄ running）：running→idle 即「不再运行」。
 *   - `session/event`：读取 turn 结束原因、最近用户指令、ask_user_question 等待。
 *   - `agent/disposed`：会话被关闭/清除的兜底。
 *
 * 通知实现：零依赖，spawn Windows PowerShell 5.1 的 ToastNotificationManager
 * （原生 Toast，自定义 logo + 常驻）。标题/正文经环境变量（UTF-16）传入，
 * 脚本经 -EncodedCommand（UTF-16LE base64）传入，规避代码页与引号转义问题。
 *
 * @module @dsh-external/dsh-plugin-notify
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-plugin-notify'
export const inject = []

/** 默认配置；patch 条目的 `config` 字段按对象合并覆盖。 */
const DEFAULT_CONFIG = {
  /** 总开关。 */
  enabled: true,
  /** 系统托盘图标：表示 dsh 后台运行中（任务栏右下角）。设为 false 关闭。 */
  tray: true,
  /** 仅根会话（用户自己的会话）通知；子代理默认不刷屏。 */
  rootsOnly: true,
  /** 分类型开关。 */
  notifyFinished: true,
  notifyAborted: true,
  notifyError: true,
  notifyWaiting: true,
  notifyDisposed: true,
  /** 同一会话、同一类型两次通知的最小间隔（毫秒，防连发）。 */
  cooldownMs: 10000,
  /** 通知标题前缀。 */
  titlePrefix: 'dsh',
  /** 自定义通知图标 PNG 路径；默认用插件自带的 dsh 鲸鱼 logo。设为空串则不显示自定义图标。 */
  iconPath: undefined,
  /** dsh Web 页面地址（托盘「打开 dsh」跳转的地址）。 */
  webUrl: 'http://127.0.0.1:3080',
  /** Toast 归属的 AppUserModelID；默认借用 Windows PowerShell 5.1 已注册的 AUMID。 */
  aumid: '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe',
  /** 用户指令摘要截断长度（字符）。 */
  summaryMaxChars: 40,
  /** 覆盖 PowerShell 路径；默认探测 5.1 的绝对路径。 */
  powershellPath: undefined,
}

function normalizeConfig(config) {
  const cfg = { ...DEFAULT_CONFIG }
  if (config && typeof config === 'object') Object.assign(cfg, config)
  cfg.cooldownMs = Math.max(0, Math.floor(Number(cfg.cooldownMs) || 0))
  cfg.summaryMaxChars = Math.max(1, Math.floor(Number(cfg.summaryMaxChars) || 40))
  cfg.webUrl = (cfg.webUrl || 'http://127.0.0.1:3080').replace(/\/+$/, '')
  return cfg
}

/** Windows PowerShell 5.1 绝对路径（保底探测）。 */
function defaultPowershellPath() {
  const windir = process.env.windir || process.env.WINDIR || 'C:\\Windows'
  return join(windir, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
}

/** 插件自带的 dsh 鲸鱼 logo PNG（相对本模块定位，链接/拷贝部署均可用）。 */
function defaultIconPath() {
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'dsh.png')
}

/** 插件自带的 dsh 鲸鱼 logo ICO（托盘图标用）。 */
function defaultTrayIconPath() {
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'dsh.ico')
}

/** 当前托盘图标的子进程（模块级：进程内同一时刻至多一个托盘图标）。 */
let trayChild = null

/**
 * 弹 Toast 的 PowerShell 脚本。全部参数从环境变量读取：
 *   DSH_NOTICE_TITLE / DSH_NOTICE_BODY / DSH_NOTICE_ICON_PATH(logo PNG) /
 *   DSH_NOTICE_AUMID(Toast 归属)
 * 用 ToastNotificationManager 发原生 Toast：自定义 logo + scenario="reminder"
 * 常驻；activationType="background"（无后台任务 → 点击不触发任何动作，纯提示）。
 */
const TOAST_SCRIPT = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
function XmlEscape([string]$s) { return $s.Replace('&','&amp;').Replace('<','&lt;').Replace('>','&gt;').Replace('"','&quot;').Replace("'",'&apos;') }
$title = [string]$env:DSH_NOTICE_TITLE
$body = [string]$env:DSH_NOTICE_BODY
$icon = [string]$env:DSH_NOTICE_ICON_PATH
$aumid = [string]$env:DSH_NOTICE_AUMID
$iconPart = ''
if ($icon -and (Test-Path $icon)) {
  $iconUri = 'file:///' + ($icon.Replace('\\','/'))
  $iconPart = '<image placement="appLogoOverride" src="' + (XmlEscape $iconUri) + '" hint-crop="circle"/>'
}
$xmlText = '<toast scenario="reminder" activationType="background"><visual><binding template="ToastGeneric">' + $iconPart + '<text>' + (XmlEscape $title) + '</text><text>' + (XmlEscape $body) + '</text></binding></visual></toast>'
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($xmlText)
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($aumid).Show($toast)
`.trim()

/** 派发一条通知（fire-and-forget；失败仅记日志，绝不影响 dsh）。 */
function fireToast(ctx, cfg, { title, body }) {
  const ps = cfg.powershellPath || defaultPowershellPath()
  const iconPath = cfg.iconPath === undefined ? defaultIconPath() : (cfg.iconPath ?? '')
  // -EncodedCommand（UTF-16LE base64）：脚本里即便含双引号/换行也不受命令行转义影响。
  const encoded = Buffer.from(TOAST_SCRIPT, 'utf16le').toString('base64')
  let child
  try {
    child = spawn(
      ps,
      ['-NoProfile', '-STA', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded],
      {
        env: {
          ...process.env,
          DSH_NOTICE_TITLE: title,
          DSH_NOTICE_BODY: body,
          DSH_NOTICE_ICON_PATH: existsSync(iconPath) ? iconPath : '',
          DSH_NOTICE_AUMID: cfg.aumid,
        },
        windowsHide: true,
        stdio: 'ignore',
      },
    )
  } catch (error) {
    ctx.logger.warn(`dsh-plugin-notify: failed to launch notification: ${String(error)}`)
    return
  }
  child.on('error', (error) => {
    ctx.logger.warn(`dsh-plugin-notify: notification process error: ${String(error)}`)
  })
}

function truncate(text, max) {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

/** 从一条 user/message 里取第一个文本块作为任务摘要。 */
function summarizePrompt(message, maxChars) {
  const blocks = message?.content
  if (!Array.isArray(blocks)) return ''
  for (const block of blocks) {
    if (block?.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
      return truncate(block.text.replace(/\s+/g, ' ').trim(), maxChars)
    }
  }
  return ''
}

/** 从 ask_user_question 的原始 arguments JSON 里取第一个问题的文本。 */
function extractQuestion(rawArguments) {
  try {
    const parsed = JSON.parse(rawArguments)
    const question = Array.isArray(parsed?.questions)
      ? parsed.questions.find((item) => typeof item?.question === 'string' && item.question)
      : null
    return question ? truncate(question.question, 60) : ''
  } catch {
    return ''
  }
}

/** turn/end 的 TurnEndReason.kind → 通知类别。 */
const REASON_KIND = {
  completed: 'finished',
  aborted: 'aborted',
  error: 'error',
  interrupted: 'error',
  'max-tokens': 'max-tokens',
  blocked: 'blocked',
}

function createState() {
  return {
    running: false,
    turnStarted: false,
    lastReason: null,
    lastPrompt: '',
    waiting: false,
    waitingCallId: null,
    waitingText: '',
    /** 各类型上次通知时间戳，按类型冷却。 */
    lastToastAt: {},
  }
}

export function apply(ctx, config = {}) {
  const cfg = normalizeConfig(config)
  if (!cfg.enabled) return

  const states = new Map()

  // 系统托盘图标：表示 dsh 后台运行中。同一进程内至多一个；卸载/重启 dsh 时清理。
  if (cfg.tray !== false) {
    if (trayChild) {
      try { trayChild.kill() } catch {}
      trayChild = null
    }
    try {
      const root = dirname(fileURLToPath(import.meta.url))
      const trayPath = join(root, '..', 'scripts', 'tray.ps1')
      const child = spawn(
        defaultPowershellPath(),
        ['-NoProfile', '-STA', '-WindowStyle', 'Hidden', '-ExecutionPolicy', 'Bypass', '-File', trayPath, '-ParentPid', String(process.pid), '-IconPath', defaultTrayIconPath(), '-WebUrl', cfg.webUrl],
        {
          env: {
            ...process.env,
            DSH_TRAY_TOOLTIP: 'dsh 后台运行中',
            DSH_TRAY_OPEN: '打开 dsh',
            DSH_TRAY_EXIT: '关闭进程',
          },
          windowsHide: true,
          stdio: 'ignore',
        },
      )
      trayChild = child
      child.on('exit', () => { if (trayChild === child) trayChild = null })
      child.on('error', () => { if (trayChild === child) trayChild = null })
    } catch (error) {
      ctx.logger.warn(`dsh-plugin-notify: failed to start tray icon: ${String(error)}`)
    }
  }

  const isRoot = (agent) => {
    const depth = agent?.session?.header?.delegationDepth
    return depth == null || depth === 0
  }
  const isTracked = (agent) => (cfg.rootsOnly ? isRoot(agent) : true)

  const stateFor = (id) => {
    let state = states.get(id)
    if (!state) {
      state = createState()
      states.set(id, state)
    }
    return state
  }

  const notify = (id, state, kind) => {
    const now = Date.now()
    const last = state.lastToastAt[kind] ?? 0
    if (now - last < cfg.cooldownMs) return
    state.lastToastAt[kind] = now

    const when = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    const prefix = cfg.titlePrefix
    const prompt = state.lastPrompt ? `「${state.lastPrompt}」` : '任务'
    const waitingText = state.waitingText ? `Agent 正在等你选择：${state.waitingText}` : `Agent 正在等你选择（${when}）`

    const messages = {
      finished: { title: `${prefix} · 任务完成`, body: `${prompt} 已完成（${when}）` },
      aborted: { title: `${prefix} · 任务已停止`, body: `${prompt} 已被中止（${when}）` },
      error: { title: `${prefix} · 任务出错`, body: `${prompt} 执行出错（${when}）` },
      'max-tokens': { title: `${prefix} · 达到输出上限`, body: `${prompt} 达到输出上限（${when}）` },
      blocked: { title: `${prefix} · 回合被阻断`, body: `${prompt} 回合被阻断（${when}）` },
      waiting: { title: `${prefix} · 在等你选择`, body: waitingText },
      disposed: { title: `${prefix} · 会话已关闭`, body: `运行中的会话已关闭（${when}）` },
    }
    const message = messages[kind] ?? messages.finished
    fireToast(ctx, cfg, message)
    ctx.logger.debug(`dsh-plugin-notify: ${kind} -> "${message.title}" (session ${id})`)
  }

  const onStatus = ({ agent, status }) => {
    if (!isTracked(agent)) return
    const state = stateFor(agent.id)

    if (status === 'running') {
      state.running = true
      return
    }

    // running → idle：agent 不再运行。
    if (!state.running) return
    state.running = false

    const active = state.turnStarted || state.waiting
    const kind = REASON_KIND[state.lastReason] ?? 'finished'
    state.turnStarted = false
    state.lastReason = null

    // 空转（唤醒后消息被清空、无实际回合）不通知。
    if (!active) return

    const gate = {
      finished: cfg.notifyFinished,
      aborted: cfg.notifyAborted,
      error: cfg.notifyError,
      'max-tokens': cfg.notifyFinished,
      blocked: cfg.notifyAborted,
    }[kind]
    if (gate === false) return

    notify(agent.id, state, kind)
  }

  const onSessionEvent = (session, event) => {
    const depth = session.header?.delegationDepth
    if (cfg.rootsOnly && depth != null && depth !== 0) return
    const state = stateFor(session.id)

    switch (event.type) {
      case 'turn/start':
        state.turnStarted = true
        break
      case 'turn/end':
        state.lastReason = event.data?.reason?.kind ?? null
        break
      case 'user/message':
        state.lastPrompt = summarizePrompt(event.data?.message, cfg.summaryMaxChars)
        break
      case 'tool/call': {
        const call = event.data
        if (call?.name === 'ask_user_question') {
          state.waiting = true
          state.waitingCallId = call.callId
          state.waitingText = extractQuestion(call.arguments)
          // 此刻状态仍是 running：立即提醒用户回来做选择。
          if (state.running && cfg.notifyWaiting) notify(session.id, state, 'waiting')
        }
        break
      }
      case 'tool/result': {
        const result = event.data
        if (state.waiting && result?.message?.callId === state.waitingCallId) {
          state.waiting = false
          state.waitingCallId = null
          state.waitingText = ''
        }
        break
      }
      default:
        break
    }
  }

  const onDisposed = ({ agent }) => {
    const state = states.get(agent.id)
    if (!state) return
    const wasRunning = state.running
    states.delete(agent.id)
    if (wasRunning && cfg.notifyDisposed) notify(agent.id, state, 'disposed')
  }

  // 激活时播种：已 running 的 agent 记为「有活动」，完成时照常通知；
  // 空闲的 agent 不产生状态（避免历史会话刷屏）。
  try {
    const agents = ctx.agents?.list?.()
    if (Array.isArray(agents)) {
      for (const agent of agents) {
        if (isTracked(agent) && agent.status === 'running') {
          stateFor(agent.id).running = true
          stateFor(agent.id).turnStarted = true
        }
      }
    }
  } catch {
    // 无 agents 服务时不播种，仅依赖事件。
  }

  const offStatus = ctx.on('agent/status', onStatus)
  const offSession = ctx.on('session/event', onSessionEvent)
  const offDisposed = ctx.on('agent/disposed', onDisposed)

  ctx.effect(() => () => {
    offStatus()
    offSession()
    offDisposed()
    states.clear()
    if (trayChild) {
      try { trayChild.kill() } catch {}
      trayChild = null
    }
  })
}

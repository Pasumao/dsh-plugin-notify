/**
 * test-harness.mjs — dsh-plugin-notify 端到端测试（无需 dsh、无需重启）。
 *
 * 用带事件记录的 mock ctx 直接驱动插件处理器，验证「等待选择 / 任务完成 /
 * 任务被停止」三条链路都会真实弹出 Windows Toast（含中文渲染）。事件载荷
 * 与 dsh 源码中 `agent/status`、`session/event` 的契约保持一致。
 *
 * 运行：node scripts/test-harness.mjs
 */
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const mod = await import(pathToFileURL(join(here, '..', 'lib', 'index.js')).href)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** 记录 ctx.on 注册的处理器，便于手动派发事件。 */
const handlers = new Map()
const ctx = {
  agents: { list: () => [] },
  /** mock workspaceRegistry：test-session 归属「dsh-plugin-notify」工作区。 */
  workspaceRegistry: {
    list: () => [
      {
        id: 'ws-1',
        path: 'C:\\Users\\18303\\Desktop\\dsh-plugin-notify',
        title: 'dsh-plugin-notify',
        sessionIds: ['test-session'],
      },
    ],
  },
  // 故意不提供 sessionTitle 服务：验证「直接折会话日志 session/title」路径。
  on(name, cb) {
    if (!handlers.has(name)) handlers.set(name, [])
    handlers.get(name).push(cb)
    return () => {}
  },
  effect(fn) {
    return () => fn()
  },
  logger: {
    debug: (...a) => console.log('[debug]', ...a),
    warn: (...a) => console.log('[warn]', ...a),
    info: (...a) => console.log('[info]', ...a),
  },
}

// tray: false —— 测试只验证通知管道，不启动常驻托盘图标（否则 node 进程不会退出）。
mod.apply(ctx, { cooldownMs: 0, summaryMaxChars: 40, tray: false })

const emit = (name, ...args) => {
  for (const cb of handlers.get(name) ?? []) cb(...args)
}

const session = {
  id: 'test-session',
  header: { cwd: 'C:\\Users\\18303\\Desktop\\dsh-plugin-notify' }, // 无 delegationDepth = 根会话
  // 会话日志（与真实 dsh Session.events 同形）：含 session/title 事件。
  events: [{ type: 'session/title', data: { title: '画一只赛博朋克猫' } }],
}
const agent = { id: 'test-session', status: 'running', session }

function startTurn() {
  emit('agent/status', { agent, status: 'running' })
  emit('session/event', session, { type: 'turn/start', data: { turn: 1 } })
}

console.log('=== 场景 1：等你选择（ask_user_question）===')
startTurn()
emit('session/event', session, {
  type: 'user/message',
  data: { message: { content: [{ type: 'text', text: '画一只赛博朋克猫' }] } },
})
emit('session/event', session, {
  type: 'tool/call',
  data: {
    callId: 'c1',
    name: 'ask_user_question',
    arguments: '{"questions":[{"id":"q1","question":"选方案A还是方案B？"}]}',
  },
})
await sleep(6500)

console.log('=== 场景 2：任务完成 ===')
emit('session/event', session, { type: 'tool/result', data: { message: { callId: 'c1' } } })
emit('session/event', session, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
emit('agent/status', { agent, status: 'idle' })
await sleep(6500)

console.log('=== 场景 3：任务被停止 ===')
startTurn()
emit('session/event', session, {
  type: 'turn/end',
  data: { reason: { kind: 'aborted', reason: { kind: 'user' } } },
})
emit('agent/status', { agent, status: 'idle' })
await sleep(6500)

console.log('done')

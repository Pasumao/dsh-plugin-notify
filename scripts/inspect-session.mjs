import { zstdDecompressSync } from 'node:zlib'
import { readFileSync } from 'node:fs'

const file = process.argv[2]
const buf = readFileSync(file)
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
const frames = []
let i = 0
while (i < buf.length) {
  const idx = buf.indexOf(MAGIC, i)
  if (idx < 0) break
  let next = buf.indexOf(MAGIC, idx + 4)
  if (next < 0) next = buf.length
  frames.push(zstdDecompressSync(buf.subarray(idx, next)))
  i = next
}
const text = Buffer.concat(frames).toString('utf8')
const lines = text.split('\n').filter(Boolean)
console.log('total events:', lines.length)
const titles = lines.filter((l) => l.includes('session/title'))
console.log('session/title events:', titles.length)
for (const t of titles.slice(-3)) console.log('TITLE:', t.slice(0, 500))
console.log('--- user/message + turn/end (last 12) ---')
let shown = 0
for (const l of lines) {
  if (l.includes('user/message') || l.includes('turn/end')) {
    console.log(l.slice(0, 300))
    if (++shown >= 12) break
  }
}

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'build')

const sizes = [16, 32, 48, 256]
const topColor = [76, 175, 80]
const bottomColor = [27, 94, 32]

function makeImage(size) {
  const buf = Buffer.alloc(size * size * 4, 0)
  const cx = size / 2, cy = size / 2, r = size / 2 - 1
  for (let y = 0; y < size; y++) {
    const t = (y + 0.5) / size
    const r2 = topColor[0] + (bottomColor[0] - topColor[0]) * t
    const g = topColor[1] + (bottomColor[1] - topColor[1]) * t
    const b = topColor[2] + (bottomColor[2] - topColor[2]) * t
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5, dy = y - cy + 0.5
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= r) {
        const alpha = dist > r - 0.5 ? Math.round((r - dist + 0.5) * 255) : 255
        const i = (y * size + x) * 4
        buf[i] = b | 0     // B
        buf[i + 1] = g | 0 // G
        buf[i + 2] = r2 | 0 // R
        buf[i + 3] = alpha
      }
    }
  }
  return buf
}

function buildIco(sizes) {
  const count = sizes.length
  const dirSize = 16
  const headerSize = 6
  let offset = headerSize + count * dirSize

  const dirEntries = []
  const imageData = []

  for (const size of sizes) {
    const pixels = makeImage(size)
    const rowBytes = size * 4
    const andRowBytes = Math.ceil(size / 8)
    const andRowPad = Math.ceil(andRowBytes / 4) * 4
    const dataSize = 40 + size * rowBytes + size * andRowPad

    const dir = Buffer.alloc(dirSize)
    dir.writeUInt8(size === 256 ? 0 : size, 0)
    dir.writeUInt8(size === 256 ? 0 : size, 1)
    dir.writeUInt8(0, 2)
    dir.writeUInt8(0, 3)
    dir.writeUInt16LE(1, 4)
    dir.writeUInt16LE(32, 6)
    dir.writeUInt32LE(dataSize, 8)
    dir.writeUInt32LE(offset, 12)
    dirEntries.push(dir)
    offset += dataSize

    const bih = Buffer.alloc(40)
    bih.writeUInt32LE(40, 0)
    bih.writeInt32LE(size, 4)
    bih.writeInt32LE(size * 2, 8)
    bih.writeUInt16LE(1, 12)
    bih.writeUInt16LE(32, 14)
    bih.writeUInt32LE(0, 16)
    bih.writeUInt32LE(0, 20)
    bih.writeInt32LE(2835, 24)
    bih.writeInt32LE(2835, 28)
    bih.writeUInt32LE(0, 32)
    bih.writeUInt32LE(0, 36)

    const pixelData = Buffer.alloc(size * rowBytes)
    for (let y = 0; y < size; y++) {
      pixels.copy(pixelData, (size - 1 - y) * rowBytes, y * rowBytes, y * rowBytes + rowBytes)
    }

    const andMask = Buffer.alloc(size * andRowPad, 0)
    imageData.push(Buffer.concat([bih, pixelData, andMask]))
  }

  return Buffer.concat([Buffer.from([0, 0, 1, 0, count & 0xff, (count >> 8) & 0xff]), ...dirEntries, ...imageData])
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'icon.ico'), buildIco(sizes))
console.log(`Generated build/icon.ico (${sizes.join(', ')} px)`)

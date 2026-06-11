// Generates all favicon / PWA icon PNGs (and a multi-size .ico) from public/icon.svg.
// Run: node scripts/generate-icons.mjs
import sharp from 'sharp'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const PUBLIC = path.join(process.cwd(), 'public')
const INK = '#2c1a0e' // dark background for app icons
const svg = await readFile(path.join(PUBLIC, 'icon.svg'))

// High density so the 40x40 viewBox rasterizes crisply at large sizes.
const render = (size) =>
  sharp(svg, { density: 512 }).resize(size, size, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })

// 1. Transparent favicons — just the icon, no background.
await render(16).png().toFile(path.join(PUBLIC, 'favicon-16x16.png'))
await render(32).png().toFile(path.join(PUBLIC, 'favicon-32x32.png'))

// 2. App icons — icon centered (~65%) on a rounded dark-ink square.
async function darkIcon(size, out) {
  const radius = Math.round(size * 0.22)
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${INK}"/></svg>`
  )
  const iconSize = Math.round(size * 0.65)
  const offset = Math.round((size - iconSize) / 2)
  const icon = await render(iconSize).png().toBuffer()
  await sharp(bg)
    .composite([{ input: icon, top: offset, left: offset }])
    .png()
    .toFile(path.join(PUBLIC, out))
}
await darkIcon(180, 'apple-touch-icon.png')
await darkIcon(192, 'icon-192x192.png')
await darkIcon(512, 'icon-512x512.png')

// 3. favicon.ico — multi-size (16 + 32), PNG-encoded entries.
function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)
  const entries = []
  const datas = []
  let offset = 6 + images.length * 16
  for (const img of images) {
    const e = Buffer.alloc(16)
    e.writeUInt8(img.size >= 256 ? 0 : img.size, 0) // width
    e.writeUInt8(img.size >= 256 ? 0 : img.size, 1) // height
    e.writeUInt8(0, 2) // palette
    e.writeUInt8(0, 3) // reserved
    e.writeUInt16LE(1, 4) // color planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(img.data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += img.data.length
    entries.push(e)
    datas.push(img.data)
  }
  return Buffer.concat([header, ...entries, ...datas])
}

const ico16 = await render(16).png().toBuffer()
const ico32 = await render(32).png().toBuffer()
await writeFile(
  path.join(PUBLIC, 'favicon.ico'),
  buildIco([{ size: 16, data: ico16 }, { size: 32, data: ico32 }])
)

console.log('✓ Generated favicons + app icons in public/')

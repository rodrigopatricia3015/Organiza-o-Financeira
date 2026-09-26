// Gera os ícones da app e os ecrãs de arranque (splash) do iOS a partir de public/favicon.svg.
// Correr com: npm run icons
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'

const svg = await readFile('public/favicon.svg')
// Versão sem cantos arredondados: o iOS e o Android arredondam os ícones por conta própria.
const squareSvg = Buffer.from(svg.toString().replace('rx="112"', 'rx="0"'))
const BG = '#0f172a'

async function icon(size, file, padding = 0) {
  const inner = Math.round(size * (1 - padding * 2))
  const logo = await sharp(squareSvg).resize(inner, inner).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: '#0f766e' } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(file)
}

await icon(192, 'public/icons/icon-192.png')
await icon(512, 'public/icons/icon-512.png')
await icon(512, 'public/icons/icon-maskable-512.png', 0.1)
await icon(180, 'public/icons/apple-touch-icon.png')

// Ecrãs de iPhone (largura e altura em pontos, densidade de píxeis)
const devices = [
  [440, 956, 3], [430, 932, 3], [402, 874, 3], [393, 852, 3], [428, 926, 3],
  [390, 844, 3], [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2],
]

const links = []
for (const [w, h, dpr] of devices) {
  const W = w * dpr
  const H = h * dpr
  const logoSize = Math.round(W * 0.28)
  const logo = await sharp(svg).resize(logoSize, logoSize).png().toBuffer()
  const name = `splash-${W}x${H}.png`
  await sharp({ create: { width: W, height: H, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(`public/splash/${name}`)
  links.push(
    `    <link rel="apple-touch-startup-image" href="/splash/${name}" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" />`,
  )
}
// Copiar estas linhas para o <head> do index.html se a lista de ecrãs mudar.
console.log(links.join('\n'))
console.log('Ícones e splash screens gerados.')

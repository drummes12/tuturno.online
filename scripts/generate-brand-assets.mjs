// Genera los assets PNG/ICO de marca a partir de los SVG en public/.
// Uso: node scripts/generate-brand-assets.mjs
// Requiere devDependency: @resvg/resvg-js

import { readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const PUBLIC = new URL('../public/', import.meta.url)
const FONT_DIR = new URL(
  '../node_modules/@fontsource/inter/files/',
  import.meta.url
)

const fontOptions = {
  fontFiles: [
    'inter-latin-500-normal.woff2',
    'inter-latin-800-normal.woff2',
  ].map((f) => new URL(f, FONT_DIR).pathname),
  loadSystemFonts: true,
  defaultFontFamily: 'Inter',
}

function render(svgName, pngName, width) {
  const svg = readFileSync(new URL(svgName, PUBLIC))
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: fontOptions,
    background: svgName.includes('maskable') ? '#0f7a4a' : 'rgba(0,0,0,0)',
  })
  const png = resvg.render().asPng()
  writeFileSync(new URL(pngName, PUBLIC), png)
  console.log(`✓ ${pngName} (${width}px)`)
  return png
}

// ICO: empaqueta PNGs 16/32 en contenedor ICO válido (PNG-compressed entries).
function makeIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(entries.length, 4)

  let offset = 6 + entries.length * 16
  const dir = entries.map(({ png, size }) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(size === 256 ? 0 : size, 0)
    e.writeUInt8(size === 256 ? 0 : size, 1)
    e.writeUInt8(0, 2)
    e.writeUInt8(0, 3)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += png.length
    return e
  })

  return Buffer.concat([header, ...dir, ...entries.map((e) => e.png)])
}

const fav16 = render('logo-mark.svg', 'favicon-16x16.png', 16)
const fav32 = render('logo-mark.svg', 'favicon-32x32.png', 32)
writeFileSync(
  new URL('favicon.ico', PUBLIC),
  makeIco([
    { png: fav16, size: 16 },
    { png: fav32, size: 32 },
  ])
)
console.log('✓ favicon.ico (16+32)')

render('logo-mark.svg', 'android-chrome-192x192.png', 192)
render('logo-mark.svg', 'android-chrome-512x512.png', 512)
render('android-chrome-maskable.svg', 'android-chrome-maskable-512.png', 512)
render('android-chrome-maskable.svg', 'apple-touch-icon.png', 180)

// Splash iOS: fondo de marca (verde oscuro con halo mint) + glifo
// blanco centrado. Safari no genera splash desde el manifest —
// cada tamaño se enlaza con apple-touch-startup-image en index.html.
const GLYPH = `<path d="M179.57 119v33.35M316.11 119v33.35" stroke="#ffffff" stroke-width="26" stroke-linecap="round"/>
<path fill="#ffffff" d="M127.59 140h18.98a6 6 0 0 1 6 6v6.35a27 27 0 0 0 54 0V146a6 6 0 0 1 6-6h70.54a6 6 0 0 1 6 6v6.35a27 27 0 0 0 54 0V146a6 6 0 0 1 6-6h18.98a30 30 0 0 1 30 30v63.465a108 108 0 0 0-69.717-25.516H154.59a14 14 0 0 0-14 14V333.5a14 14 0 0 0 14 14h64.734a8 8 0 0 1 7.52 5.272 108 108 0 0 0 13.071 25.138 8 8 0 0 1-6.552 12.59H127.59a30 30 0 0 1-30-30V170a30 30 0 0 1 30-30"/>
<circle cx="328.373" cy="315.949" r="82" fill="#ffffff" mask="url(#hands)"/>`

const SPLASH_SIZES = [
  [1290, 2796], // iPhone 15 Pro Max / 16 Plus (430×932 @3)
  [1320, 2868], // iPhone 16/17 Pro Max (440×956 @3)
  [1206, 2622], // iPhone 16 Pro / 17 / 17 Pro (402×874 @3)
  [1260, 2736], // iPhone Air (420×912 @3)
  [1179, 2556], // iPhone 14 Pro / 15 / 15 Pro / 16 (393×852 @3)
  [1284, 2778], // iPhone 12/13/14 Pro Max, 14 Plus (428×926 @3)
  [1170, 2532], // iPhone 12/13/14, 16e (390×844 @3)
  [1125, 2436], // iPhone X/XS/11 Pro/12 mini/13 mini (375×812 @3)
  [828, 1792], // iPhone XR/11 (414×896 @2)
  [750, 1334], // iPhone SE/8 (375×667 @2)
  [1536, 2048], // iPad 9.7"
  [1668, 2388], // iPad Pro 11"
  [2048, 2732] // iPad Pro 12.9"
]

for (const [w, h] of SPLASH_SIZES) {
  const glyph = Math.min(w, h) * 0.28
  const scale = glyph / 500
  const cx = w / 2 - 253.98 * scale
  const cy = h / 2 - 258.45 * scale
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.75">
      <stop offset="0" stop-color="#0f7a4a" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#071510" stop-opacity="0"/>
    </radialGradient>
    <mask id="hands" maskUnits="userSpaceOnUse" x="238.373" y="225.949" width="180" height="180">
      <circle cx="328.373" cy="315.949" r="82" fill="#fff"/>
      <path d="M328.373 315.949v-43M328.373 315.949l36.373-21" stroke="#000" stroke-width="13" stroke-linecap="round"/>
    </mask>
  </defs>
  <rect width="${w}" height="${h}" fill="#071510"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <g transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${scale.toFixed(5)})">${GLYPH}</g>
</svg>`
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: w },
    background: '#071510',
  })
  writeFileSync(new URL(`splash-${w}x${h}.png`, PUBLIC), resvg.render().asPng())
  console.log(`✓ splash-${w}x${h}.png`)
}

// OG image: texto Inter renderizado con fontFiles
const og = new Resvg(readFileSync(new URL('og-image.svg', PUBLIC)), {
  fitTo: { mode: 'width', value: 1200 },
  font: fontOptions,
  background: '#071510',
})
writeFileSync(new URL('og-image.png', PUBLIC), og.render().asPng())
console.log('✓ og-image.png (1200×630)')

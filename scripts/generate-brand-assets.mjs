// Genera los assets PNG/ICO de marca a partir de los SVG en public/.
// Uso: node scripts/generate-brand-assets.mjs
// Requiere devDependency: @resvg/resvg-js

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const PUBLIC = new URL('../public/', import.meta.url)
// resvg solo lee TTF/OTF — los .woff2 de @fontsource se ignoran
// silenciosamente y el texto cae a una fuente del sistema.
// Inter (OFL) vendorizada en scripts/fonts/ desde Google Fonts.
const FONT_DIR = new URL('./fonts/', import.meta.url)

const fontOptions = {
  fontFiles: [
    'Inter-400.ttf',
    'Inter-500.ttf',
    'Inter-700.ttf',
    'Inter-800.ttf'
  ].map((f) => new URL(f, FONT_DIR).pathname),
  loadSystemFonts: true,
  defaultFontFamily: 'Inter'
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

// ─────────────────────────────────────────────────────────────
// Assets para redes sociales → social/ (no son assets de la app)
// ─────────────────────────────────────────────────────────────
const SOCIAL = new URL('../social/', import.meta.url)
mkdirSync(SOCIAL, { recursive: true })

const SOCIAL_DEFS = `
  <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#0f7a4a"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#22b978" stop-opacity="0.35"/><stop offset="1" stop-color="#22b978" stop-opacity="0"/>
  </radialGradient>
  <mask id="hands" maskUnits="userSpaceOnUse" x="238.373" y="225.949" width="180" height="180">
    <circle cx="328.373" cy="315.949" r="82" fill="#fff"/>
    <path d="M328.373 315.949v-43M328.373 315.949l36.373-21" stroke="#000" stroke-width="13" stroke-linecap="round"/>
  </mask>`

// Ícono de marca: glifo blanco sobre cuadrado redondeado con gradiente.
const icon = (x, y, size) => `<g transform="translate(${x} ${y}) scale(${size / 512})">
  <rect width="512" height="512" rx="112" fill="url(#brand)"/>
  <g transform="scale(1.024)">${GLYPH}</g>
</g>`

// Reloj decorativo marcando 12:12 (mismo motivo del OG image).
const clock = (cx, cy, r) => {
  const s = r / 190
  const t = (dx, dy, w, h) =>
    `<rect x="${cx + dx * s - (w * s) / 2}" y="${cy + dy * s - (h * s) / 2}" width="${w * s}" height="${h * s}" rx="${6 * s}"/>`
  return `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#143326" stroke-width="${26 * s}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#244136" stroke-width="${2 * s}"/>
  <g fill="#2d5c46">${t(0, -163, 12, 26)}${t(163, 0, 26, 12)}${t(0, 163, 12, 26)}${t(-163, 0, 26, 12)}</g>
  <line x1="${cx}" y1="${cy}" x2="${cx + 8 * s}" y2="${cy - 79 * s}" stroke="#34d399" stroke-width="${20 * s}" stroke-linecap="round"/>
  <line x1="${cx}" y1="${cy}" x2="${cx + 114 * s}" y2="${cy - 37 * s}" stroke="#34d399" stroke-width="${16 * s}" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="${12 * s}" fill="#34d399"/>`
}

const wordmark = (x, y, size, anchor = 'start') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Inter, system-ui, sans-serif" font-size="${size}" font-weight="800" fill="#f2f8f5" letter-spacing="${(-size * 0.03).toFixed(2)}">Tu<tspan fill="#34d399">Turno</tspan></text>`

const line = (x, y, size, fill, text, anchor = 'start', weight = 500) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Inter, system-ui, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${text}</text>`

function renderSocial(name, w, h, body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>${SOCIAL_DEFS}</defs>
  <rect width="${w}" height="${h}" fill="#071510"/>
  ${body}
</svg>`
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: w },
    font: fontOptions,
    background: '#071510',
  })
  writeFileSync(new URL(name, SOCIAL), resvg.render().asPng())
  console.log(`✓ social/${name} (${w}×${h})`)
}

// Avatar 1:1 — ícono de app sobre pitch (seguro en recorte circular)
renderSocial('avatar.png', 1024, 1024, `
  <circle cx="512" cy="512" r="620" fill="url(#glow)"/>
  ${icon(146, 146, 732)}`)

// Facebook cover 820×312 @2x — composición centrada (móvil recorta lados)
renderSocial('cover-facebook.png', 1640, 624, `
  <circle cx="820" cy="300" r="480" fill="url(#glow)"/>
  ${icon(735, 70, 170)}
  ${wordmark(820, 345, 100, 'middle')}
  ${line(820, 430, 38, '#9bafa5', 'Más que turnos, son oportunidades.', 'middle')}
  ${line(820, 510, 30, '#34d399', 'tuturno.online', 'middle')}`)

// LinkedIn banner 1584×396 — texto a la izquierda, reloj a la derecha
renderSocial('banner-linkedin.png', 1584, 396, `
  <circle cx="1340" cy="198" r="420" fill="url(#glow)"/>
  ${clock(1330, 198, 150)}
  ${icon(110, 113, 170)}
  ${wordmark(310, 232, 92)}
  ${line(112, 340, 36, '#9bafa5', 'Más que turnos, son oportunidades.')}`)

// X/Twitter header 1500×500
renderSocial('header-x.png', 1500, 500, `
  <circle cx="1290" cy="250" r="420" fill="url(#glow)"/>
  ${clock(1290, 250, 165)}
  ${icon(140, 150, 190)}
  ${wordmark(360, 292, 105)}
  ${line(142, 410, 38, '#9bafa5', 'Más que turnos, son oportunidades.')}`)

// YouTube banner 2560×1440 — contenido dentro del área segura 1546×423
renderSocial('banner-youtube.png', 2560, 1440, `
  <circle cx="2180" cy="720" r="640" fill="url(#glow)"/>
  ${clock(2180, 720, 300)}
  ${icon(830, 610, 220)}
  ${wordmark(1090, 748, 120)}
  ${line(1090, 835, 44, '#9bafa5', 'Más que turnos, son oportunidades.')}`)

// Post de lanzamiento 1080×1080 (feed IG/Facebook/LinkedIn)
renderSocial('post-launch.png', 1080, 1080, `
  <circle cx="540" cy="420" r="540" fill="url(#glow)"/>
  ${icon(390, 140, 300)}
  ${line(540, 660, 82, '#f2f8f5', 'Más que turnos,', 'middle', 800)}
  ${line(540, 762, 82, '#34d399', 'son oportunidades.', 'middle', 800)}
  ${line(540, 860, 33, '#9bafa5', 'Reservas online para tu negocio.', 'middle')}
  ${line(540, 960, 36, '#34d399', 'tuturno.online', 'middle')}`)

// Story/reel cover 1080×1920
renderSocial('story-launch.png', 1080, 1920, `
  <circle cx="540" cy="720" r="640" fill="url(#glow)"/>
  ${icon(370, 540, 340)}
  ${line(540, 1140, 92, '#f2f8f5', 'Más que turnos,', 'middle', 800)}
  ${line(540, 1255, 92, '#34d399', 'son oportunidades.', 'middle', 800)}
  ${line(540, 1380, 40, '#9bafa5', 'Reservas online para tu negocio.', 'middle')}
  ${line(540, 1700, 40, '#34d399', 'tuturno.online', 'middle')}`)

/* eslint-disable @typescript-eslint/no-require-imports */
// Source contract: complements visual QA, without banning native dialog backdrops.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ROOT = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8')

function sources(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? sources(file) : entry.isFile() && /\.(?:css|tsx)$/.test(entry.name) ? [file] : []
  }).sort()
}
function frostedEffects(source) {
  const found = []
  if (/\bsd-glass-(?:panel|header)\b/.test(source)) found.push('clase de superficie de vidrio')
  if (/\bbackdrop-(?:blur|saturate|brightness|contrast|grayscale|hue-rotate|invert|opacity|sepia|filter)(?=[-\s"'`\]}]|$)/.test(source)) found.push('utilidad de filtro de fondo')
  const properties = /\b(?:(?:-webkit-)?backdrop-filter|(?:Webkit)?[Bb]ackdropFilter)["']?\s*[:=]\s*([^;}\n]+)/g
  for (const match of source.matchAll(properties)) {
    if (!/^["'`]?none\b/.test(match[1].trim())) found.push('propiedad de filtro de fondo')
  }
  return found
}

test('superficies CSS y TSX conservan fondos sólidos: no vidrio ni filtros de fondo', () => {
  const files = sources(path.join(ROOT, 'src'))
  assert.ok(files.length > 10, 'La revisión debe recorrer los componentes y estilos reales de src.')
  for (const file of files) assert.deepEqual(frostedEffects(fs.readFileSync(file, 'utf8')), [], `No reintroducir efecto vidrio en ${path.relative(ROOT, file)}`)
})

test('guard detecta CSS, utilidades y estilos inline, sin bloquear backdrop oscuro, iconos o estados', () => {
  for (const source of ['className="sd-glass-panel"', 'className="md:backdrop-blur-sm"', 'backdrop-filter: blur(12px);', '-webkit-backdrop-filter: blur(12px) saturate(1.08);', "style={{ backdropFilter: 'blur(8px)' }}", "style={{ WebkitBackdropFilter: 'blur(8px)' }}", "node.style.backdropFilter = 'blur(8px)'", 'className="[backdrop-filter:blur(8px)]"']) assert.ok(frostedEffects(source).length, `Debe rechazar: ${source}`)
  for (const source of ['className="backdrop:bg-[#171413]/80"', 'className="bg-white/15 text-white/60 disabled:opacity-50"', 'className="border-transparent"', 'opacity: 0;', 'backdrop-filter: none;', "style={{ backdropFilter: 'none' }}"]) assert.deepEqual(frostedEffects(source), [], `No debe bloquear: ${source}`)
})

test('tarjeta de nivel y navegación heredada mantienen el fondo sólido aprobado', () => {
  const card = read('src/components/PersonalRankCard.tsx')
  assert.ok(card.includes('bg-[#FAF7F3]')); assert.ok(card.includes('bg-[#FFFDFA]'))
  assert.match(read('src/app/globals.css'), /\.sd-mobile-navigation\s*\{[^}]*\bbackground:\s*#faf7f3\s*;/i)
  assert.match(read('src/app/preview/usuario/UsuarioPreview.tsx'), /<nav\s+className="[^"]*\bbg-\[#FAF7F3\](?=\s|")/)
})

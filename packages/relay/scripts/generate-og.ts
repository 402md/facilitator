import { readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const svg = readFileSync(new URL('../public/og-image.svg', import.meta.url), 'utf8')

const fontDir = new URL('./fonts/', import.meta.url).pathname

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: {
    loadSystemFonts: false,
    fontDirs: [fontDir],
    defaultFontFamily: 'Bricolage Grotesque',
  },
  background: '#f8f3e8',
})

const png = resvg.render().asPng()
writeFileSync(new URL('../public/og-image.png', import.meta.url), png)
console.log(`wrote public/og-image.png (${png.byteLength} bytes)`)

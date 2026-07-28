/**
 * 由 src-tauri/icons/source-icon.svg 生成透明底 1024px PNG，
 * 再交给 `tauri icon` 切全平台图标：
 *   pnpm icons:gen
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { Resvg } from '@resvg/resvg-js'

const svg = readFileSync('src-tauri/icons/source-icon.svg')
const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1024 },
  background: 'rgba(0,0,0,0)',
}).render()

writeFileSync('/tmp/slidemind-icon.png', png.asPng())
console.log('rendered /tmp/slidemind-icon.png (transparent)')

execSync('pnpm tauri icon /tmp/slidemind-icon.png', { stdio: 'inherit' })

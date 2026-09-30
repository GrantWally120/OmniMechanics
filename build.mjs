// Builds one self-contained file: OmniMechanics.html.
// No dependencies: it reads src/, inlines the CSS, fonts (base64) and every script in order.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const read = (p) => readFileSync(join(src, p), 'utf8');
const list = (d) => (existsSync(join(src, d)) ? readdirSync(join(src, d)).filter((f) => f.endsWith('.js')).sort() : []);

// Script order: core utilities, registry, physics libraries, mechanisms, then the runtime that uses them.
const order = [
  ...['00-util.js', '10-gfx.js', '20-registry.js'].map((f) => 'core/' + f),
  ...list('lib').map((f) => 'lib/' + f),
  ...list('modules').map((f) => 'modules/' + f),
  ...['30-sim.js', '40-ui.js'].map((f) => 'core/' + f),
  'main.js',
];
const js = order
  .map((f) => `/* ---- ${f} ---- */\n${read(f)}`)
  .join('\n')
  .replace(/<\/script/gi, '<\\/script');

const fontFile = join(src, 'fonts', 'archivo-var-latin.woff2');
const fonts = existsSync(fontFile)
  ? `@font-face{font-family:"Archivo";font-style:normal;font-weight:400 800;font-stretch:62% 125%;font-display:swap;` +
    `src:url(data:font/woff2;base64,${readFileSync(fontFile).toString('base64')}) format("woff2");}`
  : '';

const html = read('index.html')
  .replace('/*{{FONTS}}*/', () => fonts)
  .replace('/*{{CSS}}*/', () => read('styles.css'))
  .replace('/*{{JS}}*/', () => js);

const out = join(root, 'OmniMechanics.html');
writeFileSync(out, html);
const kb = (statSync(out).size / 1024).toFixed(0);
console.log(`Built OmniMechanics.html (${kb} KB, ${order.length} scripts, ${list('modules').length} mechanisms)`);

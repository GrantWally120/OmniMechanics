// Builds one self-contained file: OmniMechanics.html.
// It reads src/, inlines the CSS, the font (base64) and every script in order. Nothing needs installing:
// if esbuild is available (npm install) the CSS and scripts are also minified, otherwise they are inlined as written.
//   node build.mjs          minified when esbuild is present
//   node build.mjs --dev    never minified (readable stack traces)
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let esbuild = null;
if (!process.argv.includes('--dev')) {
  for (const name of [process.env.ESBUILD_PATH, 'esbuild']) {
    if (!name) continue;
    try { esbuild = require(name); break; } catch (e) { /* not installed: build without minifying */ }
  }
}

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const read = (p) => readFileSync(join(src, p), 'utf8');
const list = (d) => (existsSync(join(src, d)) ? readdirSync(join(src, d)).filter((f) => f.endsWith('.js')).sort() : []);

// Script order: core utilities, registry, physics libraries, mechanisms, then the runtime that uses them.
const order = [
  ...['00-util.js', '10-gfx.js', '20-registry.js', '25-audio.js'].map((f) => 'core/' + f),
  ...list('lib').map((f) => 'lib/' + f),
  ...list('modules').map((f) => 'modules/' + f),
  ...['30-sim.js', '40-ui.js'].map((f) => 'core/' + f),
  'main.js',
];
let js = order
  .map((f) => `/* ---- ${f} ---- */\n${read(f)}`)
  .join('\n');
let css = read('styles.css');
if (esbuild) {
  js = esbuild.transformSync(js, { minify: true, target: 'es2020', legalComments: 'none' }).code;
  css = esbuild.transformSync(css, { loader: 'css', minify: true }).code;
}
js = js.replace(/<\/script/gi, '<\\/script');

const fontFile = join(src, 'fonts', 'archivo-app.woff2');
const fonts = existsSync(fontFile)
  ? `@font-face{font-family:"Archivo";font-style:normal;font-weight:400 800;font-stretch:100% 125%;font-display:swap;` +
    `src:url(data:font/woff2;base64,${readFileSync(fontFile).toString('base64')}) format("woff2");}`
  : '';

const html = read('index.html')
  .replace('/*{{FONTS}}*/', () => fonts)
  .replace('/*{{CSS}}*/', () => css)
  .replace('/*{{JS}}*/', () => js);

const out = join(root, 'OmniMechanics.html');
writeFileSync(out, html);
const kb = (statSync(out).size / 1024).toFixed(0);
console.log(`Built OmniMechanics.html (${kb} KB${esbuild ? ', minified' : ''}, ${order.length} scripts, ${list('modules').length} mechanisms)`);

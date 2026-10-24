import { build } from 'esbuild';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(project, 'dist');
await mkdir(output, { recursive: true });
await build({
  absWorkingDir: project,
  entryPoints: ['src/main.mjs'],
  bundle: true, format: 'iife', minify: true,
  target: ['es2020'], outfile: resolve(output, 'game.js'),
  legalComments: 'none',
  define: {
    'process.env.NODE_ENV': '"production"',
    __VUE_OPTIONS_API__: 'false',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
});
const [shell, css, three, script] = await Promise.all([
  readFile(resolve(project, 'src/shell.html'), 'utf8'),
  readFile(resolve(output, 'game.css'), 'utf8'),
  readFile(resolve(project, 'vendor/three.min.js'), 'utf8'),
  readFile(resolve(output, 'game.js'), 'utf8'),
]);
const escapeScriptEnd = text => text.replace(/<\/script/gi, '<\\/script');
// Fragment and standalone use the exact same bundled runtime and styles.
const fragment = `${shell}\n<style>\n${css}\n</style>\n<script>\n${escapeScriptEnd(three)}\n</script>\n<script>\n${escapeScriptEnd(script)}\n</script>\n`;
const document = `<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="theme-color" content="#102736">\n<meta name="description" content="驾驶银色冷气跑车，跃过前方收费站。支持电脑键盘和手机触屏。">\n<title>Roadster · 飞跃收费站</title>\n<style>html{min-height:100%;background:#081a28}body{margin:0;padding:24px 16px;font-family:system-ui,sans-serif}main{max-width:1120px;margin:0 auto} @media(max-width:540px){body{padding:0}#roadster-sky-run{border-radius:0}}</style>\n</head>\n<body>\n<main>\n${fragment}</main>\n</body>\n</html>\n`;
await writeFile(resolve(output, 'index.html'), document);
await writeFile(resolve(output, 'preview-fragment.html'), fragment);
await copyFile(resolve(project, 'vendor/THREE-LICENSE.txt'), resolve(output, 'THREE-LICENSE.txt'));
await copyFile(resolve(project, 'THIRD-PARTY-LICENSES.txt'), resolve(output, 'THIRD-PARTY-LICENSES.txt'));
const byteLength = Buffer.byteLength(fragment);
if (byteLength >= 1_000_000) throw new Error(`Inline preview exceeds 1 MB: ${byteLength} bytes`);
console.log(JSON.stringify({ built: true, standalone: 'dist/index.html', fragment: 'dist/preview-fragment.html', fragmentBytes: byteLength }));

const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, 'public');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const files = [
  'index.html',
  'styles.css',
  'enhance.css',
  'pro-polish.css',
  'flow.css',
  'social.css',
  'luxury.css',
  'app.js',
  'enhance.js',
  'flow-guard.js',
  'pro-polish.js',
  'flow.js',
  'supabase-config.js',
  'social.js',
  'luxury-home.js',
  'luxury-online.js',
  'luxury-games.js',
  'manifest.webmanifest',
  'icon.svg',
  'sw.js',
  '.nojekyll'
];

for (const file of files) {
  const source = path.join(__dirname, file);
  if (!fs.existsSync(source)) continue;
  fs.copyFileSync(source, path.join(out, file));
}

console.log('MesaCards static build ready in public/');

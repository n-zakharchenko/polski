#!/usr/bin/env node
/*
 * Новая метка версии сайта — запускать перед каждой публикацией (git push).
 *   node tools/bump-version.js
 *
 * Меняет во всех страницах (index.html, test.html, privacy.html):
 *   window.POLSKI_V = '…'   и   ?v=…   у наших файлов (core/, tests/, journey/, style.css, favicon.svg).
 * Метка — дата и время UTC: ГГГГММДД-ЧЧММ. Новые адреса файлов → браузер и кэш GitHub Pages
 * берут свежие версии, а старый HTML из кэша тянет согласованный старый набор, без смеси.
 * Бандлы тестов и картинки карты получают ту же метку в коде (Polski.withVersion).
 * И пишет version.json = { "v": метка } — по нему уже открытые страницы и PWA узнают о новой
 * версии и перезагружаются сами (core/update.js).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES = ['index.html', 'test.html', 'privacy.html'];
const STAMP = /\d{8}-\d{4}/;

const d = new Date();
const pad = (n) => String(n).padStart(2, '0');
const version = '' + d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) +
  '-' + pad(d.getUTCHours()) + pad(d.getUTCMinutes());

for (const page of PAGES) {
  const file = path.join(ROOT, page);
  const src = fs.readFileSync(file, 'utf8');
  let n = 0;
  const out = src
    .replace(new RegExp("(window\\.POLSKI_V = ')" + STAMP.source + "(')", 'g'), (m, a, b) => { n++; return a + version + b; })
    .replace(new RegExp('(\\?v=)' + STAMP.source, 'g'), (m, a) => { n++; return a + version; });
  fs.writeFileSync(file, out);
  console.log(page + ': ' + n + ' меток');
}
fs.writeFileSync(path.join(ROOT, 'version.json'), JSON.stringify({ v: version }) + '\n');
console.log('version.json: ' + version);
console.log('версия ' + version);

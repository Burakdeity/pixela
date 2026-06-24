const fs = require('fs');
const { applyProjectOverrides } = require('./patch-projects');

const html = fs.readFileSync('cache/page.html', 'utf8');

const escaped = html.includes('\\"projects\\":[');
const plain = html.includes('"projects":[{');
console.log('escaped format:', escaped);
console.log('plain format:', plain);

const titleMatch = html.match(/<title>([^<]*)<\/title>/);
console.log('cached title:', titleMatch?.[1]);

// Extract projects from flight
const idx = html.indexOf('\\"projects\\":');
if (idx < 0) {
  console.log('no escaped projects key');
  process.exit(1);
}
const start = html.indexOf('[', idx);
let depth = 0;
let end = start;
for (let i = start; i < html.length; i++) {
  if (html[i] === '[') depth++;
  if (html[i] === ']') {
    depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}
const arrStr = html.slice(start, end).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
try {
  const projects = JSON.parse(arrStr);
  console.log('project count:', projects.length);
  projects.forEach((p) => console.log(' -', p.uid, '|', p.title));
} catch (e) {
  console.log('parse fail:', e.message);
  console.log(arrStr.slice(0, 300));
}

const patched = applyProjectOverrides(html);
const idx2 = patched.indexOf('\\"projects\\":');
const start2 = patched.indexOf('[', idx2);
let depth2 = 0;
let end2 = start2;
for (let i = start2; i < patched.length; i++) {
  if (patched[i] === '[') depth2++;
  if (patched[i] === ']') {
    depth2--;
    if (depth2 === 0) {
      end2 = i + 1;
      break;
    }
  }
}
const arr2 = patched.slice(start2, end2).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
try {
  const projects2 = JSON.parse(arr2);
  console.log('\nAfter patch count:', projects2.length);
  projects2.forEach((p) => console.log(' -', p.uid, '|', p.title));
} catch (e) {
  console.log('patched parse fail:', e.message);
}

const fs = require('fs');
const { applyProjectOverrides } = require('./patch-projects');
const { applyTranslations } = require('./translations-tr');

const html = fs.readFileSync('cache/page.html', 'utf8');

function extractFlightBlocks(h) {
  return h.split(/(<script\b[\s\S]*?<\/script>)/gi).filter((b) => /self\.__next_f\.push/.test(b));
}

function test(label, h) {
  const blocks = extractFlightBlocks(h);
  let projectsBlock = null;
  for (const b of blocks) {
    if (/\\"projects\\":\[\{/.test(b)) projectsBlock = b;
  }
  if (!projectsBlock) {
    console.log(label, 'NO projects flight block');
    return;
  }
  const body = projectsBlock.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
  const m = body.match(/\\"projects\\":(\[[\s\S]*?\]),\\"bookACall/);
  if (!m) {
    console.log(label, 'projects array boundary not found');
    return;
  }
  const raw = m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  try {
    JSON.parse(raw);
    console.log(label, 'projects JSON: OK', 'count', JSON.parse(raw).length);
  } catch (e) {
    console.log(label, 'projects JSON: FAIL', e.message);
    console.log(raw.slice(0, 300));
  }
}

test('raw', html);
test('custom projects', applyProjectOverrides(html));
test('custom+tr', applyTranslations(applyProjectOverrides(html)));

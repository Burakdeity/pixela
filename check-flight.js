const fs = require('fs');
const html = fs.readFileSync('debug-home.html', 'utf8');
const blocks = html.split(/(<script\b[\s\S]*?<\/script>)/gi);
for (const block of blocks) {
  if (!/self\.__next_f\.push/.test(block)) continue;
  const body = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
  if (!/\\"projects\\":/.test(body)) continue;
  const idx = body.indexOf('\\"projects\\":[');
  if (idx < 0) continue;
  const slice = body.slice(idx, idx + 8000);
  console.log('--- projects snippet ---');
  console.log(slice.slice(0, 2000));
  if (slice.includes('undefined') && !slice.includes('$undefined')) {
    console.log('WARN: bare undefined in projects');
  }
  if (slice.includes('NaN')) console.log('WARN: NaN in projects');
  const open = (slice.match(/\{/g) || []).length;
  const close = (slice.match(/\}/g) || []).length;
  console.log('braces in slice', open, close);
}

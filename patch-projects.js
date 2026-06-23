const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname);
const CONFIG = path.join(ROOT, 'pixela-projects.json');

function loadProjects() {
  try {
    if (!fs.existsSync(CONFIG)) return null;
    const list = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
    if (!Array.isArray(list) || !list.length) return null;
    return list.filter((p) => p && p.title && p.url);
  } catch (_) {
    return null;
  }
}

function escJson(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

/** Tek proje kaydindan mux sablonu cikar. */
function parseTemplateEntry(entry) {
  const re =
    /\\"mux_playback_id\\":\\"([^\\"]+)\\",\\"brightness\\":([^,]+),\\"contrast\\":([^,]+),\\"project_media\\":\[([\s\S]*?)\],\\"description\\":\\"[^\\"]*\\"/;
  const m = entry.match(re);
  if (!m) return null;
  return { mux: m[1], media: m[4], brightness: m[2], contrast: m[3] };
}

function extractTemplateByUid(flightBody, uid) {
  if (!uid) return null;
  const escaped = uid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `\\{\\\\"uid\\\\":\\\\"${escaped}\\\\",\\\\"url\\\\":\\\\"\\/work\\/[^\\\\"]+\\\\"[\\s\\S]*?\\\\"description\\\\":\\\\"[^\\\\"]*\\\\"\\}`
  );
  const m = re.exec(flightBody);
  return m ? parseTemplateEntry(m[0]) : null;
}

/** Mevcut projeler dizisinden mux sablonlarini cikar (onizleme videolari). */
function extractTemplates(flightBody, count) {
  const templates = [];
  const re =
    /\{\\"uid\\":\\"[^\\"]+\\",\\"url\\":\\"\/work\/[^\\"]+\\",\\"title\\":\\"[^\\"]*\\",\\"subtitle\\":\\"[^\\"]*\\",\\"site_link\\":\{[^}]+\},\\"collaborator\\":\\"[^\\"]*\\",\\"mux_playback_id\\":\\"([^\\"]+)\\",\\"brightness\\":([^,]+),\\"contrast\\":([^,]+),\\"project_media\\":\[([\s\S]*?)\],\\"description\\":\\"[^\\"]*\\"\}/g;
  let m;
  while ((m = re.exec(flightBody)) && templates.length < count) {
    templates.push({
      mux: m[1],
      media: m[4],
      brightness: m[2],
      contrast: m[3],
    });
  }
  if (templates.length < count && templates.length > 0) {
    while (templates.length < count) templates.push({ ...templates[templates.length - 1] });
  }
  return templates;
}

function buildProjectEntry(p, tpl, index) {
  const uid = p.uid || `pixela-${index + 1}`;
  const workUid = p.routeUid || uid;
  const siteUrl = p.url.replace(/\/$/, '') + '/';
  const mux = tpl?.mux || 'Y7HzOsrmhjd7M00Ib6JYF861ME00I3ZqicLcr4V9vhoXU';
  const media =
    tpl?.media ||
    `{\\"mux_playback_id\\":\\"${mux}\\"},{\\"mux_playback_id\\":\\"${mux}\\"},{\\"mux_playback_id\\":\\"${mux}\\"}`;
  const brightness = tpl?.brightness || '\\"$undefined\\"';
  const contrast = tpl?.contrast || '\\"$undefined\\"';

  return (
    `{\\"uid\\":\\"${escJson(uid)}\\",` +
    `\\"url\\":\\"/work/${escJson(workUid)}\\",` +
    `\\"title\\":\\"${escJson(p.title)}\\",` +
    `\\"subtitle\\":\\"${escJson(p.subtitle || 'Kurumsal Site')}\\",` +
    `\\"site_link\\":{\\"link_type\\":\\"Web\\",\\"key\\":\\"pixela-${index}\\",\\"url\\":\\"${escJson(siteUrl)}\\",\\"target\\":\\"_blank\\"},` +
    `\\"collaborator\\":\\"$undefined\\",` +
    `\\"mux_playback_id\\":\\"${mux}\\",` +
    `\\"brightness\\":${brightness},` +
    `\\"contrast\\":${contrast},` +
    `\\"project_media\\":[${media}],` +
    `\\"description\\":\\"${escJson(p.description || '')}\\"}`
  );
}

function findProjectsArray(body) {
  const key = '\\"projects\\":[';
  const start = body.indexOf(key);
  if (start < 0) return null;
  const arrStart = start + key.length - 1;
  let depth = 0;
  for (let i = arrStart; i < body.length; i++) {
    if (body[i] === '[') depth++;
    if (body[i] === ']') {
      depth--;
      if (depth === 0) return { start: arrStart, end: i + 1 };
    }
  }
  return null;
}

function patchItemListJsonLd(html, extraProjects) {
  if (!extraProjects?.length) return html;

  return html.replace(
    /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/gi,
    (block, open, body, close) => {
      if (!body.includes('"@type":"ItemList"') && !body.includes('"@type": "ItemList"')) return block;

      const listMatch = body.match(/"itemListElement"\s*:\s*\[([\s\S]*?)\]/);
      if (!listMatch) return block;

      const existingItems = listMatch[1].trim();
      const existingCount = (existingItems.match(/"@type"\s*:\s*"ListItem"/g) || []).length;
      const prependItems = extraProjects
        .map(
          (p, i) =>
            `{"@type":"ListItem","position":${i + 1},"url":"${p.url.replace(/\/$/, '')}/","name":"${p.title.replace(/"/g, '\\"')}"}`
        )
        .join(',');
      const shifted = existingItems
        ? existingItems.replace(/"position"\s*:\s*(\d+)/g, (_, n) =>
            `"position":${parseInt(n, 10) + extraProjects.length}`
          )
        : '';
      const merged = shifted ? `${prependItems},${shifted}` : prependItems;

      let newBody = body.replace(/"itemListElement"\s*:\s*\[[\s\S]*?\]/, `"itemListElement":[${merged}]`);
      newBody = newBody.replace(
        /"numberOfItems"\s*:\s*\d+/,
        `"numberOfItems":${existingCount + extraProjects.length}`
      );
      return open + newBody + close;
    }
  );
}

function patchProjectsInHtml(html, extraProjects) {
  if (!extraProjects?.length) return html;

  const blocks = html.split(/(<script\b[\s\S]*?<\/script>)/gi);
  let changed = false;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!/^<script\b/i.test(block) || !/self\.__next_f\.push/.test(block) || !/\\"projects\\":\[\{/.test(block)) {
      continue;
    }

    const span = findProjectsArray(block);
    if (!span) continue;

    const originalArr = block.slice(span.start, span.end);
    const inner = originalArr.slice(1, -1);
    const fallback = extractTemplates(originalArr, extraProjects.length);
    const templates = extraProjects.map(
      (p, idx) => extractTemplateByUid(originalArr, p.routeUid) || fallback[idx] || fallback[0]
    );
    const entries = extraProjects.map((p, idx) => buildProjectEntry(p, templates[idx], idx));
    const newArr = inner ? `[${inner},${entries.join(',')}]` : `[${entries.join(',')}]`;
    blocks[i] = block.slice(0, span.start) + newArr + block.slice(span.end);
    changed = true;
    break;
  }

  return changed ? blocks.join('') : html;
}

function applyProjectOverrides(html) {
  const projects = loadProjects();
  if (!projects) return html;
  try {
    let out = patchProjectsInHtml(html, projects);
    out = patchItemListJsonLd(out, projects);
    return out;
  } catch (err) {
    console.warn('  Proje yamasi atlandi:', err.message);
    return html;
  }
}

module.exports = { loadProjects, patchProjectsInHtml, applyProjectOverrides };

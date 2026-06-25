const { getProjects } = require('./site-config');

function loadProjects() {
  try {
    const list = getProjects();
    if (!list?.length) return null;
    return list;
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
    /\{\\"uid\\":\\"[^\\"]+\\",\\"url\\":\\"\/work\/[^\\"]+\\",\\"title\\":\\"[^\\"]*\\",\\"subtitle\\":\\"[^\\"]*\\",\\"site_link\\":\{[^}]+\},\\"collaborator\\":[^,]+,\\"mux_playback_id\\":\\"([^\\"]+)\\",\\"brightness\\":([^,]+),\\"contrast\\":([^,]+),\\"project_media\\":\[([\s\S]*?)\],\\"description\\":\\"[^\\"]*\\"\}/g;
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

/** Karusel uyumu icin uid = routeUid (orijinal proje slug). */
function buildProjectEntry(p, tpl, index) {
  const uid = p.routeUid || p.uid || `pixela-${index + 1}`;
  const siteUrl = p.url.replace(/\/$/, '') + '/';
  const mux = tpl?.mux || 'Y7HzOsrmhjd7M00Ib6JYF861ME00I3ZqicLcr4V9vhoXU';
  const media =
    tpl?.media ||
    `{\\"mux_playback_id\\":\\"${mux}\\"},{\\"mux_playback_id\\":\\"${mux}\\"},{\\"mux_playback_id\\":\\"${mux}\\"}`;
  const brightness = tpl?.brightness || '\\"$undefined\\"';
  const contrast = tpl?.contrast || '\\"$undefined\\"';

  return (
    `{\\"uid\\":\\"${escJson(uid)}\\",` +
    `\\"url\\":\\"/work/${escJson(uid)}\\",` +
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

function patchItemListJsonLd(html, projects, replace = true) {
  if (!projects?.length) return html;

  return html.replace(
    /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/gi,
    (block, open, body, close) => {
      if (!body.includes('"@type":"ItemList"') && !body.includes('"@type": "ItemList"')) return block;

      const listMatch = body.match(/"itemListElement"\s*:\s*\[([\s\S]*?)\]/);
      if (!listMatch) return block;

      if (replace) {
        const items = projects
          .map((p, i) => {
            const slug = p.routeUid || p.uid;
            return `{"@type":"ListItem","position":${i + 1},"url":"/work/${slug}","name":"${p.title.replace(/"/g, '\\"')}"}`;
          })
          .join(',');
        let newBody = body.replace(/"itemListElement"\s*:\s*\[[\s\S]*?\]/, `"itemListElement":[${items}]`);
        newBody = newBody.replace(/"numberOfItems"\s*:\s*\d+/, `"numberOfItems":${projects.length}`);
        return open + newBody + close;
      }

      const existingItems = listMatch[1].trim();
      const existingCount = (existingItems.match(/"@type"\s*:\s*"ListItem"/g) || []).length;
      const prependItems = projects
        .map(
          (p, i) =>
            `{"@type":"ListItem","position":${i + 1},"url":"${p.url.replace(/\/$/, '')}/","name":"${p.title.replace(/"/g, '\\"')}"}`
        )
        .join(',');
      const shifted = existingItems
        ? existingItems.replace(/"position"\s*:\s*(\d+)/g, (_, n) =>
            `"position":${parseInt(n, 10) + projects.length}`
          )
        : '';
      const merged = shifted ? `${prependItems},${shifted}` : prependItems;

      let newBody = body.replace(/"itemListElement"\s*:\s*\[[\s\S]*?\]/, `"itemListElement":[${merged}]`);
      newBody = newBody.replace(
        /"numberOfItems"\s*:\s*\d+/,
        `"numberOfItems":${existingCount + projects.length}`
      );
      return open + newBody + close;
    }
  );
}

function patchProjectsInHtml(html, customProjects, replace = true) {
  if (!customProjects?.length) return html;

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
    const fallback = extractTemplates(originalArr, customProjects.length);
    const templates = customProjects.map(
      (p, idx) => extractTemplateByUid(originalArr, p.routeUid || p.uid) || fallback[idx] || fallback[0]
    );
    const entries = customProjects.map((p, idx) => buildProjectEntry(p, templates[idx], idx));
    const newArr = replace ? `[${entries.join(',')}]` : `[${originalArr.slice(1, -1)},${entries.join(',')}]`;
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
    let out = patchProjectsInHtml(html, projects, true);
    out = patchItemListJsonLd(out, projects, true);
    return out;
  } catch (err) {
    console.warn('  Proje yamasi atlandi:', err.message);
    return html;
  }
}

module.exports = { loadProjects, patchProjectsInHtml, applyProjectOverrides };

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

/** Tek proje kaydindan mux sablonu cikar (flight escaped). */
function parseTemplateEntry(entry) {
  const re =
    /\\"mux_playback_id\\":\\"([^\\"]+)\\",\\"brightness\\":([^,]+),\\"contrast\\":([^,]+),\\"project_media\\":\[([\s\S]*?)\],\\"description\\":\\"[^\\"]*\\"/;
  const m = entry.match(re);
  if (!m) return null;
  return { mux: m[1], media: m[4], brightness: m[2], contrast: m[3] };
}

function parseTemplateEntryPlain(entry) {
  const re =
    /"mux_playback_id":"([^"]+)","brightness":([^,]+),"contrast":([^,]+),"project_media":\[([\s\S]*?)\],"description":"[^"]*"/;
  const m = entry.match(re);
  if (!m) return null;
  return { mux: m[1], media: m[4], brightness: m[2], contrast: m[3] };
}

function extractTemplateByUid(flightBody, uid) {
  if (!uid) return null;
  const escaped = uid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reEsc = new RegExp(
    `\\{\\\\"uid\\\\":\\\\"${escaped}\\\\",\\\\"url\\\\":\\\\"\\/work\\/[^\\\\"]+\\\\"[\\s\\S]*?\\\\"description\\\\":\\\\"[^\\\\"]*\\\\"\\}`
  );
  const mEsc = reEsc.exec(flightBody);
  if (mEsc) return parseTemplateEntry(mEsc[0]);

  const rePlain = new RegExp(
    `\\{"uid":"${escaped}","url":"\\/work\\/[^"]+"[\\s\\S]*?"description":"[^"]*"\\}`
  );
  const mPlain = rePlain.exec(flightBody);
  return mPlain ? parseTemplateEntryPlain(mPlain[0]) : null;
}

/** Mevcut projeler dizisinden mux sablonlarini cikar (onizleme videolari). */
function extractTemplates(flightBody, count) {
  const templates = [];
  const reEsc =
    /\{\\"uid\\":\\"[^\\"]+\\",\\"url\\":\\"\/work\/[^\\"]+\\",\\"title\\":\\"[^\\"]*\\",\\"subtitle\\":\\"[^\\"]*\\",\\"site_link\\":\{[^}]+\},\\"collaborator\\":[^,]+,\\"mux_playback_id\\":\\"([^\\"]+)\\",\\"brightness\\":([^,]+),\\"contrast\\":([^,]+),\\"project_media\\":\[([\s\S]*?)\],\\"description\\":\\"[^\\"]*\\"\}/g;
  let m;
  while ((m = reEsc.exec(flightBody)) && templates.length < count) {
    templates.push({
      mux: m[1],
      media: m[4],
      brightness: m[2],
      contrast: m[3],
    });
  }
  if (templates.length < count) {
    const rePlain =
      /\{"uid":"[^"]+","url":"\/work\/[^"]+","title":"[^"]*","subtitle":"[^"]*","site_link":\{[^}]+\},"collaborator":[^,]+,"mux_playback_id":"([^"]+)","brightness":([^,]+),"contrast":([^,]+),"project_media":\[([\s\S]*?)\],"description":"[^"]*"\}/g;
    while ((m = rePlain.exec(flightBody)) && templates.length < count) {
      templates.push({
        mux: m[1],
        media: m[4],
        brightness: m[2],
        contrast: m[3],
      });
    }
  }
  if (templates.length < count && templates.length > 0) {
    while (templates.length < count) templates.push({ ...templates[templates.length - 1] });
  }
  return templates;
}

function syntheticMuxId(uid) {
  return `pixela_${String(uid || 'project').replace(/[^a-z0-9_-]/gi, '_')}`.slice(0, 64);
}

/** Karusel uyumu icin uid = routeUid (orijinal proje slug). */
function buildProjectEntry(p, tpl, index) {
  const uid = p.routeUid || p.uid || `pixela-${index + 1}`;
  const siteUrl = p.url.replace(/\/$/, '') + '/';
  const mux = tpl?.mux || syntheticMuxId(uid);
  const media =
    tpl?.media ||
    `{\\"mux_playback_id\\":\\"${mux}\\"}`;
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

function buildProjectEntryPlain(p, tpl, index) {
  const uid = p.routeUid || p.uid || `pixela-${index + 1}`;
  const siteUrl = p.url.replace(/\/$/, '') + '/';
  const mux = tpl?.mux || syntheticMuxId(uid);
  let media = `{"mux_playback_id":"${mux}"}`;
  if (tpl?.media) {
    media = tpl.media.includes('\\"')
      ? tpl.media.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      : tpl.media;
  }
  const brightness =
    tpl?.brightness && !String(tpl.brightness).includes('\\')
      ? tpl.brightness
      : '"$undefined"';
  const contrast =
    tpl?.contrast && !String(tpl.contrast).includes('\\')
      ? tpl.contrast
      : '"$undefined"';

  return (
    `{"uid":"${uid}","url":"/work/${uid}","title":${JSON.stringify(p.title)},` +
    `"subtitle":${JSON.stringify(p.subtitle || 'Kurumsal Site')},` +
    `"site_link":{"link_type":"Web","key":"pixela-${index}","url":${JSON.stringify(siteUrl)},"target":"_blank"},` +
    `"collaborator":"$undefined","mux_playback_id":"${mux}",` +
    `"brightness":${brightness},"contrast":${contrast},` +
    `"project_media":[${media}],` +
    `"description":${JSON.stringify(p.description || '')}}`
  );
}

function findProjectsArray(body, key) {
  const start = body.indexOf(key);
  if (start < 0) return null;
  const arrStart = start + key.length - 1;
  let depth = 0;
  for (let i = arrStart; i < body.length; i++) {
    if (body[i] === '[') depth++;
    if (body[i] === ']') {
      depth--;
      if (depth === 0) return { start: arrStart, end: i + 1, key };
    }
  }
  return null;
}

function findAnyProjectsArray(body) {
  return (
    findProjectsArray(body, '\\"projects\\":[') ||
    findProjectsArray(body, '"projects":[')
  );
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

      return block;
    }
  );
}

function replaceProjectsArray(body, customProjects, replace = true) {
  const span = findAnyProjectsArray(body);
  if (!span) return { body, changed: false };

  const originalArr = body.slice(span.start, span.end);
  const escaped = span.key.startsWith('\\');
  const fallback = extractTemplates(originalArr, customProjects.length);
  const templates = customProjects.map(
    (p, idx) => extractTemplateByUid(originalArr, p.routeUid || p.uid) || fallback[idx] || fallback[0]
  );
  const entries = customProjects.map((p, idx) =>
    escaped ? buildProjectEntry(p, templates[idx], idx) : buildProjectEntryPlain(p, templates[idx], idx)
  );
  const newArr = replace
    ? `[${entries.join(',')}]`
    : `[${originalArr.slice(1, -1)},${entries.join(',')}]`;

  return {
    body: body.slice(0, span.start) + newArr + body.slice(span.end),
    changed: true,
    templates,
  };
}

function patchProjectsInHtml(html, customProjects, replace = true) {
  if (!customProjects?.length) return html;

  const blocks = html.split(/(<script\b[\s\S]*?<\/script>)/gi);
  let changed = false;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (
      !/^<script\b/i.test(block) ||
      !/self\.__next_f\.push/.test(block) ||
      (!/\\"projects\\":\[\{/.test(block) && !/"projects":\[\{/.test(block))
    ) {
      continue;
    }

    const result = replaceProjectsArray(block, customProjects, replace);
    if (result.changed) {
      blocks[i] = result.body;
      changed = true;
      break;
    }
  }

  return changed ? blocks.join('') : html;
}

/** Ham RSC flight (plain JSON projects). */
function patchProjectsInRsc(rscBody, customProjects) {
  if (!customProjects?.length || !rscBody) return rscBody;
  const result = replaceProjectsArray(rscBody, customProjects, true);
  return result.changed ? result.body : rscBody;
}

/** Work sayfasi / RSC: slug'a gore PIXELA baslik, aciklama, site linki */
function patchWorkPageForSlug(body, slug) {
  if (!body || !slug) return body;
  const projects = loadProjects() || [];
  const p = projects.find((x) => (x.routeUid || x.uid) === slug);
  if (!p) return body;

  let out = body;
  const siteUrl = p.url.replace(/\/$/, '') + '/';
  const title = p.title;
  const subtitle = p.subtitle || 'Kurumsal Site';
  const desc = p.description || '';

  // Bilinen Shader orijinal basliklari (slug bazli)
  const ORIGINALS = {
    'ehealth-arena': ['eHealth Arena', '3D Showroom'],
    heip: ['HEIP', '3D Visualisation', 'HEIP – 3D Visualisation', 'HEIP - 3D Visualisation'],
    gamily: ['Gamily'],
  };
  const originals = ORIGINALS[slug] || [];

  for (const orig of originals) {
    if (orig === title) continue;
    out = out.split(orig).join(title);
  }

  // meta / og title kalıpları
  out = out.replace(
    new RegExp(`Work: ${slug === 'heip' ? 'HEIP' : originals[0] || slug} \\|`, 'g'),
    `${title} |`
  );
  out = out.replace(/Work: [^|<]+ \|/g, (m) => {
    if (originals.some((o) => m.includes(o))) return `${title} |`;
    return m;
  });

  if (desc) {
    // Kisa slug odaklı description degisimleri zor; title/subtitle odaklı kalsın
  }

  if (slug === 'heip') {
    out = out.replace(/https:\/\/heip-vis\.vercel\.app[^"'\\]*/g, siteUrl);
    out = out.replace(/heip-vis\.vercel\.app/g, siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''));
  }

  // site_link url duzelt (escaped + plain)
  out = out.replace(
    new RegExp(`(\\\\"uid\\\\":\\\\"${slug}\\\\"[\\s\\S]*?\\\\"url\\\\":\\\\")[^\\\\"]+(\\\\")`),
    `$1${siteUrl.replace(/"/g, '\\"')}$2`
  );

  out = out.replace(
    new RegExp(`(<h1>)[^<]*(</h1>)`, 'i'),
    `$1${title}$2`
  );

  // subtitle replacements for known ones
  for (const sub of ['3D Showroom', '3D Visualisation', 'Interactive Experience']) {
    if (sub !== subtitle) out = out.split(sub).join(subtitle);
  }

  void desc;
  return out;
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

function applyProjectOverridesRsc(rscBody) {
  const projects = loadProjects();
  if (!projects) return rscBody;
  try {
    return patchProjectsInRsc(rscBody, projects);
  } catch (err) {
    console.warn('  RSC proje yamasi atlandi:', err.message);
    return rscBody;
  }
}

/** Config projeleri icin mux_id -> yerel video/poster eslemesi. */
function buildMuxMediaMap() {
  const projects = loadProjects() || [];
  const map = {};
  for (const p of projects) {
    const uid = p.routeUid || p.uid;
    if (!uid) continue;
    if (p.video) map[uid] = { video: p.video, poster: p.poster || '/textures/thumb_fallback.png' };
  }
  return map;
}

module.exports = {
  loadProjects,
  patchProjectsInHtml,
  patchProjectsInRsc,
  patchWorkPageForSlug,
  applyProjectOverrides,
  applyProjectOverridesRsc,
  extractTemplateByUid,
  extractTemplates,
  buildMuxMediaMap,
  findAnyProjectsArray,
};

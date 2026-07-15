/** Proje onizleme videolarini yerel MP4 / poster ile degistir — uzak Mux yok */
const { getProjects } = require('./site-config');

const HEIP_MUX = 'LbdE02DF9Gx1iVtxU98nv6uOtEEmQkTSs00Uyqb6O0201Tw';
const HEIP_VIDEO_VER = '122';
const HEIP_VIDEO = `/videos/heip-lider-teknik.mp4?v=${HEIP_VIDEO_VER}`;
const HEIP_POSTER = `/videos/heip-poster.jpg?v=${HEIP_VIDEO_VER}`;
const FALLBACK_POSTER = '/textures/thumb_fallback.png';
const HEIP_DESC =
  'Sakarya ve çevresinde klima montaj, bakım ve VRF çözümleri sunan Lider Teknik için kurumsal web sitesi. Hizmet kataloğu, akıllı klima araçları ve WhatsApp ile hızlı teklif.';
const HEIP_DESC_OLD_TR =
  'Endüstriyel tesis için bilgilendirme ve görselleştirme sitesi — işletmenin süreçlerini net anlatıyor.';
const HEIP_DESC_OLD_EN =
  'This visualization was created for Händelö Eco-Industrial Park and shows how different factories and units exchange by-products, reducing waste and maximizing overall efficiency.';
const HEIP_META_DESC_OLD =
  '3D Visualisation. This visualization was created for Händelö Eco-Industrial Park and shows how different factories and units exchange by-products, reducing waste and maximizing overall efficiency.';
const HEIP_META_DESC_NEW = `Lider Teknik — Kurumsal Site. ${HEIP_DESC}`;
const HEIP_EXTRA_MUX = [
  'mAHI2XHR02R49Q02ZTknqKi4JmkIkHeUPrsQ0200101MFFKE',
  '005QKAjn5uzXCECW6eQSaNXX01LLEIBg6rT3P6nySuJL4',
];

/** Ow() icindeki mux HLS sablonunu yerel mp4'e yonlendir */
const MUX_SRC_TEMPLATE =
  '`https://stream.mux.com/${a}.m3u8?max_resolution=${e}`';

/** getMuxImageUrl() — film seridi onizleme gorseli */
const MUX_IMG_TEMPLATE = '`/api/mux-image/${e}/${s.join("-")}`';

function normalizeMediaPath(p, ver = HEIP_VIDEO_VER) {
  if (!p) return null;
  const base = String(p).split('?')[0];
  return `${base}?v=${ver}`;
}

/** Config + bilinen HEIP mux — tum stream.mux / mux-image istekleri yerelleşir */
function buildVideoOverrides() {
  const overrides = {
    [HEIP_MUX]: HEIP_VIDEO,
  };
  try {
    const projects = getProjects() || [];
    for (const p of projects) {
      if (p.video) {
        if (p.routeUid === 'heip' || p.uid === 'lider-teknik') {
          overrides[HEIP_MUX] = normalizeMediaPath(p.video) || HEIP_VIDEO;
        }
      }
    }
  } catch (_) {}
  return overrides;
}

function buildPosterOverrides() {
  const posters = {
    [HEIP_MUX]: HEIP_POSTER,
  };
  try {
    const projects = getProjects() || [];
    for (const p of projects) {
      if ((p.routeUid === 'heip' || p.uid === 'lider-teknik') && p.poster) {
        posters[HEIP_MUX] = normalizeMediaPath(p.poster) || HEIP_POSTER;
      }
    }
  } catch (_) {}
  return posters;
}

const VIDEO_OVERRIDES = buildVideoOverrides();
const POSTER_OVERRIDES = buildPosterOverrides();

function buildMuxSrcPatch() {
  // Offline: tum mux stream URL'leri yerel videoya
  return `"${HEIP_VIDEO}"`;
}

function buildMuxImgPatch() {
  return `(e==="${HEIP_MUX}"?"${HEIP_POSTER}":"${FALLBACK_POSTER}")`;
}

/** Onceki yamalar + orijinal sablonu tek temiz ifadeye indir. */
function normalizeMuxSrcExpr(text) {
  let out = text;
  // Tum stream.mux sablon literal'leri (${a} vb.)
  out = out.replace(
    /`https:\/\/stream\.mux\.com\/\$\{[^}]+\}[^`]*`/g,
    buildMuxSrcPatch()
  );
  // Sabit https://stream.mux.com/ID.m3u8 — boot/handshake/showreel
  out = out.replace(
    /https:\/\/stream\.mux\.com\/[A-Za-z0-9]+\.m3u8/g,
    HEIP_VIDEO.split('?')[0]
  );
  // Ow({src:(a==="HEIP"?...:... )}) — basit veya ic ice ternary
  const ternary = new RegExp(
    String.raw`\(a==="${HEIP_MUX}"\?"[^"]*":(?:\([^)]*\)|"[^"]*")\)`,
    'g'
  );
  out = out.replace(ternary, buildMuxSrcPatch());
  return out;
}

function normalizeMuxImgExpr(text) {
  let out = text;
  if (out.includes(MUX_IMG_TEMPLATE)) {
    out = out.split(MUX_IMG_TEMPLATE).join(buildMuxImgPatch());
  }
  out = out.replace(
    /`\/api\/mux-image\/\$\{e\}\/\$\{s\.join\("-"\)\}`/g,
    buildMuxImgPatch()
  );
  return out;
}

function patchVideoLoader(body) {
  let text = body.toString('utf8');
  const before = text;
  text = normalizeMuxSrcExpr(text);
  text = normalizeMuxImgExpr(text);
  text = patchHeipFilmPlayback(text);
  return text !== before ? Buffer.from(text, 'utf8') : body;
}

/** Gb carousel: HEIP slotunda poster yerine dogrudan video oynat */
function patchHeipFilmPlayback(text) {
  const mux = HEIP_MUX;

  const motionFrom =
    'd=(0,b$.useMotionValue)(1),c=(0,ep.useRef)(null),h=(0,ep.useRef)(null),g=(0,b$.useMotionValue)(0),A=(0,ep.useRef)(!1)';
  const motionTo = `d=(0,b$.useMotionValue)(a==="${mux}"?0:1),c=(0,ep.useRef)(null),h=(0,ep.useRef)(null),g=(0,b$.useMotionValue)(a==="${mux}"?1:0),A=(0,ep.useRef)(!1)`;
  if (text.includes(motionFrom) && !text.includes(motionTo)) {
    text = text.replace(motionFrom, motionTo);
  }

  const fadeFrom =
    'if(1>g.get())return void(0,O3.animate)(g,1,{duration:.5,onComplete:()=>{(e||A.current)&&t.source.data.play()}});t.source.data.play()';
  const fadeTo = `if(a==="${mux}"){g.set(1);d.set(0);return void((e||A.current)&&t.source.data.play())}${fadeFrom}`;
  if (text.includes(fadeFrom) && !text.includes(`if(a==="${mux}"){g.set(1)`)) {
    text = text.replace(fadeFrom, fadeTo);
  }

  const optsFrom = 'options:{autoplay:!1,muted:!0,loop:!0}}).then(e=>{if(c.current=e,u.current.tVideoTexture.value=e??l.current,e){let t=e.source.data;t.video';
  const optsTo = `options:(a==="${mux}"?{autoplay:!0,muted:!0,loop:!0,playsInline:!0}:{autoplay:!1,muted:!0,loop:!0})}).then(e=>{if(c.current=e,u.current.tVideoTexture.value=e??l.current,e){let t=e.source.data;t.video`;
  if (text.includes(optsFrom) && !text.includes(`options:(a==="${mux}"?`)) {
    text = text.replace(optsFrom, optsTo);
  }

  const pauseFrom = 'else if(!e){if(!t)return;t.pause()}';
  const pauseTo = `else if(!e){if(!t)return;a!=="${mux}"&&t.pause()}`;
  if (text.includes(pauseFrom) && !text.includes(`a!=="${mux}"&&t.pause()`)) {
    text = text.replace(pauseFrom, pauseTo);
  }

  return text;
}

/** HEIP flight kaydini Lider Teknik + tek video medya ile guncelle */
function buildHeipEntry({ collab, bright, contrast }) {
  const desc = HEIP_DESC.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return (
    `{\\"uid\\":\\"heip\\",\\"url\\":\\"/work/heip\\",\\"title\\":\\"Lider Teknik\\",\\"subtitle\\":\\"Kurumsal Site\\",` +
    `\\"site_link\\":{\\"link_type\\":\\"Web\\",\\"key\\":\\"pixela-lider-teknik\\",\\"url\\":\\"https://www.sakaryaliderklima.com/\\",\\"target\\":\\"_blank\\"},` +
    `\\"collaborator\\":${collab},\\"mux_playback_id\\":\\"${HEIP_MUX}\\",\\"brightness\\":${bright},\\"contrast\\":${contrast},` +
    `\\"project_media\\":[{\\"mux_playback_id\\":\\"${HEIP_MUX}\\"}],` +
    `\\"description\\":\\"${desc}\\"}`
  );
}

function buildHeipEntryJson() {
  return (
    `{"uid":"heip","url":"/work/heip","title":"Lider Teknik","subtitle":"Kurumsal Site",` +
    `"site_link":{"link_type":"Web","key":"pixela-lider-teknik","url":"https://www.sakaryaliderklima.com/","target":"_blank"},` +
    `"collaborator":"$undefined","mux_playback_id":"${HEIP_MUX}","brightness":"$undefined","contrast":"$undefined",` +
    `"project_media":[{"mux_playback_id":"${HEIP_MUX}"}],` +
    `"description":"${HEIP_DESC}"}`
  );
}

function buildHeipEntryJsonNull() {
  return (
    `{"uid":"heip","url":"/work/heip","title":"Lider Teknik","subtitle":"Kurumsal Site",` +
    `"site_link":{"link_type":"Web","key":"pixela-lider-teknik","url":"https://www.sakaryaliderklima.com/","target":"_blank"},` +
    `"collaborator":null,"mux_playback_id":"${HEIP_MUX}","brightness":null,"contrast":null,` +
    `"project_media":[{"mux_playback_id":"${HEIP_MUX}"}],` +
    `"description":"${HEIP_DESC}"}`
  );
}

function patchHeipFlight(html) {
  if (!html || typeof html !== 'string') return html;
  let out = html;

  const heipFlightRe =
    /\{\\"uid\\":\\"heip\\",\\"url\\":\\"\/work\/heip\\",\\"title\\":\\"[^\\"]*\\",\\"subtitle\\":\\"[^\\"]*\\",\\"site_link\\":\{[^}]+\},\\"collaborator\\":(?:\\"[^\\"]*\\"|null),\\"mux_playback_id\\":\\"[^\\"]+\\",\\"brightness\\":(?:\\"[^\\"]*\\"|null),\\"contrast\\":(?:\\"[^\\"]*\\"|null),\\"project_media\\":\[[^\]]*\],\\"description\\":\\"[^\\"]*\\"\}/g;

  out = out.replace(heipFlightRe, (block) => {
    if (block.includes('\\"collaborator\\":null')) {
      return buildHeipEntry({ collab: 'null', bright: 'null', contrast: 'null' });
    }
    return buildHeipEntry({
      collab: '\\"$undefined\\"',
      bright: '\\"$undefined\\"',
      contrast: '\\"$undefined\\"',
    });
  });

  const heipJsonRe =
    /\{"uid":"heip","url":"\/work\/heip","title":"[^"]*","subtitle":"[^"]*","site_link":\{[^}]+\},"collaborator":(?:null|"[^"]*"),"mux_playback_id":"[^"]+","brightness":(?:null|"\$undefined"|"[^"]*"),"contrast":(?:null|"\$undefined"|"[^"]*"),"project_media":\[[^\]]*\],"description":"[^"]*"\}/g;

  out = out.replace(heipJsonRe, (block) => {
    if (block.includes('"collaborator":null')) return buildHeipEntryJsonNull();
    return buildHeipEntryJson();
  });

  for (const muxId of HEIP_EXTRA_MUX) {
    out = out.replace(
      new RegExp(`\\{\\\\"mux_playback_id\\\\":\\\\"${muxId}\\\\"\\},?`, 'g'),
      ''
    );
  }

  out = out.replace(/Work: HEIP \|/g, 'Lider Teknik |');
  out = out.replace(/<h1>HEIP<\/h1>/g, '<h1>Lider Teknik</h1>');
  out = out.replace(
    /aria-label="Visit HEIP website/g,
    'aria-label="Visit Lider Teknik website'
  );
  out = out.replace(/https:\/\/heip-vis\.vercel\.app[^"'\\]*/g, 'https://www.sakaryaliderklima.com/');
  out = out.replace(/heip-vis\.vercel\.app/g, 'www.sakaryaliderklima.com');

  out = out.replace(
    /"name":"HEIP","headline":"3D Visualisation"/g,
    '"name":"Lider Teknik","headline":"Kurumsal Site"'
  );
  out = out.replace(
    /"name":"HEIP","headline":"HEIP – 3D Visualisation"/g,
    '"name":"Lider Teknik","headline":"Lider Teknik – Kurumsal Site"'
  );
  out = out.split(HEIP_DESC_OLD_EN).join(HEIP_DESC);
  out = out.split(HEIP_DESC_OLD_TR).join(HEIP_DESC);
  out = out.split(HEIP_META_DESC_OLD).join(HEIP_META_DESC_NEW);
  out = out.replace(
    /"content":"3D Visualisation\. This visualization was created for Händelö[^"]*"/g,
    `"content":"${HEIP_META_DESC_NEW.replace(/"/g, '\\"')}"`
  );
  out = out.replace(/Work: HEIP \| Shader Development Studio/g, 'Lider Teknik | PIXELA — Yazılım & Web');

  out = out.replace(/\\"title\\":\\"HEIP\\"/g, '\\"title\\":\\"Lider Teknik\\"');
  out = out.replace(/"title":"HEIP"/g, '"title":"Lider Teknik"');
  out = out.replace(/\\"name\\":\\"HEIP\\"/g, '\\"name\\":\\"Lider Teknik\\"');
  out = out.replace(/"name":"HEIP"/g, '"name":"Lider Teknik"');
  out = out.replace(/HEIP – 3D Visualisation/g, 'Lider Teknik — Kurumsal Site');
  out = out.replace(/HEIP - 3D Visualisation/g, 'Lider Teknik — Kurumsal Site');
  out = out.replace(/Visit HEIP website/g, 'Lider Teknik sitesini ziyaret et');
  out = out.replace(/>HEIP</g, '>Lider Teknik<');
  out = out.replace(/og:title" content="Work: HEIP/g, 'og:title" content="Lider Teknik');

  return out;
}

/** RSC flight: T[hex], satirlarinda icerik degisince uzunluk on eki guncellenmezse Connection closed olur */
function readJsonStringEnd(line, start) {
  if (line[start] !== '"') return start + 1;
  let esc = false;
  for (let i = start + 1; i < line.length; i++) {
    const ch = line[i];
    if (esc) esc = false;
    else if (ch === '\\') esc = true;
    else if (ch === '"') return i + 1;
  }
  return line.length;
}

function matchBracketEnd(line, start, open, close) {
  if (line[start] !== open) return start;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < line.length; i++) {
    const ch = line[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return line.length;
}

function findRowEnd(line, start) {
  const c = line[start];
  if (c === 'I') return matchBracketEnd(line, start + 1, '[', ']');
  if (c === '"') return readJsonStringEnd(line, start);
  if (c === '[' || c === '{') return matchBracketEnd(line, start, c, c === '[' ? ']' : '}');
  const m = line.slice(start).match(/^(\$[A-Za-z0-9_.]+|null|true|false|-?\d+(?:\.\d+)?)/);
  return m ? start + m[0].length : start + 1;
}

function findNextRowPos(line, contentStart) {
  for (let p = contentStart + 1; p < line.length; p++) {
    if (!/^[0-9a-fA-F]+:/.test(line.slice(p))) continue;
    const snippet = line.slice(contentStart, p);
    if (!snippet) continue;
    if (snippet[0] === '{') {
      try {
        JSON.parse(snippet);
        return p;
      } catch (_) {}
    }
  }
  return line.length;
}

function fixRscFlightLine(line) {
  if (!line || !line.includes(':T')) return line;
  let out = '';
  let i = 0;
  while (i < line.length) {
    const idM = line.slice(i).match(/^([0-9a-fA-F]+):/);
    if (!idM) {
      out += line.slice(i);
      break;
    }
    const rowId = idM[1];
    const typeStart = i + idM[0].length;
    if (line[typeStart] === 'T') {
      const lenM = line.slice(typeStart).match(/^T([0-9a-fA-F]+),/);
      if (!lenM) {
        out += line.slice(i);
        break;
      }
      const payloadStart = typeStart + lenM[0].length;
      const payloadEnd = findNextRowPos(line, payloadStart);
      const payload = line.slice(payloadStart, payloadEnd);
      const newHex = Buffer.byteLength(payload, 'utf8').toString(16);
      out += `${rowId}:T${newHex},${payload}`;
      i = payloadEnd;
    } else {
      const rowEnd = findRowEnd(line, typeStart);
      out += line.slice(i, rowEnd);
      i = rowEnd;
    }
  }
  return out;
}

function fixRscFlightLengths(body) {
  if (!body || typeof body !== 'string') return body;
  return body.split('\n').map(fixRscFlightLine).join('\n');
}

function patchHeipRsc(body) {
  return fixRscFlightLengths(patchHeipFlight(body));
}

function isFlightScriptBlock(block) {
  return /^<script\b/i.test(block) && /self\.__next_f\.push/.test(block);
}

function patchFlightScriptBlock(block) {
  return block.replace(
    /self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)/g,
    (full, quoted) => {
      let decoded;
      try {
        decoded = JSON.parse(quoted);
      } catch (_) {
        return full;
      }
      if (typeof decoded !== 'string') return full;
      const patched = patchHeipRsc(decoded);
      // Her zaman yeniden encode — proje yamasi T uzunluklarini bozabilir
      return `self.__next_f.push([1,${JSON.stringify(patched)}])`;
    }
  );
}

function patchHeipHtml(html) {
  if (!html || typeof html !== 'string') return html;
  const blocks = html.split(/(<script\b[\s\S]*?<\/script>)/gi);
  let out = '';
  for (const block of blocks) {
    if (isFlightScriptBlock(block)) out += patchFlightScriptBlock(block);
    else out += patchHeipFlight(block);
  }
  return out;
}

function getVideoRewriteRules() {
  return { ...VIDEO_OVERRIDES };
}

function isHeipMuxImage(pathname) {
  return pathname.startsWith('/api/mux-image/') && pathname.includes(HEIP_MUX);
}

/** Herhangi bir mux-image istegini yerel postere map et */
function resolveLocalMuxPoster(pathname) {
  if (!pathname.startsWith('/api/mux-image/')) return null;
  if (pathname.includes(HEIP_MUX)) return pathJoinVideos('heip-poster.jpg');
  return null; // server fallback thumb kullanir
}

function pathJoinVideos(name) {
  return require('path').join(__dirname, 'videos', name);
}

function getHeipClientPatchJs() {
  const desc = HEIP_DESC.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const descOld = HEIP_DESC_OLD_EN.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const metaOld = HEIP_META_DESC_OLD.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const metaNew = HEIP_META_DESC_NEW.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return (
    "function ph(s){if(!s||typeof s!=='string')return s;" +
    "if(s.indexOf('HEIP')===-1&&s.indexOf('H\\u00e4ndel\\u00f6')===-1&&s.indexOf('heip-vis')===-1)return s;" +
    `s=s.split('${descOld}').join('${desc}');` +
    `s=s.split('${metaOld}').join('${metaNew}');` +
    `s=s.split('\\\\\"title\\\\\":\\\\\"HEIP\\\\\"').join('\\\\\"title\\\\\":\\\\\"Lider Teknik\\\\\"');` +
    `s=s.split('\"title\":\"HEIP\"').join('\"title\":\"Lider Teknik\"');` +
    `s=s.split('\\\\\"name\\\\\":\\\\\"HEIP\\\\\"').join('\\\\\"name\\\\\":\\\\\"Lider Teknik\\\\\"');` +
    `s=s.split('\"name\":\"HEIP\"').join('\"name\":\"Lider Teknik\"');` +
    "s=s.split('HEIP – 3D Visualisation').join('Lider Teknik — Kurumsal Site');" +
    "s=s.split('Visit HEIP website').join('Lider Teknik sitesini ziyaret et');" +
    "s=s.split('https://heip-vis.vercel.app').join('https://www.sakaryaliderklima.com');" +
    "s=s.split('https:\\\\/\\\\/heip-vis.vercel.app').join('https:\\\\/\\\\/www.sakaryaliderklima.com');" +
    `s=s.split('\\\\\"description\\\\\":\\\\\"${descOld}\\\\\"').join('\\\\\"description\\\\\":\\\\\"${desc}\\\\\"');` +
    `s=s.split('\"description\":\"${descOld}\"').join('\"description\":\"${desc}\"');` +
    'return s;}' +
    'function hookNextF(){var a=self.__next_f;if(!a||a.__px)return;var op=a.push.bind(a);a.__px=1;a.push=function(b){if(b&&b[0]===1&&typeof b[1]==="string")b=[b[0],ph(b[1])];return op(b);};}' +
    'var ti=setInterval(function(){if(self.__next_f){clearInterval(ti);hookNextF();}},5);'
  );
}

module.exports = {
  patchVideoLoader,
  patchHeipFilmPlayback,
  patchHeipFlight,
  fixRscFlightLengths,
  patchHeipRsc,
  patchHeipHtml,
  getVideoRewriteRules,
  isHeipMuxImage,
  resolveLocalMuxPoster,
  HEIP_MUX,
  HEIP_VIDEO,
  HEIP_POSTER,
  FALLBACK_POSTER,
  HEIP_DESC,
  VIDEO_OVERRIDES,
  POSTER_OVERRIDES,
  getHeipClientPatchJs,
};

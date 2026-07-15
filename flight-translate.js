/**
 * Flight-guvenli ceviri katmani.
 *
 * Next.js Flight (RSC) govdesi satir bazli akistir:
 *   - `id:Thexlen,<payload>`  → payload TAM hexlen BYTE uzunlugundadir (newline icerebilir)
 *   - diger satirlar          → `id:<json>\n`
 *
 * Metin cevirisi payload uzunlugunu degistirdigi icin T uzunluklari
 * YENIDEN hesaplanmazsa istemci `enqueueModel` hatasi verir.
 * Bu modul govdeyi orijinal uzunluklara gore ayristirir, her satiri
 * ayri ayri cevirir ve T uzunluklarini yeniden yazar.
 */
const { PAIRS } = require('./translations-tr');
const { scrubBrandReferences } = require('./brand-scrub');

const COLON = 0x3a;
const COMMA = 0x2c;
const NEWLINE = 0x0a;
// Bos id gecerli: hint satirlari `:HL[...]` seklindedir
const HEX_RE = /^[0-9a-fA-F]*$/;

function translateText(text) {
  let out = text;
  for (const [from, to] of PAIRS) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  // "Visit TITLE website, opens..." ve yarim kalmis "Visit TITLE sitesini..." kalintilari
  out = out.replace(
    /Visit ([^"<]+?) website, opens in new tab/g,
    '$1 sitesini ziyaret et, yeni sekmede açılır'
  );
  out = out.replace(
    /Visit ([^"<]+?) sitesini ziyaret et, yeni sekmede açılır/g,
    '$1 sitesini ziyaret et, yeni sekmede açılır'
  );
  out = out.split('"lang":"en"').join('"lang":"tr"');
  out = out.split('lang="en"').join('lang="tr"');
  return scrubBrandReferences(out);
}

/**
 * Flight govdesini satir satir gezip her satiri cevirir,
 * T-string uzunluklarini yeni payload'a gore duzeltir.
 */
function translateFlightBody(body) {
  if (!body || typeof body !== 'string') return body;
  const buf = Buffer.from(body, 'utf8');
  const parts = [];
  let i = 0;

  while (i < buf.length) {
    let j = i;
    while (j < buf.length && buf[j] !== COLON && buf[j] !== NEWLINE) j++;
    if (j >= buf.length || buf[j] === NEWLINE) {
      // satir basinda id:tag yok — dokunmadan kopyala
      parts.push(buf.slice(i, j + 1 <= buf.length ? j + 1 : buf.length));
      i = j + 1;
      continue;
    }
    const id = buf.slice(i, j).toString('latin1');
    if (!HEX_RE.test(id)) {
      // beklenmedik format — kalanini oldugu gibi birak (guvenli taraf)
      parts.push(buf.slice(i));
      break;
    }

    if (buf[j + 1] === 0x54 /* 'T' */) {
      let k = j + 2;
      while (k < buf.length && buf[k] !== COMMA) k++;
      const lenHex = buf.slice(j + 2, k).toString('latin1');
      const len = parseInt(lenHex, 16);
      if (!HEX_RE.test(lenHex) || Number.isNaN(len)) {
        parts.push(buf.slice(i));
        break;
      }
      const payload = buf.slice(k + 1, k + 1 + len).toString('utf8');
      const translated = translateText(payload);
      const newLen = Buffer.byteLength(translated, 'utf8').toString(16);
      parts.push(Buffer.from(`${id}:T${newLen},${translated}`, 'utf8'));
      i = k + 1 + len;
    } else {
      let k = j + 1;
      while (k < buf.length && buf[k] !== NEWLINE) k++;
      const line = buf.slice(i, Math.min(k + 1, buf.length)).toString('utf8');
      parts.push(Buffer.from(translateText(line), 'utf8'));
      i = k + 1;
    }
  }

  return Buffer.concat(parts).toString('utf8');
}

const FLIGHT_PUSH_RE = /self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)/g;

/**
 * HTML icindeki tum `self.__next_f.push([1,"..."])` payload'larini toplar,
 * birlesik govdeyi cevirir ve tamamini ILK push'a koyar (kalanlar bos).
 * Push'lar istemci tarafinda ardisik birlestirildigi icin sinirlar serbesttir;
 * boylece satirlar push sinirinda bolunse bile ceviri guvenlidir.
 */
function translateHtmlFlight(html) {
  const payloads = [];
  let m;
  FLIGHT_PUSH_RE.lastIndex = 0;
  while ((m = FLIGHT_PUSH_RE.exec(html))) {
    try {
      const decoded = JSON.parse(m[1]);
      if (typeof decoded !== 'string') return html;
      payloads.push(decoded);
    } catch (_) {
      return html; // decode edilemiyorsa hic dokunma
    }
  }
  if (!payloads.length) return html;

  const translated = translateFlightBody(payloads.join(''));
  let idx = 0;
  FLIGHT_PUSH_RE.lastIndex = 0;
  return html.replace(FLIGHT_PUSH_RE, () => {
    const chunk = idx === 0 ? translated : '';
    idx++;
    return `self.__next_f.push([1,${JSON.stringify(chunk)}])`;
  });
}

/**
 * HTML'in tamamini guvenli cevirir:
 *  - Flight push payload'lari `translateHtmlFlight` ile (T uzunluklari duzeltilir)
 *  - Duz HTML bloklari metin ciftleriyle
 *  - style / ld+json / diger script bloklari OLDUGU GIBI birakilir
 *  - analytics.shader.build scripti kaldirilir
 */
function translateHtmlSafe(html) {
  const flightDone = translateHtmlFlight(html);
  const blocks = flightDone.split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>)/gi);
  let out = '';
  for (const block of blocks) {
    if (/^<style\b/i.test(block)) {
      out += block;
      continue;
    }
    if (/^<script\b/i.test(block)) {
      if (/analytics\.shader\.build/i.test(block)) continue;
      out += block;
      continue;
    }
    out += translateText(block);
  }
  return out;
}

module.exports = { translateFlightBody, translateHtmlFlight, translateHtmlSafe, translateText };

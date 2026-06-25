const { getBrand, getContactEmail, getTagline } = require('./site-config');

function scrubBrandReferences(text, baseUrl = '') {
  if (!text || typeof text !== 'string') return text;

  const brand = getBrand();
  const email = getContactEmail();
  const tagline = getTagline();
  const base = String(baseUrl || '').replace(/\/$/, '');

  let out = text;

  out = out.replace(
    /<script>\(self\.__next_s=self\.__next_s\|\|\[\]\)\.push\(\["https:\/\/analytics\.shader\.build[\s\S]*?<\/script>\s*/gi,
    ''
  );
  out = out.replace(/https?:\/\/analytics\.shader\.build[^\s"']*/gi, '');

  if (base) {
    out = out.replace(/https?:\/\/(?:www\.)?shader\.se/gi, base);
    out = out.replace(/:\/\/(?:www\.)?shader\.se/gi, '://' + base.replace(/^https?:\/\//i, ''));
    out = out.replace(/(?:www\.)?shader\.se/gi, base.replace(/^https?:\/\//i, ''));
  }

  out = out.replace(/\b[a-z]+@shader\.se\b/gi, email);

  out = out.replace(/Shader Development Studio/g, `${brand} — ${tagline}`);
  out = out.replace(/Shader Sweden AB/g, brand);
  out = out.replace(/Shader — Home/g, `${brand} — Ana Sayfa`);
  out = out.replace(/Shader \\u2014 Home/g, `${brand} \\u2014 Ana Sayfa`);
  out = out.replace(/Shader logo, go to home page/g, `${brand} logosu, ana sayfaya git`);
  out = out.replace(/Book a call with Shader/g, 'WhatsApp ile iletişime geçin');
  out = out.replace(/Shader on LinkedIn/g, `${brand} — LinkedIn`);
  out = out.replace(/Shader on Instagram/g, `${brand} — Instagram`);
  out = out.replace(/Shader on X \(Twitter\)/g, `${brand} — X (Twitter)`);
  out = out.replace(/Shader on X/g, `${brand} — X`);
  out = out.replace(/Shader on Facebook/g, `${brand} — Facebook`);
  out = out.replace(/Shader on YouTube/g, `${brand} — YouTube`);
  out = out.replace(/Work: ([^|]+) \| Shader Development Studio/g, `Proje: $1 | ${brand}`);
  out = out.replace(/children:"Shader — Home"/g, `children:"${brand} — Ana Sayfa"`);
  out = out.replace(/"alternateName":\s*\["Shader","Shader Sweden"\]/g, `"alternateName":["${brand}"]`);
  out = out.replace(/"alternateName":\s*\["Shader",\s*"Shader Sweden"\]/g, `"alternateName":["${brand}"]`);
  out = out.replace(/\\"alternateName\\":\[\\"Shader\\",\\"Shader Sweden\\"\]/g, `\\"alternateName\\":[\\"${brand}\\"]`);
  out = out.replace(/shader programming/gi, 'material programming');

  out = out.replace(/https?:\/\/images\.prismic\.io\/shader\/[^"'\\]+/gi, '/pixela-boot-screen.png');
  out = out.replace(/images\.prismic\.io\/shader\//gi, '');
  out = out.replace(/https?:\/\/(?:www\.)?linkedin\.com\/company\/shadersweden\/?/gi, '');
  out = out.replace(/https?:\/\/x\.com\/shadersweden\/?/gi, '');

  out = out.replace(/\bAt Shader\b/g, `${brand} olarak`);
  out = out.replace(/\bShader is\b/g, `${brand}`);
  out = out.replace(/\bShader bridges\b/g, `${brand} köprü kurar`);
  out = out.replace(/\bShader homepage\b/g, `${brand} ana sayfası`);
  out = out.replace(/\bShader,\b/g, `${brand},`);
  out = out.replace(/\bShader /g, `${brand} `);
  out = out.replace(/\bShader\b/g, brand);

  return out;
}

/** JS chunk — yalnizca marka stringleri; Three.js shader API'sine dokunma */
function scrubBrandInJs(text) {
  if (!text || typeof text !== 'string') return text;
  if (!/Shader Development Studio|Shader Sweden|hello@shader\.se|ceo@shader\.se|secretary@shader\.se/i.test(text)) {
    return text;
  }

  const brand = getBrand();
  const email = getContactEmail();
  const tagline = getTagline();

  let out = text;
  out = out.split('Shader Development Studio').join(`${brand} — ${tagline}`);
  out = out.split('Shader Sweden AB').join(brand);
  out = out.split('hello@shader.se').join(email);
  out = out.split('ceo@shader.se').join(email);
  out = out.split('secretary@shader.se').join(email);
  out = out.split('general:"hello@shader.se"').join(`general:"${email}"`);
  return out;
}

function scrubBrandBuffer(body, mode = 'html', baseUrl = '') {
  const text = body.toString('utf8');
  const out = mode === 'js' ? scrubBrandInJs(text) : scrubBrandReferences(text, baseUrl);
  return text === out ? body : Buffer.from(out, 'utf8');
}

module.exports = { scrubBrandReferences, scrubBrandInJs, scrubBrandBuffer };

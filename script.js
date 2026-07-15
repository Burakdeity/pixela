/* PIXELA — logo + 3D klavye rozeti */
(function () {
  const CFG = window.__PIXELA_CONFIG || {};
  const BRAND = CFG.brand?.name || 'PIXELA';
  const DARK = '/pixela-logo-dark.svg';
  const HOVER = '/pixela-logo-hover.svg';
  const GLB_LOGO = '/pixela-logo-glb.svg';
  const LOGO_RE = /\/_next\/static\/media\/logo(_dark)?\.[^"']+\.svg|copyright_footer\.png/i;
  const GLB_RE = /\/models\/(shredder|computer|phones)\.glb/i;
  const LIDER_MUX = 'LbdE02DF9Gx1iVtxU98nv6uOtEEmQkTSs00Uyqb6O0201Tw';
  const liderProject = (CFG.projects || []).find((p) => p.uid === 'lider-teknik') || {};
  const LIDER_VIDEO = liderProject.video || '/videos/heip-lider-teknik.mp4?v=95';
  const LIDER_POSTER = liderProject.poster || '/videos/heip-poster.jpg?v=95';
  const WP_URL =
    CFG.contact?.whatsappUrl ||
    'https://wa.me/905319282677?text=' + encodeURIComponent('Merhaba, PIXELA web sitesinden yazıyorum.');
  const LIDER_SITE = liderProject.url || 'https://www.sakaryaliderklima.com/';
  const LIDER_DESC =
    liderProject.description ||
    'Sakarya ve çevresinde klima montaj, bakım ve VRF çözümleri sunan Lider Teknik için kurumsal web sitesi.';
  const COPY = CFG.copy || {};
  const DOM_TR = [
    ['Visit site', 'Siteyi ziyaret et'],
    ['Selected Work', 'Projelerim'],
    ['About Us', 'Hakkımda'],
    ['Book a call', COPY.ctaButton || 'WhatsApp’tan Yazın'],
    ['Book a Call Today', COPY.ctaHeadline || 'Projenizi Konuşalım'],
    ['Contact', 'İletişim'],
    ['Home', 'Ana Sayfa'],
    ['Visit us', 'Adres'],
    ['Social', 'Sosyal medya'],
    ['New business', 'Yeni projeler'],
    ['Good buy.', 'İyi alışverişler!'],
    ['“Hello”', '“Merhaba”'],
    ['Loading...', 'Yükleniyor...'],
    ['Laxholmstorget 3', 'Sakarya'],
    ['602 21 Sakarya', 'Sakarya'],
    ['602 21 Norrköping', 'Sakarya'],
    ['Norrköping, Sweden', 'Sakarya, Türkiye'],
    ['Norrköping, Türkiye', 'Sakarya, Türkiye'],
    [
      "Still Not Convinced We're Serious About Business?",
      'Hâlâ ikna olmadınız mı?',
    ],
    ["We've got one last trick up our sleeve.", 'Bir sürpriz daha var.'],
    [
      "Had Enough Reading? Let's Shred This Thing.",
      'Yeterince okuduk — projelere geçelim.',
    ],
    ['A High Tech Business Solutions Company', 'Yazılım ve Kurumsal Web'],
    ['Check Out This Golden Tie', 'Şu Altın Kravata Bir Bakın'],
    [
      'You made it this far. You deserve a tie-break.',
      'Buraya kadar geldiniz — kısa bir mola.',
    ],
    ['View project', 'Projeyi görüntüle'],
    ['Back to projects', 'Projelere dön'],
    ['Previous project', 'Önceki proje'],
    ['Next project', 'Sonraki proje'],
  ];

  /** beige-logo dokusunda dikey logo alani (1024 atlas) */
  const BADGE = { x: 88, y: 242, w: 150, h: 440 };
  /** computer.glb commodore-logo dokusunda eski marka satiri */
  const COMMODORE = { x: 0, y: 168, w: 1024, h: 130 };
  const COMMODORE_SCALE = 0.72;

  function rewriteUrl(src) {
    if (!src || typeof src !== 'string') return src;
    if (/cal\.com/i.test(src)) return WP_URL;
    if (/shader\.se/i.test(src)) {
      try {
        const u = new URL(src, location.origin);
        return u.pathname + u.search;
      } catch (_) {
        return '/';
      }
    }
    if (GLB_RE.test(src)) {
      return src.replace(/^https?:\/\/[^/]+/i, '').split('?')[0] + '?_=' + Date.now();
    }
    if (/copyright_footer\.png/i.test(src)) return HOVER + '?v=footer-white';
    if (/\/textures\/boot_screen_mobile\.png/i.test(src)) return '/pixela-boot-screen-mobile.png?v=164';
    if (/\/textures\/boot_screen\.png/i.test(src)) return '/pixela-boot-screen.png?v=164';
    if (!LOGO_RE.test(src)) return src;
    return /logo_dark/i.test(src) ? DARK : HOVER;
  }

  function hookImageSrc() {
    if (window.__pixelaImg) return;
    window.__pixelaImg = true;
    const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (!desc?.set) return;
    const origSet = desc.set;
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      configurable: true,
      get: desc.get,
      set(v) {
        return origSet.call(this, rewriteUrl(String(v)));
      },
    });
    const origAttr = HTMLImageElement.prototype.setAttribute;
    HTMLImageElement.prototype.setAttribute = function (name, value) {
      if (String(name).toLowerCase() === 'src') {
        return origAttr.call(this, name, rewriteUrl(String(value)));
      }
      return origAttr.apply(this, arguments);
    };
  }

  function hookNetwork() {
    if (window.__pixelaNet) return;
    window.__pixelaNet = true;
    hookImageSrc();

    const origFetch = window.fetch;
    if (origFetch) {
      window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : input?.url || '';
        const next = rewriteUrl(url);
        if (next === url) return origFetch.apply(this, arguments);
        // Request header'larini koru (RSC:1 vb.) — kaybolursa enqueueModel olusur
        if (typeof input !== 'string' && typeof Request !== 'undefined' && input instanceof Request) {
          return origFetch.call(this, new Request(next, input), init);
        }
        return origFetch.call(this, next, init);
      };
    }

    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      const args = [method, rewriteUrl(String(url))].concat([].slice.call(arguments, 2));
      return origOpen.apply(this, args);
    };
  }

  function patchContactLinks() {
    document.querySelectorAll('a[href*="cal.com"]').forEach((a) => {
      a.href = WP_URL;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
    const email = CFG.contact?.email || 'info@pixela.com.tr';
    document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
      a.href = 'mailto:' + email;
    });
  }

  function patchLiderLabels() {
    /* Shader orijinal proje isimleri — HEIP rename yok */
  }

  function keepSeoTitle() {
    // Proje sayfalarinda orijinal title'i koru; sadece ana sayfada SEO title zorla
    if (/^\/work\//.test(location.pathname)) {
      if (/\bShader\b/i.test(document.title)) {
        document.title = document.title.replace(/\bShader\b/gi, BRAND);
      }
      return;
    }
    const want = CFG.seo?.title || BRAND + ' — ' + (CFG.brand?.tagline || 'Yazılım & Web');
    if (document.title !== want) document.title = want;
  }

  function hookWindowOpen() {
    if (window.__pixelaOpen) return;
    window.__pixelaOpen = true;
    const orig = window.open;
    window.open = function (url) {
      const args = [].slice.call(arguments);
      if (url && /cal\.com/i.test(String(url))) {
        args[0] = WP_URL;
        if (args.length < 2) args.push('_blank');
        if (args.length < 3) args.push('noopener');
      }
      return orig.apply(this, args);
    };
  }

  function patchLiderLinks() {
    /* Shader orijinal proje linkleri korunur */
  }

  function patchDomTurkish() {
    const root = document.getElementById('scroll-container');
    if (!root) return;

    root.querySelectorAll('h1,h2,h3,h4,p,a,span,button').forEach((el) => {
      if (el.children.length > 0) return;
      const trim = (el.textContent || '').trim();
      if (!trim) return;
      for (const [from, to] of DOM_TR) {
        if (trim === from) {
          el.textContent = to;
          return;
        }
        if (from.length > 30 && trim.includes(from)) {
          el.textContent = trim.split(from).join(to);
          return;
        }
      }
    });

    patchLiderLinks();
    patchContactLinks();
    patchLiderLabels();
  }

  function eachScene(fn) {
    document.querySelectorAll('canvas').forEach((canvas) => {
      if (!canvas) return;
      for (const get of [
        () => canvas.__r3f?.getState?.()?.scene,
        () => canvas.__r3f?.store?.getState?.()?.scene,
        () => canvas.__r3f?.scene,
      ]) {
        try {
          const scene = get();
          if (scene?.traverse) {
            fn(scene);
            break;
          }
        } catch (_) {}
      }
    });
  }

  hookImageSrc();
  hookNetwork();

  function start() {
    hookWindowOpen();
    patchContactLinks();
    patchLiderLabels();
    keepSeoTitle();
    setInterval(keepSeoTitle, 2000);
    [3000, 8000, 15000].forEach((ms) => setTimeout(() => { patchDomTurkish(); patchLiderLabels(); }, ms));
    document.documentElement.lang = 'tr';
    if (!/^\/work\//.test(location.pathname)) {
      document.title = document.title.replace(/\bShader\b/gi, BRAND);
      document.title = document.title.replace(/PIXELA Development Studio/i, BRAND + ' — ' + (CFG.brand?.tagline || 'Yazılım & Web'));
      document.title = document.title.replace(/PIXELA Geliştirme Stüdyosu/i, BRAND + ' — ' + (CFG.brand?.tagline || 'Yazılım & Web'));
      if (CFG.seo?.title) document.title = CFG.seo.title;
    } else {
      document.title = document.title.replace(/\bShader\b/gi, BRAND);
    }

    // Soft-nav hizlandirmak icin proje RSC prefetch
    if (location.pathname === '/' || location.pathname === '') {
      const slugs = (CFG.projects || []).map((p) => p.uid).filter(Boolean).slice(0, 12);
      const fallback = [
        'ehealth-arena',
        'select-concept',
        'gamily',
        'heip',
        'alamance-foods',
        'glasbolaget',
      ];
      (slugs.length ? slugs : fallback).forEach((slug, i) => {
        setTimeout(() => {
          try {
            fetch('/work/' + encodeURIComponent(slug) + '?_rsc=prefetch', {
              headers: { RSC: '1', Accept: 'text/x-component' },
            }).catch(() => {});
          } catch (_) {}
        }, 1500 + i * 200);
      });
    }

    // Proje gecisinde boot atla — router.push('/work/...') history ile yakalanir
    function markWorkSkip(url) {
      try {
        const u = url != null ? String(url) : location.pathname;
        if (/\/work\//.test(u) || /^\/work\//.test(location.pathname)) {
          window.__pixelaSkipBoot = 1;
        }
      } catch (_) {}
      const ov = document.getElementById('pixela-work-loading');
      if (ov && ov.parentNode) ov.remove();
    }
    markWorkSkip();
    if (!window.__pixelaWorkNavScript) {
      window.__pixelaWorkNavScript = 1;
      const _push = history.pushState.bind(history);
      const _replace = history.replaceState.bind(history);
      history.pushState = function (s, t, u) {
        markWorkSkip(u);
        const r = _push(s, t, u);
        setTimeout(() => markWorkSkip(u), 0);
        return r;
      };
      history.replaceState = function (s, t, u) {
        markWorkSkip(u);
        const r = _replace(s, t, u);
        setTimeout(() => markWorkSkip(u), 0);
        return r;
      };
      window.addEventListener('popstate', () => setTimeout(markWorkSkip, 0));
    }

    const imgCache = {};
    function loadImg(path) {
      if (!imgCache[path]) {
        imgCache[path] = new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = path + '?_=' + Date.now();
        });
      }
      return imgCache[path];
    }

    function applyImg(mat, img) {
      if (!mat || !img) return false;
      const ref = mat.map || mat.emissiveMap;
      if (!ref || typeof ref.clone !== 'function') return false;
      try {
        const tex = ref.clone();
        tex.image = img;
        tex.needsUpdate = true;
        if (mat.map) mat.map = tex;
        if (mat.emissiveMap) {
          mat.emissiveMap = tex;
          if (mat.emissive?.setHex) mat.emissive.setHex(0xffffff);
          mat.emissiveIntensity = Math.max(mat.emissiveIntensity || 0, 2);
        }
        mat.needsUpdate = true;
        return true;
      } catch (_) {
        return false;
      }
    }

    function applyTex(mat, canvas) {
      if (!mat || !canvas) return false;
      const ref = mat.map || mat.emissiveMap;
      if (!ref || typeof ref.clone !== 'function') return false;
      try {
        const tex = ref.clone();
        tex.image = canvas;
        tex.needsUpdate = true;
        if (mat.map) mat.map = tex;
        if (mat.emissiveMap) {
          mat.emissiveMap = tex;
          if (mat.emissive?.setHex) mat.emissive.setHex(0xffffff);
          mat.emissiveIntensity = Math.max(mat.emissiveIntensity || 0, 2);
        }
        mat.needsUpdate = true;
        return true;
      } catch (_) {
        return false;
      }
    }

    async function makeSplashCanvas(logo) {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 290;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (logo) {
        const h = Math.round((41 / 306) * canvas.width);
        const y = Math.round((canvas.height - h) / 2);
        ctx.drawImage(logo, 0, y, canvas.width, h);
      } else {
        ctx.fillStyle = '#fcf9f3';
        ctx.font = '700 120px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(BRAND, canvas.width / 2, canvas.height / 2);
      }
      return canvas;
    }

    async function patchBeigeCanvas(source, logo) {
      const canvas = document.createElement('canvas');
      canvas.width = source.width || 1024;
      canvas.height = source.height || 1024;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      ctx.fillRect(BADGE.x, BADGE.y, BADGE.w, BADGE.h);
      ctx.save();
      ctx.translate(BADGE.x + BADGE.w / 2, BADGE.y + BADGE.h / 2);
      ctx.rotate(Math.PI / 2);
      const lw = BADGE.h * 0.92;
      const lh = Math.round(lw * (54 / 420));
      ctx.drawImage(logo, -lw / 2, -lh / 2, lw, lh);
      ctx.restore();
      return canvas;
    }

    async function patchCommodoreCanvas(source, logo) {
      const canvas = document.createElement('canvas');
      canvas.width = source.width || 1024;
      canvas.height = source.height || 415;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      ctx.fillRect(COMMODORE.x, COMMODORE.y, COMMODORE.w, COMMODORE.h);
      const lw = Math.round(COMMODORE.w * COMMODORE_SCALE);
      const lh = Math.round(lw * (41 / 306));
      const ly = COMMODORE.y + Math.round((COMMODORE.h - lh) / 2);
      ctx.drawImage(logo, COMMODORE.x, ly, lw, lh);
      return canvas;
    }

    function isBrandMat(mat, obj) {
      const objName = String(obj?.name || '').toLowerCase();
      if (/phone-\d+-logo/.test(objName)) return 'shader-logo';

      const name = String(mat.name || '').toLowerCase();
      if (name === 'shader-logo' || name === 'beige-logo' || name === 'commodore-logo' || name === 'pixela-logo') {
        return name === 'pixela-logo' ? 'shader-logo' : name;
      }
      // phones.glb bazen isim vermeden shader-logo dokusunu tutuyor
      const src = String(mat.map?.image?.src || mat.emissiveMap?.image?.src || '');
      if (/shader-logo|shader_logo|pixela-logo|phones\.glb/i.test(src)) return 'shader-logo';
      return null;
    }

    async function swapModelLogos() {
      const logo = await loadImg(GLB_LOGO);

      eachScene((scene) => {
        scene.traverse((obj) => {
          const mats = [].concat(obj.material || []).filter(Boolean);
          for (const mat of mats) {
            if (mat.userData?.__pixelaModel) continue;
            const kind = isBrandMat(mat, obj);
            if (!kind) continue;

            const img = mat.map?.image || mat.emissiveMap?.image;

            if (kind === 'commodore-logo') {
              if (!img || !logo) continue;
              patchCommodoreCanvas(img, logo).then((canvas) => {
                if (applyTex(mat, canvas)) mat.userData.__pixelaModel = true;
              });
            } else if (kind === 'shader-logo') {
              // Telefon / splash: logo yoksa PIXELA yazisi ciz
              makeSplashCanvas(logo || null).then((canvas) => {
                if (applyTex(mat, canvas)) mat.userData.__pixelaModel = true;
              });
            } else {
              if (!img || !logo) continue;
              patchBeigeCanvas(img, logo).then((canvas) => {
                if (applyTex(mat, canvas)) mat.userData.__pixelaModel = true;
              });
            }
          }
        });
      });
    }

    async function swapNavLogos() {
      const dark = await loadImg(DARK);
      const hover = await loadImg(HOVER);
      if (!dark && !hover) return;

      eachScene((scene) => {
        scene.traverse((obj) => {
          const mats = [].concat(obj.material || []).filter(Boolean);
          for (const mat of mats) {
            if (mat.userData?.__pixelaNav) continue;
            const name = (mat.name || '').toLowerCase();
            if (name === 'shader-logo' || name === 'beige-logo' || name === 'commodore-logo') continue;

            const img = mat.map?.image || mat.emissiveMap?.image;
            if (!img) continue;
            const w = img.naturalWidth || img.width || 0;
            const h = img.naturalHeight || img.height || 0;
            const src = img.src || '';
            if (/copyright_footer/i.test(src) || LOGO_RE.test(src) || w === 306 || w === 1285) {
              // Footer koyu zeminde: beyaz logo; nav dark/hover ayrimi
              const pick = /copyright_footer/i.test(src)
                ? hover
                : /logo_dark/i.test(src) || w === 306 || h === 41
                  ? dark
                  : hover;
              if (applyImg(mat, pick || hover || dark)) mat.userData.__pixelaNav = true;
            }
          }
        });
      });
    }

    /** Bilgisayar ekran/reel isiklari — emissive guclendir */
    function boostComputerLights() {
      eachScene((scene) => {
        scene.traverse((obj) => {
          const mats = [].concat(obj.material || []).filter(Boolean);
          for (const mat of mats) {
            if (mat.userData?.__pixelaBright) continue;
            const name = String(mat.name || '').toLowerCase();
            const hasVideo =
              !!(mat.map && (mat.map.isVideoTexture || mat.map.source?.data?.tagName === 'VIDEO')) ||
              !!(mat.emissiveMap && (mat.emissiveMap.isVideoTexture || mat.emissiveMap.source?.data?.tagName === 'VIDEO'));
            const isComputer =
              /commodore|computer|screen|reel|monitor|display/i.test(name) ||
              /commodore|computer/i.test(String(obj.name || '')) ||
              hasVideo;
            if (!isComputer) continue;
            try {
              if (mat.emissive?.setHex) mat.emissive.setHex(0xffffff);
              mat.emissiveIntensity = Math.max(mat.emissiveIntensity || 0, hasVideo ? 2.8 : 2.2);
              if (typeof mat.toneMapped === 'boolean') mat.toneMapped = false;
              mat.needsUpdate = true;
              mat.userData.__pixelaBright = true;
            } catch (_) {}
          }
        });
      });
    }

    swapNavLogos();
    swapModelLogos();
    boostComputerLights();
    [400, 800, 1500, 2500, 4000, 7000, 12000, 20000].forEach((ms) => {
      setTimeout(swapNavLogos, ms);
      setTimeout(swapModelLogos, ms);
      setTimeout(boostComputerLights, ms);
    });
    // Iletisim bolumundeki telefonlar gec yuklenebilir
    let ticks = 0;
    const logoTimer = setInterval(() => {
      swapModelLogos();
      boostComputerLights();
      ticks++;
      if (ticks > 45) clearInterval(logoTimer);
    }, 2000);
    window.addEventListener('scroll', () => {
      swapModelLogos();
      boostComputerLights();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

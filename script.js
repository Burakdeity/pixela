/* PIXELA — logo + 3D klavye rozeti */
(function () {
  const CFG = window.__PIXELA_CONFIG || {};
  const BRAND = CFG.brand?.name || 'PIXELA';
  const DARK = '/pixela-logo-dark.svg';
  const HOVER = '/pixela-logo-hover.svg';
  const GLB_LOGO = '/pixela-logo-glb.svg';
  const LOGO_RE = /\/_next\/static\/media\/logo(_dark)?\.[^"']+\.svg|copyright_footer\.png/i;
  const GLB_RE = /\/models\/(shredder|computer)\.glb/i;
  const REMOTE_GLB = /https?:\/\/(?:www\.)?shader\.se\/models\/(shredder|computer)\.glb/i;
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
    ['HEIP', 'Lider Teknik'],
    ['3D Visualisation', 'Kurumsal Site'],
    ['Visit site', 'Siteyi ziyaret et'],
    ['Selected Work', 'Projelerim'],
    ['About Us', 'Hakkımda'],
    ['Book a call', COPY.ctaButton || 'İletişime Geçin'],
    ['Book a Call Today', COPY.ctaHeadline || 'Proje Teklifi Alın'],
    ['Contact', 'İletişim'],
    ['Home', 'Ana Sayfa'],
    ['Visit us', 'Adres'],
    ['Social', 'Sosyal medya'],
    ['New business', 'Yeni projeler'],
    ['Good buy.', 'İyi alışverişler!'],
    [
      "Still Not Convinced We're Serious About Business?",
      'Hâlâ işimize ciddiyetle yaklaştığımıza inanmıyor musunuz?',
    ],
    ["We've got one last trick up our sleeve.", 'Cebimizde son bir sürpriz daha var.'],
    [
      "Had Enough Reading? Let's Shred This Thing.",
      'Okumaktan sıkıldınız mı? Projelere geçelim.',
    ],
    ['A High Tech Business Solutions Company', 'Yazılım ve Kurumsal Web Çözümleri'],
    ['Check Out This Golden Tie', 'Şu Altın Kravata Bir Bakın'],
    [
      'You made it this far. You deserve a tie-break.',
      'Buraya kadar geldiniz — kravat molası hak ettiniz.',
    ],
    ['View project', 'Projeyi görüntüle'],
    ['Back to projects', 'Projelere dön'],
    ['Previous project', 'Önceki proje'],
    ['Next project', 'Sonraki proje'],
    [
      'This visualization was created for Händelö Eco-Industrial Park and shows how different factories and units exchange by-products, reducing waste and maximizing overall efficiency.',
      LIDER_DESC,
    ],
  ];

  /** beige-logo dokusunda dikey SHADER alani (1024 atlas) */
  const BADGE = { x: 88, y: 242, w: 150, h: 440 };
  /** computer.glb commodore-logo dokusunda SHADER satiri */
  const COMMODORE = { x: 0, y: 168, w: 1024, h: 130 };
  const COMMODORE_SCALE = 0.72;

  function rewriteUrl(src) {
    if (!src || typeof src !== 'string') return src;
    if (/heip-vis\.vercel\.app/i.test(src)) return LIDER_SITE;
    if (/cal\.com/i.test(src)) return WP_URL;
    if (src.includes(LIDER_MUX)) {
      if (/stream\.mux\.com/i.test(src)) return LIDER_VIDEO;
      if (/\/api\/mux-image\//i.test(src)) return LIDER_POSTER;
      return LIDER_VIDEO;
    }
    if (REMOTE_GLB.test(src) || GLB_RE.test(src)) {
      return src.replace(/https?:\/\/(?:www\.)?shader\.se/i, '').split('?')[0] + '?_=' + Date.now();
    }
    if (/copyright_footer\.png/i.test(src)) return DARK;
    if (/\/textures\/boot_screen_mobile\.png/i.test(src)) return '/pixela-boot-screen-mobile.png';
    if (/\/textures\/boot_screen\.png/i.test(src)) return '/pixela-boot-screen.png';
    if (!LOGO_RE.test(src)) return src;
    return /logo_dark/i.test(src) ? DARK : HOVER;
  }

  function hookNetwork() {
    if (window.__pixelaNet) return;
    window.__pixelaNet = true;

    const origFetch = window.fetch;
    if (origFetch) {
      window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : input?.url || '';
        const next = rewriteUrl(url);
        if (next !== url) {
          return origFetch.call(this, next, init);
        }
        return origFetch.apply(this, arguments);
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
    document.querySelectorAll('button[aria-label], a[aria-label]').forEach((el) => {
      const label = el.getAttribute('aria-label') || '';
      if (label.includes('HEIP')) {
        el.setAttribute(
          'aria-label',
          label.replace(/HEIP/g, 'Lider Teknik').replace(/3D Visualisation/gi, 'Kurumsal Site')
        );
      }
    });
  }

  function keepSeoTitle() {
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
    document.querySelectorAll('a[href*="heip-vis"]').forEach((a) => {
      a.href = LIDER_SITE;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
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

  function start() {
    hookNetwork();
    hookWindowOpen();
    patchContactLinks();
    patchLiderLabels();
    keepSeoTitle();
    setInterval(keepSeoTitle, 2000);
    [3000, 8000, 15000].forEach((ms) => setTimeout(() => { patchDomTurkish(); patchLiderLabels(); }, ms));
    document.documentElement.lang = 'tr';
    document.title = document.title.replace(/Shader Development Studio/i, BRAND + ' — ' + (CFG.brand?.tagline || 'Yazılım & Web'));
    document.title = document.title.replace(/PIXELA Development Studio/i, BRAND + ' — ' + (CFG.brand?.tagline || 'Yazılım & Web'));
    document.title = document.title.replace(/PIXELA Geliştirme Stüdyosu/i, BRAND + ' — ' + (CFG.brand?.tagline || 'Yazılım & Web'));
    if (CFG.seo?.title) document.title = CFG.seo.title;

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
      const h = Math.round((41 / 306) * canvas.width);
      const y = Math.round((canvas.height - h) / 2);
      ctx.drawImage(logo, 0, y, canvas.width, h);
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

    async function swapModelLogos() {
      const logo = await loadImg(GLB_LOGO);
      if (!logo) return;

      eachScene((scene) => {
        scene.traverse((obj) => {
          const mats = [].concat(obj.material || []).filter(Boolean);
          for (const mat of mats) {
            const name = (mat.name || '').toLowerCase();
            if (
              name !== 'shader-logo' &&
              name !== 'beige-logo' &&
              name !== 'commodore-logo'
            )
              continue;
            if (mat.userData?.__pixelaModel) continue;

            const img = mat.map?.image || mat.emissiveMap?.image;
            if (!img) continue;

            if (name === 'commodore-logo') {
              patchCommodoreCanvas(img, logo).then((canvas) => {
                if (applyTex(mat, canvas)) mat.userData.__pixelaModel = true;
              });
            } else if (name === 'shader-logo') {
              makeSplashCanvas(logo).then((canvas) => {
                if (applyTex(mat, canvas)) mat.userData.__pixelaModel = true;
              });
            } else {
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
              const pick =
                /copyright_footer|logo_dark/i.test(src) || w === 306 || h === 41 ? dark : hover;
              if (applyImg(mat, pick || dark)) mat.userData.__pixelaNav = true;
            }
          }
        });
      });
    }

    swapNavLogos();
    swapModelLogos();
    [400, 800, 1500, 2500, 4000, 7000, 12000].forEach((ms) => {
      setTimeout(swapNavLogos, ms);
      setTimeout(swapModelLogos, ms);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

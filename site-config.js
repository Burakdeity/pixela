const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'site-config.json');
const LEGACY_PROJECTS = path.join(__dirname, 'pixela-projects.json');

let cached = null;

function loadSiteConfig() {
  if (cached) return cached;
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error('site-config.json bulunamadi');
  }
  cached = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  if (!cached.projects?.length && fs.existsSync(LEGACY_PROJECTS)) {
    try {
      cached.projects = JSON.parse(fs.readFileSync(LEGACY_PROJECTS, 'utf8'));
    } catch (_) {}
  }
  return cached;
}

function reloadSiteConfig() {
  cached = null;
  return loadSiteConfig();
}

function getBrand() {
  return loadSiteConfig().brand?.name || 'PIXELA';
}

function getTagline() {
  return loadSiteConfig().brand?.tagline || 'Yazılım & Web';
}

function getWpUrl() {
  const c = loadSiteConfig().contact || {};
  const phone = c.whatsapp || '';
  const msg = c.whatsappMessage || 'Merhaba, PIXELA web sitesinden yazıyorum.';
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function getContactEmail() {
  return loadSiteConfig().contact?.email || 'info@pixela.com.tr';
}

function getProjects() {
  const list = loadSiteConfig().projects;
  if (!Array.isArray(list)) return null;
  return list.filter((p) => p && p.title && p.url);
}

function getSeoTitle() {
  const cfg = loadSiteConfig();
  return cfg.seo?.title || `${getBrand()} — ${getTagline()}`;
}

function getPublicConfig() {
  const cfg = loadSiteConfig();
  return {
    brand: cfg.brand,
    contact: {
      ...cfg.contact,
      whatsappUrl: getWpUrl(),
    },
    social: cfg.social,
    seo: cfg.seo,
    copy: cfg.copy,
    projects: cfg.projects,
  };
}

module.exports = {
  loadSiteConfig,
  reloadSiteConfig,
  getBrand,
  getTagline,
  getWpUrl,
  getContactEmail,
  getProjects,
  getSeoTitle,
  getPublicConfig,
};

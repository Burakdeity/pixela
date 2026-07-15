const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = "C:/Users/User/Desktop/pixela";
const WORK_DIR = path.join(ROOT, "static", "work");
const RSC_DIR = path.join(ROOT, "rsc", "work");
const STATIC_RSC = path.join(ROOT, "static", "rsc", "work");

const projects = JSON.parse(
  fs.readFileSync(path.join(ROOT, "pixela-projects.json"), "utf8"),
);
// Prefer route UIDs from original shader list
const uids = [
  "ehealth-arena",
  "select-concept",
  "gamily",
  "alamance-foods",
  "son",
  "glasbolaget",
  "spp-dream-generator",
  "ica-nissen",
  "norrkopings-hamn",
  "heip",
  "design-is-funny",
];

function fetchText(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 PIXELA-restore",
          Accept: "text/html,*/*",
          ...headers,
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchText(res.headers.location, headers).then(resolve, reject);
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
  });
}

function hasFlightScrub(html) {
  const blocks = html.split(/(<script\b[\s\S]*?<\/script>)/gi);
  for (const block of blocks) {
    if (!/self\.__next_f\.push/.test(block)) continue;
    if (/PIXELA|Yazılım/.test(block)) return true;
  }
  return false;
}

(async () => {
  fs.mkdirSync(WORK_DIR, { recursive: true });
  fs.mkdirSync(STATIC_RSC, { recursive: true });

  for (const uid of uids) {
    const htmlPath = path.join(WORK_DIR, `${uid}.html`);
    const existing = fs.existsSync(htmlPath)
      ? fs.readFileSync(htmlPath, "utf8")
      : "";
    const scrubbed = existing && hasFlightScrub(existing);
    console.log(uid, scrubbed ? "SCRUBBED — restoring" : "checking remote");

    const page = await fetchText(`https://www.shader.se/work/${uid}`);
    if (page.status !== 200 || !page.body.includes("__next_f")) {
      console.log("  HTML FAIL", page.status);
      continue;
    }
    if (hasFlightScrub(page.body)) {
      console.log("  remote unexpectedly scrubbed?");
    }
    fs.writeFileSync(htmlPath, page.body);
    console.log("  wrote HTML", page.body.length);

    const rsc = await fetchText(`https://www.shader.se/work/${uid}`, {
      RSC: "1",
      Accept: "text/x-component",
    });
    if (rsc.status === 200 && rsc.body.includes("react.fragment")) {
      const clean = rsc.body.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      fs.writeFileSync(path.join(STATIC_RSC, `${uid}.txt`), clean);
      console.log("  wrote RSC", clean.length);
    } else {
      console.log("  RSC FAIL", rsc.status);
    }
  }
  console.log("done");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

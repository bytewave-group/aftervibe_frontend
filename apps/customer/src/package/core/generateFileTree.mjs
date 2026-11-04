import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = __dirname;

function findRootDir(dir) {
  let currentDir = dir;
  try {
    while (currentDir !== path.parse(currentDir).root) {
      if (fs.existsSync(path.join(currentDir, ".gitignore"))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
  } catch (error) {
    throw new Error("Cannot find project root");
  }
  throw new Error("Cannot find project root");
}

const rootDir = findRootDir(__dirname);
console.log("Project root:", rootDir);

const IGNORE_DIRS = new Set([
  "node_modules",
  "public",
  "assets",
  "assets-src",
  "package",
  "android",
  "ios",
  "dist",
  "build",
  "certs",
  "css",
  "fonts",
  "patches",
  "scripts",
]);

const IGNORE_FILES = new Set([
  "knip.json",
  "getRoutesAllPath.cjs",
  "generate_config.mjs",
  "generate-sitemap.cjs",
  "generate-info-before-build.cjs",
  "check-latest-deps.cjs",
  "check-translations.js",
  "prerender.mjs",
  "translate.mjs",
  "package-lock.json",
  "framework7.json",
  "wrangler.jsonc",
  ".md",
  "index.html",
  "index.js",
  "app.js",
  "store.js",
  "capacitor-capgo-init.js",
  "!note add-prerender.txt",
]);

const IGNORE_PATTERNS = [
  /^knip\.json$/i,
  /^getRoutesAllPath\.cjs$/i,
  /\.md$/i,
  /\.config\./i,
];

function isIgnored(name) {
  return IGNORE_PATTERNS.some((p) => p.test(name));
}

function scanDirFlat(dir, map = {}) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.warn("Cannot read directory:", dir, err.message);
    return map;
  }
  const result = {};
  for (const entry of entries) {
    const entryName = entry.name;
    if (
      entryName.startsWith(".") ||
      IGNORE_DIRS.has(entryName) ||
      isIgnored(entryName)
    )
      continue;

    const fullPath = path.join(dir, entryName);

    let stats;
    try {
      stats = fs.statSync(fullPath);
    } catch (err) {
      console.warn("Cannot access file:", fullPath, err.message);
      continue;
    }

    if (stats.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      scanDirFlat(fullPath, map);
    } else {
      const ext = path.extname(entryName).toLowerCase();

      if (
        IGNORE_FILES.has(entryName.toLowerCase()) ||
        IGNORE_FILES.has(ext) ||
        /\.config\./i.test(entryName)
      ) {
        continue;
      }

      if (map[entryName]) {
        console.warn("Duplicate file name:", entryName, "=>", fullPath);
      }

      const relativePath = path
        .relative(BASE_DIR, fullPath)
        .replace(/\\/g, "/");

      map[entryName] = relativePath;
    }
  }

  return map;
}

const flatMap = scanDirFlat(rootDir);

fs.writeFileSync(
  path.join(__dirname, "relativeStructureMap.json"),
  JSON.stringify(flatMap, null, 2),
);

import fs from "fs";
import { parse, modify, applyEdits } from "jsonc-parser";

const readJSON = (path) => {
  try {
    return JSON.parse(fs.readFileSync(path, "utf-8"));
  } catch (err) {
    console.error(`Failed  toread ${path}: ${err.message}`);
    return null;
  }
};

const config = readJSON("appconfig.json");
const capacitorConfig = readJSON("capacitor.config.json");
const packageJson = readJSON("package.json");

let wranglerRaw = "";

try {
  wranglerRaw = fs.readFileSync("wrangler.jsonc", "utf-8");
} catch (error) {
  console.error("wrangler.jsonc not found, skipping...");
}

let edits = [];

if (typeof wranglerRaw === "string" && wranglerRaw?.trim()?.length > 0) {
  edits = modify(
    wranglerRaw,
    ["name"],
    !!config.appName ? String(config.appName).toLowerCase() : config.appName,
    {
      formattingOptions: {
        insertSpaces: true,
        tabSize: 2,
      },
      isArrayInsertion: false,
    },
  );
}

//? --- Generate manifest.json ---
if (config) {
  const manifest = {
    name: config.appName,
    short_name: config.appName,
    description: config.description,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    icons: [
      {
        src: "/assets/icons/icon-48.webp",
        type: "image/webp",
        sizes: "48x48",
        purpose: "any maskable",
      },
      {
        src: "/assets/icons/icon-72.webp",
        type: "image/webp",
        sizes: "72x72",
        purpose: "any maskable",
      },
      {
        src: "/assets/icons/icon-96.webp",
        type: "image/webp",
        sizes: "96x96",
        purpose: "any maskable",
      },
      {
        src: "/assets/icons/icon-128.webp",
        type: "image/webp",
        sizes: "128x128",
        purpose: "any maskable",
      },
      {
        src: "/assets/icons/icon-192.webp",
        type: "image/webp",
        sizes: "192x192",
        purpose: "any maskable",
      },
      {
        src: "/assets/icons/icon-256.webp",
        type: "image/webp",
        sizes: "256x256",
        purpose: "any maskable",
      },
      {
        src: "/assets/icons/icon-512.webp",
        type: "image/webp",
        sizes: "512x512",
        purpose: "any maskable",
      },
    ],
  };
  fs.writeFileSync(
    "public/manifest.webmanifest",
    JSON.stringify(manifest, null, 2),
  );
  console.log("✅ manifest.webmanifest updated");
}

//? --- Update capacitor.config.json ---
if (!!capacitorConfig && config?.appId && config?.appName) {
  const newCapacitorConfig = {
    ...capacitorConfig,
    appId: config.appId,
    appName: config.appName,
    webDir: "dist",
  };

  fs.writeFileSync(
    "capacitor.config.json",
    JSON.stringify(newCapacitorConfig, null, 2),
  );
  console.log("✅ capacitor.config.json updated");
}

//? --- Update package.json ---
if (config?.appName && config?.appName && config?.description) {
  const newPackageJson = {
    ...packageJson,
    name: !!config.appName
      ? String(config.appName).toLowerCase()
      : config.appName,
    description: "Online betting and gaming platform",
  };

  fs.writeFileSync("package.json", JSON.stringify(newPackageJson, null, 2));
  console.log("✅ package.json updated");
}

//? --- Update wrangler.jsonc ---
if (edits.length > 0) {
  const updatedWrangler = applyEdits(wranglerRaw, edits);

  fs.writeFileSync("wrangler.jsonc", updatedWrangler);
  console.log("✅ wrangler.jsonc updated");
}

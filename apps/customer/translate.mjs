import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { translate as googleTranslate } from "@vitalets/google-translate-api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 載入原始翻譯檔
const sourcePath = path.join(__dirname, "src/lng", "cn.json");
const input = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

// 輸出目標語言檔案
const targetLang = process.argv[2] || "hi";
const targetPath = path.join(__dirname, `${targetLang}.json`);
let existingOutput = {};

if (fs.existsSync(targetPath)) {
  existingOutput = JSON.parse(fs.readFileSync(targetPath, "utf8"));
}

const entries = Object.entries(input);
const output = { ...existingOutput };

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

let successCount = 0;
let failCount = 0;

const translateOne = async (key, value, index) => {
  if (output[key]) {
    console.log(`[${index + 1}/${entries.length}] ⏩ Skip: ${value}`);
    return;
  }

  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const res = await googleTranslate(value, {
        from: "zh-CN",
        to: targetLang,
      });
      output[key] = res.text;
      successCount++;
      console.log(`[${index + 1}/${entries.length}] ✔️ ${value} → ${res.text}`);
      return;
    } catch (e) {
      attempt++;
      const is429 =
        e.message.includes("429") || e.message.includes("Too Many Requests");
      console.warn(
        `[${index + 1}] ⚠️ Retry ${attempt}/${maxRetries} for "${value}" - ${
          e.message
        }`
      );

      if (!is429) break;

      const retryDelay = 3000 + Math.random() * 2000; // 隨機化 delay 範圍
      await delay(retryDelay);
    }
  }

  output[key] = "";
  failCount++;
  console.error(
    `[${
      index + 1
    }] ❌ Failed to translate "${value}" after ${maxRetries} attempts`
  );
};

const run = async () => {
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    await translateOne(key, value, i);

    // 每 50 筆自動儲存進度
    if (i % 50 === 0) {
      fs.writeFileSync(targetPath, JSON.stringify(output, null, 2), "utf8");
    }
  }

  fs.writeFileSync(targetPath, JSON.stringify(output, null, 2), "utf8");
  console.log(
    `✅ Done. ${successCount} translated, ${failCount} failed. Output saved to ${targetLang}.json`
  );
};

run();

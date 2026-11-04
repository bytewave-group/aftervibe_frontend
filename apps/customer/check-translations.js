import fs from "fs/promises";
import path from "path";

const file1 = "cn.json"; // 第一个语言文件
const file2 = "bm.json"; // 第二个语言文件

function isValidKey(key) {
  if (!key || key.trim() === "") return false;
  if (key.includes("====")) return false;
  return true;
}

async function checkTranslations() {
  const baseDir = path.resolve("./src/lng");
  const file1Path = path.join(baseDir, file1);
  const file2Path = path.join(baseDir, file2);

  try {
    const file1Content = await fs.readFile(file1Path, "utf-8");
    const file2Content = await fs.readFile(file2Path, "utf-8");

    const data1 = JSON.parse(file1Content);
    const data2 = JSON.parse(file2Content);

    const keys1 = Object.keys(data1).filter(isValidKey);
    const keys2 = Object.keys(data2).filter(isValidKey);

    const missingIn2 = keys1.filter((key) => !(key in data2));
    const missingIn1 = keys2.filter((key) => !(key in data1));

    if (missingIn2.length === 0 && missingIn1.length === 0) {
      console.log("✅ 两个文件的翻译键完全匹配");
      return;
    }

    if (missingIn2.length > 0) {
      console.warn(`❌ 下列键在 ${file1} 中存在，但在 ${file2} 中缺失:`);
      missingIn2.forEach((key) => console.warn(`- ${key}`));
      console.log("\n📋 复制以下片段补到", file2);
      const patch = Object.fromEntries(missingIn2.map((k) => [k, data1[k]]));
      console.log(JSON.stringify(patch, null, 2));
      console.log("--------------------------------------------------------");
    }

    if (missingIn1.length > 0) {
      console.warn(`❌ 下列键在 ${file2} 中存在，但在 ${file1} 中缺失:`);
      missingIn1.forEach((key) => console.warn(`- ${key}`));
      console.log("\n📋 复制以下片段补到", file1);
      const patch = Object.fromEntries(missingIn1.map((k) => [k, data2[k]]));
      console.log(JSON.stringify(patch, null, 2));
      console.log("--------------------------------------------------------");
    }
  } catch (error) {
    console.error("❌ 读取文件或解析 JSON 出错:", error);
  }
}

checkTranslations();

'use strict';

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { resolve } = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rootDir = resolve(__dirname, '..');
const versionFilePath = resolve(rootDir, 'android/version.properties');
const DEFAULT_VERSION = { name: '1.0', code: 1 };

function bumpVersionName(name) {
  const parts = String(name).split('.');
  const last = parts[parts.length - 1];
  if (/^\d+$/.test(last)) {
    parts[parts.length - 1] = String(Number(last) + 1);
    return parts.join('.');
  }
  return `${name}.1`;
}

function readAndroidVersion() {
  if (!existsSync(versionFilePath)) {
    return { ...DEFAULT_VERSION };
  }

  const content = readFileSync(versionFilePath, 'utf8');
  const codeMatch = content.match(/^\s*VERSION_CODE\s*=\s*(\d+)\s*$/m);
  const nameMatch = content.match(/^\s*VERSION_NAME\s*=\s*([^\s#]+)\s*$/m);
  return {
    code: codeMatch ? parseInt(codeMatch[1], 10) : DEFAULT_VERSION.code,
    name: nameMatch ? nameMatch[1].trim() : DEFAULT_VERSION.name,
  };
}

function writeAndroidVersion(code, name) {
  writeFileSync(versionFilePath, `VERSION_CODE=${code}\nVERSION_NAME=${name}\n`, 'utf8');
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolveAnswer) => {
    rl.question(query, (answer) => {
      rl.close();
      resolveAnswer(String(answer).trim().toLowerCase());
    });
  });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const current = readAndroidVersion();
  const next = {
    name: bumpVersionName(current.name),
    code: current.code + 1,
  };

  console.log(`\n当前 Android 版本: ${current.name} (versionCode ${current.code})`);
  console.log(`下一个 Android 版本: ${next.name} (versionCode ${next.code})`);
  console.log(`版本来源: ${versionFilePath}`);

  if (dryRun) {
    console.log('\n[--dry-run] 不会改文件，也不会执行 build / sync / open。');
    return;
  }

  const shouldUpgrade = await askQuestion(`\n是否升级到 ${next.name}? (y/n): `);
  if (shouldUpgrade === 'y' || shouldUpgrade === 'yes') {
    console.log(`\n正在把 Android 版本更新到 ${next.name} (versionCode ${next.code})...`);
    writeAndroidVersion(next.code, next.name);
    console.log('Android 版本号更新完成！\n');
  } else {
    console.log(`保持当前 Android 版本 ${current.name} (versionCode ${current.code})，继续建置...\n`);
  }

  console.log('开始建置 web...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

  console.log('同步 Capacitor (Android)...');
  execSync('npx cap sync android', { cwd: rootDir, stdio: 'inherit' });

  console.log('开启 Android Studio...');
  execSync('npx cap open android', { cwd: rootDir, stdio: 'inherit' });

  console.log('\n完成！请在 Android Studio 中打包 APK 或 AAB。');
}

main().catch((error) => {
  console.error('发生错误:', error.message);
  process.exit(1);
});

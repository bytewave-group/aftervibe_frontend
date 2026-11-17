'use strict';

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { resolve } = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rootDir = resolve(__dirname, '..');
const pbxPath = resolve(rootDir, 'ios/App/App.xcodeproj/project.pbxproj');
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

function readIosVersion() {
  if (!existsSync(pbxPath)) {
    throw new Error('ios/App/App.xcodeproj/project.pbxproj 不存在。请先运行: npx cap add ios');
  }

  const content = readFileSync(pbxPath, 'utf8');
  const nameMatch = content.match(/MARKETING_VERSION\s*=\s*([^;]+);/);
  const codeMatch = content.match(/CURRENT_PROJECT_VERSION\s*=\s*([^;]+);/);
  return {
    name: nameMatch ? nameMatch[1].trim() : DEFAULT_VERSION.name,
    code: codeMatch ? parseInt(String(codeMatch[1].trim()), 10) || DEFAULT_VERSION.code : DEFAULT_VERSION.code,
  };
}

function writeIosVersion(code, name) {
  if (!existsSync(pbxPath)) {
    throw new Error('ios/App/App.xcodeproj/project.pbxproj 不存在。请先运行: npx cap add ios');
  }

  let content = readFileSync(pbxPath, 'utf8');
  const marketingMatches = content.match(/MARKETING_VERSION\s*=\s*[^;]+;/g) || [];
  const buildMatches = content.match(/CURRENT_PROJECT_VERSION\s*=\s*[^;]+;/g) || [];
  if (marketingMatches.length === 0 || buildMatches.length === 0) {
    throw new Error('project.pbxproj 里找不到 MARKETING_VERSION 或 CURRENT_PROJECT_VERSION。');
  }

  content = content.replace(/MARKETING_VERSION\s*=\s*[^;]+;/g, `MARKETING_VERSION = ${name};`);
  content = content.replace(/CURRENT_PROJECT_VERSION\s*=\s*[^;]+;/g, `CURRENT_PROJECT_VERSION = ${code};`);
  writeFileSync(pbxPath, content, 'utf8');
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

  if (!existsSync(resolve(rootDir, 'ios'))) {
    throw new Error('ios/ 项目不存在。请先安装 @capacitor/ios，再运行: npx cap add ios');
  }

  const current = readIosVersion();
  const next = {
    name: bumpVersionName(current.name),
    code: current.code + 1,
  };

  console.log(`\n当前 iOS 版本: ${current.name} (CURRENT_PROJECT_VERSION ${current.code})`);
  console.log(`下一个 iOS 版本: ${next.name} (CURRENT_PROJECT_VERSION ${next.code})`);
  console.log(`版本来源: ${pbxPath}`);

  if (dryRun) {
    console.log('\n[--dry-run] 不会改文件，也不会执行 build / sync / open。');
    return;
  }

  const shouldUpgrade = await askQuestion(`\n是否升级到 ${next.name}? (y/n): `);
  if (shouldUpgrade === 'y' || shouldUpgrade === 'yes') {
    console.log(`\n正在把 iOS 版本更新到 ${next.name} (CURRENT_PROJECT_VERSION ${next.code})...`);
    writeIosVersion(next.code, next.name);
    console.log('iOS 版本号更新完成！\n');
  } else {
    console.log(`保持当前 iOS 版本 ${current.name} (CURRENT_PROJECT_VERSION ${current.code})，继续建置...\n`);
  }

  console.log('开始建置 web...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

  console.log('同步 Capacitor (iOS)...');
  execSync('npx cap sync ios', { cwd: rootDir, stdio: 'inherit' });

  console.log('开启 Xcode...');
  execSync('npx cap open ios', { cwd: rootDir, stdio: 'inherit' });

  console.log('\n完成！请在 Xcode 中 Archive / 导出 IPA。');
}

main().catch((error) => {
  console.error('发生错误:', error.message);
  process.exit(1);
});

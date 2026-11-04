import getPort from "get-port";
import fs from "fs-extra";
import path from "path";
import { spawn } from "child_process";
import chalk from "chalk";
import psList from "ps-list";
import { chromium as playwrightChromium } from "playwright-core";

let chromiumPkg;
try {
  console.log("try import");
  chromiumPkg = await import("@sparticuz/chromium");
} catch (e) {
  console.log("is Local , Skip import");
}

import { createRequire } from "module";
const require = createRequire(import.meta.url);

const allPaths =
  require("./getRoutesAllPath.cjs").default ||
  require("./getRoutesAllPath.cjs");
console.log("allPaths", allPaths);

fs.copySync("public/assets", "dist/assets");

const ROUTES = ["/", "/promotion", "/vip"];
const OUT_DIR = path.resolve("./dist");
const PREVIEW_PORT = await getPort();
const APP_URL = `http://localhost:${PREVIEW_PORT}`;
const WAIT_TIMEOUT = 30000;

const isServerless =
  !!process.env.CI ||
  !!process.env.CF_PAGES ||
  !!process.env.VERCEL ||
  !!process.env.NETLIFY;

async function killPort(port) {
  if (!!isServerless) {
    console.log(
      chalk.green(`✅ Skipping port kill in CI/CD environment (port ${port})`)
    );
    return;
  }

  try {
    const processes = await psList();

    const targets = processes.filter(
      (p) =>
        p.cmd &&
        (p.cmd.includes(`--port ${port}`) ||
          p.cmd.includes(`:${port}`) ||
          p.cmd.includes(`localhost:${port}`) ||
          p.cmd.includes(`127.0.0.1:${port}`))
    );

    if (targets.length === 0) {
      console.log(chalk.green(`✅ No process found on port ${port}`));
      return;
    }

    console.log(
      chalk.yellow(
        `⚠️ Found ${targets.length} process(es) on port ${port}, killing...`
      )
    );

    for (const proc of targets) {
      console.log(chalk.yellow(`   → Killing (${proc.name || "unknown"})`));
      try {
        process.kill(proc.pid, "SIGKILL");
      } catch (err) {
        console.warn(
          chalk.red(`   ❌ Failed to kill PID ${proc.pid}: ${err.message}`)
        );
      }
    }
  } catch (err) {
    console.warn(
      chalk.yellow(
        `⚠️ Could not list/kill processes on port ${port}: ${err.message}`
      )
    );
    console.warn(
      chalk.yellow(`   → Continuing anyway (common in restricted environments)`)
    );
  }
}

async function waitForRender(page, route) {
  try {
    await page.waitForSelector("#app", { timeout: WAIT_TIMEOUT });
    await page.waitForFunction(
      () => document.readyState === "complete" && window.__APP_READY__ === true,
      { timeout: WAIT_TIMEOUT }
    );
    console.log("\n" + `✅ Render ready for route: ${route}` + "\n");
  } catch (err) {
    console.warn(`⚠️ waitForRender timeout or failed for route: ${route}`, err);
  }
}

function startVitePreview() {
  return new Promise((resolve, reject) => {
    const preview = spawn("npx", ["vite", "preview", "--port", PREVIEW_PORT], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });
    let buffer = [];
    preview.stdout.on("data", (data) => {
      const text = data.toString();
      process.stdout.write(chalk.cyan(text));
      if (text.includes("Local:") || text.includes("Network:")) {
        buffer.push(text.trim());
      }
      if (text.includes("Network:")) {
        const line = "*".repeat(70);
        console.log("\n" + chalk.cyan(line) + "\n");
        console.log(chalk.green(`* 🚀 Starting Vite preview...`));
        buffer.forEach((lineText) => {
          console.log(chalk.cyan(`* ${lineText}`));
        });
        console.log("\n" + chalk.cyan(line) + "\n");
        resolve(preview);
      }
    });
    preview.on("error", (err) => reject(err));
  });
}

async function prerender() {
  const previewProcess = await startVitePreview();

  const browser = await playwrightChromium.launch({
    headless: true,
    ...(isServerless && chromiumPkg
      ? {
          args: chromiumPkg.args,
          executablePath: await chromiumPkg.executablePath(),
        }
      : {}),
  });

  const context = await browser.newContext();

  await context.addInitScript(() => {
    window.__PRERENDER__ = true;
  });

  const page = await context.newPage();

  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    switch (type) {
      case "log":
        console.log(`ℹ️ Page log: ${text}`);
        break;
      case "warning":
        console.warn(chalk.yellow(`⚠️ Page warn: ${text}`));
        break;
      case "error":
        console.error(chalk.red(`🛑 Page error: ${text}`));
        break;
      default:
        console.log(chalk.gray(`ℹ️ Page ${type}: ${text}`));
    }
  });

  // 监听 JS 错误
  page.on("pageerror", (err) => {
    console.error(chalk.red(`🛑 Page JS error: ${err.message}`));
  });

  // 请求拦截（屏蔽第三方）
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (
      url.includes("chatoapp.net") ||
      url.includes("chat-widget.js") ||
      url.includes("tawk.to") ||
      url.includes("facebook") ||
      url.includes("youtube")
    ) {
      route.abort();
    } else {
      route.continue();
    }
  });

  // 请求失败日志
  page.on("requestfailed", (request) => {
    console.warn(
      chalk.yellow(
        `⚠️ Request failed: ${request.url()} (${request.failure()?.errorText})`
      )
    );
  });

  for (const route of ROUTES) {
    const url = `${APP_URL}${route}`;
    console.log(
      "\n" +
        chalk.blue(
          "****************************************************************"
        )
    );
    console.log(chalk.blue(`🔄 Prerendering: ${url}`));
    console.log(
      chalk.blue(
        "****************************************************************"
      ) + "\n"
    );

    try {
      await page.goto(url, { waitUntil: "networkidle" }); // Playwright 等价选项
      await waitForRender(page, route);
      const html = await page.content();

      const routePath = route === "/" ? "" : route;
      const outPath = path.join(OUT_DIR, routePath);
      await fs.ensureDir(outPath);
      await fs.writeFile(path.join(outPath, "index.html"), html);
      console.log(chalk.green(`✅ Saved: ${path.join(outPath, "index.html")}`));
    } catch (err) {
      console.error(
        chalk.red(`❌ Error prerendering ${route}:`),
        chalk.red(err)
      );
    } finally {
      console.log("\n\n");
    }
  }

  await context.close();
  await browser.close();
  process.kill(previewProcess.pid, "SIGKILL");
  console.log(chalk.magenta("🎉 Prerendering finished."));
}

(async () => {
  await killPort(PREVIEW_PORT);
  await prerender();
})().catch((err) => {
  console.error(chalk.red("❌ Prerender script failed:"), err);
  process.exit(1);
});

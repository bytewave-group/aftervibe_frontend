import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PLUGIN_PREFIX = "__my_common_tool_eslint_rules";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rulesBaseDir = path.join(__dirname, "rules");
const categories = ["error", "warn"];

const rulesMap = {};

for (const category of categories) {
  const dir = path.join(rulesBaseDir, category);

  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));

  for (const f of files) {
    const ruleName = path.basename(f, ".js");
    const ruleModule = await import(path.join(dir, f));
    rulesMap[ruleName] = ruleModule.default;
  }
}

const frozenRules = Object.freeze(rulesMap);

const recommendedRules = Object.fromEntries(
  Object.keys(frozenRules).map((shortName) => {
    const isError = fs.existsSync(
      path.join(rulesBaseDir, "error", `${shortName}.js`),
    );
    const level = isError ? "error" : "warn";
    const ruleName = `${PLUGIN_PREFIX}/${shortName}`;
    return [ruleName, level];
  }),
);

const pluginsEntry = Object.freeze({
  [PLUGIN_PREFIX]: {
    rules: frozenRules,
  },
});

const plugin = Object.freeze({
  rules: frozenRules,
  configs: Object.freeze({
    recommended: {
      rules: recommendedRules,
    },
  }),
});

export { pluginsEntry, plugin };

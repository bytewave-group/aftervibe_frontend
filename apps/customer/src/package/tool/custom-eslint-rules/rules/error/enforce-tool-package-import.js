import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import lodash from "lodash";

const { isEqual } = lodash;
//? =========================================================================
//? Get full export list
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_LIST = [
  { keyName: "tool", path: "../../../", packageName: "@my-common-tool/tool" },
  {
    keyName: "service",
    path: "../../../../service",
    packageName: "@my-common-tool/service",
  },
];

const ignoredDirs = [
  "experimental",
  "experimental",
  "experimental",
  // "toast",
  // "navigate",
  // "dialog",
  // "common-loading-manager",
  // "preferences",
  // "common-function",
  // "common-api",
  // "i18n-init",
  // "login-and-register",
  // "user-in-game",
  // "launch-game",
];

let exportsWithSourceSet = Object.fromEntries(
  SOURCE_LIST.map((i) => [i.keyName ?? "_UNKNOWN_SOURCE", new Set()]),
);

function stripComments(code) {
  return code.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function collectExports(dir, sourceType = "_UNKNOWN_SOURCE") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    const relativePath = path.relative(dir, fullPath);
    if (
      entry.isDirectory() &&
      ignoredDirs.some((d) => relativePath.startsWith(d))
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      collectExports(fullPath, sourceType);
    } else if (
      entry.isFile() &&
      (entry.name === "index.js" || entry.name === "index.jsx")
    ) {
      const codeBeforeClean = fs.readFileSync(fullPath, "utf-8");
      const code = stripComments(codeBeforeClean);

      // 1️⃣ 匹配 export const/let/var/function/class
      const declMatches = [
        ...code.matchAll(
          /export\s+(?:const|let|var|function|class)\s+([a-zA-Z0-9_]+)/g,
        ),
      ];
      declMatches.forEach((m) => {
        if (!m[1]) return;
        exportsWithSourceSet?.[sourceType].add(m[1]);
      });

      // 2️⃣ 匹配 export { a, b, c } 形式
      const namedMatches = [...code.matchAll(/export\s*{\s*([^}]+)\s*}/g)];
      namedMatches.forEach((m) => {
        m[1].split(",").forEach((name) => {
          // 支持 'default as useXXX' 这种
          const cleanName = name.includes(" as ")
            ? name.split(" as ")[1].trim()
            : name.trim();
          if (!cleanName) return;
          exportsWithSourceSet?.[sourceType].add(cleanName);
        });
      });
    }
  }
}

//? ================================================================
//? get exportsWithSourceSet
for (const item of SOURCE_LIST) {
  const resolvePath = path.resolve(__dirname, item?.path);
  collectExports(resolvePath, item?.keyName);
}
//? ================================================================

const flatedExportsSet = new Set(
  Object.values(exportsWithSourceSet).flatMap((set) => [...set]),
);

const needMigrateSet = flatedExportsSet;

const checkSource = ({ context, node, source, name }) => {
  if (!source) {
    context.report({
      node,
      messageId: "sameName",
      data: { name, importPath: "@my-common-tool/***/**" },
    });
  } else {
    const owner = SOURCE_LIST.find((item) =>
      exportsWithSourceSet[item.keyName].has(name),
    );

    if (!owner) return;

    const isValid =
      source === owner.packageName ||
      source?.startsWith(owner.packageName + "/");

    if (!isValid) {
      context.report({
        node,
        messageId: "sameName",
        data: {
          name,
          importPath: owner.packageName,
        },
      });
    }
  }
};

//! =========================================================================
//! =========================================================================
//! Start Export

export default {
  meta: {
    type: "problem",
    docs: { description: "Check tool migrations", recommended: "error" },
    messages: {
      sameName:
        "Do not import '{{name}}' outside tool package. Import from {{importPath}}'",
      rename: "Do not use '{{old}}' directly. Use '{{newName}}' instead.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();

    if (
      filename.includes("node_modules") ||
      filename.includes(path.join("src", "tool")) ||
      filename.includes(path.join("src", "package/tool")) || // 统一排除 tool 文件夹
      filename.includes(path.join("src", "service")) ||
      filename.includes(path.join("src", "package/service")) || // 统一排除 service 文件夹
      filename.includes("android") ||
      filename.includes("ios")
    ) {
      return {};
    }

    const importedNames = new Map();
    const reportedFns = new Set();

    return {
      ImportDeclaration(node) {
        node.specifiers.forEach((specifier) => {
          importedNames.set(specifier.local.name, node.source.value);
        });
      },

      Identifier(node) {
        //? const TOOL_IMPORT_NAME = xxx
        if (
          node.parent.type === "VariableDeclarator" &&
          node.parent.id === node
        ) {
          return;
        }

        //? import { TOOL_IMPORT_NAME } from "....."
        if (node.parent.type === "ImportSpecifier") return;

        const name = node.name;

        if (!needMigrateSet.has(name)) return;
        if (reportedFns.has(name)) return;

        const source = importedNames.get(name);

        checkSource({
          context,
          node,
          name,
          source,
        });

        reportedFns.add(name);
      },

      JSXOpeningElement(node) {
        if (node.name.type === "JSXIdentifier") {
          const name = node.name.name;
          const source = importedNames.get(name);
          if (needMigrateSet.has(name) && !reportedFns.has(name)) {
            checkSource({
              context,
              node,
              name,
              source,
            });

            reportedFns.add(name);
          }
        }
      },
    };
  },
};

// generate-sitemap.cjs
const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer").default;
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default; // use default for CJS

// 1. Configure domain and default values
//! ⚠️ Make sure DOMAIN does NOT end with `/`!
const DOMAIN = "https://label1.com";
const DEFAULT_CHANGEFREQ = "yearly";
const DEFAULT_PRIORITY = 0.8;
const customChangefreq = {
  // you can override specific paths here
};

const customPriority = {
  // you can override specific paths here
  "/": "1.0",
};

const EXCLUDEDPATHS = [
  "/withdraw",
  "/reward",
  "/downline",
  "/lobby",
  "/change_password",
  "/history",
  "/launch",
  "/launch_deposit",
];

// 2. Read routes.jsx
const routesFile = path.resolve("./src/library/routes.js");
const code = fs.readFileSync(routesFile, "utf-8");

// 3. Parse JSX/ESM syntax
const ast = parser.parse(code, {
  sourceType: "module",
  plugins: ["jsx"],
});

// 4. Recursively extract paths
function extractPathsFromNode(node) {
  const paths = [];
  if (!node) return paths;

  if (node.type === "ObjectExpression") {
    let pathValue = null;
    let childrenNode = null;

    for (const prop of node.properties) {
      if (prop.key.name === "path" && prop.value.type === "StringLiteral") {
        pathValue = prop.value.value;
      }
      if (prop.key.name === "children") {
        childrenNode = prop.value;
      }
    }

    if (pathValue && pathValue !== "*") paths.push(pathValue);

    if (childrenNode && childrenNode.type === "ArrayExpression") {
      for (const child of childrenNode.elements) {
        paths.push(...extractPathsFromNode(child));
      }
    }
  }

  if (node.type === "ArrayExpression") {
    for (const el of node.elements) {
      paths.push(...extractPathsFromNode(el));
    }
  }

  return paths;
}

// 5. Traverse AST to find the routes variable
let allPaths = [];
traverse(ast, {
  VariableDeclarator({ node }) {
    if (node.id.name === "routes") {
      allPaths = extractPathsFromNode(node.init);
    }
  },
});

// 6. Remove duplicates and normalize paths
allPaths = [...new Set(allPaths)]
  .map((p) => (p.startsWith("/") ? p : `/${p}`))
  .filter((p) => !p.includes("test") && !EXCLUDEDPATHS.includes(p));

// 7. Generate sitemap.xml content
const lastmod = new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"
>${allPaths
  .map((p) => {
    const changefreq = customChangefreq[p] || DEFAULT_CHANGEFREQ;
    const priority = customPriority[p] ?? DEFAULT_PRIORITY;

    return `  <url>
    <loc>${DOMAIN}${p}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join("\n")}
</urlset>
`;

// 8. Write sitemap.xml
fs.writeFileSync("sitemap.xml", "\uFEFF" + sitemapContent, "utf-8");
console.log("✅ sitemap.xml generated successfully!");

// 9. Ask whether to move to public folder
inquirer
  .prompt([
    {
      type: "confirm",
      name: "move",
      message: "Move sitemap.xml to /public folder?",
      default: true,
    },
  ])
  .then((answers) => {
    if (answers.move) {
      const publicDir = path.resolve("./public");
      if (!fs.existsSync(publicDir))
        fs.mkdirSync(publicDir, { recursive: true });

      const finalPath = path.join(publicDir, "sitemap.xml");
      fs.renameSync(path.resolve("./sitemap.xml"), finalPath);

      console.log(`✅ sitemap.xml moved to ${finalPath}!`);
    } else {
      console.log("❌ sitemap.xml not moved.");
    }
  });

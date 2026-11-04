// rules/no-relative-tool-import.js
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow relative imports of internal tool modules; enforce package-style import",
      recommended: "error",
    },
    messages: {
      usePackageImport:
        "Do not import '{{importPath}}' using a relative path. Use package-style import instead.",
    },
    schema: [], // no options
  },

  create(context) {
    const filename = context.getFilename();

    // skip node_modules or external files
    if (filename.includes("node_modules")) return {};

    function checkImport(importPath, node) {
      // Only check relative paths
      if (!importPath.startsWith(".")) return;

      // Check if the path includes /tool/
      if (importPath.includes("/tool/")) {
        context.report({
          node,
          messageId: "usePackageImport",
          data: { importPath },
        });
      }
    }

    return {
      // Handle ES module imports
      ImportDeclaration(node) {
        checkImport(node.source.value, node.source);
      },
      // Handle CommonJS require(...)
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments.length === 1 &&
          node.arguments[0].type === "Literal"
        ) {
          checkImport(node.arguments[0].value, node.arguments[0]);
        }
      },
    };
  },
};

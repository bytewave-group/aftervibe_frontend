const DEFAULT_RULES = [
  {
    importPath: "@my-common-tool/tool/dialog",
    // conditional: {
    //   configUse: "useSwal",
    //   requiredComponents: ["SwalDialogContent"],
    // },
    requiredComponents: ["DialogManager"],
  },
  {
    importPath: "@my-common-tool/tool/popup-manager",
    requiredComponents: ["PopupManager"],
  },
];

export default {
  meta: {
    type: "problem",

    docs: {
      description:
        "Require specific manager components when certain modules are imported",
    },

    schema: [
      {
        type: "array",

        items: {
          type: "object",

          properties: {
            importPath: {
              type: "string",
            },

            requiredComponents: {
              type: "array",

              items: {
                type: "string",
              },
            },
          },

          required: ["importPath", "requiredComponents"],

          additionalProperties: false,
        },
      },
    ],
  },

  create(context) {
    const filename = context.getFilename();

    // only check app.jsx / App.jsx / tsx
    const isAppFile = /[\\/]app\.(jsx|tsx?)$/i.test(filename);

    if (!isAppFile) {
      return {};
    }

    const config = context.options[0] || DEFAULT_RULES;

    const importedModules = new Set();

    const renderedComponents = new Set();

    return {
      ImportDeclaration(node) {
        const importSource = node.source.value;

        config.forEach((rule) => {
          if (importSource === rule.importPath) {
            importedModules.add(rule.importPath);
          }
        });
      },

      JSXOpeningElement(node) {
        if (node.name?.type === "JSXIdentifier") {
          renderedComponents.add(node.name.name);
        }
      },

      "Program:exit"() {
        config.forEach((rule) => {
          const hasImport = importedModules.has(rule.importPath);

          if (!hasImport) {
            return;
          }

          const missingComponents = rule.requiredComponents.filter(
            (component) => !renderedComponents.has(component),
          );

          missingComponents.forEach((component) => {
            context.report({
              loc: { line: 1, column: 0 },

              message: `Using "${rule.importPath}" requires rendering <${component} /> in app.jsx`,
            });
          });
        });
      },
    };
  },
};

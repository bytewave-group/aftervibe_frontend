// rules/no-direct-window.js
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow direct window navigation, force use of custom function",
      recommended: "error",
    },
    messages: {
      useOpenNewTab:
        "Do not use 'window.open' directly. Use 'openNewTabCrossPlatform()' instead.",
      useCrossPlatformNavigate:
        "Do not use '{{name}}' directly. Use 'crossPlatformNavigate()' instead.",
    },
    schema: [], // no options
  },

  create(context) {
    const filename = context.getFilename();

    if (filename.includes("/cross-platform-navigate/")) {
      return {};
    }

    return {
      // window.open(...)
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.name === "window" &&
          node.callee.property.name === "open"
        ) {
          context.report({
            node,
            messageId: "useOpenNewTab",
          });
        }
      },

      // window.location.replace(...)
      MemberExpression(node) {
        if (
          node.object.type === "MemberExpression" &&
          node.object.object.name === "window" &&
          node.object.property.name === "location" &&
          node.property.name === "replace"
        ) {
          context.report({
            node,
            messageId: "useCrossPlatformNavigate",
            data: { name: "window.location.replace" },
          });
        }
      },

      // window.location.href = ...
      AssignmentExpression(node) {
        if (
          node.left.type === "MemberExpression" &&
          node.left.object.type === "MemberExpression" &&
          node.left.object.object.name === "window" &&
          node.left.object.property.name === "location" &&
          node.left.property.name === "href"
        ) {
          context.report({
            node,
            messageId: "useCrossPlatformNavigate",
            data: { name: "window.location.href" },
          });
        }
      },
    };
  },
};

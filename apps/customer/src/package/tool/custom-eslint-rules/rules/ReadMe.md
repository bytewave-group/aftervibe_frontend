# @my-common-tool/tool/custom-eslint-rules

This package provides custom ESLint rules with a ready-to-use recommended configuration. No need to manually handle plugin prefixes.

## Usage

1️⃣ Import in ESLint config

```js
import { pluginsEntry, plugin } from "@my-common-tool/tool/custom-eslint-rules";

export default [
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      // other plugins if needed
      ...pluginsEntry, // register custom plugin
    },
    rules: {
      //other rules
      ...plugin.configs.recommended.rules, // use recommended rules directly
    },
  },
];
```

✅ Notes:

- pluginsEntry → Registers the plugin with ESLint.
- plugin.configs.recommended.rules → Automatically adds the correct plugin prefix for each rule.
- IMPORTANT : You do not need to manually add the prefix , it’s handled automatically.

2️⃣ Enable a single rule manually (optional)

Coming Soon

3️⃣ Add more rules

- Simply add new .js files in the rules/error or rules/warn directories in the package.
- The plugin will automatically scan and add them to plugin.rules and plugin.configs.recommended.rules.

4️⃣ Key Points

1. Do not manually handle plugin prefixes.
2. Always use plugin.configs.recommended.rules for automatic recommended setup.
3. Plugin is fully extendable; new rules automatically appear in the recommended config.

This README ensures developers can import and use your rules without worrying about prefixes or internal structure, just drop it into ESLint config and go.

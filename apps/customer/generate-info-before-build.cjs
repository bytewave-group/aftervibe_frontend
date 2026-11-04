// generate-info-json.js
const fs = require("fs");
const path = require("path");
const { version } = require("./package.json");
const { version: tool_version } = require("./src/package/tool/package.json");
const {
  version: service_version,
} = require("./src/package/service/package.json");
const { version: core_version } = require("./src/package/core/package.json");

const outputPath = path.resolve("./public/version.json");
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    { version, tool_version, service_version, core_version },
    null,
    2,
  ),
);

console.log("version.json generated!");

/**
 * Dynamic file import utility using a pre-generated relative file map.
 *
 * !IMPORTANT :  The file map must be generated before running the project, typically
 * !IMPORTANT :  via npm scripts:
 * !IMPORTANT :
 * !IMPORTANT :  "predev": "node path/to/generateFileTree.mjs",
 * !IMPORTANT : "prebuild": "node path/to/generateFileTree.mjs"
 */

import map from "./relativeStructureMap.json";

/**
 * Get the relative path of a file from the map.
 * @param {string} fileName - File name, with or without extension.
 * @returns {string | undefined} The relative path to the file.
 */

export async function getImportPath(fileName) {
  let fileNameWithExt = fileName.includes(".") ? fileName : `${fileName}.jsx`;
  return map?.[fileNameWithExt];
}

/**
 * Dynamically import a module from the main repository.
 * @param {string} fileName - File name, with or without extension.
 * @throws {Error} If the file is not found in the map.
 * @returns {Promise<any>} The imported module.
 */

export async function importUsingMainRepo(fileName) {
  const filePath = getImportPath(fileName);
  if (!filePath) throw new Error(`File not found: ${fileName}`);
  const module = await import(filePath);
  return module;
}

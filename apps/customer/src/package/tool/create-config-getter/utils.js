export const compileCMSMapping = (config) => {
  const result = {};

  const { mappingList = [], raw = {} } = config;

  const register = (alias, value, source) => {
    let valueList = value;
    if (source?.type === "mappingList" && Array.isArray(value)) {
      if (source?.type === "mappingList" && Array.isArray(value)) {
        valueList = value?.flatMap((i) => i?.split("."));
      }
    }

    if (result.hasOwnProperty(alias)) {
      throw new Error(
        `[CMS Mapping Duplicate Key] "${alias}" already exists. ` +
          `Conflicting source: ${JSON.stringify(source)}`,
      );
    }

    result[alias] = valueList;
  };

  for (const group of mappingList) {
    const base = group.defaultSource;

    for (const [alias, leaf] of Object.entries(group.detail)) {
      register(alias, [...base, leaf], {
        type: "mappingList",
        group: base,
        alias,
        leaf,
      });
    }
  }

  for (const [alias, path] of Object.entries(raw)) {
    register(alias, path, {
      type: "raw",
      alias,
      path,
    });
  }

  return result;
};

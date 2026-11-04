const isDebug = false;

export default function useMergedClass({ defaultClass = "", ruleList = null }) {
  const defaultRule = {
    textAlign: {
      value: /text(?:-(sm|md|lg|xl|xxl))?-(start|center|end)/,
    },
    lineHeight: {
      value: /lh(?:-(?:1|sm|normal|large))/,
    },
    textSize: {
      value: /text(?:-(?:sm|md|lg|xl|xxl))?[0-9]+/,
    },
    fontWeight: {
      value: /fw(?:-(sm|md|lg|xl|xxl))?-(bold|light|normal|Noweight-[a-zA-Z]*)/,
    },
    textTransform: {
      value:
        /text-transform(?:-(sm|md|lg|xl|xxl))?-(uppercase|lowercase|capitalize)/,
    },
    textColor: {
      value: /text-(?:-(sm|md|lg|xl|xxl))?[a-zA-Z0-9-]+/,
      needCheckOtherRule: true,
    },
    bgColor: {
      value: /bg-(?:-(sm|md|lg|xl|xxl))?[a-zA-Z0-9-]+/,
      needCheckOtherRule: true,
    },
    padding: {
      value: /p[tbsexy]?-(?:-(sm|md|lg|xl|xxl))?[0-9]+/,
    },
    margin: {
      value: /m[tbsexy]?-(?:-(sm|md|lg|xl|xxl))?[0-9]+/,
    },
  };

  const finalRuleList = { ...defaultRule, ...ruleList };

  return {
    getMergedClass: (customClass) => {
      let resultArray = String(defaultClass).split(/\s+/).filter(Boolean);

      if (isDebug) {
        console.log("===========================================");
        console.log("customClass", customClass);
        console.log("customClass", customClass);
      }

      const customClassArray = String(customClass).split(/\s+/).filter(Boolean);

      Object.entries(finalRuleList).forEach(
        ([ruleName, obj], index, oriRuleList) => {
          const reg = obj?.value;
          const needCheckOtherRule = !!obj?.needCheckOtherRule;

          const testReg = new RegExp(reg.source);
          const replaceReg = new RegExp(`^${reg.source}$`);
          const debugReg = new RegExp(reg.source, "g");

          let matchArray = customClassArray.filter((cls) => {
            if (!testReg.test(cls)) return false;

            if (needCheckOtherRule) {
              const excludeRules = oriRuleList
                .filter(([name]) => name !== ruleName)
                .map(([_, obj]) => obj?.value);

              return !excludeRules.some((ex) => ex.test(cls));
            }
            return true;
          });

          if (isDebug) {
            const _debug_result = resultArray.filter((cls) =>
              debugReg.test(cls),
            );
            if (_debug_result.length > 0) {
              console.log(ruleName, debugReg, _debug_result);
            }
          }

          if (matchArray.length > 0) {
            resultArray = resultArray.filter((cls) => !replaceReg.test(cls));
            resultArray.push(...matchArray);
          }
        },
      );

      if (isDebug) {
        console.log("resultArray", resultArray);
      }

      return resultArray.join(" ");
    },
  };
}

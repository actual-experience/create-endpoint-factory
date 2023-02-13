// @ts-check

const LanguageTabStorageKey = 'docusaurus.tab.language'; // hijack remark-typescript-tool's spot

const script = `
(function () {
  // this evilness because you can't listen for storage events on the same browser
  Storage.prototype.setItem = new Proxy(Storage.prototype.setItem, {
    apply(target, thisArg, argumentList) {
      const event = new CustomEvent("localstorage", {
        detail: {
          key: argumentList[0],
          oldValue: thisArg.getItem(argumentList[0]),
          newValue: argumentList[1],
        },
      });
      window.dispatchEvent(event);
      return Reflect.apply(target, thisArg, argumentList);
    },
  });

  Storage.prototype.removeItem = new Proxy(Storage.prototype.removeItem, {
    apply(target, thisArg, argumentList) {
      const event = new CustomEvent("localstorage", {
        detail: {
          key: argumentList[0],
        },
      });
      window.dispatchEvent(event);
      return Reflect.apply(target, thisArg, argumentList);
    },
  });

  Storage.prototype.clear = new Proxy(Storage.prototype.clear, {
    apply(target, thisArg, argumentList) {
      const event = new CustomEvent("localstorage", {
        detail: {
          key: "__all__",
        },
      });
      window.dispatchEvent(event);
      return Reflect.apply(target, thisArg, argumentList);
    },
  });

  var defaultLanguage = "ts";

  function setDataLanguageAttribute(language) {
    document.documentElement.setAttribute("data-language", language);
  }

  function getStoredLanguage() {
    var language = null;
    try {
      language = localStorage.getItem("${LanguageTabStorageKey}");
    } catch (err) {}
    return language;
  }

  var storedLanguage = getStoredLanguage();
  if (storedLanguage !== null) {
    setDataLanguageAttribute(storedLanguage);
  } else {
    setDataLanguageAttribute(defaultLanguage);
  }

  addEventListener("localstorage", (e) => {
    const { key, newValue } = e.detail;
    if (key === "${LanguageTabStorageKey}") {
      setDataLanguageAttribute(newValue || defaultLanguage);
    }
  });
})();
`;

/**
 *
 * @param {import('@docusaurus/types').LoadContext} context
 * @returns {import('@docusaurus/types').Plugin}
 */
module.exports = function loadLanguage(context) {
  return {
    name: 'load-language',
    injectHtmlTags() {
      return {
        preBodyTags: [
          {
            tagName: 'script',
            innerHTML: script,
          },
        ],
      };
    },
  };
};

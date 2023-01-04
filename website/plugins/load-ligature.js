// @ts-check

const LigatureStorageKey = 'ligatures';
/**
 *
 * @param {unknown} defaultLigatures
 */
const createScript = (defaultLigatures) =>
  /* language=js */
  `(function() {
  var defaultLigatures = '${defaultLigatures}';

  function setDataLigatureAttribute(ligature) {
    document.documentElement.setAttribute('data-ligatures', ligature);
  }

  function getStoredLigature() {
    var ligature = null;
    try {
      ligature = localStorage.getItem('${LigatureStorageKey}');
    } catch (err) {}
    return ligature;
  }

  var storedLigature = getStoredLigature();
  if (storedLigature !== null) {
    setDataLigatureAttribute(storedLigature);
  } else {
    setDataLigatureAttribute(defaultLigatures === 'none' ? 'none' : 'normal');
  }
 })();`;

/**
 *
 * @param {import('@docusaurus/types').LoadContext} context
 * @returns {import('@docusaurus/types').Plugin}
 */
module.exports = function loadLigature(context) {
  return {
    name: 'load-ligature',
    injectHtmlTags() {
      return {
        preBodyTags: [
          {
            tagName: 'script',
            innerHTML: createScript(
              context.siteConfig.customFields?.defaultLigatures
            ),
          },
        ],
      };
    },
  };
};

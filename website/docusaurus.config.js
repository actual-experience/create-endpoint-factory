// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion
const { transpileCodeblocks } = require('remark-typescript-tools');
const path = require('path');
const { name, version } = require('../package.json');

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');
const loadLigature = require('./plugins/load-ligature');

const organizationName = 'actual-experience';
const projectName = 'create-endpoint-factory';

/**
 * Creates magic comments from a map of names to classes (or pass `true` for a key to use `code-block-${name}-line` as the class)
 * @type {(classMap: Record<string,string | true>) => import('@docusaurus/theme-common/src/utils/codeBlockUtils').MagicCommentConfig[]}
 */
const makeMagicComments = (classMap) =>
  Object.entries(classMap).map(([name, className]) => ({
    className: className === true ? `code-block-${name}-line` : className,
    line: `${name}-next-line`,
    block: { start: `${name}-start`, end: `${name}-end` },
  }));

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Create Endpoint Handler',
  url: `https://${organizationName}.github.io`,
  baseUrl: `/${projectName}`,
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  trailingSlash: false,

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName, // Usually your GitHub org/user name.
  projectName, // Usually your repo name.

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/',
          editUrl: `https://github.com/${organizationName}/${projectName}/tree/main/website`,
          remarkPlugins: [
            [
              transpileCodeblocks,
              /** @type {import('remark-typescript-tools/dist/transpileCodeblocks/plugin').Settings} */
              ({
                compilerSettings: {
                  tsconfig: require.resolve('./tsconfig.json'),
                  externalResolutions: {
                    [name]: {
                      resolvedPath: path.resolve(__dirname, '../src'),
                      packageId: {
                        name,
                        subModuleName: 'index.ts',
                        version,
                      },
                    },
                  },
                },
                fileExtensions: ['.md', '.mdx'],
              }),
            ],
          ],
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/scss/global.scss'),
        },
      }),
    ],
  ],

  plugins: ['docusaurus-plugin-sass', loadLigature],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Create Endpoint Handler',
        logo: {
          alt: 'Actual Logo',
          src: 'img/logo.svg',
          srcDark: 'img/logo-white.svg',
        },
        items: [
          {
            href: `https://github.com/${organizationName}/${projectName}`,
            position: 'right',
            className: 'header-github-link',
            'aria-label': 'GitHub repository',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Company',
            items: [
              { label: 'Website', href: 'https://actual-experience.com/' },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Actual Experience plc. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        magicComments: makeMagicComments({
          highlight: 'theme-code-block-highlighted-line',
          error: true,
        }),
      },
    }),
  customFields: {
    defaultLigatures: 'normal',
  },
};

module.exports = config;

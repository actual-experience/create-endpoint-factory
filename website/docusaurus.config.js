// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion
const { transpileCodeblocks } = require('remark-typescript-tools');
const path = require('path');
const { name, version } = require('../package.json');

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

const organizationName = 'actual-experience';
const projectName = 'create-endpoint-factory';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Create Endpoint Handler',
  tagline: 'Dinosaurs are cool',
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

  plugins: ['docusaurus-plugin-sass'],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Create Endpoint Handler',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Tutorial',
          },
          {
            href: `https://github.com/${organizationName}/${projectName}`,
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} Actual Experience plc. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;

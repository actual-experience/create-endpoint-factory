import path from 'path';
import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes } from 'prism-react-renderer';
import type { TranspileCodeblocksSettings } from 'remark-typescript-tools';
import { transpileCodeblocks } from 'remark-typescript-tools';
import { name, version } from '../package.json';
import loadLanguage from './plugins/load-language';
import loadLigature from './plugins/load-ligature';

const { dracula: darkCodeTheme, github: lightCodeTheme } = themes;

const organizationName = 'actual-experience';
const projectName = 'create-endpoint-factory';

interface MagicCommentConfig {
  className: string;
  line?: string;
  block?: { start: string; end: string };
}

/**
 * Creates magic comments from a map of names to classes (or pass `true` for a key to use `code-block-${name}-line` as the class)
 */
const makeMagicComments: (
  classMap: Record<string, string | true>
) => Array<MagicCommentConfig> = (classMap): Array<MagicCommentConfig> =>
  Object.entries(classMap).map(([name, className]) => ({
    className: className === true ? `code-block-${name}-line` : className,
    line: `${name}-next-line`,
    block: { start: `${name}-start`, end: `${name}-end` },
  }));

const config: Config = {
  title: 'Create Endpoint Factory',
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
  deploymentBranch: 'gh-pages',

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
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/',
          editUrl: `https://github.com/${organizationName}/${projectName}/tree/main/website`,
          remarkPlugins: [
            [
              transpileCodeblocks,
              {
                compilerSettings: {
                  tsconfig: path.resolve(
                    __dirname,
                    './tsconfig.transpile.json'
                  ),
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
              } satisfies TranspileCodeblocksSettings,
            ],
          ],
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/scss/global.scss'),
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: ['docusaurus-plugin-sass', loadLigature, loadLanguage],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      style: 'dark',
      title: 'Create Endpoint Factory',
      logo: {
        alt: 'Actual Logo',
        src: 'img/logo-white.svg',
        srcDark: 'img/logo-white.svg',
      },
      items: [
        {
          type: 'doc',
          docId: 'getting-started',
          position: 'left',
          label: 'Docs',
        },
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
          items: [{ label: 'Website', href: 'https://actual-experience.com/' }],
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
        success: true,
        'ts-only': true,
        'js-only': true,
      }),
    },
  } satisfies Preset.ThemeConfig,
  customFields: {
    defaultLigatures: 'normal',
  },
  markdown: {
    mdx1Compat: {
      comments: false,
      admonitions: false,
    },
  },
};

module.exports = config;

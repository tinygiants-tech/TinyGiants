import {themes as prismThemes} from 'prism-react-renderer';

const config = {
  title: 'TinyGiants',
  tagline: 'Home',
  favicon: 'img/home-page/tinygiants-logo.png',

  url: 'https://docs.tinygiants.tech',
  baseUrl: '/',
  organizationName: 'TinyGiants',
  projectName: 'GameEventSystem',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/LemonSqi/GameEventSystemDocs/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  plugins: ['docusaurus-plugin-image-zoom'],
  markdown: { mermaid: true },
  themes: ['@docusaurus/theme-mermaid'],

  themeConfig: ({
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'TinyGiants',
      logo: {
        alt: 'TinyGiants Logo',
        src: 'img/home-page/tinygiants-logo.png',
      },
      items: [
        {
          href: 'https://discord.tinygiants.tech',
          position: 'right',
          className: 'header-discord-link',
        },
        {
          href: 'https://forum.unity.com/',
          position: 'right',
          className: 'header-unity-forum-link',
        },
        {
          href: 'mailto:support@tinygiants.tech',
          position: 'right',
          className: 'header-mail-link',
        },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['csharp'],
    },
    zoom: {
      selector: '.markdown img:not(.img-full)',
      background: {
        light: 'rgba(255, 255, 255, 0.9)',
        dark: 'rgba(20, 20, 20, 0.9)'
      },
      config: {
        margin: 40,
        scrollOffset: 0,
      }
    },
    mermaid: {
      options: {
        theme: {light: 'forest', dark: 'dark'},
      },
    },
    footer: {
      links: [
        {
          title: 'CORE TOOLS',
          items: [
            {
              label: 'Game Event System',
              to: '/docs/game-event-system/intro/overview',
            },
            {
              label: 'Asset Store Page',
              href: 'https://assetstore.unity.com/',
            },
            {
              label: 'Visual Flow Editor',
              to: '/docs/game-event-system/flow-graph/game-event-node-editor',
            },
          ],
        },
        {
          title: 'COMMUNITY',
          items: [
            {
              label: 'Official Discord',
              href: 'https://discord.tinygiants.tech',
            },
            {
              label: 'Unity Forum Thread',
              href: 'https://forum.unity.com/',
            },
            {
              label: 'Github Repository',
              href: 'https://github.com/TinyGiants',
            },
          ],
        },
        {
          title: 'STUDIO',
          items: [
            {
              label: 'Technical Support',
              href: 'mailto:support@tinygiants.tech',
            },
            {
              label: 'Privacy Policy',
              to: '/docs/game-event-system/tools/community-and-support',
            },
            {
              label: 'Contact Us',
              href: 'mailto:contact@tinygiants.tech',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} <strong>TinyGiants</strong>. <br/> <small style="opacity: 0.6; font-weight: 400;">Crafting professional Unity tools and games for giants with tiny ideas.</small>`,
    },
  }),
};

export default config;
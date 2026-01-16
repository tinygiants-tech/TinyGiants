import {themes as prismThemes} from 'prism-react-renderer';

const config = {
  title: 'TinyGiants',
  tagline: 'Home',
  favicon: '/img/home-page/tinygiants-logo.png',

  url: 'https://tinygiants.tech',
  baseUrl: '/',
  organizationName: 'TinyGiants',
  projectName: 'GameEventSystem',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh', 'ja', 'ko'],
    localeConfigs: {
      en: {
        label: 'EN',
        direction: 'ltr',
      },
      zh: {
        label: 'ZH',
        direction: 'ltr',
      },
      ja: {
        label: 'JA',
        direction: 'ltr',
      },
      ko: {
        label: 'KO',
        direction: 'ltr',
      },
    },
  },

  presets: [
    [
      'classic',
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/tinygiants-tech/TinyGiants',
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
        src: '/img/home-page/tinygiants-logo.png',
      },
      items: [
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://discord.tinygiants.tech',
          position: 'right',
          className: 'header-discord-link',
          'aria-label': 'Discord',
        },
        {
          href: 'https://forum.tinygiants.tech',
          position: 'right',
          className: 'header-unity-forum-link',
          'aria-label': 'Unity Forum',
        },
        {
          href: 'mailto:support@tinygiants.tech',
          position: 'right',
          className: 'header-mail-link',
          'aria-label': 'Email',
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
              to: '/docs/ges/intro/overview',
            },
            {
              label: 'Asset Store Page',
              href: 'https://assetstore.unity.com/game-event-system',
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
              label: 'Unity Forum',
              href: 'https://forum.tinygiants.tech',
            },
          ],
        },
        {
          title: 'SUPPORT',
          items: [
            {
              label: 'Official Discord',
              href: 'https://discord.tinygiants.tech',
            },
            {
              label: 'Technical Support',
              href: 'mailto:support@tinygiants.tech',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} <strong>TinyGiants</strong>. <br/> <small style="opacity: 0.6; font-weight: 400;">Crafting professional Unity tools and games for giants with tiny ideas.</small>`,
    },
  }),
};

export default config;
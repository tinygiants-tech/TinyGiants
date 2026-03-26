# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TinyGiants is the documentation website for **Game Event System (GES)**, a visual event architecture tool for Unity. Built with **Docusaurus 3.9.2** and **React 19**, deployed on **Vercel**.

Site URL: https://tinygiants.tech

## Common Commands

```bash
npm install              # Install dependencies (requires Node.js >= 20)
npm start                # Dev server (English, default)
npm run start:zh         # Dev server (Chinese locale)
npm run start:ja         # Dev server (Japanese locale)
npm run start:ko         # Dev server (Korean locale)
npm run build            # Production build
npm run preview          # Build + serve locally
npm run write-translations   # Generate i18n translation files
npm run write-heading-ids    # Generate heading IDs for docs
```

## Architecture

- **Docusaurus config**: `docusaurus.config.js` — site metadata, theme, plugins (mermaid, image-zoom), navbar, footer
- **Sidebar navigation**: `sidebars.js` — defines doc category structure (6 sections, 38 pages)
- **Deployment & redirects**: `vercel.json` — URL redirects for Asset Store, Discord, QQ, YouTube, etc.

### Content

- `docs/ges/` — All documentation markdown, organized into: `intro/`, `visual/`, `flow/`, `scripting/`, `tools/`, `examples/`
- `blog/` — Blog posts (placeholder, not actively used)

### i18n (4 locales)

- Default: English
- `i18n/zh/` — Chinese, `i18n/ja/` — Japanese, `i18n/ko/` — Korean
- Each locale contains `code.json` (UI strings) and translated doc folders

### Source (`src/`)

- `src/pages/index.js` — Custom homepage with interactive canvas background, particle effects, language selector, theme toggle
- `src/components/FlowStep/` — Visual flow diagram components (`FlowStep.js`, `flow-style.css`)
- `src/components/Video/VideoGif.js` — Video player with hover controls
- `src/css/custom.css` — Global theming: custom fonts (Inter, Montserrat), brown/tan color scheme, dark mode support

### Static Assets

- `static/fonts/` — Inter, Montserrat font files
- `static/img/` — Logos, screenshots, language flags, feature images
- `static/video/` — Tutorial and promo videos

## Key Details

- Syntax highlighting includes C# (Prism) since the documented product is a Unity tool
- Mermaid diagrams are enabled for architectural documentation
- Dark mode is the default theme; light mode is also supported
- The homepage canvas animation uses raw Canvas API — no animation library

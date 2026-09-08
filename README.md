# CodeCompare

WinMerge-style side-by-side code comparison in the browser. Built with React, TypeScript, Vite, and Monaco Editor.

## Features

- Paste code with **exact indentation preserved** (no format-on-paste)
- Line diff: **added**, **removed**, **modified**, **unchanged**
- Character-level highlights inside modified lines
- WinMerge-style connectors, overview ruler, and summary stats
- Share comparisons via URL (client-side, no backend)
- Dark / light theme, keyboard shortcuts, toast notifications
- Responsive: side-by-side on desktop, tabs on mobile

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Architecture

```
src/
├── components/
│   ├── Header/           # Logo + title
│   ├── Toolbar/          # Language, Compare, Share, Settings
│   ├── DiffEditor/       # Monaco diff + connectors
│   ├── DiffSummary/      # Stats bar + legend
│   ├── DiffReport/       # Collapsible report panel
│   ├── Settings/         # Settings drawer
│   ├── ShareDialog/      # Shared comparison banner
│   ├── Toast/            # Toast notifications
│   └── Layout/           # App shell, mobile tabs, empty/loading states
├── diff/                 # Diff engine (line, char, word, report)
├── hooks/                # useComparison, useToast, useTheme, …
├── utils/                # languageDetection, download, share, editor config
├── types/
├── App.tsx               # Thin root (ToastProvider + AppShell)
└── main.tsx
```

**Data flow:** Original + Modified → **Diff Engine** → Added / Removed / Modified → **Monaco Diff Editor**

## Keyboard shortcuts

| Shortcut | Action |
| -------- | ------ |
| Ctrl+Enter | Compare |
| Ctrl+Shift+S | Swap |
| Ctrl+Shift+C | Clear |
| Ctrl+Shift+L | Share |
| Ctrl+, | Settings |

## Deploy on Vercel

This project is a static Vite SPA — no server or environment variables required. Share links work client-side via `/c/*` routes.

### One-click (Git)

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import the project in [Vercel](https://vercel.com/new).
3. Set **Root Directory** to this folder if the repo root is not `codecompare`.
4. Vercel auto-detects Vite. Confirm:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci`
5. Deploy. Production URL serves the app; `/c/<payload>` share links rewrite to the SPA.

### CLI

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # production
```

### Local production check

```bash
npm run build
npm run preview
```

Open `http://localhost:4173` and test a share link at `/c/...`.

Configured in `vercel.json`: SPA rewrites for share routes, asset caching, and security headers.

### Share links (Neon PostgreSQL)

Every share link is a fixed **8-character** URL like `/c/ABC12XYZ`. Comparison data is stored in Neon PostgreSQL — not embedded in the URL.

1. Create a [Neon](https://neon.tech) database and copy the connection string.
2. Set `DATABASE_URL` in `.env` locally and in the Vercel project environment variables.
3. Initialize the table:

```bash
npm run db:init
```

4. For local API routes (share create/load), run `npx vercel dev` instead of `npm run dev`.

Links expire after 90 days. The API auto-creates the `shares` table on first use if you skip `db:init`.

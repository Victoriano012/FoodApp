# FoodApp

A mobile-first recipe and shopping list app, built as a PWA so it can be installed on a phone and used like a native app. Hosted on Vercel, with Google sign-in: each user's data lives on the server, so it follows them across devices.

## Features

The app has three tabs, and you can swipe left/right anywhere to move between them (the pages follow your finger).

### 🍲 Recipes
- Create recipes with a name, photo, portions, ingredients, and markdown instructions.
- Photos are downscaled before saving, and can be viewed in a fullscreen lightbox.
- Scale a recipe's portions and add its ingredients to the shopping list with a chosen multiplier.
- Hold and drag to reorder recipes.

### 🛒 Shopping List
- Aggregates ingredients from the recipes you add, merging quantities for the same ingredient.
- Change a recipe's multiplier at any time and the quantities on the list adjust automatically.
- Add items manually too — new names are registered as known ingredients.
- Check items off as you shop, and hold-drag to reorder.

### 📋 Ingredients
- A registry of known ingredients with their units, so quantities merge consistently across recipes.
- Per-ingredient "auto-add" toggle: staples like salt or pepper can be excluded from ever entering the shopping list through recipes.
- Reorderable like the other lists.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router) — the UI itself is a client-side SPA ([React 19](https://react.dev/) + [React Router](https://reactrouter.com/)) served from a catch-all route
- [Auth.js v5](https://authjs.dev/) (`next-auth`) with Google sign-in; JWT sessions, everything gated in `proxy.js`
- Neon Postgres in production (`DATABASE_URL`), embedded [PGlite](https://pglite.dev/) locally — zero setup
- Per-user AES-256-GCM encryption at the app layer (`lib/crypto.js`): the database holds only ciphertext
- `react-markdown` + `remark-gfm` for recipe instructions

## How data flows

The client hydrates all four collections (`recipes`, `ingredients`, `shoppingList`, `shoppingRecipes`) from `GET /api/data` into an in-memory store (`src/store.js`) before rendering, reads/writes it synchronously like it used to use localStorage, and edits are debounce-saved back with `PUT /api/data`. Coming back to the app re-fetches, so edits made on another device appear. On first login, any data left by the old localStorage version of the app (same origin) is adopted automatically.

## Development

```bash
npm install
npm run dev      # dev server with an embedded local Postgres (data/pg)
npm run build    # production build
npm run lint     # run eslint
```

Set `AUTH_DEV_USER=you@example.com` to bypass Google sign-in locally (no OAuth setup needed). To test on a phone on the same network, run `npm run dev -- -H 0.0.0.0`.

## Deployment (Vercel)

Pushes to `main` deploy via the linked Vercel project. Required environment variables:

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (Vercel → Storage → Neon sets it automatically) |
| `DATA_ENCRYPTION_KEY` | `openssl rand -base64 32` — back it up, data is unrecoverable without it |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client (redirect URI: `https://<domain>/api/auth/callback/google`) |

---

*This app was built with the help of [Claude](https://claude.com/claude-code).*

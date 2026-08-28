# FoodApp

A mobile-first recipe and shopping list app, built as a PWA so it can be installed on a phone and used like a native app. Live at **https://victoriano012.github.io/FoodApp/**.

All data is stored locally in the browser (`localStorage`) — there is no backend or account.

## Features

The app has three tabs, and you can swipe left/right anywhere to move between them (the pages follow your finger).

### 🍲 Recipes
- Create recipes with a name, photo, portions, ingredients, and markdown instructions.
- Photos are downscaled before saving so they fit comfortably in local storage, and can be viewed in a fullscreen lightbox.
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

- [React 19](https://react.dev/) + [React Router](https://reactrouter.com/)
- [Vite](https://vite.dev/) with [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (installable, auto-updating PWA)
- `react-markdown` + `remark-gfm` for recipe instructions
- No backend — everything persists in `localStorage`

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build (output in dist/)
npm run preview  # preview the production build
npm run lint     # run eslint
```

To test on a phone on the same network, run `npm run dev -- --host` and open the LAN URL Vite prints.

## Deployment

Pushing to `main` triggers the GitHub Actions workflow in `.github/workflows/deploy.yml`, which builds the app and deploys it to GitHub Pages. The Vite `base` is set to `/FoodApp/` to match the repo name.

---

*This app was built with the help of [Claude](https://claude.com/claude-code).*

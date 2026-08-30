export default function manifest() {
  return {
    name: 'FoodApp',
    short_name: 'FoodApp',
    description: 'Recipes, ingredients and shopping list',
    start_url: '/',
    display: 'standalone',
    theme_color: '#2e7d32',
    background_color: '#ffffff',
    icons: [
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

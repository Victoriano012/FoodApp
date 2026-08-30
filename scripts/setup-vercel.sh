#!/usr/bin/env bash
# One-time production setup. Run `npx vercel login` first, and create a
# Google OAuth client (see the prompts below) before or during the run.
set -euo pipefail
cd "$(dirname "$0")/.."

npx vercel link --yes --project food-app

echo
echo "Generating AUTH_SECRET and DATA_ENCRYPTION_KEY..."
AUTH_SECRET=$(openssl rand -base64 32)
DATA_KEY=$(openssl rand -base64 32)
printf 'AUTH_SECRET=%s\nDATA_ENCRYPTION_KEY=%s\n' "$AUTH_SECRET" "$DATA_KEY" > .env.keys
echo "Both were also written to .env.keys (gitignored)."
echo ">>> Back up DATA_ENCRYPTION_KEY somewhere safe: without it the data is unrecoverable. <<<"
printf '%s' "$AUTH_SECRET" | npx vercel env add AUTH_SECRET production
printf '%s' "$DATA_KEY" | npx vercel env add DATA_ENCRYPTION_KEY production

echo
echo "Create a Google OAuth client at https://console.cloud.google.com/apis/credentials"
echo "  Type: Web application"
echo "  Authorized redirect URI: https://food-app-victor-conchello.vercel.app/api/auth/callback/google"
read -r -p "Paste the client ID: " GOOGLE_ID
read -r -p "Paste the client secret: " GOOGLE_SECRET
printf '%s' "$GOOGLE_ID" | npx vercel env add AUTH_GOOGLE_ID production
printf '%s' "$GOOGLE_SECRET" | npx vercel env add AUTH_GOOGLE_SECRET production

echo
echo "Last manual step: add a Neon Postgres database (sets DATABASE_URL) in"
echo "  https://vercel.com/victor-conchello/food-app/stores  ->  Create Database -> Neon"
read -r -p "Press Enter once the database is connected... " _

echo "Redeploying with the new environment..."
npx vercel --prod

echo "Done — open https://food-app-victor-conchello.vercel.app and sign in with Google."

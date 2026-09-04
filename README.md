# Snake Arena Phase 3

This version adds:
- Modern multi-page style UI
- Shop + coin economy
- 6 snake skins
- Local skin inventory/equipping
- Real Supabase email/password login
- Online profile
- Online coins/high score/game count sync
- Global leaderboard
- Difficulty, grid and sound settings
- Responsive mobile UI
- Bonus food (+30)
- Swipe + keyboard + buttons

## 1. First test without Supabase

Upload all files to GitHub and deploy to Vercel.

The game/shop/settings work in offline mode using localStorage.
Profile/login and global leaderboard will show that Supabase is not configured.

## 2. Connect Supabase

Create a Supabase project.

Open `config.js` and replace:
- `YOUR_SUPABASE_PROJECT_URL`
- `YOUR_SUPABASE_PUBLISHABLE_KEY`

Use only the browser-safe publishable key. Never use a service_role/secret key in this file.

## 3. Create the database

Open Supabase Dashboard → SQL Editor and run all of `supabase-schema.sql`.

The SQL creates:
- `profiles`
- `leaderboard`
- Row Level Security policies
- `submit_snake_score()` for atomic score/coin updates

## 4. Authentication redirect

In Supabase Auth URL Configuration, add your Vercel site URL as an allowed redirect URL.

For example:
https://YOUR-DOMAIN.vercel.app/

## 5. What is online vs local in this phase

Online:
- Login / signup
- Profile
- High score
- Games played
- Coins earned after submitted scores
- Global leaderboard

Local:
- Skin purchases/equipped skin
- Difficulty
- Grid
- Sound

The shop is intentionally not connected to real money yet. Real INR purchases should be added only after the secure backend/Razorpay phase.

## 6. Important security note

The frontend is never trusted. The prototype submits scores to a server function, but a future production version should add stronger anti-cheat/rate-limiting before treating scores or coin rewards as economically valuable.

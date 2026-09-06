# Game Arena – 11 Games

This build keeps every game in the main repository as a single JavaScript file.

## Root files
- index.html – Game Arena main menu
- app.js – navigation, profiles, friends, leaderboard integration
- style.css
- config.js
- supabase-schema.sql
- game-arena-supabase-schema.sql
- catapult.js
- target-rush.js
- highway-rush.js
- brick-blast.js
- 2048-master.js
- fruit-slice.js

## Games
1. Snake Arena
2. Birdy Bird
3. Archery
4. Tower
5. Reaction Time
6. Catapult King
7. Target Rush
8. Highway Rush
9. Brick Blast
10. 2048 Master
11. Fruit Slice

## Supabase
Run `supabase-schema.sql` in the Supabase SQL Editor before testing online leaderboards, profile photo uploads, or friends.

The schema includes:
- Separate Target Rush Classic / Time Attack / Survival leaderboards
- Highway Rush and Brick Blast leaderboards
- 2048 Master and Fruit Slice leaderboards
- Profile photo `avatars` storage bucket
- Friend requests and friendships

## GitHub/Vercel
Upload all root files without renaming or flattening them. The repository root `index.html` must be the Game Arena main menu.

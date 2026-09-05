# Snake Arena Phase 4

Adds three new games without removing Snake Arena or Birdy Bird:

- 🎯 Archery: target shooting with levels and 10 arrows.
- 🏗️ Tower: timing-based block stacking.
- ⚡ Reaction Time: random GO signal, early-tap detection, millisecond results.

Also adds:
- Home game hub with five games.
- Separate global leaderboards for all five games.
- Reaction leaderboard sorts fastest time first.
- Shared local coin wallet and Supabase reward functions for the new games.
- Same mobile-first UI, touch and pointer controls.

## Deploy
Replace `index.html`, `style.css`, `app.js`, and `supabase-schema.sql` in the existing repo. Keep your existing `config.js` values.

## Supabase
Run `supabase-schema.sql` in the Supabase SQL Editor. The new SQL adds three leaderboard tables and secure reward functions for Archery, Tower, and Reaction Time.

## Notes
For production, add stronger anti-cheat/rate limiting before treating leaderboard scores or coins as economically valuable. Client games remain inherently tamperable until server-side validation is strengthened.


## Phase 6 – Catapult King
Catapult King is integrated with the shared profile, local coin wallet, Supabase score submission, and global leaderboard. Run the appended Catapult King migration section in `supabase-schema.sql` before using online Catapult rankings.

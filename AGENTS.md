# Found – notes for agents

- Build: `npm run build` (Vite). Note `dist/` is committed and the build rewrites it; to only check that it compiles, use `npx vite build --outDir <temp dir>` (the 404 plugin still writes `dist/404.html`, delete it after).
- No test suite or linter is configured.
- Supabase: SQL in `supabase/migrations/` is run by hand in the dashboard SQL editor, in filename order. Front-end uses only the publishable/anon key (`.env`, see `.env.example`).
- User data (selected lists, logs, streak/settings) lives in Supabase (`user_lists`, `logs`, `profiles`); photos in the private `log-photos` bucket at `<userId>/<logId>.jpg` + `_thumb.jpg`. Data access goes through `src/services/userData.js` and `src/hooks/useUserData.js`; localStorage is only a per-user cache (`found_cache:<userId>`).

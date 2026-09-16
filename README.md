# Carmeli — נוכחות יומית

Mobile-first React app for daily soldier attendance, operational duty, and weekly shifts, backed by **Firebase Firestore**.

## Setup

1. **Firebase**: Create a project → add a Web app → enable **Firestore**. See [`firebase/README.md`](firebase/README.md) and publish [`firebase/firestore.rules`](firebase/firestore.rules).
2. **Environment**: Copy `.env.example` to `.env` with your Firebase web config.
   - Optional: `VITE_SHARE_PHONE` for WhatsApp share from the admin page.
3. **Logo**: Place the unit logo at `public/logo.png`.
4. **Install & run**:

```bash
npm install
npm run dev
```

## Pages

- `/` — Status updates (name remembered in local storage).
- `/shifts` — Weekly shift board (read-only; admin can unlock editing).
- `/admin` — Daily summary, add soldiers, change admin password, share summary.

The default admin password is `112233` until changed in the admin panel (stored in Firestore `settings/app`).

Default operational duty / shift range: **17.9.2026 – 15.12.2026**, editable in Admin.

After updating rules, republish them in the Firebase console so `shifts_schedule` and `settings` are allowed.

## Vercel

Set these environment variables in the Vercel project (same values as `.env`):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Production note

Default Firestore rules allow open read/write for a simple internal rollout. Restrict rules before deploying publicly.

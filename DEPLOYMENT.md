# Deployment Guide (all free tiers)

This deploys: **Frontend → Vercel**, **Backend → Render**, **Database →
MongoDB Atlas**. Total cost: $0. Takes ~15-20 minutes.

---

## Step 1 — MongoDB Atlas (database)

1. Go to https://www.mongodb.com/cloud/atlas/register and sign up (free).
2. Create a new project → **Build a Database** → choose the **M0 Free**
   tier → pick any region close to you → **Create**.
3. **Database Access** (left sidebar) → **Add New Database User**:
   - Username/password auth, set a username and a strong password
   - Note the password down, you'll need it in Step 3.
4. **Network Access** (left sidebar) → **Add IP Address** → **Allow
   Access From Anywhere** (`0.0.0.0/0`). This is required because
   Render's free tier uses dynamic IPs.
5. Go back to **Database** → **Connect** → **Drivers** → copy the
   connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<username>`/`<password>` with what you set in step 3, and add
   a database name before the `?`, e.g.:
   ```
   mongodb+srv://myuser:[email protected]/veloop_tap_earn?retryWrites=true&w=majority
   ```
   Save this full string — this is your `MONGO_URI`.

---

## Step 2 — Backend on Render

1. Go to https://render.com and sign up (free), connect your GitHub
   account when prompted.
2. **New** → **Blueprint** → select the `veloop-tap-earn` repo. Render
   will detect `render.yaml` in the repo root and pre-fill the service.
   (If Blueprint isn't available on your account, instead do **New** →
   **Web Service** → select the repo → set **Root Directory** to
   `backend`, **Build Command** to `npm install`, **Start Command** to
   `npm start`, **Plan** to Free.)
3. Before deploying, set these environment variables in the Render
   dashboard (Environment tab):
   - `MONGO_URI` → the connection string from Step 1
   - `CLIENT_ORIGIN` → leave blank for now, you'll fill this in Step 3
     after you have your Vercel URL (or set to `*` temporarily)
   - `JWT_SECRET` / `JWT_REFRESH_SECRET` → Render can auto-generate these
     (already configured in `render.yaml`), or set your own long random
     strings
4. Click **Create Web Service** / **Apply**. Wait for the build+deploy to
   finish (~2-3 min). Your backend URL will look like:
   ```
   https://veloop-tap-earn-backend.onrender.com
   ```
5. Once live, run the seed script once so there's demo data. In the
   Render dashboard → your service → **Shell** tab, run:
   ```
   npm run seed
   ```
   (Or run it locally with `MONGO_URI` pointed at Atlas.)

**Note:** Render's free tier spins the service down after 15 minutes of
inactivity and takes ~30-50 seconds to wake up on the next request —
normal for a free demo deployment, not a bug.

---

## Step 3 — Frontend on Vercel

1. Go to https://vercel.com and sign up (free), connect GitHub.
2. **Add New** → **Project** → import the `veloop-tap-earn` repo.
3. Vercel will ask for the root directory — set it to `frontend`
   (important: this repo has both backend and frontend in one repo).
   `vercel.json` inside `frontend/` is already configured for a Vite SPA.
4. Add an environment variable:
   - `VITE_API_BASE_URL` → `https://veloop-tap-earn-backend.onrender.com/api`
     (use your actual Render URL from Step 2, with `/api` at the end)
5. Click **Deploy**. You'll get a URL like:
   ```
   https://veloop-tap-earn.vercel.app
   ```

---

## Step 4 — Connect them (CORS)

Go back to Render → your backend service → Environment → set
`CLIENT_ORIGIN` to your Vercel URL from Step 3, e.g.:
```
CLIENT_ORIGIN=https://veloop-tap-earn.vercel.app
```
Save — Render will redeploy automatically. This lets the backend accept
requests from your live frontend (CORS is locked to this one origin for
security).

---

## Step 5 — Try it

Open your Vercel URL, register a new account (or log in with a seeded
demo account — see the main README for credentials), and tap away. The
Tap League, missions, and admin dashboard (`/admin`, log in as
`admin@veloop.dev`) all work the same as local dev, just live.

---

## Troubleshooting

- **"Network Error" on the frontend** → check `VITE_API_BASE_URL` is
  correct and includes `/api`, and that the Render backend is awake
  (first request after idle can take up to a minute).
- **CORS error in browser console** → double-check `CLIENT_ORIGIN` on
  Render exactly matches your Vercel URL (no trailing slash).
- **500 errors on every request** → check Render logs (Logs tab) — most
  likely `MONGO_URI` is wrong or the Atlas IP allowlist isn't set to
  `0.0.0.0/0`.
- **Empty missions/season on first load** → you forgot to run
  `npm run seed` against the Atlas database (Step 2.5).

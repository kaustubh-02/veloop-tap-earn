# VELoop Rewards — Tap & Earn

Full-stack MERN implementation of the VELoop Tap & Earn module: a
server-authoritative tap-to-earn game with energy, upgrades, boosts,
missions, daily challenges, Lucky Tap/Spin, a seasonal Tap League
leaderboard, a demo ad system, and an admin control center — built to the
spec in `Tap_Earn_Page_task_Full_Stack.pdf`.

## Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT auth
- **Frontend:** React 18 (Vite), React Router, Axios

## Architecture overview

```
┌─────────────────────────┐        HTTPS / JSON         ┌──────────────────────────────┐
│   React (Vite) Frontend │ ───────────────────────────▶ │   Express REST API (Node)    │
│                          │ ◀─────────────────────────── │                              │
│  TapEarnPage             │      JWT Bearer token        │  routes/  → controllers/     │
│  TapLeaguePage            │                              │  → services/  → models/      │
│  AdminPage                │                              │                              │
└─────────────────────────┘                               └──────────────┬───────────────┘
                                                                            │ Mongoose
                                                                            ▼
                                                             ┌──────────────────────────────┐
                                                             │          MongoDB              │
                                                             │  User, TapState, TapEvent,    │
                                                             │  EconomyConfig, RewardLedger,  │
                                                             │  TapSeason, TapLeagueScore,    │
                                                             │  Mission, Spin, AdEvent, …     │
                                                             └──────────────────────────────┘
```

**Request lifecycle for one tap** (`POST /api/tap`), the core of the app:

```
Frontend (TapCircle)
  │  1. Animate press/ripple/haptics immediately (no waiting on network)
  │  2. Generate UUID requestId, POST /api/tap
  ▼
routes/tapRoutes.js → middleware/auth.js (verify JWT)
  ▼
controllers/tapController.js → services/tapService.js
  │
  │  Inside one MongoDB transaction (session.withTransaction):
  │   3. Idempotency check on (userId, requestId)          → models/TapEvent.js
  │   4. Regenerate energy from elapsed time                → services/energyService.js
  │   5. Anti-abuse timing/burst/pattern checks              → services/antiAbuseService.js
  │   6. Resolve multitap/efficiency/boost expiry             → services/upgradeStateService.js
  │   7. Resolve energy/shield/bank consumption                → services/energyService.js
  │   8. Roll reward (SVE/VE/Spin/Gems/Tokens) from config      → services/rewardRollService.js
  │   9. Apply efficiency+boost multipliers, credit balance      → services/rewardLedgerService.js
  │  10. Increment season score, mission/daily progress            → services/leaderboardService.js,
  │                                                                    services/missionService.js
  │  11. Write TapState + TapEvent + RewardLedger atomically
  ▼
Response: { reward, state, balances }
  │
  ▼
Frontend reconciles UI with the authoritative response (never trusts its own optimistic guess)
```

Every other feature (upgrades, boost, energy bank/shield, missions, daily
challenge, lucky spin, league, ads, admin) follows the same
`route → controller → service → model` layering, and every service that
changes a balance goes through `rewardLedgerService.js` so every currency
change is auditable in `RewardLedger`.

## Project layout

```
veloop-tap-earn/
├── README.md
├── docs/
│   └── postman_collection.json      # Every API endpoint, ready to import into Postman
│
├── backend/
│   ├── server.js                    # Express app entry point — wires all routes, starts the server
│   ├── package.json
│   ├── .env.example                 # Every environment variable, documented
│   │
│   ├── config/
│   │   ├── db.js                    # MongoDB connection
│   │   └── tapEconomy.defaults.js   # Default economy values — used ONLY to seed the DB once;
│   │                                   the DB document is the real source of truth after that
│   │
│   ├── models/                      # 16 Mongoose schemas — one collection each
│   │   ├── User.js                  # Identity, profile, authoritative currency balances
│   │   ├── TapState.js              # Live per-user state: energy, multiplier, efficiency,
│   │   │                              streak, combo, shield, energy bank, anti-abuse bookkeeping
│   │   ├── TapEvent.js              # Immutable record of every ACCEPTED tap (idempotency + audit)
│   │   ├── Upgrade.js               # Every upgrade purchase (capacity/multitap/recharge/efficiency)
│   │   ├── Boost.js                 # Every 30s boost activation, logged
│   │   ├── Mission.js / UserMission.js           # Mission definitions + per-user progress
│   │   ├── DailyChallenge.js / UserDailyChallenge.js  # Daily challenge + per-user progress
│   │   ├── Spin.js                  # Lucky Tap spin results (idempotent via requestId)
│   │   ├── TapSeason.js             # Season lifecycle: start/end, reward rules snapshot
│   │   ├── TapLeagueScore.js        # Per-(season,user) leaderboard score
│   │   ├── RewardLedger.js          # Append-only audit log of every balance change
│   │   ├── AdEvent.js               # Demo ad system event tracking
│   │   ├── EconomyConfig.js         # THE single source of truth for every tunable number,
│   │   │                              versioned — admin edits create a new version, never
│   │   │                              overwrite history
│   │   ├── ConfigAudit.js           # Who changed what config value, when, and why
│   │   └── index.js                 # Single import point for all models
│   │
│   ├── services/                    # ALL business logic lives here — controllers stay thin
│   │   ├── economyConfigService.js  # Read/write the active EconomyConfig, with in-process cache
│   │   ├── energyService.js         # Timestamp-based energy/bank regen, shield resolution
│   │   ├── antiAbuseService.js      # 200ms floor + burst detection + identical-interval detection
│   │   ├── rewardRollService.js     # Every server-side random roll (tap reward, spin, mystery,
│   │   │                              precision) + multiplier application with correct rounding
│   │   ├── rewardLedgerService.js   # THE only place allowed to mutate User.balances —
│   │   │                              every call writes a RewardLedger row
│   │   ├── tapService.js            # Orchestrates the full tap flow in one MongoDB transaction
│   │   ├── upgradeStateService.js   # Resolves multitap/efficiency/boost expiry against TapState
│   │   ├── upgradePurchaseService.js # Purchase logic for capacity/multitap/recharge/efficiency
│   │   ├── boostEnergyService.js    # Boost activation, Energy Bank purchase, Energy Shield purchase
│   │   ├── luckyTapService.js       # Idempotent Lucky Tap spin execution
│   │   ├── missionService.js        # Mission/daily-challenge progress tracking + claiming
│   │   ├── seasonService.js         # Active season lookup/creation, rollover trigger
│   │   ├── leaderboardService.js    # Top-100 + sticky my-rank query, season reward distribution
│   │   ├── adService.js             # DemoAdProvider abstraction, opportunity windows, verification
│   │   └── stateSerializerService.js # Builds the full authoritative GET /api/tap/state payload
│   │
│   ├── controllers/                 # Thin HTTP handlers — parse request, call a service, respond
│   │   ├── authController.js
│   │   ├── tapController.js
│   │   ├── upgradeController.js
│   │   ├── boostEnergyController.js
│   │   ├── missionController.js
│   │   ├── luckyController.js
│   │   ├── leagueController.js
│   │   ├── adController.js
│   │   └── adminController.js
│   │
│   ├── routes/                      # One Express router per feature area, mounted in server.js
│   │   ├── authRoutes.js            # /api/auth/*
│   │   ├── tapRoutes.js             # /api/tap, /api/tap/state, /api/tap/history
│   │   ├── leagueRoutes.js          # /api/tap/league, /api/tap/season
│   │   ├── upgradeRoutes.js         # /api/tap/upgrade
│   │   ├── boostEnergyRoutes.js     # /api/tap/boost/*, /energy-bank/*, /shield/*
│   │   ├── missionRoutes.js         # /api/tap/missions, /api/tap/daily-challenge
│   │   ├── luckyRoutes.js           # /api/tap/lucky, /api/tap/lucky/spin
│   │   ├── adRoutes.js              # /api/ads/*
│   │   └── adminRoutes.js           # /api/admin/* (requireAdmin-gated)
│   │
│   ├── middleware/
│   │   ├── auth.js                  # requireAuth (JWT verify), requireAdmin (role gate)
│   │   └── errorHandler.js          # Centralized error → HTTP status/response mapping
│   │
│   ├── scripts/
│   │   └── seed.js                  # Seeds EconomyConfig v1, admin, demo users, season,
│   │                                   sample missions, today's daily challenge
│   │
│   └── tests/                       # Jest unit tests — pure logic, no DB required
│       ├── energyService.test.js         # Regen math, max-cap, shield active/cooldown windows
│       ├── antiAbuseService.test.js      # 200ms floor, burst detection, identical-interval detection
│       ├── rewardRollService.test.js     # 200k-sample probability distribution, spin table, rounding
│       └── expiryAndThresholds.test.js   # Multitap/efficiency/boost expiry, 299-vs-300 Lucky Tap,
│                                            250-tap Mystery Tap milestone
│
└── frontend/
    ├── index.html
    ├── vite.config.js                # Dev server + /api proxy to the backend
    ├── package.json
    ├── .env.example
    │
    └── src/
        ├── main.jsx                  # React root, wraps <App /> in <BrowserRouter>
        ├── App.jsx                   # All routes: /login, /register, /tap, /league, /admin, …
        │
        ├── styles/
        │   └── tokens.css            # Design system CSS variables (#161827 base, gold/blue accents)
        │
        ├── api/
        │   ├── client.js             # Axios instance + auto-refresh-on-401 interceptor
        │   └── endpoints.js          # One typed function per backend endpoint (authApi/tapApi/adminApi)
        │
        ├── context/
        │   └── AuthContext.jsx       # login/register/logout, current user, token bootstrap
        │
        ├── hooks/
        │   └── useTapEarn.js         # Central Tap & Earn state: loads state, exposes sendTap()
        │                               with client-side 200ms lock + server reconciliation
        │
        ├── pages/
        │   ├── TapEarnPage.jsx       # Main screen — assembles every component below
        │   ├── TapLeaguePage.jsx     # Top-100 leaderboard + sticky my-rank
        │   ├── AdminPage.jsx         # Economy config editor + analytics dashboard
        │   ├── LoginPage.jsx / RegisterPage.jsx
        │   └── PlaceholderPages.jsx  # Home / Mine / Wallet / Profile stubs (bottom-nav consistency)
        │
        └── components/
            ├── TapCircle.jsx         # Hero interaction: press/ripple/glow animation + haptics
            ├── RewardToast.jsx       # Floating "+1 SVE" feedback on every accepted tap
            ├── EnergyBar.jsx         # Current/max energy + live recharge countdown
            ├── BalanceCard.jsx       # VE balance + currency strip
            ├── TapMultiplierCard.jsx # Multitap + Tap Efficiency state
            ├── BoostCard.jsx         # Active/inactive 30s boost
            ├── StreakIndicator.jsx   # Consecutive-tap streak counter
            ├── TapShortcuts.jsx      # Shortcut row → opens each drawer below
            ├── Drawer.jsx            # Generic bottom-sheet used by every advanced feature
            ├── PurchaseRow.jsx       # Shared cost/benefit/duration row for every purchase modal
            ├── UpgradeDrawer.jsx     # Capacity / Multitap / Recharge / Efficiency purchase tabs
            ├── EnergyBankModal.jsx   # 3-day Energy Bank purchase + expiry countdown
            ├── EnergyShieldModal.jsx # 30s Energy Shield activation + cooldown
            ├── MissionPanel.jsx      # Active missions with progress bars + claim
            ├── DailyChallengeCard.jsx
            ├── LuckyTapModal.jsx     # Eligibility progress + server-authoritative spin
            ├── LeaderboardRow.jsx    # Single league row, special top-3 treatment
            ├── MyRankStickyRow.jsx   # Persistent bottom row for the current user's rank
            ├── RewardHistoryDrawer.jsx
            ├── SkeletonBlock.jsx     # Loading placeholder (prevents layout jump)
            ├── Countdown.jsx         # Shared live countdown for every temporary feature
            └── BottomNav.jsx         # Home / Tap & Earn / Mine / Wallet / Profile
```

## Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for a step-by-step guide to deploy
this for free: frontend on Vercel, backend on Render, database on
MongoDB Atlas.

## Getting started (local development)

### 1. Backend

```bash
cd backend
cp .env.example .env      # edit MONGO_URI etc. if needed
npm install
npm run seed               # creates EconomyConfig v1, admin, demo users,
                            # an active season, sample missions, today's
                            # daily challenge
npm run dev                # starts on http://localhost:5000
```

Requires a MongoDB instance reachable at `MONGO_URI` (defaults to
`mongodb://127.0.0.1:27017/veloop_tap_earn` — install MongoDB locally, or
point it at an Atlas connection string).

Seeded accounts (see `.env` for exact values):
- Admin: `admin@veloop.dev` / `Admin@12345`
- Demo users: `demo1@veloop.dev` … `demo10@veloop.dev` / `Demo@12345`

### 2. Frontend

```bash
cd frontend
cp .env.example .env       # VITE_API_BASE_URL, defaults to /api via proxy
npm install
npm run dev                 # starts on http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:5000` (see
`vite.config.js`); set `VITE_API_PROXY_TARGET` if your backend runs
elsewhere.

### 3. Try it

1. Open `http://localhost:5173`, register a new account (or log in as a
   seeded demo user).
2. You'll land on Tap & Earn — tap the VE circle. Rewards, energy,
   streak/combo, and the reward toast are all driven by the backend
   response of `POST /api/tap`.
3. Visit `/league` (or the League shortcut) for the Tap League leaderboard.
4. Log in as the seeded admin and visit `/admin` for the economy config
   editor and analytics dashboard.

## Architecture notes

### Single source of truth for the economy

Every tunable number (reward probabilities/ranges, energy values, upgrade
prices, boost/shield/bank rules, Lucky Tap table, league rewards, ad
thresholds, security thresholds) lives in one `EconomyConfig` MongoDB
document, read through `services/economyConfigService.js`. Admin edits via
`PUT /api/admin/config` create a new version (history is preserved) and
write a `ConfigAudit` row. Nothing in the frontend hard-codes an economic
value — the Upgrade drawer, for example, always reflects whatever the
backend currently reports.

### Tap reward mode: guaranteed vs probabilistic

`config.reward.simpleMode` (default: `true`) controls how every tap's
reward is decided:

- **`true` (live default):** every accepted tap gives a guaranteed 1 VE,
  scaled by the user's current Multitap/Efficiency/Boost multipliers —
  e.g. at Multitap x2 a tap gives +2 VE and consumes 2 Energy. This is the
  simple, always-visible-feedback mode the product currently ships with.
- **`false`:** falls back to the original probability-distribution system
  from the spec (60% SVE / 20% VE / 2% Spin / 5% Gems / 13% Tokens per
  tap). No redeploy needed to switch — change it live via
  `PUT /api/admin/config` or the Admin dashboard's Config tab.

Both modes still go through the same server-authoritative pipeline below
— energy consumption, anti-abuse checks, and ledger auditing are
identical either way.

### Server-authoritative tap processing

`services/tapService.js` implements the exact validation sequence from the
spec: idempotency check → energy regeneration from timestamps → anti-abuse
timing checks → energy/shield resolution → server-side reward roll →
multiplier application → atomic MongoDB transaction writing TapState,
TapEvent, RewardLedger, and TapLeagueScore together. The frontend's
`useTapEarn` hook animates every tap immediately for responsiveness but
never credits currency locally — it always reconciles with the server
response.

### Anti-abuse

Three layers: (1) a hard 200ms floor between accepted taps, (2) a rolling
burst-window check, (3) identical-interval detection for auto-clicker
patterns. See `services/antiAbuseService.js` and its unit tests.

### Idempotency

Every tap and every spin carries a client-generated UUID `requestId`.
`TapEvent` and `Spin` both have a unique `(userId, requestId)` index, so a
retried request returns the original result instead of double-processing.

### Money math

VE/SVE/Gems use MongoDB `Decimal128` end-to-end (never native floats) to
avoid binary floating-point drift on authoritative balances. Tokens/Spins/
Fragments are plain integers with atomic `$inc` updates.

## Testing

```bash
cd backend
npm test
```

37 unit tests cover: energy regeneration from timestamps (including long
offline periods and the max-capacity cap), the 200ms/burst/identical-
interval anti-abuse checks, the full tap reward probability distribution
across a 200k-sample simulation, the Lucky Tap spin table, the 299-vs-300
tap Lucky Tap threshold, the 250-tap Mystery Tap milestone, and
multitap/efficiency/boost expiry resolution.

These are pure-logic tests that don't require a running MongoDB. Full
integration tests (hitting real API routes end-to-end against MongoDB)
are the natural next addition — the seed script and Postman collection
in `docs/postman_collection.json` are set up to support that manually in
the meantime.

## API surface

See `docs/postman_collection.json` for every endpoint with example
payloads, or `backend/routes/` for the exact route definitions. Summary:

- `POST /api/auth/register`, `/login`, `/refresh`, `GET /me`
- `GET /api/tap/state`, `POST /api/tap`, `GET /api/tap/history`
- `POST /api/tap/upgrade` (capacity, multitap, rechargeSpeed, tapEfficiency)
- `POST /api/tap/boost/activate`, `/energy-bank/purchase`, `/shield/purchase`
- `GET /api/tap/missions`, `POST /api/tap/missions/:id/claim`
- `GET /api/tap/daily-challenge`, `POST /api/tap/daily-challenge/claim`
- `GET /api/tap/lucky`, `POST /api/tap/lucky/spin`
- `GET /api/tap/league`, `GET /api/tap/season`
- `GET /api/ads/opportunity`, `POST /api/ads/event`, `POST /api/ads/claim`
- `GET/PUT /api/admin/config`, `GET /api/admin/config/audit`,
  `GET /api/admin/analytics/{taps,rewards,anti-abuse,ads}`,
  `GET /api/admin/seasons`, `POST /api/admin/seasons/rollover`,
  `GET /api/admin/ledger`, `POST /api/admin/ledger/adjust`

## Known limitations / next steps

This was built end-to-end in a single implementation pass covering every
spec requirement, but a few things are worth flagging honestly for a real
production rollout:

- **Integration tests**: current tests are pure-logic (no DB). Adding
  `mongodb-memory-server`-based route tests would close the loop on the
  spec's "double-spend/double-award under simultaneous requests" test
  requirement (the transaction logic is written for it — see
  `tapService.js` — but isn't yet exercised by an automated concurrent-
  request test).
- **Config cache invalidation across instances**: `economyConfigService`
  caches the active config in-process for hot-path performance. In a
  multi-instance deployment, admin edits would need a pub/sub invalidation
  signal (e.g. Redis) to propagate instantly to every instance; currently
  each instance re-reads on its own cache miss.
- **Existing VELoop auth integration**: per the task, this build uses a
  standalone JWT auth system rather than integrating with a pre-existing
  VELoop auth service, since none was provided.
- **Real ad network**: `DemoAdProvider` is a working, replaceable
  abstraction, but it simulates verification rather than calling a real
  ad SDK's server-to-server callback.

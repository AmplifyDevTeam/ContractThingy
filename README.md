# Amplify ContractOS

Internal contract, agreement, and document automation for **Amplify Media Technologies**.

Generate employment and client agreements from an approved clause library, send them for e-signature, track status, and keep a searchable knowledge base of historical Amplify agreements. Optional Gemini assists with recommendations and insights — it never invents legal wording.

## What it does

- **People & clients** — staff and company records with employment/relationship status  
- **Generate** — guided wizard → locked templates + approved clauses  
- **Sign** — recipient + company countersign, live status sync  
- **Knowledge** — real historical PDFs and patterns (no fictional demos)  
- **Settings** — branding, signing defaults, email, security, optional AI  
- **Audit** — who changed what, under each document and in a global log  

## Architecture

Split for separate deploys:

| Piece | Stack | Deploy |
| --- | --- | --- |
| `frontend/` | Next.js 16 (App Router) | Vercel — Root Directory `frontend` |
| `backend/` | Hono API (Node) | Vercel — Root Directory `backend` |
| Data | Firebase **Firestore** (Spark / free) | No Cloud Storage required — PDFs & signatures live in Firestore |

```
Browser → Frontend (cookie session) → Backend API (Bearer JWT) → Firestore
```

## Local development

```bash
cp .env.example .env.local
# set SESSION_SECRET, BOOTSTRAP_ADMIN_*, optional GEMINI_API_KEY

npm install
npm run seed          # local JSON seed under .data/
npm run dev:api       # http://localhost:4000
npm run dev:web       # http://localhost:3000
```

Local-only fallback login (when no `BOOTSTRAP_ADMIN_*` is set): `admin@localhost` / `change-me-now`.
This account and password are **rejected in production** — use Google sign-in or a real bootstrap admin.

### Auth (Firebase Google + email)

1. Firebase Console → **Authentication** → enable **Google** and **Email/Password**  
2. Add authorized domains: `localhost`, your frontend `*.vercel.app`  
3. Project settings → Web app → copy config into **frontend** env:  
   `NEXT_PUBLIC_FIREBASE_API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `APP_ID`  
4. Backend already needs Admin SDK (`FIREBASE_PROJECT_ID`, `CLIENT_EMAIL`, `PRIVATE_KEY`) to verify ID tokens  
5. Signup policy on backend:  
   - First user → `SUPER_ADMIN`  
   - Production: keep `AUTH_OPEN_SIGNUP=false`; use `AUTH_ALLOWED_DOMAINS` and/or invite emails in Settings → Users  
   - Password login is disabled in production unless `ALLOW_PASSWORD_LOGIN=true`  

## Production (Firebase + Vercel)

### Firebase (Spark)

1. Create project → enable **Firestore** (skip Storage).  
2. Deploy rules:

```bash
cd backend
npx firebase login
npx firebase deploy --only firestore:rules --project amplify-contractos
```

3. Service account → backend env:  
   `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

### Vercel — two projects, same Git repo

**Backend** (`Root Directory: backend`)

| Env | Purpose |
| --- | --- |
| `DATA_ADAPTER` | `firestore` |
| `FIREBASE_*` | Admin credentials |
| `SESSION_SECRET` | JWT signing |
| `APP_URL` | Frontend public URL (signing links) |
| `CORS_ORIGINS` | Frontend origin |
| `BOOTSTRAP_ADMIN_EMAIL` / `PASSWORD` | Optional local password admin |
| `AUTH_ALLOWED_DOMAINS` | e.g. `amplifymediatechnologies.com` |
| `AUTH_OPEN_SIGNUP` | `true` to allow any Firebase user to join |
| `AUTH_DEFAULT_ROLE` | Role for new self-signups (default `VIEWER`) |
| `ALLOW_PASSWORD_LOGIN` | Leave unset/`false` in production (Google only) |
| `EMAIL_PROVIDER` / `EMAIL_API_KEY` / `EMAIL_FROM` | `resend` + API key. **Required** — without it signing links, OTP codes and completion emails are only logged, and client agreements (OTP) cannot be signed |
| `PROXY_SHARED_SECRET` | Same random value on frontend + backend. Lets the API record the signer's real IP/user-agent (and rate-limit per signer) instead of Vercel's |
| `CHROMIUM_PACK_URL` | Optional. `@sparticuz/chromium` pack URL if Vercel doesn't bundle the Chromium binary (see PDF notes) |

**Frontend** (`Root Directory: frontend`)

| Env | Purpose |
| --- | --- |
| `API_URL` | Backend public URL |
| `APP_URL` | This frontend’s URL |
| `NEXT_PUBLIC_API_URL` | Same as `API_URL` if needed client-side |
| `NEXT_PUBLIC_FIREBASE_*` | Web app config for Google / email Auth |
| `PROXY_SHARED_SECRET` | Same value as the backend |

After deploy: open `https://<backend>/health` once to seed → log in on the frontend.

### Source agreement PDFs (Knowledge → Open PDF)

The historical PDFs live only on the machine that first seeded the workspace (`.data/storage/source-agreements`).
Upload them to Firestore once:

```bash
cd backend
DATA_ADAPTER=firestore npm run upload:sources     # add --force to re-upload
```

### PDFs on Vercel

The API renders PDFs with `playwright-core` + `@sparticuz/chromium` on Vercel and full Playwright locally.
If Chromium can't start, downloads fall back to a print-ready page (browser "Save as PDF"), and a finalized
agreement is stored as an HTML record with its SHA-256 instead of failing. If the function can't find the
Chromium binary, set `CHROMIUM_PACK_URL` to the matching `chromium-v<version>-pack.x64.tar` release asset from
github.com/Sparticuz/chromium, and give the API function ≥1 GB memory.

### Library updates

Templates/clauses/themes are seeded from code. Bump `LIBRARY_REVISION` in `backend/src/lib/seed/state.ts` when
you change them; Firestore upserts the library once per revision. Documents are pinned to the exact clause
versions they were generated with, so existing agreements never change.

## Repo layout

```
frontend/   Next.js UI, cookies, PDF proxy routes
backend/    Auth, CRUD, generate, sign, PDF render, AI, email
.data/      Local JSON store (gitignored)
```

## Notes

- AI suggestions are labeled in the UI (and hidden when no `GEMINI_API_KEY` is set); approved templates/clauses stay library-sourced.  
- PDF Chromium on free Vercel may be limited; local Playwright works fully.  
- Never commit `.env.local` or `backend/.secrets/`.

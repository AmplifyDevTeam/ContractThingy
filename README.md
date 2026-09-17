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

Default local login (after seed): `admin@localhost` / `change-me-now`

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
| `BOOTSTRAP_ADMIN_EMAIL` / `PASSWORD` | First admin (set before first request) |

**Frontend** (`Root Directory: frontend`)

| Env | Purpose |
| --- | --- |
| `API_URL` | Backend public URL |
| `APP_URL` | This frontend’s URL |
| `NEXT_PUBLIC_API_URL` | Same as `API_URL` if needed client-side |

After deploy: open `https://<backend>/health` once to seed → log in on the frontend.

## Repo layout

```
frontend/   Next.js UI, cookies, PDF proxy routes
backend/    Auth, CRUD, generate, sign, PDF render, AI, email
.data/      Local JSON store (gitignored)
```

## Notes

- AI suggestions are labeled in the UI; approved templates/clauses stay library-sourced.  
- PDF Chromium on free Vercel may be limited; local Playwright works fully.  
- Never commit `.env.local` or `backend/.secrets/`.

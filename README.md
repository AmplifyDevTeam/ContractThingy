# Amplify ContractOS

Split into two deployable apps + free Firebase (Firestore only):

| Piece | Host | Root |
| --- | --- | --- |
| `frontend/` | Vercel project A | Root Directory = `frontend` |
| `backend/` | Vercel project B | Root Directory = `backend` |
| Data | Firebase Spark (free) | **Firestore only** — no Cloud Storage |

## Local development

```bash
cp .env.example .env.local
npm install
npm run seed
npm run dev:api   # :4000
npm run dev:web   # :3000
```

## 1) Free Firebase setup

1. Create a project at [Firebase Console](https://console.firebase.google.com) (Spark / free).
2. Enable **Firestore** (production mode). Skip Storage.
3. Deploy Firestore rules:

```bash
cd backend
npx firebase-tools login
npx firebase deploy --only firestore:rules --project amplify-contractos
```

4. Service account JSON → env:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
5. First API request auto-seeds Firestore when the org is empty. Set `BOOTSTRAP_ADMIN_*` on the backend before that.

PDFs and signatures are stored as chunked docs under `organizations/{org}/files` (no paid Storage).

## 2) Two Vercel projects (same Git repo)

### Frontend — Root Directory `frontend`
- `API_URL` = backend URL
- `APP_URL` = this frontend URL

### Backend — Root Directory `backend`
- `DATA_ADAPTER=firestore`
- Firebase keys above
- `SESSION_SECRET`, `APP_URL`, `CORS_ORIGINS`, `BOOTSTRAP_ADMIN_*`

## Auth

Browser → frontend cookie → frontend server → API Bearer token. Admin SDK bypasses Firestore rules (rules deny all client SDK access).

# Instructions

How to install, start, and use every service in this repo, locally.
Pairs with [`ARCHITECTURE.md`](./ARCHITECTURE.md), which explains *why*
the services are shaped this way — this file is just the "what do I
type" reference.

Five services exist and run today: `gateway-nest`, `chatbot-rag-python`,
`frontend-angular`, `register-form-angular`, `lma-mock-nest`.
`voice-recognition-python`, `speech-to-text-node`, and `graphql-bff` are
planned only — nothing to install or run for them yet (see
`ARCHITECTURE.md`'s services table).

## Prerequisites

| Tool | Used by | Notes |
|---|---|---|
| Node.js 20+ | `gateway-nest`, `frontend-angular`, `register-form-angular`, `lma-mock-nest` | repo was set up against Node 24 |
| npm | `gateway-nest`, `frontend-angular`, `register-form-angular`, `lma-mock-nest` | all use `package-lock.json`, not Bun/Yarn/pnpm |
| Python 3.10+ | `chatbot-rag-python` | needs a version new enough for current `torch`/`fastapi`; the system `python3` on this Mac is 3.9.6, which is **too old** — install a newer Python (e.g. via `brew install python@3.12` or `pyenv`) and use that instead |
| Docker Desktop | `gateway-nest`, `chatbot-rag-python` | each service has its own `docker-compose.yml` for its own Postgres — `lma-mock-nest` needs no database, it's in-memory only |

## Services at a glance

| Service | Tech | Port | Depends on |
|---|---|---|---|
| `frontend-angular` | Angular 22 + PrimeNG | `4200` | `gateway-nest` running |
| `register-form-angular` | Angular 22 (standalone SPA) | `4222` | `lma-mock-nest` running — talks to it directly, not through `gateway-nest` (see `PROJECT-Structure-diagram.md` section 3) |
| `gateway-nest` | NestJS 11 | `3000` | Postgres on `5432` (own docker-compose) |
| `chatbot-rag-python` | FastAPI + pgvector | `8001` | Postgres+pgvector on `5433` (own docker-compose) |
| `lma-mock-nest` | NestJS 11 | `43022` | nothing — in-memory store, simulates the 3rd-party LMA locally |

Both Postgres instances are **separate** — `gatewaydb` (plain Postgres,
owned by `gateway-nest`) and `chatbotdb` (Postgres + pgvector, owned by
`chatbot-rag-python`). They run on different host ports (`5432` vs
`5433`) specifically so both compose files can run side by side.

⚠️ `gateway-nest/docker-compose.yml` also starts a pgAdmin container on
port `5050` with container name `postgres`/`pgadmin`. If another project
on this machine (e.g. `recharge-api`) already uses those same container
names/ports, stop that project's containers first — they'll collide.

## First-time setup (once per machine)

Run these once, in order, before ever starting anything.

### 1. `gateway-nest`

```bash
cd gateway-nest
npm install
docker compose up -d          # starts Postgres (5432) + pgAdmin (5050)
npm run start:dev             # first boot: TypeORM's synchronize:true creates the "user" table
```

Wait for the `Nest application successfully started` log line, **then**,
in a second terminal (leave the app running, or `Ctrl+C` it first —
either works):

```bash
cd gateway-nest
npm run seed                  # creates 2 demo users (see "Demo login" below)
```

⚠️ Seeding *before* the app has started at least once fails with
`relation "user" does not exist`. That's because `seed.ts` connects via
the standalone `AppDataSource` in `src/database/data-source.ts`, which
has no `synchronize: true` — only the full Nest app's
`TypeOrmModule.forRoot(...)` (in `app.module.ts`) does, and that only
runs on app boot. The table has to exist before the seed script can
insert into it.

### 2. `chatbot-rag-python`

Check first whether a 3.10+ interpreter is actually on `PATH` — this
machine's plain `python3` is 3.9.6, which is too old and will silently
create a venv on the wrong version:

```bash
python3.12 --version   # or python3.11/python3.10 — whatever you installed
                        # (e.g. `brew install python@3.12`); none of these
                        # exist by default, don't assume one does
```

Then, using that specific interpreter (not bare `python3`):

```bash
cd chatbot-rag-python
python3.12 -m venv venv       # use whatever 3.10+ interpreter you confirmed above
source venv/bin/activate
python -m pip install --upgrade pip   # venv inherits the system pip, which can be
                                       # too old to resolve current package metadata —
                                       # upgrade it before installing requirements
pip install -r requirements.txt
docker compose up -d          # starts Postgres+pgvector (5433)
```

The `pgvector/pgvector` image ships the `vector` extension but does
**not** enable it automatically — do this once per fresh container/volume,
before the API's first startup, or `init_db()` fails with
`type "vector" does not exist`:

```bash
docker exec chatbot-postgres psql -U postgres -d chatbotdb -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

The first `pip install` pulls in `torch`/`sentence-transformers`, so
it's a large download. The first time the service actually *starts*
(not installs), `sentence-transformers` also downloads the
`all-MiniLM-L6-v2` embedding model weights — expect that first startup
to be slow; later ones are fast since it's cached.

### 3. `frontend-angular`

```bash
cd frontend-angular
npm install
cp src/environments/environment.development.example.ts src/environments/environment.development.ts
```

Edit the copied `environment.development.ts` and fill in a free PrimeNG
license key from https://primeui.dev/pricing (`primeNgLicenseKey`). An
empty string still runs the app — PrimeNG just shows an unlicensed
watermark/console warning without a key. This file is gitignored on
purpose (see the `.example.ts` file's own comment).

### 4. `lma-mock-nest`

```bash
cd lma-mock-nest
npm install
npm run start:dev
```

No database, no seed step — it seeds two in-memory demo accounts
(`alice@example.com` / `bob@example.com`, same credentials as
`gateway-nest`'s seed, see "Demo login" below) on every boot, since
there's nothing to persist between restarts. Verify:
`curl http://localhost:43022/health` → `{"status":"ok"}`.

### 5. `register-form-angular`

```bash
cd register-form-angular
npm install
cp src/environments/environment.development.example.ts src/environments/environment.development.ts
```

The copied file already points `lmaApiUrl` at `http://localhost:43022`
(`lma-mock-nest`) — no PrimeNG license key needed here, this app doesn't
use PrimeNG. This file is gitignored, same reasoning as
`frontend-angular`'s.

## pgAdmin (inspecting the databases)

Only `gateway-nest/docker-compose.yml` runs a pgAdmin container — there's
no separate one for `chatbot-rag-python`, but the same instance can
reach both databases (see the two connection profiles below).

### 1. Start it

```bash
cd gateway-nest
docker compose up -d          # starts postgres + pgadmin together
```

### 2. Log in

Open `http://localhost:5050`.

| Field | Value |
|---|---|
| Email | `admin@admin.com` |
| Password | `admin` |

(hardcoded in `gateway-nest/docker-compose.yml`'s `pgadmin` service —
fine for local dev, not meant to be secure.)

### 3. Register the `gatewaydb` server

Right-click **Servers** → **Register** → **Server...**

| Tab | Field | Value |
|---|---|---|
| General | Name | `gatewaydb` (anything you like) |
| Connection | Host name/address | `postgres` |
| Connection | Port | `5432` |
| Connection | Maintenance database | `gatewaydb` |
| Connection | Username | `postgres` |
| Connection | Password | `postgres` |

Use the **service name** `postgres`, not `localhost` — pgAdmin runs
inside its own container, on the same Docker network as the `postgres`
container (both started by `gateway-nest/docker-compose.yml`), and
`localhost` from inside a container means that container, not your Mac.

### 4. (Optional) Register the `chatbotdb` server too

`chatbot-postgres` (from `chatbot-rag-python/docker-compose.yml`) is on
a **different** Docker Compose network than pgAdmin, so the service-name
trick above doesn't reach it. Use Docker Desktop's host gateway instead,
and the **host-mapped** port (`5433`, not `5432`):

| Tab | Field | Value |
|---|---|---|
| General | Name | `chatbotdb` |
| Connection | Host name/address | `host.docker.internal` |
| Connection | Port | `5433` |
| Connection | Maintenance database | `chatbotdb` |
| Connection | Username | `postgres` |
| Connection | Password | `postgres` |

Once connected, browse **Schemas → public → Tables** — `document_chunk`
and `pending_document` live here (see `chatbot-rag-python/database.py`).

## Starting everything for a normal dev session

Order matters — each layer expects the one below it to already be up.
Use terminal tabs (or a process manager of your choice); nothing here
is wired into one root script yet. `register-form-angular`/`lma-mock-nest`
are an independent pair — they don't depend on `gateway-nest` or
`chatbot-rag-python` at all, so skip terminals 1–4 if you're only working
on registration.

**1. Databases** (if not already running from a previous session):

```bash
cd gateway-nest && docker compose up -d
cd chatbot-rag-python && docker compose up -d
```

**2. `chatbot-rag-python`** — terminal 1:

```bash
cd chatbot-rag-python
source venv/bin/activate
uvicorn main:app --reload --port 8001
```

Verify: `curl http://localhost:8001/health` → `{"status":"ok"}`.

**3. `gateway-nest`** — terminal 2:

```bash
cd gateway-nest
npm run start:dev
```

Verify: it boots on `http://localhost:3000` (no public health endpoint
yet — a 401 from `POST /chat` without a token still proves it's up).

**4. `frontend-angular`** — terminal 3:

```bash
cd frontend-angular
npm start                     # = ng serve, http://localhost:4200
```

Open `http://localhost:4200`.

**5. `lma-mock-nest`** — terminal 4:

```bash
cd lma-mock-nest
npm run start:dev
```

Verify: `curl http://localhost:43022/health` → `{"status":"ok"}`.

**6. `register-form-angular`** — terminal 5:

```bash
cd register-form-angular
npm start                     # = ng serve --port 4222, http://localhost:4222
```

Open `http://localhost:4222`.

## Demo login

`gateway-nest`'s seed script (`npm run seed`, from first-time setup)
creates two accounts, both usable at `http://localhost:4200`. `lma-mock-nest`
seeds the **same two accounts** into its own in-memory store on every boot
(no `npm run seed` needed there — see its first-time setup step) so
`http://localhost:4222`'s email-availability check reports them as
already taken, matching what `gateway-nest` already knows about them:

| Email | Password |
|---|---|
| `alice@example.com` | `Password123!` |
| `bob@example.com` | `Password123!` |

Re-running `gateway-nest`'s `npm run seed` later is safe — it skips any
email that already exists instead of duplicating it. `lma-mock-nest`'s
seeding is unconditional (it's in-memory, always empty at boot except for
these two), so there's no separate command to re-run.

## What you can actually do end-to-end right now

- **Log in** via the Angular app → `gateway-nest` `/auth/login` → JWT
  stored in `localStorage`.
- **Send a chat message** → `gateway-nest` `/chat` (JWT-protected) →
  forwarded to `chatbot-rag-python` `/chat`. No real RAG pipeline wired
  up yet — it echoes the message back, just proving the full chain
  (Angular → Nest → FastAPI → response) works.
- **Submit documents (PDF/CSV)** → `gateway-nest` `/documents/submit` →
  forwarded to `chatbot-rag-python` `/documents/submit` → stored as
  `pending_document` rows, awaiting review. Nothing is chunked/embedded
  at this step yet.

`/documents/ingest` (the chunk-and-embed endpoint on
`chatbot-rag-python`) exists and is wired to pgvector, but nothing in
the current UI flow calls it yet — it's reachable directly for manual
testing (e.g. via `curl`/Postman) with the same internal-key header
pattern described below.

- **Register a new account** via `register-form-angular`'s 3-step form →
  live email-availability check + final submit both go straight to
  `lma-mock-nest`, not `gateway-nest` (see `PROJECT-Structure-diagram.md`
  section 3). `lma-mock-nest` is a local simulator, not the real LMA —
  it enforces the same email-taken/password-policy rules the form
  assumes, but registrations only live in memory and are lost on
  restart (aside from the two seeded demo accounts, which come back
  every time).

## Cross-service auth notes (only matters if you're calling APIs directly)

- `frontend-angular` → `gateway-nest`: a JWT in the `Authorization`
  header, added automatically by `auth-interceptor.ts` once you're
  logged in.
- `gateway-nest` → `chatbot-rag-python`: **not** a JWT. `gateway-nest`
  already verified the JWT, then calls the Python service with an
  internal shared-secret header (`X-Internal-Api-Key`) plus
  `X-User-Id`. If you `curl` `chatbot-rag-python` directly, you need to
  set both headers yourself — the value is
  `demo-only-internal-service-key-do-not-use-in-production`, hardcoded
  in both `gateway-nest/src/common/internal-api.constants.ts` and
  `chatbot-rag-python/main.py` (see those files' comments — deliberately
  hardcoded for now, not read from env yet).
- `register-form-angular` → `lma-mock-nest`: no auth at all — same as the
  real LMA relationship this simulates (see `PROJECT-Structure-diagram.md`
  section 3), registration is what *establishes* an identity, so there's
  nothing to authenticate yet at that point.

## Stopping everything

```bash
# In each terminal running a dev server: Ctrl+C

# Stop (but keep) the databases:
cd gateway-nest && docker compose stop
cd chatbot-rag-python && docker compose stop

# Or stop AND remove the containers (data persists in the named volumes
# either way, unless you also pass -v):
cd gateway-nest && docker compose down
cd chatbot-rag-python && docker compose down
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `gateway-nest` fails to connect to Postgres on startup | `docker compose up -d` wasn't run in `gateway-nest/`, or another project already has something bound to `5432`/`5050` |
| `npm run seed` fails with `relation "user" does not exist` | The Nest app has never been started yet — run `npm run start:dev` at least once first (creates the table via `synchronize: true`), then seed |
| `chatbot-rag-python` fails to connect to Postgres | `docker compose up -d` wasn't run in `chatbot-rag-python/`, or port `5433` is taken |
| `chatbot-rag-python` startup fails with `psycopg2.errors.UndefinedObject: type "vector" does not exist` | The `vector` extension was never enabled on this container/volume — run the `CREATE EXTENSION` command in "First-time setup" step 2, then restart `uvicorn` |
| `pip install -r requirements.txt` fails on `torch`/`sentence-transformers` | Python version too old — check `python3 --version` is 3.10+ |
| `pip install -r requirements.txt` fails with `ERROR: Could not find a version that satisfies the requirement ...` for a package that clearly exists on PyPI | The venv was created with the system `python3` (bundles an old `pip`, e.g. 21.x) — its metadata parser can't resolve current wheels. Recreate the venv with a real 3.10+ interpreter, then run `python -m pip install --upgrade pip` before `pip install -r requirements.txt` |
| `python3.12: command not found` right after `brew install python@3.12` | Homebrew doesn't put the versioned binary on `PATH` by default — use the full path `/opt/homebrew/bin/python3.12` (Apple Silicon) when creating the venv |
| `venv/bin/python -c "import ssl"` fails with `Library not loaded: .../openssl@3/lib/libssl.3.dylib` (or `ImportError: Can't connect to HTTPS URL because the SSL module is not available` during `pip install`) | Homebrew's `openssl@3` symlink under `/opt/homebrew/opt/` got broken (seen once on this machine, cause unclear — possibly an interrupted `brew cleanup`). Fix with `brew reinstall openssl@3 && brew reinstall python@3.12`, then delete and recreate the venv from that interpreter |
| Angular app can't reach the gateway / CORS error in the browser console | `gateway-nest` isn't running, or it's running on a port other than `3000` (CORS is hardcoded to allow only `http://localhost:4200` in `gateway-nest/src/main.ts`) |
| Chat/document requests return `502 Bad Gateway` from `gateway-nest` | `chatbot-rag-python` isn't running on `8001` |
| Chat/document requests return `403` from `chatbot-rag-python` directly | Missing or wrong `X-Internal-Api-Key` header — see "Cross-service auth notes" above |
| `register-form-angular` can't reach `lma-mock-nest` / CORS error in the browser console | `lma-mock-nest` isn't running, or `register-form-angular` isn't running on port `4222` specifically — CORS on `lma-mock-nest` is hardcoded to allow only `http://localhost:4222` in `lma-mock-nest/src/main.ts`. `npm start` already passes `--port 4222`; running `ng serve` directly without that flag defaults to `4200`, which collides with `frontend-angular` too |
| Email-availability check or final submit in `register-form-angular` always fails | `lma-mock-nest` isn't running on `43022`, or `environment.development.ts` wasn't copied from the `.example.ts` template (see First-time setup step 5) |

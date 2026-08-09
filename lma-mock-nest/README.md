# lma-mock-nest

A local NestJS simulator for the 3rd-party **LMA** (License Management
API) — specifically its registration surface. It exists because the real
LMA sandbox URL isn't available yet (`register-form-angular`'s
`environment.development.ts` had a `TODO-lma-sandbox-url` placeholder);
this service gives that frontend something real to talk to during local
dev, matching the contract it already assumes. See
[`../ARCHITECTURE.md`](../ARCHITECTURE.md) and
[`../PROJECT-Structure-diagram.md`](../PROJECT-Structure-diagram.md)
(section 3) for the wider picture — this file is just install/run.

**Not the real LMA.** No database — everything lives in a `Map` in
memory and is lost on restart, except the two seeded demo accounts
below, which come back every time the process boots.

## Install

```bash
cd lma-mock-nest
npm install
```

## Run

```bash
npm run start:dev      # watch mode, http://localhost:43022
```

Verify it's up:

```bash
curl http://localhost:43022/health
# {"status":"ok"}
```

Other scripts, same as the repo's other NestJS services (`gateway-nest`):

```bash
npm run start           # no watch
npm run build            # compile to dist/
npm run start:prod       # run the compiled build
npm run lint
npm run test
```

CORS is hardcoded in `src/main.ts` to allow only `http://localhost:4222`
— `register-form-angular`'s dev-server port (`npm start` there runs
`ng serve --port 4222` for exactly this reason). Requests from anywhere
else, including the default Angular port `4200`, are blocked by the
browser.

## Seeded users

On every boot, two accounts are seeded into the in-memory store — the
same demo credentials `gateway-nest`'s seed script creates (see the root
[`INSTRUCTIONS.md`](../INSTRUCTIONS.md)'s "Demo login" section), so both
systems agree on who already exists:

| Email | Password |
|---|---|
| `alice@example.com` | `Password123!` |
| `bob@example.com` | `Password123!` |

Querying availability for either address reports `available: false`, and
registering either returns `409` with `X-Error-Code: EMAIL_TAKEN` — no
setup step needed, this happens unconditionally on startup
(`RegistrationsService.onModuleInit`, see `src/registrations/seed-users.ts`).

## Endpoints

Every request below also lives in [`requests.http`](./requests.http) —
open it with VS Code's **REST Client** extension and click "Send Request"
above each block instead of copy-pasting `curl` commands.

### `GET /registrations` — checking who's registered

No Postgres, so no pgAdmin — this is the local equivalent of "open the
database and look at the table":

```bash
curl http://localhost:43022/registrations
```

Returns every registration (seeded + anything registered since boot),
`passwordHash` deliberately excluded:

```json
[
  { "email": "alice@example.com", "role": "engineer", "registeredAt": "...", ... },
  { "email": "bob@example.com", "role": "engineer", "registeredAt": "...", ... }
]
```

Debug/inspection only — not part of the contract `register-form-angular`
actually calls (see `lma-api.ts`), so it's not gated behind anything;
don't read it as "the real LMA has this endpoint too."

### `GET /registrations/email-availability?email=...`

```bash
curl "http://localhost:43022/registrations/email-availability?email=newuser@example.com"
# {"available":true}

curl "http://localhost:43022/registrations/email-availability?email=alice@example.com"
# {"available":false}
```

### `POST /registrations`

Body matches `register-form-angular`'s `RegistrationSubmission` — see
`register-form-angular/src/app/register/registration-model.ts` and
`lma-api.ts` for the authoritative shape. Minimal example:

```bash
curl -i -X POST http://localhost:43022/registrations \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Password123!",
    "confirmPassword": "Password123!",
    "jobFunction": "Engineer",
    "role": "engineer",
    "requestedFeatures": [],
    "defaultFeatures": ["chat", "document-submit"],
    "addressLine1": "1 Main St",
    "addressLine2": "",
    "city": "Springfield",
    "postalCode": "12345",
    "country": "USA",
    "emergencyContactName": "Jane Doe",
    "emergencyContactPhone": "555-0100",
    "emergencyContactRelationship": "Spouse"
  }'
```

| Outcome | Status | Response |
|---|---|---|
| Success | `201` | empty body |
| Email already registered | `409` | header `X-Error-Code: EMAIL_TAKEN` + body `{"code":"EMAIL_TAKEN","message":"..."}` |
| Password fails policy (< 8 chars, or no special character) | `400` | header `X-Error-Code: PASSWORD_POLICY` + body `{"code":"PASSWORD_POLICY","message":"..."}` |

Password policy is checked before the email conflict, so a weak password
against an already-taken email still returns `PASSWORD_POLICY`, not
`EMAIL_TAKEN`.

Ryjcomputer backend

Quick start:

1. Install dependencies

```bash
cd ryjcomputer-back
npm install
```

2. Run in dev

```bash
npm run dev
```

By default the API listens on http://localhost:4000

API endpoints:
- POST /auth/register
- POST /auth/login
- GET/PUT/DELETE /users/:id (protected)
- GET/POST/PUT/DELETE /products (admin protected for mutations)
- POST /products/:id/image (form-data { image })
- POST /orders (authenticated, will decrement stock)

This backend uses a simple JSON file `data.json` for storage — suitable for local development.

There are no required email environment variables since email verification has been removed.

Postgres / Supabase support
---------------------------

The backend can use Postgres when a `DATABASE_URL` environment variable is provided (e.g. a Supabase connection string). When `DATABASE_URL` is set, user-related endpoints will use the Postgres DB instead of the JSON file.

To create the `users` table in Supabase, run this SQL in the Supabase SQL editor:

```sql
create extension if not exists "pgcrypto";

create table users (
	id uuid primary key default gen_random_uuid(),
	name text,
	"lastName" text,
	"birthDate" date,
	email text unique not null,
	password text not null,
	role text default 'user',
	created_at timestamptz default now()
);
```

Import existing users from `data.json` into Postgres:

1. Set `DATABASE_URL` in your shell or environment (the Supabase connection string).
2. Run:

```bash
cd ryjcomputer-back
npm run import:pg
```

This will insert users from `data.json` into the `users` table (skipping any emails that already exist).

Deployment notes
----------------
- For hosting consider Render, Railway, or Vercel (serverless functions). If you use Vercel, provide `DATABASE_URL` as a secret.
- When binding the server for LAN/mobile testing set `HOST=0.0.0.0` before running.

Security
--------
- Passwords are hashed with bcrypt before being stored. Keep `DATABASE_URL` and JWT secrets private.


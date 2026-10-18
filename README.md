# Roommate Expense Manager

Next.js App Router application with a Supabase-backed API for mobile clients and a protected admin dashboard.

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set the Supabase URL, service role key, and a random JWT secret of at least 32 characters.
3. Run `database/schema.sql` in the Supabase SQL editor.
4. Run `database/settlement.sql` in the Supabase SQL editor to create the atomic settlement function.
5. Create the admin and roommate accounts with `npm run setup:users`. The script prompts for their names, emails, and passwords and stores bcrypt hashes. Create the admin with role `admin` and each roommate with role `user`; only `user` accounts are included in expense totals and settlement splits. Run it again with the same email to change an account's password or details.
6. Start the app with `npm run dev`.

Run SQL files in Supabase by opening your project, choosing **SQL Editor**, creating a new query, pasting the contents of the SQL file, and selecting **Run**. Apply `schema.sql` first, followed by `settlement.sql`. The account script needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and should only be run from your own computer. It creates one admin and three roommate accounts; it does not choose or print passwords for you.

The Supabase service role key is used only by server-side code and must not be exposed to browser code.

## API

- `POST /api/auth/login` accepts `{ "email": "...", "password": "..." }` and returns a bearer token. Admin logins also receive an HTTP-only dashboard cookie.
- `POST /api/expenses/sync` accepts an expense array and an `Authorization: Bearer <token>` header. Duplicate `client_local_id` values are ignored.
- `GET /api/expenses/my` returns the authenticated user's expenses.
- `POST /api/admin/settle` settles all currently unsettled expenses in one database transaction. It requires the admin cookie.

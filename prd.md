# Project Requirements Document (PRD): Roommate Expense Manager (Next.js Backend & Admin Web)

## 1. Project Overview
Build a Next.js (App Router) full-stack application that serves as:
1. A REST API backend for a mobile app (used by 3 roommates).
2. A protected Admin Dashboard (Web UI) to view logs and settle expenses.

**Tech Stack:** 
- Framework: Next.js (App Router)
- Database: Supabase (PostgreSQL)
- Authentication: JWT (using `jose` library for Edge compatibility)
- Styling: TailwindCSS (for Admin Panel UI)

---

## 2. Database Schema (Supabase PostgreSQL)
Create the following tables with strict relationships:

**Table: `users`**
- `id` (UUID, Primary Key)
- `name` (String)
- `email` (String, Unique)
- `password_hash` (String, hashed using bcrypt)
- `role` (String, default: 'user', admin will have 'admin')
- `created_at` (Timestamp)

**Table: `expenses`** (Logs actual purchases from shops)
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to users.id)
- `amount` (Decimal/Float)
- `category` (String - enum/text: 'Dairy', 'Vegetables', 'Spices', 'Other')
- `description` (String, optional note)
- `is_settled` (Boolean, default: false)
- `client_local_id` (String, Unique) -> **CRITICAL:** Sent by mobile app to prevent duplicate entries if the background sync retries the same data.
- `created_at` (Timestamp)

**Table: `settlement_transactions`** (Logs who paid whom during settlement)
- `id` (UUID, Primary Key)
- `from_user_id` (UUID, Foreign Key to users.id) - Person paying
- `to_user_id` (UUID, Foreign Key to users.id) - Person receiving
- `amount` (Decimal/Float)
- `settled_at` (Timestamp, default now())

---

## 3. Next.js API Routes (Backend for Mobile App)
These endpoints must return JSON and handle CORS if necessary.

1. **`POST /api/auth/login`**
   - **Input:** `{ email, password }`
   - **Logic:** Verify credentials against `users` table.
   - **Output:** Generate and return a JWT containing `{ userId, role }`.

2. **`POST /api/expenses/sync`** (The Offline-First Sync Endpoint)
   - **Input:** Array of expense objects: `[{ amount, category, description, client_local_id, timestamp }]` + `Bearer JWT` in headers.
   - **Logic:**
     - Verify JWT. Extract `userId`.
     - Bulk insert the array into `expenses` table.
     - **Conflict Resolution:** If `client_local_id` already exists, ignore it (ON CONFLICT DO NOTHING) to prevent duplicate charges from network retries.
   - **Output:** `{ success: true, synced_ids: [...] }`

3. **`GET /api/expenses/my`**
   - **Input:** `Bearer JWT` in headers.
   - **Logic:** Verify JWT, fetch all `expenses` where `user_id == JWT.userId` ordered by `created_at` DESC.
   - **Output:** `{ expenses: [...] }`

---

## 4. Admin Web Dashboard (Next.js Frontend)

**A. Middleware (`middleware.ts`)**
- Intercept all routes starting with `/admin` (except `/admin/login`).
- Verify JWT from cookies. If invalid or `role !== 'admin'`, redirect to `/admin/login`.

**B. Pages & UI Logic**
1. **`/admin/login`**: Simple form setting JWT in HTTP-only cookie upon success.
2. **`/admin/dashboard`**:
   - **Component 1: Overall Expense Ledger (Historical)**
     - Fetch ALL rows from `expenses` (settled and unsettled).
     - Display in a table: Date | User Name | Category | Amount | Description | Status (Settled/Unsettled).
   - **Component 2: Settlement Calculator (The Algorithm)**
     - Fetch all rows from `expenses` where `is_settled == false`.
     - Calculate Total Unsettled Amount = SUM(amount).
     - Calculate Average = Total / 3 (Assuming exactly 3 active users).
     - For each user, calculate Net Balance = (Sum of their unsettled expenses) - Average.
       - If > 0: They are owed money.
       - If < 0: They owe money.
     - Generate a visual list: E.g., "User B owes User A ₹150", "User C owes User A ₹50".
   - **Component 3: "Settle Now" Button**
     - Clicking this triggers `POST /api/admin/settle`

**C. Settlement Execution API (`POST /api/admin/settle`)**
- **Logic MUST be wrapped in a Database Transaction:**
  1. Fetch all `expenses` where `is_settled = false`.
  2. Run the math algorithm (same as Component 2) to determine who owes whom.
  3. Insert the resulting peer-to-peer debts into `settlement_transactions`.
  4. Update all fetched `expenses` to `is_settled = true`.
  5. Commit transaction.

---

## 5. Coding Guidelines for AI
- Write modular code. Keep database calls inside a `/lib/supabase` or `/services` folder, separated from API route files.
- Handle Edge cases: Network failure during sync, division by zero (if no users), rounding errors in floats (round to 2 decimal places).
- Add TypeScript interfaces for all database rows and API payloads.
- **Do NOT hallucinate features.** Stick strictly to this PRD.
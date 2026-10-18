# 💸 Roommate Expense Manager (Offline-First)

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![Flutter](https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

A full-stack, offline-first expense management system designed specifically for roommates. It eliminates the hassle of manual calculations, notebook logs, and transparency issues by providing a seamless mobile app for instant logging and a secure web admin panel for advanced debt settlements.

## ✨ Key Features

*   **📱 Offline-First Mobile App:** Log expenses instantly even without an internet connection. Data is queued locally via SQLite and synced silently in the background when the network is restored.
*   **🔄 Background Sync Engine:** Built-in collision prevention using `client_local_id` (UUIDs) to ensure no duplicate entries are sent to the server during network fluctuations.
*   **⚖️ Smart Settlement Algorithm:** Calculates exactly "Who owes Whom" based on active users and unsettled balances. 
*   **🛡️ Double-Entry Ledger System:** When expenses are settled, original purchase logs are never deleted. Instead, peer-to-peer debt transactions are recorded to maintain a 100% accurate historical ledger.
*   **🔐 Role-Based Access Control:** Standard users only use the mobile app, while the 'Admin' has exclusive access to the Web Dashboard to calculate and settle accounts.

## 🛠️ Tech Stack

### Mobile Application (Client)
*   **Framework:** Flutter (Dart)
*   **Local Database:** `sqflite` (SQLite)
*   **State Management:** Riverpod
*   **Background Tasks:** `workmanager`
*   **Security:** `flutter_secure_storage` (JWT handling)

### Web Dashboard & API (Backend)
*   **Framework:** Next.js (App Router)
*   **Database:** Supabase (PostgreSQL)
*   **Authentication:** Custom JWT-based Auth
*   **Deployment:** Vercel

---

## 🏗️ System Architecture

1.  **Data Entry:** Users log expenses in the Flutter App -> Saved to Local SQLite -> Added to Background Sync Queue.
2.  **API Consumption:** OS triggers `Workmanager` -> App calls Next.js API `POST /api/expenses/sync` -> Data validated via JWT.
3.  **Data Storage:** Next.js saves data to Supabase (PostgreSQL) `expenses` table.
4.  **Admin Settlement:** Admin logs into the Next.js Web Dashboard -> Views unsettled ledger -> Clicks "Settle Now" -> Algorithm runs in a DB Transaction -> Updates `expenses` and logs to `settlement_transactions`.

---

## 🚀 Local Development Setup

### 1. Backend & Admin Web (Next.js)
```bash
# Clone the repository
git clone [https://github.com/yourusername/roommate-expense-manager.git](https://github.com/yourusername/roommate-expense-manager.git)
cd roommate-expense-manager/web-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase credentials and JWT Secret in .env.local

# Run the development server
npm run dev
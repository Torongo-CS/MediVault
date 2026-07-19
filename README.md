# MediVault 🩺

MediVault is an advanced, real-time medicine reservation, search, and inventory management application designed for pharmacies and campus health centers. It integrates intelligent features like AI-driven symptom search, prescription text extraction, simple medical explanations, and automatic refill reminders.

Built with **Svelte v5**, **Convex**, **ShadCN UI**, **Bun**, and the **Gemini/Codex API**.

---

## 🚀 Key Features

### 1. Customer Portal

- **Secure Authentication:** Custom email/password verification using secure password hashing.
- **Smart Directory Search:** Browse and search medicines, filterable and sortable by symptoms, prescription requirements, and current stock availability.
- **Prescription Vault:** Securely upload prescription documents/photos. Link them to reservations of restricted medicines when required.
- **Drug Interaction Warning (Wow Factor):**
  - **Intra-Cart Warning:** Alerts you if two medicines currently in your cart interact negatively.
  - **Order History Warning:** Cross-checks new items against medicines ordered within the last 7 days.
- **Refill Reminders:** Predicts when a user's medicine supply is running low based on dosage and order cycles, triggering timely reminders.

### 2. Pharmacist Portal

- **Reservation Workflow:** Review customer orders, approve or reject restricted items based on vault-linked prescriptions.
- **Inventory & Expiry Tracker:** Manage stock, log expiry dates, and review upcoming low stock alerts.
- **Customer Medical Records:** Review a customer's historic orders and interaction profile flags.

### 3. Admin Control Panel

- **User Management:** Create, delete, or promote users to pharmacist roles.
- **Catalog Management:** Full CRUD operations on medicines, categorization, and drug interaction rule mappings.
- **Inventory Dashboard:** Comprehensive reporting on sales, low stock, and expiring inventory.

---

## 📂 Project Architecture

```text
MediVault/
├── bun.lockb
├── package.json
├── svelte.config.js
├── tailwind.config.js
├── vite.config.js
├── README.md
├── convex/                  # Convex Database & Serverless Logic
│   ├── schema.ts            # Typed database schema
│   ├── users.ts             # Auth and User CRUD queries & mutations
│   ├── medicines.ts         # Medicine catalogue functions & filters
│   ├── reservations.ts      # Cart & checkout mutations
│   ├── notifications.ts     # Real-time event notifications
│   └── ai.ts                # Actions interfacing with external AI LLMs
├── src/
│   ├── app.html
│   ├── app.css              # Centralized global CSS stylesheet (no scattered styles)
│   ├── lib/
│   │   ├── components/      # UI components (shadcn & customized layout blocks)
│   │   ├── convexClient.ts  # Convex initialization configuration
│   │   └── utils/           # Helper scripts (e.g. drug interaction checker)
│   └── routes/              # SvelteKit Layout-Group Routes
│       ├── (public)/        # Landing page, about pages
│       ├── (auth)/          # Login & registration portals
│       ├── (app)/           # Customer dashboard, cart, prescriptions vault, history
│       ├── (pharmacist)/    # Pharmacist orders manager, inventory tracker
│       ├── (admin)/         # Admins dashboard, user manager, database managers
│       └── api/             # API layer endpoints (AI tools & cron tasks)
```

---

## 🎨 Styling Architecture (Single Unified Global CSS)

To prevent fragmented styling:

- **No Scattered Styles:** Inline styles or component-level `<style>` tags are strictly avoided.
- **Global Theme Definition:** All CSS variable custom tokens (such as harmonious HSL colors, dark modes, animations, font definitions) are maintained inside a single entry stylesheet:
  👉 `src/app.css`
- **Tailwind Integration:** Tailwind utility classes are combined with these central variables to build interactive, polished interfaces.

---

## ⚙️ Commands & Local Setup

MediVault runs using `Bun` as the primary runtime and package manager.

### Prerequisites

Make sure you have [Bun](https://bun.sh) installed.

### Setup Instructions

1. **Install Dependencies:**

   ```bash
   bun install
   ```

   OR

   ```bash
   bun run setup
   ```

2. **Initialize Convex Dev Environment:**
   Run the Convex development server. This configures database schemas and updates generated helper client bindings:

   ```bash
   bun run convex dev
   ```

3. **Start the Frontend Development Server:**
   Launch the SvelteKit Vite dev server:

   ```bash
   bun run dev
   ```

4. **Run Integration and Automated Tests:**
   Automatically test app modules, schema configurations, and UI routing to find and fix bugs:
   ```bash
   # Run Vitest unit & schema integration tests
   bun run test:unit --run

   # Run Playwright E2E verification tests
   bun run test:e2e
   ```

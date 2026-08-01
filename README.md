# Kids Play Area Management System

A full-stack app for front-desk staff to register visits, pick services, and see the bill total live.

## Stack
- **Frontend:** React (Vite) + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** MongoDB (Mongoose)

## Project structure
```
kids-play-area/
  backend/     Express API + MongoDB models
  frontend/    React + Tailwind UI
```

## Getting started

### 1. Backend
```bash
cd backend
cp .env.example .env      # edit MONGODB_URI if needed
npm install
npm run dev                # or: npm start
```
Runs on `http://localhost:5000`. Requires a running MongoDB instance (local or Atlas) — set `MONGODB_URI` in `.env`.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`. If your backend runs somewhere other than `http://localhost:5000/api`, set `VITE_API_URL` in a `frontend/.env` file.

## What's included
- Customer registration form (name, parent, mobile, kid details, date/time in auto-filled, optional time out, number of kids)
- Three service sections with quantity steppers: Play Area Packages (soft play, arcade, basketball), Gaming (PS3/PS5 hourly), Socks
- Live billing summary that updates instantly, with the total recomputed and verified on the server before saving
- **Customer directory** — searchable by name/mobile, sortable by recent/visits/spend/points/birthday, with per-family loyalty points, membership tier, and expandable visit history (`Customers` tab)
- **Waitlist** — capacity gauge, "join the queue" flow that issues a token number + estimated wait time, and a staff view to notify/seat/cancel entries (`Waitlist` tab)
- **Promo codes / discounts** — flat ₹ or % off, optional max-discount cap, optional date window for festival offers, optional usage limit; applied at booking time and re-validated server-side
- **Notifications** — a bell in the header surfacing play-time-completed reminders, today's birthdays, "play area full" alerts, and live offers
- REST API: `GET/POST /api/customers`, `GET/PUT/DELETE /api/customers/:id`, plus `/api/customers/directory`, `/api/customers/search`, `/api/customers/birthdays`, `/api/waitlist*`, `/api/promo-codes*`

## Where prices live
`backend/config/pricing.js` is the source of truth used when saving — it recalculates the bill server-side so a stored total can always be trusted. `frontend/src/pricing.js` mirrors it for the live on-screen total. Update both together when rates change; a later iteration could move this into a `Settings` collection so staff can edit prices from the UI.

## Customer management, loyalty & discounts
The `Customer` collection is unchanged in shape — still one document per visit. Everything customer-facing is derived from that on the fly (see `backend/utils/customerInsights.js`):
- **Membership tier** — New/Regular/Silver/Gold/VIP by lifetime visit count
- **Loyalty points** — 1 point per ₹100 lifetime spend (no separate ledger to keep in sync)
- **Birthdays** — computed days-until-next-birthday from each visit's `dob`

Promo codes and the waitlist do get their own collections (`PromoCode`, `WaitlistEntry`) since they're genuinely new entities, not something that can be derived from a visit record. See `backend/models/PromoCode.js` for the discount config (flat/percentage, optional cap, optional date window for festival offers, optional usage limit) and `backend/config/capacity.js` for the play-area capacity and average-session settings the waitlist ETA is based on.

## Built to grow
- **Birthday party bookings** — a new `Booking` collection/route alongside `customers`
- **Monthly reports** — aggregate over the existing `date`/`billing` fields, no schema change needed
- **Inventory** — a new `InventoryItem` collection, decremented when socks/arcade coins are sold
- **Manual loyalty adjustments** — if you need to award/redeem points by hand rather than purely from spend, that's a small new `LoyaltyLedger` collection keyed by mobile number

## Notes
- The mobile UI targets tablets/desktops with large, touch-friendly +/- steppers.
- The "Save Customer" button is disabled until Customer Name and Mobile Number are filled in.

## Authentication & Roles
The app is now gated behind JWT-based login. Highlights:
- **Sign up / Login** — email + password, with a password-strength meter on signup, a "Remember me" option (30-day token in `localStorage` vs a 12-hour token in `sessionStorage`), and account lockout after 5 failed login attempts.
- **Email verification** — required for self-signed-up accounts before they can log in (`/verify-email?token=...`). Accounts an admin creates directly from Settings → Security are auto-verified.
- **Forgot / reset password** — `/forgot-password` and `/reset-password?token=...`.
- **Bootstrap admin** — the very first account ever signed up on a fresh install automatically becomes an `admin`, is pre-verified, and is seeded with the admin security password `0806` (matching the app's legacy front-desk PIN). Change it from Settings → Security.
- **Roles** — `admin`, `manager`, `cashier`. Each role only sees the nav tabs it's allowed to use (see `TAB_ROLES` in `frontend/src/App.jsx`), and the backend enforces the same restrictions on writes (see `requireRole` calls in `backend/routes/*.js`). Logging in redirects each role to its own home tab (`ROLE_HOME_TAB` in `frontend/src/context/AuthContext.jsx`).
- **Settings extra lock** — even an admin's valid session isn't enough to open Settings; it also asks for the separate "admin security password" (Settings → Security to change it).
- **Activity log** — every login (success/failure/lockout), signup, password reset, and settings change is recorded (`ActivityLog` collection) and viewable at Settings → Security → Activity Log.
- Set `JWT_SECRET` in `backend/.env` to a long random string before deploying — the default is only safe for local development.
- Email sending (verification/reset links) uses whatever SMTP credentials are configured in Settings → Notifications; without SMTP configured, the link is printed to the backend console instead so the flow is still fully testable.

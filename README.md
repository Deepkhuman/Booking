# Plugin — Vendor Marketplace Platform

> A free marketplace connecting service vendors (hotels, barbers, gyms, medical, etc.) to users.

---

## ⚡ Core Principles

### 🆓 Free & Open
- Platform is completely free for users
- Vendors can list and manage services at no cost
- No hidden charges, no subscription fees
- Monetization only via optional premium features (future)

### 📈 Scalability
- Layered NestJS architecture — easy to add new modules
- Prisma ORM — database agnostic, easy to migrate
- Stateless JWT auth — horizontally scalable
- Redis caching — reduces DB load at scale
- Cloudinary for media — no server storage bottleneck
- Socket.io with Redis adapter — scales across multiple servers
- Pagination on all list endpoints — no data overload
- Modular codebase — each feature is independent

### 🔐 Security
- JWT access token (15min) + refresh token rotation (7 days)
- Account lockout after 5 failed login attempts
- Email verification required before login
- Password complexity enforcement
- Rate limiting on all sensitive routes
- No user enumeration on forgot password
- Admin audit log on all sensitive actions
- Stripe webhook signature verification
- File upload validation (type + size)
- CORS restricted to known origins
- All secrets in environment variables, never hardcoded
- HTTPS enforced in production
- Input validation on every endpoint via class-validator
- Role-based access control (CUSTOMER | VENDOR | ADMIN)

---

## 🏗️ Build Order

- [x] Step 1 — Auth (register, login, email verify, forgot/reset password, refresh token, logout)
- [x] Step 2 — Schema redesign (full Prisma models)
- [x] Step 3 — Categories module
- [x] Step 4 — Vendor module (registration, profile, admin approval flow)
- [x] Step 5 — Services module (with image upload via Cloudinary)
- [x] Step 6 — Bookings module (full status flow)
- [x] Step 7 — Payments module (Razorpay)
- [x] Step 8 — Reviews module
- [x] Step 9 — Notifications module (Socket.io real-time)
- [x] Step 10 — Admin module (full control panel APIs)
- [ ] Step 11 — Search & Filter (vendors, services, categories)
- [ ] Step 12 — Frontend dashboards (Customer, Vendor, Admin)

---

## 👥 User Roles

| Role | Description |
|------|-------------|
| `CUSTOMER` | Search, book, review, manage bookings |
| `VENDOR` | Manage shop, services, bookings, uploads |
| `ADMIN` | Approve/block vendors, manage platform |

---

## 🗄️ Database Schema Plan

### User
```
id, email, password, name, phone, avatar
role: CUSTOMER | VENDOR | ADMIN
isEmailVerified, emailVerifyToken
failedLoginAttempts, lockedUntil
passwordResetToken, passwordResetExpiry
refreshTokens[]
createdAt, updatedAt
```

### Category
```
id, name, slug, icon, description
isActive
createdAt, updatedAt
```

### Vendor
```
id, userId (owner)
categoryId
businessName, slug, description
logo, coverImage
phone, email, website
address, city, state, country, pincode
lat, lng (for geo search)
bookingType: SLOT_BASED | HOURLY | DAILY | NO_BOOKING
status: PENDING | APPROVED | SUSPENDED | BLOCKED
isActive (vendor toggle)
documents[] (for verification)
createdAt, updatedAt
```

### VendorService
```
id, vendorId
name, description
price, duration (mins)
bookingType (inherits from vendor or override per service)
images[]
isEnabled (admin can toggle per service)
isActive (vendor can toggle)
createdAt, updatedAt
```

### BusinessHours
```
id, vendorId
dayOfWeek (0-6)
openTime, closeTime
slotDuration (mins) — for SLOT_BASED vendors
isClosed
```

### Booking
```
id, customerId, vendorId, serviceId
bookingType: SLOT_BASED | HOURLY | DAILY | NO_BOOKING

— SLOT_BASED & HOURLY fields —
date, startTime, endTime

— DAILY fields —
checkIn, checkOut (DateTime)

— NO_BOOKING fields —
quantity

status: PENDING | CONFIRMED | CANCELLED | COMPLETED | NO_SHOW
paymentStatus: UNPAID | PAID | REFUNDED
notes (customer notes)
createdAt, updatedAt
```

### Payment
```
id, bookingId, userId
amount, currency
provider: STRIPE
status: PENDING | SUCCESS | FAILED | REFUNDED
stripePaymentIntentId
stripeChargeId
refundId
createdAt
```

### Review
```
id, customerId, vendorId, bookingId
rating (1-5)
comment
vendorReply
isVisible (admin can hide)
createdAt, updatedAt
```

### Notification
```
id, userId
type: BOOKING_CONFIRMED | BOOKING_CANCELLED | PAYMENT_SUCCESS | VENDOR_APPROVED | etc
title, message
isRead
metadata (JSON — extra data like bookingId etc)
createdAt
```

### AdminAction (audit log)
```
id, adminId
targetId, targetType: VENDOR | SERVICE | REVIEW | USER
action: APPROVE | SUSPEND | BLOCK | DELETE | ENABLE_SERVICE | DISABLE_SERVICE | HIDE_REVIEW
reason
createdAt
```

---

## 📅 Booking Type System

| Type | Vendors | How it works |
|------|---------|-------------|
| `SLOT_BASED` | Barber, Doctor, Gym class | Fixed time slots auto-generated from business hours |
| `HOURLY` | Studio, Meeting room | Customer picks start + end hour, price = rate × hours |
| `DAILY` | Hotel, Resort | Customer picks check-in/check-out, price = rate × nights |
| `NO_BOOKING` | Supplements, Products | No booking, just browse/contact vendor |

### Frontend Rendering Logic
```
if bookingType === SLOT_BASED  → render SlotPicker (time grid)
if bookingType === HOURLY      → render HourlyPicker (start/end time)
if bookingType === DAILY       → render DateRangePicker (calendar)
if bookingType === NO_BOOKING  → render ContactCard (no booking UI)
```

### Vendor Dashboard Per Type
```
SLOT_BASED  → Today's appointments + slot management
HOURLY      → Hourly calendar view
DAILY       → Monthly calendar with check-ins/check-outs
NO_BOOKING  → Product/service listings only
```

---

## 🔌 API Endpoints Plan

### Auth `/api/auth` ✅
- POST `/register`
- GET `/verify-email`
- POST `/login`
- POST `/refresh`
- POST `/logout`
- POST `/forgot-password`
- POST `/reset-password`

### Categories `/api/categories`
- GET `/` — list all active categories (public)
- GET `/:slug` — get category by slug (public)
- POST `/` — create category (admin)
- PUT `/:id` — update category (admin)
- DELETE `/:id` — delete category (admin)

### Vendors `/api/vendors` ✅
- POST `/register` — vendor registration (vendor)
- GET `/` — list approved vendors (public, paginated, filterable)
- GET `/:id` — get vendor profile (public)
- GET `/me` — get own vendor profile (vendor)
- PUT `/me` — update own profile (vendor)
- GET `/category/:slug` — vendors by category (public)

### Admin Vendor Control `/api/admin/vendors` ✅
- GET `/` — list all vendors with status filter
- PUT `/:id/approve` — approve vendor
- PUT `/:id/suspend` — suspend vendor (temporary)
- PUT `/:id/block` — block vendor (permanent)
- PUT `/:id/unblock` — unblock vendor
- DELETE `/:id` — delete vendor

### Services `/api/services` ✅
- POST `/` — create service (vendor)
- GET `/vendor/:vendorId` — list services by vendor (public)
- PUT `/:id` — update service (vendor)
- DELETE `/:id` — delete service (vendor)
- POST `/:id/images` — upload service images (vendor)
- DELETE `/:id/images/:imageId` — delete image (vendor)

### Admin Service Control `/api/admin/services` ✅
- PUT `/:id/enable` — enable service
- PUT `/:id/disable` — disable service for specific vendor

### Bookings `/api/bookings` ✅
- POST `/` — create booking (customer)
- GET `/mine` — customer's bookings
- GET `/vendor` — vendor's bookings
- PUT `/:id/confirm` — confirm booking (vendor)
- PUT `/:id/cancel` — cancel booking (customer/vendor)
- PUT `/:id/complete` — mark complete (vendor)
- GET `/availability/:vendorId` — get available slots
- POST `/business-hours` — set business hours (vendor)
- GET `/business-hours/:vendorId` — get business hours (public)

### Payments `/api/payments` ✅
- POST `/create-order` — create Razorpay order (customer)
- POST `/verify` — verify payment signature (customer)
- GET `/history` — payment history (customer)
- POST `/refund/:bookingId` — refund payment (customer/admin)

### Reviews `/api/reviews`
- POST `/` — create review (customer, after completed booking)
- GET `/vendor/:vendorId` — get vendor reviews (public)
- PUT `/:id/reply` — vendor reply to review
- DELETE `/:id` — delete review (admin)
- PUT `/:id/hide` — hide review (admin)

### Notifications `/api/notifications`
- GET `/` — get user notifications
- PUT `/:id/read` — mark as read
- PUT `/read-all` — mark all as read
- DELETE `/:id` — delete notification

### Admin `/api/admin`
- GET `/dashboard` — platform stats
- GET `/users` — list all users
- PUT `/users/:id/block` — block user
- GET `/actions` — audit log

### Uploads `/api/uploads`
- POST `/image` — upload single image (Cloudinary)
- DELETE `/image/:publicId` — delete image

---

## 🛠️ Tech Stack

### Backend
| Package | Purpose |
|---------|---------|
| NestJS + TypeScript | Framework |
| Prisma | ORM |
| PostgreSQL | Database |
| JWT + Passport | Auth |
| Socket.io | Real-time notifications |
| Stripe | Payments |
| Multer + Cloudinary | File uploads |
| Redis | Caching + Socket sessions |
| @nestjs/throttler | Rate limiting |
| class-validator | DTO validation |

### Frontend
| Package | Purpose |
|---------|---------|
| React + Vite | Framework |
| React Router | Routing |
| Axios | HTTP client |
| Framer Motion | Animations |
| Three.js | 3D effects |
| React Hot Toast | Notifications |
| Socket.io-client | Real-time |

---

## 🔔 Notification Types
```
BOOKING_CREATED
BOOKING_CONFIRMED
BOOKING_CANCELLED
BOOKING_COMPLETED
PAYMENT_SUCCESS
PAYMENT_FAILED
PAYMENT_REFUNDED
VENDOR_APPROVED
VENDOR_SUSPENDED
VENDOR_BLOCKED
REVIEW_RECEIVED
REVIEW_REPLIED
SERVICE_DISABLED
SERVICE_ENABLED
```

---

## 💳 Payment Flow
```
1. Customer selects service → creates booking (PENDING)
2. Frontend calls POST /payments/create-intent → gets clientSecret
3. Customer pays via Stripe Elements
4. Stripe webhook confirms → booking status → CONFIRMED, payment → SUCCESS
5. On cancellation → refund via Stripe → booking → CANCELLED, payment → REFUNDED
```

---

## 🔐 Security Checklist
- [x] JWT access token (15min) + refresh token (7 days)
- [x] Rate limiting on auth routes
- [x] Account lockout after 5 failed attempts
- [x] Email verification
- [x] Password complexity validation
- [x] No user enumeration on forgot password
- [ ] Stripe webhook signature verification
- [x] File upload validation (type + size)
- [ ] Admin audit logging on all sensitive actions
- [ ] Redis session blacklisting on logout

---

## 📁 Folder Structure (Backend)
```
src/
├── controllers/
├── services/
├── modules/
├── dto/
├── guards/
├── decorators/
├── strategies/
├── prisma/
│   └── seeds/
├── common/
│   ├── filters/
│   └── interceptors/
└── main.ts
```

---

## 🌿 Git Workflow

### Branch Strategy
```
main          → production only, stable code
develop       → main working branch, all features merge here
feature/*     → one branch per feature
hotfix/*      → urgent bug fixes on main
```

### Step by Step Flow
```
1. Always branch off develop
   git checkout develop
   git checkout -b feature/your-feature

2. Work on feature, commit regularly
   git add .
   git commit -m "feat: description"

3. Before merging — verify no errors
   nest build        → must pass
   npm run test      → must pass
   test APIs manually in Postman

4. Only after verified → merge to develop
   git checkout develop
   git merge feature/your-feature
   git push origin develop

5. When develop is stable → merge to main
   git checkout main
   git merge develop
   git push origin main
```

### Commit Message Convention
```
feat:     new feature
fix:      bug fix
refactor: code change, no feature/fix
docs:     README or documentation
test:     adding tests
chore:    package installs, config changes
```

### ⚠️ Rules
- Never push directly to main
- Always verify build passes before merging
- Always verify no runtime errors before merging
- One feature per branch
- Delete feature branch after merging

---

## 🚀 Current Status
- Backend: NestJS + TypeScript ✅
- Database: PostgreSQL + Prisma ✅
- Auth: Fully implemented ✅
- Categories: Fully implemented ✅
- Vendor module: Fully implemented ✅
- Services module: Fully implemented ✅
- Bookings module: Fully implemented ✅
- Payments module: Fully implemented ✅
- Reviews module: Fully implemented ✅
- Notifications module: Fully implemented ✅
- Admin module: Fully implemented ✅
- Frontend: Auth pages done ✅
- Admin dashboard: Live data ✅
- Everything else: In progress 🔄

---

## 💡 Future Features Roadmap

### Vendor Verification Badge
- Admin marks vendor as verified after document check
- Verified badge shown on vendor profile
- Builds customer trust

### Slug-based Public Profiles
- Every vendor gets `plugin.com/v/vendor-slug`
- Better for sharing on WhatsApp/Instagram
- SEO friendly

### Booking Reminders
- Auto email/SMS to customer + vendor
- 24 hours before booking
- 1 hour before booking
- Reduces no-shows significantly

### Vendor Analytics Dashboard
- Total bookings this month
- Revenue this month
- Most popular service
- Peak booking hours
- Customer retention rate

### Waitlist System
- Customer joins waitlist if slot is fully booked
- Auto notify next person if cancellation happens

### Service Packages / Bundles
- Vendors create combo packages (e.g. Hair + Beard)
- Discounted bundle pricing
- Good for upselling

### Customer Loyalty Points
- Every booking earns points
- Points redeemable for discounts
- Keeps customers coming back

### Multi-language Support (i18n)
- Support multiple languages for different regions
- Expands platform to more markets

### Mobile App
- React Native (shares code with React frontend)
- Same backend + auth
- iOS + Android

### API Versioning
- All routes prefixed with `/api/v1/`
- Breaking changes released under `/api/v2/`
- No existing clients break on updates

### Soft Delete
- `deletedAt` field on vendors, users, services
- Data is recoverable
- Admin can restore accidentally deleted records
- Audit trail stays intact

### Redis Caching Strategy
- Cache category list (rarely changes)
- Cache vendor public profiles
- Cache available slots
- Reduces DB hits massively at scale

### Vendor Onboarding Flow
- Step 1 → Basic info (name, category, location)
- Step 2 → Upload logo + cover image
- Step 3 → Add services
- Step 4 → Set business hours
- Step 5 → Submit for admin approval
- Progress bar UI on frontend

### Featured Vendors
- Admin marks vendors as featured
- Featured vendors appear at top of search results
- Future monetization opportunity

### Vendor Response Rate
- Track how fast vendors confirm bookings
- Show response rate % on vendor profile
- Builds customer trust

### Service Area / Radius
- Vendors set a service radius (km)
- Customers only see vendors who serve their location
- Useful for home services, delivery vendors

---

## 🔐 Auth Providers Plan

| Provider | Status | Notes |
|----------|--------|-------|
| Email + Password | ✅ Done | With email verification, lockout, refresh tokens |
| Google OAuth | 🔄 Planned | Via Passport.js google strategy |
| Facebook OAuth | 🔄 Planned | Via Passport.js facebook strategy |
| Apple Sign In | ⏳ Later | When mobile app is built |

---

## 📸 Instagram Integration Plan (Vendor Dashboard)

### Phase 1
- Vendor connects their Instagram account via Instagram Basic Display API
- Vendor imports their Instagram post images directly into Plugin
- Images saved to Cloudinary and used as service/profile photos
- Vendor gets a shareable profile link → `plugin.com/v/vendor-slug`
- Share button → opens Instagram/WhatsApp with pre-filled booking link

### Phase 2 (Later)
- Auto-post to Instagram when a new service is added
- Instagram story template for vendors to share their booking link
- Referral/invite system → vendor shares link → user signs up → auto follows vendor

### What Instagram API Allows
| Feature | Possible? | Notes |
|---------|-----------|-------|
| Import vendor's own posts | ✅ | Instagram Basic Display API |
| Use images as service photos | ✅ | Download + upload to Cloudinary |
| Share booking link to story | ✅ | Deep link, no API needed |
| Access follower list | ❌ | Privacy rules, not allowed |
| Auto-post on booking | ⚠️ | Requires Instagram Business API approval |

# Plugin — Vendor Marketplace Platform

> A free marketplace connecting service vendors (barbers, gyms, doctors, hotels, etc.) to customers. Vendors get a digital presence and booking system at zero cost.

---

## 🚀 Current Status

### Backend — NestJS + TypeScript
| Module | Status |
|--------|--------|
| Auth (register, login, verify, forgot/reset, refresh, logout) | ✅ Complete |
| Categories (CRUD) | ✅ Complete |
| Vendor module (register, profile, admin approval flow) | ✅ Complete |
| Services module (CRUD + image upload via Cloudinary) | ✅ Complete |
| Bookings module (all 4 types + availability + business hours) | ✅ Complete |
| Payments module (Razorpay create order + verify + refund) | ✅ Complete |
| Reviews module (create, reply, admin hide/show/delete) | ✅ Complete |
| Notifications module (Socket.io real-time + REST) | ✅ Complete |
| Admin module (dashboard stats, users, audit log) | ✅ Complete |
| Search & Filter (vendors by name, city, category, type) | ✅ Complete |
| Admin bookings endpoint (view all bookings) | ❌ Missing |
| Admin payments endpoint (view all payments) | ❌ Missing |

### Frontend — React + Vite
| Page | Status |
|------|--------|
| Auth pages (login, register, forgot/reset, verify email) | ✅ Complete |
| Admin dashboard (stats, charts, pending approvals) | ✅ Complete |
| Admin users (list, block/unblock) | ✅ Complete |
| Admin vendors (list, approve/suspend/block/unblock/delete) | ✅ Complete |
| Admin services (enable/disable per vendor) | ✅ Complete |
| Admin reviews (hide/show/delete) | ✅ Complete |
| Admin audit log | ✅ Complete |
| Admin categories (CRUD) | ❌ Missing |
| Admin bookings (view all) | ❌ Missing |
| Admin payments (view all) | ❌ Missing |
| Vendor dashboard (stats + recent bookings) | ✅ Complete |
| Vendor profile (register + edit business) | ✅ Complete |
| Vendor services (CRUD + image upload) | ✅ Complete |
| Vendor bookings (list, confirm, complete, cancel, reply to review) | ✅ Complete |
| Vendor business hours | ✅ Complete |
| Vendor logo & cover image upload | ❌ Missing |
| Vendor reviews page (all reviews received) | ❌ Missing |
| Vendor notifications page | ❌ Missing |
| Vendor earnings summary | ❌ Missing |
| Customer dashboard (stats + recent bookings + categories) | ✅ Complete |
| Customer explore (search + filter vendors) | ✅ Complete |
| Customer vendor detail + booking modal (all 4 types) | ✅ Complete |
| Customer bookings (list, cancel, leave review) | ✅ Complete |
| Customer payments (pay now + history + refund) | ✅ Complete |
| Customer profile (edit info + avatar + change password) | ✅ Complete |
| Customer notifications page | ❌ Missing |
| Customer my reviews page | ❌ Missing |
| Public vendor profile page (`/v/:slug`) | ❌ Missing — critical for launch |

---

## ⚡ Core Principles

### 🆓 Free & Open
- Platform is completely free for users and vendors
- No hidden charges, no subscription fees
- Monetization only via optional premium features (future)

### 📈 Scalability
- Layered NestJS architecture — easy to add new modules
- Prisma ORM — database agnostic, easy to migrate
- Stateless JWT auth — horizontally scalable
- Redis caching — reduces DB load at scale
- Cloudinary for media — no server storage bottleneck
- Socket.io with Redis adapter — scales across multiple servers
- Pagination on all list endpoints
- Modular codebase — each feature is independent

### 🔐 Security
- JWT access token (15min) + refresh token rotation (7 days)
- Account lockout after 5 failed login attempts
- Email verification required before login
- Password complexity enforcement
- Rate limiting on all sensitive routes
- No user enumeration on forgot password
- Admin audit log on all sensitive actions
- Razorpay webhook signature verification
- File upload validation (type + size)
- CORS restricted to known origins
- All secrets in environment variables, never hardcoded
- Input validation on every endpoint via class-validator
- Role-based access control (CUSTOMER | VENDOR | ADMIN)

---

## 👥 User Roles

| Role | Description |
|------|-------------|
| `CUSTOMER` | Search vendors, book services, pay, review, manage bookings |
| `VENDOR` | Register business, manage services, handle bookings, upload media |
| `ADMIN` | Approve/block vendors, manage platform, full control panel |

---

## 📅 Booking Type System

| Type | Example Vendors | How it works |
|------|----------------|--------------|
| `SLOT_BASED` | Barber, Doctor, Gym class | Fixed time slots auto-generated from business hours |
| `HOURLY` | Studio, Meeting room | Customer picks start + end time, price = rate × hours |
| `DAILY` | Hotel, Resort | Customer picks check-in/check-out, price = rate × nights |
| `NO_BOOKING` | Products, Supplements | No booking — browse and contact vendor directly |

---

## 🔌 API Endpoints

### Auth `/api/auth` ✅
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/register` | Public |
| GET | `/verify-email?token=` | Public |
| POST | `/login` | Public |
| POST | `/refresh` | Public |
| POST | `/logout` | Auth |
| POST | `/forgot-password` | Public |
| POST | `/reset-password` | Public |

### Categories `/api/categories` ✅
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/` | Public |
| GET | `/:slug` | Public |
| POST | `/` | Admin |
| PUT | `/:id` | Admin |
| DELETE | `/:id` | Admin |

### Vendors `/api/vendors` ✅
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/register` | Vendor |
| GET | `/` | Public |
| GET | `/me` | Vendor |
| PUT | `/me` | Vendor |
| GET | `/category/:slug` | Public |
| GET | `/:id` | Public |

### Admin Vendor Control `/api/admin/vendors` ✅
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/` | Admin |
| PUT | `/:id/approve` | Admin |
| PUT | `/:id/suspend` | Admin |
| PUT | `/:id/block` | Admin |
| PUT | `/:id/unblock` | Admin |
| DELETE | `/:id` | Admin |

### Services `/api/services` ✅
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/` | Vendor |
| GET | `/vendor/:vendorId` | Public |
| PUT | `/:id` | Vendor |
| DELETE | `/:id` | Vendor |
| POST | `/:id/images` | Vendor |
| DELETE | `/:id/images/:imageId` | Vendor |

### Admin Service Control `/api/admin/services` ✅
| Method | Endpoint | Access |
|--------|----------|--------|
| PUT | `/:id/enable` | Admin |
| PUT | `/:id/disable` | Admin |

### Bookings `/api/bookings` ✅
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/` | Customer |
| GET | `/mine` | Customer |
| GET | `/vendor` | Vendor |
| PUT | `/:id/confirm` | Vendor |
| PUT | `/:id/cancel` | Customer / Vendor |
| PUT | `/:id/complete` | Vendor |
| GET | `/availability/:vendorId?date=` | Public |
| POST | `/business-hours` | Vendor |
| GET | `/business-hours/:vendorId` | Public |

### Payments `/api/payments` ✅
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/create-order` | Customer |
| POST | `/verify` | Customer |
| GET | `/history` | Customer |
| POST | `/refund/:bookingId` | Customer / Admin |

### Reviews `/api/reviews` ✅
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/` | Customer |
| GET | `/admin` | Admin |
| GET | `/vendor/:vendorId` | Public |
| GET | `/mine` | Customer |
| GET | `/can-review/:bookingId` | Customer |
| PUT | `/:id/reply` | Vendor |
| PUT | `/:id/hide` | Admin |
| PUT | `/:id/show` | Admin |
| DELETE | `/:id` | Admin |

### Notifications `/api/notifications` ✅
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/` | Auth |
| PUT | `/:id/read` | Auth |
| PUT | `/read-all` | Auth |
| DELETE | `/:id` | Auth |

### Admin `/api/admin` ✅
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/dashboard` | Admin |
| GET | `/users` | Admin |
| PUT | `/users/:id/block` | Admin |
| PUT | `/users/:id/unblock` | Admin |
| GET | `/actions` | Admin |

### Users `/api/users` ✅
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/me` | Auth |
| PUT | `/me` | Auth |
| POST | `/me/avatar` | Auth |
| PUT | `/me/password` | Auth |

---

## 🗄️ Database Schema

### User
```
id, email, password, name, phone, avatar
googleId, facebookId
role: CUSTOMER | VENDOR | ADMIN
isEmailVerified, emailVerifyToken
failedLoginAttempts, lockedUntil
passwordResetToken, passwordResetExpiry
isBlocked, deletedAt
createdAt, updatedAt
```

### Category
```
id, name, slug, icon, description
isActive, deletedAt
createdAt, updatedAt
```

### Vendor
```
id, userId, categoryId
businessName, slug, description
logo, coverImage
phone, email, website
address, city, state, country, pincode
lat, lng
bookingType: SLOT_BASED | HOURLY | DAILY | NO_BOOKING
status: PENDING | APPROVED | SUSPENDED | BLOCKED
isActive, isFeatured, isVerified
deletedAt, createdAt, updatedAt
```

### VendorService
```
id, vendorId
name, description, price, duration
isEnabled (admin toggle), isActive (vendor toggle)
deletedAt, createdAt, updatedAt
images[]
```

### BusinessHours
```
id, vendorId
dayOfWeek (0-6), openTime, closeTime
slotDuration (mins), isClosed
```

### Booking
```
id, customerId, vendorId, serviceId
bookingType: SLOT_BASED | HOURLY | DAILY | NO_BOOKING
date, startTime, endTime (SLOT_BASED / HOURLY)
checkIn, checkOut (DAILY)
quantity (NO_BOOKING)
notes, status, paymentStatus
deletedAt, createdAt, updatedAt
```

### Payment
```
id, bookingId, userId
amount, currency
provider: STRIPE (schema) / Razorpay (implementation)
status: PENDING | SUCCESS | FAILED | REFUNDED
razorpayOrderId, razorpayPaymentId, razorpaySignature
createdAt
```

### Review
```
id, customerId, vendorId, bookingId
rating (1-5), comment, vendorReply
isVisible (admin can hide)
createdAt, updatedAt
```

### Notification
```
id, userId
type: BOOKING_CREATED | BOOKING_CONFIRMED | ... (14 types)
title, message, isRead
metadata (JSON)
createdAt
```

### AdminAction (audit log)
```
id, adminId
targetId, targetType: VENDOR | SERVICE | REVIEW | USER
action: APPROVE | SUSPEND | BLOCK | UNBLOCK | DELETE |
        ENABLE_SERVICE | DISABLE_SERVICE |
        HIDE_REVIEW | SHOW_REVIEW |
        BLOCK_USER | UNBLOCK_USER
reason, createdAt
```

### MenuItem (dynamic sidebar)
```
id, label, icon, path, order
roles: Role[]
isActive, createdAt, updatedAt
```

---

## 🔔 Notification Types
```
BOOKING_CREATED       BOOKING_CONFIRMED     BOOKING_CANCELLED
BOOKING_COMPLETED     PAYMENT_SUCCESS       PAYMENT_FAILED
PAYMENT_REFUNDED      VENDOR_APPROVED       VENDOR_SUSPENDED
VENDOR_BLOCKED        REVIEW_RECEIVED       REVIEW_REPLIED
SERVICE_DISABLED      SERVICE_ENABLED
```

---

## 💳 Payment Flow (Razorpay)
```
1. Customer selects service → POST /bookings → booking created (PENDING, UNPAID)
2. Customer goes to payments → POST /payments/create-order → gets Razorpay order
3. Razorpay checkout opens in browser
4. On success → POST /payments/verify → signature verified → booking CONFIRMED, payment SUCCESS
5. On cancellation → POST /payments/refund/:bookingId → booking CANCELLED, payment REFUNDED
```

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
| Razorpay | Payments |
| Multer + Cloudinary | File uploads |
| Redis | Caching + Socket adapter |
| @nestjs/throttler | Rate limiting |
| class-validator | DTO validation |
| Nodemailer | Email (verify, reset password) |

### Frontend
| Package | Purpose |
|---------|---------|
| React + Vite | Framework |
| React Router v6 | Routing |
| Axios | HTTP client |
| Framer Motion | Animations |
| Three.js | 3D background on auth pages |
| React Hot Toast | Toast notifications |
| Socket.io-client | Real-time notifications |
| Lucide React | Icons |
| Recharts | Charts (admin dashboard) |
| React Image Crop | Avatar cropping |

---

## 📁 Folder Structure

### Backend
```
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── src/
    ├── controllers/       # Route handlers
    ├── services/          # Business logic
    ├── modules/           # NestJS module definitions
    ├── dto/               # Request validation schemas
    ├── guards/            # JWT + Roles guards
    ├── decorators/        # @CurrentUser, @Roles
    ├── strategies/        # Passport JWT strategy
    ├── gateways/          # Socket.io gateway
    ├── prisma/
    │   └── seeds/         # Menu items, admin user seeds
    ├── common/
    │   ├── filters/       # Global exception filter
    │   └── interceptors/  # Response transform interceptor
    └── main.ts
```

### Frontend
```
frontend/
└── src/
    ├── api/
    │   └── axios.js       # Axios instance + interceptors
    ├── components/
    │   ├── dashboard/     # DashboardLayout, Sidebar, StatsCard, NotificationBell
    │   ├── ProtectedRoute.jsx
    │   ├── GuestRoute.jsx
    │   ├── ImageCropModal.jsx
    │   ├── Logo.jsx
    │   └── ThreeBackground.jsx
    ├── context/
    │   └── AuthContext.jsx
    ├── pages/
    │   ├── admin/         # Dashboard, Users, Vendors, Services, Reviews, AuditLog
    │   ├── vendor/        # Dashboard, Profile, Services, Bookings, BusinessHours
    │   ├── customer/      # Dashboard, Explore, VendorDetail, Bookings, Payments, Profile
    │   └── auth/          # Login, Register, ForgotPassword, ResetPassword, VerifyEmail
    ├── App.jsx
    └── main.jsx
```

---

## 🏗️ Build Order

- [x] Step 1 — Auth (register, login, email verify, forgot/reset password, refresh token, logout)
- [x] Step 2 — Database schema (full Prisma models)
- [x] Step 3 — Categories module
- [x] Step 4 — Vendor module (registration, profile, admin approval flow)
- [x] Step 5 — Services module (CRUD + image upload via Cloudinary)
- [x] Step 6 — Bookings module (all 4 types + availability + business hours)
- [x] Step 7 — Payments module (Razorpay)
- [x] Step 8 — Reviews module
- [x] Step 9 — Notifications module (Socket.io real-time)
- [x] Step 10 — Admin module (dashboard, users, audit log)
- [x] Step 11 — Search & Filter
- [x] Step 12 — Frontend: Auth pages
- [x] Step 13 — Frontend: Admin dashboard (live data + charts)
- [x] Step 14 — Frontend: Admin users, vendors, services, reviews, audit log
- [x] Step 15 — Frontend: Vendor dashboard, profile, services, bookings, business hours
- [x] Step 16 — Frontend: Customer dashboard, explore, vendor detail, bookings, payments, profile
- [ ] Step 17 — Frontend: Missing pages (see gaps below)
- [ ] Step 18 — Public vendor profile page (`/v/:slug`)
- [ ] Step 19 — Swagger API docs
- [ ] Step 20 — Docker Compose setup
- [ ] Step 21 — Production deployment

---

## 🔧 What's Still Missing

### Backend
- `GET /admin/bookings` — view all bookings (admin)
- `GET /admin/payments` — view all payments (admin)
- `GET /vendors/:id/public` — public vendor profile by slug

### Frontend — Admin
- Categories page (create, edit, delete, toggle active)
- Bookings page (view all bookings across platform)
- Payments page (view all transactions)

### Frontend — Vendor
- Logo & cover image upload (in profile page)
- Reviews page (all reviews received + reply)
- Notifications page
- Earnings summary

### Frontend — Customer
- Notifications page
- My reviews page (reviews I've written)

### Frontend — Public
- `/v/:slug` — public vendor profile (shareable link for WhatsApp/Instagram)

---

## 🌿 Git Workflow

### Branch Strategy
```
main        → production only, stable code
develop     → main working branch, all features merge here
feature/*   → one branch per feature
hotfix/*    → urgent bug fixes on main
```

### Flow
```
1. Branch off develop
   git checkout develop && git checkout -b feature/your-feature

2. Work and commit
   git add . && git commit -m "feat: description"

3. Verify before merging
   nest build       → must pass
   test APIs in Postman

4. Merge to develop
   git checkout develop && git merge feature/your-feature

5. When stable → merge to main
   git checkout main && git merge develop
```

### Commit Convention
```
feat:      new feature
fix:       bug fix
refactor:  code change, no feature/fix
docs:      README or documentation
chore:     package installs, config changes
```

### Rules
- Never push directly to main
- Always verify build passes before merging
- One feature per branch
- Delete feature branch after merging

---

## 🔐 Security Checklist
- [x] JWT access token (15min) + refresh token rotation (7 days)
- [x] Rate limiting on auth routes
- [x] Account lockout after 5 failed attempts
- [x] Email verification required before login
- [x] Password complexity validation
- [x] No user enumeration on forgot password
- [x] Razorpay signature verification on payment
- [x] File upload validation (type + size)
- [x] Admin audit log on all sensitive actions
- [x] Role-based access control on all routes
- [x] Input validation via class-validator on every endpoint
- [ ] Redis session blacklisting on logout
- [ ] HTTPS enforced in production

---

## 🔐 Auth Providers

| Provider | Status | Notes |
|----------|--------|-------|
| Email + Password | ✅ Done | With email verification, lockout, refresh tokens |
| Google OAuth | 🔄 Planned | Via Passport.js google strategy |
| Facebook OAuth | 🔄 Planned | Via Passport.js facebook strategy |
| Apple Sign In | ⏳ Later | When mobile app is built |

---

## 💡 Future Roadmap

| Feature | Priority | Notes |
|---------|----------|-------|
| Public vendor profile (`/v/:slug`) | 🔴 High | Shareable link for WhatsApp/Instagram |
| Booking reminders (email/SMS) | 🔴 High | Reduces no-shows |
| Vendor logo & cover upload | 🔴 High | Basic profile completeness |
| Swagger API docs | 🟡 Medium | Developer experience |
| Docker Compose | 🟡 Medium | Easy local setup |
| Vendor analytics dashboard | 🟡 Medium | Revenue, peak hours, popular services |
| Waitlist system | 🟡 Medium | Auto-notify on cancellation |
| Featured vendors (admin toggle) | 🟡 Medium | Future monetization |
| Vendor verification badge | 🟡 Medium | Builds customer trust |
| Google OAuth | 🟡 Medium | Easier signup |
| Service packages / bundles | 🟢 Low | Upselling |
| Customer loyalty points | 🟢 Low | Retention |
| Multi-language (i18n) | 🟢 Low | Regional expansion |
| Mobile app (React Native) | 🟢 Low | After web is stable |
| API versioning (`/api/v1/`) | 🟢 Low | Before public API |
| Soft delete restore (admin) | 🟢 Low | Data recovery |

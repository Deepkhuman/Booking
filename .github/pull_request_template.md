## 📋 Description
<!-- What does this PR do? Be concise. -->

## 🔗 Related Issue
Closes #

## 🧩 Type of Change
- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `refactor` — code change, no feature/fix
- [ ] `docs` — documentation update
- [ ] `test` — adding or updating tests
- [ ] `chore` — config, dependencies, tooling

---

## 🔐 Security Checklist (required for every PR)

### Authentication & Authorization
- [ ] Every mutating endpoint (POST/PUT/DELETE) has `JwtAuthGuard`
- [ ] Role-restricted endpoints have `RolesGuard` + `@Roles()`
- [ ] Admin endpoints are guarded with `@Roles('ADMIN')`
- [ ] Blocked users (`isBlocked: true`) cannot access protected endpoints
- [ ] Suspended/blocked vendors cannot perform vendor actions

### Ownership & Data Isolation
- [ ] Users can only read/modify their own data
- [ ] Vendors can only modify their own services, bookings, and profile
- [ ] Customers can only cancel/review their own bookings
- [ ] Payment operations are scoped to the requesting user (`userId` check)
- [ ] Review creation is scoped to the booking owner (`customerId` check)

### Input Validation
- [ ] All DTOs use `class-validator` decorators
- [ ] No raw user input passed directly to Prisma queries
- [ ] File uploads validated for type and size
- [ ] Pagination inputs have min/max bounds

### Data Exposure
- [ ] Password field never returned in any response
- [ ] Sensitive fields (tokens, secrets) excluded from responses
- [ ] Soft-deleted records filtered out (`deletedAt: null`) in all queries
- [ ] Hidden reviews (`isVisible: false`) not returned to public endpoints

### Business Logic
- [ ] Cannot pay for a cancelled booking
- [ ] Cannot review a non-completed booking
- [ ] Cannot double-review the same booking
- [ ] Cannot double-reply to a review
- [ ] Slot conflicts checked before booking creation
- [ ] Refunds only on `SUCCESS` payments

### Secrets & Config
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] All secrets use `process.env`
- [ ] No `console.log` of sensitive data

---

## ✅ Quality Checklist
- [ ] `npm run build` passes (no TypeScript errors)
- [ ] `npm test` passes (all tests green)
- [ ] `npm run security` passes (no security scan issues)
- [ ] New endpoints have corresponding test cases
- [ ] Security boundaries tested (ownership, auth, blocked users)
- [ ] No console.log or debug code left

## 🧪 How to Test
1. 
2. 
3. 

## 📸 Screenshots (if UI change)

## ⚠️ Breaking Changes
- [ ] Yes — describe below
- [ ] No

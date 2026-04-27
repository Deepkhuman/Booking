#!/usr/bin/env node
/**
 * Security Pattern Scanner
 * Scans all service files for common security anti-patterns.
 * Run: node .github/scripts/security-scan.js
 */

const fs = require('fs');
const path = require('path');

const SERVICES_DIR = path.join(__dirname, '../../backend/src/services');
const CONTROLLERS_DIR = path.join(__dirname, '../../backend/src/controllers');

let issues = [];
let warnings = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function getServiceFiles() {
  return fs.readdirSync(SERVICES_DIR)
    .filter(f => f.endsWith('.service.ts') && !f.includes('email') && !f.includes('cloudinary') && !f.includes('notification') && !f.includes('prisma'))
    .map(f => ({ name: f, path: path.join(SERVICES_DIR, f) }));
}

function getControllerFiles() {
  return fs.readdirSync(CONTROLLERS_DIR)
    .filter(f => f.endsWith('.controller.ts') && !f.includes('app'))
    .map(f => ({ name: f, path: path.join(CONTROLLERS_DIR, f) }));
}

function flag(file, type, message) {
  issues.push({ file, type, message });
}

function warn(file, message) {
  warnings.push({ file, message });
}

// ─── Service Checks ───────────────────────────────────────────────────────────

function checkServices() {
  const files = getServiceFiles();

  for (const { name, path: filePath } of files) {
    const code = readFile(filePath);
    const lines = code.split('\n');

    // 1. Check login-like methods have isBlocked check
    if (name === 'auth.service.ts') {
      if (code.includes('async login') && !code.includes('isBlocked')) {
        flag(name, 'CRITICAL', 'login() has no isBlocked check — blocked users can authenticate');
      }
      if (code.includes('async socialLogin') && !code.includes('isBlocked')) {
        warn(name, 'socialLogin() does not check isBlocked — consider blocking social logins too');
      }
    }

    // 2. Check payment verify has ownership check
    if (name === 'payment.service.ts') {
      if (code.includes('async verifyPayment') && !code.includes('payment.userId !== userId') && !code.includes('userId !== payment.userId')) {
        flag(name, 'HIGH', 'verifyPayment() has no ownership check — any user can verify any payment');
      }
      if (code.includes('async refund') && !code.includes('isAdmin') && !code.includes('ForbiddenException')) {
        flag(name, 'HIGH', 'refund() has no authorization check');
      }
    }

    // 3. Check booking mutations have ownership
    if (name === 'booking.service.ts') {
      if (code.includes('async confirm') && !code.includes('ForbiddenException') && !code.includes('getVendorBookingOrThrow')) {
        flag(name, 'HIGH', 'confirm() may lack ownership check');
      }
      if (code.includes('async cancel') && !code.includes('ForbiddenException')) {
        flag(name, 'HIGH', 'cancel() has no ForbiddenException — ownership not enforced');
      }
    }

    // 4. Check vendor mutations have status check
    if (name === 'vendor.service.ts') {
      if (code.includes('async updateMyProfile') && !code.includes('BLOCKED')) {
        flag(name, 'MEDIUM', 'updateMyProfile() does not check if vendor is blocked');
      }
    }

    // 5. Check review mutations have ownership
    if (name === 'review.service.ts') {
      if (code.includes('async create') && !code.includes('customerId')) {
        flag(name, 'HIGH', 'create() does not scope review to customerId');
      }
      if (code.includes('async vendorReply') && !code.includes('vendorId')) {
        flag(name, 'HIGH', 'vendorReply() does not verify review belongs to vendor');
      }
    }

    // 6. Detect hardcoded secrets
    const secretPatterns = [
      /secret\s*[:=]\s*['"][a-zA-Z0-9+/]{20,}/i,
      /password\s*[:=]\s*['"][^'"]{8,}/i,
      /api_key\s*[:=]\s*['"][a-zA-Z0-9]{20,}/i,
      /token\s*[:=]\s*['"][a-zA-Z0-9]{30,}/i,
    ];
    lines.forEach((line, i) => {
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
      secretPatterns.forEach(pattern => {
        if (pattern.test(line) && !line.includes('process.env')) {
          flag(name, 'CRITICAL', `Possible hardcoded secret at line ${i + 1}: ${line.trim().substring(0, 60)}`);
        }
      });
    });

    // 7. Detect raw SQL / injection risk
    if (code.includes('$queryRaw') || code.includes('$executeRaw')) {
      warn(name, 'Uses raw SQL ($queryRaw/$executeRaw) — ensure inputs are parameterized');
    }

    // 8. Detect missing deletedAt filter on sensitive queries
    if ((name === 'booking.service.ts' || name === 'vendor.service.ts') && code.includes('findMany')) {
      if (!code.includes('deletedAt')) {
        warn(name, 'findMany() queries may not filter soft-deleted records (deletedAt: null)');
      }
    }
  }
}

// Controllers that are intentionally public (no JwtAuthGuard needed)
const PUBLIC_CONTROLLERS = ['auth.controller.ts'];

// ─── Controller Checks ────────────────────────────────────────────────────────

function checkControllers() {
  const files = getControllerFiles();

  for (const { name, path: filePath } of files) {
    const code = readFile(filePath);

    // 1. Every mutating endpoint should have JwtAuthGuard (skip known public controllers)
    if (!PUBLIC_CONTROLLERS.includes(name)) {
      const hasMutations = /@(Post|Put|Patch|Delete)\(/.test(code);
      const hasJwtGuard = code.includes('JwtAuthGuard');
      if (hasMutations && !hasJwtGuard) {
        flag(name, 'CRITICAL', 'Controller has mutating endpoints (POST/PUT/DELETE) but no JwtAuthGuard');
      }
    }

    // 2. Admin controllers must have RolesGuard + ADMIN role
    if (name.includes('admin') || name.includes('Admin')) {
      if (!code.includes("Roles('ADMIN')") && !code.includes("Roles(Role.ADMIN)")) {
        flag(name, 'CRITICAL', 'Admin controller missing @Roles(ADMIN) guard');
      }
      if (!code.includes('RolesGuard')) {
        flag(name, 'CRITICAL', 'Admin controller missing RolesGuard');
      }
    }

    // 3. Detect endpoints returning sensitive user fields (skip auth controller)
    if (!PUBLIC_CONTROLLERS.includes(name) && code.includes('password') && !code.includes('select') && !code.includes('omit')) {
      warn(name, 'May be returning password field in response — ensure it is excluded');
    }
  }
}

// ─── Run & Report ─────────────────────────────────────────────────────────────

checkServices();
checkControllers();

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

console.log(`\n${CYAN}═══════════════════════════════════════════════════${RESET}`);
console.log(`${CYAN}           SECURITY SCAN REPORT${RESET}`);
console.log(`${CYAN}═══════════════════════════════════════════════════${RESET}\n`);

if (issues.length === 0 && warnings.length === 0) {
  console.log(`${GREEN}✓ No security issues found.${RESET}\n`);
  process.exit(0);
}

if (issues.length > 0) {
  console.log(`${RED}ISSUES (${issues.length}) — must fix before commit:${RESET}`);
  issues.forEach(({ file, type, message }) => {
    console.log(`  ${RED}[${type}]${RESET} ${file}`);
    console.log(`         → ${message}\n`);
  });
}

if (warnings.length > 0) {
  console.log(`${YELLOW}WARNINGS (${warnings.length}) — review recommended:${RESET}`);
  warnings.forEach(({ file, message }) => {
    console.log(`  ${YELLOW}[WARN]${RESET} ${file}`);
    console.log(`         → ${message}\n`);
  });
}

console.log(`${CYAN}═══════════════════════════════════════════════════${RESET}\n`);

// Exit 1 only on CRITICAL/HIGH issues, not warnings
const blocking = issues.filter(i => i.type === 'CRITICAL' || i.type === 'HIGH');
if (blocking.length > 0) {
  console.log(`${RED}${blocking.length} blocking issue(s) found. Commit blocked.${RESET}\n`);
  process.exit(1);
}

process.exit(0);

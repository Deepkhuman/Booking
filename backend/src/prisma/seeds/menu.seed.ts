import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const menuItems = [
  // ADMIN menu
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/admin/dashboard', order: 1, roles: [Role.ADMIN] },
  { label: 'Vendors', icon: 'Store', path: '/admin/vendors', order: 2, roles: [Role.ADMIN] },
  { label: 'Services', icon: 'Briefcase', path: '/admin/services', order: 3, roles: [Role.ADMIN] },
  { label: 'Users', icon: 'Users', path: '/admin/users', order: 4, roles: [Role.ADMIN] },
  { label: 'Reviews', icon: 'Star', path: '/admin/reviews', order: 5, roles: [Role.ADMIN] },
  { label: 'Audit Log', icon: 'ScrollText', path: '/admin/audit-log', order: 6, roles: [Role.ADMIN] },

  // VENDOR menu
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/vendor-dashboard', order: 1, roles: [Role.VENDOR] },
  { label: 'My Services', icon: 'Briefcase', path: '/vendor-dashboard/services', order: 2, roles: [Role.VENDOR] },
  { label: 'Bookings', icon: 'CalendarDays', path: '/vendor-dashboard/bookings', order: 3, roles: [Role.VENDOR] },
  { label: 'Business Hours', icon: 'Clock', path: '/vendor-dashboard/business-hours', order: 4, roles: [Role.VENDOR] },
  { label: 'Profile', icon: 'UserCircle', path: '/vendor-dashboard/profile', order: 5, roles: [Role.VENDOR] },

  // CUSTOMER menu
  { label: 'Home', icon: 'Home', path: '/customer-dashboard', order: 1, roles: [Role.CUSTOMER] },
  { label: 'My Bookings', icon: 'CalendarDays', path: '/customer-dashboard/bookings', order: 2, roles: [Role.CUSTOMER] },
  { label: 'Payments', icon: 'CreditCard', path: '/customer-dashboard/payments', order: 3, roles: [Role.CUSTOMER] },
  { label: 'Explore', icon: 'Compass', path: '/customer-dashboard/explore', order: 4, roles: [Role.CUSTOMER] },
  { label: 'Profile', icon: 'UserCircle', path: '/customer-dashboard/profile', order: 5, roles: [Role.CUSTOMER] },
];

async function main() {
  console.log('Seeding menu items...');

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: (await prisma.menuItem.findFirst({ where: { label: item.label, roles: { hasSome: item.roles } } }))?.id ?? 0 },
      update: item,
      create: item,
    });
  }

  console.log(`✓ ${menuItems.length} menu items seeded`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

/**
 * Seed: admin user, sample trip, landmark, car, coupon.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Admin@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sahalat.om' },
    update: {},
    create: {
      email: 'admin@sahalat.om',
      password: hashedPassword,
      name: 'Admin Sahalat',
      role: 'ADMIN',
      isVerified: true,
    },
  });
  console.log('Admin user:', admin.email);

  const trip = await prisma.trip.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'Muscat City Tour',
      titleAr: 'جولة مسقط',
      description: 'Full day tour of Muscat highlights.',
      durationDays: 1,
      basePrice: 45,
      maxParticipants: 10,
      isActive: true,
    },
  });
  console.log('Sample trip:', trip.title);

  const landmark = await prisma.landmark.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Sultan Qaboos Grand Mosque',
      nameAr: 'جامع السلطان قابوس الأكبر',
      description: 'Iconic mosque in Muscat.',
      location: 'Muscat',
      isActive: true,
    },
  });
  console.log('Sample landmark:', landmark.name);

  const car = await prisma.car.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Toyota Yaris',
      nameAr: 'تويوتا ياريس',
      basePricePerDay: 25,
      isActive: true,
    },
  });
  console.log('Sample car:', car.name);

  const coupon = await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      value: 10,
      minBookingAmount: 20,
      maxUsages: 100,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });
  console.log('Sample coupon:', coupon.code);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

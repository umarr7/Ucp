import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.rating.deleteMany();
  await prisma.message.deleteMany();
  await prisma.pointTransaction.deleteMany();
  await prisma.reputationHistory.deleteMany();
  await prisma.task.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // Create Departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'CS' },
      update: {},
      create: {
        name: 'Computer Science',
        code: 'CS',
        description: 'Department of Computer Science',
      },
    }),
    prisma.department.upsert({
      where: { code: 'EE' },
      update: {},
      create: {
        name: 'Electrical Engineering',
        code: 'EE',
        description: 'Department of Electrical Engineering',
      },
    }),
    prisma.department.upsert({
      where: { code: 'ME' },
      update: {},
      create: {
        name: 'Mechanical Engineering',
        code: 'ME',
        description: 'Department of Mechanical Engineering',
      },
    }),
    prisma.department.upsert({
      where: { code: 'BA' },
      update: {},
      create: {
        name: 'Business Administration',
        code: 'BA',
        description: 'Department of Business Administration',
      },
    }),
  ]);

  console.log('✅ Created departments');

  // Create Admin User
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ucp.edu' },
    update: {},
    create: {
      email: 'admin@ucp.edu',
      password: adminPassword,
      role: 'ADMIN',
      level: 'ELITE',
      points: 1000,
      reputation: 1000,
      departmentId: departments[0].id,
      profile: {
        create: {
          firstName: 'Admin',
          lastName: 'User',
          studentId: 'ADMIN001',
        },
      },
    },
    include: { profile: true },
  });

  console.log('✅ Created admin user');

  // Create Sample Users
  const userPasswords = await Promise.all([
    hashPassword('user123'),
    hashPassword('user123'),
    hashPassword('user123'),
    hashPassword('user123'),
    hashPassword('user123'),
  ]);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john.doe@ucp.edu',
        password: userPasswords[0],
        role: 'USER',
        level: 'GOLD',
        points: 250,
        reputation: 350,
        departmentId: departments[0].id,
        profile: {
          create: {
            firstName: 'John',
            lastName: 'Doe',
            studentId: 'CS2021001',
            phone: '+1234567890',
            bio: 'Computer Science student, always ready to help!',
          },
        },
      },
      include: { profile: true },
    }),
    prisma.user.create({
      data: {
        email: 'jane.smith@ucp.edu',
        password: userPasswords[1],
        role: 'TRUSTED',
        level: 'SILVER',
        points: 180,
        reputation: 200,
        departmentId: departments[1].id,
        profile: {
          create: {
            firstName: 'Jane',
            lastName: 'Smith',
            studentId: 'EE2021002',
            phone: '+1234567891',
          },
        },
      },
      include: { profile: true },
    }),
    prisma.user.create({
      data: {
        email: 'bob.wilson@ucp.edu',
        password: userPasswords[2],
        role: 'USER',
        level: 'BRONZE',
        points: 75,
        reputation: 60,
        departmentId: departments[2].id,
        profile: {
          create: {
            firstName: 'Bob',
            lastName: 'Wilson',
            studentId: 'ME2021003',
          },
        },
      },
      include: { profile: true },
    }),
    prisma.user.create({
      data: {
        email: 'alice.brown@ucp.edu',
        password: userPasswords[3],
        role: 'USER',
        level: 'BRONZE',
        points: 50,
        reputation: 55,
        departmentId: departments[0].id,
        profile: {
          create: {
            firstName: 'Alice',
            lastName: 'Brown',
            studentId: 'CS2021004',
          },
        },
      },
      include: { profile: true },
    }),
    prisma.user.create({
      data: {
        email: 'charlie.davis@ucp.edu',
        password: userPasswords[4],
        role: 'USER',
        level: 'NEW',
        points: 20,
        reputation: 10,
        departmentId: departments[3].id,
        profile: {
          create: {
            firstName: 'Charlie',
            lastName: 'Davis',
            studentId: 'BA2021005',
          },
        },
      },
      include: { profile: true },
    }),
  ]);

  console.log('✅ Created sample users');

  // Create Sample Tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Need help picking up lunch from cafeteria',
        description: 'I have a class right now and need someone to pick up lunch from the cafeteria. Will pay 15 points!',
        category: 'ERRAND',
        departmentId: departments[0].id,
        requesterId: users[0].id,
        urgency: 'MEDIUM',
        rewardPoints: 15,
        locationText: 'Main Cafeteria, Building A',
        status: 'OPEN',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    }),
    prisma.task.create({
      data: {
        title: 'Lost: Blue backpack near library',
        description: 'Lost my blue backpack yesterday near the library. Contains laptop and books. Reward: 20 points!',
        category: 'LOST',
        departmentId: departments[0].id,
        requesterId: users[1].id,
        urgency: 'HIGH',
        rewardPoints: 20,
        locationText: 'Library, 2nd floor',
        status: 'OPEN',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isFeatured: true,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Looking for Calculus textbook',
        description: 'Need to borrow or buy Calculus textbook for MATH 101. Willing to pay 25 points.',
        category: 'BOOK',
        departmentId: departments[0].id,
        requesterId: users[2].id,
        urgency: 'LOW',
        rewardPoints: 25,
        locationText: 'Anywhere on campus',
        status: 'ACCEPTED',
        acceptorId: users[3].id,
        acceptedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000),
      },
    }),
    prisma.task.create({
      data: {
        title: 'Tutoring needed for Physics 201',
        description: 'Need help understanding electromagnetism concepts. Can meet on campus. 30 points reward.',
        category: 'TUTORING',
        departmentId: departments[1].id,
        requesterId: users[3].id,
        urgency: 'MEDIUM',
        rewardPoints: 30,
        locationText: 'Study Hall, Building B',
        status: 'OPEN',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isBoosted: true,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Pick up printouts from admin office',
        description: 'Need someone to pick up my printouts from the admin office. Quick task, 10 points.',
        category: 'ERRAND',
        departmentId: departments[2].id,
        requesterId: users[4].id,
        urgency: 'LOW',
        rewardPoints: 10,
        locationText: 'Admin Office, Building C',
        status: 'COMPLETED',
        acceptorId: users[0].id,
        acceptedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 19 * 60 * 60 * 1000),
      },
    }),
  ]);

  console.log('✅ Created sample tasks');

  // Create some messages for the accepted task
  await prisma.message.createMany({
    data: [
      {
        taskId: tasks[2].id,
        senderId: users[2].id,
        receiverId: users[3].id,
        content: 'Hi! I have the Calculus textbook. When can we meet?',
        isRead: true,
      },
      {
        taskId: tasks[2].id,
        senderId: users[3].id,
        receiverId: users[2].id,
        content: 'Great! I can meet you at the library in 30 minutes.',
        isRead: true,
      },
      {
        taskId: tasks[2].id,
        senderId: users[2].id,
        receiverId: users[3].id,
        content: 'Perfect! See you there.',
        isRead: false,
      },
    ],
  });

  console.log('✅ Created sample messages');

  // Create some ratings
  await prisma.rating.create({
    data: {
      taskId: tasks[4].id,
      giverId: users[4].id,
      receiverId: users[0].id,
      score: 5,
      comment: 'Very helpful and punctual!',
    },
  });

  await prisma.rating.create({
    data: {
      taskId: tasks[4].id,
      giverId: users[0].id,
      receiverId: users[4].id,
      score: 5,
      comment: 'Great communication, easy to work with!',
    },
  });

  console.log('✅ Created sample ratings');

  // Create point transactions
  await prisma.pointTransaction.createMany({
    data: [
      {
        userId: users[0].id,
        amount: -10,
        type: 'TASK_POSTED',
        description: 'Posted task: Need help picking up lunch',
        taskId: tasks[0].id,
      },
      {
        userId: users[0].id,
        amount: 15,
        type: 'TASK_COMPLETED',
        description: 'Completed task: Pick up printouts',
        taskId: tasks[4].id,
      },
    ],
  });

  console.log('✅ Created sample point transactions');

  console.log('\n🎉 Seeding completed!');
  console.log('\n📝 Test Credentials:');
  console.log('Admin: admin@ucp.edu / admin123');
  console.log('User: john.doe@ucp.edu / user123');
  console.log('User: jane.smith@ucp.edu / user123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

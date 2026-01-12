import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up tasks...');
  try {
    const deleted = await prisma.task.deleteMany();
    console.log(`Deleted ${deleted.count} tasks.`);
  } catch (error) {
    console.error('Error deleting tasks:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

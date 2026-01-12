import { prisma } from './db';

type UserLevel = 'NEW' | 'BRONZE' | 'SILVER' | 'GOLD' | 'ELITE';
type PointTransactionType = 'TASK_POSTED' | 'TASK_COMPLETED' | 'TASK_CANCELLED' | 'ADMIN_ADJUSTMENT';
type ReputationChangeType = 'TASK_COMPLETED' | 'POSITIVE_RATING' | 'NEGATIVE_RATING' | 'ADMIN_ADJUSTMENT';

export const POINTS_CONFIG = {
  REQUIRED_TO_POST: parseInt(process.env.POINTS_REQUIRED_TO_POST_TASK || '10'),
  EARNED_FOR_COMPLETION: parseInt(process.env.POINTS_EARNED_FOR_COMPLETION || '15'),
  DEDUCTED_FOR_POSTING: parseInt(process.env.POINTS_DEDUCTED_FOR_POSTING || '10'),
};

export const REPUTATION_CONFIG = {
  FOR_TASK_COMPLETION: parseInt(process.env.REP_FOR_TASK_COMPLETION || '5'),
  FOR_POSITIVE_RATING: parseInt(process.env.REP_FOR_POSITIVE_RATING || '3'),
  LOST_FOR_NEGATIVE_RATING: parseInt(process.env.REP_LOST_FOR_NEGATIVE_RATING || '2'),
};

export const LEVEL_THRESHOLDS = {
  BRONZE: parseInt(process.env.REP_BRONZE || '50'),
  SILVER: parseInt(process.env.REP_SILVER || '150'),
  GOLD: parseInt(process.env.REP_GOLD || '300'),
  ELITE: parseInt(process.env.REP_ELITE || '600'),
};

export function calculateUserLevel(reputation: number): UserLevel {
  if (reputation >= LEVEL_THRESHOLDS.ELITE) return 'ELITE';
  if (reputation >= LEVEL_THRESHOLDS.GOLD) return 'GOLD';
  if (reputation >= LEVEL_THRESHOLDS.SILVER) return 'SILVER';
  if (reputation >= LEVEL_THRESHOLDS.BRONZE) return 'BRONZE';
  return 'NEW';
}

export async function deductPoints(userId: string, amount: number, type: PointTransactionType, description?: string, taskId?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  if (user.points < amount) {
    throw new Error('Insufficient points');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { points: { decrement: amount } },
    }),
    prisma.pointTransaction.create({
      data: {
        userId,
        amount: -amount,
        type,
        description,
        taskId,
      },
    }),
  ]);

  return user.points - amount;
}

export async function addPoints(userId: string, amount: number, type: PointTransactionType, description?: string, taskId?: string, tx: any = prisma) {
  await tx.user.update({
    where: { id: userId },
    data: { points: { increment: amount } },
  });

  await tx.pointTransaction.create({
    data: {
      userId,
      amount,
      type,
      description,
      taskId,
    },
  });

  const updatedUser = await tx.user.findUnique({ where: { id: userId } });
  return updatedUser?.points || 0;
}

export async function addReputation(userId: string, change: number, type: ReputationChangeType, description?: string, taskId?: string, ratingId?: string, tx: any = prisma) {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const newReputation = user.reputation + change;
  const newLevel = calculateUserLevel(newReputation);

  await tx.user.update({
    where: { id: userId },
    data: {
      reputation: newReputation,
      level: newLevel,
    },
  });

  await tx.reputationHistory.create({
    data: {
      userId,
      change,
      type,
      description,
      taskId,
      ratingId,
    },
  });

  return { reputation: newReputation, level: newLevel };
}

export async function checkCooldown(userId: string): Promise<{ canPost: boolean; waitMinutes?: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.lastTaskPostAt) {
    return { canPost: true };
  }

  const cooldownMinutes = parseInt(process.env.TASK_POST_COOLDOWN_MINUTES || '30');
  const cooldownMs = cooldownMinutes * 60 * 1000;
  const timeSinceLastPost = Date.now() - user.lastTaskPostAt.getTime();

  if (timeSinceLastPost < cooldownMs) {
    const waitMinutes = Math.ceil((cooldownMs - timeSinceLastPost) / 60000);
    return { canPost: false, waitMinutes };
  }

  return { canPost: true };
}

export async function preventPointFarming(requesterId: string, acceptorId: string): Promise<boolean> {
  const recentTasks = await prisma.task.findMany({
    where: {
      OR: [
        { requesterId, acceptorId },
        { requesterId: acceptorId, acceptorId: requesterId },
      ],
      status: 'COMPLETED',
      completedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    take: 5,
  });

  return recentTasks.length < 5; // Allow max 5 tasks between same two users per day
}

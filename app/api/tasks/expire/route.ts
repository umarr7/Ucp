import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// This endpoint can be called by a cron job to expire old tasks
export async function POST(req: NextRequest) {
  try {
    const now = new Date();
    
    const expiredTasks = await prisma.task.updateMany({
      where: {
        status: { in: ['OPEN', 'ACCEPTED'] },
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return NextResponse.json({
      expired: expiredTasks.count,
      message: `Expired ${expiredTasks.count} tasks`,
    });
  } catch (error) {
    console.error('Expire tasks error:', error);
    return NextResponse.json(
      { error: 'Failed to expire tasks' },
      { status: 500 }
    );
  }
}

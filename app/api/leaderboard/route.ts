import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all-time'; // 'all-time', 'weekly', 'department'
    const departmentId = searchParams.get('departmentId');

    const where: any = {};

    if (type === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      where.reputationHistory = {
        some: {
          createdAt: {
            gte: weekAgo,
          },
        },
      };
    }

    if (type === 'department' && departmentId) {
      where.departmentId = departmentId;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        profile: true,
        department: true,
        _count: {
          select: {
            tasksAccepted: {
              where: {
                status: 'COMPLETED',
              },
            },
          },
        },
      },
      orderBy: { reputation: 'desc' },
      take: 100,
    });

    // For weekly leaderboard, calculate reputation change
    let leaderboard = users.map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      email: user.email,
      firstName: user.profile?.firstName,
      lastName: user.profile?.lastName,
      reputation: user.reputation,
      points: user.points,
      level: user.level,
      department: user.department,
      tasksCompleted: user._count.tasksAccepted,
    }));

    if (type === 'weekly') {
      // Calculate reputation change for each user
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const reputationChanges = await prisma.reputationHistory.groupBy({
        by: ['userId'],
        where: {
          createdAt: {
            gte: weekAgo,
          },
        },
        _sum: {
          change: true,
        },
      });

      const changeMap = new Map(
        reputationChanges.map((r) => [r.userId, r._sum.change || 0])
      );

      leaderboard = leaderboard.map((entry) => ({
        ...entry,
        reputationChange: changeMap.get(entry.userId) || 0,
      }));

      // Sort by reputation change instead
      leaderboard.sort((a, b) => (b.reputationChange || 0) - (a.reputationChange || 0));
      leaderboard = leaderboard.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
    }

    return NextResponse.json({
      type,
      leaderboard,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
});

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, withRateLimit } from '@/lib/middleware';
import { z } from 'zod';
import { deductPoints, checkCooldown, POINTS_CONFIG } from '@/lib/points';

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: z.enum(['ERRAND', 'LOST', 'BOOK', 'TUTORING', 'OTHER']),
  departmentId: z.string(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  rewardPoints: z.number().int().min(1).max(100),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  locationText: z.string().optional(),
  imageUrl: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const GET = withAuth(async (req) => {
  try {
    const userId = req.user!.userId;
    const searchParams = req.nextUrl.searchParams;
    const departmentId = searchParams.get('departmentId');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const myTasks = searchParams.get('myTasks') === 'true';
    const acceptedByMe = searchParams.get('acceptedByMe') === 'true';

    const where: any = {};

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['OPEN', 'ACCEPTED'] };
    }

    if (myTasks) {
      where.requesterId = userId;
    }

    if (acceptedByMe) {
      where.acceptorId = userId;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        requester: {
          include: {
            profile: true,
          },
        },
        acceptor: {
          include: {
            profile: true,
          },
        },
        department: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: [
        { isFeatured: 'desc' },
        { isBoosted: 'desc' },
        { urgency: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 50,
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(withRateLimit(5, 60000)(async (req) => {
  try {
    const userId = req.user!.userId;
    const body = await req.json();
    const data = createTaskSchema.parse(body);

    // Check user level (Bronze required to post)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.level === 'NEW') {
      return NextResponse.json(
        { error: 'Bronze level required to post tasks' },
        { status: 403 }
      );
    }

    // Check cooldown - REMOVED per user request
    // const cooldown = await checkCooldown(userId);
    // if (!cooldown.canPost) {
    //   return NextResponse.json(
    //     { error: `Please wait ${cooldown.waitMinutes} minutes before posting another task` },
    //     { status: 429 }
    //   );
    // }

    // Check points
    if (user.points < POINTS_CONFIG.REQUIRED_TO_POST) {
      return NextResponse.json(
        { error: `Insufficient points. Need ${POINTS_CONFIG.REQUIRED_TO_POST} points to post a task` },
        { status: 400 }
      );
    }

    // Verify department
    const department = await prisma.department.findUnique({
      where: { id: data.departmentId },
    });
    if (!department) {
      return NextResponse.json(
        { error: 'Invalid department' },
        { status: 400 }
      );
    }

    // Calculate expiry (default 24 hours)
    const expiryHours = parseInt(process.env.TASK_EXPIRY_HOURS || '24');
    const expiresAt = data.expiresAt
      ? new Date(data.expiresAt)
      : new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Deduct points
    await deductPoints(
      userId,
      POINTS_CONFIG.DEDUCTED_FOR_POSTING,
      'TASK_POSTED',
      `Posted task: ${data.title}`,
      undefined
    );

    // Create task
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        departmentId: data.departmentId,
        requesterId: userId,
        urgency: data.urgency,
        rewardPoints: data.rewardPoints,
        latitude: data.latitude,
        longitude: data.longitude,
        locationText: data.locationText,
        imageUrl: data.imageUrl,
        expiresAt,
      },
      include: {
        requester: {
          include: {
            profile: true,
          },
        },
        department: true,
      },
    });

    // Update last task post time
    await prisma.user.update({
      where: { id: userId },
      data: { lastTaskPostAt: new Date() },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create task' },
      { status: 500 }
    );
  }
}));

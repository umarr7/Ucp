import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { z } from 'zod';
import { addReputation, REPUTATION_CONFIG } from '@/lib/points';

const createRatingSchema = z.object({
  taskId: z.string(),
  receiverId: z.string(),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const userId = req.user!.userId;
    const body = await req.json();
    const data = createRatingSchema.parse(body);

    // Verify task exists and is completed
    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Can only rate completed tasks' },
        { status: 400 }
      );
    }

    // Verify user is part of the task
    if (task.requesterId !== userId && task.acceptorId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Verify receiver is the other party
    const otherPartyId = task.requesterId === userId ? task.acceptorId : task.requesterId;
    if (data.receiverId !== otherPartyId) {
      return NextResponse.json(
        { error: 'Invalid receiver' },
        { status: 400 }
      );
    }

    // Check if already rated
    const existingRating = await prisma.rating.findUnique({
      where: {
        taskId_giverId: {
          taskId: data.taskId,
          giverId: userId,
        },
      },
    });

    if (existingRating) {
      return NextResponse.json(
        { error: 'Already rated this task' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Create rating
      const rating = await tx.rating.create({
        data: {
          taskId: data.taskId,
          giverId: userId,
          receiverId: data.receiverId,
          score: data.score,
          comment: data.comment,
        },
      });

      // Update reputation based on rating
      if (data.score >= 4) {
        await addReputation(
          data.receiverId,
          REPUTATION_CONFIG.FOR_POSITIVE_RATING,
          'POSITIVE_RATING',
          `Received ${data.score}/5 rating`,
          data.taskId,
          rating.id
        );
      } else if (data.score <= 2) {
        await addReputation(
          data.receiverId,
          -REPUTATION_CONFIG.LOST_FOR_NEGATIVE_RATING,
          'NEGATIVE_RATING',
          `Received ${data.score}/5 rating`,
          data.taskId,
          rating.id
        );
      }

      return rating;
    });

    const rating = await prisma.rating.findUnique({
      where: {
        taskId_giverId: {
          taskId: data.taskId,
          giverId: userId,
        },
      },
      include: {
        giver: {
          include: {
            profile: true,
          },
        },
        receiver: {
          include: {
            profile: true,
          },
        },
      },
    });

    return NextResponse.json(rating, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Create rating error:', error);
    return NextResponse.json(
      { error: 'Failed to create rating' },
      { status: 500 }
    );
  }
});

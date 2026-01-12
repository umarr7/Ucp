import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { addPoints, addReputation, preventPointFarming, POINTS_CONFIG, REPUTATION_CONFIG } from '@/lib/points';

export const POST = withAuth(async (req: any, { params }: { params: { id: string } }) => {
  try {
    const userId = req.user!.userId;
    const task = await prisma.task.findUnique({
      where: { id: params.id },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Task is not accepted' },
        { status: 400 }
      );
    }

    if (task.acceptorId !== userId && task.requesterId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Prevent point farming
    const canComplete = await preventPointFarming(task.requesterId, task.acceptorId!);
    if (!canComplete) {
      return NextResponse.json(
        { error: 'Too many tasks completed between same users recently. Please wait 24 hours.' },
        { status: 429 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Update task status
      await tx.task.update({
        where: { id: params.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Award points to acceptor
      await addPoints(
        task.acceptorId!,
        task.rewardPoints,
        'TASK_COMPLETED',
        `Completed task: ${task.title}`,
        task.id,
        tx
      );

      // Award reputation to acceptor
      await addReputation(
        task.acceptorId!,
        REPUTATION_CONFIG.FOR_TASK_COMPLETION,
        'TASK_COMPLETED',
        `Completed task: ${task.title}`,
        task.id,
        undefined,
        tx
      );
      // Send completion message
      await tx.message.create({
        data: {
          taskId: task.id,
          senderId: task.acceptorId!,
          receiverId: task.requesterId,
          content: `✅ I have marked this task as completed. Points should be transferred shortly!`,
        },
      });
    });

    const updatedTask = await prisma.task.findUnique({
      where: { id: params.id },
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
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Complete task error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete task' },
      { status: 500 }
    );
  }
});

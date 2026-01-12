import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

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

    if (task.status !== 'OPEN') {
      return NextResponse.json(
        { error: 'Task is not available' },
        { status: 400 }
      );
    }

    if (task.requesterId === userId) {
      return NextResponse.json(
        { error: 'Cannot accept your own task' },
        { status: 400 }
      );
    }

    if (task.expiresAt < new Date()) {
      await prisma.task.update({
        where: { id: params.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json(
        { error: 'Task has expired' },
        { status: 400 }
      );
    }

    // Check if user already has an accepted task - REMOVED per user request
    // const activeTask = await prisma.task.findFirst({
    //   where: {
    //     acceptorId: userId,
    //     status: 'ACCEPTED',
    //   },
    // });

    // if (activeTask) {
    //   return NextResponse.json(
    //     { error: 'You already have an active task. Complete it first.' },
    //     { status: 400 }
    //   );
    // }

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        status: 'ACCEPTED',
        acceptorId: userId,
        acceptedAt: new Date(),
      },
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
    console.error('Accept task error:', error);
    return NextResponse.json(
      { error: 'Failed to accept task' },
      { status: 500 }
    );
  }
});

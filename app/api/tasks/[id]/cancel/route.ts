import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

export const POST = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
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

    // Only requester or acceptor can cancel
    if (task.requesterId !== userId && task.acceptorId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (task.status === 'COMPLETED' || task.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Task is already completed or cancelled' },
        { status: 400 }
      );
    }

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
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
    console.error('Cancel task error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel task' },
      { status: 500 }
    );
  }
});

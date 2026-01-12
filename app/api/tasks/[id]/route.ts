import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
// GET task detail is public to allow viewing before authentication issues block it
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const task = await prisma.task.findUnique({
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
        ratings: {
          include: {
            giver: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

export const DELETE = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
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

    // Only requester or admin can delete
    if (task.requesterId !== userId && req.user!.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Can only delete if not accepted or completed
    if (task.status === 'ACCEPTED' || task.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot delete task that is accepted or completed' },
        { status: 400 }
      );
    }

    await prisma.task.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
});

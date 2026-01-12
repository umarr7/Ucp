import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/middleware';
import { z } from 'zod';

const createMessageSchema = z.object({
  taskId: z.string(),
  receiverId: z.string(),
  content: z.string().min(1).max(1000),
});

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const userId = req.user!.userId;
    const searchParams = req.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    // Verify user is part of this task conversation
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.requesterId !== userId && task.acceptorId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Chat is only available after task is accepted
    if (task.status === 'OPEN') {
      return NextResponse.json(
        { error: 'Chat opens after task is accepted' },
        { status: 400 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { taskId },
      include: {
        sender: {
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
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const userId = req.user!.userId;
    const body = await req.json();
    const data = createMessageSchema.parse(body);

    // Verify task exists and user is part of it
    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.requesterId !== userId && task.acceptorId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Chat only available after acceptance
    if (task.status === 'OPEN') {
      return NextResponse.json(
        { error: 'Chat opens after task is accepted' },
        { status: 400 }
      );
    }

    // Chat becomes read-only after completion
    if (task.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Chat is read-only after task completion' },
        { status: 400 }
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

    const message = await prisma.message.create({
      data: {
        taskId: data.taskId,
        senderId: userId,
        receiverId: data.receiverId,
        content: data.content,
      },
      include: {
        sender: {
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

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Create message error:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
});

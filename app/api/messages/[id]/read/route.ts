import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

export const POST = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const userId = req.user!.userId;

    await prisma.message.updateMany({
      where: {
        id: params.id,
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark message read error:', error);
    return NextResponse.json(
      { error: 'Failed to mark message as read' },
      { status: 500 }
    );
  }
});

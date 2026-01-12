import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';
import { z } from 'zod';
import { withRateLimit } from '@/lib/middleware';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const POST = withRateLimit(10, 60000)(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const data = loginSchema.parse(body);
    const email = data.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        department: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValid = await comparePassword(data.password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = generateToken(user);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        level: user.level,
        points: user.points,
        reputation: user.reputation,
        profile: user.profile,
        department: user.department,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
});

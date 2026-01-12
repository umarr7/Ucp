import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { z } from 'zod';
import { withRateLimit } from '@/lib/middleware';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  studentId: z.string().optional(),
  phone: z.string().optional(),
  departmentId: z.string(),
});

export const POST = withRateLimit(10, 60000)(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);
    const email = data.email.toLowerCase();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Check if studentId is unique if provided
    if (data.studentId) {
      const existingProfile = await prisma.profile.findUnique({
        where: { studentId: data.studentId },
      });
      if (existingProfile) {
        return NextResponse.json(
          { error: 'Student ID already registered' },
          { status: 400 }
        );
      }
    }

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: data.departmentId },
    });
    if (!department) {
      return NextResponse.json(
        { error: 'Invalid department' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        departmentId: data.departmentId,
        profile: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            studentId: data.studentId,
            phone: data.phone,
          },
        },
      },
      include: {
        profile: true,
        department: true,
      },
    });

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
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
});

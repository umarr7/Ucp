import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from './auth';
import { prisma } from './db';

let io: SocketIOServer | null = null;

export function initializeSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*', // Allow all origins for debugging
      methods: ['GET', 'POST'],
    },
    path: '/api/socket',
  });

  io.use(async (socket, next) => {
    console.log('Socket connection attempt:', socket.id);
    const token = socket.handshake.auth.token;
    if (!token) {
      console.log('Socket auth error: No token');
      return next(new Error('Authentication error'));
    }

    const payload = verifyToken(token);
    if (!payload) {
      console.log('Socket auth error: Invalid token');
      return next(new Error('Invalid token'));
    }

    console.log('✅ Socket authenticated for user:', payload.userId);
    socket.data.userId = payload.userId;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`✅ User ${userId} connected (Socket ID: ${socket.id})`);

    // Join task-specific room
    socket.on('join-task', async (taskId: string) => {
      // Verify user is part of this task
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (task && (task.requesterId === userId || task.acceptorId === userId)) {
        socket.join(`task:${taskId}`);
        socket.emit('joined-task', taskId);
      }
    });

    // Leave task room
    socket.on('leave-task', (taskId: string) => {
      socket.leave(`task:${taskId}`);
    });

    // Send message
    socket.on('send-message', async (data: { taskId: string; receiverId: string; content: string }) => {
      try {
        const task = await prisma.task.findUnique({
          where: { id: data.taskId },
        });

        if (!task || (task.requesterId !== userId && task.acceptorId !== userId)) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        if (task.status === 'OPEN' || task.status === 'COMPLETED') {
          socket.emit('error', { message: 'Cannot send message' });
          return;
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

        // Emit to both parties in the task room
        io?.to(`task:${data.taskId}`).emit('new-message', message);
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

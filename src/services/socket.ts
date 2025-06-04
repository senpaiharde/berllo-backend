import { Server as IOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: IOServer;

export function intiSocket(server: HTTPServer) {
  // Build an array of allowed origins from the env var
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
  const allowed = raw.split(',').map((origin) => origin.trim());

  io = new IOServer(server, {
    cors: {
      origin: allowed,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('socket connected:', socket.id);

    socket.on('joinTask', (taskId: string) => {
      socket.join(`task_${taskId}`);
    });

    socket.on('disconnect', () => {
      console.log('socket disconnected', socket.id);
    });
  });

  return io;
}

export function getIO(): IOServer {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

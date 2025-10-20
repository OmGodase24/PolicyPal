import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token = this.extractTokenFromSocket(client);
      
      if (!token) {
        this.logger.warn('❌ No token provided in connection');
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload: any = this.jwtService.verify(token);
      // Support various JWT payload shapes: { userId }, { sub }, { _id }, { user: { _id } }
      client.userId = payload?.userId || payload?.sub || payload?._id || payload?.user?._id;
      
      // Store user connection
      if (client.userId) {
        this.connectedUsers.set(client.userId, client.id);
      }
      
      this.logger.log(`✅ User ${client.userId ?? 'unknown'} connected (${client.id})`);
      
      // Join user to their personal room
      if (client.userId) {
        client.join(`user:${client.userId}`);
      }
      
      // Send connection confirmation
      client.emit('connected', { 
        message: 'Connected to notification service',
        userId: client.userId
      });

    } catch (error) {
      this.logger.error(`❌ Authentication failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.logger.log(`👋 User ${client.userId} disconnected (${client.id})`);
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string }
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Only allow joining user-specific rooms or public rooms
    if (data.room.startsWith('user:') && data.room !== `user:${client.userId}`) {
      client.emit('error', { message: 'Unauthorized room access' });
      return;
    }

    client.join(data.room);
    client.emit('joined_room', { room: data.room });
    this.logger.log(`User ${client.userId} joined room: ${data.room}`);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string }
  ) {
    client.leave(data.room);
    client.emit('left_room', { room: data.room });
    this.logger.log(`User ${client.userId} left room: ${data.room}`);
  }

  @SubscribeMessage('mark_notification_read')
  handleMarkNotificationRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string }
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Just log the event - don't emit back to avoid infinite loop
    // The HTTP API call will handle the actual marking as read
    this.logger.log(`User ${client.userId} marked notification ${data.notificationId} as read via WebSocket`);
  }

  // Method to send notification to specific user
  sendToUser(userId: string, notification: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', notification);
      this.logger.log(`📨 Sent notification to user ${userId}`);
    } else {
      this.logger.warn(`⚠️ User ${userId} is not connected`);
    }
  }

  // Method to send notification to user's room
  sendToUserRoom(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.log(`📨 Sent notification to user room ${userId}`);
  }

  // Method to broadcast to all connected users
  broadcastToAll(notification: any) {
    this.server.emit('notification', notification);
    this.logger.log(`📢 Broadcasted notification to all users`);
  }

  // Method to send to specific room
  sendToRoom(room: string, notification: any) {
    this.server.to(room).emit('notification', notification);
    this.logger.log(`📨 Sent notification to room: ${room}`);
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get connected users list
  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  private extractTokenFromSocket(client: Socket): string | null {
    // Try to get token from handshake auth
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // Try to get token from handshake headers
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from query parameters
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }

    return null;
  }
}

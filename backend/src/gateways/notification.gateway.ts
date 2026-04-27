import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { NotificationService } from '../services/notification.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/notifications' })
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private jwtService: JwtService,
    private notificationService: NotificationService,
  ) {
    this.notificationService.setGateway(this);
  }

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    client.leave(`user:${client.data.userId}`);
  }

  emitToUser(userId: number, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}

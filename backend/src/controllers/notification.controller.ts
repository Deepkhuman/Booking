import { Controller, Delete, Get, Param, ParseIntPipe, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { NotificationService } from '../services/notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getAll(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationService.getAll(user.id, Number(page), Number(limit));
  }

  @Put(':id/read')
  markRead(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.notificationService.markRead(user.id, id);
  }

  @Put('read-all')
  markAllRead(@CurrentUser() user: any) {
    return this.notificationService.markAllRead(user.id);
  }

  @Delete(':id')
  delete(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.notificationService.delete(user.id, id);
  }
}

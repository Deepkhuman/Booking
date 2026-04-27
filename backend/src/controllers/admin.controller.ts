import { Controller, Get, Param, ParseIntPipe, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AdminService } from '../services/admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(Number(page), Number(limit), search);
  }

  @Put('users/:id/block')
  blockUser(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.adminService.blockUser(user.id, id);
  }

  @Put('users/:id/unblock')
  unblockUser(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.adminService.unblockUser(user.id, id);
  }

  @Get('actions')
  getAuditLog(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getAuditLog(Number(page), Number(limit));
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { MenuService } from '../services/menu.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtPayload } from '../strategies/jwt.strategy';

@Controller('menu')
@UseGuards(JwtAuthGuard)
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Get()
  getMenu(@CurrentUser() user: JwtPayload) {
    return this.menuService.getMenuForRole(user.role);
  }
}

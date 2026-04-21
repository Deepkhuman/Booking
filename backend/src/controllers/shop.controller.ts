import { Controller } from '@nestjs/common';
import { ShopService } from '../services/shop.service';

@Controller('shops')
export class ShopController {
  constructor(private shopService: ShopService) {}
}

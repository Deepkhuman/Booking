import { Controller } from '@nestjs/common';
import { ServiceService } from '../services/service.service';

@Controller('services')
export class ServiceController {
  constructor(private serviceService: ServiceService) {}
}

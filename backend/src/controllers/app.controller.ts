import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  healthCheck() {
    return { message: 'Welcome to the Booking Platform API' };
  }
}

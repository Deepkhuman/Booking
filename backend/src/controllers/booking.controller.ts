import { Controller } from '@nestjs/common';
import { BookingService } from '../services/booking.service';

@Controller('bookings')
export class BookingController {
  constructor(private bookingService: BookingService) {}
}

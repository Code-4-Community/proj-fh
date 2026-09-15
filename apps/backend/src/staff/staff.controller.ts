import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { Staff } from './staff.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(private staffService: StaffService) {}

  @Get('/:staffId')
  async getStaff(@Param('staffId', ParseIntPipe) staffId: number): Promise<Staff> {
    return this.staffService.findOne(staffId);
  }

  @Delete('/:id')
  removeStaff(@Param('id') id: string) {
    return this.staffService.remove(parseInt(id));
  }

  // Example endpoint for email sending (DO NOT DEPLOY THIS)
  /*
  @Post('/test-email')
  sendTestEmail(@Body() body: { recipient: string }) {
    return this.usersService.sendTestEmail(body.recipient);
  }
  */
}

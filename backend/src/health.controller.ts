import { Controller, Get } from '@nestjs/common';
import { Public } from '@modules/auth/decorators/public.decorator';

/**
 * Basic process health endpoint.
 * MongoDB is connected during application startup by PrismaService, so a successful
 * response also confirms Nest completed module initialization.
 */
@Controller()
export class HealthController {
  @Public()
  @Get()
  getRoot() {
    return {
      status: 'ok',
      service: 'youtube-automation-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'youtube-automation-api',
      timestamp: new Date().toISOString(),
    };
  }
}

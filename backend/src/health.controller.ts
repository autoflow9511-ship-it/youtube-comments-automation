import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '@modules/auth/decorators/public.decorator';
import { PrismaService } from '@database/prisma.service';

/** Liveness checks the HTTP process; readiness additionally verifies live MongoDB access. */
@Controller()
export class HealthController {
  constructor(private readonly database: PrismaService) {}

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

  @Public()
  @Get('ready')
  async getReadiness() {
    try {
      await this.database.ping();
      return {
        status: 'ready',
        service: 'youtube-automation-api',
        checks: { database: 'ok' },
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'youtube-automation-api',
        checks: { database: 'unavailable' },
      });
    }
  }
}

import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AuthGuard } from '@guards/auth.guard';
import { RolesGuard } from '@guards/roles.guard';
import { Roles } from '@decorators/roles.decorator';
import { CurrentUser } from '@decorators/current-user.decorator';
import { UserRole, SubscriptionTier } from '@prisma/client';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get system statistics' })
  @ApiResponse({ status: 200, description: 'System stats retrieved successfully' })
  async getStats() {
    return this.adminService.getSystemStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'subscriptionTier', required: false, enum: SubscriptionTier })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('subscriptionTier') subscriptionTier?: SubscriptionTier,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.adminService.getAllUsers({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      role,
      subscriptionTier,
      sortBy,
      sortOrder,
    });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details (admin)' })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetails(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user (admin)' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() data: {
      role?: UserRole;
      subscriptionTier?: SubscriptionTier;
      subscriptionExpiresAt?: string | null;
      isEmailVerified?: boolean;
    },
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateUser(id, {
      ...data,
      subscriptionExpiresAt: data.subscriptionExpiresAt ? new Date(data.subscriptionExpiresAt) : null,
    }, adminId);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user (admin)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.deleteUser(id, adminId);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'adminId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'resource', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
  ) {
    return this.adminService.getAuditLogs({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      userId,
      adminId,
      action,
      resource,
    });
  }

  @Get('config')
  @ApiOperation({ summary: 'Get system configuration' })
  @ApiResponse({ status: 200, description: 'System config retrieved successfully' })
  async getConfig() {
    return this.adminService.getSystemConfig();
  }

  @Put('config/:key')
  @ApiOperation({ summary: 'Update system configuration' })
  @ApiResponse({ status: 200, description: 'Config updated successfully' })
  async updateConfig(
    @Param('key') key: string,
    @Body('value') value: any,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.updateSystemConfig(key, value, adminId);
  }
}
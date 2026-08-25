import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuthGuard } from '@guards/auth.guard';
import { RolesGuard } from '@guards/roles.guard';
import { Roles } from '@decorators/roles.decorator';
import { CurrentUser } from '@decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'subscriptionTier', required: false, enum: ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'] })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('subscriptionTier') subscriptionTier?: string,
  ) {
    return this.usersService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      role,
      subscriptionTier: subscriptionTier as any,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get current user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics' })
  async getStats(@CurrentUser('id') userId: string) {
    return this.usersService.getStats(userId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id/role')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user role (admin only)' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.usersService.updateRole(id, role, currentUserId);
  }

  @Put(':id/subscription')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user subscription (admin only)' })
  @ApiResponse({ status: 200, description: 'Subscription updated successfully' })
  async updateSubscription(
    @Param('id') id: string,
    @Body() data: { tier: string; expiresAt?: string },
  ) {
    return this.usersService.updateSubscription(
      id,
      data.tier as any,
      data.expiresAt ? new Date(data.expiresAt) : undefined,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate user (admin only)' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivate(@Param('id') id: string, @CurrentUser('id') currentUserId: string) {
    return this.usersService.deactivate(id, currentUserId);
  }
}
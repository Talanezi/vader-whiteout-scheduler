import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import JwtAuthGuard from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import User from './user.entity';
import { CreateUserTemplateDto, UpdateUserTemplateDto } from './user-template.dto';
import { UserTemplatesService } from './user-templates.service';

@Controller('api')
export class UserTemplatesController {
  constructor(private readonly userTemplatesService: UserTemplatesService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me/templates')
  getMyTemplates(@AuthUser() user: User) {
    return this.userTemplatesService.getUserTemplates(user.ID);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/templates')
  createMyTemplate(
    @AuthUser() user: User,
    @Body() dto: CreateUserTemplateDto,
  ) {
    return this.userTemplatesService.createUserTemplate(user.ID, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/templates/:id')
  updateMyTemplate(
    @AuthUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateUserTemplateDto,
  ) {
    return this.userTemplatesService.updateUserTemplate(user.ID, Number(id), dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/templates/:id')
  deleteMyTemplate(
    @AuthUser() user: User,
    @Param('id') id: string,
  ) {
    return this.userTemplatesService.deleteUserTemplate(user.ID, Number(id));
  }
}

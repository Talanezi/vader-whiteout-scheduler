import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import User from './user.entity';
import UsersService from './users.service';
import MeetingsModule from '../meetings/meetings.module';
import { UserTemplate } from './user-template.entity';
import { UserTemplatesService } from './user-templates.service';
import { UserTemplatesController } from './user-templates.controller';

@Module({
  imports: [MeetingsModule, TypeOrmModule.forFeature([User, UserTemplate])],
  providers: [UsersService, UserTemplatesService],
  exports: [UsersService, TypeOrmModule],
  controllers: [UsersController, UserTemplatesController],
})
export default class UsersModule {}
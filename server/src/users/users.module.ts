import { ProductionTeamController } from './production-team.controller';
import DbconfigModule from '../dbconfig/dbconfig.module';
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
  imports: [
    DbconfigModule,
    MeetingsModule,
    TypeOrmModule.forFeature([User, UserTemplate]),
  ],
  providers: [UsersService, UserTemplatesService],
  exports: [UsersService, TypeOrmModule],
  controllers: [UsersController, UserTemplatesController, ProductionTeamController],
})
export default class UsersModule {}

import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import JwtAuthGuard from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import User from './user.entity';
import UsersService from './users.service';
import { manageProductionMembership } from './production-membership-admin';

@Controller('production-team')
@UseGuards(JwtAuthGuard)
export class ProductionTeamController {
  constructor(private readonly users: UsersService, @InjectRepository(User) private readonly accounts: Repository<User>, private readonly db: DataSource) {}
  private async admin(user: User) { if (!(await this.users.productionTeamAdmin(user))) throw new ForbiddenException('Production team administrator required.'); }
  @Get()
  async list(@AuthUser() actor: User) {
    await this.admin(actor);
    const accounts=await this.accounts.find({select:{ID:true,Name:true,Email:true,Department:true,Role:true},order:{Name:'ASC'}});
    return {items:await Promise.all(accounts.map(async user=>({id:user.ID,name:user.Name,email:user.Email,department:user.Department||'',role:user.Role||'',membership:await this.users.productionMembership(user)})))};
  }
  @Post(':id/:action')
  async manage(@AuthUser() actor: User,@Param('id') id: string,@Param('action') action:string,@Body() body: {department?:string;role?:string;evidence?:string}) {
    await this.admin(actor);
    const userID=Number(id);
    if(!Number.isSafeInteger(userID)||userID<=0||!['verify','revoke'].includes(action)||typeof body?.evidence!=='string'||!body.evidence.trim()||body.evidence.length>1000)throw new BadRequestException('Confirm the account, assignment and verification evidence.');
    const user=await this.accounts.findOneBy({ID:userID});
    if(!user)throw new BadRequestException('Account unavailable.');
    if(userID===actor.ID&&action==='revoke')throw new BadRequestException('A team administrator cannot revoke their own access.');
    return manageProductionMembership(this.db,{action:action as 'verify'|'revoke',expectedUserID:userID,email:user.Email,department:body.department,role:body.role,actor:`${actor.Name} (${actor.ID})`,evidence:body.evidence});
  }
}

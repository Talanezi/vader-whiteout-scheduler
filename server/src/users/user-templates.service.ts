import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTemplate } from './user-template.entity';
import { CreateUserTemplateDto, UpdateUserTemplateDto } from './user-template.dto';

@Injectable()
export class UserTemplatesService {
  constructor(
    @InjectRepository(UserTemplate)
    private readonly userTemplatesRepo: Repository<UserTemplate>,
  ) {}

  async getUserTemplates(userID: number) {
    const rows = await this.userTemplatesRepo.find({
      where: { UserID: userID },
      order: { UpdatedAt: 'DESC' },
    });

    return rows.map((row) => ({
      id: String(row.ID),
      name: row.Name,
      slots: JSON.parse(row.SlotsJSON),
      createdAt: row.CreatedAt,
      updatedAt: row.UpdatedAt,
    }));
  }

  async createUserTemplate(userID: number, dto: CreateUserTemplateDto) {
    const row = this.userTemplatesRepo.create({
      UserID: userID,
      Name: dto.name.trim(),
      SlotsJSON: JSON.stringify(dto.slots),
    });
    const saved = await this.userTemplatesRepo.save(row);
    return {
      id: String(saved.ID),
      name: saved.Name,
      slots: JSON.parse(saved.SlotsJSON),
      createdAt: saved.CreatedAt,
      updatedAt: saved.UpdatedAt,
    };
  }

  async updateUserTemplate(userID: number, templateID: number, dto: UpdateUserTemplateDto) {
    const row = await this.userTemplatesRepo.findOne({
      where: { ID: templateID, UserID: userID },
    });
    if (!row) throw new NotFoundException('Template not found');

    if (dto.name !== undefined) row.Name = dto.name.trim();
    if (dto.slots !== undefined) row.SlotsJSON = JSON.stringify(dto.slots);

    const saved = await this.userTemplatesRepo.save(row);
    return {
      id: String(saved.ID),
      name: saved.Name,
      slots: JSON.parse(saved.SlotsJSON),
      createdAt: saved.CreatedAt,
      updatedAt: saved.UpdatedAt,
    };
  }

  async deleteUserTemplate(userID: number, templateID: number) {
    const row = await this.userTemplatesRepo.findOne({
      where: { ID: templateID, UserID: userID },
    });
    if (!row) throw new NotFoundException('Template not found');

    await this.userTemplatesRepo.remove(row);
    return { ok: true };
  }
}

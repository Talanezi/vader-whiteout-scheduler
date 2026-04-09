import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

class TemplateSlotDto {
  weekday: number;
  hour: number;
  minute: number;
}

export class CreateUserTemplateDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsArray()
  slots: TemplateSlotDto[];
}

export class UpdateUserTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsArray()
  slots?: TemplateSlotDto[];
}

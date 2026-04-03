import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsBoolean,
  IsOptional,
  IsIn,
} from 'class-validator';
import {
  ALL_PRODUCTION_ROLES,
  PRODUCTION_DEPARTMENTS,
} from '../users/production-roles';

export default class LocalSignupDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({ require_tld: false })
  email: string;

  @ApiProperty({ example: 'super_secret_password' })
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  password: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  subscribe_to_notifications?: boolean;

  @ApiProperty({ example: 'Production', enum: PRODUCTION_DEPARTMENTS })
  @IsString()
  @IsIn(PRODUCTION_DEPARTMENTS)
  department: string;

  @ApiProperty({ example: 'Executive Producer', enum: ALL_PRODUCTION_ROLES })
  @IsString()
  @IsIn(ALL_PRODUCTION_ROLES)
  role: string;
}

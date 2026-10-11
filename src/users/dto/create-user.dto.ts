import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '../../entities/user.entity';

export class CreateUserDto {
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsEnum(Role) role: Role;
}

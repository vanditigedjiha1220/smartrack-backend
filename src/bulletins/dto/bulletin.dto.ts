import { IsOptional, IsString } from 'class-validator';

export class GenerateBulletinsDto {
  @IsString() classRoomId: string;
  @IsString() term: string;
}

export class SignBulletinDto {
  @IsOptional() @IsString() comment?: string; // laisser vide pour garder le mot auto-généré
}

import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RequestAccessDto {
  @IsString() classRoomId: string;
  @IsString() subjectAssignmentId: string;
}

export class GrantAccessDto {
  @IsString() teacherId: string;
  @IsString() classRoomId: string;
  @IsString() subjectAssignmentId: string;
  @IsDateString() expiresAt: string; // ISO — l'admin choisit précisément jusqu'à quand
  @IsOptional() @IsString() reason?: string;
}

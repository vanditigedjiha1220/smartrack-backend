import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateGradeDto {
  @IsString() studentId: string;
  @IsString() classRoomId: string;
  @IsString() subjectAssignmentId: string;
  @IsString() term: string;
  @IsNumber() @Min(0) value: number;
  @IsOptional() @IsNumber() @Max(20) maxValue?: number;
}

export class ModifyGradeDto {
  @IsNumber() @Min(0) newValue: number;
  @IsString() reason: string; // OBLIGATOIRE — refusé si vide par le serveur
}

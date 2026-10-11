import { IsArray, IsDateString, IsNumber, IsString, Min } from 'class-validator';

// L'enseignant fait l'appel pour toute une séance d'un coup : une salle/matière,
// une date, une liste d'élèves absents, une durée de séance (en heures).
export class RecordAttendanceDto {
  @IsString() classRoomId: string;
  @IsString() subjectAssignmentId: string;
  @IsString() term: string;
  @IsDateString() date: string;
  @IsNumber() @Min(0.5) hours: number;
  @IsArray() @IsString({ each: true }) absentStudentIds: string[];
}

// Le superviseur approuve la justification pour UN élève, UN jour précis —
// jamais "toutes les absences" de l'élève, uniquement celles de ce jour-là.
export class ApproveJustificationDto {
  @IsString() studentId: string;
  @IsDateString() date: string;
}

export class ConfirmJustificationDto {
  @IsString() studentId: string;
  @IsDateString() date: string;
}

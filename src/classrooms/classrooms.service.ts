import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassRoom } from '../entities/classroom.entity';
import { SubjectAssignment } from '../entities/subject-assignment.entity';
import { Student } from '../entities/student.entity';
import { User } from '../entities/user.entity';
import {
  CreateClassRoomDto,
  AddSubjectAssignmentDto,
  AddStudentDto,
  SetPrincipalTeacherDto,
} from './dto/classroom.dto';

@Injectable()
export class ClassroomsService {
  constructor(
    @InjectRepository(ClassRoom) private classRepo: Repository<ClassRoom>,
    @InjectRepository(SubjectAssignment) private subjectRepo: Repository<SubjectAssignment>,
    @InjectRepository(Student) private studentRepo: Repository<Student>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  create(dto: CreateClassRoomDto) {
    return this.classRepo.save(this.classRepo.create(dto));
  }

  async findAll() {
    const classRooms = await this.classRepo.find({ relations: ['principalTeacher'] });

    // La liste doit inclure les matières (avec l'enseignant assigné), sinon
    // l'app enseignant ne peut pas savoir quelles salles/matières lui appartiennent.
    const result: any[] = [];
    for (const classRoom of classRooms) {
      const subjects = await this.subjectRepo.find({
        where: { classRoomId: classRoom.id },
        relations: ['teacher'],
      });
      const students = await this.studentRepo.find({ where: { classRoomId: classRoom.id } });

      result.push({
        ...classRoom,
        principalTeacher: classRoom.principalTeacher
          ? {
              id: classRoom.principalTeacher.id,
              firstName: classRoom.principalTeacher.firstName,
              lastName: classRoom.principalTeacher.lastName,
            }
          : null,
        subjects: subjects.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          coefficient: s.coefficient,
          teacher: { id: s.teacher.id, firstName: s.teacher.firstName, lastName: s.teacher.lastName },
        })),
        students,
      });
    }

    return result;
  }

  async findOneWithDetails(id: string) {
    const classRoom = await this.classRepo.findOne({ where: { id }, relations: ['principalTeacher'] });
    if (!classRoom) throw new NotFoundException('Salle introuvable');

    const subjects = await this.subjectRepo.find({
      where: { classRoomId: id },
      relations: ['teacher'],
    });
    const students = await this.studentRepo.find({ where: { classRoomId: id } });

    return {
      ...classRoom,
      principalTeacher: classRoom.principalTeacher
        ? {
            id: classRoom.principalTeacher.id,
            firstName: classRoom.principalTeacher.firstName,
            lastName: classRoom.principalTeacher.lastName,
          }
        : null,
      subjects: subjects.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        coefficient: s.coefficient,
        teacher: { id: s.teacher.id, firstName: s.teacher.firstName, lastName: s.teacher.lastName },
      })),
      students,
    };
  }

  async addSubjectAssignment(classRoomId: string, dto: AddSubjectAssignmentDto) {
    const classRoom = await this.classRepo.findOne({ where: { id: classRoomId } });
    if (!classRoom) throw new NotFoundException('Salle introuvable');

    const assignment = this.subjectRepo.create({ ...dto, classRoomId });
    return this.subjectRepo.save(assignment);
  }

  async addStudent(classRoomId: string, dto: AddStudentDto) {
    const classRoom = await this.classRepo.findOne({ where: { id: classRoomId } });
    if (!classRoom) throw new NotFoundException('Salle introuvable');

    const student = this.studentRepo.create({ ...dto, classRoomId });
    return this.studentRepo.save(student);
  }

  // Le professeur principal doit être l'un des enseignants déjà assignés à une
  // matière de cette salle — pas n'importe quel enseignant du système.
  async setPrincipalTeacher(classRoomId: string, dto: SetPrincipalTeacherDto) {
    const classRoom = await this.classRepo.findOne({ where: { id: classRoomId } });
    if (!classRoom) throw new NotFoundException('Salle introuvable');

    const teacher = await this.userRepo.findOne({ where: { id: dto.teacherId } });
    if (!teacher) throw new NotFoundException('Enseignant introuvable');

    const assignedHere = await this.subjectRepo.findOne({
      where: { classRoomId, teacherId: dto.teacherId },
    });
    if (!assignedHere) {
      throw new NotFoundException("Cet enseignant n'enseigne aucune matière dans cette salle");
    }

    classRoom.principalTeacherId = dto.teacherId;
    return this.classRepo.save(classRoom);
  }

  getSubjectAssignmentRepo() {
    return this.subjectRepo;
  }
}

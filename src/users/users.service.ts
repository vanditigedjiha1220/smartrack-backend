import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Role } from '../entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    private authService: AuthService,
  ) {}

  async create(dto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const passwordHash = await this.authService.hashPassword(dto.password);
    const user = this.repo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      passwordHash,
      role: dto.role,
    });
    const saved = await this.repo.save(user);
    const { passwordHash: _, ...safe } = saved;
    return safe;
  }

  async findByRole(role: Role) {
    const users = await this.repo.find({ where: { role } });
    return users.map(({ passwordHash, ...safe }) => safe);
  }

  async findAll() {
    const users = await this.repo.find();
    return users.map(({ passwordHash, ...safe }) => safe);
  }

  async findById(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) return null;
    const { passwordHash, ...safe } = user;
    return safe;
  }
}

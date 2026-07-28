import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

// Wraps the User repository so other modules (AuthModule) go through a
// service instead of reaching into TypeORM directly - the same reason
// TaskApi's endpoints depend on AppDbContext rather than raw SQL: a
// single place that owns how User rows get queried.
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }
}

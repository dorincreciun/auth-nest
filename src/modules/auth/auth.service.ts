import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { HashService } from '../hash';
import { CreateUserDto, ResponseUserDto, UserMapper, UsersService } from '../users';
import { LoginDto } from './dto';

@Injectable()
export class AuthService {
  public constructor(
    private hashService: HashService,
    private userService: UsersService,
  ) {}

  public async register(dto: CreateUserDto): Promise<ResponseUserDto> {
    const userExists = await this.userService.exists(dto.email);

    if (userExists) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await this.hashService.hash(dto.password);
    const newUser = await this.userService.create({
      ...dto,
      password: passwordHash,
    });

    return UserMapper.toResponseDto(newUser);
  }

  public async login(dto: LoginDto): Promise<ResponseUserDto> {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Email sau parolă incorectă');
    }

    const isPasswordMatching = await this.hashService.compare(dto.password, user.password);

    if (!isPasswordMatching) {
      throw new UnauthorizedException('Email sau parolă incorectă');
    }

    return UserMapper.toResponseDto(user);
  }
}

import { Controller, Post, Get, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dtos/createUser.dto';
import { Serialize } from 'src/common/interceptors/response.interceptor';
import { UserResponseDto } from './dtos/userResponse.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Serialize(UserResponseDto)
  async findAll() {
    const users = await this.userService.findAll();
    return {
      success: true,
      message: 'Userss retrieved successfully',
      data: users,
    };
  }

  @Post()
  @Serialize(UserResponseDto)
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
}

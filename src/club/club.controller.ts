import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClubService } from './club.service';
import { CreateClubDto } from './dtos/create-club.dto';
import { UpdateClubDto } from './dtos/update-club.dto';
import { ClubResponseDto } from './dtos/club-response.dto';
import { Serialize } from '../common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadService } from '../common/upload/upload.service';
import { ConfigService } from '@nestjs/config';

@Controller('clubs')
export class ClubController {
  constructor(
    private readonly clubService: ClubService,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Serialize(ClubResponseDto)
  async create(@CurrentUser() user: any, @Body() createClubDto: CreateClubDto) {
    return this.clubService.create(user.id, createClubDto);
  }

  @Get()
  @Serialize(ClubResponseDto)
  async findAll() {
    return this.clubService.findAll();
  }

  @Get(':id')
  @Serialize(ClubResponseDto)
  async findOne(@Param('id') id: string) {
    return this.clubService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Serialize(ClubResponseDto)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateClubDto: UpdateClubDto,
  ) {
    return this.clubService.update(id, user.id, updateClubDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.clubService.remove(id, user.id);
  }

  @Get(':id/teams')
  async getTeams(@Param('id') id: string) {
    return this.clubService.getTeams(id);
  }

  @Post('upload-profile-picture')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 1048576, // 1MB
          }),
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|webp)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const filePath = await this.uploadService.saveFile(
      file,
      'profile-pictures',
    );
    const fileUrl = this.uploadService.getFileUrl(filePath);

    return {
      message: 'Profile picture uploaded successfully',
      data: {
        filePath,
        fileUrl,
      },
    };
  }
}


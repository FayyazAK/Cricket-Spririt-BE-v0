import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PlayerService } from './player.service';
import { CreatePlayerDto } from './dtos/create-player.dto';
import { UpdatePlayerDto } from './dtos/update-player.dto';
import { PlayerFilterDto } from './dtos/player-filter.dto';
import { PlayerResponseDto } from './dtos/player-response.dto';
import { Serialize } from '../common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadService } from '../common/upload/upload.service';
import { ConfigService } from '@nestjs/config';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayerController {
  constructor(
    private readonly playerService: PlayerService,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @Serialize(PlayerResponseDto)
  async register(
    @CurrentUser() user: any,
    @Body() createPlayerDto: CreatePlayerDto,
  ) {
    return this.playerService.register(user.id, createPlayerDto);
  }

  @Get()
  @Serialize(PlayerResponseDto)
  async findAll(@Query() filters: PlayerFilterDto) {
    return this.playerService.findAll(filters);
  }

  @Get(':id')
  @Serialize(PlayerResponseDto)
  async findOne(@Param('id') id: string) {
    return this.playerService.findOne(id);
  }

  @Put(':id')
  @Serialize(PlayerResponseDto)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updatePlayerDto: UpdatePlayerDto,
  ) {
    return this.playerService.update(id, user.id, updatePlayerDto);
  }

  @Delete(':id')
  async deactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.playerService.deactivate(id, user.id);
  }

  @Post('upload-profile-picture')
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


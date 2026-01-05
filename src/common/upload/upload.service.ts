import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class UploadService {
  private readonly uploadDir: string;
  private readonly maxSize: number;
  private readonly allowedTypes: string[];

  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    const uploadConfig = this.configService.get('upload');
    this.uploadDir = uploadConfig.dir;
    this.maxSize = uploadConfig.maxSize;
    this.allowedTypes = uploadConfig.allowedTypes;

    // Ensure upload directory exists
    this.ensureUploadDirectories();
  }

  private async ensureUploadDirectories(): Promise<void> {
    const types = ['profile-pictures', 'logos', 'tournament-covers', 'tournament-profiles'];
    for (const type of types) {
      const dir = path.join(this.uploadDir, type);
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        this.logger.error(`Failed to create upload directory: ${dir}`, {
          error,
          context: UploadService.name,
        });
      }
    }
  }

  validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxSize / 1024 / 1024}MB`,
      );
    }

    // Check file type
    const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
    if (!this.allowedTypes.includes(fileExtension)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${this.allowedTypes.join(', ')}`,
      );
    }

    // Check MIME type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only images are allowed.');
    }
  }

  async saveFile(
    file: Express.Multer.File,
    type: 'profile-pictures' | 'logos' | 'tournament-covers' | 'tournament-profiles',
  ): Promise<string> {
    this.validateFile(file);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;

    const dir = path.join(this.uploadDir, type, String(year), month);
    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, file.buffer);

    // Return relative path from upload directory
    return path.join(type, String(year), month, filename).replace(/\\/g, '/');
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      this.logger.warn(`Failed to delete file: ${fullPath}`, {
        error,
        context: UploadService.name,
      });
    }
  }

  getFileUrl(filePath: string | null | undefined): string | null {
    if (!filePath) return null;
    // Return URL path (will be served by static file serving)
    return `/uploads/${filePath}`;
  }
}


import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  Request,
  Param,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { memoryStorage } from 'multer';
import { basename } from 'path';
import { v4 as uuid } from 'uuid';
import sharp from 'sharp';
import { StorageService } from './storage.service';

// Magic byte signatures for allowed image types
const MAGIC_BYTES: { mime: string; bytes: number[] }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  // WebP: starts with RIFF....WEBP
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

function validateMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  for (const { mime, bytes } of MAGIC_BYTES) {
    const matches = bytes.every((b, i) => buffer[i] === b);
    if (matches) {
      if (mime === 'image/webp') {
        return (
          buffer[8] === 0x57 &&
          buffer[9] === 0x45 &&
          buffer[10] === 0x42 &&
          buffer[11] === 0x50
        );
      }
      return true;
    }
  }
  return false;
}

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private storageService: StorageService) {}

  @Post('proof')
  @ApiOperation({ summary: 'Upload proof photo for quest completion' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          cb(new BadRequestException('Only JPEG, PNG, and WebP images are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadProof(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate magic bytes to prevent MIME spoofing
    if (!validateMagicBytes(file.buffer)) {
      throw new BadRequestException('File content does not match an allowed image type');
    }

    // Process image: resize to max 1200px wide, compress to JPEG
    const processed = await sharp(file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const key = `proofs/${uuid()}.jpg`;

    await this.storageService.upload(key, processed, 'image/jpeg');
    const url = await this.storageService.getSignedDownloadUrl(key);

    return {
      url,
      key,
      size: processed.length,
    };
  }

  @Get('proofs/:filename')
  @ApiOperation({ summary: 'Download proof photo (authenticated)' })
  async getProofFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const sanitized = basename(filename);
    const key = `proofs/${sanitized}`;

    // If S3 enabled, redirect to signed URL
    if (this.storageService.isS3Enabled()) {
      const signedUrl = await this.storageService.getSignedDownloadUrl(key);
      res.redirect(signedUrl);
      return;
    }

    // Local fallback: serve file from disk
    const filePath = this.storageService.getLocalFilePath(key);
    if (!filePath) {
      throw new NotFoundException('File not found');
    }

    res.sendFile(filePath);
  }
}

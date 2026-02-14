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
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import { v4 as uuid } from 'uuid';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'proofs');

// Ensure upload dir exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Magic byte signatures for allowed image types
const MAGIC_BYTES: { mime: string; bytes: number[] }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  // WebP: starts with RIFF....WEBP
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

function validateMagicBytes(filePath: string): boolean {
  const buffer = readFileSync(filePath);
  if (buffer.length < 12) return false;

  for (const { mime, bytes } of MAGIC_BYTES) {
    const matches = bytes.every((b, i) => buffer[i] === b);
    if (matches) {
      // Extra check for WebP: bytes 8-11 must be "WEBP"
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
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const uniqueName = `${uuid()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
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
  uploadProof(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate magic bytes to prevent MIME spoofing
    const filePath = join(UPLOAD_DIR, file.filename);
    if (!validateMagicBytes(filePath)) {
      unlinkSync(filePath); // Delete the invalid file
      throw new BadRequestException('File content does not match an allowed image type');
    }

    // Return a URL path — in production this would be an S3/signed URL
    const url = `/api/uploads/proofs/${file.filename}`;

    return {
      url,
      filename: file.filename,
      size: file.size,
    };
  }

  @Get('proofs/:filename')
  @ApiOperation({ summary: 'Download proof photo (authenticated)' })
  async getProofFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Sanitize filename to prevent path traversal
    const sanitized = basename(filename);
    const filePath = join(UPLOAD_DIR, sanitized);

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    res.sendFile(filePath);
  }
}

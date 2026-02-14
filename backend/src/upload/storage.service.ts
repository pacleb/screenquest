import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client | null;
  private readonly bucket: string;
  private readonly localDir: string;
  private readonly useS3: boolean;

  constructor(private configService: ConfigService) {
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') || '';
    const region = this.configService.get<string>('AWS_S3_REGION') || 'us-east-1';
    this.useS3 = !!this.bucket;
    this.localDir = join(process.cwd(), 'uploads', 'proofs');

    if (this.useS3) {
      this.s3 = new S3Client({ region });
      this.logger.log(`S3 storage configured: bucket=${this.bucket}, region=${region}`);
    } else {
      this.s3 = null;
      this.logger.warn('AWS_S3_BUCKET not set — using local disk storage');
      if (!existsSync(this.localDir)) {
        mkdirSync(this.localDir, { recursive: true });
      }
    }
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    if (this.useS3 && this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      return key;
    }

    // Local fallback
    const filePath = join(this.localDir, key.replace(/\//g, '_'));
    writeFileSync(filePath, body);
    return key;
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.useS3 && this.s3) {
      return getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn },
      );
    }

    // Local fallback — return API path
    const filename = key.replace(/\//g, '_');
    return `/api/uploads/proofs/${filename}`;
  }

  async delete(key: string): Promise<void> {
    if (this.useS3 && this.s3) {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return;
    }

    // Local fallback
    const filePath = join(this.localDir, key.replace(/\//g, '_'));
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  getLocalFilePath(key: string): string | null {
    if (this.useS3) return null;
    const filePath = join(this.localDir, key.replace(/\//g, '_'));
    return existsSync(filePath) ? filePath : null;
  }

  isS3Enabled(): boolean {
    return this.useS3;
  }
}

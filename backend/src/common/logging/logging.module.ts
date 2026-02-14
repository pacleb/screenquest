import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { Request } from 'express';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';

        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',

            // Use pino-pretty in development for readable logs
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'HH:MM:ss',
                    ignore: 'pid,hostname',
                  },
                },

            // Propagate X-Request-Id or generate one
            genReqId: (req: Request, res: any) => {
              const id = (req.headers['x-request-id'] as string) || randomUUID();
              // Also set it on the response header for clients
              res.setHeader('X-Request-Id', id);
              return id;
            },

            // Custom serializers to reduce noise
            serializers: {
              req: (req: any) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                query: req.query,
                // Never log auth headers
                headers: {
                  'user-agent': req.headers?.['user-agent'],
                  'content-type': req.headers?.['content-type'],
                  'x-request-id': req.headers?.['x-request-id'],
                },
              }),
              res: (res: any) => ({
                statusCode: res.statusCode,
              }),
            },

            // Custom log message
            customLogLevel: (_req: any, res: any, err: any) => {
              if (res.statusCode >= 500 || err) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },

            // Don't log health check requests (noisy)
            autoLogging: {
              ignore: (req: any) => req.url === '/api/health',
            },

            // Redact sensitive fields
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.refreshToken',
                'req.body.token',
              ],
              censor: '[REDACTED]',
            },
          },
        };
      },
    }),
  ],
})
export class AppLoggingModule {}

import {
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockHost: any;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({ requestId: 'req-123', url: '/test' }),
      }),
    };
  });

  it('formats HttpException with standard fields', () => {
    const exception = new NotFoundException('User not found');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'User not found',
        requestId: 'req-123',
        timestamp: expect.any(String),
      }),
    );
  });

  it('formats validation errors with details array', () => {
    const exception = new BadRequestException({
      message: ['email must be an email', 'name should not be empty'],
      error: 'Bad Request',
    });

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    const body = mockJson.mock.calls[0][0];
    expect(body.message).toBe('Validation failed');
    expect(body.details).toEqual([
      'email must be an email',
      'name should not be empty',
    ]);
  });

  it('hides internals for unhandled errors (500)', () => {
    const exception = new Error('Database connection failed: password wrong');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    const body = mockJson.mock.calls[0][0];
    expect(body.message).toBe('Internal server error');
    expect(body.statusCode).toBe(500);
    // Should NOT contain the actual error message
    expect(JSON.stringify(body)).not.toContain('password wrong');
  });

  it('passes through custom fields from HttpException', () => {
    const exception = new HttpException(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        message: 'Upgrade to premium',
        activeQuests: 3,
        limit: 3,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(402);
    const body = mockJson.mock.calls[0][0];
    expect(body.details).toEqual({ activeQuests: 3, limit: 3 });
  });

  it('includes requestId in every response', () => {
    filter.catch(new NotFoundException(), mockHost);

    const body = mockJson.mock.calls[0][0];
    expect(body.requestId).toBe('req-123');
  });

  it('handles string exception responses', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(403);
    const body = mockJson.mock.calls[0][0];
    expect(body.message).toBe('Forbidden');
  });
});

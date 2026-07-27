import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard error response shape returned by HttpExceptionFilter for every
 * non-2xx response. Used as the Swagger `type` on all error response decorators.
 */
export class ErrorResponseDto {
  @ApiProperty({ description: 'HTTP status code', example: 400 })
  statusCode!: number;

  @ApiProperty({ description: 'Standard HTTP status phrase', example: 'Bad Request' })
  error!: string;

  @ApiProperty({
    description:
      'Human-readable error reason. Array when ValidationPipe returns multiple field errors',
    oneOf: [
      { type: 'string', example: 'Resource not found' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['username must not be empty', 'email must be an email'],
      },
    ],
  })
  message!: string | string[];

  @ApiProperty({ description: 'Request path that triggered the error', example: '/api/path' })
  path!: string;

  @ApiProperty({ description: 'ISO 8601 UTC timestamp', example: '2026-07-22T10:00:00.000Z' })
  timestamp!: string;
}

// ---------------------------------------------------------------------------
// Pre-built Swagger response objects — one per HTTP status code.
// Each uses `schema` (not `type`) so the example renders correctly in Swagger UI.
// ---------------------------------------------------------------------------

const errorSchema = (statusCode: number, error: string, message: string) => ({
  description: error,
  schema: {
    properties: {
      statusCode: { type: 'number',  example: statusCode },
      error:      { type: 'string',  example: error },
      message:    { type: 'string',  example: message },
      path:       { type: 'string',  example: '/auth/example' },
      timestamp:  { type: 'string',  example: '2026-07-22T10:00:00.000Z' },
    },
  },
});

export const BadRequestResponse    = errorSchema(400, 'Bad Request',           'username must not be empty');
export const UnauthorizedResponse  = errorSchema(401, 'Unauthorized',          'Missing or invalid JWT');
export const ForbiddenResponse     = errorSchema(403, 'Forbidden',             'You do not have permission to access this resource');
export const NotFoundResponse      = (message = 'Resource not found') =>
  errorSchema(404, 'Not Found', message);
export const InternalErrorResponse = errorSchema(500, 'Internal Server Error', 'An unexpected error occurred');

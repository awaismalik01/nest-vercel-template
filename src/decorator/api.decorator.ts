import { applyDecorators, HttpCode, HttpStatus, Type } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiBody,
  ApiTags,
} from '@nestjs/swagger';
import {
  BadRequestResponse,
  UnauthorizedResponse,
  NotFoundResponse,
  InternalErrorResponse,
} from 'src/filter/error-response.dto';

// Inline type so we don't import from internal @nestjs/swagger dist paths
type InlineSchema = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Class-level decorators
// ---------------------------------------------------------------------------

/**
 * Class-level: @ApiTags + @ApiBearerAuth('JWT').
 * Use on every JWT-protected controller.
 *
 * @example
 * @ApiController('Events')
 * @Controller('event')
 * export class EventsController {}
 */
export const ApiController = (tag: string) =>
  applyDecorators(ApiTags(tag), ApiBearerAuth('JWT'));

/**
 * Class-level: @ApiTags only (no bearer auth).
 * Use on controllers that are entirely @Public().
 */
export const ApiPublicController = (tag: string) =>
  applyDecorators(ApiTags(tag));

// ---------------------------------------------------------------------------
// Method-level decorators
// ---------------------------------------------------------------------------

/**
 * Authenticated endpoint (GET / POST / DELETE) — no request body.
 * Bundles: @HttpCode(200) + @ApiOperation + @ApiOkResponse + @ApiUnauthorizedResponse.
 *
 * Pass `type` for DTO-typed responses; pass `responseSchema` for inline primitive shapes.
 *
 * @example
 * @Get('user')
 * @ApiAuth({ summary: 'Get current user', type: UserResponseDto })
 *
 * @example
 * @Post('logout')
 * @ApiAuth({ summary: 'Logout', responseSchema: { type: 'object', properties: { ... } } })
 */
export interface ApiAuthOptions {
  summary: string;
  description?: string;
  type?: Type<unknown>;
  responseDescription?: string;
  responseSchema?: InlineSchema;
  isArray?: boolean;
}

export const ApiAuth = (options: ApiAuthOptions) =>
  applyDecorators(
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: options.summary, description: options.description }),
    ApiOkResponse({
      ...(options.type ? { type: options.type } : {}),
      ...(options.responseSchema ? { schema: options.responseSchema } : {}),
      isArray: options.isArray,
      description: options.responseDescription,
    }),
    ApiUnauthorizedResponse(UnauthorizedResponse),
    ApiInternalServerErrorResponse(InternalErrorResponse),
  );

/**
 * Authenticated endpoint that may return 404.
 * Extends @ApiAuth with @ApiNotFoundResponse.
 */
export const ApiAuthWithNotFound = (options: {
  summary: string;
  description?: string;
  type?: Type<unknown>;
  responseDescription?: string;
  responseSchema?: InlineSchema;
  notFoundDescription?: string;
}) =>
  applyDecorators(
    ApiAuth(options),
    ApiNotFoundResponse(NotFoundResponse(options.notFoundDescription)),
  );

/**
 * Unauthenticated (public) POST endpoint.
 * Bundles: @HttpCode(200) + @ApiOperation + @ApiBody (optional) + @ApiOkResponse + @ApiBadRequestResponse.
 * No @ApiBearerAuth — Swagger will not show a lock icon.
 *
 * @example
 * @Public()
 * @Post('login')
 * @ApiPublicPost({ summary: 'Login', body: { type: UserCred }, responseSchema: { ... } })
 */
export interface ApiPublicPostOptions {
  summary: string;
  description?: string;
  body?: { type: Type<unknown>; description?: string };
  responseDescription?: string;
  responseSchema?: InlineSchema;
  type?: Type<unknown>;
}

export const ApiPublicPost = (options: ApiPublicPostOptions) =>
  applyDecorators(
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: options.summary, description: options.description }),
    ...(options.body
      ? [ApiBody({ type: options.body.type, description: options.body.description })]
      : []),
    ApiOkResponse({
      ...(options.type ? { type: options.type } : {}),
      ...(options.responseSchema ? { schema: options.responseSchema } : {}),
      description: options.responseDescription,
    }),
    ApiBadRequestResponse(BadRequestResponse),
    ApiInternalServerErrorResponse(InternalErrorResponse),
  );

/**
 * Authenticated POST with a request body.
 * Bundles: @HttpCode(200) + @ApiOperation + @ApiBody + @ApiOkResponse
 *        + @ApiUnauthorizedResponse + @ApiBadRequestResponse.
 *
 * `bodyOptions` accepts any extra @ApiBody fields (isArray, description, examples, etc.)
 * except `type`, which is passed separately as `bodyType`.
 *
 * @example
 * @Post()
 * @ApiBodyPost(processEventsDocs)
 */
export interface ApiBodyPostOptions {
  summary: string;
  description?: string;
  bodyType: Type<unknown>;
  bodyOptions?: Record<string, unknown>;
  responseType?: Type<unknown>;
  responseDescription?: string;
  isArray?: boolean;
}

export const ApiBodyPost = (options: ApiBodyPostOptions) =>
  applyDecorators(
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: options.summary, description: options.description }),
    ApiBody({ type: options.bodyType, ...(options.bodyOptions ?? {}) } as any),
    ApiOkResponse({
      type: options.responseType,
      isArray: options.isArray,
      description: options.responseDescription,
    }),
    ApiUnauthorizedResponse(UnauthorizedResponse),
    ApiBadRequestResponse(BadRequestResponse),
    ApiInternalServerErrorResponse(InternalErrorResponse),
  );

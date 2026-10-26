import {INestApplication, ValidationPipe} from '@nestjs/common';

export const GLOBAL_PREFIX = 'api';

/**
 * Global app setup shared with main.ts, and the E2E test cases, so tests get hit the same
 * routes (/api/...) and the same validation as the running server
*/

export function configureGlobalApp(app: INestApplication): void {
    app.enableCors();
    app.setGlobalPrefix(GLOBAL_PREFIX);
    app.useGlobalPipes(
    new ValidationPipe({
        whitelist: true,
        }),
    );
};
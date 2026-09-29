import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Standalone on purpose: loading vite.config.ts would pull in the Laravel and
// Wayfinder plugins (which shell out to PHP) just to run pure unit tests.
export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        include: ['resources/js/**/*.test.ts'],
    },
});

import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          exclude: [...configDefaults.exclude, 'tests/e2e/**', '**/*.dev.test.ts'],
        },
      },
      {
        // Tests that drive the reactive runtime the browser dev build ships.
        // Under Node, solid-js resolves to its server build, which has no
        // reactive graph.
        extends: true,
        resolve: { conditions: ['browser', 'development'] },
        ssr: { resolve: { conditions: ['browser', 'development'] } },
        test: {
          name: 'solid-dev',
          include: ['src/**/*.dev.test.ts'],
          server: { deps: { inline: [/solid-js/, /@solidjs\/signals/] } },
        },
      },
    ],
  },
});

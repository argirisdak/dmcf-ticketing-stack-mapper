import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
      setupFiles: ['./vitest.setup.js'],
    },
  }),
)

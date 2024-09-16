import { env } from './api/env'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './api/db/schema/index.ts',
  out: './.migrations',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  dialect: 'postgresql',
})

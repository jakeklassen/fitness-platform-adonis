import { configApp } from '@adonisjs/eslint-config';

export default [
  // Generated, committed-for-types but not hand-edited — exclude from linting.
  { ignores: ['.adonisjs/**', 'database/schema.ts'] },
  ...configApp(),
];

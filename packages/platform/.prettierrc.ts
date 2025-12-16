// https://github.com/adonisjs/prettier-config
// @ts-ignore - No types available for prettier config
import adonisPrettierConfig from '@adonisjs/prettier-config';

const config: import('prettier').Config = {
  ...adonisPrettierConfig,
  semi: true,
  trailingComma: 'all',
  arrowParens: 'always',
  quoteProps: 'as-needed',
};

export default config;

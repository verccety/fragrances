import type { Config } from 'prettier';

const config: Config = {
  printWidth: 120,
  tabWidth: 4,
  useTabs: true,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  bracketSpacing: false,
  arrowParens: 'avoid',
  overrides: [
    {
      files: '*.html',
      options: {
        parser: 'angular',
      },
    },
    {
      files: '*.{less,css,scss}',
      options: {
        singleQuote: false,
      },
    },
  ],
};

export default config;

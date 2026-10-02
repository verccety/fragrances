import type { Config } from 'prettier';

// Matches the style the code is written in, so tools that run Prettier
// (e.g. `ng update` migrations, `npm run format`) don't restyle files.
const config: Config = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  bracketSpacing: true,
  arrowParens: 'always',
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

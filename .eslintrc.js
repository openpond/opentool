module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
  ],
  env: {
    node: true,
    es2020: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    // Allow console.log in CLI tools
    'no-console': 'off',
    // Allow any type for flexibility in CLI tools
    'no-explicit-any': 'off',
    // Allow unused vars with underscore prefix
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    // Allow require() for dynamic imports
    'no-var-requires': 'off',
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'examples/',
  ],
};
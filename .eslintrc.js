module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  rules: {
    // Project-specific rules:
    // Allow any for dynamic CDP payloads and Zod schema inferences where strict types are defined elsewhere
    '@typescript-eslint/no-explicit-any': 'warn',
    // Allow empty catch blocks for best-effort cleanups (e.g. stealth override fallbacks)
    'no-empty': ['error', { allowEmptyCatch: true }],
    // Allow unused variables prefixed with underscore
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // Allow require for optional dynamic module loads
    '@typescript-eslint/no-var-requires': 'off',
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'scripts/',
    'archive/',
    '*.js',
    'coverage/',
  ],
};

module.exports = {
  format: ['@cucumber/pretty-formatter', 'progress-bar'],
  paths: ['test/features/**/*.feature'],
  require: ['test/features/step-definitions/**/*.ts', 'test/features/hooks.ts'],
  requireModule: ['ts-node/register'],
  formatOptions: {
    colorsEnabled: true,
  },
  tagExpression: '@smoke or @acceptance',
};

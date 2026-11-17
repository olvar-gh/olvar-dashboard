// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const viewportHeight = 'Pages scroll as documents and keep their designed size (docs/PLAN.md §5.4): no viewport-height sizing.';

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'ios/*', 'web-build/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'Literal[value=/^-?[\\d.]+[dsl]?vh$/]', message: viewportHeight },
        { selector: 'TemplateElement[value.raw=/(^|[\\d.])[dsl]?vh\\b/]', message: viewportHeight },
        { selector: "MemberExpression[object.callee.name='useWindowDimensions'][property.name='height']", message: viewportHeight },
        {
          selector: "VariableDeclarator[init.callee.name='useWindowDimensions'] > ObjectPattern > Property[key.name='height']",
          message: viewportHeight,
        },
        {
          selector: "MemberExpression[object.callee.object.name='Dimensions'][property.name='height']",
          message: viewportHeight,
        },
      ],
    },
  },
]);

import tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';

// The lint half of the T6 rule "no element uses viewport-height sizing"; e2e/web/shell.spec.ts checks the page.
// ESLint's own config loader needs ESM in Jest, so the rule is taken from eslint.config.js and run directly.
const config: { files?: string[]; rules?: Linter.RulesRecord }[] = jest.requireActual('../../eslint.config.js');
const rule = config.find((c) => c.files?.includes('src/**/*.{ts,tsx}'))!.rules!['no-restricted-syntax'];

async function lint(code: string) {
  const messages = new Linter().verify(
    code,
    [
      {
        files: ['**/*.tsx'],
        languageOptions: { parser: tsParser },
        rules: { 'no-restricted-syntax': rule },
      },
    ],
    'Example.tsx',
  );
  return messages.filter((m) => m.ruleId === 'no-restricted-syntax').length;
}

describe('no viewport-height sizing', () => {
  it.each([
    "const s = { minHeight: '100vh' };",
    "const s = { height: '100dvh' };",
    'const h = 50; const s = { height: `${h}svh` };',
    "import { useWindowDimensions } from 'react-native'; export function F() { const { height } = useWindowDimensions(); return height; }",
    "import { useWindowDimensions } from 'react-native'; export function F() { return useWindowDimensions().height; }",
    "import { Dimensions } from 'react-native'; const h = Dimensions.get('window').height;",
  ])('rejects %s', async (code) => {
    expect(await lint(code)).toBe(1);
  });

  it.each([
    "const s = { minHeight: 232, width: '100%' };",
    "import { useWindowDimensions } from 'react-native'; export function F() { const { width } = useWindowDimensions(); return width; }",
  ])('allows %s', async (code) => {
    expect(await lint(code)).toBe(0);
  });
});

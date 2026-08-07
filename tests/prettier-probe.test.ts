import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const files = [
  'src/app/admin/courses/new/page.tsx',
  'src/modules/courses/create-from-documents.ts',
];

describe('prettier probe', () => {
  it('prints canonical formatted files', () => {
    execFileSync('npx', ['prettier', '--write', ...files], { stdio: 'inherit' });

    for (const file of files) {
      console.log(`__PRETTIER_START__${file}`);
      console.log(readFileSync(file, 'utf8'));
      console.log(`__PRETTIER_END__${file}`);
    }

    expect(true).toBe(true);
  });
});

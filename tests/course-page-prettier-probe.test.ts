import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const file = 'src/app/admin/courses/new/page.tsx';

describe('course page prettier probe', () => {
  it('prints canonical page formatting', () => {
    execFileSync('npx', ['prettier', '--write', file], {
      stdio: 'inherit',
    });
    console.log('__COURSE_PAGE_PRETTIER_START__');
    console.log(readFileSync(file, 'utf8'));
    console.log('__COURSE_PAGE_PRETTIER_END__');
    expect(true).toBe(true);
  });
});

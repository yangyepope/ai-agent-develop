import { afterEach, describe, expect, it } from 'vitest';

import { optionalEnv, requireEnv } from './env.ts';

const KEY = 'AI_AGENT_DEVELOP_TEST_VAR';

afterEach(() => {
  delete process.env[KEY];
});

describe('requireEnv', () => {
  it('返回已设置的值', () => {
    process.env[KEY] = 'hello';
    expect(requireEnv(KEY)).toBe('hello');
  });

  it('变量缺失时抛错', () => {
    expect(() => requireEnv(KEY)).toThrow(/缺少环境变量/);
  });

  it('只有空白字符也算缺失', () => {
    process.env[KEY] = '   ';
    expect(() => requireEnv(KEY)).toThrow(/缺少环境变量/);
  });
});

describe('optionalEnv', () => {
  it('没设置时返回 undefined', () => {
    expect(optionalEnv(KEY)).toBeUndefined();
  });

  it('设置了就返回值', () => {
    process.env[KEY] = 'x';
    expect(optionalEnv(KEY)).toBe('x');
  });
});

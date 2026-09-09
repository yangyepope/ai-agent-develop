import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  js.configs.recommended,

  // 带类型信息的规则集：能查出 “忘了 await 的 Promise” 这类问题
  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // 练习代码里 console.log 是主要输出手段，别报警
      'no-console': 'off',
      // 以 _ 开头的参数视为“我知道它没用”
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // 配置文件本身不做类型感知检查
  {
    files: ['**/*.mjs', '**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);

# 02 · TypeScript 工程搭建

## 两个必须记住的前提

**1. Node 24 能直接跑 `.ts`，但不做类型检查。**

原理是"类型擦除"—— 把类型标注抹掉就执行，不判断类型对不对。
所以下面这行 `node` 跑起来毫无怨言：

```typescript
const n: number = '这是字符串'; // 运行时不报错
```

**类型检查是独立步骤，不能省：** `npm run typecheck`

**2. 相对导入必须带 `.ts` 后缀。**

```typescript
import { createClient } from '../src/index.ts'; // ✅
import { createClient } from '../src/index'; // ❌ 运行时找不到
```

ESM 规范要求路径确定，不做自动补后缀。

## 不能用的语法

类型擦除要求"删掉类型后语义不变"，所以会生成运行时代码的语法都不能用。
`tsconfig.json` 的 `erasableSyntaxOnly: true` 会提前拦住它们。

| ❌ 不能用                        | ✅ 替代                                 |
| -------------------------------- | --------------------------------------- |
| `enum Color { Red }`             | `const Color = { Red: 'red' } as const` |
| `namespace Foo {}`               | 用普通模块                              |
| `constructor(private x: number)` | 在类体里声明字段，构造器内赋值          |

## 文件全景

```
package.json           依赖 + 命令入口
.nvmrc                 Node 版本
tsconfig.json          类型检查配置
tsconfig.build.json    产出 JS 时才用
eslint.config.mjs      代码质量
.prettierrc.json       代码格式
.env                   真实密钥（❌ 不提交）
.env.example           变量模板（✅ 提交）

src/                   公共模块（所有课程复用）
├── env.ts             环境变量读取与校验
├── env.test.ts        单元测试示例
├── client.ts          Anthropic 客户端工厂
├── run.ts             错误处理外壳 + 文本提取
└── index.ts           统一出口

lesson01-llm/          第一课练习
docs/                  文档
```

**为什么一个工程装多个课程目录**：依赖只装一次，`src/` 公共代码能复用，配置只维护一份。

## tsconfig.json 关键项

| 配置                                  | 作用                                       |
| ------------------------------------- | ------------------------------------------ |
| `"type": "module"`（在 package.json） | 用 ESM，不用 CommonJS                      |
| `target` / `lib`: `es2024`            | 不含 `"DOM"` —— 误写 `document` 会立刻报错 |
| `module`: `nodenext`                  | 模块解析跟随 Node 规则                     |
| `strict: true`                        | **必开**。关掉等于带语法高亮的 JavaScript  |
| `noUncheckedIndexedAccess`            | `arr[0]` 类型是 `T \| undefined`，强制判空 |
| `erasableSyntaxOnly`                  | 拦住上面那些不能用的语法                   |
| `verbatimModuleSyntax`                | 纯类型导入必须写 `import type`             |
| `allowImportingTsExtensions`          | 允许 `import './x.ts'`                     |
| `rewriteRelativeImportExtensions`     | build 时把 `.ts` 改写成 `.js`              |
| `noEmit: true`                        | 默认只检查不产出                           |
| `skipLibCheck: true`                  | 不检查 node_modules 的 `.d.ts`，快很多     |

`noUncheckedIndexedAccess` 在本工程有实际作用：

```typescript
message.content[0].text; // ❌ 报错，救了你 —— content 可能为空，第一块也可能不是文本
```

正确写法用 `src/run.ts` 里的 `collectText(message)`。

**两个 tsconfig 的分工**：`tsconfig.json` 负责检查（日常只用这个）；
`tsconfig.build.json` 负责产出 `dist/`（日常用不到，Node 直接跑 `.ts`）。

## ESLint 与 Prettier 的分工

|          | 管什么   | 例子                         |
| -------- | -------- | ---------------------------- |
| Prettier | **格式** | 单引号还是双引号、缩进、换行 |
| ESLint   | **质量** | 忘写 `await`、变量声明了没用 |

原则：格式全交给 Prettier，ESLint 只管逻辑问题，两者不打架。

ESLint 用的是 9.x 的 flat config（`eslint.config.mjs`），和网上大量
`.eslintrc.json` 的老教程不一样。配置里开了 `recommendedTypeChecked`
（带类型信息的规则集），能查出这类 bug：

```typescript
someAsyncFn(); // ❌ no-floating-promises —— 忘了 await，异常会被静默吞掉
```

## src/ 四个模块

| 文件        | 做什么                | 要点                                                                        |
| ----------- | --------------------- | --------------------------------------------------------------------------- |
| `env.ts`    | 读环境变量            | 把 `string \| undefined` 收敛成 `string`；空字符串也算缺失                  |
| `client.ts` | 创建 Anthropic 客户端 | 集中管 Key / baseURL / 模型 / 超时。**TS SDK 的 timeout 单位是毫秒**        |
| `run.ts`    | 错误处理 + 提取文本   | 类型化异常判断，**从具体到宽泛**（`APIError` 是父类，写前面会吃掉后面分支） |
| `index.ts`  | 统一出口              | 练习文件一行导入                                                            |

错误处理不要用字符串匹配（`error.message.includes('rate limit')`）——
文案会变，类型不会。

## 测试

```bash
npm test    # Test Files 1 passed, Tests 5 passed
```

用 Vitest（不是 Jest），原生支持 ESM + TypeScript，零配置。

学习项目也写测试的理由：**LLM 调用是花钱的、不确定的**，同样输入两次输出都不一样。
必须把确定性逻辑（解析、拼装、校验、历史裁剪）从 LLM 调用里剥出来单独测 ——
这个"剥离"动作本身就是 Agent 工程的核心技能。

## 密钥管理

```bash
cp .env.example .env    # 已做好，只需填 ANTHROPIC_API_KEY
```

Key 获取：https://console.anthropic.com/settings/keys

三条规矩：`.env` 永不提交（已在 `.gitignore`）；`.env.example` 只放键名要提交；
密钥不硬编码进代码（进了 git 历史就删不掉）。

下一篇：[03 · 第一课代码导读](./03-第一课代码导读.md)

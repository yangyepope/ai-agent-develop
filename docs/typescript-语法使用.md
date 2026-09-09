# TypeScript 语法使用

## 1. `?.`：可选链

`?.` 是 TypeScript / JavaScript 中的可选链操作符，用来安全地访问对象属性，避免在对象不存在时直接报错。

### 基本示例

```ts
const user = {
  profile: {
    name: 'Alice',
  },
};

console.log(user.profile?.name); // Alice
console.log(user.profile?.age); // undefined
console.log(user.settings?.theme); // undefined
```

### 作用

如果写成：

```ts
console.log(user.settings.theme);
```

那么当 `settings` 不存在时，会直接报错：

```ts
Cannot read properties of undefined
```

而使用 `?.` 后：

```ts
console.log(user.settings?.theme);
```

会直接返回 `undefined`，不会崩掉。

### 在 OpenAI 返回值中的典型使用

```ts
const content = response.choices[0]?.message?.content ?? '';
```

这里表示：

- `response.choices[0]` 可能不存在
- `message` 也可能不存在
- `content` 也可能为空

那么使用 `?.` 可以安全访问，如果中间任意一层不存在，就返回 `undefined`，再配合 `?? ''` 作为兜底值。

---

## 2. `??`：空值合并

`??` 是空值合并运算符，用来处理 `null` 或 `undefined`。

### 示例

```ts
const value = null ?? '默认值';
console.log(value); // 默认值
```

```ts
const value = '' ?? '默认值';
console.log(value); // ''
```

这里要注意：

- `??` 只处理 `null` 和 `undefined`
- `''`、`0`、`false` 都不会被当成空值处理

### 例子

```ts
const content = response.choices[0]?.message?.content ?? '';
```

意思是：

- 如果 `content` 是 `null` 或 `undefined`
- 就使用空字符串 `''`
- 否则就使用真实的返回值

---

## 3. `requireEnv()`：读取环境变量

在这个项目里，环境变量通常通过 `process.env` 配合 `requireEnv()` 读取，统一校验和报错。

### 示例

```ts
import { requireEnv } from '../src/env.ts';

const apiKey = requireEnv('DASHSCOPE_API_KEY');
const baseURL = requireEnv('DASHSCOPE_BASE_URL');
const model = requireEnv('APP_MODEL');
```

### 作用

它会做两件事：

1. 读取 `process.env[name]`
2. 如果值为空或未定义，直接抛出错误

这样可以避免程序继续运行时出现隐式错误。

### 关键思想

环境变量不是直接从文件读出来的，而是：

```bash
node --env-file-if-exists=.env
```

启动 Node 进程时，把 `.env` 里的内容加载进 `process.env`，然后代码再访问 `process.env`。

---

## 4. `process.env`：运行时环境对象

`process.env` 是 Node.js 里一个全局对象，用来访问当前进程的环境变量。

### 例子

```ts
console.log(process.env.NODE_ENV);
console.log(process.env.DASHSCOPE_API_KEY);
```

这就是程序运行时可以看到配置值的入口。

### 调试方式

```ts
console.log('DEBUG env ->', {
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.DASHSCOPE_BASE_URL,
  model: process.env.APP_MODEL,
});
```

这样能方便地在运行时确认环境变量是否正确注入。

---

## 5. `?.` + `??` 在实际代码中的组合写法

```ts
const content = response.choices[0]?.message?.content ?? '';
```

这是非常典型的安全访问写法：

- `?.` 负责“安全取值”
- `??` 负责“兜底值”

它让代码更稳健，同时保留类型安全。

---

## 6. 小结

在 TypeScript / Node.js 开发中，下面这些语法非常常见：

- `?.`：安全访问属性，避免空值报错
- `??`：处理 `null` / `undefined`，提供默认值
- `process.env`：运行时读取环境变量
- `requireEnv()`：统一校验和读取必须存在的配置

这几个特性组合起来，能够让我们更高效、稳定地写 AI 应用和 Node.js 脚本。

---

## 7. 适用场景

这些语法特别适合：

- 读取环境变量
- 调用第三方 SDK
- 处理 API 返回值
- 编写 AI Agent 代码
- 避免因为字段缺失导致程序直接崩掉

在本项目中，尤其是在 OpenAI / 百炼 SDK 返回值和 `.env` 配置中，非常实用。

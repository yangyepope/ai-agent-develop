# AI Agent 开发学习工程（TypeScript）

用 TypeScript 从零学 AI Agent 开发的练习工程。环境已就绪，填个 API Key 就能跑。

## 环境现状

| 组件                       | 版本                       | 位置                            |
| -------------------------- | -------------------------- | ------------------------------- |
| OS                         | Debian 13 (trixie) / WSL2  |                                 |
| Node.js                    | **v24.21.0** (LTS Krypton) | `~/.nvm/versions/node/v24.21.0` |
| npm                        | 11.19.0                    |                                 |
| nvm                        | 0.40.3                     | `~/.nvm`                        |
| TypeScript                 | 5.9.3                      |                                 |
| @anthropic-ai/sdk          | 0.124.0                    |                                 |
| Zod                        | 4.5.4                      |                                 |
| ESLint / Prettier / Vitest | 9.39.5 / 3.9.6 / 5.0.0     |                                 |

`npm audit` → **0 vulnerabilities**

## 三步开始

```bash
# 1. 确认 Node 生效（新开终端会自动生效）
node -v          # 应输出 v24.21.0
which node       # 必须指向 ~/.nvm/...，不能是 /mnt/c/...

# 2. 填 API Key（.env 已创建好，只需填值）
#    Key 获取：https://console.anthropic.com/settings/keys
vi .env          # 填写 ANTHROPIC_API_KEY=sk-ant-...

# 3. 跑第一个练习
npm start -- lesson01-llm/01-hello.ts
```

## 文档

按顺序读：

1. **[01 · 环境准备](./docs/01-环境准备.md)** — Node/nvm 怎么装的、WSL 下 Windows Node 的坑、代理、npm 11 的新行为
2. **[02 · TypeScript 工程搭建](./docs/02-TypeScript工程搭建.md)** — 每个配置项在解决什么问题（重点）
3. **[03 · 第一课代码导读](./docs/03-第一课代码导读.md)** — 5 个练习逐个讲，含 `temperature` 已废弃的修正
4. **[04 · 常见问题](./docs/04-常见问题.md)** — 按报错信息查
5. **[05 · 常用命令](./docs/05-常用命令.md)** — 装依赖、启动、检查的命令速查

## 目录结构

```
src/                        公共模块（所有课程复用）
├── env.ts                  环境变量读取与校验
├── env.test.ts             单元测试示例
├── client.ts               Anthropic 客户端工厂
├── run.ts                  错误处理外壳 + 文本提取
└── index.ts                统一出口

lesson01-llm/               第一课：LLM 基础
├── 本课知识.md
├── 01-hello.ts             最小调用 / Token / stop_reason
├── 02-system-and-effort.ts System 提示词 / effort（替代 temperature）
├── 03-streaming.ts         流式输出
├── 04-chat-history.ts      多轮对话 / 无状态 API / 上下文增长
└── 05-structured-json.ts   结构化输出（Zod schema）

lesson02-prompt-engineering/  第二课（待写）
docs/                         文档
```

## 常用命令

```bash
npm start -- <文件.ts>     # 跑一次
npm run dev -- <文件.ts>   # 改动自动重跑
npm run check              # 格式 + lint + 类型 + 测试（提交前跑这个）
npm run typecheck          # 只做类型检查
npm test                   # 只跑测试
```

> 加不加 `--` 都可以，两种写法等效。

## 两个必须记住的点

**1. Node 直接跑 `.ts`，但不做类型检查。**
Node 24 原生支持执行 TypeScript，方式是"类型擦除"——把类型标注抹掉就执行，
根本不判断类型对不对。所以 `npm run typecheck` 是一个**独立的、不能省的**步骤。

**2. 相对导入必须带 `.ts` 后缀。**

```typescript
import { createClient } from '../src/index.ts'; // ✅
import { createClient } from '../src/index'; // ❌ 运行时找不到
```

这是 ESM 规范的要求，不是这个工程的特殊设定。

## 安全

- `.env` 存放真实密钥，已被 `.gitignore` 忽略，**永远不要提交**
- `.env.example` 只放键名和说明，可以提交
- 不要把密钥硬编码进代码——进了 git 历史就删不掉了

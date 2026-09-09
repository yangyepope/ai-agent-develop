/**
 * 环境变量的读取与校验。
 *
 * 为什么单独抽一个模块？
 * 因为 `process.env.X` 的类型永远是 `string | undefined`，
 * 如果每个练习文件都自己判空，会到处重复。这里集中处理一次，
 * 后面的代码拿到的就是确定的 `string`。
 */

/** 读取必填环境变量；缺失时抛出一条能看懂的错误，而不是让 SDK 报 401。 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  // console.log(process.env)
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `缺少环境变量 ${name}。\n` +
        `请执行 cp .env.example .env，然后在 .env 里填写 ${name}。\n` +
        `运行时记得带上 --env-file-if-exists=.env（npm start / npm run dev 已内置）。`,
    );
  }
  console.log(`${name}=${value} `);
  return value;
}

/** 读取选填环境变量；空字符串一律当作“没填”。 */
export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? undefined : value;
}

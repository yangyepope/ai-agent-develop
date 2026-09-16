export class ConcurrencyLimiter {
  private readonly limit: number;

  constructor(limit: number) {
    // erasableSyntaxOnly 禁用构造器参数属性，需显式声明字段并赋值
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error('并发限制必须是大于 0 的整数');
    }

    this.limit = limit;
  }

  async run<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
    const results: T[] = new Array(tasks.length);

    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (true) {
        const currentIndex = nextIndex++;

        // noUncheckedIndexedAccess 下索引访问是 T | undefined：
        // 越界（含空数组）时取不到任务，同时承担"队列耗尽"判断
        const task = tasks[currentIndex];

        if (!task) {
          return;
        }

        results[currentIndex] = await task();
      }
    };

    const workerCount = Math.min(this.limit, tasks.length);

    const workers = Array.from(
      {
        length: workerCount,
      },
      () => worker(),
    );

    await Promise.all(workers);

    return results;
  }
}

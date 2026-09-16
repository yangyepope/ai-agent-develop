import type { PlanStep } from '../types/plan.js';

export class StepExecutor {
  async execute(step: PlanStep): Promise<string> {
    console.log(`\n🔧 执行步骤：${step.id}`);
    console.log(`   ${step.description}`);

    await this.sleep(500);

    /**
     * 为了演示 Reflection + State Machine，
     * 模拟 step-2 第一次执行失败。
     */
    if (step.id === 'step-2') {
      const errorKey = '__lesson10_step2_failed';

      const globalState = globalThis as typeof globalThis & {
        [errorKey]?: boolean;
      };

      if (!globalState[errorKey]) {
        globalState[errorKey] = true;

        throw new Error('模拟错误：step-2 第一次执行失败');
      }
    }

    return `步骤 ${step.id} 执行成功：${step.description}`;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

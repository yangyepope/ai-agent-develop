export function buildPlannerPrompt(goal: string): string {
  return `
你是一个专业的 AI Agent Planner。

你的任务是将用户的复杂目标拆解成多个可执行步骤。

用户目标：

${goal}

要求：

1. 将复杂任务拆分成合理的步骤。
2. 每个步骤必须可以独立执行。
3. 使用 step-1、step-2、step-3 作为步骤 ID。
4. dependencies 表示当前步骤依赖哪些步骤。
5. 第一个步骤通常没有依赖。
6. 后面的步骤可以依赖前面的步骤。
7. 不要生成没有实际意义的步骤。

只返回 JSON。

格式：

{
  "goal": "用户目标",
  "steps": [
    {
      "id": "step-1",
      "description": "执行第一步",
      "dependencies": []
    },
    {
      "id": "step-2",
      "description": "执行第二步",
      "dependencies": ["step-1"]
    }
  ]
}
`;
}

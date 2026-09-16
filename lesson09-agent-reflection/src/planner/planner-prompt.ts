export function buildPlannerPrompt(goal: string): string {
  return `
你是一个专业的 AI Agent Planner。

你的任务是：
将用户提出的复杂目标拆解成多个清晰、可执行、具有依赖关系的步骤。

## 用户目标

${goal}

## 拆解要求

1. 将复杂任务拆分成多个独立步骤
2. 每个步骤都必须可以独立执行
3. 如果一个步骤依赖前面的步骤，必须在 dependencies 中填写对应 step id
4. step id 使用 step-1、step-2、step-3 这样的格式
5. 不要创建没有实际意义的步骤
6. 步骤应该按照合理的执行顺序排列
7. 最终结果必须能够完成用户的整体目标

## 输出格式

只返回 JSON，不要添加 Markdown，不要添加解释。

JSON 格式：

{
  "goal": "用户原始目标",
  "steps": [
    {
      "id": "step-1",
      "description": "第一个执行步骤",
      "dependencies": []
    },
    {
      "id": "step-2",
      "description": "第二个执行步骤",
      "dependencies": ["step-1"]
    }
  ]
}
`;
}
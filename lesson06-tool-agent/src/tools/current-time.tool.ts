import { z } from 'zod';

import type { AgentTool } from '../types/tool.js';

const currentTimeSchema = z.object({
  timezone: z
    .string()
    .optional()
    .describe('IANA 时区，例如 Asia/Shanghai、Asia/Tokyo、America/New_York'),
});

function getCurrentTime(timezone?: string): string {
  const targetTimezone = timezone ?? 'Asia/Shanghai';

  const now = new Date();

  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: targetTimezone,

    dateStyle: 'full',

    timeStyle: 'long',
  }).format(now);
}

export const currentTimeTool: AgentTool<typeof currentTimeSchema> = {
  name: 'get_current_time',

  description: '获取指定时区的当前日期和时间。',

  schema: currentTimeSchema,

  async execute(input, _context): Promise<string> {
    return getCurrentTime(input.timezone);
  },
};

import 'dotenv/config';

export const config = {
  llm: {
    model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
  },

  evaluation: {
    passScore: 0.8,

    enableAnswerEvaluation: true,

    enableTrajectoryEvaluation: true,
  },
};

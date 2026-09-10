export type LLMRole =
  | "system"
  | "user"
  | "assistant"
  | "tool";

export interface SimpleMessage {
  role: LLMRole;
  content: string;
}
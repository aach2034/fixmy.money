import { callAIEndpoint } from "./aiClient";
import type { AIOperationId } from "./gateway";

const ENDPOINT = "/api/ai/chat-completion";

export interface ChatCompletionResult {
  operation: AIOperationId;
  model: string;
  content: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
}

export async function getChatCompletion(
  operation: AIOperationId,
  prompt: string,
): Promise<ChatCompletionResult> {
  return callAIEndpoint(ENDPOINT, { operation, input: { prompt } });
}

export async function getStreamingChatCompletion(
  operation: AIOperationId,
  prompt: string,
  onChunk: (chunk: { content: string }) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
) {
  try {
    const result = await getChatCompletion(operation, prompt);
    onChunk({ content: result.content });
    onComplete();
  } catch (error) {
    onError(error instanceof Error ? error : new Error("Streaming error"));
  }
}

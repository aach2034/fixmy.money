"use client";

import { useState, useCallback } from "react";
import {
  getChatCompletion,
  getStreamingChatCompletion,
} from "@/lib/ai/chatCompletion";
import type { AIOperationId } from "@/lib/ai/gateway";

export function useChat(
  operation: AIOperationId = "agency_assistant",
  streaming: boolean = true,
) {
  const [response, setResponse] = useState("");
  const [fullResponse, setFullResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(
    async (prompt: string) => {
      setResponse("");
      setFullResponse(streaming ? [] : null);
      setIsLoading(true);
      setError(null);

      try {
        if (streaming) {
          await getStreamingChatCompletion(
            operation,
            prompt,
            (chunk) => {
              setFullResponse((prev: any[]) => [...prev, chunk]);
              const content = chunk.content;
              if (content) setResponse((prev) => prev + content);
            },
            () => setIsLoading(false),
            (err) => {
              setError(err);
              setIsLoading(false);
            },
          );
        } else {
          const result = await getChatCompletion(operation, prompt);
          setFullResponse(result);
          setResponse(result.content);
          setIsLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setIsLoading(false);
      }
    },
    [operation, streaming],
  );

  return { response, fullResponse, isLoading, error, sendMessage };
}

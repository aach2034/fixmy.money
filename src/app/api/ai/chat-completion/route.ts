import { handleAIChatPost } from "@/lib/ai/chatRoute";

export async function POST(request: Request) {
  return handleAIChatPost(request);
}

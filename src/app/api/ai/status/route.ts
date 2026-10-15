import { aiAvailable } from "@/lib/ai";

export async function GET() {
  return Response.json({ ai: aiAvailable() });
}

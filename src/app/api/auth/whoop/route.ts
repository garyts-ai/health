import { connectWhoop } from "@/lib/whoop/provider";

export const runtime = "nodejs";

export async function GET() {
  return connectWhoop();
}

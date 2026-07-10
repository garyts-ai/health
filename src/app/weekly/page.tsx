import { redirect } from "next/navigation";
import { legacySectionUrl, type LegacySearchParamValue } from "@/lib/product-navigation";

type WeeklyPageProps = {
  searchParams?: Promise<Record<string, LegacySearchParamValue>>;
};

export default async function WeeklyPage({ searchParams }: WeeklyPageProps) {
  redirect(legacySectionUrl("weekly", (await searchParams) ?? {}));
}

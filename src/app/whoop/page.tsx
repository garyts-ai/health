import { redirect } from "next/navigation";
import { legacySectionUrl, type LegacySearchParamValue } from "@/lib/product-navigation";

type WhoopPageProps = {
  searchParams?: Promise<Record<string, LegacySearchParamValue>>;
};

export default async function WhoopPage({ searchParams }: WhoopPageProps) {
  redirect(legacySectionUrl("whoop", (await searchParams) ?? {}));
}

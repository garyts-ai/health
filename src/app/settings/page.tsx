import { redirect } from "next/navigation";
import { legacySectionUrl, type LegacySearchParamValue } from "@/lib/product-navigation";

type SettingsPageProps = {
  searchParams?: Promise<Record<string, LegacySearchParamValue>>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  redirect(
    legacySectionUrl("utilities", (await searchParams) ?? {}, {
      utilities: "open",
    }),
  );
}

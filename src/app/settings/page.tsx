import { redirect } from "next/navigation";

type SettingsPageProps = {
  searchParams?: Promise<{
    whoop?: string;
    hevy?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const nextParams = new URLSearchParams();
  nextParams.set("utilities", "open");

  if (resolvedSearchParams.whoop) {
    nextParams.set("whoop", resolvedSearchParams.whoop);
  }

  if (resolvedSearchParams.hevy) {
    nextParams.set("hevy", resolvedSearchParams.hevy);
  }

  redirect(`/?${nextParams.toString()}`);
}

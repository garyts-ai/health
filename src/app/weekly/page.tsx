import { ProductShell } from "@/components/product-shell";
import { UtilityAccess } from "@/components/utility-access";
import { WeeklyPlanView } from "@/components/weekly-plan-view";
import { getDailySummary } from "@/lib/insights/engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WeeklyPage() {
  const summary = await getDailySummary();
  return (
    <ProductShell
      current="weekly"
      eyebrow="Health OS"
      title="Weekly"
      description="A live Monday-to-Sunday plan that adapts as workouts land and recovery changes."
      utility={<UtilityAccess summary={summary} />}
    >
      <WeeklyPlanView summary={summary} />
    </ProductShell>
  );
}

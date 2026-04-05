import path from "node:path";

async function main() {
  process.loadEnvFile?.(path.join(process.cwd(), ".env.local"));

  const { sendDailyBriefToDiscord } = await import("../lib/discord-delivery");
  const result = await sendDailyBriefToDiscord("scheduled");

  console.log(result.message);

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Scheduled Discord delivery failed unexpectedly.",
  );
  process.exitCode = 1;
});

import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "@/app/api/whoop/export-import/route";

test("WHOOP export upload route rejects missing files with redirect state", async () => {
  const formData = new FormData();
  const response = await POST(
    new Request("http://localhost/api/whoop/export-import", {
      body: formData,
      method: "POST",
    }),
  );

  assert.equal(response.status, 303);
  const location = response.headers.get("location") ?? "";
  assert.match(location, /^http:\/\/localhost\/whoop\?/);
  assert.match(location, /import=failed/);
  assert.match(location, /Choose\+a\+WHOOP\+export\+ZIP\+file/);
});

test("WHOOP export upload route returns JSON errors for API callers", async () => {
  const formData = new FormData();
  formData.set("exportFile", new File(["not zip"], "export.csv", { type: "text/csv" }));

  const response = await POST(
    new Request("http://localhost/api/whoop/export-import", {
      body: formData,
      headers: { accept: "application/json" },
      method: "POST",
    }),
  );
  const payload = await response.json() as { status: string; error: string };

  assert.equal(response.status, 400);
  assert.equal(payload.status, "failed");
  assert.match(payload.error, /full WHOOP export ZIP/);
});

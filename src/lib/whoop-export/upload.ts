import JSZip from "jszip";

import {
  importWhoopExportBuffer,
  REQUIRED_WHOOP_EXPORT_FILES,
  type WhoopExportImportResult,
} from "@/lib/whoop-export/importer";

export const WHOOP_EXPORT_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

export class WhoopExportUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhoopExportUploadError";
  }
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function safeSourceName(name: string) {
  const cleaned = name.split(/[\\/]/).at(-1)?.trim() ?? "";
  return cleaned || "whoop-export.zip";
}

export async function validateWhoopExportZip(buffer: Buffer, sourceName: string) {
  if (!sourceName.toLowerCase().endsWith(".zip")) {
    throw new WhoopExportUploadError("Upload the full WHOOP export ZIP file.");
  }

  if (buffer.length === 0) {
    throw new WhoopExportUploadError("The uploaded WHOOP export is empty.");
  }

  if (buffer.length > WHOOP_EXPORT_UPLOAD_MAX_BYTES) {
    throw new WhoopExportUploadError("The WHOOP export ZIP is larger than the app upload limit.");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new WhoopExportUploadError("The uploaded file is not a readable ZIP archive.");
  }

  const missing = REQUIRED_WHOOP_EXPORT_FILES.filter((name) => !zip.file(name));
  if (missing.length > 0) {
    throw new WhoopExportUploadError(`WHOOP export is missing ${missing.join(", ")}.`);
  }
}

export async function importWhoopExportFormData(
  formData: FormData,
): Promise<WhoopExportImportResult> {
  const entry = formData.get("exportFile");
  if (!isFileLike(entry)) {
    throw new WhoopExportUploadError("Choose a WHOOP export ZIP file.");
  }

  const sourceName = safeSourceName(entry.name);
  const buffer = Buffer.from(await entry.arrayBuffer());
  await validateWhoopExportZip(buffer, sourceName);
  return importWhoopExportBuffer(buffer, sourceName);
}

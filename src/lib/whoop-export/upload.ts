import JSZip from "jszip";

import {
  importWhoopExportBuffer,
  REQUIRED_WHOOP_EXPORT_FILES,
  type WhoopExportImportResult,
} from "@/lib/whoop-export/importer";

export const WHOOP_EXPORT_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
export const WHOOP_EXPORT_MAX_ENTRIES = 128;
export const WHOOP_EXPORT_MAX_ENTRY_BYTES = 16 * 1024 * 1024;
export const WHOOP_EXPORT_MAX_EXPANDED_BYTES = 64 * 1024 * 1024;
export const WHOOP_EXPORT_MAX_COMPRESSION_RATIO = 100;
export const WHOOP_EXPORT_MAX_PROCESSING_MS = 5_000;

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

  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length > WHOOP_EXPORT_MAX_ENTRIES) {
    throw new WhoopExportUploadError("The WHOOP export contains too many archive entries.");
  }
  const startedAt = Date.now();
  let expandedBytes = 0;
  for (const entry of entries) {
    const bytes = await entry.async("uint8array");
    if (bytes.byteLength > WHOOP_EXPORT_MAX_ENTRY_BYTES) {
      throw new WhoopExportUploadError("A WHOOP export archive entry is too large.");
    }
    expandedBytes += bytes.byteLength;
    if (expandedBytes > WHOOP_EXPORT_MAX_EXPANDED_BYTES) {
      throw new WhoopExportUploadError("The expanded WHOOP export is larger than the processing limit.");
    }
    const compressedSize = (entry as unknown as { _data?: { compressedSize?: number } })._data?.compressedSize;
    if (typeof compressedSize === "number" && (compressedSize === 0 ? bytes.byteLength > 0 : bytes.byteLength / compressedSize > WHOOP_EXPORT_MAX_COMPRESSION_RATIO)) {
      throw new WhoopExportUploadError("The WHOOP export compression ratio is unsafe.");
    }
    if (Date.now() - startedAt > WHOOP_EXPORT_MAX_PROCESSING_MS) {
      throw new WhoopExportUploadError("The WHOOP export took too long to process.");
    }
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

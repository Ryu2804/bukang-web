export interface PptxExportResult {
  blob: Blob;
  filename: string;
}

type PptxRequest = (url: string) => Promise<Response>;

export function formatPptxProgress(
  studentCount: number,
  elapsedSeconds: number,
): string {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const elapsed = minutes > 0
    ? `${minutes} mnt ${seconds} dtk`
    : `${seconds} dtk`;
  const subject = studentCount > 0
    ? `${studentCount} mahasiswa`
    : "foto mahasiswa";
  return `Memproses ${subject} • ${elapsed}`;
}

export async function fetchPptxExport(
  url: string,
  request: PptxRequest,
): Promise<PptxExportResult> {
  const response = await request(url);
  if (!response.ok) {
    let message = "Gagal membuat PPTX";
    try {
      const body = await response.json();
      message = body?.data?.detail || body?.detail || message;
    } catch {
      // Keep the generic message when the server does not return JSON.
    }
    throw new Error(message);
  }

  const disposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
  const filename = filenameMatch?.[1] || "bukang-mahasiswa.pptx";
  return { blob: await response.blob(), filename };
}

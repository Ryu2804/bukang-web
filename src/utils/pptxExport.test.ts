import assert from "node:assert/strict";
import test from "node:test";

import * as pptxExport from "./pptxExport.ts";

const { fetchPptxExport } = pptxExport;


test("returns the generated PPTX blob and filename from the API response", async () => {
  let requestedUrl = "";
  const request = async (url: string) => {
    requestedUrl = url;
    return new Response(new Uint8Array([80, 75, 3, 4]), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": 'attachment; filename="bukang-mahasiswa-2026-09-03.pptx"',
      },
    });
  };

  const result = await fetchPptxExport(
    "/api/students/export/pptx?major=Teknik+Informatika",
    request,
  );

  assert.equal(requestedUrl, "/api/students/export/pptx?major=Teknik+Informatika");
  assert.equal(result.filename, "bukang-mahasiswa-2026-09-03.pptx");
  assert.equal(result.blob.size, 4);
});


test("throws the backend detail when PPTX generation fails", async () => {
  const request = async () => new Response(
    JSON.stringify({
      success: false,
      data: { detail: "Tidak ada submission yang cocok untuk diekspor" },
    }),
    { status: 404, headers: { "Content-Type": "application/json" } },
  );

  await assert.rejects(
    fetchPptxExport("/api/students/export/pptx", request),
    /Tidak ada submission yang cocok untuk diekspor/,
  );
});


test("formats visible PPTX progress with the student count and elapsed time", () => {
  const formatter = (
    pptxExport as typeof pptxExport & {
      formatPptxProgress?: (studentCount: number, elapsedSeconds: number) => string;
    }
  ).formatPptxProgress;

  const message = formatter?.(86, 125);

  assert.equal(message, "Memproses 86 mahasiswa • 2 mnt 5 dtk");
});

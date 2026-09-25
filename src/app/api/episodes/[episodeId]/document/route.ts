import { ok, withUser } from "@/lib/api";
import { DomainError } from "@/lib/domain";
import { MAX_UPLOAD_BYTES } from "@/lib/extraction";
import { getDocumentForViewer, pasteText, uploadPdf } from "@/lib/services/review";

export const GET = withUser<{ episodeId: string }>(async (_request, user, { episodeId }) => {
  const document = await getDocumentForViewer(user, episodeId);
  if (!document) return ok({ document: null });
  return ok({
    document: {
      id: document.id,
      fileName: document.fileName,
      pageCount: document.pageCount,
      pages: document.extractedText.split("\f"),
      uploadedAt: document.uploadedAt.toISOString(),
    },
  });
});

/** Accepts multipart (field "file") for PDFs or JSON { text } for pasted text. */
export const POST = withUser<{ episodeId: string }>(async (request, user, { episodeId }) => {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new DomainError("Attach a PDF file in the \"file\" field.", 400);
    if (file.size > MAX_UPLOAD_BYTES) throw new DomainError("PDF is larger than 10 MB.", 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const document = await uploadPdf(user, episodeId, file.name, bytes);
    return ok({ id: document.id, fileName: document.fileName, pageCount: document.pageCount }, 201);
  }
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  if (!body || typeof body.text !== "string") {
    throw new DomainError("Send JSON with a \"text\" field or a multipart PDF upload.", 400);
  }
  const document = await pasteText(user, episodeId, body.text);
  return ok({ id: document.id, fileName: document.fileName, pageCount: document.pageCount }, 201);
});

/**
 * Placeholder for future OCR / vision pipeline (e.g. Google Vision, Textract, multimodal LLM).
 * Keep image payloads server-side ephemeral — this MVP only records that images were attached.
 */
export function appendScreenshotAnalysisPlaceholder(imageCount: number): string {
  if (imageCount <= 0) return "";
  return `\n\n[User attached ${imageCount} listing screenshot(s). OCR / vision extraction is not enabled in this build — combine with pasted text for best results.]\n`;
}

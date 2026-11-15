export const maxNotesCharacters = 24_000;
export const maxNotesFileBytes = 4 * 1024 * 1024;
export const maxPdfBase64 = 4 * Math.ceil(maxNotesFileBytes / 3);

export function cleanNotes(text: string) {
  return text.replace(/\r\n?/g, "\n").replace(/\u0000/g, "").trim();
}

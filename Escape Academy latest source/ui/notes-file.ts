import { cleanNotes, maxNotesCharacters, maxNotesFileBytes } from "@/lib/notes";

export type NotesFile = { name: string } & ({ text: string } | { pdf: string });

async function readWordDocument(file: File) {
  const { unzipSync } = await import("three/addons/libs/fflate.module.js");
  let documentXml: Uint8Array | undefined;
  try {
    const archive = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter: entry => entry.name === "word/document.xml" && entry.originalSize <= maxNotesFileBytes,
    });
    documentXml = archive["word/document.xml"];
  } catch {
    throw new Error("This Word file couldn’t be opened. Try saving it again as a .docx file.");
  }
  if (!documentXml) throw new Error("This Word file couldn’t be read. Try a smaller .docx file.");
  const document = new DOMParser().parseFromString(new TextDecoder().decode(documentXml), "application/xml");
  if (document.documentElement.localName !== "document") throw new Error("This Word file couldn’t be read.");
  const namespace = document.documentElement.namespaceURI;
  const paragraphs = Array.from(document.getElementsByTagNameNS(namespace, "p"));
  return paragraphs.map(paragraph => Array.from(paragraph.getElementsByTagNameNS(namespace, "*"))
    .map(run => run.localName==="t" ? run.textContent??""
      : run.localName==="tab" ? " "
      : run.localName==="br"||run.localName==="cr" ? "\n" : "")
    .join("")).filter(text => text.trim()).join("\n");
}

async function readPdf(file: File) {
  if (await file.slice(0, 5).text() !== "%PDF-") throw new Error("This file doesn’t appear to be a PDF.");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1]);
    reader.onerror = () => reject(new Error("This PDF couldn’t be read. Try selecting it again."));
    reader.readAsDataURL(file);
  });
}

export async function readNotesFile(file: File): Promise<NotesFile> {
  if (file.size > maxNotesFileBytes) throw new Error("Choose a notes file of 4 MB or less.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return { name: file.name, pdf: await readPdf(file) };
  if (extension !== "docx" && extension !== "txt" && extension !== "md") {
    throw new Error("Choose a Word (.docx), PDF, text (.txt), or Markdown (.md) file.");
  }
  const text = cleanNotes(extension === "docx" ? await readWordDocument(file) : await file.text());
  if (text.length < 2) throw new Error("No readable notes were found. Try a PDF or paste the notes into the text box.");
  if (text.length > maxNotesCharacters) throw new Error("Use a shorter excerpt of up to 24,000 characters.");
  return { name: file.name, text };
}

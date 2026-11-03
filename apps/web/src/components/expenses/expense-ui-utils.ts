export function cleanStoredReceiptName(fileName: string) {
  if (!fileName) return fileName;
  const extension = fileName.match(/\.[^.]+$/)?.[0]?.toLowerCase();
  return extension ? `receipt${extension}` : "image";
}

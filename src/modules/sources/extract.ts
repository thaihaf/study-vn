import mammoth from 'mammoth';
import pdf from 'pdf-parse';

export async function extractTextFromUpload(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.type === 'text/plain' || file.type === 'text/markdown') {
    return buffer.toString('utf8');
  }
  if (file.type === 'application/pdf') {
    const parsed = await pdf(buffer);
    return parsed.text;
  }
  if (
    file.type ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value;
  }
  throw new Error('UNSUPPORTED_SOURCE_TYPE');
}

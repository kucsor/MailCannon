// @ts-ignore
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export async function parseResume(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    let parser;
    try {
      parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF file');
    } finally {
      if (parser) {
        await parser.destroy();
      }
    }
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // docx
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error('Error parsing DOCX:', error);
      throw new Error('Failed to parse DOCX file');
    }
  }

  if (mimeType === 'text/plain' || mimeType === 'text/markdown' || mimeType.startsWith('text/')) {
    return buffer.toString('utf-8');
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

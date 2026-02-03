// @ts-ignore
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export async function parseResume(buffer: Buffer, mimeType: string): Promise<string> {
  console.log(`[parseResume] Starting parse for mimeType: ${mimeType}, size: ${buffer.length}`);

  if (!buffer || buffer.length === 0) {
    console.warn('[parseResume] Received empty buffer.');
    return '';
  }

  if (mimeType === 'application/pdf') {
    let parser;
    try {
      console.log('[parseResume] Initializing PDFParse...');
      parser = new PDFParse({ data: buffer });
      console.log('[parseResume] Calling parser.getText()...');
      const result = await parser.getText();
      console.log('[parseResume] PDF text extracted successfully. Length:', result.text.length);
      return result.text;
    } catch (error: any) {
      console.error('[parseResume] Error parsing PDF:', error);
      if (error.stack) console.error(error.stack);
      throw new Error(`Failed to parse PDF file: ${error.message}`);
    } finally {
      if (parser) {
        try {
          await parser.destroy();
        } catch (e) {
          console.error('[parseResume] Error destroying parser:', e);
        }
      }
    }
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // docx
    try {
      console.log('[parseResume] Extracting DOCX text...');
      const result = await mammoth.extractRawText({ buffer });
      console.log('[parseResume] DOCX text extracted successfully.');
      return result.value;
    } catch (error: any) {
      console.error('[parseResume] Error parsing DOCX:', error);
      throw new Error(`Failed to parse DOCX file: ${error.message}`);
    }
  }

  if (mimeType === 'text/plain' || mimeType === 'text/markdown' || mimeType.startsWith('text/')) {
    console.log('[parseResume] treating as text');
    return buffer.toString('utf-8');
  }

  console.error(`[parseResume] Unsupported file type: ${mimeType}`);
  throw new Error(`Unsupported file type: ${mimeType}`);
}

import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { textProcessor } from './TextProcessor';
import { storageService } from './StorageService';
import { UserDocumentInput } from '../types/UserDocument';
import { Fact } from '../types/Fact';

// Note: PDF parsing requires react-native-pdf or similar library
// This is a simplified implementation that assumes text extraction capability

class PDFProcessor {
  /**
   * Process a user-uploaded PDF file
   */
  async processPDF(filePath: string, filename: string, topic?: string): Promise<Fact[]> {
    try {
      // Extract text from PDF
      const text = await this.extractTextFromPDF(filePath);
      
      if (!text || text.trim().length === 0) {
        throw new Error('Could not extract text from PDF');
      }

      // Determine topic from filename or use provided topic
      const documentTopic = topic || this.extractTopicFromFilename(filename) || 'user_upload';

      // Store document record
      const documentInput: UserDocumentInput = {
        filename,
        file_path: filePath,
        topic: documentTopic,
      };
      const documentId = await storageService.insertDocument(documentInput);

      // Process text into facts
      const facts = await textProcessor.processText(text, documentTopic, 'user_upload');

      // Mark document as processed
      await storageService.updateDocumentProcessed(documentId, true);

      return facts;
    } catch (error) {
      console.error('Error processing PDF:', error);
      throw error;
    }
  }

  /**
   * Extract text from PDF file
   * Note: This requires a PDF parsing library
   * For now, this is a placeholder that should be implemented with react-native-pdf
   * or a similar library that can extract text
   */
  private async extractTextFromPDF(filePath: string): Promise<string | null> {
    try {
      // Check if file exists
      const exists = await RNFS.exists(filePath);
      if (!exists) {
        throw new Error(`PDF file not found: ${filePath}`);
      }

      // TODO: Implement actual PDF text extraction
      // This would typically use a library like:
      // - react-native-pdf (for rendering, may need additional text extraction)
      // - pdf-parse (if available for React Native)
      // - A native module for PDF text extraction
      
      // For now, return null to indicate this needs implementation
      // In production, you would use a PDF parsing library here
      console.warn('PDF text extraction not yet implemented. Please integrate a PDF parsing library.');
      
      // Placeholder: try to read as text (won't work for binary PDFs)
      try {
        const content = await RNFS.readFile(filePath, 'utf8');
        // Basic check if it's actually text (PDFs are binary)
        if (content.includes('%PDF')) {
          // It's a PDF binary file, can't read as text
          return null;
        }
        return content;
      } catch {
        return null;
      }
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      return null;
    }
  }

  /**
   * Extract topic from filename
   */
  private extractTopicFromFilename(filename: string): string | null {
    // Try to extract topic from filename
    // e.g., "biology_textbook.pdf" -> "biology"
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    const words = nameWithoutExt.toLowerCase().split(/[_\s-]+/);
    
    // Common topic keywords
    const topicKeywords: Record<string, string> = {
      'animal': 'animals',
      'history': 'history',
      'plant': 'plants',
      'science': 'science',
      'sport': 'sport',
      'biology': 'science',
      'chemistry': 'science',
      'physics': 'science',
      'math': 'science',
    };

    for (const word of words) {
      if (topicKeywords[word]) {
        return topicKeywords[word];
      }
    }

    return null;
  }

  /**
   * Get all user-uploaded documents
   */
  async getUserDocuments(): Promise<any[]> {
    return await storageService.getDocuments();
  }

  /**
   * Check if a file is a PDF
   */
  isPDFFile(filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();
    return ext === 'pdf';
  }
}

export const pdfProcessor = new PDFProcessor();


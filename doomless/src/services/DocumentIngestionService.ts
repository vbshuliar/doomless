import RNFS from 'react-native-fs';
import { detectSourceType } from '../utils/categoryUtils';
import { storageService } from './StorageService';
import { textProcessor } from './TextProcessor';
import { pdfProcessor } from './PDFProcessor';
import { bumpContentRevision } from '../store/brainStore';

export type DocumentIngestionParams = {
  categoryId: string;
  categoryName: string;
  fileUri: string;
  fileName: string;
  mimeType?: string | null;
};

export type DocumentIngestionResult = {
  factCount: number;
  documentId?: number;
};

const ensureLocalCopy = async (uri: string, filename: string): Promise<string> => {
  if (!uri.startsWith('content://')) {
    return uri.replace('file://', '');
  }

  const safeName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const targetDir = `${RNFS.DocumentDirectoryPath}/imports`;
  await RNFS.mkdir(targetDir);
  const destination = `${targetDir}/${Date.now()}-${safeName}`;
  await RNFS.copyFile(uri, destination);
  return destination;
};

class DocumentIngestionService {
  async ingest(params: DocumentIngestionParams): Promise<DocumentIngestionResult> {
    const { categoryId, fileUri, fileName, mimeType } = params;

    await storageService.initialize();

    const sourceType = detectSourceType(fileName, mimeType ?? undefined);

    if (sourceType === 'pdf') {
      const localPath = await ensureLocalCopy(fileUri, fileName);
      const facts = await pdfProcessor.processPDF(localPath, fileName, categoryId);
      const factCount = facts.filter((fact) => !fact.is_quiz).length;
      if (factCount > 0) {
        bumpContentRevision();
      }
      return { factCount };
    }

    const localPath = await ensureLocalCopy(fileUri, fileName);
    let fileContents: string | null = null;

    try {
      fileContents = await RNFS.readFile(localPath, 'utf8');
    } catch (error) {
      console.error('[DocumentIngestionService] Unable to read document contents.', error);
      throw new Error('Could not read the selected document content.');
    }

    if (!fileContents || fileContents.trim().length === 0) {
      throw new Error('The selected file did not contain readable text.');
    }

    const documentId = await storageService.insertDocument({
      filename: fileName,
      file_path: localPath,
      topic: categoryId,
    });

    const facts = await textProcessor.processText(fileContents, categoryId, 'user_upload');
    await storageService.updateDocumentProcessed(documentId, true);

    const factCount = facts.filter((fact) => !fact.is_quiz).length;
    if (factCount > 0) {
      bumpContentRevision();
    }

    return {
      factCount,
      documentId,
    };
  }
}

export const documentIngestionService = new DocumentIngestionService();

export interface UserDocument {
  id: number;
  filename: string;
  file_path: string;
  processed: boolean;
  created_at: string;
  topic?: string;
}

export interface UserDocumentInput {
  filename: string;
  file_path: string;
  topic?: string;
}


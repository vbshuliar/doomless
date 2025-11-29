import { Fact, FactInput } from '../types/Fact';
import { Interaction, InteractionInput } from '../types/Interaction';
import { UserPreference } from '../types/Preferences';
import { UserDocument, UserDocumentInput } from '../types/UserDocument';

type SQLResultSet = {
  rows: {
    length: number;
    item: (index: number) => any;
  };
  insertId: number;
};

type SQLTransaction = {
  executeSql: (
    sqlStatement: string,
    args: any[],
    successCallback?: (transaction: SQLTransaction, resultSet: SQLResultSet) => void,
    errorCallback?: (transaction: SQLTransaction, error: Error) => boolean,
  ) => void;
};

type SQLiteDatabase = {
  transaction: (
    scope: (transaction: SQLTransaction) => void,
    errorCallback?: (error: unknown) => void,
    successCallback?: () => void,
  ) => void;
  close: () => Promise<void> | void;
};

type SQLiteModule = {
  openDatabase: (config: { name: string; location: string }) => SQLiteDatabase;
};

const rawSQLite = require('react-native-sqlite-2');
const resolvedSQLite =
  rawSQLite && typeof rawSQLite.openDatabase === 'function'
    ? rawSQLite
    : rawSQLite?.default && typeof rawSQLite.default.openDatabase === 'function'
    ? rawSQLite.default
    : null;

if (!resolvedSQLite) {
  throw new Error('react-native-sqlite-2 failed to provide openDatabase');
}

const SQLite: SQLiteModule = resolvedSQLite;

class StorageService {
  private db: SQLiteDatabase | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized && this.db) {
      return;
    }

    try {
      this.db = SQLite.openDatabase({
        name: 'doomless.db',
        location: 'default',
      });

      await this.createTables();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        // Facts table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS facts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            topic TEXT NOT NULL,
            source TEXT NOT NULL,
            is_quiz INTEGER DEFAULT 0,
            quiz_data TEXT,
            created_at TEXT DEFAULT (datetime('now'))
          )`,
          [],
          () => {},
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error creating facts table:', error);
            return false;
          }
        );

        // User interactions table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS user_interactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fact_id INTEGER NOT NULL,
            direction TEXT NOT NULL,
            timestamp TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (fact_id) REFERENCES facts(id)
          )`,
          [],
          () => {},
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error creating user_interactions table:', error);
            return false;
          }
        );

        // User preferences table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS user_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL UNIQUE,
            preference_score REAL DEFAULT 0.0,
            last_updated TEXT DEFAULT (datetime('now'))
          )`,
          [],
          () => {},
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error creating user_preferences table:', error);
            return false;
          }
        );

        // User documents table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS user_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            topic TEXT,
            processed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
          )`,
          [],
          () => {},
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error creating user_documents table:', error);
            return false;
          }
        );
      }, reject, resolve);
    });
  }

  // Facts operations
  async insertFact(fact: FactInput): Promise<number> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO facts (content, topic, source, is_quiz, quiz_data)
           VALUES (?, ?, ?, ?, ?)`,
          [
            fact.content,
            fact.topic,
            fact.source,
            fact.is_quiz ? 1 : 0,
            fact.quiz_data ? JSON.stringify(fact.quiz_data) : null,
          ],
          (_tx: SQLTransaction, result: SQLResultSet) => {
            resolve(result.insertId);
          },
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error inserting fact:', error);
            reject(error);
            return false;
          }
        );
      }, reject);
    });
  }

  async getFacts(topic?: string, limit?: number, offset?: number): Promise<Fact[]> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM facts';
      const params: any[] = [];

      if (topic) {
        query += ' WHERE topic = ?';
        params.push(topic);
      }

      query += ' ORDER BY created_at DESC';

      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      if (offset) {
        query += ' OFFSET ?';
        params.push(offset);
      }

      this.db!.transaction((tx) => {
        tx.executeSql(
          query,
          params,
          (_tx: SQLTransaction, result: SQLResultSet) => {
            const facts: Fact[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              facts.push({
                id: row.id,
                content: row.content,
                topic: row.topic,
                source: row.source,
                created_at: row.created_at,
                is_quiz: row.is_quiz === 1,
                quiz_data: row.quiz_data ? JSON.parse(row.quiz_data) : undefined,
              });
            }
            resolve(facts);
          },
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error getting facts:', error);
            reject(error);
            return false;
          }
        );
      }, reject);
    });
  }

  async getFactCountByTopic(
    topic: string,
    options: { includeQuizzes?: boolean } = {},
  ): Promise<number> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      let query = 'SELECT COUNT(*) as count FROM facts WHERE topic = ?';
      const params: any[] = [topic];

      if (options.includeQuizzes === false) {
        query += ' AND (is_quiz IS NULL OR is_quiz = 0)';
      }

      this.db!.transaction((tx) => {
        tx.executeSql(
          query,
          params,
          (_tx: SQLTransaction, result: SQLResultSet) => {
            const count = result.rows.length > 0 ? Number(result.rows.item(0).count) : 0;
            resolve(Number.isFinite(count) ? count : 0);
          },
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error counting facts by topic:', error);
            reject(error);
            return false;
          },
        );
      }, reject);
    });
  }

  async getFactsByTopics(
    topics: string[],
    options: { includeQuizzes?: boolean; quizOnly?: boolean; limit?: number } = {},
  ): Promise<Fact[]> {
    if (!this.db) {
      await this.initialize();
    }

    if (topics.length === 0) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const placeholders = topics.map(() => '?').join(',');
      let query = `SELECT * FROM facts WHERE topic IN (${placeholders})`;
      const params: any[] = [...topics];

      if (options.quizOnly) {
        query += ' AND is_quiz = 1';
      } else if (options.includeQuizzes === false) {
        query += ' AND (is_quiz IS NULL OR is_quiz = 0)';
      }

      query += ' ORDER BY created_at DESC';

      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      }

      this.db!.transaction((tx) => {
        tx.executeSql(
          query,
          params,
          (_tx: SQLTransaction, result: SQLResultSet) => {
            const facts: Fact[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              facts.push({
                id: row.id,
                content: row.content,
                topic: row.topic,
                source: row.source,
                created_at: row.created_at,
                is_quiz: row.is_quiz === 1,
                quiz_data: row.quiz_data ? JSON.parse(row.quiz_data) : undefined,
              });
            }
            resolve(facts);
          },
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error getting facts by topics:', error);
            reject(error);
            return false;
          },
        );
      }, reject);
    });
  }

  async getFactById(id: number): Promise<Fact | null> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM facts WHERE id = ?',
          [id],
          (_tx: SQLTransaction, result: SQLResultSet) => {
            if (result.rows.length > 0) {
              const row = result.rows.item(0);
              resolve({
                id: row.id,
                content: row.content,
                topic: row.topic,
                source: row.source,
                created_at: row.created_at,
                is_quiz: row.is_quiz === 1,
                quiz_data: row.quiz_data ? JSON.parse(row.quiz_data) : undefined,
              });
            } else {
              resolve(null);
            }
          },
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error getting fact by id:', error);
            reject(error);
            return false;
          }
        );
      }, reject);
    });
  }

  // Interactions operations
  async insertInteraction(interaction: InteractionInput): Promise<number> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'INSERT INTO user_interactions (fact_id, direction) VALUES (?, ?)',
          [interaction.fact_id, interaction.direction],
          (_tx: SQLTransaction, result: SQLResultSet) => {
            resolve(result.insertId);
          },
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error inserting interaction:', error);
            reject(error);
            return false;
          }
        );
      }, reject);
    });
  }

  async getInteractions(limit?: number): Promise<Interaction[]> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM user_interactions ORDER BY timestamp DESC';
      const params: any[] = [];

      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      this.db!.transaction((tx) => {
        tx.executeSql(
          query,
          params,
          (_tx: SQLTransaction, result: SQLResultSet) => {
            const interactions: Interaction[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              interactions.push({
                id: row.id,
                fact_id: row.fact_id,
                direction: row.direction,
                timestamp: row.timestamp,
              });
            }
            resolve(interactions);
          },
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error getting interactions:', error);
            reject(error);
            return false;
          }
        );
      }, reject);
    });
  }

  async getInteractionsByFactId(factId: number): Promise<Interaction[]> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM user_interactions WHERE fact_id = ? ORDER BY timestamp DESC',
          [factId],
          (_tx: SQLTransaction, result: SQLResultSet) => {
            const interactions: Interaction[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              interactions.push({
                id: row.id,
                fact_id: row.fact_id,
                direction: row.direction,
                timestamp: row.timestamp,
              });
            }
            resolve(interactions);
          },
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error getting interactions by fact id:', error);
            reject(error);
            return false;
          }
        );
      }, reject);
    });
  }

  // Preferences operations
  async updatePreference(topic: string, scoreDelta: number): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        // First, try to get existing preference
        tx.executeSql(
          'SELECT * FROM user_preferences WHERE topic = ?',
          [topic],
          (_tx: SQLTransaction, result: SQLResultSet) => {
            if (result.rows.length > 0) {
              const currentScore = result.rows.item(0).preference_score;
              const newScore = Math.max(-1.0, Math.min(1.0, currentScore + scoreDelta));
              
              tx.executeSql(
                'UPDATE user_preferences SET preference_score = ?, last_updated = datetime("now") WHERE topic = ?',
                [newScore, topic],
                () => resolve(),
                (_tx: SQLTransaction, error: Error) => {
                  console.error('Error updating preference:', error);
                  reject(error);
                  return false;
                }
              );
            } else {
              // Insert new preference
              const newScore = Math.max(-1.0, Math.min(1.0, scoreDelta));
              tx.executeSql(
                'INSERT INTO user_preferences (topic, preference_score) VALUES (?, ?)',
                [topic, newScore],
                () => resolve(),
                (_tx: SQLTransaction, error: Error) => {
                  console.error('Error inserting preference:', error);
                  reject(error);
                  return false;
                }
              );
            }
          },
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error getting preference:', error);
            reject(error);
            return false;
          }
        );
      }, reject);
    });
  }

  async getPreferences(): Promise<UserPreference[]> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM user_preferences ORDER BY preference_score DESC',
          [],
          (_tx: SQLTransaction, result: SQLResultSet) => {
            const preferences: UserPreference[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              preferences.push({
                id: row.id,
                topic: row.topic,
                preference_score: row.preference_score,
                last_updated: row.last_updated,
              });
            }
            resolve(preferences);
          },
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error getting preferences:', error);
            reject(error);
            return false;
          }
        );
      }, reject);
    });
  }

  async getPreferenceByTopic(topic: string): Promise<UserPreference | null> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM user_preferences WHERE topic = ?',
          [topic],
          (_tx: SQLTransaction, result: SQLResultSet) => {
            if (result.rows.length > 0) {
              const row = result.rows.item(0);
              resolve({
                id: row.id,
                topic: row.topic,
                preference_score: row.preference_score,
                last_updated: row.last_updated,
              });
            } else {
              resolve(null);
            }
          },
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error getting preference by topic:', error);
            reject(error);
            return false;
          }
        );
      }, reject);
    });
  }

  // User documents operations
  async insertDocument(document: UserDocumentInput): Promise<number> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'INSERT INTO user_documents (filename, file_path, topic) VALUES (?, ?, ?)',
          [document.filename, document.file_path, document.topic || null],
          (_tx: SQLTransaction, result: SQLResultSet) => {
            resolve(result.insertId);
          },
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error inserting document:', error);
            reject(error);
            return false;
          }
        );
      }, reject);
    });
  }

  async updateDocumentProcessed(id: number, processed: boolean): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'UPDATE user_documents SET processed = ? WHERE id = ?',
          [processed ? 1 : 0, id],
          () => resolve(),
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error updating document processed status:', error);
            reject(error);
            return false;
          }
        );
      }, reject);
    });
  }

  async getDocuments(): Promise<UserDocument[]> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      this.db!.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM user_documents ORDER BY created_at DESC',
          [],
          (_tx: SQLTransaction, result: SQLResultSet) => {
            const documents: UserDocument[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              documents.push({
                id: row.id,
                filename: row.filename,
                file_path: row.file_path,
                topic: row.topic,
                processed: row.processed === 1,
                created_at: row.created_at,
              });
            }
            resolve(documents);
          },
          (_tx: SQLTransaction, error: Error) => {
            console.error('Error getting documents:', error);
            reject(error);
            return false;
          }
        );
      }, reject);
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}

export const storageService = new StorageService();


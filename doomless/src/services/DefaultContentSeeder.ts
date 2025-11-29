import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_FACTS } from '../data/defaultFacts';
import { storageService } from './StorageService';

const normalize = (value: string): string => value.trim().replace(/\s+/g, ' ');

class DefaultContentSeeder {
  private hasSeeded = false;
  private pending: Promise<void> | null = null;

  private readonly seedVersion = 'default-facts-v2';
  private readonly flagKey = 'doomless-default-facts-version';

  async ensureSeeded(): Promise<void> {
    if (this.hasSeeded) {
      return;
    }

    if (this.pending) {
      return this.pending;
    }

    this.pending = (async () => {
      const storedVersion = await AsyncStorage.getItem(this.flagKey);
      await storageService.initialize();

      const categories = Object.keys(DEFAULT_FACTS) as Array<keyof typeof DEFAULT_FACTS>;
      let needsSeeding = storedVersion !== this.seedVersion;

      if (!needsSeeding) {
        for (const categoryId of categories) {
          const currentCount = await storageService.getFactCountByTopic(categoryId, {
            includeQuizzes: false,
          });
          if (currentCount < DEFAULT_FACTS[categoryId].length) {
            needsSeeding = true;
            break;
          }
        }
      }

      if (!needsSeeding) {
        this.hasSeeded = true;
        this.pending = null;
        return;
      }

      for (const categoryId of categories) {
        const targetFacts = DEFAULT_FACTS[categoryId];
        if (!Array.isArray(targetFacts) || targetFacts.length === 0) {
          continue;
        }

        const existingFacts = await storageService.getFacts(categoryId);
        const existingSet = new Set(
          existingFacts
            .filter((fact) => fact.source === 'default' && !fact.is_quiz)
            .map((fact) => normalize(fact.content)),
        );

        for (const factText of targetFacts) {
          const normalized = normalize(factText);
          if (existingSet.has(normalized)) {
            continue;
          }
          await storageService.insertFact({
            content: factText,
            topic: categoryId,
            source: 'default',
          });
          existingSet.add(normalized);
        }
      }

      await AsyncStorage.setItem(this.flagKey, this.seedVersion);
      this.hasSeeded = true;
      this.pending = null;
    })();

    return this.pending;
  }
}

export const defaultContentSeeder = new DefaultContentSeeder();

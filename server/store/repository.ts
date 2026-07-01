import path from 'node:path';
import { FileStoreRepository } from './fileStore';
import { MariaDbStoreRepository } from './mariadb';
import type { StoreRepository } from './types';

export type StoreDataDriver = 'file' | 'mariadb';

export function getConfiguredStoreDriver(): StoreDataDriver {
  const driver = String(process.env.STORE_DATA_DRIVER || 'file').toLowerCase();
  return driver === 'mariadb' ? 'mariadb' : 'file';
}

export async function createStoreRepository(): Promise<StoreRepository> {
  const driver = getConfiguredStoreDriver();

  if (driver === 'mariadb') {
    return MariaDbStoreRepository.createFromEnv();
  }

  const filePath = process.env.STORE_DATA_FILE_PATH?.trim()
    ? path.resolve(process.cwd(), process.env.STORE_DATA_FILE_PATH)
    : path.resolve(process.cwd(), 'storage', 'store-data.json');

  return new FileStoreRepository(filePath);
}

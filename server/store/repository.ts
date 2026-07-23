import { MariaDbStoreRepository } from './mariadb';
import type { StoreRepository } from './types';

export type StoreDataDriver = 'mariadb';

export function getConfiguredStoreDriver(): StoreDataDriver {
  const driver = String(process.env.STORE_DATA_DRIVER || 'mariadb').toLowerCase();
  if (driver !== 'mariadb') {
    throw new Error('STORE_DATA_DRIVER must be "mariadb". Local file persistence was removed.');
  }
  return 'mariadb';
}

export async function createStoreRepository(): Promise<StoreRepository> {
  getConfiguredStoreDriver();
  return MariaDbStoreRepository.createFromEnv();
}

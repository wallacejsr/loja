import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const execute = process.argv.includes('--execute');
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

const contentTypeExtensions: Record<string, string> = {
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variavel obrigatoria ausente: ${name}`);
  }

  return value;
}

async function loadMysqlModule() {
  const moduleName = 'mysql2/promise';

  try {
    return await import(moduleName);
  } catch (error) {
    throw new Error('O driver mysql2 nao esta instalado. Rode "npm install" antes da migracao.', { cause: error });
  }
}

function parseImages(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function isSupabaseStorageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname.endsWith('.supabase.co')
      && url.pathname.includes('/storage/v1/object/public/');
  } catch {
    return false;
  }
}

function resolveExtension(url: URL, contentType: string) {
  const fromContentType = contentTypeExtensions[contentType.toLowerCase()];
  if (fromContentType) return fromContentType;

  const fromPath = path.extname(url.pathname).toLowerCase();
  return /^\.(avif|gif|jpe?g|png|webp)$/.test(fromPath) ? fromPath : '.bin';
}

async function downloadImage(source: string, outputDirectory: string) {
  const sourceUrl = new URL(source);
  const response = await fetch(sourceUrl, { redirect: 'follow' });

  if (!response.ok) {
    throw new Error(`Falha HTTP ${response.status} ao baixar ${source}`);
  }

  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!contentType.startsWith('image/')) {
    throw new Error(`Conteudo recebido nao e imagem: ${source}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Imagem vazia ou maior que 15 MB: ${source}`);
  }

  const filename = `${randomUUID()}${resolveExtension(sourceUrl, contentType)}`;
  await writeFile(path.join(outputDirectory, filename), buffer, { flag: 'wx' });
  return `/uploads/products/${filename}`;
}

async function main() {
  const mysql = await loadMysqlModule();
  const pool = mysql.createPool({
    host: readRequiredEnv('MARIADB_HOST'),
    port: Number(process.env.MARIADB_PORT || 3306),
    database: readRequiredEnv('MARIADB_DATABASE'),
    user: readRequiredEnv('MARIADB_USER'),
    password: readRequiredEnv('MARIADB_PASSWORD'),
    connectionLimit: 2,
    charset: 'utf8mb4',
  });
  const uploadsRoot = path.resolve(process.cwd(), process.env.STORE_UPLOADS_ROOT || path.join('storage', 'uploads'));
  const outputDirectory = path.join(uploadsRoot, 'products');

  try {
    const [rawRows] = await pool.query('SELECT id, nome, imagens FROM products ORDER BY nome');
    const rows = rawRows as Array<{ id: string; imagens: unknown; nome: string }>;
    const candidates = rows
      .map((row) => ({ ...row, parsedImages: parseImages(row.imagens) }))
      .filter((row) => row.parsedImages.some(isSupabaseStorageUrl));

    console.log(`Produtos com imagens no Supabase: ${candidates.length}`);

    if (!execute) {
      for (const product of candidates) {
        const count = product.parsedImages.filter(isSupabaseStorageUrl).length;
        console.log(`[DRY-RUN] ${product.id} - ${product.nome}: ${count} imagem(ns)`);
      }
      console.log('Nenhum arquivo ou registro foi alterado. Use --execute para migrar.');
      return;
    }

    await mkdir(outputDirectory, { recursive: true });
    let migratedProducts = 0;
    let migratedImages = 0;

    for (const product of candidates) {
      const migratedUrls: string[] = [];

      for (const imageUrl of product.parsedImages) {
        if (!isSupabaseStorageUrl(imageUrl)) {
          migratedUrls.push(imageUrl);
          continue;
        }

        migratedUrls.push(await downloadImage(imageUrl, outputDirectory));
        migratedImages += 1;
      }

      await pool.query(
        'UPDATE products SET imagens = ?, updated_at = NOW() WHERE id = ?',
        [JSON.stringify(migratedUrls), product.id],
      );
      migratedProducts += 1;
      console.log(`[OK] ${product.id} - ${product.nome}`);
    }

    console.log(`Migracao concluida: ${migratedImages} imagem(ns) em ${migratedProducts} produto(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Falha na migracao das imagens de produtos.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

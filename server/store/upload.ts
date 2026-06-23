import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage } from 'node:http';

type ParsedMultipartFile = {
  buffer: Buffer;
  filename: string;
};

function getBoundary(contentType: string) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  return match?.[1] || match?.[2] || null;
}

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export async function parseSingleMultipartFile(request: IncomingMessage): Promise<ParsedMultipartFile> {
  const contentType = request.headers['content-type'] || '';
  const boundary = getBoundary(contentType);

  if (!boundary) {
    throw new Error('Upload multipart invalido.');
  }

  const rawBody = await readRequestBody(request);
  const body = rawBody.toString('latin1');
  const parts = body.split(`--${boundary}`).slice(1, -1);

  for (const part of parts) {
    const [rawHeaders, rawValue] = part.split('\r\n\r\n');

    if (!rawHeaders || !rawValue) {
      continue;
    }

    if (!/name="file"/i.test(rawHeaders)) {
      continue;
    }

    const filenameMatch = /filename="([^"]+)"/i.exec(rawHeaders);
    const filename = filenameMatch?.[1] || `upload-${Date.now()}.bin`;
    const normalizedValue = rawValue.replace(/\r\n$/, '');
    return {
      filename,
      buffer: Buffer.from(normalizedValue, 'latin1'),
    };
  }

  throw new Error('Nenhum arquivo foi enviado.');
}

function getSafeExtension(filename: string) {
  const extension = path.extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return extension || '.bin';
}

export async function persistUploadedProductImage(rootDirectory: string, file: ParsedMultipartFile) {
  const relativeDirectory = path.join('products');
  const outputDirectory = path.join(rootDirectory, relativeDirectory);
  await mkdir(outputDirectory, { recursive: true });

  const finalName = `${randomUUID()}${getSafeExtension(file.filename)}`;
  const absolutePath = path.join(outputDirectory, finalName);
  await writeFile(absolutePath, file.buffer);

  return `/uploads/products/${finalName}`;
}

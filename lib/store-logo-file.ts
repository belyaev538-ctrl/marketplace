import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

export type SaveStoreLogoFromFileResult =
  | { ok: true; publicUrl: string }
  | { ok: false; error: string };

/**
 * Конвертирует изображение в WebP и сохраняет в public/uploads/stores/.
 * БД не трогает — только запись файла.
 */
export async function saveStoreLogoFromFile(
  storeId: string,
  file: Blob,
): Promise<SaveStoreLogoFromFileResult> {
  if (!(file instanceof Blob) || file.size === 0) {
    return { ok: false, error: "Файл не выбран" };
  }
  if (!ALLOWED.has(file.type)) {
    return { ok: false, error: "Допустимы только PNG, JPG или WebP" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Файл больше 2 МБ" };
  }

  let webpBuffer: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    webpBuffer = await sharp(input).rotate().webp({ quality: 88 }).toBuffer();
  } catch {
    return { ok: false, error: "Не удалось обработать изображение" };
  }

  const name = `store-${storeId}-${Date.now()}.webp`;
  const dir = path.join(process.cwd(), "public", "uploads", "stores");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), webpBuffer);

  return { ok: true, publicUrl: `/uploads/stores/${name}` };
}

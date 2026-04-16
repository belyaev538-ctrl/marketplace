import { prisma } from "@/lib/prisma";

/** Транслитерация кириллицы (рус.) в латиницу для URL. */
function transliterateRu(input: string): string {
  const lower = input.toLowerCase();
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
    і: "i",
    ї: "yi",
    є: "e",
    ґ: "g",
  };
  let out = "";
  for (const ch of lower) {
    if (map[ch] !== undefined) {
      out += map[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      out += ch;
    } else if (/[\s._/\\|,+&()[\]{}'"«»""—–-]/.test(ch) || ch === "№") {
      out += " ";
    }
    // прочие символы пропускаем
  }
  return out;
}

/** Базовый slug из названия (без проверки уникальности в БД). */
export function slugifyMarketplaceCategoryName(name: string): string {
  const base = transliterateRu(name.trim())
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base.length > 0 ? base : "category";
}

export type CreateUniqueMarketplaceCategorySlugOptions = {
  excludeCategoryId?: string;
};

/** Уникальный slug для marketplace-категории (глобально по таблице). */
export async function createUniqueMarketplaceCategorySlug(
  name: string,
  opts?: CreateUniqueMarketplaceCategorySlugOptions,
): Promise<string> {
  const base = slugifyMarketplaceCategoryName(name);
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? base : `${base}-${i}`;
    const taken = await prisma.marketplaceCategory.findFirst({
      where: {
        slug: candidate,
        ...(opts?.excludeCategoryId
          ? { NOT: { id: opts.excludeCategoryId } }
          : {}),
      },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now()}`;
}

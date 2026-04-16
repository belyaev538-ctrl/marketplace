/**
 * Заполнить HomeBanner данными из reference-layout (без полного prisma seed).
 * Запуск из корня: npm run db:seed:banners
 */
import { PrismaClient } from "@prisma/client";
import { REFERENCE_LAYOUT_HOME_BANNER_SLIDES } from "../lib/home-banners";

const prisma = new PrismaClient();

async function main() {
  await prisma.homeBanner.deleteMany({});
  await prisma.homeBanner.createMany({
    data: REFERENCE_LAYOUT_HOME_BANNER_SLIDES.map((s, i) => ({
      title: s.title,
      subtitle: s.subtitle,
      imageUrl: s.image,
      linkUrl: s.linkUrl,
      sortOrder: i,
      active: true,
    })),
  });
  console.log(
    `HomeBanner: загружено ${REFERENCE_LAYOUT_HOME_BANNER_SLIDES.length} слайдов из верстки.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

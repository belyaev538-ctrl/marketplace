import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { REFERENCE_LAYOUT_HOME_BANNER_SLIDES } from "../lib/home-banners";
import { createUniqueMarketplaceCategorySlug } from "../lib/marketplace-category-slug";
import { backfillProductSlugsFromNames } from "../lib/product-slug";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { password, role: "ADMIN" },
    create: {
      email: "admin@example.com",
      password,
      role: "ADMIN",
    },
  });

  const shopPassword = await bcrypt.hash("shop123", 12);
  const shopUser = await prisma.user.upsert({
    where: { email: "shop@example.com" },
    update: { password: shopPassword, role: "SHOP_OWNER" },
    create: {
      email: "shop@example.com",
      password: shopPassword,
      role: "SHOP_OWNER",
    },
  });

  let demoStore = await prisma.store.findUnique({ where: { slug: "demo-shop" } });
  if (!demoStore) {
    demoStore = await prisma.store.create({
      data: {
        name: "Демо магазин",
        slug: "demo-shop",
        xmlUrl: "https://example.com/feed.xml",
        fallbackUrl: "https://example.com",
        shortDescription: "Тестовый магазин",
        phone: "+79990000000",
        address: "г. Москва",
        website: "https://example.com",
      },
    });
  }

  await prisma.user.update({
    where: { id: shopUser.id },
    data: { storeId: demoStore.id },
  });

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

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });

  await prisma.categoryMapping.deleteMany();
  await prisma.marketplaceCategory.deleteMany();

  const createCategory = async (name: string, children: string[]) => {
    const parentSlug = await createUniqueMarketplaceCategorySlug(name);
    const parent = await prisma.marketplaceCategory.create({
      data: { name, slug: parentSlug },
    });

    for (const child of children) {
      const childSlug = await createUniqueMarketplaceCategorySlug(child);
      await prisma.marketplaceCategory.create({
        data: {
          name: child,
          slug: childSlug,
          parentId: parent.id,
        },
      });
    }
  };

  await createCategory("Продукты питания", [
    "Бакалея",
    "Мясо и птица",
    "Колбасные изделия",
    "Рыба и морепродукты",
    "Овощи и фрукты",
    "Молочные продукты",
    "Хлеб и выпечка",
    "Кондитерские изделия",
    "Замороженные продукты",
    "Соусы и приправы",
    "Напитки",
  ]);

  await createCategory("Напитки", [
    "Безалкогольные напитки",
    "Соки и воды",
    "Чай и кофе",
    "Алкогольные напитки",
    "Энергетики",
    "Смузи и коктейли",
  ]);

  await createCategory("Товары для дома", [
    "Посуда и кухонные принадлежности",
    "Текстиль",
    "Свечи и ароматы",
    "Хранение и органайзеры",
    "Декор и интерьер",
    "Клининг и уборка",
    "Стирка и уход за одеждой",
  ]);

  await createCategory("Хозяйственные товары", [
    "Бытовая химия",
    "Губки и салфетки",
    "Мусорные пакеты",
    "Средства для мытья посуды",
    "Освежители воздуха",
    "Инсектициды и средства от насекомых",
  ]);

  await createCategory("Строительство и ремонт", [
    "Лакокрасочные материалы",
    "Сухие смеси",
    "Крепеж",
    "Инструмент",
    "Сантехника",
    "Электрика",
    "Изоляция и герметики",
    "Обои и клеи",
  ]);

  await createCategory("Автотовары", [
    "Масла и технические жидкости",
    "Автохимия",
    "Фильтры",
    "Свечи зажигания и ремни",
    "Лампы и свет",
    "Аксессуары в салон",
    "Автокосметика",
    "Инструмент автомобильный",
  ]);

  await createCategory("Одежда и обувь", [
    "Женская одежда",
    "Мужская одежда",
    "Детская одежда",
    "Обувь женская",
    "Обувь мужская",
    "Обувь детская",
    "Нижнее белье",
    "Носки и чулочно-носочные изделия",
    "Аксессуары",
  ]);

  await createCategory("Электроника и техника", [
    "Смартфоны и гаджеты",
    "Аксессуары",
    "Бытовая техника",
    "Крупная техника",
    "Компьютеры и ноутбуки",
    "Комплектующие",
    "Телевизоры и аудио",
    "Умный дом",
  ]);

  await createCategory("Красота и здоровье", [
    "Косметика для лица",
    "Косметика для тела",
    "Парфюмерия",
    "Средства для бритья",
    "Зубные пасты и щетки",
    "Волосы",
    "Маникюр и педикюр",
    "Аптечка",
    "Витамины и БАДы",
  ]);

  await createCategory("Детские товары", [
    "Игрушки",
    "Детское питание",
    "Подгузники",
    "Коляски и автокресла",
    "Детская мебель",
    "Одежда для малышей",
    "Товары для кормления",
    "Книжки и раскраски",
  ]);

  await createCategory("Зоотовары", [
    "Корм для собак",
    "Корм для кошек",
    "Лакомства",
    "Аксессуары",
    "Лежанки и домики",
    "Игрушки",
    "Груминг",
    "Товары для грызунов и птиц",
    "Аквариумистика",
  ]);

  await createCategory("Мебель", [
    "Корпусная мебель",
    "Мягкая мебель",
    "Мебель для кухни",
    "Мебель для спальни",
    "Мебель для офиса",
    "Стеллажи и полки",
    "Мебель для ванной",
  ]);

  await createCategory("Спорт и отдых", [
    "Тренажеры и фитнес",
    "Спортивная одежда и обувь",
    "Велосипеды и самокаты",
    "Туризм",
    "Мячи и инвентарь",
    "Рыбалка и охота",
    "Зимние виды спорта",
  ]);

  await createCategory("Сад и огород", [
    "Семена и рассада",
    "Грунт и удобрения",
    "Садовый инструмент",
    "Полив",
    "Газонокосилки и триммеры",
    "Теплицы и парники",
    "Декор для сада",
  ]);

  await createCategory("Канцтовары и офис", [
    "Бумага и блокноты",
    "Ручки и карандаши",
    "Папки и файлы",
    "Дыроколы и степлеры",
    "Офисная техника",
    "Товары для школы",
    "Художественные принадлежности",
  ]);

  await createCategory("Подарки и сувениры", [
    "Открытки и конверты",
    "Упаковка",
    "Сувениры",
    "Подарочные наборы",
    "Игрушки ручной работы",
  ]);

  await createCategory("Книги", [
    "Художественная литература",
    "Детские книги",
    "Бизнес",
    "Учебная литература",
    "Кулинария",
    "Комиксы и манга",
    "Журналы",
  ]);

  await createCategory("Ювелирные изделия и часы", [
    "Серьги и кольца",
    "Цепочки и подвески",
    "Браслеты",
    "Часы",
    "Бижутерия",
  ]);

  await createCategory("Охота и рыбалка", [
    "Удочки и снасти",
    "Катушки и лески",
    "Приманки",
    "Охотничье снаряжение",
    "Камуфляж",
    "Оптика",
  ]);

  await createCategory("Музыка и творчество", [
    "Музыкальные инструменты",
    "Ноты и аксессуары",
    "Товары для рисования",
    "Лепка и рукоделие",
    "Наборы для вышивания",
  ]);

  const slugCount = await backfillProductSlugsFromNames();
  if (slugCount > 0) {
    console.log(`Product slugs backfilled from name: ${slugCount}`);
  }
}

main()
  .then(async () => {
    console.log("Seed completed");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

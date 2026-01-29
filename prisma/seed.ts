/**
 * Seed data for product catalogs
 * Два справочника: для заявок (request) и предложений (offer)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// === ДАННЫЕ ДЛЯ СПРАВОЧНИКА ЗАЯВОК ===
const requestCatalog = {
  metal: {
    name: "Металл",
    nomenclatures: {
      tube: { name: "Труба", details: ["159х6", "108х4", "89х3.5", "76х3", "57х3", "42х3", "32х3"] },
      beam: { name: "Балка", details: ["18М", "20К", "25Б", "30Ш", "35Б", "40Ш"] },
      channel: { name: "Швеллер", details: ["10П", "12П", "14П", "16П", "20П", "24П"] },
      rebar: { name: "Арматура", details: ["8 А500С", "10 А500С", "12 А500С", "14 А500С", "16 А500С", "20 А500С"] },
      sheet: { name: "Лист", details: ["2мм", "3мм", "4мм", "5мм", "6мм", "8мм", "10мм", "12мм"] },
      angle: { name: "Уголок", details: ["50х50", "63х63", "75х75", "90х90", "100х100", "125х125"] },
      profile: { name: "Профиль", details: ["60х40", "80х40", "100х50", "120х60", "140х80"] },
    },
  },
  construction: {
    name: "Конструкции",
    nomenclatures: {
      lstk: { name: "ЛСТК", details: ["Склад", "Ангар", "Каркас", "Ферма", "Навес"] },
      prefab: { name: "Быстровозводимое здание", details: ["Склад", "Ангар", "Цех", "Навес"] },
      modular: { name: "Модульное здание", details: ["Офис", "Бытовка", "КПП", "Столовая"] },
    },
  },
  materials: {
    name: "Материалы",
    nomenclatures: {
      sandwich: { name: "Сендвич-панель", details: ["Кровельная", "Стеновая", "50мм", "80мм", "100мм", "150мм"] },
      proflist: { name: "Профлист", details: ["С8", "С21", "НС35", "Н60", "Н75", "Н114"] },
      roofing: { name: "Кровля", details: ["Металлочерепица", "Фальц", "Профнастил"] },
      insulation: { name: "Утеплитель", details: ["50мм", "100мм", "150мм", "Минвата", "ППУ"] },
    },
  },
  equipment: {
    name: "Оборудование",
    nomenclatures: {
      crane: { name: "Кран", details: ["Мостовой", "Козловой", "Башенный", "5т", "10т", "20т"] },
      press: { name: "Пресс", details: ["Гидравлический", "Листогиб", "Вальцы"] },
      welding: { name: "Сварочное", details: ["MIG/MAG", "TIG", "Полуавтомат", "Инвертор"] },
    },
  },
};

// === ДАННЫЕ ДЛЯ СПРАВОЧНИКА ПРЕДЛОЖЕНИЙ ===
const offerCatalog = {
  metal: {
    name: "Металл",
    nomenclatures: {
      tube: { name: "Труба", details: ["б/у", "лежалая", "новая", "восстановленная", "некондиция"] },
      beam: { name: "Балка", details: ["б/у", "восстановленная", "новая", "лежалая"] },
      channel: { name: "Швеллер", details: ["б/у", "новый", "лежалый"] },
      rebar: { name: "Арматура", details: ["б/у", "новая", "остатки"] },
      sheet: { name: "Лист", details: ["б/у", "некондиция", "новый", "остатки"] },
      scrap: { name: "Металлолом", details: ["Чёрный", "Цветной", "Нержавейка", "Стружка"] },
    },
  },
  construction: {
    name: "Конструкции",
    nomenclatures: {
      lstk: { name: "ЛСТК", details: ["Каркас", "Ферма", "Колонна", "Ригель", "Прогон"] },
      modular: { name: "Модульное здание", details: ["Бытовка", "Офис", "КПП", "Склад", "Столовая"] },
      metalwork: { name: "Металлоконструкции", details: ["Каркас", "Ферма", "Колонна", "Балка"] },
    },
  },
  services: {
    name: "Услуги",
    nomenclatures: {
      production: { name: "Производство", details: ["ЛСТК", "Металлоконструкции", "Сендвич-панели", "Профлист"] },
      installation: { name: "Монтаж", details: ["Кровля", "Фасады", "Конструкции", "Ангары"] },
      design: { name: "Проектирование", details: ["КМ", "КМД", "АР", "Расчёт"] },
      delivery: { name: "Доставка", details: ["По России", "Самовывоз", "До объекта"] },
    },
  },
  materials: {
    name: "Материалы",
    nomenclatures: {
      sandwich: { name: "Сендвич-панель", details: ["б/у", "новая", "остатки", "некондиция"] },
      proflist: { name: "Профлист", details: ["б/у", "новый", "остатки", "некондиция"] },
    },
  },
};

async function seedRequestCatalog() {
  console.log("Seeding Request catalog...");
  let catOrder = 0;

  for (const [categoryCode, categoryData] of Object.entries(requestCatalog)) {
    const category = await prisma.requestCategory.upsert({
      where: { code: categoryCode },
      update: { name: categoryData.name, sortOrder: catOrder },
      create: { code: categoryCode, name: categoryData.name, sortOrder: catOrder },
    });

    console.log("  Category:", categoryData.name);
    let nomOrder = 0;

    for (const [nomCode, nomData] of Object.entries(categoryData.nomenclatures)) {
      const fullCode = "req_" + categoryCode + "_" + nomCode;

      const nomenclature = await prisma.requestNomenclature.upsert({
        where: { code: fullCode },
        update: { name: nomData.name, sortOrder: nomOrder },
        create: {
          code: fullCode,
          name: nomData.name,
          categoryId: category.id,
          sortOrder: nomOrder,
        },
      });

      console.log("    Nomenclature:", nomData.name);
      let detailOrder = 0;

      for (const detailName of nomData.details) {
        await prisma.requestDetail.upsert({
          where: {
            nomenclatureId_name: {
              nomenclatureId: nomenclature.id,
              name: detailName,
            },
          },
          update: { sortOrder: detailOrder },
          create: {
            name: detailName,
            nomenclatureId: nomenclature.id,
            sortOrder: detailOrder,
          },
        });
        detailOrder++;
      }
      nomOrder++;
    }
    catOrder++;
  }
}

async function seedOfferCatalog() {
  console.log("Seeding Offer catalog...");
  let catOrder = 0;

  for (const [categoryCode, categoryData] of Object.entries(offerCatalog)) {
    const category = await prisma.offerCategory.upsert({
      where: { code: categoryCode },
      update: { name: categoryData.name, sortOrder: catOrder },
      create: { code: categoryCode, name: categoryData.name, sortOrder: catOrder },
    });

    console.log("  Category:", categoryData.name);
    let nomOrder = 0;

    for (const [nomCode, nomData] of Object.entries(categoryData.nomenclatures)) {
      const fullCode = "offer_" + categoryCode + "_" + nomCode;

      const nomenclature = await prisma.offerNomenclature.upsert({
        where: { code: fullCode },
        update: { name: nomData.name, sortOrder: nomOrder },
        create: {
          code: fullCode,
          name: nomData.name,
          categoryId: category.id,
          sortOrder: nomOrder,
        },
      });

      console.log("    Nomenclature:", nomData.name);
      let detailOrder = 0;

      for (const detailName of nomData.details) {
        await prisma.offerDetail.upsert({
          where: {
            nomenclatureId_name: {
              nomenclatureId: nomenclature.id,
              name: detailName,
            },
          },
          update: { sortOrder: detailOrder },
          create: {
            name: detailName,
            nomenclatureId: nomenclature.id,
            sortOrder: detailOrder,
          },
        });
        detailOrder++;
      }
      nomOrder++;
    }
    catOrder++;
  }
}

// === КАТЕГОРИИ ОБОГАЩЕНИЯ ===
const enrichmentCategories = [
  {
    slug: "metal",
    name: "Металлопрокат",
    description: "Трубы, арматура, швеллер, балки, листовой прокат, уголок, профиль",
    sortOrder: 0,
    categoryPrompt: `## КАТЕГОРИЯ: МЕТАЛЛОПРОКАТ

### Подкатегории:
- Листовой прокат (лист, рулон, штрипс)
- Сортовой прокат (круг, квадрат, шестигранник)
- Фасонный прокат (уголок, швеллер, двутавр, балка)
- Трубный прокат (круглая, профильная, бесшовная)
- Арматура и сетка

### Номенклатура - извлекай по шаблону:
- "Балка Б1 20К1" → name: "Балка двутавровая", mark: "20К1", gost: "Б1"
- "Лист 10 09г2с" → name: "Лист горячекатаный", thickness: "10 мм", steel: "09Г2С"
- "Труба 159х6" → name: "Труба круглая", diameter: "159 мм", thickness: "6 мм"
- "Арматура 12 А500С" → name: "Арматура", diameter: "12 мм", class: "А500С"
- "Швеллер 16П" → name: "Швеллер", size: "16П"
- "Уголок 50х50х5" → name: "Уголок равнополочный", size: "50х50", thickness: "5 мм"

### Особенности:
- Состояние: "б/у", "новый", "лежалый", "восстановленный", "некондиция"
- Марки стали: 09Г2С, Ст3, 3СП, 10ХСНД
- ГОСТ: извлекай если указан`,
  },
  {
    slug: "construction",
    name: "Металлоконструкции",
    description: "Изготовление, проектирование, монтаж МК, ЛСТК, ангары, навесы",
    sortOrder: 1,
    categoryPrompt: `## КАТЕГОРИЯ: МЕТАЛЛОКОНСТРУКЦИИ

### Подкатегории:
- Изготовление МК (каркасы, фермы, колонны, балки)
- Проектирование (КМ, КМД, КЖ)
- Монтаж МК
- ЛСТК (лёгкие стальные тонкостенные конструкции)
- Строительство (ангары, склады, навесы)
- Услуги (резка, гибка, сварка, покраска)
- Поиск персонала (сварщики, монтажники)

### Номенклатура:
- "Ферма 18м" → name: "Ферма", span: "18 м"
- "Ангар 24х60" → name: "Ангар", width: "24 м", length: "60 м"
- "Колонна К1" → name: "Колонна", mark: "К1"
- "Навес 6х12" → name: "Навес", size: "6х12 м"

### Особенности:
- Типы работ: изготовление, монтаж, демонтаж, проектирование
- Сроки: "срочно", "под заказ"
- Объём: в тоннах или кв.метрах`,
  },
  {
    slug: "metalwork",
    name: "Металлообработка",
    description: "Резка, гибка, сварка, токарные работы, фрезеровка, покраска металла",
    sortOrder: 2,
    categoryPrompt: `## КАТЕГОРИЯ: МЕТАЛЛООБРАБОТКА

### Подкатегории:
- Резка металла (лазерная, плазменная, газовая, гильотина, ленточнопильная)
- Гибка (листогиб, вальцовка, профилегиб)
- Сварочные работы (MIG/MAG, TIG, ручная дуговая, аргонодуговая)
- Токарные работы
- Фрезерные работы
- Покраска и обработка (порошковая, грунтовка, оцинковка)

### Номенклатура:
- "Лазерная резка" → name: "Резка лазерная", type: "услуга"
- "Гибка листа 3мм" → name: "Гибка листа", thickness: "3 мм"
- "Сварочные работы аргон" → name: "Сварка аргонодуговая"
- "Токарные работы ЧПУ" → name: "Токарные работы", type: "ЧПУ"

### Особенности:
- Материал: сталь, нержавейка, алюминий, медь
- Толщина: важный параметр для резки/гибки
- Объём: партия, единичное, серийное
- Сроки: срочно, стандартные`,
  },
  {
    slug: "building",
    name: "Строительные материалы",
    description: "Кирпич, бетон, цемент, песок, щебень, утеплитель, сэндвич-панели",
    sortOrder: 3,
    categoryPrompt: `## КАТЕГОРИЯ: СТРОИТЕЛЬНЫЕ МАТЕРИАЛЫ

### Подкатегории:
- Бетон и ЖБИ (бетон, раствор, плиты, блоки, кольца)
- Кирпич и камень (кирпич, блоки, газобетон, пеноблок)
- Сыпучие материалы (песок, щебень, гравий, ПГС)
- Цемент и смеси (цемент, сухие смеси, штукатурка)
- Утеплители (минвата, пенопласт, ППУ, экструдированный)
- Кровельные материалы (профлист, металлочерепица, сэндвич-панели)
- Пиломатериалы (доска, брус, фанера, OSB)

### Номенклатура:
- "Бетон М300" → name: "Бетон", mark: "М300"
- "Кирпич М150" → name: "Кирпич", mark: "М150"
- "Песок речной" → name: "Песок", type: "речной"
- "Сэндвич-панель 100мм" → name: "Сэндвич-панель", thickness: "100 мм"

### Особенности:
- Единицы: куб.м, тонны, штуки, кв.м
- Доставка: важный параметр
- Марки и классы: М100, М150, М200, М300, М400`,
  },
];

async function seedEnrichmentCategories() {
  console.log("Seeding Enrichment categories...");

  for (const cat of enrichmentCategories) {
    await prisma.enrichmentCategory.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        categoryPrompt: cat.categoryPrompt,
        sortOrder: cat.sortOrder,
      },
      create: {
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        categoryPrompt: cat.categoryPrompt,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    });
    console.log("  Category:", cat.name);
  }

  // Привязываем существующие обогащённые сообщения к первой категории
  const metalCategory = await prisma.enrichmentCategory.findUnique({
    where: { slug: "metal" },
  });

  if (metalCategory) {
    const updated = await prisma.rawMessage.updateMany({
      where: {
        enrichedAt: { not: null },
        enrichmentCategoryId: null,
      },
      data: {
        enrichmentCategoryId: metalCategory.id,
      },
    });
    console.log(`  Linked ${updated.count} existing enriched messages to 'metal' category`);
  }
}

async function main() {
  console.log("Starting seed...\n");
  await seedRequestCatalog();
  console.log("");
  await seedOfferCatalog();
  console.log("");
  await seedEnrichmentCategories();
  console.log("\nSeed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

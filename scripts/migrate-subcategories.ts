/**
 * Скрипт миграции подкатегорий
 * Создаёт записи Subcategory из существующих enrichedData
 */

import { prisma } from "../src/lib/prisma";

function normalizeSubcategory(name: string): string {
  if (!name) return "прочее";
  let normalized = name.trim().toLowerCase();
  normalized = normalized.replace(/\s*[\d,.хx×]+\s*(мм|см|м|тн|кг|шт)?\.?\s*$/gi, "");
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized || "прочее";
}

async function migrate() {
  console.log("Starting subcategory migration...");

  // Получаем все обогащённые карточки
  const cards = await prisma.rawMessage.findMany({
    where: {
      enrichedAt: { not: null },
      enrichedData: { not: null },
      enrichmentCategoryId: { not: null },
    },
    select: {
      id: true,
      enrichedData: true,
      enrichmentCategoryId: true,
    },
  });

  console.log(`Found ${cards.length} enriched cards`);

  const subcategoryMap = new Map<string, { name: string; categoryId: string; count: number }>();

  // Собираем все подкатегории
  for (const card of cards) {
    try {
      const data = JSON.parse(card.enrichedData as string);
      const subcategoryName = data.subcategory || "Прочее";
      const categoryId = card.enrichmentCategoryId!;
      const normalized = normalizeSubcategory(subcategoryName);
      const key = `${categoryId}:${normalized}`;

      if (!subcategoryMap.has(key)) {
        subcategoryMap.set(key, {
          name: subcategoryName.trim(),
          categoryId,
          count: 1,
        });
      } else {
        subcategoryMap.get(key)!.count++;
      }
    } catch (e) {
      // Пропускаем карточки с невалидным JSON
    }
  }

  console.log(`Found ${subcategoryMap.size} unique subcategories`);

  // Создаём подкатегории
  let created = 0;
  let skipped = 0;

  for (const [key, { name, categoryId, count }] of subcategoryMap) {
    const normalized = key.split(":")[1];

    try {
      // Проверяем, существует ли уже
      const existing = await prisma.subcategory.findFirst({
        where: { categoryId, normalized },
      });

      if (existing) {
        // Обновляем счётчик
        await prisma.subcategory.update({
          where: { id: existing.id },
          data: { usageCount: count },
        });
        skipped++;
      } else {
        // Создаём новую
        await prisma.subcategory.create({
          data: {
            name,
            normalized,
            categoryId,
            usageCount: count,
          },
        });
        created++;
        console.log(`Created: "${name}" (${normalized}) - ${count} cards`);
      }
    } catch (e) {
      console.error(`Error creating subcategory "${name}":`, e);
    }
  }

  console.log(`\nMigration complete!`);
  console.log(`Created: ${created}`);
  console.log(`Skipped (already exist): ${skipped}`);

  await prisma.$disconnect();
}

migrate().catch(console.error);

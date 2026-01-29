/**
 * Обновляет enrichedData карточек, добавляя subcategoryId
 * Связывает существующие subcategory с записями Subcategory
 */

import { prisma } from "../src/lib/prisma";

function normalizeSubcategory(name: string): string {
  if (!name) return "прочее";
  let normalized = name.trim().toLowerCase();
  normalized = normalized.replace(/\s*[\d,.хx×]+\s*(мм|см|м|тн|кг|шт)?\.?\s*$/gi, "");
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized || "прочее";
}

async function updateCards() {
  console.log("Updating enrichedData with subcategoryId...");

  // Получаем все подкатегории
  const subcategories = await prisma.subcategory.findMany({
    where: { isActive: true, mergedIntoId: null },
    select: { id: true, categoryId: true, normalized: true },
  });

  // Создаём карту для быстрого поиска
  const subcatMap = new Map<string, string>();
  for (const sub of subcategories) {
    subcatMap.set(`${sub.categoryId}:${sub.normalized}`, sub.id);
  }

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

  console.log(`Found ${cards.length} cards to update`);

  let updated = 0;
  let skipped = 0;

  for (const card of cards) {
    try {
      const data = JSON.parse(card.enrichedData as string);

      // Если уже есть subcategoryId, пропускаем
      if (data.subcategoryId) {
        skipped++;
        continue;
      }

      const subcategoryName = data.subcategory || "Прочее";
      const normalized = normalizeSubcategory(subcategoryName);
      const key = `${card.enrichmentCategoryId}:${normalized}`;

      const subcategoryId = subcatMap.get(key);

      if (subcategoryId) {
        // Добавляем subcategoryId в enrichedData
        data.subcategoryId = subcategoryId;

        await prisma.rawMessage.update({
          where: { id: card.id },
          data: { enrichedData: JSON.stringify(data) },
        });

        updated++;
      } else {
        console.log(`No subcategory found for: "${subcategoryName}" (${normalized}) in category ${card.enrichmentCategoryId}`);
        skipped++;
      }
    } catch (e) {
      console.error(`Error updating card ${card.id}:`, e);
      skipped++;
    }
  }

  console.log(`\nUpdate complete!`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);

  await prisma.$disconnect();
}

updateCards().catch(console.error);

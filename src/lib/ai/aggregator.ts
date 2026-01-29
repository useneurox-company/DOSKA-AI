/**
 * Request Aggregator
 * Объединяет связанные сообщения от одного пользователя в заявки
 */

import { prisma } from "@/lib/prisma";
import { RawMessage } from "@prisma/client";
import { AnalysisResult } from "./openrouter";

// Окно времени для группировки сообщений (60 минут)
const AGGREGATION_WINDOW_MS = 60 * 60 * 1000;

// Слишком общие термины для номенклатуры - требуют модерации
const GENERIC_NOMENCLATURE_TERMS = [
  "изделие", "продукт", "товар", "материал", "металл",
  "прокат", "конструкция", "элемент", "деталь", "заготовка"
];

/**
 * Проверить, нужна ли модерация для заявки
 */
function checkNeedsModeration(analysis: AnalysisResult): boolean {
  // 1. Низкая уверенность AI
  if (analysis.confidence < 0.7) {
    console.log(`[Aggregator] needsModeration: confidence ${analysis.confidence} < 0.7`);
    return true;
  }

  // 2. Слишком общая номенклатура
  if (analysis.nomenclature) {
    const lowerNom = analysis.nomenclature.toLowerCase();
    const isGeneric = GENERIC_NOMENCLATURE_TERMS.some(term => lowerNom.includes(term));
    if (isGeneric) {
      console.log(`[Aggregator] needsModeration: generic nomenclature "${analysis.nomenclature}"`);
      return true;
    }
  }

  // 3. Номенклатура не определена
  if (!analysis.nomenclature) {
    console.log(`[Aggregator] needsModeration: no nomenclature`);
    return true;
  }

  return false;
}

/**
 * Агрегировать сообщение в заявку
 * Если есть существующая заявка от этого пользователя за последние 10 минут - добавляем к ней
 * Иначе создаём новую заявку
 */
export async function aggregateToRequest(
  message: RawMessage,
  analysis: AnalysisResult
): Promise<string | null> {
  // Агрегируем только request и offer
  if (analysis.messageType !== "request" && analysis.messageType !== "offer") {
    return null;
  }

  const timeWindow = new Date(message.date.getTime() - AGGREGATION_WINDOW_MS);

  // Ищем существующую заявку от этого пользователя
  // Группируем по: sourceId + (senderId ИЛИ username) + type
  // НЕ требуем совпадение категории - один пользователь может писать о разном в рамках одной заявки
  const existingRequest = await prisma.request.findFirst({
    where: {
      sourceId: message.sourceId,
      type: analysis.messageType,
      lastMessageAt: { gte: timeWindow },
      // Ищем по senderId или по username (если senderId null)
      OR: [
        { senderId: message.senderId },
        ...(message.senderUsername ? [{ contactUsername: message.senderUsername }] : []),
      ],
    },
    orderBy: { lastMessageAt: "desc" },
  });

  let requestId: string;

  if (existingRequest) {
    // Добавляем сообщение к существующей заявке
    console.log(`[Aggregator] Добавляем к заявке ${existingRequest.id}`);

    await prisma.request.update({
      where: { id: existingRequest.id },
      data: {
        lastMessageAt: message.date,
        // Обновляем данные если новые лучше (не null)
        material: analysis.material || existingRequest.material,
        quantity: mergeQuantity(existingRequest.quantity, analysis.quantity),
        price: analysis.price ?? existingRequest.price,
        priceUnit: analysis.priceUnit || existingRequest.priceUnit,
        city: analysis.city || existingRequest.city,
        contactPhone: analysis.phone || existingRequest.contactPhone,
        // Обновляем номенклатуру если появилась
        nomenclature: analysis.nomenclature || existingRequest.nomenclature,
        category: analysis.productCategory || existingRequest.category,
      },
    });

    // Связываем сообщение с заявкой
    await prisma.rawMessage.update({
      where: { id: message.id },
      data: { requestId: existingRequest.id },
    });

    requestId = existingRequest.id;
  } else {
    // Создаём новую заявку
    const needsModeration = checkNeedsModeration(analysis);
    console.log(`[Aggregator] Создаём новую заявку для ${message.senderId}, needsModeration: ${needsModeration}`);

    const request = await prisma.request.create({
      data: {
        type: analysis.messageType,
        category: analysis.productCategory,
        nomenclature: analysis.nomenclature,
        material: analysis.material,
        quantity: analysis.quantity,
        price: analysis.price,
        priceUnit: analysis.priceUnit,
        city: analysis.city,
        contactName: message.senderName,
        contactUsername: message.senderUsername,
        contactPhone: analysis.phone || message.senderPhone,
        senderId: message.senderId,
        sourceId: message.sourceId,
        firstMessageAt: message.date,
        lastMessageAt: message.date,
        // Флаги модерации
        needsModeration,
        aiConfidence: analysis.confidence,
      },
    });

    // Связываем сообщение с заявкой
    await prisma.rawMessage.update({
      where: { id: message.id },
      data: { requestId: request.id },
    });

    requestId = request.id;
  }

  // Второй проход AI убран - первичный анализ должен быть достаточным
  // refineNomenclature портил результаты, выдумывая номенклатуру

  return requestId;
}

/**
 * Объединить количества из разных сообщений
 */
function mergeQuantity(
  existing: string | null,
  newQuantity: string | null
): string | null {
  if (!existing) return newQuantity;
  if (!newQuantity) return existing;
  // Если оба есть - объединяем через запятую (если разные)
  if (existing.includes(newQuantity) || newQuantity.includes(existing)) {
    return existing.length > newQuantity.length ? existing : newQuantity;
  }
  return `${existing}, ${newQuantity}`;
}

/**
 * Получить статистику по заявкам
 */
export async function getRequestStats() {
  const [total, byType, byStatus, byCategory] = await Promise.all([
    prisma.request.count(),
    prisma.request.groupBy({
      by: ["type"],
      _count: true,
    }),
    prisma.request.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.request.groupBy({
      by: ["category"],
      _count: true,
      where: { category: { not: null } },
    }),
  ]);

  return {
    total,
    byType: Object.fromEntries(byType.map((t) => [t.type, t._count])),
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    byCategory: Object.fromEntries(
      byCategory.map((c) => [c.category || "unknown", c._count])
    ),
  };
}

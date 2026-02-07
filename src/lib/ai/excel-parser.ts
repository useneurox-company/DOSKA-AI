/**
 * Excel Parser
 * Парсинг Excel файлов (xlsx/xls) для извлечения позиций заявок
 */

import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

export interface ExcelItem {
  rowNumber: number;
  nomenclature?: string;
  quantity?: number;
  unit?: string;
  price?: number;
  size?: string;
  grade?: string;
  rawData: Record<string, unknown>;
}

// Маппинг заголовков на поля (ключевые слова → поле)
const COLUMN_MAPPINGS: Record<string, keyof ExcelItem> = {
  // Номенклатура
  наименование: "nomenclature",
  название: "nomenclature",
  номенклатура: "nomenclature",
  товар: "nomenclature",
  продукция: "nomenclature",
  материал: "nomenclature",
  позиция: "nomenclature",

  // Количество
  количество: "quantity",
  "кол-во": "quantity",
  "кол.": "quantity",
  шт: "quantity",
  объем: "quantity",
  вес: "quantity",
  тонн: "quantity",

  // Единица измерения
  "ед.изм": "unit",
  "ед. изм.": "unit",
  "ед. изм": "unit",
  единица: "unit",
  "е.и.": "unit",

  // Цена
  цена: "price",
  стоимость: "price",
  руб: "price",
  price: "price",

  // Размер
  размер: "size",
  габарит: "size",
  сечение: "size",
  диаметр: "size",
  толщина: "size",
  длина: "size",

  // Марка стали
  марка: "grade",
  сталь: "grade",
  гост: "grade",
};

/**
 * Определить маппинг колонок по заголовкам
 */
function detectColumnMapping(
  headers: string[]
): Map<number, keyof ExcelItem> {
  const mapping = new Map<number, keyof ExcelItem>();

  headers.forEach((header, index) => {
    if (!header) return;
    const lowerHeader = header.toLowerCase().trim();

    for (const [keyword, field] of Object.entries(COLUMN_MAPPINGS)) {
      if (lowerHeader.includes(keyword)) {
        // Не перезаписываем если уже есть маппинг на это поле
        const existingFields = [...mapping.values()];
        if (!existingFields.includes(field)) {
          mapping.set(index, field);
        }
        break;
      }
    }
  });

  // Если не нашли номенклатуру - берём первую непустую текстовую колонку
  if (![...mapping.values()].includes("nomenclature")) {
    const firstTextCol = headers.findIndex(
      (h) => h && !h.match(/^\d+$/) && h.length > 2
    );
    if (firstTextCol >= 0) {
      mapping.set(firstTextCol, "nomenclature");
    }
  }

  return mapping;
}

/**
 * Извлечь марку стали из текста
 */
function extractGrade(text: string): string | undefined {
  const gradePatterns = [
    /\b(09[Гг]2[Сс])\b/i,
    /\b([Сс][Тт]3)[спкп]?\b/i,
    /\b(3[сС][пП]|3[пП][сС])\b/i,
    /\b(S235|S275|S355)[A-Z]*\b/i,
    /\b([АаA]500|[АаA]400|[АаA]240)[СВсв]?\b/i,
    /\b(20|45|40[Хх]|30[Хх][Гг][Сс][Аа]|65[Гг]|12[Хх]18[Нн]10[Тт])\b/i,
  ];

  for (const pattern of gradePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  return undefined;
}

/**
 * Парсинг одной строки Excel
 */
function parseRow(
  row: unknown[],
  columnMap: Map<number, keyof ExcelItem>,
  headers: string[],
  rowNumber: number
): ExcelItem {
  const item: ExcelItem = {
    rowNumber,
    rawData: {},
  };

  // Сохраняем все данные строки
  headers.forEach((header, index) => {
    if (row[index] !== undefined && row[index] !== "") {
      item.rawData[header] = row[index];
    }
  });

  // Маппим на поля
  columnMap.forEach((field, colIndex) => {
    const value = row[colIndex];
    if (value === undefined || value === "") return;

    switch (field) {
      case "nomenclature":
        item.nomenclature = String(value).trim();
        // Пытаемся извлечь размер из номенклатуры
        const sizeMatch = String(value).match(
          /(\d+[xх×]\d+(?:[xх×]\d+)?|\d+\s*мм|[ФфDd]\s*\d+)/i
        );
        if (sizeMatch && !item.size) {
          item.size = sizeMatch[1];
        }
        // Извлекаем марку из номенклатуры если не найдена
        if (!item.grade) {
          item.grade = extractGrade(String(value));
        }
        break;

      case "quantity":
        const numStr = String(value).replace(/[^\d.,]/g, "").replace(",", ".");
        item.quantity = parseFloat(numStr);
        if (isNaN(item.quantity)) item.quantity = undefined;
        break;

      case "price":
        const priceStr = String(value)
          .replace(/[^\d.,]/g, "")
          .replace(",", ".");
        item.price = parseFloat(priceStr);
        if (isNaN(item.price)) item.price = undefined;
        break;

      case "unit":
        item.unit = String(value).trim();
        break;

      case "size":
        item.size = String(value).trim();
        break;

      case "grade":
        item.grade = extractGrade(String(value)) || String(value).trim();
        break;
    }
  });

  return item;
}

/**
 * Парсинг Excel/CSV из Buffer (универсальная функция)
 */
export function parseExcelBuffer(buffer: Buffer): ExcelItem[] {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const items: ExcelItem[] = [];

    // Обрабатываем первый лист
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      console.error("[ExcelParser] Нет листов в файле");
      return [];
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: "",
    });

    if (jsonData.length < 2) {
      console.log("[ExcelParser] Мало данных в файле (< 2 строк)");
      return [];
    }

    // Первая строка - заголовки
    const headers = (jsonData[0] as string[]).map((h) =>
      h ? String(h).toLowerCase().trim() : ""
    );

    // Определяем маппинг колонок
    const columnMap = detectColumnMapping(headers);
    console.log(
      `[ExcelParser] Найдено колонок: ${columnMap.size}`,
      Object.fromEntries(columnMap)
    );

    // Парсим строки данных
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as unknown[];

      // Пропускаем пустые строки
      if (row.every((cell) => !cell || String(cell).trim() === "")) {
        continue;
      }

      const item = parseRow(row, columnMap, headers, i + 1);

      // Валидация - должна быть хотя бы номенклатура
      if (item.nomenclature && item.nomenclature.length > 2) {
        items.push(item);
      }
    }

    console.log(`[ExcelParser] Извлечено позиций: ${items.length}`);
    return items;
  } catch (error) {
    console.error("[ExcelParser] Ошибка парсинга:", error);
    return [];
  }
}

/**
 * Парсинг Excel файла с диска (обёртка над parseExcelBuffer)
 */
export function parseExcelFile(filePath: string): ExcelItem[] {
  const fullPath = filePath.startsWith("/")
    ? path.join(process.cwd(), "public", filePath)
    : filePath;

  if (!fs.existsSync(fullPath)) {
    console.error(`[ExcelParser] Файл не найден: ${fullPath}`);
    return [];
  }

  const buffer = fs.readFileSync(fullPath);
  return parseExcelBuffer(buffer);
}

/**
 * Определить тип заявки по контексту Excel
 */
export function determineExcelRequestType(
  text: string | null,
  fileName: string | null
): "request" | "offer" {
  // Проверяем текст (caption) сообщения
  if (text) {
    const lowerText = text.toLowerCase();
    if (
      lowerText.includes("купл") ||
      lowerText.includes("нужн") ||
      lowerText.includes("заявк") ||
      lowerText.includes("требу")
    ) {
      return "request";
    }
    if (
      lowerText.includes("прода") ||
      lowerText.includes("наличи") ||
      lowerText.includes("предлаг") ||
      lowerText.includes("прайс")
    ) {
      return "offer";
    }
  }

  // Проверяем имя файла
  if (fileName) {
    const lowerName = fileName.toLowerCase();
    if (
      lowerName.includes("заявк") ||
      lowerName.includes("потребност") ||
      lowerName.includes("запрос")
    ) {
      return "request";
    }
    if (
      lowerName.includes("прайс") ||
      lowerName.includes("наличи") ||
      lowerName.includes("склад") ||
      lowerName.includes("остат")
    ) {
      return "offer";
    }
  }

  // По умолчанию - покупка (обычно присылают заявки)
  return "request";
}

/**
 * Сводка номенклатуры из Excel для поля nomenclature
 */
export function summarizeNomenclature(items: ExcelItem[]): string {
  const unique = [
    ...new Set(items.map((i) => i.nomenclature).filter(Boolean)),
  ] as string[];

  if (unique.length === 0) {
    return "Позиции из Excel";
  }

  if (unique.length <= 3) {
    return unique.join(", ");
  }

  return `${unique.slice(0, 3).join(", ")} и ещё ${unique.length - 3} поз.`;
}

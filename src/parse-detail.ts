import * as cheerio from "cheerio";
import type { ListingDetail, StructureKind } from "./types.js";

export type ParsedDetail = ListingDetail;

const SOUND_KEYWORDS = [
  "防音",
  "遮音",
  "二重床",
  "ダブルフロア",
  "サウンドプルーフ",
  "音漏れ",
] as const;

export function classifyStructure(raw: string | null): StructureKind {
  if (!raw) return "unknown";
  const t = raw.replace(/\s/g, "");
  if (/鉄筋|RC/i.test(t)) return "rc";
  if (/軽量鉄骨/.test(t)) return "light_steel";
  if (/鉄骨/.test(t)) return "steel";
  if (/木造/.test(t)) return "other";
  return "other";
}

function parseAreaSqm(text: string | null): number | null {
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/([\d.]+)\s*m/i);
  if (!m) return null;
  const n = parseFloat(m[1]!);
  return Number.isFinite(n) ? n : null;
}

function readTableFields($: cheerio.CheerioAPI): Map<string, string> {
  const map = new Map<string, string>();
  $("table.data_table tr").each((_, tr) => {
    $(tr)
      .find("th")
      .each((__, th) => {
        const label = $(th).text().replace(/\s+/g, "");
        const td = $(th).next("td");
        if (!td.length) return;
        const val = td.text().replace(/\s+/g, " ").trim();
        if (label && val) map.set(label, val);
      });
  });
  return map;
}

function propertyTableText(
  $: cheerio.CheerioAPI,
  title: string,
): string | null {
  let found: string | null = null;
  $("table.property_view_table tr").each((_, tr) => {
    $(tr)
      .find("th.property_view_table-title")
      .each((__, th) => {
        if ($(th).text().trim() !== title) return;
        const td = $(th).next("td.property_view_table-body");
        if (td.length) found = td.text().replace(/\s+/g, " ").trim();
      });
  });
  return found;
}

function propertyTableAccess($: cheerio.CheerioAPI): string[] {
  const lines: string[] = [];
  $("table.property_view_table tr").each((_, tr) => {
    const title = $(tr).find("th.property_view_table-title").first().text().trim();
    if (title !== "駅徒歩") return;
    $(tr)
      .find(".property_view_table-read")
      .each((__, el) => {
        const t = $(el).text().replace(/\s+/g, " ").trim();
        if (t) lines.push(t);
      });
  });
  return lines;
}

function findSoundKeywords(text: string): string[] {
  const hits: string[] = [];
  for (const kw of SOUND_KEYWORDS) {
    if (text.includes(kw)) hits.push(kw);
  }
  return hits;
}

export function parseSuumoDetailHtml(html: string): ParsedDetail {
  const $ = cheerio.load(html);
  const propertyName =
    $("h1.section_h1-header-title").first().text().replace(/\s+/g, " ").trim() ||
    "";

  const table = readTableFields($);
  const structureRaw = table.get("構造") ?? null;
  const structureKind = classifyStructure(structureRaw);

  const areaFromTable = propertyTableText($, "専有面積");
  const areaSqm = parseAreaSqm(areaFromTable);

  const stationAccess = propertyTableAccess($);
  const equipmentRaw = $("#bkdt-option li").first().text();
  const equipmentTags = equipmentRaw
    .split(/[、,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const appealTexts = $(".detail_appeal_content-text")
    .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);

  const blob = [
    propertyName,
    structureRaw ?? "",
    equipmentRaw,
    appealTexts.join(" "),
    $("body").text(),
  ].join("\n");

  const soundKeywords = findSoundKeywords(blob);
  const isLeoPalace = /レオパレス/i.test(propertyName) || /レオパレス/i.test(blob);

  const cancellationReview = true;

  return {
    propertyName,
    structureRaw,
    structureKind,
    areaSqm,
    stationAccess,
    equipmentTags,
    appealTexts,
    soundKeywords,
    isLeoPalace,
    cancellationReview,
  };
}

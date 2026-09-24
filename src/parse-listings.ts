import * as cheerio from "cheerio";
import { config } from "./config.js";
import {
  areaSqmFromListing,
  isAllowedMadori,
} from "./listing-requirements.js";
import { parseYen, totalRentYen } from "./money.js";

export type SuumoListing = {
  /** SUUMO 物件コード（checkbox / clipkey） */
  suumoId: string;
  /** 部屋詳細 URL（絶対パス） */
  detailUrl: string;
  buildingTitle: string;
  buildingKind: string;
  address: string;
  accessLines: string[];
  floor: string;
  rentYen: number | null;
  adminYen: number | null;
  totalYen: number | null;
  madori: string;
  areaText: string;
};

function absUrl(href: string): string {
  if (href.startsWith("http")) return href;
  return `https://suumo.jp${href.startsWith("/") ? "" : "/"}${href}`;
}

function textOf($: cheerio.CheerioAPI, el: unknown): string {
  if (!el) return "";
  return $(el as never).text().replace(/\s+/g, " ").trim();
}

/** 一覧 HTML（建物ごと表示）から部屋行を抽出 */
export function parseSuumoListHtml(html: string): SuumoListing[] {
  const $ = cheerio.load(html);
  const out: SuumoListing[] = [];

  $("div.cassetteitem").each((_, cassette) => {
    const $c = $(cassette);
    const buildingTitle = textOf($, $c.find(".cassetteitem_content-title").get(0));
    const buildingKind = textOf($, $c.find(".cassetteitem_content-label").get(0));
    const address = textOf($, $c.find(".cassetteitem_detail-col1").get(0));
    const accessLines = $c
      .find(".cassetteitem_detail-col2 .cassetteitem_detail-text")
      .map((__, el) => textOf($, el))
      .get()
      .filter(Boolean);

    $c.find("tr.js-cassette_link").each((__, row) => {
      const $row = $(row);
      const suumoId =
        $row.find("input.js-clipkey").attr("value") ??
        $row.find("input.js-single_checkbox").attr("value") ??
        "";
      const href = $row.find("a.js-cassette_link_href").attr("href") ?? "";
      const rentText = textOf($, $row.find(".cassetteitem_price--rent").get(0));
      const adminText = textOf(
        $,
        $row.find(".cassetteitem_price--administration").get(0),
      );
      const rentYen = parseYen(rentText);
      const adminYen = parseYen(adminText);
      const madori = textOf($, $row.find(".cassetteitem_madori").get(0));
      const areaText = textOf($, $row.find(".cassetteitem_menseki").get(0));
      const floor = textOf($, $row.find("td").eq(2).get(0));

      if (!suumoId || !href) return;

      out.push({
        suumoId,
        detailUrl: absUrl(href),
        buildingTitle,
        buildingKind,
        address,
        accessLines,
        floor,
        rentYen,
        adminYen,
        totalYen: totalRentYen(rentYen, adminYen),
        madori,
        areaText,
      });
    });
  });

  return out;
}

/** サイト表示の掲載総数（paginate_set-hit） */
export function parseResultCount(html: string): number | null {
  const $ = cheerio.load(html);
  const text = $(".paginate_set-hit").first().text().replace(/\s/g, "");
  const m = text.match(/^([\d,]+)件/);
  if (!m) return null;
  return Number.parseInt(m[1]!.replace(/,/g, ""), 10);
}

/** 一覧段階の要件（PoC 再確認用） */
export function filterListingsForMvp(
  listings: SuumoListing[],
  opts: {
    maxTotalYen?: number;
    minAreaSqm?: number;
  } = {},
): SuumoListing[] {
  const maxTotalYen = opts.maxTotalYen ?? config.rentMaxTotal;
  const minAreaSqm = opts.minAreaSqm ?? config.minAreaSqm;
  return listings.filter((l) => {
    if (!isAllowedMadori(l.madori)) return false;
    if (l.totalYen == null) return false;
    if (l.totalYen > maxTotalYen) return false;
    const area = areaSqmFromListing(l.areaText);
    if (area != null && area < minAreaSqm) return false;
    return true;
  });
}

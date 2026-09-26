import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MonitorState } from "./types.js";

function normalizeInquiredBc(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) out.push(item.trim());
  }
  return [...new Set(out)].sort();
}

function parseMonitorState(parsed: unknown): MonitorState {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("state.json の形式が不正です");
  }
  const p = parsed as {
    version?: number;
    updatedAt?: string;
    listingIds?: unknown;
    inquiredBc?: unknown;
  };
  if (!Array.isArray(p.listingIds)) {
    throw new Error("state.json の listingIds が不正です");
  }
  const listingIds = p.listingIds.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  const version = p.version === 2 ? 2 : p.version === 1 ? 2 : null;
  if (version == null && p.version != null) {
    throw new Error(`未対応の state version: ${p.version}`);
  }
  return {
    version: 2,
    updatedAt:
      typeof p.updatedAt === "string" ? p.updatedAt : new Date().toISOString(),
    listingIds,
    inquiredBc: normalizeInquiredBc(p.inquiredBc),
  };
}

export async function loadState(statePath: string): Promise<MonitorState | null> {
  try {
    const raw = await readFile(statePath, "utf8");
    return parseMonitorState(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function saveState(
  statePath: string,
  listingIds: string[],
  inquiredBc: string[] = [],
): Promise<void> {
  await mkdir(path.dirname(statePath), { recursive: true });
  const state: MonitorState = {
    version: 2,
    updatedAt: new Date().toISOString(),
    listingIds: [...listingIds].sort(),
    inquiredBc: [...new Set(inquiredBc)].sort(),
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function diffListingIds(
  previous: Set<string>,
  current: string[],
): string[] {
  return current.filter((id) => !previous.has(id));
}

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MonitorState } from "./types.js";

export async function loadState(statePath: string): Promise<MonitorState | null> {
  try {
    const raw = await readFile(statePath, "utf8");
    const parsed = JSON.parse(raw) as MonitorState;
    if (parsed.version !== 1 || !Array.isArray(parsed.listingIds)) {
      throw new Error("state.json の形式が不正です");
    }
    return parsed;
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
): Promise<void> {
  await mkdir(path.dirname(statePath), { recursive: true });
  const state: MonitorState = {
    version: 1,
    updatedAt: new Date().toISOString(),
    listingIds: [...listingIds].sort(),
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function diffListingIds(
  previous: Set<string>,
  current: string[],
): string[] {
  return current.filter((id) => !previous.has(id));
}

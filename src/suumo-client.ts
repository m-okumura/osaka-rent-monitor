import { DEFAULT_USER_AGENT } from "./suumo-urls.js";

export async function fetchSuumoHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ja,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`SUUMO fetch failed: ${res.status} ${res.statusText} (${url})`);
  }
  return res.text();
}

import { extractSuumoBcFromText } from "./suumo-codes.js";

type GmailMessageList = {
  messages?: { id: string }[];
  nextPageToken?: string;
};

type GmailMessagePart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePart[];
};

type GmailMessage = {
  id: string;
  snippet?: string;
  payload?: GmailMessagePart;
};

function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
}

function collectTextFromPart(part: GmailMessagePart, chunks: string[]): void {
  if (part.body?.data) {
    chunks.push(decodeBase64Url(part.body.data));
  }
  for (const child of part.parts ?? []) {
    collectTextFromPart(child, chunks);
  }
}

function messageText(msg: GmailMessage): string {
  const chunks: string[] = [];
  if (msg.snippet) chunks.push(msg.snippet);
  if (msg.payload) collectTextFromPart(msg.payload, chunks);
  return chunks.join("\n");
}

async function fetchAccessToken(options: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: options.clientId,
      client_secret: options.clientSecret,
      refresh_token: options.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gmail OAuth トークン取得失敗 (${res.status}): ${body}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("Gmail OAuth 応答に access_token がありません");
  }
  return json.access_token;
}

async function gmailGet<T>(
  accessToken: string,
  path: string,
): Promise<T> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gmail API ${path} (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

export type FetchGmailInquiredOptions = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  lookbackDays: number;
  /** 1 run あたりの最大メッセージ数（本文 GET） */
  maxMessages: number;
  searchExtra?: string;
};

/** 送信済みメールから SUUMO 部屋コードを収集 */
export async function fetchInquiredBcFromGmailSent(
  options: FetchGmailInquiredOptions,
): Promise<Set<string>> {
  const accessToken = await fetchAccessToken({
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    refreshToken: options.refreshToken,
  });

  const q = [
    "in:sent",
    `(suumo OR suumo.jp)`,
    `newer_than:${options.lookbackDays}d`,
    options.searchExtra?.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < options.maxMessages) {
    const params = new URLSearchParams({
      q,
      maxResults: String(Math.min(100, options.maxMessages - ids.length)),
    });
    if (pageToken) params.set("pageToken", pageToken);
    const list = await gmailGet<GmailMessageList>(
      accessToken,
      `/messages?${params}`,
    );
    for (const m of list.messages ?? []) {
      ids.push(m.id);
      if (ids.length >= options.maxMessages) break;
    }
    pageToken = list.nextPageToken;
    if (!pageToken || (list.messages?.length ?? 0) === 0) break;
  }

  const codes = new Set<string>();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!;
    const msg = await gmailGet<GmailMessage>(
      accessToken,
      `/messages/${id}?format=full`,
    );
    const text = messageText(msg);
    for (const c of extractSuumoBcFromText(text)) codes.add(c);
    if (i > 0 && i % 20 === 0) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(
    `Gmail 送信済み: ${ids.length} 通解析 → 問合済みコード ${codes.size} 件`,
  );
  return codes;
}

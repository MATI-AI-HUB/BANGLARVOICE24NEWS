/**
 * Banglar Voice — Telegram editorial control plane.
 *
 * Connects a Telegram bot (Bot API, long-polling) and turns the channel /
 * group into the editorial command center. Editors send commands; the
 * controller parses them and calls back into the pipeline:
 *
 *   /publish <id>   → approve + publish + broadcast now
 *   /approve <id>   → mark approved (goes to website queue)
 *   /reject <id>    → reject (remove from queue)
 *   /rewrite <id>   → force a rewrite of a queued item
 *   /media  <id>    → re-source CC0 media for a queued item
 *   /status         → queue summary (pending / approved / published counts)
 *   /sources        → list the RSS sources the collector is watching
 *   /pause          → pause the pipeline loop
 *   /resume         → resume the pipeline loop
 *   /help           → command list
 *
 * The module is pure parsing + a command bus. Network (Telegram getUpdates/
 * sendMessage) only happens when a real bot token is present; --dry-run
 * exercises the parser without the network.
 */

import type { PipelineItem, QueueRow } from './types.js';

export type TgCommand =
  | { kind: 'publish'; id: string }
  | { kind: 'approve'; id: string }
  | { kind: 'reject'; id: string }
  | { kind: 'rewrite'; id: string }
  | { kind: 'media'; id: string }
  | { kind: 'status' }
  | { kind: 'sources' }
  | { kind: 'pause' }
  | { kind: 'resume' }
  | { kind: 'help' }
  | { kind: 'unknown'; raw: string };

export type TgUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number | string; type: string };
    text?: string;
    from?: { id: number | string; username?: string; first_name?: string };
  };
};

const KNOWN = new Set(['publish', 'approve', 'reject', 'rewrite', 'media', 'status', 'sources', 'pause', 'resume', 'help']);

/** Pure parser — given a raw message text, produce a command. */
export function parseCommand(text: string | undefined): TgCommand {
  const raw = (text ?? '').trim();
  if (!raw.startsWith('/')) return { kind: 'unknown', raw };
  const [head, ...rest] = raw.split(/\s+/);
  const name = head.replace('/', '').split('@')[0].toLowerCase(); // strip bot suffix
  const arg = rest.join(' ').trim();

  if (name === 'publish' || name === 'approve' || name === 'reject' || name === 'rewrite' || name === 'media') {
    if (!arg) return { kind: 'unknown', raw };
    return { kind: name, id: arg } as TgCommand;
  }
  if (KNOWN.has(name)) return { kind: name } as TgCommand;
  return { kind: 'unknown', raw };
}

export type TgHandler = (cmd: TgCommand) => Promise<string>;

/**
 * Minimal long-polling client. Call `pollOnce` repeatedly (the orchestrator
 * loop does this between cycles). Allowed chat ids are enforced when
 * TELEGRAM_ALLOWED_CHAT_IDS is set (comma separated); otherwise any chat
 * that the bot can see is accepted — recommended to ALWAYS set it.
 */
export class TelegramController {
  private offset = 0;
  constructor(
    private cfg: { botToken?: string; allowedChatIds?: string[]; log?: (m: string) => void },
    private handler: TgHandler,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.cfg.botToken);
  }

  allowed(chatId: number | string): boolean {
    const ids = this.cfg.allowedChatIds ?? [];
    if (ids.length === 0) return true;
    return ids.includes(String(chatId));
  }

  async sendMessage(chatId: number | string, text: string): Promise<void> {
    if (!this.cfg.botToken) return;
    const base = `https://api.telegram.org/bot${this.cfg.botToken}`;
    await fetch(`${base}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: String(chatId), text: text.slice(0, 4000), disable_web_page_preview: true }),
    }).catch(() => undefined);
  }

  /** Fetch one page of updates and dispatch commands (used by the loop). */
  async pollOnce(): Promise<number> {
    if (!this.isConfigured()) return 0;
    const base = `https://api.telegram.org/bot${this.cfg.botToken}`;
    const params = new URLSearchParams({
      timeout: '5',
      offset: String(this.offset),
      allowed_updates: JSON.stringify(['message']),
    });
    try {
      const res = await fetch(`${base}/getUpdates?${params}`);
      if (!res.ok) return 0;
      const data = (await res.json()) as { ok?: boolean; result?: TgUpdate[] };
      if (!data.ok) return 0;
      let handled = 0;
      for (const upd of data.result ?? []) {
        this.offset = Math.max(this.offset, upd.update_id + 1);
        const msg = upd.message;
        if (!msg?.text) continue;
        if (!this.allowed(msg.chat.id)) {
          await this.sendMessage(msg.chat.id, '⛔ এই চ্যাটে কমান্ড চালানোর অনুমতি নেই।');
          continue;
        }
        const cmd = parseCommand(msg.text);
        handled++;
        try {
          const reply = await this.handler(cmd);
          await this.sendMessage(msg.chat.id, reply);
        } catch (e) {
          await this.sendMessage(msg.chat.id, `⚠️ ত্রুটি: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      return handled;
    } catch {
      return 0;
    }
  }

  async stop(): Promise<void> {
    /* long-polling has no persistent socket to close; nothing to do */
  }
}

/* ------------------------------------------------------------------ */
/* Reply builders shared by the orchestrator + dry-run tester          */
/* ------------------------------------------------------------------ */

export function queueSummary(rows: QueueRow[]): string {
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.status ?? 'unknown'] = (counts[r.status ?? 'unknown'] ?? 0) + 1;
  const parts = Object.entries(counts).map(([k, v]) => `${k}: ${v}`);
  const recent = rows
    .slice(0, 8)
    .map((r) => `• ${r.id.slice(0, 8)} [${r.status}] ${(r.title ?? '').slice(0, 60)}`)
    .join('\n');
  return `📊 সারসংক্ষেপ\n${parts.join(' • ')}\n\nসাম্প্রতিক:\n${recent || '(কিছু নেই)'}`;
}

export function sourcesReply(sourceIds: string[]): string {
  return `📡 পর্যবেক্ষণে থাকা সোর্স (${sourceIds.length}):\n${sourceIds.map((s) => `• ${s}`).join('\n')}`;
}

export function itemLine(it: PipelineItem | QueueRow): string {
  const id = it.id.slice(0, 8);
  const title = 'rewritten' in it && it.rewritten ? it.rewritten.headline : (it as QueueRow).title ?? '';
  const state = 'state' in it ? it.state : (it as QueueRow).status ?? '';
  return `#${id} [${state}] ${title.slice(0, 70)}`;
}

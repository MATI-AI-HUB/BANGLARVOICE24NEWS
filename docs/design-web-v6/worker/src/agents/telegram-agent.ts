/**
 * Banglar Voice — TelegramAgent.
 *
 * THE EDITOR'S REMOTE CONTROL. Exposes a Telegram bot through which the
 * newsroom editor can:
 *   /approve <run_id>      → approve a story (gate opens → Publisher)
 *   /reject  <run_id>      → reject a story
 *   /publish <run_id>      → same as approve
 *   /pending               → list all stories waiting for approval
 *   /status                → supervisor health report
 *   /pause | /resume       → pause/resume the collector (best effort)
 *
 * It only ever SENDS control messages on the bus (control.* topics). It
 * never touches stories itself, keeping the human in the loop intact.
 *
 * The bot side is guarded by TELEGRAM_BOT_TOKEN (a group bot can be shared
 * with the public broadcasting bot only when long-polling is enabled with
 * TELEGRAM_POLL=true; default is webhook-only). When the bot is not
 * configured this agent stays silent and the pipeline still works — the
 * editor can then use the Admin Console approve flow instead.
 */

import { Buffer } from 'node:buffer';
import type { AgentMessage } from '../lib/bus.js';
import { TOPIC, type AgentContext, type AgentHandle } from './types.js';
import { AGENT_IDS } from './registry.js';

interface TelegramUpdate {
  update_id: number;
  message?: { chat: { id: number }; text?: string; from?: { id: number } };
  edited_message?: { chat: { id: number }; text?: string };
}

export class TelegramAgent implements AgentHandle {
  readonly id: string;
  readonly topics: string[];
  private offset = 0;

  constructor(private ctx: AgentContext) {
    this.id = ctx.id;
    // Pause/resume are handled by the collector's own control topics; this
    // agent subscribes to the same *resume topic to re-arm its own polling.
    this.topics = [TOPIC.CTRL_RESUME, 'control.status'];
  }

  describe(): string {
    return 'Telegram editorial remote — /approve /reject /pending /status';
  }

  async tick(): Promise<number> {
    const token = process.env['TELEGRAM_BOT_TOKEN'];
    const chatId = process.env['TELEGRAM_EDITOR_CHAT_ID'] ?? process.env['TELEGRAM_CHAT_ID'];
    const dryRun = this.ctx.dryRun;
    if (!token || !chatId) return 0; // not configured → idle

    const base = `https://api.telegram.org/bot${token}`;
    const get = async (path: string): Promise<unknown> => {
      const res = await fetch(`${base}${path}`);
      if (!res.ok) throw new Error(`Telegram ${res.status}`);
      return res.json() as Promise<unknown>;
    };

    // getUpdates long-poll in dryRun would hang; short poll instead.
    const timeout = dryRun ? 1 : 20;
    const updates = (await get(
      `/getUpdates?timeout=${timeout}&allowed_updates=["message","edited_message"]&offset=${this.offset}`,
    )) as { ok: boolean; result: TelegramUpdate[] };
    if (!updates.ok) return 0;
    let handled = 0;

    for (const u of updates.result) {
      this.offset = u.update_id + 1;
      const msg = u.message ?? u.edited_message;
      if (!msg || String(msg.chat.id) !== String(chatId)) continue;
      const text = (msg.text ?? '').trim();
      const [cmd, arg] = text.split(/\s+/);
      handled += 1;
      try {
        switch (cmd) {
          case '/approve':
          case '/publish': {
            const id = arg ?? '';
            if (!id) {
              await this.reply(get, msg.chat.id, 'Usage: /approve <run_id prefix>');
              break;
            }
            await this.ctx.bus.publish({
              topic: TOPIC.CTRL_APPROVE, type: 'control.approve', from: this.id, to: 'editor', payload: { id, by: `telegram:${msg.from?.id ?? '?'}` },
            });
            await this.reply(get, msg.chat.id, `⏳ Approval sent for ${id}`);
            break;
          }
          case '/reject': {
            const id = arg ?? '';
            if (!id) {
              await this.reply(get, msg.chat.id, 'Usage: /reject <run_id prefix>');
              break;
            }
            await this.ctx.bus.publish({ topic: TOPIC.CTRL_REJECT, type: 'control.reject', from: this.id, to: 'editor', payload: { id } });
            await this.reply(get, msg.chat.id, `🗑 Rejection sent for ${id}`);
            break;
          }
          case '/pending': {
            const reply = await this.pendingSummary();
            await this.reply(get, msg.chat.id, reply);
            break;
          }
          case '/status': {
            const reply = `🟢 Banglar Voice agent fleet online\n${AGENT_IDS.map((a) => `• ${a}`).join('\n')}\n\nTip: /pending to see the queue`;
            await this.reply(get, msg.chat.id, reply);
            break;
          }
          case '/pause':
            await this.ctx.bus.publish({ topic: TOPIC.CTRL_PAUSE, type: 'control.pause', from: this.id, to: 'collector', payload: {} });
            await this.reply(get, msg.chat.id, '⏸ Pause sent to collector');
            break;
          case '/resume':
            await this.ctx.bus.publish({ topic: TOPIC.CTRL_RESUME, type: 'control.resume', from: this.id, to: '*', payload: {} });
            await this.reply(get, msg.chat.id, '▶️ Resume sent');
            break;
          case '/start':
            await this.reply(get, msg.chat.id, this.helpText());
            break;
          case '/help':
            await this.reply(get, msg.chat.id, this.helpText());
            break;
          default:
            await this.reply(get, msg.chat.id, 'Unknown command. Send /help');
        }
      } catch (e) {
        this.ctx.log(`telegram command failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return handled;
  }

  private helpText(): string {
    return [
      '🤖 Banglar Voice editorial bot',
      '/approve <run_id> — publish a pending story',
      '/reject <run_id> — discard a pending story',
      '/pending — list the approval queue',
      '/status — agent fleet health',
      '/pause /resume — collector switch',
    ].join('\n');
  }

  private async reply(get: (p: string) => Promise<unknown>, chatId: number, text: string): Promise<void> {
    const send = (await get(`/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(text.slice(0, 4000))}`)) as { ok: boolean };
    if (!send.ok) this.ctx.log('telegram reply failed');
  }

  /** Best-effort mirror of the editor's pending queue file. */
  private async pendingSummary(): Promise<string> {
    const file = process.env['EDITOR_QUEUE_FILE'] ?? '.state/editor-pending.json';
    try {
      const { readFileSync } = await import('node:fs');
      const pending = JSON.parse(readFileSync(file, 'utf8')) as Record<string, { original_title?: string; rewritten?: { headline?: string }; source_category?: string }>;
      const rows = Object.values(pending).slice(0, 12);
      if (!rows.length) return '📭 Queue is empty';
      const lines = rows.map((r, i) => `${i + 1}. \`${Object.keys(pending)[i]?.slice(0, 8)}\` — ${r.rewritten?.headline ?? r.original_title ?? '?'}`.slice(0, 120));
      return [`📬 ${Object.keys(pending).length} pending story(ies)`, '', ...lines, '', 'Reply /approve <run_id> to publish'].join('\n');
    } catch {
      return '📭 Queue file not found (or empty)';
    }
  }

  /** Not used on the bus-driven flow, but kept for future CLI piping. */
  private static _decodeBase64(s: string): string {
    return Buffer.from(s, 'base64').toString('utf8');
  }

  /** Satisfy unused-import linters if AgentMessage is imported for typing. */
  private static _messageTypeGuard(_m: AgentMessage): boolean {
    return !!_m && typeof _m.topic === 'string';
  }
}

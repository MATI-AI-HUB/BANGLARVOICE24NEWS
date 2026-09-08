// =============================================================================
// registry.ts — the agent registry. Declares every agent, its role, its
// input/output contract, the tools it uses, and its run frequency. This is the
// single source of truth for "who does what" in the pipeline.
// =============================================================================

import type { AgentName } from "./types.js";

export interface AgentSpec {
  name: AgentName;
  roleBn: string;
  roleEn: string;
  input: string;
  output: string;
  tools: string;
  frequency: string;
  file: string;
}

export const AGENT_REGISTRY: AgentSpec[] = [
  {
    name: "collector",
    roleBn: "সংগ্রাহক",
    roleEn: "Collector",
    input: "RSS/Atom feed URLs",
    output: "কাঁচা নিউজ আইটেম (RawItem)",
    tools: "fast-xml-parser, HTTP fetch",
    frequency: "প্রতি ১৫ মিনিট (INTERVAL_MINUTES)",
    file: "worker/src/agents/collector.ts",
  },
  {
    name: "rewriter",
    roleBn: "পুনর্লিখক",
    roleEn: "Rewriter",
    input: "কাঁচা আইটেম",
    output: "কপিরাইট-মুক্ত মূল বাংলা লেখা",
    tools: "OpenAI-compatible chat (gpt-4o-mini) অথবা deterministic বাংলা প্যারাফ্রেজ",
    frequency: "প্রতি চক্র",
    file: "worker/src/agents/rewriter.ts",
  },
  {
    name: "media",
    roleBn: "মিডিয়া",
    roleEn: "Media",
    input: "লেখা",
    output: "CC0 ছবি URL",
    tools: "Wikimedia Commons, Openverse (key-মুক্ত), Pexels (ঐচ্ছিক)",
    frequency: "প্রতি চক্র",
    file: "worker/src/agents/media.ts",
  },
  {
    name: "editor",
    roleBn: "সম্পাদক",
    roleEn: "Editor",
    input: "রিরাইট করা লেখা",
    output: "এডিটেড ড্রাফট (হেডলাইন/ট্যাগ/যাচাই)",
    tools: "chat (gpt-4o-mini) + rules",
    frequency: "প্রতি চক্র",
    file: "worker/src/agents/chain-agents.ts",
  },
  {
    name: "publisher",
    roleBn: "প্রকাশক",
    roleEn: "Publisher",
    input: "এডিটেড ড্রাফট",
    output: "BV_BASE_URL-এ POST (NEWSROOM_INGEST_KEY)",
    tools: "HTTP POST",
    frequency: "প্রতি চক্র",
    file: "worker/src/agents/orchestrator.ts",
  },
  {
    name: "social",
    roleBn: "সোশ্যাল",
    roleEn: "Social",
    input: "প্রকাশিত আইটেম",
    output: "FB/X/IG/LinkedIn/Telegram ব্রডকাস্ট",
    tools: "Graph API, X API v2, LinkedIn API, Telegram Bot",
    frequency: "প্রতি প্রকাশ",
    file: "worker/src/agents/chain-agents.ts",
  },
  {
    name: "supervisor",
    roleBn: "তত্ত্বাবধায়ক",
    roleEn: "Supervisor",
    input: "সব এজেন্টের আউটপুট",
    output: "publish/approve/reject সিদ্ধান্ত",
    tools: "Telegram কমান্ড কন্ট্রোল প্লেন",
    frequency: "ক্রমাগত",
    file: "worker/src/agents/supervisor.ts",
  },
];

export function getAgent(name: AgentName): AgentSpec {
  const spec = AGENT_REGISTRY.find((a) => a.name === name);
  if (!spec) throw new Error(`Unknown agent: ${name}`);
  return spec;
}

export function listAgents(): AgentSpec[] {
  return AGENT_REGISTRY;
}
#!/usr/bin/env python3
"""
sync_audit.py — রিপো (supabase/migrations) বনাম প্রোডাকশন Supabase ডাটাবেসের দ্বিমুখী অডিট।

* প্রোডাকশনে শুধু SELECT চালায় (কিছুই বদলায় না)।
* শুধু Python3 + psql লাগে; Termux-এ supabase CLI ছাড়াই চলে।
* migration ফাইলগুলো ক্রমানুসারে পড়ে "নিট ঘোষিত অবস্থা" বের করে (create/drop/rename ধরে),
  তারপর প্রোডাকশনের সঙ্গে মেলায় — আগের grep-ভিত্তিক ক্রসচেকের চেয়ে নির্ভরযোগ্য।

ব্যবহার (রিপোর ভেতর থেকে):
    read -rs DB; export DB            # postgres://... (পেস্ট করুন, স্ক্রিনে দেখা যাবে না)
    python3 ~/sync_audit.py | tee ~/sync_audit_report.txt
    python3 ~/sync_audit.py --functions     # Edge Function তালিকা (SBP=sbp_... টোকেন লাগে)
    python3 ~/sync_audit.py --secrets       # Vault সিক্রেটের হ্যাশ-প্রিফিক্স (মান দেখায় না)
    python3 ~/sync_audit.py --sql-out ~/repair_history.sql   # ইতিহাস মেলানোর SQL (ডিফল্টে ROLLBACK)
"""
import argparse
import glob
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

PROJECT_REF_DEFAULT = "fqqdpngmftoddffvdukn"

INV_SQL = {
    "tables": (
        "select tablename from pg_tables where schemaname='public' "
        "union select viewname from pg_views where schemaname='public' "
        "union select matviewname from pg_matviews where schemaname='public'"
    ),
    "functions": (
        "select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace "
        "where n.nspname='public' and not exists "
        "(select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')"
    ),
    "triggers": (
        "select t.tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid "
        "join pg_namespace n on n.oid=c.relnamespace "
        "where not t.tgisinternal and n.nspname in ('public','auth')"
    ),
    "policies": (
        "select tablename||'.'||policyname from pg_policies "
        "where schemaname in ('public','storage')"
    ),
    "indexes": (
        "select indexname from pg_indexes where schemaname='public' "
        "and indexname !~ '(_pkey|_key)$'"
    ),
    "columns": (
        "select table_name||'.'||column_name from information_schema.columns "
        "where table_schema='public'"
    ),
    "cron": "select jobname from cron.job where jobname is not null",
    "buckets": "select id from storage.buckets",
    "history": (
        "select version||'|'||coalesce(name,'') from supabase_migrations.schema_migrations"
    ),
    # ---- নিরাপত্তা-সংক্রান্ত (শুধু রিপোর্ট) ----
    "rls_off": (
        "select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace "
        "where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity"
    ),
    "open_policies": (
        "select tablename||'.'||policyname||' ['||cmd||' → '||array_to_string(roles,',')||']' "
        "from pg_policies where schemaname in ('public','storage') "
        "and cmd in ('SELECT','ALL','INSERT','UPDATE','DELETE') "
        "and coalesce(trim(qual),'true') in ('true','(true)') "
        "and coalesce(trim(with_check),'true') in ('true','(true)') "
        "and (roles && array['public','anon']::name[])"
    ),
    "anon_secdef": (
        "select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace "
        "where n.nspname='public' and p.prosecdef "
        "and has_function_privilege('anon', p.oid, 'execute') and not exists "
        "(select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')"
    ),
}


# ----------------------------------------------------------------------------
# DB helpers
# ----------------------------------------------------------------------------
def run_psql(db, sql):
    r = subprocess.run(
        ["psql", db, "-Atq", "-v", "ON_ERROR_STOP=1", "-c", sql],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        err = " ".join(r.stderr.split()) or "unknown error"
        return None, err
    return [ln for ln in r.stdout.splitlines() if ln != ""], None


def fetch_inventory(db):
    inv, errs = {}, {}
    for k, sql in INV_SQL.items():
        rows, err = run_psql(db, sql)
        inv[k] = rows
        if err:
            errs[k] = err
    return inv, errs


# ----------------------------------------------------------------------------
# SQL parsing
# ----------------------------------------------------------------------------
def split_sql(sql):
    """মন্তব্য বাদ দিয়ে টপ-লেভেল স্টেটমেন্টে ভাগ করে ('..', "..", $tag$..$tag$ মেনে)।"""
    out, buf, i, n = [], [], 0, len(sql)
    while i < n:
        c = sql[i]
        if c == "-" and sql.startswith("--", i):
            j = sql.find("\n", i)
            i = n if j < 0 else j
            continue
        if c == "/" and sql.startswith("/*", i):
            j = sql.find("*/", i + 2)
            i = n if j < 0 else j + 2
            buf.append(" ")
            continue
        if c == "'":
            j = i + 1
            while j < n:
                if sql[j] == "'":
                    if j + 1 < n and sql[j + 1] == "'":
                        j += 2
                        continue
                    break
                j += 1
            buf.append(sql[i : j + 1])
            i = j + 1
            continue
        if c == '"':
            j = sql.find('"', i + 1)
            j = n - 1 if j < 0 else j
            buf.append(sql[i : j + 1])
            i = j + 1
            continue
        if c == "$":
            m = re.match(r"\$([A-Za-z_]\w*)?\$", sql[i : i + 64])
            if m:
                tag = m.group(0)
                j = sql.find(tag, i + len(tag))
                j = n if j < 0 else j + len(tag)
                buf.append(sql[i:j])
                i = j
                continue
        if c == ";":
            s = "".join(buf).strip()
            if s:
                out.append(s)
            buf = []
            i += 1
            continue
        buf.append(c)
        i += 1
    s = "".join(buf).strip()
    if s:
        out.append(s)
    return out


def ident(p):
    return rf'(?:"?(?P<{p}s>\w+)"?\s*\.\s*)?"?(?P<{p}n>\w+)"?'


F = re.I | re.S
RX = {
    "ctable": re.compile(
        rf"\bcreate\s+(?P<tmp>unlogged\s+|temp(?:orary)?\s+)?table\s+(?:if\s+not\s+exists\s+)?{ident('t')}", F),
    "cview": re.compile(
        rf"\bcreate\s+(?:or\s+replace\s+)?(?:temp(?:orary)?\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?{ident('t')}", F),
    "cfunc": re.compile(
        rf"\bcreate\s+(?:or\s+replace\s+)?(?:function|procedure)\s+{ident('t')}\s*\(", F),
    "ctrig": re.compile(
        rf'\bcreate\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\s+"?(?P<n>\w+)"?\s+(?:before|after|instead\s+of)\s.+?\son\s+{ident("t")}', F),
    "cpol": re.compile(
        rf'\bcreate\s+policy\s+(?:"(?P<pq>[^"]+)"|(?P<pn>\w+))\s+on\s+{ident("t")}', F),
    "cidx": re.compile(
        rf'\bcreate\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?"?(?P<n>\w+)"?\s+on\s+(?:only\s+)?{ident("t")}', F),
    "ccron": re.compile(r"cron\s*\.\s*schedule(?:_in_database)?\s*\(\s*'(?P<n>[^']+)'", F),
    "ucron": re.compile(r"cron\s*\.\s*unschedule\s*\(\s*'(?P<n>[^']+)'", F),
    "bucket": re.compile(r"insert\s+into\s+storage\s*\.\s*buckets\b(?P<rest>.*?)(?:\bon\s+conflict\b|$)", F),
    "dtable": re.compile(
        rf"\bdrop\s+(?:materialized\s+)?(?:table|view)\s+(?:if\s+exists\s+)?{ident('t')}", F),
    "dfunc": re.compile(
        rf"\bdrop\s+(?:function|procedure)\s+(?:if\s+exists\s+)?{ident('t')}", F),
    "dtrig": re.compile(
        rf'\bdrop\s+trigger\s+(?:if\s+exists\s+)?"?(?P<n>\w+)"?\s+on\s+{ident("t")}', F),
    "dpol": re.compile(
        rf'\bdrop\s+policy\s+(?:if\s+exists\s+)?(?:"(?P<pq>[^"]+)"|(?P<pn>\w+))\s+on\s+{ident("t")}', F),
    "didx": re.compile(
        rf"\bdrop\s+index\s+(?:concurrently\s+)?(?:if\s+exists\s+)?{ident('t')}", F),
    "alter": re.compile(
        rf"\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?{ident('t')}", F),
}
COLOP = re.compile(
    r'\badd\s+column\s+(?:if\s+not\s+exists\s+)?"?(?P<add>\w+)"?'
    r'|\bdrop\s+column\s+(?:if\s+exists\s+)?"?(?P<drop>\w+)"?'
    r'|\brename\s+(?:column\s+)?"?(?P<ra>\w+)"?\s+to\s+"?(?P<rb>\w+)"?',
    F,
)
BUCKET_ID = re.compile(r"(?:values\s*|\)\s*,\s*)\(\s*'([^']+)'", F)


def ok_schema(sch, allowed=(None, "public")):
    return (sch.lower() if sch else None) in allowed


def lo(x):
    return x.lower() if x else x


def stmt_events(stmt):
    """একটি স্টেটমেন্ট থেকে (pos, op) তালিকা।"""
    text = stmt
    head = stmt[:60].lower()
    if re.match(r"\s*create\s+(or\s+replace\s+)?(function|procedure)\b", head):
        m = re.search(r"\$([A-Za-z_]\w*)?\$", stmt)
        text = stmt[: m.start()] if m else stmt
    ev = []

    for m in RX["ctable"].finditer(text):
        if m.group("tmp"):
            continue
        if ok_schema(m.group("ts")):
            ev.append((m.start(), ("add_table", lo(m.group("tn")))))
    for m in RX["cview"].finditer(text):
        if ok_schema(m.group("ts")):
            ev.append((m.start(), ("add_table", lo(m.group("tn")))))
    for m in RX["cfunc"].finditer(text):
        if ok_schema(m.group("ts")):
            ev.append((m.start(), ("add_func", lo(m.group("tn")))))
    for m in RX["ctrig"].finditer(text):
        if ok_schema(m.group("ts"), (None, "public", "auth")):
            ev.append((m.start(), ("add_trig", lo(m.group("n")), lo(m.group("tn")))))
    for m in RX["cpol"].finditer(text):
        if ok_schema(m.group("ts"), (None, "public", "storage")):
            pol = m.group("pq") or lo(m.group("pn"))
            ev.append((m.start(), ("add_pol", lo(m.group("tn")), pol)))
    for m in RX["cidx"].finditer(text):
        if ok_schema(m.group("ts")):
            ev.append((m.start(), ("add_idx", lo(m.group("n")), lo(m.group("tn")))))
    for m in RX["ccron"].finditer(text):
        name = m.group("n")
        if re.fullmatch(r"[\d\*/,\- ]+", name) and name.count(" ") >= 4:
            continue  # নামহীন জব (প্রথম আর্গুমেন্ট ক্রন-এক্সপ্রেশন)
        ev.append((m.start(), ("add_cron", name)))
    for m in RX["ucron"].finditer(text):
        ev.append((m.start(), ("drop_cron", m.group("n"))))
    for m in RX["bucket"].finditer(text):
        for b in BUCKET_ID.finditer(m.group("rest")):
            ev.append((m.start(), ("add_bucket", b.group(1))))

    for m in RX["dtable"].finditer(text):
        if ok_schema(m.group("ts")):
            ev.append((m.start(), ("drop_table", lo(m.group("tn")))))
    for m in RX["dfunc"].finditer(text):
        if ok_schema(m.group("ts")):
            ev.append((m.start(), ("drop_func", lo(m.group("tn")))))
    for m in RX["dtrig"].finditer(text):
        ev.append((m.start(), ("drop_trig", lo(m.group("n")))))
    for m in RX["dpol"].finditer(text):
        if ok_schema(m.group("ts"), (None, "public", "storage")):
            pol = m.group("pq") or lo(m.group("pn"))
            ev.append((m.start(), ("drop_pol", lo(m.group("tn")), pol)))
    for m in RX["didx"].finditer(text):
        if ok_schema(m.group("ts")):
            ev.append((m.start(), ("drop_idx", lo(m.group("tn")))))

    for m in RX["alter"].finditer(text):
        if not ok_schema(m.group("ts")):
            continue
        tbl = lo(m.group("tn"))
        end = text.find(";", m.end())
        region = text[m.end() : (len(text) if end < 0 else end)]
        rn = re.match(r'\s*rename\s+to\s+"?(\w+)"?', region, F)
        if rn:
            ev.append((m.start(), ("rename_table", tbl, lo(rn.group(1)))))
            continue
        for c in COLOP.finditer(region):
            pos = m.end() + c.start()
            if c.group("add"):
                ev.append((pos, ("add_col", tbl, lo(c.group("add")))))
            elif c.group("drop"):
                ev.append((pos, ("drop_col", tbl, lo(c.group("drop")))))
            elif c.group("ra"):
                ev.append((pos, ("rename_col", tbl, lo(c.group("ra")), lo(c.group("rb")))))
    ev.sort(key=lambda x: x[0])
    return [e[1] for e in ev]


class State:
    def __init__(self):
        self.tables, self.columns, self.functions = set(), set(), set()
        self.triggers, self.policies, self.indexes = {}, set(), {}
        self.cron, self.buckets = set(), set()
        self.origin = {}  # (kind,key) -> migration file
        self.per_file = {}  # file -> [(kind,key)]

    def _add(self, kind, key, f):
        self.origin[(kind, key)] = f
        self.per_file.setdefault(f, []).append((kind, key))

    def apply(self, op, f):
        k = op[0]
        if k == "add_table":
            self.tables.add(op[1]); self._add("tables", op[1], f)
        elif k == "add_col":
            key = f"{op[1]}.{op[2]}"
            self.columns.add(key); self._add("columns", key, f)
        elif k == "add_func":
            self.functions.add(op[1]); self._add("functions", op[1], f)
        elif k == "add_trig":
            self.triggers[op[1]] = op[2]; self._add("triggers", op[1], f)
        elif k == "add_pol":
            key = f"{op[1]}.{op[2]}"
            self.policies.add(key); self._add("policies", key, f)
        elif k == "add_idx":
            self.indexes[op[1]] = op[2]; self._add("indexes", op[1], f)
        elif k == "add_cron":
            self.cron.add(op[1]); self._add("cron", op[1], f)
        elif k == "add_bucket":
            self.buckets.add(op[1]); self._add("buckets", op[1], f)
        elif k == "drop_table":
            t = op[1]
            self.tables.discard(t)
            self.columns = {c for c in self.columns if not c.startswith(t + ".")}
            self.policies = {p for p in self.policies if not p.startswith(t + ".")}
            self.triggers = {n: tb for n, tb in self.triggers.items() if tb != t}
            self.indexes = {n: tb for n, tb in self.indexes.items() if tb != t}
        elif k == "drop_col":
            self.columns.discard(f"{op[1]}.{op[2]}")
        elif k == "drop_func":
            self.functions.discard(op[1])
        elif k == "drop_trig":
            self.triggers.pop(op[1], None)
        elif k == "drop_pol":
            self.policies.discard(f"{op[1]}.{op[2]}")
        elif k == "drop_idx":
            self.indexes.pop(op[1], None)
        elif k == "drop_cron":
            self.cron.discard(op[1])
        elif k == "rename_table":
            old, new = op[1], op[2]
            if old in self.tables:
                self.tables.discard(old); self.tables.add(new)
                self._add("tables", new, f)
            self.columns = {(new + c[len(old):]) if c.startswith(old + ".") else c for c in self.columns}
            self.policies = {(new + p[len(old):]) if p.startswith(old + ".") else p for p in self.policies}
            self.triggers = {n: (new if tb == old else tb) for n, tb in self.triggers.items()}
            self.indexes = {n: (new if tb == old else tb) for n, tb in self.indexes.items()}
        elif k == "rename_col":
            if f"{op[1]}.{op[2]}" in self.columns:
                self.columns.discard(f"{op[1]}.{op[2]}")
                self.columns.add(f"{op[1]}.{op[3]}")
                self._add("columns", f"{op[1]}.{op[3]}", f)

    def declared(self, kind):
        return {
            "tables": self.tables,
            "columns": self.columns,
            "functions": self.functions,
            "triggers": set(self.triggers),
            "policies": self.policies,
            "indexes": {n for n in self.indexes if not re.search(r"(_pkey|_key)$", n)},
            "cron": self.cron,
            "buckets": self.buckets,
        }[kind]


def load_repo_state(mig_dir):
    files = sorted(glob.glob(os.path.join(mig_dir, "*.sql")))
    st = State()
    for path in files:
        base = os.path.basename(path)
        with open(path, encoding="utf-8", errors="replace") as fh:
            sql = fh.read()
        for stmt in split_sql(sql):
            for op in stmt_events(stmt):
                st.apply(op, base)
    return st, [os.path.basename(p) for p in files]


# ----------------------------------------------------------------------------
# Normalisation of production inventory
# ----------------------------------------------------------------------------
def norm_inv(inv):
    out = {}
    for k, rows in inv.items():
        if rows is None:
            out[k] = None
        elif k in ("policies",):
            out[k] = set(rows)
        elif k in ("cron", "buckets", "history", "open_policies"):
            out[k] = set(rows)
        else:
            out[k] = {r.lower() for r in rows}
    return out


# ----------------------------------------------------------------------------
# Report
# ----------------------------------------------------------------------------
KIND_BN = {
    "tables": "টেবিল/ভিউ", "columns": "কলাম (ALTER দিয়ে যোগ)", "functions": "ফাংশন",
    "triggers": "ট্রিগার", "policies": "RLS পলিসি", "indexes": "ইনডেক্স",
    "cron": "pg_cron জব", "buckets": "স্টোরেজ বাকেট",
}


def report(st, files, inv, errs, mig_dir, sql_out):
    P = print
    P("=" * 60)
    P(f"রিপো migration ফাইল: {len(files)} | প্রোডাকশন ইতিহাস-রো: "
      f"{len(inv['history']) if inv['history'] is not None else '?'}")
    for k, e in errs.items():
        P(f"  ⚠ প্রোডাকশন কুয়েরি ব্যর্থ [{k}]: {e}")
    P("=" * 60)

    repo_only_count = prod_only_count = 0
    P("\n### ক) রিপোতে ঘোষিত, কিন্তু প্রোডাকশনে নেই (REPO-ONLY)")
    for kind in KIND_BN:
        if inv.get(kind) is None:
            continue
        miss = sorted(st.declared(kind) - inv[kind]) if kind != "columns" else sorted(
            c for c in st.declared("columns")
            if inv["columns"] is not None and c not in inv["columns"])
        if not miss:
            continue
        P(f"\n[{KIND_BN[kind]}] {len(miss)}টি")
        for key in miss:
            P(f"  - {key}    ← {st.origin.get((kind, key), '?')}")
        repo_only_count += len(miss)
    if not repo_only_count:
        P("  (কিছু নেই)")

    P("\n### খ) প্রোডাকশনে আছে, কিন্তু রিপোর কোনো migration-এ নেই (PROD-ONLY)")
    for kind in KIND_BN:
        if kind == "columns" or inv.get(kind) is None:
            continue
        extra = sorted(inv[kind] - st.declared(kind))
        if not extra:
            continue
        P(f"\n[{KIND_BN[kind]}] {len(extra)}টি")
        for key in extra:
            P(f"  - {key}")
        prod_only_count += len(extra)
    if not prod_only_count:
        P("  (কিছু নেই)")

    # ---- ইতিহাস ----
    P("\n### গ) migration ইতিহাস (remote schema_migrations বনাম রিপোর ফাইল)")
    local = {}
    for f in files:
        m = re.match(r"(\d+)_?(.*)\.sql$", f)
        if m:
            local[m.group(1)] = f
    remote = {}
    for row in inv.get("history") or []:
        v, _, n = row.partition("|")
        remote[v] = n
    remote_only = sorted(set(remote) - set(local))
    local_only = sorted(set(local) - set(remote))
    P(f"  শুধু রিমোটে (রিপোতে ফাইল নেই): {len(remote_only)}")
    for v in remote_only:
        P(f"    {v}  {remote[v]}")
    P(f"  শুধু রিপোতে (রিমোটে এই ভার্সনে প্রয়োগ নেই): {len(local_only)}")

    safe_insert, review, unknown = [], [], []
    for v in local_only:
        f = local[v]
        adds = sorted({(k, key) for (k, key) in st.per_file.get(f, [])
                       if key in st.declared(k)})
        # প্রোডাকশনে কতটা আছে
        if not adds:
            verdict = "UNKNOWN (শুধু grant/data/alter — স্বয়ংক্রিয় যাচাই সম্ভব নয়)"
            unknown.append(v)
        else:
            present = sum(1 for (k, key) in adds if inv.get(k) is not None and key in inv[k])
            if present == len(adds):
                verdict = f"APPLIED-IN-EFFECT ({present}/{len(adds)})"
                safe_insert.append(v)
            elif present == 0:
                verdict = f"NOT APPLIED (0/{len(adds)}) — db push এটি চালাবে"
                review.append(v)
            else:
                verdict = f"PARTIAL ({present}/{len(adds)}) — হাতে দেখুন"
                review.append(v)
        P(f"    {v}  {f[len(v)+1:]:<45} {verdict}")

    # ---- নিরাপত্তা ----
    P("\n### ঘ) নিরাপত্তা-সংকেত (শুধু রিপোর্ট)")
    if inv.get("rls_off") is not None:
        P(f"  RLS বন্ধ থাকা public টেবিল: {len(inv['rls_off'])}")
        for t in sorted(inv["rls_off"]):
            P(f"    - {t}")
    if inv.get("open_policies") is not None:
        P(f"  anon/public-এর জন্য শর্তহীন (true) পলিসি: {len(inv['open_policies'])}")
        for t in sorted(inv["open_policies"]):
            P(f"    - {t}")
    if inv.get("anon_secdef") is not None:
        P(f"  anon যে SECURITY DEFINER ফাংশন চালাতে পারে: {len(inv['anon_secdef'])}")
        for t in sorted(inv["anon_secdef"]):
            P(f"    - {t}()")

    # ---- সারাংশ ----
    P("\n" + "=" * 60)
    P(f"সারাংশ: REPO-ONLY={repo_only_count}  PROD-ONLY={prod_only_count}  "
      f"ইতিহাস: remote-only={len(remote_only)} local-only={len(local_only)}")
    P("=" * 60)

    if sql_out:
        write_repair_sql(sql_out, remote_only, safe_insert, review, unknown, local, remote)
        P(f"\nইতিহাস মেলানোর খসড়া SQL লেখা হলো: {sql_out}")
        P("  → ডিফল্টে শেষে ROLLBACK আছে; ভালোভাবে পড়ে তবেই COMMIT করুন।")


def write_repair_sql(path, remote_only, safe_insert, review, unknown, local, remote):
    L = []
    L.append("-- স্বয়ংক্রিয়ভাবে তৈরি খসড়া — প্রয়োগের আগে পড়ুন। শেষে ROLLBACK আছে।")
    L.append("\\set ON_ERROR_STOP on")
    L.append("begin;")
    L.append("create table if not exists supabase_migrations.schema_migrations_backup_pre_repair as")
    L.append("  select * from supabase_migrations.schema_migrations;")
    if remote_only:
        L.append("\n-- (১) রিমোটে আছে কিন্তু রিপোতে ফাইল নেই। এদের কাজ রিপোর অন্য ভার্সনে আছে বলে")
        L.append("--     আপনি যাচাই করে থাকলেই এই রো মুছুন (CLI-র 'migration repair --status reverted' এর সমতুল্য)।")
        for v in remote_only:
            L.append(f"--   {v}  {remote.get(v, '')}")
        L.append("delete from supabase_migrations.schema_migrations where version in (")
        L.append("  " + ", ".join(f"'{v}'" for v in remote_only))
        L.append(");")
    if safe_insert:
        L.append("\n-- (২) রিপোর ফাইল, যার প্রভাব প্রোডাকশনে ইতিমধ্যে আছে ('migration repair --status applied')।")
        L.append("insert into supabase_migrations.schema_migrations (version, name) values")
        rows = []
        for v in safe_insert:
            name = re.sub(r"\.sql$", "", local[v][len(v) + 1:]).replace("'", "''")
            rows.append(f"  ('{v}', '{name}')")
        L.append(",\n".join(rows))
        L.append("on conflict (version) do nothing;")
    if review:
        L.append("\n-- (৩) নিচেরগুলো NOT APPLIED/PARTIAL — এখানে অন্তর্ভুক্ত নয়; db push এগুলো চালাবে:")
        for v in review:
            L.append(f"--   {v}  {local[v]}")
    if unknown:
        L.append("\n-- (৪) যাচাই অসম্ভব (শুধু grant/data) — হাতে দেখে সিদ্ধান্ত নিন; এখানে অন্তর্ভুক্ত নয়:")
        for v in unknown:
            L.append(f"--   {v}  {local[v]}")
    L.append("\nselect count(*) as history_rows_after from supabase_migrations.schema_migrations;")
    L.append("rollback;   -- ← পর্যালোচনার পর এটি বদলে  commit;  করুন")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")


# ----------------------------------------------------------------------------
# Edge Functions + secrets
# ----------------------------------------------------------------------------
def edge_functions(ref):
    tok = os.environ.get("SBP", "").strip()
    print("\n### Edge Function: রিপো বনাম ডেপ্লয়ড")
    if not tok.startswith("sbp_"):
        print("  ✗ SBP পরিবেশ-চলকে 'sbp_' দিয়ে শুরু হওয়া Personal Access Token দিন।")
        print("    (supabase.com/dashboard/account/tokens → Generate new token)")
        print("    আগের 'Invalid access token format' ত্রুটির কারণ: টোকেনটি sbp_ ফরম্যাটের ছিল না।")
        return
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/functions",
        headers={"Authorization": f"Bearer {tok}", "User-Agent": "sync-audit/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        print(f"  ✗ API ত্রুটি: HTTP {e.code} (টোকেন/প্রজেক্ট রেফ যাচাই করুন)")
        return
    except Exception as e:  # noqa: BLE001
        print(f"  ✗ সংযোগ ব্যর্থ: {e}")
        return
    deployed = {d["slug"]: d for d in data}
    repo = sorted(
        d for d in os.listdir("supabase/functions")
        if os.path.isdir(os.path.join("supabase/functions", d)) and not d.startswith("_")
    ) if os.path.isdir("supabase/functions") else []
    print(f"  রিপো ফোল্ডার: {len(repo)} | ডেপ্লয়ড: {len(deployed)}")
    for s in repo:
        if s in deployed:
            d = deployed[s]
            print(f"  ✓ {s}  (v{d.get('version')}, {d.get('status')}, verify_jwt={d.get('verify_jwt')})")
        else:
            print(f"  ✗ {s}  — রিপোতে আছে, ডেপ্লয় করা নেই")
    for s in sorted(set(deployed) - set(repo)):
        print(f"  ? {s}  — ডেপ্লয়ড আছে, রিপোতে ফোল্ডার নেই")


def secret_hashes(db):
    print("\n### Vault সিক্রেট: দৈর্ঘ্য + SHA-256-এর প্রথম ৮ অক্ষর (মান দেখানো হয় না)")
    rows, err = run_psql(
        db,
        "select name||'|'||length(decrypted_secret)||'|'||"
        "left(encode(sha256(convert_to(decrypted_secret,'UTF8')),'hex'),8) "
        "from vault.decrypted_secrets order by name",
    )
    if rows is None:
        print(f"  ✗ ব্যর্থ: {err}")
        return
    for r in rows:
        n, ln, h = r.split("|")
        print(f"  {n:<32} len={ln:<4} sha256[:8]={h}")
    print("  তুলনা: printf %s \"$মান\" | sha256sum | cut -c1-8   (Vercel/GitHub-এর মান দিয়ে)")


# ----------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--migrations", default="supabase/migrations")
    ap.add_argument("--ref", default=PROJECT_REF_DEFAULT)
    ap.add_argument("--sql-out")
    ap.add_argument("--functions", action="store_true")
    ap.add_argument("--secrets", action="store_true")
    ap.add_argument("--inventory-in", help="(পরীক্ষার জন্য) JSON ইনভেন্টরি, DB ছাড়াই")
    ap.add_argument("--inventory-out")
    a = ap.parse_args()

    if not os.path.isdir(a.migrations):
        sys.exit(f"✗ '{a.migrations}' নেই — রিপোর রুট ডিরেক্টরি থেকে চালান।")

    db = os.environ.get("DB", "")
    if a.inventory_in:
        with open(a.inventory_in, encoding="utf-8") as fh:
            inv_raw, errs = json.load(fh), {}
    else:
        if not db:
            sys.exit("✗ DB চলক খালি। আগে:  read -rs DB; export DB")
        rows, err = run_psql(db, "select 'connected'")
        if rows is None:
            sys.exit(f"✗ প্রোডাকশনে সংযোগ হয়নি, তাই কোনো তুলনা করা হলো না।\n  কারণ: {err}\n"
                     "  (এই অবস্থায় আগের স্ক্রিপ্ট সবকিছুকে ভুলভাবে REPO-ONLY দেখিয়েছিল।)")
        inv_raw, errs = fetch_inventory(db)
        if a.inventory_out:
            with open(a.inventory_out, "w", encoding="utf-8") as fh:
                json.dump(inv_raw, fh)

    inv = norm_inv(inv_raw)
    st, files = load_repo_state(a.migrations)
    if inv.get("tables") is not None and not inv["tables"]:
        sys.exit("✗ প্রোডাকশনের public টেবিল-তালিকা খালি — সম্ভবত ভুল ডাটাবেস/ব্যর্থ কুয়েরি; থামলাম।")
    report(st, files, inv, errs, a.migrations, a.sql_out)

    if a.functions:
        edge_functions(a.ref)
    if a.secrets and db:
        secret_hashes(db)


if __name__ == "__main__":
    main()

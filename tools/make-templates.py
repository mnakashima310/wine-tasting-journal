# -*- coding: utf-8 -*-
"""白・赤のCSVから、全ユーザーに配るテンプレート用SQLを作る"""
import csv, json, sys

APP = {"清澄度":"clarity","輝き":"shine","色調":"hue","濃淡":"depth","粘性":"visc","外観の印象":"imp"}
PAL = {"アタック":"attack","甘み":"sweet","酸味":"acid","タンニン分":"tannin","苦味":"bitter",
       "バランス":"balance","アルコール":"alc"}
AROMA = {"第一印象":"aromaImp","果実・花・植物":"aroma1",
         "香辛料・芳香・化学物質":"aroma2","香りの印象":"aromaAfter"}
OTHER = {"評価":"eval","適正温度":"temp","グラス":"glass"}

def split(c, sep="、"):
    return [x.strip() for x in c.split(sep) if x.strip()] if c else []

def esc(s): return s.replace("'", "''")

rows = []
for path in sys.argv[1:]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        for i, row in enumerate(csv.DictReader(f), start=1):
            row = {(k or "").strip(): (v or "").strip() for k, v in row.items()}
            if not row.get("grape"): continue
            t = row.get("type") or "red"
            ref = {
                "id": f"ref-{t}-{i:03d}", "type": t, "grape": row["grape"],
                "country": row.get("country",""), "region": row.get("region",""),
                "memo": row.get("memo",""),
                "appearance": {v: split(row.get(k,"")) for k,v in APP.items() if split(row.get(k,""))},
                "palate": {v: split(row.get(k,"")) for k,v in PAL.items() if split(row.get(k,""))},
                "finish": (split(row.get("余韻","")) or [""])[0],
                "other": {v: (split(row.get(k,""), "／") if k == "評価" else split(row.get(k,"")))
                          for k, v in OTHER.items() if row.get(k,"")},
            }
            for k, v in AROMA.items():
                ref[v] = split(row.get(k, ""))
            rows.append(ref)

o = []
o.append("-- ============================================================")
o.append("--  模範回答のテンプレート")
o.append("--  ここに入れた内容が、新しく登録したユーザー全員に自動でコピーされます。")
o.append("--  コピー後は各自のデータなので、自由に編集・削除できます。")
o.append(f"--  {len(rows)} 件")
o.append("-- ============================================================")
o.append("")
o.append("create table if not exists public.reference_templates (")
o.append("  id      text primary key,")
o.append("  grape   text, type text, country text, region text,")
o.append("  data    jsonb not null,")
o.append("  sort    int default 0")
o.append(");")
o.append("")
o.append("alter table public.reference_templates enable row level security;")
o.append('drop policy if exists "templates are readable" on public.reference_templates;')
o.append('create policy "templates are readable" on public.reference_templates')
o.append("  for select to authenticated using (true);")
o.append("")
o.append("-- 中身を入れ替える")
o.append("delete from public.reference_templates;")
o.append("insert into public.reference_templates (id, grape, type, country, region, data, sort) values")
vals = []
for i, r in enumerate(rows):
    vals.append(f"  ('{esc(r['id'])}', '{esc(r['grape'])}', '{r['type']}', "
                f"'{esc(r['country'])}', '{esc(r['region'])}', "
                f"'{esc(json.dumps(r, ensure_ascii=False))}'::jsonb, {i})")
o.append(",\n".join(vals) + ";")
o.append("")
o.append("-- ---------- 新規ユーザーへの自動コピー ----------")
o.append("create or replace function public.seed_reference_templates()")
o.append("returns trigger")
o.append("language plpgsql")
o.append("security definer")
o.append("set search_path = public")
o.append("as $$")
o.append("begin")
o.append("  insert into public.references (id, user_id, grape, type, country, region, data)")
o.append("  select t.id, new.id, t.grape, t.type, t.country, t.region, t.data")
o.append("  from public.reference_templates t")
o.append("  on conflict (user_id, id) do nothing;")
o.append("  return new;")
o.append("end;")
o.append("$$;")
o.append("")
o.append("drop trigger if exists on_auth_user_created_seed_refs on auth.users;")
o.append("create trigger on_auth_user_created_seed_refs")
o.append("  after insert on auth.users")
o.append("  for each row execute function public.seed_reference_templates();")
o.append("")
o.append("-- ---------- すでに登録済みで、模範回答を1件も持っていない人にも配る ----------")
o.append("insert into public.references (id, user_id, grape, type, country, region, data)")
o.append("select t.id, u.id, t.grape, t.type, t.country, t.region, t.data")
o.append("from auth.users u")
o.append("cross join public.reference_templates t")
o.append("where not exists (select 1 from public.references r where r.user_id = u.id)")
o.append("on conflict (user_id, id) do nothing;")
print("\n".join(o))
sys.stderr.write(f"{len(rows)} 件\n")

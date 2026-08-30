#!/usr/bin/env python3
"""
模範回答の一括登録ツール

CSV から Supabase の references テーブルに流し込む INSERT 文を作ります。

使い方:
    python import-refs.py refs.csv <あなたのuser_id> > refs.sql

  1. Supabase の SQL Editor で `select auth.uid();` ではなく
     `select id, email from auth.users;` を実行し、自分の user_id (UUID) を控える
  2. 上のコマンドで refs.sql を生成
  3. refs.sql の中身を SQL Editor に貼って Run

CSV の書式（1行目はヘッダー、区切りはカンマ）:
  type,grape,country,region,memo,清澄度,輝き,色調,濃淡,粘性,外観の印象,
  第一印象,第一アロマ,第二アロマ,第三アロマ,香りの印象,
  アタック,甘み,酸味,タンニン分,苦味,バランス,アルコール,余韻

  - type は red / white / rose / orange / sparkling
  - 複数の語を入れる欄は「、」で区切る（例: イチゴ、ラズベリー、スミレ）
  - 使わない欄は空でよい
  - 余韻は1つだけ
"""
import csv
import json
import sys
import unicodedata

TYPES = {"red", "white", "rose", "orange", "sparkling"}

APP = {"清澄度": "clarity", "輝き": "shine", "色調": "hue",
       "濃淡": "depth", "粘性": "visc", "外観の印象": "imp"}
PAL = {"アタック": "attack", "甘み": "sweet", "酸味": "acid",
       "タンニン分": "tannin", "苦味": "bitter", "バランス": "balance",
       "アルコール": "alc"}
AROMA = {"第一印象": "aromaImp", "第一アロマ": "aroma1", "第二アロマ": "aroma2",
         "第三アロマ": "aroma3", "香りの印象": "aromaAfter"}


def split(cell):
    if not cell:
        return []
    s = unicodedata.normalize("NFKC", cell)
    for sep in ("、", ",", "／", "/", "|"):
        s = s.replace(sep, "\u0001")
    return [x.strip() for x in s.split("\u0001") if x.strip()]


def esc(s):
    return s.replace("'", "''")


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    path, user_id = sys.argv[1], sys.argv[2]

    rows = []
    with open(path, encoding="utf-8-sig", newline="") as f:
        for i, row in enumerate(csv.DictReader(f), start=1):
            row = {(k or "").strip(): (v or "").strip() for k, v in row.items()}
            grape = row.get("grape", "")
            if not grape:
                continue
            t = row.get("type", "").strip() or "red"
            if t not in TYPES:
                sys.stderr.write(f"[警告] {i}行目: type '{t}' は不正です。red として扱います\n")
                t = "red"

            ref = {
                "id": f"ref-{t}-{i:03d}",
                "type": t,
                "grape": grape,
                "country": row.get("country", ""),
                "region": row.get("region", ""),
                "memo": row.get("memo", ""),
                "appearance": {v: split(row.get(k, "")) for k, v in APP.items() if split(row.get(k, ""))},
                "palate": {v: split(row.get(k, "")) for k, v in PAL.items() if split(row.get(k, ""))},
                "finish": (split(row.get("余韻", "")) or [""])[0],
            }
            for k, v in AROMA.items():
                ref[v] = split(row.get(k, ""))

            rows.append(ref)

    if not rows:
        sys.exit("CSV から読み取れる行がありませんでした")

    print("-- 模範回答の一括登録")
    print(f"-- {len(rows)} 件")
    print("insert into public.references (id, user_id, grape, type, country, region, data) values")
    vals = []
    for r in rows:
        vals.append(
            f"  ('{esc(r['id'])}', '{user_id}', '{esc(r['grape'])}', '{r['type']}', "
            f"'{esc(r['country'])}', '{esc(r['region'])}', '{esc(json.dumps(r, ensure_ascii=False))}'::jsonb)"
        )
    print(",\n".join(vals))
    print("on conflict (user_id, id) do update set")
    print("  grape = excluded.grape, type = excluded.type,")
    print("  country = excluded.country, region = excluded.region,")
    print("  data = excluded.data, updated_at = now();")
    sys.stderr.write(f"{len(rows)} 件のINSERT文を出力しました\n")


if __name__ == "__main__":
    main()

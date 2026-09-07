# アーティファクト版 App を、Supabase 版 src/App.jsx に変換するスクリプト
src = open('/mnt/user-data/outputs/wine-tasting-notebook-v3.jsx').read()

src = src.replace('import * as XLSX from "xlsx";',
'''import { supabase } from "./lib/supabase";
import {
  loadNotes, saveNotes, savePhoto, loadPhoto, deletePhoto,
  loadOpts, saveOpts, loadRefs, saveRefs, loadTemplates,
} from "./lib/store";

/** Claude API（従量課金）を使うかどうか。.env の VITE_ENABLE_AI で切り替える */
const AI = import.meta.env.VITE_ENABLE_AI === "true";''')

a = src.index('/* ================= storage ================= */')
b = src.index('/* ================= Claude API ================= */')
src = src[:a] + src[b:]

old = src[src.index('async function callClaude(content) {'):src.index('const readLabel =')]
src = src.replace(old, '''async function callClaude(content) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  const txt = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  const clean = txt.replace(/```json|```/g, "").trim();
  return JSON.parse(clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1));
}

''')

# Excel は必要になったときだけ読み込む
src = src.replace('function exportExcel(notes, refs) {',
                  'async function exportExcel(notes, refs) {\n  const XLSX = await import("xlsx");')
src = src.replace('try { exportExcel(notes, refs); setToast("Excelを書き出しました"); }',
                  'exportExcel(notes, refs).then(() => setToast("Excelを書き出しました"))')
src = src.replace('catch { setToast("書き出せませんでした"); }',
                  '.catch(() => setToast("書き出せませんでした"));')

# 写真・選択肢はサーバー保存
src = src.replace('    try { await window.storage.delete(`wn:photo:${id}`); } catch {}', '    await deletePhoto(id);')

# AI を使わない設定のときは、読み取りと候補提案を隠す
src = src.replace('        setPhoto(d); doRead(d);', '        setPhoto(d); if (AI) doRead(d);')
src = src.replace('        {photo && <button className="read" onClick={() => doRead()} disabled={reading}>{reading ? "読み取り中…" : "もう一度読み取る"}</button>}',
                  '        {AI && photo && <button className="read" onClick={() => doRead()} disabled={reading}>{reading ? "読み取り中…" : "ラベルから読み取る"}</button>}')
src = src.replace('''            {!f.blind.done && (
              <>
                <button className="assist"''','''            {AI && !f.blind.done && (
              <>
                <button className="assist"''')

# 模範回答の初期セットを戻せるようにする
src = src.replace('  const upsertRef = async (r) => {', '''  const restoreRefs = async () => {
    const tpl = await loadTemplates();
    if (!tpl.length) { setToast("初期セットが見つかりませんでした"); return; }
    const add = tpl.filter((t) => !refs.some((r) => r.id === t.id));
    if (!add.length) { setToast("すでに全て入っています"); return; }
    const next = [...refs, ...add];
    setRefs(next); await saveRefs(next);
    setToast(`初期セットから${add.length}件を戻しました`);
  };

  const upsertRef = async (r) => {''')
src = src.replace('<RefList refs={refs} opts={opts} addOpt={addOpt} onSave={upsertRef} onDelete={removeRef} />',
                  '<RefList refs={refs} opts={opts} addOpt={addOpt} onSave={upsertRef} onDelete={removeRef} onRestore={restoreRefs} />')

# 認証まわり
src = src.replace('export default function App() {', 'export default function App({ user, onSignOut }) {')
src = src.replace('      <header className="hd"><h1>Wine Tasting Journal</h1></header>',
'''      <header className="hd">
        <h1>Wine Tasting Journal</h1>
        <button className="hd-out" onClick={onSignOut} title={`${user?.email || ""} — ログアウト`} aria-label="ログアウト">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4h3a1 1 0 011 1v14a1 1 0 01-1 1h-3" /><path d="M10 16l-4-4 4-4" /><path d="M6 12h9" />
          </svg>
        </button>
      </header>''')
src = src.replace('.tabs{display:flex;background:var(--paper);',
'''.hd-out{flex:none;display:flex;align-items:center;justify-content:center;width:38px;height:38px;color:#fff;border:1px solid rgba(255,255,255,.45);border-radius:2px}
.hd-out:active{background:rgba(255,255,255,.14)}
.tabs{display:flex;background:var(--paper);''')

open('src/App.jsx', 'w').write(src)
print('src/App.jsx を生成しました:', len(src.split('\n')), '行')

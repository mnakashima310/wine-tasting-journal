import { supabase } from "./supabase";

/* ------------------------------------------------------------------
   保存先。RLS により、どのクエリも自分の行しか触れない。

   【重要】書き込みは「触れた1件だけ」を対象にする。
   一覧を丸ごと送って差分削除する作りは、読み込みに失敗したときに
   全件を消す事故を起こすため廃止した。
   削除は deleteNote / deleteRef を明示的に呼んだときだけ実行する。
------------------------------------------------------------------ */

const uid = async () => (await supabase.auth.getUser()).data.user?.id;

/** 読み込みに成功したかどうか。失敗している間は一切書き込まない。 */
let notesLoaded = false;
let refsLoaded = false;

const toRow = (n, user_id) => ({
  id: String(n.id),
  user_id,
  date: n.date || null,
  type: n.type || null,
  name: n.name || null,
  producer: n.producer || null,
  country: n.country || null,
  region: n.region || null,
  grape: n.grape || null,
  vintage: n.vintage || null,
  alcohol: n.alcohol || null,
  rating: n.rating || 0,
  is_blind: !!n.blind?.on,
  grape_correct: n.blind?.on ? !!n.blind.judge?.grape : null,
  has_photo: !!n.hasPhoto,
  data: n,
  updated_at: new Date().toISOString(),
});

/* ---------------- 端末内の控え ----------------
   通信とは別に、読み書きした内容を端末にも残す。
   万一サーバー側が空になっても、ここから戻せる。 */
const BK = "wtj:backup:notes";
const backupSave = (notes) => {
  try {
    if (!Array.isArray(notes) || !notes.length) return;
    localStorage.setItem(BK, JSON.stringify({ at: Date.now(), notes }));
  } catch {}
};
export const backupRead = () => {
  try {
    const raw = localStorage.getItem(BK);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

/* ---------------- 記録 ---------------- */
export async function loadNotes() {
  const { data, error } = await supabase
    .from("notes")
    .select("data")
    .order("date", { ascending: false });
  if (error) {
    console.error(error);
    notesLoaded = false;
    throw new Error("記録を読み込めませんでした");
  }
  notesLoaded = true;
  const notes = (data || []).map((r) => r.data).filter(Boolean);
  backupSave(notes);
  return notes;
}

/** 1件だけ保存する。既存の他の行には一切触れない。 */
export async function saveNote(note, allNotes) {
  if (!notesLoaded) { console.error("未読み込みのため保存を中止しました"); return false; }
  const user_id = await uid();
  if (!user_id) return false;
  const { error } = await supabase
    .from("notes")
    .upsert([toRow(note, user_id)], { onConflict: "user_id,id" });
  if (error) { console.error(error); return false; }
  backupSave(allNotes);
  return true;
}

/** 明示的に削除したときだけ呼ぶ。 */
export async function deleteNote(id, allNotes) {
  if (!notesLoaded) return false;
  const { error } = await supabase.from("notes").delete().eq("id", String(id));
  if (error) { console.error(error); return false; }
  backupSave(allNotes);
  return true;
}

/** 端末の控えからサーバーへ書き戻す（復元用）。 */
export async function restoreFromBackup() {
  const bk = backupRead();
  if (!bk?.notes?.length) return 0;
  const user_id = await uid();
  if (!user_id) return 0;
  const rows = bk.notes.map((n) => toRow(n, user_id));
  const { error } = await supabase.from("notes").upsert(rows, { onConflict: "user_id,id" });
  if (error) { console.error(error); return 0; }
  return rows.length;
}

/* ---------------- 写真：Storage バケット labels ---------------- */
const path = async (id) => `${await uid()}/${id}.jpg`;

const dataUrlToBlob = (d) => {
  const [head, b64] = d.split(",");
  const mime = head.match(/:(.*?);/)[1];
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
};

export async function savePhoto(id, dataUrl) {
  try {
    const { error } = await supabase.storage
      .from("labels")
      .upload(await path(id), dataUrlToBlob(dataUrl), { upsert: true, contentType: "image/jpeg" });
    if (error) console.error(error);
  } catch (e) { console.error(e); }
}

export async function loadPhoto(id) {
  try {
    const { data, error } = await supabase.storage.from("labels").download(await path(id));
    if (error || !data) return null;
    return await new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(data);
    });
  } catch { return null; }
}

export async function deletePhoto(id) {
  try { await supabase.storage.from("labels").remove([await path(id)]); } catch {}
}

/* ---------------- 自分で足した選択肢 ---------------- */
export async function loadOpts() {
  const { data, error } = await supabase.from("user_options").select("key,value");
  if (error) { console.error(error); return {}; }
  const out = {};
  (data || []).forEach(({ key, value }) => { (out[key] ||= []).push(value); });
  return out;
}

/** 追加された1件だけを足す。既存は消さない。 */
export async function saveOpts(key, value) {
  const user_id = await uid();
  if (!user_id) return;
  const { error } = await supabase
    .from("user_options")
    .upsert([{ user_id, key, value }], { onConflict: "user_id,key,value" });
  if (error) console.error(error);
}

/* ---------------- 品種ごとの模範回答 ---------------- */
export async function loadRefs() {
  const { data, error } = await supabase
    .from("references")
    .select("data")
    .order("grape", { ascending: true });
  if (error) {
    console.error(error);
    refsLoaded = false;
    throw new Error("模範回答を読み込めませんでした");
  }
  refsLoaded = true;
  return (data || []).map((r) => r.data).filter(Boolean);
}

const refRow = (r, user_id) => ({
  id: String(r.id), user_id,
  grape: r.grape || null, type: r.type || null,
  country: r.country || null, region: r.region || null,
  data: r, updated_at: new Date().toISOString(),
});

/** 1件だけ保存する。 */
export async function saveRefs(refs, target) {
  if (!refsLoaded) { console.error("未読み込みのため保存を中止しました"); return false; }
  const user_id = await uid();
  if (!user_id) return false;
  const list = target ? [target] : refs;
  if (!list.length) return true;
  const { error } = await supabase
    .from("references")
    .upsert(list.map((r) => refRow(r, user_id)), { onConflict: "user_id,id" });
  if (error) { console.error(error); return false; }
  return true;
}

export async function deleteRef(id) {
  if (!refsLoaded) return false;
  const { error } = await supabase.from("references").delete().eq("id", String(id));
  if (error) { console.error(error); return false; }
  return true;
}

/* ---------------- 全ユーザー共通のテンプレート ---------------- */
export async function loadTemplates() {
  const { data, error } = await supabase
    .from("reference_templates")
    .select("data")
    .order("sort", { ascending: true });
  if (error) { console.error(error); return []; }
  return (data || []).map((r) => r.data);
}

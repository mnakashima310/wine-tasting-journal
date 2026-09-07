import { supabase } from "./supabase";

/* ------------------------------------------------------------------
   記録の保存先。RLS により、どのクエリも自分の行しか触れない。
   アプリ側の note オブジェクトは data(jsonb) に丸ごと入れ、
   検索や集計に使う項目だけ列としても持たせる。
------------------------------------------------------------------ */

const uid = async () => (await supabase.auth.getUser()).data.user?.id;

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

export async function loadNotes() {
  const { data, error } = await supabase
    .from("notes")
    .select("data")
    .order("date", { ascending: false });
  if (error) { console.error(error); return []; }
  return (data || []).map((r) => r.data);
}

/** アプリ側は配列まるごと渡してくる。差分を upsert / delete する。 */
export async function saveNotes(notes) {
  const user_id = await uid();
  if (!user_id) return false;

  const rows = notes.map((n) => toRow(n, user_id));
  const { error: upErr } = await supabase.from("notes").upsert(rows, { onConflict: "user_id,id" });
  if (upErr) { console.error(upErr); return false; }

  const keep = rows.map((r) => r.id);
  const { data: existing } = await supabase.from("notes").select("id");
  const gone = (existing || []).map((r) => r.id).filter((id) => !keep.includes(id));
  if (gone.length) {
    const { error: delErr } = await supabase.from("notes").delete().in("id", gone);
    if (delErr) { console.error(delErr); return false; }
  }
  return true;
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

export async function saveOpts(opts) {
  const user_id = await uid();
  if (!user_id) return;
  const rows = Object.entries(opts).flatMap(([key, vals]) =>
    (vals || []).map((value) => ({ user_id, key, value })));
  if (!rows.length) return;
  const { error } = await supabase
    .from("user_options")
    .upsert(rows, { onConflict: "user_id,key,value" });
  if (error) console.error(error);
}

/* ---------------- 品種ごとの模範回答 ---------------- */
export async function loadRefs() {
  const { data, error } = await supabase
    .from("references")
    .select("data")
    .order("grape", { ascending: true });
  if (error) { console.error(error); return []; }
  return (data || []).map((r) => r.data);
}

export async function saveRefs(refs) {
  const user_id = await uid();
  if (!user_id) return false;

  const rows = refs.map((r) => ({
    id: String(r.id), user_id,
    grape: r.grape || null, type: r.type || null,
    country: r.country || null, region: r.region || null,
    data: r, updated_at: new Date().toISOString(),
  }));
  if (rows.length) {
    const { error } = await supabase.from("references").upsert(rows, { onConflict: "user_id,id" });
    if (error) { console.error(error); return false; }
  }
  const keep = rows.map((r) => r.id);
  const { data: existing } = await supabase.from("references").select("id");
  const gone = (existing || []).map((r) => r.id).filter((id) => !keep.includes(id));
  if (gone.length) await supabase.from("references").delete().in("id", gone);
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

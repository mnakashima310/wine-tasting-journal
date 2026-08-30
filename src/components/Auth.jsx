import React, { useState } from "react";
import { supabase } from "../lib/supabase";

const CSS = `
.auth{min-height:100vh;background:#F4F0EA;display:flex;align-items:center;justify-content:center;padding:24px;
  font-family:"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic Medium","Noto Sans JP",system-ui,sans-serif;color:#2E2A28}
.auth-box{width:100%;max-width:380px}
.auth-hd{background:#6B1D1F;color:#fff;padding:26px 20px;text-align:center;border-radius:2px 2px 0 0}
.auth-hd h1{font-family:"Didot","Bodoni 72","Playfair Display",Georgia,"Hiragino Mincho ProN","Yu Mincho",serif;
  font-size:23px;font-weight:400;letter-spacing:.12em;margin:0}
.auth-body{background:#fff;border:1px solid #D5CCC2;border-top:none;border-radius:0 0 2px 2px;padding:24px 20px}
.auth-tabs{display:flex;margin-bottom:20px;border-bottom:1px solid #D5CCC2}
.auth-tabs button{flex:1;padding:11px 0;font-size:14px;font-weight:600;color:#5C544F;border-bottom:2px solid transparent;
  margin-bottom:-1px;background:none;border-top:none;border-left:none;border-right:none;cursor:pointer;font-family:inherit}
.auth-tabs button.on{color:#6B1D1F;border-bottom-color:#6B1D1F}
.auth label{display:block;font-size:12.5px;font-weight:600;color:#5C544F;margin-bottom:6px}
.auth input{width:100%;padding:12px;border:1px solid #D5CCC2;border-radius:2px;font-size:16px;margin-bottom:14px;
  font-family:inherit;color:#2E2A28;box-sizing:border-box}
.auth input:focus{outline:2px solid #6B1D1F;outline-offset:-1px}
.auth-go{width:100%;padding:15px;background:#6B1D1F;color:#fff;border:none;border-radius:2px;font-size:15px;
  font-weight:600;letter-spacing:.16em;cursor:pointer;font-family:inherit}
.auth-go:disabled{opacity:.5}
.auth-msg{margin-top:14px;font-size:13px;line-height:1.8;padding:11px;border-radius:2px}
.auth-msg.err{background:#F6E7E6;color:#8C1F1B}
.auth-msg.ok{background:#E6EFE6;color:#255029}
.auth-note{margin-top:18px;font-size:12px;color:#5C544F;line-height:1.8}
`;

export default function Auth() {
  const [mode, setMode] = useState("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const go = async () => {
    setBusy(true); setMsg(null);
    const fn = mode === "in" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn.call(supabase.auth, { email: email.trim(), password: pw });
    if (error) {
      setMsg({ t: "err", m: error.message });
    } else if (mode === "up") {
      setMsg({ t: "ok", m: "確認メールを送りました。リンクを開くとログインできます。" });
    }
    setBusy(false);
  };

  return (
    <div className="auth">
      <style>{CSS}</style>
      <div className="auth-box">
        <div className="auth-hd"><h1>Wine Tasting Journal</h1></div>
        <div className="auth-body">
          <div className="auth-tabs">
            <button className={mode === "in" ? "on" : ""} onClick={() => { setMode("in"); setMsg(null); }}>ログイン</button>
            <button className={mode === "up" ? "on" : ""} onClick={() => { setMode("up"); setMsg(null); }}>新規登録</button>
          </div>

          <label htmlFor="em">メールアドレス</label>
          <input id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label htmlFor="pw">パスワード</label>
          <input id="pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"}
            value={pw} onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") go(); }} />

          <button className="auth-go" onClick={go} disabled={busy || !email.trim() || pw.length < 6}>
            {busy ? "処理中…" : mode === "in" ? "ログイン" : "登録する"}
          </button>

          {msg && <div className={"auth-msg " + msg.t}>{msg.m}</div>}

          <p className="auth-note">
            記録・写真・自分で足した選択肢は、すべてアカウントごとに分けて保存されます。
            パスワードは6文字以上。
          </p>
        </div>
      </div>
    </div>
  );
}

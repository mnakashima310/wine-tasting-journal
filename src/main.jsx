import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./lib/supabase";
import Auth from "./components/Auth";
import App from "./App";
import "./index.css";

function Root() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div style={{ padding: 60, textAlign: "center", color: "#5C544F" }}>読み込んでいます…</div>;
  if (!session) return <Auth />;
  return <App user={session.user} onSignOut={() => supabase.auth.signOut()} />;
}

createRoot(document.getElementById("root")).render(<Root />);

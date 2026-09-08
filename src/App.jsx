import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./lib/supabase";
import {
  loadNotes, saveNotes, savePhoto, loadPhoto, deletePhoto,
  loadOpts, saveOpts, loadRefs, saveRefs, loadTemplates,
} from "./lib/store";

/** Claude API（従量課金）を使うかどうか。.env の VITE_ENABLE_AI で切り替える */
const AI = import.meta.env.VITE_ENABLE_AI === "true";

/* ============================================================
   風味手帖 v3 — ワインの味を「言葉にする」練習帳
   ============================================================ */

const CSS = `
:root{
  --wine:#6B1D1F; --wine-d:#511518; --wine-l:#8A3234;
  --paper:#F4F0EA; --card:#FFFFFF; --sand:#E6DFD5;
  --ink:#2E2A28; --sub:#5C544F; --line:#D5CCC2;
  --serif:"Didot","Bodoni 72","Playfair Display",Georgia,"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;
  --sans:"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic Medium","YuGothic","Noto Sans JP","Helvetica Neue",Arial,system-ui,sans-serif;
  --mono:ui-monospace,"SFMono-Regular",Menlo,monospace;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.wn{font-family:var(--sans);background:var(--paper);color:var(--ink);min-height:100%;max-width:540px;margin:0 auto;padding-bottom:96px;position:relative;font-weight:400;line-height:1.7}
.wn button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
.wn input,.wn textarea{font-family:inherit}

.hd{background:var(--wine);color:#fff;padding:calc(15px + env(safe-area-inset-top)) 18px 14px;display:flex;align-items:center;gap:12px}
.hd h1{flex:1;font-family:var(--serif);font-size:20px;letter-spacing:.1em;margin:0;font-weight:400;line-height:1.3}
.hd-out{flex:none;display:flex;align-items:center;justify-content:center;width:38px;height:38px;color:#fff;border:1px solid rgba(255,255,255,.45);border-radius:2px}
.hd-out:active{background:rgba(255,255,255,.14)}
.tabs{display:flex;background:var(--paper);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20;padding-top:env(safe-area-inset-top)}
.tab{flex:1;padding:15px 0 13px;font-size:14px;font-weight:600;letter-spacing:.14em;color:var(--sub);border-bottom:2px solid transparent;margin-bottom:-1px}
.tab.on{color:var(--wine);font-weight:600;border-bottom-color:var(--wine);background:var(--paper)}
.tab-n{display:inline-block;margin-left:8px;min-width:22px;padding:2px 7px;border-radius:11px;background:var(--sand);color:var(--sub);font-size:11.5px;font-weight:600;letter-spacing:0;vertical-align:1px;font-family:var(--mono)}
.tab.on .tab-n{background:var(--wine);color:#fff}
.segs{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.segs button{padding:12px 0;background:var(--card);border:1px solid var(--line);border-radius:2px;font-size:14px;font-weight:600;color:var(--sub)}
.segs button.on{background:var(--wine);color:#fff;border-color:var(--wine)}

.step{padding:30px 20px 14px}
.step+.step{border-top:1px solid var(--line)}
.step-hd{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.step-n{font-family:var(--serif);font-size:17px;font-weight:400;color:var(--wine);letter-spacing:.06em}
.step-t{font-family:var(--serif);font-size:22px;font-weight:400;letter-spacing:.09em}
.step-hd::after{content:"";flex:1;height:1px;background:var(--line)}
.step-hd.tap{cursor:pointer}
.step-ar{order:3;font-size:12px;font-weight:600;color:var(--wine);white-space:nowrap;margin-left:10px}
.step-hd.tap::after{order:2}
.step-d{font-size:13px;color:var(--sub);line-height:1.85;margin:0 0 18px}

.fld{margin-bottom:14px}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.lab{display:block;font-size:12.5px;font-weight:600;color:var(--sub);margin-bottom:6px}
.req{color:#C0392B;font-weight:600;margin-left:2px}
.savehint{font-size:12px;color:var(--sub);text-align:center;margin-top:8px}
.inp{width:100%;padding:11px 12px;background:var(--card);border:1px solid var(--line);border-radius:2px;font-size:16px;color:var(--ink);line-height:1.5}
.inp::placeholder{color:#8C837D}
.inp:focus{outline:2px solid var(--wine);outline-offset:-1px}
textarea.inp{min-height:80px;resize:vertical;line-height:1.8;font-size:15px}

.seg2{display:flex;gap:8px}
.seg2 button{flex:1;padding:12px 0;background:var(--card);border:1px solid var(--line);border-radius:2px;font-size:14.5px;font-weight:600;color:var(--sub)}
.seg2 button.on{background:var(--wine);color:#fff;border-color:var(--wine)}

.toggle{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:2px;padding:14px;margin-bottom:12px;width:100%;text-align:left}
.toggle-b{width:42px;height:24px;border-radius:12px;background:#B9B0A7;position:relative;flex:none;transition:background .2s}
.toggle-b i{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .2s}
.toggle.on .toggle-b{background:var(--wine)}
.toggle.on .toggle-b i{transform:translateX(18px)}
.toggle-t{font-size:14.5px;font-weight:600}
.toggle-d{font-size:12.5px;color:var(--sub);margin-top:3px;line-height:1.6;display:block}

.combo{position:relative}
.addbox{margin-top:10px}
.combo-list{position:absolute;z-index:40;left:0;right:0;top:calc(100% + 4px);background:var(--card);border:1px solid var(--wine);border-radius:2px;max-height:220px;overflow-y:auto;box-shadow:0 8px 20px rgba(46,42,40,.18)}
.combo-list button{display:block;width:100%;text-align:left;padding:12px;font-size:15px;border-bottom:1px solid var(--line)}
.combo-list button:last-child{border-bottom:none}
.combo-list button.add{color:var(--wine);font-weight:600;font-size:14px}
.combo-list .ch{padding:12px;font-size:13px;color:var(--sub)}

.photo-btn{width:100%;aspect-ratio:4/3;background:var(--card);border:1px dashed #A89E96;border-radius:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--sub);font-size:14px;font-weight:600;overflow:hidden}
.photo-btn img{width:100%;height:100%;object-fit:cover}
.read{width:100%;margin-top:10px;padding:13px;background:var(--card);color:var(--wine);border:1px solid var(--wine);border-radius:2px;font-size:13.5px;font-weight:600;letter-spacing:.14em}
.read:disabled{opacity:.55}
.read-note{font-size:12.5px;color:var(--sub);margin-top:9px;line-height:1.75}

.ax{margin-bottom:20px}
.ax-h{display:flex;align-items:baseline;gap:8px;margin-bottom:4px}
.ax-n{font-family:var(--serif);font-size:18px;font-weight:400;letter-spacing:.06em}
.ax-cnt{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--wine)}
.ax-d{font-size:12.5px;color:var(--sub);margin:0 0 10px;line-height:1.75}
.opts{display:flex;flex-wrap:wrap;gap:6px}
.opt{padding:9px 13px;background:var(--card);border:1px solid var(--line);border-radius:2px;font-size:14px;color:var(--ink)}
.opt.on{background:var(--wine);color:#fff;border-color:var(--wine);font-weight:600}
.opt.cust{border-style:dashed;border-color:#A89E96}
.opt.cust.on{border-style:solid}

.wcard{background:var(--wine);color:#fff;border-radius:2px;padding:13px 14px;margin:9px 0 3px;animation:rise .18s ease-out}
.wcard-h{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.wcard-dot{width:9px;height:9px;border-radius:50%;flex:none;border:1px solid rgba(255,255,255,.6)}
.wcard-w{font-family:var(--serif);font-size:17px;font-weight:400;letter-spacing:.06em}
.wcard-c{font-size:12px;color:rgba(255,255,255,.82);margin-left:auto}
.wcard-b{font-size:13.5px;line-height:1.8;color:#fff}
@keyframes rise{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}

.grp-t{font-size:11.5px;font-weight:600;letter-spacing:.18em;color:var(--sub);margin:18px 0 9px}
.picked{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.ptag{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;background:var(--sand);border-radius:2px;font-size:13.5px}
.ptag b{width:8px;height:8px;border-radius:50%}
.ptag i{font-style:normal;color:var(--sub);font-size:16px;line-height:1;font-weight:600}

.stars{display:flex;gap:6px}
.stars button{width:42px;height:42px;font-size:26px;line-height:1;color:#C6BCB2}
.stars button.on{color:var(--wine)}

.blind{background:var(--card);border:1px solid var(--line);border-radius:2px;padding:16px;margin-top:4px}
.locked{background:var(--card);border:1px dashed #A89E96;border-radius:2px;padding:18px;font-size:13.5px;line-height:1.9;color:var(--sub);text-align:center}
.finish{width:100%;margin-top:16px;padding:16px;background:var(--card);color:var(--wine);border:1px solid var(--wine);border-radius:2px;font-size:14px;font-weight:600;letter-spacing:.18em}
.assist{width:100%;padding:15px;background:var(--wine);color:#fff;border-radius:2px;font-size:14px;font-weight:600;letter-spacing:.16em;margin-bottom:16px}
.assist:disabled{opacity:.55}
.cand{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--wine);border-radius:2px;padding:14px;margin-bottom:9px;width:100%;text-align:left}
.cand-t{font-family:var(--serif);font-size:19px;font-weight:400;letter-spacing:.05em;margin-bottom:5px}
.cand-s{font-size:13px;color:var(--sub);margin-bottom:7px}
.cand-r{font-size:13.5px;line-height:1.8}
.advice{font-size:13.5px;line-height:1.85;color:var(--ink);background:var(--sand);padding:13px;border-radius:2px;margin-bottom:12px}

.cmp{background:var(--card);border:1px solid var(--line);border-radius:2px;padding:14px;margin-bottom:10px}
.cmp-h{display:flex;align-items:center;gap:7px;margin-bottom:10px}
.cmp-n{flex:1;font-family:var(--serif);font-size:17px;font-weight:400;letter-spacing:.05em}
.cmp .inp.mine{background:var(--sand);border-style:dashed}
.jb{width:42px;height:36px;border:1px solid var(--line);border-radius:2px;font-size:17px;color:var(--sub);background:var(--card);flex:none;font-weight:600}
.jb.ok{background:#2C5A34;color:#fff;border-color:#2C5A34}
.jb.ng{background:var(--wine);color:#fff;border-color:var(--wine)}

.acc{border:1px solid var(--line);border-radius:2px;margin-bottom:9px;background:var(--card);overflow:hidden}
.acc-h{width:100%;text-align:left;padding:15px;font-family:var(--serif);font-size:17px;font-weight:400;letter-spacing:.05em;display:flex;align-items:center;gap:8px}
.acc-h em{font-style:normal;margin-left:auto;font-size:13px;font-weight:400;color:var(--sub)}
.acc-b{border-top:1px solid var(--line);padding:14px;background:var(--paper)}
.mine-row{font-size:13px;color:var(--sub);line-height:1.7;margin-bottom:7px}
.mine-row b{font-weight:600;color:var(--ink)}

.savebar{position:fixed;bottom:0;left:0;right:0;max-width:540px;margin:0 auto;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:rgba(244,240,234,.97);backdrop-filter:blur(9px);border-top:1px solid var(--line);z-index:30}
.tab{letter-spacing:.06em}
.fab{position:fixed;right:14px;bottom:86px;z-index:25;background:var(--wine);color:#fff;border-radius:2px;
  padding:11px 13px;font-size:11.5px;font-weight:600;line-height:1.45;text-align:center;box-shadow:0 3px 10px rgba(46,42,40,.3)}
.sheet{position:fixed;inset:0;background:rgba(46,42,40,.55);z-index:80;display:flex;align-items:flex-end;justify-content:center}
.sheet-in{background:var(--paper);width:100%;max-width:540px;max-height:88vh;overflow-y:auto;border-radius:4px 4px 0 0}
.sheet-hd{position:sticky;top:0;background:var(--paper);display:flex;align-items:center;gap:10px;padding:15px 18px;border-bottom:1px solid var(--line);z-index:2}
.sheet-hd span{flex:1;font-family:var(--serif);font-size:18px;letter-spacing:.06em}
.sheet-body{padding:16px 18px 30px}
.cmpr{background:var(--card);border:1px solid var(--line);border-radius:2px;padding:11px 12px;margin-bottom:7px}
.cmpr-l{font-size:12px;font-weight:600;color:var(--sub);margin-bottom:7px}
.cmpr-b{display:flex;gap:9px;align-items:flex-start;padding:3px 0}
.cmpr-k{font-size:11px;font-weight:600;color:var(--sub);width:30px;flex:none;padding-top:4px}
.cmpr-t{flex:1;display:flex;flex-wrap:wrap;gap:4px}
.cmpr-t i{font-style:normal;font-size:12.5px;padding:3px 8px;border-radius:2px;border:1px solid var(--line);color:var(--sub)}
.cmpr-t i.hit{background:var(--wine);border-color:var(--wine);color:#fff;font-weight:600}
.cmpr-t em{font-style:normal;font-size:12.5px;color:var(--sub);padding-top:3px}
.cmpr-sum{font-size:13.5px;line-height:1.8;background:var(--sand);padding:12px;border-radius:2px;margin-bottom:14px}
.cmpr-sum b{font-weight:600;color:var(--wine);font-size:15px}
.cmp-toggle{width:100%;padding:14px;background:var(--card);border:1px solid var(--wine);color:var(--wine);border-radius:2px;font-size:14px;font-weight:600;letter-spacing:.08em;margin-bottom:4px}
.cmp-toggle.on{background:var(--wine);color:#fff}
.cmp-panel{border:1px solid var(--line);border-top:none;background:var(--paper);padding:16px 14px;margin-bottom:6px}
.refview .rv-line{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);align-items:flex-start}
.refview .rv-line:last-child{border-bottom:none}
.rv-lb{width:92px;flex:none;font-size:12px;font-weight:600;color:var(--sub);padding-top:4px}
.rv-tg{flex:1;display:flex;flex-wrap:wrap;gap:4px}
.rv-tg i{font-style:normal;font-size:12.5px;padding:3px 8px;border-radius:2px;border:1px solid var(--line);background:var(--card);color:var(--ink)}
.rv-tg i.hit{background:var(--wine);border-color:var(--wine);color:#fff;font-weight:600}
.restore{margin-top:20px;padding:13px 22px;background:var(--card);border:1px solid var(--wine);color:var(--wine);border-radius:2px;font-size:13.5px;font-weight:600;letter-spacing:.1em}
.refcard{margin-bottom:9px}
.refmemo{margin-top:10px;padding-top:10px;border-top:1px solid var(--line);font-size:12.5px;line-height:1.8;color:var(--sub)}
.savebar-row{display:flex;gap:9px}
.cancel{padding:17px 22px;background:var(--card);border:1px solid #9C938C;border-radius:2px;font-size:14px;font-weight:600;color:var(--ink);white-space:nowrap}
.editbar{background:var(--sand);color:var(--ink);padding:12px 20px;font-size:13px;font-weight:600;letter-spacing:.06em;border-bottom:1px solid var(--line)}
.save{flex:1;padding:17px;background:var(--wine);color:#fff;border-radius:2px;font-size:15px;font-weight:600;letter-spacing:.18em;box-shadow:0 2px 6px rgba(107,29,31,.28)}
.save:active{background:var(--wine-d)}
.save:disabled{opacity:.4}

.ftabs{display:flex;gap:6px;padding:14px 20px 0;flex-wrap:wrap}
.ftabs button{padding:8px 15px;background:var(--card);border:1px solid var(--line);border-radius:2px;font-size:13.5px;font-weight:600;color:var(--sub)}
.ftabs button.on{background:var(--wine);color:#fff;border-color:var(--wine)}
.sortbar{display:flex;align-items:center;gap:7px;padding:14px 20px 6px}
.sortbar span{flex:1;font-size:11.5px;font-weight:600;letter-spacing:.18em;color:var(--sub)}
.sortbar button{padding:6px 12px;border:1px solid var(--line);border-radius:2px;background:var(--card);font-size:12.5px;font-weight:600;color:var(--sub)}
.sortbar button.on{background:var(--wine);color:#fff;border-color:var(--wine)}
.listbar{display:flex;align-items:center;gap:10px;padding:16px 20px 0}
.listbar-n{flex:1;font-size:13px;font-weight:600;color:var(--sub)}
.linkbtn{font-size:12.5px;font-weight:600;color:var(--sub);text-decoration:underline;padding:6px}
.search{margin:14px 20px 6px;position:relative}
.search .inp{padding-left:38px}
.search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%)}
.empty{text-align:center;padding:64px 34px;color:var(--sub)}
.empty .em-t{font-family:var(--serif);font-size:20px;font-weight:400;letter-spacing:.06em;color:var(--ink);margin-bottom:12px}
.empty p{font-size:13.5px;line-height:1.9;margin:0}

.card{display:block;text-align:left;background:var(--card);border:1px solid var(--line);border-radius:2px;padding:14px;margin:0 20px 10px;width:calc(100% - 40px)}
.card-t{display:flex;gap:12px;align-items:flex-start}
.card-sw{width:14px;height:38px;border-radius:2px;flex:none}
.card-nm{font-family:var(--serif);font-size:18px;font-weight:400;letter-spacing:.03em;line-height:1.45}
.card-sub{font-size:12.5px;color:var(--sub);margin-top:4px}
.card-r{margin-left:auto;text-align:right;flex:none}
.card-st{color:var(--wine);font-size:13px}
.card-dt{font-family:var(--mono);font-size:11.5px;color:var(--sub);margin-top:5px}
.card-w{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.mini{font-size:12px;padding:4px 8px;border-radius:2px;color:#fff}
.badge{display:inline-block;font-size:11.5px;font-weight:600;padding:3px 8px;border-radius:2px;margin-top:7px}
.badge.ok{background:#2C5A34;color:#fff}
.badge.ng{background:var(--wine);color:#fff}

.dt-bar{display:flex;align-items:center;gap:8px;padding:14px 20px 10px}
.dt-gap{flex:1}
.ibtn{display:inline-flex;align-items:center;gap:6px;padding:10px 15px;background:var(--card);border:1px solid var(--line);border-radius:2px;font-size:13.5px;font-weight:600;color:var(--ink);line-height:1}
.ibtn:active{background:var(--sand)}
.ibtn.danger{color:#A3231F;border-color:#DDBCBA}
.dt-hero{padding:2px 20px 0}
.dt-hero img{width:100%;border-radius:2px;display:block}
.dt-body{padding:18px 20px}
.dt-nm{font-family:var(--serif);font-size:27px;font-weight:400;letter-spacing:.04em;line-height:1.4}
.dt-sub{font-size:13px;color:var(--sub);margin-top:6px;line-height:1.75}
.comment{background:var(--wine);color:#fff;padding:26px 22px;border-radius:2px;margin:20px 0;font-size:15px;line-height:2.05;position:relative;overflow:hidden}
.comment::after{content:"W";position:absolute;right:2px;bottom:-46px;font-family:var(--serif);font-size:150px;line-height:1;color:rgba(255,255,255,.08);pointer-events:none}
.comment-l{font-size:11px;font-weight:600;letter-spacing:.26em;color:rgba(255,255,255,.9);margin-bottom:14px;position:relative}
.comment-l::after{content:"";display:block;width:32px;height:1px;background:rgba(255,255,255,.6);margin-top:10px}
.comment span{position:relative}
.dt-sec{margin-top:22px}
.dt-sec-t{font-size:11.5px;font-weight:600;letter-spacing:.2em;color:var(--sub);border-bottom:1px solid var(--line);padding-bottom:9px;margin-bottom:13px}
.dt-row{display:flex;font-size:14px;padding:6px 0;line-height:1.75}
.dt-row span:first-child{width:96px;color:var(--sub);font-size:12.5px;flex:none;padding-top:2px}
.dt-memo{font-size:14.5px;line-height:2;white-space:pre-wrap}
.diff{font-size:13.5px;line-height:1.85;padding:8px 0;border-bottom:1px solid var(--line)}
.diff:last-child{border-bottom:none}
.diff b{font-weight:600;font-size:12.5px;color:var(--sub);display:block}
.diff .ng{color:var(--wine);font-weight:600}
.diff .ok{color:#2C5A34;font-weight:600}

.rv-top{margin:18px 20px;background:var(--wine);color:#fff;border-radius:2px;padding:24px 22px;text-align:center}
.rv-top .l{font-size:11px;font-weight:600;letter-spacing:.26em;color:rgba(255,255,255,.88);margin-bottom:10px}
.rv-big{font-family:var(--serif);font-size:44px;font-weight:400;letter-spacing:.02em;line-height:1.05}
.rv-big small{font-size:14px;font-weight:400;color:rgba(255,255,255,.88);margin-left:9px}
.rv-item{background:var(--card);border:1px solid var(--line);border-radius:2px;margin:0 20px 9px;overflow:hidden}
.rv-h{display:flex;align-items:center;gap:12px;padding:14px;width:100%;text-align:left}
.rv-g{font-family:var(--serif);font-size:17px;font-weight:400;letter-spacing:.04em}
.rv-bar{flex:1;height:7px;background:var(--sand);border-radius:2px;overflow:hidden;min-width:40px}
.rv-bar i{display:block;height:100%;background:var(--wine)}
.rv-pc{font-family:var(--mono);font-size:13px;font-weight:600;width:58px;text-align:right;color:var(--sub)}
.rv-body{border-top:1px solid var(--line);padding:12px 14px;background:var(--paper)}
.rv-ar{color:var(--sub);font-size:11px;flex:none}
.rv-bar.dim{background:var(--sand);opacity:.5}
.rv-sum{font-size:12.5px;font-weight:600;color:var(--sub);margin-bottom:9px}
.rv-row{display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:var(--card);border:1px solid var(--line);border-radius:2px;padding:12px;margin-bottom:7px}
.rv-row:active{background:var(--sand)}
.rv-mk{width:26px;height:26px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600}
.rv-mk.ok{background:#2C5A34;color:#fff}
.rv-mk.ng{background:var(--wine);color:#fff}
.rv-mk.none{background:var(--sand);color:var(--sub)}
.rv-tx{flex:1;min-width:0}
.rv-tx b{display:block;font-size:14.5px;font-weight:600;line-height:1.5}
.rv-tx em{display:block;font-style:normal;font-size:12px;color:var(--sub);margin-top:2px}
.rv-tx u{display:block;text-decoration:none;font-size:12.5px;color:var(--wine);font-weight:600;margin-top:4px}
.rv-cv{color:var(--sub);font-size:19px;flex:none}

.toast{position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:13px 22px;border-radius:2px;font-size:14px;z-index:60;animation:rise .2s;max-width:88%;text-align:center;line-height:1.6}
.loading{padding:60px;text-align:center;color:var(--sub);font-size:14px}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

/* ================= 選択肢マスタ ================= */
const GRAPES = {
  red: ["カベルネ・ソーヴィニヨン", "メルロ", "ピノ・ノワール", "シラー", "グルナッシュ", "サンジョヴェーゼ", "ネッビオーロ", "テンプラニーリョ", "マルベック", "カルメネール", "ジンファンデル", "ガメイ", "カベルネ・フラン", "ムールヴェードル", "バルベーラ", "モンテプルチアーノ", "ツヴァイゲルト", "マスカット・ベーリーA"],
  white: ["シャルドネ", "ソーヴィニヨン・ブラン", "リースリング", "ピノ・グリ／グリージョ", "ゲヴュルツトラミネール", "ヴィオニエ", "シュナン・ブラン", "セミヨン", "アルバリーニョ", "ミュスカデ", "グリューナー・フェルトリーナー", "甲州", "トレッビアーノ", "ヴェルメンティーノ", "ピノ・ブラン", "モスカート"],
};
const COUNTRIES = ["フランス", "イタリア", "スペイン", "ドイツ", "ポルトガル", "オーストリア", "アメリカ", "チリ", "アルゼンチン", "オーストラリア", "ニュージーランド", "南アフリカ", "日本", "ハンガリー", "ギリシャ", "カナダ"];
const REGION_BY_COUNTRY = {
  "フランス": ["ボルドー", "ブルゴーニュ", "ローヌ", "ロワール", "アルザス", "シャンパーニュ", "ボジョレー", "ラングドック", "プロヴァンス", "ジュラ", "南西地方", "コルシカ"],
  "イタリア": ["トスカーナ", "ピエモンテ", "ヴェネト", "フリウリ", "ロンバルディア", "アブルッツォ", "マルケ", "ウンブリア", "カンパーニア", "プーリア", "シチリア", "サルデーニャ"],
  "スペイン": ["リオハ", "リベラ・デル・ドゥエロ", "プリオラート", "ルエダ", "リアス・バイシャス", "ペネデス", "ラ・マンチャ", "ヘレス"],
  "ドイツ": ["モーゼル", "ラインガウ", "ラインヘッセン", "ファルツ", "ナーエ", "バーデン", "フランケン"],
  "ポルトガル": ["ドウロ", "アレンテージョ", "ヴィーニョ・ヴェルデ", "ダン", "バイラーダ"],
  "オーストリア": ["ヴァッハウ", "カンプタール", "クレムスタール", "ブルゲンラント"],
  "アメリカ": ["ナパ・ヴァレー", "ソノマ", "パソ・ロブレス", "サンタ・バーバラ", "ウィラメット・ヴァレー", "ワシントン州", "フィンガー・レイクス"],
  "チリ": ["マイポ・ヴァレー", "カサブランカ・ヴァレー", "コルチャグア・ヴァレー", "アコンカグア", "セントラル・ヴァレー", "リマリ・ヴァレー"],
  "アルゼンチン": ["メンドーサ", "ウコ・ヴァレー", "サルタ", "パタゴニア"],
  "オーストラリア": ["バロッサ・ヴァレー", "マクラーレン・ヴェイル", "ヤラ・ヴァレー", "クナワラ", "クレア・ヴァレー", "マーガレット・リヴァー", "タスマニア"],
  "ニュージーランド": ["マールボロ", "セントラル・オタゴ", "ホークス・ベイ", "マーティンボロ"],
  "南アフリカ": ["ステレンボッシュ", "スワートランド", "ウォーカー・ベイ", "パール"],
  "日本": ["山梨", "長野", "北海道", "山形"],
  "ハンガリー": ["トカイ", "エゲル"],
  "ギリシャ": ["サントリーニ", "ナウサ", "ネメア"],
  "カナダ": ["ナイアガラ", "オカナガン"],
};
const ALL_REGIONS = [...new Set(Object.values(REGION_BY_COUNTRY).flat())];
const regionsFor = (country) => {
  const c = (country || "").trim();
  if (!c) return ALL_REGIONS;
  const hit = Object.keys(REGION_BY_COUNTRY).find((k) => k === c || k.includes(c) || c.includes(k));
  return hit ? REGION_BY_COUNTRY[hit] : ALL_REGIONS;
};

/* ================= タイプ ================= */
const TYPES = [
  { id: "red", n: "赤" }, { id: "white", n: "白" }, { id: "rose", n: "ロゼ" },
  { id: "orange", n: "オレンジ" }, { id: "sparkling", n: "泡" },
];
const typeName = (t) => (TYPES.find((x) => x.id === t) || TYPES[0]).n;
const grapesFor = (t) =>
  t === "red" ? GRAPES.red
    : t === "rose" ? [...GRAPES.red, ...GRAPES.white]
      : t === "sparkling" ? [...GRAPES.white, "ピノ・ノワール", "ピノ・ムニエ", "グレラ", "マカベオ", "シャレッロ"]
        : GRAPES.white;

/* ================= 官能の語彙 ================= */
const HUES = {
  red: ["紫がかった", "オレンジがかった", "黒みを帯びた", "縁が明るい", "ガーネット", "ルビー", "ダークチェリーレッド", "ラズベリーレッド", "トパーズ", "マホガニー", "レンガ"],
  white: ["シルバーがかった", "グリーンがかった", "レモンイエロー", "イエロー", "黄金色がかった", "黄金色", "トパーズ", "オレンジ（グリ）を帯びた", "アンバー"],
  rose: ["シルバーがかった", "オレンジ（グリ）を帯びた", "ラズベリーレッド", "ルビー", "トパーズ"],
  orange: ["黄金色", "トパーズ", "オレンジ（グリ）を帯びた", "アンバー", "マホガニー"],
};
const APP_AXES = (t) => [
  { id: "clarity", n: "清澄度", d: "濁りがないか。光にかざして見ます。", o: t === "red" ? ["澄んだ", "深みのある", "やや濁った", "濁った"] : ["澄んだ", "やや濁った", "濁った"] },
  { id: "shine", n: "輝き", d: "表面のツヤ。若いワインほど輝きます。", o: t === "red" ? ["輝きのある", "艶のある", "モヤがかかった"] : ["輝きのある", "ややくすんだ", "モヤがかかった"] },
  { id: "hue", n: "色調", d: "グラスを傾け、ふちの色を見ます。熟成すると赤は茶へ、白は濃い黄へ向かいます。", o: HUES[t] || HUES.white },
  { id: "depth", n: "濃淡", d: "色の濃さ。品種と産地の暖かさが出ます。", o: t === "red" ? ["淡い", "明るい", "やや明るい", "やや濃い", "濃い", "非常に濃い"] : ["無色に近い", "淡い", "やや濃い", "濃い", "非常に濃い"] },
  { id: "visc", n: "粘性", d: "グラスを回した時の脚の落ち方。糖とアルコールの量が出ます。", o: t === "red" ? ["さらっとした", "やや軽い", "やや強い", "強い"] : ["さらっとした", "適度な", "やや強い", "ねっとりした"] },
  {
    id: "imp", n: "外観の印象", d: "ここまでを一言でまとめます。",
    o: t === "red"
      ? ["若々しい", "若い状態を抜けた", "軽快な", "成熟度が高い", "濃縮感が強い", "やや熟成した", "熟成した", "酸化熟成のニュアンス", "酸化が進んだ"]
      : ["若々しい", "軽快な", "成熟度が高い", "濃縮感がある", "やや発展した", "熟成のニュアンスが見える", "熟成した", "酸化が進んだ", "気泡が見える", "発泡性"],
  },
];
const FIRST_IMP = (t) => t === "red"
  ? ["閉じている", "控えめ", "開いている", "ミネラリー", "強い", "華やかな", "濃縮感がある", "深みのある", "複雑な"]
  : ["閉じている", "控えめ", "開いている", "フレッシュな", "ミネラリー", "豊かな", "熟度の高い", "華やかな", "濃縮感がある", "セイボリーな", "複雑な", "力強い"];
const AROMA_IMP = (t) => t === "red"
  ? ["若々しい", "嫌気的な", "熟成感が現れている", "酸化熟成の段階にある", "酸化した", "第1アロマが強い", "第2アロマが強い", "ニュートラル", "木樽からのニュアンス"]
  : ["若々しい", "嫌気的な", "熟成感が現れている", "酸化熟成の段階にある", "成熟度が高い", "第1アロマが強い", "第2アロマが強い", "ニュートラル", "木樽からのニュアンス"];

/* 果実・花・植物（用語選択用紙の分類） */
const A1 = {
  white: [
    { cat: "果実", color: "#D6B12C", w: [
      ["柑橘類", "レモンやグレープフルーツの総称。若く冷えた白で最初に立ち、高い酸の裏づけになります。"],
      ["青リンゴ", "酸が先に来るシャキッとした果実。冷涼な産地の軽い白の定番で、若さの証拠です。"],
      ["リンゴ", "蜜を含んだ熟した果実。中庸な白に多く、青リンゴより一段温かい印象になります。"],
      ["洋梨", "とろりと甘くねっとりした果実。厚みのある白や、糖が少し残るものに出ます。"],
      ["花梨", "硬く芳しい果実。熟した白や、酸と厚みが同居するワインに使えます。"],
      ["白桃", "やわらかくふくよかな甘い香り。日照のある産地で、酸がまろやかなときに。"],
      ["アプリコット", "干した杏の凝縮感。遅摘みや貴腐など、糖が高く熟したブドウの白に。"],
      ["パイナップル", "濃く甘い南国の果実。暖かい産地や樽を使った厚い白の印です。"],
      ["マスカット", "ブドウそのものの華やかな甘い香り。香りの強い品種を特定する手がかり。"],
      ["パッションフルーツ", "飛び出すような強い香りと酸。青さを伴えば冷涼、甘さが勝てば温暖と読めます。"],
      ["バナナ", "熟したバナナ。低温発酵に由来することも多く、若く軽い白に出ます。"],
      ["マンゴー", "厚みのあるこってりした果実。アルコールが高くボディの強い白に合います。"],
      ["ライチ", "香水のように華やかで独特。ほぼ特定品種に限られ、当てる決め手になります。"],
    ] },
    { cat: "花・植物", color: "#5F8C4E", w: [
      ["スイカズラ", "みずみずしく青みのある白い花。若く酸の高い白で柑橘と一緒に立ちます。"],
      ["アカシア", "はちみつを思わせるやさしい花。軽く甘い印象の白や、少し熟成した白に。"],
      ["白バラ", "清潔で気品のある花。香りの華やかな品種で、果実の奥から現れます。"],
      ["キンモクセイ", "濃く甘い秋の花。香りが強い品種に限られ、品種特定の手がかりになります。"],
      ["柑橘類の花", "青さと甘さが同居する花。若い白で、柑橘の果実と重なって出てきます。"],
      ["菩提樹", "乾いた甘さの落ち着いた花。冷涼産地の白で、青さと蜜の中間に置ける言葉。"],
      ["ミント", "鼻に抜ける清涼感。青草より冷たく硬い印象で、標高の高い産地の白に。"],
      ["アニス", "八角のような甘く涼しい種子の香り。南仏など日照のある白に現れます。"],
      ["ヴェルヴェーヌ", "レモンバーベナ。柑橘と草の中間で、若く軽やかな白の清涼感を表せます。"],
      ["ハーブ", "乾いた薬草の複合的な青み。地中海沿いの白で、乾いた日なたの印象と結びつきます。"],
      ["タイム", "細く硬い香草。乾いた土地の白で、ハーブより輪郭のはっきりした青みです。"],
    ] },
    { cat: "木の実", color: "#8A6A3D", w: [
      ["ヘーゼルナッツ", "乾いた木の実の香ばしさ。樽熟成か、瓶で数年経った白の酸化的な表情。"],
      ["フレッシュ・アーモンド", "生の木の実の青い香ばしさ。後半のほろ苦さを旨みとして表せます。"],
    ] },
  ],
  red: [
    { cat: "果実", color: "#C0395E", w: [
      ["イチゴ", "明るく軽やかな赤い果実。色が淡くタンニンの軽い赤で最初に出てきます。"],
      ["ラズベリー", "イチゴより酸が立つ果実。冷涼産地の軽〜中程度の赤で、高い酸とセットで。"],
      ["ブルーベリー", "丸く穏やかな黒い果実。タンニンがなめらかで酸が穏やかな赤に合います。"],
      ["カシス", "黒すぐりの実。色が濃く若い赤の代表語で、青みを伴えば冷涼産地の合図。"],
      ["ブラックベリー", "カシスより甘く種っぽい厚み。日照の強い産地の、色の濃い赤に。"],
      ["ブラックチェリー", "濃厚で甘い黒さくらんぼ。ボディが強くアルコールの高い赤で厚みを表せます。"],
      ["干しプラム", "水分が抜けた凝縮した甘さ。暖かい産地か、熟成が進んだ赤の証拠です。"],
      ["乾燥イチジク", "ねっとり甘く粒感のある果実。アルコールが高く、甘さすら感じる赤に。"],
    ] },
    { cat: "花", color: "#8A5BA8", w: [
      ["バラ", "華やかで甘い香水のような花。タンニンが繊細で色の淡い赤に多く現れます。"],
      ["スミレ", "ひんやり上品な青みのある花。冷涼産地の赤で、出れば品種を絞り込めます。"],
      ["牡丹", "厚みのあるしっとりした花。中程度以上のボディの赤で、バラより落ち着いた印象。"],
      ["ゼラニウム", "青く薬草めいた花。強く出ると欠陥のこともあり、慎重に使う言葉です。"],
    ] },
    { cat: "植物", color: "#4F7A42", w: [
      ["ピーマン", "生の青野菜の硬い香り。欠点ではなく品種と冷涼さの印で、青いタンニンと同居。"],
      ["メントール", "スーッと抜ける冷たい清涼感。濃い果実と同居すれば標高の高さを示します。"],
      ["シダ", "湿った緑の下草。熟成が進み、果実が引いてきた赤で出てきます。"],
      ["ローリエ", "乾いた月桂樹の葉。香草として、熟成に向かう赤の複雑さを表します。"],
      ["杉", "乾いた針葉樹の木肌。樽と熟成が重なったボルドー型の赤に典型的です。"],
      ["針葉樹", "森の樹木の乾いた香り。冷涼で硬い印象の赤に、メントールと並べて使えます。"],
      ["ドライハーブ", "乾いた香草の束。日照のある産地や、熟成した赤の乾いた印象に。"],
      ["ユーカリ", "清涼な樹木。標高の高い産地や特定の新世界の赤の目印になります。"],
      ["トマト", "青い茎とトマトの酸。イタリア系の赤で、酸が高く旨みのあるときに。"],
      ["黒オリーブ", "塩気と旨みのある黒い果実。地中海の赤で、しょっぱさを感じたときに使えます。"],
    ] },
    { cat: "熟成の植物香", color: "#7A6A4A", w: [
      ["タバコ", "乾いた葉巻の葉。樽と熟成が重なった赤で、甘さのない乾いた印象を表せます。"],
      ["紅茶", "乾いた茶葉のやさしい渋み。色が淡く枯れてきた赤の美しさを表します。"],
      ["キノコ", "しっとりした土っぽさ。長期熟成した淡い色の赤で、繊細さと共に。"],
      ["スーボア", "下草。湿った森の落ち葉と土の香りで、熟成後半の赤の代表語です。"],
      ["トリュフ", "キノコより濃く高貴な土の香り。長熟した上質な赤で出会う褒め言葉。"],
      ["土", "掘り返した畑のような素朴な乾き。果実が引いた後に顔を出します。"],
    ] },
  ],
};

/* 香辛料・芳香・化学物質（用語選択用紙の分類） */
const A2 = {
  white: [
    { cat: "鉱物", color: "#5E6E7A", w: [
      ["石灰", "チョークのような白い硬さ。冷涼で酸の高い白の、骨っぽい質感を表します。"],
      ["火打石", "石を打ち合わせた瞬間の硬い香り。痩せた土壌の白に出て、高い酸と結びつきます。"],
      ["貝殻", "潮っぽい乾いた塩気。海沿いや石灰質の産地の白で、余韻に塩味を感じたときに。"],
      ["鉱物", "特定できない金属的・石的な硬さ。ミネラリーという印象を具体化する言葉です。"],
      ["海の香り", "磯や潮風のニュアンス。海に面した産地の白や、熟成した白で顔を出します。"],
    ] },
    { cat: "香辛料", color: "#B4622A", w: [
      ["白胡椒", "ピリッと軽いスパイス感。白では香りの端に出て、複雑さの合図になります。"],
      ["コリアンダーシード", "柑橘に似た乾いた種子の香り。香りの層が厚い白の、仕上げの一言です。"],
      ["シナモン", "甘く温かい木の皮。樽と熟成の両方から出て、果実の甘さを補強します。"],
      ["丁子", "薬っぽく濃く甘いスパイス。樽の効いた厚みのある白で複雑さを示します。"],
      ["香木", "白檀のような乾いた高貴な木。長く樽で寝かせた白にまれに現れます。"],
    ] },
    { cat: "発酵・樽", color: "#B8A06A", w: [
      ["パン・ドゥ・ミ", "焼く前後のパンのような酵母香。澱と長く置いた白や泡ものに出ます。"],
      ["トースト", "パンを焼いた焦げの香ばしさ。樽の焼きが強い白で、余韻に残ります。"],
      ["ジンジャーブレッド", "香辛料入りの焼き菓子。酵母と樽が重なった、厚みのある白に。"],
      ["煙・燻製", "焚き火の遠くの煙。樽か土地の個性で、硬質な白に複雑さを与えます。"],
      ["ヴァニラ", "甘く丸い香り。新樽で寝かせた白の証で、厚いボディと一緒に現れます。"],
      ["乳製品", "バターやヨーグルトの香り。乳酸発酵の証で、丸い口当たりと結びつきます。"],
    ] },
    { cat: "熟成・その他", color: "#6E7A66", w: [
      ["蜂蜜", "とろりと重い甘い香り。数年以上熟成した白や甘口で、色の濃さと一致します。"],
      ["花の蜜", "蜂蜜より軽く花寄りの甘さ。熟成の入り口にある白で感じられます。"],
      ["麝香", "動物的で濃厚な残り香。熟成が進んだ白の、独特の重さを表す言葉です。"],
      ["ペトロール（ケロセン）", "石油様の香り。特定品種が数年熟成した確かな証で、当てる決め手になります。"],
      ["ワックス", "ロウのような乾いた被膜の香り。長熟した厚みのある白に出ます。"],
      ["蜜蝋", "蜜と蝋が混ざった甘く乾いた香り。熟成した白の丸みと結びつきます。"],
      ["硫黄", "マッチを擦ったような還元的な香り。抜栓直後に出て、時間で消えることが多い。"],
      ["フェノール", "薬品や絆創膏のような香り。強すぎる場合は欠陥を疑う手がかりになります。"],
    ] },
  ],
  red: [
    { cat: "香辛料", color: "#B4622A", w: [
      ["黒胡椒", "挽きたての刺すような香り。品種由来のスパイス感で、涼しめの産地の赤に多い。"],
      ["丁子", "薬っぽく濃く甘いスパイス。樽の効いた重い赤で、複雑さを示します。"],
      ["シナモン", "甘く温かい木の皮のスパイス。果実の甘い印象を補強します。"],
      ["ナツメグ", "ほろ苦く粉っぽいスパイス。香りの層が厚い赤の、仕上げの一言です。"],
      ["甘草", "黒飴のようなねっとり甘い薬草。凝縮した濃い赤や、熟成した赤の余韻に残ります。"],
    ] },
    { cat: "樽", color: "#8A6A3D", w: [
      ["ヴァニラ", "甘く丸い香り。新樽を使った赤の証で、タンニンに甘い印象を与えます。"],
      ["ロースト", "深く焼いた木の焦げ感。焼きの強い樽を使った、色も味も濃い赤に。"],
      ["グリエ", "肉や網焼きの香ばしさ。樽の焼きと熟成が重なった重厚な赤に。"],
      ["煙・燻製", "焚き火の煙。樽か土地の個性で、乾いた印象を赤に与えます。"],
      ["樹脂", "松脂のような粘る樹木の香り。樽と熟成が進んだ赤にまれに現れます。"],
      ["コーヒー", "深煎り豆の香ばしい苦み。樽由来で、力強いタンニンの赤の定番表現です。"],
      ["チョコレート", "カカオの乾いた苦みと甘さ。凝縮した果実と強いタンニンの赤に添えられます。"],
    ] },
    { cat: "動物・熟成", color: "#5E6E7A", w: [
      ["生肉", "血や生肉を思わせる還元的な香り。抜栓直後の若い赤で出ることがあります。"],
      ["乾いた肉", "生ハムのような塩気と旨み。熟成した赤の、果実以外の厚みを表します。"],
      ["なめし皮", "古い革の乾いた動物香。10年前後の熟成の証で、タンニンが溶けた赤に。"],
      ["動物的なニュアンス", "獣や毛皮を思わせる香り。熟成と還元的な性格が重なった赤に出ます。"],
      ["鉄分", "金属的で血に近い香り。旨みのある赤や、還元的な性格の赤に現れます。"],
      ["ヨード", "磯や薬品を思わせる香り。海沿いの産地や熟成した赤に現れます。"],
      ["ランシオ", "酸化熟成による独特のこもった甘い香り。長期熟成や酒精強化の赤に。"],
    ] },
  ],
};

const PAL_AXES = (t) => [
  { id: "attack", n: "アタック", d: "口に入れた瞬間の第一印象の強さ。", o: ["軽い", "やや軽い", "やや強い", "強い", "インパクトのある"] },
  { id: "sweet", n: "甘み", d: "舌先で感じる甘さ。アルコールのボリューム感も含めて捉えます。", o: ["ドライ", "ソフトな", "まろやか", "豊かな", "残糖がある"] },
  {
    id: "acid", n: "酸味", d: "口の中がきゅっとして唾液が出る感じ。ワインの背骨です。",
    o: t === "red" ? ["爽やかな", "軽やかな", "直線的", "堅固な", "なめらかな", "生き生きとした", "しなやかな", "力強い"]
      : ["爽やかな", "軽やかな", "直線的", "堅固な", "なめらかな", "はつらつとした", "力強い"],
  },
  t === "red" || t === "orange"
    ? { id: "tannin", n: "タンニン分", d: "歯ぐきや舌が乾く感触。果皮から来る骨格です。", o: ["収斂性のある", "力強い", "緻密", "サラサラとした", "ヴィロードのような", "シルキーな", "溶け込んだ"] }
    : { id: "bitter", n: "苦味", d: "後半に残るほろ苦さ。旨みとして働きます。", o: ["控えめ", "穏やかな", "コク（深み）を与える", "旨みをともなった", "強い（突出した）"] },
  {
    id: "balance", n: "バランス", d: "全体のまとまり。どの要素が前に出ているか。",
    o: t === "red" || t === "orange" ? ["スマートな", "骨格のしっかりした", "堅固な", "痩せた、渇いた", "豊満な", "ジューシーな", "力強い", "流れるような", "ふくよかな"]
      : ["スリムな", "スムーズな", "コンパクトな", "ドライな", "まろやかな", "ねっとりした", "ジューシーな", "豊潤な", "厚みのある", "抑制された"],
  },
  { id: "alc", n: "アルコール", d: "喉と胃の奥に感じる温かさ。用語選択用紙の区分に合わせています。", o: ["10.9%以下", "11.0 - 11.9%", "12.0 - 12.9%", "13.0 - 13.9%", "14%以上"] },
];
const FINISH = ["短い", "やや短い", "やや長い", "長い"];

const OTHER_AXES = (t) => [
  {
    id: "eval", n: "評価", d: "このワインをどう位置づけるか、ひとことで。",
    o: t === "red" || t === "orange"
      ? ["シンプル、フレッシュ感を楽しむ", "成熟度が高く、豊か", "濃縮し、力強い", "エレガントで、余韻の長い", "複雑性があり、引き締まった"]
      : ["シンプル、フレッシュ感を楽しむ", "成熟度が高く、豊かな", "濃縮し、力強い", "エレガントで、ミネラリー", "滑らかで、バランスが良い", "ポテンシャルの高い"],
  },
  {
    id: "temp", n: "適正温度", d: "いちばん美味しく感じる温度帯。",
    o: t === "red" || t === "orange"
      ? ["10度未満", "10 - 13度", "14 - 16度", "17 - 20度", "21度以上"]
      : ["8度未満", "8 - 10度", "11 - 14度", "15 - 18度", "19度以上"],
  },
  { id: "glass", n: "グラス", d: "この香りと味わいを活かす形。", o: ["小ぶり", "中庸", "大ぶり", "バルーン型", "チューリップ型"] },
];

/* ロゼ・オレンジ・泡は用語選択用紙に無いため、赤白の用語を組み合わせて構成する */
const pick = (grp, words) => ({ ...grp, w: grp.w.filter(([w]) => words.includes(w)) });
A1.rose = [pick(A1.red[0], ["イチゴ", "ラズベリー", "ブルーベリー", "カシス"]), ...A1.white];
A1.orange = [...A1.white, pick(A1.red[3], ["紅茶", "土", "キノコ"])];
A1.sparkling = A1.white;
A2.rose = A2.white;
A2.orange = [...A2.white, pick(A2.red[2], ["なめし皮"])];
A2.sparkling = A2.white;


const WORD_INDEX = {};
[A1, A2].forEach((set, gi) => Object.keys(set).forEach((t) =>
  set[t].forEach((g) => g.w.forEach(([w, m]) => { WORD_INDEX[`${t}:${w}`] = { w, m, cat: g.cat, color: g.color, grp: gi + 1 }; }))
));
const wordMeta = (w, t) => WORD_INDEX[`${t}:${w}`] || WORD_INDEX[`red:${w}`] || WORD_INDEX[`white:${w}`] || { w, m: "自分で書き加えた言葉です。", cat: "自作", color: "#8E9689" };

const HUE_HEX = {
  "グリーンがかった": "#CFDA84", "レモンイエロー": "#E4D57F", "イエロー": "#DFC352", "黄金色": "#D8B247",
  "琥珀色": "#BE862C", "トパーズ": "#A9762C", "紫がかった": "#5E2352", "ラズベリーレッド": "#A62A44",
  "ルビー": "#8D2030", "ガーネット": "#6D2320", "黒みを帯びた": "#3A1420", "オレンジがかった": "#A34A2E",
  "レンガ色": "#8B4A32", "マホガニー": "#63301F",
  "淡いピンク": "#F0C3C4", "サーモンピンク": "#E5A08B", "ラズベリーピンク": "#D9607A",
  "玉ねぎの皮": "#D08360", "オレンジがかったピンク": "#E08A62",
  "淡いオレンジ": "#E0A55C", "銅色": "#B87333", "濃いアンバー": "#A0631F",
  "シルバーがかった": "#E3E5DC", "黄金色がかった": "#DFC352", "オレンジ（グリ）を帯びた": "#D79A55",
  "アンバー": "#B5762A", "ダークチェリーレッド": "#6E1B26",
  "縁が明るい": "#A8434A", "深みのある": "#4A1420",
};

/* ================= Claude API ================= */
async function callClaude(content) {
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

const readLabel = (dataUrl) => callClaude([
  { type: "image", source: { type: "base64", media_type: "image/jpeg", data: dataUrl.split(",")[1] } },
  { type: "text", text: `このワインラベルの写真から情報を読み取り、JSONのみを返してください。前置き・コードフェンス不要。
{"name":"ワイン名","producer":"生産者名","country":"国名(日本語)","region":"地方・村名(日本語)","grape":"ブドウ品種(日本語カタカナ)","vintage":"西暦4桁","alcohol":"数値のみ","type":"red / white / rose / orange / sparkling のいずれか"}
読み取れない項目はnull。品種はラベル記載か、産地と格付けから確実に特定できる場合のみ入れてください。` },
]);

const suggestWine = (profile) => callClaude([{
  type: "text", text: `あなたはワインのブラインドテイスティングを教える講師です。初心者が取ったテイスティングノートから、正解の候補を推測してください。JSONのみを返し、前置きやコードフェンスは不要です。

テイスティングノート:
${profile}

形式:
{"candidates":[{"grape":"品種名(日本語カタカナ)","country":"国名(日本語)","region":"地方名(日本語)","vintage":"想定される年(西暦4桁、幅があるなら中央値)","reason":"そう考える根拠を、ノート内の具体的な記述に触れながら60字以内で"}],"advice":"この人が次に確認すべきポイントを80字以内で。初心者にも分かる平易な日本語で。"}

candidatesは可能性の高い順に3つ。ノートの情報が少なくても、分かる範囲で必ず3つ挙げてください。` }]);

/* ================= アイコン ================= */
const Ico = {
  back: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>,
  edit: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M14.5 5.5l4 4" /></svg>,
  plus: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>,
  download: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11" /><path d="M8 11l4 4 4-4" /><path d="M5 19h14" /></svg>,
  trash: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16" /><path d="M9.5 7V4.5h5V7" /><path d="M6.5 7l1 12.5h9L17.5 7" /></svg>,
};

/** 必須項目の印 */
const Req = () => <span className="req" aria-label="必須">＊</span>;

/* ================= 共通UI ================= */
function Toggle({ on, onChange, title, desc }) {
  return (
    <button className={"toggle" + (on ? " on" : "")} onClick={() => onChange(!on)}>
      <span className="toggle-b"><i /></span>
      <span><span className="toggle-t">{title}</span><span className="toggle-d">{desc}</span></span>
    </button>
  );
}

function Combo({ value, onChange, options, extra, onAdd, placeholder }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const text = open ? q : value;
  const all = [...(options || []), ...(extra || [])];
  const filtered = q.trim() ? all.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase())) : all;
  const exact = all.some((o) => o === q.trim());
  return (
    <div className="combo" ref={box}>
      <input className="inp" value={text} placeholder={placeholder}
        onFocus={() => { setQ(value || ""); setOpen(true); }}
        onChange={(e) => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }} />
      {open && (
        <div className="combo-list">
          {q.trim() && !exact && (
            <button className="add" onClick={() => { onAdd?.(q.trim()); onChange(q.trim()); setOpen(false); }}>
              ＋「{q.trim()}」を選択肢に追加
            </button>
          )}
          {filtered.length === 0 && !q.trim() && <div className="ch">候補がありません</div>}
          {filtered.map((o) => (
            <button key={o} onClick={() => { onChange(o); setQ(o); setOpen(false); }}>{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ComboAdd({ options, selected, onPick, onAdd, placeholder }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const avail = options.filter((o) => !selected.includes(o));
  const k = q.trim();
  const filtered = k ? avail.filter((o) => o.toLowerCase().includes(k.toLowerCase())) : avail;
  const exact = options.some((o) => o === k);
  return (
    <div className="combo addbox" ref={box}>
      <input className="inp" value={q} placeholder={placeholder || "選択肢を検索 / 追加"}
        onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }} />
      {open && (
        <div className="combo-list">
          {k && !exact && (
            <button className="add" onClick={() => { onAdd(k); onPick(k); setQ(""); setOpen(false); }}>
              ＋「{k}」を選択肢に追加
            </button>
          )}
          {filtered.slice(0, 60).map((o) => (
            <button key={o} onClick={() => { onPick(o); setQ(""); setOpen(false); }}>{o}</button>
          ))}
          {!filtered.length && !k && <div className="ch">{options.length ? "すべて選択済みです" : "打ち込むと新しい選択肢を追加できます"}</div>}
        </div>
      )}
    </div>
  );
}

function OptionAxis({ ax, sel, onToggle, extra, onAddOption }) {
  const list = sel || [];
  const ex = (extra || []).filter((o) => !ax.o.includes(o));
  const all = [...ax.o, ...ex];
  const orphan = list.filter((o) => !all.includes(o));
  return (
    <div className="ax">
      <div className="ax-h"><span className="ax-n">{ax.n}</span>{list.length > 0 && <span className="ax-cnt">{list.length}</span>}</div>
      {ax.d && <p className="ax-d">{ax.d}</p>}
      <div className="opts">
        {all.map((o) => (
          <button key={o} className={"opt" + (ex.includes(o) ? " cust" : "") + (list.includes(o) ? " on" : "")} onClick={() => onToggle(o)}>{o}</button>
        ))}
        {orphan.map((o) => <button key={o} className="opt cust on" onClick={() => onToggle(o)}>{o} ×</button>)}
      </div>
      {onAddOption && <ComboAdd options={ex} selected={list} onPick={onToggle} onAdd={onAddOption} placeholder="自分の選択肢を検索 / 追加" />}
    </div>
  );
}

function WordCard({ w, type }) {
  const m = wordMeta(w, type);
  return (
    <div className="wcard">
      <div className="wcard-h">
        <span className="wcard-dot" style={{ background: m.color }} />
        <span className="wcard-w">{m.w}</span>
        <span className="wcard-c">{m.cat}</span>
      </div>
      <div className="wcard-b">{m.m}</div>
    </div>
  );
}

function TagGroups({ groups, picked, onTap, focus, type, extra, onAddOption }) {
  const ex = extra || [];

  return (
    <>
      {groups.map((g) => (
        <div key={g.cat}>
          <div className="grp-t">{g.cat}</div>
          <div className="opts">
            {g.w.map(([w]) => <button key={w} className={"opt" + (picked.includes(w) ? " on" : "")} onClick={() => onTap(w)}>{w}</button>)}
          </div>
          {focus && g.w.some(([w]) => w === focus) && <WordCard w={focus} type={type} />}
        </div>
      ))}
      {ex.length > 0 && (
        <div>
          <div className="grp-t">自分で足した言葉</div>
          <div className="opts">
            {ex.map((w) => <button key={w} className={"opt cust" + (picked.includes(w) ? " on" : "")} onClick={() => onTap(w)}>{w}</button>)}
          </div>
        </div>
      )}
      {onAddOption && <ComboAdd options={ex} selected={picked} onPick={onTap} onAdd={onAddOption} placeholder="自分の選択肢を検索 / 追加" />}
    </>
  );
}

function PickedTags({ list, onRemove, type }) {
  if (!list.length) return null;
  return (
    <div className="picked">
      {list.map((w) => (
        <span key={w} className="ptag"><b style={{ background: wordMeta(w, type).color }} />{w}
          <i role="button" onClick={() => onRemove(w)}>×</i></span>
      ))}
    </div>
  );
}

function Step({ n, title, desc, collapsible, children }) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <section className="step">
      <div className={"step-hd" + (collapsible ? " tap" : "")} onClick={() => collapsible && setOpen(!open)}
        role={collapsible ? "button" : undefined} aria-expanded={collapsible ? open : undefined}>
        <span className="step-n">{n}</span>
        <span className="step-t">{title}</span>
        {collapsible && <span className="step-ar">{open ? "閉じる ▲" : "入力する ▼"}</span>}
      </div>
      {open && <>{desc && <p className="step-d">{desc}</p>}{children}</>}
    </section>
  );
}

function Accordion({ title, count, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="acc">
      <button className="acc-h" onClick={() => setOpen(!open)}>{title}<em>{count ? `${count}項目` : ""} {open ? "▲" : "▼"}</em></button>
      {open && <div className="acc-b">{children}</div>}
    </div>
  );
}

/* ================= 模範回答 ================= */
const emptyRef = () => ({
  id: "", grape: "", type: "red", country: "", region: "",
  appearance: {}, aromaImp: [], aroma1: [], aroma2: [], aromaAfter: [],
  palate: {}, finish: "", other: {}, memo: "",
});

/** 模範回答の編集フォーム（記録フォームと同じ選択肢を使う） */
function RefEditor({ initial, opts, addOpt, onSave, onCancel }) {
  const [r, setR] = useState(() => {
    const base = emptyRef();
    const src = migrateAroma(initial || {});
    return {
      ...base, ...src,
      appearance: src.appearance || {}, palate: src.palate || {}, other: src.other || {},
      aromaImp: src.aromaImp || [], aromaAfter: src.aromaAfter || [],
      aroma1: src.aroma1 || [], aroma2: src.aroma2 || [],
    };
  });
  const [focus, setFocus] = useState({ k: null, w: null });
  const t = r.type;
  const set = (k, v) => setR((p) => ({ ...p, [k]: v }));
  const toggle = (key, sub, v) => setR((p) => {
    const cur = (sub ? p[key][sub] : p[key]) || [];
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    return sub ? { ...p, [key]: { ...p[key], [sub]: next } } : { ...p, [key]: next };
  });
  const ok = (k) => opts[k] || [];
  const addO = (k) => (v) => addOpt(k, v);

  return (
    <div>
      <section className="step">
        <div className="step-hd"><span className="step-t">{initial ? "模範回答を編集" : "模範回答を追加"}</span></div>
        <div className="fld">
          <label className="lab">タイプ</label>
          <div className="segs">
            {TYPES.map((x) => <button key={x.id} className={t === x.id ? "on" : ""} onClick={() => set("type", x.id)}>{x.n}</button>)}
          </div>
        </div>
        <div className="fld"><label className="lab">ブドウ品種</label>
          <Combo value={r.grape} onChange={(v) => set("grape", v)} options={grapesFor(t)} extra={opts.grape} onAdd={(v) => addOpt("grape", v)} placeholder="ピノ・ノワール" /></div>
        <div className="row2">
          <div className="fld"><label className="lab">代表的な産地（国）</label>
            <Combo value={r.country} onChange={(v) => set("country", v)} options={COUNTRIES} extra={opts.country} onAdd={(v) => addOpt("country", v)} placeholder="フランス" /></div>
          <div className="fld"><label className="lab">地方・村</label>
            <Combo value={r.region} onChange={(v) => set("region", v)} options={regionsFor(r.country)} extra={opts.region} onAdd={(v) => addOpt("region", v)} placeholder="ブルゴーニュ" /></div>
        </div>
      </section>

      <section className="step">
        <div className="step-hd"><span className="step-t">外観</span></div>
        {APP_AXES(t).map((ax) => (
          <OptionAxis key={ax.id} ax={{ ...ax, d: null }} sel={r.appearance[ax.id]} onToggle={(v) => toggle("appearance", ax.id, v)}
            extra={ok(`app:${t}:${ax.id}`)} onAddOption={addO(`app:${t}:${ax.id}`)} />
        ))}
      </section>

      <section className="step">
        <div className="step-hd"><span className="step-t">香り</span></div>
        <OptionAxis ax={{ n: "第一印象", o: FIRST_IMP(t) }} sel={r.aromaImp} onToggle={(v) => toggle("aromaImp", null, v)}
          extra={ok(`imp:${t}`)} onAddOption={addO(`imp:${t}`)} />
        {[["aroma1", "果実・花・植物", A1], ["aroma2", "香辛料・芳香・化学物質", A2]].map(([key, label, DATA]) => (
          <div className="ax" key={key}>
            <div className="ax-h"><span className="ax-n">{label}</span>{r[key].length > 0 && <span className="ax-cnt">{r[key].length}</span>}</div>
            <TagGroups groups={DATA[t]} picked={r[key]} onTap={(w) => { setFocus({ k: key, w }); toggle(key, null, w); }}
              focus={focus.k === key ? focus.w : null} type={t} extra={ok(`${key}:${t}`)} onAddOption={addO(`${key}:${t}`)} />
            <PickedTags list={r[key]} onRemove={(w) => toggle(key, null, w)} type={t} />
          </div>
        ))}
        <OptionAxis ax={{ n: "香りの印象", o: AROMA_IMP(t) }} sel={r.aromaAfter} onToggle={(v) => toggle("aromaAfter", null, v)}
          extra={ok(`aimp:${t}`)} onAddOption={addO(`aimp:${t}`)} />
      </section>

      <section className="step">
        <div className="step-hd"><span className="step-t">味わい</span></div>
        {PAL_AXES(t).map((ax) => (
          <OptionAxis key={ax.id} ax={{ ...ax, d: null }} sel={r.palate[ax.id]} onToggle={(v) => toggle("palate", ax.id, v)}
            extra={ok(`pal:${t}:${ax.id}`)} onAddOption={addO(`pal:${t}:${ax.id}`)} />
        ))}
        <div className="ax">
          <div className="ax-h"><span className="ax-n">余韻</span></div>
          <div className="opts">
            {FINISH.map((o) => <button key={o} className={"opt" + (r.finish === o ? " on" : "")} onClick={() => set("finish", r.finish === o ? "" : o)}>{o}</button>)}
          </div>
        </div>
        <div className="ax" style={{ marginTop: 22 }}>
          <div className="ax-h"><span className="ax-n">その他</span></div>
        </div>
        {OTHER_AXES(t).map((ax) => (
          <OptionAxis key={ax.id} ax={{ ...ax, d: null }} sel={r.other[ax.id]} onToggle={(v) => toggle("other", ax.id, v)}
            extra={ok(`oth:${t}:${ax.id}`)} onAddOption={addO(`oth:${t}:${ax.id}`)} />
        ))}
        <div className="fld" style={{ marginTop: 16 }}><label className="lab">覚え書き</label>
          <textarea className="inp" value={r.memo} onChange={(e) => set("memo", e.target.value)}
            placeholder="見分けの決め手、似ている品種との違い、産地による差など。" /></div>
      </section>

      <div className="savebar">
        <div className="savebar-row">
          <button className="cancel" onClick={onCancel}>やめる</button>
          <button className="save" disabled={!r.grape.trim()}
            onClick={() => onSave({ ...r, id: r.id || `ref-${Date.now()}` })}>保存する</button>
        </div>
      </div>
    </div>
  );
}

/* 自分・正解・模範を1行にまとめて並べる */
function CmpRow({ label, mine, truth, model }) {
  const m = mine || [], tr = truth, v = model;
  const any = m.length || (tr && tr.length) || (v && v.length);
  if (!any) return null;
  const row = (key, arr, others) => (
    <div className="cmpr-b">
      <span className="cmpr-k">{key}</span>
      <span className="cmpr-t">
        {arr.length
          ? arr.map((x) => <i key={x} className={others.some((o) => (o || []).includes(x)) ? "hit" : ""}>{x}</i>)
          : <em>—</em>}
      </span>
    </div>
  );
  return (
    <div className="cmpr">
      <div className="cmpr-l">{label}</div>
      {row("自分", m, [tr, v])}
      {tr && row("正解", tr, [m, v])}
      {v && row("模範", v, [m, tr])}
    </div>
  );
}

/** 記録1件の官能項目を、必要なら正解・模範と並べて表示する */
function SensoryTable({ note, truth, model }) {
  const t = note.type;
  const pick = (src, key, sub) => {
    if (!src) return null;
    return sub ? (src[key]?.[sub] || []) : (src[key] || []);
  };
  const finishOf = (src) => (src ? (src.finish ? [src.finish] : []) : null);
  return (
    <>
      <div className="grp-t">外観</div>
      {APP_AXES(t).map((ax) => (
        <CmpRow key={ax.id} label={ax.n}
          mine={note.appearance?.[ax.id]}
          truth={pick(truth, "appearance", ax.id)}
          model={pick(model, "appearance", ax.id)} />
      ))}

      <div className="grp-t">香り</div>
      <CmpRow label="第一印象" mine={note.aromaImp} truth={pick(truth, "aromaImp")} model={pick(model, "aromaImp")} />
      <CmpRow label="果実・花・植物" mine={note.aroma1} truth={pick(truth, "aroma1")} model={pick(model, "aroma1")} />
      <CmpRow label="香辛料・芳香・化学物質" mine={note.aroma2} truth={pick(truth, "aroma2")} model={pick(model, "aroma2")} />
      <CmpRow label="香りの印象" mine={note.aromaAfter} truth={pick(truth, "aromaAfter")} model={pick(model, "aromaAfter")} />

      <div className="grp-t">味わい</div>
      {PAL_AXES(t).map((ax) => (
        <CmpRow key={ax.id} label={ax.n}
          mine={note.palate?.[ax.id]}
          truth={pick(truth, "palate", ax.id)}
          model={pick(model, "palate", ax.id)} />
      ))}
      <CmpRow label="余韻" mine={note.finish ? [note.finish] : []}
        truth={finishOf(truth)} model={finishOf(model)} />

      <div className="grp-t">その他</div>
      {OTHER_AXES(t).map((ax) => (
        <CmpRow key={ax.id} label={ax.n}
          mine={note.other?.[ax.id]}
          truth={pick(truth, "other", ax.id)}
          model={pick(model, "other", ax.id)} />
      ))}
    </>
  );
}

/** 模範回答そのものの内容。mine を渡すと一致した語が塗られる */
function RefView({ r, mine }) {
  const t = r.type || "red";
  const hit = (w) => !!mine && [
    ...Object.values(mine.appearance || {}).flat(), ...(mine.aromaImp || []), ...(mine.aroma1 || []),
    ...(mine.aroma2 || []), ...(mine.aroma3 || []), ...(mine.aromaAfter || []),
    ...Object.values(mine.palate || {}).flat(), mine.finish,
  ].includes(w);
  const line = (label, arr) => (!arr || !arr.length) ? null : (
    <div className="rv-line" key={label}>
      <span className="rv-lb">{label}</span>
      <span className="rv-tg">{arr.map((w) => <i key={w} className={hit(w) ? "hit" : ""}>{w}</i>)}</span>
    </div>
  );
  return (
    <div className="refview">
      {r.memo && <div className="advice">{r.memo}</div>}
      <div className="grp-t">外観</div>
      {APP_AXES(t).map((ax) => line(ax.n, r.appearance?.[ax.id]))}
      <div className="grp-t">香り</div>
      {line("第一印象", r.aromaImp)}
      {line("果実・花・植物", r.aroma1)}
      {line("香辛料・芳香・化学物質", r.aroma2)}
      {line("香りの印象", r.aromaAfter)}
      <div className="grp-t">味わい</div>
      {PAL_AXES(t).map((ax) => line(ax.n, r.palate?.[ax.id]))}
      {line("余韻", r.finish ? [r.finish] : [])}
      <div className="grp-t">その他</div>
      {OTHER_AXES(t).map((ax) => line(ax.n, r.other?.[ax.id]))}
    </div>
  );
}

const same = (a, b) => {
  const n = (x) => (x || "").toLowerCase().replace(/[\s・ー\-／/]/g, "");
  const x = n(a), y = n(b);
  return !!x && !!y && (x.includes(y) || y.includes(x));
};

/** 模範回答を選ぶチップ。narrow のときは正解の品種と国で絞る */
function useRefPicker(refs, form, narrow) {
  const byType = refs.filter((r) => r.type === form.type);
  const list = narrow
    ? byType.filter((r) => same(r.grape, form.grape) && (!form.country || !r.country || same(r.country, form.country)))
    : byType;
  const guess = form.blind?.grape || form.grape || "";
  const [sel, setSel] = useState(() => (list.find((r) => r.grape === guess) || list[0])?.id || null);
  const r = list.find((x) => x.id === sel) || list[0] || null;
  return { list, r, setSel };
}

function RefPicker({ list, r, setSel }) {
  if (list.length < 2) return null;
  return (
    <div className="opts" style={{ marginBottom: 14 }}>
      {list.map((x) => (
        <button key={x.id} className={"opt" + (r?.id === x.id ? " on" : "")} onClick={() => setSel(x.id)}>
          {x.grape}{x.region ? `／${x.region}` : ""}
        </button>
      ))}
    </div>
  );
}

/** 記録中に模範回答を開くパネル（自分・正解・模範を並べて表示） */
function RefPanel({ refs, form, truth, show, onToggle }) {
  const { list, r, setSel } = useRefPicker(refs, form, true);
  return (
    <div style={{ margin: "20px 0 4px" }}>
      <button className={"cmp-toggle" + (show ? " on" : "")} onClick={onToggle}>
        模範回答を表示する{show ? "　▲" : "　▼"}
      </button>
      {show && (
        <div className="cmp-panel">
          {!list.length ? (
            <div className="empty" style={{ padding: "24px 10px" }}>
              <div className="em-t">該当する模範回答がありません</div>
              <p>{form.grape || "この品種"}{form.country ? `（${form.country}）` : ""} の模範回答を<br />「模範」タブで登録すると、ここに表示されます。</p>
            </div>
          ) : (
            <>
              <RefPicker list={list} r={r} setSel={setSel} />
              {r && (
                <>
                  <div className="cmpr-sum">
                    {r.grape}{r.country ? `　／　${[r.country, r.region].filter(Boolean).join(" ")}` : ""}
                  </div>
                  {r.memo && <div className="advice">{r.memo}</div>}
                  <SensoryTable note={form} truth={truth} model={r} />
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** 全て＋登録のある種類だけを出すタブ */
function TypeTabs({ value, onChange, items }) {
  const present = TYPES.filter((t) => items.some((x) => x.type === t.id));
  if (present.length < 2) return null;
  return (
    <div className="ftabs">
      <button className={value === "all" ? "on" : ""} onClick={() => onChange("all")}>全て</button>
      {present.map((t) => (
        <button key={t.id} className={value === t.id ? "on" : ""} onClick={() => onChange(t.id)}>{t.n}</button>
      ))}
    </div>
  );
}

const kana = (a, b) => (a || "").localeCompare(b || "", "ja");

/* ================= 模範回答タブ ================= */
function RefList({ refs, opts, addOpt, onSave, onDelete, onRestore }) {
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [filter, setFilter] = useState("all");

  if (viewing) {
    const r = refs.find((x) => x.id === viewing.id) || viewing;
    return (
      <div>
        <div className="dt-bar">
          <button className="ibtn" onClick={() => setViewing(null)}>{Ico.back}模範一覧</button>
          <span className="dt-gap" />
          <button className="ibtn" onClick={() => { setViewing(null); setEditing(r); }}>{Ico.edit}編集</button>
          <button className="ibtn danger" onClick={() => { if (confirm(`${r.grape} の模範回答を削除しますか?`)) { onDelete(r.id); setViewing(null); } }}>{Ico.trash}削除</button>
        </div>
        <div className="dt-body">
          <div className="dt-nm">{r.grape}</div>
          <div className="dt-sub">{typeName(r.type)}　{[r.country, r.region].filter(Boolean).join(" · ")}</div>
          <div style={{ marginTop: 18 }}><RefView r={r} /></div>
        </div>
      </div>
    );
  }

  if (editing !== null) {
    return <RefEditor initial={editing || undefined} opts={opts} addOpt={addOpt}
      onSave={(r) => { onSave(r); setEditing(null); }} onCancel={() => setEditing(null)} />;
  }
  const shown = refs
    .filter((r) => filter === "all" || r.type === filter)
    .sort((a, b) => kana(a.grape, b.grape));

  return (
    <div>
      <div className="listbar">
        <span className="listbar-n">{refs.length}件の模範回答</span>
        {onRestore && <button className="linkbtn" onClick={onRestore}>初期セットを戻す</button>}
        <button className="ibtn" onClick={() => setEditing(false)}>{Ico.plus}追加</button>
      </div>

      <TypeTabs value={filter} onChange={setFilter} items={refs} />

      {!shown.length ? (
        <div className="empty">
          <div className="em-t">{refs.length ? "この種類の登録はありません" : "まだ模範回答がありません"}</div>
          <p>品種ごとの模範回答を登録しておくと、<br />ブラインドの答え合わせでいつでも参照できます。</p>
          {onRestore && !refs.length && <button className="restore" onClick={onRestore}>初期セットを読み込む</button>}
        </div>
      ) : (
        <div style={{ paddingTop: 10 }}>
          {shown.map((r) => (
            <div className="card refcard" key={r.id}>
              <div className="card-t">
                <div style={{ minWidth: 0, flex: 1, cursor: "pointer" }} onClick={() => setViewing(r)}>
                  <div className="card-nm">{r.grape}</div>
                  <div className="card-sub">{typeName(r.type)}　{[r.country, r.region].filter(Boolean).join(" · ") || "産地の指定なし"}</div>
                </div>
                <button className="ibtn" onClick={() => setEditing(r)}>{Ico.edit}</button>
                <button className="ibtn danger" onClick={() => { if (confirm(`${r.grape} の模範回答を削除しますか?`)) onDelete(r.id); }}>{Ico.trash}</button>
              </div>
              <div className="card-w">
                {[...(r.aroma1 || []), ...(r.aroma2 || [])].slice(0, 6).map((w) => (
                  <span key={w} className="mini" style={{ background: wordMeta(w, r.type).color }}>{w}</span>
                ))}
              </div>
              {r.memo && <div className="refmemo">{r.memo}</div>}
            </div>
          ))}
          <div style={{ height: 20 }} />
        </div>
      )}
    </div>
  );
}

/* ================= コメント生成 ================= */
function buildComment(n) {
  const p = [], a = n.appearance || {}, pa = n.palate || {};
  const app = ["clarity", "shine", "hue", "depth", "visc"].flatMap((k) => a[k] || []);
  if (app.length) p.push(`外観は${app.join("、")}。`);
  if (a.imp?.length) p.push(`${a.imp.join("、")}印象。`);
  if (n.aromaImp?.length) p.push(`香りは${n.aromaImp.join("、")}。`);
  const ar = [];
  if (n.aroma1?.length) ar.push(n.aroma1.join("、"));
  if (n.aroma2?.length) ar.push(n.aroma2.join("、"));
  if (ar.length) p.push(`${ar.join("、続いて")}。`);
  if (n.aromaAfter?.length) p.push(`香りの印象は${n.aromaAfter.join("、")}。`);
  const pl = [];
  PAL_AXES(n.type).forEach((ax) => { if (pa[ax.id]?.length) pl.push(`${ax.n}は${pa[ax.id].join("、")}`); });
  if (pl.length) p.push(`味わいは${pl.join("、")}。`);
  if (n.finish) p.push(`余韻は${n.finish}。`);
  if (n.other?.eval?.length) p.push(`${n.other.eval.join("、")}一本。`);
  return p.join("");
}

/** 旧バージョンの記録・模範回答を、用語選択用紙の2分類に移し替える */
const GROUP_OF = {};
[["aroma1", A1], ["aroma2", A2]].forEach(([key, set]) =>
  Object.keys(set).forEach((t) => set[t].forEach((g) => g.w.forEach(([w]) => { GROUP_OF[w] = key; })))
);
function migrateAroma(o) {
  if (!o || (!o.aroma3?.length && o.aroma3 !== undefined && !o.aroma3)) { /* fallthrough */ }
  const all = [...(o?.aroma1 || []), ...(o?.aroma2 || []), ...(o?.aroma3 || [])];
  if (!all.length) return o;
  const a1 = [], a2 = [];
  all.forEach((w) => (GROUP_OF[w] === "aroma2" ? a2 : a1).push(w));
  return { ...o, aroma1: [...new Set(a1)], aroma2: [...new Set(a2)], aroma3: undefined };
}

/* ================= 記録フォーム ================= */
const emptySensory = () => ({ appearance: {}, aromaImp: [], aromaAfter: [], aroma1: [], aroma2: [], palate: {}, finish: "", other: {} });
const emptyForm = () => ({
  name: "", producer: "", country: "", region: "", grape: "", vintage: "", alcohol: "",
  type: "red", ...emptySensory(), appearanceMemo: "", aromaMemo: "", palateMemo: "",
  rating: 0, memo: "",
  blind: { on: false, done: false, grape: "", country: "", region: "", vintage: "", alcohol: "", memo: "", judge: {}, suggestions: null },
  truthOn: false, truth: emptySensory(),
});

function NewNote({ onSave, setToast, opts, addOpt, initial, onCancel, refs }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState(() => {
    if (!initial) return emptyForm();
    const base = emptyForm();
    const src = migrateAroma(initial);
    return {
      ...base, ...src,
      type: src.type || "red",
      appearance: src.appearance || {}, palate: src.palate || {}, other: src.other || {},
      aroma1: src.aroma1 || [], aroma2: src.aroma2 || [],
      aromaImp: initial.aromaImp || [], aromaAfter: initial.aromaAfter || [],
      blind: { ...base.blind, ...(src.blind || {}), done: !!src.blind?.on },
      truth: { ...base.truth, ...migrateAroma(src.truth || {}) },
    };
  });
  const [date, setDate] = useState(initial?.date || today);
  const [photo, setPhoto] = useState(null);
  useEffect(() => { if (initial?.hasPhoto) loadPhoto(initial.id).then(setPhoto); }, []);
  const [reading, setReading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [focus, setFocus] = useState({ k: null, w: null });
  const [showRef, setShowRef] = useState(false);
  const fileRef = useRef(null);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setBlind = (patch) => setF((p) => ({ ...p, blind: { ...p.blind, ...patch } }));
  const toggleIn = (root, key, sub, v) =>
    setF((p) => {
      const base = root ? p[root] : p;
      const cur = (sub ? base[key][sub] : base[key]) || [];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      const upd = sub ? { ...base, [key]: { ...base[key], [sub]: next } } : { ...base, [key]: next };
      return root ? { ...p, [root]: upd } : upd;
    });

  const pickPhoto = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 900, sc = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = img.width * sc; cv.height = img.height * sc;
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        const d = cv.toDataURL("image/jpeg", 0.72);
        setPhoto(d); if (AI) doRead(d);
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  };

  const doRead = async (d) => {
    setReading(true);
    try {
      const r = await readLabel(d || photo);
      setF((p) => ({
        ...p, name: r.name || p.name, producer: r.producer || p.producer,
        country: r.country || p.country, region: r.region || p.region, grape: r.grape || p.grape,
        vintage: r.vintage ? String(r.vintage) : p.vintage, alcohol: r.alcohol ? String(r.alcohol) : p.alcohol,
        type: TYPES.some((x) => x.id === r.type) ? r.type : p.type,
      }));
      setToast("ラベルを読み取りました。内容を確認してください");
    } catch { setToast("読み取れませんでした。手入力してください"); }
    setReading(false);
  };

  const askAssist = async () => {
    setThinking(true);
    const t = f.type;
    const lines = [`タイプ: ${t === "red" ? "赤" : "白"}`];
    const app = APP_AXES(t).map((ax) => f.appearance[ax.id]?.length ? `${ax.n}: ${f.appearance[ax.id].join("、")}` : null).filter(Boolean);
    if (app.length) lines.push("【外観】" + app.join(" / "));
    const ar = [];
    if (f.aromaImp.length) ar.push(`第一印象: ${f.aromaImp.join("、")}`);
    if (f.aroma1.length) ar.push(`果実・花・植物: ${f.aroma1.join("、")}`);
    if (f.aroma2.length) ar.push(`香辛料・芳香・化学物質: ${f.aroma2.join("、")}`);
    if (f.aromaAfter.length) ar.push(`香りの印象: ${f.aromaAfter.join("、")}`);
    if (ar.length) lines.push("【香り】" + ar.join(" / "));
    const pl = PAL_AXES(t).map((ax) => f.palate[ax.id]?.length ? `${ax.n}: ${f.palate[ax.id].join("、")}` : null).filter(Boolean);
    if (f.finish) pl.push(`余韻: ${f.finish}`);
    if (pl.length) lines.push("【味わい】" + pl.join(" / "));
    if (f.aromaMemo) lines.push("【メモ】" + f.aromaMemo);
    try {
      const r = await suggestWine(lines.join("\n"));
      setBlind({ suggestions: r });
    } catch { setToast("候補を出せませんでした。もう一度お試しください"); }
    setThinking(false);
  };

  const norm = (s) => (s || "").toLowerCase().replace(/[\s・ー\-／/]/g, "");
  const autoJudge = (mine, actual, numeric) => {
    if (!mine || !actual) return null;
    if (numeric) {
      const a = parseFloat(mine), b = parseFloat(actual);
      return isNaN(a) || isNaN(b) ? null : a === b;
    }
    const a = norm(mine), b = norm(actual);
    return a && b && (b.includes(a) || a.includes(b));
  };

  const t = f.type;
  const ANSWER_FIELDS = [
    { k: "grape", n: "ブドウ品種", ph: "ピノ・ノワール", opt: "grape", base: grapesFor(t), req: true },
    { k: "country", n: "産地（国）", ph: "フランス", opt: "country", base: COUNTRIES, req: true },
    { k: "region", n: "産地（地方・村）", ph: "ブルゴーニュ", opt: "region", dyn: true },
    { k: "vintage", n: "ヴィンテージ（年）", ph: "2021", im: "numeric", num: true },
    { k: "alcohol", n: "アルコール度数（%）", ph: "13.0", im: "decimal", num: true },
  ];

  const submit = () => {
    const b = f.blind;
    const judge = {};
    if (b.on) ANSWER_FIELDS.forEach(({ k, num }) => { judge[k] = b.judge[k] ?? autoJudge(b[k], f[k], num); });
    onSave({ ...f, blind: { ...b, judge }, id: initial?.id || String(Date.now()), date, hasPhoto: !!photo, v: 3 }, photo);
    if (!initial) { setF(emptyForm()); setDate(today); setPhoto(null); setFocus({ k: null, w: null }); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const blindOn = f.blind.on;
  const ok = (key) => opts[key] || [];
  const addO = (key) => (v) => addOpt(key, v);
  const tapAroma = (key) => (w) => { setFocus({ k: key, w }); toggleIn(null, key, null, w); };

  const field = (a, val, onChange, country) =>
    a.opt ? <Combo value={val} onChange={onChange} options={a.dyn ? regionsFor(country) : a.base}
      extra={opts[a.opt]} onAdd={(v) => addOpt(a.opt, v)} placeholder={a.ph} />
      : <input className="inp" inputMode={a.im} value={val} onChange={(e) => onChange(e.target.value)} placeholder={a.ph} />;

  const photoAndBasic = (
    <>
      <div className="fld">
        <label className="lab">ラベル写真</label>
        <button className="photo-btn" onClick={() => fileRef.current.click()}>
          {photo ? <img src={photo} alt="ラベル" /> : (<><span style={{ fontSize: 22 }}>＋</span><span>ラベルを撮る / 選ぶ</span></>)}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} style={{ display: "none" }} />
        {AI && photo && <button className="read" onClick={() => doRead()} disabled={reading}>{reading ? "読み取り中…" : "ラベルから読み取る"}</button>}
      </div>
      <div className="fld"><label className="lab">ワイン名</label>
        <input className="inp" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="ラベルの一番大きい文字" /></div>
      <div className="fld"><label className="lab">生産者</label>
        <input className="inp" value={f.producer} onChange={(e) => set("producer", e.target.value)} /></div>
    </>
  );

  const plainAnswers = ANSWER_FIELDS.map((a) => (
    <div className="fld" key={a.k}>
      <label className="lab">{a.n}{a.req && <Req />}</label>
      {field(a, f[a.k], (v) => set(a.k, v), f.country)}
    </div>
  ));

  const pairedAnswers = (
    <>
      {ANSWER_FIELDS.map((a) => {
        const cur = f.blind.judge[a.k] ?? autoJudge(f.blind[a.k], f[a.k], a.num);
        return (
          <div className="cmp" key={a.k}>
            <div className="cmp-h">
              <span className="cmp-n">{a.n}</span>
              <button className={"jb" + (cur === true ? " ok" : "")} onClick={() => setF((p) => ({
                ...p, [a.k]: p.blind[a.k] || p[a.k],
                blind: { ...p.blind, judge: { ...p.blind.judge, [a.k]: true } },
              }))}>○</button>
              <button className={"jb" + (cur === false ? " ng" : "")} onClick={() => setBlind({ judge: { ...f.blind.judge, [a.k]: false } })}>×</button>
            </div>
            <div className="row2">
              <div><label className="lab">自分の回答</label>{field(a, f.blind[a.k], (v) => setBlind({ [a.k]: v }), f.blind.country)}</div>
              <div><label className="lab">正解{a.req && <Req />}</label>{field(a, f[a.k], (v) => set(a.k, v), f.country)}</div>
            </div>
          </div>
        );
      })}
      <p className="read-note">ヴィンテージと度数は完全一致で正解。品種と産地は表記ゆれを吸収して自動判定します。○×で上書きできます。</p>
    </>
  );

  const missing = [!f.grape.trim() && "ブドウ品種", !f.country.trim() && "産地（国）"].filter(Boolean);
  const canSave = missing.length === 0;

  return (
    <div>
      {/* 01 */}
      <section className="step">
        <div className="step-hd"><span className="step-n">01</span><span className="step-t">はじめに</span></div>
        <p className="step-d">飲み方を選びます。ブラインドを選ぶと、ラベルの情報は05で「ブラインド終了」を押すまで開きません。</p>

        <div className="fld">
          <label className="lab">飲み方<Req /></label>
          <div className="seg2">
            <button className={!blindOn ? "on" : ""} onClick={() => setBlind({ on: false, done: false })}>通常</button>
            <button className={blindOn ? "on" : ""} onClick={() => setBlind({ on: true })}>ブラインド</button>
          </div>
        </div>

        <div className="fld">
          <label className="lab">タイプ<Req />（香りと味わいの選択肢が切り替わります）</label>
          <div className="segs">
            {TYPES.map((x) => (
              <button key={x.id} className={t === x.id ? "on" : ""} onClick={() => set("type", x.id)}>{x.n}</button>
            ))}
          </div>
        </div>

        {!blindOn ? <>{plainAnswers}{photoAndBasic}
          <div className="fld"><label className="lab">飲んだ日</label>
            <input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div></>
          : f.blind.done ? <div className="locked">ブラインド終了。ラベルの入力と答え合わせは06にあります。</div>
            : <>
              <div className="fld"><label className="lab">飲んだ日</label>
                <input className="inp" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div className="locked">ブラインド中です。<br />02〜05を進めてから、06で自分の答えを書いてください。</div>
            </>}
      </section>

      {/* 02 */}
      <Step key="app" n="02" title="外観" collapsible
        desc="白い紙の上でグラスを傾け、ふちの色を見ます。あてはまるものをいくつでも選べます。">
        {APP_AXES(t).map((ax) => (
          <OptionAxis key={ax.id} ax={ax} sel={f.appearance[ax.id]} onToggle={(v) => toggleIn(null, "appearance", ax.id, v)}
            extra={ok(`app:${t}:${ax.id}`)} onAddOption={addO(`app:${t}:${ax.id}`)} />
        ))}
        <div className="fld"><label className="lab">外観のメモ</label>
          <textarea className="inp" value={f.appearanceMemo} onChange={(e) => set("appearanceMemo", e.target.value)} /></div>
      </Step>

      {/* 03 */}
      <Step key="ar" n="03" title="香り" collapsible
        desc={`用語選択用紙と同じ2つの分類です。押すと${typeName(t)}での感じ方が出ます。`}>
        <OptionAxis ax={{ n: "第一印象", d: "グラスを回す前の、立ち上がりの強さ。", o: FIRST_IMP(t) }}
          sel={f.aromaImp} onToggle={(v) => toggleIn(null, "aromaImp", null, v)}
          extra={ok(`imp:${t}`)} onAddOption={addO(`imp:${t}`)} />

        {[["aroma1", "果実・花・植物", "ブドウ品種そのものに由来する香り。品種を当てる最大の手がかりです。", A1],
        ["aroma2", "香辛料・芳香・化学物質", "鉱物、発酵や樽、熟成に由来する香り。造りと熟成の度合いが読めます。", A2]].map(([key, label, desc, DATA]) => (
          <div className="ax" key={key}>
            <div className="ax-h"><span className="ax-n">{label}</span>{f[key].length > 0 && <span className="ax-cnt">{f[key].length}</span>}</div>
            <p className="ax-d">{desc}</p>
            <TagGroups groups={DATA[t]} picked={f[key]} onTap={tapAroma(key)} focus={focus.k === key ? focus.w : null} type={t}
              extra={ok(`${key}:${t}`)} onAddOption={addO(`${key}:${t}`)} />
            <PickedTags list={f[key]} onRemove={(w) => toggleIn(null, key, null, w)} type={t} />
          </div>
        ))}

        <OptionAxis ax={{ n: "香りの印象", d: "香りをひととおり取ったあと、全体をどう捉えたか。", o: AROMA_IMP(t) }}
          sel={f.aromaAfter} onToggle={(v) => toggleIn(null, "aromaAfter", null, v)}
          extra={ok(`aimp:${t}`)} onAddOption={addO(`aimp:${t}`)} />

        <div className="fld"><label className="lab">香りのメモ</label>
          <textarea className="inp" value={f.aromaMemo} onChange={(e) => set("aromaMemo", e.target.value)} /></div>
      </Step>

      {/* 04 */}
      <Step key="pal" n="04" title="味わい" collapsible
        desc={`口に含んで空気を少し吸い込み、要素ごとに分けて感じます。${typeName(t)}の語彙を表示しています。`}>
        {PAL_AXES(t).map((ax) => (
          <OptionAxis key={ax.id} ax={ax} sel={f.palate[ax.id]} onToggle={(v) => toggleIn(null, "palate", ax.id, v)}
            extra={ok(`pal:${t}:${ax.id}`)} onAddOption={addO(`pal:${t}:${ax.id}`)} />
        ))}
        <div className="ax">
          <div className="ax-h"><span className="ax-n">余韻</span></div>
          <p className="ax-d">飲み込んだ後、香りと味が何秒残るか。数えるとブレません。</p>
          <div className="opts">
            {FINISH.map((o) => <button key={o} className={"opt" + (f.finish === o ? " on" : "")} onClick={() => set("finish", f.finish === o ? "" : o)}>{o}</button>)}
          </div>
        </div>
        <div className="fld"><label className="lab">味わいのメモ</label>
          <textarea className="inp" value={f.palateMemo} onChange={(e) => set("palateMemo", e.target.value)} /></div>
      </Step>

      {/* 05 */}
      <Step key="oth" n="05" title="その他" collapsible
        desc="用語選択用紙の評価・適正温度・グラスにあたる項目です。">
        {OTHER_AXES(t).map((ax) => (
          <OptionAxis key={ax.id} ax={ax} sel={f.other[ax.id]} onToggle={(v) => toggleIn(null, "other", ax.id, v)}
            extra={ok(`oth:${t}:${ax.id}`)} onAddOption={addO(`oth:${t}:${ax.id}`)} />
        ))}
      </Step>

      {/* 06 */}
      {blindOn && (
      <section className="step">
        <div className="step-hd"><span className="step-n">06</span><span className="step-t">答え合わせ</span></div>
        {(
          <>
            <p className="step-d">ラベルを見る前に、いまの分析からの推測を書きます。外した品種は「振り返り」にたまります。</p>

            {AI && !f.blind.done && (
              <>
                <button className="assist" onClick={askAssist} disabled={thinking}>
                  {thinking ? "考えています…" : "02〜04の内容から候補を挙げてもらう"}
                </button>
                {f.blind.suggestions && (
                  <>
                    {f.blind.suggestions.advice && <div className="advice">{f.blind.suggestions.advice}</div>}
                    {(f.blind.suggestions.candidates || []).map((c, i) => (
                      <button className="cand" key={i}
                        onClick={() => setBlind({ grape: c.grape || "", country: c.country || "", region: c.region || "", vintage: c.vintage ? String(c.vintage) : "" })}>
                        <div className="cand-t">{c.grape}</div>
                        <div className="cand-s">{[c.country, c.region, c.vintage].filter(Boolean).join(" · ")}</div>
                        <div className="cand-r">{c.reason}</div>
                      </button>
                    ))}
                    <p className="read-note">候補を押すと自分の回答欄に入ります。あくまで参考なので、納得できなければ自分の答えを書いてください。</p>
                  </>
                )}
              </>
            )}

            <div className="blind">
              {ANSWER_FIELDS.filter((a) => !f.blind.done).map((a) => (
                <div className="fld" key={a.k}><label className="lab">{a.n}</label>{field(a, f.blind[a.k], (v) => setBlind({ [a.k]: v }), f.blind.country)}</div>
              ))}
              <div className="fld"><label className="lab">そう考えた理由・自由記述</label>
                <textarea className="inp" value={f.blind.memo} onChange={(e) => setBlind({ memo: e.target.value })}
                  placeholder="決め手になった香り、迷った品種、切り捨てた候補など。" /></div>
            </div>

            {!f.blind.done ? (
              <button className="finish" onClick={() => setBlind({ done: true })}>ブラインドを終了して正解を入れる</button>
            ) : (
              <>
                <div className="grp-t" style={{ marginTop: 20 }}>正解を入れる</div>
                {photoAndBasic}
                {pairedAnswers}

                <Toggle on={f.truthOn} onChange={(v) => set("truthOn", v)}
                  title="外観・香り・味わいも答え合わせする" desc="ソムリエなど答えを知る人がいるときだけONに" />

                {f.truthOn && (
                  <>
                    <Accordion title="外観の正解" count={Object.values(f.truth.appearance).flat().length}>
                      {APP_AXES(t).map((ax) => (
                        <div key={ax.id}>
                          <div className="mine-row">自分：<b>{f.appearance[ax.id]?.join("、") || "—"}</b></div>
                          <OptionAxis ax={{ ...ax, d: null }} sel={f.truth.appearance[ax.id]} onToggle={(v) => toggleIn("truth", "appearance", ax.id, v)}
                            extra={ok(`app:${t}:${ax.id}`)} onAddOption={addO(`app:${t}:${ax.id}`)} />
                        </div>
                      ))}
                    </Accordion>

                    <Accordion title="香りの正解" count={f.truth.aroma1.length + f.truth.aroma2.length + f.truth.aroma3.length}>
                      {[["aroma1", "果実・花・植物", A1], ["aroma2", "香辛料・芳香・化学物質", A2]].map(([key, label, DATA]) => (
                        <div className="ax" key={key}>
                          <div className="ax-h"><span className="ax-n">{label}</span></div>
                          <div className="mine-row">自分：<b>{f[key].join("、") || "—"}</b></div>
                          <TagGroups groups={DATA[t]} picked={f.truth[key]} onTap={(w) => toggleIn("truth", key, null, w)} focus={null} type={t}
                            extra={ok(`${key}:${t}`)} onAddOption={addO(`${key}:${t}`)} />
                        </div>
                      ))}
                    </Accordion>

                    <Accordion title="味わいの正解" count={Object.values(f.truth.palate).flat().length + (f.truth.finish ? 1 : 0)}>
                      {PAL_AXES(t).map((ax) => (
                        <div key={ax.id}>
                          <div className="mine-row">自分：<b>{f.palate[ax.id]?.join("、") || "—"}</b></div>
                          <OptionAxis ax={{ ...ax, d: null }} sel={f.truth.palate[ax.id]} onToggle={(v) => toggleIn("truth", "palate", ax.id, v)}
                            extra={ok(`pal:${t}:${ax.id}`)} onAddOption={addO(`pal:${t}:${ax.id}`)} />
                        </div>
                      ))}
                      <div className="ax">
                        <div className="ax-h"><span className="ax-n">余韻</span></div>
                        <div className="mine-row">自分：<b>{f.finish || "—"}</b></div>
                        <div className="opts">
                          {FINISH.map((o) => (
                            <button key={o} className={"opt" + (f.truth.finish === o ? " on" : "")}
                              onClick={() => set("truth", { ...f.truth, finish: f.truth.finish === o ? "" : o })}>{o}</button>
                          ))}
                        </div>
                      </div>
                    </Accordion>
                  </>
                )}

                <RefPanel refs={refs || []} form={f} truth={f.truthOn ? f.truth : null}
                  show={showRef} onToggle={() => setShowRef(!showRef)} />
              </>
            )}
          </>
        )}
      </section>
      )}

      {/* 06 */}
      <section className="step">
        <div className="step-hd"><span className="step-n">{blindOn ? "07" : "06"}</span><span className="step-t">好きだったか</span></div>
        <p className="step-d">上手い下手ではなく、また飲みたいかどうかで決めて大丈夫です。</p>
        <div className="fld">
          <label className="lab">5段階評価</label>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((i) => <button key={i} className={f.rating >= i ? "on" : ""} onClick={() => set("rating", f.rating === i ? 0 : i)} aria-label={`${i}点`}>★</button>)}
          </div>
        </div>
        <div className="fld"><label className="lab">自由メモ</label>
          <textarea className="inp" value={f.memo} onChange={(e) => set("memo", e.target.value)} placeholder="誰と、何を食べながら飲んだか。" /></div>
      </section>

      <div className="savebar">
        <div className="savebar-row">
          {initial && <button className="cancel" onClick={onCancel}>やめる</button>}
          <button className="save" onClick={submit} disabled={!canSave}>{initial ? "変更を保存" : "記録する"}</button>
        </div>
        {!canSave && <div className="savehint">{missing.join("と")}を入れると保存できます</div>}
      </div>
    </div>
  );
}

/* ================= Excel書き出し ================= */
const APP_COLS = [["clarity", "清澄度"], ["shine", "輝き"], ["hue", "色調"], ["depth", "濃淡"], ["visc", "粘性"], ["imp", "外観の印象"]];
const OTHER_COLS = [["eval", "評価"], ["temp", "適正温度"], ["glass", "グラス"]];
const PAL_COLS = [["attack", "アタック"], ["sweet", "甘み"], ["acid", "酸味"], ["tannin", "タンニン分"], ["bitter", "苦味"], ["balance", "バランス"], ["alc", "アルコール"]];
const jn = (a) => (a || []).join("、");
const mark = (v) => (v === true ? "○" : v === false ? "×" : "");

/** 1件分の官能項目を {項目名: 値} にして返す。prefix を付けると正解・模範用になる */
function sensoryCols(src, type, prefix) {
  const o = {};
  if (!src) {
    APP_COLS.forEach(([, l]) => { o[prefix + l] = ""; });
    ["香りの第一印象", "果実・花・植物", "香辛料・芳香・化学物質", "香りの印象"].forEach((l) => { o[prefix + l] = ""; });
    PAL_COLS.forEach(([, l]) => { o[prefix + l] = ""; });
    o[prefix + "余韻"] = "";
    OTHER_COLS.forEach(([, l]) => { o[prefix + l] = ""; });
    return o;
  }
  APP_COLS.forEach(([k, l]) => { o[prefix + l] = jn(src.appearance?.[k]); });
  o[prefix + "香りの第一印象"] = jn(src.aromaImp);
  o[prefix + "果実・花・植物"] = jn(src.aroma1);
  o[prefix + "香辛料・芳香・化学物質"] = jn(src.aroma2);
  o[prefix + "香りの印象"] = jn(src.aromaAfter);
  PAL_COLS.forEach(([k, l]) => { o[prefix + l] = jn(src.palate?.[k]); });
  o[prefix + "余韻"] = src.finish || "";
  OTHER_COLS.forEach(([k, l]) => { o[prefix + l] = jn(src.other?.[k]); });
  return o;
}

async function exportExcel(notes, refs) {
  const XLSX = await import("xlsx");
  const sorted = [...notes].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));

  /* --- 1枚目：記録（自分の回答＋登録した正解） --- */
  const main = sorted.map((n) => {
    const b = n.blind || {};
    return {
      "日付": n.date || "", "タイプ": typeName(n.type), "ワイン名": n.name || "", "生産者": n.producer || "",
      "産地（国）": n.country || "", "産地（地方・村）": n.region || "", "ブドウ品種": n.grape || "",
      "ヴィンテージ": n.vintage || "", "アルコール度数": n.alcohol || "", "評価（5段階）": n.rating || "",
      "ブラインド": b.on ? "はい" : "いいえ",
      "自分の回答（品種）": b.on ? (b.grape || "") : "",
      "自分の回答（国）": b.on ? (b.country || "") : "",
      "自分の回答（地方）": b.on ? (b.region || "") : "",
      "自分の回答（年）": b.on ? (b.vintage || "") : "",
      "自分の回答（度数）": b.on ? (b.alcohol || "") : "",
      "正誤（品種）": b.on ? mark(b.judge?.grape) : "",
      "正誤（国）": b.on ? mark(b.judge?.country) : "",
      "正誤（地方）": b.on ? mark(b.judge?.region) : "",
      "正誤（年）": b.on ? mark(b.judge?.vintage) : "",
      "正誤（度数）": b.on ? mark(b.judge?.alcohol) : "",
      "そう考えた理由": b.memo || "",
      ...sensoryCols(n, n.type, ""),
      "官能の答え合わせ": n.truthOn ? "あり" : "",
      ...sensoryCols(n.truthOn ? n.truth : null, n.type, "正解:"),
      "外観のメモ": n.appearanceMemo || "", "香りのメモ": n.aromaMemo || "",
      "味わいのメモ": n.palateMemo || "", "自由メモ": n.memo || "",
      "写真": n.hasPhoto ? "あり" : "",
      "ID": n.id,
    };
  });

  /* --- 2枚目：項目ごとの縦持ち（自分／正解／模範を突き合わせやすい形） --- */
  const long = [];
  sorted.forEach((n) => {
    const t = n.type;
    const truth = n.truthOn ? n.truth : null;
    const model = (refs || []).find((r) => r.type === t && r.grape && n.grape &&
      r.grape.replace(/[\s・ー]/g, "") === n.grape.replace(/[\s・ー]/g, ""));
    const push = (cat, label, mine, tr, md) => {
      if (!jn(mine) && !jn(tr) && !jn(md)) return;
      long.push({
        "日付": n.date || "", "ワイン名": n.name || "", "品種": n.grape || "",
        "区分": cat, "項目": label,
        "自分": jn(mine), "正解": jn(tr), "模範": jn(md),
      });
    };
    APP_COLS.forEach(([k, l]) => push("外観", l, n.appearance?.[k], truth?.appearance?.[k], model?.appearance?.[k]));
    push("香り", "第一印象", n.aromaImp, truth?.aromaImp, model?.aromaImp);
    push("香り", "果実・花・植物", n.aroma1, truth?.aroma1, model?.aroma1);
    push("香り", "香辛料・芳香・化学物質", n.aroma2, truth?.aroma2, model?.aroma2);
    push("香り", "香りの印象", n.aromaAfter, truth?.aromaAfter, model?.aromaAfter);
    PAL_COLS.forEach(([k, l]) => push("味わい", l, n.palate?.[k], truth?.palate?.[k], model?.palate?.[k]));
    push("味わい", "余韻", n.finish ? [n.finish] : [], truth?.finish ? [truth.finish] : [], model?.finish ? [model.finish] : []);
    OTHER_COLS.forEach(([k, l]) => push("その他", l, n.other?.[k], truth?.other?.[k], model?.other?.[k]));
  });

  /* --- 3枚目：模範回答 --- */
  const refRows = [...(refs || [])].sort((a, b) => (a.grape || "").localeCompare(b.grape || "", "ja")).map((r) => ({
    "タイプ": typeName(r.type), "ブドウ品種": r.grape || "",
    "産地（国）": r.country || "", "産地（地方・村）": r.region || "",
    ...sensoryCols(r, r.type, ""),
    "覚え書き": r.memo || "", "ID": r.id,
  }));

  const wb = XLSX.utils.book_new();
  const add = (rows, name, wch) => {
    if (!rows.length) return;
    const sh = XLSX.utils.json_to_sheet(rows);
    sh["!cols"] = Object.keys(rows[0]).map((k) => ({ wch: wch || Math.min(28, Math.max(10, k.length * 2 + 2)) }));
    XLSX.utils.book_append_sheet(wb, sh, name);
  };
  add(main, "記録");
  add(long, "項目別");
  add(refRows, "模範回答");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wine-tasting-journal-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ================= 一覧 ================= */
function Notebook({ notes, onOpen, setToast, refs }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    const s = [...notes].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
    if (!k) return s;
    return s.filter((n) => [n.name, n.producer, n.country, n.region, n.grape, n.vintage, n.memo,
      ...(n.aroma1 || []), ...(n.aroma2 || []), ...(n.appearance?.hue || [])].join(" ").toLowerCase().includes(k));
  }, [notes, q]);

  return (
    <div>
      {notes.length > 0 && (
        <div className="listbar">
          <span className="listbar-n">{notes.length}件の記録</span>
          <button className="ibtn" onClick={() => {
            exportExcel(notes, refs).then(() => setToast("Excelを書き出しました"))
            .catch(() => setToast("書き出せませんでした"));
          }}>{Ico.download}Excel</button>
        </div>
      )}
      <div className="search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5C544F" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <input className="inp" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ワイン名・品種・香りの言葉で探す" />
      </div>
      {list.length === 0 ? (
        <div className="empty">
          <div className="em-t">{notes.length ? "見つかりませんでした" : "まだ1本目です"}</div>
          <p>{notes.length ? "別の言葉で探してみてください。" : "「記録する」から、いま飲んでいる1本を書きとめましょう。"}</p>
        </div>
      ) : (
        <div style={{ paddingTop: 13 }}>
          {list.map((n) => {
            const hue = (n.appearance?.hue || [])[0];
            const sw = HUE_HEX[hue] || (n.type === "white" ? "#DFC352" : "#8D2030");
            const words = [...(n.aroma1 || []), ...(n.aroma2 || [])].slice(0, 5);
            const g = n.blind?.on ? n.blind.judge?.grape : null;
            return (
              <button key={n.id} className="card" onClick={() => onOpen(n)}>
                <div className="card-t">
                  <span className="card-sw" style={{ background: sw }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="card-nm">{n.name || "名前のないワイン"}</div>
                    <div className="card-sub">{[n.grape, n.country, n.vintage].filter(Boolean).join(" · ")}</div>
                    {n.blind?.on && <span className={"badge " + (g ? "ok" : "ng")}>{g ? "品種 正解" : "品種 不正解"}</span>}
                  </div>
                  <div className="card-r">
                    <div className="card-st">{"★".repeat(n.rating || 0)}</div>
                    <div className="card-dt">{(n.date || "").replace(/-/g, ".")}</div>
                  </div>
                </div>
                {words.length > 0 && (
                  <div className="card-w">{words.map((w) => <span key={w} className="mini" style={{ background: wordMeta(w, n.type).color }}>{w}</span>)}</div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================= 詳細 ================= */
function Detail({ note, onBack, onDelete, onEdit, refs }) {
  const [photo, setPhoto] = useState(null);
  const [showRef, setShowRef] = useState(false);
  useEffect(() => { if (note.hasPhoto) loadPhoto(note.id).then(setPhoto); }, [note.id]);
  const comment = buildComment(note);
  const b = note.blind;
  const truth = note.truthOn ? note.truth : null;
  const { list, r, setSel } = useRefPicker(refs || [], note, true);

  return (
    <div>
      <div className="dt-bar">
        <button className="ibtn" onClick={onBack}>{Ico.back}一覧</button>
        <span className="dt-gap" />
        <button className="ibtn" onClick={() => onEdit(note)}>{Ico.edit}編集</button>
        <button className="ibtn danger" onClick={() => { if (confirm("この記録を削除しますか?")) onDelete(note.id); }}>{Ico.trash}削除</button>
      </div>
      {photo && <div className="dt-hero"><img src={photo} alt="ラベル" /></div>}
      <div className="dt-body">
        <div className="dt-nm">{note.name || "名前のないワイン"}</div>
        <div className="dt-sub">
          {[note.producer, note.grape, [note.country, note.region].filter(Boolean).join(" "), note.vintage, note.alcohol ? note.alcohol + "%" : ""].filter(Boolean).join("  ·  ")}
          <br />{(note.date || "").replace(/-/g, ".")}
          {note.rating ? <span style={{ color: "#6B1D1F" }}>　{"★".repeat(note.rating)}</span> : null}
        </div>

        {comment && <div className="comment"><div className="comment-l">YOUR TASTING COMMENT</div>{comment}</div>}

        {b?.on && (
          <div className="dt-sec">
            <div className="dt-sec-t">ブラインドの答え合わせ</div>
            {[["grape", "品種", note.grape], ["country", "国", note.country], ["region", "地方・村", note.region],
            ["vintage", "ヴィンテージ", note.vintage], ["alcohol", "度数", note.alcohol]].map(([k, l, actual]) =>
              (b[k] || actual) ? (
                <div className="dt-row" key={k}>
                  <span>{l}</span>
                  <span><span style={{ color: b.judge?.[k] ? "#2C5A34" : "#6B1D1F", fontWeight: 600 }}>{b.judge?.[k] ? "○" : "×"}</span>
                    　自分：{b[k] || "—"}　／　正解：{actual || "—"}</span>
                </div>
              ) : null)}
            {b.memo && <div className="dt-row"><span>考えた理由</span><span>{b.memo}</span></div>}
          </div>
        )}

        <button className={"cmp-toggle" + (showRef ? " on" : "")} onClick={() => setShowRef(!showRef)}>
          模範回答を表示する{showRef ? "　▲" : "　▼"}
        </button>

        {showRef && (
          <div className="cmp-panel">
            {!list.length ? (
              <div className="empty" style={{ padding: "24px 10px" }}>
                <div className="em-t">該当する模範回答がありません</div>
                <p>{note.grape || "この品種"}{note.country ? `（${note.country}）` : ""} の模範回答を<br />「模範」タブで登録すると、ここに並びます。</p>
              </div>
            ) : (
              <>
                <RefPicker list={list} r={r} setSel={setSel} />
                {r?.memo && <div className="advice">{r.memo}</div>}
                <p className="read-note" style={{ marginTop: 0 }}>下のテイスティング欄に「模範」の行が加わります。</p>
              </>
            )}
          </div>
        )}

        <div className="dt-sec">
          <div className="dt-sec-t">
            テイスティング{truth ? "（自分／正解" : "（自分"}{showRef && r ? "／模範" : ""}）
          </div>
          <SensoryTable note={note} truth={truth} model={showRef ? r : null} />
        </div>

        {(note.appearanceMemo || note.aromaMemo || note.palateMemo || note.memo) && (
          <div className="dt-sec">
            <div className="dt-sec-t">メモ</div>
            <div className="dt-memo">{[note.appearanceMemo, note.aromaMemo, note.palateMemo, note.memo].filter(Boolean).join("\n\n")}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= 振り返り ================= */
function Review({ notes, onOpen }) {
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("weak");
  const allBlinds = useMemo(() => notes.filter((n) => n.blind?.on), [notes]);
  const blinds = useMemo(
    () => allBlinds.filter((n) => filter === "all" || n.type === filter),
    [allBlinds, filter]);

  const stats = useMemo(() => {
    const m = {};
    blinds.forEach((n) => {
      const g = (n.grape || "").trim() || "品種未入力";
      if (!m[g]) m[g] = { grape: g, items: [], blind: 0, ok: 0 };
      const correct = !!n.blind.judge?.grape;
      m[g].blind++; if (correct) m[g].ok++;
      m[g].items.push({ note: n, correct, mine: n.blind.grape || "" });
    });
    return Object.values(m).map((x) => ({
      ...x,
      items: x.items.sort((p, q) => (q.note.date + q.note.id).localeCompare(p.note.date + p.note.id)),
      rate: x.ok / x.blind,
    })).sort((a, b) => sort === "kana" ? kana(a.grape, b.grape) : (a.rate - b.rate || b.blind - a.blind));
  }, [blinds, sort]);

  const total = blinds.length, ok = blinds.filter((n) => n.blind.judge?.grape).length;

  if (!allBlinds.length) return (
    <div className="empty">
      <div className="em-t">まだブラインドの記録がありません</div>
      <p>01で「ブラインド」を選ぶと、<br />品種ごとの正答率と過去の記録がここに並びます。</p>
    </div>
  );

  return (
    <div>
      <div className="rv-top">
        <div className="l">GRAPE ACCURACY</div>
        <div className="rv-big">{total ? Math.round((ok / total) * 100) : 0}%<small>{ok} / {total} 本</small></div>
      </div>
      <TypeTabs value={filter} onChange={setFilter} items={allBlinds} />

      <div className="sortbar">
        <span>品種別</span>
        <button className={sort === "weak" ? "on" : ""} onClick={() => setSort("weak")}>苦手な順</button>
        <button className={sort === "kana" ? "on" : ""} onClick={() => setSort("kana")}>五十音順</button>
      </div>

      {!stats.length && <div className="empty" style={{ padding: "34px 20px" }}><p>この種類の記録はありません。</p></div>}

      {stats.map((s) => {
        const isOpen = open === s.grape;
        const pc = Math.round(s.rate * 100);
        return (
          <div className="rv-item" key={s.grape}>
            <button className="rv-h" onClick={() => setOpen(isOpen ? null : s.grape)} aria-expanded={isOpen}>
              <span className="rv-g">{s.grape}</span>
              <span className="rv-bar"><i style={{ width: pc + "%" }} /></span>
              <span className="rv-pc">{pc}% {s.ok}/{s.blind}</span>
              <span className="rv-ar">{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && (
              <div className="rv-body">
                <div className="rv-sum">{s.blind}本中 {s.ok}本 正解</div>
                {s.items.map(({ note, correct, mine }) => (
                  <button className="rv-row" key={note.id} onClick={() => onOpen(note)}>
                    <span className={"rv-mk " + (correct ? "ok" : "ng")}>{correct ? "○" : "×"}</span>
                    <span className="rv-tx">
                      <b>{note.name || "名前のないワイン"}</b>
                      <em>{[(note.date || "").replace(/-/g, "."), note.country, note.vintage].filter(Boolean).join(" · ")}</em>
                      {!correct && <u>自分の答え：{mine || "未記入"}</u>}
                    </span>
                    <span className="rv-cv">›</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ height: 20 }} />
    </div>
  );
}

/* ================= App ================= */
export default function App({ user, onSignOut }) {
  const [tab, setTab] = useState("new");
  const [notes, setNotes] = useState([]);
  const [opts, setOpts] = useState({});
  const [refs, setRefs] = useState([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => { Promise.all([loadNotes(), loadOpts(), loadRefs()]).then(([n, o, r]) => { setNotes(n.map(migrateAroma)); setOpts(o); setRefs(r.map(migrateAroma)); setReady(true); }); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2600); return () => clearTimeout(t); }, [toast]);

  const restoreRefs = async () => {
    const tpl = await loadTemplates();
    if (!tpl.length) { setToast("初期セットが見つかりませんでした"); return; }
    const add = tpl.filter((t) => !refs.some((r) => r.id === t.id));
    if (!add.length) { setToast("すでに全て入っています"); return; }
    const next = [...refs, ...add];
    setRefs(next); await saveRefs(next);
    setToast(`初期セットから${add.length}件を戻しました`);
  };

  const upsertRef = async (r) => {
    const next = refs.some((x) => x.id === r.id) ? refs.map((x) => (x.id === r.id ? r : x)) : [...refs, r];
    setRefs(next); await saveRefs(next); setToast("模範回答を保存しました");
  };
  const removeRef = async (id) => {
    const next = refs.filter((x) => x.id !== id);
    setRefs(next); await saveRefs(next); setToast("模範回答を削除しました");
  };

  const addOpt = (kind, v) => {
    setOpts((p) => { const next = { ...p, [kind]: [...new Set([...(p[kind] || []), v])] }; saveOpts(next); return next; });
  };
  const add = async (note, photo) => {
    const exists = notes.some((n) => n.id === note.id);
    const next = exists ? notes.map((n) => (n.id === note.id ? note : n)) : [note, ...notes];
    setNotes(next);
    if (photo) await savePhoto(note.id, photo);
    const okk = await saveNotes(next);
    setToast(okk ? (exists ? "変更を保存しました" : "一覧に書きとめました") : "保存できませんでした");
    setEditing(null);
    if (exists) setOpen(note); else setTab("book");
  };
  const del = async (id) => {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next); setOpen(null);
    await saveNotes(next);
    await deletePhoto(id);
  };

  return (
    <div className="wn">
      <style>{CSS}</style>
      <header className="hd">
        <h1>Wine Tasting Journal</h1>
        <button className="hd-out" onClick={onSignOut} title={`${user?.email || ""} — ログアウト`} aria-label="ログアウト">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4h3a1 1 0 011 1v14a1 1 0 01-1 1h-3" /><path d="M10 16l-4-4 4-4" /><path d="M6 12h9" />
          </svg>
        </button>
      </header>

      {!open && !editing && (
        <nav className="tabs">
          <button className={"tab" + (tab === "new" ? " on" : "")} onClick={() => setTab("new")}>記録する</button>
          <button className={"tab" + (tab === "book" ? " on" : "")} onClick={() => setTab("book")}>一覧{notes.length ? <span className="tab-n">{notes.length}</span> : null}</button>
          <button className={"tab" + (tab === "rev" ? " on" : "")} onClick={() => setTab("rev")}>振り返り</button>
          <button className={"tab" + (tab === "ref" ? " on" : "")} onClick={() => setTab("ref")}>模範</button>
        </nav>
      )}

      {!ready ? <div className="loading">読み込んでいます…</div>
        : editing ? (
          <>
            <div className="editbar">記録を編集しています</div>
            <NewNote key={editing.id} initial={editing} onCancel={() => { setEditing(null); setOpen(editing); }}
              onSave={add} setToast={setToast} opts={opts} addOpt={addOpt} refs={refs} />
          </>
        )
          : open ? <Detail note={open} refs={refs} onBack={() => setOpen(null)} onDelete={del} onEdit={(n) => { setOpen(null); setEditing(n); window.scrollTo({ top: 0 }); }} />
            : tab === "new" ? <NewNote key="new" onSave={add} setToast={setToast} opts={opts} addOpt={addOpt} refs={refs} />
            : tab === "book" ? <Notebook notes={notes} onOpen={setOpen} setToast={setToast} refs={refs} />
              : tab === "rev" ? <Review notes={notes} onOpen={(n) => setOpen(n)} />
                : <RefList refs={refs} opts={opts} addOpt={addOpt} onSave={upsertRef} onDelete={removeRef} onRestore={restoreRefs} />}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

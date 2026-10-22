"""Server-side gate for the private Webbook pages."""

import base64
import asyncio
import gzip
import hashlib
import hmac
import json
import os
import re
import secrets
import time
from pathlib import Path
from urllib.parse import quote

import httpx
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse

router = APIRouter()
COOKIE_NAME = 'webbook_access'
SESSION_SECONDS = 24 * 60 * 60
MAX_FAILURES = 5
FAILURE_WINDOW_SECONDS = 15 * 60
LOCK_SECONDS = 15 * 60
failures = {}
github_cache = {}
github_tree_cache = {}
# 같은 sha의 파일 내용은 바뀌지 않으므로 계속 써도 된다. 목록을 다시 만들 때 바뀐 파일만 받는다.
github_blob_cache = {}
CATALOG_TTL = 300

LOGIN_PAGE = """<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Webbook · Sign in</title>
<style>
:root{--bg:#1c1c1e;--side:#141416;--panel:#2a2a2e;--line:#3a3a40;--text:#f4f4f6;--sub:#c4c4cc;--icon:#8d8d96;--violet:#7b2ff7;--violet-hover:#8c47ff;--ring:#a77bff;--error:#ff8a80;
--n:168px;--l:132px;--ear:60px;--ear-out:22px;--dot:18px;--step:28px;--icon-size:78px;--name:24px;--desc:16px;--label-h:88px;--card:540px;--pad:44px}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,'Malgun Gothic',sans-serif;overflow-x:hidden}
svg{display:block}
.side{position:fixed;inset:0 auto 0 0;width:88px;background:var(--side);display:flex;flex-direction:column;align-items:center;padding-top:22px;gap:26px}
.mark{font-size:26px;font-weight:900;letter-spacing:-1px;margin-bottom:12px}
.side span{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:14px;color:#e6e6ea}
.side i{display:grid;place-items:center;width:40px;height:40px;border-radius:9px}
.side .on i{background:#2f2f34}
.side svg{width:24px;height:24px;fill:none;stroke:#e6e6ea;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.bar{position:fixed;top:20px;height:56px;display:flex;align-items:center;gap:16px;padding:0 24px;background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.bar svg{width:20px;height:20px;fill:none;stroke:var(--sub);stroke-width:2;stroke-linecap:round}
.title{left:108px;font-size:22px}
.state{right:20px;font-size:16px;color:var(--sub);padding:0 8px 0 8px;gap:0}
.state>span{display:flex;align-items:center;gap:8px;padding:0 16px;height:56px}
.state>span+span{border-left:1px solid var(--line)}
.chip{height:40px!important;margin:0 8px;background:#38383e;border-radius:8px;color:var(--text)}
.switch{width:40px;height:22px;border-radius:11px;background:#4a4a52;position:relative}
.switch::after{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:#f4f4f6}
.state b{color:var(--text);font-size:17px}
.stage{min-height:100vh;margin-left:88px;display:flex;align-items:center;justify-content:center;padding:96px 24px 110px}
.flow{display:flex;align-items:flex-start;padding-top:var(--label-h)}
.mod{position:relative;width:var(--n);flex:none;text-align:center}
.node{position:relative;z-index:1;width:var(--n);height:var(--n);border-radius:50%;background:var(--c);display:grid;place-items:center}
.mod::before,.mod::after{content:"";position:absolute;top:calc(var(--n) / 2);width:var(--ear);height:var(--ear);margin-top:calc(var(--ear) / -2);border-radius:50%;background:var(--d);z-index:0}
.mod::before{left:calc(var(--ear-out) * -1)}
.mod::after{right:calc(var(--ear-out) * -1)}
.mod:first-child::before{display:none}
.node>svg{width:var(--icon-size);height:var(--icon-size);fill:#fff}
.lock .node{animation:pulse 2.4s ease-out infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 #ef413666}70%,100%{box-shadow:0 0 0 18px #ef413600}}
.clock{position:absolute;left:-14px;bottom:-10px;width:40%;aspect-ratio:1;border-radius:50%;background:#fbe7a6;border:4px solid #f5c342;display:grid;place-items:center}
.clock svg{width:70%;height:70%;fill:none;stroke:#9a7a1c;stroke-width:2.4;stroke-linecap:round}
.name{margin-top:22px;font-size:var(--name);font-weight:700;display:flex;justify-content:center;align-items:center;gap:8px;white-space:nowrap}
.name em{font-style:normal;font-size:14px;font-weight:700;height:24px;line-height:24px;padding:0 7px;border-radius:6px;background:#3a3a40}
.desc{margin-top:6px;font-size:var(--desc);color:var(--sub);white-space:nowrap}
.link{position:relative;width:var(--l);height:var(--n);flex:none;display:flex;align-items:center;justify-content:center;gap:calc(var(--step) - var(--dot))}
.link i{width:var(--dot);height:var(--dot);border-radius:50%;background:var(--d);opacity:.55;animation:run 1.2s linear infinite;animation-delay:calc(var(--k) * .3s + var(--j) * .4s)}
.link i:nth-child(1){--k:0}.link i:nth-child(2){--k:1}.link i:nth-child(3){--k:2;background:var(--d2)}
@keyframes run{0%,100%{opacity:.55}25%{opacity:1}50%{opacity:.55}}
.wrench{position:absolute;left:50%;top:calc(50% + 34px);margin-left:-10px;width:20px;height:20px;fill:var(--icon)}
.to-card{width:var(--l);height:calc(var(--n) + var(--label-h) * 2);flex:none;position:relative;display:flex;align-items:center;justify-content:center;gap:calc(var(--step) - var(--dot))}
.to-card i{width:var(--dot);height:var(--dot);border-radius:50%;background:#90302b;opacity:.55;animation:run 1.2s linear infinite;animation-delay:calc(var(--k) * .3s + 1.2s)}
.to-card i:nth-child(2){--k:0}.to-card i:nth-child(3){--k:1}.to-card i:nth-child(4){--k:2}
.pill{position:absolute;left:50%;top:calc(50% - 66px);transform:translateX(-50%);height:30px;padding:0 12px;border-radius:15px;background:var(--panel);border:1px solid var(--line);font-size:14px;color:var(--sub);white-space:nowrap;display:flex;align-items:center;gap:6px}
.card{width:var(--card);flex:none;padding:var(--pad);background:var(--panel);border:1px solid var(--line);border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.5)}
.head{display:flex;align-items:center;gap:16px;margin-bottom:32px}
.badge{width:72px;height:72px;flex:none;border-radius:50%;background:#ef4136;display:grid;place-items:center}
.badge svg{width:34px;height:34px;fill:#fff}
h1{margin:0;font-size:36px;line-height:1.15;font-weight:800;letter-spacing:-.5px}
.head p{margin:4px 0 0;font-size:17px;color:var(--sub)}
label{display:block;font-size:17px;font-weight:700;margin-bottom:10px}
input{width:100%;height:64px;padding:0 18px;background:var(--bg);border:2px solid #46464e;border-radius:12px;color:var(--text);font:inherit;font-size:20px;outline:2px solid transparent}
input:focus{border-color:var(--ring);box-shadow:0 0 0 4px #7b2ff755}
button{width:100%;height:68px;margin-top:20px;border:0;border-radius:12px;background:var(--violet);color:#fff;font:inherit;font-size:20px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:12px;transition:background .15s,transform .15s}
button svg{width:20px;height:20px;fill:#fff}
button:hover{background:var(--violet-hover);transform:translateY(-1px)}
button:active{transform:none}
button:focus-visible{outline:3px solid var(--ring);outline-offset:3px}
button:disabled{opacity:.6;cursor:wait;transform:none}
#message{min-height:24px;margin:14px 0 0;color:var(--error);font-size:16px}
.tools{position:fixed;left:calc(50% + 44px);bottom:28px;transform:translateX(-50%);height:60px;display:flex;align-items:center;gap:20px;padding:0 20px;background:var(--panel);border:1px solid var(--line);border-radius:12px}
.tools svg{width:22px;height:22px;fill:none;stroke:var(--icon);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
/* 실행 모션: 들어오면 원이 차례로 실행돼 켜지고(회전 고리→색→처리 말풍선), Lock에서 멈춰 기다린다. 맞으면 초록 체크, 틀리면 Lock만 흔들린다 */
.node>svg{grid-area:1/1;transition:opacity .25s,transform .35s cubic-bezier(.34,1.56,.64,1)}
.node{transition:filter .5s,transform .55s cubic-bezier(.34,1.56,.64,1),background .35s}
.mod::before,.mod::after{transition:filter .5s,background .35s}
.name,.desc{transition:opacity .4s}
.m .mod:not(.lit) .node,.m .mod:not(.lit)::before,.m .mod:not(.lit)::after{filter:grayscale(1) brightness(.42)}
.m .mod:not(.lit) .node{transform:scale(.9);animation:none}
.m .mod:not(.lit) .name,.m .mod:not(.lit) .desc{opacity:.4}
.node::after{content:"";position:absolute;inset:-9px;border-radius:50%;border:3px solid transparent;border-top-color:#fff;border-right-color:#ffffff55;opacity:0;transition:opacity .2s}
.run .node::after{opacity:1;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(1turn)}}
.op{position:absolute;top:0;right:0;z-index:2;min-width:max(20px,calc(var(--n) * .24));height:max(20px,calc(var(--n) * .24));padding:0 4px;border-radius:999px;background:#fff;color:#1c1c1e;font:700 max(11px,calc(var(--n) * .11))/1 system-ui,sans-serif;display:grid;place-items:center;box-shadow:0 4px 12px rgba(0,0,0,.35);transform:scale(0);transition:transform .4s cubic-bezier(.34,1.56,.64,1)}
.done .op,.ok .op,.bad .op{transform:none}
.bad .op{background:var(--error)}
.link i,.to-card i{transition:opacity .3s}
.m .link:not(.on) i,.m .to-card:not(.on) i{animation:none;opacity:.15}
.pill{transition:opacity .4s}
.m .to-card:not(.on) .pill{opacity:0}
.lock .ok-ico{opacity:0;transform:scale(.4)}
.lock.ok{--d:#17653f}
.lock.ok .node{background:#12a05c;animation:none}
.lock.ok .ok-ico{opacity:1;transform:none}
.lock.ok .node>svg:not(.ok-ico){opacity:0;transform:scale(.4)}
.lock.bad .node{animation:shake .42s cubic-bezier(.36,.07,.19,.97)}
@keyframes shake{20%,60%{translate:-8px 0}40%,80%{translate:8px 0}}
.card{transition:opacity .45s,transform .45s}
.card.leave{opacity:0;transform:translateY(12px) scale(.98)}
.badge{transition:background .35s}
.card.ok .badge{background:#12a05c}
.ok~.to-card i,.flow:has(.ok)+.to-card i{background:#17653f}
@media (max-width:1799px){:root{--n:140px;--l:104px;--ear:50px;--ear-out:18px;--dot:15px;--step:26px;--icon-size:64px;--name:21px;--label-h:84px;--card:460px;--pad:36px}}
@media (max-width:1599px){
:root{--n:120px;--l:88px;--ear:42px;--ear-out:15px;--dot:12px;--step:22px;--icon-size:54px;--name:19px;--desc:15px;--label-h:70px;--card:520px}
.stage{flex-direction:column;padding:110px 32px 48px}
.flow{padding-top:0}
.to-card{width:auto;height:96px;flex-direction:column}
.pill{left:calc(50% + 20px);top:50%;transform:translateY(-50%)}
.tools,.lock::after{display:none}}
@media (max-width:1023px){:root{--n:96px;--l:64px;--ear:34px;--ear-out:12px;--dot:10px;--step:18px;--icon-size:44px;--name:17px;--desc:14px}.state{display:none}}
@media (max-width:767px){
:root{--n:54px;--l:40px;--ear:20px;--ear-out:5px;--dot:7px;--step:11px;--icon-size:26px;--card:100%;--pad:24px}
.side,.state,.wrench,.clock,.name,.desc{display:none}
.title{left:16px;right:16px;top:16px;height:48px;font-size:17px;padding:0 16px;gap:12px}
.stage{margin-left:0;padding:96px 16px 32px}
.to-card{height:80px}
.lock .node{animation-name:pulse-sm}
.badge{width:56px;height:56px}.badge svg{width:28px;height:28px}
h1{font-size:28px}.head{margin-bottom:24px}.head p{font-size:16px}
input{height:60px;font-size:18px}button{height:64px;font-size:18px}}
@keyframes pulse-sm{0%{box-shadow:0 0 0 0 #ef413666}70%,100%{box-shadow:0 0 0 8px #ef413600}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
<script>document.documentElement.classList.add('m')</script>
<nav class="side" aria-hidden="true">
<div class="mark">W</div>
<span><i><svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/></svg></i>Home</span>
<span class="on"><i><svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg></i>Samples</span>
<span><i><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></i>Review</span>
<span><i><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg></i>History</span>
<span><i><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg></i>Settings</span>
</nav>
<div class="bar title" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>Webbook · Sign-in scenario<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg></div>
<div class="bar state" aria-hidden="true"><span class="chip"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>24h session</span><span><i class="switch"></i><b>Locked</b></span><span>? Help</span></div>
<main class="stage">
<div class="flow" role="img" aria-label="Webbook → Samples → Review → Lock">
<div class="mod" style="--c:#f5c342;--d:#93782f" aria-hidden="true"><div class="node"><svg viewBox="0 0 24 24"><path d="M2 5.5C4.6 4.3 7.7 4.3 11 6v14c-3.3-1.7-6.4-1.7-9-.5zM22 5.5C19.4 4.3 16.3 4.3 13 6v14c3.3-1.7 6.4-1.7 9-.5z"/></svg><div class="clock"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 6.5V12l4 2.5"/></svg></div></div><div class="name">Webbook<em>1</em></div><div class="desc">Open the library</div></div>
<div class="link" style="--d:#93782f;--d2:#17653f;--j:0" aria-hidden="true"><i></i><i></i><i></i><svg class="wrench" viewBox="0 0 24 24"><path d="M21 6.5a5.5 5.5 0 0 1-7.3 5.2L6 19.4a2 2 0 0 1-2.8-2.8l7.7-7.7A5.5 5.5 0 0 1 17.5 2l-3.3 3.3.9 2.6 2.6.9z"/></svg></div>
<div class="mod" style="--c:#12a05c;--d:#17653f" aria-hidden="true"><div class="node"><svg viewBox="0 0 24 24"><path d="M5 2h10l5 5v15H5zM14 2.5V8h5.5z" opacity=".95"/><path d="M8 11h9v8H8z" fill="#12a05c"/><path d="M8.8 11.8h3.2v2.4H8.8zM13 11.8h3.2v2.4H13zM8.8 15.2h3.2v2.9H8.8zM13 15.2h3.2v2.9H13z"/></svg></div><div class="name">Samples<em>192</em></div><div class="desc">Load the list</div></div>
<div class="link" style="--d:#17653f;--d2:#487635;--j:1" aria-hidden="true"><i></i><i></i><i></i><svg class="wrench" viewBox="0 0 24 24"><path d="M21 6.5a5.5 5.5 0 0 1-7.3 5.2L6 19.4a2 2 0 0 1-2.8-2.8l7.7-7.7A5.5 5.5 0 0 1 17.5 2l-3.3 3.3.9 2.6 2.6.9z"/></svg></div>
<div class="mod" style="--c:#6cbf47;--d:#487635" aria-hidden="true"><div class="node"><svg viewBox="0 0 24 24"><path d="M9.2 18.6 3.4 12.8l2.5-2.5 3.3 3.3 8.9-8.9 2.5 2.5z"/></svg></div><div class="name">Review<em>6</em></div><div class="desc">6 criteria × 5 levels</div></div>
<div class="link" style="--d:#487635;--d2:#90302b;--j:2" aria-hidden="true"><i></i><i></i><i></i><svg class="wrench" viewBox="0 0 24 24"><path d="M21 6.5a5.5 5.5 0 0 1-7.3 5.2L6 19.4a2 2 0 0 1-2.8-2.8l7.7-7.7A5.5 5.5 0 0 1 17.5 2l-3.3 3.3.9 2.6 2.6.9z"/></svg></div>
<div class="mod lock" style="--c:#ef4136;--d:#90302b" aria-hidden="true"><div class="node"><svg viewBox="0 0 24 24"><path d="M7 10V7.5a5 5 0 0 1 10 0V10h1.5a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20.5v-9A1.5 1.5 0 0 1 5.5 10zm2.6 0h4.8V7.5a2.4 2.4 0 0 0-4.8 0zM12 13.5a1.8 1.8 0 0 0-1 3.3V19h2v-2.2a1.8 1.8 0 0 0-1-3.3z"/></svg><svg class="ok-ico" viewBox="0 0 24 24"><path d="M9.2 18.6 3.4 12.8l2.5-2.5 3.3 3.3 8.9-8.9 2.5 2.5z"/></svg></div><div class="name">Lock<em>1</em></div><div class="desc">Check passcode</div></div>
</div>
<div class="to-card" aria-hidden="true"><span class="pill">Checking passcode ▽</span><i></i><i></i><i></i></div>
<section class="card">
<div class="head"><div class="badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 10V7.5a5 5 0 0 1 10 0V10h1.5a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20.5v-9A1.5 1.5 0 0 1 5.5 10zm2.6 0h4.8V7.5a2.4 2.4 0 0 0-4.8 0z"/></svg></div><div><h1>Open Webbook</h1><p>Locked · owner passcode</p></div></div>
<form id="login"><label for="passcode">Passcode</label><input id="passcode" name="passcode" type="password" autocomplete="current-password" required autofocus><button><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>Run and enter</button><p id="message" role="status" aria-live="polite"></p></form>
</section>
</main>
<div class="tools" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"/></svg><svg viewBox="0 0 24 24"><path d="m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3"/></svg><svg viewBox="0 0 24 24"><path d="M6 6h.01M12 6h.01M18 6h.01M6 12h.01M12 12h.01M18 12h.01M6 18h.01M12 18h.01M18 18h.01" stroke-width="3"/></svg><svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/></svg><svg viewBox="0 0 24 24"><path d="M5 5v14M14 5l-4 14M19 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5M4 4v4.5h4.5M12 8v4l3 2"/></svg></div>
<script>
const form=document.querySelector('#login'),field=document.querySelector('#passcode'),message=document.querySelector('#message'),button=form.querySelector('button');
const mods=[...document.querySelectorAll('.mod')],links=[...document.querySelectorAll('.link')],toCard=document.querySelector('.to-card'),card=document.querySelector('.card'),lock=mods[3];
const still=matchMedia('(prefers-reduced-motion:reduce)').matches,wait=ms=>new Promise(r=>setTimeout(r,still?0:ms));
mods.forEach(m=>{const b=document.createElement('b');b.className='op';b.textContent='1';m.querySelector('.node').append(b)});
// 들어오면 시나리오를 한 번 실행한다: 원마다 회전 고리 → 색이 켜지며 처리 말풍선 → 연결선이 흐름. Lock에서 멈춰 기다린다
(async()=>{await wait(350);for(let i=0;i<mods.length;i++){const m=mods[i];m.classList.add('run');await wait(i<3?520:420);m.classList.remove('run');m.classList.add('lit');if(i<3){m.classList.add('done');links[i].classList.add('on');await wait(240)}}toCard.classList.add('on')})();
lock.addEventListener('animationend',e=>{if(e.animationName==='shake')lock.classList.remove('bad')});
function fail(text){lock.classList.remove('run','bad');lock.querySelector('.op').textContent='!';void lock.offsetWidth;lock.classList.add('bad');message.textContent=text}
form.addEventListener('submit',async e=>{e.preventDefault();button.disabled=true;message.textContent='';lock.classList.remove('bad','ok');lock.classList.add('run');const t=Date.now();try{const r=await fetch('/b/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({passcode:field.value})});const data=await r.json().catch(()=>({}));await wait(450-(Date.now()-t));if(!r.ok){fail(data.detail||'Sign-in failed.');return}field.value='';lock.classList.remove('run');lock.querySelector('.op').textContent='1';lock.classList.add('ok');card.classList.add('ok');await wait(500);card.classList.add('leave');await wait(450);location.reload()}catch{fail('Check your connection and try again.')}finally{button.disabled=false}});
</script></html>"""


def _secret() -> str:
    return os.getenv('WEBBOOK_PASSCODE', '')


def _digest(value: str) -> bytes:
    return hashlib.sha256(value.encode('utf-8')).digest()


def _remote_key(request: Request) -> str:
    # Render supplies X-Forwarded-For. Fall back to the direct peer in local tests.
    forwarded = request.headers.get('x-forwarded-for', '').split(',', 1)[0].strip()
    return forwarded or (request.client.host if request.client else 'unknown')


def _locked_until(key: str, now: float | None = None) -> float:
    now = time.monotonic() if now is None else now
    row = failures.get(key)
    if not row:
        return 0
    if row.get('locked_until', 0) > now:
        return row['locked_until']
    if now - row.get('first', now) >= FAILURE_WINDOW_SECONDS:
        failures.pop(key, None)
    return 0


def _record_failure(key: str, now: float | None = None) -> float:
    now = time.monotonic() if now is None else now
    row = failures.get(key)
    if not row or now - row.get('first', now) >= FAILURE_WINDOW_SECONDS:
        row = {'first': now, 'count': 0}
        failures[key] = row
    row['count'] += 1
    if row['count'] >= MAX_FAILURES:
        row['locked_until'] = now + LOCK_SECONDS
        return LOCK_SECONDS
    return 0


def _make_cookie(secret: str, now: int | None = None) -> str:
    now = int(time.time()) if now is None else now
    payload = json.dumps(
        {'sub': 'owner', 'exp': now + SESSION_SECONDS, 'nonce': secrets.token_urlsafe(12)},
        separators=(',', ':'),
    ).encode()
    encoded = base64.urlsafe_b64encode(payload).rstrip(b'=').decode()
    signature = hmac.new(secret.encode(), encoded.encode(), hashlib.sha256).digest()
    return encoded + '.' + base64.urlsafe_b64encode(signature).rstrip(b'=').decode()


def valid_cookie(request: Request, now: int | None = None) -> bool:
    secret = _secret()
    token = request.cookies.get(COOKIE_NAME, '')
    if not secret or not token or len(token) > 1024 or token.count('.') != 1:
        return False
    encoded, received = token.split('.', 1)
    expected = base64.urlsafe_b64encode(
        hmac.new(secret.encode(), encoded.encode(), hashlib.sha256).digest()
    ).rstrip(b'=').decode()
    if not hmac.compare_digest(expected, received):
        return False
    try:
        padding = '=' * (-len(encoded) % 4)
        payload = json.loads(base64.urlsafe_b64decode(encoded + padding))
        current = int(time.time()) if now is None else now
        return payload.get('sub') == 'owner' and type(payload.get('exp')) is int and payload['exp'] > current
    except (ValueError, TypeError, json.JSONDecodeError):
        return False


def require_webbook_cookie(request: Request) -> None:
    if not valid_cookie(request):
        raise HTTPException(401, '웹북 로그인이 필요합니다.')


def _secure_cookie(request: Request) -> bool:
    configured = os.getenv('WEBBOOK_COOKIE_SECURE')
    if configured is not None:
        return configured.lower() == 'true'
    return request.url.hostname not in {'localhost', '127.0.0.1', 'testserver'}


def _login_page() -> HTMLResponse:
    return HTMLResponse(LOGIN_PAGE, headers={'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})


@router.post('/b/auth/login')
async def login(request: Request):
    expected = _secret()
    if not expected:
        raise HTTPException(503, '서버에 WEBBOOK_PASSCODE가 설정되지 않았습니다.')
    key = _remote_key(request)
    locked_until = _locked_until(key)
    if locked_until:
        raise HTTPException(429, 'Too many attempts. Try again in 15 minutes.', headers={'Retry-After': str(max(1, int(locked_until - time.monotonic())))})
    if request.headers.get('content-type', '').split(';', 1)[0].lower() != 'application/json':
        raise HTTPException(415, 'Invalid sign-in request.')
    raw = await request.body()
    if len(raw) > 2048:
        raise HTTPException(413, 'Sign-in request is too large.')
    try:
        data = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(400, 'Invalid sign-in request.')
    supplied = data.get('passcode', '') if isinstance(data, dict) else ''
    if not isinstance(supplied, str) or len(supplied) > 1024 or not hmac.compare_digest(_digest(expected), _digest(supplied)):
        retry = _record_failure(key)
        if retry:
            raise HTTPException(429, 'Too many attempts. Try again in 15 minutes.', headers={'Retry-After': str(retry)})
        raise HTTPException(401, 'Wrong passcode.')
    failures.pop(key, None)
    response = JSONResponse({'authenticated': True}, headers={'Cache-Control': 'no-store'})
    response.set_cookie(
        COOKIE_NAME, _make_cookie(expected), max_age=SESSION_SECONDS, path='/',
        httponly=True, secure=_secure_cookie(request), samesite='lax',
    )
    return response


@router.get('/b/auth/session')
def session(request: Request):
    return JSONResponse({'authenticated': valid_cookie(request)}, headers={'Cache-Control': 'no-store'})


@router.post('/b/auth/logout', status_code=204)
def logout(request: Request, response: Response):
    response.delete_cookie(COOKIE_NAME, path='/', httponly=True, secure=_secure_cookie(request), samesite='lax')


async def _local_file(relative_path: str) -> tuple[bytes, str] | None:
    configured = os.getenv('WEBBOOK_STATIC_DIR')
    if not configured:
        return None
    root = Path(configured).resolve()
    target = (root / relative_path).resolve()
    if root not in target.parents and target != root:
        raise HTTPException(404, '파일을 찾을 수 없습니다.')
    if not target.is_file():
        raise HTTPException(404, '파일을 찾을 수 없습니다.')
    suffix = target.suffix.lower()
    mime = {
        '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
    }.get(suffix, 'application/octet-stream')
    return target.read_bytes(), mime


def _mime(relative_path: str) -> str:
    return {
        '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
        '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2',
        '.ico': 'image/x-icon',
    }.get(Path(relative_path).suffix.lower(), 'application/octet-stream')


async def _github_tree(client: httpx.AsyncClient, repo: str, branch: str, fresh: bool = False) -> dict[str, str]:
    key = (repo, branch)
    cached = github_tree_cache.get(key)
    if cached and cached[0] > time.monotonic() and not fresh:
        return cached[1]
    response = await client.get(f'https://api.github.com/repos/{quote(repo, safe="/")}/git/trees/{quote(branch, safe="")}', params={'recursive': '1'})
    if response.status_code != 200:
        raise HTTPException(502, '비공개 웹북 파일 목록을 읽지 못했습니다.')
    tree = response.json()
    if tree.get('truncated'):
        raise HTTPException(502, '웹북 파일 목록이 너무 커서 읽을 수 없습니다.')
    paths = {row['path']: row['sha'] for row in tree.get('tree', []) if row.get('type') == 'blob'}
    github_tree_cache[key] = (time.monotonic() + 300, paths)
    return paths


def _asset_headers(etag: str) -> dict[str, str]:
    return {
        'ETag': etag,
        'Cache-Control': 'private, no-cache',
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'Cookie',
        'Accept-Ranges': 'bytes',
    }


async def _github_file(relative_path: str, if_none_match: str = '') -> tuple[bytes, str, str | None] | Response | None:
    token = os.getenv('WEBBOOK_GITHUB_TOKEN', '')
    repo = os.getenv('WEBBOOK_REPO', 'HWANG-SEONHO/webbook')
    branch = os.getenv('WEBBOOK_BRANCH', 'main')
    if not token:
        return None
    if relative_path == 'catalog.json':
        return await _github_catalog(token, repo, branch)
    source_path = relative_path if relative_path.startswith('assets/') else f'book/{relative_path}'
    key = (repo, branch, source_path)
    cached = github_cache.get(key)
    # 이미 기억한 파일이면 GitHub 연결(SSL 준비에 0.5초 안팎)을 만들지 않고 바로 돌려준다
    tree_cached = github_tree_cache.get((repo, branch))
    if tree_cached and tree_cached[0] > time.monotonic():
        sha = tree_cached[1].get(source_path)
        if not sha:
            return None
        etag = f'"{sha}"'
        if if_none_match == etag:
            return Response(status_code=304, headers=_asset_headers(etag))
        if cached and cached[2] == sha:
            return cached[1], _mime(relative_path), etag
    client = httpx.AsyncClient(timeout=30, headers={
        'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    }, limits=httpx.Limits(max_connections=20, max_keepalive_connections=10))
    try:
        tree = await _github_tree(client, repo, branch)
        sha = tree.get(source_path)
        if not sha:
            return None
        etag = f'"{sha}"'
        if if_none_match == etag:
            return Response(status_code=304, headers=_asset_headers(etag))
        if cached and cached[0] > time.monotonic() and cached[2] == sha:
            return cached[1], _mime(relative_path), etag
        response = await client.get(f'https://api.github.com/repos/{quote(repo, safe="/")}/git/blobs/{sha}')
        if response.status_code == 404:
            return None
        if response.status_code != 200:
            raise HTTPException(502, '비공개 웹북 파일을 가져오지 못했습니다.')
        data = response.json()
        if data.get('encoding') != 'base64' or not isinstance(data.get('content'), str):
            raise HTTPException(502, '웹북 파일 형식이 올바르지 않습니다.')
        content = base64.b64decode(data['content'])
        github_cache[key] = (time.monotonic() + 300, content, sha)
        return content, _mime(relative_path), etag
    finally:
        await client.aclose()


async def _github_pushed(client: httpx.AsyncClient, repo: str, branch: str, paths: list[str]) -> dict[str, str]:
    """자산 폴더마다 마지막 커밋 시각을 GraphQL 한 번으로 읽는다. 실패하면 빈 값(목록은 그대로 보인다)."""
    if not paths:
        return {}
    owner, name = repo.split('/', 1)
    fields = ' '.join(
        f'a{i}: history(first: 1, path: {json.dumps(p)}) {{ nodes {{ committedDate }} }}'
        for i, p in enumerate(paths)
    )
    query = (f'query {{ repository(owner: {json.dumps(owner)}, name: {json.dumps(name)}) '
             f'{{ object(expression: {json.dumps(branch)}) {{ ... on Commit {{ {fields} }} }} }} }}')
    try:
        response = await client.post('https://api.github.com/graphql', json={'query': query})
        commit = response.json()['data']['repository']['object']
        return {p: commit[f'a{i}']['nodes'][0]['committedDate']
                for i, p in enumerate(paths) if (commit.get(f'a{i}') or {}).get('nodes')}
    except Exception:
        return {}


async def _build_catalog(token: str, repo: str, branch: str) -> dict:
    """자산 정보와 점수를 한 번에 모은다. 파일은 sha로 기억해 바뀐 것만 GitHub에서 받는다."""
    client = httpx.AsyncClient(timeout=30, headers={
        'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    }, limits=httpx.Limits(max_connections=20, max_keepalive_connections=10))
    try:
        tree = await _github_tree(client, repo, branch, fresh=True)
        taxonomy_sha = tree.get('assets/taxonomy.json')
        if not taxonomy_sha:
            raise HTTPException(502, '웹북 분류 파일을 찾지 못했습니다.')
        gate = asyncio.Semaphore(16)

        async def blob(sha):
            if sha in github_blob_cache:
                return github_blob_cache[sha]
            async with gate:
                response = await client.get(f'https://api.github.com/repos/{quote(repo, safe="/")}/git/blobs/{sha}')
            if response.status_code != 200:
                raise HTTPException(502, '웹북 목록을 만들기 위한 파일을 읽지 못했습니다.')
            content = base64.b64decode(response.json()['content'])
            github_blob_cache[sha] = content
            return content

        taxonomy = json.loads(await blob(taxonomy_sha))
        rows, scores = [], {}
        for entry_path, sha in tree.items():
            match = re.fullmatch(r'assets/([a-z0-9-]+)/([a-z0-9-]+)/([0-9]{3}-[a-z0-9-]+)/asset\.json', entry_path)
            if match:
                rows.append((entry_path, sha, match.groups()))
            score = re.fullmatch(r'scores/([a-z0-9]+-[0-9]{3})\.json', entry_path)
            if score:
                scores[score.group(1)] = sha
        metadata = await asyncio.gather(*(blob(sha) for _, sha, _ in rows))
        score_ids = list(scores)
        score_raw = await asyncio.gather(*(blob(scores[i]) for i in score_ids))
        score_data = {}
        for sid, raw in zip(score_ids, score_raw):
            try:
                value = json.loads(raw)
            except ValueError:
                continue
            if isinstance(value, dict):
                score_data[sid] = {k: value[k] for k in ('version', 'items', 'defects', 'updated') if k in value}
        group_names = {g['id']: g['name'] for g in taxonomy.get('groups', [])}
        sub_names = {s['id']: s['name'] for g in taxonomy.get('groups', []) for s in g.get('subs', [])}
        assets = []
        for (meta_path, _, (group, sub, folder)), raw in zip(rows, metadata):
            meta = json.loads(raw)
            number = folder[:3]
            if meta.get('group') != group or meta.get('sub') != sub or meta.get('id') != f'{sub}-{number}':
                continue
            folder_path = meta_path.rsplit('/', 1)[0]
            if f'{folder_path}/index.html' not in tree:
                continue
            item = {
                **meta, 'no': int(number), 'path': folder_path,
                'entry': f'{folder_path}/index.html',
                'subName': sub_names.get(sub, sub), 'groupName': group_names.get(group, group),
            }
            if meta['id'] in score_data:
                item['scoreData'] = score_data[meta['id']]
            assets.append(item)
        pushed = await _github_pushed(client, repo, branch, [item['path'] for item in assets])
        for item in assets:
            if item['path'] in pushed:
                item['pushed'] = pushed[item['path']]
        assets.sort(key=lambda item: item['id'])
        return {'taxonomy': taxonomy, 'assets': assets, 'problems': [], 'scoresIncluded': True}
    finally:
        await client.aclose()


def _encode_catalog(state: dict) -> None:
    state['content'] = json.dumps(state['data'], ensure_ascii=False).encode()
    state['gzip'] = gzip.compress(state['content'], 6)


def patch_catalog(asset_id: str, **fields) -> None:
    """저장 직후 기억해 둔 목록에도 바로 반영한다(새로고침해도 방금 바꾼 점수·상태가 보인다)."""
    for key, state in list(github_cache.items()):
        if len(key) != 3 or key[2] != 'catalog.json' or not isinstance(state, dict):
            continue
        state.setdefault('patches', {})[asset_id] = (time.monotonic(), fields)
        for item in state['data']['assets']:
            if item.get('id') == asset_id:
                item.update(fields)
        _encode_catalog(state)


async def _refresh_catalog(key, token, repo, branch) -> None:
    state = github_cache[key]
    began = time.monotonic()
    try:
        data = await _build_catalog(token, repo, branch)
        # 만드는 사이(또는 GitHub 반영 지연 30초 안)에 저장된 변경은 다시 덮어 쓴다
        patches = {k: v for k, v in state.get('patches', {}).items() if v[0] >= began - 30}
        for item in data['assets']:
            if item.get('id') in patches:
                item.update(patches[item['id']][1])
        state.update(data=data, patches=patches, expires=time.monotonic() + CATALOG_TTL)
        _encode_catalog(state)
    except Exception:
        state['expires'] = time.monotonic() + 60
    finally:
        state['task'] = None


def prewarm_catalog() -> None:
    """서버가 켜질 때 목록을 뒤에서 미리 만들어, 첫 방문자가 10초 넘게 기다리지 않게 한다."""
    token = os.getenv('WEBBOOK_GITHUB_TOKEN', '')
    if not token or os.getenv('WEBBOOK_STATIC_DIR'):
        return
    repo = os.getenv('WEBBOOK_REPO', 'HWANG-SEONHO/webbook')
    branch = os.getenv('WEBBOOK_BRANCH', 'main')

    async def run():
        try:
            await _github_catalog(token, repo, branch)
            # 화면 파일(book/*.js·css·html)도 미리 받아 둔다
            tree = github_tree_cache.get((repo, branch), (0, {}))[1]
            names = [p[5:] for p in tree if p.startswith('book/') and p.count('/') == 1 and p.endswith(('.js', '.css', '.html'))]
            await asyncio.gather(*(_github_file(name) for name in names), return_exceptions=True)
        except Exception:
            pass  # 실패하면 첫 요청 때 다시 만든다
    asyncio.create_task(run())


async def _github_catalog(token: str, repo: str, branch: str) -> dict:
    """목록은 기억해 둔 것을 바로 돌려주고, 5분이 지났으면 뒤에서 새로 만든다(기다리게 하지 않는다)."""
    key = (repo, branch, 'catalog.json')
    state = github_cache.get(key)
    if not isinstance(state, dict):
        state = {'data': await _build_catalog(token, repo, branch), 'expires': time.monotonic() + CATALOG_TTL, 'task': None}
        _encode_catalog(state)
        github_cache[key] = state
    elif state['expires'] <= time.monotonic() and not state.get('task'):
        state['task'] = asyncio.create_task(_refresh_catalog(key, token, repo, branch))
    return state


@router.get('/b')
@router.get('/b/')
async def webbook_root(request: Request):
    if not valid_cookie(request):
        return _login_page()
    return await webbook_file(request, 'index.html')


@router.get('/b/{relative_path:path}')
async def webbook_file(request: Request, relative_path: str):
    if not valid_cookie(request):
        if relative_path in {'', 'index.html'}:
            return _login_page()
        return JSONResponse({'detail': '웹북 로그인이 필요합니다.'}, status_code=401, headers={'Cache-Control': 'no-store'})
    if not relative_path or relative_path.startswith('/') or '\\' in relative_path:
        raise HTTPException(404, '파일을 찾을 수 없습니다.')
    parts = Path(relative_path).parts
    if any(part in {'..', '.'} or part.startswith('.') for part in parts):
        raise HTTPException(404, '파일을 찾을 수 없습니다.')
    item = await _local_file(relative_path)
    if item is None:
        item = await _github_file(relative_path, request.headers.get('if-none-match', ''))
    else:
        content, mime = item
        etag = f'"{hashlib.sha1(content).hexdigest()}"'
        item = content, mime, etag if relative_path != 'catalog.json' else None
    if isinstance(item, Response):
        return item
    if item is None:
        raise HTTPException(503, '웹북 파일의 서버 경로가 설정되지 않았습니다.')
    if isinstance(item, dict):
        # 목록(약 1MB)은 gzip으로 보내면 1/6 정도로 준다
        headers = {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Cookie, Accept-Encoding'}
        if 'gzip' in request.headers.get('accept-encoding', ''):
            return Response(item['gzip'], media_type='application/json; charset=utf-8', headers={**headers, 'Content-Encoding': 'gzip'})
        return Response(item['content'], media_type='application/json; charset=utf-8', headers=headers)
    content, mime, etag = item
    headers = _asset_headers(etag) if etag else {
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Vary': 'Cookie',
        'Accept-Ranges': 'bytes',
    }
    if etag and request.headers.get('if-none-match') == etag:
        return Response(status_code=304, headers=headers)
    if relative_path == 'index.html':
        html = content.decode('utf-8')
        if '<base ' not in html:
            html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8"><base href="/b/">', 1)
        html = html.replace('https://start-in-api.onrender.com/webbook', '/b-api/webbook')
        html = html.replace(
            '<script type="module" src="book.js"></script>',
            "<script>window.WEBBOOK_STATIC={base:'/b/',apiBase:'/b-api'};</script>\n<script type=\"module\" src=\"book.js\"></script>",
        )
        content = html.encode('utf-8')
    range_header = request.headers.get('range', '')
    if range_header:
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', range_header.strip())
        if not match or (not match.group(1) and not match.group(2)):
            return Response(status_code=416, headers={**headers, 'Content-Range': f'bytes */{len(content)}'})
        if match.group(1):
            start = int(match.group(1))
            end = int(match.group(2)) if match.group(2) else len(content) - 1
        else:
            suffix = int(match.group(2))
            start, end = max(0, len(content) - suffix), len(content) - 1
        if start >= len(content) or end < start:
            return Response(status_code=416, headers={**headers, 'Content-Range': f'bytes */{len(content)}'})
        end = min(end, len(content) - 1)
        headers.update({'Content-Range': f'bytes {start}-{end}/{len(content)}', 'Content-Length': str(end - start + 1)})
        return Response(content[start:end + 1], status_code=206, media_type=mime, headers=headers)
    headers['Content-Length'] = str(len(content))
    return Response(content, media_type=mime, headers=headers)


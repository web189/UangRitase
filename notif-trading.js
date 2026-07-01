/*!
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║   BenyoPromo 2026 ULTRA × benyoriki.com — Smart Promo Notifications ║
 * ║   Premium · Glassmorphism · Neon Glow · 40s Interval               ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * benyoriki.com — Jasa Website UMKM & Bisnis
 * ─ Mulai Rp 200rb · Siap 2–6 hari kerja
 * ─ Demo Dulu Baru Bayar — tidak suka = tidak bayar
 * ─ Kasir online · Toko digital · Dashboard Firebase real-time
 * ─ Hosting & domain sudah termasuk
 * ─ By Riki Hermawan S.Kom — Real-Time Web System Specialist
 * ─ WA: +628988995637
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════
     INJECT CSS — ULTRA MODERN 2026
  ══════════════════════════════════════ */
  var style = document.createElement('style');
  style.id = 'byp-notif-style';
  style.textContent = `

    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap');

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       STACK CONTAINER
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    #byp-stack {
      position: fixed;
      bottom: 96px;
      right: 18px;
      z-index: 99500;
      display: flex;
      flex-direction: column-reverse;
      gap: 12px;
      pointer-events: none;
      width: 390px;
      max-width: calc(100vw - 20px);
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       CARD BASE — glassmorphism 2026
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-card {
      position: relative;
      border-radius: 22px;
      overflow: hidden;
      pointer-events: all;
      cursor: pointer;
      background: rgba(6, 10, 22, 0.92);
      border: 1px solid rgba(30, 110, 255, 0.18);
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.04) inset,
        0 1px 0 rgba(255,255,255,0.06) inset,
        0 16px 50px rgba(0,0,0,0.8),
        0 40px 90px rgba(0,0,0,0.55);
      backdrop-filter: blur(16px) saturate(150%);
      -webkit-backdrop-filter: blur(16px) saturate(150%);
      /* Entry state */
      transform: translateX(calc(100% + 60px)) scale(0.86) rotateY(-14deg);
      opacity: 0;
      transition:
        transform 0.75s cubic-bezier(0.34,1.56,0.64,1),
        opacity   0.48s ease,
        box-shadow 0.35s ease;
      will-change: transform, opacity;
      transform-origin: right center;
      transform-style: preserve-3d;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* Show */
    .byp-card.byp-show {
      transform: translateX(0) scale(1) rotateY(0deg);
      opacity: 1;
    }

    /* Hide */
    .byp-card.byp-hide {
      transform: translateX(calc(100% + 60px)) scale(0.84) rotateY(14deg);
      opacity: 0;
      transition:
        transform 0.45s cubic-bezier(0.4,0,0.6,1),
        opacity   0.32s ease;
    }

    /* Hover lift */
    .byp-card:hover {
      transform: translateX(-12px) scale(1.026) !important;
      transition: transform 0.32s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.32s ease !important;
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       ANIMATED BORDER GLOW
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-card::before {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: 23px;
      background: var(--byp-border, linear-gradient(135deg,rgba(30,110,255,.5),rgba(0,220,120,.35)));
      z-index: -1;
      opacity: 0;
      transition: opacity 0.7s;
    }
    .byp-card.byp-show::before {
      opacity: 1;
      animation: byp-border-pulse 3.5s ease-in-out infinite;
    }
    @keyframes byp-border-pulse {
      0%,100% { opacity: 0.5; filter: blur(0px); }
      50%      { opacity: 1;   filter: blur(0.5px); }
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       TOP ACCENT BAR
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-accent-bar {
      height: 3px;
      width: 100%;
      position: relative;
      z-index: 2;
      flex-shrink: 0;
    }
    .byp-accent-bar::after {
      content: '';
      position: absolute;
      top: 0; left: 8%; right: 8%;
      height: 16px;
      background: inherit;
      filter: blur(14px);
      opacity: 0.6;
      border-radius: 0 0 16px 16px;
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       BACKGROUND DECORATIONS
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    /* Dot grid */
    .byp-grid {
      position: absolute; inset: 0;
      background-image:
        radial-gradient(rgba(255,255,255,.045) 1px, transparent 1px);
      background-size: 20px 20px;
      pointer-events: none; z-index: 0;
    }

    /* Ambient glow orb */
    .byp-glow-orb {
      position: absolute;
      top: -80px; right: -80px;
      width: 260px; height: 260px;
      border-radius: 50%;
      opacity: 0.07;
      pointer-events: none;
      filter: blur(28px);
      z-index: 0;
      animation: byp-orb-breathe 4s ease-in-out infinite;
    }
    @keyframes byp-orb-breathe {
      0%,100% { opacity: 0.05; transform: scale(1); }
      50%      { opacity: 0.14; transform: scale(1.3); }
    }

    /* Shimmer sweep */
    .byp-shimmer {
      position: absolute; inset: 0;
      background: linear-gradient(
        115deg,
        transparent 30%,
        rgba(255,255,255,0.025) 42%,
        rgba(255,255,255,0.07) 50%,
        rgba(255,255,255,0.025) 58%,
        transparent 70%
      );
      background-size: 320% 100%;
      animation: byp-shimmer 6s ease-in-out infinite;
      pointer-events: none; z-index: 1; border-radius: inherit;
    }
    @keyframes byp-shimmer {
      0%   { background-position: 280% center; }
      100% { background-position: -280% center; }
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       HEADER ROW (logo + label + close)
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-header-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 11px 14px 0;
      position: relative;
      z-index: 10;
    }
    .byp-logo-mark {
      width: 20px; height: 20px;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; flex-shrink: 0;
      font-weight: 900;
      background: linear-gradient(135deg,#1a6bff,#00b0ff);
      color: white;
      box-shadow: 0 0 10px rgba(26,107,255,0.5);
      letter-spacing: -0.5px;
    }
    .byp-source {
      font-size: 9.5px; font-weight: 800; letter-spacing: 1.3px;
      text-transform: uppercase;
      display: flex; align-items: center; gap: 5px;
      flex: 1;
    }
    .byp-live-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #00e676; box-shadow: 0 0 8px #00e676;
      flex-shrink: 0;
      animation: byp-live 1.5s ease-in-out infinite;
    }
    @keyframes byp-live {
      0%,100% { opacity: 1; box-shadow: 0 0 8px #00e676; }
      50%      { opacity: 0.3; box-shadow: 0 0 2px #00e676; }
    }
    .byp-time {
      font-size: 9.5px; color: rgba(255,255,255,.22);
      font-family: 'JetBrains Mono', monospace;
      flex-shrink: 0;
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       CLOSE BTN
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-close {
      position: absolute; top: 10px; right: 12px;
      width: 22px; height: 22px; border-radius: 50%;
      background: rgba(255,255,255,.05);
      border: 1px solid rgba(255,255,255,.1);
      cursor: pointer; font-size: 9px;
      color: rgba(255,255,255,.28);
      display: flex; align-items: center; justify-content: center;
      transition: all .2s ease; z-index: 15; font-weight: 900;
      line-height: 1;
    }
    .byp-close:hover {
      background: rgba(255,77,100,.22);
      color: #ff4d64;
      border-color: rgba(255,77,100,.45);
      transform: scale(1.15) rotate(90deg);
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       COUNT BADGE
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-count {
      position: absolute; top: -7px; left: -7px;
      width: 20px; height: 20px; border-radius: 50%;
      background: linear-gradient(135deg,#1a6bff,#00b0ff);
      color: white; font-size: 9px; font-weight: 900;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid rgba(6,10,22,.96); z-index: 15;
      animation: byp-badge-spring .5s cubic-bezier(0.34,1.56,0.64,1);
      font-family: 'JetBrains Mono', monospace;
    }
    @keyframes byp-badge-spring {
      from { transform: scale(0) rotate(-180deg); }
      to   { transform: scale(1) rotate(0deg); }
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       INNER CONTENT
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-inner {
      padding: 10px 14px 8px;
      display: flex; gap: 12px; align-items: flex-start;
      position: relative; z-index: 2;
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       ICON
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-icon-wrap {
      width: 50px; height: 50px; border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; flex-shrink: 0; position: relative;
      border: 1px solid rgba(255,255,255,.1);
      transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
    }
    .byp-card:hover .byp-icon-wrap {
      transform: scale(1.1) rotate(-4deg);
    }
    .byp-icon-pulse {
      position: absolute; inset: -7px; border-radius: 22px;
      opacity: 0;
      animation: byp-icon-pulse 3s ease-in-out infinite;
    }
    @keyframes byp-icon-pulse {
      0%,100% { transform: scale(1); opacity: 0; }
      50%      { transform: scale(1.3); opacity: 0.14; }
    }
    .byp-icon-ring {
      position: absolute; inset: -6px; border-radius: 21px;
      border: 1.5px dashed transparent;
      animation: byp-ring-spin 5s linear infinite;
    }
    @keyframes byp-ring-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       TEXT BODY
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-body { flex: 1; min-width: 0; }

    /* URGENT flash pill */
    .byp-urgent {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 9.5px; font-weight: 800; letter-spacing: .5px;
      padding: 3px 9px; border-radius: 99px;
      margin-bottom: 6px;
      animation: byp-urgent-flash 1.6s ease-in-out infinite;
    }
    @keyframes byp-urgent-flash {
      0%,100% { opacity: 1; }
      50%      { opacity: 0.6; }
    }

    .byp-title {
      font-size: 13.5px; font-weight: 800; color: #fff;
      line-height: 1.3; margin-bottom: 5px; letter-spacing: -.2px;
    }

    /* Inline badge */
    .byp-badge {
      display: inline-flex; align-items: center;
      font-size: 9px; font-weight: 800;
      padding: 2px 8px; border-radius: 99px;
      margin-left: 6px; vertical-align: middle;
      letter-spacing: .3px; white-space: nowrap; border: 1px solid;
    }

    .byp-desc {
      font-size: 11.5px; color: rgba(255,255,255,.48); line-height: 1.65;
    }
    .byp-desc strong { color: rgba(255,255,255,.88); font-weight: 700; }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       PRICE PILLS
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-pills-row {
      display: flex; gap: 6px; margin: 8px 0 4px; flex-wrap: wrap;
    }
    .byp-pill {
      display: flex; align-items: center; gap: 4px;
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 9px; padding: 4px 10px;
      transition: background .2s ease;
    }
    .byp-card:hover .byp-pill {
      background: rgba(255,255,255,.08);
    }
    .byp-pill-label {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .7px; color: rgba(255,255,255,.35);
    }
    .byp-pill-val {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px; font-weight: 700; color: #fff;
    }
    .byp-pill-tag {
      font-size: 9px; font-weight: 800;
      padding: 1px 7px; border-radius: 99px; margin-left: 2px;
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       SOCIAL PROOF
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-proof {
      display: flex; align-items: center; gap: 7px; margin: 8px 0 2px;
    }
    .byp-avatars { display: flex; flex-shrink: 0; }
    .byp-av {
      width: 22px; height: 22px; border-radius: 50%;
      border: 2px solid rgba(6,10,22,.95);
      margin-left: -7px;
      font-size: 8px; font-weight: 900;
      display: flex; align-items: center; justify-content: center;
      color: white; flex-shrink: 0; text-transform: uppercase;
    }
    .byp-av:first-child { margin-left: 0; }
    .byp-proof-txt { font-size: 10.5px; color: rgba(255,255,255,.3); line-height: 1.3; }
    .byp-proof-num { color: rgba(255,255,255,.78); font-weight: 700; }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       WEBSITE LINK PREVIEW
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-link-preview {
      margin: 10px 14px 6px;
      padding: 9px 12px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 9px;
      position: relative;
      z-index: 2;
      overflow: hidden;
      cursor: pointer;
      transition: background 0.22s ease, border-color 0.22s ease;
    }
    .byp-link-preview:hover {
      background: rgba(26,107,255,0.08);
      border-color: rgba(26,107,255,0.3);
    }
    .byp-link-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg,#1a6bff,#00b0ff);
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; flex-shrink: 0;
      box-shadow: 0 0 14px rgba(26,107,255,0.45);
    }
    .byp-link-text { flex: 1; min-width: 0; }
    .byp-link-title {
      font-size: 11px; font-weight: 700; color: rgba(255,255,255,.85);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .byp-link-url {
      font-size: 9.5px; color: rgba(26,107,255,.85); font-family: 'JetBrains Mono', monospace;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .byp-link-arrow {
      font-size: 14px; color: rgba(255,255,255,.25); flex-shrink: 0;
      transition: transform 0.22s ease, color 0.22s ease;
    }
    .byp-link-preview:hover .byp-link-arrow {
      transform: translateX(3px);
      color: rgba(26,107,255,.9);
    }
    /* Pulse line on link preview */
    .byp-link-preview::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 2px;
      background: linear-gradient(to bottom, #1a6bff, #00b0ff);
      border-radius: 2px 0 0 2px;
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       DIVIDER
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-divider {
      height: 1px; margin: 0 14px; position: relative; z-index: 2;
      background: linear-gradient(90deg,
        transparent,
        rgba(30,110,255,.2),
        rgba(255,255,255,.06),
        transparent
      );
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       FOOTER BUTTONS
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-footer {
      padding: 9px 12px 13px;
      display: flex; gap: 7px;
      position: relative; z-index: 2;
    }

    /* CTA */
    .byp-cta {
      flex: 1; padding: 11px 13px; border-radius: 12px;
      font-size: 12px; font-weight: 800; border: none;
      cursor: pointer; color: white;
      transition: all .32s cubic-bezier(0.34,1.4,0.64,1);
      letter-spacing: .2px; position: relative; overflow: hidden;
      text-shadow: 0 1px 5px rgba(0,0,0,.4);
      font-family: 'Inter', sans-serif;
    }
    .byp-cta::before {
      content: ''; position: absolute;
      top: 0; left: -100%; width: 100%; height: 100%;
      background: linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);
      transition: left .55s ease;
    }
    .byp-cta:hover::before { left: 100%; }
    .byp-cta:hover {
      transform: translateY(-3px) scale(1.035);
      filter: brightness(1.18);
    }
    .byp-cta:active { transform: scale(0.96); }

    /* Dismiss */
    .byp-dismiss {
      padding: 11px 12px; border-radius: 12px;
      font-size: 11px; font-weight: 600;
      background: rgba(255,255,255,.05);
      border: 1px solid rgba(255,255,255,.09);
      cursor: pointer; color: rgba(255,255,255,.28);
      transition: all .22s ease; white-space: nowrap;
      font-family: 'Inter', sans-serif;
    }
    .byp-dismiss:hover {
      background: rgba(255,255,255,.1);
      color: rgba(255,255,255,.65);
      border-color: rgba(255,255,255,.2);
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       TIMER BAR (bottom)
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-timer {
      position: absolute; bottom: 0; left: 0;
      height: 2.5px; border-radius: 0 0 22px 22px;
      animation: byp-drain var(--byp-life,14s) linear forwards;
      z-index: 12;
    }
    @keyframes byp-drain { from { width:100%; } to { width:0%; } }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       PROGRESS RING
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-ring-wrap {
      position: absolute; bottom: 12px; right: 12px;
      width: 28px; height: 28px; z-index: 10;
      pointer-events: none;
    }
    .byp-ring-wrap svg { transform: rotate(-90deg); }
    .byp-ring-track { fill: none; stroke: rgba(255,255,255,.07); stroke-width: 2.5; }
    .byp-ring-fill {
      fill: none; stroke-width: 2.5;
      stroke-dasharray: 75.4;
      stroke-dashoffset: 0;
      stroke-linecap: round;
      animation: byp-ring-drain var(--byp-life,14s) linear forwards;
    }
    @keyframes byp-ring-drain {
      from { stroke-dashoffset: 0; }
      to   { stroke-dashoffset: 75.4; }
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       PARTICLE BURST
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    .byp-ptcl {
      position: absolute; width: 4px; height: 4px; border-radius: 50%;
      pointer-events: none; z-index: 25;
      animation: byp-burst .95s ease-out forwards;
    }
    @keyframes byp-burst {
      0%   { transform: translate(0,0) scale(1.4); opacity: 1; }
      100% { transform: translate(var(--px),var(--py)) scale(0); opacity: 0; }
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       SCROLL COLLAPSE
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    #byp-stack.byp-collapsed .byp-card:not(:first-child) {
      transform: translateX(0) scale(0.94) translateY(9px) !important;
      opacity: 0.35 !important; pointer-events: none;
    }

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       MOBILE
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    @media (max-width: 480px) {
      #byp-stack {
        bottom: 82px;
        right: 8px; left: 8px;
        width: auto;
      }
      .byp-card { border-radius: 18px; }
      .byp-title { font-size: 13px; }
      .byp-desc { font-size: 11px; }
      .byp-cta { font-size: 11.5px; padding: 10px 10px; }
      .byp-icon-wrap { width: 44px; height: 44px; font-size: 22px; }
      .byp-inner { padding: 10px 12px 8px; gap: 10px; }
      .byp-ring-wrap { display: none; }
      .byp-link-preview { margin: 8px 10px 4px; padding: 8px 10px; }
    }

    @media (max-width: 360px) {
      .byp-pills-row { display: none; }
    }

  `;
  document.head.appendChild(style);

  /* ══════════════════════════════════════
     CONFIG — 40 DETIK INTERVAL
  ══════════════════════════════════════ */
  var CFG = {
    url         : 'https://benyoriki.com/',
    intervalSec : 40,   // ← 40 detik per notif
    firstDelay  : 5,    // detik setelah halaman load
    lifeSec     : 16,   // durasi notif tampil
    maxStack    : 3,
  };

  /* ══════════════════════════════════════
     10 NOTIFIKASI — KONTEN ULTRA MENJUAL
  ══════════════════════════════════════ */
  var NOTIFS = [

    /* 1 ─ HERO OFFER */
    {
      accent   : 'linear-gradient(90deg,#1a6bff,#00b0ff)',
      border   : 'linear-gradient(135deg,rgba(26,107,255,.6),rgba(0,176,255,.4))',
      glow     : '#1a6bff',
      iconBg   : 'linear-gradient(135deg,rgba(26,107,255,.22),rgba(0,176,255,.14))',
      iconPls  : 'linear-gradient(135deg,#1a6bff,#00b0ff)',
      iconBdr  : 'rgba(26,107,255,.42)',
      iconRing : 'rgba(26,107,255,.55)',
      ringClr  : '#1a6bff',
      emoji    : '🚀',
      src      : 'BENYORIKI.COM',
      srcClr   : '#4d8fff',
      badge    : '⚡ Mulai Rp 200rb',
      badgeBg  : 'rgba(26,107,255,.14)',
      badgeClr : '#7dd3fc',
      urgent   : null,
      title    : 'Website Bisnis Siap dalam 2–6 Hari!',
      desc     : 'Kasir online, toko digital, dashboard Firebase — <strong>demo dulu baru bayar.</strong> Tidak suka? Tidak perlu bayar sama sekali!',
      pills    : [
        { label:'BASIC', val:'Rp 200rb', tag:'Landing Page', bg:'rgba(0,230,118,.12)', clr:'#00e676' },
        { label:'PRO',   val:'Rp 3jt',   tag:'Kasir+DB',    bg:'rgba(26,107,255,.12)', clr:'#7dd3fc' },
      ],
      proof    : ['R','A','T'], proofClr:['#00e676','#00b0ff','#4d8fff'],
      proofTxt : '<span class="byp-proof-num">127 UMKM</span> sudah konsultasi hari ini',
      linkLabel: 'Portofolio & Paket Harga Lengkap',
      cta      : '🎯 Konsultasi Gratis Sekarang →',
      ctaBg    : 'linear-gradient(135deg,#1244cc,#1a6bff)',
      ctaShd   : 'rgba(26,107,255,.5)',
      timer    : 'linear-gradient(90deg,#1a6bff,#00b0ff)',
    },

    /* 2 ─ ZERO RISK GARANSI */
    {
      accent   : 'linear-gradient(90deg,#00e676,#10b981)',
      border   : 'linear-gradient(135deg,rgba(0,230,118,.6),rgba(16,185,129,.4))',
      glow     : '#00e676',
      iconBg   : 'linear-gradient(135deg,rgba(0,230,118,.18),rgba(16,185,129,.12))',
      iconPls  : 'linear-gradient(135deg,#00e676,#10b981)',
      iconBdr  : 'rgba(0,230,118,.42)',
      iconRing : 'rgba(0,230,118,.58)',
      ringClr  : '#00e676',
      emoji    : '👁️',
      src      : 'BENYORIKI · GARANSI',
      srcClr   : '#34d399',
      badge    : '✅ Zero Risk',
      badgeBg  : 'rgba(0,230,118,.13)',
      badgeClr : '#00e676',
      urgent   : null,
      title    : 'Demo Dulu — Baru Bayar Kalau Puas!',
      desc     : 'Tidak suka hasilnya? <strong>Tidak perlu bayar sepeser pun.</strong> Bayar 50% di muka, pelunasan hanya setelah Anda setuju 100%.',
      pills    : [
        { label:'PROSES', val:'2–6 Hari',  tag:'Kerja',       bg:'rgba(0,230,118,.1)', clr:'#00e676' },
        { label:'REVISI', val:'Gratis',    tag:'Sampai Puas', bg:'rgba(52,211,153,.1)', clr:'#34d399' },
      ],
      proof    : ['K','L','M'], proofClr:['#00e676','#34d399','#6ee7b7'],
      proofTxt : '<span class="byp-proof-num">100% klien</span> puas sebelum bayar pelunasan',
      linkLabel: 'Lihat Proses & Garansi Lengkap',
      cta      : '👀 Lihat Portfolio Live →',
      ctaBg    : 'linear-gradient(135deg,#047857,#00e676)',
      ctaShd   : 'rgba(0,230,118,.42)',
      timer    : 'linear-gradient(90deg,#00e676,#10b981)',
    },

    /* 3 ─ KASIR ONLINE */
    {
      accent   : 'linear-gradient(90deg,#ffd740,#f59e0b)',
      border   : 'linear-gradient(135deg,rgba(255,215,64,.6),rgba(245,158,11,.42))',
      glow     : '#ffd740',
      iconBg   : 'linear-gradient(135deg,rgba(255,215,64,.18),rgba(245,158,11,.12))',
      iconPls  : 'linear-gradient(135deg,#ffd740,#f59e0b)',
      iconBdr  : 'rgba(255,215,64,.44)',
      iconRing : 'rgba(255,215,64,.64)',
      ringClr  : '#ffd740',
      emoji    : '🖥️',
      src      : 'BENYORIKI · KASIR',
      srcClr   : '#fbbf24',
      badge    : '🧾 Multi-Cabang',
      badgeBg  : 'rgba(255,215,64,.12)',
      badgeClr : '#ffd740',
      urgent   : null,
      title    : 'Kasir Online — Tanpa Software Mahal!',
      desc     : 'Stok <strong>auto-update</strong> saat terjual, laporan harian & bulanan, multi-cabang — cocok untuk <strong>warung, UMKM & toko retail</strong>.',
      pills    : [
        { label:'FITUR',   val:'Multi-Cabang', tag:'Kasir',  bg:'rgba(255,215,64,.1)', clr:'#ffd740' },
        { label:'LAPORAN', val:'PDF/Excel',    tag:'Export', bg:'rgba(245,158,11,.1)', clr:'#f59e0b' },
      ],
      proof    : ['W','A','R'], proofClr:['#ffd740','#f59e0b','#fed7aa'],
      proofTxt : '<span class="byp-proof-num">Puluhan warung</span> pakai kasir ini tiap hari',
      linkLabel: 'Demo Kasir Online — Coba Gratis',
      cta      : '⚡ Coba Demo Kasir Online →',
      ctaBg    : 'linear-gradient(135deg,#92400e,#f59e0b)',
      ctaShd   : 'rgba(245,158,11,.48)',
      timer    : 'linear-gradient(90deg,#ffd740,#f59e0b)',
    },

    /* 4 ─ TOKO ONLINE */
    {
      accent   : 'linear-gradient(90deg,#ff6b35,#f7931a)',
      border   : 'linear-gradient(135deg,rgba(255,107,53,.6),rgba(247,147,26,.42))',
      glow     : '#f7931a',
      iconBg   : 'linear-gradient(135deg,rgba(247,147,26,.18),rgba(255,107,53,.12))',
      iconPls  : 'linear-gradient(135deg,#f7931a,#ff6b35)',
      iconBdr  : 'rgba(247,147,26,.44)',
      iconRing : 'rgba(247,147,26,.64)',
      ringClr  : '#f7931a',
      emoji    : '🛒',
      src      : 'BENYORIKI · TOKO',
      srcClr   : '#fb923c',
      badge    : '⏰ Siap 3–5 Hari',
      badgeBg  : 'rgba(247,147,26,.13)',
      badgeClr : '#fbbf24',
      urgent   : null,
      title    : 'Toko Online Siap Jualan 3–5 Hari!',
      desc     : 'Katalog dinamis, cart, checkout, <strong>order via WhatsApp</strong> — hosting & domain <strong>sudah termasuk</strong>. Langsung jualan tanpa ribet!',
      pills    : [
        { label:'STANDAR', val:'Rp 1.2jt', tag:'Toko Online', bg:'rgba(247,147,26,.1)', clr:'#f7931a' },
        { label:'DOMAIN',  val:'Gratis',   tag:'1 Tahun',     bg:'rgba(255,107,53,.1)', clr:'#ff6b35' },
      ],
      proof    : ['F','Z','D'], proofClr:['#f7931a','#fbbf24','#ff6b35'],
      proofTxt : '<span class="byp-proof-num">Frozen food, aqua, es teler</span> sudah live!',
      linkLabel: 'Lihat Contoh Toko Online Live',
      cta      : '🛍️ Lihat Toko Online Live →',
      ctaBg    : 'linear-gradient(135deg,#9a3412,#f97316)',
      ctaShd   : 'rgba(249,115,22,.48)',
      timer    : 'linear-gradient(90deg,#f7931a,#ff6b35)',
    },

    /* 5 ─ DASHBOARD REALTIME */
    {
      accent   : 'linear-gradient(90deg,#a78bfa,#c084fc)',
      border   : 'linear-gradient(135deg,rgba(167,139,250,.6),rgba(192,132,252,.42))',
      glow     : '#a78bfa',
      iconBg   : 'linear-gradient(135deg,rgba(167,139,250,.18),rgba(192,132,252,.12))',
      iconPls  : 'linear-gradient(135deg,#a78bfa,#c084fc)',
      iconBdr  : 'rgba(167,139,250,.44)',
      iconRing : 'rgba(167,139,250,.64)',
      ringClr  : '#a78bfa',
      emoji    : '📊',
      src      : 'BENYORIKI · DASHBOARD',
      srcClr   : '#c4b5fd',
      badge    : '📈 Firebase Live',
      badgeBg  : 'rgba(167,139,250,.13)',
      badgeClr : '#d8b4fe',
      urgent   : null,
      title    : 'Pantau Bisnis Real-Time dari HP!',
      desc     : 'Omzet, stok & pesanan sinkron <strong>0ms delay</strong> via Firebase. Grafik langsung update — <strong>pantau dari warung, rumah, bahkan liburan!</strong>',
      pills    : [
        { label:'SYNC',  val:'0ms',     tag:'Firebase',    bg:'rgba(167,139,250,.1)', clr:'#a78bfa' },
        { label:'AKSES', val:'HP & PC', tag:'Multi-Device', bg:'rgba(192,132,252,.1)', clr:'#c084fc' },
      ],
      proof    : ['B','I','S'], proofClr:['#a78bfa','#c084fc','#d8b4fe'],
      proofTxt : '<span class="byp-proof-num">Data update</span> otomatis setiap detik',
      linkLabel: 'Demo Dashboard Real-Time',
      cta      : '📲 Lihat Demo Dashboard Live →',
      ctaBg    : 'linear-gradient(135deg,#5b21b6,#a855f7)',
      ctaShd   : 'rgba(124,58,237,.48)',
      timer    : 'linear-gradient(90deg,#a78bfa,#c084fc)',
    },

    /* 6 ─ SLOT TERBATAS — URGENCY */
    {
      accent   : 'linear-gradient(90deg,#ff4d6a,#ff7088)',
      border   : 'linear-gradient(135deg,rgba(255,77,106,.65),rgba(255,112,136,.42))',
      glow     : '#ff4d6a',
      iconBg   : 'linear-gradient(135deg,rgba(255,77,106,.18),rgba(255,112,136,.12))',
      iconPls  : 'linear-gradient(135deg,#ff4d6a,#ff7088)',
      iconBdr  : 'rgba(255,77,106,.48)',
      iconRing : 'rgba(255,77,106,.65)',
      ringClr  : '#ff4d6a',
      emoji    : '🔥',
      src      : 'BENYORIKI · SLOT',
      srcClr   : '#ff7088',
      badge    : '🔴 Slot Terbatas',
      badgeBg  : 'rgba(255,77,106,.13)',
      badgeClr : '#ff4d6a',
      urgent   : '⚠️ Slot Minggu Ini Hampir Penuh!',
      title    : 'Slot Proyek Hampir Habis!',
      desc     : 'Kami batasi klien baru agar <strong>kualitas tetap terjaga.</strong> Daftar konsultasi sekarang — <strong>gratis, tanpa syarat apapun!</strong>',
      pills    : [
        { label:'STATUS',     val:'Terbuka', tag:'Proyek Baru',  bg:'rgba(0,230,118,.1)', clr:'#00e676' },
        { label:'KONSULTASI', val:'Gratis',  tag:'Tanpa Syarat', bg:'rgba(255,77,106,.1)', clr:'#ff7088' },
      ],
      proof    : ['P','Q','R'], proofClr:['#ff4d6a','#ff7088','#fda4af'],
      proofTxt : '<span class="byp-proof-num">✅ Masih Terbuka</span> — daftar sebelum slot habis',
      linkLabel: 'Amankan Slot Kamu Sekarang',
      cta      : '🚨 Amankan Slot Sekarang →',
      ctaBg    : 'linear-gradient(135deg,#9f1239,#ff4d6a)',
      ctaShd   : 'rgba(255,77,106,.48)',
      timer    : 'linear-gradient(90deg,#ff4d6a,#ff7088)',
    },

    /* 7 ─ HOSTING ALL-IN */
    {
      accent   : 'linear-gradient(90deg,#34d399,#059669)',
      border   : 'linear-gradient(135deg,rgba(52,211,153,.6),rgba(5,150,105,.42))',
      glow     : '#34d399',
      iconBg   : 'linear-gradient(135deg,rgba(52,211,153,.18),rgba(5,150,105,.12))',
      iconPls  : 'linear-gradient(135deg,#34d399,#059669)',
      iconBdr  : 'rgba(52,211,153,.44)',
      iconRing : 'rgba(52,211,153,.64)',
      ringClr  : '#34d399',
      emoji    : '💰',
      src      : 'BENYORIKI · HEMAT',
      srcClr   : '#34d399',
      badge    : '✅ All-In Price',
      badgeBg  : 'rgba(52,211,153,.13)',
      badgeClr : '#6ee7b7',
      urgent   : null,
      title    : 'Hosting & Domain Sudah Termasuk!',
      desc     : 'Tidak perlu bayar di tempat lain. Semua paket <strong>langsung online</strong> — tidak ada biaya tersembunyi, <strong>beneran all-in transparan!</strong>',
      pills    : [
        { label:'BASIC',   val:'< Rp 200rb', tag:'Hosting+Domain', bg:'rgba(52,211,153,.1)', clr:'#34d399' },
        { label:'SUPPORT', val:'30 Hari',    tag:'Gratis Bug Fix', bg:'rgba(5,150,105,.1)',  clr:'#059669' },
      ],
      proof    : ['G','H','J'], proofClr:['#34d399','#10b981','#6ee7b7'],
      proofTxt : '<span class="byp-proof-num">Puluhan UMKM</span> pakai paket all-in ini',
      linkLabel: 'Lihat Semua Paket & Harga',
      cta      : '💸 Lihat Semua Paket Harga →',
      ctaBg    : 'linear-gradient(135deg,#065f46,#10b981)',
      ctaShd   : 'rgba(5,150,105,.45)',
      timer    : 'linear-gradient(90deg,#34d399,#059669)',
    },

    /* 8 ─ PORTFOLIO LIVE */
    {
      accent   : 'linear-gradient(90deg,#00b0ff,#1a6bff)',
      border   : 'linear-gradient(135deg,rgba(0,176,255,.6),rgba(26,107,255,.42))',
      glow     : '#00b0ff',
      iconBg   : 'linear-gradient(135deg,rgba(0,176,255,.18),rgba(26,107,255,.12))',
      iconPls  : 'linear-gradient(135deg,#00b0ff,#1a6bff)',
      iconBdr  : 'rgba(0,176,255,.44)',
      iconRing : 'rgba(0,176,255,.64)',
      ringClr  : '#00b0ff',
      emoji    : '🏆',
      src      : 'BENYORIKI · PORTOFOLIO',
      srcClr   : '#00b0ff',
      badge    : '⭐ 8 Website Live',
      badgeBg  : 'rgba(0,176,255,.12)',
      badgeClr : '#7dd3fc',
      urgent   : null,
      title    : 'Portfolio Nyata — Coba Langsung!',
      desc     : 'Bukan sekadar screenshot — <strong>preview website asli</strong> bisa diakses sekarang: tattoo studio, frozen food, toko aqua, es teler & lainnya.',
      pills    : [
        { label:'PROYEK', val:'8+ Live', tag:'Bisa Dicoba', bg:'rgba(0,176,255,.1)', clr:'#00b0ff' },
        { label:'RATING', val:'5/5 ⭐', tag:'Klien Puas',  bg:'rgba(26,107,255,.1)', clr:'#4d8fff' },
      ],
      proof    : ['J','D','O'], proofClr:['#00b0ff','#4d8fff','#7dd3fc'],
      proofTxt : '<span class="byp-proof-num">8 website live</span> bisa diakses sekarang',
      linkLabel: 'Lihat Portfolio 8+ Website Live',
      cta      : '🌐 Lihat Portfolio Live →',
      ctaBg    : 'linear-gradient(135deg,#0369a1,#00b0ff)',
      ctaShd   : 'rgba(0,176,255,.45)',
      timer    : 'linear-gradient(90deg,#00b0ff,#1a6bff)',
    },

    /* 9 ─ MULTI ROLE LOGIN */
    {
      accent   : 'linear-gradient(90deg,#f472b6,#ec4899)',
      border   : 'linear-gradient(135deg,rgba(244,114,182,.6),rgba(236,72,153,.42))',
      glow     : '#ec4899',
      iconBg   : 'linear-gradient(135deg,rgba(244,114,182,.18),rgba(236,72,153,.12))',
      iconPls  : 'linear-gradient(135deg,#f472b6,#ec4899)',
      iconBdr  : 'rgba(244,114,182,.44)',
      iconRing : 'rgba(244,114,182,.64)',
      ringClr  : '#f472b6',
      emoji    : '🔐',
      src      : 'BENYORIKI · SISTEM',
      srcClr   : '#f9a8d4',
      badge    : '👥 Multi-Role',
      badgeBg  : 'rgba(244,114,182,.12)',
      badgeClr : '#f9a8d4',
      urgent   : null,
      title    : 'Kelola Tim dengan Akses Berbeda!',
      desc     : 'Admin, kasir, gudang — semua punya login & hak akses sendiri. <strong>Satu dashboard terpusat</strong>, tidak perlu WA-an terus untuk koordinasi!',
      pills    : [
        { label:'AKSES', val:'Multi-Role', tag:'Admin+Kasir', bg:'rgba(244,114,182,.1)', clr:'#f472b6' },
        { label:'LOGIN', val:'Google SSO', tag:'Aman',        bg:'rgba(236,72,153,.1)',  clr:'#ec4899' },
      ],
      proof    : ['A','C','S'], proofClr:['#f472b6','#ec4899','#fbcfe8'],
      proofTxt : '<span class="byp-proof-num">Akses berbeda</span> tiap anggota tim',
      linkLabel: 'Lihat Sistem Login Multi-Role',
      cta      : '🔑 Lihat Sistem Login Multi-Role →',
      ctaBg    : 'linear-gradient(135deg,#9d174d,#ec4899)',
      ctaShd   : 'rgba(236,72,153,.45)',
      timer    : 'linear-gradient(90deg,#f472b6,#ec4899)',
    },

    /* 10 ─ KONSULTASI GRATIS */
    {
      accent   : 'linear-gradient(90deg,#22d3ee,#06b6d4)',
      border   : 'linear-gradient(135deg,rgba(34,211,238,.6),rgba(6,182,212,.42))',
      glow     : '#22d3ee',
      iconBg   : 'linear-gradient(135deg,rgba(34,211,238,.18),rgba(6,182,212,.12))',
      iconPls  : 'linear-gradient(135deg,#22d3ee,#06b6d4)',
      iconBdr  : 'rgba(34,211,238,.44)',
      iconRing : 'rgba(34,211,238,.64)',
      ringClr  : '#22d3ee',
      emoji    : '💬',
      src      : 'BENYORIKI · KONSULTASI',
      srcClr   : '#67e8f9',
      badge    : '🆓 Gratis & Cepat',
      badgeBg  : 'rgba(34,211,238,.12)',
      badgeClr : '#67e8f9',
      urgent   : null,
      title    : 'Konsultasi Gratis — Chat Langsung!',
      desc     : 'Ceritakan bisnis Anda via WhatsApp, kami bantu tentukan sistem terbaik & estimasi harga <strong>transparan tanpa syarat.</strong> Respon cepat!',
      pills    : [
        { label:'RESPON', val:'< 1 Jam',  tag:'WA Aktif',   bg:'rgba(34,211,238,.1)',  clr:'#22d3ee' },
        { label:'BIAYA',  val:'Gratis',   tag:'0 Rupiah',   bg:'rgba(6,182,212,.1)',   clr:'#06b6d4' },
      ],
      proof    : ['R','I','K'], proofClr:['#22d3ee','#06b6d4','#a5f3fc'],
      proofTxt : '<span class="byp-proof-num">Riki Hermawan S.Kom</span> — langsung reply',
      linkLabel: 'Chat WA Langsung Sekarang',
      cta      : '💬 Chat WhatsApp Sekarang →',
      ctaBg    : 'linear-gradient(135deg,#0e7490,#22d3ee)',
      ctaShd   : 'rgba(6,182,212,.45)',
      timer    : 'linear-gradient(90deg,#22d3ee,#06b6d4)',
    },

  ];

  /* ══════════════════════════════════════
     STATE
  ══════════════════════════════════════ */
  var idx = 0, num = 0, countdown = CFG.intervalSec;
  var stack = document.getElementById('byp-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.id = 'byp-stack';
    document.body.appendChild(stack);
  }

  /* ══════════════════════════════════════
     PARTICLE BURST
  ══════════════════════════════════════ */
  function burst(card, color) {
    var count = 5;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      p.className = 'byp-ptcl';
      var ang = (360 / count) * i + Math.random() * 22 - 11;
      var d   = 32 + Math.random() * 26;
      p.style.cssText =
        'background:' + color + ';' +
        'left:22px;top:22px;' +
        '--px:' + Math.cos(ang * Math.PI / 180) * d + 'px;' +
        '--py:' + Math.sin(ang * Math.PI / 180) * d + 'px;' +
        'animation-delay:' + (Math.random() * 0.07) + 's';
      card.appendChild(p);
      setTimeout(function(el){ el && el.remove(); }, 1050, p);
    }
  }

  /* ══════════════════════════════════════
     BUILD PILLS HTML
  ══════════════════════════════════════ */
  function pillsHTML(pills) {
    if (!pills || !pills.length) return '';
    return '<div class="byp-pills-row">' +
      pills.map(function(p) {
        return '<div class="byp-pill">' +
          '<span class="byp-pill-label">' + p.label + '</span>' +
          '<span class="byp-pill-val">' + p.val + '</span>' +
          '<span class="byp-pill-tag" style="background:' + p.bg + ';color:' + p.clr + '">' + p.tag + '</span>' +
          '</div>';
      }).join('') +
      '</div>';
  }

  /* ══════════════════════════════════════
     BUILD CARD HTML
  ══════════════════════════════════════ */
  function buildCard(d, n) {
    var avs = d.proof.map(function(l, i) {
      return '<div class="byp-av" style="background:' + d.proofClr[i] + ';box-shadow:0 0 6px ' + d.proofClr[i] + '66">' + l + '</div>';
    }).join('');

    var urgentHTML = d.urgent
      ? '<div class="byp-urgent" style="background:rgba(255,77,106,.12);color:#ff4d6a;border:1px solid rgba(255,77,106,.25)">' + d.urgent + '</div>'
      : '';

    /* Website link preview block */
    var linkHTML = [
      '<div class="byp-link-preview" data-byp-cta>',
        '<div class="byp-link-icon">🌐</div>',
        '<div class="byp-link-text">',
          '<div class="byp-link-title">' + (d.linkLabel || 'Kunjungi Website') + '</div>',
          '<div class="byp-link-url">benyoriki.com</div>',
        '</div>',
        '<div class="byp-link-arrow">→</div>',
      '</div>',
    ].join('');

    return [
      '<div class="byp-glow-orb" style="background:' + d.glow + '"></div>',
      '<div class="byp-grid"></div>',
      '<div class="byp-shimmer"></div>',
      '<div class="byp-accent-bar" style="background:' + d.accent + '"></div>',
      '<button class="byp-close" aria-label="Tutup">✕</button>',
      n > 1 ? '<div class="byp-count">' + n + '</div>' : '',
      /* Progress ring */
      '<div class="byp-ring-wrap">',
        '<svg width="28" height="28" viewBox="0 0 28 28">',
          '<circle class="byp-ring-track" cx="14" cy="14" r="12"/>',
          '<circle class="byp-ring-fill" cx="14" cy="14" r="12"',
            ' style="stroke:' + d.ringClr + ';--byp-life:' + CFG.lifeSec + 's"/>',
        '</svg>',
      '</div>',
      /* Header row */
      '<div class="byp-header-row">',
        '<div class="byp-logo-mark">B</div>',
        '<span class="byp-source" style="color:' + d.srcClr + '">',
          '<span class="byp-live-dot"></span>',
          d.src,
        '</span>',
        '<span class="byp-time">Baru saja</span>',
      '</div>',
      /* Main content */
      '<div class="byp-inner">',
        '<div class="byp-icon-wrap" style="background:' + d.iconBg + ';border-color:' + d.iconBdr + '">',
          '<div class="byp-icon-pulse" style="background:' + d.iconPls + '"></div>',
          '<div class="byp-icon-ring" style="border-color:' + d.iconRing + '"></div>',
          d.emoji,
        '</div>',
        '<div class="byp-body">',
          urgentHTML,
          '<div class="byp-title">' + d.title +
            '<span class="byp-badge" style="background:' + d.badgeBg + ';color:' + d.badgeClr + ';border-color:' + d.badgeClr + '44">' + d.badge + '</span>' +
          '</div>',
          '<div class="byp-desc">' + d.desc + '</div>',
          pillsHTML(d.pills),
          '<div class="byp-proof">',
            '<div class="byp-avatars">' + avs + '</div>',
            '<span class="byp-proof-txt">' + d.proofTxt + '</span>',
          '</div>',
        '</div>',
      '</div>',
      /* Link preview — THE KEY NEW ELEMENT */
      linkHTML,
      /* Footer */
      '<div class="byp-divider"></div>',
      '<div class="byp-footer">',
        '<button class="byp-cta" style="background:' + d.ctaBg + ';box-shadow:0 5px 22px ' + d.ctaShd + '">' + d.cta + '</button>',
        '<button class="byp-dismiss">Nanti</button>',
      '</div>',
      '<div class="byp-timer" style="background:' + d.timer + ';--byp-life:' + CFG.lifeSec + 's"></div>',
    ].join('');
  }

  /* ══════════════════════════════════════
     NAVIGATE
  ══════════════════════════════════════ */
  function navigate() {
    window.open(CFG.url, '_blank', 'noopener,noreferrer');
  }

  /* ══════════════════════════════════════
     DISMISS
  ══════════════════════════════════════ */
  function dismiss(card) {
    if (!card || !card.parentNode) return;
    card.classList.remove('byp-show');
    card.classList.add('byp-hide');
    setTimeout(function() { if (card.parentNode) card.remove(); }, 500);
  }

  /* ══════════════════════════════════════
     SHOW NOTIFICATION
  ══════════════════════════════════════ */
  function show() {
    var d = NOTIFS[idx % NOTIFS.length];
    idx++; num++;

    /* Limit stack */
    var existing = stack.querySelectorAll('.byp-card');
    if (existing.length >= CFG.maxStack) {
      dismiss(existing[existing.length - 1]);
    }

    var card = document.createElement('div');
    card.className = 'byp-card';
    card.setAttribute('role', 'alert');
    card.setAttribute('aria-live', 'polite');
    card.style.setProperty('--byp-border', d.border);
    card.innerHTML = buildCard(d, num);
    stack.prepend(card);

    /* Entrance animation */
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        card.classList.add('byp-show');
        setTimeout(function() { burst(card, d.glow); }, 320);
      });
    });

    /* ── EVENTS ── */
    /* Click on card body → navigate */
    card.addEventListener('click', function(e) {
      if (!e.target.closest('button') && !e.target.closest('.byp-link-preview')) {
        navigate(); dismiss(card);
      }
    });
    /* Link preview click */
    var linkEl = card.querySelector('.byp-link-preview');
    if (linkEl) {
      linkEl.addEventListener('click', function(e) {
        e.stopPropagation(); navigate(); dismiss(card);
      });
    }
    /* CTA button */
    card.querySelector('.byp-cta').addEventListener('click', function(e) {
      e.stopPropagation(); navigate(); dismiss(card);
    });
    card.querySelector('.byp-dismiss').addEventListener('click', function(e) {
      e.stopPropagation(); dismiss(card);
    });
    card.querySelector('.byp-close').addEventListener('click', function(e) {
      e.stopPropagation(); dismiss(card);
    });

    /* Swipe right to dismiss (mobile) */
    var startX = 0, startY = 0;
    card.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    card.addEventListener('touchend', function(e) {
      var dx = e.changedTouches[0].clientX - startX;
      var dy = Math.abs(e.changedTouches[0].clientY - startY);
      if (dx > 70 && dy < 40) dismiss(card);
    }, { passive: true });

    /* Auto dismiss */
    setTimeout(function() { dismiss(card); }, CFG.lifeSec * 1000);
    countdown = CFG.intervalSec;
  }

  /* ══════════════════════════════════════
     TICK — 40 DETIK INTERVAL
  ══════════════════════════════════════ */
  var tickTimer = null;
  function tick() { if (--countdown <= 0) show(); }
  function startTick() { if (!tickTimer) tickTimer = setInterval(tick, 1000); }
  function stopTick()  { clearInterval(tickTimer); tickTimer = null; }

  /* Pause saat tab tersembunyi */
  document.addEventListener('visibilitychange', function() {
    document.hidden ? stopTick() : startTick();
  });

  /* Scroll collapse */
  var lastScrollY = 0;
  window.addEventListener('scroll', function() {
    var y = window.scrollY || window.pageYOffset;
    stack.classList.toggle('byp-collapsed', y < lastScrollY && y > 180);
    lastScrollY = y;
  }, { passive: true });

  /* ══════════════════════════════════════
     INIT
  ══════════════════════════════════════ */
  function init() {
    setTimeout(show, CFG.firstDelay * 1000);
    startTick();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

}());



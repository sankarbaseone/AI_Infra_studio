import React, { useState } from "react";
import { C, DELOITTE_LOGO } from "./theme.js";
import TokenTab from "./tabs/TokenTab.jsx";
import TrainingTab from "./tabs/TrainingTab.jsx";
import InferenceTab from "./tabs/InferenceTab.jsx";
import TieredBomTab from "./tabs/TieredBomTab.jsx";

const TABS = [
  { k: "token", label: "Token Estimation", n: "01" },
  { k: "train", label: "Training Sizing", n: "02" },
  { k: "infer", label: "Inference Sizing", n: "03" },
  { k: "bom", label: "BOM & TCO", n: "04" },
];

export default function App() {
  const [tab, setTab] = useState("token");
  const [shared, setShared] = useState({});

  return (
    <div style={{ fontFamily: "'Segoe UI', Calibri, system-ui, sans-serif", background: C.grayXlt, minHeight: "100vh", color: C.ink }}>
      <header style={{ background: C.white, borderBottom: `1px solid ${C.grayLt}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <img src={DELOITTE_LOGO} alt="Deloitte" style={{ height: 30 }} />
            <div style={{ borderLeft: `1px solid ${C.grayLt}`, paddingLeft: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, lineHeight: 1.1 }}>AI Infra Studio</div>
              <div style={{ fontSize: 12, color: C.grayMd }}>On-prem sizing · tiered BOM · TCO for LLM training & inference</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.grayMd, textAlign: "right" }}>
            <div style={{ fontWeight: 700, color: C.green6 }}>AI Infrastructure COE</div>
            <div>Internal sizing tool · v2.0</div>
          </div>
        </div>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px", display: "flex", gap: 4 }}>
          {TABS.map((t) => {
            const active = tab === t.k;
            return (
              <button key={t.k} onClick={() => setTab(t.k)}
                style={{
                  border: "none", background: "transparent", cursor: "pointer",
                  padding: "12px 18px 14px", fontFamily: "inherit", fontSize: 13.5,
                  fontWeight: active ? 700 : 500, color: active ? C.ink : C.grayMd,
                  borderBottom: `3px solid ${active ? C.green : "transparent"}`,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                <span style={{ fontSize: 11, color: active ? C.green : C.grayLt, fontWeight: 700 }}>{t.n}</span>
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "28px" }}>
        {tab === "token" && <TokenTab shared={shared} setShared={setShared} />}
        {tab === "train" && <TrainingTab shared={shared} />}
        {tab === "infer" && <InferenceTab shared={shared} setShared={setShared} />}
        {tab === "bom" && <TieredBomTab shared={shared} />}
      </main>

      <footer style={{ maxWidth: 1280, margin: "0 auto", padding: "8px 28px 40px", fontSize: 11, color: C.grayMd, lineHeight: 1.6 }}>
        <div style={{ borderTop: `1px solid ${C.grayLt}`, paddingTop: 12 }}>
          Figures are indicative planning estimates derived from 2025-2026 vendor specifications and market pricing; validate against live vendor quotes before client submission.
          Deloitte Touche Tohmatsu India LLP — AI Infrastructure Advisory. For internal and client-advisory use.
        </div>
      </footer>
    </div>
  );
}

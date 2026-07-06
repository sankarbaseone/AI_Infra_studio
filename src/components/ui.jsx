import React from "react";
import { C } from "../theme.js";

export const card = {
  background: C.white, border: `1px solid ${C.grayLt}`, borderRadius: 10,
  padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};
export const labelStyle = { fontSize: 12, fontWeight: 600, color: C.grayDk, marginBottom: 6, display: "block", letterSpacing: 0.2 };
export const inputStyle = {
  width: "100%", padding: "9px 11px", fontSize: 14, border: `1px solid ${C.grayLt}`,
  borderRadius: 7, background: C.white, color: C.ink, fontFamily: "inherit", boxSizing: "border-box",
};

export function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: C.grayMd, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
export function NumIn({ value, onChange, step, min }) {
  return <input type="number" style={inputStyle} value={value} step={step} min={min}
    onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
}
export function Sel({ value, onChange, options }) {
  return (
    <select style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}
export function Stat({ label, value, sub, accent }) {
  return (
    <div style={{ ...card, padding: 16, borderLeft: `4px solid ${accent || C.green}` }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: C.grayMd, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.ink, marginTop: 4, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.grayDk, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
export function SectionTitle({ eyebrow, title }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {eyebrow && <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.green6, fontWeight: 700 }}>{eyebrow}</div>}
      <div style={{ fontSize: 20, fontWeight: 700, color: C.ink, marginTop: 2 }}>{title}</div>
    </div>
  );
}
export function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      border: `1.5px solid ${active ? C.green : C.grayLt}`, background: active ? "#EEF6E2" : C.white,
      color: active ? C.greenDark : C.grayDk, borderRadius: 999, padding: "5px 13px", fontSize: 12.5,
      fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit", marginRight: 8, marginBottom: 8,
    }}>{children}</button>
  );
}
export function DataFreshnessNote({ meta }) {
  return (
    <div style={{ fontSize: 10.5, color: C.grayMd, marginTop: 4 }}>
      Reference data last reviewed {meta.lastReviewed} · {meta.source}
    </div>
  );
}

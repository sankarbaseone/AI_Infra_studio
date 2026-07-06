import React, { useState } from "react";
import { C } from "../theme.js";
import {
  GPUS, NODES, FABRICS, STORAGE, TIERS, VENDOR_TIER_DEFAULT, MODELS,
  WORKLOAD_TYPES, WORKLOAD_FRAMEWORK_DISCLAIMER, DATA_META,
} from "../data/reference.js";
import { card, Field, NumIn, Sel, Stat, SectionTitle, Chip, DataFreshnessNote, inputStyle } from "../components/ui.jsx";
import { fmt, usd, inr, fmtTok, usdSmall } from "../lib/format.js";
import { sizeInference } from "../lib/calc.js";
import { buildBom, financingComparison, unitEconomics } from "../lib/tco.js";
import { exportTieredBomPdf } from "../exportBomPdf.js";
import { isLiveConfigReady } from "../lib/sharedSchema.js";

/** Costs + sizing for one BOM column, given a resolved gpuKey and sizing result. Identical
 * body regardless of whether `sized` came from a fresh sizeInference() call (fixed tiers) or
 * was passed through from InferenceTab's own already-computed result (live column). */
function computeTierFromInput({ gpuKey, sized, fabricKey, storageTB, storageKey, region, utilizationPct, outTok }) {
  const bom = buildBom({ gpuKey, gpuCount: sized.gpusNeeded, fabricKey, storageTB, storageCostPerTB: STORAGE[storageKey].costPerTB });
  const fin = financingComparison({ bom, gpuKey, region });
  const aggregateTokPerSec = sized.perGpuTps * bom.provisioned;
  const unit = unitEconomics({ tco3yrUsd: fin.onPrem.total3yr, aggregateTokPerSec, utilizationPct, outTokPerRequest: outTok });
  return { gpuKey, sized, bom, fin, aggregateTokPerSec, unit, storageTB, fabricKey };
}

/** Adapter: a fixed tier's own usersMid + the BOM tab's shared model/precision/context inputs. */
function tierToSizingInput(tier, vendor, { model, prec, ctx, reqPerUserHr, outTok, peakFactor, storageTB, storageKey, region, utilizationPct }) {
  const gpuKey = VENDOR_TIER_DEFAULT[vendor][tier.key];
  const peakOutTokPerSec = tier.usersMid * (reqPerUserHr / 3600) * peakFactor * outTok;
  const sized = sizeInference({ model, gpuKey, prec, peakOutTokPerSec, ctx });
  return { gpuKey, sized, fabricKey: tier.fabricDefault, storageTB, storageKey, region, utilizationPct, outTok };
}

/** Adapter: the live column. GPU count/throughput come straight from InferenceTab's own
 * already-computed `shared` values — not re-derived — so there's no second code path that
 * could drift from InferenceTab's own numbers. Vendor toggle intentionally does NOT affect
 * gpuKey here (see docs/DECISIONS.md D10) — it reflects a specific choice made elsewhere. */
function liveToSizingInput(shared, { storageKey, region, utilizationPct }) {
  const sized = { gpusNeeded: shared.inferGpus, perGpuTps: shared.perGpuTps, bound: shared.bound };
  return {
    gpuKey: shared.inferGpu, sized,
    fabricKey: shared.inferFabricKey, storageTB: shared.inferStorageTB,
    storageKey, region, utilizationPct, outTok: shared.outTok,
  };
}

export default function TieredBomTab({ shared }) {
  const [client, setClient] = useState("");
  const [vendor, setVendor] = useState("NVIDIA");
  const [modelKey, setModelKey] = useState("llama3-70b");
  const [prec, setPrec] = useState("fp8");
  const [ctx, setCtx] = useState(8192);
  const [reqPerUserHr, setReqPerUserHr] = useState(20);
  const [outTok, setOutTok] = useState(500);
  const [peakFactor, setPeakFactor] = useState(3);
  const [region, setRegion] = useState("in");
  const [utilizationPct, setUtilizationPct] = useState(0.6);
  const [storageKey, setStorageKey] = useState("san");
  const [storageTB, setStorageTB] = useState(TIERS.map((t) => t.storageDefaultTB));
  const [workloads, setWorkloads] = useState(["genai"]);
  const [selectedTierIdx, setSelectedTierIdx] = useState(1);

  const model = MODELS[modelKey];

  const toggleWorkload = (k) => setWorkloads((w) => (w.includes(k) ? w.filter((x) => x !== k) : [...w, k]));

  const liveReady = isLiveConfigReady(shared);

  const tierResults = TIERS.map((tier, i) => {
    const input = tierToSizingInput(tier, vendor, {
      model, prec, ctx, reqPerUserHr, outTok, peakFactor,
      storageTB: storageTB[i], storageKey, region, utilizationPct,
    });
    return computeTierFromInput(input);
  });
  const liveResult = liveReady
    ? computeTierFromInput(liveToSizingInput(shared, { storageKey, region, utilizationPct }))
    : { placeholder: true };
  const allResults = [...tierResults, liveResult];

  // Column headers: 3 fixed tiers + the live column, in one shape so header/chip rendering
  // doesn't need to special-case tier-vs-live.
  const columns = [
    ...TIERS.map((t) => ({ key: t.key, label: t.label, sub: `${t.usersMin}–${t.usersMax} users` })),
    { key: "live", label: "Your Configuration", sub: liveReady ? `${shared.users} users` : "" },
  ];

  // Defensive: if the live column was selected and then InferenceTab config becomes
  // unavailable again, fall back to a real tier for the financial-detail panel below.
  const effectiveSelectedIdx = selectedTierIdx === 3 && !liveReady ? 1 : selectedTierIdx;

  const workloadNotes = workloads.map((k) => WORKLOAD_TYPES[k].note);

  const cur = region === "in" ? inr : usd;

  function layerRow(label, tierCells, liveCell, remark, firstRow) {
    return (
      <tr style={{ borderTop: `1px solid ${C.grayLt}` }}>
        <td style={{ padding: "10px 12px", fontWeight: 700, color: C.white, background: C.ink, fontSize: 12.5, whiteSpace: "nowrap" }}>{label}</td>
        {tierCells.map((c, i) => (
          <td key={i} style={{ padding: "10px 12px", fontSize: 12, color: C.grayDk, verticalAlign: "top", background: i === effectiveSelectedIdx ? "#EEF6E2" : C.white }}>{c}</td>
        ))}
        {liveReady ? (
          <td style={{
            padding: "10px 12px", fontSize: 12, color: C.grayDk, verticalAlign: "top",
            background: effectiveSelectedIdx === 3 ? "#EEF6E2" : C.white, borderLeft: `2px solid ${C.green}`,
          }}>{liveCell}</td>
        ) : firstRow ? (
          <td rowSpan={7} style={{
            padding: 16, fontSize: 12.5, color: C.grayMd, textAlign: "center", verticalAlign: "middle",
            borderLeft: `2px dashed ${C.grayLt}`, background: C.grayXlt,
          }}>
            Configure the Inference tab to populate this column.
            <div style={{ marginTop: 6, fontSize: 11, color: C.teal, fontWeight: 600 }}>Go to Inference tab to configure →</div>
          </td>
        ) : null}
        <td style={{ padding: "10px 12px", fontSize: 11, color: C.grayMd, fontStyle: "italic", verticalAlign: "top" }}>{remark}</td>
      </tr>
    );
  }

  return (
    <div>
      <SectionTitle eyebrow="Deliverable · Tiered" title="Multi-Layer BOM & TCO" />
      <p style={{ fontSize: 13, color: C.grayDk, marginTop: -8, marginBottom: 16, maxWidth: 900 }}>
        Foundation / Standard / Enterprise sizing computed from the same engine as the other tabs — not static reference
        numbers. Every cell is derived live from your inputs below. The 4th column, "Your Configuration," reflects
        whatever you've configured on the Inference tab.
      </p>

      {/* Inputs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14, marginBottom: 16, ...card, padding: 16 }}>
        <Field label="Client / engagement"><input style={inputStyle} value={client} placeholder="e.g. Oriental Insurance" onChange={(e) => setClient(e.target.value)} /></Field>
        <Field label="Vendor" hint="Neutral: switch to compare">
          <Sel value={vendor} onChange={setVendor} options={[{ v: "NVIDIA", l: "NVIDIA" }, { v: "AMD", l: "AMD" }]} />
        </Field>
        <Field label="Model">
          <Sel value={modelKey} onChange={setModelKey} options={Object.keys(MODELS).filter((k) => k !== "custom").map((k) => ({ v: k, l: MODELS[k].name }))} />
        </Field>
        <Field label="Precision">
          <Sel value={prec} onChange={setPrec} options={[{ v: "fp16", l: "FP16" }, { v: "fp8", l: "FP8" }, { v: "int4", l: "INT4" }]} />
        </Field>
        <Field label="Context window"><NumIn value={ctx} onChange={setCtx} step={1024} min={0} /></Field>
        <Field label="Output tok/request"><NumIn value={outTok} onChange={setOutTok} step={50} min={0} /></Field>
        <Field label="Requests/user/hr"><NumIn value={reqPerUserHr} onChange={setReqPerUserHr} step={1} min={0} /></Field>
        <Field label="Peak-to-average factor"><NumIn value={peakFactor} onChange={setPeakFactor} step={1} min={1} /></Field>
        <Field label="Avg. utilization" hint="For cost-per-token">
          <NumIn value={utilizationPct} onChange={setUtilizationPct} step={0.05} min={0.05} />
        </Field>
        <Field label="Storage tier">
          <Sel value={storageKey} onChange={setStorageKey} options={Object.keys(STORAGE).map((k) => ({ v: k, l: STORAGE[k].name }))} />
        </Field>
        <Field label="Region / tariff">
          <Sel value={region} onChange={setRegion} options={[{ v: "in", l: "India (₹8/kWh)" }, { v: "us", l: "US ($0.12/kWh)" }]} />
        </Field>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.grayDk, marginBottom: 6, display: "block" }}>Storage per tier (TB)</label>
          <div style={{ display: "flex", gap: 6 }}>
            {TIERS.map((t, i) => (
              <input key={t.key} type="number" style={{ ...inputStyle, padding: "6px 8px" }} value={storageTB[i]}
                onChange={(e) => setStorageTB((s) => s.map((v, j) => (j === i ? Number(e.target.value) : v)))} title={t.label} />
            ))}
          </div>
        </div>
      </div>

      {/* Workload chips */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.grayDk, marginBottom: 8 }}>Workload types (informational — see disclaimer below)</div>
        {Object.keys(WORKLOAD_TYPES).map((k) => (
          <Chip key={k} active={workloads.includes(k)} onClick={() => toggleWorkload(k)}>{WORKLOAD_TYPES[k].label}</Chip>
        ))}
        {workloadNotes.length > 0 && (
          <div style={{ ...card, background: C.grayXlt, fontSize: 11.5, color: C.grayDk, marginTop: 6 }}>
            {workloadNotes.map((n, i) => <div key={i} style={{ marginBottom: 3 }}>• {n}</div>)}
            <div style={{ marginTop: 6, color: C.amber, fontWeight: 600 }}>{WORKLOAD_FRAMEWORK_DISCLAIMER}</div>
          </div>
        )}
      </div>

      {/* Tiered matrix */}
      <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ background: C.ink, color: C.white, padding: "10px 16px", fontSize: 13, fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
          <span>Production BOM{client ? ` — ${client}` : ""} — Training · Inferencing · GenAI · RAG</span>
          <span style={{ color: C.green }}>{vendor}</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ padding: "10px 12px", background: C.ink, color: C.white, fontSize: 12, textAlign: "left" }}>Layer</th>
              {columns.map((col, i) => (
                <th key={col.key} onClick={() => setSelectedTierIdx(i)} style={{
                  padding: "10px 12px",
                  background: i === effectiveSelectedIdx ? C.green : (col.key === "live" ? C.grayDk : C.teal),
                  color: C.white, fontSize: 12.5, textAlign: "left", cursor: "pointer",
                  borderLeft: col.key === "live" ? `2px solid ${liveReady ? C.green : C.grayLt}` : undefined,
                }}>
                  {col.label}<div style={{ fontWeight: 400, fontSize: 10.5 }}>{col.sub}</div>
                </th>
              ))}
              <th style={{ padding: "10px 12px", background: C.ink, color: C.white, fontSize: 12, textAlign: "left" }}>Remark</th>
            </tr>
          </thead>
          <tbody>
            {layerRow("Training",
              tierResults.map((r) => `${r.bom.provisioned}× ${GPUS[r.gpuKey].name}\n${r.bom.node.hostCpu}, ${fmt(r.bom.node.ram)} GB RAM`),
              liveReady && `${liveResult.bom.provisioned}× ${GPUS[liveResult.gpuKey].name}\n${liveResult.bom.node.hostCpu}, ${fmt(liveResult.bom.node.ram)} GB RAM`,
              "Shared pool sized to concurrent serving demand; add dedicated capacity for concurrent fine-tuning.",
              true
            )}
            {layerRow("Inference",
              tierResults.map((r) => `${r.bom.provisioned}× ${GPUS[r.gpuKey].name}\n${GPUS[r.gpuKey].hbm} GB VRAM each`),
              liveReady && `${liveResult.bom.provisioned}× ${GPUS[liveResult.gpuKey].name}\n${GPUS[liveResult.gpuKey].hbm} GB VRAM each`,
              "Sized live from concurrent users, context length and precision — not a static reference number."
            )}
            {layerRow("Token Processing (capacity)",
              tierResults.map((r) => `~${fmt(r.aggregateTokPerSec)} tok/s aggregate\n${fmt(r.sized.perGpuTps)} tok/s/GPU · ${r.bom.provisioned} GPUs`),
              liveReady && `~${fmt(liveResult.aggregateTokPerSec)} tok/s aggregate\n${fmt(liveResult.sized.perGpuTps)} tok/s/GPU · ${liveResult.bom.provisioned} GPUs`,
              `Memory-bandwidth-bound estimate; ${allResults[effectiveSelectedIdx].sized.bound} at the selected column.`
            )}
            {layerRow("Storage",
              tierResults.map((r) => `${fmt(r.storageTB)} TB\n${STORAGE[storageKey].name}`),
              liveReady && `${fmt(liveResult.storageTB)} TB\n${STORAGE[storageKey].name}`,
              "Capacity only — throughput (GB/s) sizing is part of the detailed engagement."
            )}
            {layerRow("Control Nodes",
              tierResults.map((r) => `3× nodes (HA cluster)\n${r.bom.ctrlVcpu} vCPU · ${r.bom.ctrlRam} GB RAM each`),
              liveReady && `3× nodes (HA cluster)\n${liveResult.bom.ctrlVcpu} vCPU · ${liveResult.bom.ctrlRam} GB RAM each`,
              "HA control-plane sizing, derived live from GPU compute-node count."
            )}
            {layerRow("Network Fabric",
              TIERS.map((t) => `${FABRICS[t.fabricDefault].name}\n${FABRICS[t.fabricDefault].note}`),
              liveReady && `${FABRICS[shared.inferFabricKey].name}\n${FABRICS[shared.inferFabricKey].note}`,
              "Fabric choice directly affects achievable MFU — see Training tab."
            )}
            {layerRow("Concurrent Users",
              TIERS.map((t) => `${t.usersMin}–${t.usersMax}`),
              liveReady && `${shared.users}`,
              "Fixed tier bands; Your Configuration reflects the Inference tab's exact input."
            )}
          </tbody>
        </table>
      </div>

      {/* Per-tier financial detail */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {columns.filter((col, i) => i < 3 || liveReady).map((col, i) => (
          <Chip key={col.key} active={i === effectiveSelectedIdx} onClick={() => setSelectedTierIdx(i)}>{col.label} financials</Chip>
        ))}
      </div>
      {(() => {
        const r = allResults[effectiveSelectedIdx];
        return (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 14 }}>
              <Stat label="Total CapEx" value={usd(r.bom.capex)} sub={region === "in" ? "≈ " + inr(r.bom.capex * 83.5) : ""} />
              <Stat label="3-Year TCO (on-prem)" value={usd(r.fin.onPrem.total3yr)} accent={C.greenDark} />
              <Stat label="Cost / 1K tokens" value={usdSmall(r.unit.costPerToken * 1000)} sub={fmt(utilizationPct * 100, 0) + "% avg. utilization"} />
              <Stat label="Cost / inference" value={usdSmall(r.unit.costPerInference)} sub={outTok + " output tok/request"} />
            </div>
            <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ background: C.ink, color: C.white, padding: "10px 16px", fontSize: 13, fontWeight: 700 }}>
                Financing comparison — {columns[effectiveSelectedIdx].label}, 3-year, 24×7
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.grayXlt, color: C.grayDk, textAlign: "left" }}>
                    <th style={{ padding: "8px 16px" }}>Model</th><th style={{ padding: "8px 16px" }}>3-Year Total</th><th style={{ padding: "8px 16px" }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {["onPrem", "cloud", "gaas", "colo"].map((k) => (
                    <tr key={k} style={{ borderTop: `1px solid ${C.grayLt}`, background: r.fin.cheapestKey === k ? "#EEF6E2" : C.white }}>
                      <td style={{ padding: "9px 16px", fontWeight: 700, color: C.ink }}>{r.fin[k].label}{r.fin.cheapestKey === k ? " ✓" : ""}</td>
                      <td style={{ padding: "9px 16px", fontWeight: 600 }}>{usd(r.fin[k].total3yr)}</td>
                      <td style={{ padding: "9px 16px", color: C.grayDk, fontSize: 12 }}>{r.fin[k].note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => exportTieredBomPdf({ client, vendor, columns, results: allResults, liveReady, region, cur: region === "in" ? inr : usd, usd, inr })}
              style={{ background: C.green, color: C.white, border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Export Tiered BOM to PDF
            </button>
          </>
        );
      })()}

      <div style={{ marginTop: 18 }}>
        <DataFreshnessNote meta={DATA_META.gpus} />
        <DataFreshnessNote meta={DATA_META.costFactors} />
      </div>
    </div>
  );
}

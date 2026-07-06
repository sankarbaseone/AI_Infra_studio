import React, { useState } from "react";
import { C } from "../theme.js";
import { GPUS, FABRICS, MFU_BANDS } from "../data/reference.js";
import { card, Field, NumIn, Sel, Stat, SectionTitle } from "../components/ui.jsx";
import { fmtBig, fmt } from "../lib/format.js";
import { trainingFlops, clusterPeak, trainingMemGB } from "../lib/calc.js";

export default function TrainingTab({ shared }) {
  const [paramsB, setParamsB] = useState(70);
  const [tokensT, setTokensT] = useState(shared.effTokensT || 2);
  const [gpu, setGpu] = useState("h100");
  const [count, setCount] = useState(128);
  const [prec, setPrec] = useState("bf16");
  const [mfu, setMfu] = useState(0.5);
  const [fabric, setFabric] = useState("ib");
  const [deadline, setDeadline] = useState(30);

  const effMfu = Math.max(0.1, mfu + FABRICS[fabric].mfuBonus);
  const flops = trainingFlops(paramsB, tokensT);
  const peak = clusterPeak(gpu, count, prec);
  const eff = peak * effMfu;
  const seconds = flops / eff;
  const days = seconds / 86400;
  const gpuHours = (count * seconds) / 3600;
  const g = GPUS[gpu];
  const speedup = deadline > 0 ? days / deadline : 0;

  return (
    <div>
      <SectionTitle eyebrow="Steps 2-4" title="Training Time Estimation" />
      <p style={{ fontSize: 13, color: C.grayDk, marginTop: -8, marginBottom: 18, maxWidth: 820 }}>
        Training FLOPs = 6 × parameters × tokens (decoder-only scaling law). Time = total FLOPs ÷ (cluster peak × MFU).
        MFU is the single biggest lever — fabric, storage, and batch size all move it.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24 }}>
        <div style={card}>
          <Field label="Model size (billion params)"><NumIn value={paramsB} onChange={setParamsB} step={1} min={0} /></Field>
          <Field label="Training tokens (trillions)"><NumIn value={tokensT} onChange={setTokensT} step={0.1} min={0} /></Field>
          <Field label="GPU model">
            <Sel value={gpu} onChange={setGpu} options={Object.keys(GPUS).map((k) => ({ v: k, l: GPUS[k].name }))} />
          </Field>
          <Field label="GPU count"><NumIn value={count} onChange={setCount} step={8} min={1} /></Field>
          <Field label="Precision">
            <Sel value={prec} onChange={setPrec} options={[{ v: "bf16", l: "BF16 / FP16" }, { v: "fp8", l: "FP8" }]} />
          </Field>
          <Field label="Fabric" hint={FABRICS[fabric].note}>
            <Sel value={fabric} onChange={setFabric} options={Object.keys(FABRICS).map((k) => ({ v: k, l: FABRICS[k].name }))} />
          </Field>
          <Field label="Model FLOP Utilization (MFU)">
            <Sel value={String(mfu)} onChange={(v) => setMfu(Number(v))} options={MFU_BANDS.map((b) => ({ v: String(b.v), l: b.label }))} />
          </Field>
          <Field label="Target deadline (days)"><NumIn value={deadline} onChange={setDeadline} step={1} min={0} /></Field>
        </div>
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Stat label="Total training work" value={fmtBig(flops)} />
            <Stat label="Effective compute" value={fmt(eff / 1e15, 1) + " PFLOPS"} sub={`${(effMfu * 100).toFixed(0)}% eff. MFU (${FABRICS[fabric].name})`} />
            <Stat label="Estimated training time" value={days < 1 ? fmt(days * 24, 1) + " hrs" : fmt(days, 1) + " days"} accent={C.greenDark}
              sub={days > 90 ? "Exceeds a quarter — consider scaling" : "Within a quarter"} />
            <Stat label="Total GPU-hours" value={fmt(gpuHours)} sub="Drives cost & cloud comparison" />
          </div>
          {deadline > 0 && (
            <div style={{ ...card, borderLeft: `4px solid ${speedup > 1.05 ? C.amber : C.green}`, marginBottom: 12 }}>
              <b style={{ color: C.ink }}>Deadline check:</b>{" "}
              {speedup > 1.05
                ? <span>To hit <b>{deadline} days</b> you need ~<b>{fmt(speedup, 1)}×</b> more effective compute — scale to ~<b>{Math.ceil((count * speedup) / 8) * 8}</b> {g.name.split(" ").slice(-1)} GPUs, raise MFU, or reduce tokens/epochs.</span>
                : <span style={{ color: C.greenDark }}>On track — current cluster completes in {fmt(days, 1)} days, inside the {deadline}-day target.</span>}
            </div>
          )}
          <div style={{ ...card, fontSize: 12.5, color: C.grayDk }}>
            <b>Memory sanity:</b> full Adam training needs ~18 bytes/param ≈ <b>{fmt(trainingMemGB(paramsB))} GB</b> aggregate.
            With {g.hbm} GB/GPU and tensor/pipeline/FSDP sharding across {count} GPUs, that is
            {" "}<b>{trainingMemGB(paramsB) / count < g.hbm * 0.7 ? "feasible" : "tight — needs aggressive sharding + activation checkpointing"}</b>.
          </div>
        </div>
      </div>
    </div>
  );
}

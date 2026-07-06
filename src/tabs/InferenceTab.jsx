import React, { useState, useEffect } from "react";
import { C } from "../theme.js";
import { GPUS, MODELS } from "../data/reference.js";
import { card, Field, NumIn, Sel, Stat, SectionTitle } from "../components/ui.jsx";
import { fmt } from "../lib/format.js";
import { kvCacheGB, sizeInference } from "../lib/calc.js";

export default function InferenceTab({ shared, setShared }) {
  const [modelKey, setModelKey] = useState("llama3-70b");
  const [customP, setCustomP] = useState(70);
  const [gpu, setGpu] = useState("h200");
  const [prec, setPrec] = useState("fp8");
  const [users, setUsers] = useState(500);
  const [reqPerUserHr, setReqPerUserHr] = useState(20);
  const [inTok, setInTok] = useState(1000);
  const [outTok, setOutTok] = useState(500);
  const [ctx, setCtx] = useState(8192);
  const [peakFactor, setPeakFactor] = useState(3);

  const model = { ...MODELS[modelKey] };
  if (modelKey === "custom") model.params = customP;
  const g = GPUS[gpu];

  const reqPerSec = (users * reqPerUserHr) / 3600;
  const peakReqPerSec = reqPerSec * peakFactor;
  const peakOutTokPerSec = peakReqPerSec * outTok;

  const sized = sizeInference({ model, gpuKey: gpu, prec, peakOutTokPerSec, ctx });
  const nodes = Math.ceil(sized.gpusNeeded / 8);

  useEffect(() => {
    setShared((s) => ({ ...s, inferGpu: gpu, inferGpus: nodes * 8, inferModel: model.name, users, outTok, prec, aggregateTokPerSec: sized.perGpuTps * nodes * 8 }));
  }, [gpu, nodes, users, model.name, outTok, prec]); // eslint-disable-line

  return (
    <div>
      <SectionTitle eyebrow="Serving" title="Inference Sizing" />
      <p style={{ fontSize: 13, color: C.grayDk, marginTop: -8, marginBottom: 18, maxWidth: 820 }}>
        From concurrent users → requests/sec → output tokens/sec, sized against per-GPU decode throughput
        (continuous batching, vLLM / TensorRT-LLM) and KV-cache memory. The larger of the two constraints wins.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24 }}>
        <div style={card}>
          <Field label="Model">
            <Sel value={modelKey} onChange={setModelKey} options={Object.keys(MODELS).map((k) => ({ v: k, l: MODELS[k].name }))} />
          </Field>
          {modelKey === "custom" && <Field label="Params (B)"><NumIn value={customP} onChange={setCustomP} step={1} /></Field>}
          <Field label="GPU model">
            <Sel value={gpu} onChange={setGpu} options={Object.keys(GPUS).map((k) => ({ v: k, l: GPUS[k].name }))} />
          </Field>
          <Field label="Precision" hint="FP8 doubles throughput & halves weight memory">
            <Sel value={prec} onChange={setPrec} options={[{ v: "fp16", l: "FP16" }, { v: "fp8", l: "FP8" }, { v: "int4", l: "INT4 (weight-only)" }]} />
          </Field>
          <Field label="Concurrent users"><NumIn value={users} onChange={setUsers} step={50} min={1} /></Field>
          <Field label="Requests / user / hour"><NumIn value={reqPerUserHr} onChange={setReqPerUserHr} step={1} min={0} /></Field>
          <Field label="Input tokens / request"><NumIn value={inTok} onChange={setInTok} step={100} min={0} /></Field>
          <Field label="Output tokens / request"><NumIn value={outTok} onChange={setOutTok} step={50} min={0} /></Field>
          <Field label="Context window (tokens)"><NumIn value={ctx} onChange={setCtx} step={1024} min={0} /></Field>
          <Field label="Peak-to-average factor" hint="Headroom for burst load"><NumIn value={peakFactor} onChange={setPeakFactor} step={1} min={1} /></Field>
        </div>
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Stat label="Peak load" value={fmt(peakReqPerSec, 1) + " req/s"} sub={fmt(peakOutTokPerSec) + " output tok/s"} />
            <Stat label="Per-GPU throughput" value={fmt(sized.perGpuTps) + " tok/s"} sub={g.name + " @ " + prec.toUpperCase()} />
            <Stat label="GPUs required" value={sized.gpusNeeded} accent={C.greenDark} sub={sized.bound + " constraint"} />
            <Stat label="Nodes (8-GPU)" value={nodes} sub={fmt(nodes * 8) + " GPUs provisioned"} />
          </div>
          <div style={{ ...card, fontSize: 12.5, color: C.grayDk }}>
            <b>Constraint breakdown:</b> throughput needs <b>{sized.gpusForTput}</b> GPU(s); KV-cache + weights need <b>{sized.gpusForMem}</b> GPU(s)
            ({fmt(sized.memNeeded)} GB vs {g.hbm} GB usable/GPU). KV cache ≈ <b>{fmt(sized.kv, 2)} GB</b> per sequence at {fmt(ctx)}-token context
            {model.kvHeads < model.heads ? ` (GQA ${model.kvHeads}:${model.heads} already reduces this).` : "."}
          </div>
          <div style={{ ...card, background: C.grayXlt, fontSize: 12, color: C.grayDk, marginTop: 12 }}>
            <b>Carry forward:</b> <b>{nodes * 8}× {g.name}</b> ({nodes} node{nodes > 1 ? "s" : ""}) flows into the BOM & TCO tab.
          </div>
        </div>
      </div>
    </div>
  );
}

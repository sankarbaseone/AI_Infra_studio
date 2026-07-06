import React, { useState } from "react";
import { C } from "../theme.js";
import { card, Field, NumIn, Stat, SectionTitle } from "../components/ui.jsx";
import { fmtBig, fmt } from "../lib/format.js";

export default function TokenTab({ shared, setShared }) {
  const [tb, setTb] = useState(10);
  const [tokPerMB, setTokPerMB] = useState(250000);
  const [epochs, setEpochs] = useState(1);
  const totalMB = tb * 1e6;
  const rawTokens = totalMB * tokPerMB;
  const effTokens = rawTokens * epochs;

  React.useEffect(() => {
    setShared((s) => ({ ...s, effTokensT: effTokens / 1e12 }));
  }, [effTokens]); // eslint-disable-line

  return (
    <div>
      <SectionTitle eyebrow="Step 1" title="Token Estimation" />
      <p style={{ fontSize: 13, color: C.grayDk, marginTop: -8, marginBottom: 18, maxWidth: 760 }}>
        Training is measured in tokens, not gigabytes — GB compresses differently across text, code, and PDFs.
        Convert the raw corpus to a defensible token count before any sizing.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={card}>
          <Field label="Raw dataset size (TB)"><NumIn value={tb} onChange={setTb} step={1} min={0} /></Field>
          <Field label="Tokens per MB (tokenizer density)" hint="~250K tok/MB typical English text; code & multilingual differ">
            <NumIn value={tokPerMB} onChange={setTokPerMB} step={10000} min={0} />
          </Field>
          <Field label="Epochs / passes over data" hint="Chinchilla-optimal is ~20 tokens per parameter">
            <NumIn value={epochs} onChange={setEpochs} step={1} min={1} />
          </Field>
        </div>
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <Stat label="Raw tokens" value={fmtBig(rawTokens).replace("FLOPs", "")} sub={fmt(rawTokens / 1e12, 2) + " trillion tokens"} />
          <Stat label="Effective training tokens" value={fmt(effTokens / 1e12, 2) + "T"} sub={epochs + " epoch(s)"} accent={C.greenDark} />
          <div style={{ ...card, background: C.grayXlt, fontSize: 12, color: C.grayDk }}>
            <b>Carry forward:</b> use <b>{fmt(effTokens / 1e12, 2)}T tokens</b> in the Training tab.
          </div>
        </div>
      </div>
    </div>
  );
}

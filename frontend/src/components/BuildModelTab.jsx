// src/components/BuildModelTab.jsx
import React, { useEffect,  useRef, useState } from "react";

/**
 * Drag & drop model builder.
 * Stores layers under config.model.layers as an ordered array.
 * Each layer: { id, type, params: { ... } }
 */
const LAYER_TEMPLATES = [
  { type: "Input", params: { features: 64, seq_len: 120 } },
  { type: "LSTM", params: { units: 64, return_sequences: true, dropout: 0.0 } },
  { type: "BidirectionalLSTM", params: { units: 64, return_sequences: true, dropout: 0.0 } },
  { type: "Dense", params: { units: 64, activation: "relu" } },
  { type: "Dropout", params: { rate: 0.1 } },
  { type: "GlobalAveragePooling1D", params: {} },
  { type: "MultiHeadAttention", params: { heads: 4, key_dim: 64 } },
  { type: "LayerNormalization", params: {} },
];

const uid = (() => { let i = 1; return () => `blk-${i++}`; })();

export default function BuildModelTab({ config, onChange, modelType }) {
  const [selected, setSelected] = useState(() => {
    const layers = (config?.model?.layers) || [];
    return layers.map(layer => ({ ...layer, id: layer.id ?? uid() }));
  });
  const [expanded, setExpanded] = useState({});
  const dragIndex = useRef(null);

  // sync back into config
  useEffect(() => {
    onChange({
      ...config,
      model: {
        ...(config.model || {}),
        layers: selected.map(({ id, ...rest }) => rest)
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const addLayer = (tpl) => {
    const copy = JSON.parse(JSON.stringify(tpl));
    setSelected(prev => [...prev, { id: uid(), ...copy }]);
  };
  const removeLayer = (id) => setSelected(prev => prev.filter(x => x.id !== id));
  const moveLayer = (from, to) => {
    setSelected(prev => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  const handleDragStart = (idx) => (e) => {
    dragIndex.current = idx;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (idx) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (idx) => (e) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === idx) return;
    moveLayer(from, idx);
    dragIndex.current = null;
  };

  const updateParam = (id, key, value) => {
    setSelected(prev => prev.map(l => l.id === id ? { ...l, params: { ...(l.params || {}), [key]: value } } : l));
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
      <aside style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <h4 style={{ marginTop: 0 }}>Layer palette</h4>
        {LAYER_TEMPLATES.map(tpl => (
          <button key={tpl.type} onClick={() => addLayer(tpl)} style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6 }}>
            + {tpl.type}
          </button>
        ))}
        <p style={{ fontSize: 12, opacity: 0.8, marginTop: 12 }}>Click to add. Drag to reorder. Expand to edit params.</p>
      </aside>

      <section style={{ border: "1px solid #ddd", borderRadius: 8 }}>
        <div style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h4 style={{ margin: 0 }}>Architecture</h4>
          <small style={{ opacity: 0.8 }}>{modelType || "Model"}</small>
        </div>

        <ol style={{ listStyle: "none", margin: 0, padding: 12 }}>
          {selected.map((layer, idx) => (
            <li key={layer.id}
                draggable
                onDragStart={handleDragStart(idx)}
                onDragOver={handleDragOver(idx)}
                onDrop={handleDrop(idx)}
                style={{ padding: 10, marginBottom: 10, border: "1px solid #eee", borderRadius: 8, background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <strong>{idx + 1}. {layer.type}</strong>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setExpanded(p => ({ ...p, [layer.id]: !p[layer.id] }))}>{expanded[layer.id] ? "Hide" : "Edit"}</button>
                  <button onClick={() => removeLayer(layer.id)} aria-label="Remove">Remove</button>
                </div>
              </div>
              {expanded[layer.id] && (
                <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                  {Object.entries(layer.params || {}).map(([k, v]) => (
                    <label key={k} style={{ display: "grid", gap: 4 }}>
                      <span style={{ fontSize: 12, opacity: 0.8 }}>{k}</span>
                      <input
                        type={typeof v === "number" ? "number" : "text"}
                        value={v}
                        onChange={e => updateParam(layer.id, k, typeof v === "number" ? Number(e.target.value) : e.target.value)}
                      />
                    </label>
                  ))}
                  {/* Allow arbitrary param add */}
                  <details style={{ gridColumn: "1 / -1" }}>
                    <summary>Add / update custom param</summary>
                    <ParamEditor onSet={(key, val) => updateParam(layer.id, key, val)} />
                  </details>
                </div>
              )}
            </li>
          ))}
        </ol>
        {selected.length === 0 && <div style={{ padding: 12, opacity: 0.7 }}>No layers yet — add from the palette on the left.</div>}
      </section>
    </div>
  );
}

function ParamEditor({ onSet }) {
  const [key, setKey] = useState("");
  const [val, setVal] = useState("");
  const [isNum, setIsNum] = useState(true);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
      <label>Key
        <input value={key} onChange={e => setKey(e.target.value)} placeholder="units" />
      </label>
      <label>Value
        <input value={val} onChange={e => setVal(e.target.value)} placeholder="64" />
      </label>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="checkbox" checked={isNum} onChange={e => setIsNum(e.target.checked)} />
        treat as number
      </label>
      <button onClick={() => { if (!key) return; onSet(key, isNum ? Number(val) : val); }}>Set</button>
    </div>
  );
}

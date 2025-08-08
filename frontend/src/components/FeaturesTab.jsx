// frontend/src/components/FeaturesTab.jsx
import React, { useMemo, useState } from "react";

/**
 * Props
 * - config:            current timeframe+model config object (must contain `.features`)
 * - onChange(nextConfig)
 * - allConfigs:        full tree { tf: { model: {features, ...} } }
 * - currentTf:         string (e.g. "m15")
 * - currentModel:      string (e.g. "LSTM")
 * - setAllConfigs:     setter to replace whole configs object
 */

const FEATURE_GROUPS = {
  "Price/Volatility": ["open", "high", "low", "close", "volume", "atr", "atr_pct", "signallevel"],
  "EMA": ["ema_short", "ema_long", "ema_spread", "ema_slope_short", "ema_slope_long", "ema_cross"],
  "RSI": ["rsi", "rsi_slope", "rsi_above_70", "rsi_below_30", "div_rsi_flag", "div_rsi_strength"],
  "MACD": ["macd", "macd_signal", "macd_cross_above", "div_macd_flag", "div_macd_strength"],
  "STOCH": ["stoch_k", "stoch_d", "stoch_diff", "div_stoch_flag", "div_stoch_strength"],
  "Bolinger Bands": ["bbu", "bbm", "bbl", "bb_width", "bbm_slope"],
  "Support/Resistance Levels": ["nearest_sup", "nearest_res", "at_sup", "at_res"],
  "Market Sessions": [
    "is_syd", "is_tok", "is_eur", "is_usa",
    "overlap_syd_tok", "overlap_tok_eur", "overlap_eur_usa", "overlap_syd_eur", "active_sessions"
  ],
  "Time Encodings": [
    "m5_sin", "m5_cos", "m15_sin", "m15_cos",
    "h1_sin", "h1_cos", "d1_sin", "d1_cos",
    "dow_sin", "dow_cos", "doy_sin", "doy_cos"
  ]
};

const SCALERS = ["", "MinMaxScaler", "StandardScaler", "RobustScaler"];
const PRESCALERS = ["", "pct_change", "log1p", "clip"];

function formatDisplay(raw) {
  if (raw == null) return "";
  if (typeof raw === "object") return JSON.stringify(raw, null, 2);
  return String(raw);
}

function parseJSON(raw) {
  try { return JSON.parse(raw); } catch { throw new Error("Invalid JSON"); }
}

export default function FeaturesTab({ config, onChange, allConfigs, currentTf, currentModel, setAllConfigs }) {
  const feats = config.features || [];
  const [jsonErrors, setJsonErrors] = useState({});

  const updateFeat = (idx, field, value) => {
    const newFeats = feats.map((f, i) => i === idx ? { ...f, [field]: value } : f);
    onChange({ ...config, features: newFeats });
  };

  const handleJSONBlur = (idx, field, rawValue) => {
    const key = `${idx}-${field}`;
    if (rawValue.trim() === "") {
      updateFeat(idx, field, null);
      setJsonErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
      return;
    }
    try {
      const parsed = parseJSON(rawValue);
      updateFeat(idx, field, parsed);
      setJsonErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    } catch (err) {
      setJsonErrors(prev => ({ ...prev, [key]: err.message }));
    }
  };

  // Grouping
  const grouped = useMemo(() => {
    const g = {}; Object.keys(FEATURE_GROUPS).forEach(k => g[k] = []); g.Other = [];
    feats.forEach((f, idx) => {
      const grp = Object.entries(FEATURE_GROUPS).find(([, arr]) => arr.includes(f.feature_name))?.[0] || "Other";
      g[grp].push({ ...f, _idx: idx });
    });
    return g;
  }, [feats]);

  const COLUMNS = [
    { key: "enabled", label: "Enabled", type: "checkbox" },
    { key: "feature_name", label: "Feature", type: "label-with-tooltip" },
    { key: "callback", label: "Callback", type: "text" },
    { key: "callback_params", label: "Callback Params", type: "json" },
    { key: "prescaler", label: "Prescaler", type: "select-prescaler" },
    { key: "prescaler_params", label: "Prescaler Params", type: "json" },
    { key: "scaler", label: "Scaler", type: "select-scaler" },
    { key: "scaler_params", label: "Scaler Params", type: "json" }
  ];

  // ─────────────────────────────────────────────────────────────
  // PUSH copy: from current Tf/Model → selected destination timeframe (same model)
  // ─────────────────────────────────────────────────────────────
  const tfOptions = useMemo(() => allConfigs ? Object.keys(allConfigs) : [], [allConfigs]);
  const [copyDstTf, setCopyDstTf] = useState(() => {
    if (!tfOptions.length || !currentTf) return "";
    return tfOptions.find(k => k !== currentTf) || tfOptions[0];
  });
  const canCopy = Boolean(allConfigs && currentTf && currentModel && setAllConfigs && copyDstTf);

  const handlePushToDst = () => {
    if (!canCopy) return;
    const src = allConfigs?.[currentTf]?.[currentModel];
    const srcFeatures = src?.features || [];
    const cloned = JSON.parse(JSON.stringify(srcFeatures));

    const nextAll = { ...allConfigs };
    nextAll[copyDstTf] = nextAll[copyDstTf] || {};
    const dstBase = nextAll[copyDstTf][currentModel] || src || {};
    nextAll[copyDstTf][currentModel] = { ...dstBase, features: cloned };

    setAllConfigs(nextAll);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Push bar */}
      {allConfigs && currentTf && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
          border: "1px solid #ddd",
          borderRadius: 8,
          background: "#fafafa"
        }}>
          <strong>Push features:</strong>
          <span>From <code>{currentTf}</code> / <code>{currentModel || "model"}</code></span>
          <span>→</span>
          <label>
            To timeframe:&nbsp;
            <select value={copyDstTf || ""} onChange={e => setCopyDstTf(e.target.value)}>
              <option value="" disabled>Select timeframe</option>
              {tfOptions.map(tf => (
                <option key={tf} value={tf} disabled={tf === currentTf}>{tf}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handlePushToDst}
            disabled={!canCopy}
            title={canCopy ? `Push features from ${currentTf}/${currentModel} to ${copyDstTf}` : "Provide allConfigs/currentTf/currentModel/setAllConfigs to enable push"}
            style={{ padding: "0.4rem 0.75rem", cursor: canCopy ? "pointer" : "not-allowed" }}
          >
            Push
          </button>
        </div>
      )}

      {/* Per‑group tables */}
      {Object.entries(grouped).map(([group, items]) => (
        items.length > 0 && (
          <fieldset key={group} style={{ border: "1px solid #ddd", borderRadius: 8 }}>
            <legend style={{ padding: "0 0.5rem", fontWeight: 600 }}>{group}</legend>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {COLUMNS.map(col => (
                      <th key={col.key} style={{ textAlign: "left", borderBottom: "2px solid #999", padding: "0.5rem", whiteSpace: "nowrap" }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(f => (
                    <tr key={f._idx}>
                      {COLUMNS.map(col => {
                        const raw = f[col.key];
                        const idx = f._idx;
                        const key = `${idx}-${col.key}`;
                        const style = { padding: "0.5rem", borderBottom: "1px solid #eee", verticalAlign: "top" };
                        switch (col.type) {
                          case "checkbox":
                            return (
                              <td style={style} key={col.key}>
                                <input type="checkbox" checked={!!raw} onChange={e => updateFeat(idx, col.key, e.target.checked)} />
                              </td>
                            );
                          case "select-prescaler":
                            return (
                              <td style={style} key={col.key}>
                                <select value={raw || ""} onChange={e => updateFeat(idx, col.key, e.target.value)}>
                                  {PRESCALERS.map(opt => (<option key={opt} value={opt}>{opt === "" ? "None" : opt}</option>))}
                                </select>
                              </td>
                            );
                          case "select-scaler":
                            return (
                              <td style={style} key={col.key}>
                                <select value={raw || ""} onChange={e => updateFeat(idx, col.key, e.target.value)}>
                                  {SCALERS.map(opt => (<option key={opt} value={opt}>{opt === "" ? "None" : opt}</option>))}
                                </select>
                              </td>
                            );
                          case "label-with-tooltip":
                            return (
                              <td style={style} key={col.key}>
                                <span title={formatDisplay(f.help) || ""} style={{ cursor: f.help ? "help" : "default", fontWeight: 600 }}>
                                  {formatDisplay(raw)}
                                </span>
                              </td>
                            );
                          case "json":
                            return (
                              <td style={style} key={col.key}>
                                <input
                                  type="text"
                                  value={formatDisplay(raw)}
                                  onChange={e => updateFeat(idx, col.key, e.target.value)}
                                  onBlur={e => handleJSONBlur(idx, col.key, e.target.value)}
                                  style={{ width: "100%", borderColor: jsonErrors[key] ? "red" : undefined }}
                                />
                                {jsonErrors[key] && (
                                  <div style={{ color: "red", fontSize: "0.8em", marginTop: "0.25em" }}>
                                    {jsonErrors[key]}
                                  </div>
                                )}
                              </td>
                            );
                          case "text":
                          default:
                            return (
                              <td style={style} key={col.key}>
                                <input type="text" value={formatDisplay(raw)} onChange={e => updateFeat(idx, col.key, e.target.value)} style={{ width: "100%" }} />
                              </td>
                            );
                        }
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </fieldset>
        )
      ))}
    </div>
  );
}

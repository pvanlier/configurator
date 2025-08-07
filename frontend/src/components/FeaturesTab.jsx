// frontend/src/components/FeaturesTab.jsx
import React, { useState } from "react";

const FEATURE_GROUPS = {
  "Bolinger Bands": ["bbu", "bbm", "bbl", "bb_width", "bbm_slope"],
  "Support/Resistance Levels": ["nearest_sup", "nearest_res", "at_sup", "at_res"],
  "EMA": ["ema_short", "ema_long", "ema_spread", "ema_slope_short", "ema_slope_long", "ema_cross"],
  "RSI": ["rsi", "rsi_slope", "rsi_above_70", "rsi_below_30", "div_rsi_flag", "div_rsi_strength"],
  "MACD": ["macd", "macd_signal", "macd_cross_above", "div_macd_flag", "div_macd_strength"],
  "STOCH": ["stoch_k", "stoch_d", "stoch_diff", "div_stoch_flag", "div_stoch_strength"],
  "Market Sessions": [
    "is_syd", "is_tok", "is_eur", "is_usa",
    "overlap_syd_tok", "overlap_tok_eur", "overlap_eur_usa", "overlap_syd_eur", "active_sessions"
  ],
  "Time Encodings": [
    "m5_sin", "m5_cos", "m15_sin", "m15_cos",
    "h1_sin", "h1_cos", "d1_sin", "d1_cos",
    "dow_sin", "dow_cos", "doy_sin", "doy_cos"
  ],
  "Price/Volatility": ["open", "high", "low", "close", "volume", "atr", "atr_pct", "signallevel"]
};

const SCALERS = ["", "MinMaxScaler", "StandardScaler", "RobustScaler"];
const PRESCALERS = ["", "pct_change", "log1p", "clip"];

// Format for display: objects as pretty JSON
function formatDisplay(raw) {
  if (raw == null) return "";
  if (typeof raw === "object") {
    return JSON.stringify(raw, null, 2);
  }
  return String(raw);
}

// Parse JSON for JSON fields
function parseJSON(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }
}

export default function FeaturesTab({ config, onChange }) {
  const feats = config.features || [];
  const [jsonErrors, setJsonErrors] = useState({});

  const updateFeat = (idx, field, value) => {
    const newFeats = feats.map((f, i) =>
      i === idx ? { ...f, [field]: value } : f
    );
    onChange({ ...config, features: newFeats });
  };

  const handleJSONBlur = (idx, field, rawValue) => {
    const key = `${idx}-${field}`;
    if (rawValue.trim() === "") {
      // Clear value
      updateFeat(idx, field, null);
      setJsonErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    try {
      const parsed = parseJSON(rawValue);
      updateFeat(idx, field, parsed);
      setJsonErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (err) {
      setJsonErrors(prev => ({ ...prev, [key]: err.message }));
    }
  };

  // Grouping
  const grouped = {};
  Object.keys(FEATURE_GROUPS).forEach(g => (grouped[g] = []));
  grouped.Other = [];
  feats.forEach((f, idx) => {
    const grp =
      Object.entries(FEATURE_GROUPS).find(([, arr]) =>
        arr.includes(f.feature_name)
      )?.[0] || "Other";
    grouped[grp].push({ ...f, _idx: idx });
  });

  const COLUMNS = [
    { key: "enabled", label: "Enabled", type: "checkbox" },
    { key: "feature_name", label: "Feature", type: "label" },
    { key: "callback", label: "Callback", type: "text" },
    { key: "callback_params", label: "Callback Params", type: "json" },
    { key: "prescaler", label: "Prescaler", type: "select-prescaler" },
    { key: "prescaler_params", label: "Prescaler Params", type: "json" },
    { key: "scaler", label: "Scaler", type: "select-scaler" },
    { key: "scaler_params", label: "Scaler Params", type: "json" }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {Object.entries(grouped).map(
        ([group, items]) =>
          items.length > 0 && (
            <div key={group}>
              <h3 style={{ marginBottom: "0.5rem" }}>{group}</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {COLUMNS.map(col => (
                      <th
                        key={col.key}
                        style={{
                          textAlign: "left",
                          borderBottom: "2px solid #999",
                          padding: "0.5rem"
                        }}
                      >
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
                        const style = {
                          padding: "0.5rem",
                          borderBottom: "1px solid #ddd"
                        };
                        switch (col.type) {
                          case "checkbox":
                            return (
                              <td style={style} key={col.key}>
                                <input
                                  type="checkbox"
                                  checked={!!raw}
                                  onChange={e =>
                                    updateFeat(
                                      idx,
                                      col.key,
                                      e.target.checked
                                    )
                                  }
                                />
                              </td>
                            );
                          case "select-prescaler":
                            return (
                              <td style={style} key={col.key}>
                                <select
                                  value={raw || ""}
                                  onChange={e =>
                                    updateFeat(
                                      idx,
                                      col.key,
                                      e.target.value
                                    )
                                  }
                                >
                                  {PRESCALERS.map(opt => (
                                    <option key={opt} value={opt}>
                                      {opt === "" ? "None" : opt}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          case "select-scaler":
                            return (
                              <td style={style} key={col.key}>
                                <select
                                  value={raw || ""}
                                  onChange={e =>
                                    updateFeat(
                                      idx,
                                      col.key,
                                      e.target.value
                                    )
                                  }
                                >
                                  {SCALERS.map(opt => (
                                    <option key={opt} value={opt}>
                                      {opt === "" ? "None" : opt}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          case "label":
                            return (
                              <td style={style} key={col.key}>
                                {formatDisplay(raw)}
                              </td>
                            );
                          case "json":
                            return (
                              <td style={style} key={col.key}>
                                <input
                                  type="text"
                                  value={formatDisplay(raw)}
                                  onChange={e =>
                                    updateFeat(
                                      idx,
                                      col.key,
                                      e.target.value
                                    )
                                  }
                                  onBlur={e =>
                                    handleJSONBlur(
                                      idx,
                                      col.key,
                                      e.target.value
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    borderColor: jsonErrors[key]
                                      ? "red"
                                      : undefined
                                  }}
                                />
                                {jsonErrors[key] && (
                                  <div
                                    style={{
                                      color: "red",
                                      fontSize: "0.8em",
                                      marginTop: "0.25em"
                                    }}
                                  >
                                    {jsonErrors[key]}
                                  </div>
                                )}
                              </td>
                            );
                          case "text":
                          default:
                            return (
                              <td style={style} key={col.key}>
                                <input
                                  type="text"
                                  value={formatDisplay(raw)}
                                  onChange={e =>
                                    updateFeat(
                                      idx,
                                      col.key,
                                      e.target.value
                                    )
                                  }
                                  style={{ width: "100%" }}
                                />
                              </td>
                            );
                        }
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}
    </div>
  );
}

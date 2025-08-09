// src/components/FeaturesTab.jsx
import React, { useMemo, useState } from "react";

export default function FeaturesTab({ config, onChange, allConfigs, currentTf, currentModel, setAllConfigs }) {
  const overlay = config?.features || [];
  const catalog = allConfigs?.features_definitions || [];
  const tree = allConfigs?.timeframes || {};

  const ovByName = useMemo(() => {
    const m = new Map();
    overlay.forEach(o => m.set(o.name, o));
    return m;
  }, [overlay]);

  const grouped = useMemo(() => {
    const groups = {};
    catalog.forEach(item => {
      const grp = item.group || "Other";
      if (!groups[grp]) groups[grp] = [];
      const ov = ovByName.get(item.name) || { name: item.name, enabled: item.default_enabled ?? false };
      groups[grp].push({ catalog: item, overlay: ov });
    });
    const order = Object.keys(groups).sort((a,b) => (a === "Other") - (b === "Other") || a.localeCompare(b));
    return order.map(k => ({ group: k, rows: groups[k] }));
  }, [catalog, ovByName]);

  const [jsonErrors, setJsonErrors] = useState({});

  const upsertOverlay = (name, patch) => {
    const idx = overlay.findIndex(f => f.name === name);
    let nextOverlay;
    if (idx >= 0) {
      nextOverlay = overlay.map(f => f.name === name ? { ...f, ...patch } : f);
    } else {
      const defaultEnabled = (catalog.find(c => c.name === name)?.default_enabled) ?? false;
      nextOverlay = [...overlay, { name, enabled: defaultEnabled, ...patch }];
    }
    onChange({ ...config, features: nextOverlay });
  };

  const tfOptions = useMemo(() => Object.keys(tree).filter(k => k !== currentTf), [tree, currentTf]);
  const [copyDstTf, setCopyDstTf] = useState(tfOptions[0] || "");
  const canCopy = Boolean(currentTf && currentModel && setAllConfigs && copyDstTf);

  const handlePushToDst = () => {
    if (!canCopy) return;
    const src = tree?.[currentTf]?.[currentModel];
    const srcFeatures = src?.features || [];
    const cloned = JSON.parse(JSON.stringify(srcFeatures));

    const nextAll = { ...allConfigs, timeframes: { ...(allConfigs.timeframes || {}) } };
    nextAll.timeframes[copyDstTf] = nextAll.timeframes[copyDstTf] || {};
    const dstBase = nextAll.timeframes[copyDstTf][currentModel] || src || {};
    nextAll.timeframes[copyDstTf][currentModel] = { ...dstBase, features: cloned };

    setAllConfigs(nextAll);
  };

  const renderFieldCell = (name, overlayValue, catalogDefault, field, expectJson) => {
    const raw = overlayValue ?? catalogDefault ?? (expectJson ? {} : "");
    const key = `${name}-${field}`;
    const strValue = typeof raw === "object" ? JSON.stringify(raw, null, 2) : String(raw ?? "");

    const handleBlur = (value) => {
      const trimmed = value.trim();
      if (trimmed === "") {
        upsertOverlay(name, { [field]: undefined });
        setJsonErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
        return;
      }

      if (!expectJson) {
        // For plain string fields (e.g., prescaler/scaler), store as-is
        upsertOverlay(name, { [field]: value });
        setJsonErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
        return;
      }

      // JSON expected
      try {
        const parsed = JSON.parse(value);
        upsertOverlay(name, { [field]: parsed });
        setJsonErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
      } catch {
        setJsonErrors(prev => ({ ...prev, [key]: "Invalid JSON" }));
      }
    };

    return (
      <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
        <input
          type="text"
          value={strValue}
          onChange={e => upsertOverlay(name, { [field]: e.target.value })}
          onBlur={e => handleBlur(e.target.value)}
          style={{ width: "100%", borderColor: jsonErrors[key] ? "red" : undefined }}
        />
        {jsonErrors[key] && (
          <div style={{ color: "red", fontSize: "0.8em", marginTop: "0.25em" }}>{jsonErrors[key]}</div>
        )}
      </td>
    );
  };

  const renderSelectCell = (name, overlayValue, catalogDefault, field, options) => {
    const current = overlayValue !== undefined ? overlayValue : catalogDefault;
    const value = current == null ? "" : String(current);
    return (
      <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
        <select
          value={value}
          onChange={e => {
            const v = e.target.value === "" ? null : e.target.value;
            upsertOverlay(name, { [field]: v });
          }}
          style={{ width: "100%" }}
        >
          {options.map(opt => (
            <option key={(opt.value ?? "").toString()} value={opt.value ?? ""}>{opt.label}</option>
          ))}
        </select>
      </td>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {Boolean(tfOptions.length) && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", border: "1px solid #ddd", borderRadius: 8, background: "#fafafa" }}>
          <strong>Push features:</strong>
          <span>From <code>{currentTf}</code> / <code>{currentModel || "model"}</code></span>
          <span>→</span>
          <label>
            To timeframe:&nbsp;
            <select value={copyDstTf || ""} onChange={e => setCopyDstTf(e.target.value)}>
              <option value="" disabled>Select timeframe</option>
              {tfOptions.map(tf => (<option key={tf} value={tf}>{tf}</option>))}
            </select>
          </label>
          <button type="button" onClick={handlePushToDst} disabled={!canCopy} style={{ padding: "0.4rem 0.75rem" }}>
            Push
          </button>
        </div>
      )}

      {grouped.map(({ group, rows }) => (
        <fieldset key={group} style={{ border: "1px solid #ddd", borderRadius: 8 }}>
          <legend style={{ padding: "0 0.5rem", fontWeight: 600 }}>{group}</legend>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "2px solid #999", padding: "0.5rem" }}>Enabled</th>
                  <th style={{ textAlign: "left", borderBottom: "2px solid #999", padding: "0.5rem" }}>Feature</th>
                  <th style={{ textAlign: "left", borderBottom: "2px solid #999", padding: "0.5rem" }}>Callback</th>
                  <th style={{ textAlign: "left", borderBottom: "2px solid #999", padding: "0.5rem" }}>Params (JSON)</th>
                  <th style={{ textAlign: "left", borderBottom: "2px solid #999", padding: "0.5rem" }}>Prescaler</th>
                  <th style={{ textAlign: "left", borderBottom: "2px solid #999", padding: "0.5rem" }}>Prescaler Params (JSON)</th>
                  <th style={{ textAlign: "left", borderBottom: "2px solid #999", padding: "0.5rem" }}>Scaler</th>
                  <th style={{ textAlign: "left", borderBottom: "2px solid #999", padding: "0.5rem" }}>Scaler Params (JSON)</th>
                  <th style={{ textAlign: "left", borderBottom: "2px solid #999", padding: "0.5rem" }}>Help</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ catalog: it, overlay: ov }) => (
                  <tr key={it.name}>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                      <input type="checkbox" checked={!!ov.enabled} onChange={e => upsertOverlay(it.name, { enabled: e.target.checked })} />
                    </td>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee", fontWeight: 600 }} title={it.kind}>{it.name}</td>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}><code>{it.callback || "-"}</code></td>
                    {renderFieldCell(it.name, ov.params, it.callback_params, "params", true)}

                    {/* Prescaler (select) */}
                    {renderSelectCell(it.name, ov.prescaler, it.prescaler, "prescaler", [
                      { value: "", label: "None" },
                      { value: "pct_change", label: "pct_change" },
                      { value: "log1p", label: "log1p" },
                      { value: "clip", label: "clip" },
                    ])}

                    {/* Prescaler Params (object) */}
                    {renderFieldCell(it.name, ov.prescaler_params, it.prescaler_params, "prescaler_params", true)}

                    {/* Scaler (select) */}
                    {renderSelectCell(it.name, ov.scaler, it.scaler, "scaler", [
                      { value: "", label: "None" },
                      { value: "MinMaxScaler", label: "MinMaxScaler" },
                      { value: "RobustScaler", label: "RobustScaler" },
                      { value: "StandardScaler", label: "StandardScaler" },
                    ])}

                    {/* Scaler Params (object) */}
                    {renderFieldCell(it.name, ov.scaler_params, it.scaler_params, "scaler_params", true)}
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}><span title={it.help || ""} style={{ cursor: it.help ? "help" : "default" }}>{it.help || ""}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "0.75rem 1rem", fontSize: "0.92rem", color: "#444" }}>
            <details>
              <summary>Advanced: per‑column scaling overrides for generators</summary>
              <p>
                Use <code>emits_overrides</code> JSON with keys of emitted column names, e.g.{" "}
                <code>{`{ "rsi": { "scaler": "RobustScaler" } }`}</code>.
              </p>
            </details>
          </div>
        </fieldset>
      ))}
    </div>
  );
}

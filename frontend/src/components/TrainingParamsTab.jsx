// src/components/TrainingParamsTab.jsx
import React, { useMemo } from "react";

/**
 * Dynamically renders training parameters by merging:
 * - global training_defaults
 * - per-model defaults under model_defaults[modelType]
 * - per-timeframe overrides under timeframes[timeframe][modelType]
 *
 * Edits are written into the per-timeframe overrides path.
 */
const EMPTY = Object.freeze({});

export default function TrainingParamsTab({ config, onChange, modelType, timeframe }) {
  if (!config || !modelType) return null;

  // Resolve timeframe: use prop if provided; otherwise try typical locations; otherwise first available; otherwise "default"
  const resolvedTf = useMemo(() => {
    if (timeframe) return timeframe;
    if (config.active_timeframe) return config.active_timeframe;
    if (config.ui && config.ui.timeframe) return config.ui.timeframe;
    const tfs = Object.keys(config.timeframes || EMPTY);
    return tfs.length ? tfs[0] : "default";
  }, [config, timeframe]);

  const trainingDefaults = config.training_defaults || EMPTY;
  const modelDefaults = (config.model_defaults && (config.model_defaults[modelType] || EMPTY)) || EMPTY;

  const tfModelOverrides =
    (config.timeframes &&
      config.timeframes[resolvedTf] &&
      config.timeframes[resolvedTf][modelType] &&
      config.timeframes[resolvedTf][modelType].model) ||
    {};

  // Shallow merge is expected as params are flat key/value pairs
  const merged = useMemo(
    () => ({ ...trainingDefaults, ...modelDefaults, ...tfModelOverrides }),
    [trainingDefaults, modelDefaults, tfModelOverrides]
  );

  const allKeys = useMemo(() => {
    // Keep a stable deterministic order: training_default keys first, then model defaults, then timeframe overrides extras
    const ordered = [
      ...Object.keys(trainingDefaults),
      ...Object.keys(modelDefaults).filter(k => !(k in trainingDefaults)),
      ...Object.keys(tfModelOverrides).filter(k => !(k in trainingDefaults) && !(k in modelDefaults)),
    ];
    // De-dupe while preserving order
    return Array.from(new Set(ordered));
  }, [trainingDefaults, modelDefaults, tfModelOverrides]);

  // Heuristics for input types/steps
  const getInputProps = (key, value) => {
    const typeOfVal = typeof value;
    if (typeOfVal === "boolean") return { kind: "boolean" };
    if (typeOfVal === "number") {
      // Step heuristics by key
      if (key.toLowerCase().includes("lr") || key.toLowerCase().includes("learning_rate")) {
        return { kind: "number", step: 0.0001 };
      }
      if (key.toLowerCase().includes("dropout")) {
        return { kind: "number", step: 0.01, min: 0, max: 1 };
      }
      if (key.toLowerCase().includes("tau")) {
        return { kind: "number", step: 0.01, min: 0, max: 1 };
      }
      if (key.toLowerCase().includes("threshold")) {
        return { kind: "number", step: 0.001 };
      }
      return { kind: "number", step: 1 };
    }
    // Fallbacks
    if (typeOfVal === "string") return { kind: "text" };
    // If undefined (key only in defaults but value was undefined), choose number as common case
    return { kind: "number", step: 1 };
  };

  const humanize = (key) =>
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const update = (key, newVal) => {
    // Write back into timeframe overrides for the current modelType
    const next = { ...config };
    if (!next.timeframes) next.timeframes = EMPTY;
    if (!next.timeframes[resolvedTf]) next.timeframes[resolvedTf] = EMPTY;
    if (!next.timeframes[resolvedTf][modelType]) next.timeframes[resolvedTf][modelType] = EMPTY;
    // Preserve other override keys; set the updated one
    next.timeframes[resolvedTf][modelType] = {
      ...next.timeframes[resolvedTf][modelType],
      [key]: newVal,
    };
    onChange(next);
  };

  if (!allKeys.length) return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <h3 style={{ margin: 0 }}>Training Parameters</h3>
      <p style={{ marginTop: 8, color: "#666" }}>
        No defaults found for model "{modelType}". Ensure training_default and model_defaults are defined in config.
      </p>
    </div>
  );

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Training Parameters</h3>
        <span style={{ color: "#666", fontSize: 12 }}>
          Model: {modelType} • Timeframe: {resolvedTf}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {allKeys.map((key) => {
          const val = merged[key];
          const input = getInputProps(key, val);
          const label = humanize(key);

          if (input.kind === "boolean") {
            return (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={!!val}
                  onChange={(e) => update(key, e.target.checked)}
                />
                {label}
              </label>
            );
          }

          if (input.kind === "number") {
            return (
              <label key={key}>
                {label}
                <input
                  type="number"
                  step={input.step}
                  min={input.min}
                  max={input.max}
                  value={val ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    update(key, v === "" ? null : Number(v));
                  }}
                />
              </label>
            );
          }

          // text fallback
          return (
            <label key={key}>
              {label}
              <input
                type="text"
                value={val ?? ""}
                onChange={(e) => update(key, e.target.value)}
              />
            </label>
          );
        })}
      </div>

      <div style={{ color: "#666", fontSize: 12 }}>
        Values shown are training_default overlaid with model_defaults and the selected timeframe overrides.
        Edits are saved to: timeframes[{resolvedTf}][{modelType}]
      </div>
    </div>
  );
}

export function validateConfig(config) {
  const issues = [];

  const reqTop = ["version", "updated", "features_definitions", "timeframes"];
  for (const k of reqTop) {
    if (!(k in config)) issues.push(`Missing top-level key: ${k}`);
  }

  // training_default and model_defaults are required by the dynamic Training UI
  if (!config.training_default) {
    issues.push("Missing training_default: define global training hyperparameters.");
  }
  if (!config.model_defaults) {
    issues.push("Missing model_defaults: define per-model default hyperparameters.");
  }

  // features_definitions must be a non-empty array with unique names
  const defs = Array.isArray(config.features_definitions) ? config.features_definitions : [];
  if (!defs.length) issues.push("features_definitions is empty or not an array.");
  const defNames = new Set(defs.map(d => d && d.name).filter(Boolean));
  if (defNames.size !== defs.length) {
    issues.push("features_definitions contains duplicate or missing names.");
  }

  // Validate timeframes → models → features
  const tfs = config.timeframes && typeof config.timeframes === "object" ? Object.keys(config.timeframes) : [];
  if (!tfs.length) issues.push("timeframes is empty or not an object.");

  for (const tf of tfs) {
    const models = Object.keys(config.timeframes[tf] || EMPTY);
    if (!models.length) issues.push(`timeframes.${tf} has no models defined.`);
    for (const model of models) {
      const block = config.timeframes[tf][model] || EMPTY;
      const feats = Array.isArray(block.features) ? block.features : [];
      // Feature list can be empty, but if present validate names and enabled
      feats.forEach((f, idx) => {
        if (!f || typeof f.name !== "string" || !defNames.has(f.name)) {
          issues.push(`timeframes.${tf}.${model}.features[${idx}]: unknown or missing feature name "${f && f.name}".`);
        }
        if (typeof f.enabled !== "boolean") {
          issues.push(`timeframes.${tf}.${model}.features[${idx}]: "enabled" must be boolean.`);
        }
      });
      // model overrides can be object or absent
      if ("model" in block && (block.model === null || Array.isArray(block.model) || typeof block.model !== "object")) {
        issues.push(`timeframes.${tf}.${model}.model must be an object if present.`);
      }
    }
  }

  // Sanity-check hyperparameters where present
  const numericRanges = [
    { key: "tau", min: 0, max: 1 },
    { key: "dropout", min: 0, max: 1 },
    { key: "lr", min: 1e-7, max: 1 },
    { key: "epochs", min: 1, max: 100000 },
    { key: "batch", min: 1, max: 1048576 },
    { key: "seq_len", min: 1, max: 100000 },
  ];

  function checkRange(holder, holderPath) {
    if (!holder || typeof holder !== "object") return;
    for (const { key, min, max } of numericRanges) {
      if (key in holder && typeof holder[key] === "number") {
        const v = holder[key];
        if (!(v >= min && v <= max)) {
          issues.push(`${holderPath}.${key} out of range [${min}, ${max}]: ${v}`);
        }
      }
    }
  }

  // training_default and model_defaults ranges
  checkRange(config.training_defaults, "training_defaults");
  if (config.model_defaults && typeof config.model_defaults === "object") {
    for (const m of Object.keys(config.model_defaults || {})) {
      checkRange(config.model_defaults[m], `model_defaults.${m}`);
    }
  }
  // timeframe overrides ranges
  for (const tf of tfs) {
    for (const model of Object.keys(config.timeframes[tf] || EMPTY)) {
      const overrides = (config.timeframes[tf][model] || {}).model || EMPTY;
      checkRange(overrides, `timeframes.${tf}.${model}.model`);
    }
  }

  return issues;
}

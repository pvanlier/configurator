// frontend/src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchConfig, saveConfig, downloadConfig } from "./api";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import HyperParamsTab from "./components/HyperParamsTab";
import FeaturesTab     from "./components/FeaturesTab";
import BuildModelTab   from "./components/BuildModelTab";
import "react-tabs/style/react-tabs.css";

const TIMEFRAMES = ["m5","m15","h1","d1"];
const MODELS     = ["LSTM","Transformer","Testmodel"];

export default function App() {
  // ── hooks must be declared unconditionally and in the same order every render
  const [cfg, setCfg] = useState(null);
  const [tf, setTf] = useState(TIMEFRAMES[0]);
  const [model, setModel] = useState(MODELS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Push toolbar state — defined BEFORE any early returns to keep hook order stable
  const tfOptions = useMemo(() => TIMEFRAMES.filter(x => x !== tf), [tf]);
  const [destTFs, setDestTFs] = useState([]); // multi-select
  const [pushTypes, setPushTypes] = useState({ hyperparameters: true, features: true, model: false });

  useEffect(() => {
    fetchConfig()
      .then(data => { setCfg(data); setLoading(false); })
      .catch(err => { console.error(err); setError(err.toString()); setLoading(false); });
  }, []);

  // early returns AFTER all hooks
  if (loading) return <div>Loading…</div>;
  if (error)   return <div style={{color:"red"}}>Error: {error}</div>;
  if (!cfg)    return <div>No config loaded.</div>;

  const subcfg = (cfg[tf] && cfg[tf][model]) || { hyperparameters:{}, features:[], model:{layers:[]} };

  const updateSub = newSub => {
    const next = { ...cfg };
    next[tf] = next[tf] || {};
    next[tf][model] = newSub;
    setCfg(next);
  };

  const anySelected = destTFs.length > 0 && Object.values(pushTypes).some(Boolean);
  const handleToggleType = (k) => setPushTypes(s => ({ ...s, [k]: !s[k] }));
  const handleDestChange = (e) => {
    const opts = Array.from(e.target.selectedOptions).map(o => o.value);
    setDestTFs(opts);
  };
  function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }

  const doPush = () => {
    if (!anySelected) return;
    const src = cfg?.[tf]?.[model] || {};

    const selectedTypes = Object.entries(pushTypes).filter(([,v]) => v).map(([k]) => k).join(", ");
    const confirmMsg = `Push ${selectedTypes} from ${tf}/${model} to ${destTFs.join(', ')}?

This will OVERWRITE those sections in the destination timeframes.`;
    if (!window.confirm(confirmMsg)) return;

    const next = { ...cfg };
    destTFs.forEach(dst => {
      next[dst] = next[dst] || {};
      const base = next[dst][model] || {};
      const updated = { ...base };
      if (pushTypes.hyperparameters && src.hyperparameters) {
        updated.hyperparameters = deepClone(src.hyperparameters);
      }
      if (pushTypes.features && src.features) {
        updated.features = deepClone(src.features);
      }
      if (pushTypes.model && src.model) {
        updated.model = deepClone(src.model);
      }
      next[dst][model] = updated;
    });
    setCfg(next);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>AI Model Configurator (c) 2025 - Peter Van Lier</h1>

      {/* Global toolbar */}
      <div style={{ display:"flex", alignItems:"center", gap:"1rem", marginBottom:"1rem", flexWrap:"wrap" }}>
        <label>Timeframe:
          <select value={tf} onChange={e=>setTf(e.target.value)} style={{marginLeft:5}}>
            {TIMEFRAMES.map(x=> (<option key={x} value={x}>{x}</option>))}
          </select>
        </label>
        <label>Model:
          <select value={model} onChange={e=>setModel(e.target.value)} style={{marginLeft:5}}>
            {MODELS.map(x=> (<option key={x} value={x}>{x}</option>))}
          </select>
        </label>
        <button onClick={() => saveConfig(cfg)}>💾 Save</button>
        <button onClick={downloadConfig}>📥 Download YAML</button>
      </div>

      {/* Push panel */}
      <div style={{ border:"1px solid #ddd", borderRadius:8, padding:"0.75rem 1rem", marginBottom:"1.5rem", background:"#fafafa" }}>
        <strong>Push current config</strong>
        <div style={{ display:"flex", gap:"1rem", alignItems:"center", flexWrap:"wrap", marginTop:"0.5rem" }}>
          <span>From <code>{tf}</code>/<code>{model}</code> →</span>
          <label>
            To timeframe(s):
            <select multiple size={TIMEFRAMES.length-1} value={destTFs} onChange={handleDestChange} style={{ marginLeft:6, minWidth:120 }}>
              {tfOptions.map(x => (<option key={x} value={x}>{x}</option>))}
            </select>
          </label>
          <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
            <label><input type="checkbox" checked={pushTypes.hyperparameters} onChange={() => handleToggleType('hyperparameters')} /> Hyperparameters</label>
            <label><input type="checkbox" checked={pushTypes.features}        onChange={() => handleToggleType('features')} /> Features</label>
            <label><input type="checkbox" checked={pushTypes.model}           onChange={() => handleToggleType('model')} /> Model</label>
          </div>
          <button onClick={doPush} disabled={!anySelected} title={anySelected?"Push with overwrite confirm":"Select at least one destination and section"}>
            Push
          </button>
        </div>
      </div>

      <Tabs>
        <TabList>
          <Tab>Hyperparameters</Tab>
          <Tab>Features</Tab>
          <Tab>Build Model</Tab>
        </TabList>

        <TabPanel>
          <HyperParamsTab config={subcfg} onChange={updateSub} />
        </TabPanel>

        <TabPanel>
          <FeaturesTab
            config={subcfg}
            onChange={updateSub}
            allConfigs={cfg}
            currentTf={tf}
            currentModel={model}
            setAllConfigs={setCfg}
            enablePush={false}
          />
        </TabPanel>

        <TabPanel>
          <BuildModelTab config={subcfg} onChange={updateSub} modelType={model} />
        </TabPanel>
      </Tabs>
    </div>
  );
}

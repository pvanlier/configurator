// frontend/src/App.jsx
import React, { useEffect, useState } from "react";
import { fetchConfig, saveConfig, downloadConfig } from "./api";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import HyperParamsTab from "./components/HyperParamsTab";
import FeaturesTab     from "./components/FeaturesTab";
import BuildModelTab   from "./components/BuildModelTab";
import "react-tabs/style/react-tabs.css";

const TIMEFRAMES = ["m5","m15","h1","d1"];
const MODELS     = ["LSTM","Transformer","Testmodel"];

export default function App() {
  const [cfg, setCfg] = useState(null);
  const [tf, setTf] = useState(TIMEFRAMES[0]);
  const [model, setModel] = useState(MODELS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConfig()
      .then(data => { setCfg(data); setLoading(false); })
      .catch(err => { console.error(err); setError(err.toString()); setLoading(false); });
  }, []);

  if (loading) return <div>Loading…</div>;
  if (error)   return <div style={{color:"red"}}>Error: {error}</div>;
  if (!cfg)    return <div>No config loaded.</div>;

  const subcfg = (cfg[tf] && cfg[tf][model]) || {
    hyperparameters:{}, features:[], model:{layers:[]}
  };

  const updateSub = newSub => {
    const next = { ...cfg };
    next[tf] = next[tf] || {};
    next[tf][model] = newSub;
    setCfg(next);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>AI Model Configurator (c) 2025 - Peter Van Lier</h1>
      <div style={{
        display:"flex", alignItems:"center", gap:"1rem", marginBottom:"1.5rem"
      }}>
        <label>Timeframe:
          <select value={tf} onChange={e=>setTf(e.target.value)} style={{marginLeft:5}}>
            {TIMEFRAMES.map(x=>(
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>Model:
          <select value={model} onChange={e=>setModel(e.target.value)} style={{marginLeft:5}}>
            {MODELS.map(x=>(
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </label>
        <button onClick={() => saveConfig(cfg)}>💾 Save</button>
        <button onClick={downloadConfig}>📥 Download YAML</button>
      </div>
      <Tabs>
        <TabList>
          <Tab>Hyperparameters</Tab>
          <Tab>Features</Tab>
          <Tab>Build Model</Tab>
        </TabList>
        <TabPanel><HyperParamsTab config={subcfg} onChange={updateSub} /></TabPanel>
        <TabPanel><FeaturesTab   config={subcfg} onChange={updateSub} /></TabPanel>
        <TabPanel>
          <BuildModelTab
            config={subcfg}
            onChange={updateSub}
            modelType={model}
          />
        </TabPanel>
      </Tabs>
    </div>
  );
}

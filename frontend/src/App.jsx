import React, {useEffect, useMemo, useRef, useState} from "react";
 import FeaturesTab from "./components/FeaturesTab";
 import BuildModelTab from "./components/BuildModelTab";
 import TrainingParamsTab from "./components/TrainingParamsTab";

 // Configurable API base (persisted in localStorage)
 const DEFAULT_API_BASE = "http://localhost:8000";

 function getTimeframes(cfg) {
   const tf = cfg?.timeframes || {};
   return Object.keys(tf);
 }
 function getModelsForTf(cfg, tf) {
   const tfNode = cfg?.timeframes?.[tf] || {};
   return Object.keys(tfNode);
 }

 async function fetchJSON(url, opts) {
   const res = await fetch(url, opts);
   const text = await res.text();
   try {
     return JSON.parse(text);
   } catch {
     const snippet = text.slice(0, 200).replace(/\n/g, " ");
     throw new Error(`Expected JSON from ${url} but got: ${snippet}`);
   }
 }

 function Tabs({ active, setActive }) {
   const tabs = ["Training Parameters", "Features", "Build Model" ];
   return (
     <div role="tablist" aria-label="Configuration Tabs" style={{ display: "flex", gap: 8, borderBottom: "1px solid #ddd" }}>
       {tabs.map(t => (
         <button
           key={t}
           role="tab"
           aria-selected={active === t}
           onClick={() => setActive(t)}
           style={{
             padding: "8px 12px",
             border: "none",
             borderBottom: active === t ? "3px solid #333" : "3px solid transparent",
             background: "transparent",
             cursor: "pointer",
             fontWeight: active === t ? 700 : 500
           }}
         >
           {t}
         </button>
       ))}
     </div>
   );
 }

 export default function App() {
   const [allConfigs, setAllConfigs] = useState(null);
   const [currentTf, setCurrentTf] = useState("");
   const [currentModel, setCurrentModel] = useState("");
   const [busy, setBusy] = useState(false);
   const [msg, setMsg] = useState("");
   const [activeTab, setActiveTab] = useState("Features");
  const [apiBase, setApiBase] = useState(() => {
    return localStorage.getItem("apiBase") || (import.meta.env.VITE_API_BASE || DEFAULT_API_BASE);
  });
  const [tempApiBase, setTempApiBase] = useState(apiBase);

  // Keep a pristine copy of the config we received from the backend
  const originalCfgRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("apiBase", apiBase);
  }, [apiBase]);

  useEffect(() => {
    async function load() {
      try {
        setBusy(true);
        const cfg = await fetchJSON(`${apiBase}/config`);
        setAllConfigs(cfg);
        originalCfgRef.current = JSON.parse(JSON.stringify(cfg)); // deep-clone snapshot
        const tfs = getTimeframes(cfg);
        const tf0 = tfs[0] || "";
        const models = tf0 ? getModelsForTf(cfg, tf0) : [];
        setCurrentTf(tf0);
        setCurrentModel(models[0] || "");
      } catch (e) {
        console.error("Failed to load config:", e);
        setMsg(String(e.message || e));
      } finally {
        setBusy(false);
      }
    }
    load();
  }, [apiBase]);

   const tfOptions = useMemo(() => getTimeframes(allConfigs || {}), [allConfigs]);
   const modelOptions = useMemo(
     () => (currentTf ? getModelsForTf(allConfigs || {}, currentTf) : []),
     [allConfigs, currentTf]
   );

   const currentNode = useMemo(() => {
     if (!allConfigs || !currentTf || !currentModel) return null;
     return allConfigs.timeframes?.[currentTf]?.[currentModel] || null;
   }, [allConfigs, currentTf, currentModel]);

   const updateCurrentNode = (nextNode) => {
     setAllConfigs((prev) => {
       const next = { ...(prev || {}), timeframes: { ...(prev?.timeframes || {}) } };
       next.timeframes[currentTf] = { ...(next.timeframes[currentTf] || {}) };
       next.timeframes[currentTf][currentModel] = nextNode;
       return next;
     });
   };

   const saveConfig = async () => {
     if (!allConfigs) return;
     try {
       setBusy(true);
       setMsg("Saving…");
       const res = await fetch(`${apiBase}/config`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ config: allConfigs }),
       });
       if (!res.ok) throw new Error(`POST /config ${res.status}`);
       setMsg("Saved ✓");
       setTimeout(() => setMsg(""), 1500);
     } catch (e) {
       console.error(e);
       setMsg(`Save failed: ${e.message || e}`);
     } finally {
       setBusy(false);
     }
   };

   const downloadConfig = () => {
     window.location.href = `${apiBase}/download`;
   };

  // Reset the current page to defaults from feature_definitions (catalog)
  const resetCurrentPage = () => {
    if (activeTab === "Features") {
      const catalog = allConfigs?.features_definitions || [];
      // Build overlay using only catalog defaults (enabled flag).
      const nextFeatures = catalog.map(f => ({
        name: f.name,
        enabled: !!f.default_enabled,
      }));
      const nextNode = { ...(currentNode || {}), features: nextFeatures };
      updateCurrentNode(nextNode);
      setMsg("Features reset to catalog defaults ✓");
      setTimeout(() => setMsg(""), 1500);
      return;
    }
    // For other tabs, nothing to reset yet
    setMsg("Nothing to reset on this tab");
    setTimeout(() => setMsg(""), 1500);
  };

   if (!allConfigs) {
     return <div style={{ padding: 16 }}>{busy ? "Loading config…" : (msg || "No config yet")}</div>;
   }

   return (
     <div style={{ padding: 16, display: "grid", gap: 16 }}>
       <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
         <label>Timeframe:&nbsp;
           <select value={currentTf} onChange={e => { setCurrentTf(e.target.value); setCurrentModel(""); }}>
             {tfOptions.map(tf => <option key={tf} value={tf}>{tf}</option>)}
           </select>
         </label>
         <label>Model:&nbsp;
           <select value={currentModel} onChange={e => setCurrentModel(e.target.value)}>
             {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
           </select>
         </label>
        <label>API Base:&nbsp;
          <input
            type="url"
            value={tempApiBase}
            onChange={e => setTempApiBase(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") setApiBase(tempApiBase.trim() || DEFAULT_API_BASE);
            }}
            onBlur={() => setApiBase(tempApiBase.trim() || DEFAULT_API_BASE)}
            placeholder={DEFAULT_API_BASE}
            style={{ minWidth: 280 }}
          />
        </label>

         <button onClick={saveConfig} disabled={busy}>Save</button>
         <button onClick={resetCurrentPage} disabled={busy}>Reset to defaults</button>
         <button onClick={downloadConfig} disabled={busy}>Download YAML</button>
         {msg && <span style={{ marginLeft: 8, opacity: 0.8 }}>{msg}</span>}
       </div>

       <Tabs active={activeTab} setActive={setActiveTab} />

       {currentNode ? (
         <div>
           {activeTab === "Features" && (
             <FeaturesTab
               config={currentNode}
               onChange={updateCurrentNode}
               allConfigs={allConfigs}
               currentTf={currentTf}
               currentModel={currentModel}
               setAllConfigs={setAllConfigs}
             />
           )}

           {activeTab === "Build Model" && (
             <BuildModelTab
               config={currentNode}
               onChange={updateCurrentNode}
               modelType={currentModel}
             />
           )}

           {activeTab === "Training Parameters" && (
             <TrainingParamsTab
               config={allConfigs}
               onChange={setAllConfigs}
               modelType={currentModel}
               timeframe={currentTf}
             />
           )}
         </div>
       ) : (
         <div>No configuration found for selection.</div>
       )}
     </div>
   );
 }

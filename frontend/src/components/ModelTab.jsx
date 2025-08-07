import React, { useRef } from "react";
import AceEditor from "react-ace";

// 1) Core
import "ace-builds/src-noconflict/ace";

// 2) Language tools (if you want autocomplete/snippets)
import "ace-builds/src-noconflict/ext-language_tools";

// 3) Modes & themes
import "ace-builds/src-noconflict/mode-yaml";
import "ace-builds/src-noconflict/theme-tomorrow";


export default function ModelTab({ config, onChange }) {
  const yamlText = useRef("");

  return (
    <div>
      <button onClick={() => onChange({ ...config, model: yamlText.current })}>
        Save Model YAML
      </button>
      <AceEditor
        mode="yaml"
        theme="tomorrow"
        width="100%"
        height="400px"
        onChange={text => { yamlText.current = text; }}
        value={JSON.stringify(config.model, null, 2)}
        setOptions={{ useWorker: false }}
      />
    </div>
  );
}

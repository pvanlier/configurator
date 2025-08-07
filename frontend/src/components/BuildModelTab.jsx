// frontend/src/components/BuildModelTab.jsx

import React, { useState, useEffect, useRef } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable
} from "@hello-pangea/dnd";

// Define available blocks per model type
const BLOCK_LIBRARY = {
  LSTM: ["LSTM", "Dense", "Dropout", "Flatten", "Activation"],
  Transformer: [
    "MultiHeadSelfAttention",
    "FeedForward",
    "Dropout",
    "LayerNormalization",
    "Add"
  ],
  Testmodel: ["Dense", "Activation", "Dropout"]
};

// Parameter schemas for each block
const PARAM_SCHEMAS = {
  LSTM: [
    { name: "units", label: "Units", type: "number", default: 128 },
    { name: "dropout", label: "Dropout", type: "number", default: 0.2 },
    { name: "recurrent_dropout", label: "Recurrent Dropout", type: "number", default: 0.0 },
    { name: "return_sequences", label: "Return Sequences", type: "boolean", default: true }
  ],
  Dense: [
    { name: "units", label: "Units", type: "number", default: 64 },
    { name: "activation", label: "Activation", type: "text", default: "relu" }
  ],
  Dropout: [
    { name: "rate", label: "Rate", type: "number", default: 0.5 }
  ],
  Flatten: [],
  Activation: [
    { name: "activation", label: "Activation", type: "text", default: "relu" }
  ],
  MultiHeadSelfAttention: [
    { name: "num_heads", label: "Number of Heads", type: "number", default: 4 },
    { name: "key_dim", label: "Key Dimension", type: "number", default: 32 },
    { name: "dropout", label: "Dropout", type: "number", default: 0.1 }
  ],
  FeedForward: [
    { name: "ff_dim", label: "FF Dimension", type: "number", default: 128 },
    { name: "activation", label: "Activation", type: "text", default: "relu" }
  ],
  LayerNormalization: [
    { name: "axis", label: "Axis", type: "number", default: -1 },
    { name: "epsilon", label: "Epsilon", type: "number", default: 1e-6 }
  ],
  Add: []
};

// Helper to reorder an array
function reorder(list, startIndex, endIndex) {
  const res = Array.from(list);
  const [moved] = res.splice(startIndex, 1);
  res.splice(endIndex, 0, moved);
  return res;
}

// Deep compare helper for layers (without id)
function layersEqual(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export default function BuildModelTab({ config, onChange, modelType }) {
  const idCounter = useRef(0);

  // Selected layers state with internal id
  const [selected, setSelected] = useState(() => {
    const layers = config.model?.layers || [];
    return layers.map(layer => ({
      ...layer,
      id: layer.id ?? `blk-${idCounter.current++}`
    }));
  });

  // Track expanded/collapsed state
  const [expanded, setExpanded] = useState({});

  // Sync selected state when modelType or config.model.layers changes
  useEffect(() => {
    const layersFromConfig = config.model?.layers || [];
    const simplifiedSelected = selected.map(({ id, ...rest }) => rest);
    if (!layersEqual(layersFromConfig, simplifiedSelected)) {
      const init = layersFromConfig.map(layer => ({
        ...layer,
        id: layer.id ?? `blk-${idCounter.current++}`
      }));
      setSelected(init);
      setExpanded({}); // reset expansion
    }
  }, [config.model?.layers, modelType]);

  // Propagate selection changes upward
  useEffect(() => {
    const layersToSave = selected.map(({ id, ...rest }) => rest);
    onChange({ ...config, model: { ...config.model, layers: layersToSave } });
  }, [selected]);

  // Handle drag end event
  const onDragEnd = result => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // Add new block from available to selected
    if (source.droppableId === "available" && destination.droppableId === "selected") {
      const type = draggableId;
      const params = {};
      (PARAM_SCHEMAS[type] || []).forEach(p => (params[p.name] = p.default));
      const newBlk = { id: `blk-${idCounter.current++}`, type, params };
      const upd = Array.from(selected);
      upd.splice(destination.index, 0, newBlk);
      setSelected(upd);
    }

    // Reorder within selected pane
    if (source.droppableId === "selected" && destination.droppableId === "selected") {
      setSelected(reorder(selected, source.index, destination.index));
    }
  };

  const updateParam = (idx, name, value) => {
    setSelected(sel =>
      sel.map((blk, i) =>
        i === idx
          ? { ...blk, params: { ...blk.params, [name]: value } }
          : blk
      )
    );
  };

  const removeBlock = idx => setSelected(sel => sel.filter((_, i) => i !== idx));

  const toggleExpand = id => setExpanded(exp => ({ ...exp, [id]: !exp[id] }));

  // Determine blocks available for the selected model type
  const availableBlocks = BLOCK_LIBRARY[modelType] || [];

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: "flex", gap: "2rem" }}>
        {/* Available Blocks Pane */}
        <Droppable droppableId="available" type="BLOCK">
          {prov => (
            <div
              ref={prov.innerRef}
              {...prov.droppableProps}
              style={{
                flex: 1,
                padding: 16,
                border: "1px solid #ccc",
                borderRadius: 4,
                minHeight: 200
              }}
            >
              <h4>Available Blocks ({modelType})</h4>
              {availableBlocks.map((type, idx) => (
                <Draggable key={type} draggableId={type} index={idx}>
                  {prov => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      style={{
                        padding: 8,
                        margin: "4px 0",
                        background: "#f0f0f0",
                        borderRadius: 4,
                        cursor: "grab",
                        ...prov.draggableProps.style
                      }}
                    >
                      {type}
                    </div>
                  )}
                </Draggable>
              ))}
              {prov.placeholder}
            </div>
          )}
        </Droppable>

        {/* Selected Layers Pane */}
        <Droppable droppableId="selected" type="BLOCK">
          {prov => (
            <div
              ref={prov.innerRef}
              {...prov.droppableProps}
              style={{
                flex: 2,
                padding: 16,
                border: "1px solid #ccc",
                borderRadius: 4,
                minHeight: 200
              }}
            >
              <h4>Model Layers</h4>
              {selected.map((blk, idx) => (
                <Draggable key={blk.id} draggableId={blk.id} index={idx}>
                  {prov => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      style={{
                        margin: "8px 0",
                        background: "#e8f0fe",
                        borderRadius: 4,
                        ...prov.draggableProps.style
                      }}
                    >
                      {/* Header with expand/collapse and remove */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: 8
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <button
                            onClick={() => toggleExpand(blk.id)}
                            style={{
                              marginRight: 8,
                              cursor: "pointer",
                              border: "none",
                              background: "transparent",
                              fontSize: 16
                            }}
                            aria-label={expanded[blk.id] ? "Collapse" : "Expand"}
                          >
                            {expanded[blk.id] ? "▼" : "▶"}
                          </button>
                          <div {...prov.dragHandleProps} style={{ cursor: "grab" }}>
                            <strong>{blk.type}</strong>
                          </div>
                        </div>
                        <button onClick={() => removeBlock(idx)}>Remove</button>
                      </div>
                      {/* Parameters panel */}
                      {expanded[blk.id] && (
                        <div style={{ padding: "8px 16px" }}>
                          {(PARAM_SCHEMAS[blk.type] || []).map(param => (
                            <div key={param.name} style={{ marginBottom: 8 }}>
                              <label style={{ display: "block", fontSize: "0.9rem" }}>
                                {param.label}:
                              </label>
                              {param.type === "boolean" ? (
                                <input
                                  type="checkbox"
                                  checked={!!blk.params[param.name]}
                                  onChange={e =>
                                    updateParam(idx, param.name, e.target.checked)
                                  }
                                />
                              ) : (
                                <input
                                  type={param.type}
                                  value={blk.params[param.name]}
                                  onChange={e =>
                                    updateParam(
                                      idx,
                                      param.name,
                                      param.type === "number"
                                        ? Number(e.target.value)
                                        : e.target.value
                                    )
                                  }
                                  style={{ width: "100%" }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {prov.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}

// frontend/src/components/HyperParamsTab.jsx

import React from "react";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

// Group definitions
const HYPER_GROUPS = {
  "Training Parameters": [
      "alpha", "bal_nat_sample_weights", "batch_size", "class_weights", "dropout", "epochs", "gamma", "label_horizon",
      "label_smoothing", "label_thr", "lr", "lr_warmup", "oversampling_weights", "records_to_load", "seq_len",
      "steps_per_epoch", "tau", "undersampling_ratio", "warmup_epochs", "zigzag_threshold"
  ],
  "Reporting Parameters": [],
    "Output Parameters": ["lit", "shap_samples", "simulate"]
};

// Build validation schema dynamically
const buildSchema = defaults => {
  const shape = {};
  Object.entries(defaults).forEach(([key, value]) => {
    if (typeof value === 'number') {
      shape[key] = yup.number().typeError('Must be a number').required();
    } else if (typeof value === 'boolean') {
      shape[key] = yup.boolean();
    } else {
      // treat everything else as string; for objects ensure valid JSON
      let schema = yup.string().required('Required');
      if (typeof value === 'object') {
        schema = schema.test('is-json', 'Must be valid JSON', v => {
          try { JSON.parse(v); return true; } catch { return false; }
        });
      }
      shape[key] = schema;
    }
  });
  return yup.object().shape(shape);
};

export default function HyperParamsTab({ config, onChange }) {
  const rawDefaults = config.hyperparameters || {};

  // Prepare form defaults: stringify objects
  const formDefaults = React.useMemo(() => {
    const fd = {};
    Object.entries(rawDefaults).forEach(([k, v]) => {
      if (typeof v === 'object') fd[k] = JSON.stringify(v);
      else fd[k] = v;
    });
    return fd;
  }, [rawDefaults]);

  const schema = React.useMemo(() => buildSchema(rawDefaults), [rawDefaults]);
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: formDefaults,
    resolver: yupResolver(schema)
  });

  // Reset when defaults change
  React.useEffect(() => { reset(formDefaults); }, [formDefaults, reset]);

  const onSubmit = data => {
    const parsed = {};
    Object.entries(data).forEach(([k, v]) => {
      const orig = rawDefaults[k];
      if (typeof orig === 'number') {
        parsed[k] = Number(v);
      } else if (typeof orig === 'boolean') {
        parsed[k] = Boolean(v);
      } else if (typeof orig === 'object') {
        parsed[k] = JSON.parse(v);
      } else {
        parsed[k] = v;
      }
    });
    onChange({ ...config, hyperparameters: parsed });
  };

  return (
    <form onBlur={handleSubmit(onSubmit)} style={{ width: '100%' }}>
      {Object.entries(HYPER_GROUPS).map(([group, keys]) => (
        <table key={group} style={{ width: '100%', marginBottom: 20, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th colSpan={2} style={{ textAlign: 'left', padding: '8px', background: '#f0f0f0' }}>
                {group}
              </th>
            </tr>
          </thead>
          <tbody>
            {keys.map(key => {
              const orig = rawDefaults[key];
              const type = typeof orig === 'number'
                ? 'number'
                : typeof orig === 'boolean'
                  ? 'checkbox'
                  : 'text';
              return (
                <tr key={key}>
                  <td style={{ padding: '8px', border: '1px solid #ddd', width: '30%' }}>
                    <label htmlFor={key}>{key}</label>
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                    <Controller
                      name={key}
                      control={control}
                      render={({ field }) => (
                        type === 'checkbox' ? (
                          <input
                            {...field}
                            type="checkbox"
                            checked={field.value}
                            onChange={e => field.onChange(e.target.checked)}
                          />
                        ) : (
                          <input
                            {...field}
                            type={type}
                            value={field.value}
                            onChange={e => field.onChange(e.target.value)}
                            style={{ width: '100%' }}
                          />
                        )
                      )}
                    />
                    {errors[key] && (
                      <div style={{ color: 'red', fontSize: '0.8em' }}>
                        {errors[key].message}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ))}
    </form>
  );
}

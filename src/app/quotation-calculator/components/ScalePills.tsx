'use client';
import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface ScalePillsProps {
  scales: number[];
  onChange: (scales: number[]) => void;
  maxScales?: number;
}

export default function ScalePills({ scales, onChange, maxScales = 20 }: ScalePillsProps) {
  const [inputVal, setInputVal] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');

  const addScale = () => {
    const v = parseFloat(inputVal);
    if (!isNaN(v) && v > 0 && !scales.includes(v) && scales.length < maxScales) {
      onChange([...scales, v].sort((a, b) => a - b));
      setInputVal('');
    }
  };

  const removeScale = (idx: number) => {
    onChange(scales.filter((_, i) => i !== idx));
  };

  const startEdit = (idx: number) => {
    setEditing(idx);
    setEditVal(String(scales[idx]));
  };

  const commitEdit = (idx: number) => {
    const v = parseFloat(editVal);
    if (!isNaN(v) && v > 0) {
      const newScales = [...scales];
      newScales[idx] = v;
      onChange(newScales.sort((a, b) => a - b));
    }
    setEditing(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          <span className={scales.length >= maxScales ? 'text-orange-400 font-semibold' : 'text-slate-400'}>
            {scales.length}
          </span>
          <span className="text-slate-600"> / {maxScales} escalas definidas</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {scales.map((s, idx) => (
          <div
            key={idx}
            className="group flex items-center gap-1 bg-slate-700/60 border border-slate-600 rounded-full px-3 py-1 text-sm font-mono-num"
          >
            {editing === idx ? (
              <input
                autoFocus
                type="number"
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onBlur={() => commitEdit(idx)}
                onKeyDown={(e) => e.key === 'Enter' && commitEdit(idx)}
                className="w-16 bg-transparent outline-none text-orange-400 font-mono-num text-sm"
              />
            ) : (
              <span
                className="text-slate-200 cursor-pointer hover:text-orange-400 transition-colors"
                onClick={() => startEdit(idx)}
                title="Click para editar"
              >
                {s < 1 ? s.toString() : s.toLocaleString()}k
              </span>
            )}
            <button
              type="button"
              onClick={() => removeScale(idx)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 ml-1"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {scales.length < maxScales && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addScale()}
              placeholder="+ millar"
              className="w-20 input-base text-sm py-1 px-2"
              step="0.5"
              min="0.1"
            />
            <button
              type="button"
              onClick={addScale}
              className="p-1.5 rounded-full bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
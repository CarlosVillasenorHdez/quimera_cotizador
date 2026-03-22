'use client';
import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export default function Toggle({ checked, onChange, label, disabled = false, size = 'md' }: ToggleProps) {
  const trackW = size === 'sm' ? 'w-8' : 'w-9';
  const trackH = size === 'sm' ? 'h-4' : 'h-5';
  const thumbSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const thumbTranslate = size === 'sm' ? 'translate-x-4' : 'translate-x-[1.125rem]';

  return (
    <label
      className={`flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex items-center ${trackW} ${trackH} rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
          checked ? 'bg-orange-500' : 'bg-slate-600'
        }`}
      >
        <span
          className={`absolute ${thumbSize} rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? thumbTranslate : 'translate-x-0.5'
          }`}
        />
      </button>
      {label && (
        <span className={`text-sm ${checked ? 'text-slate-200' : 'text-slate-400'}`}>{label}</span>
      )}
    </label>
  );
}
'use client';
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface SectionAccordionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}

export default function SectionAccordion({
  title,
  subtitle,
  icon,
  defaultOpen = true,
  children,
  badge,
}: SectionAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card-base overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-orange-400">{icon}</span>}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100 text-sm">{title}</span>
              {badge && (
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-medium">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-slate-700/50">{children}</div>}
    </div>
  );
}
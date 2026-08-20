'use client';

import React from 'react';

import { COLOR_PRESETS, ICON_PRESETS, getTierIcon } from './tier-presets';

interface TierAddFormProps {
  nameInput: string;
  setNameInput: (v: string) => void;
  descInput: string;
  setDescInput: (v: string) => void;
  colorInput: string;
  setColorInput: (v: string) => void;
  iconInput: string;
  setIconInput: (v: string) => void;
  defaultVisInput: boolean;
  setDefaultVisInput: (v: boolean) => void;
  sortIdxInput: number;
  setSortIdxInput: (v: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function TierAddForm({
  nameInput,
  setNameInput,
  descInput,
  setDescInput,
  colorInput,
  setColorInput,
  iconInput,
  setIconInput,
  defaultVisInput,
  setDefaultVisInput,
  sortIdxInput,
  setSortIdxInput,
  onSubmit,
  isPending,
}: TierAddFormProps) {
  return (
    <div className="lg:col-span-1 space-y-6">
      {/* Live Preview Ticket Card */}
      <div className="glass rounded-2xl border border-border-subtle p-5 overflow-hidden relative flex flex-col justify-between h-48 bg-gradient-to-br from-white/5 to-white/0 shadow-glow-sm">
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full filter blur-2xl opacity-20" style={{ backgroundColor: colorInput }} />

        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-all"
              style={{ backgroundColor: colorInput }}
            >
              {getTierIcon(iconInput)}
            </div>
            <div>
              <h4 className="text-white font-black text-sm uppercase tracking-wider">{nameInput || 'Tier Title'}</h4>
              <p className="text-[10px] text-text-muted font-mono">{nameInput.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'slug-auto-preview'}</p>
            </div>
          </div>
          <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-white/10 text-white/90">
            Preview
          </span>
        </div>

        <p className="text-text-secondary text-xs line-clamp-2 italic pr-4">
          {descInput || 'Write a short description to guide customers on checkout...'}
        </p>

        <div className="flex justify-between items-center border-t border-white/5 pt-3">
          <span className="text-[10px] text-text-muted">Visibility: {defaultVisInput ? 'Visible' : 'Hidden'}</span>
          <span className="text-xs font-bold font-mono" style={{ color: colorInput }}>Order: {sortIdxInput}</span>
        </div>
      </div>

      {/* Quick Add Form */}
      <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
        <h3 className="text-white font-bold text-md">Add New Ticket Tier</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-text-secondary text-xs font-bold block mb-1.5">Tier Name</label>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. VIP VIP Backstage"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div>
            <label className="text-text-secondary text-xs font-bold block mb-1.5">Description</label>
            <textarea
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              placeholder="Describe tier privileges..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple resize-none"
            />
          </div>

          {/* Swatch Color Picker */}
          <div>
            <label className="text-text-secondary text-xs font-bold block mb-1.5">Accent Color</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setColorInput(preset.hex)}
                  title={preset.name}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    colorInput === preset.hex ? 'scale-110 border-white shadow-glow-sm' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                />
              ))}
            </div>
            <input
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              placeholder="#HEX Code"
              className="w-full px-4 py-2 rounded-xl bg-background border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-accent-purple font-mono"
            />
          </div>

          {/* Icon Selection Picker */}
          <div>
            <label className="text-text-secondary text-xs font-bold block mb-1.5">Icon Badge</label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_PRESETS.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  onClick={() => setIconInput(icon.id)}
                  title={icon.label}
                  className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                    iconInput === icon.id
                      ? 'bg-accent-purple/10 text-accent-purple-light border-accent-purple/30 shadow-glow-sm'
                      : 'glass border-border-subtle text-text-secondary hover:text-white'
                  }`}
                >
                  {getTierIcon(icon.id)}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility & Sort Order */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-text-secondary text-xs font-bold block mb-1.5">Sort Position</label>
              <input
                type="number"
                min="0"
                value={sortIdxInput}
                onChange={(e) => setSortIdxInput(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple font-mono"
              />
            </div>
            <div className="flex flex-col justify-end pb-2.5">
              <label className="flex items-center gap-2 text-text-secondary text-xs font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={defaultVisInput}
                  onChange={(e) => setDefaultVisInput(e.target.checked)}
                  className="rounded bg-background border-border-subtle text-accent-purple focus:ring-accent-purple"
                />
                Visible by Default
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 btn-gradient text-white text-sm font-bold rounded-xl shadow-glow transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {isPending ? 'Saving...' : 'Save & Publish Tier'}
          </button>
        </form>
      </div>
    </div>
  );
}

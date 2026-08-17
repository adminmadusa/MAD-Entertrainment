import React from 'react';

// Color Presets for swatches
export const COLOR_PRESETS = [
  { hex: '#6366F1', name: 'Indigo' },
  { hex: '#8B5CF6', name: 'Violet' },
  { hex: '#F59E0B', name: 'Amber' },
  { hex: '#F43F5E', name: 'Rose' },
  { hex: '#10B981', name: 'Emerald' },
  { hex: '#0EA5E9', name: 'Sky' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#64748B', name: 'Slate' }
];

// Icon Presets
export const ICON_PRESETS = [
  { id: 'ticket', label: 'Ticket' },
  { id: 'star', label: 'Star' },
  { id: 'medal', label: 'Medal' },
  { id: 'crown', label: 'Crown' },
  { id: 'lock', label: 'Lock' },
  { id: 'users', label: 'Users' },
  { id: 'heart', label: 'Heart' },
  { id: 'clock', label: 'Clock' },
  { id: 'gift', label: 'Gift' }
];

export function getTierIcon(iconName: string): React.ReactNode {
  switch (iconName) {
    case 'star':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    case 'medal':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case 'crown':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/></svg>;
    case 'lock':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case 'users':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'heart':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    case 'clock':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case 'gift':
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="14" rx="2"/><path d="M12 5V22M19 12H5M12 5a3 3 0 1 0-3-3M12 5a3 3 0 1 1 3-3"/></svg>;
    case 'ticket':
    default:
      return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="9" y1="12" x2="15" y2="12"/></svg>;
  }
}

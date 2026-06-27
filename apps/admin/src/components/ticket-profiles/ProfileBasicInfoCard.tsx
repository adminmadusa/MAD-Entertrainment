import React from 'react';

export interface ProfileBasicInfoCardProps {
  name: string;
  setName: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
}

export const ProfileBasicInfoCard = React.memo(function ProfileBasicInfoCard({
  name,
  setName,
  description,
  setDescription,
}: ProfileBasicInfoCardProps) {
  return (
    <div className="glass rounded-2xl border border-border-subtle p-6 space-y-4">
      <h2 className="text-white font-semibold text-base">Profile Info</h2>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-text-secondary text-sm font-medium">Profile Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard Club Event Profile"
            required
            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-text-secondary text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief details about what events this profile matches..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-accent-purple transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  );
});

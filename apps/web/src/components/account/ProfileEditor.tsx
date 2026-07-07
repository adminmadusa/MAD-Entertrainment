'use client';

import React, { useState, useEffect } from 'react';

import { useAuth } from '@/providers/AuthProvider';

import { ProfileCompletionForm } from '../auth/ProfileCompletionForm';
import { ProfileViewCard } from './ProfileViewCard';

export function ProfileEditor() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  // Focus management: move keyboard focus to the first input field (firstName) when entering edit mode
  useEffect(() => {
    if (isEditing) {
      const timer = setTimeout(() => {
        const firstNameInput = document.getElementById('firstName');
        if (firstNameInput) {
          firstNameInput.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="animate-in fade-in duration-300">
        <ProfileCompletionForm
          mode="edit"
          initialFirstName={user?.firstName || ''}
          initialLastName={user?.lastName || ''}
          initialMobileNumber={user?.mobileNumber || ''}
          onSuccess={() => setIsEditing(false)}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <ProfileViewCard user={user} onEditClick={() => setIsEditing(true)} />
    </div>
  );
}

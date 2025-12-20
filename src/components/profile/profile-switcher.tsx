import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/src/lib/utils';
import { useProfileData } from '@/src/hooks';
import { ChevronDown, Plus, Check, Star } from 'lucide-react';

interface ProfileSwitcherProps {
  collapsed?: boolean;
  className?: string;
}

export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({
  collapsed = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use unified profile data hook that switches between localStorage and Supabase
  const { profiles, activeProfile, actions } = useProfileData();
  const { switchProfile, createProfile } = actions;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowNewProfile(false);
        setNewProfileName('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when showing new profile form
  useEffect(() => {
    if (showNewProfile && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showNewProfile]);

  const handleCreateProfile = async () => {
    if (newProfileName.trim()) {
      try {
        const newId = await createProfile(newProfileName.trim());
        switchProfile(newId);
        setNewProfileName('');
        setShowNewProfile(false);
        setIsOpen(false);
      } catch (error) {
        console.error('Failed to create profile:', error);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateProfile();
    } else if (e.key === 'Escape') {
      setShowNewProfile(false);
      setNewProfileName('');
    }
  };

  if (!activeProfile) {
    return null;
  }

  const profileColor = activeProfile.metadata.color || '#3B82F6';

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
          'bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50',
          'text-left group',
          collapsed && 'justify-center px-2'
        )}
      >
        {/* Profile Color Indicator */}
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: profileColor }}
        />

        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {activeProfile.metadata.name}
              </div>
              {activeProfile.headline && (
                <div className="text-xs text-gray-500 truncate">
                  {activeProfile.headline}
                </div>
              )}
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-gray-500 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 py-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl',
            'min-w-[220px] max-h-[320px] overflow-y-auto',
            collapsed ? 'left-full ml-2 top-0' : 'left-0 right-0'
          )}
        >
          {/* Profile List */}
          <div className="px-2 py-1">
            <div className="text-xs font-medium text-gray-500 px-2 mb-1">
              Switch Profile
            </div>
            {profiles.map((profile) => (
              <button
                key={profile.metadata.id}
                onClick={() => {
                  switchProfile(profile.metadata.id);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-2 rounded-md transition-colors text-left',
                  profile.metadata.id === activeProfile.metadata.id
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-gray-300 hover:bg-gray-800'
                )}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: profile.metadata.color || '#3B82F6' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-1">
                    {profile.metadata.name}
                    {profile.metadata.isDefault && (
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    )}
                  </div>
                  {profile.headline && (
                    <div className="text-xs text-gray-500 truncate">
                      {profile.headline}
                    </div>
                  )}
                </div>
                {profile.metadata.id === activeProfile.metadata.id && (
                  <Check className="w-4 h-4 text-blue-400 shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-800 my-1" />

          {/* New Profile Form or Button */}
          <div className="px-2 py-1">
            {showNewProfile ? (
              <div className="flex items-center gap-2 px-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Profile name..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleCreateProfile}
                  disabled={!newProfileName.trim()}
                  className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewProfile(true)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">New Profile</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSwitcher;

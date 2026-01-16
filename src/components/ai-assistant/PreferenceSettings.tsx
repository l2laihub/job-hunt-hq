/**
 * Preference Settings Panel
 *
 * A panel for viewing and managing learned AI Assistant preferences.
 */
import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Sparkles,
  RefreshCcw,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { usePreferencesStore } from '@/src/stores/preferences';
import type { UserPreference, PreferenceCategory, PreferenceConfidence } from '@/src/types/preferences';
import { PREFERENCE_LABELS } from '@/src/types/preferences';

interface PreferenceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

// Category display names and colors
const CATEGORY_CONFIG: Record<PreferenceCategory, { label: string; color: string }> = {
  general: { label: 'General', color: 'bg-gray-500' },
  communication: { label: 'Communication Style', color: 'bg-blue-500' },
  'job-analysis': { label: 'Job Analysis', color: 'bg-purple-500' },
  'interview-prep': { label: 'Interview Prep', color: 'bg-green-500' },
  'company-research': { label: 'Company Research', color: 'bg-amber-500' },
  stories: { label: 'STAR Stories', color: 'bg-pink-500' },
  resume: { label: 'Resume', color: 'bg-cyan-500' },
  copilot: { label: 'Copilot', color: 'bg-red-500' },
};

// Confidence badge colors
const CONFIDENCE_COLORS: Record<PreferenceConfidence, string> = {
  low: 'bg-gray-600 text-gray-300',
  medium: 'bg-blue-600/30 text-blue-300',
  high: 'bg-green-600/30 text-green-300',
  confirmed: 'bg-purple-600/30 text-purple-300',
};

/**
 * Format preference value for display
 */
function formatValue(value: string | boolean | number): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

/**
 * Get human-readable preference description
 */
function getPreferenceDescription(pref: UserPreference): string {
  const label = PREFERENCE_LABELS[pref.key] || pref.key.replace(/_/g, ' ');

  if (typeof pref.value === 'boolean') {
    return pref.value ? label : `Don't ${label.toLowerCase()}`;
  }

  return `${label}: ${pref.value}`;
}

/**
 * Single preference item
 */
const PreferenceItem: React.FC<{
  preference: UserPreference;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ preference, onToggle, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setIsDeleting(true);
    onDelete(preference.id);
  };

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all',
        preference.isActive
          ? 'bg-gray-800/50 border-gray-700'
          : 'bg-gray-900/30 border-gray-800 opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'w-2 h-2 rounded-full shrink-0',
                CATEGORY_CONFIG[preference.category]?.color || 'bg-gray-500'
              )}
            />
            <span className="text-sm font-medium text-gray-200 truncate">
              {getPreferenceDescription(preference)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className={cn('px-1.5 py-0.5 rounded', CONFIDENCE_COLORS[preference.confidence])}>
              {preference.confidence}
            </span>
            <span>via {preference.source}</span>
            {preference.appliedCount > 0 && (
              <span>({preference.appliedCount} uses)</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggle(preference.id)}
            className="p-1.5 text-gray-400 hover:text-gray-200 transition-colors"
            title={preference.isActive ? 'Disable' : 'Enable'}
          >
            {preference.isActive ? (
              <ToggleRight className="w-5 h-5 text-green-400" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main PreferenceSettings component
 */
export const PreferenceSettings: React.FC<PreferenceSettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    preferences,
    isLoading,
    error,
    loadPreferences,
    togglePreference,
    deletePreference,
    resetAllPreferences,
    clearError,
  } = usePreferencesStore();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Load preferences when panel opens
  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen, loadPreferences]);

  // Group preferences by category
  const groupedPreferences = preferences.reduce(
    (groups, pref) => {
      const category = pref.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(pref);
      return groups;
    },
    {} as Record<PreferenceCategory, UserPreference[]>
  );

  const handleToggle = async (id: string) => {
    try {
      await togglePreference(id);
    } catch (err) {
      console.error('Failed to toggle preference:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePreference(id);
    } catch (err) {
      console.error('Failed to delete preference:', err);
    }
  };

  const handleResetAll = async () => {
    setIsResetting(true);
    try {
      await resetAllPreferences();
      setShowResetConfirm(false);
    } catch (err) {
      console.error('Failed to reset preferences:', err);
    } finally {
      setIsResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-gray-900 z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-white">Preferences</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-sm text-red-300">{error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-8 text-gray-400">
            <RefreshCcw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading preferences...
          </div>
        )}

        {/* Empty state */}
        {!isLoading && preferences.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              No preferences learned yet
            </h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              I'll learn your preferences as you chat with me. Try telling me
              things like "keep responses short" or rating my responses.
            </p>
          </div>
        )}

        {/* Preference list */}
        {!isLoading && preferences.length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedPreferences).map(([category, prefs]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      CATEGORY_CONFIG[category as PreferenceCategory]?.color ||
                        'bg-gray-500'
                    )}
                  />
                  <h3 className="text-sm font-medium text-gray-400">
                    {CATEGORY_CONFIG[category as PreferenceCategory]?.label ||
                      category}
                  </h3>
                  <span className="text-xs text-gray-600">
                    ({prefs.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {prefs.map((pref) => (
                    <PreferenceItem
                      key={pref.id}
                      preference={pref}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with reset option */}
      {preferences.length > 0 && (
        <div className="p-4 border-t border-gray-700">
          {showResetConfirm ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-400">
                Reset all preferences?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetAll}
                  disabled={isResetting}
                  className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isResetting ? 'Resetting...' : 'Reset All'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Reset all preferences
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PreferenceSettings;

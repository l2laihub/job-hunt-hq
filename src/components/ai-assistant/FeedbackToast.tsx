/**
 * Feedback Toast
 *
 * Shows a subtle notification when a preference is learned from user interaction.
 */
import React, { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { usePreferencesStore } from '@/src/stores/preferences';
import { PREFERENCE_LABELS } from '@/src/types/preferences';

/**
 * Generate a human-readable message for a learned preference
 */
function getPreferenceMessage(key: string, value: string | boolean | number): string {
  const label = PREFERENCE_LABELS[key] || key;

  // Handle boolean preferences
  if (typeof value === 'boolean') {
    return value ? `I'll ${label.toLowerCase()}` : `I won't ${label.toLowerCase()}`;
  }

  // Handle specific keys with custom messages
  switch (key) {
    case 'response_length':
      if (value === 'concise') return "Got it! I'll keep responses shorter.";
      if (value === 'detailed') return "Got it! I'll give more detailed responses.";
      return `I'll aim for ${value} responses.`;

    case 'response_tone':
      return `I'll use a more ${value} tone.`;

    case 'include_examples':
      return value ? "I'll include more examples." : "I'll skip the examples.";

    case 'include_metrics':
      return value ? "I'll emphasize metrics and numbers." : "I'll focus less on metrics.";

    case 'focus_on_tech':
      return value ? "I'll focus more on technical details." : "I'll keep it less technical.";

    case 'use_bullet_points':
      return value ? "I'll use more bullet points." : "I'll use more prose.";

    case 'ask_followups':
      return value ? "I'll ask more follow-up questions." : "I'll minimize follow-up questions.";

    default:
      return `Preference updated: ${label} = ${value}`;
  }
}

export const FeedbackToast: React.FC = () => {
  const { showLearningToast, lastLearnedPreference, dismissLearningToast } =
    usePreferencesStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (showLearningToast && lastLearnedPreference) {
      setIsVisible(true);
      setIsExiting(false);
    } else if (!showLearningToast && isVisible) {
      // Start exit animation
      setIsExiting(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showLearningToast, lastLearnedPreference, isVisible]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      dismissLearningToast();
    }, 300);
  };

  if (!isVisible || !lastLearnedPreference) return null;

  const message = getPreferenceMessage(
    lastLearnedPreference.key,
    lastLearnedPreference.value
  );

  return (
    <div
      className={cn(
        'fixed bottom-20 right-6 z-50 transition-all duration-300',
        isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      )}
    >
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-3 max-w-xs flex items-start gap-3">
        <div className="shrink-0">
          <CheckCircle className="w-5 h-5 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200">{message}</p>
          <p className="text-xs text-gray-500 mt-1">
            Learned from your feedback
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FeedbackToast;

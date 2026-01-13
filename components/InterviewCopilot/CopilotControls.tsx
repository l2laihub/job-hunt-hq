/**
 * Copilot Controls Component
 * Session control buttons (pause, stop, settings)
 */

import React from 'react';
import { SpeechServiceStatus } from '../../services/speechService';
import {
  Pause,
  Play,
  Square,
  Settings,
  Loader2,
  Mic,
  MicOff,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface CopilotControlsProps {
  status: SpeechServiceStatus;
  isProcessing: boolean;
  onPause: () => void;
  onStop: () => void;
  onSettings: () => void;
}

export const CopilotControls: React.FC<CopilotControlsProps> = ({
  status,
  isProcessing,
  onPause,
  onStop,
  onSettings,
}) => {
  const isListening = status === 'listening';
  const isPaused = status === 'paused';

  return (
    <div className="flex items-center gap-3">
      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/30 rounded-full border border-purple-800/50">
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          <span className="text-xs text-purple-400">Analyzing...</span>
        </div>
      )}

      {/* Mic status indicator */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors",
        isListening ? "bg-green-900/30 border-green-800/50" :
        isPaused ? "bg-yellow-900/30 border-yellow-800/50" :
        "bg-gray-800/30 border-gray-700/50"
      )}>
        {isListening ? (
          <Mic className="w-4 h-4 text-green-400" />
        ) : (
          <MicOff className="w-4 h-4 text-gray-400" />
        )}
        <span className={cn(
          "text-xs",
          isListening ? "text-green-400" :
          isPaused ? "text-yellow-400" :
          "text-gray-400"
        )}>
          {isListening ? "Listening" : isPaused ? "Paused" : "Off"}
        </span>
      </div>

      {/* Pause/Resume button */}
      <button
        onClick={onPause}
        className={cn(
          "p-2.5 rounded-lg border transition-all",
          isListening
            ? "bg-yellow-900/30 border-yellow-800/50 text-yellow-400 hover:bg-yellow-900/50"
            : "bg-green-900/30 border-green-800/50 text-green-400 hover:bg-green-900/50"
        )}
        title={isListening ? "Pause listening" : "Resume listening"}
      >
        {isListening ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5" />
        )}
      </button>

      {/* Stop button */}
      <button
        onClick={onStop}
        className="p-2.5 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 hover:bg-red-900/50 transition-all"
        title="End session"
      >
        <Square className="w-5 h-5" />
      </button>

      {/* Settings button */}
      <button
        onClick={onSettings}
        className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
        title="Settings"
      >
        <Settings className="w-5 h-5" />
      </button>
    </div>
  );
};

export default CopilotControls;

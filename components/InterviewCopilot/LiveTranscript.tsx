/**
 * Live Transcript Component
 * Shows real-time speech-to-text transcription with visual feedback
 */

import React, { useEffect, useState } from 'react';
import { CopilotTranscriptEntry } from '../../types';
import { Mic, Volume2, VolumeX } from 'lucide-react';

interface LiveTranscriptProps {
  currentText: string;
  recentEntries: CopilotTranscriptEntry[];
  accumulatedBuffer?: string;
  isListening?: boolean;
}

export const LiveTranscript: React.FC<LiveTranscriptProps> = ({
  currentText,
  recentEntries,
  accumulatedBuffer = '',
  isListening = true,
}) => {
  // Audio visualization state
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasAudioPermission, setHasAudioPermission] = useState(true);

  // Simulate audio level based on incoming text (real audio level would require AudioContext)
  useEffect(() => {
    if (currentText) {
      // When there's interim text, show activity
      setAudioLevel(Math.min(100, 30 + Math.random() * 70));
    } else if (isListening) {
      // When listening but no text, show low level with occasional bumps
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 20);
      }, 200);
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [currentText, isListening]);

  // Check for audio permission
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(() => setHasAudioPermission(true))
      .catch(() => setHasAudioPermission(false));
  }, []);

  // Combine all text for display
  const hasContent = currentText || recentEntries.length > 0 || accumulatedBuffer;

  return (
    <div className="h-full flex flex-col">
      {/* Header with audio level indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isListening ? (
            <div className="relative">
              <Mic className="w-4 h-4 text-green-400" />
              {/* Pulsing ring animation when listening */}
              <div className="absolute inset-0 animate-ping">
                <Mic className="w-4 h-4 text-green-400 opacity-30" />
              </div>
            </div>
          ) : (
            <VolumeX className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-xs text-gray-500 uppercase tracking-wider">Live Transcript</span>
        </div>

        {/* Audio level bars */}
        {isListening && (
          <div className="flex items-end gap-0.5 h-4">
            {[0, 1, 2, 3, 4].map((i) => {
              const threshold = i * 20;
              const isActive = audioLevel > threshold;
              const height = 4 + i * 3; // 4px, 7px, 10px, 13px, 16px
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-100 ${
                    isActive
                      ? i < 3 ? 'bg-green-500' : i < 4 ? 'bg-yellow-500' : 'bg-red-500'
                      : 'bg-gray-700'
                  }`}
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Transcript content */}
      <div className="flex-1 overflow-hidden relative">
        {!hasAudioPermission ? (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <VolumeX className="w-4 h-4" />
            <span>Microphone access denied. Please allow microphone access to use the Copilot.</span>
          </div>
        ) : (
          <div className="text-sm overflow-hidden">
            {/* Recent finalized entries */}
            {recentEntries.slice(-3).map((entry) => (
              <span key={entry.id} className="text-gray-400 mr-2">
                {entry.text}
              </span>
            ))}

            {/* Accumulated buffer (text being processed) */}
            {accumulatedBuffer && (
              <span className="text-gray-300 mr-2 bg-gray-800/50 px-1 rounded">
                {accumulatedBuffer}
              </span>
            )}

            {/* Current interim text with typing animation */}
            {currentText && (
              <span className="text-white">
                {currentText}
                <span className="inline-block w-0.5 h-4 bg-purple-400 animate-pulse ml-0.5 align-middle" />
              </span>
            )}

            {/* Listening indicator when no text */}
            {!hasContent && isListening && (
              <div className="flex items-center gap-3 text-gray-500">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span className="italic">Listening for speech...</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            )}

            {/* Not listening */}
            {!isListening && !hasContent && (
              <span className="text-gray-600 italic">
                Paused - Click resume to continue listening
              </span>
            )}
          </div>
        )}

        {/* Activity indicator overlay */}
        {isListening && audioLevel > 30 && (
          <div className="absolute top-0 right-0 flex items-center gap-1.5 text-xs text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Hearing audio</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTranscript;

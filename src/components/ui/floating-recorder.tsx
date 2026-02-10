import React, { useEffect, useState } from 'react';
import { Loader2, Pause, Play, Square, Trash2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useRecordingStore } from '@/src/stores/recording';

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const FloatingRecorder: React.FC = () => {
  const status = useRecordingStore((s) => s.status);
  const duration = useRecordingStore((s) => s.duration);
  const volumeLevel = useRecordingStore((s) => s.volumeLevel);
  const context = useRecordingStore((s) => s.context);
  const pauseRecording = useRecordingStore((s) => s.pauseRecording);
  const resumeRecording = useRecordingStore((s) => s.resumeRecording);
  const stopRecording = useRecordingStore((s) => s.stopRecording);
  const discardRecording = useRecordingStore((s) => s.discardRecording);

  const [minimized, setMinimized] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // beforeunload warning when recording is active
  useEffect(() => {
    if (status === 'recording' || status === 'paused') {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [status]);

  // Don't render when idle
  if (status === 'idle' || status === 'stopped') return null;

  const handleDiscard = () => {
    if (confirmDiscard) {
      discardRecording();
      setConfirmDiscard(false);
    } else {
      setConfirmDiscard(true);
      setTimeout(() => setConfirmDiscard(false), 3000);
    }
  };

  // Saving state — show a compact indicator
  if (status === 'saving') {
    return (
      <div className="fixed bottom-20 right-4 z-[60] flex items-center gap-2 px-4 py-2.5 bg-gray-900/95 backdrop-blur-sm border border-blue-700/60 rounded-full shadow-lg shadow-black/30">
        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
        <span className="text-xs text-blue-300 font-medium">Saving recording...</span>
      </div>
    );
  }

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-20 right-4 z-[60] flex items-center gap-2 px-3 py-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-full shadow-lg hover:border-gray-600 transition-colors"
      >
        <span className={`w-2.5 h-2.5 rounded-full ${status === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
        <span className="text-xs text-gray-200 font-mono">{formatDuration(duration)}</span>
        <ChevronUp className="w-3 h-3 text-gray-400" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-[60] w-72 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl shadow-black/40">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${status === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
          <span className="text-xs font-medium text-gray-300">
            {status === 'recording' ? 'Recording' : 'Paused'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-gray-500" />
          <span className="text-sm font-mono text-white">{formatDuration(duration)}</span>
          <button
            onClick={() => setMinimized(true)}
            className="ml-1 p-1 text-gray-500 hover:text-gray-300 rounded transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Volume Meter */}
      {status === 'recording' && (
        <div className="px-3 pt-2">
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
              style={{ width: `${Math.min(100, volumeLevel * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Context Label */}
      {context && (
        <div className="px-3 py-1.5 text-xs text-gray-400 truncate">
          {context.applicationName}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 px-3 py-2.5">
        {status === 'recording' && (
          <button
            onClick={pauseRecording}
            className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded-full text-white transition-colors"
            title="Pause"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}

        {status === 'paused' && (
          <button
            onClick={resumeRecording}
            className="p-2 bg-green-600 hover:bg-green-700 rounded-full text-white transition-colors"
            title="Resume"
          >
            <Play className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={async () => { await stopRecording(); }}
          className="p-2 bg-gray-600 hover:bg-gray-700 rounded-full text-white transition-colors"
          title="Stop & save recording"
        >
          <Square className="w-4 h-4" />
        </button>

        <button
          onClick={handleDiscard}
          className={`p-2 rounded-full text-white transition-colors ${
            confirmDiscard
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-red-600/40 hover:bg-red-600'
          }`}
          title={confirmDiscard ? 'Click again to confirm discard' : 'Discard recording'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {confirmDiscard && (
        <p className="text-center text-xs text-red-400 pb-2">Click again to discard</p>
      )}
    </div>
  );
};

export default FloatingRecorder;

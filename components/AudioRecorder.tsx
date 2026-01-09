import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Pause, Play, Square, Trash2, Clock, Volume2 } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  disabled?: boolean;
  maxDurationMinutes?: number;
  className?: string;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  disabled = false,
  maxDurationMinutes = 120, // 2 hours max
  className = '',
}) => {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Auto-stop at max duration
  useEffect(() => {
    if (duration >= maxDurationMinutes * 60 && state === 'recording') {
      stopRecording();
    }
  }, [duration, maxDurationMinutes, state]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
    }
    if (recordedBlobUrl) {
      URL.revokeObjectURL(recordedBlobUrl);
    }
    mediaRecorderRef.current = null;
    analyserRef.current = null;
  }, [recordedBlobUrl]);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;

    timerRef.current = setInterval(() => {
      if (state === 'recording') {
        const elapsed = (Date.now() - startTimeRef.current) / 1000 + pausedDurationRef.current;
        setDuration(Math.floor(elapsed));
      }
    }, 1000);
  }, [state]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const updateVolume = useCallback(() => {
    if (!analyserRef.current || state !== 'recording') {
      setVolumeLevel(0);
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    setVolumeLevel(average / 255); // Normalize to 0-1

    animationFrameRef.current = requestAnimationFrame(updateVolume);
  }, [state]);

  const startRecording = async () => {
    try {
      setError(null);
      chunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });
      streamRef.current = stream;

      // Setup audio analysis for volume visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Create MediaRecorder with best available codec
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const finalDuration = duration;

        // Create blob URL for playback preview
        const blobUrl = URL.createObjectURL(blob);
        setRecordedBlobUrl(blobUrl);

        onRecordingComplete(blob, finalDuration);
        onRecordingStop?.();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      setState('recording');
      startTimer();
      updateVolume();
      onRecordingStart?.();
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Could not access microphone. Please check permissions.');
      setState('idle');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
      pausedDurationRef.current = duration;
      stopTimer();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setState('paused');
      setVolumeLevel(0);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now();
      setState('recording');
      startTimer();
      updateVolume();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (state === 'recording' || state === 'paused')) {
      mediaRecorderRef.current.stop();
      stopTimer();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setState('stopped');
      setVolumeLevel(0);

      // Cleanup stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const discardRecording = () => {
    stopTimer();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
    }
    if (recordedBlobUrl) {
      URL.revokeObjectURL(recordedBlobUrl);
      setRecordedBlobUrl(null);
    }
    cleanup();
    chunksRef.current = [];
    setDuration(0);
    setState('idle');
    setVolumeLevel(0);
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (!recordedBlobUrl) return;

    if (isPlaying && playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!playbackAudioRef.current) {
        playbackAudioRef.current = new Audio(recordedBlobUrl);
        playbackAudioRef.current.onended = () => setIsPlaying(false);
      }
      playbackAudioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVolumeBarWidth = () => {
    return Math.min(100, volumeLevel * 100);
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      {/* Error Message */}
      {error && (
        <div className="mb-3 p-2 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Recording Status & Timer */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {state === 'recording' && (
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
          {state === 'paused' && (
            <span className="w-3 h-3 bg-yellow-500 rounded-full" />
          )}
          {state === 'idle' && (
            <span className="w-3 h-3 bg-gray-500 rounded-full" />
          )}
          <span className="text-sm text-gray-300">
            {state === 'idle' && 'Ready to record'}
            {state === 'recording' && 'Recording...'}
            {state === 'paused' && 'Paused'}
            {state === 'stopped' && 'Recording complete'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="font-mono text-lg">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Volume Meter */}
      {(state === 'recording' || state === 'paused') && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Volume Level</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
              style={{ width: `${getVolumeBarWidth()}%` }}
            />
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3">
        {state === 'idle' && (
          <button
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full text-white font-medium transition-colors"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </button>
        )}

        {state === 'recording' && (
          <>
            <button
              onClick={pauseRecording}
              className="p-3 bg-yellow-600 hover:bg-yellow-700 rounded-full text-white transition-colors"
              title="Pause"
            >
              <Pause className="w-5 h-5" />
            </button>
            <button
              onClick={stopRecording}
              className="p-3 bg-gray-600 hover:bg-gray-700 rounded-full text-white transition-colors"
              title="Stop"
            >
              <Square className="w-5 h-5" />
            </button>
          </>
        )}

        {state === 'paused' && (
          <>
            <button
              onClick={resumeRecording}
              className="p-3 bg-green-600 hover:bg-green-700 rounded-full text-white transition-colors"
              title="Resume"
            >
              <Play className="w-5 h-5" />
            </button>
            <button
              onClick={stopRecording}
              className="p-3 bg-gray-600 hover:bg-gray-700 rounded-full text-white transition-colors"
              title="Stop"
            >
              <Square className="w-5 h-5" />
            </button>
            <button
              onClick={discardRecording}
              className="p-3 bg-red-600/50 hover:bg-red-600 rounded-full text-white transition-colors"
              title="Discard"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </>
        )}

        {state === 'stopped' && (
          <>
            {/* Playback controls */}
            <button
              onClick={togglePlayback}
              className="p-3 bg-green-600 hover:bg-green-700 rounded-full text-white transition-colors"
              title={isPlaying ? 'Pause' : 'Play Recording'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            {/* Discard */}
            <button
              onClick={discardRecording}
              className="p-3 bg-red-600/50 hover:bg-red-600 rounded-full text-white transition-colors"
              title="Discard Recording"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            {/* Record Another */}
            <button
              onClick={() => {
                if (playbackAudioRef.current) {
                  playbackAudioRef.current.pause();
                  playbackAudioRef.current = null;
                }
                if (recordedBlobUrl) {
                  URL.revokeObjectURL(recordedBlobUrl);
                  setRecordedBlobUrl(null);
                }
                setDuration(0);
                setState('idle');
                setIsPlaying(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white font-medium transition-colors"
            >
              <Mic className="w-4 h-4" />
              Re-record
            </button>
          </>
        )}
      </div>

      {/* Max Duration Warning */}
      {duration >= (maxDurationMinutes * 60 - 300) && state === 'recording' && (
        <p className="mt-3 text-center text-yellow-400 text-sm">
          Recording will auto-stop in {formatDuration(maxDurationMinutes * 60 - duration)}
        </p>
      )}
    </div>
  );
};

export default AudioRecorder;

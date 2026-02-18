import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  InterviewNote,
  InterviewStage,
  INTERVIEW_STAGE_LABELS,
  INTERVIEW_OUTCOME_CONFIG,
  createInterviewNote,
  UserProfile,
  Experience,
  JobApplication,
} from '../src/types';
import { interviewNotesService } from '../src/services/database/interview-notes';
import {
  getRecordingUrl,
  downloadRecording,
  deleteInterviewRecording,
} from '../src/services/storage/interview-recordings';
import { analyzeInterviewContent, processInterviewRecording } from '../services/geminiService';
import { useRecordingStore } from '../src/stores/recording';
import {
  Plus,
  Mic,
  FileText,
  Calendar,
  User,
  Clock,
  Download,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
  Play,
  Pause,
  Square,
  Sparkles,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit3,
  Save,
  X,
  Volume2,
  SkipBack,
  SkipForward,
} from 'lucide-react';

interface InterviewNotesTabProps {
  application: JobApplication;
  userId: string;
  profile: UserProfile;
  stories?: Experience[];
  onNotesCountChange?: (count: number) => void;
}

export const InterviewNotesTab: React.FC<InterviewNotesTabProps> = ({
  application,
  userId,
  profile,
  stories = [],
  onNotesCountChange,
}) => {
  const [notes, setNotes] = useState<InterviewNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [processingNoteId, setProcessingNoteId] = useState<string | null>(null);
  const [activeAudioNoteId, setActiveAudioNoteId] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [downloadingNoteId, setDownloadingNoteId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekBarRef = useRef<HTMLInputElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // New note form state
  const [newNote, setNewNote] = useState({
    stage: 'phone_screen' as InterviewStage,
    interviewerName: '',
    interviewerRole: '',
    interviewDate: new Date().toISOString().split('T')[0],
    rawNotes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Recording store
  const recordingStatus = useRecordingStore((s) => s.status);
  const recordingDuration = useRecordingStore((s) => s.duration);
  const recordingVolume = useRecordingStore((s) => s.volumeLevel);
  const recordingContext = useRecordingStore((s) => s.context);
  const recordingError = useRecordingStore((s) => s.error);
  const startRecording = useRecordingStore((s) => s.startRecording);
  const pauseRecording = useRecordingStore((s) => s.pauseRecording);
  const resumeRecording = useRecordingStore((s) => s.resumeRecording);
  const stopRecording = useRecordingStore((s) => s.stopRecording);
  const discardRecording = useRecordingStore((s) => s.discardRecording);

  // Is this application the one currently recording?
  const isRecordingForThisApp = recordingContext?.applicationId === application.id;
  const isRecordingActive = recordingStatus === 'recording' || recordingStatus === 'paused' || recordingStatus === 'saving';
  const isRecordingForOtherApp = recordingContext !== null && !isRecordingForThisApp && isRecordingActive;

  // Reload notes when a recording finishes saving (status goes from saving → idle)
  const prevStatusRef = React.useRef(recordingStatus);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = recordingStatus;
    if (prev === 'saving' && recordingStatus === 'idle') {
      loadNotes();
    }
  }, [recordingStatus]);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, [application.id]);

  // Sync time from audio element via requestAnimationFrame for smooth updates
  const startTimeSync = useCallback(() => {
    const tick = () => {
      const audio = audioRef.current;
      if (audio) {
        setAudioCurrentTime(audio.currentTime);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTimeSync = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopTimeSync();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [stopTimeSync]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await interviewNotesService.listByApplication(application.id);
      setNotes(data);
      onNotesCountChange?.(data.length);
    } catch (err) {
      console.error('Failed to load interview notes:', err);
      setError('Failed to load interview notes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Create the note data
      const noteData = createInterviewNote(application.id, newNote.stage);
      noteData.interviewerName = newNote.interviewerName || undefined;
      noteData.interviewerRole = newNote.interviewerRole || undefined;
      noteData.interviewDate = new Date(newNote.interviewDate).toISOString();
      noteData.rawNotes = newNote.rawNotes;

      // Create the note
      await interviewNotesService.create(noteData);

      // Reset form
      setNewNote({
        stage: 'phone_screen',
        interviewerName: '',
        interviewerRole: '',
        interviewDate: new Date().toISOString().split('T')[0],
        rawNotes: '',
      });
      setShowNewNoteForm(false);

      // Reload notes
      await loadNotes();
    } catch (err) {
      console.error('Failed to create note:', err);
      setError('Failed to save interview note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this interview note?')) return;

    try {
      const note = notes.find(n => n.id === noteId);

      // Delete audio if exists
      if (note?.audioRecording?.path) {
        await deleteInterviewRecording(note.audioRecording.path);
      }

      await interviewNotesService.delete(noteId);
      await loadNotes();
    } catch (err) {
      console.error('Failed to delete note:', err);
      setError('Failed to delete interview note');
    }
  };

  const handleAnalyzeNote = async (note: InterviewNote) => {
    try {
      setProcessingNoteId(note.id);
      await interviewNotesService.updateProcessingStatus(note.id, 'analyzing');

      let analysisResult;

      if (note.audioRecording?.path) {
        // Process audio recording
        await interviewNotesService.updateProcessingStatus(note.id, 'transcribing');

        // Get audio blob
        const audioUrl = await getRecordingUrl(note.audioRecording.path);
        const response = await fetch(audioUrl);
        const audioBlob = await response.blob();

        // Convert to base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(audioBlob);
        });

        await interviewNotesService.updateProcessingStatus(note.id, 'analyzing');

        analysisResult = await processInterviewRecording(
          base64,
          note.audioRecording.mimeType,
          {
            stage: INTERVIEW_STAGE_LABELS[note.stage],
            company: application.company,
            role: application.role,
            jdAnalysis: application.analysis,
            companyResearch: application.companyResearch,
            profile,
            stories,
          }
        );

        // Update with transcript
        await interviewNotesService.setAnalysisResults(note.id, {
          transcript: analysisResult.transcript,
          summary: analysisResult.summary,
          keyTakeaways: analysisResult.keyTakeaways,
          questionsAsked: analysisResult.questionsAsked,
          nextStepPrep: analysisResult.nextStepPrep,
        });
      } else if (note.rawNotes) {
        // Analyze text notes
        analysisResult = await analyzeInterviewContent(
          note.rawNotes,
          {
            stage: INTERVIEW_STAGE_LABELS[note.stage],
            company: application.company,
            role: application.role,
            jdAnalysis: application.analysis,
            companyResearch: application.companyResearch,
            profile,
            stories,
          }
        );

        await interviewNotesService.setAnalysisResults(note.id, {
          summary: analysisResult.summary,
          keyTakeaways: analysisResult.keyTakeaways,
          questionsAsked: analysisResult.questionsAsked,
          nextStepPrep: analysisResult.nextStepPrep,
        });
      }

      await loadNotes();
    } catch (err) {
      console.error('Failed to analyze note:', err);
      await interviewNotesService.updateProcessingStatus(note.id, 'failed', String(err));
      const isJsonError = err instanceof SyntaxError || (err instanceof Error && err.message.includes('JSON parse failed'));
      setError(
        isJsonError
          ? 'The interview was too long to fully analyze. Try recording shorter segments.'
          : 'Failed to analyze interview'
      );
      await loadNotes();
    } finally {
      setProcessingNoteId(null);
    }
  };

  const cleanupAudio = useCallback(() => {
    stopTimeSync();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setActiveAudioNoteId(null);
    setIsAudioPlaying(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setAudioLoading(false);
  }, [stopTimeSync]);

  const handleLoadAudio = async (note: InterviewNote) => {
    if (!note.audioRecording?.path) return;

    try {
      // If this note's player is already active, just toggle play/pause
      if (activeAudioNoteId === note.id && audioRef.current) {
        if (isAudioPlaying) {
          audioRef.current.pause();
          stopTimeSync();
          setIsAudioPlaying(false);
        } else {
          await audioRef.current.play();
          startTimeSync();
          setIsAudioPlaying(true);
        }
        return;
      }

      // Stop any currently playing audio
      cleanupAudio();
      setAudioLoading(true);
      setActiveAudioNoteId(note.id);

      const url = await getRecordingUrl(note.audioRecording.path);
      const audio = new Audio(url);
      audio.playbackRate = playbackRate;

      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration);
        setAudioLoading(false);
      });

      audio.addEventListener('ended', () => {
        stopTimeSync();
        setIsAudioPlaying(false);
        setAudioCurrentTime(audio.duration);
      });

      audio.addEventListener('error', () => {
        cleanupAudio();
        setError('Failed to play recording');
      });

      audioRef.current = audio;
      await audio.play();
      startTimeSync();
      setIsAudioPlaying(true);
    } catch (err) {
      console.error('Failed to play audio:', err);
      cleanupAudio();
      setError('Failed to play recording');
    }
  };

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioCurrentTime(time);
    }
  }, []);

  const handleSkip = useCallback((seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(audioRef.current.duration, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = newTime;
      setAudioCurrentTime(newTime);
    }
  }, []);

  const handlePlaybackRateChange = useCallback(() => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIdx = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIdx + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }, [playbackRate]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownloadAudio = async (note: InterviewNote) => {
    if (!note.audioRecording?.path) return;

    try {
      setDownloadingNoteId(note.id);
      const blob = await downloadRecording(note.audioRecording.path);

      const ext = note.audioRecording.mimeType.split(';')[0].split('/')[1] || 'webm';
      const stageLabel = INTERVIEW_STAGE_LABELS[note.stage].replace(/\s+/g, '_');
      const date = new Date(note.interviewDate).toISOString().split('T')[0];
      const filename = `${stageLabel}_${date}.${ext}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download audio:', err);
      setError('Failed to download recording');
    } finally {
      setDownloadingNoteId(null);
    }
  };

  const handleUpdateOutcome = async (noteId: string, outcome: InterviewNote['outcome']) => {
    try {
      await interviewNotesService.updateOutcome(noteId, outcome);
      await loadNotes();
    } catch (err) {
      console.error('Failed to update outcome:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatRecordingTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Interview Notes</h3>
        <button
          onClick={() => setShowNewNoteForm(!showNewNoteForm)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Note
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* New Note Form */}
      {showNewNoteForm && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-4 border border-gray-700">
          <h4 className="font-medium text-white">New Interview Note</h4>

          <div className="grid grid-cols-2 gap-4">
            {/* Stage */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Interview Stage</label>
              <select
                value={newNote.stage}
                onChange={(e) => setNewNote({ ...newNote, stage: e.target.value as InterviewStage })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                {Object.entries(INTERVIEW_STAGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date</label>
              <input
                type="date"
                value={newNote.interviewDate}
                onChange={(e) => setNewNote({ ...newNote, interviewDate: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>

            {/* Interviewer Name */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Interviewer Name (optional)</label>
              <input
                type="text"
                value={newNote.interviewerName}
                onChange={(e) => setNewNote({ ...newNote, interviewerName: e.target.value })}
                placeholder="e.g., John Smith"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500"
              />
            </div>

            {/* Interviewer Role */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Interviewer Role (optional)</label>
              <input
                type="text"
                value={newNote.interviewerRole}
                onChange={(e) => setNewNote({ ...newNote, interviewerRole: e.target.value })}
                placeholder="e.g., Engineering Manager"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
            <textarea
              value={newNote.rawNotes}
              onChange={(e) => setNewNote({ ...newNote, rawNotes: e.target.value })}
              placeholder="Type your interview notes here... You can also record audio below."
              rows={4}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 resize-none"
            />
          </div>

          {/* Audio Recorder */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              <Mic className="w-4 h-4 inline mr-1" />
              Record Interview Audio
            </label>

            {/* Recording error */}
            {recordingError && isRecordingForThisApp && (
              <div className="mb-3 p-2 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
                {recordingError}
              </div>
            )}

            {/* Another app is recording */}
            {isRecordingForOtherApp && (
              <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg text-yellow-300 text-sm">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Recording in progress for <strong>{recordingContext?.applicationName}</strong>. Stop it first to start a new one.
              </div>
            )}

            {/* Idle state — start button */}
            {(recordingStatus === 'idle' || (!isRecordingForThisApp && !isRecordingForOtherApp)) && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <button
                  onClick={() => startRecording({
                    applicationId: application.id,
                    applicationName: `${application.company} - ${application.role}`,
                    userId,
                  })}
                  disabled={isRecordingForOtherApp}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full text-white font-medium transition-colors mx-auto"
                >
                  <Mic className="w-5 h-5" />
                  Start Recording
                </button>
              </div>
            )}

            {/* Active recording controls (this app) */}
            {isRecordingForThisApp && (recordingStatus === 'recording' || recordingStatus === 'paused') && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
                {/* Status & Timer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${recordingStatus === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <span className="text-sm text-gray-300">
                      {recordingStatus === 'recording' ? 'Recording...' : 'Paused'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono text-lg">{formatRecordingTime(recordingDuration)}</span>
                  </div>
                </div>

                {/* Volume Meter */}
                {recordingStatus === 'recording' && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Volume2 className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">Volume Level</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
                        style={{ width: `${Math.min(100, recordingVolume * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
                  {recordingStatus === 'recording' && (
                    <button
                      onClick={pauseRecording}
                      className="p-3 bg-yellow-600 hover:bg-yellow-700 rounded-full text-white transition-colors"
                      title="Pause"
                    >
                      <Pause className="w-5 h-5" />
                    </button>
                  )}
                  {recordingStatus === 'paused' && (
                    <button
                      onClick={resumeRecording}
                      className="p-3 bg-green-600 hover:bg-green-700 rounded-full text-white transition-colors"
                      title="Resume"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={async () => { await stopRecording(); }}
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
                </div>
              </div>
            )}

            {/* Saving indicator */}
            {isRecordingForThisApp && recordingStatus === 'saving' && (
              <div className="bg-gray-800 rounded-lg p-4 border border-blue-700/50">
                <div className="flex items-center gap-2 text-blue-300 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving recording...
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowNewNoteForm(false)}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateNote}
              disabled={isSaving || !newNote.rawNotes}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Note
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No interview notes yet</p>
          <p className="text-sm mt-1">Click "Add Note" to record your first interview</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
            >
              {/* Note Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-750"
                onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      note.outcome === 'passed' ? 'bg-green-500' :
                      note.outcome === 'rejected' ? 'bg-red-500' :
                      note.outcome === 'pending' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`}
                  />
                  <div>
                    <h4 className="font-medium text-white">
                      {INTERVIEW_STAGE_LABELS[note.stage]}
                    </h4>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(note.interviewDate)}
                      </span>
                      {note.interviewerName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {note.interviewerName}
                        </span>
                      )}
                      {note.audioRecording && (
                        <span className="flex items-center gap-1">
                          <Mic className="w-3 h-3" />
                          {formatDuration(note.audioRecording.durationSeconds)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Audio play toggle */}
                  {note.audioRecording && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadAudio(note);
                        }}
                        disabled={audioLoading && activeAudioNoteId === note.id}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                          activeAudioNoteId === note.id && isAudioPlaying
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        } disabled:opacity-50`}
                      >
                        {audioLoading && activeAudioNoteId === note.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : activeAudioNoteId === note.id && isAudioPlaying ? (
                          <>
                            <Pause className="w-3 h-3" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            Play
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadAudio(note);
                        }}
                        disabled={downloadingNoteId === note.id}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50"
                      >
                        {downloadingNoteId === note.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                      </button>
                    </>
                  )}

                  {/* Processing Status */}
                  {note.processingStatus === 'completed' && (
                    <span className="text-green-400 text-sm flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      Analyzed
                    </span>
                  )}
                  {processingNoteId === note.id && (
                    <span className="text-blue-400 text-sm flex items-center gap-1">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </span>
                  )}

                  {/* Quick Analyze button */}
                  {(note.rawNotes || note.audioRecording) && note.processingStatus !== 'completed' && processingNoteId !== note.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyzeNote(note);
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs text-white transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      Analyze
                    </button>
                  )}

                  {/* Expand/Collapse */}
                  {expandedNoteId === note.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Audio Player — visible when audio is active for this note */}
              {activeAudioNoteId === note.id && note.audioRecording && (
                <div
                  className="px-4 py-3 bg-gray-900/60 border-t border-gray-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Seek Bar */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-gray-400 font-mono w-10 text-right shrink-0">
                      {formatTime(audioCurrentTime)}
                    </span>
                    <input
                      ref={seekBarRef}
                      type="range"
                      min={0}
                      max={audioDuration || 0}
                      step={0.1}
                      value={audioCurrentTime}
                      onChange={handleSeek}
                      className="flex-1 h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(59,130,246,0.2)]
                        [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                      style={{
                        background: audioDuration
                          ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(audioCurrentTime / audioDuration) * 100}%, #374151 ${(audioCurrentTime / audioDuration) * 100}%, #374151 100%)`
                          : '#374151',
                      }}
                    />
                    <span className="text-xs text-gray-400 font-mono w-10 shrink-0">
                      {formatTime(audioDuration)}
                    </span>
                  </div>

                  {/* Controls Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {/* Playback speed */}
                      <button
                        onClick={handlePlaybackRateChange}
                        className="px-2 py-1 rounded text-xs font-mono text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                        title="Playback speed"
                      >
                        {playbackRate}x
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Skip back 10s */}
                      <button
                        onClick={() => handleSkip(-10)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        title="Back 10 seconds"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>

                      {/* Play/Pause */}
                      <button
                        onClick={() => handleLoadAudio(note)}
                        disabled={audioLoading}
                        className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-full text-white transition-colors"
                      >
                        {audioLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isAudioPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </button>

                      {/* Skip forward 10s */}
                      <button
                        onClick={() => handleSkip(10)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        title="Forward 10 seconds"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Close player */}
                      <button
                        onClick={cleanupAudio}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        title="Close player"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Expanded Content */}
              {expandedNoteId === note.id && (
                <div className="px-4 pb-4 border-t border-gray-700 space-y-4">
                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 pt-3">
                    {note.audioRecording && (
                      <>
                        <button
                          onClick={() => handleLoadAudio(note)}
                          disabled={audioLoading && activeAudioNoteId === note.id}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm text-white transition-colors ${
                            activeAudioNoteId === note.id && isAudioPlaying
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-gray-700 hover:bg-gray-600'
                          } disabled:opacity-50`}
                        >
                          {audioLoading && activeAudioNoteId === note.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : activeAudioNoteId === note.id && isAudioPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          {activeAudioNoteId === note.id && isAudioPlaying ? 'Pause' : 'Play'}
                        </button>
                        <button
                          onClick={() => handleDownloadAudio(note)}
                          disabled={downloadingNoteId === note.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-sm text-white"
                        >
                          {downloadingNoteId === note.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          Download
                        </button>
                      </>
                    )}

                    {(note.rawNotes || note.audioRecording) && note.processingStatus !== 'completed' && (
                      <button
                        onClick={() => handleAnalyzeNote(note)}
                        disabled={processingNoteId === note.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-sm text-white"
                      >
                        <Sparkles className="w-4 h-4" />
                        Analyze with AI
                      </button>
                    )}

                    {/* Outcome Selector */}
                    <select
                      value={note.outcome}
                      onChange={(e) => handleUpdateOutcome(note.id, e.target.value as InterviewNote['outcome'])}
                      className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                    >
                      {Object.entries(INTERVIEW_OUTCOME_CONFIG).map(([value, config]) => (
                        <option key={value} value={value}>
                          {config.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex-1" />

                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Raw Notes */}
                  {note.rawNotes && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-400 mb-2">Notes</h5>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap bg-gray-900 rounded p-3">
                        {note.rawNotes}
                      </p>
                    </div>
                  )}

                  {/* Transcript */}
                  {note.transcript && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-400 mb-2">Transcript</h5>
                      <p className="text-gray-300 text-sm whitespace-pre-wrap bg-gray-900 rounded p-3 max-h-64 overflow-y-auto">
                        {note.transcript}
                      </p>
                    </div>
                  )}

                  {/* AI Analysis */}
                  {note.processingStatus === 'completed' && (
                    <>
                      {/* Summary */}
                      {note.summary && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-400 mb-2">Summary</h5>
                          <p className="text-gray-300 text-sm">{note.summary}</p>
                        </div>
                      )}

                      {/* Key Takeaways */}
                      {note.keyTakeaways.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-400 mb-2">Key Takeaways</h5>
                          <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                            {note.keyTakeaways.map((takeaway, i) => (
                              <li key={i}>{takeaway}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Questions Asked */}
                      {note.questionsAsked.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-400 mb-2">Questions Asked</h5>
                          <div className="space-y-2">
                            {note.questionsAsked.map((q, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                {q.wasStrong ? (
                                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                )}
                                <div>
                                  <p className="text-gray-300">{q.question}</p>
                                  {q.yourResponse && (
                                    <p className="text-gray-500 text-xs mt-1">Your response: {q.yourResponse}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Next Step Prep */}
                      {note.nextStepPrep && (
                        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                          <h5 className="text-sm font-medium text-blue-300 mb-3">
                            Next Round Preparation
                          </h5>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {note.nextStepPrep.areasToReview.length > 0 && (
                              <div>
                                <h6 className="text-gray-400 mb-1">Areas to Review</h6>
                                <ul className="list-disc list-inside text-gray-300 space-y-0.5">
                                  {note.nextStepPrep.areasToReview.slice(0, 5).map((area, i) => (
                                    <li key={i}>{area}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {note.nextStepPrep.anticipatedQuestions.length > 0 && (
                              <div>
                                <h6 className="text-gray-400 mb-1">Anticipated Questions</h6>
                                <ul className="list-disc list-inside text-gray-300 space-y-0.5">
                                  {note.nextStepPrep.anticipatedQuestions.slice(0, 5).map((q, i) => (
                                    <li key={i}>{q}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {note.nextStepPrep.strengthsShown.length > 0 && (
                              <div>
                                <h6 className="text-gray-400 mb-1">Strengths Shown</h6>
                                <ul className="space-y-0.5">
                                  {note.nextStepPrep.strengthsShown.map((s, i) => (
                                    <li key={i} className="flex items-center gap-1 text-green-400">
                                      <CheckCircle className="w-3 h-3" />
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {note.nextStepPrep.areasToImprove.length > 0 && (
                              <div>
                                <h6 className="text-gray-400 mb-1">Areas to Improve</h6>
                                <ul className="space-y-0.5">
                                  {note.nextStepPrep.areasToImprove.map((a, i) => (
                                    <li key={i} className="flex items-center gap-1 text-yellow-400">
                                      <AlertCircle className="w-3 h-3" />
                                      {a}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {note.nextStepPrep.followUpActions.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-blue-800">
                              <h6 className="text-gray-400 mb-2">Action Items</h6>
                              <ul className="space-y-1">
                                {note.nextStepPrep.followUpActions.map((action, i) => (
                                  <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Processing Error */}
                  {note.processingStatus === 'failed' && note.processingError && (
                    <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
                      Analysis failed: {note.processingError}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InterviewNotesTab;

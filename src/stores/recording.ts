import { create } from 'zustand';
import { recordingService } from '@/src/services/recording-service';
import { interviewNotesService } from '@/src/services/database/interview-notes';
import { uploadInterviewRecording } from '@/src/services/storage/interview-recordings';
import { createInterviewNote } from '@/src/types';
import { toast } from './ui';

export interface RecordingContext {
  applicationId: string;
  applicationName: string; // "Company - Role" for display in the floating widget
  userId: string;
}

interface RecordingState {
  status: 'idle' | 'recording' | 'paused' | 'saving' | 'stopped';
  duration: number;
  volumeLevel: number;
  error: string | null;
  context: RecordingContext | null;

  // Actions
  startRecording: (context: RecordingContext) => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<void>;
  discardRecording: () => void;
}

export const useRecordingStore = create<RecordingState>((set, get) => {
  // Wire up the service's state callback to update the store
  recordingService.setStateCallback((update) => {
    // Filter out blob-related updates — we handle those in stopRecording
    const { recordedBlob, recordedDuration, ...rest } = update;
    if (Object.keys(rest).length > 0) {
      set((state) => ({ ...state, ...rest }));
    }
  });

  return {
    status: 'idle',
    duration: 0,
    volumeLevel: 0,
    error: null,
    context: null,

    startRecording: async (context) => {
      const { status } = get();
      if (status === 'recording' || status === 'paused') {
        return; // Already recording
      }
      set({ context, error: null });
      await recordingService.start();
    },

    pauseRecording: () => {
      recordingService.pause();
    },

    resumeRecording: () => {
      recordingService.resume();
    },

    stopRecording: async () => {
      const { context, duration } = get();
      set({ status: 'saving', volumeLevel: 0 });

      try {
        const blob = await recordingService.stop();

        if (!blob || !context) {
          set({ status: 'idle', context: null, duration: 0 });
          return;
        }

        // Auto-save: create interview note and upload recording
        const noteData = createInterviewNote(context.applicationId, 'phone_screen');
        noteData.interviewDate = new Date().toISOString();

        const createdNote = await interviewNotesService.create(noteData);

        const audioMetadata = await uploadInterviewRecording(
          context.userId,
          context.applicationId,
          blob,
          duration
        );

        await interviewNotesService.update(createdNote.id, {
          audioRecording: audioMetadata,
          processingStatus: 'uploaded',
          durationMinutes: Math.ceil(duration / 60),
        });

        toast.success(
          'Recording saved',
          `Interview note added for ${context.applicationName}`
        );

        // Reset to idle
        set({
          status: 'idle',
          duration: 0,
          volumeLevel: 0,
          error: null,
          context: null,
        });
      } catch (err) {
        console.error('Failed to save recording:', err);
        toast.error('Failed to save recording', String(err));
        set({ status: 'idle', duration: 0, context: null });
      }
    },

    discardRecording: () => {
      recordingService.discard();
      set({ status: 'idle', duration: 0, volumeLevel: 0, error: null, context: null });
    },
  };
});

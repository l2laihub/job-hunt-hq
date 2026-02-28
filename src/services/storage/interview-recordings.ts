/**
 * Interview Recordings Storage Service
 * Handles audio file uploads/downloads for interview recordings
 */
import { supabase } from '@/src/lib/supabase/client';
import type { AudioRecordingMetadata } from '@/src/types';

const BUCKET = 'interview-recordings';

// Supported audio types
const SUPPORTED_AUDIO_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for long interviews

/**
 * Generate a unique filename for upload
 */
function generateFilename(mimeType: string): string {
  // Extract base type (strip codec info like "audio/webm;codecs=opus" -> "webm")
  const baseType = mimeType.split(';')[0];
  const ext = baseType.split('/')[1] || 'webm';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

/**
 * Validate audio file before upload
 * Note: Browser MIME types may include codec info (e.g., "audio/webm;codecs=opus")
 * so we check if the type starts with any supported base type
 */
function validateAudioFile(file: Blob): { valid: boolean; error?: string } {
  const baseType = file.type.split(';')[0]; // Strip codec info
  if (!SUPPORTED_AUDIO_TYPES.includes(baseType)) {
    return {
      valid: false,
      error: `Unsupported audio type: ${file.type}. Supported: WebM, MP4, MPEG, OGG, WAV`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 50MB`,
    };
  }

  return { valid: true };
}

/**
 * Upload an audio recording to Supabase Storage
 */
export async function uploadInterviewRecording(
  userId: string,
  applicationId: string,
  audioBlob: Blob,
  durationSeconds: number
): Promise<AudioRecordingMetadata> {
  // Validate file
  const validation = validateAudioFile(audioBlob);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const filename = generateFilename(audioBlob.type);
  const filePath = `${userId}/${applicationId}/${filename}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, audioBlob, {
      cacheControl: '3600',
      upsert: false,
      contentType: audioBlob.type.split(';')[0],
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const metadata: AudioRecordingMetadata = {
    path: filePath,
    durationSeconds,
    sizeBytes: audioBlob.size,
    mimeType: audioBlob.type,
    uploadedAt: new Date().toISOString(),
  };

  return metadata;
}

/**
 * Get a signed URL for downloading/playing a recording
 * Signed URLs expire after 1 hour for security
 */
export async function getRecordingUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600); // 1 hour expiry

  if (error) {
    throw new Error(`Failed to get recording URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Download a recording as a Blob
 */
export async function downloadRecording(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(path);

  if (error) {
    throw new Error(`Download failed: ${error.message}`);
  }

  return data;
}

/**
 * Delete a recording from storage
 */
export async function deleteInterviewRecording(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Delete all recordings for an application
 */
export async function deleteAllRecordingsForApplication(
  userId: string,
  applicationId: string
): Promise<void> {
  const folderPath = `${userId}/${applicationId}`;

  // List all files in the folder
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(folderPath);

  if (listError) {
    throw new Error(`List failed: ${listError.message}`);
  }

  if (files && files.length > 0) {
    const filePaths = files.map(f => `${folderPath}/${f.name}`);
    const { error: deleteError } = await supabase.storage
      .from(BUCKET)
      .remove(filePaths);

    if (deleteError) {
      throw new Error(`Delete failed: ${deleteError.message}`);
    }
  }
}

/**
 * List all recordings for an application
 */
export async function listRecordingsForApplication(
  userId: string,
  applicationId: string
): Promise<{ name: string; size: number; createdAt: string }[]> {
  const folderPath = `${userId}/${applicationId}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(folderPath, {
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    throw new Error(`List failed: ${error.message}`);
  }

  return (data || []).map(file => ({
    name: file.name,
    size: file.metadata?.size || 0,
    createdAt: file.created_at,
  }));
}

/**
 * Check if storage bucket exists and is accessible
 */
export async function checkStorageHealth(): Promise<boolean> {
  try {
    // Try to list root - should succeed even if empty
    const { error } = await supabase.storage.from(BUCKET).list('', { limit: 1 });
    return !error;
  } catch {
    return false;
  }
}

// Export types
export type { AudioRecordingMetadata };

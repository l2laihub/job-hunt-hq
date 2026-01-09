/**
 * Storage Service - Main Export
 * Unified access to all storage services
 */

// Project Assets (screenshots, diagrams)
export {
  uploadProjectAsset,
  uploadMultipleAssets,
  deleteProjectAsset,
  listProjectAssets,
  getProjectDocumentation,
  saveProjectDocumentation,
  deleteProjectDocumentation,
  getAllProjectDocumentation,
} from './project-assets';

// Interview Recordings
export {
  uploadInterviewRecording,
  getRecordingUrl,
  downloadRecording,
  deleteInterviewRecording,
  deleteAllRecordingsForApplication,
  listRecordingsForApplication,
  checkStorageHealth,
} from './interview-recordings';

// Types
export type { MediaAsset, ProjectDocumentation } from './project-assets';
export type { AudioRecordingMetadata } from './interview-recordings';

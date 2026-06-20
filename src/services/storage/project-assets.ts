/**
 * Project Assets Storage Service
 * Handles file uploads/downloads for project documentation assets
 */
import { supabase } from '@/src/lib/supabase/client';
import { MediaAsset, DocumentFile, ProjectDocumentation, DEFAULT_PROJECT_DOCUMENTATION } from '@/src/types';

const BUCKET = 'project-assets';

// Supported image types
const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Generate a unique filename for upload
 */
function generateFilename(originalName: string): string {
  const ext = originalName.split('.').pop() || 'png';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

/**
 * Validate file before upload
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Supported: PNG, JPEG, GIF, WebP, SVG`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 10MB`,
    };
  }

  return { valid: true };
}

/**
 * Upload a single asset to Supabase Storage
 */
export async function uploadProjectAsset(
  userId: string,
  projectId: string,
  file: File,
  type: MediaAsset['type']
): Promise<MediaAsset> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const filename = generateFilename(file.name);
  const filePath = `${userId}/${projectId}/${filename}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  const asset: MediaAsset = {
    id: crypto.randomUUID(),
    type,
    url: urlData.publicUrl,
    filename: file.name,
    caption: '',
    annotations: [],
    uploadedAt: new Date().toISOString(),
  };

  return asset;
}

/**
 * Upload multiple assets
 */
export async function uploadMultipleAssets(
  userId: string,
  projectId: string,
  files: File[],
  type: MediaAsset['type']
): Promise<{ assets: MediaAsset[]; errors: string[] }> {
  const assets: MediaAsset[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const asset = await uploadProjectAsset(userId, projectId, file, type);
      assets.push(asset);
    } catch (err) {
      errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Upload failed'}`);
    }
  }

  return { assets, errors };
}

/**
 * Delete an asset from storage
 */
export async function deleteProjectAsset(
  userId: string,
  projectId: string,
  assetUrl: string
): Promise<void> {
  // Extract filename from URL
  const urlParts = assetUrl.split('/');
  const filename = urlParts[urlParts.length - 1];
  const filePath = `${userId}/${projectId}/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([filePath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Extract the stored object name (the generated filename) from a public asset URL.
 * URLs look like `.../project-assets/<userId>/<projectId>/<storedName>`.
 */
function storedObjectName(url: string): string {
  return url.split('?')[0].split('/').pop() || '';
}

/**
 * Copy the uploaded image assets of one project to another (same user), within
 * the storage bucket, and merge them into the target documentation.
 *
 * - Images (screenshots + architecture diagrams) are real storage objects, so
 *   the underlying files are copied to the target project's path and their URLs
 *   rewritten.
 * - Document files store their content inline in the documentation row, so they
 *   are carried over as plain data (no storage involved).
 *
 * Merge semantics: source assets are appended to the target's existing assets,
 * de-duplicated by stored object name (images) / filename (docs), so re-running
 * is idempotent and never clobbers assets unique to the target.
 *
 * Returns the merged documentation plus counts of what was copied. The caller is
 * responsible for persisting the result via saveProjectDocumentation().
 */
export async function copyProjectAssets(
  userId: string,
  sourceProjectId: string,
  targetProjectId: string,
  sourceDoc: ProjectDocumentation,
  targetDoc: ProjectDocumentation
): Promise<{ documentation: ProjectDocumentation; copiedImages: number; copiedFiles: number }> {
  const copyAsset = async (asset: MediaAsset): Promise<MediaAsset> => {
    const objectName = storedObjectName(asset.url);
    if (!objectName) return asset;

    const fromPath = `${userId}/${sourceProjectId}/${objectName}`;
    const toPath = `${userId}/${targetProjectId}/${objectName}`;

    const { error } = await supabase.storage.from(BUCKET).copy(fromPath, toPath);
    // Ignore "already exists" so re-running is safe; surface anything else.
    if (error && !/exist|duplicate/i.test(error.message)) {
      throw new Error(`Failed to copy ${asset.filename}: ${error.message}`);
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(toPath);
    return { ...asset, id: crypto.randomUUID(), url: urlData.publicUrl };
  };

  const copiedScreenshots = await Promise.all((sourceDoc.screenshots || []).map(copyAsset));
  const copiedDiagrams = await Promise.all((sourceDoc.architectureDiagrams || []).map(copyAsset));
  const copiedFiles: DocumentFile[] = (sourceDoc.documentFiles || []).map((f) => ({
    ...f,
    id: crypto.randomUUID(),
  }));

  const mergeAssets = (existing: MediaAsset[] = [], incoming: MediaAsset[] = []): MediaAsset[] => {
    const seen = new Set(existing.map((a) => storedObjectName(a.url)));
    return [
      ...existing,
      ...incoming.filter((a) => {
        const name = storedObjectName(a.url);
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      }),
    ];
  };

  const mergeFiles = (existing: DocumentFile[] = [], incoming: DocumentFile[] = []): DocumentFile[] => {
    const seen = new Set(existing.map((f) => f.filename));
    return [
      ...existing,
      ...incoming.filter((f) => {
        if (seen.has(f.filename)) return false;
        seen.add(f.filename);
        return true;
      }),
    ];
  };

  const screenshots = mergeAssets(targetDoc.screenshots, copiedScreenshots);
  const architectureDiagrams = mergeAssets(targetDoc.architectureDiagrams, copiedDiagrams);
  const documentFiles = mergeFiles(targetDoc.documentFiles, copiedFiles);

  const documentation: ProjectDocumentation = {
    ...targetDoc,
    screenshots,
    architectureDiagrams,
    documentFiles,
  };

  // Report only the assets actually added (post-dedupe).
  const addedImages =
    screenshots.length - (targetDoc.screenshots?.length || 0) +
    (architectureDiagrams.length - (targetDoc.architectureDiagrams?.length || 0));
  const addedFiles = documentFiles.length - (targetDoc.documentFiles?.length || 0);

  return { documentation, copiedImages: addedImages, copiedFiles: addedFiles };
}

/**
 * List all assets for a project
 */
export async function listProjectAssets(
  userId: string,
  projectId: string
): Promise<{ name: string }[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(`${userId}/${projectId}`, {
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    throw new Error(`List failed: ${error.message}`);
  }

  // Return just the file objects with name property
  return (data || []).map(file => ({ name: file.name }));
}

// ============================================
// PROJECT DOCUMENTATION CRUD
// ============================================

// Type for project_documentation table row (not yet in generated types)
interface ProjectDocumentationRow {
  id?: string;
  user_id: string;
  profile_id?: string;
  project_id: string;
  project_name: string;
  documentation: ProjectDocumentation;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get project documentation from database
 */
export async function getProjectDocumentation(
  userId: string,
  projectId: string
): Promise<ProjectDocumentation | null> {
  // Use any type to bypass strict typing until migration is run
  const { data, error } = await (supabase as any)
    .from('project_documentation')
    .select('documentation')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get documentation: ${error.message}`);
  }

  return data?.documentation as ProjectDocumentation || null;
}

/**
 * Save project documentation to database
 */
export async function saveProjectDocumentation(
  userId: string,
  projectId: string,
  projectName: string,
  documentation: ProjectDocumentation,
  profileId?: string
): Promise<void> {
  const row: Partial<ProjectDocumentationRow> = {
    user_id: userId,
    project_id: projectId,
    project_name: projectName,
    documentation,
    updated_at: new Date().toISOString(),
  };

  if (profileId) {
    row.profile_id = profileId;
  }

  // Use any type to bypass strict typing until migration is run
  const { error } = await (supabase as any)
    .from('project_documentation')
    .upsert(row, { onConflict: 'user_id,project_id' });

  if (error) {
    throw new Error(`Failed to save documentation: ${error.message}`);
  }
}

/**
 * Delete project documentation
 */
export async function deleteProjectDocumentation(
  userId: string,
  projectId: string
): Promise<void> {
  // First, delete all assets from storage
  try {
    const assets = await listProjectAssets(userId, projectId);
    if (assets.length > 0) {
      const filePaths = assets.map(a => `${userId}/${projectId}/${a.name}`);
      await supabase.storage.from(BUCKET).remove(filePaths);
    }
  } catch {
    // Continue even if asset deletion fails
  }

  // Delete documentation record
  // Use any type to bypass strict typing until migration is run
  const { error } = await (supabase as any)
    .from('project_documentation')
    .delete()
    .eq('user_id', userId)
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to delete documentation: ${error.message}`);
  }
}

/**
 * Get all project documentation for a user
 */
export async function getAllProjectDocumentation(
  userId: string
): Promise<{ projectId: string; projectName: string; documentation: ProjectDocumentation }[]> {
  // Use any type to bypass strict typing until migration is run
  const { data, error } = await (supabase as any)
    .from('project_documentation')
    .select('project_id, project_name, documentation')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to get all documentation: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    projectId: row.project_id as string,
    projectName: row.project_name as string,
    documentation: (row.documentation as ProjectDocumentation) || DEFAULT_PROJECT_DOCUMENTATION,
  }));
}

// Export types for convenience
export type { MediaAsset, ProjectDocumentation };

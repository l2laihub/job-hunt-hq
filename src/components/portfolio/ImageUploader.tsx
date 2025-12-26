/**
 * ImageUploader Component
 * Drag-and-drop image upload with preview
 */
import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { MediaAsset } from '@/src/types';

interface ImageUploaderProps {
  onUpload: (files: File[]) => Promise<{ assets: MediaAsset[]; errors: string[] }>;
  maxFiles?: number;
  accept?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  hint?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUpload,
  maxFiles = 10,
  accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml',
  className,
  disabled = false,
  label = 'Upload Images',
  hint = 'Drag & drop images or click to browse (PNG, JPEG, GIF, WebP, SVG)',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback(async (files: File[]) => {
    if (disabled || files.length === 0) return;

    // Filter to only images
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      setErrors(['No valid image files selected']);
      return;
    }

    // Limit number of files
    const filesToUpload = imageFiles.slice(0, maxFiles);

    setPendingFiles(filesToUpload);
    setIsUploading(true);
    setErrors([]);

    try {
      const result = await onUpload(filesToUpload);
      if (result.errors.length > 0) {
        setErrors(result.errors);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Upload failed']);
    } finally {
      setIsUploading(false);
      setPendingFiles([]);
    }
  }, [disabled, maxFiles, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [disabled, processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || disabled) return;
    const files = Array.from(e.target.files);
    processFiles(files);
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [disabled, processFiles]);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer',
          isDragging && !disabled
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-700 hover:border-gray-600 bg-gray-900/50',
          disabled && 'opacity-50 cursor-not-allowed',
          isUploading && 'pointer-events-none'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />

        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            'p-3 rounded-full transition-colors',
            isDragging ? 'bg-blue-500/20' : 'bg-gray-800'
          )}>
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            ) : (
              <Upload className={cn(
                'w-6 h-6',
                isDragging ? 'text-blue-400' : 'text-gray-400'
              )} />
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-300">
              {isUploading ? 'Uploading...' : label}
            </p>
            <p className="text-xs text-gray-500 mt-1">{hint}</p>
          </div>
        </div>
      </div>

      {/* Pending Files Preview */}
      {pendingFiles.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {pendingFiles.map((file, idx) => (
            <div
              key={idx}
              className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700"
            >
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              </div>
              {!isUploading && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePendingFile(idx);
                  }}
                  className="absolute top-1 right-1 p-1 bg-gray-900/80 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div className="text-sm text-red-400">
              {errors.map((error, idx) => (
                <p key={idx}>{error}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact version for inline use
interface CompactImageUploaderProps {
  onUpload: (file: File) => Promise<MediaAsset>;
  disabled?: boolean;
}

export const CompactImageUploader: React.FC<CompactImageUploaderProps> = ({
  onUpload,
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || disabled) return;

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <button
      onClick={() => fileInputRef.current?.click()}
      disabled={disabled || isUploading}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm',
        'bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg',
        'transition-colors',
        (disabled || isUploading) && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
      {isUploading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <ImageIcon className="w-4 h-4" />
      )}
      {isUploading ? 'Uploading...' : 'Add Image'}
    </button>
  );
};

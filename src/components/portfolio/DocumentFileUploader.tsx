/**
 * DocumentFileUploader Component
 * Upload and manage markdown, code, and text files for project documentation
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileText,
  FileCode,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  X,
  File,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { DocumentFile } from '@/src/types';

// Supported file extensions and their metadata
const FILE_CONFIG: Record<string, { type: DocumentFile['type']; language?: string; icon: React.ReactNode }> = {
  '.md': { type: 'markdown', icon: <FileText className="w-4 h-4 text-blue-400" /> },
  '.markdown': { type: 'markdown', icon: <FileText className="w-4 h-4 text-blue-400" /> },
  '.tsx': { type: 'code', language: 'tsx', icon: <FileCode className="w-4 h-4 text-cyan-400" /> },
  '.ts': { type: 'code', language: 'typescript', icon: <FileCode className="w-4 h-4 text-blue-400" /> },
  '.jsx': { type: 'code', language: 'jsx', icon: <FileCode className="w-4 h-4 text-yellow-400" /> },
  '.js': { type: 'code', language: 'javascript', icon: <FileCode className="w-4 h-4 text-yellow-400" /> },
  '.py': { type: 'code', language: 'python', icon: <FileCode className="w-4 h-4 text-green-400" /> },
  '.json': { type: 'code', language: 'json', icon: <FileCode className="w-4 h-4 text-orange-400" /> },
  '.yaml': { type: 'code', language: 'yaml', icon: <FileCode className="w-4 h-4 text-red-400" /> },
  '.yml': { type: 'code', language: 'yaml', icon: <FileCode className="w-4 h-4 text-red-400" /> },
  '.txt': { type: 'text', icon: <File className="w-4 h-4 text-gray-400" /> },
};

const ACCEPTED_EXTENSIONS = Object.keys(FILE_CONFIG).join(',');
const MAX_FILE_SIZE = 500 * 1024; // 500KB limit for text files

interface DocumentFileUploaderProps {
  files: DocumentFile[];
  onChange: (files: DocumentFile[]) => void;
  disabled?: boolean;
}

export const DocumentFileUploader: React.FC<DocumentFileUploaderProps> = ({
  files,
  onChange,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileConfig = (filename: string) => {
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    return FILE_CONFIG[ext] || { type: 'text' as const, icon: <File className="w-4 h-4 text-gray-400" /> };
  };

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    setUploadError(null);
    const newFiles: DocumentFile[] = [];
    const errors: string[] = [];

    for (const file of Array.from(fileList)) {
      // Check file extension
      const config = getFileConfig(file.name);
      if (!config) {
        errors.push(`${file.name}: Unsupported file type`);
        continue;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 500KB)`);
        continue;
      }

      // Check for duplicates
      if (files.some(f => f.filename === file.name)) {
        errors.push(`${file.name}: File already exists`);
        continue;
      }

      try {
        const content = await file.text();
        newFiles.push({
          id: crypto.randomUUID(),
          type: config.type,
          filename: file.name,
          content,
          language: config.language,
          uploadedAt: new Date().toISOString(),
          fileSize: file.size,
        });
      } catch {
        errors.push(`${file.name}: Failed to read file`);
      }
    }

    if (errors.length > 0) {
      setUploadError(errors.join(', '));
    }

    if (newFiles.length > 0) {
      onChange([...files, ...newFiles]);
    }
  }, [files, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [disabled, processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleDelete = useCallback((id: string) => {
    onChange(files.filter(f => f.id !== id));
  }, [files, onChange]);

  const handleUpdateDescription = useCallback((id: string, description: string) => {
    onChange(files.map(f => f.id === id ? { ...f, description } : f));
  }, [files, onChange]);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-700 hover:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
          aria-label="Upload documentation files"
        />
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-500" />
        <p className="text-sm text-gray-400 mb-1">
          Drag & drop files here, or{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-400 hover:text-blue-300"
            disabled={disabled}
          >
            browse
          </button>
        </p>
        <p className="text-xs text-gray-500">
          Supports: .md, .tsx, .ts, .jsx, .js, .py, .json, .yaml, .txt (max 500KB each)
        </p>
      </div>

      {/* Error message */}
      {uploadError && (
        <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-400">
          {uploadError}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Uploaded Files ({files.length})
          </h4>
          <div className="space-y-2">
            {files.map(file => (
              <DocumentFileCard
                key={file.id}
                file={file}
                onDelete={() => handleDelete(file.id)}
                onUpdateDescription={(desc) => handleUpdateDescription(file.id, desc)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// Document File Card
// ============================================

interface DocumentFileCardProps {
  file: DocumentFile;
  onDelete: () => void;
  onUpdateDescription: (description: string) => void;
}

const DocumentFileCard: React.FC<DocumentFileCardProps> = ({
  file,
  onDelete,
  onUpdateDescription,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(file.description || '');

  const config = FILE_CONFIG['.' + file.filename.split('.').pop()?.toLowerCase()] || {
    icon: <File className="w-4 h-4 text-gray-400" />,
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDescription = () => {
    onUpdateDescription(descValue);
    setEditingDesc(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const getLanguageLabel = () => {
    if (file.type === 'markdown') return 'Markdown';
    if (file.language) return file.language.toUpperCase();
    return 'Text';
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-900"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          {config.icon}
          <div>
            <span className="font-medium text-white text-sm">{file.filename}</span>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="px-1.5 py-0.5 bg-gray-800 rounded">
                {getLanguageLabel()}
              </span>
              <span>{formatFileSize(file.fileSize)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="p-1.5 text-gray-500 hover:text-white rounded hover:bg-gray-800"
            title={showPreview ? 'Hide preview' : 'Show preview'}
            aria-label={showPreview ? 'Hide preview' : 'Show preview'}
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-gray-500 hover:text-white rounded hover:bg-gray-800"
            title="Copy content"
            aria-label="Copy content"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-gray-500 hover:text-red-400 rounded hover:bg-gray-800"
            title="Delete file"
            aria-label="Delete file"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-800 p-3 space-y-3">
          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-400">Description (optional)</label>
            {editingDesc ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={descValue}
                  onChange={e => setDescValue(e.target.value)}
                  placeholder="What is this file for?"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveDescription}
                  className="p-1.5 text-green-400 hover:bg-gray-800 rounded"
                  title="Save description"
                  aria-label="Save description"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDescValue(file.description || '');
                    setEditingDesc(false);
                  }}
                  className="p-1.5 text-gray-400 hover:bg-gray-800 rounded"
                  title="Cancel"
                  aria-label="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingDesc(true)}
                className="text-sm text-gray-400 hover:text-white text-left w-full"
              >
                {file.description || 'Click to add description...'}
              </button>
            )}
          </div>

          {/* File info */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}</span>
            <span>Lines: {file.content.split('\n').length}</span>
          </div>
        </div>
      )}

      {/* Preview panel */}
      {showPreview && (
        <div className="border-t border-gray-800 bg-gray-900/50">
          <div className="max-h-64 overflow-auto">
            <pre className="p-4 text-xs text-gray-300 font-mono whitespace-pre-wrap break-all">
              {file.content.slice(0, 5000)}
              {file.content.length > 5000 && (
                <span className="text-gray-500">
                  {'\n\n... (truncated, {file.content.length - 5000} more characters)'}
                </span>
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentFileUploader;

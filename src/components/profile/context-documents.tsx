import React, { useRef, useState } from 'react';
import { Upload, Trash2, ShieldCheck, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/src/components/ui';
import { toast } from '@/src/stores';
import { cn, readFileAsText, generateId } from '@/src/lib/utils';
import { extractTextFromDocx } from '@/src/services/gemini/process-documents';
import type { ContextDocument } from '@/src/types';

interface ContextDocumentsProps {
  documents: ContextDocument[];
  onChange: (documents: ContextDocument[]) => void;
}

const isCareerFacts = (name: string) => /career[-_ ]?facts/i.test(name);

async function readDocument(file: File): Promise<string> {
  return file.name.toLowerCase().endsWith('.docx') ? extractTextFromDocx(file) : readFileAsText(file);
}

export const ContextDocuments: React.FC<ContextDocumentsProps> = ({ documents, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isReading, setIsReading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsReading(true);
    try {
      const uploaded = await Promise.all(
        files.map(async (file): Promise<ContextDocument> => ({
          id: generateId(),
          name: file.name,
          kind: isCareerFacts(file.name) ? 'authoritative' : 'supporting',
          content: await readDocument(file),
          uploadedAt: new Date().toISOString(),
        }))
      );
      // Re-uploading a file with the same name replaces it
      const names = new Set(uploaded.map((d) => d.name));
      onChange([...documents.filter((d) => !names.has(d.name)), ...uploaded]);
      toast.success(`${uploaded.length} document${uploaded.length > 1 ? 's' : ''} added`, 'Save changes to apply');
    } catch (err) {
      console.error('Context document upload failed:', err);
      toast.error('Upload failed', 'Could not read one of the files');
    } finally {
      setIsReading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  // Only one authoritative document: promoting one demotes the rest
  const toggleAuthoritative = (id: string) =>
    onChange(
      documents.map((d) => ({
        ...d,
        kind: d.id === id && d.kind !== 'authoritative' ? 'authoritative' : 'supporting',
      }))
    );

  const remove = (id: string) => onChange(documents.filter((d) => d.id !== id));

  const totalTokens = Math.round(documents.reduce((n, d) => n + d.content.length, 0) / 4);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Upload your career facts, latest resume, and prep notes. When documents are present, AI features
        read them in full instead of the structured fields below. The{' '}
        <span className="text-amber-400">authoritative</span> document wins any conflict, and its rules
        (e.g. a "never say" list) apply to all AI output.
      </p>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".md,.txt,.docx"
        onChange={handleUpload}
        className="hidden"
        aria-label="Upload AI context documents"
      />
      <Button
        variant="secondary"
        size="sm"
        disabled={isReading}
        onClick={() => inputRef.current?.click()}
        leftIcon={isReading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
      >
        {isReading ? 'Reading…' : 'Upload .md / .txt / .docx'}
      </Button>

      {documents.length > 0 && (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border bg-gray-800/30',
                doc.kind === 'authoritative' ? 'border-amber-500/50' : 'border-gray-700'
              )}
            >
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{doc.name}</div>
                <div className="text-xs text-gray-500">
                  ~{Math.round(doc.content.length / 4).toLocaleString()} tokens · uploaded{' '}
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleAuthoritative(doc.id)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded text-xs border',
                  doc.kind === 'authoritative'
                    ? 'text-amber-400 border-amber-500/50 bg-amber-900/20'
                    : 'text-gray-400 border-gray-600 hover:text-white'
                )}
                title="The authoritative document overrides every other source"
              >
                <ShieldCheck className="w-3 h-3" />
                {doc.kind === 'authoritative' ? 'Authoritative' : 'Supporting'}
              </button>
              <button
                type="button"
                onClick={() => remove(doc.id)}
                className="p-1 text-gray-500 hover:text-red-400"
                aria-label={`Remove ${doc.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {documents.length > 0 && (
        <p className="text-xs text-gray-500">
          ~{totalTokens.toLocaleString()} tokens sent with each AI request.
          {!documents.some((d) => d.kind === 'authoritative') &&
            ' No authoritative document set — conflicts between documents will not be resolved.'}
        </p>
      )}
    </div>
  );
};

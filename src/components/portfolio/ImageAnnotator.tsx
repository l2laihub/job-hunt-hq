/**
 * ImageAnnotator Component
 * Add callouts and labels to images/diagrams
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Save,
  X,
  Edit2,
  ZoomIn,
  ZoomOut,
  Move,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { ImageAnnotation, MediaAsset } from '@/src/types';
import { Button } from '@/src/components/ui/button';

// Annotation colors
const ANNOTATION_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
];

interface ImageAnnotatorProps {
  asset: MediaAsset;
  onSave: (annotations: ImageAnnotation[]) => void;
  onClose: () => void;
  readOnly?: boolean;
}

export const ImageAnnotator: React.FC<ImageAnnotatorProps> = ({
  asset,
  onSave,
  onClose,
  readOnly = false,
}) => {
  const [annotations, setAnnotations] = useState<ImageAnnotation[]>(
    asset.annotations || []
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: '', description: '' });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingMode || readOnly) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newAnnotation: ImageAnnotation = {
      id: crypto.randomUUID(),
      x,
      y,
      label: `Point ${annotations.length + 1}`,
      color: ANNOTATION_COLORS[annotations.length % ANNOTATION_COLORS.length].value,
    };

    setAnnotations(prev => [...prev, newAnnotation]);
    setSelectedId(newAnnotation.id);
    setIsAddingMode(false);
    setEditingId(newAnnotation.id);
    setEditForm({ label: newAnnotation.label, description: '' });
  }, [isAddingMode, readOnly, annotations.length]);

  const handleAnnotationClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    if (!readOnly) {
      const annotation = annotations.find(a => a.id === id);
      if (annotation) {
        setEditForm({
          label: annotation.label,
          description: annotation.description || ''
        });
      }
    }
  }, [annotations, readOnly]);

  const handleDeleteAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
    setEditingId(null);
  }, [selectedId]);

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;

    setAnnotations(prev => prev.map(a =>
      a.id === editingId
        ? { ...a, label: editForm.label, description: editForm.description }
        : a
    ));
    setEditingId(null);
  }, [editingId, editForm]);

  const handleColorChange = useCallback((id: string, color: string) => {
    setAnnotations(prev => prev.map(a =>
      a.id === id ? { ...a, color } : a
    ));
  }, []);

  const handleDragAnnotation = useCallback((
    id: string,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();

    const container = imageContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));

      setAnnotations(prev => prev.map(a =>
        a.id === id ? { ...a, x, y } : a
      ));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [readOnly]);

  const handleSaveAll = useCallback(() => {
    onSave(annotations);
    onClose();
  }, [annotations, onSave, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">
            {readOnly ? 'View Annotations' : 'Annotate Image'}
          </h2>
          <span className="text-sm text-gray-400">{asset.filename}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 mr-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-400 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              disabled={zoom >= 3}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {!readOnly && (
            <>
              <Button
                variant={isAddingMode ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setIsAddingMode(!isAddingMode)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Point
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveAll}>
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Image Area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          <div
            ref={imageContainerRef}
            className={cn(
              'relative inline-block',
              isAddingMode && 'cursor-crosshair'
            )}
            onClick={handleImageClick}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          >
            <img
              src={asset.url}
              alt={asset.caption || asset.filename}
              className="max-w-full max-h-[70vh] rounded-lg shadow-2xl"
              draggable={false}
            />

            {/* Annotation Points */}
            {annotations.map((annotation, index) => (
              <div
                key={annotation.id}
                className={cn(
                  'absolute transform -translate-x-1/2 -translate-y-1/2',
                  'cursor-pointer transition-transform',
                  selectedId === annotation.id && 'scale-125 z-10'
                )}
                style={{
                  left: `${annotation.x}%`,
                  top: `${annotation.y}%`,
                }}
                onClick={(e) => handleAnnotationClick(e, annotation.id)}
                onMouseDown={(e) => handleDragAnnotation(annotation.id, e)}
              >
                {/* Point Marker */}
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center',
                    'text-xs font-bold text-white shadow-lg',
                    'border-2 border-white',
                    selectedId === annotation.id && 'ring-2 ring-white/50'
                  )}
                  style={{ backgroundColor: annotation.color || '#3B82F6' }}
                >
                  {index + 1}
                </div>

                {/* Label Tooltip */}
                {selectedId === annotation.id && (
                  <div
                    className={cn(
                      'absolute left-1/2 -translate-x-1/2 top-8',
                      'bg-gray-900 border border-gray-700 rounded-lg px-3 py-2',
                      'text-sm text-white whitespace-nowrap shadow-xl',
                      'z-20'
                    )}
                  >
                    <div className="font-medium">{annotation.label}</div>
                    {annotation.description && (
                      <div className="text-xs text-gray-400 mt-1 max-w-48">
                        {annotation.description}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Adding Mode Hint */}
            {isAddingMode && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-blue-600/80 px-4 py-2 rounded-lg text-white text-sm">
                  Click anywhere to add an annotation point
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Annotation List & Editor */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-medium text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Annotations ({annotations.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {annotations.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                {readOnly
                  ? 'No annotations on this image'
                  : 'Click "Add Point" then click on the image to add annotations'}
              </div>
            ) : (
              annotations.map((annotation, index) => (
                <div
                  key={annotation.id}
                  className={cn(
                    'p-3 rounded-lg border transition-colors cursor-pointer',
                    selectedId === annotation.id
                      ? 'bg-gray-800 border-blue-500'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  )}
                  onClick={() => {
                    setSelectedId(annotation.id);
                    if (!readOnly) {
                      setEditForm({
                        label: annotation.label,
                        description: annotation.description || '',
                      });
                    }
                  }}
                >
                  {editingId === annotation.id && !readOnly ? (
                    /* Edit Form */
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editForm.label}
                        onChange={(e) => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                        placeholder="Label"
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                        autoFocus
                      />
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description (optional)"
                        rows={2}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white resize-none"
                      />
                      <div className="flex gap-1">
                        {ANNOTATION_COLORS.map(color => (
                          <button
                            key={color.value}
                            onClick={() => handleColorChange(annotation.id, color.value)}
                            className={cn(
                              'w-6 h-6 rounded-full border-2',
                              annotation.color === color.value
                                ? 'border-white'
                                : 'border-transparent'
                            )}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} className="flex-1">
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Display View */
                    <div className="flex items-start gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ backgroundColor: annotation.color || '#3B82F6' }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm truncate">
                          {annotation.label}
                        </div>
                        {annotation.description && (
                          <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                            {annotation.description}
                          </div>
                        )}
                      </div>
                      {!readOnly && (
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(annotation.id);
                              setEditForm({
                                label: annotation.label,
                                description: annotation.description || '',
                              });
                            }}
                            className="p-1 text-gray-500 hover:text-white"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAnnotation(annotation.id);
                            }}
                            className="p-1 text-gray-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Drag Hint */}
          {!readOnly && annotations.length > 0 && (
            <div className="p-3 border-t border-gray-800 bg-gray-850">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Move className="w-3 h-3" />
                Drag points to reposition them
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Read-only annotation viewer (for displaying annotated images)
interface AnnotatedImageViewerProps {
  asset: MediaAsset;
  className?: string;
  showLabels?: boolean;
  onClick?: () => void;
}

export const AnnotatedImageViewer: React.FC<AnnotatedImageViewerProps> = ({
  asset,
  className,
  showLabels = false,
  onClick,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const annotations = asset.annotations || [];

  return (
    <div
      className={cn('relative inline-block cursor-pointer', className)}
      onClick={onClick}
    >
      <img
        src={asset.url}
        alt={asset.caption || asset.filename}
        className="w-full h-full object-cover rounded-lg"
        draggable={false}
      />

      {/* Annotation Points */}
      {annotations.map((annotation, index) => (
        <div
          key={annotation.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${annotation.x}%`,
            top: `${annotation.y}%`,
          }}
          onMouseEnter={() => setHoveredId(annotation.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white shadow-lg"
            style={{ backgroundColor: annotation.color || '#3B82F6' }}
          >
            {index + 1}
          </div>

          {/* Tooltip on hover */}
          {(hoveredId === annotation.id || showLabels) && (
            <div className="absolute left-1/2 -translate-x-1/2 top-6 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white whitespace-nowrap z-10">
              {annotation.label}
            </div>
          )}
        </div>
      ))}

      {/* Annotation count badge */}
      {annotations.length > 0 && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
          {annotations.length} {annotations.length === 1 ? 'note' : 'notes'}
        </div>
      )}
    </div>
  );
};

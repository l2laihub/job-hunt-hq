import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/src/lib/utils';
import { Pencil, Check, X } from 'lucide-react';

export interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  showEditIcon?: boolean;
  onEditStart?: () => void;
  onEditEnd?: () => void;
}

export const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  placeholder = 'Click to edit...',
  className,
  inputClassName,
  multiline = false,
  rows = 3,
  disabled = false,
  showEditIcon = true,
  onEditStart,
  onEditEnd,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value);
    onEditStart?.();
  };

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
    onEditEnd?.();
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    onEditEnd?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && multiline && e.ctrlKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    const inputProps = {
      ref: inputRef as any,
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setEditValue(e.target.value),
      onKeyDown: handleKeyDown,
      onBlur: handleSave,
      className: cn(
        'w-full bg-gray-800 border border-blue-500 rounded px-2 py-1 text-gray-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
        inputClassName
      ),
      placeholder,
    };

    return (
      <div className="relative group">
        {multiline ? (
          <textarea {...inputProps} rows={rows} />
        ) : (
          <input type="text" {...inputProps} />
        )}
        <div className="absolute right-1 top-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="p-1 bg-green-600 hover:bg-green-500 rounded text-white"
            title="Save (Enter)"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleCancel();
            }}
            className="p-1 bg-gray-600 hover:bg-gray-500 rounded text-white"
            title="Cancel (Esc)"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      className={cn(
        'group cursor-pointer rounded px-1 -mx-1 transition-colors',
        !disabled && 'hover:bg-gray-700/50',
        disabled && 'cursor-default',
        className
      )}
    >
      <span className={cn(!value && 'text-gray-500 italic')}>
        {value || placeholder}
      </span>
      {showEditIcon && !disabled && (
        <Pencil className="w-3 h-3 ml-1 inline-block opacity-0 group-hover:opacity-50 transition-opacity text-gray-400" />
      )}
    </div>
  );
};

export interface EditableListProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  className?: string;
  itemClassName?: string;
  disabled?: boolean;
  addLabel?: string;
  bulletStyle?: 'disc' | 'number' | 'dash' | 'none';
}

export const EditableList: React.FC<EditableListProps> = ({
  items,
  onChange,
  placeholder = 'Click to add item...',
  className,
  itemClassName,
  disabled = false,
  addLabel = '+ Add item',
  bulletStyle = 'disc',
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingIndex !== null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingIndex]);

  const handleStartEdit = (index: number) => {
    if (disabled) return;
    setEditingIndex(index);
    setEditValue(items[index] || '');
  };

  const handleSave = () => {
    if (editingIndex === null) return;

    const newItems = [...items];
    if (editValue.trim()) {
      if (editingIndex >= items.length) {
        // Adding new item
        newItems.push(editValue.trim());
      } else {
        // Editing existing item
        newItems[editingIndex] = editValue.trim();
      }
    } else if (editingIndex < items.length) {
      // Remove empty item
      newItems.splice(editingIndex, 1);
    }

    onChange(newItems);
    setEditingIndex(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleDelete = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const getBullet = (index: number) => {
    switch (bulletStyle) {
      case 'number':
        return `${index + 1}.`;
      case 'dash':
        return '-';
      case 'disc':
        return '•';
      case 'none':
        return '';
    }
  };

  return (
    <div className={cn('space-y-1', className)}>
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-2 group">
          {bulletStyle !== 'none' && (
            <span className="text-gray-500 mt-0.5 min-w-[1rem]">{getBullet(index)}</span>
          )}
          {editingIndex === index ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className={cn(
                'flex-1 bg-gray-800 border border-blue-500 rounded px-2 py-0.5 text-sm text-gray-200',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/50'
              )}
              placeholder={placeholder}
            />
          ) : (
            <div
              onClick={() => handleStartEdit(index)}
              className={cn(
                'flex-1 cursor-pointer rounded px-1 -mx-1 transition-colors',
                !disabled && 'hover:bg-gray-700/50',
                itemClassName
              )}
            >
              <span>{item}</span>
              {!disabled && (
                <Pencil className="w-3 h-3 ml-1 inline-block opacity-0 group-hover:opacity-50 transition-opacity text-gray-400" />
              )}
            </div>
          )}
          {!disabled && editingIndex !== index && (
            <button
              onClick={() => handleDelete(index)}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
              title="Remove"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      {!disabled && editingIndex === null && (
        <button
          onClick={() => {
            setEditingIndex(items.length);
            setEditValue('');
          }}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors pl-5"
        >
          {addLabel}
        </button>
      )}
    </div>
  );
};

export default EditableText;

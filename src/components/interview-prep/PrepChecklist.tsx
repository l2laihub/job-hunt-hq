import React, { useState, useCallback } from 'react';
import { useInterviewPrepStore, toast } from '@/src/stores';
import { Button, Card, Badge, Input } from '@/src/components/ui';
import { cn } from '@/src/lib/utils';
import type { InterviewPrepSession, PrepChecklistItem, PrepItemStatus, JobApplication, PrepCategory, PrepPriority } from '@/src/types';
import {
  CheckCircle2,
  Circle,
  Clock,
  SkipForward,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Globe,
  Book,
  Code,
  MessageSquare,
  MapPin,
  ExternalLink,
} from 'lucide-react';

interface PrepChecklistProps {
  session: InterviewPrepSession;
  application?: JobApplication;
}

// Category config
const categoryConfig: Record<PrepCategory, { label: string; icon: React.ElementType; color: string }> = {
  research: { label: 'Research', icon: Globe, color: 'text-blue-400' },
  stories: { label: 'Stories', icon: Book, color: 'text-purple-400' },
  technical: { label: 'Technical', icon: Code, color: 'text-green-400' },
  questions: { label: 'Questions', icon: MessageSquare, color: 'text-yellow-400' },
  logistics: { label: 'Logistics', icon: MapPin, color: 'text-pink-400' },
};

// Priority badge colors
const priorityColors: Record<PrepPriority, string> = {
  required: 'bg-red-900/40 text-red-400 border-red-700/50',
  recommended: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50',
  optional: 'bg-gray-800 text-gray-400 border-gray-700',
};

// Status icon component
const StatusIcon: React.FC<{ status: PrepItemStatus; onClick: () => void }> = ({ status, onClick }) => {
  const icons: Record<PrepItemStatus, React.ReactNode> = {
    'completed': <CheckCircle2 className="w-5 h-5 text-green-400" />,
    'in-progress': <Clock className="w-5 h-5 text-yellow-400" />,
    'not-started': <Circle className="w-5 h-5 text-gray-500" />,
    'skipped': <SkipForward className="w-5 h-5 text-gray-500" />,
  };

  return (
    <button
      onClick={onClick}
      className="hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
    >
      {icons[status]}
    </button>
  );
};

// Single checklist item
const ChecklistItemRow: React.FC<{
  item: PrepChecklistItem;
  onStatusChange: (status: PrepItemStatus) => void;
  onRemove: () => void;
  isCustom?: boolean;
}> = ({ item, onStatusChange, onRemove, isCustom }) => {
  const [showActions, setShowActions] = useState(false);
  const config = categoryConfig[item.category];

  // Cycle through statuses
  const cycleStatus = () => {
    const statusOrder: PrepItemStatus[] = ['not-started', 'in-progress', 'completed', 'skipped'];
    const currentIndex = statusOrder.indexOf(item.status);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    onStatusChange(statusOrder[nextIndex]);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
        item.status === 'completed' && 'bg-green-900/10 border-green-800/30',
        item.status === 'in-progress' && 'bg-yellow-900/10 border-yellow-800/30',
        item.status === 'skipped' && 'opacity-50',
        item.status === 'not-started' && 'bg-gray-900/50 border-gray-800'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <StatusIcon status={item.status} onClick={cycleStatus} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <config.icon className={cn('w-4 h-4', config.color)} />
          <span
            className={cn(
              'text-sm',
              item.status === 'completed' && 'line-through text-gray-500',
              item.status !== 'completed' && 'text-white'
            )}
          >
            {item.label}
          </span>
        </div>
        {item.description && (
          <p className="text-xs text-gray-500 mt-1 ml-6">{item.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Badge className={cn('text-xs', priorityColors[item.priority])}>
          {item.priority}
        </Badge>

        {(showActions || isCustom) && isCustom && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// Add item form
const AddItemForm: React.FC<{
  onAdd: (label: string, category: PrepCategory, priority: PrepPriority) => void;
  onCancel: () => void;
}> = ({ onAdd, onCancel }) => {
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<PrepCategory>('research');
  const [priority, setPriority] = useState<PrepPriority>('recommended');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onAdd(label.trim(), category, priority);
    setLabel('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 space-y-3">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="What do you need to prepare?"
        autoFocus
      />
      <div className="flex gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as PrepCategory)}
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
        >
          {Object.entries(categoryConfig).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as PrepPriority)}
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
        >
          <option value="required">Required</option>
          <option value="recommended">Recommended</option>
          <option value="optional">Optional</option>
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!label.trim()}>
          Add Item
        </Button>
      </div>
    </form>
  );
};

// Main checklist component
export const PrepChecklist: React.FC<PrepChecklistProps> = ({ session, application }) => {
  const { updateChecklistItem, addChecklistItem, removeChecklistItem } = useInterviewPrepStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<PrepCategory>>(
    new Set(['research', 'stories', 'technical', 'questions', 'logistics'])
  );

  // Group items by category
  const groupedItems = session.checklist.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<PrepCategory, PrepChecklistItem[]>);

  // Calculate progress
  const totalItems = session.checklist.length;
  const completedItems = session.checklist.filter((i) => i.status === 'completed').length;
  const requiredItems = session.checklist.filter((i) => i.priority === 'required');
  const completedRequired = requiredItems.filter((i) => i.status === 'completed').length;

  // Toggle category expansion
  const toggleCategory = (category: PrepCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Handle status change
  const handleStatusChange = useCallback(
    (itemId: string, status: PrepItemStatus) => {
      updateChecklistItem(session.id, itemId, status);
    },
    [session.id, updateChecklistItem]
  );

  // Handle add item
  const handleAddItem = useCallback(
    (label: string, category: PrepCategory, priority: PrepPriority) => {
      addChecklistItem(session.id, {
        category,
        label,
        priority,
        status: 'not-started',
      });
      setShowAddForm(false);
      toast.success('Item added');
    },
    [session.id, addChecklistItem]
  );

  // Handle remove item
  const handleRemoveItem = useCallback(
    (itemId: string) => {
      removeChecklistItem(session.id, itemId);
    },
    [session.id, removeChecklistItem]
  );

  return (
    <div className="space-y-6">
      {/* Progress Summary */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-medium text-white">Preparation Progress</h3>
            <p className="text-sm text-gray-400">
              {completedItems} of {totalItems} items completed
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {Math.round((completedItems / totalItems) * 100)}%
            </div>
            <p className="text-xs text-gray-500">
              {completedRequired}/{requiredItems.length} required
            </p>
          </div>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${(completedItems / totalItems) * 100}%` }}
          />
        </div>
      </Card>

      {/* Quick Links */}
      {application && (
        <div className="flex gap-2 flex-wrap">
          {application.analysis && (
            <a
              href="/analyzer"
              className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white hover:border-blue-500/50 transition-colors"
            >
              <Search className="w-4 h-4" />
              View JD Analysis
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {application.companyResearch && (
            <a
              href="/research"
              className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white hover:border-purple-500/50 transition-colors"
            >
              <Globe className="w-4 h-4" />
              View Company Research
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <a
            href="/stories"
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white hover:border-green-500/50 transition-colors"
          >
            <Book className="w-4 h-4" />
            My Stories
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Checklist by Category */}
      <div className="space-y-4">
        {(Object.keys(categoryConfig) as PrepCategory[]).map((category) => {
          const items = groupedItems[category] || [];
          if (items.length === 0) return null;

          const config = categoryConfig[category];
          const isExpanded = expandedCategories.has(category);
          const categoryCompleted = items.filter((i) => i.status === 'completed').length;

          return (
            <Card key={category} className="overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <config.icon className={cn('w-5 h-5', config.color)} />
                  <span className="font-medium text-white">{config.label}</span>
                  <Badge variant="default" className="text-xs">
                    {categoryCompleted}/{items.length}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {items.map((item) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      onStatusChange={(status) => handleStatusChange(item.id, status)}
                      onRemove={() => handleRemoveItem(item.id)}
                      isCustom={!item.linkedResourceId}
                    />
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Item */}
      {showAddForm ? (
        <AddItemForm onAdd={handleAddItem} onCancel={() => setShowAddForm(false)} />
      ) : (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Item
        </Button>
      )}
    </div>
  );
};

import React from 'react';
import { cn } from '@/src/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-gray-400"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white',
              'appearance-none cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-500 focus:ring-red-500/50 focus:border-red-500',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Button Group for toggle-style selection
export interface ButtonGroupOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface ButtonGroupProps {
  options: ButtonGroupOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  options,
  value,
  onChange,
  size = 'md',
  className,
}) => {
  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  return (
    <div
      className={cn(
        'inline-flex bg-gray-900 p-1 rounded-lg border border-gray-800',
        className
      )}
      role="group"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'flex items-center gap-1.5 rounded font-medium transition-colors',
            sizeStyles[size],
            value === option.value
              ? 'bg-gray-700 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
};

import React from 'react';
import { cn } from '@/src/lib/utils';
import { X } from 'lucide-react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  removable?: boolean;
  onRemove?: () => void;
}

const variantStyles = {
  default: 'bg-gray-800 text-gray-300 border-gray-700',
  primary: 'bg-blue-900/30 text-blue-300 border-blue-800',
  success: 'bg-green-900/30 text-green-300 border-green-800',
  warning: 'bg-yellow-900/30 text-yellow-300 border-yellow-800',
  danger: 'bg-red-900/30 text-red-300 border-red-800',
  info: 'bg-purple-900/30 text-purple-300 border-purple-800',
};

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-1 text-xs',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      removable = false,
      onRemove,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border font-medium',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
        {removable && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="hover:text-white transition-colors -mr-0.5"
            aria-label="Remove"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Score Badge with automatic coloring
export interface ScoreBadgeProps {
  score: number;
  maxScore?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  maxScore = 10,
  size = 'md',
  showLabel = true,
}) => {
  const percentage = (score / maxScore) * 100;

  let variant: BadgeProps['variant'] = 'danger';
  if (percentage >= 80) variant = 'success';
  else if (percentage >= 50) variant = 'warning';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-bold rounded border',
        variantStyles[variant],
        sizeClasses[size]
      )}
    >
      {score}/{maxScore}
      {showLabel && <span className="ml-1 font-normal opacity-80">fit</span>}
    </span>
  );
};

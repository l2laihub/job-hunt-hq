import React from 'react';
import { Tooltip, type TooltipProps } from './tooltip';
import { getAbbreviation, type AbbreviationInfo } from '@/src/lib/abbreviations';
import { cn } from '@/src/lib/utils';
import { HelpCircle } from 'lucide-react';

export interface AbbrProps {
  /** The abbreviation text to display */
  children: string;
  /** Override the tooltip content (uses built-in definitions if not provided) */
  title?: string;
  /** Additional description to append to the tooltip */
  description?: string;
  /** Show help icon indicator */
  showIcon?: boolean;
  /** Tooltip position */
  position?: TooltipProps['position'];
  /** Additional class names */
  className?: string;
  /** Style variant */
  variant?: 'default' | 'subtle' | 'highlight';
}

/**
 * Abbreviation component that displays a tooltip with the full meaning
 * Automatically looks up common abbreviations from the built-in dictionary
 */
export const Abbr: React.FC<AbbrProps> = ({
  children,
  title,
  description,
  showIcon = false,
  position = 'top',
  className,
  variant = 'default',
}) => {
  // Look up the abbreviation
  const abbrInfo: AbbreviationInfo | undefined = getAbbreviation(children);

  // Build tooltip content
  const tooltipContent = title || abbrInfo ? (
    <div className="space-y-1">
      <div className="font-semibold">
        {children}: {title || abbrInfo?.full}
      </div>
      {(description || abbrInfo?.description) && (
        <div className="text-xs text-gray-300">
          {description || abbrInfo?.description}
        </div>
      )}
    </div>
  ) : null;

  // If no tooltip content available, just render the text
  if (!tooltipContent) {
    return <span className={className}>{children}</span>;
  }

  const variantStyles = {
    default: 'border-b border-dotted border-gray-500 cursor-help',
    subtle: 'cursor-help',
    highlight: 'bg-blue-900/20 px-1 rounded cursor-help border-b border-dotted border-blue-500',
  };

  return (
    <Tooltip content={tooltipContent} position={position}>
      <span
        className={cn(
          'inline-flex items-center gap-0.5',
          variantStyles[variant],
          className
        )}
      >
        {children}
        {showIcon && (
          <HelpCircle className="w-3 h-3 text-gray-500" />
        )}
      </span>
    </Tooltip>
  );
};

export default Abbr;

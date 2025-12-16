import React from 'react';
import { cn } from '@/src/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-gray-900 border-gray-800',
      elevated: 'bg-gray-900 border-gray-800 shadow-lg shadow-black/20',
      outlined: 'bg-transparent border-gray-700',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, description, action, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'p-4 border-b border-gray-800 bg-gray-850 rounded-t-xl',
          'flex items-center justify-between',
          className
        )}
        {...props}
      >
        <div>
          {title && <h3 className="font-semibold text-white">{title}</h3>}
          {description && (
            <p className="text-xs text-gray-400 mt-0.5">{description}</p>
          )}
          {children}
        </div>
        {action && <div>{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// Card Content
export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('p-4', className)}
      {...props}
    />
  );
});

CardContent.displayName = 'CardContent';

// Card Footer
export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'p-4 border-t border-gray-800 bg-gray-850 rounded-b-xl',
        className
      )}
      {...props}
    />
  );
});

CardFooter.displayName = 'CardFooter';

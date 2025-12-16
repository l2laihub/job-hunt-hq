import React from 'react';
import { cn } from '@/src/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  width,
  height,
  style,
  ...props
}) => {
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-gray-800',
        variantStyles[variant],
        className
      )}
      style={{
        width: width,
        height: height || (variant === 'text' ? '1em' : undefined),
        ...style,
      }}
      {...props}
    />
  );
};

// Pre-built skeleton patterns
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3', className)}>
    <div className="flex justify-between items-start">
      <Skeleton variant="text" className="h-5 w-32" />
      <Skeleton variant="text" className="h-5 w-12" />
    </div>
    <Skeleton variant="text" className="h-4 w-24" />
    <div className="space-y-2">
      <Skeleton variant="text" className="h-3 w-20" />
      <Skeleton variant="text" className="h-3 w-28" />
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 3,
  className,
}) => (
  <div className={cn('space-y-3', className)}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="h-4 w-3/4" />
          <Skeleton variant="text" className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

export const AnalysisSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    {/* Score section */}
    <div className="flex gap-4">
      <Skeleton className="w-24 h-24 rounded-xl" />
      <div className="flex-1 p-4 bg-gray-800/50 rounded-xl space-y-2">
        <Skeleton variant="text" className="h-4 w-full" />
        <Skeleton variant="text" className="h-4 w-3/4" />
        <div className="flex gap-2 mt-3">
          <Skeleton variant="text" className="h-6 w-20 rounded-full" />
          <Skeleton variant="text" className="h-6 w-24 rounded-full" />
        </div>
      </div>
    </div>

    {/* Skills section */}
    <div className="grid grid-cols-2 gap-4">
      <div className="p-4 bg-gray-800/30 rounded-xl space-y-3">
        <Skeleton variant="text" className="h-4 w-24" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="text" className="h-6 w-16 rounded" />
          ))}
        </div>
      </div>
      <div className="p-4 bg-gray-800/30 rounded-xl space-y-3">
        <Skeleton variant="text" className="h-4 w-24" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="text" className="h-6 w-14 rounded" />
          ))}
        </div>
      </div>
    </div>

    {/* Talking points */}
    <div className="space-y-2">
      <Skeleton variant="text" className="h-4 w-32" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 p-3 bg-gray-800/50 rounded-lg">
          <Skeleton variant="text" className="h-4 w-6" />
          <Skeleton variant="text" className="h-4 flex-1" />
        </div>
      ))}
    </div>
  </div>
);

export const ProfileSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <Skeleton variant="text" className="h-3 w-16" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-1">
        <Skeleton variant="text" className="h-3 w-24" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
    <div className="space-y-1">
      <Skeleton variant="text" className="h-3 w-20" />
      <Skeleton className="h-20 w-full rounded-lg" />
    </div>
    <div className="space-y-2">
      <Skeleton variant="text" className="h-3 w-24" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="text" className="h-8 w-20 rounded-full" />
        ))}
      </div>
    </div>
  </div>
);

'use client';

import { memo, useMemo, ComponentType } from 'react';

// Types
interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

interface LoadingSpinnerProps {
  isLoading?: boolean;
}

interface ProgressBarProps {
  progress?: number;
  className?: string;
}

// Optimized inline spinner for buttons
export const InlineSpinner = memo<SpinnerProps>(({ size = 'sm', className = '' }) => {
  const sizeClasses = useMemo(() => {
    const sizes = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4', 
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };
    return sizes[size] || sizes.sm;
  }, [size]);

  return (
    <div className={`${sizeClasses} ${className} animate-spin`}>
      <div className="w-full h-full border-2 border-white/30 border-t-white rounded-full" />
    </div>
  );
});

InlineSpinner.displayName = 'InlineSpinner';

// Optimized page loading spinner
const LoadingSpinner = memo<LoadingSpinnerProps>(({ isLoading = true }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-6">
          <div className="text-3xl font-bold text-[#0fb8af]">EurosHub</div>
          <div className="text-lg text-white/80">Office Management</div>
        </div>
        
        {/* Simple efficient spinner - centered */}
        <div className="flex justify-center">
          <div className="w-12 h-12 border-3 border-white/20 border-t-[#0fb8af] rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

// Micro loading component for small UI elements
export const MicroSpinner = memo<{ className?: string }>(({ className = '' }) => (
  <div className={`w-3 h-3 border border-current border-t-transparent rounded-full animate-spin ${className}`} />
));

MicroSpinner.displayName = 'MicroSpinner';

// Dot loading animation - very lightweight
export const DotLoader = memo<{ className?: string }>(({ className = '' }) => (
  <div className={`flex space-x-1 ${className}`}>
    <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
));

DotLoader.displayName = 'DotLoader';

// Progress bar component
export const ProgressBar = memo<ProgressBarProps>(({ progress = 0, className = '' }) => (
  <div className={`w-full h-1 bg-white/20 rounded-full overflow-hidden ${className}`}>
    <div 
      className="h-full bg-[#0fb8af] rounded-full transition-all duration-300 ease-out"
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
    />
  </div>
));

ProgressBar.displayName = 'ProgressBar';

export default LoadingSpinner;

// Simplified HOC for page transitions
export function withLoadingSpinner<P extends object>(
  Component: ComponentType<P>, 
  loadingText: string = "Loading..."
): ComponentType<P> {
  const WrappedComponent = memo<P>((props: P) => {
    return <Component {...props} />;
  });
  
  WrappedComponent.displayName = `withLoadingSpinner(${Component.displayName || Component.name})`;
  return WrappedComponent;
}
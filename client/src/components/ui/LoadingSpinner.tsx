'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className={`
        ${sizes[size]}
        border-4 border-gray-200 dark:border-gray-700
        border-t-blue-500 dark:border-t-blue-400
        rounded-full animate-spin
      `} />
    </div>
  );
}
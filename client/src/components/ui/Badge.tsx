import { FC, ReactNode } from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  children: ReactNode;
  variant?: 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'archived' | 'rejected';
  pillar?: 'internal' | 'psychology' | 'discipline' | 'systems';
  size?: 'sm' | 'md';
  className?: string;
}

const variantClasses = {
  draft: 'badge-draft',
  review: 'badge-review',
  approved: 'badge-approved', 
  scheduled: 'badge-scheduled',
  published: 'badge-published',
  archived: 'badge-archived',
  rejected: 'badge-rejected'
};

const pillarClasses = {
  internal: 'pillar-internal',
  psychology: 'pillar-psychology',
  discipline: 'pillar-discipline',
  systems: 'pillar-systems'
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs'
};

export const Badge: FC<BadgeProps> = ({
  children,
  variant,
  pillar,
  size = 'md',
  className
}) => {
  return (
    <span
      className={clsx(
        'badge',
        sizeClasses[size],
        variant && variantClasses[variant],
        pillar && pillarClasses[pillar],
        className
      )}
    >
      {children}
    </span>
  );
};
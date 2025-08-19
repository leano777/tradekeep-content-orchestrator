import { FC, ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  hover?: boolean;
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const Card: FC<CardProps> = ({ 
  children, 
  className, 
  padding = false,
  hover = false 
}) => {
  return (
    <div
      className={clsx(
        'card',
        padding && 'p-6',
        hover && 'hover:shadow-tk-xl transition-shadow duration-200',
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader: FC<CardHeaderProps> = ({ 
  children, 
  className,
  actions 
}) => {
  return (
    <div className={clsx('card-header', actions && 'flex items-center justify-between', className)}>
      <div>{children}</div>
      {actions && <div className="flex items-center space-x-2">{actions}</div>}
    </div>
  );
};

export const CardBody: FC<CardBodyProps> = ({ children, className }) => {
  return (
    <div className={clsx('card-body', className)}>
      {children}
    </div>
  );
};

export const CardFooter: FC<CardFooterProps> = ({ children, className }) => {
  return (
    <div className={clsx('card-footer', className)}>
      {children}
    </div>
  );
};
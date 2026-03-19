import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  action?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, action, children }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {action}
      </div>
      {children}
    </div>
  );
}

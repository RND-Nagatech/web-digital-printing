import emptyIllustration from '@/assets/empty.svg';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  showLegacyIcon?: boolean;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  showLegacyIcon = false,
}: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
    <img src={emptyIllustration} alt="Empty data" className="mb-4 h-64 w-64 object-contain" />

    {showLegacyIcon && Icon && (
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
    )}

    <h3 className="text-base font-semibold text-foreground">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

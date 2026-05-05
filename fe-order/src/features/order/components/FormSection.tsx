import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  step: number | string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export const FormSection = ({ step, title, description, children, className }: Props) => (
  <section className={cn('surface-card p-5 md:p-6 animate-fade-in', className)}>
    <header className="mb-4 flex items-start gap-3">
      <span className="section-label">{step}</span>
      <div>
        <h3 className="font-display text-base font-bold leading-tight md:text-lg">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
    </header>
    <div className="space-y-4">{children}</div>
  </section>
);

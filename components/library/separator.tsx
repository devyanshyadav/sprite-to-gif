import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export type SeparatorProps = Omit<ComponentProps<'div'>, 'children'> & {
  orientation?: 'horizontal' | 'vertical';
  /** Decorative by default; set false for a meaningful section boundary. */
  decorative?: boolean;
};

/** Theme-derived fading rule; native markup keeps display-only composition server-compatible. */
export function Separator({
  orientation = 'horizontal',
  decorative = true,
  className,
  ...props
}: SeparatorProps) {
  const semantics = decorative
    ? { role: 'none' as const, 'aria-hidden': true as const }
    : { role: 'separator' as const, 'aria-orientation': orientation };
  return (
    <div
      {...props}
      data-slot="separator"
      data-orientation={orientation}
      {...semantics}
      className={cn(
        'pointer-events-none shrink-0',
        orientation === 'horizontal'
          ? 'h-px w-full bg-[linear-gradient(to_right,transparent,var(--separator-color,var(--border))_18%,var(--separator-color,var(--border))_82%,transparent)]'
          : 'w-px self-stretch bg-[linear-gradient(to_bottom,transparent,var(--separator-color,var(--border))_18%,var(--separator-color,var(--border))_82%,transparent)]',
        className,
      )}
    />
  );
}

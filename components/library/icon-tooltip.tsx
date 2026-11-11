'use client';

import type { ReactElement } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/library/tooltip';

type IconTooltipProps = {
  label: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactElement;
};

/** Tooltip for icon-only controls (slide animation via TooltipContent). */
export function IconTooltip({
  label,
  side = 'top',
  children,
}: IconTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent animated size='sm' side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

'use client';

import type { ReactElement } from 'react';
import { AiPromptBuilder } from '@/components/studio/ai-prompt-builder';
import { STUDIO_COPY } from '@/lib/studio-copy';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

type PromptSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: number;
  rows: number;
  onSelectGrid: (cols: number, rows: number) => void;
  trigger?: ReactElement;
};

export function PromptSheet({
  open,
  onOpenChange,
  columns,
  rows,
  onSelectGrid,
  trigger,
}: PromptSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger}
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading text-lg font-bold tracking-tight">
            {STUDIO_COPY.promptSheet.title}
          </SheetTitle>
          <SheetDescription>
            {STUDIO_COPY.promptSheet.description}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <AiPromptBuilder
            columns={columns}
            rows={rows}
            onSelectGrid={onSelectGrid}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { SheetTrigger as PromptSheetTrigger };

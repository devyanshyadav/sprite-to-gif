'use client';

import { useSpriteStudio } from '@/hooks/studio/use-sprite-studio';
import { StudioHeader } from '@/components/studio/studio-header';
import { StudioFooter } from '@/components/studio/studio-footer';
import { StudioWorkspace } from '@/components/studio/studio-workspace';
import { TooltipProvider } from '@/components/library/tooltip';

export function SpriteStudioPage() {
  const { headerProps, workspaceProps, handleDragOver, handleDragLeave, handleDrop } =
    useSpriteStudio();

  return (
    <TooltipProvider delay={200}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased"
      >
        <StudioHeader {...headerProps} />
        <StudioWorkspace {...workspaceProps} />
        <StudioFooter />
      </div>
    </TooltipProvider>
  );
}

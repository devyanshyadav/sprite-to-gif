'use client';

import type { StudioHeaderProps } from '@/hooks/studio/view-models';
import { STUDIO_COPY } from '@/lib/studio-copy';
import { SampleFieldSelect } from '@/components/studio/sample-field-select';
import { SavedGifsGallery } from '@/components/studio/saved-gifs-gallery';
import { BevelButton } from '@/components/library/bevel-button';
import { SpriteToGifLogo } from '@/components/library/sprite-to-gif-logo';
import { ThemeToggle } from '@/components/library/theme-toggle';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { PiBookmarkSimpleBold, PiGithubLogoBold } from 'react-icons/pi';
import { IconTooltip } from '@/components/library/icon-tooltip';

export function StudioHeader({
  savedGifs,
  isLoadingSample,
  activeSamplePath,
  loadSampleImage,
  deleteSaved,
  updateTitle,
  clearAllSaved,
}: StudioHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-lg outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <SpriteToGifLogo
              className="size-6"
              title={STUDIO_COPY.productName}
            />
          </div>
          <span className="truncate font-heading text-base font-bold tracking-tight">
            {STUDIO_COPY.productName}
          </span>
        </a>

        <div className="flex items-center gap-2">
          <SampleFieldSelect
            activeSamplePath={activeSamplePath}
            isLoadingSample={isLoadingSample}
            onSelect={loadSampleImage}
          />

          <Sheet>
            <SheetTrigger render={<BevelButton variant="secondary" size="sm" />}>
              <PiBookmarkSimpleBold />
              <span className="hidden md:inline">{STUDIO_COPY.saved}</span>
              {savedGifs.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 px-1.5">
                  {savedGifs.length}
                </Badge>
              )}
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="font-heading text-lg font-bold tracking-tight">
                  {STUDIO_COPY.savedVault.title}
                </SheetTitle>
                <SheetDescription>
                  {STUDIO_COPY.savedVault.description}
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">
                <SavedGifsGallery
                  savedGifs={savedGifs}
                  onDelete={deleteSaved}
                  onUpdateTitle={updateTitle}
                  onClearAll={clearAllSaved}
                />
              </div>
            </SheetContent>
          </Sheet>

          <IconTooltip label={STUDIO_COPY.footer.githubTooltip}>
            <BevelButton
              variant="secondary"
              size="icon-sm"
              render={
                <a
                  href={STUDIO_COPY.footer.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={STUDIO_COPY.footer.githubTooltip}
                />
              }
            >
              <PiGithubLogoBold />
            </BevelButton>
          </IconTooltip>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

'use client';

import { useRef } from 'react';
import type { StudioWorkspaceProps } from '@/hooks/studio/view-models';
import { GridOverlayCanvas } from '@/components/studio/grid-overlay-canvas';
import { GridControls } from '@/components/studio/grid-controls';
import { LiveAnimationPreview } from '@/components/studio/live-animation-preview';
import {
  GifExportPanel,
  type GifExportPanelRef,
} from '@/components/studio/gif-export-panel';
import { PromptSheet } from '@/components/studio/prompt-sheet';
import { StudioWorkflowStrip } from '@/components/studio/studio-workflow-strip';
import { Separator } from '@/components/library/separator';
import { PiUploadSimpleBold } from 'react-icons/pi';
import { STUDIO_COPY } from '@/lib/studio-copy';

export function StudioWorkspace({
  imageMeta,
  imageElement,
  gridConfig,
  setGridConfig,
  gifOptions,
  mergeGifOptions,
  slices,
  diagnostics,
  isSlicingPending,
  selectedFrameIndex,
  setSelectedFrameIndex,
  isDragOver,
  fileInputRef,
  handleFileChange,
  openFilePicker,
  isUploading,
  openPromptSheet,
  promptSheetOpen,
  setPromptSheetOpen,
  toggleFrame,
  runAutoDetect,
  saveToLibrary,
  fileName,
}: StudioWorkspaceProps) {
  const exportPanelRef = useRef<GifExportPanelRef>(null);

  const runExport = () => {
    document
      .getElementById('studio-export')
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    exportPanelRef.current?.generate();
  };

  const workflow = (
    <StudioWorkflowStrip
      hasImage={Boolean(imageElement)}
      isUploading={isUploading}
      onGeneratePrompt={openPromptSheet}
      onUpload={openFilePicker}
      onGoToOutput={runExport}
    />
  );
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <PromptSheet
        open={promptSheetOpen}
        onOpenChange={setPromptSheetOpen}
      />
      <div className="my-auto flex w-full flex-col items-center">
        <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="min-w-0 flex flex-col items-start text-left">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {STUDIO_COPY.hero.title}
            </h1>
            <p className="mt-1 max-w-md font-sans text-sm text-muted-foreground">
              {STUDIO_COPY.hero.tagline}
            </p>
          </div>
          <div className="w-full shrink-0 lg:w-auto lg:max-w-[min(100%,28rem)]">
            {workflow}
          </div>
        </div>
        <Separator className="my-2 opacity-50" />
        <div
          className={`grid w-full grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:items-center lg:gap-10 ${
            isDragOver ? 'rounded-xl p-2 ring-2 ring-primary' : ''
          }`}
        >
          <div className="order-2 flex flex-col gap-4 lg:order-1 lg:col-span-7">
            <div className="flex flex-col gap-3">
              {imageMeta && (
                <div className="flex items-center gap-2 px-0.5">
                  <span className="truncate text-xs font-medium text-foreground">
                    {imageMeta.name.split(' · ')[0] ?? imageMeta.name}
                  </span>
                  {isSlicingPending && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {STUDIO_COPY.sheet.updatingGrid}
                    </span>
                  )}
                </div>
              )}

              {!imageElement ? (
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="flex min-h-upload-dropzone cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 p-8 text-center transition hover:border-primary/50 hover:bg-muted/40"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <PiUploadSimpleBold className="h-6 w-6" />
                  </div>
                  <p className="font-heading text-sm font-semibold text-foreground">
                    {STUDIO_COPY.sheet.dropzoneTitle}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {STUDIO_COPY.sheet.dropzoneHint}
                  </p>
                </button>
              ) : null}

              {imageElement ? (
                <GridOverlayCanvas
                  image={imageElement}
                  slices={slices}
                  config={gridConfig}
                  diagnostics={diagnostics}
                  selectedFrameIndex={selectedFrameIndex}
                  onSelectFrame={setSelectedFrameIndex}
                  onToggleFrame={toggleFrame}
                />
              ) : null}
            </div>

            {imageElement && (
              <div className="flex flex-col gap-4 pt-1">
                <Separator />
                <GridControls
                  config={gridConfig}
                  onChange={setGridConfig}
                  onAutoDetect={runAutoDetect}
                />
              </div>
            )}
          </div>

          <div className="order-1 flex flex-col justify-center gap-4 border-b border-border pb-6 lg:order-2 lg:col-span-5 lg:border-b-0 lg:border-l lg:pb-0 lg:pl-10">
            <LiveAnimationPreview
              image={imageElement}
              slices={slices}
              options={gifOptions}
              onOptionsChange={mergeGifOptions}
            />

            <div id="studio-export" className="flex scroll-mt-24 flex-col gap-4 pt-1">
              <Separator />
              <GifExportPanel
                ref={exportPanelRef}
                image={imageElement}
                slices={slices}
                options={gifOptions}
                onSaveToLibrary={saveToLibrary}
                fileName={fileName}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

'use client';

import {
  PiCaretRightBold,
  PiFilmStripBold,
  PiMagicWandBold,
  PiUploadSimpleBold,
} from 'react-icons/pi';
import { BevelButton } from '@/components/library/bevel-button';
import { cn } from '@/lib/utils';
import { STUDIO_COPY } from '@/lib/studio-copy';

const generatePromptGradientClass =
  'border-black/5! bg-[#f3b5cc]! bg-[linear-gradient(110deg,#ffbf8c_0%,#f3a9c3_48%,#bca7f3_100%)]! font-semibold text-[#102d38]! shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_1px_2px_rgb(0_0_0/0.06)]! [text-shadow:none] hover:bg-[#f3b5cc]! hover:brightness-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:brightness-100';

type StudioWorkflowStripProps = {
  hasImage: boolean;
  isUploading: boolean;
  onGeneratePrompt: () => void;
  onUpload: () => void;
  onGoToOutput: () => void;
};

function StepDivider() {
  return (
    <PiCaretRightBold
      className="hidden size-3.5 shrink-0 text-muted-foreground/50 sm:block"
      aria-hidden
    />
  );
}

/** Upload → tune grid → prompt (optional) → GIF output, using the same buttons as the header. */
export function StudioWorkflowStrip({
  hasImage,
  isUploading,
  onGeneratePrompt,
  onUpload,
  onGoToOutput,
}: StudioWorkflowStripProps) {
  return (
    <nav
      aria-label={STUDIO_COPY.workflow.ariaLabel}
      className="rounded-xl  p-2.5 sm:p-3"
    >
      <ol className="flex flex-col gap-2 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-end">
        <li className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <BevelButton
            type="button"
            variant="secondary"
            size="sm"
            className={cn('w-full sm:w-auto', generatePromptGradientClass)}
            onClick={onGeneratePrompt}
          >
            <PiMagicWandBold />
            {STUDIO_COPY.workflow.prompt}
          </BevelButton>
          <StepDivider />
        </li>
        <li className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <BevelButton
            type="button"
            variant={isUploading ? 'default' : 'secondary'}
            size="sm"
            className="w-full sm:w-auto"
            loading={isUploading}
            onClick={onUpload}
          >
            {!isUploading && <PiUploadSimpleBold />}
            {isUploading
              ? STUDIO_COPY.workflow.uploading
              : STUDIO_COPY.workflow.upload}
          </BevelButton>
          <StepDivider />
        </li>
        <li className="flex-1 sm:flex-none">
          <BevelButton
            type="button"
            variant={hasImage ? 'default' : 'secondary'}
            size="sm"
            className="w-full sm:w-auto"
            disabled={!hasImage}
            onClick={onGoToOutput}
          >
            <PiFilmStripBold />
            {STUDIO_COPY.workflow.export}
          </BevelButton>
        </li>
      </ol>
    </nav>
  );
}

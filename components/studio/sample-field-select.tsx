'use client';

import { SAMPLE_SPRITE_SHEETS } from '@/lib/constants';
import { sampleGridFromLabel } from '@/lib/sample-sprites';
import { STUDIO_COPY } from '@/lib/studio-copy';
import { SampleFrameThumb } from '@/components/studio/sample-frame-thumb';
import {
  FieldSelect,
  FieldSelectContent,
  FieldSelectItem,
  FieldSelectTrigger,
  FieldSelectValue,
} from '@/components/library/field-select';
import { PiSparkleBold } from 'react-icons/pi';

function splitSampleLabel(label: string) {
  const parts = label.split(' · ');
  if (parts.length < 2) return { title: label, meta: null as string | null };
  return { title: parts[0], meta: parts.slice(1).join(' · ') };
}

type SampleFieldSelectProps = {
  activeSamplePath: string | null;
  isLoadingSample: boolean;
  onSelect: (path: string, label: string) => void;
};

export function SampleFieldSelect({
  activeSamplePath,
  isLoadingSample,
  onSelect,
}: SampleFieldSelectProps) {
  const activeSample = activeSamplePath
    ? SAMPLE_SPRITE_SHEETS.find((s) => s.path === activeSamplePath)
    : undefined;
  const activeGrid = activeSample
    ? sampleGridFromLabel(activeSample.label)
    : null;

  return (
    <FieldSelect
      value={activeSamplePath}
      onValueChange={(path) => {
        const sample = SAMPLE_SPRITE_SHEETS.find((s) => s.path === path);
        if (sample) void onSelect(sample.path, sample.label);
      }}
    >
      <FieldSelectTrigger
        size="sm"
        disabled={isLoadingSample}
        aria-busy={isLoadingSample}
        className="h-9 w-auto max-w-[min(100%,13rem)] shrink-0 gap-2.5 rounded-lg px-2.5 shadow-none sm:max-w-[15rem]"
      >
        {activeSamplePath && activeGrid ? (
          <SampleFrameThumb
            path={activeSamplePath}
            columns={activeGrid.columns}
            rows={activeGrid.rows}
            className="size-7 shrink-0 rounded"
          />
        ) : (
          <PiSparkleBold
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
          />
        )}
        <FieldSelectValue className="min-w-0 truncate font-medium">
          {(value: string | null) => {
            if (!value) {
              return (
                <span className="text-muted-foreground">{STUDIO_COPY.samples}</span>
              );
            }
            const sample = SAMPLE_SPRITE_SHEETS.find((s) => s.path === value);
            if (!sample) return value;
            return splitSampleLabel(sample.label).title;
          }}
        </FieldSelectValue>
      </FieldSelectTrigger>
      <FieldSelectContent
        side="bottom"
        align="end"
        alignItemWithTrigger={false}
        mobileTitle={STUDIO_COPY.samples}
        className="w-80"
        listProps={{
          className: 'max-h-[min(28rem,70vh)]',
        }}
      >
        {SAMPLE_SPRITE_SHEETS.map((s) => {
          const { title, meta } = splitSampleLabel(s.label);
          const { columns, rows } = sampleGridFromLabel(s.label);
          return (
            <FieldSelectItem
              key={s.path}
              value={s.path}
              label={title}
              indicator="check"
              className="items-start gap-3 py-2.5"
            >
              <span className="flex w-full min-w-0 items-center gap-3">
                <SampleFrameThumb
                  path={s.path}
                  columns={columns}
                  rows={rows}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 pe-5 text-start">
                  <span className="line-clamp-2 text-sm leading-snug">
                    {title}
                  </span>
                  {meta ? (
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      {meta}
                    </span>
                  ) : null}
                </span>
              </span>
            </FieldSelectItem>
          );
        })}
      </FieldSelectContent>
    </FieldSelect>
  );
}

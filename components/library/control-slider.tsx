'use client';

import type { ReactNode, Ref } from 'react';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import { cn } from '@/lib/utils';

type ControlSliderSlot = 'control' | 'track' | 'indicator' | 'thumb' | 'label' | 'value' | 'mark';

export type ControlSliderProps = Omit<
  SliderPrimitive.Root.Props<number>,
  | 'children'
  | 'render'
  | 'className'
  | 'orientation'
  | 'thumbAlignment'
  | 'minStepsBetweenValues'
  | 'thumbCollisionBehavior'
> & {
  /** Visible label, also used as the accessible name of the slider. */
  label: ReactNode;
  size?: 'default' | 'sm';
  /** Formats both the visible value and its screen-reader value text. */
  formatValue?: (value: number) => string;
  /** Optional decorative marks, expressed as values within min/max. */
  marks?: readonly number[];
  className?: string;
  classNames?: Partial<Record<ControlSliderSlot, string>>;
  ref?: Ref<HTMLDivElement>;
  inputRef?: Ref<HTMLInputElement>;
};

/** A single-value control row adapted from shadcn’s Base UI Slider anatomy. */
export function ControlSlider({
  label,
  size = 'default',
  formatValue,
  marks,
  className,
  classNames,
  inputRef,
  min = 0,
  max = 100,
  defaultValue = min,
  ...props
}: ControlSliderProps) {
  const lo = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) && max > lo ? max : lo + 1;

  return (
    <SliderPrimitive.Root
      {...props}
      defaultValue={defaultValue}
      orientation="horizontal"
      thumbAlignment="edge"
      data-slot="control-slider"
      min={lo}
      max={safeMax}
      className={cn(
        'group/control relative grid w-full min-w-0 rounded-lg bg-muted text-foreground transition-shadow duration-150 ease-out data-dragging:shadow-[inset_0_0_0_1px_var(--border)] data-disabled:opacity-45 motion-reduce:transition-none',
        className,
      )}
    >
      <SliderPrimitive.Control
        data-slot="control-slider-control"
        className={cn(
          'relative col-start-1 row-start-1 h-full w-full cursor-ew-resize touch-pan-y rounded-[inherit] outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background data-disabled:cursor-not-allowed',
          size === 'sm' ? 'min-h-9' : 'min-h-10',
          classNames?.control,
        )}
      >
        <SliderPrimitive.Track
          data-slot="control-slider-track"
          className={cn('h-full w-full overflow-hidden rounded-[inherit]', classNames?.track)}
        >
          <SliderPrimitive.Indicator
            data-slot="control-slider-indicator"
            // Edge alignment insets the primitive's fill to the thumb centers.
            // This full-row design fills the actual 0–100% value instead.
            style={(state) => ({
              width: `${state.max > state.min ? Math.min(100, Math.max(0, ((state.values[0] - state.min) / (state.max - state.min)) * 100)) : 0}%`,
            })}
            className={cn(
              'rounded-[inherit] bg-foreground/10 transition-[background-color,box-shadow] duration-150 ease-out group-hover/control:bg-foreground/15 data-dragging:bg-foreground/20 data-dragging:shadow-[inset_0_1px_0_0_var(--border)] group-data-disabled/control:bg-foreground/10 motion-reduce:transition-none',
              classNames?.indicator,
            )}
          />
          {marks &&
            safeMax > lo &&
            [...new Set(marks)]
              .filter((mark) => Number.isFinite(mark) && mark > lo && mark < safeMax)
              .map((mark) => (
                <span
                  key={mark}
                  aria-hidden="true"
                  data-slot="control-slider-mark"
                  className={cn(
                    'pointer-events-none absolute top-1/2 size-1 -translate-y-1/2 rounded-full bg-foreground/10 transition-colors duration-150 group-data-dragging/control:bg-foreground/20 motion-reduce:transition-none',
                    classNames?.mark,
                  )}
                  style={{
                    insetInlineStart: `${((mark - lo) / (safeMax - lo)) * 100}%`,
                  }}
                />
              ))}
          <SliderPrimitive.Thumb
            index={0}
            inputRef={inputRef}
            getAriaValueText={formatValue ? (_formatted, value) => formatValue(value) : undefined}
            data-slot="control-slider-thumb"
            className={cn(
              // Keep the measured thumb width fixed; only its visual handle animates.
              'flex h-full w-1 items-center justify-center outline-none before:absolute before:inset-y-0 before:-inset-x-3 after:h-5 after:w-0.5 after:origin-center after:rounded-full after:bg-foreground/35 after:transition-[background-color,scale] after:duration-150 after:ease-out group-hover/control:after:bg-foreground/75 group-focus-within/control:after:bg-foreground data-dragging:after:scale-x-150 data-dragging:after:scale-y-110 data-dragging:after:bg-foreground group-data-disabled/control:after:bg-foreground/35 motion-reduce:after:transition-none',
              size === 'sm' && 'after:h-4',
              classNames?.thumb,
            )}
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
      <div
        className={cn(
          'pointer-events-none relative col-start-1 row-start-1 flex min-w-0 items-center justify-between gap-3 px-3.5 text-sm leading-5',
          size === 'sm' ? 'py-2' : 'py-2.5',
        )}
      >
        <SliderPrimitive.Label
          data-slot="control-slider-label"
          className={cn(
            'min-w-0 break-words text-muted-foreground transition-colors duration-150 group-data-dragging/control:text-foreground/80 motion-reduce:transition-none',
            classNames?.label,
          )}
        >
          {label}
        </SliderPrimitive.Label>
        <SliderPrimitive.Value
          data-slot="control-slider-value"
          className={cn(
            'max-w-1/2 shrink-0 break-words text-end font-medium tabular-nums text-foreground',
            classNames?.value,
          )}
        >
          {formatValue ? (_formatted, values) => formatValue(values[0]) : undefined}
        </SliderPrimitive.Value>
      </div>
    </SliderPrimitive.Root>
  );
}

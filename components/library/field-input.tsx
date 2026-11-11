'use client';

import { useId, type ComponentProps, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const fieldInputVariants = cva(
  'h-[var(--field-input-height)] w-full min-w-0 rounded-xl border px-[var(--field-input-px)] py-2 text-base shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_1px_2px_rgb(0_0_0/0.03)] outline-none transition-[border-color,background-color,box-shadow] duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20 md:text-[length:var(--field-input-label-size)] motion-reduce:transition-none',
  {
    variants: {
      variant: {
        default: 'border-input bg-secondary text-secondary-foreground dark:bg-secondary',
        outline: 'border-input bg-transparent text-foreground dark:bg-transparent',
        ghost: 'border-transparent bg-muted text-foreground shadow-none dark:bg-muted',
        underline:
          'rounded-none border-0 border-b-2 border-input bg-transparent px-0 text-foreground shadow-none focus-visible:border-ring focus-visible:ring-0 dark:bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

type NativeInputProps = Omit<ComponentProps<typeof Input>, 'children' | 'size'>;
export type FieldInputProps = NativeInputProps &
  VariantProps<typeof fieldInputVariants> & {
    size?: 'sm' | 'default' | 'lg';
    /** Native input size attribute, in characters. */
    htmlSize?: number;
    label?: string;
    labelVariant?: 'standard' | 'floating' | 'wave';
    icon?: ReactNode;
    iconPosition?: 'start' | 'end';
    /** Per-grapheme delay in milliseconds; total staggering is capped at 300ms. */
    waveDelay?: number;
    description?: ReactNode;
    /** Native props/ref for the outer layout; className/ref target the input itself. */
    containerProps?: Omit<ComponentProps<'div'>, 'children'>;
  };

const labelSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const animatedLabelTypes = new Set(['text', 'email', 'password', 'search', 'tel', 'url', 'number']);
const labelActive =
  'has-[input:focus]:[--field-label-y:calc(var(--field-input-height)/-2)] has-[input:not(:placeholder-shown)]:[--field-label-y:calc(var(--field-input-height)/-2)] has-[input:focus]:[--field-label-scale:0.85] has-[input:not(:placeholder-shown)]:[--field-label-scale:0.85]';
const labelPatch =
  'group-has-[input:focus]/field-input:bg-[linear-gradient(to_bottom,transparent_20%,var(--background)_40%,var(--background)_65%,transparent_85%)] group-has-[input:not(:placeholder-shown)]/field-input:bg-[linear-gradient(to_bottom,transparent_20%,var(--background)_40%,var(--background)_65%,transparent_85%)]';
const labelMotion =
  'inline-block origin-left translate-y-[var(--field-label-y)] scale-[var(--field-label-scale,1)] transition-[translate,scale,color] duration-200 ease-out group-has-[input:focus]/field-input:text-primary motion-reduce:transition-none rtl:origin-right';

/** One native input contract; label position comes from CSS, including autofilled values. */
export function FieldInput({
  label,
  labelVariant = 'standard',
  variant = 'default',
  size = 'default',
  htmlSize,
  icon,
  iconPosition = 'start',
  waveDelay = 24,
  description,
  containerProps,
  id,
  type = 'text',
  placeholder,
  className,
  'aria-describedby': describedBy,
  ...props
}: FieldInputProps) {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-input`;
  const descriptionId = `${generatedId}-description`;
  const animated = Boolean(label) && labelVariant !== 'standard' && animatedLabelTypes.has(type);
  const hasDescription = description !== undefined && description !== null && description !== false;
  const invalid = Boolean(props['aria-invalid']) && props['aria-invalid'] !== 'false';
  const graphemes =
    animated && labelVariant === 'wave' && label
      ? Array.from(labelSegmenter.segment(label), (part) => ({
          text: part.segment,
          offset: part.index,
        }))
      : [];
  const delay = Math.min(
    80,
    Math.max(0, Number.isFinite(waveDelay) ? waveDelay : 24),
    300 / Math.max(1, graphemes.length - 1),
  );
  const underline = variant === 'underline';
  return (
    <div
      {...containerProps}
      data-slot="field-input"
      className={cn('min-w-0', animated && 'pt-2', containerProps?.className)}
    >
      {label && !animated && (
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium leading-5">
          {label}
        </label>
      )}
      <div
        data-slot="field-input-control"
        data-variant={variant}
        data-size={size}
        data-invalid={invalid || undefined}
        className={cn(
          'group/field-input relative [--field-input-height:2.75rem] [--field-label-y:0px]',
          size === 'sm' &&
            '[--field-input-px:0.625rem] [--field-input-icon:0.875rem] [--field-input-adornment:2.25rem] [--field-input-label-size:0.75rem] md:[--field-input-height:2.25rem]',
          size === 'default' &&
            '[--field-input-px:0.75rem] [--field-input-icon:1rem] [--field-input-adornment:2.5rem] [--field-input-label-size:0.875rem] md:[--field-input-height:2.5rem]',
          size === 'lg' &&
            '[--field-input-height:3rem] [--field-input-px:1rem] [--field-input-icon:1.25rem] [--field-input-adornment:3rem] [--field-input-label-size:1rem]',
          animated && labelActive,
          underline &&
            'after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 has-[input:focus]:after:scale-x-100 data-invalid:after:bg-destructive motion-reduce:after:transition-none',
        )}
      >
        <Input
          {...props}
          id={inputId}
          type={type}
          size={htmlSize}
          placeholder={animated ? placeholder || ' ' : placeholder}
          aria-describedby={
            [describedBy, hasDescription ? descriptionId : undefined].filter(Boolean).join(' ') ||
            undefined
          }
          className={cn(
            fieldInputVariants({ variant }),
            animated && 'placeholder:text-transparent focus:placeholder:text-transparent',
            icon &&
              iconPosition === 'start' &&
              (underline
                ? 'ps-[calc(var(--field-input-icon)+0.75rem)]'
                : 'ps-[var(--field-input-adornment)]'),
            icon &&
              iconPosition === 'end' &&
              (underline
                ? 'pe-[calc(var(--field-input-icon)+0.75rem)]'
                : 'pe-[var(--field-input-adornment)]'),
            className,
          )}
        />
        {animated && label && (
          <label
            htmlFor={inputId}
            className={cn(
              'pointer-events-none absolute top-1/2 -translate-y-1/2 text-[length:var(--field-input-label-size)] leading-5 text-muted-foreground',
              'max-w-[calc(100%_-_var(--field-input-px)*2)]',
              icon && iconPosition === 'start'
                ? underline
                  ? 'start-[calc(var(--field-input-icon)+0.5rem)]'
                  : 'start-[calc(var(--field-input-adornment)-0.25rem)]'
                : underline
                  ? '-start-1'
                  : 'start-[calc(var(--field-input-px)-0.25rem)]',
              icon && 'max-w-[calc(100%_-_var(--field-input-adornment)_-_var(--field-input-px))]',
              props.disabled && 'opacity-50',
            )}
          >
            <span className="sr-only">{label}</span>
            <span
              aria-hidden="true"
              className="-my-6 block overflow-hidden text-ellipsis whitespace-pre px-1 py-6"
            >
              {labelVariant === 'wave' ? (
                graphemes.map(({ text, offset }, index) => (
                  <span
                    key={`${label}-${offset}`}
                    className={cn(labelMotion, labelPatch)}
                    style={{ transitionDelay: `${index * delay}ms` }}
                  >
                    {text}
                  </span>
                ))
              ) : (
                <span className={cn(labelMotion, labelPatch)}>{label}</span>
              )}
            </span>
          </label>
        )}
        {icon && (
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute top-1/2 inline-flex size-[var(--field-input-icon)] -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors duration-200 group-has-[input:focus]/field-input:text-primary motion-reduce:transition-none [&>svg]:size-full',
              iconPosition === 'start'
                ? underline
                  ? 'start-0'
                  : 'start-[var(--field-input-px)]'
                : underline
                  ? 'end-0'
                  : 'end-[var(--field-input-px)]',
              props.disabled && 'opacity-50',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      {hasDescription && (
        <p
          id={descriptionId}
          className={cn(
            'm-0 mt-1 text-xs leading-relaxed',
            invalid ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}

import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { PiSpinnerGapBold as Loader } from 'react-icons/pi';
import { cn } from '@/lib/utils';


// Based on shadcn's Base UI Button anatomy; all visual changes stay in the library.
const bevelButtonVariants = cva(
  "group/button relative isolate inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl border bg-clip-padding text-sm font-medium outline-none select-none transition-[box-shadow,translate,filter] duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/25 motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'border-[color-mix(in_oklch,var(--primary),black_35%)] bg-primary bg-[linear-gradient(180deg,rgb(255_255_255/0.16),rgb(255_255_255/0)_75%)] text-primary-foreground [text-shadow:0_1px_2px_color-mix(in_srgb,var(--primary),transparent_60%)] shadow-[inset_0_1.5px_0_rgb(255_255_255/0.22),inset_0_-1px_0_rgb(0_0_0/0.12),0_1px_1px_rgb(0_0_0/0.08),0_3px_6px_rgb(0_0_0/0.16)] hover:brightness-110 active:brightness-100 active:shadow-[inset_0_1px_3px_rgb(0_0_0/0.18),0_1px_2px_rgb(0_0_0/0.1)]',
        secondary:
          'border border-[color-mix(in_oklch,var(--secondary),black_8%)] bg-secondary bg-[linear-gradient(180deg,rgb(255_255_255/0.2),rgb(255_255_255/0)_80%)] text-secondary-foreground shadow-[inset_0_1.5px_0_rgb(255_255_255/0.8),inset_0_-1px_0_rgb(0_0_0/0.03),0_2px_4px_rgb(0_0_0/0.1)] hover:brightness-105 active:shadow-[inset_0_1px_3px_rgb(0_0_0/0.1),0_1px_2px_rgb(0_0_0/0.04)] dark:shadow-[inset_0_1.5px_0_rgb(255_255_255/0.18),inset_0_-1px_0_rgb(0_0_0/0.1),0_2px_4px_rgb(0_0_0/0.16)] dark:active:shadow-[inset_0_1px_3px_rgb(0_0_0/0.2),0_1px_2px_rgb(0_0_0/0.08)]',
        outline:
          'border-border bg-card text-card-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_1px_2px_rgb(0_0_0/0.06)] hover:bg-accent active:shadow-inner',
        ghost: 'border-transparent text-foreground hover:bg-accent active:bg-accent/80',
        destructive:
          'border-[color-mix(in_oklch,var(--destructive),black_20%)] bg-destructive bg-[linear-gradient(180deg,rgb(255_255_255/0.14),transparent)] text-destructive-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_2px_4px_rgb(0_0_0/0.12)] hover:brightness-110 active:shadow-inner focus-visible:ring-destructive/40',
        link: 'border-transparent text-primary underline-offset-4 hover:underline motion-safe:active:not-aria-[haspopup]:translate-y-0',
      },
      size: {
        default: 'h-11 gap-2 px-4 md:h-10',
        xs: 'h-11 gap-1 px-2.5 text-xs md:h-7 [&_svg:not([class*=size-])]:size-3',
        sm: 'h-11 gap-1.5 px-3 text-xs md:h-8 [&_svg:not([class*=size-])]:size-3.5',
        lg: 'h-12 gap-2 px-6 text-base',
        icon: 'size-11 md:size-10',
        'icon-xs': 'size-11 md:size-7 [&_svg:not([class*=size-])]:size-3',
        'icon-sm': 'size-11 md:size-8 [&_svg:not([class*=size-])]:size-3.5',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export type BevelButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof bevelButtonVariants> & {
    /** Prevent repeated activation and display an inline spinner without replacing the label. */
    loading?: boolean;
  };

function BevelButton({
  className,
  variant = 'default',
  size = 'default',
  type = 'button',
  loading = false,
  disabled,
  children,
  'aria-busy': ariaBusy,
  ...props
}: BevelButtonProps) {
  return (
    <ButtonPrimitive
      {...props}
      type={type}
      data-slot="bevel-button"
      className={cn(bevelButtonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || ariaBusy}
    >
      {loading && (
        <Loader
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      )}
      {children}
    </ButtonPrimitive>
  );
}

export { BevelButton, bevelButtonVariants };

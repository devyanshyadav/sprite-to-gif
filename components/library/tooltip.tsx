'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from '@/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export type TooltipProps<Payload = unknown> = TooltipPrimitive.Root.Props<Payload>;

const tooltipSizes = {
  sm: '[--tooltip-tip-width:1.2rem] [--tooltip-tip-height:0.5rem] [--tooltip-padding-x:0.625rem] px-2.5 py-1.5 text-xs [&_svg:not([class*="size-"])]:size-3',
  default:
    '[--tooltip-tip-width:1.5rem] [--tooltip-tip-height:0.625rem] [--tooltip-padding-x:0.75rem] px-3 py-2 text-sm [&_svg:not([class*="size-"])]:size-3.5',
  lg: '[--tooltip-tip-width:1.8rem] [--tooltip-tip-height:0.75rem] [--tooltip-padding-x:1rem] px-4 py-2.5 text-base [&_svg:not([class*="size-"])]:size-4',
} as const;

const tooltipSurfaces = {
  default: '',
  fancy:
    'before:pointer-events-none before:absolute before:inset-x-2 before:-top-0.5 before:h-0.5 before:bg-[linear-gradient(90deg,#fb7185,#fb923c,#facc15,#4ade80,#38bdf8,#a78bfa,#f472b6)] before:opacity-90 before:[mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]',
  bevel:
    'bg-[linear-gradient(180deg,rgb(255_255_255/0.16),rgb(255_255_255/0)_75%)] [text-shadow:0_1px_2px_color-mix(in_srgb,var(--foreground),transparent_60%)] shadow-[inset_0_1.5px_0_rgb(255_255_255/0.22),inset_0_-1px_0_rgb(0_0_0/0.12),0_1px_1px_rgb(0_0_0/0.08),0_3px_6px_rgb(0_0_0/0.16)]',
} as const;

export type TooltipContentProps = TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    'side' | 'sideOffset' | 'align' | 'alignOffset' | 'collisionPadding' | 'collisionAvoidance'
  > & {
    variant?: keyof typeof tooltipSurfaces;
    size?: keyof typeof tooltipSizes;
    /** Show the curved notch. Defaults to true. */
    arrow?: boolean;
    /** Animate a shared popup between multiple triggers and their payloads. */
    animated?: boolean;
    portalProps?: Omit<TooltipPrimitive.Portal.Props, 'children'>;
  };

/** Base UI owns delay, hover/focus, dismissal, positioning, and exit presence. */
export function TooltipContent({
  variant = 'bevel',
  size = 'default',
  side = 'top',
  sideOffset = 10,
  align = 'center',
  alignOffset = 0,
  collisionPadding = 8,
  collisionAvoidance,
  arrow = true,
  animated = false,
  portalProps,
  className,
  children,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal {...portalProps}>
      <TooltipPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        collisionAvoidance={collisionAvoidance}
        className={cn(
          'isolate z-50 max-w-[calc(100vw-1rem)]',
          animated &&
            'w-[var(--positioner-width)] h-[var(--positioner-height)] transition-[left,right,top,bottom] duration-200 ease-out data-[instant=focus]:transition-none data-[instant=dismiss]:transition-none motion-reduce:transition-none',
        )}
      >
        <TooltipPrimitive.Popup
          {...props}
          data-slot="tooltip-content"
          data-variant={variant}
          data-size={size}
          data-animated={animated || undefined}
          className={(state) =>
            cn(
              '[--tooltip-surface:var(--foreground)] [--tooltip-ink:var(--background)] [--tooltip-border:transparent] relative w-max max-w-[min(20rem,var(--available-width))] origin-[var(--transform-origin)] rounded-xl border border-[var(--tooltip-border)] bg-[var(--tooltip-surface)] leading-relaxed text-[var(--tooltip-ink)] shadow-md outline-none [overflow-wrap:anywhere] transition-[opacity,scale,filter] duration-150 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0 motion-safe:data-starting-style:scale-95 motion-safe:data-starting-style:blur-[3px] motion-safe:data-ending-style:scale-95 motion-safe:data-ending-style:blur-[3px] motion-reduce:transition-none',
              animated
                ? 'w-[var(--popup-width,auto)] h-[var(--popup-height,auto)] transition-[width,height,opacity,scale,filter] duration-200 data-[instant=focus]:transition-none data-[instant=dismiss]:transition-none'
                : 'data-instant:transition-none',
              tooltipSizes[size],
              tooltipSurfaces[variant],
              typeof className === 'function' ? className(state) : className,
            )
          }
        >
          {animated ? (
            <TooltipPrimitive.Viewport
              data-slot="tooltip-viewport"
              className="relative overflow-hidden [--tooltip-shift:0px] [&[data-activation-direction~=right]]:[--tooltip-shift:0.5rem] [&[data-activation-direction~=left]]:[--tooltip-shift:-0.5rem] [&>[data-current]]:w-max [&>[data-current]]:max-w-[calc(min(20rem,var(--available-width))_-_2_*_var(--tooltip-padding-x)_-_2px)] [&>[data-current]]:transition-[opacity,translate,filter] [&>[data-current]]:duration-200 [&>[data-current]]:ease-out [&>[data-current][data-starting-style]]:opacity-0 [&>[data-previous]]:inset-0 [&>[data-previous]]:w-[calc(var(--popup-width)_-_2_*_var(--tooltip-padding-x)_-_2px)] [&>[data-previous]]:pointer-events-none [&>[data-previous]]:transition-[opacity,translate,filter] [&>[data-previous]]:duration-200 [&>[data-previous][data-ending-style]]:opacity-0 motion-safe:[&>[data-current][data-starting-style]]:translate-x-[var(--tooltip-shift)] motion-safe:[&>[data-current][data-starting-style]]:blur-[2px] motion-safe:[&>[data-previous][data-ending-style]]:translate-x-[calc(-1*var(--tooltip-shift))] motion-safe:[&>[data-previous][data-ending-style]]:blur-[2px] motion-reduce:[&>[data-current]]:transition-none motion-reduce:[&>[data-previous]]:transition-none data-[instant=focus]:[&>[data-current]]:transition-none data-[instant=focus]:[&>[data-previous]]:transition-none data-[instant=dismiss]:[&>[data-current]]:transition-none data-[instant=dismiss]:[&>[data-previous]]:transition-none"
            >
              {children}
            </TooltipPrimitive.Viewport>
          ) : (
            children
          )}
          {arrow && (
            <TooltipPrimitive.Arrow
              aria-hidden="true"
              data-slot="tooltip-arrow"
              className="pointer-events-none absolute h-[var(--tooltip-tip-height)] w-[var(--tooltip-tip-width)] [--tooltip-tip-offset:calc((var(--tooltip-tip-width)_+_var(--tooltip-tip-height))_/_2)] text-[var(--tooltip-surface)] data-[side=top]:-bottom-[var(--tooltip-tip-height)] data-[side=bottom]:-top-[var(--tooltip-tip-height)] data-[side=bottom]:rotate-180 data-[side=left]:-right-[var(--tooltip-tip-offset)] data-[side=left]:-rotate-90 data-[side=right]:-left-[var(--tooltip-tip-offset)] data-[side=right]:rotate-90 data-[side=inline-start]:-end-[var(--tooltip-tip-offset)] data-[side=inline-start]:-rotate-90 rtl:data-[side=inline-start]:rotate-90 data-[side=inline-end]:-start-[var(--tooltip-tip-offset)] data-[side=inline-end]:rotate-90 rtl:data-[side=inline-end]:-rotate-90 data-uncentered:hidden"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 10"
                className="block size-full overflow-visible"
                focusable="false"
              >
                <path d="M0 -1H24V0C17 0 16 9 12 9S7 0 0 0Z" fill="currentColor" />
                <path
                  d="M0 0C7 0 8 9 12 9S17 0 24 0"
                  fill="none"
                  stroke="var(--tooltip-border)"
                  strokeWidth="1"
                />
              </svg>
            </TooltipPrimitive.Arrow>
          )}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

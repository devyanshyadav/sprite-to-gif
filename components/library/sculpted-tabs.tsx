'use client';

import { Separator } from '@/components/library/separator';
import { useCallback, type ComponentProps } from 'react';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { useSlidingHighlight } from '@/components/library/use-sliding-highlight';
import { cn } from '@/lib/utils';

function partClasses<State>(base: string, value?: string | ((state: State) => string | undefined)) {
  return typeof value === 'function' ? (state: State) => cn(base, value(state)) : cn(base, value);
}

export function SculptedTabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      {...props}
      data-slot="sculpted-tabs"
      className={partClasses(
        'flex min-w-0 flex-col gap-6 data-[orientation=vertical]:flex-row',
        className,
      )}
    />
  );
}

export type SculptedTabsListProps = TabsPrimitive.List.Props & {
  variant?: 'pill' | 'connected' | 'dot' | 'underline' | 'segmented' | 'outline';
  size?: 'sm' | 'default' | 'lg';
  slidingHighlight?: boolean;
};

export function SculptedTabsList({
  variant = 'pill',
  size = 'default',
  slidingHighlight = true,
  className,
  children,
  ref,
  ...props
}: SculptedTabsListProps) {
  const { containerRef, highlightStyle } = useSlidingHighlight({
    itemSelector:
      '[data-slot=sculpted-tabs-trigger]:not([data-disabled]):not([aria-selected=true])',
    disabled: !slidingHighlight,
  });
  const listRef = useCallback(
    (node: HTMLDivElement | null) => {
      const cleanupHighlight = containerRef(node);
      const cleanupRef = typeof ref === 'function' ? ref(node) : undefined;
      if (ref && typeof ref !== 'function') ref.current = node;
      return () => {
        cleanupHighlight?.();
        if (typeof cleanupRef === 'function') cleanupRef();
        else if (typeof ref === 'function') ref(null);
        else if (ref) ref.current = null;
      };
    },
    [containerRef, ref],
  );

  return (
    <TabsPrimitive.List
      {...props}
      ref={listRef}
      data-slot="sculpted-tabs-list"
      data-variant={variant}
      data-size={size}
      className={partClasses(
        cn(
          'group/sculpted-list relative isolate flex min-w-0 w-fit [--tabs-radius:var(--radius-2xl,1rem)] [--tabs-inset:0.25rem] [--tabs-inner-radius:max(0px,calc(var(--tabs-radius)_-_var(--tabs-inset)_-_1px))] max-w-full shrink-0 items-center gap-1 overflow-x-auto overscroll-x-contain rounded-[var(--tabs-radius)] border border-border bg-muted/70 p-[var(--tabs-inset)] text-muted-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_1px_2px_rgb(0_0_0/0.03)] data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:overflow-x-visible',
          size === 'sm' &&
            '[--tabs-height:2rem] [--tabs-py:0.4375rem] [--tabs-leading:1rem] [--tabs-px:0.75rem] [--tabs-font:0.75rem] [--tabs-icon:0.875rem]',
          size === 'default' &&
            '[--tabs-height:2.125rem] [--tabs-py:0.4375rem] [--tabs-leading:1.25rem] [--tabs-px:1rem] [--tabs-font:0.875rem] [--tabs-icon:1rem]',
          size === 'lg' &&
            '[--tabs-height:2.75rem] [--tabs-py:0.625rem] [--tabs-leading:1.5rem] [--tabs-px:1.25rem] [--tabs-font:1rem] [--tabs-icon:1.125rem]',
          variant === 'connected' &&
            '[--tabs-inset:0.5rem] gap-1 rounded-b-none border-b-0 px-3 pb-0 pt-[var(--tabs-inset)] shadow-none data-[orientation=vertical]:[--tabs-inset:0.25rem] data-[orientation=vertical]:rounded-[var(--tabs-radius)] data-[orientation=vertical]:border-b data-[orientation=vertical]:p-[var(--tabs-inset)]',
          variant === 'underline' &&
            '[--tabs-inset:0px] [--tabs-inner-radius:var(--radius-lg,0.625rem)] gap-2 rounded-none border-0 bg-transparent p-0 shadow-none',
          variant === 'segmented' &&
            'w-full [--tabs-radius:var(--radius-xl,0.75rem)] [--tabs-inset:0.1875rem] bg-muted shadow-none',
          variant === 'outline' && 'border-transparent bg-transparent shadow-none',
        ),
        className,
      )}
    >
      {slidingHighlight && (
        <span
          aria-hidden="true"
          style={highlightStyle}
          className="pointer-events-none absolute z-0 rounded-[var(--tabs-inner-radius)] bg-accent transition-[transform,width,height,opacity] duration-200 ease-out motion-reduce:transition-none"
        />
      )}
      {children}
      {variant === 'underline' && (
        <>
          <Separator className="absolute inset-x-0 bottom-0 group-data-[orientation=vertical]/sculpted-list:hidden" />
          <Separator
            orientation="vertical"
            className="absolute inset-y-0 end-0 hidden group-data-[orientation=vertical]/sculpted-list:block"
          />
        </>
      )}
      <TabsPrimitive.Indicator
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-0 top-0 z-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-(--active-tab-top) rounded-[var(--tabs-inner-radius)] bg-card shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_3px_rgb(0_0_0/0.08)] transition-[translate,width,height] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          variant === 'connected' &&
            'data-[orientation=vertical]:rounded-[var(--tabs-inner-radius)] data-[orientation=vertical]:before:hidden data-[orientation=vertical]:after:hidden rounded-b-none shadow-[inset_0_1px_0_rgb(255_255_255/0.14)] before:absolute before:bottom-0 before:-left-3 before:size-3 before:rounded-br-md before:shadow-[4px_4px_0_0_var(--card)] after:absolute after:bottom-0 after:-right-3 after:size-3 after:rounded-bl-md after:shadow-[-4px_4px_0_0_var(--card)]',
          variant === 'dot' &&
            'bg-transparent shadow-none after:absolute after:bottom-1.5 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary after:shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_25%,transparent)] data-[orientation=vertical]:after:bottom-1/2 data-[orientation=vertical]:after:left-2 data-[orientation=vertical]:after:translate-y-1/2',
          variant === 'underline' &&
            'rounded-none bg-transparent shadow-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary data-[orientation=vertical]:after:inset-x-auto data-[orientation=vertical]:after:inset-y-2 data-[orientation=vertical]:after:end-0 data-[orientation=vertical]:after:h-auto data-[orientation=vertical]:after:w-0.5',
          variant === 'outline' &&
            'border border-border bg-transparent shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]',
        )}
      />
    </TabsPrimitive.List>
  );
}

export function SculptedTabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      {...props}
      data-slot="sculpted-tabs-trigger"
      className={partClasses(
        'relative z-10 inline-flex min-h-11 flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--tabs-inner-radius)] px-[var(--tabs-px)] py-[var(--tabs-py)] text-[length:var(--tabs-font)] leading-[var(--tabs-leading)] font-medium outline-none transition-colors duration-200 hover:text-accent-foreground data-active:text-card-foreground data-disabled:pointer-events-none data-disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-[var(--tabs-height)] data-[orientation=vertical]:w-full data-[orientation=vertical]:flex-none data-[orientation=vertical]:justify-start group-data-[variant=connected]/sculpted-list:rounded-b-none group-data-[variant=connected]/sculpted-list:data-[orientation=vertical]:rounded-[var(--tabs-inner-radius)] group-data-[variant=dot]/sculpted-list:pb-[calc(var(--tabs-py)+0.25rem)] group-data-[variant=dot]/sculpted-list:data-[orientation=vertical]:py-[var(--tabs-py)] group-data-[variant=dot]/sculpted-list:data-[orientation=vertical]:ps-5 group-data-[variant=dot]/sculpted-list:data-active:text-primary group-data-[variant=underline]/sculpted-list:data-active:text-primary group-data-[variant=outline]/sculpted-list:data-active:text-foreground motion-reduce:transition-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-[var(--tabs-icon)]',
        className,
      )}
    />
  );
}

/** Overlap entering/exiting panels without duplicating primitive selection or mount state. */
export function SculptedTabsViewport({
  slide = false,
  className,
  ...props
}: ComponentProps<'div'> & { slide?: boolean }) {
  return (
    <div
      {...props}
      data-slot="sculpted-tabs-viewport"
      data-slide={slide ? '' : undefined}
      className={cn('grid min-w-0 flex-1 overflow-hidden', className)}
    />
  );
}

export function SculptedTabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      {...props}
      data-slot="sculpted-tabs-content"
      className={partClasses(
        'col-start-1 row-start-1 min-w-0 flex-1 rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [[data-slot=sculpted-tabs-viewport][data-slide]>&]:transition-[opacity,translate] [[data-slot=sculpted-tabs-viewport][data-slide]>&]:duration-250 [[data-slot=sculpted-tabs-viewport][data-slide]>&]:ease-[cubic-bezier(0.22,1,0.36,1)] [[data-slot=sculpted-tabs-viewport][data-slide]>&]:data-starting-style:opacity-0 [[data-slot=sculpted-tabs-viewport][data-slide]>&]:data-ending-style:opacity-0 [[data-slot=sculpted-tabs-viewport][data-slide]>&]:data-ending-style:pointer-events-none motion-safe:[[data-slot=sculpted-tabs-viewport][data-slide]>&]:data-[activation-direction=right]:data-starting-style:translate-x-4 motion-safe:[[data-slot=sculpted-tabs-viewport][data-slide]>&]:data-[activation-direction=right]:data-ending-style:-translate-x-4 motion-safe:[[data-slot=sculpted-tabs-viewport][data-slide]>&]:data-[activation-direction=left]:data-starting-style:-translate-x-4 motion-safe:[[data-slot=sculpted-tabs-viewport][data-slide]>&]:data-[activation-direction=left]:data-ending-style:translate-x-4 motion-safe:[[data-slot=sculpted-tabs-viewport][data-slide]>&]:data-[activation-direction=down]:data-starting-style:translate-y-4 motion-safe:[[data-slot=sculpted-tabs-viewport][data-slide]>&]:data-[activation-direction=down]:data-ending-style:-translate-y-4 motion-safe:[[data-slot=sculpted-tabs-viewport][data-slide]>&]:data-[activation-direction=up]:data-starting-style:-translate-y-4 motion-safe:[[data-slot=sculpted-tabs-viewport][data-slide]>&]:data-[activation-direction=up]:data-ending-style:translate-y-4 motion-reduce:[[data-slot=sculpted-tabs-viewport][data-slide]>&]:transition-none motion-reduce:[[data-slot=sculpted-tabs-viewport][data-slide]>&]:translate-none',
        className,
      )}
    />
  );
}

'use client';

import { Separator } from '@/components/library/separator';
import {
  createContext,
  useContext,
  useCallback,
  useId,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import {
  PiCaretDownBold,
  PiCaretUpBold,
  PiCheckBold,
} from 'react-icons/pi';
import { cn } from '@/lib/utils';
import { useSlidingHighlight } from '@/components/library/use-sliding-highlight';

const TRIGGER_CHEVRON = (
  <PiCaretDownBold
    aria-hidden="true"
    className="pointer-events-none ms-auto size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-popup-open/field-select:rotate-180 motion-reduce:transition-none"
  />
);

const SCROLL_UP_ICON = <PiCaretUpBold aria-hidden="true" className="size-3.5" />;
const SCROLL_DOWN_ICON = <PiCaretDownBold aria-hidden="true" className="size-3.5" />;
const CHECK_INDICATOR = <PiCheckBold className="size-4" />;
const DOT_INDICATOR = <span className="size-1.5 rounded-full bg-current" />;
const BAR_INDICATOR = <span className="h-4 w-0.75 rounded-full bg-current" />;

const HIGHLIGHT_SELECTOR =
  '[data-slot="field-select-item"]:not([data-disabled]):not([aria-disabled="true"])';

function partClasses<State>(
  ...values: (string | false | undefined | ((state: State) => string | undefined))[]
) {
  for (let i = 0; i < values.length; i++) {
    if (typeof values[i] === 'function') {
      return (state: State) => cn(values.map((v) => (typeof v === 'function' ? v(state) : v)));
    }
  }
  return cn(values as (string | false | undefined)[]);
}

/** Preserve Base UI's generic root API, including controlled state and form behavior. */
const PopupStyleContext = createContext<'floating' | 'joined'>('floating');

export function FieldSelect<Value = string, Multiple extends boolean | undefined = false>({
  popupStyle = 'floating',
  ...props
}: FieldSelectProps<Value, Multiple>) {
  return (
    <PopupStyleContext.Provider value={popupStyle}>
      <SelectPrimitive.Root {...props} />
    </PopupStyleContext.Provider>
  );
}
export type FieldSelectProps<
  Value = string,
  Multiple extends boolean | undefined = false,
> = SelectPrimitive.Root.Props<Value, Multiple> & { popupStyle?: 'floating' | 'joined' };

export function FieldSelectField({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      data-slot="field-select"
      className={cn('relative w-full min-w-0 max-w-sm', className)}
    />
  );
}

export type FieldSelectFieldLabelProps = SelectPrimitive.Label.Props & {
  placement?: 'above' | 'floating' | 'inset';
};

export function FieldSelectFieldLabel({
  className,
  placement = 'above',
  ...props
}: FieldSelectFieldLabelProps) {
  return (
    <SelectPrimitive.Label
      {...props}
      data-slot="field-select-label"
      className={partClasses(
        'block w-fit max-w-full break-words text-sm font-medium leading-5 text-foreground',
        placement === 'above' && 'mb-2',
        placement === 'floating' &&
          'absolute start-3 top-0 z-10 -translate-y-1/2 bg-[linear-gradient(to_bottom,transparent_0%,var(--background)_45%,var(--background)_100%)] px-1 text-xs leading-4 text-muted-foreground',
        placement === 'inset' &&
          'absolute start-3 top-2 z-10 max-w-[calc(100%-3rem)] text-[11px] leading-4 text-muted-foreground',
        className,
      )}
    />
  );
}

export type FieldSelectTriggerProps = SelectPrimitive.Trigger.Props & {
  size?: 'default' | 'sm' | 'inset';
};

export function FieldSelectTrigger({
  className,
  children,
  size = 'default',
  ...props
}: FieldSelectTriggerProps) {
  const popupStyle = useContext(PopupStyleContext);
  return (
    <SelectPrimitive.Trigger
      {...props}
      data-slot="field-select-trigger"
      data-size={size}
      className={partClasses(
        'group/field-select flex w-full min-w-0 items-center gap-2 rounded-xl border border-input bg-background dark:bg-input/30 px-3 py-2 text-start text-sm text-foreground shadow-sm outline-none transition-[border-color,box-shadow,background-color] duration-150 hover:border-ring/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 data-popup-open:border-ring data-popup-open:ring-3 data-popup-open:ring-ring/10 data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 motion-reduce:transition-none',
        size === 'sm' ? 'min-h-9' : 'min-h-11',
        size === 'inset' && 'min-h-14 pt-6 pb-2',
        popupStyle === 'joined' &&
          'md:data-popup-open:data-[popup-side=bottom]:rounded-b-none md:data-popup-open:data-[popup-side=top]:rounded-t-none',
        className,
      )}
    >
      {children}
      <SelectPrimitive.Icon render={TRIGGER_CHEVRON} />
    </SelectPrimitive.Trigger>
  );
}

export function FieldSelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      {...props}
      data-slot="field-select-value"
      className={partClasses(
        'flex min-w-0 flex-1 break-words text-start [overflow-wrap:anywhere] data-placeholder:text-muted-foreground',
        className,
      )}
    />
  );
}

export type FieldSelectContentProps = SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    'side' | 'align' | 'sideOffset' | 'alignOffset' | 'alignItemWithTrigger'
  > & {
    slidingHighlight?: boolean;
    /** Use the same Select popup as a modal picker below 768px. */
    /** Disable adaptive presentation. */
    responsive?: boolean;
    mobileTitle?: ReactNode;
    listProps?: Omit<SelectPrimitive.List.Props, 'children'>;
    portalProps?: Omit<SelectPrimitive.Portal.Props, 'children'>;
  };

export function FieldSelectContent({
  className,
  children,
  slidingHighlight = true,
  responsive = true,
  mobileTitle = 'Choose an option',
  side = 'bottom',
  align = 'center',
  sideOffset,
  alignOffset = 0,
  alignItemWithTrigger = true,
  listProps,
  portalProps,
  ...props
}: FieldSelectContentProps) {
  const popupStyle = useContext(PopupStyleContext);
  const animateDropdown = !alignItemWithTrigger;

  const { containerRef, highlightStyle } = useSlidingHighlight({
    itemSelector: HIGHLIGHT_SELECTOR,
    disabled: !slidingHighlight,
  });

  const consumerRef = listProps?.ref;
  const listRef = useCallback(
    (node: HTMLDivElement | null) => {
      const cleanupHighlight = containerRef(node);
      if (!consumerRef) return cleanupHighlight;

      const cleanupConsumer = typeof consumerRef === 'function' ? consumerRef(node) : undefined;
      if (typeof consumerRef !== 'function') consumerRef.current = node;

      return () => {
        cleanupHighlight?.();
        if (typeof cleanupConsumer === 'function') cleanupConsumer();
        else if (typeof consumerRef === 'function') consumerRef(null);
        else consumerRef.current = null;
      };
    },
    [containerRef, consumerRef],
  );

  return (
    <SelectPrimitive.Portal {...portalProps}>
      {responsive && (
        <SelectPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none md:hidden" />
      )}
      <SelectPrimitive.Positioner
        side={side}
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset ?? (popupStyle === 'joined' ? 0 : 4)}
        alignItemWithTrigger={alignItemWithTrigger}
        className={cn(
          'isolate z-50',
          // Pure CSS bottom-sheet override below 768px — bypasses JS floating math on phones
          responsive &&
            'max-md:!fixed max-md:!inset-x-0 max-md:!bottom-0 max-md:!top-auto max-md:!w-full max-md:!max-w-none max-md:!transform-none',
        )}
      >
        <SelectPrimitive.Popup
          {...props}
          data-slot="field-select-popup"
          data-align-trigger={alignItemWithTrigger}
          data-mobile-modal={responsive ? '' : undefined}
          className={partClasses(
            'relative isolate z-50 max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-md outline-none transition-[opacity,scale,filter] duration-150 ease-out motion-reduce:transition-none motion-reduce:blur-none',
            animateDropdown &&
              'data-starting-style:opacity-0 motion-safe:data-starting-style:blur-[2px] data-ending-style:opacity-0 motion-safe:data-ending-style:blur-[2px]',
            animateDropdown &&
              popupStyle === 'floating' &&
              'motion-safe:data-starting-style:scale-95 motion-safe:data-ending-style:scale-95',
            alignItemWithTrigger && 'md:transition-none',
            popupStyle === 'joined' &&
              'md:data-[side=bottom]:rounded-t-none md:data-[side=top]:rounded-b-none',
            responsive &&
              'max-md:flex max-md:w-full max-md:max-w-none max-md:max-h-[85dvh] max-md:flex-col max-md:rounded-b-none max-md:rounded-t-2xl max-md:border-x-0 max-md:border-b-0 max-md:transition-[opacity,translate] max-md:duration-200 max-md:motion-safe:data-starting-style:translate-y-4 max-md:data-starting-style:opacity-0 max-md:motion-safe:data-ending-style:translate-y-4 max-md:data-ending-style:opacity-0 max-md:data-starting-style:scale-100 max-md:data-ending-style:scale-100 max-md:data-starting-style:blur-none max-md:data-ending-style:blur-none max-md:motion-reduce:translate-y-0',
            className,
          )}
        >
          {responsive && (
            <div
              data-slot="field-select-mobile-header"
              className="relative mx-1 mt-1 shrink-0 rounded-t-[max(0px,calc(var(--radius-2xl,1rem)-0.25rem))] px-3 py-3 md:hidden"
            >
              <p className="m-0 break-words text-base font-semibold leading-6">{mobileTitle}</p>
              <Separator className="absolute inset-x-1 bottom-0 w-auto" />
            </div>
          )}
          <FieldSelectScrollUpButton className={responsive ? 'max-md:hidden' : undefined} />
          <SelectPrimitive.List
            {...listProps}
            ref={listRef}
            data-slot="field-select-list"
            data-mobile-modal={responsive ? '' : undefined}
            data-sliding-highlight={slidingHighlight ? '' : undefined}
            className={partClasses(
              'group/field-select-list relative isolate max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]',
              responsive &&
                'max-md:min-h-0 max-md:max-h-[65dvh] max-md:px-2 max-md:pt-2 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom))]',
              listProps?.className,
            )}
          >
            {slidingHighlight && (
              <span
                aria-hidden="true"
                data-slot="field-select-highlight"
                style={highlightStyle}
                className="-z-10 rounded-md bg-accent transition-[transform,width,height,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              />
            )}
            {children}
          </SelectPrimitive.List>
          <FieldSelectScrollDownButton className={responsive ? 'max-md:hidden' : undefined} />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

export function FieldSelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      {...props}
      data-slot="field-select-group"
      className={partClasses('scroll-my-1 p-1', className)}
    />
  );
}

export type FieldSelectLabelProps = SelectPrimitive.GroupLabel.Props;

export function FieldSelectLabel({ className, ...props }: FieldSelectLabelProps) {
  return (
    <SelectPrimitive.GroupLabel
      {...props}
      data-slot="field-select-group-label"
      className={partClasses('px-2.5 py-1.5 text-xs font-medium text-muted-foreground', className)}
    />
  );
}

export type FieldSelectItemProps = SelectPrimitive.Item.Props & {
  icon?: ReactNode;
  description?: ReactNode;
  /** A built-in selected marker, a custom FieldSelectItemIndicator, or false to hide it. */
  indicator?: FieldSelectIndicatorVariant | ReactElement | false | null;
};

function FieldSelectItemWithDescription({
  description,
  describedBy,
  children,
  ...props
}: FieldSelectItemProps & { describedBy?: string }) {
  const id = useId();
  const descId = `${id}-description`;
  return (
    <FieldSelectItemBase
      {...props}
      aria-describedby={describedBy ? `${describedBy} ${descId}` : descId}
      descriptionNode={
        <span
          id={descId}
          data-slot="field-select-item-description"
          className="block min-w-0 break-words text-xs leading-relaxed text-muted-foreground"
        >
          {description}
        </span>
      }
    >
      {children}
    </FieldSelectItemBase>
  );
}

function FieldSelectItemBase({
  className,
  children,
  icon,
  descriptionNode,
  indicator = 'check',
  ...props
}: Omit<FieldSelectItemProps, 'description'> & { descriptionNode?: ReactNode }) {
  const hasDescription = descriptionNode != null;
  return (
    <SelectPrimitive.Item
      {...props}
      data-slot="field-select-item"
      className={partClasses(
        'group-data-mobile-modal/field-select-list:max-md:min-h-11 relative flex w-full min-w-0 cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 pe-8 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground group-data-sliding-highlight/field-select-list:data-highlighted:bg-transparent data-disabled:pointer-events-none data-disabled:opacity-40',
        hasDescription && 'grid grid-cols-1 gap-y-1',
        hasDescription && icon != null && 'grid-cols-[1.25rem_minmax(0,1fr)]',
        (indicator === false || indicator === null) && 'pe-2.5',
        className,
      )}
    >
      {icon != null && (
        <span
          aria-hidden="true"
          className={cn(
            'flex size-5 shrink-0 items-center justify-center text-muted-foreground [&>svg]:size-4',
            hasDescription && 'row-span-2',
          )}
        >
          {icon}
        </span>
      )}
      <SelectPrimitive.ItemText className="min-w-0 flex-1 break-words leading-5 [overflow-wrap:anywhere]">
        {children}
      </SelectPrimitive.ItemText>
      {descriptionNode}
      {typeof indicator === 'string' ? <FieldSelectItemIndicator variant={indicator} /> : indicator}
    </SelectPrimitive.Item>
  );
}

export function FieldSelectItem({
  description,
  'aria-describedby': describedBy,
  ...props
}: FieldSelectItemProps) {
  if (description != null && description !== false) {
    return (
      <FieldSelectItemWithDescription
        {...props}
        description={description}
        describedBy={describedBy}
      />
    );
  }
  return <FieldSelectItemBase {...props} aria-describedby={describedBy} />;
}

export type FieldSelectIndicatorVariant = 'check' | 'dot' | 'bar';
export type FieldSelectItemIndicatorProps = SelectPrimitive.ItemIndicator.Props & {
  variant?: FieldSelectIndicatorVariant;
};

/** Visual selected marker; the primitive controls visibility and option semantics. */
export function FieldSelectItemIndicator({
  className,
  children,
  variant = 'check',
  ...props
}: FieldSelectItemIndicatorProps) {
  return (
    <SelectPrimitive.ItemIndicator
      {...props}
      aria-hidden="true"
      data-slot="field-select-item-indicator"
      data-variant={variant}
      className={partClasses(
        'pointer-events-none absolute end-2.5 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-primary',
        className,
      )}
    >
      {children ??
        (variant === 'dot' ? DOT_INDICATOR : variant === 'bar' ? BAR_INDICATOR : CHECK_INDICATOR)}
    </SelectPrimitive.ItemIndicator>
  );
}

export function FieldSelectDescription({
  className,
  invalid = false,
  ...props
}: ComponentProps<'p'> & { invalid?: boolean }) {
  return (
    <p
      {...props}
      data-slot="field-select-description"
      className={cn(
        'm-0 mt-1 break-words text-xs leading-relaxed',
        invalid ? 'text-destructive' : 'text-muted-foreground',
        className,
      )}
    />
  );
}

export function FieldSelectScrollUpButton({
  className,
  children,
  ...props
}: SelectPrimitive.ScrollUpArrow.Props) {
  return (
    <SelectPrimitive.ScrollUpArrow
      {...props}
      data-slot="field-select-scroll-up"
      className={partClasses(
        'absolute inset-x-0 top-0 z-10 flex h-6 items-center justify-center bg-popover/95',
        className,
      )}
    >
      {children ?? SCROLL_UP_ICON}
    </SelectPrimitive.ScrollUpArrow>
  );
}

export function FieldSelectScrollDownButton({
  className,
  children,
  ...props
}: SelectPrimitive.ScrollDownArrow.Props) {
  return (
    <SelectPrimitive.ScrollDownArrow
      {...props}
      data-slot="field-select-scroll-down"
      className={partClasses(
        'absolute inset-x-0 bottom-0 z-10 flex h-6 items-center justify-center bg-popover/95',
        className,
      )}
    >
      {children ?? SCROLL_DOWN_ICON}
    </SelectPrimitive.ScrollDownArrow>
  );
}

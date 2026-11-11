'use client';

import { Separator } from '@/components/library/separator';
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import {
  PiArrowLeftBold as BackIcon,
  PiCheckBold as CheckIcon,
  PiCaretRightBold as ChevronRightIcon,
} from 'react-icons/pi';
import { cn } from '@/lib/utils';
import { useSlidingHighlight } from '@/components/library/use-sliding-highlight';

type SubmenuActionsRef = RefObject<MenuPrimitive.Root.Actions | null>;

/** Tracks whether we are inside a submenu and exposes its close action for the mobile back button. */
const SubmenuContext = createContext<SubmenuActionsRef | null>(null);
const MenuSurfaceContext = createContext<{
  sheet: boolean;
  panel: RefObject<HTMLDivElement | null>;
} | null>(null);

const HIGHLIGHT_SELECTOR =
  '[role^="menuitem"]:not([data-disabled]):not([aria-disabled="true"]):not([data-variant="destructive"]):not([data-menu-back]):not([data-highlight-disabled])';

const BACK_ICON = <BackIcon aria-hidden="true" className="size-5 shrink-0 rtl:rotate-180" />;
const SUB_CHEVRON_ICON = <ChevronRightIcon aria-hidden="true" className="ms-auto rtl:rotate-180" />;
const CHECK_INDICATOR_ICON = <CheckIcon aria-hidden="true" />;

const BASE_ITEM_CLASS =
  "relative flex min-h-11 md:min-h-9 cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-hidden select-none not-data-highlight-disabled:not-data-[variant=destructive]:data-highlighted:bg-accent not-data-highlight-disabled:not-data-[variant=destructive]:focus:bg-accent group-data-sliding-highlight/dropdown-menu:not-data-highlight-disabled:not-data-[variant=destructive]:data-highlighted:bg-transparent group-data-sliding-highlight/dropdown-menu:not-data-highlight-disabled:not-data-[variant=destructive]:focus:bg-transparent not-data-highlight-disabled:not-data-[variant=destructive]:focus:text-accent-foreground not-data-highlight-disabled:not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:ps-9 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

function partClasses<State>(
  ...values: (string | undefined | false | ((state: State) => string | undefined))[]
) {
  for (let i = 0; i < values.length; i++) {
    if (typeof values[i] === 'function') {
      return (state: State) => cn(values.map((v) => (typeof v === 'function' ? v(state) : v)));
    }
  }
  return cn(values as (string | undefined | false)[]);
}

function DropdownMenu<Payload = unknown>(props: MenuPrimitive.Root.Props<Payload>) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal(props: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger<Payload = unknown>(props: MenuPrimitive.Trigger.Props<Payload>) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

type DropdownMenuContentProps = MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'> & {
    slidingHighlight?: boolean;
    /** Use a modal bottom picker on phones; false keeps the anchored menu. */
    responsive?: boolean;
    mobileTitle?: ReactNode;
    mobileBackLabel?: string;
    portalProps?: Omit<MenuPrimitive.Portal.Props, 'children'>;
  };

function DropdownMenuContent({
  align = 'start',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 4,
  slidingHighlight = true,
  responsive = true,
  mobileTitle = 'Actions',
  mobileBackLabel = 'Back',
  portalProps,
  className,
  children,
  ref,
  ...props
}: DropdownMenuContentProps) {
  const submenuActions = useContext(SubmenuContext);
  const isSubmenu = submenuActions !== null;
  const parentSurface = useContext(MenuSurfaceContext);
  const panel = useRef<HTMLDivElement>(null);
  const sheet = responsive && (!isSubmenu || parentSurface?.sheet === true);
  const adaptiveRoot = sheet && !isSubmenu;
  const drillIn = sheet && isSubmenu;

  const { containerRef, highlightStyle } = useSlidingHighlight({
    itemSelector: HIGHLIGHT_SELECTOR,
    disabled: !slidingHighlight,
  });

  const popupRef = useCallback(
    (node: HTMLDivElement | null) => {
      panel.current = node;
      const cleanupHighlight = containerRef(node);
      const parentPanel = drillIn ? parentSurface?.panel.current : null;
      if (node && parentPanel && window.matchMedia('(width < 768px)').matches) {
        node.style.setProperty('--dropdown-parent-height', `${parentPanel.offsetHeight}px`);
      }
      const cleanup = () => {
        panel.current = null;
        cleanupHighlight?.();
      };
      if (!ref) return cleanup;

      const cleanupRef = typeof ref === 'function' ? ref(node) : undefined;
      if (typeof ref !== 'function') ref.current = node;

      return () => {
        cleanup();
        if (typeof cleanupRef === 'function') cleanupRef();
        else if (typeof ref === 'function') ref(null);
        else ref.current = null;
      };
    },
    [containerRef, ref, drillIn, parentSurface?.panel],
  );

  return (
    <MenuSurfaceContext value={{ sheet, panel }}>
      <MenuPrimitive.Portal {...portalProps}>
        {adaptiveRoot && (
          <MenuPrimitive.Backdrop className="fixed inset-0 z-40 bg-foreground/40 transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none md:hidden" />
        )}
        <MenuPrimitive.Positioner
          className={cn(
            'isolate z-50 outline-none',
            sheet &&
              'max-md:!fixed max-md:!inset-x-0 max-md:!bottom-0 max-md:!top-auto max-md:!w-full max-md:!max-w-none max-md:!transform-none',
          )}
          align={align}
          alignOffset={alignOffset}
          side={side}
          sideOffset={sideOffset}
        >
          <MenuPrimitive.Popup
            {...props}
            ref={popupRef}
            data-slot="dropdown-menu-content"
            data-mobile-modal={sheet ? '' : undefined}
            data-sliding-highlight={slidingHighlight ? '' : undefined}
            className={partClasses(
              'group/dropdown-menu relative isolate z-50 min-w-[min(12rem,var(--available-width))] max-w-[min(24rem,var(--available-width))] max-h-(--available-height) origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none transition-[opacity,scale,filter] duration-150 ease-out data-starting-style:opacity-0 motion-safe:data-starting-style:scale-95 motion-safe:data-starting-style:blur-[2px] data-ending-style:opacity-0 motion-safe:data-ending-style:scale-95 motion-safe:data-ending-style:blur-[2px] motion-reduce:transition-none motion-reduce:blur-none',
              sheet &&
                'max-md:w-full max-md:min-w-0 max-md:max-w-none max-md:max-h-[85dvh] max-md:rounded-b-none max-md:rounded-t-2xl max-md:border-x-0 max-md:border-b-0 max-md:px-2 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom))] max-md:transition-[opacity,translate] max-md:duration-200 max-md:motion-safe:data-starting-style:translate-y-4 max-md:motion-safe:data-ending-style:translate-y-4 max-md:data-starting-style:scale-100 max-md:data-ending-style:scale-100 max-md:data-starting-style:blur-none max-md:data-ending-style:blur-none max-md:motion-reduce:translate-y-0',
              drillIn &&
                'max-md:min-h-[min(var(--dropdown-parent-height,0px),85dvh)] max-md:origin-center max-md:data-starting-style:translate-y-0 max-md:data-ending-style:translate-y-0 max-md:motion-safe:data-starting-style:translate-x-4 max-md:motion-safe:data-ending-style:translate-x-4 max-md:rtl:motion-safe:data-starting-style:-translate-x-4 max-md:rtl:motion-safe:data-ending-style:-translate-x-4 max-md:motion-reduce:translate-x-0',
              className,
            )}
          >
            {sheet && (
              <div
                data-slot="dropdown-menu-mobile-header"
                className="sticky top-1 z-10 -mx-1 mb-1 rounded-t-[max(0px,calc(var(--radius-2xl,1rem)-0.25rem))] bg-popover px-3 py-3 md:hidden"
              >
                {drillIn ? (
                  <MenuPrimitive.Item
                    closeOnClick={false}
                    onClick={() => submenuActions.current?.close()}
                    data-menu-back
                    aria-label={`${mobileBackLabel}: ${typeof mobileTitle === 'string' ? mobileTitle : 'submenu'}`}
                    className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-start text-base font-semibold outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    {BACK_ICON}
                    {mobileTitle}
                  </MenuPrimitive.Item>
                ) : (
                  <p className="m-0 break-words text-base font-semibold leading-6">{mobileTitle}</p>
                )}
                <Separator className="absolute inset-x-1 bottom-0 w-auto" />
              </div>
            )}
            {slidingHighlight && (
              <span
                aria-hidden="true"
                style={highlightStyle}
                className="-z-10 rounded-md bg-accent transition-[transform,width,height,opacity] duration-200 ease-out motion-reduce:transition-none"
              />
            )}
            {children}
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuSurfaceContext>
  );
}

function DropdownMenuGroup(props: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={partClasses(
        'px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:ps-9',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={partClasses(
        'group/dropdown-menu-item',
        BASE_ITEM_CLASS,
        variant === 'destructive' &&
          'text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive focus:bg-destructive/10 focus:text-destructive dark:data-highlighted:bg-destructive/20 dark:focus:bg-destructive/20 [&_svg]:text-destructive',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSub({ actionsRef, ...props }: MenuPrimitive.SubmenuRoot.Props) {
  const localActions = useRef<MenuPrimitive.Root.Actions | null>(null);
  const actions = actionsRef ?? localActions;
  return (
    <SubmenuContext value={actions}>
      <MenuPrimitive.SubmenuRoot {...props} actionsRef={actions} />
    </SubmenuContext>
  );
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={partClasses(
        BASE_ITEM_CLASS,
        'data-popup-open:bg-accent data-popup-open:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground',
        className,
      )}
      {...props}
    >
      {children}
      {SUB_CHEVRON_ICON}
    </MenuPrimitive.SubmenuTrigger>
  );
}

function DropdownMenuSubContent({
  side = 'inline-end',
  sideOffset = 4,
  align = 'start',
  alignOffset = -4,
  ...props
}: DropdownMenuContentProps) {
  return (
    <DropdownMenuContent
      {...props}
      side={side}
      sideOffset={sideOffset}
      align={align}
      alignOffset={alignOffset}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={partClasses(BASE_ITEM_CLASS, 'pe-8', className)}
      checked={checked}
      {...props}
    >
      <span
        className="pointer-events-none absolute end-2.5 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          {CHECK_INDICATOR_ICON}
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup(props: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={partClasses(BASE_ITEM_CLASS, 'pe-8', className)}
      {...props}
    >
      <span
        className="pointer-events-none absolute end-2.5 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator>{CHECK_INDICATOR_ICON}</MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

function DropdownMenuShortcut({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        'ms-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground',
        className,
      )}
      {...props}
    />
  );
}

export {
  type DropdownMenuContentProps,
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};

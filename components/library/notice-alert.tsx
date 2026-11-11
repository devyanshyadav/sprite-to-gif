'use client';

import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
  type ComponentProps,
} from 'react';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  PiBellSimpleFill as BellIcon,
  PiCheckCircleFill as CheckCircleIcon,
  PiWarningFill as WarningIcon,
  PiXCircleFill as CloseCircleIcon,
  PiXBold as CloseIcon,
} from 'react-icons/pi';
import { IconTooltip } from '@/components/library/icon-tooltip';
import { cn } from '@/lib/utils';

const tones = {
  neutral: {
    icon: BellIcon,
    className:
      '[--notice-color:var(--muted-foreground)] [--notice-fill:var(--muted-foreground)] [--notice-ink:var(--background)]',
  },
  info: {
    icon: BellIcon,
    className:
      '[--notice-color:var(--status-info,var(--color-blue-600))] dark:[--notice-color:var(--status-info,var(--color-blue-400))] [--notice-fill:var(--status-info,var(--color-blue-500))] [--notice-ink:white]',
  },
  success: {
    icon: CheckCircleIcon,
    className:
      '[--notice-color:var(--status-success,var(--color-green-700))] dark:[--notice-color:var(--status-success,var(--color-green-400))] [--notice-fill:var(--status-success,var(--color-green-500))] [--notice-ink:white]',
  },
  warning: {
    icon: WarningIcon,
    className:
      '[--notice-color:var(--status-pending,var(--color-yellow-800))] dark:[--notice-color:var(--status-pending,var(--color-yellow-300))] [--notice-fill:var(--status-pending,var(--color-yellow-400))] [--notice-ink:white]',
  },
  error: {
    icon: CloseCircleIcon,
    className:
      '[--notice-color:var(--status-error,var(--color-red-600))] dark:[--notice-color:var(--status-error,var(--color-red-400))] [--notice-fill:var(--status-error,var(--color-red-500))] [--notice-ink:white]',
  },
} as const;

const noticeAlertVariants = cva(
  'group/notice-alert relative isolate grid h-auto w-full min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-3 rounded-2xl ring-1 ring-border bg-card text-card-foreground has-[>[data-slot=notice-alert-icon]]:grid-cols-[auto_minmax(0,1fr)] has-[>[data-slot=notice-alert-close]]:pe-14 md:has-[>[data-slot=notice-alert-close]]:pe-12 md:has-[>[data-slot=notice-alert-actions]]:grid-cols-[minmax(0,1fr)_auto] md:has-[>[data-slot=notice-alert-icon]]:has-[>[data-slot=notice-alert-actions]]:grid-cols-[auto_minmax(0,1fr)_auto] opacity-100 blur-none [interpolate-size:allow-keywords] [transition-behavior:allow-discrete] transition-[display,opacity,filter] duration-250 ease-out starting:opacity-0 motion-safe:starting:blur-[6px] [&[hidden]]:hidden [&[hidden]]:h-0 [&[hidden]]:overflow-hidden [&[hidden]]:gap-0 [&[hidden]]:ring-0 [&[hidden]]:p-0 [&[hidden]]:opacity-0 motion-safe:[&[hidden]]:blur-[6px] [&[hidden]]:transition-[display,height,padding,gap,opacity,filter] motion-reduce:transition-none motion-reduce:blur-none',
  {
    variants: {
      variant: {
        default: '',
        soft: '[--notice-soft-surface:color-mix(in_oklab,var(--notice-fill)_8%,var(--card))] ring-2 [--notice-soft-edge:color-mix(in_oklab,var(--notice-soft-surface)_30%,white)] dark:[--notice-soft-surface:color-mix(in_oklab,var(--notice-fill)_12%,var(--card))] dark:[--notice-soft-edge:color-mix(in_oklab,var(--notice-soft-surface)_78%,black)] ring-[var(--notice-soft-edge)] bg-[var(--notice-soft-surface)]',
        stripe:
          'ring-[color-mix(in_oklab,var(--notice-color)_18%,var(--border))] bg-[color-mix(in_oklab,var(--notice-fill)_4%,var(--card))] before:pointer-events-none before:absolute before:inset-y-3 before:start-3 before:w-0.5 before:rounded-full before:bg-[var(--notice-color)]',
        accent:
          'bg-[linear-gradient(110deg,color-mix(in_oklab,var(--notice-fill)_12%,var(--card)),var(--card)_55%)] rtl:bg-[linear-gradient(250deg,color-mix(in_oklab,var(--notice-fill)_12%,var(--card)),var(--card)_55%)]',
      },
      size: {
        compact:
          'items-center gap-2 rounded-lg p-2.5 [--notice-icon-size:1rem] [--notice-glyph-size:1rem] has-[>[data-slot=notice-alert-close]]:min-h-11',
        sm: 'p-3 [--notice-icon-size:2rem] [--notice-glyph-size:1rem]',
        default: 'p-4 [--notice-icon-size:2.5rem] [--notice-glyph-size:1.25rem]',
        lg: 'p-5 [--notice-icon-size:3rem] [--notice-glyph-size:1.5rem]',
      },
    },
    compoundVariants: [
      { variant: 'stripe', size: 'compact', className: 'before:inset-y-2 before:start-2' },
    ],
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

type NoticeTone = keyof typeof tones;
const NoticeContext = createContext<{
  tone: NoticeTone;
  compact: boolean;
  close: () => void;
} | null>(null);
function useNotice() {
  const context = useContext(NoticeContext);
  if (!context) throw new Error('Notice Alert parts must be inside NoticeAlert.');
  return context;
}

export type NoticeAlertProps = Omit<ComponentProps<'div'>, 'hidden'> &
  VariantProps<typeof noticeAlertVariants> & {
    tone?: NoticeTone;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Persistent by default. A positive duration dismisses after idle milliseconds. */
    duration?: number;
  };

/** Inline feedback, not a toast manager. CSS owns motion; the optional timer owns visibility. */
export function NoticeAlert({
  tone = 'neutral',
  variant = 'default',
  size = 'default',
  open,
  defaultOpen = true,
  onOpenChange,
  duration = 0,
  className,
  children,
  role = tone === 'error' ? 'alert' : 'status',
  'aria-atomic': atomic = true,
  onPointerEnter,
  onPointerLeave,
  onFocusCapture,
  onBlurCapture,
  ...props
}: NoticeAlertProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [paused, setPaused] = useState(false);
  const visible = open ?? internalOpen;
  const timed = Number.isFinite(duration) && duration > 0;
  function close() {
    if (!visible) return;
    if (open === undefined) setInternalOpen(false);
    onOpenChange?.(false);
    setPaused(false);
  }
  const expire = useEffectEvent(close);
  useEffect(() => {
    if (!visible || paused || !timed) return;
    const timer = window.setTimeout(expire, duration);
    return () => window.clearTimeout(timer);
  }, [visible, paused, duration, timed]);
  return (
    <NoticeContext.Provider value={{ tone, compact: size === 'compact', close }}>
      <div
        {...props}
        role={role}
        aria-atomic={atomic}
        hidden={!visible}
        inert={!visible || undefined}
        data-slot="notice-alert"
        data-tone={tone}
        data-variant={variant}
        data-size={size}
        className={cn(
          noticeAlertVariants({ variant, size }),
          tones[tone].className,
          variant === 'stripe' && 'ps-7',
          className,
        )}
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          if (timed && !event.defaultPrevented && event.pointerType !== 'touch') setPaused(true);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          if (!event.defaultPrevented)
            setPaused(
              timed &&
                event.currentTarget.contains(event.currentTarget.ownerDocument.activeElement),
            );
        }}
        onFocusCapture={(event) => {
          onFocusCapture?.(event);
          if (timed && !event.defaultPrevented) setPaused(true);
        }}
        onBlurCapture={(event) => {
          onBlurCapture?.(event);
          if (!event.defaultPrevented && !event.currentTarget.contains(event.relatedTarget))
            setPaused(timed && event.currentTarget.matches(':hover'));
        }}
      >
        {children}
      </div>
    </NoticeContext.Provider>
  );
}

export function NoticeAlertIcon({ className, children, ...props }: ComponentProps<'div'>) {
  const { tone, compact } = useNotice();
  const Icon = tones[tone].icon;
  return (
    <div
      aria-hidden="true"
      {...props}
      data-slot="notice-alert-icon"
      className={cn(
        'col-start-1 row-start-1 flex size-[var(--notice-icon-size)] shrink-0 items-center justify-center rounded-xl [&>svg]:size-[var(--notice-glyph-size)]',
        compact
          ? 'text-[var(--notice-color)]'
          : 'ring-1 ring-border bg-[color-mix(in_oklab,var(--notice-fill)_10%,var(--card))] text-[var(--notice-color)] shadow-[0_1px_2px_rgb(0_0_0/0.05),0_3px_8px_rgb(0_0_0/0.04)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.22),inset_0_1px_0_rgb(255_255_255/0.05)] group-data-[variant=default]/notice-alert:ring-0 group-data-[variant=default]/notice-alert:bg-[var(--notice-fill)] group-data-[variant=default]/notice-alert:text-[var(--notice-ink)] group-data-[variant=soft]/notice-alert:ring-0 group-data-[variant=soft]/notice-alert:bg-card',
        className,
      )}
    >
      {children === undefined ? <Icon /> : children}
    </div>
  );
}

export function NoticeAlertContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      data-slot="notice-alert-content"
      className={cn(
        'col-start-1 row-start-1 flex min-w-0 flex-col gap-1 group-has-[[data-slot=notice-alert-icon]]/notice-alert:col-start-2',
        className,
      )}
    />
  );
}

export function NoticeAlertTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      data-slot="notice-alert-title"
      className={cn(
        'text-sm font-semibold leading-snug [overflow-wrap:anywhere] group-data-[size=compact]/notice-alert:text-xs',
        className,
      )}
    />
  );
}

export function NoticeAlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      data-slot="notice-alert-description"
      className={cn(
        'text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere] group-data-[size=sm]/notice-alert:text-xs group-data-[size=compact]/notice-alert:text-xs [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4',
        className,
      )}
    />
  );
}

export function NoticeAlertActions({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      data-slot="notice-alert-actions"
      className={cn(
        'col-start-1 row-start-2 flex min-w-0 flex-wrap items-center gap-2 group-has-[[data-slot=notice-alert-icon]]/notice-alert:col-start-2 md:col-start-2 md:row-start-1 md:self-center md:group-has-[[data-slot=notice-alert-icon]]/notice-alert:col-start-3',
        className,
      )}
    />
  );
}

export function NoticeAlertClose({
  className,
  children,
  onClick,
  'aria-label': label = 'Dismiss notice',
  ...props
}: ButtonPrimitive.Props) {
  const { close } = useNotice();
  return (
    <IconTooltip label={label} side="left">
      <ButtonPrimitive
        {...props}
        aria-label={label}
        data-slot="notice-alert-close"
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) close();
        }}
        className={(state) =>
          cn(
            'absolute end-1 top-1 inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none md:end-2 md:top-2 md:size-8 [&>svg]:size-4',
            typeof className === 'function' ? className(state) : className,
          )
        }
      >
        {children ?? <CloseIcon aria-hidden="true" />}
      </ButtonPrimitive>
    </IconTooltip>
  );
}

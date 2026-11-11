import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';

export type PillSwitchProps = SwitchPrimitive.Root.Props & {
  size?: 'sm' | 'default' | 'lg';
};

export function PillSwitch({ className, size = 'default', ...props }: PillSwitchProps) {
  return (
    <SwitchPrimitive.Root
      {...props}
      data-slot="pill-switch"
      data-size={size}
      className={(state) =>
        cn(
          'group/pill-switch relative inline-flex [--switch-stretch:0px] motion-safe:active:not-data-disabled:not-data-readonly:[--switch-stretch:6px] motion-safe:active:not-data-disabled:not-data-readonly:scale-[0.96] h-[var(--switch-height)] w-[var(--switch-width)] shrink-0 cursor-pointer items-center rounded-[var(--switch-radius)] [--switch-radius:min(calc(var(--switch-height)/2),var(--radius-xl,0.875rem))] bg-input p-[2px] align-middle outline-none ring-1 ring-inset ring-input shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] transition-[scale,background-color,box-shadow] duration-200 after:absolute after:inset-x-0 after:top-1/2 after:h-[max(100%,44px)] after:-translate-y-1/2 after:content-[""] data-checked:bg-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background data-disabled:cursor-not-allowed data-disabled:opacity-50 data-readonly:cursor-default aria-invalid:ring-2 aria-invalid:ring-destructive motion-reduce:transition-none',
          size === 'sm' &&
          '[--switch-height:1.5rem] [--switch-width:3.25rem] [--switch-thumb:2rem]',
          size === 'default' &&
          '[--switch-height:1.875rem] [--switch-width:4rem] [--switch-thumb:2.5rem]',
          size === 'lg' &&
          '[--switch-height:2.25rem] [--switch-width:4.75rem] [--switch-thumb:3rem]',
          typeof className === 'function' ? className(state) : className,
        )
      }
    />
  );
}

export type PillSwitchThumbProps = SwitchPrimitive.Thumb.Props;

export function PillSwitchThumb({ className, ...props }: PillSwitchThumbProps) {
  return (
    <SwitchPrimitive.Thumb
      {...props}
      data-slot="pill-switch-thumb"
      className={(state) =>
        cn(
          'pointer-events-none relative z-10 block h-full w-[calc(var(--switch-thumb)+var(--switch-stretch))] rounded-[max(0px,calc(var(--switch-radius)-2px))] bg-background bg-[radial-gradient(ellipse_at_35%_15%,rgb(255_255_255/0.32),transparent_70%),linear-gradient(180deg,transparent_50%,rgb(0_0_0/0.035))] shadow-[inset_0_1px_1px_rgb(255_255_255/0.4),inset_0_-1px_2px_rgb(0_0_0/0.04),0_1px_2px_rgb(0_0_0/0.1)] dark:bg-[radial-gradient(ellipse_at_35%_15%,rgb(255_255_255/0.12),transparent_70%),linear-gradient(180deg,transparent_50%,rgb(0_0_0/0.055))] dark:shadow-[inset_0_1px_1px_rgb(255_255_255/0.16),inset_0_-1px_2px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.14)] transition-[width,translate,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-checked:translate-x-[calc(var(--switch-width)-var(--switch-thumb)-var(--switch-stretch)-4px)] data-checked:bg-primary-foreground rtl:data-checked:-translate-x-[calc(var(--switch-width)-var(--switch-thumb)-var(--switch-stretch)-4px)] motion-reduce:transition-none',
          typeof className === 'function' ? className(state) : className,
        )
      }
    />
  );
}

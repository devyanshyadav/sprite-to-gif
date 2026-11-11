'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { PiMoonBold, PiSunBold } from 'react-icons/pi';
import { BevelButton } from '@/components/library/bevel-button';
import { IconTooltip } from '@/components/library/icon-tooltip';

const subscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const isDark = resolvedTheme === 'dark';
  const ready = mounted && resolvedTheme !== undefined;

  return (
    <IconTooltip label={ready ? (isDark ? 'Light mode' : 'Dark mode') : 'Theme'}>
      <BevelButton
        variant="secondary"
        size="icon-sm"
        aria-label={
          ready
            ? isDark
              ? 'Switch to light mode'
              : 'Switch to dark mode'
            : 'Theme'
        }
        disabled={!ready}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
      >
        {!ready ? <PiMoonBold className="opacity-40" /> : isDark ? <PiSunBold /> : <PiMoonBold />}
      </BevelButton>
    </IconTooltip>
  );
}

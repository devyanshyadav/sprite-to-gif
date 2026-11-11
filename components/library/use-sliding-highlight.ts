'use client';

import { useCallback, type CSSProperties } from 'react';

export type UseSlidingHighlightOptions = {
  /** Mark eligible descendants with this selector. */
  itemSelector?: string;
  disabled?: boolean;
};

const vars = {
  left: '--sliding-highlight-left',
  top: '--sliding-highlight-top',
  width: '--sliding-highlight-width',
  height: '--sliding-highlight-height',
  opacity: '--sliding-highlight-opacity',
} as const;

/** Static style object — never changes reference across renders. */
const HIGHLIGHT_STYLE: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: `var(${vars.width}, 0px)`,
  height: `var(${vars.height}, 0px)`,
  transform: `translate3d(var(${vars.left}, 0px), var(${vars.top}, 0px), 0)`,
  opacity: `var(${vars.opacity}, 0)`,
  pointerEvents: 'none',
};

/** Decorative hover/focus feedback; zero React state or useEffect. */
export function useSlidingHighlight({
  itemSelector = '[data-highlight-item]',
  disabled = false,
}: UseSlidingHighlightOptions = {}) {
  const containerRef = useCallback(
    (container: HTMLElement | null) => {
      if (!container || disabled) return;

      let hovered: HTMLElement | null = null;
      let focused: HTMLElement | null = null;
      let observedItem: HTMLElement | null = null;
      let prevLeft = NaN;
      let prevTop = NaN;
      let prevWidth = NaN;
      let prevHeight = NaN;
      let visible: boolean | null = null;

      const setVisible = (next: boolean) => {
        if (visible === next) return;
        visible = next;
        container.style.setProperty(vars.opacity, next ? '1' : '0');
      };

      const findItem = (target: EventTarget | null) => {
        if (!(target instanceof Element)) return null;
        const item = target.closest<HTMLElement>(itemSelector);
        return item && item !== container && container.contains(item) ? item : null;
      };

      // Programmatic/pointer focus must not pin a popover's initially focused row.
      const findFocusedItem = (target: EventTarget | null) =>
        target instanceof Element && target.matches(':focus-visible') ? findItem(target) : null;

      const measure = () => {
        const item = focused && container.contains(focused) ? focused : hovered;

        if (!item || !container.contains(item) || !item.matches(itemSelector)) {
          if (observedItem) {
            resize?.unobserve(observedItem);
            observedItem = null;
          }
          setVisible(false);
          return;
        }

        if (observedItem !== item) {
          if (observedItem) resize?.unobserve(observedItem);
          observedItem = item;
          resize?.observe(item);
        }

        const outer = container.getBoundingClientRect();
        const inner = item.getBoundingClientRect();
        if (!outer.width || !outer.height || !inner.width || !inner.height) {
          setVisible(false);
          return;
        }

        const scaleX = container.offsetWidth / outer.width;
        const scaleY = container.offsetHeight / outer.height;
        const left =
          (inner.left - outer.left) * scaleX - container.clientLeft + container.scrollLeft;
        const top = (inner.top - outer.top) * scaleY - container.clientTop + container.scrollTop;
        const width = inner.width * scaleX;
        const height = inner.height * scaleY;

        if (left !== prevLeft || top !== prevTop || width !== prevWidth || height !== prevHeight) {
          container.style.setProperty(vars.left, `${left}px`);
          container.style.setProperty(vars.top, `${top}px`);
          container.style.setProperty(vars.width, `${width}px`);
          container.style.setProperty(vars.height, `${height}px`);
          prevLeft = left;
          prevTop = top;
          prevWidth = width;
          prevHeight = height;
        }

        setVisible(true);
      };

      const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
      const mutation = new MutationObserver(measure);

      const onPointer = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return;
        const next = e.type === 'pointerout' ? findItem(e.relatedTarget) : findItem(e.target);
        if (next !== hovered) {
          hovered = next;
          measure();
        }
      };

      const onPointerLeave = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return;
        hovered = null;
        measure();
      };

      const onFocus = (e: FocusEvent) => {
        focused =
          e.type === 'focusin' ? findFocusedItem(e.target) : findFocusedItem(e.relatedTarget);
        measure();
      };

      resize?.observe(container);
      mutation.observe(container, { childList: true, subtree: true });
      focused = findFocusedItem(document.activeElement);
      container.addEventListener('pointerover', onPointer);
      container.addEventListener('pointermove', onPointer);
      container.addEventListener('pointerout', onPointer);
      container.addEventListener('pointerleave', onPointerLeave);
      container.addEventListener('pointercancel', onPointerLeave);
      container.addEventListener('focusin', onFocus);
      container.addEventListener('focusout', onFocus);
      container.addEventListener('scroll', measure, { capture: true, passive: true });
      measure();

      return () => {
        resize?.disconnect();
        mutation.disconnect();
        container.removeEventListener('pointerover', onPointer);
        container.removeEventListener('pointermove', onPointer);
        container.removeEventListener('pointerout', onPointer);
        container.removeEventListener('pointerleave', onPointerLeave);
        container.removeEventListener('pointercancel', onPointerLeave);
        container.removeEventListener('focusin', onFocus);
        container.removeEventListener('focusout', onFocus);
        container.removeEventListener('scroll', measure, true);
        for (const v of Object.values(vars)) {
          container.style.removeProperty(v);
        }
      };
    },
    [itemSelector, disabled],
  );

  return { containerRef, highlightStyle: HIGHLIGHT_STYLE };
}

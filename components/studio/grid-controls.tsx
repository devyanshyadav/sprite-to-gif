'use client';

import { useState } from 'react';
import type { GridConfig } from '@/lib/types';
import {
  PiCaretDownBold,
  PiArrowCounterClockwiseBold,
  PiSparkleBold,
  PiMinusBold,
  PiPlusBold,
} from 'react-icons/pi';
import { BevelButton } from '@/components/library/bevel-button';
import { ControlSlider } from '@/components/library/control-slider';
import { FieldInput } from '@/components/library/field-input';
import { PillSwitch, PillSwitchThumb } from '@/components/library/pill-switch';
import {
  SculptedTabs,
  SculptedTabsList,
  SculptedTabsTrigger,
} from '@/components/library/sculpted-tabs';
import { Label } from '@/components/ui/label';
import { IconTooltip } from '@/components/library/icon-tooltip';
import { STUDIO_COPY } from '@/lib/studio-copy';

interface GridControlsProps {
  config: GridConfig;
  onChange: (config: GridConfig) => void;
  onAutoDetect?: () => void;
}

const toNumber = (v: number | readonly number[]): number =>
  Array.isArray(v) ? (v as readonly number[])[0] : (v as number);

export function GridControls({
  config,
  onChange,
  onAutoDetect,
}: GridControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const totalCells = config.columns * config.rows;
  const isSmartAuto = config.slicingMode === 'smart-cv';

  const setCols = (cols: number) =>
    onChange({ ...config, columns: cols, totalFrames: cols * config.rows });
  const setRows = (rows: number) =>
    onChange({ ...config, rows, totalFrames: config.columns * rows });

  const offsetSliders: {
    label: string;
    key:
      | 'cropOffsetY'
      | 'cropMarginBottom'
      | 'cropOffsetX'
      | 'cropMarginRight'
      | 'gapX'
      | 'gapY';
    max: number;
  }[] = [
    { label: 'Top', key: 'cropOffsetY', max: 100 },
    { label: 'Bottom', key: 'cropMarginBottom', max: 100 },
    { label: 'Left', key: 'cropOffsetX', max: 100 },
    { label: 'Right', key: 'cropMarginRight', max: 100 },
    { label: 'Gap X', key: 'gapX', max: 40 },
    { label: 'Gap Y', key: 'gapY', max: 40 },
  ];

  const stepper = (
    label: string,
    value: number,
    max: number,
    set: (n: number) => void
  ) => (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-1.5 min-h-9">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <IconTooltip label={`Decrease ${label.toLowerCase()}`}>
          <BevelButton
            variant="secondary"
            size="icon-xs"
            onClick={() => set(Math.max(1, value - 1))}
          >
            <PiMinusBold />
          </BevelButton>
        </IconTooltip>
        <FieldInput
          type="number"
          min={1}
          max={max}
          size="sm"
          value={value}
          onChange={(e) => set(Math.max(1, parseInt(e.target.value) || 1))}
          className="h-7 w-12 border-0 bg-transparent px-1 text-center font-mono text-xs shadow-none"
        />
        <IconTooltip label={`Increase ${label.toLowerCase()}`}>
          <BevelButton
            variant="secondary"
            size="icon-xs"
            onClick={() => set(value + 1)}
          >
            <PiPlusBold />
          </BevelButton>
        </IconTooltip>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Auto-detect PillSwitch & BevelButton actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <PillSwitch
            id="auto-detect-mode"
            size="sm"
            checked={isSmartAuto}
            onCheckedChange={(checked) => {
              if (checked && onAutoDetect) {
                onAutoDetect();
              } else {
                onChange({
                  ...config,
                  slicingMode: checked ? 'smart-cv' : 'uniform-grid',
                });
              }
            }}
          >
            <PillSwitchThumb />
          </PillSwitch>
          <Label htmlFor="auto-detect-mode" className="cursor-pointer text-xs font-medium">
            {STUDIO_COPY.grid.autoDetect}
          </Label>
        </div>

        <div className="flex items-center gap-1.5">
          {onAutoDetect && (
            <BevelButton
              variant="secondary"
              size="xs"
              onClick={onAutoDetect}
            >
              <PiSparkleBold />
              {STUDIO_COPY.grid.detect}
            </BevelButton>
          )}
          <BevelButton
            variant="ghost"
            size="xs"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {STUDIO_COPY.grid.advanced}
            <PiCaretDownBold className={showAdvanced ? 'rotate-180' : ''} />
          </BevelButton>
        </div>
      </div>

      {/* Row 2: Columns & Rows steppers */}
      <div className="grid grid-cols-2 gap-2.5">
        {stepper('Columns', config.columns, 64, setCols)}
        {stepper('Rows', config.rows, 32, setRows)}
      </div>

      {/* Row 3: Frames, Sensitivity, Inset ControlSliders */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <ControlSlider
          size="sm"
          label="Frames"
          min={1}
          max={totalCells}
          value={config.totalFrames}
          formatValue={(v) => `${v}/${totalCells}`}
          onValueChange={(v) =>
            onChange({
              ...config,
              totalFrames: Math.min(totalCells, Math.max(1, toNumber(v))),
            })
          }
        />

        <ControlSlider
          size="sm"
          label="Sensitivity"
          min={10}
          max={90}
          disabled={!isSmartAuto}
          value={config.sensitivity}
          formatValue={(v) => `${v}%`}
          onValueChange={(v) =>
            onChange({ ...config, sensitivity: toNumber(v) })
          }
        />

        <ControlSlider
          size="sm"
          label="Inset"
          min={0}
          max={16}
          value={config.cellInset}
          formatValue={(v) => `${v}px`}
          onValueChange={(v) =>
            onChange({ ...config, cellInset: toNumber(v) })
          }
        />
      </div>

      {/* Collapsible Advanced Offsets */}
      {showAdvanced && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PillSwitch
                id="per-cell-refine"
                size="sm"
                checked={config.perCellRefine}
                onCheckedChange={(checked) =>
                  onChange({ ...config, perCellRefine: checked })
                }
              >
                <PillSwitchThumb />
              </PillSwitch>
              <Label htmlFor="per-cell-refine" className="text-xs">
                {STUDIO_COPY.grid.refineCells}
              </Label>
            </div>

            <SculptedTabs
              value={config.order}
              onValueChange={(v) =>
                onChange({ ...config, order: v as GridConfig['order'] })
              }
            >
              <SculptedTabsList size="sm" variant="segmented">
                <SculptedTabsTrigger value="row-major">Row order</SculptedTabsTrigger>
                <SculptedTabsTrigger value="column-major">Column order</SculptedTabsTrigger>
              </SculptedTabsList>
            </SculptedTabs>

            <BevelButton
              variant="ghost"
              size="xs"
              onClick={() =>
                onChange({
                  ...config,
                  cropOffsetX: 0,
                  cropOffsetY: 0,
                  cropMarginRight: 0,
                  cropMarginBottom: 0,
                  gapX: 0,
                  gapY: 0,
                  cellInset: 2,
                })
              }
            >
              <PiArrowCounterClockwiseBold />
              Reset offsets
            </BevelButton>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {offsetSliders.map((s) => (
              <ControlSlider
                key={s.key}
                size="sm"
                label={s.label}
                min={0}
                max={s.max}
                value={config[s.key]}
                formatValue={(v) => `${v}px`}
                onValueChange={(v) =>
                  onChange({ ...config, [s.key]: toNumber(v) })
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

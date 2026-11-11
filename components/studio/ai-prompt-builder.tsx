'use client';

import { createElement, useMemo, useState } from 'react';
import {
  PiCopySimpleBold,
  PiCheckBold,
  PiCaretDownBold,
  PiArrowSquareOutBold,
} from 'react-icons/pi';
import {
  ChatGptIcon,
  GeminiIcon,
  GrokIcon,
} from '@/components/studio/prompt-launch-icons';
import { BevelButton } from '@/components/library/bevel-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/library/dropdown-menu';
import {
  launchPromptIn,
  PROMPT_LAUNCH_TARGETS,
  type PromptLaunchTarget,
} from '@/lib/prompt-launch';
import { FieldInput } from '@/components/library/field-input';
import {
  SculptedTabs,
  SculptedTabsList,
  SculptedTabsTrigger,
} from '@/components/library/sculpted-tabs';
import { Separator } from '@/components/library/separator';
import { STUDIO_COPY } from '@/lib/studio-copy';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface AiPromptBuilderProps {
  columns: number;
  rows: number;
  onSelectGrid?: (cols: number, rows: number) => void;
}

const STYLE_PRESETS = [
  {
    id: 'cinematic',
    label: 'Cinematic 3D',
    desc: 'Octane & Unreal Engine 5 path-traced production render, 50mm prime lens at f/11 deep focus, 1/4000s high-speed shutter, crisp studio rim and key lighting, razor-sharp 8K micro-surface textures',
  },
  {
    id: 'anime',
    label: '2D Anime',
    desc: 'Ufotable / Kyoto Animation production keyframe cel sheet, razor-sharp vector ink line art, flat consistent cel-shaded color palette, zero line boil, crisp 8K production scan',
  },
  {
    id: 'clay',
    label: 'Claymation',
    desc: 'Laika / Aardman stop-motion animation puppet stage, locked motion-control camera rig at f/11 deep depth-of-field, crisp tactile clay surface micro-detail, fixed studio lighting',
  },
  {
    id: 'pixel',
    label: 'Pixel Art',
    desc: 'Crisp 32-bit arcade master sprite sheet, pixel-perfect integer grid alignment, razor-sharp nearest-neighbor edges, locked indexed color palette, zero anti-aliasing blur',
  },
  {
    id: 'photo',
    label: 'Photorealistic',
    desc: 'High-speed 24fps cinema burst chronophotography on ARRI Alexa 65, 85mm master prime at f/11 infinite focus, 1/4000s electronic shutter, zero motion blur, tack-sharp optical clarity',
  },
];

const MOTION_MODES = [
  {
    id: 'loop',
    label: 'Seamless Loop',
    rule: 'The motion forms a closed 360-degree temporal loop: Frame 1 is the neutral start state, intermediate frames progress smoothly through the peak action, and the final frame transitions seamlessly back into Frame 1 with zero jump cut.',
  },
  {
    id: 'linear',
    label: 'Cinema Shot',
    rule: 'The motion progresses in a continuous, unbroken 24fps cinematic shot from the initial state in Frame 1 through each micro-step of the action to the final state in the last frame.',
  },
];

const LAUNCH_ICONS: Record<PromptLaunchTarget, typeof GeminiIcon> = {
  gemini: GeminiIcon,
  chatgpt: ChatGptIcon,
  grok: GrokIcon,
};

const NEON_GREEN = '#39FF14';

const BACKDROP_MODES = [
  {
    id: 'studio',
    label: 'Clean Studio',
    rule: `a uniform, uncluttered mid-tone slate studio backdrop (#2A303C) identical in every cell, separated strictly by a single flat 3px solid neon-green (${NEON_GREEN}) grid divider line (no double borders, no white inner outlines)`,
  },
  {
    id: 'scene',
    label: 'Locked Scene',
    rule: `a 100% static, locked-off environment background with zero camera pan, zero parallax shift, and identical background geometry in every single cell, separated strictly by a single flat 3px solid neon-green (${NEON_GREEN}) grid divider line`,
  },
  {
    id: 'isolated',
    label: 'Dark Contrast',
    rule: `a uniform deep charcoal backdrop (#16181F) separated strictly by a single flat 3px solid neon-green (${NEON_GREEN}) grid divider line (strictly one single line between cells, zero double lines or nested inner boxes)`,
  },
];

const BORDER_SPEC =
  `STRICT SINGLE-LINE NEON-GREEN GRID DIVIDERS (${NEON_GREEN}) — EASY TO IDENTIFY: Separate adjacent frames using ONLY a single, flat, razor-sharp 3px solid neon-green (${NEON_GREEN}) straight grid line running edge-to-edge vertically and horizontally across the canvas like a single-stroke spreadsheet grid. The neon-green color must be fully saturated and high-contrast so every cell border is instantly readable against the artwork. Strictly ONE single divider line shared between neighboring cells — NEVER draw double lines, inner frame outlines, white-and-black nested boxes, picture-frame matting, beveled edges, or drop shadows. Never use black, white, or grey for the grid.`;

const DIMENSION_LOCK_SPEC =
  '100% IDENTICAL FRAME WIDTH & HEIGHT LOCK: The canvas is partitioned into an exact mathematically uniform grid where every single frame cell has the EXACT same pixel width (100% equal column widths = 1/Columns of canvas width) and the EXACT same pixel height (100% equal row heights = 1/Rows of canvas height). Fill 100% of the canvas edge-to-edge with zero outer margins, zero variable column widths, zero variable row heights, and zero partial or cut-off edge frames.';

const PORTRAIT_ASPECT_SPEC =
  'CONSISTENT NEAR-SQUARE CELL ASPECT: Every frame is almost square, only a little taller than wide — cell width is about 90% of cell height (9:10). Keep that exact ratio in every cell so frames stay large and roomy. Never use a tall portrait, landscape, or mixed ratios inside the sheet.';

export function AiPromptBuilder({
  columns,
  rows,
  onSelectGrid,
}: AiPromptBuilderProps) {
  const [promptIdea, setPromptIdea] = useState(
    'A flying car smoothly descending and landing on a futuristic road'
  );
  const [styleId, setStyleId] = useState('cinematic');
  const [motionId, setMotionId] = useState<'loop' | 'linear'>('linear');
  const [backdropId, setBackdropId] = useState<'studio' | 'scene' | 'isolated'>(
    'scene'
  );
  const [copied, setCopied] = useState(false);

  const totalFrames = columns * rows;
  const selectedStyle =
    STYLE_PRESETS.find((s) => s.id === styleId) || STYLE_PRESETS[0];
  const selectedMotion =
    MOTION_MODES.find((m) => m.id === motionId) || MOTION_MODES[0];
  const selectedBackdrop =
    BACKDROP_MODES.find((b) => b.id === backdropId) || BACKDROP_MODES[0];

  const generatedPrompt = useMemo(() => {
    const cleanIdea = promptIdea.trim() || '[YOUR ANIMATION IDEA]';

    return `8K MASTER ANIMATION SPRITE SHEET SPECIFICATION (${columns}×${rows} UNIFORM GRID · ${totalFrames} FRAMES)

ANIMATION SCENE & ACTION: ${cleanIdea}
BACKGROUND: ${selectedBackdrop.rule}
VISUAL STYLE: ${selectedStyle.desc}

1. 100% IDENTICAL FRAME WIDTH & HEIGHT (MATHEMATICAL GRID LOCK):
- Layout: Strictly ${columns} equal-width columns horizontally × ${rows} equal-height rows vertically = ${totalFrames} identical-sized rectangular frames.
- ${DIMENSION_LOCK_SPEC}
- ${PORTRAIT_ASPECT_SPEC}

2. STRICT SINGLE-LINE NEON-GREEN FRAME BORDERS (${NEON_GREEN}):
- ${BORDER_SPEC}
- Every frame cell must be outlined by this neon-green divider so the grid is trivial to detect and slice.
- Zero incomplete, narrow, or cut-off partial cells at the right or bottom borders; zero subject overlap across cell dividers.

3. 101% SUBJECT IDENTITY & SPATIAL REGISTRATION LOCK:
- Maintain 100% invariant subject design, geometry, proportions, surface details, material shaders, and color palette across all ${totalFrames} frames.
- Locked-off tripod camera with fixed focal length, fixed distance, and static lighting rig.
- Lock the camera framing to the exact same horizontal and vertical anchor point inside every cell (zero scale jitter, zero camera drift, zero morphing between frames).

4. 24FPS CINEMA-GRADE TEMPORAL CONTINUITY:
- Sequential reading order: left-to-right across each row, top-to-bottom from Frame 1 (top-left) to Frame ${totalFrames} (bottom-right).
- Each consecutive frame advances the motion by a uniform 1/24-second micro-step (3%–5% delta between adjacent cells) for movie-smooth fluid playback.
- ${selectedMotion.rule}

5. EXTREME OPTICAL SHARPNESS (ZERO BLUR):
- Render every individual sub-frame at maximum optical resolving power with f/11 deep depth-of-field and 1/4000s high-speed shutter.
- Tack-sharp micro-detail on all edges, surfaces, and textures in all ${totalFrames} cells.
- FORBIDDEN: No black/white/grey grid lines, no double-line borders, no inner white frame outlines, no nested frame boxes, no variable frame widths or heights, no borderless frames, no motion blur, no depth-of-field bokeh blur, no soft focus, no subject morphing between frames, no text, no frame numbers, no watermarks.

6. OUTPUT FORMAT:
- Deliver the result as a single high-quality PNG image (lossless, maximum resolution).`;
  }, [
    promptIdea,
    columns,
    rows,
    totalFrames,
    selectedStyle,
    selectedMotion,
    selectedBackdrop,
  ]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <FieldInput
        label={STUDIO_COPY.promptBuilder.ideaLabel}
        type="text"
        size="sm"
        value={promptIdea}
        onChange={(e) => setPromptIdea(e.target.value)}
        placeholder={STUDIO_COPY.promptBuilder.ideaPlaceholder}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Motion Continuity</Label>
          <SculptedTabs
            value={motionId}
            onValueChange={(v) => setMotionId(v as 'loop' | 'linear')}
          >
            <SculptedTabsList size="sm" variant="segmented">
              {MOTION_MODES.map((m) => (
                <SculptedTabsTrigger key={m.id} value={m.id}>
                  {m.label}
                </SculptedTabsTrigger>
              ))}
            </SculptedTabsList>
          </SculptedTabs>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Backdrop Lock</Label>
          <SculptedTabs
            value={backdropId}
            onValueChange={(v) =>
              setBackdropId(v as 'studio' | 'scene' | 'isolated')
            }
          >
            <SculptedTabsList size="sm" variant="segmented">
              {BACKDROP_MODES.map((b) => (
                <SculptedTabsTrigger key={b.id} value={b.id}>
                  {b.label}
                </SculptedTabsTrigger>
              ))}
            </SculptedTabsList>
          </SculptedTabs>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Visual Style</Label>
        <div className="flex flex-wrap gap-1.5">
          {STYLE_PRESETS.map((st) => (
            <BevelButton
              key={st.id}
              size="xs"
              variant={styleId === st.id ? 'default' : 'secondary'}
              onClick={() => setStyleId(st.id)}
            >
              {st.label}
            </BevelButton>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Grid Size</Label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { c: 10, r: 3, label: '10×3 (30f)' },
            { c: 9, r: 3, label: '9×3 (27f)' },
            { c: 8, r: 3, label: '8×3 (24f)' },
            { c: 7, r: 4, label: '7×4 (28f)' },
          ].map((g) => (
            <BevelButton
              key={g.label}
              size="xs"
              variant={columns === g.c && rows === g.r ? 'default' : 'secondary'}
              onClick={() => onSelectGrid?.(g.c, g.r)}
            >
              {g.label}
            </BevelButton>
          ))}
        </div>
      </div>

      <Separator />

      <Card className="gap-3 bg-muted p-3">
        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
          {generatedPrompt}
        </pre>
        <div className="flex gap-2">
          <BevelButton
            className="min-w-0 flex-1"
            onClick={handleCopy}
            variant={copied ? 'secondary' : 'default'}
          >
            {copied ? (
              <>
                <PiCheckBold />
                {STUDIO_COPY.promptBuilder.copied}
              </>
            ) : (
              <>
                <PiCopySimpleBold />
                {STUDIO_COPY.promptBuilder.copy}
              </>
            )}
          </BevelButton>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <BevelButton variant="secondary" className="shrink-0 px-3" />
              }
            >
              {STUDIO_COPY.promptBuilder.open}
              <PiCaretDownBold />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              {PROMPT_LAUNCH_TARGETS.map(({ id, label }) => (
                <DropdownMenuItem
                  key={id}
                  onClick={() => launchPromptIn(id, generatedPrompt)}
                >
                  {createElement(LAUNCH_ICONS[id], { className: 'size-4' })}
                  {label}
                  <PiArrowSquareOutBold className="ms-auto size-3.5 text-muted-foreground" />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    </div>
  );
}

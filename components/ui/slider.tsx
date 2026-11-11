import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: SliderPrimitive.Root.Props) {
  const lo = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) && max > lo ? max : lo + 1;
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min]

  return (
    <SliderPrimitive.Root
      {...props}
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={lo}
      max={safeMax}
      thumbAlignment="edge"
    >
      <SliderPrimitive.Control className="relative flex w-full cursor-pointer touch-none items-center py-1.5 select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-input ring-1 ring-inset ring-input shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] select-none data-horizontal:h-1.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-1.5"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="relative z-10 block h-3.5 w-6 shrink-0 cursor-grab rounded-full bg-background bg-[radial-gradient(ellipse_at_35%_15%,rgb(255_255_255/0.32),transparent_70%),linear-gradient(180deg,transparent_50%,rgb(0_0_0/0.035))] ring-1 ring-black/8 shadow-[inset_0_1px_1px_rgb(255_255_255/0.85),inset_0_-1px_2px_rgb(0_0_0/0.05),0_1px_2px_rgb(0_0_0/0.12)] transition-[width,scale,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] select-none after:absolute after:-inset-2 hover:brightness-102 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-hidden active:w-7 active:scale-95 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50 dark:bg-[radial-gradient(ellipse_at_35%_15%,rgb(255_255_255/0.12),transparent_70%),linear-gradient(180deg,transparent_50%,rgb(0_0_0/0.055))] dark:ring-white/12 dark:shadow-[inset_0_1px_1px_rgb(255_255_255/0.16),inset_0_-1px_2px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.18)]"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }

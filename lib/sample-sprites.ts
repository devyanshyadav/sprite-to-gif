/** Parse `Title · 9×3 (27 frames)` style labels from bundled samples. */
export function sampleGridFromLabel(label: string): {
  columns: number;
  rows: number;
} {
  const match = label.match(/(\d+)×(\d+)/);
  if (!match) return { columns: 8, rows: 3 };
  return {
    columns: Number.parseInt(match[1], 10),
    rows: Number.parseInt(match[2], 10),
  };
}

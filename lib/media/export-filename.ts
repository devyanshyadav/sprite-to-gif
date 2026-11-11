/** Drops a single trailing file extension for export naming. */
export function stripFileExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}

export function toSafeDownloadName(title: string, extension: string): string {
  const base = title.replace(/[^a-z0-9-_]/gi, '_');
  return base.endsWith(extension) ? base : `${base}${extension}`;
}

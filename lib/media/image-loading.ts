import type { ImageMeta } from '@/lib/types';

export function loadHtmlImage(
  src: string,
  name: string
): Promise<{ image: HTMLImageElement; meta: ImageMeta }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      resolve({
        image: img,
        meta: {
          name,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        },
      });
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${name}`));
    img.src = src;
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('Could not read file'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export async function fetchImageAsDataUrl(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  const blob = await res.blob();
  return readFileAsDataUrl(
    new File([blob], path.split('/').pop() ?? 'sample', { type: blob.type })
  );
}

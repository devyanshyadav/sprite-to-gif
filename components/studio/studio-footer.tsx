import { STUDIO_COPY } from '@/lib/studio-copy';

export function StudioFooter() {
  const { madeBy, author, authorUrl, githubUrl, githubLabel } = STUDIO_COPY.footer;

  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl justify-center p-2">
        <p className="text-center text-xs text-muted-foreground">
          {madeBy}{' '}
          <span className="inline-flex items-center gap-1.5">
            <a
              href={authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              {author}
            </a>
            <span
              aria-hidden
              className="size-1 shrink-0 rounded-full bg-muted-foreground/50"
            />
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              {githubLabel}
            </a>
          </span>
        </p>
      </div>
    </footer>
  );
}

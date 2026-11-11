import { STUDIO_COPY } from '@/lib/studio-copy';

export function StudioFooter() {
  const { madeBy, author, authorUrl } = STUDIO_COPY.footer;

  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl justify-center p-2">
        <p className="text-center text-xs text-muted-foreground">
          {madeBy}{' '}
          <a
            href={authorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            {author}
          </a>
        </p>
      </div>
    </footer>
  );
}

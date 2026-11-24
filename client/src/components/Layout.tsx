import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface font-body text-on-surface antialiased">
      <header className="sticky top-0 z-20 border-b border-outline-variant/60 bg-surface-container-lowest">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-gutter-md px-page-margin py-gutter-md">
          <a
            href="#top"
            className="flex items-center gap-gutter-sm rounded-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-base bg-primary text-on-primary">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                radar
              </span>
            </span>
            <span className="flex items-baseline gap-gutter-sm">
              <span className="font-headline text-headline-md text-on-surface">
                Scanwick
              </span>
              <span className="hidden font-label text-label-sm text-on-surface-variant sm:inline">
                AI website auditor
              </span>
            </span>
          </a>

          <nav aria-label="Primary" className="flex items-center gap-gutter-md">
            <a
              href="#new-audit"
              className="font-label text-label-lg text-on-surface-variant transition-colors hover:text-on-surface"
            >
              New audit
            </a>
            <a
              href="#recent-audits"
              className="font-label text-label-lg text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Recent audits
            </a>
          </nav>
        </div>
      </header>

      <main
        id="top"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-gutter-xl px-page-margin py-gutter-xl"
      >
        {children}
      </main>

      <footer className="border-t border-outline-variant/60 bg-surface-container-lowest py-gutter-md text-center">
        <p className="font-body text-body-sm text-on-surface-variant">
          Scanwick · built by Oussama Elouragini
        </p>
      </footer>
    </div>
  );
}

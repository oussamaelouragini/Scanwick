import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <span className="text-xl font-bold text-slate-900">Scanwick</span>
          <span className="text-sm text-slate-500">AI website auditor</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:py-14">
        {children}
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Scanwick · built by Oussama Elouragini
      </footer>
    </div>
  );
}

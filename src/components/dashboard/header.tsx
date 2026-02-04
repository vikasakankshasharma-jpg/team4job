import { HeaderClient } from "./header-client";

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-auto flex-wrap items-center gap-4 border-b border-border/40 bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <HeaderClient />
    </header>
  );
}

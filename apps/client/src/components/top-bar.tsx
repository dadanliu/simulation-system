"use client";

import { usePathname } from "next/navigation";
import { getActiveRoute } from "../lib/routes";

export function TopBar() {
  const pathname = usePathname();
  const activeRoute = getActiveRoute(pathname);

  return (
    <header className="top-bar">
      <div>
        <h1 className="top-bar__title">{activeRoute?.title ?? "Next BFF Admin"}</h1>
        <p className="top-bar__meta">{activeRoute?.description ?? "Next.js App Router + BFF workspace bootstrap"}</p>
      </div>
      <p className="badge">{pathname}</p>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getActiveRoute, routes } from "../lib/routes";

export function SideNav() {
  const pathname = usePathname();
  const activeRoute = getActiveRoute(pathname);

  return (
    <aside className="side-nav">
      <p className="side-nav__brand">Next BFF</p>
      <nav className="side-nav__list">
        {routes.map((route) => (
          <Link
            key={route.href}
            className={`side-nav__item${activeRoute?.href === route.href ? " side-nav__item--active" : ""}`}
            href={route.href}
          >
            {route.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

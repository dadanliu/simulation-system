"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CurrentUser } from "../features/auth/types";
import { getActiveRoute, routes } from "../lib/routes";

type SideNavProps = {
  currentUser: CurrentUser;
};

export function SideNav({ currentUser }: SideNavProps) {
  const pathname = usePathname();
  const activeRoute = getActiveRoute(pathname);
  const visibleRoutes = routes.filter((route) => !route.adminOnly || currentUser.roles.includes("admin"));

  return (
    <aside className="side-nav">
      <p className="side-nav__brand">Next BFF</p>
      <nav className="side-nav__list">
        {visibleRoutes.map((route) => (
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

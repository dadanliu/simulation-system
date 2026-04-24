import Link from "next/link";
import { routes } from "../lib/routes";

export function SideNav() {
  return (
    <aside className="side-nav">
      <p className="side-nav__brand">Next BFF</p>
      <nav className="side-nav__list">
        {routes.map((route) => (
          <Link
            key={route.href}
            className={`side-nav__item${route.current ? " side-nav__item--active" : ""}`}
            href={route.href}
          >
            {route.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

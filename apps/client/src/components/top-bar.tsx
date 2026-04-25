"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { CurrentUser } from "../features/auth/types";
import { getActiveRoute } from "../lib/routes";

type TopBarProps = {
  currentUser: CurrentUser;
};

export function TopBar({ currentUser }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeRoute = getActiveRoute(pathname);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/logout", {
        credentials: "same-origin",
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("logout failed");
      }

      router.push("/login");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <header className="top-bar">
      <div>
        <h1 className="top-bar__title">{activeRoute?.title ?? "Next BFF Admin"}</h1>
        <p className="top-bar__meta">{activeRoute?.description ?? "Next.js App Router + BFF workspace bootstrap"}</p>
      </div>
      <div className="top-bar__actions">
        <div className="user-chip">
          <div>
            <p className="user-chip__name">{currentUser.username}</p>
            <p className="user-chip__meta">{currentUser.roles.join(" / ")}</p>
          </div>
          <span className="badge">{pathname}</span>
        </div>
        <button className="button button--secondary" disabled={isSubmitting} onClick={handleLogout} type="button">
          {isSubmitting ? "退出中..." : "退出登录"}
        </button>
      </div>
    </header>
  );
}

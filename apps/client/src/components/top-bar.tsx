"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiRequest } from "../features/auth/client";
import type { CurrentUser } from "../features/auth/types";
import { getActiveRoute } from "../lib/routes";

type TopBarProps = {
  appEnv: string;
  currentUser: CurrentUser;
  showEnvBadge: boolean;
};

export function TopBar({ appEnv, currentUser, showEnvBadge }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeRoute = getActiveRoute(pathname);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      await clientApiRequest(
        "/api/auth/logout",
        {
          method: "POST"
        },
        {
          fallbackMessage: "退出登录失败",
          source: "logout"
        }
      );

      router.push("/login");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <header className="top-bar">
      <div>
        <h1 className="top-bar__title">
          {activeRoute?.title ?? "Next BFF Admin"}
        </h1>
        <p className="top-bar__meta">
          {activeRoute?.description ??
            "Next.js App Router + BFF workspace bootstrap"}
        </p>
      </div>
      <div className="top-bar__actions">
        <div className="user-chip">
          <div>
            <p className="user-chip__name">{currentUser.username}</p>
            <p className="user-chip__meta">{currentUser.roles.join(" / ")}</p>
          </div>
          {showEnvBadge ? (
            <span className="badge badge--warning">{appEnv}</span>
          ) : null}
          <span className="badge">{pathname}</span>
        </div>
        <button
          className="button button--secondary"
          disabled={isSubmitting}
          onClick={handleLogout}
          type="button"
        >
          {isSubmitting ? "退出中..." : "退出登录"}
        </button>
      </div>
    </header>
  );
}

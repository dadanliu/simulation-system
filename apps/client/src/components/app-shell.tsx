import { loadClientConfig } from "../config/env";
import type { CurrentUser } from "../features/auth/types";
import { SideNav } from "./side-nav";
import { TopBar } from "./top-bar";

type AppShellProps = {
  children: React.ReactNode;
  currentUser: CurrentUser;
};

export function AppShell({ children, currentUser }: AppShellProps) {
  const { appEnv, showEnvBadge } = loadClientConfig();

  return (
    <div className="page-shell">
      <SideNav currentUser={currentUser} />
      <main className="main-panel">
        <TopBar
          appEnv={appEnv}
          currentUser={currentUser}
          showEnvBadge={showEnvBadge}
        />
        {children}
      </main>
    </div>
  );
}

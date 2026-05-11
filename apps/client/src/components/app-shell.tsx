import { loadClientConfig } from "../config/env";
import type { CurrentUser } from "../features/auth/types";
import { SideNav } from "./side-nav";
import { TopBar } from "./top-bar";

type AppShellProps = {
  children: React.ReactNode;
  currentUser: CurrentUser;
};

export function AppShell({ children, currentUser }: AppShellProps) {
  const {
    appEnv,
    appVersion,
    releaseCommitSha,
    releaseNotesUrl,
    showEnvBadge
  } = loadClientConfig();

  return (
    <div className="page-shell">
      <SideNav currentUser={currentUser} />
      <main className="main-panel">
        <TopBar
          appEnv={appEnv}
          appVersion={appVersion}
          currentUser={currentUser}
          releaseCommitSha={releaseCommitSha}
          releaseNotesUrl={releaseNotesUrl}
          showEnvBadge={showEnvBadge}
        />
        {children}
      </main>
    </div>
  );
}

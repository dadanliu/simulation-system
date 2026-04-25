import type { CurrentUser } from "../features/auth/types";
import { SideNav } from "./side-nav";
import { TopBar } from "./top-bar";

type AppShellProps = {
  children: React.ReactNode;
  currentUser: CurrentUser;
};

export function AppShell({ children, currentUser }: AppShellProps) {
  return (
    <div className="page-shell">
      <SideNav />
      <main className="main-panel">
        <TopBar currentUser={currentUser} />
        {children}
      </main>
    </div>
  );
}

import { SideNav } from "./side-nav";
import { TopBar } from "./top-bar";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="page-shell">
      <SideNav />
      <main className="main-panel">
        <TopBar />
        {children}
      </main>
    </div>
  );
}

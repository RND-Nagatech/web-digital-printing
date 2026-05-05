import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useUIStore } from "@/store/ui.store";

export const AppLayout = () => {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebar = useUIStore((s) => s.setSidebar);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncDesktopSidebar = () => {
      if (mediaQuery.matches) setSidebar(true);
    };

    syncDesktopSidebar();
    mediaQuery.addEventListener("change", syncDesktopSidebar);
    return () => mediaQuery.removeEventListener("change", syncDesktopSidebar);
  }, [setSidebar]);

  return (
    <div className="min-h-screen w-full bg-background">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Tutup sidebar"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebar(false)}
        />
      )}
      <Sidebar />
      <div className="flex min-h-screen flex-col transition-all duration-300 lg:pl-64">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

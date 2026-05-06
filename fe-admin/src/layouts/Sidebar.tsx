import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, Eye, Image as ImageIcon, Users, ShieldCheck,
  Receipt, Wallet, MessageSquare, Settings as SettingsIcon, FileBarChart,
  ChevronDown, Printer, Store, Ruler,
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_TAGLINE } from "@/utils/constants";
import dashboardIcon from "../../assets/dashboard_icon.png";
import transaksiIcon from "../../assets/transaksi_icon.png";
import laporanIcon from "../../assets/laporan_icon.png";

interface MenuItem {
  label: string;
  to?: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  children?: { label: string; to: string; permission: string }[];
}

const MENU: MenuItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, permission: "dashboard" },
  {
    label: "Master", icon: Package,
    children: [
      { label: "Master Bahan", to: "/master/bahan", permission: "materials:read" },
      { label: "Master Ukuran", to: "/master/ukuran", permission: "sizes:read" },
      { label: "Master Mata Ayam", to: "/master/mata-ayam", permission: "eyelets:read" },
      { label: "Master Banner", to: "/master/banner", permission: "banners:read" },
      { label: "Master Toko", to: "/master/toko", permission: "stores:read" },
      { label: "Master User", to: "/master/user", permission: "users:read" },
      { label: "Hak Akses User", to: "/master/hak-akses", permission: "roles:read" },
    ],
  },
  {
    label: "Transaksi", icon: Receipt,
    children: [
      { label: "Daftar Transaksi", to: "/transaksi/daftar", permission: "orders:read" },
      { label: "Penjualan", to: "/transaksi/penjualan", permission: "orders:read" },
    ],
  },
  { label: "Kas", to: "/kas", icon: Wallet, permission: "cash:read" },
  {
    label: "WhatsApp", icon: MessageSquare,
    children: [
      { label: "Setting WhatsApp", to: "/whatsapp/setting", permission: "whatsapp:send" },
      { label: "Auto Reply Rules", to: "/whatsapp/auto-reply", permission: "whatsapp:auto-reply" },
    ],
  },
  {
    label: "Laporan", icon: FileBarChart,
    children: [
      { label: "Laporan Keuangan", to: "/laporan/keuangan", permission: "menu:laporan:keuangan" },
      { label: "Laporan Managerial Bahan", to: "/laporan/managerial-bahan", permission: "menu:laporan:managerial" },
      { label: "Laporan Transaksi Penjualan", to: "/laporan/transaksi-penjualan", permission: "menu:laporan:transaksi-penjualan" },
    ],
  },
  { label: "Pengaturan", to: "/pengaturan", icon: SettingsIcon, permission: "settings:read" },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "Master Bahan": Package, "Master Mata Ayam": Eye, "Master Banner": ImageIcon,
  "Master Ukuran": Ruler,
  "Master Toko": Store,
  "Master User": Users, "Hak Akses User": ShieldCheck,
  "Setting WhatsApp": SettingsIcon, "Auto Reply Rules": MessageSquare,
  "Laporan Keuangan": FileBarChart,
  "Laporan Managerial Bahan": FileBarChart,
  "Laporan Transaksi Penjualan": FileBarChart,
  "Daftar Transaksi": Receipt,
  "Penjualan": Receipt,
};

export const Sidebar = () => {
  const { pathname } = useLocation();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const mainIconTone = "text-sidebar-primary-foreground/85";
  const subIconTone = "text-sidebar-primary-foreground/80";

  const initialOpen = MENU.reduce<Record<string, boolean>>((acc, item) => {
    if (item.children?.some((c) => pathname.startsWith(c.to))) acc[item.label] = true;
    return acc;
  }, {});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  return (
    <aside
      className={cn(
        "gradient-sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border transition-all duration-300",
        sidebarOpen ? "w-64" : "w-0 overflow-hidden lg:w-64"
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-primary shadow-glow">
          <Printer className="h-5 w-5 text-primary-foreground" />
        </div>
        {sidebarOpen && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-sidebar-primary-foreground">{APP_NAME}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/70">{APP_TAGLINE}</p>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {MENU.filter((item) => {
          if (item.children?.length) return item.children.some((child) => hasPermission(child.permission));
          if (!item.permission) return true;
          return hasPermission(item.permission);
        }).map((item) => {
          if (item.children) {
            const isOpen = openGroups[item.label] ?? false;
            const ItemIcon = item.icon;
            const visibleChildren = item.children.filter((child) => hasPermission(child.permission));

            if (!visibleChildren.length) return null;

            return (
              <div key={item.label}>
                <button
                  onClick={() => setOpenGroups((s) => ({ ...s, [item.label]: !isOpen }))}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-base",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  {item.label === "Laporan" ? (
                    <img src={laporanIcon} alt="Laporan" className="h-4 w-4 shrink-0 object-contain" />
                  ) : item.label === "Transaksi" ? (
                    <img src={transaksiIcon} alt="Transaksi" className="h-4 w-4 shrink-0 object-contain" />
                  ) : (
                    <ItemIcon className={cn("h-4.5 w-4.5 shrink-0", mainIconTone)} />
                  )}
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                    </>
                  )}
                </button>
                {isOpen && sidebarOpen && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                    {visibleChildren.map((child) => {
                      const ChildIcon = ICON_MAP[child.label] ?? Package;
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-base",
                              isActive
                                ? "bg-primary text-primary-foreground font-medium shadow-sm"
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )
                          }
                        >
                          <ChildIcon className={cn("h-3.5 w-3.5", subIconTone)} />
                          {child.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const ItemIcon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to!}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-base",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
            >
              {item.label === "Dashboard" ? (
                <img src={dashboardIcon} alt="Dashboard" className="h-4 w-4 shrink-0 object-contain" />
              ) : (
                <ItemIcon className={cn("h-4.5 w-4.5 shrink-0", mainIconTone)} />
              )}
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {sidebarOpen && (
        <div className="border-t border-sidebar-border p-4">
          <p className="text-[11px] text-sidebar-foreground/60 text-center">V1.0.0</p>
        </div>
      )}
    </aside>
  );
};

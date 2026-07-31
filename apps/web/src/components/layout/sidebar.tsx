"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radar,
  Building2,
  ListChecks,
  Users,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/user-context";
import { BILLING_ENABLED } from "@/lib/billing";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scans", label: "Scans", icon: Radar },
  { href: "/businesses", label: "Entreprises", icon: Building2 },
  { href: "/prospects", label: "Prospects", icon: ListChecks },
  { href: "/settings/team", label: "Équipe", icon: Users },
  { href: "/settings/billing", label: "Abonnement", icon: CreditCard },
].filter((item) => BILLING_ENABLED || item.href !== "/settings/billing");

const COLLAPSED_STORAGE_KEY = "ch-sidebar-collapsed";

// Infobulle visuelle pour la sidebar repliée (le title natif est trop discret)
function RailTooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {label}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  // false au premier rendu (cohérent SSR/client), puis lecture localStorage
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true") {
        setCollapsed(true);
      }
    } catch {
      // localStorage indisponible — état par défaut
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, String(!prev));
      } catch {
        // ignore
      }
      return !prev;
    });
  };

  return (
    <aside
      className={cn(
        // sticky + h-screen : la sidebar reste visible pendant le défilement
        // (pas d'overflow ici — il couperait les infobulles du mode replié).
        // z-40 : les infobulles du rail doivent passer au-dessus des cartes
        // glass du contenu (stacking contexts créés par backdrop-filter)
        "glass sticky top-0 z-40 hidden h-screen flex-col border-r border-border transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className={cn("p-6", collapsed && "flex justify-center p-3 py-6")}>
        <Link
          href="/dashboard"
          className="flex items-center gap-2"
          title={collapsed ? "CommerceHunter" : undefined}
        >
          <Image src="/logo.png" alt="CommerceHunter" width={32} height={32} />
          {!collapsed && (
            <span className="text-gradient-neon font-heading text-xl font-bold">
              CommerceHunter
            </span>
          )}
        </Link>
      </div>

      <nav className={cn("flex flex-1 flex-col gap-1", collapsed ? "px-2" : "px-3")}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition",
                collapsed ? "justify-center px-0" : "px-3",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && item.label}
              {collapsed && <RailTooltip label={item.label} />}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
        aria-expanded={!collapsed}
        className={cn(
          "group relative flex items-center gap-3 border-t border-border py-3 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
          collapsed ? "justify-center px-0" : "px-6",
        )}
      >
        {collapsed ? (
          <>
            <PanelLeftOpen className="size-4 shrink-0" />
            <RailTooltip label="Déplier le menu" />
          </>
        ) : (
          <>
            <PanelLeftClose className="size-4 shrink-0" />
            Replier
          </>
        )}
      </button>

      {user && (
        <div className={cn("border-t border-border", collapsed ? "p-2 py-4" : "p-4")}>
          <div className={cn("group relative flex items-center gap-3", collapsed && "justify-center")}>
            {collapsed && <RailTooltip label={`${user.name} — ${user.email}`} />}
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

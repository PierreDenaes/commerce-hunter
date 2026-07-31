"use client";

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

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="glass hidden w-64 flex-col border-r border-border md:flex">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.png" alt="CommerceHunter" width={32} height={32} />
          <span className="text-gradient-neon font-heading text-xl font-bold">
            CommerceHunter
          </span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

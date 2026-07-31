"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "./breadcrumbs";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";

export function Topbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
            <span className="sr-only">Menu</span>
          </Button>
          <Breadcrumbs />
        </div>
        <UserMenu />
      </header>
      <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />
    </>
  );
}

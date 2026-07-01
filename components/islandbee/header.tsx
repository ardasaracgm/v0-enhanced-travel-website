"use client";

import * as React from "react";
import { Link } from "@/i18n/routing";
import { Logo } from "@/components/islandbee/logo";
import { ChevronDown, Menu, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { TrustBar } from "@/components/islandbee/trust-bar";
import { SERVICE_ROUTES, type ServiceKey } from "@/lib/services";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const t = useTranslations("header");
  const tCommon = useTranslations("common");

  // href + disabled artık lib/services.ts'ten (tek kaynak). Sıra: canlılar
  // (ferry, araç, transfer, vize, sigorta) → "yakında" (tur, organizasyon,
  // paket) → iletişim (utility).
  const navItems: { key: ServiceKey; labelKey: string }[] = [
    { key: "ferry", labelKey: "ferryTickets" },
    { key: "carRental", labelKey: "carRental" },
    { key: "transfer", labelKey: "transfer" },
    { key: "visa", labelKey: "visaSupport" },
    { key: "insurance", labelKey: "insurance" },
    { key: "tours", labelKey: "tours" },
    { key: "events", labelKey: "eventsGroups" },
    { key: "packagePickup", labelKey: "packagePickup" },
    { key: "contact", labelKey: "contact" },
  ];

  // SERVICE_ROUTES.disabled'a göre ayır: canlılar inline, "yakında" olanlar
  // tek bir dropdown (desktop) / gruplanmış blok (mobil) içinde.
  const liveItems = navItems.filter((i) => !SERVICE_ROUTES[i.key].disabled);
  const comingSoonItems = navItems.filter((i) => SERVICE_ROUTES[i.key].disabled);

  return (
    <>
      <div className="relative z-50">
        <TrustBar />
      </div>

      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link className="flex items-center gap-2" href="/">
            <Logo priority className="h-8 md:h-9 w-auto" />
          </Link>

          <nav className="hidden xl:flex items-center gap-6">
            {liveItems.map((item) => (
              <Link
                key={item.key}
                href={SERVICE_ROUTES[item.key].href}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
              >
                {t(item.labelKey)}
              </Link>
            ))}
            {comingSoonItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors whitespace-nowrap focus:outline-none data-[state=open]:text-primary">
                  {tCommon("comingSoon")}
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {comingSoonItems.map((item) => (
                    <DropdownMenuItem
                      key={item.key}
                      disabled
                      className="cursor-not-allowed"
                    >
                      {t(item.labelKey)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:flex">
              <LanguageSwitcher />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="hidden xl:flex gap-2 text-foreground border-primary/30 hover:border-primary hover:bg-primary/5"
              asChild
            >
              <a href="tel:+302242050009">
                <Phone className="h-4 w-4 text-primary" />
                +30 22420 5009
              </a>
            </Button>

            <a href="https://wa.me/302242050008" target="_blank" rel="noopener">
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {t("bookNow")}
              </Button>
            </a>

            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  className="xl:hidden"
                  size="icon"
                  variant="ghost"
                  aria-label={t("openMenu")}
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col gap-4 mt-8">
                  {liveItems.map((item) => (
                    <Link
                      key={item.key}
                      href={SERVICE_ROUTES[item.key].href}
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t(item.labelKey)}
                    </Link>
                  ))}
                  {comingSoonItems.length > 0 && (
                    <div className="mt-1 pt-4 border-t border-border">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70 mb-3">
                        {tCommon("comingSoon")}
                      </p>
                      <div className="flex flex-col gap-3">
                        {comingSoonItems.map((item) => (
                          <span
                            key={item.key}
                            aria-disabled="true"
                            className="text-lg font-medium text-muted-foreground/50 cursor-not-allowed"
                          >
                            {t(item.labelKey)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-2 pt-4 border-t border-border">
                    <LanguageSwitcher variant="compact" />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}

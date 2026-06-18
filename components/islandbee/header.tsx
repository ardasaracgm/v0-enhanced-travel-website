"use client";

import * as React from "react";
import { Link } from "@/i18n/routing";
import { Menu, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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

  return (
    <>
      <div className="relative z-50">
        <TrustBar />
      </div>

      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link className="flex items-center gap-2" href="/">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">
                  B
                </span>
              </div>
              <span className="text-xl font-bold text-foreground">
                Travel<span className="text-primary">Beez</span>
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => {
              const { href, disabled } = SERVICE_ROUTES[item.key];
              if (disabled) {
                return (
                  <span
                    key={item.key}
                    aria-disabled="true"
                    className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground/50 cursor-not-allowed whitespace-nowrap"
                  >
                    {t(item.labelKey)}
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {tCommon("comingSoon")}
                    </span>
                  </span>
                );
              }
              return (
                <Link
                  key={item.key}
                  href={href}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
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
                  className="lg:hidden"
                  size="icon"
                  variant="ghost"
                  aria-label={t("openMenu")}
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col gap-4 mt-8">
                  {navItems.map((item) => {
                    const { href, disabled } = SERVICE_ROUTES[item.key];
                    if (disabled) {
                      return (
                        <span
                          key={item.key}
                          aria-disabled="true"
                          className="flex items-center gap-2 text-lg font-medium text-muted-foreground/50 cursor-not-allowed"
                        >
                          {t(item.labelKey)}
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {tCommon("comingSoon")}
                          </span>
                        </span>
                      );
                    }
                    return (
                      <Link
                        key={item.key}
                        href={href}
                        className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {t(item.labelKey)}
                      </Link>
                    );
                  })}
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

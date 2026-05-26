"use client";

import * as React from "react";
import { Link } from "@/i18n/routing";
import { Menu, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { TrustBar } from "@/components/islandbee/trust-bar";

<>
  <TrustBar />
</>;

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const t = useTranslations("header");

  const navItems: {
    href:
      | "/ferry"
      | "/car-rental"
      | "/tours"
      | "/visa"
      | "/events"
      | "/package-pickup"
      | "/contact";
    labelKey: string;
  }[] = [
    { href: "/ferry", labelKey: "ferryTickets" },
    { href: "/car-rental", labelKey: "carRental" },
    { href: "/tours", labelKey: "tours" },
    { href: "/events", labelKey: "eventsGroups" },
    { href: "/visa", labelKey: "visaSupport" },
    { href: "/package-pickup", labelKey: "packagePickup" },
    { href: "/contact", labelKey: "contact" },
  ];

  return (
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
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
            >
              {t(item.labelKey)}
            </Link>
          ))}
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
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t(item.labelKey)}
                  </Link>
                ))}
                <div className="mt-2 pt-4 border-t border-border">
                  <LanguageSwitcher variant="compact" />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

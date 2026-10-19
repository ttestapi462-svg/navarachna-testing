"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SidebarUserMenu } from "./sidebar-user-menu";
import {
  Layers,
  LayoutDashboard,
  ShoppingBag,
  Users,
  Palette,
  TrendingUp,
  ChevronRight,
  CalendarClock,
  Scissors,
  Sparkles,
  UserCheck,
  BookUser,
  Ruler,
  Shirt,
  ScrollText,
  LineChart,
  Target,
  type LucideIcon,
} from "lucide-react";

interface SubItem {
  title: string;
  url?: string;
  icon?: LucideIcon;
  defaultOpen?: boolean;
  items?: SubItem[];
}

interface NavItem {
  title: string;
  url?: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  items?: SubItem[];
}

const navigationStructure: NavItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Couture Orders",
    icon: ShoppingBag,
    defaultOpen: true,
    items: [
      {
        title: "Production Schedule",
        url: "/#orders",
        icon: CalendarClock,
      },
      {
        title: "In Cutting",
        icon: Scissors,
        defaultOpen: true,
        items: [
          { title: "Pattern Grading", url: "/#grading" },
          { title: "Fabric Shearing", url: "/#shearing" },
        ],
      },
      {
        title: "Hand Embroidery",
        icon: Sparkles,
        defaultOpen: false,
        items: [
          { title: "Zardozi Artisans", url: "/#zardozi" },
          { title: "Aari Needlework", url: "/#aari" },
        ],
      },
      {
        title: "Final Fitting",
        url: "/#fitting",
        icon: UserCheck,
      },
    ],
  },
  {
    title: "VIP Clients",
    icon: Users,
    defaultOpen: false,
    items: [
      {
        title: "Client Directory",
        url: "/#clients",
        icon: BookUser,
      },
      {
        title: "Measurements & Profiles",
        url: "/#measurements",
        icon: Ruler,
      },
    ],
  },
  {
    title: "Garment Catalog",
    icon: Palette,
    defaultOpen: false,
    items: [
      {
        title: "Couture Collections",
        url: "/#collections",
        icon: Shirt,
      },
      {
        title: "Fabrics & Swatches",
        icon: ScrollText,
        defaultOpen: false,
        items: [
          { title: "Raw Silk & Brocade", url: "/#silk" },
          { title: "Chanderi & Organza", url: "/#chanderi" },
          { title: "Velvet & Tulle", url: "/#velvet" },
        ],
      },
    ],
  },
  {
    title: "Revenue & Analytics",
    icon: TrendingUp,
    defaultOpen: false,
    items: [
      {
        title: "Monthly Trajectory",
        url: "/#revenue",
        icon: LineChart,
      },
      {
        title: "Production Targets",
        url: "/#targets",
        icon: Target,
      },
    ],
  },
];

function SidebarSubNavItem({
  item,
  pathname,
}: {
  item: SubItem;
  pathname: string;
}) {
  const hasGrandChildren = item.items && item.items.length > 0;
  const SubIcon = item.icon;
  const isDirectActive = item.url ? pathname === item.url : false;

  if (!hasGrandChildren) {
    return (
      <SidebarMenuSubItem>
        <SidebarMenuSubButton
          asChild
          size="sm"
          className={`h-8 w-full rounded-lg px-2 text-xs font-normal transition-colors group/sub-button ${
            isDirectActive
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground/90 hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Link href={item.url || "#"} className="flex items-center gap-2.5 w-full">
            {SubIcon && (
              <SubIcon
                className={`size-3.5 shrink-0 transition-colors ${
                  isDirectActive
                    ? "text-primary"
                    : "text-muted-foreground/70 group-hover/sub-button:text-foreground"
                }`}
              />
            )}
            <span className="truncate flex-1 text-left">{item.title}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  // Multi-Level: Inner & Inner Menu (Parent -> Child -> Grandchild)
  return (
    <SidebarMenuSubItem>
      <Collapsible defaultOpen={item.defaultOpen} className="group/nested-collapsible">
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton
            size="sm"
            className="h-8 w-full rounded-lg px-2 text-xs font-normal text-muted-foreground/90 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer flex items-center gap-2.5 group-data-[state=open]/nested-collapsible:text-foreground group-data-[state=open]/nested-collapsible:font-medium"
          >
            {SubIcon && (
              <SubIcon className="size-3.5 shrink-0 text-muted-foreground/70 group-data-[state=open]/nested-collapsible:text-primary group-hover:text-foreground transition-colors" />
            )}
            <span className="truncate flex-1 text-left">{item.title}</span>
            <ChevronRight className="size-3 shrink-0 ml-auto text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]/nested-collapsible:rotate-90 group-hover:text-foreground" />
          </SidebarMenuSubButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="my-1 ml-[15px] border-l border-border/50 pl-2.5 flex flex-col gap-0.5">
            {item.items?.map((grandChild) => {
              const GrandChildIcon = grandChild.icon;
              const isGrandChildActive = grandChild.url ? pathname === grandChild.url : false;
              return (
                <SidebarMenuSubButton
                  key={grandChild.title}
                  asChild
                  size="sm"
                  className={`h-7 w-full rounded-md px-2 text-[11.5px] font-normal transition-colors group/grandchild ${
                    isGrandChildActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Link href={grandChild.url || "#"} className="flex items-center gap-2 w-full">
                    {GrandChildIcon ? (
                      <GrandChildIcon className="size-3 shrink-0 text-muted-foreground/70" />
                    ) : (
                      <span className="size-1 rounded-full bg-muted-foreground/40 group-hover/grandchild:bg-primary transition-colors shrink-0" />
                    )}
                    <span className="truncate flex-1 text-left">{grandChild.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  );
}

function SidebarNavGroup({
  item,
  pathname,
  isCollapsed,
}: {
  item: NavItem;
  pathname: string;
  isCollapsed: boolean;
}) {
  const Icon = item.icon;

  // Case B1: In shrink mode (icon rail) -> Pure CSS Floating Flyout Menu (Zero JS timers, Zero Portals, Zero Blinking)
  if (isCollapsed) {
    return (
      <SidebarMenuItem className="relative group/flyout group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <SidebarMenuButton
          asChild
          className="h-9 rounded-xl px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto"
        >
          <div className="flex items-center justify-center size-full">
            <Icon className="size-4 shrink-0 text-muted-foreground group-hover/flyout:text-primary transition-colors" />
            <span className="sr-only">{item.title}</span>
          </div>
        </SidebarMenuButton>

        {/* Pure CSS Flyout - permanently attached via pl-2.5, immune to hover gap flickering */}
        <div className="invisible opacity-0 translate-x-1 group-hover/flyout:visible group-hover/flyout:opacity-100 group-hover/flyout:translate-x-0 transition-all duration-150 ease-out absolute left-full top-0 pl-2.5 z-50 pointer-events-none group-hover/flyout:pointer-events-auto">
          <div className="w-56 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl p-1.5 shadow-2xl ring-1 ring-black/5">
            {/* Atelier Parent Header */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-foreground border-b border-border/40 mb-1">
              <div className="flex size-5 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                <Icon className="size-3.5" />
              </div>
              <span className="truncate flex-1">{item.title}</span>
            </div>

            {/* Child Menu Links with Multi-Level (Inner & Inner) Support */}
            <div className="flex flex-col gap-0.5">
              {item.items?.map((subItem) => {
                const SubIcon = subItem.icon;
                const isSubActive = subItem.url ? pathname === subItem.url : false;
                const hasChildren = subItem.items && subItem.items.length > 0;

                if (!hasChildren) {
                  return (
                    <Link
                      key={subItem.title}
                      href={subItem.url || "#"}
                      className={`flex items-center gap-2 w-full rounded-xl text-xs font-medium py-1.5 px-2.5 transition-colors group/flyout-link ${
                        isSubActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }`}
                    >
                      {SubIcon && (
                        <SubIcon
                          className={`size-3.5 shrink-0 transition-colors ${
                            isSubActive
                              ? "text-primary"
                              : "text-muted-foreground/80 group-hover/flyout-link:text-foreground"
                          }`}
                        />
                      )}
                      <span className="truncate flex-1 text-left">{subItem.title}</span>
                    </Link>
                  );
                }

                // SubItem has nested inner items
                return (
                  <div key={subItem.title} className="rounded-xl bg-muted/40 p-1.5 flex flex-col gap-1">
                    <div className="flex items-center gap-2 px-1.5 py-0.5 text-[11px] font-semibold text-foreground/85">
                      {SubIcon && <SubIcon className="size-3.5 text-primary shrink-0" />}
                      <span className="truncate flex-1">{subItem.title}</span>
                    </div>
                    <div className="pl-2.5 flex flex-col gap-0.5 border-l border-border/50 ml-2">
                      {subItem.items?.map((grandChild) => (
                        <Link
                          key={grandChild.title}
                          href={grandChild.url || "#"}
                          className="flex items-center gap-2 rounded-lg py-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                        >
                          <span className="size-1 rounded-full bg-primary/60 shrink-0" />
                          <span className="truncate flex-1">{grandChild.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SidebarMenuItem>
    );
  }

  // When in standard expanded mode: clean collapsible accordion tree
  return (
    <Collapsible
      defaultOpen={item.defaultOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className="h-9 w-full rounded-xl px-2.5 text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer group-data-[state=open]/collapsible:text-foreground group-data-[state=open]/collapsible:font-medium"
          >
            <Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground group-data-[state=open]/collapsible:text-primary transition-colors" />
            <span className="truncate flex-1 text-left">{item.title}</span>
            <ChevronRight className="size-3.5 shrink-0 ml-auto text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-hover:text-foreground" />
          </SidebarMenuButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub className="my-1 ml-[18px] mr-0 pl-2.5 pr-0 flex flex-col gap-0.5 border-l border-sidebar-border/80">
            {item.items?.map((subItem) => (
              <SidebarSubNavItem
                key={subItem.title}
                item={subItem}
                pathname={pathname}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar font-sans select-none">
      {/* 1. Header: Refined Atelier Crest & Title + Desktop Shrink Trigger */}
      <SidebarHeader className="h-14 border-b border-sidebar-border/60 px-3 flex flex-row items-center justify-between group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
        {/* Full Brand Crest (Expanded Mode) */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group-data-[collapsible=icon]:hidden hover:opacity-90 transition-opacity"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs shrink-0">
            <Layers className="size-4" />
          </div>
          <div className="grid flex-1 text-left leading-none">
            <span className="font-semibold text-foreground text-xs tracking-tight">
              Navarachna
            </span>
            <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
              Designer Studio
            </span>
          </div>
        </Link>

        {/* Centered Crest Icon (Shrink / Collapsed Mode) */}
        <Link
          href="/"
          className="hidden group-data-[collapsible=icon]:flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs mx-auto hover:opacity-90 transition-opacity"
          title="Navarachna Designer Studio"
        >
          <Layers className="size-4" />
        </Link>
      </SidebarHeader>

      {/* 2. Main Navigation with Parent & Collapsible Child Menus */}
      <SidebarContent className="px-2.5 py-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:overflow-visible">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
              {navigationStructure.map((item) => {
                const isDirectLink = !item.items || item.items.length === 0;
                const isDirectActive = isDirectLink && pathname === item.url;
                const Icon = item.icon;

                // Case A: Direct Single-Level Item (e.g. Dashboard)
                if (isDirectLink && item.url) {
                  return (
                    <SidebarMenuItem key={item.title} className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                      <SidebarMenuButton
                        asChild
                        isActive={isDirectActive}
                        tooltip={item.title}
                        className="h-9 w-full rounded-xl px-2.5 text-xs font-medium transition-colors data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold data-[active=true]:shadow-2xs hover:bg-muted/60 text-foreground/80 hover:text-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto"
                      >
                        <Link href={item.url} className="flex items-center gap-2.5 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center">
                          <Icon className={`size-4 shrink-0 ${isDirectActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                          <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                // Case B: Collapsible Parent Menu with Children (Accordion in expanded mode; Flyout in shrink mode)
                return (
                  <SidebarNavGroup
                    key={item.title}
                    item={item}
                    pathname={pathname}
                    isCollapsed={isCollapsed}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* 3. Footer: User Profile Menu */}
      <SidebarFooter className="border-t border-sidebar-border/60 p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-2">
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <SidebarUserMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Interactive Desktop Edge Hover/Resize Rail */}
      <SidebarRail />
    </Sidebar>
  );
}

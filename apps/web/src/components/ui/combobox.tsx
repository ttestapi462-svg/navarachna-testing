"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { useFocusScopeBranch } from "@radix-ui/react-focus-scope"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ChevronDownIcon, XIcon, CheckIcon } from "lucide-react"

const Combobox = ComboboxPrimitive.Root

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      {children}
      <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
    </ComboboxPrimitive.Trigger>
  )
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      className={cn(className)}
      {...props}
    >
      <XIcon className="pointer-events-none" />
    </ComboboxPrimitive.Clear>
  )
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean
  showClear?: boolean
}) {
  return (
    <InputGroup className={cn("w-auto", className)}>
      <ComboboxPrimitive.Input
        render={<InputGroupInput disabled={disabled} />}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            asChild
            data-slot="input-group-button"
            className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
            disabled={disabled}
          >
            <ComboboxTrigger />
          </InputGroupButton>
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  )
}

const ComboboxContent = React.forwardRef<
  HTMLDivElement,
  ComboboxPrimitive.Popup.Props &
    Pick<
      ComboboxPrimitive.Positioner.Props,
      "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
    >
>(function ComboboxContent(
  {
    className,
    side = "bottom",
    sideOffset = 6,
    align = "start",
    alignOffset = 0,
    anchor,
    ...props
  },
  forwardedRef
) {
  const [popupNode, setPopupNode] = React.useState<HTMLDivElement | null>(null);

  // Register popup element with Radix FocusScope / Dialog so react-remove-scroll treats it as an allowed shard
  useFocusScopeBranch(popupNode);

  React.useEffect(() => {
    if (!popupNode) return;

    // Capture-phase wheel listener on the popup container:
    // 1. Catches wheel events anywhere within the popup (items, list, padding, search input).
    // 2. Normalizes deltaMode (lines on Windows standard mouse wheel vs pixels on trackpads).
    // 3. Directly scrolls the list via `scrollTop += delta`, completely bypassing any browser or modal scroll locks.
    // 4. Calls stopPropagation() and preventDefault() to prevent outer modal / document scroll interference.
    const handleWheel = (e: WheelEvent) => {
      const list = popupNode.querySelector('[data-slot="combobox-list"]') as HTMLElement | null;
      if (!list) return;

      // Always stop propagation so document-level react-remove-scroll never sees this event
      e.stopPropagation();

      if (list.scrollHeight <= list.clientHeight) return;

      // Normalize delta based on deltaMode:
      // 0 = DOM_DELTA_PIXEL (trackpad / precision wheel)
      // 1 = DOM_DELTA_LINE (Windows standard mouse wheel: 3 lines per notch)
      // 2 = DOM_DELTA_PAGE
      let delta = e.deltaY;
      if (e.deltaMode === 1) {
        delta *= 28; // ~28px per item height
      } else if (e.deltaMode === 2) {
        delta *= list.clientHeight;
      }

      const canScrollDown = delta > 0 && list.scrollTop + list.clientHeight < list.scrollHeight - 0.5;
      const canScrollUp = delta < 0 && list.scrollTop > 0.5;

      if (canScrollDown || canScrollUp) {
        e.preventDefault();
        list.scrollTop += delta;
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const list = popupNode.querySelector('[data-slot="combobox-list"]') as HTMLElement | null;
      if (!list) return;

      const currentY = e.touches[0].clientY;
      const delta = touchStartY - currentY;
      touchStartY = currentY;

      const canScrollDown = delta > 0 && list.scrollTop + list.clientHeight < list.scrollHeight - 0.5;
      const canScrollUp = delta < 0 && list.scrollTop > 0.5;

      if (canScrollDown || canScrollUp) {
        e.stopPropagation();
        e.preventDefault();
        list.scrollTop += delta;
      }
    };

    popupNode.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    popupNode.addEventListener("touchstart", handleTouchStart, { passive: true, capture: true });
    popupNode.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });

    return () => {
      popupNode.removeEventListener("wheel", handleWheel, { capture: true });
      popupNode.removeEventListener("touchstart", handleTouchStart, { capture: true });
      popupNode.removeEventListener("touchmove", handleTouchMove, { capture: true });
    };
  }, [popupNode]);

  const handleRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      setPopupNode(node);
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [forwardedRef]
  );

  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          ref={handleRef}
          data-slot="combobox-content"
          data-chips={!!anchor}
          className={cn(
            "group/combobox-content flex flex-col max-h-80 w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+1.75rem)] origin-(--transform-origin) overflow-hidden rounded-2xl text-popover-foreground shadow-xl ring-1 ring-foreground/10 duration-100 bg-popover relative",
            className
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
});

const ComboboxList = React.forwardRef<
  HTMLDivElement,
  ComboboxPrimitive.List.Props
>(function ComboboxList({ className, onWheel, ...props }, forwardedRef) {
  const internalRef = React.useRef<HTMLDivElement | null>(null);

  const handleRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [forwardedRef]
  );

  return (
    <ComboboxPrimitive.List
      ref={handleRef}
      data-slot="combobox-list"
      onWheel={(e) => {
        const el = internalRef.current;
        if (el && el.scrollHeight > el.clientHeight) {
          e.stopPropagation();
          let delta = e.deltaY;
          if (e.deltaMode === 1) delta *= 28;
          else if (e.deltaMode === 2) delta *= el.clientHeight;

          const canScrollDown = delta > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 0.5;
          const canScrollUp = delta < 0 && el.scrollTop > 0.5;

          if (canScrollDown || canScrollUp) {
            e.preventDefault();
            el.scrollTop += delta;
          }
        }
        onWheel?.(e);
      }}
      className={cn(
        "flex-1 min-h-0 overflow-y-auto overscroll-contain p-1.5 scroll-py-1 data-empty:p-0 [scrollbar-width:thin] [scrollbar-color:var(--scrollbar-thumb)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-border/80 [&::-webkit-scrollbar-thumb]:rounded-full",
        className
      )}
      {...props}
    />
  );
});

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2.5 rounded-2xl py-2 pr-8 pl-3 text-sm font-medium outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn(className)}
      {...props}
    />
  )
}

function ComboboxLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn("px-3 py-2.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
  return (
    <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
  )
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex",
        className
      )}
      {...props}
    />
  )
}

function ComboboxSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn("-mx-1.5 my-1.5 h-px bg-border", className)}
      {...props}
    />
  )
}

function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn(
        "flex min-h-8 flex-wrap items-center gap-1 rounded-lg border border-border/80 bg-background bg-clip-padding px-2 py-0.5 text-xs shadow-2xs transition-[color,box-shadow,border-color] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 has-aria-invalid:border-destructive has-aria-invalid:ring-2 has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1",
        className
      )}
      {...props}
    />
  )
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean
}) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        "flex h-6 w-fit items-center justify-center gap-1 rounded-md bg-muted/80 border border-border/60 px-2 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0.5",
        className
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant="ghost" size="icon-xs" />}
          className="size-4 p-0 opacity-60 hover:opacity-100 hover:bg-transparent cursor-pointer"
          data-slot="combobox-chip-remove"
        >
          <XIcon className="size-3 pointer-events-none" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  )
}

function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn("min-w-20 flex-1 text-xs sm:text-sm outline-none placeholder:text-muted-foreground bg-transparent", className)}
      {...props}
    />
  )
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null)
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
}

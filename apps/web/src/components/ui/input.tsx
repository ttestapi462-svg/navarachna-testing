import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-900 transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-900 placeholder:text-[15px] placeholder:font-normal placeholder:text-slate-400 focus-visible:border-rose-500 focus-visible:ring-3 focus-visible:ring-rose-500/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-rose-500 aria-invalid:focus-visible:border-rose-500 aria-invalid:focus-visible:ring-3 aria-invalid:focus-visible:ring-rose-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }

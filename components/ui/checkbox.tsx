import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, ...props }, ref) => {
    return (
      <span
        className={cn(
          "relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-slate-300 bg-white transition-colors",
          checked && "border-brand-navy bg-brand-navy",
          className,
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          className="absolute inset-0 cursor-pointer opacity-0"
          {...props}
        />
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };

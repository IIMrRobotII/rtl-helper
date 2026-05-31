import * as RadioGroup from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";
import { isThemePref, type ThemePref } from "@/lib/theme";

const OPTIONS: ReadonlyArray<{ value: ThemePref; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeControl({
  value,
  onValueChange,
}: {
  value: ThemePref;
  onValueChange: (next: ThemePref) => void;
}) {
  return (
    <RadioGroup.Root
      aria-label="Theme"
      value={value}
      onValueChange={(next) => {
        if (isThemePref(next)) onValueChange(next);
      }}
      className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1"
    >
      {OPTIONS.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            "flex min-h-6 cursor-pointer items-center justify-center rounded-full px-2.5 py-1",
            "text-xs font-medium text-segment-inactive transition-colors outline-none motion-reduce:transition-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            "data-[state=checked]:bg-background data-[state=checked]:text-foreground data-[state=checked]:shadow-sm",
          )}
        >
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  // Sync with whatever the inline init script (or OS preference) already applied.
  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  const toggle = (checked: boolean) => {
    const next: Theme = checked ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <div className="flex items-center gap-2" title="Toggle dark mode">
      <Sun className="size-4 text-muted-foreground" />
      <Switch
        checked={theme === "dark"}
        onCheckedChange={toggle}
        aria-label="Toggle dark mode"
      />
      <Moon className="size-4 text-muted-foreground" />
    </div>
  );
}

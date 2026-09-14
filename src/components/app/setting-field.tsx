import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

type SettingFieldProps = {
  id: string;
  label: string;
  description?: string;
  children: ReactNode;
};

export default function SettingField({
  id,
  label,
  description,
  children,
}: SettingFieldProps) {
  return (
    <div className="grid gap-2">
      <div className="grid gap-1">
        <Label htmlFor={id}>{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

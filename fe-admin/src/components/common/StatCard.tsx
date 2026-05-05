import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: number;
  accent?: "primary" | "info" | "success" | "warning";
}

const ACCENT: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

export const StatCard = ({ label, value, icon: Icon, trend, accent = "primary" }: StatCardProps) => (
  <Card className="shadow-card hover:shadow-glow transition-base border-border/60">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {typeof trend === "number" && (
            <div className="mt-2 flex items-center gap-1 text-xs font-medium">
              {trend >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className={trend >= 0 ? "text-success" : "text-destructive"}>
                {trend >= 0 ? "+" : ""}
                {trend}%
              </span>
              <span className="text-muted-foreground">vs bulan lalu</span>
            </div>
          )}
        </div>
        <div className={cn("rounded-xl p-2.5", ACCENT[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

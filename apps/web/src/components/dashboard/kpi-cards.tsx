import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Palette, ShoppingBag, Users, TrendingUp } from "lucide-react";

export function KpiCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="rounded-4xl border border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active Couture Designs
          </CardTitle>
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Palette className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">142</div>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            +12% from last month
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-4xl border border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Orders in Atelier
          </CardTitle>
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <ShoppingBag className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">38</div>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            8 ready for final fitting
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-4xl border border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Studio VIP Clients
          </CardTitle>
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">894</div>
          <p className="text-xs text-muted-foreground mt-1">98.4% retention rate</p>
        </CardContent>
      </Card>

      <Card className="rounded-4xl border border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monthly Couture Revenue
          </CardTitle>
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">$53,800</div>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            +24.5% vs atelier target
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

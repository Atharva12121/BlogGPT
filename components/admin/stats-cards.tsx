"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Stat = { label: string; value: string | number; icon?: LucideIcon };

export function StatsCards({ stats }: { stats: Stat[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    gsap.from(ref.current.querySelectorAll(".stat-card"), {
      y: 12,
     
      duration: 0.5,
      stagger: 0.08,
    });
  }, [stats]);

  return (
    <div ref={ref} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="stat-card border-border bg-card shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">{stat.label}</CardTitle>
            {stat.icon && (
              <span className="rounded-md bg-accent/15 p-2 text-accent">
                <stat.icon className="h-4 w-4" aria-hidden />
              </span>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

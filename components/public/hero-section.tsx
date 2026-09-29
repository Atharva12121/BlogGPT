"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!ref.current) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const ctx = gsap.context(() => {
      gsap.from(".hero-animate", {
        y: 24,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power2.out",
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="border-b bg-gradient-to-b from-secondary/60 to-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="hero-animate mb-4 text-sm font-medium uppercase tracking-widest text-accent">
          Internal publishing platform
        </p>
        <h1 className="hero-animate max-w-3xl font-serif text-4xl font-semibold tracking-tight sm:text-6xl">
          Share Ideas. Build Knowledge.
        </h1>
        <p className="hero-animate mt-6 max-w-2xl text-lg text-muted-foreground">
          A modern AI-powered blog builder for teams — discover insights on the public site,
          craft polished articles as an employee, and manage the platform as an admin.
        </p>
        <div className="hero-animate mt-8 flex flex-wrap gap-3">
          <Link href="/search">
            <Button size="lg" variant="accent">
              Explore Blogs
            </Button>
          </Link>
          {!loading && (user?.role === "ADMIN" || user?.role === "EMPLOYEE") && (
            <Link
              href={
                user.role === "ADMIN"
                  ? "/dashboard/admin/blogs/new"
                  : "/dashboard/employee/blogs/new"
              }
            >
              <Button size="lg" variant="outline">
                Start Writing
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

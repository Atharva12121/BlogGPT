"use client";

import type { AnalyticsRange } from "@/lib/services/stats";

const ranges: { value: AnalyticsRange; label: string }[] = [
  { value: "all", label: "Overall" },
  { value: "day", label: "Today" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom dates" },
];

export function DateRangeFilter({
  value,
  onChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  availableStartDate,
  availableEndDate,
}: {
  value: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  availableStartDate: string;
  availableEndDate: string;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
      <label className="grid gap-1 text-xs font-medium text-foreground">
        <span>Quick range</span>
        <select
          aria-label="Choose analytics date range"
          className="h-10 min-w-36 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={value}
          onChange={(event) => {
            const selected = event.currentTarget.value;
            if (
              selected === "all" ||
              selected === "day" ||
              selected === "month" ||
              selected === "year" ||
              selected === "custom"
            ) {
              onChange(selected);
              if (selected !== "custom") {
                onStartDateChange("");
                onEndDateChange("");
              } else {
                if (!startDate) onStartDateChange(availableStartDate);
                if (!endDate) onEndDateChange(availableEndDate);
              }
            }
          }}
        >
          {ranges.map((range) => (
            <option key={range.value} value={range.value}>{range.label}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-medium text-foreground">
        <span>Start date</span>
        <input
          aria-label="Analytics start date"
          type="date"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          min={availableStartDate}
          max={availableEndDate}
          value={startDate}
          onChange={(event) => {
            const selectedStart = event.currentTarget.value;
            onStartDateChange(selectedStart);
            if (endDate && selectedStart > endDate) onEndDateChange("");
            onChange("custom");
          }}
        />
      </label>
      <label className="grid gap-1 text-xs font-medium text-foreground">
        <span>End date</span>
        <input
          aria-label="Analytics end date"
          type="date"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          min={startDate || availableStartDate}
          max={availableEndDate}
          value={endDate}
          onChange={(event) => {
            onEndDateChange(event.currentTarget.value);
            onChange("custom");
          }}
        />
      </label>
      <p className="basis-full text-xs text-muted-foreground">
        Available: {availableStartDate} – {availableEndDate}. Future dates are excluded.
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Slide, ResponseRow, MCQConfig, QuizConfig } from "@/lib/types";

export function ResultsBarChart({
  slide,
  responses,
  highlightCorrect,
  fill,
}: {
  slide: Slide;
  responses: ResponseRow[];
  highlightCorrect?: boolean;
  fill?: boolean;
}) {
  const cfg = slide.config as MCQConfig | QuizConfig;
  const correctIdx = (cfg as QuizConfig).correct_index;
  const isMulti = (cfg as MCQConfig).multi ?? false;

  // Multi-MCQ stores picks as JSON in value_text; single uses value_index.
  // Quiz never multi-selects, so the regular path covers it.
  const counts = cfg.options.map((label, i) => {
    let count = 0;
    if (isMulti) {
      for (const r of responses) {
        if (!r.value_text) continue;
        try {
          const picks = JSON.parse(r.value_text) as number[];
          if (Array.isArray(picks) && picks.includes(i)) count++;
        } catch {}
      }
    } else {
      count = responses.filter((r) => r.value_index === i).length;
    }
    return { label, count, correct: highlightCorrect && i === correctIdx };
  });

  // Theme-aware chart colors so the chart actually looks different in dark mode.
  const isDark = useIsDark();
  const gridStroke = isDark ? "rgba(255,255,255,0.10)" : "#e2e8f0";
  const tickFill = isDark ? "rgba(255,255,255,0.7)" : "#475569";
  const barFill = isDark ? "#2997ff" : "#0071e3";
  const correctFill = isDark ? "#30d158" : "#16a34a";

  return (
    <div className={fill ? "w-full flex-1 min-h-[18rem]" : "h-72 w-full"}>
      <ResponsiveContainer>
        <BarChart data={counts} margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="label" tick={{ fill: tickFill, fontSize: 14 }} stroke={gridStroke} />
          <YAxis allowDecimals={false} tick={{ fill: tickFill, fontSize: 14 }} stroke={gridStroke} />
          <Tooltip
            contentStyle={{
              background: isDark ? "#1d1d1f" : "#ffffff",
              border: `1px solid ${gridStroke}`,
              borderRadius: 12,
              color: isDark ? "#f5f5f7" : "#1d1d1f",
            }}
            cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {counts.map((c, i) => (
              <Cell key={i} fill={c.correct ? correctFill : barFill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const compute = () => {
      // Per-presentation dark scene wraps content in `.scene-dark`; app-wide
      // dark mode sets `data-theme="dark"` on <html>. Either should drive the chart.
      const docDark = document.documentElement.getAttribute("data-theme") === "dark";
      const sceneDark = !!document.querySelector(".scene-dark");
      setDark(docDark || sceneDark);
    };
    compute();
    const obs = new MutationObserver(compute);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    obs.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

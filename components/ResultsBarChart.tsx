"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Slide, ResponseRow, MCQConfig, QuizConfig } from "@/lib/types";

export function ResultsBarChart({
  slide,
  responses,
  highlightCorrect,
}: {
  slide: Slide;
  responses: ResponseRow[];
  highlightCorrect?: boolean;
}) {
  const cfg = slide.config as MCQConfig | QuizConfig;
  const correctIdx = (cfg as QuizConfig).correct_index;
  const counts = cfg.options.map((label, i) => ({
    label,
    count: responses.filter((r) => r.value_index === i).length,
    correct: highlightCorrect && i === correctIdx,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={counts}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count">
            {counts.map((c, i) => (
              <Cell key={i} fill={c.correct ? "#16a34a" : "#0ea5e9"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

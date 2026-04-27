"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function AdminTrendsCharts({
  data,
}: {
  data: { day: string; signups: number; started: number; responses: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="day"
            tick={{ fill: "#a1a1a6", fontSize: 11 }}
            stroke="rgba(255,255,255,0.08)"
            tickFormatter={(v: string) => v.slice(5)}
            minTickGap={20}
          />
          <YAxis allowDecimals={false} tick={{ fill: "#a1a1a6", fontSize: 11 }} stroke="rgba(255,255,255,0.08)" />
          <Tooltip
            contentStyle={{
              background: "#1d1d1f",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 12,
              color: "#f5f5f7",
            }}
            cursor={{ stroke: "rgba(255,255,255,0.10)" }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1a6" }} />
          <Line type="monotone" dataKey="signups" name="Signups" stroke="#2997ff" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="started" name="Presentations started" stroke="#22c55e" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="responses" name="Responses" stroke="#eab308" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export function HiringFunnel({ stats }: { stats?: any }) {
  const data = [
    { name: "Applied", value: stats?.total_candidates || 0, color: "hsl(222, 47%, 20%)" },
    { name: "Screened", value: stats?.reviewed || 0, color: "hsl(173, 58%, 39%)" },
    { name: "Shortlisted", value: stats?.shortlisted || 0, color: "hsl(38, 92%, 50%)" },
    { name: "Rejected", value: stats?.rejected || 0, color: "hsl(0, 84%, 60%)" },
  ];

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="font-display text-lg">Hiring Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "hsl(220, 14%, 96%)" }}
                contentStyle={{
                  backgroundColor: "hsl(0, 0%, 100%)",
                  border: "1px solid hsl(220, 13%, 91%)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                labelStyle={{ color: "hsl(222, 47%, 11%)", fontWeight: 600 }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

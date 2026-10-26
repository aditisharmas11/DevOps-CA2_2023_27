import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { useTheme } from "next-themes";

interface DimensionScoresProps {
  moodScore: number;
  anxietyScore: number;
  socialScore: number;
}

// 1. Radar Chart Component
export const MentalHealthRadarChart: React.FC<DimensionScoresProps> = ({
  moodScore,
  anxietyScore,
  socialScore,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const data = [
    { subject: "Mood & Emotions", score: moodScore, fullMark: 100 },
    { subject: "Anxiety Regulation", score: anxietyScore, fullMark: 100 },
    { subject: "Social Connection", score: socialScore, fullMark: 100 },
  ];

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke={isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(124, 58, 237, 0.2)"} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: isDark ? "#E2E8F0" : "#4B5563", fontSize: 12, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: isDark ? "#94A3B8" : "#6B7280", fontSize: 10 }}
            stroke={isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(124, 58, 237, 0.2)"}
          />
          <RechartsTooltip
            formatter={(value: any) => [`${value}/100`, "Score"]}
            contentStyle={{
              backgroundColor: isDark ? "#1E1B2E" : "#FFFFFF",
              borderColor: isDark ? "#4C1D95" : "#8B5CF6",
              borderRadius: "0.5rem",
              color: isDark ? "#F8FAFC" : "#1F2937",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Radar
            name="Wellness Score"
            dataKey="score"
            stroke="#8B5CF6"
            fill="#8B5CF6"
            fillOpacity={isDark ? 0.5 : 0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 2. Bar Chart Component Comparing Dimensions
export const MentalHealthBarChart: React.FC<DimensionScoresProps> = ({
  moodScore,
  anxietyScore,
  socialScore,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const data = [
    { name: "Mood", score: moodScore, color: "#8B5CF6" },
    { name: "Anxiety", score: anxietyScore, color: "#A855F7" },
    { name: "Social", score: socialScore, color: "#38BDF8" },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: isDark ? "#CBD5E1" : "#4B5563", fontSize: 12 }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: isDark ? "#94A3B8" : "#6B7280", fontSize: 11 }}
          />
          <RechartsTooltip
            formatter={(val: any) => [`${val}%`, "Score"]}
            contentStyle={{
              backgroundColor: isDark ? "#1E1B2E" : "#FFFFFF",
              borderColor: isDark ? "#4C1D95" : "#8B5CF6",
              borderRadius: "0.5rem",
              color: isDark ? "#F8FAFC" : "#1F2937",
            }}
          />
          <Bar dataKey="score" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 3. Historical Trend Chart Component
interface TrendChartProps {
  history: Array<{
    id: number;
    createdAt: string;
    overallScore: number;
  }>;
}

export const AssessmentTrendChart: React.FC<TrendChartProps> = ({ history }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  if (!history || history.length === 0) {
    return null;
  }

  // Format data chronological order
  const data = [...history]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((item, idx) => ({
      date: new Date(item.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      score: item.overallScore,
      assessmentNum: `#${idx + 1}`,
    }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: isDark ? "#CBD5E1" : "#4B5563", fontSize: 11 }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: isDark ? "#94A3B8" : "#6B7280", fontSize: 11 }}
          />
          <RechartsTooltip
            formatter={(val: any) => [`${val}/100`, "Overall Score"]}
            contentStyle={{
              backgroundColor: isDark ? "#1E1B2E" : "#FFFFFF",
              borderColor: isDark ? "#4C1D95" : "#8B5CF6",
              borderRadius: "0.5rem",
              color: isDark ? "#F8FAFC" : "#1F2937",
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#8B5CF6"
            strokeWidth={3}
            dot={{ fill: "#8B5CF6", r: 4 }}
            activeDot={{ r: 6, fill: "#A855F7" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MentalHealthRadarChart;

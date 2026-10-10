import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface MentalHealthRadarChartProps {
  moodScore: number;
  anxietyScore: number;
  socialScore: number;
}

const MentalHealthRadarChart: React.FC<MentalHealthRadarChartProps> = ({
  moodScore,
  anxietyScore,
  socialScore,
}) => {
  // Format data for radar chart
  const data = [
    { subject: "Mood", A: moodScore, fullMark: 100 },
    { subject: "Anxiety", A: anxietyScore, fullMark: 100 },
    { subject: "Social", A: socialScore, fullMark: 100 },
  ];

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="rgba(138, 79, 255, 0.2)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: "#4B5563", fontSize: 14 }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            tick={{ fill: "#4B5563" }}
            stroke="rgba(138, 79, 255, 0.3)"
          />
          <Tooltip 
            formatter={(value) => [`${value}%`, 'Score']}
            contentStyle={{ backgroundColor: "white", borderColor: "#8A4FFF" }}
          />
          <Radar
            name="Score"
            dataKey="A"
            stroke="#8A4FFF"
            fill="#8A4FFF"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MentalHealthRadarChart;
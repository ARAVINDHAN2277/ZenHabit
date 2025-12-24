
import React from 'react';

interface SparklineProps {
  data: boolean[];
}

export const Sparkline: React.FC<SparklineProps> = ({ data }) => {
  const width = 120;
  const height = 20;
  const barWidth = width / data.length;

  return (
    <svg width={width} height={height} className="rounded bg-slate-50">
      {data.map((val, i) => (
        <rect
          key={i}
          x={i * barWidth}
          y={val ? 0 : height - 2}
          width={barWidth - 1}
          height={val ? height : 2}
          fill={val ? '#10b981' : '#e2e8f0'}
          className="transition-all duration-300"
        />
      ))}
    </svg>
  );
};

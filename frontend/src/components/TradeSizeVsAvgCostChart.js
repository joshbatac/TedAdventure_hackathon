import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const formatUSD = (value) => {
  return `$${parseFloat(value).toFixed(2)}`;
};

const TradeSizeVsAvgCostChart = ({ data }) => {
  return (
    <div style={{ width: "100%", height: 400 }}>
      <h3>Trade Size vs Average Cost</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="tradeSize" tickFormatter={(tick) => tick.toFixed(2)} />
          <YAxis tickFormatter={formatUSD} />
          {/* Adjust Tooltip formatter */}
          <Tooltip
            labelFormatter={(label) => `${label}`} 
            formatter={(value, name) => {
              if (name === "averageCost") {
                return formatUSD(value); // Only format averageCost values
              }
              return value; // For other values (like tradeSize), return as-is
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="averageCost" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TradeSizeVsAvgCostChart;

import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const SwapChart = ({ data }) => {
  return (
    <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap" }}>
      {/* WETH → USDT Chart */}
      <div style={{ width: "45%", height: 400 }}>
        <h3>WETH → USDT Average Cost</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="WETH/USDT Average" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* USDT → WETH Chart */}
      <div style={{ width: "45%", height: 400 }}>
        <h3>USDT → WETH Average Cost</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="USDT/WETH Average" stroke="#82ca9d" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SwapChart;

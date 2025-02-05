import React, { useState, useEffect } from "react";
import DownloadCSVButton from "./components/DownloadCSVButton"; // Import the new component
import SwapChart from "./components/SwapChart";
import TradeSizeVsAvgCostChart from "./components/TradeSizeVsAvgCostChart"; 

function App() {
  const [swapData, setSwapData] = useState([]);
  const [tradeSizeData, setTradeSizeData] = useState([]);

  useEffect(() => {
    // Fetch the CSV data from the backend for the swap chart
    fetch("http://localhost:5000/avg-swaps")
      .then((response) => response.json())
      .then((data) => setSwapData(data))
      .catch((error) => console.error("Error fetching swap data:", error));

    // Fetch the trade size vs average cost data from the backend for the new chart
    fetch("http://localhost:5000/trade-size-vs-avg-cost")
      .then((response) => response.json())
      .then((data) => setTradeSizeData(data))
      .catch((error) => console.error("Error fetching trade size data:", error));
  }, []);

  return (
    <div>
      <DownloadCSVButton />
      <SwapChart data={swapData} />
      <TradeSizeVsAvgCostChart data={tradeSizeData} />
    </div>
  );
}

export default App;

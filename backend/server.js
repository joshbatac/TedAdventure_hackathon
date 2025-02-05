import fs from 'fs';
import { parse } from 'json2csv';
import { request, gql } from 'graphql-request';
import dotenv from 'dotenv';
import axios from 'axios';
import cors from "cors";
import csv from "csv-parser";
import express from 'express';
import path from 'path';

// Define __dirname for ES modules
const __dirname = new URL('.', import.meta.url).pathname;

dotenv.config();

async function fetchBinanceMidPrice(token0Symbol, token1Symbol, date) {
    const symbol = `${token0Symbol}${token1Symbol}`;
    //const interval = '1d';
    const startTime = new Date(date).getTime();
    const endTime = startTime + 86400000; // Add one day in milliseconds
    const binanceUrl = `https://data-api.binance.vision/api/v3/uiKlines?symbol=${symbol}&interval=1d&startTime=${startTime}&endTime=${endTime}`;
    console.log(binanceUrl);
    return null; // Return null if we couldn't get the mid price
}

async function fetchSwaps(token0, token1, startTimestamp, endTimestamp, attempt = 1) {
    const endpoint = process.env.GRAPHQL_API_ENDPOINT;
    let allSwaps = [];
    let avgSwaps = [];
    let token0Symbol = "";
    let token1Symbol = "";
    let tradeSizeUSD = [];

    let clock = startTimestamp;
    while (clock <= endTimestamp) {
        let clock_end = clock + 86400;
        const query = gql`
        {
        pairs(
            where: { 
            token0: "${token0}", 
            token1: "${token1}" 
            }
        ) {
            id
            token0 {
            symbol
            }
            token1 {
            symbol
            }
            reserve0
            reserve1
            swaps(
            orderBy: timestamp
            orderDirection: asc
            where: {
                timestamp_gte: ${clock}
                timestamp_lte: ${clock_end}
            }
            ) {
            amount0In
            amount1In
            amount0Out
            amount1Out
            timestamp   
            transaction {
                id  
            }
            }
        }
        }`;

        try {
            const data = await request(endpoint, query);
            
            const pair = data.pairs[0];
            if (!pair && attempt === 1) { return fetchSwaps(token1, token0, startTimestamp, endTimestamp, 2); }
            if (!pair) { console.log("No data found for the given tokens."); return; }

            token0Symbol = pair.token0.symbol;
            token1Symbol = pair.token1.symbol;
            const swaps = pair.swaps || [];
            const reserve0 = parseFloat(pair.reserve0); // Token0 reserve in the pair
            const reserve1 = parseFloat(pair.reserve1); // Token1 reserve in the pair

            let zero_to_one_total = 0;
            let zero_to_one_count = 0;
            let one_to_zero_total = 0;
            let one_to_zero_count = 0;

            swaps.forEach((swap, index) => {
                const amount0In = parseFloat(swap.amount0In);
                const amount1In = parseFloat(swap.amount1In);
                const amount0Out = parseFloat(swap.amount0Out);
                const amount1Out = parseFloat(swap.amount1Out);
                let trueDirection = null;
                let swapPrice = null;
                let direction = "";

                if (amount0In > 0) {
                    swapPrice = amount1Out / amount0In;
                    direction = `${token0Symbol} → ${token1Symbol}`;
                    trueDirection = true;
                    zero_to_one_total += swapPrice;
                    zero_to_one_count++;
                } else if (amount1In > 0) {
                    swapPrice = amount0Out / amount1In;
                    direction = `${token1Symbol} → ${token0Symbol}`;
                    trueDirection = false;
                    one_to_zero_total = swapPrice;
                    one_to_zero_count++;
                }

                // Collect all swap data
                allSwaps.push({
                    ["Transaction ID"]: swap.transaction.id,
                    ["Date & Time"]: new Date(swap.timestamp * 1000).toISOString().replace('T', ' ').split('.')[0],
                    [`${token0Symbol} In`]: amount0In,
                    [`${token0Symbol} Out`]: amount0Out,
                    [`${token1Symbol} In`]: amount1In,
                    [`${token1Symbol} Out`]: amount1Out,
                });

                // Calculate trade size in USD
                let tradeSizeInUSD = 0;
                if (amount0In > 0) {
                    tradeSizeInUSD = amount0In * (reserve1 / reserve0); // Price of token0 in terms of token1
                } else if (amount1In > 0) {
                    tradeSizeInUSD = amount1In * (reserve0 / reserve1); // Price of token1 in terms of token0
                }

                tradeSizeUSD.push({
                    ["Transaction ID"]: swap.transaction.id,
                    ["Date & Time"]: new Date(swap.timestamp * 1000).toISOString().replace('T', ' ').split('.')[0],
                    ["Direction"]: direction,
                    ["Trade Size (USD)"]: tradeSizeInUSD,
                    ["True Direction"]: trueDirection,
                });
            });

            // Calculate averages for console log
            let zero_to_one_avg = zero_to_one_total / zero_to_one_count;
            let one_to_zero_avg = one_to_zero_total / one_to_zero_count;
            const readableTimestamp = new Date(clock * 1000).toISOString().split('T')[0];
            console.log(`Date: ${readableTimestamp}`);
            console.log(`${token0Symbol} → ${token1Symbol} Average: ${zero_to_one_avg} Total: ${zero_to_one_total} Count: ${zero_to_one_count}`);
            console.log(`${token1Symbol} → ${token0Symbol} Average: ${one_to_zero_avg} Total: ${one_to_zero_total} Count: ${one_to_zero_count}`);
            console.log('--------------------------------');

            avgSwaps.push({
                Date: readableTimestamp,
                [`${token0Symbol}/${token1Symbol} Average`]: zero_to_one_avg,
                [`${token1Symbol}/${token0Symbol} Average`]: one_to_zero_avg,
            });

        } catch (error) { 
            console.error('Error fetching data:', error);
        }

        clock += 86400; // increment day
    }

    // Create downloadable CSV for all swaps
    if (allSwaps.length > 0) {
        const filename = `fetchSwaps.csv`;
        const csv = parse(allSwaps);
        fs.writeFileSync(filename, csv);
        console.log(`Saved monthly data to ${filename}`);
    }

    // Create downloadable CSV for average swaps including Binance mid price
    if (avgSwaps.length > 0) {
        const csv = parse(avgSwaps);
        fs.writeFileSync("avg.csv", csv);
        console.log("saved avg.csv");
    }

    if (tradeSizeUSD.length > 0) {
        const tradeSizeCsv = parse(tradeSizeUSD);
        fs.writeFileSync("trade_size_usd.csv", tradeSizeCsv);
        console.log("Saved trade_size_usd.csv");
    }
}

const app = express();
app.use(cors());

app.get("/avg-swaps", (req, res) => {
  const results = [];
  fs.createReadStream("avg.csv") // Make sure the CSV file exists
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", () => res.json(results));
});

app.get("/trade-size-vs-avg-cost", (req, res) => {
    const tradeSizeData = [];
    const avgData = [];
  
    // Read the avg.csv to get the average costs
    fs.createReadStream("avg.csv")
      .pipe(csv())
      .on("data", (data) => avgData.push(data))
      .on("end", () => {
        // Read the trade_size_usd.csv to get the trade sizes
        fs.createReadStream("trade_size_usd.csv")
          .pipe(csv())
          .on("data", (data) => {
            // Match the trade size with the corresponding average cost based on date
            const avgEntry = avgData.find((entry) => entry.Date === data["Date & Time"].split(" ")[0]);
            if (avgEntry) {
              const averageCostColumn = data["True Direction"] === "true" 
                ? Object.values(avgEntry)[1]  
                : Object.values(avgEntry)[2]; 
  
              tradeSizeData.push({
                date: data["Date & Time"].split(" ")[0],
                tradeSize: parseFloat(data["Trade Size (USD)"]),
                averageCost: parseFloat(averageCostColumn),
              });
            }
          })
          .on("end", () => {
            res.json(tradeSizeData); 
          });
      });
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});

// Serve the .csv file
app.get('/download-fetchSwaps', (req, res) => {
  const filePath = path.join(__dirname, 'fetchSwaps.csv');
  res.download(filePath, 'fetchSwaps.csv', (err) => {
    if (err) {
      console.error('Error while sending the file:', err);
      res.status(500).send('Error downloading file');
    }
  });
});

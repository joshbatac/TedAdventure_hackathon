import fs from 'fs';
import { parse } from 'json2csv';
import { request, gql } from 'graphql-request';
import dotenv from 'dotenv';
import axios from 'axios';

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

            let zero_to_one_total = 0;
            let zero_to_one_count = 0;
            let one_to_zero_total = 0;
            let one_to_zero_count = 0;
            swaps.forEach((swap, index) => {
                const amount0In = parseFloat(swap.amount0In);
                const amount1In = parseFloat(swap.amount1In);
                const amount0Out = parseFloat(swap.amount0Out);
                const amount1Out = parseFloat(swap.amount1Out);

                let swapPrice = null;
                let direction = "";
               
                if (amount0In > 0) {
                    swapPrice = amount1Out / amount0In;
                    direction = `${token0Symbol} → ${token1Symbol}`;
                    zero_to_one_total += swapPrice;
                    zero_to_one_count++;

                } else if (amount1In > 0) {
                    swapPrice = amount0Out / amount1In;
                    direction = `${token1Symbol} → ${token0Symbol}`;
                    one_to_zero_total = swapPrice;
                    one_to_zero_count++;
                }

                //collect all data
                allSwaps.push({
                    ["Transaction ID"]: swap.transaction.id,
                    ["Date & Time"]: new Date(swap.timestamp * 1000).toISOString().replace('T', ' ').split('.')[0],
                    [`${token0Symbol} In`]: amount0In,
                    [`${token0Symbol} Out`]: amount0Out,
                    [`${token1Symbol} In`]: amount1In,
                    [`${token1Symbol} Out`]: amount1Out,
                });
            });

            // Calculate Binance mid price for the day
            const binanceMidPrice = await fetchBinanceMidPrice(token0Symbol, token1Symbol, clock * 1000);

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
                [`Binance Mid Price`]: binanceMidPrice || 'N/A',
            });

        } catch (error) { 
            console.error('Error fetching data:', error);
        }

        clock += 86400; // increment day
    }

    // create downloadable csv for all swaps
    if (allSwaps.length > 0) {
        const month = new Date(startTimestamp * 1000).toISOString().slice(0, 7); // YYYY-MM
        const filename = `swaps_${month}_${token0Symbol}_${token1Symbol}.csv`;
        const csv = parse(allSwaps);
        fs.writeFileSync(filename, csv);
        console.log(`Saved monthly data to ${filename}`);
    }

    // create downloadable csv for average swaps including Binance mid price
    if (avgSwaps.length > 0) {
        const csv = parse(avgSwaps);
        fs.writeFileSync("avg.csv", csv);
        console.log("saved avg.csv");
    }
}


async function fetchBinanceSymbols() {
    try {
        const response = await fetch('https://data-api.binance.vision/api/v3/exchangeInfo');
        const data = await response.json();
        const symbols = data.symbols
            .filter(symbol => symbol.status === 'TRADING') // Optional: filters only active symbols
            .map(symbol => symbol.symbol); // Extracts the symbol
        console.log(symbols); // Displays the list of symbols in the console
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Example Query
const token1 = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";  // ETH
const token0 = "0xdac17f958d2ee523a2206206994597c13d831ec7";  // USDT
const startTimestamp = 1704067200;  // Jan 1, 2024 (00:00 UTC)
const endTimestamp = 1706745599;    // Jan 31, 2024 (23:59 UTC)

//fetchSwaps(token0, token1, startTimestamp, endTimestamp);
fetchBinanceSymbols();

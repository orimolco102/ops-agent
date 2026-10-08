import express from "express";
import { MongoClient } from "mongodb";

const app = express();
const VERSION = process.env.APP_VERSION || "1.0.0";
const FAULT = process.env.FAULT === "on";

import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGODB_URI =
  // process.env.MONGODB_URI || "mongodb://localhost:27017/orders-api";
  process.env.MONGODB_URI || "mongodb+srv://orimolco102:Z2WJ5gII879g6YBR@oridb.cs4lu95.mongodb.net/orders-api";
const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
const logs = client.db().collection("logs");

async function log(message, level) {
  const line = { time: new Date(), version: VERSION, level, message };
  console.log(JSON.stringify(line));
  await logs.insertOne(line);
}

//broken version to test the agent
async function loadPrices() {
  if (FAULT) {
    await fetch("http://pricing-service:5000/prices");
  }
  return { lev: 30, err: 50 };
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/version", (req, res) => {
  res.json({ service: "orders-api", version: VERSION });
});

app.get("/logs", async (req, res) => {
  const newestFirst = { time: -1 };

  const lines = await logs
    .find({}, { projection: { _id: 0 } })
    .sort(newestFirst)
    .limit(20)
    .toArray();
  res.json({});
});

app.get("/api/orders", async (req, res) => {
  let prices;

  try {
    prices = await loadPrices();
  } catch (error) {
    await log(
      "error",
      `GET /api/orders 500 - cannot reach pricing service ${error.cause} ${error.code} ${error.message}`,
    );

    return res.status(500).json({ error: "Internal server error" });
  }

  await log("info", "GET /api/orders 200");
  res.json({ orders: [{ id: 1, item: "lulav", price: prices.lulav }] });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`orders-api V${VERSION} is running on port: ${PORT}`);
});

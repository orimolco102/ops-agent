import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;


const client = new MongoClient(MONGODB_URI, {serverSelectionTimeoutMS: 3000});

export async function saveInvestigation(investigation) {
    const collection = client.db("agent-inv").collection("investigation");
    await collection.insertOne(investigation);
}
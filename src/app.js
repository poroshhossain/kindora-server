import express from "express"
import cors from "cors"
import dotenv from "dotenv"

dotenv.config();

const app = express();

// MiddleWare
app.use(cors());
app.use(express.json());

import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}

const connectDb = await connectToMongoDB();
const db = connectDb.db("kindora-db");
const eventCollaction = db.collection("user-events");

app.get('/', (req, res) => {
    res.send("Social Development API is running!");
})

app.post('/events', async (req, res) => {
    try {
        const userData = req.body;
        console.log('userData', userData);
        const result = await eventCollaction.insertOne(userData);

        res.status(201).send({
            success: true,
            message: 'event created successfully',
            data: result
        })

    } catch (error) {
        res.status(500).send({
            success: false,
            message: 'failed to create event',
            error: error.message
        })
    }
})


export default app;
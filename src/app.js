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

app.post("/events", async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      thumbnail,
      location,
      eventDate,
    } = req.body;

    // 1. Duplicate check
    const existingEvent = await eventCollaction.findOne({
      title: title.trim(),
      eventType,
      location: location.trim(),
      eventDate,
    });

    // 2. If duplicate exists
    if (existingEvent) {
      return res.status(409).send({
        success: false,
        message: "This event already exists.",
      });
    }

    // 3. Create new event
    const eventData = {
      title: title.trim(),
      description,
      eventType,
      thumbnail,
      location: location.trim(),
      eventDate,
      createdAt: new Date(),
    };

    const result = await eventCollaction.insertOne(eventData);

    res.status(201).send({
      success: true,
      message: "Event created successfully.",
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to create event.",
    });
  }
});

app.get('/events', async (req, res) => {
    try {
        const result = await eventCollaction.find().sort({ createdAt: -1 }).toArray();

        res.send(result)

    } catch (error) {
        res.status(500).send({
            success: false,
            message: 'failed to load event',
            error: error.message
        })
    }
})
import { ObjectId } from "mongodb";

app.get("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid event ID",
      });
    }

    const event = await eventCollaction.findOne({
      _id: new ObjectId(id),
    });

    if (!event) {
      return res.status(404).send({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).send(event);
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to load event",
    });
  }
});

export default app;
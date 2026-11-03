import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { MongoClient, ObjectId } from 'mongodb';

dotenv.config();

const app = express();

// MiddleWare
app.use(cors());
app.use(express.json());


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

const participleCollaction = db.collection("join-events");
await participleCollaction.createIndex(
  { eventId: 1, userEmail: 1 },
  { unique: true }
)

app.get('/', (req, res) => {
  res.send("Social Development API is running!");
})


// participleCollaction Start


app.get("/joined-events", async (req, res) => {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).send({
        success: false,
        message: "User email is required",
      });
    }

    // Step 1: Find joined records
    const joinedRecords = await participleCollaction
      .find({
        userEmail: userEmail.toLowerCase().trim(),
      })
      .toArray();

    // Step 2: Get all event IDs
    const eventIds = joinedRecords.map(
      (item) => item.eventId
    );

    // Step 3: Find all related events
    const events = await eventCollaction
      .find({
        _id: { $in: eventIds },
      })
      .toArray();

    // Step 4: Sort by event date
    events.sort(
      (a, b) =>
        new Date(a.eventDate).getTime() -
        new Date(b.eventDate).getTime()
    );
    res.status(200).send({
      success: true,
      data: events,
    });

  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Failed to load joined events",
    });
  }
});

app.post("/events/:id/join", async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;

    // Validate event ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid event ID",
      });
    }

    // Validate user email
    if (!userEmail) {
      return res.status(400).send({
        success: false,
        message: "User email is required",
      });
    }

    // Check event exists
    const event = await eventCollaction.findOne({
      _id: new ObjectId(id),
    });

    if (!event) {
      return res.status(404).send({
        success: false,
        message: "Event not found",
      });
    }

    // Check duplicate join
    const alreadyJoined = await participleCollaction.findOne({
      eventId: new ObjectId(id),
      userEmail: userEmail.toLowerCase().trim(),
    });

    if (alreadyJoined) {
      return res.status(409).send({
        success: false,
        message: "You have already joined this event.",
      });
    }

    // Save joined event
    const joinData = {
      eventId: new ObjectId(id),
      userEmail: userEmail.toLowerCase().trim(),
      joinedAt: new Date(),
    };

    const result = await participleCollaction.insertOne(joinData);

    res.status(201).send({
      success: true,
      message: "Event joined successfully!",
      insertedId: result.insertedId,
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).send({
        success: false,
        message: "You have already joined this event.",
      });
    }

    res.status(500).send({
      success: false,
      message: "Failed to join event.",
    });
  }
});

// participleCollaction End
app.get("/my-events", async (req, res) => {
  try {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).send({
        success: false,
        message: "User email is required",
      });
    }

    const events = await eventCollaction.find({
      createdBy: userEmail.toLowerCase().trim(),
    }).sort({ createdAt: -1 }).toArray();

    res.status(200).send({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Failed to load your events",
    });
  }
});

app.delete("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid event ID",
      });
    }

    if (!userEmail) {
      return res.status(400).send({
        success: false,
        message: "User email is required",
      });
    }

    const result = await eventCollaction.deleteOne({
      _id: new ObjectId(id),
      createdBy: userEmail.toLowerCase().trim(),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Event not found or you are not authorized",
      });
    }

    res.status(200).send({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Failed to delete event",
    });
  }
});

app.patch("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid event ID",
      });
    }

    if (!userEmail) {
      return res.status(400).send({
        success: false,
        message: "User email is required",
      });
    }

    // Only allow these fields to be updated
    const { data } =
      req.body;

    const updateData = {
      ...data
    };

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).send({
        success: false,
        message: "No update data provided",
      });
    }

    updateData.updatedAt = new Date();

    const result = await eventCollaction.updateOne(
      {
        _id: new ObjectId(id),
        createdBy: userEmail.toLowerCase().trim(),
      },
      {
        $set: updateData,
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Event not found or you are not authorized",
      });
    }

    res.status(200).send({
      success: true,
      message: "Event updated successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: "Failed to update event",
    });
  }
});


app.post("/events", async (req, res) => {
  try {
    const {
      title,
      description,
      eventType,
      thumbnail,
      location,
      eventDate,
      createdBy,
    } = req.body;

    // 1. Validate required fields
    if (
      !title?.trim() ||
      !description?.trim() ||
      !eventType?.trim() ||
      !thumbnail?.trim() ||
      !location?.trim() ||
      !eventDate?.trim() ||
      !createdBy?.trim()
    ) {
      return res.status(400).send({
        success: false,
        message: "All fields are required.",
      });
    }

    // 2. Normalize email
    const email = createdBy.toLowerCase().trim();

    // 3. Duplicate check
    const existingEvent = await eventCollaction.findOne({
      title: title.trim(),
      eventType,
      location: location.trim(),
      eventDate,
    });

    if (existingEvent) {
      return res.status(409).send({
        success: false,
        message: "This event already exists.",
      });
    }

    // 4. Create event
    const eventData = {
      title: title.trim(),
      description: description.trim(),
      eventType,
      thumbnail: thumbnail.trim(),
      location: location.trim(),
      eventDate,
      createdBy: email,
      createdAt: new Date(),
    };

    const result = await eventCollaction.insertOne(eventData);

    res.status(201).send({
      success: true,
      message: "Event created successfully.",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);

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
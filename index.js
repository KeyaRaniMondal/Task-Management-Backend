const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(express.json())
app.use(cors())

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.nj8v5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const dbs = client.db('TaskManagement')
    const userCollection = dbs.collection('users')
    const taskCollection = dbs.collection('tasks')

    // For creating users

    app.post('/users', async (req, res) => {
      const newUser = req.body;
      const existingUser = await userCollection.findOne({ email: newUser.email });

      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      const result = await userCollection.insertOne(newUser);
      res.status(201).json(result);
    });

    app.get('/users', async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });


    // For adding Tasks
    app.post("/tasks", async (req, res) => {
      try {
        const item = req.body;
        const { email } = item;

        const user = await userCollection.findOne({ email });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        item.userId = user._id;

        const result = await taskCollection.insertOne(item);
        const insertedTask = await taskCollection.findOne({ _id: result.insertedId });

        res.status(201).json(insertedTask);
      } catch (error) {
        console.error("Error adding task:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // Get tasks
    app.get("/tasks", async (req, res) => {
      try {
        const { email } = req.query;

        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }

        const user = await userCollection.findOne({ email });
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Fetch all user tasks
        const tasks = await taskCollection.find({ userId: user._id }).toArray();

        // Categorize and update in database if needed
        const updates = tasks.map(async (task) => {
          let newCategory = task.category;
          const dueDate = new Date(task.dueDate);

          if (dueDate < oneDayAgo && task.category !== "Done") {
            newCategory = "Done";
          } else if (dueDate <= now && dueDate >= oneDayAgo && task.category !== "In Progress") {
            newCategory = "In Progress";
          } else if (dueDate > now && task.category !== "To-Do") {
            newCategory = "To-Do";
          }

          if (newCategory !== task.category) {
            await taskCollection.updateOne(
              { _id: new ObjectId(task._id) },
              { $set: { category: newCategory } }
            );
          }
        });

        await Promise.all(updates);
        res.json(tasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // Real-time task updates using Server-Sent Events (SSE)
    app.get("/task-updates", async (req, res) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const changeStream = taskCollection.watch([], { fullDocument: "updateLookup" });

      changeStream.on("change", async (change) => {
        console.log("Change detected:", change);

        if (change.operationType === "insert" || change.operationType === "update") {
          res.write(`data: ${JSON.stringify(change.fullDocument)}\n\n`);
        }
      });

      // prevent connection timeout
      const keepAlive = setInterval(() => res.write("data: {}\n\n"), 30000);

      req.on("close", () => {
        clearInterval(keepAlive);
        changeStream.close();
      });
    });

    // Update task category manually
    app.put("/tasks/:id", async (req, res) => {
      const taskId = req.params.id;
      const { category } = req.body;

      try {
        const result = await taskCollection.updateOne(
          { _id: new ObjectId(taskId) },
          { $set: { category } }
        );

        if (result.modifiedCount > 0) {
          res.send({ success: true, message: "Task category updated successfully." });
        } else {
          res.status(404).send({ success: false, message: "Task not found." });
        }
      } catch (error) {
        console.error("Error updating task category:", error);
        res.status(500).send({ success: false, message: "Internal server error." });
      }
    });


    //For Deleting Tasks

    app.delete('/tasks/:id', async (req, res) => {
      const taskID = req.params.id
      try {
        const result = await taskCollection.deleteOne({ _id: new ObjectId(taskID) })
        res.send(result)
      }
      catch (error) {
        res.status(500).json({ message: 'Failed to delete tasks', error })
      }
    })
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('server running')
})

app.listen(port, () => {
  console.log(`server running on port : ${port}`)
})
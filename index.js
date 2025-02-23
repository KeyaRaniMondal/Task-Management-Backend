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

    app.post('/tasks', async (req, res) => {
      const item = req.body;
      const { email } = item;
      // Check if the user exists
      const user = await userCollection.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Add the user's ID to the task
      item.userId = user._id;
      const result = await taskCollection.insertOne(item);
      res.status(201).json(result);
    });

    app.get('/tasks', async (req, res) => {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Find the user
      const user = await userCollection.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Fetch tasks associated with the user
      const cursor = taskCollection.find({ userId: user._id });
      const result = await cursor.toArray();
      res.json(result);
    });


    // For updating tasks category instantly
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
const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion } = require('mongodb');

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
      const newUser = req.body
      const result = await userCollection.insertOne(newUser)
      res.send(result)
    })

    app.get('/users', async (req, res) => {
      const cursor = userCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    // For adding Tasks
    app.post('/tasks', async (req, res) => {
      const item = req.body
      const { email } = item
      const user = await userCollection.findOne({ email })
      const result = await taskCollection.insertOne(item)
      res.send(result)

    })

    app.get('/tasks', async (req, res) => {
      const cursor = taskCollection.find()
      const result = await cursor.toArray()
      res.send(result)
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
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const prot = process.env.PORT || 5000
require('dotenv').config()
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.czarj6h.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

/* const verifyLWT = (req, res, next) => {
  console.log(req.headers.authorization)
  console.log('verify pawa gese')
  const authorization = req.headers.authorization
  if (!authorization) {
    return res.send({ err: true, message: 'unauthorized access' })
  }
  const token = authorization.split(' ')[1]
  console.log("inside verify token", token)
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.send({ err: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next()
  })
 
} */
const verifyLWT = (req, res, next) => {
  const authorization = req.headers.authorization
  if(!authorization) {
    return res.status(401).send({error: true, message: 'unauthorizied access'})
  }
  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if(error) {
      return res.status(401).send({error: true, message: 'unauthorizied access'}) 
    }
    req.decoded = decoded
    next()
  })
}
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const serviceCollection = client.db('carDoctor').collection('services')
    const bookingCollection = client.db('carDoctor').collection('bookings')
    //jwt
    app.post('/jwt', (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })
    // service
    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })
    app.get('/services/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const options = {
        projection: { title: 1, img: 1, price: 1 },
      };
      const result = await serviceCollection.findOne(query, options)
      res.send(result)
    })
    //booking
    app.post('/booking', async (req, res) => {
      const newBooking = req.body
      console.log(newBooking)
      const result = await bookingCollection.insertOne(newBooking)
      res.send(result)
    })
    app.get('/booking', verifyLWT, async (req, res) => {
      // console.log(req.headers.authorization)
      console.log(req.decoded)
      if(req.decoded.email !== req.query.email) {
        return res.status(403).send({error: true, message: 'forbidden access'})
      }
      let query = {}
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const cursor = await bookingCollection.find(query).toArray()
      res.send(cursor)
    })
    app.delete('/booking/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query)
      res.send(result)
    })

    app.patch('/booking/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateBooking = req.body
      console.log(updateBooking)
      const updateDoc = {
        $set: {
          status: updateBooking.status
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('car doctor running')
})

app.listen(prot, () => {
  console.log(`car doctor running on port ${prot}`)
})
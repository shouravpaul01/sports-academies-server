const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())
const stripe = require("stripe")(process.env.PAYMENT_SECRET_SK)
const port = process.env.PORT || 5000;


const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.8sp76yj.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    const userCollection = client.db('sportsDB').collection('user')
    const classCollection = client.db('sportsDB').collection('class')
    const selectedClassCollection = client.db('sportsDB').collection('selectedClass')
    const enrolledClassCollection = client.db('sportsDB').collection('enrolledClass')

    app.post("/create-payment-intent", async (req, res) => {
      
      const price = req.body.price;
      const amount=parseFloat(price)*100
      // Create a PaymentIntent with the order amount and currency
      if (price) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types:['card'] 
        });
      
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      }
      
    });
    app.post('/enrolledClass', async (req, res) => {
      const filter={
        _id:new ObjectId(req.body.classId)
      }
      const options = { upsert: true };
      const findClass=await classCollection.findOne(filter)
      console.log(findClass);
      if (findClass.enrolledStudent) {
        const currentEnrolled=findClass.enrolledStudent+1
        const updateDoc={
          $set:{
            enrolledStudent:currentEnrolled
          }
        }
        await classCollection.updateOne(filter,updateDoc,options)
      }else{
        const updateDoc={
          $set:{
            enrolledStudent:1
          }
        }
        await classCollection.updateOne(filter,updateDoc,options)
      }
    
      
      
      const result = await enrolledClassCollection.insertOne({ ...req.body })
      res.send(result)
    })
    app.get('/enrolledClass', async (req, res) => {
      const result = await enrolledClassCollection.find({}).toArray()
      res.send(result)
    })
    app.post('/user', async (req, res) => {
      console.log('paici');
      const query = {
        email: req.body.email
      }
      const findEmail = await userCollection.findOne(query)
      if (findEmail) {
        return res.status(404).send({ message: "Allready have a same email" })
      }
      const result = await userCollection.insertOne({ ...req.body })
      res.send(result)
    })
    app.get('/user', async (req, res) => {
      const result = await userCollection.find({}).toArray()
      res.send(result)
    })
    app.get('/adminUser', async (req, res) => {
      const filter = {
        email: req.query.email,
        role: "admin"
      }
      const result = await userCollection.findOne(filter)
      if (!result) {
        return res.status(401)
      }
      return res.send(result)
    })
    app.get('/instructor', async (req, res) => {
      const filter = {
        email: req.query.email,
        role: "instructor"
      }
      const result = await userCollection.findOne(filter)
      if (!result) {
        return res.status(401)
      }
      return res.send(result)
    })
    app.get('/student', async (req, res) => {
      const filter = {
        email: req.query.email,
        role: "student"
      }
      const result = await userCollection.findOne(filter)
      if (!result) {
        return res.status(401)
      }
      return res.send(result)
    })

    app.patch('/user', async (req, res) => {
      const role = req.query.role
      const email = req.query.email
      const filter = {
        email: req.query.email
      }
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: req.query.role
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options)
      res.send(result)

    })
    //Class 
    app.post('/class', async (req, res) => {

      const result = await classCollection.insertOne({ ...req.body })
      res.send(result)
    })
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find({}).toArray()
      res.send(result)
    })
    app.get('/approveClasses', async (req, res) => {
      const filter = {
        status: "approved"
      }
      const result = await classCollection.find(filter).toArray()
      res.send(result)
    })
    app.get('/myClasses', async (req, res) => {
      const filter = {
        email: req.query.email
      }
      const result = await classCollection.find(filter).toArray()
      res.send(result)
    })
    app.patch('/updateClass', async (req, res) => {
      const filter = {
        _id:new ObjectId(req.body.id)
      }
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          className:req.body.className,
          availableSeat:req.body.availableSeat,
          price:req.body.price
        },
      };
      const result = await classCollection.updateOne(filter,updateDoc,options)
      res.send(result)
    })
    app.patch('/class', async (req, res) => {   
        const filter = {
          _id: new ObjectId(req.query.id)
        }
        const options = { upsert: true };
        
        const updateDoc = {
          $set: {
            status: req.query.status
          },
        };
        const result = await classCollection.updateOne(filter, updateDoc, options)
         res.send(result)
      
    })
    app.patch('/feedback',async(req,res)=>{
      
        const filter = {
          _id: new ObjectId(req.body.id)
        }
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            feedback: req.body.feedback
          },
        };

        const result = await classCollection.updateOne(filter, updateDoc, options)
         res.send(result)
      
    })
    app.post('/selectedClass', async (req, res) => {
      const filter={
        classId:req.body.classId,
        studentEmail:req.body.studentEmail
      }
      const findClass=await selectedClassCollection.findOne(filter)
      if(findClass){
        return res.status(401).send({message:"Already You have selected the class."})
      }
      const result = await selectedClassCollection.insertOne({ ...req.body })
      res.send(result)
    })
    app.get('/selectedClass', async (req, res) => {
      const filter={
        studentEmail:req.query.email
      }
      const result = await selectedClassCollection.find(filter).toArray()
      res.send(result)
    })
    app.delete('/selectedClass', async (req, res) => {
      const filter={
        classId:req.query.classId,
        studentEmail:req.query.email
      }
      const result = await selectedClassCollection.deleteOne(filter)
      res.send(result)
    })
    app.get('/allInstructor',async(req,res)=>{
      const filter={
        role:"instructor"
      }
      const result=await userCollection.find(filter).toArray()
      res.send(result)
    })
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send("Hello word")
})
app.listen(port, () => {
  console.log("The server is runing", port);
})
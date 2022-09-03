import * as functions from "firebase-functions"
import * as admin from "firebase-admin"
import express from "express"
import cors from "cors"
import rateLimit from "express-rate-limit"

admin.initializeApp()

const store = admin.firestore()

const app = express()

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 1 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})
app.use(apiLimiter)

app.use(cors({ origin: "*" }))

const profileCollection = store.collection("profile")

app.get("/:id", async (req, res) => {
  const data = await profileCollection.doc(req.params.id).get()

  const person = data.data() as {
    faction: string
  }

  res.json(person)
})

app.post("/:id", async (req, res) => {
  const faction = req.body.faction
  const ip = req.ip || "127.0.0.1"

  const reporter = store.collection("reporter").doc(ip)

  reporter.get()

  const batch = store.batch()

  const report = profileCollection
    .doc(req.params.id)
    .collection("reports")
    .doc(ip)

  batch.set(report, {
    faction: faction,
  })

  batch.set(reporter, {
    timestamp: Date.now(),
  })

  await batch.commit()

  res.send({
    error: false,
    message: "successfully reported",
  })
})

const profile = functions.https.onRequest(app)

// Every 1 hour count the reports and consider people's factions
const counter = functions.pubsub.schedule("every 1 hour").onRun(() => {
  //
})

module.exports = {
  api: profile,
  counter,
}

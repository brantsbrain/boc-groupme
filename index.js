const express = require("express")
const {respond} = require("./bot")
const { postPrayerRequestList } = require("./groupme-api")

const port = Number(process.env.PORT || 5000)
const app = express()

const dayofweek = 4
let dayofweekposted = false

// Parse json payloads
app.use(express.json())

const ping = (res) => {
  res.writeHead(200)
  res.end("Hey, I'm Cool Guy.")
}

app.get("/", (req, res) => {
  ping(res)

  if (!(dayofweekposted) && Date.getDay() == dayofweek && Date.getHours() == 0 && Date.getMinutes() == 0 && Date.getSeconds() == 0) {
    postPrayerRequestList()
    dayofweekposted = true
  }
})

app.post("/", (req, res) => {
  respond(req, res)
})

app.listen(port, ()=> {
  console.log(`App listening at ${port}`)
})

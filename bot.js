const cool = require('cool-ascii-faces')
const {
  praiseregex, prayregex,
  helptext, helpregex,
  coolregex, genlistregex,
  sheetregex, sheetid,
  createPost, likeMessage,
  everyoneregex, createMention, getAdmins,
  postPrayerRequestList
} = require("./groupme-api")
const nodeCron = require("node-cron")

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const weeklyList = nodeCron.schedule("5 19 * * *", function weeklyList() {
  console.log("Posting prayer request list...")
  postPrayerRequestList()
})

// Generate a response
const respond = async (req, res) => {
  try {
    const request = req.body
    const requesttext = request.text
    const senderid = request.user_id
    const sendername = request.name
    console.log(`User request: "${requesttext}"`)

    // If text matches regex
    if (requesttext) {
      res.writeHead(200)
      await sleep(1500)

      if (prayregex.test(requesttext) || praiseregex.test(requesttext)) {
        const msgId = request.id
        if (!msgId) {
          console.log("Message ID is undefined")
        }
        msgId && await likeMessage(msgId)
      }
      else if (genlistregex.test(requesttext)) {
        await postPrayerRequestList()
      } else if (coolregex.test(requesttext)) {
        await createCoolFaceMessage()
      } else if (sheetregex.test(requesttext)) {
        await createPost(sheetid)
      } else if (helpregex.test(requesttext)) {
        await createPost(helptext)
      } else if (everyoneregex.test(requesttext)) {
          let adminarr = await getAdmins()
          if (adminarr.indexOf(senderid) > -1) {
            await createMention(requesttext)
          }
          else {
            console.log(`${sendername} attempted to mention everybody`)
          }
        }
      else {
        console.log("Just chilling... doing nothing...")
      }
      res.end()
    }

    // Does not match regex
    else {
      console.log("Don't care")
      res.writeHead(200)
      res.end()
    }
  } catch (error) {
    console.log(error)
  }
}

const createCoolFaceMessage = async () => {
  const botResponse = cool()
  await createPost(botResponse)
}

exports.respond = respond

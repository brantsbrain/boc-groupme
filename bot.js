////////// IMPORTS //////////
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

////////// INITIALIZE VARS //////////
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

////////// CRON JOBS //////////
// Adjust +4 hours for UTC
// Post weekly on Sunday 8:00 AM EST
const weeklyList = nodeCron.schedule("0 12 * * 0", function weeklyList() {
  console.log("Posting prayer request list...")
  postPrayerRequestList()
})

////////// RESPOND //////////
const respond = async (req, res) => {
  try {
    const request = req.body
    const requesttext = request.text
    const senderid = request.user_id
    const sendername = request.name
    console.log(`User request: "${requesttext}"`)

    // If text exists
    if (requesttext) {
      res.writeHead(200)
      await sleep(1500)

      ////////// BASE CONTROLS //////////
      // Like prayer/praise request
      if (prayregex.test(requesttext) || praiseregex.test(requesttext)) {
        const msgId = request.id
        if (!msgId) {
          console.log("Message ID is undefined")
        }
        msgId && await likeMessage(msgId)
      }

      // Post prayer request list
      else if (genlistregex.test(requesttext)) {
        await postPrayerRequestList()
      } 
      
      // Post cool face
      else if (coolregex.test(requesttext)) {
        await createCoolFaceMessage()
      } 
      
      // Post sheet link
      else if (sheetregex.test(requesttext)) {
        await createPost(sheetid)
      } 
      
      // Post help text
      else if (helpregex.test(requesttext)) {
        await createPost(helptext)
      } 
      
      ////////// ADMIN CONTROLS //////////
      // Mention everyone
      else if (everyoneregex.test(requesttext)) {
          let adminarr = await getAdmins()
          if (adminarr.indexOf(senderid) > -1) {
            await createMention(requesttext)
          }
          else {
            console.log(`${sendername} attempted to mention everybody`)
          }
        }

      ////////// NO CONDITIONS MET //////////
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

// Create cool face
const createCoolFaceMessage = async () => {
  const botResponse = cool()
  await createPost(botResponse)
}

exports.respond = respond

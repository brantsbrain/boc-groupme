require("dotenv").config()
const got = require("got")
const { URL } = require("url")
const https = require("https")

const baseurl = "https://api.groupme.com/"
const helptext = "Prayer Bot Commands:\n" +
  "/pray - Submit something you'd like prayer for\n" +
  "/praise - Submit something you want to praise\n" +
  "/list - List all prayers and praises within the past week (auto-posts Sunday 8:00 AM)\n" +
  "/everyone - Mention everyone in the group (admins only)\n" +
  "/going - Mention everyone going to nearest upcoming event (admins only)"

const bot_id = process.env.BOT_ID
const accesstoken = process.env.ACCESS_TOKEN
const groupid = process.env.GROUP_ID
const loguserid = process.env.LOG_USERID

if (!accesstoken) {
  console.log("ENV: 'ACCESS_TOKEN' is undefined")
}
if (!groupid) {
  console.log("ENV: 'GROUP_ID' is undefined")
}

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// The bot uses the owner's credential to like a message with msgId
const likeMessage = async (msgId) => {
  const likePath = `/v3/messages/${groupid}/${msgId}/like?token=${accesstoken}`
  const destUrl = new URL(likePath, baseurl)
  console.log(`Liking message: ${msgId}`)
  const response = await got.post(destUrl, {
    json: {},
    responseType: "json",
  })
  if (response.statusCode !== 200) {
    console.log(`Error liking a message ${response.statusCode}`)
  }
}

// Post prayer/praise list
const postPrayerRequestList = async () => {
  const myLikeList = await getMyLikeList()
  const prayList = filterRegexMsgList(myLikeList, prayregex)
  const praiseList = filterRegexMsgList(myLikeList, praiseregex)
  const praisepraylist = praiseList.concat(prayList)
  await filterAndPostWeeklyList(praisepraylist)
}

// The bot retrieves a list of messages that the owner of the bot has liked
const getMyLikeList = async () => {
  try {
    const myLikePath = `/v3/groups/${groupid}/likes/mine?token=${accesstoken}`
    const destUrl = new URL(myLikePath, baseurl)
    const response = await got(destUrl, {
      responseType: "json"
    })

    if (response.statusCode == 200) {
      const likedMessageList = response.body.response.messages
      console.log("Got liked messages list...")
      return likedMessageList
    }
    return []

  } catch (error) {
    console.log(error)
  }
}

// Send DM to user id
const sendDm = async (userid, message) => {
  console.log(`Creating new DM (${message.length}): ${message}`)
  const recipient_id = userid

  // Prep message as array to accomadate long messages 
  var messagearr = []
  var currmess = ""
  for (let i = 0; i < message.length; i++) {
    if (currmess.length < 999) {
      currmess += message[i]
    }
    else {
      messagearr.push(currmess)
      console.log(`Maxed out currmess at ${currmess.length}`)
      currmess = ""
      i -= 1
    }
  }
  if (currmess.length > 0) {
    messagearr.push(currmess)
  }

  for (let i = 0; i < messagearr.length; i++) {
    await sleep(5000)
    const source_guid = String(Math.random().toString(36).substring(2, 34))
    const message = {
      direct_message: {
        recipient_id,
        source_guid,
        "text": messagearr[i]
      }
    }

    // Prep message as JSON and construct packet
    const json = JSON.stringify(message)
    const groupmeAPIOptions = {
      agent: false,
      host: "api.groupme.com",
      path: "/v3/direct_messages",
      port: 443,
      method: "POST",
      headers: {
        "Content-Length": json.length,
        "Content-Type": "application/json",
        "X-Access-Token": accesstoken
      }
    }

    // Send request
    const req = https.request(groupmeAPIOptions, response => {
      let data = ""
      response.on("data", chunk => (data += chunk))
      response.on("end", () =>
        console.log(`[GROUPME RESPONSE] ${response.statusCode} ${data}`)
      )
    })
    req.end(json)
  }
}

// Returns a list of messages that matches the regex
const filterRegexMsgList = (msgList, regex) => {
  return msgList.filter(msg => (msg.text && regex.test(msg.text)))
}

// Filter and post messages that are within the past seven days
const filterAndPostWeeklyList = async (msgList) => {
  // Set date to a week ago
  const event = new Date()
  const pastDate = event.getDate() - 7
  event.setDate(pastDate)
  const roundedDate = event.toLocaleDateString()

  // Filter out messages that have timestamps greater than a week ago
  const filteredTimePrayerList = msgList.filter(msg => (Date.parse(new Date(msg.created_at * 1000)) > Date.parse(roundedDate)))

  // Format list to prep for posting
  const prayerRequestPostMsgList = composePrayerRequestList(filteredTimePrayerList)

  // Post list
  await postMsgList(prayerRequestPostMsgList)
}

// Returns a list of posts that meets the character count requirement
const composePrayerRequestList = (msgList) => {
  let postList = []
  let post = ""

  // Displays prayer list in chronological order
  // msgList = msgList.reverse()

  msgList.map((msg) => {
    const userName = msg.name
    const firstName = userName.split(" ")[0]
    let text = ""
    let type = ""
    let epoch = msg.created_at
    let date = new Date(0)
    date.setUTCSeconds(epoch)
    console.log(date)
    date = date.toDateString()

    // Split out the first char sequence "/pray " or "/praise " from the user's post
    if (prayregex.test(msg.text)) {
      text = msg.text.slice(6)
      type = "(prayer)"
    } else {
      text = msg.text.slice(8)
      type = "(praise)"
    }

    if (text) {
      // Add the author's name to the post
      text = `${firstName} ${type} - ${date} - ${text}\n\n`
      console.log(text)

      // If text meets the char requirement, append to post
      if ((text.length + post.length) < 1000) {
        post += text
      } else {
        // Add the current post to the list of posts
        postList.push(post)

        // Split the remainder of the msg into a smaller list
        let splitMsgList = splitInto1000CharList(text)

        // Cache the last element
        const lastElement = splitMsgList.pop()

        // Push the remainder into
        postList.push(...splitMsgList)
        post = ""
        post += lastElement
      }
    }
  })

  if (post) {
    postList.sort()
    postList.push(post)
  }

  return postList
}

// Split the message into a list of mgessages that is under 999 len long
const splitInto1000CharList = (msg) => {
  const msgList = []
  let smallMsg = ""
  for (let i = 0; i < msg.length; i++) {
    if (smallMsg.length < 1000) {
      smallMsg += msg[i]
    } else {
      msgList.push(smallMsg)
      smallMsg = ""
    }
  }

  if (smallMsg) {
    msgList.push(smallMsg)
  }
  return msgList
}

// Post all the messages in msgList
const postMsgList = async (msgList) => {
  if (msgList.length == 0) {
    await sendDm(loguserid, "Prayer/Praise list empty")
  }
  else {
    for (let i = 0; i < msgList.length; i++) {
      let msg = msgList[i]
      await createPost(msg)
    }
  }
}

// Get members
const getMembers = async () => {
  const getpath = `/v3/groups/${groupid}?token=${accesstoken}`
  const desturl = new URL(getpath, baseurl)
  const response = await got(desturl, {
    responseType: "json"
  })

  memberdict = response.body.response.members
  let memberarr = []
  for (const key of Object.entries(memberdict)) {
    memberarr.push(key[1].user_id)
  }
  return memberarr
}

// Get admins/owners
const getAdmins = async () => {
  const getpath = `/v3/groups/${groupid}?token=${accesstoken}`
  const desturl = new URL(getpath, baseurl)
  const response = await got(desturl, {
    responseType: "json"
  })

  // Get admin details
  memberdict = response.body.response.members
  let adminarr = []
  for (const key of Object.entries(memberdict)) {
    if (key[1].roles.indexOf("admin") > -1) {
      console.log(`Found: ${key[1].roles} - ${key[1].user_id} - ${key[1].nickname}`)
      adminarr.push(key[1].user_id)
    }
  }

  return adminarr
}

// Create a post and mention users if ID array is provided
const createPost = async (message, mentionids) => {
  console.log(`Creating new post (${message.length}): ${message}`)
  const postPath = "/v3/bots/post"
  const desturl = new URL(postPath, baseurl)

  // Keep from endless loop in mentions
  if (message[0] == "/") {
    message = message.replace("/", "@")
  }

  // Replace curly quotes (usually from Apple devices)
  message = message
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')

  // Prep message as array to accomadate long messages 
  var messagearr = []
  var currmess = ""
  for (let i = 0; i < message.length; i++) {
    if (currmess.length < 999) {
      currmess += message[i]
    }
    else {
      messagearr.push(currmess)
      currmess = ""
    }
  }
  if (currmess.length > 0) {
    messagearr.push(currmess)
  }

  // Iterate through array as mentions or regular post
  for (let i = 0; i < messagearr.length; i++) {
    sleep(100)
    var text = messagearr[i]

    // Send message(s) w/ mention(s)
    if (mentionids) {
      console.log(`Creating new mention (${messagearr[i].length}): ${messagearr[i]}`)
      var payload = {
        text,
        bot_id,
        attachments: [{ loci: [], type: "mentions", user_ids: [] }]
      }

      for (let y = 0; y < mentionids.length; y++) {
        payload.attachments[0].loci.push([0, messagearr[i].length])
        payload.attachments[0].user_ids.push(mentionids[y])
      }

      console.log(`Mentioning: ${payload.attachments[0].user_ids}`)

      // Prep message as JSON and construct packet
      const json = JSON.stringify(payload)
      const groupmeAPIOptions = {
        agent: false,
        host: "api.groupme.com",
        path: "/v3/bots/post",
        port: 443,
        method: "POST",
        headers: {
          "Content-Length": json.length,
          "Content-Type": "application/json",
          "X-Access-Token": accesstoken
        }
      }

      const req = https.request(groupmeAPIOptions, response => {
        let data = ""
        response.on("data", chunk => (data += chunk))
        response.on("end", () =>
          console.log(`[GROUPME RESPONSE] ${response.statusCode} ${data}`)
        )
      })
      req.end(json)
    }

    // Send regular message(s)
    else {
      var payload = {
        "text": messagearr[i],
        bot_id
      }
      var response = await got.post(desturl, {
        json: payload
      })

      const statusCode = response.statusCode
      if (statusCode !== 201) {
        console.log(`Error creating a post ${statusCode}`)
      }
    }
  }
}

// Get array of IDs going to nearest non-deleted event
const getGoing = async () => {
  const limit = 5
  const date = new Date().getTime()
  const yesterdaylong = date - 24 * 60 * 60 * 1000
  const yesterday = new Date(yesterdaylong)
  var end_at = yesterday.toISOString()

  const getpath = `/v3/conversations/${groupid}/events/list?end_at=${end_at}&limit=${limit}&token=${accesstoken}`
  const desturl = new URL(getpath, baseurl)
  const response = await got(desturl, {
    responseType: "json"
  })

  console.log(response.body.response)

  const eventarr = response.body.response.events
  let goodevent = []

  for (var i = 0; i < eventarr.length; i++) {
    if ("deleted_at" in eventarr[i]) {
      console.log(`Found deleted_at in ${JSON.stringify(eventarr[i])}`)
    }
    else {
      goodevent = eventarr[i]
      console.log(`Found good event: ${JSON.stringify(goodevent)}`)
      break
    }
  }

  const memberarr = goodevent.going
  console.log(`Mentioning this array: ${memberarr}`)

  return memberarr
}

const helpregex = /^(\s)*\/help/i
const prayregex = /^(\s)*\/pray/i
const praiseregex = /^(\s)*\/praise/i
const genlistregex = /^(\s)*\/list/i
const coolregex = /^(\s)*\/cool/
const everyoneregex = /^(\s)*\/everyone/i
const goingregex = /^(\s)*\/going/i

exports.praiseregex = praiseregex
exports.prayregex = prayregex
exports.coolregex = coolregex
exports.genlistregex = genlistregex
exports.createPost = createPost
exports.likeMessage = likeMessage
exports.getMyLikeList = getMyLikeList
exports.filterMsgList = filterRegexMsgList
exports.postPrayerRequestList = postPrayerRequestList
exports.filterAndPostWeeklyList = filterAndPostWeeklyList
exports.composePrayerRequestList = composePrayerRequestList
exports.everyoneregex = everyoneregex
exports.getAdmins = getAdmins
exports.helpregex = helpregex
exports.helptext = helptext
exports.getGoing = getGoing
exports.getMembers = getMembers
exports.goingregex = goingregex

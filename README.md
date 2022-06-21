# GroupMe Prayer Bot

The heart behind this bot was to ensure that we could keep track of prayer and praise requests from any number of members of a GroupMe chat over the course of a week to be consistently keeping friends and family in mind and lifted up to the Lord. 

We are constantly looking for ways to improve on current functionality and implement new functionality. We know we're not JS pros! Please create an issue or submit a pull request if you'd like to contribute to the repo!

*"For where two or three are gathered in my name, there am I among them." - Matthew 18:20 ESV*

## Commands

| Command Usage | Purpose |
| ------------- | ------- |
| `/pray [prayer request]` | Submits prayer request on behalf of user |
| `/praise [praise request]` | Submits praise request on behalf of user |
| `/list` | Lists all prayer/praise requests within the past week |
| `/sheet` | Posts the link to a viewable-by-everyone spreadsheet |
| `/everyone [message to mention everyone]` | Admin-only command that has the bot repost the given message while mentioning everyone in the group
| `/help` | Posts an abbreviated version of the above commands' usage

---

## Implementation/Setup

### Prerequisites:

| Tool | Website | Purpose |
| ---- | ------- | ------- |
| GitHub Account | [www.github.com](www.github.com) | Hosts the JS code that deploys to Heroku |
| GroupMe Developer Account | [dev.groupme.com](dev.groupme.com) | Integrates bot into GroupMe chats and forwards messages to Heroku callback URL |
| Heroku Personal Use Account | [www.heroku.com](www.heroku.com) | Platform as a Service (PaaS) to receive messages from GroupMe bot and respond using JS app
| (Optional) Cron-Job Account | [www.cron-job.org](www.cron-job.org) | Wakes Heroku app if asleep to execute node-cron logic in JS app

### 1. Forking GitHub Repo

1. Fork the `prod` branch of `brantsbrain/boc-groupme` to your own GitHub account

### 2. Prepping Heroku App

1. Browse to [dashboard.heroku.com](dashboard.heroku.com) > New > Create New App
2. Give the app a unique name and click Create
3. Connect to GitHub by browsing to Deploy > Deployment Method > GitHub and sign in using your GitHub credentials
4. Attach the forked `boc-groupme/prod` repo to the app
5. Make note of the Heroku app URL under Settings > Domains

### 3. Creating GroupMe Bot

1. Browse to [dev.groupme.com](dev.groupme.com) > Bots > Create Bot
2. Choose the desired chat for the bot (Note: You must be the owner or an admin of the chat to add a bot)
3. Give the bot a name that will appear with each posted message in your chat
4. Insert the URL found in step 5 of `Prepping Heroku App` for the `Callback URL` field
5. `Avatar URL` is optional, but must be an absolute URL path to an image format file (i.e., ending with .jpeg, .png, etc.)
6. Click `Submit` and check the desired GroupMe chat to ensure the bot was added

### 4. Addtional Prep and Deploying Heroku App

1. In the Heroku app, browse to Settings > Config Vars > Reveal Config Vars
2. `boc-groupme` has three required and one optional Config Var: 
    | Config Var | Location |
    | ---------- | -------- |
    | ACCESS_TOKEN | [dev.groupme.com](dev.groupme.com) > Access Token |
    | BOT_ID | [dev.groupme.com](dev.groupme.com) > Bots > Created Bot > Bot ID |
    | GROUP_ID | [dev.groupme.com](dev.groupme.com) > Bots > Created Bot > Group Id |
    | SHEET_ID (Optional) | A viewable-by-everyone shared link to a Google Sheet |
3. Insert the Config Var as the `KEY` and the location values as the `VALUE`
4. Deploy the Heroku app by going to Deploy > Manual Deploy > Deploy Branch (Note: You should be deploying the `prod` branch)
5. You can optionally `Enable Automatic Deploys` to automatically redeploy the branch after any changes are merged to the GitHub repo

### 5. Testing

1. In the Heroku app, open More > View Logs. The window should be populating with data and eventually say something to the effect of `App listening at XXXX` and `State changed from starting to up`. This means the bot is up and listening for requests from the GroupMe bot. Keep this window up
2. In the GroupMe chat, test the bot by running a `/pray`. You should see a nearly instantaneous like by yourself and several lines of logs in the Heroku log window

### 6. (Optional) Cron-Job Site

`boc-groupme` is configured to automatically run a `/list` at 8:00 AM EST every Sunday. If the chat is inactive for 20 min, it goes to sleep and won't run `/list` if that time passes. To fix this, we can configure a lightweight `GET` request to send the Heroku app at 7:55 AM EST every Sunday to make sure the app is awake to run `/list`. If this isn't implemented, somebody would need to post an arbitrary message less than 20 min before 8:00 AM EST each Sunday morning.

1. Create a cronjob on [www.cron-job.org](www.cron-job.org) and give it an arbitrary title
2. Insert the same app URL we used in step 5 of `Prepping Heroku App` for the `URL` field
3. Enable the job
4. Set the job to execute every Sunday at 7:55 AM. The crontab expression should be `55 7 * * 0`
5. Save the job

---

## Acknowledgements and Disclaimers

Acknowledgements
- brantsbrain
- justinmooney3096

Disclaimer

*This code is provided as is and is not guaranteed in any fashion. We are not responsible for any misuse of or any unwanted actions taken by the code in applications of it*
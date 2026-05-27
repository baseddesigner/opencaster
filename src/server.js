require('dotenv').config()

const { createApp } = require('./app')
const { loadConfig } = require('./config')

const config = loadConfig(process.env)
const app = createApp({ config })

app.listen(config.port, config.host, () => {
  console.log(`farcaster-lite-client listening on http://${config.host}:${config.port}`)
})

import dotenv from 'dotenv'
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'

dotenv.config({ path: '.env.local' })
dotenv.config()

import { SHARED_CONSTANT } from '@template/core'
import cors from 'cors'
import express from 'express'

const app = express()
const port = process.env.PORT || 3001
const host = process.env.HOST || 'localhost'

app.use(cors())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: SHARED_CONSTANT })
})

const options = {
  key: fs.readFileSync(path.join(process.cwd(), '../../.certs/localhost.key')),
  cert: fs.readFileSync(path.join(process.cwd(), '../../.certs/localhost.cert'))
}

https.createServer(options, app).listen(Number(port), host, () => {
  console.log(`Server running at https://${host}:${port}`)
})

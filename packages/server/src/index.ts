import * as dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') })
} else if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../.env.dev') })
}

import { app } from './app.js'

const port = process.env.PORT || 3001
const host = process.env.HOST || 'localhost'

app.listen(Number(port), host, () => {
  console.log(`Server running at http://${host}:${port}`)
})

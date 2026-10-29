// Locally the suite reads the same DB settings as the app (.env.local); in CI they come from the workflow env.
import fs from 'node:fs'
import path from 'node:path'

const file = path.join(__dirname, '..', '..', '.env.local')
if (fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}

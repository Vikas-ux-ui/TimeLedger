import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

/**
 * Development-only write endpoint for the seed configuration file.
 *
 * The prototype has no backend, so this stands in for the
 * `PATCH /api/team-members/:id` a real service would expose. It lets the UI
 * persist an edit to the actual JSON on disk during development; a production
 * build has no such server and the client falls back to a local overlay.
 *
 * Scope is deliberately narrow: one fixed file path, one editable field, and
 * an id that must already exist. It never accepts a path from the request.
 */

const DATA_FILE = 'src/data/team-availability-seed-data.json'
const ROUTE = /^\/api\/team-members\/([^/?#]+)$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const MAX_BODY_BYTES = 4 * 1024

type SeedFile = {
  items: { id: string; workSchedule?: { endLocal?: string } }[]
}

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export function seedDataApiPlugin(): Plugin {
  return {
    name: 'agility-insights:seed-data-api',
    // Never part of a production build.
    apply: 'serve',

    configureServer(server) {
      const filePath = path.resolve(server.config.root, DATA_FILE)

      server.middlewares.use((req, res, next) => {
        const url = req.url ?? ''
        const match = ROUTE.exec(url.split('?')[0] ?? '')
        if (!match) return next()

        if (req.method !== 'PATCH') {
          res.statusCode = 405
          res.setHeader('Allow', 'PATCH')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        const memberId = decodeURIComponent(match[1] ?? '')

        void (async () => {
          try {
            const raw = await readBody(req)
            let payload: unknown
            try {
              payload = JSON.parse(raw)
            } catch {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Body is not valid JSON' }))
              return
            }

            const endLocal = (payload as { endLocal?: unknown })?.endLocal
            if (typeof endLocal !== 'string' || !TIME_PATTERN.test(endLocal)) {
              res.statusCode = 400
              res.end(
                JSON.stringify({ error: 'endLocal must be a HH:mm time string' }),
              )
              return
            }

            const fileContents = await readFile(filePath, 'utf8')
            const data = JSON.parse(fileContents) as SeedFile

            const member = data.items.find((item) => item.id === memberId)
            if (!member) {
              res.statusCode = 404
              res.end(JSON.stringify({ error: `Unknown team member "${memberId}"` }))
              return
            }

            member.workSchedule = { ...member.workSchedule, endLocal }

            // Matches the formatting the seed generator produces, so edits do
            // not show up as whole-file reformatting in review.
            await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ id: memberId, endLocal }))
          } catch (cause) {
            server.config.logger.error(
              `[seed-data-api] Failed to update "${memberId}": ${String(cause)}`,
            )
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Could not write the configuration file' }))
          }
        })()
      })
    },
  }
}

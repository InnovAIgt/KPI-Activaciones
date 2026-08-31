import 'dotenv/config'
import crypto from 'node:crypto'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = process.env.PORT || 3001
const apiUrl = process.env.WORKFLOW_API_URL || 'https://workflow.red.com.gt/api/integraciones/dashboard/preofertas'
const dashboardApiKey = process.env.DASHBOARD_API_KEY || process.env.WORKFLOW_API_TOKEN
const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendDirectory = path.join(currentDirectory, '..', 'dist')
const dashboardPassword = process.env.DASHBOARD_PASSWORD || '123'
const sessionSecret = process.env.DASHBOARD_SESSION_SECRET || 'local-development-secret'

const demoResponse = {
  data: [{
    preOferta: '7521', fecha: '2026-08-25', empresa: 'Empresa de ejemplo', vendedor: 'Nombre del vendedor', codigo: 'CL000001', negocio: 'Venta nueva', cantidad: 10, plazo: 24, tipoContratacion: 'Contrato', pais: 'SV', sucursalId: 2, estado: 'en_proceso', iniciada: true, finalizada: false,
    proceso: { id: 111, tipo: 'VENTA_NUEVA', estadoActual: 'en_fase_5', fechaInicio: '2026-08-25T14:00:00.000Z', fechaFin: null, etapaActual: { numero: 5, nombre: 'Entrega', estado: 'activa', fechaInicio: '2026-08-26T20:00:00.000Z', fechaFin: null, slaHoras: 8 }, etapas: [{ numero: 5, nombre: 'Entrega', estado: 'activa', fechaInicio: '2026-08-26T20:00:00.000Z', fechaFin: null, slaHoras: 8 }] }
  }],
  meta: { total: 1, pais: 'todos', estado: 'todos', generadoEn: '2026-08-27T17:00:00.000Z' }
}

function createSessionToken() {
  const payload = Buffer.from(JSON.stringify({ issuedAt: Date.now() })).toString('base64url')
  const signature = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function isValidSession(req) {
  const token = req.headers.cookie?.match(/(?:^|; )dashboard_session=([^;]+)/)?.[1]
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  const expected = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url')
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

app.use(express.json())

app.post('/api/auth/login', (req, res) => {
  if (typeof req.body?.password !== 'string' || req.body.password !== dashboardPassword) return res.status(401).json({ message: 'Contraseña incorrecta' })
  res.setHeader('Set-Cookie', `dashboard_session=${createSessionToken()}; HttpOnly; SameSite=Lax; Path=/;${process.env.NODE_ENV === 'production' ? ' Secure;' : ''}`)
  res.json({ authenticated: true })
})

app.post('/api/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'dashboard_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0')
  res.json({ authenticated: false })
})

app.get('/api/auth/session', (req, res) => res.json({ authenticated: isValidSession(req) }))

app.get('/api/preofertas', async (req, res) => {
  if (!isValidSession(req)) return res.status(401).json({ message: 'Autenticación requerida' })
  if (process.env.DEMO_MODE === 'true' || !dashboardApiKey) return res.json(demoResponse)
  const params = new URLSearchParams()
  if (req.query.pais && req.query.pais !== 'todos') params.set('pais', req.query.pais)
  if (req.query.estado && req.query.estado !== 'todos') params.set('estado', req.query.estado)
  try {
    const response = await fetch(`${apiUrl}?${params}`, { headers: { Authorization: `Bearer ${dashboardApiKey}`, Accept: 'application/json' } })
    if (!response.ok) {
      const upstreamStatus = response.status
      const errorStatus = upstreamStatus === 401 || upstreamStatus === 403 ? upstreamStatus : 502
      return res.status(errorStatus).json({ error: 'WorkflowApiError', message: `La API real respondió ${upstreamStatus}. Verifica el token y los permisos.` })
    }
    return res.json(await response.json())
  } catch (error) {
    if (process.env.DEMO_MODE !== 'false') return res.json(demoResponse)
    return res.status(502).json({ error: 'UpstreamError', message: error.message })
  }
})

app.use(express.static(frontendDirectory))
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) return res.sendFile(path.join(frontendDirectory, 'index.html'))
  next()
})

app.listen(port, () => console.log(`API proxy listening on http://localhost:${port}`))

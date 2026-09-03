import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Activity, ChevronDown, ChevronRight, CircleAlert, Clock3, Download, Filter, Moon, RefreshCw, Search, SlidersHorizontal, Sun, X } from 'lucide-react'
import './styles.css'
import './analytics.css'

const statusLabels = { no_iniciada: 'No iniciada', en_proceso: 'En proceso', finalizada: 'Finalizada', cancelada: 'Cancelada' }
const statusTone = { no_iniciada: 'muted', en_proceso: 'blue', finalizada: 'green', cancelada: 'red' }

function formatDate(value, withTime = false) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-GT', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(value))
}

function StatusPill({ status }) {
  return <span className={`pill ${statusTone[status] || 'muted'}`}><span className="dot" />{statusLabels[status] || status}</span>
}

function Detail({ item }) {
  const process = item.proceso
  return <div className="detail">
    <div className="detail-grid">
      <div><span>Proceso ID</span><strong>{process?.id ?? '—'}</strong></div>
      <div><span>Tipo de proceso</span><strong>{process?.tipo?.replaceAll('_', ' ') ?? '—'}</strong></div>
      <div><span>Estado actual</span><strong>{process?.estadoActual?.replaceAll('_', ' ') ?? '—'}</strong></div>
      <div><span>Inicio del proceso</span><strong>{formatDate(process?.fechaInicio, true)}</strong></div>
      <div><span>Fin del proceso</span><strong>{formatDate(process?.fechaFin, true)}</strong></div>
      <div><span>Etapa actual</span><strong>{process?.etapaActual?.nombre || '—'}</strong></div>
    </div>
    <div className="stages-title">Etapas del proceso <span>{process?.etapas?.length || 0}</span></div>
    <div className="stages">{(process?.etapas || []).map((stage) => <div className="stage" key={`${stage.numero}-${stage.nombre}`}>
      <div className={`stage-number ${stage.estado}`}>{stage.numero}</div><div className="stage-info"><strong>{stage.nombre}</strong><span>{stage.estado} · SLA {stage.slaHoras}h</span></div><div className="stage-date">{formatDate(stage.fechaInicio, true)}</div>
    </div>)}</div>
  </div>
}

function formatDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCurrentMonthRange() {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return { start: formatDateInput(start), end: formatDateInput(end) }
}

function ChartBars({ values, emptyLabel = 'Sin datos' }) {
  const max = Math.max(...values.map((entry) => entry.count), 1)
  if (!values.length) return <div className="chart-empty">{emptyLabel}</div>
  return <div className="chart-bars">{values.map((entry) => <div className="chart-bar-row" key={entry.label}>
    <span title={entry.label}>{entry.label}</span><div className="chart-track"><div className={`chart-fill ${entry.tone || ''}`} style={{ width: `${Math.max((entry.count / max) * 100, 4)}%` }} /></div><strong>{entry.count}</strong>
  </div>)}</div>
}

function StatusChart({ counts }) {
  const total = Math.max(counts.total, 1)
  const segments = [{ label: 'Finalizadas', count: counts.done, tone: 'green' }, { label: 'En proceso', count: counts.active, tone: 'blue' }, { label: 'Por iniciar', count: counts.pending, tone: 'muted' }, { label: 'Canceladas', count: counts.cancelled, tone: 'red' }]
  let offset = 0
  const gradient = segments.map((segment) => { const start = offset; offset += segment.count / total * 100; return `var(--chart-${segment.tone}) ${start}% ${offset}%` }).join(', ')
  return <div className="status-chart"><div className="donut-chart" style={{ background: `conic-gradient(${gradient})` }}><div><strong>{counts.total}</strong><span>Ofertas</span></div></div><div className="chart-legend">{segments.map((segment) => <div key={segment.label}><i className={segment.tone} />{segment.label}<strong>{segment.count}</strong></div>)}</div></div>
}

function App() {
  const currentMonthRange = useMemo(() => getCurrentMonthRange(), [])
  const [theme, setTheme] = useState('dark')
  const [authenticated, setAuthenticated] = useState(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('todos')
  const [status, setStatus] = useState('todos')
  const [businessType, setBusinessType] = useState('todos')
  const [stageFilter, setStageFilter] = useState('todos')
  const [dateFrom, setDateFrom] = useState(currentMonthRange.start)
  const [dateTo, setDateTo] = useState(currentMonthRange.end)
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetch('/api/auth/session').then((response) => response.json()).then((data) => setAuthenticated(data.authenticated)).catch(() => setAuthenticated(false)) }, [])

  async function login(event) {
    event.preventDefault(); setLoginError('')
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
    if (!response.ok) return setLoginError('Contraseña incorrecta')
    setAuthenticated(true); setPassword('')
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setAuthenticated(false); setItems([]); setMeta(null)
  }

  async function loadData() {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/preofertas?pais=${country}&estado=${status}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'No fue posible cargar los datos')
      setItems(payload.data || []); setMeta(payload.meta || null)
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  useEffect(() => { if (authenticated) loadData() }, [authenticated, country, status])

  const businessOptions = useMemo(() => {
    return [...new Set(items.map((item) => item.negocio).filter((value) => Boolean(value) && value !== 'MIGRACION' && value !== 'Migración'))].sort()
  }, [items])

  const stageOptions = useMemo(() => {
    return [...new Set(items.map((item) => Number(item.proceso?.etapaActual?.numero ?? item.proceso?.etapas?.[item.proceso?.etapas.length - 1]?.numero ?? 0)).filter((value) => Number.isFinite(value) && value > 0))].sort((a, b) => a - b)
  }, [items])

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((item) => {
      if (country !== 'todos' && item.pais !== country) return false
      if (status !== 'todos' && item.estado !== status) return false
      if (businessType !== 'todos' && item.negocio !== businessType) return false
      const itemStage = Number(item.proceso?.etapaActual?.numero ?? item.proceso?.etapas?.[item.proceso?.etapas.length - 1]?.numero ?? 0)
      if (stageFilter !== 'todos' && itemStage !== Number(stageFilter)) return false
      if (dateFrom && item.fecha < dateFrom) return false
      if (dateTo && item.fecha > dateTo) return false
      if (!needle) return true
      return JSON.stringify(item).toLowerCase().includes(needle)
    })
  }, [items, query, country, status, businessType, stageFilter, dateFrom, dateTo])

  const counts = useMemo(() => ({ total: filteredItems.length, active: filteredItems.filter((item) => item.estado === 'en_proceso').length, done: filteredItems.filter((item) => item.estado === 'finalizada').length, pending: filteredItems.filter((item) => item.estado === 'no_iniciada').length, cancelled: filteredItems.filter((item) => item.estado === 'cancelada').length }), [filteredItems])

  const chartData = useMemo(() => {
    const stages = new Map()
    const types = new Map()
    filteredItems.forEach((item) => {
      const stage = item.proceso?.etapaActual?.nombre || (item.estado === 'en_proceso' ? 'Etapa no definida' : 'Sin etapa activa')
      const type = item.proceso?.tipo?.replaceAll('_', ' ') || item.negocio || 'Sin tipo'
      stages.set(stage, (stages.get(stage) || 0) + 1); types.set(type, (types.get(type) || 0) + 1)
    })
    const toEntries = (map) => [...map].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }))
    return { stages: toEntries(stages).slice(0, 6), types: toEntries(types).slice(0, 6) }
  }, [filteredItems])

  function exportCsv() {
    const columns = ['Preoferta', 'Fecha', 'Empresa', 'Vendedor', 'Codigo', 'Negocio', 'Cantidad', 'Plazo', 'Contratacion', 'Pais', 'Sucursal', 'Estado', 'Iniciada', 'Finalizada']
    const rows = filteredItems.map((item) => [item.preOferta, item.fecha, item.empresa, item.vendedor, item.codigo, item.negocio, item.cantidad, item.plazo, item.tipoContratacion, item.pais, item.sucursalId, item.estado, item.iniciada, item.finalizada])
    const csv = [columns, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = 'preofertas.csv'; link.click(); URL.revokeObjectURL(link.href)
  }

  if (authenticated === null) return <div className="auth-loading">Cargando...</div>
  if (!authenticated) return <main className="login-page"><form className="login-box" onSubmit={login}><div className="brand-mark login-brand"><img src="/red-logo.svg" alt="RED" /></div><p className="eyebrow">RED INTELFON</p><h1>Preofertas</h1><p>Ingresa la contraseña para continuar.</p><label htmlFor="password">Contraseña</label><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus /><button type="submit">Entrar</button>{loginError && <small>{loginError}</small>}</form></main>

  return <main className={`dashboard ${theme}`}>
    <header className="topbar"><div className="brand"><div className="brand-mark"><img src="/red-logo.svg" alt="RED" /></div><div><strong>RED INTELFON</strong><span>Activaciones / Preofertas</span></div></div><div className="top-actions"><span className="live"><i /> Datos en vivo</span><button className="icon-button" title="Actualizar datos" onClick={loadData}><RefreshCw size={17} className={loading ? 'spin' : ''} /></button><button className="export-button" onClick={exportCsv}><Download size={16} /> Exportar CSV</button><button className="theme-toggle" aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button><button className="logout-button" onClick={logout}>Salir</button></div></header>
    <section className="hero"><div><p className="eyebrow">WORKFLOW DASHBOARD</p><h1>Preofertas</h1><p className="subhead">Visibilidad completa del flujo de activaciones.</p></div><div className="updated"><Clock3 size={16} /> Última sincronización <strong>{formatDate(meta?.generadoEn, true)}</strong></div></section>
    <section className="metrics"><div><span>Total de preofertas</span><strong>{counts.total}</strong><small>Registros encontrados</small></div><div><span>En proceso</span><strong className="blue-text">{counts.active}</strong><small>Requieren seguimiento</small></div><div><span>Finalizadas</span><strong className="green-text">{counts.done}</strong><small>Procesos completados</small></div></section>
    <section className="analytics"><article className="analytics-card status-card"><div className="analytics-heading"><div><p className="eyebrow">RESUMEN OPERATIVO</p><h2>Estado de las ofertas</h2><span>Distribución del periodo seleccionado</span></div></div><StatusChart counts={counts} /></article><article className="analytics-card"><div className="analytics-heading"><div><p className="eyebrow">SEGUIMIENTO</p><h2>Etapa actual</h2><span>Ofertas por etapa del proceso</span></div></div><ChartBars values={chartData.stages} /></article><article className="analytics-card"><div className="analytics-heading"><div><p className="eyebrow">CLASIFICACIÓN</p><h2>Tipo de proceso</h2><span>Volumen por categoría</span></div></div><ChartBars values={chartData.types} /></article></section>
    <section className="toolbar">
      <div className="toolbar-row">
        <div className="filter-label"><SlidersHorizontal size={16} /> Filtros</div>
        <div className="search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en todos los campos..." />{query && <button onClick={() => setQuery('')}><X size={15} /></button>}</div>
        <div className="date-filter">
          <label>Desde <input type="date" value={dateFrom} max={dateTo} onChange={(event) => setDateFrom(event.target.value)} /></label>
          <label>Hasta <input type="date" value={dateTo} min={dateFrom} onChange={(event) => setDateTo(event.target.value)} /></label>
        </div>
        <div className="toolbar-selects">
          <select value={country} onChange={(event) => setCountry(event.target.value)}>
            <option value="todos">Todos los países</option>
            <option value="GT">Guatemala</option>
            <option value="SV">El Salvador</option>
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="todos">Todos los estados</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
            <option value="todos">Todos los negocios</option>
            {businessOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
            <option value="todos">Todas las etapas</option>
            {stageOptions.map((value) => <option key={value} value={value}>Etapa {value}</option>)}
          </select>
        </div>
      </div>
    </section>
    {error && <div className="notice"><CircleAlert size={18} /> {error}</div>}
    <section className="table-wrap"><div className="table-scroll"><table><thead><tr><th className="expand-col" /><th>Preoferta</th><th>Fecha</th><th>Empresa</th><th>Vendedor</th><th>Negocio</th><th>Cantidad</th><th>Plazo</th><th>País</th><th>Estado</th><th>Etapa actual</th></tr></thead><tbody>{loading ? <tr><td colSpan="11" className="empty">Cargando datos...</td></tr> : filteredItems.length === 0 ? <tr><td colSpan="11" className="empty"><Filter size={26} />No hay preofertas con estos filtros.</td></tr> : filteredItems.map((item) => <><tr className={expanded === item.preOferta ? 'selected' : ''} key={item.preOferta} onClick={() => setExpanded(expanded === item.preOferta ? null : item.preOferta)}><td className="expand-col">{expanded === item.preOferta ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</td><td><strong className="code">#{item.preOferta}</strong><span className="sub-cell">{item.codigo}</span></td><td>{formatDate(item.fecha)}</td><td><strong>{item.empresa}</strong></td><td>{item.vendedor}</td><td>{item.negocio}</td><td>{item.cantidad} líneas</td><td>{item.plazo} meses</td><td><span className="country"><i>{item.pais}</i></span></td><td><StatusPill status={item.estado} /></td><td>{item.proceso?.etapaActual ? <><strong>{item.proceso.etapaActual.nombre}</strong><span className="sub-cell">Etapa {item.proceso.etapaActual.numero}</span></> : '—'}</td></tr>{expanded === item.preOferta && <tr className="detail-row" key={`${item.preOferta}-detail`}><td colSpan="11"><Detail item={item} /></td></tr>}</>)}</tbody></table></div></section>
    <footer><span>API Dashboard Preofertas v1.0.0</span><span>Mostrando {filteredItems.length} de {meta?.total ?? items.length} registros</span></footer>
  </main>
}

export default App

createRoot(document.getElementById('root')).render(<App />)

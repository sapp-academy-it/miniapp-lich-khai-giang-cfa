import { fetchAll, login, logout } from './api-client.js'

const MODE_LABELS = {
  ONLINE: 'Record Online',
  LIVE_ONLINE: 'Live Online',
  OFFLINE: 'Face to face',
}
const SUPPORTED_MODES = new Set(Object.keys(MODE_LABELS))
const $ = (selector) => document.querySelector(selector)

const loginView = $('#login-view')
const appView = $('#app-view')
const loginForm = $('#login-form')
const loginButton = $('#login-button')
const loginError = $('#login-error')
const usernameInput = $('#username')
const passwordInput = $('#password')
const logoutButton = $('#logout-button')
const refreshButton = $('#refresh-button')
const levelFilter = $('#level-filter')
const modeFilter = $('#mode-filter')
const regionFilter = $('#region-filter')
const results = $('#results')
const resultSummary = $('#result-summary')

let classes = []

function showState(kind, message) {
  results.replaceChildren()
  const p = document.createElement('p')
  p.className = `state state-${kind}`
  p.textContent = message
  results.append(p)
}

function showLogin(message = '') {
  appView.hidden = true
  loginView.hidden = false
  loginError.hidden = !message
  loginError.textContent = message
  passwordInput.value = ''
  usernameInput.focus()
}

function showApp() {
  loginView.hidden = true
  appView.hidden = false
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

function findLevel(value) {
  const text = String(value ?? '').replace(/[-_]/g, ' ')
  return text.match(/\blevel\s*([123])\b/i)?.[1]
    ?? text.match(/\bcfa\s*([123])\b/i)?.[1]
    ?? ''
}

function getLevel(item) {
  const candidates = [
    item.course?.subject?.name,
    item.course?.name,
    ...(item.course?.levels ?? []).flatMap((level) => [level?.name, level?.code]),
    item.name,
    item.code,
  ]
  for (const value of candidates) {
    const level = findLevel(value)
    if (level) return level
  }
  return ''
}

function isCfaClass(item) {
  if (item.course?.course_categories?.some((category) => normalize(category?.name) === 'cfa')) return true
  return [item.course?.subject?.name, item.course?.name, item.name, item.code]
    .some((value) => normalize(value).startsWith('cfa'))
}

function getRegion(provinceName) {
  const value = normalize(provinceName)
  if (value.includes('ha noi')) return 'HANOI'
  if (value.includes('ho chi minh') || value.includes('tp.hcm') || value.includes('tphcm')) return 'HCM'
  return ''
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function fmtDate(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function prepareClasses(rawClasses, facilities) {
  const facilityMap = new Map(facilities.map((facility) => [facility.id, facility]))
  const today = startOfToday()

  return rawClasses
    .filter((item) => {
      if (!isCfaClass(item) || !SUPPORTED_MODES.has(item.instruction_mode) || !item.opening_at) return false
      const date = new Date(item.opening_at)
      return !Number.isNaN(date.getTime()) && date >= today
    })
    .map((item) => {
      const facility = facilityMap.get(item.facility_id ?? item.facility?.id) ?? item.facility ?? null
      return {
        id: item.id,
        code: item.code || '—',
        openingAt: item.opening_at,
        level: getLevel(item),
        mode: item.instruction_mode,
        facilityName: facility?.name || 'Không gắn cơ sở',
        region: getRegion(facility?.ward?.province?.name),
      }
    })
    .sort((a, b) => new Date(a.openingAt) - new Date(b.openingAt))
}

function matches(item) {
  if (levelFilter.value && item.level !== levelFilter.value) return false
  if (modeFilter.value && item.mode !== modeFilter.value) return false
  if (regionFilter.value) {
    const onlineWithoutRegion = !item.region && (item.mode === 'ONLINE' || item.mode === 'LIVE_ONLINE')
    if (!onlineWithoutRegion && item.region !== regionFilter.value) return false
  }
  return true
}

function detail(label, value) {
  const wrapper = document.createElement('div')
  const labelElement = document.createElement('span')
  const valueElement = document.createElement('span')
  wrapper.className = 'detail-item'
  labelElement.className = 'detail-label'
  labelElement.textContent = label
  valueElement.className = 'detail-value'
  valueElement.textContent = value || '—'
  wrapper.append(labelElement, valueElement)
  return wrapper
}

function card(item) {
  const article = document.createElement('article')
  const header = document.createElement('div')
  const codeBlock = document.createElement('div')
  const codeLabel = document.createElement('p')
  const code = document.createElement('p')
  const date = document.createElement('span')
  const details = document.createElement('div')

  article.className = 'class-card'
  header.className = 'class-card-header'
  codeLabel.className = 'class-code-label'
  codeLabel.textContent = 'Mã lớp'
  code.className = 'class-code'
  code.textContent = item.code
  date.className = 'date-badge'
  date.textContent = `Khai giảng ${fmtDate(item.openingAt)}`
  codeBlock.append(codeLabel, code)
  header.append(codeBlock, date)
  details.className = 'class-details'
  details.append(
    detail('Level', item.level ? `Level ${item.level}` : 'Chưa xác định'),
    detail('Hình thức', MODE_LABELS[item.mode] ?? item.mode),
    detail('Cơ sở', item.facilityName),
  )
  article.append(header, details)
  return article
}

function render() {
  const filtered = classes.filter(matches)
  resultSummary.textContent = `${filtered.length} lớp phù hợp`
  if (!filtered.length) {
    showState('empty', 'Không có lớp phù hợp với bộ lọc hiện tại.')
    return
  }
  results.replaceChildren(...filtered.map(card))
}

function friendlyError(error) {
  if (error.status === 403) return 'Tài khoản của bạn chưa có quyền xem dữ liệu này.'
  if (error.status === 422) return 'OPS từ chối yêu cầu tải dữ liệu. Vui lòng báo đội kỹ thuật kiểm tra.'
  return 'Không tải được dữ liệu. Vui lòng thử lại.'
}

async function loadData() {
  refreshButton.disabled = true
  results.setAttribute('aria-busy', 'true')
  resultSummary.textContent = ''
  showState('loading', 'Đang tải dữ liệu...')
  try {
    const [rawClasses, facilities] = await Promise.all([
      fetchAll('/classes', 'classes', { params: { status: 'PUBLIC' } }),
      fetchAll('/facilities', 'facilities', { params: { status: 'ACTIVE' } }),
    ])
    classes = prepareClasses(rawClasses, facilities)
    render()
  } catch (error) {
    if (error.status === 401) {
      logout()
      showLogin('Phiên đăng nhập đã hết hạn.')
      return
    }
    showState('error', friendlyError(error))
  } finally {
    refreshButton.disabled = false
    results.setAttribute('aria-busy', 'false')
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  loginError.hidden = true
  loginButton.disabled = true
  loginButton.textContent = 'Đang đăng nhập...'
  try {
    await login(usernameInput.value.trim(), passwordInput.value)
    passwordInput.value = ''
    showApp()
    await loadData()
  } catch (error) {
    showLogin(error.status === 401 ? 'Sai tên đăng nhập hoặc mật khẩu.' : 'Không thể đăng nhập. Vui lòng thử lại.')
  } finally {
    loginButton.disabled = false
    loginButton.textContent = 'Đăng nhập'
  }
})

logoutButton.addEventListener('click', () => {
  logout()
  classes = []
  levelFilter.value = ''
  modeFilter.value = ''
  regionFilter.value = ''
  showLogin()
})

refreshButton.addEventListener('click', loadData)
for (const filter of [levelFilter, modeFilter, regionFilter]) {
  filter.addEventListener('change', render)
}

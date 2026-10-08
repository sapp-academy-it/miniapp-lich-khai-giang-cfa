import { API_BASE_URL } from './config.js'

// Token chỉ giữ trong bộ nhớ; tải lại trang sẽ phải đăng nhập lại.
let tokens = null
let rotating = null

export const isLoggedIn = () => Boolean(tokens?.act)
export const logout = () => {
  tokens = null
}

async function send(path, { method = 'GET', body, bearer } = {}) {
  const res = await fetch(API_BASE_URL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status })
  return res.json()
}

export async function login(username, password) {
  const { data } = await send('/auth/login', { method: 'POST', body: { username, password } })
  tokens = data.tokens
  return data.staff
}

function rotate() {
  rotating ??= send('/auth/rotate', { method: 'POST', bearer: tokens.rft })
    .then(({ data }) => {
      tokens = data.tokens
    })
    .finally(() => {
      rotating = null
    })
  return rotating
}

export async function api(path, options = {}) {
  if (!tokens) throw Object.assign(new Error('Chưa đăng nhập'), { status: 401 })
  try {
    return await send(path, { ...options, bearer: tokens.act })
  } catch (error) {
    if (error.status !== 401 || !tokens?.rft) throw error
    try {
      await rotate()
    } catch {
      tokens = null
      throw error
    }
    return send(path, { ...options, bearer: tokens.act })
  }
}

export async function fetchAll(path, listKey, { params = {}, pageSize = 100 } = {}) {
  const items = []
  for (let page = 1; ; page++) {
    const query = new URLSearchParams({ ...params, page_index: page, page_size: pageSize })
    const { data } = await api(`${path}?${query}`)
    items.push(...data[listKey])
    const meta = data.meta ?? data.metadata
    if (page >= meta.total_pages) return items
  }
}

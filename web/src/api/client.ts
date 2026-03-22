import { useAuthStore } from '../stores/authStore.ts'

const BASE_URL = ''

interface RefreshResponse {
  access_token: string
}

const REQUEST_TIMEOUT_MS = 30_000

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isRetry = false,
): Promise<T> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out - please try again')
    }
    throw new Error('Network error - please check your connection')
  } finally {
    clearTimeout(timeoutId)
  }

  if (res.status === 401 && !isRetry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return request<T>(method, path, body, true)
    }
    useAuthStore.getState().logout()
    throw new Error('Session expired')
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status}`
    try {
      const errorBody = await res.json()
      if (errorBody && typeof errorBody.error === 'string') {
        message = errorBody.error
      }
    } catch {
      // Response was not JSON; use the default message
    }
    throw new Error(message)
  }

  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'same-origin',
    })
    if (!res.ok) return false
    const data = (await res.json()) as RefreshResponse
    useAuthStore.getState().setToken(data.access_token)
    return true
  } catch {
    return false
  }
}

function get<T>(path: string): Promise<T> {
  return request<T>('GET', path)
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body)
}

function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PUT', path, body)
}

function del<T>(path: string): Promise<T> {
  return request<T>('DELETE', path)
}

/** Build a URL with the auth token as a query param (for img/video src). */
export function mediaUrl(path: string): string {
  const token = useAuthStore.getState().token
  if (!token) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}token=${encodeURIComponent(token)}`
}

export const apiClient = { get, post, put, del }
export { get, post, put, del }

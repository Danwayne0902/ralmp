import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// Run against your own API. Read loadtest/README.md before starting.
const BASE = (__ENV.BASE_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/+$/, '')
const DURATION = __ENV.DURATION || '1m'
const READ_VUS = Number(__ENV.READ_VUS || 10)
const BUYER_VUS = Number(__ENV.BUYER_VUS || 5)
const WRITE_RATIO = Number(__ENV.WRITE_RATIO || 0.1)

const apiLatency = new Trend('api_latency', true)
const apiFailures = new Rate('api_failures')

const scenarios = {
  browse: {
    executor: 'constant-vus',
    vus: READ_VUS,
    duration: DURATION,
    exec: 'browse',
  },
}

// The authenticated journey only runs when credentials are supplied.
if (__ENV.K6_EMAIL && __ENV.K6_PASSWORD) {
  scenarios.buyer = {
    executor: 'constant-vus',
    vus: BUYER_VUS,
    duration: DURATION,
    startTime: '5s',
    exec: 'buyer',
  }
}

export const options = {
  scenarios,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
}

function authHeaders(token) {
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

function record(res, name) {
  apiLatency.add(res.timings.duration)
  apiFailures.add(res.status === 0 || res.status >= 500)
  check(res, {
    [`${name}: not a server error`]: (r) => r.status > 0 && r.status < 500,
  })
  return res
}

export function setup() {
  const res = http.get(`${BASE}/produce-listings?per_page=15`, {
    headers: { Accept: 'application/json' },
  })

  let listingId = null
  try {
    listingId = res.json('data.0.id') || null
  } catch {
    listingId = null
  }

  let token = null
  if (__ENV.K6_EMAIL && __ENV.K6_PASSWORD) {
    const login = http.post(
      `${BASE}/auth/login`,
      JSON.stringify({ email: __ENV.K6_EMAIL, password: __ENV.K6_PASSWORD }),
      { headers: { Accept: 'application/json', 'Content-Type': 'application/json' } },
    )

    if (login.status === 200) {
      token = login.json('token')
    } else {
      console.warn(`Login failed with ${login.status}; the buyer scenario will be skipped.`)
    }
  }

  return { listingId, token }
}

// Public marketplace browsing: a visitor who is not signed in.
export function browse(data) {
  group('marketplace', () => {
    record(
      http.get(`${BASE}/produce-listings?per_page=15`, { headers: authHeaders() }),
      'list produce',
    )

    record(
      http.get(`${BASE}/produce-listings?per_page=15&page=2`, { headers: authHeaders() }),
      'second produce page',
    )

    if (data.listingId) {
      record(
        http.get(`${BASE}/produce-listings/${data.listingId}`, { headers: authHeaders() }),
        'produce detail',
      )
    }

    record(
      http.get(`${BASE}/produce-listings?per_page=15&search=tomato`, { headers: authHeaders() }),
      'produce search',
    )
  })

  sleep(1 + Math.random())
}

// Signed-in buyer: the screens that made the inbox slow before pagination.
export function buyer(data) {
  if (!data.token) return

  const headers = authHeaders(data.token)

  group('inbox', () => {
    record(http.get(`${BASE}/messages/conversations?per_page=50`, { headers }), 'conversations')
    record(http.get(`${BASE}/messages/unread-count`, { headers }), 'unread count')
  })

  group('account', () => {
    record(http.get(`${BASE}/orders?per_page=15`, { headers }), 'orders')
    record(http.get(`${BASE}/cart`, { headers }), 'cart')
  })

  if (data.listingId && Math.random() < WRITE_RATIO) {
    group('cart write', () => {
      record(
        http.post(
          `${BASE}/cart/add`,
          JSON.stringify({ produce_id: data.listingId, quantity: 1 }),
          { headers: { ...headers, 'Content-Type': 'application/json' } },
        ),
        'cart add',
      )

      record(
        http.del(
          `${BASE}/cart/remove`,
          JSON.stringify({ produce_id: data.listingId }),
          { headers: { ...headers, 'Content-Type': 'application/json' } },
        ),
        'cart remove',
      )
    })
  }

  sleep(1 + Math.random() * 2)
}

export function handleSummary(data) {
  const summary = {
    generated_at: new Date().toISOString(),
    base_url: BASE,
    thresholds_ok: Object.values(data.metrics)
      .filter((metric) => metric.thresholds)
      .every((metric) => Object.values(metric.thresholds).every((threshold) => threshold.ok)),
    metrics: {
      http_reqs: data.metrics.http_reqs?.values,
      http_req_failed: data.metrics.http_req_failed?.values,
      http_req_duration: data.metrics.http_req_duration?.values,
      api_latency: data.metrics.api_latency?.values,
    },
  }

  return {
    stdout: `RALMP load test complete. Thresholds ${summary.thresholds_ok ? 'passed' : 'FAILED'}.\n`,
    'loadtest/results/summary.json': JSON.stringify(summary, null, 2),
  }
}

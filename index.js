/**
 * Host half of the subscription usage bundle.
 *
 * The browser must not hold the provider key, so this exact route keeps the
 * credentials on the Host and returns only usage and billing summaries.
 * Every failure becomes a small JSON
 * result with a stable code; the handler never throws into the HTTP server.
 */

const USAGE_URL = 'https://opencode.ai/zen/go/v1/usage'
const ROUTE = '/opencode-go/usage'
const WINDOWS = ['rolling', 'weekly', 'monthly']
const CREDENTIAL = 'OPENCODE_GO_API_KEY'
const TIMEOUT_MS = 15000
const OPTIONAL_TIMEOUT_MS = 8000
const COMMAND_CODE_API = 'https://api.commandcode.ai'
const COMMAND_CODE_ROUTE = '/command-code/usage'
const COMMAND_CODE_CREDENTIAL = 'COMMANDCODE_API_KEY'

/**
 * Monthly credit pools from the official CLI (command-code 1.88, getPlanInfo).
 * The API returns the remaining balance but never the pool, and an unknown id
 * must fall back to "no monthly row" rather than another plan's limit.
 * Provider is pay-as-you-go, so it has no pool to subtract from.
 */
const COMMAND_PLAN_CREDITS = {
  'individual-go': 10,
  'individual-go-v1': 10,
  'individual-goat': 70,
  'individual-pro': 30,
  'individual-pro-v1': 80,
  'individual-max': 150,
  'individual-ultra': 300,
  'teams-pro': 40,
}
const COMMAND_PLAN_NAMES = {
  'individual-go': 'Go',
  'individual-go-v1': 'Go',
  'individual-goat': 'GOAT',
  'individual-pro': 'Pro',
  'individual-pro-v1': 'Pro',
  'individual-provider': 'Provider',
  'individual-max': 'Max',
  'individual-ultra': 'Ultra',
  'teams-pro': 'Teams Pro',
}

export const inject = ['webServer', 'credentials', 'connection']

/** Keep known window fields; null means absent, undefined means malformed. */
function normalizeWindow(value) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'object' || Array.isArray(value)) return undefined
  if (!['status', 'percent', 'resetsAt'].some((name) => Object.hasOwn(value, name))) return undefined
  const { status, percent, resetsAt } = value
  if (status !== undefined && status !== null && typeof status !== 'string') return undefined
  if (percent !== undefined && percent !== null && (typeof percent !== 'number' || !Number.isFinite(percent))) return undefined
  if (resetsAt !== undefined && resetsAt !== null && typeof resetsAt !== 'string') return undefined
  return { status: status ?? null, percent: percent ?? null, resetsAt: resetsAt ?? null }
}

/** Query upstream usage and map every outcome to a status plus JSON body. */
async function usageOutcome(ctx) {
  const credential = await ctx.credentials.resolve(CREDENTIAL)
  if (credential === undefined) return { status: 401, body: { code: 'missing-key' } }

  let response
  try {
    response = await fetch(USAGE_URL, {
      headers: {
        authorization: `Bearer ${credential.value}`,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    return { status: 502, body: { code: 'network' } }
  }

  if (!response.ok) return { status: 502, body: { code: 'upstream', status: response.status } }

  let body
  try {
    body = await response.json()
  } catch {
    return { status: 502, body: { code: 'invalid-response' } }
  }

  const usage = body !== null && typeof body === 'object' && body.usage !== undefined ? body.usage : body
  if (usage === null || typeof usage !== 'object' || Array.isArray(usage) || !WINDOWS.some((name) => Object.hasOwn(usage, name))) {
    return { status: 502, body: { code: 'invalid-response' } }
  }

  const normalized = {}
  for (const name of WINDOWS) {
    const window = normalizeWindow(usage[name])
    if (window === undefined) return { status: 502, body: { code: 'invalid-response' } }
    normalized[name] = window
  }
  return { status: 200, body: { usage: normalized } }
}

function normalizeDate(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

function normalizeCommandWindow(value) {
  if (!value || !Number.isFinite(value.used) || value.used < 0 || !Number.isFinite(value.cap) || value.cap <= 0 || typeof value.exceeded !== 'boolean') return null
  return {
    used: value.used,
    cap: value.cap,
    exceeded: value.exceeded,
    resetsAt: typeof value.resetAt === 'number' ? normalizeDate(value.resetAt) : null,
  }
}

function nonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

/** Display-only; ids and email stay on the Host. */
function normalizeCommandAccount(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || value.success !== true) return null
  const user = value.user
  if (user === null || typeof user !== 'object' || Array.isArray(user)) return null
  const userName = typeof user.userName === 'string' ? user.userName.trim() : ''
  if (userName.length === 0 || userName.length > 64 || /[\s\u0000-\u001f\u007f]/.test(userName)) return null
  return { userName }
}

function normalizeCommandPlan(planId) {
  if (typeof planId !== 'string') return null
  const id = planId.trim().toLowerCase().replaceAll('_', '-')
  if (!Object.hasOwn(COMMAND_PLAN_NAMES, id)) return null
  const credits = Object.hasOwn(COMMAND_PLAN_CREDITS, id) ? COMMAND_PLAN_CREDITS[id] : null
  return { id, name: COMMAND_PLAN_NAMES[id], credits }
}

function normalizeCommandTotals(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
  const tokensIn = nonNegativeNumber(value.totalTokensIn)
  const tokensOut = nonNegativeNumber(value.totalTokensOut)
  const tokens = nonNegativeNumber(value.totalTokens) ?? (tokensIn !== null && tokensOut !== null ? tokensIn + tokensOut : null)
  const requests = nonNegativeNumber(value.totalCount)
  if (tokens === null && requests === null) return null
  return { tokens, requests }
}

/** Studio meters the monthly pool as pool minus balance; the API has no monthly window. */
function commandMonthlyWindow(plan, credits, periodEndsAt) {
  if (plan === null || plan.credits === null || credits.monthly === null) return null
  // A balance above the table's pool means the table does not fit this account.
  if (credits.monthly > plan.credits) return null
  const cap = plan.credits
  const used = Math.max(0, Math.min(cap, cap - credits.monthly))
  return { used, cap, exceeded: used >= cap, resetsAt: periodEndsAt, estimated: true }
}

async function fetchCommandData(endpoint, key, timeoutMs = TIMEOUT_MS) {
  let response
  try {
    response = await fetch(`${COMMAND_CODE_API}${endpoint}`, {
      headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    })
  } catch {
    return { error: { code: 'network' } }
  }
  if (!response.ok) return { error: { code: 'upstream', status: response.status } }
  try {
    return { data: await response.json() }
  } catch {
    return { error: { code: 'invalid-response' } }
  }
}

async function commandUsageOutcome(ctx) {
  const credential = await ctx.credentials.resolve(COMMAND_CODE_CREDENTIAL)
  if (credential === undefined) return { status: 401, body: { code: 'missing-key' } }

  // whoami and summary are optional, so they get a shorter budget and must not
  // hold up the round that decides whether the panel can render at all.
  const whoamiRequest = fetchCommandData('/alpha/whoami', credential.value, OPTIONAL_TIMEOUT_MS)
  const [credits, subscription] = await Promise.all([
    fetchCommandData('/alpha/billing/credits', credential.value),
    fetchCommandData('/alpha/billing/subscriptions', credential.value),
  ])
  if (credits.error) return { status: 502, body: credits.error }
  const balance = credits.data?.credits
  if (!balance || typeof balance !== 'object' || Array.isArray(balance)) {
    return { status: 502, body: { code: 'invalid-response' } }
  }
  const normalized = {
    monthly: Number.isFinite(balance.monthlyCredits) ? balance.monthlyCredits : null,
    purchased: Number.isFinite(balance.purchasedCredits) ? balance.purchasedCredits : null,
    free: Number.isFinite(balance.freeCredits) ? balance.freeCredits : null,
  }
  if (Object.values(normalized).every((value) => value === null)) {
    return { status: 502, body: { code: 'invalid-response' } }
  }

  // The credits payload stamps the plan on some responses; the subscription is authoritative.
  let planId = typeof credits.data.planId === 'string' ? credits.data.planId : null
  const billing = { status: 'unavailable', periodStartsAt: null, periodEndsAt: null }
  if (subscription.data?.success === true) {
    if (subscription.data.data === null) {
      // Explicit "no subscription": a credits plan id is not a current plan.
      billing.status = 'none'
      planId = null
    } else {
      const data = subscription.data.data
      const start = normalizeDate(data?.currentPeriodStart)
      const end = normalizeDate(data?.currentPeriodEnd)
      if (typeof data?.planId === 'string') planId = data.planId
      if (end !== null) {
        billing.status = 'available'
        billing.periodStartsAt = start
        billing.periodEndsAt = end
      }
    }
  }

  // Only a period-scoped summary is meaningful: the client labels these numbers
  // "this period", so an unscoped (lifetime) fallback would be misleading.
  const summaryRequest = billing.periodStartsAt === null
    ? null
    : fetchCommandData(`/alpha/usage/summary?since=${encodeURIComponent(billing.periodStartsAt)}`, credential.value, OPTIONAL_TIMEOUT_MS)
  const [whoami, summary] = await Promise.all([whoamiRequest, summaryRequest])
  const totals = summary === null || summary.error ? null : normalizeCommandTotals(summary.data)

  const plan = normalizeCommandPlan(planId)
  return {
    status: 200,
    body: {
      usage: {
        fiveHour: normalizeCommandWindow(credits.data.windowLimits?.fiveHour),
        weekly: normalizeCommandWindow(credits.data.windowLimits?.weekly),
        monthly: commandMonthlyWindow(plan, normalized, billing.periodEndsAt),
        credits: normalized,
        billing,
        plan,
        account: whoami.error ? null : normalizeCommandAccount(whoami.data),
        totals,
      },
    },
  }
}

/** Answer with JSON and no caching: quota values are live facts. */
function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.setHeader('x-content-type-options', 'nosniff')
  res.end(JSON.stringify(body))
}

function registerUsageRoute(ctx, path, query) {
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path,
        handler: async (req, res) => {
          let outcome
          try {
            const rejection = ctx.connection.requestRejection(req)
            if (rejection !== undefined) {
              outcome = { status: rejection, body: { code: rejection === 401 ? 'unauthorized' : 'forbidden' } }
            } else if (req.method !== 'GET' && req.method !== 'HEAD') {
              res.setHeader('allow', 'GET, HEAD')
              outcome = { status: 405, body: { code: 'method-not-allowed' } }
            } else {
              outcome = await query(ctx)
            }
          } catch (error) {
            ctx.logger?.warn('opencode-go-usage: query failed: %s', error instanceof Error ? error.message : String(error))
            outcome = { status: 500, body: { code: 'internal' } }
          }

          if (req.method === 'HEAD') {
            res.statusCode = outcome.status
            res.setHeader('content-type', 'application/json; charset=utf-8')
            res.setHeader('cache-control', 'no-store')
            res.setHeader('x-content-type-options', 'nosniff')
            res.end()
            return
          }
          sendJson(res, outcome.status, outcome.body)
        },
      }),
    `opencode-go-usage: GET ${path}`,
  )
}

export function apply(ctx) {
  registerUsageRoute(ctx, ROUTE, usageOutcome)
  registerUsageRoute(ctx, COMMAND_CODE_ROUTE, commandUsageOutcome)
}

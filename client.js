window.__ModuleLoader__.load({
  id: '@local/dsh-opencode-usage',
  factory(require) {
    const React = require('react')
    const ReactDom = require('react-dom')
    const h = React.createElement

    const NS = 'opencode-usage'
    const SERVICES = {
      opencode: { name: 'OpenCode', route: 'opencode-go/usage', key: 'OPENCODE_GO_API_KEY' },
      commandcode: { name: 'Command Code', route: 'command-code/usage', key: 'COMMANDCODE_API_KEY' },
    }
    const WINDOWS = ['rolling', 'weekly', 'monthly']
    const COMMAND_WINDOWS = ['fiveHour', 'weekly']
    const CREDIT_KEYS = ['monthly', 'purchased', 'free']
    const PANEL_WIDTH = 264

    const zh = {
      aria: '查看套餐用量',
      title: '套餐用量',
      service: '用量服务',
      rolling: '滚动用量',
      fiveHour: '5 小时用量',
      weekly: '每周用量',
      monthly: '每月用量',
      used: '{percent}% 已用',
      creditsUsed: '{used} / {cap} credits',
      monthlyCredits: '月度余额',
      purchasedCredits: '已购余额',
      freeCredits: '免费余额',
      creditBalance: '{value} credits',
      resets: '{time}后重置',
      resetSoon: '即将重置',
      resetReached: '重置时间已到，请重新打开获取最新用量',
      windowExceeded: '此窗口已达上限',
      emptyWindow: '暂无窗口数据',
      billingUnavailable: '暂时无法获取账期',
      account: '账号',
      billingPeriod: '订阅周期（API）',
      periodUsage: '本期用量',
      monthlyEstimated: '每月用量（估算）',
      usedApprox: '约 {percent}% 已用',
      estimatedUsage: '按套餐额度与余额推算',
      periodEndsOn: '{date} 结束',
      estimateExhausted: '套餐内估算额度已用尽',
      plan: '套餐',
      tokens: '{value} tokens',
      requests: '{count} 次请求',
      loading: '正在获取用量…',
      empty: '暂无用量数据',
      retry: '重试',
      errorMissingKey: '未找到 {key}，请先在设置中配置',
      errorNetwork: '{service} 用量请求失败，请检查网络后重试',
      errorUpstream: '{service} 服务返回 {status}，请稍后再试',
      errorUpstreamAuth: '{service} 上游拒绝了凭据（{status}），请检查设置中的 API Key',
      errorUnauthorized: 'DSH 登录状态无效，请重新登录后重试',
      errorForbidden: 'DSH 拒绝访问用量，请检查访问权限后重试',
      errorGeneric: '无法获取 {service} 用量，请稍后再试',
      days: '{days}天',
      hours: '{hours}小时',
      minutes: '{minutes}分钟',
    }

    const en = {
      aria: 'View plan usage',
      title: 'Plan usage',
      service: 'Usage service',
      rolling: 'Rolling usage',
      fiveHour: '5-hour usage',
      weekly: 'Weekly usage',
      monthly: 'Monthly usage',
      used: '{percent}% used',
      creditsUsed: '{used} / {cap} credits',
      monthlyCredits: 'Monthly balance',
      purchasedCredits: 'Purchased balance',
      freeCredits: 'Free balance',
      creditBalance: '{value} credits',
      resets: 'Resets in {time}',
      resetSoon: 'resetting now',
      resetReached: 'Reset time reached. Reopen to get the latest usage.',
      windowExceeded: 'This window has reached its limit.',
      emptyWindow: 'No window data',
      billingUnavailable: 'Billing period is temporarily unavailable.',
      account: 'Account',
      billingPeriod: 'Subscription period (API)',
      periodUsage: 'This period',
      monthlyEstimated: 'Monthly usage (estimated)',
      usedApprox: 'about {percent}% used',
      estimatedUsage: 'Estimated from the plan pool and remaining balance',
      periodEndsOn: 'Ends {date}',
      estimateExhausted: 'Estimated plan pool is used up',
      plan: 'Plan',
      tokens: '{value} tokens',
      requests: '{count} requests',
      loading: 'Loading usage…',
      empty: 'No usage data',
      retry: 'Retry',
      errorMissingKey: '{key} is not configured. Add it in Settings.',
      errorNetwork: '{service} usage request failed. Check your connection and retry.',
      errorUpstream: '{service} returned {status}. Try again shortly.',
      errorUpstreamAuth: '{service} rejected the upstream credentials ({status}). Check the API key in Settings.',
      errorUnauthorized: 'Your DSH sign-in is invalid. Sign in again and retry.',
      errorForbidden: 'DSH denied access to usage. Check your access permissions and retry.',
      errorGeneric: 'Could not load {service} usage. Try again shortly.',
      days: '{days}d',
      hours: '{hours}h',
      minutes: '{minutes}m',
    }

    const CSS = `
      .ou_root { order: 1; display: inline-flex; flex: none; }
      .ou_trigger {
        width: 24px; height: 24px; padding: 0; border: 0; border-radius: var(--dsw-radius-sm);
        background: 0 0; color: var(--dsw-alias-label-tertiary); cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center;
      }
      .ou_trigger:hover, .ou_trigger[aria-expanded="true"] {
        background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary);
      }
      .ou_panel {
        position: fixed; z-index: 1100; box-sizing: border-box;
        width: min(${PANEL_WIDTH}px, calc(100vw - 24px));
        max-height: calc(100vh - 24px); overflow-y: auto; overscroll-behavior: contain;
        padding: 12px; border: 0; border-radius: var(--dsw-radius-lg);
        background: var(--dsw-specific-menu); backdrop-filter: var(--dsw-menu-backdrop-filter);
        --dsw-elevation-stroke-color: var(--dsw-alias-border-l1);
        box-shadow: var(--dsw-elevation-prominent); cursor: default;
        color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 20px;
      }
      .ou_title { color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 500; line-height: 20px; }
      .ou_services { display: flex; gap: 6px; margin: 8px 0 6px; }
      .ou_service {
        flex: 1; padding: 3px 6px; border: 1px solid var(--dsw-alias-border-l2);
        border-radius: var(--dsw-radius-sm); background: 0 0; color: var(--dsw-alias-label-tertiary);
        font: inherit; cursor: pointer;
      }
      .ou_service:hover { background: var(--dsw-alias-interactive-bg-hover); }
      .ou_service[aria-pressed="true"] {
        border-color: var(--dsw-alias-state-business-primary); background: var(--dsw-alias-interactive-bg-hover);
        color: var(--dsw-alias-label-primary); font-weight: 600;
      }
      .ou_trigger:focus-visible, .ou_service:focus-visible, .ou_retry:focus-visible {
        outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 2px;
      }
      .ou_track {
        height: 4px; margin-top: 6px; border-radius: 999px; overflow: hidden;
        background: var(--dsw-alias-interactive-bg-hover);
      }
      .ou_fill { height: 100%; border-radius: 999px; background: var(--dsw-alias-state-business-primary); }
      .ou_row { padding: 6px 0; }
      .ou_line { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .ou_muted { color: var(--dsw-alias-label-tertiary); padding: 2px 0 8px; overflow-wrap: anywhere; }
      .ou_value {
        color: var(--dsw-alias-label-primary); font-variant-numeric: tabular-nums; font-weight: 500;
      }
      .ou_account { min-width: 0; overflow-wrap: anywhere; }
      .ou_hint { margin-top: 4px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
      .ou_retry {
        padding: 1px 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm);
        background: 0 0; color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 18px; cursor: pointer;
      }
      .ou_retry:hover { background: var(--dsw-alias-interactive-bg-hover); }
    `

    /** Bounded integer percent, or null for anything unusable. */
    function clampPercent(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return null
      return Math.max(0, Math.min(100, Math.round(value)))
    }

    /** Relative distance to a reset instant, in the largest two useful units. */
    function resetDistance(resetsAt, t) {
      if (typeof resetsAt !== 'string') return null
      const target = Date.parse(resetsAt)
      if (!Number.isFinite(target)) return null
      const remaining = target - Date.now()
      if (remaining <= 0) return t('resetSoon')

      const minutes = Math.max(1, Math.round(remaining / 60000))
      const days = Math.floor(minutes / 1440)
      const hours = Math.floor((minutes % 1440) / 60)
      const rest = minutes % 60

      if (days > 0) {
        const dayText = t('days', { days: String(days) })
        return hours > 0 ? `${dayText} ${t('hours', { hours: String(hours) })}` : dayText
      }
      if (hours > 0) {
        const hourText = t('hours', { hours: String(hours) })
        return rest > 0 ? `${hourText} ${t('minutes', { minutes: String(rest) })}` : hourText
      }
      return t('minutes', { minutes: String(minutes) })
    }

    /** Accept only the normalized windows returned by the Host. */
    function validUsage(usage) {
      if (usage === null || typeof usage !== 'object' || Array.isArray(usage)) return false
      return WINDOWS.every((name) => {
        const value = usage[name]
        if (value === null) return true
        if (typeof value !== 'object' || Array.isArray(value)) return false
        return (
          (value.status === null || typeof value.status === 'string') &&
          (value.percent === null || (typeof value.percent === 'number' && Number.isFinite(value.percent))) &&
          (value.resetsAt === null || typeof value.resetsAt === 'string')
        )
      })
    }

    function validCommandWindow(value) {
      if (value === null) return true
      if (typeof value !== 'object' || Array.isArray(value)) return false
      return (
        typeof value.used === 'number' && Number.isFinite(value.used) && value.used >= 0 &&
        typeof value.cap === 'number' && Number.isFinite(value.cap) && value.cap > 0 &&
        typeof value.exceeded === 'boolean' &&
        (value.resetsAt === null || typeof value.resetsAt === 'string') &&
        (value.estimated === undefined || typeof value.estimated === 'boolean')
      )
    }

    function validCommandUsage(usage) {
      if (usage === null || typeof usage !== 'object' || Array.isArray(usage)) return false
      if (!COMMAND_WINDOWS.every((name) => validCommandWindow(usage[name]))) return false
      if (usage.monthly !== undefined && !validCommandWindow(usage.monthly)) return false

      const credits = usage.credits
      if (credits === null || typeof credits !== 'object' || Array.isArray(credits)) return false
      if (!CREDIT_KEYS.every((name) => credits[name] === null || (
        typeof credits[name] === 'number' && Number.isFinite(credits[name])
      ))) return false

      const billing = usage.billing
      if (billing === null || typeof billing !== 'object' || Array.isArray(billing)) return false
      if (!['available', 'none', 'unavailable'].includes(billing.status)) return false
      const periodValue = (value) => value === undefined || value === null || typeof value === 'string'
      if (!periodValue(billing.periodStartsAt) || !periodValue(billing.periodEndsAt)) return false

      const plan = usage.plan
      if (!(plan === undefined || plan === null || (
        typeof plan === 'object' && !Array.isArray(plan) &&
        typeof plan.name === 'string' &&
        (plan.credits === null || plan.credits === undefined || (
          typeof plan.credits === 'number' && Number.isFinite(plan.credits) && plan.credits > 0
        ))
      ))) return false

      const account = usage.account
      if (!(account === undefined || account === null || (
        typeof account === 'object' && !Array.isArray(account) &&
        typeof account.userName === 'string' && account.userName.length > 0
      ))) return false

      const totals = usage.totals
      if (totals === undefined || totals === null) return true
      const amountValue = (value) => value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0)
      return typeof totals === 'object' && !Array.isArray(totals) &&
        amountValue(totals.tokens) && amountValue(totals.requests)
    }

    function errorText(state, service, t) {
      const values = { service: SERVICES[service].name }
      switch (state.code) {
        case 'missing-key':
          return t('errorMissingKey', { key: SERVICES[service].key })
        case 'network':
          return t('errorNetwork', values)
        case 'unauthorized':
          return t('errorUnauthorized')
        case 'forbidden':
          return t('errorForbidden')
        case 'upstream':
          if (state.upstreamStatus === 401 || state.upstreamStatus === 403) {
            return t('errorUpstreamAuth', { ...values, status: String(state.upstreamStatus) })
          }
          return state.upstreamStatus === undefined
            ? t('errorGeneric', values)
            : t('errorUpstream', { ...values, status: String(state.upstreamStatus) })
        default:
          return t('errorGeneric', values)
      }
    }

    function UsageRow({ name, entry, t }) {
      const percent = clampPercent(entry.percent)
      const distance = resetDistance(entry.resetsAt, t)
      return h(
        'div',
        { className: 'ou_row' },
        h(
          'div',
          { className: 'ou_line' },
          h('span', null, t(name)),
          h('span', { className: 'ou_value' }, percent === null ? '—' : t('used', { percent: String(percent) })),
        ),
        h(
          'div',
          { className: 'ou_track' },
          h('div', { className: 'ou_fill', style: { width: `${percent ?? 0}%` } }),
        ),
        distance === null ? null : h('div', { className: 'ou_hint' }, t('resets', { time: distance })),
      )
    }

    function formatCredits(value) {
      return value === null ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    }

    /** Compact token counts, matching the Studio tiles (e.g. 931.8M). */
    function formatTokens(value) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
      if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
      if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
      if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
      return String(Math.round(value))
    }

    function formatCount(value) {
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value.toLocaleString() : null
    }

    function formatDate(value) {
      if (typeof value !== 'string') return null
      const date = new Date(value)
      return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : null
    }

    function CommandUsageRow({ name, entry, t }) {
      if (entry === null) {
        return h(
          'div',
          { className: 'ou_row' },
          h('div', null, t(name)),
          h('div', { className: 'ou_hint' }, t('emptyWindow')),
        )
      }

      const estimated = entry.estimated === true
      const label = estimated ? t('monthlyEstimated') : t(name)
      const percent = Math.round(entry.used / entry.cap * 100)
      const bounded = Math.max(0, Math.min(100, percent))
      let resetText = null
      if (estimated) {
        const endsAt = formatDate(entry.resetsAt)
        resetText = endsAt === null ? null : t('periodEndsOn', { date: endsAt })
      } else {
        const resetAt = typeof entry.resetsAt === 'string' ? Date.parse(entry.resetsAt) : NaN
        resetText = !Number.isFinite(resetAt)
          ? null
          : resetAt <= Date.now()
            ? t('resetReached')
            : t('resets', { time: resetDistance(entry.resetsAt, t) })
      }
      return h(
        'div',
        { className: 'ou_row' },
        h(
          'div',
          { className: 'ou_line' },
          h('span', null, label),
          h('span', { className: 'ou_value' }, t(estimated ? 'usedApprox' : 'used', { percent: String(percent) })),
        ),
        h(
          'div',
          { className: 'ou_track', role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': bounded },
          h('div', { className: 'ou_fill', style: { width: `${bounded}%` } }),
        ),
        h('div', { className: 'ou_hint' }, t('creditsUsed', { used: formatCredits(entry.used), cap: formatCredits(entry.cap) })),
        estimated ? h('div', { className: 'ou_hint' }, t('estimatedUsage')) : null,
        entry.exceeded
          ? h('div', { className: 'ou_hint' }, t(estimated ? 'estimateExhausted' : 'windowExceeded'))
          : null,
        resetText === null ? null : h('div', { className: 'ou_hint' }, resetText),
      )
    }

    function CommandIdentityRows({ usage, t }) {
      const { billing, plan, account, totals } = usage
      const rows = []

      if (account !== null && account !== undefined) {
        rows.push(h(
          'div',
          { key: 'account', className: 'ou_row ou_line' },
          h('span', null, t('account')),
          h('span', { className: 'ou_value ou_account' }, plan === null || plan === undefined ? `@${account.userName}` : `@${account.userName} · ${plan.name}`),
        ))
      }

      if ((account === null || account === undefined) && plan !== null && plan !== undefined) {
        rows.push(h(
          'div',
          { key: 'plan', className: 'ou_row ou_line' },
          h('span', null, t('plan')),
          h('span', { className: 'ou_value' }, plan.name),
        ))
      }

      const start = formatDate(billing.periodStartsAt)
      const end = formatDate(billing.periodEndsAt)
      if (end !== null) {
        rows.push(h(
          'div',
          { key: 'period', className: 'ou_row' },
          h('div', null, t('billingPeriod')),
          h('div', { className: 'ou_hint' }, start === null ? end : `${start} – ${end}`),
        ))
      }

      if (totals !== null && totals !== undefined) {
        const parts = []
        const tokens = formatTokens(totals.tokens)
        if (tokens !== null) parts.push(t('tokens', { value: tokens }))
        const requests = formatCount(totals.requests)
        if (requests !== null) parts.push(t('requests', { count: requests }))
        if (parts.length > 0) {
          rows.push(h(
            'div',
            { key: 'totals', className: 'ou_row' },
            h('div', null, t('periodUsage')),
            h('div', { className: 'ou_hint' }, parts.join(' · ')),
          ))
        }
      }

      return rows.length === 0 ? null : h(React.Fragment, null, rows)
    }

    function CommandBody({ usage, t, reload }) {
      const billingUnavailable = usage.billing.status === 'unavailable' || (
        usage.billing.status === 'available' && formatDate(usage.billing.periodEndsAt) === null
      )
      return h(
        React.Fragment,
        null,
        COMMAND_WINDOWS.map((name) => h(CommandUsageRow, { key: name, name, entry: usage[name], t })),
        usage.monthly === null || usage.monthly === undefined
          ? null
          : h(CommandUsageRow, { key: 'monthly', name: 'monthly', entry: usage.monthly, t }),
        CREDIT_KEYS.map((name) => h(
          'div',
          { key: name, className: 'ou_row ou_line' },
          h('span', null, t(`${name}Credits`)),
          h('span', { className: 'ou_value' }, usage.credits[name] === null ? '—' : t('creditBalance', { value: formatCredits(usage.credits[name]) })),
        )),
        h(CommandIdentityRows, { usage, t }),
        billingUnavailable
          ? h(
              'div',
              { className: 'ou_row' },
              h('div', { className: 'ou_muted' }, t('billingUnavailable')),
              h('button', { type: 'button', className: 'ou_retry', onClick: reload }, t('retry')),
            )
          : null,
      )
    }

    function PanelBody({ state, service, t, reload }) {
      if (state.status !== 'ready') {
        if (state.status !== 'error') return h('div', { className: 'ou_muted' }, t('loading'))
        return h(
          'div',
          null,
          h('div', { className: 'ou_muted' }, errorText(state, service, t)),
          h('button', { type: 'button', className: 'ou_retry', onClick: reload }, t('retry')),
        )
      }

      if (service === 'commandcode') return h(CommandBody, { usage: state.usage, t, reload })
      const usage = state.usage !== null && typeof state.usage === 'object' ? state.usage : {}
      const windows = WINDOWS.filter((name) => {
        const value = usage[name]
        return value !== null && typeof value === 'object'
      })
      if (windows.length === 0) return h('div', { className: 'ou_muted' }, t('empty'))
      return windows.map((name) => h(UsageRow, { key: name, name, entry: usage[name], t }))
    }

    function UsageButton({ t }) {
      const [open, setOpen] = React.useState(false)
      const [service, setService] = React.useState('opencode')
      const [state, setState] = React.useState({ status: 'idle' })
      const [position, setPosition] = React.useState(null)
      const mounted = React.useRef(true)
      const request = React.useRef(null)
      const rootRef = React.useRef(null)
      const triggerRef = React.useRef(null)
      const panelRef = React.useRef(null)

      React.useEffect(() => {
        mounted.current = true
        return () => {
          mounted.current = false
          request.current?.abort()
          request.current = null
        }
      }, [])

      const reload = React.useCallback(async () => {
        request.current?.abort()
        const controller = new AbortController()
        request.current = controller
        setState({ status: 'loading' })

        try {
          const response = await fetch(new URL(SERVICES[service].route, document.baseURI), {
            headers: { accept: 'application/json' },
            cache: 'no-store',
            signal: controller.signal,
          })
          let body
          try {
            body = await response.json()
          } catch {
            body = undefined
          }
          if (!mounted.current || controller.signal.aborted || request.current !== controller) return
          if (!response.ok) {
            const code = body?.code ?? (response.status === 401 ? 'unauthorized' : response.status === 403 ? 'forbidden' : 'generic')
            setState({ status: 'error', code, upstreamStatus: body?.status })
            return
          }
          const valid = service === 'commandcode' ? validCommandUsage(body?.usage) : validUsage(body?.usage)
          if (!valid) {
            setState({ status: 'error', code: 'invalid-response' })
            return
          }
          setState({ status: 'ready', usage: body.usage })
        } catch {
          if (!mounted.current || controller.signal.aborted || request.current !== controller) return
          setState({ status: 'error', code: 'network' })
        }
      }, [service])

      const close = React.useCallback(() => {
        request.current?.abort()
        request.current = null
        setState({ status: 'idle' })
        setOpen(false)
      }, [])

      const selectService = (next) => {
        if (next === service) return
        request.current?.abort()
        request.current = null
        setState({ status: 'loading' })
        setService(next)
      }

      React.useEffect(() => {
        if (open) {
          reload()
          return
        }
        request.current?.abort()
        request.current = null
        setPosition(null)
      }, [open, reload])

      React.useEffect(() => {
        if (!open) return undefined
        const place = () => {
          const rect = triggerRef.current?.getBoundingClientRect()
          if (rect === undefined) return
          const maxLeft = Math.max(12, window.innerWidth - PANEL_WIDTH - 12)
          const above = rect.top - 20
          const below = window.innerHeight - rect.bottom - 20
          setPosition({
            left: Math.max(12, Math.min(rect.left, maxLeft)),
            ...(above >= below
              ? { bottom: Math.max(8, window.innerHeight - rect.top + 8), maxHeight: Math.max(0, above) }
              : { top: Math.max(12, rect.bottom + 8), maxHeight: Math.max(0, below) }),
          })
        }
        place()
        window.addEventListener('resize', place)
        return () => window.removeEventListener('resize', place)
      }, [open])

      React.useEffect(() => {
        if (!open) return undefined
        const onPointerDown = (event) => {
          const target = event.target
          if (rootRef.current?.contains(target) === true) return
          if (panelRef.current?.contains(target) === true) return
          close()
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') close()
        }
        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
          document.removeEventListener('pointerdown', onPointerDown)
          document.removeEventListener('keydown', onKeyDown)
        }
      }, [open, close])

      const panel = open
        ? ReactDom.createPortal(
            h(
              'div',
              {
                ref: panelRef,
                role: 'dialog',
                'aria-label': t('title'),
                className: 'ou_panel',
                style: position ?? { visibility: 'hidden', left: 0, bottom: 0 },
              },
              h('div', { className: 'ou_title' }, t('title')),
              h(
                'div',
                { className: 'ou_services', role: 'group', 'aria-label': t('service') },
                Object.keys(SERVICES).map((name) => h(
                  'button',
                  { key: name, type: 'button', className: 'ou_service', 'aria-pressed': service === name, onClick: () => selectService(name) },
                  SERVICES[name].name,
                )),
              ),
              h(PanelBody, { state, service, t, reload }),
            ),
            document.body,
          )
        : null

      return h(
        'span',
        { ref: rootRef, className: 'ou_root' },
        h('style', null, CSS),
        h(
          'button',
          {
            ref: triggerRef,
            type: 'button',
            className: 'ou_trigger',
            'aria-label': t('aria'),
            'aria-haspopup': 'dialog',
            'aria-expanded': open,
            title: t('aria'),
            onClick: () => open ? close() : setOpen(true),
          },
          h(
            'svg',
            { viewBox: '0 0 14 14', width: 14, height: 14, 'aria-hidden': true },
            h('path', {
              d: 'M2.5 11.5V7.5M7 11.5V2.5M11.5 11.5V5',
              stroke: 'currentColor',
              strokeWidth: 1.6,
              strokeLinecap: 'round',
            }),
          ),
        ),
        panel,
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'opencode-usage: dictionaries')
        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            {
              name: 'conversation.composer.dock',
              id: 'opencode-usage',
              order: 100,
              locale: NS,
            },
            UsageButton,
          ),
        )
      },
    }
  },
})

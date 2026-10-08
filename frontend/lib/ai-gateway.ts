type GatewayMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type GatewayResponse = {
  ok?: boolean
  answer?: string
  provider?: string
  model?: string
  request_id?: string
  error?: string
}

export type GatewayResult = {
  answer: string
  provider: string
  model: string
  requestId: string | null
}

export async function callAiGateway(input: {
  task: string
  messages: GatewayMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  metadata?: Record<string, unknown>
  signal?: AbortSignal
}): Promise<GatewayResult> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('ai_gateway_not_configured')
  }

  const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/functions/v1/ai-gateway`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      task: input.task,
      messages: input.messages,
      ...(input.model ? { model: input.model } : {}),
      ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
      ...(input.maxTokens !== undefined ? { max_tokens: input.maxTokens } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    }),
    signal: input.signal,
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => ({})) as GatewayResponse
  if (!response.ok || payload.ok !== true || typeof payload.answer !== 'string' || !payload.answer.trim()) {
    const error = typeof payload.error === 'string' ? payload.error : `ai_gateway_http_${response.status}`
    throw new Error(error)
  }

  return {
    answer: payload.answer,
    provider: payload.provider || 'gateway',
    model: payload.model || 'gateway-default',
    requestId: payload.request_id || null,
  }
}

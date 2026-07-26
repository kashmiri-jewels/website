type SupabaseClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>
  }
}

export async function notifyOwner(
  supabase: SupabaseClient,
  input: {
    eventType: string
    orderId?: string | null
    message: string
    payload?: Record<string, unknown>
  },
) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')

  if (!botToken || !chatId) {
    return { sent: false, reason: 'telegram_not_configured' }
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: input.message,
        disable_web_page_preview: true,
      }),
    })
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      const errorMessage =
        payload && typeof payload === 'object' && 'description' in payload
          ? String((payload as { description?: string }).description)
          : 'Telegram alert failed'

      await logTelegramEvent(supabase, {
        ...input,
        status: 'failed',
        errorMessage,
      })

      return { sent: false, reason: errorMessage }
    }

    await logTelegramEvent(supabase, {
      ...input,
      status: 'processed',
      payload: { ...input.payload, telegram: payload },
    })

    return { sent: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Telegram alert failed'
    await logTelegramEvent(supabase, {
      ...input,
      status: 'failed',
      errorMessage,
    })

    return { sent: false, reason: errorMessage }
  }
}

async function logTelegramEvent(
  supabase: SupabaseClient,
  input: {
    eventType: string
    orderId?: string | null
    status: 'processed' | 'failed'
    message: string
    payload?: Record<string, unknown>
    errorMessage?: string
  },
) {
  const { error } = await supabase.from('integration_events').insert({
    source: 'telegram',
    event_type: input.eventType,
    order_id: input.orderId ?? null,
    status: input.status,
    payload: {
      message: input.message,
      ...(input.payload ?? {}),
    },
    error_message: input.errorMessage ?? null,
  })

  if (error) {
    console.error(`Unable to log Telegram event: ${error.message}`)
  }
}

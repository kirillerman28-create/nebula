/**
 * Edge Function «nebula-support» — мостик к DeepSeek.
 *
 * Зачем нужна: API-ключ DeepSeek нельзя держать в браузере (его увидит любой).
 * Функция живёт на серверах Supabase, хранит ключ в секретах и отдаёт только
 * готовый ответ. Плюс короткий промпт и max_tokens — чтобы дешево.
 *
 * Развёртывание (в Supabase):
 *   1. Edge Functions → Create function → имя: nebula-support
 *   2. Вставить этот код → Deploy
 *   3. Secrets → добавить DEEPSEEK_API_KEY = sk-... (из platform.deepseek.com)
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_PROMPT = `Ты — служба поддержки мессенджера Nebula (космический стиль, фиолетовое стекло).
Отвечай по-русски, коротко (2–4 предложения), дружелюбно и по делу.
Факты: вход по 6–8-значному коду на почту без паролей; у создателя после кода есть загадка с шифром;
аватар меняется по стрелке слева → Профиль; фото и видео до 25 МБ через скрепку; вид чатов переключается там же.
Если вопрос не про Nebula — вежливо верни к теме. Не выдумывай факты, которых не знаешь.`

interface Payload {
  messages?: Array<{ role: string; content: string }>
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Не задан DEEPSEEK_API_KEY в секретах функции' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const payload = (await request.json()) as Payload
    const history = (payload.messages ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 600) }))

    if (history.length === 0) {
      return new Response(JSON.stringify({ error: 'Пустой запрос' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
        max_tokens: 220,
        temperature: 0.5,
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      return new Response(JSON.stringify({ error: 'DeepSeek ответил ошибкой', detail: detail.slice(0, 300) }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const reply = data?.choices?.[0]?.message?.content?.trim() ?? ''

    return new Response(JSON.stringify({ reply }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})

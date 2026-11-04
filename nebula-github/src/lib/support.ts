/**
 * ПОДДЕРЖКА NEBULA — два уровня ответов.
 *
 * 1) Локальная база (0 токенов): мгновенно отвечает на частые вопросы
 *    про вход, код, аватар, вложения, ошибки базы.
 * 2) DeepSeek (если настроен): Edge Function в Supabase держит API-ключ
 *    у себя и отвечает на всё остальное. Короткий промпт + max_tokens,
 *    чтобы расход был минимальным.
 */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'

export interface SupportMessage {
  role: 'user' | 'assistant'
  content: string
}

interface FaqItem {
  keys: string[]
  answer: string
}

const FAQ: FaqItem[] = [
  {
    keys: ['код', 'письмо', 'не пришло', 'не приходит', 'спам', 'почта не'],
    answer:
      'Письмо с кодом часто падает в «Спам» — проверь его первым делом. Ещё убедись, что почта введена верно (без опечаток) и что в Supabase → Authentication → Emails → Magic link or OTP в шаблоне стоит {{ .Token }}. Если запрашивал код несколько раз — подожди минуту, Supabase ограничивает частоту.',
  },
  {
    keys: ['войти', 'вход', 'как зайти', 'логин', 'начать'],
    answer:
      'Вход простой: вводишь почту → приходит код → вводишь код → ты в чатах. Паролей нет. Если почта создателя — после кода будет ещё загадка со шифром.',
  },
  {
    keys: ['загадка', 'шифр', 'ёwq', 'секрет', 'пасхалк'],
    answer:
      'Загадка — пасхалка для создателя Nebula: после кода он вводит секретный шифр и попадает в чаты как «СОЗДАТЕЛЬ» с золотой чёрной дырой рядом с именем.',
  },
  {
    keys: ['аватар', 'аватарк', 'фото профил', 'своё фото', 'картинк'],
    answer:
      'Нажми стрелку «›» у левого края экрана → вкладка «Профиль» → «Загрузить фото». Откроется круглый редактор: картинку можно подвинуть мышкой и приблизить ползунком, потом «Применить». Или выбери эмодзи из списка.',
  },
  {
    keys: ['видео', 'вложен', 'отправить фото', 'скрепк', 'файл'],
    answer:
      'Фото и видео отправляются через скрепку 📎 в поле сообщения. Ограничение — 25 МБ. Если не грузится, проверь, что в SQL выполнен блок про storage (бакеты media и avatars).',
  },
  {
    keys: ['квадрат', 'плитк', 'вид', 'сетк'],
    answer:
      'Вид переключается стрелкой «›» → вкладка «Чаты»: «Список» или «Квадраты». В квадратах 3 плитки в ряд на компьютере и 2 на телефоне.',
  },
  {
    keys: ['rls', 'row-level', 'ошибка', 'не создаёт', 'чат не', 'пусто'],
    answer:
      'Похоже на правило безопасности базы. Выполни в Supabase SQL Editor файлы schema.sql и fix-chat-creation.sql — второй создаёт функцию, которая надёжно делает первый чат. Потом обнови страницу.',
  },
  {
    keys: ['туманность', 'фон', 'звёзд', 'дым'],
    answer:
      'Фон — живые туманности и звёзды, за мышкой тянется цветной дым, а по клику по пустому месту вспыхивает сверхновая. Отключается: стрелка «›» → «Контент» → «Фон-туманность».',
  },
  {
    keys: ['создатель', 'кирилл', 'админ', 'связаться'],
    answer:
      'Создатель Nebula — Kirill (@kirill), почта Kirillerman28@gmail.com. Напиши ему, если что-то сломалось по-крупному.',
  },
  {
    keys: ['что такое', 'nebula', 'мессенджер', 'о приложении'],
    answer:
      'Nebula — мессенджер из глубокого космоса: вход по коду на почту без паролей, фиолетовое стекло, золотая чёрная дыра вместо иконки и живые эффекты на фоне.',
  },
]

/** Ищем ответ в локальной базе. Возвращает null, если не нашли. */
export function answerLocally(text: string): string | null {
  const query = text.toLowerCase()
  let best: { score: number; answer: string } | null = null

  for (const item of FAQ) {
    let score = 0
    for (const key of item.keys) {
      if (query.includes(key)) score += key.length
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { score, answer: item.answer }
    }
  }
  return best ? best.answer : null
}

/**
 * Спрашиваем DeepSeek через Edge Function Supabase.
 * Ключ API живёт на сервере — в браузер он не попадает.
 */
export async function askSupport(history: SupportMessage[]): Promise<string> {
  const trimmed = history
    .slice(-6)
    .map((message) => ({ role: message.role, content: message.content.slice(0, 600) }))

  const response = await fetch(`${SUPABASE_URL}/functions/v1/nebula-support`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ messages: trimmed }),
  })

  if (!response.ok) {
    throw new Error(`Поддержка недоступна (${response.status})`)
  }

  const data = (await response.json()) as { reply?: string }
  if (!data.reply) throw new Error('Пустой ответ поддержки')
  return data.reply
}

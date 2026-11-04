/**
 * Supabase отвечает по-английски и технично. Здесь мы переводим это
 * на человеческий, чтобы в интерфейсе не было «AuthApiError: ...».
 */
export function ruError(message: string): string {
  const m = message.toLowerCase()

  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed')) {
    return 'Нет связи с Supabase. Проверь SUPABASE_URL в src/lib/config.ts и интернет.'
  }
  if (m.includes('invalid api key') || m.includes('no api key')) {
    return 'Supabase не принял ключ. Скопируй SUPABASE_ANON_KEY заново из дашборда.'
  }
  if (m.includes('invalid login credentials')) {
    return 'Неверная почта или пароль.'
  }
  if (m.includes('email not confirmed')) {
    return 'Почта ещё не подтверждена. Запроси код письмом — подтверждение произойдёт само.'
  }
  if (m.includes('token has expired') || m.includes('invalid token') || m.includes('otp_expired')) {
    return 'Код неверный или уже истёк. Запроси новый — он живёт 60 минут.'
  }
  if (m.includes('only request this after') || m.includes('rate limit') || m.includes('too many')) {
    return 'Слишком часто. Подожди минуту и попробуй снова.'
  }
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) {
    return 'В проекте Supabase запрещена регистрация. Включи Email provider в Authentication → Providers.'
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return 'Похоже, в адресе почты опечатка.'
  }
  if (m.includes('user not found')) {
    return 'Такого пользователя нет. Сначала запроси код на эту почту.'
  }
  return message
}

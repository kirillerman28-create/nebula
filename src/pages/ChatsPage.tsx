import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import Avatar from '../components/Avatar'
import CreatorBadge from '../components/CreatorBadge'
import SpaceBackground from '../components/SpaceBackground'
import { ArrowLeftIcon, GearIcon, GridIcon, ListIcon, SearchIcon, SendIcon, SparkIcon } from '../components/icons'
import SettingsPanel from '../components/SettingsPanel'
import ChatMenu from '../components/ChatMenu'
import CreateChat from '../components/CreateChat'
import RailMenu from '../components/RailMenu'
import ThemeModal from '../components/ThemeModal'
import { useThemes } from '../lib/themes'
import { useAuth } from '../lib/auth'
import { useSettings, BACKGROUNDS, resolveProfileBackground, type BackgroundId } from '../lib/settings'
import { ruError } from '../lib/errors'
import {
  ensureStarterChat,
  leaveChat,
  listChats,
  listMessages,
  listProfiles,
  openDirectChat,
  searchPeople,
  sendMessage,
  subscribeToMessages,
  uploadMedia,
} from '../lib/api'
import { demoChats, demoMembers, demoMessages } from '../lib/demoData'
import type { Chat, Message, Profile } from '../types'

interface Person {
  name: string
  creator: boolean
  emoji: string | null
}

const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const formatTime = (iso: string) => timeFormatter.format(new Date(iso))

function toPeople(profiles: Profile[]): Record<string, Person> {
  const map: Record<string, Person> = {}
  for (const profile of profiles) {
    map[profile.id] = { name: profile.display_name, creator: profile.is_creator, emoji: profile.avatar_emoji ?? null }
  }
  return map
}

export default function ChatsPage() {
  const { me, demo } = useAuth()

  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [people, setPeople] = useState<Record<string, Person>>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pane, setPane] = useState<'list' | 'chat'>('list')
  /** none — закрыто, full — все настройки (стрелка), profile — только профиль (шестерёнка) */
  const [panel, setPanel] = useState<'none' | 'full' | 'profile'>('none')
  const [railOpen, setRailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [themesOpen, setThemesOpen] = useState(false)
  const [peopleResults, setPeopleResults] = useState<Profile[]>([])

  const { themes, activeTheme, setActiveTheme, toggleChatInTheme } = useThemes()

  /* ширина панели чатов — тянется за край, запоминается */
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(localStorage.getItem('nebula:sidebar-w'))
    return Number.isFinite(saved) && saved >= 240 && saved <= 620 ? saved : 320
  })

  /* какие чаты прочитаны (для точки «не прочитано») */
  const [readChats, setReadChats] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('nebula:read-chats') ?? '[]') as string[]
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('nebula:read-chats', JSON.stringify(readChats))
  }, [readChats])

  /** Сообщение моё? Тогда статус «прочитано» не показываем. */
  function isOwnMessage(message: Message): boolean {
    return message.sender_id === meId
  }

  useEffect(() => {
    localStorage.setItem('nebula:sidebar-w', String(sidebarWidth))
  }, [sidebarWidth])

  function startResize(event: React.PointerEvent<HTMLSpanElement>) {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = sidebarWidth
    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)

    const onMove = (moveEvent: PointerEvent) => {
      const next = Math.min(620, Math.max(240, startWidth + (moveEvent.clientX - startX)))
      setSidebarWidth(next)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  /* меню чата: правый клик по чату или кнопка «⋯» */
  const [menu, setMenu] = useState<{ chat: Chat; x: number; y: number } | null>(null)
  const [blocked, setBlocked] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('nebula:blocked') ?? '[]') as string[]
    } catch {
      return []
    }
  })
  const [chatBackgrounds, setChatBackgrounds] = useState<Record<string, BackgroundId>>(() => {
    try {
      return JSON.parse(localStorage.getItem('nebula:chat-bg') ?? '{}') as Record<string, BackgroundId>
    } catch {
      return {}
    }
  })

  useEffect(() => {
    localStorage.setItem('nebula:blocked', JSON.stringify(blocked))
  }, [blocked])

  useEffect(() => {
    localStorage.setItem('nebula:chat-bg', JSON.stringify(chatBackgrounds))
  }, [chatBackgrounds])

  const { settings, update } = useSettings()
  const view = settings.chatView

  const threadRef = useRef<HTMLDivElement | null>(null)
  const meId = me?.id ?? ''

  /* ---------------- загрузка данных ---------------- */
  useEffect(() => {
    if (!me) return
    let alive = true

    if (demo) {
      setChats(demoChats)
      setMessages(demoMessages)
      setPeople(
        demoMembers.reduce<Record<string, Person>>((map, member) => {
          map[member.id] = { name: member.displayName, creator: member.isCreator, emoji: member.avatarEmoji }
          return map
        }, {}),
      )
      setActiveId(demoChats[0]?.id ?? null)
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        let loadedChats = await listChats(me.id)
        if (loadedChats.length === 0) {
          // первый вход: создаём канал Nebula HQ, чтобы не было пустого экрана
          const created = await ensureStarterChat(me)
          loadedChats = [created]
        }
        const [loadedMessages, loadedProfiles] = await Promise.all([listMessages(), listProfiles()])
        if (!alive) return
        setChats(loadedChats)
        setMessages(loadedMessages)
        setPeople(toPeople(loadedProfiles))
        setActiveId((current) => current ?? loadedChats[0]?.id ?? null)
      } catch (err) {
        if (alive) setError(ruError(err instanceof Error ? err.message : String(err)))
      } finally {
        if (alive) setLoading(false)
      }
    }

    void load()
    return () => {
      alive = false
    }
  }, [me, demo])

  /* ---------------- живые сообщения ---------------- */
  useEffect(() => {
    if (!me || demo) return
    return subscribeToMessages((message) => {
      setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]))
    })
  }, [me, demo])

  const activeChat = useMemo(() => chats.find((chat) => chat.id === activeId) ?? null, [chats, activeId])

  const thread = useMemo(
    () => messages.filter((message) => message.chat_id === activeId),
    [messages, activeId],
  )

  const lastByChat = useMemo(() => {
    const map: Record<string, Message> = {}
    for (const message of messages) map[message.chat_id] = message
    return map
  }, [messages])

  const visibleChats = useMemo(() => {
    const needle = query.trim().toLowerCase()
    let list = chats
    // фильтр по активной теме
    if (activeTheme) {
      const theme = themes.find((item) => item.id === activeTheme)
      if (theme) list = list.filter((chat) => theme.chatIds.includes(chat.id))
    }
    if (needle) list = list.filter((chat) => chat.title.toLowerCase().includes(needle))
    return list
  }, [chats, query, activeTheme, themes])

  /* поиск людей по @юзернейму — ищем по всей базе */
  useEffect(() => {
    const needle = query.trim().replace(/^@/, '')
    if (needle.length < 2 || demo) {
      setPeopleResults([])
      return
    }
    let alive = true
    const timer = window.setTimeout(() => {
      searchPeople(needle)
        .then((rows) => {
          if (alive) setPeopleResults(rows.filter((row) => row.id !== me?.id))
        })
        .catch(() => {
          if (alive) setPeopleResults([])
        })
    }, 300)

    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [query, demo, me?.id])

  const activeIsCreatorChat = activeChat
    ? Object.values(people).some((person) => person.creator && person.name === activeChat.title)
    : false

  /** Фон шапки открытого чата: свой у чата, иначе обложка профиля. */
  const activeHeaderCover =
    (activeId && chatBackgrounds[activeId]
      ? (BACKGROUNDS.find((item) => item.id === chatBackgrounds[activeId])?.url ?? null)
      : null) ?? resolveProfileBackground(settings)

  /* прокрутка вниз при новом сообщении */
  useEffect(() => {
    const node = threadRef.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
  }, [activeId, thread.length])

  if (!me) return null

  function openChat(chatId: string) {
    setActiveId(chatId)
    setPane('chat')
    // открыл чат — считаем прочитанным
    setReadChats((prev) => (prev.includes(chatId) ? prev : [...prev, chatId]))
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || !activeChat || sending) return

    setDraft('')
    setSending(true)

    if (demo) {
      const local: Message = {
        id: `demo-${Date.now()}`,
        chat_id: activeChat.id,
        sender_id: meId,
        body: text,
        created_at: new Date().toISOString(),
        attachment_url: null,
        attachment_type: null,
      }
      setMessages((prev) => [...prev, local])
      setSending(false)
      return
    }

    try {
      const saved = await sendMessage(activeChat.id, meId, text)
      setMessages((prev) => (prev.some((item) => item.id === saved.id) ? prev : [...prev, saved]))
    } catch (err) {
      setError(ruError(err instanceof Error ? err.message : String(err)))
      setDraft(text)
    } finally {
      setSending(false)
    }
  }

  /** Фото или видео: загружаем в хранилище и отправляем сообщением. */
  async function handleAttach(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !activeChat || !me) return

    const kind = file.type.startsWith('video/') ? 'video' : 'image'
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Можно отправлять только фото и видео.')
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('Файл больше 25 МБ — не пройдёт.')
      return
    }

    setUploading(true)
    setError(null)
    try {
      if (demo) {
        const local: Message = {
          id: `demo-${Date.now()}`,
          chat_id: activeChat.id,
          sender_id: meId,
          body: '',
          created_at: new Date().toISOString(),
          attachment_url: URL.createObjectURL(file),
          attachment_type: kind,
        }
        setMessages((prev) => [...prev, local])
        return
      }
      const url = await uploadMedia(file, meId)
      const saved = await sendMessage(activeChat.id, meId, '', url, kind)
      setMessages((prev) => (prev.some((item) => item.id === saved.id) ? prev : [...prev, saved]))
    } catch (err) {
      setError(ruError(err instanceof Error ? err.message : String(err)))
    } finally {
      setUploading(false)
    }
  }

  /** Открыть личный чат с найденным человеком. */
  async function startDirectChat(person: Profile) {
    try {
      const chat = await openDirectChat(person.id, person.display_name)
      setChats((prev) => (prev.some((item) => item.id === chat.id) ? prev : [...prev, chat]))
      setQuery('')
      setPeopleResults([])
      setActiveId(chat.id)
      setPane('chat')
    } catch (err) {
      setError(ruError(err instanceof Error ? err.message : String(err)))
    }
  }

  /** Перечитать чаты с сервера (после создания нового). */
  async function reloadChats() {
    if (!me || demo) return
    try {
      setChats(await listChats(me.id))
    } catch (err) {
      setError(ruError(err instanceof Error ? err.message : String(err)))
    }
  }

  /** Открыть меню чата (правый клик или кнопка ⋯). */
  function openChatMenu(event: { preventDefault(): void; stopPropagation(): void; clientX: number; clientY: number }, chat: Chat) {
    event.preventDefault()
    event.stopPropagation()
    setMenu({ chat, x: event.clientX, y: event.clientY })
  }

  function toggleBlock(chat: Chat) {
    setBlocked((prev) => (prev.includes(chat.id) ? prev.filter((id) => id !== chat.id) : [...prev, chat.id]))
    setMenu(null)
  }

  function pickChatBackground(chat: Chat, id: BackgroundId | null) {
    setChatBackgrounds((prev) => {
      const next = { ...prev }
      if (id) next[chat.id] = id
      else delete next[chat.id]
      return next
    })
  }

  async function handleLeave(chat: Chat) {
    setMenu(null)
    if (demo) {
      setChats((prev) => prev.filter((item) => item.id !== chat.id))
      return
    }
    try {
      await leaveChat(chat.id, meId)
      setChats((prev) => prev.filter((item) => item.id !== chat.id))
      setMessages((prev) => prev.filter((item) => item.chat_id !== chat.id))
      if (activeId === chat.id) setActiveId(null)
    } catch (err) {
      setError(ruError(err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <div
      className={`chats${settings.compact ? ' is-compact' : ''}${settings.showAvatars ? '' : ' no-avatars'}`}
      data-pane={pane}
      data-view={view}
      style={{ ['--sidebar-w' as string]: `${sidebarWidth}px` }}
    >
      <SpaceBackground />

      {/* левое меню с иконками — выезжает по стрелке */}
      <button
        type="button"
        className={`edge-arrow${railOpen ? ' is-open' : ''}`}
        onClick={() => setRailOpen((value) => !value)}
        aria-label={railOpen ? 'Свернуть меню' : 'Открыть меню'}
        title="Меню"
      >
        <span className={`edge-arrow__chevron${railOpen ? ' is-back' : ''}`}>{railOpen ? '‹' : '›'}</span>
      </button>

      {railOpen && (
        <RailMenu
          onClose={() => setRailOpen(false)}
          onSettings={() => { setRailOpen(false); setPanel('full') }}
          onCreate={() => { setRailOpen(false); setCreateOpen(true) }}
          onThemesManage={() => { setRailOpen(false); setThemesOpen(true) }}
          onPickTheme={(id) => { setActiveTheme(id); setRailOpen(false) }}
          themes={themes}
          activeTheme={activeTheme}
        />
      )}

      <aside className="sidebar glass-panel">
        {/* ползунок ширины панели — тянем за правый край */}
        <span
          className="sidebar__resizer"
          role="separator"
          aria-label="Изменить ширину панели чатов"
          onPointerDown={startResize}
          onDoubleClick={() => setSidebarWidth(320)}
          title="Потяни, чтобы изменить ширину (двойной клик — сброс)"
        />
        <div
          className={`sidebar__me${resolveProfileBackground(settings) ? ' has-cover' : ''}`}
          style={
            resolveProfileBackground(settings)
              ? {
                  backgroundImage: `linear-gradient(95deg, rgba(6,3,14,.86) 32%, rgba(6,3,14,.42)), url('${resolveProfileBackground(
                    settings,
                  )}')`,
                }
              : undefined
          }
        >
          <Avatar
            name={me.displayName}
            isCreator={me.isCreator}
            size={40}
            emoji={me.avatarEmoji}
            url={me.avatarUrl}
          />
          <div className="sidebar__me-text">
            <div className="name-row">
              <span className="name">{me.displayName}</span>
              {me.isCreator && <CreatorBadge size="sm" />}
            </div>
            <span className="handle">@{me.username}</span>
          </div>
          <button
            className="icon-btn"
            title="Кастомизация профиля"
            aria-label="Кастомизация профиля"
            onClick={() => setPanel('profile')}
          >
            <GearIcon size={17} />
          </button>
        </div>

        <div className="view-switch" role="group" aria-label="Вид списка чатов">
          <button
            type="button"
            className={`view-switch__btn${view === 'list' ? ' is-active' : ''}`}
            onClick={() => update({ chatView: 'list' })}
            title="Список"
            aria-pressed={view === 'list'}
          >
            <ListIcon size={15} />
            Список
          </button>
          <button
            type="button"
            className={`view-switch__btn${view === 'grid' ? ' is-active' : ''}`}
            onClick={() => update({ chatView: 'grid' })}
            title="Квадраты"
            aria-pressed={view === 'grid'}
          >
            <GridIcon size={15} />
            Квадраты
          </button>
        </div>

        {demo && (
          <div className="chip chip--demo">
            <SparkIcon size={12} />
            демо-режим · сообщения не сохраняются
          </div>
        )}

        {themes.length > 0 && (
          <nav className="theme-list-side" aria-label="Темы">
            <button
              type="button"
              className={`theme-row-btn${activeTheme === null ? ' is-active' : ''}`}
              onClick={() => setActiveTheme(null)}
            >
              <span className="theme-row-btn__icon">🗂</span>
              <span className="theme-row-btn__title">Все чаты</span>
              <span className="theme-row-btn__count">{chats.length}</span>
            </button>

            {themes.map((theme) => {
              const count = chats.filter((chat) => theme.chatIds.includes(chat.id)).length
              return (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-row-btn${activeTheme === theme.id ? ' is-active' : ''}`}
                  onClick={() => setActiveTheme(activeTheme === theme.id ? null : theme.id)}
                  title={theme.title}
                >
                  <span className="theme-row-btn__icon">{theme.icon}</span>
                  <span className="theme-row-btn__title">{theme.title}</span>
                  <span className="theme-row-btn__count">{count}</span>
                </button>
              )
            })}
          </nav>
        )}

        <label className="search">
          <SearchIcon size={15} />
          <input
            type="search"
            placeholder="Чаты и люди (@юзернейм)"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        {/* люди, найденные по @юзернейму */}
        {peopleResults.length > 0 && (
          <div className="people-results">
            <span className="people-results__label">Люди</span>
            {peopleResults.map((person) => (
              <button
                key={person.id}
                type="button"
                className="people-row"
                onClick={() => void startDirectChat(person)}
                title={`Написать @${person.username}`}
              >
                <Avatar name={person.display_name} size={30} emoji={person.avatar_emoji} url={person.avatar_url} />
                <span className="people-row__text">
                  <span className="people-row__name">{person.display_name}</span>
                  <span className="people-row__handle">@{person.username}</span>
                </span>
                <span className="people-row__go">написать</span>
              </button>
            ))}
          </div>
        )}

        <nav className={`chat-list${view === 'grid' ? ' chat-list--grid' : ''}`} aria-label="Список чатов">
          {loading && <p className="chat-list__hint">Загружаем каналы…</p>}
          {!loading && visibleChats.length === 0 && <p className="chat-list__hint">Пока пусто. Напиши первым 😉</p>}
          {visibleChats.map((chat) => {
            const preview = lastByChat[chat.id]
            const isBlocked = blocked.includes(chat.id)
            // у каждого чата свой фон; если не выбран — берём обложку профиля
            const ownBg = chatBackgrounds[chat.id]
            const cover = ownBg
              ? (BACKGROUNDS.find((item) => item.id === ownBg)?.url ?? null)
              : resolveProfileBackground(settings)
            return (
              <div key={chat.id} className={`chat-item-wrap${isBlocked ? ' is-blocked' : ''}`}>
                <button
                  type="button"
                  className={`chat-item${chat.id === activeId ? ' is-active' : ''}${cover ? ' has-cover' : ''}`}
                  onClick={() => openChat(chat.id)}
                  onContextMenu={(event) => openChatMenu(event, chat)}
                  title={chat.title}
                  style={
                    cover
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(8,4,18,.82) 26%, rgba(8,4,18,.5)), url('${cover}')`,
                        }
                      : undefined
                  }
                >
                  <Avatar name={chat.title} size={38} />
                  <span className="chat-item__text">
                    <span className="chat-item__title">
                      {isBlocked ? '🔒 ' : ''}
                      {chat.title}
                    </span>
                    <span className="chat-item__preview">
                      {preview
                        ? preview.attachment_type === 'image'
                          ? '📷 Фото'
                          : preview.attachment_type === 'video'
                            ? '🎬 Видео'
                            : preview.body
                        : 'Нет сообщений'}
                    </span>
                  </span>
                  {preview && !isOwnMessage(preview) && (
                    <span
                      className={`chat-item__badge${readChats.includes(chat.id) ? ' is-read' : ''}`}
                      aria-label={readChats.includes(chat.id) ? 'прочитано' : 'не прочитано'}
                      title={readChats.includes(chat.id) ? 'прочитано' : 'не прочитано'}
                    >
                      {readChats.includes(chat.id) ? '✓' : '●'}
                    </span>
                  )}
                  {preview && <time className="chat-item__time">{formatTime(preview.created_at)}</time>}
                </button>

                <button
                  type="button"
                  className="chat-item__more"
                  aria-label={`Меню чата ${chat.title}`}
                  title="Меню чата"
                  onClick={(event) => openChatMenu(event, chat)}
                >
                  ⋯
                </button>
              </div>
            )
          })}
        </nav>

        <div className="sidebar__brand">
          <span className="sidebar__brand-dot" />
          Nebula v0.1
        </div>
      </aside>

      <main
        className={`chat-view${activeId && chatBackgrounds[activeId] ? ' has-bg' : ''}`}
        style={
          activeId && chatBackgrounds[activeId]
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(6,3,14,.55), rgba(6,3,14,.72)), url('${
                  BACKGROUNDS.find((item) => item.id === chatBackgrounds[activeId])?.url ?? ''
                }')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: 20,
              }
            : undefined
        }
      >
        {activeChat ? (
          <>
            <header
              className={`chat-head glass-panel${activeHeaderCover ? ' has-cover' : ''}`}
              style={
                activeHeaderCover
                  ? {
                      backgroundImage: `linear-gradient(95deg, rgba(8,4,18,.9) 34%, rgba(8,4,18,.45)), url('${activeHeaderCover}')`,
                    }
                  : undefined
              }
            >
              <button className="icon-btn chat-head__back" onClick={() => setPane('list')} aria-label="Назад к чатам">
                <ArrowLeftIcon size={17} />
              </button>
              <Avatar name={activeChat.title} size={38} isCreator={activeIsCreatorChat} />
              <div className="chat-head__text">
                <div className="name-row">
                  <h1 className="chat-head__title">{activeChat.title}</h1>
                  {activeIsCreatorChat && <CreatorBadge size="sm" />}
                </div>
                <span className="chat-head__meta">
                  {activeChat.is_group ? 'группа' : 'личный чат'} · {thread.length} сообщ.
                </span>
              </div>
            </header>

            <div className="thread" ref={threadRef}>
              {thread.length === 0 && (
                <p className="thread__empty">Тишина в эфире. Напиши первое сообщение в этот канал.</p>
              )}

              {thread.map((message) => {
                const own = message.sender_id === meId
                const author = people[message.sender_id]
                return (
                  <div key={message.id} className={`msg${own ? ' msg--own' : ''}`}>
                    {!own && (
                      <Avatar
                        name={author?.name ?? 'Гость'}
                        isCreator={author?.creator}
                        size={30}
                        emoji={author?.emoji ?? null}
                      />
                    )}
                    <div className="msg__body">
                      {(!own || me.isCreator) && (
                        <div className="msg__meta">
                          <span className="msg__author">{own ? me.displayName : author?.name ?? 'Гость'}</span>
                          {(own ? me.isCreator : author?.creator) && <CreatorBadge size="sm" />}
                          <time className="msg__time">{formatTime(message.created_at)}</time>
                        </div>
                      )}
                      <div className={`bubble${own ? ' bubble--out' : ' bubble--in'}`}>
                        {message.attachment_type === 'image' && message.attachment_url && (
                          <img className="bubble__media" src={message.attachment_url} alt="Фото" loading="lazy" />
                        )}
                        {message.attachment_type === 'video' && message.attachment_url && (
                          <video className="bubble__media" src={message.attachment_url} controls playsInline preload="metadata" />
                        )}
                        {message.body && <span>{message.body}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <form className="composer" onSubmit={handleSend}>
              <label className={`composer__attach${uploading ? ' is-busy' : ''}`} title="Фото или видео">
                {uploading ? '…' : '📎'}
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(event) => void handleAttach(event)}
                  disabled={uploading}
                  hidden
                />
              </label>
              <input
                className="composer__input"
                placeholder={`Написать в «${activeChat.title}»…`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  // Enter отправляет (если включено), Shift+Enter — перенос строки
                  if (event.key === 'Enter' && !event.shiftKey && settings.enterToSend) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
                maxLength={2000}
                aria-label="Текст сообщения"
              />
              <button
                className="btn btn--primary btn--send"
                type="submit"
                disabled={!draft.trim() || sending}
                aria-label="Отправить"
              >
                <SendIcon size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="chat-empty glass-card">
            <span className="brand__mark">
              <CreatorBadge size="lg" withLabel={false} />
            </span>
            <h2>Выбери канал</h2>
            <p>Слева список твоих чатов. Или создай первый — он появится после входа.</p>
          </div>
        )}
      </main>

      {error && (
        <div className="toast toast--error">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Закрыть">
            ✕
          </button>
        </div>
      )}

      {panel !== 'none' && (
        <SettingsPanel
          onClose={() => setPanel('none')}
          onlyProfile={panel === 'profile'}
          initialTab={panel === 'profile' ? 'profile' : 'profile'}
        />
      )}

      {createOpen && (
        <CreateChat
          onClose={() => setCreateOpen(false)}
          onCreated={(chat) => {
            setChats((prev) => (prev.some((item) => item.id === chat.id) ? prev : [...prev, chat]))
            setActiveId(chat.id)
            setPane('chat')
            void reloadChats()
          }}
        />
      )}

      {themesOpen && <ThemeModal onClose={() => setThemesOpen(false)} />}

      {menu && (
        <ChatMenu
          chat={menu.chat}
          x={menu.x}
          y={menu.y}
          blocked={blocked.includes(menu.chat.id)}
          chatBackground={chatBackgrounds[menu.chat.id] ?? null}
          onClose={() => setMenu(null)}
          onOpen={() => {
            openChat(menu.chat.id)
            setMenu(null)
          }}
          onToggleBlock={() => toggleBlock(menu.chat)}
          onLeave={() => void handleLeave(menu.chat)}
          onDelete={() => void handleLeave(menu.chat)}
          onPickBackground={(id) => pickChatBackground(menu.chat, id)}
          themes={themes}
          onToggleTheme={(themeId) => toggleChatInTheme(themeId, menu.chat.id)}
        />
      )}
    </div>
  )
}

interface ShortcutLikeEvent {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}

const MODIFIER_KEYS = new Set(["Meta", "Control", "Shift", "Alt"])

const KEY_ALIASES: Record<string, string> = {
  " ": "Space",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  Escape: "Esc",
}

function normalizeMainKey(key: string): string | null {
  if (!key || MODIFIER_KEYS.has(key)) {
    return null
  }

  if (KEY_ALIASES[key]) {
    return KEY_ALIASES[key]
  }

  if (key.length === 1) {
    return key.toUpperCase()
  }

  return key
}

export function getShortcutFromKeyboardEvent(event: ShortcutLikeEvent): string | null {
  const mainKey = normalizeMainKey(event.key)
  if (!mainKey) {
    return null
  }

  const parts: string[] = []
  if (event.metaKey || event.ctrlKey) {
    parts.push("CommandOrControl")
  }
  if (event.altKey) {
    parts.push("Alt")
  }
  if (event.shiftKey) {
    parts.push("Shift")
  }
  parts.push(mainKey)

  return parts.join("+")
}

export function isNewSessionShortcut(event: ShortcutLikeEvent): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "n"
  )
}

export interface IMEKeyboardEventLike {
  isComposing?: boolean
  keyCode?: number
}

export function isIMEComposingKeyEvent(
  event: IMEKeyboardEventLike | undefined,
  fallbackComposing: boolean,
): boolean {
  if (fallbackComposing) {
    return true
  }

  if (!event) {
    return false
  }

  return event.isComposing === true || event.keyCode === 229
}

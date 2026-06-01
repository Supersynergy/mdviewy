type Message = {
  key: string
  payload: any
}

function getParentOrigin() {
  if (document.referrer) {
    try {
      return new URL(document.referrer).origin
    } catch {
      return window.location.origin
    }
  }

  return window.location.origin
}

export const sendMessage = (message: Message, targetOrigin = getParentOrigin()) => {
  if (window.top === window) {
    return
  }

  window.top?.postMessage(message, targetOrigin)
}

export default {
  sendMessage
}

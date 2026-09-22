// The chat panel's static shell (header + messages area + input row). Rendered
// EAGERLY by ChatWidget.astro the instant the chat opens, so the header and
// input appear before the lazy chat-logic chunk and the history round-trip load
// - only the messages area shows a spinner meanwhile. mountChat() then finds
// these elements by id and wires them up (it no longer re-renders the shell).
// Kept in its own module so the shell can be shared without pulling the whole
// chat-logic bundle in eagerly.

export const MAX_INPUT_HEIGHT_PX = 120;

export const CHAT_SHELL_HTML = `
  <div id="chat-panel" style="position: relative; font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; border: 1px solid var(--color-surface-border, #e5e7eb); background: var(--color-surface, #ffffff); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border-radius: 1rem; width: 340px; height: auto; min-width: 280px; min-height: 280px; max-width: min(90vw, 480px); max-height: min(85dvh, 640px, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 24px)); flex-direction: column; overflow: hidden; display: flex;">
    <div id="chat-resize-grip" title="Resize" style="position: absolute; top: 0; left: 0; width: 18px; height: 18px; cursor: nwse-resize; z-index: 1; display: flex; align-items: center; justify-content: center; opacity: 0.5;">
      <svg xmlns="http://www.w3.org/2000/svg" style="width: 10px; height: 10px;" viewBox="0 0 6 6" fill="none" stroke="currentColor">
        <path d="M1 5 5 1M3 5 5 3" stroke-width="1" stroke-linecap="round" />
      </svg>
    </div>
    <div id="chat-header" style="background: rgba(var(--primary-rgb, 37, 99, 235), 0.12); padding: 1rem; color: var(--color-primary, #2563eb); font-weight: bold; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; border-bottom: 1px solid var(--color-surface-border, #e5e7eb); touch-action: none; cursor: grab; user-select: none;">
      <div style="display: flex; align-items: center; gap: 0.5rem; min-width: 0;">
        <svg xmlns="http://www.w3.org/2000/svg" style="width: 1.15rem; height: 1.15rem; flex-shrink: 0;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span id="chat-title-label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></span>
      </div>
      <button id="close-chat-btn" style="background: transparent; border: none; color: var(--color-primary, #2563eb); font-size: 1.5rem; cursor: pointer; line-height: 1; padding: 0 0.25rem; font-weight: normal; opacity: 0.75; flex-shrink: 0;">&times;</button>
    </div>
    <div id="chat-messages" style="flex: 1; padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem; color: var(--color-text, #374151); background: var(--color-surface, #ffffff); box-sizing: border-box;">
      <div id="chat-loading-spinner" style="flex: 1; display: flex; align-items: center; justify-content: center;">
        <div style="width: 24px; height: 24px; border: 3px solid var(--color-surface-border, #e5e7eb); border-top-color: var(--color-primary, #2563eb); border-radius: 50%; animation: chat-spin 0.8s linear infinite;"></div>
      </div>
    </div>
    <div style="padding: 0.75rem; border-top: 1px solid var(--color-surface-border, #e5e7eb); display: flex; align-items: flex-end; gap: 0.5rem; background: var(--color-bg, #f9fafb); box-sizing: border-box;">
      <textarea id="chat-input" rows="1" style="flex: 1; resize: none; overflow-y: hidden; max-height: ${MAX_INPUT_HEIGHT_PX}px; padding: 0.5rem 0.75rem; border: 1px solid var(--color-surface-border, #d1d5db); border-radius: 0.5rem; font: inherit; font-size: 0.875rem; outline: none; background: var(--color-surface, #ffffff); color: var(--color-text, #000000); box-sizing: border-box;"></textarea>
      <button id="chat-send" style="flex-shrink: 0; background: var(--color-primary, #2563eb); color: #ffffff; width: 2.25rem; height: 2.25rem; border: none; border-radius: 0.5rem; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" style="width: 1.1rem; height: 1.1rem;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12 3.27 3.126A59.77 59.77 0 0121.485 12 59.77 59.77 0 013.27 20.876L6 12Zm0 0h7.5" />
        </svg>
      </button>
    </div>
  </div>
  <style>@keyframes chat-spin { to { transform: rotate(360deg); } }
    #chat-panel { transition: transform 0.25s ease; }
    #chat-panel.is-dragging { transition: none; }
  </style>
`;

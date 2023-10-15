// This module contains the background service worker to run commands via messages,
// using keyboard shortcuts or menu commands.
//
// Service workers: https://developer.chrome.com/docs/extensions/mv3/service_workers/
// Messaging: https://developer.chrome.com/docs/extensions/mv3/messaging/

import dmenu from './dmenu.js'
import { getSuggestions, activateSuggestion } from './suggestion_engine.js'
import optionsWorker from './options/service_worker.js'
import MostRecentlyUsedTabsManager from './most_recently_used_tabs_manager.js'

const mostRecentlyUsedTabsManager = new MostRecentlyUsedTabsManager

// Retrieve the default config.
const configPromise = fetch('config.json').then(response => response.json())

// Config for menu display.
const suggestionTypeDisplay = { openTab: 'Open tab', recentlyClosedTab: 'Recently closed', bookmark: 'Bookmark', history: 'History', download: 'Download' }
const DMENU_TEMPLATE = (item, index) => `${index} ${suggestionTypeDisplay[item.type]} ${item.title} ${item.url}`

// Handles the initial setup when the extension is first installed or updated to a new version.
// Reference: https://developer.chrome.com/docs/extensions/reference/runtime/#event-onInstalled
function onInstalled(details) {
  switch (details.reason) {
    case 'install':
      onInstall()
      break
    case 'update':
      onUpdate(details.previousVersion)
      break
  }
}

// Handles the initial setup when the extension is first installed.
async function onInstall() {
  const config = await configPromise
  await chrome.storage.sync.set(config)
}

// Handles the setup when the extension is updated to a new version.
async function onUpdate(previousVersion) {
  const config = await configPromise
  const options = await chrome.storage.sync.get()
  await chrome.storage.sync.set({ ...config, ...options })
}

// Handles option changes.
// Reference: https://developer.chrome.com/docs/extensions/reference/storage/#event-onChanged
function onOptionsChange(changes, areaName) {
  switch (areaName) {
    case 'local':
      Object.assign(dmenu, changes.dmenu.newValue)
      break
    case 'sync':
      Object.assign(dmenu, changes.dmenu.newValue)
      break
    case 'session':
      break
  }
}

// Handles the browser action on click.
// Reference: https://developer.chrome.com/docs/extensions/reference/action/#event-onClicked
async function onAction(tab) {
  const actionContext = {
    tab,
    mostRecentlyUsedTabsManager
  }
  const suggestions = await getSuggestions(actionContext)
  const selection = await dmenu.run(suggestions, DMENU_TEMPLATE)
  for (const suggestion of selection) {
    activateSuggestion(suggestion)
  }
}

// Handles long-lived connections.
// Uses the channel name to distinguish different types of connections.
// Reference: https://developer.chrome.com/docs/extensions/mv3/messaging/#connect
function onConnect(port) {
  switch (port.name) {
    case 'options':
      optionsWorker.onConnect(port)
      break
    default:
      port.postMessage({ type: 'error', message: `Unknown type of connection: ${port.name}` })
  }
}

// Configure dmenu.
chrome.storage.sync.get(options => Object.assign(dmenu, options.dmenu))

// Handles the service worker unloading, just before it goes dormant.
// This gives the extension an opportunity to save its current state.
// Reference: https://developer.chrome.com/docs/extensions/reference/runtime/#event-onSuspend
function onSuspend() {
  mostRecentlyUsedTabsManager.onSuspend()
}

// Handles tab activation, when the active tab in a window changes.
// Note window activation does not change the active tab.
// Reference: https://developer.chrome.com/docs/extensions/reference/tabs/#event-onActivated
function onTabActivated(activeInfo) {
  mostRecentlyUsedTabsManager.onTabActivated(activeInfo)
}

// Handles tab closing, when a tab is closed or a window is being closed.
// Reference: https://developer.chrome.com/docs/extensions/reference/tabs/#event-onRemoved
function onTabRemoved(tabId, removeInfo) {
  mostRecentlyUsedTabsManager.onTabRemoved(tabId, removeInfo)
}

// Handles window activation, when the currently focused window changes.
// Will be `WINDOW_ID_NONE` if all Chrome windows have lost focus.
// Note: On some window managers (e.g., Sway), `WINDOW_ID_NONE` will always be sent immediately preceding a switch from one Chrome window to another.
// Reference: https://developer.chrome.com/docs/extensions/reference/windows/#event-onFocusChanged
function onWindowFocusChanged(windowId) {
  mostRecentlyUsedTabsManager.onWindowFocusChanged(windowId)
}

// Set up listeners.
// Reference: https://developer.chrome.com/docs/extensions/mv3/service_workers/#listeners
chrome.runtime.onInstalled.addListener(onInstalled)
chrome.storage.onChanged.addListener(onOptionsChange)
chrome.action.onClicked.addListener(onAction)
chrome.runtime.onConnect.addListener(onConnect)
chrome.runtime.onSuspend.addListener(onSuspend)
chrome.tabs.onActivated.addListener(onTabActivated)
chrome.tabs.onRemoved.addListener(onTabRemoved)
chrome.windows.onFocusChanged.addListener(onWindowFocusChanged)
mostRecentlyUsedTabsManager.onStartup()

// This module contains the background service worker to run commands via messages,
// using keyboard shortcuts or menu commands.
//
// Service workers: https://developer.chrome.com/docs/extensions/mv3/service_workers/
// Messaging: https://developer.chrome.com/docs/extensions/mv3/messaging/

import dmenu from './dmenu.js'
import { getSuggestions, activateSuggestion } from './suggestion_engine.js'
import optionsWorker from './options/service_worker.js'

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
  Object.assign(dmenu, changes.dmenu.newValue)
}

// Handles the browser action on click.
// Reference: https://developer.chrome.com/docs/extensions/reference/action/#event-onClicked
async function onAction(tab) {
  const suggestions = await getSuggestions()
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

// Set up listeners.
// Reference: https://developer.chrome.com/docs/extensions/mv3/service_workers/#listeners
chrome.runtime.onInstalled.addListener(onInstalled)
chrome.storage.onChanged.addListener(onOptionsChange)
chrome.action.onClicked.addListener(onAction)
chrome.runtime.onConnect.addListener(onConnect)

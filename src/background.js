// This module contains the background service worker to run commands via messages,
// using keyboard shortcuts or menu commands.
//
// Service workers: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers
// Messaging: https://developer.chrome.com/docs/extensions/develop/concepts/messaging

/**
 * @typedef {object} Context
 * @property {chrome.tabs.Tab} tab
 * @property {RecentTabsManager} recentTabsManager
 */

import dmenu from './dmenu.js'

import {
  getSuggestions,
  activateSuggestion,
} from './suggestion_engine.js'

import optionsWorker from './options/service_worker.js'
import RecentTabsManager from './recent_tabs_manager.js'

const recentTabsManager = new RecentTabsManager

// Retrieve the default config.
const gettingDefaults = fetch('config.json')
  .then((response) => response.json())

// Config for menu display.
const suggestionTypeDisplay = {
  openTab: 'Open tab',
  recentlyClosedTab: 'Recently closed',
  bookmark: 'Bookmark',
  readingList: 'Reading list',
  history: 'History',
  download: 'Download'
}

/**
 * Template for dmenu.
 *
 * @param {Suggestion} item
 * @param {number} index
 * @returns {string}
 */
const DMENU_TEMPLATE = (item, index) => `${index} ${suggestionTypeDisplay[item.type]} ${item.title} ${item.url}`

/**
 * Handles the initial setup when the extension is first installed or updated to a new version.
 *
 * https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onInstalled
 *
 * @param {object} details
 * @returns {void}
 */
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

/**
 * Handles the initial setup when the extension is first installed.
 *
 * @returns {Promise<void>}
 */
async function onInstall() {
  const defaults = await gettingDefaults
  await chrome.storage.sync.set(defaults)
}

/**
 * Handles the setup when the extension is updated to a new version.
 *
 * @param {string} previousVersion
 * @returns {Promise<void>}
 */
async function onUpdate(previousVersion) {
  const defaults = await gettingDefaults
  const localStorage = await chrome.storage.sync.get()
  await chrome.storage.sync.set({
    ...defaults,
    ...localStorage
  })
}

/**
 * Handles option changes.
 *
 * https://developer.chrome.com/docs/extensions/reference/api/storage#event-onChanged
 *
 * @param {object} changes
 * @param {string} areaName
 * @returns {void}
 */
function onOptionsChange(changes, areaName) {
  switch (areaName) {
    case 'local':
    case 'sync':
      Object.assign(dmenu, changes.dmenu.newValue)
      break
  }
}

/**
 * Handles the browser action on click.
 *
 * https://developer.chrome.com/docs/extensions/reference/api/action#event-onClicked
 *
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<void>}
 */
async function onAction(tab) {
  const suggestions = await getSuggestions({
    tab,
    recentTabsManager
  })

  const selection = await dmenu.run(suggestions, DMENU_TEMPLATE)

  for (const suggestion of selection) {
    activateSuggestion(suggestion, {
      tab
    })
  }
}

/**
 * Handles long-lived connections.
 * Uses the channel name to distinguish different types of connections.
 *
 * https://developer.chrome.com/docs/extensions/develop/concepts/messaging#connect
 *
 * @param {chrome.runtime.Port} port
 * @returns {void}
 */
function onConnect(port) {
  switch (port.name) {
    case 'options':
      optionsWorker.onConnect(port)
      break

    default:
      port.postMessage({
        type: 'error',
        message: `Unknown type of connection: ${port.name}`
      })
  }
}

// Configure dmenu.
chrome.storage.sync.get((options) => Object.assign(dmenu, options.dmenu))

/**
 * Handles tab activation, when the active tab in a window changes.
 * Note window activation does not change the active tab.
 *
 * https://developer.chrome.com/docs/extensions/reference/api/tabs#event-onActivated
 *
 * @param {object} activeInfo
 * @returns {void}
 */
function onTabActivated(activeInfo) {
  recentTabsManager.onTabActivated(activeInfo)
}

/**
 * Handles tab closing, when a tab is closed or a window is being closed.
 *
 * https://developer.chrome.com/docs/extensions/reference/api/tabs#event-onRemoved
 *
 * @param {number} tabId
 * @param {object} removeInfo
 * @returns {void}
 */
function onTabRemoved(tabId, removeInfo) {
  recentTabsManager.onTabRemoved(tabId, removeInfo)
}

/**
 * Handles window activation, when the currently focused window changes.
 * Will be `WINDOW_ID_NONE` if all Chrome windows have lost focus.
 *
 * NOTE: On some window managers (e.g., Sway), `WINDOW_ID_NONE` is always
 * sent immediately preceding a switch from one Chrome window to another.
 *
 * https://developer.chrome.com/docs/extensions/reference/api/windows#event-onFocusChanged
 *
 * @param {number} windowId
 * @returns {void}
 */
function onWindowFocusChanged(windowId) {
  recentTabsManager.onWindowFocusChanged(windowId)
}

// Set up listeners.
// https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/events
chrome.runtime.onInstalled.addListener(onInstalled)
chrome.storage.onChanged.addListener(onOptionsChange)
chrome.action.onClicked.addListener(onAction)
chrome.runtime.onConnect.addListener(onConnect)
chrome.tabs.onActivated.addListener(onTabActivated)
chrome.tabs.onRemoved.addListener(onTabRemoved)
chrome.windows.onFocusChanged.addListener(onWindowFocusChanged)
recentTabsManager.onStartup()

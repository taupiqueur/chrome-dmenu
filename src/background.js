// This module contains the background service worker to run commands via messages,
// using keyboard shortcuts or menu commands.
//
// Service workers: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers
// Messaging: https://developer.chrome.com/docs/extensions/develop/concepts/messaging

import dmenu from './dmenu.js'

import optionsWorker from './options/service_worker.js'
import manualWorker from './manual/service_worker.js'
import RecentTabsManager from './recent_tabs_manager.js'
import SuggestionEngine, { SuggestionType } from './suggestion_engine/suggestion_engine.js'

const { TAB_GROUP_ID_NONE } = chrome.tabGroups

const recentTabsManager = new RecentTabsManager

const suggestionEngine = new SuggestionEngine({
  recentTabsManager
})

// Config for menu display.
const suggestionLabels = new Map([
  [SuggestionType.OpenTab, 'OPEN_TAB'],
  [SuggestionType.ClosedTab, 'RECENTLY_CLOSED'],
  [SuggestionType.SyncedTab, 'SYNCED_TAB'],
  [SuggestionType.Bookmark, 'BOOKMARK'],
  [SuggestionType.ReadingList, 'READING_LIST'],
  [SuggestionType.History, 'RECENTLY_VISITED'],
  [SuggestionType.Download, 'DOWNLOAD'],
  [SuggestionType.Extension, 'EXTENSION'],
])

/**
 * Template for dmenu.
 *
 * @param {Suggestion} item
 * @param {number} index
 * @param {number} digitCount
 * @returns {string}
 */
const DMENU_TEMPLATE = (item, index, digitCount) => `${index.toString().padStart(digitCount, '0')} ${suggestionLabels.get(item.type)} ${item.title} ${item.url}`

/**
 * Adds items to the browser’s context menu.
 *
 * https://developer.chrome.com/docs/extensions/reference/api/contextMenus
 *
 * @returns {void}
 */
function createMenuItems() {
  chrome.contextMenus.create({
    id: 'open_documentation',
    title: 'Documentation',
    contexts: ['action']
  })

  chrome.contextMenus.create({
    id: 'open_support_chat',
    title: 'Support Chat',
    contexts: ['action']
  })

  chrome.contextMenus.create({
    id: 'open_sponsorship_page',
    title: 'Sponsor this project',
    contexts: ['action']
  })

  chrome.contextMenus.create({
    id: 'copy_debug_info',
    title: 'Copy debug info',
    contexts: ['action']
  })
}

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
  createMenuItems()
  recentTabsManager.onInstalled(details)
}

/**
 * Handles the initial setup when the extension is first installed.
 *
 * @returns {Promise<void>}
 */
async function onInstall() {
  const defaults = await optionsWorker.getDefaults()
  await chrome.storage.sync.set(defaults)
  await chrome.tabs.create({
    active: true,
    url: 'src/manual/manual.html'
  })
}

/**
 * Handles the setup when the extension is updated to a new version.
 *
 * @param {string} previousVersion
 * @returns {Promise<void>}
 */
async function onUpdate(previousVersion) {
  const defaults = await optionsWorker.getDefaults()
  const localStorage = await chrome.storage.sync.get()
  await chrome.storage.sync.set({
    ...defaults,
    ...localStorage
  })
}

/**
 * Handles startup when a profile is started
 * (e.g., when the browser first starts up).
 *
 * https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onStartup
 *
 * @returns {void}
 */
function onStartup() {
  recentTabsManager.onStartup()
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
  const suggestions = await suggestionEngine.search({
    mode: 'combined',
    query: ''
  })
  const selection = await dmenu.run(suggestions, DMENU_TEMPLATE)

  await Promise.all(
    selection.map((suggestion) =>
      suggestionEngine.activate(suggestion, tab)
    )
  )
}

/**
 * Handles the context menu on click.
 *
 * https://developer.chrome.com/docs/extensions/reference/api/contextMenus#event-onClicked
 *
 * @param {chrome.contextMenus.OnClickData} info
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<void>}
 */
async function onMenuItemClicked(info, tab) {
  switch (info.menuItemId) {
    case 'open_documentation':
      openNewTab({
        active: true,
        url: 'src/manual/manual.html',
        openerTabId: tab.id,
      })
      break

    case 'open_support_chat':
      openNewTab({
        active: true,
        url: 'https://web.libera.chat/gamja/#taupiqueur',
        openerTabId: tab.id,
      })
      break

    case 'open_sponsorship_page':
      openNewTab({
        active: true,
        url: 'https://github.com/sponsors/taupiqueur',
        openerTabId: tab.id,
      })
      break

    case 'copy_debug_info': {
      const debugInfo = await getDebugInfo()

      await chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        func: (text) => {
          return navigator.clipboard.writeText(text)
        },
        args: [
          JSON.stringify(debugInfo, null, 2)
        ]
      })
      break
    }
  }
}

/**
 * Opens a new tab to the right.
 *
 * @param {object} createProperties
 * @param {boolean} createProperties.active
 * @param {string} createProperties.url
 * @param {number} createProperties.openerTabId
 * @returns {Promise<void>}
 */
async function openNewTab({
  active,
  url,
  openerTabId,
}) {
  const openerTab = await chrome.tabs.get(openerTabId)
  const createdTab = await chrome.tabs.create({
    active,
    url,
    index: openerTab.index + 1,
    openerTabId,
    windowId: openerTab.windowId
  })

  if (openerTab.groupId !== TAB_GROUP_ID_NONE) {
    await chrome.tabs.group({
      groupId: openerTab.groupId,
      tabIds: [
        createdTab.id
      ]
    })
  }
}

/**
 * Returns debug info.
 *
 * https://github.com/lydell/LinkHints/blob/main/src/popup/Program.tsx
 *
 * @typedef {object} DebugInfo
 * @property {string} version
 * @property {string} userAgent
 * @property {chrome.runtime.PlatformInfo} platformInfo
 * @property {object} syncStorage
 * @property {object} localStorage
 * @property {object} sessionStorage
 * @property {string} language
 *
 * @returns {Promise<DebugInfo>}
 */
async function getDebugInfo() {
  const manifest = chrome.runtime.getManifest()

  const [
    platformInfo,
    syncStorage,
    localStorage,
    sessionStorage,
  ] = await Promise.all([
    chrome.runtime.getPlatformInfo(),
    chrome.storage.sync.get(),
    chrome.storage.local.get(),
    chrome.storage.session.get(),
  ])

  return {
    version: manifest.version,
    userAgent: navigator.userAgent,
    platformInfo,
    syncStorage,
    localStorage,
    sessionStorage,
    language: navigator.language,
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

    case 'manual':
      manualWorker.onConnect(port)
      break

    default:
      port.postMessage({
        type: 'error',
        message: `Unknown type of connection: ${port.name}`
      })
  }
}

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
 * Handles tab replacement, when a tab is replaced with another tab due to pre-rendering or instant.
 *
 * https://developer.chrome.com/docs/extensions/reference/api/tabs#event-onReplaced
 *
 * @param {number} addedTabId
 * @param {number} removedTabId
 * @returns {void}
 */
function onTabReplaced(addedTabId, removedTabId) {
  recentTabsManager.onTabReplaced(addedTabId, removedTabId)
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

// Configure dmenu.
chrome.storage.sync.get((options) => {
  Object.assign(dmenu, options.dmenu)
})

recentTabsManager.restoreState()

// Set up listeners.
// https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/events
chrome.runtime.onInstalled.addListener(onInstalled)
chrome.runtime.onStartup.addListener(onStartup)
chrome.storage.onChanged.addListener(onOptionsChange)
chrome.action.onClicked.addListener(onAction)
chrome.contextMenus.onClicked.addListener(onMenuItemClicked)
chrome.runtime.onConnect.addListener(onConnect)
chrome.tabs.onActivated.addListener(onTabActivated)
chrome.tabs.onRemoved.addListener(onTabRemoved)
chrome.tabs.onReplaced.addListener(onTabReplaced)
chrome.windows.onFocusChanged.addListener(onWindowFocusChanged)

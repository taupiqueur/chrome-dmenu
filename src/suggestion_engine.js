// This module contains the suggestion engine.

import { getOpenTabSuggestions, getRecentlyClosedTabSuggestions, getBookmarkSuggestions, getHistorySuggestions, getDownloadSuggestions } from './suggestion_providers.js'

export async function getSuggestions() {
  const suggestionResults = await Promise.all([
    getOpenTabSuggestions(),
    getRecentlyClosedTabSuggestions(),
    getBookmarkSuggestions(),
    getHistorySuggestions(),
    getDownloadSuggestions()
  ])
  return suggestionResults.flat()
}

export async function activateSuggestion(suggestion) {
  switch (suggestion.type) {
    case 'openTab':
      await chrome.tabs.update(suggestion.tabId, { active: true })
      await chrome.windows.update(suggestion.windowId, { focused: true })
      break
    case 'recentlyClosedTab':
      await chrome.sessions.restore(suggestion.sessionId)
      break
    case 'bookmark':
      await openNewTabRight({ url: suggestion.url })
      break
    case 'history':
      await openNewTabRight({ url: suggestion.url })
      break
    case 'download':
      await chrome.downloads.show(suggestion.downloadId)
      break
    default:
      console.error(
        `Activation not yet implemented for suggestions of type: ${suggestion.type}.`
      )
  }
}

// Opens and activates a new tab to the right.
async function openNewTabRight(createProperties) {
  const [openerTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  const createdTab = await chrome.tabs.create({ active: true, index: openerTab.index + 1, openerTabId: openerTab.id, ...createProperties })

  // Add the new tab to the opener tab’s group, if it has one.
  if (openerTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
    await chrome.tabs.group({ tabIds: [createdTab.id], groupId: openerTab.groupId })
  }
}

// This module contains the suggestion engine.

import {
  getOpenTabSuggestions,
  getRecentlyClosedTabSuggestions,
  getSyncedTabSuggestions,
  getBookmarkSuggestions,
  getReadingListSuggestions,
  getRecentlyVisitedPageSuggestions,
  getDownloadSuggestions,
} from './suggestion_providers.js'

/**
 * @typedef {OpenTabSuggestion | ClosedTabSuggestion | BookmarkSuggestion | ReadingListSuggestion | HistorySuggestion | DownloadSuggestion} Suggestion
 */

const { TAB_GROUP_ID_NONE } = chrome.tabGroups

// Enum representing a suggestion type.
export const SuggestionType = {
  OpenTab: 'openTab',
  ClosedTab: 'closedTab',
  SyncedTab: 'syncedTab',
  Bookmark: 'bookmark',
  ReadingList: 'readingList',
  History: 'history',
  Download: 'download',
}

// Constant representing the list of all suggestion functions.
const SUGGESTION_FUNCTIONS = [
  getOpenTabSuggestions,
  getRecentlyClosedTabSuggestions,
  getSyncedTabSuggestions,
  getBookmarkSuggestions,
  getReadingListSuggestions,
  getRecentlyVisitedPageSuggestions,
  getDownloadSuggestions
]

/**
 * Retrieves suggestions.
 *
 * @param {Context} cx
 * @returns {Promise<Suggestion[]>}
 */
export async function getSuggestions(cx) {
  const suggestionResults = await Promise.all(
    SUGGESTION_FUNCTIONS.map(
      (getSuggestions) => getSuggestions(cx)
    )
  )
  return suggestionResults.flat()
}

/**
 * Activates a given suggestion.
 *
 * @param {Suggestion} suggestion
 * @param {Context} cx
 * @returns {Promise<void>}
 */
export async function activateSuggestion(suggestion, cx) {
  switch (suggestion.type) {
    case SuggestionType.OpenTab:
      await chrome.tabs.update(suggestion.tabId, {
        active: true
      })
      await chrome.windows.update(suggestion.windowId, {
        focused: true
      })
      break

    case SuggestionType.ClosedTab:
      await chrome.sessions.restore(suggestion.sessionId)
      break

    case SuggestionType.SyncedTab:
      await chrome.sessions.restore(suggestion.sessionId)
      break

    case SuggestionType.Bookmark:
      await openNewTabRight(cx, suggestion.url)
      break

    case SuggestionType.ReadingList:
      await openNewTabRight(cx, suggestion.url)
      break

    case SuggestionType.History:
      await openNewTabRight(cx, suggestion.url)
      break

    case SuggestionType.Download:
      await chrome.downloads.show(suggestion.downloadId)
      break

    default:
      console.error(
        'Activation not yet implemented for suggestions of type: "%s"',
        suggestion.type
      )
  }
}

/**
 * Opens and activates a new tab to the right.
 *
 * @param {Context} cx
 * @param {string} url
 * @returns {Promise<void>}
 */
async function openNewTabRight(cx, url) {
  const createdTab = await chrome.tabs.create({
    active: true,
    url,
    index: cx.tab.index + 1,
    openerTabId: cx.tab.id,
    windowId: cx.tab.windowId
  })

  if (cx.tab.groupId !== TAB_GROUP_ID_NONE) {
    await chrome.tabs.group({
      groupId: cx.tab.groupId,
      tabIds: [
        createdTab.id
      ]
    })
  }
}

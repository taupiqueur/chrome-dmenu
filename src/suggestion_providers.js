// This module contains suggestion providers.

// Open tab suggestions --------------------------------------------------------

/**
 * @typedef {object} OpenTabSuggestion
 * @property {"openTab"} type
 * @property {number} tabId
 * @property {number} windowId
 * @property {string} title
 * @property {string} url
 */

/**
 * Creates a new open tab suggestion.
 *
 * @param {chrome.tabs.Tab} tab
 * @returns {OpenTabSuggestion}
 */
const newOpenTabSuggestion = tab => ({
  type: 'openTab',
  tabId: tab.id,
  windowId: tab.windowId,
  title: tab.title,
  url: tab.url
})

/**
 * Retrieves open tab suggestions.
 * Results are ordered by recency and
 * the current tab is not included.
 *
 * @param {Context} cx
 * @returns {Promise<OpenTabSuggestion[]>}
 */
export async function getOpenTabSuggestions(cx) {
  const tabs = await chrome.tabs.query({})

  const tabIds = cx.recentTabsManager.getRecentTabs()

  const tabIndexMap = new Map(
    tabIds.map((tabId, index) => [
      tabId, index
    ])
  )

  const sortedTabs = tabs.toSorted((tab, otherTab) =>
    (tabIndexMap.get(tab.id) ?? -1) - (tabIndexMap.get(otherTab.id) ?? -1)
  )

  // This is a cheap means to exclude the current tab.
  if (sortedTabs[0].id === cx.tab.id) {
    sortedTabs.shift()
  }

  return sortedTabs.map(newOpenTabSuggestion)
}

// Closed tab suggestions ------------------------------------------------------

/**
 * @typedef {object} RecentlyClosedTabSuggestion
 * @property {"recentlyClosedTab"} type
 * @property {number} sessionId
 * @property {string} title
 * @property {string} url
 */

/**
 * Creates a new recently closed tab suggestion.
 *
 * @param {chrome.sessions.Session} tabSession
 * @returns {RecentlyClosedTabSuggestion}
 */
const newRecentlyClosedTabSuggestion = tabSession => ({
  type: 'recentlyClosedTab',
  sessionId: tabSession.tab.sessionId,
  title: tabSession.tab.title,
  url: tabSession.tab.url
})

/**
 * Retrieves recently closed tab suggestions.
 *
 * @param {Context} cx
 * @returns {Promise<RecentlyClosedTabSuggestion[]>}
 */
export async function getRecentlyClosedTabSuggestions(cx) {
  const sessions = await chrome.sessions.getRecentlyClosed()
  const suggestions = []
  for (const session of sessions) {
    switch (true) {
      case 'tab' in session:
        suggestions.push(
          newRecentlyClosedTabSuggestion(session)
        )
        break

      case 'window' in session:
        const { lastModified } = session
        for (const tab of session.window.tabs) {
          suggestions.push(
            newRecentlyClosedTabSuggestion({
              tab,
              lastModified
            })
          )
        }
        break
    }
  }
  return suggestions
}

// Bookmark suggestions --------------------------------------------------------

/**
 * @typedef {object} BookmarkSuggestion
 * @property {"bookmark"} type
 * @property {string} title
 * @property {string} url
 */

/**
 * Creates a new bookmark suggestion.
 *
 * @param {chrome.bookmarks.BookmarkTreeNode} bookmark
 * @returns {BookmarkSuggestion}
 */
const newBookmarkSuggestion = bookmark => ({
  type: 'bookmark',
  title: bookmark.title,
  url: bookmark.url
})

/**
 * Retrieves bookmark suggestions.
 *
 * @param {Context} cx
 * @returns {Promise<BookmarkSuggestion[]>}
 */
export async function getBookmarkSuggestions(cx) {
  const bookmarks = await chrome.bookmarks.search({})
  return bookmarks
    .filter((bookmark) => bookmark.url)
    .map(newBookmarkSuggestion)
}

// Reading list suggestions ----------------------------------------------------

/**
 * @typedef {object} ReadingListSuggestion
 * @property {"readingList"} type
 * @property {string} title
 * @property {string} url
 */

/**
 * Creates a new reading list suggestion.
 *
 * @param {chrome.readingList.ReadingListEntry} item
 * @returns {ReadingListSuggestion}
 */
const newReadingListSuggestion = item => ({
  type: 'readingList',
  title: item.title,
  url: item.url
})

/**
 * Retrieves reading list suggestions.
 *
 * @param {Context} cx
 * @returns {Promise<ReadingListSuggestion[]>}
 */
export async function getReadingListSuggestions(cx) {
  const items = await chrome.readingList.query({})
  return items.map(newReadingListSuggestion)
}

// History suggestions ---------------------------------------------------------

/**
 * @typedef {object} HistorySuggestion
 * @property {"history"} type
 * @property {string} title
 * @property {string} url
 */

/**
 * Creates a new history suggestion.
 *
 * @param {chrome.history.HistoryItem} historyItem
 * @returns {HistorySuggestion}
 */
const newHistorySuggestion = historyItem => ({
  type: 'history',
  title: historyItem.title,
  url: historyItem.url
})

/**
 * Retrieves history suggestions.
 *
 * @param {Context} cx
 * @returns {Promise<HistorySuggestion[]>}
 */
export async function getHistorySuggestions(cx) {
  const historyItems = await chrome.history.search({
    text: ''
  })
  return historyItems.map(newHistorySuggestion)
}

// Download suggestions --------------------------------------------------------

/**
 * @typedef {object} DownloadSuggestion
 * @property {"download"} type
 * @property {number} downloadId
 * @property {string} title
 * @property {string} url
 */

/**
 * Creates a new download suggestion.
 *
 * @param {chrome.downloads.DownloadItem} downloadItem
 * @returns {DownloadSuggestion}
 */
const newDownloadSuggestion = downloadItem => ({
  type: 'download',
  downloadId: downloadItem.id,
  title: downloadItem.filename.substring(downloadItem.filename.lastIndexOf('/') + 1),
  url: downloadItem.finalUrl
})

/**
 * Retrieves download suggestions.
 *
 * @param {Context} cx
 * @returns {Promise<DownloadSuggestion[]>}
 */
export async function getDownloadSuggestions(cx) {
  const downloadItems = await chrome.downloads.search({
    state: 'complete',
    exists: true
  })
  return downloadItems.map(newDownloadSuggestion)
}

// This module contains suggestion providers.

// Open tab suggestions --------------------------------------------------------

const newOpenTabSuggestion = tab => ({
  type: 'openTab',
  tabId: tab.id,
  windowId: tab.windowId,
  title: tab.title,
  url: tab.url
})

export async function getOpenTabSuggestions(context) {
  const { tab, mostRecentlyUsedTabsManager } = context

  const tabIds = mostRecentlyUsedTabsManager.getMostRecentTabs()

  // Map tab IDs to their position in the list of recent tabs.
  const tabIdToPosition = new Map(
    tabIds.map((tabId, position) => [
      tabId, position
    ])
  )

  const tabs = await chrome.tabs.query({})

  // Sort tabs by most recently used.
  tabs.sort((tab, otherTab) => {
    const tabIndex = tabIdToPosition.get(tab.id) ?? -1
    const otherTabIndex = tabIdToPosition.get(otherTab.id) ?? -1
    return tabIndex - otherTabIndex
  })

  // Exclude the current tab.
  if (tabs[0].id === tab.id) {
    tabs.shift()
  }

  return tabs.map(newOpenTabSuggestion)
}

// Closed tab suggestions ------------------------------------------------------

const newRecentlyClosedTabSuggestion = tabSession => ({
  type: 'recentlyClosedTab',
  sessionId: tabSession.tab.sessionId,
  title: tabSession.tab.title,
  url: tabSession.tab.url
})

export async function getRecentlyClosedTabSuggestions(context) {
  const sessions = await chrome.sessions.getRecentlyClosed()
  const suggestions = []
  for (const session of sessions) {
    switch (true) {
      case 'tab' in session:
        suggestions.push(newRecentlyClosedTabSuggestion(session))
        break

      case 'window' in session:
        const { lastModified } = session
        for (const tab of session.window.tabs) {
          suggestions.push(newRecentlyClosedTabSuggestion({ tab, lastModified }))
        }
        break
    }
  }
  return suggestions
}

// Bookmark suggestions --------------------------------------------------------

const newBookmarkSuggestion = bookmark => ({
  type: 'bookmark',
  title: bookmark.title,
  url: bookmark.url
})

export async function getBookmarkSuggestions(context) {
  const bookmarks = await chrome.bookmarks.search({})
  return bookmarks.map(newBookmarkSuggestion)
}

// History suggestions ---------------------------------------------------------

const newHistorySuggestion = historyItem => ({
  type: 'history',
  title: historyItem.title,
  url: historyItem.url
})

export async function getHistorySuggestions(context) {
  const historyItems = await chrome.history.search({ text: '' })
  return historyItems.map(newHistorySuggestion)
}

// Download suggestions --------------------------------------------------------

const newDownloadSuggestion = downloadItem => ({
  type: 'download',
  downloadId: downloadItem.id,
  title: downloadItem.filename.substring(downloadItem.filename.lastIndexOf('/') + 1),
  url: downloadItem.finalUrl
})

export async function getDownloadSuggestions(context) {
  const downloadItems = await chrome.downloads.search({ state: 'complete', exists: true })
  return downloadItems.map(newDownloadSuggestion)
}

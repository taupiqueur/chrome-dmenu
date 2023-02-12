// This module contains suggestion providers.

// Open tab suggestions --------------------------------------------------------

const newOpenTabSuggestion = tab => ({
  type: 'openTab',
  tabId: tab.id,
  windowId: tab.windowId,
  title: tab.title,
  url: tab.url
})

export async function getOpenTabSuggestions() {
  const tabs = await chrome.tabs.query({})
  return tabs.map(newOpenTabSuggestion)
}

// Closed tab suggestions ------------------------------------------------------

const newRecentlyClosedTabSuggestion = tabSession => ({
  type: 'recentlyClosedTab',
  sessionId: tabSession.tab.sessionId,
  title: tabSession.tab.title,
  url: tabSession.tab.url
})

export async function getRecentlyClosedTabSuggestions() {
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

export async function getBookmarkSuggestions() {
  const bookmarks = await chrome.bookmarks.search({})
  return bookmarks.map(newBookmarkSuggestion)
}

// History suggestions ---------------------------------------------------------

const newHistorySuggestion = historyItem => ({
  type: 'history',
  title: historyItem.title,
  url: historyItem.url
})

export async function getHistorySuggestions() {
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

export async function getDownloadSuggestions() {
  const downloadItems = await chrome.downloads.search({ state: 'complete', exists: true })
  return downloadItems.map(newDownloadSuggestion)
}

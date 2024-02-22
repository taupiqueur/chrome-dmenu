// This module provides the functionality to search items
// with a dynamic menu program—such as dmenu.

import '../@types/chrome_shell.js'

/**
 * Pipes items through the given external filter program.
 * Returns a list of matching items.
 *
 * @template Item
 * @param {string} command
 * @param {string[]} args
 * @param {Item[]} items
 * @param {(item: Item, index: number) => string} template
 * @returns {Promise<Item[]>}
 */
export async function dmenu(command, args, items, template) {
  const menu = new Map(
    items.map((item, index) => [template(item, index), item])
  )

  const input = Array.from(menu.keys()).join('\n')

  /**
   * @type {CommandResult}
   */
  const result = await chrome.runtime.sendNativeMessage('shell', {
    command,
    args,
    input,
    output: true
  })

  const keys = result.output.split('\n')

  return keys
    .filter((key) => menu.has(key))
    .map((key) => menu.get(key))
}

export default {
  command: 'dmenu',
  args: [],
  run(items, template) {
    return dmenu(this.command, this.args, items, template)
  }
}

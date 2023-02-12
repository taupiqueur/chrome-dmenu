// Pipes items through the given external filter program.
// Returns a list of matching items.
export async function dmenu(command, args, items, template) {
  const menu = new Map(
    items.map((item, index) => [template(item, index), item])
  )
  const input = Array.from(menu.keys()).join('\n')
  const result = await chrome.runtime.sendNativeMessage('shell', {
    command,
    args,
    input,
    output: true
  })
  const keys = result.output.split('\n')
  const selection = keys.filter(key => menu.has(key)).map(key => menu.get(key))

  return selection
}

export default {
  command: 'dmenu',
  args: [],
  run(items, template) {
    return dmenu(this.command, this.args, items, template)
  }
}

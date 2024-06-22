# Manual

## Post-installation instructions

Requires [chrome-shell] for running shell commands.

[chrome-shell]: https://github.com/taupiqueur/chrome-shell

### Allow native messaging with the shell application

Copy the extension ID and run the following in your terminal.

```
chrome-shell install [--target=<platform>] [<extension-id>...]
```

Possible targets are `chrome`, `chrome-dev`, `chrome-beta`, `chrome-canary` and `chromium`.

## Usage

`Alt+Space` (`Ctrl+Space` on Windows) is the main keyboard shortcut.

Use it to search and activate suggestions.

### Configure keyboard shortcuts

Navigate to `chrome://extensions/shortcuts` to configure keyboard shortcuts.

### Configure the dynamic menu program

You can also configure the dynamic menu program by importing and exporting settings
in the “Options” page—Right-click the dmenu toolbar button and select “Options”.

Example configuration:

``` json
{
  "dmenu": {
    "command": "dmenu",
    "args": []
  }
}
```

``` json
{
  "dmenu": {
    "command": "sh",
    "args": [
      "-c",
      "cat > /tmp/stdin && alacritty -e sh -c 'fzy -l max -q \"OPEN_TAB \" < /tmp/stdin > /tmp/stdout' && [ -s /tmp/stdout ] && cat /tmp/stdout"
    ]
  }
}
```

Make sure the commands are in your `PATH`.

On macOS, you can set the `PATH` environment variable for all services through [launchctl].

``` sh
sudo launchctl config user path "$PATH"
```

[launchctl]: https://ss64.com/osx/launchctl.html

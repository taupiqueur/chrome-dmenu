# Manual

## Usage

`Alt+Space` (`Ctrl+Space` on Windows) is the main keyboard shortcut.

Use it to search and activate suggestions.

### Configure keyboard shortcuts

Navigate to `chrome://extensions/shortcuts` to configure keyboard shortcuts.

### Configure the dynamic menu program

You can also configure the dynamic menu program by importing and exporting settings
in the **Options** page—Right-click the dmenu toolbar button and select **Options**.

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
      "cat > /tmp/stdin && alacritty -e sh -c 'fzy < /tmp/stdin > /tmp/stdout' && [ -s /tmp/stdout ] && cat /tmp/stdout"
    ]
  }
}
```

# Custom Maximized Geometry (KWin Script)

A KWin script for KDE Plasma 6 that enforces a custom window geometry threshold of **1920x980** at **(0, 30)** for maximized windows and newly created windows.

## Features
- **Custom Maximize Target**: Maximized windows fill a precise 1920x980 resolution placed at position (0, 30).
- **Initial Window Placement Bounds**: Constrains newly created windows so they spawn within the safe 1920x980 threshold above the dock.
- **Unconstrained Manual Movement**: Users can freely drag, move, and resize floating windows anywhere on screen (including below the dock), similar to macOS dock behavior.
- **State Restoring**: Smoothly restores windows to their previous floating size and position when unmaximized.
- **Dynamic Enforcement**: Automatically handles window creation, maximization state transitions, and monitor resolution changes.

## Installation

### Manual Installation
Copy or symlink this directory to `~/.local/share/kwin/scripts/custom-maximized-geometry`:

```bash
mkdir -p ~/.local/share/kwin/scripts/
git clone https://github.com/Edywxz/custom-maximized-geometry.git ~/.local/share/kwin/scripts/custom-maximized-geometry
```

Enable the script in **System Settings > Window Management > KWin Scripts** or via CLI:

```bash
kpackagetool6 --type=KWin/Script --install ~/.local/share/kwin/scripts/custom-maximized-geometry
```

To enable via DBus:
```bash
qdbus org.kde.KWin /Scripting loadScript "$PWD/contents/code/main.js" "custom-maximized-geometry"
qdbus org.kde.KWin /Scripting start
```

## License
GPLv3

# Custom Maximized Geometry (KWin Script)

A KWin script for KDE Plasma 6 that enforces a custom window geometry threshold (default **1920x980** at **0, 30**) for maximized windows and newly created windows, with comprehensive window filtering support.

## Features
- **Custom Maximize Target**: Maximized windows fill a precise resolution (default 1920x980) placed at position (0, 30).
- **GUI Configuration Menu**: Configure blacklist/whitelist filters and target dimensions directly inside KDE Plasma System Settings.
- **Window Filtering**:
  - **Blacklist**: Exclude specific applications/windows (by class name, binary name, desktop ID, or window title). Pre-configured with **Spectacle** (`org.kde.spectacle, spectacle, Spectacle`) so screenshot tools can capture the full screen.
  - **Whitelist**: Optionally restrict script logic to only specified apps/windows.
- **Initial Window Placement Bounds**: Constrains newly created windows so they spawn within the safe threshold above the dock.
- **Unconstrained Manual Movement**: Users can freely drag, move, and resize floating windows anywhere on screen (including below the dock), similar to macOS dock behavior.
- **State Restoring**: Smoothly restores windows to their previous floating size and position when unmaximized.
- **Dynamic Enforcement**: Automatically handles window creation, maximization state transitions, and monitor resolution changes.

## Configuration

You can customize the script via the graphical configuration dialog:
1. Open **System Settings** > **Window Management** > **KWin Scripts**.
2. Click the **Configure** (gear icon) next to **Custom Maximized Geometry**.

### Available Options
- **Blacklist**: Comma-separated list of window classes, app names, desktop file IDs, or titles to ignore.
  - Default: `org.kde.spectacle, spectacle, Spectacle`
- **Whitelist**: Comma-separated list of allowed windows. If left empty, all non-blacklisted windows are processed.
- **Target X / Y**: Custom coordinates for maximized windows (Default: `0`, `30`).
- **Target Width / Height**: Custom dimensions for maximized windows (Default: `1920`, `980`).
- **Clamp Initial Bounds**: Enable or disable constraining initial window dimensions upon creation (Default: `Enabled`).

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

To reload or re-enable via DBus:
```bash
qdbus org.kde.KWin /KWin reconfigure
```

## License
GPLv3

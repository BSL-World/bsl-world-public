# Local Windows single-instance fix

Based on tauri-plugin-single-instance 2.4.3 (original licenses retained).

Windows previously continued application startup if the named mutex existed but
FindWindowW could not yet find the owner's IPC window. Two launches in the same
second can reach precisely this interval. Wait up to two seconds for IPC and
always exit the secondary process. Bound IPC delivery to avoid hanging on an
unresponsive owner. Treat mutex and IPC-window creation failures as setup errors.
The mutex and window names remain compatible with previously installed builds.

The application registers this plugin before updater and other plugins.

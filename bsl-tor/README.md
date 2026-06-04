# BSL Tor Installer (BSL — Beautiful Sober Life)

**A native Windows installer that deploys the Tor Expert Bundle as a silent system service, complete with pluggable transports and a simple, beautiful GUI for bridge management.**

---

## My Story

Hi, I’m Alexander. I’m an engineer, and I’m an alcoholic who chose life.

Back in the early 2000s, I stumbled upon the Tor Browser in a weekly tech magazine called *Upgrade*. The idea of truly private browsing fascinated me. Fast forward to 2026: I’ve been sober for over a year, and my brain finally works as an ally, not an enemy. I started thinking: *The Tor Browser works because it creates a local proxy. Could I turn that proxy into a Windows service and use it for any program, not just the browser?* That was it — the idea of “Tor Browser as a Windows service” took hold, and I had to find out if it was possible.

So I asked DeepSeek — was it even possible? And if so, how? DeepSeek confirmed my hope and gave me a clear, working path: download the Tor Expert Bundle, place it on the disk, and use `sc create` to register `tor.exe` as a Windows service. The bundle already includes the `torrc` configuration file, so I just had to fill it with actual bridge lines obtained from a Telegram bot.

The service ran, the proxy worked. As a result, the blocked Telegram was alive again, and any browser configured to use the Tor proxy could freely open any "sanctioned" website. But explaining this whole process to friends who are light-years away from IT — *"Open a command prompt as administrator, run this `sc create` command with a bunch of parameters, find the file called torrc, open it in Notepad, paste these specific bridge lines inside..."* — that was a genuine nightmare.

That’s how BSL Tor was born — a clean, architecture-first installer that deploys Tor as a background Windows service and gives you a gorgeous, starfield-themed window to easily manage your bridges. The program features a user-friendly GUI that makes adding new bridges straightforward — no need to worry about the correct file format or manually adding the word "Bridge" to each line.

Built with Tauri + Rust by a non-programmer — just a system administrator who didn't even know what Tauri or Electron were. Someone who simply wanted to solve a real problem.

---

## What This Tool Does

1.  **Installs Tor as a proper Windows system service** — no console windows, no manual `sc create` commands. It just runs silently in the background.
2.  **Provides a beautiful GUI for bridge management** — paste your bridge lines (from Telegram, email, or anywhere), click “Update Bridges”, and the service is automatically reconfigured and restarted.
3.  **Keeps your real IP for trusted apps** — only the applications you explicitly configure to use SOCKS5 proxy (`127.0.0.1:9050`) will go through Tor. Everything else stays on your normal connection.

No virtual network adapters. No “please disable your VPN” messages from banks. Just a clean, surgical proxy service.

---

## How to Use

1.  **[Download the latest installer](https://gitverse.ru/BSL-World/bsl-world)** (the `.exe` file).
2.  Run it. The installer will request administrator rights (required to install the service).
3.  Once installed, launch **BSL Tor** from the Start Menu. You’ll see a starfield window.
4.  Get your bridges. The quickest and easiest way is the Telegram bot [@TorBridges_bot](https://t.me/TorBridges_bot). If Telegram is unavailable, send an email from Gmail to `bridges@torproject.org` with the subject **`get transport obfs4`**. The bot will reply with working bridges.
5.  Copy the bridge lines, paste them into the window, and click **Update Bridges**.
6.  Done! Configure your browser or messenger to use SOCKS5 proxy at `127.0.0.1:9050`.
7.  To check if Tor has fully bootstrapped, open `C:\Tor\notice.log`. The most rewarding line you'll find there is:  
    `[notice] Bootstrapped 100% (done): Done`

---

## Support the Project

This tool is a labor of love, built by one person on a journey of recovery. If it helped you, consider supporting its development.

*   **Russian users:** [CloudTips](https://pay.cloudtips.ru/p/5bea09f2)
*   **International users:** Cryptocurrency is the only way I can currently accept donations from abroad.

    *   **BTC:** `bc1q3l8pgrj34re0q3whmjl96dgp3kgr623afnd8h3`

Every donation is a reminder that this project matters. Thank you.

---

## Built With

*   [Tauri](https://tauri.app/) (v2) — lightweight, secure Rust framework for desktop apps.
*   [Rust](https://www.rust-lang.org/) — systems programming language.
*   [Tor Expert Bundle](https://www.torproject.org/download/tor/) — the official Tor daemon.
*   Pure stubbornness and a belief that architecture matters.

---

*Part of the BSL-Software ecosystem. Clean architecture, clean code, clean life.*
# tray.ps1 - dsh system-tray icon.
#
# Runs a NotifyIcon for as long as the parent dsh process is alive: it shows a
# small dsh whale in the system tray (taskbar notification area), opens the dsh
# page on double-click / "Open" menu item, and exits (icon disappears) when the
# parent process is gone. The "Exit" menu item terminates the parent dsh
# process (i.e. closes the dsh backend).
#
# ASCII-only on purpose: Windows PowerShell 5.1 reads .ps1 as ANSI, so all
# user-visible Chinese labels come from UTF-16 environment variables set by the
# plugin. Run with -STA (WinForms message pump requires it).
param(
  [int]$ParentPid = 0,
  [string]$IconPath = '',
  [string]$WebUrl = 'http://127.0.0.1:3080'
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$tooltip = [string]$env:DSH_TRAY_TOOLTIP
if (-not $tooltip) { $tooltip = 'dsh running' }
$openLabel = [string]$env:DSH_TRAY_OPEN
if (-not $openLabel) { $openLabel = 'Open dsh' }
$exitLabel = [string]$env:DSH_TRAY_EXIT
if (-not $exitLabel) { $exitLabel = 'Exit' }

$notify = New-Object System.Windows.Forms.NotifyIcon
if ($IconPath -and (Test-Path $IconPath)) {
  $notify.Icon = [System.Drawing.Icon]::new($IconPath)
} else {
  $notify.Icon = [System.Drawing.SystemIcons]::Application
}
$notify.Text = $tooltip
$notify.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$openItem = New-Object System.Windows.Forms.ToolStripMenuItem
$openItem.Text = $openLabel
$openItem.Add_Click({ Start-Process $WebUrl })
[void]$menu.Items.Add($openItem)
[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))
$hideItem = New-Object System.Windows.Forms.ToolStripMenuItem
$hideItem.Text = $exitLabel
$hideItem.Add_Click({
  # Terminate the parent dsh process, then exit the tray.
  if ($ParentPid -gt 0) {
    try { Stop-Process -Id $ParentPid -Force -ErrorAction SilentlyContinue } catch {}
  }
  $notify.Visible = $false
  $notify.Dispose()
  [System.Windows.Forms.Application]::Exit()
})
[void]$menu.Items.Add($hideItem)
$notify.ContextMenuStrip = $menu
$notify.Add_DoubleClick({ Start-Process $WebUrl })

# Exit (icon disappears) when the parent dsh process is gone.
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 3000
$timer.Add_Tick({
  if ($ParentPid -gt 0) {
    $gone = $false
    try {
      $p = [System.Diagnostics.Process]::GetProcessById($ParentPid)
      if ($p.HasExited) { $gone = $true }
    } catch {
      $gone = $true
    }
    if ($gone) {
      $notify.Visible = $false
      $notify.Dispose()
      [System.Windows.Forms.Application]::Exit()
    }
  }
})
$timer.Start()

[System.Windows.Forms.Application]::Run()

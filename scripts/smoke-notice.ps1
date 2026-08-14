# smoke-notice.ps1 - standalone Toast smoke test.
#
# ASCII-only on purpose: Windows PowerShell 5.1 reads .ps1 as the system
# ANSI code page, so non-ASCII literals here would fail to parse on a
# Chinese-locale machine. Chinese text is exercised by the plugin itself,
# which passes title/body via UTF-16 environment variables (code-page safe).
#
# Usage: powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-notice.ps1
param(
  [string]$Title = "DSH notice test",
  [string]$Body = "If you can read this toast, the notification pipeline works."
)

[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$t = $Title.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;')
$b = $Body.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;')
$xmlText = '<toast><visual><binding template="ToastGeneric"><text>' + $t + '</text><text>' + $b + '</text></binding></visual></toast>'

$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($xmlText)
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
$appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show($toast)

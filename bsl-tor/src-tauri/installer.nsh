!macro NSIS_HOOK_POSTINSTALL
  ; Stop and remove old Tor service
  nsExec::ExecToStack '"$SYSDIR\sc.exe" stop Tor'
  nsExec::ExecToStack '"$SYSDIR\sc.exe" delete Tor'
  
  ; Extract Tor archive
  ExecWait '"$INSTDIR\bsl-tor.exe" --install "$INSTDIR\_up_\data\tor.zip"'
  
  ; Create Tor service
  nsExec::ExecToStack '"$SYSDIR\sc.exe" create Tor binPath= "\"C:\Tor\tor.exe\" --nt-service -f \"C:\Tor\torrc\"" start= auto DisplayName= "Tor"'
  
  ; Wait for service registration
  Sleep 3000
  
  ; Start Tor service
  nsExec::ExecToStack '"$SYSDIR\sc.exe" start Tor'
!macroend
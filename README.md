# Charles T. Darling Football Tournament 2026

GitHub Pages frontend for FieldFlow.

## Backend

Apps Script API:

https://script.google.com/a/fieldflow.cl/macros/s/AKfycbzhTcXRRKVk_ztL3NmPcvOuUrjNSHlXsMPwDMgsu8mmi_q0n46LTvSuWZ0I-01hjBQX/exec

Public JSON:

https://script.google.com/a/fieldflow.cl/macros/s/AKfycbzhTcXRRKVk_ztL3NmPcvOuUrjNSHlXsMPwDMgsu8mmi_q0n46LTvSuWZ0I-01hjBQX/exec?api=public

Health:

https://script.google.com/a/fieldflow.cl/macros/s/AKfycbzhTcXRRKVk_ztL3NmPcvOuUrjNSHlXsMPwDMgsu8mmi_q0n46LTvSuWZ0I-01hjBQX/exec?api=health

## GitHub Pages

Settings → Pages → Deploy from a branch → main → /(root)

## Live refresh

The public site automatically reloads tournament data every 15 seconds without refreshing the full page.

## Architecture

GitHub Pages = public frontend  
Apps Script = API + Admin  
Google Sheets = tournament database

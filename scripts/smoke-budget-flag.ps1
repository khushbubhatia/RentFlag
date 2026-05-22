$ErrorActionPreference = "Stop"

$listing = @"
Bright 1BR / 1BA in West Loop. `$2,150/month, lease 12 months.
Security deposit: 1 month. No application fee. Heat/water included.
Available June 1. Cats welcome. Coin laundry in basement, street parking only.
"@

function Run($label, $prefs) {
    $body = @{
        mode = "text"
        listingText = $listing
        preferences = $prefs
    } | ConvertTo-Json -Depth 5

    $r = Invoke-RestMethod -Uri "http://localhost:3001/api/analyze" `
        -Method POST -ContentType "application/json" -Body $body -TimeoutSec 60

    Write-Host "===== $label =====" -ForegroundColor Cyan
    Write-Host ("budgetFitPersonalized: " + $r.budgetFitPersonalized)
    Write-Host ("extracted rent value : " + $r.extractedListing.monthlyRent.value)
    Write-Host ("affordabilityScore   : " + $r.scores.affordabilityScore)
    Write-Host "summary line (scores):"
    foreach ($l in $r.summaryLines) {
        if ($l -like "*Scores at a glance*") { Write-Host "  $l" }
    }
    Write-Host "budgetFit caption body:"
    Write-Host ("  " + $r.scoreCaptions.budgetFit.body)
    Write-Host ""
}

Run "A - NO budget, NO income"    @{ monthlyTakeHomeIncome = $null; maxMonthlyBudget = $null }
Run "B - WITH budget 2000"        @{ monthlyTakeHomeIncome = $null; maxMonthlyBudget = 2000 }
Run "C - WITH income 5000"        @{ monthlyTakeHomeIncome = 5000; maxMonthlyBudget = $null }

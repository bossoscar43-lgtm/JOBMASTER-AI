$ErrorActionPreference = "Stop"
$base = "http://localhost:3000"

function Call($method, $path, $body, $useSession = $true) {
  $params = @{ Uri = "$base$path"; Method = $method; TimeoutSec = 120 }
  if ($body) { $params.Body = ($body | ConvertTo-Json -Depth 10 -Compress); $params.ContentType = "application/json" }
  if (Get-Variable session -Scope Script -ErrorAction SilentlyContinue) { $params.WebSession = $session }
  elseif ($useSession) { $params.SessionVariable = "script:session" }
  $r = Invoke-RestMethod @params
  return $r
}

Write-Output "== REGISTER =="
$unique = "camille" + [DateTime]::UtcNow.Ticks + "@test.fr"
$r = Call "POST" "/api/auth/register" @{ full_name = "Camille Dupont"; email = $unique; password = "TestPassword1234!" }
Write-Output ($r | ConvertTo-Json -Depth 4 -Compress)

Write-Output "== ME =="
$r = Call "GET" "/api/auth/me"
Write-Output ($r | ConvertTo-Json -Depth 4 -Compress)

Write-Output "== CV UPLOAD =="
$cvPath = Join-Path $PSScriptRoot "sample-cv.txt"
$boundary = "----jm" + [Guid]::NewGuid().ToString("N")
$content = [IO.File]::ReadAllText($cvPath)
$part = "--$boundary`r`nContent-Disposition: form-data; name=`"file`"; filename=`"cv.txt`"`r`nContent-Type: text/plain`r`n`r`n$content`r`n--$boundary--`r`n"
$bytes = [Text.Encoding]::UTF8.GetBytes($part)
$r = Invoke-RestMethod -Uri "$base/api/resumes" -Method Post -Body $bytes -ContentType "multipart/form-data; boundary=$boundary" -WebSession $session -TimeoutSec 120
Write-Output ($r | ConvertTo-Json -Depth 4 -Compress)
$resumeId = $r.data.id

Write-Output "== SEARCH =="
$r = Call "POST" "/api/jobs/search" @{ keywords = ""; limit = 12; date_posted_days = 365 }
Write-Output ("jobs=" + $r.data.jobs.Count + " sources=" + ($r.meta.sources -join ","))
$jobId = $r.data.jobs[0].id

Write-Output "== JOB DETAIL =="
$r = Call "GET" "/api/jobs/$jobId"
Write-Output ("title=" + $r.data.job.title + " score=" + $r.data.match.score)

Write-Output "== ADAPT =="
$r = Call "POST" "/api/resumes/$resumeId/adapt" @{ jobId = $jobId }
Write-Output ("version=" + $r.data.versionId + " score=" + $r.data.score)

Write-Output "== APPLICATIONS =="
$r = Call "GET" "/api/applications"
Write-Output ("count=" + $r.data.Count + " firstStatus=" + $r.data[0].status)

Write-Output "== COACH =="
$r = Call "POST" "/api/coach" @{ role = "Développeuse Full Stack"; company = "Malt" }
Write-Output ("questions=" + $r.data.questions.Count)
$coachId = $r.data.id
$r = Call "PATCH" "/api/coach/$coachId" @{ questionId = $r.data.questions[0].id; answer = "Je suis developpeuse full stack avec deux ans d'experience chez Malt ou j'ai developpe des interfaces React et integre des API. J'ai obtenu un resultat de 20 pourcent de gain de temps." }
Write-Output ("answerScore=" + $r.data.evaluation.score)
$r = Call "POST" "/api/coach/$coachId" @{}
Write-Output ("reportOverall=" + $r.data.overall)

Write-Output "== ASSISTANT =="
$r = Call "POST" "/api/assistant" @{ message = "Trouve-moi des alternances dans le commerce" }
Write-Output ($r.data.reply.Substring(0, [Math]::Min(120, $r.data.reply.Length)))

Write-Output "== DASHBOARD =="
$r = Call "GET" "/api/dashboard"
Write-Output ("stats=" + ($r.data.stats | ConvertTo-Json -Compress))

Write-Output "== ADMIN DENIED =="
try { Call "GET" "/api/admin/stats" } catch { Write-Output ("denied " + $_.Exception.Response.StatusCode.value__) }

Write-Output "== ADMIN REGISTER =="
$adminBody = @{ full_name = "Admin Principal"; email = "johnsalvador064@gmail.com"; password = "AdminPassword1234!"; adminSecret = "admin-secret-local-dev" } | ConvertTo-Json -Compress
try {
  $r = Invoke-RestMethod -Uri "$base/api/auth/register" -Method Post -Body $adminBody -ContentType "application/json" -SessionVariable adminSession -TimeoutSec 120
  Write-Output ("role=" + $r.data.role)
} catch {
  $loginBody = @{ email = "johnsalvador064@gmail.com"; password = "AdminPassword1234!" } | ConvertTo-Json -Compress
  $r = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable adminSession -TimeoutSec 120
  Write-Output ("role=" + $r.data.role + " (admin existant)")
}
$r = Invoke-RestMethod -Uri "$base/api/admin/stats" -WebSession $adminSession -TimeoutSec 120
Write-Output ("adminStats users=" + $r.data.users + " jobs=" + $r.data.jobs)

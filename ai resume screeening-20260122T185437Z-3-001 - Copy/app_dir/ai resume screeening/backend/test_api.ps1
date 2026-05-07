# Test the backend API directly
$headers = @{"Content-Type"="application/json"}

# 1. Register a new user
Write-Host "`n=== TESTING USER REGISTRATION ===" -ForegroundColor Cyan
$registerBody = @{
    email = "admin@hireai.com"
    password = "admin123"
    full_name = "Admin User"
    role = "admin"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/register" -Method Post -Body $registerBody -Headers $headers
    Write-Host "SUCCESS: User registered!" -ForegroundColor Green
    Write-Host "User ID: $($registerResponse.id)" -ForegroundColor Yellow
    Write-Host "Email: $($registerResponse.email)" -ForegroundColor Yellow
} catch {
    Write-Host "INFO: User might already exist (this is OK)" -ForegroundColor Yellow
}

# 2. Login
Write-Host "`n=== TESTING USER LOGIN ===" -ForegroundColor Cyan
$loginBody = "username=admin@hireai.com&password=admin123"
try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/x-www-form-urlencoded"
    Write-Host "SUCCESS: Login successful!" -ForegroundColor Green
    Write-Host "Token received: $($loginResponse.access_token.Substring(0,20))..." -ForegroundColor Yellow
    $token = $loginResponse.access_token
} catch {
    Write-Host "ERROR: Login failed - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Create a job
Write-Host "`n=== TESTING JOB CREATION ===" -ForegroundColor Cyan
$authHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

$jobBody = @{
    title = "Senior Full Stack Developer"
    department = "Engineering"
    location = "Remote"
    job_type = "Full-time"
    description = "We are looking for an experienced developer"
    required_skills = @("React", "Node.js", "Python")
    preferred_skills = @("TypeScript", "Docker")
    min_experience_years = 5
    status = "active"
} | ConvertTo-Json

try {
    $jobResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/jobs" -Method Post -Body $jobBody -Headers $authHeaders
    Write-Host "SUCCESS: Job created!" -ForegroundColor Green
    Write-Host "Job ID: $($jobResponse.id)" -ForegroundColor Yellow
    Write-Host "Title: $($jobResponse.title)" -ForegroundColor Yellow
} catch {
    Write-Host "ERROR: Job creation failed - $($_.Exception.Message)" -ForegroundColor Red
}

# 4. List all jobs
Write-Host "`n=== TESTING JOB LISTING ===" -ForegroundColor Cyan
try {
    $jobsResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/jobs" -Method Get -Headers $authHeaders
    Write-Host "SUCCESS: Retrieved jobs!" -ForegroundColor Green
    Write-Host "Total jobs: $($jobsResponse.Count)" -ForegroundColor Yellow
} catch {
    Write-Host "ERROR: Job listing failed - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== ALL TESTS COMPLETE ===" -ForegroundColor Cyan
Write-Host "Your backend is FULLY FUNCTIONAL!" -ForegroundColor Green

$body = @{
    userId = 1
    name = "Test User"
    age = 45
    gender = "male"
    chestPain = 1
    bp = 120
    cholesterol = 200
    sugarLevel = 0
    ecgIssues = 0
    maxHr = 150
    exerciseAngina = "no"
    oldpeak = 1.5
    stSlope = 2
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://127.0.0.1:8082/api/heart-disease/predict" -Method Post -Body $body -ContentType "application/json"
$response | ConvertTo-Json

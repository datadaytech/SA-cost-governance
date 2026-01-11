@echo off
REM Deploy SA-pii-detection to Splunk Docker Container (Windows)
REM Usage: deploy_to_docker.bat [container_name]

setlocal enabledelayedexpansion

set CONTAINER_NAME=%1
if "%CONTAINER_NAME%"=="" set CONTAINER_NAME=splunk

set APP_NAME=SA-pii-detection
set SPLUNK_APPS_PATH=/opt/splunk/etc/apps
set SPLUNK_USER=admin
set SPLUNK_PASSWORD=changeme123
set SPLUNK_URL=https://localhost:8000

echo ==========================================
echo SA-pii-detection Deployment Script
echo ==========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not running
    echo Please start Docker Desktop and try again
    exit /b 1
)

REM Check if container exists
docker ps -a --format "{{.Names}}" | findstr /x "%CONTAINER_NAME%" >nul
if errorlevel 1 (
    echo Error: Container '%CONTAINER_NAME%' not found
    echo.
    echo Available containers:
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo.
    echo Usage: %0 container_name
    exit /b 1
)

REM Check if container is running
docker ps --format "{{.Names}}" | findstr /x "%CONTAINER_NAME%" >nul
if errorlevel 1 (
    echo Container '%CONTAINER_NAME%' is not running
    echo Starting container...
    docker start "%CONTAINER_NAME%"
    echo Waiting for Splunk to start (30 seconds)...
    timeout /t 30 /nobreak >nul
)

echo Container '%CONTAINER_NAME%' is running
echo.

echo Copying %APP_NAME% to container...
docker cp "%~dp0." "%CONTAINER_NAME%:%SPLUNK_APPS_PATH%/%APP_NAME%"

if errorlevel 1 (
    echo Error: Failed to copy app to container
    exit /b 1
)

echo App copied successfully
echo.

echo Setting permissions...

docker exec -u root "%CONTAINER_NAME%" chown -R splunk:splunk "%SPLUNK_APPS_PATH%/%APP_NAME%"
docker exec -u root "%CONTAINER_NAME%" find "%SPLUNK_APPS_PATH%/%APP_NAME%" -type f -exec chmod 644 {} ;
docker exec -u root "%CONTAINER_NAME%" find "%SPLUNK_APPS_PATH%/%APP_NAME%" -type d -exec chmod 755 {} ;
docker exec -u root "%CONTAINER_NAME%" chmod +x "%SPLUNK_APPS_PATH%/%APP_NAME%/bin/"*.py
docker exec -u root "%CONTAINER_NAME%" chmod 644 "%SPLUNK_APPS_PATH%/%APP_NAME%/lookups/"*.csv

echo Permissions set correctly
echo.

echo Reloading Splunk app...

docker exec "%CONTAINER_NAME%" curl -s -k -u "%SPLUNK_USER%:%SPLUNK_PASSWORD%" "https://localhost:8089/services/apps/local/%APP_NAME%/_bump" -X POST >nul 2>&1

if errorlevel 1 (
    echo Warning: Could not bump app via REST API
    echo Attempting Splunk restart instead...
    docker exec "%CONTAINER_NAME%" /opt/splunk/bin/splunk restart
    echo Waiting for Splunk to restart (60 seconds)...
    timeout /t 60 /nobreak >nul
) else (
    echo App reloaded successfully
)

echo.
echo ==========================================
echo Deployment Complete!
echo ==========================================
echo.
echo Access the app at:
echo    %SPLUNK_URL%/app/%APP_NAME%/pii_overview
echo.
echo Available Dashboards:
echo    - PII Overview:          %SPLUNK_URL%/app/%APP_NAME%/pii_overview
echo    - PII Findings:          %SPLUNK_URL%/app/%APP_NAME%/pii_findings
echo    - Whitelist Management:  %SPLUNK_URL%/app/%APP_NAME%/pii_whitelist
echo    - Settings:              %SPLUNK_URL%/app/%APP_NAME%/pii_settings
echo    - Audit Log:             %SPLUNK_URL%/app/%APP_NAME%/pii_audit_log
echo.
echo Login credentials:
echo    Username: %SPLUNK_USER%
echo    Password: %SPLUNK_PASSWORD%
echo.
echo Next steps:
echo    1. Log in to Splunk Web
echo    2. Navigate to Apps - PII Detection ^& Management
echo    3. Configure scan indexes in Settings
echo    4. Run your first PII scan
echo.

pause

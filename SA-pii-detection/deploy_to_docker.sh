#!/bin/bash
# Deploy SA-pii-detection to Splunk Docker Container
# Usage: ./deploy_to_docker.sh [container_name]

set -e

CONTAINER_NAME="${1:-splunk}"
APP_NAME="SA-pii-detection"
SPLUNK_APPS_PATH="/opt/splunk/etc/apps"
SPLUNK_USER="${SPLUNK_USER:-admin}"
SPLUNK_PASSWORD="${SPLUNK_PASSWORD:-changeme123}"
SPLUNK_URL="${SPLUNK_URL:-https://localhost:8000}"

echo "=========================================="
echo "SA-pii-detection Deployment Script"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

# Check if container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Error: Container '${CONTAINER_NAME}' not found"
    echo ""
    echo "Available containers:"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo "Usage: $0 <container_name>"
    exit 1
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "⚠️  Container '${CONTAINER_NAME}' is not running"
    echo "Starting container..."
    docker start "${CONTAINER_NAME}"
    echo "Waiting for Splunk to start (30 seconds)..."
    sleep 30
fi

echo "✓ Container '${CONTAINER_NAME}' is running"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if app directory exists
if [ ! -d "${SCRIPT_DIR}" ]; then
    echo "❌ Error: App directory not found at ${SCRIPT_DIR}"
    exit 1
fi

echo "📦 Copying ${APP_NAME} to container..."
docker cp "${SCRIPT_DIR}" "${CONTAINER_NAME}:${SPLUNK_APPS_PATH}/${APP_NAME}"

if [ $? -eq 0 ]; then
    echo "✓ App copied successfully"
else
    echo "❌ Error: Failed to copy app to container"
    exit 1
fi

echo ""
echo "🔐 Setting permissions..."

# Set ownership
docker exec -u root "${CONTAINER_NAME}" chown -R splunk:splunk "${SPLUNK_APPS_PATH}/${APP_NAME}"

# Set file permissions
docker exec -u root "${CONTAINER_NAME}" find "${SPLUNK_APPS_PATH}/${APP_NAME}" -type f -exec chmod 644 {} \;
docker exec -u root "${CONTAINER_NAME}" find "${SPLUNK_APPS_PATH}/${APP_NAME}" -type d -exec chmod 755 {} \;

# Make Python scripts executable
docker exec -u root "${CONTAINER_NAME}" chmod +x "${SPLUNK_APPS_PATH}/${APP_NAME}/bin/"*.py

# Fix CSV lookup permissions
docker exec -u root "${CONTAINER_NAME}" chmod 644 "${SPLUNK_APPS_PATH}/${APP_NAME}/lookups/"*.csv

echo "✓ Permissions set correctly"
echo ""

echo "🔄 Reloading Splunk app..."

# Bump the app to reload it
BUMP_RESPONSE=$(docker exec "${CONTAINER_NAME}" curl -s -k -u "${SPLUNK_USER}:${SPLUNK_PASSWORD}" \
    "https://localhost:8089/services/apps/local/${APP_NAME}/_bump" -X POST 2>&1)

if [ $? -eq 0 ]; then
    echo "✓ App reloaded successfully"
else
    echo "⚠️  Warning: Could not bump app via REST API"
    echo "Response: ${BUMP_RESPONSE}"
    echo ""
    echo "Attempting Splunk restart instead..."
    docker exec "${CONTAINER_NAME}" /opt/splunk/bin/splunk restart
    echo "Waiting for Splunk to restart (60 seconds)..."
    sleep 60
fi

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "🌐 Access the app at:"
echo "   ${SPLUNK_URL}/app/${APP_NAME}/pii_overview"
echo ""
echo "📊 Available Dashboards:"
echo "   • PII Overview:          ${SPLUNK_URL}/app/${APP_NAME}/pii_overview"
echo "   • PII Findings:          ${SPLUNK_URL}/app/${APP_NAME}/pii_findings"
echo "   • Whitelist Management:  ${SPLUNK_URL}/app/${APP_NAME}/pii_whitelist"
echo "   • Settings:              ${SPLUNK_URL}/app/${APP_NAME}/pii_settings"
echo "   • Audit Log:             ${SPLUNK_URL}/app/${APP_NAME}/pii_audit_log"
echo ""
echo "🔑 Login credentials:"
echo "   Username: ${SPLUNK_USER}"
echo "   Password: ${SPLUNK_PASSWORD}"
echo ""
echo "📝 Next steps:"
echo "   1. Log in to Splunk Web"
echo "   2. Navigate to Apps → PII Detection & Management"
echo "   3. Configure scan indexes in Settings"
echo "   4. Run your first PII scan"
echo ""

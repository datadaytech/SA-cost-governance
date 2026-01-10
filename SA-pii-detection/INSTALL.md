# SA-pii-detection Installation Guide for Docker Desktop

This guide will help you install the SA-pii-detection app in your Docker Desktop Splunk instance.

## Prerequisites

- **Docker Desktop** installed and running
- **Splunk** container running in Docker Desktop
- Access to command line (Terminal on Mac/Linux, PowerShell or CMD on Windows)

## Quick Start

### Option 1: Automated Installation (Recommended)

#### On Windows:
1. Open PowerShell or Command Prompt
2. Navigate to the app directory:
   ```cmd
   cd path\to\apps\SA-pii-detection
   ```
3. Run the deployment script:
   ```cmd
   deploy_to_docker.bat
   ```
   Or if your Splunk container has a different name:
   ```cmd
   deploy_to_docker.bat your-container-name
   ```

#### On Mac/Linux:
1. Open Terminal
2. Navigate to the app directory:
   ```bash
   cd path/to/apps/SA-pii-detection
   ```
3. Run the deployment script:
   ```bash
   ./deploy_to_docker.sh
   ```
   Or if your Splunk container has a different name:
   ```bash
   ./deploy_to_docker.sh your-container-name
   ```

### Option 2: Manual Installation

#### Step 1: Check Docker Status

```bash
# Check if Docker is running
docker info

# List all containers
docker ps -a
```

Find your Splunk container name. Common names:
- `splunk`
- `splunk-dev`
- `splunk-enterprise`
- `so1` (if using Splunk Enterprise container)

#### Step 2: Start Splunk Container (if stopped)

```bash
docker start <container-name>
```

Wait 30 seconds for Splunk to fully start.

#### Step 3: Copy App to Container

**Windows:**
```cmd
docker cp C:\path\to\apps\SA-pii-detection splunk:/opt/splunk/etc/apps/SA-pii-detection
```

**Mac/Linux:**
```bash
docker cp /path/to/apps/SA-pii-detection splunk:/opt/splunk/etc/apps/SA-pii-detection
```

#### Step 4: Set Permissions

```bash
# Set ownership
docker exec -u root splunk chown -R splunk:splunk /opt/splunk/etc/apps/SA-pii-detection

# Set file permissions
docker exec -u root splunk find /opt/splunk/etc/apps/SA-pii-detection -type f -exec chmod 644 {} \;
docker exec -u root splunk find /opt/splunk/etc/apps/SA-pii-detection -type d -exec chmod 755 {} \;

# Make Python scripts executable
docker exec -u root splunk chmod +x /opt/splunk/etc/apps/SA-pii-detection/bin/*.py

# Fix lookup permissions
docker exec -u root splunk chmod 644 /opt/splunk/etc/apps/SA-pii-detection/lookups/*.csv
```

#### Step 5: Reload Splunk App

```bash
# Reload via REST API
docker exec splunk curl -s -k -u admin:changeme123 "https://localhost:8089/services/apps/local/SA-pii-detection/_bump" -X POST
```

**Or restart Splunk:**
```bash
docker exec splunk /opt/splunk/bin/splunk restart
```

Wait 60 seconds for restart to complete.

## If You Don't Have a Splunk Container

### Create a New Splunk Container

```bash
docker run -d \
  --name splunk \
  -p 8000:8000 \
  -p 8089:8089 \
  -e SPLUNK_START_ARGS='--accept-license' \
  -e SPLUNK_PASSWORD='changeme123' \
  splunk/splunk:latest
```

Wait 2-3 minutes for Splunk to initialize, then follow the installation steps above.

## Accessing the App

### Step 1: Open Splunk Web

Open your browser and navigate to:
```
https://localhost:8000
```

Or if using a different port:
```
https://localhost:<your-port>
```

**Accept the SSL certificate warning** (self-signed certificate)

### Step 2: Login

- **Username:** `admin`
- **Password:** `changeme123` (or your configured password)

### Step 3: Navigate to the App

After login, you can access the app in several ways:

**Method 1: Apps Menu**
1. Click **Apps** in the top navigation bar
2. Find **PII Detection & Management**
3. Click to open

**Method 2: Direct URLs**
- Overview: `https://localhost:8000/app/SA-pii-detection/pii_overview`
- Findings: `https://localhost:8000/app/SA-pii-detection/pii_findings`
- Whitelist: `https://localhost:8000/app/SA-pii-detection/pii_whitelist`
- Settings: `https://localhost:8000/app/SA-pii-detection/pii_settings`
- Audit Log: `https://localhost:8000/app/SA-pii-detection/pii_audit_log`

### Step 4: Initial Configuration

1. Navigate to **Settings** dashboard
2. Configure indexes to scan:
   ```
   main,_internal
   ```
3. Set alert email (optional)
4. Click **Save Settings**

### Step 5: Run Your First Scan

1. Go to **PII Overview** dashboard
2. Click **Run PII Scan** button
3. Wait 2-5 minutes for scan to complete
4. Refresh the dashboard to see results

## Troubleshooting

### "Container not found"

**Check container name:**
```bash
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Use the correct container name in the deployment script.

### "Docker is not running"

1. Open Docker Desktop application
2. Wait for Docker engine to start (whale icon in system tray should be steady)
3. Try again

### "Permission denied"

Make sure Docker Desktop has access to your file system:
- **Windows:** Docker Desktop → Settings → Resources → File Sharing
- **Mac:** Docker Desktop → Settings → Resources → File Sharing

### "App not showing in Splunk"

1. Check app is in container:
   ```bash
   docker exec splunk ls -la /opt/splunk/etc/apps/SA-pii-detection
   ```

2. Check Splunk logs:
   ```bash
   docker exec splunk tail -100 /opt/splunk/var/log/splunk/splunkd.log
   ```

3. Restart Splunk:
   ```bash
   docker exec splunk /opt/splunk/bin/splunk restart
   ```

### "No PII detected"

1. Make sure you have data in the configured indexes
2. Check index configuration in Settings
3. Verify indexes exist:
   ```spl
   | eventcount summarize=false index=* | table index
   ```

### Getting Container IP Address

If localhost doesn't work:
```bash
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' splunk
```

Then access: `https://<ip-address>:8000`

### Port Already in Use

If port 8000 is already in use, find which port your Splunk container uses:
```bash
docker port splunk
```

Look for the mapping like: `8000/tcp -> 0.0.0.0:9000`
Then access: `https://localhost:9000`

## Verifying Installation

### Check App Files

```bash
docker exec splunk ls -laR /opt/splunk/etc/apps/SA-pii-detection
```

### Check App Status

```bash
docker exec splunk /opt/splunk/bin/splunk display app SA-pii-detection -auth admin:changeme123
```

### Check Scheduled Searches

```bash
docker exec splunk /opt/splunk/bin/splunk list saved-search -app SA-pii-detection -auth admin:changeme123
```

### Test Python Scripts

```bash
docker exec splunk /opt/splunk/etc/apps/SA-pii-detection/bin/mask_pii.py
```

Should show usage instructions.

## Common Docker Desktop Commands

### View Container Logs
```bash
docker logs splunk
```

### Access Container Shell
```bash
docker exec -it splunk bash
```

### Stop Container
```bash
docker stop splunk
```

### Start Container
```bash
docker start splunk
```

### Restart Container
```bash
docker restart splunk
```

### Remove App (if needed)
```bash
docker exec -u root splunk rm -rf /opt/splunk/etc/apps/SA-pii-detection
docker exec splunk /opt/splunk/bin/splunk restart
```

## Next Steps After Installation

1. **Configure Indexes** - Set which indexes to scan
2. **Review Patterns** - Customize PII detection patterns
3. **Run Test Scan** - Execute your first PII scan
4. **Set Up Alerts** - Configure email notifications
5. **Review Findings** - Check detected PII and take actions
6. **Add Whitelist** - Approve known safe patterns

## Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review container logs: `docker logs splunk`
3. Check Splunk logs inside container:
   ```bash
   docker exec splunk tail -100 /opt/splunk/var/log/splunk/splunkd.log
   ```
4. Check app logs:
   ```bash
   docker exec splunk cat /opt/splunk/var/log/splunk/python.log
   ```

## Uninstall

To remove the app:

```bash
# Remove app directory
docker exec -u root splunk rm -rf /opt/splunk/etc/apps/SA-pii-detection

# Restart Splunk
docker exec splunk /opt/splunk/bin/splunk restart
```

---

**Need help?** Open an issue on GitHub: https://github.com/DataDay-Technology-Solutions/apps/issues

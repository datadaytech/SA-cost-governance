# SA-pii-detection: PII Detection & Management for Splunk

**Version:** 1.0.0
**Author:** DataDay Technology Solutions
**Type:** Supporting Add-on (SA)

## Overview

SA-pii-detection is a comprehensive Splunk application that automatically identifies, tracks, and manages Personally Identifiable Information (PII) across your Splunk environment. The app helps organizations maintain compliance with data privacy regulations (GDPR, CCPA, HIPAA, etc.) by detecting sensitive data patterns and providing tools for remediation.

## Key Features

### 🔍 Multi-Pattern PII Detection
- **US Social Security Numbers (SSN)**
- **Credit Card Numbers** (Visa, MasterCard, Amex, Discover)
- **Email Addresses**
- **Phone Numbers** (US & International)
- **IP Addresses** (IPv4 & IPv6)
- **Bank Account Numbers**
- **US Driver's License Numbers**
- **US Passport Numbers**
- **Dates of Birth**
- **Medical Record Numbers (MRN)**
- **Custom Regex Patterns** (configurable)

### 📊 Comprehensive Dashboard Suite
1. **PII Overview** - Executive summary with statistics and trends
2. **PII Findings** - Detailed findings management and review
3. **Whitelist Management** - Exception handling for approved data
4. **Settings & Configuration** - Pattern customization and app settings
5. **Audit Log** - Complete action tracking for compliance reporting

### 🔄 Workflow Management
- **Detection** → Automatically discover PII in your data
- **Flagging** → Mark findings for review
- **Whitelisting** → Approve known safe patterns
- **Remediation** → Mask, hash, redact, or tokenize PII
- **False Positive** → Mark non-issues to reduce noise

### 🛡️ Remediation Methods
- **Mask** - Show only last 4 digits (e.g., XXX-XX-1234)
- **Hash** - SHA256 hash the value
- **Redact** - Complete redaction (***REDACTED***)
- **Tokenize** - Replace with unique token

### 📅 Automated Scanning
- **Daily Scheduled Scans** - Configurable cron-based scanning
- **Critical Alerts** - Immediate notification for high-risk findings
- **On-Demand Scans** - Manual deep scans when needed

### 📝 Audit & Compliance
- **Complete Audit Trail** - Every action logged with timestamp, user, and details
- **Compliance Reporting** - Export findings for regulatory reports
- **Status Tracking** - Monitor remediation progress

## Installation

### Prerequisites
- Splunk Enterprise 8.0+
- Python 3.7+
- Admin or Power User role

### Install Steps

1. **Copy app to Splunk apps directory:**
   ```bash
   cp -r SA-pii-detection /opt/splunk/etc/apps/
   ```

2. **Set proper permissions:**
   ```bash
   chown -R splunk:splunk /opt/splunk/etc/apps/SA-pii-detection
   chmod +x /opt/splunk/etc/apps/SA-pii-detection/bin/*.py
   ```

3. **Restart Splunk:**
   ```bash
   /opt/splunk/bin/splunk restart
   ```

4. **For Docker deployments:**
   ```bash
   # Copy app to container
   docker cp SA-pii-detection splunk-dev:/opt/splunk/etc/apps/

   # Fix permissions
   docker exec -u root splunk-dev bash -c "chown -R splunk:splunk /opt/splunk/etc/apps/SA-pii-detection"
   docker exec -u root splunk-dev bash -c "chmod 644 /opt/splunk/etc/apps/SA-pii-detection/lookups/*.csv"

   # Bump app
   curl -s -k -u admin:changeme123 "https://localhost:8089/services/apps/local/SA-pii-detection/_bump" -X POST
   ```

## Configuration

### Initial Setup

1. **Navigate to Settings Dashboard:**
   - Apps → PII Detection & Management → Settings

2. **Configure Scan Indexes:**
   ```
   main,web,app,security
   ```
   Set the comma-separated list of indexes to scan for PII.

3. **Set Scan Schedule (Cron):**
   ```
   0 2 * * *
   ```
   Default: Daily at 2:00 AM

4. **Configure Alert Email:**
   ```
   security-team@company.com
   ```

5. **Enable/Disable Notifications:**
   - Check "Enable Email Notifications" for critical alerts

### Custom Detection Patterns

Add organization-specific PII patterns:

1. Navigate to **Settings** → **Custom PII Detection Patterns**
2. Click **Add Custom Pattern**
3. Fill in:
   - **Pattern Name**: e.g., "Employee ID"
   - **PII Type**: Custom
   - **Regex Pattern**: e.g., `\bEMP-[0-9]{6}\b`
   - **Description**: What this detects
   - **Severity**: Critical/High/Medium/Low
4. Click **Add Pattern**

### Whitelist Configuration

To whitelist known safe data:

1. Navigate to **Whitelist Management**
2. Click **Add New Whitelist Entry**
3. Fill in:
   - **PII Type**: Select the type
   - **Pattern**: The exact pattern or value to whitelist
   - **Index/Sourcetype**: Optionally scope to specific data
   - **Reason**: Why this is being whitelisted
   - **Expiration**: Optional expiration date
4. Click **Add to Whitelist**

## Usage Guide

### Running a PII Scan

#### Automated (Scheduled)
Scans run automatically based on the configured schedule. No action needed.

#### Manual (On-Demand)
1. Navigate to **PII Overview**
2. Click **Run PII Scan**
3. Wait for completion (may take several minutes)
4. Refresh dashboard to see results

#### Deep Scan (Resource Intensive)
```spl
| savedsearch "PII Detection - Deep Scan"
```
Scans last 7 days of data across all configured indexes.

### Reviewing Findings

1. Navigate to **PII Findings Management**
2. Use filters to narrow results:
   - **Severity**: Critical/High/Medium/Low
   - **Status**: Detected/Flagged/Remediated/Whitelisted
   - **PII Type**: SSN/Credit Card/Email/etc.
   - **Search**: Index, sourcetype, or source
3. Click on a row to view detailed information
4. Take action:
   - **Flag** - Mark for review
   - **Whitelist** - Approve as safe
   - **False Positive** - Not actually PII
   - **Remediate** - Mask/redact the data

### Bulk Actions

1. Select multiple findings using checkboxes
2. Choose action:
   - **Flag Selected**
   - **Whitelist Selected**
   - **Mark as False Positive**
   - **Remediate Selected**
3. Confirm action

### Managing Whitelist

**View Active Entries:**
Navigate to **Whitelist Management** to see all active whitelist rules.

**Remove Entry:**
1. Click on entry in table
2. Click **Deactivate** or **Delete**

**Bulk Remove Expired:**
Click **Remove All Expired Entries** to clean up old whitelist rules.

### Remediation

**Remediate Single Finding:**
1. Open finding details
2. Click **Remediate**
3. Select method (mask/hash/redact/tokenize)
4. Confirm

**Remediate via CLI:**
```bash
cd /opt/splunk/etc/apps/SA-pii-detection/bin
./mask_pii.py <finding_id> mask
```

**Remediation Methods:**
- `mask` - Show last 4 digits (SSN: XXX-XX-1234)
- `hash` - SHA256 hash (abc123def456...)
- `redact` - Complete removal (***REDACTED***)
- `tokenize` - Unique token (TOKEN-A1B2C3D4E5F6)

### Audit Log Review

1. Navigate to **PII Audit Log**
2. Filter by:
   - **Time Range**: Last 7 days, 30 days, etc.
   - **Action Type**: Flag/Whitelist/Remediate/etc.
   - **User**: Who performed the action
3. Export audit log for compliance reporting

## SPL Macros

### Detection Macros

**Scan all PII types in _raw:**
```spl
index=main | `scan_all_pii`
```

**Detect specific PII in a field:**
```spl
index=main | `detect_ssn(user_ssn)`
index=main | `detect_credit_card(payment_info)`
index=main | `detect_email(email_field)`
```

**Mask PII values:**
```spl
index=main | `mask_ssn(ssn_field)`
index=main | `mask_credit_card(cc_field)`
index=main | `mask_email(email_field)`
```

**Check whitelist:**
```spl
index=main | `check_whitelist("ssn", "123-45-6789")`
```

**Calculate severity:**
```spl
index=main | eval pii_type="ssn" | `calculate_pii_severity`
```

### Pattern Macros

Use in searches to match specific PII types:
```spl
| eval has_ssn=if(match(_raw, "`pii_ssn_pattern`"), 1, 0)
| eval has_cc=if(match(_raw, "`pii_credit_card_pattern`"), 1, 0)
| eval has_email=if(match(_raw, "`pii_email_pattern`"), 1, 0)
```

## Python Scripts

### mask_pii.py
Masks or redacts PII data.

**Usage:**
```bash
./mask_pii.py <finding_id> [method]
```

**Example:**
```bash
./mask_pii.py abc123def456 mask
./mask_pii.py abc123def456 hash
```

### send_pii_alert.py
Sends email alerts for PII findings.

**Usage:**
```bash
./send_pii_alert.py <finding_id> [email1,email2]
```

**Example:**
```bash
./send_pii_alert.py abc123def456
./send_pii_alert.py abc123def456 admin@company.com,security@company.com
```

### flag_finding.py
Updates finding status (flag, whitelist, false positive).

**Usage:**
```bash
./flag_finding.py <finding_id> <status> [user] [notes]
```

**Example:**
```bash
./flag_finding.py abc123def456 flagged admin "Needs review"
./flag_finding.py abc123def456 whitelisted admin "Approved test data"
./flag_finding.py abc123def456 false_positive admin "Not actually PII"
```

## Data Storage

### KV Store Collections
- `pii_findings` - All detected PII instances
- `pii_whitelist` - Approved/safe patterns
- `pii_patterns` - Custom detection patterns
- `pii_audit_log` - Action audit trail
- `pii_settings` - App configuration
- `pii_scan_history` - Scan execution history

### CSV Lookups (for compatibility)
All KV Store collections are also available as CSV lookups:
- `pii_findings.csv`
- `pii_whitelist.csv`
- `pii_patterns.csv`
- `pii_audit_log.csv`
- `pii_settings.csv`
- `pii_scan_history.csv`

## Scheduled Searches

### PII Detection - Daily Scan
**Schedule:** Daily at 2:00 AM (configurable)
**Purpose:** Main detection search, scans configured indexes for PII
**Action:** Populates pii_findings_lookup

### PII Detection - Critical Alert
**Schedule:** Every 30 minutes
**Purpose:** Immediate alerts for critical PII (SSN, Credit Cards)
**Action:** Sends email notifications

### PII Detection - Statistics Summary
**Schedule:** Every 15 minutes
**Purpose:** Updates dashboard statistics cache
**Action:** Populates pii_scan_cache_lookup

### PII Detection - Whitelist Cleanup
**Schedule:** Daily at 4:00 AM
**Purpose:** Removes expired whitelist entries
**Action:** Cleans up pii_whitelist_lookup

## Compliance Features

### GDPR Compliance
- **Right to Access**: Audit log tracks all data access
- **Right to Erasure**: Remediation features support data deletion
- **Data Minimization**: Detection helps identify unnecessary PII
- **Breach Notification**: Alert system supports 72-hour notification requirement

### CCPA Compliance
- **Data Inventory**: Complete tracking of PII locations
- **Consumer Rights**: Support for data subject requests
- **Security**: Detection and remediation capabilities

### HIPAA Compliance
- **PHI Detection**: Medical record numbers, SSN, dates of birth
- **Audit Trail**: Complete logging per HIPAA requirements
- **Data Security**: Remediation supports de-identification

## Troubleshooting

### Scans not running
1. Check scheduled searches are enabled:
   ```
   Settings → Searches, reports, and alerts → Filter by "PII Detection"
   ```
2. Verify cron schedule is valid
3. Check Splunk's scheduler logs

### No findings detected
1. Verify indexes are configured correctly in Settings
2. Check data exists in configured indexes:
   ```spl
   | tstats count where index=main by sourcetype
   ```
3. Test patterns manually:
   ```spl
   index=main | head 1000 | `scan_all_pii` | where has_pii=1
   ```

### Permission errors on lookups
```bash
# Fix CSV permissions (Docker)
docker exec -u root splunk-dev bash -c "chmod 644 /opt/splunk/etc/apps/SA-pii-detection/lookups/*.csv"

# Fix ownership
docker exec -u root splunk-dev bash -c "chown splunk:splunk /opt/splunk/etc/apps/SA-pii-detection/lookups/*.csv"
```

### Python scripts not executing
```bash
# Make scripts executable
chmod +x /opt/splunk/etc/apps/SA-pii-detection/bin/*.py

# Test script directly
cd /opt/splunk/etc/apps/SA-pii-detection/bin
python3 mask_pii.py --help
```

## Best Practices

### Detection
1. **Start with limited indexes** - Test on smaller datasets first
2. **Review false positives** - Tune patterns to reduce noise
3. **Use whitelists liberally** - Approve known safe data promptly
4. **Schedule scans during off-peak** - Minimize performance impact

### Remediation
1. **Never auto-remediate production data** - Always review first
2. **Test remediation methods** - Verify they meet your requirements
3. **Document decisions** - Add notes to all findings
4. **Keep audit trail** - Never delete audit logs

### Performance
1. **Limit scan scope** - Only scan indexes with potential PII
2. **Adjust scan frequency** - Balance detection vs. resource usage
3. **Use indexed fields** - Extract PII to fields for faster searches
4. **Monitor resource usage** - Track search job duration

### Compliance
1. **Regular reviews** - Weekly review of new findings
2. **Audit log retention** - Keep logs for regulatory period
3. **Document processes** - Maintain written procedures
4. **Training** - Ensure team understands workflows

## Security Considerations

### Access Control
- Restrict app access to admin and security teams only
- Use Splunk's RBAC to control who can remediate vs. view
- Audit user actions regularly

### Data Protection
- Masked values are stored in lookups (encrypted at rest if configured)
- Original PII is never stored, only metadata about detection
- Remediation scripts should be reviewed before use in production

### Network Security
- Email alerts should use encrypted channels (TLS)
- REST API access should require authentication
- Consider network segmentation for PII-containing indexes

## Support & Documentation

### Resources
- **GitHub**: https://github.com/DataDay-Technology-Solutions/apps
- **Issues**: Report bugs via GitHub Issues
- **Splunk Docs**: https://docs.splunk.com

### Getting Help
1. Check this README first
2. Review Splunk logs: `index=_internal source=*sa-pii-detection*`
3. Open GitHub issue with:
   - Splunk version
   - Error messages
   - Steps to reproduce

## Changelog

### Version 1.0.0 (2026-01-09)
- Initial release
- Multi-pattern PII detection
- Dashboard suite (5 dashboards)
- Python remediation scripts
- Automated scanning and alerting
- Whitelist management
- Audit logging
- Custom pattern support

## License

Copyright © 2026 DataDay Technology Solutions

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit pull request with detailed description

## Roadmap

### Planned Features
- **Machine Learning** - ML-based PII detection
- **Data Classification** - Automatic sensitivity tagging
- **Integration APIs** - REST API for external tools
- **Advanced Remediation** - Format-preserving encryption
- **Compliance Reports** - Pre-built regulatory reports
- **Multi-tenant** - Support for multiple organizations

---

**Questions?** Contact: support@datadaytech.com

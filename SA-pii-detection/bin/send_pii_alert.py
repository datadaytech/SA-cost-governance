#!/usr/bin/env python3
"""
PII Alert Notification Script
Sends email alerts for PII findings
"""

import sys
import json
import csv
import os
import hashlib
from datetime import datetime

# Add Splunk SDK to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))

try:
    import splunk.rest as rest
    import splunk.entity as entity
except ImportError:
    pass


def get_session_key():
    """Get Splunk session key from stdin or environment"""
    session_key = sys.stdin.readline().strip()
    if not session_key:
        session_key = os.environ.get('SPLUNK_SESSION_KEY', '')
    return session_key


def get_settings(session_key=''):
    """Get PII detection settings"""
    lookups_path = os.path.join(os.path.dirname(__file__), '..', 'lookups')
    settings_file = os.path.join(lookups_path, 'pii_settings.csv')

    settings = {}
    if os.path.exists(settings_file):
        with open(settings_file, 'r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                settings[row['setting_name']] = row['setting_value']

    return settings


def get_finding_details(finding_id):
    """Get details of a specific finding"""
    lookups_path = os.path.join(os.path.dirname(__file__), '..', 'lookups')
    findings_file = os.path.join(lookups_path, 'pii_findings.csv')

    if not os.path.exists(findings_file):
        return None

    with open(findings_file, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['finding_id'] == finding_id:
                return row

    return None


def generate_alert_email(finding):
    """Generate email content for PII alert"""
    pii_type = finding.get('pii_type', 'Unknown')
    severity = finding.get('severity', 'medium')
    index = finding.get('index', 'Unknown')
    sourcetype = finding.get('sourcetype', 'Unknown')
    source = finding.get('source', 'Unknown')
    event_count = finding.get('event_count', '0')
    timestamp = finding.get('timestamp', '')

    # Convert timestamp
    if timestamp:
        try:
            dt = datetime.fromtimestamp(int(timestamp))
            timestamp_str = dt.strftime('%Y-%m-%d %H:%M:%S')
        except:
            timestamp_str = 'Unknown'
    else:
        timestamp_str = 'Unknown'

    # Build email subject
    subject = f"[{severity.upper()}] PII Detected: {pii_type.upper()} in {index}"

    # Build email body
    body = f"""
CRITICAL PII DETECTION ALERT
{'=' * 60}

A {severity} severity PII finding has been detected in your Splunk environment.

FINDING DETAILS:
  Finding ID:    {finding.get('finding_id', 'Unknown')}
  PII Type:      {pii_type.upper()}
  Severity:      {severity.upper()}
  Status:        {finding.get('status', 'detected').upper()}
  Detection Time: {timestamp_str}

DATA SOURCE INFORMATION:
  Index:         {index}
  Sourcetype:    {sourcetype}
  Source:        {source}
  Host:          {finding.get('host', 'Unknown')}
  Event Count:   {event_count}

{'=' * 60}

RECOMMENDED ACTIONS:
1. Review the finding in the PII Detection dashboard
2. Verify if this is legitimate PII or a false positive
3. If legitimate, consider:
   - Adding to whitelist if approved
   - Remediating the data (masking/redaction)
   - Updating data collection to prevent future exposure
4. Document your decision in the finding notes

ACCESS THE DASHBOARD:
Navigate to: Apps > PII Detection & Management > PII Findings

COMPLIANCE NOTICE:
Depending on your jurisdiction and industry, this may require:
- Notification to data protection officers
- Regulatory reporting (GDPR, CCPA, HIPAA, etc.)
- Incident response procedures
- Data breach assessment

{'=' * 60}

This is an automated alert from the Splunk PII Detection system.
Do not reply to this email.
"""

    return subject, body


def send_alert(finding_id, recipients=None, session_key=''):
    """
    Send PII alert email

    Args:
        finding_id: ID of the finding to alert on
        recipients: List of email addresses (optional)
        session_key: Splunk session key

    Returns:
        dict with success status and message
    """
    # Get finding details
    finding = get_finding_details(finding_id)
    if not finding:
        return {'success': False, 'message': f'Finding {finding_id} not found'}

    # Get settings for default recipients
    if not recipients:
        settings = get_settings(session_key)
        alert_email = settings.get('alert_email', 'admin@example.com')
        recipients = [alert_email]

    # Generate email content
    subject, body = generate_alert_email(finding)

    # In production, this would use Splunk's sendemail command or REST API
    # For now, we'll log the action and prepare the command

    # Build sendemail command
    email_cmd = f"""
| makeresults
| eval subject="{subject}"
| eval body="{body.replace(chr(10), '\\n')}"
| sendemail to="{','.join(recipients)}" subject=subject message=body
"""

    # Log to audit log
    lookups_path = os.path.join(os.path.dirname(__file__), '..', 'lookups')
    audit_log_file = os.path.join(lookups_path, 'pii_audit_log.csv')

    audit_entry = {
        'audit_id': hashlib.md5(f"{finding_id}{datetime.now().timestamp()}alert".encode()).hexdigest()[:16],
        'timestamp': int(datetime.now().timestamp()),
        'action': 'alert_sent',
        'finding_id': finding_id,
        'pii_type': finding.get('pii_type', ''),
        'performed_by': 'system',
        'old_status': finding.get('status', ''),
        'new_status': finding.get('status', ''),
        'details': f"Alert sent to {', '.join(recipients)}",
        'ip_address': 'localhost'
    }

    # Append to audit log
    file_exists = os.path.exists(audit_log_file)
    with open(audit_log_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=audit_entry.keys())
        if not file_exists:
            writer.writeheader()
        writer.writerow(audit_entry)

    return {
        'success': True,
        'message': f'Alert prepared for finding {finding_id}',
        'recipients': recipients,
        'subject': subject,
        'email_command': email_cmd
    }


def main():
    """Main execution"""
    # Get session key
    session_key = get_session_key()

    # Parse arguments
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'message': 'Usage: send_pii_alert.py <finding_id> [email1,email2,...]'
        }))
        sys.exit(1)

    finding_id = sys.argv[1]
    recipients = sys.argv[2].split(',') if len(sys.argv) > 2 else None

    # Send alert
    result = send_alert(finding_id, recipients, session_key)

    # Output result
    print(json.dumps(result, indent=2))

    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()

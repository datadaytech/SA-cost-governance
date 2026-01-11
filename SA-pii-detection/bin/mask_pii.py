#!/usr/bin/env python3
"""
PII Masking Script
Masks or redacts PII data based on finding ID and remediation method
"""

import sys
import json
import csv
import os
import re
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


def mask_ssn(value):
    """Mask SSN showing only last 4 digits"""
    # Remove any existing formatting
    clean = re.sub(r'[^0-9]', '', value)
    if len(clean) == 9:
        return f"XXX-XX-{clean[-4:]}"
    return "***MASKED***"


def mask_credit_card(value):
    """Mask credit card showing only last 4 digits"""
    clean = re.sub(r'[^0-9]', '', value)
    if len(clean) >= 13:
        return f"************{clean[-4:]}"
    return "***MASKED***"


def mask_email(value):
    """Mask email showing only domain"""
    if '@' in value:
        parts = value.split('@')
        return f"****@{parts[1]}"
    return "***MASKED***"


def mask_phone(value):
    """Mask phone showing only last 4 digits"""
    clean = re.sub(r'[^0-9]', '', value)
    if len(clean) >= 10:
        return f"***-***-{clean[-4:]}"
    return "***MASKED***"


def hash_value(value):
    """Hash the value using SHA256"""
    return hashlib.sha256(value.encode()).hexdigest()[:16]


def redact_value(value):
    """Completely redact the value"""
    return "***REDACTED***"


def tokenize_value(value):
    """Generate a token for the value"""
    token = hashlib.md5(value.encode()).hexdigest()[:12].upper()
    return f"TOKEN-{token}"


def remediate_pii(finding_id, method='mask', session_key=''):
    """
    Remediate PII based on finding ID

    Args:
        finding_id: ID of the finding to remediate
        method: Remediation method (mask, hash, redact, tokenize)
        session_key: Splunk session key

    Returns:
        dict with success status and message
    """
    # Read findings lookup
    lookups_path = os.path.join(os.path.dirname(__file__), '..', 'lookups')
    findings_file = os.path.join(lookups_path, 'pii_findings.csv')
    audit_log_file = os.path.join(lookups_path, 'pii_audit_log.csv')

    if not os.path.exists(findings_file):
        return {'success': False, 'message': 'Findings lookup file not found'}

    # Load findings
    findings = []
    target_finding = None

    with open(findings_file, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['finding_id'] == finding_id:
                target_finding = row
            findings.append(row)

    if not target_finding:
        return {'success': False, 'message': f'Finding {finding_id} not found'}

    # Apply remediation based on PII type and method
    pii_type = target_finding.get('pii_type', '')
    sample_value = target_finding.get('sample_value', '')

    if method == 'mask':
        if pii_type == 'ssn':
            masked = mask_ssn(sample_value) if sample_value else "***MASKED***"
        elif pii_type == 'credit_card':
            masked = mask_credit_card(sample_value) if sample_value else "***MASKED***"
        elif pii_type == 'email':
            masked = mask_email(sample_value) if sample_value else "***MASKED***"
        elif pii_type == 'phone':
            masked = mask_phone(sample_value) if sample_value else "***MASKED***"
        else:
            masked = "***MASKED***"
    elif method == 'hash':
        masked = hash_value(sample_value) if sample_value else "***HASHED***"
    elif method == 'redact':
        masked = redact_value(sample_value) if sample_value else "***REDACTED***"
    elif method == 'tokenize':
        masked = tokenize_value(sample_value) if sample_value else "***TOKENIZED***"
    else:
        masked = "***REMEDIATED***"

    # Update finding
    for finding in findings:
        if finding['finding_id'] == finding_id:
            old_status = finding['status']
            finding['status'] = 'remediated'
            finding['masked_value'] = masked
            finding['reviewed_by'] = 'system'
            finding['reviewed_time'] = str(int(datetime.now().timestamp()))
            finding['notes'] = f"Remediated using {method} method on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

    # Write back findings
    with open(findings_file, 'w', newline='', encoding='utf-8') as f:
        if findings:
            writer = csv.DictWriter(f, fieldnames=findings[0].keys())
            writer.writeheader()
            writer.writerows(findings)

    # Log to audit log
    audit_entry = {
        'audit_id': hashlib.md5(f"{finding_id}{datetime.now().timestamp()}".encode()).hexdigest()[:16],
        'timestamp': int(datetime.now().timestamp()),
        'action': 'remediate',
        'finding_id': finding_id,
        'pii_type': pii_type,
        'performed_by': 'system',
        'old_status': old_status,
        'new_status': 'remediated',
        'details': f"Remediated using {method} method",
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
        'message': f'Successfully remediated finding {finding_id} using {method} method',
        'masked_value': masked
    }


def main():
    """Main execution"""
    # Get session key
    session_key = get_session_key()

    # Parse arguments
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'message': 'Usage: mask_pii.py <finding_id> [method]'
        }))
        sys.exit(1)

    finding_id = sys.argv[1]
    method = sys.argv[2] if len(sys.argv) > 2 else 'mask'

    # Remediate PII
    result = remediate_pii(finding_id, method, session_key)

    # Output result
    print(json.dumps(result, indent=2))

    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()

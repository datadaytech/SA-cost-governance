#!/usr/bin/env python3
"""
PII Finding Flag/Whitelist Script
Manages finding status changes (flag, whitelist, false positive)
"""

import sys
import json
import csv
import os
import hashlib
from datetime import datetime

# Add Splunk SDK to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib"))


def get_session_key():
    """Get Splunk session key from stdin or environment"""
    session_key = sys.stdin.readline().strip()
    if not session_key:
        session_key = os.environ.get('SPLUNK_SESSION_KEY', '')
    return session_key


def update_finding_status(finding_id, new_status, user='system', notes='', session_key=''):
    """
    Update finding status

    Args:
        finding_id: ID of the finding
        new_status: New status (flagged, whitelisted, false_positive, remediated)
        user: Username performing the action
        notes: Additional notes
        session_key: Splunk session key

    Returns:
        dict with success status and message
    """
    lookups_path = os.path.join(os.path.dirname(__file__), '..', 'lookups')
    findings_file = os.path.join(lookups_path, 'pii_findings.csv')
    audit_log_file = os.path.join(lookups_path, 'pii_audit_log.csv')
    whitelist_file = os.path.join(lookups_path, 'pii_whitelist.csv')

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

    old_status = target_finding['status']
    timestamp = int(datetime.now().timestamp())

    # Update finding
    for finding in findings:
        if finding['finding_id'] == finding_id:
            finding['status'] = new_status

            if new_status == 'flagged':
                finding['flagged_by'] = user
                finding['flagged_time'] = str(timestamp)
            elif new_status in ['whitelisted', 'false_positive', 'remediated']:
                finding['reviewed_by'] = user
                finding['reviewed_time'] = str(timestamp)

            if notes:
                existing_notes = finding.get('notes', '')
                finding['notes'] = f"{existing_notes}\n{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - {user}: {notes}".strip()
            break

    # Write back findings
    with open(findings_file, 'w', newline='', encoding='utf-8') as f:
        if findings:
            writer = csv.DictWriter(f, fieldnames=findings[0].keys())
            writer.writeheader()
            writer.writerows(findings)

    # If whitelisting, add to whitelist
    if new_status == 'whitelisted':
        whitelist_entry = {
            'whitelist_id': hashlib.md5(f"{finding_id}{timestamp}".encode()).hexdigest()[:16],
            'pattern': target_finding.get('sample_value', ''),
            'pii_type': target_finding.get('pii_type', ''),
            'index': target_finding.get('index', ''),
            'sourcetype': target_finding.get('sourcetype', ''),
            'field_name': target_finding.get('field_name', ''),
            'reason': notes or 'Whitelisted via finding management',
            'added_by': user,
            'added_time': str(timestamp),
            'expires': '',  # No expiration
            'is_active': '1'
        }

        # Append to whitelist
        file_exists = os.path.exists(whitelist_file)
        with open(whitelist_file, 'a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=whitelist_entry.keys())
            if not file_exists:
                writer.writeheader()
            writer.writerow(whitelist_entry)

    # Log to audit log
    audit_entry = {
        'audit_id': hashlib.md5(f"{finding_id}{timestamp}".encode()).hexdigest()[:16],
        'timestamp': timestamp,
        'action': new_status,
        'finding_id': finding_id,
        'pii_type': target_finding.get('pii_type', ''),
        'performed_by': user,
        'old_status': old_status,
        'new_status': new_status,
        'details': notes or f'Status changed from {old_status} to {new_status}',
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
        'message': f'Successfully updated finding {finding_id} to {new_status}',
        'old_status': old_status,
        'new_status': new_status
    }


def main():
    """Main execution"""
    # Get session key
    session_key = get_session_key()

    # Parse arguments
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'message': 'Usage: flag_finding.py <finding_id> <status> [user] [notes]'
        }))
        sys.exit(1)

    finding_id = sys.argv[1]
    new_status = sys.argv[2]
    user = sys.argv[3] if len(sys.argv) > 3 else 'system'
    notes = sys.argv[4] if len(sys.argv) > 4 else ''

    # Validate status
    valid_statuses = ['flagged', 'whitelisted', 'false_positive', 'remediated', 'detected']
    if new_status not in valid_statuses:
        print(json.dumps({
            'success': False,
            'message': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
        }))
        sys.exit(1)

    # Update finding
    result = update_finding_status(finding_id, new_status, user, notes, session_key)

    # Output result
    print(json.dumps(result, indent=2))

    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()

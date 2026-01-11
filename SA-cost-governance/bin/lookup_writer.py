#!/usr/bin/env python3
"""
Custom REST handler for writing to lookup files.
This bypasses the outputlookup permission issue by using direct file writes.
"""
import os
import sys
import json
import csv
import time
import splunk.admin as admin
import splunk.rest as rest

# Path to the app's lookups directory
LOOKUPS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'lookups')

class LookupWriterHandler(admin.MConfigHandler):
    """REST handler for lookup file operations."""

    def setup(self):
        """Set up supported arguments."""
        if self.requestedAction == admin.ACTION_CREATE:
            # For adding/updating entries
            self.supportedArgs.addOptArg('search_name')
            self.supportedArgs.addOptArg('search_owner')
            self.supportedArgs.addOptArg('search_app')
            self.supportedArgs.addOptArg('flagged_by')
            self.supportedArgs.addOptArg('flagged_time')
            self.supportedArgs.addOptArg('notification_sent')
            self.supportedArgs.addOptArg('notification_time')
            self.supportedArgs.addOptArg('remediation_deadline')
            self.supportedArgs.addOptArg('status')
            self.supportedArgs.addOptArg('reason')
            self.supportedArgs.addOptArg('notes')
            self.supportedArgs.addOptArg('action')  # add, update, delete
            self.supportedArgs.addOptArg('lookup')  # lookup filename

    def handleCreate(self, confInfo):
        """Handle POST requests to write to lookups."""
        try:
            action = self.callerArgs.data.get('action', ['add'])[0]
            lookup = self.callerArgs.data.get('lookup', ['flagged_searches.csv'])[0]
            lookup_path = os.path.join(LOOKUPS_DIR, lookup)

            # Get the entry data
            entry = {
                'search_name': self.callerArgs.data.get('search_name', [''])[0],
                'search_owner': self.callerArgs.data.get('search_owner', [''])[0],
                'search_app': self.callerArgs.data.get('search_app', [''])[0],
                'flagged_by': self.callerArgs.data.get('flagged_by', [''])[0],
                'flagged_time': self.callerArgs.data.get('flagged_time', [str(int(time.time()))])[0],
                'notification_sent': self.callerArgs.data.get('notification_sent', ['0'])[0],
                'notification_time': self.callerArgs.data.get('notification_time', ['0'])[0],
                'remediation_deadline': self.callerArgs.data.get('remediation_deadline', ['0'])[0],
                'status': self.callerArgs.data.get('status', ['pending'])[0],
                'reason': self.callerArgs.data.get('reason', [''])[0],
                'notes': self.callerArgs.data.get('notes', [''])[0],
            }

            # Read existing data
            rows = []
            headers = ['search_name', 'search_owner', 'search_app', 'flagged_by', 'flagged_time',
                      'notification_sent', 'notification_time', 'remediation_deadline', 'status', 'reason', 'notes']

            if os.path.exists(lookup_path):
                with open(lookup_path, 'r', newline='') as f:
                    reader = csv.DictReader(f)
                    headers = reader.fieldnames or headers
                    rows = list(reader)

            # Apply action
            if action == 'add':
                # Remove existing entry if present, then add new
                rows = [r for r in rows if r.get('search_name') != entry['search_name']]
                rows.append(entry)
            elif action == 'update':
                # Update existing entry or add if not found
                found = False
                for i, r in enumerate(rows):
                    if r.get('search_name') == entry['search_name']:
                        rows[i].update(entry)
                        found = True
                        break
                if not found:
                    rows.append(entry)
            elif action == 'delete':
                rows = [r for r in rows if r.get('search_name') != entry['search_name']]
            elif action == 'update_status':
                # Just update status field
                for r in rows:
                    if r.get('search_name') == entry['search_name']:
                        r['status'] = entry['status']
                        if entry.get('notes'):
                            r['notes'] = entry['notes']
                        if entry.get('remediation_deadline') != '0':
                            r['remediation_deadline'] = entry['remediation_deadline']
                        if entry.get('notification_sent') != '0':
                            r['notification_sent'] = entry['notification_sent']
                        if entry.get('notification_time') != '0':
                            r['notification_time'] = entry['notification_time']
                        break

            # Write back to file
            with open(lookup_path, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=headers)
                writer.writeheader()
                writer.writerows(rows)

            confInfo['result'].append('success')
            confInfo['result']['message'] = f'Successfully performed {action} on {lookup}'

        except Exception as e:
            confInfo['result'].append('error')
            confInfo['result']['message'] = str(e)


# Initialize the handler
admin.init(LookupWriterHandler, admin.CONTEXT_NONE)

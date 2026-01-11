#!/usr/bin/env python3
"""
REST endpoint for updating lookup files in SA-cost-governance app.
This bypasses the outputlookup permission issues in certain environments.
"""

import csv
import io
import json
import os
import sys

# Add Splunk lib to path
sys.path.insert(0, os.path.join(os.environ.get('SPLUNK_HOME', '/opt/splunk'), 'lib', 'python3.9', 'site-packages'))

import splunk.admin as admin
import splunk.rest as rest


class UpdateLookupHandler(admin.MConfigHandler):
    """REST handler for updating governance lookup files."""

    def setup(self):
        """Set up the handler."""
        if self.requestedAction == admin.ACTION_EDIT:
            # Required args for update
            self.supportedArgs.addOptArg('lookup_name')
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
            self.supportedArgs.addOptArg('action')  # update, delete

    def handleList(self, confInfo):
        """Handle GET requests - return current lookup data."""
        confInfo['status'].append('ready', 'Lookup update endpoint ready')

    def handleEdit(self, confInfo):
        """Handle POST requests - update the lookup file."""
        try:
            lookup_name = self.callerArgs.data.get('lookup_name', ['flagged_searches.csv'])[0]
            action = self.callerArgs.data.get('action', ['update'])[0]
            search_name = self.callerArgs.data.get('search_name', [''])[0]

            if not search_name:
                raise Exception("search_name is required")

            # Get lookup file path
            app_path = os.path.join(os.environ.get('SPLUNK_HOME', '/opt/splunk'),
                                     'etc', 'apps', 'SA-cost-governance', 'lookups')
            lookup_path = os.path.join(app_path, lookup_name)

            # Read current lookup data
            rows = []
            fieldnames = ['search_name', 'search_owner', 'search_app', 'flagged_by',
                          'flagged_time', 'notification_sent', 'notification_time',
                          'remediation_deadline', 'status', 'reason', 'notes']

            if os.path.exists(lookup_path):
                with open(lookup_path, 'r', newline='') as f:
                    reader = csv.DictReader(f)
                    fieldnames = reader.fieldnames or fieldnames
                    rows = list(reader)

            # Find and update or add the record
            found = False
            new_data = {
                'search_name': search_name,
                'search_owner': self.callerArgs.data.get('search_owner', ['unknown'])[0],
                'search_app': self.callerArgs.data.get('search_app', ['unknown'])[0],
                'flagged_by': self.callerArgs.data.get('flagged_by', ['admin'])[0],
                'flagged_time': self.callerArgs.data.get('flagged_time', [''])[0],
                'notification_sent': self.callerArgs.data.get('notification_sent', ['0'])[0],
                'notification_time': self.callerArgs.data.get('notification_time', ['0'])[0],
                'remediation_deadline': self.callerArgs.data.get('remediation_deadline', ['0'])[0],
                'status': self.callerArgs.data.get('status', ['pending'])[0],
                'reason': self.callerArgs.data.get('reason', [''])[0],
                'notes': self.callerArgs.data.get('notes', [''])[0]
            }

            if action == 'delete':
                # Remove the record
                rows = [r for r in rows if r.get('search_name') != search_name]
            else:
                # Update or add
                for i, row in enumerate(rows):
                    if row.get('search_name') == search_name:
                        # Merge: only update non-empty values
                        for key, value in new_data.items():
                            if value and value != 'undefined':
                                rows[i][key] = value
                        found = True
                        break

                if not found:
                    rows.append(new_data)

            # Filter out 'ok' status (they go to different lookup)
            if lookup_name == 'flagged_searches.csv':
                rows = [r for r in rows if r.get('status') != 'ok']

            # Write updated lookup
            with open(lookup_path, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                for row in rows:
                    writer.writerow(row)

            confInfo['result'].append('success', 'Lookup updated successfully')
            confInfo['result'].append('search_name', search_name)
            confInfo['result'].append('action', action)

        except Exception as e:
            confInfo['error'].append('error', str(e))


# Initialize the handler
admin.init(UpdateLookupHandler, admin.CONTEXT_NONE)

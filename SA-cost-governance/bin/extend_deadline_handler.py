#!/usr/bin/env python3
"""
REST handler for extending search deadlines using admin framework.
Directly modifies the CSV lookup file to bypass outputlookup permission issues.
"""
import sys
import os
import csv
import time

# Add Splunk Python libs
sys.path.insert(0, os.path.join(os.environ.get("SPLUNK_HOME", "/opt/splunk"), "lib", "python3.9", "site-packages"))

import splunk.admin as admin


class ExtendDeadlineHandler(admin.MConfigHandler):
    """Admin REST handler for extending/reducing search remediation deadlines."""

    def setup(self):
        """Setup supported arguments."""
        if self.requestedAction == admin.ACTION_EDIT:
            self.supportedArgs.addReqArg("search_name")
            self.supportedArgs.addReqArg("days")

    def handleEdit(self, confInfo):
        """Handle POST/edit request - extend/reduce deadline."""
        try:
            search_name = self.callerArgs.data["search_name"][0]
            days = int(self.callerArgs.data["days"][0])

            lookup_path = "/opt/splunk/etc/apps/SA-cost-governance/lookups/flagged_searches.csv"

            if not os.path.exists(lookup_path):
                confInfo["result"].append("status", "error")
                confInfo["result"].append("message", "Lookup file not found")
                return

            # Read current data
            with open(lookup_path, "r") as f:
                reader = csv.DictReader(f)
                rows = list(reader)
                fieldnames = reader.fieldnames

            # Find and update the target row
            now = int(time.time())
            updated = False
            new_deadline = 0

            for row in rows:
                if row["search_name"] == search_name:
                    current = int(row.get("remediation_deadline", 0) or 0)
                    extension = days * 86400
                    # Use max(now, current + extension) to floor at current time
                    new_deadline = max(now, current + extension)
                    row["remediation_deadline"] = str(new_deadline)
                    updated = True
                    break

            if not updated:
                confInfo["result"].append("status", "error")
                confInfo["result"].append("message", "Search not found: " + search_name)
                return

            # Write back
            with open(lookup_path, "w") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
                writer.writeheader()
                writer.writerows(rows)

            confInfo["result"].append("status", "success")
            confInfo["result"].append("new_deadline", str(new_deadline))
            confInfo["result"].append("search_name", search_name)
            confInfo["result"].append("days_extended", str(days))

        except Exception as e:
            confInfo["result"].append("status", "error")
            confInfo["result"].append("message", str(e))

    def handleList(self, confInfo):
        """Handle GET/list request - return status."""
        confInfo["info"].append("status", "ready")
        confInfo["info"].append("message", "Extend deadline endpoint is available")


admin.init(ExtendDeadlineHandler, admin.CONTEXT_NONE)

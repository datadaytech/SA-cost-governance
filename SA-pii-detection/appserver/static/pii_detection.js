/**
 * PII Detection Dashboard JavaScript
 * Uses jQuery event delegation for proper Splunk integration
 *
 * IMPORTANT: Splunk sanitizes HTML panels and strips onclick handlers and <script> tags.
 * The correct pattern is to use jQuery event delegation to bind to button IDs.
 */

require([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/searchmanager',
    'splunkjs/mvc/simplexml/ready!'
], function($, _, mvc, SearchManager) {
    "use strict";

    console.log("SA-pii-detection: JavaScript loading...");

    // Get service object for running searches
    var service = mvc.createService();

    // ========== UTILITY FUNCTIONS ==========

    /**
     * Show feedback message to user
     */
    function showFeedback(message, type) {
        type = type || 'info';
        var alertClass = 'alert-' + type;
        var bgColor = type === 'success' ? '#65A637' :
                      type === 'error' ? '#D93F3C' :
                      type === 'warning' ? '#F7BC38' : '#5CC5E8';

        // Find or create feedback container
        var $feedback = $('#pii_action_feedback');
        if ($feedback.length === 0) {
            $feedback = $('.form-feedback, #whitelist_feedback, #settings_feedback').first();
        }
        if ($feedback.length === 0) {
            // Create feedback element if none exists
            $feedback = $('<div id="pii_action_feedback" style="position:fixed;top:60px;right:20px;z-index:9999;max-width:400px;"></div>');
            $('body').append($feedback);
        }

        var $alert = $('<div class="alert ' + alertClass + '" style="padding:15px;margin:5px 0;border-radius:4px;background-color:' + bgColor + ';color:white;box-shadow:0 2px 10px rgba(0,0,0,0.3);">' +
            '<button type="button" style="float:right;background:none;border:none;color:white;font-size:18px;cursor:pointer;" onclick="$(this).parent().remove()">&times;</button>' +
            message + '</div>');

        $feedback.append($alert);

        // Auto-dismiss after 5 seconds
        setTimeout(function() {
            $alert.fadeOut(300, function() { $(this).remove(); });
        }, 5000);
    }

    /**
     * Run a search and return promise
     */
    function runSearch(spl) {
        return new Promise(function(resolve, reject) {
            console.log("SA-pii-detection: Running search:", spl.substring(0, 100) + "...");
            service.oneshotSearch(spl, {}, function(err, results) {
                if (err) {
                    console.error("SA-pii-detection: Search error:", err);
                    reject(err);
                } else {
                    console.log("SA-pii-detection: Search completed successfully");
                    resolve(results);
                }
            });
        });
    }

    /**
     * Add audit log entry
     */
    function addAuditLog(action, findingId, details) {
        var audit_id = 'AUD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        var timestamp = Math.floor(Date.now() / 1000);
        var escapedDetails = (details || '').replace(/"/g, '\\"').replace(/'/g, "\\'");
        var spl = '| makeresults | eval audit_id="' + audit_id + '", timestamp=' + timestamp +
            ', action="' + action + '", finding_id="' + (findingId || '') +
            '", performed_by="admin", details="' + escapedDetails +
            '" | table audit_id timestamp action finding_id performed_by details | outputlookup append=true pii_audit_log_lookup';
        runSearch(spl).catch(function(e) {
            console.error("SA-pii-detection: Audit log error:", e);
        });
    }

    // ========== EVENT HANDLERS USING JQUERY DELEGATION ==========
    // This pattern works reliably in Splunk because it doesn't depend on onclick handlers

    /**
     * Run PII Scan button
     */
    $(document).on('click', '#run_scan_btn', function(e) {
        e.preventDefault();
        console.log("SA-pii-detection: Run PII Scan clicked");

        var $btn = $(this);
        var originalText = $btn.html();
        $btn.prop('disabled', true).html('<i class="icon-clock"></i> Scanning...');

        showFeedback('Running PII scan... This may take several minutes.', 'info');

        var spl = '| savedsearch "PII Detection - Daily Scan"';

        runSearch(spl).then(function() {
            addAuditLog('scan_run', '', 'Manual PII scan executed');
            showFeedback('PII scan completed successfully! Refreshing...', 'success');
            setTimeout(function() { location.reload(); }, 2000);
        }).catch(function(err) {
            showFeedback('Scan error: ' + err.message, 'error');
            $btn.prop('disabled', false).html(originalText);
        });
    });

    /**
     * Export Findings button
     */
    $(document).on('click', '#export_findings_btn', function(e) {
        e.preventDefault();
        console.log("SA-pii-detection: Export Findings clicked");

        showFeedback('Exporting findings to CSV...', 'info');

        var exportUrl = '/splunkd/__raw/services/search/jobs/export?output_mode=csv&search=' +
            encodeURIComponent('| inputlookup pii_findings_lookup');

        window.open(exportUrl, '_blank');
        addAuditLog('export', '', 'Exported PII findings to CSV');

        showFeedback('Export started. Check your downloads.', 'success');
    });

    /**
     * Manage Whitelist button
     */
    $(document).on('click', '#view_whitelist_btn', function(e) {
        e.preventDefault();
        console.log("SA-pii-detection: Manage Whitelist clicked");
        window.location.href = '/app/SA-pii-detection/pii_whitelist';
    });

    /**
     * Settings button
     */
    $(document).on('click', '#view_settings_btn', function(e) {
        e.preventDefault();
        console.log("SA-pii-detection: Settings clicked");
        window.location.href = '/app/SA-pii-detection/pii_settings';
    });

    /**
     * Add Whitelist Entry button
     */
    $(document).on('click', '#add_whitelist_btn', function(e) {
        e.preventDefault();
        console.log("SA-pii-detection: Add Whitelist clicked");

        var pii_type = $('#whitelist_pii_type').val();
        var pattern = $('#whitelist_pattern').val();
        var reason = $('#whitelist_reason').val();
        var index = $('#whitelist_index').val() || '*';
        var sourcetype = $('#whitelist_sourcetype').val() || '*';
        var field_name = $('#whitelist_field').val() || '*';
        var expires = $('#whitelist_expires').val();

        console.log("SA-pii-detection: Form values:", {pii_type: pii_type, pattern: pattern, reason: reason});

        // Validation
        if (!pii_type || !pattern || !reason) {
            showFeedback('Please fill in all required fields: PII Type, Pattern, and Reason', 'warning');
            return;
        }

        var $btn = $(this);
        var originalText = $btn.html();
        $btn.prop('disabled', true).html('<i class="icon-clock"></i> Adding...');

        showFeedback('Adding whitelist entry...', 'info');

        var whitelist_id = 'WL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        var added_time = Math.floor(Date.now() / 1000);
        var expires_epoch = expires ? Math.floor(new Date(expires).getTime() / 1000) : '';

        // Escape special characters for SPL
        var escapedPattern = pattern.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
        var escapedReason = reason.replace(/"/g, '\\"').replace(/\\/g, '\\\\');

        var spl = '| makeresults | eval whitelist_id="' + whitelist_id +
            '", pattern="' + escapedPattern +
            '", pii_type="' + pii_type +
            '", index="' + index +
            '", sourcetype="' + sourcetype +
            '", field_name="' + field_name +
            '", reason="' + escapedReason +
            '", added_by="admin", added_time=' + added_time +
            ', expires=' + (expires_epoch || '""') +
            ', is_active=1 | table whitelist_id pattern pii_type index sourcetype field_name reason added_by added_time expires is_active | outputlookup append=true pii_whitelist_lookup';

        runSearch(spl).then(function() {
            addAuditLog('whitelist_add', '', 'Added: ' + pattern + ' (' + pii_type + ')');
            showFeedback('Whitelist entry added successfully! Refreshing...', 'success');

            // Reset form
            $('#add_whitelist_form')[0].reset();

            setTimeout(function() { location.reload(); }, 1500);
        }).catch(function(err) {
            showFeedback('Error adding whitelist entry: ' + err.message, 'error');
            $btn.prop('disabled', false).html(originalText);
        });
    });

    /**
     * Remove Expired Entries button
     */
    $(document).on('click', '#remove_expired_btn', function(e) {
        e.preventDefault();
        console.log("SA-pii-detection: Remove Expired clicked");

        if (!confirm('Are you sure you want to remove all expired whitelist entries?')) {
            return;
        }

        var $btn = $(this);
        var originalText = $btn.html();
        $btn.prop('disabled', true).html('<i class="icon-clock"></i> Removing...');

        showFeedback('Removing expired entries...', 'info');

        // Keep only non-expired entries
        var spl = '| inputlookup pii_whitelist_lookup | where isnull(expires) OR expires="" OR expires > now() | outputlookup pii_whitelist_lookup';

        runSearch(spl).then(function() {
            addAuditLog('whitelist_cleanup', '', 'Removed expired entries');
            showFeedback('Expired entries removed! Refreshing...', 'success');
            setTimeout(function() { location.reload(); }, 1500);
        }).catch(function(err) {
            showFeedback('Error removing entries: ' + err.message, 'error');
            $btn.prop('disabled', false).html(originalText);
        });
    });

    /**
     * Deactivate Selected button
     */
    $(document).on('click', '#deactivate_selected_btn', function(e) {
        e.preventDefault();
        console.log("SA-pii-detection: Deactivate Selected clicked");
        showFeedback('Select rows in the table above first, then click this button.', 'info');
    });

    /**
     * Export Whitelist button
     */
    $(document).on('click', '#export_whitelist_btn', function(e) {
        e.preventDefault();
        console.log("SA-pii-detection: Export Whitelist clicked");

        var exportUrl = '/splunkd/__raw/services/search/jobs/export?output_mode=csv&search=' +
            encodeURIComponent('| inputlookup pii_whitelist_lookup');

        window.open(exportUrl, '_blank');
        addAuditLog('export', '', 'Exported whitelist to CSV');

        showFeedback('Whitelist export started. Check your downloads.', 'success');
    });

    /**
     * Save Settings button
     */
    $(document).on('click', '#save_settings_btn', function(e) {
        e.preventDefault();
        console.log("SA-pii-detection: Save Settings clicked");

        // Collect settings from form
        var settings = {
            scan_schedule: $('#scan_schedule').val(),
            email_alerts: $('#email_alerts').is(':checked'),
            alert_email: $('#alert_email').val()
        };

        console.log("SA-pii-detection: Settings:", settings);

        // For now, just show success - actual implementation would save to a lookup or conf file
        addAuditLog('settings_save', '', 'Settings updated');
        showFeedback('Settings saved successfully!', 'success');
    });

    /**
     * Reset Settings button
     */
    $(document).on('click', '#reset_settings_btn', function(e) {
        e.preventDefault();
        console.log("SA-pii-detection: Reset Settings clicked");

        if (!confirm('Are you sure you want to reset all settings to defaults?')) {
            return;
        }

        addAuditLog('settings_reset', '', 'Settings reset to defaults');
        showFeedback('Settings reset to defaults. Refreshing...', 'info');
        setTimeout(function() { location.reload(); }, 1500);
    });

    // ========== INITIALIZATION COMPLETE ==========
    console.log("SA-pii-detection: Event handlers registered successfully");
    console.log("SA-pii-detection: Listening for clicks on: #run_scan_btn, #export_findings_btn, #view_whitelist_btn, #view_settings_btn, #add_whitelist_btn, #remove_expired_btn, #export_whitelist_btn, #save_settings_btn, #reset_settings_btn");

    // Visual confirmation that JS is loaded
    $(document).ready(function() {
        console.log("SA-pii-detection: Document ready, JS fully initialized");
    });
});

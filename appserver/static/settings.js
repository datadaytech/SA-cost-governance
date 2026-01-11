/**
 * SA Topology Analyzer - Settings Page JavaScript
 * Handles settings management, KV Store operations, and scheduled search configuration
 * Includes fallback to CSV lookups when KV Store is unavailable
 */

require([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/searchmanager',
    'splunkjs/mvc/simplexml/ready!'
], function($, _, mvc, SearchManager) {
    'use strict';

    console.log('SA Topology Settings: Initializing...');

    var appName = 'sa-topology';
    var kvStoreAvailable = null; // Will be set after checking
    var storageMode = 'unknown'; // 'kvstore' or 'csv'

    // KV Store REST API helper
    var KVStore = {
        baseUrl: '/splunkd/__raw/servicesNS/nobody/' + appName + '/storage/collections/data/',

        // Get a setting from KV Store
        get: function(collection, key, callback) {
            $.ajax({
                url: this.baseUrl + collection + '/' + encodeURIComponent(key),
                type: 'GET',
                dataType: 'json',
                success: function(data) {
                    callback(null, data);
                },
                error: function(xhr) {
                    if (xhr.status === 404) {
                        callback(null, null);
                    } else {
                        callback(xhr.responseText || 'Error fetching data');
                    }
                }
            });
        },

        // Set a setting in KV Store
        set: function(collection, key, value, callback) {
            var data = {
                _key: key,
                setting_key: key,
                setting_value: JSON.stringify(value),
                updated_by: Splunk.util.getConfigValue('USERNAME'),
                updated_time: new Date().toISOString()
            };

            // Try to update first, then insert if not found
            $.ajax({
                url: this.baseUrl + collection + '/' + encodeURIComponent(key),
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: function() {
                    callback(null, true);
                },
                error: function(xhr) {
                    // If not found, create new
                    if (xhr.status === 404) {
                        $.ajax({
                            url: KVStore.baseUrl + collection,
                            type: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify(data),
                            success: function() {
                                callback(null, true);
                            },
                            error: function(xhr2) {
                                callback(xhr2.responseText || 'Error saving data');
                            }
                        });
                    } else {
                        callback(xhr.responseText || 'Error saving data');
                    }
                }
            });
        },

        // Delete all data from a collection
        deleteAll: function(collection, callback) {
            $.ajax({
                url: this.baseUrl + collection,
                type: 'DELETE',
                success: function() {
                    callback(null, true);
                },
                error: function(xhr) {
                    callback(xhr.responseText || 'Error deleting data');
                }
            });
        },

        // Check if KV Store is available
        checkAvailability: function(callback) {
            $.ajax({
                url: '/splunkd/__raw/services/server/info?output_mode=json',
                type: 'GET',
                dataType: 'json',
                success: function(data) {
                    var status = 'failed';
                    try {
                        status = data.entry[0].content.kvStoreStatus;
                    } catch (e) {
                        console.warn('Could not parse KV Store status');
                    }
                    callback(null, status === 'ready');
                },
                error: function(xhr) {
                    callback(null, false);
                }
            });
        }
    };

    // CSV-based storage helper (fallback when KV Store unavailable)
    var CSVStorage = {
        // Get a setting from CSV lookup via SPL search
        get: function(key, callback) {
            var search = new SearchManager({
                id: 'csvGet_' + key + '_' + Date.now(),
                search: '| inputlookup sa_topology_settings_csv | search setting_key="' + key + '"',
                earliest_time: '-24h@h',
                latest_time: 'now',
                autostart: true
            });

            search.data('results').on('data', function(results) {
                if (results.hasData()) {
                    var rows = results.data().rows;
                    var fields = results.data().fields;
                    if (rows && rows.length > 0) {
                        var valueIdx = fields.indexOf('setting_value');
                        if (valueIdx >= 0) {
                            callback(null, { setting_value: rows[0][valueIdx] });
                            return;
                        }
                    }
                }
                callback(null, null);
            });

            search.on('search:error', function(err) {
                callback(err);
            });
        },

        // Set a setting in CSV lookup via SPL search
        set: function(key, value, callback) {
            var valueStr = typeof value === 'string' ? value : JSON.stringify(value);
            var timestamp = new Date().toISOString();
            var username = Splunk.util.getConfigValue('USERNAME') || 'unknown';

            // Use outputlookup append=t to add/update
            var search = new SearchManager({
                id: 'csvSet_' + key + '_' + Date.now(),
                search: '| makeresults | eval setting_key="' + key + '", setting_value="' + valueStr.replace(/"/g, '\\"') + '", updated_by="' + username + '", updated_time="' + timestamp + '" | outputlookup append=t sa_topology_settings_csv',
                earliest_time: '-24h@h',
                latest_time: 'now',
                autostart: true
            });

            search.on('search:done', function() {
                callback(null, true);
            });

            search.on('search:error', function(err) {
                callback(err);
            });
        }
    };

    // Unified storage interface that uses KV Store or CSV based on availability
    var Storage = {
        get: function(key, callback) {
            if (storageMode === 'kvstore') {
                KVStore.get('sa_topology_settings', key, callback);
            } else {
                CSVStorage.get(key, callback);
            }
        },

        set: function(key, value, callback) {
            if (storageMode === 'kvstore') {
                KVStore.set('sa_topology_settings', key, value, callback);
            } else {
                CSVStorage.set(key, value, callback);
            }
        }
    };

    // Load schedule settings directly from the saved search configuration
    // This is the authoritative source for the cron schedule
    function loadScheduleFromSavedSearch() {
        console.log('SA Topology Settings: Loading schedule from saved search configuration...');

        $.ajax({
            url: '/splunkd/__raw/servicesNS/nobody/' + appName + '/saved/searches/SA%20Topology%20-%20Scheduled%20Discovery%20-%20Nodes?output_mode=json',
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                try {
                    var entry = data.entry[0].content;
                    var cronSchedule = entry.cron_schedule || '3 2 * * *';
                    var isScheduled = entry.is_scheduled;

                    // Parse cron schedule (minute hour * * *)
                    var cronParts = cronSchedule.split(' ');
                    var minute = cronParts[0] || '3';
                    var hour = cronParts[1] || '2';

                    console.log('SA Topology Settings: Loaded cron schedule:', cronSchedule, 'enabled:', isScheduled);

                    // Update UI with actual values from saved search
                    $('#schedule-minute').val(minute);
                    $('#schedule-hour').val(hour);
                    $('#enable-scheduled').prop('checked', isScheduled === true || isScheduled === '1' || isScheduled === 1);
                    $('#schedule-status').text(isScheduled ? 'Enabled' : 'Disabled');

                    if (isScheduled) {
                        $('#schedule-status').addClass('active');
                        $('#schedule-badge').text('Active').removeClass('warning');
                    } else {
                        $('#schedule-status').removeClass('active');
                        $('#schedule-badge').text('Disabled').addClass('warning');
                    }
                } catch (e) {
                    console.warn('SA Topology Settings: Could not parse saved search config:', e);
                }
            },
            error: function(xhr) {
                console.warn('SA Topology Settings: Could not load saved search config:', xhr.responseText);
                // Fall back to defaults
                $('#schedule-hour').val('2');
                $('#schedule-minute').val('3');
            }
        });
    }

    // Load settings using the unified Storage interface
    function loadSettings() {
        console.log('SA Topology Settings: Loading settings using', storageMode, 'storage...');

        // Helper to parse setting value
        function parseValue(data) {
            if (!data || !data.setting_value) return null;
            try {
                return JSON.parse(data.setting_value);
            } catch (e) {
                return data.setting_value; // Return raw value if not JSON
            }
        }

        // Load schedule settings from the actual saved search configuration
        // This ensures we always show the real scheduled values
        loadScheduleFromSavedSearch();

        // Also load from KV Store for other settings
        Storage.get('discovery_range', function(err, data) {
            if (!err && data) {
                var val = parseValue(data);
                if (val !== null) $('#discovery-range').val(val);
            }
        });

        Storage.get('default_view_mode', function(err, data) {
            if (!err && data) {
                var val = parseValue(data);
                if (val !== null) $('#default-view-mode').val(val);
            }
        });

        Storage.get('warning_threshold', function(err, data) {
            if (!err && data) {
                var val = parseValue(data);
                if (val !== null) $('#warning-threshold').val(val);
            }
        });

        Storage.get('critical_threshold', function(err, data) {
            if (!err && data) {
                var val = parseValue(data);
                if (val !== null) $('#critical-threshold').val(val);
            }
        });
    }

    // Get lookup name based on storage mode
    function getNodesLookup() {
        return storageMode === 'kvstore' ? 'sa_topology_nodes_lookup' : 'sa_topology_nodes_csv';
    }

    function getConnectionsLookup() {
        return storageMode === 'kvstore' ? 'sa_topology_connections_lookup' : 'sa_topology_connections_csv';
    }

    // Load discovery status
    function loadDiscoveryStatus() {
        console.log('SA Topology Settings: Loading discovery status using', storageMode, 'storage...');

        var nodesLookup = getNodesLookup();
        var connectionsLookup = getConnectionsLookup();

        // Get node count
        var nodeCountSearch = new SearchManager({
            id: 'nodeCountSearch_' + Date.now(),
            search: '| inputlookup ' + nodesLookup + ' | stats count',
            earliest_time: '-24h@h',
            latest_time: 'now',
            autostart: true
        });

        nodeCountSearch.data('results').on('data', function(results) {
            if (results.hasData()) {
                var rows = results.data().rows;
                if (rows && rows.length > 0) {
                    var count = rows[0][0] || '0';
                    $('#node-count').text(count);

                    if (parseInt(count) > 0) {
                        $('#status-icon').html('&#10003;').addClass('success');
                        $('#last-discovery-time').text('Data available');
                    } else {
                        $('#status-icon').html('&#8987;').removeClass('success');
                        $('#last-discovery-time').text('No data yet');
                    }
                }
            }
        });

        // Get connection count
        var connCountSearch = new SearchManager({
            id: 'connCountSearch_' + Date.now(),
            search: '| inputlookup ' + connectionsLookup + ' | stats count',
            earliest_time: '-24h@h',
            latest_time: 'now',
            autostart: true
        });

        connCountSearch.data('results').on('data', function(results) {
            if (results.hasData()) {
                var rows = results.data().rows;
                if (rows && rows.length > 0) {
                    $('#connection-count').text(rows[0][0] || '0');
                }
            }
        });

        // Get last discovery time from nodes
        var lastSeenSearch = new SearchManager({
            id: 'lastSeenSearch_' + Date.now(),
            search: '| inputlookup ' + nodesLookup + ' | stats max(last_seen) as last_seen | eval last_seen_human=strftime(last_seen, "%Y-%m-%d %H:%M:%S")',
            earliest_time: '-24h@h',
            latest_time: 'now',
            autostart: true
        });

        lastSeenSearch.data('results').on('data', function(results) {
            if (results.hasData()) {
                var rows = results.data().rows;
                var fields = results.data().fields;
                if (rows && rows.length > 0) {
                    var humanIdx = fields.indexOf('last_seen_human');
                    if (humanIdx >= 0 && rows[0][humanIdx]) {
                        $('#last-discovery-time').text(rows[0][humanIdx]);
                        $('#status-icon').html('&#10003;').addClass('success');
                    }
                }
            }
        });

        // Calculate next run based on current schedule
        var hour = parseInt($('#schedule-hour').val()) || 2;
        var minute = parseInt($('#schedule-minute').val()) || 3;
        var now = new Date();
        var nextRun = new Date(now);
        nextRun.setHours(hour, minute, 0, 0);

        if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
        }

        var timeUntil = nextRun - now;
        var hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
        var minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

        $('#next-run').text(hoursUntil + 'h ' + minutesUntil + 'm');
    }

    // Save schedule settings
    function saveScheduleSettings() {
        var enabled = $('#enable-scheduled').is(':checked');
        var hour = $('#schedule-hour').val();
        var minute = $('#schedule-minute').val();
        var range = $('#discovery-range').val();

        var settings = [
            { key: 'schedule_enabled', value: enabled },
            { key: 'schedule_hour', value: hour },
            { key: 'schedule_minute', value: minute },
            { key: 'discovery_range', value: range }
        ];

        var saved = 0;
        var errors = [];

        settings.forEach(function(setting) {
            Storage.set(setting.key, setting.value, function(err) {
                saved++;
                if (err) errors.push(err);

                if (saved === settings.length) {
                    if (errors.length > 0) {
                        showNotification('Error saving some settings', 'error');
                    } else {
                        showNotification('Schedule settings saved successfully', 'success');
                        // Update the saved search cron schedule via REST API
                        updateSavedSearchSchedule(hour, minute, enabled);
                    }
                }
            });
        });
    }

    // Update the saved search schedule via REST API
    function updateSavedSearchSchedule(hour, minute, enabled) {
        var cronSchedule = minute + ' ' + hour + ' * * *';

        // Update nodes search
        $.ajax({
            url: '/splunkd/__raw/servicesNS/nobody/' + appName + '/saved/searches/SA%20Topology%20-%20Scheduled%20Discovery%20-%20Nodes',
            type: 'POST',
            data: {
                'cron_schedule': cronSchedule,
                'is_scheduled': enabled ? 1 : 0
            },
            success: function() {
                console.log('SA Topology Settings: Nodes search schedule updated');
            },
            error: function(xhr) {
                console.warn('SA Topology Settings: Could not update nodes search schedule', xhr.responseText);
            }
        });

        // Update connections search (run 2 minutes after nodes)
        var connMinute = (parseInt(minute) + 2) % 60;
        var connHour = parseInt(hour);
        if (parseInt(minute) + 2 >= 60) connHour = (connHour + 1) % 24;

        var connCronSchedule = connMinute + ' ' + connHour + ' * * *';

        $.ajax({
            url: '/splunkd/__raw/servicesNS/nobody/' + appName + '/saved/searches/SA%20Topology%20-%20Scheduled%20Discovery%20-%20Connections',
            type: 'POST',
            data: {
                'cron_schedule': connCronSchedule,
                'is_scheduled': enabled ? 1 : 0
            },
            success: function() {
                console.log('SA Topology Settings: Connections search schedule updated');
            },
            error: function(xhr) {
                console.warn('SA Topology Settings: Could not update connections search schedule', xhr.responseText);
            }
        });

        loadDiscoveryStatus();
    }

    // Save advanced settings
    function saveAdvancedSettings() {
        var viewMode = $('#default-view-mode').val();
        var warningThreshold = $('#warning-threshold').val();
        var criticalThreshold = $('#critical-threshold').val();

        var settings = [
            { key: 'default_view_mode', value: viewMode },
            { key: 'warning_threshold', value: warningThreshold },
            { key: 'critical_threshold', value: criticalThreshold }
        ];

        var saved = 0;
        var errors = [];

        settings.forEach(function(setting) {
            Storage.set(setting.key, setting.value, function(err) {
                saved++;
                if (err) errors.push(err);

                if (saved === settings.length) {
                    if (errors.length > 0) {
                        showNotification('Error saving some settings', 'error');
                    } else {
                        showNotification('Advanced settings saved successfully', 'success');
                    }
                }
            });
        });
    }

    // Run discovery now
    function runDiscoveryNow() {
        showNotification('Starting topology discovery...', 'info');

        $('#run-now-btn').prop('disabled', true).text('Running...');
        $('#status-icon').html('&#8987;').removeClass('success warning error');

        // Run nodes discovery
        var nodesSearch = new SearchManager({
            id: 'runNodesNow_' + Date.now(),
            search: '| savedsearch "SA Topology - Scheduled Discovery - Nodes"',
            earliest_time: '-24h@h',
            latest_time: 'now',
            autostart: true
        });

        nodesSearch.on('search:done', function() {
            console.log('SA Topology Settings: Nodes discovery complete');

            // Run connections discovery
            var connSearch = new SearchManager({
                id: 'runConnNow_' + Date.now(),
                search: '| savedsearch "SA Topology - Scheduled Discovery - Connections"',
                earliest_time: '-24h@h',
                latest_time: 'now',
                autostart: true
            });

            connSearch.on('search:done', function() {
                console.log('SA Topology Settings: Connections discovery complete');
                $('#run-now-btn').prop('disabled', false).text('Run Discovery Now');
                $('#status-icon').html('&#10003;').addClass('success');
                showNotification('Discovery complete! Topology data updated.', 'success');
                loadDiscoveryStatus();
            });

            connSearch.on('search:error', function(err) {
                console.error('SA Topology Settings: Connections discovery error', err);
                $('#run-now-btn').prop('disabled', false).text('Run Discovery Now');
                showNotification('Connections discovery failed: ' + err, 'error');
            });
        });

        nodesSearch.on('search:error', function(err) {
            console.error('SA Topology Settings: Nodes discovery error', err);
            $('#run-now-btn').prop('disabled', false).text('Run Discovery Now');
            showNotification('Nodes discovery failed: ' + err, 'error');
        });
    }

    // Clear KV Store cache
    function clearCache() {
        if (!confirm('Are you sure you want to clear all cached topology data? The visualization will be empty until the next discovery run.')) {
            return;
        }

        KVStore.deleteAll('sa_topology_nodes', function(err1) {
            KVStore.deleteAll('sa_topology_connections', function(err2) {
                if (err1 || err2) {
                    showNotification('Error clearing cache', 'error');
                } else {
                    showNotification('Cache cleared successfully', 'success');
                    loadDiscoveryStatus();
                }
            });
        });
    }

    // Show notification (premium style)
    function showNotification(message, type) {
        // Remove any existing notifications
        $('.notification').remove();

        var icon = type === 'success' ? '&#10003;' : (type === 'error' ? '&#10007;' : '&#9432;');
        var $notification = $('<div class="notification ' + type + '">' +
            '<div class="icon">' + icon + '</div>' +
            '<span class="message">' + message + '</span>' +
        '</div>');

        $('body').append($notification);

        setTimeout(function() {
            $notification.css({
                transition: 'all 0.3s ease',
                transform: 'translateX(120%)',
                opacity: 0
            });
            setTimeout(function() {
                $notification.remove();
            }, 300);
        }, 4000);
    }

    // Update UI to show storage mode indicator
    function updateStorageModeIndicator() {
        var $indicator = $('#storage-mode-indicator');
        if ($indicator.length === 0) {
            // Create indicator if it doesn't exist
            $indicator = $('<div id="storage-mode-indicator" class="storage-indicator"></div>');
            $('.settings-hero').append($indicator);
        }

        if (storageMode === 'kvstore') {
            $indicator.html('<span class="indicator-dot success"></span> KV Store Active')
                .removeClass('warning').addClass('success');
        } else {
            $indicator.html('<span class="indicator-dot warning"></span> CSV Fallback Mode')
                .removeClass('success').addClass('warning');
        }
    }

    // Initialize storage detection and load settings
    function initializeStorage(callback) {
        console.log('SA Topology Settings: Checking KV Store availability...');

        KVStore.checkAvailability(function(err, available) {
            kvStoreAvailable = available;
            storageMode = available ? 'kvstore' : 'csv';

            console.log('SA Topology Settings: Storage mode:', storageMode);
            updateStorageModeIndicator();

            if (callback) callback();
        });
    }

    // Initialize
    $(document).ready(function() {
        console.log('SA Topology Settings: DOM ready');

        // First detect storage availability, then load settings
        initializeStorage(function() {
            // Load current settings after storage mode is determined
            loadSettings();
            loadDiscoveryStatus();

            // Load saved view mode into segmented control
            Storage.get('default_view_mode', function(err, data) {
                if (!err && data && data.setting_value) {
                    var savedMode;
                    try {
                        savedMode = JSON.parse(data.setting_value);
                    } catch (e) {
                        savedMode = data.setting_value;
                    }
                    $('#view-mode-control .segment').removeClass('active');
                    $('#view-mode-control .segment[data-value="' + savedMode + '"]').addClass('active');
                    $('#view-mode-control').data('selectedValue', savedMode);
                }
            });
        });

        // Toggle switch handler
        $('#enable-scheduled').on('change', function() {
            var enabled = $(this).is(':checked');
            $('#schedule-status').text(enabled ? 'Enabled' : 'Disabled');
            if (enabled) {
                $('#schedule-status').addClass('active');
                $('#schedule-badge').text('Active').removeClass('warning');
            } else {
                $('#schedule-status').removeClass('active');
                $('#schedule-badge').text('Disabled').addClass('warning');
            }
        });

        // Segmented control handler for view mode
        $('#view-mode-control .segment').on('click', function() {
            var $this = $(this);
            var value = $this.data('value');

            // Update active state
            $('#view-mode-control .segment').removeClass('active');
            $this.addClass('active');

            // Store the value (will be saved when Save Preferences is clicked)
            $('#view-mode-control').data('selectedValue', value);
        });

        // Button handlers
        $('#save-schedule-btn').on('click', saveScheduleSettings);
        $('#run-now-btn').on('click', runDiscoveryNow);
        $('#save-advanced-btn').on('click', function() {
            // Get view mode from segmented control
            var viewMode = $('#view-mode-control').data('selectedValue') || 'cached';

            // Save view mode first
            Storage.set('default_view_mode', viewMode, function(err) {
                if (err) {
                    console.warn('Could not save view mode:', err);
                }
            });

            // Then save advanced settings
            saveAdvancedSettings();
        });
        $('#clear-cache-btn').on('click', clearCache);

        // Update next run time when schedule changes
        $('#schedule-hour, #schedule-minute').on('change', function() {
            loadDiscoveryStatus();
        });
    });
});

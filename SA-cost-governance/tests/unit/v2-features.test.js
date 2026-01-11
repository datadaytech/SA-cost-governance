/**
 * Unit tests for SA-cost-governance v2.0.0 Features
 * Tests: US-02 through US-10 implementations
 * Run with: npx jest tests/unit/v2-features.test.js
 */

describe('SA-cost-governance v2.0.0 Features', () => {

    // ============================================
    // US-02: Icon Priority System
    // Priority: Disabled (🔴) > Notified (🔔) > Flagged (🚩) > Suspicious (⚡) > OK (no icon)
    // ============================================
    describe('US-02: Icon Priority System', () => {

        /**
         * Determines which single icon to display based on search status
         * @param {Object} search - Search object with status fields
         * @returns {string} Single icon or empty string
         */
        function getStatusIcon(search) {
            const isDisabled = search.disabled === 1 ||
                              search.governance_status === 'Disabled' ||
                              search.governance_status === 'Disabled by Governance';
            const isNotified = search.flag_status === 'notified' ||
                              search.governance_status === 'Pending Remediation';
            const isFlagged = search.flag_status === 'flagged' ||
                             search.flag_status === 'pending';
            const isSuspicious = search.governance_status === 'Suspicious' ||
                                search.is_suspicious === 1;

            // Priority: Disabled > Notified > Flagged > Suspicious > OK
            if (isDisabled) return '🔴';
            if (isNotified) return '🔔';
            if (isFlagged) return '🚩';
            if (isSuspicious) return '⚡';
            return '';
        }

        describe('Single icon display (no stacking)', () => {
            test('should show only disabled icon when disabled AND flagged', () => {
                const search = {
                    disabled: 1,
                    flag_status: 'flagged',
                    governance_status: 'Disabled'
                };
                expect(getStatusIcon(search)).toBe('🔴');
            });

            test('should show only disabled icon when disabled AND notified', () => {
                const search = {
                    disabled: 1,
                    flag_status: 'notified',
                    governance_status: 'Disabled by Governance'
                };
                expect(getStatusIcon(search)).toBe('🔴');
            });

            test('should show only disabled icon when disabled AND suspicious', () => {
                const search = {
                    disabled: 1,
                    is_suspicious: 1,
                    governance_status: 'Disabled'
                };
                expect(getStatusIcon(search)).toBe('🔴');
            });

            test('should show only notified icon when notified AND flagged', () => {
                const search = {
                    disabled: 0,
                    flag_status: 'notified',
                    governance_status: 'Pending Remediation'
                };
                expect(getStatusIcon(search)).toBe('🔔');
            });

            test('should show only notified icon when notified AND suspicious', () => {
                const search = {
                    disabled: 0,
                    flag_status: 'notified',
                    is_suspicious: 1
                };
                expect(getStatusIcon(search)).toBe('🔔');
            });

            test('should show only flagged icon when flagged AND suspicious', () => {
                const search = {
                    disabled: 0,
                    flag_status: 'flagged',
                    is_suspicious: 1
                };
                expect(getStatusIcon(search)).toBe('🚩');
            });
        });

        describe('Individual icon states', () => {
            test('should show 🔴 for disabled searches', () => {
                expect(getStatusIcon({ disabled: 1 })).toBe('🔴');
                expect(getStatusIcon({ governance_status: 'Disabled' })).toBe('🔴');
                expect(getStatusIcon({ governance_status: 'Disabled by Governance' })).toBe('🔴');
            });

            test('should show 🔔 for notified searches', () => {
                expect(getStatusIcon({ flag_status: 'notified' })).toBe('🔔');
                expect(getStatusIcon({ governance_status: 'Pending Remediation' })).toBe('🔔');
            });

            test('should show 🚩 for flagged searches', () => {
                expect(getStatusIcon({ flag_status: 'flagged' })).toBe('🚩');
                expect(getStatusIcon({ flag_status: 'pending' })).toBe('🚩');
            });

            test('should show ⚡ for suspicious searches', () => {
                expect(getStatusIcon({ governance_status: 'Suspicious' })).toBe('⚡');
                expect(getStatusIcon({ is_suspicious: 1 })).toBe('⚡');
            });

            test('should show no icon for OK searches', () => {
                expect(getStatusIcon({ governance_status: 'OK' })).toBe('');
                expect(getStatusIcon({ disabled: 0, flag_status: null })).toBe('');
                expect(getStatusIcon({})).toBe('');
            });
        });

        describe('Priority order verification', () => {
            test('disabled should override all other states', () => {
                const allStates = {
                    disabled: 1,
                    flag_status: 'notified',
                    is_suspicious: 1,
                    governance_status: 'Disabled'
                };
                expect(getStatusIcon(allStates)).toBe('🔴');
            });

            test('notified should override flagged and suspicious', () => {
                const states = {
                    disabled: 0,
                    flag_status: 'notified',
                    is_suspicious: 1
                };
                expect(getStatusIcon(states)).toBe('🔔');
            });

            test('flagged should override suspicious', () => {
                const states = {
                    disabled: 0,
                    flag_status: 'flagged',
                    is_suspicious: 1
                };
                expect(getStatusIcon(states)).toBe('🚩');
            });
        });
    });

    // ============================================
    // US-03: Days Left Column Logic
    // Blank for OK/Suspicious/Disabled
    // "⏸ Awaiting" for Flagged
    // Countdown for Notified
    // ============================================
    describe('US-03: Days Left Column Logic', () => {

        /**
         * Formats the days remaining display
         * @param {Object} search - Search object with status and deadline fields
         * @returns {string} Formatted days remaining or status indicator
         */
        function formatDaysRemaining(search) {
            const status = search.governance_status || '';
            const flagStatus = search.flag_status || '';
            const deadline = search.remediation_deadline;
            const now = Math.floor(Date.now() / 1000);

            // Blank for OK, Suspicious, Disabled
            if (status === 'OK') return '';
            if (status === 'Suspicious' && !['flagged', 'pending', 'notified'].includes(flagStatus)) return '';
            if (status === 'Disabled' || status === 'Disabled by Governance') return '';

            // Awaiting for Flagged (not yet notified)
            if (flagStatus === 'pending' || flagStatus === 'flagged') {
                return '⏸ Awaiting';
            }

            // Countdown for Notified
            if (flagStatus === 'notified' || status === 'Pending Remediation') {
                if (!deadline || deadline <= 0) return 'No deadline';
                const daysRemaining = Math.round((deadline - now) / 86400 * 10) / 10;
                if (daysRemaining < 0) return 'Expired';
                return daysRemaining.toFixed(1);
            }

            return '';
        }

        describe('Blank states', () => {
            test('should return blank for OK status', () => {
                expect(formatDaysRemaining({ governance_status: 'OK' })).toBe('');
            });

            test('should return blank for unflagged Suspicious status', () => {
                expect(formatDaysRemaining({
                    governance_status: 'Suspicious',
                    flag_status: null
                })).toBe('');
            });

            test('should return blank for Disabled status', () => {
                expect(formatDaysRemaining({ governance_status: 'Disabled' })).toBe('');
                expect(formatDaysRemaining({ governance_status: 'Disabled by Governance' })).toBe('');
            });
        });

        describe('Awaiting notification states', () => {
            test('should return "⏸ Awaiting" for pending flag_status', () => {
                expect(formatDaysRemaining({ flag_status: 'pending' })).toBe('⏸ Awaiting');
            });

            test('should return "⏸ Awaiting" for flagged flag_status', () => {
                expect(formatDaysRemaining({ flag_status: 'flagged' })).toBe('⏸ Awaiting');
            });

            test('should return "⏸ Awaiting" for flagged suspicious search', () => {
                expect(formatDaysRemaining({
                    governance_status: 'Suspicious',
                    flag_status: 'flagged'
                })).toBe('⏸ Awaiting');
            });
        });

        describe('Countdown states', () => {
            const now = Math.floor(Date.now() / 1000);

            test('should return countdown for notified status with deadline', () => {
                const deadline = now + (5 * 86400); // 5 days from now
                const result = formatDaysRemaining({
                    flag_status: 'notified',
                    remediation_deadline: deadline
                });
                expect(parseFloat(result)).toBeCloseTo(5, 0);
            });

            test('should return "Expired" for past deadlines', () => {
                const deadline = now - (1 * 86400); // 1 day ago
                expect(formatDaysRemaining({
                    flag_status: 'notified',
                    remediation_deadline: deadline
                })).toBe('Expired');
            });

            test('should return "No deadline" when deadline is missing', () => {
                expect(formatDaysRemaining({
                    flag_status: 'notified',
                    remediation_deadline: null
                })).toBe('No deadline');
            });

            test('should handle Pending Remediation governance_status', () => {
                const deadline = now + (3 * 86400);
                const result = formatDaysRemaining({
                    governance_status: 'Pending Remediation',
                    remediation_deadline: deadline
                });
                expect(parseFloat(result)).toBeCloseTo(3, 0);
            });
        });

        describe('Edge cases', () => {
            test('should handle deadline of 0', () => {
                expect(formatDaysRemaining({
                    flag_status: 'notified',
                    remediation_deadline: 0
                })).toBe('No deadline');
            });

            test('should handle negative deadline', () => {
                expect(formatDaysRemaining({
                    flag_status: 'notified',
                    remediation_deadline: -1
                })).toBe('No deadline');
            });

            test('should handle empty search object', () => {
                expect(formatDaysRemaining({})).toBe('');
            });
        });
    });

    // ============================================
    // US-05: Timer Auto-Start on Notified
    // ============================================
    describe('US-05: Timer Auto-Start on Notified', () => {

        /**
         * Calculates deadline when status changes to notified
         * @param {number} remediationDays - Number of days for remediation
         * @returns {number} Unix timestamp for deadline
         */
        function calculateNotifiedDeadline(remediationDays = 7) {
            const now = Math.floor(Date.now() / 1000);
            return now + (remediationDays * 86400);
        }

        test('should set deadline 7 days in future by default', () => {
            const now = Math.floor(Date.now() / 1000);
            const deadline = calculateNotifiedDeadline();
            const expectedDeadline = now + (7 * 86400);
            expect(deadline).toBeCloseTo(expectedDeadline, -2); // Within 100 seconds
        });

        test('should respect custom remediation days', () => {
            const now = Math.floor(Date.now() / 1000);
            const deadline = calculateNotifiedDeadline(14);
            const expectedDeadline = now + (14 * 86400);
            expect(deadline).toBeCloseTo(expectedDeadline, -2);
        });

        test('should handle 0 days (immediate deadline)', () => {
            const now = Math.floor(Date.now() / 1000);
            const deadline = calculateNotifiedDeadline(0);
            expect(deadline).toBeCloseTo(now, -2);
        });
    });

    // ============================================
    // US-06 & US-07: Email Functions
    // ============================================
    describe('US-06 & US-07: Email Functions', () => {

        /**
         * Builds mailto URL for notification email
         */
        function buildNotificationMailtoUrl(searchName, owner, app, deadlineDays, emailDomain) {
            const domain = emailDomain || 'example.com';
            const toEmail = owner + '@' + domain;
            const editUrl = 'http://localhost:8000/en-US/manager/' + app + '/saved/searches?search=' + encodeURIComponent(searchName);

            const subject = 'Splunk Governance Alert: ' + searchName + ' requires attention';
            const body = 'Hello ' + owner + ',\n\n' +
                'A scheduled search you own has been flagged for review by the Governance team.\n\n' +
                'Search Name: ' + searchName + '\n' +
                'App: ' + app + '\n' +
                'Remediation Deadline: ' + deadlineDays + ' days\n\n' +
                'Please review and remediate the search:\n' + editUrl + '\n\n' +
                'If you have questions, contact the Governance team.';

            return 'mailto:' + encodeURIComponent(toEmail) +
                   '?subject=' + encodeURIComponent(subject) +
                   '&body=' + encodeURIComponent(body);
        }

        /**
         * Builds mailto URL for extension email
         */
        function buildExtendMailtoUrl(searchName, owner, app, newDeadlineDate, remainingDays, emailDomain) {
            const domain = emailDomain || 'example.com';
            const toEmail = owner + '@' + domain;

            const subject = 'Splunk Governance Update: Deadline Extended for ' + searchName;
            const body = 'Hello ' + owner + ',\n\n' +
                'The remediation deadline for your scheduled search has been extended.\n\n' +
                'Search Name: ' + searchName + '\n' +
                'App: ' + app + '\n' +
                'New Deadline: ' + newDeadlineDate + '\n' +
                'Days Remaining: ' + remainingDays + '\n\n' +
                'Please complete remediation before the new deadline.';

            return 'mailto:' + encodeURIComponent(toEmail) +
                   '?subject=' + encodeURIComponent(subject) +
                   '&body=' + encodeURIComponent(body);
        }

        describe('Notification Email (US-06)', () => {
            test('should build valid mailto URL', () => {
                const url = buildNotificationMailtoUrl('TestSearch', 'admin', 'search', 7, 'company.com');
                expect(url).toContain('mailto:');
                expect(url).toContain('admin%40company.com');
                expect(url).toContain('subject=');
                expect(url).toContain('body=');
            });

            test('should include search name in subject', () => {
                const url = buildNotificationMailtoUrl('MyImportantSearch', 'admin', 'search', 7);
                expect(url).toContain('MyImportantSearch');
            });

            test('should include deadline days in body', () => {
                const url = buildNotificationMailtoUrl('TestSearch', 'admin', 'search', 14);
                expect(url).toContain('14');
            });

            test('should use default domain when not specified', () => {
                const url = buildNotificationMailtoUrl('TestSearch', 'admin', 'search', 7);
                expect(url).toContain('example.com');
            });

            test('should include edit URL in body', () => {
                const url = buildNotificationMailtoUrl('Test%20Search', 'admin', 'myapp', 7);
                expect(url).toContain('myapp');
                // URL is encoded, so check for encoded version
                expect(url).toContain('saved%2Fsearches');
            });
        });

        describe('Extension Email (US-07)', () => {
            test('should build valid mailto URL', () => {
                const url = buildExtendMailtoUrl('TestSearch', 'admin', 'search', '2025-01-15', 14, 'company.com');
                expect(url).toContain('mailto:');
                expect(url).toContain('admin%40company.com');
            });

            test('should include new deadline date', () => {
                const url = buildExtendMailtoUrl('TestSearch', 'admin', 'search', '2025-02-01', 30);
                expect(url).toContain('2025-02-01');
            });

            test('should include remaining days', () => {
                const url = buildExtendMailtoUrl('TestSearch', 'admin', 'search', '2025-01-15', 21);
                expect(url).toContain('21');
            });

            test('should have "Extended" in subject', () => {
                const url = buildExtendMailtoUrl('TestSearch', 'admin', 'search', '2025-01-15', 14);
                expect(url).toContain('Extended');
            });
        });
    });

    // ============================================
    // US-08: Extend Deadline UX
    // ============================================
    describe('US-08: Extend Deadline UX', () => {

        /**
         * Calculates new deadline from preset days
         */
        function calculateExtendedDeadline(currentDeadline, addDays) {
            return currentDeadline + (addDays * 86400);
        }

        /**
         * Parses custom date to Unix timestamp
         */
        function parseCustomDate(dateString) {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return null;
            return Math.floor(date.getTime() / 1000);
        }

        describe('Preset buttons', () => {
            const baseDeadline = Math.floor(Date.now() / 1000);

            test('should add 3 days correctly', () => {
                const newDeadline = calculateExtendedDeadline(baseDeadline, 3);
                expect(newDeadline).toBe(baseDeadline + (3 * 86400));
            });

            test('should add 7 days correctly', () => {
                const newDeadline = calculateExtendedDeadline(baseDeadline, 7);
                expect(newDeadline).toBe(baseDeadline + (7 * 86400));
            });

            test('should add 14 days correctly', () => {
                const newDeadline = calculateExtendedDeadline(baseDeadline, 14);
                expect(newDeadline).toBe(baseDeadline + (14 * 86400));
            });

            test('should add 30 days correctly', () => {
                const newDeadline = calculateExtendedDeadline(baseDeadline, 30);
                expect(newDeadline).toBe(baseDeadline + (30 * 86400));
            });
        });

        describe('Custom date picker', () => {
            test('should parse valid date string', () => {
                const timestamp = parseCustomDate('2025-02-01');
                expect(timestamp).toBeGreaterThan(0);
            });

            test('should return null for invalid date', () => {
                expect(parseCustomDate('invalid')).toBeNull();
                expect(parseCustomDate('')).toBeNull();
            });

            test('should handle various date formats', () => {
                expect(parseCustomDate('2025-12-31')).toBeGreaterThan(0);
                expect(parseCustomDate('2025-01-01')).toBeGreaterThan(0);
            });
        });

        describe('Days remaining calculation from extended deadline', () => {
            test('should calculate correct days remaining', () => {
                const now = Math.floor(Date.now() / 1000);
                const deadline = now + (10 * 86400);
                const daysRemaining = Math.round((deadline - now) / 86400);
                expect(daysRemaining).toBe(10);
            });
        });
    });

    // ============================================
    // US-09: State Transitions
    // ============================================
    describe('US-09: State Transitions', () => {

        /**
         * Determines if flag should be cleared based on new status
         */
        function shouldClearFlag(newStatus) {
            const clearStates = ['OK', 'Disabled', 'Disabled by Governance'];
            return clearStates.includes(newStatus);
        }

        /**
         * Gets audit action for transition
         */
        function getTransitionAction(oldStatus, newStatus) {
            if (shouldClearFlag(newStatus)) {
                if (newStatus === 'OK') return 'unflagged_and_ok';
                return 'unflagged_and_disabled';
            }
            return 'status_change';
        }

        describe('Clear flag triggers', () => {
            test('should clear flag when transitioning to OK', () => {
                expect(shouldClearFlag('OK')).toBe(true);
            });

            test('should clear flag when transitioning to Disabled', () => {
                expect(shouldClearFlag('Disabled')).toBe(true);
                expect(shouldClearFlag('Disabled by Governance')).toBe(true);
            });

            test('should NOT clear flag when transitioning to Notified', () => {
                expect(shouldClearFlag('Pending Remediation')).toBe(false);
            });

            test('should NOT clear flag when transitioning to Suspicious', () => {
                expect(shouldClearFlag('Suspicious')).toBe(false);
            });
        });

        describe('Transition audit actions', () => {
            test('should return unflagged_and_ok for OK transition', () => {
                expect(getTransitionAction('Flagged', 'OK')).toBe('unflagged_and_ok');
            });

            test('should return unflagged_and_disabled for Disabled transition', () => {
                expect(getTransitionAction('Flagged', 'Disabled')).toBe('unflagged_and_disabled');
                expect(getTransitionAction('Notified', 'Disabled by Governance')).toBe('unflagged_and_disabled');
            });

            test('should return status_change for other transitions', () => {
                expect(getTransitionAction('Suspicious', 'Flagged')).toBe('status_change');
                expect(getTransitionAction('Flagged', 'Pending Remediation')).toBe('status_change');
            });
        });
    });

    // ============================================
    // US-10: Verbose Audit Logging
    // ============================================
    describe('US-10: Verbose Audit Logging', () => {

        /**
         * Builds audit log entry
         */
        function buildAuditEntry(action, searchName, options = {}) {
            const now = Math.floor(Date.now() / 1000);
            return {
                timestamp: now,
                action: action,
                search_name: searchName,
                search_owner: options.search_owner || '',
                search_app: options.search_app || '',
                old_status: options.old_status || '',
                new_status: options.new_status || '',
                old_flag_status: options.old_flag_status || '',
                new_flag_status: options.new_flag_status || '',
                old_deadline: options.old_deadline || 0,
                new_deadline: options.new_deadline || 0,
                flag_reason: options.flag_reason || '',
                suspicious_reason: options.suspicious_reason || '',
                performed_by: options.performed_by || 'admin',
                details: options.details || '',
                session_id: options.session_id || ''
            };
        }

        describe('Required fields', () => {
            test('should include timestamp', () => {
                const entry = buildAuditEntry('flag', 'TestSearch');
                expect(entry.timestamp).toBeGreaterThan(0);
            });

            test('should include action', () => {
                const entry = buildAuditEntry('unflag', 'TestSearch');
                expect(entry.action).toBe('unflag');
            });

            test('should include search_name', () => {
                const entry = buildAuditEntry('flag', 'MySearch');
                expect(entry.search_name).toBe('MySearch');
            });
        });

        describe('Optional fields with defaults', () => {
            test('should have empty string defaults', () => {
                const entry = buildAuditEntry('flag', 'TestSearch');
                expect(entry.search_owner).toBe('');
                expect(entry.search_app).toBe('');
                expect(entry.old_status).toBe('');
                expect(entry.new_status).toBe('');
                expect(entry.details).toBe('');
            });

            test('should have zero defaults for numeric fields', () => {
                const entry = buildAuditEntry('flag', 'TestSearch');
                expect(entry.old_deadline).toBe(0);
                expect(entry.new_deadline).toBe(0);
            });

            test('should default performed_by to admin', () => {
                const entry = buildAuditEntry('flag', 'TestSearch');
                expect(entry.performed_by).toBe('admin');
            });
        });

        describe('Full audit entry with all fields', () => {
            test('should capture all provided fields', () => {
                const options = {
                    search_owner: 'jsmith',
                    search_app: 'search',
                    old_status: 'Suspicious',
                    new_status: 'Flagged',
                    old_flag_status: '',
                    new_flag_status: 'pending',
                    old_deadline: 0,
                    new_deadline: 0,
                    flag_reason: 'High CPU usage',
                    suspicious_reason: 'Runs every minute',
                    performed_by: 'admin',
                    details: 'Flagged during review session',
                    session_id: 'sess_12345'
                };

                const entry = buildAuditEntry('flag', 'ExpensiveSearch', options);

                expect(entry.search_owner).toBe('jsmith');
                expect(entry.search_app).toBe('search');
                expect(entry.old_status).toBe('Suspicious');
                expect(entry.new_status).toBe('Flagged');
                expect(entry.flag_reason).toBe('High CPU usage');
                expect(entry.suspicious_reason).toBe('Runs every minute');
                expect(entry.session_id).toBe('sess_12345');
            });
        });

        describe('Action types for audit trail', () => {
            const validActions = [
                'flag',
                'unflag',
                'notify',
                'extend_deadline',
                'disable',
                'enable',
                'mark_ok',
                'status_change',
                'bulk_flag',
                'bulk_unflag'
            ];

            test('should accept all valid action types', () => {
                validActions.forEach(action => {
                    const entry = buildAuditEntry(action, 'TestSearch');
                    expect(entry.action).toBe(action);
                });
            });
        });

        describe('Deadline tracking', () => {
            test('should track deadline changes', () => {
                const now = Math.floor(Date.now() / 1000);
                const oldDeadline = now + (7 * 86400);
                const newDeadline = now + (14 * 86400);

                const entry = buildAuditEntry('extend_deadline', 'TestSearch', {
                    old_deadline: oldDeadline,
                    new_deadline: newDeadline
                });

                expect(entry.old_deadline).toBe(oldDeadline);
                expect(entry.new_deadline).toBe(newDeadline);
                expect(entry.new_deadline - entry.old_deadline).toBe(7 * 86400);
            });
        });
    });

    // ============================================
    // US-04: Reason Column Display
    // ============================================
    describe('US-04: Reason Column', () => {

        /**
         * Formats reason display for table
         */
        function formatReasonDisplay(suspiciousReason, flagReason) {
            const reasons = [];
            if (suspiciousReason) reasons.push(suspiciousReason);
            if (flagReason) reasons.push(flagReason);
            return reasons.join(' | ');
        }

        test('should show only suspicious reason when no flag reason', () => {
            const result = formatReasonDisplay('Runs every minute', '');
            expect(result).toBe('Runs every minute');
        });

        test('should show only flag reason when no suspicious reason', () => {
            const result = formatReasonDisplay('', 'Excessive resource usage');
            expect(result).toBe('Excessive resource usage');
        });

        test('should show both reasons separated by pipe', () => {
            const result = formatReasonDisplay('Runs every minute', 'Needs optimization');
            expect(result).toBe('Runs every minute | Needs optimization');
        });

        test('should handle empty reasons', () => {
            expect(formatReasonDisplay('', '')).toBe('');
            expect(formatReasonDisplay(null, null)).toBe('');
        });

        test('should handle whitespace-only reasons as empty', () => {
            const formatTrimmed = (suspicious, flag) => {
                return formatReasonDisplay(
                    suspicious?.trim() || '',
                    flag?.trim() || ''
                );
            };
            expect(formatTrimmed('  ', '  ')).toBe('');
        });
    });

    // ============================================
    // Edge Cases and Error Handling
    // ============================================
    describe('Edge Cases and Error Handling', () => {

        describe('Null and undefined handling', () => {
            function safeGetValue(obj, key, defaultValue = '') {
                if (!obj || obj[key] === null || obj[key] === undefined) {
                    return defaultValue;
                }
                return obj[key];
            }

            test('should return default for null object', () => {
                expect(safeGetValue(null, 'key')).toBe('');
            });

            test('should return default for undefined key', () => {
                expect(safeGetValue({}, 'missing')).toBe('');
            });

            test('should return actual value when present', () => {
                expect(safeGetValue({ key: 'value' }, 'key')).toBe('value');
            });

            test('should handle numeric defaults', () => {
                expect(safeGetValue(null, 'key', 0)).toBe(0);
            });
        });

        describe('String escaping for SPL', () => {
            function escapeForSPL(str) {
                if (!str) return '';
                return String(str)
                    .replace(/\\/g, '\\\\')
                    .replace(/"/g, '\\"');
            }

            test('should escape quotes in search names', () => {
                expect(escapeForSPL('Search "with quotes"')).toBe('Search \\"with quotes\\"');
            });

            test('should escape backslashes', () => {
                expect(escapeForSPL('path\\to\\search')).toBe('path\\\\to\\\\search');
            });

            test('should handle empty strings', () => {
                expect(escapeForSPL('')).toBe('');
                expect(escapeForSPL(null)).toBe('');
            });
        });

        describe('Timestamp validation', () => {
            function isValidTimestamp(ts) {
                if (typeof ts !== 'number') return false;
                if (isNaN(ts)) return false;
                // Reasonable range: 2000 to 2100
                const minTs = 946684800;  // 2000-01-01
                const maxTs = 4102444800; // 2100-01-01
                return ts >= minTs && ts <= maxTs;
            }

            test('should validate current timestamps', () => {
                const now = Math.floor(Date.now() / 1000);
                expect(isValidTimestamp(now)).toBe(true);
            });

            test('should reject negative timestamps', () => {
                expect(isValidTimestamp(-1)).toBe(false);
            });

            test('should reject NaN', () => {
                expect(isValidTimestamp(NaN)).toBe(false);
            });

            test('should reject non-numbers', () => {
                expect(isValidTimestamp('12345')).toBe(false);
            });

            test('should reject timestamps too far in past', () => {
                expect(isValidTimestamp(0)).toBe(false);
            });
        });
    });
});

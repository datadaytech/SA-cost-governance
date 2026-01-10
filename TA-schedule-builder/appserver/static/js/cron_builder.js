/**
 * Schedule Builder TA - Cron Expression Builder
 * Additional JavaScript enhancements for Splunk integration
 */

require([
    'jquery',
    'splunkjs/mvc',
    'splunkjs/mvc/simplexml/ready!'
], function($, mvc) {
    'use strict';

    // Add keyboard navigation support
    $(document).on('keydown', '.selection-item', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            $(this).click();
        }
    });

    // Make items focusable for accessibility
    $('.selection-item').attr('tabindex', '0').attr('role', 'button');

    console.log('Schedule Builder TA loaded successfully');
});

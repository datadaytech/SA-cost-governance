/**
 * Splunk Innovators Toolkit - Exercises Page Handler
 */

require([
    'jquery',
    'underscore',
    '/static/app/splunk-innovators-toolkit/components/sit-modal.js',
    '/static/app/splunk-innovators-toolkit/components/sit-toast.js'
], function($, _, SITModal, SITToast) {
    'use strict';

    // Only run on exercises page
    if (window.location.href.indexOf('hands_on_exercises') === -1) {
        return;
    }

    console.log('SIT Exercises: Initializing...');

    // SITToast is an object with methods, not a constructor
    var toast = SITToast;
    var completed = { ex1: false, ex2: false, ex3: false };

    var hints = {
        ex1: {
            count: 0,
            steps: [
                "toast.success('Great job!');",
                "toast.success('Great job!', {\n  title: 'Well Done!'\n});",
                "toast.success('You completed your first exercise!', {\n  title: 'Well Done!'\n});"
            ]
        },
        ex2: {
            count: 0,
            steps: [
                "var modal = new SITModal({\n  title: 'Welcome!'\n});",
                "var modal = new SITModal({\n  title: 'Welcome!',\n  content: '<p>This is my first modal.</p>'\n});",
                "var modal = new SITModal({\n  title: 'Welcome!',\n  content: '<p>This is my first modal.</p>'\n});\nmodal.show();"
            ]
        },
        ex3: {
            count: 0,
            steps: [
                "SITModal.confirm(\n  'Do you like this toolkit?',\n  'Feedback',\n  function() {\n    // On confirm\n  },\n  function() {\n    // On cancel\n  }\n);",
                "SITModal.confirm(\n  'Do you like this toolkit?',\n  'Feedback',\n  function() {\n    toast.success('Thanks!');\n  },\n  function() {\n    // On cancel\n  }\n);",
                "SITModal.confirm(\n  'Do you like this toolkit?',\n  'Feedback',\n  function() {\n    toast.success('We appreciate it!', { title: 'Thanks!' });\n  },\n  function() {\n    toast.info('Thanks for trying!', { title: 'No problem!' });\n  }\n);"
            ]
        }
    };

    var defaults = {
        ex1: "toast.success('message');",
        ex2: "var modal = new SITModal({\n  title: 'Title'\n});\nmodal.show();",
        ex3: "SITModal.confirm(\n  'question',\n  'Title',\n  function() {\n    // On confirm\n  },\n  function() {\n    // On cancel\n  }\n);"
    };

    function updateProgress() {
        if (completed.ex1) $('#badge-1').addClass('complete').html('&#10003;');
        if (completed.ex2) $('#badge-2').addClass('complete').html('&#10003;');
        if (completed.ex3) $('#badge-3').addClass('complete').html('&#10003;');

        if (completed.ex1 && completed.ex2 && completed.ex3) {
            $('#progress-tracker').hide();
            $('#all-complete').addClass('show');
        }
    }

    function executeCode(code) {
        try {
            var fn = new Function('toast', 'SITModal', '_', '$', code);
            fn(toast, SITModal, _, $);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // Wait for DOM to be ready
    $(document).ready(function() {
        console.log('SIT Exercises: DOM ready, attaching handlers...');

        // Exercise 1
        $(document).on('click', '#ex1-hint', function() {
            console.log('Exercise 1 hint clicked');
            var h = hints.ex1;
            h.count = Math.min(h.count + 1, 2);
            $('#ex1-hint-count').text(h.count + '/2');
            $('#ex1-code').val(h.steps[h.count]);

            if (h.count >= 2) {
                setTimeout(function() { $('#ex1-run').trigger('click'); }, 300);
            }
        });

        $(document).on('click', '#ex1-reset', function() {
            $('#ex1-code').val(defaults.ex1);
            $('#ex1-output').removeClass('show');
            $('#ex1-error').removeClass('show');
            hints.ex1.count = 0;
            $('#ex1-hint-count').text('0/2');
        });

        $(document).on('click', '#ex1-run', function() {
            console.log('Exercise 1 run clicked');
            var code = $('#ex1-code').val();
            $('#ex1-error').removeClass('show');
            $('#ex1-output').removeClass('show');

            var result = executeCode(code);
            if (!result.success) {
                $('#ex1-error-text').text(result.error);
                $('#ex1-error').addClass('show');
                return;
            }

            if (code.indexOf("toast.success") !== -1 || code.indexOf("toast.info") !== -1 || code.indexOf("toast.error") !== -1 || code.indexOf("toast.warning") !== -1) {
                completed.ex1 = true;
                $('#ex1-output').addClass('show');
                updateProgress();
            }
        });

        // Exercise 2
        $(document).on('click', '#ex2-hint', function() {
            console.log('Exercise 2 hint clicked');
            var h = hints.ex2;
            h.count = Math.min(h.count + 1, 2);
            $('#ex2-hint-count').text(h.count + '/2');
            $('#ex2-code').val(h.steps[h.count]);

            if (h.count >= 2) {
                setTimeout(function() { $('#ex2-run').trigger('click'); }, 300);
            }
        });

        $(document).on('click', '#ex2-reset', function() {
            $('#ex2-code').val(defaults.ex2);
            $('#ex2-output').removeClass('show');
            $('#ex2-error').removeClass('show');
            hints.ex2.count = 0;
            $('#ex2-hint-count').text('0/2');
        });

        $(document).on('click', '#ex2-run', function() {
            console.log('Exercise 2 run clicked');
            var code = $('#ex2-code').val();
            $('#ex2-error').removeClass('show');
            $('#ex2-output').removeClass('show');

            var result = executeCode(code);
            if (!result.success) {
                $('#ex2-error-text').text(result.error);
                $('#ex2-error').addClass('show');
                return;
            }

            setTimeout(function() {
                if ($('.sit-modal-backdrop').length > 0) {
                    completed.ex2 = true;
                    $('#ex2-output').addClass('show');
                    updateProgress();
                }
            }, 200);
        });

        // Exercise 3
        $(document).on('click', '#ex3-hint', function() {
            console.log('Exercise 3 hint clicked');
            var h = hints.ex3;
            h.count = Math.min(h.count + 1, 2);
            $('#ex3-hint-count').text(h.count + '/2');
            $('#ex3-code').val(h.steps[h.count]);

            if (h.count >= 2) {
                setTimeout(function() { $('#ex3-run').trigger('click'); }, 300);
            }
        });

        $(document).on('click', '#ex3-reset', function() {
            $('#ex3-code').val(defaults.ex3);
            $('#ex3-output').removeClass('show');
            $('#ex3-error').removeClass('show');
            hints.ex3.count = 0;
            $('#ex3-hint-count').text('0/2');
        });

        $(document).on('click', '#ex3-run', function() {
            console.log('Exercise 3 run clicked');
            var code = $('#ex3-code').val();
            $('#ex3-error').removeClass('show');
            $('#ex3-output').removeClass('show');

            var result = executeCode(code);
            if (!result.success) {
                $('#ex3-error-text').text(result.error);
                $('#ex3-error').addClass('show');
                return;
            }

            if (code.indexOf('SITModal.confirm') !== -1 && (code.indexOf('toast.success') !== -1 || code.indexOf('toast.info') !== -1)) {
                var checkComplete = setInterval(function() {
                    if ($('.sit-modal-backdrop').length === 0) {
                        clearInterval(checkComplete);
                        completed.ex3 = true;
                        $('#ex3-output').addClass('show');
                        updateProgress();
                    }
                }, 300);

                setTimeout(function() { clearInterval(checkComplete); }, 30000);
            }
        });

        console.log('SIT Exercises: All handlers attached!');
    });
});

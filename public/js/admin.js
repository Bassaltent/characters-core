'use strict';

/* global define, $, app */

define('admin/plugins/nodebb-plugin-characters-core', ['settings'], function (settings) {

    const ACP = {};

    ACP.init = function () {
        settings.load('characters-core', $('.characters-core-settings'));

        $('#save').on('click', function () {
            settings.save('characters-core', $('.characters-core-settings'), function () {
                app.alert({
                    type: 'success',
                    alert_id: 'characters-core-saved',
                    title: 'Settings Saved',
                    message: 'Your settings have been saved.',
                });
            });
        });
    };

    return ACP;
});

'use strict';

import { save, load } from 'settings';

export function init() {
    load('characters-core', $('.characters-core-settings'));

    $('#save').on('click', function () {
        save('characters-core', $('.characters-core-settings'), function () {
            app.alert({
                type: 'success',
                alert_id: 'characters-core-saved',
                title: 'Settings Saved',
                message: 'Your settings have been saved.',
            });
        });
    });
}
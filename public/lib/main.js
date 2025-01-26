'use strict';
(async () => {
    const hooks = await app.require('hooks');
    hooks.on('action:app.load', () => {
        // called once when nbb has loaded
    });
})();
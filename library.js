'use strict';

const meta = require.main.require('./src/meta');
const db = require.main.require('./src/database');
const winston = require.main.require('winston');

const CharactersCore = {};

CharactersCore.init = async function (params) {
    const { router, middleware, controllers } = params;

    // Routes pour le panneau d'administration
    router.get('/admin/characters-core', middleware.admin.buildHeader, renderAdminPage);
    router.get('/api/admin/characters-core', renderAdminPage);

    // Routes API
    router.get('/api/characters-core/models', getCharacterModels);
    router.post('/api/characters-core/models', middleware.applyCSRF, createCharacterModel);
    router.put('/api/characters-core/models/:modelId', middleware.applyCSRF, updateCharacterModel);
    router.delete('/api/characters-core/models/:modelId', middleware.applyCSRF, deleteCharacterModel);

    winston.info('[plugin/characters-core] Plugin loaded.');
};

CharactersCore.addAdminNavigation = async function (header) {
    header.plugins.push({
        route: '/characters-core',
        icon: 'fa-users',
        name: 'Characters Core',
    });
    return header;
};

// Rendu de la page d'administration
async function renderAdminPage(req, res) {
    res.render('admin/characters-core', {});
}

// API : Récupérer les modèles de personnages
async function getCharacterModels(req, res) {
    const models = await db.getObject('characters:models') || {};
    res.json(models);
}

// API : Créer un nouveau modèle de personnage
async function createCharacterModel(req, res) {
    const { name, fields } = req.body;
    const modelId = `model:${Date.now()}`;

    const model = {
        id: modelId,
        name,
        fields,
    };

    await db.setObjectField('characters:models', modelId, model);
    res.json({ message: 'Model created', model });
}

// API : Modifier un modèle existant
async function updateCharacterModel(req, res) {
    const { modelId } = req.params;
    const { name, fields } = req.body;

    const model = {
        id: modelId,
        name,
        fields,
    };

    await db.setObjectField('characters:models', modelId, model);
    res.json({ message: 'Model updated', model });
}

// API : Supprimer un modèle de personnage
async function deleteCharacterModel(req, res) {
    const { modelId } = req.params;

    await db.deleteObjectField('characters:models', modelId);
    res.json({ message: 'Model deleted' });
}

module.exports = CharactersCore;

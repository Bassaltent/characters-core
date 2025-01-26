'use strict';

import { save, load } from 'settings';
import { alert } from 'alerts';

export function init() {
    // Charger les paramètres existants
    load('characters-core', $('.characters-core-settings'));
    
    // Charger les modèles existants au démarrage
    loadModels();

    // Gestionnaire pour le bouton "Ajouter un modèle"
    $('#addModel').on('click', function() {
        createNewModel();
    });

    // Gestion du clic sur le bouton Modifier
    $('#modelsContainer').on('click', '.edit-model', function() {
        const modelId = $(this).data('id');
        showEditModal(modelId);
    });

    // Gestion du clic sur le bouton Supprimer
    $('#modelsContainer').on('click', '.delete-model', function() {
        const modelId = $(this).data('id');
        
        require(['bootbox'], function(bootbox) {
            bootbox.confirm({
                message: "Êtes-vous sûr de vouloir supprimer ce modèle ?",
                buttons: {
                    confirm: {
                        label: 'Oui',
                        className: 'btn-danger'
                    },
                    cancel: {
                        label: 'Non',
                        className: 'btn-default'
                    }
                },
                callback: function (result) {
                    if (result) {
                        deleteModel(modelId);
                    }
                }
            });
        });
    });
}

function loadModels() {
    $.get('/api/characters-core/models', function(data) {
        // On sélectionne uniquement le conteneur des modèles
        const container = $('#modelsContainer');
        
        const modelsArray = Object.values(data).map(model => ({
            ...model,
            hasFields: Array.isArray(model.fields) && model.fields.length > 0,
            fieldsDisplay: Array.isArray(model.fields) ? 
                model.fields.map(field => field.name).join(', ') : ''
        }));
        
        // On charge juste la partie du template qui concerne les modèles
        app.parseAndTranslate('admin/plugins/characters-core', 'model', {
            model: modelsArray
        }, function(html) {
            container.empty().html(html);
        });
    });
}

function createNewModel() {
    const newModel = {
        name: 'Nouveau modèle',
        fields: []
    };

    $.ajax({
        url: '/api/characters-core/models',
        method: 'POST',
        data: newModel,
        headers: {
            'x-csrf-token': config.csrf_token
        },
        success: function(response) {
            alert({
                type: 'success',
                alert_id: 'model-created',
                title: 'Succès',
                message: 'Nouveau modèle créé avec succès',
            });
            loadModels();
        },
        error: function(err) {
            alert({
                type: 'error',
                alert_id: 'model-error',
                title: 'Erreur',
                message: 'Erreur lors de la création du modèle',
            });
        }
    });
}

function showEditModal(modelId) {
    require(['bootbox'], function(bootbox) {
        // Récupérer d'abord les données depuis l'API
        $.get('/api/characters-core/models', function(models) {
            const model = models[modelId];
            
            if (!model) {
                alert({
                    type: 'error',
                    alert_id: 'model-not-found',
                    title: 'Erreur',
                    message: 'Modèle non trouvé'
                });
                return;
            }

            bootbox.dialog({
                title: 'Modifier le modèle',
                message: `
                    <form id="editModelForm">
                        <div class="form-group">
                            <label>Nom du modèle</label>
                            <input type="text" class="form-control" name="name" id="modelName" value="${model.name}">
                        </div>
                        <div class="form-group">
                            <label>Champs</label>
                            <div id="fieldsContainer"></div>
                            <button type="button" class="btn btn-sm btn-info mt-2" id="addFieldBtn">Ajouter un champ</button>
                        </div>
                    </form>
                `,
                buttons: {
                    cancel: {
                        label: 'Annuler',
                        className: 'btn-default'
                    },
                    save: {
                        label: 'Sauvegarder',
                        className: 'btn-primary',
                        callback: function() {
                            saveModelChanges(modelId);
                        }
                    }
                }
            });

            // Ajout de la gestion du bouton "Ajouter un champ"
            $('#addFieldBtn').on('click', function() {
                const fieldHtml = `
                    <div class="field-row mb-2">
                        <input type="text" class="form-control form-control-sm d-inline-block w-75" 
                               placeholder="Nom du champ">
                        <button type="button" class="btn btn-sm btn-danger ml-2 remove-field">
                            Supprimer
                        </button>
                    </div>
                `;
                $('#fieldsContainer').append(fieldHtml);
            });

            // Gestion de la suppression des champs
            $('#fieldsContainer').on('click', '.remove-field', function() {
                $(this).closest('.field-row').remove();
            });

            // Remplir les champs existants
            if (Array.isArray(model.fields)) {
                model.fields.forEach(field => {
                    const fieldHtml = `
                        <div class="field-row mb-2">
                            <input type="text" class="form-control form-control-sm d-inline-block w-75" 
                                   value="${field.name}" placeholder="Nom du champ">
                            <button type="button" class="btn btn-sm btn-danger ml-2 remove-field">
                                Supprimer
                            </button>
                        </div>
                    `;
                    $('#fieldsContainer').append(fieldHtml);
                });
            }
        });
    });
}

function saveModelChanges(modelId) {
    const name = $('#modelName').val();
    const fields = [];
    
    // Récupérer tous les champs
    $('.field-row input').each(function() {
        fields.push({
            name: $(this).val()
        });
    });

    $.ajax({
        url: `/api/characters-core/models/${modelId}`,
        method: 'PUT',
        data: {
            name: name,
            fields: fields
        },
        headers: {
            'x-csrf-token': config.csrf_token
        },
        success: function() {
            alert({
                type: 'success',
                alert_id: 'model-updated',
                title: 'Succès',
                message: 'Modèle mis à jour avec succès'
            });
            loadModels();
        },
        error: function() {
            alert({
                type: 'error',
                alert_id: 'model-update-error',
                title: 'Erreur',
                message: 'Erreur lors de la mise à jour du modèle'
            });
        }
    });
}

function deleteModel(modelId) {
    $.ajax({
        url: `/api/characters-core/models/${modelId}`,
        method: 'DELETE',
        headers: {
            'x-csrf-token': config.csrf_token
        },
        success: function() {
            alert({
                type: 'success',
                alert_id: 'model-deleted',
                title: 'Succès',
                message: 'Modèle supprimé avec succès'
            });
            loadModels();
        },
        error: function() {
            alert({
                type: 'error',
                alert_id: 'model-delete-error',
                title: 'Erreur',
                message: 'Erreur lors de la suppression du modèle'
            });
        }
    });
}
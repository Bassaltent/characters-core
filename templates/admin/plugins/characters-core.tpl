<div class="characters-core-settings">
    <div class="panel">
        <div class="panel-heading">
            <h3>Gestion des modèles de personnages</h3>
        </div>
        <div class="panel-body">
            <div class="mb-3">
                <button class="btn btn-primary" id="addModel">Ajouter un modèle</button>
                <button class="btn btn-secondary" id="importModel">Importer un modèle</button>
            </div>
            <div id="modelsContainer" class="d-flex flex-wrap gap-3">
            </div>
        </div>
    </div>
</div>

<!-- BEGIN models -->
<div class="model card border p-3 mb-3" data-id="{models.id}">
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h4 class="m-0">{models.name}</h4>
        <button class="btn btn-sm btn-link toggle-fields">
            <i class="fa fa-chevron-down"></i>
        </button>
    </div>
    <div class="fields-container">
        <!-- IF models.hasFields -->
            {models.fieldsHtml}
        <!-- ELSE -->
            <p>Aucun champ défini</p>
        <!-- ENDIF models.hasFields -->
    </div>
    <div class="mt-3">
        <button class="btn btn-sm btn-primary edit-model" data-id="{models.id}">Modifier</button>
        <button class="btn btn-sm btn-danger delete-model" data-id="{models.id}">Supprimer</button>
        <button class="btn btn-sm btn-info duplicate-model" data-id="{models.id}">Dupliquer</button>
    </div>
</div>
<!-- END models -->
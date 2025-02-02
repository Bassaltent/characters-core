<div class="characters-core-settings">
    <div class="panel">
        <div class="panel-heading">
            <h3>Gestion des modèles de personnages</h3>
        </div>
        <div class="panel-body">
            <button class="btn btn-primary" id="addModel">Ajouter un modèle</button>
            <div id="modelsContainer"></div>
        </div>
    </div>
</div>

<!-- BEGIN models -->
<div class="model" data-id="{models.id}">
    <h4>{models.name}</h4>
    <div class="fields-container">
        <!-- IF models.hasFields -->
            <div class="field-list">
                {models.fieldsHtml}
            </div>
        <!-- ELSE -->
            <p>Aucun champ défini</p>
        <!-- ENDIF models.hasFields -->
    </div>
    <button class="btn btn-sm btn-primary edit-model" data-id="{models.id}">Modifier</button>
    <button class="btn btn-sm btn-danger delete-model" data-id="{models.id}">Supprimer</button>
</div>
<!-- END models -->
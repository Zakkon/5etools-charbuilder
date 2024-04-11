class RenderableCollectionBase {
    constructor(comp, prop, opts) {
        opts = opts || {};
        this._comp = comp;
        this._prop = prop;
        this._namespace = opts.namespace;
        this._isDiffMode = opts.isDiffMode;
    }

    getNewRender(entity, i) {
        throw new Error(`Unimplemented!`);
    }

    doUpdateExistingRender(renderedMeta, entity, i) {
        throw new Error(`Unimplemented!`);
    }

    doDeleteExistingRender(renderedMeta) {}

    doReorderExistingComponent(renderedMeta, entity, i) {}

    _getCollectionItem(id) {
        return this._comp._state[this._prop].find(it=>it.id === id);
    }

    render(opts) {
        opts = opts || {};
        this._comp._renderCollection({
            prop: this._prop,
            fnUpdateExisting: (rendered,ent,i)=>this.doUpdateExistingRender(rendered, ent, i),
            fnGetNew: (entity,i)=>this.getNewRender(entity, i),
            fnDeleteExisting: (rendered)=>this.doDeleteExistingRender(rendered),
            fnReorderExisting: (rendered,ent,i)=>this.doReorderExistingComponent(rendered, ent, i),
            namespace: this._namespace,
            isDiffMode: opts.isDiffMode != null ? opts.isDiffMode : this._isDiffMode,
        });
    }
};

class _RenderableCollectionGenericRowsSyncAsyncUtils {
    constructor({comp, prop, $wrpRows, namespace}) {
        this._comp = comp;
        this._prop = prop;
        this._$wrpRows = $wrpRows;
        this._namespace = namespace;
    }

    _getCollectionItem(id) {
        return this._comp._state[this._prop].find(it=>it.id === id);
    }

    getNewRenderComp(entity, i) {
        const comp = BaseComponent.fromObject(entity.entity, "*");
        comp._addHookAll("state", ()=>{
            this._getCollectionItem(entity.id).entity = comp.toObject("*");
            this._comp._triggerCollectionUpdate(this._prop);
        }
        );
        return comp;
    }

    doUpdateExistingRender(renderedMeta, entity, i) {
        renderedMeta.comp._proxyAssignSimple("state", entity.entity, true);
        if (!renderedMeta.$wrpRow.parent().is(this._$wrpRows))
            renderedMeta.$wrpRow.appendTo(this._$wrpRows);
    }

    static _doSwapJqueryElements($eles, ixA, ixB) {
        if (ixA > ixB)
            [ixA,ixB] = [ixB, ixA];

        const eleA = $eles.get(ixA);
        const eleB = $eles.get(ixB);

        const eleActive = document.activeElement;

        $(eleA).insertAfter(eleB);
        $(eleB).insertBefore($eles.get(ixA + 1));

        if (eleActive)
            eleActive.focus();
    }

    doReorderExistingComponent(renderedMeta, entity, i) {
        const ix = this._comp._state[this._prop].map(it=>it.id).indexOf(entity.id);
        const $rows = this._$wrpRows.find(`> *`);
        const curIx = $rows.index(renderedMeta.$wrpRow);

        const isMove = !this._$wrpRows.length || curIx !== ix;
        if (!isMove)
            return;

        this.constructor._doSwapJqueryElements($rows, curIx, ix);
    }

    $getBtnDelete({entity, title="Delete"}) {
        return $(`<button class="btn btn-xxs btn-danger" title="${title.qq()}"><span class="glyphicon glyphicon-trash"></span></button>`).click(()=>this.doDelete({
            entity
        }));
    }

    doDelete({entity}) {
        this._comp._state[this._prop] = this._comp._state[this._prop].filter(it=>it?.id !== entity.id);
    }

    doDeleteMultiple({entities}) {
        const ids = new Set(entities.map(it=>it.id));
        this._comp._state[this._prop] = this._comp._state[this._prop].filter(it=>!ids.has(it?.id));
    }

    $getPadDrag({$wrpRow}) {
        return DragReorderUiUtil$1.$getDragPadOpts(()=>$wrpRow, {
            swapRowPositions: (ixA,ixB)=>{
                [this._comp._state[this._prop][ixA],this._comp._state[this._prop][ixB]] = [this._comp._state[this._prop][ixB], this._comp._state[this._prop][ixA]];
                this._comp._triggerCollectionUpdate(this._prop);
            }
            ,
            $getChildren: ()=>{
                const rendered = this._comp._getRenderedCollection({
                    prop: this._prop,
                    namespace: this._namespace
                });
                return this._comp._state[this._prop].map(it=>rendered[it.id].$wrpRow);
            }
            ,
            $parent: this._$wrpRows,
        }, );
    }
}

class RenderableCollectionGenericRows extends RenderableCollectionBase {
    constructor(comp, prop, $wrpRows, opts) {
        super(comp, prop, opts);
        this._$wrpRows = $wrpRows;

        this._utils = new _RenderableCollectionGenericRowsSyncAsyncUtils({
            comp,
            prop,
            $wrpRows,
            namespace: opts?.namespace,
        });
    }

    doUpdateExistingRender(renderedMeta, entity, i) {
        return this._utils.doUpdateExistingRender(renderedMeta, entity, i);
    }

    doReorderExistingComponent(renderedMeta, entity, i) {
        return this._utils.doReorderExistingComponent(renderedMeta, entity, i);
    }

    getNewRender(entity, i) {
        const comp = this._utils.getNewRenderComp(entity, i);

        const $wrpRow = this._$getWrpRow().appendTo(this._$wrpRows);

        const renderAdditional = this._populateRow({
            comp,
            $wrpRow,
            entity
        });

        return {
            ...(renderAdditional || {}),
            id: entity.id,
            comp,
            $wrpRow,
        };
    }

    _$getWrpRow() {
        return $(`<div class="ve-flex-v-center w-100"></div>`);
    }

    _populateRow({comp, $wrpRow, entity}) {
        throw new Error(`Unimplemented!`);
    }
};
class MixedProxyBase //extends Cls
{
    constructor(...args) {
        //super(...args);
        this.__hooks = {};
        this.__hooksAll = {};
        this.__hooksTmp = null;
        this.__hooksAllTmp = null;
    }

    _getProxy(hookProp, toProxy) {
        return new Proxy(toProxy,{
            set: (object,prop,value)=>{
                return this._doProxySet(hookProp, object, prop, value);
            }
            ,
            deleteProperty: (object,prop)=>{
                if (!(prop in object))
                    return true;
                const prevValue = object[prop];
                Reflect.deleteProperty(object, prop);
                this._doFireHooksAll(hookProp, prop, undefined, prevValue);
                if (this.__hooks[hookProp] && this.__hooks[hookProp][prop])
                    this.__hooks[hookProp][prop].forEach(hook=>hook(prop, undefined, prevValue));
                return true;
            }
            ,
        });
    }

    _doProxySet(hookProp, object, prop, value) {
        if (object[prop] === value){return true;}
        const prevValue = object[prop];
        Reflect.set(object, prop, value);
        this._doFireHooksAll(hookProp, prop, value, prevValue);
        this._doFireHooks(hookProp, prop, value, prevValue);
        return true;
    }

    async _pDoProxySet(hookProp, object, prop, value) {
        if (object[prop] === value)
            return true;
        const prevValue = object[prop];
        Reflect.set(object, prop, value);
        if (this.__hooksAll[hookProp])
            for (const hook of this.__hooksAll[hookProp])
                await hook(prop, value, prevValue);
        if (this.__hooks[hookProp] && this.__hooks[hookProp][prop])
            for (const hook of this.__hooks[hookProp][prop])
                await hook(prop, value, prevValue);
        return true;
    }

    _doFireHooks(hookProp, prop, value, prevValue) {
        if (this.__hooks[hookProp] && this.__hooks[hookProp][prop]){
            console.warn("Fire hook", hookProp, prop, value, prevValue, this.constructor.name);
            this.__hooks[hookProp][prop].forEach(hook=>hook(prop, value, prevValue));
        }
    }

    _doFireHooksAll(hookProp, prop, value, prevValue) {
        if (this.__hooksAll[hookProp])
            this.__hooksAll[hookProp].forEach(hook=>hook(prop, undefined, prevValue));
    }

    _doFireAllHooks(hookProp) {
        if (this.__hooks[hookProp])
            Object.entries(this.__hooks[hookProp]).forEach(([prop,hk])=>hk(prop));
    }

    _addHook(hookProp, prop, hook) {
        ProxyBase._addHook_to(this.__hooks, hookProp, prop, hook);
        if (this.__hooksTmp)
            ProxyBase._addHook_to(this.__hooksTmp, hookProp, prop, hook);
        return hook;
    }

    static _addHook_to(obj, hookProp, prop, hook) {
        ((obj[hookProp] = obj[hookProp] || {})[prop] = (obj[hookProp][prop] || [])).push(hook);
    }

    _addHookAll(hookProp, hook) {
        ProxyBase._addHookAll_to(this.__hooksAll, hookProp, hook);
        if (this.__hooksAllTmp)
            ProxyBase._addHookAll_to(this.__hooksAllTmp, hookProp, hook);
        return hook;
    }

    static _addHookAll_to(obj, hookProp, hook) {
        (obj[hookProp] = obj[hookProp] || []).push(hook);
    }

    _removeHook(hookProp, prop, hook) {
        ProxyBase._removeHook_from(this.__hooks, hookProp, prop, hook);
        if (this.__hooksTmp)
            ProxyBase._removeHook_from(this.__hooksTmp, hookProp, prop, hook);
    }

    static _removeHook_from(obj, hookProp, prop, hook) {
        if (obj[hookProp] && obj[hookProp][prop]) {
            const ix = obj[hookProp][prop].findIndex(hk=>hk === hook);
            if (~ix)
                obj[hookProp][prop].splice(ix, 1);
        }
    }

    _removeHooks(hookProp, prop) {
        if (this.__hooks[hookProp])
            delete this.__hooks[hookProp][prop];
        if (this.__hooksTmp && this.__hooksTmp[hookProp])
            delete this.__hooksTmp[hookProp][prop];
    }

    _removeHookAll(hookProp, hook) {
        ProxyBase._removeHookAll_from(this.__hooksAll, hookProp, hook);
        if (this.__hooksAllTmp)
            ProxyBase._removeHook_from(this.__hooksAllTmp, hookProp, hook);
    }

    static _removeHookAll_from(obj, hookProp, hook) {
        if (obj[hookProp]) {
            const ix = obj[hookProp].findIndex(hk=>hk === hook);
            if (~ix)
                obj[hookProp].splice(ix, 1);
        }
    }

    _resetHooks(hookProp) {
        if (hookProp !== undefined)
            delete this.__hooks[hookProp];
        else
            Object.keys(this.__hooks).forEach(prop=>delete this.__hooks[prop]);
    }

    _resetHooksAll(hookProp) {
        if (hookProp !== undefined)
            delete this.__hooksAll[hookProp];
        else
            Object.keys(this.__hooksAll).forEach(prop=>delete this.__hooksAll[prop]);
    }

    _saveHookCopiesTo(obj) {
        this.__hooksTmp = obj;
    }
    _saveHookAllCopiesTo(obj) {
        this.__hooksAllTmp = obj;
    }

    _proxyAssign(hookProp, proxyProp, underProp, toObj, isOverwrite) {
        const oldKeys = Object.keys(this[proxyProp]);
        const nuKeys = new Set(Object.keys(toObj));
        const dirtyKeyValues = {};

        if (isOverwrite) {
            oldKeys.forEach(k=>{
                if (!nuKeys.has(k) && this[underProp] !== undefined) {
                    const prevValue = this[proxyProp][k];
                    delete this[underProp][k];
                    dirtyKeyValues[k] = prevValue;
                }
            }
            );
        }

        nuKeys.forEach(k=>{
            if (!CollectionUtil.deepEquals(this[underProp][k], toObj[k])) {
                const prevValue = this[proxyProp][k];
                this[underProp][k] = toObj[k];
                dirtyKeyValues[k] = prevValue;
            }
        }
        );

        Object.entries(dirtyKeyValues).forEach(([k,prevValue])=>{
            this._doFireHooksAll(hookProp, k, this[underProp][k], prevValue);
            if (this.__hooks[hookProp] && this.__hooks[hookProp][k])
                this.__hooks[hookProp][k].forEach(hk=>hk(k, this[underProp][k], prevValue));
        }
        );
    }

    _proxyAssignSimple(hookProp, toObj, isOverwrite) {
        return this._proxyAssign(hookProp, `_${hookProp}`, `__${hookProp}`, toObj, isOverwrite);
    }
}
class ProxyBase extends MixedProxyBase{

}
class BaseComponent /*extends Cls*/ extends MixedProxyBase
{
    _state;
    constructor(...args) {
        super(...args);

        this.__locks = {};
        this.__rendered = {};

        this.__state = {...this._getDefaultState()};
        this._state = this._getProxy("state", this.__state);
    }

    _addHookBase(prop, hook) {
        return this._addHook("state", prop, hook);
    }

    _removeHookBase(prop, hook) {
        return this._removeHook("state", prop, hook);
    }

    _removeHooksBase(prop) {
        return this._removeHooks("state", prop);
    }

    _addHookAllBase(hook) {
        return this._addHookAll("state", hook);
    }

    _removeHookAllBase(hook) {
        return this._removeHookAll("state", hook);
    }

    _setState(toState) {
        this._proxyAssign("state", "_state", "__state", toState, true);
    }

    _setStateValue(prop, value, {isForceTriggerHooks=true}={}) {
        if (this._state[prop] === value && !isForceTriggerHooks)
            return value;
        if (this._state[prop] !== value)
            return this._state[prop] = value;

        this._doFireHooksAll("state", prop, value, value);
        this._doFireHooks("state", prop, value, value);
        return value;
    }

    _getState() {
        return MiscUtil.copyFast(this.__state);
    }

    getPod() {
        this.__pod = this.__pod || {
            get: (prop)=>this._state[prop],
            set: (prop,val)=>this._state[prop] = val,
            delete: (prop)=>delete this._state[prop],
            addHook: (prop,hook)=>this._addHookBase(prop, hook),
            addHookAll: (hook)=>this._addHookAllBase(hook),
            removeHook: (prop,hook)=>this._removeHookBase(prop, hook),
            removeHookAll: (hook)=>this._removeHookAllBase(hook),
            triggerCollectionUpdate: (prop)=>this._triggerCollectionUpdate(prop),
            setState: (state)=>this._setState(state),
            getState: ()=>this._getState(),
            assign: (toObj,isOverwrite)=>this._proxyAssign("state", "_state", "__state", toObj, isOverwrite),
            pLock: lockName=>this._pLock(lockName),
            unlock: lockName=>this._unlock(lockName),
            component: this,
        };
        return this.__pod;
    }

    _getDefaultState() {
        return {};
    }

    getBaseSaveableState() {
        return {
            state: MiscUtil.copyFast(this.__state),
        };
    }

    setBaseSaveableStateFrom(toLoad, isOverwrite=false) {
        toLoad?.state && this._proxyAssignSimple("state", toLoad.state, isOverwrite);
    }

    _getRenderedCollection(opts) {
        opts = opts || {};
        const renderedLookupProp = opts.namespace ? `${opts.namespace}.${opts.prop}` : opts.prop;
        return (this.__rendered[renderedLookupProp] = this.__rendered[renderedLookupProp] || {});
    }

    _renderCollection(opts) {
        opts = opts || {};

        const rendered = this._getRenderedCollection(opts);
        const entities = this._state[opts.prop] || [];
        return this._renderCollection_doRender(rendered, entities, opts);
    }

    _renderCollection_doRender(rendered, entities, opts) {
        opts = opts || {};

        const toDelete = new Set(Object.keys(rendered));

        for (let i = 0; i < entities.length; ++i) {
            const it = entities[i];

            if (it.id == null)
                throw new Error(`Collection item did not have an ID!`);
            const meta = rendered[it.id];

            toDelete.delete(it.id);
            if (meta) {
                if (opts.isDiffMode) {
                    const nxtHash = this._getCollectionEntityHash(it);
                    if (nxtHash !== meta.__hash)
                        meta.__hash = nxtHash;
                    else
                        continue;
                }

                meta.data = it;
                opts.fnUpdateExisting(meta, it, i);
            } else {
                const meta = opts.fnGetNew(it, i);

                if (meta == null)
                    continue;

                meta.data = it;
                if (!meta.$wrpRow && !meta.fnRemoveEles)
                    throw new Error(`A "$wrpRow" or a "fnRemoveEles" property is required for deletes!`);

                if (opts.isDiffMode)
                    meta.__hash = this._getCollectionEntityHash(it);

                rendered[it.id] = meta;
            }
        }

        const doRemoveElements = meta=>{
            if (meta.$wrpRow)
                meta.$wrpRow.remove();
            if (meta.fnRemoveEles)
                meta.fnRemoveEles();
        }
        ;

        toDelete.forEach(id=>{
            const meta = rendered[id];
            doRemoveElements(meta);
            delete rendered[id];
            if (opts.fnDeleteExisting)
                opts.fnDeleteExisting(meta);
        }
        );

        if (opts.fnReorderExisting) {
            entities.forEach((it,i)=>{
                const meta = rendered[it.id];
                opts.fnReorderExisting(meta, it, i);
            }
            );
        }
    }

    async _pRenderCollection(opts) {
        opts = opts || {};

        const rendered = this._getRenderedCollection(opts);
        const entities = this._state[opts.prop] || [];
        return this._pRenderCollection_doRender(rendered, entities, opts);
    }

    async _pRenderCollection_doRender(rendered, entities, opts) {
        opts = opts || {};

        const toDelete = new Set(Object.keys(rendered));

        for (let i = 0; i < entities.length; ++i) {
            const it = entities[i];

            if (!it.id)
                throw new Error(`Collection item did not have an ID!`);
            const meta = rendered[it.id];

            toDelete.delete(it.id);
            if (meta) {
                if (opts.isDiffMode) {
                    const nxtHash = this._getCollectionEntityHash(it);
                    if (nxtHash !== meta.__hash)
                        meta.__hash = nxtHash;
                    else
                        continue;
                }

                const nxtMeta = await opts.pFnUpdateExisting(meta, it);
                if (opts.isMultiRender)
                    rendered[it.id] = nxtMeta;
            } else {
                const meta = await opts.pFnGetNew(it);

                if (meta == null)
                    continue;

                if (!opts.isMultiRender && !meta.$wrpRow && !meta.fnRemoveEles)
                    throw new Error(`A "$wrpRow" or a "fnRemoveEles" property is required for deletes!`);
                if (opts.isMultiRender && meta.some(it=>!it.$wrpRow && !it.fnRemoveEles))
                    throw new Error(`A "$wrpRow" or a "fnRemoveEles" property is required for deletes!`);

                if (opts.isDiffMode)
                    meta.__hash = this._getCollectionEntityHash(it);

                rendered[it.id] = meta;
            }
        }

        const doRemoveElements = meta=>{
            if (meta.$wrpRow)
                meta.$wrpRow.remove();
            if (meta.fnRemoveEles)
                meta.fnRemoveEles();
        }
        ;

        for (const id of toDelete) {
            const meta = rendered[id];
            if (opts.isMultiRender)
                meta.forEach(it=>doRemoveElements(it));
            else
                doRemoveElements(meta);
            if (opts.additionalCaches)
                opts.additionalCaches.forEach(it=>delete it[id]);
            delete rendered[id];
            if (opts.pFnDeleteExisting)
                await opts.pFnDeleteExisting(meta);
        }

        if (opts.pFnReorderExisting) {
            await entities.pSerialAwaitMap(async(it,i)=>{
                const meta = rendered[it.id];
                await opts.pFnReorderExisting(meta, it, i);
            }
            );
        }
    }

    _detachCollection(prop, namespace=null) {
        const renderedLookupProp = namespace ? `${namespace}.${prop}` : prop;
        const rendered = (this.__rendered[renderedLookupProp] = this.__rendered[renderedLookupProp] || {});
        Object.values(rendered).forEach(it=>it.$wrpRow.detach());
    }

    _resetCollectionRenders(prop, namespace=null) {
        const renderedLookupProp = namespace ? `${namespace}.${prop}` : prop;
        const rendered = (this.__rendered[renderedLookupProp] = this.__rendered[renderedLookupProp] || {});
        Object.values(rendered).forEach(it=>it.$wrpRow.remove());
        delete this.__rendered[renderedLookupProp];
    }

    _getCollectionEntityHash(ent) {
        return CryptUtil.md5(JSON.stringify(ent));
    }

    render() {
        throw new Error("Unimplemented!");
    }

    getSaveableState() {
        return {
            ...this.getBaseSaveableState()
        };
    }
    setStateFrom(toLoad, isOverwrite=false) {
        this.setBaseSaveableStateFrom(toLoad, isOverwrite);
    }

    async _pLock(lockName) {
        while (this.__locks[lockName])
            await this.__locks[lockName].lock;
        let unlock = null;
        const lock = new Promise(resolve=>unlock = resolve);
        this.__locks[lockName] = {
            lock,
            unlock,
        };
    }

    async _pGate(lockName) {
        while (this.__locks[lockName])
            await this.__locks[lockName].lock;
    }

    _unlock(lockName) {
        const lockMeta = this.__locks[lockName];
        if (lockMeta) {
            delete this.__locks[lockName];
            lockMeta.unlock();
        }
    }

    async _pDoProxySetBase(prop, value) {
        return this._pDoProxySet("state", this.__state, prop, value);
    }

    _triggerCollectionUpdate(prop) {
        if (!this._state[prop])
            return;
        this._state[prop] = [...this._state[prop]];
    }

    static _toCollection(array) {
        if (array)
            return array.map(it=>({
                id: CryptUtil.uid(),
                entity: it
            }));
    }

    static _fromCollection(array) {
        if (array)
            return array.map(it=>it.entity);
    }

    /**
     * Create a new BaseComponent and paste every entry in 'obj' to the new component's __state
     * @param {any} obj
     * @param {string[]} noModCollections
     * @returns {BaseComponent}
     */
    static fromObject(obj, ...noModCollections) {
        const comp = new this();
        Object.entries(MiscUtil.copyFast(obj)).forEach(([k,v])=>{
            if (v == null)
                comp.__state[k] = v;
            else if (noModCollections.includes(k) || noModCollections.includes("*"))
                comp.__state[k] = v;
            else if (typeof v === "object" && v instanceof Array)
                comp.__state[k] = BaseComponent._toCollection(v);
            else
                comp.__state[k] = v;
        }
        );
        return comp;
    }

    static fromObjectNoMod(obj) {
        return this.fromObject(obj, "*");
    }

    toObject(...noModCollections) {
        const cpy = MiscUtil.copyFast(this.__state);
        Object.entries(cpy).forEach(([k,v])=>{
            if (v == null)
                return;

            if (noModCollections.includes(k) || noModCollections.includes("*"))
                cpy[k] = v;
            else if (v instanceof Array && v.every(it=>it && it.id))
                cpy[k] = BaseComponent._fromCollection(v);
        }
        );
        return cpy;
    }

    toObjectNoMod() {
        return this.toObject("*");
    }
}
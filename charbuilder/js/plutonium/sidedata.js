class SideDataInterfaceBase {
    static _SIDE_DATA = null;

    static async pPreloadSideData() {
        this._SIDE_DATA = await this._pGetPreloadSideData();
        return this._SIDE_DATA;
    }

    static async _pGetPreloadSideData() {
        throw new Error("Unimplemented!");
    }

    static init() {}

    /**
     * @param {{name: string, className: string, classSource: string, level: number, source: string, displayText: string}} ent
     * @returns {any}
     */
    static _getSideLoadOpts(ent) {
        return null;
    }

    static _SIDE_LOAD_OPTS = null;

    /**
     * @param {{ent: {name: string, className: string, classSource: string, level: number, source: string, displayText: string}, propOpts:string}}
     * @returns {any}
     */
    static _getResolvedOpts({ent, propOpts="_SIDE_LOAD_OPTS"}={}) {
        const out = this._getSideLoadOpts(ent) || this[propOpts];
        if (out.propsMatch)
            return out;
        return {
            ...out,
            propsMatch: ["source", "name"],
        };
    }

    static async pGetRoot(ent, {propOpts="_SIDE_LOAD_OPTS", actorType=undefined}={}) {
        const opts = this._getResolvedOpts({
            ent,
            propOpts
        });
        if (!opts)
            return null;

        const {propBrew, fnLoadJson, propJson, propsMatch} = opts;
        return this._pGetStarSideLoaded(ent, {
            propBrew,
            fnLoadJson,
            propJson,
            propsMatch,
            propFromEntity: "foundryRoot",
            propFromSideLoaded: "root",
            actorType
        });
    }

    static async pGetDataSideLoaded(ent, {propOpts="_SIDE_LOAD_OPTS", systemBase=undefined, actorType=undefined}={}) {
        const opts = this._getResolvedOpts({
            ent,
            propOpts
        });
        if (!opts)
            return null;

        const {propBrew, fnLoadJson, propJson, propsMatch} = opts;
        return this._pGetStarSideLoaded(ent, {
            propBrew,
            fnLoadJson,
            propJson,
            propsMatch,
            propFromEntity: "foundrySystem",
            propFromSideLoaded: "system",
            base: systemBase,
            actorType
        });
    }

    static async pGetFlagsSideLoaded(ent, {propOpts="_SIDE_LOAD_OPTS", actorType=undefined}={}) {
        const opts = this._getResolvedOpts({
            ent,
            propOpts
        });
        if (!opts)
            return null;

        const {propBrew, fnLoadJson, propJson, propsMatch} = opts;
        return this._pGetStarSideLoaded(ent, {
            propBrew,
            fnLoadJson,
            propJson,
            propsMatch,
            propFromEntity: "foundryFlags",
            propFromSideLoaded: "flags",
            actorType
        });
    }

    static async _pGetAdvancementSideLoaded(ent, {propOpts="_SIDE_LOAD_OPTS", actorType=undefined}={}) {
        const opts = this._getResolvedOpts({
            ent,
            propOpts
        });
        if (!opts)
            return null;

        const {propBrew, fnLoadJson, propJson, propsMatch} = opts;
        return this._pGetStarSideLoaded(ent, {
            propBrew,
            fnLoadJson,
            propJson,
            propsMatch,
            propFromEntity: "foundryAdvancement",
            propFromSideLoaded: "advancement",
            actorType
        });
    }

    static async pGetImgSideLoaded(ent, {propOpts="_SIDE_LOAD_OPTS", actorType=undefined}={}) {
        const opts = this._getResolvedOpts({
            ent,
            propOpts
        });
        if (!opts)
            return null;

        const {propBrew, fnLoadJson, propJson, propsMatch} = opts;
        return this._pGetStarSideLoaded(ent, {
            propBrew,
            fnLoadJson,
            propJson,
            propsMatch,
            propFromEntity: "foundryImg",
            propFromSideLoaded: "img",
            actorType
        });
    }

    /**
     * @param {{name: string, className: string, classSource: string, level: number, source: string, displayText: string}} ent
     * @param {any} propOpts
     * @param {any} actorType
     * @returns {any}
     */
    static async pGetIsIgnoredSideLoaded(ent, {propOpts="_SIDE_LOAD_OPTS", actorType=undefined}={}) {
        const opts = this._getResolvedOpts({ ent, propOpts });
        if (!opts)
            return null;

        const {propBrew, fnLoadJson, propJson, propsMatch} = opts;
        return this._pGetStarSideLoaded(ent, {
            propBrew,
            fnLoadJson,
            propJson,
            propsMatch,
            propFromEntity: "foundryIsIgnored",
            propFromSideLoaded: "isIgnored",
            actorType
        });
    }

    static async pIsIgnoreSrdEffectsSideLoaded(ent, {propOpts="_SIDE_LOAD_OPTS", actorType=undefined}={}) {
        const opts = this._getResolvedOpts({
            ent,
            propOpts
        });
        if (!opts)
            return null;
        return this._pGetStarSideLoaded(ent, {
            ...opts,
            propFromEntity: "foundryIgnoreSrdEffects",
            propFromSideLoaded: "ignoreSrdEffects",
            actorType
        });
    }

    static async pGetEffectsRawSideLoaded(ent, {propOpts="_SIDE_LOAD_OPTS", actorType=undefined}={}) {
        const opts = this._getResolvedOpts({
            ent,
            propOpts
        });
        if (!opts)
            return null;

        const {propBrew, fnLoadJson, propJson, propsMatch} = opts;
        const out = await this._pGetStarSideLoaded(ent, {
            propBrew,
            fnLoadJson,
            propJson,
            propsMatch,
            propFromEntity: "foundryEffects",
            propFromSideLoaded: "effects",
            actorType
        });

        if (!out?.length)
            return out;

        return out.filter(it=>{
            if (!it)
                return false;
            if (!it.requires)
                return true;

            return Object.keys(it.requires).every(k=>UtilCompat.isModuleActive(k));
        }
        );
    }

    static async pGetEffectsSideLoadedTuples({ent, actor=null, sheetItem=null, additionalData=null, img=null}, {propOpts="_SIDE_LOAD_OPTS"}={}) {
        const outRaw = await this.pGetEffectsRawSideLoaded(ent, {
            propOpts
        });
        if (!outRaw?.length)
            return [];

        return UtilActiveEffects.getExpandedEffects(outRaw, {
            actor,
            sheetItem,
            parentName: UtilEntityGeneric.getName(ent),
            img,
        }, {
            isTuples: true,
        }, );
    }

    static async pGetSideLoaded(ent, {propOpts="_SIDE_LOAD_OPTS", actorType=undefined, isSilent=false}={}) {
        const opts = this._getResolvedOpts({
            ent,
            propOpts
        });
        if (!opts)
            return null;
        return this._pGetSideLoadedMatch(ent, {
            ...opts,
            actorType,
            isSilent
        });
    }

    static async pGetSideLoadedType(ent, {propOpts="_SIDE_LOAD_OPTS", validTypes, actorType=undefined}={}) {
        const opts = this._getResolvedOpts({
            ent,
            propOpts
        });
        if (!opts)
            return null;

        const {propBrew, fnLoadJson, propJson, propsMatch} = opts;

        let out = await this._pGetStarSideLoaded(ent, {
            propBrew,
            fnLoadJson,
            propJson,
            propsMatch,
            propFromEntity: "foundryType",
            propFromSideLoaded: "type",
            actorType
        });
        if (!out)
            return out;
        out = out.toLowerCase().trim();
        if (validTypes && !validTypes.has(out))
            return null;
        return out;
    }

    static async _pGetStarSideLoaded(ent, {propBrew, fnLoadJson, propJson, propsMatch, propFromEntity, propFromSideLoaded, base=undefined, actorType=undefined, }, ) {
        const found = await this._pGetSideLoadedMatch(ent, {
            propBrew,
            fnLoadJson,
            propJson,
            propsMatch,
            propBase: propFromSideLoaded,
            base,
            actorType
        });
        return this._pGetStarSideLoaded_found(ent, {
            propFromEntity,
            propFromSideLoaded,
            found
        });
    }

    static async _pGetStarSideLoaded_found(ent, {propFromEntity, propFromSideLoaded, found}) {
        const fromEntity = ent[propFromEntity];

        if ((!found || !found[propFromSideLoaded]) && !fromEntity)
            return null;

        const out = MiscUtil.copy(found?.[propFromSideLoaded] ? found[propFromSideLoaded] : fromEntity);
        if (found?.[propFromSideLoaded] && fromEntity) {
            if (out instanceof Array)
                out.push(...MiscUtil.copy(fromEntity));
            else
                Object.assign(out, MiscUtil.copy(fromEntity));
        }

        return out;
    }

    static async _pGetSideLoadedMatch(ent, {propBrew, fnLoadJson, propJson, propsMatch, propBase, base=undefined, actorType=undefined, isSilent=false}={}) {
        const founds = [];

        //TEMPFIX
        /* if (UtilCompat.isPlutoniumAddonAutomationActive()) {
            const valsLookup = propsMatch.map(prop=>ent[prop]).filter(Boolean);
            const found = await UtilCompat.getApi(UtilCompat.MODULE_PLUTONIUM_ADDON_AUTOMATION).pGetExpandedAddonData({
                propJson,
                path: valsLookup,
                fnMatch: this._pGetAdditional_fnMatch.bind(this, propsMatch, ent),
                ent,
                propBase,
                base,
                actorType,
                isSilent,
            });
            if (found)
                founds.push(found);
        } */

        if (propBrew) {
            const prerelease = await PrereleaseUtil.pGetBrewProcessed();
            const foundPrerelease = (MiscUtil.get(prerelease, propBrew) || []).find(it=>this._pGetAdditional_fnMatch(propsMatch, ent, it));
            if (foundPrerelease)
                founds.push(foundPrerelease);

            const brew = await BrewUtil2.pGetBrewProcessed();
            const foundBrew = (MiscUtil.get(brew, propBrew) || []).find(it=>this._pGetAdditional_fnMatch(propsMatch, ent, it));
            if (foundBrew)
                founds.push(foundBrew);
        }

        if (fnLoadJson && propJson) {
            const sideJson = await fnLoadJson();
            const found = (sideJson[propJson] || []).find(it=>this._pGetAdditional_fnMatch(propsMatch, ent, it));
            if (found)
                founds.push(found);
        }

        if (!founds.length)
            return null;
        if (founds.length === 1)
            return founds[0];

        const out = MiscUtil.copy(founds[0]);
        this._pGetSideLoaded_match_mutMigrateData(out);
        delete out._merge;

        founds.slice(1).forEach((found,i)=>{
            this._pGetSideLoaded_match_mutMigrateData(found);

            Object.entries(found).filter(([prop])=>prop !== "_merge").forEach(([prop,v])=>{
                if (out[prop] === undefined)
                    return out[prop] = v;

                const prevFounds = founds.slice(0, i + 1);
                if (!prevFounds.every(foundPrev=>foundPrev[prop] === undefined || foundPrev._merge?.[prop]))
                    return;

                if (out[prop] == null)
                    return out[prop] = v;
                if (typeof out[prop] !== "object")
                    return out[prop] = v;

                if (out[prop]instanceof Array) {
                    if (!(v instanceof Array))
                        throw new Error(`Could not _merge array and non-array`);
                    return out[prop] = [...out[prop], ...v];
                }

                out[prop] = foundry.utils.mergeObject(v, out[prop]);
            }
            );
        }
        );

        return out;
    }

    static _pGetSideLoaded_match_mutMigrateData(found) {
        if (!found)
            return;
        return found;
    }

    static _pGetAdditional_fnMatch(propsMatch, entity, additionalDataEntity) {
        return propsMatch.every(prop=>{
            if (typeof entity[prop] === "number" || typeof additionalDataEntity[prop] === "number")
                return Number(entity[prop]) === Number(additionalDataEntity[prop]);
            return `${(entity[prop] || "")}`.toLowerCase() === `${(additionalDataEntity[prop] || "").toLowerCase()}`;
        }
        );
    }
}

class SideDataInterfaceClass extends SideDataInterfaceBase {
    static _SIDE_LOAD_OPTS = {
        propBrew: "foundryClass",
        fnLoadJson: async()=>this.pPreloadSideData(),
        propJson: "class",
    };

    static _SIDE_LOAD_OPTS_SUBCLASS = {
        propBrew: "foundrySubclass",
        fnLoadJson: async()=>this.pPreloadSideData(),
        propJson: "subclass",
        propsMatch: ["classSource", "className", "source", "name"],
    };

    static async pPreloadSideData() {
        return Vetools.pGetClassSubclassSideData();
    }

    static init() {
        PageFilterClassesFoundry.setImplSideData("class", this);
        PageFilterClassesFoundry.setImplSideData("subclass", this);
    }
}
class SideDataInterfaceClassSubclassFeature extends SideDataInterfaceBase {
     /**
     * @param {{name: string, className: string, classSource: string, level: number, source: string, displayText: string}} feature
     * @returns {any}
     */
    static _getSideLoadOpts(feature) {
        return {
            propBrew: UtilEntityClassSubclassFeature.getBrewProp(feature),
            fnLoadJson: async()=>this.pPreloadSideData(),
            propJson: UtilEntityClassSubclassFeature.getEntityType(feature),
            propsMatch: ["classSource", "className", "subclassSource", "subclassShortName", "level", "source", "name"],
        };
    }

    static async _pGetPreloadSideData() {
        return Vetools.pGetClassSubclassSideData();
    }

    static init() {
        PageFilterClassesFoundry.setImplSideData("classFeature", this);
        PageFilterClassesFoundry.setImplSideData("subclassFeature", this);
    }
}
class SideDataInterfaceFeat extends SideDataInterfaceBase {
    static _SIDE_LOAD_OPTS = {
        propBrew: "foundryFeat",
        fnLoadJson: async()=>this.pPreloadSideData(),
        propJson: "feat",
    };

    static async _pGetPreloadSideData() {
        return Vetools.pGetFeatSideData();
    }

    static init() {
        PageFilterClassesFoundry.setImplSideData("feat", this);
    }
}
class SideDataInterfaceOptionalfeature extends SideDataInterfaceBase {
    static _SIDE_LOAD_OPTS = {
        propBrew: "foundryOptionalfeature",
        fnLoadJson: async()=>this.pPreloadSideData(),
        propJson: "optionalfeature",
    };

    static async _pGetPreloadSideData() {
        return Vetools.pGetOptionalFeatureSideData();
    }

    static init() {
        PageFilterClassesFoundry.setImplSideData("optionalfeature", this);
    }
}
class SideDataInterfaceReward extends SideDataInterfaceBase {
    static _SIDE_LOAD_OPTS = {
        propBrew: "foundryReward",
        fnLoadJson: async()=>this.pPreloadSideData(),
        propJson: "reward",
    };

    static async _pGetPreloadSideData() {
        return Vetools.pGetRewardSideData();
    }

    static init() {
        PageFilterClassesFoundry.setImplSideData("reward", this);
    }
}
class SideDataInterfaceCharCreationOption extends SideDataInterfaceBase {
    static _SIDE_LOAD_OPTS = {
        propBrew: "foundryCharoption",
        fnLoadJson: async()=>this.pPreloadSideData(),
        propJson: "charoption",
    };

    static async _pGetPreloadSideData() {
        return Vetools.pGetCharCreationOptionSideData();
    }

    static init() {
        PageFilterClassesFoundry.setImplSideData("charoption", this);
    }
}
class SideDataInterfaceVehicleUpgrade extends SideDataInterfaceBase {
    static _SIDE_LOAD_OPTS = {
        propBrew: "foundryVehicleUpgrade",
        fnLoadJson: async()=>this.pPreloadSideData(),
        propJson: "vehicleUpgrade",
    };

    static async _pGetPreloadSideData() {
        return Vetools.pGetVehicleUpgradeSideData();
    }

    static init() {
        PageFilterClassesFoundry.setImplSideData("vehicleUpgrade", this);
    }
}

class SideDataInterfaces {
    static init() {
        SideDataInterfaceClass.init();
        SideDataInterfaceClassSubclassFeature.init();
        SideDataInterfaceOptionalfeature.init();
        SideDataInterfaceFeat.init();
        SideDataInterfaceReward.init();
        SideDataInterfaceCharCreationOption.init();
        SideDataInterfaceVehicleUpgrade.init();
    }
}
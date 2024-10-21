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

    static async pGetSystemSideLoaded (ent, {sideDataSourceGenerated, propOpts = "_SIDE_LOAD_OPTS", systemBase = undefined, actorType = undefined} = {}) {
		const opts = this._getResolvedOpts({ent, propOpts});
		if (!opts) return null;

		const {propBrew, fnLoadJson, propJson, propsMatch} = opts;
		return this._pGetStarSideLoaded(ent, {sideDataSourceGenerated, propBrew, fnLoadJson, propJson, propsMatch, propFromEntity: "foundrySystem", propFromSideLoaded: "system", base: systemBase, actorType});
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

class SideDataInterfaceItem extends SideDataInterfaceBase {
	static _SIDE_LOAD_OPTS = {
		propBrew: "foundryItem",
		fnLoadJson: Vetools.pGetItemSideData,
		propJson: "item",
	};

	static _SIDE_LOAD_OPTS_MAGICVARIANT = {
		propBrew: "foundryMagicvariant",
		fnLoadJson: Vetools.pGetItemSideData,
		propJson: "magicvariant",
	};

	static async pGetSideLoadedType (item, opts = {}) {
		return super.pGetSideLoadedType(item, {...opts, validTypes: UtilDocumentItem.TYPES_ITEM});
	}

	static async pGetRoot (ent, opts) {
		const fromItem = await super.pGetRoot(ent, opts);

		if (!ent._variantName) return fromItem;

		const fromVariant = await super.pGetRoot(UtilEntityItem.getFauxGeneric(ent), {...opts, propOpts: "_SIDE_LOAD_OPTS_MAGICVARIANT"});
		if (!fromItem || !fromVariant) return fromVariant;

				return {
			...fromVariant,
			...fromItem,
		};
	}

	static async pGetSystemSideLoaded (ent, opts) {
		const fromItem = await super.pGetSystemSideLoaded(ent, opts);

		if (!ent._variantName) return fromItem;

		const fromVariant = await super.pGetSystemSideLoaded(UtilEntityItem.getFauxGeneric(ent), {...opts, propOpts: "_SIDE_LOAD_OPTS_MAGICVARIANT"});
		if (!fromItem || !fromVariant) return fromVariant;

				return {
			...fromVariant,
			...fromItem,
		};
	}

	static async pGetFlagsSideLoaded (ent, opts) {
		const fromItem = await super.pGetFlagsSideLoaded(ent, opts);

		if (!ent._variantName) return fromItem;

		const fromVariant = await super.pGetFlagsSideLoaded(UtilEntityItem.getFauxGeneric(ent), {...opts, propOpts: "_SIDE_LOAD_OPTS_MAGICVARIANT"});
		if (!fromItem || !fromVariant) return fromVariant;

				return {
			...fromVariant,
			...fromItem,
		};
	}

	static async pGetImgSideLoaded (ent, opts) {
		const fromItem = await super.pGetImgSideLoaded(ent, opts);
		if (fromItem || !ent._variantName) return fromItem;

		return super.pGetImgSideLoaded(UtilEntityItem.getFauxGeneric(ent), {...opts, propOpts: "_SIDE_LOAD_OPTS_MAGICVARIANT"});
	}

	static async pGetEffectsRawSideLoaded (ent, opts) {
		const fromItem = await super.pGetEffectsRawSideLoaded(ent, opts);

				if (fromItem?.length) return fromItem;

		if (!ent._variantName) return fromItem;

		const fromVariant = await super.pGetEffectsRawSideLoaded(UtilEntityItem.getFauxGeneric(ent), {...opts, propOpts: "_SIDE_LOAD_OPTS_MAGICVARIANT"});
		if (!fromItem || !fromVariant) return fromVariant;

		return [
			...fromItem,
			...fromVariant,
		];
	}
}

var SideDataInterfaceItem$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    SideDataInterfaceItem: SideDataInterfaceItem
});

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
class SideDataSourceBase {
    async pGetSideLoadedMatch (
    ent,
    {
        propBrew,
        fnLoadJson,
        propJson,
        propsMatch,
        propBase,
        base = undefined,
        actorType = undefined,
        isSilent = false,
    } = {},
) {
    throw new Error("Unimplemented!");
}

static _INSTANCE = null;

static get () { return this._INSTANCE ||= new this(); }

static _pGetSideLoadedMatch_fnMatch (propsMatch, entity, additionalDataEntity) {
    return propsMatch
        .every(prop => {
            if (typeof entity[prop] === "number" || typeof additionalDataEntity[prop] === "number") return Number(entity[prop]) === Number(additionalDataEntity[prop]);
            return `${(entity[prop] || "")}`.toLowerCase() === `${(additionalDataEntity[prop] || "").toLowerCase()}`;
        });
}
}
class SideDataSourceGeneratedBase extends SideDataSourceBase {}

class SideDataSourceGeneratedItem extends SideDataSourceGeneratedBase {
	constructor (
		{
			ent,
			img,
			isEffectsDisabled,
		},
	) {
		super();
		this._ent = ent;
		this._img = img;
		this._isEffectsDisabled = isEffectsDisabled;
	}

	
	async pGetSideLoadedMatch (
		ent,
		{
			propBrew,
			fnLoadJson,
			propJson,
			propsMatch,
			propBase,
			base = undefined,
			actorType = undefined,
			isSilent = false,
		} = {},
	) {
		return {
			effects: await this._pGetEffects({propBase}),
		};
	}

	static _ITEM_EFFECTS_HINTS_SELF = {hintDisabled: false, hintTransfer: true};
	static _ITEM_EFFECTS_HINTS_SELF__POTION = {hintDisabled: false, hintTransfer: false, hintSelfTarget: true};

	async _pGetEffects ({propBase}) {
		if (propBase !== "effects") return [];

		const out = [];

		const hintSelf = this._ent.type && DataUtil.itemType.unpackUid(this._ent.type).abbreviation === Parser.ITM_TYP_ABV__POTION
			? this.constructor._ITEM_EFFECTS_HINTS_SELF__POTION
			: this.constructor._ITEM_EFFECTS_HINTS_SELF;

				const effectsAc = this._getAcEffects();
		out.push(...UtilActiveEffects.mutEffectsDisabledTransfer(effectsAc, "importItem", hintSelf));
		
				if (this._ent.bonusSavingThrow) {
			const effect = this._getGenericBonus({
				name: "Saving Throw Bonus",
				key: "system.bonuses.abilities.save",
				prop: "bonusSavingThrow",
			});
			if (effect) out.push(UtilActiveEffects.mutEffectDisabledTransfer(effect, "importItem", hintSelf));
		}
		
				if (this._ent.bonusAbilityCheck) {
			const effect = this._getGenericBonus({
				name: "Ability Check Bonus",
				key: "system.bonuses.abilities.check",
				prop: "bonusAbilityCheck",
			});
			if (effect) out.push(UtilActiveEffects.mutEffectDisabledTransfer(effect, "importItem", hintSelf));
		}
		
				if (this._ent.bonusSpellAttack) {
			const effectMelee = this._getGenericBonus({
				name: "Spell Attack Bonus (Melee)",
				key: "system.bonuses.msak.attack",
				prop: "bonusSpellAttack",
			});
			if (effectMelee) out.push(UtilActiveEffects.mutEffectDisabledTransfer(effectMelee, "importItem", hintSelf));

			const effectRanged = this._getGenericBonus({
				name: "Spell Attack Bonus (Ranged)",
				key: "system.bonuses.rsak.attack",
				prop: "bonusSpellAttack",
			});
			if (effectRanged) out.push(UtilActiveEffects.mutEffectDisabledTransfer(effectRanged, "importItem", hintSelf));
		}
		
				if (this._ent.bonusSpellAttack) {
			const effectMelee = this._getGenericBonus({
				name: "Spell Damage Bonus (Melee)",
				key: "system.bonuses.msak.damage",
				prop: "bonusSpellDamage",
			});
			if (effectMelee) out.push(UtilActiveEffects.mutEffectDisabledTransfer(effectMelee, "importItem", hintSelf));

			const effectRanged = this._getGenericBonus({
				name: "Spell Damage Bonus (Ranged)",
				key: "system.bonuses.rsak.damage",
				prop: "bonusSpellDamage",
			});
			if (effectRanged) out.push(UtilActiveEffects.mutEffectDisabledTransfer(effectRanged, "importItem", hintSelf));
		}
		
				if (this._ent.bonusSpellSaveDc) {
			const effect = this._getGenericBonus({
				name: "Spell Save DC Bonus",
				key: "system.bonuses.spell.dc",
				prop: "bonusSpellSaveDc",
			});
			if (effect) out.push(UtilActiveEffects.mutEffectDisabledTransfer(effect, "importItem", hintSelf));
		}
		
				if (this._ent.bonusProficiencyBonus) {
			const effect = this._getGenericBonus({
				name: "Proficiency Bonus... Bonus?", 				key: "system.attributes.prof",
				prop: "bonusProficiencyBonus",
			});
			if (effect) out.push(UtilActiveEffects.mutEffectDisabledTransfer(effect, "importItem", hintSelf));
		}
		
				if (this._ent.bonusSavingThrowConcentration) {
			const effect = this._getGenericBonus({
				name: "Concentration Saving Throw Bonus",
				key: "system.attributes.concentration.bonuses.save",
				prop: "bonusSavingThrowConcentration",
			});
			if (effect) out.push(UtilActiveEffects.mutEffectDisabledTransfer(effect, "importItem", hintSelf));
		}
		
				if (this._ent.ability) {
			if (this._ent.ability.static) {
				Parser.ABIL_ABVS.forEach(ab => {
					if (this._ent.ability.static[ab] == null) return;

					const effect = UtilActiveEffects.getGenericEffect({
						key: `system.abilities.${ab}.value`,
						value: this._ent.ability.static[ab],
						mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE,
						name: `Base ${Parser.attAbvToFull(ab)}`,
						icon: this._img,
						disabled: this._isEffectsDisabled,
						priority: UtilActiveEffects.PRIORITY_BASE,
					});
					out.push(UtilActiveEffects.mutEffectDisabledTransfer(effect, "importItem", hintSelf));
				});
			}

			Parser.ABIL_ABVS.forEach(ab => {
				if (this._ent.ability[ab] == null) return;

				const effect = UtilActiveEffects.getGenericEffect({
					key: `system.abilities.${ab}.value`,
					value: UiUtil.intToBonus(this._ent.ability[ab]),
					mode: CONST.ACTIVE_EFFECT_MODES.ADD,
					name: `Bonus ${Parser.attAbvToFull(ab)}`,
					icon: this._img,
					disabled: this._isEffectsDisabled,
					priority: UtilActiveEffects.PRIORITY_BONUS,
				});
				out.push(UtilActiveEffects.mutEffectDisabledTransfer(effect, "importItem", hintSelf));
			});
		}
		
				const actorDataDrDiDvCi = UtilActorsDamageResImmVulnConditionImm.getActorDamageResImmVulnConditionImm(this._ent);
		const effectsDr = await this._getDrDiDvCiEffects({name: "Damage Resistance", actProp: "dr", actorDataDrDiDvCi});
		const effectsDu = await this._getDrDiDvCiEffects({name: "Damage Immunity", actProp: "di", actorDataDrDiDvCi});
		const effectsDv = await this._getDrDiDvCiEffects({name: "Damage Vulnerability", actProp: "dv", actorDataDrDiDvCi});
		const effectsCi = await this._getDrDiDvCiEffects({name: "Condition Immunity", actProp: "ci", actorDataDrDiDvCi});
		out.push(...UtilActiveEffects.mutEffectsDisabledTransfer(effectsDr, "importItem", hintSelf));
		out.push(...UtilActiveEffects.mutEffectsDisabledTransfer(effectsDu, "importItem", hintSelf));
		out.push(...UtilActiveEffects.mutEffectsDisabledTransfer(effectsDv, "importItem", hintSelf));
		out.push(...UtilActiveEffects.mutEffectsDisabledTransfer(effectsCi, "importItem", hintSelf));
		
				const speedChanges = [];
		if (this._ent.modifySpeed?.multiply) {
			Object.entries(this._ent.modifySpeed.multiply)
				.forEach(([speedMode, multiplier]) => {
					if (speedMode === "*") {
						Parser.SPEED_MODES.forEach(mode => {
							speedChanges.push(UtilActiveEffects.getGenericChange({
								key: `system.attributes.movement.${mode}`,
								value: multiplier,
								mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
								priority: UtilActiveEffects.PRIORITY_BONUS,
							}));
						});
						return;
					}

					speedChanges.push(UtilActiveEffects.getGenericChange({
						key: `system.attributes.movement.${speedMode}`,
						value: multiplier,
						mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
						priority: UtilActiveEffects.PRIORITY_BONUS,
					}));
				});
		}

		if (this._ent.modifySpeed?.static) {
			Object.entries(this._ent.modifySpeed.static)
				.forEach(([speedMode, value]) => {
					speedChanges.push(UtilActiveEffects.getGenericChange({
						key: `system.attributes.movement.${speedMode}`,
						value: value,
																		mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
						priority: UtilActiveEffects.PRIORITY_BASE,
					}));
				});
		}

		if (this._ent.modifySpeed?.equal) {
			Object.entries(this._ent.modifySpeed.equal)
				.forEach(([speedMode, otherSpeedMode]) => {
					speedChanges.push(UtilActiveEffects.getGenericChange({
						key: `system.attributes.movement.${speedMode}`,
						value: `@attributes.movement.${otherSpeedMode}`,
																		mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
						priority: UtilActiveEffects.PRIORITY_BASE,
					}));
				});
		}

		if (this._ent.modifySpeed?.bonus) {
			Object.entries(this._ent.modifySpeed.bonus)
				.forEach(([speedMode, bonus]) => {
										bonus = UiUtil.intToBonus(bonus);

					if (speedMode === "*") {
						Parser.SPEED_MODES.forEach(mode => {
							speedChanges.push(UtilActiveEffects.getGenericChange({
								key: `system.attributes.movement.${mode}`,
								value: UiUtil.intToBonus(bonus),
								mode: CONST.ACTIVE_EFFECT_MODES.ADD,
								priority: UtilActiveEffects.PRIORITY_BONUS,
							}));
						});
						return;
					}

					speedChanges.push(UtilActiveEffects.getGenericChange({
						key: `system.attributes.movement.${speedMode}`,
						value: UiUtil.intToBonus(bonus),
						mode: CONST.ACTIVE_EFFECT_MODES.ADD,
						priority: UtilActiveEffects.PRIORITY_BONUS,
					}));
				});
		}

		if (speedChanges.length) {
			const effect = UtilActiveEffects.getGenericEffect({
				name: `Speed Adjustment`,
				icon: this._img,
				disabled: this._isEffectsDisabled,
				changes: speedChanges,
			});
			out.push(UtilActiveEffects.mutEffectDisabledTransfer(effect, "importItem", hintSelf));
		}
		
						
		return UtilActiveEffects.getEffectsMutDedupeId(out);
	}

	_getAcEffects () {
		if (UtilCompat.isDaeGeneratingArmorEffects()) return [];

		const out = [];

		const acMeta = UtilEntityItem.getAcInfo(this._ent);
		if (acMeta.acValue != null && !acMeta.isTypeAutoCalculated) {
			out.push(UtilActiveEffects.getGenericEffect({
				key: "system.attributes.ac.bonus",
				value: UiUtil.intToBonus(acMeta.acValue),
				mode: CONST.ACTIVE_EFFECT_MODES.ADD,
				name: `Bonus AC`,
				icon: this._img,
				disabled: this._isEffectsDisabled,
				priority: UtilActiveEffects.PRIORITY_BONUS,
			}));
		}

		return out;
	}

	_getGenericBonus ({name, key, prop}) {
		const bonus = !isNaN(this._ent[prop]) ? Number(this._ent[prop]) : 0;
		if (!bonus) return null;

		return UtilActiveEffects.getGenericEffect({
			key,
			value: UiUtil.intToBonus(bonus),
			mode: CONST.ACTIVE_EFFECT_MODES.ADD,
			name,
			icon: this._img,
			disabled: this._isEffectsDisabled,
			priority: UtilActiveEffects.PRIORITY_BONUS,
		});
	}

	_getDrDiDvCiEffects ({name, actProp, actorDataDrDiDvCi}) {
		if (!actorDataDrDiDvCi[actProp]) return [];

		const out = [];

		if (actorDataDrDiDvCi[actProp].value) {
			actorDataDrDiDvCi[actProp].value.forEach(it => {
				out.push(UtilActiveEffects.getGenericEffect({
					key: `system.traits.${actProp}.value`,
					value: it,
					mode: CONST.ACTIVE_EFFECT_MODES.ADD,
					name,
					icon: this._img,
					disabled: this._isEffectsDisabled,
					priority: UtilActiveEffects.PRIORITY_BONUS,
				}));
			});
		}

		if (actorDataDrDiDvCi[actProp].custom?.length) {
			out.push(UtilActiveEffects.getGenericEffect({
				key: `system.traits.${actProp}.custom`,
				value: actorDataDrDiDvCi[actProp].custom,
				mode: CONST.ACTIVE_EFFECT_MODES.ADD,
				name,
				icon: this._img,
				disabled: this._isEffectsDisabled,
				priority: UtilActiveEffects.PRIORITY_BONUS,
			}));
		}

		return out;
	}
}
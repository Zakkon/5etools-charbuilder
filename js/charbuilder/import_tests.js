class ImportTester{

    async runTest(item){
       /*  this.handleReady().then(() => {
            console.log("Ready done!");
        }); */
        console.log("ITEM", item);
        const flags = this.getFlags(item);
        console.log("FLAGS", flags);
        let ent = await DataLoader.pCacheAndGet(flags.page, flags.source, flags.hash);
        console.log("ENT", ent);

        const isUseImporter = true;
        const pFnImport = null;
        //const actor = item.parent;
        const actor = {};

        if (isUseImporter) {
            //const actorMultiImportHelper = new ActorMultiImportHelper({actor});
            const imp = new ImportListItem({actor});
            await imp.pInit();

            if (pFnImport) await pFnImport({ent, imp, flags});
            else await imp.pImportEntry(ent, {filterValues: flags.filterValues});



            //await actorMultiImportHelper.pRepairMissingConsumes();

            const msg = fnGetSuccessMessage ? fnGetSuccessMessage({ent, flags}) : `Imported "${ent.name}" via ${importerName} Importer`;
            ui.notifications.info(msg);
            return;
        }
    }
    getFlags(item){
        const out = {
            page: UrlUtil.PG_ITEMS,
            source: item.source,
            hash: UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS](item),
            //propDroppable: "spell",
		};
        return out;
    }
    async handleReady () {
        /* await Config.pInit();
    
        UtilActors.init();
    
        Vetools.init();
        UtilPrereleaseBrewIndices.doPreload();
        UtilActiveEffects.init();
        Patcher.init();
        UtilSocket.init();
        UtilRenderer.init();
        GameStorage.init();
        SideDataInterfaces.init();
        ImportList.init();
        ImportListBackground.init();
        ImportListClass.init();
        ImportListFeat.init(); */
        ImportListItem.init();
        /* ImportListClassSubclassFeature.init();
        ImportListOptionalfeature.init();
        ImportListPsionic.init();
        ImportListRace.init();
        ImportListReward.init();
        ImportListCharCreationOption.init();
        ImportListVehicleUpgrade.init();
        CurrencySheetAdapter.init();
        SheetLevelUpButtonManager.init();
        Charactermancer_StartingEquipment.init();
        PopoutSheet.init();
        ShowSheet.init();
        MenuTitleSceneConfig.init();
        MenuTitleActor.init();
        MenuTitleItem.init();
        MenuTitleJournalSheet.init();
        MenuTitleRollTableConfig.init();
        MenuTitleCompendium.init();
        MenuTitleArtBrowserApp.init();
        MenuTitleCombatTracker.init();
        MenuTitleSceneDirectory.init();
        MenuTitleActorDirectory.init();
        MenuTitleItemDirectory.init();
        MenuTitleJournalDirectory.init();
        MenuTitleRollTableDirectory.init();
        MenuTitleCardsDirectory.init();
        MenuTitlePlaylistDirectory.init();
        MenuTitleCompendiumDirectory.init();
        MenuTitleMacroDirectory.init();
        MenuTitleSettings.init();
        ArtBrowserApp.init();
        LootGeneratorApp.init();
        ActorPolymorpher.init();
        ActorMultiattack.init();
        TokenHpRoller.init();
        UtilEvents.init();
        UtilChat.init();
        Dnd5eAdvancementSuppressor.init();
        RivetBridge.init();
        Styler.init();
        TabRenamer.init();
        CompendiumCacheFlusher.init();
        UtilAdvancementsBackingCompendium.init();
        await UtilHandlebars.pInit();
        await UtilWorldDataSourceSelector.pInit();
        await UtilWorldContentBlocklist.pInit();
        await ChatNotificationHandlers.pInit();
        IntegrationFoundrySummons.init();
        IntegrationSpotlightOmnisearch.init(); */
    
        //Api.init();
    
        console.log(`Initialization complete!`);
    }
}

class UtilPrereleaseBrewIndices {
    static PRERELEASE_INDEX__SOURCE = {};
static PRERELEASE_INDEX__PROP = {};
static PRERELEASE_INDEX__META = {};

    static BREW_INDEX__SOURCE = {};
static BREW_INDEX__PROP = {};
static BREW_INDEX__META = {};

static doPreload () {
    if (Config.get("dataSources", "isNoPrereleaseBrewIndexes")) return;

            this._pGetPrereleaseBrewIndices()
        .then(({propPrerelease, sourcePrerelease, metaPrerelease, sourceBrew, propBrew, metaBrew}) => {
            this.PRERELEASE_INDEX__PROP = propPrerelease;
            this.PRERELEASE_INDEX__SOURCE = sourcePrerelease;
            this.PRERELEASE_INDEX__META = metaPrerelease;

            this.BREW_INDEX__PROP = propBrew;
            this.BREW_INDEX__SOURCE = sourceBrew;
            this.BREW_INDEX__META = metaBrew;

            console.log(...LGT, "Loaded prerelease/homebrew indexes.");
        })
        .catch(e => {
            ui.notifications.error(`Failed to load prerelease/homebrew indexes! ${VeCt.STR_SEE_CONSOLE}`);
            setTimeout(() => { throw e; });
        });
}

static async _pGetPrereleaseBrewIndices () {
    const out = {
        sourcePrerelease: {},
        propPrerelease: {},
        metaPrerelease: {},

        sourceBrew: {},
        propBrew: {},
        metaBrew: {},
    };

    try {
        const [
            sourceIndexPrerelease,
            propIndexPrerelease,
            metaIndexPrerelease,

            sourceIndexBrew,
            propIndexBrew,
            metaIndexBrew,
        ] = await Promise.all([
            DataUtil.prerelease.pLoadSourceIndex(Config.get("dataSources", "basePrereleaseUrl")),
            DataUtil.prerelease.pLoadPropIndex(Config.get("dataSources", "basePrereleaseUrl")),
            DataUtil.prerelease.pLoadMetaIndex(Config.get("dataSources", "basePrereleaseUrl")),

            DataUtil.brew.pLoadSourceIndex(Config.get("dataSources", "baseBrewUrl")),
            DataUtil.brew.pLoadPropIndex(Config.get("dataSources", "baseBrewUrl")),
            DataUtil.brew.pLoadMetaIndex(Config.get("dataSources", "baseBrewUrl")),
        ]);

        out.sourcePrerelease = sourceIndexPrerelease;
        out.propPrerelease = propIndexPrerelease;
        out.metaPrerelease = metaIndexPrerelease;

        out.sourceBrew = sourceIndexBrew;
        out.propBrew = propIndexBrew;
        out.metaBrew = metaIndexBrew;
    } catch (e) {
        ui.notifications.error(`Failed to load prerelease/homebrew index! ${VeCt.STR_SEE_CONSOLE}`);
        setTimeout(() => { throw e; });
    }

    return out;
}


static isPartneredSource (src) {
    if (SourceUtil.isPartneredSourceWotc(src)) return true;

            const filePath = this.BREW_INDEX__SOURCE[src];
    if (!filePath) return;
    const filename = UrlUtil.getFilename(filePath);
    const meta = MiscUtil.get(this.BREW_INDEX__META, filename);
    return !!meta?.p;
}
}
class CompendiumCacheFlusher {
	static _COMPENDIUM_CONFIG_PREV_VALUES = {};

	static init () {
		UtilHooks.on(UtilHooks.HK_CONFIG_UPDATE, () => this._pHandleConfigUpdate());
		this._pHandleConfigUpdate({isInit: true}).then(null);

		Hooks.on("updateCompendium", (pack) => this._pHandleCompendiumUpdate({pack}));
	}

	static async _pHandleConfigUpdate ({isInit = false} = {}) {
		if (!isInit) await this._pFlushCompendiumCaches();
	}

	static async _pHandleCompendiumUpdate ({pack}) {
		await this._pFlushCompendiumCaches({pack});
	}

	
	static _pFlushCompendiumCaches ({pack} = {}) {
		if (pack) {
			Promise.all(this._CACHES.map(cache => cache.pFlush({collection: pack.collection})))
				.then(null);
			return;
		}

		ConfigConsts.getCompendiumPaths()
			.forEach(path => {
				const [group, key] = path;
				const pathKey = path.join("___");

				const storedValue = this._COMPENDIUM_CONFIG_PREV_VALUES[pathKey] || "";
				const currentValue = Config.get(group, key) || "";

				this._COMPENDIUM_CONFIG_PREV_VALUES[pathKey] = currentValue;

				if (CollectionUtil.setEq(new Set(currentValue), new Set(storedValue))) return;

				const toDumpCollections = [
					...CollectionUtil.setDiff(
						new Set(CompendiumCacheUtil.getCompendiumsFromConfigValue(storedValue).map(it => it.collection)),
						new Set(CompendiumCacheUtil.getCompendiumsFromConfigValue(currentValue).map(it => it.collection)),
					),
				];

				Promise.all(
					this._CACHES.map(cache => {
						return toDumpCollections
							.map(collection => cache.pFlush({collection}));
					}),
				)
					.then(null);
			});
	}

	
	static _CACHES = [];

	static register (cache) {
		this._CACHES.push(cache);
	}
}
class CompendiumCacheBackendBase {
	_name;
	_cache;
	_lock;
	_psCaching;

	constructor ({name}) {
		this._name = name;
		this._cache = {};
		this._lock = new VeLock({name});
		this._psCaching = {};

		CompendiumCacheFlusher.register(this);
	}

	
		async pCacheAndGet (
		{
			entity,
			compendiums,
			keyProvider = null,
			taskRunner = null,
		},
	) {
		if (!entity || !compendiums?.length) return null;

		keyProvider ||= new CompendiumCacheKeyProviderGeneric();

		const lookupMetas = keyProvider.getLookupMetas(entity);
		if (!lookupMetas?.length) return null;

		const namespace = keyProvider.getNamespace();

		try {
			await this._lock.pLock();
			return (await this._pCacheAndGet({
				compendiums,
				keyProvider,
				taskRunner,
				lookupMetas,
				namespace,
			}));
		} finally {
			this._lock.unlock();
		}
	}

		async _pCacheAndGet (
		{
			compendiums,
			keyProvider,
			taskRunner = null,
			lookupMetas,
			namespace,
		},
	) {
				for (const lookupMeta of lookupMetas) {
			for (const compendium of compendiums) {
				const psCachingPath = [compendium.collection, namespace];

				const pCache = MiscUtil.get(this._psCaching, ...psCachingPath)
					|| MiscUtil.set(
						this._psCaching,
						...psCachingPath,
						this._pCacheCompendium({
							namespace,
							compendium,
							keyProvider,
							taskRunner,
						}),
					);
				await pCache;

				const out = this._getFromCache({namespace, compendium, keyProvider, lookupMeta});
				if (out) return out;
			}
		}
	}

	
	async _pCacheCompendium ({namespace, compendium, keyProvider, taskRunner = null}) {
		console.log(...LGT, `Caching compendium "${compendium.collection}"...`);

		const cacheableDocs = await this._pGetCacheableDocs({compendium, taskRunner});
		if (!cacheableDocs?.length) return;

		const cacheBin = MiscUtil.getOrSet(this._cache, compendium.collection, namespace, {});

		cacheableDocs
			.forEach(doc => {
				const cacheId = keyProvider.getDocCacheId({doc});

																																								if (cacheBin[cacheId]) return;

				this._setCacheKey({cacheBin, cacheId, doc});
			});

		console.log(...LGT, `Cached compendium "${compendium.collection}".`);
	}

	async _pGetCacheableDocs ({compendium, taskRunner}) {
		const compendiumData = await CompendiumCacheUtil.pGetCompendiumData(compendium, {isContent: true, taskRunner});
		if (!compendiumData) return [];
		return [...compendiumData];
	}

		_setCacheKey ({cacheBin, cacheId, doc}) { throw new Error("Unimplemented!"); }

	
	_getFromCache (
		{
			namespace,
			compendium,
			keyProvider,
			lookupMeta,
		},
	) {
		const cacheBin = MiscUtil.get(this._cache, compendium.collection, namespace);
		if (!cacheBin) return null;
		const cacheId = keyProvider.getLookupMetaCacheId({lookupMeta});
		return cacheBin[cacheId];
	}

	
	async pFlush ({collection}) {
		try {
			await this._lock.pLock();
			await this._pFlush({collection});
		} finally {
			this._lock.unlock();
		}
	}

	async _pFlush ({collection}) {
		MiscUtil.delete(this._cache, collection);
		MiscUtil.delete(this._psCaching, collection);
	}
}
class CompendiumCacheBackendData extends CompendiumCacheBackendBase {
	_setCacheKey ({cacheBin, cacheId, doc}) {
		cacheBin[cacheId] = {
			docData: doc.toObject(),
			uuid: doc.uuid,
		};
	}
}
class CompendiumCache {
	static _CACHE_DATA = new CompendiumCacheBackendData({name: "data"});
	//static _CACHE_IMAGES = new CompendiumCacheBackendImage({name: "images"});
	//static _CACHE_ACTOR_ITEM_IMAGES = new CompendiumCacheBackendEmbeddedImage({name: "actorItemImages"});

	
		static async pGetAdditionalDataDoc (entityType, entity, {isSrdOnly = false, keyProvider, taskRunner} = {}) {
		if (!entity.srd && isSrdOnly) return null;

		const docMeta = await this._CACHE_DATA.pCacheAndGet({
			entity,
			compendiums: CompendiumCacheUtil.getAdditionalDataCompendiums({entityType}),
			keyProvider,
			taskRunner,
		});

		if (!docMeta) return null;
		return docMeta.docData;
	}

		static async gGetReplacementDataDocMeta (entityType, entity, {keyProvider, taskRunner} = {}) {
		const docMeta = await this._CACHE_DATA.pCacheAndGet({
			entity,
			compendiums: CompendiumCacheUtil.getReplacementDataCompendiums({entityType}),
			keyProvider,
			taskRunner,
		});
		if (!docMeta) return null;

				const out = {
			...docMeta,
			docData: {
				...docMeta.docData,
			},
		};
		delete docMeta.docData._id;

		return out;
	}

		static async pGetAdditionalDataImage (entityType, entity, {keyProvider, taskRunner} = {}) {
		return this._CACHE_IMAGES.pCacheAndGet({
			entity,
			compendiums: CompendiumCacheUtil.getAdditionalDataCompendiums({entityType}),
			keyProvider,
			taskRunner,
		});
	}

		static async pGetActorItemImage (entityType, entity, {keyProvider, taskRunner}) {
		return this._CACHE_ACTOR_ITEM_IMAGES.pCacheAndGet({
			entity,
			compendiums: CompendiumCacheUtil.getActorItemImageCompendiums({entityType}),
			keyProvider,
			taskRunner,
		});
	}
}
class UtilTaskRunnerStatus {
	static getEntityDisplayText ({ent, isPlainText = false} = {}) {
		const source = SourceUtil.getEntitySource(ent);

		if (isPlainText) return `${UtilEntityGeneric.getName(ent)} (${Parser.sourceJsonToAbv(source)})`;

		const sourceStyle = Parser.sourceJsonToStylePart(source);
		return `<i>${UtilEntityGeneric.getName(ent)} (<span class="${Parser.sourceJsonToSourceClassname(source)}" ${sourceStyle ? `style="${sourceStyle}"` : ""}>${Parser.sourceJsonToAbv(source)}</span>)</i>`;
	}

	static getMessageMeta (
		{
			ent,
			importSummary,
		},
	) {
		const taskRunnerName = this.getEntityDisplayText({ent});

		switch (importSummary.status || ConstsTaskRunner.TASK_EXIT_COMPLETE) {
			case ConstsTaskRunner.TASK_EXIT_CANCELLED: return {message: `Import of ${taskRunnerName} was cancelled.`};
			case ConstsTaskRunner.TASK_EXIT_SKIPPED_DUPLICATE: return {message: `Import of ${taskRunnerName} was skipped (duplicate found).`};
			case ConstsTaskRunner.TASK_EXIT_COMPLETE_UPDATE_OVERWRITE: return {message: `Imported ${taskRunnerName}, overwriting existing.`};
			case ConstsTaskRunner.TASK_EXIT_COMPLETE_UPDATE_OVERWRITE_DUPLICATE: return {message: `Imported ${taskRunnerName}, overwriting existing (duplicate found).`};
			case ConstsTaskRunner.TASK_EXIT_FAILED: return {message: `Failed to import ${taskRunnerName}! ${VeCt.STR_SEE_CONSOLE}`, isError: true};

			case ConstsTaskRunner.TASK_EXIT_COMPLETE:
			default: return {message: `Imported ${taskRunnerName}.`};
		}
	}
}
class UtilEntityItem extends UtilEntityBase {
	static getFauxGeneric (itm) {
		return {name: itm._variantName, source: itm.source};
	}

	
	static getCompendiumCacheKeyProvider ({isStrict = false} = {}) {
		return new CompendiumCacheKeyProviderItem({isStrict});
	}

	
	static _mutEntityAliases_generic_baseItem ({ent, isStrict, out}) {
		if (!isStrict && ent.baseItem) {
			const [name, source] = ent.baseItem.split("|");
			out.push({...ent, name: name});
			out.push(...this.getEntityAliases({name, source: source || Parser.SRC_DMG}));
		}

		if (!isStrict && ent._baseName) {
			out.push({...ent, name: ent._baseName});
			out.push(...this.getEntityAliases({name: ent._baseName, source: ent._baseSource || ent.source}));
		}
	}

	static _mutEntityAliases_generic_genericVariant ({ent, isStrict, out}) {
		if (!isStrict && ent.genericVariant) {
			out.push({...ent, name: ent.genericVariant.name});
			out.push(...this.getEntityAliases(ent.genericVariant));
		}
	}

	static _mutEntityAliases_weapon ({ent, isStrict, out}) {
				this._mutEntityAliases_generic_baseItem({ent, isStrict, out});
		this._mutEntityAliases_generic_genericVariant({ent, isStrict, out});
	}

	static _mutEntityAliases_other ({ent, isStrict, out}) {
				this._mutEntityAliases_generic_genericVariant({ent, isStrict, out});
		this._mutEntityAliases_generic_baseItem({ent, isStrict, out});
	}

		static getEntityAliases (ent, {isStrict = false} = {}) {
		if (!ent.name) return [];

		const out = [];

		out.push({...ent, name: `${ent.name}`.toPlural()});

		if (ent.name.toLowerCase().includes("feet")) out.push({...ent, name: ent.name.replace(/feet/g, "ft.")});

										if (ent.name.includes(", ")) out.push({...ent, name: ent.name.replace(/, /g, " ")});

				const mBrackets = /^([^(]+) \(([^)]+)\)$/.exec(ent.name.trim());
		if (mBrackets) out.push({...ent, name: `${mBrackets[2]} of ${mBrackets[1]}`});

				if (mBrackets) out.push({...ent, name: `${mBrackets[1]} ${mBrackets[2]}`});

				if (mBrackets) out.push({...ent, name: mBrackets[1]});

		if (ent.type && [Parser.ITM_TYP_ABV__MELEE_WEAPON, Parser.ITM_TYP_ABV__RANGED_WEAPON].includes(DataUtil.itemType.unpackUid(ent.type).abbreviation)) this._mutEntityAliases_weapon({ent, isStrict, out});
		else this._mutEntityAliases_other({ent, isStrict, out});

		return out;
	}

	
	static getAcInfo (item) {
		let acBonus = item.bonusAc ? Number(item.bonusAc) : 0;
		if (isNaN(acBonus)) acBonus = 0;

		const itemType = item.bardingType || item.type;
		const itemTypeAbv = itemType ? DataUtil.itemType.unpackUid(itemType).abbreviation : null;

		const isArmorOrShield = itemTypeAbv === Parser.ITM_TYP_ABV__HEAVY_ARMOR
			|| itemTypeAbv === Parser.ITM_TYP_ABV__MEDIUM_ARMOR
			|| itemTypeAbv === Parser.ITM_TYP_ABV__LIGHT_ARMOR
			|| itemTypeAbv === Parser.ITM_TYP_ABV__SHIELD;

		return {
			acValue: isArmorOrShield
				? (item.ac || 10) + acBonus
				: (acBonus || null), 			maxDexBonus: itemTypeAbv === Parser.ITM_TYP_ABV__MEDIUM_ARMOR
				? item.dexterityMax !== undefined ? item.dexterityMax : 2
				: itemTypeAbv === Parser.ITM_TYP_ABV__HEAVY_ARMOR
					? (item.dexterityMax ?? 0)
					: (item.dexterityMax ?? null),
			isTypeAutoCalculated: isArmorOrShield,
		};
	}

	
	static _TREASURE_TYPES = new Set([
		Parser.ITM_TYP_ABV__TREASURE,
		Parser.ITM_TYP_ABV__TREASURE_ART_OBJECT,
		Parser.ITM_TYP_ABV__TREASURE_COINAGE,
		Parser.ITM_TYP_ABV__TREASURE_GEMSTONE,
	]);

	static isTreasureItem (item) {
		if (!item?.type) return false;
		return this._TREASURE_TYPES.has(DataUtil.itemType.unpackUid(item.type).abbreviation);
	}
}
class CompendiumCacheKeyProviderBase {
    _deepKeys;

constructor ({isStrict = false} = {}) {
    this._isStrict = isStrict;
}


    getLookupMetas (ent) { throw new Error("Unimplemented!"); }

    getNamespace () { return this._deepKeys.join("__"); }


getDocCacheId ({doc}) {
    return this._deepKeys
        .map(path => {
            if (path === "name") return this.constructor._getCacheKeyPart(this.constructor._getCompendiumDocOriginalName(doc));

            return this.constructor._getCacheKeyPart(`${foundry.utils.getProperty(doc, path)}`);
        })
        .join("__");
}

getLookupMetaCacheId ({lookupMeta}) {
    return this._deepKeys
        .map(path => {
            const lookupVal = lookupMeta[path];

                            if (lookupVal === undefined) throw new Error(`Could not find lookup value for path "${path}" in lookup meta "${JSON.stringify(lookupMeta)}"`);

            return this.constructor._getCacheKeyPart(`${lookupVal}`);
        })
        .join("__");
}


static _getCacheKeyPart (str) {
    return CleanUtil.getCleanString(
        str
            .toLowerCase()
            .trim(),
    );
}

    static _getCompendiumDocOriginalName (doc) {
    return IntegrationBabele.getOriginalName(doc);
}
}

class CompendiumCacheKeyProviderGeneric extends CompendiumCacheKeyProviderBase {
_deepKeys = ["name"];

getLookupMetas (ent) {
    return [
        this._getLookupMeta_name({ent}),
        this._getLookupMeta_srdName({ent}),
        this._getLookupMeta_displayName({ent}),
    ]
        .filter(Boolean);
}

_getLookupMeta_name ({ent}) { return ent.name ? {name: this.constructor._getCacheKeyPart(ent.name)} : null; }
_getLookupMeta_srdName ({ent}) { return typeof ent.srd === "string" ? {name: this.constructor._getCacheKeyPart(ent.srd)} : null; }
_getLookupMeta_displayName ({ent}) { return ent._displayName ? {name: this.constructor._getCacheKeyPart(ent._displayName)} : null; }
}
class CompendiumCacheKeyProviderItem extends CompendiumCacheKeyProviderGeneric {
	getLookupMetas (ent) {
		return [
			...super.getLookupMetas(ent),
			...UtilEntityItem.getEntityAliases(ent, {isStrict: this._isStrict}).map(({name}) => ({name})),
		];
	}
}
class UtilsFoundryItem {
	static _TYPE_WEAPON = "weapon";
	static _TYPE_TOOL = "tool";
	static _TYPE_CONSUMABLE = "consumable";
	static _TYPE_EQUIPMENT = "equipment";
	static _TYPE_CONTAINER = "container";
	static _TYPE_LOOT = "loot";

	static _ITEM_EQUIPMENT_NAME_RES = [
		"amulet of",
		"badge of",
		"band of",
		"belt of",
		"boots of",
		"bracelet of",
		"bracer of",
		"bracers of",
		"brooch of",
		"cape of",
		"circlet of",
		"clothes of",
		"crown of",
		"eyes of",
		"gauntlets of",
		"gloves of",
		"goggles of",
		"hat of",
		"headband of",
		"helm of",
		"mantle of",
		"mask of",
		"necklace of",
		"periapt of",
		"ring of",
		"rings of",
		"robe of",
		"slippers of",
	].map(it => new RegExp(`(?:[ (]|^)${it}`, "i"));

	static getFoundryItemType (item) {
		const itemTypeAbv = item.type ? DataUtil.itemType.unpackUid(item.type).abbreviation : null;

		if (
			itemTypeAbv === Parser.ITM_TYP_ABV__MELEE_WEAPON
			|| itemTypeAbv === Parser.ITM_TYP_ABV__RANGED_WEAPON
						|| item.dmg1
		) return this._TYPE_WEAPON;

		if (
			itemTypeAbv === Parser.ITM_TYP_ABV__ARTISAN_TOOL
			|| itemTypeAbv === Parser.ITM_TYP_ABV__TOOL
			|| itemTypeAbv === Parser.ITM_TYP_ABV__INSTRUMENT
			|| itemTypeAbv === Parser.ITM_TYP_ABV__GAMING_SET
		) return this._TYPE_TOOL;

		if (
			itemTypeAbv === Parser.ITM_TYP_ABV__POTION
			|| itemTypeAbv === Parser.ITM_TYP_ABV__SCROLL
			|| (itemTypeAbv === Parser.ITM_TYP_ABV__WAND && item.charges)
			|| (itemTypeAbv === Parser.ITM_TYP_ABV__ROD && item.charges)
			|| (itemTypeAbv === Parser.ITM_TYP_ABV__ADVENTURING_GEAR && item.charges)
			|| item.poison
			|| itemTypeAbv === Parser.ITM_TYP_ABV__AMMUNITION
			|| itemTypeAbv === Parser.ITM_TYP_ABV__AMMUNITION_FUTURISTIC
			|| itemTypeAbv === Parser.ITM_TYP_ABV__EXPLOSIVE
			|| itemTypeAbv === Parser.ITM_TYP_ABV__ILLEGAL_DRUG
		) return this._TYPE_CONSUMABLE;

		if (
			itemTypeAbv === Parser.ITM_TYP_ABV__HEAVY_ARMOR
			|| itemTypeAbv === Parser.ITM_TYP_ABV__MEDIUM_ARMOR
			|| itemTypeAbv === Parser.ITM_TYP_ABV__LIGHT_ARMOR
			|| itemTypeAbv === Parser.ITM_TYP_ABV__SHIELD
			|| item.bardingType 			|| itemTypeAbv === Parser.ITM_TYP_ABV__SPELLCASTING_FOCUS
		) return this._TYPE_EQUIPMENT;

		if (item.containerCapacity) return this._TYPE_CONTAINER;

										if (
			item.bonusAc
			|| item.bonusSavingThrow
			|| item.bonusAbilityCheck
			|| item.bonusSpellAttack
			|| item.bonusSpellAttack
			|| item.bonusSpellSaveDc
			|| item.bonusProficiencyBonus
			|| item.bonusSavingThrowConcentration
			|| item.ability
			|| item.wondrous
		) return this._TYPE_EQUIPMENT;

				if (this._ITEM_EQUIPMENT_NAME_RES.some(it => it.test(item.name))) return this._TYPE_EQUIPMENT;

				return this._TYPE_LOOT;
	}
}
class UtilVersions {
	static getCoreVersion () {
		let [major, minor] = (game.version || "").split(".");
		major = Number(major);
		minor = Number(minor);
		if (isNaN(major) || isNaN(minor)) throw new Error(`Could not parse game version "${game.version}"!`);
		return {major, minor};
	}

	static getSystemVersion () {
        return "";
		const system = game.system?.id || "";
		const version = game.system?.version || "";

		try {
			const {major, minor, patch} = SharedUtilVersions.getVersionParts(version);
			return {major, minor, patch, system, version, isVersionThreeTwoPlus: major >= 3 && minor >= 2};
		} catch (e) {
			console.warn(...LGT, `Could not parse system version: "${version}"`);
			return {isUnknownVersion: true, system, version};
		}
	}

	
	static getVersionComparison ({min, max, version}) {
		const {major, minor, patch} = SharedUtilVersions.getVersionParts(version);

		const isBelowMin = min
			? major < min.major
			|| (major === min.major && minor < min.minor)
			|| (major === min.major && minor === min.minor && patch < min.patch)
			: false;
		const isAboveMax = max
			? major > max.major
			|| (major === max.major && minor > max.minor)
			|| (major === max.major && minor === max.minor && patch > max.patch)
			: false;

		return {isBelowMin, isAboveMax, isInRange: !isBelowMin && !isAboveMax};
	}
}
class ImportEntryManager {
	constructor ({instance, ent, importOpts, dataOpts}) {
		this._instance = instance;
		this._ent = ent;
		this._importOpts = importOpts;
		this._dataOpts = dataOpts;

		this._taskRunner = importOpts?.taskRunner;
	}

	async pImportEntry () {
		const taskRunnerLineMeta = this._pImportEntry_doUpdateTaskRunner_preImport();

		try {
			const importSummary = await this._pImportEntry_pDoImport();
			this._pImportEntry_doUpdateTaskRunner_postImport_success({importSummary, taskRunnerLineMeta});
			UtilHooks.callAll(UtilHooks.HK_IMPORT_COMPLETE, importSummary);
			return importSummary;
		} catch (e) {
			this._pImportEntry_doUpdateTaskRunner_postImport_failure({taskRunnerLineMeta, e});
			return ImportSummary.failed({entity: this._ent});
		}
	}

	async _pImportEntry_pDoImport () {
		return this._instance._pImportEntry(this._ent, this._importOpts, this._dataOpts);
	}

	_pImportEntry_getTaskRunnerEntityName ({isPlainText = false} = {}) {
		return UtilTaskRunnerStatus.getEntityDisplayText({ent: this._ent, isPlainText});
	}

	_pImportEntry_doUpdateTaskRunner_preImport () {
		if (!this._taskRunner) return null;

		const out = this._taskRunner.addLogLine(`Importing ${this._pImportEntry_getTaskRunnerEntityName()}...`);
		this._taskRunner.pushDepth();
		return out;
	}

	_pImportEntry_doUpdateTaskRunner_postImport_success ({importSummary, taskRunnerLineMeta}) {
		if (!this._taskRunner) return;

		this._taskRunner.popDepth();
		const {message, isError} = UtilTaskRunnerStatus.getMessageMeta({ent: this._ent, importSummary});
		this._taskRunner.addLogLine(message, {isError, linkedLogLineMeta: taskRunnerLineMeta});
	}

	_pImportEntry_doUpdateTaskRunner_postImport_failure ({taskRunnerLineMeta, e}) {
		console.error(...LGT, `Task "${this._pImportEntry_getTaskRunnerEntityName({isPlainText: true})}" failed!`, e);

		if (!this._taskRunner) return;

		this._taskRunner.popDepth();
		this._taskRunner.addLogLine(`Failed to import ${this._pImportEntry_getTaskRunnerEntityName()}! ${VeCt.STR_SEE_CONSOLE}`, {isError: true, linkedLogLineMeta: taskRunnerLineMeta});
	}
}
class DescriptionRendererMonkeyPatch {
    static withCustomDiceRenderingPatch (fn, fnRender) {
    const cached = Renderer.getRollableEntryDice;
    Renderer.getRollableEntryDice = fnRender;
    const out = fn();
    Renderer.getRollableEntryDice = cached;
    return out;
}
}

class DescriptionRenderer {
static _addPlugins ({actorId = null, tagHashItemIdMap = null, isTagHashItemIdMapSelf = false} = {}) {
    const configCache = DescriptionRendererHookBase.getConfigCache();

    const hkLinkAttributesHover = new DescriptionRendererHookLinkAttributesHover({configCache});
    const hkStrPreprocess = new DescriptionRendererHookStringPreprocess({configCache});
    const hkStringTag = new DescriptionRendererHookStringTag({configCache, actorId, tagHashItemIdMap, isTagHashItemIdMapSelf});
    const hkStrBasic = new DescriptionRendererHookStringBasic({configCache});
    const hkStrFont = new DescriptionRendererHookStringFont({configCache});
    const hkDice = new DescriptionRendererHookDice({configCache});
    const hkImgUrlPostProcess = new DescriptionRendererHookImgUrlPostProcess({configCache});

    Renderer.get().addPlugin("link_attributesHover", hkLinkAttributesHover.boundHook);
    Renderer.get().addPlugin("string_preprocess", hkStrPreprocess.boundHook);
    Renderer.get().addPlugin("string_@font", hkStrFont.boundHook);
            Renderer.get().addPlugin("string_tag", hkStringTag.boundHook);
    Renderer.get().addPlugin("dice", hkDice.boundHook);
    if (Config.get("import", "isSaveImagesToServer")) {
        Renderer.get().addPlugin("image_urlPostProcess", hkImgUrlPostProcess.boundHook);
        Renderer.get().addPlugin("image_urlThumbnailPostProcess", hkImgUrlPostProcess.boundHook);
    }

    return {
        hkLinkAttributesHover,
        hkStrPreprocess,
        hkStringTag,
        hkStrBasic,
        hkStrFont,
        hkDice,
        hkImgUrlPostProcess,
    };
}

static _removePlugins (hooks) {
    const {
        hkLinkAttributesHover,
        hkStrPreprocess,
        hkStringTag,
        hkStrBasic,
        hkStrFont,
        hkDice,
        hkImgUrlPostProcess,
    } = hooks;

    Renderer.get().removePlugin("link_attributesHover", hkLinkAttributesHover.boundHook);
    Renderer.get().removePlugin("string_preprocess", hkStrPreprocess.boundHook);
    Renderer.get().removePlugin("string_@font", hkStrFont.boundHook);
            Renderer.get().removePlugin("string_tag", hkStringTag.boundHook);
    Renderer.get().removePlugin("dice", hkDice.boundHook);
    Renderer.get().removePlugin("image_urlPostProcess", hkImgUrlPostProcess.boundHook);
    Renderer.get().removePlugin("image_urlThumbnailPostProcess", hkImgUrlPostProcess.boundHook);
}

static async pGetWithDescriptionPlugins (pFn, {actorId = null, tagHashItemIdMap = null, isTagHashItemIdMapSelf = false} = {}) {
    const hooks = this._addPlugins({actorId, tagHashItemIdMap, isTagHashItemIdMapSelf});

    let out;
    try {
        out = await pFn();
    } finally {
        this._removePlugins(hooks);
    }

    return out;
}

static getWithDescriptionPlugins (fn, {actorId = null, tagHashItemIdMap = null, isTagHashItemIdMapSelf = false} = {}) {
    const hooks = this._addPlugins({actorId, tagHashItemIdMap, isTagHashItemIdMapSelf});

    let out;
    try {
        out = fn();
    } finally {
        this._removePlugins(hooks);
    }

    return out;
}

static getConvertedTagLinkEntries (entries) {
    if (!entries) return entries;

    const configCache = DescriptionRendererHookBase.getConfigCache();
    const hkStringTag = new DescriptionRendererHookStringTag({configCache});

    return UtilDataConverter.WALKER_GENERIC.walk(
        MiscUtil.copyFast(entries),
        {
            string: str => {
                const textStack = [""];
                hkStringTag.renderStringRecursive(str, textStack);
                return textStack.join("");
            },
        },
    );
}
}
class DescriptionRendererHookBase {
    static getConfigCache () {
    const configCache = {};
    MiscUtil.set(configCache, "import", "enrichersAutoConvert", Config.get("import", "enrichersAutoConvert"));
    MiscUtil.set(configCache, "import", "isAutoAddAdditionalFonts", Config.get("import", "isAutoAddAdditionalFonts"));
    MiscUtil.set(configCache, "import", "isRenderLinksAsTags", Config.get("import", "isRenderLinksAsTags"));
    MiscUtil.set(configCache, "import", "isRendererDiceDisabled", Config.get("import", "isRendererDiceDisabled"));
    return configCache;
}


constructor ({configCache}) {
    this._configCache = configCache;
    this._boundHook = null;
}

    hook () { throw new Error("Unimplemented!"); }

get boundHook () {
    return (this._boundHook ||= this.hook.bind(this));
}
}

class ImportTester{

    async runTest(item){
       /*  this.handleReady().then(() => {
            console.log("Ready done!");
        }); */
        const flags = this.getFlags(item);
        let ent = await DataLoader.pCacheAndGet(flags.page, flags.source, flags.hash);

        const isUseImporter = true;
        const pFnImport = null;
        //const actor = item.parent;
        const actor = null;

        if (isUseImporter) {
            //const actorMultiImportHelper = new ActorMultiImportHelper({actor});
			//First, we have to create an ImportListItem, which sadly does contain some UI elements, but whatever
            const imp = new ImportListItem({actor}); //If actor exists, the item will be imported unto the actor. If none exists, it will go to a generic directory
            await imp.pInit(); //Initialize the importer

            if (pFnImport) await pFnImport({ent, imp, flags});
            else {
				//This is what we want. Tell the importlist to import ent (an obj in 5etools schema)
				const summary = await imp.pImportEntry(ent, {filterValues: flags.filterValues, isDataOnly:true});
				console.log("SUMMARY", summary);
				return summary._imported[0].document;
			}



            //await actorMultiImportHelper.pRepairMissingConsumes();

            //const msg = fnGetSuccessMessage ? fnGetSuccessMessage({ent, flags}) : `Imported "${ent.name}" via ${importerName} Importer`;
			console.log("IMPORTED", ent);
            //ui.notifications.info(msg);
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
class CompendiumCacheUtil {
	static getCompendiumsFromConfigValue (idArr) {
		if (!idArr?.length) return [];

		idArr = idArr
			.filter(Boolean)
			.map(it => it.trim().toLowerCase());

		return idArr
			.map(it => game.packs.find(x => x.collection.toLowerCase() === it))
			.filter(Boolean);
	}

	static getAdditionalDataCompendiums ({entityType}) {
		switch (entityType) {
			case "spell": return this.getCompendiumsFromConfigValue(Config.get("importSpell", "additionalDataCompendium"));
			case "monster": return this.getCompendiumsFromConfigValue(Config.get("importCreature", "additionalDataCompendium"));
			case "item": return this.getCompendiumsFromConfigValue(Config.get("importItem", "additionalDataCompendium"));
			case "class": return this.getCompendiumsFromConfigValue(Config.get("importClass", "additionalDataCompendiumClasses"));
			case "subclass": return this.getCompendiumsFromConfigValue(Config.get("importClass", "additionalDataCompendiumSubclasses"));
			case "classFeature": return this.getCompendiumsFromConfigValue(Config.get("importClass", "additionalDataCompendiumFeatures"));
			case "subclassFeature": return this.getCompendiumsFromConfigValue(Config.get("importClass", "additionalDataCompendiumFeatures"));
			case "optionalfeature": return this.getCompendiumsFromConfigValue(Config.get("importOptionalFeature", "additionalDataCompendium"));
			case "race": return this.getCompendiumsFromConfigValue(Config.get("importRace", "additionalDataCompendium"));
			case "raceFeature": return this.getCompendiumsFromConfigValue(Config.get("importRaceFeature", "additionalDataCompendiumFeatures"));
			case "monsterFeature": return this.getCompendiumsFromConfigValue(Config.get("importCreature", "additionalDataCompendiumFeatures"));
			case "background": return this.getCompendiumsFromConfigValue(Config.get("importBackground", "additionalDataCompendium"));
			case "backgroundFeature": return this.getCompendiumsFromConfigValue(Config.get("importBackground", "additionalDataCompendiumFeatures"));
			case "table": return this.getCompendiumsFromConfigValue(Config.get("importTable", "additionalDataCompendium"));
			case "feat": return this.getCompendiumsFromConfigValue(Config.get("importFeat", "additionalDataCompendium"));
			default: return null;
		}
	}

	static getReplacementDataCompendiums ({entityType}) {
		switch (entityType) {
			case "spell": return this.getCompendiumsFromConfigValue(Config.get("importSpell", "replacementDataCompendium"));
			case "item": return this.getCompendiumsFromConfigValue(Config.get("importItem", "replacementDataCompendium"));
			default: return null;
		}
	}

	static getActorItemImageCompendiums ({entityType}) {
		switch (entityType) {
			case "monsterFeature": return this.getCompendiumsFromConfigValue(Config.get("importCreature", "additionalDataCompendium"));
			default: return null;
		}
	}

	
		static async pGetCompendiumData (compendium, {isContent = false, taskRunner = null} = {}) {
				isContent = isContent || UtilCompat.isBabeleActive();

						const maxTimeSecs = 10;
		const taskRunnerLineMeta = taskRunner ? taskRunner.addLogLine(`Caching compendium &quot;<i>${compendium.metadata.label.qq()}</i>&quot;...`) : null;
		const compendiumData = await Promise.race([
			isContent ? compendium.getDocuments() : compendium.getIndex(),
			MiscUtil.pDelay(maxTimeSecs * 1000, null),
		]);
		if (taskRunner) taskRunner.addLogLine(`Cached compendium &quot;<i>${compendium.metadata.label.qq()}</i>&quot;.`, {linkedLogLineMeta: taskRunnerLineMeta});
		if (!compendiumData) {
			console.warn(...LGT, `Loading of ${compendium?.metadata?.system}.${compendium?.metadata?.name} took more than ${maxTimeSecs} seconds! This usually means the compendium is inaccessible. Cancelling compendium load.`);
			return [];
		}
		return compendiumData;
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

 /**
  * @returns {Promise<ImportSummary>}
  */
	async pImportEntry () {
		//Print a log line saying we are starting the import
		const taskRunnerLineMeta = this._pImportEntry_doUpdateTaskRunner_preImport();

		try {
			const importSummary = await this._pImportEntry_pDoImport();
			this._pImportEntry_doUpdateTaskRunner_postImport_success({importSummary, taskRunnerLineMeta});
			//UtilHooks.callAll(UtilHooks.HK_IMPORT_COMPLETE, importSummary);
			return importSummary;
		} catch (e) {
			this._pImportEntry_doUpdateTaskRunner_postImport_failure({taskRunnerLineMeta, e});
			return ImportSummary.failed({entity: this._ent});
		}
	}

	async _pImportEntry_pDoImport () {
		//Tell instance (an ImportList of some kind) to do the importing
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
    //const hkImgUrlPostProcess = new DescriptionRendererHookImgUrlPostProcess({configCache});

    Renderer.get().addPlugin("link_attributesHover", hkLinkAttributesHover.boundHook);
    Renderer.get().addPlugin("string_preprocess", hkStrPreprocess.boundHook);
    Renderer.get().addPlugin("string_@font", hkStrFont.boundHook);
            Renderer.get().addPlugin("string_tag", hkStringTag.boundHook);
    Renderer.get().addPlugin("dice", hkDice.boundHook);
    if (Config.get("import", "isSaveImagesToServer")) {
        //Renderer.get().addPlugin("image_urlPostProcess", hkImgUrlPostProcess.boundHook);
        //Renderer.get().addPlugin("image_urlThumbnailPostProcess", hkImgUrlPostProcess.boundHook);
    }

    return {
        hkLinkAttributesHover,
        hkStrPreprocess,
        hkStringTag,
        hkStrBasic,
        hkStrFont,
        hkDice,
        //hkImgUrlPostProcess,
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
    //Renderer.get().removePlugin("image_urlPostProcess", hkImgUrlPostProcess.boundHook);
    //Renderer.get().removePlugin("image_urlThumbnailPostProcess", hkImgUrlPostProcess.boundHook);
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
class DescriptionRendererHookLinkAttributesHover extends DescriptionRendererHookBase {
	hook (commonArgs, {input: {entry, procHash}}) {
		const page = entry.href.hover.page;
		const source = entry.href.hover.source;
		const hash = procHash;
		const preloadId = entry.href.hover.preloadId;
		return {
			attributesHoverReplace: [
				`data-plut-hover="${true}" data-plut-hover-page="${page.qq()}" data-plut-hover-source="${source.qq()}" data-plut-hover-hash="${hash.qq()}" ${preloadId ? `data-plut-hover-preload-id="${preloadId.qq()}"` : ""}`,
			],
		};
	}
}

class DescriptionRendererHookStringPreprocess extends DescriptionRendererHookBase {
	hook (commonArgs, {input: str}) {
		str = this._hook_dc({str: str}) ?? str;
		str = this._hook_damage({str: str}) ?? str;
		return str;
	}

	
		static _RE_DC = new RegExp(`{@dc (?<dc>\\d+)} (?<abil>${Object.values(Parser.ATB_ABV_TO_FULL).join("|")})\\b`, "g");

	_hook_dc ({str}) {
		if (!this._configCache.import.enrichersAutoConvert[ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__DC]) return null;

		return str
			.replace(this.constructor._RE_DC, (...m) => {
				return `[[/save ability=${m.last().abil.toLowerCase()} dc=${m.last().dc}]]`;
			})
		;
	}

	
					static _RE_DAMAGE = new RegExp(`(?<tagOpen>\\(?{@damage [^}|]+)(?<tagClose>}\\)?) (?<dmgType>${Parser.DMG_TYPES.join("|")})(?<suffix> damage)\\b`, "gi");

	_hook_damage ({str}) {
		if (!this._configCache.import.enrichersAutoConvert[ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__DICE]) return null;

		return str
			.replace(this.constructor._RE_DAMAGE, (...m) => {
				const {tagOpen, tagClose, dmgType, suffix} = m.last();
				return `${tagOpen}|||${dmgType}${tagClose}${suffix}`;
			})
		;
	}
}

class DescriptionRendererHookStringTag extends DescriptionRendererHookBase {
	constructor ({actorId = null, tagHashItemIdMap = null, isTagHashItemIdMapSelf = false, ...rest}) {
		super({...rest});
		this._actorId = actorId;
		this._tagHashItemIdMap = tagHashItemIdMap;
		this._isTagHashItemIdMapSelf = isTagHashItemIdMapSelf;
	}

	hook (commonArgs, {input: {tag, text}}) {
		const inn = `{${tag} ${text}}`;
		const itemId = this._pGetWithDescriptionPlugins_getTagItemId({tag, text});
		const out = this._getConvertedTagLinkString(inn, {itemId});
		if (inn === out) return null; 		return out;
	}

		_pGetWithDescriptionPlugins_getTagItemId ({tag, text}) {
		const tagName = tag.slice(1); 		if (!this._tagHashItemIdMap?.[tagName]) return null;
		const defaultSource = Renderer.tag.TAG_LOOKUP[tagName]?.defaultSource;
		if (!defaultSource) return null;
		const page = Renderer.tag.getPage(tagName);
		if (!page) return null;
		const hashBuilder = UrlUtil.URL_TO_HASH_BUILDER[page];
		if (!hashBuilder) return null;
		let [name, source] = text.split("|");
		source = source || defaultSource;
		const hash = hashBuilder({name, source});
		return this._tagHashItemIdMap?.[tagName]?.[hash];
	}

	_getConvertedTagLinkString (str, {itemId} = {}) {
		this.constructor._initLinkTagMetas();

		for (const {tag, re} of this.constructor._LINK_TAG_METAS_REPLACE) str = str.replace(re, (...m) => this._replaceEntityLinks_getReplacement({tag, text: m.last().text, itemId}));

				if (this._configCache.import.isRenderLinksAsTags) {
			for (const {tag, re} of this.constructor._LINK_TAG_METAS_REMOVE) str = str.replace(re, (...m) => this._replaceEntityLinks_getRemoved({tag, text: m.last().text}));
		}

		return str;
	}

	static _LINK_TAGS_TO_REMOVE = new Set([
		"quickref", 	]);
	static _LINK_TAG_METAS_REPLACE = null;
	static _LINK_TAG_METAS_REMOVE = null;

	static _initLinkTagMetas () {
		this._LINK_TAG_METAS_REPLACE ||= this._LINK_TAG_METAS_REPLACE = Renderer.tag.TAGS.filter(it => it.defaultSource)
			.map(it => it.tagName)
			.map(tag => ({tag, re: this._getConvertedTagLinkString_getRegex({tag})}));

		this._LINK_TAG_METAS_REMOVE ||= Renderer.tag.TAGS.filter(it => it.defaultSource)
			.map(it => it.tagName)
			.filter(tag => this._LINK_TAGS_TO_REMOVE.has(tag))
			.map(tag => ({tag, re: this._getConvertedTagLinkString_getRegex({tag})}));
	}

	static _getConvertedTagLinkString_getRegex ({tag}) {
		return RegExp(`^{@${tag} (?<text>[^}]+)}$`, "g");
	}

	_replaceEntityLinks_getReplacement ({tag, text, itemId}) {
		if (this._actorId && itemId) {
			const [, , displayText] = text.split("|");

																		if (this._isTagHashItemIdMapSelf) {
				return `@UUID[.${itemId}]${displayText ? `{${displayText}}` : ""}`;
			}

			return `@UUID[Actor.${this._actorId}.Item.${itemId}]${displayText ? `{${displayText}}` : ""}`;
		}

		const asEnricher = this._replaceEntityLinks_getReplacement_enricher({tag, text});
		if (asEnricher) return asEnricher;

		if (
						this.constructor._LINK_TAGS_TO_REMOVE.has(tag)
						|| !this._configCache.import.isRenderLinksAsTags
		) return `{@${tag} ${text}}`;

		return `@${tag}[${text}]`;
	}

	_replaceEntityLinks_getReplacement_enricher ({tag, text}) {
		if (!this._configCache.import.enrichersAutoConvert) return null;

		switch (tag) {
			case "condition": {
				if (!this._configCache.import.enrichersAutoConvert[ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__CONDITION]) return null;

				const {name, source, displayText} = DataUtil.generic.unpackUid(text, "condition");

				if (source.toLowerCase() !== Parser.SRC_PHB.toLowerCase() || !CONFIG.DND5E.conditionTypes[name.toLowerCase()]) return null;

				return `&Reference[condition=${name}]${displayText && displayText.toLowerCase() !== name.toLowerCase() ? `{${displayText}}` : ""}`;
			}

			case "sense": {
				if (!this._configCache.import.enrichersAutoConvert[ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__SENSE]) return null;

				const {name, source, displayText} = DataUtil.generic.unpackUid(text, "sense");

				if (source.toLowerCase() !== Parser.SRC_PHB.toLowerCase() || !CONFIG.DND5E.rules[name.toLowerCase()]) return null;

				return `&Reference[rule=${name}]${displayText && displayText.toLowerCase() !== name.toLowerCase() ? `{${displayText}}` : ""}`;
			}

			case "skill": {
				if (!this._configCache.import.enrichersAutoConvert[ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__SKILL]) return null;

				const {name, source, displayText} = DataUtil.generic.unpackUid(text, "skill");

				const nameKey = name.replace(/ /g, "");
				if (source.toLowerCase() !== Parser.SRC_PHB.toLowerCase() || !CONFIG.DND5E.enrichmentLookup.skills[nameKey.toLowerCase()]) return null;

				const ptDisplay = (displayText && displayText.toLowerCase() !== name.toLowerCase())
					? `{${displayText}}`
					: nameKey.toLowerCase() !== name.toLowerCase()
						? `{${name}}`
						: "";

				return `&Reference[skill=${nameKey}]${ptDisplay}`;
			}

			case "quickref": {
				if (!this._configCache.import.enrichersAutoConvert[ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__RULE]) return null;

				const {name, displayText} = DataUtil.quickreference.unpackUid(text);

								const nameKeys = [
					displayText,
					name,
				]
					.filter(Boolean)
					.map(it => it.replace(/ /g, ""));

				const displayTextKey = displayText?.replace(/ /g, "");

				for (const nameKey of nameKeys) {
					if (!CONFIG.DND5E.rules[nameKey.toLowerCase()]) continue;

					const ptDisplay = (displayTextKey && nameKey === displayTextKey)
						? displayTextKey === displayText ? "" : `{${displayText}}`
						: (displayTextKey && displayTextKey.toLowerCase() !== nameKey.toLowerCase())
							? `{${displayText}}`
							: nameKey.toLowerCase() !== name.toLowerCase()
								? `{${name}}`
								: "";

					return `&Reference[rule=${nameKey}]${ptDisplay}`;
				}

				return null;
			}
		}

		return null;
	}

	_replaceEntityLinks_getRemoved ({tag, text}) {
		return Renderer.stripTags(`{@${tag} ${text}}`);
	}

		async _pReplaceEntityLinks_pReplace ({str, re, tag}) {
		let m;
		while ((m = re.exec(str))) {
			const prefix = str.slice(0, m.index);
			const suffix = str.slice(re.lastIndex);
			const replacement = this._replaceEntityLinks_getReplacement({tag, m});
			str = `${prefix}${replacement}${suffix}`;
			re.lastIndex = prefix.length + replacement.length;
		}
		return str;
	}

	
		renderStringRecursive (str, textStack) {
		const tagSplit = Renderer.splitByTags(str);
		const len = tagSplit.length;
		for (let i = 0; i < len; ++i) {
			const s = tagSplit[i];
			if (!s) continue;

						if (s.startsWith("{@")) {
				const converted = this._getConvertedTagLinkString(s);

				if (converted !== s) {
					textStack[0] += (converted);
					continue;
				}

				textStack[0] += s.slice(0, 1);
				this.renderStringRecursive(s.slice(1, -1), textStack);
				textStack[0] += s.slice(-1);

				continue;
			}

			textStack[0] += s;
		}
	}
}
class DescriptionRendererHookStringBasic extends DescriptionRendererHookBase {
	hook (commonArgs, {input: str}) {
		str = this._hook_ability({str}) || str;
		return str;
	}

	static _RE_ABILITY = new RegExp(`\\b(?<abil>${Object.values(Parser.ATB_ABV_TO_FULL).join("|")})\\b`, "g");

	_hook_ability ({str}) {
		if (!this._configCache.import.enrichersAutoConvert[ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__ABILITY]) return null;

		return str
			.replace(this.constructor._RE_ABILITY, (...m) => {
				return `&Reference[ability=${m.last().abil}]`;
			})
		;
	}
}
class DescriptionRendererHookStringFont extends DescriptionRendererHookBase {
	static _INTERNAL_FONTS = {
		"HPPHumblescratch": `${SharedConsts.MODULE_LOCATION}/fonts/hpphumblescratch-webfont.woff2`,
	};

	hook (commonArgs, {input: {tag, text}}) {
		if (!game.user.isGM) return;

		const [, fontFamily] = Renderer.splitTagByPipe(text);

		if (this.constructor._DESCRIPTION_FONTS_TRACKED[fontFamily]) return;
		this.constructor._DESCRIPTION_FONTS_TRACKED[fontFamily] = true;

		if (FontConfig.getAvailableFontChoices()[fontFamily]) return;

		if (!this._configCache.import.isAutoAddAdditionalFonts) {
			ui.notifications.warn(`The "${fontFamily}" font, used by recently-rendered content, is not available in your game. You may need to manually add it via the "Additional Fonts" setting, or text using the "${fontFamily}" font may not display correctly.`);
		}

		const url = this.constructor._INTERNAL_FONTS[fontFamily]
			|| PrereleaseUtil.getMetaLookup("fonts")?.[fontFamily]
			|| BrewUtil2.getMetaLookup("fonts")?.[fontFamily];

		if (!url) return void ui.notifications.warn(`Failed to load font "${fontFamily}". You may need to manually add it via the "Additional Fonts" setting, or text using the "${fontFamily}" font may not display correctly.`);

		this.constructor._pDoLoadAdditionalFont(fontFamily, url).then(null);
	}

	static _DESCRIPTION_FONTS_TRACKED = {};
	static _HAS_NOTIFIED_FONTS_RELOAD = false;

	static async _pDoLoadAdditionalFont (family, url) {
		const hasNotified = this._HAS_NOTIFIED_FONTS_RELOAD;
		this._HAS_NOTIFIED_FONTS_RELOAD = true;

				const definitions = game.settings.get("core", FontConfig.SETTING);
		definitions[family] ??= {editor: true, fonts: []};
		const definition = definitions[family];
		definition.fonts.push({urls: [url], weight: 400, style: "normal"});
		await game.settings.set("core", FontConfig.SETTING, definitions);
		await FontConfig.loadFont(family, definition);
		
		if (hasNotified) return;

		ChatNotificationHandlers.getHandler("ReloadFonts").pDoPostChatMessage();
	}
}
class DescriptionRendererHookDice extends DescriptionRendererHookBase {
	hook (commonArgs, {input: entry}) {
		const cpy = MiscUtil.copyFast(entry);
		const toDisplay = Renderer.getEntryDiceDisplayText(entry);

		if (typeof cpy.toRoll !== "string") {
						cpy.toRoll = Renderer.legacyDiceToString(cpy.toRoll);
		}

						if (cpy.prompt) {
			const minAdditionalDiceLevel = Math.min(...Object.keys(cpy.prompt.options)
				.map(it => Number(it))
				.filter(it => cpy.prompt.options[it]));
			cpy.toRoll = cpy.prompt.options[minAdditionalDiceLevel];
		}

		const toRollClean = UtilDataConverter.getCleanDiceString(cpy.toRoll);

		if (this._configCache.import.isRendererDiceDisabled) {
			return {
				rendered: toDisplay || toRollClean,
			};
		}

		const ptDisplay = toRollClean.toLowerCase().trim() !== toDisplay.toLowerCase().trim() ? `{${toDisplay}}` : "";

		if (cpy.autoRoll) {
			return {
				rendered: `[[${toRollClean}]]${ptDisplay}`,
			};
		}

		if (this._configCache.import.enrichersAutoConvert[ConfigConsts.C_IMPORT_ENRICHERS_AUTO_CONVERT__DICE] && entry.subType === "damage") {
						return {
				rendered: `[[/damage ${toRollClean}${cpy.damageType ? ` type=${cpy.damageType}` : ""}]]${ptDisplay}`,
			};
		}

		return {
			rendered: `[[/r ${toRollClean}]]${ptDisplay}`,
		};
	}
}
class UtilFoundryId {
	static getIdObj ({id = null} = {}) {
		if (id == null) id = Math.random().toString(16).slice(2); //foundry.utils.randomID();
		return {
			_id: id, 			id, 		};
	}

	
	static mutCopyDocId (docSource, docTarget) {
		docTarget.id = docSource.id;
		docTarget._id = docSource._id;
	}
}
class UtilApplications {
	static async $pGetAddAppLoadingOverlay ($appHtml) {
		if (!$appHtml) return null;
		$appHtml.css("position", "relative");
		const $out = $(`<div class="veapp-loading__wrp-outer"><i>Loading...</i></div>`).focus().appendTo($appHtml);
				await MiscUtil.pDelay(5);
		return $out;
	}

		static pGetConfirmation (opts) {
		opts = opts || {};

		return new Promise(resolve => {
			new Dialog({
				title: opts.title,
				content: opts.content,
				buttons: {
					yes: {
						icon: `<i class="fas fa-fw ${opts.faIcon}"></i>`,
						label: opts.confirmText,
						callback: () => resolve(true),
					},
					no: {
						icon: `<i class="fas fa-fw fa-times"></i>`,
						label: opts.dismissText || "Cancel",
						callback: () => resolve(false),
					},
				},
				default: "yes",
			}).render(true);
		});
	}

	static getCleanEntityName (name) {
				return name || " ";
	}

	static getFolderList (folderType) {
		const sortFolders = (a, b) => SortUtil.ascSort(a.sort, b.sort);

		const raw = CONFIG.Folder.collection.instance.contents
			.filter(it => it.type === folderType)
			.sort(sortFolders);
		if (!raw.length) return raw;

		const maxDepth = Math.max(...raw.map(it => it.depth));

		const out = raw.filter(it => it.depth === 1);
		if (out.length === raw.length) return out;

		for (let i = 2; i < maxDepth + 1; ++i) {
			const atDepth = raw.filter(it => it.depth === i).sort(sortFolders).reverse();
			atDepth.forEach(it => {
				const ixParent = out.findIndex(parent => parent.id === it.folder?.id);
				if (~ixParent) out.splice(ixParent + 1, 0, it);
			});
		}

		return out;
	}

	static bringToFront (app) {
				if (!app._element) return;

				if (typeof _maxZ === "undefined") window._maxZ = 100;

				if (Object.keys(ui.windows).length === 0) _maxZ = 100;
		app._element.css({zIndex: Math.min(++_maxZ, Consts.Z_INDEX_MAX_FOUNDRY)});
	}

	
	static setApplicationTitle (app, title) {
		app.options.title = title;
		UtilApplications.$getAppElement(app).find(`.window-title`).text(app.title);
	}

	static getDataName (data) {
		return data?.actor?.name || data?.document?.name;
	}

	static getAppName (app) {
		return app.actor?.name || app.document?.name;
	}

			static async pGetImportCompApplicationFormData (opts) {
		let resolve, reject;
		const promise = new Promise((resolve_, reject_) => {
			resolve = resolve_; reject = reject_;
		});

		const ptrPRender = {_: null};

		const app = new class TempApplication extends Application {
			constructor () {
				super({
					title: opts.comp.modalTitle,
					template: `${SharedConsts.MODULE_LOCATION}/template/_Generic.hbs`,
					width: opts.width != null ? opts.width : 480,
					height: opts.height != null ? opts.height : 640,
					resizable: true,
				});
			}

			async close (...args) {
				await super.close(...args);
				resolve(null);
			}

			activateListeners (html) {
				const $btnOk = $(`<button class="ve-btn ve-btn-primary mr-2">OK</button>`)
					.click(async () => {
						const formData = await opts.comp.pGetFormData();

						if (opts.fnGetInvalidMeta) {
							const invalidMeta = opts.fnGetInvalidMeta(formData);
							if (invalidMeta) return ui.notifications[invalidMeta.type](invalidMeta.message);
						}

						resolve(formData);
						return this.close();
					});
				const $btnCancel = $(`<button class="ve-btn ve-btn-default">Cancel</button>`)
					.click(() => {
						resolve(null); return this.close();
					});
				const $btnSkip = opts.isUnskippable ? null : $(`<button class="ve-btn ve-btn-default ml-3">Skip</button>`)
					.click(() => {
						resolve(VeCt.SYM_UI_SKIP); return this.close();
					});

				if (opts.comp.pRender) ptrPRender._ = opts.comp.pRender(html);
				else opts.comp.render(html);
				$$`<div class="ve-flex-v-center ve-flex-h-right no-shrink pb-1 pt-1 px-1 mt-auto mr-3">${$btnOk}${$btnCancel}${$btnSkip}</div>`.appendTo(html);
			}
		}();

		opts.comp.app = app;
		await app.render(true);

		if (opts.isAutoResize) this.autoResizeApplication(app, {ptrPRender});

		return promise;
	}
	
			static async pGetShowApplicationModal (
		{
			title,
			cbClose,

			isWidth100,
			isHeight100,

			isMaxWidth640p,
			isMinHeight0,

			isIndestructible,
			isClosed,
		},
	) {
		let hasClosed = false;

		let resolveModal;
		const pResolveModal = new Promise(resolve => { resolveModal = resolve; });

		const app = new class TempApplication extends MixinHidableApplication(Application) {
			constructor () {
				super({
					title: title || " ",
					template: `${SharedConsts.MODULE_LOCATION}/template/_Generic.hbs`,
					width: isWidth100
						? Util.getMaxWindowWidth(1170)
						: isMaxWidth640p
							? 640
							: 480,
					height: isHeight100
						? Util.getMaxWindowHeight()
						: isMinHeight0
							? 100
							: 640,
					resizable: true,
				});
			}

			async _closeNoSubmit () {
				return super.close();
			}

			async close (...args) {
				await pHandleCloseClick(false);
				return super.close(...args);
			}

			async activateListeners (...args) {
				super.activateListeners(...args);
				out.$modal = out.$modalInner = this.element.find(`.ve-window`);
				hasClosed = false;
			}
		}();

		if (isIndestructible) app.isClosable = false;

		const pHandleCloseClick = async (isDataEntered, ...args) => {
						if (!isIndestructible && hasClosed) return;

			hasClosed = true;

			if (cbClose) await cbClose(isDataEntered, ...args);
			if (!isIndestructible) resolveModal([isDataEntered, ...args]);

			await app._closeNoSubmit();
		};

		const out = {
			$modal: null,
			$modalInner: null,
			doClose: pHandleCloseClick,
			doAutoResize: () => this.autoResizeApplicationExisting(app),
			pGetResolved: () => pResolveModal,
			doOpen: () => app._render(true),
			doTeardown: () => app._pDoHardClose(),
		};

		await app._render(true);
		if (isClosed) app._doSoftClose();

		return out;
	}

	/**
	 * 
	 * Resize an app based on the content that is currently visible inside it.
	 * @param app The app to resize.
	 * @param ptrPRender Pointer to a promise which will resolve when the app is rendered.
	 */
	static autoResizeApplication (app, {ptrPRender} = {}) {
		Hooks.once("renderApplication", async _app => {
			if (_app !== app) return;
			if (ptrPRender?._) await ptrPRender._;

			this.autoResizeApplicationExisting(app);
		});
	}

	static autoResizeApplicationExisting (app) {
				const centerPrev = app.position.top + app.position.height / 2;

				const pos = app.setPosition({
			width: app.position.width, 			height: "auto",
		});

				const center = pos.top + pos.height / 2;
		app.setPosition({
			width: app.position.width,
			height: app.position.height,
			top: app.position.top + (centerPrev - center),
		});
	}

		static _FORCE_RENDER_APP_TIME_LIMIT_MS = 7_500;

		static async pForceRenderApp (app, renderForce = true, renderOpts) {
		let resolve;
		let isResolved = false;
		const p = new Promise((resolve_) => { resolve = resolve_; });

		Hooks.once(`render${app.constructor.name}`, async (_app, $html, data) => {
			if (_app !== app) return;
			resolve({app, $html, data});
			isResolved = true;
		});

		app.render(renderForce, renderOpts);

		return Promise.race([
			p,
			MiscUtil.pDelay(this._FORCE_RENDER_APP_TIME_LIMIT_MS)
				.then(() => {
					if (!isResolved) console.warn(...LGT, `Failed to render "${app?.constructor?.name}" app in ${this._FORCE_RENDER_APP_TIME_LIMIT_MS}ms!`);
				}),
		]);
	}

	static isClosed (app) { return app._state < Application.RENDER_STATES.NONE; }

	/**
	 * 
	 * Auto-convert non-jQuery app elements, as some modules use bare DOM elements.
	 * @param app
	 */
	static $getAppElement (app) {
		if (!app?.element) return null;
		if (app.element instanceof jQuery) return app.element;
		return $(app.element);
	}

	static pAwaitAppClose (app) {
		return new Promise(resolve => {
			const fnOnClose = (closedApp) => {
				if (app.appId !== closedApp.appId) return;
				Hooks.off("closeApplication", fnOnClose);
				resolve(closedApp);
			};
			Hooks.on("closeApplication", fnOnClose);
		});
	}

	static getOpenAppsSortedByZindex ({isFilterInvalid = false} = {}) {
		return Object.entries(ui.windows)
			.map(([appId, app]) => {
				const zIndex = Number((((UtilApplications.$getAppElement(app)[0] || {}).style || {})["z-index"] || -1));

				if (isNaN(zIndex) || !~zIndex) {
					if (Util.isDebug()) console.warn(`Could not determine z-index for app ${appId}`);
					if (isFilterInvalid) return null;
				}

				return {
					appId,
					app,
					zIndex: isNaN(zIndex) ? -1 : zIndex,
				};
			})
			.filter(Boolean)
			.sort((a, b) => SortUtil.ascSort(a.zIndex, b.zIndex))
			.map(({app}) => app);
	}
}
class DuplicateMeta {
	constructor ({mode, existing}) {
		this.mode = mode;
		this.existing = existing;

				this.isSkip = mode === ConfigConsts.C_IMPORT_DEDUPE_MODE_SKIP && existing != null;
		this.isOverwrite = mode === ConfigConsts.C_IMPORT_DEDUPE_MODE_OVERWRITE && existing != null;
			}
}

class ImportSummary {
		constructor (
		{
			imported,
			status,
			entity = null,
		},
	) {
		if (!status) throw new Error(`No "status" provided!`);

		this._imported = imported;
		this._status = status;
		this._entity = entity;
	}

	get imported () { return this._imported; }
	get status () { return this._status; }
	get entity () { return this._entity; }

	static cancelled ({entity = null} = {}) { return new this({status: ConstsTaskRunner.TASK_EXIT_CANCELLED, entity}); }
	static failed ({entity = null} = {}) { return new this({status: ConstsTaskRunner.TASK_EXIT_FAILED, entity}); }
	static completedStub ({entity = null} = {}) { return new this({imported: [], status: ConstsTaskRunner.TASK_EXIT_COMPLETE, entity}); }

	getPrimaryDocument () {
		const primaryImportedDocument = this.getPrimaryImportedDocument();
		if (!primaryImportedDocument) return null;
		return primaryImportedDocument.getPrimaryDocument();
	}

	getPrimaryImportedDocument () {
		return this.imported?.[0] || null;
	}

	
		static NOTIFICATION_LEVEL_INFO = "info";
	static NOTIFICATION_LEVEL_WARNING = "warn";
	static NOTIFICATION_LEVEL_ERROR = "error";

		getNotificationMeta () {
		const firstDoc = this.getPrimaryDocument();

		const name = this.imported?.[0]?.name
			|| firstDoc?.name
			|| this._entity?.name
			|| "(Unnamed Entity)";

		if (this.status === ConstsTaskRunner.TASK_EXIT_CANCELLED) return {message: `Import of "${name}" cancelled.`, level: this.constructor.NOTIFICATION_LEVEL_WARNING};
		if (this.status === ConstsTaskRunner.TASK_EXIT_SKIPPED_DUPLICATE) return {message: `Import of "${name}" was skipped (duplicate found).`, level: this.constructor.NOTIFICATION_LEVEL_WARNING};
		if (this.status === ConstsTaskRunner.TASK_EXIT_SKIPPED_OTHER) return {message: `Import of "${name}" was skipped.`, level: this.constructor.NOTIFICATION_LEVEL_WARNING};
		if (this.status === ConstsTaskRunner.TASK_EXIT_FAILED) return {message: `Failed to import "${name}"! ${VeCt.STR_SEE_CONSOLE}`, level: this.constructor.NOTIFICATION_LEVEL_ERROR};

		if (this.imported?.[0]?.actor) {
			return {message: `Imported "${name}" to actor "${this.imported?.[0]?.actor.name}".`, level: this.constructor.NOTIFICATION_LEVEL_INFO};
		}

		const folderPath = HelpersFolderPath.getFolderPath(firstDoc);
		if (folderPath) {
			const folderType = firstDoc?.folder?.type;
			return {message: `Imported "${name}" to ${folderType} folder "${folderPath}".`, level: this.constructor.NOTIFICATION_LEVEL_INFO};
		}

		if (firstDoc?.pack) {
			const pack = game.packs.get(firstDoc.pack);
			return {message: `Imported "${name}" to ${pack.metadata.type} compendium "${pack.metadata.label}".`, level: this.constructor.NOTIFICATION_LEVEL_INFO};
		}

		return {message: `Imported "${name}".`, level: this.constructor.NOTIFICATION_LEVEL_INFO};
	}

	doNotification () {
		const meta = this.getNotificationMeta();
		switch (meta.level) {
			case this.constructor.NOTIFICATION_LEVEL_INFO: return ui.notifications.info(meta.message);
			case this.constructor.NOTIFICATION_LEVEL_WARNING: return ui.notifications.warn(meta.message);
			case this.constructor.NOTIFICATION_LEVEL_ERROR: return ui.notifications.error(meta.message);
			default: throw new Error(`Unhandled level "${meta.level}"!`);
		}
	}

	
	isFailed () { return this.status === ConstsTaskRunner.TASK_EXIT_FAILED; }
}

class ImportedDocument {
		constructor (
		{
			name = null,
			isExisting = false,
			document = null,
			actor = null,
			embeddedDocument = null,
			pack = null,
		},
	) {
		if (document && embeddedDocument) throw new Error(`Only one of "document" and "embeddedDocument" may be specified!`);
		if (actor && pack) throw new Error(`Only one of "actor" and "pack" may be specified!`);

		this.name = name;
		this.isExisting = isExisting;
		this.document = document;
		this.actor = actor;
		this.embeddedDocument = embeddedDocument;
		this.pack = pack;
	}

	getPrimaryDocument () {
		return this.embeddedDocument
			|| this.document;
	}
}
class ConstsTaskRunner {
	static TASK_EXIT_COMPLETE = Symbol("taskExitComplete");
	static TASK_EXIT_CANCELLED = Symbol("taskExitCancelled");
	static TASK_EXIT_SKIPPED_DUPLICATE = Symbol("taskExitSkippedDuplicate");
	static TASK_EXIT_SKIPPED_OTHER = Symbol("taskExitSkippedOther");
	static TASK_EXIT_COMPLETE_UPDATE_OVERWRITE = Symbol("taskExitCompleteOverwrite");
	static TASK_EXIT_COMPLETE_UPDATE_OVERWRITE_DUPLICATE = Symbol("taskExitCompleteOverwriteDuplicate");
	static TASK_EXIT_FAILED = Symbol("taskExitCompleteFailed");
	static TASK_EXIT_COMPLETE_DATA_ONLY = Symbol("taskExitCompleteDataOnly");
}
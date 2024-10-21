function MixinHidableApplication (Cls) {
	class MixedHidableApplication extends Cls {
		constructor (...args) {
			super(...args);

			this._isClosable = true;
			this._isHidden = false;
			this._isRendered = false;
		}

		set isClosable (val) { this._isClosable = !!val; }

		get isEscapeable () {
			if (this._isClosable) return true;
			else return !this._isHidden;
		}

		async _close_isAlwaysHardClose () {
			return false;
		}

		async _close_doHardCloseTeardown () {
					}

		async close (...args) {
			if (this._isClosable || await this._close_isAlwaysHardClose()) {
				await this._close_doHardCloseTeardown();
				this._isRendered = false;
				return super.close(...args);
			}

			this._doSoftClose();
		}

		_doSoftClose () {
			this._isHidden = true;
			this.element.hideVe();
		}

		async _pDoHardClose () {
			this._isClosable = true;
			return this.close();
		}

		async _pPostRenderOrShow () {
					}

		async _render (...args) {
			if (!this._isHidden && this._isRendered) {
				this._doSoftOpen();
				return;
			}

			if (this._isHidden) {
				this._doSoftOpen();
				await this._pPostRenderOrShow();
				return;
			}

			await super._render(...args);
			await this._pPostRenderOrShow();

			this._isRendered = true;
		}

		_doSoftOpen () {
			this.element.showVe();
			this._isHidden = false;
			this.maximize();
			UtilApplications.bringToFront(this);
		}

		async showAndRender (renderForce, renderOpts) {
			if (this._isHidden) {
				this.element.showVe();
				this._isHidden = false;
			}

			await UtilApplications.pForceRenderApp(this, renderForce, renderOpts);
		}
	}
	return MixedHidableApplication;
}
function MixinFolderPathBuilder (Cls) {
	class MixedFolderPathBuilder extends Cls {
				_getFullFolderPathSpecKey () { throw new Error("Unimplemented!"); }
		getFolderPathMeta () { throw new Error("Unimplemented!"); }
		
		constructor (...args) {
			super(...args);
			this._folderPathSpec = [];
			this._defaultFolderPath = [];
			this._mxFolderPathBuilder_textOnlyMode = false;
		}

		get folderPathSpec () { return this._folderPathSpec; }

		async _pInit_folderPathSpec () {
			//this._folderPathSpec = MiscUtil.get((await GameStorage.pGetClient(this._getFullFolderPathSpecKey())), "path");
			if (this._folderPathSpec != null) return;

			const folderPathMeta = this.getFolderPathMeta();
			const defaultSpec = (this._defaultFolderPath || [])
				.map(it => (this._mxFolderPathBuilder_textOnlyMode ? FolderPathBuilderRowTextOnly : FolderPathBuilderRow).getStateFromDefault_(it, {folderPathMeta}));
			await this.pSetFolderPathSpec(defaultSpec);
		}

		async pSetFolderPathSpec (folderPathSpec) {
			this._folderPathSpec = folderPathSpec;
			return GameStorage.pSetClient(this._getFullFolderPathSpecKey(), {path: this._folderPathSpec});
		}

		async pHandleEditFolderPathClick () {
			await this._pInit_folderPathSpec();
			const builderApp = new FolderPathBuilderApp({fpApp: this, folderType: this.constructor.FOLDER_TYPE});
			builderApp.render(true);
		}

		async _pGetCreateFoldersGetIdFromObject ({folderType, obj, sorting = "a", defaultOwnership = null, userOwnership = null, isFoldersOnly = false, isRender = true}) {
			if (!this._folderPathSpec.length || !folderType) return new FolderIdMeta();

			const pathStrings = this._getFolderPathStrings({obj});

			return UtilFolderPathBuilder.pGetCreateFolderIdMeta({
				folderType,
				folderNames: pathStrings,
				sorting,
				defaultOwnership,
				userOwnership,
				isFoldersOnly,
				isRender,
			});
		}

		_getFolderPathStrings ({obj}) {
			return FolderPathBuilder.getFolderPathStrings({obj, folderPathSpec: this._folderPathSpec, folderPathMeta: this.getFolderPathMeta()});
		}
	}
	return MixedFolderPathBuilder;
}
class EmptyClass{
    
}
//#region DataPrimer
class DataPrimerBase {
	static async pGetPrimed ({json, propsCopied}) { return json; }
}
class DataPrimerActor extends DataPrimerBase {
	static _PROPS;
	static _ThreeDiTokenAdapter;

	static async pGetPrimed ({json, propsCopied}) {
		if (!this._ThreeDiTokenAdapter) return json;
		if (!this._PROPS.some(prop => json[prop]?.length)) return json;

		await this._ThreeDiTokenAdapter.pInit();

		this._PROPS
			.forEach(prop => {
				(json[prop] || [])
					.forEach(ent => ent.hasToken3d = !!this._ThreeDiTokenAdapter.getPrimaryMeta(ent));
			});

		return json;
	}
}
class DataPrimerCreature extends DataPrimerActor {
	static _PROPS = ["monster"];
	//static _ThreeDiTokenAdapter = ThreeDiTokenAdapterCreature;
}
class DataPrimerClass extends DataPrimerBase {
	static _PROPS = [
		"class",
		"subclass",
		"classFeatures",
		"subclassFeature",
	];

	static async pGetPrimed ({json, propsCopied}) {
		if (!this._PROPS.some(prop => json[prop]?.length)) return json;

		json = {...json};

		const isIgnoredLookup = await DataConverterClassSubclassFeature.pGetClassSubclassFeatureIgnoredLookup({data: json});
		return PageFilterClassesFoundry.pPostLoad(json, {isIgnoredLookup, propsCopied});
	}
}
class DataPrimer {
	static _PRIMERS = [
		DataPrimerCreature,
		//DataPrimerVehicle,

		DataPrimerClass,
//TOFIX
		//DataPrimerFauxOptionalfeatures,

		//DataPrimerClassSubclassFeature,
		//DataPrimerFeat,
		//DataPrimerOptionalfeature,

		//DataPrimerSpell,
	];

	static async pGetPrimedJson (json) {
		const propsCopied = new Set();

		for (const primer of this._PRIMERS) {
			json = await primer.pGetPrimed({
				json,
				propsCopied,
			});
		}
		return json;
	}

	
	static getCleanedFeature_tmpOptionalfeatureList (feature) {
		const cpyFeature = MiscUtil.copy(feature); 		MiscUtil.getWalker()
			.walk(
				cpyFeature,
				{
					array: (arr) => {
						return arr.filter(it => it.data == null || !it.data[DataPrimerConsts.ENT_DATA_KEY__TMP_OPTIONALFEATURE_LIST]);
					},
				},
			);
		return cpyFeature;
	}
}
var DataPrimer$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  DataPrimer: DataPrimer
});
//#endregion

class ImportList extends MixinHidableApplication(MixinFolderPathBuilder(EmptyClass))
{
  static async api_pImportEntry (
  entry,
  {
    isTemp = false,
    packId = null,
    actorMultiImportHelper = null,
  } = {},
) {
  if (game.user.role < Config.get("import", "minimumRole")) throw new Error(`You do not have sufficient permissions!`);

  const pack = packId ? game.packs.get(packId) : null;
  if (!pack && packId) throw new Error(`Could not find pack "${pack}"`);

  if (isTemp && packId) throw new Error(`Options "isTemp" and "packId" are mutually exclusive!`);

  entry = await entry;
  if (entry == null) throw new Error(`Entry cannot be null/undefined!`);

  const imp = new this();
  await imp.pInit();
  imp.pack = pack;
  return imp.pImportEntry(entry, new ImportOpts({isTemp, actorMultiImportHelper}));
  }

  static init () {
      UtilLibWrapper.addPatch(
    "Actor.fromDropData",
    this._lw_Actor_fromDropData,
    UtilLibWrapper.LIBWRAPPER_MODE_MIXED,
  );
  UtilLibWrapper.addPatch(
    "Item.fromDropData",
    this._lw_Item_fromDropData,
    UtilLibWrapper.LIBWRAPPER_MODE_MIXED,
  );
  UtilLibWrapper.addPatch(
    "JournalEntry.fromDropData",
    this._lw_JournalEntry_fromDropData,
    UtilLibWrapper.LIBWRAPPER_MODE_MIXED,
  );
  UtilLibWrapper.addPatch(
    "RollTable.fromDropData",
    this._lw_RollTable_fromDropData,
    UtilLibWrapper.LIBWRAPPER_MODE_MIXED,
  );
  }

static async _lw_Actor_fromDropData (fn, ...args) {
  const out = await ImportList._pHandleDropGetImportedDoc(args[0]);
  if (out) return out;
  return fn(...args);
}

static async _lw_Item_fromDropData (fn, ...args) {
  const out = await ImportList._pHandleDropGetImportedDoc(args[0], {isTemp: true});
  if (out) return out;
  return fn(...args);
}

static async _lw_JournalEntry_fromDropData (fn, ...args) {
  const out = await ImportList._pHandleDropGetImportedDoc(args[0]);
  if (out) return out;
  return fn(...args);
}

static async _lw_RollTable_fromDropData (fn, ...args) {
  const out = await ImportList._pHandleDropGetImportedDoc(args[0]);
  if (out) return out;
  return fn(...args);
}

static preInit () {
  UtilLibWrapper.addPatch(
    "ActorDirectory.prototype._onDrop",
    this._lw_ActorDirectory_prototype__onDrop,
    UtilLibWrapper.LIBWRAPPER_MODE_MIXED,
  );

  UtilLibWrapper.addPatch(
    "Compendium.prototype._onDrop",
    this._lw_Compendium_prototype__onDrop,
    UtilLibWrapper.LIBWRAPPER_MODE_MIXED,
  );
}

static async _lw_ActorDirectory_prototype__onDrop (fn, ...args) {
  if (await ImportList._pHandleSidebarDrop(this, ...args)) return;
  return fn(...args);
}

static async _lw_Compendium_prototype__onDrop (fn, ...args) {
  const data = EventUtil.getDropJson(args[0]);
  const out = await ImportList._pHandleDropGetImportedDoc(data, {pack: this.collection});
  if (out) return out;
  return fn(...args);
}

static get ID () { throw new Error("Unimplemented!"); }
static get DISPLAY_NAME_TYPE_SINGLE () { throw new Error("Unimplemented!"); }
static get DISPLAY_NAME_TYPE_PLURAL () { throw new Error("Unimplemented!"); }
static get PROPS () { return null; }

static get FOLDER_TYPE () { return "Item"; }

  static _isImporterDropEvent ({evt, data}) {
  if (!evt && !data) return false; 
  if (!data) data = EventUtil.getDropJson(evt);

  if (data.subType !== UtilEvents.EVT_DATA_SUBTYPE__HOVER && data.subType !== UtilEvents.EVT_DATA_SUBTYPE__IMPORT) return false;

  return data.page && data.source && data.hash;
}

static async patcher_pHandleActorDrop (evt) {
  const data = EventUtil.getDropJson(evt);

  if (!ImportList._isImporterDropEvent({evt})) return;

  const doc = await ImportList._pHandleDropGetImportedDoc(data, {isTemp: true});
  if (!doc) return;

              ImportList._suppressCreateSheetItemHookTimeStart = Date.now();

  const evtNxt = new DragEvent(
    "drop",
    {
      dataTransfer: new DataTransfer(),
    },
  );
  evtNxt.dataTransfer.setData(
    "text/plain",
    JSON.stringify({
      type: doc.documentName,
      data: doc.toJSON(),
      uuid: `${doc.documentName}.${doc.id}`,
              _isSuppressCreateSheetItemHook: true,
    }),
  );

      Object.defineProperty(evtNxt, "target", {writable: false, value: evt.target});

  return this._onDrop(evtNxt);
}

static async _pHandleSidebarDrop (sidebar, evt) {
  const data = EventUtil.getDropJson(evt);

  if (!ImportList._isImporterDropEvent({evt})) return;

  await ImportList._pHandleDropGetImportedDoc(data, {requiresDocumentName: sidebar.constructor.documentName});

  return true;
}

static async _pHandleDropGetImportedDoc (data, {isTemp = false, requiresDocumentName = null, pack = null} = {}) {
  if (ImportList._isImporterDropEvent({data})) return this._pHandleDropGetImportedDoc_importerDrop(...arguments);
  if (ImportList._isBadlyDroppedCustomUid({data})) return this._pHandleDropGetImportedDoc_badCustomUidDrop(...arguments);
  return null;
}

static async _pHandleDropGetImportedDoc_importerDrop (data, {isTemp = false, requiresDocumentName = null, pack = null} = {}) {
  const entity = await DataLoader.pCacheAndGet(data.page, data.source, data.hash, {isCopy: true});

  const {ChooseImporter} = await Promise.resolve().then(function () { return ChooseImporter$1; });

  return this._pHandleDropGetImportedDoc_getFromEntity({
    ChooseImporter,
    entity,
    page: data.page,
    pack,
    requiresDocumentName,
    isTemp,
  });
}

  static _isBadlyDroppedCustomUid ({data}) {
  if (!data.uuid) return false;
  return UtilUuid.isCustomUuid(data.uuid);
}

static async _pHandleDropGetImportedDoc_badCustomUidDrop (data, {isTemp = false, requiresDocumentName = null, pack = null} = {}) {
  const uuidInfo = UtilUuid.getCustomUuidInfo(data.uuid);
  if (!uuidInfo) return null;

  const {tag, text} = uuidInfo;

  const {ChooseImporter} = await Promise.resolve().then(function () { return ChooseImporter$1; });

  const importerMeta = ChooseImporter.getImporterClassMeta(tag);
  if (!importerMeta) return null;

  const {page, pageHover, source, hash, hashHover} = Renderer.utils.getTagMeta(`@${tag}`, text);

  const entity = await DataLoader.pCacheAndGet(pageHover || page, source, hashHover || hash, {isCopy: true});

  return this._pHandleDropGetImportedDoc_getFromEntity({
    ChooseImporter,
    entity,
    page: pageHover || page,
    pack,
    requiresDocumentName,
    isTemp,
  });
}

static async _pHandleDropGetImportedDoc_getFromEntity (
  {
    ChooseImporter,
    entity,
    page,
    pack,
    requiresDocumentName,
    isTemp,
  },
) {
  const importer = ChooseImporter.getImporter(entity?.__prop || page);
  if (pack) importer.pack = pack;
  await importer.pInit();

  if (requiresDocumentName != null && importer.constructor.FOLDER_TYPE !== requiresDocumentName) return null;

  const importSummary = await importer.pImportEntry(
    entity,
    {
      isTemp,
      defaultOwnership: UtilDataConverter.getTempDocumentDefaultOwnership({documentType: importer.constructor.FOLDER_TYPE}),
    },
  );

  return (importSummary.imported || [])
    .map(it => it.document)
    .filter(Boolean)[0];
}

static _initCreateSheetItemHook (
  {
    prop,
    importerName,
    isForce,
    pFnGetEntity,
    pFnImport,
    fnGetSuccessMessage,
    fnGetFailedMessage,
  },
) {
    Hooks.on("preCreateItem", (item, itemData, options, itemId) => {
      if (item.parent?.documentName !== "Actor") return;

      //if (IntegrationLootsheetSimple.isLootSheetActor(item.parent)) return;

      const flags = itemData.flags?.[SharedConsts.MODULE_ID];
      if (!flags || flags?.propDroppable !== prop) return;
      if (flags.isStandardDragDrop || flags.isDirectImport) return;

        if (
        ImportList._suppressCreateSheetItemHookTimeStart != null
        && (Date.now() - ImportList._suppressCreateSheetItemHookTimeStart) < 10_000
      ) {
        ImportList._suppressCreateSheetItemHookTimeStart = null;
        return;
      }
      ImportList._suppressCreateSheetItemHookTimeStart = null;
      
      const actor = item.parent;

      this._pGetUseImporterDragDrop({isForce})
        .then(async isUseImporter => {
                    if (isUseImporter == null) return;

          let ent;
          try {
            if (pFnGetEntity) ent = await pFnGetEntity(flags);
            else ent = await DataLoader.pCacheAndGet(flags.propDroppable, flags.source, flags.hash);
          } catch (e) {
            if (isUseImporter) {
              ui.notifications.error(`Failed to import "${ent?.name ?? flags.hash}"! ${VeCt.STR_SEE_CONSOLE}`);
              throw e;
            }
          }

          if (isUseImporter && !ent) {
            const msg = `Failed to import "${flags.hash}"!`;
            ui.notifications.error(`${msg} ${VeCt.STR_SEE_CONSOLE}`);
            throw new Error(`${msg} The original entity could not be found.`);
          }

          try {
            if (isUseImporter) {
              const actorMultiImportHelper = new ActorMultiImportHelper({actor});
              const imp = new this({actor});
              await imp.pInit();

              if (pFnImport) await pFnImport({ent, imp, flags});
              else await imp.pImportEntry(ent, {filterValues: flags.filterValues});

              await actorMultiImportHelper.pRepairMissingConsumes();

              const msg = fnGetSuccessMessage ? fnGetSuccessMessage({ent, flags}) : `Imported "${ent.name}" via ${importerName} Importer`;
              ui.notifications.info(msg);
              return;
            }

            itemData = MiscUtil.copyFast(itemData);
            MiscUtil.set(itemData.flags, SharedConsts.MODULE_ID, "isStandardDragDrop", true);

            const optionsCreateEmbeddedDocuments = {...options};
                        delete optionsCreateEmbeddedDocuments.keepId;
            delete optionsCreateEmbeddedDocuments.keepEmbeddedIds;

            await UtilDocuments.pCreateEmbeddedDocuments(
              actor,
              [itemData],
              {
                ClsEmbed: Item,
                isKeepId: options.keepId ?? false,
                                isKeepEmbeddedIds: options.keepEmbeddedIds ?? options.keepId ?? false,
                optionsCreateEmbeddedDocuments,
              },
            );
          } catch (e) {
            const msg = fnGetFailedMessage ? fnGetFailedMessage({ent, flags}) : `Failed to import "${ent.name}"! ${VeCt.STR_SEE_CONSOLE}`;
            ui.notifications.error(msg);
            throw e;
          }
        });

      return false;
    });
}

static async _pGetUseImporterDragDrop ({isForce}) {
  if (isForce) return true;

  const dragDropMode = Config.get("import", "dragDropMode");
  if (dragDropMode === ConfigConsts.C_IMPORT_DRAG_DROP_MODE_NEVER) return false;

  if (dragDropMode === ConfigConsts.C_IMPORT_DRAG_DROP_MODE_PROMPT) {
    const $dispConfigOption = $(`<span class="bold clickable">Use Importer when Drag-Dropping Items to Actors</span>`)
      .on("click", evt => Config.pOpen({evt, initialVisibleGroup: "import"}));

    return InputUiUtil.pGetUserBoolean({
      title: `Import via ${Config.get("ui", "isStreamerMode") ? "SRD Importer" : SharedConsts.MODULE_TITLE}?`,
      $eleDescription: $$`<div>
        <p>This will ignore any in-Foundry modifications made to the item.</p>
        <p class="ve-muted italic">This prompt can be disabled by changing the &quot;${$dispConfigOption}&quot; Config option.</p>
      </div>`,
      textYes: "Yes, use the importer",
      textNo: "No, use normal drag-drop",
    });
  }

  return true;
}

  static get defaultOptions () {
  return foundry.utils.mergeObject(super.defaultOptions, {
    template: `${SharedConsts.MODULE_LOCATION}/template/ImportList.hbs`,
    width: 960,
    height: Util.getMaxWindowHeight(),
    resizable: true,
    title: `Import ${this.DISPLAY_NAME_TYPE_PLURAL}`,
  });
}

_isSkipContentFlatten = false;
  _titleSearch = "entry";
  _sidebarTab = null;
  _gameProp = null;
  _defaultFolderPath = null;
  _pageFilter = null;
  _page = null;
  _listInitialSortBy = null;
  _isPreviewable = false;
  _isNotDroppable = false;
  _configGroup = null;
  _isFolderOnly = false;
  _isNonCacheableInstance = null;
  _titleButtonRun = "Import";
  _namespace = null;
  _fnListSort = undefined;
  _pFnGetFluff = null;
  _isActorRadio = false;
  _isAlwaysRadio = false;
  _ClsCustomizer = null;
  static _DataConverter = null;
  static _DataPipelinesList = null;

  constructor (externalData) {
  super();

          this._actor = externalData?.actor;
  this._table = externalData?.table;
  this._pack = externalData?.pack;
  this._container = externalData?.container;
  this._packCache = null;
  this._packCacheFlat = null;

  this._isInit = false;
  this._content = null;
  this._list = null;
  this._listSelectClickHandler = null;

  this._$bntFilter = null;
  this._$btnReset = null;
  this._$btnFeelingLucky = null;
  this._$btnToggleSummary = null;
  this._$iptSearch = null;
  this._$dispNumVisible = null;
  this._$cbAll = null;
  this._$btnTogglePreviewAll = null;
  this._$wrpRun = null;
  this._$btnRun = null;
  this._$btnsRunAdditional = {};
  this._$wrpBtnsSort = null;
  this._$wrpList = null;
  this._$wrpMiniPills = null;
    }

get _isRadio () {
  return this._isAlwaysRadio
    || (!!this._actor && this._isActorRadio);
}

get page () { return this._page; }
set pack (val) { this._pack = val; }
get isFolderOnly () { return this._isFolderOnly; }
get isNonCacheableInstance () { return !!this._isNonCacheableInstance; }

get gameProp () { return this._gameProp; }
get actor () { return this._actor; }
get table () { return this._table; }
get configGroup () { return this._configGroup; }

get propsNamespace () {
  if (!this._namespace && !this.constructor.PROPS) throw new Error(`One of "PROPS" or "namespace" must be provided!`);
  return this._namespace || this.constructor.PROPS.join("_");
}

async pSetContent (val) {
      if (!this.constructor.PROPS?.length || this._isSkipContentFlatten) {
    this._content = val;
    return;
  }

  let content = [];
  Object.entries(val)
    .forEach(([k, arr]) => {
      if (!this.constructor.PROPS.includes(k)) return;
      content = [...content, ...arr];
    });
  this._content = content;
}

async pSyncStateFrom (that) {
  this._actor = that._actor;
  this._table = that._table;
  this._pack = that._pack;
  this._container = that._container;
  await this.pSetFolderPathSpec(that._folderPathSpec);
}

async _close_isAlwaysHardClose () {
  return !!this._isNonCacheableInstance;
}

async _close_doHardCloseTeardown () {
  if (this._pageFilter?.filterBox) this._pageFilter.filterBox.teardown();
}

isInvalidatedByConfigChange (configDiff) { return false; }

async pPreRender () {}

activateSidebarTab ({sidebarTab = null} = {}) {
  sidebarTab = sidebarTab || this._sidebarTab;

  if (this._table) ui.sidebar.activateTab("tables");
  if (this._pack && !this._container) ui.sidebar.activateTab("compendium");
  else if (!this._actor && !this._table && !this._container && sidebarTab) ui.sidebar.activateTab(sidebarTab);
}

renderTargetApplication ({gameProp = null} = {}) {
  if (this._container) this._container.render();

  if (this._actor) return this._actor.render();
  if (this._table) return this._table.render();
  if (this._pack) return this._pack.render();

  gameProp = gameProp || this._gameProp;
  return game[gameProp].render();
}

async pInit () {
  if (this._isInit) return true;
  this._isInit = true;

      await this._pInit_folderPathSpec();
}

_getFullFolderPathSpecKey () { return `${ImportList._STO_K_FOLDER_PATH_SPEC}.${this._folderPathSpecKeyConstructorName}`; }
get _folderPathSpecKeyConstructorName () { return this.constructor.name; }

_colWidthName = 9;
_colWidthSource = 2;

  getData () {
  return {
    isRadio: !!this._isRadio,
    isPreviewable: this._isPreviewable,
    isNotDroppable: this._isNotDroppable,
    titleButtonRun: this._titleButtonRun,
    titleSearch: this._titleSearch,
    ...this._getData_cols(),
    rows: this._content.map((it, ix) => this._getData_row({it, ix})),
  };
}

_getData_cols () {
  return {
    cols: [
      ...this._getData_cols_otherPre(),
      {
        name: "Name",
        width: this._colWidthName,
        field: "name",
      },
      ...this._getData_cols_other(),
      {
        name: "Source",
        width: this._colWidthSource,
        field: "source",
        titleProp: "sourceLong",
        displayProp: "sourceShort",
        classNameProp: "sourceClassName",
        styleProp: "sourceStyle",
        rowClassName: "ve-text-center",
      },
    ],
  };
}

_getData_cols_otherPre () { return []; }
_getData_cols_other () { return []; }

_getData_row ({it, ix}) {
  if (this._pageFilter) this._pageFilter.constructor.mutateForFilters(it);

  return {
    name: it.name,
    source: it.source,
    sourceShort: Parser.sourceJsonToAbv(it.source),
    sourceLong: Parser.sourceJsonToFull(it.source),
    sourceClassName: Parser.sourceJsonToSourceClassname(it.source),
    sourceStyle: Parser.sourceJsonToStylePart(it.source),
    isVersion: !!it._versionBase_isVersion,
    __prop: it.__prop,
    ...this._getData_row_mutGetAdditionalValues({it, ix}),
    ix,
  };
}

_getData_row_mutGetAdditionalValues ({it, ix}) { return {}; }

_renderInner_doFindUiElements ($html) {
  const root = $html[0];

  const $wrpFilterControls = $(root.children[0]);
  this._$bntFilter = $wrpFilterControls.find(`[name="btn-filter"]`);
  this._$btnReset = $wrpFilterControls.find(`[name="btn-reset"]`);
  this._$btnFeelingLucky = $wrpFilterControls.find(`[name="btn-feeling-lucky"]`);
  this._$btnToggleSummary = $wrpFilterControls.find(`[name="btn-toggle-summary"]`);
  this._$iptSearch = $wrpFilterControls.find(`.search`);
  this._$dispNumVisible = $wrpFilterControls.find(`.lst__wrp-search-visible`);

  this._$wrpMiniPills = $(root.children[1]);

  const $wrpBtnsSort = $(root.children[2]);
  this._$cbAll = $wrpBtnsSort.find(`[name="cb-select-all"]`);
  this._$btnTogglePreviewAll = $wrpBtnsSort.find(`[name="btn-toggle-all-previews"]`);
  this._$wrpBtnsSort = $wrpBtnsSort;

  this._$wrpList = $(root.children[3]);

  this._$wrpRun = $(root.children[4]);
  this._$btnRun = this._$wrpRun.find(`[name="btn-run"]`);

  this._$wrpRun
    .find(`[name]`)
    .each((i, e) => {
      if (e.name === "btn-run") return;
      this._$btnsRunAdditional[e.name] = $(e);
    });
}

async _renderInner (data) {
  const $html = await super._renderInner(data);
  await this._renderInner_custom({$html, data});
  return $html;
}

async _renderInner_custom ({$html, data}) {
  this._renderInner_doFindUiElements($html);

  this._renderInner_listItems({$html, data});

  this._renderInner_initRunButton();
  this._renderInner_initRunButtonsAdditional();

  this._renderInner_initSearchKeyHandlers();

  const doResetSearch = () => {
    if (this._$iptSearch) this._$iptSearch.val("");
    if (this._list) this._list.reset();
  };

  this._$btnReset.click(() => {
    doResetSearch();
  });

  this._renderInner_initFeelingLuckyButton();

  if (this._pageFilter) {
    await this._renderInner_pInitFilteredList();
    await this._renderInner_initPreviewsAndQuicksImportsAndDroppables();
  } else {
    this._renderInner_initList();
  }

  this._list.on("updated", () => this._$dispNumVisible.html(`${this._list.visibleItems.length}/${this._list.items.length}`));
  this._listSelectClickHandler.bindSelectAllCheckbox(this._$cbAll);
  ListUiUtil.bindPreviewAllButton(this._$btnTogglePreviewAll, this._list);

  doResetSearch();
}

  _renderInner_listItems ({$html, data}) {
  let html = "";

  for (const row of data.rows) {
    const ptCols = data.cols
      .map(col => `<span
          class="px-1 ve-col-${col.width} ${col.field === "name" && row.isVersion ? "italic" : ""} ${col.rowClassName || ""} ${col.classNameProp ? row[col.classNameProp] || "" : ""}"
          ${col.titleProp && row[col.titleProp] ? `title="${row[col.titleProp]}"` : ""}
          ${col.styleProp && row[col.styleProp] ? `style="${row[col.styleProp]}"` : ""}
        >
          ${col.field === "name" && row.isVersion ? `<span class="px-2"></span>` : ""}${col.displayProp ? row[col.displayProp] || "" : row[col.field] || ""}
        </span>`)
      .join("");

    html += `<div class="w-100 ve-flex-col no-shrink veapp__list-row" ${data.isNotDroppable ? "" : `draggable="true"`}>
      <label class="w-100 veapp__list-row-hoverable ve-flex-v-center">
        <span class="${data.isPreviewable ? `ve-col-0-4` : `ve-col-1`} px-1 ve-flex-vh-center">
          ${data.isRadio ? `<input type="radio" name="radio" class="no-events">` : `<input type="checkbox" class="no-events">`}
        </span>

        ${data.isPreviewable ? `<div class="ve-col-0-6 px-1 ve-flex-vh-center">
          <div class="ui-list__btn-inline" title="Toggle Preview (SHIFT to Toggle Info Preview)">[+]</div>
          <div class="ui-list__btn-inline" title="Import">[&#10151;]</div>
        </div>` : ""}

        ${ptCols}
      </label>
    </div>`;
  }

  this._$wrpList.fastSetHtml(html);
}

_renderInner_initFeelingLuckyButton () {
  this._$btnFeelingLucky.click(() => {
    if (!this._list || !this._list.visibleItems.length) return;

    this._listSelectClickHandler.setCheckboxes({isChecked: false, isIncludeHidden: true, list: this._list});

    const listItem = RollerUtil.rollOnArray(this._list.visibleItems);
    if (!listItem) return;

    this._listSelectClickHandler.setCheckbox(listItem, {toVal: true});

    listItem.ele.scrollIntoView({block: "center"});
  });
}

_renderInner_initPreviewsAndQuicksImportsAndDroppables () {
  if (!this._isPreviewable && this._isNotDroppable) return;

  const items = this._list.items;
  const len = items.length;
  for (let i = 0; i < len; ++i) {
    const item = items[i];

    if (this._isPreviewable) {
      const eleControlsWrp = item.ele.firstElementChild.children[1];

      const btnShowHidePreview = eleControlsWrp.children[0];
      const btnImport = eleControlsWrp.children[1];

      this._renderInner_initPreviewButton(item, btnShowHidePreview);
      this._renderInner_initPreviewImportButton(item, btnImport);
    }

    if (!this._isNotDroppable) {
      this._renderInner_initDroppable(item);
    }
  }
}

_renderInner_initPreviewButton (item, btnShowHidePreview) {
  ListUiUtil.bindPreviewButton(this._page, this._content, item, btnShowHidePreview);
}

_renderInner_initPreviewImportButton (item, btnImport) {
  btnImport.addEventListener("click", async evt => {
    evt.stopPropagation();
    evt.preventDefault();

    if (this._isRadio) this.close();

    const toImport = this._content[item.ix];
    try {
      await this._pDoPreCachePack();
      let imported;
      try {
        imported = await this.pImportEntry(toImport);
      } finally {
        this._pHandleClickRunButton_doDumpPackCache();
      }
      if (!imported) return; 				imported.doNotification();
    } catch (e) {
      setTimeout(() => { throw e; });
      ImportSummary.failed({entity: toImport}).doNotification();
    }
  });
}

_renderInner_initDroppable (listItem) {
  listItem.ele.addEventListener("dragstart", evt => {
    const meta = {
      type: this.constructor.FOLDER_TYPE,
      subType: UtilEvents.EVT_DATA_SUBTYPE__IMPORT,
      page: this._page,
      source: listItem.values.source,
      hash: listItem.values.hash,
      name: listItem.name,
      tag: this._getAsTag(listItem),
    };
    evt.dataTransfer.setData("text/plain", JSON.stringify(meta));
  });
}

  _renderInner_initRunButton () {
  this._$btnRun.click(() => this._pHandleClickRunButton());
}

_renderInner_initRunButtonsAdditional () {
  if (this._$btnsRunAdditional["btn-run-mods"]) this._$btnsRunAdditional["btn-run-mods"].click(() => this._pHandleClickRunButton({optsPostProcessing: {isUseMods: true}}));
}

_renderInner_initSearchKeyHandlers () {
  if (!this._$iptSearch) return;

  this._renderInner_initSearchKeyHandlers_enter();
}

_renderInner_initSearchKeyHandlers_enter () {
  this._$iptSearch.keydown(async evt => {
    if (evt.key !== "Enter") return;
    if (!this._list) return;

    evt.stopPropagation();
    evt.preventDefault();

    const li = this._list.visibleItems[0];
    if (!li) return;

    await this._pImportListItems({
      listItems: [li],
      isBackground: true,
    });
  });
}

  async _pGetPreCustomizedEntries (entries) {
  return entries;
}

async _pFnPostProcessEntries (entries, {isUseMods = false} = {}) {
  if (!this._ClsCustomizer) return entries;

  const entriesPreCustomized = await this._pGetPreCustomizedEntries(entries);
  if (!isUseMods) return entriesPreCustomized;

  const customizer = new this._ClsCustomizer(entriesPreCustomized, {titleSearch: this._titleSearch, isActor: !!this._actor});
  await customizer.pInit();
  return customizer.pGetCustomizedEntries();
}


async _pHandleClickRunButton (
  {
    gameProp = null,
    sidebarTab = null,
    optsPostProcessing = {},
    optsImportEntry = {},
  } = {},
) {
  if (!this._list) return;

  const listItems = await this._pHandleClickRunButton_pGetSelectedListItems();
  if (listItems == null) return;

  if (!listItems.length) return ui.notifications.warn(`Please select something to import!`);

  if (await this._pHandleClickRunButton_pIsLargeImportCancel_directory({listItems})) return;
  if (await this._pHandleClickRunButton_pIsLargeImportCancel_pack({listItems})) return;

  this.close();

  await this._pImportListItems({
    listItems,
    optsPostProcessing,
    optsImportEntry,
    gameProp,
    sidebarTab,
  });

  this._$cbAll.prop("checked", false);
  this._list.items.forEach(item => {
    item.data.cbSel.checked = false;
    item.ele.classList.remove("list-multi-selected");
  });
}

async _pHandleClickRunButton_pGetSelectedListItems () {
  return this._list.items
    .filter(it => it.data.cbSel.checked);
}

async _pHandleClickRunButton_pIsLargeImportCancel_directory ({listItems}) {
  if (this._pack || listItems.length <= 100 || Config.get("ui", "isDisableLargeImportWarning")) return false;

  const isContinue = await InputUiUtil.pGetUserBoolean({
    title: `Warning: Large Import`,
    htmlDescription: `You have selected ${listItems.length} ${listItems.length === 1 ? "entity" : "entities"} to import.<br>Importing a large number of entities may degrade game performance (consider importing to a compendium instead).<br>Do you wish to continue?`,
    textYesRemember: "Continue and Remember",
    textYes: "Continue",
    textNo: "Cancel",
    fnRemember: val => Config.set("ui", "isDisableLargeImportWarning", val),
  });

  return isContinue == null || isContinue === false;
}

async _pHandleClickRunButton_pIsLargeImportCancel_pack ({listItems}) {
  if (!this._pack || listItems.length <= 500 || Config.get("ui", "isDisableLargeImportWarning")) return false;

  const isContinue = await InputUiUtil.pGetUserBoolean({
    title: `Warning: Large Compendium`,
    htmlDescription: `You have selected ${listItems.length} ${listItems.length === 1 ? "entity" : "entities"} to import${this._pack.index.size ? ` to a compendium with ${this._pack.index.size} existing document${this._pack.index.size !== 1 ? "s" : ""}` : ""}.<br>Importing a large number of documents to a single compendium may degrade game performance.<br>Do you wish to continue?`,
    textYesRemember: "Continue and Remember",
    textYes: "Continue",
    textNo: "Cancel",
    fnRemember: val => Config.set("ui", "isDisableLargeImportWarning", val),
  });

  return isContinue == null || isContinue === false;
}


async _pImportListItems (
  {
    listItems,
    optsPostProcessing,
    optsImportEntry,
    gameProp,
    sidebarTab,

    isBackground = false,
  },
) {
  gameProp = gameProp || this._gameProp;
  sidebarTab = sidebarTab || this._sidebarTab;

  let entries = listItems.map(li => this._content[li.ix]);
  entries = await this._pFnPostProcessEntries(entries, optsPostProcessing);
  if (entries == null) return;

  await this._pDoPreCachePack({gameProp});

  await (
    isBackground
      ? this._pImportListItems_background({entries, optsImportEntry})
      : this._pImportListItems_foreground({entries, optsImportEntry})
  );

  this.activateSidebarTab({sidebarTab});
  this.renderTargetApplication({gameProp});

  this._pHandleClickRunButton_doDumpPackCache();
}

async _pImportListItems_background ({entries, optsImportEntry}) {
  const actorMultiImportHelper = this._actor ? new ActorMultiImportHelper({actor: this._actor}) : null;

  for (const entry of entries) {
    try {
      const importedMeta = await this.pImportEntry(
        entry,
        new ImportOpts({
          ...optsImportEntry,
          actorMultiImportHelper,
          isBatched: true,
        }),
      );
      if (importedMeta) importedMeta.doNotification();
    } catch (e) {
      ImportSummary.failed({entity: entry}).doNotification();
      console.error(e);
    }
  }

  if (!actorMultiImportHelper) return;
  try {
    await actorMultiImportHelper.pRepairMissingConsumes();
  } catch (e) {
    ui.notifications.error(`Failed to run post-import step! ${VeCt.STR_SEE_CONSOLE}`);
    console.error(e);
  }
}

async _pImportListItems_foreground ({entries, optsImportEntry}) {
  const actorMultiImportHelper = this._actor ? new ActorMultiImportHelper({actor: this._actor}) : null;

  await (
    new AppTaskRunner({
      tasks: [
        ...entries
          .map(entry => {
            return new TaskClosure({
              fnGetPromise: async ({taskRunner}) => this.pImportEntry(
                entry,
                new ImportOpts({
                  ...optsImportEntry,
                  taskRunner,
                  actorMultiImportHelper,
                  isBatched: true,
                })),
            });
          }),
        ...(
          actorMultiImportHelper
            ? [
              new TaskClosure({
                fnGetPromise: async ({taskRunner}) => actorMultiImportHelper.pRepairMissingConsumes({taskRunner}),
              }),
            ]
            : []
        ),
      ],
      titleInitial: "Importing...",
      titleComplete: "Import Complete",
    })
  ).pRun();
}

  async _renderInner_pInitFilteredList () {
      this._list = new List({
    $iptSearch: this._$iptSearch,
    $wrpList: this._$wrpList,
    fnSort: this._fnListSort,
    sortByInitial: this._listInitialSortBy,
    syntax: this._renderInner_getListSyntax(),
  });
  SortUtil.initBtnSortHandlers(this._$wrpBtnsSort, this._list);
  this._listSelectClickHandler = new ListSelectClickHandler({list: this._list});

  await this._pageFilter.pInitFilterBox({
    $iptSearch: this._$iptSearch,
    $btnReset: this._$btnReset,
    $btnOpen: this._$bntFilter,
    $btnToggleSummaryHidden: this._$btnToggleSummary,
    $wrpMiniPills: this._$wrpMiniPills,
    namespace: this._getFilterNamespace(),
  });

  this._content.forEach(it => this._pageFilter.addToFilters(it));

  this._renderInner_absorbListItems();
  this._list.init();

  this._pageFilter.trimState();
  this._pageFilter.filterBox.render();

  await this._pPostFilterRender();

  this._pageFilter.filterBox.on(
    EVNT_VALCHANGE,
    this._handleFilterChange.bind(this),
  );

  this._handleFilterChange();
}

_renderInner_getListSyntax () {
  return new ListUiUtil.ListSyntax({
    fnGetDataList: () => this._content,
    pFnGetFluff: this._pFnGetFluff,
  }).build();
}

  async _pPostFilterRender () {}

async _pPostRenderOrShow () {
  await super._pPostRenderOrShow();
  if (this._$iptSearch) this._$iptSearch.focus();
}

_renderInner_initList () {
      this._list = new List({
    $iptSearch: this._$iptSearch,
    $wrpList: this._$wrpList,
    fnSort: this._fnListSort,
  });
  SortUtil.initBtnSortHandlers(this._$wrpBtnsSort, this._list);

  this._listSelectClickHandler = new ListSelectClickHandler({list: this._list});

  this._renderInner_absorbListItems();
  this._list.init();
}

  _renderInner_absorbListItems () {
  this._list.doAbsorbItems(
    this._content,
    {
      fnGetName: it => it.name,
              fnGetValues: this._renderInner_absorbListItems_fnGetValues.bind(this),
      fnGetData: UtilList2.absorbFnGetData,
      fnBindListeners: it => this._renderInner_absorbListItems_isRadio
        ? UtilList2.absorbFnBindListenersRadio(this._listSelectClickHandler, it)
        : UtilList2.absorbFnBindListeners(this._listSelectClickHandler, it),
    },
  );
}

  get _renderInner_absorbListItems_isRadio () { return !!this._isRadio; }

  _renderInner_absorbListItems_fnGetValues (it) {
  return {
    source: it.source,
    hash: UrlUtil.URL_TO_HASH_BUILDER[this._page](it),
  };
}

_handleFilterChange () {
  const f = this._pageFilter.filterBox.getValues();
  this._list.filter(li => this._pageFilter.toDisplay(f, this._content[li.ix]));
}


  /**
   * Create a wrapper for our own _pImportEntry
   * @param {any} ent An item in 5etools schema
   * @param {ImportOpts} importOpts
   * @param {any} dataOpts={}
   * @returns {Promise<ImportSummary>}
   */
  async pImportEntry (ent, importOpts, dataOpts = {}) {
    return new ImportEntryManager({
      instance: this, //Mark us as the instance running the import
      ent,
      importOpts,
      dataOpts,
    }).pImportEntry();
}


  /**
   * @param {any} ent An item in 5etools schema
   * @param {ImportOpts} importOpts
   * @param {any} dataOpts
   * @returns {Promise<ImportSummary>}
   */
  async _pImportEntry (ent, importOpts, dataOpts) {
    importOpts ||= new ImportOpts(); //Create a fresh importOpts if none exists

    console.log(...LGT, `Importing ${this._titleSearch} "${ent.name}" (from "${Parser.sourceJsonToAbv(ent.source)}")`);

    //Check if any class that inherits us wants to treat this entity as a stub
    if (this.constructor._DataConverter.isStubEntity(ent)) return ImportSummary.completedStub({entity: ent});

    //if ent._fvttCustomizerState is set, we can apply customization to the entity
    ent = await this._pGetCustomizedEntity({ent});

    Renderer.get().setFirstSection(true).resetHeaderIndex();

    //Start actual pre-import (overridden by classes that inherit us)
    //This is probably related to pre-release content and homebrew material only
    await this._pImportEntry_preImport({ent, importOpts, dataOpts});

    if (importOpts.isDataOnly) {
      return new ImportSummary({
        status: ConstsTaskRunner.TASK_EXIT_COMPLETE_DATA_ONLY,
        imported: [
          new ImportedDocument({
            document: await this.constructor._DataConverter.pGetDocumentJson(
              ent,
              {
                actor: this._actor,
                taskRunner: importOpts.taskRunner,
                actorMultiImportHelper: importOpts.actorMultiImportHelper,
              },
            ),
            actor: this._actor,
          }),
        ],
        entity: ent,
      });
    }

    if (importOpts.isTemp) return this._pImportEntry_pImportToDirectoryGeneric(ent, importOpts, dataOpts);
    //Try to import it onto an actor, if actor was provided
    if (this._actor) return this._pImportEntry_pImportToActor(ent, importOpts, dataOpts);
    //Just import it to a directory
    return this._pImportEntry_pImportToDirectoryGeneric(ent, importOpts, dataOpts);
}

async _pGetCustomizedEntity ({ent}) {
  if (!ent._fvttCustomizerState) return ent;
  return this._ClsCustomizer.pGetAppliedCustomizations({ent});
}

async _pImportEntry_preImport ({ent, importOpts, dataOpts}) {
    }

async _pImportEntry_pImportToActor (ent, importOpts, dataOpts) {
  await UtilDocuments.pCreateEmbeddedDocuments(
    this._actor,
    [
      await this.constructor._DataConverter.pGetDocumentJson(
        ent,
        {
          isActorItem: true,
          actor: this._actor,
          taskRunner: importOpts.taskRunner,
          actorMultiImportHelper: importOpts.actorMultiImportHelper,
        },
        dataOpts,
      ),
    ],
    {ClsEmbed: Item, isRender: !importOpts.isBatched},
  );

      await this._pImportEntry_pImportToActor_pAddSubEntities({ent, importOpts});

  return new ImportSummary({
    status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
    imported: [
      new ImportedDocument({
        name: ent.name,
        actor: this._actor,
      }),
    ],
    entity: ent,
  });
}

  async _pImportEntry_pImportToActor_pAddSubEntities ({ent, importOpts}) {
  const subEntityMetas = await this.constructor._DataConverter.pGetSubEntityMetas({ent});
  if (!subEntityMetas.length) return null;

  const {ChooseImporter} = await Promise.resolve().then(function () { return ChooseImporter$1; });
  const importers = {};

  for (const subEntityMeta of subEntityMetas) {
    if (!importers[subEntityMeta.prop]) {
      importers[subEntityMeta.prop] ||= ChooseImporter.getImporter(subEntityMeta.prop, {actor: this._actor});
      await importers[subEntityMeta.prop].pInit();
    }

    await importers[subEntityMeta.prop].pImportEntry(
      subEntityMeta.entSub,
      {
        taskRunner: importOpts.taskRunner,
        actorMultiImportHelper: importOpts.actorMultiImportHelper,
      },
    );
  }
}

async _pImportEntry_getUserVersion (entity) {
  if (entity._foundryIsIgnoreVersions) return entity;

  const versions = DataUtil.proxy.getVersions(entity.__prop, entity);
  if (!versions.length) return entity;

  const ix = await InputUiUtil.pGetUserEnum({
    values: versions,
    placeholder: "Select Version...",
    title: `Select the Version to Import`,
    fnDisplay: it => {
      if (it == null) return `(Base version)`;
      return `${it.name}${entity.source !== it.source ? ` (${Parser.sourceJsonToAbv(it.source)})` : ""}`;
    },
    isAllowNull: true,
  });

  if (ix == null) {
    const cpy = MiscUtil.copyFast(entity);
    cpy._foundryIsIgnoreVersions = true;
    return cpy;
  }
  return versions[ix];
}

getFolderPathForceLeafEntryName () { return null; }

getFolderPathMeta () {
  return {
    alpha: {
      label: "First Letter of Name",
      getter: it => it.name.slice(0, 1).toUpperCase(),
    },
    source: {
      label: "Source (Full)",
      getter: it => Parser.sourceJsonToFull(it.source),
    },
    sourceAbbreviation: {
      label: "Source (Abbreviation)",
      getter: it => Parser.sourceJsonToAbv(it.source),
    },
  };
}

    async _pImportEntry_pGetFolderIdMeta (entry, opts) {
  opts = opts || {};

  return this._pGetCreateFoldersGetIdFromObject({
    folderType: opts.folderType || this.constructor.FOLDER_TYPE,
    obj: entry,
    sorting: opts.sorting,
    defaultOwnership: this._getFolderDefaultOwnership(opts),
    userOwnership: opts.userOwnership,
    isFoldersOnly: opts.isFoldersOnly,
    isRender: !opts.isBatched,
  });
}

_getFolderDefaultOwnership (
  {
    defaultOwnership,
    isAddDefaultOwnershipFromConfig,
  },
) {
  if (defaultOwnership != null) return defaultOwnership;
  if (isAddDefaultOwnershipFromConfig && Config.has(this._configGroup, "ownership")) return Config.get(this._configGroup, "ownership");
  return null;
}

_getFilterNamespace () {
  const ptTarget = this._actor ? `actor` : this._table ? `table` : "directory";
  return `importer_${ptTarget}_${this.propsNamespace}`;
}

  _getDuplicateMeta (opts) {
  opts = opts || {};

  return new DuplicateMeta({
    mode: Config.get("import", "deduplicationMode"),
    existing: this._getDuplicateMeta_getExisting(opts),
  });
}

_getDuplicateMeta_isMatchingVetProp ({gameProp, entity, doc}) {
  switch (gameProp) {
    case "actors": return true;

    case "items": {
      if (!entity?.__prop) return true;

      const {__prop: prop} = entity;

              if (doc.type === "spell" && prop !== "spell") return false;

      return true;
    }
  }
}

_getDuplicateMeta_getExisting (opts) {
  if (opts?.importOpts?.isTemp || opts?.importOpts?.isImportToTempDirectory) return null;

  const gameProp = opts.gameProp || this._gameProp;

      const pack = gameProp === this._gameProp ? this._pack : null;

  let existing = null;
  switch (gameProp) {
          case "actors":
    case "items": {
      if (!((opts.name != null && opts.sourceIdentifier != null) || opts.entity)) throw new Error(`Either "name" and "sourceIdentifier", or "entity", must be provided!`);

      const cleanName = (opts.name ?? UtilDataConverter.getNameWithSourcePart(opts.entity)).toLowerCase().trim();
      const sourceIdent = opts.sourceIdentifier ?? UtilDocumentSource.getDocumentSourceIdentifierString({entity: opts.entity});

      if (pack) {
        const key = this._getDuplicateMeta_getEntityKey({name: cleanName, sourceIdent});
        existing = (this._packCache || {})[key];
        if (!MiscUtil.isNearStrictlyEqual(existing?.system?.container, this._container?.id)) existing = null;
        break;
      }

      existing = game[gameProp]
        .find(doc => {
          return this.constructor._getDuplicateMeta_getCleanName(doc) === cleanName
            && (
              !Config.get("import", "isStrictMatching")
              || UtilDocumentSource.getDocumentSourceIdentifierString({doc}) === sourceIdent
            )
            && MiscUtil.isNearStrictlyEqual(doc?.system?.container, this._container?.id)
            && this._getDuplicateMeta_isMatchingVetProp({gameProp, entity: opts.entity, doc});
        });

      break;
    }
    
          case "journal":
    case "tables":
    case "scenes":
    case "cards": {
      const cleanName = opts.name.toLowerCase().trim();

      const isMatch = (docExisting) => {
        return this.constructor._getDuplicateMeta_getCleanName(docExisting) === cleanName
          && this.constructor._getDuplicateMeta_isFlagMatch(opts.flags, docExisting);
      };

      if (pack) {
        existing = (this._packCacheFlat || []).find(it => isMatch(it));
      } else {
        existing = game[gameProp].find(it => isMatch(it));
      }
      break;
    }
    
    default: throw new Error(`Game property "${gameProp}" is not supported!`);
  }
  return existing;
}

_getDuplicateCheckFlags (docData) {
  return null;
}

  _getDuplicateMetasSub (opts) {
  if (opts?.importOpts?.isTemp || opts?.importOpts?.isImportToTempDirectory) return null;

  const toCreates = [];
  const toUpdates = [];

  opts.children.forEach(child => {
    const cleanName = child.name.toLowerCase().trim();
    const existing = opts.parent.pages
      .find(it => this.constructor._getDuplicateMeta_getCleanName(it) === cleanName && this.constructor._getDuplicateMeta_isFlagMatch(child.flags, it));

    if (existing) child._id = existing.id;
    (existing ? toUpdates : toCreates).push(child);
  });

  return {toCreates, toUpdates};
}

static _getDuplicateMeta_getCleanName (it) {
  let out = (MiscUtil.get(it, "name") || "").toLowerCase().trim();

  out = out
    .replace(/\[[^\]]+]/g, "") 			.trim();

  return out;
}

static _getDuplicateMeta_isFlagMatch (flags, entity) {
  if (!flags) return true;
  if (!entity) return false;

  if (!entity.flags) return false;
  for (const [moduleKey, flagGroup] of Object.entries(flags)) {
    if (entity.flags[moduleKey] == null) return false;
    for (const [k, v] of Object.entries(flagGroup)) {
      if (!CollectionUtil.deepEquals(v, entity.flags[moduleKey]?.[k])) return false;
    }
  }
  return true;
}

_getDuplicateMeta_getEntityKey (obj) {
  return Object.entries(obj)
    .sort(([aK], [bK]) => SortUtil.ascSortLower(aK, bK))
    .map(([k, v]) => `${k}=${`${v}`.trim()}`.toLowerCase())
    .join("::");
}

  async _pDoPreCachePack ({gameProp = null, taskRunner = null} = {}) {
  gameProp = gameProp || this._gameProp;

  if (!this._pack || Config.get("import", "deduplicationMode") === ConfigConsts.C_IMPORT_DEDUPE_MODE_NONE) return;

  this._packCache = {};
  this._packCacheFlat = [];
  const content = await CompendiumCacheUtil.pGetCompendiumData(this._pack, {isContent: true, taskRunner});

  content.forEach(doc => {
    switch (gameProp) {
      case "actors": {
        const cleanName = (MiscUtil.get(doc, "name") || "").toLowerCase().trim();
        const sourceIdent = UtilDocumentSource.getDocumentSourceIdentifierString({doc});

        const key = this._getDuplicateMeta_getEntityKey({name: cleanName, sourceIdent});
        this._packCache[key] = doc;

        break;
      }
      case "items": {
        const cleanName = (MiscUtil.get(doc, "name") || "").toLowerCase().trim();
        const sourceIdent = UtilDocumentSource.getDocumentSourceIdentifierString({doc});

        const key = this._getDuplicateMeta_getEntityKey({name: cleanName, sourceIdent});
        this._packCache[key] = doc;

        break;
      }
      case "journal":
      case "tables":
      case "scenes":
      case "cards": {
        const cleanName = (MiscUtil.get(doc, "name") || "").toLowerCase().trim();

        const key = this._getDuplicateMeta_getEntityKey({name: cleanName});
        this._packCache[key] = doc;

        break;
      }
      default: throw new Error(`Game property "${gameProp}" is not supported!`);
    }

    this._packCacheFlat.push(doc);
  });
}

_pHandleClickRunButton_doDumpPackCache () {
  this._packCache = null;
  this._packCacheFlat = null;
}

async _pImportEntry_pDoUpdateExistingPackEntity ({entity, duplicateMeta, docData, importOpts}) {
  await this._pCleanExistingDocumentCollections({document: duplicateMeta.existing});

  this._pImportEntry_pDoUpdateExisting_maintainImg({duplicateMeta, docData});

  await UtilDocuments.pUpdateDocument(duplicateMeta.existing, docData);

  await this._pImportEntry_pAddToTargetTableIfRequired([duplicateMeta.existing], duplicateMeta, importOpts);

  return new ImportSummary({
    status: ConstsTaskRunner.TASK_EXIT_COMPLETE_UPDATE_OVERWRITE_DUPLICATE,
    imported: [
      new ImportedDocument({
        isExisting: true,
        document: duplicateMeta.existing,
        pack: this._pack,
      }),
    ],
    entity,
  });
}

async _pImportEntry_pDoUpdateExistingDirectoryEntity ({entity, duplicateMeta, docData}) {
  await this._pCleanExistingDocumentCollections({document: duplicateMeta.existing});

  this._pImportEntry_pDoUpdateExisting_maintainImg({duplicateMeta, docData});

  await UtilDocuments.pUpdateDocument(duplicateMeta.existing, docData);

  return new ImportSummary({
    status: ConstsTaskRunner.TASK_EXIT_COMPLETE_UPDATE_OVERWRITE_DUPLICATE,
    imported: [
      new ImportedDocument({
        isExisting: true,
        document: duplicateMeta.existing,
      }),
    ],
    entity,
  });
}

  async _pCleanExistingDocumentCollections ({document}) {
  const fields = Object.values(document.constructor.schema.fields)
    .filter((v) => v instanceof foundry.data.fields.EmbeddedCollectionField);

  for (const field of fields) {
    const toDelete = document[field.element.metadata.collection].map(it => it.id);
    if (!toDelete.length) continue;
    await UtilDocuments.pDeleteEmbeddedDocuments(
      document,
      toDelete,
      {ClsEmbed: CONFIG[field.element.metadata.name].documentClass},
    );
  }
}

_pImportEntry_pDoUpdateExisting_maintainImg ({duplicateMeta, docData}) {
  if (!duplicateMeta?.isOverwrite) return;

  const prevImg = Config.get("import", "isDuplicateHandlingMaintainImage") ? duplicateMeta.existing.img : null;
  if (prevImg != null) docData.img = prevImg;
}

/**
 * Import an entity to a directory
 * @param {any} toImport an entity in 5etools schema
 * @param {{filterValues:any, isAddDefaultOwnershipFromConfig:boolean, defaultOwnership:any, userOwnership:any, isTemp:boolean}} importOpts
 * @param {any} dataOpts
 * @param {{name:string}} docData existing doc data. If null, we will import
 * @param {boolean} isSkipDuplicateHandling
 * @returns {any}
 */
async _pImportEntry_pImportToDirectoryGeneric (toImport, importOpts, dataOpts = {}, {docData = null, isSkipDuplicateHandling = /*false*/ true /*TEMPFIX*/} = {}) {
  docData = docData || await this._pImportEntry_pImportToDirectoryGeneric_pGetImportableData(
    toImport,
    {
      isAddDataFlags: true,
      filterValues: importOpts.filterValues,
      ...dataOpts,
      isAddDefaultOwnershipFromConfig: importOpts.isAddDefaultOwnershipFromConfig ?? true,
      defaultOwnership: importOpts.defaultOwnership,
      userOwnership: importOpts.userOwnership,
    },
    importOpts,
  );

  //See if a duplicate already exists
  const duplicateMeta = isSkipDuplicateHandling ? null : this._getDuplicateMeta({
      name: docData.name,
      sourceIdentifier: UtilDocumentSource.getDocumentSourceIdentifierString({doc: docData}),
      flags: this._getDuplicateCheckFlags(docData),
      importOpts,
      entity: toImport,
  });

  //If duplicate exists, we might wanna skip, and not import it
  if (duplicateMeta?.isSkip) {
    return new ImportSummary({
      status: ConstsTaskRunner.TASK_EXIT_SKIPPED_DUPLICATE,
      imported: [
        new ImportedDocument({
          isExisting: true,
          document: duplicateMeta.existing,
        }),
      ],
      entity: toImport,
    });
  }

  
  console.log("DOC DATA", docData, toImport, importOpts, dataOpts);

  //Defined by foundry. Item, Journal, Scene, Cards, etc
  const Clazz = this._getDocumentClass();

  if (importOpts.isTemp) {
    const imported = await UtilDocuments.pCreateDocument(Clazz, docData, {isRender: false, isTemporary: true});
    return new ImportSummary({
      status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
      imported: [
        new ImportedDocument({
          document: imported,
        }),
      ],
      entity: toImport,
    });
  }

  //Try to import the document into a pack
  if (this._pack) {
    if (duplicateMeta?.isOverwrite) {
      return this._pImportEntry_pDoUpdateExistingPackEntity({
        entity: toImport,
        duplicateMeta,
        docData,
        importOpts,
      });
    }

    //Create a new document, using the foundry class as a template
    const instance = new Clazz(docData);
     //import the document into the pack
    const imported = await this._pack.importDocument(instance);

    await this._pImportEntry_pAddToTargetTableIfRequired([imported], duplicateMeta, importOpts);

    return new ImportSummary({
      status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
      imported: [
        new ImportedDocument({
          document: imported,
          pack: this._pack,
        }),
      ],
      entity: toImport,
    });
  }

  //Else, just try to import it into a directory
  return this._pImportEntry_pImportToDocData({
    duplicateMeta,
    docData,
    toImport,
    isSkipDuplicateHandling,
    Clazz,
    importOpts,
  });

  //Else, just try to import it into a directory
  return this._pImportEntry_pImportToDirectoryGeneric_toDirectory({
    duplicateMeta,
    docData,
    toImport,
    isSkipDuplicateHandling,
    Clazz,
    importOpts,
  });
}
/**
 * Import an entity to a directory
 * @param {{duplicateMeta:{isOverwrite:boolean}, docData:{name:string, pages:any, folder:any},
 * toImport:{any}, isSkipDuplicateHandling:boolean, Clazz:{any},
 * importOpts:{filterValues:any, isAddDefaultOwnershipFromConfig:boolean, defaultOwnership:any,
 * userOwnership:any, isTemp:boolean, isBatched:boolean}}}
 * @returns {ImportSummary}
 */
async _pImportEntry_pImportToDirectoryGeneric_toDirectory ({
    duplicateMeta,
    docData,
    toImport,
    isSkipDuplicateHandling = false,
    Clazz,
    folderType = null,
    importOpts,
}, ) {
  //Check if we are just doing an overwrite
  if (duplicateMeta?.isOverwrite) {
    return this._pImportEntry_pDoUpdateExistingDirectoryEntity({
      entity: toImport,
      duplicateMeta,
      docData,
    });
  }

  const folderIdMeta = await this._pImportEntry_pImportToDirectoryGeneric_pGetFolderIdMeta({
    toImport,
    importOpts,
    folderType,
  });

  if (folderIdMeta?.parentDocumentId) {
          return this._pImportEntry_pImportToDirectoryGeneric_toDirectorySubEntities({
      entity: toImport,
      parent: game.journal.get(folderIdMeta.parentDocumentId),
      folderIdMeta,
      isSkipDuplicateHandling,
      embeddedDocDatas: docData.pages,
      ClsEmbed: JournalEntryPage,
      importOpts,
    });
  }

  if (folderIdMeta?.folderId) docData.folder = folderIdMeta.folderId;

  const imported = await UtilDocuments.pCreateDocument(Clazz, docData, {isTemporary: false, isRender: !importOpts.isBatched});

  return new ImportSummary({
    status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
    imported: [
      new ImportedDocument({
        document: imported,
      }),
    ],
    entity: toImport,
  });
}
/**
 * Import an entity and just return it to us raw, without creating a document for it
 * @param {{duplicateMeta:{isOverwrite:boolean}, docData:{name:string, pages:any, folder:any},
* toImport:{any}, isSkipDuplicateHandling:boolean, Clazz:{any},
* importOpts:{filterValues:any, isAddDefaultOwnershipFromConfig:boolean, defaultOwnership:any,
* userOwnership:any, isTemp:boolean, isBatched:boolean}}}
* @returns {ImportSummary}
*/
async _pImportEntry_pImportToDocData ({
   duplicateMeta,
   docData,
   toImport,
   isSkipDuplicateHandling = false,
   Clazz,
   folderType = null,
   importOpts,
}, ) {

 return new ImportSummary({
  status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
  imported: [
    /* new ImportedDocument({
      document: imported,
    }), */
    docData
  ],
  entity: toImport,
});

 const imported = await UtilDocuments.pCreateDocument(Clazz, docData, {isTemporary: false, isRender: !importOpts.isBatched});

 return new ImportSummary({
   status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
   imported: [
     new ImportedDocument({
       document: imported,
     }),
   ],
   entity: toImport,
 });
}

async _pImportEntry_pImportToDirectoryGeneric_pGetFolderIdMeta (
  {
    toImport,
    importOpts,
    folderType = null,
  },
) {
  folderType = folderType || this.constructor.FOLDER_TYPE;

      if (this._container) return new FolderIdMeta();

  return importOpts.isImportToTempDirectory
    ? new FolderIdMeta({folderId: await UtilFolders.pCreateTempFolderGetId({folderType})})
    : importOpts.folderId !== undefined
      ? new FolderIdMeta({folderId: importOpts.folderId})
      : this._pImportEntry_pGetFolderIdMeta(
        toImport,
        {
          isAddDefaultOwnershipFromConfig: importOpts.isAddDefaultOwnershipFromConfig ?? true,
          defaultOwnership: importOpts.defaultOwnership,
          userOwnership: importOpts.userOwnership,
          isBatched: importOpts.isBatched,
          folderType,
        },
      );
}

async _pImportEntry_pImportToDirectoryGeneric_toDirectorySubEntities (
  {
    entity,
    parent,
    isSkipDuplicateHandling,
    embeddedDocDatas,
    ClsEmbed,
    importOpts,
  },
) {
  importOpts ||= new ImportOpts();

  const duplicateMetasSub = isSkipDuplicateHandling
    ? {toCreates: embeddedDocDatas, toUpdates: []}
    : this._getDuplicateMetasSub({parent, children: embeddedDocDatas, importOpts});

  const importedDocuments = [];

  if (duplicateMetasSub.toCreates.length) {
    const importedEmbeds = await UtilDocuments.pCreateEmbeddedDocuments(
      parent,
      duplicateMetasSub.toCreates,
      {
        ClsEmbed,
        isRender: !importOpts.isBatched,
      },
    );

    importedDocuments.push(
      ...importedEmbeds.map(it => new ImportedDocument({embeddedDocument: it?.document})),
    );
  }

      if (duplicateMetasSub.toUpdates.length) {
    const importedEmbeds = await UtilDocuments.pUpdateEmbeddedDocuments(
      parent,
      duplicateMetasSub.toUpdates,
      {
        ClsEmbed,
      },
    );

    importedDocuments.push(
      ...importedEmbeds.map(it => new ImportedDocument({embeddedDocument: it?.document, isExisting: true})),
    );
  }

  return new ImportSummary({
    status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
    imported: importedDocuments,
    entity,
  });
}

_getDocumentClass () {
  switch (this._gameProp) {
    case "items": return CONFIG.Item.documentClass;
    case "journal": return CONFIG.JournalEntry.documentClass;
    case "tables": return CONFIG.RollTable.documentClass;
    case "scenes": return CONFIG.Scene.documentClass;
    case "cards": return CONFIG.Cards.documentClass;
  }
  throw new Error(`Unhandled game prop "${this._gameProp}"`);
}

async _pImportEntry_pAddToTargetTableIfRequired (fvttEntities, duplicateMeta, importOpts) {
  if (!this._table) return;

      const isFilterRows = duplicateMeta?.mode === ConfigConsts.C_IMPORT_DEDUPE_MODE_SKIP
          || duplicateMeta?.isOverwrite;

  fvttEntities = isFilterRows
    ? fvttEntities.filter(fvttEntity => !this._table.results.some(it => it.documentId === fvttEntity.id))
    : fvttEntities;
  if (!fvttEntities.length) return;

  const rangeLowHigh = DataConverterTable.getMaxTableRange(this._table) + 1;
  await UtilDocuments.pCreateEmbeddedDocuments(
    this._table,
    await fvttEntities.pSerialAwaitMap(fvttEntity => DataConverterTable.pGetTableResult({
      type: CONST.TABLE_RESULT_TYPES.COMPENDIUM,
      text: fvttEntity.name,
      documentId: fvttEntity.id,
      collection: this._pack.collection,
      rangeExact: rangeLowHigh,
      img: fvttEntity.img,
    })),
    {
      ClsEmbed: TableResult,
      isRender: !importOpts.isBatched,
    },
  );
}

  _pImportEntry_pImportToDirectoryGeneric_pGetImportableData (ent, getItemOpts, importOpts) {
  return this.constructor._DataConverter.pGetDocumentJson(
    ent,
    {
      actor: this._actor,
      containerId: this._container?.id,
      taskRunner: importOpts.taskRunner,
      actorMultiImportHelper: importOpts.actorMultiImportHelper,
      ...getItemOpts,
    },
  );
}

_getAsTag (listItem) {
  const tag = Parser.getPropTag(this._content[listItem.ix].__prop);
  const ptId = DataUtil.generic.packUid(this._content[listItem.ix], tag);
  return `@${tag}[${ptId}]`;
}
}
ImportList._STO_K_FOLDER_PATH_SPEC = "ImportList.folderKeyPathSpec";
ImportList._suppressCreateSheetItemHookTimeStart = null;

class ImportListItem extends ImportList {
  static init () {
  this._initCreateSheetItemHook({
    prop: "item",
    importerName: "Item",
  });
}

static get ID () { return "items"; }
static get DISPLAY_NAME_TYPE_PLURAL () { return "Items"; }
static get PROPS () { return ["item"]; }

//static _ = ImplementationRegistryImportList.get().register(this);

_titleSearch = "item";
_sidebarTab = "items";
_gameProp = "items";
_defaultFolderPath = ["Items"];
/* _pageFilter = new PageFilterItems({
  filterOpts: {
    "Category": {
      deselFn: (it) => it === "Generic Variant",
    },
  },
}); */
_page = UrlUtil.PG_ITEMS;
_isPreviewable = true;
_configGroup = "importItem";
_namespace = "item";
//_fnListSort = PageFilterItems.sortItems;
_pFnGetFluff = Renderer.item.pGetFluff.bind(Renderer.item);
//_ClsCustomizer = ImportCustomizerItem;
static _DataConverter = DataConverterItem;
//static _DataPipelinesList = DataPipelinesListItem;

_colWidthName = 3;
_colWidthSource = 1;

_getData_cols_other () {
  return [
    {
      name: "Type",
      width: "3-2",
      field: "type",
    },
    {
      name: "Cost",
      width: "1-4",
      field: "cost",
      rowClassName: "ve-text-center",
    },
    {
      name: "Weight",
      width: "1-4",
      field: "weight",
      rowClassName: "ve-text-center",
    },
    {
      name: "A.",
      width: "0-5",
      field: "attunement",
      rowClassName: "ve-text-center",
    },
    {
      name: "Rarity",
      width: "1-5",
      field: "rarity",
      rowClassName: "ve-text-center",
    },
  ];
}

_getData_row_mutGetAdditionalValues ({it, ix}) {
      it._vType = it._typeListText.join(", ").uppercaseFirst();
  
  return {
    type: it._vType,
    cost: it.value || it.valueMult ? Parser.itemValueToFull(it, {isShortForm: true}).replace(/ +/g, "\u00A0") : "\u2014",
    weight: Parser.itemWeightToFull(it, true),
    rarity: (it.rarity || "Unknown").toTitleCase(),
    attunement: it._attunementCategory === VeCt.STR_NO_ATTUNEMENT ? "" : "×",
  };
}

getData () {
  return {
    ...super.getData(),
    buttonsAdditional: [
      {
        name: "btn-run-mods",
        text: "Customize and Import...",
      },
    ],
  };
}

_renderInner_absorbListItems_fnGetValues (it) {
  return {
    ...super._renderInner_absorbListItems_fnGetValues(it),
    type: it._vType,
    cost: it.value || 0,
    rarity: it.rarity,
    attunement: it._attunementCategory !== VeCt.STR_NO_ATTUNEMENT,
    weight: Parser.weightValueToNumber(it.weight),
  };
}

async pInit () {
  if (await super.pInit()) return true;

  await Renderer.item.pPopulatePropertyAndTypeReference();
}

getFolderPathMeta () {
  return {
    ...super.getFolderPathMeta(),
    rarity: {
      label: "Rarity",
      getter: it => ((!it.rarity || it.rarity === "Unknown") ? "Unknown Rarity" : it.rarity).toTitleCase(),
    },
    type: {
      label: "Type",
      getter: it => {
        if (it.type) return Renderer.item.getItemTypeName(it.type).toTitleCase();
        else if (it.typeText) return it.typeText;
        else if (it.wondrous) return "Wondrous Item";
        else if (it.poison) return "Poison";
        else return "Unknown Type";
      },
    },
  };
}

async _pImportEntry_preImport ({ent, importOpts, dataOpts}) {
  await this._pImportEntry_pDoLoadPrereleaseMeta(ent);
  await this._pImportEntry_pDoLoadBrewMeta(ent);
}

async _pImportEntry_pDoLoadPrereleaseMeta (item) {
  return this._pImportEntry_pDoLoadPrereleaseBrewMeta({item, brewUtil: PrereleaseUtil, sourceIndex: UtilPrereleaseBrewIndices.PRERELEASE_INDEX__SOURCE, configKey: "basePrereleaseUrl"});
}

async _pImportEntry_pDoLoadBrewMeta (item) {
  return this._pImportEntry_pDoLoadPrereleaseBrewMeta({item, brewUtil: BrewUtil2, sourceIndex: UtilPrereleaseBrewIndices.BREW_INDEX__SOURCE, configKey: "baseBrewUrl"});
}

  async _pImportEntry_pDoLoadPrereleaseBrewMeta ({item, brewUtil, sourceIndex, configKey}) {
  if (brewUtil.hasSourceJson(item.source)) return;
  if (SourceUtil.isSiteSource(item.source)) return;

  if (!sourceIndex[item.source]) return;
  const url = DataUtil.brew.getFileUrl(sourceIndex[item.source], Config.get("dataSources", configKey));
  await brewUtil.pAddBrewFromUrl(url);

      await Renderer.item.pGetSiteUnresolvedRefItemsFromPrereleaseBrew({brewUtil, brew: await DataUtil.loadJSON(url)});
}

_isPackSplitImport (item) {
  return item.packContents
    && Config.get(this._configGroup, "isSplitPacksActor")
    && (!item.atomicPackContents || Config.get(this._configGroup, "isSplitAtomicPacksActor"));
}

async _pImportEntry_pImportToActor (item, importOpts, opts, {docData = null} = {}) {
  opts = {...opts, isActorItem: true};

  opts.filterValues = importOpts.filterValues;

      opts.sheetItemsAmmo = this._pImportEntry_getSheetItemsAmmo(item);

  let importedDocuments;
  if (docData) {
    if (this._container) MiscUtil.set(docData, "system", "container", this._container.id);
    const importedDocument = await this._pImportEntry_pImportToActor_pAddItem({item, itemData: docData, importOpts});
    importedDocuments = [importedDocument];
  } else if (this._isPackSplitImport(item)) {
    importedDocuments = await this._pImportEntry_pImportToActor_pImportPackItem(item, importOpts, opts);
  } else {
    const itemData = await DataConverterItem.pGetDocumentJson(
      item,
      {
        ...opts,
        containerId: this._container?.id,
        ability: this._getAbilityScoreOverride_actorClass(item),
        taskRunner: importOpts.taskRunner,
        actorMultiImportHelper: importOpts.actorMultiImportHelper,
      },
    );
    const importedDocument = await this._pImportEntry_pImportToActor_pAddItem({item, itemData, importOpts});
    importedDocuments = [importedDocument];
  }

      await this._pImportEntry_pImportToActor_pAddSubEntities({ent: item, importOpts});

  if (this._actor.isToken) this._actor.sheet.render();

  return new ImportSummary({
    status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
    imported: importedDocuments,
    entity: item,
  });
}

static _RE_ABILITY_SCORE_OVERRIDE_ACTOR_CLASS = /^(?<idClass>[^:]+):(?<nameItem>.*?):(?<ability>str|dex|con|int|wis|cha)$/i;

_getAbilityScoreOverride_actorClass (item) {
  if (!this._actor) return null;

  const classKeys = new Set(Object.keys(this._actor.classes || {}));
  if (!classKeys.size) return null;

  const raw = Config.get("importItem", "altAbilityScoreByClass");
  if (!raw?.length) return null;

  return raw
    .map(it => this.constructor._RE_ABILITY_SCORE_OVERRIDE_ACTOR_CLASS.exec(it))
    .filter(Boolean)
    .map(m => ({
      identifierCls: m.groups.idClass.toLowerCase().trim(),
      name: m.groups.nameItem.toLowerCase().trim(),
      ability: m.groups.ability,
    }))
    .filter(({identifierCls}) => classKeys.has(identifierCls))
    .mergeMap(({name, ability}) => ({[name]: ability}))[item.name.toLowerCase()];
}

async _pGetPackItemMetas (item, importOpts, opts) {
  const packErrors = [];

  const packContentsItems = (
    await item.packContents.pMap(async (it, i) => {
                      const containerId = i === 0 ? this._container?.id : null;

      const quantity = it.quantity || 1;

      if (it.item || typeof it === "string") {
        let [name, source] = (it.item || it).split("|");
        if (!source) source = Parser.SRC_DMG;
        const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS]({name, source});

        const packItem = await DataLoader.pCacheAndGet(UrlUtil.PG_ITEMS, source, hash, {isCopy: true});

        if (it.displayName) packItem._displayName = it.displayName;

        return {
          item: packItem,
          itemData: await DataConverterItem.pGetDocumentJson(
            packItem,
            {
              filterValues: importOpts.filterValues,
              ...opts,
              quantity,
              containerId,
              ability: this._getAbilityScoreOverride_actorClass(item),
              taskRunner: importOpts.taskRunner,
              actorMultiImportHelper: importOpts.actorMultiImportHelper,
            },
          ),
        };
      }

      if (it.special) {
        const fauxItem = {
          name: it.special.toTitleCase(),
          type: Parser.ITM_TYP__ADVENTURING_GEAR,
          source: item.source,
          page: item.page,
          srd: item.srd,
          rarity: "none",
        };
        Renderer.item.enhanceItem(fauxItem);

        return {
          item: fauxItem,
          itemData: await DataConverterItem.pGetDocumentJson(
            fauxItem,
            {
              filterValues: importOpts.filterValues,
              ...opts,
              quantity,
              containerId,
              ability: this._getAbilityScoreOverride_actorClass(item),
              taskRunner: importOpts.taskRunner,
              actorMultiImportHelper: importOpts.actorMultiImportHelper,
            },
          ),
        };
      }

      packErrors.push(`Unhandled pack contents type "${JSON.stringify(it)}"`);
    })
  )
    .filter(Boolean);

  if (packErrors.length) {
    ui.notifications.error(`Item "${item.name}" (from "${Parser.sourceJsonToAbv(item.source)}") could not be broken down into constituent items! ${VeCt.STR_SEE_CONSOLE}`);
    console.error(...LGT, `Error(s) when breaking ${item.name} (${item.source}) into constituent items: ${packErrors.join("; ")}`);
  }

  return packContentsItems;
}

async _pImportEntry_pImportToActor_pImportPackItem (item, importOpts, opts) {
  const packItemMetas = await this._pGetPackItemMetas(item, importOpts, opts);

              const importedDocs = [];
  let containerIdLast = null;

  for (const {item, itemData} of packItemMetas) {
    if (containerIdLast) MiscUtil.set(itemData, "system", "container", containerIdLast);

    const importedDoc = await this._pImportEntry_pImportToActor_pAddItem({item, itemData, importOpts});
    importedDocs.push(importedDoc);

                      const docImported = importedDoc.getPrimaryDocument();
    if (docImported?.type === "container") containerIdLast = docImported.id;
  }

  return importedDocs;
}

async _pImportEntry_pImportToActor_pAddItem ({item, itemData, importOpts}) {
  const importedDocument = await this._pImportEntry_pImportToActor_pAddOrUpdateItem({item, itemData, importOpts});
  return this._pImportEntry_pImportToActor_pUpdateItemPostAdd({itemData, importedDocument});
}

async _pImportEntry_pImportToActor_pAddOrUpdateItem ({item, itemData, importOpts}) {
  const existingCurrencyItem = this._pImportEntry_pImportToActor_getExistingCurrencyItem({itemData});
  if (existingCurrencyItem) {
    const update = {
      _id: existingCurrencyItem.id,
      system: {
        description: itemData.system.description,
        weight: itemData.system.weight,
        price: itemData.system.price,
      },
      flags: {
        [SharedConsts.MODULE_ID]: itemData.flags[SharedConsts.MODULE_ID],
      },
    };

    const embeddedDocument = (await UtilDocuments.pUpdateEmbeddedDocuments(this._actor, [update], {ClsEmbed: Item}))[0].document;
    return new ImportedDocument({
      name: item.name,
      actor: this._actor,
      embeddedDocument,
      isExisting: true,
    });
  }

  const existingItem = this._pImportEntry_pImportToActor_getExistingStackableItem({item, itemData});
  if (existingItem) {
    const update = {
      _id: existingItem.id,
      system: {
        quantity: (existingItem.system.quantity || 0)
          + (itemData.system.quantity || 0),
      },
    };

    const embeddedDocument = (await UtilDocuments.pUpdateEmbeddedDocuments(this._actor, [update], {ClsEmbed: Item}))[0].document;
    return new ImportedDocument({
      name: item.name,
      actor: this._actor,
      embeddedDocument,
      isExisting: true,
    });
  }

  const embeddedDocument = (await UtilDocuments.pCreateEmbeddedDocuments(
    this._actor,
    [itemData],
    {ClsEmbed: Item, isRender: !importOpts.isBatched},
  ))[0].document;
  return new ImportedDocument({
    name: item.name,
    actor: this._actor,
    embeddedDocument,
  });
}

_pImportEntry_pImportToActor_getExistingCurrencyItem ({itemData = null, isForce = false}) {
  if (!isForce && itemData?.flags?.[SharedConsts.MODULE_ID]?.type !== DataConverterItem.FLAG_TYPE__CURRENCY) return null;

      return this._actor.items.contents
    .find(sheetItem => {
      return sheetItem.flags?.[SharedConsts.MODULE_ID]?.type === DataConverterItem.FLAG_TYPE__CURRENCY
        && sheetItem.flags?.[SharedConsts.MODULE_ID]?.currency
        && MiscUtil.isNearStrictlyEqual(sheetItem.system.container, this._container?.id);
    });
}

_pImportEntry_pImportToActor_getExistingStackableItem ({item, itemData}) {
  if (Config.get("importItem", "inventoryStackingMode") === ConfigConsts.C_ITEM_ATTUNEMENT_NEVER) return null;

      const matchingItem = null; /* this._actor.items.contents.find(sheetItem => {
    if (sheetItem.type !== itemData.type) return false;

    if (!MiscUtil.isNearStrictlyEqual(sheetItem.system.container, this._container?.id)) return false;

    const isMatchingSource = !Config.get("import", "isStrictMatching")
      || (UtilDocumentSource.getDocumentSource(sheetItem).source || "").toLowerCase() === (UtilDocumentSource.getDocumentSource(itemData).source || "").toLowerCase();
    if (!isMatchingSource) return false;

    if (sheetItem.name.toLowerCase().trim() === itemData.name.toLowerCase().trim()) return true;

    return UtilEntityItem.getEntityAliases(item, {isStrict: true})
      .some(entAlias => entAlias.name.toLowerCase().trim() === sheetItem.name.toLowerCase().trim());
  }); */
  if (!matchingItem) return null;

  if (Config.get("importItem", "inventoryStackingMode") === ConfigConsts.C_ITEM_ATTUNEMENT_ALWAYS) return matchingItem;

  if (
    Config.get("importItem", "inventoryStackingMode") === ConfigConsts.C_ITEM_ATTUNEMENT_SMART
    && (
      this._pImportEntry_pImportToActor_isThrowableItem({itemData})
      || this._pImportEntry_pImportToActor_isSmartStackableItem({itemData})
    )
  ) return matchingItem;

  return null;
}

_pImportEntry_pImportToActor_isThrowableItem ({itemData}) {
  const throwableSet = new Set((Config.get(this._configGroup, "throwables") || []).map(it => it.trim().toLowerCase()));
  return throwableSet.has((itemData.name || "").toLowerCase().trim());
}

_pImportEntry_pImportToActor_isSmartStackableItem ({itemData}) {
  return new Set(DataConverterItem.STACKABLE_FOUNDRY_ITEM_TYPES_IMPORT).has(itemData.type);
}

async _pImportEntry_pImportToActor_pUpdateItemPostAdd ({itemData, importedDocument}) {
      if (
    this._pImportEntry_pImportToActor_isThrowableItem({itemData})
                && (0 === 1)
  ) {
    await UtilDocuments.pUpdateEmbeddedDocuments(
      this._actor,
      [
        {
          _id: importedDocument.embeddedDocument.id,
          system: {
            consume: {
              type: "ammo",
              target: importedDocument.embeddedDocument.id,
              amount: 1,
            },
          },
        },
      ],
      {
        ClsEmbed: Item,
      },
    );
  }

  return importedDocument;
}

_pImportEntry_getSheetItemsAmmo (item) {
  if (!item.ammoType) return null;
  if (!this._actor) return null;
  return this._actor.items.filter(it => it.type === "consumable" && it.system.consumableType === "ammo");
}

static sortEntries (a, b) {
          if (a.ammoType && !b.ammoType) return 1;
  if (!a.ammoType && b.ammoType) return -1;
  return SortUtil.ascSortLower(a.name, b.name) || SortUtil.ascSortLower(Parser.sourceJsonToFull(a.source), Parser.sourceJsonToFull(b.source));
}

    async pImportCurrency (currency, importOpts) {
  importOpts ||= new ImportOpts();

  console.log(...LGT, `Importing currency "${Parser.getDisplayCurrency(currency)}"`);

  const fauxItem = {name: "Currency", source: VeCt.STR_GENERIC, rarity: "none"};

  const existingCurrencyItem = this._actor ? this._pImportEntry_pImportToActor_getExistingCurrencyItem({isForce: true}) : null;

  if (!existingCurrencyItem) {
    const itemData = await DataConverterItem.pGetCurrencyItem(
      currency,
      {
        isAddDefaultOwnershipFromConfig: importOpts.isAddDefaultOwnershipFromConfig ?? !this._actor,
        defaultOwnership: importOpts.defaultOwnership,
        userOwnership: importOpts.userOwnership,
      },
    );

    if (importOpts.isTemp) return this._pImportEntry_pImportToDirectoryGeneric(fauxItem, importOpts, null, {docData: itemData, isSkipDuplicateHandling: true});
    if (this._actor) return this._pImportEntry_pImportToActor(fauxItem, importOpts, null, {docData: itemData});
    return this._pImportEntry_pImportToDirectoryGeneric(fauxItem, importOpts, null, {docData: itemData, isSkipDuplicateHandling: true});
  }

      const itemData = await DataConverterItem.pGetCurrencyItem(
    CurrencyUtil.getCombinedCurrency(currency, existingCurrencyItem.flags[SharedConsts.MODULE_ID].currency),
    {
      isAddDefaultOwnershipFromConfig: importOpts.isAddDefaultOwnershipFromConfig ?? !this._actor,
      defaultOwnership: importOpts.defaultOwnership,
      userOwnership: importOpts.userOwnership,
    },
  );
  return this._pImportEntry_pImportToActor(fauxItem, importOpts, null, {docData: itemData});
}
}

var ImportListItem$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ImportListItem: ImportListItem
});

class ImportListCharacter extends ImportList {
	async _pApplyAllAdditionalSpellsToActor ({entity, importOpts, dataBuilderOpts}) {
		const formData = await Charactermancer_AdditionalSpellsSelect.pGetUserInput({
			additionalSpells: entity.additionalSpells,
			sourceHintText: entity.name,
			modalFilterSpells: await Charactermancer_AdditionalSpellsSelect.pGetInitModalFilterSpells(),

						curLevel: 0,
			targetLevel: Consts.CHAR_MAX_LEVEL,
			spellLevelLow: 0,
			spellLevelHigh: 9,
		});

		if (formData == null) {
			dataBuilderOpts.isCancelled = true;
			return null;
		}
		if (formData === VeCt.SYM_UI_SKIP) return null;

		return Charactermancer_AdditionalSpellsSelect.pApplyFormDataToActor(
			this._actor,
			formData,
			{
				taskRunner: importOpts.taskRunner,
				actorMultiImportHelper: importOpts.actorMultiImportHelper,
			},
		);
	}

	_applyAdditionalSpellImportSummariesToTagHashItemIdMap ({tagHashItemIdMap, importSummariesAdditionalSpells}) {
		if (!importSummariesAdditionalSpells) return;

		importSummariesAdditionalSpells
			.forEach(importSummary => {
				if (!importSummary.entity) return;

				const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_SPELLS](importSummary.entity);
				MiscUtil.set(tagHashItemIdMap, "spell", hash, importSummary.getPrimaryDocument().id);
			});
	}

	
			async _pDoMergeAndApplyActorUpdate (actorUpdate) {
		if (!Object.keys(actorUpdate).length) return;

		this._doMergeExistingSkillToolData({actorUpdate, propActorData: "skills"});
		this._doMergeExistingSkillToolData({actorUpdate, propActorData: "tools"});
		this._doMergeExistingOtherProficiencyData({actorUpdate});
		this._doMergeExistingDiDrDvCiData({actorUpdate});
		await UtilDocuments.pUpdateDocument(this._actor, actorUpdate);
	}

	_doMergeExistingSkillToolData ({actorUpdate, prop}) {
		if (!actorUpdate?.system?.[prop]) return;
		Object.entries(actorUpdate.system[prop])
			.forEach(([abv, meta]) => {
				meta.value = Math.max(this._actor._source?.system?.[prop]?.[abv]?.value, meta.value, 0);
			});
	}

	_doMergeExistingOtherProficiencyData ({actorUpdate}) {
		const actorDataPaths = [
			["system", "traits", "languages"],
			["system", "traits", "weaponProf"],
			["system", "traits", "armorProf"],
		];
		return this._doMergeExistingGenericTraitsData({actorUpdate, actorDataPaths});
	}

	_doMergeExistingDiDrDvCiData ({actorUpdate}) {
		const actorDataPaths = [
			["system", "traits", "di"],
			["system", "traits", "dr"],
			["system", "traits", "dv"],
			["system", "traits", "ci"],
		];
		return this._doMergeExistingGenericTraitsData({actorUpdate, actorDataPaths});
	}

	_doMergeExistingGenericTraitsData ({actorUpdate, actorDataPaths}) {
		actorDataPaths.forEach(actorDataPath => {
			const actorUpdatePath = actorDataPath.slice(1);
			const fromActor = MiscUtil.get(this._actor, "_source", ...actorDataPath);
			const fromUpdate = MiscUtil.get(actorUpdate, ...actorUpdatePath);
			if (!fromActor && !fromUpdate) return;
			if (!fromActor && fromUpdate) return;
			if (fromActor && !fromUpdate) return MiscUtil.set(actorUpdate, ...actorUpdatePath, MiscUtil.copyFast(fromActor));

			if (fromActor.value && fromUpdate.value) {
				MiscUtil.set(actorUpdate, ...actorUpdatePath, "value", [...new Set([...fromActor.value, ...fromUpdate.value])]);
			} else {
				MiscUtil.set(actorUpdate, ...actorUpdatePath, "value", MiscUtil.copyFast(fromActor.value || fromUpdate.value));
			}

			if (fromActor.custom && fromActor.custom.trim().length && fromUpdate.custom && fromUpdate.custom.trim().length) {
				const allCustom = fromActor.custom.trim().split(";").map(it => it.trim()).filter(Boolean);
				fromUpdate.custom.trim().split(";")
					.map(it => it.trim())
					.filter(Boolean)
					.filter(it => !allCustom.some(ac => ac.toLowerCase() === it.toLowerCase()))
					.forEach(it => allCustom.push(it));

				MiscUtil.set(actorUpdate, ...actorUpdatePath, "custom", allCustom.join(";"));
			} else {
				MiscUtil.set(actorUpdate, ...actorUpdatePath, "custom", fromActor.custom || fromUpdate.custom);
			}
		});
	}
	
	async _pImportActorAdditionalFeats (ent, importOpts, dataBuilderOpts) {
		if (!ent.feats) return;

		const formData = await Charactermancer_AdditionalFeatsSelect.pGetUserInput({available: ent.feats, actor: this._actor});
		if (!formData) return dataBuilderOpts.isCancelled = true;
		if (formData === VeCt.SYM_UI_SKIP) return;

		if (!(formData.data || []).length) return;

		const {ImportListFeat} = await Promise.resolve().then(function () { return ImportListFeat$1; });
		const importListFeat = new ImportListFeat({actor: this._actor});
		await importListFeat.pInit();

		for (const {page, source, hash} of (formData.data || [])) {
			const feat = await DataLoader.pCacheAndGet(page, source, hash);
			await importListFeat.pImportEntry(feat, importOpts);
		}
	}
}

ImportListCharacter.ImportEntryOpts = class {
	constructor (opts) {
		opts = opts || {};

		this.isCharactermancer = !!opts.isCharactermancer;

		this.isCancelled = false;

		this.items = [];
		this.effects = [];
		this.equipmentItemEntries = []; 	}
};

var ImportListCharacter$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ImportListCharacter: ImportListCharacter
});


class ImplementationRegistryBase {
	static _INSTANCE;

	static get () {
		this._INSTANCE ||= new this();
		return this._INSTANCE;
	}

	
	_impls = new Map();

	register (id, impl) {
		if (!id) throw new Error(`Implementation did not have an ID!`);
		if (!impl) throw new Error(`An implementation must be provided!`);

		if (this._impls.has(id)) throw new Error(`Duplicate implementation registered for ID "${id}"!`);

		this._impls.set(id, impl);
	}

	getImplementations () {
		return [...this._impls.values()];
	}
}
class ImplementationRegistryImportList extends ImplementationRegistryBase {
	register (Impl) {
		super.register(Impl.ID, Impl);
	}
}
class ImplementationRegistryDataPipelinesList extends ImplementationRegistryBase {
	register (impl) {
		super.register(impl.name, impl);
	}
}
//#region DataSource
class DataSourceBase {
  constructor (opts = {}) {
  this._brewUtil = opts.brewUtil;
  this._isAutoDetectPrereleaseBrew = !!opts.isAutoDetectPrereleaseBrew;
  this._isExistingPrereleaseBrew = !!opts.isExistingPrereleaseBrew;
}

get identifier () { throw new Error(`Unimplemented!`); }

  async pGetOutputs ({uploadedFileMetas, customUrls}) { throw new Error("Unimplemented!"); }

async _pGetBrewUtil (...args) {
  if (this._brewUtil) return this._brewUtil;
  if (!this._isAutoDetectPrereleaseBrew) return null;
  return this._pGetBrewUtilAutodetected(...args);
}

  async _pGetBrewUtilAutodetected (...args) { throw new Error("Unimplemented!"); }
}
class DataSourceSpecial extends DataSourceBase {
  get identifier () { return this._cacheKey; }

  get _cacheKey () { throw new Error(`Unimplemented!`); }

  async _pGet () {
  throw new Error("Unimplemented!");
}

async pGetOutputs ({uploadedFileMetas, customUrls}) {
  let loadedData;
  try {
    loadedData = await this.constructor._pGetWithCache(this);
  } catch (e) {
    ui.notifications.error(`Failed to load pre-defined source "${this._cacheKey}"! ${VeCt.STR_SEE_CONSOLE}`);
    throw e;
  }

  return new DataSourceOutputs({
    cacheKeys: [this._cacheKey],
    contents: [loadedData],
  });
}

async _pGetBrewUtilAutodetected (...args) { throw new Error("Unimplemented!"); }


static _CACHE = {};

static async _pGetWithCache (source) {
  if (!source._cacheKey) return source._pGet();

  this._CACHE[source._cacheKey] ||= source._pGet();

  return this._CACHE[source._cacheKey];
}
}
class DataSourceGenericOfficialAllSpecial extends DataSourceSpecial {
	constructor () {
		super(
			{
				filterTypes: [DataPipelineConsts.SOURCE_TYP_OFFICIAL_ALL],
				isDefault: true,
			},
		);
	}
}
class DataSourceClassOfficialAll extends DataSourceGenericOfficialAllSpecial {
	get _cacheKey () { return "5etools-classes"; }

	async _pGet () {
		return Vetools.pGetClasses();
	}
}
class DataSourceClassSubclassFeatureOfficialAll extends DataSourceGenericOfficialAllSpecial {
	get _cacheKey () { return "5etools-class-subclass-features"; }

	async _pGet () {
		return Vetools.pGetClassSubclassFeatures();
	}
}
//#endregion
//#region DataPipelineConfig
class DataPipelineConfig {
  _DIRS_HOMEBREW = null;

_ClsDataSourceOfficialAll = null;
_ClsDataSourceOfficial = null;

_ClsDataPostLoader = null;
_ClsDataPostLoaderOfficial = null;
_ClsDataPostLoaderPrereleaseBrew = null;
_ClsDataPostLoaderPrerelease = null;
_ClsDataPostLoaderBrew = null;

  get DIRS_HOMEBREW () { return this._DIRS_HOMEBREW; }

  get ClsDataSourceOfficialAll () { return this._ClsDataSourceOfficialAll; }
  get ClsDataSourceOfficial () { return this._ClsDataSourceOfficial; }

  get ClsDataPostLoader () { return this._ClsDataPostLoader; }
  get ClsDataPostLoaderOfficial () { return this._ClsDataPostLoaderOfficial || this._ClsDataPostLoader; }
  get ClsDataPostLoaderPrereleaseBrew () { return this._ClsDataPostLoaderPrereleaseBrew || this._ClsDataPostLoader; }
  get ClsDataPostLoaderPrerelease () { return this._ClsDataPostLoaderPrerelease || this._ClsDataPostLoader; }
  get ClsDataPostLoaderBrew () { return this._ClsDataPostLoaderBrew || this._ClsDataPostLoader; }
}
class DataPipelineConfigClass extends DataPipelineConfig {
	_DIRS_HOMEBREW = ["class", "subclass"];

	_ClsDataSourceOfficialAll = DataSourceClassOfficialAll;
}
const CONFIG_CLASS = new DataPipelineConfigClass();
class DataPipelineConfigClassSubclassFeature extends DataPipelineConfig {
	_DIRS_HOMEBREW = ["classFeature", "subclassFeature"];

	_ClsDataSourceOfficialAll = DataSourceClassSubclassFeatureOfficialAll;
}
const CONFIG_CLASS_SUBCLASS_FEATURE = new DataPipelineConfigClassSubclassFeature();
//#endregion
//#region DataPipelinesList
class DataPipelinesListBase {
	static async pGetPipelines ({isApplyWorldDataSourceFilter = true} = {}) {
		return (await this._pGetPipelines())
			.filter(pipeline => !isApplyWorldDataSourceFilter || !UtilWorldDataSourceSelector.isFiltered(pipeline));
	}

	static get NAME () {
		const propApprox = this.name.replace("DataPipelinesList", "").lowercaseFirst();
		return Parser.getPropDisplayName(propApprox);
	}

	static get ID () {
		return this.name;
	}

	
		static async _pGetPipelines () {
		return [
			...await this._pGetPipelinesOfficialAll(),
			...await this._pGetPipelinesCustomUrl(),
			...await this._pGetPipelinesUploadFile(),
			...await this._pGetPipelinesOfficial(),
			...await this._pGetPipelinesPrerelease(),
			...await this._pGetPipelinesBrew(),
		];
	}

	
		static _CONFIG;

		static async _pGetPipelinesOfficialAll () { return []; }

		static async _pGetPipelinesOfficial () { return []; }

		static async _pGetPipelinesCustomUrl () {
		return [
			new DataPipeline({
				name: "Custom URL",
				filterTypes: [DataPipelineConsts.SOURCE_TYP_CUSTOM],

				dataSource: new DataSourceUrlCustom(
					{
						isAutoDetectPrereleaseBrew: true,
					},
				),
				DataPostLoader: this._CONFIG.ClsDataPostLoaderPrereleaseBrew,
			}),
		];
	}

		static async _pGetPipelinesUploadFile () {
		return [
			new DataPipeline({
				name: "Upload File",
				filterTypes: [DataPipelineConsts.SOURCE_TYP_CUSTOM],

				dataSource: new DataSourceFile(
					{
						isAutoDetectPrereleaseBrew: true,
					},
				),
				DataPostLoader: this._CONFIG.ClsDataPostLoaderPrereleaseBrew,
			}),
		];
	}

		static async _pGetPipelinesPrerelease () {
		if (!this._CONFIG.DIRS_HOMEBREW?.length) return [];

		return this._pGetSourcesPrereleaseBrew({
			brewUtil: PrereleaseUtil,
			localSources: await Vetools.pGetLocalPrereleaseSources(...this._CONFIG.DIRS_HOMEBREW),
			sources: await Vetools.pGetPrereleaseSources(...this._CONFIG.DIRS_HOMEBREW),
						filterTypesLocalPartnered: [DataPipelineConsts.SOURCE_TYP_PRERELEASE, DataPipelineConsts.SOURCE_TYP_PRERELEASE_LOCAL],
			filterTypesLocal: [DataPipelineConsts.SOURCE_TYP_PRERELEASE, DataPipelineConsts.SOURCE_TYP_PRERELEASE_LOCAL],
						filterTypesPartnered: [DataPipelineConsts.SOURCE_TYP_PRERELEASE],
			filterTypes: [DataPipelineConsts.SOURCE_TYP_PRERELEASE],
			ClsDataPostLoader: this._CONFIG.ClsDataPostLoaderPrerelease,
		});
	}

		static async _pGetPipelinesBrew () {
		if (!this._CONFIG.DIRS_HOMEBREW?.length) return [];

		return this._pGetSourcesPrereleaseBrew({
			brewUtil: BrewUtil2,
			localSources: await Vetools.pGetLocalBrewSources(...this._CONFIG.DIRS_HOMEBREW),
			sources: await Vetools.pGetBrewSources(...this._CONFIG.DIRS_HOMEBREW),
			filterTypesLocalPartnered: [DataPipelineConsts.SOURCE_TYP_BREW_PARTNERED, DataPipelineConsts.SOURCE_TYP_BREW_LOCAL],
			filterTypesLocal: [DataPipelineConsts.SOURCE_TYP_BREW, DataPipelineConsts.SOURCE_TYP_BREW_LOCAL],
			filterTypesPartnered: [DataPipelineConsts.SOURCE_TYP_BREW_PARTNERED],
			filterTypes: [DataPipelineConsts.SOURCE_TYP_BREW],
			ClsDataPostLoader: this._CONFIG.ClsDataPostLoaderBrew,
		});
	}

	static async _pGetSourcesPrereleaseBrew (
		{
			localSources,
			sources,
			brewUtil,
			filterTypesLocalPartnered,
			filterTypesLocal,
			filterTypesPartnered,
			filterTypes,
			ClsDataPostLoader,
		},
	) {
		return [
			...localSources
				.map(({name, url, abbreviations, sourceJsons}) => {
					return new DataPipeline({
						name,
						filterTypes: sourceJsons.some(src => UtilPrereleaseBrewIndices.isPartneredSource(src))
							? [...filterTypesLocalPartnered]
							: [...filterTypesLocal],
						abbreviations,
						isWorldSelectable: true,

						dataSource: new DataSourceUrlPredefined(
							{
								url,
								brewUtil,
								isExistingPrereleaseBrew: true, 							},
						),
						DataPostLoader: ClsDataPostLoader,
					});
				}),

			...sources
				.map(({name, url, abbreviations, sourceJsons}) => {
					return new DataPipeline({
						name,
						filterTypes: sourceJsons.some(src => UtilPrereleaseBrewIndices.isPartneredSource(src))
							? [...filterTypesPartnered]
							: [...filterTypes],
						abbreviations,
						isWorldSelectable: true,

						dataSource: new DataSourceUrlPredefined(
							{
								url,
								brewUtil,
							},
						),
						DataPostLoader: ClsDataPostLoader,
					});
				}),
		];
	}
}
class DataPipelinesListGeneric extends DataPipelinesListBase {
  static _NAME;

static async _pGetPipelinesOfficialAll () {
  if (!this._CONFIG.ClsDataSourceOfficialAll) return [];

  return [
    new DataPipeline({
      name: this._NAME ?? (Config.get("ui", "isStreamerMode") ? "SRD" : "5etools"),
      filterTypes: [DataPipelineConsts.SOURCE_TYP_OFFICIAL_ALL],
      isDefault: true,
      isWorldSelectable: true,

      dataSource: new this._CONFIG.ClsDataSourceOfficialAll(),
      DataPostLoader: this._CONFIG.ClsDataPostLoaderOfficial,
    }),
  ];
}

static async _pGetPipelinesOfficialSources () {
  return [];
}

static async _pGetPipelinesOfficial () {
  if (!this._CONFIG.ClsDataSourceOfficial) return [];

  return (await this._pGetPipelinesOfficialSources())
    .map(source => {
      return new DataPipeline({
        name: Parser.sourceJsonToFull(source),
        source: source,
        filterTypes: DataSourceUtil.getSourceFilterTypes(source),
        abbreviations: [Parser.sourceJsonToAbv(source)],
        isWorldSelectable: true,

        dataSource: new this._CONFIG.ClsDataSourceOfficial({source}),
        DataPostLoader: this._CONFIG.ClsDataPostLoaderOfficial,
      });
    });
}
}

class DataPipelinesListClass extends DataPipelinesListGeneric {
	//static _ = ImplementationRegistryDataPipelinesList.get().register(this);

	static _CONFIG = CONFIG_CLASS;
}
class DataPipelinesListClassSubclassFeature extends DataPipelinesListGeneric {
	static _ = ImplementationRegistryDataPipelinesList.get().register(this);

	static _CONFIG = CONFIG_CLASS_SUBCLASS_FEATURE;

	
	static get NAME () { return "Class/Subclass Feature"; }
}
//#endregion

//#region ImportListClass
class ImportListClass extends ImportListCharacter {
  static init () {
  const dropOpts = {
    isForce: true,
    fnGetSuccessMessage: ({ent}) => `Imported "${ent.className || ent.name}"${ent.subclassShortName ? ` (${ent.name})` : ""} via Class Importer`,
    fnGetFailedMessage: ({ent}) => `Failed to import "${ent.className || ent.name}"${ent.subclassShortName ? ` (${ent.name})` : ""}! ${VeCt.STR_SEE_CONSOLE}`,
  };
  this._initCreateSheetItemHook({
    ...dropOpts,
    prop: "class",
    importerName: "Class",
  });
  this._initCreateSheetItemHook({
    ...dropOpts,
    prop: "subclass",
    importerName: "Subclass",
  });
}

static get ID () { return "classes-subclasses"; }
static get DISPLAY_NAME_TYPE_PLURAL () { return "Classes & Subclasses"; }
static get PROPS () { return ["class", "subclass"]; }

//static _ = ImplementationRegistryImportList.get().register(this);

  static get defaultOptions () {
  return foundry.utils.mergeObject(super.defaultOptions, {
    template: `${SharedConsts.MODULE_LOCATION}/template/ImportListClass.hbs`,
  });
}

_isSkipContentFlatten = true;
_sidebarTab = "items";
_gameProp = "items";
_defaultFolderPath = ["Classes"];
_pageFilter = new PageFilterClassesFoundry();
_page = UrlUtil.PG_CLASSES;
_namespace = "class_subclass";
_configGroup = "importClass";
static _DataConverter = DataConverterClass;
static _DataPipelinesList = DataPipelinesListClass;

constructor (...args) {
  super(...args);

  this._cachedData = null;
}

async pSetContent (val) {
  await super.pSetContent(val);
  this._cachedData = null;
}

isInvalidatedByConfigChange (configDiff) {
  const isHideSubclassRows = !!Config.get("importClass", "isHideSubclassRows");

  return this._cachedData && !!this._cachedData.isHideSubclassRows !== isHideSubclassRows;
}

getData () {
      if (this._cachedData && (this._cachedData.isRadio !== !!this._actor)) this._cachedData = null;

      const isHideSubclassRows = !!Config.get("importClass", "isHideSubclassRows");
  if (this._cachedData && (!!this._cachedData.isHideSubclassRows !== !!isHideSubclassRows)) this._cachedData = null;

  this._cachedData = this._cachedData || {
    titleButtonRun: this._titleButtonRun,
    titleSearch: this._titleSearch,
    rows: this._content.class
      .sort((a, b) => SortUtil.ascSortLower(a.name, b.name) || SortUtil.ascSortLower(Parser.sourceJsonToFull(a.source || Parser.SRC_PHB), Parser.sourceJsonToFull(b.source || Parser.SRC_PHB)))
      .map((cls, ixClass) => {
        this._pageFilter.constructor.mutateForFilters(cls);

        return {
          name: cls.name,
          source: cls.source,
          sourceShort: Parser.sourceJsonToAbv(cls.source),
          sourceLong: Parser.sourceJsonToFull(cls.source),
          sourceClassName: Parser.sourceJsonToSourceClassname(cls.source),
          sourceStyle: Parser.sourceJsonToStylePart(cls.source),
          ixClass,
          disabled: !cls.classFeatures,
          subRows: isHideSubclassRows
            ? []
            : (cls.subclasses || [])
              .map((sc, ixSubclass) => ({
                name: sc.name,
                source: sc.source || cls.source,
                sourceShort: Parser.sourceJsonToAbv(sc.source || cls.source),
                sourceLong: Parser.sourceJsonToFull(sc.source || cls.source),
                sourceClassName: Parser.sourceJsonToSourceClassname(sc.source || cls.source),
                sourceStyle: Parser.sourceJsonToStylePart(sc.source || cls.source),
                ixSubclass,
              })),
        };
      }),
  };

  if (this._actor) this._cachedData.isRadio = true;
  if (isHideSubclassRows) this._cachedData.isHideSubclassRows = true;

  return this._cachedData;
}

_renderInner_listItems ({$html, data}) {
  let html = "";

  for (const row of data.rows) {
    html += `<label class="ve-flex w-100 veapp__list-row-hoverable" draggable="true">
      ${data.isRadio ? `<div class="ve-col-1 ve-flex-vh-center"><div class="fltr-cls__tgl"></div></div>` : `<span class="ve-col-1 ve-flex-vh-center">${row.disabled ? "" : `<input type="checkbox" class="no-events">`}</span>`}
      <span class="ve-col-9 ${data.isHideSubclassRows ? "" : "bold"}">${row.name}</span>
      <span class="ve-col-2 ve-text-center ${row.sourceClassName}" title="${row.sourceLong}" ${row.sourceStyle ? `style="${row.sourceStyle}"` : ""}>${row.sourceShort}</span>
    </label>`;

    html += (row.subRows || [])
      .map(subRow => `<label class="ve-flex w-100 veapp__list-row-hoverable" draggable="true">
        ${data.isRadio ? `<div class="ve-col-1 ve-flex-vh-center"><div class="fltr-cls__tgl"></div></div>` : `<span class="ve-col-1 ve-flex-vh-center"><input type="checkbox" class="no-events"></span>`}
        <span class="ve-col-9" title="Class: ${row.name}"><span class="mx-3">&mdash;</span>${subRow.name}</span>
        <span
          class="ve-col-2 ve-text-center ${subRow.sourceClassName}"
          title="${subRow.sourceLong}"
          ${subRow.sourceStyle ? `style="${subRow.sourceStyle}"` : ""}
        >${subRow.sourceShort}</span>
      </label>`)
      .join("");
  }

  this._$wrpList.fastSetHtml(html);
}

_renderInner_initRunButton () {
  this._$btnRun.click(async () => {
    if (!this._list) return;

    const listItems = this._actor
      ? this._list.items
        .filter(it => it.data.tglSel && it.data.tglSel.classList.contains("active"))
      : this._list.items
        .filter(it => it.data.cbSel.checked);

    if (!listItems.length) return ui.notifications.warn(`Please select something to import!`);

    this.close();

    await this._pImportListItems({listItems});

    this._$cbAll.prop("checked", false).change();
  });
}

async _pImportListItems ({listItems, isBackground}) {
  const selIds = listItems.map(it => ({ixClass: it.data.ixClass, ixSubclass: it.data.ixSubclass}));

  const mapped = selIds.map(({ixClass, ixSubclass}) => {
          const cls = MiscUtil.copyFast(this._content.class[ixClass]);
    return {ixClass, cls, ixSubclass, sc: ixSubclass != null ? cls.subclasses[ixSubclass] : null};
  });
      mapped.filter(it => !it.sc).forEach(it => it.cls.subclasses = []);
      mapped.sort((a, b) => !!a.sc - !!b.sc);

  const classes = [];
  const looseSubclasses = [];
  mapped.forEach(it => {
    if (it.sc) {
      const cls = classes.find(cls =>
        cls.name.toLowerCase() === it.sc.className.toLowerCase()
        && cls.source.toLowerCase() === it.sc.classSource.toLowerCase(),
      );

      if (cls) cls.subclasses.push(it.sc);
      else looseSubclasses.push({cls: it.cls, sc: it.sc});
    } else classes.push(it.cls);
  });

  if (classes.length || looseSubclasses.length) await this._pDoPreCachePack();

  await (
    isBackground
      ? this._pImportListItems_background({classes, looseSubclasses})
      : this._pImportListItems_foreground({classes, looseSubclasses})
  );

  this.activateSidebarTab();
  this.renderTargetApplication();
}

async _pImportListItems_background ({classes, looseSubclasses}) {
  const actorMultiImportHelper = this._actor ? new ActorMultiImportHelper({actor: this._actor}) : null;

  for (const cls of classes) {
    try {
      const importedMeta = await this.pImportClass(cls, new ImportOpts({actorMultiImportHelper}));
      if (importedMeta) importedMeta.doNotification();
    } catch (e) {
      ImportSummary.failed({entity: cls}).doNotification();
      console.error(e);
    }
  }

  for (const {cls, sc} of looseSubclasses) {
    try {
      const importedMeta = await this.pImportSubclass(cls, sc, new ImportOpts({actorMultiImportHelper}));
      if (importedMeta) importedMeta.doNotification();
    } catch (e) {
      ImportSummary.failed({entity: sc}).doNotification();
      console.error(e);
    }
  }

  if (!actorMultiImportHelper) return;
  try {
    await actorMultiImportHelper.pRepairMissingConsumes();
  } catch (e) {
    ui.notifications.error(`Failed to run post-import step! ${VeCt.STR_SEE_CONSOLE}`);
    console.error(e);
  }
}

async _pImportListItems_foreground ({classes, looseSubclasses}) {
  const actorMultiImportHelper = this._actor ? new ActorMultiImportHelper({actor: this._actor}) : null;

  await (
    new AppTaskRunner({
      tasks: [
        ...classes
          .map(cls => {
            return new TaskClosure({
              fnGetPromise: async ({taskRunner}) => this.pImportClass(cls, new ImportOpts({taskRunner, actorMultiImportHelper})),
            });
          }),
        ...looseSubclasses
          .map(({cls, sc}) => {
            return new TaskClosure({
              fnGetPromise: async ({taskRunner}) => this.pImportSubclass(cls, sc, new ImportOpts({taskRunner, actorMultiImportHelper})),
            });
          }),
        ...(
          actorMultiImportHelper
            ? [
              new TaskClosure({
                fnGetPromise: async ({taskRunner}) => actorMultiImportHelper.pRepairMissingConsumes({taskRunner}),
              }),
            ]
            : []
        ),
      ],
      titleInitial: "Importing...",
      titleComplete: "Import Complete",
    })
  ).pRun();
}

async _renderInner_pInitFilteredList () {
      this._list = new List({
    $iptSearch: this._$iptSearch,
    $wrpList: this._$wrpList,
    fnSort: (a, b, opts) => {
      if (opts.sortDir === "desc" && a.data.ixClass === b.data.ixClass && (a.data.ixSubclass != null || b.data.ixSubclass != null)) {
        return a.data.ixSubclass != null ? -1 : 1;
      }

      return SortUtil.ascSortLower(a.values.sortName, b.values.sortName);
    },
  });
  SortUtil.initBtnSortHandlers(this._$wrpBtnsSort, this._list);
  this._listSelectClickHandler = new ListSelectClickHandler({list: this._list});

  const flatListItems = this._cachedData.rows.map(r => {
    const fromClass = {...r};
    delete fromClass.subRows;

    if (Config.get("importClass", "isHideSubclassRows")) return [fromClass];

    const fromSubclass = r.subRows.map(sr => ({
      ...sr,
      ixClass: r.ixClass,
      className: r.name,
      classSource: r.source,
      classSourceLong: r.sourceLong,
      classSourceClassName: r.sourceClassName,
    }));
    return [fromClass, ...fromSubclass];
  }).flat();

  await this._pageFilter.pInitFilterBox({
    $iptSearch: this._$iptSearch,
    $btnReset: this._$btnReset,
    $btnOpen: this._$bntFilter,
    $btnToggleSummaryHidden: this._$btnToggleSummary,
    $wrpMiniPills: this._$wrpMiniPills,
    namespace: this._getFilterNamespace(),
  });

  this._content.class.forEach(it => this._pageFilter.addToFilters(it));

  const optsListAbsorb = {
    fnGetName: it => it.name,
          fnGetValues: it => {
      if (it.ixSubclass != null) {
        return {
          sortName: `${it.className} SOURCE ${it.classSourceLong} SUBCLASS ${it.name} SOURCE ${it.sourceLong}`,
          source: it.source,
          hash: UrlUtil.URL_TO_HASH_BUILDER["subclass"](it),
        };
      }

      return {
        sortName: `${it.name} SOURCE ${it.sourceLong}`,
        source: it.source,
        hash: UrlUtil.URL_TO_HASH_BUILDER[this._page](it),
      };
    },
    fnGetData: (li, it) => {
      const out = this._actor
        ? {tglSel: li.ele.firstElementChild.firstElementChild}
        : UtilList2.absorbFnGetData(li);

      if (it.ixSubclass != null) {
        return {
          ...out,
          ixClass: it.ixClass,
          ixSubclass: it.ixSubclass,
        };
      }

      return {
        ...out,
        ixClass: it.ixClass,
      };
    },
  };

  if (this._actor) { 			optsListAbsorb.fnBindListeners = listItem => {
      listItem.ele.addEventListener("click", () => {
        const isScItem = listItem.data.ixSubclass != null;
        const clsListItem = isScItem ? this._list.items.find(it => it.data.ixClass === listItem.data.ixClass && it.data.ixSubclass == null) : null;

                  const actives = this._list.items.filter(it => it.data.tglSel.classList.contains("active"));
        if (!actives.length) {
          listItem.data.tglSel.classList.add("active");
          listItem.ele.classList.add("list-multi-selected");

          if (isScItem) {
            clsListItem.data.tglSel.classList.add("active");
            clsListItem.ele.classList.add("list-multi-selected");
          }

          return;
        }
        
                  if (listItem.data.tglSel.classList.contains("active")) {
          listItem.data.tglSel.classList.remove("active");
          listItem.ele.classList.remove("list-multi-selected");

          if (isScItem) { 							clsListItem.data.tglSel.classList.remove("active");
            clsListItem.ele.classList.remove("list-multi-selected");
          } else { 							actives.forEach(li => {
              li.data.tglSel.classList.remove("active");
              li.ele.classList.remove("list-multi-selected");
            });
          }

          return;
        }
        
                  actives.forEach(li => {
          li.data.tglSel.classList.remove("active");
          li.ele.classList.remove("list-multi-selected");
        });

        listItem.data.tglSel.classList.add("active");
        listItem.ele.classList.add("list-multi-selected");

        if (isScItem) {
          clsListItem.data.tglSel.classList.add("active");
          clsListItem.ele.classList.add("list-multi-selected");
        }
                });
    };
  } else {
    optsListAbsorb.fnBindListeners = it => UtilList2.absorbFnBindListeners(this._listSelectClickHandler, it);
  }

  this._list.doAbsorbItems(flatListItems, optsListAbsorb);
  this._list.init();

  this._pageFilter.trimState();
  this._pageFilter.filterBox.render();

  this._pageFilter.filterBox.on(
    EVNT_VALCHANGE,
    this._handleFilterChange.bind(this),
  );

  this._handleFilterChange();
}

_renderInner_getListSyntax () {
  return null;
}

_renderInner_initFeelingLuckyButton () {
  if (!this._actor) return super._renderInner_initFeelingLuckyButton();

  this._$btnFeelingLucky.click(() => {
    if (!this._list || !this._list.visibleItems.length) return;

    const listItem = RollerUtil.rollOnArray(this._list.visibleItems);
    if (!listItem) return;

    listItem.ele.click();
    listItem.ele.scrollIntoView({block: "center"});
  });
}

_handleFilterChange () {
  return ModalFilterClasses.handleFilterChange({
    pageFilter: this._pageFilter,
    list: this._list,
    allData: this._content.class,
  });
}

async _pEnsureFilterBoxInit () {
  if (this._pageFilter.filterBox) return;
  await this._pageFilter.pInitFilterBox({
    namespace: this._getFilterNamespace(),
  });
}

  async _pImportEntry (cls, importOpts, dataOpts) {
  importOpts ||= new ImportOpts();

  await this._pEnsureFilterBoxInit();

          let clsRaw = null;
  let scRaw = null;
  if (cls?.subclassFeatures?.every(it => it == null || it instanceof Array)) {
    scRaw = await DataLoader.pCacheAndGet("raw_subclass", cls.source, UrlUtil.URL_TO_HASH_BUILDER["subclass"](cls), {isCopy: true});
    clsRaw = await DataLoader.pCacheAndGet("raw_class", scRaw.classSource, UrlUtil.URL_TO_HASH_BUILDER["class"]({name: scRaw.className, source: scRaw.classSource}), {isCopy: true});
  }

      if (cls?.classFeatures?.every(it => it == null || it instanceof Array)) {
    clsRaw = await DataLoader.pCacheAndGet("raw_class", cls.source, UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_CLASSES](cls), {isCopy: true});
  }

      if (clsRaw || scRaw) {
    const toLoad = {class: [clsRaw]};

    if (scRaw) {
      toLoad.subclass = [scRaw];
    }

    const {DataPrimer} = await Promise.resolve().then(function () { return DataPrimer$1; });

    const data = await DataPrimer.pGetPrimedJson(toLoad);
    cls = data.class[0];

    if (scRaw) {
      const sc = cls.subclasses[0];
      cls.subclasses = [];
      return this._pImportSubclass(cls, sc, importOpts, dataOpts);
    }
  }
  
  return this._pImportClass(cls, importOpts, dataOpts);
}

async pImportClass (cls, importOpts, dataOpts) {
  return new ImportEntryManagerClass({
    instance: this,
    ent: cls,
    importOpts,
    dataOpts,
  }).pImportEntry();
}

  async _pImportClass (cls, importOpts, dataOpts) {
  importOpts ||= new ImportOpts();

  console.log(...LGT, `Importing class "${cls.name}" (from "${Parser.sourceJsonToAbv(cls.source)}")`);

  if (DataConverterClass.isStubClass(cls)) return ImportSummary.completedStub({entity: cls});

  if (importOpts.isTemp) return this._pImportClass_pImportToItems(cls, importOpts, dataOpts);
  if (this._actor) return this._pImportClass_pImportToActor(cls, importOpts, dataOpts);

  return this._pImportClass_pImportToDocData(cls, importOpts, dataOpts);

  return this._pImportClass_pImportToItems(cls, importOpts, dataOpts);
}

  async _pImportClass_pImportToActor (cls, importOpts, dataOpts) {
  const dataBuilderOpts = new ImportListClass.ImportEntryOpts({
    isClassImport: true,
    isCharactermancer: importOpts.isCharactermancer,
  });

      let allFeatures;

  if (!cls._foundryAllFeatures) {
    allFeatures = Charactermancer_Class_Util.getAllFeatures(cls);

    this.constructor._tagFirstSubclassLoaded(cls, allFeatures);

          allFeatures = Charactermancer_Util.getFilteredFeatures(allFeatures, this._pageFilter, importOpts.filterValues || this._pageFilter.filterBox.getValues());
  } else {
    this.constructor._tagFirstSubclassLoaded(cls);
  }
  
  const sc = cls.subclasses?.length ? cls.subclasses[0] : null;

  return this._pImportClassSubclass_pImportToActor({cls, sc, importOpts, dataBuilderOpts, allFeatures});
}

  static _tagFirstSubclassLoaded (cls, allFeatures = null) {
  let subclassLoadeds;
  if (allFeatures) {
    const group = allFeatures.find(it => it.subclassFeature);
    if (!group?.loadeds.length) return;
    subclassLoadeds = group.loadeds;
  } else {
    subclassLoadeds = cls._foundryAllFeatures.filter(it => it.type === "subclassFeature");
  }

  if (!subclassLoadeds.length) return;

  const expectedFirstSubclassFeatureLevel = cls.classFeatures.find(it => it.gainSubclassFeature)?.level;

          if (subclassLoadeds[0]?.entity?.level !== expectedFirstSubclassFeatureLevel) return;

      if (
    BrewUtil2.hasSourceJson(subclassLoadeds[0]?.entity?.source)
    && [
      "skillProficiencies",
      "languageProficiencies",
      "toolProficiencies",
      "armorProficiencies",
      "weaponProficiencies",
      "savingThrowProficiencies",
      "immune",
      "resist",
      "vulnerable",
      "conditionImmune",
      "expertise",
    ].some(prop => subclassLoadeds[0].entity[prop])
  ) {
    return;
  }

  subclassLoadeds[0]._foundryIsIgnoreFeature = true;
}

async _pImportClassSubclass_pImportToActor ({cls, sc, importOpts, dataBuilderOpts, allFeatures}) {
      const actorMultiImportHelper = importOpts.actorMultiImportHelper || new ActorMultiImportHelper({actor: this._actor});

  const selectedLevelIndices = await this._pGetSelectedLevelIndices(cls, importOpts, allFeatures, dataBuilderOpts, sc != null);
  if (dataBuilderOpts.isCancelled) return ImportSummary.cancelled();

  await this._pValidateUserLevelIndices(selectedLevelIndices, dataBuilderOpts);
  if (dataBuilderOpts.isCancelled) return ImportSummary.cancelled();

  dataBuilderOpts.targetLevel = Math.max(...selectedLevelIndices) + 1;
  dataBuilderOpts.numLevels = dataBuilderOpts.targetLevel - Math.min(...selectedLevelIndices);
  dataBuilderOpts.numLevelsPrev = UtilActors.getTotalClassLevels(this._actor);
  dataBuilderOpts.isIncludesLevelOne = cls != null 			&& selectedLevelIndices.includes(0);
  const {proficiencyImportMode, shouldBeMulticlass} = await this._pImportClass_pGetProficiencyImportMode(cls, dataBuilderOpts);
  dataBuilderOpts.proficiencyImportMode = proficiencyImportMode;
  dataBuilderOpts.shouldBeMulticlass = shouldBeMulticlass;
  if (dataBuilderOpts.isCancelled) return ImportSummary.cancelled();
  const hpIncreaseMeta = await this._pImportClass_pGetHpImportMode(cls, dataBuilderOpts);
  if (dataBuilderOpts.isCancelled) return ImportSummary.cancelled();
  dataBuilderOpts.hpIncreaseMode = hpIncreaseMeta.mode;
  dataBuilderOpts.hpIncreaseCustomRollFormula = hpIncreaseMeta.customFormula;

  const actUpdate = {
    system: {},
  };

      const hpIncreasePerLevel = await this._pImportEntry_pDoUpdateCharacterHp({actUpdate, cls, dataBuilderOpts});

  const curLevelMetaAndExistingClassItem = await this._pImportEntry_pGetCurLevelFillClassData({
    actUpdate,
    cls,
    sc,
    importOpts,
    dataBuilderOpts,
    hpIncreasePerLevel,
  });
  if (dataBuilderOpts.isCancelled) return ImportSummary.cancelled();
  const {curLevel, existingClassItem, existingSubclassItem} = curLevelMetaAndExistingClassItem;

  this._pImportEntry_setActorFlags(actUpdate, cls, sc, curLevel, dataBuilderOpts);

  await this._pImportEntry_pDoUpdateCharacter(actUpdate, cls, sc, curLevel, existingClassItem, existingSubclassItem, dataBuilderOpts);
  if (dataBuilderOpts.isCancelled) return ImportSummary.cancelled();

  await this._pImportCasterCantrips(cls, sc, curLevel, importOpts, dataBuilderOpts);

  await this._pImportEntry_pFillItemArrayAdditionalSpells(cls, cls.subclasses, curLevel, importOpts, dataBuilderOpts);
  if (dataBuilderOpts.isCancelled) return ImportSummary.cancelled();

  if (
    (cls.preparedSpells && !cls.spellsKnownProgressionFixed)
    || (cls.preparedSpellsProgression && !cls.spellsKnownProgressionFixed)
  ) await this._pImportPreparedCasterSpells(cls, sc, curLevel, importOpts, dataBuilderOpts);

  await this._pImportEntry_pAddUpdateClassItem(cls, sc, importOpts, dataBuilderOpts);

  await this._pImportEntry_pHandleFeatures(cls, sc, allFeatures, selectedLevelIndices, importOpts, dataBuilderOpts);
  if (dataBuilderOpts.isCancelled) return ImportSummary.cancelled();

  await this._pImportEntry_pAddUnarmedStrike({importOpts});

  await this._pImportEntry_pAddAdvancements(dataBuilderOpts);

  await this._pImportEntry_pFinalise(importOpts, dataBuilderOpts);

  await actorMultiImportHelper.pRepairMissingConsumes();

  if (this._actor.isToken) this._actor.sheet.render();

  return new ImportSummary({
    status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
    imported: [
      new ImportedDocument({
        name: `${cls.name}${sc ? ` (${sc.name})` : ""}`,
        actor: this._actor,
      }),
    ],
  });
}

async _pGetSelectedLevelIndices (cls, importOpts, allFeatures, dataBuilderOpts, isSubclass) {
  if (cls._foundrySelectedLevelIndices) return cls._foundrySelectedLevelIndices;

      if (importOpts.levels) return importOpts.levels.map(it => it - 1).filter(it => it >= 0);

  const indicesFormData = await Charactermancer_Class_LevelSelect.pGetUserInput({
    features: allFeatures,
    isSubclass,
    maxPreviousLevel: this._pImportEntry_getApproxPreviousMaxLevel(cls),
  });
  if (indicesFormData == null) return dataBuilderOpts.isCancelled = true;

  return indicesFormData.data;
}

  _pImportEntry_getApproxPreviousMaxLevel (cls) {
  const existingClassItems = this._getExistingClassItems(cls);
  if (!existingClassItems.length) return 0;
  return Math.max(...existingClassItems.map(it => it.system.levels || 0));
}

_pImportEntry_setActorFlags (actUpdate, cls, sc, curLevel, dataBuilderOpts) {
  const flags = {[SharedConsts.SYSTEM_ID_DND5E]: {}};

  
  if (Object.keys(flags[SharedConsts.SYSTEM_ID_DND5E]).length) actUpdate.flags = flags;
}

async _pImportClass_pGetProficiencyImportMode (cls, dataBuilderOpts) {
  const existingClassItems = this._actor.items.filter(it => it.type === "class");

  if (!dataBuilderOpts.isClassImport || !dataBuilderOpts.isIncludesLevelOne || !existingClassItems.length) {
    return {
      proficiencyImportMode: Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY,
      shouldBeMulticlass: false,
    };
  }

      if (cls._foundryStartingProficiencyMode != null) {
    return {
      proficiencyImportMode: cls._foundryStartingProficiencyMode,
              shouldBeMulticlass: cls._foundryStartingProficiencyMode === Charactermancer_Class_ProficiencyImportModeSelect.MODE_MULTICLASS,
    };
  }

      const identifierCls = UtilDocumentItem.getNameAsIdentifier(cls.name);
  const shouldBeMulticlass = existingClassItems.every(clsItem => clsItem.system.identifier !== identifierCls);

  const out = await Charactermancer_Class_ProficiencyImportModeSelect.pGetUserInput();
  if (out == null) dataBuilderOpts.isCancelled = true;

  return {
    proficiencyImportMode: out?.data,
    shouldBeMulticlass: shouldBeMulticlass && out != null,
  };
}

async _pImportClass_pGetHpImportMode (cls, dataBuilderOpts) {
  if (!Charactermancer_Class_HpIncreaseModeSelect.isHpAvailable(cls)) return {mode: ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__DO_NOT_INCREASE};

      if (cls._foundryHpIncreaseMode != null || cls._foundryHpIncreaseCustomFormula != null) return {mode: cls._foundryHpIncreaseMode, customFormula: cls._foundryHpIncreaseCustomFormula};

  const out = await Charactermancer_Class_HpIncreaseModeSelect.pGetUserInput();
  if (out == null) return dataBuilderOpts.isCancelled = true;
  if (out === VeCt.SYM_UI_SKIP) return {mode: ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__DO_NOT_INCREASE};
  return out.data;
}

async _pImportClass_pImportToItems (cls, importOpts, dataOpts) {
  const duplicateMeta = this._getDuplicateMeta({entity: cls, importOpts});
  if (duplicateMeta.isSkip) {
    return new ImportSummary({
      status: ConstsTaskRunner.TASK_EXIT_SKIPPED_DUPLICATE,
      imported: [
        new ImportedDocument({
          isExisting: true,
          document: duplicateMeta.existing,
        }),
      ],
    });
  }

  const clsData = await DataConverterClass.pGetDocumentJsonClass(
    cls,
    {
      filterValues: importOpts.filterValues || this._pageFilter.filterBox.getValues(),
      ...dataOpts,
      isAddDefaultOwnershipFromConfig: importOpts.isAddDefaultOwnershipFromConfig ?? true,
      defaultOwnership: importOpts.defaultOwnership,
      userOwnership: importOpts.userOwnership,
      pageFilter: this._pageFilter,
      taskRunner: importOpts.taskRunner,
      actorMultiImportHelper: importOpts.actorMultiImportHelper,
    },
  );

  const Clazz = this._getDocumentClass();

  if (importOpts.isTemp) {
    const clsItem = await UtilDocuments.pCreateDocument(Item, clsData, {isRender: false, isTemporary: true});
    const scItems = await (cls.subclasses || []).pSerialAwaitMap(sc => this.pImportSubclass(cls, sc, importOpts, dataOpts));

    return new ImportSummary({
      status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
      imported: [
        clsItem,
        ...scItems,
      ].map(it => new ImportedDocument({document: it, actor: this._actor})),
    });
  } else if (this._pack) {
    if (duplicateMeta.isOverwrite) {
      const clsItem = await this._pImportEntry_pDoUpdateExistingPackEntity({
        entity: cls,
        duplicateMeta,
        docData: clsData,
        importOpts,
      });
      const scItems = await (cls.subclasses || []).pSerialAwaitMap(sc => this.pImportSubclass(cls, sc, importOpts, dataOpts));

      return new ImportSummary({
        status: ConstsTaskRunner.TASK_EXIT_COMPLETE_UPDATE_OVERWRITE_DUPLICATE,
        imported: [
          clsItem,
          ...scItems,
        ].map(it => new ImportedDocument({isExisting: true, document: it, actor: this._actor})),
      });
    }

    const clsItem = new Clazz(clsData);
    await this._pack.importDocument(clsItem);
    const scItems = await (cls.subclasses || []).pSerialAwaitMap(sc => this.pImportSubclass(cls, sc, importOpts, dataOpts));

    await this._pImportEntry_pAddToTargetTableIfRequired([clsItem], duplicateMeta, importOpts);

    return new ImportSummary({
      status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
      imported: [
        clsItem,
        ...scItems,
      ].map(it => new ImportedDocument({document: it, actor: this._actor})),
    });
  }

  return this._pImportClass_pImportToItems_toDirectory({
    duplicateMeta,
    cls,
    clsData,
    importOpts,
  });
}

async _pImportClass_pImportToDocData (cls, importOpts, dataOpts) {
  
  const duplicateMeta = null; //this._getDuplicateMeta({entity: cls, importOpts});
  if (duplicateMeta?.isSkip) {
    return new ImportSummary({
      status: ConstsTaskRunner.TASK_EXIT_SKIPPED_DUPLICATE,
      imported: [
        new ImportedDocument({
          isExisting: true,
          document: duplicateMeta.existing,
        }),
      ],
    });
  }

  const clsData = await DataConverterClass.pGetDocumentJsonClass(
    cls,
    {
      filterValues: importOpts.filterValues || this._pageFilter.filterBox.getValues(),
      ...dataOpts,
      isAddDefaultOwnershipFromConfig: importOpts.isAddDefaultOwnershipFromConfig ?? true,
      defaultOwnership: importOpts.defaultOwnership,
      userOwnership: importOpts.userOwnership,
      pageFilter: this._pageFilter,
      taskRunner: importOpts.taskRunner,
      actorMultiImportHelper: importOpts.actorMultiImportHelper,
    },
  );

  return new ImportSummary({
    status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
    imported: [clsData]
  });

  const Clazz = this._getDocumentClass();

  if (importOpts.isTemp) {
    const clsItem = await UtilDocuments.pCreateDocument(Item, clsData, {isRender: false, isTemporary: true});
    const scItems = await (cls.subclasses || []).pSerialAwaitMap(sc => this.pImportSubclass(cls, sc, importOpts, dataOpts));

    return new ImportSummary({
      status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
      imported: [
        clsItem,
        ...scItems,
      ].map(it => new ImportedDocument({document: it, actor: this._actor})),
    });
  }
  else if (this._pack) {
    if (duplicateMeta.isOverwrite) {
      const clsItem = await this._pImportEntry_pDoUpdateExistingPackEntity({
        entity: cls,
        duplicateMeta,
        docData: clsData,
        importOpts,
      });
      const scItems = await (cls.subclasses || []).pSerialAwaitMap(sc => this.pImportSubclass(cls, sc, importOpts, dataOpts));

      return new ImportSummary({
        status: ConstsTaskRunner.TASK_EXIT_COMPLETE_UPDATE_OVERWRITE_DUPLICATE,
        imported: [
          clsItem,
          ...scItems,
        ].map(it => new ImportedDocument({isExisting: true, document: it, actor: this._actor})),
      });
    }

    const clsItem = new Clazz(clsData);
    await this._pack.importDocument(clsItem);
    const scItems = await (cls.subclasses || []).pSerialAwaitMap(sc => this.pImportSubclass(cls, sc, importOpts, dataOpts));

    await this._pImportEntry_pAddToTargetTableIfRequired([clsItem], duplicateMeta, importOpts);

    return new ImportSummary({
      status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
      imported: [
        clsItem,
        ...scItems,
      ].map(it => new ImportedDocument({document: it, actor: this._actor})),
    });
  }

  return this._pImportClass_pImportToItems_toDirectory({
    duplicateMeta,
    cls,
    clsData,
    importOpts,
  });
}

async _pImportClass_pImportToItems_toDirectory (
  {
    duplicateMeta,
    cls,
    clsData,
    importOpts,
  },
) {
  if (duplicateMeta?.isOverwrite) {
    const clsItem = await this._pImportEntry_pDoUpdateExistingDirectoryEntity({
      entity: cls,
      duplicateMeta,
      docData: clsData,
    });
    const scItems = await (cls.subclasses || []).pSerialAwaitMap(sc => this.pImportSubclass(cls, sc, importOpts));

    return new ImportSummary({
      status: ConstsTaskRunner.TASK_EXIT_COMPLETE_UPDATE_OVERWRITE_DUPLICATE,
      imported: [
        clsItem,
        ...scItems,
      ].map(it => new ImportedDocument({isExisting: true, document: it, actor: this._actor})),
    });
  }

  const folderIdMeta = await this._pImportEntry_pImportToDirectoryGeneric_pGetFolderIdMeta({
    toImport: cls,
    importOpts,
  });
  if (folderIdMeta?.folderId) clsData.folder = folderIdMeta.folderId;

  const clsItem = await UtilDocuments.pCreateDocument(Item, clsData, {isRender: !importOpts.isBatched});

  await game.items.set(clsItem.id, clsItem);

  const scItems = await (cls.subclasses || [])
    .pSerialAwaitMap(sc => this.pImportSubclass(
      cls,
      sc,
      new ImportOpts({
        ...importOpts,
        folderId: folderIdMeta?.folderId || importOpts.folderId,
      }),
    ));

  return new ImportSummary({
    status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
    imported: [
      clsItem,
      ...scItems,
    ].map(it => new ImportedDocument({document: it, actor: this._actor})),
  });
}

async pImportSubclass (cls, sc, importOpts, dataOpts) {
  return new ImportEntryManagerSubclass({
    instance: this,
    ent: sc,
    cls,
    importOpts,
    dataOpts,
  }).pImportEntry();
}

  async _pImportSubclass (cls, sc, importOpts, dataOpts) {
  importOpts ||= new ImportOpts();

  console.log(...LGT, `Importing subclass "${sc.name}" (from "${Parser.sourceJsonToAbv(sc.source)}")`);

  if (DataConverterClass.isStubClass(cls)) return ImportSummary.completedStub();
  if (DataConverterClass.isStubSubclass(sc)) return ImportSummary.completedStub();

  if (importOpts.isTemp) return this._pImportSubclass_pImportToItems(cls, sc, importOpts, dataOpts);
  if (this._actor) return this._pImportSubclass_pImportToActor(cls, sc, importOpts, dataOpts);
  return this._pImportSubclass_pImportToItems(cls, sc, importOpts, dataOpts);
}

async _pImportSubclass_pImportToActor (cls, sc, importOpts, dataOpts) {
  const dataBuilderOpts = new ImportListClass.ImportEntryOpts({
    isClassImport: false,
    isCharactermancer: importOpts.isCharactermancer,
  });

      const existingClassItems = this._actor.items.filter(it => it.type === "class");
  if (!existingClassItems.length) {
    const isImportSubclassOnly = await InputUiUtil.pGetUserBoolean({
      title: "Import Class?",
      htmlDescription: "You have selected a subclass to import, but have no class levels. Would you like to import the class too?",
      textYes: "Import Class and Subclass",
      textNo: "Import Only Subclass",
    });

    if (isImportSubclassOnly == null) {
      dataBuilderOpts.isCancelled = true;
      return ImportSummary.cancelled();
    }

          if (isImportSubclassOnly === true) {
      const cpyCls = MiscUtil.copyFast(cls);
      cpyCls.subclasses = [sc];
      return this.pImportClass(cpyCls, importOpts);
    }
  }
  
      let allFeatures = MiscUtil.copyFast(sc.subclassFeatures);

  this.constructor._tagFirstSubclassLoaded(cls, allFeatures);

  allFeatures = Charactermancer_Util.getFilteredFeatures(allFeatures, this._pageFilter, importOpts.filterValues || this._pageFilter.filterBox.getValues());
  
  return this._pImportClassSubclass_pImportToActor({cls, sc, importOpts, dataBuilderOpts, allFeatures});
}

  async _pImportSubclass_pImportToItems (cls, sc, importOpts, dataOpts = {}) {
  const scData = await DataConverterClass.pGetDocumentJsonSubclass(
    cls,
    sc,
    {
      filterValues: importOpts.filterValues || this._pageFilter.filterBox.getValues(),
      ...dataOpts,
      isAddDefaultOwnershipFromConfig: importOpts.isAddDefaultOwnershipFromConfig ?? true,
      defaultOwnership: importOpts.defaultOwnership,
      userOwnership: importOpts.userOwnership,
      pageFilter: this._pageFilter,
      taskRunner: importOpts.taskRunner,
      actorMultiImportHelper: importOpts.actorMultiImportHelper,
    },
  );

  const duplicateMeta = this._getDuplicateMeta({
    name: scData.name,
    sourceIdentifier: UtilDocumentSource.getDocumentSourceIdentifierString({doc: scData}),
    importOpts,
  });
  if (duplicateMeta.isSkip) {
    return new ImportSummary({
      status: ConstsTaskRunner.TASK_EXIT_SKIPPED_DUPLICATE,
      imported: [
        new ImportedDocument({
          isExisting: true,
          document: duplicateMeta.existing,
        }),
      ],
    });
  }

  const Clazz = this._getDocumentClass();

  if (importOpts.isTemp) {
    const imported = await UtilDocuments.pCreateDocument(Item, scData, {isRender: false, isTemporary: true});

    return new ImportSummary({
      status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
      imported: [
        new ImportedDocument({
          document: imported,
        }),
      ],
    });
  } else if (this._pack) {
    if (duplicateMeta.isOverwrite) {
      return this._pImportEntry_pDoUpdateExistingPackEntity({
        entity: sc,
        duplicateMeta,
        docData: scData,
        importOpts,
      });
    }

    const scItem = new Clazz(scData);
    await this._pack.importDocument(scItem);

    await this._pImportEntry_pAddToTargetTableIfRequired([scItem], duplicateMeta, importOpts);

    return new ImportSummary({
      status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
      imported: [
        new ImportedDocument({
          document: scItem,
        }),
      ],
    });
  }

  return this._pImportEntry_pImportToDirectoryGeneric_toDirectory({
    duplicateMeta,
    docData: scData,
    toImport: sc,
    Clazz,
    importOpts,
  });
}

async _pImportEntry_pDoUpdateCharacter (actUpdate, cls, sc, curLevel, existingClassItem, existingSubclassItem, dataBuilderOpts) {
          const otherExistingClassItems = this._actor.items
    .filter(it => it.type === "class")
    .filter(it => it !== existingClassItem);

      const otherExistingSubclassItems = this._actor.items
    .filter(it => it.type === "subclass")
    .filter(it => it !== existingSubclassItem);

  await this._pImportEntry_pDoUpdateCharacter_xp({actUpdate, dataBuilderOpts, otherExistingClassItems});
  await this._pImportEntry_pDoUpdateCharacter_profBonus({actUpdate, dataBuilderOpts});
  await this._pImportEntry_pDoUpdateCharacter_spellcasting({actUpdate, cls, sc, dataBuilderOpts, otherExistingClassItems, otherExistingSubclassItems});
  await this._pImportEntry_pDoUpdateCharacter_psionics({actUpdate, cls, sc, dataBuilderOpts, otherExistingClassItems, otherExistingSubclassItems});
  await this._pImportEntry_pDoUpdateCharacter_languages({actUpdate, cls, dataBuilderOpts});
  if (dataBuilderOpts.isCancelled) return;

  if (Object.keys(actUpdate.system).length) await UtilDocuments.pUpdateDocument(this._actor, actUpdate);
}

async _pImportEntry_pDoUpdateCharacter_xp ({actUpdate, dataBuilderOpts, otherExistingClassItems}) {
  if (Config.get("importClass", "isSetXp")) return;

  const totalLevel = otherExistingClassItems
    .map(it => it.system.levels || 0)
    .reduce((a, b) => a + b, 0)
    + (dataBuilderOpts.targetLevel || 0);

  if (totalLevel <= 0) return;

  const xpObj = ((actUpdate.system.details = actUpdate.system.details || {}).xp = actUpdate.system.details.xp || {});
  const curXp = MiscUtil.get(this._actor, "system", "details", "xp", "value") || 0;
  const tgtXp = Parser.LEVEL_XP_REQUIRED[totalLevel - 1];
  const nxtXp = Parser.LEVEL_XP_REQUIRED[Math.min(totalLevel, 19)];
  if (curXp < tgtXp) {
    xpObj.pct = 0;
    xpObj.value = tgtXp;
  } else {
    xpObj.pct = (curXp / nxtXp) * 100;
  }
  xpObj.max = nxtXp;
}

async _pImportEntry_pDoUpdateCharacter_profBonus ({actUpdate, dataBuilderOpts}) {
      const curProfBonus = MiscUtil.get(this._actor, "system", "attributes", "prof");
  const targetProf = Math.floor((dataBuilderOpts.targetLevel - 1) / 4) + 2;
  if (curProfBonus < targetProf) (actUpdate.system.attributes = actUpdate.system.attributes || {}).prof = targetProf;
}

async _pImportEntry_pDoUpdateCharacter_spellcasting ({actUpdate, cls, sc, dataBuilderOpts, otherExistingClassItems, otherExistingSubclassItems}) {
  const progressionMeta = Charactermancer_Class_Util.getCasterProgression(cls, sc, {targetLevel: dataBuilderOpts.targetLevel, otherExistingClassItems, otherExistingSubclassItems});

  const isAnySlotMod = this._pImportEntry_pDoUpdateCharacter_spellcasting_slots({actUpdate, dataBuilderOpts, progressionMeta});
  if (!isAnySlotMod) {
    delete actUpdate.data?.spells;
    delete dataBuilderOpts.postItemActorUpdate?.data?.spells;
  }

  const {spellAbility, totalSpellcastingLevels} = progressionMeta;
  if (spellAbility) (actUpdate.system.attributes = actUpdate.system.attributes || {}).spellcasting = spellAbility;

      await this._pImportEntry_pDoUpdateCharacter_spellcasting_spellPoints({actUpdate, totalSpellcastingLevels});
}

_pImportEntry_pDoUpdateCharacter_spellcasting_slots ({actUpdate, dataBuilderOpts, progressionMeta}) {
  const {casterProgression, totalSpellcastingLevels, maxPactCasterLevel} = progressionMeta;

  if (!totalSpellcastingLevels && casterProgression !== "pact") return;

  let isAnyMod = false;
  actUpdate.system.spells = actUpdate.system.spells || {};
          const postDataSpells = MiscUtil.getOrSet(dataBuilderOpts.postItemActorUpdate, "system", "spells", {});

  if (totalSpellcastingLevels) {
          const spellSlots = UtilDataConverter.CASTER_TYPE_TO_PROGRESSION.full;
    let maxLevelSpells = spellSlots[totalSpellcastingLevels - 1] || spellSlots.last();

    maxLevelSpells.forEach((slots, i) => {
      if (slots === 0) return;
      const lvlProp = `spell${i + 1}`;

      const existingMax = MiscUtil.get(this._actor, "system", "spells", lvlProp, "max");
      const existingValue = MiscUtil.get(this._actor, "system", "spells", lvlProp, "value");
      if (existingMax != null) {
        if (existingMax < slots) {
          isAnyMod = true;

          const delta = slots - existingMax;

          actUpdate.system.spells[lvlProp] = {max: slots, value: existingValue + delta};
          postDataSpells[lvlProp] = {max: slots, value: existingValue + delta};
        }
      } else {
        isAnyMod = true;
        actUpdate.system.spells[lvlProp] = {max: slots, value: slots};
        postDataSpells[lvlProp] = {max: slots, value: slots};
      }
    });

    return isAnyMod;
  }

  if (casterProgression === "pact") {
    const existingMax = MiscUtil.get(this._actor, "system", "spells", "pact", "max");
    const existingValue = MiscUtil.get(this._actor, "system", "spells", "pact", "value");

    const slots = UtilDataConverter.CASTER_TYPE_TO_PROGRESSION.pact[maxPactCasterLevel - 1].find(Boolean);

    if (existingMax != null) {
      if (existingMax < slots) {
        isAnyMod = true;

        const delta = slots - existingMax;

        actUpdate.system.spells.pact = {max: slots, value: existingValue + delta};
        postDataSpells.pact = {max: slots, value: existingValue + delta};
      }
    } else {
      isAnyMod = true;
      actUpdate.system.spells.pact = {max: slots, value: slots};
      postDataSpells.pact = {max: slots, value: slots};
    }

    return isAnyMod;
  }

  return false;
}

async _pImportEntry_pDoUpdateCharacter_spellcasting_spellPoints ({actUpdate, totalSpellcastingLevels}) {
  if (
    !totalSpellcastingLevels
    || Config.get("importSpell", Config.getSpellPointsKey({actorType: this._actor?.type})) === ConfigConsts.C_SPELL_POINTS_MODE__DISABLED
  ) return;
  return Config.get("importSpell", "spellPointsResource") === ConfigConsts.C_SPELL_POINTS_RESOURCE__SHEET_ITEM
    ? UtilActors.pGetCreateActorSpellPointsItem({actor: this._actor, totalSpellcastingLevels})
    : this._pImportEntry_pDoUpdateCharacter_spellcasting_spellPsiPoints_resource({
      actUpdate,
      amount: UtilDataConverter.getSpellPointTotal({totalSpellcastingLevels}),
      label: "Spell Points",
      resource: Config.getSpellPointsResource(),
    });
}

async _pImportEntry_pDoUpdateCharacter_spellcasting_spellPsiPoints_resource ({actUpdate, amount, label, resource}) {
  const propPathResource = (resource || "").trim().split(".");

  if (!propPathResource.length) {
    const msg = `Could not update ${label} total\u2014resource "${resource}" was not valid!`;
    console.warn(...LGT, msg);
    ui.notifications.warn(msg);
    return;
  }

  const propPathValue = [...propPathResource, "value"];
  const propPathMax = [...propPathResource, "max"];

  const actorData = (this._actor.system._source || this._actor.system);
  const curVal = MiscUtil.get(actorData, "system", ...propPathValue) || 0;
  const curMax = MiscUtil.get(actorData, "system", ...propPathMax) || 0;

  if (amount > curMax) {
    const deltaCur = (amount - curMax);
    MiscUtil.set(actUpdate, "system", ...propPathValue, curVal + deltaCur);
    MiscUtil.set(actUpdate, "system", ...propPathMax, amount);

    const propPathLabel = [...propPathResource, "label"];
    if (!MiscUtil.get(actorData, "system", ...propPathLabel)) {
      MiscUtil.set(actUpdate, "system", ...propPathLabel, label);
    }
  }
}

async _pImportEntry_pDoUpdateCharacter_psionics ({actUpdate, cls, sc, dataBuilderOpts, otherExistingClassItems, otherExistingSubclassItems}) {
  const {totalMysticLevels} = Charactermancer_Class_Util.getMysticProgression({cls, targetLevel: dataBuilderOpts.targetLevel, otherExistingClassItems, otherExistingSubclassItems});

      await this._pImportEntry_pDoUpdateCharacter_psionics_psiPoints({actUpdate, totalMysticLevels});
}

async _pImportEntry_pDoUpdateCharacter_psionics_psiPoints ({actUpdate, totalMysticLevels}) {
  if (!totalMysticLevels) return;
  return Config.get("importPsionic", "psiPointsResource") === ConfigConsts.C_SPELL_POINTS_RESOURCE__SHEET_ITEM
    ? UtilActors.pGetCreateActorPsiPointsItem({actor: this._actor, totalMysticLevels})
    : this._pImportEntry_pDoUpdateCharacter_spellcasting_spellPsiPoints_resource({
      actUpdate,
      amount: UtilDataConverter.getPsiPointTotal({totalMysticLevels}),
      label: "Psi Points",
      resource: Config.getPsiPointsResource(),
    });
}

async _pImportEntry_pDoUpdateCharacterHp ({actUpdate, cls, dataBuilderOpts}) {
  if (!dataBuilderOpts.isClassImport || !Charactermancer_Class_HpIncreaseModeSelect.isHpAvailable(cls)) return;

  const conMod = Parser.getAbilityModNumber(Charactermancer_Util.getCurrentAbilityScores(this._actor).con); 
              const isFirstHpGain = dataBuilderOpts.isIncludesLevelOne && dataBuilderOpts.proficiencyImportMode !== Charactermancer_Class_ProficiencyImportModeSelect.MODE_MULTICLASS;

  let hpIncrease = isFirstHpGain ? (cls.hd.number * cls.hd.faces) + conMod : 0;

  const numLevels = isFirstHpGain ? dataBuilderOpts.numLevels - 1 : dataBuilderOpts.numLevels;

  let hpIncreasePerLevel = null;
  if (isFirstHpGain) {
    hpIncreasePerLevel = {
      "1": "max",
    };
  }

  switch (dataBuilderOpts.hpIncreaseMode) {
    case ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__TAKE_AVERAGE: {
      const avg = Math.ceil(cls.hd.number * ((cls.hd.faces + 1) / 2));
      hpIncrease += numLevels * Math.max((avg + conMod), 1);

      hpIncreasePerLevel = hpIncreasePerLevel || {};
      for (
        let lvl = dataBuilderOpts.currentLevelThisClass + (isFirstHpGain ? 2 : 1);
        lvl <= dataBuilderOpts.targetLevelThisClass;
        ++lvl
      ) {
        hpIncreasePerLevel[`${lvl}`] = "avg";
      }

      break;
    }

    case ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__MIN:
    case ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__MAX: {
      const val = dataBuilderOpts.hpIncreaseMode === ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__MIN
        ? cls.hd.number
        : (cls.hd.number * cls.hd.faces);
      hpIncrease += numLevels * Math.max((val + conMod), 1);

      hpIncreasePerLevel = hpIncreasePerLevel || {};
      for (
        let lvl = dataBuilderOpts.currentLevelThisClass + (isFirstHpGain ? 2 : 1);
        lvl <= dataBuilderOpts.targetLevelThisClass;
        ++lvl
      ) {
        hpIncreasePerLevel[`${lvl}`] = val;
      }

      break;
    }

    case ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL:
    case ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL_CUSTOM: {
      const formulaRaw = dataBuilderOpts.hpIncreaseMode === ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL
        ? `${cls.hd.number}d${cls.hd.faces} + ${conMod}`
        : `${(dataBuilderOpts.hpIncreaseCustomRollFormula || "0")} + ${conMod}`;

              const formula = UtilDice.getReplacedCustomAttributes_class(formulaRaw, {cls});

      const rollData = this._actor.getRollData();

              try {
        const rollTest = new Roll(formula, rollData);
        await rollTest.evaluate({async: true});
      } catch (e) {
        hpIncrease = 0;
        hpIncreasePerLevel = null;
        ui.notifications.error(`Failed to evaluate HP increase formula "${formula}" ("${formulaRaw}")! ${VeCt.STR_SEE_CONSOLE}`);
        setTimeout(() => { throw e; });
        break;
      }

      hpIncreasePerLevel = hpIncreasePerLevel || {};
      try {
        for (
          let lvl = dataBuilderOpts.currentLevelThisClass + (isFirstHpGain ? 2 : 1);
          lvl <= dataBuilderOpts.targetLevelThisClass;
          ++lvl
        ) {
          const roll = new Roll(formula, rollData);
          await roll.evaluate({async: true});
          const hpIncreaseLvl = Math.max(roll.total, 1);
          hpIncrease += hpIncreaseLvl;
                      await roll.toMessage({
            flavor: `HP Increase (Level ${lvl})`,
            sound: null,
            speaker: {
              actor: this._actor.id,
              alias: this._actor.name,
              scene: null,
              token: null,
            },
          });

                      hpIncreasePerLevel[`${lvl}`] = hpIncreaseLvl - conMod;
        }
      } catch (e) {
        hpIncrease = 0;
        hpIncreasePerLevel = null;
        ui.notifications.error(`Failed to evaluate HP increase formula "${formula}" ("${formulaRaw}")! ${VeCt.STR_SEE_CONSOLE}`);
        setTimeout(() => { throw e; });
      }

      break;
    }

    case ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__DO_NOT_INCREASE: {
      hpIncrease = 0;
      hpIncreasePerLevel = null;
      break;
    }

    default: throw new Error(`Unhandled Hit Points increase mode "${dataBuilderOpts.hpIncreaseMode}"`);
  }

  if (hpIncrease) {
    const {value: curValue, max: curMax} = Charactermancer_Util.getBaseHp(this._actor);

    switch (dataBuilderOpts.proficiencyImportMode) {
      case Charactermancer_Class_ProficiencyImportModeSelect.MODE_MULTICLASS: {
        const hpCurNxt = curValue + hpIncrease;
        const hpMaxNxt = curMax == null ? null : curMax + hpIncrease;

        const isSetMaxHp = UtilActors.isSetMaxHp({actor: this._actor})
          || (
                          dataBuilderOpts.hpIncreaseMode !== ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__TAKE_AVERAGE
            || !dataBuilderOpts.shouldBeMulticlass
          );

        MiscUtil.set(actUpdate, "system", "attributes", "hp", "value", hpCurNxt);
        if (isSetMaxHp) MiscUtil.set(actUpdate, "system", "attributes", "hp", "max", hpMaxNxt);

        break;
      }

      case Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY: {
        const hpCurNxt = (isFirstHpGain ? 0 : curValue) + hpIncrease;
        const hpMaxNxt = curMax == null ? null : (isFirstHpGain ? 0 : curMax) + hpIncrease;

        const isSetMaxHp = UtilActors.isSetMaxHp({actor: this._actor})
          || (
                          dataBuilderOpts.hpIncreaseMode !== ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__TAKE_AVERAGE
            || dataBuilderOpts.shouldBeMulticlass
          );

        MiscUtil.set(actUpdate, "system", "attributes", "hp", "value", hpCurNxt);
        if (isSetMaxHp) MiscUtil.set(actUpdate, "system", "attributes", "hp", "max", hpMaxNxt);

        break;
      }

      case Charactermancer_Class_ProficiencyImportModeSelect.MODE_NONE: break;

      default: throw new Error(`Unknown proficiency import mode "${dataBuilderOpts.proficiencyImportMode}"`);
    }
  }

  return hpIncreasePerLevel;
}

async _pImportEntry_pDoUpdateCharacter_languages ({actUpdate, cls, dataBuilderOpts}) {
  await DataConverter.pFillActorLanguageData(
    MiscUtil.get(this._actor, "_source", "system", "traits", "languages"),
    cls.languageProficiencies,
    actUpdate.system,
    dataBuilderOpts,
  );
}

async _pImportEntry_pDoUpdateCharacter_pPopulateLevelOneProficienciesAndEquipment (actUpdate, cls, sc, dataBuilderOpts) {
  const out = {
    chosenProficiencies: {},
  };

      out.chosenProficiencies = await this._pImportEntry_pDoUpdateCharacter_pPopulateProficienciesFrom(actUpdate, cls.startingProficiencies, cls.proficiency, Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY, dataBuilderOpts);
  if (dataBuilderOpts.isCancelled) return;
  
      await this._pImportEntry_pDoUpdateCharacter_pPopulateEquipment(cls, dataBuilderOpts);
  if (dataBuilderOpts.isCancelled) return;
  
  return out;
}

async _pImportEntry_pDoUpdateCharacter_pPopulateProficienciesFrom (actUpdate, profs, savingThrowProfs, mode, dataBuilderOpts) {
  const out = {
    skills: {},
  };

      if (profs?.skills) {
    const skills = await DataConverter.pFillActorSkillData(
      MiscUtil.get(this._actor, "_source", "system", "skills"),
      profs.skills,
      actUpdate.system,
      dataBuilderOpts,
    );

    if (dataBuilderOpts.isCancelled) return out;

    out.skills = skills; 		}
  
      const toolProficiencies = Charactermancer_Class_Util.getToolProficiencyData(profs);
  if (toolProficiencies?.length) {
    await DataConverter.pFillActorToolData(
      MiscUtil.get(this._actor, "_source", "system", "tools"),
      toolProficiencies,
      actUpdate.system,
      dataBuilderOpts,
    );
    if (dataBuilderOpts.isCancelled) return out;
  }
  
      const formDataOtherProfs = await Charactermancer_Class_StartingProficiencies.pGetUserInput({
    mode,
    primaryProficiencies: mode === Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY ? profs : null,
    multiclassProficiencies: mode === Charactermancer_Class_ProficiencyImportModeSelect.MODE_MULTICLASS ? profs : null,
    savingThrowsProficiencies: savingThrowProfs,
    existingProficienciesFvttArmor: MiscUtil.get(this._actor, "_source", "system", "traits", "armorProf"),
    existingProficienciesFvttWeapons: MiscUtil.get(this._actor, "_source", "system", "traits", "weaponProf"),
    existingProficienciesFvttSavingThrows: Charactermancer_Class_StartingProficiencies.getExistingProficienciesFvttSavingThrows(this._actor),
  });
  if (formDataOtherProfs == null) return dataBuilderOpts.isCancelled = true;
  if (formDataOtherProfs === VeCt.SYM_UI_SKIP) return;

  Charactermancer_Class_StartingProficiencies.applyFormDataToActorUpdate(actUpdate, formDataOtherProfs);
  
  return out;
}

async _pImportEntry_pDoUpdateCharacter_pPopulateMulticlassProficiencies (actUpdate, cls, sc, dataBuilderOpts) {
  const out = {
    chosenProficiencies: {},
  };

  if (cls.multiclassing && cls.multiclassing.proficienciesGained) {
    out.chosenProficiencies = await this._pImportEntry_pDoUpdateCharacter_pPopulateProficienciesFrom(actUpdate, cls.multiclassing.proficienciesGained, null, Charactermancer_Class_ProficiencyImportModeSelect.MODE_MULTICLASS, dataBuilderOpts);
    if (dataBuilderOpts.isCancelled) return;
  }

  return out;
}

_getExistingClassItems (cls) { return Charactermancer_Class_Util.getExistingClassItems(this._actor, cls); }
_getExistingSubclassItems (cls, sc) { return Charactermancer_Class_Util.getExistingSubclassItems(this._actor, cls, sc); }

static _CurLevelMeta = class {
  constructor ({curLevel = 0, existingCLassItem = null, existingSubclassItem = null} = {}) {
    this.curLevel = curLevel;
    this.existingClassItem = existingCLassItem;
    this.existingSubclassItem = existingSubclassItem;
  }
};

async _pImportEntry_pGetCurLevelFillClassData (
  {actUpdate, cls, sc, importOpts, dataBuilderOpts, hpIncreasePerLevel},
) {
  const outCurLevelMeta = new this.constructor._CurLevelMeta();

  const proficiencyMeta = await this._pGetProficiencyMeta({actUpdate, cls, sc, dataBuilderOpts});
  if (dataBuilderOpts.isCancelled) return;

  const {existingClassItem, existingSubclassItem} = await this._pImportEntry_pGetUserExistingClassSubclassItem({cls, sc, dataBuilderOpts});
  if (dataBuilderOpts.isCancelled) return;

  dataBuilderOpts.classItem = existingClassItem;
  dataBuilderOpts.subclassItem = existingSubclassItem;
  outCurLevelMeta.existingClassItem = existingClassItem;
  outCurLevelMeta.existingSubclassItem = existingSubclassItem;

  await this._pImportEntry_pFillClassData({cls, sc, proficiencyMeta, outCurLevelMeta, importOpts, dataBuilderOpts, hpIncreasePerLevel});
  await this._pImportEntry_pFillSubclassData({cls, sc, proficiencyMeta, outCurLevelMeta, importOpts, dataBuilderOpts});

  return outCurLevelMeta;
}

async _pGetProficiencyMeta ({actUpdate, cls, sc, dataBuilderOpts}) {
  if (!dataBuilderOpts.isClassImport || !dataBuilderOpts.isIncludesLevelOne) return {};

  switch (dataBuilderOpts.proficiencyImportMode) {
    case Charactermancer_Class_ProficiencyImportModeSelect.MODE_MULTICLASS: {
      return this._pImportEntry_pDoUpdateCharacter_pPopulateMulticlassProficiencies(actUpdate, cls, sc, dataBuilderOpts);
    }
    case Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY: {
      return this._pImportEntry_pDoUpdateCharacter_pPopulateLevelOneProficienciesAndEquipment(actUpdate, cls, sc, dataBuilderOpts);
    }
    case Charactermancer_Class_ProficiencyImportModeSelect.MODE_NONE: {
      return {};
    }
    default: throw new Error(`Unknown proficiency import mode "${dataBuilderOpts.proficiencyImportMode}"`);
  }
}

  async _pImportEntry_pGetUserExistingClassSubclassItem ({cls, sc, dataBuilderOpts}) {
  const existingClassItems = this._getExistingClassItems(cls);
  const existingSubclassItems = this._getExistingSubclassItems(cls, sc);

  if (!existingClassItems.length && !existingSubclassItems.length) return {};

  const isChooseClass = cls && existingClassItems.length > 1;
  const isChooseSubclass = sc && existingSubclassItems.length > 1;

  if (isChooseClass && isChooseSubclass) {
    const [isDataEntered, classSubclassItemSelection] = await this._pGetUserClassSubclassItems({cls, sc, existingClassItems, existingSubclassItems});
    if (!isDataEntered) {
      dataBuilderOpts.isCancelled = true;
      return {};
    }
    return classSubclassItemSelection;
  }

  if (isChooseClass) {
    return {
      existingClassItem: await this._pGetUserClassSubclassItem({dataBuilderOpts, clsOrSc: cls, existingItems: existingClassItems, nameUnnamed: "(Unnamed Class)"}),
      existingSubclassItem: existingSubclassItems[0],
    };
  }

  if (isChooseSubclass) {
    return {
      existingClassItem: existingClassItems[0],
      existingSubclassItem: await this._pGetUserClassSubclassItem({dataBuilderOpts, clsOrSc: sc, existingItems: existingSubclassItems, nameUnnamed: "(Unnamed Subclass)"}),
    };
  }

  return {
    existingClassItem: existingClassItems[0],
    existingSubclassItem: existingSubclassItems[0],
  };
}

async _pImportEntry_pFillClassData ({cls, sc, proficiencyMeta, outCurLevelMeta, importOpts, dataBuilderOpts, hpIncreasePerLevel}) {
  if (DataConverterClass.isStubClass(cls)) return;

  const {existingClassItem} = outCurLevelMeta;

  const classItemData = await DataConverterClass.pGetDocumentJsonClass(
    cls,
    {
      sc,
      filterValues: importOpts.filterValues || this._pageFilter.filterBox.getValues(),
      startingSkills: proficiencyMeta.chosenProficiencies && proficiencyMeta.chosenProficiencies.skills
        ? Object.keys(proficiencyMeta.chosenProficiencies.skills)
        : [],
      proficiencyImportMode: dataBuilderOpts.proficiencyImportMode,
      level: dataBuilderOpts.targetLevel,
      isClsDereferenced: true,
      actor: this._actor,
      spellSlotLevelSelection: importOpts.spellSlotLevelSelection,
      hpAdvancementValue: this._pImportEntry_pFillClassData_getHpAdvancementValue({dataBuilderOpts, hpIncreasePerLevel}),
      taskRunner: importOpts.taskRunner,
      actorMultiImportHelper: importOpts.actorMultiImportHelper,
    },
  );

  if (existingClassItem) {
    let isUpdate = false;
    const update = {_id: existingClassItem.id};

    const description = classItemData.system.description.value;
    if (description && !(existingClassItem.system.description?.value || "").trim()) {
      isUpdate = true;
      MiscUtil.set(update, "system", "description", "value", description);
    }

    let curLevel = existingClassItem.system.levels;
    if (curLevel) {
      if (dataBuilderOpts.targetLevel > curLevel) {
        isUpdate = true;
        MiscUtil.set(update, "system", "levels", dataBuilderOpts.targetLevel);
      }
    }

          this._pImportEntry_pFillClassData_mutAdvancements({existingClassItem, update, classItemData});

          update.flags = {
      ...existingClassItem.flags,
      [SharedConsts.MODULE_ID]: {
        ...existingClassItem.flags?.[SharedConsts.MODULE_ID],
        ...classItemData.flags?.[SharedConsts.MODULE_ID],
      },
    };

    dataBuilderOpts.classItemUpdate = update;
    dataBuilderOpts.isPersistClassItemUpdate = dataBuilderOpts.isPersistClassItemUpdate || isUpdate;

    outCurLevelMeta.curLevel = curLevel || 0;
    outCurLevelMeta.existingClassItem = existingClassItem;
    return;
  }

      dataBuilderOpts.classItemToCreate = classItemData;
}

_pImportEntry_pFillClassData_getHpAdvancementValue ({dataBuilderOpts, hpIncreasePerLevel}) {
  if (dataBuilderOpts.hpIncreaseMode === ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__DO_NOT_INCREASE) return null;

  return hpIncreasePerLevel;
}

_pImportEntry_pFillClassData_mutAdvancements ({existingClassItem, update, classItemData}) {
  if (!classItemData.system.advancement?.length) return;
  if (!existingClassItem._source.system.advancement?.length) return;

  const advsHp = classItemData.system.advancement.filter(it => it.type === "HitPoints");
  if (!advsHp.length) return;
  if (advsHp.length > 1) return console.warn(...LGT, `Multiple "HitPoints"-type advancements found in class item data! This should never occur!`);
  const advHp = advsHp[0];

  const advsHpExisting = existingClassItem._source.system.advancement.filter(it => it.type === "HitPoints");
  if (!advsHpExisting.length) return;
  if (advsHpExisting.length > 1) return console.warn(...LGT, `Multiple "HitPoints"-type advancements found in existing class item data! This should never occur!`);
  const advHpExisting = advsHpExisting[0];

  const out = existingClassItem._source.system.advancement
    .filter(it => it.type !== "HitPoints");

  const cpyAdvHpExisting = MiscUtil.copyFast(advHpExisting);
  Object.entries(advHp.value || {})
    .forEach(([k, v]) => {
      cpyAdvHpExisting.value[k] = v;
    });
  out.push(cpyAdvHpExisting);

  MiscUtil.set(update, "system", "advancement", out);
}

async _pImportEntry_pFillSubclassData ({cls, sc, proficiencyMeta, outCurLevelMeta, importOpts, dataBuilderOpts}) {
  if (!sc || DataConverterClass.isStubSubclass(sc)) return;

  const {existingSubclassItem} = outCurLevelMeta;

  const subclassItemData = await DataConverterClass.pGetDocumentJsonSubclass(
    cls,
    sc,
    {
      filterValues: importOpts.filterValues || this._pageFilter.filterBox.getValues(),
      proficiencyImportMode: dataBuilderOpts.proficiencyImportMode,
      isScDereferenced: true,
      actor: this._actor,
      taskRunner: importOpts.taskRunner,
      actorMultiImportHelper: importOpts.actorMultiImportHelper,
    },
  );

  if (existingSubclassItem) {
    let isUpdate = false;
    const update = {_id: existingSubclassItem.id};

    const description = subclassItemData.system.description.value;
    if (description && !(existingSubclassItem.system.description?.value || "").trim()) {
      isUpdate = true;
      MiscUtil.set(update, "system", "description", "value", description);
    }

    dataBuilderOpts.subclassItemUpdate = update;
    dataBuilderOpts.isPersistSubclassItemUpdate = dataBuilderOpts.isPersistSubclassItemUpdate || isUpdate;

    return;
  }

  dataBuilderOpts.subclassItemToCreate = subclassItemData;
}

async _pGetUserClassSubclassItem ({dataBuilderOpts, clsOrSc, existingItems, nameUnnamed}) {
  const titlePart = clsOrSc.name || nameUnnamed;

  const ix = await InputUiUtil.pGetUserEnum({
    values: existingItems,
    placeholder: "Select Existing Item...",
    title: `Select Existing Item to Import ${titlePart} Levels To`,
    fnDisplay: fvIt => {
      if (fvIt == null) return `(Create New Item)`;
      return fvIt.name || nameUnnamed;
    },
    isAllowNull: true,
  });

  if (ix == null) {
    dataBuilderOpts.isCancelled = true;
    return null;
  }

  return existingItems[ix];
}

async _pGetUserClassSubclassItems ({cls, sc, existingClassItems, existingSubclassItems}) {
  const titlePart = `${cls.name || "(Unnamed class)"} (${sc.name || "(Unnamed subclass)"})`;

  const {$modalInner, doClose, pGetResolved, doAutoResize: doAutoResizeModal} = await UtilApplications.pGetShowApplicationModal({
    title: `Select Existing Items to Import ${titlePart} Levels To`,
  });
  const comp = BaseComponent.fromObject({ixItemClass: null, ixItemSubclass: null}, "*");

  const $btnOk = $(`<button class="ve-btn ve-btn-primary mr-2">OK</button>`)
    .click(async () => {
      const out = {
        existingClassItem: existingClassItems[comp._state.ixItemSubclass],
        existingSubclassItem: existingSubclassItems[comp._state.ixItemSubclass],
      };

      return doClose(true, out);
    });
  const $btnCancel = $(`<button class="ve-btn ve-btn-default">Cancel</button>`)
    .click(() => doClose(false));

  const $selClass = ComponentUiUtil.$getSelEnum(
    comp,
    "ixItemClass",
    {
      values: existingClassItems,
      fnDisplay: fvIt => fvIt == null ? `(Create New Item)` : (fvIt.name || "(Unnamed class)"),
      displayNullAs: "(Create New Item)",
      isAllowNull: true,
      isSetIndexes: true,
    },
  );

  const $selSubclass = ComponentUiUtil.$getSelEnum(
    comp,
    "ixItemSubclass",
    {
      values: existingSubclassItems,
      fnDisplay: fvIt => fvIt == null ? `(Create New Item)` : (fvIt.name || "(Unnamed subclass)"),
      displayNullAs: "(Create New Item)",
      isAllowNull: true,
      isSetIndexes: true,
    },
  );

  $$($modalInner)`<div class="ve-flex-col">
    <label class="split-v-center mb-2"><div class="no-shrink mr-2 w-100p ve-text-right">Class item</div>${$selClass}</label>
    <label class="split-v-center"><div class="no-shrink mr-2 w-100p ve-text-right">Subclass item</div>${$selSubclass}</label>
  </div>`;
  $$`<div class="ve-flex-v-center ve-flex-h-right no-shrink pb-1 pt-1 px-1">${$btnOk}${$btnCancel}</div>`.appendTo($modalInner);
  $selClass.focus();

  doAutoResizeModal();

  return pGetResolved();
}

async _pImportCasterCantrips (cls, sc, curLevel, importOpts, dataBuilderOpts) {
  if (cls._foundryIsSkipImportCantrips) return;

  const cantripProgressionMeta = Charactermancer_Spell_Util.getCasterCantripProgressionMeta({cls, sc, curLevel, targetLevel: dataBuilderOpts.targetLevel});
  if (!cantripProgressionMeta) return;

  const {maxCantripsHigh, deltaMaxCantrips} = cantripProgressionMeta;
  if (!deltaMaxCantrips || !maxCantripsHigh) return;

  const formData = await Charactermancer_Spell_Modal.pGetUserInput({
    actor: this._actor,
    existingClass: dataBuilderOpts.classItemUpdate ? cls : null,
    existingCasterMeta: Charactermancer_Spell_Util.getExistingCasterMeta({cls, sc, actor: this._actor, targetLevel: dataBuilderOpts.targetLevel}),
    spellDatas: (await Vetools.pGetAllSpells({isIncludeLoadedBrew: true, isIncludeLoadedPrerelease: true, isApplyBlocklist: true})).spell,
    className: cls.name,
    classSource: cls.source,
    brewClassSpells: cls.classSpells,
    subclassName: sc?.name,
    subclassSource: sc?.source,
    brewSubclassSpells: sc?.subclassSpells,
    brewSubSubclassSpells: sc?.subSubclassSpells,

    maxLevel: 0,
    maxLearnedCantrips: maxCantripsHigh,
  });
  if (!formData) return importOpts.isCancelled = true;
  if (formData === VeCt.SYM_UI_SKIP) return;

  await Charactermancer_Spell.pApplyFormDataToActor(
    this._actor,
    formData,
    {
      cls,
      sc,
      taskRunner: importOpts.taskRunner,
      actorMultiImportHelper: importOpts.actorMultiImportHelper,
    },
  );
}

async _pImportPreparedCasterSpells (cls, sc, curLevel, importOpts, dataBuilderOpts) {
  if (cls._foundryIsSkipImportPreparedSpells) return;

  const casterProgressionMeta = Charactermancer_Spell_Util.getCasterProgressionMeta({
    casterProgression: DataConverter.getMaxCasterProgression(cls.casterProgression, sc?.casterProgression),
    curLevel,
    targetLevel: dataBuilderOpts.targetLevel,
    isBreakpointsOnly: true,
  });
  if (!casterProgressionMeta) return;

  const {spellLevelLow, spellLevelHigh, deltaLevels} = casterProgressionMeta;

  const doImport = await InputUiUtil.pGetUserBoolean({
    title: `Populate Spellbook`,
    htmlDescription: `<p>Do you want to populate the spellbook for this class (for class level${deltaLevels === 1 ? "" : "s"} ${deltaLevels === 1 ? dataBuilderOpts.targetLevel : `${curLevel + 1}-${dataBuilderOpts.targetLevel}`})?</p>`,
    textYes: "Yes",
    textNo: "No",
  });

  if (!doImport) return;

  const isPrereleaseSource = sc ? PrereleaseUtil.hasSourceJson(sc.source) : PrereleaseUtil.hasSourceJson(cls.source);
  const isBrewSource = sc ? BrewUtil2.hasSourceJson(sc.source) : BrewUtil2.hasSourceJson(cls.source);
  const isUaSource = !isBrewSource && (isPrereleaseSource || (sc ? SourceUtil.isNonstandardSource(sc.source) : SourceUtil.isNonstandardSource(cls.source)));

  const allSpells = (await Vetools.pGetAllSpells({
    isFilterNonStandard: !isUaSource,
    additionalSourcesBrew: isPrereleaseSource
      ? this._getPrereleaseSpellSources(cls, sc)
      : isBrewSource
        ? this._getBrewSpellSources(cls, sc)
        : null,
    isApplyBlocklist: true,
  })).spell;

  const spellsToImport = await Charactermancer_Class_Util.pGetPreparableSpells(allSpells, cls, spellLevelLow, spellLevelHigh);
  if (!spellsToImport.length) return;

  const {ImportListSpell} = await Promise.resolve().then(function () { return ImportListSpell$1; });
  const importListSpell = new ImportListSpell({actor: this._actor});
  await importListSpell.pInit();

  for (const spell of spellsToImport) {
    const existingSpell = DataConverterSpell.getActorSpell(this._actor, spell.name, spell.source);
    if (existingSpell) continue;

    await importListSpell.pImportEntry(
      spell,
      {
        taskRunner: importOpts.taskRunner,
        actorMultiImportHelper: importOpts.actorMultiImportHelper,
        opts_pGetSpellItem: {
          ...(await UtilActors.pGetActorSpellItemOpts()),
          ability: dataBuilderOpts.spellcastingAbility,
        },
      },
    );
  }
}

_getPrereleaseSpellSources (cls, sc) { return this._getPrereleaseBrewSpellSources({cls, sc}); }
_getBrewSpellSources (cls, sc) { return this._getPrereleaseBrewSpellSources({cls, sc}); }

_getPrereleaseBrewSpellSources ({cls, sc}) {
  const out = new Set();

  if (!Parser.SOURCE_JSON_TO_ABV[cls.source]) out.add(cls.source);
  if (sc && !Parser.SOURCE_JSON_TO_ABV[sc.source]) out.add(sc.source);

  if (cls.classSpells) {
    cls.classSpells
      .filter(it => it.source && !Parser.SOURCE_JSON_TO_ABV[it.source])
      .forEach(({source}) => out.add(source));
  }
  if (sc && sc.subclassSpells) {
    sc.subclassSpells
      .filter(it => it.source && !Parser.SOURCE_JSON_TO_ABV[it.source])
      .forEach(({source}) => out.add(source));
  }

  return [...out];
}

async _pImportEntry_pFillItemArrayAdditionalSpells (cls, subclasses, curLevel, importOpts, dataBuilderOpts) {
      const casterProgressionMeta = Charactermancer_Spell_Util.getCasterProgressionMeta({casterProgression: cls.casterProgression, curLevel, targetLevel: dataBuilderOpts.targetLevel});

  const formData = await Charactermancer_AdditionalSpellsSelect.pGetUserInput({
    additionalSpells: cls.additionalSpells,
    sourceHintText: cls.name,
    modalFilterSpells: await Charactermancer_AdditionalSpellsSelect.pGetInitModalFilterSpells(),
    curLevel: curLevel,
    targetLevel: dataBuilderOpts.targetLevel,
    spellLevelLow: casterProgressionMeta ? casterProgressionMeta.spellLevelLow : null,
    spellLevelHigh: casterProgressionMeta ? casterProgressionMeta.spellLevelHigh : null,
    isStandalone: true,
  });

  if (formData == null) return dataBuilderOpts.isCancelled = true;
  if (formData !== VeCt.SYM_UI_SKIP) {
    await Charactermancer_AdditionalSpellsSelect.pApplyFormDataToActor(
      this._actor,
      formData,
      {
        taskRunner: importOpts.taskRunner,
        actorMultiImportHelper: importOpts.actorMultiImportHelper,
        abilityAbv: cls.spellcastingAbility,
      },
    );
  }
  
      for (const sc of subclasses) {
    const casterProgressionMeta = Charactermancer_Spell_Util.getCasterProgressionMeta({casterProgression: sc?.casterProgression || cls.casterProgression, curLevel, targetLevel: dataBuilderOpts.targetLevel});

    const formData = await Charactermancer_AdditionalSpellsSelect.pGetUserInput({
      additionalSpells: sc.additionalSpells,
      sourceHintText: sc.name,
      modalFilterSpells: await Charactermancer_AdditionalSpellsSelect.pGetInitModalFilterSpells(),
      curLevel: curLevel,
      targetLevel: dataBuilderOpts.targetLevel,
      spellLevelLow: casterProgressionMeta ? casterProgressionMeta.spellLevelLow : null,
      spellLevelHigh: casterProgressionMeta ? casterProgressionMeta.spellLevelHigh : null,
      isStandalone: true,
    });

    if (formData == null) return dataBuilderOpts.isCancelled = true;
    if (formData === VeCt.SYM_UI_SKIP) continue;

    await Charactermancer_AdditionalSpellsSelect.pApplyFormDataToActor(
      this._actor,
      formData,
      {
        taskRunner: importOpts.taskRunner,
        actorMultiImportHelper: importOpts.actorMultiImportHelper,
        abilityAbv: sc.spellcastingAbility,
      },
    );
  }
    }

async _pImportEntry_pHandleFeatures (cls, sc, allFeatures, selectedLevelIndices, importOpts, dataBuilderOpts) {
  if (cls._foundryAllFeatures) {
    await this._pImportEntry_pFillItemArrayPredefinedFeatures({
      allPreloadedFeatures: cls._foundryAllFeatures,
      cls,
      sc,
      importOpts,
      dataBuilderOpts,
    });
    this._pImportEntry_handleConDifference({
      conInitial: cls._foundryConInitial,
      conFinal: cls._foundryConFinal,
      isConPreApplied: true,
      dataBuilderOpts,
    });
    return;
  }

  const allChosenFeatures = allFeatures.filter(f => selectedLevelIndices.includes(f.level - 1));
  const fillMeta = await this._pImportEntry_pFillItemArrayFeatures(allChosenFeatures, importOpts, dataBuilderOpts);
  if (dataBuilderOpts.isCancelled) return;
  this._pImportEntry_handleConDifference({
    conInitial: fillMeta.conInitial,
    conFinal: fillMeta.conFinal,
    dataBuilderOpts,
  });
}

async _pImportEntry_pFillItemArrayPredefinedFeatures (
  {
    allPreloadedFeatures,
    cls,
    sc,
    importOpts,
    dataBuilderOpts,
  },
) {
  const {ImportListClassSubclassFeature} = await Promise.resolve().then(function () { return ImportListClassSubclassFeature$1; });
  const {ImportListOptionalfeature} = await Promise.resolve().then(function () { return ImportListOptionalfeature$1; });

  const importListClassFeature = new ImportListClassSubclassFeature({actor: this._actor});
  await importListClassFeature.pInit();

  const importListOptionalFeature = new ImportListOptionalfeature({actor: this._actor});
  await importListOptionalFeature.pInit();

  for (const loaded of allPreloadedFeatures) {
    if (loaded._foundryIsIgnoreFeature) continue;

    switch (loaded.type) {
      case "optionalfeature": {
        const importSummary = await importListOptionalFeature.pImportEntry(
          loaded.entity,
          {
            taskRunner: importOpts.taskRunner,
            actorMultiImportHelper: importOpts.actorMultiImportHelper,
            isCharactermancer: true,
            isLeaf: true,
          },
        );

        const importMetasWrapped = this.constructor._getLevelledEmbeddedDocuments({importSummary, level: loaded.entity.level});
        const tgt = loaded.entity?.ancestorSubclassName
          ? dataBuilderOpts.importedSubclassFeatureLevelledEmbeddedDocuments
          : dataBuilderOpts.importedClassFeatureLevelledEmbeddedDocuments;
        tgt.push(...importMetasWrapped);

        break;
      }
      case "classFeature": {
        const importSummary = await importListClassFeature.pImportEntry(
          loaded.entity,
          {
            taskRunner: importOpts.taskRunner,
            actorMultiImportHelper: importOpts.actorMultiImportHelper,
            isCharactermancer: true,
            isLeaf: true,
            spellcastingAbilityAbv: cls.spellcastingAbility,
          },
        );
        dataBuilderOpts.importedClassFeatureLevelledEmbeddedDocuments.push(
          ...this.constructor._getLevelledEmbeddedDocuments({importSummary, level: loaded.entity.level}),
        );
        break;
      }
      case "subclassFeature": {
        const importSummary = await importListClassFeature.pImportEntry(
          loaded.entity,
          {
            taskRunner: importOpts.taskRunner,
            actorMultiImportHelper: importOpts.actorMultiImportHelper,
            isCharactermancer: true,
            isLeaf: true,
            spellcastingAbilityAbv: sc?.spellcastingAbility,
          },
        );
        dataBuilderOpts.importedSubclassFeatureLevelledEmbeddedDocuments.push(
          ...this.constructor._getLevelledEmbeddedDocuments({importSummary, level: loaded.entity.level}),
        );
        break;
      }
      default: throw new Error(`Unhandled feature type "${loaded.type}"`);
    }
  }
}

async _pImportEntry_pFillItemArrayFeatures (allFeatures, importOpts, dataBuilderOpts) {
  const conInitial = Charactermancer_Util.getCurrentAbilityScores(this._actor).con;

  const existingFeatureChecker = new Charactermancer_Class_Util.ExistingFeatureChecker(this._actor);

  const {ImportListClassSubclassFeature} = await Promise.resolve().then(function () { return ImportListClassSubclassFeature$1; });
  const importListClassFeature = new ImportListClassSubclassFeature({actor: this._actor});
  await importListClassFeature.pInit();

  for (const feature of allFeatures) {
    const lowName = (feature.name || "").toLowerCase().trim();
    if (lowName === "ability score improvement") {
      const abilityScoreIncrease = new ImportListClass.AbilityScoreIncrease(this._actor, feature.level, dataBuilderOpts);
      abilityScoreIncrease.render(true);

      const feat = await abilityScoreIncrease.pWaitForUserInput(); 				if (feat) {
        const importListFeat = new ImportListFeat({actor: this._actor});
        await importListFeat.pImportEntry(
          feat,
          {
            taskRunner: importOpts.taskRunner,
            actorMultiImportHelper: importOpts.actorMultiImportHelper,
            isCharactermancer: importOpts.isCharactermancer,
          },
        );
      }
      continue;
    }

    if (feature.loadeds?.length) {
      feature.loadeds = feature.loadeds.filter(it => !it?._foundryIsIgnoreFeature);
      if (!feature.loadeds.length) continue;
    }

    const importSummary = await importListClassFeature.pImportEntry(
      feature,
      {
        taskRunner: importOpts.taskRunner,
        actorMultiImportHelper: importOpts.actorMultiImportHelper,
        isCharactermancer: importOpts.isCharactermancer,
        isPreLoadedFeature: true,
        featureEntriesPageFilter: this._pageFilter,
        featureEntriesPageFilterValues: importOpts.filterValues || this._pageFilter.filterBox.getValues(),
        existingFeatureChecker,
        spellcastingAbilityAbv: dataBuilderOpts.spellcastingAbility,
      },
    );
    if (dataBuilderOpts.isCancelled) return;
    const importMetasWrapped = this.constructor._getLevelledEmbeddedDocuments({importSummary, level: feature.level});

    if (feature.classFeature) {
      dataBuilderOpts.importedClassFeatureLevelledEmbeddedDocuments.push(...importMetasWrapped);
    } else if (feature.subclassFeature) {
      dataBuilderOpts.importedSubclassFeatureLevelledEmbeddedDocuments.push(...importMetasWrapped);
    } else {
      console.warn(...LGT, `Class/subclass feature had neither "classFeature" nor "subclassFeature" set! This should never occur!`);
    }
  }

  if (dataBuilderOpts.isCancelled) return;

  const conFinal = Charactermancer_Util.getCurrentAbilityScores(this._actor).con;
  return {conInitial, conFinal};
}

static _getLevelledEmbeddedDocuments ({importSummary, level}) {
  return (importSummary.imported || [])
    .filter(importMeta => importMeta.embeddedDocument)
    .map(importMeta => new UtilAdvancements.LevelledEmbeddedDocument_MinLevel1({
      embeddedDocument: importMeta.embeddedDocument,
      level: level,
    }));
}

_pImportEntry_handleConDifference ({conInitial, conFinal, dataBuilderOpts, isConPreApplied}) {
  if (conInitial == null || conFinal == null || conFinal === conInitial) return;

  const modOld = Parser.getAbilityModNumber(conInitial);
  const modNew = Parser.getAbilityModNumber(conFinal);
  const hpIncrease = (dataBuilderOpts.numLevelsPrev + (isConPreApplied ? 0 : dataBuilderOpts.numLevels)) * (modNew - modOld);

  const {value: curValue, max: curMax} = Charactermancer_Util.getBaseHp(this._actor);

  const hpCurNxt = curValue + hpIncrease;
  const hpMaxNxt = curMax == null ? null : curMax + hpIncrease;

  MiscUtil.set(dataBuilderOpts.actorUpdate, "system", "attributes", "hp", "value", hpCurNxt);
  if (UtilActors.isSetMaxHp({actor: this._actor})) MiscUtil.set(dataBuilderOpts.actorUpdate, "system", "attributes", "hp", "max", hpMaxNxt);
}

async _pImportEntry_pAddUpdateClassItem (cls, sc, importOpts, dataBuilderOpts) {
  for (const {dataBuilderProp, dataBuilderPropOut} of [
    {
      dataBuilderProp: "classItemToCreate",
      dataBuilderPropOut: "classItem",
    },
    {
      dataBuilderProp: "subclassItemToCreate",
      dataBuilderPropOut: "subclassItem",
    },
  ]) {
    if (!dataBuilderOpts[dataBuilderProp]) continue;

    const importedEmbeds = await UtilDocuments.pCreateEmbeddedDocuments(
      this._actor,
      [dataBuilderOpts[dataBuilderProp]],
      {
        ClsEmbed: Item,
        isRender: !importOpts.isBatched,
                  keepId: true,
        keepEmbeddedIds: true,
                },
    );
    dataBuilderOpts[dataBuilderPropOut] = DataConverter.getImportedEmbed(importedEmbeds, dataBuilderOpts[dataBuilderProp])?.document;
  }

  const toPersistClassSubclassItemUpdates = [
    dataBuilderOpts.isPersistClassItemUpdate ? dataBuilderOpts.classItemUpdate : null,
    dataBuilderOpts.isPersistSubclassItemUpdate ? dataBuilderOpts.subclassItemUpdate : null,
  ].filter(Boolean);

  if (toPersistClassSubclassItemUpdates.length) {
    await UtilDocuments.pUpdateEmbeddedDocuments(
      this._actor,
      toPersistClassSubclassItemUpdates,
      {
        ClsEmbed: Item,
      },
    );
  }

  if (
    dataBuilderOpts.proficiencyImportMode === Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY
    && dataBuilderOpts.classItem?.id
  ) {
    MiscUtil.set(dataBuilderOpts.actorUpdate, "system", "details", "originalClass", dataBuilderOpts.classItem.id);
  }
}

async _pImportEntry_pAddUnarmedStrike ({importOpts}) {
  if (!Config.get(this._configGroup, "isAddUnarmedStrike")) return;

  const actorItems = MiscUtil.get(this._actor, "items") || [];
      const isExisting = actorItems.some(it => it.name.split("(")[0].trim().toLowerCase() === ImportListClass._ITEM_NAME_UNARMED_STRIKE.toLowerCase());
  if (isExisting) return;

  const dataUnarmed = {
    name: "Unarmed Strike",
    source: Parser.SRC_PHB,
    page: 149,
    srd: true,
    type: Parser.ITM_TYP__MELEE_WEAPON,
    rarity: "none",
    weaponCategory: "simple",
    foundrySystem: {
      "equipped": true,
      "damage.parts": [
        [
          "1 + @mod",
          "bludgeoning",
        ],
      ],
      "ability": "str",
    },
  };

  const {ChooseImporter} = await Promise.resolve().then(function () { return ChooseImporter$1; });
  const importer = ChooseImporter.getImporter("item", {actor: this._actor});
  await importer.pInit();
  await importer.pImportEntry(
    dataUnarmed,
    {
      taskRunner: importOpts.taskRunner,
      actorMultiImportHelper: importOpts.actorMultiImportHelper,
    },
  );
}

async _pImportEntry_pAddAdvancements (dataBuilderOpts) {
  if (dataBuilderOpts.importedClassFeatureLevelledEmbeddedDocuments.length) {
    await UtilAdvancements.pAddItemGrantAdvancementLinks({
      actor: this._actor,
      parentEmbeddedDocument: dataBuilderOpts.classItem,
      childLevelledEmbeddedDocuments: dataBuilderOpts.importedClassFeatureLevelledEmbeddedDocuments,
    });
  }

  if (dataBuilderOpts.importedSubclassFeatureLevelledEmbeddedDocuments.length) {
    await UtilAdvancements.pAddItemGrantAdvancementLinks({
      actor: this._actor,
      parentEmbeddedDocument: dataBuilderOpts.subclassItem,
      childLevelledEmbeddedDocuments: dataBuilderOpts.importedSubclassFeatureLevelledEmbeddedDocuments,
    });
  }
}

async _pImportEntry_pFinalise (importOpts, dataBuilderOpts) {
      if (dataBuilderOpts.formDataEquipment?.data?.currency) MiscUtil.set(dataBuilderOpts.actorUpdate, "system", "currency", dataBuilderOpts.formDataEquipment.data.currency);

  await this._pDoMergeAndApplyActorUpdate(dataBuilderOpts.actorUpdate);

      await Charactermancer_StartingEquipment.pImportEquipmentItemEntries(
    this._actor,
    dataBuilderOpts.formDataEquipment,
    {
      taskRunner: importOpts.taskRunner,
      actorMultiImportHelper: importOpts.actorMultiImportHelper,
    },
  );

      if (dataBuilderOpts.effects.length) throw new Error(`Class active effects should be populated on the class itself! This is a bug!`);

      if (
    Config.get("importSpell", Config.getSpellPointsKey({actorType: this._actor?.type})) === ConfigConsts.C_SPELL_POINTS_MODE__ENABLED_AND_UNLIMITED_SLOTS
  ) {
    if (!UtilActors.hasActorSpellPointSlotEffect({actor: this._actor})) {
      await UtilDocuments.pCreateEmbeddedDocuments(
        this._actor,
        UtilActors.getActorSpellPointsSlotsEffectData({actor: this._actor, sheetIem: dataBuilderOpts.classItem}),
        {ClsEmbed: ActiveEffect, isRender: !importOpts.isBatched},
      );
    }
    Object.assign(
      dataBuilderOpts.postItemActorUpdate,
      foundry.utils.flattenObject(UtilActors.getActorSpellPointsSlotsUpdateSys()),
    );
  }

      Util.trimObject(dataBuilderOpts.postItemActorUpdate);
  if (Object.keys(dataBuilderOpts.postItemActorUpdate).length) await UtilDocuments.pUpdateDocument(this._actor, dataBuilderOpts.postItemActorUpdate);

      await UtilActors.pLinkTempUuids({actor: this._actor});
}

  async _pValidateUserLevelIndices (indices, dataBuilderOpts) {
      if (indices.length > 1) return;

      if (indices[0] === 0) return;

      const existingClassItems = this._actor.items.filter(it => it.type === "class");
  if (existingClassItems.length) return;

  const singleLevel = indices[0] + 1;
  const isSelectMissing = await InputUiUtil.pGetUserBoolean({
    title: "Import Lower Levels?",
    htmlDescription: `You have selected a single level to import (level ${singleLevel}). Would you like to import level${singleLevel === 2 ? "" : "s"} ${singleLevel === 2 ? "1" : `1-${singleLevel - 1}`} too?`,
    textYes: `Import Levels 1-${singleLevel}`,
    textNo: `Import Level ${singleLevel}`,
  });

  if (isSelectMissing == null) {
    dataBuilderOpts.isCancelled = true;
    return;
  }

  if (isSelectMissing) {
    const maxIndex = indices[0];
    for (let i = 0; i <= maxIndex; ++i) {
      indices[i] = i;
    }
  }
}

async _pImportEntry_pDoUpdateCharacter_pPopulateEquipment (cls, dataBuilderOpts) {
  if (!cls.startingEquipment) return;

  const startingEquipment = new Charactermancer_StartingEquipment({
    actor: this._actor,
    startingEquipment: cls.startingEquipment,
    appSubTitle: cls.name,
    equiSpecialSource: cls.source,
    equiSpecialPage: cls.page,
  });
  const formData = await startingEquipment.pWaitForUserInput();
  if (formData == null) return dataBuilderOpts.isCancelled = true;
  if (formData === VeCt.SYM_UI_SKIP) return;

  dataBuilderOpts.formDataEquipment = formData;
}

static _DEFAULT_FILTER_VALUES = null;

static async pGetDefaultFilterValues () {
  if (this._DEFAULT_FILTER_VALUES) return MiscUtil.copyFast(this._DEFAULT_FILTER_VALUES);
  const modalFilterClasses = new ModalFilterClasses({namespace: `${ModalFilterClasses.name}.default`});
  await modalFilterClasses.pPreloadHidden();
  this._DEFAULT_FILTER_VALUES = modalFilterClasses.pageFilter.filterBox.getValues();
  return MiscUtil.copyFast(this._DEFAULT_FILTER_VALUES);
}

_getAsTag (listItem) {
  const cls = this._content.class[listItem.data.ixClass];
  const sc = cls.subclasses[listItem.data.ixSubclass];

  const ptId = DataUtil.generic.packUid(cls, "class");
  return `@class[${ptId}]`;

                                }
}
ImportListClass._AE_LABEL_BASE_AC = "Base/Unarmored AC";
ImportListClass._ITEM_NAME_UNARMED_STRIKE = "Unarmed Strike";

ImportListClass.ImportEntryOpts = class extends ImportListCharacter.ImportEntryOpts {
  constructor (opts) {
  super(opts);
  opts = opts || {};

  this.isClassImport = !!opts.isClassImport;

  this.actorUpdate = {}; 		this.postItemActorUpdate = {}; 
  this.classItemToCreate = null;
  this.classItemUpdate = null;
  this.isPersistClassItemUpdate = false;

  this.subclassItemToCreate = null;
  this.subclassItemUpdate = null;
  this.isPersistSubclassItemUpdate = false;

  this.classItem = null;
  this.subclassItem = null;

  this.formDataEquipment = null;

  this.targetLevel = null; 		this.numLevels = null; 		this.numLevelsPrev = null; 		this.isIncludesLevelOne = null;
  this.proficiencyImportMode = null;
  this.shouldBeMulticlass = null; 		this.hpIncreaseMode = null;
  this.hpIncreaseCustomRollFormula = null;

  this.importedClassFeatureLevelledEmbeddedDocuments = [];
  this.importedSubclassFeatureLevelledEmbeddedDocuments = [];
}

get currentLevelThisClass () {
  return this.targetLevel - this.numLevels;
}

get targetLevelThisClass () {
  return this.targetLevel;
}
};

/* ImportListClass.AbilityScoreIncrease = class extends Application {
constructor (actor, level, dataBuilderOpts) {
  super({
    title: `Ability Score Improvement\u2014Level ${level}`,
    template: `${SharedConsts.MODULE_LOCATION}/template/ImportListClassAbilityScoreIncrease.hbs`,
    width: 640,
    resizable: true,
  });

  this._dataBuilderOpts = dataBuilderOpts;

  this._resolve = null;
  this._reject = null;
  this._pUserInput = new Promise((resolve, reject) => {
    this._resolve = resolve;
    this._reject = reject;
  });

  this._comp = new ImportListClass.AbilityScoreIncrease.Component(
    actor,
    dataBuilderOpts,
    this.close.bind(this),
  );
}

activateListeners ($html) {
  this._comp.render($html);
}

async close () {
  await super.close();
  if (!this._comp.isDataEntered) this._dataBuilderOpts.isCancelled = true;
  this._resolve(this._comp.getFeat());
}

pWaitForUserInput () { return this._pUserInput; }
}; */
/* ImportListClass.AbilityScoreIncrease.Component = class extends BaseComponent {
constructor (actor, dataBuilderOpts, fnClose) {
  super();
  this._actor = actor;
  this._dataBuilderOpts = dataBuilderOpts;
  this._fnClose = fnClose;

  this._isDataEntered = false;

  Object.assign(
    this.__state,
    Charactermancer_Util.getBaseAbilityScores(this._actor),
  );
}

get isDataEntered () { return this._isDataEntered; }

render ($html) {
  const $btnShowTabAsi = $(`<button class="ve-btn ve-btn-5et ve-btn-default w-50">Ability Score Improvement</button>`)
    .click(() => this._state.mode = "ability");
  const $btnShowTabFeat = $(`<button class="ve-btn ve-btn-5et ve-btn-default w-50">Feat</button>`)
    .click(() => this._state.mode = "feat");

  const $wrpTabAsi = $(`<div class="ve-flex-col w-100 h-100"></div>`);
  const $wrpTabFeat = $(`<div class="ve-flex-col w-100 h-100"></div>`);

  const hkMode = () => {
    const isAbilityMode = this._state.mode === "ability";
    $btnShowTabAsi.toggleClass("active", isAbilityMode);
    $btnShowTabFeat.toggleClass("active", !isAbilityMode);
    $wrpTabAsi.toggleVe(isAbilityMode);
    $wrpTabFeat.toggleVe(!isAbilityMode);
  };
  hkMode();
  this._addHookBase("mode", hkMode);

  this._render_ability($wrpTabAsi);
  this._render_feat($wrpTabFeat);

  $$($html)`<div class="ve-flex-col w-100 h-100">
    <div class="ve-flex no-shrink ve-btn-group mb-1">${$btnShowTabAsi}${$btnShowTabFeat}</div>
    ${$wrpTabAsi}
    ${$wrpTabFeat}
  </div>`;
}

_render_ability ($wrpTabAsi) {
  const rowMetas = [
    "str",
    "dex",
    "con",
    "int",
    "wis",
    "cha",
  ].map(abil => {
    const $dispCur = $(`<div class="ve-col-2 ve-text-center"></div>`);
    const $dispCurMod = $(`<div class="ve-col-2 ve-text-center"></div>`);
    const hkBase = () => {
      $dispCur.text(this._state[abil]);
      $dispCurMod.text(Parser.getAbilityModifier(this._state[abil]));
    };
    this._addHookBase(abil, hkBase);
    hkBase();

    const propBonus = `${abil}Bonus`;
    const {$wrp: $wrpBonus, $ipt: $iptBonus} = ComponentUiUtil.$getIptNumber(
      this,
      propBonus,
      0,
      {
        min: 0,
        fallbackOnNaN: 0,
        html: `<input type="text" class="ve-text-center form-control w-100" placeholder="0">`,
        asMeta: true,
        decorationRight: "ticker",
        decorationLeft: "spacer",
      },
    );
    $iptBonus.click(() => $iptBonus.select());

    const $dispTotal = $(`<div class="ve-col-2 ve-text-center"></div>`);
    const $dispTotalMod = $(`<div class="ve-col-2 ve-text-center"></div>`);
    const hkBonus = () => {
      const scoreTotal = this._state[abil] + this._state[propBonus];
      $dispTotal.text(scoreTotal);
      $dispTotalMod.text(Parser.getAbilityModifier(scoreTotal));
      $dispTotal.toggleClass("veapp__msg-error", scoreTotal > 20).title(scoreTotal > 20 ? `You can't increase an ability score above 20 using this feature.` : "");
    };
    this._addHookBase(propBonus, hkBonus);
    hkBonus();

    const $row = $$`<div class="ve-flex-v-center w-100 my-1">
      <div class="ve-col-1 ve-text-right bold">${abil.toUpperCase()}</div>
      ${$dispCur}
      ${$dispCurMod}
      <div class="ve-col-2">${$wrpBonus}</div>
      <div class="ve-col-1 ve-text-center">=</div>
      ${$dispTotal}
      ${$dispTotalMod}
    </div>`;

    return {
      $row,
      $iptBonus,
    };
  });

  const $dispRemain = $(`<div class="ve-text-center" title="Remaining"></div>`);

  const hkBonuses = () => {
    const totalBonuses = [
      "strBonus",
      "dexBonus",
      "conBonus",
      "intBonus",
      "wisBonus",
      "chaBonus",
    ].map(prop => this._state[prop]).reduce((a, b) => a + b, 0);

    const isInvalid = totalBonuses > 2;

    $dispRemain.text(`Remaining: ${2 - totalBonuses}`).toggleClass("veapp__msg-error", isInvalid);
    rowMetas.forEach(it => it.$iptBonus.toggleClass("form-control--error", isInvalid));
  };
  [
    "strBonus",
    "dexBonus",
    "conBonus",
    "intBonus",
    "wisBonus",
    "chaBonus",
  ].forEach(prop => this._addHookBase(prop, hkBonuses));
  hkBonuses();

  const $btnAcceptAsi = $(`<button class="ve-btn ve-btn-primary mr-2">Confirm</button>`)
    .click(async () => {
      const total = [
        this._state.strBonus,
        this._state.dexBonus,
        this._state.conBonus,
        this._state.intBonus,
        this._state.wisBonus,
        this._state.chaBonus,
      ].reduce((a, b) => a + b, 0);
      if (total !== 2) return ui.notifications.error(`Please enter a combination of ability score changes which adds up to two!`);

      await this._pDoResolve(true);
    });

  const $btnSkipAsi = $(`<button class="ve-btn ve-btn-default mr-3">Skip</button>`)
    .click(() => this._pDoResolve(VeCt.SYM_UI_SKIP));

  $$($wrpTabAsi)`
  <div class="ve-flex w-100 my-1 bold">
    <div class="ve-text-center ve-col-1"></div>
    <div class="ve-text-center ve-col-2">Current</div>
    <div class="ve-text-center ve-col-2 ve-muted">Mod</div>
    <div class="ve-text-center ve-col-2 ve-text-center">${$dispRemain}</div>
    <div class="ve-text-center ve-col-1"></div>
    <div class="ve-text-center ve-col-2">Result</div>
    <div class="ve-text-center ve-col-2 ve-muted">Mod</div>
  </div>
  <div class="ve-flex-col w-100 h-100">
    ${rowMetas.map(it => it.$row)}
  </div>
  <div class="ve-flex-v-center ve-flex-h-right w-100">${$btnAcceptAsi}${$btnSkipAsi}</div>
  `;
}

_render_feat ($wrpTabFeat) {
  const $btnSelectFeat = $(`<button class="ve-btn ve-btn-5et ve-btn-default w-100 mr-2">Choose Feat</button>`)
    .click(async () => {
      const featData = await ImportListFeat.UserChoose.pGetUserChoice(
        {
          id: "feats-classAbilityScoreIncrease",
          name: "Feats",
          singleName: "Feat",
          DataPipelinesList: DataPipelinesListFeat,

          wizardTitleWindow: "Select Source",
          wizardTitlePanel3: "Configure and Open List",
          wizardTitleButtonOpenImporter: "Open List",
        },
        "classAbilityScoreIncrease",
      );
      if (!featData) return;

      const {page, source, hash} = MiscUtil.get(featData, "flags", SharedConsts.MODULE_ID) || {};
      if (!page || !source || !hash) return;

      this._state.feat = await DataLoader.pCacheAndGet(page, source, hash);
    });

  const $dispFeat = $(`<div></div>`);
  const hkFeat = () => {
    $dispFeat.empty();

    if (!this._state.feat) return;
    $dispFeat.html(`<hr class="hr-1"><h3 class="mb-2 mt-0 b-0">Selected: ${this._state.feat.name}</h3>`);

    $dispFeat.empty();
    $$($dispFeat)`<hr class="hr-1">
    ${Renderer.hover.$getHoverContent_stats(UrlUtil.PG_FEATS, MiscUtil.copyFast(this._state.feat))}`;
  };
  hkFeat();
  this._addHookBase("feat", hkFeat);

  const $btnAcceptFeat = $(`<button class="ve-btn ve-btn-5et ve-btn-primary">Confirm</button>`)
    .click(async () => {
      if (!this._state.feat) return ui.notifications.error(`Please select a feat!`);
      await this._pDoResolve(true);
    });

  const $btnSkipFeat = $(`<button class="ve-btn ve-btn-5et ve-btn-default">Skip</button>`)
    .click(() => this._pDoResolve(VeCt.SYM_UI_SKIP));

  $$($wrpTabFeat)`
  <div class="ve-flex-col h-100">
    <div class="ve-flex-v-center mb-1">
      ${$btnSelectFeat}
      <div class="ve-flex-v-center ve-btn-group">${$btnAcceptFeat}${$btnSkipFeat}</div>
    </div>
    ${$dispFeat}
  </div>
  `;
}

async _pDoResolve (isOutput) {
  if (!isOutput) return this._fnClose();

  if (isOutput === VeCt.SYM_UI_SKIP) {
    this._isDataEntered = true;
    return this._fnClose();
  }

  const actUpdate = this._getActorUpdate();
  if (actUpdate) {
    this._isDataEntered = true;
    await UtilDocuments.pUpdateDocument(this._actor, actUpdate);
  }

  if (this.getFeat()) {
    this._isDataEntered = true;
  }

  this._fnClose();
}

_getActorUpdate () {
  if (this._state.mode !== "ability") return null;
  return {
    system: {
      abilities: {
        str: {value: this._state.str + this._state.strBonus},
        dex: {value: this._state.dex + this._state.dexBonus},
        con: {value: this._state.con + this._state.conBonus},
        int: {value: this._state.int + this._state.intBonus},
        wis: {value: this._state.wis + this._state.wisBonus},
        cha: {value: this._state.cha + this._state.chaBonus},
      },
    },
  };
}

getFeat () {
  if (this._state.mode !== "feat") return null;
  return MiscUtil.copyFast(this._state.feat);
}

_getDefaultState () {
  return {
    mode: "ability",

    str: 0,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 0,
    strBonus: 0,
    dexBonus: 0,
    conBonus: 0,
    intBonus: 0,
    wisBonus: 0,
    chaBonus: 0,

    feat: null,
  };
}
}; */

var ImportListClass$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ImportListClass: ImportListClass
});

ImportListClass.Utils = class {
    static getDedupedData({ allContentMerged: allContentMerged }) {
      allContentMerged = MiscUtil.copy(allContentMerged);
      Object.entries(allContentMerged).forEach(([propName, value]) => {
        if (propName !== "class") {
          return;
        }
        if (!(value instanceof Array)) {
          return;
        }
        const contentHolder = [];
        const hashSet = new Set();
        value.forEach(obj => {
          const classHash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_CLASSES](obj);
          if (hashSet.has(classHash)) {
            if (obj.subclasses?.length) {
              const existingClass = contentHolder.find(cls => UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_CLASSES](cls) === classHash);
              (existingClass.subclasses = existingClass.subclasses || []).push(...obj.subclasses);
            }
            return;
          }
          hashSet.add(classHash);
          contentHolder.push(obj);
        });
        allContentMerged[propName] = contentHolder;
      });
      return allContentMerged;
    }
    static getBlocklistFilteredData({ dedupedAllContentMerged: dedupedAllContentMerged }) {
      dedupedAllContentMerged = { ...dedupedAllContentMerged};
      Object.entries(dedupedAllContentMerged).forEach(([propName, value]) => {
        if (propName !== 'class') { return; }
        if (!(value instanceof Array)) {
          return;
        }
        const filteredClasses = value.filter(obj => {
          if (obj.source === VeCt.STR_GENERIC) {
            return false;
          }
          return !ExcludeUtil.isExcluded(UrlUtil.URL_TO_HASH_BUILDER['class'](obj), 'class', obj.source, {
            'isNoCount': true
          });
        });
        filteredClasses.forEach(cls => {
          if (!cls.classFeatures) {
            return;
          }
          cls.classFeatures = cls.classFeatures.filter(f => !ExcludeUtil.isExcluded(f.hash, "classFeature", f.source, {
            'isNoCount': true
          }));
        });
        filteredClasses.forEach(cls => {
          if (!cls.subclasses) {
            return;
          }
          cls.subclasses = cls.subclasses.filter(sc => {
            if (sc.source === VeCt.STR_GENERIC) {
              return false;
            }
            return !ExcludeUtil.isExcluded(UrlUtil.URL_TO_HASH_BUILDER.subclass(sc), 'subclass', sc.source, {
              'isNoCount': true
            });
          });
          cls.subclasses.forEach(sc => {
            if (!sc.subclassFeatures) {
              return;
            }
            sc.subclassFeatures = sc.subclassFeatures.filter(f => !ExcludeUtil.isExcluded(f.hash, "subclassFeature", f.source, {
              'isNoCount': true
            }));
          });
        });
        dedupedAllContentMerged[propName] = filteredClasses;
      });
      return dedupedAllContentMerged;
    }
};
//#endregion
//#region ImportListFeature
class ImportListFeature extends ImportListCharacter {
  static init () {
  throw new Error(`Unimplemented!`);
}

constructor (...args) {
  super(...args);

  this._modalFilterSpells = new ModalFilterSpells({namespace: `${this.constructor.name}.spells`, isRadio: true});
}

async pInit () {
  if (await super.pInit()) return true;

  await this._modalFilterSpells.pPreloadHidden();
}

async _pImportEntry (feature, importOpts, dataOpts) {
  importOpts ||= new ImportOpts();

  if (!this._actor) {
    const dereferenced = await this.constructor._DataConverter.pGetDereferencedFeatureItem(feature);
    return super._pImportEntry(dereferenced, importOpts, dataOpts);
  }

  if (importOpts.isLeaf) {
          if (importOpts.isSkippableLeaf && feature.entries?.[0]?.type === "options" && feature.entries?.length === 1) {
      return new ImportSummary({
        status: ConstsTaskRunner.TASK_EXIT_SKIPPED_OTHER,
        entity: feature,
      });
    }

    const out = await super._pImportEntry(feature, importOpts, dataOpts);

          await UtilActors.pLinkTempUuids({actor: this._actor});

    return out;
  }

  const pageFilter = importOpts.isPreLoadedFeature
    ? importOpts.featureEntriesPageFilter
    : this._pageFilter;
  const filterValues = importOpts.isPreLoadedFeature
    ? (importOpts.featureEntriesPageFilterValues)
    : (importOpts.filterValues || (await this._pGetPageFilterValues()));

      let allFeatures;
  if (importOpts.isPreLoadedFeature) {
    allFeatures = [feature];
  }
  else {
    const wrappedFeature = await this.constructor._DataConverter.pGetInitFeatureLoadeds(feature, {actor: this._actor});
    allFeatures = [wrappedFeature];
  }

  allFeatures = Charactermancer_Util.getFilteredFeatures(
    allFeatures,
    pageFilter,
    filterValues,
  );

      if (!allFeatures.length) return ImportSummary.cancelled({entity: feature});

  allFeatures = Charactermancer_Util.getImportableFeatures(allFeatures);

  Charactermancer_Util.doApplyFilterToFeatureEntries_bySource(
    allFeatures,
    pageFilter,
    filterValues,
  );

  const allFeaturesGrouped = Charactermancer_Util.getFeaturesGroupedByOptionsSet(allFeatures);
  const actorUpdate = {};

  const importSummariesSub = [];

  for (const topLevelFeatureMeta of allFeaturesGrouped) {
    const {topLevelFeature, optionsSets} = topLevelFeatureMeta;

    for (let ixOptionSet = 0; ixOptionSet < optionsSets.length; ++ixOptionSet) {
      const optionsSet = optionsSets[ixOptionSet];

      const formDataOptionSet = await Charactermancer_FeatureOptionsSelect.pGetUserInput({
        actor: this._actor,
        optionsSet,
        level: topLevelFeature.level,
        existingFeatureChecker: importOpts.existingFeatureChecker,
        isSkipCharactermancerHandled: importOpts.isCharactermancer,
        modalFilterSpells: this._modalFilterSpells,
      });

      if (!formDataOptionSet) return ImportSummary.cancelled({entity: feature});
      if (formDataOptionSet === VeCt.SYM_UI_SKIP) continue;

      await Charactermancer_FeatureOptionsSelect.pDoApplyResourcesFormDataToActor({
        actor: this._actor,
        formData: formDataOptionSet,
      });

      await Charactermancer_FeatureOptionsSelect.pDoApplySensesFormDataToActor({
        actor: this._actor,
        actorUpdate,
        formData: formDataOptionSet,
        configGroup: this._configGroup,
      });

      for (const loaded of (formDataOptionSet.data?.features || [])) {
        const {entity, type} = loaded;

                  const cpyEntity = MiscUtil.copyFast(entity);
        delete cpyEntity.additionalSpells;

        const isSkippableLeaf = ixOptionSet === 0 && optionsSets.length > 1;

        switch (type) {
          case "classFeature":
          case "subclassFeature": {
            const importResult = await this.pImportEntry(cpyEntity, new ImportOpts({...importOpts, isLeaf: true, isSkippableLeaf}));
            if (importResult?.status === ConstsTaskRunner.TASK_EXIT_CANCELLED) return importResult;
            importSummariesSub.push(importResult);
            break;
          }

          case "optionalfeature": {
            const importResult = await this._pImportEntry_pHandleGenericFeatureIndirect({
              ClassName: "ImportListOptionalfeature",
              propInstance: "_IMPORT_LIST_OPTIONAL_FEATURE",
              importOpts,
              cpyEntity,
              isSkippableLeaf,
            });
            if (importResult?.status === ConstsTaskRunner.TASK_EXIT_CANCELLED) return importResult;
            importSummariesSub.push(importResult);
            break;
          }

          case "feat": {
            const importResult = await this._pImportEntry_pHandleGenericFeatureIndirect({
              ClassName: "ImportListFeat",
              propInstance: "_IMPORT_LIST_FEAT",
              importOpts,
              cpyEntity,
              isSkippableLeaf,
            });
            if (importResult?.status === ConstsTaskRunner.TASK_EXIT_CANCELLED) return importResult;
            importSummariesSub.push(importResult);
            break;
          }

          case "reward": {
            const importResult = await this._pImportEntry_pHandleGenericFeatureIndirect({
              ClassName: "ImportListReward",
              propInstance: "_IMPORT_LIST_REWARD",
              importOpts,
              cpyEntity,
              isSkippableLeaf,
            });
            if (importResult?.status === ConstsTaskRunner.TASK_EXIT_CANCELLED) return importResult;
            importSummariesSub.push(importResult);
            break;
          }

          case "charoption": {
            const importResult = await this._pImportEntry_pHandleGenericFeatureIndirect({
              ClassName: "ImportListCharCreationOption",
              propInstance: "_IMPORT_LIST_CHAR_CREATION_OPTION",
              importOpts,
              cpyEntity,
              isSkippableLeaf,
            });
            if (importResult?.status === ConstsTaskRunner.TASK_EXIT_CANCELLED) return importResult;
            importSummariesSub.push(importResult);
            break;
          }

                      default: {
            const importResult = await this._pImportEntry_pHandleGenericFeatureIndirect({
              ClassName: this.constructor.name,
              importOpts,
              cpyEntity,
              isSkippableLeaf,
            });
            if (importResult?.status === ConstsTaskRunner.TASK_EXIT_CANCELLED) return importResult;
            importSummariesSub.push(importResult);
            break;
          }
        }

                  if (importOpts.existingFeatureChecker) importOpts.existingFeatureChecker.addImportFeature(loaded.page, loaded.source, loaded.hash);
      }

      await Charactermancer_FeatureOptionsSelect.pDoApplyProficiencyFormDataToActorUpdate(
        this._actor,
        actorUpdate,
        formDataOptionSet,
      );

      await Charactermancer_FeatureOptionsSelect.pDoApplyAdditionalSpellsFormDataToActor({
        taskRunner: importOpts.taskRunner,
        actorMultiImportHelper: importOpts.actorMultiImportHelper,
        actor: this._actor,
        formData: formDataOptionSet,
        abilityAbv: importOpts.spellcastingAbilityAbv,
      });
    }
  }

  await this._pDoMergeAndApplyActorUpdate(actorUpdate);

  return new ImportSummary({
    status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
    imported: [
      ...importSummariesSub
        .filter(Boolean)
        .map(it => it.imported)
        .filter(Boolean)
        .flat(),
    ],
    entity: feature,
  });
}

async _pImportEntry_pHandleGenericFeatureIndirect (
  {
    ClassName,
    propInstance,
    importOpts,
    cpyEntity,
    isSkippableLeaf,
  },
) {
  const isDirectCall = this.constructor.name === ClassName;

  if (!isDirectCall && !propInstance) throw new Error(`Importer instance property must be specified for indirect calls! This is a bug!`);

  if (!isDirectCall && (!ImportListFeature[propInstance] || ImportListFeature[propInstance].actor !== this._actor)) {
          if (!ClassName.startsWith("ImportList")) throw new Error(`Expected importer to start with "ImportList"!`);
    const {[ClassName]: Clazz} = await __variableDynamicImportRuntime0__(`./ImportList${ClassName.replace(/^ImportList/, "")}.js`);
    
    ImportListFeature[propInstance] = new Clazz({actor: this._actor});
    await ImportListFeature[propInstance].pInit();
  }

  const importer = isDirectCall ? this : ImportListFeature[propInstance];

  const nxtImportOpts = new ImportOpts({...importOpts, isLeaf: true, isSkippableLeaf});
  if (importer !== this) {
    delete nxtImportOpts.filterValues;
    delete nxtImportOpts.existingFeatureChecker;
  }

  return importer.pImportEntry(cpyEntity, nxtImportOpts);
}

async _pGetPageFilterValues () {
      if (!this._pageFilter.filterBox) await this._pageFilter.pInitFilterBox();
  return this._pageFilter.filterBox.getValues();
}

async _pImportEntry_pImportToActor (entity, importOpts) {
      const actUpdate = {system: {}};

  const dataBuilderOpts = new ImportListFeature.ImportEntryOpts({
    chosenAbilityScoreIncrease: entity._foundryChosenAbilityScoreIncrease,
    isCharactermancer: !!importOpts.isCharactermancer,
  });

  await this._pImportEntry_pImportToActor_fillFlags(entity, actUpdate, importOpts);
  await this._pImportEntry_pFillAbilities(entity, actUpdate, dataBuilderOpts);
  if (dataBuilderOpts.isCancelled) return ImportSummary.cancelled({entity});

      const importedEmbeds = await this._pImportEntry_pFillItems(entity, actUpdate, importOpts, dataBuilderOpts);
  if (dataBuilderOpts.isCancelled) return ImportSummary.cancelled({entity});

      if (Object.keys(actUpdate.system).length) await UtilDocuments.pUpdateDocument(this._actor, actUpdate);

      await this._pImportEntry_pImportToActor_pAddSubEntities({ent: entity, importOpts});

  if (this._actor.isToken) this._actor.sheet.render();

          const importedOut = importedEmbeds
    .filter(it => it.document)
    .map(it => new ImportedDocument({
      name: it.document.name,
      actor: this._actor,
      isExisting: it.isUpdate,
      embeddedDocument: it.document,
    }));
  if (!importedOut.length) {
    importedOut.push(new ImportedDocument({
      name: entity.name,
      actor: this._actor,
    }));
  }

  return new ImportSummary({
    status: ConstsTaskRunner.TASK_EXIT_COMPLETE,
    imported: importedOut,
    entity,
  });
    }

_pImportEntry_pImportToActor_fillFlags (feature, actor, importOpts) {
  const flags = {};
  const flagsDnd5e = {};

  this._doPopulateFlags({feature, actor, importOpts});

  if (Object.keys(flagsDnd5e).length) flags[SharedConsts.SYSTEM_ID_DND5E] = flagsDnd5e;
  if (Object.keys(flags).length) actor.flags = flags;
}

_doPopulateFlags ({feature, actor, importOpts, flags, flagsDnd5e}) {  }

async _pImportEntry_pFillAbilities (feature, actUpdate, dataBuilderOpts) {
  const formData = await Charactermancer_AbilityScoreSelect.pFillActorAbilityData(this._actor, feature.ability, actUpdate, dataBuilderOpts);
  if (dataBuilderOpts.isCancelled) return;

      if (formData == null) return;
  dataBuilderOpts.chosenAbilityScoreIncrease = formData.data;
}

async _pImportEntry_pFillItems (feature, actUpdate, importOpts, dataBuilderOpts) {
  await this.constructor._DataConverter.pMutActorUpdateFeature(this._actor, actUpdate, feature, dataBuilderOpts);
  if (dataBuilderOpts.isCancelled) return;

  const spellHashToItemPosMap = {};

  await this._pImportEntry_pHandleAdditionalSpells(feature, actUpdate, importOpts, dataBuilderOpts, spellHashToItemPosMap);
  if (dataBuilderOpts.isCancelled) return;

  const tagHashItemIdMap = {};
  Object.entries(spellHashToItemPosMap)
    .forEach(([hash, id]) => MiscUtil.set(tagHashItemIdMap, "spell", hash, id));

  await DescriptionRenderer.pGetWithDescriptionPlugins(
    async () => {
      const featureItem = await this.constructor._DataConverter.pGetDocumentJson(
        feature,
        {
          actor: this._actor,
          taskRunner: importOpts.taskRunner,
          actorMultiImportHelper: importOpts.actorMultiImportHelper,
        },
      );
      dataBuilderOpts.items.push(featureItem);
      return featureItem;
    },
    {
      actorId: this._actor.id,
      tagHashItemIdMap,
    },
  );

  return UtilDocuments.pCreateEmbeddedDocuments(
    this._actor,
    dataBuilderOpts.items,
    {ClsEmbed: Item, isRender: !importOpts.isBatched},
  );
}

async _pImportEntry_pHandleAdditionalSpells (feature, actUpdate, importOpts, dataBuilderOpts, spellHashToItemPosMap) {
  const maxAbilityScoreIncrease = Object.entries(dataBuilderOpts.chosenAbilityScoreIncrease || {})
    .sort(([, vA], [, vB]) => SortUtil.ascSort(vB, vA));
  const parentAbilityAbv = maxAbilityScoreIncrease?.[0]?.[0] || null;

  const formData = await Charactermancer_AdditionalSpellsSelect.pGetUserInput({
    additionalSpells: feature.additionalSpells,
    sourceHintText: feature.name,
    modalFilterSpells: await Charactermancer_AdditionalSpellsSelect.pGetInitModalFilterSpells(),

          curLevel: 0,
    targetLevel: Consts.CHAR_MAX_LEVEL,
    spellLevelLow: 0,
    spellLevelHigh: 9,
  });

  if (formData == null) return dataBuilderOpts.isCancelled = true;
  if (formData === VeCt.SYM_UI_SKIP) return;

  const totalClassLevels = UtilActors.getTotalClassLevels(this._actor);
  await Charactermancer_AdditionalSpellsSelect.pApplyFormDataToActor(
    this._actor,
    formData,
    {
      taskRunner: importOpts.taskRunner,
      actorMultiImportHelper: importOpts.actorMultiImportHelper,
      parentAbilityAbv: parentAbilityAbv,
    },
  );
}
}
ImportListFeature._IMPORT_LIST_FEAT = null;
ImportListFeature._IMPORT_LIST_OPTIONAL_FEATURE = null;
ImportListFeature._IMPORT_LIST_REWARD = null;
ImportListFeature._IMPORT_LIST_CHAR_CREATION_OPTION = null;

ImportListFeature.ImportEntryOpts = class extends ImportListCharacter.ImportEntryOpts {
constructor (opts) {
  opts = opts || {};
  super(opts);

  this.chosenAbilityScoreIncrease = opts.chosenAbilityScoreIncrease;
}
};

var ImportListFeature$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  ImportListFeature: ImportListFeature
});

class ImportListClassSubclassFeature extends ImportListFeature {
  static init () {
  this._initCreateSheetItemHook({
    prop: "classFeature",
    importerName: "Class Feature",
  });
  this._initCreateSheetItemHook({
    prop: "subclassFeature",
    importerName: "Subclass Feature",
  });
}

static get ID () { return "classes-subclasses-features"; }
static get DISPLAY_NAME_TYPE_SINGLE () { return "Class or Subclass Feature"; }
static get DISPLAY_NAME_TYPE_PLURAL () { return "Class & Subclass Features"; }
static get PROPS () { return ["classFeature", "subclassFeature"]; }

static _ = ImplementationRegistryImportList.get().register(this);

_titleSearch = "class and subclass feature";
_sidebarTab = "items";
_gameProp = "items";
_defaultFolderPath = ["Class & Subclass Features"];
//_pageFilter = new PageFilterClassFeatures();
_page = UrlUtil.PG_CLASS_SUBCLASS_FEATURES;
_listInitialSortBy = "className";
_isPreviewable = true;
_configGroup = "importClassSubclassFeature";
//_fnListSort = PageFilterClassFeatures.sortClassFeatures;
static _DataConverter = DataConverterClassSubclassFeature;
static _DataPipelinesList = DataPipelinesListClassSubclassFeature;

constructor (...args) {
  super(...args);

  this._contentDereferenced = null;
}

_colWidthName = 5;
_colWidthSource = 1;

_getData_cols_other () {
  return [
    {
      name: "Class",
      width: 2,
      field: "className",
    },
    {
      name: "Subclass",
      width: 2,
      field: "subclassShortName",
    },
    {
      name: "Level",
      width: 1,
      field: "level",
      rowClassName: "ve-text-center",
    },
  ];
}

_getData_row_mutGetAdditionalValues ({it, ix}) {
  return {
    className: it.className,
    subclassShortName: it.subclassShortName || "\u2014",
    level: it.level,
  };
}

_renderInner_absorbListItems_fnGetValues (it) {
  return {
    ...super._renderInner_absorbListItems_fnGetValues(it),
    className: it.className,
    subclassShortName: it.subclassShortName || "",
    level: it.level,
  };
}

_renderInner_initPreviewButton (item, btnShowHidePreview) {
  ListUiUtil.bindPreviewButton(this._page, this._contentDereferenced, item, btnShowHidePreview);
}


getFolderPathMeta () {
  return {
    ...super.getFolderPathMeta(),
    class: {
      label: "Class",
      getter: it => it.className,
    },
    subclassShortName: {
      label: "Subclass",
      getter: it => it.subclassShortName || "\u2014",
    },
    level: {
      label: "Level",
      getter: it => it.level,
    },
  };
}

async pSetContent (val) {
  await super.pSetContent(val);
  this._contentDereferenced = await this._content
    .pMap(feature => DataConverterClassSubclassFeature.pGetDereferencedFeatureItem(feature));
}


async _pHandleClickRunButton_pGetSelectedListItems () {
  const listItems = await super._pHandleClickRunButton_pGetSelectedListItems();

  if (Config.get(this._configGroup, "deduplicateRefSelectionMode") === ConfigConsts.C_IMPORT_CLASS_FEATURE_MODE_ALLOW) return listItems;

  const refHashes = new Set();
  const handlers = {
    object: (obj) => {
      switch (obj.type) {
        case "refClassFeature": {
          const unpacked = DataUtil.class.unpackUidClassFeature(obj.classFeature);
          refHashes.add(UrlUtil.URL_TO_HASH_BUILDER["classFeature"](unpacked));
          break;
        }
        case "refSubclassFeature": {
          const unpacked = DataUtil.class.unpackUidSubclassFeature(obj.subclassFeature);
          refHashes.add(UrlUtil.URL_TO_HASH_BUILDER["subclassFeature"](unpacked));
          break;
        }
      }
      return obj;
    },
  };

  listItems
    .forEach(li => {
      const entry = this._content[li.ix];
      if (!entry?.entries) return;

      UtilDataConverter.WALKER_READONLY_GENERIC
        .walk(entry.entries, handlers);
    });

  const listItemsDeduped = listItems
    .filter(li => {
      const entry = this._content[li.ix];

      const hash = UrlUtil.URL_TO_HASH_BUILDER[entry.__prop](entry);
      return !refHashes.has(hash);
    });

  const lenDelta = listItems.length - listItemsDeduped.length;

  if (
    !lenDelta
    || Config.get(this._configGroup, "deduplicateRefSelectionMode") === ConfigConsts.C_IMPORT_CLASS_FEATURE_MODE_DEDUPLICATE
  ) return listItemsDeduped;

      if (Config.get(this._configGroup, "deduplicateRefSelectionMode") !== ConfigConsts.C_IMPORT_CLASS_FEATURE_MODE_PROMPT) throw new Error(`Unhandled "deduplicateRefSelectionMode"!`);

  const isDedupe = await InputUiUtil.pGetUserBoolean({
    title: `Duplicate Features Selected`,
    htmlDescription: `You have selected ${lenDelta} feature${lenDelta === 1 ? "" : "s"} which ${lenDelta === 1 ? "is" : "are"} included in ${lenDelta === 1 ? "another" : "other"} selected feature${lenDelta === 1 ? "" : "s"}.<br>Do you wish to continue?`,
    textYesRemember: "Deduplicate and Remember",
    textYes: "Deduplicate",
    textNo: "Continue",
    fnRemember: val => {
      if (val === true) Config.set(this._configGroup, "deduplicateRefSelectionMode", ConfigConsts.C_IMPORT_CLASS_FEATURE_MODE_DEDUPLICATE);
    },
  });
  if (isDedupe == null) return null;

  return isDedupe ? listItemsDeduped : listItems;
}


_getAsTag (listItem) {
  const tag = Parser.getPropTag(this._content[listItem.ix].__prop);
  const ptUid = this._getUid(this._content[listItem.ix]);
  return `@${tag}[${ptUid}]`;
}

_getUid (feature) {
  switch (feature.__prop) {
    case "classFeature": return DataUtil.class.packUidClassFeature(feature);
    case "subclassFeature": return DataUtil.class.packUidSubclassFeature(feature);
    default: throw new Error(`Unhandled feature prop "${feature.__prop}"`);
  }
}
}
//ImportListClassSubclassFeature.UserChoose = class extends MixinUserChooseImporter(ImportListClassSubclassFeature) {};

var ImportListClassSubclassFeature$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ImportListClassSubclassFeature: ImportListClassSubclassFeature
});
//#endregion
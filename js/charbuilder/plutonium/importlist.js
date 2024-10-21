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

class ImportListClass{
    //THIS IS A STUB
}

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


  async pImportEntry (ent, importOpts, dataOpts = {}) {
  return new ImportEntryManager({
    instance: this,
    ent,
    importOpts,
    dataOpts,
  }).pImportEntry();
}


  async _pImportEntry (ent, importOpts, dataOpts) {
  importOpts ||= new ImportOpts();

  console.log(...LGT, `Importing ${this._titleSearch} "${ent.name}" (from "${Parser.sourceJsonToAbv(ent.source)}")`);

  if (this.constructor._DataConverter.isStubEntity(ent)) return ImportSummary.completedStub({entity: ent});

  ent = await this._pGetCustomizedEntity({ent});

  Renderer.get().setFirstSection(true).resetHeaderIndex();

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
  if (this._actor) return this._pImportEntry_pImportToActor(ent, importOpts, dataOpts);
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

async _pImportEntry_pImportToDirectoryGeneric (toImport, importOpts, dataOpts = {}, {docData = null, isSkipDuplicateHandling = false} = {}) {
  docData = docData || await this._pImportEntry_pImportToDirectoryGeneric_pGetImportableData(
    toImport,
    {
      isAddDataFlags: true, 				filterValues: importOpts.filterValues,
      ...dataOpts,
      isAddDefaultOwnershipFromConfig: importOpts.isAddDefaultOwnershipFromConfig ?? true,
      defaultOwnership: importOpts.defaultOwnership,
      userOwnership: importOpts.userOwnership,
    },
    importOpts,
  );

      const duplicateMeta = isSkipDuplicateHandling
    ? null
    : this._getDuplicateMeta({
      name: docData.name,
      sourceIdentifier: UtilDocumentSource.getDocumentSourceIdentifierString({doc: docData}),
      flags: this._getDuplicateCheckFlags(docData),
      importOpts,
      entity: toImport,
    });
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

              if (this._pack) {
    if (duplicateMeta?.isOverwrite) {
      return this._pImportEntry_pDoUpdateExistingPackEntity({
        entity: toImport,
        duplicateMeta,
        docData,
        importOpts,
      });
    }

    const instance = new Clazz(docData);
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

  return this._pImportEntry_pImportToDirectoryGeneric_toDirectory({
    duplicateMeta,
    docData,
    toImport,
    isSkipDuplicateHandling,
    Clazz,
    importOpts,
  });
}

async _pImportEntry_pImportToDirectoryGeneric_toDirectory (
  {
    duplicateMeta,
    docData,
    toImport,
    isSkipDuplicateHandling = false,
    Clazz,
    folderType = null,
    importOpts,
  },
) {
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

      const matchingItem = this._actor.items.contents.find(sheetItem => {
    if (sheetItem.type !== itemData.type) return false;

    if (!MiscUtil.isNearStrictlyEqual(sheetItem.system.container, this._container?.id)) return false;

    const isMatchingSource = !Config.get("import", "isStrictMatching")
      || (UtilDocumentSource.getDocumentSource(sheetItem).source || "").toLowerCase() === (UtilDocumentSource.getDocumentSource(itemData).source || "").toLowerCase();
    if (!isMatchingSource) return false;

    if (sheetItem.name.toLowerCase().trim() === itemData.name.toLowerCase().trim()) return true;

    return UtilEntityItem.getEntityAliases(item, {isStrict: true})
      .some(entAlias => entAlias.name.toLowerCase().trim() === sheetItem.name.toLowerCase().trim());
  });
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


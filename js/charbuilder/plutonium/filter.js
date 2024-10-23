//#region FilterBox
//TEMP ProxyBase seems to just be a MixedProxyBase
class FilterBox extends ProxyBase
//extends ProxyBase
{
    static TITLE_BTN_RESET = "Reset filters. SHIFT to reset everything.";

    static selectFirstVisible(entryList) {
        if (Hist.lastLoadedId == null && !Hist.initialLoad) {
            Hist._freshLoad();
        }

    }

    constructor(opts) {
        super();

        this._$iptSearch = opts.$iptSearch;
        this._$wrpFormTop = opts.$wrpFormTop;
        this._$btnReset = opts.$btnReset;
        this._$btnOpen = opts.$btnOpen;
        this._$wrpMiniPills = opts.$wrpMiniPills;
        this._$btnToggleSummaryHidden = opts.$btnToggleSummaryHidden;
        this._filters = opts.filters;
        this._isCompact = opts.isCompact;
        this._namespace = opts.namespace;

        this._doSaveStateThrottled = MiscUtil.throttle(()=>this._pDoSaveState(), 50);
        this.__meta = this._getDefaultMeta();
        if (this._isCompact)
            this.__meta.isSummaryHidden = true;

        this._meta = this._getProxy("meta", this.__meta);
        this.__minisHidden = {};
        this._minisHidden = this._getProxy("minisHidden", this.__minisHidden);
        this.__combineAs = {};
        this._combineAs = this._getProxy("combineAs", this.__combineAs);
        this._modalMeta = null;
        this._isRendered = false;

        this._cachedState = null;

        this._compSearch = BaseComponent.fromObject({
            search: ""
        });
        this._metaIptSearch = null;

        this._filters.forEach(f=>f.filterBox = this);

        this._eventListeners = {};
    }

    get filters() {
        return this._filters;
    }

    teardown() {
        this._filters.forEach(f=>f._doTeardown());
        if (this._modalMeta)
            this._modalMeta.doTeardown();
    }

    on(identifier, fn) {
        const [eventName,namespace] = identifier.split(".");
        (this._eventListeners[eventName] = this._eventListeners[eventName] || []).push({
            namespace,
            fn
        });
        return this;
    }

    off(identifier, fn=null) {
        const [eventName,namespace] = identifier.split(".");
        this._eventListeners[eventName] = (this._eventListeners[eventName] || []).filter(it=>{
            if (fn != null)
                return it.namespace !== namespace || it.fn !== fn;
            return it.namespace !== namespace;
        }
        );
        if (!this._eventListeners[eventName].length)
            delete this._eventListeners[eventName];
        return this;
    }

    fireChangeEvent() {
        this._doSaveStateThrottled();
        this.fireEvent(FilterBox.EVNT_VALCHANGE);
    }

    fireEvent(eventName) {
        (this._eventListeners[eventName] || []).forEach(it=>it.fn());
    }

    _getNamespacedStorageKey() {
        return `${FilterBox._STORAGE_KEY}${this._namespace ? `.${this._namespace}` : ""}`;
    }
    getNamespacedHashKey(k) {
        return `${k || "_".repeat(FilterUtil.SUB_HASH_PREFIX_LENGTH)}${this._namespace ? `.${this._namespace}` : ""}`;
    }

    async pGetStoredActiveSources() {
        const stored = await StorageUtil.pGetForPage(this._getNamespacedStorageKey());
        if (stored) {
            const sourceFilterData = stored.filters[FilterBox.SOURCE_HEADER];
            if (sourceFilterData) {
                const state = sourceFilterData.state;
                const blue = [];
                const white = [];
                Object.entries(state).forEach(([src,mode])=>{
                    if (mode === 1)
                        blue.push(src);
                    else if (mode !== -1)
                        white.push(src);
                }
                );
                if (blue.length)
                    return blue;
                else
                    return white;
            }
        }
        return null;
    }

    registerMinisHiddenHook(prop, hook) {
        this._addHook("minisHidden", prop, hook);
    }

    isMinisHidden(header) {
        return !!this._minisHidden[header];
    }

    async pDoLoadState() {
        const toLoad = await StorageUtil.pGetForPage(this._getNamespacedStorageKey());
        if (toLoad == null)
            return;
        this._setStateFromLoaded(toLoad, {
            isUserSavedState: true
        });
    }

    _setStateFromLoaded(state, {isUserSavedState=false}={}) {
        state.box = state.box || {};
        this._proxyAssign("meta", "_meta", "__meta", state.box.meta || {}, true);
        this._proxyAssign("minisHidden", "_minisHidden", "__minisHidden", state.box.minisHidden || {}, true);
        this._proxyAssign("combineAs", "_combineAs", "__combineAs", state.box.combineAs || {}, true);
        this._filters.forEach(it=>it.setStateFromLoaded(state.filters, {
            isUserSavedState
        }));
    }

    _getSaveableState() {
        const filterOut = {};
        this._filters.forEach(it=>Object.assign(filterOut, it.getSaveableState()));
        return {
            box: {
                meta: {
                    ...this.__meta
                },
                minisHidden: {
                    ...this.__minisHidden
                },
                combineAs: {
                    ...this.__combineAs
                },
            },
            filters: filterOut,
        };
    }

    async _pDoSaveState() {
        await StorageUtil.pSetForPage(this._getNamespacedStorageKey(), this._getSaveableState());
    }

    trimState_() {
        this._filters.forEach(f=>f.trimState_());
    }

    render() {
        if (this._isRendered) {
            this._filters.map(f=>f.update());
            return;
        }
        this._isRendered = true;

        if (this._$wrpFormTop || this._$wrpMiniPills) {
            if (!this._$wrpMiniPills) {
                this._$wrpMiniPills = $(`<div class="fltr__mini-view btn-group"></div>`).insertAfter(this._$wrpFormTop);
            } else {
                this._$wrpMiniPills.addClass("fltr__mini-view");
            }
        }

        if (this._$btnReset) {
            this._$btnReset.title(FilterBox.TITLE_BTN_RESET).click((evt)=>this.reset(evt.shiftKey));
        }

        if (this._$wrpFormTop || this._$btnToggleSummaryHidden) {
            if (!this._$btnToggleSummaryHidden) {
                this._$btnToggleSummaryHidden = $(`<button class="btn ve-btn-default ${this._isCompact ? "p-2" : ""}" title="Toggle Filter Summary"><span class="glyphicon glyphicon-resize-small"></span></button>`).prependTo(this._$wrpFormTop);
            } else if (!this._$btnToggleSummaryHidden.parent().length) {
                this._$btnToggleSummaryHidden.prependTo(this._$wrpFormTop);
            }
            this._$btnToggleSummaryHidden.click(()=>{
                this._meta.isSummaryHidden = !this._meta.isSummaryHidden;
                this._doSaveStateThrottled();
            }
            );
            const summaryHiddenHook = ()=>{
                this._$btnToggleSummaryHidden.toggleClass("active", !!this._meta.isSummaryHidden);
                this._$wrpMiniPills.toggleClass("ve-hidden", !!this._meta.isSummaryHidden);
            }
            ;
            this._addHook("meta", "isSummaryHidden", summaryHiddenHook);
            summaryHiddenHook();
        }

        if (this._$wrpFormTop || this._$btnOpen) {
            if (!this._$btnOpen) {
                this._$btnOpen = $(`<button class="btn ve-btn-default ${this._isCompact ? "px-2" : ""}">Filter</button>`).prependTo(this._$wrpFormTop);
            } else if (!this._$btnOpen.parent().length) {
                this._$btnOpen.prependTo(this._$wrpFormTop);
            }
            this._$btnOpen.click(()=>this.show());
        }

        const sourceFilter = this._filters.find(it=>it.header === FilterBox.SOURCE_HEADER);
        if (sourceFilter) {
            const selFnAlt = (val)=>!SourceUtil.isNonstandardSource(val) && !PrereleaseUtil.hasSourceJson(val) && !BrewUtil2.hasSourceJson(val);
            const hkSelFn = ()=>{
                if (this._meta.isBrewDefaultHidden)
                    sourceFilter.setTempFnSel(selFnAlt);
                else
                    sourceFilter.setTempFnSel(null);
                sourceFilter.updateMiniPillClasses();
            }
            ;
            this._addHook("meta", "isBrewDefaultHidden", hkSelFn);
            hkSelFn();
        }

        if (this._$wrpMiniPills)
            this._filters.map((f,i)=>f.$renderMinis({
                filterBox: this,
                isFirst: i === 0,
                $wrpMini: this._$wrpMiniPills
            }));
    }

    async _render_pRenderModal() {
        this._isModalRendered = true;

        this._modalMeta = await UiUtil.pGetShowModal({
            isHeight100: true,
            isWidth100: true,
            isUncappedHeight: true,
            isIndestructible: true,
            isClosed: true,
            isEmpty: true,
            title: "Filter",
            cbClose: (isDataEntered)=>this._pHandleHide(!isDataEntered),
        });

        const $children = this._filters.map((f,i)=>f.$render({
            filterBox: this,
            isFirst: i === 0,
            $wrpMini: this._$wrpMiniPills
        }));

        this._metaIptSearch = ComponentUiUtil.$getIptStr(this._compSearch, "search", {
            decorationRight: "clear",
            asMeta: true,
            html: `<input class="form-control input-xs" placeholder="Search...">`
        }, );
        this._compSearch._addHookBase("search", ()=>{
            const searchTerm = this._compSearch._state.search.toLowerCase();
            this._filters.forEach(f=>f.handleSearch(searchTerm));
        }
        );

        const $btnShowAllFilters = $(`<button class="btn btn-xs ve-btn-default">Show All</button>`).click(()=>this.showAllFilters());
        const $btnHideAllFilters = $(`<button class="btn btn-xs ve-btn-default">Hide All</button>`).click(()=>this.hideAllFilters());

        const $btnReset = $(`<button class="btn btn-xs ve-btn-default mr-3" title="${FilterBox.TITLE_BTN_RESET}">Reset</button>`).click(evt=>this.reset(evt.shiftKey));

        const $btnSettings = $(`<button class="btn btn-xs ve-btn-default mr-3"><span class="glyphicon glyphicon-cog"></span></button>`).click(()=>this._pOpenSettingsModal());

        const $btnSaveAlt = $(`<button class="btn btn-xs ve-btn-primary" title="Save"><span class="glyphicon glyphicon-ok"></span></button>`).click(()=>this._modalMeta.doClose(true));

        const $wrpBtnCombineFilters = $(`<div class="btn-group mr-3"></div>`);
        const $btnCombineFilterSettings = $(`<button class="btn btn-xs ve-btn-default"><span class="glyphicon glyphicon-cog"></span></button>`).click(()=>this._pOpenCombineAsModal());

        const btnCombineFiltersAs = e_({
            tag: "button",
            clazz: `btn btn-xs ve-btn-default`,
            click: ()=>this._meta.modeCombineFilters = FilterBox._COMBINE_MODES.getNext(this._meta.modeCombineFilters),
            title: `"AND" requires every filter to match. "OR" requires any filter to match. "Custom" allows you to specify a combination (every "AND" filter must match; only one "OR" filter must match) .`,
        }).appendTo($wrpBtnCombineFilters[0]);

        const hook = ()=>{
            btnCombineFiltersAs.innerText = this._meta.modeCombineFilters === "custom" ? this._meta.modeCombineFilters.uppercaseFirst() : this._meta.modeCombineFilters.toUpperCase();
            if (this._meta.modeCombineFilters === "custom")
                $wrpBtnCombineFilters.append($btnCombineFilterSettings);
            else
                $btnCombineFilterSettings.detach();
            this._doSaveStateThrottled();
        }
        ;
        this._addHook("meta", "modeCombineFilters", hook);
        hook();

        const $btnSave = $(`<button class="btn ve-btn-primary fltr__btn-close mr-2">Save</button>`).click(()=>this._modalMeta.doClose(true));

        const $btnCancel = $(`<button class="btn ve-btn-default fltr__btn-close">Cancel</button>`).click(()=>this._modalMeta.doClose(false));

        $$(this._modalMeta.$modal)`<div class="split mb-2 mt-2 ve-flex-v-center mobile__ve-flex-col">
			<div class="ve-flex-v-baseline mobile__ve-flex-col">
				<h4 class="m-0 mr-2 mobile__mb-2">Filters</h4>
				${this._metaIptSearch.$wrp.addClass("mobile__mb-2")}
			</div>
			<div class="ve-flex-v-center mobile__ve-flex-col">
				<div class="ve-flex-v-center mobile__m-1">
					<div class="mr-2">Combine as</div>
					${$wrpBtnCombineFilters}
				</div>
				<div class="ve-flex-v-center mobile__m-1">
					<div class="btn-group mr-2 ve-flex-h-center">
						${$btnShowAllFilters}
						${$btnHideAllFilters}
					</div>
					${$btnReset}
					${$btnSettings}
					${$btnSaveAlt}
				</div>
			</div>
		</div>
		<hr class="w-100 m-0 mb-2">

		<hr class="mt-1 mb-1">
		<div class="ui-modal__scroller smooth-scroll px-1">
			${$children}
		</div>
		<hr class="my-1 w-100">
		<div class="w-100 ve-flex-vh-center my-1">${$btnSave}${$btnCancel}</div>`;
    }

    async _pOpenSettingsModal() {
        const {$modalInner} = await UiUtil.pGetShowModal({
            title: "Settings"
        });

        UiUtil.$getAddModalRowCb($modalInner, "Deselect Homebrew Sources by Default", this._meta, "isBrewDefaultHidden");

        UiUtil.addModalSep($modalInner);

        UiUtil.$getAddModalRowHeader($modalInner, "Hide summary for filter...", {
            helpText: "The summary is the small red and blue button panel which appear below the search bar."
        });
        this._filters.forEach(f=>UiUtil.$getAddModalRowCb($modalInner, f.header, this._minisHidden, f.header));

        UiUtil.addModalSep($modalInner);

        const $rowResetAlwaysSave = UiUtil.$getAddModalRow($modalInner, "div").addClass("pr-2");
        $rowResetAlwaysSave.append(`<span>Always Save on Close</span>`);
        $(`<button class="btn btn-xs ve-btn-default">Reset</button>`).appendTo($rowResetAlwaysSave).click(async()=>{
            await StorageUtil.pRemove(FilterBox._STORAGE_KEY_ALWAYS_SAVE_UNCHANGED);
            JqueryUtil.doToast("Saved!");
        }
        );
    }

    async _pOpenCombineAsModal() {
        const {$modalInner} = await UiUtil.pGetShowModal({
            title: "Filter Combination Logic"
        });
        const $btnReset = $(`<button class="btn btn-xs ve-btn-default">Reset</button>`).click(()=>{
            Object.keys(this._combineAs).forEach(k=>this._combineAs[k] = "and");
            $sels.forEach($sel=>$sel.val("0"));
        }
        );
        UiUtil.$getAddModalRowHeader($modalInner, "Combine filters as...", {
            $eleRhs: $btnReset
        });
        const $sels = this._filters.map(f=>UiUtil.$getAddModalRowSel($modalInner, f.header, this._combineAs, f.header, ["and", "or"], {
            fnDisplay: (it)=>it.toUpperCase()
        }));
    }

    

    addEventListener(type, listener) {
        (this._$wrpFormTop ? this._$wrpFormTop[0] : this._$btnOpen[0]).addEventListener(type, listener);
    }

    _mutNextState_reset_meta({tgt}) {
        Object.assign(tgt, this._getDefaultMeta());
    }

    _mutNextState_minisHidden({tgt}) {
        Object.assign(tgt, this._getDefaultMinisHidden(tgt));
    }

    _mutNextState_combineAs({tgt}) {
        Object.assign(tgt, this._getDefaultCombineAs(tgt));
    }

    _reset_meta() {
        const nxtBoxState = this._getNextBoxState_base();
        this._mutNextState_reset_meta({
            tgt: nxtBoxState.meta
        });
        this._setBoxStateFromNextBoxState(nxtBoxState);
    }

    _reset_minisHidden() {
        const nxtBoxState = this._getNextBoxState_base();
        this._mutNextState_minisHidden({
            tgt: nxtBoxState.minisHidden
        });
        this._setBoxStateFromNextBoxState(nxtBoxState);
    }

    _reset_combineAs() {
        const nxtBoxState = this._getNextBoxState_base();
        this._mutNextState_combineAs({
            tgt: nxtBoxState.combineAs
        });
        this._setBoxStateFromNextBoxState(nxtBoxState);
    }

    reset(isResetAll) {
        this._filters.forEach(f=>f.reset({
            isResetAll
        }));
        if (isResetAll) {
            this._reset_meta();
            this._reset_minisHidden();
            this._reset_combineAs();
        }
        this.render();
        this.fireChangeEvent();
    }

    async show() {
        if (!this._isModalRendered)
            await this._render_pRenderModal();
        this._cachedState = this._getSaveableState();
        this._modalMeta.doOpen();
        if (this._metaIptSearch?.$ipt)
            this._metaIptSearch.$ipt.focus();
    }

    async _pHandleHide(isCancel=false) {
        if (this._cachedState && isCancel) {
            const curState = this._getSaveableState();
            const hasChanges = !CollectionUtil.deepEquals(curState, this._cachedState);

            if (hasChanges) {
                const isSave = await InputUiUtil.pGetUserBoolean({
                    title: "Unsaved Changes",
                    textYesRemember: "Always Save",
                    textYes: "Save",
                    textNo: "Discard",
                    storageKey: FilterBox._STORAGE_KEY_ALWAYS_SAVE_UNCHANGED,
                    isGlobal: true,
                });
                if (isSave) {
                    this._cachedState = null;
                    this.fireChangeEvent();
                    return;
                } else
                    this._setStateFromLoaded(this._cachedState, {
                        isUserSavedState: true
                    });
            }
        } else {
            this.fireChangeEvent();
        }

        this._cachedState = null;
    }

    showAllFilters() {
        this._filters.forEach(f=>f.show());
    }

    hideAllFilters() {
        this._filters.forEach(f=>f.hide());
    }

    unpackSubHashes(subHashes, {force=false}={}) {
        const unpacked = {};
        subHashes.forEach(s=>{
            const unpackedPart = UrlUtil.unpackSubHash(s, true);
            if (Object.keys(unpackedPart).length > 1)
                throw new Error(`Multiple keys in subhash!`);
            const k = Object.keys(unpackedPart)[0];
            unpackedPart[k] = {
                clean: unpackedPart[k],
                raw: s
            };
            Object.assign(unpacked, unpackedPart);
        }
        );

        const urlHeaderToFilter = {};
        this._filters.forEach(f=>{
            const childFilters = f.getChildFilters();
            if (childFilters.length)
                childFilters.forEach(f=>urlHeaderToFilter[f.header.toLowerCase()] = f);
            urlHeaderToFilter[f.header.toLowerCase()] = f;
        }
        );

        const urlHeadersUpdated = new Set();
        const subHashesConsumed = new Set();
        let filterInitialSearch;

        const filterBoxState = {};
        const statePerFilter = {};
        const prefixLen = this.getNamespacedHashKey().length;
        Object.entries(unpacked).forEach(([hashKey,data])=>{
            const rawPrefix = hashKey.substring(0, prefixLen);
            const prefix = rawPrefix.substring(0, FilterUtil.SUB_HASH_PREFIX_LENGTH);

            const urlHeader = hashKey.substring(prefixLen);

            if (FilterUtil.SUB_HASH_PREFIXES.has(prefix) && urlHeaderToFilter[urlHeader]) {
                (statePerFilter[urlHeader] = statePerFilter[urlHeader] || {})[prefix] = data.clean;
                urlHeadersUpdated.add(urlHeader);
                subHashesConsumed.add(data.raw);
                return;
            }

            if (Object.values(FilterBox._SUB_HASH_PREFIXES).includes(prefix)) {
                if (prefix === VeCt.FILTER_BOX_SUB_HASH_SEARCH_PREFIX)
                    filterInitialSearch = data.clean[0];
                else
                    filterBoxState[prefix] = data.clean;
                subHashesConsumed.add(data.raw);
                return;
            }

            if (FilterUtil.SUB_HASH_PREFIXES.has(prefix))
                throw new Error(`Could not find filter with header ${urlHeader} for subhash ${data.raw}`);
        }
        );

        if (!subHashesConsumed.size && !force)
            return null;

        return {
            urlHeaderToFilter,
            filterBoxState,
            statePerFilter,
            urlHeadersUpdated,
            unpacked,
            subHashesConsumed,
            filterInitialSearch,
        };
    }

    setFromSubHashes(subHashes, {force=false, $iptSearch=null}={}) {
        const unpackedSubhashes = this.unpackSubHashes(subHashes, {
            force
        });

        if (unpackedSubhashes == null)
            return subHashes;

        const {unpacked, subHashesConsumed, filterInitialSearch, } = unpackedSubhashes;

        const {box: nxtStateBox, filters: nxtStatesFilters} = this.getNextStateFromSubHashes({
            unpackedSubhashes
        });

        this._setBoxStateFromNextBoxState(nxtStateBox);

        this._filters.flatMap(f=>[f, ...f.getChildFilters(), ]).filter(filter=>nxtStatesFilters[filter.header]).forEach(filter=>filter.setStateFromNextState(nxtStatesFilters));

        if (filterInitialSearch && ($iptSearch || this._$iptSearch))
            ($iptSearch || this._$iptSearch).val(filterInitialSearch).change().keydown().keyup().trigger("instantKeyup");

        const [link] = Hist.getHashParts();

        const outSub = [];
        Object.values(unpacked).filter(v=>!subHashesConsumed.has(v.raw)).forEach(v=>outSub.push(v.raw));

        Hist.setSuppressHistory(true);
        Hist.replaceHistoryHash(`${link}${outSub.length ? `${HASH_PART_SEP}${outSub.join(HASH_PART_SEP)}` : ""}`);

        this.fireChangeEvent();
        Hist.hashChange({
            isBlankFilterLoad: true
        });
        return outSub;
    }

    getNextStateFromSubHashes({unpackedSubhashes}) {
        const {urlHeaderToFilter, filterBoxState, statePerFilter, urlHeadersUpdated, } = unpackedSubhashes;

        const nxtStateBox = this._getNextBoxStateFromSubHashes(urlHeaderToFilter, filterBoxState);

        const nxtStateFilters = {};

        Object.entries(statePerFilter).forEach(([urlHeader,state])=>{
            const filter = urlHeaderToFilter[urlHeader];
            Object.assign(nxtStateFilters, filter.getNextStateFromSubhashState(state));
        }
        );

        Object.keys(urlHeaderToFilter).filter(k=>!urlHeadersUpdated.has(k)).forEach(k=>{
            const filter = urlHeaderToFilter[k];
            Object.assign(nxtStateFilters, filter.getNextStateFromSubhashState(null));
        }
        );

        return {
            box: nxtStateBox,
            filters: nxtStateFilters
        };
    }

    _getNextBoxState_base() {
        return {
            meta: MiscUtil.copyFast(this.__meta),
            minisHidden: MiscUtil.copyFast(this.__minisHidden),
            combineAs: MiscUtil.copyFast(this.__combineAs),
        };
    }

    _getNextBoxStateFromSubHashes(urlHeaderToFilter, filterBoxState) {
        const nxtBoxState = this._getNextBoxState_base();

        let hasMeta = false;
        let hasMinisHidden = false;
        let hasCombineAs = false;

        Object.entries(filterBoxState).forEach(([k,vals])=>{
            const mappedK = this.getNamespacedHashKey(Parser._parse_bToA(FilterBox._SUB_HASH_PREFIXES, k));
            switch (mappedK) {
            case "meta":
                {
                    hasMeta = true;
                    const data = vals.map(v=>UrlUtil.mini.decompress(v));
                    Object.keys(this._getDefaultMeta()).forEach((k,i)=>nxtBoxState.meta[k] = data[i]);
                    break;
                }
            case "minisHidden":
                {
                    hasMinisHidden = true;
                    Object.keys(nxtBoxState.minisHidden).forEach(k=>nxtBoxState.minisHidden[k] = false);
                    vals.forEach(v=>{
                        const [urlHeader,isHidden] = v.split("=");
                        const filter = urlHeaderToFilter[urlHeader];
                        if (!filter)
                            throw new Error(`Could not find filter with name "${urlHeader}"`);
                        nxtBoxState.minisHidden[filter.header] = !!Number(isHidden);
                    }
                    );
                    break;
                }
            case "combineAs":
                {
                    hasCombineAs = true;
                    Object.keys(nxtBoxState.combineAs).forEach(k=>nxtBoxState.combineAs[k] = "and");
                    vals.forEach(v=>{
                        const [urlHeader,ixCombineMode] = v.split("=");
                        const filter = urlHeaderToFilter[urlHeader];
                        if (!filter)
                            throw new Error(`Could not find filter with name "${urlHeader}"`);
                        nxtBoxState.combineAs[filter.header] = FilterBox._COMBINE_MODES[ixCombineMode] || FilterBox._COMBINE_MODES[0];
                    }
                    );
                    break;
                }
            }
        }
        );

        if (!hasMeta)
            this._mutNextState_reset_meta({
                tgt: nxtBoxState.meta
            });
        if (!hasMinisHidden)
            this._mutNextState_minisHidden({
                tgt: nxtBoxState.minisHidden
            });
        if (!hasCombineAs)
            this._mutNextState_combineAs({
                tgt: nxtBoxState.combineAs
            });

        return nxtBoxState;
    }

    _setBoxStateFromNextBoxState(nxtBoxState) {
        this._proxyAssignSimple("meta", nxtBoxState.meta, true);
        this._proxyAssignSimple("minisHidden", nxtBoxState.minisHidden, true);
        this._proxyAssignSimple("combineAs", nxtBoxState.combineAs, true);
    }

    getSubHashes(opts) {
        opts = opts || {};
        const out = [];
        const boxSubHashes = this.getBoxSubHashes();
        if (boxSubHashes)
            out.push(boxSubHashes);
        out.push(...this._filters.map(f=>f.getSubHashes()).filter(Boolean));
        if (opts.isAddSearchTerm && this._$iptSearch) {
            const searchTerm = UrlUtil.encodeForHash(this._$iptSearch.val().trim());
            if (searchTerm)
                out.push(UrlUtil.packSubHash(this._getSubhashPrefix("search"), [searchTerm]));
        }
        return out.flat();
    }

    getBoxSubHashes() {
        const out = [];

        const defaultMeta = this._getDefaultMeta();

        const anyNotDefault = Object.keys(defaultMeta).find(k=>this._meta[k] !== defaultMeta[k]);
        if (anyNotDefault) {
            const serMeta = Object.keys(defaultMeta).map(k=>UrlUtil.mini.compress(this._meta[k] === undefined ? defaultMeta[k] : this._meta[k]));
            out.push(UrlUtil.packSubHash(this._getSubhashPrefix("meta"), serMeta));
        }

        const setMinisHidden = Object.entries(this._minisHidden).filter(([k,v])=>!!v).map(([k])=>`${k.toUrlified()}=1`);
        if (setMinisHidden.length) {
            out.push(UrlUtil.packSubHash(this._getSubhashPrefix("minisHidden"), setMinisHidden));
        }

        const setCombineAs = Object.entries(this._combineAs).filter(([k,v])=>v !== FilterBox._COMBINE_MODES[0]).map(([k,v])=>`${k.toUrlified()}=${FilterBox._COMBINE_MODES.indexOf(v)}`);
        if (setCombineAs.length) {
            out.push(UrlUtil.packSubHash(this._getSubhashPrefix("combineAs"), setCombineAs));
        }

        return out.length ? out : null;
    }

    getFilterTag({isAddSearchTerm=false}={}) {
        const parts = this._filters.map(f=>f.getFilterTagPart()).filter(Boolean);
        if (isAddSearchTerm && this._$iptSearch) {
            const term = this._$iptSearch.val().trim();
            if (term)
                parts.push(`search=${term}`);
        }
        return `{@filter |${UrlUtil.getCurrentPage().replace(/\.html$/, "")}|${parts.join("|")}}`;
    }

    getDisplayState({nxtStateOuter=null}={}) {
        return this._filters.map(filter=>filter.getDisplayStatePart({
            nxtState: nxtStateOuter?.filters
        })).filter(Boolean).join("; ");
    }

    /**
     * Each of the objects inside 'values' will be matched with the header of any of this FilterBox's sub-filters.
     * You can get the headers of the sub-filters by looping through .filters and checking their 'header' property.
     * Each filter that matches their header with the object's name will have all of their filters set to 0 (false / do not let through).
     * The filter will then write values from the object (like Sources in this example).
     * Once complete, a change event will be fired.
     * @param {any} values example: {Source: {PHB: 1, XGE: 0}}
     */
    setFromValues(values) {
        this._filters.forEach(it=>it.setFromValues(values));
        this.fireChangeEvent();
    }
    getValues({nxtStateOuter=null}={}) {
        const outObj = {};
        this._filters.forEach(f=>Object.assign(outObj, f.getValues({
            nxtState: nxtStateOuter?.filters
        })));
        return outObj;
    }

    toDisplay(boxState, ...entryVals) {
        return this._toDisplay(boxState, this._filters, entryVals);
    }

    toDisplayByFilters(boxState, ...filterToValueTuples) {
        return this._toDisplay(boxState, filterToValueTuples.map(it=>it.filter), filterToValueTuples.map(it=>it.value), );
    }

    _toDisplay(boxState, filters, entryVals) {
        switch (this._meta.modeCombineFilters) {
        case "and":
            return this._toDisplay_isAndDisplay(boxState, filters, entryVals);
        case "or":
            return this._toDisplay_isOrDisplay(boxState, filters, entryVals);
        case "custom":
            {
                if (entryVals.length !== filters.length)
                    throw new Error(`Number of filters and number of values did not match!`);

                const andFilters = [];
                const andValues = [];
                const orFilters = [];
                const orValues = [];

                for (let i = 0; i < filters.length; ++i) {
                    const f = filters[i];
                    if (!this._combineAs[f.header] || this._combineAs[f.header] === "and") {
                        andFilters.push(f);
                        andValues.push(entryVals[i]);
                    } else {
                        orFilters.push(f);
                        orValues.push(entryVals[i]);
                    }
                }

                return this._toDisplay_isAndDisplay(boxState, andFilters, andValues) && this._toDisplay_isOrDisplay(boxState, orFilters, orValues);
            }
        default:
            throw new Error(`Unhandled combining mode "${this._meta.modeCombineFilters}"`);
        }
    }

    _toDisplay_isAndDisplay(boxState, filters, vals) {
        return filters.map((f,i)=>f.toDisplay(boxState, vals[i])).every(it=>it);
    }

    _toDisplay_isOrDisplay(boxState, filters, vals) {
        const res = filters.map((f,i)=>{
            if (!f.isActive(boxState))
                return null;
            return f.toDisplay(boxState, vals[i]);
        }
        ).filter(it=>it != null);
        return res.length === 0 || res.find(it=>it);
    }

    _getSubhashPrefix(prop) {
        if (FilterBox._SUB_HASH_PREFIXES[prop])
            return this.getNamespacedHashKey(FilterBox._SUB_HASH_PREFIXES[prop]);
        throw new Error(`Unknown property "${prop}"`);
    }

    _getDefaultMeta() {
        const out = MiscUtil.copy(FilterBox._DEFAULT_META);
        if (this._isCompact)
            out.isSummaryHidden = true;
        return out;
    }

    _getDefaultMinisHidden(minisHidden) {
        if (!minisHidden)
            throw new Error(`Missing "minisHidden" argument!`);
        return Object.keys(minisHidden).mergeMap(k=>({
            [k]: false
        }));
    }

    _getDefaultCombineAs(combineAs) {
        if (!combineAs)
            throw new Error(`Missing "combineAs" argument!`);
        return Object.keys(combineAs).mergeMap(k=>({
            [k]: "and"
        }));
    }
};
FilterBox.EVNT_VALCHANGE = "valchange";
FilterBox.SOURCE_HEADER = "Source";
FilterBox._PILL_STATES = ["ignore", "yes", "no"];
FilterBox._COMBINE_MODES = ["and", "or", "custom"];
FilterBox._STORAGE_KEY = "filterBoxState";
FilterBox._DEFAULT_META = {
    modeCombineFilters: "and",
    isSummaryHidden: false,
    isBrewDefaultHidden: false,
};
FilterBox._STORAGE_KEY_ALWAYS_SAVE_UNCHANGED = "filterAlwaysSaveUnchanged";

FilterBox._SUB_HASH_BOX_META_PREFIX = "fbmt";
FilterBox._SUB_HASH_BOX_MINIS_HIDDEN_PREFIX = "fbmh";
FilterBox._SUB_HASH_BOX_COMBINE_AS_PREFIX = "fbca";
FilterBox._SUB_HASH_PREFIXES = {
    meta: FilterBox._SUB_HASH_BOX_META_PREFIX,
    minisHidden: FilterBox._SUB_HASH_BOX_MINIS_HIDDEN_PREFIX,
    combineAs: FilterBox._SUB_HASH_BOX_COMBINE_AS_PREFIX,
    search: VeCt.FILTER_BOX_SUB_HASH_SEARCH_PREFIX,
};
//#endregion

//#region FilterItem
let FilterItem$1 = class FilterItem {
    constructor(options) {
        this.item = options.item;
        this.pFnChange = options.pFnChange;
        this.group = options.group;
        this.nest = options.nest;
        this.nestHidden = options.nestHidden;
        this.isIgnoreRed = options.isIgnoreRed;
        this.userData = options.userData;

        this.rendered = null;
        this.searchText = null;
    }
};

globalThis.FilterItem = FilterItem$1;
//#endregion

//#region Filter & FilterBase
class FilterBase extends BaseComponent {
    constructor(opts) {
        super();
        this._filterBox = null;

        this.header = opts.header;
        this._headerHelp = opts.headerHelp;

        this.__meta = {
            ...this.getDefaultMeta()
        };
        this._meta = this._getProxy("meta", this.__meta);

        this._hasUserSavedState = false;
    }

    _getRenderedHeader() {
        return `<span ${this._headerHelp ? `title="${this._headerHelp.escapeQuotes()}" class="help-subtle"` : ""}>${this.header}</span>`;
    }

    set filterBox(it) {
        this._filterBox = it;
    }

    show() {
        this._meta.isHidden = false;
    }

    hide() {
        this._meta.isHidden = true;
    }

    getBaseSaveableState() {
        return {
            meta: {
                ...this.__meta
            }
        };
    }

    _getNextState_base() {
        return {
            [this.header]: {
                state: MiscUtil.copyFast(this.__state),
                meta: MiscUtil.copyFast(this.__meta),
            },
        };
    }

    setStateFromNextState(nxtState) {
        this._proxyAssignSimple("state", nxtState[this.header].state, true);
        this._proxyAssignSimple("meta", nxtState[this.header].meta, true);
    }

    reset({isResetAll=false}={}) {
        const nxtState = this._getNextState_base();
        this._mutNextState_reset(nxtState, {
            isResetAll
        });
        this.setStateFromNextState(nxtState);
    }

    _mutNextState_resetBase(nxtState, {isResetAll=false}={}) {
        Object.assign(nxtState[this.header].meta, MiscUtil.copy(this.getDefaultMeta()));
    }

    getMetaSubHashes() {
        const compressedMeta = this._getCompressedMeta();
        if (!compressedMeta)
            return null;
        return [UrlUtil.packSubHash(this.getSubHashPrefix("meta", this.header), compressedMeta)];
    }

    _mutNextState_meta_fromSubHashState(nxtState, subHashState) {
        const hasMeta = this._mutNextState_meta_fromSubHashState_mutGetHasMeta(nxtState, subHashState, this.getDefaultMeta());
        if (!hasMeta)
            this._mutNextState_resetBase(nxtState);
    }

    _mutNextState_meta_fromSubHashState_mutGetHasMeta(nxtState, state, defaultMeta) {
        let hasMeta = false;

        Object.entries(state).forEach(([k,vals])=>{
            const prop = FilterBase.getProp(k);
            if (prop !== "meta")
                return;

            hasMeta = true;
            const data = vals.map(v=>UrlUtil.mini.decompress(v));
            Object.keys(defaultMeta).forEach((k,i)=>{
                if (data[i] !== undefined)
                    nxtState[this.header].meta[k] = data[i];
                else
                    nxtState[this.header].meta[k] = defaultMeta[k];
            }
            );
        }
        );

        return hasMeta;
    }

    setBaseStateFromLoaded(toLoad) {
        Object.assign(this._meta, toLoad.meta);
    }

    getSubHashPrefix(prop, header) {
        if (FilterBase._SUB_HASH_PREFIXES[prop]) {
            const prefix = this._filterBox.getNamespacedHashKey(FilterBase._SUB_HASH_PREFIXES[prop]);
            return `${prefix}${header.toUrlified()}`;
        }
        throw new Error(`Unknown property "${prop}"`);
    }

    static getProp(prefix) {
        return Parser._parse_bToA(FilterBase._SUB_HASH_PREFIXES, prefix);
    }

    _getBtnMobToggleControls(wrpControls) {
        const btnMobToggleControls = e_({
            tag: "button",
            clazz: `btn btn-xs ve-btn-default mobile__visible ml-auto px-3 mr-2`,
            html: `<span class="glyphicon glyphicon-option-vertical"></span>`,
            click: ()=>this._meta.isMobileHeaderHidden = !this._meta.isMobileHeaderHidden,
        });
        const hkMobHeaderHidden = ()=>{
            btnMobToggleControls.toggleClass("active", !this._meta.isMobileHeaderHidden);
            wrpControls.toggleClass("mobile__hidden", !!this._meta.isMobileHeaderHidden);
        }
        ;
        this._addHook("meta", "isMobileHeaderHidden", hkMobHeaderHidden);
        hkMobHeaderHidden();

        return btnMobToggleControls;
    }

    getChildFilters() {
        return [];
    }
    getDefaultMeta() {
        return {
            ...FilterBase._DEFAULT_META
        };
    }

    isActive(vals) {
        vals = vals || this.getValues();
        return vals[this.header]._isActive;
    }

    _getCompressedMeta({isStripUiKeys=false}={}) {
        const defaultMeta = this.getDefaultMeta();
        const isAnyNotDefault = Object.keys(defaultMeta).some(k=>this._meta[k] !== defaultMeta[k]);
        if (!isAnyNotDefault)
            return null;

        let keys = Object.keys(defaultMeta);

        if (isStripUiKeys) {
            const popCount = Object.keys(FilterBase._DEFAULT_META).length;
            if (popCount)
                keys = keys.slice(0, -popCount);
        }

        while (keys.length && defaultMeta[keys.last()] === this._meta[keys.last()])
            keys.pop();

        return keys.map(k=>UrlUtil.mini.compress(this._meta[k] === undefined ? defaultMeta[k] : this._meta[k]));
    }

    $render() {
        throw new Error(`Unimplemented!`);
    }
    $renderMinis() {
        throw new Error(`Unimplemented!`);
    }
    getValues({nxtState=null}={}) {
        throw new Error(`Unimplemented!`);
    }
    _mutNextState_reset() {
        throw new Error(`Unimplemented!`);
    }
    update() {
        throw new Error(`Unimplemented!`);
    }
    toDisplay() {
        throw new Error(`Unimplemented!`);
    }
    addItem() {
        throw new Error(`Unimplemented!`);
    }
    getSaveableState() {
        throw new Error(`Unimplemented!`);
    }
    setStateFromLoaded() {
        throw new Error(`Unimplemented!`);
    }
    getSubHashes() {
        throw new Error(`Unimplemented!`);
    }
    getNextStateFromSubhashState() {
        throw new Error(`Unimplemented!`);
    }
    setFromValues() {
        throw new Error(`Unimplemented!`);
    }
    handleSearch() {
        throw new Error(`Unimplemented`);
    }
    getFilterTagPart() {
        throw new Error(`Unimplemented`);
    }
    getDisplayStatePart({nxtState=null}={}) {
        throw new Error(`Unimplemented`);
    }
    _doTeardown() {}
    trimState_() {}
}
FilterBase._DEFAULT_META = {
    isHidden: false,
    isMobileHeaderHidden: true,
};
FilterBase._SUB_HASH_STATE_PREFIX = "flst";
FilterBase._SUB_HASH_META_PREFIX = "flmt";
FilterBase._SUB_HASH_NESTS_HIDDEN_PREFIX = "flnh";
FilterBase._SUB_HASH_OPTIONS_PREFIX = "flop";
FilterBase._SUB_HASH_PREFIXES = {
    state: FilterBase._SUB_HASH_STATE_PREFIX,
    meta: FilterBase._SUB_HASH_META_PREFIX,
    nestsHidden: FilterBase._SUB_HASH_NESTS_HIDDEN_PREFIX,
    options: FilterBase._SUB_HASH_OPTIONS_PREFIX,
};

class Filter extends FilterBase {
    
    constructor(opts) {
        super(opts);
        this._items = Filter._getAsFilterItems(opts.items || []);
        this.__itemsSet = new Set(this._items.map(it=>it.item));
        this._nests = opts.nests;
        this._displayFn = opts.displayFn;
        this._displayFnMini = opts.displayFnMini;
        this._displayFnTitle = opts.displayFnTitle;
        this._selFn = opts.selFn;
        this._selFnCache = null;
        this._deselFn = opts.deselFn;
        this._itemSortFn = opts.itemSortFn === undefined ? SortUtil.ascSort : opts.itemSortFn;
        this._itemSortFnMini = opts.itemSortFnMini;
        this._groupFn = opts.groupFn;
        this._minimalUi = opts.minimalUi;
        this._umbrellaItems = Filter._getAsFilterItems(opts.umbrellaItems);
        this._umbrellaExcludes = Filter._getAsFilterItems(opts.umbrellaExcludes);
        this._isSortByDisplayItems = !!opts.isSortByDisplayItems;
        this._isReprintedFilter = !!opts.isMiscFilter && this._items.some(it=>it.item === "Reprinted");
        this._isSrdFilter = !!opts.isMiscFilter && this._items.some(it=>it.item === "SRD");
        this._isBasicRulesFilter = !!opts.isMiscFilter && this._items.some(it=>it.item === "Basic Rules");

        Filter._validateItemNests(this._items, this._nests);

        this._filterBox = null;
        this._items.forEach(it=>this._defaultItemState(it, {
            isForce: true
        }));
        this.__$wrpFilter = null;
        this.__wrpPills = null;
        this.__wrpMiniPills = null;
        this.__$wrpNestHeadInner = null;
        this._updateNestSummary = null;
        this.__nestsHidden = {};
        this._nestsHidden = this._getProxy("nestsHidden", this.__nestsHidden);
        this._isNestsDirty = false;
        this._isItemsDirty = false;
        this._pillGroupsMeta = {};
    }

    get isReprintedFilter() {
        return this._isReprintedFilter;
    }
    get isSrdFilter() {
        return this._isSrdFilter;
    }
    get isBasicRulesFilter() {
        return this._isBasicRulesFilter;
    }

    getSaveableState() {
        return {
            [this.header]: {
                ...this.getBaseSaveableState(),
                state: {
                    ...this.__state
                },
                nestsHidden: {
                    ...this.__nestsHidden
                },
            },
        };
    }

    setStateFromLoaded(filterState, {isUserSavedState=false}={}) {
        if (!filterState?.[this.header])
            return;

        const toLoad = filterState[this.header];
        this._hasUserSavedState = this._hasUserSavedState || isUserSavedState;
        this.setBaseStateFromLoaded(toLoad);
        Object.assign(this._state, toLoad.state);
        Object.assign(this._nestsHidden, toLoad.nestsHidden);
    }

    _getStateNotDefault({nxtState=null}={}) {
        const state = nxtState?.[this.header]?.state || this.__state;

        return Object.entries(state).filter(([k,v])=>{
            if (k.startsWith("_"))
                return false;
            const defState = this._getDefaultState(k);
            return defState !== v;
        }
        );
    }

    getSubHashes() {
        const out = [];

        const baseMeta = this.getMetaSubHashes();
        if (baseMeta)
            out.push(...baseMeta);

        const areNotDefaultState = this._getStateNotDefault();
        if (areNotDefaultState.length) {
            const serPillStates = areNotDefaultState.map(([k,v])=>`${k.toUrlified()}=${v}`);
            out.push(UrlUtil.packSubHash(this.getSubHashPrefix("state", this.header), serPillStates));
        }

        const areNotDefaultNestsHidden = Object.entries(this._nestsHidden).filter(([k,v])=>this._nests[k] && !(this._nests[k].isHidden === v));
        if (areNotDefaultNestsHidden.length) {
            const nestsHidden = areNotDefaultNestsHidden.map(([k])=>`${k.toUrlified()}=1`);
            out.push(UrlUtil.packSubHash(this.getSubHashPrefix("nestsHidden", this.header), nestsHidden));
        }

        if (!out.length)
            return null;

        out.push(UrlUtil.packSubHash(this.getSubHashPrefix("options", this.header), ["extend"]));
        return out;
    }

    getFilterTagPart() {
        const areNotDefaultState = this._getStateNotDefault();
        const compressedMeta = this._getCompressedMeta({
            isStripUiKeys: true
        });

        if (!areNotDefaultState.length && !compressedMeta)
            return null;

        const pt = Object.entries(this._state).filter(([k])=>!k.startsWith("_")).filter(([,v])=>v).map(([k,v])=>`${v === 2 ? "!" : ""}${k}`).join(";").toLowerCase();

        return [this.header.toLowerCase(), pt, compressedMeta ? compressedMeta.join(HASH_SUB_LIST_SEP) : null, ].filter(it=>it != null).join("=");
    }

    getDisplayStatePart({nxtState=null}={}) {
        const state = nxtState?.[this.header]?.state || this.__state;

        const areNotDefaultState = this._getStateNotDefault({
            nxtState
        });

        if (!areNotDefaultState.length)
            return null;

        const ptState = Object.entries(state).filter(([k])=>!k.startsWith("_")).filter(([,v])=>v).map(([k,v])=>{
            const item = this._items.find(item=>`${item.item}` === k);
            if (!item)
                return null;
            return `${v === 2 ? "not " : ""}${this._displayFn ? this._displayFn(item.item, item) : item.item}`;
        }
        ).filter(Boolean).join(", ");

        if (!ptState)
            return null;

        return `${this.header}: ${ptState}`;
    }

    _getOptionsFromSubHashState(state) {
        const opts = {};
        Object.entries(state).forEach(([k,vals])=>{
            const prop = FilterBase.getProp(k);
            switch (prop) {
            case "options":
                {
                    vals.forEach(val=>{
                        switch (val) {
                        case "extend":
                            {
                                opts.isExtendDefaultState = true;
                            }
                        }
                    }
                    );
                }
            }
        }
        );
        return new FilterTransientOptions(opts);
    }

    setStateFromNextState(nxtState) {
        super.setStateFromNextState(nxtState);
        this._proxyAssignSimple("nestsHidden", nxtState[this.header].nestsHidden, true);
    }

    getNextStateFromSubhashState(state) {
        const nxtState = this._getNextState_base();

        if (state == null) {
            this._mutNextState_reset(nxtState);
            return nxtState;
        }

        this._mutNextState_meta_fromSubHashState(nxtState, state);
        const transientOptions = this._getOptionsFromSubHashState(state);

        let hasState = false;
        let hasNestsHidden = false;

        Object.entries(state).forEach(([k,vals])=>{
            const prop = FilterBase.getProp(k);
            switch (prop) {
            case "state":
                {
                    hasState = true;
                    if (transientOptions.isExtendDefaultState) {
                        Object.keys(nxtState[this.header].state).forEach(k=>nxtState[this.header].state[k] = this._getDefaultState(k));
                    } else {
                        Object.keys(nxtState[this.header].state).forEach(k=>nxtState[this.header].state[k] = 0);
                    }

                    vals.forEach(v=>{
                        const [statePropLower,state] = v.split("=");
                        const stateProp = Object.keys(nxtState[this.header].state).find(k=>k.toLowerCase() === statePropLower);
                        if (stateProp)
                            nxtState[this.header].state[stateProp] = Number(state);
                    }
                    );
                    break;
                }
            case "nestsHidden":
                {
                    hasNestsHidden = true;
                    Object.keys(nxtState[this.header].nestsHidden).forEach(k=>{
                        const nestKey = Object.keys(this._nests).find(it=>k.toLowerCase() === it.toLowerCase());
                        nxtState[this.header].nestsHidden[k] = this._nests[nestKey] && this._nests[nestKey].isHidden;
                    }
                    );
                    vals.forEach(v=>{
                        const [nestNameLower,state] = v.split("=");
                        const nestName = Object.keys(nxtState[this.header].nestsHidden).find(k=>k.toLowerCase() === nestNameLower);
                        if (nestName)
                            nxtState[this.header].nestsHidden[nestName] = !!Number(state);
                    }
                    );
                    break;
                }
            }
        }
        );

        if (!hasState)
            this._mutNextState_reset(nxtState);
        if (!hasNestsHidden && this._nests)
            this._mutNextState_resetNestsHidden({
                tgt: nxtState[this.header].nestsHidden
            });

        return nxtState;
    }

    /** Disable all our own values and set them according to what values[this.header] says */
    setFromValues(values) {
        if (values[this.header]) {
            Object.keys(this._state).forEach(k=>this._state[k] = 0);
            Object.assign(this._state, values[this.header]);
        }
    }

    setValue(k, v) {
        this._state[k] = v;
    }

    _mutNextState_resetNestsHidden({tgt}) {
        if (!this._nests)
            return;
        Object.entries(this._nests).forEach(([nestName,nestMeta])=>tgt[nestName] = !!nestMeta.isHidden);
    }

    _defaultItemState(item, {isForce=false}={}) {
        if (!isForce && this._hasUserSavedState)
            return this._state[item.item] = 0;

        this._state[item.item] = this._getDefaultState(item.item);
    }

    _getDefaultState(k) {
        return this._deselFn && this._deselFn(k) ? 2 : this._selFn && this._selFn(k) ? 1 : 0;
    }

    _getDisplayText(item) {
        return this._displayFn ? this._displayFn(item.item, item) : item.item;
    }

    _getDisplayTextMini(item) {
        return this._displayFnMini ? this._displayFnMini(item.item, item) : this._getDisplayText(item);
    }

    _getPill(item) {
        const displayText = this._getDisplayText(item);

        const btnPill = e_({
            tag: "div",
            clazz: "fltr__pill",
            html: displayText,
            click: evt=>this._getPill_handleClick({
                evt,
                item
            }),
            contextmenu: evt=>this._getPill_handleContextmenu({
                evt,
                item
            }),
        });

        this._getPill_bindHookState({
            btnPill,
            item
        });

        item.searchText = displayText.toLowerCase();

        return btnPill;
    }

    _getPill_handleClick({evt, item}) {
        if (evt.shiftKey) {
            this._doSetPillsClear();
        }

        if (++this._state[item.item] > 2)
            this._state[item.item] = 0;
    }

    _getPill_handleContextmenu({evt, item}) {
        evt.preventDefault();

        if (evt.shiftKey) {
            this._doSetPillsClear();
        }

        if (--this._state[item.item] < 0)
            this._state[item.item] = 2;
    }

    _getPill_bindHookState({btnPill, item}) {
        this._addHook("state", item.item, ()=>{
            const val = FilterBox._PILL_STATES[this._state[item.item]];
            btnPill.attr("state", val);
        }
        )();
    }

    setTempFnSel(tempFnSel) {
        this._selFnCache = this._selFnCache || this._selFn;
        if (tempFnSel)
            this._selFn = tempFnSel;
        else
            this._selFn = this._selFnCache;
    }

    updateMiniPillClasses() {
        this._items.filter(it=>it.btnMini).forEach(it=>{
            const isDefaultDesel = this._deselFn && this._deselFn(it.item);
            const isDefaultSel = this._selFn && this._selFn(it.item);
            it.btnMini.toggleClass("fltr__mini-pill--default-desel", isDefaultDesel).toggleClass("fltr__mini-pill--default-sel", isDefaultSel);
        }
        );
    }

    _getBtnMini(item) {
        const toDisplay = this._getDisplayTextMini(item);

        const btnMini = e_({
            tag: "div",
            clazz: `fltr__mini-pill ${this._filterBox.isMinisHidden(this.header) ? "ve-hidden" : ""} ${this._deselFn && this._deselFn(item.item) ? "fltr__mini-pill--default-desel" : ""} ${this._selFn && this._selFn(item.item) ? "fltr__mini-pill--default-sel" : ""}`,
            html: toDisplay,
            title: `${this._displayFnTitle ? `${this._displayFnTitle(item.item, item)} (` : ""}Filter: ${this.header}${this._displayFnTitle ? ")" : ""}`,
            click: ()=>{
                this._state[item.item] = 0;
                this._filterBox.fireChangeEvent();
            }
            ,
        }).attr("state", FilterBox._PILL_STATES[this._state[item.item]]);

        const hook = ()=>{
            const val = FilterBox._PILL_STATES[this._state[item.item]];
            btnMini.attr("state", val);
            if (item.pFnChange)
                item.pFnChange(item.item, val);
        }
        ;
        this._addHook("state", item.item, hook);

        const hideHook = ()=>btnMini.toggleClass("ve-hidden", this._filterBox.isMinisHidden(this.header));
        this._filterBox.registerMinisHiddenHook(this.header, hideHook);

        return btnMini;
    }

    _doSetPillsAll() {
        this._proxyAssignSimple("state", Object.keys(this._state).mergeMap(k=>({
            [k]: 1
        })), true, );
    }

    _doSetPillsClear() {
        this._proxyAssignSimple("state", Object.keys(this._state).mergeMap(k=>({
            [k]: 0
        })), true, );
    }

    _doSetPillsNone() {
        this._proxyAssignSimple("state", Object.keys(this._state).mergeMap(k=>({
            [k]: 2
        })), true, );
    }

    _doSetPinsDefault() {
        this.reset();
    }

    _getHeaderControls(opts) {
        const btnAll = e_({
            tag: "button",
            clazz: `btn ve-btn-default ${opts.isMulti ? "btn-xxs" : "btn-xs"} fltr__h-btn--all w-100`,
            click: ()=>this._doSetPillsAll(),
            html: "All",
        });
        const btnClear = e_({
            tag: "button",
            clazz: `btn ve-btn-default ${opts.isMulti ? "btn-xxs" : "btn-xs"} fltr__h-btn--clear w-100`,
            click: ()=>this._doSetPillsClear(),
            html: "Clear",
        });
        const btnNone = e_({
            tag: "button",
            clazz: `btn ve-btn-default ${opts.isMulti ? "btn-xxs" : "btn-xs"} fltr__h-btn--none w-100`,
            click: ()=>this._doSetPillsNone(),
            html: "None",
        });
        const btnDefault = e_({
            tag: "button",
            clazz: `btn ve-btn-default ${opts.isMulti ? "btn-xxs" : "btn-xs"} w-100`,
            click: ()=>this._doSetPinsDefault(),
            html: "Default",
        });

        const wrpStateBtnsOuter = e_({
            tag: "div",
            clazz: "ve-flex-v-center fltr__h-wrp-state-btns-outer",
            children: [e_({
                tag: "div",
                clazz: "btn-group ve-flex-v-center w-100",
                children: [btnAll, btnClear, btnNone, btnDefault, ],
            }), ],
        });
        this._getHeaderControls_addExtraStateBtns(opts, wrpStateBtnsOuter);

        const wrpSummary = e_({
            tag: "div",
            clazz: "ve-flex-vh-center ve-hidden"
        });

        const btnCombineBlue = e_({
            tag: "button",
            clazz: `btn ve-btn-default ${opts.isMulti ? "btn-xxs" : "btn-xs"} fltr__h-btn-logic--blue fltr__h-btn-logic w-100`,
            click: ()=>this._meta.combineBlue = Filter._getNextCombineMode(this._meta.combineBlue),
            title: `Blue match mode for this filter. "AND" requires all blues to match, "OR" requires at least one blue to match, "XOR" requires exactly one blue to match.`,
        });
        const hookCombineBlue = ()=>e_({
            ele: btnCombineBlue,
            text: `${this._meta.combineBlue}`.toUpperCase()
        });
        this._addHook("meta", "combineBlue", hookCombineBlue);
        hookCombineBlue();

        const btnCombineRed = e_({
            tag: "button",
            clazz: `btn ve-btn-default ${opts.isMulti ? "btn-xxs" : "btn-xs"} fltr__h-btn-logic--red fltr__h-btn-logic w-100`,
            click: ()=>this._meta.combineRed = Filter._getNextCombineMode(this._meta.combineRed),
            title: `Red match mode for this filter. "AND" requires all reds to match, "OR" requires at least one red to match, "XOR" requires exactly one red to match.`,
        });
        const hookCombineRed = ()=>e_({
            ele: btnCombineRed,
            text: `${this._meta.combineRed}`.toUpperCase()
        });
        this._addHook("meta", "combineRed", hookCombineRed);
        hookCombineRed();

        const btnShowHide = e_({
            tag: "button",
            clazz: `btn ve-btn-default ${opts.isMulti ? "btn-xxs" : "btn-xs"} ml-2`,
            click: ()=>this._meta.isHidden = !this._meta.isHidden,
            html: "Hide",
        });
        const hookShowHide = ()=>{
            e_({
                ele: btnShowHide
            }).toggleClass("active", this._meta.isHidden);
            wrpStateBtnsOuter.toggleVe(!this._meta.isHidden);

            const cur = this.getValues()[this.header];

            const htmlSummary = [cur._totals.yes ? `<span class="fltr__summary_item fltr__summary_item--include" title="${cur._totals.yes} hidden &quot;required&quot; tags">${cur._totals.yes}</span>` : null, cur._totals.yes && cur._totals.no ? `<span class="fltr__summary_item_spacer"></span>` : null, cur._totals.no ? `<span class="fltr__summary_item fltr__summary_item--exclude" title="${cur._totals.no} hidden &quot;excluded&quot; tags">${cur._totals.no}</span>` : null, ].filter(Boolean).join("");
            e_({
                ele: wrpSummary,
                html: htmlSummary
            }).toggleVe(this._meta.isHidden);
        }
        ;
        this._addHook("meta", "isHidden", hookShowHide);
        hookShowHide();

        return e_({
            tag: "div",
            clazz: `ve-flex-v-center fltr__h-wrp-btns-outer`,
            children: [wrpSummary, wrpStateBtnsOuter, e_({
                tag: "span",
                clazz: `btn-group ml-2 ve-flex-v-center`,
                children: [btnCombineBlue, btnCombineRed]
            }), btnShowHide, ],
        });
    }

    _getHeaderControls_addExtraStateBtns() {}

    $render(opts) {
        this._filterBox = opts.filterBox;
        this.__wrpMiniPills = opts.$wrpMini ? e_({
            ele: opts.$wrpMini[0]
        }) : null;

        const wrpControls = this._getHeaderControls(opts);

        if (this._nests) {
            const wrpNestHead = e_({
                tag: "div",
                clazz: "fltr__wrp-pills--sub"
            }).appendTo(this.__wrpPills);
            this.__$wrpNestHeadInner = e_({
                tag: "div",
                clazz: "ve-flex ve-flex-wrap fltr__container-pills"
            }).appendTo(wrpNestHead);

            const wrpNestHeadSummary = e_({
                tag: "div",
                clazz: "fltr__summary_nest"
            }).appendTo(wrpNestHead);

            this._updateNestSummary = ()=>{
                const stats = {
                    high: 0,
                    low: 0
                };
                this._items.filter(it=>this._state[it.item] && this._nestsHidden[it.nest]).forEach(it=>{
                    const key = this._state[it.item] === 1 ? "high" : "low";
                    stats[key]++;
                }
                );

                wrpNestHeadSummary.empty();

                if (stats.high) {
                    e_({
                        tag: "span",
                        clazz: "fltr__summary_item fltr__summary_item--include",
                        text: stats.high,
                        title: `${stats.high} hidden "required" tag${stats.high === 1 ? "" : "s"}`,
                    }).appendTo(wrpNestHeadSummary);
                }

                if (stats.high && stats.low)
                    e_({
                        tag: "span",
                        clazz: "fltr__summary_item_spacer"
                    }).appendTo(wrpNestHeadSummary);

                if (stats.low) {
                    e_({
                        tag: "span",
                        clazz: "fltr__summary_item fltr__summary_item--exclude",
                        text: stats.low,
                        title: `${stats.low} hidden "excluded" tag${stats.low === 1 ? "" : "s"}`,
                    }).appendTo(wrpNestHeadSummary);
                }
            }
            ;

            this._doRenderNests();
        }

        this._doRenderPills();

        const btnMobToggleControls = this._getBtnMobToggleControls(wrpControls);

        this.__$wrpFilter = $$`<div>
			${opts.isFirst ? "" : `<div class="fltr__dropdown-divider ${opts.isMulti ? "fltr__dropdown-divider--indented" : ""} mb-1"></div>`}
			<div class="split fltr__h ${this._minimalUi ? "fltr__minimal-hide" : ""} mb-1">
				<div class="fltr__h-text ve-flex-h-center mobile__w-100">
					${opts.isMulti ? `<span class="mr-2">\u2012</span>` : ""}
					${this._getRenderedHeader()}
					${btnMobToggleControls}
				</div>
				${wrpControls}
			</div>
			${this.__wrpPills}
		</div>`;

        this._doToggleDisplay();

        return this.__$wrpFilter;
    }

    $renderMinis(opts) {
        if (!opts.$wrpMini)
            return;

        this._filterBox = opts.filterBox;
        this.__wrpMiniPills = e_({
            ele: opts.$wrpMini[0]
        });

        this._renderMinis_initWrpPills();

        this._doRenderMiniPills();
    }

    _renderMinis_initWrpPills() {
        this.__wrpPills = e_({
            tag: "div",
            clazz: `fltr__wrp-pills ${this._groupFn ? "fltr__wrp-subs" : "fltr__container-pills"}`
        });
        const hook = ()=>this.__wrpPills.toggleVe(!this._meta.isHidden);
        this._addHook("meta", "isHidden", hook);
        hook();
    }

    getValues({nxtState=null}={}) {
        const state = MiscUtil.copy(nxtState?.[this.header]?.state || this.__state);
        const meta = nxtState?.[this.header]?.meta || this.__meta;

        Object.keys(state).filter(k=>!this._items.some(it=>`${it.item}` === k)).forEach(k=>delete state[k]);
        const out = {
            ...state
        };

        out._isActive = Object.values(state).some(Boolean);
        out._totals = {
            yes: 0,
            no: 0,
            ignored: 0
        };
        Object.values(state).forEach(v=>{
            const totalKey = v === 0 ? "ignored" : v === 1 ? "yes" : "no";
            out._totals[totalKey]++;
        }
        );
        out._combineBlue = meta.combineBlue;
        out._combineRed = meta.combineRed;
        return {
            [this.header]: out
        };
    }

    _getNextState_base() {
        return {
            [this.header]: {
                ...super._getNextState_base()[this.header],
                nestsHidden: MiscUtil.copyFast(this.__nestsHidden),
            },
        };
    }

    _mutNextState_reset(nxtState, {isResetAll=false}={}) {
        if (isResetAll) {
            this._mutNextState_resetBase(nxtState);
            this._mutNextState_resetNestsHidden({
                tgt: nxtState[this.header].nestsHidden
            });
        } else {
            Object.assign(nxtState[this.header].meta, {
                combineBlue: Filter._DEFAULT_META.combineBlue,
                combineRed: Filter._DEFAULT_META.combineRed
            });
        }
        Object.keys(nxtState[this.header].state).forEach(k=>delete nxtState[this.header].state[k]);
        this._items.forEach(item=>nxtState[this.header].state[item.item] = this._getDefaultState(item.item));
    }

    _doRenderPills() {
        if (this._itemSortFn)
            this._items.sort(this._isSortByDisplayItems && this._displayFn ? (a,b)=>this._itemSortFn(this._displayFn(a.item, a), this._displayFn(b.item, b)) : this._itemSortFn);

        this._items.forEach(it=>{
            if (!it.rendered) {
                it.rendered = this._getPill(it);
                if (it.nest) {
                    const hook = ()=>it.rendered.toggleVe(!this._nestsHidden[it.nest]);
                    this._addHook("nestsHidden", it.nest, hook);
                    hook();
                }
            }

            if (this._groupFn) {
                const group = this._groupFn(it);
                this._doRenderPills_doRenderWrpGroup(group);
                this._pillGroupsMeta[group].wrpPills.append(it.rendered);
            } else
                it.rendered.appendTo(this.__wrpPills);
        }
        );
    }

    _doRenderPills_doRenderWrpGroup(group) {
        const existingMeta = this._pillGroupsMeta[group];
        if (existingMeta && !existingMeta.isAttached) {
            existingMeta.hrDivider.appendTo(this.__wrpPills);
            existingMeta.wrpPills.appendTo(this.__wrpPills);
            existingMeta.isAttached = true;
        }
        if (existingMeta)
            return;

        this._pillGroupsMeta[group] = {
            hrDivider: this._doRenderPills_doRenderWrpGroup_getHrDivider(group).appendTo(this.__wrpPills),
            wrpPills: this._doRenderPills_doRenderWrpGroup_getWrpPillsSub(group).appendTo(this.__wrpPills),
            isAttached: true,
        };

        Object.entries(this._pillGroupsMeta).sort((a,b)=>SortUtil.ascSortLower(a[0], b[0])).forEach(([groupKey,groupMeta],i)=>{
            groupMeta.hrDivider.appendTo(this.__wrpPills);
            groupMeta.hrDivider.toggleVe(!this._isGroupDividerHidden(groupKey, i));
            groupMeta.wrpPills.appendTo(this.__wrpPills);
        }
        );

        if (this._nests) {
            this._pillGroupsMeta[group].toggleDividerFromNestVisibility = ()=>{
                this._pillGroupsMeta[group].hrDivider.toggleVe(!this._isGroupDividerHidden(group));
            }
            ;

            Object.keys(this._nests).forEach(nestName=>{
                const hook = ()=>this._pillGroupsMeta[group].toggleDividerFromNestVisibility();
                this._addHook("nestsHidden", nestName, hook);
                hook();
                this._pillGroupsMeta[group].toggleDividerFromNestVisibility();
            }
            );
        }
    }

    _isGroupDividerHidden(group, ixSortedGroups) {
        if (!this._nests) {
            if (ixSortedGroups === undefined)
                return `${group}` === `${Object.keys(this._pillGroupsMeta).sort((a,b)=>SortUtil.ascSortLower(a, b))[0]}`;
            return ixSortedGroups === 0;
        }

        const groupItems = this._items.filter(it=>this._groupFn(it) === group);
        const hiddenGroupItems = groupItems.filter(it=>this._nestsHidden[it.nest]);
        return groupItems.length === hiddenGroupItems.length;
    }

    _doRenderPills_doRenderWrpGroup_getHrDivider() {
        return e_({
            tag: "hr",
            clazz: `fltr__dropdown-divider--sub hr-2 mx-3`
        });
    }
    _doRenderPills_doRenderWrpGroup_getWrpPillsSub() {
        return e_({
            tag: "div",
            clazz: `fltr__wrp-pills--sub fltr__container-pills`
        });
    }

    _doRenderMiniPills() {
        const view = this._items.slice(0);
        if (this._itemSortFnMini || this._itemSortFn) {
            const fnSort = this._itemSortFnMini || this._itemSortFn;
            view.sort(this._isSortByDisplayItems && this._displayFn ? (a,b)=>fnSort(this._displayFn(a.item, a), this._displayFn(b.item, b)) : fnSort);
        }

        if (this.__wrpMiniPills) {
            view.forEach(it=>{
                (it.btnMini = it.btnMini || this._getBtnMini(it)).appendTo(this.__wrpMiniPills);
            }
            );
        }
    }

    _doToggleDisplay() {
        if (this.__$wrpFilter)
            this.__$wrpFilter.toggleClass("fltr__no-items", !this._items.length);
    }

    _doRenderNests() {
        Object.entries(this._nests).sort((a,b)=>SortUtil.ascSort(a[0], b[0])).forEach(([nestName,nestMeta])=>{
            if (nestMeta._$btnNest == null) {
                if (this._nestsHidden[nestName] == null)
                    this._nestsHidden[nestName] = !!nestMeta.isHidden;

                const $btnText = $(`<span>${nestName} [${this._nestsHidden[nestName] ? "+" : "\u2212"}]</span>`);
                nestMeta._$btnNest = $$`<div class="fltr__btn_nest">${$btnText}</div>`.click(()=>this._nestsHidden[nestName] = !this._nestsHidden[nestName]);

                const hook = ()=>{
                    $btnText.text(`${nestName} [${this._nestsHidden[nestName] ? "+" : "\u2212"}]`);

                    const stats = {
                        high: 0,
                        low: 0,
                        total: 0
                    };
                    this._items.filter(it=>it.nest === nestName).find(it=>{
                        const key = this._state[it.item] === 1 ? "high" : this._state[it.item] ? "low" : "ignored";
                        stats[key]++;
                        stats.total++;
                    }
                    );
                    const allHigh = stats.total === stats.high;
                    const allLow = stats.total === stats.low;
                    nestMeta._$btnNest.toggleClass("fltr__btn_nest--include-all", this._nestsHidden[nestName] && allHigh).toggleClass("fltr__btn_nest--exclude-all", this._nestsHidden[nestName] && allLow).toggleClass("fltr__btn_nest--include", this._nestsHidden[nestName] && !!(!allHigh && !allLow && stats.high && !stats.low)).toggleClass("fltr__btn_nest--exclude", this._nestsHidden[nestName] && !!(!allHigh && !allLow && !stats.high && stats.low)).toggleClass("fltr__btn_nest--both", this._nestsHidden[nestName] && !!(!allHigh && !allLow && stats.high && stats.low));

                    if (this._updateNestSummary)
                        this._updateNestSummary();
                }
                ;

                this._items.filter(it=>it.nest === nestName).find(it=>{
                    this._addHook("state", it.item, hook);
                }
                );

                this._addHook("nestsHidden", nestName, hook);
                hook();
            }
            nestMeta._$btnNest.appendTo(this.__$wrpNestHeadInner);
        }
        );

        if (this._updateNestSummary)
            this._updateNestSummary();
    }

    update() {
        if (this._isNestsDirty) {
            this._isNestsDirty = false;

            this._doRenderNests();
        }

        if (this._isItemsDirty) {
            this._isItemsDirty = false;

            this._doRenderPills();
        }

        this._doRenderMiniPills();
        this._doToggleDisplay();
    }

    /**
     * Adds an item to the filter
     * @param {any} item
     */
    addItem(item) {
        if (item == null)
            return;

        if (item instanceof Array) {
            const len = item.length;
            for (let i = 0; i < len; ++i)
                this.addItem(item[i]);
            return;
        }

        if (!this.__itemsSet.has(item.item || item)) {
            item = item instanceof FilterItem$1 ? item : new FilterItem$1({
                item
            });
            Filter._validateItemNest(item, this._nests);

            this._isItemsDirty = true;
            this._items.push(item);
            this.__itemsSet.add(item.item);
            if (this._state[item.item] == null)
                this._defaultItemState(item);
        }
    }

    static _isItemsEqual(item1, item2) {
        return (item1 instanceof FilterItem$1 ? item1.item : item1) === (item2 instanceof FilterItem$1 ? item2.item : item2);
    }

    removeItem(item) {
        const ixItem = this._items.findIndex(it=>Filter._isItemsEqual(it, item));
        if (~ixItem) {
            const item = this._items[ixItem];

            this._isItemsDirty = true;
            item.rendered.detach();
            item.btnMini.detach();
            this._items.splice(ixItem, 1);
        }
    }

    addNest(nestName, nestMeta) {
        if (!this._nests)
            throw new Error(`Filter was not nested!`);
        if (!this._nests[nestName]) {
            this._isNestsDirty = true;
            this._nests[nestName] = nestMeta;

            if (this._groupFn) {
                Object.keys(this._pillGroupsMeta).forEach(group=>{
                    const hook = ()=>this._pillGroupsMeta[group].toggleDividerFromNestVisibility();
                    this._addHook("nestsHidden", nestName, hook);
                    hook();
                    this._pillGroupsMeta[group].toggleDividerFromNestVisibility();
                }
                );
            }
        }
    }

    _toDisplay_getMappedEntryVal(entryVal) {
        if (!(entryVal instanceof Array))
            entryVal = [entryVal];
        entryVal = entryVal.map(it=>it instanceof FilterItem$1 ? it : new FilterItem$1({
            item: it
        }));
        return entryVal;
    }

    _toDisplay_getFilterState(boxState) {
        return boxState[this.header];
    }

    toDisplay(boxState, entryVal) {
        const filterState = this._toDisplay_getFilterState(boxState);
        if (!filterState)
            return true;

        const totals = filterState._totals;

        entryVal = this._toDisplay_getMappedEntryVal(entryVal);

        const isUmbrella = ()=>{
            if (this._umbrellaItems) {
                if (!entryVal)
                    return false;

                if (this._umbrellaExcludes && this._umbrellaExcludes.some(it=>filterState[it.item]))
                    return false;

                return this._umbrellaItems.some(u=>entryVal.includes(u.item)) && (this._umbrellaItems.some(u=>filterState[u.item] === 0) || this._umbrellaItems.some(u=>filterState[u.item] === 1));
            }
        }
        ;

        let hide = false;
        let display = false;

        switch (filterState._combineBlue) {
        case "or":
            {
                if (totals.yes === 0)
                    display = true;

                display = display || entryVal.some(fi=>filterState[fi.item] === 1 || isUmbrella());

                break;
            }
        case "xor":
            {
                if (totals.yes === 0)
                    display = true;

                display = display || entryVal.filter(fi=>filterState[fi.item] === 1 || isUmbrella()).length === 1;

                break;
            }
        case "and":
            {
                const totalYes = entryVal.filter(fi=>filterState[fi.item] === 1).length;
                display = !totals.yes || totals.yes === totalYes;

                break;
            }
        default:
            throw new Error(`Unhandled combine mode "${filterState._combineBlue}"`);
        }

        switch (filterState._combineRed) {
        case "or":
            {
                hide = hide || entryVal.filter(fi=>!fi.isIgnoreRed).some(fi=>filterState[fi.item] === 2);

                break;
            }
        case "xor":
            {
                hide = hide || entryVal.filter(fi=>!fi.isIgnoreRed).filter(fi=>filterState[fi.item] === 2).length === 1;

                break;
            }
        case "and":
            {
                const totalNo = entryVal.filter(fi=>!fi.isIgnoreRed).filter(fi=>filterState[fi.item] === 2).length;
                hide = totals.no && totals.no === totalNo;

                break;
            }
        default:
            throw new Error(`Unhandled combine mode "${filterState._combineRed}"`);
        }

        return display && !hide;
    }

    _doInvertPins() {
        const cur = MiscUtil.copy(this._state);
        Object.keys(this._state).forEach(k=>this._state[k] = cur[k] === 1 ? 0 : 1);
    }

    getDefaultMeta() {
        return {
            ...super.getDefaultMeta(),
            ...Filter._DEFAULT_META,
        };
    }

    handleSearch(searchTerm) {
        const isHeaderMatch = this.header.toLowerCase().includes(searchTerm);

        if (isHeaderMatch) {
            this._items.forEach(it=>{
                if (!it.rendered)
                    return;
                it.rendered.toggleClass("fltr__hidden--search", false);
            }
            );

            if (this.__$wrpFilter)
                this.__$wrpFilter.toggleClass("fltr__hidden--search", false);

            return true;
        }

        let visibleCount = 0;
        this._items.forEach(it=>{
            if (!it.rendered)
                return;
            const isVisible = it.searchText.includes(searchTerm);
            it.rendered.toggleClass("fltr__hidden--search", !isVisible);
            if (isVisible)
                visibleCount++;
        }
        );

        if (this.__$wrpFilter)
            this.__$wrpFilter.toggleClass("fltr__hidden--search", visibleCount === 0);

        return visibleCount !== 0;
    }

    static _getNextCombineMode(combineMode) {
        let ix = Filter._COMBINE_MODES.indexOf(combineMode);
        if (ix === -1)
            ix = (Filter._COMBINE_MODES.length - 1);
        if (++ix === Filter._COMBINE_MODES.length)
            ix = 0;
        return Filter._COMBINE_MODES[ix];
    }

    _doTeardown() {
        this._items.forEach(it=>{
            if (it.rendered)
                it.rendered.detach();
            if (it.btnMini)
                it.btnMini.detach();
        }
        );

        Object.values(this._nests || {}).filter(nestMeta=>nestMeta._$btnNest).forEach(nestMeta=>nestMeta._$btnNest.detach());

        Object.values(this._pillGroupsMeta || {}).forEach(it=>{
            it.hrDivider.detach();
            it.wrpPills.detach();
            it.isAttached = false;
        }
        );
    }

    static _getAsFilterItems(items) {
        return items ? items.map(it=>it instanceof FilterItem$1 ? it : new FilterItem$1({
            item: it
        })) : null;
    }

    static _validateItemNests(items, nests) {
        if (!nests)
            return;
        items = items.filter(it=>it.nest);
        const noNest = items.find(it=>!nests[it.nest]);
        if (noNest)
            throw new Error(`Filter does not have matching nest: "${noNest.item}" (call addNest first)`);
        const invalid = items.find(it=>!it.nest || !nests[it.nest]);
        if (invalid)
            throw new Error(`Invalid nest: "${invalid.item}"`);
    }

    static _validateItemNest(item, nests) {
        if (!nests || !item.nest)
            return;
        if (!nests[item.nest])
            throw new Error(`Filter does not have matching nest: "${item.item}" (call addNest first)`);
        if (!item.nest || !nests[item.nest])
            throw new Error(`Invalid nest: "${item.item}"`);
    }
};
Filter._DEFAULT_META = {
    combineBlue: "or",
    combineRed: "or",
};
Filter._COMBINE_MODES = ["or", "and", "xor"];
globalThis.Filter = Filter;

let FilterCommon$1 = class FilterCommon {
    static getDamageVulnerableFilter() {
        return this._getDamageResistVulnImmuneFilter({
            header: "Vulnerabilities",
            headerShort: "Vuln.",
        });
    }

    static getDamageResistFilter() {
        return this._getDamageResistVulnImmuneFilter({
            header: "Resistance",
            headerShort: "Res.",
        });
    }

    static getDamageImmuneFilter() {
        return this._getDamageResistVulnImmuneFilter({
            header: "Immunity",
            headerShort: "Imm.",
        });
    }

    static _getDamageResistVulnImmuneFilter({header, headerShort, }, ) {
        return new Filter({
            header: header,
            items: [...Parser.DMG_TYPES],
            displayFnMini: str=>`${headerShort} ${str.toTitleCase()}`,
            displayFnTitle: str=>`Damage ${header}: ${str.toTitleCase()}`,
            displayFn: StrUtil.uppercaseFirst,
        });
    }

    static _CONDS = ["blinded", "charmed", "deafened", "exhaustion", "frightened", "grappled", "incapacitated", "invisible", "paralyzed", "petrified", "poisoned", "prone", "restrained", "stunned", "unconscious", "disease", ];

    static getConditionImmuneFilter() {
        return new Filter({
            header: "Condition Immunity",
            items: this._CONDS,
            displayFnMini: str=>`Imm. ${str.toTitleCase()}`,
            displayFnTitle: str=>`Condition Immunity: ${str.toTitleCase()}`,
            displayFn: StrUtil.uppercaseFirst,
        });
    }

    static mutateForFilters_damageVulnResImmune_player(ent) {
        this.mutateForFilters_damageVuln_player(ent);
        this.mutateForFilters_damageRes_player(ent);
        this.mutateForFilters_damageImm_player(ent);
    }

    static mutateForFilters_damageVuln_player(ent) {
        if (!ent.vulnerable)
            return;

        const out = new Set();
        ent.vulnerable.forEach(it=>this._recurseResVulnImm(out, it));
        ent._fVuln = [...out];
    }

    static mutateForFilters_damageRes_player(ent) {
        if (!ent.resist)
            return;

        const out = new Set();
        ent.resist.forEach(it=>this._recurseResVulnImm(out, it));
        ent._fRes = [...out];
    }

    static mutateForFilters_damageImm_player(ent) {
        if (!ent.immune)
            return;

        const out = new Set();
        ent.immune.forEach(iti=>this._recurseResVulnImm(out, iti));
        ent._fImm = [...out];
    }

    static mutateForFilters_conditionImmune_player(ent) {
        if (!ent.conditionImmune)
            return;

        const out = new Set();
        ent.conditionImmune.forEach(it=>this._recurseResVulnImm(out, it));
        ent._fCondImm = [...out];
    }

    static _recurseResVulnImm(allSet, it) {
        if (typeof it === "string")
            return allSet.add(it);
        if (it.choose?.from)
            it.choose?.from.forEach(itSub=>this._recurseResVulnImm(allSet, itSub));
    }
};

globalThis.FilterCommon = FilterCommon$1;

let MultiFilter = class MultiFilter extends FilterBase {
    constructor(opts) {
        super(opts);
        this._filters = opts.filters;
        this._isAddDropdownToggle = !!opts.isAddDropdownToggle;

        Object.assign(this.__state, {
            ...MultiFilter._DETAULT_STATE,
            mode: opts.mode || MultiFilter._DETAULT_STATE.mode,
        }, );
        this._defaultState = MiscUtil.copy(this.__state);
        this._state = this._getProxy("state", this.__state);

        this.__$wrpFilter = null;
        this._$wrpChildren = null;
    }

    getChildFilters() {
        return [...this._filters, ...this._filters.map(f=>f.getChildFilters())].flat();
    }

    getSaveableState() {
        const out = {
            [this.header]: {
                ...this.getBaseSaveableState(),
                state: {
                    ...this.__state
                },
            },
        };
        this._filters.forEach(it=>Object.assign(out, it.getSaveableState()));
        return out;
    }

    setStateFromLoaded(filterState, {isUserSavedState=false}={}) {
        if (!filterState?.[this.header])
            return;

        const toLoad = filterState[this.header];
        this._hasUserSavedState = this._hasUserSavedState || isUserSavedState;
        this.setBaseStateFromLoaded(toLoad);
        Object.assign(this._state, toLoad.state);
        this._filters.forEach(it=>it.setStateFromLoaded(filterState, {
            isUserSavedState
        }));
    }

    getSubHashes() {
        const out = [];

        const baseMeta = this.getMetaSubHashes();
        if (baseMeta)
            out.push(...baseMeta);

        const anyNotDefault = this._getStateNotDefault();
        if (anyNotDefault.length) {
            out.push(UrlUtil.packSubHash(this.getSubHashPrefix("state", this.header), this._getCompressedState()));
        }

        this._filters.map(it=>it.getSubHashes()).filter(Boolean).forEach(it=>out.push(...it));
        return out.length ? out : null;
    }

    _getStateNotDefault() {
        return Object.entries(this._defaultState).filter(([k,v])=>this._state[k] !== v);
    }

    getFilterTagPart() {
        return [this._getFilterTagPart_self(), ...this._filters.map(it=>it.getFilterTagPart()).filter(Boolean), ].filter(it=>it != null).join("|");
    }

    _getFilterTagPart_self() {
        const areNotDefaultState = this._getStateNotDefault();
        if (!areNotDefaultState.length)
            return null;

        return `${this.header.toLowerCase()}=${this._getCompressedState().join(HASH_SUB_LIST_SEP)}`;
    }

    getDisplayStatePart({nxtState=null}={}) {
        return this._filters.map(it=>it.getDisplayStatePart({
            nxtState
        })).filter(Boolean).join(", ");
    }

    _getCompressedState() {
        return Object.keys(this._defaultState).map(k=>UrlUtil.mini.compress(this._state[k] === undefined ? this._defaultState[k] : this._state[k]));
    }

    setStateFromNextState(nxtState) {
        super.setStateFromNextState(nxtState);
    }

    getNextStateFromSubhashState(state) {
        const nxtState = this._getNextState_base();

        if (state == null) {
            this._mutNextState_reset_self(nxtState);
            return nxtState;
        }

        this._mutNextState_meta_fromSubHashState(nxtState, state);

        let hasState = false;

        Object.entries(state).forEach(([k,vals])=>{
            const prop = FilterBase.getProp(k);
            if (prop === "state") {
                hasState = true;
                const data = vals.map(v=>UrlUtil.mini.decompress(v));
                Object.keys(this._defaultState).forEach((k,i)=>nxtState[this.header].state[k] = data[i]);
            }
        }
        );

        if (!hasState)
            this._mutNextState_reset_self(nxtState);

        return nxtState;
    }

    setFromValues(values) {
        this._filters.forEach(it=>it.setFromValues(values));
    }

    _getHeaderControls(opts) {
        const wrpSummary = e_({
            tag: "div",
            clazz: "fltr__summary_item",
        }).hideVe();

        const btnForceMobile = this._isAddDropdownToggle ? ComponentUiUtil.getBtnBool(this, "isUseDropdowns", {
            $ele: $(`<button class="btn ve-btn-default btn-xs ml-2">Show as Dropdowns</button>`),
            stateName: "meta",
            stateProp: "_meta",
        }, ) : null;
        const hkChildrenDropdowns = ()=>{
            this._filters.filter(it=>it instanceof RangeFilter).forEach(it=>it.isUseDropdowns = this._meta.isUseDropdowns);
        }
        ;
        this._addHook("meta", "isUseDropdowns", hkChildrenDropdowns);
        hkChildrenDropdowns();

        const btnResetAll = e_({
            tag: "button",
            clazz: "btn ve-btn-default btn-xs ml-2",
            text: "Reset All",
            click: ()=>this._filters.forEach(it=>it.reset()),
        });

        const wrpBtns = e_({
            tag: "div",
            clazz: "ve-flex",
            children: [btnForceMobile, btnResetAll].filter(Boolean)
        });
        this._getHeaderControls_addExtraStateBtns(opts, wrpBtns);

        const btnShowHide = e_({
            tag: "button",
            clazz: `btn ve-btn-default btn-xs ml-2 ${this._meta.isHidden ? "active" : ""}`,
            text: "Hide",
            click: ()=>this._meta.isHidden = !this._meta.isHidden,
        });
        const wrpControls = e_({
            tag: "div",
            clazz: "ve-flex-v-center",
            children: [wrpSummary, wrpBtns, btnShowHide]
        });

        const hookShowHide = ()=>{
            wrpBtns.toggleVe(!this._meta.isHidden);
            btnShowHide.toggleClass("active", this._meta.isHidden);
            this._$wrpChildren.toggleVe(!this._meta.isHidden);
            wrpSummary.toggleVe(this._meta.isHidden);

            const numActive = this._filters.map(it=>it.getValues()[it.header]._isActive).filter(Boolean).length;
            if (numActive) {
                e_({
                    ele: wrpSummary,
                    title: `${numActive} hidden active filter${numActive === 1 ? "" : "s"}`,
                    text: `(${numActive})`
                });
            }
        }
        ;
        this._addHook("meta", "isHidden", hookShowHide);
        hookShowHide();

        return wrpControls;
    }

    _getHeaderControls_addExtraStateBtns(opts, wrpStateBtnsOuter) {}

    $render(opts) {
        const btnAndOr = e_({
            tag: "div",
            clazz: `fltr__group-comb-toggle ve-muted`,
            click: ()=>this._state.mode = this._state.mode === "and" ? "or" : "and",
            title: `"Group AND" requires all filters in this group to match. "Group OR" required any filter in this group to match.`,
        });

        const hookAndOr = ()=>btnAndOr.innerText = `(group ${this._state.mode.toUpperCase()})`;
        this._addHook("state", "mode", hookAndOr);
        hookAndOr();

        const $children = this._filters.map((it,i)=>it.$render({
            ...opts,
            isMulti: true,
            isFirst: i === 0
        }));
        this._$wrpChildren = $$`<div>${$children}</div>`;

        const wrpControls = this._getHeaderControls(opts);

        return this.__$wrpFilter = $$`<div class="ve-flex-col">
			${opts.isFirst ? "" : `<div class="fltr__dropdown-divider mb-1"></div>`}
			<div class="split fltr__h fltr__h--multi ${this._minimalUi ? "fltr__minimal-hide" : ""} mb-1">
				<div class="ve-flex-v-center">
					<div class="mr-2">${this._getRenderedHeader()}</div>
					${btnAndOr}
				</div>
				${wrpControls}
			</div>
			${this._$wrpChildren}
		</div>`;
    }

    $renderMinis(opts) {
        this._filters.map((it,i)=>it.$renderMinis({
            ...opts,
            isMulti: true,
            isFirst: i === 0
        }));
    }

    isActive(vals) {
        vals = vals || this.getValues();
        return this._filters.some(it=>it.isActive(vals));
    }

    getValues({nxtState=null}={}) {
        const out = {};
        this._filters.forEach(it=>Object.assign(out, it.getValues({
            nxtState
        })));
        return out;
    }

    _mutNextState_reset_self(nxtState) {
        Object.assign(nxtState[this.header].state, MiscUtil.copy(this._defaultState));
    }

    _mutNextState_reset(nxtState, {isResetAll=false}={}) {
        if (isResetAll)
            this._mutNextState_resetBase(nxtState, {
                isResetAll
            });
        this._mutNextState_reset_self(nxtState);
    }

    reset({isResetAll=false}={}) {
        super.reset({
            isResetAll
        });
        this._filters.forEach(it=>it.reset({
            isResetAll
        }));
    }

    update() {
        this._filters.forEach(it=>it.update());
    }

    toDisplay(boxState, entryValArr) {
        if (this._filters.length !== entryValArr.length)
            throw new Error("Number of filters and number of values did not match");

        const results = [];
        for (let i = this._filters.length - 1; i >= 0; --i) {
            const f = this._filters[i];
            if (f instanceof RangeFilter) {
                results.push(f.toDisplay(boxState, entryValArr[i]));
            } else {
                const totals = boxState[f.header]._totals;

                if (totals.yes === 0 && totals.no === 0)
                    results.push(null);
                else
                    results.push(f.toDisplay(boxState, entryValArr[i]));
            }
        }

        const resultsActive = results.filter(r=>r !== null);
        if (this._state.mode === "or") {
            if (!resultsActive.length)
                return true;
            return resultsActive.find(r=>r);
        } else {
            return resultsActive.filter(r=>r).length === resultsActive.length;
        }
    }

    addItem() {
        throw new Error(`Cannot add item to MultiFilter! Add the item to a child filter instead.`);
    }

    handleSearch(searchTerm) {
        const isHeaderMatch = this.header.toLowerCase().includes(searchTerm);

        if (isHeaderMatch) {
            if (this.__$wrpFilter)
                this.__$wrpFilter.toggleClass("fltr__hidden--search", false);
            this._filters.forEach(it=>it.handleSearch(""));
            return true;
        }

        const numVisible = this._filters.map(it=>it.handleSearch(searchTerm)).reduce((a,b)=>a + b, 0);
        if (!this.__$wrpFilter)
            return;
        this.__$wrpFilter.toggleClass("fltr__hidden--search", numVisible === 0);
    }
};
MultiFilter._DETAULT_STATE = {mode: "and",}
globalThis.MultiFilter = MultiFilter;

let RangeFilter = class RangeFilter extends FilterBase {
    constructor(opts) {
        super(opts);

        if (opts.labels && opts.min == null)
            opts.min = 0;
        if (opts.labels && opts.max == null)
            opts.max = opts.labels.length - 1;

        this._min = Number(opts.min || 0);
        this._max = Number(opts.max || 0);
        this._labels = opts.isLabelled ? opts.labels : null;
        this._isAllowGreater = !!opts.isAllowGreater;
        this._isRequireFullRangeMatch = !!opts.isRequireFullRangeMatch;
        this._sparseValues = opts.isSparse ? [] : null;
        this._suffix = opts.suffix;
        this._labelSortFn = opts.labelSortFn === undefined ? SortUtil.ascSort : opts.labelSortFn;
        this._labelDisplayFn = opts.labelDisplayFn;
        this._displayFn = opts.displayFn;
        this._displayFnTooltip = opts.displayFnTooltip;

        this._filterBox = null;
        Object.assign(this.__state, {
            min: this._min,
            max: this._max,
            curMin: this._min,
            curMax: this._max,
        }, );
        this.__$wrpFilter = null;
        this.__$wrpMini = null;
        this._slider = null;

        this._labelSearchCache = null;

        this._$btnMiniGt = null;
        this._$btnMiniLt = null;
        this._$btnMiniEq = null;

        this._seenMin = this._min;
        this._seenMax = this._max;
    }

    set isUseDropdowns(val) {
        this._meta.isUseDropdowns = !!val;
    }

    getSaveableState() {
        return {
            [this.header]: {
                ...this.getBaseSaveableState(),
                state: {
                    ...this.__state
                },
            },
        };
    }

    setStateFromLoaded(filterState, {isUserSavedState=false}={}) {
        if (!filterState?.[this.header])
            return;

        const toLoad = filterState[this.header];
        this._hasUserSavedState = this._hasUserSavedState || isUserSavedState;

        const tgt = (toLoad.state || {});

        if (tgt.max == null)
            tgt.max = this._max;
        else if (this._max > tgt.max) {
            if (tgt.max === tgt.curMax)
                tgt.curMax = this._max;
            tgt.max = this._max;
        }

        if (tgt.curMax == null)
            tgt.curMax = tgt.max;
        else if (tgt.curMax > tgt.max)
            tgt.curMax = tgt.max;

        if (tgt.min == null)
            tgt.min = this._min;
        else if (this._min < tgt.min) {
            if (tgt.min === tgt.curMin)
                tgt.curMin = this._min;
            tgt.min = this._min;
        }

        if (tgt.curMin == null)
            tgt.curMin = tgt.min;
        else if (tgt.curMin < tgt.min)
            tgt.curMin = tgt.min;

        this.setBaseStateFromLoaded(toLoad);

        Object.assign(this._state, toLoad.state);
    }

    trimState_() {
        if (this._seenMin <= this._state.min && this._seenMax >= this._state.max)
            return;

        const nxtState = {
            min: this._seenMin,
            curMin: this._seenMin,
            max: this._seenMax,
            curMax: this._seenMax
        };
        this._proxyAssignSimple("state", nxtState);
    }

    getSubHashes() {
        const out = [];

        const baseMeta = this.getMetaSubHashes();
        if (baseMeta)
            out.push(...baseMeta);

        const serSliderState = [this._state.min !== this._state.curMin ? `min=${this._state.curMin}` : null, this._state.max !== this._state.curMax ? `max=${this._state.curMax}` : null, ].filter(Boolean);
        if (serSliderState.length) {
            out.push(UrlUtil.packSubHash(this.getSubHashPrefix("state", this.header), serSliderState));
        }

        return out.length ? out : null;
    }

    _isAtDefaultPosition({nxtState=null}={}) {
        const state = nxtState?.[this.header]?.state || this.__state;
        return state.min === state.curMin && state.max === state.curMax;
    }

    getFilterTagPart() {
        if (this._isAtDefaultPosition())
            return null;

        if (!this._labels) {
            if (this._state.curMin === this._state.curMax)
                return `${this.header}=[${this._state.curMin}]`;
            return `${this.header}=[${this._state.curMin};${this._state.curMax}]`;
        }

        if (this._state.curMin === this._state.curMax) {
            const label = this._labels[this._state.curMin];
            return `${this.header}=[&${label}]`;
        }

        const labelLow = this._labels[this._state.curMin];
        const labelHigh = this._labels[this._state.curMax];
        return `${this.header}=[&${labelLow};&${labelHigh}]`;
    }

    getDisplayStatePart({nxtState=null}={}) {
        if (this._isAtDefaultPosition({
            nxtState
        }))
            return null;

        const {summary} = this._getDisplaySummary({
            nxtState
        });

        return `${this.header}: ${summary}`;
    }

    getNextStateFromSubhashState(state) {
        const nxtState = this._getNextState_base();

        if (state == null) {
            this._mutNextState_reset(nxtState);
            return nxtState;
        }

        this._mutNextState_meta_fromSubHashState(nxtState, state);

        let hasState = false;

        Object.entries(state).forEach(([k,vals])=>{
            const prop = FilterBase.getProp(k);
            if (prop === "state") {
                hasState = true;
                vals.forEach(v=>{
                    const [prop,val] = v.split("=");
                    if (val.startsWith("&") && !this._labels)
                        throw new Error(`Could not dereference label: "${val}"`);

                    let num;
                    if (val.startsWith("&")) {
                        const clean = val.replace("&", "").toLowerCase();
                        num = this._labels.findIndex(it=>String(it).toLowerCase() === clean);
                        if (!~num)
                            throw new Error(`Could not find index for label "${clean}"`);
                    } else
                        num = Number(val);

                    switch (prop) {
                    case "min":
                        if (num < nxtState[this.header].state.min)
                            nxtState[this.header].state.min = num;
                        nxtState[this.header].state.curMin = Math.max(nxtState[this.header].state.min, num);
                        break;
                    case "max":
                        if (num > nxtState[this.header].state.max)
                            nxtState[this.header].state.max = num;
                        nxtState[this.header].state.curMax = Math.min(nxtState[this.header].state.max, num);
                        break;
                    default:
                        throw new Error(`Unknown prop "${prop}"`);
                    }
                }
                );
            }
        }
        );

        if (!hasState)
            this._mutNextState_reset(nxtState);

        return nxtState;
    }

    setFromValues(values) {
        if (!values[this.header])
            return;

        const vals = values[this.header];

        if (vals.min != null)
            this._state.curMin = Math.max(this._state.min, vals.min);
        else
            this._state.curMin = this._state.min;

        if (vals.max != null)
            this._state.curMax = Math.max(this._state.max, vals.max);
        else
            this._state.curMax = this._state.max;
    }

    _$getHeaderControls() {
        const $btnForceMobile = ComponentUiUtil.$getBtnBool(this, "isUseDropdowns", {
            $ele: $(`<button class="btn ve-btn-default btn-xs mr-2">Show as Dropdowns</button>`),
            stateName: "meta",
            stateProp: "_meta",
        }, );
        const $btnReset = $(`<button class="btn ve-btn-default btn-xs">Reset</button>`).click(()=>this.reset());
        const $wrpBtns = $$`<div>${$btnForceMobile}${$btnReset}</div>`;

        const $wrpSummary = $(`<div class="ve-flex-v-center fltr__summary_item fltr__summary_item--include"></div>`).hideVe();

        const $btnShowHide = $(`<button class="btn ve-btn-default btn-xs ml-2 ${this._meta.isHidden ? "active" : ""}">Hide</button>`).click(()=>this._meta.isHidden = !this._meta.isHidden);
        const hkIsHidden = ()=>{
            $btnShowHide.toggleClass("active", this._meta.isHidden);
            $wrpBtns.toggleVe(!this._meta.isHidden);
            $wrpSummary.toggleVe(this._meta.isHidden);

            const {summaryTitle, summary} = this._getDisplaySummary();
            $wrpSummary.title(summaryTitle).text(summary);
        }
        ;
        this._addHook("meta", "isHidden", hkIsHidden);
        hkIsHidden();

        return $$`
		<div class="ve-flex-v-center">
			${$wrpBtns}
			${$wrpSummary}
			${$btnShowHide}
		</div>`;
    }

    _getDisplaySummary({nxtState=null}={}) {
        const cur = this.getValues({
            nxtState
        })[this.header];

        const isRange = !cur.isMinVal && !cur.isMaxVal;
        const isCapped = !cur.isMinVal || !cur.isMaxVal;

        return {
            summaryTitle: isRange ? `Hidden range` : isCapped ? `Hidden limit` : "",
            summary: isRange ? `${this._getDisplayText(cur.min)}-${this._getDisplayText(cur.max)}` : !cur.isMinVal ? `≥ ${this._getDisplayText(cur.min)}` : !cur.isMaxVal ? `≤ ${this._getDisplayText(cur.max)}` : "",
        };
    }

    _getDisplayText(value, {isBeyondMax=false, isTooltip=false}={}) {
        value = `${this._labels ? this._labelDisplayFn ? this._labelDisplayFn(this._labels[value]) : this._labels[value] : (isTooltip && this._displayFnTooltip) ? this._displayFnTooltip(value) : this._displayFn ? this._displayFn(value) : value}${isBeyondMax ? "+" : ""}`;
        if (this._suffix)
            value += this._suffix;
        return value;
    }

    $render(opts) {
        this._filterBox = opts.filterBox;
        this.__$wrpMini = opts.$wrpMini;

        const $wrpControls = opts.isMulti ? null : this._$getHeaderControls();

        const $wrpSlider = $$`<div class="fltr__wrp-pills fltr__wrp-pills--flex"></div>`;
        const $wrpDropdowns = $$`<div class="fltr__wrp-pills fltr__wrp-pills--flex"></div>`;
        const hookHidden = ()=>{
            $wrpSlider.toggleVe(!this._meta.isHidden && !this._meta.isUseDropdowns);
            $wrpDropdowns.toggleVe(!this._meta.isHidden && !!this._meta.isUseDropdowns);
        }
        ;
        this._addHook("meta", "isHidden", hookHidden);
        this._addHook("meta", "isUseDropdowns", hookHidden);
        hookHidden();

        if (this._sparseValues?.length) {
            const sparseMin = this._sparseValues[0];
            if (this._state.min < sparseMin) {
                this._state.curMin = Math.max(this._state.curMin, sparseMin);
                this._state.min = sparseMin;
            }

            const sparseMax = this._sparseValues.last();
            if (this._state.max > sparseMax) {
                this._state.curMax = Math.min(this._state.curMax, sparseMax);
                this._state.max = sparseMax;
            }
        }

        const getSliderOpts = ()=>{
            const fnDisplay = (val,{isTooltip=false}={})=>{
                return this._getDisplayText(val, {
                    isBeyondMax: this._isAllowGreater && val === this._state.max,
                    isTooltip
                });
            }
            ;

            return {
                propMin: "min",
                propMax: "max",
                propCurMin: "curMin",
                propCurMax: "curMax",
                fnDisplay: (val)=>fnDisplay(val),
                fnDisplayTooltip: (val)=>fnDisplay(val, {
                    isTooltip: true
                }),
                sparseValues: this._sparseValues,
            };
        }
        ;

        const hkUpdateLabelSearchCache = ()=>{
            if (this._labels)
                return this._doUpdateLabelSearchCache();
            this._labelSearchCache = null;
        }
        ;
        this._addHook("state", "curMin", hkUpdateLabelSearchCache);
        this._addHook("state", "curMax", hkUpdateLabelSearchCache);
        hkUpdateLabelSearchCache();

        this._slider = new ComponentUiUtil.RangeSlider({
            comp: this,
            ...getSliderOpts()
        });
        $wrpSlider.append(this._slider.get());

        const selMin = e_({
            tag: "select",
            clazz: `form-control mr-2`,
            change: ()=>{
                const nxtMin = Number(selMin.val());
                const [min,max] = [nxtMin, this._state.curMax].sort(SortUtil.ascSort);
                this._state.curMin = min;
                this._state.curMax = max;
            }
            ,
        });
        const selMax = e_({
            tag: "select",
            clazz: `form-control`,
            change: ()=>{
                const nxMax = Number(selMax.val());
                const [min,max] = [this._state.curMin, nxMax].sort(SortUtil.ascSort);
                this._state.curMin = min;
                this._state.curMax = max;
            }
            ,
        });
        $$`<div class="ve-flex-v-center w-100 px-3 py-1">${selMin}${selMax}</div>`.appendTo($wrpDropdowns);

        const handleCurUpdate = ()=>{
            selMin.val(`${this._state.curMin}`);
            selMax.val(`${this._state.curMax}`);
        }
        ;

        const handleLimitUpdate = ()=>{
            this._doPopulateDropdown(selMin, this._state.curMin);
            this._doPopulateDropdown(selMax, this._state.curMax);
        }
        ;

        this._addHook("state", "min", handleLimitUpdate);
        this._addHook("state", "max", handleLimitUpdate);
        this._addHook("state", "curMin", handleCurUpdate);
        this._addHook("state", "curMax", handleCurUpdate);
        handleCurUpdate();
        handleLimitUpdate();

        if (opts.isMulti) {
            this._slider.get().classList.add("ve-grow");
            $wrpSlider.addClass("ve-grow");
            $wrpDropdowns.addClass("ve-grow");

            return this.__$wrpFilter = $$`<div class="ve-flex">
				<div class="fltr__range-inline-label mr-2">${this._getRenderedHeader()}</div>
				${$wrpSlider}
				${$wrpDropdowns}
			</div>`;
        } else {
            const btnMobToggleControls = this._getBtnMobToggleControls($wrpControls);

            return this.__$wrpFilter = $$`<div class="ve-flex-col">
				${opts.isFirst ? "" : `<div class="fltr__dropdown-divider mb-1"></div>`}
				<div class="split fltr__h ${this._minimalUi ? "fltr__minimal-hide" : ""} mb-1">
					<div class="fltr__h-text ve-flex-h-center">${this._getRenderedHeader()}${btnMobToggleControls}</div>
					${$wrpControls}
				</div>
				${$wrpSlider}
				${$wrpDropdowns}
			</div>`;
        }
    }

    $renderMinis(opts) {
        if (!opts.$wrpMini)
            return;

        this._filterBox = opts.filterBox;
        this.__$wrpMini = opts.$wrpMini;

        this._$btnMiniGt = this._$btnMiniGt || $(`<div class="fltr__mini-pill" state="ignore"></div>`).click(()=>{
            this._state.curMin = this._state.min;
            this._filterBox.fireChangeEvent();
        }
        );
        this._$btnMiniGt.appendTo(this.__$wrpMini);

        this._$btnMiniLt = this._$btnMiniLt || $(`<div class="fltr__mini-pill" state="ignore"></div>`).click(()=>{
            this._state.curMax = this._state.max;
            this._filterBox.fireChangeEvent();
        }
        );
        this._$btnMiniLt.appendTo(this.__$wrpMini);

        this._$btnMiniEq = this._$btnMiniEq || $(`<div class="fltr__mini-pill" state="ignore"></div>`).click(()=>{
            this._state.curMin = this._state.min;
            this._state.curMax = this._state.max;
            this._filterBox.fireChangeEvent();
        }
        );
        this._$btnMiniEq.appendTo(this.__$wrpMini);

        const hideHook = ()=>{
            const isHidden = this._filterBox.isMinisHidden(this.header);
            this._$btnMiniGt.toggleClass("ve-hidden", isHidden);
            this._$btnMiniLt.toggleClass("ve-hidden", isHidden);
            this._$btnMiniEq.toggleClass("ve-hidden", isHidden);
        }
        ;
        this._filterBox.registerMinisHiddenHook(this.header, hideHook);
        hideHook();

        const handleMiniUpdate = ()=>{
            if (this._state.curMin === this._state.curMax) {
                this._$btnMiniGt.attr("state", FilterBox._PILL_STATES[0]);
                this._$btnMiniLt.attr("state", FilterBox._PILL_STATES[0]);

                this._$btnMiniEq.attr("state", this._isAtDefaultPosition() ? FilterBox._PILL_STATES[0] : FilterBox._PILL_STATES[1]).text(`${this.header} = ${this._getDisplayText(this._state.curMin, {
                    isBeyondMax: this._isAllowGreater && this._state.curMin === this._state.max
                })}`);
            } else {
                if (this._state.min !== this._state.curMin) {
                    this._$btnMiniGt.attr("state", FilterBox._PILL_STATES[1]).text(`${this.header} ≥ ${this._getDisplayText(this._state.curMin)}`);
                } else
                    this._$btnMiniGt.attr("state", FilterBox._PILL_STATES[0]);

                if (this._state.max !== this._state.curMax) {
                    this._$btnMiniLt.attr("state", FilterBox._PILL_STATES[1]).text(`${this.header} ≤ ${this._getDisplayText(this._state.curMax)}`);
                } else
                    this._$btnMiniLt.attr("state", FilterBox._PILL_STATES[0]);

                this._$btnMiniEq.attr("state", FilterBox._PILL_STATES[0]);
            }
        }
        ;

        const handleCurUpdate = ()=>{
            handleMiniUpdate();
        }
        ;

        const handleLimitUpdate = ()=>{
            handleMiniUpdate();
        }
        ;

        this._addHook("state", "min", handleLimitUpdate);
        this._addHook("state", "max", handleLimitUpdate);
        this._addHook("state", "curMin", handleCurUpdate);
        this._addHook("state", "curMax", handleCurUpdate);
        handleCurUpdate();
        handleLimitUpdate();
    }

    _doPopulateDropdown(sel, curVal) {
        let tmp = "";
        for (let i = 0, len = this._state.max - this._state.min + 1; i < len; ++i) {
            const val = i + this._state.min;
            const label = `${this._getDisplayText(val)}`.qq();
            tmp += `<option value="${val}" ${curVal === val ? "selected" : ""}>${label}</option>`;
        }
        sel.innerHTML = tmp;
        return sel;
    }

    getValues({nxtState=null}={}) {
        const state = nxtState?.[this.header]?.state || this.__state;

        const out = {
            isMaxVal: state.max === state.curMax,
            isMinVal: state.min === state.curMin,
            max: state.curMax,
            min: state.curMin,
        };
        out._isActive = !(out.isMinVal && out.isMaxVal);
        return {
            [this.header]: out
        };
    }

    _mutNextState_reset(nxtState, {isResetAll=false}={}) {
        if (isResetAll)
            this._mutNextState_resetBase(nxtState, {
                isResetAll
            });
        nxtState[this.header].state.curMin = nxtState[this.header].state.min;
        nxtState[this.header].state.curMax = nxtState[this.header].state.max;
    }

    update() {
        if (!this.__$wrpMini)
            return;

        if (this._$btnMiniGt)
            this.__$wrpMini.append(this._$btnMiniGt);
        if (this._$btnMiniLt)
            this.__$wrpMini.append(this._$btnMiniLt);
        if (this._$btnMiniEq)
            this.__$wrpMini.append(this._$btnMiniEq);
    }

    toDisplay(boxState, entryVal) {
        const filterState = boxState[this.header];
        if (!filterState)
            return true;
        if (entryVal == null)
            return filterState.min === this._state.min && filterState.max === this._state.max;

        if (this._labels) {
            const slice = this._labels.slice(filterState.min, filterState.max + 1);

            if (this._isAllowGreater) {
                if (filterState.max === this._state.max && entryVal > this._labels[filterState.max])
                    return true;

                const sliceMin = Math.min(...slice);
                const sliceMax = Math.max(...slice);

                if (entryVal instanceof Array)
                    return entryVal.some(it=>it >= sliceMin && it <= sliceMax);
                return entryVal >= sliceMin && entryVal <= sliceMax;
            }

            if (entryVal instanceof Array)
                return entryVal.some(it=>slice.includes(it));
            return slice.includes(entryVal);
        } else {
            if (entryVal instanceof Array) {
                if (this._isRequireFullRangeMatch)
                    return filterState.min <= entryVal[0] && filterState.max >= entryVal.last();

                return entryVal.some(ev=>this._toDisplay_isToDisplayEntry(filterState, ev));
            }
            return this._toDisplay_isToDisplayEntry(filterState, entryVal);
        }
    }

    _toDisplay_isToDisplayEntry(filterState, ev) {
        const isGtMin = filterState.min <= ev;
        const isLtMax = filterState.max >= ev;
        if (this._isAllowGreater)
            return isGtMin && (isLtMax || filterState.max === this._state.max);
        return isGtMin && isLtMax;
    }

    addItem(item) {
        if (item == null)
            return;

        if (item instanceof Array) {
            const len = item.length;
            for (let i = 0; i < len; ++i)
                this.addItem(item[i]);
            return;
        }

        if (this._labels) {
            if (!this._labels.some(it=>it === item))
                this._labels.push(item);

            this._doUpdateLabelSearchCache();

            this._addItem_addNumber(this._labels.length - 1);
        } else {
            this._addItem_addNumber(item);
        }
    }

    _doUpdateLabelSearchCache() {
        this._labelSearchCache = [...new Array(Math.max(0, this._max - this._min))].map((_,i)=>i + this._min).map(val=>this._getDisplayText(val, {
            isBeyondMax: this._isAllowGreater && val === this._state.max,
            isTooltip: true
        })).join(" -- ").toLowerCase();
    }

    _addItem_addNumber(number) {
        if (number == null || isNaN(number))
            return;

        this._seenMin = Math.min(this._seenMin, number);
        this._seenMax = Math.max(this._seenMax, number);

        if (this._sparseValues && !this._sparseValues.includes(number)) {
            this._sparseValues.push(number);
            this._sparseValues.sort(SortUtil.ascSort);
        }

        if (number >= this._state.min && number <= this._state.max)
            return;
        if (this._state.min == null && this._state.max == null)
            this._state.min = this._state.max = number;
        else {
            const old = {
                ...this.__state
            };

            if (number < old.min)
                this._state.min = number;
            if (number > old.max)
                this._state.max = number;

            if (old.curMin === old.min)
                this._state.curMin = this._state.min;
            if (old.curMax === old.max)
                this._state.curMax = this._state.max;
        }
    }

    getDefaultMeta() {
        const out = {
            ...super.getDefaultMeta(),
            ...RangeFilter._DEFAULT_META,
        };
        if (Renderer.hover.isSmallScreen())
            out.isUseDropdowns = true;
        return out;
    }

    handleSearch(searchTerm) {
        if (this.__$wrpFilter == null)
            return;

        const isVisible = this.header.toLowerCase().includes(searchTerm) || (this._labelSearchCache != null ? this._labelSearchCache.includes(searchTerm) : [...new Array(this._state.max - this._state.min)].map((_,n)=>n + this._state.min).join(" -- ").includes(searchTerm));

        this.__$wrpFilter.toggleClass("fltr__hidden--search", !isVisible);

        return isVisible;
    }
};
RangeFilter._DEFAULT_META = {
    isUseDropdowns: false,
};
globalThis.RangeFilter = RangeFilter;
//#endregion

//#region SourceFilter
class SourceFilter extends Filter {

    constructor(opts) {
        opts = opts || {};

        opts.header = opts.header === undefined ? FilterBox.SOURCE_HEADER : opts.header;
        opts.displayFn = opts.displayFn === undefined ? item=>Parser.sourceJsonToFullCompactPrefix(item.item || item) : opts.displayFn;
        opts.displayFnMini = opts.displayFnMini === undefined ? SourceFilter._getDisplayHtmlMini.bind(SourceFilter) : opts.displayFnMini;
        opts.displayFnTitle = opts.displayFnTitle === undefined ? item=>Parser.sourceJsonToFull(item.item || item) : opts.displayFnTitle;
        opts.itemSortFnMini = opts.itemSortFnMini === undefined ? SourceFilter._SORT_ITEMS_MINI.bind(SourceFilter) : opts.itemSortFnMini;
        opts.itemSortFn = opts.itemSortFn === undefined ? (a,b)=>SortUtil.ascSortLower(Parser.sourceJsonToFull(a.item), Parser.sourceJsonToFull(b.item)) : opts.itemSortFn;
        opts.groupFn = opts.groupFn === undefined ? SourceUtil.getFilterGroup : opts.groupFn;
        opts.selFn = opts.selFn === undefined ? PageFilter.defaultSourceSelFn : opts.selFn;

        super(opts);

        this.__tmpState = { ixAdded: 0 };
        this._tmpState = this._getProxy("tmpState", this.__tmpState);
    }

    doSetPillsClear() {
        return this._doSetPillsClear();
    }

    /**
     * Add an item from the SourceFilter
     * @param {any} item
     */
    addItem(item) {
        const out = super.addItem(item);
        this._tmpState.ixAdded++;
        return out;
    }

    /**
     * Remove an item from the SourceFilter
     * @param {any} item
     */
    removeItem(item) {
        const out = super.removeItem(item);
        this._tmpState.ixAdded--;
        return out;
    }

    _getHeaderControls_addExtraStateBtns(opts, wrpStateBtnsOuter) {
        const btnSupplements = e_({
            tag: "button",
            clazz: `btn ve-btn-default w-100 ${opts.isMulti ? "btn-xxs" : "btn-xs"}`,
            title: `SHIFT to add to existing selection; CTRL to include UA/etc.`,
            html: `Core/Supplements`,
            click: evt=>this._doSetPinsSupplements({
                isIncludeUnofficial: EventUtil.isCtrlMetaKey(evt),
                isAdditive: evt.shiftKey
            }),
        });

        const btnAdventures = e_({
            tag: "button",
            clazz: `btn ve-btn-default w-100 ${opts.isMulti ? "btn-xxs" : "btn-xs"}`,
            title: `SHIFT to add to existing selection; CTRL to include UA`,
            html: `Adventures`,
            click: evt=>this._doSetPinsAdventures({
                isIncludeUnofficial: EventUtil.isCtrlMetaKey(evt),
                isAdditive: evt.shiftKey
            }),
        });

        const btnPartnered = e_({
            tag: "button",
            clazz: `btn ve-btn-default w-100 ${opts.isMulti ? "btn-xxs" : "btn-xs"}`,
            title: `SHIFT to add to existing selection`,
            html: `Partnered`,
            click: evt=>this._doSetPinsPartnered({
                isAdditive: evt.shiftKey
            }),
        });

        const btnHomebrew = e_({
            tag: "button",
            clazz: `btn ve-btn-default w-100 ${opts.isMulti ? "btn-xxs" : "btn-xs"}`,
            title: `SHIFT to add to existing selection`,
            html: `Homebrew`,
            click: evt=>this._doSetPinsHomebrew({
                isAdditive: evt.shiftKey
            }),
        });

        const hkIsButtonsActive = ()=>{
            const hasPartnered = Object.keys(this.__state).some(src=>SourceUtil.getFilterGroup(src) === SourceUtil.FILTER_GROUP_PARTNERED);
            btnPartnered.toggleClass("ve-hidden", !hasPartnered);

            const hasBrew = Object.keys(this.__state).some(src=>SourceUtil.getFilterGroup(src) === SourceUtil.FILTER_GROUP_HOMEBREW);
            btnHomebrew.toggleClass("ve-hidden", !hasBrew);
        }
        ;
        this._addHook("tmpState", "ixAdded", hkIsButtonsActive);
        hkIsButtonsActive();

        const actionSelectDisplayMode = new ContextUtil.ActionSelect({
            values: Object.keys(SourceFilter._PILL_DISPLAY_MODE_LABELS).map(Number),
            fnGetDisplayValue: val=>SourceFilter._PILL_DISPLAY_MODE_LABELS[val] || SourceFilter._PILL_DISPLAY_MODE_LABELS[0],
            fnOnChange: val=>this._meta.pillDisplayMode = val,
        });
        this._addHook("meta", "pillDisplayMode", ()=>{
            actionSelectDisplayMode.setValue(this._meta.pillDisplayMode);
        }
        )();

        const menu = ContextUtil.getMenu([
            new ContextUtil.Action("Select All Standard Sources",()=>this._doSetPinsStandard(),),
            new ContextUtil.Action("Select All Partnered Sources",()=>this._doSetPinsPartnered(),),
            new ContextUtil.Action("Select All Non-Standard Sources",()=>this._doSetPinsNonStandard(),),
            new ContextUtil.Action("Select All Homebrew Sources",()=>this._doSetPinsHomebrew(),),
            null,
            new ContextUtil.Action(`Select "Vanilla" Sources`,()=>this._doSetPinsVanilla(),{
                title: `Select a baseline set of sources suitable for any campaign.`
            },),
            new ContextUtil.Action("Select All Non-UA Sources",()=>this._doSetPinsNonUa(),),
            null,
            new ContextUtil.Action("Select SRD Sources",()=>this._doSetPinsSrd(),{
                title: `Select System Reference Document Sources.`
            },),
            new ContextUtil.Action("Select Basic Rules Sources",()=>this._doSetPinsBasicRules(),),
            null,
            new ContextUtil.Action("Invert Selection",()=>this._doInvertPins(),),
            null,
            actionSelectDisplayMode,
        ]);
        const btnBurger = e_({
            tag: "button",
            clazz: `btn ve-btn-default ${opts.isMulti ? "btn-xxs" : "btn-xs"}`,
            html: `<span class="glyphicon glyphicon-option-vertical"></span>`,
            click: evt=>ContextUtil.pOpenMenu(evt, menu),
            title: "Other Options",
        });

        const btnOnlyPrimary = e_({
            tag: "button",
            clazz: `btn ve-btn-default w-100 ${opts.isMulti ? "btn-xxs" : "btn-xs"}`,
            html: `Include References`,
            title: `Consider entities as belonging to every source they appear in (i.e. reprints) as well as their primary source`,
            click: ()=>this._meta.isIncludeOtherSources = !this._meta.isIncludeOtherSources,
        });
        const hkIsIncludeOtherSources = ()=>{
            btnOnlyPrimary.toggleClass("active", !!this._meta.isIncludeOtherSources);
        }
        ;
        hkIsIncludeOtherSources();
        this._addHook("meta", "isIncludeOtherSources", hkIsIncludeOtherSources);

        e_({
            tag: "div",
            clazz: `btn-group mr-2 w-100 ve-flex-v-center mobile__m-1 mobile__mb-2`,
            children: [btnSupplements, btnAdventures, btnPartnered, btnHomebrew, btnBurger, btnOnlyPrimary, ],
        }).prependTo(wrpStateBtnsOuter);
    }

    _doSetPinsStandard() {
        Object.keys(this._state).forEach(k=>this._state[k] = SourceUtil.getFilterGroup(k) === SourceUtil.FILTER_GROUP_STANDARD ? 1 : 0);
    }

    _doSetPinsPartnered({isAdditive=false}) {
        this._proxyAssignSimple("state", Object.keys(this._state).mergeMap(k=>({
            [k]: SourceUtil.getFilterGroup(k) === SourceUtil.FILTER_GROUP_PARTNERED ? 1 : isAdditive ? this._state[k] : 0
        })), );
    }

    _doSetPinsNonStandard() {
        Object.keys(this._state).forEach(k=>this._state[k] = SourceUtil.getFilterGroup(k) === SourceUtil.FILTER_GROUP_NON_STANDARD ? 1 : 0);
    }

    _doSetPinsSupplements({isIncludeUnofficial=false, isAdditive=false}={}) {
        this._proxyAssignSimple("state", Object.keys(this._state).mergeMap(k=>({
            [k]: SourceUtil.isCoreOrSupplement(k) && (isIncludeUnofficial || !SourceUtil.isNonstandardSource(k)) ? 1 : isAdditive ? this._state[k] : 0
        })), );
    }

    _doSetPinsAdventures({isIncludeUnofficial=false, isAdditive=false}) {
        this._proxyAssignSimple("state", Object.keys(this._state).mergeMap(k=>({
            [k]: SourceUtil.isAdventure(k) && (isIncludeUnofficial || !SourceUtil.isNonstandardSource(k)) ? 1 : isAdditive ? this._state[k] : 0
        })), );
    }

    _doSetPinsHomebrew({isAdditive=false}) {
        this._proxyAssignSimple("state", Object.keys(this._state).mergeMap(k=>({
            [k]: SourceUtil.getFilterGroup(k) === SourceUtil.FILTER_GROUP_HOMEBREW ? 1 : isAdditive ? this._state[k] : 0
        })), );
    }

    _doSetPinsVanilla() {
        Object.keys(this._state).forEach(k=>this._state[k] = Parser.SOURCES_VANILLA.has(k) ? 1 : 0);
    }

    _doSetPinsNonUa() {
        Object.keys(this._state).forEach(k=>this._state[k] = !SourceUtil.isPrereleaseSource(k) ? 1 : 0);
    }

    _doSetPinsSrd() {
        SourceFilter._SRD_SOURCES = SourceFilter._SRD_SOURCES || new Set([Parser.SRC_PHB, Parser.SRC_MM, Parser.SRC_DMG]);

        Object.keys(this._state).forEach(k=>this._state[k] = SourceFilter._SRD_SOURCES.has(k) ? 1 : 0);

        const srdFilter = this._filterBox.filters.find(it=>it.isSrdFilter);
        if (srdFilter)
            srdFilter.setValue("SRD", 1);

        const basicRulesFilter = this._filterBox.filters.find(it=>it.isBasicRulesFilter);
        if (basicRulesFilter)
            basicRulesFilter.setValue("Basic Rules", 0);

        const reprintedFilter = this._filterBox.filters.find(it=>it.isReprintedFilter);
        if (reprintedFilter)
            reprintedFilter.setValue("Reprinted", 0);
    }

    _doSetPinsBasicRules() {
        SourceFilter._BASIC_RULES_SOURCES = SourceFilter._BASIC_RULES_SOURCES || new Set([Parser.SRC_PHB, Parser.SRC_MM, Parser.SRC_DMG]);

        Object.keys(this._state).forEach(k=>this._state[k] = SourceFilter._BASIC_RULES_SOURCES.has(k) ? 1 : 0);

        const basicRulesFilter = this._filterBox.filters.find(it=>it.isBasicRulesFilter);
        if (basicRulesFilter)
            basicRulesFilter.setValue("Basic Rules", 1);

        const srdFilter = this._filterBox.filters.find(it=>it.isSrdFilter);
        if (srdFilter)
            srdFilter.setValue("SRD", 0);

        const reprintedFilter = this._filterBox.filters.find(it=>it.isReprintedFilter);
        if (reprintedFilter)
            reprintedFilter.setValue("Reprinted", 0);
    }

    static getCompleteFilterSources(ent) {
        if (!ent.otherSources)
            return ent.source;

        const otherSourcesFilt = ent.otherSources.filter(src=>!ExcludeUtil.isExcluded("*", "*", src.source, {
            isNoCount: true
        }));
        if (!otherSourcesFilt.length)
            return ent.source;

        return [ent.source].concat(otherSourcesFilt.map(src=>new SourceFilterItem({
            item: src.source,
            isIgnoreRed: true,
            isOtherSource: true
        })));
    }

    _doRenderPills_doRenderWrpGroup_getHrDivider(group) {
        switch (group) {
        case SourceUtil.FILTER_GROUP_NON_STANDARD:
            return this._doRenderPills_doRenderWrpGroup_getHrDivider_groupNonStandard(group);
        case SourceUtil.FILTER_GROUP_HOMEBREW:
            return this._doRenderPills_doRenderWrpGroup_getHrDivider_groupBrew(group);
        default:
            return super._doRenderPills_doRenderWrpGroup_getHrDivider(group);
        }
    }

    _doRenderPills_doRenderWrpGroup_getHrDivider_groupNonStandard(group) {
        let dates = [];
        const comp = BaseComponent.fromObject({
            min: 0,
            max: 0,
            curMin: 0,
            curMax: 0,
        });

        const wrpSlider = new ComponentUiUtil.RangeSlider({
            comp,
            propMin: "min",
            propMax: "max",
            propCurMin: "curMin",
            propCurMax: "curMax",
            fnDisplay: val=>dates[val]?.str,
        }).get();

        const wrpWrpSlider = e_({
            tag: "div",
            clazz: `"w-100 ve-flex pt-2 pb-5 mb-2 mt-1 fltr-src__wrp-slider`,
            children: [wrpSlider, ],
        }).hideVe();

        const btnCancel = e_({
            tag: "button",
            clazz: `btn btn-xs ve-btn-default px-1`,
            html: "Cancel",
            click: ()=>{
                grpBtnsInactive.showVe();
                wrpWrpSlider.hideVe();
                grpBtnsActive.hideVe();
            }
            ,
        });

        const btnConfirm = e_({
            tag: "button",
            clazz: `btn btn-xs ve-btn-default px-1`,
            html: "Confirm",
            click: ()=>{
                grpBtnsInactive.showVe();
                wrpWrpSlider.hideVe();
                grpBtnsActive.hideVe();

                const min = comp._state.curMin;
                const max = comp._state.curMax;

                const allowedDateSet = new Set(dates.slice(min, max + 1).map(it=>it.str));
                const nxtState = {};
                Object.keys(this._state).filter(k=>SourceUtil.isNonstandardSource(k)).forEach(k=>{
                    const sourceDate = Parser.sourceJsonToDate(k);
                    nxtState[k] = allowedDateSet.has(sourceDate) ? 1 : 0;
                }
                );
                this._proxyAssign("state", "_state", "__state", nxtState);
            }
            ,
        });

        const btnShowSlider = e_({
            tag: "button",
            clazz: `btn btn-xxs ve-btn-default px-1`,
            html: "Select by Date",
            click: ()=>{
                grpBtnsInactive.hideVe();
                wrpWrpSlider.showVe();
                grpBtnsActive.showVe();

                dates = Object.keys(this._state).filter(it=>SourceUtil.isNonstandardSource(it)).map(it=>Parser.sourceJsonToDate(it)).filter(Boolean).unique().map(it=>({
                    str: it,
                    date: new Date(it)
                })).sort((a,b)=>SortUtil.ascSortDate(a.date, b.date)).reverse();

                comp._proxyAssignSimple("state", {
                    min: 0,
                    max: dates.length - 1,
                    curMin: 0,
                    curMax: dates.length - 1,
                }, );
            }
            ,
        });

        const btnClear = e_({
            tag: "button",
            clazz: `btn btn-xxs ve-btn-default px-1`,
            html: "Clear",
            click: ()=>{
                const nxtState = {};
                Object.keys(this._state).filter(k=>SourceUtil.isNonstandardSource(k)).forEach(k=>nxtState[k] = 0);
                this._proxyAssign("state", "_state", "__state", nxtState);
            }
            ,
        });

        const grpBtnsActive = e_({
            tag: "div",
            clazz: `ve-flex-v-center btn-group`,
            children: [btnCancel, btnConfirm, ],
        }).hideVe();

        const grpBtnsInactive = e_({
            tag: "div",
            clazz: `ve-flex-v-center btn-group`,
            children: [btnClear, btnShowSlider, ],
        });

        return e_({
            tag: "div",
            clazz: `ve-flex-col w-100`,
            children: [super._doRenderPills_doRenderWrpGroup_getHrDivider(), e_({
                tag: "div",
                clazz: `mb-1 ve-flex-h-right`,
                children: [grpBtnsActive, grpBtnsInactive, ],
            }), wrpWrpSlider, ],
        });
    }

    _doRenderPills_doRenderWrpGroup_getHrDivider_groupBrew(group) {
        const btnClear = e_({
            tag: "button",
            clazz: `btn btn-xxs ve-btn-default px-1`,
            html: "Clear",
            click: ()=>{
                const nxtState = {};
                Object.keys(this._state).filter(k=>BrewUtil2.hasSourceJson(k)).forEach(k=>nxtState[k] = 0);
                this._proxyAssign("state", "_state", "__state", nxtState);
            }
            ,
        });

        return e_({
            tag: "div",
            clazz: `ve-flex-col w-100`,
            children: [super._doRenderPills_doRenderWrpGroup_getHrDivider(), e_({
                tag: "div",
                clazz: `mb-1 ve-flex-h-right`,
                children: [e_({
                    tag: "div",
                    clazz: `ve-flex-v-center btn-group`,
                    children: [btnClear, ],
                }), ],
            }), ],
        });
    }

    _toDisplay_getMappedEntryVal(entryVal) {
        entryVal = super._toDisplay_getMappedEntryVal(entryVal);
        if (!this._meta.isIncludeOtherSources)
            entryVal = entryVal.filter(it=>!it.isOtherSource);
        return entryVal;
    }

    _getPill(item) {
        const displayText = this._getDisplayText(item);
        const displayTextMini = this._getDisplayTextMini(item);

        const dispName = e_({
            tag: "span",
            html: displayText,
        });

        const spc = e_({
            tag: "span",
            clazz: "px-2 fltr-src__spc-pill",
            text: "|",
        });

        const dispAbbreviation = e_({
            tag: "span",
            html: displayTextMini,
        });

        const btnPill = e_({
            tag: "div",
            clazz: "fltr__pill",
            children: [dispAbbreviation, spc, dispName, ],
            click: evt=>this._getPill_handleClick({
                evt,
                item
            }),
            contextmenu: evt=>this._getPill_handleContextmenu({
                evt,
                item
            }),
        });

        this._getPill_bindHookState({
            btnPill,
            item
        });

        this._addHook("meta", "pillDisplayMode", ()=>{
            dispAbbreviation.toggleVe(this._meta.pillDisplayMode !== 0);
            spc.toggleVe(this._meta.pillDisplayMode === 2);
            dispName.toggleVe(this._meta.pillDisplayMode !== 1);
        }
        )();

        item.searchText = `${Parser.sourceJsonToAbv(item.item || item).toLowerCase()} -- ${displayText.toLowerCase()}`;

        return btnPill;
    }

    getSources() {
        const out = { all: [], };
        this._items.forEach(it=>{
            out.all.push(it.item);
            const group = this._groupFn(it);
            (out[group] ||= []).push(it.item);
        });
        return out;
    }

    getDefaultMeta() {
        return {
            ...super.getDefaultMeta(),
            ...SourceFilter._DEFAULT_META,
        };
    }

    static _SORT_ITEMS_MINI(a, b) {
        a = a.item ?? a;
        b = b.item ?? b;
        const valA = BrewUtil2.hasSourceJson(a) ? 2 : (SourceUtil.isNonstandardSource(a) || PrereleaseUtil.hasSourceJson(a)) ? 1 : 0;
        const valB = BrewUtil2.hasSourceJson(b) ? 2 : (SourceUtil.isNonstandardSource(b) || PrereleaseUtil.hasSourceJson(b)) ? 1 : 0;
        return SortUtil.ascSort(valA, valB) || SortUtil.ascSortLower(Parser.sourceJsonToFull(a), Parser.sourceJsonToFull(b));
    }

    static _getDisplayHtmlMini(item) {
        item = item.item || item;
        const isBrewSource = BrewUtil2.hasSourceJson(item);
        const isNonStandardSource = !isBrewSource && (SourceUtil.isNonstandardSource(item) || PrereleaseUtil.hasSourceJson(item));
        return `<span ${isBrewSource ? `title="(Homebrew)"` : isNonStandardSource ? `title="(UA/Etc.)"` : ""} class="glyphicon ${isBrewSource ? `glyphicon-glass` : isNonStandardSource ? `glyphicon-file` : `glyphicon-book`}"></span> ${Parser.sourceJsonToAbv(item)}`;
    }
};
SourceFilter._DEFAULT_META = {
    isIncludeOtherSources: false,
    pillDisplayMode: 0,
};
SourceFilter._PILL_DISPLAY_MODE_LABELS = {
    "0": "As Names",
    "1": "As Abbreviations",
    "2": "As Names Plus Abbreviations",
};
SourceFilter._SRD_SOURCES = null;
SourceFilter._BASIC_RULES_SOURCES = null;

class SourceFilterItem extends FilterItem {
    constructor(options) {
        super(options);
        this.isOtherSource = options.isOtherSource;
    }
}
//#endregion
//#region OptionsFilter
let OptionsFilter = class OptionsFilter extends FilterBase {
    constructor(opts) {
        super(opts);
        this._defaultState = opts.defaultState;
        this._displayFn = opts.displayFn;
        this._displayFnMini = opts.displayFnMini;

        Object.assign(this.__state, MiscUtil.copy(opts.defaultState), );

        this._filterBox = null;
        this.__$wrpMini = null;
    }

    getSaveableState() {
        return {
            [this.header]: {
                ...this.getBaseSaveableState(),
                state: {
                    ...this.__state
                },
            },
        };
    }

    setStateFromLoaded(filterState, {isUserSavedState=false}={}) {
        if (!filterState?.[this.header])
            return;

        const toLoad = filterState[this.header];
        this._hasUserSavedState = this._hasUserSavedState || isUserSavedState;

        this.setBaseStateFromLoaded(toLoad);

        const toAssign = {};
        Object.keys(this._defaultState).forEach(k=>{
            if (toLoad.state[k] == null)
                return;
            if (typeof toLoad.state[k] !== typeof this._defaultState[k])
                return;
            toAssign[k] = toLoad.state[k];
        }
        );

        Object.assign(this._state, toAssign);
    }

    _getStateNotDefault() {
        return Object.entries(this._state).filter(([k,v])=>this._defaultState[k] !== v);
    }

    getSubHashes() {
        const out = [];

        const baseMeta = this.getMetaSubHashes();
        if (baseMeta)
            out.push(...baseMeta);

        const serOptionState = [];
        Object.entries(this._defaultState).forEach(([k,vDefault])=>{
            if (this._state[k] !== vDefault)
                serOptionState.push(`${k.toLowerCase()}=${UrlUtil.mini.compress(this._state[k])}`);
        }
        );
        if (serOptionState.length) {
            out.push(UrlUtil.packSubHash(this.getSubHashPrefix("state", this.header), serOptionState));
        }

        return out.length ? out : null;
    }

    getFilterTagPart() {
        const areNotDefaultState = this._getStateNotDefault();
        if (!areNotDefaultState.length)
            return null;

        const pt = areNotDefaultState.map(([k,v])=>`${v ? "" : "!"}${k}`).join(";").toLowerCase();

        return `${this.header.toLowerCase()}=::${pt}::`;
    }

    getDisplayStatePart({nxtState=null}={}) {
        return null;
    }

    getNextStateFromSubhashState(state) {
        const nxtState = this._getNextState_base();

        if (state == null) {
            this._mutNextState_reset(nxtState);
            return nxtState;
        }

        this._mutNextState_meta_fromSubHashState(nxtState, state);

        let hasState = false;

        Object.entries(state).forEach(([k,vals])=>{
            const prop = FilterBase.getProp(k);
            if (prop !== "state")
                return;

            hasState = true;
            vals.forEach(v=>{
                const [prop,valCompressed] = v.split("=");
                const val = UrlUtil.mini.decompress(valCompressed);

                const casedProp = Object.keys(this._defaultState).find(k=>k.toLowerCase() === prop);
                if (!casedProp)
                    return;

                if (this._defaultState[casedProp] != null && typeof val === typeof this._defaultState[casedProp])
                    nxtState[this.header].state[casedProp] = val;
            }
            );
        }
        );

        if (!hasState)
            this._mutNextState_reset(nxtState);

        return nxtState;
    }

    setFromValues(values) {
        if (!values[this.header])
            return;
        const vals = values[this.header];
        Object.entries(vals).forEach(([k,v])=>{
            if (this._defaultState[k] && typeof this._defaultState[k] === typeof v)
                this._state[k] = v;
        }
        );
    }

    setValue(k, v) {
        this._state[k] = v;
    }

    $render(opts) {
        this._filterBox = opts.filterBox;
        this.__$wrpMini = opts.$wrpMini;

        const $wrpControls = opts.isMulti ? null : this._$getHeaderControls();

        const $btns = Object.keys(this._defaultState).map(k=>this._$render_$getPill(k));
        const $wrpButtons = $$`<div>${$btns}</div>`;

        if (opts.isMulti) {
            return this.__$wrpFilter = $$`<div class="ve-flex">
				<div class="fltr__range-inline-label mr-2">${this._getRenderedHeader()}</div>
				${$wrpButtons}
			</div>`;
        } else {
            return this.__$wrpFilter = $$`<div class="ve-flex-col">
				${opts.isFirst ? "" : `<div class="fltr__dropdown-divider mb-1"></div>`}
				<div class="split fltr__h ${this._minimalUi ? "fltr__minimal-hide" : ""} mb-1">
					<div class="fltr__h-text ve-flex-h-center">${this._getRenderedHeader()}</div>
					${$wrpControls}
				</div>
				${$wrpButtons}
			</div>`;
        }
    }

    $renderMinis(opts) {
        if (!opts.$wrpMini)
            return;

        this._filterBox = opts.filterBox;
        this.__$wrpMini = opts.$wrpMini;

        const $btnsMini = Object.keys(this._defaultState).map(k=>this._$render_$getMiniPill(k));
        $btnsMini.forEach($btn=>$btn.appendTo(this.__$wrpMini));
    }

    _$render_$getPill(key) {
        const displayText = this._displayFn(key);

        const $btnPill = $(`<div class="fltr__pill">${displayText}</div>`).click(()=>{
            this._state[key] = !this._state[key];
        }
        ).contextmenu((evt)=>{
            evt.preventDefault();
            this._state[key] = !this._state[key];
        }
        );
        const hook = ()=>{
            const val = FilterBox._PILL_STATES[this._state[key] ? 1 : 2];
            $btnPill.attr("state", val);
        }
        ;
        this._addHook("state", key, hook);
        hook();

        return $btnPill;
    }

    _$render_$getMiniPill(key) {
        const displayTextFull = this._displayFnMini ? this._displayFn(key) : null;
        const displayText = this._displayFnMini ? this._displayFnMini(key) : this._displayFn(key);

        const $btnMini = $(`<div class="fltr__mini-pill ${this._filterBox.isMinisHidden(this.header) ? "ve-hidden" : ""}" state="${FilterBox._PILL_STATES[this._defaultState[key] === this._state[key] ? 0 : this._state[key] ? 1 : 2]}">${displayText}</div>`).title(`${displayTextFull ? `${displayTextFull} (` : ""}Filter: ${this.header}${displayTextFull ? ")" : ""}`).click(()=>{
            this._state[key] = this._defaultState[key];
            this._filterBox.fireChangeEvent();
        }
        );

        const hook = ()=>$btnMini.attr("state", FilterBox._PILL_STATES[this._defaultState[key] === this._state[key] ? 0 : this._state[key] ? 1 : 2]);
        this._addHook("state", key, hook);

        const hideHook = ()=>$btnMini.toggleClass("ve-hidden", this._filterBox.isMinisHidden(this.header));
        this._filterBox.registerMinisHiddenHook(this.header, hideHook);

        return $btnMini;
    }

    _$getHeaderControls() {
        const $btnReset = $(`<button class="btn ve-btn-default btn-xs">Reset</button>`).click(()=>this.reset());
        const $wrpBtns = $$`<div class="ve-flex-v-center">${$btnReset}</div>`;

        const $wrpSummary = $(`<div class="ve-flex-v-center fltr__summary_item fltr__summary_item--include"></div>`).hideVe();

        const $btnShowHide = $(`<button class="btn ve-btn-default btn-xs ml-2 ${this._meta.isHidden ? "active" : ""}">Hide</button>`).click(()=>this._meta.isHidden = !this._meta.isHidden);
        const hkIsHidden = ()=>{
            $btnShowHide.toggleClass("active", this._meta.isHidden);
            $wrpBtns.toggleVe(!this._meta.isHidden);
            $wrpSummary.toggleVe(this._meta.isHidden);

            const cntNonDefault = Object.entries(this._defaultState).filter(([k,v])=>this._state[k] != null && this._state[k] !== v).length;

            $wrpSummary.title(`${cntNonDefault} non-default option${cntNonDefault === 1 ? "" : "s"} selected`).text(cntNonDefault);
        }
        ;
        this._addHook("meta", "isHidden", hkIsHidden);
        hkIsHidden();

        return $$`
		<div class="ve-flex-v-center">
			${$wrpBtns}
			${$wrpSummary}
			${$btnShowHide}
		</div>`;
    }

    getValues({nxtState=null}={}) {
        const state = nxtState?.[this.header]?.state || this.__state;

        const out = Object.entries(this._defaultState).mergeMap(([k,v])=>({
            [k]: state[k] == null ? v : state[k]
        }));
        out._isActive = Object.entries(this._defaultState).some(([k,v])=>state[k] != null && state[k] !== v);
        return {
            [this.header]: out,
        };
    }

    _mutNextState_reset(nxtState, {isResetAll=false}={}) {
        if (isResetAll)
            this._mutNextState_resetBase(nxtState, {
                isResetAll
            });
        Object.assign(nxtState[this.header].state, MiscUtil.copy(this._defaultState));
    }

    update() {}

    toDisplay(boxState, entryVal) {
        const filterState = boxState[this.header];
        if (!filterState)
            return true;
        if (entryVal == null)
            return true;
        return Object.entries(entryVal).every(([k,v])=>this._state[k] === v);
    }

    getDefaultMeta() {
        return {
            ...super.getDefaultMeta(),
            ...OptionsFilter._DEFAULT_META,
        };
    }

    handleSearch(searchTerm) {
        if (this.__$wrpFilter == null)
            return;

        const isVisible = this.header.toLowerCase().includes(searchTerm) || Object.keys(this._defaultState).map(it=>this._displayFn(it).toLowerCase()).some(it=>it.includes(searchTerm));

        this.__$wrpFilter.toggleClass("fltr__hidden--search", !isVisible);

        return isVisible;
    }
}
;
OptionsFilter._DEFAULT_META = {};
//#endregion
//#region AbilityScoreFilter
let AbilityScoreFilter = class AbilityScoreFilter extends FilterBase {
    static _MODIFIER_SORT_OFFSET = 10000;
    constructor(opts) {
        super(opts);

        this._items = [];
        this._isItemsDirty = false;
        this._itemsLookup = {};
        this._seenUids = {};

        this.__$wrpFilter = null;
        this.__wrpPills = null;
        this.__wrpPillsRows = {};
        this.__wrpMiniPills = null;

        this._maxMod = 2;
        this._minMod = 0;

        Parser.ABIL_ABVS.forEach(ab=>{
            const itemAnyIncrease = new AbilityScoreFilter.FilterItem({
                isAnyIncrease: true,
                ability: ab
            });
            const itemAnyDecrease = new AbilityScoreFilter.FilterItem({
                isAnyDecrease: true,
                ability: ab
            });
            this._items.push(itemAnyIncrease, itemAnyDecrease);
            this._itemsLookup[itemAnyIncrease.uid] = itemAnyIncrease;
            this._itemsLookup[itemAnyDecrease.uid] = itemAnyDecrease;
            if (this.__state[itemAnyIncrease.uid] == null)
                this.__state[itemAnyIncrease.uid] = 0;
            if (this.__state[itemAnyDecrease.uid] == null)
                this.__state[itemAnyDecrease.uid] = 0;
        }
        );

        for (let i = this._minMod; i <= this._maxMod; ++i) {
            if (i === 0)
                continue;
            Parser.ABIL_ABVS.forEach(ab=>{
                const item = new AbilityScoreFilter.FilterItem({
                    modifier: i,
                    ability: ab
                });
                this._items.push(item);
                this._itemsLookup[item.uid] = item;
                if (this.__state[item.uid] == null)
                    this.__state[item.uid] = 0;
            }
            );
        }
    }

    $render(opts) {
        this._filterBox = opts.filterBox;
        this.__wrpMiniPills = e_({
            ele: opts.$wrpMini[0]
        });

        const wrpControls = this._getHeaderControls(opts);

        this.__wrpPills = e_({
            tag: "div",
            clazz: `fltr__wrp-pills overflow-x-auto ve-flex-col w-100`
        });
        const hook = ()=>this.__wrpPills.toggleVe(!this._meta.isHidden);
        this._addHook("meta", "isHidden", hook);
        hook();

        this._doRenderPills();

        const btnMobToggleControls = Filter.prototype._getBtnMobToggleControls.bind(this)(wrpControls);

        this.__$wrpFilter = $$`<div>
			${opts.isFirst ? "" : `<div class="fltr__dropdown-divider ${opts.isMulti ? "fltr__dropdown-divider--indented" : ""} mb-1"></div>`}
			<div class="split fltr__h mb-1">
				<div class="ml-2 fltr__h-text ve-flex-h-center">${opts.isMulti ? `<span class="mr-2">\u2012</span>` : ""}${this._getRenderedHeader()}${btnMobToggleControls}</div>
				${wrpControls}
			</div>
			${this.__wrpPills}
		</div>`;

        this.update();
        return this.__$wrpFilter;
    }

    _getHeaderControls(opts) {
        const btnClear = e_({
            tag: "button",
            clazz: `btn ve-btn-default ${opts.isMulti ? "btn-xxs" : "btn-xs"} fltr__h-btn--clear w-100`,
            click: ()=>this._doSetPillsClear(),
            html: "Clear",
        });

        const wrpStateBtnsOuter = e_({
            tag: "div",
            clazz: "ve-flex-v-center fltr__h-wrp-state-btns-outer",
            children: [e_({
                tag: "div",
                clazz: "btn-group ve-flex-v-center w-100",
                children: [btnClear, ],
            }), ],
        });

        const wrpSummary = e_({
            tag: "div",
            clazz: "ve-flex-vh-center ve-hidden"
        });

        const btnShowHide = e_({
            tag: "button",
            clazz: `btn ve-btn-default ${opts.isMulti ? "btn-xxs" : "btn-xs"} ml-2`,
            click: ()=>this._meta.isHidden = !this._meta.isHidden,
            html: "Hide",
        });
        const hookShowHide = ()=>{
            e_({
                ele: btnShowHide
            }).toggleClass("active", this._meta.isHidden);
            wrpStateBtnsOuter.toggleVe(!this._meta.isHidden);

            const cur = this.getValues()[this.header];

            const htmlSummary = [cur._totals?.yes ? `<span class="fltr__summary_item fltr__summary_item--include" title="${cur._totals.yes} hidden &quot;required&quot; tags">${cur._totals.yes}</span>` : null, ].filter(Boolean).join("");
            e_({
                ele: wrpSummary,
                html: htmlSummary
            }).toggleVe(this._meta.isHidden);
        }
        ;
        this._addHook("meta", "isHidden", hookShowHide);
        hookShowHide();

        return e_({
            tag: "div",
            clazz: `ve-flex-v-center fltr__h-wrp-btns-outer`,
            children: [wrpSummary, wrpStateBtnsOuter, btnShowHide, ],
        });
    }

    _doRenderPills() {
        this._items.sort(this.constructor._ascSortItems.bind(this.constructor));

        if (!this.__wrpPills)
            return;
        this._items.forEach(it=>{
            if (!it.rendered)
                it.rendered = this._getPill(it);
            if (!it.isAnyIncrease && !it.isAnyDecrease)
                it.rendered.toggleClass("fltr__pill--muted", !this._seenUids[it.uid]);

            if (!this.__wrpPillsRows[it.ability]) {
                this.__wrpPillsRows[it.ability] = {
                    row: e_({
                        tag: "div",
                        clazz: "ve-flex-v-center w-100 my-1",
                        children: [e_({
                            tag: "div",
                            clazz: "mr-3 text-right fltr__label-ability-score no-shrink no-grow",
                            text: Parser.attAbvToFull(it.ability),
                        }), ],
                    }).appendTo(this.__wrpPills),
                    searchText: Parser.attAbvToFull(it.ability).toLowerCase(),
                };
            }

            it.rendered.appendTo(this.__wrpPillsRows[it.ability].row);
        }
        );
    }

    _getPill(item) {
        const unsetRow = ()=>{
            const nxtState = {};
            for (let i = this._minMod; i <= this._maxMod; ++i) {
                if (!i || i === item.modifier)
                    continue;
                const siblingUid = AbilityScoreFilter.FilterItem.getUid_({
                    ability: item.ability,
                    modifier: i
                });
                nxtState[siblingUid] = 0;
            }

            if (!item.isAnyIncrease)
                nxtState[AbilityScoreFilter.FilterItem.getUid_({
                    ability: item.ability,
                    isAnyIncrease: true
                })] = 0;
            if (!item.isAnyDecrease)
                nxtState[AbilityScoreFilter.FilterItem.getUid_({
                    ability: item.ability,
                    isAnyDecrease: true
                })] = 0;

            this._proxyAssignSimple("state", nxtState);
        }
        ;

        const btnPill = e_({
            tag: "div",
            clazz: `fltr__pill fltr__pill--ability-bonus px-2`,
            html: item.getPillDisplayHtml(),
            click: evt=>{
                if (evt.shiftKey) {
                    const nxtState = {};
                    Object.keys(this._state).forEach(k=>nxtState[k] = 0);
                    this._proxyAssign("state", "_state", "__state", nxtState, true);
                }

                this._state[item.uid] = this._state[item.uid] ? 0 : 1;
                if (this._state[item.uid])
                    unsetRow();
            }
            ,
            contextmenu: (evt)=>{
                evt.preventDefault();

                this._state[item.uid] = this._state[item.uid] ? 0 : 1;
                if (this._state[item.uid])
                    unsetRow();
            }
            ,
        });

        const hook = ()=>{
            const val = FilterBox._PILL_STATES[this._state[item.uid] || 0];
            btnPill.attr("state", val);
        }
        ;
        this._addHook("state", item.uid, hook);
        hook();

        return btnPill;
    }

    _doRenderMiniPills() {
        this._items.slice(0).sort(this.constructor._ascSortMiniPills.bind(this.constructor)).forEach(it=>{
            (it.btnMini = it.btnMini || this._getBtnMini(it)).appendTo(this.__wrpMiniPills);
        }
        );
    }

    _getBtnMini(item) {
        const btnMini = e_({
            tag: "div",
            clazz: `fltr__mini-pill ${this._filterBox.isMinisHidden(this.header) ? "ve-hidden" : ""}`,
            text: item.getMiniPillDisplayText(),
            title: `Filter: ${this.header}`,
            click: ()=>{
                this._state[item.uid] = 0;
                this._filterBox.fireChangeEvent();
            }
            ,
        }).attr("state", FilterBox._PILL_STATES[this._state[item.uid] || 0]);

        const hook = ()=>btnMini.attr("state", FilterBox._PILL_STATES[this._state[item.uid] || 0]);
        this._addHook("state", item.uid, hook);

        const hideHook = ()=>btnMini.toggleClass("ve-hidden", this._filterBox.isMinisHidden(this.header));
        this._filterBox.registerMinisHiddenHook(this.header, hideHook);

        return btnMini;
    }

    static _ascSortItems(a, b) {
        return SortUtil.ascSort(Number(b.isAnyIncrease), Number(a.isAnyIncrease)) || SortUtil.ascSortAtts(a.ability, b.ability) || SortUtil.ascSort(b.modifier ? b.modifier + AbilityScoreFilter._MODIFIER_SORT_OFFSET : b.modifier, a.modifier ? a.modifier + AbilityScoreFilter._MODIFIER_SORT_OFFSET : a.modifier) || SortUtil.ascSort(Number(b.isAnyDecrease), Number(a.isAnyDecrease));
    }

    static _ascSortMiniPills(a, b) {
        return SortUtil.ascSort(Number(b.isAnyIncrease), Number(a.isAnyIncrease)) || SortUtil.ascSort(Number(b.isAnyDecrease), Number(a.isAnyDecrease)) || SortUtil.ascSort(b.modifier ? b.modifier + AbilityScoreFilter._MODIFIER_SORT_OFFSET : b.modifier, a.modifier ? a.modifier + AbilityScoreFilter._MODIFIER_SORT_OFFSET : a.modifier) || SortUtil.ascSortAtts(a.ability, b.ability);
    }

    $renderMinis(opts) {
        this._filterBox = opts.filterBox;
        this.__wrpMiniPills = e_({
            ele: opts.$wrpMini[0]
        });

        this._doRenderMiniPills();
    }

    getValues({nxtState=null}={}) {
        const out = {
            _totals: {
                yes: 0
            },
        };

        const state = nxtState?.[this.header]?.state || this.__state;

        Object.entries(state).filter(([,value])=>value).forEach(([uid])=>{
            out._totals.yes++;
            out[uid] = true;
        }
        );

        return {
            [this.header]: out
        };
    }

    _mutNextState_reset(nxtState, {isResetAll=false}={}) {
        Object.keys(nxtState[this.header].state).forEach(k=>delete nxtState[this.header].state[k]);
    }

    update() {
        if (this._isItemsDirty) {
            this._isItemsDirty = false;

            this._doRenderPills();
        }

        this._doRenderMiniPills();
    }

    _doSetPillsClear() {
        Object.keys(this._state).forEach(k=>{
            if (this._state[k] !== 0)
                this._state[k] = 0;
        }
        );
    }

    toDisplay(boxState, entryVal) {
        const filterState = boxState[this.header];
        if (!filterState)
            return true;

        const activeItems = Object.keys(filterState).filter(it=>!it.startsWith("_")).map(it=>this._itemsLookup[it]).filter(Boolean);

        if (!activeItems.length)
            return true;
        if ((!entryVal || !entryVal.length) && activeItems.length)
            return false;

        return entryVal.some(abilObject=>{
            const cpyAbilObject = MiscUtil.copy(abilObject);
            const vewActiveItems = [...activeItems];

            Parser.ABIL_ABVS.forEach(ab=>{
                if (!cpyAbilObject[ab] || !vewActiveItems.length)
                    return;

                const ixExact = vewActiveItems.findIndex(it=>it.ability === ab && it.modifier === cpyAbilObject[ab]);
                if (~ixExact)
                    return vewActiveItems.splice(ixExact, 1);
            }
            );
            if (!vewActiveItems.length)
                return true;

            if (cpyAbilObject.choose?.from) {
                const amount = cpyAbilObject.choose.amount || 1;
                const count = cpyAbilObject.choose.count || 1;

                for (let i = 0; i < count; ++i) {
                    if (!vewActiveItems.length)
                        break;

                    const ix = vewActiveItems.findIndex(it=>cpyAbilObject.choose.from.includes(it.ability) && amount === it.modifier);
                    if (~ix) {
                        const [cpyActiveItem] = vewActiveItems.splice(ix, 1);
                        cpyAbilObject.choose.from = cpyAbilObject.choose.from.filter(it=>it !== cpyActiveItem.ability);
                    }
                }
            } else if (cpyAbilObject.choose?.weighted?.weights && cpyAbilObject.choose?.weighted?.from) {
                cpyAbilObject.choose.weighted.weights.forEach(weight=>{
                    const ix = vewActiveItems.findIndex(it=>cpyAbilObject.choose.weighted.from.includes(it.ability) && weight === it.modifier);
                    if (~ix) {
                        const [cpyActiveItem] = vewActiveItems.splice(ix, 1);
                        cpyAbilObject.choose.weighted.from = cpyAbilObject.choose.weighted.from.filter(it=>it !== cpyActiveItem.ability);
                    }
                }
                );
            }
            if (!vewActiveItems.length)
                return true;

            Parser.ABIL_ABVS.forEach(ab=>{
                if (!cpyAbilObject[ab] || !vewActiveItems.length)
                    return;

                const ix = vewActiveItems.findIndex(it=>it.ability === ab && ((cpyAbilObject[ab] > 0 && it.isAnyIncrease) || (cpyAbilObject[ab] < 0 && it.isAnyDecrease)));
                if (~ix)
                    return vewActiveItems.splice(ix, 1);
            }
            );
            if (!vewActiveItems.length)
                return true;

            if (cpyAbilObject.choose?.from) {
                const amount = cpyAbilObject.choose.amount || 1;
                const count = cpyAbilObject.choose.count || 1;

                for (let i = 0; i < count; ++i) {
                    if (!vewActiveItems.length)
                        return true;

                    const ix = vewActiveItems.findIndex(it=>cpyAbilObject.choose.from.includes(it.ability) && ((amount > 0 && it.isAnyIncrease) || (amount < 0 && it.isAnyDecrease)));
                    if (~ix) {
                        const [cpyActiveItem] = vewActiveItems.splice(ix, 1);
                        cpyAbilObject.choose.from = cpyAbilObject.choose.from.filter(it=>it !== cpyActiveItem.ability);
                    }
                }
            } else if (cpyAbilObject.choose?.weighted?.weights && cpyAbilObject.choose?.weighted?.from) {
                cpyAbilObject.choose.weighted.weights.forEach(weight=>{
                    if (!vewActiveItems.length)
                        return;

                    const ix = vewActiveItems.findIndex(it=>cpyAbilObject.choose.weighted.from.includes(it.ability) && ((weight > 0 && it.isAnyIncrease) || (weight < 0 && it.isAnyDecrease)));
                    if (~ix) {
                        const [cpyActiveItem] = vewActiveItems.splice(ix, 1);
                        cpyAbilObject.choose.weighted.from = cpyAbilObject.choose.weighted.from.filter(it=>it !== cpyActiveItem.ability);
                    }
                }
                );
            }
            return !vewActiveItems.length;
        }
        );
    }

    addItem(abilArr) {
        if (!abilArr?.length)
            return;

        let nxtMaxMod = this._maxMod;
        let nxtMinMod = this._minMod;

        abilArr.forEach(abilObject=>{
            Parser.ABIL_ABVS.forEach(ab=>{
                if (abilObject[ab] != null) {
                    nxtMaxMod = Math.max(nxtMaxMod, abilObject[ab]);
                    nxtMinMod = Math.min(nxtMinMod, abilObject[ab]);

                    const uid = AbilityScoreFilter.FilterItem.getUid_({
                        ability: ab,
                        modifier: abilObject[ab]
                    });
                    if (!this._seenUids[uid])
                        this._isItemsDirty = true;
                    this._seenUids[uid] = true;
                }
            }
            );

            if (abilObject.choose?.from) {
                const amount = abilObject.choose.amount || 1;
                nxtMaxMod = Math.max(nxtMaxMod, amount);
                nxtMinMod = Math.min(nxtMinMod, amount);

                abilObject.choose.from.forEach(ab=>{
                    const uid = AbilityScoreFilter.FilterItem.getUid_({
                        ability: ab,
                        modifier: amount
                    });
                    if (!this._seenUids[uid])
                        this._isItemsDirty = true;
                    this._seenUids[uid] = true;
                }
                );
            }

            if (abilObject.choose?.weighted?.weights) {
                nxtMaxMod = Math.max(nxtMaxMod, ...abilObject.choose.weighted.weights);
                nxtMinMod = Math.min(nxtMinMod, ...abilObject.choose.weighted.weights);

                abilObject.choose.weighted.from.forEach(ab=>{
                    abilObject.choose.weighted.weights.forEach(weight=>{
                        const uid = AbilityScoreFilter.FilterItem.getUid_({
                            ability: ab,
                            modifier: weight
                        });
                        if (!this._seenUids[uid])
                            this._isItemsDirty = true;
                        this._seenUids[uid] = true;
                    }
                    );
                }
                );
            }
        }
        );

        if (nxtMaxMod > this._maxMod) {
            for (let i = this._maxMod + 1; i <= nxtMaxMod; ++i) {
                if (i === 0)
                    continue;
                Parser.ABIL_ABVS.forEach(ab=>{
                    const item = new AbilityScoreFilter.FilterItem({
                        modifier: i,
                        ability: ab
                    });
                    this._items.push(item);
                    this._itemsLookup[item.uid] = item;
                    if (this.__state[item.uid] == null)
                        this.__state[item.uid] = 0;
                }
                );
            }

            this._isItemsDirty = true;
            this._maxMod = nxtMaxMod;
        }

        if (nxtMinMod < this._minMod) {
            for (let i = nxtMinMod; i < this._minMod; ++i) {
                if (i === 0)
                    continue;
                Parser.ABIL_ABVS.forEach(ab=>{
                    const item = new AbilityScoreFilter.FilterItem({
                        modifier: i,
                        ability: ab
                    });
                    this._items.push(item);
                    this._itemsLookup[item.uid] = item;
                    if (this.__state[item.uid] == null)
                        this.__state[item.uid] = 0;
                }
                );
            }

            this._isItemsDirty = true;
            this._minMod = nxtMinMod;
        }
    }

    getSaveableState() {
        return {
            [this.header]: {
                ...this.getBaseSaveableState(),
                state: {
                    ...this.__state
                },
            },
        };
    }

    setStateFromLoaded(filterState, {isUserSavedState=false}={}) {
        if (!filterState?.[this.header])
            return;

        const toLoad = filterState[this.header];
        this._hasUserSavedState = this._hasUserSavedState || isUserSavedState;
        this.setBaseStateFromLoaded(toLoad);
        Object.assign(this._state, toLoad.state);
    }

    getSubHashes() {
        const out = [];

        const baseMeta = this.getMetaSubHashes();
        if (baseMeta)
            out.push(...baseMeta);

        const areNotDefaultState = Object.entries(this._state).filter(([k,v])=>{
            if (k.startsWith("_"))
                return false;
            return !!v;
        }
        );
        if (areNotDefaultState.length) {
            const serPillStates = areNotDefaultState.map(([k,v])=>`${k.toUrlified()}=${v}`);
            out.push(UrlUtil.packSubHash(this.getSubHashPrefix("state", this.header), serPillStates));
        }

        if (!out.length)
            return null;

        return out;
    }

    getNextStateFromSubhashState(state) {
        const nxtState = this._getNextState_base();

        if (state == null) {
            this._mutNextState_reset(nxtState);
            return nxtState;
        }

        let hasState = false;

        Object.entries(state).forEach(([k,vals])=>{
            const prop = FilterBase.getProp(k);
            switch (prop) {
            case "state":
                {
                    hasState = true;
                    Object.keys(nxtState[this.header].state).forEach(k=>nxtState[this.header].state[k] = 0);

                    vals.forEach(v=>{
                        const [statePropLower,state] = v.split("=");
                        const stateProp = Object.keys(nxtState[this.header].state).find(k=>k.toLowerCase() === statePropLower);
                        if (stateProp)
                            nxtState[this.header].state[stateProp] = Number(state) ? 1 : 0;
                    }
                    );
                    break;
                }
            }
        }
        );

        if (!hasState)
            this._mutNextState_reset(nxtState);

        return nxtState;
    }

    setFromValues(values) {
        if (!values[this.header])
            return;
        const nxtState = {};
        Object.keys(this._state).forEach(k=>nxtState[k] = 0);
        Object.assign(nxtState, values[this.header]);
    }

    handleSearch(searchTerm) {
        const isHeaderMatch = this.header.toLowerCase().includes(searchTerm);

        if (isHeaderMatch) {
            Object.values(this.__wrpPillsRows).forEach(meta=>meta.row.removeClass("fltr__hidden--search"));

            if (this.__$wrpFilter)
                this.__$wrpFilter.toggleClass("fltr__hidden--search", false);

            return true;
        }

        const isModNumber = /^[-+]\d*$/.test(searchTerm);

        let visibleCount = 0;
        Object.values(this.__wrpPillsRows).forEach(({row, searchText})=>{
            const isVisible = isModNumber || searchText.includes(searchTerm);
            row.toggleClass("fltr__hidden--search", !isVisible);
            if (isVisible)
                visibleCount++;
        }
        );

        if (this.__$wrpFilter)
            this.__$wrpFilter.toggleClass("fltr__hidden--search", visibleCount === 0);

        return visibleCount !== 0;
    }

    _doTeardown() {
        this._items.forEach(it=>{
            if (it.rendered)
                it.rendered.detach();
            if (it.btnMini)
                it.btnMini.detach();
        }
        );

        Object.values(this.__wrpPillsRows).forEach(meta=>meta.row.detach());
    }

    _getStateNotDefault() {
        return Object.entries(this._state).filter(([,v])=>!!v);
    }

    getFilterTagPart() {
        const areNotDefaultState = this._getStateNotDefault();
        const compressedMeta = this._getCompressedMeta({
            isStripUiKeys: true
        });

        if (!areNotDefaultState.length && !compressedMeta)
            return null;

        const pt = Object.entries(this._state).filter(([,v])=>!!v).map(([k,v])=>`${v === 2 ? "!" : ""}${k}`).join(";").toLowerCase();

        return [this.header.toLowerCase(), pt, compressedMeta ? compressedMeta.join(HASH_SUB_LIST_SEP) : null, ].filter(it=>it != null).join("=");
    }

    getDisplayStatePart({nxtState=null}={}) {
        const state = nxtState?.[this.header]?.state || this.__state;

        const areNotDefaultState = this._getStateNotDefault({
            nxtState
        });

        if (!areNotDefaultState.length)
            return null;

        const ptState = Object.entries(state).filter(([,v])=>!!v).map(([k,v])=>{
            const item = this._items.find(item=>item.uid === k);
            if (!item)
                return null;
            return `${v === 2 ? "not " : ""}${item.getMiniPillDisplayText()}`;
        }
        ).join(", ");

        return `${this.header}: ${ptState}`;
    }
};
globalThis.AbilityScoreFilter = AbilityScoreFilter;
AbilityScoreFilter.FilterItem = class {
    static getUid_({ability=null, isAnyIncrease=false, isAnyDecrease=false, modifier=null}) {
        return `${Parser.attAbvToFull(ability)} ${modifier != null ? UiUtil.intToBonus(modifier) : (isAnyIncrease ? `+any` : isAnyDecrease ? `-any` : "?")}`;
    }

    constructor({isAnyIncrease=false, isAnyDecrease=false, modifier=null, ability=null}) {
        if (isAnyIncrease && isAnyDecrease)
            throw new Error(`Invalid arguments!`);
        if ((isAnyIncrease || isAnyDecrease) && modifier != null)
            throw new Error(`Invalid arguments!`);

        this._ability = ability;
        this._modifier = modifier;
        this._isAnyIncrease = isAnyIncrease;
        this._isAnyDecrease = isAnyDecrease;
        this._uid = AbilityScoreFilter.FilterItem.getUid_({
            isAnyIncrease: this._isAnyIncrease,
            isAnyDecrease: this._isAnyDecrease,
            modifier: this._modifier,
            ability: this._ability,
        });
    }

    get ability() {
        return this._ability;
    }
    get modifier() {
        return this._modifier;
    }
    get isAnyIncrease() {
        return this._isAnyIncrease;
    }
    get isAnyDecrease() {
        return this._isAnyDecrease;
    }
    get uid() {
        return this._uid;
    }

    getMiniPillDisplayText() {
        if (this._isAnyIncrease)
            return `+Any ${Parser.attAbvToFull(this._ability)}`;
        if (this._isAnyDecrease)
            return `\u2012Any ${Parser.attAbvToFull(this._ability)}`;
        return `${UiUtil.intToBonus(this._modifier, {
            isPretty: true
        })} ${Parser.attAbvToFull(this._ability)}`;
    }

    getPillDisplayHtml() {
        if (this._isAnyIncrease)
            return `+Any`;
        if (this._isAnyDecrease)
            return `\u2012Any`;
        return UiUtil.intToBonus(this._modifier, {
            isPretty: true
        });
    }
};
//#endregion

//#region PageFilters
class PageFilter {
    
    constructor(opts) {
        opts = opts || {};
        this._sourceFilter = new SourceFilter(opts.sourceFilterOpts);
        this._filterBox = null;
    }

    get filterBox() { return this._filterBox; }
    get sourceFilter() { return this._sourceFilter; }

    mutateAndAddToFilters(entity, isExcluded, opts) {
        this.constructor.mutateForFilters(entity, opts);
        this.addToFilters(entity, isExcluded, opts);
    }

    static mutateForFilters(entity, opts) {
        throw new Error("Unimplemented!");
    }
    addToFilters(entity, isExcluded, opts) {
        throw new Error("Unimplemented!");
    }
    toDisplay(values, entity) {
        throw new Error("Unimplemented!");
    }
    async _pPopulateBoxOptions() {
        throw new Error("Unimplemented!");
    }

    async pInitFilterBox(opts) {
        opts = opts || {};
        await this._pPopulateBoxOptions(opts);
        this._filterBox = new FilterBox(opts);
        await this._filterBox.pDoLoadState();
        return this._filterBox;
    }

    trimState() {
        return this._filterBox.trimState_();
    }

    static _getClassFilterItem({className, classSource, isVariantClass, definedInSource}) {
        const nm = className.split("(")[0].trim();
        const variantSuffix = isVariantClass ? ` [${definedInSource ? Parser.sourceJsonToAbv(definedInSource) : "Unknown"}]` : "";
        const sourceSuffix = (SourceUtil.isNonstandardSource(classSource || Parser.SRC_PHB) || (typeof PrereleaseUtil !== "undefined" && PrereleaseUtil.hasSourceJson(classSource || Parser.SRC_PHB)) || (typeof BrewUtil2 !== "undefined" && BrewUtil2.hasSourceJson(classSource || Parser.SRC_PHB))) ? ` (${Parser.sourceJsonToAbv(classSource)})` : "";
        const name = `${nm}${variantSuffix}${sourceSuffix}`;

        const opts = {
            item: name,
            userData: {
                group: SourceUtil.getFilterGroup(classSource || Parser.SRC_PHB),
            },
        };

        if (isVariantClass) {
            opts.nest = definedInSource ? Parser.sourceJsonToFull(definedInSource) : "Unknown";
            opts.userData.equivalentClassName = `${nm}${sourceSuffix}`;
            opts.userData.definedInSource = definedInSource;
        }

        return new FilterItem$1(opts);
    }

    static _getSubclassFilterItem({className, classSource, subclassShortName, subclassName, subclassSource, subSubclassName, isVariantClass, definedInSource}) {
        const group = SourceUtil.isSubclassReprinted(className, classSource, subclassShortName, subclassSource) || Parser.sourceJsonToFull(subclassSource).startsWith(Parser.UA_PREFIX) || Parser.sourceJsonToFull(subclassSource).startsWith(Parser.PS_PREFIX);

        const classFilterItem = this._getClassFilterItem({
            className: subclassShortName || subclassName,
            classSource: subclassSource,
        });

        return new FilterItem$1({
            item: `${className}: ${classFilterItem.item}${subSubclassName ? `, ${subSubclassName}` : ""}`,
            nest: className,
            userData: {
                group,
            },
        });
    }

    static _isReprinted({reprintedAs, tag, page, prop}) {
        return reprintedAs?.length && reprintedAs.some(it=>{
            const {name, source} = DataUtil.generic.unpackUid(it?.uid ?? it, tag);
            const hash = UrlUtil.URL_TO_HASH_BUILDER[page]({
                name,
                source
            });
            return !ExcludeUtil.isExcluded(hash, prop, source, {
                isNoCount: true
            });
        }
        );
    }

    static getListAliases(ent) {
        return (ent.alias || []).map(it=>`"${it}"`).join(",");
    }

    static defaultSourceSelFn(val) {
        return SourceUtil.getFilterGroup(val) === SourceUtil.FILTER_GROUP_STANDARD;
    }
};

//#region PageFilterClasses
class PageFilterClassesBase extends PageFilter {
    constructor() {
        super();

        this._miscFilter = new Filter({
            header: "Miscellaneous",
            items: ["Reprinted", "Sidekick", "SRD", "Basic Rules"],
            deselFn: (it)=>{
                return it === "Reprinted" || it === "Sidekick";
            }
            ,
            displayFnMini: it=>it === "Reprinted" ? "Repr." : it,
            displayFnTitle: it=>it === "Reprinted" ? it : "",
            isMiscFilter: true,
        });

        this._optionsFilter = new OptionsFilter({
            header: "Other/Text Options",
            defaultState: {
                isDisplayClassIfSubclassActive: false,
                isClassFeatureVariant: true,
            },
            displayFn: k=>{
                switch (k) {
                case "isClassFeatureVariant":
                    return "Class Feature Options/Variants";
                case "isDisplayClassIfSubclassActive":
                    return "Display Class if Any Subclass is Visible";
                default:
                    throw new Error(`Unhandled key "${k}"`);
                }
            }
            ,
            displayFnMini: k=>{
                switch (k) {
                case "isClassFeatureVariant":
                    return "C.F.O/V.";
                case "isDisplayClassIfSubclassActive":
                    return "Sc>C";
                default:
                    throw new Error(`Unhandled key "${k}"`);
                }
            }
            ,
        });
    }

    get optionsFilter() {
        return this._optionsFilter;
    }

    static mutateForFilters(cls) {
        cls.source = cls.source || Parser.SRC_PHB;
        cls.subclasses = cls.subclasses || [];

        cls._fSources = SourceFilter.getCompleteFilterSources(cls);

        cls._fSourceSubclass = [...new Set([cls.source, ...cls.subclasses.map(it=>[it.source, ...(it.otherSources || []).map(it=>it.source)]).flat(), ]), ];

        cls._fMisc = [];
        if (cls.isReprinted)
            cls._fMisc.push("Reprinted");
        if (cls.srd)
            cls._fMisc.push("SRD");
        if (cls.basicRules)
            cls._fMisc.push("Basic Rules");
        if (cls.isSidekick)
            cls._fMisc.push("Sidekick");

        cls.subclasses.forEach(sc=>{
            sc.source = sc.source || cls.source;
            sc.shortName = sc.shortName || sc.name;
            sc._fMisc = [];
            if (sc.srd)
                sc._fMisc.push("SRD");
            if (sc.basicRules)
                sc._fMisc.push("Basic Rules");
            if (sc.isReprinted)
                sc._fMisc.push("Reprinted");
        }
        );
    }

    _addEntrySourcesToFilter(entry) {
        this._addEntrySourcesToFilter_walk(entry);
    }

    _addEntrySourcesToFilter_walk = (obj)=>{
        if ((typeof obj !== "object") || obj == null)
            return;

        if (obj instanceof Array)
            return obj.forEach(this._addEntrySourcesToFilter_walk.bind(this));

        if (obj.source)
            this._sourceFilter.addItem(obj.source);
        if (obj.entries)
            this._addEntrySourcesToFilter_walk(obj.entries);
    }
    ;

    addToFilters(cls, isExcluded, opts) {
        if (isExcluded)
            return;
        opts = opts || {};
        const subclassExclusions = opts.subclassExclusions || {};

        this._sourceFilter.addItem(cls.source);

        if (cls.fluff)
            cls.fluff.forEach(it=>this._addEntrySourcesToFilter(it));
        cls.classFeatures.forEach(lvlFeatures=>lvlFeatures.forEach(feature=>this._addEntrySourcesToFilter(feature)));

        cls.subclasses.forEach(sc=>{
            const isScExcluded = (subclassExclusions[sc.source] || {})[sc.name] || false;
            if (!isScExcluded) {
                this._sourceFilter.addItem(sc.source);
                sc.subclassFeatures.forEach(lvlFeatures=>lvlFeatures.forEach(feature=>this._addEntrySourcesToFilter(feature)));
            }
        }
        );
    }

    async _pPopulateBoxOptions(opts) {
        opts.filters = [this._sourceFilter, this._miscFilter, this._optionsFilter, ];
        opts.isCompact = true;
    }

    isClassNaturallyDisplayed(values, cls) {
        return this._filterBox.toDisplay(values, ...this.constructor._getIsClassNaturallyDisplayedToDisplayParams(cls), );
    }

    static _getIsClassNaturallyDisplayedToDisplayParams(cls) {
        return [cls._fSources, cls._fMisc];
    }

    isAnySubclassDisplayed(values, cls) {
        return values[this._optionsFilter.header].isDisplayClassIfSubclassActive && (cls.subclasses || []).some(sc=>{
            if (this._filterBox.toDisplay(values, ...this.constructor._getIsSubclassDisplayedToDisplayParams(cls, sc), ))
                return true;

            return sc.otherSources?.length && sc.otherSources.some(src=>this._filterBox.toDisplay(values, ...this.constructor._getIsSubclassDisplayedToDisplayParams(cls, sc, src), ));
        }
        );
    }

    static _getIsSubclassDisplayedToDisplayParams(cls, sc, otherSourcesSource) {
        return [otherSourcesSource || sc.source, sc._fMisc, null, ];
    }

    isSubclassVisible(f, cls, sc) {
        if (this.filterBox.toDisplay(f, ...this.constructor._getIsSubclassVisibleToDisplayParams(cls, sc), ))
            return true;

        if (!sc.otherSources?.length)
            return false;

        return sc.otherSources.some(src=>this.filterBox.toDisplay(f, ...this.constructor._getIsSubclassVisibleToDisplayParams(cls, sc, src.source), ));
    }

    static _getIsSubclassVisibleToDisplayParams(cls, sc, otherSourcesSource) {
        return [otherSourcesSource || sc.source, sc._fMisc, null, ];
    }

    getActiveSource(values) {
        const sourceFilterValues = values[this._sourceFilter.header];
        if (!sourceFilterValues)
            return null;
        return Object.keys(sourceFilterValues).find(it=>this._sourceFilter.toDisplay(values, it));
    }

    toDisplay(values, it) {
        return this._filterBox.toDisplay(values, ...this._getToDisplayParams(values, it), );
    }

    _getToDisplayParams(values, cls) {
        return [this.isAnySubclassDisplayed(values, cls) ? cls._fSourceSubclass : (cls._fSources ?? cls.source), cls._fMisc, null, ];
    }
};

class PageFilterClasses extends PageFilterClassesBase {
    static _getClassSubclassLevelArray(it) {
        return it.classFeatures.map((_,i)=>i + 1);
    }

    constructor() {
        super();

        this._levelFilter = new RangeFilter({
            header: "Feature Level",
            min: 1,
            max: 20,
        });
    }

    get levelFilter() {
        return this._levelFilter;
    }

    static mutateForFilters(cls) {
        super.mutateForFilters(cls);

        cls._fLevelRange = this._getClassSubclassLevelArray(cls);
    }

    addToFilters(cls, isExcluded, opts) {
        super.addToFilters(cls, isExcluded, opts);

        if (isExcluded)
            return;

        this._levelFilter.addItem(cls._fLevelRange);
    }

    async _pPopulateBoxOptions(opts) {
        await super._pPopulateBoxOptions(opts);

        opts.filters = [this._sourceFilter, this._miscFilter, this._levelFilter, this._optionsFilter, ];
    }

    static _getIsClassNaturallyDisplayedToDisplayParams(cls) {
        return [cls._fSources, cls._fMisc, cls._fLevelRange];
    }

    static _getIsSubclassDisplayedToDisplayParams(cls, sc, otherSourcesSource) {
        return [otherSourcesSource || sc.source, sc._fMisc, cls._fLevelRange];
    }

    static _getIsSubclassVisibleToDisplayParams(cls, sc, otherSourcesSource) {
        return [otherSourcesSource || sc.source, sc._fMisc, cls._fLevelRange, null];
    }

    _getToDisplayParams(values, cls) {
        return [this.isAnySubclassDisplayed(values, cls) ? cls._fSourceSubclass : (cls._fSources ?? cls.source), cls._fMisc, cls._fLevelRange, ];
    }
};

class PageFilterClassesRaw extends PageFilterClassesBase {
    static _WALKER = null;
    static _IMPLS_SIDE_DATA = {};

    async _pPopulateBoxOptions(opts) {
        await super._pPopulateBoxOptions(opts);
        opts.isCompact = false;
    }


    /**
     * Add a class (and any attached class features and subclasses) to the filter
     * @param {Object} cls - the class object
     * @param {any} isExcluded - will return if true
     * @param {any} opts - only opts.subclassExclusions matters
     */
    addToFilters(cls, isExcluded, opts) {
        if (isExcluded)
            return;
        opts = opts || {};
        const subclassExclusions = opts.subclassExclusions || {};

        this._sourceFilter.addItem(cls.source);

        if (cls.fluff)
            cls.fluff.forEach(it=>this._addEntrySourcesToFilter(it));

        cls.classFeatures.forEach(feature=>feature.loadeds.forEach(ent=>this._addEntrySourcesToFilter(ent.entity)));

        cls.subclasses.forEach(sc=>{
            const isScExcluded = (subclassExclusions[sc.source] || {})[sc.name] || false;
            if (!isScExcluded) {
                this._sourceFilter.addItem(sc.source);
                sc.subclassFeatures.forEach(feature=> {
                    if(!feature.loadeds){console.error("Subclassfeature is lacking loadeds", feature);}
                    feature.loadeds.forEach(ent=>this._addEntrySourcesToFilter(ent.entity))
                });
            }
        }
        );
    }

    static async _pGetParentClass(sc) {
        let baseClass = (await DataUtil.class.loadRawJSON()).class.find(bc=>bc.name.toLowerCase() === sc.className.toLowerCase() && (bc.source.toLowerCase() || Parser.SRC_PHB) === sc.classSource.toLowerCase());

        baseClass = baseClass || await this._pGetParentClass_pPrerelease({sc});
        baseClass = baseClass || await this._pGetParentClass_pBrew({sc});

        return baseClass;
    }

    static async _pGetParentClass_pPrerelease({sc}) {
        await this._pGetParentClass_pPrereleaseBrew({
            sc,
            brewUtil: PrereleaseUtil
        });
    }

    static async _pGetParentClass_pBrew({sc}) {
        await this._pGetParentClass_pPrereleaseBrew({
            sc,
            brewUtil: BrewUtil2
        });
    }

    static async _pGetParentClass_pPrereleaseBrew({sc, brewUtil}) {
        const brew = await brewUtil.pGetBrewProcessed();
        return (brew.class || []).find(bc=>bc.name.toLowerCase() === sc.className.toLowerCase() && (bc.source.toLowerCase() || Parser.SRC_PHB) === sc.classSource.toLowerCase());
    }


    /**
     * Postload classes and subclasses. Matches subclasses to classes (and nests them inside, instead of letting them live in data.subclass)
     * Also sanity checks classes to make sure their properties are in order and that they are sorted by name.
     * Also adds 'loadeds' to class features and subclass features
     * @param {{class:any[], subclass:any[]}} data
     * @param {any} {...opts}={}
     * @returns {any} returns the data
     */
    static async pPostLoad(data, {...opts}={}) {
        data = MiscUtil.copy(data);

        await PrereleaseUtil.pGetBrewProcessed();
        await BrewUtil2.pGetBrewProcessed();

        if (!data.class) { data.class = []; } //Make sure this property is initalized

        //If data has subclasses listed, go through them and match each subclass to the corresponding class
        //We only want subclasses to exist nested within their parent classes
        if (data.subclass) {
            for (const sc of data.subclass) {
                if (!sc.className) { continue; } //The subclass must have a className listed
                sc.classSource = sc.classSource || Parser.SRC_PHB; //Default to PHB source if none is provided

                //Lets try to find a class that matches this subclass
                let cls = data.class.find(it=>
                    (it.name || "").toLowerCase() === sc.className.toLowerCase() //class name must match
                && (it.source || Parser.SRC_PHB).toLowerCase() === sc.classSource.toLowerCase()); //class source must match

                if (!cls) { //If we failed to get a match
                    cls = await this._pGetParentClass(sc); //Try to get a match another way
                    if (cls) {
                        cls = MiscUtil.copy(cls);
                        cls.subclasses = [];
                        data.class.push(cls);
                    }
                    else {
                        //Just create a stub class for now
                        cls = { name: sc.className, source: sc.classSource };
                        data.class.push(cls); //And add it to the data, why not
                    }
                }

                //Then push the subclass to the class's 'subclasses array', which we initialize here if it doesnt already exist
                (cls.subclasses = cls.subclasses || []).push(sc);
            }

            delete data.subclass; //When done, we also want to sipe data.subclass so that subclasses only exist nested inside their parent classes
        }

        //Make sure each class their properties sanity checked and in order
        data.class.forEach(cls=>{
            cls.source = cls.source || Parser.SRC_PHB;

            cls.subclasses = cls.subclasses || [];

            cls.subclasses.forEach(sc=>{
                sc.name = sc.name || "(Unnamed subclass)";
                sc.source = sc.source || cls.source;
                sc.className = sc.className || cls.name;
                sc.classSource = sc.classSource || cls.source || Parser.SRC_PHB;
            }
            );

            cls.subclasses.sort((a,b)=>SortUtil.ascSortLower(a.name, b.name) || SortUtil.ascSortLower(a.source || cls.source, b.source || cls.source));

            cls._cntStartingSkillChoices = (MiscUtil.get(cls, "startingProficiencies", "skills") || []).map(it=>it.choose ? (it.choose.count || 1) : 0).reduce((a,b)=>a + b, 0);

            cls._cntStartingSkillChoicesMutliclass = (MiscUtil.get(cls, "multiclassing", "proficienciesGained", "skills") || []).map(it=>it.choose ? (it.choose.count || 1) : 0).reduce((a,b)=>a + b, 0);
        }
        );
        //Then sort all the classes by name
        data.class.sort((a,b)=>SortUtil.ascSortLower(a.name, b.name) || SortUtil.ascSortLower(a.source, b.source));

        data.class.forEach(cls=>{
            cls.classFeatures = (cls.classFeatures || []).map(cf=>typeof cf === "string" ? { classFeature: cf } : cf);

            (cls.subclasses || []).forEach(sc=>{
                sc.subclassFeatures = (sc.subclassFeatures || []).map(cf=>typeof cf === "string" ? {
                    subclassFeature: cf
                } : cf);
            });
        });

        await this._pPreloadSideData();

        for (const cls of data.class) {
            //Load the 'loadeds' of all the class features
            await (cls.classFeatures || []).pSerialAwaitMap(cf=>this.pInitClassFeatureLoadeds({
                ...opts,
                classFeature: cf,
                className: cls.name
            }));

            //Then filter away all ignored class features
            if (cls.classFeatures) {cls.classFeatures = cls.classFeatures.filter(it=>!it.isIgnored);}

            //Moving on to subclasses, we will repeat the procedure for each subclass feature
            for (const sc of cls.subclasses || []) {
                await (sc.subclassFeatures || []).pSerialAwaitMap(scf=>this.pInitSubclassFeatureLoadeds({
                    ...opts,
                    subclassFeature: scf,
                    className: cls.name,
                    subclassName: sc.name
                }));

                if (sc.subclassFeatures)
                    sc.subclassFeatures = sc.subclassFeatures.filter(it=>!it.isIgnored);
            }
        }

        return data;
    }

    /**
     * Sets the 'loadeds' property of a classFeature, which contains information about choices that the class feature can make (expertise, etc)
     * Normally this information is not stored in the same .json as the classfeature itself, but is stored in some external .json file
     * @param {{classFeature:string}} classFeature
     * @param {string} className
     * @param {any} opts
     */
    static async pInitClassFeatureLoadeds({classFeature, className, ...opts}) {
        if (typeof classFeature !== "object")
            throw new Error(`Expected an object of the form {classFeature: "<UID>"}`);

        //Unpack the UID to get some strings
        const unpacked = DataUtil.class.unpackUidClassFeature(classFeature.classFeature);

        classFeature.hash = UrlUtil.URL_TO_HASH_BUILDER["classFeature"](unpacked);

        const {name, level, source} = unpacked;
        classFeature.name = name;
        classFeature.level = level;
        classFeature.source = source;

        //Now, the information about the class feature choices is usually stored in some other place, not within the classFeature itself
        //So we have to get that information from somewhere

        //Ask the cache to get us a raw classfeature from our source, and with our hash
        const entityRoot = await DataLoader.pCacheAndGet("raw_classFeature", classFeature.source, classFeature.hash, {
            isCopy: true //And make it a copy
        });

        const loadedRoot = {
            type: "classFeature",
            entity: entityRoot,
            page: "classFeature",
            source: classFeature.source,
            hash: classFeature.hash,
            className,
        };

        //Check if this class feature is on the ignore list
        const isIgnored = await this._pGetIgnoredAndApplySideData(entityRoot, "classFeature");
        if (isIgnored) {
            classFeature.isIgnored = true;
            return;
        }

        const {entityRoot: entityRootNxt, subLoadeds} = await this._pLoadSubEntries(this._getPostLoadWalker(), entityRoot, {
            ...opts,
            ancestorType: "classFeature",
            ancestorMeta: { _ancestorClassName: className, },
        }, );
        loadedRoot.entity = entityRootNxt;

        //Finally, set the loadeds
        classFeature.loadeds = [loadedRoot, ...subLoadeds];
    }

    static async pInitSubclassFeatureLoadeds({subclassFeature, className, subclassName, ...opts}) {
        if (typeof subclassFeature !== "object")
            throw new Error(`Expected an object of the form {subclassFeature: "<UID>"}`);

        const unpacked = DataUtil.class.unpackUidSubclassFeature(subclassFeature.subclassFeature);

        subclassFeature.hash = UrlUtil.URL_TO_HASH_BUILDER["subclassFeature"](unpacked);

        const {name, level, source} = unpacked;
        subclassFeature.name = name;
        subclassFeature.level = level;
        subclassFeature.source = source;

        const entityRoot = await DataLoader.pCacheAndGet("raw_subclassFeature", subclassFeature.source, subclassFeature.hash, {
            isCopy: true
        });
        const loadedRoot = {
            type: "subclassFeature",
            entity: entityRoot,
            page: "subclassFeature",
            source: subclassFeature.source,
            hash: subclassFeature.hash,
            className,
            subclassName,
        };

        const isIgnored = await this._pGetIgnoredAndApplySideData(entityRoot, "subclassFeature");
        if (isIgnored) {
            subclassFeature.isIgnored = true;
            return;
        }

        if (entityRoot.isGainAtNextFeatureLevel) {
            subclassFeature.isGainAtNextFeatureLevel = true;
        }

        const {entityRoot: entityRootNxt, subLoadeds} = await this._pLoadSubEntries(this._getPostLoadWalker(), entityRoot, {
            ...opts,
            ancestorType: "subclassFeature",
            ancestorMeta: {
                _ancestorClassName: className,
                _ancestorSubclassName: subclassName,
            },
        }, );
        loadedRoot.entity = entityRootNxt;

        subclassFeature.loadeds = [loadedRoot, ...subLoadeds];
    }

    static async pInitFeatLoadeds({feat, raw, ...opts}) {
        return this._pInitGenericLoadeds({
            ...opts,
            ent: feat,
            prop: "feat",
            page: UrlUtil.PG_FEATS,
            propAncestorName: "_ancestorFeatName",
            raw,
        });
    }

    static async pInitOptionalFeatureLoadeds({optionalfeature, raw, ...opts}) {
        return this._pInitGenericLoadeds({
            ...opts,
            ent: optionalfeature,
            prop: "optionalfeature",
            page: UrlUtil.PG_OPT_FEATURES,
            propAncestorName: "_ancestorOptionalfeatureName",
            raw,
        });
    }

    static async pInitRewardLoadeds({reward, raw, ...opts}) {
        return this._pInitGenericLoadeds({
            ...opts,
            ent: reward,
            prop: "reward",
            page: UrlUtil.PG_REWARDS,
            propAncestorName: "_ancestorRewardName",
            raw,
        });
    }

    static async pInitCharCreationOptionLoadeds({charoption, raw, ...opts}) {
        return this._pInitGenericLoadeds({
            ...opts,
            ent: charoption,
            prop: "charoption",
            page: UrlUtil.PG_CHAR_CREATION_OPTIONS,
            propAncestorName: "_ancestorCharoptionName",
            raw,
        });
    }

    static async pInitVehicleUpgradeLoadeds({vehicleUpgrade, raw, ...opts}) {
        return this._pInitGenericLoadeds({
            ...opts,
            ent: vehicleUpgrade,
            prop: "vehicleUpgrade",
            page: UrlUtil.PG_VEHICLES,
            propAncestorName: "_ancestorVehicleUpgradeName",
            raw,
        });
    }

    static async _pInitGenericLoadeds({ent, prop, page, propAncestorName, raw, ...opts}) {
        if (typeof ent !== "object")
            throw new Error(`Expected an object of the form {${prop}: "<UID>"}`);

        const unpacked = DataUtil.generic.unpackUid(ent[prop]);

        ent.hash = UrlUtil.URL_TO_HASH_BUILDER[page](unpacked);

        const {name, source} = unpacked;
        ent.name = name;
        ent.source = source;

        const entityRoot = raw != null ? MiscUtil.copy(raw) : await DataLoader.pCacheAndGet(`raw_${prop}`, ent.source, ent.hash, {
            isCopy: true
        });
        const loadedRoot = {
            type: prop,
            entity: entityRoot,
            page,
            source: ent.source,
            hash: ent.hash,
        };

        const isIgnored = await this._pGetIgnoredAndApplySideData(entityRoot, prop);
        if (isIgnored) {
            ent.isIgnored = true;
            return;
        }

        const {entityRoot: entityRootNxt, subLoadeds} = await this._pLoadSubEntries(this._getPostLoadWalker(), entityRoot, {
            ...opts,
            ancestorType: prop,
            ancestorMeta: {
                [propAncestorName]: entityRoot.name,
            },
        }, );
        loadedRoot.entity = entityRootNxt;

        ent.loadeds = [loadedRoot, ...subLoadeds];
    }

    static async _pPreloadSideData() {
        await Promise.all(Object.values(PageFilterClassesRaw._IMPLS_SIDE_DATA).map(Impl=>Impl.pPreloadSideData()));
    }

    /**
     * @param {any} entity
     * @param {string} type
     * @returns {boolean}
     */
    static async _pGetIgnoredAndApplySideData(entity, type) {
        if (!PageFilterClassesRaw._IMPLS_SIDE_DATA[type])
            throw new Error(`Unhandled type "${type}"`);

        const sideData = await PageFilterClassesRaw._IMPLS_SIDE_DATA[type].pGetSideLoaded(entity, { isSilent: true });

        if (!sideData)
            return false;
        if (sideData.isIgnored)
            return true;

        if (sideData.entries)
            entity.entries = MiscUtil.copy(sideData.entries);
        if (sideData.entryData)
            entity.entryData = MiscUtil.copy(sideData.entryData);

        return false;
    }

    static async _pLoadSubEntries(walker, entityRoot, {ancestorType, ancestorMeta, ...opts}) {
        const out = [];

        const pRecurse = async(parent,toWalk)=>{
            const references = [];
            const path = [];

            toWalk = walker.walk(toWalk, {
                array: (arr)=>{
                    arr = arr.map(it=>this._pLoadSubEntries_getMappedWalkerArrayEntry({
                        ...opts,
                        it,
                        path,
                        references
                    })).filter(Boolean);
                    return arr;
                }
                ,
                preObject: (obj)=>{
                    if (obj.type === "options") {
                        const parentName = (path.last() || {}).name ?? parent.name;

                        if (obj.count != null) {
                            const optionSetId = CryptUtil.uid();
                            obj.entries.forEach(ent=>{
                                ent._optionsMeta = {
                                    setId: optionSetId,
                                    count: obj.count,
                                    name: parentName,
                                };
                            }
                            );
                        }

                        if (parentName) {
                            obj.entries.forEach(ent=>{
                                if (typeof ent !== "object")
                                    return;
                                ent._displayNamePrefix = `${parentName}: `;
                            }
                            );
                        }
                    }

                    if (obj.name)
                        path.push(obj);
                }
                ,
                postObject: (obj)=>{
                    if (obj.name)
                        path.pop();
                }
                ,
            }, );

            for (const ent of references) {
                const isRequiredOption = !!MiscUtil.get(ent, "data", "isRequiredOption");
                switch (ent.type) {
                case "refClassFeature":
                    {
                        const unpacked = DataUtil.class.unpackUidClassFeature(ent.classFeature);
                        const {source} = unpacked;
                        const hash = UrlUtil.URL_TO_HASH_BUILDER["classFeature"](unpacked);

                        let entity = await DataLoader.pCacheAndGet("raw_classFeature", source, hash, {
                            isCopy: true
                        });

                        if (!entity) {
                            this._handleReferenceError(`Failed to load "classFeature" reference "${ent.classFeature}" (not found)`);
                            continue;
                        }

                        if (toWalk.__prop === entity.__prop && UrlUtil.URL_TO_HASH_BUILDER["classFeature"](toWalk) === hash) {
                            this._handleReferenceError(`Failed to load "classFeature" reference "${ent.classFeature}" (circular reference)`);
                            continue;
                        }

                        const isIgnored = await this._pGetIgnoredAndApplySideData(entity, "classFeature");
                        if (isIgnored)
                            continue;

                        this.populateEntityTempData({
                            entity,
                            displayName: ent._displayNamePrefix ? `${ent._displayNamePrefix}${entity.name}` : null,
                            ...ancestorMeta,
                        });

                        out.push({
                            type: "classFeature",
                            entry: `{@classFeature ${ent.classFeature}}`,
                            entity,
                            optionsMeta: ent._optionsMeta,
                            page: "classFeature",
                            source,
                            hash,
                            isRequiredOption,
                        });

                        entity = await pRecurse(entity, entity.entries);

                        break;
                    }
                case "refSubclassFeature":
                    {
                        const unpacked = DataUtil.class.unpackUidSubclassFeature(ent.subclassFeature);
                        const {source} = unpacked;
                        const hash = UrlUtil.URL_TO_HASH_BUILDER["subclassFeature"](unpacked);

                        let entity = await DataLoader.pCacheAndGet("raw_subclassFeature", source, hash, {
                            isCopy: true
                        });

                        if (!entity) {
                            this._handleReferenceError(`Failed to load "subclassFeature" reference "${ent.subclassFeature}" (not found)`);
                            continue;
                        }

                        if (toWalk.__prop === entity.__prop && UrlUtil.URL_TO_HASH_BUILDER["subclassFeature"](toWalk) === hash) {
                            this._handleReferenceError(`Failed to load "subclassFeature" reference "${ent.subclassFeature}" (circular reference)`);
                            continue;
                        }

                        const isIgnored = await this._pGetIgnoredAndApplySideData(entity, "subclassFeature");
                        if (isIgnored)
                            continue;

                        this.populateEntityTempData({
                            entity,
                            displayName: ent._displayNamePrefix ? `${ent._displayNamePrefix}${entity.name}` : null,
                            ...ancestorMeta,
                        });

                        out.push({
                            type: "subclassFeature",
                            entry: `{@subclassFeature ${ent.subclassFeature}}`,
                            entity,
                            optionsMeta: ent._optionsMeta,
                            page: "subclassFeature",
                            source,
                            hash,
                            isRequiredOption,
                        });

                        entity = await pRecurse(entity, entity.entries);

                        break;
                    }
                case "refOptionalfeature":
                    {
                        const unpacked = DataUtil.generic.unpackUid(ent.optionalfeature, "optfeature");
                        const page = UrlUtil.PG_OPT_FEATURES;
                        const {source} = unpacked;
                        const hash = UrlUtil.URL_TO_HASH_BUILDER[page](unpacked);

                        const entity = await DataLoader.pCacheAndGet(page, source, hash, {
                            isCopy: true
                        });

                        if (!entity) {
                            this._handleReferenceError(`Failed to load "optfeature" reference "${ent.optionalfeature}" (not found)`);
                            continue;
                        }

                        if (toWalk.__prop === entity.__prop && UrlUtil.URL_TO_HASH_BUILDER[page](toWalk) === hash) {
                            this._handleReferenceError(`Failed to load "optfeature" reference "${ent.optionalfeature}" (circular reference)`);
                            continue;
                        }

                        const isIgnored = await this._pGetIgnoredAndApplySideData(entity, "optionalfeature");
                        if (isIgnored)
                            continue;

                        this.populateEntityTempData({
                            entity,
                            ancestorType,
                            displayName: ent._displayNamePrefix ? `${ent._displayNamePrefix}${entity.name}` : null,
                            ...ancestorMeta,
                            foundrySystem: {
                                requirements: entityRoot.className ? `${entityRoot.className} ${entityRoot.level}${entityRoot.subclassShortName ? ` (${entityRoot.subclassShortName})` : ""}` : null,
                            },
                        });

                        out.push({
                            type: "optionalfeature",
                            entry: `{@optfeature ${ent.optionalfeature}}`,
                            entity,
                            optionsMeta: ent._optionsMeta,
                            page,
                            source,
                            hash,
                            isRequiredOption,
                        });

                        break;
                    }
                default:
                    throw new Error(`Unhandled type "${ent.type}"`);
                }
            }

            return toWalk;
        }
        ;

        if (entityRoot.entries) //entityRoot.entryData is already set by this point
            entityRoot.entries = await pRecurse(entityRoot, entityRoot.entries);

        return {
            entityRoot,
            subLoadeds: out
        };
    }

    static _pLoadSubEntries_getMappedWalkerArrayEntry({it, path, references, ...opts}) {
        if (it.type !== "refClassFeature" && it.type !== "refSubclassFeature" && it.type !== "refOptionalfeature")
            return it;

        it.parentName = (path.last() || {}).name;
        references.push(it);

        return null;
    }

    static populateEntityTempData({entity, ancestorType, displayName, foundrySystem, ...others}, ) {
        if (ancestorType)
            entity._ancestorType = ancestorType;
        if (displayName)
            entity._displayName = displayName;
        if (foundrySystem)
            entity._foundrySystem = foundrySystem;
        Object.assign(entity, {
            ...others
        });
    }

    static _handleReferenceError(msg) {
        JqueryUtil.doToast({
            type: "danger",
            content: msg
        });
    }

    static _getPostLoadWalker() {
        PageFilterClassesRaw._WALKER = PageFilterClassesRaw._WALKER || MiscUtil.getWalker({
            keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST,
            isDepthFirst: true,
        });
        return PageFilterClassesRaw._WALKER;
    }

    static setImplSideData(prop, Impl) {
        PageFilterClassesRaw._IMPLS_SIDE_DATA[prop] = Impl;
    }
};

class PageFilterClassesFoundry extends PageFilterClassesRaw {
    static _handleReferenceError(msg) {
        console.error(...LGT, msg);
        ui.notifications.error(msg);
    }

    static _pLoadSubEntries_getMappedWalkerArrayEntry({it, path, references, actor, isIgnoredLookup, ...opts}) {
        const out = super._pLoadSubEntries_getMappedWalkerArrayEntry({
            it,
            path,
            references,
            actor,
            ...opts
        });
        if (out != null)
            return out;

        const isIgnored = this._pLoadSubEntries_getMappedWalkerArrayEntry_isIgnored({
            it,
            isIgnoredLookup
        });
        if (isIgnored)
            return null;

        const meta = this._pLoadSubEntries_getMappedWalkerArrayEntry_getMeta({
            it
        });
        const {name, source} = meta;

        const ident = this._pLoadSubEntries_getMappedWalkerArrayEntry_getPageSourceHash({
            it
        });
        const b64Ident = btoa(encodeURIComponent(JSON.stringify(ident)));

        return {
            type: "wrapper",
            wrapped: actor ? `@UUID[Actor.${actor.id}.Item.temp-${SharedConsts.MODULE_ID_FAKE}-${b64Ident}]{${name}}` : `@UUID[Item.temp-${SharedConsts.MODULE_ID_FAKE}-${b64Ident}]{${name}}`,
            source,
            data: {
                isFvttSyntheticFeatureLink: true,
            },
        };
    }

    static _pLoadSubEntries_getMappedWalkerArrayEntry_getMeta({it}) {
        switch (it.type) {
        case "refClassFeature":
            return DataUtil.class.unpackUidClassFeature(it.classFeature);
        case "refSubclassFeature":
            return DataUtil.class.unpackUidSubclassFeature(it.subclassFeature);
        case "refOptionalfeature":
            return DataUtil.proxy.unpackUid("optionalfeature", it.optionalfeature, "optfeature");
        default:
            throw new Error(`Unhandled reference type "${it.type}"`);
        }
    }

    static _pLoadSubEntries_getMappedWalkerArrayEntry_getPageSourceHash({it}) {
        let page;
        let source;
        let hash;
        switch (it.type) {
        case "refClassFeature":
            {
                const meta = DataUtil.class.unpackUidClassFeature(it.classFeature);
                page = "classFeature";
                hash = UrlUtil.URL_TO_HASH_BUILDER[page](meta);
                source = meta.source;
                break;
            }

        case "refSubclassFeature":
            {
                const meta = DataUtil.class.unpackUidSubclassFeature(it.subclassFeature);
                page = "subclassFeature";
                hash = UrlUtil.URL_TO_HASH_BUILDER[page](meta);
                source = meta.source;
                break;
            }

        case "refOptionalfeature":
            {
                const meta = DataUtil.proxy.unpackUid("optionalfeature", it.optionalfeature, "optfeature");
                page = UrlUtil.PG_OPT_FEATURES;
                hash = UrlUtil.URL_TO_HASH_BUILDER[page](meta);
                source = meta.source;
                break;
            }

        default:
            throw new Error(`Unhandled reference type "${it.type}"`);
        }

        return {
            page,
            source,
            hash
        };
    }

    static _pLoadSubEntries_getMappedWalkerArrayEntry_isIgnored({it, isIgnoredLookup}) {
        if (!isIgnoredLookup)
            return false;

        switch (it.type) {
        case "refClassFeature":
            return isIgnoredLookup[(it.classFeature || "").toLowerCase()];
        case "refSubclassFeature":
            return isIgnoredLookup[(it.subclassFeature || "").toLowerCase()];
        default:
            return false;
        }
    }
}
//#endregion

//#region PageFilterRaces
class PageFilterRaces extends PageFilter {
    

    constructor() {
        super();

        //Create sub-filters
        //sourcefilter is created by super

        this._sizeFilter = new Filter({
            header: "Size",
            displayFn: Parser.sizeAbvToFull,
            itemSortFn: PageFilterRaces.filterAscSortSize
        });
        this._asiFilter = new AbilityScoreFilter({
            header: "Ability Scores (Including Subrace)"
        });
        this._baseRaceFilter = new Filter({
            header: "Base Race"
        });
        this._speedFilter = new Filter({
            header: "Speed",
            items: ["Climb", "Fly", "Swim", "Walk (Fast)", "Walk", "Walk (Slow)"]
        });
        this._traitFilter = new Filter({
            header: "Traits",
            items: ["Amphibious", "Armor Proficiency", "Blindsight", "Darkvision", "Superior Darkvision", "Dragonmark", "Feat", "Improved Resting", "Monstrous Race", "Natural Armor", "Natural Weapon", "NPC Race", "Powerful Build", "Skill Proficiency", "Spellcasting", "Sunlight Sensitivity", "Tool Proficiency", "Uncommon Race", "Weapon Proficiency", ],
            deselFn: (it)=>{
                return it === "NPC Race";
            }
            ,
        });
        this._vulnerableFilter = FilterCommon.getDamageVulnerableFilter();
        this._resistFilter = FilterCommon.getDamageResistFilter();
        this._immuneFilter = FilterCommon.getDamageImmuneFilter();
        this._defenceFilter = new MultiFilter({
            header: "Damage",
            filters: [this._vulnerableFilter, this._resistFilter, this._immuneFilter]
        });
        this._conditionImmuneFilter = FilterCommon.getConditionImmuneFilter();
        this._languageFilter = new Filter({
            header: "Languages",
            items: ["Abyssal", "Celestial", "Choose", "Common", "Draconic", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin", "Halfling", "Infernal", "Orc", "Other", "Primordial", "Sylvan", "Undercommon", ],
            umbrellaItems: ["Choose"],
        });
        this._creatureTypeFilter = new Filter({
            header: "Creature Type",
            items: Parser.MON_TYPES,
            displayFn: StrUtil.toTitleCase,
            itemSortFn: SortUtil.ascSortLower,
        });
        this._ageFilter = new RangeFilter({
            header: "Adult Age",
            isRequireFullRangeMatch: true,
            isSparse: true,
            displayFn: it=>`${it} y.o.`,
            displayFnTooltip: it=>`${it} year${it === 1 ? "" : "s"} old`,
        });
        this._miscFilter = new Filter({
            header: "Miscellaneous",
            items: ["Base Race", "Key Race", "Lineage", "Modified Copy", "Reprinted", "SRD", "Basic Rules", "Has Images", "Has Info"],
            isMiscFilter: true,
        });
    }

    static mutateForFilters(r) {
        r._fSize = r.size ? [...r.size] : [];
        if (r._fSize.length > 1)
            r._fSize.push("V");
        r._fSpeed = r.speed ? r.speed.walk ? [r.speed.climb ? "Climb" : null, r.speed.fly ? "Fly" : null, r.speed.swim ? "Swim" : null, PageFilterRaces.getSpeedRating(r.speed.walk)].filter(it=>it) : [PageFilterRaces.getSpeedRating(r.speed)] : [];
        r._fTraits = [r.darkvision === 120 ? "Superior Darkvision" : r.darkvision ? "Darkvision" : null, r.blindsight ? "Blindsight" : null, r.skillProficiencies ? "Skill Proficiency" : null, r.toolProficiencies ? "Tool Proficiency" : null, r.feats ? "Feat" : null, r.additionalSpells ? "Spellcasting" : null, r.armorProficiencies ? "Armor Proficiency" : null, r.weaponProficiencies ? "Weapon Proficiency" : null, ].filter(it=>it);
        r._fTraits.push(...(r.traitTags || []));
        r._fSources = SourceFilter.getCompleteFilterSources(r);
        r._fLangs = PageFilterRaces.getLanguageProficiencyTags(r.languageProficiencies);
        r._fCreatureTypes = r.creatureTypes ? r.creatureTypes.map(it=>it.choose || it).flat() : ["humanoid"];
        r._fMisc = [];
        if (r._isBaseRace)
            r._fMisc.push("Base Race");
        if (r._isBaseRace || !r._isSubRace)
            r._fMisc.push("Key Race");
        if (r._isCopy)
            r._fMisc.push("Modified Copy");
        if (r.srd)
            r._fMisc.push("SRD");
        if (r.basicRules)
            r._fMisc.push("Basic Rules");
        if (r.hasFluff || r.fluff?.entries)
            r._fMisc.push("Has Info");
        if (r.hasFluffImages || r.fluff?.images)
            r._fMisc.push("Has Images");
        if (r.lineage)
            r._fMisc.push("Lineage");
        if (this._isReprinted({
            reprintedAs: r.reprintedAs,
            tag: "race",
            prop: "race",
            page: UrlUtil.PG_RACES
        }))
            r._fMisc.push("Reprinted");

        const ability = r.ability ? Renderer.getAbilityData(r.ability, {
            isOnlyShort: true,
            isCurrentLineage: r.lineage === "VRGR"
        }) : {
            asTextShort: "None"
        };
        r._slAbility = ability.asTextShort;

        if (r.age?.mature != null && r.age?.max != null)
            r._fAge = [r.age.mature, r.age.max];
        else if (r.age?.mature != null)
            r._fAge = r.age.mature;
        else if (r.age?.max != null)
            r._fAge = r.age.max;

        FilterCommon.mutateForFilters_damageVulnResImmune_player(r);
        FilterCommon.mutateForFilters_conditionImmune_player(r);
    }

    /**
     * Add an race's filterable tags to the sub-filters (source filter, size filter, language filter, etc)
     * @param {any} r A race object
     * @param {Boolean} isExcluded if this is true, we return immediately
     */
    addToFilters(r, isExcluded) {
        if (isExcluded)
            return;

        this._sourceFilter.addItem(r._fSources);
        this._sizeFilter.addItem(r._fSize);
        this._asiFilter.addItem(r.ability);
        this._baseRaceFilter.addItem(r._baseName);
        this._creatureTypeFilter.addItem(r._fCreatureTypes);
        this._traitFilter.addItem(r._fTraits);
        this._vulnerableFilter.addItem(r._fVuln);
        this._resistFilter.addItem(r._fRes);
        this._immuneFilter.addItem(r._fImm);
        this._conditionImmuneFilter.addItem(r._fCondImm);
        this._ageFilter.addItem(r._fAge);
        this._languageFilter.addItem(r._fLangs);
    }

    async _pPopulateBoxOptions(opts) {
        opts.filters = [this._sourceFilter, this._asiFilter, this._sizeFilter, this._speedFilter, this._traitFilter, this._defenceFilter, this._conditionImmuneFilter, this._languageFilter, this._baseRaceFilter, this._creatureTypeFilter, this._miscFilter, this._ageFilter, ];
    }

    toDisplay(values, r) {
        return this._filterBox.toDisplay(values, r._fSources, r.ability, r._fSize, r._fSpeed, r._fTraits, [r._fVuln, r._fRes, r._fImm, ], r._fCondImm, r._fLangs, r._baseName, r._fCreatureTypes, r._fMisc, r._fAge, );
    }

    static getListAliases(race) {
        return (race.alias || []).map(it=>{
            const invertedName = PageFilterRaces.getInvertedName(it);
            return [`"${it}"`, invertedName ? `"${invertedName}"` : false].filter(Boolean);
        }
        ).flat().join(",");
    }

    static getInvertedName(name) {
        const bracketMatch = /^(.*?) \((.*?)\)$/.exec(name);
        return bracketMatch ? `${bracketMatch[2]} ${bracketMatch[1]}` : null;
    }

    static getLanguageProficiencyTags(lProfs) {
        if (!lProfs)
            return [];

        const outSet = new Set();
        lProfs.forEach(lProfGroup=>{
            Object.keys(lProfGroup).forEach(k=>{
                if (!["choose", "any", "anyStandard", "anyExotic"].includes(k))
                    outSet.add(k.toTitleCase());
                else
                    outSet.add("Choose");
            }
            );
        }
        );

        return [...outSet];
    }

    static getSpeedRating(speed) {
        return speed > 30 ? "Walk (Fast)" : speed < 30 ? "Walk (Slow)" : "Walk";
    }

    static filterAscSortSize(a, b) {
        a = a.item;
        b = b.item;

        return SortUtil.ascSort(toNum(a), toNum(b));

        function toNum(size) {
            switch (size) {
            case "M":
                return 0;
            case "S":
                return -1;
            case "V":
                return 1;
            }
        }
    }
};
//#endregion

//#region PageFilterBackgrounds
let PageFilterBackgrounds$1 = class PageFilterBackgrounds extends PageFilter {
    static _getToolDisplayText(tool) {
        if (tool === "anyTool")
            return "Any Tool";
        if (tool === "anyArtisansTool")
            return "Any Artisan's Tool";
        if (tool === "anyMusicalInstrument")
            return "Any Musical Instrument";
        return tool.toTitleCase();
    }

    constructor() {
        super();

        this._skillFilter = new Filter({
            header: "Skill Proficiencies",
            displayFn: StrUtil.toTitleCase
        });
        this._toolFilter = new Filter({
            header: "Tool Proficiencies",
            displayFn: PageFilterBackgrounds$1._getToolDisplayText.bind(PageFilterBackgrounds$1)
        });
        this._languageFilter = new Filter({
            header: "Language Proficiencies",
            displayFn: it=>it === "anyStandard" ? "Any Standard" : it === "anyExotic" ? "Any Exotic" : StrUtil.toTitleCase(it),
        });
        this._asiFilter = new AbilityScoreFilter({
            header: "Ability Scores"
        });
        this._otherBenefitsFilter = new Filter({
            header: "Other Benefits"
        });
        this._miscFilter = new Filter({
            header: "Miscellaneous",
            items: ["Has Info", "Has Images", "SRD", "Basic Rules"],
            isMiscFilter: true
        });
    }

    static mutateForFilters(bg) {
        bg._fSources = SourceFilter.getCompleteFilterSources(bg);

        const {summary: skillDisplay, collection: skills} = Renderer.generic.getSkillSummary({
            skillProfs: bg.skillProficiencies,
            skillToolLanguageProfs: bg.skillToolLanguageProficiencies,
            isShort: true,
        });
        bg._fSkills = skills;

        const {collection: tools} = Renderer.generic.getToolSummary({
            toolProfs: bg.toolProficiencies,
            skillToolLanguageProfs: bg.skillToolLanguageProficiencies,
            isShort: true,
        });
        bg._fTools = tools;

        const {collection: languages} = Renderer.generic.getLanguageSummary({
            languageProfs: bg.languageProficiencies,
            skillToolLanguageProfs: bg.skillToolLanguageProficiencies,
            isShort: true,
        });
        bg._fLangs = languages;

        bg._fMisc = [];
        if (bg.srd)
            bg._fMisc.push("SRD");
        if (bg.basicRules)
            bg._fMisc.push("Basic Rules");
        if (bg.hasFluff || bg.fluff?.entries)
            bg._fMisc.push("Has Info");
        if (bg.hasFluffImages || bg.fluff?.images)
            bg._fMisc.push("Has Images");
        bg._fOtherBenifits = [];
        if (bg.feats)
            bg._fOtherBenifits.push("Feat");
        if (bg.additionalSpells)
            bg._fOtherBenifits.push("Additional Spells");
        if (bg.armorProficiencies)
            bg._fOtherBenifits.push("Armor Proficiencies");
        if (bg.weaponProficiencies)
            bg._fOtherBenifits.push("Weapon Proficiencies");
        bg._skillDisplay = skillDisplay;
    }

    addToFilters(bg, isExcluded) {
        if (isExcluded)
            return;

        this._sourceFilter.addItem(bg._fSources);
        this._skillFilter.addItem(bg._fSkills);
        this._toolFilter.addItem(bg._fTools);
        this._languageFilter.addItem(bg._fLangs);
        this._asiFilter.addItem(bg.ability);
        this._otherBenefitsFilter.addItem(bg._fOtherBenifits);
    }

    async _pPopulateBoxOptions(opts) {
        opts.filters = [this._sourceFilter, this._skillFilter, this._toolFilter, this._languageFilter, this._asiFilter, this._otherBenefitsFilter, this._miscFilter, ];
    }

    toDisplay(values, bg) {
        return this._filterBox.toDisplay(values, bg._fSources, bg._fSkills, bg._fTools, bg._fLangs, bg.ability, bg._fOtherBenifits, bg._fMisc, );
    }
}
;
//#endregion

//#region PageFilterSpells
class PageFilterSpells extends PageFilter {
    static _META_ADD_CONC = "Concentration";
    static _META_ADD_V = "Verbal";
    static _META_ADD_S = "Somatic";
    static _META_ADD_M = "Material";
    static _META_ADD_R = "Royalty";
    static _META_ADD_M_COST = "Material with Cost";
    static _META_ADD_M_CONSUMED = "Material is Consumed";
    static _META_ADD_M_CONSUMED_OPTIONAL = "Material is Optionally Consumed";

    static F_RNG_POINT = "Point";
    static F_RNG_SELF_AREA = "Self (Area)";
    static F_RNG_SELF = "Self";
    static F_RNG_TOUCH = "Touch";
    static F_RNG_SPECIAL = "Special";

    static _META_FILTER_BASE_ITEMS = [this._META_ADD_CONC, this._META_ADD_V, this._META_ADD_S, this._META_ADD_M, this._META_ADD_R, this._META_ADD_M_COST, this._META_ADD_M_CONSUMED, this._META_ADD_M_CONSUMED_OPTIONAL, ...Object.keys(Parser.SP_MISC_TAG_TO_FULL), ];

    static INCHES_PER_FOOT = 12;
    static FEET_PER_YARD = 3;
    static FEET_PER_MILE = 5280;

    static sortSpells(a, b, o) {
        switch (o.sortBy) {
        case "name":
            return SortUtil.compareListNames(a, b);
        case "source":
        case "level":
        case "school":
        case "concentration":
        case "ritual":
            return SortUtil.ascSort(a.values[o.sortBy], b.values[o.sortBy]) || SortUtil.compareListNames(a, b);
        case "time":
            return SortUtil.ascSort(a.values.normalisedTime, b.values.normalisedTime) || SortUtil.compareListNames(a, b);
        case "range":
            return SortUtil.ascSort(a.values.normalisedRange, b.values.normalisedRange) || SortUtil.compareListNames(a, b);
        }
    }

    static sortMetaFilter(a, b) {
        const ixA = PageFilterSpells._META_FILTER_BASE_ITEMS.indexOf(a.item);
        const ixB = PageFilterSpells._META_FILTER_BASE_ITEMS.indexOf(b.item);

        if (~ixA && ~ixB)
            return ixA - ixB;
        if (~ixA)
            return -1;
        if (~ixB)
            return 1;
        return SortUtil.ascSortLower(a, b);
    }

    static getFilterAbilitySave(ability) {
        return `${ability.uppercaseFirst()} Save`;
    }
    static getFilterAbilityCheck(ability) {
        return `${ability.uppercaseFirst()} Check`;
    }

    static getMetaFilterObj(s) {
        const out = [];
        if (s.meta) {
            Object.entries(s.meta).filter(([_,v])=>v).sort(SortUtil.ascSort).forEach(([k])=>out.push(k.toTitleCase()));
        }
        if (s.duration.filter(d=>d.concentration).length) {
            out.push(PageFilterSpells._META_ADD_CONC);
            s._isConc = true;
        } else
            s._isConc = false;
        if (s.components && s.components.v)
            out.push(PageFilterSpells._META_ADD_V);
        if (s.components && s.components.s)
            out.push(PageFilterSpells._META_ADD_S);
        if (s.components && s.components.m)
            out.push(PageFilterSpells._META_ADD_M);
        if (s.components && s.components.r)
            out.push(PageFilterSpells._META_ADD_R);
        if (s.components && s.components.m && s.components.m.cost)
            out.push(PageFilterSpells._META_ADD_M_COST);
        if (s.components && s.components.m && s.components.m.consume) {
            if (s.components.m.consume === "optional")
                out.push(PageFilterSpells._META_ADD_M_CONSUMED_OPTIONAL);
            else
                out.push(PageFilterSpells._META_ADD_M_CONSUMED);
        }
        if (s.miscTags)
            out.push(...s.miscTags);
        if ((!s.miscTags || (s.miscTags && !s.miscTags.includes("PRM"))) && s.duration.filter(it=>it.type === "permanent").length)
            out.push("PRM");
        if ((!s.miscTags || (s.miscTags && !s.miscTags.includes("SCL"))) && s.entriesHigherLevel)
            out.push("SCL");
        if (s.srd)
            out.push("SRD");
        if (s.basicRules)
            out.push("Basic Rules");
        if (s.hasFluff || s.fluff?.entries)
            out.push("Has Info");
        if (s.hasFluffImages || s.fluff?.images)
            out.push("Has Images");
        return out;
    }

    static getFilterDuration(spell) {
        const fDur = spell.duration[0] || {
            type: "special"
        };
        switch (fDur.type) {
        case "instant":
            return "Instant";
        case "timed":
            {
                if (!fDur.duration)
                    return "Special";
                switch (fDur.duration.type) {
                case "turn":
                case "round":
                    return "1 Round";

                case "minute":
                    {
                        const amt = fDur.duration.amount || 0;
                        if (amt <= 1)
                            return "1 Minute";
                        if (amt <= 10)
                            return "10 Minutes";
                        if (amt <= 60)
                            return "1 Hour";
                        if (amt <= 8 * 60)
                            return "8 Hours";
                        return "24+ Hours";
                    }

                case "hour":
                    {
                        const amt = fDur.duration.amount || 0;
                        if (amt <= 1)
                            return "1 Hour";
                        if (amt <= 8)
                            return "8 Hours";
                        return "24+ Hours";
                    }

                case "week":
                case "day":
                case "year":
                    return "24+ Hours";
                default:
                    return "Special";
                }
            }
        case "permanent":
            return "Permanent";
        case "special":
        default:
            return "Special";
        }
    }

    static getNormalisedTime(time) {
        const firstTime = time[0];
        let multiplier = 1;
        let offset = 0;
        switch (firstTime.unit) {
        case Parser.SP_TM_B_ACTION:
            offset = 1;
            break;
        case Parser.SP_TM_REACTION:
            offset = 2;
            break;
        case Parser.SP_TM_ROUND:
            multiplier = 6;
            break;
        case Parser.SP_TM_MINS:
            multiplier = 60;
            break;
        case Parser.SP_TM_HRS:
            multiplier = 3600;
            break;
        }
        if (time.length > 1)
            offset += 0.5;
        return (multiplier * firstTime.number) + offset;
    }

    static getNormalisedRange(range) {
        const state = {
            multiplier: 1,
            distance: 0,
            offset: 0,
        };

        switch (range.type) {
        case Parser.RNG_SPECIAL:
            return 1000000000;
        case Parser.RNG_POINT:
            this._getNormalisedRange_getAdjustedForDistance({
                range,
                state
            });
            break;
        case Parser.RNG_LINE:
            state.offset = 1;
            this._getNormalisedRange_getAdjustedForDistance({
                range,
                state
            });
            break;
        case Parser.RNG_CONE:
            state.offset = 2;
            this._getNormalisedRange_getAdjustedForDistance({
                range,
                state
            });
            break;
        case Parser.RNG_RADIUS:
            state.offset = 3;
            this._getNormalisedRange_getAdjustedForDistance({
                range,
                state
            });
            break;
        case Parser.RNG_HEMISPHERE:
            state.offset = 4;
            this._getNormalisedRange_getAdjustedForDistance({
                range,
                state
            });
            break;
        case Parser.RNG_SPHERE:
            state.offset = 5;
            this._getNormalisedRange_getAdjustedForDistance({
                range,
                state
            });
            break;
        case Parser.RNG_CYLINDER:
            state.offset = 6;
            this._getNormalisedRange_getAdjustedForDistance({
                range,
                state
            });
            break;
        case Parser.RNG_CUBE:
            state.offset = 7;
            this._getNormalisedRange_getAdjustedForDistance({
                range,
                state
            });
            break;
        }

        return (state.multiplier * state.distance) + state.offset;
    }

    static _getNormalisedRange_getAdjustedForDistance({range, state}) {
        const dist = range.distance;
        switch (dist.type) {
        case Parser.UNT_FEET:
            state.multiplier = PageFilterSpells.INCHES_PER_FOOT;
            state.distance = dist.amount;
            break;
        case Parser.UNT_YARDS:
            state.multiplier = PageFilterSpells.INCHES_PER_FOOT * PageFilterSpells.FEET_PER_YARD;
            state.distance = dist.amount;
            break;
        case Parser.UNT_MILES:
            state.multiplier = PageFilterSpells.INCHES_PER_FOOT * PageFilterSpells.FEET_PER_MILE;
            state.distance = dist.amount;
            break;
        case Parser.RNG_SELF:
            state.distance = 0;
            break;
        case Parser.RNG_TOUCH:
            state.distance = 1;
            break;
        case Parser.RNG_SIGHT:
            state.multiplier = PageFilterSpells.INCHES_PER_FOOT * PageFilterSpells.FEET_PER_MILE;
            state.distance = 12;
            break;
        case Parser.RNG_UNLIMITED_SAME_PLANE:
            state.distance = 900000000;
            break;
        case Parser.RNG_UNLIMITED:
            state.distance = 900000001;
            break;
        default:
            {
                this._getNormalisedRange_getAdjustedForDistance_prereleaseBrew({
                    range,
                    state,
                    brewUtil: PrereleaseUtil
                }) || this._getNormalisedRange_getAdjustedForDistance_prereleaseBrew({
                    range,
                    state,
                    brewUtil: BrewUtil2
                });
            }
        }
    }

    static _getNormalisedRange_getAdjustedForDistance_prereleaseBrew({range, state, brewUtil}) {
        const dist = range.distance;
        const fromBrew = brewUtil.getMetaLookup("spellDistanceUnits")?.[dist.type];
        if (!fromBrew)
            return false;

        const ftPerUnit = fromBrew.feetPerUnit;
        if (ftPerUnit != null) {
            state.multiplier = PageFilterSpells.INCHES_PER_FOOT * ftPerUnit;
            state.distance = dist.amount;
        } else {
            state.distance = 910000000;
        }

        return true;
    }

    static getRangeType(range) {
        switch (range.type) {
        case Parser.RNG_SPECIAL:
            return PageFilterSpells.F_RNG_SPECIAL;
        case Parser.RNG_POINT:
            switch (range.distance.type) {
            case Parser.RNG_SELF:
                return PageFilterSpells.F_RNG_SELF;
            case Parser.RNG_TOUCH:
                return PageFilterSpells.F_RNG_TOUCH;
            default:
                return PageFilterSpells.F_RNG_POINT;
            }
        case Parser.RNG_LINE:
        case Parser.RNG_CONE:
        case Parser.RNG_RADIUS:
        case Parser.RNG_HEMISPHERE:
        case Parser.RNG_SPHERE:
        case Parser.RNG_CYLINDER:
        case Parser.RNG_CUBE:
            return PageFilterSpells.F_RNG_SELF_AREA;
        }
    }

    static getTblTimeStr(time) {
        return (time.number === 1 && Parser.SP_TIME_SINGLETONS.includes(time.unit)) ? `${time.unit.uppercaseFirst()}` : `${time.number ? `${time.number} ` : ""}${Parser.spTimeUnitToShort(time.unit).uppercaseFirst()}`;
    }

    static getTblLevelStr(spell) {
        return `${Parser.spLevelToFull(spell.level)}${spell.meta && spell.meta.ritual ? " (rit.)" : ""}${spell.meta && spell.meta.technomagic ? " (tec.)" : ""}`;
    }

    static getRaceFilterItem(r) {
        const addSuffix = (r.source === Parser.SRC_DMG || SourceUtil.isNonstandardSource(r.source || Parser.SRC_PHB) || (typeof PrereleaseUtil !== "undefined" && PrereleaseUtil.hasSourceJson(r.source || Parser.SRC_PHB)) || (typeof BrewUtil2 !== "undefined" && BrewUtil2.hasSourceJson(r.source || Parser.SRC_PHB))) && !r.name.includes(Parser.sourceJsonToAbv(r.source));
        const name = `${r.name}${addSuffix ? ` (${Parser.sourceJsonToAbv(r.source)})` : ""}`;
        const opts = {
            item: name,
            userData: {
                group: SourceUtil.getFilterGroup(r.source || Parser.SRC_PHB),
            },
        };
        if (r.baseName)
            opts.nest = r.baseName;
        else
            opts.nest = "(No Subraces)";
        return new FilterItem(opts);
    }

    constructor() {
        super();

        this._classFilter = new Filter({
            header: "Class",
            groupFn: it=>it.userData.group,
        });
        this._subclassFilter = new Filter({
            header: "Subclass",
            nests: {},
            groupFn: it=>it.userData.group,
        });
        this._levelFilter = new Filter({
            header: "Level",
            items: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, ],
            displayFn: (lvl)=>Parser.spLevelToFullLevelText(lvl, {
                isPluralCantrips: false
            }),
        });
        this._variantClassFilter = new VariantClassFilter();
        this._classAndSubclassFilter = new MultiFilterClasses({
            classFilter: this._classFilter,
            subclassFilter: this._subclassFilter,
            variantClassFilter: this._variantClassFilter,
        });
        this._raceFilter = new Filter({
            header: "Race",
            nests: {},
            groupFn: it=>it.userData.group,
        });
        this._backgroundFilter = new SearchableFilter({
            header: "Background"
        });
        this._featFilter = new SearchableFilter({
            header: "Feat"
        });
        this._optionalfeaturesFilter = new SearchableFilter({
            header: "Other Option/Feature"
        });
        this._metaFilter = new Filter({
            header: "Components & Miscellaneous",
            items: [...PageFilterSpells._META_FILTER_BASE_ITEMS, "Ritual", "SRD", "Basic Rules", "Has Images", "Has Token"],
            itemSortFn: PageFilterSpells.sortMetaFilter,
            isMiscFilter: true,
            displayFn: it=>Parser.spMiscTagToFull(it),
        });
        this._groupFilter = new Filter({
            header: "Group"
        });
        this._schoolFilter = new Filter({
            header: "School",
            items: [...Parser.SKL_ABVS],
            displayFn: Parser.spSchoolAbvToFull,
            itemSortFn: (a,b)=>SortUtil.ascSortLower(Parser.spSchoolAbvToFull(a.item), Parser.spSchoolAbvToFull(b.item)),
        });
        this._subSchoolFilter = new Filter({
            header: "Subschool",
            items: [],
            displayFn: it=>Parser.spSchoolAbvToFull(it).toTitleCase(),
            itemSortFn: (a,b)=>SortUtil.ascSortLower(Parser.spSchoolAbvToFull(a.item), Parser.spSchoolAbvToFull(b.item)),
        });
        this._damageFilter = new Filter({
            header: "Damage Type",
            items: MiscUtil.copy(Parser.DMG_TYPES),
            displayFn: StrUtil.uppercaseFirst,
        });
        this._conditionFilter = new Filter({
            header: "Conditions Inflicted",
            items: [...Parser.CONDITIONS],
            displayFn: uid=>uid.split("|")[0].toTitleCase(),
        });
        this._spellAttackFilter = new Filter({
            header: "Spell Attack",
            items: ["M", "R", "O"],
            displayFn: Parser.spAttackTypeToFull,
            itemSortFn: null,
        });
        this._saveFilter = new Filter({
            header: "Saving Throw",
            items: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"],
            displayFn: PageFilterSpells.getFilterAbilitySave,
            itemSortFn: null,
        });
        this._checkFilter = new Filter({
            header: "Ability Check",
            items: ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"],
            displayFn: PageFilterSpells.getFilterAbilityCheck,
            itemSortFn: null,
        });
        this._timeFilter = new Filter({
            header: "Cast Time",
            items: [Parser.SP_TM_ACTION, Parser.SP_TM_B_ACTION, Parser.SP_TM_REACTION, Parser.SP_TM_ROUND, Parser.SP_TM_MINS, Parser.SP_TM_HRS, ],
            displayFn: Parser.spTimeUnitToFull,
            itemSortFn: null,
        });
        this._durationFilter = new RangeFilter({
            header: "Duration",
            isLabelled: true,
            labelSortFn: null,
            labels: ["Instant", "1 Round", "1 Minute", "10 Minutes", "1 Hour", "8 Hours", "24+ Hours", "Permanent", "Special"],
        });
        this._rangeFilter = new Filter({
            header: "Range",
            items: [PageFilterSpells.F_RNG_SELF, PageFilterSpells.F_RNG_TOUCH, PageFilterSpells.F_RNG_POINT, PageFilterSpells.F_RNG_SELF_AREA, PageFilterSpells.F_RNG_SPECIAL, ],
            itemSortFn: null,
        });
        this._areaTypeFilter = new Filter({
            header: "Area Style",
            items: ["ST", "MT", "R", "N", "C", "Y", "H", "L", "S", "Q", "W"],
            displayFn: Parser.spAreaTypeToFull,
            itemSortFn: null,
        });
        this._affectsCreatureTypeFilter = new Filter({
            header: "Affects Creature Types",
            items: [...Parser.MON_TYPES],
            displayFn: StrUtil.toTitleCase,
        });
    }

    static mutateForFilters(s) {
        Renderer.spell.initBrewSources(s);

        s._normalisedTime = PageFilterSpells.getNormalisedTime(s.time);
        s._normalisedRange = PageFilterSpells.getNormalisedRange(s.range);

        s._fSources = SourceFilter.getCompleteFilterSources(s);
        s._fMeta = PageFilterSpells.getMetaFilterObj(s);
        s._fClasses = Renderer.spell.getCombinedClasses(s, "fromClassList").map(c=>{
            return this._getClassFilterItem({
                className: c.name,
                definedInSource: c.definedInSource,
                classSource: c.source,
                isVariantClass: false,
            });
        }
        );
        s._fSubclasses = Renderer.spell.getCombinedClasses(s, "fromSubclass").map(c=>{
            return this._getSubclassFilterItem({
                className: c.class.name,
                classSource: c.class.source,
                subclassName: c.subclass.name,
                subclassShortName: c.subclass.shortName,
                subclassSource: c.subclass.source,
                subSubclassName: c.subclass.subSubclass,
            });
        }
        );
        s._fVariantClasses = Renderer.spell.getCombinedClasses(s, "fromClassListVariant").map(c=>{
            return this._getClassFilterItem({
                className: c.name,
                definedInSource: c.definedInSource,
                classSource: c.source,
                isVariantClass: true,
            });
        }
        );
        s._fClassesAndVariantClasses = [...s._fClasses, ...s._fVariantClasses.map(it=>(it.userData.definedInSource && !SourceUtil.isNonstandardSource(it.userData.definedInSource)) ? new FilterItem({
            item: it.userData.equivalentClassName
        }) : null).filter(Boolean).filter(it=>!s._fClasses.some(itCls=>itCls.item === it.item)), ];
        s._fRaces = Renderer.spell.getCombinedGeneric(s, {
            propSpell: "races",
            prop: "race"
        }).map(PageFilterSpells.getRaceFilterItem);
        s._fBackgrounds = Renderer.spell.getCombinedGeneric(s, {
            propSpell: "backgrounds",
            prop: "background"
        }).map(it=>it.name);
        s._fFeats = Renderer.spell.getCombinedGeneric(s, {
            propSpell: "feats",
            prop: "feat"
        }).map(it=>it.name);
        s._fOptionalfeatures = Renderer.spell.getCombinedGeneric(s, {
            propSpell: "optionalfeatures",
            prop: "optionalfeature"
        }).map(it=>it.name);
        s._fGroups = Renderer.spell.getCombinedGeneric(s, {
            propSpell: "groups"
        }).map(it=>it.name);
        s._fTimeType = s.time.map(t=>t.unit);
        s._fDurationType = PageFilterSpells.getFilterDuration(s);
        s._fRangeType = PageFilterSpells.getRangeType(s.range);

        s._fAreaTags = [...(s.areaTags || [])];
        if (s.range.type === "line" && !s._fAreaTags.includes("L"))
            s._fAreaTags.push("L");

        s._fAffectsCreatureType = s.affectsCreatureType || [...Parser.MON_TYPES];
    }

    static unmutateForFilters(s) {
        Renderer.spell.uninitBrewSources(s);

        delete s._normalisedTime;
        delete s._normalisedRange;

        Object.keys(s).filter(it=>it.startsWith("_f")).forEach(it=>delete s[it]);
    }

    addToFilters(s, isExcluded) {
        if (isExcluded)
            return;

        if (s.level > 9)
            this._levelFilter.addItem(s.level);
        this._groupFilter.addItem(s._fGroups);
        this._schoolFilter.addItem(s.school);
        this._sourceFilter.addItem(s._fSources);
        this._metaFilter.addItem(s._fMeta);
        this._backgroundFilter.addItem(s._fBackgrounds);
        this._featFilter.addItem(s._fFeats);
        this._optionalfeaturesFilter.addItem(s._fOptionalfeatures);
        s._fClasses.forEach(c=>this._classFilter.addItem(c));
        s._fSubclasses.forEach(sc=>{
            this._subclassFilter.addNest(sc.nest, {
                isHidden: true
            });
            this._subclassFilter.addItem(sc);
        }
        );
        s._fRaces.forEach(r=>{
            if (r.nest)
                this._raceFilter.addNest(r.nest, {
                    isHidden: true
                });
            this._raceFilter.addItem(r);
        }
        );
        s._fVariantClasses.forEach(c=>{
            this._variantClassFilter.addNest(c.nest, {
                isHidden: true
            });
            this._variantClassFilter.addItem(c);
        }
        );
        this._subSchoolFilter.addItem(s.subschools);
        this._conditionFilter.addItem(s.conditionInflict);
        this._affectsCreatureTypeFilter.addItem(s.affectsCreatureType);
    }

    async _pPopulateBoxOptions(opts) {
        await SourceUtil.pInitSubclassReprintLookup();

        opts.filters = [this._sourceFilter, this._levelFilter, this._classAndSubclassFilter, this._raceFilter, this._backgroundFilter, this._featFilter, this._optionalfeaturesFilter, this._metaFilter, this._groupFilter, this._schoolFilter, this._subSchoolFilter, this._damageFilter, this._conditionFilter, this._spellAttackFilter, this._saveFilter, this._checkFilter, this._timeFilter, this._durationFilter, this._rangeFilter, this._areaTypeFilter, this._affectsCreatureTypeFilter, ];
    }

    toDisplay(values, s) {
        return this._filterBox.toDisplay(values, s._fSources, s.level, [this._classAndSubclassFilter.isVariantSplit ? s._fClasses : s._fClassesAndVariantClasses, s._fSubclasses, this._classAndSubclassFilter.isVariantSplit ? s._fVariantClasses : null, ], s._fRaces, s._fBackgrounds, s._fFeats, s._fOptionalfeatures, s._fMeta, s._fGroups, s.school, s.subschools, s.damageInflict, s.conditionInflict, s.spellAttack, s.savingThrow, s.abilityCheck, s._fTimeType, s._fDurationType, s._fRangeType, s._fAreaTags, s._fAffectsCreatureType, );
    }
}
//#endregion

//#region PageFilterFeats
let PageFilterFeats$1 = class PageFilterFeats extends PageFilter {
    static _PREREQ_KEY_TO_FULL = {
        "other": "Special",
        "spellcasting2020": "Spellcasting",
        "spellcastingFeature": "Spellcasting",
        "spellcastingPrepared": "Spellcasting",
    };

    constructor() {
        super();

        this._asiFilter = new Filter({
            header: "Ability Bonus",
            items: ["str", "dex", "con", "int", "wis", "cha", ],
            displayFn: Parser.attAbvToFull,
            itemSortFn: null,
        });
        this._categoryFilter = new Filter({
            header: "Category",
            displayFn: StrUtil.toTitleCase,
        });
        this._otherPrereqFilter = new Filter({
            header: "Other",
            items: ["Ability", "Race", "Psionics", "Proficiency", "Special", "Spellcasting"],
        });
        this._levelFilter = new Filter({
            header: "Level",
            itemSortFn: SortUtil.ascSortNumericalSuffix,
        });
        this._prerequisiteFilter = new MultiFilter({
            header: "Prerequisite",
            filters: [this._otherPrereqFilter, this._levelFilter]
        });
        this._benefitsFilter = new Filter({
            header: "Benefits",
            items: ["Armor Proficiency", "Language Proficiency", "Skill Proficiency", "Spellcasting", "Tool Proficiency", "Weapon Proficiency", ],
        });
        this._vulnerableFilter = FilterCommon.getDamageVulnerableFilter();
        this._resistFilter = FilterCommon.getDamageResistFilter();
        this._immuneFilter = FilterCommon.getDamageImmuneFilter();
        this._defenceFilter = new MultiFilter({
            header: "Damage",
            filters: [this._vulnerableFilter, this._resistFilter, this._immuneFilter]
        });
        this._conditionImmuneFilter = FilterCommon.getConditionImmuneFilter();
        this._miscFilter = new Filter({
            header: "Miscellaneous",
            items: ["Has Info", "Has Images", "SRD", "Basic Rules"],
            isMiscFilter: true
        });
    }

    static mutateForFilters(feat) {
        const ability = Renderer.getAbilityData(feat.ability);
        feat._fAbility = ability.asCollection.filter(a=>!ability.areNegative.includes(a));
        const prereqText = Renderer.utils.prerequisite.getHtml(feat.prerequisite, {
            isListMode: true
        }) || VeCt.STR_NONE;

        feat._fPrereqOther = [...new Set((feat.prerequisite || []).flatMap(it=>Object.keys(it)))].map(it=>(this._PREREQ_KEY_TO_FULL[it] || it).uppercaseFirst());
        if (feat.prerequisite)
            feat._fPrereqLevel = feat.prerequisite.filter(it=>it.level != null).map(it=>`Level ${it.level.level ?? it.level}`);
        feat._fBenifits = [feat.resist ? "Damage Resistance" : null, feat.immune ? "Damage Immunity" : null, feat.conditionImmune ? "Condition Immunity" : null, feat.skillProficiencies ? "Skill Proficiency" : null, feat.additionalSpells ? "Spellcasting" : null, feat.armorProficiencies ? "Armor Proficiency" : null, feat.weaponProficiencies ? "Weapon Proficiency" : null, feat.toolProficiencies ? "Tool Proficiency" : null, feat.languageProficiencies ? "Language Proficiency" : null, ].filter(it=>it);
        if (feat.skillToolLanguageProficiencies?.length) {
            if (feat.skillToolLanguageProficiencies.some(it=>(it.choose || []).some(x=>x.from || [].includes("anySkill"))))
                feat._fBenifits.push("Skill Proficiency");
            if (feat.skillToolLanguageProficiencies.some(it=>(it.choose || []).some(x=>x.from || [].includes("anyTool"))))
                feat._fBenifits.push("Tool Proficiency");
            if (feat.skillToolLanguageProficiencies.some(it=>(it.choose || []).some(x=>x.from || [].includes("anyLanguage"))))
                feat._fBenifits.push("Language Proficiency");
        }
        feat._fMisc = feat.srd ? ["SRD"] : [];
        if (feat.basicRules)
            feat._fMisc.push("Basic Rules");
        if (feat.hasFluff || feat.fluff?.entries)
            feat._fMisc.push("Has Info");
        if (feat.hasFluffImages || feat.fluff?.images)
            feat._fMisc.push("Has Images");
        if (feat.repeatable != null)
            feat._fMisc.push(feat.repeatable ? "Repeatable" : "Not Repeatable");

        feat._slAbility = ability.asText || VeCt.STR_NONE;
        feat._slPrereq = prereqText;

        FilterCommon.mutateForFilters_damageVulnResImmune_player(feat);
        FilterCommon.mutateForFilters_conditionImmune_player(feat);
    }

    addToFilters(feat, isExcluded) {
        if (isExcluded)
            return;

        this._sourceFilter.addItem(feat.source);
        this._categoryFilter.addItem(feat.category);
        if (feat.prerequisite)
            this._levelFilter.addItem(feat._fPrereqLevel);
        this._vulnerableFilter.addItem(feat._fVuln);
        this._resistFilter.addItem(feat._fRes);
        this._immuneFilter.addItem(feat._fImm);
        this._conditionImmuneFilter.addItem(feat._fCondImm);
        this._benefitsFilter.addItem(feat._fBenifits);
        this._miscFilter.addItem(feat._fMisc);
    }

    async _pPopulateBoxOptions(opts) {
        opts.filters = [this._sourceFilter, this._asiFilter, this._categoryFilter, this._prerequisiteFilter, this._benefitsFilter, this._defenceFilter, this._conditionImmuneFilter, this._miscFilter, ];
    }

    toDisplay(values, ft) {
        return this._filterBox.toDisplay(values, ft.source, ft._fAbility, ft.category, [ft._fPrereqOther, ft._fPrereqLevel, ], ft._fBenifits, [ft._fVuln, ft._fRes, ft._fImm, ], ft._fCondImm, ft._fMisc, );
    }
}
;
//#endregion

//#region PageFilterEquipment
class PageFilterEquipment extends PageFilter {
    static _MISC_FILTER_ITEMS = ["Item Group", "Bundle", "SRD", "Basic Rules", "Has Images", "Has Info", "Reprinted", ];

    static _RE_FOUNDRY_ATTR = /(?:[-+*/]\s*)?@[a-z0-9.]+/gi;
    static _RE_DAMAGE_DICE_JUNK = /[^-+*/0-9d]/gi;
    static _RE_DAMAGE_DICE_D = /d/gi;

    static _getSortableDamageTerm(t) {
        try {
            return eval(`${t}`.replace(this._RE_FOUNDRY_ATTR, "").replace(this._RE_DAMAGE_DICE_JUNK, "").replace(this._RE_DAMAGE_DICE_D, "*"), );
        } catch (ignored) {
            return Number.MAX_SAFE_INTEGER;
        }
    }

    static _sortDamageDice(a, b) {
        return this._getSortableDamageTerm(a.item) - this._getSortableDamageTerm(b.item);
    }

    static _getMasteryDisplay(mastery) {
        const {name, source} = DataUtil.proxy.unpackUid("itemMastery", mastery, "itemMastery");
        if (SourceUtil.isSiteSource(source))
            return name.toTitleCase();
        return `${name.toTitleCase()} (${Parser.sourceJsonToAbv(source)})`;
    }

    constructor({filterOpts=null}={}) {
        super();

        this._typeFilter = new Filter({
            header: "Type",
            deselFn: (it)=>PageFilterItems$1._DEFAULT_HIDDEN_TYPES.has(it),
            displayFn: StrUtil.toTitleCase,
        });
        this._propertyFilter = new Filter({
            header: "Property",
            displayFn: StrUtil.toTitleCase
        });
        this._categoryFilter = new Filter({
            header: "Category",
            items: ["Basic", "Generic Variant", "Specific Variant", "Other"],
            deselFn: (it)=>it === "Specific Variant",
            itemSortFn: null,
            ...(filterOpts?.["Category"] || {}),
        });
        this._costFilter = new RangeFilter({
            header: "Cost",
            isLabelled: true,
            isAllowGreater: true,
            labelSortFn: null,
            labels: [0, ...[...new Array(9)].map((_,i)=>i + 1), ...[...new Array(9)].map((_,i)=>10 * (i + 1)), ...[...new Array(100)].map((_,i)=>100 * (i + 1)), ],
            labelDisplayFn: it=>!it ? "None" : Parser.getDisplayCurrency(CurrencyUtil.doSimplifyCoins({
                cp: it
            })),
        });
        this._weightFilter = new RangeFilter({
            header: "Weight",
            min: 0,
            max: 100,
            isAllowGreater: true,
            suffix: " lb."
        });
        this._focusFilter = new Filter({
            header: "Spellcasting Focus",
            items: [...Parser.ITEM_SPELLCASTING_FOCUS_CLASSES]
        });
        this._damageTypeFilter = new Filter({
            header: "Weapon Damage Type",
            displayFn: it=>Parser.dmgTypeToFull(it).uppercaseFirst(),
            itemSortFn: (a,b)=>SortUtil.ascSortLower(Parser.dmgTypeToFull(a), Parser.dmgTypeToFull(b))
        });
        this._damageDiceFilter = new Filter({
            header: "Weapon Damage Dice",
            items: ["1", "1d4", "1d6", "1d8", "1d10", "1d12", "2d6"],
            itemSortFn: (a,b)=>PageFilterEquipment._sortDamageDice(a, b)
        });
        this._miscFilter = new Filter({
            header: "Miscellaneous",
            items: [...PageFilterEquipment._MISC_FILTER_ITEMS, ...Object.values(Parser.ITEM_MISC_TAG_TO_FULL)],
            isMiscFilter: true,
        });
        this._poisonTypeFilter = new Filter({
            header: "Poison Type",
            items: ["ingested", "injury", "inhaled", "contact"],
            displayFn: StrUtil.toTitleCase
        });
        this._masteryFilter = new Filter({
            header: "Mastery",
            displayFn: this.constructor._getMasteryDisplay.bind(this)
        });
    }

    static mutateForFilters(item) {
        item._fSources = SourceFilter.getCompleteFilterSources(item);

        item._fProperties = item.property ? item.property.map(p=>Renderer.item.getProperty(p).name).filter(n=>n) : [];

        item._fMisc = [];
        if (item._isItemGroup)
            item._fMisc.push("Item Group");
        if (item.packContents)
            item._fMisc.push("Bundle");
        if (item.srd)
            item._fMisc.push("SRD");
        if (item.basicRules)
            item._fMisc.push("Basic Rules");
        if (item.hasFluff || item.fluff?.entries)
            item._fMisc.push("Has Info");
        if (item.hasFluffImages || item.fluff?.images)
            item._fMisc.push("Has Images");
        if (item.miscTags)
            item._fMisc.push(...item.miscTags.map(Parser.itemMiscTagToFull));
        if (this._isReprinted({
            reprintedAs: item.reprintedAs,
            tag: "item",
            prop: "item",
            page: UrlUtil.PG_ITEMS
        }))
            item._fMisc.push("Reprinted");

        if (item.focus || item.name === "Thieves' Tools" || item.type === "INS" || item.type === "SCF" || item.type === "AT") {
            item._fFocus = item.focus ? item.focus === true ? [...Parser.ITEM_SPELLCASTING_FOCUS_CLASSES] : [...item.focus] : [];
            if ((item.name === "Thieves' Tools" || item.type === "AT") && !item._fFocus.includes("Artificer"))
                item._fFocus.push("Artificer");
            if (item.type === "INS" && !item._fFocus.includes("Bard"))
                item._fFocus.push("Bard");
            if (item.type === "SCF") {
                switch (item.scfType) {
                case "arcane":
                    {
                        if (!item._fFocus.includes("Sorcerer"))
                            item._fFocus.push("Sorcerer");
                        if (!item._fFocus.includes("Warlock"))
                            item._fFocus.push("Warlock");
                        if (!item._fFocus.includes("Wizard"))
                            item._fFocus.push("Wizard");
                        break;
                    }
                case "druid":
                    {
                        if (!item._fFocus.includes("Druid"))
                            item._fFocus.push("Druid");
                        break;
                    }
                case "holy":
                    if (!item._fFocus.includes("Cleric"))
                        item._fFocus.push("Cleric");
                    if (!item._fFocus.includes("Paladin"))
                        item._fFocus.push("Paladin");
                    break;
                }
            }
        }

        item._fValue = Math.round(item.value || 0);

        item._fDamageDice = [];
        if (item.dmg1)
            item._fDamageDice.push(item.dmg1);
        if (item.dmg2)
            item._fDamageDice.push(item.dmg2);

        item._fMastery = item.mastery ? item.mastery.map(it=>{
            const {name, source} = DataUtil.proxy.unpackUid("itemMastery", it, "itemMastery", {
                isLower: true
            });
            return [name, source].join("|");
        }
        ) : null;
    }

    addToFilters(item, isExcluded) {
        if (isExcluded)
            return;

        this._sourceFilter.addItem(item._fSources);
        this._typeFilter.addItem(item._typeListText);
        this._propertyFilter.addItem(item._fProperties);
        this._damageTypeFilter.addItem(item.dmgType);
        this._damageDiceFilter.addItem(item._fDamageDice);
        this._poisonTypeFilter.addItem(item.poisonTypes);
        this._miscFilter.addItem(item._fMisc);
        this._masteryFilter.addItem(item._fMastery);
    }

    async _pPopulateBoxOptions(opts) {
        opts.filters = [this._sourceFilter, this._typeFilter, this._propertyFilter, this._categoryFilter, this._costFilter, this._weightFilter, this._focusFilter, this._damageTypeFilter, this._damageDiceFilter, this._miscFilter, this._poisonTypeFilter, this._masteryFilter, ];
    }

    toDisplay(values, it) {
        return this._filterBox.toDisplay(values, it._fSources, it._typeListText, it._fProperties, it._category, it._fValue, it.weight, it._fFocus, it.dmgType, it._fDamageDice, it._fMisc, it.poisonTypes, it._fMastery, );
    }
};
//#endregion

//#region PageFilterItems
let PageFilterItems$1 = class PageFilterItems extends PageFilterEquipment {
    static _DEFAULT_HIDDEN_TYPES = new Set(["treasure", "futuristic", "modern", "renaissance"]);
    static _FILTER_BASE_ITEMS_ATTUNEMENT = ["Requires Attunement", "Requires Attunement By...", "Attunement Optional", VeCt.STR_NO_ATTUNEMENT];

    static sortItems(a, b, o) {
        if (o.sortBy === "name")
            return SortUtil.compareListNames(a, b);
        else if (o.sortBy === "type")
            return SortUtil.ascSortLower(a.values.type, b.values.type) || SortUtil.compareListNames(a, b);
        else if (o.sortBy === "source")
            return SortUtil.ascSortLower(a.values.source, b.values.source) || SortUtil.compareListNames(a, b);
        else if (o.sortBy === "rarity")
            return SortUtil.ascSortItemRarity(a.values.rarity, b.values.rarity) || SortUtil.compareListNames(a, b);
        else if (o.sortBy === "attunement")
            return SortUtil.ascSort(a.values.attunement, b.values.attunement) || SortUtil.compareListNames(a, b);
        else if (o.sortBy === "count")
            return SortUtil.ascSort(a.data.count, b.data.count) || SortUtil.compareListNames(a, b);
        else if (o.sortBy === "weight")
            return SortUtil.ascSort(a.values.weight, b.values.weight) || SortUtil.compareListNames(a, b);
        else if (o.sortBy === "cost")
            return SortUtil.ascSort(a.values.cost, b.values.cost) || SortUtil.compareListNames(a, b);
        else
            return 0;
    }

    static _getBaseItemDisplay(baseItem) {
        if (!baseItem)
            return null;
        let[name,source] = baseItem.split("__");
        name = name.toTitleCase();
        source = source || Parser.SRC_DMG;
        if (source.toLowerCase() === Parser.SRC_PHB.toLowerCase())
            return name;
        return `${name} (${Parser.sourceJsonToAbv(source)})`;
    }

    static _sortAttunementFilter(a, b) {
        const ixA = PageFilterItems$1._FILTER_BASE_ITEMS_ATTUNEMENT.indexOf(a.item);
        const ixB = PageFilterItems$1._FILTER_BASE_ITEMS_ATTUNEMENT.indexOf(b.item);

        if (~ixA && ~ixB)
            return ixA - ixB;
        if (~ixA)
            return -1;
        if (~ixB)
            return 1;
        return SortUtil.ascSortLower(a, b);
    }

    static _getAttunementFilterItems(item) {
        const out = item._attunementCategory ? [item._attunementCategory] : [];

        if (!item.reqAttuneTags && !item.reqAttuneAltTags)
            return out;

        [...item.reqAttuneTags || [], ...item.reqAttuneAltTags || []].forEach(tagSet=>{
            Object.entries(tagSet).forEach(([prop,val])=>{
                switch (prop) {
                case "background":
                    out.push(`Background: ${val.split("|")[0].toTitleCase()}`);
                    break;
                case "languageProficiency":
                    out.push(`Language Proficiency: ${val.toTitleCase()}`);
                    break;
                case "skillProficiency":
                    out.push(`Skill Proficiency: ${val.toTitleCase()}`);
                    break;
                case "race":
                    out.push(`Race: ${val.split("|")[0].toTitleCase()}`);
                    break;
                case "creatureType":
                    out.push(`Creature Type: ${val.toTitleCase()}`);
                    break;
                case "size":
                    out.push(`Size: ${Parser.sizeAbvToFull(val)}`.toTitleCase());
                    break;
                case "class":
                    out.push(`Class: ${val.split("|")[0].toTitleCase()}`);
                    break;
                case "alignment":
                    out.push(`Alignment: ${Parser.alignmentListToFull(val).toTitleCase()}`);
                    break;

                case "str":
                case "dex":
                case "con":
                case "int":
                case "wis":
                case "cha":
                    out.push(`${Parser.attAbvToFull(prop)}: ${val} or Higher`);
                    break;

                case "spellcasting":
                    out.push("Spellcaster");
                    break;
                case "psionics":
                    out.push("Psionics");
                    break;
                }
            }
            );
        }
        );

        return out;
    }

    constructor(opts) {
        super(opts);

        this._tierFilter = new Filter({
            header: "Tier",
            items: ["none", "minor", "major"],
            itemSortFn: null,
            displayFn: StrUtil.toTitleCase
        });
        this._attachedSpellsFilter = new SearchableFilter({
            header: "Attached Spells",
            displayFn: (it)=>it.split("|")[0].toTitleCase(),
            itemSortFn: SortUtil.ascSortLower
        });
        this._lootTableFilter = new Filter({
            header: "Found On",
            items: ["Magic Item Table A", "Magic Item Table B", "Magic Item Table C", "Magic Item Table D", "Magic Item Table E", "Magic Item Table F", "Magic Item Table G", "Magic Item Table H", "Magic Item Table I"],
            displayFn: it=>{
                const [name,sourceJson] = it.split("|");
                return `${name}${sourceJson ? ` (${Parser.sourceJsonToAbv(sourceJson)})` : ""}`;
            }
            ,
        });
        this._rarityFilter = new Filter({
            header: "Rarity",
            items: [...Parser.ITEM_RARITIES],
            itemSortFn: null,
            displayFn: StrUtil.toTitleCase,
        });
        this._attunementFilter = new Filter({
            header: "Attunement",
            items: [...PageFilterItems$1._FILTER_BASE_ITEMS_ATTUNEMENT],
            itemSortFn: PageFilterItems$1._sortAttunementFilter
        });
        this._bonusFilter = new Filter({
            header: "Bonus",
            items: ["Armor Class", "Proficiency Bonus", "Spell Attacks", "Spell Save DC", "Saving Throws", ...([...new Array(4)]).map((_,i)=>`Weapon Attack and Damage Rolls${i ? ` (+${i})` : ""}`), ...([...new Array(4)]).map((_,i)=>`Weapon Attack Rolls${i ? ` (+${i})` : ""}`), ...([...new Array(4)]).map((_,i)=>`Weapon Damage Rolls${i ? ` (+${i})` : ""}`), ],
            itemSortFn: null,
        });
        this._rechargeTypeFilter = new Filter({
            header: "Recharge Type",
            displayFn: Parser.itemRechargeToFull
        });
        this._miscFilter = new Filter({
            header: "Miscellaneous",
            items: ["Ability Score Adjustment", "Charges", "Cursed", "Grants Language", "Grants Proficiency", "Magic", "Mundane", "Sentient", "Speed Adjustment", ...PageFilterEquipment._MISC_FILTER_ITEMS],
            isMiscFilter: true
        });
        this._baseSourceFilter = new SourceFilter({
            header: "Base Source",
            selFn: null
        });
        this._baseItemFilter = new Filter({
            header: "Base Item",
            displayFn: this.constructor._getBaseItemDisplay.bind(this.constructor)
        });
        this._optionalfeaturesFilter = new Filter({
            header: "Feature",
            displayFn: (it)=>{
                const [name,source] = it.split("|");
                if (!source)
                    return name.toTitleCase();
                const sourceJson = Parser.sourceJsonToJson(source);
                if (!SourceUtil.isNonstandardSourceWotc(sourceJson))
                    return name.toTitleCase();
                return `${name.toTitleCase()} (${Parser.sourceJsonToAbv(sourceJson)})`;
            }
            ,
            itemSortFn: SortUtil.ascSortLower,
        });
    }

    static mutateForFilters(item) {
        super.mutateForFilters(item);

        item._fTier = [item.tier ? item.tier : "none"];

        if (item.curse)
            item._fMisc.push("Cursed");
        const isMundane = Renderer.item.isMundane(item);
        item._fMisc.push(isMundane ? "Mundane" : "Magic");
        item._fIsMundane = isMundane;
        if (item.ability)
            item._fMisc.push("Ability Score Adjustment");
        if (item.modifySpeed)
            item._fMisc.push("Speed Adjustment");
        if (item.charges)
            item._fMisc.push("Charges");
        if (item.sentient)
            item._fMisc.push("Sentient");
        if (item.grantsProficiency)
            item._fMisc.push("Grants Proficiency");
        if (item.grantsLanguage)
            item._fMisc.push("Grants Language");
        if (item.critThreshold)
            item._fMisc.push("Expanded Critical Range");

        const fBaseItemSelf = item._isBaseItem ? `${item.name}__${item.source}`.toLowerCase() : null;
        item._fBaseItem = [item.baseItem ? (item.baseItem.includes("|") ? item.baseItem.replace("|", "__") : `${item.baseItem}__${Parser.SRC_DMG}`).toLowerCase() : null, item._baseName ? `${item._baseName}__${item._baseSource || item.source}`.toLowerCase() : null, ].filter(Boolean);
        item._fBaseItemAll = fBaseItemSelf ? [fBaseItemSelf, ...item._fBaseItem] : item._fBaseItem;

        item._fBonus = [];
        if (item.bonusAc)
            item._fBonus.push("Armor Class");
        this._mutateForFilters_bonusWeapon({
            prop: "bonusWeapon",
            item,
            text: "Weapon Attack and Damage Rolls"
        });
        this._mutateForFilters_bonusWeapon({
            prop: "bonusWeaponAttack",
            item,
            text: "Weapon Attack Rolls"
        });
        this._mutateForFilters_bonusWeapon({
            prop: "bonusWeaponDamage",
            item,
            text: "Weapon Damage Rolls"
        });
        if (item.bonusWeaponCritDamage)
            item._fBonus.push("Weapon Critical Damage");
        if (item.bonusSpellAttack)
            item._fBonus.push("Spell Attacks");
        if (item.bonusSpellSaveDc)
            item._fBonus.push("Spell Save DC");
        if (item.bonusSavingThrow)
            item._fBonus.push("Saving Throws");
        if (item.bonusProficiencyBonus)
            item._fBonus.push("Proficiency Bonus");

        item._fAttunement = this._getAttunementFilterItems(item);
    }

    static _mutateForFilters_bonusWeapon({prop, item, text}) {
        if (!item[prop])
            return;
        item._fBonus.push(text);
        switch (item[prop]) {
        case "+1":
        case "+2":
        case "+3":
            item._fBonus.push(`${text} (${item[prop]})`);
            break;
        }
    }

    addToFilters(item, isExcluded) {
        if (isExcluded)
            return;

        super.addToFilters(item, isExcluded);

        this._sourceFilter.addItem(item.source);
        this._tierFilter.addItem(item._fTier);
        this._attachedSpellsFilter.addItem(item.attachedSpells);
        this._lootTableFilter.addItem(item.lootTables);
        this._baseItemFilter.addItem(item._fBaseItem);
        this._baseSourceFilter.addItem(item._baseSource);
        this._attunementFilter.addItem(item._fAttunement);
        this._rechargeTypeFilter.addItem(item.recharge);
        this._optionalfeaturesFilter.addItem(item.optionalfeatures);
    }

    async _pPopulateBoxOptions(opts) {
        await super._pPopulateBoxOptions(opts);

        opts.filters = [this._sourceFilter, this._typeFilter, this._tierFilter, this._rarityFilter, this._propertyFilter, this._attunementFilter, this._categoryFilter, this._costFilter, this._weightFilter, this._focusFilter, this._damageTypeFilter, this._damageDiceFilter, this._bonusFilter, this._miscFilter, this._rechargeTypeFilter, this._poisonTypeFilter, this._masteryFilter, this._lootTableFilter, this._baseItemFilter, this._baseSourceFilter, this._optionalfeaturesFilter, this._attachedSpellsFilter, ];
    }

    toDisplay(values, it) {
        return this._filterBox.toDisplay(values, it._fSources, it._typeListText, it._fTier, it.rarity, it._fProperties, it._fAttunement, it._category, it._fValue, it.weight, it._fFocus, it.dmgType, it._fDamageDice, it._fBonus, it._fMisc, it.recharge, it.poisonTypes, it._fMastery, it.lootTables, it._fBaseItemAll, it._baseSource, it.optionalfeatures, it.attachedSpells, );
    }
}
;
//#endregion

class VariantClassFilter extends Filter {
    constructor(opts) {
        super({
            header: "Optional/Variant Class",
            nests: {},
            groupFn: it=>it.userData.group,
            ...opts,
        });

        this._parent = null;
    }

    set parent(multiFilterClasses) {
        this._parent = multiFilterClasses;
    }

    handleVariantSplit(isVariantSplit) {
        this.__$wrpFilter.toggleVe(isVariantSplit);
    }
}
class MultiFilterClasses extends MultiFilter {
    constructor(opts) {
        super({
            header: "Classes",
            mode: "or",
            filters: [opts.classFilter, opts.subclassFilter, opts.variantClassFilter],
            ...opts
        });

        this._classFilter = opts.classFilter;
        this._subclassFilter = opts.subclassFilter;
        this._variantClassFilter = opts.variantClassFilter;

        this._variantClassFilter.parent = this;
    }

    get classFilter_() {
        return this._classFilter;
    }
    get isVariantSplit() {
        return this._meta.isVariantSplit;
    }

    $render(opts) {
        const $out = super.$render(opts);

        const hkVariantSplit = ()=>this._variantClassFilter.handleVariantSplit(this._meta.isVariantSplit);
        this._addHook("meta", "isVariantSplit", hkVariantSplit);
        hkVariantSplit();

        return $out;
    }

    _getHeaderControls_addExtraStateBtns(opts, wrpStateBtnsOuter) {
        const btnToggleVariantSplit = ComponentUiUtil.getBtnBool(this, "isVariantSplit", {
            ele: e_({
                tag: "button",
                clazz: "btn ve-btn-default btn-xs",
                text: "Include Variants"
            }),
            isInverted: true,
            stateName: "meta",
            stateProp: "_meta",
            title: `If "Optional/Variant Class" spell lists should be treated as part of the "Class" filter.`,
        }, );

        e_({
            tag: "div",
            clazz: `btn-group w-100 ve-flex-v-center mobile__m-1 mobile__mb-2`,
            children: [btnToggleVariantSplit, ],
        }).prependTo(wrpStateBtnsOuter);
    }

    getDefaultMeta() {
        return {
            ...MultiFilterClasses._DEFAULT_META,
            ...super.getDefaultMeta()
        };
    }
}
MultiFilterClasses._DEFAULT_META = {
    isVariantSplit: false,
};
class SearchableFilter extends Filter {
    constructor(opts) {
        super(opts);

        this._compSearch = BaseComponent.fromObject({
            search: "",
            searchTermParent: "",
        });
    }

    handleSearch(searchTerm) {
        const out = super.handleSearch(searchTerm);

        this._compSearch._state.searchTermParent = searchTerm;

        return out;
    }

    _getPill(item) {
        const btnPill = super._getPill(item);

        const hkIsVisible = ()=>{
            if (this._compSearch._state.searchTermParent)
                return btnPill.toggleClass("fltr__hidden--inactive", false);

            btnPill.toggleClass("fltr__hidden--inactive", this._state[item.item] === 0);
        }
        ;
        this._addHook("state", item.item, hkIsVisible);
        this._compSearch._addHookBase("searchTermParent", hkIsVisible);
        hkIsVisible();

        return btnPill;
    }

    _getPill_handleClick({evt, item}) {
        if (this._compSearch._state.searchTermParent)
            return super._getPill_handleClick({
                evt,
                item
            });

        this._state[item.item] = 0;
    }

    _getPill_handleContextmenu({evt, item}) {
        if (this._compSearch._state.searchTermParent)
            return super._getPill_handleContextmenu({
                evt,
                item
            });

        evt.preventDefault();
        this._state[item.item] = 0;
    }

    _$render_getRowBtn({fnsCleanup, $iptSearch, item, subtype, state}) {
        const handleClick = evt=>{
            evt.stopPropagation();
            evt.preventDefault();

            $iptSearch.focus();

            if (evt.shiftKey) {
                this._doSetPillsClear();
            }

            if (this._state[item.item] === state)
                this._state[item.item] = 0;
            else
                this._state[item.item] = state;
        }
        ;

        const btn = e_({
            tag: "div",
            clazz: `no-shrink clickable fltr-search__btn-activate fltr-search__btn-activate--${subtype} ve-flex-vh-center`,
            click: evt=>handleClick(evt),
            contextmenu: evt=>handleClick(evt),
            mousedown: evt=>{
                evt.stopPropagation();
                evt.preventDefault();
            }
            ,
        });

        const hkIsActive = ()=>{
            btn.innerText = this._state[item.item] === state ? "×" : "";
        }
        ;
        this._addHookBase(item.item, hkIsActive);
        hkIsActive();
        fnsCleanup.push(()=>this._removeHookBase(item.item, hkIsActive));

        return btn;
    }

    $render(opts) {
        const $out = super.$render(opts);

        const $iptSearch = ComponentUiUtil.$getIptStr(this._compSearch, "search", {
            html: `<input class="form-control form-control--minimal input-xs" placeholder="Search...">`,
        }, );

        const wrpValues = e_({
            tag: "div",
            clazz: "overflow-y-auto bt-0 absolute fltr-search__wrp-values",
        });

        const fnsCleanup = [];
        const rowMetas = [];

        this._$render_bindSearchHandler_keydown({
            $iptSearch,
            fnsCleanup,
            rowMetas
        });
        this._$render_bindSearchHandler_focus({
            $iptSearch,
            fnsCleanup,
            rowMetas,
            wrpValues
        });
        this._$render_bindSearchHandler_blur({
            $iptSearch
        });

        const $wrp = $$`<div class="fltr-search__wrp-search ve-flex-col relative mt-1 mx-2p mb-1">
			${$iptSearch}
			${wrpValues}
		</div>`.prependTo(this.__wrpPills);

        const hkParentSearch = ()=>{
            $wrp.toggleVe(!this._compSearch._state.searchTermParent);
        }
        ;
        this._compSearch._addHookBase("searchTermParent", hkParentSearch);
        hkParentSearch();

        return $out;
    }

    _$render_bindSearchHandler_keydown({$iptSearch, rowMetas}) {
        $iptSearch.on("keydown", evt=>{
            switch (evt.key) {
            case "Escape":
                evt.stopPropagation();
                return $iptSearch.blur();

            case "ArrowDown":
                {
                    evt.preventDefault();
                    const visibleRowMetas = rowMetas.filter(it=>it.isVisible);
                    if (!visibleRowMetas.length)
                        return;
                    visibleRowMetas[0].row.focus();
                    break;
                }

            case "Enter":
                {
                    const visibleRowMetas = rowMetas.filter(it=>it.isVisible);
                    if (!visibleRowMetas.length)
                        return;
                    if (evt.shiftKey)
                        this._doSetPillsClear();
                    this._state[visibleRowMetas[0].item.item] = (EventUtil.isCtrlMetaKey(evt)) ? 2 : 1;
                    $iptSearch.blur();
                    break;
                }
            }
        }
        );
    }

    _$render_bindSearchHandler_focus({$iptSearch, fnsCleanup, rowMetas, wrpValues}) {
        $iptSearch.on("focus", ()=>{
            fnsCleanup.splice(0, fnsCleanup.length).forEach(fn=>fn());

            rowMetas.splice(0, rowMetas.length);

            wrpValues.innerHTML = "";

            rowMetas.push(...this._items.map(item=>this._$render_bindSearchHandler_focus_getRowMeta({
                $iptSearch,
                fnsCleanup,
                rowMetas,
                wrpValues,
                item
            })), );

            this._$render_bindSearchHandler_focus_addHookSearch({
                rowMetas,
                fnsCleanup
            });

            wrpValues.scrollIntoView({
                block: "nearest",
                inline: "nearest"
            });
        }
        );
    }

    _$render_bindSearchHandler_focus_getRowMeta({$iptSearch, fnsCleanup, rowMetas, wrpValues, item}) {
        const dispName = this._getDisplayText(item);

        const eleName = e_({
            tag: "div",
            clazz: "fltr-search__disp-name ml-2",
        });

        const btnBlue = this._$render_getRowBtn({
            fnsCleanup,
            $iptSearch,
            item,
            subtype: "yes",
            state: 1,
        });
        btnBlue.addClass("br-0");
        btnBlue.addClass("btr-0");
        btnBlue.addClass("bbr-0");

        const btnRed = this._$render_getRowBtn({
            fnsCleanup,
            $iptSearch,
            item,
            subtype: "no",
            state: 2,
        });
        btnRed.addClass("bl-0");
        btnRed.addClass("btl-0");
        btnRed.addClass("bbl-0");

        const row = e_({
            tag: "div",
            clazz: "py-1p px-2 ve-flex-v-center fltr-search__wrp-row",
            children: [btnBlue, btnRed, eleName, ],
            attrs: {
                tabindex: "0",
            },
            keydown: evt=>{
                switch (evt.key) {
                case "Escape":
                    evt.stopPropagation();
                    return row.blur();

                case "ArrowDown":
                    {
                        evt.preventDefault();
                        const visibleRowMetas = rowMetas.filter(it=>it.isVisible);
                        if (!visibleRowMetas.length)
                            return;
                        const ixCur = visibleRowMetas.indexOf(out);
                        const nxt = visibleRowMetas[ixCur + 1];
                        if (nxt)
                            nxt.row.focus();
                        break;
                    }

                case "ArrowUp":
                    {
                        evt.preventDefault();
                        const visibleRowMetas = rowMetas.filter(it=>it.isVisible);
                        if (!visibleRowMetas.length)
                            return;
                        const ixCur = visibleRowMetas.indexOf(out);
                        const prev = visibleRowMetas[ixCur - 1];
                        if (prev)
                            return prev.row.focus();
                        $iptSearch.focus();
                        break;
                    }

                case "Enter":
                    {
                        if (evt.shiftKey)
                            this._doSetPillsClear();
                        this._state[item.item] = (EventUtil.isCtrlMetaKey(evt)) ? 2 : 1;
                        row.blur();
                        break;
                    }
                }
            }
            ,
        });

        wrpValues.appendChild(row);

        const out = {
            isVisible: true,
            item,
            row,
            dispName,
            eleName,
        };

        return out;
    }

    _$render_bindSearchHandler_focus_addHookSearch({rowMetas, fnsCleanup}) {
        const hkSearch = ()=>{
            const searchTerm = this._compSearch._state.search.toLowerCase();

            rowMetas.forEach(({item, row})=>{
                row.isVisible = item.searchText.includes(searchTerm);
                row.toggleVe(row.isVisible);
            }
            );

            if (!this._compSearch._state.search) {
                rowMetas.forEach(({dispName, eleName})=>eleName.textContent = dispName);
                return;
            }

            const re = new RegExp(this._compSearch._state.search.qq().escapeRegexp(),"gi");

            rowMetas.forEach(({dispName, eleName})=>{
                eleName.innerHTML = dispName.qq().replace(re, (...m)=>`<u>${m[0]}</u>`);
            }
            );
        }
        ;
        this._compSearch._addHookBase("search", hkSearch);
        hkSearch();
        fnsCleanup.push(()=>this._compSearch._removeHookBase("search", hkSearch));
    }

    _$render_bindSearchHandler_blur({$iptSearch}) {
        $iptSearch.on("blur", ()=>{
            this._compSearch._state.search = "";
        }
        );
    }
}

//#endregion

//#region Modals    

//#region ModalFilter
class ModalFilter {
    static _$getFilterColumnHeaders(btnMeta) {
        return btnMeta.map((it,i)=>$(`<button class="col-${it.width} ${i === 0 ? "pl-0" : i === btnMeta.length ? "pr-0" : ""} ${it.disabled ? "" : "sort"} btn ve-btn-default btn-xs" ${it.disabled ? "" : `data-sort="${it.sort}"`} ${it.title ? `title="${it.title}"` : ""} ${it.disabled ? "disabled" : ""}>${it.text}</button>`));
    }

    /**
     * Description
     * @param {{modalTitle:string, fnSort:Function, pageFilter:PageFilter, namespace:string, isRadio:boolean, allData:any}} opts
     * @returns {any}
     */
    constructor(opts) {
        this._modalTitle = opts.modalTitle;
        this._fnSort = opts.fnSort;
        this._pageFilter = opts.pageFilter;
        this._namespace = opts.namespace;
        this._allData = opts.allData || null; //This is all data (classes, races, etc) that we are provided
        this._isRadio = !!opts.isRadio;

        this._list = null;
        this._filterCache = null;
    }

    /**
     * @returns {PageFilter}
     */
    get pageFilter() {return this._pageFilter;}
    get allData() { return this._allData;}

    _$getWrpList() {
        return $(`<div class="list ui-list__wrp overflow-x-hidden overflow-y-auto h-100 min-h-0"></div>`);
    }

    _$getColumnHeaderPreviewAll(opts) {
        return $(`<button class="btn ve-btn-default btn-xs ${opts.isBuildUi ? "col-1" : "col-0-5"}">${ListUiUtil.HTML_GLYPHICON_EXPAND}</button>`);
    }

    async pPopulateWrapper($wrp, opts) {
        opts = opts || {};

        await this._pInit();

        const $ovlLoading = $(`<div class="w-100 h-100 ve-flex-vh-center"><i class="dnd-font ve-muted">Loading...</i></div>`).appendTo($wrp);

        const $iptSearch = (opts.$iptSearch || $(`<input class="form-control lst__search lst__search--no-border-h h-100" type="search" placeholder="Search...">`)).disableSpellcheck();
        const $btnReset = opts.$btnReset || $(`<button class="btn ve-btn-default">Reset</button>`);
        const $dispNumVisible = $(`<div class="lst__wrp-search-visible no-events ve-flex-vh-center"></div>`);

        const $wrpIptSearch = $$`<div class="w-100 relative">
			${$iptSearch}
			<div class="lst__wrp-search-glass no-events ve-flex-vh-center"><span class="glyphicon glyphicon-search"></span></div>
			${$dispNumVisible}
		</div>`;

        const $wrpFormTop = $$`<div class="ve-flex input-group btn-group w-100 lst__form-top">${$wrpIptSearch}${$btnReset}</div>`;

        const $wrpFormBottom = opts.$wrpMiniPills || $(`<div class="w-100"></div>`);

        const $wrpFormHeaders = $(`<div class="input-group input-group--bottom ve-flex no-shrink"></div>`);
        const $cbSelAll = opts.isBuildUi || this._isRadio ? null : $(`<input type="checkbox">`);
        const $btnSendAllToRight = opts.isBuildUi ? $(`<button class="btn btn-xxs ve-btn-default col-1" title="Add All"><span class="glyphicon glyphicon-arrow-right"></span></button>`) : null;

        if (!opts.isBuildUi) {
            if (this._isRadio)
                $wrpFormHeaders.append(`<label class="btn ve-btn-default btn-xs col-0-5 ve-flex-vh-center" disabled></label>`);
            else
                $$`<label class="btn ve-btn-default btn-xs col-0-5 ve-flex-vh-center">${$cbSelAll}</label>`.appendTo($wrpFormHeaders);
        }

        const $btnTogglePreviewAll = this._$getColumnHeaderPreviewAll(opts).appendTo($wrpFormHeaders);

        this._$getColumnHeaders().forEach($ele=>$wrpFormHeaders.append($ele));
        if (opts.isBuildUi)
            $btnSendAllToRight.appendTo($wrpFormHeaders);

        const $wrpForm = $$`<div class="ve-flex-col w-100 mb-1">${$wrpFormTop}${$wrpFormBottom}${$wrpFormHeaders}</div>`;
        const $wrpList = this._$getWrpList();

        const $btnConfirm = opts.isBuildUi ? null : $(`<button class="btn ve-btn-default">Confirm</button>`);

        this._list = new List({
            $iptSearch,
            $wrpList,
            fnSort: this._fnSort,
        });
        const listSelectClickHandler = new ListSelectClickHandler({
            list: this._list
        });

        if (!opts.isBuildUi && !this._isRadio)
            listSelectClickHandler.bindSelectAllCheckbox($cbSelAll);
        ListUiUtil.bindPreviewAllButton($btnTogglePreviewAll, this._list);
        SortUtil.initBtnSortHandlers($wrpFormHeaders, this._list);
        this._list.on("updated", ()=>$dispNumVisible.html(`${this._list.visibleItems.length}/${this._list.items.length}`));

        this._allData = this._allData || await this._pLoadAllData();

        await this._pageFilter.pInitFilterBox({
            $wrpFormTop,
            $btnReset,
            $wrpMiniPills: $wrpFormBottom,
            namespace: this._namespace,
            $btnOpen: opts.$btnOpen,
            $btnToggleSummaryHidden: opts.$btnToggleSummaryHidden,
        });

        this._allData.forEach((it,i)=>{
            this._pageFilter.mutateAndAddToFilters(it);
            const filterListItem = this._getListItem(this._pageFilter, it, i);
            this._list.addItem(filterListItem);
            if (!opts.isBuildUi) {
                if (this._isRadio)
                    filterListItem.ele.addEventListener("click", evt=>listSelectClickHandler.handleSelectClickRadio(filterListItem, evt));
                else
                    filterListItem.ele.addEventListener("click", evt=>listSelectClickHandler.handleSelectClick(filterListItem, evt));
            }
        }
        );

        this._list.init();
        this._list.update();

        const handleFilterChange = ()=>{
            const f = this._pageFilter.filterBox.getValues();
            this._list.filter(li=>this._isListItemMatchingFilter(f, li));
        }
        ;

        this._pageFilter.trimState();

        this._pageFilter.filterBox.on(FilterBox.EVNT_VALCHANGE, handleFilterChange);
        this._pageFilter.filterBox.render();
        handleFilterChange();

        $ovlLoading.remove();

        const $wrpInner = $$`<div class="ve-flex-col h-100">
			${$wrpForm}
			${$wrpList}
			${opts.isBuildUi ? null : $$`<hr class="hr-1"><div class="ve-flex-vh-center">${$btnConfirm}</div>`}
		</div>`.appendTo($wrp.empty());

        return {
            $wrpIptSearch,
            $iptSearch,
            $wrpInner,
            $btnConfirm,
            pageFilter: this._pageFilter,
            list: this._list,
            $cbSelAll,
            $btnSendAllToRight,
        };
    }

    _isListItemMatchingFilter(f, li) {
        return this._isEntityItemMatchingFilter(f, this._allData[li.ix]);
    }
    _isEntityItemMatchingFilter(f, it) {
        return this._pageFilter.toDisplay(f, it);
    }

    async pPopulateHiddenWrapper() {
        await this._pInit();

        this._allData = this._allData || await this._pLoadAllData();

        await this._pageFilter.pInitFilterBox({
            namespace: this._namespace
        });

        this._allData.forEach(it=>{
            this._pageFilter.mutateAndAddToFilters(it);
        }
        );

        this._pageFilter.trimState();
    }

    handleHiddenOpenButtonClick() {
        this._pageFilter.filterBox.show();
    }

    handleHiddenResetButtonClick(evt) {
        this._pageFilter.filterBox.reset(evt.shiftKey);
    }

    _getStateFromFilterExpression(filterExpression) {
        const filterSubhashMeta = Renderer.getFilterSubhashes(Renderer.splitTagByPipe(filterExpression), this._namespace);
        const subhashes = filterSubhashMeta.subhashes.map(it=>`${it.key}${HASH_SUB_KV_SEP}${it.value}`);
        const unpackedSubhashes = this.pageFilter.filterBox.unpackSubHashes(subhashes, {
            force: true
        });
        return this.pageFilter.filterBox.getNextStateFromSubHashes({
            unpackedSubhashes
        });
    }

    getItemsMatchingFilterExpression({filterExpression}) {
        const nxtStateOuter = this._getStateFromFilterExpression(filterExpression);

        const f = this._pageFilter.filterBox.getValues({
            nxtStateOuter
        });
        const filteredItems = this._filterCache.list.getFilteredItems({
            items: this._filterCache.list.items,
            fnFilter: li=>this._isListItemMatchingFilter(f, li),
        });

        return this._filterCache.list.getSortedItems({
            items: filteredItems
        });
    }

    getEntitiesMatchingFilterExpression({filterExpression}) {
        const nxtStateOuter = this._getStateFromFilterExpression(filterExpression);

        const f = this._pageFilter.filterBox.getValues({
            nxtStateOuter
        });
        return this._allData.filter(this._isEntityItemMatchingFilter.bind(this, f));
    }

    getRenderedFilterExpression({filterExpression}) {
        const nxtStateOuter = this._getStateFromFilterExpression(filterExpression);
        return this.pageFilter.filterBox.getDisplayState({
            nxtStateOuter
        });
    }

    async pGetUserSelection({filterExpression=null}={}) {
        return new Promise(async resolve=>{
            const {$modalInner, doClose} = await this._pGetShowModal(resolve);

            await this.pPreloadHidden($modalInner);

            this._doApplyFilterExpression(filterExpression);

            this._filterCache.$btnConfirm.off("click").click(async()=>{
                const checked = this._filterCache.list.visibleItems.filter(it=>it.data.cbSel.checked);
                resolve(checked);

                doClose(true);

                if (this._filterCache.$cbSelAll)
                    this._filterCache.$cbSelAll.prop("checked", false);
                this._filterCache.list.items.forEach(it=>{
                    if (it.data.cbSel)
                        it.data.cbSel.checked = false;
                    it.ele.classList.remove("list-multi-selected");
                }
                );
            }
            );

            await UiUtil.pDoForceFocus(this._filterCache.$iptSearch[0]);
        }
        );
    }

    async _pGetShowModal(resolve) {
        const {$modalInner, doClose} = await UiUtil.pGetShowModal({
            isHeight100: true,
            isWidth100: true,
            title: `Filter/Search for ${this._modalTitle}`,
            cbClose: (isDataEntered)=>{ //isDataEntered is a boolean which tells us if the user entered any data or not
                if(this._filterCache){this._filterCache.$wrpModalInner.detach();}
                if (!isDataEntered){resolve([]);}
            },
            isUncappedHeight: true,
        });

        return { $modalInner, doClose };
    }

    _doApplyFilterExpression(filterExpression) {
        if (!filterExpression)
            return;

        const filterSubhashMeta = Renderer.getFilterSubhashes(Renderer.splitTagByPipe(filterExpression), this._namespace);
        const subhashes = filterSubhashMeta.subhashes.map(it=>`${it.key}${HASH_SUB_KV_SEP}${it.value}`);
        this.pageFilter.filterBox.setFromSubHashes(subhashes, {
            force: true, $iptSearch: this._filterCache.$iptSearch
        });
    }

    _getNameStyle() {return `bold`;}

    async pPreloadHidden($modalInner) {
        $modalInner = $modalInner || $(`<div></div>`);

        if (this._filterCache) {
            this._filterCache.$wrpModalInner.appendTo($modalInner);
        }
        else {
            const meta = await this.pPopulateWrapper($modalInner);
            const {$iptSearch, $btnConfirm, pageFilter, list, $cbSelAll} = meta;
            const $wrpModalInner = meta.$wrpInner;

            this._filterCache = {
                $iptSearch,
                $wrpModalInner,
                $btnConfirm,
                pageFilter,
                list,
                $cbSelAll
            };
        }
    }

    _$getColumnHeaders() {
        throw new Error(`Unimplemented!`);
    }
    /**Blank init function that can be overridden */
    async _pInit() {}
    async _pLoadAllData() {
        throw new Error(`Unimplemented!`);
    }
    async _getListItem() {
        throw new Error(`Unimplemented!`);
    }
}
class ModalFilterClasses extends ModalFilter {

    constructor(opts) {
        opts = opts || {};

        super({
            ...opts,
            modalTitle: "Class and Subclass",
            pageFilter: new PageFilterClassesRaw(),
            fnSort: ModalFilterClasses.fnSort,
        });

        this._pLoadingAllData = null;

        this._ixPrevSelectedClass = null;
        this._isClassDisabled = false;
        this._isSubclassDisabled = false;
    }
    
    /**
     * The PageFilter
     * @returns {PageFilterClassesRaw}
     */
    get pageFilter() {return this._pageFilter;}

    static fnSort(a, b, opts) {
        const out = SortUtil.listSort(a, b, opts);

        if (opts.sortDir === "desc" && a.data.ixClass === b.data.ixClass && (a.data.ixSubclass != null || b.data.ixSubclass != null)) {
            return a.data.ixSubclass != null ? -1 : 1;
        }

        return out;
    }


    /**
     * Description
     * @param {{className: String, classSource:String, subclassName:String, subclassSource:string}} classSubclassMeta
     * @returns {{class:Object, subclass:Object}}
     */
    async pGetSelection(classSubclassMeta) {
        const {className, classSource, subclassName, subclassSource} = classSubclassMeta;

        const allData = this._allData || await this._pLoadAllData();

        const cls = allData.find(it=>it.name === className && it.source === classSource);
        if (!cls)
            throw new Error(`Could not find class with name "${className}" and source "${classSource}"`);

        const out = {class: cls, };

        if (subclassName && subclassSource) {
            const sc = cls.subclasses.find(it=>it.name === subclassName && it.source === subclassSource);
            if (!sc)
                throw new Error(`Could not find subclass with name "${subclassName}" and source "${subclassSource}" on class with name "${className}" and source "${classSource}"`);

            out.subclass = sc;
        }

        return out;
    }

    async pGetUserSelection({filterExpression=null, selectedClass=null, selectedSubclass=null, isClassDisabled=false, isSubclassDisabled=false}={}) {
        return new Promise(async resolve=>{
            const {$modalInner, doClose} = await this._pGetShowModal(resolve);

            await this.pPreloadHidden($modalInner);

            this._doApplyFilterExpression(filterExpression);

            this._filterCache.$btnConfirm.off("click").click(async()=>{
                const checked = this._filterCache.list.items.filter(it=>it.data.tglSel.classList.contains("active"));
                const out = {};
                checked.forEach(it=>{
                    if (it.data.ixSubclass == null)
                        out.class = this._filterCache.allData[it.data.ixClass];
                    else
                        out.subclass = this._filterCache.allData[it.data.ixClass].subclasses[it.data.ixSubclass];
                }
                );
                resolve(MiscUtil.copy(out));

                doClose(true);

                ModalFilterClasses._doListDeselectAll(this._filterCache.list);
            }
            );

            this._ixPrevSelectedClass = selectedClass != null ? this._filterCache.allData.findIndex(it=>it.name === selectedClass.name && it.source === selectedClass.source) : null;
            this._isClassDisabled = isClassDisabled;
            this._isSubclassDisabled = isSubclassDisabled;
            this._filterCache.list.items.forEach(li=>{
                const isScLi = li.data.ixSubclass != null;
                if (isScLi) {
                    li.data.tglSel.classList.toggle("disabled", this._isSubclassDisabled || (this._isClassDisabled && li.data.ixClass !== this._ixPrevSelectedClass));
                } else {
                    li.data.tglSel.classList.toggle("disabled", this._isClassDisabled);
                }
            }
            );

            if (selectedClass != null) {
                const ixSubclass = ~this._ixPrevSelectedClass && selectedSubclass != null ? this._filterCache.allData[this._ixPrevSelectedClass].subclasses.findIndex(it=>it.name === selectedSubclass.name && it.source === selectedSubclass.source) : -1;

                if (~this._ixPrevSelectedClass) {
                    ModalFilterClasses._doListDeselectAll(this._filterCache.list);

                    const clsItem = this._filterCache.list.items.find(it=>it.data.ixClass === this._ixPrevSelectedClass && it.data.ixSubclass == null);
                    if (clsItem) {
                        clsItem.data.tglSel.classList.add("active");
                        clsItem.ele.classList.add("list-multi-selected");
                    }

                    if (~ixSubclass && clsItem) {
                        const scItem = this._filterCache.list.items.find(it=>it.data.ixClass === this._ixPrevSelectedClass && it.data.ixSubclass === ixSubclass);
                        scItem.data.tglSel.classList.add("active");
                        scItem.ele.classList.add("list-multi-selected");
                    }
                }

                this._filterCache.list.setFnSearch((li,searchTerm)=>{
                    if (li.data.ixClass !== this._ixPrevSelectedClass)
                        return false;
                    return List.isVisibleDefaultSearch(li, searchTerm);
                }
                );
            } else {
                this._filterCache.list.setFnSearch(null);
            }

            this._filterCache.list.update();

            await UiUtil.pDoForceFocus(this._filterCache.$iptSearch[0]);
        }
        );
    }

    /**Called by ActorCharactermancerClass before the first render*/
    async pPreloadHidden($modalInner) {
        $modalInner = $modalInner || $(`<div></div>`);

        if (this._filterCache) {
            this._filterCache.$wrpModalInner.appendTo($modalInner);
        }
        else {
            await this._pInit();

            //Loading text
            const $ovlLoading = $(`<div class="w-100 h-100 ve-flex-vh-center"><i class="dnd-font ve-muted">Loading...</i></div>`).appendTo($modalInner);

            const $iptSearch = $(`<input class="form-control h-100" type="search" placeholder="Search...">`);
            const $btnReset = $(`<button class="btn ve-btn-default">Reset</button>`);
            const $wrpFormTop = $$`<div class="ve-flex input-group btn-group w-100 lst__form-top">${$iptSearch}${$btnReset}</div>`;

            const $wrpFormBottom = $(`<div class="w-100"></div>`);

            const $wrpFormHeaders = $(`<div class="input-group input-group--bottom ve-flex no-shrink">
				<div class="btn ve-btn-default disabled col-1 pl-0"></div>
				<button class="col-9 sort btn ve-btn-default btn-xs" data-sort="name">Name</button>
				<button class="col-2 pr-0 sort btn ve-btn-default btn-xs ve-grow" data-sort="source">Source</button>
			</div>`);

            const $wrpForm = $$`<div class="ve-flex-col w-100 mb-2">${$wrpFormTop}${$wrpFormBottom}${$wrpFormHeaders}</div>`;
            const $wrpList = this._$getWrpList();

            const $btnConfirm = $(`<button class="btn ve-btn-default">Confirm</button>`);

            const list = new List({ $iptSearch, $wrpList, fnSort: this._fnSort, });

            SortUtil.initBtnSortHandlers($wrpFormHeaders, list);

            //allData is probably already set
            const allData = this._allData || await this._pLoadAllData();
            const pageFilter = this._pageFilter;

            await pageFilter.pInitFilterBox({ $wrpFormTop, $btnReset, $wrpMiniPills: $wrpFormBottom, namespace: this._namespace, });

            allData.forEach((it,i)=>{
                pageFilter.mutateAndAddToFilters(it);
                const filterListItems = this._getListItems(pageFilter, it, i);
                filterListItems.forEach(li=>{
                    list.addItem(li);
                    li.ele.addEventListener("click", evt=>{
                        const isScLi = li.data.ixSubclass != null;

                        if (isScLi) {
                            if (this._isSubclassDisabled)
                                return;
                            if (this._isClassDisabled && li.data.ixClass !== this._ixPrevSelectedClass)
                                return;
                        } else {
                            if (this._isClassDisabled)
                                return;
                        }

                        this._handleSelectClick({
                            list,
                            filterListItems,
                            filterListItem: li,
                            evt,
                        });
                    }
                    );
                }
                );
            }
            );

            list.init();
            list.update();

            //Wrapper to a function to be called when the filter changes
            const handleFilterChange = ()=>{
                return this.constructor.handleFilterChange({ pageFilter, list, allData });
            };

            pageFilter.trimState();

            pageFilter.filterBox.on(FilterBox.EVNT_VALCHANGE, handleFilterChange);
            pageFilter.filterBox.render(); //Render the filterbox already
            handleFilterChange(); //Lets call that filter function right away

            $ovlLoading.remove();

            const $wrpModalInner = $$`<div class="ve-flex-col h-100">
				${$wrpForm}
				${$wrpList}
				<div class="ve-flex-vh-center">${$btnConfirm}</div>
			</div>`.appendTo($modalInner);

            this._filterCache = {
                $wrpModalInner,
                $btnConfirm,
                pageFilter,
                list,
                allData,
                $iptSearch
            };
        }
    }

    /**Called when the filter changes */
    static handleFilterChange({pageFilter, list, allData}) {
        //Get the values from the filterbox
        const f = pageFilter.filterBox.getValues();
        if(!f.Source?._combineBlue){console.error("Combine blue is not set!");
        if(!pageFilter.filterBox._filters[0].__meta.combineBlue){
            console.error("Source filter does not have combineBlue!");
        }
    }

        list.filter(li=>{
            const cls = allData[li.data.ixClass];

            if (li.data.ixSubclass != null) {
                const sc = cls.subclasses[li.data.ixSubclass];
                if (!pageFilter.toDisplay(f, cls, [], null, )){return false;}

                return pageFilter.filterBox.toDisplay(f, sc.source, sc._fMisc, null, );
            }

            return pageFilter.toDisplay(f, cls, [], null);
        });
    }

    static _doListDeselectAll(list, {isSubclassItemsOnly=false}={}) {
        list.items.forEach(it=>{
            if (isSubclassItemsOnly && it.data.ixSubclass == null)
                return;

            if (it.data.tglSel)
                it.data.tglSel.classList.remove("active");
            it.ele.classList.remove("list-multi-selected");
        }
        );
    }

    _handleSelectClick({list, filterListItems, filterListItem, evt}) {
        evt.preventDefault();
        evt.stopPropagation();

        const isScLi = filterListItem.data.ixSubclass != null;

        if (this._isClassDisabled && this._ixPrevSelectedClass != null && isScLi) {
            if (!filterListItem.data.tglSel.classList.contains("active"))
                this.constructor._doListDeselectAll(list, {
                    isSubclassItemsOnly: true
                });
            filterListItem.data.tglSel.classList.toggle("active");
            filterListItem.ele.classList.toggle("list-multi-selected");
            return;
        }

        if (filterListItem.data.tglSel.classList.contains("active")) {
            this.constructor._doListDeselectAll(list);
            return;
        }

        this.constructor._doListDeselectAll(list);

        if (isScLi) {
            const classItem = filterListItems[0];
            classItem.data.tglSel.classList.add("active");
            classItem.ele.classList.add("list-multi-selected");
        }

        filterListItem.data.tglSel.classList.add("active");
        filterListItem.ele.classList.add("list-multi-selected");
    }

    async _pLoadAllData() {
        this._pLoadingAllData = this._pLoadingAllData || (async()=>{
            const [data,prerelease,brew] = await Promise.all([MiscUtil.copy(await DataUtil.class.loadRawJSON()),
                PrereleaseUtil.pGetBrewProcessed(), BrewUtil2.pGetBrewProcessed(), ]);

            this._pLoadAllData_mutAddPrereleaseBrew({
                data, brew: prerelease, brewUtil: PrereleaseUtil
            });
            this._pLoadAllData_mutAddPrereleaseBrew({
                data, brew: brew, brewUtil: BrewUtil2
            });

            this._allData = (await PageFilterClassesRaw.pPostLoad(data)).class;
        })();

        await this._pLoadingAllData;
        return this._allData;
    }

    _pLoadAllData_mutAddPrereleaseBrew({data, brew, brewUtil}) {
        const clsProps = brewUtil.getPageProps({
            page: UrlUtil.PG_CLASSES
        });

        if (!clsProps.includes("*")) {
            clsProps.forEach(prop=>data[prop] = [...(data[prop] || []), ...MiscUtil.copy(brew[prop] || [])]);
            return;
        }

        Object.entries(brew).filter(([,brewVal])=>brewVal instanceof Array).forEach(([prop,brewArr])=>data[prop] = [...(data[prop] || []), ...MiscUtil.copy(brewArr)]);
    }

    _getListItems(pageFilter, cls, clsI) {
        return [this._getListItems_getClassItem(pageFilter, cls, clsI), ...cls.subclasses.map((sc,scI)=>this._getListItems_getSubclassItem(pageFilter, cls, clsI, sc, scI)), ];
    }

    _getListItems_getClassItem(pageFilter, cls, clsI) {
        const eleLabel = document.createElement("label");
        eleLabel.className = `w-100 ve-flex lst--border veapp__list-row no-select lst__wrp-cells`;

        const source = Parser.sourceJsonToAbv(cls.source);

        eleLabel.innerHTML = `<div class="col-1 pl-0 ve-flex-vh-center"><div class="fltr-cls__tgl"></div></div>
		<div class="bold col-9 ${cls._versionBase_isVersion ? "italic" : ""}">${cls._versionBase_isVersion ? `<span class="px-3"></span>` : ""}${cls.name}</div>
		<div class="col-2 pr-0 ve-text-center ${Parser.sourceJsonToColor(cls.source)}" title="${Parser.sourceJsonToFull(cls.source)}" ${Parser.sourceJsonToStyle(cls.source)}>${source}</div>`;

        return new ListItem(clsI,eleLabel,`${cls.name} -- ${cls.source}`,{
            source: `${source} -- ${cls.name}`,
        },{
            ixClass: clsI,
            tglSel: eleLabel.firstElementChild.firstElementChild,
        },);
    }

    _getListItems_getSubclassItem(pageFilter, cls, clsI, sc, scI) {
        const eleLabel = document.createElement("label");
        eleLabel.className = `w-100 ve-flex lst--border veapp__list-row no-select lst__wrp-cells`;

        const source = Parser.sourceJsonToAbv(sc.source);

        eleLabel.innerHTML = `<div class="col-1 pl-0 ve-flex-vh-center"><div class="fltr-cls__tgl"></div></div>
		<div class="col-9 pl-1 ve-flex-v-center ${sc._versionBase_isVersion ? "italic" : ""}">${sc._versionBase_isVersion ? `<span class="px-3"></span>` : ""}<span class="mx-3">\u2014</span> ${sc.name}</div>
		<div class="col-2 pr-0 ve-text-center ${Parser.sourceJsonToColor(sc.source)}" title="${Parser.sourceJsonToFull(sc.source)}" ${Parser.sourceJsonToStyle(sc.source)}>${source}</div>`;

        return new ListItem(`${clsI}--${scI}`,eleLabel,`${cls.name} -- ${cls.source} -- ${sc.name} -- ${sc.source}`,{
            source: `${cls.source} -- ${cls.name} -- ${source} -- ${sc.name}`,
        },{
            ixClass: clsI,
            ixSubclass: scI,
            tglSel: eleLabel.firstElementChild.firstElementChild,
        },);
    }
}

class ModalFilterRaces extends ModalFilter {
    constructor(opts) {
        opts = opts || {};
        super({
            ...opts, //pass on allData to super
            modalTitle: `Race${opts.isRadio ? "" : "s"}`,
            pageFilter: new PageFilterRaces(), //Create a pass filter that handles only races
        });
    }

     /**
     * The PageFilter
     * @returns {PageFilterRaces}
     */
     get pageFilter() {return this._pageFilter;}

    _$getColumnHeaders() {
        const btnMeta = [{
            sort: "name",
            text: "Name",
            width: "4"
        }, {
            sort: "ability",
            text: "Ability",
            width: "4"
        }, {
            sort: "size",
            text: "Size",
            width: "2"
        }, {
            sort: "source",
            text: "Source",
            width: "1"
        }, ];
        return ModalFilter._$getFilterColumnHeaders(btnMeta);
    }

    async _pLoadAllData() {
        return [...await DataUtil.race.loadJSON(), ...((await DataUtil.race.loadPrerelease({
            isAddBaseRaces: false
        })).race || []), ...((await DataUtil.race.loadBrew({
            isAddBaseRaces: false
        })).race || []), ];
    }

    _getListItem(pageFilter, race, rI) {
        const eleRow = document.createElement("div");
        eleRow.className = "px-0 w-100 ve-flex-col no-shrink";

        const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_RACES](race);
        const ability = race.ability ? Renderer.getAbilityData(race.ability) : {
            asTextShort: "None"
        };
        const size = (race.size || [Parser.SZ_VARIES]).map(sz=>Parser.sizeAbvToFull(sz)).join("/");
        const source = Parser.sourceJsonToAbv(race.source);

        eleRow.innerHTML = `<div class="w-100 ve-flex-vh-center lst--border veapp__list-row no-select lst__wrp-cells">
			<div class="col-0-5 pl-0 ve-flex-vh-center">${this._isRadio ? `<input type="radio" name="radio" class="no-events">` : `<input type="checkbox" class="no-events">`}</div>

			<div class="col-0-5 px-1 ve-flex-vh-center">
				<div class="ui-list__btn-inline px-2" title="Toggle Preview (SHIFT to Toggle Info Preview)">[+]</div>
			</div>

			<div class="col-4 ${race._versionBase_isVersion ? "italic" : ""} ${this._getNameStyle()}">${race._versionBase_isVersion ? `<span class="px-3"></span>` : ""}${race.name}</div>
			<div class="col-4">${ability.asTextShort}</div>
			<div class="col-2 ve-text-center">${size}</div>
			<div class="col-1 pr-0 ve-text-center ${Parser.sourceJsonToColor(race.source)}" title="${Parser.sourceJsonToFull(race.source)}" ${Parser.sourceJsonToStyle(race.source)}>${source}</div>
		</div>`;

        const btnShowHidePreview = eleRow.firstElementChild.children[1].firstElementChild;

        const listItem = new ListItem(rI,eleRow,race.name,{
            hash,
            source,
            sourceJson: race.source,
            ability: ability.asTextShort,
            size,
            cleanName: PageFilterRaces.getInvertedName(race.name) || "",
            alias: PageFilterRaces.getListAliases(race),
        },{
            cbSel: eleRow.firstElementChild.firstElementChild.firstElementChild,
            btnShowHidePreview,
        },);

        ListUiUtil.bindPreviewButton(UrlUtil.PG_RACES, this._allData, listItem, btnShowHidePreview);

        return listItem;
    }
}
class ModalFilterBackgrounds extends ModalFilter {
    constructor(opts) {
        opts = opts || {};
        super({
            ...opts,
            modalTitle: `Background${opts.isRadio ? "" : "s"}`,
            pageFilter: new PageFilterBackgrounds$1(),
        });
    }

    _$getColumnHeaders() {
        const btnMeta = [{
            sort: "name",
            text: "Name",
            width: "4"
        }, {
            sort: "skills",
            text: "Skills",
            width: "6"
        }, {
            sort: "source",
            text: "Source",
            width: "1"
        }, ];
        return ModalFilter._$getFilterColumnHeaders(btnMeta);
    }

    async _pLoadAllData() {
        return [...(await DataUtil.loadJSON(`${Renderer.get().baseUrl}data/backgrounds.json`)).background, ...((await PrereleaseUtil.pGetBrewProcessed()).background || []), ...((await BrewUtil2.pGetBrewProcessed()).background || []), ];
    }

    _getListItem(pageFilter, bg, bgI) {
        const eleRow = document.createElement("div");
        eleRow.className = "px-0 w-100 ve-flex-col no-shrink";

        const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_BACKGROUNDS](bg);
        const source = Parser.sourceJsonToAbv(bg.source);

        eleRow.innerHTML = `<div class="w-100 ve-flex-vh-center lst--border veapp__list-row no-select lst__wrp-cells">
			<div class="col-0-5 pl-0 ve-flex-vh-center">${this._isRadio ? `<input type="radio" name="radio" class="no-events">` : `<input type="checkbox" class="no-events">`}</div>

			<div class="col-0-5 px-1 ve-flex-vh-center">
				<div class="ui-list__btn-inline px-2" title="Toggle Preview (SHIFT to Toggle Info Preview)">[+]</div>
			</div>

			<div class="col-4 ${bg._versionBase_isVersion ? "italic" : ""} ${this._getNameStyle()}">${bg._versionBase_isVersion ? `<span class="px-3"></span>` : ""}${bg.name}</div>
			<div class="col-6">${bg._skillDisplay}</div>
			<div class="col-1 pr-0 ve-text-center ${Parser.sourceJsonToColor(bg.source)}" title="${Parser.sourceJsonToFull(bg.source)}" ${Parser.sourceJsonToStyle(bg.source)}>${source}</div>
		</div>`;

        const btnShowHidePreview = eleRow.firstElementChild.children[1].firstElementChild;

        const listItem = new ListItem(bgI,eleRow,bg.name,{
            hash,
            source,
            sourceJson: bg.source,
            skills: bg._skillDisplay,
        },{
            cbSel: eleRow.firstElementChild.firstElementChild.firstElementChild,
            btnShowHidePreview,
        },);

        ListUiUtil.bindPreviewButton(UrlUtil.PG_BACKGROUNDS, this._allData, listItem, btnShowHidePreview);

        return listItem;
    }
}
class ModalFilterFeats extends ModalFilter {
    constructor(opts) {
        opts = opts || {};
        super({
            ...opts,
            modalTitle: `Feat${opts.isRadio ? "" : "s"}`,
            pageFilter: new PageFilterFeats$1(),
        });
    }

    _$getColumnHeaders() {
        const btnMeta = [{
            sort: "name",
            text: "Name",
            width: "4"
        }, {
            sort: "ability",
            text: "Ability",
            width: "3"
        }, {
            sort: "prerequisite",
            text: "Prerequisite",
            width: "3"
        }, {
            sort: "source",
            text: "Source",
            width: "1"
        }, ];
        return ModalFilter._$getFilterColumnHeaders(btnMeta);
    }

    async _pLoadAllData() {
        return [...(await DataUtil.loadJSON(`${Renderer.get().baseUrl}data/feats.json`)).feat, ...((await PrereleaseUtil.pGetBrewProcessed()).feat || []), ...((await BrewUtil2.pGetBrewProcessed()).feat || []), ];
    }

    _getListItem(pageFilter, feat, ftI) {
        const eleRow = document.createElement("div");
        eleRow.className = "px-0 w-100 ve-flex-col no-shrink";

        const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_FEATS](feat);
        const source = Parser.sourceJsonToAbv(feat.source);

        eleRow.innerHTML = `<div class="w-100 ve-flex-vh-center lst--border veapp__list-row no-select lst__wrp-cells">
			<div class="col-0-5 pl-0 ve-flex-vh-center">${this._isRadio ? `<input type="radio" name="radio" class="no-events">` : `<input type="checkbox" class="no-events">`}</div>

			<div class="col-0-5 px-1 ve-flex-vh-center">
				<div class="ui-list__btn-inline px-2" title="Toggle Preview (SHIFT to Toggle Info Preview)">[+]</div>
			</div>

			<div class="col-4 ${feat._versionBase_isVersion ? "italic" : ""} ${this._getNameStyle()}">${feat._versionBase_isVersion ? `<span class="px-3"></span>` : ""}${feat.name}</div>
			<span class="col-3 ${feat._slAbility === VeCt.STR_NONE ? "italic" : ""}">${feat._slAbility}</span>
				<span class="col-3 ${feat._slPrereq === VeCt.STR_NONE ? "italic" : ""}">${feat._slPrereq}</span>
			<div class="col-1 pr-0 ve-text-center ${Parser.sourceJsonToColor(feat.source)}" title="${Parser.sourceJsonToFull(feat.source)}" ${Parser.sourceJsonToStyle(feat.source)}>${source}</div>
		</div>`;

        const btnShowHidePreview = eleRow.firstElementChild.children[1].firstElementChild;

        const listItem = new ListItem(ftI,eleRow,feat.name,{
            hash,
            source,
            sourceJson: feat.source,
            ability: feat._slAbility,
            prerequisite: feat._slPrereq,
        },{
            cbSel: eleRow.firstElementChild.firstElementChild.firstElementChild,
            btnShowHidePreview,
        },);

        ListUiUtil.bindPreviewButton(UrlUtil.PG_FEATS, this._allData, listItem, btnShowHidePreview);

        return listItem;
    }
}
class ModalFilterItems extends ModalFilter {
    constructor(opts) {
        opts = opts || {};
        super({
            ...opts,
            modalTitle: `Item${opts.isRadio ? "" : "s"}`,
            pageFilter: new PageFilterItems$1(opts?.pageFilterOpts),
        });
    }

    _$getColumnHeaders() {
        const btnMeta = [{
            sort: "name",
            text: "Name",
            width: "4"
        }, {
            sort: "type",
            text: "Type",
            width: "6"
        }, {
            sort: "source",
            text: "Source",
            width: "1"
        }, ];
        return ModalFilter._$getFilterColumnHeaders(btnMeta);
    }

    async _pInit() {
        await Renderer.item.pPopulatePropertyAndTypeReference();
    }

    async _pLoadAllData() {
        return [...(await Renderer.item.pBuildList()), ...(await Renderer.item.pGetItemsFromPrerelease()), ...(await Renderer.item.pGetItemsFromBrew()), ];
    }

    _getListItem(pageFilter, item, itI) {
        if (item.noDisplay)
            return null;

        Renderer.item.enhanceItem(item);
        pageFilter.mutateAndAddToFilters(item);

        const eleRow = document.createElement("div");
        eleRow.className = "px-0 w-100 ve-flex-col no-shrink";

        const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS](item);
        const source = Parser.sourceJsonToAbv(item.source);
        const type = item._typeListText.join(", ");

        eleRow.innerHTML = `<div class="w-100 ve-flex-vh-center lst--border veapp__list-row no-select lst__wrp-cells">
			<div class="col-0-5 pl-0 ve-flex-vh-center">${this._isRadio ? `<input type="radio" name="radio" class="no-events">` : `<input type="checkbox" class="no-events">`}</div>

			<div class="col-0-5 px-1 ve-flex-vh-center">
				<div class="ui-list__btn-inline px-2" title="Toggle Preview (SHIFT to Toggle Info Preview)">[+]</div>
			</div>

			<div class="col-5 ${item._versionBase_isVersion ? "italic" : ""} ${this._getNameStyle()}">${item._versionBase_isVersion ? `<span class="px-3"></span>` : ""}${item.name}</div>
			<div class="col-5">${type.uppercaseFirst()}</div>
			<div class="col-1 ve-text-center ${Parser.sourceJsonToColor(item.source)} pr-0" title="${Parser.sourceJsonToFull(item.source)}" ${Parser.sourceJsonToStyle(item.source)}>${source}</div>
		</div>`;

        const btnShowHidePreview = eleRow.firstElementChild.children[1].firstElementChild;

        const listItem = new ListItem(itI,eleRow,item.name,{
            hash,
            source,
            sourceJson: item.source,
            type,
        },{
            cbSel: eleRow.firstElementChild.firstElementChild.firstElementChild,
            btnShowHidePreview,
        },);

        ListUiUtil.bindPreviewButton(UrlUtil.PG_ITEMS, this._allData, listItem, btnShowHidePreview);

        return listItem;
    }
}
class ModalFilterSpells extends ModalFilter {
    constructor(opts) {
        opts = opts || {};
        super({
            ...opts,
            modalTitle: `Spell${opts.isRadio ? "" : "s"}`,
            pageFilter: new PageFilterSpells(),
            fnSort: PageFilterSpells.sortSpells,
        });
    }

    _$getColumnHeaders() {
        const btnMeta = [{
            sort: "name",
            text: "Name",
            width: "3"
        }, {
            sort: "level",
            text: "Level",
            width: "1-5"
        }, {
            sort: "time",
            text: "Time",
            width: "2"
        }, {
            sort: "school",
            text: "School",
            width: "1"
        }, {
            sort: "concentration",
            text: "C.",
            title: "Concentration",
            width: "0-5"
        }, {
            sort: "range",
            text: "Range",
            width: "2"
        }, {
            sort: "source",
            text: "Source",
            width: "1"
        }, ];
        return ModalFilter._$getFilterColumnHeaders(btnMeta);
    }

    async _pInit() {
        if (typeof PrereleaseUtil !== "undefined")
            Renderer.spell.populatePrereleaseLookup(await PrereleaseUtil.pGetBrewProcessed());
        if (typeof BrewUtil2 !== "undefined")
            Renderer.spell.populateBrewLookup(await BrewUtil2.pGetBrewProcessed());
    }

    async _pLoadAllData() {
        return [...(await DataUtil.spell.pLoadAll()), ...((await PrereleaseUtil.pGetBrewProcessed()).spell || []), ...((await BrewUtil2.pGetBrewProcessed()).spell || []), ];
    }

    _getListItem(pageFilter, spell, spI) {
        const eleRow = document.createElement("div");
        eleRow.className = "px-0 w-100 ve-flex-col no-shrink";

        const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_SPELLS](spell);
        const source = Parser.sourceJsonToAbv(spell.source);
        const levelText = PageFilterSpells.getTblLevelStr(spell);
        const time = PageFilterSpells.getTblTimeStr(spell.time[0]);
        const school = Parser.spSchoolAndSubschoolsAbvsShort(spell.school, spell.subschools);
        const concentration = spell._isConc ? "×" : "";
        const range = Parser.spRangeToFull(spell.range);

        eleRow.innerHTML = `<div class="w-100 ve-flex-vh-center lst--border veapp__list-row no-select lst__wrp-cells">
			<div class="col-0-5 pl-0 ve-flex-vh-center">${this._isRadio ? `<input type="radio" name="radio" class="no-events">` : `<input type="checkbox" class="no-events">`}</div>

			<div class="col-0-5 px-1 ve-flex-vh-center">
				<div class="ui-list__btn-inline px-2" title="Toggle Preview (SHIFT to Toggle Info Preview)">[+]</div>
			</div>

			<div class="col-3 ${spell._versionBase_isVersion ? "italic" : ""} ${this._getNameStyle()}">${spell._versionBase_isVersion ? `<span class="px-3"></span>` : ""}${spell.name}</div>
			<div class="col-1-5 ve-text-center">${levelText}</div>
			<div class="col-2 ve-text-center">${time}</div>
			<div class="col-1 sp__school-${spell.school} ve-text-center" title="${Parser.spSchoolAndSubschoolsAbvsToFull(spell.school, spell.subschools)}" ${Parser.spSchoolAbvToStyle(spell.school)}>${school}</div>
			<div class="col-0-5 ve-text-center" title="Concentration">${concentration}</div>
			<div class="col-2 text-right">${range}</div>
			<div class="col-1 pr-0 ve-text-center ${Parser.sourceJsonToColor(spell.source)}" title="${Parser.sourceJsonToFull(spell.source)}" ${Parser.sourceJsonToStyle(spell.source)}>${source}</div>
		</div>`;

        const btnShowHidePreview = eleRow.firstElementChild.children[1].firstElementChild;

        const listItem = new ListItem(spI,eleRow,spell.name,{
            hash,
            source,
            sourceJson: spell.source,
            level: spell.level,
            time,
            school: Parser.spSchoolAbvToFull(spell.school),
            classes: Parser.spClassesToFull(spell, {isTextOnly: true}),
            concentration,
            normalisedTime: spell._normalisedTime,
            normalisedRange: spell._normalisedRange,
        },{
            cbSel: eleRow.firstElementChild.firstElementChild.firstElementChild,
            btnShowHidePreview,
        },);

        ListUiUtil.bindPreviewButton(UrlUtil.PG_SPELLS, this._allData, listItem, btnShowHidePreview);

        return listItem;
    }
}

class ModalFilterEquipment extends ModalFilter {
    static _$getFilterColumnHeaders(btnMeta) {
        return super._$getFilterColumnHeaders(btnMeta).map($btn=>$btn.addClass(`btn-5et`));
    }

    /**
     * @param {Charactermancer_StartingEquipment.ComponentGold} compStartingEquipment
     */
    constructor(compStartingEquipment) {
        super({
            pageFilter: new PageFilterEquipment(),
            namespace: "ImportListCharacter_modalFilterEquipment",
        });
        this._compParent = compStartingEquipment;
    }

    _$getColumnHeaders() {
        const btnMeta = [{
            sort: "name",
            text: "Name",
            width: "3-2"
        }, {
            sort: "type",
            text: "Type",
            width: "3-2"
        }, {
            sort: "cost",
            text: "Cost",
            width: "1-8"
        }, {
            sort: "source",
            text: "Source",
            width: "1-8"
        }, ];
        return this.constructor._$getFilterColumnHeaders(btnMeta);
    }

    async _pLoadAllData() {
        return [];
    }

    _$getWrpList() {
        return $(`<div class="veapp__list mb-1 h-100 min-h-0"></div>`);
    }

    _$getColumnHeaderPreviewAll(opts) {
        return super._$getColumnHeaderPreviewAll(opts).addClass(["btn-5et", "ve-muted"]);
    }

    _getListItem(pageFilter, item, itI) {
        if (item.noDisplay)
            return null;

        Renderer.item.enhanceItem(item);
        pageFilter.mutateAndAddToFilters(item);

        const eleRow = document.createElement("div");
        eleRow.className = "px-0 w-100 veapp__list-row ve-flex-col no-shrink";

        const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS](item);
        const source = Parser.sourceJsonToAbv(item.source);
        const type = item._typeListText.join(", ");


        
        const priceMult = Config.get("equipmentShop", "priceMultiplier") || 1.0;

        eleRow.innerHTML = `<div class="w-100 veapp__list-row-hoverable ve-flex-v-center">
			<div class="col-1 ve-flex-vh-center">
				<div class="ui-list__btn-inline" title="Toggle Preview (SHIFT to Toggle Info Preview)">${ListUiUtil.HTML_GLYPHICON_EXPAND}</div>
			</div>

			<span class="col-3-2">${item.name}</span>
			<span class="col-3-2">${item._typeListText.join(", ").toTitleCase()}</span>
			<span class="col-1-8 text-right px-1">${Parser.itemValueToFullMultiCurrency(item, {
            isShortForm: true,
            multiplier: priceMult
        }).replace(/ +/g, "\u00A0")}</span>
			<span class="col-1-8 ve-text-center ${Parser.sourceJsonToColor(item.source)} pr-0" title="${Parser.sourceJsonToFull(item.source)}" ${Parser.sourceJsonToStyle(item.source)}>${source}</span>
			<div class="col-1 ve-flex-vh-center"><button class="btn btn-xxs ve-btn-default btn-5et" title="Add (SHIFT to add 5; CTRL to ignore price)"><span class="glyphicon glyphicon-arrow-right"></span></button></div>
		</div>`;

        const btnShowHidePreview = eleRow.firstElementChild.firstElementChild.firstElementChild;
        btnShowHidePreview.addEventListener("click", evt=>{
            evt.stopPropagation();
            evt.preventDefault();

            const elePreviewWrp = ListUiUtil.getOrAddListItemPreviewLazy(listItem);

            ListUiUtil.handleClickBtnShowHideListPreview(evt, UrlUtil.PG_ITEMS, item, btnShowHidePreview, elePreviewWrp, );
        }
        );

        const listItem = new ListItem(itI, eleRow, item.name,{
            hash,
            source,
            sourceJson: item.source,
            cost: (item.value || 0) * priceMult,
            type,
        },{
            btnSendToRight: eleRow.firstElementChild.lastElementChild.lastElementChild,
            btnShowHidePreview,
        },);

        return listItem;
    }

    /**
     * Add items from allData to the graphical list of purchaseble items
     * @param {any} allData
     */
    setDataList(allData) {
        //Remove all items from the list first
        this._list.removeAllItems();

        this._allData = (allData?.item || []).filter(it=>it.value != null && it.type !== "$");

        //Then add items back to the list
        this._allData.forEach((it,i)=>{
            this._pageFilter.mutateAndAddToFilters(it);
            const filterListItem = this._getListItem(this._pageFilter, it, i);
            this._list.addItem(filterListItem);
            
            //Add an event listener to the button for sending the item right to cart
            filterListItem.data.btnSendToRight.addEventListener("click", evt=>{
                const isIgnoreCost = evt.ctrlKey;
                let itemUid = `${it.name}|${it.source}`;
                //Set quantity to 5 if pressing shift
                if (evt.shiftKey) { this._compParent.addBoughtItem(itemUid, { quantity: 5, isIgnoreCost });}
                else { this._compParent.addBoughtItem(itemUid, { isIgnoreCost });}
            });
        });

        this._pageFilter.sourceFilter.setFromValues({ "Source": {} });

        this._pageFilter.filterBox.render();
        this._list.update();
    }
};

class MixedModalFilterFvtt //extends Cls
{
    constructor(...args) {
        //super(...args);

        this._prevApp = null;
    }

    _getNameStyle() {
        return "";
    }

    _getShowModal(resolve) {
        if (this._prevApp)
            this._prevApp.close();

        const self = this;

        const app = new class TempApplication extends Application {
            constructor() {
                super({
                    title: `Filter/Search for ${self._modalTitle}`,
                    template: `${SharedConsts.MODULE_LOCATION}/template/_Generic.hbs`,
                    width: Util.getMaxWindowWidth(900),
                    height: Util.getMaxWindowHeight(),
                    resizable: true,
                });

                this._$wrpHtmlInner = $(`<div class="ve-flex-col w-100 h-100"></div>`);
            }

            get $modalInner() {
                return this._$wrpHtmlInner;
            }

            async close(...args) {
                self._filterCache.$wrpModalInner.detach();
                await super.close(...args);
                resolve([]);
            }

            activateListeners($html) {
                this._$wrpHtmlInner.appendTo($html);
            }
        }
        ();

        app.render(true);
        this._prevApp = app;

        return {
            $modalInner: app.$modalInner,
            doClose: app.close.bind(app)
        };
    }

    getDataFromSelected(selected) {
        return this._allData[selected.ix];
    }
}
//Cls is an input class we choose to extend
function MixinModalFilterFvtt(Cls) {
    class MixedModalFilterFvtt extends Cls {
        constructor(...args) {
            super(...args);

            this._prevApp = null;
        }

        _getNameStyle() {return "";}

        _getShowModal(resolve) {
            if (this._prevApp)
                this._prevApp.close();

            const self = this;

            const app = new class TempApplication extends Application {
                constructor() {
                    super({
                        title: `Filter/Search for ${self._modalTitle}`,
                        template: `${SharedConsts.MODULE_LOCATION}/template/_Generic.hbs`,
                        width: Util.getMaxWindowWidth(900),
                        height: Util.getMaxWindowHeight(),
                        resizable: true,
                    });

                    this._$wrpHtmlInner = $(`<div class="ve-flex-col w-100 h-100"></div>`);
                }

                get $modalInner() { return this._$wrpHtmlInner; }

                async close(...args) {
                    self._filterCache.$wrpModalInner.detach();
                    await super.close(...args);
                    resolve([]);
                }

                activateListeners($html) {
                    this._$wrpHtmlInner.appendTo($html);
                }
            }
            ();

            app.render(true);
            this._prevApp = app;

            return {
                $modalInner: app.$modalInner,
                doClose: app.close.bind(app)
            };
        }

        getDataFromSelected(selected) { return this._allData[selected.ix]; }
    }
    return MixedModalFilterFvtt;
}
class ModalFilterBackgroundsFvtt extends MixinModalFilterFvtt(ModalFilterBackgrounds) {
}

class ModalFilterClassesFvtt extends MixinModalFilterFvtt(ModalFilterClasses) {
}

class ModalFilterFeatsFvtt extends MixinModalFilterFvtt(ModalFilterFeats) {
}

class ModalFilterRacesFvtt extends MixinModalFilterFvtt(ModalFilterRaces) {
}

class ModalFilterSpellsFvtt extends MixinModalFilterFvtt(ModalFilterSpells) {
}

class ModalFilterItemsFvtt extends MixinModalFilterFvtt(ModalFilterItems) {
}
//#endregion
//#endregion

class AppFilter {
    constructor() {
        this._filterBox = null;
    }

    get filterBox() {
        return this._filterBox;
    }

    mutateAndAddToFilters(entity, isExcluded, opts) {
        this.constructor.mutateForFilters(entity, opts);
        this.addToFilters(entity, isExcluded, opts);
    }

    static mutateForFilters(entity, opts) {
        throw new Error("Unimplemented!");
    }
    addToFilters(entity, isExcluded, opts) {
        throw new Error("Unimplemented!");
    }
    toDisplay(values, entity) {
        throw new Error("Unimplemented!");
    }
    async _pPopulateBoxOptions() {
        throw new Error("Unimplemented!");
    }

    async pInitFilterBox(opts) {
        opts = opts || {};
        await this._pPopulateBoxOptions(opts);
        this._filterBox = new FilterBox(opts);
        await this._filterBox.pDoLoadState();
        return this._filterBox;
    }

    trimState() {
        return this._filterBox.trimState_();
    }

    teardown() {
        this._filterBox.teardown();
    }
}
class AppSourceSelectorAppFilter extends AppFilter {
    static _sortTypeFilterItems(a, b) {
        a = a.item;
        b = b.item;

        const ixA = UtilDataSource.SOURCE_TYPE_ORDER__FILTER.indexOf(a);
        const ixB = UtilDataSource.SOURCE_TYPE_ORDER__FILTER.indexOf(b);

        return SortUtil.ascSort(ixA, ixB);
    }

    constructor() {
        super();

        this._typeFilter = new Filter({
            header: "Type",
            itemSortFn: AppSourceSelectorAppFilter._sortTypeFilterItems,
        });
    }

    static mutateForFilters() {}

    addToFilters(entity, isExcluded) {
        if (isExcluded){return;}

        this._typeFilter.addItem(entity.filterTypes);
    }

    async _pPopulateBoxOptions(opts) {
        opts.filters = [this._typeFilter, ];
    }

    toDisplay(values, ent) {
        return this._filterBox.toDisplay(values, ent.filterTypes, );
    }
}

class FilterUtil {
    static SUB_HASH_PREFIX_LENGTH = 4;
    static SUB_HASH_PREFIXES = new Set([...Object.values(FilterBox._SUB_HASH_PREFIXES), ...Object.values(FilterBase._SUB_HASH_PREFIXES)]);
}
class FilterTransientOptions {
    constructor(opts) {
        this.isExtendDefaultState = opts.isExtendDefaultState;
    }
}
class PageFilterSourcesRaw extends AppSourceSelectorAppFilter {
    _getToDisplayParams(values, cls) {
        return cls.name;//this.isAnySubclassDisplayed(values, cls) ? cls._fSourceSubclass : (cls._fSources ?? cls.source), cls._fMisc, null, ];
    }
}
class AppSourceSelectorMulti extends ModalFilter {
    /**
     * @param {{title:string, sourcesToDisplay:any[], preEnabledSources:[], preEnabledCustomUrls:[], savedSelectionKey:string, filterNamespace:string, isRadio:boolean}} opts
     * @returns {any}
     */
    constructor(opts) {
        super({
            modalTitle: opts.title || "Select Sources",
        });

        this._sourcesToDisplay = opts.sourcesToDisplay;
        this._savedSelectionKey = opts.savedSelectionKey;
        this._preEnabledSources = opts.preEnabledSources;
        this._filterNamespace = opts.filterNamespace;
        this._props = opts.props;
        this._isRadio = !!opts.isRadio;

        this._list = null;
        this._pageFilter = null;

        this._$stgNone = null;
        this._$stgUpload = null;
        this._$stgUrl = null;
        this._$stgSpecial = null;

        //Create a new component, and set the __state with these entries
        this._comp = BaseComponent.fromObject({
            uploadedFileMetas: [],
            isShowCustomUrlForm: false,
            urlMetas: [],
            specialMetas: [],
        });

        //Add custom urls to the metas
        let customUrlMetas = [];
        if(opts.preEnabledCustomUrls){
            for(let url of opts.preEnabledCustomUrls){
                let nxt = {
                    id: CryptUtil.uid(),
                    data: {
                        displayName: "Custom Url",
                        isCustom: true,
                        url: url,
                    },
                };
                customUrlMetas.push(nxt);
            }
        }
        this._comp._state.urlMetas = [...this._comp._state.urlMetas, ...customUrlMetas, ];

        this._isDedupable = !!opts.isDedupable;
        this._page = opts.page;
        this._fnGetDedupedData = opts.fnGetDedupedData;
        this._fnGetBlocklistFilteredData = opts.fnGetBlocklistFilteredData;

        this._resolve = null;
        this._reject = null;
        this._pUserInput = null;
    }

    get pageFilter() { return this._pageFilter; }
    get uploadedFileMetas() { return this._comp._state.uploadedFileMetas.map(it=>it.data); }
    pGetSelectedSources() {
        if (!this._list) {return this._pGetInitialSources();}
        return this._list.items.filter(it=>it.data.cbSel.checked).map(li=>this._sourcesToDisplay[li.ix]);
    }

    async pGetElements($wrpList, cbSourceChange) { return this._pGetElements_pGetListElements($wrpList, cbSourceChange); }

    _$getStageNone() {
        return $(`<div class="ve-flex-col mb-1 w-100">
			<div class="ve-flex-v-center"><i>Select a source to view import options</i></div>
			<hr class="hr-1">
		</div>`);
    }

    _$getStageUpload() {
        const $btnAddUpload = $(`<button class="btn btn-5et btn-default btn-xs">Add File</button>`).click(()=>{
            const nxt = {
                id: CryptUtil.uid(),
                data: {
                    name: null,
                    contents: null,
                },
            };
            this._comp._state.uploadedFileMetas = [...this._comp._state.uploadedFileMetas, nxt];

            const renderedCollection = this._comp._getRenderedCollection({
                prop: "uploadedFileMetas"
            });
            const renderedMeta = renderedCollection[nxt.id];
            renderedMeta.$btnUpload.click();
        }
        );

        const $wrpUploadRows = $(`<div class="ve-flex-col w-100"></div>`);

        const $stgUpload = $$`<div class="ve-flex-col w-100 py-1">
			<div class="mb-1 split-v-center">
				<div>File Sources:</div>
				${$btnAddUpload}
			</div>
			${$wrpUploadRows}
			<hr class="hr-1">
		</div>`;

        const hkUploadFileMetas = ()=>{
            this._comp._renderCollection({
                prop: "uploadedFileMetas",
                fnUpdateExisting: (renderedMeta,uploadFileMeta)=>{
                    renderedMeta.comp._proxyAssignSimple("state", uploadFileMeta.data, true);
                    if (!renderedMeta.$wrpRow.parent().is($wrpUploadRows))
                        renderedMeta.$wrpRow.appendTo($wrpUploadRows);
                }
                ,
                fnGetNew: uploadFileMeta=>{
                    const comp = BaseComponent.fromObject(uploadFileMeta.data, "*");
                    comp._addHookAll("state", ()=>{
                        uploadFileMeta.data = comp.toObject("*");
                        this._comp._triggerCollectionUpdate("uploadedFileMetas");
                    }
                    );

                    const $dispName = $(`<div class="imp__disp-filename mr-1 ve-muted w-100"></div>`).click(()=>$btnUpload.click());
                    const hkName = ()=>$dispName.text(comp._state.name || "Select file...").title(comp._state.name || "");
                    comp._addHookBase("name", hkName);
                    hkName();

                    const $btnUpload = $(`<button class="btn btn-5et btn-xs mr-1">Upload File</button>`).click(()=>{
                        const $ipt = $(`<input type="file" accept=".json" class="ve-hidden">`).change(evt=>{
                            const input = evt.target;
                            const files = $ipt[0].files;

                            const reader = new FileReader();
                            reader.onload = async()=>{
                                const file = (files[0] || {});

                                try {
                                    const json = JSON.parse(reader.result);
                                    comp._proxyAssignSimple("state", {
                                        name: file.name,
                                        contents: json
                                    });
                                } catch (e) {
                                    ui.notifications.error(`Failed to read file! ${VeCt.STR_SEE_CONSOLE}`);
                                    throw e;
                                }
                            }
                            ;
                            reader.readAsText(input.files[0]);
                        }
                        ).click();
                    }
                    );

                    const $btnDelete = $(`<button class="btn btn-5et btn-xs btn-danger" title="Delete"><span class="glyphicon glyphicon-trash"></span></button>`)
                    .click(()=>this._comp._state.uploadedFileMetas = this._comp._state.uploadedFileMetas.filter(it=>it !== uploadFileMeta));

                    const $wrpRow = $$`<div class="ve-flex-v-center my-1 w-100">
						${$btnUpload}${$dispName}${$btnDelete}
					</div>`.appendTo($wrpUploadRows);

                    return {
                        comp,
                        $wrpRow,
                        $btnUpload,
                    };
                }
                ,
            });
        }
        ;
        hkUploadFileMetas();
        this._comp._addHookBase("uploadedFileMetas", hkUploadFileMetas);

        return $stgUpload;
    }

    _$getStageUrl() {
        const $btnAddUrl = $(`<button class="btn btn-5et btn-default btn-xs">Add Custom</button>`).click(()=>{
            //Create ui input field for typing custom url into
            const nxt = {
                id: CryptUtil.uid(),
                data: {
                    displayName: "Custom Url",
                    isCustom: true,
                    url: null,
                },
            };

            //Add it to the metas of _comp (who will auto render them later)
            this._comp._state.urlMetas = [...this._comp._state.urlMetas, nxt, ];

            //Get the url field just so we can focus it
            const renderedCollection = this._comp._getRenderedCollection({
                prop: "urlMetas"
            });
            const renderedMeta = renderedCollection[nxt.id];
            renderedMeta.$iptUrl.focus();
        }
        );
        const hkIsCustomUrls = ()=>$btnAddUrl.toggleVe(this._comp._state.isShowCustomUrlForm);
        this._comp._addHookBase("isShowCustomUrlForm", hkIsCustomUrls);
        hkIsCustomUrls();

        const $wrpUrlRows = $(`<div class="ve-flex-col w-100"></div>`);

        const $stgUrl = $$`<div class="ve-flex-col w-100 py-1">
			<div class="mb-1 split-v-center">
				<div>URL Sources:</div>
				${$btnAddUrl}
			</div>
			${$wrpUrlRows}
			<hr class="hr-1">
		</div>`;

        const hkUrlMetas = ()=>{
            this._comp._renderCollection({
                prop: "urlMetas",
                fnUpdateExisting: (renderedMeta,urlMeta)=>{
                    renderedMeta.comp._proxyAssignSimple("state", urlMeta.data, true);
                    if (!renderedMeta.$wrpRow.parent().is($wrpUrlRows))
                        renderedMeta.$wrpRow.appendTo($wrpUrlRows);
                }
                ,
                fnGetNew: urlMeta=>{
                    const comp = BaseComponent.fromObject(urlMeta.data, "*");
                    comp._addHookAll("state", ()=>{
                        urlMeta.data = comp.toObject("*");
                        this._comp._triggerCollectionUpdate("urlMetas");
                    }
                    );

                    const $iptUrl = ComponentUiUtil.$getIptStr(comp, "url");
                    if (Config.get("ui", "isStreamerMode"))
                        $iptUrl.addClass("text-sneaky");
                    const hkDisplayNameUrl = ()=>{
                        if (comp._state.isCustom) {
                            $iptUrl.title("Enter JSON URL").placeholder("Enter JSON URL").val(comp._state.url);
                        } else {
                            $iptUrl.title("JSON URL").val(comp._state.displayName).disable();
                        }
                    }
                    ;
                    this._comp._addHookBase("url", hkDisplayNameUrl);
                    this._comp._addHookBase("displayName", hkDisplayNameUrl);
                    hkDisplayNameUrl();

                    const $btnDelete = !comp._state.isCustom ? null : $(`<button class="btn btn-5et btn-xs btn-danger ml-2" title="Delete"><span class="glyphicon glyphicon-trash"></span></button>`)
                    .click(()=>this._comp._state.urlMetas = this._comp._state.urlMetas.filter(it=>it !== urlMeta));

                    const $wrpRow = $$`<div class="ve-flex-v-center my-1 w-100">
						${$iptUrl}${$btnDelete}
					</div>`.appendTo($wrpUrlRows);

                    return {
                        comp,
                        $wrpRow,
                        $iptUrl,
                    };
                }
                ,
            });
        }
        ;
        hkUrlMetas();
        this._comp._addHookBase("urlMetas", hkUrlMetas);

        return $stgUrl;
    }

    _$getStageSpecial() {
        const $wrpSpecialRows = $(`<div class="ve-flex-col w-100"></div>`);

        const $stgSpecial = $$`<div class="ve-flex-col w-100 py-1">
			<div class="mb-1 ve-flex-v-center">
				<div>Pre-Compiled Sources:</div>
			</div>
			${$wrpSpecialRows}
			<hr class="hr-1">
		</div>`;

        const hkSpecialMetas = ()=>{
            this._comp._renderCollection({
                prop: "specialMetas",
                fnUpdateExisting: (renderedMeta,specialMeta)=>{
                    renderedMeta.comp._proxyAssignSimple("state", specialMeta.data, true);
                    if (!renderedMeta.$wrpRow.parent().is($wrpSpecialRows))
                        renderedMeta.$wrpRow.appendTo($wrpSpecialRows);
                }
                ,
                fnGetNew: specialMetas=>{
                    const comp = BaseComponent.fromObject(specialMetas.data, "*");
                    comp._addHookAll("state", ()=>{
                        specialMetas.data = comp.toObject("*");
                        this._comp._triggerCollectionUpdate("urlMetas");
                    }
                    );

                    const $dispName = $(`<div class="w-100 italic ${Config.get("ui", "isStreamerMode") ? "text-sneaky" : ""}"></div>`);
                    const hkDisplayName = ()=>$dispName.text(comp._state.displayName);
                    this._comp._addHookBase("displayName", hkDisplayName);
                    hkDisplayName();

                    const $wrpRow = $$`<div class="ve-flex-v-center my-1 w-100">${$dispName}</div>`.appendTo($wrpSpecialRows);

                    return {
                        comp,
                        $wrpRow,
                    };
                }
                ,
            });
        }
        ;
        hkSpecialMetas();
        this._comp._addHookBase("specialMetas", hkSpecialMetas);

        return $stgSpecial;
    }

    async _pGetInitialSources() {
        
        const initialSourceIds = await this._pGetInitialSourceIds();
        const initialSources = this._sourcesToDisplay.filter(it=>initialSourceIds.has(it.identifier));
        if (!initialSources.length)
            initialSources.push(...this._sourcesToDisplay.filter(it=>it.isDefault));
        return initialSources;
    }

    async _pGetInitialSourceIds() {
        if (this.isForceSelectAllSources()) {
            return new Set(this._sourcesToDisplay.map(it=>it.identifier));
        }
        
        //return new Set((await StorageUtil.pGet(this._savedSelectionKey)) || []);

        let s = new Set();
        for(let srcId of this._preEnabledSources){
            s.add(srcId.identifier);
        }
        return s;
    }

    isForceSelectAllSources() {
        if (this._isRadio){return false;}
        if(!SETTINGS.USE_FVTT){return false;}
        if (game.user.isGM){return Config.get("dataSources", "isGmForceSelectAllowedSources");}
        return Config.get("dataSources", "isPlayerForceSelectAllowedSources");
    }

    static $getFilterListElements({isRadio=false, isForceSelectAll=false}={}) {
        const $btnOpenFilter = $(`<button class="btn-5et veapp__btn-filter">Filter</button>`);
        const $btnToggleSummaryHidden = $(`<button class="btn btn-5et" title="Toggle Filter Summary Display"><span class="glyphicon glyphicon-resize-small"></span></button>`);
        const $iptSearch = $(`<input type="search" class="search w-100 form-control h-initial" placeholder="Find source...">`);
        const $btnReset = $(`<button class="btn-5et veapp__btn-list-reset">Reset</button>`).click(()=>$iptSearch.val(""));
        const $wrpMiniPills = $(`<div class="fltr__mini-view btn-group"></div>`);

        const isHideCbAll = isRadio || isForceSelectAll;

        const $cbAll = isHideCbAll ? null : $(`<input type="checkbox" class="no-events">`);
        const $lblCbAll = $$`<label class="btn btn-5et btn-xs col-0-5 ve-flex-vh-center" ${isHideCbAll ? "disabled" : ""}>${$cbAll}</label>`;

        const $wrpBtnsSort = $$`<div class="ve-flex-v-stretch input-group input-group--bottom mb-1 no-shrink">
			${$lblCbAll}
			<button class="btn-5et btn-xs col-11-5 sort" data-sort="name">Name</button>
		</div>`;
        const $list = $(`<div class="veapp__list mb-1 h-100 min-h-0"></div>`);

        const $wrpFilterControls = $$`<div class="ve-flex-v-stretch input-group input-group--top no-shrink">
			${$btnOpenFilter}
			${$btnToggleSummaryHidden}
			${$iptSearch}
			${$btnReset}
		</div>`;

        return {
            $cbAll,
            $wrpFilterControls,
            $wrpMiniPills,
            $wrpBtnsSort,
            $list,
            $btnOpenFilter,
            $iptSearch,
            $btnReset,
            $btnToggleSummaryHidden,
        };
    }

    static getListItem({pageFilter, isRadio, list, listSelectClickHandler, src, srcI, fnOnClick, initialSources, isSelected, isForceSelectAll, }, ) {
        isSelected = isSelected === undefined && initialSources ? initialSources.includes(src) : !!isSelected;

        pageFilter.mutateAndAddToFilters(src);

        const eleCb = e_({
            outer: isRadio ? `<input type="radio" name="radio" class="no-events mx-1">` : `<input type="checkbox" class="no-events mx-1">`,
        });
        if (isSelected)
            eleCb.checked = true;
        if (isForceSelectAll)
            eleCb.setAttribute("disabled", true);

        const eleWrpCb = e_({
            tag: "span",
            clazz: "col-0-5 ve-flex-vh-center",
            children: [eleCb, ],
        });

        const eleLi = e_({
            tag: "label",
            clazz: `row imp-wiz__row veapp__list-row-hoverable ve-flex-v-center ${isSelected ? "list-multi-selected" : ""}`,
            children: [eleWrpCb, e_({
                tag: "span",
                clazz: "col-11-5",
                html: `${this._getFilterTypesIcon(src.filterTypes)}${src.name}`,
            }), ],
        });

        const listItem = new ListItem(srcI,eleLi,src.name,{
            filterTypes: src.filterTypes,
            abbreviations: src.abbreviations || [],
        },{
            identifierWorld: src.identifierWorld,
            cbSel: eleCb,
        },);

        if (!isForceSelectAll) {
            eleLi.addEventListener("click", evt=>{
                if (isRadio)
                    listSelectClickHandler.handleSelectClickRadio(listItem, evt);
                else
                    listSelectClickHandler.handleSelectClick(listItem, evt);
                if (fnOnClick)
                    fnOnClick({
                        list,
                        listItem
                    });
            }
            );
        }

        return listItem;
    }

    async _pGetElements_pGetListElements($wrpList, cbSourceChange=null) {
        this._$stgNone = this._$getStageNone();
        this._$stgUpload = this._$getStageUpload();
        this._$stgUrl = this._$getStageUrl();
        this._$stgSpecial = this._$getStageSpecial();

        const initialSources = await this._pGetInitialSources();

        const setSources = ({isSkipSave}={})=>{
            const selSources = this._list.items.filter(it=>it.data.cbSel.checked).map(li=>this._sourcesToDisplay[li.ix]);

            const selSourceIdentifiers = selSources.map(source=>source.identifier);
            if (!isSkipSave)
                StorageUtil.pSet(this._savedSelectionKey, selSourceIdentifiers);

            const isShowStageUpload = selSources.some(it=>it.isFile);
            const isShowStageUrl = selSources.some(it=>it.url != null);
            const isShowStageSpecial = selSources.some(it=>it.url == null && !it.isFile);

            this._$stgNone.toggleVe(!isShowStageUpload && !isShowStageUrl && !isShowStageSpecial);
            this._$stgUpload.toggleVe(isShowStageUpload);
            this._$stgUrl.toggleVe(isShowStageUrl);
            this._$stgSpecial.toggleVe(isShowStageSpecial);

            if (isShowStageUrl) {
                this._comp._state.isShowCustomUrlForm = selSources.some(it=>it.url === "");

                const customUrlMetas = this._comp._state.isShowCustomUrlForm ? this._comp._state.urlMetas.filter(it=>it.data.isCustom) : [];

                this._comp._state.urlMetas = [...selSources.filter(it=>it.url).map(it=>({
                    id: it.url,
                    data: {
                        isCustom: false,
                        displayName: it.url
                    }
                })), ...customUrlMetas, ];
            } else {
                this._comp._state.urlMetas = [];
            }

            if (isShowStageSpecial) {
                this._comp._state.specialMetas = [...selSources.filter(it=>it.url == null && !it.isFile).map(it=>({
                    id: it.cacheKey,
                    data: {
                        displayName: it.name
                    }
                })), ];
            } else {
                this._comp._state.specialMetas = [];
            }

            if (cbSourceChange)
                cbSourceChange(selSources);
        }
        ;

        if (this._pageFilter){this._pageFilter.teardown();}
        this._pageFilter = new AppSourceSelectorAppFilter();

        const isForceSelectAll = this.isForceSelectAllSources();

        const {$cbAll, $wrpFilterControls, $wrpMiniPills, $wrpBtnsSort, $list, $btnOpenFilter, $iptSearch, $btnReset, $btnToggleSummaryHidden, } = this.constructor.$getFilterListElements({
            isRadio: this._isRadio,
            isForceSelectAll
        });

        $$($wrpList)`
			${$wrpFilterControls}
			${$wrpMiniPills}
			${$wrpBtnsSort}
			${$list}
		`;

        this._list = new List({
            $iptSearch,
            $wrpList: $list,
            fnSort: UtilDataSource.sortListItems.bind(UtilDataSource),
        });
        const listSelectClickHandler = new ListSelectClickHandler({
            list: this._list
        });
        SortUtil.initBtnSortHandlers($wrpBtnsSort, this._list);
        if ($cbAll) {
            listSelectClickHandler.bindSelectAllCheckbox($cbAll);
            $cbAll.change(()=>setSources());
        }

        await this._pageFilter.pInitFilterBox({
            $iptSearch,
            $btnReset,
            $btnOpen: $btnOpenFilter,
            $btnToggleSummaryHidden,
            $wrpMiniPills,
            namespace: this._filterNamespace,
        });

        this._sourcesToDisplay.forEach((src,srcI)=>{
            const listItem = this.constructor.getListItem({
                pageFilter: this._pageFilter,
                list: this._list,
                listSelectClickHandler,
                isRadio: this._isRadio,
                src,
                srcI,
                fnOnClick: setSources,
                initialSources,
                isForceSelectAll,
            });
            this._list.addItem(listItem);
        }
        );

        setSources({
            isSkipSave: true
        });

        this._list.init();

        this._pageFilter.trimState();
        this._pageFilter.filterBox.render();

        this._pageFilter.filterBox.on(FilterBox.EVNT_VALCHANGE, this._handleFilterChange.bind(this), );

        this._handleFilterChange();

        return {
            $stgNone: this._$stgNone,
            $stgUpload: this._$stgUpload,
            $stgUrl: this._$stgUrl,
            $stgSpecial: this._$stgSpecial,

            $iptSearch,
        };
    }

    _handleFilterChange() {
        const f = this._pageFilter.filterBox.getValues();
        this._list.filter(li=>this._pageFilter.toDisplay(f, this._sourcesToDisplay[li.ix]));
    }

    static _getFilterTypesIcon(filterTypes) {
        if (filterTypes.includes(UtilDataSource.SOURCE_TYP_OFFICIAL_ALL) || filterTypes.includes(UtilDataSource.SOURCE_TYP_OFFICIAL_SINGLE)) {
            return `<i class="fab fa-d-and-d mr-1 source-category-site" title="${UtilDataSource.SOURCE_TYP_OFFICIAL_BASE}"></i>`;
        }

        if (filterTypes.includes(UtilDataSource.SOURCE_TYP_EXTRAS)) {
            return `<i class="fas fa-fw fa-scroll-old mr-1 source-category-extras" title="${UtilDataSource.SOURCE_TYP_EXTRAS}"></i>`;
        }

        if (filterTypes.includes(UtilDataSource.SOURCE_TYP_PRERELEASE_LOCAL)) {
            return `<i class="fas fa-fw fa-vial mr-1 source-category-spicy source-category-spicy--local" title="${UtilDataSource.SOURCE_TYP_PRERELEASE_LOCAL}"></i>`;
        }

        if (filterTypes.includes(UtilDataSource.SOURCE_TYP_PRERELEASE)) {
            return `<i class="fas fa-fw fa-vial mr-1 source-category-spicy" title="${UtilDataSource.SOURCE_TYP_PRERELEASE}"></i>`;
        }

        if (filterTypes.includes(UtilDataSource.SOURCE_TYP_BREW_LOCAL)) {
            return `<i class="fas fa-fw fa-beer mr-1 source-category-homebrew source-category-homebrew--local" title="${UtilDataSource.SOURCE_TYP_BREW_LOCAL}"></i>`;
        }

        if (filterTypes.includes(UtilDataSource.SOURCE_TYP_BREW)) {
            return `<i class="fas fa-fw fa-beer mr-1 source-category-homebrew" title="${UtilDataSource.SOURCE_TYP_BREW}"></i>`;
        }

        if (filterTypes.includes(UtilDataSource.SOURCE_TYP_CUSTOM)) {
            return `<i class="fas fa-fw fa-user ve-muted mr-1" title="${UtilDataSource.SOURCE_TYP_CUSTOM}"></i>`;
        }

        if (filterTypes.includes(UtilDataSource.SOURCE_TYP_UNKNOWN)) {
            return `<i class="fas fa-fw fa-question-circle ve-muted mr-1" title="${UtilDataSource.SOURCE_TYP_CUSTOM}"></i>`;
        }

        return "";
    }

    activateListeners($html) {
        (async()=>{
            const $ovrLoading = $(`<div class="veapp-loading__wrp-outer"><i>Loading...</i></div>`).appendTo($html.empty());

            const $wrpList = $(`<div class="ve-flex-col w-100 h-100 min-h-0"></div>`);

            const {$iptSearch} = await this.pGetElements($wrpList);

            $iptSearch.keydown(evt=>{
                if (evt.key === "Enter")
                    $btnAccept.click();
            }
            );

            const $btnAccept = $(`<button class="mt-auto btn btn-5et">Confirm</button>`).click(()=>this._pAcceptAndResolveSelection({
                $ovrLoading
            }));

            $$($html)`
			${$wrpList}
			<hr class="hr-1">
			<div class="ve-flex-col w-100 overflow-y-auto pr-1 max-h-40 imp__disp-import-from no-shrink">
				<h3 class="mb-1 b-0">Source</h3>
				${this._$stgNone}
				${this._$stgUpload}
				${this._$stgUrl}
				${this._$stgSpecial}
			</div>
			${$btnAccept}
			${$ovrLoading.hideVe()}`;

            $iptSearch.focus();
        }
        )();
    }

    async _pAcceptAndResolveSelection({$ovrLoading, fnClose, fnResolve, isSilent=false, isBackground=false, isAutoSelectAll=false}={}) {
        
        try {
            if ($ovrLoading){$ovrLoading.showVe();}

            const sources = await this.pGetSelectedSources();
            if (!isSilent && !sources.length) {
                if ($ovrLoading){$ovrLoading.hideVe();}
                //return ui.notifications.error(`No sources selected!`);
                console.error(`No sources selected!`); return;
            }

            if (!isSilent && sources.length > 10) {
                const isContinue = await InputUiUtil.pGetUserBoolean({
                    title: `You have many sources selected, which may negatively impact performance. Do you want to continue?`,
                    storageKey: "AppSourceSelectorMulti__massSelectionWarning",
                    textYesRemember: "Continue and Remember",
                    textYes: "Continue",
                    textNo: "Cancel",
                });

                if (!isContinue) {
                    if ($ovrLoading){$ovrLoading.hideVe();}
                    return;
                }
            }

            const isSure = await InputUiUtil.pGetUserBoolean({
                title: `Are you sure you wish to change sources?`,
                htmlDescription: `This will reset your character!`,
              });
            //Perhaps show some info here that characters using content from non-enabled sources will break badly
            if (!isSure){
                if ($ovrLoading){$ovrLoading.hideVe();}
                return;
            }

            /* const out = await this._pGetOutputEntities(sources, { isBackground, isAutoSelectAll });
            if (!out){return;}
            if (!isSilent && !Object.values(out).some(it=>it?.length)) {
                if ($ovrLoading){$ovrLoading.hideVe();}
                return ui.notifications.warn(`No sources to be loaded! Please finish entering source details first.`);
            } */

            if(!sources || sources.length < 1){ console.log("No sources selected."); return;}

            //We don't want to return entities, we just want to return metadata about sources
            const out = {sourceIds: sources, uploadedFileMetas: this.uploadedFileMetas, customUrls: this.getCustomUrls()};

            fnResolve(out); //Calls for this window to return a solution to whoever has been waiting
            this.close(fnClose);
        } catch (e) {
            if ($ovrLoading){$ovrLoading.hideVe();}
            //ui.notifications.error(`Failed to load sources! ${VeCt.STR_SEE_CONSOLE}`);
            console.error("Failed to load sources!");
            throw e;
        }
    }

    async _pGetOutputEntities(sources, {isBackground=false, isAutoSelectAll=false}={}) {
        const allContentMeta = await UtilDataSource.pGetAllContent({
            sources,
            uploadedFileMetas: this.uploadedFileMetas,
            customUrls: this.getCustomUrls(),
            isBackground,

            page: this._page,

            isDedupable: this._isDedupable,
            fnGetDedupedData: this._fnGetDedupedData,

            fnGetBlocklistFilteredData: this._fnGetBlocklistFilteredData,

            isAutoSelectAll,
        });
        if (!allContentMeta)
            return null;

        const out = allContentMeta.dedupedAllContentMerged;

        Renderer.spell.populatePrereleaseLookup(await PrereleaseUtil.pGetBrewProcessed(), {
            isForce: true
        });
        Renderer.spell.populateBrewLookup(await BrewUtil2.pGetBrewProcessed(), {
            isForce: true
        });

        (out.spell || []).forEach(sp=>{
            Renderer.spell.uninitBrewSources(sp);
            Renderer.spell.initBrewSources(sp);
        }
        );

        return out;
    }

    getCustomUrls() {
        return this._comp._state.urlMetas.filter(it=>it.data.isCustom && it.data.url && it.data.url.trim()).map(it=>it.data.url.trim());
    }

    handlePreClose() {
        this._comp._detachCollection("urlMetas");
        this._comp._detachCollection("uploadedFileMetas");
        this._comp._detachCollection("specialMetas");
    }

    handlePostClose() {
        if (this._pageFilter)
            this._pageFilter.teardown();
    }

    async close(fnClose) {
        this.handlePreClose();
        fnClose();
        this.handlePostClose();
    }

    async _render(){

        return new Promise(async resolve => {
            const {$modalInner, doClose} = await this._pGetShowModal(resolve);
            const $ovrLoading = $(`<div class="veapp-loading__wrp-outer"><i>Loading...</i></div>`).appendTo($modalInner.empty());

            const $wrpList = $(`<div class="ve-flex-col w-100 h-100 min-h-0"></div>`);

            const {$iptSearch} = await this.pGetElements($wrpList);

            $iptSearch.keydown(evt=>{
                if (evt.key === "Enter"){$btnAccept.click();}}
            );

            const $btnAccept = $(`<button class="mt-auto btn btn-5et">Confirm</button>`).click(()=>this._pAcceptAndResolveSelection({
                $ovrLoading, fnClose: doClose, fnResolve: resolve
            }));

            $$($modalInner)`
			${$wrpList}
			<hr class="hr-1">
			<div class="ve-flex-col w-100 overflow-y-auto pr-1 max-h-40 imp__disp-import-from no-shrink">
				<h3 class="mb-1 b-0">Source</h3>
				${this._$stgNone}
				${this._$stgUpload}
				${this._$stgUrl}
				${this._$stgSpecial}
			</div>
			${$btnAccept}
			${$ovrLoading.hideVe()}`;

            $iptSearch.focus();
        });
    }

    pWaitForUserInput({isRenderApp=true}={}) {
        const isSelectAll = this.isForceSelectAllSources();

        if (!isSelectAll && isRenderApp){
            return this._render(); //Return this promise instead
        }

        this._pUserInput = new Promise((resolve, reject)=>{
            this._resolve = resolve; //Call this later when this modal has resolved the choices
            this._reject = reject; //Call this later if this modal has rejected the choices
        });

        //TODO: make this call resolve in a better way
        if (isSelectAll) {
            this._pAcceptAndResolveSelection({
                isSilent: true,
                isBackground: true,
                isAutoSelectAll: isSelectAll
            }).then(null);
        }
           

        return this._pUserInput;
    }

    async pLoadInitialSelection() {
        const initialSources = await this._pGetInitialSources();
        return this._pGetOutputEntities(initialSources);
    }
}

class ModalFilterSources extends ModalFilter {
    
    constructor(opts) {
        opts = opts || {};

        super({
            ...opts,
            modalTitle: "Sources",
            pageFilter: new PageFilterSourcesRaw(),
            fnSort: ModalFilterClasses.fnSort,
        });

        this._filterNamespace = opts.filterNamespace;
        this._savedSelectionKey = opts.savedSelectionKey;
        this._sourcesToDisplay= opts.sourcesToDisplay;
        this._preEnabledSources = opts.preEnabledSources;

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
        //Return a promise that only resolves once the modal is exited
        return new Promise(async resolve=>{
            const {$modalInner, doClose} = await this._pGetShowModal(resolve);

            //Build the list
            await this.pPreloadHidden($modalInner);

            //Apply the filter expression
            this._doApplyFilterExpression(filterExpression);

            //If the confirm button is clicked
            this._filterCache.$btnConfirm.off("click").click(async()=>{
                //Get all the checked list items
                const checked = this._filterCache.list.items.filter(it=>it.data.cbSel.checked);
                let out = checked.map(li=>this._sourcesToDisplay[li.ix]);
                //Call resolve
                resolve(MiscUtil.copy(out));

                doClose(true);

                ModalFilterClasses._doListDeselectAll(this._filterCache.list);
            });

            this._ixPrevSelectedClass = selectedClass != null ? this._filterCache.allData.findIndex(it=>it.name === selectedClass.name && it.source === selectedClass.source) : null;
            this._isClassDisabled = isClassDisabled;
            this._isSubclassDisabled = isSubclassDisabled;
            this._filterCache.list.items.forEach(li=>{
                let isClassDisabled = false;
                //li.data.cbSel.classList.toggle("disabled", this._isClassDisabled);
                li.data.cbSel.classList.toggle("disabled", isClassDisabled);
            });

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
            }
            else { this._filterCache.list.setFnSearch(null); }

            this._filterCache.list.update();

            await UiUtil.pDoForceFocus(this._filterCache.$iptSearch[0]);
        });
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
            const $btnReset = $(`<button class="btn btn-default">Reset</button>`);
            const $wrpFormTop = $$`<div class="ve-flex input-group btn-group w-100 lst__form-top">${$iptSearch}${$btnReset}</div>`;

            const $wrpFormBottom = $(`<div class="w-100"></div>`);

            const $wrpFormHeaders = $(`<div class="input-group input-group--bottom ve-flex no-shrink">
				<div class="btn btn-default disabled col-1 pl-0"></div>
				<button class="col-9 sort btn btn-default btn-xs" data-sort="name">Name</button>
				<button class="col-2 pr-0 sort btn btn-default btn-xs ve-grow" data-sort="source">Source</button>
			</div>`);

            const $wrpForm = $$`<div class="ve-flex-col w-100 mb-2">${$wrpFormTop}${$wrpFormBottom}${$wrpFormHeaders}</div>`;
            const $wrpList = this._$getWrpList();

            const $btnConfirm = $(`<button class="btn btn-default">Confirm</button>`);

            const list = new List({ $iptSearch, $wrpList, fnSort: this._fnSort, });
            //create a click handler
            const listSelectClickHandler = new ListSelectClickHandler({list});

            SortUtil.initBtnSortHandlers($wrpFormHeaders, list);

            //allData is probably already set
            const allData = this._allData || await this._pLoadAllData();
            const pageFilter = this._pageFilter;

            await pageFilter.pInitFilterBox({ $wrpFormTop, $btnReset, $wrpMiniPills: $wrpFormBottom, namespace: this._namespace, });

            //test - source data
            //get some sources
            const allSources = await CharacterBuilder._pGetSources({actor: null});
            const existingSources = this._preEnabledSources;
            allSources.forEach((it,i)=>{
                let isDefaultContent = it.isDefault;
                let isCustomUserContent = it.filterTypes?.includes("Custom/User");
                let isExistingEnabledContent = existingSources.filter(src => src.name == it.name).length > 0;
                let isSelected = isDefaultContent || isExistingEnabledContent;
                if(true){
                    const listSelectClickHandler = new ListSelectClickHandler({list});
                    const listItem = ModalFilterSources.getListItem({listSelectClickHandler: listSelectClickHandler
                        , pageFilter: pageFilter, src:it, srcI:i, isSelected:isSelected, pageFilter: pageFilter});
                    
                    list.addItem(listItem);
                }
            });

            const filterListItems = this._getListItems(pageFilter, allData[0], 0);

            //Class data
            /* allData.forEach((it,i)=>{
                pageFilter.mutateAndAddToFilters(it);
                const filterListItems = this._getListItems(pageFilter, it, i);
                filterListItems.forEach(li=>{
                    list.addItem(li);
                    li.ele.addEventListener("click", evt=>{

                        this._handleSelectClick({
                            list,
                            filterListItems,
                            filterListItem: li,
                            evt,
                        });
                    });
                });
            }); */

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
            const cls = li;

            //Ask pageFilter if this list item should be displayed
            const toDisplay = true;//pageFilter.toDisplay(f, cls, [], null);
            return toDisplay;
        });
    }

    static _doListDeselectAll(list, {isSubclassItemsOnly=false}={}) {
        list.items.forEach(it=>{
            if (isSubclassItemsOnly && it.data.ixSubclass == null){return;}

            if (it.data.tglSel){it.data.tglSel.classList.remove("active");}
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

    static getListItem({pageFilter, isRadio, list, listSelectClickHandler, src, srcI, fnOnClick, initialSources, isSelected, isForceSelectAll, }, ) {
        isSelected = isSelected === undefined && initialSources ? initialSources.includes(src) : !!isSelected;

        pageFilter.mutateAndAddToFilters(src);

        const eleCb = e_({
            outer: isRadio ? `<input type="radio" name="radio" class="no-events mx-1">` : `<input type="checkbox" class="no-events mx-1">`,
        });
        if (isSelected){eleCb.checked = true;}
        if (isForceSelectAll){eleCb.setAttribute("disabled", true);}

        const eleWrpCb = e_({ tag: "span", clazz: "col-0-5 ve-flex-vh-center", children: [eleCb, ], });

        const eleLi = e_({
            tag: "label",
            clazz: `row imp-wiz__row veapp__list-row-hoverable ve-flex-v-center ${isSelected ? "list-multi-selected" : ""}`,
            children: [eleWrpCb, e_({
                tag: "span",
                clazz: "col-11-5",
                //html: `${this._getFilterTypesIcon(src.filterTypes)}${src.name}`,
                html: `${src.name}`,
            }), ],
        });

        const listItem = new ListItem(srcI,eleLi,src.name,{ filterTypes: src.filterTypes, abbreviations: src.abbreviations || [], },
            { identifierWorld: src.identifierWorld, cbSel: eleCb, },);

        if (!isForceSelectAll) {
            eleLi.addEventListener("click", evt=>{
                if (isRadio){listSelectClickHandler.handleSelectClickRadio(listItem, evt);}
                else{listSelectClickHandler.handleSelectClick(listItem, evt);}
                if (fnOnClick){fnOnClick({ list, listItem });}
            });
        }

        return listItem;
    }
}
class ActorCharactermancerSourceSelector extends AppSourceSelectorMulti {
    static _BREW_DIRS = ["class", 'subclass', "race", "subrace",
        "background", "item", 'baseitem', "magicvariant", "spell", "feat", "optionalfeature"];
    static async ["api_pOpen"]({ actor: actor }) {
      if (game.user.role < Config.get('charactermancer', 'minimumRole')) {
        throw new Error("You do not have sufficient permissions!");
      }
      if (!actor) {
        throw new Error("\"actor\" option must be provided!");
      }
      return this._pOpen({ actor: actor });
    }
    static prePreInit() { this._preInit_registerKeybinds(); }
    static _preInit_registerKeybinds() {
      const fnOpenPlayer = () => {
        const playerActor = UtilKeybinding.getPlayerActor({ minRole: Config.get("charactermancer", "minimumRole") });
        if (!playerActor) { return true; }
        this._pOpen({ actor: playerActor });
        return true;
      };
      const fnOpenSheet = () => {
        const meta = UtilKeybinding.getCurrentImportableSheetDocumentMeta({
          isRequireActor: true,
          isRequireOwnership: true,
          minRole: Config.get("charactermancer", "minimumRole")
        });
        if (!meta?.["actor"]) { return true; }
        this._pOpen({ ...meta });
        return true;
      };
      game.keybindings.register(SharedConsts.MODULE_ID, "ActorCharactermancerSourceSelector__openForCharacter", {
        name: "Open Charactermancer Targeting Player Character",
        editable: [],
        onDown: () => fnOpenPlayer()
      });
      game.keybindings.register(SharedConsts.MODULE_ID, "ActorCharactermancerSourceSelector__openForCurrentSheet", {
        name: "Open Charactermancer Targeting Current Sheet",
        editable: [],
        onDown: () => fnOpenSheet()
      });
    }
    static async pHandleButtonClick(e, opts) {
      return this._pOpen({actor: opts.actor});
    }
    static async _pOpen({ actor: actor }) {
      const sources = await this._pGetSources({ actor: actor });
      const selector = new ActorCharactermancerSourceSelector({
        title: "Charactermancer (Actor \"" + actor.name + "\"): Select Sources",
        filterNamespace: 'ActorCharactermancerSourceSelector_filter',
        savedSelectionKey: "ActorCharactermancerSourceSelector_savedSelection",
        sourcesToDisplay: sources
      });
      const hasConfirmed = await selector.pWaitForUserInput();
      if (hasConfirmed == null) { return; }
      const data = this._postProcessAllSelectedData(hasConfirmed);
      const mancer = new ActorCharactermancer({ actor: actor, data: data });
      mancer.render(true);
    }
    static _postProcessAllSelectedData(results) {
      results = ImportListClass.Utils.getDedupedData({ allContentMerged: results });
      results = ImportListClass.Utils.getBlocklistFilteredData({ dedupedAllContentMerged: results });
      delete results.subclass;
      Charactermancer_Feature_Util.addFauxOptionalFeatureEntries(results, results.optionalfeature);
      Charactermancer_Class_Util.addFauxOptionalFeatureFeatures(results.class, results.optionalfeature);
      return results;
    }
    static async _pGetSources({ actor: actor }) {
      return [new UtilDataSource.DataSourceSpecial(Config.get('ui', 'isStreamerMode') ? "SRD" : "5etools", this._pLoadVetoolsSource.bind(this), {
        'cacheKey': '5etools-charactermancer',
        'filterTypes': [UtilDataSource.SOURCE_TYP_OFFICIAL_ALL],
        'isDefault': true,
        'pPostLoad': this._pPostLoad.bind(this, {
          'actor': actor
        })
      }), ...UtilDataSource.getSourcesCustomUrl({
        'pPostLoad': this._pPostLoad.bind(this, {
          'isBrewOrPrerelease': true,
          'actor': actor
        })
      }), ...UtilDataSource.getSourcesUploadFile({
        'pPostLoad': this._pPostLoad.bind(this, {
          'isBrewOrPrerelease': true,
          'actor': actor
        })
      }), ...(await UtilDataSource.pGetSourcesPrerelease(ActorCharactermancerSourceSelector._BREW_DIRS, {
        'pPostLoad': this._pPostLoad.bind(this, {
          'isPrerelease': true,
          'actor': actor
        })
      })), ...(await UtilDataSource.pGetSourcesBrew(ActorCharactermancerSourceSelector._BREW_DIRS, {
        'pPostLoad': this._pPostLoad.bind(this, {
          'isBrew': true,
          'actor': actor
        })
      }))].filter(src => !UtilWorldDataSourceSelector.isFiltered(src));
    }
    static async _pLoadVetoolsSource() {
      const out = {};
      const [replyClass, replyRace, replyBk, replyItem, replySpell, replyFeat, replyOptionalFeature] =
      await Promise.all([Vetools.pGetClasses(), Vetools.pGetRaces(), DataUtil.loadJSON(Vetools.DATA_URL_BACKGROUNDS), Vetools.pGetItems(), Vetools.pGetAllSpells(), DataUtil.loadJSON(Vetools.DATA_URL_FEATS), DataUtil.loadJSON(Vetools.DATA_URL_OPTIONALFEATURES)]);
      Object.assign(out, replyClass);
      out.race = replyRace.race;
      out.background = replyBk.background;
      out.item = replyItem.item;
      out.spell = replySpell.spell;
      out.feat = replyFeat.feat;
      out.optionalfeature = replyOptionalFeature.optionalfeature;
      return out;
    }
    static async _pPostLoad(opts) {
      if (isBrewOrPrerelease) {
        const { isPrerelease: isPrerelease, isBrew: isBrew } = UtilDataSource.getSourceType(opts, { 'isErrorOnMultiple': true });
        isPrerelease;
        isBrew = isBrew;
      }
      opts = await UtilDataSource.pPostLoadGeneric({ isBrew: isBrew, isPrerelease: isPrerelease }, opts);
      if (opts.class || opts.subclass) {
        const isIgnoredLookup = await DataConverterClassSubclassFeature.pGetClassSubclassFeatureIgnoredLookup({ data: opts });
        const postLoaded = await PageFilterClassesFoundry.pPostLoad({
          'class': opts.class,
          'subclass': opts.subclass,
          'classFeature': opts.classFeature,
          'subclassFeature': opts.subclassFeature
        }, {
          'actor': actor,
          'isIgnoredLookup': isIgnoredLookup
        });
        Object.assign(opts, postLoaded);
        if (opts.class) { opts.class.forEach(cls => PageFilterClasses.mutateForFilters(cls)); }
      }
      if (opts.feat) { opts.feat = MiscUtil.copy(opts.feat); }
      if (opts.optionalfeature) { opts.optionalfeature = MiscUtil.copy(opts.optionalfeature); }
      return opts;
    }
}
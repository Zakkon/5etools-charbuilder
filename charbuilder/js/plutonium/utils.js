//#region UtilDataSource
class UtilDataSource {

    static sortListItems(a, b, o) {
        const ixTypeA = Math.min(...a.values.filterTypes.map(it=>UtilDataSource.SOURCE_TYPE_ORDER.indexOf(it)));
        const ixTypeB = Math.min(...b.values.filterTypes.map(it=>UtilDataSource.SOURCE_TYPE_ORDER.indexOf(it)));

        return SortUtil.ascSort(ixTypeA, ixTypeB) || SortUtil.compareListNames(a, b);
    }

    static _PROPS_NO_BLOCKLIST = new Set(["itemProperty", "itemType", "spellList"]);
    static _PROP_RE_FOUNDRY = /^foundry[A-Z]/;

    static getMergedData(data, {isFilterBlocklisted=true}={}) {
        const mergedData = {};

        data.forEach(sourceData=>{
            Object.entries(sourceData).forEach(([prop,arr])=>{
                if (!arr || !(arr instanceof Array))
                    return;
                if (mergedData[prop])
                    mergedData[prop] = [...mergedData[prop], ...MiscUtil.copy(arr)];
                else
                    mergedData[prop] = MiscUtil.copy(arr);
            }
            );
        });

        if (isFilterBlocklisted) {
            Object.entries(mergedData).forEach(([prop,arr])=>{
                if (!arr || !(arr instanceof Array))
                    return;
                mergedData[prop] = mergedData[prop].filter(it=>{
                    if (SourceUtil.getEntitySource(it) === VeCt.STR_GENERIC)
                        return false;

                    if (it.__prop && this._PROPS_NO_BLOCKLIST.has(it.__prop))
                        return true;
                    if (it.__prop && this._PROP_RE_FOUNDRY.test(it.__prop))
                        return false;

                    if (!SourceUtil.getEntitySource(it)) {
                        console.warn(`Entity did not have a "source"! This should never occur.`);
                        return true;
                    }
                    if (!it.__prop) {
                        console.warn(`Entity did not have a "__prop"! This should never occur.`);
                        return true;
                    }
                    if (!UrlUtil.URL_TO_HASH_BUILDER[it.__prop]) {
                        console.warn(`No hash builder found for "__prop" "${it.__prop}"! This should never occur.`);
                        return true;
                    }

                    switch (it.__prop) {
                    case "class":
                        {
                            if (!it.subclasses?.length)
                                break;

                            it.subclasses = it.subclasses.filter(sc=>{
                                if (sc.source === VeCt.STR_GENERIC)
                                    return false;

                                return !ExcludeUtil.isExcluded(UrlUtil.URL_TO_HASH_BUILDER["subclass"](sc), "subclass", sc.source, {
                                    isNoCount: true
                                }, );
                            }
                            );

                            break;
                        }

                    case "item":
                    case "baseitem":
                    case "itemGroup":
                    case "magicvariant":
                    case "_specificVariant":
                        {
                            return !Renderer.item.isExcluded(it);
                        }

                    case "race":
                        {
                            if (this._isExcludedRaceSubrace(it))
                                return false;
                        }
                    }

                    return !ExcludeUtil.isExcluded(UrlUtil.URL_TO_HASH_BUILDER[it.__prop](it), it.__prop, SourceUtil.getEntitySource(it), {
                        isNoCount: true
                    }, );
                }
                );
            }
            );
        }

        return mergedData;
    }

    static async pHandleBackgroundLoad({pLoad, isBackground=false, cntSources=null}) {
        const pTimeout = isBackground ? MiscUtil.pDelay(500, VeCt.SYM_UTIL_TIMEOUT) : null;

        const promises = [pLoad, pTimeout].filter(Boolean);

        const winner = await Promise.race(promises);
        if (winner === VeCt.SYM_UTIL_TIMEOUT)
            ui.notifications.info(`Please wait while ${cntSources != null ? `${cntSources} source${cntSources === 1 ? " is" : "s are"}` : "data is being"} loaded...`);
        return pLoad;
    }

    static _IGNORED_KEYS = new Set(["_meta", "$schema", ]);

    static async pGetAllContent({sources, uploadedFileMetas, customUrls, isBackground=false, userData, cacheKeys=null,
        page, isDedupable=false, fnGetDedupedData=null, fnGetBlocklistFilteredData=null, isAutoSelectAll=false, }, ) {
        const allContent = [];

        if (isAutoSelectAll && this.isTooManySources({ cntSources: sources.length })) {
            const ptHelp = `This may take a (very) long time! If this seems like too much, ${game.user.isGM ? "your GM" : "you"} may have to adjust ${game.user.isGM ? "your" : "the"} "Data Sources" Config options/${game.user.isGM ? "your" : "the"} "World Data Source Selector" list to limit the number of sources selected by default.`;

            console.warn(...LGT, `${sources.length} source${sources.length === 1 ? "" : "s"} are being loaded! ${ptHelp}`);

            if (!(await InputUiUtil.pGetUserBoolean({
                title: "Too Many Sources",
                htmlDescription: `You are about to load ${sources.length} source${sources.length === 1 ? "" 
                : "s"}. ${ptHelp}<br>Would you like to load ${sources.length} source${sources.length === 1 ? "" : "s"}?`,
                textNo: "Cancel",
                textYes: "Continue",
            })))
                return null;
        }

        const pLoad = sources.pMap(async source=>{
            await source.pLoadAndAddToAllContent({ uploadedFileMetas, customUrls, allContent, cacheKeys });
        });

        await UtilDataSource.pHandleBackgroundLoad({
            pLoad,
            isBackground,
            cntSources: sources.length
        });

        const allContentMerged = {};

        if (allContent.length === 1)
            Object.assign(allContentMerged, allContent[0]);
        else {
            allContent.forEach(obj=>{
                Object.entries(obj).forEach(([k,v])=>{
                    if (v == null)
                        return;
                    if (this._IGNORED_KEYS.has(k))
                        return;

                    if (!(v instanceof Array))
                        console.warn(`Could not merge "${typeof v}" for key "${k}"!`);

                    allContentMerged[k] = allContentMerged[k] || [];
                    allContentMerged[k] = [...allContentMerged[k], ...v];
                }
                );
            });
        }

        let dedupedAllContentMerged = fnGetDedupedData ? fnGetDedupedData({
            allContentMerged,
            isDedupable
        }) : this._getDedupedAllContentMerged({
            allContentMerged,
            isDedupable
        });

        dedupedAllContentMerged = fnGetBlocklistFilteredData ? fnGetBlocklistFilteredData({
            dedupedAllContentMerged,
            page
        }) : this._getBlocklistFilteredData({
            dedupedAllContentMerged,
            page
        });

        if (Config.get("import", "isShowVariantsInLists")) {
            Object.entries(dedupedAllContentMerged).forEach(([k,arr])=>{
                if (!(arr instanceof Array))
                    return;
                dedupedAllContentMerged[k] = arr.map(it=>[it, ...DataUtil.proxy.getVersions(it.__prop, it)]).flat();
            }
            );
        }

        Object.entries(dedupedAllContentMerged).forEach(([k,arr])=>{
            if (!(arr instanceof Array))
                return;
            if (!arr.length)
                delete dedupedAllContentMerged[k];
        }
        );

        return {
            dedupedAllContentMerged,
            cacheKeys,
            userData
        };
    }

    static isTooManySources({cntSources}) {
        return Config.get("dataSources", "tooManySourcesWarningThreshold") != null && cntSources >= Config.get("dataSources", "tooManySourcesWarningThreshold");
    }

    static _getBlocklistFilteredData({dedupedAllContentMerged, page}) {
        if (!UrlUtil.URL_TO_HASH_BUILDER[page])
            return dedupedAllContentMerged;
        dedupedAllContentMerged = {
            ...dedupedAllContentMerged
        };
        Object.entries(dedupedAllContentMerged).forEach(([k,arr])=>{
            if (!(arr instanceof Array))
                return;
            dedupedAllContentMerged[k] = arr.filter(it=>{
                if (it.source === VeCt.STR_GENERIC)
                    return false;

                if (!SourceUtil.getEntitySource(it)) {
                    console.warn(`Entity did not have a "source"! This should never occur.`);
                    return true;
                }
                if (!it.__prop) {
                    console.warn(`Entity did not have a "__prop"! This should never occur.`);
                    return true;
                }

                switch (it.__prop) {
                case "item":
                case "baseitem":
                case "itemGroup":
                case "magicvariant":
                case "_specificVariant":
                    {
                        return !Renderer.item.isExcluded(it);
                    }

                case "race":
                    {
                        if (this._isExcludedRaceSubrace(it))
                            return false;
                    }
                }

                return !ExcludeUtil.isExcluded((UrlUtil.URL_TO_HASH_BUILDER[it.__prop] || UrlUtil.URL_TO_HASH_BUILDER[page])(it), it.__prop, SourceUtil.getEntitySource(it), {
                    isNoCount: true
                }, );
            }
            );
        }
        );
        return dedupedAllContentMerged;
    }

    static _isExcludedRaceSubrace(it) {
        if (it.__prop !== "race")
            return false;
        return it._subraceName && ExcludeUtil.isExcluded(UrlUtil.URL_TO_HASH_BUILDER["subrace"]({
            name: it._subraceName,
            source: it.source,
            raceName: it._baseName,
            raceSource: it._baseSource
        }), "subrace", SourceUtil.getEntitySource(it), {
            isNoCount: true
        }, );
    }

    static _getDedupedAllContentMerged({allContentMerged, page, isDedupable=false}) {
        if (!isDedupable)
            return allContentMerged;
        return this._getDedupedData({
            allContentMerged,
            page
        });
    }

    static _getDedupedData({allContentMerged, page}) {
        if (!UrlUtil.URL_TO_HASH_BUILDER[page])
            return allContentMerged;

        const contentHashes = new Set();
        Object.entries(allContentMerged).forEach(([k,arr])=>{
            if (!(arr instanceof Array))
                return;
            allContentMerged[k] = arr.filter(it=>{
                const fnGetHash = UrlUtil.URL_TO_HASH_BUILDER[page];
                if (!fnGetHash)
                    return true;
                const hash = fnGetHash(it);
                if (contentHashes.has(hash))
                    return false;
                contentHashes.add(hash);
                return true;
            }
            );
        }
        );

        return allContentMerged;
    }

    static async pPostLoadGeneric({isPrerelease, isBrew}, out) {
        out = { ...out };

        if ((isBrew || isPrerelease) && (out.race || out.subrace)) {
            const nxt = await Charactermancer_Race_Util.pPostLoadPrereleaseBrew(out);
            Object.assign(out, nxt || {});
        }

        if ((isBrew || isPrerelease) && (out.item || out.baseitem || out.magicvariant || out.itemGroup)) {
            if (isBrew)
                out.item = await Vetools.pGetBrewItems(out);
            else if (isPrerelease)
                out.item = await Vetools.pGetPrereleaseItems(out);

            delete out.baseitem;
            delete out.magicvariant;
            delete out.itemProperty;
            delete out.itemType;
            delete out.itemGroup;
        }

        return out;
    }

    static getSourceFilterTypes(src) {
        return SourceUtil.isPrereleaseSource(src) ? [UtilDataSource.SOURCE_TYP_PRERELEASE] : SourceUtil.isNonstandardSource(src) ? [UtilDataSource.SOURCE_TYP_EXTRAS] : [UtilDataSource.SOURCE_TYP_OFFICIAL_SINGLE];
    }

    static getSourcesCustomUrl(nxtOpts={}) {
        return [new UtilDataSource.DataSourceUrl("Custom URL","",{
            ...nxtOpts,
            filterTypes: [UtilDataSource.SOURCE_TYP_CUSTOM],
            isAutoDetectPrereleaseBrew: true,
        },), ];
    }

    static getSourcesUploadFile(nxtOpts={}) {
        return [new UtilDataSource.DataSourceFile("Upload File",{
            ...nxtOpts,
            filterTypes: [UtilDataSource.SOURCE_TYP_CUSTOM],
            isAutoDetectPrereleaseBrew: true,
        },), ];
    }

    static async pGetSourcesPrerelease(dirsPrerelease, nxtOpts={}) {
        return this._pGetSourcesPrereleaseBrew({
            brewUtil: PrereleaseUtil,
            localSources: await Vetools.pGetLocalPrereleaseSources(...dirsPrerelease),
            sources: await Vetools.pGetPrereleaseSources(...dirsPrerelease),
            filterTypesLocal: [UtilDataSource.SOURCE_TYP_PRERELEASE, UtilDataSource.SOURCE_TYP_PRERELEASE_LOCAL],
            filterTypes: [UtilDataSource.SOURCE_TYP_PRERELEASE],
            nxtOpts,
        });
    }

    /**
     * @param {string[]} dirsHomebrew
     * @param {{pPostLoad:Function}} nxtOpts
     * @returns {Promise<any>}
     */
    static async pGetSourcesBrew(dirsHomebrew, nxtOpts={}) {
        return this._pGetSourcesPrereleaseBrew({
            brewUtil: BrewUtil2,
            localSources: await Vetools.pGetLocalBrewSources(...dirsHomebrew),
            sources: await Vetools.pGetBrewSources(...dirsHomebrew),
            filterTypesLocal: [UtilDataSource.SOURCE_TYP_BREW, UtilDataSource.SOURCE_TYP_BREW_LOCAL],
            filterTypes: [UtilDataSource.SOURCE_TYP_BREW],
            nxtOpts,
        });
    }

    /**
     * @param {{localSources:any[], sources:{name:string, url:string, abbreviations:string[]}[], nxtOpts:{pPostLoad:Function}, brewUtil:any,
     * filterTypesLocal:string[], filterTypes:string[]}}
     */
    static async _pGetSourcesPrereleaseBrew({localSources, sources, nxtOpts, brewUtil, filterTypesLocal, filterTypes}) {
        return [...localSources.map(({name, url, abbreviations})=>new UtilDataSource.DataSourceUrl(name,url,{
            ...nxtOpts,
            filterTypes: [...filterTypesLocal],
            abbreviations,
            brewUtil,
            isExistingPrereleaseBrew: true,
        },)), ...sources.map(({name, url, abbreviations})=>new UtilDataSource.DataSourceUrl(name,url,{
            ...nxtOpts,
            filterTypes: [...filterTypes],
            abbreviations,
            brewUtil,
        },)), ];
    }


    /**
     * Returns the prerelease and brew sources from the inputted material
     * @param {{_meta:{sources:{json:string}[]}}} json
     * @param {boolean} isErrorOnMultiple
     * @returns {{isPrerelease: Array, isBrew: Array}}
     */
    static getSourceType(json, {isErrorOnMultiple=false}={}) {
        const isPrereleasePerSource = (json._meta?.sources || []).map(it=>SourceUtil.isPrereleaseSource(it.json || ""));
        const isPrerelease = isPrereleasePerSource.every(it=>it);
        const isBrew = isPrereleasePerSource.every(it=>!it);

        if (isPrerelease && isBrew && isErrorOnMultiple)
            throw new Error(`Could not determine if data contained homebrew or if data contained prerelease content! Please ensure all homebrew/prerelease files have a valid "_meta.sources", and that no file contains both homebrew and prerelease sources.`);

        return { isPrerelease, isBrew };
    }
}
UtilDataSource.SOURCE_TYP_OFFICIAL_BASE = "Official";
UtilDataSource.SOURCE_TYP_OFFICIAL_ALL = `${UtilDataSource.SOURCE_TYP_OFFICIAL_BASE} (All)`;
UtilDataSource.SOURCE_TYP_OFFICIAL_SINGLE = `${UtilDataSource.SOURCE_TYP_OFFICIAL_BASE} (Single Source)`;
UtilDataSource.SOURCE_TYP_CUSTOM = "Custom/User";
UtilDataSource.SOURCE_TYP_EXTRAS = "Extras";
UtilDataSource.SOURCE_TYP_PRERELEASE = "Prerelease";
UtilDataSource.SOURCE_TYP_PRERELEASE_LOCAL = "Local Prerelease";
UtilDataSource.SOURCE_TYP_BREW = "Homebrew";
UtilDataSource.SOURCE_TYP_BREW_LOCAL = "Local Homebrew";
UtilDataSource.SOURCE_TYP_UNKNOWN = "Unknown";

UtilDataSource.SOURCE_TYPE_ORDER = [UtilDataSource.SOURCE_TYP_OFFICIAL_ALL, UtilDataSource.SOURCE_TYP_CUSTOM, UtilDataSource.SOURCE_TYP_OFFICIAL_SINGLE, UtilDataSource.SOURCE_TYP_EXTRAS, UtilDataSource.SOURCE_TYP_PRERELEASE_LOCAL, UtilDataSource.SOURCE_TYP_PRERELEASE, UtilDataSource.SOURCE_TYP_BREW_LOCAL, UtilDataSource.SOURCE_TYP_BREW, UtilDataSource.SOURCE_TYP_UNKNOWN, ];

UtilDataSource.SOURCE_TYPE_ORDER__FILTER = [UtilDataSource.SOURCE_TYP_OFFICIAL_ALL, UtilDataSource.SOURCE_TYP_OFFICIAL_SINGLE, UtilDataSource.SOURCE_TYP_EXTRAS, UtilDataSource.SOURCE_TYP_PRERELEASE_LOCAL, UtilDataSource.SOURCE_TYP_PRERELEASE, UtilDataSource.SOURCE_TYP_BREW_LOCAL, UtilDataSource.SOURCE_TYP_BREW, UtilDataSource.SOURCE_TYP_CUSTOM, UtilDataSource.SOURCE_TYP_UNKNOWN, ];

UtilDataSource.DataSourceBase = class {
    /**
     * @param {string} name
     * @param {{pPostLoad:Function, filterTypes:string[], abbreviations:string[], brewUtil:any, isExistingPrereleaseBrew:boolean}} opts
     */
    constructor(name, opts) {
        this.name = name;

        this._pPostLoad = opts.pPostLoad;
        this._brewUtil = opts.brewUtil;
        this._isAutoDetectPrereleaseBrew = !!opts.isAutoDetectPrereleaseBrew;
        this._isExistingPrereleaseBrew = !!opts.isExistingPrereleaseBrew;
        this.filterTypes = opts.filterTypes || [UtilDataSource.SOURCE_TYP_UNKNOWN];
        this.isDefault = !!opts.isDefault;
        this.abbreviations = opts.abbreviations;
        this.isWorldSelectable = !!opts.isWorldSelectable;
    }

    get identifier() {
        throw new Error(`Unimplemented!`);
    }
    get identifierWorld() {
        return this.isDefault ? "5etools" : this.identifier;
    }

    isCacheable() {
        throw new Error("Unimplemented!");
    }
    async pGetOutputs({uploadedFileMetas, customUrls}) {
        throw new Error("Unimplemented!");
    }

    async _pGetBrewUtil(...args) {
        if (this._brewUtil)
            return this._brewUtil;
        if (!this._isAutoDetectPrereleaseBrew)
            return null;
        return this._pGetBrewUtilAutodetected(...args);
    }

    async _pGetBrewUtilAutodetected(...args) {
        throw new Error("Unimplemented!");
    }

    async pLoadAndAddToAllContent({uploadedFileMetas, customUrls, allContent, cacheKeys=null}) {
        const meta = await this.pGetOutputs({
            uploadedFileMetas,
            customUrls
        });

        //At the moment, none of the content has any real link that connects it to a source, like a url
        //This means that if we have an item (say a race), we can't know for certain which source it came from
        //Let's address this by including cacheKeys (which should be urls of sources) into the content itself
        for(let content of meta.contents){ //
            for (let prop in content) {
                //Look for array properties in 'content' that are not named "_meta" or "$schema", but instead "race", "class" and so on
                if (content.hasOwnProperty(prop) && Array.isArray(content[prop]) && prop !== "_meta" && prop !== "$schema") {
                    //Make sure each race/class/item/background etc is given the cacheKeys
                    for(let i = 0; i < content[prop].length; ++i){

                        //Set the sourceCacheKeys
                        content[prop][i].sourceCacheKeys = meta.cacheKeys;

                        //Since subclasses are stored within classes, we need to check for subclasses and give them the sourceCacheKeys as well
                        if(prop == "class" && content[prop][i].subclasses != null){
                            for(let j = 0; j < content[prop][i].subclasses.length; ++j){
                                content[prop][i].subclasses[j].sourceCacheKeys = meta.cacheKeys;
                            }
                        }
                    }
                }
            }
        }

        allContent.push(...meta.contents);
        if (cacheKeys && this.isCacheable())
            cacheKeys.push(...meta.cacheKeys);
    }
};

UtilDataSource.DataSourceUrl = class extends UtilDataSource.DataSourceBase {
    /**
     * @param {string} name
     * @param {string} url
     * @param {{pPostLoad:Function, filterTypes:string[], abbreviations:string[], brewUtil:any, isExistingPrereleaseBrew:boolean}} opts
     */
    constructor(name, url, opts) {
        opts = opts || {};
        super(name, {
            isWorldSelectable: !!url,
            ...opts
        });

        this.url = url;
        this.source = opts.source;
        this.userData = opts.userData;
    }

    get identifier() {
        return this.url === "" ? `VE_SOURCE_CUSTOM_URL` : this.url;
    }
    get identifierWorld() {
        return this.source ?? super.identifierWorld;
    }

    isCacheable() {
        return true;
    }

    async pGetOutputs({uploadedFileMetas, customUrls}) {
        if (this.url === "") {
            customUrls = customUrls || [];

            let loadedDatas;
            try {
                loadedDatas = await Promise.all(customUrls.map(async url=>{
                    const brewUtil = await this._pGetBrewUtil(url);
                    if (brewUtil && !this._isExistingPrereleaseBrew)
                        await brewUtil.pAddBrewFromUrl(url);

                    const data = await DataUtil.loadJSON(url);
                    return this._pPostLoad ? this._pPostLoad(data, this.userData) : data;
                }
                ));
            } catch (e) {
                ui.notifications.error(`Failed to load one or more URLs! ${VeCt.STR_SEE_CONSOLE}`);
                throw e;
            }

            return {
                cacheKeys: customUrls,
                contents: loadedDatas,
            };
        }

        let data;
        try {
            const brewUtil = await this._pGetBrewUtil(this.url);
            if (brewUtil && !this._isExistingPrereleaseBrew)
                await brewUtil.pAddBrewFromUrl(this.url);

            data = await DataUtil.loadJSON(this.url);
            if (this._pPostLoad)
                data = await this._pPostLoad(data, this.userData);
        } catch (e) {
            const msg = `Failed to load URL "${this.url}"!`;
            //console.ui.notifications.error(`${msg} ${VeCt.STR_SEE_CONSOLE}`);
            console.error(msg);
            throw e;
        }
        
        return {
            cacheKeys: [this.url],
            contents: [data],
        };
    }

    async _pGetBrewUtilAutodetected(url) {
        const json = await DataUtil.loadJSON(url);
        const {isPrerelease, isBrew} = UtilDataSource.getSourceType(json, {
            isErrorOnMultiple: true
        });
        if (isPrerelease)
            return PrereleaseUtil;
        if (isBrew)
            return BrewUtil2;
        return null;
    }
};

UtilDataSource.DataSourceFile = class extends UtilDataSource.DataSourceBase {
    constructor(name, opts) {
        opts = opts || {};
        super(name, {
            isWorldSelectable: false,
            ...opts
        });

        this.isFile = true;
    }

    get identifier() {
        return `VE_SOURCE_CUSTOM_FILE`;
    }

    isCacheable() {
        return false;
    }

    async pGetOutputs({uploadedFileMetas, customUrls}) {
        uploadedFileMetas = uploadedFileMetas || [];

        const allContent = await uploadedFileMetas.pMap(async fileMeta=>{
            if (!fileMeta)
                return null;

            const brewUtil = await this._pGetBrewUtil(fileMeta.contents);
            if (brewUtil && !this._isExistingPrereleaseBrew)
                await brewUtil.pAddBrewsFromFiles([{
                    json: fileMeta.contents,
                    name: fileMeta.name
                }]);

            const contents = await DataUtil.pDoMetaMerge(CryptUtil.uid(), MiscUtil.copyFast(fileMeta.contents));

            return this._pPostLoad ? this._pPostLoad(contents, this.userData) : contents;
        }
        );

        return {
            contents: allContent.filter(it=>it != null),
        };
    }

    async _pGetBrewUtilAutodetected(json) {
        const {isPrerelease, isBrew} = UtilDataSource.getSourceType(json, {
            isErrorOnMultiple: true
        });
        if (isPrerelease)
            return PrereleaseUtil;
        if (isBrew)
            return BrewUtil2;
        return null;
    }
};

UtilDataSource.DataSourceSpecial = class extends UtilDataSource.DataSourceBase {

    /**
     * @param {string} name
     * @param {any} pGet
     * @param {{cacheKey:string}} opts
     * @returns {any}
     */
    constructor(name, pGet, opts) {
        opts = opts || {};
        super(name, { isWorldSelectable: true, ...opts });
        this.special = { pGet };
        if (!opts.cacheKey) { throw new Error(`No cache key specified!`); }
        this.cacheKey = opts.cacheKey;
    }

    get identifier() {
        return this.cacheKey;
    }

    isCacheable() {
        return true;
    }

    async pGetOutputs({uploadedFileMetas, customUrls}) {
        let loadedData;
        try {
            const json = await Vetools.pLoadImporterSourceSpecial(this);
            loadedData = json;
            if (this._pPostLoad)
                loadedData = await this._pPostLoad(loadedData, json, this.userData);
        } catch (e) {
            //ui.notifications
            console.error(`Failed to load pre-defined source "${this.cacheKey}"! ${VeCt.STR_SEE_CONSOLE}`);
            throw e;
        }
        return {
            cacheKeys: [this.cacheKey],
            contents: [loadedData],
        };
    }

    async _pGetBrewUtilAutodetected() {
        throw new Error("Unimplemented!");
    }
};
//#endregion

//#region List
class ListItem {
    constructor(ix, ele, name, values, data) {
        this.ix = ix;
        this.ele = ele;
        this.name = name;
        this.values = values || {};
        this.data = data || {};

        this.searchText = null;
        this.mutRegenSearchText();

        this._isSelected = false;
    }

    mutRegenSearchText() {
        let searchText = `${this.name} - `;
        for (const k in this.values) {
            const v = this.values[k];
            if (!v)
                continue;
            searchText += `${v} - `;
        }
        this.searchText = searchText.toAscii().toLowerCase();
    }

    set isSelected(val) {
        if (this._isSelected === val)
            return;
        this._isSelected = val;

        if (this.ele instanceof $) {
            if (this._isSelected)
                this.ele.addClass("list-multi-selected");
            else
                this.ele.removeClass("list-multi-selected");
        } else {
            if (this._isSelected)
                this.ele.classList.add("list-multi-selected");
            else
                this.ele.classList.remove("list-multi-selected");
        }
    }

    get isSelected() {
        return this._isSelected;
    }
}

class _ListSearch {
    #isInterrupted = false;

    #term = null;
    #fn = null;
    #items = null;

    constructor({term, fn, items}) {
        this.#term = term;
        this.#fn = fn;
        this.#items = [...items];
    }

    interrupt() {
        this.#isInterrupted = true;
    }

    async pRun() {
        const out = [];
        for (const item of this.#items) {
            if (this.#isInterrupted)
                break;
            if (await this.#fn(item, this.#term))
                out.push(item);
        }
        return {
            isInterrupted: this.#isInterrupted,
            searchedItems: out
        };
    }
}

class List {
    #activeSearch = null;

    constructor(opts) {
        if (opts.fnSearch && opts.isFuzzy)
            throw new Error(`The options "fnSearch" and "isFuzzy" are mutually incompatible!`);

        this._$iptSearch = opts.$iptSearch;
        this._$wrpList = opts.$wrpList;
        this._fnSort = opts.fnSort === undefined ? SortUtil.listSort : opts.fnSort;
        this._fnSearch = opts.fnSearch;
        this._syntax = opts.syntax;
        this._isFuzzy = !!opts.isFuzzy;
        this._isSkipSearchKeybindingEnter = !!opts.isSkipSearchKeybindingEnter;
        this._helpText = opts.helpText;

        this._items = [];
        this._eventHandlers = {};

        this._searchTerm = List._DEFAULTS.searchTerm;
        this._sortBy = opts.sortByInitial || List._DEFAULTS.sortBy;
        this._sortDir = opts.sortDirInitial || List._DEFAULTS.sortDir;
        this._sortByInitial = this._sortBy;
        this._sortDirInitial = this._sortDir;
        this._fnFilter = null;
        this._isUseJquery = opts.isUseJquery;

        if (this._isFuzzy)
            this._initFuzzySearch();

        this._searchedItems = [];
        this._filteredItems = [];
        this._sortedItems = [];

        this._isInit = false;
        this._isDirty = false;

        this._prevList = null;
        this._nextList = null;
        this._lastSelection = null;
        this._isMultiSelection = false;
    }

    get items() {
        return this._items;
    }
    get visibleItems() {
        return this._sortedItems;
    }
    get sortBy() {
        return this._sortBy;
    }
    get sortDir() {
        return this._sortDir;
    }
    set nextList(list) {
        this._nextList = list;
    }
    set prevList(list) {
        this._prevList = list;
    }

    setFnSearch(fn) {
        this._fnSearch = fn;
        this._isDirty = true;
    }

    init() {
        if (this._isInit){return;}

        if (this._$iptSearch) {
            UiUtil.bindTypingEnd({
                $ipt: this._$iptSearch,
                fnKeyup: ()=>this.search(this._$iptSearch.val())
            });
            this._searchTerm = List.getCleanSearchTerm(this._$iptSearch.val());
            this._init_bindKeydowns();

            const helpText = [...(this._helpText || []), ...Object.values(this._syntax || {}).filter(({help})=>help).map(({help})=>help), ];

            if (helpText.length)
                this._$iptSearch.title(helpText.join(" "));
        }

        this._doSearch();
        this._isInit = true;
    }

    _init_bindKeydowns() {
        this._$iptSearch.on("keydown", evt=>{
            if (evt._List__isHandled)
                return;

            switch (evt.key) {
            case "Escape":
                return this._handleKeydown_escape(evt);
            case "Enter":
                return this._handleKeydown_enter(evt);
            }
        }
        );
    }

    _handleKeydown_escape(evt) {
        evt._List__isHandled = true;

        if (!this._$iptSearch.val()) {
            $(document.activeElement).blur();
            return;
        }

        this._$iptSearch.val("");
        this.search("");
    }

    _handleKeydown_enter(evt) {
        if (this._isSkipSearchKeybindingEnter)
            return;

        if (IS_VTT)
            return;
        if (!EventUtil.noModifierKeys(evt))
            return;

        const firstVisibleItem = this.visibleItems[0];
        if (!firstVisibleItem)
            return;

        evt._List__isHandled = true;

        $(firstVisibleItem.ele).click();
        if (firstVisibleItem.values.hash)
            window.location.hash = firstVisibleItem.values.hash;
    }

    _initFuzzySearch() {
        elasticlunr.clearStopWords();
        this._fuzzySearch = elasticlunr(function() {
            this.addField("s");
            this.setRef("ix");
        });
        SearchUtil.removeStemmer(this._fuzzySearch);
    }

    update({isForce=false}={}) {
        if (!this._isInit || !this._isDirty || isForce)
            return false;
        this._doSearch();
        return true;
    }

    _doSearch() {
        this._doSearch_doInterruptExistingSearch();
        this._doSearch_doSearchTerm();
        this._doSearch_doPostSearchTerm();
    }

    _doSearch_doInterruptExistingSearch() {
        if (!this.#activeSearch)
            return;
        this.#activeSearch.interrupt();
        this.#activeSearch = null;
    }

    _doSearch_doSearchTerm() {
        if (this._doSearch_doSearchTerm_preSyntax())
            return;

        const matchingSyntax = this._doSearch_getMatchingSyntax();
        if (matchingSyntax) {
            if (this._doSearch_doSearchTerm_syntax(matchingSyntax))
                return;

            this._searchedItems = [];
            this._doSearch_doSearchTerm_pSyntax(matchingSyntax).then(isContinue=>{
                if (!isContinue)
                    return;
                this._doSearch_doPostSearchTerm();
            }
            );

            return;
        }

        if (this._isFuzzy)
            return this._searchedItems = this._doSearch_doSearchTerm_fuzzy();

        if (this._fnSearch)
            return this._searchedItems = this._items.filter(it=>this._fnSearch(it, this._searchTerm));

        this._searchedItems = this._items.filter(it=>this.constructor.isVisibleDefaultSearch(it, this._searchTerm));
    }

    _doSearch_doSearchTerm_preSyntax() {
        if (!this._searchTerm && !this._fnSearch) {
            this._searchedItems = [...this._items];
            return true;
        }
    }

    _doSearch_getMatchingSyntax() {
        const [command,term] = this._searchTerm.split(/^([a-z]+):/).filter(Boolean);
        if (!command || !term || !this._syntax?.[command])
            return null;
        return {
            term: this._doSearch_getSyntaxSearchTerm(term),
            syntax: this._syntax[command]
        };
    }

    _doSearch_getSyntaxSearchTerm(term) {
        if (!term.startsWith("/") || !term.endsWith("/"))
            return term;
        try {
            return new RegExp(term.slice(1, -1));
        } catch (ignored) {
            return term;
        }
    }

    _doSearch_doSearchTerm_syntax({term, syntax: {fn, isAsync}}) {
        if (isAsync)
            return false;

        this._searchedItems = this._items.filter(it=>fn(it, term));
        return true;
    }

    async _doSearch_doSearchTerm_pSyntax({term, syntax: {fn, isAsync}}) {
        if (!isAsync)
            return false;

        this.#activeSearch = new _ListSearch({
            term,
            fn,
            items: this._items,
        });
        const {isInterrupted, searchedItems} = await this.#activeSearch.pRun();

        if (isInterrupted)
            return false;
        this._searchedItems = searchedItems;
        return true;
    }

    static isVisibleDefaultSearch(li, searchTerm) {
        return li.searchText.includes(searchTerm);
    }

    _doSearch_doSearchTerm_fuzzy() {
        const results = this._fuzzySearch.search(this._searchTerm, {
            fields: {
                s: {
                    expand: true
                },
            },
            bool: "AND",
            expand: true,
        }, );

        return results.map(res=>this._items[res.doc.ix]);
    }

    _doSearch_doPostSearchTerm() {
        this._searchedItems = this._searchedItems.filter(it=>!it.data.isExcluded);

        this._doFilter();
    }

    getFilteredItems({items=null, fnFilter}={}) {
        items = items || this._searchedItems;
        fnFilter = fnFilter || this._fnFilter;

        if (!fnFilter)
            return items;

        return items.filter(it=>fnFilter(it));
    }

    _doFilter() {
        this._filteredItems = this.getFilteredItems();
        this._doSort();
    }

    getSortedItems({items=null}={}) {
        items = items || [...this._filteredItems];

        const opts = {
            sortBy: this._sortBy,
            sortDir: this._sortDir,
        };
        if (this._fnSort)
            items.sort((a,b)=>this._fnSort(a, b, opts));
        if (this._sortDir === "desc")
            items.reverse();

        return items;
    }

    _doSort() {
        this._sortedItems = this.getSortedItems();
        this._doRender();
    }

    _doRender() {
        const len = this._sortedItems.length;

        if (this._isUseJquery) {
            this._$wrpList.children().detach();
            for (let i = 0; i < len; ++i)
                this._$wrpList.append(this._sortedItems[i].ele);
        } else {
            this._$wrpList[0].innerHTML = "";
            const frag = document.createDocumentFragment();
            for (let i = 0; i < len; ++i)
                frag.appendChild(this._sortedItems[i].ele);
            this._$wrpList[0].appendChild(frag);
        }

        this._isDirty = false;
        this._trigger("updated");
    }

    search(searchTerm) {
        const nextTerm = List.getCleanSearchTerm(searchTerm);
        if (nextTerm === this._searchTerm)
            return;
        this._searchTerm = nextTerm;
        return this._doSearch();
    }

    filter(fnFilter) {
        if (this._fnFilter === fnFilter)
            return;
        this._fnFilter = fnFilter;
        this._doFilter();
    }

    sort(sortBy, sortDir) {
        if (this._sortBy !== sortBy || this._sortDir !== sortDir) {
            this._sortBy = sortBy;
            this._sortDir = sortDir;
            this._doSort();
        }
    }

    reset() {
        if (this._searchTerm !== List._DEFAULTS.searchTerm) {
            this._searchTerm = List._DEFAULTS.searchTerm;
            return this._doSearch();
        } else if (this._sortBy !== this._sortByInitial || this._sortDir !== this._sortDirInitial) {
            this._sortBy = this._sortByInitial;
            this._sortDir = this._sortDirInitial;
        }
    }

    addItem(listItem) {
        this._isDirty = true;
        this._items.push(listItem);

        if (this._isFuzzy)
            this._fuzzySearch.addDoc({
                ix: listItem.ix,
                s: listItem.searchText
            });
    }

    removeItem(listItem) {
        const ixItem = this._items.indexOf(listItem);
        return this.removeItemByIndex(listItem.ix, ixItem);
    }

    removeItemByIndex(ix, ixItem) {
        ixItem = ixItem ?? this._items.findIndex(it=>it.ix === ix);
        if (!~ixItem)
            return;

        this._isDirty = true;
        const removed = this._items.splice(ixItem, 1);

        if (this._isFuzzy)
            this._fuzzySearch.removeDocByRef(ix);

        return removed[0];
    }

    removeItemBy(valueName, value) {
        const ixItem = this._items.findIndex(it=>it.values[valueName] === value);
        return this.removeItemByIndex(ixItem, ixItem);
    }

    removeItemByData(dataName, value) {
        const ixItem = this._items.findIndex(it=>it.data[dataName] === value);
        return this.removeItemByIndex(ixItem, ixItem);
    }

    removeAllItems() {
        this._isDirty = true;
        this._items = [];
        if (this._isFuzzy)
            this._initFuzzySearch();
    }

    on(eventName, handler) {
        (this._eventHandlers[eventName] = this._eventHandlers[eventName] || []).push(handler);
    }

    off(eventName, handler) {
        if (!this._eventHandlers[eventName])
            return false;
        const ix = this._eventHandlers[eventName].indexOf(handler);
        if (!~ix)
            return false;
        this._eventHandlers[eventName].splice(ix, 1);
        return true;
    }

    _trigger(eventName) {
        (this._eventHandlers[eventName] || []).forEach(fn=>fn());
    }

    doAbsorbItems(dataArr, opts) {
        const children = [...this._$wrpList[0].children];

        const len = children.length;
        if (len !== dataArr.length)
            throw new Error(`Data source length and list element length did not match!`);

        for (let i = 0; i < len; ++i) {
            const node = children[i];
            const dataItem = dataArr[i];
            const listItem = new ListItem(i,node,opts.fnGetName(dataItem),opts.fnGetValues ? opts.fnGetValues(dataItem) : {},{},);
            if (opts.fnGetData)
                listItem.data = opts.fnGetData(listItem, dataItem);
            if (opts.fnBindListeners)
                opts.fnBindListeners(listItem, dataItem);
            this.addItem(listItem);
        }
    }

    doSelect(item, evt) {
        if (evt && evt.shiftKey) {
            evt.preventDefault();
            if (this._prevList && this._prevList._lastSelection) {
                this._prevList._selectFromItemToEnd(this._prevList._lastSelection, true);
                this._selectToItemFromStart(item);
            } else if (this._nextList && this._nextList._lastSelection) {
                this._nextList._selectToItemFromStart(this._nextList._lastSelection, true);
                this._selectFromItemToEnd(item);
            } else if (this._lastSelection && this.visibleItems.includes(item)) {
                this._doSelect_doMulti(item);
            } else {
                this._doSelect_doSingle(item);
            }
        } else
            this._doSelect_doSingle(item);
    }

    _doSelect_doSingle(item) {
        if (this._isMultiSelection) {
            this.deselectAll();
            if (this._prevList)
                this._prevList.deselectAll();
            if (this._nextList)
                this._nextList.deselectAll();
        } else if (this._lastSelection)
            this._lastSelection.isSelected = false;

        item.isSelected = true;
        this._lastSelection = item;
    }

    _doSelect_doMulti(item) {
        this._selectFromItemToItem(this._lastSelection, item);

        if (this._prevList && this._prevList._isMultiSelection) {
            this._prevList.deselectAll();
        }

        if (this._nextList && this._nextList._isMultiSelection) {
            this._nextList.deselectAll();
        }
    }

    _selectFromItemToEnd(item, isKeepLastSelection=false) {
        this.deselectAll(isKeepLastSelection);
        this._isMultiSelection = true;
        const ixStart = this.visibleItems.indexOf(item);
        const len = this.visibleItems.length;
        for (let i = ixStart; i < len; ++i) {
            this.visibleItems[i].isSelected = true;
        }
    }

    _selectToItemFromStart(item, isKeepLastSelection=false) {
        this.deselectAll(isKeepLastSelection);
        this._isMultiSelection = true;
        const ixEnd = this.visibleItems.indexOf(item);
        for (let i = 0; i <= ixEnd; ++i) {
            this.visibleItems[i].isSelected = true;
        }
    }

    _selectFromItemToItem(item1, item2) {
        this.deselectAll(true);

        if (item1 === item2) {
            if (this._lastSelection)
                this._lastSelection.isSelected = false;
            item1.isSelected = true;
            this._lastSelection = item1;
            return;
        }

        const ix1 = this.visibleItems.indexOf(item1);
        const ix2 = this.visibleItems.indexOf(item2);

        this._isMultiSelection = true;
        const [ixStart,ixEnd] = [ix1, ix2].sort(SortUtil.ascSort);
        for (let i = ixStart; i <= ixEnd; ++i) {
            this.visibleItems[i].isSelected = true;
        }
    }

    deselectAll(isKeepLastSelection=false) {
        if (!isKeepLastSelection)
            this._lastSelection = null;
        this._isMultiSelection = false;
        this._items.forEach(it=>it.isSelected = false);
    }

    updateSelected(item) {
        if (this.visibleItems.includes(item)) {
            if (this._isMultiSelection)
                this.deselectAll(true);

            if (this._lastSelection && this._lastSelection !== item)
                this._lastSelection.isSelected = false;

            item.isSelected = true;
            this._lastSelection = item;
        } else
            this.deselectAll();
    }

    getSelected() {
        return this.visibleItems.filter(it=>it.isSelected);
    }

    static getCleanSearchTerm(str) {
        return (str || "").toAscii().trim().toLowerCase().split(/\s+/g).join(" ");
    }
}
;
List._DEFAULTS = {
    searchTerm: "",
    sortBy: "name",
    sortDir: "asc",
    fnFilter: null,
};
//#endregion


//#region TabUIUtil
class TabUiUtilBase {
    static decorate(obj, {isInitMeta=false}={}) {
        if (isInitMeta) {
            obj.__meta = {};
            obj._meta = obj._getProxy("meta", obj.__meta);
        }

        obj.__tabState = {};

        obj._getTabProps = function({propProxy=TabUiUtilBase._DEFAULT_PROP_PROXY, tabGroup=TabUiUtilBase._DEFAULT_TAB_GROUP}={}) {
            return {
                propProxy,
                _propProxy: `_${propProxy}`,
                __propProxy: `__${propProxy}`,
                propActive: `ixActiveTab__${tabGroup}`,
            };
        }
        ;

        obj._renderTabs = function(tabMetas, {$parent, propProxy=TabUiUtilBase._DEFAULT_PROP_PROXY, tabGroup=TabUiUtilBase._DEFAULT_TAB_GROUP, cbTabChange, additionalClassesWrpHeads}={}) {
            if (!tabMetas.length)
                throw new Error(`One or more tab meta must be specified!`);
            obj._resetTabs({
                tabGroup
            });

            const isSingleTab = tabMetas.length === 1;

            const {propActive, _propProxy, __propProxy} = obj._getTabProps({
                propProxy,
                tabGroup
            });

            this[__propProxy][propActive] = this[__propProxy][propActive] || 0;

            const $dispTabTitle = obj.__$getDispTabTitle({
                isSingleTab
            });

            const renderTabMetas_standard = (it,i)=>{
                const $btnTab = obj.__$getBtnTab({
                    isSingleTab,
                    tabMeta: it,
                    _propProxy,
                    propActive,
                    ixTab: i,
                });

                const $wrpTab = obj.__$getWrpTab({
                    tabMeta: it,
                    ixTab: i
                });

                return {
                    ...it,
                    ix: i,
                    $btnTab,
                    $wrpTab,
                };
            }
            ;

            const tabMetasOut = tabMetas.map((it,i)=>{
                if (it.type)
                    return obj.__renderTypedTabMeta({
                        tabMeta: it,
                        ixTab: i
                    });
                return renderTabMetas_standard(it, i);
            }
            ).filter(Boolean);

            if ($parent)
                obj.__renderTabs_addToParent({
                    $dispTabTitle,
                    $parent,
                    tabMetasOut,
                    additionalClassesWrpHeads
                });

            const hkActiveTab = ()=>{
                tabMetasOut.forEach(it=>{
                    if (it.type)
                        return;
                    const isActive = it.ix === this[_propProxy][propActive];
                    if (isActive && $dispTabTitle)
                        $dispTabTitle.text(isSingleTab ? "" : it.name);
                    if (it.$btnTab)
                        it.$btnTab.toggleClass("active", isActive);
                    it.$wrpTab.toggleVe(isActive);
                }
                );

                if (cbTabChange)
                    cbTabChange();
            }
            ;
            this._addHook(propProxy, propActive, hkActiveTab);
            hkActiveTab();

            obj.__tabState[tabGroup] = {
                fnReset: ()=>{
                    this._removeHook(propProxy, propActive, hkActiveTab);
                }
                ,
                tabMetasOut,
            };

            return tabMetasOut;
        }
        ;

        obj.__renderTabs_addToParent = function({$dispTabTitle, $parent, tabMetasOut, additionalClassesWrpHeads}) {
            const hasBorder = tabMetasOut.some(it=>it.hasBorder);
            $$`<div class="ve-flex-col w-100 h-100">
				${$dispTabTitle}
				<div class="ve-flex-col w-100 h-100 min-h-0">
					<div class="ve-flex ${hasBorder ? `ui-tab__wrp-tab-heads--border` : ""} ${additionalClassesWrpHeads || ""}">${tabMetasOut.map(it=>it.$btnTab)}</div>
					<div class="ve-flex w-100 h-100 min-h-0">${tabMetasOut.map(it=>it.$wrpTab).filter(Boolean)}</div>
				</div>
			</div>`.appendTo($parent);
        }
        ;

        obj._resetTabs = function({tabGroup=TabUiUtilBase._DEFAULT_TAB_GROUP}={}) {
            if (!obj.__tabState[tabGroup])
                return;
            obj.__tabState[tabGroup].fnReset();
            delete obj.__tabState[tabGroup];
        }
        ;

        obj._hasPrevTab = function({propProxy=TabUiUtilBase._DEFAULT_PROP_PROXY, tabGroup=TabUiUtilBase._DEFAULT_TAB_GROUP}={}) {
            return obj.__hasTab({
                propProxy,
                tabGroup,
                offset: -1
            });
        }
        ;
        obj._hasNextTab = function({propProxy=TabUiUtilBase._DEFAULT_PROP_PROXY, tabGroup=TabUiUtilBase._DEFAULT_TAB_GROUP}={}) {
            return obj.__hasTab({
                propProxy,
                tabGroup,
                offset: 1
            });
        }
        ;

        obj.__hasTab = function({propProxy=TabUiUtilBase._DEFAULT_PROP_PROXY, tabGroup=TabUiUtilBase._DEFAULT_TAB_GROUP, offset}) {
            const {propActive, _propProxy} = obj._getTabProps({
                propProxy,
                tabGroup
            });
            const ixActive = obj[_propProxy][propActive];
            return !!(obj.__tabState[tabGroup]?.tabMetasOut && obj.__tabState[tabGroup]?.tabMetasOut[ixActive + offset]);
        }
        ;

        obj._doSwitchToPrevTab = function({propProxy=TabUiUtilBase._DEFAULT_PROP_PROXY, tabGroup=TabUiUtilBase._DEFAULT_TAB_GROUP}={}) {
            return obj.__doSwitchToTab({
                propProxy,
                tabGroup,
                offset: -1
            });
        }
        ;
        obj._doSwitchToNextTab = function({propProxy=TabUiUtilBase._DEFAULT_PROP_PROXY, tabGroup=TabUiUtilBase._DEFAULT_TAB_GROUP}={}) {
            return obj.__doSwitchToTab({
                propProxy,
                tabGroup,
                offset: 1
            });
        }
        ;

        obj.__doSwitchToTab = function({propProxy=TabUiUtilBase._DEFAULT_PROP_PROXY, tabGroup=TabUiUtilBase._DEFAULT_TAB_GROUP, offset}) {
            if (!obj.__hasTab({
                propProxy,
                tabGroup,
                offset
            }))
                return;
            const {propActive, _propProxy} = obj._getTabProps({
                propProxy,
                tabGroup
            });
            obj[_propProxy][propActive] = obj[_propProxy][propActive] + offset;
        }
        ;

        obj._addHookActiveTab = function(hook, {propProxy=TabUiUtilBase._DEFAULT_PROP_PROXY, tabGroup=TabUiUtilBase._DEFAULT_TAB_GROUP}={}) {
            const {propActive} = obj._getTabProps({
                propProxy,
                tabGroup
            });
            this._addHook(propProxy, propActive, hook);
        }
        ;

        obj._getIxActiveTab = function({propProxy=TabUiUtilBase._DEFAULT_PROP_PROXY, tabGroup=TabUiUtilBase._DEFAULT_TAB_GROUP}={}) {
            const {propActive, _propProxy} = obj._getTabProps({
                propProxy,
                tabGroup
            });
            return obj[_propProxy][propActive];
        }
        ;

        obj._setIxActiveTab = function({propProxy=TabUiUtilBase._DEFAULT_PROP_PROXY, tabGroup=TabUiUtilBase._DEFAULT_TAB_GROUP, ixActiveTab}={}) {
            const {propActive, _propProxy} = obj._getTabProps({
                propProxy,
                tabGroup
            });
            obj[_propProxy][propActive] = ixActiveTab;
        }
        ;

        obj._getActiveTab = function({propProxy=TabUiUtilBase._DEFAULT_PROP_PROXY, tabGroup=TabUiUtilBase._DEFAULT_TAB_GROUP}={}) {
            const tabState = obj.__tabState[tabGroup];
            const ixActiveTab = obj._getIxActiveTab({
                propProxy,
                tabGroup
            });
            return tabState.tabMetasOut[ixActiveTab];
        }
        ;

        obj._setActiveTab = function({propProxy=TabUiUtilBase._DEFAULT_PROP_PROXY, tabGroup=TabUiUtilBase._DEFAULT_TAB_GROUP, tab}) {
            const tabState = obj.__tabState[tabGroup];
            const ix = tabState.tabMetasOut.indexOf(tab);
            obj._setIxActiveTab({
                propProxy,
                tabGroup,
                ixActiveTab: ix
            });
        }
        ;

        obj.__$getBtnTab = function() {
            throw new Error("Unimplemented!");
        }
        ;
        obj.__$getWrpTab = function() {
            throw new Error("Unimplemented!");
        }
        ;
        obj.__renderTypedTabMeta = function() {
            throw new Error("Unimplemented!");
        }
        ;
        obj.__$getDispTabTitle = function() {
            throw new Error("Unimplemented!");
        }
        ;
    }
}
TabUiUtilBase._DEFAULT_TAB_GROUP = "_default";
TabUiUtilBase._DEFAULT_PROP_PROXY = "meta";

TabUiUtilBase.TabMeta = class {
    constructor({name, icon=null, type=null, buttons=null}={}) {
        this.name = name;
        this.icon = icon;
        this.type = type;
        this.buttons = buttons;
    }
}
;

let TabUiUtil$1 = class TabUiUtil extends TabUiUtilBase {
    static decorate(obj, {isInitMeta=false}={}) {
        super.decorate(obj, {
            isInitMeta
        });

        obj.__$getBtnTab = function({tabMeta, _propProxy, propActive, ixTab}) {
            return $(`<button class="btn btn-default ui-tab__btn-tab-head ${tabMeta.isHeadHidden ? "ve-hidden" : ""}">${tabMeta.name.qq()}</button>`).click(()=>obj[_propProxy][propActive] = ixTab);
        }
        ;

        obj.__$getWrpTab = function({tabMeta}) {
            return $(`<div class="ui-tab__wrp-tab-body ve-flex-col ve-hidden ${tabMeta.hasBorder ? "ui-tab__wrp-tab-body--border" : ""} ${tabMeta.hasBackground ? "ui-tab__wrp-tab-body--background" : ""}"></div>`);
        }
        ;

        obj.__renderTypedTabMeta = function({tabMeta, ixTab}) {
            switch (tabMeta.type) {
            case "buttons":
                return obj.__renderTypedTabMeta_buttons({
                    tabMeta,
                    ixTab
                });
            default:
                throw new Error(`Unhandled tab type "${tabMeta.type}"`);
            }
        }
        ;

        obj.__renderTypedTabMeta_buttons = function({tabMeta, ixTab}) {
            const $btns = tabMeta.buttons.map((meta,j)=>{
                const $btn = $(`<button class="btn ui-tab__btn-tab-head ${meta.type ? `btn-${meta.type}` : "btn-primary"}" ${meta.title ? `title="${meta.title.qq()}"` : ""}>${meta.html}</button>`).click(evt=>meta.pFnClick(evt, $btn));
                return $btn;
            }
            );

            const $btnTab = $$`<div class="btn-group ve-flex-v-right ve-flex-h-right ml-2 w-100">${$btns}</div>`;

            return {
                ...tabMeta,
                ix: ixTab,
                $btns,
                $btnTab,
            };
        }
        ;

        obj.__$getDispTabTitle = function() {
            return null;
        }
        ;
    }
}
;

globalThis.TabUiUtil = TabUiUtil$1;

TabUiUtil$1.TabMeta = class extends TabUiUtilBase.TabMeta {
    constructor(opts) {
        super(opts);
        this.hasBorder = !!opts.hasBorder;
        this.hasBackground = !!opts.hasBackground;
        this.isHeadHidden = !!opts.isHeadHidden;
        this.isNoPadding = !!opts.isNoPadding;
    }
}
;

let TabUiUtilSide$1 = class TabUiUtilSide extends TabUiUtilBase {
    static decorate(obj, {isInitMeta=false}={}) {
        super.decorate(obj, {
            isInitMeta
        });

        obj.__$getBtnTab = function({isSingleTab, tabMeta, _propProxy, propActive, ixTab}) {
            return isSingleTab ? null : $(`<button class="btn btn-default btn-sm ui-tab-side__btn-tab mb-2 br-0 btr-0 bbr-0 text-left ve-flex-v-center" title="${tabMeta.name.qq()}"><div class="${tabMeta.icon} ui-tab-side__icon-tab mr-2 mobile-ish__mr-0 ve-text-center"></div><div class="mobile-ish__hidden">${tabMeta.name.qq()}</div></button>`).click(()=>this[_propProxy][propActive] = ixTab);
        }
        ;

        obj.__$getWrpTab = function({tabMeta}) {
            return $(`<div class="ve-flex-col w-100 h-100 ui-tab-side__wrp-tab ${tabMeta.isNoPadding ? "" : "px-3 py-2"} overflow-y-auto"></div>`);
        }
        ;

        obj.__renderTabs_addToParent = function({$dispTabTitle, $parent, tabMetasOut}) {
            $$`<div class="ve-flex-col w-100 h-100">
				${$dispTabTitle}
				<div class="ve-flex w-100 h-100 min-h-0">
					<div class="ve-flex-col h-100 pt-2">${tabMetasOut.map(it=>it.$btnTab)}</div>
					<div class="ve-flex-col w-100 h-100 min-w-0">${tabMetasOut.map(it=>it.$wrpTab).filter(Boolean)}</div>
				</div>
			</div>`.appendTo($parent);
        }
        ;

        obj.__renderTypedTabMeta = function({tabMeta, ixTab}) {
            switch (tabMeta.type) {
            case "buttons":
                return obj.__renderTypedTabMeta_buttons({
                    tabMeta,
                    ixTab
                });
            default:
                throw new Error(`Unhandled tab type "${tabMeta.type}"`);
            }
        }
        ;

        obj.__renderTypedTabMeta_buttons = function({tabMeta, ixTab}) {
            const $btns = tabMeta.buttons.map((meta,j)=>{
                const $btn = $(`<button class="btn ${meta.type ? `btn-${meta.type}` : "btn-primary"} btn-sm" ${meta.title ? `title="${meta.title.qq()}"` : ""}>${meta.html}</button>`).click(evt=>meta.pFnClick(evt, $btn));

                if (j === tabMeta.buttons.length - 1)
                    $btn.addClass(`br-0 btr-0 bbr-0`);

                return $btn;
            }
            );

            const $btnTab = $$`<div class="btn-group ve-flex-v-center ve-flex-h-right mb-2">${$btns}</div>`;

            return {
                ...tabMeta,
                ix: ixTab,
                $btnTab,
            };
        }
        ;

        obj.__$getDispTabTitle = function({isSingleTab}) {
            return $(`<div class="ui-tab-side__disp-active-tab-name ${isSingleTab ? `ui-tab-side__disp-active-tab-name--single` : ""} bold"></div>`);
        }
        ;
    }
}
;

globalThis.TabUiUtilSide = TabUiUtilSide$1;
//#endregion

//#region ElementUtil
jQuery.fn.disableSpellcheck = function(){
    return this.attr("autocomplete", "new-password").attr("autocapitalize", "off").attr("spellcheck", "false");
}
jQuery.fn.hideVe = function() {
    this.classList.add("ve-hidden");
    return this;
}
globalThis.ElementUtil = {
    _ATTRS_NO_FALSY: new Set(["checked", "disabled", ]),

    getOrModify({tag, clazz, style, click, contextmenu, change, mousedown, mouseup, mousemove, pointerdown, pointerup, keydown, html, text, txt, ele, children, outer,
    id, name, title, val, href, type, tabindex, value, placeholder, attrs, data, }) {
        ele = ele || (outer ? (new DOMParser()).parseFromString(outer, "text/html").body.childNodes[0] : document.createElement(tag));

        if (clazz)
            ele.className = clazz;
        if (style)
            ele.setAttribute("style", style);
        if (click)
            ele.addEventListener("click", click);
        if (contextmenu)
            ele.addEventListener("contextmenu", contextmenu);
        if (change)
            ele.addEventListener("change", change);
        if (mousedown)
            ele.addEventListener("mousedown", mousedown);
        if (mouseup)
            ele.addEventListener("mouseup", mouseup);
        if (mousemove)
            ele.addEventListener("mousemove", mousemove);
        if (pointerdown)
            ele.addEventListener("pointerdown", pointerdown);
        if (pointerup)
            ele.addEventListener("pointerup", pointerup);
        if (keydown)
            ele.addEventListener("keydown", keydown);
        if (html != null)
            ele.innerHTML = html;
        if (text != null || txt != null)
            ele.textContent = text;
        if (id != null)
            ele.setAttribute("id", id);
        if (name != null)
            ele.setAttribute("name", name);
        if (title != null)
            ele.setAttribute("title", title);
        if (href != null)
            ele.setAttribute("href", href);
        if (val != null)
            ele.setAttribute("value", val);
        if (type != null)
            ele.setAttribute("type", type);
        if (tabindex != null)
            ele.setAttribute("tabindex", tabindex);
        if (value != null)
            ele.setAttribute("value", value);
        if (placeholder != null)
            ele.setAttribute("placeholder", placeholder);

        if (attrs != null) {
            for (const k in attrs) {
                if (attrs[k] === undefined)
                    continue;
                if (!attrs[k] && ElementUtil._ATTRS_NO_FALSY.has(k))
                    continue;
                ele.setAttribute(k, attrs[k]);
            }
        }

        if (data != null) {
            for (const k in data) {
                if (data[k] === undefined)
                    continue;
                ele.dataset[k] = data[k];
            }
        }

        if (children)
            for (let i = 0, len = children.length; i < len; ++i)
                if (children[i] != null)
                    ele.append(children[i]);

        ele.appends = ele.appends || ElementUtil._appends.bind(ele);
        ele.appendTo = ele.appendTo || ElementUtil._appendTo.bind(ele);
        ele.prependTo = ele.prependTo || ElementUtil._prependTo.bind(ele);
        ele.insertAfter = ele.insertAfter || ElementUtil._insertAfter.bind(ele);
        ele.addClass = ele.addClass || ElementUtil._addClass.bind(ele);
        ele.removeClass = ele.removeClass || ElementUtil._removeClass.bind(ele);
        ele.toggleClass = ele.toggleClass || ElementUtil._toggleClass.bind(ele);
        ele.showVe = ele.showVe || ElementUtil._showVe.bind(ele);
        ele.hideVe = ele.hideVe || ElementUtil._hideVe.bind(ele);
        ele.toggleVe = ele.toggleVe || ElementUtil._toggleVe.bind(ele);
        ele.empty = ele.empty || ElementUtil._empty.bind(ele);
        ele.detach = ele.detach || ElementUtil._detach.bind(ele);
        ele.attr = ele.attr || ElementUtil._attr.bind(ele);
        ele.val = ele.val || ElementUtil._val.bind(ele);
        ele.html = ele.html || ElementUtil._html.bind(ele);
        ele.txt = ele.txt || ElementUtil._txt.bind(ele);
        ele.tooltip = ele.tooltip || ElementUtil._tooltip.bind(ele);
        ele.disableSpellcheck = ele.disableSpellcheck || ElementUtil._disableSpellcheck.bind(ele);
        ele.on = ele.on || ElementUtil._onX.bind(ele);
        ele.onClick = ele.onClick || ElementUtil._onX.bind(ele, "click");
        ele.onContextmenu = ele.onContextmenu || ElementUtil._onX.bind(ele, "contextmenu");
        ele.onChange = ele.onChange || ElementUtil._onX.bind(ele, "change");
        ele.onKeydown = ele.onKeydown || ElementUtil._onX.bind(ele, "keydown");
        ele.onKeyup = ele.onKeyup || ElementUtil._onX.bind(ele, "keyup");

        return ele;
    },

    _appends(child) {
        this.appendChild(child);
        return this;
    },

    _appendTo(parent) {
        parent.appendChild(this);
        return this;
    },

    _prependTo(parent) {
        parent.prepend(this);
        return this;
    },

    _insertAfter(parent) {
        parent.after(this);
        return this;
    },

    _addClass(clazz) {
        this.classList.add(clazz);
        return this;
    },

    _removeClass(clazz) {
        this.classList.remove(clazz);
        return this;
    },

    _toggleClass(clazz, isActive) {
        if (isActive == null)
            this.classList.toggle(clazz);
        else if (isActive)
            this.classList.add(clazz);
        else
            this.classList.remove(clazz);
        return this;
    },

    _showVe() {
        this.classList.remove("ve-hidden");
        return this;
    },

    _hideVe() {
        this.classList.add("ve-hidden");
        return this;
    },

    _toggleVe(isActive) {
        this.toggleClass("ve-hidden", isActive == null ? isActive : !isActive);
        return this;
    },

    _empty() {
        this.innerHTML = "";
        return this;
    },

    _detach() {
        if (this.parentElement)
            this.parentElement.removeChild(this);
        return this;
    },

    _attr(name, value) {
        this.setAttribute(name, value);
        return this;
    },

    _html(html) {
        if (html === undefined)
            return this.innerHTML;
        this.innerHTML = html;
        return this;
    },

    _txt(txt) {
        if (txt === undefined)
            return this.innerText;
        this.innerText = txt;
        return this;
    },

    _tooltip(title) {
        return this.attr("title", title);
    },

    _disableSpellcheck() {
        return this.attr("autocomplete", "new-password").attr("autocapitalize", "off").attr("spellcheck", "false");
    },

    _onX(evtName, fn) {
        this.addEventListener(evtName, fn);
        return this;
    },

    _val(val) {
        if (val !== undefined) {
            switch (this.tagName) {
            case "SELECT":
                {
                    let selectedIndexNxt = -1;
                    for (let i = 0, len = this.options.length; i < len; ++i) {
                        if (this.options[i]?.value === val) {
                            selectedIndexNxt = i;
                            break;
                        }
                    }
                    this.selectedIndex = selectedIndexNxt;
                    return this;
                }

            default:
                {
                    this.value = val;
                    return this;
                }
            }
        }

        switch (this.tagName) {
        case "SELECT":
            return this.options[this.selectedIndex]?.value;

        default:
            return this.value;
        }
    },

    getIndexPathToParent(parent, child) {
        if (!parent.contains(child))
            return null;
        const path = [];

        while (child !== parent) {
            if (!child.parentElement)
                return null;
            const ix = [...child.parentElement.children].indexOf(child);
            if (!~ix)
                return null;
            path.push(ix);

            child = child.parentElement;
        }

        return path.reverse();
    },

    getChildByIndexPath(parent, indexPath) {
        for (let i = 0; i < indexPath.length; ++i) {
            const ix = indexPath[i];
            parent = parent.children[ix];
            if (!parent)
                return null;
        }
        return parent;
    },
};
if (typeof window !== "undefined"){window.e_ = ElementUtil.getOrModify;}
//#endregion

//#region CollectionUtil
globalThis.CollectionUtil = {
    ObjectSet: class ObjectSet {
        constructor() {
            this.map = new Map();
            this[Symbol.iterator] = this.values;
        }
        add(item) {
            this.map.set(item._toIdString(), item);
        }

        values() {
            return this.map.values();
        }
    }
    ,

    setEq(a, b) {
        if (a.size !== b.size)
            return false;
        for (const it of a)
            if (!b.has(it))
                return false;
        return true;
    },

    setDiff(set1, set2) {
        return new Set([...set1].filter(it=>!set2.has(it)));
    },

    objectDiff(obj1, obj2) {
        const out = {};

        [...new Set([...Object.keys(obj1), ...Object.keys(obj2)])].forEach(k=>{
            const diff = CollectionUtil._objectDiff_recurse(obj1[k], obj2[k]);
            if (diff !== undefined)
                out[k] = diff;
        }
        );

        return out;
    },

    _objectDiff_recurse(a, b) {
        if (CollectionUtil.deepEquals(a, b))
            return undefined;

        if (a && b && typeof a === "object" && typeof b === "object") {
            return CollectionUtil.objectDiff(a, b);
        }

        return b;
    },

    objectIntersect(obj1, obj2) {
        const out = {};

        [...new Set([...Object.keys(obj1), ...Object.keys(obj2)])].forEach(k=>{
            const diff = CollectionUtil._objectIntersect_recurse(obj1[k], obj2[k]);
            if (diff !== undefined)
                out[k] = diff;
        }
        );

        return out;
    },

    _objectIntersect_recurse(a, b) {
        if (CollectionUtil.deepEquals(a, b))
            return a;

        if (a && b && typeof a === "object" && typeof b === "object") {
            return CollectionUtil.objectIntersect(a, b);
        }

        return undefined;
    },

    deepEquals(a, b) {
        if (Object.is(a, b))
            return true;
        if (a && b && typeof a === "object" && typeof b === "object") {
            if (CollectionUtil._eq_isPlainObject(a) && CollectionUtil._eq_isPlainObject(b))
                return CollectionUtil._eq_areObjectsEqual(a, b);
            const isArrayA = Array.isArray(a);
            const isArrayB = Array.isArray(b);
            if (isArrayA || isArrayB)
                return isArrayA === isArrayB && CollectionUtil._eq_areArraysEqual(a, b);
            const isSetA = a instanceof Set;
            const isSetB = b instanceof Set;
            if (isSetA || isSetB)
                return isSetA === isSetB && CollectionUtil.setEq(a, b);
            return CollectionUtil._eq_areObjectsEqual(a, b);
        }
        return false;
    },

    _eq_isPlainObject: (value)=>value.constructor === Object || value.constructor == null,
    _eq_areObjectsEqual(a, b) {
        const keysA = Object.keys(a);
        const {length} = keysA;
        if (Object.keys(b).length !== length)
            return false;
        for (let i = 0; i < length; i++) {
            if (!b.hasOwnProperty(keysA[i]))
                return false;
            if (!CollectionUtil.deepEquals(a[keysA[i]], b[keysA[i]]))
                return false;
        }
        return true;
    },
    _eq_areArraysEqual(a, b) {
        const {length} = a;
        if (b.length !== length)
            return false;
        for (let i = 0; i < length; i++)
            if (!CollectionUtil.deepEquals(a[i], b[i]))
                return false;
        return true;
    },

    dfs(obj, opts) {
        const {prop=null, fnMatch=null} = opts;
        if (!prop && !fnMatch)
            throw new Error(`One of "prop" or "fnMatch" must be specified!`);

        if (obj instanceof Array) {
            for (const child of obj) {
                const n = CollectionUtil.dfs(child, opts);
                if (n)
                    return n;
            }
            return;
        }

        if (obj instanceof Object) {
            if (prop && obj[prop])
                return obj[prop];
            if (fnMatch && fnMatch(obj))
                return obj;

            for (const child of Object.values(obj)) {
                const n = CollectionUtil.dfs(child, opts);
                if (n)
                    return n;
            }
        }
    },

    bfs(obj, opts) {
        const {prop=null, fnMatch=null} = opts;
        if (!prop && !fnMatch)
            throw new Error(`One of "prop" or "fnMatch" must be specified!`);

        if (obj instanceof Array) {
            for (const child of obj) {
                if (!(child instanceof Array) && child instanceof Object) {
                    if (prop && child[prop])
                        return child[prop];
                    if (fnMatch && fnMatch(child))
                        return child;
                }
            }

            for (const child of obj) {
                const n = CollectionUtil.bfs(child, opts);
                if (n)
                    return n;
            }

            return;
        }

        if (obj instanceof Object) {
            if (prop && obj[prop])
                return obj[prop];
            if (fnMatch && fnMatch(obj))
                return obj;

            return CollectionUtil.bfs(Object.values(obj));
        }
    },
};
//#endregion

//#region UIUtil
let UiUtil$1 = class UiUtil {
    static strToInt(string, fallbackEmpty=0, opts) {
        return UiUtil$1._strToNumber(string, fallbackEmpty, opts, true);
    }

    static strToNumber(string, fallbackEmpty=0, opts) {
        return UiUtil$1._strToNumber(string, fallbackEmpty, opts, false);
    }

    static _strToNumber(string, fallbackEmpty=0, opts, isInt) {
        opts = opts || {};
        let out;
        string = string.trim();
        if (!string)
            out = fallbackEmpty;
        else {
            const num = UiUtil$1._parseStrAsNumber(string, isInt);
            out = isNaN(num) || !isFinite(num) ? opts.fallbackOnNaN !== undefined ? opts.fallbackOnNaN : 0 : num;
        }
        if (opts.max != null)
            out = Math.min(out, opts.max);
        if (opts.min != null)
            out = Math.max(out, opts.min);
        return out;
    }

    static strToBool(string, fallbackEmpty=null, opts) {
        opts = opts || {};
        if (!string)
            return fallbackEmpty;
        string = string.trim().toLowerCase();
        if (!string)
            return fallbackEmpty;
        return string === "true" ? true : string === "false" ? false : opts.fallbackOnNaB;
    }

    static intToBonus(int, {isPretty=false}={}) {
        return `${int >= 0 ? "+" : int < 0 ? (isPretty ? "\u2012" : "-") : ""}${Math.abs(int)}`;
    }

    static getEntriesAsText(entryArray) {
        if (!entryArray || !entryArray.length)
            return "";
        if (!(entryArray instanceof Array))
            return UiUtil$1.getEntriesAsText([entryArray]);

        return entryArray.map(it=>{
            if (typeof it === "string" || typeof it === "number")
                return it;

            return JSON.stringify(it, null, 2).split("\n").map(it=>`  ${it}`);
        }
        ).flat().join("\n");
    }

    static getTextAsEntries(text) {
        try {
            const lines = text.split("\n").filter(it=>it.trim()).map(it=>{
                if (/^\s/.exec(it))
                    return it;
                return `"${it.replace(/"/g, `\\"`)}",`;
            }
            ).map(it=>{
                if (/[}\]]$/.test(it.trim()))
                    return `${it},`;
                return it;
            }
            );
            const json = `[\n${lines.join("")}\n]`.replace(/(.*?)(,)(:?\s*]|\s*})/g, "$1$3");
            return JSON.parse(json);
        } catch (e) {
            const lines = text.split("\n").filter(it=>it.trim());
            const slice = lines.join(" \\ ").substring(0, 30);
            JqueryUtil.doToast({
                content: `Could not parse entries! Error was: ${e.message}<br>Text was: ${slice}${slice.length === 30 ? "..." : ""}`,
                type: "danger",
            });
            return lines;
        }
    }

    static getShowModal(opts) {
        opts = opts || {};

        const doc = (opts.window || window).document;

        UiUtil$1._initModalEscapeHandler({
            doc
        });
        UiUtil$1._initModalMouseupHandlers({
            doc
        });
        if (doc.activeElement)
            doc.activeElement.blur();
        let resolveModal;
        const pResolveModal = new Promise(resolve=>{
            resolveModal = resolve;
        }
        );

        const pHandleCloseClick = async(isDataEntered,...args)=>{
            if (opts.cbClose)
                await opts.cbClose(isDataEntered, ...args);
            resolveModal([isDataEntered, ...args]);

            if (opts.isIndestructible)
                wrpOverlay.detach();
            else
                wrpOverlay.remove();

            ContextUtil.closeAllMenus();

            doTeardown();
        }
        ;

        const doTeardown = ()=>{
            UiUtil$1._popFromModalStack(modalStackMeta);
            if (!UiUtil$1._MODAL_STACK.length)
                doc.body.classList.remove(`ui-modal__body-active`);
        }
        ;

        const doOpen = ()=>{
            wrpOverlay.appendTo(doc.body);
            doc.body.classList.add(`ui-modal__body-active`);
        }
        ;

        const wrpOverlay = e_({
            tag: "div",
            clazz: "ui-modal__overlay"
        });
        if (opts.zIndex != null)
            wrpOverlay.style.zIndex = `${opts.zIndex}`;
        if (opts.overlayColor != null)
            wrpOverlay.style.backgroundColor = `${opts.overlayColor}`;

        const overlayBlind = opts.isFullscreenModal ? e_({
            tag: "div",
            clazz: `ui-modal__overlay-blind w-100 h-100 ve-flex-col`,
        }).appendTo(wrpOverlay) : null;

        const wrpScroller = e_({
            tag: "div",
            clazz: `ui-modal__scroller ve-flex-col`,
        });

        const modalWindowClasses = [opts.isWidth100 ? `w-100` : "", opts.isHeight100 ? "h-100" : "", opts.isUncappedHeight ? "ui-modal__inner--uncap-height" : "", opts.isUncappedWidth ? "ui-modal__inner--uncap-width" : "", opts.isMinHeight0 ? `ui-modal__inner--no-min-height` : "", opts.isMinWidth0 ? `ui-modal__inner--no-min-width` : "", opts.isMaxWidth640p ? `ui-modal__inner--max-width-640p` : "", opts.isFullscreenModal ? `ui-modal__inner--mode-fullscreen my-0 pt-0` : "", opts.hasFooter ? `pb-0` : "", ].filter(Boolean);

        const btnCloseModal = opts.isFullscreenModal ? e_({
            tag: "button",
            clazz: `btn btn-danger btn-xs`,
            html: `<span class="glyphicon glyphicon-remove></span>`,
            click: pHandleCloseClick(false),
        }) : null;

        const modalFooter = opts.hasFooter ? e_({
            tag: "div",
            clazz: `no-shrink w-100 ve-flex-col ui-modal__footer ${opts.isFullscreenModal ? `ui-modal__footer--fullscreen mt-1` : "mt-auto"}`,
        }) : null;

        const modal = e_({
            tag: "div",
            clazz: `ui-modal__inner ve-flex-col ${modalWindowClasses.join(" ")}`,
            children: [!opts.isEmpty && opts.title ? e_({
                tag: "div",
                clazz: `split-v-center no-shrink ${opts.isHeaderBorder ? `ui-modal__header--border` : ""} ${opts.isFullscreenModal ? `ui-modal__header--fullscreen mb-1` : ""}`,
                children: [opts.title ? e_({
                    tag: "h4",
                    clazz: `my-2`,
                    html: opts.title.qq(),
                }) : null,
                opts.$titleSplit ? opts.$titleSplit[0] : null,
                btnCloseModal, ].filter(Boolean),
            }) : null,
            !opts.isEmpty ? wrpScroller : null,
            modalFooter, ].filter(Boolean),
        }).appendTo(opts.isFullscreenModal ? overlayBlind : wrpOverlay);

        wrpOverlay.addEventListener("mouseup", async evt=>{
            if (evt.target !== wrpOverlay)
                return;
            if (evt.target !== UiUtil$1._MODAL_LAST_MOUSEDOWN)
                return;
            if (opts.isPermanent)
                return;
            evt.stopPropagation();
            evt.preventDefault();
            return pHandleCloseClick(false);
        }
        );

        if (!opts.isClosed)
            doOpen();

        const modalStackMeta = {
            isPermanent: opts.isPermanent,
            pHandleCloseClick,
            doTeardown,
        };
        if (!opts.isClosed)
            UiUtil$1._pushToModalStack(modalStackMeta);

        const out = {
            $modal: $(modal),
            $modalInner: $(wrpScroller),
            $modalFooter: $(modalFooter),
            doClose: pHandleCloseClick,
            doTeardown,
            pGetResolved: ()=>pResolveModal,
        };

        if (opts.isIndestructible || opts.isClosed) {
            out.doOpen = ()=>{
                UiUtil$1._pushToModalStack(modalStackMeta);
                doOpen();
            }
            ;
        }

        return out;
    }

    static async pGetShowModal(opts) {
        return UiUtil$1.getShowModal(opts);
    }

    static _pushToModalStack(modalStackMeta) {
        if (!UiUtil$1._MODAL_STACK.includes(modalStackMeta)) {
            UiUtil$1._MODAL_STACK.push(modalStackMeta);
        }
    }

    static _popFromModalStack(modalStackMeta) {
        const ixStack = UiUtil$1._MODAL_STACK.indexOf(modalStackMeta);
        if (~ixStack)
            UiUtil$1._MODAL_STACK.splice(ixStack, 1);
    }

    static _initModalEscapeHandler({doc}) {
        if (UiUtil$1._MODAL_STACK)
            return;
        UiUtil$1._MODAL_STACK = [];

        doc.addEventListener("keydown", evt=>{
            if (evt.which !== 27)
                return;
            if (!UiUtil$1._MODAL_STACK.length)
                return;
            if (EventUtil.isInInput(evt))
                return;

            const outerModalMeta = UiUtil$1._MODAL_STACK.last();
            if (!outerModalMeta)
                return;
            evt.stopPropagation();
            if (!outerModalMeta.isPermanent)
                return outerModalMeta.pHandleCloseClick(false);
        }
        );
    }

    static _initModalMouseupHandlers({doc}) {
        doc.addEventListener("mousedown", evt=>{
            UiUtil$1._MODAL_LAST_MOUSEDOWN = evt.target;
        }
        );
    }

    static isAnyModalOpen() {
        return !!UiUtil$1._MODAL_STACK?.length;
    }

    static addModalSep($modalInner) {
        $modalInner.append(`<hr class="hr-2">`);
    }

    static $getAddModalRow($modalInner, tag="div") {
        return $(`<${tag} class="ui-modal__row"></${tag}>`).appendTo($modalInner);
    }

    static $getAddModalRowHeader($modalInner, headerText, opts) {
        opts = opts || {};
        const $row = UiUtil$1.$getAddModalRow($modalInner, "h5").addClass("bold");
        if (opts.$eleRhs)
            $$`<div class="split ve-flex-v-center w-100 pr-1"><span>${headerText}</span>${opts.$eleRhs}</div>`.appendTo($row);
        else
            $row.text(headerText);
        if (opts.helpText)
            $row.title(opts.helpText);
        return $row;
    }

    static $getAddModalRowCb($modalInner, labelText, objectWithProp, propName, helpText) {
        const $row = UiUtil$1.$getAddModalRow($modalInner, "label").addClass(`ui-modal__row--cb`);
        if (helpText)
            $row.title(helpText);
        $row.append(`<span>${labelText}</span>`);
        const $cb = $(`<input type="checkbox">`).appendTo($row).keydown(evt=>{
            if (evt.key === "Escape")
                $cb.blur();
        }
        ).prop("checked", objectWithProp[propName]).on("change", ()=>objectWithProp[propName] = $cb.prop("checked"));
        return $cb;
    }

    static $getAddModalRowCb2({$wrp, comp, prop, text, title=null}) {
        const $cb = ComponentUiUtil$1.$getCbBool(comp, prop);

        const $row = $$`<label class="split-v-center py-1 veapp__ele-hoverable">
			<span>${text}</span>
			${$cb}
		</label>`.appendTo($wrp);
        if (title)
            $row.title(title);

        return $cb;
    }

    static $getAddModalRowSel($modalInner, labelText, objectWithProp, propName, values, opts) {
        opts = opts || {};
        const $row = UiUtil$1.$getAddModalRow($modalInner, "label").addClass(`ui-modal__row--sel`);
        if (opts.helpText)
            $row.title(opts.helpText);
        $row.append(`<span>${labelText}</span>`);
        const $sel = $(`<select class="form-control input-xs w-30">`).appendTo($row);
        values.forEach((val,i)=>$(`<option value="${i}"></option>`).text(opts.fnDisplay ? opts.fnDisplay(val) : val).appendTo($sel));
        const ix = values.indexOf(objectWithProp[propName]);
        $sel.val(`${~ix ? ix : 0}`).change(()=>objectWithProp[propName] = values[$sel.val()]);
        return $sel;
    }

    static _parseStrAsNumber(str, isInt) {
        const wrpTree = Renderer.dice.lang.getTree3(str);
        if (!wrpTree)
            return NaN;
        const out = wrpTree.tree.evl({});
        if (!isNaN(out) && isInt)
            return Math.round(out);
        return out;
    }

    static bindTypingEnd({$ipt, fnKeyup, fnKeypress, fnKeydown, fnClick}={}) {
        let timerTyping;
        $ipt.on("keyup search paste", evt=>{
            clearTimeout(timerTyping);
            timerTyping = setTimeout(()=>{
                fnKeyup(evt);
            }
            , UiUtil$1.TYPE_TIMEOUT_MS);
        }
        ).on("blur", evt=>{
            clearTimeout(timerTyping);
            fnKeyup(evt);
        }
        ).on("keypress", evt=>{
            if (fnKeypress)
                fnKeypress(evt);
        }
        ).on("keydown", evt=>{
            if (fnKeydown)
                fnKeydown(evt);
            clearTimeout(timerTyping);
        }
        ).on("click", ()=>{
            if (fnClick)
                fnClick();
        }
        ).on("instantKeyup", ()=>{
            clearTimeout(timerTyping);
            fnKeyup();
        }
        );
    }

    static async pDoForceFocus(ele, {timeout=250}={}) {
        if (!ele)
            return;
        ele.focus();

        const forceFocusStart = Date.now();
        while ((Date.now() < forceFocusStart + timeout) && document.activeElement !== ele) {
            await MiscUtil.pDelay(33);
            ele.focus();
        }
    }
}
;
UiUtil$1.SEARCH_RESULTS_CAP = 75;
UiUtil$1.TYPE_TIMEOUT_MS = 100;
UiUtil$1._MODAL_STACK = null;
UiUtil$1._MODAL_LAST_MOUSEDOWN = null;
globalThis.UiUtil = UiUtil$1;

let ListSelectClickHandlerBase$1 = class ListSelectClickHandlerBase {
    static _EVT_PASS_THOUGH_TAGS = new Set(["A", "BUTTON"]);

    constructor() {
        this._firstSelection = null;
        this._lastSelection = null;

        this._selectionInitialValue = null;
    }

    get _visibleItems() {
        throw new Error("Unimplemented!");
    }

    get _allItems() {
        throw new Error("Unimplemented!");
    }

    _getCb(item, opts) {
        throw new Error("Unimplemented!");
    }

    _setCheckbox(item, opts) {
        throw new Error("Unimplemented!");
    }

    _setHighlighted(item, opts) {
        throw new Error("Unimplemented!");
    }

    handleSelectClick(item, evt, opts) {
        opts = opts || {};

        if (opts.isPassThroughEvents) {
            const evtPath = evt.composedPath();
            const subEles = evtPath.slice(0, evtPath.indexOf(evt.currentTarget));
            if (subEles.some(ele=>this.constructor._EVT_PASS_THOUGH_TAGS.has(ele?.tagName)))
                return;
        }

        evt.preventDefault();
        evt.stopPropagation();

        const cb = this._getCb(item, opts);
        if (cb.disabled)
            return true;

        if (evt && evt.shiftKey && this._firstSelection) {
            if (this._lastSelection === item) {

                this._setCheckbox(item, {
                    ...opts,
                    toVal: !cb.checked
                });
            } else if (this._firstSelection === item && this._lastSelection) {

                const ix1 = this._visibleItems.indexOf(this._firstSelection);
                const ix2 = this._visibleItems.indexOf(this._lastSelection);

                const [ixStart,ixEnd] = [ix1, ix2].sort(SortUtil.ascSort);
                for (let i = ixStart; i <= ixEnd; ++i) {
                    const it = this._visibleItems[i];
                    this._setCheckbox(it, {
                        ...opts,
                        toVal: false
                    });
                }

                this._setCheckbox(item, opts);
            } else {
                this._selectionInitialValue = this._getCb(this._firstSelection, opts).checked;

                const ix1 = this._visibleItems.indexOf(this._firstSelection);
                const ix2 = this._visibleItems.indexOf(item);
                const ix2Prev = this._lastSelection ? this._visibleItems.indexOf(this._lastSelection) : null;

                const [ixStart,ixEnd] = [ix1, ix2].sort(SortUtil.ascSort);
                const nxtOpts = {
                    ...opts,
                    toVal: this._selectionInitialValue
                };
                for (let i = ixStart; i <= ixEnd; ++i) {
                    const it = this._visibleItems[i];
                    this._setCheckbox(it, nxtOpts);
                }

                if (this._selectionInitialValue && ix2Prev != null) {
                    if (ix2Prev > ixEnd) {
                        const nxtOpts = {
                            ...opts,
                            toVal: !this._selectionInitialValue
                        };
                        for (let i = ixEnd + 1; i <= ix2Prev; ++i) {
                            const it = this._visibleItems[i];
                            this._setCheckbox(it, nxtOpts);
                        }
                    } else if (ix2Prev < ixStart) {
                        const nxtOpts = {
                            ...opts,
                            toVal: !this._selectionInitialValue
                        };
                        for (let i = ix2Prev; i < ixStart; ++i) {
                            const it = this._visibleItems[i];
                            this._setCheckbox(it, nxtOpts);
                        }
                    }
                }
            }

            this._lastSelection = item;
        } else {

            const cbMaster = this._getCb(item, opts);
            if (cbMaster) {
                cbMaster.checked = !cbMaster.checked;

                if (opts.fnOnSelectionChange)
                    opts.fnOnSelectionChange(item, cbMaster.checked);

                if (!opts.isNoHighlightSelection) {
                    this._setHighlighted(item, cbMaster.checked);
                }
            } else {
                if (!opts.isNoHighlightSelection) {
                    this._setHighlighted(item, false);
                }
            }

            this._firstSelection = item;
            this._lastSelection = null;
            this._selectionInitialValue = null;
        }
    }

    handleSelectClickRadio(item, evt) {
        evt.preventDefault();
        evt.stopPropagation();

        this._allItems.forEach(itemOther=>{
            const cb = this._getCb(itemOther);

            if (itemOther === item) {
                cb.checked = true;
                this._setHighlighted(itemOther, true);
            } else {
                cb.checked = false;
                this._setHighlighted(itemOther, false);
            }
        }
        );
    }
}
;

globalThis.ListSelectClickHandlerBase = ListSelectClickHandlerBase$1;

let ListSelectClickHandler$1 = class ListSelectClickHandler extends ListSelectClickHandlerBase$1 {
    constructor({list}) {
        super();
        this._list = list;
    }

    get _visibleItems() {
        return this._list.visibleItems;
    }

    get _allItems() {
        return this._list.items;
    }

    _getCb(item, opts={}) {
        return opts.fnGetCb ? opts.fnGetCb(item) : item.data.cbSel;
    }

    _setCheckbox(item, opts={}) {
        return this.setCheckbox(item, opts);
    }

    _setHighlighted(item, isHighlighted) {
        if (isHighlighted)
            item.ele instanceof $ ? item.ele.addClass("list-multi-selected") : item.ele.classList.add("list-multi-selected");
        else
            item.ele instanceof $ ? item.ele.removeClass("list-multi-selected") : item.ele.classList.remove("list-multi-selected");
    }

    setCheckbox(item, {fnGetCb, fnOnSelectionChange, isNoHighlightSelection, toVal=true}={}) {
        const cbSlave = this._getCb(item, {
            fnGetCb,
            fnOnSelectionChange,
            isNoHighlightSelection
        });

        if (cbSlave?.disabled)
            return;

        if (cbSlave) {
            cbSlave.checked = toVal;
            if (fnOnSelectionChange)
                fnOnSelectionChange(item, toVal);
        }

        if (isNoHighlightSelection)
            return;

        this._setHighlighted(item, toVal);
    }

    bindSelectAllCheckbox($cbAll) {
        $cbAll.change(()=>{
            const isChecked = $cbAll.prop("checked");
            this.setCheckboxes({
                isChecked
            });
        }
        );
    }

    setCheckboxes({isChecked, isIncludeHidden}) {
        (isIncludeHidden ? this._list.items : this._list.visibleItems).forEach(item=>{
            if (item.data.cbSel?.disabled)
                return;

            if (item.data.cbSel)
                item.data.cbSel.checked = isChecked;

            this._setHighlighted(item, isChecked);
        }
        );
    }
}
;

globalThis.ListSelectClickHandler = ListSelectClickHandler$1;

let ListUiUtil$1 = class ListUiUtil {
    static bindPreviewButton(page, allData, item, btnShowHidePreview, {$fnGetPreviewStats}={}) {
        btnShowHidePreview.addEventListener("click", evt=>{
            const entity = allData[item.ix];
            page = page || entity?.__prop;

            const elePreviewWrp = this.getOrAddListItemPreviewLazy(item);

            this.handleClickBtnShowHideListPreview(evt, page, entity, btnShowHidePreview, elePreviewWrp, {
                $fnGetPreviewStats
            });
        }
        );
    }

    static handleClickBtnShowHideListPreview(evt, page, entity, btnShowHidePreview, elePreviewWrp, {nxtText=null, $fnGetPreviewStats}={}) {
        evt.stopPropagation();
        evt.preventDefault();

        nxtText = nxtText ?? btnShowHidePreview.innerHTML.trim() === this.HTML_GLYPHICON_EXPAND ? this.HTML_GLYPHICON_CONTRACT : this.HTML_GLYPHICON_EXPAND;
        const isHidden = nxtText === this.HTML_GLYPHICON_EXPAND;
        const isFluff = !!evt.shiftKey;

        elePreviewWrp.classList.toggle("ve-hidden", isHidden);
        btnShowHidePreview.innerHTML = nxtText;

        const elePreviewWrpInner = elePreviewWrp.lastElementChild;

        const isForce = (elePreviewWrp.dataset.dataType === "stats" && isFluff) || (elePreviewWrp.dataset.dataType === "fluff" && !isFluff);
        if (!isForce && elePreviewWrpInner.innerHTML)
            return;

        $(elePreviewWrpInner).empty().off("click").on("click", evt=>{
            evt.stopPropagation();
        }
        );

        if (isHidden)
            return;

        elePreviewWrp.dataset.dataType = isFluff ? "fluff" : "stats";

        const doAppendStatView = ()=>($fnGetPreviewStats || Renderer.hover.$getHoverContent_stats)(page, entity, {
            isStatic: true
        }).appendTo(elePreviewWrpInner);

        if (!evt.shiftKey || !UrlUtil.URL_TO_HASH_BUILDER[page]) {
            doAppendStatView();
            return;
        }

        Renderer.hover.pGetHoverableFluff(page, entity.source, UrlUtil.URL_TO_HASH_BUILDER[page](entity)).then(fluffEntity=>{
            if (elePreviewWrpInner.innerHTML)
                return;

            if (!fluffEntity)
                return doAppendStatView();
            Renderer.hover.$getHoverContent_fluff(page, fluffEntity).appendTo(elePreviewWrpInner);
        }
        );
    }

    static getOrAddListItemPreviewLazy(item) {
        let elePreviewWrp;
        if (item.ele.children.length === 1) {
            elePreviewWrp = e_({
                ag: "div",
                clazz: "ve-hidden ve-flex",
                children: [e_({
                    tag: "div",
                    clazz: "col-0-5"
                }), e_({
                    tag: "div",
                    clazz: "col-11-5 ui-list__wrp-preview py-2 pr-2"
                }), ],
            }).appendTo(item.ele);
        } else
            elePreviewWrp = item.ele.lastElementChild;
        return elePreviewWrp;
    }

    static bindPreviewAllButton($btnAll, list) {
        $btnAll.click(async()=>{
            const nxtHtml = $btnAll.html() === ListUiUtil$1.HTML_GLYPHICON_EXPAND ? ListUiUtil$1.HTML_GLYPHICON_CONTRACT : ListUiUtil$1.HTML_GLYPHICON_EXPAND;

            if (nxtHtml === ListUiUtil$1.HTML_GLYPHICON_CONTRACT && list.visibleItems.length > 500) {
                const isSure = await InputUiUtil.pGetUserBoolean({
                    title: "Are You Sure?",
                    htmlDescription: `You are about to expand ${list.visibleItems.length} rows. This may seriously degrade performance.<br>Are you sure you want to continue?`,
                });
                if (!isSure)
                    return;
            }

            $btnAll.html(nxtHtml);

            list.visibleItems.forEach(listItem=>{
                if (listItem.data.btnShowHidePreview.innerHTML !== nxtHtml)
                    listItem.data.btnShowHidePreview.click();
            }
            );
        }
        );
    }

    static ListSyntax = class {
        static _READONLY_WALKER = null;

        constructor({fnGetDataList, pFnGetFluff, }, ) {
            this._fnGetDataList = fnGetDataList;
            this._pFnGetFluff = pFnGetFluff;
        }

        get _dataList() {
            return this._fnGetDataList();
        }

        build() {
            return {
                stats: {
                    help: `"stats:<text>" ("/text/" for regex) to search within stat blocks.`,
                    fn: (listItem,searchTerm)=>{
                        if (listItem.data._textCacheStats == null)
                            listItem.data._textCacheStats = this._getSearchCacheStats(this._dataList[listItem.ix]);
                        return this._listSyntax_isTextMatch(listItem.data._textCacheStats, searchTerm);
                    }
                    ,
                },
                info: {
                    help: `"info:<text>" ("/text/" for regex) to search within info.`,
                    fn: async(listItem,searchTerm)=>{
                        if (listItem.data._textCacheFluff == null)
                            listItem.data._textCacheFluff = await this._pGetSearchCacheFluff(this._dataList[listItem.ix]);
                        return this._listSyntax_isTextMatch(listItem.data._textCacheFluff, searchTerm);
                    }
                    ,
                    isAsync: true,
                },
                text: {
                    help: `"text:<text>" ("/text/" for regex) to search within stat blocks plus info.`,
                    fn: async(listItem,searchTerm)=>{
                        if (listItem.data._textCacheAll == null) {
                            const {textCacheStats, textCacheFluff, textCacheAll} = await this._pGetSearchCacheAll(this._dataList[listItem.ix], {
                                textCacheStats: listItem.data._textCacheStats,
                                textCacheFluff: listItem.data._textCacheFluff
                            });
                            listItem.data._textCacheStats = listItem.data._textCacheStats || textCacheStats;
                            listItem.data._textCacheFluff = listItem.data._textCacheFluff || textCacheFluff;
                            listItem.data._textCacheAll = textCacheAll;
                        }
                        return this._listSyntax_isTextMatch(listItem.data._textCacheAll, searchTerm);
                    }
                    ,
                    isAsync: true,
                },
            };
        }

        _listSyntax_isTextMatch(str, searchTerm) {
            if (!str)
                return false;
            if (searchTerm instanceof RegExp)
                return searchTerm.test(str);
            return str.includes(searchTerm);
        }

        _getSearchCacheStats(entity) {
            return this._getSearchCache_entries(entity);
        }

        static _INDEXABLE_PROPS_ENTRIES = ["entries", ];

        _getSearchCache_entries(entity, {indexableProps=null}={}) {
            if ((indexableProps || this.constructor._INDEXABLE_PROPS_ENTRIES).every(it=>!entity[it]))
                return "";
            const ptrOut = {
                _: ""
            };
            (indexableProps || this.constructor._INDEXABLE_PROPS_ENTRIES).forEach(it=>this._getSearchCache_handleEntryProp(entity, it, ptrOut));
            return ptrOut._;
        }

        _getSearchCache_handleEntryProp(entity, prop, ptrOut) {
            if (!entity[prop])
                return;

            this.constructor._READONLY_WALKER = this.constructor._READONLY_WALKER || MiscUtil.getWalker({
                keyBlocklist: new Set(["type", "colStyles", "style"]),
                isNoModification: true,
            });

            this.constructor._READONLY_WALKER.walk(entity[prop], {
                string: (str)=>this._getSearchCache_handleString(ptrOut, str),
            }, );
        }

        _getSearchCache_handleString(ptrOut, str) {
            ptrOut._ += `${Renderer.stripTags(str).toLowerCase()} -- `;
        }

        async _pGetSearchCacheFluff(entity) {
            const fluff = this._pFnGetFluff ? await this._pFnGetFluff(entity) : null;
            return fluff ? this._getSearchCache_entries(fluff, {
                indexableProps: ["entries"]
            }) : "";
        }

        async _pGetSearchCacheAll(entity, {textCacheStats=null, textCacheFluff=null}) {
            textCacheStats = textCacheStats || this._getSearchCacheStats(entity);
            textCacheFluff = textCacheFluff || await this._pGetSearchCacheFluff(entity);
            return {
                textCacheStats,
                textCacheFluff,
                textCacheAll: [textCacheStats, textCacheFluff].filter(Boolean).join(" -- "),
            };
        }
    }
    ;

}
;
ListUiUtil$1.HTML_GLYPHICON_EXPAND = `[+]`;
ListUiUtil$1.HTML_GLYPHICON_CONTRACT = `[\u2012]`;

globalThis.ListUiUtil = ListUiUtil$1;
//#endregion

//#region ComponentUiUtil
class ComponentUiUtil {
    static trackHook(hooks, prop, hook) {
        hooks[prop] = hooks[prop] || [];
        hooks[prop].push(hook);
    }

    static $getDisp(comp, prop, {html, $ele, fnGetText}={}) {
        $ele = ($ele || $(html || `<div></div>`));

        const hk = ()=>$ele.text(fnGetText ? fnGetText(comp._state[prop]) : comp._state[prop]);
        comp._addHookBase(prop, hk);
        hk();

        return $ele;
    }

    static $getIptInt(component, prop, fallbackEmpty=0, opts) {
        return ComponentUiUtil._$getIptNumeric(component, prop, UiUtil$1.strToInt, fallbackEmpty, opts);
    }

    static $getIptNumber(component, prop, fallbackEmpty=0, opts) {
        return ComponentUiUtil._$getIptNumeric(component, prop, UiUtil$1.strToNumber, fallbackEmpty, opts);
    }

    static _$getIptNumeric(component, prop, fnConvert, fallbackEmpty=0, opts) {
        opts = opts || {};
        opts.offset = opts.offset || 0;

        const setIptVal = ()=>{
            if (opts.isAllowNull && component._state[prop] == null) {
                return $ipt.val(null);
            }

            const num = (component._state[prop] || 0) + opts.offset;
            const val = opts.padLength ? `${num}`.padStart(opts.padLength, "0") : num;
            $ipt.val(val);
        }
        ;

        const $ipt = (opts.$ele || $(opts.html || `<input class="form-control input-xs form-control--minimal text-right">`)).disableSpellcheck().keydown(evt=>{
            if (evt.key === "Escape")
                $ipt.blur();
        }
        ).change(()=>{
            const raw = $ipt.val().trim();
            const cur = component._state[prop];

            if (opts.isAllowNull && !raw)
                return component._state[prop] = null;

            if (raw.startsWith("=")) {
                component._state[prop] = fnConvert(raw.slice(1), fallbackEmpty, opts) - opts.offset;
            } else {
                const mUnary = prevValue != null && prevValue < 0 ? /^[+/*^]/.exec(raw) : /^[-+/*^]/.exec(raw);
                if (mUnary) {
                    let proc = raw;
                    proc = proc.slice(1).trim();
                    const mod = fnConvert(proc, fallbackEmpty, opts);
                    const full = `${cur}${mUnary[0]}${mod}`;
                    component._state[prop] = fnConvert(full, fallbackEmpty, opts) - opts.offset;
                } else {
                    component._state[prop] = fnConvert(raw, fallbackEmpty, opts) - opts.offset;
                }
            }

            if (cur === component._state[prop])
                setIptVal();
        }
        );

        let prevValue;
        const hook = ()=>{
            prevValue = component._state[prop];
            setIptVal();
        }
        ;
        if (opts.hookTracker)
            ComponentUiUtil.trackHook(opts.hookTracker, prop, hook);
        component._addHookBase(prop, hook);
        hook();

        if (opts.asMeta)
            return this._getIptDecoratedMeta(component, prop, $ipt, hook, opts);
        else
            return $ipt;
    }

    static $getIptStr(component, prop, opts) {
        opts = opts || {};

        if ((opts.decorationLeft || opts.decorationRight) && !opts.asMeta)
            throw new Error(`Input must be created with "asMeta" option`);

        const $ipt = (opts.$ele || $(opts.html || `<input class="form-control input-xs form-control--minimal">`)).keydown(evt=>{
            if (evt.key === "Escape")
                $ipt.blur();
        }
        ).disableSpellcheck();
        UiUtil.bindTypingEnd({
            $ipt,
            fnKeyup: ()=>{
                const nxtVal = opts.isNoTrim ? $ipt.val() : $ipt.val().trim();
                component._state[prop] = opts.isAllowNull && !nxtVal ? null : nxtVal;
            }
            ,
        });

        if (opts.placeholder)
            $ipt.attr("placeholder", opts.placeholder);

        if (opts.autocomplete && opts.autocomplete.length)
            $ipt.typeahead({
                source: opts.autocomplete
            });
        const hook = ()=>{
            if (component._state[prop] == null)
                $ipt.val(null);
            else {
                if ($ipt.val().trim() !== component._state[prop])
                    $ipt.val(component._state[prop]);
            }
        }
        ;
        component._addHookBase(prop, hook);
        hook();

        if (opts.asMeta)
            return this._getIptDecoratedMeta(component, prop, $ipt, hook, opts);
        else
            return $ipt;
    }

    static _getIptDecoratedMeta(component, prop, $ipt, hook, opts) {
        const out = {
            $ipt,
            unhook: ()=>component._removeHookBase(prop, hook)
        };

        if (opts.decorationLeft || opts.decorationRight) {
            let $decorLeft;
            let $decorRight;

            if (opts.decorationLeft) {
                $ipt.addClass(`ui-ideco__ipt ui-ideco__ipt--left`);
                $decorLeft = ComponentUiUtil._$getDecor(component, prop, $ipt, opts.decorationLeft, "left", opts);
            }

            if (opts.decorationRight) {
                $ipt.addClass(`ui-ideco__ipt ui-ideco__ipt--right`);
                $decorRight = ComponentUiUtil._$getDecor(component, prop, $ipt, opts.decorationRight, "right", opts);
            }

            out.$wrp = $$`<div class="relative w-100">${$ipt}${$decorLeft}${$decorRight}</div>`;
        }

        return out;
    }

    static _$getDecor(component, prop, $ipt, decorType, side, opts) {
        switch (decorType) {
        case "search":
            {
                return $(`<div class="ui-ideco__wrp ui-ideco__wrp--${side} no-events ve-flex-vh-center"><span class="glyphicon glyphicon-search"></span></div>`);
            }
        case "clear":
            {
                return $(`<div class="ui-ideco__wrp ui-ideco__wrp--${side} ve-flex-vh-center clickable" title="Clear"><span class="glyphicon glyphicon-remove"></span></div>`).click(()=>$ipt.val("").change().keydown().keyup());
            }
        case "ticker":
            {
                const isValidValue = val=>{
                    if (opts.max != null && val > opts.max)
                        return false;
                    if (opts.min != null && val < opts.min)
                        return false;
                    return true;
                }
                ;

                const handleClick = (delta)=>{
                    const nxt = component._state[prop] + delta;
                    if (!isValidValue(nxt))
                        return;
                    component._state[prop] = nxt;
                    $ipt.focus();
                }
                ;

                const $btnUp = $(`<button class="btn btn-default ui-ideco__btn-ticker bold no-select">+</button>`).click(()=>handleClick(1));

                const $btnDown = $(`<button class="btn btn-default ui-ideco__btn-ticker bold no-select">\u2012</button>`).click(()=>handleClick(-1));

                return $$`<div class="ui-ideco__wrp ui-ideco__wrp--${side} ve-flex-vh-center ve-flex-col">
					${$btnUp}
					${$btnDown}
				</div>`;
            }
        case "spacer":
            {
                return "";
            }
        default:
            throw new Error(`Unimplemented!`);
        }
    }

    static $getIptEntries(component, prop, opts) {
        opts = opts || {};

        const $ipt = (opts.$ele || $(`<textarea class="form-control input-xs form-control--minimal resize-vertical"></textarea>`)).keydown(evt=>{
            if (evt.key === "Escape")
                $ipt.blur();
        }
        ).change(()=>component._state[prop] = UiUtil$1.getTextAsEntries($ipt.val().trim()));
        const hook = ()=>$ipt.val(UiUtil$1.getEntriesAsText(component._state[prop]));
        component._addHookBase(prop, hook);
        hook();
        return $ipt;
    }

    static $getIptColor(component, prop, opts) {
        opts = opts || {};

        const $ipt = (opts.$ele || $(opts.html || `<input class="form-control input-xs form-control--minimal ui__ipt-color" type="color">`)).change(()=>component._state[prop] = $ipt.val());
        const hook = ()=>$ipt.val(component._state[prop]);
        component._addHookBase(prop, hook);
        hook();
        return $ipt;
    }

    static getBtnBool(component, prop, opts) {
        opts = opts || {};

        let ele = opts.ele;
        if (opts.html)
            ele = e_({
                outer: opts.html
            });

        const activeClass = opts.activeClass || "active";
        const stateName = opts.stateName || "state";
        const stateProp = opts.stateProp || `_${stateName}`;

        const btn = (ele ? e_({
            ele
        }) : e_({
            ele: ele,
            tag: "button",
            clazz: "btn btn-xs btn-default",
            text: opts.text || "Toggle",
        })).onClick(()=>component[stateProp][prop] = !component[stateProp][prop]).onContextmenu(evt=>{
            evt.preventDefault();
            component[stateProp][prop] = !component[stateProp][prop];
        }
        );

        const hk = ()=>{
            btn.toggleClass(activeClass, opts.isInverted ? !component[stateProp][prop] : !!component[stateProp][prop]);
            if (opts.activeTitle || opts.inactiveTitle)
                btn.title(component[stateProp][prop] ? (opts.activeTitle || opts.title || "") : (opts.inactiveTitle || opts.title || ""));
            if (opts.fnHookPost)
                opts.fnHookPost(component[stateProp][prop]);
        }
        ;
        component._addHook(stateName, prop, hk);
        hk();

        return btn;
    }

    static $getBtnBool(component, prop, opts) {
        const nxtOpts = {
            ...opts
        };
        if (nxtOpts.$ele) {
            nxtOpts.ele = nxtOpts.$ele[0];
            delete nxtOpts.$ele;
        }
        return $(this.getBtnBool(component, prop, nxtOpts));
    }

    static $getCbBool(component, prop, opts) {
        opts = opts || {};

        const stateName = opts.stateName || "state";
        const stateProp = opts.stateProp || `_${stateName}`;

        const cb = e_({
            tag: "input",
            type: "checkbox",
            keydown: evt=>{
                if (evt.key === "Escape")
                    cb.blur();
            }
            ,
            change: ()=>{
                if (opts.isTreatIndeterminateNullAsPositive && component[stateProp][prop] == null) {
                    component[stateProp][prop] = false;
                    return;
                }

                component[stateProp][prop] = cb.checked;
            },
        });

        const hook = ()=>{
            cb.checked = !!component[stateProp][prop];
            if (opts.isDisplayNullAsIndeterminate)
                cb.indeterminate = component[stateProp][prop] == null;
        }
        ;
        component._addHook(stateName, prop, hook);
        hook();

        const $cb = $(cb);

        return opts.asMeta ? ({
            $cb,
            unhook: ()=>component._removeHook(stateName, prop, hook)
        }) : $cb;
    }

    /**Create a dropdown menu with options to click on (used to create a class dropdown menu at least) */
    static $getSelSearchable(comp, prop, opts) {
        opts = opts || {};

        //UI Dropdown element
        const $iptDisplay = (opts.$ele || $(opts.html || `<input class="form-control input-xs form-control--minimal">`))
        .addClass("ui-sel2__ipt-display").attr("tabindex", "-1").click(()=>{
            if (opts.isDisabled){return;}
            $iptSearch.focus().select();
        }
        ).prop("disabled", !!opts.isDisabled);
        //$iptDisplay.disableSpellcheck();
        $iptDisplay.attr("autocomplete", "new-password").attr("autocapitalize", "off").attr("spellcheck", "false");

        const handleSearchChange = ()=>{
            const cleanTerm = this._$getSelSearchable_getSearchString($iptSearch.val());
            metaOptions.forEach(it=>{
                it.isVisible = it.searchTerm.includes(cleanTerm);
                it.$ele.toggleVe(it.isVisible && !it.isForceHidden);
            });
        };

        const handleSearchChangeDebounced = MiscUtil.debounce(handleSearchChange, 30);

        const $iptSearch = (opts.$ele || $(opts.html || `<input class="form-control input-xs form-control--minimal">`)).addClass("absolute ui-sel2__ipt-search").keydown(evt=>{
            if (opts.isDisabled)
                return;

            switch (evt.key) {
            case "Escape":
                evt.stopPropagation();
                return $iptSearch.blur();

            case "ArrowDown":
                {
                    evt.preventDefault();
                    const visibleMetaOptions = metaOptions.filter(it=>it.isVisible && !it.isForceHidden);
                    if (!visibleMetaOptions.length)
                        return;
                    visibleMetaOptions[0].$ele.focus();
                    break;
                }

            case "Enter":
            case "Tab":
                {
                    const visibleMetaOptions = metaOptions.filter(it=>it.isVisible && !it.isForceHidden);
                    if (!visibleMetaOptions.length)
                        return;
                    comp._state[prop] = visibleMetaOptions[0].value;
                    $iptSearch.blur();
                    break;
                }

            default:
                handleSearchChangeDebounced();
            }
        }
        ).change(()=>handleSearchChangeDebounced()).click(()=>{
            if (opts.isDisabled)
                return;
            $iptSearch.focus().select();
        }
        ).prop("disabled", !!opts.isDisabled)//.disableSpellcheck();
        .attr("autocomplete", "new-password").attr("autocapitalize", "off").attr("spellcheck", "false");

        //This object will be the parent of our choices in the dropdown menu
        const $wrpChoices = $$`<div class="absolute ui-sel2__wrp-options overflow-y-scroll"></div>`;
        const $wrp = $$`<div class="ve-flex relative ui-sel2__wrp w-100 overflow-x-vis">
			${$iptDisplay}
			${$iptSearch}
		</div>`;

        

        const procValues = opts.isAllowNull ? [null, ...opts.values] : opts.values;
        //Create dropdown options here
        const metaOptions = procValues.map((v,i)=>{
            const display = v == null ? (opts.displayNullAs || "\u2014") : opts.fnDisplay ? opts.fnDisplay(v) : v;
            const additionalStyleClasses = opts.fnGetAdditionalStyleClasses ? opts.fnGetAdditionalStyleClasses(v) : null;

            //V is an index that points to a class

            //Here we create an option in the dropdown menu
            const $ele = $(`<div class="ve-flex-v-center py-1 px-1 clickable ui-sel2__disp-option
                ${v == null ? `italic` : ""} ${additionalStyleClasses ? additionalStyleClasses.join(" ") : ""}" tabindex="0">${display}</div>`)
            .click(()=>{ //When an option is clicked
                if (opts.isDisabled){return;}
                //here is where _state first gets set with the [propIxClass] thingy
                //this should probably trigger an event (because _state is a proxy and can run events when something is setted)
                comp._state[prop] = v; 
                $(document.activeElement).blur();
                $wrp.addClass("no-events");
                setTimeout(()=>$wrp.removeClass("no-events"), 50);
            })
            .keydown(evt=>{
                if (opts.isDisabled)
                    return;

                switch (evt.key) {
                case "Escape":
                    evt.stopPropagation();
                    return $ele.blur();

                case "ArrowDown":
                    {
                        evt.preventDefault();
                        const visibleMetaOptions = metaOptions.filter(it=>it.isVisible && !it.isForceHidden);
                        if (!visibleMetaOptions.length)
                            return;
                        const ixCur = visibleMetaOptions.indexOf(out);
                        const nxt = visibleMetaOptions[ixCur + 1];
                        if (nxt)
                            nxt.$ele.focus();
                        break;
                    }

                case "ArrowUp":
                    {
                        evt.preventDefault();
                        const visibleMetaOptions = metaOptions.filter(it=>it.isVisible && !it.isForceHidden);
                        if (!visibleMetaOptions.length)
                            return;
                        const ixCur = visibleMetaOptions.indexOf(out);
                        const prev = visibleMetaOptions[ixCur - 1];
                        if (prev)
                            return prev.$ele.focus();
                        $iptSearch.focus();
                        break;
                    }

                case "Enter":
                    {
                        comp._state[prop] = v;
                        $ele.blur();
                        break;
                    }
                }
            }
            ).appendTo($wrpChoices);


            //TEMPFIX
            const isForceHidden = false; //opts.isHiddenPerValue && !!(opts.isAllowNull ? opts.isHiddenPerValue[i - 1] : opts.isHiddenPerValue[i]);
            if (isForceHidden){$ele.hideVe();}
            
            
        
            $wrp.append($wrpChoices);

            const out = {
                value: v,
                isVisible: true,
                isForceHidden,
                searchTerm: this._$getSelSearchable_getSearchString(display),
                $ele,
            };
            
            return out;
        });

        const fnUpdateHidden = (isHiddenPerValue,isHideNull=false)=>{
            let metaOptions_ = metaOptions;

            if (opts.isAllowNull) {
                metaOptions_[0].isForceHidden = isHideNull;
                metaOptions_ = metaOptions_.slice(1);
            }

            metaOptions_.forEach((it,i)=>it.isForceHidden = !!isHiddenPerValue[i]);
            handleSearchChange();
        };

        const hk = ()=>{
            if (comp._state[prop] == null)
                $iptDisplay.addClass("italic").addClass("ve-muted").val(opts.displayNullAs || "\u2014");
            else
                $iptDisplay.removeClass("italic").removeClass("ve-muted").val(opts.fnDisplay ? opts.fnDisplay(comp._state[prop]) : comp._state[prop]);

            metaOptions.forEach(it=>it.$ele.removeClass("active"));
            const metaActive = metaOptions.find(it=>it.value == null ? comp._state[prop] == null : it.value === comp._state[prop]);
            if (metaActive)
                metaActive.$ele.addClass("active");
        };
        comp._addHookBase(prop, hk);
        hk();
        
        const arrow = $(`<div class="ui-sel2__disp-arrow absolute no-events bold">
            <span class="glyphicon glyphicon-menu-down"></span>
        </div>`);
        $wrp.append(arrow);

        return opts.asMeta ? ({
            $wrp,
            unhook: ()=>comp._removeHookBase(prop, hk),
            $iptDisplay,
            $iptSearch,
            fnUpdateHidden,
        }) : $wrp;
    }

    static _$getSelSearchable_getSearchString(str) {
        if (str == null)
            return "";
        return CleanUtil.getCleanString(str.trim().toLowerCase().replace(/\s+/g, " "));
    }

    static $getSelEnum(component, prop, {values, $ele, html, isAllowNull, fnDisplay, displayNullAs, asMeta, propProxy="state", isSetIndexes=false}={}) {
        const _propProxy = `_${propProxy}`;

        let values_;

        let $sel = $ele || (html ? $(html) : null);
        if (!$sel) {
            const sel = document.createElement("select");
            sel.className = "form-control input-xs";
            $sel = $(sel);
        }

        $sel.change(()=>{
            const ix = Number($sel.val());
            if (~ix)
                return void (component[_propProxy][prop] = isSetIndexes ? ix : values_[ix]);

            if (isAllowNull)
                return void (component[_propProxy][prop] = null);
            component[_propProxy][prop] = isSetIndexes ? 0 : values_[0];
        }
        );

        const setValues_handleResetOnMissing = ({isResetOnMissing, nxtValues})=>{
            if (!isResetOnMissing)
                return;

            if (component[_propProxy][prop] == null)
                return;

            if (isSetIndexes) {
                if (component[_propProxy][prop] >= 0 && component[_propProxy][prop] < nxtValues.length) {
                    if (isAllowNull)
                        return component[_propProxy][prop] = null;
                    return component[_propProxy][prop] = 0;
                }

                return;
            }

            if (!nxtValues.includes(component[_propProxy][prop])) {
                if (isAllowNull)
                    return component[_propProxy][prop] = null;
                return component[_propProxy][prop] = nxtValues[0];
            }
        }
        ;

        const setValues = (nxtValues,{isResetOnMissing=false, isForce=false}={})=>{
            if (!isForce && CollectionUtil.deepEquals(values_, nxtValues))
                return;
            values_ = nxtValues;
            $sel.empty();
            if (isAllowNull) {
                const opt = document.createElement("option");
                opt.value = "-1";
                opt.text = displayNullAs || "\u2014";
                $sel.append(opt);
            }
            values_.forEach((it,i)=>{
                const opt = document.createElement("option");
                opt.value = `${i}`;
                opt.text = fnDisplay ? fnDisplay(it) : it;
                $sel.append(opt);
            }
            );

            setValues_handleResetOnMissing({
                isResetOnMissing,
                nxtValues
            });

            hook();
        }
        ;

        const hook = ()=>{
            if (isSetIndexes) {
                const ix = component[_propProxy][prop] == null ? -1 : component[_propProxy][prop];
                $sel.val(`${ix}`);
                return;
            }

            const searchFor = component[_propProxy][prop] === undefined ? null : component[_propProxy][prop];
            const ix = values_.indexOf(searchFor);
            $sel.val(`${ix}`);
        }
        ;
        component._addHookBase(prop, hook);

        setValues(values);

        if (!asMeta)
            return $sel;

        return {
            $sel,
            unhook: ()=>component._removeHookBase(prop, hook),
            setValues,
        };
    }

    static $getPickEnum(component, prop, opts) {
        return this._$getPickEnumOrString(component, prop, opts);
    }

    static $getPickString(component, prop, opts) {
        return this._$getPickEnumOrString(component, prop, {
            ...opts,
            isFreeText: true
        });
    }

    static _$getPickEnumOrString(component, prop, opts) {
        opts = opts || {};

        const getSubcompValues = ()=>{
            const initialValuesArray = (opts.values || []).concat(opts.isFreeText ? MiscUtil.copyFast((component._state[prop] || [])) : []);
            const initialValsCompWith = opts.isCaseInsensitive ? component._state[prop].map(it=>it.toLowerCase()) : component._state[prop];
            return initialValuesArray.map(v=>opts.isCaseInsensitive ? v.toLowerCase() : v).mergeMap(v=>({
                [v]: component._state[prop] && initialValsCompWith.includes(v)
            }));
        }
        ;

        const initialVals = getSubcompValues();

        let $btnAdd;
        if (opts.isFreeText) {
            $btnAdd = $(`<button class="btn btn-xxs btn-default ui-pick__btn-add ml-auto">+</button>`).click(async()=>{
                const input = await InputUiUtil.pGetUserString();
                if (input == null || input === VeCt.SYM_UI_SKIP)
                    return;
                const inputClean = opts.isCaseInsensitive ? input.trim().toLowerCase() : input.trim();
                pickComp.getPod().set(inputClean, true);
            }
            );
        }
        else {
            const menu = ContextUtil.getMenu(opts.values.map(it=>new ContextUtil.Action(opts.fnDisplay ? opts.fnDisplay(it) : it,()=>pickComp.getPod().set(it, true),)));

            $btnAdd = $(`<button class="btn btn-xxs btn-default ui-pick__btn-add">+</button>`).click(evt=>ContextUtil.pOpenMenu(evt, menu));
        }

        const pickComp = BaseComponent.fromObject(initialVals);
        pickComp.render = function($parent) {
            $parent.empty();

            Object.entries(this._state).forEach(([k,v])=>{
                if (v === false)
                    return;

                const $btnRemove = $(`<button class="btn btn-danger ui-pick__btn-remove ve-text-center">×</button>`).click(()=>this._state[k] = false);
                const txt = `${opts.fnDisplay ? opts.fnDisplay(k) : k}`;
                $$`<div class="ve-flex mx-1 mb-1 ui-pick__disp-pill max-w-100 min-w-0"><div class="px-1 ui-pick__disp-text ve-flex-v-center text-clip-ellipsis" title="${txt.qq()}">${txt}</div>${$btnRemove}</div>`.appendTo($parent);
            }
            );
        };

        const $wrpPills = $(`<div class="ve-flex ve-flex-wrap max-w-100 min-w-0"></div>`);
        const $wrp = $$`<div class="ve-flex-v-center w-100">${$btnAdd}${$wrpPills}</div>`;
        pickComp._addHookAll("state", ()=>{
            component._state[prop] = Object.keys(pickComp._state).filter(k=>pickComp._state[k]);
            pickComp.render($wrpPills);
        }
        );
        pickComp.render($wrpPills);

        const hkParent = ()=>pickComp._proxyAssignSimple("state", getSubcompValues(), true);
        component._addHookBase(prop, hkParent);

        return $wrp;
    }

    static $getCbsEnum(component, prop, opts) {
        opts = opts || {};

        const $wrp = $(`<div class="ve-flex-col w-100"></div>`);
        const metas = opts.values.map(it=>{
            const $cb = $(`<input type="checkbox">`).keydown(evt=>{
                if (evt.key === "Escape")
                    $cb.blur();
            }
            ).change(()=>{
                let didUpdate = false;
                const ix = (component._state[prop] || []).indexOf(it);
                if (~ix)
                    component._state[prop].splice(ix, 1);
                else {
                    if (component._state[prop])
                        component._state[prop].push(it);
                    else {
                        didUpdate = true;
                        component._state[prop] = [it];
                    }
                }
                if (!didUpdate)
                    component._state[prop] = [...component._state[prop]];
            }
            );

            $$`<label class="split-v-center my-1 stripe-odd ${opts.isIndent ? "ml-4" : ""}"><div class="no-wrap ve-flex-v-center">${opts.fnDisplay ? opts.fnDisplay(it) : it}</div>${$cb}</label>`.appendTo($wrp);

            return {
                $cb,
                value: it
            };
        }
        );

        const hook = ()=>metas.forEach(meta=>meta.$cb.prop("checked", component._state[prop] && component._state[prop].includes(meta.value)));
        component._addHookBase(prop, hook);
        hook();

        return opts.asMeta ? {
            $wrp,
            unhook: ()=>component._removeHookBase(prop, hook)
        } : $wrp;
    }

    /**
     * @param {BaseComponent} comp
     * @param {string} prop usually "_state"
     * @param {any} opts
     * @returns {any}
     */
    static getMetaWrpMultipleChoice(comp, prop, opts) {
        opts = opts || {};
        this._getMetaWrpMultipleChoice_doValidateOptions(opts);

        const rowMetas = [];
        const $eles = [];
        const ixsSelectionOrder = [];
        const $elesSearchable = {};

        const propIsAcceptable = this.getMetaWrpMultipleChoice_getPropIsAcceptable(prop);
        const propPulse = this.getMetaWrpMultipleChoice_getPropPulse(prop);
        const propIxMax = this._getMetaWrpMultipleChoice_getPropValuesLength(prop);

        const cntRequired = ((opts.required || []).length) + ((opts.ixsRequired || []).length);
        const count = opts.count != null ? opts.count - cntRequired : null;
        const countIncludingRequired = opts.count != null ? count + cntRequired : null;
        const min = opts.min != null ? opts.min - cntRequired : null;
        const max = opts.max != null ? opts.max - cntRequired : null;

        const valueGroups = opts.valueGroups || [{
            values: opts.values
        }];

        let ixValue = 0;
        valueGroups.forEach((group,i)=>{
            if (i !== 0)
                $eles.push($(`<hr class="w-100 hr-2 hr--dotted">`));

            if (group.name) {
                const $wrpName = $$`<div class="split-v-center py-1">
					<div class="ve-flex-v-center"><span class="mr-2">‒</span><span>${group.name}</span></div>
					${opts.valueGroupSplitControlsLookup?.[group.name]}
				</div>`;
                $eles.push($wrpName);
            }

            if (group.text)
                $eles.push($(`<div class="ve-flex-v-center py-1"><div class="ml-1 mr-3"></div><i>${group.text}</i></div>`));

            group.values.forEach(v=>{
                const ixValueFrozen = ixValue;

                const propIsActive = this.getMetaWrpMultipleChoice_getPropIsActive(prop, ixValueFrozen);
                const propIsRequired = this.getMetaWrpMultipleChoice_getPropIsRequired(prop, ixValueFrozen);

                const isHardRequired = (opts.required && opts.required.includes(v)) || (opts.ixsRequired && opts.ixsRequired.includes(ixValueFrozen));
                const isRequired = isHardRequired || comp._state[propIsRequired];

                if (comp._state[propIsActive] && !comp._state[propIsRequired])
                    ixsSelectionOrder.push(ixValueFrozen);

                let hk;
                const $cb = isRequired ? $(`<input type="checkbox" disabled checked title="This option is required.">`) : ComponentUiUtil.$getCbBool(comp, propIsActive);

                if (isRequired)
                    comp._state[propIsActive] = true;

                if (!isRequired) {
                    hk = ()=>{
                        const ixIx = ixsSelectionOrder.findIndex(it=>it === ixValueFrozen);
                        if (~ixIx)
                            ixsSelectionOrder.splice(ixIx, 1);
                        if (comp._state[propIsActive])
                            ixsSelectionOrder.push(ixValueFrozen);

                        const activeRows = rowMetas.filter(it=>comp._state[it.propIsActive]);

                        if (count != null) {
                            if (activeRows.length > countIncludingRequired) {
                                const ixFirstSelected = ixsSelectionOrder.splice(ixsSelectionOrder.length - 2, 1)[0];
                                if (ixFirstSelected != null) {
                                    const propIsActiveOther = this.getMetaWrpMultipleChoice_getPropIsActive(prop, ixFirstSelected);
                                    comp._state[propIsActiveOther] = false;

                                    comp._state[propPulse] = !comp._state[propPulse];
                                }
                                return;
                            }
                        }

                        let isAcceptable = false;
                        if (count != null) {
                            if (activeRows.length === countIncludingRequired)
                                isAcceptable = true;
                        } else {
                            if (activeRows.length >= (min || 0) && activeRows.length <= (max || Number.MAX_SAFE_INTEGER))
                                isAcceptable = true;
                        }

                        comp._state[propIsAcceptable] = isAcceptable;

                        comp._state[propPulse] = !comp._state[propPulse];
                    }
                    ;
                    comp._addHookBase(propIsActive, hk);
                    hk();
                }

                const displayValue = opts.fnDisplay ? opts.fnDisplay(v, ixValueFrozen) : v;

                rowMetas.push({
                    $cb,
                    displayValue,
                    value: v,
                    propIsActive,
                    unhook: ()=>{
                        if (hk)
                            comp._removeHookBase(propIsActive, hk);
                    }
                    ,
                });

                const $ele = $$`<label class="ve-flex-v-center py-1 stripe-even">
					<div class="col-1 ve-flex-vh-center">${$cb}</div>
					<div class="col-11 ve-flex-v-center">${displayValue}</div>
				</label>`;
                $eles.push($ele);

                if (opts.isSearchable) {
                    const searchText = `${opts.fnGetSearchText ? opts.fnGetSearchText(v, ixValueFrozen) : v}`.toLowerCase().trim();
                    ($elesSearchable[searchText] = $elesSearchable[searchText] || []).push($ele);
                }

                ixValue++;
            }
            );
        }
        );

        ixsSelectionOrder.sort((a,b)=>SortUtil.ascSort(a, b));

        comp.__state[propIxMax] = ixValue;

        let $iptSearch;
        if (opts.isSearchable) {
            const compSub = BaseComponent.fromObject({
                search: ""
            });
            $iptSearch = ComponentUiUtil.$getIptStr(compSub, "search");
            const hkSearch = ()=>{
                const cleanSearch = compSub._state.search.trim().toLowerCase();
                if (!cleanSearch) {
                    Object.values($elesSearchable).forEach($eles=>$eles.forEach($ele=>$ele.removeClass("ve-hidden")));
                    return;
                }

                Object.entries($elesSearchable).forEach(([searchText,$eles])=>$eles.forEach($ele=>$ele.toggleVe(searchText.includes(cleanSearch))));
            }
            ;
            compSub._addHookBase("search", hkSearch);
            hkSearch();
        }

        const unhook = ()=>rowMetas.forEach(it=>it.unhook());
        return {
            $ele: $$`<div class="ve-flex-col w-100 overflow-y-auto">${$eles}</div>`,
            $iptSearch,
            rowMetas,
            propIsAcceptable,
            propPulse,
            unhook,
            cleanup: ()=>{
                unhook();
                Object.keys(comp._state).filter(it=>it.startsWith(`${prop}__`)).forEach(it=>delete comp._state[it]);
            }
            ,
        };
    }

    static getMetaWrpMultipleChoice_getPropIsAcceptable(prop) {
        return `${prop}__isAcceptable`;
    }
    static getMetaWrpMultipleChoice_getPropPulse(prop) {
        return `${prop}__pulse`;
    }
    static _getMetaWrpMultipleChoice_getPropValuesLength(prop) {
        return `${prop}__length`;
    }
    static getMetaWrpMultipleChoice_getPropIsActive(prop, ixValue) {
        return `${prop}__isActive_${ixValue}`;
    }
    static getMetaWrpMultipleChoice_getPropIsRequired(prop, ixValue) {
        return `${prop}__isRequired_${ixValue}`;
    }

    static getMetaWrpMultipleChoice_getSelectedIxs(comp, prop) {
        const out = [];
        const len = comp._state[this._getMetaWrpMultipleChoice_getPropValuesLength(prop)] || 0;
        for (let i = 0; i < len; ++i) {
            if (comp._state[this.getMetaWrpMultipleChoice_getPropIsActive(prop, i)])
                out.push(i);
        }
        return out;
    }

    static getMetaWrpMultipleChoice_getSelectedValues(comp, prop, {values, valueGroups}) {
        const selectedIxs = this.getMetaWrpMultipleChoice_getSelectedIxs(comp, prop);
        if (values)
            return selectedIxs.map(ix=>values[ix]);

        const selectedIxsSet = new Set(selectedIxs);
        const out = [];
        let ixValue = 0;
        valueGroups.forEach(group=>{
            group.values.forEach(v=>{
                if (selectedIxsSet.has(ixValue))
                    out.push(v);
                ixValue++;
            }
            );
        }
        );
        return out;
    }

    static _getMetaWrpMultipleChoice_doValidateOptions(opts) {
        if ((Number(!!opts.values) + Number(!!opts.valueGroups)) !== 1)
            throw new Error(`Exactly one of "values" and "valueGroups" must be specified!`);

        if (opts.count != null && (opts.min != null || opts.max != null))
            throw new Error(`Chooser must be either in "count" mode or "min/max" mode!`);
        if (opts.count == null && opts.min == null && opts.max == null)
            opts.count = 1;
    }

    static $getSliderRange(comp, opts) {
        opts = opts || {};
        const slider = new ComponentUiUtil.RangeSlider({
            comp,
            ...opts
        });
        return slider.$get();
    }

    static $getSliderNumber(comp, prop, {min, max, step, $ele, asMeta, }={}, ) {
        const $slider = ($ele || $(`<input type="range">`)).change(()=>comp._state[prop] = Number($slider.val()));

        if (min != null)
            $slider.attr("min", min);
        if (max != null)
            $slider.attr("max", max);
        if (step != null)
            $slider.attr("step", step);

        const hk = ()=>$slider.val(comp._state[prop]);
        comp._addHookBase(prop, hk);
        hk();

        return asMeta ? ({
            $slider,
            unhook: ()=>comp._removeHookBase(prop, hk)
        }) : $slider;
    }
}

ComponentUiUtil.RangeSlider = class {
    constructor({comp, propMin, propMax, propCurMin, propCurMax, fnDisplay, fnDisplayTooltip, sparseValues, }, ) {
        this._comp = comp;
        this._propMin = propMin;
        this._propMax = propMax;
        this._propCurMin = propCurMin;
        this._propCurMax = propCurMax;
        this._fnDisplay = fnDisplay;
        this._fnDisplayTooltip = fnDisplayTooltip;
        this._sparseValues = sparseValues;

        this._isSingle = !this._propCurMax;

        const compCpyState = {
            [this._propMin]: this._comp._state[this._propMin],
            [this._propCurMin]: this._comp._state[this._propCurMin],
            [this._propMax]: this._comp._state[this._propMax],
        };
        if (!this._isSingle)
            compCpyState[this._propCurMax] = this._comp._state[this._propCurMax];
        this._compCpy = BaseComponent.fromObject(compCpyState);

        this._comp._addHook("state", this._propMin, ()=>this._compCpy._state[this._propMin] = this._comp._state[this._propMin]);
        this._comp._addHook("state", this._propCurMin, ()=>this._compCpy._state[this._propCurMin] = this._comp._state[this._propCurMin]);
        this._comp._addHook("state", this._propMax, ()=>this._compCpy._state[this._propMax] = this._comp._state[this._propMax]);

        if (!this._isSingle)
            this._comp._addHook("state", this._propCurMax, ()=>this._compCpy._state[this._propCurMax] = this._comp._state[this._propCurMax]);

        this._cacheRendered = null;
        this._dispTrackOuter = null;
        this._dispTrackInner = null;
        this._thumbLow = null;
        this._thumbHigh = null;
        this._dragMeta = null;
    }

    $get() {
        const out = this.get();
        return $(out);
    }

    get() {
        this.constructor._init();
        this.constructor._ALL_SLIDERS.add(this);

        if (this._cacheRendered)
            return this._cacheRendered;

        const dispValueLeft = this._isSingle ? this._getSpcSingleValue() : this._getDispValue({
            isVisible: true,
            side: "left"
        });
        const dispValueRight = this._getDispValue({
            isVisible: true,
            side: "right"
        });

        this._dispTrackInner = this._isSingle ? null : e_({
            tag: "div",
            clazz: "ui-slidr__track-inner h-100 absolute",
        });

        this._thumbLow = this._getThumb();
        this._thumbHigh = this._isSingle ? null : this._getThumb();

        this._dispTrackOuter = e_({
            tag: "div",
            clazz: `relative w-100 ui-slidr__track-outer`,
            children: [this._dispTrackInner, this._thumbLow, this._thumbHigh, ].filter(Boolean),
        });

        const wrpTrack = e_({
            tag: "div",
            clazz: `ve-flex-v-center w-100 h-100 ui-slidr__wrp-track clickable`,
            mousedown: evt=>{
                const thumb = this._getClosestThumb(evt);
                this._handleMouseDown(evt, thumb);
            }
            ,
            children: [this._dispTrackOuter, ],
        });

        const wrpTop = e_({
            tag: "div",
            clazz: "ve-flex-v-center w-100 ui-slidr__wrp-top",
            children: [dispValueLeft, wrpTrack, dispValueRight, ].filter(Boolean),
        });

        const wrpPips = e_({
            tag: "div",
            clazz: `w-100 ve-flex relative clickable h-100 ui-slidr__wrp-pips`,
            mousedown: evt=>{
                const thumb = this._getClosestThumb(evt);
                this._handleMouseDown(evt, thumb);
            }
            ,
        });

        const wrpBottom = e_({
            tag: "div",
            clazz: "w-100 ve-flex-vh-center ui-slidr__wrp-bottom",
            children: [this._isSingle ? this._getSpcSingleValue() : this._getDispValue({
                side: "left"
            }), wrpPips, this._getDispValue({
                side: "right"
            }), ].filter(Boolean),
        });

        const hkChangeValue = ()=>{
            const curMin = this._compCpy._state[this._propCurMin];
            const pctMin = this._getLeftPositionPercentage({
                value: curMin
            });
            this._thumbLow.style.left = `calc(${pctMin}% - ${this.constructor._W_THUMB_PX / 2}px)`;
            const toDisplayLeft = this._fnDisplay ? `${this._fnDisplay(curMin)}`.qq() : curMin;
            const toDisplayLeftTooltip = this._fnDisplayTooltip ? `${this._fnDisplayTooltip(curMin)}`.qq() : null;
            if (!this._isSingle) {
                dispValueLeft.html(toDisplayLeft).tooltip(toDisplayLeftTooltip);
            }

            if (!this._isSingle) {
                this._dispTrackInner.style.left = `${pctMin}%`;

                const curMax = this._compCpy._state[this._propCurMax];
                const pctMax = this._getLeftPositionPercentage({
                    value: curMax
                });
                this._dispTrackInner.style.right = `${100 - pctMax}%`;
                this._thumbHigh.style.left = `calc(${pctMax}% - ${this.constructor._W_THUMB_PX / 2}px)`;
                dispValueRight.html(this._fnDisplay ? `${this._fnDisplay(curMax)}`.qq() : curMax).tooltip(this._fnDisplayTooltip ? `${this._fnDisplayTooltip(curMax)}`.qq() : null);
            } else {
                dispValueRight.html(toDisplayLeft).tooltip(toDisplayLeftTooltip);
            }
        }
        ;

        const hkChangeLimit = ()=>{
            const pips = [];

            if (!this._sparseValues) {
                const numPips = this._compCpy._state[this._propMax] - this._compCpy._state[this._propMin];
                let pipIncrement = 1;
                if (numPips > ComponentUiUtil.RangeSlider._MAX_PIPS)
                    pipIncrement = Math.ceil(numPips / ComponentUiUtil.RangeSlider._MAX_PIPS);

                let i, len;
                for (i = this._compCpy._state[this._propMin],
                len = this._compCpy._state[this._propMax] + 1; i < len; i += pipIncrement) {
                    pips.push(this._getWrpPip({
                        isMajor: i === this._compCpy._state[this._propMin] || i === (len - 1),
                        value: i,
                    }));
                }

                if (i !== this._compCpy._state[this._propMax])
                    pips.push(this._getWrpPip({
                        isMajor: true,
                        value: this._compCpy._state[this._propMax]
                    }));
            } else {
                const len = this._sparseValues.length;
                this._sparseValues.forEach((val,i)=>{
                    pips.push(this._getWrpPip({
                        isMajor: i === 0 || i === (len - 1),
                        value: val,
                    }));
                }
                );
            }

            wrpPips.empty();
            e_({
                ele: wrpPips,
                children: pips,
            });

            hkChangeValue();
        }
        ;

        this._compCpy._addHook("state", this._propMin, hkChangeLimit);
        this._compCpy._addHook("state", this._propMax, hkChangeLimit);
        this._compCpy._addHook("state", this._propCurMin, hkChangeValue);
        if (!this._isSingle)
            this._compCpy._addHook("state", this._propCurMax, hkChangeValue);

        hkChangeLimit();

        const wrp = e_({
            tag: "div",
            clazz: "ve-flex-col w-100 ui-slidr__wrp",
            children: [wrpTop, wrpBottom, ],
        });

        return this._cacheRendered = wrp;
    }

    destroy() {
        this.constructor._ALL_SLIDERS.delete(this);
        if (this._cacheRendered)
            this._cacheRendered.remove();
    }

    _getDispValue({isVisible, side}) {
        return e_({
            tag: "div",
            clazz: `overflow-hidden ui-slidr__disp-value no-shrink no-grow ve-flex-vh-center bold no-select ${isVisible ? `ui-slidr__disp-value--visible` : ""} ui-slidr__disp-value--${side}`,
        });
    }

    _getSpcSingleValue() {
        return e_({
            tag: "div",
            clazz: `px-2`,
        });
    }

    _getThumb() {
        const thumb = e_({
            tag: "div",
            clazz: "ui-slidr__thumb absolute clickable",
            mousedown: evt=>this._handleMouseDown(evt, thumb),
        }).attr("draggable", true);

        return thumb;
    }

    _getWrpPip({isMajor, value}={}) {
        const style = this._getWrpPip_getStyle({
            value
        });

        const pip = e_({
            tag: "div",
            clazz: `ui-slidr__pip ${isMajor ? `ui-slidr__pip--major` : `absolute`}`,
        });

        const dispLabel = e_({
            tag: "div",
            clazz: "absolute ui-slidr__pip-label ve-flex-vh-center ve-small no-wrap",
            html: isMajor ? this._fnDisplay ? `${this._fnDisplay(value)}`.qq() : value : "",
            title: isMajor && this._fnDisplayTooltip ? `${this._fnDisplayTooltip(value)}`.qq() : null,
        });

        return e_({
            tag: "div",
            clazz: "ve-flex-col ve-flex-vh-center absolute no-select",
            children: [pip, dispLabel, ],
            style,
        });
    }

    _getWrpPip_getStyle({value}) {
        return `left: ${this._getLeftPositionPercentage({
            value
        })}%`;
    }

    _getLeftPositionPercentage({value}) {
        if (this._sparseValues) {
            const ix = this._sparseValues.sort(SortUtil.ascSort).indexOf(value);
            if (!~ix)
                throw new Error(`Value "${value}" was not in the list of sparse values!`);
            return (ix / (this._sparseValues.length - 1)) * 100;
        }

        const min = this._compCpy._state[this._propMin];
        const max = this._compCpy._state[this._propMax];
        return ((value - min) / (max - min)) * 100;
    }

    _getRelativeValue(evt, {trackOriginX, trackWidth}) {
        const xEvt = EventUtil.getClientX(evt) - trackOriginX;

        if (this._sparseValues) {
            const ixMax = this._sparseValues.length - 1;
            const rawVal = Math.round((xEvt / trackWidth) * ixMax);
            return this._sparseValues[Math.min(ixMax, Math.max(0, rawVal))];
        }

        const min = this._compCpy._state[this._propMin];
        const max = this._compCpy._state[this._propMax];

        const rawVal = min + Math.round((xEvt / trackWidth) * (max - min), );

        return Math.min(max, Math.max(min, rawVal));
    }

    _getClosestThumb(evt) {
        if (this._isSingle)
            return this._thumbLow;

        const {x: trackOriginX, width: trackWidth} = this._dispTrackOuter.getBoundingClientRect();
        const value = this._getRelativeValue(evt, {
            trackOriginX,
            trackWidth
        });

        if (value < this._compCpy._state[this._propCurMin])
            return this._thumbLow;
        if (value > this._compCpy._state[this._propCurMax])
            return this._thumbHigh;

        const {distToMin, distToMax} = this._getDistsToCurrentMinAndMax(value);
        if (distToMax < distToMin)
            return this._thumbHigh;
        return this._thumbLow;
    }

    _getDistsToCurrentMinAndMax(value) {
        if (this._isSingle)
            throw new Error(`Can not get distance to max value for singleton slider!`);

        const distToMin = Math.abs(this._compCpy._state[this._propCurMin] - value);
        const distToMax = Math.abs(this._compCpy._state[this._propCurMax] - value);
        return {
            distToMin,
            distToMax
        };
    }

    _handleClick(evt, value) {
        evt.stopPropagation();
        evt.preventDefault();

        if (value < this._compCpy._state[this._propCurMin])
            this._compCpy._state[this._propCurMin] = value;

        if (value > this._compCpy._state[this._propCurMax])
            this._compCpy._state[this._propCurMax] = value;

        const {distToMin, distToMax} = this._getDistsToCurrentMinAndMax(value);

        if (distToMax < distToMin)
            this._compCpy._state[this._propCurMax] = value;
        else
            this._compCpy._state[this._propCurMin] = value;
    }

    _handleMouseDown(evt, thumb) {
        evt.preventDefault();
        evt.stopPropagation();

        const {x: trackOriginX, width: trackWidth} = this._dispTrackOuter.getBoundingClientRect();

        thumb.addClass(`ui-slidr__thumb--hover`);

        this._dragMeta = {
            trackOriginX,
            trackWidth,
            thumb,
        };

        this._handleMouseMove(evt);
    }

    _handleMouseUp() {
        const wasActive = this._doDragCleanup();

        if (wasActive) {
            const nxtState = {
                [this._propMin]: this._compCpy._state[this._propMin],
                [this._propMax]: this._compCpy._state[this._propMax],
                [this._propCurMin]: this._compCpy._state[this._propCurMin],
            };
            if (!this._isSingle)
                nxtState[this._propCurMax] = this._compCpy._state[this._propCurMax];

            this._comp._proxyAssignSimple("state", nxtState);
        }
    }

    _handleMouseMove(evt) {
        if (!this._dragMeta)
            return;

        const val = this._getRelativeValue(evt, this._dragMeta);

        if (this._dragMeta.thumb === this._thumbLow) {
            if (val > this._compCpy._state[this._propCurMax])
                return;
            this._compCpy._state[this._propCurMin] = val;
        } else if (this._dragMeta.thumb === this._thumbHigh) {
            if (val < this._compCpy._state[this._propCurMin])
                return;
            this._compCpy._state[this._propCurMax] = val;
        }
    }

    _doDragCleanup() {
        const isActive = this._dragMeta != null;

        if (this._dragMeta?.thumb)
            this._dragMeta.thumb.removeClass(`ui-slidr__thumb--hover`);

        this._dragMeta = null;

        return isActive;
    }

    static _init() {
        if (this._isInit)
            return;
        document.addEventListener("mousemove", evt=>{
            for (const slider of this._ALL_SLIDERS) {
                slider._handleMouseMove(evt);
            }
        }
        );

        document.addEventListener("mouseup", evt=>{
            for (const slider of this._ALL_SLIDERS) {
                slider._handleMouseUp(evt);
            }
        }
        );
    }
}
;
ComponentUiUtil.RangeSlider._isInit = false;
ComponentUiUtil.RangeSlider._ALL_SLIDERS = new Set();
ComponentUiUtil.RangeSlider._W_THUMB_PX = 16;
ComponentUiUtil.RangeSlider._W_LABEL_PX = 24;
ComponentUiUtil.RangeSlider._MAX_PIPS = 40;
//#endregion

//#region DocumentSourceInfo
class _DocumentSourceInfo {
    constructor({source, isExact=false}) {
        this.source = source;
        this.isExact = isExact;
    }
}
//#endregion
//#region UtilDocumentSource
class UtilDocumentSource {
    static _SOURCE_PAGE_PREFIX = " pg. ";

    static getSourceObjectFromEntity(ent) {
        return {
            custom: "",
            book: ent.source ? Parser.sourceJsonToAbv(ent.source) : "",
            page: ent.page != null ? `${ent.page}` : "",
            license: ent.src ? "CC-BY-4.0" : "",
        };
    }

    static _getSourceObjectFromDocument(doc) {
        if (!doc)
            return null;

        let sourceObj = doc.system?.source || doc.system?.details?.source || doc.source;

        if (sourceObj instanceof Array)
            sourceObj = sourceObj[0];

        return sourceObj;
    }

    static _SOURCE_PAGE_PREFIX_RE = new RegExp(`${this._SOURCE_PAGE_PREFIX}\\d+`);

    static getDocumentSource(doc) {
        if (doc.flags?.[SharedConsts.MODULE_ID]?.source) {
            return new _DocumentSourceInfo({
                source: doc.flags?.[SharedConsts.MODULE_ID]?.source,
                isExact: true,
            });
        }

        const sourceObj = this._getSourceObjectFromDocument(doc);
        return this._getDocumentSourceFromSourceObject({
            sourceObj
        });
    }

    static _getDocumentSourceFromSourceObject({sourceObj}) {
        if (!sourceObj)
            return new _DocumentSourceInfo({
                source: null
            });

        if (sourceObj.book && sourceObj.book.trim()) {
            return new _DocumentSourceInfo({
                source: sourceObj.book.trim()
            });
        }

        const source = (sourceObj.custom || "").split(this._SOURCE_PAGE_PREFIX_RE)[0].trim();
        return new _DocumentSourceInfo({
            source
        });
    }

    static getDocumentSourceDisplayString(doc) {
        const docSourceInfo = this.getDocumentSource(doc);
        if (docSourceInfo.source == null)
            return "Unknown Source";
        return docSourceInfo.source;
    }

    static getDocumentSourceIdentifierString({doc, entity}) {
        if (doc && entity)
            throw new Error(`Only one of "doc" or "entity" should be provided!`);

        const sourceObj = entity ? this.getSourceObjectFromEntity(entity) : this._getSourceObjectFromDocument(doc);
        if (!sourceObj)
            return "unknown source";

        return this._getDocumentSourceFromSourceObject({
            sourceObj
        }).source.toLowerCase().trim();
    }
}
//#endregion
//#region UtilGameSettings
class UtilGameSettings {
    static prePreInit() {
        //TEMPFIX
        /* game.settings.register(SharedConsts.MODULE_ID, "isDbgMode", {
            name: `Debug Mode`,
            hint: `Enable additional developer-only debugging functionality. Not recommended, as it may reduce stability.`,
            default: false,
            type: Boolean,
            scope: "world",
            config: true,
        }); */
    }

    static isDbg() {
        return !!this.getSafe(SharedConsts.MODULE_ID, "isDbgMode");
    }

    static getSafe(module, key) {
        //TEMPFIX
        return null;
       /*  try {
            return game.settings.get(module, key);
        } catch (e) {
            return null;
        } */
    }
}
//#endregion

//#region UtilPrePreInit
class UtilPrePreInit {
    static _IS_GM = null;

    static isGM() {
        return true;
        //return UtilPrePreInit._IS_GM = UtilPrePreInit._IS_GM ?? game.data.users.find(it=>it._id === game.userId).role >= CONST.USER_ROLES.ASSISTANT;
    }
}
//#endregion
//#region ContextUtil
globalThis.ContextUtil = {
    _isInit: false,
    _menus: [],

    _init() {
        if (ContextUtil._isInit)
            return;
        ContextUtil._isInit = true;

        document.body.addEventListener("click", ()=>ContextUtil.closeAllMenus());
    },

    getMenu(actions) {
        ContextUtil._init();

        const menu = new ContextUtil.Menu(actions);
        ContextUtil._menus.push(menu);
        return menu;
    },

    deleteMenu(menu) {
        if (!menu)
            return;

        menu.remove();
        const ix = ContextUtil._menus.findIndex(it=>it === menu);
        if (~ix)
            ContextUtil._menus.splice(ix, 1);
    },

    pOpenMenu(evt, menu, {userData=null}={}) {
        evt.preventDefault();
        evt.stopPropagation();

        ContextUtil._init();

        ContextUtil._menus.filter(it=>it !== menu).forEach(it=>it.close());

        return menu.pOpen(evt, {
            userData
        });
    },

    closeAllMenus() {
        ContextUtil._menus.forEach(menu=>menu.close());
    },

    Menu: class {
        constructor(actions) {
            this._actions = actions;
            this._pResult = null;
            this.resolveResult_ = null;

            this.userData = null;

            this._$ele = null;
            this._metasActions = [];

            this._menusSub = [];
        }

        remove() {
            if (!this._$ele)
                return;
            this._$ele.remove();
            this._$ele = null;
        }

        width() {
            return this._$ele ? this._$ele.width() : undefined;
        }
        height() {
            return this._$ele ? this._$ele.height() : undefined;
        }

        pOpen(evt, {userData=null, offsetY=null, boundsX=null}={}) {
            evt.stopPropagation();
            evt.preventDefault();

            this._initLazy();

            if (this.resolveResult_)
                this.resolveResult_(null);
            this._pResult = new Promise(resolve=>{
                this.resolveResult_ = resolve;
            }
            );
            this.userData = userData;

            this._$ele.css({
                left: 0,
                top: 0,
                opacity: 0,
                pointerEvents: "none",
            }).showVe().css({
                left: this._getMenuPosition(evt, "x", {
                    bounds: boundsX
                }),
                top: this._getMenuPosition(evt, "y", {
                    offset: offsetY
                }),
                opacity: "",
                pointerEvents: "",
            });

            this._metasActions[0].$eleRow.focus();

            return this._pResult;
        }

        close() {
            if (!this._$ele)
                return;
            this._$ele.hideVe();

            this.closeSubMenus();
        }

        isOpen() {
            if (!this._$ele)
                return false;
            return !this._$ele.hasClass("ve-hidden");
        }

        _initLazy() {
            if (this._$ele) {
                this._metasActions.forEach(meta=>meta.action.update());
                return;
            }

            const $elesAction = this._actions.map(it=>{
                if (it == null)
                    return $(`<div class="my-1 w-100 ui-ctx__divider"></div>`);

                const rdMeta = it.render({
                    menu: this
                });
                this._metasActions.push(rdMeta);
                return rdMeta.$eleRow;
            }
            );

            this._$ele = $$`<div class="ve-flex-col ui-ctx__wrp py-2 absolute">${$elesAction}</div>`.hideVe().appendTo(document.body);
        }

        _getMenuPosition(evt, axis, {bounds=null, offset=null}={}) {
            const {fnMenuSize, fnGetEventPos, fnWindowSize, fnScrollDir} = axis === "x" ? {
                fnMenuSize: "width",
                fnGetEventPos: "getClientX",
                fnWindowSize: "width",
                fnScrollDir: "scrollLeft"
            } : {
                fnMenuSize: "height",
                fnGetEventPos: "getClientY",
                fnWindowSize: "height",
                fnScrollDir: "scrollTop"
            };

            const posMouse = EventUtil[fnGetEventPos](evt);
            const szWin = $(window)[fnWindowSize]();
            const posScroll = $(window)[fnScrollDir]();
            let position = posMouse + posScroll;

            if (offset)
                position += offset;

            const szMenu = this[fnMenuSize]();

            if (bounds != null) {
                const {trailingLower, leadingUpper} = bounds;

                const posTrailing = position;
                const posLeading = position + szMenu;

                if (posTrailing < trailingLower) {
                    position += trailingLower - posTrailing;
                } else if (posLeading > leadingUpper) {
                    position -= posLeading - leadingUpper;
                }
            }

            if (position + szMenu > szWin && szMenu < position)
                position -= szMenu;

            return position;
        }

        addSubMenu(menu) {
            this._menusSub.push(menu);
        }

        closeSubMenus(menuSubExclude=null) {
            this._menusSub.filter(menuSub=>menuSubExclude == null || menuSub !== menuSubExclude).forEach(menuSub=>menuSub.close());
        }
    }
    ,

    Action: function(text, fnAction, opts) {
        opts = opts || {};

        this.text = text;
        this.fnAction = fnAction;

        this.isDisabled = opts.isDisabled;
        this.title = opts.title;
        this.style = opts.style;

        this.fnActionAlt = opts.fnActionAlt;
        this.textAlt = opts.textAlt;
        this.titleAlt = opts.titleAlt;

        this.render = function({menu}) {
            const $btnAction = this._render_$btnAction({
                menu
            });
            const $btnActionAlt = this._render_$btnActionAlt({
                menu
            });

            return {
                action: this,
                $eleRow: $$`<div class="ui-ctx__row ve-flex-v-center ${this.style || ""}">${$btnAction}${$btnActionAlt}</div>`,
                $eleBtn: $btnAction,
            };
        }
        ;

        this._render_$btnAction = function({menu}) {
            const $btnAction = $(`<div class="w-100 min-w-0 ui-ctx__btn py-1 pl-5 ${this.fnActionAlt ? "" : "pr-5"}" ${this.isDisabled ? "disabled" : ""} tabindex="0">${this.text}</div>`).on("click", async evt=>{
                if (this.isDisabled)
                    return;

                evt.preventDefault();
                evt.stopPropagation();

                menu.close();

                const result = await this.fnAction(evt, {
                    userData: menu.userData
                });
                if (menu.resolveResult_)
                    menu.resolveResult_(result);
            }
            ).keydown(evt=>{
                if (evt.key !== "Enter")
                    return;
                $btnAction.click();
            }
            );
            if (this.title)
                $btnAction.title(this.title);

            return $btnAction;
        }
        ;

        this._render_$btnActionAlt = function({menu}) {
            if (!this.fnActionAlt)
                return null;

            const $btnActionAlt = $(`<div class="ui-ctx__btn ml-1 bl-1 py-1 px-4" ${this.isDisabled ? "disabled" : ""}>${this.textAlt ?? `<span class="glyphicon glyphicon-cog"></span>`}</div>`).on("click", async evt=>{
                if (this.isDisabled)
                    return;

                evt.preventDefault();
                evt.stopPropagation();

                menu.close();

                const result = await this.fnActionAlt(evt, {
                    userData: menu.userData
                });
                if (menu.resolveResult_)
                    menu.resolveResult_(result);
            }
            );
            if (this.titleAlt)
                $btnActionAlt.title(this.titleAlt);

            return $btnActionAlt;
        }
        ;

        this.update = function() {}
        ;
    },

    ActionLink: function(text, fnHref, opts) {
        ContextUtil.Action.call(this, text, null, opts);

        this.fnHref = fnHref;
        this._$btnAction = null;

        this._render_$btnAction = function() {
            this._$btnAction = $(`<a href="${this.fnHref()}" class="w-100 min-w-0 ui-ctx__btn py-1 pl-5 ${this.fnActionAlt ? "" : "pr-5"}" ${this.isDisabled ? "disabled" : ""} tabindex="0">${this.text}</a>`);
            if (this.title)
                this._$btnAction.title(this.title);

            return this._$btnAction;
        }
        ;

        this.update = function() {
            this._$btnAction.attr("href", this.fnHref());
        }
        ;
    },

    ActionSelect: function({values, fnOnChange=null, fnGetDisplayValue=null, }, ) {
        this._values = values;
        this._fnOnChange = fnOnChange;
        this._fnGetDisplayValue = fnGetDisplayValue;

        this._sel = null;

        this._ixInitial = null;

        this.render = function({menu}) {
            this._sel = this._render_sel({
                menu
            });

            if (this._ixInitial != null) {
                this._sel.val(`${this._ixInitial}`);
                this._ixInitial = null;
            }

            return {
                action: this,
                $eleRow: $$`<div class="ui-ctx__row ve-flex-v-center">${this._sel}</div>`,
            };
        }
        ;

        this._render_sel = function({menu}) {
            const sel = e_({
                tag: "select",
                clazz: "w-100 min-w-0 mx-5 py-1",
                tabindex: 0,
                children: this._values.map((val,i)=>{
                    return e_({
                        tag: "option",
                        value: i,
                        text: this._fnGetDisplayValue ? this._fnGetDisplayValue(val) : val,
                    });
                }
                ),
                click: async evt=>{
                    evt.preventDefault();
                    evt.stopPropagation();
                }
                ,
                keydown: evt=>{
                    if (evt.key !== "Enter")
                        return;
                    sel.click();
                }
                ,
                change: ()=>{
                    menu.close();

                    const ix = Number(sel.val() || 0);
                    const val = this._values[ix];

                    if (this._fnOnChange)
                        this._fnOnChange(val);
                    if (menu.resolveResult_)
                        menu.resolveResult_(val);
                }
                ,
            });

            return sel;
        }
        ;

        this.setValue = function(val) {
            const ix = this._values.indexOf(val);
            if (!this._sel)
                return this._ixInitial = ix;
            this._sel.val(`${ix}`);
        }
        ;

        this.update = function() {}
        ;
    },

    ActionSubMenu: class {
        constructor(name, actions) {
            this._name = name;
            this._actions = actions;
        }

        render({menu}) {
            const menuSub = ContextUtil.getMenu(this._actions);
            menu.addSubMenu(menuSub);

            const $eleRow = $$`<div class="ui-ctx__btn py-1 px-5 split-v-center">
				<div>${this._name}</div>
				<div class="pl-4"><span class="caret caret--right"></span></div>
			</div>`.on("click", async evt=>{
                evt.stopPropagation();
                if (menuSub.isOpen())
                    return menuSub.close();

                menu.closeSubMenus(menuSub);

                const bcr = $eleRow[0].getBoundingClientRect();

                await menuSub.pOpen(evt, {
                    offsetY: bcr.top - EventUtil.getClientY(evt),
                    boundsX: {
                        trailingLower: bcr.right,
                        leadingUpper: bcr.left,
                    },
                }, );

                menu.close();
            }
            );

            return {
                action: this,
                $eleRow,
            };
        }

        update() {}
    }
    ,
};
//#endregion
//#region StrUtil
globalThis.StrUtil = {
    COMMAS_NOT_IN_PARENTHESES_REGEX: /,\s?(?![^(]*\))/g,
    COMMA_SPACE_NOT_IN_PARENTHESES_REGEX: /, (?![^(]*\))/g,

    uppercaseFirst: function(string) {
        return string.uppercaseFirst();
    },
    TITLE_LOWER_WORDS: ["a", "an", "the", "and", "but", "or", "for", "nor", "as", "at", "by", "for", "from", "in", "into", "near", "of", "on", "onto", "to", "with", "over", "von"],
    TITLE_UPPER_WORDS: ["Id", "Tv", "Dm", "Ok", "Npc", "Pc", "Tpk", "Wip", "Dc"],
    TITLE_UPPER_WORDS_PLURAL: ["Ids", "Tvs", "Dms", "Oks", "Npcs", "Pcs", "Tpks", "Wips", "Dcs"],
    IRREGULAR_PLURAL_WORDS: {
        "cactus": "cacti",
        "child": "children",
        "die": "dice",
        "djinni": "djinn",
        "dwarf": "dwarves",
        "efreeti": "efreet",
        "elf": "elves",
        "fey": "fey",
        "foot": "feet",
        "goose": "geese",
        "ki": "ki",
        "man": "men",
        "mouse": "mice",
        "ox": "oxen",
        "person": "people",
        "sheep": "sheep",
        "slaad": "slaadi",
        "tooth": "teeth",
        "undead": "undead",
        "woman": "women",
    },

    padNumber: (n,len,padder)=>{
        return String(n).padStart(len, padder);
    }
    ,

    elipsisTruncate(str, atLeastPre=5, atLeastSuff=0, maxLen=20) {
        if (maxLen >= str.length)
            return str;

        maxLen = Math.max(atLeastPre + atLeastSuff + 3, maxLen);
        let out = "";
        let remain = maxLen - (3 + atLeastPre + atLeastSuff);
        for (let i = 0; i < str.length - atLeastSuff; ++i) {
            const c = str[i];
            if (i < atLeastPre)
                out += c;
            else if ((remain--) > 0)
                out += c;
        }
        if (remain < 0)
            out += "...";
        out += str.substring(str.length - atLeastSuff, str.length);
        return out;
    },

    toTitleCase(str) {
        return str.toTitleCase();
    },
    qq(str) {
        return (str = str || "").qq();
    },
};
//#endregion
//#region CleanUtil
globalThis.CleanUtil = {
    getCleanJson(data, {isMinify=false, isFast=true}={}) {
        data = MiscUtil.copy(data);
        data = MiscUtil.getWalker().walk(data, {
            string: (str)=>CleanUtil.getCleanString(str, {
                isFast
            })
        });
        let str = isMinify ? JSON.stringify(data) : `${JSON.stringify(data, null, "\t")}\n`;
        return str.replace(CleanUtil.STR_REPLACEMENTS_REGEX, (match)=>CleanUtil.STR_REPLACEMENTS[match]);
    },

    getCleanString(str, {isFast=true}={}) {
        str = str.replace(CleanUtil.SHARED_REPLACEMENTS_REGEX, (match)=>CleanUtil.SHARED_REPLACEMENTS[match]).replace(CleanUtil._SOFT_HYPHEN_REMOVE_REGEX, "");

        if (isFast)
            return str;

        const ptrStack = {
            _: ""
        };
        CleanUtil._getCleanString_walkerStringHandler(ptrStack, 0, str);
        return ptrStack._;
    },

    _getCleanString_walkerStringHandler(ptrStack, tagCount, str) {
        const tagSplit = Renderer.splitByTags(str);
        const len = tagSplit.length;
        for (let i = 0; i < len; ++i) {
            const s = tagSplit[i];
            if (!s)
                continue;
            if (s.startsWith("{@")) {
                const [tag,text] = Renderer.splitFirstSpace(s.slice(1, -1));

                ptrStack._ += `{${tag}${text.length ? " " : ""}`;
                this._getCleanString_walkerStringHandler(ptrStack, tagCount + 1, text);
                ptrStack._ += `}`;
            } else {
                if (tagCount) {
                    ptrStack._ += s;
                } else {
                    ptrStack._ += s.replace(CleanUtil._DASH_COLLAPSE_REGEX, "$1").replace(CleanUtil._ELLIPSIS_COLLAPSE_REGEX, "$1");
                }
            }
        }
    },
};
CleanUtil.SHARED_REPLACEMENTS = {
    "’": "'",
    "‘": "'",
    "": "'",
    "…": "...",
    "\u200B": "",
    "\u2002": " ",
    "ﬀ": "ff",
    "ﬃ": "ffi",
    "ﬄ": "ffl",
    "ﬁ": "fi",
    "ﬂ": "fl",
    "Ĳ": "IJ",
    "ĳ": "ij",
    "Ǉ": "LJ",
    "ǈ": "Lj",
    "ǉ": "lj",
    "Ǌ": "NJ",
    "ǋ": "Nj",
    "ǌ": "nj",
    "ﬅ": "ft",
    "“": `"`,
    "”": `"`,
    "\u201a": ",",
};
CleanUtil.STR_REPLACEMENTS = {
    "—": "\\u2014",
    "–": "\\u2013",
    "‑": "\\u2011",
    "−": "\\u2212",
    " ": "\\u00A0",
    " ": "\\u2007",
};
CleanUtil.SHARED_REPLACEMENTS_REGEX = new RegExp(Object.keys(CleanUtil.SHARED_REPLACEMENTS).join("|"),"g");
CleanUtil.STR_REPLACEMENTS_REGEX = new RegExp(Object.keys(CleanUtil.STR_REPLACEMENTS).join("|"),"g");
CleanUtil._SOFT_HYPHEN_REMOVE_REGEX = /\u00AD *\r?\n?\r?/g;
CleanUtil._ELLIPSIS_COLLAPSE_REGEX = /\s*(\.\s*\.\s*\.)/g;
CleanUtil._DASH_COLLAPSE_REGEX = /[ ]*([\u2014\u2013])[ ]*/g;

//#endregion

//#region SourceUtil
globalThis.SourceUtil = {
    ADV_BOOK_GROUPS: [{
        group: "core",
        displayName: "Core"
    }, {
        group: "supplement",
        displayName: "Supplements"
    }, {
        group: "setting",
        displayName: "Settings"
    }, {
        group: "setting-alt",
        displayName: "Additional Settings"
    }, {
        group: "supplement-alt",
        displayName: "Extras"
    }, {
        group: "prerelease",
        displayName: "Prerelease"
    }, {
        group: "homebrew",
        displayName: "Homebrew"
    }, {
        group: "screen",
        displayName: "Screens"
    }, {
        group: "recipe",
        displayName: "Recipes"
    }, {
        group: "other",
        displayName: "Miscellaneous"
    }, ],

    _subclassReprintLookup: {},
    async pInitSubclassReprintLookup() {
        SourceUtil._subclassReprintLookup = await DataUtil.loadJSON(`${Renderer.get().baseUrl}data/generated/gendata-subclass-lookup.json`);
    },

    isSubclassReprinted(className, classSource, subclassShortName, subclassSource) {
        const fromLookup = MiscUtil.get(SourceUtil._subclassReprintLookup, classSource, className, subclassSource, subclassShortName);
        return fromLookup ? fromLookup.isReprinted : false;
    },

    isSiteSource(source) {
        return !!Parser.SOURCE_JSON_TO_FULL[source];
    },

    isAdventure(source) {
        if (source instanceof FilterItem)
            source = source.item;
        return Parser.SOURCES_ADVENTURES.has(source);
    },

    isCoreOrSupplement(source) {
        if (source instanceof FilterItem)
            source = source.item;
        return Parser.SOURCES_CORE_SUPPLEMENTS.has(source);
    },

    isNonstandardSource(source) {
        if (source == null)
            return false;
        return ((typeof BrewUtil2 === "undefined" || !BrewUtil2.hasSourceJson(source)) && SourceUtil.isNonstandardSourceWotc(source)) || SourceUtil.isPrereleaseSource(source);
    },


    /**
     * Returns true if the source is partnered with WOTC
     * @param {string} source
     * @returns {Boolean}
     */
    isPartneredSourceWotc(source) {
        if (source == null) { return false; }
        return Parser.SOURCES_PARTNERED_WOTC.has(source);
    },

    
    /**
     * Returns true if the source is a prerelease source
     * @param {string} source
     * @returns {boolean}
     */
    isPrereleaseSource(source) {
        if (source == null)
            return false;
        if (typeof PrereleaseUtil !== "undefined" && PrereleaseUtil.hasSourceJson(source))
            return true;
        return source.startsWith(Parser.SRC_UA_PREFIX) || source.startsWith(Parser.SRC_UA_ONE_PREFIX);
    },

    isNonstandardSourceWotc(source) {
        return SourceUtil.isPrereleaseSource(source) || source.startsWith(Parser.SRC_PS_PREFIX) || source.startsWith(Parser.SRC_AL_PREFIX) || source.startsWith(Parser.SRC_MCVX_PREFIX) || Parser.SOURCES_NON_STANDARD_WOTC.has(source);
    },

    FILTER_GROUP_STANDARD: 0,
    FILTER_GROUP_PARTNERED: 1,
    FILTER_GROUP_NON_STANDARD: 2,
    FILTER_GROUP_HOMEBREW: 3,

    getFilterGroup(source) {
        if (source instanceof FilterItem)
            source = source.item;
        if ((typeof PrereleaseUtil !== "undefined" && PrereleaseUtil.hasSourceJson(source)) || SourceUtil.isNonstandardSource(source))
            return SourceUtil.FILTER_GROUP_NON_STANDARD;
        if (typeof BrewUtil2 !== "undefined" && BrewUtil2.hasSourceJson(source))
            return SourceUtil.FILTER_GROUP_HOMEBREW;
        if (SourceUtil.isPartneredSourceWotc(source))
            return SourceUtil.FILTER_GROUP_PARTNERED;
        return SourceUtil.FILTER_GROUP_STANDARD;
    },

    getAdventureBookSourceHref(source, page) {
        if (!source)
            return null;
        source = source.toLowerCase();

        let docPage, mappedSource;
        if (Parser.SOURCES_AVAILABLE_DOCS_BOOK[source]) {
            docPage = UrlUtil.PG_BOOK;
            mappedSource = Parser.SOURCES_AVAILABLE_DOCS_BOOK[source];
        } else if (Parser.SOURCES_AVAILABLE_DOCS_ADVENTURE[source]) {
            docPage = UrlUtil.PG_ADVENTURE;
            mappedSource = Parser.SOURCES_AVAILABLE_DOCS_ADVENTURE[source];
        }
        if (!docPage)
            return null;

        mappedSource = mappedSource.toLowerCase();

        return `${docPage}#${[mappedSource, page ? `page:${page}` : null].filter(Boolean).join(HASH_PART_SEP)}`;
    },

    getEntitySource(it) {
        return it.source || it.inherits?.source;
    },
};
//#endregion
//#region MiscUtil
globalThis.MiscUtil = {
    COLOR_HEALTHY: "#00bb20",
    COLOR_HURT: "#c5ca00",
    COLOR_BLOODIED: "#f7a100",
    COLOR_DEFEATED: "#cc0000",

    copy(obj, {isSafe=false, isPreserveUndefinedValueKeys=false}={}) {
        if (isSafe && obj === undefined)
            return undefined;
        return JSON.parse(JSON.stringify(obj));
    },

    copyFast(obj) {
        if ((typeof obj !== "object") || obj == null)
            return obj;

        if (obj instanceof Array)
            return obj.map(MiscUtil.copyFast);

        const cpy = {};
        for (const k of Object.keys(obj))
            cpy[k] = MiscUtil.copyFast(obj[k]);
        return cpy;
    },

    async pCopyTextToClipboard(text) {
        function doCompatibilityCopy() {
            const $iptTemp = $(`<textarea class="clp__wrp-temp"></textarea>`).appendTo(document.body).val(text).select();
            document.execCommand("Copy");
            $iptTemp.remove();
        }

        if (navigator && navigator.permissions) {
            try {
                const access = await navigator.permissions.query({
                    name: "clipboard-write"
                });
                if (access.state === "granted" || access.state === "prompt") {
                    await navigator.clipboard.writeText(text);
                } else
                    doCompatibilityCopy();
            } catch (e) {
                doCompatibilityCopy();
            }
        } else
            doCompatibilityCopy();
    },

    checkProperty(object, ...path) {
        for (let i = 0; i < path.length; ++i) {
            object = object[path[i]];
            if (object == null)
                return false;
        }
        return true;
    },

    /**Returns null if object doesn't have all the child (and grandchild) properties listed in the path.
     * Returns the final property in the path if it exists */
    get(object, ...path) {
        if (object == null)
            return null;
        for (let i = 0; i < path.length; ++i) {
            object = object[path[i]];
            if (object == null)
                return object;
        }
        return object;
    },

    set(object, ...pathAndVal) {
        if (object == null)
            return null;

        const val = pathAndVal.pop();
        if (!pathAndVal.length)
            return null;

        const len = pathAndVal.length;
        for (let i = 0; i < len; ++i) {
            const pathPart = pathAndVal[i];
            if (i === len - 1)
                object[pathPart] = val;
            else
                object = (object[pathPart] = object[pathPart] || {});
        }

        return val;
    },

    getOrSet(object, ...pathAndVal) {
        if (pathAndVal.length < 2)
            return null;
        const existing = MiscUtil.get(object, ...pathAndVal.slice(0, -1));
        if (existing != null)
            return existing;
        return MiscUtil.set(object, ...pathAndVal);
    },

    getThenSetCopy(object1, object2, ...path) {
        const val = MiscUtil.get(object1, ...path);
        return MiscUtil.set(object2, ...path, MiscUtil.copyFast(val, {
            isSafe: true
        }));
    },

    delete(object, ...path) {
        if (object == null)
            return object;
        for (let i = 0; i < path.length - 1; ++i) {
            object = object[path[i]];
            if (object == null)
                return object;
        }
        return delete object[path.last()];
    },

    deleteObjectPath(object, ...path) {
        const stack = [object];

        if (object == null)
            return object;
        for (let i = 0; i < path.length - 1; ++i) {
            object = object[path[i]];
            stack.push(object);
            if (object === undefined)
                return object;
        }
        const out = delete object[path.last()];

        for (let i = path.length - 1; i > 0; --i) {
            if (!Object.keys(stack[i]).length)
                delete stack[i - 1][path[i - 1]];
        }

        return out;
    },

    merge(obj1, obj2) {
        obj2 = MiscUtil.copyFast(obj2);

        Object.entries(obj2).forEach(([k,v])=>{
            if (obj1[k] == null) {
                obj1[k] = v;
                return;
            }

            if (typeof obj1[k] === "object" && typeof v === "object" && !(obj1[k]instanceof Array) && !(v instanceof Array)) {
                MiscUtil.merge(obj1[k], v);
                return;
            }

            obj1[k] = v;
        }
        );

        return obj1;
    },

    mix: (superclass)=>new MiscUtil._MixinBuilder(superclass),
    _MixinBuilder: function(superclass) {
        this.superclass = superclass;

        this.with = function(...mixins) {
            return mixins.reduce((c,mixin)=>mixin(c), this.superclass);
        }
        ;
    },

    clearSelection() {
        if (document.getSelection) {
            document.getSelection().removeAllRanges();
            document.getSelection().addRange(document.createRange());
        } else if (window.getSelection) {
            if (window.getSelection().removeAllRanges) {
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(document.createRange());
            } else if (window.getSelection().empty) {
                window.getSelection().empty();
            }
        } else if (document.selection) {
            document.selection.empty();
        }
    },

    randomColor() {
        let r;
        let g;
        let b;
        const h = RollerUtil.randomise(30, 0) / 30;
        const i = ~~(h * 6);
        const f = h * 6 - i;
        const q = 1 - f;
        switch (i % 6) {
        case 0:
            r = 1;
            g = f;
            b = 0;
            break;
        case 1:
            r = q;
            g = 1;
            b = 0;
            break;
        case 2:
            r = 0;
            g = 1;
            b = f;
            break;
        case 3:
            r = 0;
            g = q;
            b = 1;
            break;
        case 4:
            r = f;
            g = 0;
            b = 1;
            break;
        case 5:
            r = 1;
            g = 0;
            b = q;
            break;
        }
        return `#${`00${(~~(r * 255)).toString(16)}`.slice(-2)}${`00${(~~(g * 255)).toString(16)}`.slice(-2)}${`00${(~~(b * 255)).toString(16)}`.slice(-2)}`;
    },

    invertColor(hex, opts) {
        opts = opts || {};

        hex = hex.slice(1);
        let r = parseInt(hex.slice(0, 2), 16);
        let g = parseInt(hex.slice(2, 4), 16);
        let b = parseInt(hex.slice(4, 6), 16);

        const isDark = (r * 0.299 + g * 0.587 + b * 0.114) > 186;
        if (opts.dark && opts.light)
            return isDark ? opts.dark : opts.light;
        else if (opts.bw)
            return isDark ? "#000000" : "#FFFFFF";

        r = (255 - r).toString(16);
        g = (255 - g).toString(16);
        b = (255 - b).toString(16);
        return `#${[r, g, b].map(it=>it.padStart(2, "0")).join("")}`;
    },

    scrollPageTop() {
        document.body.scrollTop = document.documentElement.scrollTop = 0;
    },

    expEval(str) {
        return new Function(`return ${str.replace(/[^-()\d/*+.]/g, "")}`)();
    },

    parseNumberRange(input, min=Number.MIN_SAFE_INTEGER, max=Number.MAX_SAFE_INTEGER) {
        if (!input || !input.trim())
            return null;

        const errInvalid = input=>{
            throw new Error(`Could not parse range input "${input}"`);
        }
        ;

        const errOutOfRange = ()=>{
            throw new Error(`Number was out of range! Range was ${min}-${max} (inclusive).`);
        }
        ;

        const isOutOfRange = (num)=>num < min || num > max;

        const addToRangeVal = (range,num)=>range.add(num);

        const addToRangeLoHi = (range,lo,hi)=>{
            for (let i = lo; i <= hi; ++i)
                range.add(i);
        }
        ;

        const clean = input.replace(/\s*/g, "");
        if (!/^((\d+-\d+|\d+),)*(\d+-\d+|\d+)$/.exec(clean))
            errInvalid();

        const parts = clean.split(",");
        const out = new Set();

        for (const part of parts) {
            if (part.includes("-")) {
                const spl = part.split("-");
                const numLo = Number(spl[0]);
                const numHi = Number(spl[1]);

                if (isNaN(numLo) || isNaN(numHi) || numLo === 0 || numHi === 0 || numLo > numHi)
                    errInvalid();

                if (isOutOfRange(numLo) || isOutOfRange(numHi))
                    errOutOfRange();

                if (numLo === numHi)
                    addToRangeVal(out, numLo);
                else
                    addToRangeLoHi(out, numLo, numHi);
                continue;
            }

            const num = Number(part);
            if (isNaN(num) || num === 0)
                errInvalid();

            if (isOutOfRange(num))
                errOutOfRange();
            addToRangeVal(out, num);
        }

        return out;
    },

    findCommonPrefix(strArr, {isRespectWordBoundaries}={}) {
        if (isRespectWordBoundaries) {
            return MiscUtil._findCommonPrefixSuffixWords({
                strArr
            });
        }

        let prefix = null;
        strArr.forEach(s=>{
            if (prefix == null) {
                prefix = s;
                return;
            }

            const minLen = Math.min(s.length, prefix.length);
            for (let i = 0; i < minLen; ++i) {
                const cp = prefix[i];
                const cs = s[i];
                if (cp !== cs) {
                    prefix = prefix.substring(0, i);
                    break;
                }
            }
        }
        );
        return prefix;
    },

    findCommonSuffix(strArr, {isRespectWordBoundaries}={}) {
        if (!isRespectWordBoundaries)
            throw new Error(`Unimplemented!`);

        return MiscUtil._findCommonPrefixSuffixWords({
            strArr,
            isSuffix: true
        });
    },

    _findCommonPrefixSuffixWords({strArr, isSuffix}) {
        let prefixTks = null;
        let lenMax = -1;

        strArr.map(str=>{
            lenMax = Math.max(lenMax, str.length);
            return str.split(" ");
        }
        ).forEach(tks=>{
            if (isSuffix)
                tks.reverse();

            if (prefixTks == null)
                return prefixTks = [...tks];

            const minLen = Math.min(tks.length, prefixTks.length);
            while (prefixTks.length > minLen)
                prefixTks.pop();

            for (let i = 0; i < minLen; ++i) {
                const cp = prefixTks[i];
                const cs = tks[i];
                if (cp !== cs) {
                    prefixTks = prefixTks.slice(0, i);
                    break;
                }
            }
        }
        );

        if (isSuffix)
            prefixTks.reverse();

        if (!prefixTks.length)
            return "";

        const out = prefixTks.join(" ");
        if (out.length === lenMax)
            return out;

        return isSuffix ? ` ${prefixTks.join(" ")}` : `${prefixTks.join(" ")} `;
    },

    calculateBlendedColor(fgHexTarget, fgOpacity, bgHex) {
        const fgDcTarget = CryptUtil.hex2Dec(fgHexTarget);
        const bgDc = CryptUtil.hex2Dec(bgHex);
        return ((fgDcTarget - ((1 - fgOpacity) * bgDc)) / fgOpacity).toString(16);
    },

    debounce(func, wait, options) {
        let lastArgs;
        let lastThis;
        let maxWait;
        let result;
        let timerId;
        let lastCallTime;
        let lastInvokeTime = 0;
        let leading = false;
        let maxing = false;
        let trailing = true;

        wait = Number(wait) || 0;
        if (typeof options === "object") {
            leading = !!options.leading;
            maxing = "maxWait"in options;
            maxWait = maxing ? Math.max(Number(options.maxWait) || 0, wait) : maxWait;
            trailing = "trailing"in options ? !!options.trailing : trailing;
        }

        function invokeFunc(time) {
            let args = lastArgs;
            let thisArg = lastThis;

            lastArgs = lastThis = undefined;
            lastInvokeTime = time;
            result = func.apply(thisArg, args);
            return result;
        }

        function leadingEdge(time) {
            lastInvokeTime = time;
            timerId = setTimeout(timerExpired, wait);
            return leading ? invokeFunc(time) : result;
        }

        function remainingWait(time) {
            let timeSinceLastCall = time - lastCallTime;
            let timeSinceLastInvoke = time - lastInvokeTime;
            let result = wait - timeSinceLastCall;
            return maxing ? Math.min(result, maxWait - timeSinceLastInvoke) : result;
        }

        function shouldInvoke(time) {
            let timeSinceLastCall = time - lastCallTime;
            let timeSinceLastInvoke = time - lastInvokeTime;

            return (lastCallTime === undefined || (timeSinceLastCall >= wait) || (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
        }

        function timerExpired() {
            const time = Date.now();
            if (shouldInvoke(time)) {
                return trailingEdge(time);
            }
            timerId = setTimeout(timerExpired, remainingWait(time));
        }

        function trailingEdge(time) {
            timerId = undefined;

            if (trailing && lastArgs)
                return invokeFunc(time);
            lastArgs = lastThis = undefined;
            return result;
        }

        function cancel() {
            if (timerId !== undefined)
                clearTimeout(timerId);
            lastInvokeTime = 0;
            lastArgs = lastCallTime = lastThis = timerId = undefined;
        }

        function flush() {
            return timerId === undefined ? result : trailingEdge(Date.now());
        }

        function debounced() {
            let time = Date.now();
            let isInvoking = shouldInvoke(time);
            lastArgs = arguments;
            lastThis = this;
            lastCallTime = time;

            if (isInvoking) {
                if (timerId === undefined)
                    return leadingEdge(lastCallTime);
                if (maxing) {
                    timerId = setTimeout(timerExpired, wait);
                    return invokeFunc(lastCallTime);
                }
            }
            if (timerId === undefined)
                timerId = setTimeout(timerExpired, wait);
            return result;
        }

        debounced.cancel = cancel;
        debounced.flush = flush;
        return debounced;
    },

    throttle(func, wait, options) {
        let leading = true;
        let trailing = true;

        if (typeof options === "object") {
            leading = "leading"in options ? !!options.leading : leading;
            trailing = "trailing"in options ? !!options.trailing : trailing;
        }

        return this.debounce(func, wait, {
            leading,
            maxWait: wait,
            trailing
        });
    },

    pDelay(msecs, resolveAs) {
        return new Promise(resolve=>setTimeout(()=>resolve(resolveAs), msecs));
    },

    GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST: new Set(["caption", "type", "colLabels", "colLabelGroups", "name", "colStyles", "style", "shortName", "subclassShortName", "id", "path"]),

    getWalker(opts) {
        opts = opts || {};

        if (opts.isBreakOnReturn && !opts.isNoModification)
            throw new Error(`"isBreakOnReturn" may only be used in "isNoModification" mode!`);

        const keyBlocklist = opts.keyBlocklist || new Set();

        const getMappedPrimitive = (obj,primitiveHandlers,lastKey,stack,prop,propPre,propPost)=>{
            if (primitiveHandlers[propPre])
                MiscUtil._getWalker_runHandlers({
                    handlers: primitiveHandlers[propPre],
                    obj,
                    lastKey,
                    stack
                });
            if (primitiveHandlers[prop]) {
                const out = MiscUtil._getWalker_applyHandlers({
                    opts,
                    handlers: primitiveHandlers[prop],
                    obj,
                    lastKey,
                    stack
                });
                if (out === VeCt.SYM_WALKER_BREAK)
                    return out;
                if (!opts.isNoModification)
                    obj = out;
            }
            if (primitiveHandlers[propPost])
                MiscUtil._getWalker_runHandlers({
                    handlers: primitiveHandlers[propPost],
                    obj,
                    lastKey,
                    stack
                });
            return obj;
        }
        ;

        const doObjectRecurse = (obj,primitiveHandlers,stack)=>{
            for (const k of Object.keys(obj)) {
                if (keyBlocklist.has(k))
                    continue;

                const out = fn(obj[k], primitiveHandlers, k, stack);
                if (out === VeCt.SYM_WALKER_BREAK)
                    return VeCt.SYM_WALKER_BREAK;
                if (!opts.isNoModification)
                    obj[k] = out;
            }
        }
        ;

        const fn = (obj,primitiveHandlers,lastKey,stack)=>{
            if (obj === null)
                return getMappedPrimitive(obj, primitiveHandlers, lastKey, stack, "null", "preNull", "postNull");

            switch (typeof obj) {
            case "undefined":
                return getMappedPrimitive(obj, primitiveHandlers, lastKey, stack, "undefined", "preUndefined", "postUndefined");
            case "boolean":
                return getMappedPrimitive(obj, primitiveHandlers, lastKey, stack, "boolean", "preBoolean", "postBoolean");
            case "number":
                return getMappedPrimitive(obj, primitiveHandlers, lastKey, stack, "number", "preNumber", "postNumber");
            case "string":
                return getMappedPrimitive(obj, primitiveHandlers, lastKey, stack, "string", "preString", "postString");
            case "object":
                {
                    if (obj instanceof Array) {
                        if (primitiveHandlers.preArray)
                            MiscUtil._getWalker_runHandlers({
                                handlers: primitiveHandlers.preArray,
                                obj,
                                lastKey,
                                stack
                            });
                        if (opts.isDepthFirst) {
                            if (stack)
                                stack.push(obj);
                            const out = new Array(obj.length);
                            for (let i = 0, len = out.length; i < len; ++i) {
                                out[i] = fn(obj[i], primitiveHandlers, lastKey, stack);
                                if (out[i] === VeCt.SYM_WALKER_BREAK)
                                    return out[i];
                            }
                            if (!opts.isNoModification)
                                obj = out;
                            if (stack)
                                stack.pop();

                            if (primitiveHandlers.array) {
                                const out = MiscUtil._getWalker_applyHandlers({
                                    opts,
                                    handlers: primitiveHandlers.array,
                                    obj,
                                    lastKey,
                                    stack
                                });
                                if (out === VeCt.SYM_WALKER_BREAK)
                                    return out;
                                if (!opts.isNoModification)
                                    obj = out;
                            }
                            if (obj == null) {
                                if (!opts.isAllowDeleteArrays)
                                    throw new Error(`Array handler(s) returned null!`);
                            }
                        } else {
                            if (primitiveHandlers.array) {
                                const out = MiscUtil._getWalker_applyHandlers({
                                    opts,
                                    handlers: primitiveHandlers.array,
                                    obj,
                                    lastKey,
                                    stack
                                });
                                if (out === VeCt.SYM_WALKER_BREAK)
                                    return out;
                                if (!opts.isNoModification)
                                    obj = out;
                            }
                            if (obj != null) {
                                const out = new Array(obj.length);
                                for (let i = 0, len = out.length; i < len; ++i) {
                                    if (stack)
                                        stack.push(obj);
                                    out[i] = fn(obj[i], primitiveHandlers, lastKey, stack);
                                    if (stack)
                                        stack.pop();
                                    if (out[i] === VeCt.SYM_WALKER_BREAK)
                                        return out[i];
                                }
                                if (!opts.isNoModification)
                                    obj = out;
                            } else {
                                if (!opts.isAllowDeleteArrays)
                                    throw new Error(`Array handler(s) returned null!`);
                            }
                        }
                        if (primitiveHandlers.postArray)
                            MiscUtil._getWalker_runHandlers({
                                handlers: primitiveHandlers.postArray,
                                obj,
                                lastKey,
                                stack
                            });
                        return obj;
                    }

                    if (primitiveHandlers.preObject)
                        MiscUtil._getWalker_runHandlers({
                            handlers: primitiveHandlers.preObject,
                            obj,
                            lastKey,
                            stack
                        });
                    if (opts.isDepthFirst) {
                        if (stack)
                            stack.push(obj);
                        const flag = doObjectRecurse(obj, primitiveHandlers, stack);
                        if (stack)
                            stack.pop();
                        if (flag === VeCt.SYM_WALKER_BREAK)
                            return flag;

                        if (primitiveHandlers.object) {
                            const out = MiscUtil._getWalker_applyHandlers({
                                opts,
                                handlers: primitiveHandlers.object,
                                obj,
                                lastKey,
                                stack
                            });
                            if (out === VeCt.SYM_WALKER_BREAK)
                                return out;
                            if (!opts.isNoModification)
                                obj = out;
                        }
                        if (obj == null) {
                            if (!opts.isAllowDeleteObjects)
                                throw new Error(`Object handler(s) returned null!`);
                        }
                    } else {
                        if (primitiveHandlers.object) {
                            const out = MiscUtil._getWalker_applyHandlers({
                                opts,
                                handlers: primitiveHandlers.object,
                                obj,
                                lastKey,
                                stack
                            });
                            if (out === VeCt.SYM_WALKER_BREAK)
                                return out;
                            if (!opts.isNoModification)
                                obj = out;
                        }
                        if (obj == null) {
                            if (!opts.isAllowDeleteObjects)
                                throw new Error(`Object handler(s) returned null!`);
                        } else {
                            if (stack)
                                stack.push(obj);
                            const flag = doObjectRecurse(obj, primitiveHandlers, stack);
                            if (stack)
                                stack.pop();
                            if (flag === VeCt.SYM_WALKER_BREAK)
                                return flag;
                        }
                    }
                    if (primitiveHandlers.postObject)
                        MiscUtil._getWalker_runHandlers({
                            handlers: primitiveHandlers.postObject,
                            obj,
                            lastKey,
                            stack
                        });
                    return obj;
                }
            default:
                throw new Error(`Unhandled type "${typeof obj}"`);
            }
        }
        ;

        return {
            walk: fn
        };
    },

    _getWalker_applyHandlers({opts, handlers, obj, lastKey, stack}) {
        handlers = handlers instanceof Array ? handlers : [handlers];
        const didBreak = handlers.some(h=>{
            const out = h(obj, lastKey, stack);
            if (opts.isBreakOnReturn && out)
                return true;
            if (!opts.isNoModification)
                obj = out;
        }
        );
        if (didBreak)
            return VeCt.SYM_WALKER_BREAK;
        return obj;
    },

    _getWalker_runHandlers({handlers, obj, lastKey, stack}) {
        handlers = handlers instanceof Array ? handlers : [handlers];
        handlers.forEach(h=>h(obj, lastKey, stack));
    },

    getAsyncWalker(opts) {
        opts = opts || {};
        const keyBlocklist = opts.keyBlocklist || new Set();

        const pFn = async(obj,primitiveHandlers,lastKey,stack)=>{
            if (obj == null) {
                if (primitiveHandlers.null)
                    return MiscUtil._getAsyncWalker_pApplyHandlers({
                        opts,
                        handlers: primitiveHandlers.null,
                        obj,
                        lastKey,
                        stack
                    });
                return obj;
            }

            const pDoObjectRecurse = async()=>{
                await Object.keys(obj).pSerialAwaitMap(async k=>{
                    const v = obj[k];
                    if (keyBlocklist.has(k))
                        return;
                    const out = await pFn(v, primitiveHandlers, k, stack);
                    if (!opts.isNoModification)
                        obj[k] = out;
                }
                );
            }
            ;

            const to = typeof obj;
            switch (to) {
            case undefined:
                if (primitiveHandlers.preUndefined)
                    await MiscUtil._getAsyncWalker_pRunHandlers({
                        handlers: primitiveHandlers.preUndefined,
                        obj,
                        lastKey,
                        stack
                    });
                if (primitiveHandlers.undefined) {
                    const out = await MiscUtil._getAsyncWalker_pApplyHandlers({
                        opts,
                        handlers: primitiveHandlers.undefined,
                        obj,
                        lastKey,
                        stack
                    });
                    if (!opts.isNoModification)
                        obj = out;
                }
                if (primitiveHandlers.postUndefined)
                    await MiscUtil._getAsyncWalker_pRunHandlers({
                        handlers: primitiveHandlers.postUndefined,
                        obj,
                        lastKey,
                        stack
                    });
                return obj;
            case "boolean":
                if (primitiveHandlers.preBoolean)
                    await MiscUtil._getAsyncWalker_pRunHandlers({
                        handlers: primitiveHandlers.preBoolean,
                        obj,
                        lastKey,
                        stack
                    });
                if (primitiveHandlers.boolean) {
                    const out = await MiscUtil._getAsyncWalker_pApplyHandlers({
                        opts,
                        handlers: primitiveHandlers.boolean,
                        obj,
                        lastKey,
                        stack
                    });
                    if (!opts.isNoModification)
                        obj = out;
                }
                if (primitiveHandlers.postBoolean)
                    await MiscUtil._getAsyncWalker_pRunHandlers({
                        handlers: primitiveHandlers.postBoolean,
                        obj,
                        lastKey,
                        stack
                    });
                return obj;
            case "number":
                if (primitiveHandlers.preNumber)
                    await MiscUtil._getAsyncWalker_pRunHandlers({
                        handlers: primitiveHandlers.preNumber,
                        obj,
                        lastKey,
                        stack
                    });
                if (primitiveHandlers.number) {
                    const out = await MiscUtil._getAsyncWalker_pApplyHandlers({
                        opts,
                        handlers: primitiveHandlers.number,
                        obj,
                        lastKey,
                        stack
                    });
                    if (!opts.isNoModification)
                        obj = out;
                }
                if (primitiveHandlers.postNumber)
                    await MiscUtil._getAsyncWalker_pRunHandlers({
                        handlers: primitiveHandlers.postNumber,
                        obj,
                        lastKey,
                        stack
                    });
                return obj;
            case "string":
                if (primitiveHandlers.preString)
                    await MiscUtil._getAsyncWalker_pRunHandlers({
                        handlers: primitiveHandlers.preString,
                        obj,
                        lastKey,
                        stack
                    });
                if (primitiveHandlers.string) {
                    const out = await MiscUtil._getAsyncWalker_pApplyHandlers({
                        opts,
                        handlers: primitiveHandlers.string,
                        obj,
                        lastKey,
                        stack
                    });
                    if (!opts.isNoModification)
                        obj = out;
                }
                if (primitiveHandlers.postString)
                    await MiscUtil._getAsyncWalker_pRunHandlers({
                        handlers: primitiveHandlers.postString,
                        obj,
                        lastKey,
                        stack
                    });
                return obj;
            case "object":
                {
                    if (obj instanceof Array) {
                        if (primitiveHandlers.preArray)
                            await MiscUtil._getAsyncWalker_pRunHandlers({
                                handlers: primitiveHandlers.preArray,
                                obj,
                                lastKey,
                                stack
                            });
                        if (opts.isDepthFirst) {
                            if (stack)
                                stack.push(obj);
                            const out = await obj.pSerialAwaitMap(it=>pFn(it, primitiveHandlers, lastKey, stack));
                            if (!opts.isNoModification)
                                obj = out;
                            if (stack)
                                stack.pop();

                            if (primitiveHandlers.array) {
                                const out = await MiscUtil._getAsyncWalker_pApplyHandlers({
                                    opts,
                                    handlers: primitiveHandlers.array,
                                    obj,
                                    lastKey,
                                    stack
                                });
                                if (!opts.isNoModification)
                                    obj = out;
                            }
                            if (obj == null) {
                                if (!opts.isAllowDeleteArrays)
                                    throw new Error(`Array handler(s) returned null!`);
                            }
                        } else {
                            if (primitiveHandlers.array) {
                                const out = await MiscUtil._getAsyncWalker_pApplyHandlers({
                                    opts,
                                    handlers: primitiveHandlers.array,
                                    obj,
                                    lastKey,
                                    stack
                                });
                                if (!opts.isNoModification)
                                    obj = out;
                            }
                            if (obj != null) {
                                const out = await obj.pSerialAwaitMap(it=>pFn(it, primitiveHandlers, lastKey, stack));
                                if (!opts.isNoModification)
                                    obj = out;
                            } else {
                                if (!opts.isAllowDeleteArrays)
                                    throw new Error(`Array handler(s) returned null!`);
                            }
                        }
                        if (primitiveHandlers.postArray)
                            await MiscUtil._getAsyncWalker_pRunHandlers({
                                handlers: primitiveHandlers.postArray,
                                obj,
                                lastKey,
                                stack
                            });
                        return obj;
                    } else {
                        if (primitiveHandlers.preObject)
                            await MiscUtil._getAsyncWalker_pRunHandlers({
                                handlers: primitiveHandlers.preObject,
                                obj,
                                lastKey,
                                stack
                            });
                        if (opts.isDepthFirst) {
                            if (stack)
                                stack.push(obj);
                            await pDoObjectRecurse();
                            if (stack)
                                stack.pop();

                            if (primitiveHandlers.object) {
                                const out = await MiscUtil._getAsyncWalker_pApplyHandlers({
                                    opts,
                                    handlers: primitiveHandlers.object,
                                    obj,
                                    lastKey,
                                    stack
                                });
                                if (!opts.isNoModification)
                                    obj = out;
                            }
                            if (obj == null) {
                                if (!opts.isAllowDeleteObjects)
                                    throw new Error(`Object handler(s) returned null!`);
                            }
                        } else {
                            if (primitiveHandlers.object) {
                                const out = await MiscUtil._getAsyncWalker_pApplyHandlers({
                                    opts,
                                    handlers: primitiveHandlers.object,
                                    obj,
                                    lastKey,
                                    stack
                                });
                                if (!opts.isNoModification)
                                    obj = out;
                            }
                            if (obj == null) {
                                if (!opts.isAllowDeleteObjects)
                                    throw new Error(`Object handler(s) returned null!`);
                            } else {
                                await pDoObjectRecurse();
                            }
                        }
                        if (primitiveHandlers.postObject)
                            await MiscUtil._getAsyncWalker_pRunHandlers({
                                handlers: primitiveHandlers.postObject,
                                obj,
                                lastKey,
                                stack
                            });
                        return obj;
                    }
                }
            default:
                throw new Error(`Unhandled type "${to}"`);
            }
        }
        ;

        return {
            pWalk: pFn
        };
    },

    async _getAsyncWalker_pApplyHandlers({opts, handlers, obj, lastKey, stack}) {
        handlers = handlers instanceof Array ? handlers : [handlers];
        await handlers.pSerialAwaitMap(async pH=>{
            const out = await pH(obj, lastKey, stack);
            if (!opts.isNoModification)
                obj = out;
        }
        );
        return obj;
    },

    async _getAsyncWalker_pRunHandlers({handlers, obj, lastKey, stack}) {
        handlers = handlers instanceof Array ? handlers : [handlers];
        await handlers.pSerialAwaitMap(pH=>pH(obj, lastKey, stack));
    },

    pDefer(fn) {
        return (async()=>fn())();
    },
};
//#endregion
//#region UtilDataConverter
class UtilDataConverter {
    static getNameWithSourcePart(ent, {displayName=null, isActorItem=false}={}) {
        return `${displayName || `${ent.type === "variant" ? "Variant: " : ""}${Renderer.stripTags(UtilEntityGeneric.getName(ent))}`}${!isActorItem && ent.source && Config.get("import", "isAddSourceToName") ? ` (${Parser.sourceJsonToAbv(ent.source)})` : ""}`;
    }

    static async pGetItemWeaponType(uid) {
        uid = uid.toLowerCase().trim();

        if (UtilDataConverter.WEAPONS_MARTIAL.includes(uid)){return "martial";}
        if (UtilDataConverter.WEAPONS_SIMPLE.includes(uid)){return "simple";}

        let[name,source] = Renderer.splitTagByPipe(uid);
        source = source || "phb";
        const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS]({name, source});

        //TEMPFIX
        return null;
        const found = await DataLoader.pCacheAndGet(UrlUtil.PG_ITEMS, source, hash);
        return found?.weaponCategory;
    }

    static async _pGetClassSubclass_pInitCache({cache}) {
        cache = cache || {};
        if (!cache._allClasses && !cache._allSubclasses) {
            const classData = await DataUtil.class.loadJSON();
            const prerelease = await PrereleaseUtil.pGetBrewProcessed();
            const brew = await BrewUtil2.pGetBrewProcessed();

            cache._allClasses = [...(classData.class || []), ...(prerelease?.class || []), ...(brew?.class || []), ];

            cache._allSubclasses = [...(classData.subclass || []), ...(prerelease?.subclass || []), ...(brew?.subclass || []), ];
        }
        return cache;
    }

    static async pGetClassItemClassAndSubclass({sheetItem, subclassSheetItems, cache=null}={}) {
        cache = await this._pGetClassSubclass_pInitCache({
            cache
        });

        const nameLowerClean = sheetItem.name.toLowerCase().trim();
        const sourceLowerClean = (UtilDocumentSource.getDocumentSource(sheetItem).source || "").toLowerCase();

        const matchingClasses = cache._allClasses.filter(cls=>cls.name.toLowerCase() === nameLowerClean && (!Config.get("import", "isStrictMatching") || sourceLowerClean === Parser.sourceJsonToAbv(cls.source).toLowerCase()), );
        if (!matchingClasses.length)
            return {
                matchingClasses: [],
                matchingSubclasses: [],
                sheetItem
            };

        if (!subclassSheetItems?.length)
            return {
                matchingClasses,
                matchingSubclasses: [],
                sheetItem
            };

        const matchingSubclasses = matchingClasses.map(cls=>{
            const classSubclassSheetItems = subclassSheetItems.filter(scItem=>scItem.system.classIdentifier === sheetItem.system.identifier);
            return cache._allSubclasses.filter(sc=>{
                if (sc.className !== cls.name || sc.classSource !== cls.source)
                    return false;

                return classSubclassSheetItems.some(scItem=>sc.name.toLowerCase() === scItem.name.toLowerCase().trim() && (!Config.get("import", "isStrictMatching") || (UtilDocumentSource.getDocumentSource(scItem).source || "").toLowerCase() === Parser.sourceJsonToAbv(sc.source).toLowerCase()), );
            }
            );
        }
        ).flat();

        return {
            matchingClasses,
            matchingSubclasses,
            sheetItem
        };
    }

    static getSpellPointTotal({totalSpellcastingLevels}) {
        if (!totalSpellcastingLevels)
            return 0;

        const spellSlotCounts = UtilDataConverter.CASTER_TYPE_TO_PROGRESSION.full[totalSpellcastingLevels - 1] || UtilDataConverter.CASTER_TYPE_TO_PROGRESSION.full[0];

        return spellSlotCounts.map((countSlots,ix)=>{
            const spellLevel = ix + 1;
            return Parser.spLevelToSpellPoints(spellLevel) * countSlots;
        }
        ).sum();
    }

    static getPsiPointTotal({totalMysticLevels}) {
        if (!totalMysticLevels || isNaN(totalMysticLevels) || totalMysticLevels < 0)
            return 0;

        totalMysticLevels = Math.round(Math.min(totalMysticLevels, Consts.CHAR_MAX_LEVEL));

        return [4, 6, 14, 17, 27, 32, 38, 44, 57, 64, 64, 64, 64, 64, 64, 64, 64, 71, 71, 71][totalMysticLevels - 1];
    }

    static async pGetWithDescriptionPlugins(pFn, {actorId=null, tagHashItemIdMap=null}={}) {
        const hkLink = (entry,procHash)=>this._pGetWithDescriptionPlugins_fnPlugin(entry, procHash);

        const hkStr = (tag,text)=>{
            const inn = `{${tag} ${text}}`;
            const itemId = this._pGetWithDescriptionPlugins_getTagItemId({
                tag,
                text,
                tagHashItemIdMap
            });
            const out = this._getConvertedTagLinkString(inn, {
                actorId,
                itemId
            });
            if (inn === out)
                return null;
            return out;
        }
        ;

        const hkStrFont = (tag,text)=>{
            if (!game.user.isGM)
                return;

            const [,fontFamily] = Renderer.splitTagByPipe(text);

            if (UtilDataConverter._DESCRIPTION_FONTS_TRACKED[fontFamily])
                return;
            UtilDataConverter._DESCRIPTION_FONTS_TRACKED[fontFamily] = true;

            if (FontConfig.getAvailableFontChoices()[fontFamily])
                return;

            if (!Config.get("import", "isAutoAddAdditionalFonts")) {
                ui.notifications.warn(`The "${fontFamily}" font, used by recently-rendered content, is not available in your game. You may need to manually add it via the "Additional Fonts" setting, or text using the "${fontFamily}" font may not display correctly.`);
            }

            const url = BrewUtil2.getMetaLookup("fonts")?.[fontFamily] || PrereleaseUtil.getMetaLookup("fonts")?.[fontFamily];

            if (!url)
                return void ui.notifications.warn(`Failed to load font "${fontFamily}". You may need to manually add it via the "Additional Fonts" setting, or text using the "${fontFamily}" font may not display correctly.`);

            this._pDoLoadAdditionalFont(fontFamily, url).then(null);
        }
        ;

        const hkImg = (entry,url)=>{
            const out = Vetools.getImageSavedToServerUrl({
                originalUrl: url
            });
            Vetools.pSaveImageToServerAndGetUrl({
                originalUrl: url,
                force: true
            }).then(null).catch(()=>{}
            );
            return out;
        }
        ;

        Renderer.get().addPlugin("link_attributesHover", hkLink);
        Renderer.get().addPlugin("string_@font", hkStrFont);
        if (Config.get("import", "isRenderLinksAsTags"))
            Renderer.get().addPlugin("string_tag", hkStr);
        if (Config.get("import", "isSaveImagesToServer")) {
            Renderer.get().addPlugin("image_urlPostProcess", hkImg);
            Renderer.get().addPlugin("image_urlThumbnailPostProcess", hkImg);
        }

        let out;
        try {
            out = await pFn();
        } finally {
            Renderer.get().removePlugin("link_attributesHover", hkLink);
            Renderer.get().removePlugin("string_@font", hkStrFont);
            Renderer.get().removePlugin("string_tag", hkStr);
            Renderer.get().removePlugin("image_urlPostProcess", hkImg);
            Renderer.get().removePlugin("image_urlThumbnailPostProcess", hkImg);
        }

        return out;
    }

    static _DESCRIPTION_FONTS_TRACKED = {};
    static _HAS_NOTIFIED_FONTS_RELOAD = false;

    static async _pDoLoadAdditionalFont(family, url) {
        const hasNotified = this._HAS_NOTIFIED_FONTS_RELOAD;
        this._HAS_NOTIFIED_FONTS_RELOAD = true;

        const definitions = game.settings.get("core", FontConfig.SETTING);
        definitions[family] ??= {
            editor: true,
            fonts: []
        };
        const definition = definitions[family];
        definition.fonts.push({
            urls: [url],
            weight: 400,
            style: "normal"
        });
        await game.settings.set("core", FontConfig.SETTING, definitions);
        await FontConfig.loadFont(family, definition);

        if (hasNotified)
            return;

        ChatNotificationHandlers.getHandler("ReloadFonts").pDoPostChatMessage();
    }

    static _pGetWithDescriptionPlugins_getTagItemId({tag, text, tagHashItemIdMap}) {
        const tagName = tag.slice(1);
        if (!tagHashItemIdMap?.[tagName])
            return null;
        const defaultSource = Renderer.tag.TAG_LOOKUP[tagName]?.defaultSource;
        if (!defaultSource)
            return null;
        const page = Renderer.tag.getPage(tagName);
        if (!page)
            return null;
        const hashBuilder = UrlUtil.URL_TO_HASH_BUILDER[page];
        if (!hashBuilder)
            return null;
        let[name,source] = text.split("|");
        source = source || defaultSource;
        const hash = hashBuilder({
            name,
            source
        });
        return tagHashItemIdMap?.[tagName]?.[hash];
    }

    static _pGetWithDescriptionPlugins_fnPlugin(entry, procHash) {
        const page = entry.href.hover.page;
        const source = entry.href.hover.source;
        const hash = procHash;
        const preloadId = entry.href.hover.preloadId;
        return {
            attributesHoverReplace: [`data-plut-hover="${true}" data-plut-hover-page="${page.qq()}" data-plut-hover-source="${source.qq()}" data-plut-hover-hash="${hash.qq()}" ${preloadId ? `data-plut-hover-preload-id="${preloadId.qq()}"` : ""}`, ],
        };
    }

    static _getConvertedTagLinkString(str, {actorId, itemId}={}) {
        this._getConvertedTagLinkString_initLinkTagMetas();
        for (const {tag, re} of this._LINK_TAG_METAS_REPLACE)
            str = str.replace(re, (...m)=>this._replaceEntityLinks_getReplacement({
                tag,
                text: m.last().text,
                actorId,
                itemId
            }));
        for (const {tag, re} of this._LINK_TAG_METAS_REMOVE)
            str = str.replace(re, (...m)=>this._replaceEntityLinks_getRemoved({
                tag,
                text: m.last().text
            }));
        return str;
    }

    static _LINK_TAGS_TO_REMOVE = new Set(["quickref", ]);
    static _LINK_TAG_METAS_REPLACE = null;
    static _LINK_TAG_METAS_REMOVE = null;

    static _getConvertedTagLinkString_initLinkTagMetas() {
        if (!this._LINK_TAG_METAS_REPLACE) {
            this._LINK_TAG_METAS_REPLACE = Renderer.tag.TAGS.filter(it=>it.defaultSource).map(it=>it.tagName).filter(tag=>!this._LINK_TAGS_TO_REMOVE.has(tag)).map(tag=>({
                tag,
                re: this._getConvertedTagLinkString_getRegex({
                    tag
                })
            }));
        }

        if (!this._LINK_TAG_METAS_REMOVE) {
            this._LINK_TAG_METAS_REMOVE = Renderer.tag.TAGS.filter(it=>it.defaultSource).map(it=>it.tagName).filter(tag=>this._LINK_TAGS_TO_REMOVE.has(tag)).map(tag=>({
                tag,
                re: this._getConvertedTagLinkString_getRegex({
                    tag
                })
            }));
        }
    }

    static _getConvertedTagLinkString_getRegex({tag}) {
        return RegExp(`^{@${tag} (?<text>[^}]+)}$`, "g");
    }

    static getConvertedTagLinkEntries(entries) {
        if (!entries)
            return entries;

        return UtilDataConverter.WALKER_GENERIC.walk(MiscUtil.copy(entries), {
            string: str=>{
                const textStack = [""];
                this._getConvertedTagLinkEntries_recurse(str, textStack);
                return textStack.join("");
            }
            ,
        }, );
    }

    static _getConvertedTagLinkEntries_recurse(str, textStack) {
        const tagSplit = Renderer.splitByTags(str);
        const len = tagSplit.length;
        for (let i = 0; i < len; ++i) {
            const s = tagSplit[i];
            if (!s)
                continue;

            if (s.startsWith("{@")) {
                const converted = this._getConvertedTagLinkString(s);

                if (converted !== s) {
                    textStack[0] += (converted);
                    continue;
                }

                textStack[0] += s.slice(0, 1);
                this._getConvertedTagLinkEntries_recurse(s.slice(1, -1), textStack);
                textStack[0] += s.slice(-1);

                continue;
            }

            textStack[0] += s;
        }
    }

    static _replaceEntityLinks_getReplacement({tag, text, actorId, itemId}) {
        if (actorId && itemId) {
            const [,,displayText] = text.split("|");
            return `@UUID[Actor.${actorId}.Item.${itemId}]${displayText ? `{${displayText}}` : ""}`;
        }
        return `@${tag}[${text}]`;
    }

    static _replaceEntityLinks_getRemoved({tag, text}) {
        return Renderer.stripTags(`{@${tag} ${text}}`);
    }

    static async _pReplaceEntityLinks_pReplace({str, re, tag}) {
        let m;
        while ((m = re.exec(str))) {
            const prefix = str.slice(0, m.index);
            const suffix = str.slice(re.lastIndex);
            const replacement = this._replaceEntityLinks_getReplacement({
                tag,
                m
            });
            str = `${prefix}${replacement}${suffix}`;
            re.lastIndex = prefix.length + replacement.length;
        }
        return str;
    }

    static _RECHARGE_TYPES = {
        "round": null,
        "restShort": "sr",
        "restLong": "lr",
        "dawn": "dawn",
        "dusk": "dusk",
        "midnight": "day",

        "special": null,

        "week": null,
        "month": null,
        "year": null,
        "decade": null,
        "century": null,
    };

    static getFvttUsesPer(it, {isStrict=true}={}) {
        if (isStrict && !this._RECHARGE_TYPES[it])
            return null;
        return Parser._parse_aToB(this._RECHARGE_TYPES, it);
    }

    static getTempDocumentDefaultOwnership({documentType}) {
        if (game.user.isGM)
            return undefined;

        const clazz = CONFIG[documentType].documentClass;

        if (game.user.can(clazz.metadata.permissions.create))
            return undefined;

        return CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
    }
}
UtilDataConverter.WALKER_READONLY_GENERIC = MiscUtil.getWalker({
    isNoModification: true,
    keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST
});
UtilDataConverter.WALKER_GENERIC = MiscUtil.getWalker({
    keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST
});

UtilDataConverter.WEAPONS_MARTIAL = ["battleaxe|phb", "blowgun|phb", "flail|phb", "glaive|phb", "greataxe|phb", "greatsword|phb", "halberd|phb", "hand crossbow|phb", "heavy crossbow|phb", "lance|phb", "longbow|phb", "longsword|phb", "maul|phb", "morningstar|phb", "net|phb", "pike|phb", "rapier|phb", "scimitar|phb", "shortsword|phb", "trident|phb", "war pick|phb", "warhammer|phb", "whip|phb", ];
UtilDataConverter.WEAPONS_SIMPLE = ["club|phb", "dagger|phb", "dart|phb", "greatclub|phb", "handaxe|phb", "javelin|phb", "light crossbow|phb", "light hammer|phb", "mace|phb", "quarterstaff|phb", "shortbow|phb", "sickle|phb", "sling|phb", "spear|phb", ];

UtilDataConverter.CASTER_TYPE_TO_PROGRESSION = {
    "full": [[2, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0], [4, 3, 2, 0, 0, 0, 0, 0, 0], [4, 3, 3, 0, 0, 0, 0, 0, 0], [4, 3, 3, 1, 0, 0, 0, 0, 0], [4, 3, 3, 2, 0, 0, 0, 0, 0], [4, 3, 3, 3, 1, 0, 0, 0, 0], [4, 3, 3, 3, 2, 0, 0, 0, 0], [4, 3, 3, 3, 2, 1, 0, 0, 0], [4, 3, 3, 3, 2, 1, 0, 0, 0], [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 1, 0], [4, 3, 3, 3, 2, 1, 1, 1, 0], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1], ],
    "artificer": [[2, 0, 0, 0, 0], [2, 0, 0, 0, 0], [3, 0, 0, 0, 0], [3, 0, 0, 0, 0], [4, 2, 0, 0, 0], [4, 2, 0, 0, 0], [4, 3, 0, 0, 0], [4, 3, 0, 0, 0], [4, 3, 2, 0, 0], [4, 3, 2, 0, 0], [4, 3, 3, 0, 0], [4, 3, 3, 0, 0], [4, 3, 3, 1, 0], [4, 3, 3, 1, 0], [4, 3, 3, 2, 0], [4, 3, 3, 2, 0], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2], ],
    "1/2": [[0, 0, 0, 0, 0], [2, 0, 0, 0, 0], [3, 0, 0, 0, 0], [3, 0, 0, 0, 0], [4, 2, 0, 0, 0], [4, 2, 0, 0, 0], [4, 3, 0, 0, 0], [4, 3, 0, 0, 0], [4, 3, 2, 0, 0], [4, 3, 2, 0, 0], [4, 3, 3, 0, 0], [4, 3, 3, 0, 0], [4, 3, 3, 1, 0], [4, 3, 3, 1, 0], [4, 3, 3, 2, 0], [4, 3, 3, 2, 0], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2], ],
    "1/3": [[0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 0, 0], [3, 0, 0, 0], [3, 0, 0, 0], [3, 0, 0, 0], [4, 2, 0, 0], [4, 2, 0, 0], [4, 2, 0, 0], [4, 3, 0, 0], [4, 3, 0, 0], [4, 3, 0, 0], [4, 3, 2, 0], [4, 3, 2, 0], [4, 3, 2, 0], [4, 3, 3, 0], [4, 3, 3, 0], [4, 3, 3, 0], [4, 3, 3, 1], [4, 3, 3, 1], ],
    "pact": [[1, 0, 0, 0, 0], [2, 0, 0, 0, 0], [0, 2, 0, 0, 0], [0, 2, 0, 0, 0], [0, 0, 2, 0, 0], [0, 0, 2, 0, 0], [0, 0, 0, 2, 0], [0, 0, 0, 2, 0], [0, 0, 0, 0, 2], [0, 0, 0, 0, 2], [0, 0, 0, 0, 3], [0, 0, 0, 0, 3], [0, 0, 0, 0, 3], [0, 0, 0, 0, 3], [0, 0, 0, 0, 3], [0, 0, 0, 0, 3], [0, 0, 0, 0, 4], [0, 0, 0, 0, 4], [0, 0, 0, 0, 4], [0, 0, 0, 0, 4], ],
};
//#endregion
//#region DataConverter
class DataConverter {
    static _configGroup;

    static _SideDataInterface;
    static _ImageFetcher;

    static async pGetDocumentJson(ent, opts) {
        throw new Error("Unimplemented!");
    }

    static isStubEntity(ent) {
        return false;
    }

    static getTagUids(tag, str) {
        const re = new RegExp(`{@${tag} ([^}]+)}`,"gi");
        const out = [];
        str.replace(re, (...m)=>out.push(m[1]));
        return out;
    }

    static getCombinedFoundrySystem(foundrySystem, _foundryData) {
        if (!_foundryData && !foundrySystem)
            return {};

        const combinedFoundrySystem = MiscUtil.copy(_foundryData || {});
        Object.assign(combinedFoundrySystem, MiscUtil.copy(foundrySystem || {}));

        return combinedFoundrySystem;
    }

    static getCombinedFoundryFlags(foundryFlags, _foundryFlags) {
        if (!foundryFlags && !_foundryFlags)
            return {};

        const combinedFoundryFlags = MiscUtil.copy(_foundryFlags || {});

        Object.entries(MiscUtil.copy(foundryFlags || {})).forEach(([flagNamespace,flagData])=>{
            if (!combinedFoundryFlags[flagNamespace])
                return combinedFoundryFlags[flagNamespace] = flagData;
            Object.assign(combinedFoundryFlags[flagNamespace], flagData);
        }
        );

        return combinedFoundryFlags;
    }

    static async pGetEntryDescription(entry, opts) {
        opts = opts || {};
        opts.prop = opts.prop || "entries";

        Renderer.get().setFirstSection(true).resetHeaderIndex();

        let description = "";
        if (entry[opts.prop]) {
            let cpyEntries = MiscUtil.copy(entry[opts.prop]);

            cpyEntries = UtilDataConverter.WALKER_GENERIC.walk(cpyEntries, {
                string: (str)=>{
                    return str.replace(/{@hitYourSpellAttack}/gi, ()=>`{@dice 1d20 + @${SharedConsts.MODULE_ID_FAKE}.userchar.spellAttackRanged|your spell attack modifier}`).replace(/{(@dice|@damage|@scaledice|@scaledamage|@hit) ([^}]+)}/gi, (...m)=>{
                        const [,tag,text] = m;
                        let[rollText,displayText,name,...others] = Renderer.splitTagByPipe(text);
                        const originalRollText = rollText;

                        rollText = this._pGetEntryDescription_getCleanDicePart(rollText, opts);
                        displayText = this._pGetEntryDescription_getCleanDisplayPart({
                            displayText,
                            originalText: originalRollText,
                            text: rollText
                        });

                        return `{${tag} ${[rollText, displayText || "", name || "", ...others].join("|")}}`;
                    }
                    ).replace(/{(@dc) ([^}]+)}/gi, (...m)=>{
                        const [,tag,text] = m;
                        let[dcText,displayText] = Renderer.splitTagByPipe(text);
                        const originalDcText = dcText;

                        dcText = this._pGetEntryDescription_getCleanDicePart(dcText, opts);
                        displayText = this._pGetEntryDescription_getCleanDisplayPart({
                            displayText,
                            originalText: originalDcText,
                            text: dcText
                        });

                        return `{${tag} ${[dcText, displayText || ""].join("|")}}`;
                    }
                    );
                }
                ,
            }, );

            description = await UtilDataConverter.pGetWithDescriptionPlugins(()=>Renderer.get().setFirstSection(true).render({
                type: "entries",
                entries: cpyEntries,
            }, opts.depth != null ? opts.depth : 2, ), );
        }

        return description;
    }

    static _pGetEntryDescription_getCleanDicePart(str, opts) {
        return str.replace(/\bPB\b/gi, `@${SharedConsts.MODULE_ID_FAKE}.userchar.pb`).replace(/\bsummonSpellLevel\b/gi, `${opts.summonSpellLevel ?? 0}`);
    }

    static _pGetEntryDescription_getCleanDisplayPart({displayText, originalText, text}) {
        if (!displayText && originalText !== text) {
            displayText = originalText.replace(/\bsummonSpellLevel\b/gi, `the spell's level`);
        }
        return displayText;
    }

    static mutActorUpdate(actor, actorUpdate, entry, opts) {
        opts = opts || {};

        this._mutActorUpdate_mutFromSideDataMod(actor, actorUpdate, opts);
        this._mutActorUpdate_mutFromSideTokenMod(actor, actorUpdate, opts);
    }

    static _mutActorUpdate_mutFromSideDataMod(actor, actorUpdate, opts) {
        return this._mutActorUpdate_mutFromSideMod(actor, actorUpdate, opts, "actorDataMod", "data");
    }

    static _mutActorUpdate_mutFromSideTokenMod(actor, actorUpdate, opts) {
        return this._mutActorUpdate_mutFromSideMod(actor, actorUpdate, opts, "actorTokenMod", "token");
    }

    static _mutActorUpdate_mutFromSideMod(actor, actorUpdate, opts, sideProp, actorProp) {
        if (!opts.sideData || !opts.sideData[sideProp])
            return;

        Object.entries(opts.sideData[sideProp]).forEach(([path,modMetas])=>this._mutActorUpdate_mutFromSideMod_handleProp(actor, actorUpdate, opts, sideProp, actorProp, path, modMetas));
    }

    static _mutActorUpdate_mutFromSideMod_handleProp(actor, actorUpdate, opts, sideProp, actorProp, path, modMetas) {
        const pathParts = path.split(".");

        if (path === "_") {
            modMetas.forEach(modMeta=>{
                switch (modMeta.mode) {
                case "conditionals":
                    {
                        for (const cond of modMeta.conditionals) {

                            window.PLUT_CONTEXT = {
                                actor
                            };

                            if (cond.condition && !eval(cond.condition))
                                continue;

                            Object.entries(cond.mod).forEach(([path,modMetas])=>this._mutActorUpdate_mutFromSideMod_handleProp(actor, actorUpdate, opts, sideProp, actorProp, path, modMetas));

                            break;
                        }

                        break;
                    }

                default:
                    throw new Error(`Unhandled mode "${modMeta.mode}"`);
                }
            }
            );
            return;
        }

        const fromActor = MiscUtil.get(actor, "system", actorProp, ...pathParts);
        const fromUpdate = MiscUtil.get(actorUpdate, actorProp, ...pathParts);
        const existing = fromUpdate || fromActor;

        modMetas.forEach(modMeta=>{
            switch (modMeta.mode) {
            case "appendStr":
                {
                    const existing = MiscUtil.get(actorUpdate, actorProp, ...pathParts);
                    const next = existing ? `${existing}${modMeta.joiner || ""}${modMeta.str}` : modMeta.str;
                    MiscUtil.set(actorUpdate, actorProp, ...pathParts, next);
                    break;
                }

            case "appendIfNotExistsArr":
                {
                    const existingArr = MiscUtil.copy(existing || []);
                    const out = [...existingArr];
                    out.push(...modMeta.items.filter(it=>!existingArr.some(x=>CollectionUtil.deepEquals(it, x))));
                    MiscUtil.set(actorUpdate, actorProp, ...pathParts, out);
                    break;
                }

            case "scalarAdd":
                {
                    MiscUtil.set(actorUpdate, actorProp, ...pathParts, modMeta.scalar + existing || 0);
                    break;
                }

            case "scalarAddUnit":
                {
                    const existingLower = `${existing || 0}`.toLowerCase();

                    const handle = (toFind)=>{
                        const ix = existingLower.indexOf(toFind.toLowerCase());
                        let numPart = existing.slice(0, ix);
                        const rest = existing.slice(ix);
                        const isSep = numPart.endsWith(" ");
                        numPart = numPart.trim();

                        if (!isNaN(numPart)) {
                            const out = `${modMeta.scalar + Number(numPart)}${isSep ? " " : ""}${rest}`;
                            MiscUtil.set(actorUpdate, actorProp, ...pathParts, out);
                        }
                    }
                    ;

                    if (!existing)
                        MiscUtil.set(actorUpdate, actorProp, ...pathParts, `${modMeta.scalar} ${modMeta.unitShort || modMeta.unit}`);
                    else if (modMeta.unit && existingLower.includes(modMeta.unit.toLowerCase())) {
                        handle(modMeta.unit);
                    } else if (modMeta.unitShort && existingLower.includes(modMeta.unitShort.toLowerCase())) {
                        handle(modMeta.unitShort);
                    }
                    break;
                }

            case "setMax":
                {
                    const existingLower = `${existing || 0}`.toLowerCase();
                    let asNum = Number(existingLower);
                    if (isNaN(asNum))
                        asNum = 0;
                    const maxValue = Math.max(asNum, modMeta.value);
                    MiscUtil.set(actorUpdate, actorProp, ...pathParts, maxValue);
                    break;
                }

            case "set":
                {
                    MiscUtil.set(actorUpdate, actorProp, ...pathParts, MiscUtil.copy(modMeta.value));
                    break;
                }

            default:
                throw new Error(`Unhandled mode "${modMeta.mode}"`);
            }
        }
        );
    }

    static _getProfBonusExpressionParts(str) {
        const parts = str.split(/([-+]\s*[^-+]+)/g).map(it=>it.trim().replace(/\s*/g, "")).filter(Boolean);

        const [partsNumerical,partsNonNumerical] = parts.segregate(it=>!isNaN(it));

        const totalNumerical = partsNumerical.map(it=>Number(it)).sum();

        return {
            partsNumerical,
            partsNonNumerical,
            totalNumerical
        };
    }

    static _PassiveEntryParseState = class {
        constructor({entry, img, name}, opts) {
            this._entry = entry;
            this._opts = opts;

            this.name = name;
            this.img = img;

            let {id,
            description,
            activationType, activationCost, activationCondition,
            saveAbility, saveDc, saveScaling,
            damageParts,
            attackBonus,
            requirements,
            actionType,
            durationValue, durationUnits,
            consumeType, consumeTarget, consumeAmount, consumeScale,
            formula,
            targetValue, targetUnits, targetType, targetPrompt,
            rangeShort, rangeLong, rangeUnits,
            ability,
            usesValue, usesMax, usesPer,
            rechargeValue,
            isProficient,
            typeType, typeSubtype,
            foundrySystem, _foundryData, foundryFlags, _foundryFlags, } = opts;

            this.combinedFoundrySystem = DataConverter.getCombinedFoundrySystem(foundrySystem, _foundryData);
            this.combinedFoundryFlags = DataConverter.getCombinedFoundryFlags(foundryFlags, _foundryFlags);

            if (entry._foundryId && id && entry._foundryId !== id)
                throw new Error(`Item given two different IDs (${this.id} and ${id})! This is a bug!`);

            this.id = entry._foundryId || id;

            this.description = description;

            this.activationType = activationType;
            this.activationCost = activationCost;
            this.activationCondition = activationCondition;

            this.saveAbility = saveAbility;
            this.saveDc = saveDc;
            this.saveScaling = saveScaling;

            this.damageParts = damageParts;

            this.attackBonus = attackBonus;

            this.requirements = requirements;

            this.actionType = actionType;

            this.durationValue = durationValue;
            this.durationUnits = durationUnits;

            this.consumeType = consumeType;
            this.consumeTarget = consumeTarget;
            this.consumeAmount = consumeAmount;
            this.consumeScale = consumeScale;

            this.formula = formula;

            this.targetValue = targetValue;
            this.targetUnits = targetUnits;
            this.targetType = targetType;
            this.targetPrompt = targetPrompt;

            this.rangeShort = rangeShort;
            this.rangeLong = rangeLong;
            this.rangeUnits = rangeUnits;

            this.ability = ability;

            this.usesValue = usesValue;
            this.usesMax = usesMax;
            this.usesPer = usesPer;

            this.rechargeValue = rechargeValue;

            this.isProficient = isProficient;

            this.typeType = typeType;
            this.typeSubtype = typeSubtype;

            this.effectsParsed = [];

            this.flagsParsed = {};
        }

        async pInit({isSkipDescription=false, isSkipImg=false}={}) {
            if (!isSkipDescription && !this.description && !this._opts.isSkipDescription) {
                this.description = await DataConverter.pGetEntryDescription(this._entry, {
                    depth: this._opts.renderDepth,
                    summonSpellLevel: this._opts.summonSpellLevel
                });
            }

            if (!isSkipImg && this._opts.img) {
                this.img = await Vetools.pOptionallySaveImageToServerAndGetUrl(this._opts.img);
            }
        }
    }
    ;

    static async _pGetItemActorPassive(entry, opts) {
        opts = opts || {};

        Renderer.get().setFirstSection(true).resetHeaderIndex();

        opts.modeOptions = opts.modeOptions || {};

        if (opts.mode === "object")
            opts.mode = "creature";

        const state = new this._PassiveEntryParseState({
            entry,
            name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(entry, {
                displayName: opts.displayName,
                isActorItem: opts.isActorItem ?? true
            })),
        },opts,);
        await state.pInit();

        const strEntries = entry.entries ? JSON.stringify(entry.entries) : null;

        this._pGetItemActorPassive_mutRecharge({
            entry,
            opts,
            state
        });
        this._pGetItemActorPassive_mutActivation({
            entry,
            opts,
            state
        });
        this._pGetItemActorPassive_mutUses({
            entry,
            opts,
            strEntries,
            state
        });
        this._pGetItemActorPassive_mutSave({
            entry,
            opts,
            strEntries,
            state
        });
        this._pGetItemActorPassive_mutDuration({
            entry,
            opts,
            state
        });
        this._pGetItemActorPassive_mutDamageAndFormula({
            entry,
            opts,
            strEntries,
            state
        });
        this._pGetItemActorPassive_mutTarget({
            entry,
            opts,
            strEntries,
            state
        });
        this._pGetItemActorPassive_mutActionType({
            entry,
            opts,
            state
        });
        this._pGetItemActorPassive_mutEffects({
            entry,
            opts,
            state
        });

        try {
            state.activationCondition = Renderer.stripTags(state.activationCondition);
        } catch (e) {
            console.error(...LGT, e);
        }

        if ((state.consumeType || state.usesPer || opts.additionalData?.["consume.type"] || opts.additionalData?.consume?.type || opts.additionalData?.["uses.per"] || opts.additionalData?.uses?.per) && !state.activationType)
            state.activationType = "special";

        state.name = state.name.trim().replace(/\s+/g, " ");
        if (!state.name)
            state.name = "(Unnamed)";
        const fauxEntrySourcePage = {
            ...entry
        };
        if (opts.source != null)
            fauxEntrySourcePage.source = opts.source;
        if (opts.page != null)
            fauxEntrySourcePage.page = opts.page;

        this._pGetItemActorPassive_mutFlags({
            entry,
            opts,
            state
        });

        const {name: translatedName, description: translatedDescription, flags: translatedFlags} = this._getTranslationMeta({
            translationData: opts.translationData,
            name: state.name,
            description: state.description,
        });

        return {
            ...this._getIdObj({
                id: state.id
            }),
            name: translatedName,
            type: opts.fvttType || "feat",
            system: {
                source: opts.fvttSource !== undefined ? opts.fvttSource : UtilDocumentSource.getSourceObjectFromEntity(fauxEntrySourcePage),
                description: {
                    value: translatedDescription,
                    chat: "",
                    unidentified: ""
                },

                damage: {
                    parts: state.damageParts ?? [],
                    versatile: "",
                },
                duration: {
                    value: state.durationValue,
                    units: state.durationUnits,
                },
                range: {
                    value: state.rangeShort,
                    long: state.rangeLong,
                    units: state.rangeUnits || ((state.rangeShort != null || state.rangeLong != null) ? "ft" : ""),
                },
                proficient: state.isProficient,
                requirements: state.requirements,

                save: {
                    ability: state.saveAbility,
                    dc: state.saveDc,
                    scaling: state.saveScaling || "flat",
                },

                activation: {
                    type: state.activationType,
                    cost: state.activationCost,
                    condition: state.activationCondition,
                },

                target: {
                    value: state.targetValue,
                    units: state.targetUnits,
                    type: state.targetType,
                    prompt: state.targetPrompt,
                },

                uses: {
                    value: state.usesValue,
                    max: state.usesMax,
                    per: state.usesPer,
                },
                ability: state.ability,
                actionType: state.actionType,
                attackBonus: state.attackBonus,
                chatFlavor: "",
                critical: {
                    threshold: null,
                    damage: ""
                },

                formula: state.formula,

                recharge: {
                    value: state.rechargeValue,
                    charged: state.rechargeValue != null,
                },

                consume: {
                    type: state.consumeType,
                    target: state.consumeTarget,
                    amount: state.consumeAmount,
                    scale: state.consumeScale,
                },

                type: {
                    value: state.typeType,
                    subtype: state.typeSubtype,
                },

                ...(state.combinedFoundrySystem || {}),
                ...(opts.additionalData || {}),
            },
            ownership: {
                default: 0
            },
            img: state.img,
            flags: {
                ...translatedFlags,
                ...state.flagsParsed,
                ...(UtilCompat.getFeatureFlags({
                    isReaction: ["reaction", "reactiondamage", "reactionmanual"].includes(state.activationType)
                })),
                ...(state.combinedFoundryFlags || {}),
                ...opts.additionalFlags,
            },
            effects: DataConverter.getEffectsMutDedupeId([...(opts.effects || []), ...state.effectsParsed, ]),
        };
    }

    static _pGetItemActorPassive_mutRecharge({entry, opts, state}) {
        if (!state.name)
            return;

        const rechargeMeta = UtilEntityGeneric.getRechargeMeta(state.name);
        if (rechargeMeta == null)
            return;

        state.name = rechargeMeta.name;
        if (state.rechargeValue === undefined && rechargeMeta.rechargeValue != null)
            state.rechargeValue = rechargeMeta.rechargeValue;
    }

    static _pGetItemActorPassive_mutActivation({entry, opts, state}) {
        this._pGetItemActorPassive_mutActivation_player({
            entry,
            opts,
            state
        });
        this._pGetItemActorPassive_mutActivation_creature({
            entry,
            opts,
            state
        });
    }

    static _pGetItemActorPassive_mutActivation_player({entry, opts, state}) {
        if (opts.mode !== "player" || !entry.entries?.length)
            return;

        if (state.activationType || state.activationCost) {
            this._pGetItemActorPassive_mutActivation_playerCompat({
                entry,
                opts,
                state
            });
            return;
        }

        let isAction = false;
        let isBonusAction = false;
        let isReaction = false;

        UtilDataConverter.WALKER_READONLY_GENERIC.walk(entry.entries, {
            string: (str)=>{
                if (state.activationType)
                    return str;

                const sentences = Util.getSentences(str);
                for (const sentence of sentences) {
                    if (/\b(?:as an action|can take an action|can use your action)\b/i.test(sentence)) {
                        isAction = true;
                        break;
                    }

                    if (/\bbonus action\b/i.test(sentence)) {
                        isBonusAction = true;
                        break;
                    }

                    const mReact = /\b(?:your reaction|this special reaction|as a reaction)\b/i.exec(sentence);
                    if (mReact) {
                        isReaction = true;

                        let preceding = sentence.slice(0, mReact.index).trim().replace(/,$/, "");
                        const mCondition = /(^|\W)(?:if|when)(?:|\W)/i.exec(preceding);
                        if (mCondition) {
                            preceding = preceding.slice(mCondition.index + mCondition[1].length).trim();
                            state.activationCondition = state.activationCondition || preceding;
                        }

                        break;
                    }
                }
            }
            ,
        }, );

        if (isAction)
            state.activationType = "action";
        else if (isBonusAction)
            state.activationType = "bonus";
        else if (isReaction)
            state.activationType = "reaction";

        if (state.activationType)
            state.activationCost = 1;

        if (!state.activationType) {
            UtilDataConverter.WALKER_READONLY_GENERIC.walk(entry.entries, {
                string: (str)=>{
                    if (state.activationType)
                        return str;

                    const sentences = Util.getSentences(str);

                    for (const sentence of sentences) {
                        if (/you can't use this feature again|once you use this feature/i.test(sentence))
                            state.activationType = "special";
                    }
                }
                ,
            }, );
        }

        this._pGetItemActorPassive_mutActivation_playerCompat({
            entry,
            opts,
            state
        });
    }

    static _pGetItemActorPassive_mutActivation_creature({entry, opts, state}) {
        if (opts.mode !== "creature" || !entry.entries?.length || !entry.name) {
            this._pGetItemActorPassive_mutActivation_creature_enableOtherFields({
                entry,
                opts,
                state
            });
            return;
        }

        if (state.activationType || state.activationCost) {
            this._pGetItemActorPassive_mutActivation_creatureCompat({
                entry,
                opts,
                state
            });
            this._pGetItemActorPassive_mutActivation_creature_enableOtherFields({
                entry,
                opts,
                state
            });
            return;
        }

        MiscUtil.getWalker({
            isNoModification: true,
            keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST,
            isBreakOnReturn: true,
        }).walk(entry.entries, {
            string: str=>{
                if (/\bbonus action\b/i.test(str)) {
                    state.activationType = "bonus";
                    state.activationCost = 1;
                    return true;
                }
            }
            ,
        }, );

        if (/^legendary resistance/i.test(entry.name)) {
            state.activationType = "special";
        }

        this._pGetItemActorPassive_mutActivation_creature_enableOtherFields({
            entry,
            opts,
            state
        });

        this._pGetItemActorPassive_mutActivation_creatureCompat({
            entry,
            opts,
            state
        });
    }

    static _pGetItemActorPassive_mutActivation_creature_enableOtherFields({entry, opts, state}) {
        if (state.rechargeValue !== undefined) {
            if (state.activationType == null)
                state.activationType = "special";
        }
    }

    static _pGetItemActorPassive_mutActivation_playerCompat({entry, opts, state}) {
        if (!UtilCompat.isMidiQolActive() || state.activationType !== "reaction")
            return null;

    }

    static _pGetItemActorPassive_mutActivation_creatureCompat({entry, opts, state}) {
        if (!UtilCompat.isMidiQolActive() || state.activationType !== "reaction")
            return;

        state.activationType = "reactionmanual";

        let firstEntry = entry.entries[0];
        if (typeof firstEntry !== "string")
            return;

        firstEntry.replace(/\bcauses the attack to miss\b/i, ()=>{
            state.activationType = "reaction";
            return "";
        }
        )
        .replace(/\badds? (?<ac>\d+) to (its|their|his|her) AC\b/i, (...m)=>{
            const argsDuration = UtilCompat.isDaeActive() ? {
                flags: {
                    [UtilCompat.MODULE_DAE]: {
                        specialDuration: ["1Reaction"]
                    }
                }
            } : {
                durationTurns: 1
            };

            state.effectsParsed.push(UtilActiveEffects.getGenericEffect({
                ...argsDuration,
                key: `system.attributes.ac.bonus`,
                value: UiUtil.intToBonus(Number(m.last().ac)),
                mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                name: `${entry.name}`,
                icon: state.img,
                disabled: false,
                transfer: false,
                priority: UtilActiveEffects.PRIORITY_BONUS,
            }));

            state.targetType = state.targetType || "self";

            return "";
        }
        )
        .replace(/\battack that would (?:hit|miss) (?:it|them|him|her|or miss)\b/i, ()=>{
            state.activationType = "reaction";
            return "";
        }
        ).replace(/\bin response to being (?:hit|missed)\b/i, ()=>{
            state.activationType = "reaction";
            return "";
        }
        )
        .replace(/\bafter taking damage from\b/i, ()=>{
            state.activationType = "reactiondamage";
            return "";
        }
        ).replace(/\bIf [^.!?:]+ takes damage(?:,| while it)\b/i, ()=>{
            state.activationType = "reactiondamage";
            return "";
        }
        ).replace(/\bIn response to taking damage\b/i, ()=>{
            state.activationType = "reactiondamage";
            return "";
        }
        );
    }

    static _pGetItemActorPassive_mutSave({entry, opts, strEntries, state}) {
        this._pGetItemActorPassive_mutSave_player({
            entry,
            opts,
            strEntries,
            state
        });
        this._pGetItemActorPassive_mutSave_creature({
            entry,
            opts,
            strEntries,
            state
        });
    }

    static _pGetItemActorPassive_mutSave_player({entry, opts, strEntries, state}) {
        if (opts.mode !== "player" || !entry.entries?.length)
            return;

        UtilDataConverter.WALKER_READONLY_GENERIC.walk(entry.entries, {
            object: (obj)=>{
                if (obj.type !== "abilityDc")
                    return obj;

                if (state.actionType && state.saveScaling)
                    return obj;

                state.actionType = state.actionType || "save";
                state.saveScaling = obj.attributes[0];
                return obj;
            }
            ,
            string: (str)=>{
                if (state.actionType && state.saveAbility && state.saveScaling)
                    return str;

                str.replace(/8\s*\+\s*your proficiency bonus\s*\+\s*your (.*?) modifier/i, (...m)=>{
                    const customAbilities = [];
                    m[1].replace(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/i, (...m2)=>{
                        customAbilities.push(m2[1].toLowerCase().slice(0, 3));
                    }
                    );
                    if (!customAbilities.length)
                        return;

                    state.actionType = state.actionType || "save";
                    state.saveScaling = customAbilities[0];
                }
                );

                str.replace(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw against your (.*? )spell save DC/i, (...m)=>{
                    state.actionType = state.actionType || "save";
                    state.saveAbility = state.saveAbility || m[1].toLowerCase().slice(0, 3);
                    state.saveScaling = state.saveScaling || "spell";
                }
                );

                str.replace(/(?:make a|succeed on a) (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/gi, (...m)=>{
                    state.actionType = state.actionType || "save";
                    state.saveAbility = state.saveAbility || m[1].toLowerCase().slice(0, 3);
                    state.saveScaling = state.saveScaling || "spell";
                }
                );

                return str;
            }
            ,
        }, );
    }

    static _pGetItemActorPassive_mutSave_creature({entry, opts, strEntries, state}) {
        if (opts.mode !== "creature" || !entry.entries?.length)
            return;

        const m = /{@dc (?<save>[^|}]+)(?:\|[^}]+)?}\s+(?<abil>Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/i.exec(strEntries);
        if (!m)
            return;

        const {partsNonNumerical, totalNumerical} = this._getProfBonusExpressionParts(m.groups.save);

        state.actionType = state.actionType === undefined ? "save" : state.actionType;
        state.saveAbility = state.saveAbility === undefined ? m.groups.abil.toLowerCase().slice(0, 3) : state.saveAbility;
        state.saveDc = state.saveDc === undefined ? totalNumerical : state.saveDc;

        if (partsNonNumerical.length || opts.pb == null || ((opts.entity == null || Parser.ABIL_ABVS.some(ab=>opts.entity[ab] == null || typeof opts.entity[ab] !== "number")) && (opts.entity != null || Parser.ABIL_ABVS.some(ab=>{
            const abNamespaced = UtilEntityCreatureFeature.getNamespacedProp(ab);
            return entry[abNamespaced] == null || typeof entry[abNamespaced] !== "number";
        }
        )))) {
            state.saveScaling = state.saveScaling === undefined ? "flat" : state.saveScaling;
            return;
        }

        if (state.saveScaling)
            return;

        const fromAbil = state.saveDc - opts.pb - 8;
        const abilToBonus = Parser.ABIL_ABVS.map(ab=>({
            ability: ab,
            bonus: Parser.getAbilityModNumber(opts.entity != null ? Renderer.monster.getSafeAbilityScore(opts.entity, ab, {
                isDefaultTen: true
            }) : Renderer.monster.getSafeAbilityScore(entry, UtilEntityCreatureFeature.getNamespacedProp(ab), {
                isDefaultTen: true
            }), ),
        }));
        const matchingAbils = abilToBonus.filter(it=>it.bonus === fromAbil);

        if (matchingAbils.length === 1)
            state.saveScaling = state.saveScaling || matchingAbils[0].ability;
        else
            state.saveScaling = "flat";
    }

    static _pGetItemActorPassive_mutUses({entry, opts, strEntries, state}) {
        this._pGetItemActorPassive_mutUses_creature({
            entry,
            opts,
            strEntries,
            state
        });
        this._pGetItemActorPassive_mutUses_player({
            entry,
            opts,
            strEntries,
            state
        });
    }

    static _pGetItemActorPassive_mutUses_creature({entry, opts, strEntries, state}) {
        if (opts.mode !== "creature" || !entry.name)
            return;

        const isLegendary = /legendary resistance/gi.test(state.name);

        let isFound = false;

        state.name = state.name.replace(/\(Recharges after a (?<restPart>[^)]+)\)/i, (...m)=>{
            isFound = true;

            if (isLegendary)
                return "";

            if (state.usesValue === undefined)
                state.usesValue = 1;
            if (state.usesMax === undefined)
                state.usesMax = `${state.usesValue}`;

            const restPartClean = m.last().restPart.toLowerCase();
            if (/\bshort\b/.test(restPartClean)) {
                if (state.usesPer === undefined)
                    state.usesPer = "sr";
            } else if (/\blong\b/.test(restPartClean)) {
                if (state.usesPer === undefined)
                    state.usesPer = "lr";
            }

            return "";
        }
        );

        if (state.usesPer === undefined) {
            state.name = state.name.replace(/\(\s*(\d+)\s*\/\s*(Day|Short Rest|Long Rest)\s*\)/i, (...m)=>{
                isFound = true;

                if (isLegendary)
                    return "";

                if (state.usesValue === undefined)
                    state.usesValue = Number(m[1]);
                if (state.usesMax === undefined)
                    state.usesMax = `${state.usesValue}`;

                if (state.usesPer === undefined) {
                    const cleanTime = m[2].trim().toLowerCase();
                    switch (cleanTime) {
                    case "day":
                        state.usesPer = "day";
                        break;
                    case "short rest":
                        state.usesPer = "sr";
                        break;
                    case "long rest":
                        state.usesPer = "lr";
                        break;
                    }
                }

                return "";
            }
            );
        }

        if (state.usesPer === undefined) {
            state.name = state.name.replace(/\(\s*(\d+)\s+Charges\s*\)/i, (...m)=>{
                isFound = true;

                if (isLegendary)
                    return "";

                if (state.usesValue === undefined)
                    state.usesValue = Number(m[1]);
                if (state.usesMax === undefined)
                    state.usesMax = `${state.usesValue}`;
                if (state.usesPer === undefined)
                    state.usesPer = "charges";

                return "";
            }
            );
        }

        if (!isFound)
            return;

        state.name = state.name.trim().replace(/ +/g, " ");

        if (state.activationType === undefined)
            state.activationType = state.activationType || "none";

        if (entry.entries && typeof entry.entries[0] === "string" && /^(?:If |When )/i.test(entry.entries[0].trim())) {
            if (state.activationCondition === undefined)
                state.activationCondition = entry.entries[0].trim();
        }
    }

    static _pGetItemActorPassive_mutUses_player({entry, opts, strEntries, state}) {
        if (opts.mode !== "player" || !entry.entries)
            return;

        if (state.consumeType === "charges")
            return;

        const isShortRest = /\b(?:finish|complete) a short rest\b/.test(strEntries) || /\b(?:finish|complete) a short or long rest\b/.test(strEntries) || /\b(?:finish|complete) a short rest or a long rest\b/.test(strEntries) || /\b(?:finish|complete) a short or long rest\b/.test(strEntries);
        const isLongRest = !isShortRest && /\b(?:finish|complete) a long rest\b/.test(strEntries);

        if (state.usesPer === undefined) {
            if (isShortRest)
                state.usesPer = "sr";
            else if (isLongRest)
                state.usesPer = "lr";
        }

        const mAbilModifier = new RegExp(`a number of times equal to(?: (${Consts.TERMS_COUNT.map(it=>it.tokens.join("")).join("|")}))? your (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) modifier(?: \\(minimum of (${Consts.TERMS_COUNT.map(it=>it.tokens.join("")).join("|")})\\))?`,"i").exec(strEntries);
        if (mAbilModifier && opts.actor) {
            const abv = mAbilModifier[2].slice(0, 3).toLowerCase();
            const abilScore = MiscUtil.get(opts.actor, "system", "abilities", abv, "value");
            if (abilScore != null) {
                let mod = Parser.getAbilityModNumber(abilScore);
                let modFormula = `floor((@abilities.${abv}.value - 10) / 2)`;

                if (mAbilModifier[1]) {
                    const multiplier = (Consts.TERMS_COUNT.find(it=>it.tokens.join(" ") === mAbilModifier[1].trim().toLowerCase()) || {}).count || 1;
                    mod = mod * multiplier;
                    modFormula = `${modFormula} * ${multiplier}`;
                }

                if (mAbilModifier[3]) {
                    const min = (Consts.TERMS_COUNT.find(it=>it.tokens.join("") === mAbilModifier[3].trim().toLowerCase()) || {}).count || 1;
                    mod = Math.max(min, mod);
                    modFormula = `max(${min}, ${modFormula})`;
                }

                if (state.usesValue === undefined)
                    state.usesValue = mod;
                if (state.usesMax === undefined)
                    state.usesMax = modFormula;
            }
        }

        strEntries.replace(/(you can ([^.!?]+)) a number of times equal to(?<mult> twice)? your proficiency bonus/i, (...m)=>{
            const mult = m.last().mult ? (Consts.TERMS_COUNT.find(meta=>CollectionUtil.deepEquals(meta.tokens, m.last().mult.trim().toLowerCase().split(/( )/g)))?.count || 1) : 1;
            if (state.usesValue === undefined)
                state.usesValue = opts.actor ? (UtilActors.getProficiencyBonusNumber({
                    actor: opts.actor
                }) * mult) : null;
            if (state.usesMax === undefined)
                state.usesMax = `@prof${mult > 1 ? ` * ${mult}` : ""}`;
        }
        );

        strEntries.replace(/you can use this (?:feature|ability) (?<mult>once|twice|[a-zA-Z]+ times)/i, (...m)=>{
            const mult = (Consts.TERMS_COUNT.find(meta=>CollectionUtil.deepEquals(meta.tokens, m.last().mult.trim().toLowerCase().split(/( )/g)))?.count || 1);
            if (state.usesValue === undefined)
                state.usesValue = mult;
            if (state.usesMax === undefined)
                state.usesMax = mult;
        }
        );

        if (state.usesPer && !state.usesValue && (!state.usesMax || state.usesMax === "0")) {
            if (state.usesValue === undefined)
                state.usesValue = 1;
            if (state.usesMax === undefined)
                state.usesMax = `${state.usesValue}`;
        }
    }

    static _pGetItemActorPassive_mutDuration({entry, opts, state}) {
        this._pGetItemActorPassive_mutDuration_creature({
            entry,
            opts,
            state
        });
        this._pGetItemActorPassive_mutDuration_player({
            entry,
            opts,
            state
        });
    }

    static _pGetItemActorPassive_mutDuration_creature({entry, opts, state}) {
        if (opts.mode !== "creature" || !entry.entries)
            return;

        return "stubbed";
    }

    static _pGetItemActorPassive_mutDuration_player({entry, opts, state}) {
        if (opts.mode !== "player" || !entry.entries)
            return;

        UtilDataConverter.WALKER_READONLY_GENERIC.walk(entry.entries, {
            string: (str)=>{
                if (state.durationValue || state.durationUnits)
                    return;

                str.replace(/(?:^|\W)lasts for (\d+) (minute|hour|day|month|year|turn|round)s?(?:\W|$)/gi, (...m)=>{
                    state.durationValue = Number(m[1]);
                    state.durationUnits = m[2].toLowerCase();
                }
                );

                str.replace(/(?:^|\W)for the next (\d+) (minute|hour|day|month|year|turn|round)s?(?:\W|$)/gi, (...m)=>{
                    state.durationValue = Number(m[1]);
                    state.durationUnits = m[2].toLowerCase();
                }
                );

                str.replace(/(?:^|\W)turned for (\d+) (minute|hour|day|month|year|turn|round)s?(?:\W|$)/gi, (...m)=>{
                    state.durationValue = Number(m[1]);
                    state.durationUnits = m[2].toLowerCase();
                }
                );

                str.replace(/(?:^|\W)this effect lasts for (\d+) (minute|hour|day|month|year|turn|round)s?(?:\W|$)/gi, (...m)=>{
                    state.durationValue = Number(m[1]);
                    state.durationUnits = m[2].toLowerCase();
                }
                );

                str.replace(/(?:^|\W)until the end of your next turn(?:\W|$)/gi, ()=>{
                    state.durationValue = 1;
                    state.durationUnits = "turn";
                }
                );

                Renderer.stripTags(str).replace(/(?:^|\W)is \w+ by you for (\d+) (minute|hour|day|month|year|turn|round)s(?:\W|$)/gi, (...m)=>{
                    state.durationValue = Number(m[1]);
                    state.durationUnits = m[2].toLowerCase();
                }
                );
            }
            ,
        }, );
    }

    static _pGetItemActorPassive_getTargetMeta(strEntries) {
        let targetValue, targetUnits, targetType;
        let found = false;

        let tmpEntries = strEntries.replace(/exhales [^.]*a (?<size>\d+)-foot[- ](?<shape>cone|line)/, (...m)=>{
            targetValue = Number(m.last().size);
            targetUnits = "ft";
            targetType = m.last().shape;
            found = true;

            return "";
        }
        );

        if (found)
            return this._pGetItemActorPassive_getTargetMetricAdjusted({
                targetValue,
                targetUnits,
                targetType
            });

        tmpEntries = tmpEntries.replace(/(?<size>\d+)-foot-radius,? \d+-foot-tall cylinder/, (...m)=>{
            targetValue = Number(m.last().size);
            targetUnits = "ft";
            targetType = "cylinder";

            found = true;
            return "";
        }
        );

        if (found)
            return this._pGetItemActorPassive_getTargetMetricAdjusted({
                targetValue,
                targetUnits,
                targetType
            });

        tmpEntries = tmpEntries.replace(/(?<size>\d+)-foot[- ]radius(?<ptSphere> sphere)?/, (...m)=>{
            targetValue = Number(m.last().size);
            targetUnits = "ft";
            targetType = (m.last().ptSphere ? "sphere" : "radius");

            found = true;
            return "";
        }
        );

        if (found)
            return this._pGetItemActorPassive_getTargetMetricAdjusted({
                targetValue,
                targetUnits,
                targetType
            });

        tmpEntries = tmpEntries.replace(/(?<size>\d+)-foot[- ]cube/, (...m)=>{
            targetValue = Number(m.last().size);
            targetUnits = "ft";
            targetType = "cube";

            found = true;
            return "";
        }
        );

        if (found)
            return this._pGetItemActorPassive_getTargetMetricAdjusted({
                targetValue,
                targetUnits,
                targetType
            });

        tmpEntries = tmpEntries.replace(/(?<size>\d+)-foot[- ]square/, (...m)=>{
            targetValue = Number(m.last().size);
            targetUnits = "ft";
            targetType = "square";

            found = true;
            return "";
        }
        );

        if (found)
            return this._pGetItemActorPassive_getTargetMetricAdjusted({
                targetValue,
                targetUnits,
                targetType
            });

        tmpEntries = tmpEntries.replace(/(?<size>\d+)-foot line/, (...m)=>{
            targetValue = Number(m.last().size);
            targetUnits = "ft";
            targetType = "line";

            found = true;
            return "";
        }
        );

        tmpEntries = tmpEntries.replace(/(?<size>\d+)-foot cone/, (...m)=>{
            targetValue = Number(m.last().size);
            targetUnits = "ft";
            targetType = "cone";

            found = true;
            return "";
        }
        );

        if (found)
            return this._pGetItemActorPassive_getTargetMetricAdjusted({
                targetValue,
                targetUnits,
                targetType
            });

        return {};
    }

    static _pGetItemActorPassive_getTargetMetricAdjusted({targetValue, targetUnits, targetType}) {
        targetValue = Config.getMetricNumberDistance({
            configGroup: this._configGroup,
            originalValue: targetValue,
            originalUnit: "feet"
        });
        if (targetUnits)
            targetUnits = Config.getMetricUnitDistance({
                configGroup: this._configGroup,
                originalUnit: targetUnits
            });

        return {
            targetValue,
            targetUnits,
            targetType
        };
    }

    static _pGetItemActorPassive_mutDamageAndFormula({entry, opts, strEntries, state}) {
        this._pGetItemActorPassive_mutDamageAndFormula_playerOrVehicle({
            entry,
            opts,
            strEntries,
            state
        });
        this._pGetItemActorPassive_mutDamageAndFormula_creature({
            entry,
            opts,
            strEntries,
            state
        });
    }

    static _pGetItemActorPassive_mutDamageAndFormula_playerOrVehicle({entry, opts, state, strEntries}) {
        if (opts.mode !== "player" && opts.mode !== "vehicle")
            return;
        if (!entry.entries)
            return;

        let strEntriesNoDamageDice = strEntries;
        if (!state.damageParts?.length) {
            const {str, damageTupleMetas} = this._getDamageTupleMetas(strEntries, {
                summonSpellLevel: opts.summonSpellLevel
            });
            strEntriesNoDamageDice = str;

            const {damageParts: damageParts_, formula: formula_} = this._getDamagePartsAndOtherFormula(damageTupleMetas);

            state.damageParts = damageParts_;
            state.formula = state.formula ?? formula_;
        }

        if (state.formula == null) {
            strEntriesNoDamageDice.replace(/{(?:@dice|@scaledice) ([^|}]+)(?:\|[^}]+)?}/i, (...m)=>{
                const [dice] = m[1].split("|");
                state.formula = dice;
            }
            );
        }
    }

    static _pGetItemActorPassive_mutDamageAndFormula_creature({entry, opts, strEntries, state}) {
        if (opts.mode !== "creature")
            return;
        if (!entry.entries?.length)
            return;

        if (!state.damageParts?.length && state.formula == null) {
            const str = entry.entries[0];
            if (typeof str !== "string")
                return;

            const {damageTupleMetas} = this._getDamageTupleMetas(str);
            const {damageParts, formula} = this._getDamagePartsAndOtherFormula(damageTupleMetas);

            state.damageParts = damageParts;
            state.formula = formula;
        }
    }

    static _pGetItemActorPassive_mutTarget({entry, opts, strEntries, state}) {
        this._pGetItemActorPassive_mutTarget_player({
            entry,
            opts,
            strEntries,
            state
        });
        this._pGetItemActorPassive_mutTarget_creature({
            entry,
            opts,
            strEntries,
            state
        });
    }

    static _pGetItemActorPassive_mutTarget_player({entry, opts, strEntries, state}) {
        if (opts.mode !== "player")
            return;

        if (state.targetPrompt === undefined)
            state.targetPrompt = Config.getSafe(this._configGroup, "isTargetTemplatePrompt");
    }

    static _pGetItemActorPassive_mutTarget_creature({entry, opts, strEntries, state}) {
        if (opts.mode !== "creature")
            return;
        if (!strEntries)
            return;

        if (!state.targetValue && !state.targetUnits && !state.targetType) {
            const targetMeta = this._pGetItemActorPassive_getTargetMeta(strEntries);
            state.targetValue = targetMeta.targetValue || state.targetValue;
            state.targetUnits = targetMeta.targetUnits || state.targetUnits;
            state.targetType = targetMeta.targetType || state.targetType;
        }

        if (state.targetPrompt === undefined)
            state.targetPrompt = Config.getSafe(this._configGroup, "isTargetTemplatePrompt");
    }

    static _pGetItemActorPassive_mutActionType({entry, opts, state}) {
        this._pGetItemActorPassive_mutActionType_player({
            entry,
            opts,
            state
        });
        this._pGetItemActorPassive_mutActionType_creature({
            entry,
            opts,
            state
        });
    }

    static _pGetItemActorPassive_mutActionType_player({entry, opts, state}) {
        if (state.actionType || opts.mode !== "player" || !entry.entries?.length)
            return;

        const walker = MiscUtil.getWalker({
            keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST,
            isNoModification: true,
            isBreakOnReturn: true
        });
        walker.walk(entry.entries, {
            string: str=>{
                const mMeleeRangedWeaponAttack = /you\b[^.!?]*\bmake a (?<type>melee|ranged) weapon attack/i.exec(str);
                if (mMeleeRangedWeaponAttack) {
                    state.actionType = mMeleeRangedWeaponAttack.groups.type.toLowerCase() === "melee" ? "mwak" : "rwak";
                    return true;
                }

                const mMeleeRangedSpellAttack = /you\b[^.!?]*\bmake a (?<type>melee|ranged) spell attack/i.exec(str);
                if (mMeleeRangedSpellAttack) {
                    state.actionType = mMeleeRangedSpellAttack.groups.type.toLowerCase() === "melee" ? "msak" : "rsak";
                    return true;
                }

                const mHeal = /creature\b[^.!?]*\bregains\b[^.!?]*\bhit points?/i.exec(str);
                if (mHeal) {
                    state.actionType = "heal";
                    return true;
                }
            }
            ,
        }, );

        state.actionType = state.actionType || "other";
    }

    static _pGetItemActorPassive_mutActionType_creature({entry, opts, state}) {
        if (state.actionType || opts.mode !== "creature" || !entry.entries?.length)
            return;

        state.actionType = "other";
    }

    static _pGetItemActorPassive_mutEffects({entry, opts, state}) {
        this._pGetItemActorPassive_mutEffects_player({
            entry,
            opts,
            state
        });
        this._pGetItemActorPassive_mutEffects_creature({
            entry,
            opts,
            state
        });
    }

    static _pGetItemActorPassive_mutEffects_player({entry, opts, state}) {
        if (opts.mode !== "player" || !entry.entries?.length)
            return;

        void 0;
    }

    static _pGetItemActorPassive_mutEffects_creature({entry, opts, state}) {
        if (opts.mode !== "creature" || !entry.entries?.length)
            return;

        if (!UtilCompat.isPlutoniumAddonAutomationActive())
            return;

        const effects = UtilAutomation.getCreatureFeatureEffects({
            entry,
            img: state.img
        });
        if (effects.length)
            state.effectsParsed.push(...effects);
    }

    static _pGetItemActorPassive_mutFlags({entry, opts, state}) {
        this._pGetItemActorPassive_mutFlags_player({
            entry,
            opts,
            state
        });
        this._pGetItemActorPassive_mutFlags_creature({
            entry,
            opts,
            state
        });
    }

    static _pGetItemActorPassive_mutFlags_player({entry, opts, state}) {
        if (opts.mode !== "player" || !entry.entries?.length)
            return;

        void 0;
    }

    static _pGetItemActorPassive_mutFlags_creature({entry, opts, state}) {
        if (opts.mode !== "creature" || !entry.entries?.length)
            return;

        if (!UtilCompat.isPlutoniumAddonAutomationActive())
            return;

        const flags = UtilAutomation.getCreatureFeatureFlags({
            entry,
            hasDamageParts: !!state.damageParts?.length,
            hasSavingThrow: !!state.saveDc,
        });

        foundry.utils.mergeObject(state.flagsParsed, flags);
    }

    static _DEFAULT_SAVING_THROW_DATA = {
        saveAbility: undefined,
        saveScaling: undefined,
        saveDc: undefined,
    };

    static getSavingThrowData(entries) {
        if (!entries?.length)
            return MiscUtil.copy(this._DEFAULT_SAVING_THROW_DATA);

        let isFoundParse = false;
        let {saveAbility, saveScaling, saveDc, } = MiscUtil.copy(this._DEFAULT_SAVING_THROW_DATA);

        const walker = MiscUtil.getWalker({
            keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST,
            isNoModification: true,
            isBreakOnReturn: true
        });
        const reDc = /(?:{@dc (?<dc>\d+)}|DC\s*(?<dcAlt>\d+))\s*(?<ability>Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)/i;

        walker.walk(entries, {
            string: (str)=>{
                const mDc = reDc.exec(str);
                if (!mDc)
                    return;

                saveDc = Number(mDc.groups.dc || mDc.groups.dcAlt);
                saveAbility = mDc.groups.ability.toLowerCase().substring(0, 3);
                saveScaling = "flat";
                isFoundParse = true;

                return true;
            }
            ,
        }, );

        return {
            saveAbility,
            saveScaling,
            saveDc,
            isFoundParse
        };
    }

    static getMaxCasterProgression(...casterProgressions) {
        casterProgressions = casterProgressions.filter(Boolean);
        const ixs = casterProgressions.map(it=>this._CASTER_PROGRESSIONS.indexOf(it)).filter(ix=>~ix);
        if (!ixs.length){return null;}
        return this._CASTER_PROGRESSIONS[Math.min(...ixs)];
    }

    static getMaxCantripProgression(...casterProgressions) {
        const out = [];
        casterProgressions.filter(Boolean).forEach(progression=>{
            progression.forEach((cnt,i)=>{
                if (out[i] == null)
                    return out[i] = cnt;
                out[i] = Math.max(out[i], cnt);
            });
        });
        return out;
    }

    static async pFillActorSkillToolLanguageData({existingProficienciesSkills, existingProficienciesTools, existingProficienciesLanguages, skillProficiencies, languageProficiencies, toolProficiencies, skillToolLanguageProficiencies, actorData, importOpts, titlePrefix, }, ) {
        skillToolLanguageProficiencies = this._pFillActorSkillToolLanguageData_getMergedProfs({
            skillProficiencies,
            languageProficiencies,
            toolProficiencies,
            skillToolLanguageProficiencies,
        });

        const formData = await Charactermancer_OtherProficiencySelect.pGetUserInput({
            titlePrefix,
            existingFvtt: {
                skillProficiencies: existingProficienciesSkills,
                toolProficiencies: existingProficienciesTools,
                languageProficiencies: existingProficienciesLanguages,
            },
            available: skillToolLanguageProficiencies,
        });
        if (!formData)
            return importOpts.isCancelled = true;
        if (formData === VeCt.SYM_UI_SKIP)
            return;

        this.doApplySkillFormDataToActorUpdate({
            existingProfsActor: existingProficienciesSkills,
            formData,
            actorData,
        });

        this.doApplyOtherProficienciesFormData({
            existingProfsActor: existingProficienciesLanguages,
            formData,
            formDataProp: "languageProficiencies",
            actorData,
            opts: {
                fnGetMappedItem: it=>UtilActors.getMappedLanguage(it),
                fnGetMappedCustomItem: it=>Renderer.splitTagByPipe(it)[0].toTitleCase(),
                actorTraitProp: "languages",
            },
        });

        this.doApplyToolFormDataToActorUpdate({
            existingProfsActor: existingProficienciesTools,
            formData,
            actorData,
        });
    }

    static _pFillActorSkillToolLanguageData_getMergedProfs({skillProficiencies, languageProficiencies, toolProficiencies, skillToolLanguageProficiencies, }, ) {
        const hasAnySingles = skillProficiencies?.length || languageProficiencies?.length || toolProficiencies?.length;
        if (!hasAnySingles)
            return skillToolLanguageProficiencies;

        if (!skillToolLanguageProficiencies?.length) {
            const out = [];
            this._pFillActorSkillToolLanguageData_doMergeToSingleArray({
                targetArray: out,
                skillProficiencies,
                languageProficiencies,
                toolProficiencies,
            });
            return out;
        }

        if (skillToolLanguageProficiencies?.length && hasAnySingles)
            console.warn(...LGT, `Founds individual skill/language/tool proficiencies alongside combined skill/language/tool; these will be merged together.`);

        const out = MiscUtil.copy(skillToolLanguageProficiencies || []);
        this._pFillActorSkillToolLanguageData_doMergeToSingleArray({
            targetArray: out,
            skillProficiencies,
            languageProficiencies,
            toolProficiencies,
        });
        return out;
    }

    static _pFillActorSkillToolLanguageData_doMergeToSingleArray({targetArray, skillProficiencies, languageProficiencies, toolProficiencies, }, ) {
        const maxLen = Math.max(targetArray?.length || 0, skillProficiencies?.length || 0, languageProficiencies?.length || 0, toolProficiencies?.length || 0, );
        for (let i = 0; i < maxLen; ++i) {
            const tgt = (targetArray[i] = {});

            const skillProfSet = skillProficiencies?.[i];
            const langProfSet = languageProficiencies?.[i];
            const toolProfSet = toolProficiencies?.[i];

            if (skillProfSet) {
                this._pFillActorSkillToolLanguageData_doAddProfType({
                    targetObject: tgt,
                    profSet: skillProfSet,
                    validKeySet: new Set(Object.keys(Parser.SKILL_TO_ATB_ABV)),
                    anyKeySet: new Set(["any"]),
                    anyKeySuffix: "Skill",
                });
            }

            if (langProfSet) {
                this._pFillActorSkillToolLanguageData_doAddProfType({
                    targetObject: tgt,
                    profSet: langProfSet,
                    anyKeySet: new Set(["any", "anyStandard", "anyExotic"]),
                    anyKeySuffix: "Language",
                });
            }

            if (toolProfSet) {
                this._pFillActorSkillToolLanguageData_doAddProfType({
                    targetObject: tgt,
                    profSet: toolProfSet,
                    anyKeySet: new Set(["any"]),
                    anyKeySuffix: "Tool",
                });
            }
        }
    }

    static _pFillActorSkillToolLanguageData_doAddProfType({targetObject, profSet, validKeySet, anyKeySet, anyKeySuffix, }, ) {
        Object.entries(profSet).forEach(([k,v])=>{
            switch (k) {
            case "choose":
                {
                    if (v?.from?.length) {
                        const choose = MiscUtil.copy(v);
                        choose.from = choose.from.filter(kFrom=>!validKeySet || validKeySet.has(kFrom));
                        if (choose.from.length) {
                            const tgtChoose = (targetObject.choose = targetObject.choose || []);
                            tgtChoose.push(choose);
                        }
                    }
                    break;
                }

            default:
                {
                    if (anyKeySet && anyKeySet.has(k)) {
                        targetObject[`${k}${anyKeySuffix}`] = MiscUtil.copy(v);
                        break;
                    }

                    if (!validKeySet || validKeySet.has(k))
                        targetObject[k] = MiscUtil.copy(v);
                }
            }
        }
        );
    }

    static async pFillActorSkillData(existingProfsActor, skillProficiencies, actorData, dataBuilderOpts, opts) {
        return this._pFillActorSkillToolData({
            existingProfsActor,
            proficiencies: skillProficiencies,
            actorData,
            dataBuilderOpts,
            opts,
            fnGetMapped: Charactermancer_OtherProficiencySelect.getMappedSkillProficiencies.bind(Charactermancer_OtherProficiencySelect),
            propProficiencies: "skillProficiencies",
            pFnApplyToActorUpdate: this.doApplySkillFormDataToActorUpdate.bind(this),
        });
    }

    static async pFillActorToolData(existingProfsActor, toolProficiencies, actorData, dataBuilderOpts, opts) {
        return this._pFillActorSkillToolData({
            existingProfsActor,
            proficiencies: toolProficiencies,
            actorData,
            dataBuilderOpts,
            opts,
            fnGetMapped: Charactermancer_OtherProficiencySelect.getMappedToolProficiencies.bind(Charactermancer_OtherProficiencySelect),
            propProficiencies: "toolProficiencies",
            pFnApplyToActorUpdate: this.doApplyToolFormDataToActorUpdate.bind(this),
        });
    }

    static async _pFillActorSkillToolData({existingProfsActor, proficiencies, actorData, dataBuilderOpts, opts, fnGetMapped, propProficiencies, pFnApplyToActorUpdate, }, ) {
        opts = opts || {};

        if (!proficiencies)
            return {};
        proficiencies = fnGetMapped(proficiencies);

        const formData = await Charactermancer_OtherProficiencySelect.pGetUserInput({
            ...opts,
            existingFvtt: {
                [propProficiencies]: existingProfsActor,
            },
            available: proficiencies,
        });
        if (!formData)
            return dataBuilderOpts.isCancelled = true;
        if (formData === VeCt.SYM_UI_SKIP)
            return;

        return pFnApplyToActorUpdate({
            existingProfsActor,
            formData,
            actorData
        });
    }

    static doApplySkillFormDataToActorUpdate({existingProfsActor, formData, actorData}) {
        return this._doApplySkillToolFormDataToActorUpdate({
            existingProfsActor,
            formData,
            actorData,
            mapAbvToFull: UtilActors.SKILL_ABV_TO_FULL,
            propFormData: "skillProficiencies",
            propActorData: "skills",
        }, );
    }

    static doApplyToolFormDataToActorUpdate({existingProfsActor, formData, actorData}) {
        return this._doApplySkillToolFormDataToActorUpdate({
            existingProfsActor,
            formData,
            actorData,
            mapAbvToFull: UtilActors.TOOL_ABV_TO_FULL,
            propFormData: "toolProficiencies",
            propActorData: "tools",
        }, );
    }

    static _doApplySkillToolFormDataToActorUpdate({existingProfsActor, formData, actorData, mapAbvToFull, propFormData, propActorData}) {
        if (!formData?.data?.[propFormData])
            return;

        const out = {};

        actorData[propActorData] = actorData[propActorData] || {};
        Object.entries(mapAbvToFull).filter(([_,name])=>formData.data[propFormData][name]).forEach(([abv,name])=>{
            out[abv] = formData.data[propFormData][name];

            const maxValue = Math.max((existingProfsActor[abv] || {}).value || 0, formData.data[propFormData][name] != null ? Number(formData.data[propFormData][name]) : 0, (actorData[propActorData][abv] || {}).value || 0, );

            const isUpdate = maxValue > (MiscUtil.get(actorData[propActorData], abv, "value") || 0);
            if (isUpdate)
                (actorData[propActorData][abv] = actorData[propActorData][abv] || {}).value = maxValue;
        }
        );

        return out;
    }

    static async pFillActorLanguageData(existingProfsActor, importingProfs, data, importOpts, opts) {
        opts = opts || {};

        if (!importingProfs)
            return;
        importingProfs = Charactermancer_OtherProficiencySelect.getMappedLanguageProficiencies(importingProfs);

        const formData = await Charactermancer_OtherProficiencySelect.pGetUserInput({
            ...opts,
            existingFvtt: {
                languageProficiencies: existingProfsActor,
            },
            available: importingProfs,
        });
        if (!formData)
            return importOpts.isCancelled = true;
        if (formData === VeCt.SYM_UI_SKIP)
            return;

        this.doApplyLanguageProficienciesFormDataToActorUpdate({
            existingProfsActor,
            formData,
            actorData: data
        });
    }

    static doApplyLanguageProficienciesFormDataToActorUpdate({existingProfsActor, formData, actorData}) {
        this.doApplyOtherProficienciesFormData({
            existingProfsActor,
            formData,
            formDataProp: "languageProficiencies",
            actorData,
            opts: {
                fnGetMappedItem: it=>UtilActors.getMappedLanguage(it),
                fnGetMappedCustomItem: it=>Renderer.splitTagByPipe(it)[0].toTitleCase(),
                actorTraitProp: "languages",
            },
        });
    }

    static async pFillActorToolProfData(existingProfsActor, importingProfs, data, dataBuilderOpts, opts) {
        opts = opts || {};

        if (!importingProfs)
            return;
        importingProfs = Charactermancer_OtherProficiencySelect.getMappedToolProficiencies(importingProfs);

        const formData = await Charactermancer_OtherProficiencySelect.pGetUserInput({
            ...opts,
            existingFvtt: {
                toolProficiencies: existingProfsActor,
            },
            available: importingProfs,
        });
        if (!formData)
            return dataBuilderOpts.isCancelled = true;
        if (formData === VeCt.SYM_UI_SKIP)
            return;

        this.doApplyToolProficienciesFormDataToActorUpdate({
            existingProfsActor,
            formData,
            actorData: data
        });
    }

    static doApplyToolProficienciesFormDataToActorUpdate({existingProfsActor, formData, actorData}) {
        this.doApplyToolFormDataToActorUpdate({
            existingProfsActor: existingProfsActor,
            formData,
            actorData,
        });
    }

    static async pFillActorLanguageOrToolData(existingProfsLanguages, existingProfsTools, importingProfs, actorData, importOpts, opts) {
        opts = opts || {};

        if (!importingProfs)
            return;
        importingProfs = Charactermancer_OtherProficiencySelect.getMappedLanguageProficiencies(importingProfs);
        importingProfs = Charactermancer_OtherProficiencySelect.getMappedToolProficiencies(importingProfs);

        const formData = await Charactermancer_OtherProficiencySelect.pGetUserInput({
            ...opts,
            existingFvtt: {
                languageProficiencies: existingProfsLanguages,
                toolProficiencies: existingProfsTools,
            },
            available: importingProfs,
        });
        if (!formData)
            return importOpts.isCancelled = true;
        if (formData === VeCt.SYM_UI_SKIP)
            return;

        this.doApplyOtherProficienciesFormData({
            existingProfsActor: existingProfsLanguages,
            formData,
            formDataProp: "languageProficiencies",
            actorData,
            opts: {
                fnGetMappedItem: it=>UtilActors.getMappedLanguage(it),
                fnGetMappedCustomItem: it=>Renderer.splitTagByPipe(it)[0].toTitleCase(),
                actorTraitProp: "languages",
            },
        });

        this.doApplyToolFormDataToActorUpdate({
            existingProfsActor: existingProfsTools,
            formData,
            actorData,
        });
    }

    static async pFillActorArmorProfData(existingProfsActor, importingProfs, data, importOpts, opts) {
        opts = opts || {};

        if (!importingProfs)
            return;
        importingProfs = Charactermancer_OtherProficiencySelect.getMappedArmorProficiencies(importingProfs);

        const formData = await Charactermancer_OtherProficiencySelect.pGetUserInput({
            ...opts,
            existingFvtt: {
                armorProficiencies: existingProfsActor,
            },
            available: importingProfs,
        });
        if (!formData)
            return importOpts.isCancelled = true;
        if (formData === VeCt.SYM_UI_SKIP)
            return;

        this.doApplyArmorProficienciesFormDataToActorUpdate({
            existingProfsActor,
            formData,
            actorData: data
        });
    }

    static doApplyArmorProficienciesFormDataToActorUpdate({existingProfsActor, formData, actorData}) {
        this.doApplyOtherProficienciesFormData({
            existingProfsActor,
            formData,
            formDataProp: "armorProficiencies",
            actorData,
            opts: {
                fnGetMappedItem: it=>UtilActors.getMappedArmorProficiency(it),
                fnGetMappedCustomItem: it=>Renderer.splitTagByPipe(it)[0].toTitleCase(),
                actorTraitProp: "armorProf",
            },
        });
    }

    static async pFillActorWeaponProfData(existingProfsActor, importingProfs, data, importOpts, opts) {
        opts = opts || {};

        if (!importingProfs)
            return;
        importingProfs = Charactermancer_OtherProficiencySelect.getMappedWeaponProficiencies(importingProfs);

        const formData = await Charactermancer_OtherProficiencySelect.pGetUserInput({
            ...opts,
            existingFvtt: {
                weaponProficiencies: existingProfsActor,
            },
            available: importingProfs,
        });
        if (!formData)
            return importOpts.isCancelled = true;
        if (formData === VeCt.SYM_UI_SKIP)
            return;

        this.doApplyWeaponProficienciesFormDataToActorUpdate({
            existingProfsActor,
            formData,
            actorData: data
        });
    }

    static doApplyWeaponProficienciesFormDataToActorUpdate({existingProfsActor, formData, actorData}) {
        this.doApplyOtherProficienciesFormData({
            existingProfsActor,
            formData,
            formDataProp: "weaponProficiencies",
            actorData,
            opts: {
                fnGetMappedItem: it=>UtilActors.getMappedWeaponProficiency(it),
                fnGetMappedCustomItem: it=>Renderer.splitTagByPipe(it)[0].toTitleCase(),
                actorTraitProp: "weaponProf",
            },
        });
    }

    static doApplyOtherProficienciesFormData({existingProfsActor, formData, formDataProp, actorData, opts}) {
        if (!formData?.data?.[formDataProp])
            return false;

        existingProfsActor = existingProfsActor || {};

        const formDataSet = formData.data[formDataProp];

        if (!Object.keys(formDataSet).length)
            return false;
        const cpyFormDataSet = MiscUtil.copy(formDataSet);

        const profSet = new Set();
        Object.keys(cpyFormDataSet).filter(k=>cpyFormDataSet[k]).forEach(k=>profSet.add(k));

        const mappedValidItems = new Set();
        const customItems = [];

        (existingProfsActor.value || []).forEach(it=>mappedValidItems.add(it));
        (existingProfsActor.custom || "").split(";").map(it=>it.trim()).filter(Boolean).forEach(it=>this._doApplyFormData_doCheckAddCustomItem(customItems, it));

        const existingProfsActorData = MiscUtil.get(actorData, "traits", opts.actorTraitProp);
        (existingProfsActorData?.value || []).forEach(it=>mappedValidItems.add(it));
        (existingProfsActorData?.custom || "").split(";").map(it=>it.trim()).filter(Boolean).forEach(it=>this._doApplyFormData_doCheckAddCustomItem(customItems, it));

        profSet.forEach(it=>{
            const mapped = opts.fnGetMappedItem ? opts.fnGetMappedItem(it) : it;
            if (mapped)
                mappedValidItems.add(mapped);
            else {
                const toAdd = opts.fnGetMappedCustomItem ? opts.fnGetMappedCustomItem(it) : it.toTitleCase();
                this._doApplyFormData_doCheckAddCustomItem(customItems, toAdd);
            }
        }
        );

        const dataTarget = MiscUtil.set(actorData, "traits", opts.actorTraitProp, {});
        dataTarget.value = [...mappedValidItems].map(it=>it.toLowerCase()).sort(SortUtil.ascSortLower);
        dataTarget.custom = customItems.join(";");
    }

    static _doApplyFormData_doCheckAddCustomItem(customItems, item) {
        const cleanItem = item.trim().toLowerCase();
        if (!customItems.some(it=>it.trim().toLowerCase() === cleanItem))
            customItems.push(item);
    }

    static doApplySavingThrowProficienciesFormDataToActorUpdate({existingProfsActor, formData, actorData}) {
        if (!formData?.data?.savingThrowProficiencies)
            return;

        actorData.abilities = actorData.abilities || {};
        Parser.ABIL_ABVS.filter(ab=>formData.data.savingThrowProficiencies[ab]).forEach(ab=>{
            const maxValue = Math.max(existingProfsActor[ab]?.proficient || 0, formData.data.savingThrowProficiencies[ab] ? 1 : 0, actorData.abilities[ab]?.proficient || 0, );
            const isUpdate = maxValue > (MiscUtil.get(actorData.abilities, ab, "proficient") || 0);
            if (isUpdate)
                MiscUtil.set(actorData.abilities, ab, "proficient", maxValue);
        }
        );
    }

    static async pFillActorImmunityData(existingProfsActor, importing, data, importOpts, opts) {
        opts = opts || {};

        const formData = await Charactermancer_DamageImmunitySelect.pGetUserInput({
            ...opts,
            existingFvtt: {
                immune: existingProfsActor,
            },
            available: importing,
        });
        if (!formData)
            return importOpts.isCancelled = true;
        if (formData === VeCt.SYM_UI_SKIP)
            return;

        this.doApplyDamageImmunityFormDataToActorUpdate({
            existingProfsActor,
            formData,
            actorData: data
        });
    }

    static async pFillActorResistanceData(existingProfsActor, importing, data, importOpts, opts) {
        opts = opts || {};

        const formData = await Charactermancer_DamageResistanceSelect.pGetUserInput({
            ...opts,
            existingFvtt: {
                resist: existingProfsActor,
            },
            available: importing,
        });
        if (!formData)
            return importOpts.isCancelled = true;
        if (formData === VeCt.SYM_UI_SKIP)
            return;

        this.doApplyDamageResistanceFormDataToActorUpdate({
            existingProfsActor,
            formData,
            actorData: data
        });
    }

    static async pFillActorVulnerabilityData(existingProfsActor, importing, data, importOpts, opts) {
        opts = opts || {};

        const formData = await Charactermancer_DamageVulnerabilitySelect.pGetUserInput({
            ...opts,
            existingFvtt: {
                vulnerable: existingProfsActor,
            },
            available: importing,
        });
        if (!formData)
            return importOpts.isCancelled = true;
        if (formData === VeCt.SYM_UI_SKIP)
            return;

        this.doApplyDamageVulnerabilityFormDataToActorUpdate({
            existingProfsActor,
            formData,
            actorData: data
        });
    }

    static async pFillActorConditionImmunityData(existing, importing, data, importOpts, opts) {
        opts = opts || {};

        const formData = await Charactermancer_ConditionImmunitySelect.pGetUserInput({
            ...opts,
            existingFvtt: {
                conditionImmune: existing,
            },
            available: importing,
        });
        if (!formData)
            return importOpts.isCancelled = true;
        if (formData === VeCt.SYM_UI_SKIP)
            return;

        this.doApplyConditionImmunityFormDataToActorUpdate({
            existingProfsActor: existing,
            formData,
            actorData: data
        });
    }

    static doApplyDamageImmunityFormDataToActorUpdate({existingProfsActor, formData, actorData}) {
        this.doApplyOtherProficienciesFormData({
            existingProfsActor,
            formData,
            formDataProp: "immune",
            actorData,
            opts: {
                actorTraitProp: "di",
            },
        });
    }

    static doApplyDamageResistanceFormDataToActorUpdate({existingProfsActor, formData, actorData}) {
        this.doApplyOtherProficienciesFormData({
            existingProfsActor,
            formData,
            formDataProp: "resist",
            actorData,
            opts: {
                actorTraitProp: "dr",
            },
        });
    }

    static doApplyDamageVulnerabilityFormDataToActorUpdate({existingProfsActor, formData, actorData}) {
        this.doApplyOtherProficienciesFormData({
            existingProfsActor,
            formData,
            formDataProp: "vulnerable",
            actorData,
            opts: {
                actorTraitProp: "dv",
            },
        });
    }

    static doApplyConditionImmunityFormDataToActorUpdate({existingProfsActor, formData, actorData}) {
        this.doApplyOtherProficienciesFormData({
            existingProfsActor,
            formData,
            formDataProp: "conditionImmune",
            actorData,
            opts: {
                fnGetMappedItem: it=>it === "disease" ? "diseased" : it,
                actorTraitProp: "ci",
            },
        });
    }

    static async pFillActorExpertiseData({existingProficienciesSkills, existingProficienciesTools, expertise, actorData, importOpts, titlePrefix, }, ) {
        const mergedExistingProficienciesSkills = existingProficienciesSkills ? MiscUtil.copy(existingProficienciesSkills) : existingProficienciesSkills;
        const mergedExistingProficienciesTools = existingProficienciesTools ? MiscUtil.copy(existingProficienciesTools) : existingProficienciesTools;

        if (mergedExistingProficienciesSkills && actorData.skills) {
            Object.entries(actorData.skills).forEach(([key,meta])=>{
                if (!meta)
                    return;

                mergedExistingProficienciesSkills[key] = mergedExistingProficienciesSkills[key] || MiscUtil.copy(meta);
                mergedExistingProficienciesSkills[key].value = Math.max(mergedExistingProficienciesSkills[key].value, meta.value);
            }
            );
        }

        if (mergedExistingProficienciesSkills && actorData.tools) {
            Object.entries(actorData.tools).forEach(([key,meta])=>{
                if (!meta)
                    return;

                mergedExistingProficienciesTools[key] = mergedExistingProficienciesTools[key] || MiscUtil.copy(meta);
                mergedExistingProficienciesTools[key].value = Math.max(mergedExistingProficienciesTools[key].value, meta.value);
            }
            );
        }

        const formData = await Charactermancer_ExpertiseSelect.pGetUserInput({
            titlePrefix,
            existingFvtt: {
                skillProficiencies: mergedExistingProficienciesSkills,
                toolProficiencies: mergedExistingProficienciesTools,
            },
            available: expertise,
        });
        if (!formData)
            return importOpts.isCancelled = true;
        if (formData === VeCt.SYM_UI_SKIP)
            return;

        this.doApplyExpertiseFormDataToActorUpdate({
            existingProfsActor: {
                skillProficiencies: existingProficienciesSkills,
                toolProficiencies: existingProficienciesTools,
            },
            formData,
            actorData: actorData,
        });
    }

    static doApplyExpertiseFormDataToActorUpdate({existingProfsActor, formData, actorData}) {
        this.doApplySkillFormDataToActorUpdate({
            existingProfsActor: existingProfsActor.skillProficiencies,
            formData,
            actorData,
        });

        this.doApplyToolFormDataToActorUpdate({
            existingProfsActor: existingProfsActor.toolProficiencies,
            formData,
            actorData,
        });
    }

    static doApplySensesFormDataToActorUpdate({existingSensesActor, existingTokenActor, formData, actorData, actorToken, configGroup}) {
        if (!Object.keys(formData?.data).length)
            return;

        const dataTarget = MiscUtil.getOrSet(actorData, "attributes", "senses", {});
        Object.assign(dataTarget, MiscUtil.copy(existingSensesActor));

        const foundrySenseData = this._getFoundrySenseData({
            configGroup,
            formData
        });

        this._getSensesNumericalKeys(foundrySenseData).forEach(kSense=>{
            const range = foundrySenseData[kSense];
            delete foundrySenseData[kSense];

            if (range == null)
                return;
            dataTarget[kSense] = Math.max(dataTarget[kSense], range);
        }
        );

        Object.assign(dataTarget, foundrySenseData);

        let {sight: {range: curSightRange}} = existingTokenActor || {
            sight: {}
        };
        if (curSightRange == null || isNaN(curSightRange) || Number(curSightRange) !== curSightRange) {
            const cleanedSightRange = curSightRange == null || isNaN(curSightRange) ? 0 : Number(curSightRange);
            if (curSightRange === 0)
                MiscUtil.set(actorToken, "sight", "range", cleanedSightRange);
        }

        MiscUtil.set(actorToken, "sight", "enabled", true);

        this.mutTokenSight({
            dataAttributesSenses: dataTarget,
            dataToken: actorToken,
            configGroup,
        });
    }

    static _getFoundrySenseData({configGroup, formData}) {
        const out = {};

        Object.entries(formData.data).forEach(([sense,range])=>{
            if (!range)
                return out[sense] = null;

            range = Config.getMetricNumberDistance({
                configGroup,
                originalValue: range,
                originalUnit: "feet"
            });
            range = Number(range.toFixed(2));

            out[sense] = range;
        }
        );

        const units = Config.getMetricUnitDistance({
            configGroup,
            originalUnit: "ft"
        });
        if (!out.units || units !== "ft")
            out.units = units;

        return out;
    }

    static _getSensesNumericalKeys() {
        const sensesModel = CONFIG.Item.dataModels.race.defineSchema().senses;
        return Object.entries(sensesModel.fields).filter(([,v])=>v instanceof foundry.data.fields.NumberField).map(([k])=>k);
    }

    static mutTokenSight({dataAttributesSenses, dataToken, configGroup}) {
        if (!dataAttributesSenses)
            return {
                dataAttributesSenses,
                dataToken
            };

        if (dataAttributesSenses.darkvision) {
            MiscUtil.set(dataToken, "sight", "range", Math.max(dataToken.sight?.dim ?? 0, dataAttributesSenses.darkvision));
            if (dataToken.sight?.visionMode == null || dataToken.sight?.visionMode === "basic")
                MiscUtil.set(dataToken, "sight", "visionMode", "darkvision");
        }

        let hasNonDarkvisionSense = false;
        for (const prop of ["blindsight", "tremorsense", "truesight"]) {
            if (!dataAttributesSenses[prop])
                continue;

            hasNonDarkvisionSense = true;

            const isUse = dataAttributesSenses[prop] > (dataToken.sight?.range ?? 0);
            if (!isUse)
                continue;

            MiscUtil.set(dataToken, "sight", "range", dataAttributesSenses[prop]);

            if (dataToken.sight?.visionMode === "basic") {
                MiscUtil.set(dataToken, "sight", "visionMode", prop === "tremorsense" ? "tremorsense" : "darkvision");
            }
        }

        if (dataAttributesSenses.truesight)
            this._mutTokenSight_addUpdateDetectionMode({
                dataToken,
                id: "seeAll",
                range: dataAttributesSenses.truesight
            });
        if (dataAttributesSenses.tremorsense)
            this._mutTokenSight_addUpdateDetectionMode({
                dataToken,
                id: "feelTremor",
                range: dataAttributesSenses.tremorsense
            });
        if (dataAttributesSenses.blindsight)
            this._mutTokenSight_addUpdateDetectionMode({
                dataToken,
                id: "blindsight",
                range: dataAttributesSenses.blindsight
            });

        if (dataAttributesSenses.darkvision && !hasNonDarkvisionSense && Config.getSafe(configGroup, "tokenVisionSaturation") !== ConfigConsts.C_USE_GAME_DEFAULT) {
            MiscUtil.set(dataToken, "sight", "saturation", -1);
        }

        return {
            dataAttributesSenses,
            dataToken
        };
    }

    static _mutTokenSight_addUpdateDetectionMode({dataToken, id, range}) {
        const detectionModeArr = MiscUtil.getOrSet(dataToken, "detectionModes", []);
        const existing = detectionModeArr.find(mode=>mode?.id === id);
        if (existing)
            return existing.range = Math.max(existing.range, range);
        detectionModeArr.push({
            id,
            range,
            enabled: true
        });
    }

    static _RE_IS_VERSATILE = / (?:two|both) hands/i;
    static _getDamageTupleMetas(str, {summonSpellLevel=0}={}) {
        const damageTupleMetas = [];

        const ixFirstDc = str.indexOf(`{@dc `);

        let ixLastMatch = null;
        let lenLastMatch = null;

        const strOut = str.replace(/(?:(?<dmgFlat>\d+)|\(?{@(?:dice|damage) (?<dmgDice1>[^|}]+)(?:\|[^}]+)?}(?:\s+[-+]\s+the spell's level)?(?: plus {@(?:dice|damage) (?<dmgDice2>[^|}]+)(?:\|[^}]+)?})?\)?)(?:\s+[-+]\s+[-+a-zA-Z0-9 ]*?)?(?: (?<dmgType>[^ ]+))? damage/gi, (...mDamage)=>{
            const [fullMatch] = mDamage;
            const [ixMatch,,{dmgFlat, dmgDice1, dmgDice2, dmgType}] = mDamage.slice(-3);

            const dmgDice1Clean = dmgDice1 ? dmgDice1.split("|")[0] : null;
            const dmgDice2Clean = dmgDice2 ? dmgDice2.split("|")[0] : null;
            const dmgTypeClean = dmgType || "";

            const isFlatDamage = dmgFlat != null;
            let dmg = isFlatDamage ? dmgFlat : dmgDice2Clean ? `${dmgDice1Clean} + ${dmgDice2Clean}` : dmgDice1Clean;

            if (isFlatDamage) {
                const tokens = str.split(/( )/g);
                let lenTokenStack = 0;
                const tokenStack = [];
                for (let i = 0; i < tokens.length; ++i) {
                    tokenStack.push(tokens[i]);
                    lenTokenStack += tokens[i].length;

                    if (lenTokenStack === ixMatch) {
                        const lastFourTokens = tokenStack.slice(-4);
                        if (/^by dealing$/i.test(lastFourTokens.join("").trim())) {
                            return "";
                        }
                    }
                }
            }

            dmg = dmg.replace(/\bPB\b/gi, `@${SharedConsts.MODULE_ID_FAKE}.userchar.pb`);

            dmg = dmg.replace(/\bsummonSpellLevel\b/gi, `${summonSpellLevel ?? 0}`);

            const tupleMeta = {
                tuple: [dmg, dmgTypeClean],
                isOnFailSavingThrow: false,
                isAlternateRoll: false,
            };

            if (~ixFirstDc && ixMatch >= ixFirstDc) {
                tupleMeta.isOnFailSavingThrow = true;
            }

            if (damageTupleMetas.last()?.isAlternateRoll || (damageTupleMetas.length && /\bor\b/.test(str.slice(ixLastMatch + lenLastMatch, ixMatch)) && !this._RE_IS_VERSATILE.test(str.slice(ixMatch + fullMatch.length)))) {
                tupleMeta.isAlternateRoll = true;
            }

            damageTupleMetas.push(tupleMeta);

            ixLastMatch = ixMatch;
            lenLastMatch = fullMatch.length;

            return "";
        }
        ).replace(/ +/g, " ");

        return {
            str: strOut,
            damageTupleMetas: damageTupleMetas.filter(it=>it.tuple.length),
        };
    }

    static _getDamagePartsAndOtherFormula(damageTupleMetas) {
        damageTupleMetas = damageTupleMetas || [];

        const damageTuples = [];
        const otherFormulaParts = [];

        damageTupleMetas.forEach(meta=>{
            if ((!Config.get("import", "isUseOtherFormulaFieldForSaveHalvesDamage") || !meta.isOnFailSavingThrow) && (!Config.get("import", "isUseOtherFormulaFieldForSaveHalvesDamage") || !meta.isAlternateRoll))
                return damageTuples.push(meta.tuple);

            otherFormulaParts.push(`${meta.tuple[1] ? "(" : ""}${meta.tuple[0]}${meta.tuple[1] ? `)[${meta.tuple[1]}]` : ""}`);
        }
        );

        if (!damageTuples.length)
            return {
                damageParts: damageTupleMetas.map(it=>it.tuple),
                formula: ""
            };

        return {
            damageParts: damageTuples,
            formula: otherFormulaParts.join(" + ")
        };
    }

    static _getSpeedValue(speeds, prop, configGroup) {
        if (speeds == null)
            return null;

        if (typeof speeds === "number") {
            return prop === "walk" ? Config.getMetricNumberDistance({
                configGroup,
                originalValue: speeds,
                originalUnit: "feet"
            }) : null;
        }

        const speed = speeds[prop];

        if (speed == null)
            return null;
        if (typeof speed === "boolean")
            return null;
        if (speed.number != null)
            return Config.getMetricNumberDistance({
                configGroup,
                originalValue: speed.number,
                originalUnit: "feet"
            });
        if (isNaN(speed))
            return null;
        return Config.getMetricNumberDistance({
            configGroup,
            originalValue: Number(speed),
            originalUnit: "feet"
        });
    }

    static _SPEED_PROPS_IS_EQUAL_MAP = {
        burrow: "burrow",
        climb: "climb",
        fly: "fly",
        swim: "swim",
    };

    static async _pGetSpeedEffects(speeds, {actor, actorItem, iconEntity, iconPropCompendium, taskRunner=null}={}) {
        if (speeds == null)
            return [];

        const icon = iconEntity && iconPropCompendium ? await this._ImageFetcher.pGetSaveImagePath(iconEntity, {
            propCompendium: iconPropCompendium,
            taskRunner
        }) : undefined;

        if (typeof speeds === "number")
            return [];

        const toMap = Object.entries(speeds).filter(([k,v])=>this._SPEED_PROPS_IS_EQUAL_MAP[k] && v === true);

        if (!toMap.length)
            return [];

        return [...toMap.map(([k])=>{
            return UtilActiveEffects.getGenericEffect({
                key: `system.attributes.movement.${this._SPEED_PROPS_IS_EQUAL_MAP[k]}`,
                value: `@attributes.movement.walk`,
                mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
                name: `${k.toTitleCase()} Speed`,
                icon,
                disabled: false,
                priority: UtilActiveEffects.PRIORITY_BASE,
                originActor: actor,
                originActorItem: actorItem,
            });
        }
        ), ];
    }

    static _isSpeedHover(speed) {
        if (typeof speed === "number")
            return false;
        return !!speed.canHover;
    }

    static getMovement(speed, {configGroup=null, propAllowlist=null}={}) {
        return {
            burrow: (!propAllowlist || propAllowlist.has("burrow")) ? this._getSpeedValue(speed, "burrow", configGroup) : null,
            climb: (!propAllowlist || propAllowlist.has("climb")) ? this._getSpeedValue(speed, "climb", configGroup) : null,
            fly: (!propAllowlist || propAllowlist.has("fly")) ? this._getSpeedValue(speed, "fly", configGroup) : null,
            swim: (!propAllowlist || propAllowlist.has("swim")) ? this._getSpeedValue(speed, "swim", configGroup) : null,
            walk: (!propAllowlist || propAllowlist.has("walk")) ? this._getSpeedValue(speed, "walk", configGroup) : null,
            units: Config.getMetricUnitDistance({
                configGroup,
                originalUnit: "ft"
            }),
            hover: this._isSpeedHover(speed),
        };
    }

    static _getParsedWeaponEntryData(ent) {
        if (!(ent.entries && ent.entries[0] && typeof ent.entries[0] === "string"))
            return;

        const damageTupleMetas = [];
        let attackBonus = 0;

        const str = ent.entries[0];

        damageTupleMetas.push(...this._getDamageTupleMetas(str).damageTupleMetas);

        const {rangeShort, rangeLong, rangeUnits} = this._getAttackRange(str);

        const mHit = /{@hit ([^|}]+)(?:\|[^}]+)?}/gi.exec(str);
        if (mHit) {
            const hitBonus = Number(mHit[1]);
            if (!isNaN(hitBonus)) {
                attackBonus = hitBonus;
            }
        }

        return {
            damageTupleMetas,
            rangeShort,
            rangeLong,
            rangeUnits,
            attackBonus,
        };
    }

    static _getAttackRange(str) {
        let rangeShort = null;
        let rangeLong = null;

        const mRange = /range (\d+)(?:\/(\d+))? ft/gi.exec(str);
        if (mRange) {
            rangeShort = Number(mRange[1]);
            if (mRange[2])
                rangeLong = Number(mRange[2]);
        } else {
            const mReach = /reach (\d+) ft/gi.exec(str);
            if (mReach) {
                rangeShort = Number(mReach[1]);
            }
        }

        rangeShort = Config.getMetricNumberDistance({
            configGroup: this._configGroup,
            originalValue: rangeShort,
            originalUnit: "feet"
        });
        rangeLong = Config.getMetricNumberDistance({
            configGroup: this._configGroup,
            originalValue: rangeLong,
            originalUnit: "feet"
        });

        return {
            rangeShort,
            rangeLong,
            rangeUnits: rangeShort || rangeLong ? Config.getMetricUnitDistance({
                configGroup: this._configGroup,
                originalUnit: "feet"
            }) : null,
        };
    }

    static getActorDamageResImmVulnConditionImm(ent) {
        const out = {};

        const allDis = new Set();
        const bypassDis = new Set();
        let customDis = [];
        this._getActorDamageResImmVulnConditionImm_addDamageTypesOrConditionTypes({
            ent,
            validTypesArr: UtilActors.VALID_DAMAGE_TYPES,
            fnRender: Parser.getFullImmRes,
            prop: "immune",
            allSet: allDis,
            bypassSet: bypassDis,
            customStack: customDis,
        });

        out.di = {
            value: [...allDis],
            custom: customDis.join(", "),
            bypasses: [...bypassDis],
        };

        const allDrs = new Set();
        const bypassDrs = new Set();
        let customDrs = [];
        this._getActorDamageResImmVulnConditionImm_addDamageTypesOrConditionTypes({
            ent,
            validTypesArr: UtilActors.VALID_DAMAGE_TYPES,
            fnRender: Parser.getFullImmRes,
            prop: "resist",
            allSet: allDrs,
            bypassSet: bypassDrs,
            customStack: customDrs,
        });

        out.dr = {
            value: [...allDrs],
            custom: customDrs.join(", "),
            bypasses: [...bypassDrs],
        };

        const allDvs = new Set();
        const bypassDvs = new Set();
        let customDvs = [];
        this._getActorDamageResImmVulnConditionImm_addDamageTypesOrConditionTypes({
            ent,
            validTypesArr: UtilActors.VALID_DAMAGE_TYPES,
            fnRender: Parser.getFullImmRes,
            prop: "vulnerable",
            allSet: allDvs,
            bypassSet: bypassDvs,
            customStack: customDvs,
        });

        out.dv = {
            value: [...allDvs],
            custom: customDvs.join(", "),
            bypasses: [...bypassDvs],
        };

        const allCis = new Set();
        let customCis = [];
        this._getActorDamageResImmVulnConditionImm_addDamageTypesOrConditionTypes({
            ent,
            validTypesArr: UtilActors.VALID_CONDITIONS,
            fnRender: arr=>Parser.getFullCondImm(arr, {
                isPlainText: true
            }),
            prop: "conditionImmune",
            allSet: allCis,
            customStack: customCis,
        });

        out.ci = {
            value: [...allCis],
            custom: customCis.join(", "),
        };

        return out;
    }

    static _getActorDamageResImmVulnConditionImm_addDamageTypesOrConditionTypes({ent, validTypesArr, fnRender, prop, allSet, bypassSet, customStack}, ) {
        if (!ent[prop])
            return;

        ent[prop].forEach(it=>{
            if (validTypesArr.includes(it)) {
                allSet.add(it);
                return;
            }

            if (this._PROPS_DAMAGE_IMM_VULN_RES.has(prop) && it[prop] && it[prop]instanceof Array && CollectionUtil.setEq(new Set(it[prop]), this._SET_PHYSICAL_DAMAGE) && it.note && it.cond) {
                const mNote = /\bnon[- ]?magical\b.*?(?:\baren't (?<bypass>silvered|adamantine)\b)?$/.exec(it.note);

                if (mNote) {
                    bypassSet.add("mgc");

                    switch ((mNote.groups.bypass || "").toLowerCase()) {
                    case "silvered":
                        bypassSet.add("sil");
                        break;
                    case "adamantine":
                        bypassSet.add("ada");
                        break;
                    }

                    it[prop].forEach(sub=>allSet.add(sub));
                    return;
                }
            }

            const asText = fnRender([it]);
            customStack.push(asText);
        }
        );
    }

    static getImportedEmbed(importedEmbeds, itemData) {
        const importedEmbed = importedEmbeds.find(it=>it.raw === itemData);

        if (!importedEmbed) {
            ui.notifications.warn(`Failed to link embedded entity for active effects! ${VeCt.STR_SEE_CONSOLE}`);
            console.warn(...LGT, `Could not find loaded item data`, itemData, `in imported embedded entities`, importedEmbeds);
            return null;
        }

        return importedEmbed;
    }

    static getConsumedSheetItem({consumes, actor}) {
        const lookupNames = [consumes.name.toLowerCase().trim(), consumes.name.toLowerCase().trim().toPlural(), ];

        return (actor?.items?.contents || []).find(it=>it.type === "feat" && lookupNames.includes(it.name.toLowerCase().trim()));
    }

    static _mutApplyDocOwnership(docData, {defaultOwnership, isAddDefaultOwnershipFromConfig, userOwnership, }, ) {
        if (defaultOwnership != null)
            docData.ownership = {
                default: defaultOwnership
            };
        else if (isAddDefaultOwnershipFromConfig)
            docData.ownership = {
                default: Config.get(this._configGroup, "ownership")
            };

        if (userOwnership)
            Object.assign(docData.ownership ||= {}, userOwnership);
    }

    static mutEffectsDisabledTransfer(effects, configGroup, opts={}) {
        if (!effects)
            return;

        return effects.map(effect=>this.mutEffectDisabledTransfer(effect, configGroup, opts));
    }

    static mutEffectDisabledTransfer(effect, configGroup, {hintDisabled=null, hintTransfer=null, hintSelfTarget=null, }={}, ) {
        if (!effect)
            return;

        const disabled = Config.get(configGroup, "setEffectDisabled");
        switch (disabled) {
        case ConfigConsts.C_USE_PLUT_VALUE:
            effect.disabled = hintDisabled != null ? hintDisabled : false;
            break;
        case ConfigConsts.C_BOOL_DISABLED:
            effect.disabled = false;
            break;
        case ConfigConsts.C_BOOL_ENABLED:
            effect.disabled = true;
            break;
        }

        const transfer = Config.get(configGroup, "setEffectTransfer");
        switch (transfer) {
        case ConfigConsts.C_USE_PLUT_VALUE:
            effect.transfer = hintTransfer != null ? hintTransfer : true;
            break;
        case ConfigConsts.C_BOOL_DISABLED:
            effect.transfer = false;
            break;
        case ConfigConsts.C_BOOL_ENABLED:
            effect.transfer = true;
            break;
        }

        if (UtilCompat.isPlutoniumAddonAutomationActive()) {
            const val = hintTransfer != null ? hintSelfTarget : false;
            MiscUtil.set(effect, "flags", UtilCompat.MODULE_DAE, "selfTarget", val);
            MiscUtil.set(effect, "flags", UtilCompat.MODULE_DAE, "selfTargetAlways", val);
        }

        return effect;
    }

    static getEffectsMutDedupeId(effects) {
        if (!effects?.length)
            return effects;

        const usedDedupeIds = new Set();

        effects.forEach(eff=>{
            const dedupeIdExisting = eff.flags?.[SharedConsts.MODULE_ID]?.dedupeId;
            if (dedupeIdExisting && !usedDedupeIds.has(dedupeIdExisting)) {
                usedDedupeIds.add(dedupeIdExisting);
                return;
            }

            if (!eff.name)
                throw new Error(`Effect did not have a name!`);

            const dedupeIdBase = dedupeIdExisting ?? eff.name.slugify({
                strict: true
            });
            if (!usedDedupeIds.has(dedupeIdBase)) {
                usedDedupeIds.add(dedupeIdBase);
                MiscUtil.set(eff, "flags", SharedConsts.MODULE_ID, "dedupeId", dedupeIdBase);
                return;
            }

            for (let i = 0; i < 99; ++i) {
                const dedupeId = `${dedupeIdBase}-${i}`;
                if (!usedDedupeIds.has(dedupeId)) {
                    usedDedupeIds.add(dedupeId);
                    MiscUtil.set(eff, "flags", SharedConsts.MODULE_ID, "dedupeId", dedupeId);
                    return;
                }
            }

            throw new Error(`Could not find an available dedupeId for base "${dedupeIdBase}"!`);
        }
        );

        return effects;
    }

    static _getTranslationData({srdData, }, ) {
        if (!srdData || !Config.get("integrationBabele", "isEnabled") || !UtilCompat.isBabeleActive() || !srdData.flags?.[UtilCompat.MODULE_BABELE])
            return null;

        return {
            name: srdData.name,
            description: srdData.system?.description?.value,
            flags: {
                [UtilCompat.MODULE_BABELE]: {
                    translated: !!srdData.flags[UtilCompat.MODULE_BABELE].translated,
                    hasTranslation: !!srdData.flags[UtilCompat.MODULE_BABELE].hasTranslation,
                },
            },
        };
    }

    static _getTranslationMeta({name, translationData, description, }, ) {
        if (translationData == null)
            return {
                name,
                description,
                flags: {}
            };

        const flags = {
            [UtilCompat.MODULE_BABELE]: {
                ...(translationData.flags?.[UtilCompat.MODULE_BABELE] || {}),
                originalName: name,
            },
        };

        name = translationData.name;

        if (description && Config.get("integrationBabele", "isUseTranslatedDescriptions"))
            description = translationData.description || description;

        return {
            name,
            description,
            flags
        };
    }

    static _getIdObj({id=null}={}) {
        if (id == null)
            id = foundry.utils.randomID();
        return {
            _id: id,
            id,
        };
    }
}

DataConverter.SYM_AT = "<PLUT_SYM__AT>";

DataConverter.ITEM_TYPES_ACTOR_TOOLS = new Set(["AT", "GS", "INS", "T"]);
DataConverter.ITEM_TYPES_ACTOR_WEAPONS = new Set(["M", "R"]);
DataConverter.ITEM_TYPES_ACTOR_ARMOR = new Set(["LA", "MA", "HA", "S"]);

DataConverter._PROPS_DAMAGE_IMM_VULN_RES = new Set(["immune", "resist", "vulnerable"]);
DataConverter._SET_PHYSICAL_DAMAGE = new Set(["bludgeoning", "piercing", "slashing"]);

DataConverter._CASTER_PROGRESSIONS = ["full", "artificer", "1/2", "1/3", "pact", ];

var DataConverter$1 = /*#__PURE__*/
Object.freeze({
    __proto__: null,
    DataConverter: DataConverter
});

class DataConverterJournal extends DataConverter {
    static _mutPageDataOwnershipFlags({pageData, flags}) {
        pageData.ownership = {
            default: CONST.DOCUMENT_OWNERSHIP_LEVELS.INHERIT
        };
        pageData.flags = flags ? MiscUtil.copy(flags) : {};
    }

    static _getContentPage({name, content, flags}) {
        if (!content)
            return null;

        const pageData = {
            name,
            type: "text",
            text: {
                format: 1,
                content,
            },
        };
        this._mutPageDataOwnershipFlags({
            pageData,
            flags
        });
        return pageData;
    }

    static _getImgPage({name, img, flags}) {
        if (!img)
            return null;

        const pageData = {
            name: `${name} (Image)`,
            type: "image",
            src: img,
        };
        this._mutPageDataOwnershipFlags({
            pageData,
            flags
        });
        return pageData;
    }

    static _getPages({name, content, img, flags}) {
        return [this._getContentPage({
            name,
            content,
            flags
        }), this._getImgPage({
            name,
            img,
            flags
        }), ].filter(Boolean);
    }

    static async _pGetWithJournalDescriptionPlugins(pFn) {
        return UtilDataConverter.pGetWithDescriptionPlugins(async()=>{
            const renderer = Renderer.get().setPartPageExpandCollapseDisabled(true);
            const out = await pFn();
            renderer.setPartPageExpandCollapseDisabled(false);
            return out;
        }
        );
    }
}

class DataConverterClass extends DataConverter {
    static _configGroup = "importClass";

    static _SideDataInterface = SideDataInterfaceClass;
    //TEMPFIX static _ImageFetcher = ImageFetcherClass;

    static _getDoNotUseNote() {
        return UtilDataConverter.pGetWithDescriptionPlugins(()=>`<p>${Renderer.get().render(`{@note Note: importing a class as an item is provided for display purposes only. If you wish to import a class to a character sheet, please use the importer on the sheet instead.}`)}</p>`);
    }

    static _getDataHitDice(cls) {
        if (cls.hd?.number !== 1)
            return null;
        if (!cls.hd?.faces)
            return null;

        const asString = `d${cls.hd.faces}`;
        if (!CONFIG.DND5E.hitDieTypes.includes(asString))
            return null;
        return asString;
    }

    static async pGetClassItem(cls, opts) {
        opts = opts || {};
        if (opts.actor)
            opts.isActorItem = true;

        Renderer.get().setFirstSection(true).resetHeaderIndex();

        const itemId = foundry.utils.randomID();

        if (!opts.isClsDereferenced) {
            cls = await DataLoader.pCacheAndGet("class", cls.source, UrlUtil.URL_TO_HASH_BUILDER["class"](cls), {
                isRequired: true
            });
        }

        if (opts.pageFilter?.filterBox && opts.filterValues) {
            cls = MiscUtil.copy(cls);

            Renderer.class.mutFilterDereferencedClassFeatures({
                cpyCls: cls,
                pageFilter: opts.pageFilter,
                filterValues: opts.filterValues,
            });
        }

        const srdData = await UtilCompendium.getSrdCompendiumEntity("class", cls, {
            taskRunner: opts.taskRunner
        });

        const {name: translatedName, description: translatedDescription, flags: translatedFlags} = this._getTranslationMeta({
            translationData: this._getTranslationData({
                srdData
            }),
            name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(cls, {
                isActorItem: opts.isActorItem
            })),
            description: await this._pGetClassDescription(cls, opts),
        });

        const identifierCls = UtilDocumentItem.getNameAsIdentifier(cls.name);

        //TEMPFIX
        /* const img = await this._ImageFetcher.pGetSaveImagePath(cls, {
            propCompendium: "class",
            taskRunner: opts.taskRunner
        }); */

        const hitDice = this._getDataHitDice(cls);

        const additionalData = await this._SideDataInterface.pGetDataSideLoaded(cls);
        const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(cls);
        const additionalAdvancement = await this._SideDataInterface._pGetAdvancementSideLoaded(cls);

        const effectsSideTuples = await this._SideDataInterface.pGetEffectsSideLoadedTuples({
            ent: cls,
            img,
            actor: opts.actor
        });
        effectsSideTuples.forEach(({effect, effectRaw})=>DataConverter.mutEffectDisabledTransfer(effect, "importClass", UtilActiveEffects.getDisabledTransferHintsSideData(effectRaw)));

        const out = {
            id: itemId,
            _id: itemId,
            name: translatedName,
            type: "class",
            system: {
                identifier: identifierCls,
                description: {
                    value: translatedDescription,
                    chat: "",
                    unidentified: ""
                },
                source: UtilDocumentSource.getSourceObjectFromEntity(cls),
                levels: opts.level ?? 1,
                hitDice,
                hitDiceUsed: 0,
                spellcasting: {
                    progression: UtilActors.getMappedCasterType(cls.casterProgression) || cls.casterProgression,
                    ability: cls.spellcastingAbility,
                },
                advancement: [...(srdData?.system?.advancement || []).filter(it=>it.type === "ScaleValue"), ...this._getClassAdvancement(cls, opts), ...(additionalAdvancement || []), ],

                ...additionalData,
            },
            ownership: {
                default: 0
            },
            flags: {
                ...translatedFlags,
                ...this._getClassSubclassFlags({
                    cls,
                    filterValues: opts.filterValues,
                    proficiencyImportMode: opts.proficiencyImportMode,
                    isActorItem: opts.isActorItem,
                    spellSlotLevelSelection: opts.spellSlotLevelSelection,
                }),
                ...additionalFlags,
            },
            effects: DataConverter.getEffectsMutDedupeId([await this._pGetPreparedSpellsEffect({
                cls,
                actorId: opts.actor?.id,
                itemId,
                existing: this._getExistingPreparedSpellsEffect({
                    actor: opts.actor
                }),
                taskRunner: opts.taskRunner,
            }), ...effectsSideTuples.map(it=>it.effect), ].filter(Boolean), ),
            img,
        };

        this._mutApplyDocOwnership(out, opts);

        return out;
    }

    static async _pGetClassDescription(cls, opts) {
        const ptDoNotUse = !opts.isActorItem ? await this._getDoNotUseNote() : "";

        const ptTable = await UtilDataConverter.pGetWithDescriptionPlugins(()=>this.pGetRenderedClassTable(cls));

        const ptFluff = cls?.fluff?.length ? await UtilDataConverter.pGetWithDescriptionPlugins(()=>Renderer.get().setFirstSection(true).render({
            type: cls.fluff[0].type || "section",
            entries: cls.fluff[0].entries || []
        })) : "";

        const ptFeatures = !opts.isActorItem ? await UtilDataConverter.pGetWithDescriptionPlugins(()=>Renderer.get().setFirstSection(true).render({
            type: "section",
            entries: cls.classFeatures.flat()
        })) : "";

        if (!Config.get("importClass", "isImportDescription"))
            return `<div class="mb-2 ve-flex-col">${ptDoNotUse}${ptTable}</div>`;

        return `<div class="mb-2 ve-flex-col">${ptDoNotUse}${ptTable}${ptFluff}${ptFeatures}</div>`;
    }

    static _getClassAdvancement(cls, opts) {
        return [...this._getClassAdvancement_hitPoints(cls, opts), ...this._getClassAdvancement_saves(cls, opts), ...this._getClassAdvancement_skills(cls, opts), ];
    }

    static _getClassAdvancement_hitPoints(cls, opts) {
        const hitDice = this._getDataHitDice(cls);
        if (hitDice == null)
            return [];

        const advancement = UtilAdvancements.getAdvancementHitPoints({
            hpAdvancementValue: opts.hpAdvancementValue,
            isActorItem: opts.isActorItem,
        });
        if (advancement == null)
            return [];

        return [advancement];
    }

    static _getClassAdvancement_saves(cls, opts) {
        const saves = (cls.proficiency || []).filter(it=>Parser.ATB_ABV_TO_FULL[it]);
        if (!saves.length)
            return [];

        const advancement = UtilAdvancements.getAdvancementSaves({
            savingThrowProficiencies: [saves.mergeMap(abv=>({
                [abv]: true
            }))],
            classRestriction: "primary",
            level: 1,
        });
        if (advancement == null)
            return [];

        return [advancement];
    }

    static _getClassAdvancement_skills(cls, opts) {
        return [UtilAdvancements.getAdvancementSkills({
            skillProficiencies: cls.startingProficiencies?.skills,
            classRestriction: "primary",
            skillsChosenFvtt: opts.proficiencyImportMode === Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY ? opts.startingSkills : null,
            level: 1,
        }), UtilAdvancements.getAdvancementSkills({
            skillProficiencies: cls.multiclassing?.proficienciesGained?.skills,
            classRestriction: "secondary",
            skillsChosenFvtt: opts.proficiencyImportMode === Charactermancer_Class_ProficiencyImportModeSelect.MODE_MULTICLASS ? opts.startingSkills : null,
            level: 1,
        }), ].filter(Boolean);
    }

    static _getClassSubclassFlags({cls, sc, filterValues, proficiencyImportMode, isActorItem, spellSlotLevelSelection}) {
        const out = {
            [SharedConsts.MODULE_ID]: {
                page: UrlUtil.PG_CLASSES,
                source: sc ? sc.source : cls.source,
                hash: sc ? UrlUtil.URL_TO_HASH_BUILDER["subclass"](sc) : UrlUtil.URL_TO_HASH_BUILDER["class"](cls),

                propDroppable: sc ? "subclass" : "class",
                filterValues,

                isPrimaryClass: proficiencyImportMode === Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY,

                spellSlotLevelSelection,
            },
        };

        if (isActorItem)
            out[SharedConsts.MODULE_ID].isDirectImport = true;

        return out;
    }

    static _getAllSkillChoices(skillProfs) {
        const allSkills = new Set();

        skillProfs.forEach(skillProfGroup=>{
            Object.keys(Parser.SKILL_TO_ATB_ABV).filter(skill=>skillProfGroup[skill]).forEach(skill=>allSkills.add(skill));

            if (skillProfGroup.choose?.from?.length) {
                skillProfGroup.choose.from.filter(skill=>Parser.SKILL_TO_ATB_ABV[skill]).forEach(skill=>allSkills.add(skill));
            }
        }
        );

        return Object.entries(UtilActors.SKILL_ABV_TO_FULL).filter(([,vetKey])=>allSkills.has(vetKey)).map(([fvttKey])=>fvttKey);
    }

    static async pGetSubclassItem(cls, sc, opts) {
        opts = opts || {};
        if (opts.actor)
            opts.isActorItem = true;

        Renderer.get().setFirstSection(true).resetHeaderIndex();

        const itemId = foundry.utils.randomID();

        if (!opts.isScDereferenced) {
            sc = await DataLoader.pCacheAndGet("subclass", sc.source, UrlUtil.URL_TO_HASH_BUILDER["subclass"](sc));
        }

        if (opts.pageFilter?.filterBox && opts.filterValues) {
            sc = MiscUtil.copy(sc);

            Renderer.class.mutFilterDereferencedSubclassFeatures({
                cpySc: sc,
                pageFilter: opts.pageFilter,
                filterValues: opts.filterValues,
            });
        }

        const srdData = await UtilCompendium.getSrdCompendiumEntity("subclass", sc, {
            taskRunner: opts.taskRunner
        });

        const {name: translatedName, description: translatedDescription, flags: translatedFlags} = this._getTranslationMeta({
            translationData: this._getTranslationData({
                srdData
            }),
            name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(sc, {
                isActorItem: opts.isActorItem
            })),
            description: await this._pGetSubclassDescription(cls, sc, opts),
        });

        const identifierCls = UtilDocumentItem.getNameAsIdentifier(cls.name);
        const identifierSc = UtilDocumentItem.getNameAsIdentifier(sc.name);

        //TEMPFIX
       /*  const imgMetaSc = await this._ImageFetcher.pGetSaveImagePathMeta(sc, {
            propCompendium: "subclass",
            taskRunner: opts.taskRunner
        });
        const imgMetaCls = (Config.get("importClass", "isUseDefaultSubclassImage") || (imgMetaSc && !imgMetaSc.isFallback)) ? null : await this._ImageFetcher.pGetSaveImagePathMeta(cls, {
            propCompendium: "class",
            taskRunner: opts.taskRunner
        }); */

        const img = (imgMetaSc && !imgMetaSc.isFallback) ? imgMetaSc.img : imgMetaCls && !imgMetaCls.isFallback ? imgMetaCls.img : (imgMetaSc?.img || imgMetaCls.img);

        const additionalData = await this._SideDataInterface.pGetDataSideLoaded(sc, {
            propOpts: "_SIDE_LOAD_OPTS_SUBCLASS"
        });
        const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(sc, {
            propOpts: "_SIDE_LOAD_OPTS_SUBCLASS"
        });
        const additionalAdvancement = await this._SideDataInterface._pGetAdvancementSideLoaded(sc, {
            propOpts: "_SIDE_LOAD_OPTS_SUBCLASS"
        });

        const effectsSideTuples = await this._SideDataInterface.pGetEffectsSideLoadedTuples({
            ent: sc,
            img,
            actor: opts.actor
        }, {
            propOpts: "_SIDE_LOAD_OPTS_SUBCLASS"
        });
        effectsSideTuples.forEach(({effect, effectRaw})=>DataConverter.mutEffectDisabledTransfer(effect, "importClass", UtilActiveEffects.getDisabledTransferHintsSideData(effectRaw)));

        const out = {
            id: itemId,
            _id: itemId,
            name: translatedName,
            type: "subclass",
            system: {
                identifier: identifierSc,
                classIdentifier: identifierCls,
                description: {
                    value: translatedDescription,
                    chat: "",
                    unidentified: ""
                },
                source: UtilDocumentSource.getSourceObjectFromEntity(sc),
                spellcasting: {
                    progression: UtilActors.getMappedCasterType(sc.casterProgression) || sc.casterProgression,
                    ability: sc.spellcastingAbility,
                },
                advancement: [...(srdData?.system?.advancement || []).filter(it=>it.type === "ScaleValue"), ...(additionalAdvancement || []), ],

                ...additionalData,
            },
            ownership: {
                default: 0
            },
            flags: {
                ...translatedFlags,
                ...this._getClassSubclassFlags({
                    cls,
                    sc,
                    filterValues: opts.filterValues,
                    proficiencyImportMode: opts.proficiencyImportMode,
                    isActorItem: opts.isActorItem,
                }),
                ...additionalFlags,
            },
            effects: DataConverter.getEffectsMutDedupeId([await this._pGetPreparedSpellsEffect({
                cls,
                sc,
                actorId: opts.actor?.id,
                itemId,
                existing: this._getExistingPreparedSpellsEffect({
                    actor: opts.actor
                }),
                taskRunner: opts.taskRunner,
            }), ...effectsSideTuples.map(it=>it.effect), ].filter(Boolean), ),
            img,
        };

        this._mutApplyDocOwnership(out, opts);

        return out;
    }

    static async _pGetSubclassDescription(cls, sc, opts) {
        const ptDoNotUse = !opts.isActorItem ? await this._getDoNotUseNote() : "";

        const fluff = MiscUtil.copy(Renderer.findEntry(sc.subclassFeatures || {}));

        const cleanEntries = MiscUtil.getWalker({
            keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST
        }).walk(MiscUtil.copy(fluff.entries), {
            array: (arr)=>{
                return arr.filter(it=>!it?.data?.isFvttSyntheticFeatureLink);
            }
            ,
        }, );

        const ptFluff = opts.isActorItem ? Renderer.get().setFirstSection(true).render({
            type: "entries",
            entries: cleanEntries
        }) : "";

        const ptFeatures = !opts.isActorItem ? await UtilDataConverter.pGetWithDescriptionPlugins(()=>Renderer.get().setFirstSection(true).render({
            type: "section",
            entries: sc.subclassFeatures.flat()
        })) : "";

        if (!Config.get("importClass", "isImportDescription"))
            return `<div class="mb-2 ve-flex-col">${ptDoNotUse}</div>`;

        return `<div class="mb-2 ve-flex-col">${ptDoNotUse}${ptFluff}${ptFeatures}</div>`;
    }

    static async pGetRenderedClassTable(cls, sc, opts={}) {
        if (!Config.get("importClass", "isImportClassTable"))
            return "";

        return UtilDataConverter.pGetWithDescriptionPlugins(async()=>{
            cls = await DataLoader.pCacheAndGet("class", cls.source, UrlUtil.URL_TO_HASH_BUILDER["class"](cls));

            if (sc) {
                sc = await DataLoader.pCacheAndGet("subclass", sc.source, UrlUtil.URL_TO_HASH_BUILDER["subclass"](sc));
            }

            return this.getRenderedClassTableFromDereferenced(cls, sc, opts);
        }
        );
    }

    static getRenderedClassTableFromDereferenced(cls, sc, {isAddHeader=false, isSpellsOnly=false}={}) {
        if (!cls)
            return "";

        return Vetools.withUnpatchedDiceRendering(()=>{
            Renderer.get().setFirstSection(true).resetHeaderIndex();

            const tblGroupHeaders = [];
            const tblHeaders = [];

            const renderTableGroupHeader = (tableGroup)=>{
                let thGroupHeader;
                if (tableGroup.title) {
                    thGroupHeader = `<th class="cls-tbl__col-group" colspan="${tableGroup.colLabels.length}">${tableGroup.title}</th>`;
                } else {
                    thGroupHeader = `<th colspan="${tableGroup.colLabels.length}"></th>`;
                }
                tblGroupHeaders.push(thGroupHeader);

                tableGroup.colLabels.forEach(lbl=>{
                    tblHeaders.push(`<th class="cls-tbl__col-generic-center"><div class="cls__squash_header">${Renderer.get().render(lbl)}</div></th>`);
                }
                );
            }
            ;

            if (cls.classTableGroups) {
                cls.classTableGroups.forEach(tableGroup=>{
                    if (isSpellsOnly)
                        tableGroup = this._getRenderedClassTableFromDereferenced_getSpellsOnlyTableGroup(tableGroup);
                    if (!tableGroup)
                        return;
                    renderTableGroupHeader(tableGroup);
                }
                );
            }

            if (sc?.subclassTableGroups) {
                sc.subclassTableGroups.forEach(tableGroup=>{
                    if (isSpellsOnly)
                        tableGroup = this._getRenderedClassTableFromDereferenced_getSpellsOnlyTableGroup(tableGroup);
                    if (!tableGroup)
                        return;
                    renderTableGroupHeader(tableGroup);
                }
                );
            }

            const tblRows = cls.classFeatures.map((lvlFeatures,ixLvl)=>{
                const pb = Math.ceil((ixLvl + 1) / 4) + 1;

                const lvlFeaturesFilt = lvlFeatures.filter(it=>it.name && it.type !== "inset");
                const dispsFeatures = lvlFeaturesFilt.map((it,ixFeature)=>`<div class="inline-block">${it.name}${ixFeature === lvlFeaturesFilt.length - 1 ? "" : `<span class="mr-1">,</span>`}</div>`);

                const ptTableGroups = [];

                const renderTableGroupRow = (tableGroup)=>{
                    const row = (tableGroup.rowsSpellProgression || tableGroup.rows)[ixLvl] || [];
                    const cells = row.map(cell=>`<td class="cls-tbl__col-generic-center">${cell === 0 ? "\u2014" : Renderer.get().render(cell)}</td>`);
                    ptTableGroups.push(...cells);
                }
                ;

                if (cls.classTableGroups) {
                    cls.classTableGroups.forEach(tableGroup=>{
                        if (isSpellsOnly)
                            tableGroup = this._getRenderedClassTableFromDereferenced_getSpellsOnlyTableGroup(tableGroup);
                        if (!tableGroup)
                            return;
                        renderTableGroupRow(tableGroup);
                    }
                    );
                }

                if (sc?.subclassTableGroups) {
                    sc.subclassTableGroups.forEach(tableGroup=>{
                        if (isSpellsOnly)
                            tableGroup = this._getRenderedClassTableFromDereferenced_getSpellsOnlyTableGroup(tableGroup);
                        if (!tableGroup)
                            return;
                        renderTableGroupRow(tableGroup);
                    }
                    );
                }

                return `<tr class="cls-tbl__stripe-odd">
					<td class="cls-tbl__col-level">${Parser.getOrdinalForm(ixLvl + 1)}</td>
					${isSpellsOnly ? "" : `<td class="cls-tbl__col-prof-bonus">+${pb}</td>`}
					${isSpellsOnly ? "" : `<td>${dispsFeatures.join("") || `\u2014`}</td>`}
					${ptTableGroups.join("")}
				</tr>`;
            }
            );

            return `<table class="cls-tbl shadow-big w-100 mb-3">
				<tbody>
				<tr><th class="border" colspan="15"></th></tr>
				${isAddHeader ? `<tr><th class="cls-tbl__disp-name" colspan="15">${cls.name}</th></tr>` : ""}
				<tr>
					<th colspan="${isSpellsOnly ? "1" : "3"}"></th>
					${tblGroupHeaders.join("")}
				</tr>
				<tr>
					<th class="cls-tbl__col-level">Level</th>
					${isSpellsOnly ? "" : `<th class="cls-tbl__col-prof-bonus">Proficiency Bonus</th>`}
					${isSpellsOnly ? "" : `<th>Features</th>`}
					${tblHeaders.join("")}
				</tr>
				${tblRows.join("")}
				<tr><th class="border" colspan="15"></th></tr>
				</tbody>
			</table>`;
        }
        );
    }

    static _getRenderedClassTableFromDereferenced_getSpellsOnlyTableGroup(tableGroup) {
        tableGroup = MiscUtil.copy(tableGroup);

        if (/spell/i.test(`${tableGroup.title || ""}`))
            return tableGroup;

        if (!tableGroup.colLabels)
            return null;

        const ixsSpellLabels = new Set(tableGroup.colLabels.map((it,ix)=>{
            const stripped = Renderer.stripTags(`${it || ""}`);
            return /cantrip|spell|slot level/i.test(stripped) ? ix : null;
        }
        ).filter(ix=>ix != null));

        if (!ixsSpellLabels.size)
            return null;

        tableGroup.colLabels = tableGroup.colLabels.filter((_,ix)=>ixsSpellLabels.has(ix));
        if (tableGroup.rowsSpellProgression)
            tableGroup.rowsSpellProgression = tableGroup.rowsSpellProgression.map(row=>row.filter((_,ix)=>ixsSpellLabels.has(ix)));
        if (tableGroup.rows)
            tableGroup.rows = tableGroup.rows.map(row=>row.filter((_,ix)=>ixsSpellLabels.has(ix)));

        return tableGroup;
    }

    static _getExistingPreparedSpellsEffect({actor}) {
        if (!actor)
            return null;
        return actor.effects.contents.find(it=>(it.name || "").toLowerCase().trim() === "prepared spells");
    }

    static async _pGetPreparedSpellsEffect({cls, sc, actorId, itemId, existing, taskRunner}) {
        if (existing)
            return null;
        if (sc && !sc.preparedSpells)
            return null;
        if (!sc && !cls.preparedSpells)
            return null;

        const spellsPreparedFormula = Charactermancer_Spell_Util.getMaxPreparedSpellsFormula({
            cls,
            sc
        });
        if (!spellsPreparedFormula)
            return null;

        if (game)
            return null;

        return UtilActiveEffects.getGenericEffect({
            key: `flags.${UtilCompat.MODULE_TIDY5E_SHEET}.maxPreparedSpells`,
            value: spellsPreparedFormula,
            mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
            name: `Prepared Spells`,
            //TEMPFIX
            /* icon: await this._ImageFetcher.pGetSaveImagePath(cls, {
                propCompendium: "class",
                taskRunner
            }), */
            disabled: false,
            priority: UtilActiveEffects.PRIORITY_BASE,
            originActorId: actorId,
            originActorItemId: itemId,
        });
    }

    static isStubClass(cls) {
        if (!cls)
            return false;
        return cls.name === DataConverterClass.STUB_CLASS.name && cls.source === DataConverterClass.STUB_CLASS.source;
    }

    static isStubSubclass(sc) {
        if (!sc)
            return false;
        return sc.name === DataConverterClass.STUB_SUBCLASS.name && sc.source === DataConverterClass.STUB_SUBCLASS.source;
    }

    static getClassStub() {
        const out = MiscUtil.copy(DataConverterClass.STUB_CLASS);
        out.subclasses = [{
            ...MiscUtil.copy(DataConverterClass.STUB_SUBCLASS),
            className: out.name,
            classSource: out.source,
        }, ];
        return out;
    }

    static getSubclassStub({cls}) {
        const out = MiscUtil.copy(DataConverterClass.STUB_SUBCLASS);
        out.className = cls.name;
        out.classSource = cls.source;
        return out;
    }
}
DataConverterClass.STUB_CLASS = {
    name: "Unknown Class",
    source: Parser.SRC_PHB,
    classFeatures: [],
    _isStub: true,
};
DataConverterClass.STUB_SUBCLASS = {
    name: "Unknown Subclass",
    source: Parser.SRC_PHB,
    subclassFeatures: [],
    _isStub: true,
};

class DataConverterFeature extends DataConverter {
    static async _pGetGenericDescription(ent, configGroup, {fluff=null}={}) {
        if (!Config.get(configGroup, "isImportDescription") && !fluff?.entries?.length)
            return "";

        const pts = [Config.get(configGroup, "isImportDescription") ? await UtilDataConverter.pGetWithDescriptionPlugins(()=>`<div>${Renderer.get().setFirstSection(true).render({
            entries: ent.entries
        }, 2)}</div>`) : null, fluff?.entries?.length ? Renderer.get().setFirstSection(true).render({
            type: "entries",
            entries: fluff?.entries
        }) : "", ].filter(Boolean).join(`<hr class="hr-1">`);

        return pts.length ? `<div>${pts}</div>` : "";
    }

    static _getData_getConsume({ent, actor}) {
        if (!ent?.consumes)
            return {};

        const sheetItem = DataConverter.getConsumedSheetItem({
            consumes: ent.consumes,
            actor
        });
        if (!sheetItem)
            return {};

        return {
            type: "charges",
            amount: ent.consumes.amount ?? 1,
            target: sheetItem.id,
        };
    }

    static async pMutActorUpdateFeature(actor, actorUpdate, ent, dataBuilderOpts) {
        const sideData = await this._SideDataInterface.pGetSideLoaded(ent);
        this.mutActorUpdate(actor, actorUpdate, ent, {
            sideData
        });
    }

    static async pGetDereferencedFeatureItem(feature) {
        return MiscUtil.copy(feature);
    }

    static async pGetClassSubclassFeatureAdditionalEntities(actor, entity, {taskRunner=null}={}) {
        const sideData = await this._SideDataInterface.pGetSideLoaded(entity);
        if (!sideData)
            return [];
        if (!sideData.subEntities)
            return [];

        const {ChooseImporter} = await Promise.resolve().then(function() {
            return ChooseImporter$1;
        });

        for (const prop in sideData.subEntities) {
            if (!sideData.subEntities.hasOwnProperty(prop))
                continue;

            const arr = sideData.subEntities[prop];
            if (!(arr instanceof Array))
                continue;

            const importer = ChooseImporter.getImporter(prop, {
                actor
            });
            await importer.pInit();
            for (const ent of arr) {
                await importer.pImportEntry(ent, {
                    taskRunner,
                }, );
            }
        }
    }
}
class DataConverterClassSubclassFeature extends DataConverterFeature {
    static _configGroup = "importClassSubclassFeature";

    static _SideDataInterface = SideDataInterfaceClassSubclassFeature;
    //TEMPFIX static _ImageFetcher = ImageFetcherClassSubclassFeature;

    static async pGetDereferencedFeatureItem(feature) {
        const type = UtilEntityClassSubclassFeature.getEntityType(feature);
        const hash = UrlUtil.URL_TO_HASH_BUILDER[type](feature);
        return DataLoader.pCacheAndGet(type, feature.source, hash, {
            isCopy: true
        });
    }

    static async pGetInitFeatureLoadeds(feature, {actor=null}={}) {
        const isIgnoredLookup = await this._pGetInitFeatureLoadeds_getIsIgnoredLookup(feature);

        const type = UtilEntityClassSubclassFeature.getEntityType(feature);
        switch (type) {
        case "classFeature":
            {
                const uid = DataUtil.class.packUidClassFeature(feature);
                const asClassFeatureRef = {
                    classFeature: uid
                };
                await PageFilterClassesFoundry.pInitClassFeatureLoadeds({
                    classFeature: asClassFeatureRef,
                    className: feature.className,
                    actor,
                    isIgnoredLookup
                });
                return asClassFeatureRef;
            }
        case "subclassFeature":
            {
                const uid = DataUtil.class.packUidSubclassFeature(feature);
                const asSubclassFeatureRef = {
                    subclassFeature: uid
                };
                const subclassNameLookup = await DataUtil.class.pGetSubclassLookup();
                const subclassName = MiscUtil.get(subclassNameLookup, feature.classSource, feature.className, feature.subclassSource, feature.subclassShortName, "name");
                await PageFilterClassesFoundry.pInitSubclassFeatureLoadeds({
                    subclassFeature: asSubclassFeatureRef,
                    className: feature.className,
                    subclassName: subclassName,
                    actor,
                    isIgnoredLookup
                });
                return asSubclassFeatureRef;
            }
        default:
            throw new Error(`Unhandled feature type "${type}"`);
        }
    }

    static async _pGetInitFeatureLoadeds_getIsIgnoredLookup(feature) {
        if (!feature.entries)
            return {};

        const type = UtilEntityClassSubclassFeature.getEntityType(feature);
        switch (type) {
        case "classFeature":
            {
                return this.pGetClassSubclassFeatureIgnoredLookup({
                    data: {
                        classFeature: [feature]
                    }
                });
            }
        case "subclassFeature":
            {
                return this.pGetClassSubclassFeatureIgnoredLookup({
                    data: {
                        subclassFeature: [feature]
                    }
                });
            }
        default:
            throw new Error(`Unhandled feature type "${type}"`);
        }
    }


    /**
     * Returns an object with boolean properties named after class and subclass features that are marked as ignored
     * @param {{classFeature:any[], subclassFeature:any[]}} data
     * @returns {any}
     */
    static async pGetClassSubclassFeatureIgnoredLookup({data}) {
        if (!data.classFeature?.length && !data.subclassFeature?.length)
            return {};

        const isIgnoredLookup = {};

        const allRefsClassFeature = new Set();
        const allRefsSubclassFeature = new Set();

        (data.classFeature || []).forEach(cf=>{
            const {refsClassFeature, refsSubclassFeature} = Charactermancer_Class_Util.getClassSubclassFeatureReferences(cf.entries);

            refsClassFeature.forEach(ref=>allRefsClassFeature.add((ref.classFeature || "").toLowerCase()));
            refsSubclassFeature.forEach(ref=>allRefsSubclassFeature.add((ref.subclassFeature || "").toLowerCase()));
        });

        (data.subclassFeature || []).forEach(scf=>{
            const {refsClassFeature, refsSubclassFeature} = Charactermancer_Class_Util.getClassSubclassFeatureReferences(scf.entries);

            refsClassFeature.forEach(ref=>allRefsClassFeature.add((ref.classFeature || "").toLowerCase()));
            refsSubclassFeature.forEach(ref=>allRefsSubclassFeature.add((ref.subclassFeature || "").toLowerCase()));
        });

        for (const uid of allRefsClassFeature) {
            if (await this._SideDataInterface.pGetIsIgnoredSideLoaded(DataUtil.class.unpackUidClassFeature(uid))) {
                isIgnoredLookup[uid] = true;
            }
        }

        for (const uid of allRefsSubclassFeature) {
            if (await this._SideDataInterface.pGetIsIgnoredSideLoaded(DataUtil.class.unpackUidSubclassFeature(uid))) {
                isIgnoredLookup[uid] = true;
            }
        }

        return isIgnoredLookup;
    }

    static async pGetDocumentJson(feature, opts) {
        opts = opts || {};
        if (opts.actor)
            opts.isActorItem = true;

        Renderer.get().setFirstSection(true).resetHeaderIndex();

        const out = await this._pGetClassSubclassFeatureItem(feature, opts);

        const additionalData = await this._SideDataInterface.pGetDataSideLoaded(feature);
        Object.assign(out.system, additionalData);

        const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(feature);
        Object.assign(out.flags, additionalFlags);

        this._mutApplyDocOwnership(out, opts);

        return out;
    }

    static _isUnarmoredDefense(feature) {
        const cleanLowerName = (feature.name || "").toLowerCase().trim();
        return /^unarmored defen[sc]e/.test(cleanLowerName);
    }

    static _getUnarmoredDefenseMeta(entity) {
        if (!entity.entries)
            return null;

        const attribs = new Set();

        JSON.stringify(entity.entries).replace(/(strength|dexterity|constitution|intelligence|wisdom|charisma|str|dex|con|int|wis|cha) modifier/gi, (fullMatch,ability)=>{
            ability = ability.slice(0, 3).toLowerCase();
            attribs.add(ability);
        }
        );

        const predefinedKey = CollectionUtil.setEq(DataConverterClassSubclassFeature._UNARMORED_DEFENSE_BARBARIAN, attribs) ? "unarmoredBarb" : CollectionUtil.setEq(DataConverterClassSubclassFeature._UNARMORED_DEFENSE_MONK, attribs) ? "unarmoredMonk" : null;

        return {
            formula: ["10", ...[...attribs].map(ab=>`@abilities.${ab}.mod`)].join(" + "),
            abilities: [...attribs],
            predefinedKey,
        };
    }

    static _getUnarmoredDefenseEffectSideTuples({actor, feature, img}) {
        if (!this._isUnarmoredDefense(feature))
            return [];

        const unarmoredDefenseMeta = this._getUnarmoredDefenseMeta(feature);
        if (!unarmoredDefenseMeta)
            return [];

        if (unarmoredDefenseMeta.predefinedKey) {
            return UtilActiveEffects.getExpandedEffects([{
                name: "Unarmored Defense",
                changes: [{
                    key: "system.attributes.ac.calc",
                    mode: "OVERRIDE",
                    value: unarmoredDefenseMeta.predefinedKey,
                }, ],
                transfer: true,
            }, ], {
                actor,
                img,
                parentName: feature.name,
            }, {
                isTuples: true,
            }, );
        }

        return UtilActiveEffects.getExpandedEffects([{
            name: "Unarmored Defense",
            changes: [{
                key: "system.attributes.ac.calc",
                mode: "OVERRIDE",
                value: "custom",
            }, ],
            transfer: true,
        }, {
            name: "Unarmored Defense",
            changes: [{
                key: "system.attributes.ac.formula",
                mode: "UPGRADE",
                value: unarmoredDefenseMeta.formula,
            }, ],
            transfer: true,
        }, ], {
            actor,
            img,
            parentName: feature.name,
        }, {
            isTuples: true,
        }, );
    }

    static async _pGetClassSubclassFeatureItem(feature, opts) {
        opts = opts || {};

        let {type=null, actor} = opts;
        type = type || UtilEntityClassSubclassFeature.getEntityType(feature);

        let pOut;
        if (await this._pIsInSrd(feature, type, opts)) {
            pOut = this._pGetClassSubclassFeatureItem_fromSrd(feature, type, actor, opts);
        } else {
            pOut = this._pGetClassSubclassFeatureItem_other(feature, type, actor, opts);
        }
        return pOut;
    }

    static async _pIsInSrd(feature, type, {taskRunner=null}={}) {
        const srdData = await UtilCompendium.getSrdCompendiumEntity(type, feature, {
            fnGetAliases: UtilEntityClassSubclassFeature.getCompendiumAliases.bind(UtilEntityClassSubclassFeature),
            taskRunner
        });
        return !!srdData;
    }

    static async _pGetClassSubclassFeatureItem_fromSrd(feature, type, actor, opts={}) {
        const srdData = await UtilCompendium.getSrdCompendiumEntity(type, feature, {
            fnGetAliases: UtilEntityClassSubclassFeature.getCompendiumAliases.bind(UtilEntityClassSubclassFeature),
            taskRunner: opts.taskRunner
        });

        const {name: translatedName, description: translatedDescription, flags: translatedFlags} = this._getTranslationMeta({
            translationData: this._getTranslationData({
                srdData
            }),
            name: UtilApplications.getCleanEntityName(UtilDataConverter.getNameWithSourcePart(feature, {
                isActorItem: actor != null
            })),
            description: await this.pGetEntryDescription(feature),
        });

        //TEMPFIX
        const img = null;/* await this._ImageFetcher.pGetSaveImagePath(feature, {
            propCompendium: type,
            taskRunner: opts.taskRunner
        }); */

        const dataConsume = this._getData_getConsume({
            ent: feature,
            actor: opts.actor
        });

        const srdEffects = await this._SideDataInterface.pIsIgnoreSrdEffectsSideLoaded(feature) ? [] : MiscUtil.copy(srdData.effects || []);
        DataConverter.mutEffectsDisabledTransfer(srdEffects, "importClassSubclassFeature");

        const effectsSideTuples = UtilActiveEffects.getExpandedEffects(feature.effectsRaw, {
            actor,
            img,
            parentName: feature.name
        }, {
            isTuples: true
        });
        effectsSideTuples.push(...this._getUnarmoredDefenseEffectSideTuples({
            actor,
            feature,
            img
        }));
        effectsSideTuples.forEach(({effect, effectRaw})=>DataConverter.mutEffectDisabledTransfer(effect, "importClassSubclassFeature", UtilActiveEffects.getDisabledTransferHintsSideData(effectRaw)));

        return {
            name: translatedName,
            type: srdData.type,
            system: {
                ...srdData.system,

                source: UtilDocumentSource.getSourceObjectFromEntity(feature),
                description: {
                    value: translatedDescription,
                    chat: "",
                    unidentified: ""
                },
                consume: dataConsume,

                ...(feature.foundryAdditionalSystem || {}),
            },
            ownership: {
                default: 0
            },
            effects: DataConverter.getEffectsMutDedupeId([...srdEffects, ...effectsSideTuples.map(it=>it.effect), ]),
            flags: {
                ...translatedFlags,
                ...this._getClassSubclassFeatureFlags(feature, type, opts),
                ...(feature.foundryAdditionalFlags || {}),
            },
            img,
        };
    }

    static _getClassSubclassFeatureFlags(feature, type, opts) {
        opts = opts || {};

        const prop = UtilEntityClassSubclassFeature.getEntityType(feature);

        const out = {
            [SharedConsts.MODULE_ID]: {
                page: prop,
                source: feature.source,
                hash: UrlUtil.URL_TO_HASH_BUILDER[prop](feature),
            },
        };

        if (opts.isAddDataFlags) {
            out[SharedConsts.MODULE_ID].propDroppable = prop;
            out[SharedConsts.MODULE_ID].filterValues = opts.filterValues;
        }

        return out;
    }

    static async _pGetClassSubclassFeatureItem_other(feature, type, actor, opts) {
        const dataConsume = this._getData_getConsume({
            ent: feature,
            actor: opts.actor
        });

        //TEMPFIX
        const img = null;/* await this._ImageFetcher.pGetSaveImagePath(feature, {
            propCompendium: type,
            taskRunner: opts.taskRunner
        }); */

        const effectsSideTuples = UtilActiveEffects.getExpandedEffects(feature.effectsRaw, {
            actor,
            img,
            parentName: feature.name
        }, {
            isTuples: true
        });
        effectsSideTuples.push(...this._getUnarmoredDefenseEffectSideTuples({
            actor,
            feature,
            img
        }));
        effectsSideTuples.forEach(({effect, effectRaw})=>DataConverter.mutEffectDisabledTransfer(effect, "importClassSubclassFeature", UtilActiveEffects.getDisabledTransferHintsSideData(effectRaw)));

        return this._pGetItemActorPassive(feature, {
            isActorItem: opts.isActorItem,
            mode: "player",
            modeOptions: {
                isChannelDivinity: feature.className === "Cleric" && feature.name.toLowerCase().startsWith("channel divinity:"),
            },
            renderDepth: 0,
            fvttType: "feat",
            typeType: "class",
            img,
            fvttSource: UtilDocumentSource.getSourceObjectFromEntity(feature),
            requirements: [feature.className, feature.level, feature.subclassShortName ? `(${feature.subclassShortName})` : ""].filter(Boolean).join(" "),
            additionalData: feature.foundryAdditionalSystem,
            foundryFlags: this._getClassSubclassFeatureFlags(feature, type, opts),
            additionalFlags: feature.foundryAdditionalFlags,
            effects: DataConverter.getEffectsMutDedupeId(effectsSideTuples.map(it=>it.effect)),
            actor,
            consumeType: dataConsume.type,
            consumeTarget: dataConsume.target,
            consumeAmount: dataConsume.amount,
        }, );
    }
}

DataConverterClassSubclassFeature._UNARMORED_DEFENSE_BARBARIAN = new Set(["dex", "con"]);
DataConverterClassSubclassFeature._UNARMORED_DEFENSE_MONK = new Set(["dex", "wis"]);

class DataConverterFeat extends DataConverterFeature {
    static _configGroup = "importFeat";

    static _SideDataInterface = SideDataInterfaceFeat;
    //TEMPFIX static _ImageFetcher = ImageFetcherFeat;

    static async pGetDereferencedFeatureItem(feature) {
        if (feature.entries)
            return MiscUtil.copy(feature);

        const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_FEATS](feature);
        return DataLoader.pCacheAndGet(UrlUtil.PG_FEATS, feature.source, hash, {
            isCopy: true
        });
    }

    static async pGetInitFeatureLoadeds(feature, {actor=null}={}) {
        const uid = DataUtil.proxy.getUid("feat", feature, {
            isMaintainCase: true
        });
        const asFeatRef = {
            feat: uid
        };
        await PageFilterClassesFoundry.pInitFeatLoadeds({
            feat: asFeatRef,
            raw: feature,
            actor
        });
        return asFeatRef;
    }

    static async pGetDocumentJson(feat, opts) {
        opts = opts || {};
        if (opts.actor)
            opts.isActorItem = true;

        Renderer.get().setFirstSection(true).resetHeaderIndex();

        const fluff = opts.fluff || await Renderer.feat.pGetFluff(feat);

        const cpyFeat = Charactermancer_Feature_Util.getCleanedFeature_tmpOptionalfeatureList(feat);

        const content = await UtilDataConverter.pGetWithDescriptionPlugins(()=>{
            const fluffRender = fluff?.entries?.length ? Renderer.get().setFirstSection(true).render({
                type: "entries",
                entries: fluff?.entries
            }) : "";

            const ptCategoryPrerequisite = Renderer.feat.getJoinedCategoryPrerequisites(cpyFeat.category, Renderer.utils.prerequisite.getHtml(cpyFeat.prerequisite), );
            const ptRepeatable = Renderer.utils.getRepeatableHtml(cpyFeat);

            Renderer.feat.initFullEntries(cpyFeat);
            const statsRender = `<div>
				${ptCategoryPrerequisite ? `<p>${ptCategoryPrerequisite}</p>` : ""}
				${ptRepeatable ? `<p>${ptRepeatable}</p>` : ""}
				${Renderer.get().setFirstSection(true).render({
                entries: cpyFeat._fullEntries || cpyFeat.entries
            }, 2)}
			</div>`;

            return `<div>${[fluffRender, statsRender].join("<hr>")}</div>`;
        }
        );

        //TEMPFIX
        /* const img = await this._ImageFetcher.pGetSaveImagePath(cpyFeat, {
            propCompendium: "feat",
            fluff,
            taskRunner: opts.taskRunner
        }); */

        const additionalData = await this._SideDataInterface.pGetDataSideLoaded(cpyFeat);
        const additionalFlags = await this._SideDataInterface.pGetFlagsSideLoaded(cpyFeat);

        const effectsSideTuples = await this._SideDataInterface.pGetEffectsSideLoadedTuples({
            ent: cpyFeat,
            img,
            actor: opts.actor
        });
        effectsSideTuples.forEach(({effect, effectRaw})=>DataConverter.mutEffectDisabledTransfer(effect, "importFeat", UtilActiveEffects.getDisabledTransferHintsSideData(effectRaw)));

        const out = this._pGetItemActorPassive(feat, {
            isActorItem: opts.isActorItem,
            mode: "player",
            img,
            fvttType: "feat",
            typeType: "feat",
            source: feat.source,
            actor: opts.actor,
            description: content,
            isSkipDescription: !Config.get(this._configGroup, "isImportDescription"),
            requirements: Renderer.utils.prerequisite.getHtml(cpyFeat.prerequisite, {
                isTextOnly: true,
                isSkipPrefix: true
            }),
            additionalData: additionalData,
            additionalFlags: additionalFlags,
            foundryFlags: this._getFeatFlags(cpyFeat, opts),
            effects: DataConverter.getEffectsMutDedupeId(effectsSideTuples.map(it=>it.effect)),
        }, );

        this._mutApplyDocOwnership(out, opts);

        return out;
    }

    static _getFeatFlags(feat, opts) {
        opts = opts || {};

        const out = {
            [SharedConsts.MODULE_ID]: {
                page: UrlUtil.PG_FEATS,
                source: feat.source,
                hash: UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_FEATS](feat),
            },
        };

        if (opts.isAddDataFlags) {
            out[SharedConsts.MODULE_ID].propDroppable = "feat";
            out[SharedConsts.MODULE_ID].filterValues = opts.filterValues;
        }

        return out;
    }
}


//#endregion
//#region Util
class Util {
    static _getLogTag() {
        return [`%cPlutonium`, `color: #337ab7; font-weight: bold;`, `|`, ];
    }

    static isDebug() {
        return !!CONFIG?.debug?.module?.[SharedConsts.MODULE_ID];
    }

    static _HEIGHT_MAX_OFFSET = 160;
    static getMaxWindowHeight(desiredHeight) {
        const targetHeight = Math.min(desiredHeight || Number.MAX_SAFE_INTEGER, document.documentElement.clientHeight - this._HEIGHT_MAX_OFFSET);
        return Math.max(this._HEIGHT_MAX_OFFSET, targetHeight);
    }

    static _WIDTH_MAX_OFFSET = 250;
    static getMaxWindowWidth(desiredWidth) {
        const targetWidth = Math.min(desiredWidth || Number.MAX_SAFE_INTEGER, document.documentElement.clientWidth - this._WIDTH_MAX_OFFSET);
        return Math.max(this._WIDTH_MAX_OFFSET, targetWidth);
    }

    static getWithoutParens(str) {
        return str.replace(/\([^)]+\)/g, "").trim();
    }
    static getTokens(str) {
        return str.split(/([ ,:;()"])/g).filter(Boolean);
    }
    static isPunctuation(token) {
        return /[,:;()"]/.test(token);
    }
    static isCapsFirst(word) {
        return /^[A-Z]/.test(word);
    }
    static getSentences(str) {
        return str.replace(/ +/g, " ").split(/[.?!]/g).map(it=>it.trim()).filter(Boolean);
    }

    static getRounded(n, dp) {
        return Number(n.toFixed(dp));
    }

    static trimObject(obj) {
        const walker = MiscUtil.getWalker({
            isAllowDeleteObjects: true,
            isDepthFirst: true,
        });

        return walker.walk(obj, {
            object: (it)=>{
                Object.entries(it).forEach(([k,v])=>{
                    if (v === undefined)
                        delete it[k];
                }
                );
                if (!Object.keys(it).length)
                    return undefined;
                return it;
            }
            ,
        }, );
    }

    static getCleanServerUrl(url) {
        return url.replace(/^(.*?)\/*$/, "$1/");
    }
}

const LGT = Util._getLogTag();
Util.Fvtt = class {
    static getOwnershipEnum({isIncludeDefault=false}={}) {
        return [isIncludeDefault ? {
            value: -1,
            name: "Default"
        } : null, ...Object.entries(CONST.DOCUMENT_OWNERSHIP_LEVELS).map(([name,value])=>({
            value,
            name: name.toTitleCase(),
        })), ].filter(Boolean);
    }

    static getMinimumRolesEnum() {
        return [...Object.entries(CONST.USER_ROLES).map(([name,value])=>({
            value,
            name: name.toTitleCase(),
        })), {
            value: CONST.USER_ROLES.GAMEMASTER + 1,
            name: `Cheater (Disable Feature)`,
        }, ];
    }

    static canUserCreateFolders() {
        return game.user.isGM;
    }
}
;
//#endregion
//#region UtilCompat
class UtilCompat {
    static isModuleActive(moduleId) {
        //TEMPFIX
        return false;
        //return !!game.modules.get(moduleId)?.active;
    }

    static _MODULE_LIB_WRAPPER = "lib-wrapper";
    static MODULE_DAE = "dae";
    static _MODULE_DRAG_UPLOAD = "dragupload";
    static MODULE_MIDI_QOL = "midi-qol";
    static MODULE_KANKA_FOUNDRY = "kanka-foundry";
    static MODULE_SMOL_FOUNDRY = "smol-foundry";
    static MODULE_PERMISSION_VIEWER = "permission_viewer";
    static _MODULE_TWILIGHT_UI = "twilight-ui";
    static MODULE_TIDY5E_SHEET = "tidy5e-sheet";
    static _MODULE_OBSIDIAN = "obsidian";
    static MODULE_BABELE = "babele";
    static MODULE_MONKS_LITTLE_DETAILS = "monks-little-details";
    static MODULE_MONKS_BLOODSPLATS = "monks-bloodsplats";
    static MODULE_MONKS_ENHANCED_JOURNAL = "monks-enhanced-journal";
    static MODULE_BETTER_ROLLTABLES = "better-rolltables";
    static _MODULE_BETTER_ROLLTABLES = "item-piles";
    static MODULE_PLUTONIUM_ADDON_AUTOMATION = "plutonium-addon-automation";
    static MODULE_LEVELS = "levels";
    static MODULE_MULTICLASS_SPELLBOOK_FILTER = "spell-class-filter-for-5e";
    static MODULE_ROLLDATA_AWARE_ACTIVE_EFFECTS = "fvtt-rolldata-aware-active-effects";
    static MODULE_QUICK_INSERT = "quick-insert";
    static MODULE_PF2E_TOKENS_BESTIARIES = "pf2e-tokens-bestiaries";
    static _MODULE_DFREDS_CONVENIENT_EFFECTS = "dfreds-convenient-effects";
    static MODULE_LEVELS_3D_PREVIEW = "levels-3d-preview";
    static _MODULE_CANVAS_3D_COMPENDIUM = "canvas3dcompendium";
    static _MODULE_CANVAS_3D_TOKEN_COMPENDIUM = "canvas3dtokencompendium";
    static _MODULE_FOUNDRY_SUMMONS = "foundry-summons";
    static _MODULE_TOKEN_ACTION_HUD = "token-action-hud";
    static _MODULE_TOKEN_ACTION_HUD_CORE = "token-action-hud-core";
    static MODULE_SIMPLE_CALENDAR = "foundryvtt-simple-calendar";

    static isLibWrapperActive() {
        return this.isModuleActive(UtilCompat._MODULE_LIB_WRAPPER);
    }
    static isDaeActive() {
        return this.isModuleActive(UtilCompat.MODULE_DAE);
    }
    static isDragUploadActive() {
        return this.isModuleActive(UtilCompat._MODULE_DRAG_UPLOAD);
    }
    static isPermissionViewerActive() {
        return this.isModuleActive(UtilCompat.MODULE_PERMISSION_VIEWER);
    }
    static isSmolFoundryActive() {
        return this.isModuleActive(UtilCompat.MODULE_SMOL_FOUNDRY);
    }
    static isTwilightUiActive() {
        return this.isModuleActive(UtilCompat._MODULE_TWILIGHT_UI);
    }
    static isTidy5eSheetActive() {
        return this.isModuleActive(UtilCompat.MODULE_TIDY5E_SHEET);
    }
    static isObsidianActive() {
        return this.isModuleActive(UtilCompat._MODULE_OBSIDIAN);
    }
    static isBabeleActive() {
        return this.isModuleActive(UtilCompat.MODULE_BABELE);
    }
    static isMonksLittleDetailsActive() {
        return this.isModuleActive(UtilCompat.MODULE_MONKS_LITTLE_DETAILS);
    }
    static isMonksBloodsplatsActive() {
        return this.isModuleActive(UtilCompat.MODULE_MONKS_BLOODSPLATS);
    }
    static isBetterRolltablesActive() {
        return this.isModuleActive(UtilCompat.MODULE_BETTER_ROLLTABLES);
    }
    static isItemPilesActive() {
        return this.isModuleActive(UtilCompat._MODULE_BETTER_ROLLTABLES);
    }
    static isPlutoniumAddonAutomationActive() {
        return this.isModuleActive(UtilCompat.MODULE_PLUTONIUM_ADDON_AUTOMATION);
    }
    static isMidiQolActive() {
        return this.isModuleActive(UtilCompat.MODULE_MIDI_QOL);
    }
    static isModuleMulticlassSpellbookFilterActive() {
        return this.isModuleActive(UtilCompat.MODULE_MULTICLASS_SPELLBOOK_FILTER);
    }
    static isQuickInsertActive() {
        return this.isModuleActive(UtilCompat.MODULE_QUICK_INSERT);
    }
    static isPf2eTokensBestiaryActive() {
        return this.isModuleActive(UtilCompat.MODULE_PF2E_TOKENS_BESTIARIES);
    }
    static isDfredsConvenientEffectsActive() {
        return this.isModuleActive(UtilCompat._MODULE_DFREDS_CONVENIENT_EFFECTS);
    }
    static isLevels3dPreviewActive() {
        return this.isModuleActive(UtilCompat.MODULE_LEVELS_3D_PREVIEW);
    }
    static _isCanvas3dCompendiumActive() {
        return this.isModuleActive(UtilCompat._MODULE_CANVAS_3D_COMPENDIUM);
    }
    static _iCanvas3dTokenCompendiumActive() {
        return this.isModuleActive(UtilCompat._MODULE_CANVAS_3D_TOKEN_COMPENDIUM);
    }
    static isFoundrySummonsActive() {
        return this.isModuleActive(UtilCompat._MODULE_FOUNDRY_SUMMONS);
    }
    static isTokenActionHudActive() {
        return this.isModuleActive(UtilCompat._MODULE_TOKEN_ACTION_HUD) || this.isModuleActive(UtilCompat._MODULE_TOKEN_ACTION_HUD_CORE);
    }
    static isSimpleCalendarActive() {
        return this.isModuleActive(UtilCompat.MODULE_SIMPLE_CALENDAR);
    }

    static isThreeDiTokensActive() {
        return this.isLevels3dPreviewActive() && this._isCanvas3dCompendiumActive() && this._iCanvas3dTokenCompendiumActive();
    }

    static getApi(moduleName) {
        if (!this.isModuleActive(moduleName))
            return null;
        return game.modules.get(moduleName).api;
    }

    static getName(moduleName) {
        if (!this.isModuleActive(moduleName))
            return null;
        return game.modules.get(moduleName).title;
    }

    static isDaeGeneratingArmorEffects() {
        if (!this.isDaeActive())
            return false;
        return !!UtilGameSettings.getSafe(UtilCompat.MODULE_DAE, "calculateArmor");
    }

    static getFeatureFlags({isReaction}) {
        const out = {};

        if (isReaction) {
            out.adnd5e = {
                itemInfo: {
                    type: "reaction"
                }
            };
        }

        return out;
    }

    static MonksLittleDetails = class {
        static isDefeated(token) {
            return ((token.combatant && token.isDefeated) || token.actor?.effects.some(it=>it.statuses.has(CONFIG.specialStatusEffects.DEFEATED)) || token.document.overlayEffect === CONFIG.controlIcons.defeated);
        }
    }
    ;

    static DfredsConvenientEffects = class {
        static getCustomEffectsItemId() {
            return UtilGameSettings.getSafe(UtilCompat._MODULE_DFREDS_CONVENIENT_EFFECTS, "customEffectsItemId");
        }
    }
    ;

    static FoundrySummons = class {
        static getBlankNpcIds() {
            return (UtilGameSettings.getSafe(UtilCompat._MODULE_FOUNDRY_SUMMONS, "blankNPC") || []).map(it=>it?.id).filter(Boolean);
        }
    }
    ;
}
//#endregion

//#region UtilHooks
class UtilHooks {
    static callAll(name, val) {
        Hooks.callAll(this._getHookName(name), val);
    }

    static call(name, val) {
        Hooks.callAll(this._getHookName(name), val);
    }

    static on(name, fn) {
        Hooks.on(this._getHookName(name), fn);
    }

    static off(name, fn) {
        Hooks.off(this._getHookName(name), fn);
    }

    static _getHookName(name) {
        return `${SharedConsts.MODULE_ID_FAKE}.${name}`;
    }
}
UtilHooks.HK_CONFIG_UPDATE = "configUpdate";
UtilHooks.HK_IMPORT_COMPLETE = "importComplete";
//#endregion

//#region CryptUtil
globalThis.CryptUtil = {
    _md5cycle: (x,k)=>{
        let a = x[0];
        let b = x[1];
        let c = x[2];
        let d = x[3];

        a = CryptUtil._ff(a, b, c, d, k[0], 7, -680876936);
        d = CryptUtil._ff(d, a, b, c, k[1], 12, -389564586);
        c = CryptUtil._ff(c, d, a, b, k[2], 17, 606105819);
        b = CryptUtil._ff(b, c, d, a, k[3], 22, -1044525330);
        a = CryptUtil._ff(a, b, c, d, k[4], 7, -176418897);
        d = CryptUtil._ff(d, a, b, c, k[5], 12, 1200080426);
        c = CryptUtil._ff(c, d, a, b, k[6], 17, -1473231341);
        b = CryptUtil._ff(b, c, d, a, k[7], 22, -45705983);
        a = CryptUtil._ff(a, b, c, d, k[8], 7, 1770035416);
        d = CryptUtil._ff(d, a, b, c, k[9], 12, -1958414417);
        c = CryptUtil._ff(c, d, a, b, k[10], 17, -42063);
        b = CryptUtil._ff(b, c, d, a, k[11], 22, -1990404162);
        a = CryptUtil._ff(a, b, c, d, k[12], 7, 1804603682);
        d = CryptUtil._ff(d, a, b, c, k[13], 12, -40341101);
        c = CryptUtil._ff(c, d, a, b, k[14], 17, -1502002290);
        b = CryptUtil._ff(b, c, d, a, k[15], 22, 1236535329);

        a = CryptUtil._gg(a, b, c, d, k[1], 5, -165796510);
        d = CryptUtil._gg(d, a, b, c, k[6], 9, -1069501632);
        c = CryptUtil._gg(c, d, a, b, k[11], 14, 643717713);
        b = CryptUtil._gg(b, c, d, a, k[0], 20, -373897302);
        a = CryptUtil._gg(a, b, c, d, k[5], 5, -701558691);
        d = CryptUtil._gg(d, a, b, c, k[10], 9, 38016083);
        c = CryptUtil._gg(c, d, a, b, k[15], 14, -660478335);
        b = CryptUtil._gg(b, c, d, a, k[4], 20, -405537848);
        a = CryptUtil._gg(a, b, c, d, k[9], 5, 568446438);
        d = CryptUtil._gg(d, a, b, c, k[14], 9, -1019803690);
        c = CryptUtil._gg(c, d, a, b, k[3], 14, -187363961);
        b = CryptUtil._gg(b, c, d, a, k[8], 20, 1163531501);
        a = CryptUtil._gg(a, b, c, d, k[13], 5, -1444681467);
        d = CryptUtil._gg(d, a, b, c, k[2], 9, -51403784);
        c = CryptUtil._gg(c, d, a, b, k[7], 14, 1735328473);
        b = CryptUtil._gg(b, c, d, a, k[12], 20, -1926607734);

        a = CryptUtil._hh(a, b, c, d, k[5], 4, -378558);
        d = CryptUtil._hh(d, a, b, c, k[8], 11, -2022574463);
        c = CryptUtil._hh(c, d, a, b, k[11], 16, 1839030562);
        b = CryptUtil._hh(b, c, d, a, k[14], 23, -35309556);
        a = CryptUtil._hh(a, b, c, d, k[1], 4, -1530992060);
        d = CryptUtil._hh(d, a, b, c, k[4], 11, 1272893353);
        c = CryptUtil._hh(c, d, a, b, k[7], 16, -155497632);
        b = CryptUtil._hh(b, c, d, a, k[10], 23, -1094730640);
        a = CryptUtil._hh(a, b, c, d, k[13], 4, 681279174);
        d = CryptUtil._hh(d, a, b, c, k[0], 11, -358537222);
        c = CryptUtil._hh(c, d, a, b, k[3], 16, -722521979);
        b = CryptUtil._hh(b, c, d, a, k[6], 23, 76029189);
        a = CryptUtil._hh(a, b, c, d, k[9], 4, -640364487);
        d = CryptUtil._hh(d, a, b, c, k[12], 11, -421815835);
        c = CryptUtil._hh(c, d, a, b, k[15], 16, 530742520);
        b = CryptUtil._hh(b, c, d, a, k[2], 23, -995338651);

        a = CryptUtil._ii(a, b, c, d, k[0], 6, -198630844);
        d = CryptUtil._ii(d, a, b, c, k[7], 10, 1126891415);
        c = CryptUtil._ii(c, d, a, b, k[14], 15, -1416354905);
        b = CryptUtil._ii(b, c, d, a, k[5], 21, -57434055);
        a = CryptUtil._ii(a, b, c, d, k[12], 6, 1700485571);
        d = CryptUtil._ii(d, a, b, c, k[3], 10, -1894986606);
        c = CryptUtil._ii(c, d, a, b, k[10], 15, -1051523);
        b = CryptUtil._ii(b, c, d, a, k[1], 21, -2054922799);
        a = CryptUtil._ii(a, b, c, d, k[8], 6, 1873313359);
        d = CryptUtil._ii(d, a, b, c, k[15], 10, -30611744);
        c = CryptUtil._ii(c, d, a, b, k[6], 15, -1560198380);
        b = CryptUtil._ii(b, c, d, a, k[13], 21, 1309151649);
        a = CryptUtil._ii(a, b, c, d, k[4], 6, -145523070);
        d = CryptUtil._ii(d, a, b, c, k[11], 10, -1120210379);
        c = CryptUtil._ii(c, d, a, b, k[2], 15, 718787259);
        b = CryptUtil._ii(b, c, d, a, k[9], 21, -343485551);

        x[0] = CryptUtil._add32(a, x[0]);
        x[1] = CryptUtil._add32(b, x[1]);
        x[2] = CryptUtil._add32(c, x[2]);
        x[3] = CryptUtil._add32(d, x[3]);
    }
    ,

    _cmn: (q,a,b,x,s,t)=>{
        a = CryptUtil._add32(CryptUtil._add32(a, q), CryptUtil._add32(x, t));
        return CryptUtil._add32((a << s) | (a >>> (32 - s)), b);
    }
    ,

    _ff: (a,b,c,d,x,s,t)=>{
        return CryptUtil._cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }
    ,

    _gg: (a,b,c,d,x,s,t)=>{
        return CryptUtil._cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }
    ,

    _hh: (a,b,c,d,x,s,t)=>{
        return CryptUtil._cmn(b ^ c ^ d, a, b, x, s, t);
    }
    ,

    _ii: (a,b,c,d,x,s,t)=>{
        return CryptUtil._cmn(c ^ (b | (~d)), a, b, x, s, t);
    }
    ,

    _md51: (s)=>{
        let n = s.length;
        let state = [1732584193, -271733879, -1732584194, 271733878];
        let i;
        for (i = 64; i <= s.length; i += 64) {
            CryptUtil._md5cycle(state, CryptUtil._md5blk(s.substring(i - 64, i)));
        }
        s = s.substring(i - 64);
        let tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < s.length; i++)
            tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            CryptUtil._md5cycle(state, tail);
            for (i = 0; i < 16; i++)
                tail[i] = 0;
        }
        tail[14] = n * 8;
        CryptUtil._md5cycle(state, tail);
        return state;
    }
    ,

    _md5blk: (s)=>{
        let md5blks = [];
        for (let i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
        }
        return md5blks;
    }
    ,

    _hex_chr: "0123456789abcdef".split(""),

    _rhex: (n)=>{
        let s = "";
        for (let j = 0; j < 4; j++) {
            s += CryptUtil._hex_chr[(n >> (j * 8 + 4)) & 0x0F] + CryptUtil._hex_chr[(n >> (j * 8)) & 0x0F];
        }
        return s;
    }
    ,

    _add32: (a,b)=>{
        return (a + b) & 0xFFFFFFFF;
    }
    ,

    hex: (x)=>{
        for (let i = 0; i < x.length; i++) {
            x[i] = CryptUtil._rhex(x[i]);
        }
        return x.join("");
    }
    ,

    hex2Dec(hex) {
        return parseInt(`0x${hex}`);
    },

    md5: (s)=>{
        return CryptUtil.hex(CryptUtil._md51(s));
    }
    ,

    hashCode(obj) {
        if (typeof obj === "string") {
            if (!obj)
                return 0;
            let h = 0;
            for (let i = 0; i < obj.length; ++i)
                h = 31 * h + obj.charCodeAt(i);
            return h;
        } else if (typeof obj === "number")
            return obj;
        else
            throw new Error(`No hashCode implementation for ${obj}`);
    },

    uid() {
        if (RollerUtil.isCrypto()) {
            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c=>(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
        } else {
            let d = Date.now();
            if (typeof performance !== "undefined" && typeof performance.now === "function") {
                d += performance.now();
            }
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
                const r = (d + Math.random() * 16) % 16 | 0;
                d = Math.floor(d / 16);
                return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
            });
        }
    },
};
//#endregion

//#region CurrencyUtil
globalThis.CurrencyUtil = class {
    static doSimplifyCoins(obj, opts) {
        opts = opts || {};

        const conversionTable = opts.currencyConversionTable || Parser.getCurrencyConversionTable(opts.currencyConversionId);
        if (!conversionTable.length)
            return obj;

        const normalized = conversionTable.map(it=>{
            return {
                ...it,
                normalizedMult: 1 / it.mult,
            };
        }
        ).sort((a,b)=>SortUtil.ascSort(a.normalizedMult, b.normalizedMult));

        for (let i = 0; i < normalized.length - 1; ++i) {
            const coinCur = normalized[i].coin;
            const coinNxt = normalized[i + 1].coin;
            const coinRatio = normalized[i + 1].normalizedMult / normalized[i].normalizedMult;

            if (obj[coinCur] && Math.abs(obj[coinCur]) >= coinRatio) {
                const nxtVal = obj[coinCur] >= 0 ? Math.floor(obj[coinCur] / coinRatio) : Math.ceil(obj[coinCur] / coinRatio);
                obj[coinCur] = obj[coinCur] % coinRatio;
                obj[coinNxt] = (obj[coinNxt] || 0) + nxtVal;
            }
        }

        if (opts.originalCurrency) {
            const normalizedHighToLow = MiscUtil.copyFast(normalized).reverse();

            normalizedHighToLow.forEach((coinMeta,i)=>{
                const valOld = opts.originalCurrency[coinMeta.coin] || 0;
                const valNew = obj[coinMeta.coin] || 0;

                const prevCoinMeta = normalizedHighToLow[i - 1];
                const nxtCoinMeta = normalizedHighToLow[i + 1];

                if (!prevCoinMeta) {
                    if (nxtCoinMeta) {
                        const diff = valNew - valOld;
                        if (diff > 0) {
                            obj[coinMeta.coin] = valOld;
                            const coinRatio = coinMeta.normalizedMult / nxtCoinMeta.normalizedMult;
                            obj[nxtCoinMeta.coin] = (obj[nxtCoinMeta.coin] || 0) + (diff * coinRatio);
                        }
                    }
                } else {
                    if (nxtCoinMeta) {
                        const diffPrevCoin = (opts.originalCurrency[prevCoinMeta.coin] || 0) - (obj[prevCoinMeta.coin] || 0);
                        const coinRatio = prevCoinMeta.normalizedMult / coinMeta.normalizedMult;
                        const capFromOld = valOld + (diffPrevCoin > 0 ? diffPrevCoin * coinRatio : 0);
                        const diff = valNew - capFromOld;
                        if (diff > 0) {
                            obj[coinMeta.coin] = capFromOld;
                            const coinRatio = coinMeta.normalizedMult / nxtCoinMeta.normalizedMult;
                            obj[nxtCoinMeta.coin] = (obj[nxtCoinMeta.coin] || 0) + (diff * coinRatio);
                        }
                    }
                }
            }
            );
        }

        normalized.filter(coinMeta=>obj[coinMeta.coin] === 0 || obj[coinMeta.coin] == null).forEach(coinMeta=>{
            obj[coinMeta.coin] = null;
            delete obj[coinMeta.coin];
        }
        );

        if (opts.isPopulateAllValues)
            normalized.forEach(coinMeta=>obj[coinMeta.coin] = obj[coinMeta.coin] || 0);

        return obj;
    }

    static getAsCopper(obj) {
        return Parser.FULL_CURRENCY_CONVERSION_TABLE.map(currencyMeta=>(obj[currencyMeta.coin] || 0) * (1 / currencyMeta.mult)).reduce((a,b)=>a + b, 0);
    }

    static getAsSingleCurrency(obj) {
        const simplified = CurrencyUtil.doSimplifyCoins({
            ...obj
        });

        if (Object.keys(simplified).length === 1)
            return simplified;

        const out = {};

        const targetDemonination = Parser.FULL_CURRENCY_CONVERSION_TABLE.find(it=>simplified[it.coin]);

        out[targetDemonination.coin] = simplified[targetDemonination.coin];
        delete simplified[targetDemonination.coin];

        Object.entries(simplified).forEach(([coin,amt])=>{
            const denom = Parser.FULL_CURRENCY_CONVERSION_TABLE.find(it=>it.coin === coin);
            out[targetDemonination.coin] = (out[targetDemonination.coin] || 0) + (amt / denom.mult) * targetDemonination.mult;
        }
        );

        return out;
    }

    static getCombinedCurrency(currencyA, currencyB) {
        const out = {};

        [currencyA, currencyB].forEach(currency=>{
            Object.entries(currency).forEach(([coin,cnt])=>{
                if (cnt == null)
                    return;
                if (isNaN(cnt))
                    throw new Error(`Unexpected non-numerical value "${JSON.stringify(cnt)}" for currency key "${coin}"`);

                out[coin] = (out[coin] || 0) + cnt;
            }
            );
        }
        );

        return out;
    }
};
//#endregion

//#region UtilWorldDataSourceSelector
class UtilWorldDataSourceSelector {
    static _SETTINGS_KEY = "data-source-selection";
    static async pInit() {
        
        await game.settings.register(SharedConsts.MODULE_ID, this._SETTINGS_KEY, {
            name: "World Data Source Selection",
            default: {},
            type: Object,
            scope: "world",
            onChange: data=>{}
            ,
        }, );
    }

    static async pSaveState(saveableState) {
       await game.settings.set(SharedConsts.MODULE_ID, this._SETTINGS_KEY, saveableState);
        ui.notifications.info(`Saved! Note that you (and connected players) may need to reload for any changes to take effect.`);
    }

    static loadState() {
        return UtilGameSettings.getSafe(SharedConsts.MODULE_ID, this._SETTINGS_KEY);
    }

    static isSourceSelectionActive() {
        if(!SETTINGS.USE_FVTT){return true;}
        return (!game.user.isGM && Config.get("dataSources", "isPlayerEnableSourceSelection")) || (game.user.isGM && Config.get("dataSources", "isGmEnableSourceSelection"));
    }

    static isFiltered(dataSource) {
        if (!this.isSourceSelectionActive())
            return false;

        const savedState = this.loadState();
        if (savedState == null)
            return false;

        return !savedState.state?.[dataSource.identifierWorld];
    }
}
//#endregion

//#region InputUIUtil
class InputUiUtil {
    static async _pGetShowModal(getShowModalOpts) {
        return UiUtil$1.getShowModal(getShowModalOpts);
    }

    static _$getBtnOk({comp=null, opts, doClose}) {
        return $(`<button class="btn btn-primary mr-2">${opts.buttonText || "OK"}</button>`).click(evt=>{
            evt.stopPropagation();
            if (comp && !comp._state.isValid)
                return JqueryUtil.doToast({
                    content: `Please enter valid input!`,
                    type: "warning"
                });
            doClose(true);
        }
        );
    }

    static _$getBtnCancel({comp=null, opts, doClose}) {
        return $(`<button class="btn btn-default">Cancel</button>`).click(evt=>{
            evt.stopPropagation();
            doClose(false);
        }
        );
    }

    static _$getBtnSkip({comp=null, opts, doClose}) {
        return !opts.isSkippable ? null : $(`<button class="btn btn-default ml-3">Skip</button>`).click(evt=>{
            evt.stopPropagation();
            doClose(VeCt.SYM_UI_SKIP);
        }
        );
    }

    static async pGetUserNumber(opts) {
        opts = opts || {};

        let defaultVal = opts.default !== undefined ? opts.default : null;
        if (opts.storageKey_default) {
            const prev = await (opts.isGlobal_default ? StorageUtil.pGet(opts.storageKey_default) : StorageUtil.pGetForPage(opts.storageKey_default));
            if (prev != null)
                defaultVal = prev;
        }

        const $iptNumber = $(`<input class="form-control mb-2 text-right" ${opts.min ? `min="${opts.min}"` : ""} ${opts.max ? `max="${opts.max}"` : ""}>`).keydown(evt=>{
            if (evt.key === "Escape") {
                $iptNumber.blur();
                return;
            }

            evt.stopPropagation();
            if (evt.key === "Enter") {
                evt.preventDefault();
                doClose(true);
            }
        }
        );
        if (defaultVal !== undefined)
            $iptNumber.val(defaultVal);

        const {$modalInner, doClose, pGetResolved, doAutoResize: doAutoResizeModal} = await InputUiUtil._pGetShowModal({
            title: opts.title || "Enter a Number",
            isMinHeight0: true,
        });

        const $btnOk = this._$getBtnOk({
            opts,
            doClose
        });
        const $btnCancel = this._$getBtnCancel({
            opts,
            doClose
        });
        const $btnSkip = this._$getBtnSkip({
            opts,
            doClose
        });

        if (opts.$elePre)
            opts.$elePre.appendTo($modalInner);
        $iptNumber.appendTo($modalInner);
        if (opts.$elePost)
            opts.$elePost.appendTo($modalInner);
        $$`<div class="ve-flex-v-center ve-flex-h-right pb-1 px-1">${$btnOk}${$btnCancel}${$btnSkip}</div>`.appendTo($modalInner);

        if (doAutoResizeModal)
            doAutoResizeModal();

        $iptNumber.focus();
        $iptNumber.select();

        const [isDataEntered] = await pGetResolved();

        if (typeof isDataEntered === "symbol")
            return isDataEntered;

        if (!isDataEntered)
            return null;
        const outRaw = $iptNumber.val();
        if (!outRaw.trim())
            return null;
        let out = UiUtil$1.strToInt(outRaw);
        if (opts.min)
            out = Math.max(opts.min, out);
        if (opts.max)
            out = Math.min(opts.max, out);
        if (opts.int)
            out = Math.round(out);

        if (opts.storageKey_default) {
            opts.isGlobal_default ? StorageUtil.pSet(opts.storageKey_default, out).then(null) : StorageUtil.pSetForPage(opts.storageKey_default, out).then(null);
        }

        return out;
    }

    static async pGetUserBoolean(opts) {
        opts = opts || {};

        if (opts.storageKey) {
            const prev = await (opts.isGlobal ? StorageUtil.pGet(opts.storageKey) : StorageUtil.pGetForPage(opts.storageKey));
            if (prev != null)
                return prev;
        }

        const $btnTrueRemember = opts.textYesRemember ? $(`<button class="btn btn-primary ve-flex-v-center mr-2"><span class="glyphicon glyphicon-ok mr-2"></span><span>${opts.textYesRemember}</span></button>`).click(()=>{
            doClose(true, true);
            if (opts.fnRemember) {
                opts.fnRemember(true);
            } else {
                opts.isGlobal ? StorageUtil.pSet(opts.storageKey, true) : StorageUtil.pSetForPage(opts.storageKey, true);
            }
        }
        ) : null;

        const $btnTrue = $(`<button class="btn btn-primary ve-flex-v-center mr-3"><span class="glyphicon glyphicon-ok mr-2"></span><span>${opts.textYes || "OK"}</span></button>`).click(evt=>{
            evt.stopPropagation();
            doClose(true, true);
        }
        );

        const $btnFalse = opts.isAlert ? null : $(`<button class="btn btn-default btn-sm ve-flex-v-center"><span class="glyphicon glyphicon-remove mr-2"></span><span>${opts.textNo || "Cancel"}</span></button>`).click(evt=>{
            evt.stopPropagation();
            doClose(true, false);
        }
        );

        const $btnSkip = !opts.isSkippable ? null : $(`<button class="btn btn-default btn-sm ml-3"><span class="glyphicon glyphicon-forward"></span><span>${opts.textSkip || "Skip"}</span></button>`).click(evt=>{
            evt.stopPropagation();
            doClose(VeCt.SYM_UI_SKIP);
        }
        );

        const {$modalInner, doClose, pGetResolved, doAutoResize: doAutoResizeModal} = await InputUiUtil._pGetShowModal({
            title: opts.title || "Choose",
            isMinHeight0: true,
        });

        if (opts.$eleDescription?.length)
            $$`<div class="ve-flex w-100 mb-1">${opts.$eleDescription}</div>`.appendTo($modalInner);
        else if (opts.htmlDescription && opts.htmlDescription.trim())
            $$`<div class="ve-flex w-100 mb-1">${opts.htmlDescription}</div>`.appendTo($modalInner);
        $$`<div class="ve-flex-v-center ve-flex-h-right py-1 px-1">${$btnTrueRemember}${$btnTrue}${$btnFalse}${$btnSkip}</div>`.appendTo($modalInner);

        if (doAutoResizeModal)
            doAutoResizeModal();

        $btnTrue.focus();
        $btnTrue.select();

        const [isDataEntered,out] = await pGetResolved();

        if (typeof isDataEntered === "symbol")
            return isDataEntered;

        if (!isDataEntered)
            return null;
        if (out == null)
            throw new Error(`Callback must receive a value!`);
        return out;
    }

    static async pGetUserEnum(opts) {
        opts = opts || {};

        const $selEnum = $(`<select class="form-control mb-2"><option value="-1" disabled>${opts.placeholder || "Select..."}</option></select>`).keydown(async evt=>{
            evt.stopPropagation();
            if (evt.key === "Enter") {
                evt.preventDefault();
                doClose(true);
            }
        }
        );

        if (opts.isAllowNull)
            $(`<option value="-1"></option>`).text(opts.fnDisplay ? opts.fnDisplay(null, -1) : "(None)").appendTo($selEnum);

        opts.values.forEach((v,i)=>$(`<option value="${i}"></option>`).text(opts.fnDisplay ? opts.fnDisplay(v, i) : v).appendTo($selEnum));
        if (opts.default != null)
            $selEnum.val(opts.default);
        else
            $selEnum[0].selectedIndex = 0;

        const {$modalInner, doClose, pGetResolved, doAutoResize: doAutoResizeModal} = await InputUiUtil._pGetShowModal({
            title: opts.title || "Select an Option",
            isMinHeight0: true,
        });

        const $btnOk = this._$getBtnOk({
            opts,
            doClose
        });
        const $btnCancel = this._$getBtnCancel({
            opts,
            doClose
        });
        const $btnSkip = this._$getBtnSkip({
            opts,
            doClose
        });

        $selEnum.appendTo($modalInner);
        if (opts.$elePost)
            opts.$elePost.appendTo($modalInner);
        $$`<div class="ve-flex-v-center ve-flex-h-right pb-1 px-1">${$btnOk}${$btnCancel}${$btnSkip}</div>`.appendTo($modalInner);

        if (doAutoResizeModal)
            doAutoResizeModal();

        $selEnum.focus();

        const [isDataEntered] = await pGetResolved();
        if (typeof isDataEntered === "symbol")
            return isDataEntered;

        if (!isDataEntered)
            return null;
        const ix = Number($selEnum.val());
        if (!~ix)
            return null;
        if (opts.fnGetExtraState) {
            const out = {
                extraState: opts.fnGetExtraState()
            };
            if (opts.isResolveItem)
                out.item = opts.values[ix];
            else
                out.ix = ix;
            return out;
        }

        return opts.isResolveItem ? opts.values[ix] : ix;
    }

    static async pGetUserMultipleChoice(opts) {
        const prop = "formData";

        const initialState = {};
        if (opts.defaults)
            opts.defaults.forEach(ix=>initialState[ComponentUiUtil$1.getMetaWrpMultipleChoice_getPropIsActive(prop, ix)] = true);
        if (opts.required) {
            opts.required.forEach(ix=>{
                initialState[ComponentUiUtil$1.getMetaWrpMultipleChoice_getPropIsActive(prop, ix)] = true;
                initialState[ComponentUiUtil$1.getMetaWrpMultipleChoice_getPropIsRequired(prop, ix)] = true;
            }
            );
        }

        const comp = BaseComponent$1.fromObject(initialState);

        let title = opts.title;
        if (!title) {
            if (opts.count != null)
                title = `Choose ${Parser.numberToText(opts.count).uppercaseFirst()}`;
            else if (opts.min != null && opts.max != null)
                title = `Choose Between ${Parser.numberToText(opts.min).uppercaseFirst()} and ${Parser.numberToText(opts.max).uppercaseFirst()} Options`;
            else if (opts.min != null)
                title = `Choose At Least ${Parser.numberToText(opts.min).uppercaseFirst()}`;
            else
                title = `Choose At Most ${Parser.numberToText(opts.max).uppercaseFirst()}`;
        }

        const {$ele: $wrpList, $iptSearch, propIsAcceptable} = ComponentUiUtil$1.getMetaWrpMultipleChoice(comp, prop, opts);
        $wrpList.addClass(`mb-1`);

        const {$modalInner, doClose, pGetResolved, doAutoResize: doAutoResizeModal} = await InputUiUtil._pGetShowModal({
            ...(opts.modalOpts || {}),
            title,
            isMinHeight0: true,
            isUncappedHeight: true,
        });

        const $btnOk = this._$getBtnOk({
            opts,
            doClose
        });
        const $btnCancel = this._$getBtnCancel({
            opts,
            doClose
        });
        const $btnSkip = this._$getBtnSkip({
            opts,
            doClose
        });

        const hkIsAcceptable = ()=>$btnOk.attr("disabled", !comp._state[propIsAcceptable]);
        comp._addHookBase(propIsAcceptable, hkIsAcceptable);
        hkIsAcceptable();

        if (opts.htmlDescription)
            $modalInner.append(opts.htmlDescription);
        if ($iptSearch) {
            $$`<label class="mb-1">
				${$iptSearch}
			</label>`.appendTo($modalInner);
        }
        $wrpList.appendTo($modalInner);
        $$`<div class="ve-flex-v-center ve-flex-h-right no-shrink pb-1 px-1">${$btnOk}${$btnCancel}${$btnSkip}</div>`.appendTo($modalInner);

        if (doAutoResizeModal)
            doAutoResizeModal();

        $wrpList.focus();

        const [isDataEntered] = await pGetResolved();

        if (typeof isDataEntered === "symbol")
            return isDataEntered;

        if (!isDataEntered)
            return null;

        const ixs = ComponentUiUtil$1.getMetaWrpMultipleChoice_getSelectedIxs(comp, prop);

        if (!opts.isResolveItems)
            return ixs;

        if (opts.values)
            return ixs.map(ix=>opts.values[ix]);

        if (opts.valueGroups) {
            const allValues = opts.valueGroups.map(it=>it.values).flat();
            return ixs.map(ix=>allValues[ix]);
        }

        throw new Error(`Should never occur!`);
    }

    static async pGetUserIcon(opts) {
        opts = opts || {};

        let lastIx = opts.default != null ? opts.default : -1;
        const onclicks = [];

        const {$modalInner, doClose, pGetResolved, doAutoResize: doAutoResizeModal} = await InputUiUtil._pGetShowModal({
            title: opts.title || "Select an Option",
            isMinHeight0: true,
        });

        $$`<div class="ve-flex ve-flex-wrap ve-flex-h-center mb-2">${opts.values.map((v,i)=>{
            const $btn = $$`<div class="m-2 btn ${v.buttonClass || "btn-default"} ui__btn-xxl-square ve-flex-col ve-flex-h-center">
					${v.iconClass ? `<div class="ui-icn__wrp-icon ${v.iconClass} mb-1"></div>` : ""}
					${v.iconContent ? v.iconContent : ""}
					<div class="whitespace-normal w-100">${v.name}</div>
				</div>`.click(()=>{
                lastIx = i;
                onclicks.forEach(it=>it());
            }
            ).toggleClass(v.buttonClassActive || "active", opts.default === i);
            if (v.buttonClassActive && opts.default === i) {
                $btn.removeClass("btn-default").addClass(v.buttonClassActive);
            }

            onclicks.push(()=>{
                $btn.toggleClass(v.buttonClassActive || "active", lastIx === i);
                if (v.buttonClassActive)
                    $btn.toggleClass("btn-default", lastIx !== i);
            }
            );
            return $btn;
        }
        )}</div>`.appendTo($modalInner);

        const $btnOk = this._$getBtnOk({
            opts,
            doClose
        });
        const $btnCancel = this._$getBtnCancel({
            opts,
            doClose
        });
        const $btnSkip = this._$getBtnSkip({
            opts,
            doClose
        });

        $$`<div class="ve-flex-v-center ve-flex-h-right pb-1 px-1">${$btnOk}${$btnCancel}${$btnSkip}</div>`.appendTo($modalInner);

        const [isDataEntered] = await pGetResolved();

        if (typeof isDataEntered === "symbol")
            return isDataEntered;
        if (!isDataEntered)
            return null;
        return ~lastIx ? lastIx : null;
    }

    static async pGetUserString(opts) {
        opts = opts || {};

        const propValue = "text";
        const comp = BaseComponent$1.fromObject({
            [propValue]: opts.default || "",
            isValid: true,
        });

        const $iptStr = ComponentUiUtil$1.$getIptStr(comp, propValue, {
            html: `<input class="form-control mb-2" type="text">`,
            autocomplete: opts.autocomplete,
        }, ).keydown(async evt=>{
            if (evt.key === "Escape")
                return;
            if (opts.autocomplete) {
                await MiscUtil.pDelay(17);
                if ($modalInner.find(`.typeahead.dropdown-menu`).is(":visible"))
                    return;
            }

            evt.stopPropagation();
            if (evt.key === "Enter") {
                evt.preventDefault();
                doClose(true);
            }
        }
        );
        if (opts.isCode)
            $iptStr.addClass("code");

        if (opts.fnIsValid) {
            const hkText = ()=>comp._state.isValid = !comp._state.text.trim() || !!opts.fnIsValid(comp._state.text);
            comp._addHookBase(propValue, hkText);
            hkText();

            const hkIsValid = ()=>$iptStr.toggleClass("form-control--error", !comp._state.isValid);
            comp._addHookBase("isValid", hkIsValid);
            hkIsValid();
        }

        const {$modalInner, doClose, pGetResolved, doAutoResize: doAutoResizeModal} = await InputUiUtil._pGetShowModal({
            title: opts.title || "Enter Text",
            isMinHeight0: true,
            isWidth100: true,
        });

        const $btnOk = this._$getBtnOk({
            comp,
            opts,
            doClose
        });
        const $btnCancel = this._$getBtnCancel({
            comp,
            opts,
            doClose
        });
        const $btnSkip = this._$getBtnSkip({
            comp,
            opts,
            doClose
        });

        if (opts.$elePre)
            opts.$elePre.appendTo($modalInner);
        if (opts.$eleDescription?.length)
            $$`<div class="ve-flex w-100 mb-1">${opts.$eleDescription}</div>`.appendTo($modalInner);
        else if (opts.htmlDescription && opts.htmlDescription.trim())
            $$`<div class="ve-flex w-100 mb-1">${opts.htmlDescription}</div>`.appendTo($modalInner);
        $iptStr.appendTo($modalInner);
        if (opts.$elePost)
            opts.$elePost.appendTo($modalInner);
        $$`<div class="ve-flex-v-center ve-flex-h-right pb-1 px-1">${$btnOk}${$btnCancel}${$btnSkip}</div>`.appendTo($modalInner);

        if (doAutoResizeModal)
            doAutoResizeModal();

        $iptStr.focus();
        $iptStr.select();

        if (opts.cbPostRender) {
            opts.cbPostRender({
                comp,
                $iptStr,
                propValue,
            });
        }

        const [isDataEntered] = await pGetResolved();

        if (typeof isDataEntered === "symbol")
            return isDataEntered;
        if (!isDataEntered)
            return null;
        const raw = $iptStr.val();
        return raw;
    }

    static async pGetUserText(opts) {
        opts = opts || {};

        const $iptStr = $(`<textarea class="form-control mb-2 resize-vertical w-100" ${opts.disabled ? "disabled" : ""}></textarea>`).val(opts.default);
        if (opts.isCode)
            $iptStr.addClass("code");

        const {$modalInner, doClose, pGetResolved, doAutoResize: doAutoResizeModal} = await InputUiUtil._pGetShowModal({
            title: opts.title || "Enter Text",
            isMinHeight0: true,
        });

        const $btnOk = this._$getBtnOk({
            opts,
            doClose
        });
        const $btnCancel = this._$getBtnCancel({
            opts,
            doClose
        });
        const $btnSkip = this._$getBtnSkip({
            opts,
            doClose
        });

        $iptStr.appendTo($modalInner);
        $$`<div class="ve-flex-v-center ve-flex-h-right pb-1 px-1">${$btnOk}${$btnCancel}${$btnSkip}</div>`.appendTo($modalInner);

        if (doAutoResizeModal)
            doAutoResizeModal();

        $iptStr.focus();
        $iptStr.select();

        const [isDataEntered] = await pGetResolved();

        if (typeof isDataEntered === "symbol")
            return isDataEntered;
        if (!isDataEntered)
            return null;
        const raw = $iptStr.val();
        if (!raw.trim())
            return null;
        else
            return raw;
    }

    static async pGetUserColor(opts) {
        opts = opts || {};

        const $iptRgb = $(`<input class="form-control mb-2" ${opts.default != null ? `value="${opts.default}"` : ""} type="color">`);

        const {$modalInner, doClose, pGetResolved, doAutoResize: doAutoResizeModal} = await InputUiUtil._pGetShowModal({
            title: opts.title || "Choose Color",
            isMinHeight0: true,
        });

        const $btnOk = this._$getBtnOk({
            opts,
            doClose
        });
        const $btnCancel = this._$getBtnCancel({
            opts,
            doClose
        });
        const $btnSkip = this._$getBtnSkip({
            opts,
            doClose
        });

        $iptRgb.appendTo($modalInner);
        $$`<div class="ve-flex-v-center ve-flex-h-right pb-1 px-1">${$btnOk}${$btnCancel}${$btnSkip}</div>`.appendTo($modalInner);

        if (doAutoResizeModal)
            doAutoResizeModal();

        $iptRgb.focus();
        $iptRgb.select();

        const [isDataEntered] = await pGetResolved();

        if (typeof isDataEntered === "symbol")
            return isDataEntered;
        if (!isDataEntered)
            return null;
        const raw = $iptRgb.val();
        if (!raw.trim())
            return null;
        else
            return raw;
    }

    static async pGetUserDirection(opts) {
        const X = 0;
        const Y = 1;
        const DEG_CIRCLE = 360;

        opts = opts || {};
        const step = Math.max(2, Math.min(DEG_CIRCLE, opts.step || DEG_CIRCLE));
        const stepDeg = DEG_CIRCLE / step;

        function getAngle(p1, p2) {
            return Math.atan2(p2[Y] - p1[Y], p2[X] - p1[X]) * 180 / Math.PI;
        }

        let active = false;
        let curAngle = Math.min(DEG_CIRCLE, opts.default) || 0;

        const $arm = $(`<div class="ui-dir__arm"></div>`);
        const handleAngle = ()=>$arm.css({
            transform: `rotate(${curAngle + 180}deg)`
        });
        handleAngle();

        const $pad = $$`<div class="ui-dir__face">${$arm}</div>`.on("mousedown touchstart", evt=>{
            active = true;
            handleEvent(evt);
        }
        );

        const $document = $(document);
        const evtId = `ui_user_dir_${CryptUtil.uid()}`;
        $document.on(`mousemove.${evtId} touchmove${evtId}`, evt=>{
            handleEvent(evt);
        }
        ).on(`mouseup.${evtId} touchend${evtId} touchcancel${evtId}`, evt=>{
            evt.preventDefault();
            evt.stopPropagation();
            active = false;
        }
        );
        const handleEvent = (evt)=>{
            if (!active)
                return;

            const coords = [EventUtil.getClientX(evt), EventUtil.getClientY(evt)];

            const {top, left} = $pad.offset();
            const center = [left + ($pad.width() / 2), top + ($pad.height() / 2)];
            curAngle = getAngle(center, coords) + 90;
            if (step !== DEG_CIRCLE)
                curAngle = Math.round(curAngle / stepDeg) * stepDeg;
            else
                curAngle = Math.round(curAngle);
            handleAngle();
        }
        ;

        const BTN_STEP_SIZE = 26;
        const BORDER_PAD = 16;
        const CONTROLS_RADIUS = (92 + BTN_STEP_SIZE + BORDER_PAD) / 2;
        const $padOuter = opts.stepButtons ? (()=>{
            const steps = opts.stepButtons;
            const SEG_ANGLE = 360 / steps.length;

            const $btns = [];

            for (let i = 0; i < steps.length; ++i) {
                const theta = (SEG_ANGLE * i * (Math.PI / 180)) - (1.5708);
                const x = CONTROLS_RADIUS * Math.cos(theta);
                const y = CONTROLS_RADIUS * Math.sin(theta);
                $btns.push($(`<button class="btn btn-default btn-xxs absolute">${steps[i]}</button>`).css({
                    top: y + CONTROLS_RADIUS - (BTN_STEP_SIZE / 2),
                    left: x + CONTROLS_RADIUS - (BTN_STEP_SIZE / 2),
                    width: BTN_STEP_SIZE,
                    height: BTN_STEP_SIZE,
                    zIndex: 1002,
                }).click(()=>{
                    curAngle = SEG_ANGLE * i;
                    handleAngle();
                }
                ), );
            }

            const $wrpInner = $$`<div class="ve-flex-vh-center relative">${$btns}${$pad}</div>`.css({
                width: CONTROLS_RADIUS * 2,
                height: CONTROLS_RADIUS * 2,
            });

            return $$`<div class="ve-flex-vh-center">${$wrpInner}</div>`.css({
                width: (CONTROLS_RADIUS * 2) + BTN_STEP_SIZE + BORDER_PAD,
                height: (CONTROLS_RADIUS * 2) + BTN_STEP_SIZE + BORDER_PAD,
            });
        }
        )() : null;

        const {$modalInner, doClose, pGetResolved, doAutoResize: doAutoResizeModal} = await InputUiUtil._pGetShowModal({
            title: opts.title || "Select Direction",
            isMinHeight0: true,
        });

        const $btnOk = this._$getBtnOk({
            opts,
            doClose
        });
        const $btnCancel = this._$getBtnCancel({
            opts,
            doClose
        });
        const $btnSkip = this._$getBtnSkip({
            opts,
            doClose
        });

        $$`<div class="ve-flex-vh-center mb-3">
				${$padOuter || $pad}
			</div>`.appendTo($modalInner);
        $$`<div class="ve-flex-v-center ve-flex-h-right pb-1 px-1">${$btnOk}${$btnCancel}${$btnSkip}</div>`.appendTo($modalInner);

        if (doAutoResizeModal)
            doAutoResizeModal();

        const [isDataEntered] = await pGetResolved();

        if (typeof isDataEntered === "symbol")
            return isDataEntered;
        $document.off(`mousemove.${evtId} touchmove${evtId} mouseup.${evtId} touchend${evtId} touchcancel${evtId}`);
        if (!isDataEntered)
            return null;
        if (curAngle < 0)
            curAngle += 360;
        return curAngle;
    }

    static async pGetUserDice(opts) {
        opts = opts || {};

        const comp = BaseComponent$1.fromObject({
            num: (opts.default && opts.default.num) || 1,
            faces: (opts.default && opts.default.faces) || 6,
            bonus: (opts.default && opts.default.bonus) || null,
        });

        comp.render = function($parent) {
            $parent.empty();

            const $iptNum = ComponentUiUtil$1.$getIptInt(this, "num", 0, {
                $ele: $(`<input class="form-control input-xs form-control--minimal ve-text-center mr-1">`)
            }).appendTo($parent).keydown(evt=>{
                if (evt.key === "Escape") {
                    $iptNum.blur();
                    return;
                }
                if (evt.which === 13)
                    doClose(true);
                evt.stopPropagation();
            }
            );
            const $selFaces = ComponentUiUtil$1.$getSelEnum(this, "faces", {
                values: Renderer.dice.DICE
            }).addClass("mr-2").addClass("ve-text-center").css("textAlignLast", "center");

            const $iptBonus = $(`<input class="form-control input-xs form-control--minimal ve-text-center">`).change(()=>this._state.bonus = UiUtil$1.strToInt($iptBonus.val(), null, {
                fallbackOnNaN: null
            })).keydown(evt=>{
                if (evt.key === "Escape") {
                    $iptBonus.blur();
                    return;
                }
                if (evt.which === 13)
                    doClose(true);
                evt.stopPropagation();
            }
            );
            const hook = ()=>$iptBonus.val(this._state.bonus != null ? UiUtil$1.intToBonus(this._state.bonus) : this._state.bonus);
            comp._addHookBase("bonus", hook);
            hook();

            $$`<div class="ve-flex-vh-center">${$iptNum}<div class="mr-1">d</div>${$selFaces}${$iptBonus}</div>`.appendTo($parent);
        }
        ;

        comp.getAsString = function() {
            return `${this._state.num}d${this._state.faces}${this._state.bonus ? UiUtil$1.intToBonus(this._state.bonus) : ""}`;
        }
        ;

        const {$modalInner, doClose, pGetResolved, doAutoResize: doAutoResizeModal} = await InputUiUtil._pGetShowModal({
            title: opts.title || "Enter Dice",
            isMinHeight0: true,
        });

        const $btnOk = this._$getBtnOk({
            opts,
            doClose
        });
        const $btnCancel = this._$getBtnCancel({
            opts,
            doClose
        });
        const $btnSkip = this._$getBtnSkip({
            opts,
            doClose
        });

        comp.render($modalInner);

        $$`<div class="ve-flex-v-center ve-flex-h-right pb-1 px-1 mt-2">${$btnOk}${$btnCancel}${$btnSkip}</div>`.appendTo($modalInner);

        if (doAutoResizeModal)
            doAutoResizeModal();

        const [isDataEntered] = await pGetResolved();

        if (typeof isDataEntered === "symbol")
            return isDataEntered;
        if (!isDataEntered)
            return null;
        return comp.getAsString();
    }

    static async pGetUserScaleCr(opts={}) {
        const crDefault = opts.default || "1";

        let slider;

        const {$modalInner, doClose, pGetResolved, doAutoResize: doAutoResizeModal} = await InputUiUtil._pGetShowModal({
            title: opts.title || "Select Challenge Rating",
            isMinHeight0: true,
            cbClose: ()=>{
                slider.destroy();
            }
            ,
        });

        const cur = Parser.CRS.indexOf(crDefault);
        if (!~cur)
            throw new Error(`Initial CR ${crDefault} was not valid!`);

        const comp = BaseComponent$1.fromObject({
            min: 0,
            max: Parser.CRS.length - 1,
            cur,
        });
        slider = new ComponentUiUtil$1.RangeSlider({
            comp,
            propMin: "min",
            propMax: "max",
            propCurMin: "cur",
            fnDisplay: ix=>Parser.CRS[ix],
        });
        $$`<div class="ve-flex-col w-640p">${slider.$get()}</div>`.appendTo($modalInner);

        const $btnOk = this._$getBtnOk({
            opts,
            doClose
        });
        const $btnCancel = this._$getBtnCancel({
            opts,
            doClose
        });
        const $btnSkip = this._$getBtnSkip({
            opts,
            doClose
        });

        $$`<div class="ve-flex-v-center ve-flex-h-right pb-1 px-1">${$btnOk}${$btnCancel}${$btnSkip}</div>`.appendTo($modalInner);

        if (doAutoResizeModal)
            doAutoResizeModal();

        const [isDataEntered] = await pGetResolved();

        if (typeof isDataEntered === "symbol")
            return isDataEntered;
        if (!isDataEntered)
            return null;

        return Parser.CRS[comp._state.cur];
    }
}
//#endregion

//#region Hist
let Hist = class Hist {
    static hashChange({isForceLoad, isBlankFilterLoad=false}={}) {
        if (Hist.isHistorySuppressed) {
            Hist.setSuppressHistory(false);
            return;
        }

        const [link,...sub] = Hist.getHashParts();

        if (link !== Hist.lastLoadedLink || sub.length === 0 || isForceLoad) {
            Hist.lastLoadedLink = link;
            if (link === HASH_BLANK) {
                isBlankFilterLoad = true;
            } else {
                const listItem = Hist.getActiveListItem(link);

                if (listItem == null) {
                    if (typeof pHandleUnknownHash === "function" && window.location.hash.length && Hist._lastUnknownLink !== link) {
                        Hist._lastUnknownLink = link;
                        pHandleUnknownHash(link, sub);
                        return;
                    } else {
                        Hist._freshLoad();
                        return;
                    }
                }

                const toLoad = listItem.ix;
                if (toLoad === undefined)
                    Hist._freshLoad();
                else {
                    Hist.lastLoadedId = listItem.ix;
                    loadHash(listItem.ix);
                    document.title = `${listItem.name ? `${listItem.name} - ` : ""}5etools`;
                }
            }
        }

        if (typeof loadSubHash === "function" && (sub.length > 0 || isForceLoad))
            loadSubHash(sub);
        if (isBlankFilterLoad)
            Hist._freshLoad();
    }

    static init(initialLoadComplete) {
        window.onhashchange = ()=>Hist.hashChange({
            isForceLoad: true
        });
        if (window.location.hash.length) {
            Hist.hashChange();
        } else {
            Hist._freshLoad();
        }
        if (initialLoadComplete)
            Hist.initialLoad = false;
    }

    static setSuppressHistory(val) {
        Hist.isHistorySuppressed = val;
    }

    static _listPage = null;

    static setListPage(listPage) {
        this._listPage = listPage;
    }

    static getSelectedListItem() {
        const [link] = Hist.getHashParts();
        return Hist.getActiveListItem(link);
    }

    static getSelectedListElementWithLocation() {
        const [link] = Hist.getHashParts();
        return Hist.getActiveListItem(link, true);
    }

    static getHashParts() {
        return Hist.util.getHashParts(window.location.hash);
    }

    static getActiveListItem(link, getIndex) {
        const primaryLists = this._listPage.primaryLists;
        if (primaryLists && primaryLists.length) {
            for (let x = 0; x < primaryLists.length; ++x) {
                const list = primaryLists[x];

                const foundItemIx = list.items.findIndex(it=>it.values.hash === link);
                if (~foundItemIx) {
                    if (getIndex)
                        return {
                            item: list.items[foundItemIx],
                            x: x,
                            y: foundItemIx,
                            list
                        };
                    return list.items[foundItemIx];
                }
            }
        }
    }

    static _freshLoad() {
        setTimeout(()=>{
            const goTo = $("#listcontainer").find(".list a").attr("href");
            if (goTo) {
                const parts = location.hash.split(HASH_PART_SEP);
                const fullHash = `${goTo}${parts.length > 1 ? `${HASH_PART_SEP}${parts.slice(1).join(HASH_PART_SEP)}` : ""}`;
                location.replace(fullHash);
            }
        }
        , 1);
    }

    static cleanSetHash(toSet) {
        window.location.hash = Hist.util.getCleanHash(toSet);
    }

    static getHashSource() {
        const [link] = Hist.getHashParts();
        return link ? link.split(HASH_LIST_SEP).last() : null;
    }

    static getSubHash(key) {
        return Hist.util.getSubHash(window.location.hash, key);
    }

    static setSubhash(key, val) {
        const nxtHash = Hist.util.setSubhash(window.location.hash, key, val);
        Hist.cleanSetHash(nxtHash);
    }

    static setMainHash(hash) {
        const subHashPart = Hist.util.getHashParts(window.location.hash, key, val).slice(1).join(HASH_PART_SEP);
        Hist.cleanSetHash([hash, subHashPart].filter(Boolean).join(HASH_PART_SEP));
    }

    static replaceHistoryHash(hash) {
        window.history.replaceState({}, document.title, `${location.origin}${location.pathname}${hash ? `#${hash}` : ""}`, );
    }
}
;
Hist.lastLoadedLink = null;
Hist._lastUnknownLink = null;
Hist.lastLoadedId = null;
Hist.initialLoad = true;
Hist.isHistorySuppressed = false;

Hist.util = class {
    static getCleanHash(hash) {
        return hash.replace(/,+/g, ",").replace(/,$/, "").toLowerCase();
    }

    static _SYMS_NO_ENCODE = [/(,)/g, /(:)/g, /(=)/g];

    static getHashParts(location, {isReturnEncoded=false}={}) {
        if (location[0] === "#")
            location = location.slice(1);

        if (location === "google_vignette")
            location = "";

        if (isReturnEncoded) {
            return location.split(HASH_PART_SEP);
        }

        let pts = [location];
        this._SYMS_NO_ENCODE.forEach(re=>{
            pts = pts.map(pt=>pt.split(re)).flat();
        }
        );
        pts = pts.map(pt=>{
            if (this._SYMS_NO_ENCODE.some(re=>re.test(pt)))
                return pt;
            return decodeURIComponent(pt).toUrlified();
        }
        );
        location = pts.join("");

        return location.split(HASH_PART_SEP);
    }

    static getSubHash(location, key) {
        const [link,...sub] = Hist.util.getHashParts(location);
        const hKey = `${key}${HASH_SUB_KV_SEP}`;
        const part = sub.find(it=>it.startsWith(hKey));
        if (part)
            return part.slice(hKey.length);
        return null;
    }

    static setSubhash(location, key, val) {
        if (key.endsWith(HASH_SUB_KV_SEP))
            key = key.slice(0, -1);

        const [link,...sub] = Hist.util.getHashParts(location);
        if (!link)
            return "";

        const hKey = `${key}${HASH_SUB_KV_SEP}`;
        const out = [link];
        if (sub.length)
            sub.filter(it=>!it.startsWith(hKey)).forEach(it=>out.push(it));
        if (val != null)
            out.push(`${hKey}${val}`);

        return Hist.util.getCleanHash(out.join(HASH_PART_SEP));
    }
};

//#endregion
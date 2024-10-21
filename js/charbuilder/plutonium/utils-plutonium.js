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
        page, isDedupable=false, fnGetDedupedData=null, fnGetBlocklistFilteredData=null, isAutoSelectAll=false, skipTooManySourcesWarning=false}, ) {
        const allContent = [];

        if (isAutoSelectAll && !skipTooManySourcesWarning && this.isTooManySources({ cntSources: sources.length })) {
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
        if(!SETTINGS.ENABLE_SOURCE_CUSTOM_URL){return [];}
        return [new UtilDataSource.DataSourceUrl("Custom URL","",{
            ...nxtOpts,
            filterTypes: [UtilDataSource.SOURCE_TYP_CUSTOM],
            isAutoDetectPrereleaseBrew: true,
        },), ];
    }

    static getSourcesUploadFile(nxtOpts={}) {
        if(!SETTINGS.ENABLE_SOURCE_UPLOAD_FILE){return [];}
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
            return $(`<button class="btn ve-btn-default ui-tab__btn-tab-head ${tabMeta.isHeadHidden ? "ve-hidden" : ""}">${tabMeta.name.qq()}</button>`).click(()=>obj[_propProxy][propActive] = ixTab);
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
                const $btn = $(`<button class="btn ui-tab__btn-tab-head ${meta.type ? `btn-${meta.type}` : "ve-btn-primary"}" ${meta.title ? `title="${meta.title.qq()}"` : ""}>${meta.html}</button>`).click(evt=>meta.pFnClick(evt, $btn));
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
            return isSingleTab ? null : $(`<button class="btn ve-btn-default btn-sm ui-tab-side__btn-tab mb-2 br-0 btr-0 bbr-0 text-left ve-flex-v-center" title="${tabMeta.name.qq()}"><div class="${tabMeta.icon} ui-tab-side__icon-tab mr-2 mobile-ish__mr-0 ve-text-center"></div><div class="mobile-ish__hidden">${tabMeta.name.qq()}</div></button>`).click(()=>this[_propProxy][propActive] = ixTab);
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
                const $btn = $(`<button class="btn ${meta.type ? `btn-${meta.type}` : "ve-btn-primary"} btn-sm" ${meta.title ? `title="${meta.title.qq()}"` : ""}>${meta.html}</button>`).click(evt=>meta.pFnClick(evt, $btn));

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

                const $btnUp = $(`<button class="btn ve-btn-default ui-ideco__btn-ticker bold no-select">+</button>`).click(()=>handleClick(1));

                const $btnDown = $(`<button class="btn ve-btn-default ui-ideco__btn-ticker bold no-select">\u2012</button>`).click(()=>handleClick(-1));

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
            clazz: "btn btn-xs ve-btn-default",
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
            $btnAdd = $(`<button class="btn btn-xxs ve-btn-default ui-pick__btn-add ml-auto">+</button>`).click(async()=>{
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

            $btnAdd = $(`<button class="btn btn-xxs ve-btn-default ui-pick__btn-add">+</button>`).click(evt=>ContextUtil.pOpenMenu(evt, menu));
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
//#region UtilDocumentItem
class UtilDocumentItem {
	static getNameAsIdentifier (name) {
		return name.slugify({strict: true});
	}

	static getPrice ({cp}) {
		const singleCurrency = CurrencyUtil.getAsSingleCurrency({cp});
		const [denomination, value] = Object.entries(singleCurrency)[0];

		return {
			value,
			denomination,
		};
	}

	
	static hasProperty ({item, property}) {
		if (!item?.system?.properties) return false;
		if (item.system.properties instanceof Set) return item.system.properties.has(property);
		if (item.system.properties instanceof Array) return item.system.properties.includes(property);
		console.error(...LGT, item.system.properties);
		throw new Error(`Unable to check if item ${item.name} (${item.id}) has property "${property}"!`);
	}

	
	static TYPE_WEAPON = "weapon";
	static TYPE_TOOL = "tool";
	static TYPE_CONSUMABLE = "consumable";
	static TYPE_EQUIPMENT = "equipment";
	static TYPE_CONTAINER = "container";
	static TYPE_LOOT = "loot";

	static TYPES_ITEM = new Set([
		this.TYPE_WEAPON,
		this.TYPE_TOOL,
		this.TYPE_CONSUMABLE,
		this.TYPE_EQUIPMENT,
		this.TYPE_CONTAINER,
		this.TYPE_LOOT,
	]);

	static TYPES_ITEM_ORDERED = [
		this.TYPE_WEAPON,
		this.TYPE_TOOL,
		this.TYPE_CONSUMABLE,
		this.TYPE_EQUIPMENT,
		this.TYPE_CONTAINER,
		this.TYPE_LOOT,
	];

	
		static getBaseItemOptions ({itemType}) {
		switch (itemType) {
			case "equipment": {
				return Object.keys({
					...CONFIG.DND5E.armorIds,
					...CONFIG.DND5E.shieldIds,
				});
			}
			default: {
				return Object.keys(CONFIG.DND5E[`${itemType}Ids`] || {});
			}
		}
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

//#region UtilDataConverter
class UtilDataConverter {
	static getNameWithSourcePart (ent, {displayName = null, isActorItem = false} = {}) {
		return `${displayName || `${ent.type === "variant" ? "Variant: " : ""}${Renderer.stripTags(UtilEntityGeneric.getName(ent))}`}${!isActorItem && ent.source && Config.get("import", "isAddSourceToName") ? ` (${Parser.sourceJsonToAbv(ent.source)})` : ""}`;
	}

	static async pGetItemWeaponType (uid) {
		uid = uid.toLowerCase().trim();

		if (UtilDataConverter.WEAPONS_MARTIAL.includes(uid)) return "martial";
		if (UtilDataConverter.WEAPONS_SIMPLE.includes(uid)) return "simple";

		let [name, source] = Renderer.splitTagByPipe(uid);
		source = source || "phb";
		const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS]({name, source});

				const found = await DataLoader.pCacheAndGet(UrlUtil.PG_ITEMS, source, hash);
		return found?.weaponCategory;
	}

	static async _pGetClassSubclass_pInitCache ({cache}) {
		cache = cache || {};
		if (!cache._allClasses && !cache._allSubclasses) {
			const classData = await DataUtil.class.loadJSON();
			const prerelease = await PrereleaseUtil.pGetBrewProcessed();
			const brew = await BrewUtil2.pGetBrewProcessed();

			cache._allClasses = [
				...(classData.class || []),
				...(prerelease?.class || []),
				...(brew?.class || []),
			];

			cache._allSubclasses = [
				...(classData.subclass || []),
				...(prerelease?.subclass || []),
				...(brew?.subclass || []),
			];
		}
		return cache;
	}

	static async pGetClassItemClassAndSubclass ({sheetItem, subclassSheetItems, cache = null} = {}) {
		cache = await this._pGetClassSubclass_pInitCache({cache});

		const nameLowerClean = sheetItem.name.toLowerCase().trim();
		const sourceLowerClean = (UtilDocumentSource.getDocumentSource(sheetItem).source || "").toLowerCase();

		const matchingClasses = cache._allClasses.filter(cls =>
			cls.name.toLowerCase() === nameLowerClean
				&& (
					!Config.get("import", "isStrictMatching")
					|| sourceLowerClean === Parser.sourceJsonToAbv(cls.source).toLowerCase()
				),
		);
		if (!matchingClasses.length) return {matchingClasses: [], matchingSubclasses: [], sheetItem};

		if (!subclassSheetItems?.length) return {matchingClasses, matchingSubclasses: [], sheetItem};

		const matchingSubclasses = matchingClasses
			.map(cls => {
				const classSubclassSheetItems = subclassSheetItems.filter(scItem => scItem.system.classIdentifier === sheetItem.system.identifier);
				return cache._allSubclasses.filter(sc => {
					if (sc.className !== cls.name || sc.classSource !== cls.source) return false;

					return classSubclassSheetItems.some(scItem =>
						sc.name.toLowerCase() === scItem.name.toLowerCase().trim()
						&& (
							!Config.get("import", "isStrictMatching")
							|| (UtilDocumentSource.getDocumentSource(scItem).source || "").toLowerCase() === Parser.sourceJsonToAbv(sc.source).toLowerCase()
						),
					);
				});
			})
			.flat();

		return {matchingClasses, matchingSubclasses, sheetItem};
	}

	static getSpellPointTotal ({totalSpellcastingLevels}) {
		if (!totalSpellcastingLevels) return 0;

		const spellSlotCounts = UtilDataConverter.CASTER_TYPE_TO_PROGRESSION.full[totalSpellcastingLevels - 1]
			|| UtilDataConverter.CASTER_TYPE_TO_PROGRESSION.full[0];

		return spellSlotCounts
			.map((countSlots, ix) => {
				const spellLevel = ix + 1;
				return Parser.spLevelToSpellPoints(spellLevel) * countSlots;
			})
			.sum();
	}

	static getPsiPointTotal ({totalMysticLevels}) {
		if (!totalMysticLevels || isNaN(totalMysticLevels) || totalMysticLevels < 0) return 0;

		totalMysticLevels = Math.round(Math.min(totalMysticLevels, Consts.CHAR_MAX_LEVEL));

		return [4, 6, 14, 17, 27, 32, 38, 44, 57, 64, 64, 64, 64, 64, 64, 64, 64, 71, 71, 71][totalMysticLevels - 1];
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

	static getFvttUsesPer (it, {isStrict = true} = {}) {
		if (isStrict && !this._RECHARGE_TYPES[it]) return null;
		return Parser._parse_aToB(this._RECHARGE_TYPES, it);
	}

		static getTempDocumentDefaultOwnership ({documentType}) {
		if (game.user.isGM) return undefined;

		const clazz = CONFIG[documentType].documentClass;

		if (game.user.can(clazz.metadata.permissions.create)) return undefined;

		return CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
	}

	
	static isConcentrationString (str) {
		const strStripped = Renderer.stripTags(str);
		return /\buntil [^.?!]+ concentration ends\b/i.test(strStripped)
			|| /\bas if concentrating on a spell\b/.test(strStripped);
	}

	
	static getCleanDiceString (diceString) {
		return diceString
						.replace(/×/g, "*")
			.replace(/÷/g, "/")
						.replace(/#\$.*?\$#/g, "0")
		;
	}

	
	static _getConsumedSheetItem ({consumes, actor}) {
		const lookupNames = [
			consumes.name.toLowerCase().trim(),
			consumes.name.toLowerCase().trim().toPlural(),
		];

		return (actor?.items?.contents || [])
			.find(it => it.type === "feat" && lookupNames.includes(it.name.toLowerCase().trim()));
	}

	static _ConsumeMeta = class {
		isConsumes = false;
		isFound = false;
		consume = {};

		constructor (
			{
				isConsumes = false,
				isFound = false,
				consume = {},
			} = {},
		) {
			this.isConsumes = isConsumes;
			this.isFound = isFound;
			this.consume = consume;
		}
	};

	static getConsumeMeta ({ent, actor}) {
		if (!ent?.consumes) return new this._ConsumeMeta();

		const sheetItem = this._getConsumedSheetItem({consumes: ent.consumes, actor});
		if (!sheetItem) {
			return new this._ConsumeMeta({
				isConsumes: true,
				isFound: false,
			});
		}

		return new this._ConsumeMeta({
			isConsumes: true,
			isFound: true,
			consume: {
				type: "charges",
				amount: ent.consumes.amount ?? 1,
				target: sheetItem.id,
			},
		});
	}

	
	static getPrerequisiteLevelNumber ({prereqs}) {
		if (!prereqs?.length) return null;

		const levels = prereqs
			.map(it => it.level)
			.filter(Boolean);
		if (!levels.length) return null;

		const levelsNums = levels
			.map(numOrObj => {
				if (typeof numOrObj === "number") return numOrObj;
				return numOrObj.level;
			})
			.filter(Boolean);

		if (!levelsNums.length) return null;

				return Math.max(...levelsNums);
	}

	static getCleanPrerequisites ({prereqs}) {
		if (!UtilVersions.getSystemVersion().isVersionThreeTwoPlus) return prereqs;

		if (!prereqs?.length) return prereqs;

				const prereqsClean = MiscUtil.copyFast(prereqs)
			.map(prereq => {
				delete prereq.level;
				if (!Object.keys(prereq).length) return null;
				return prereq;
			})
			.filter(Boolean);

		if (!prereqsClean.length) return null;

		return prereqsClean;
	}
}
UtilDataConverter.WALKER_READONLY_GENERIC = MiscUtil.getWalker({isNoModification: true, keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST});
UtilDataConverter.WALKER_GENERIC = MiscUtil.getWalker({keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST});

UtilDataConverter.WEAPONS_MARTIAL = [
	"battleaxe|phb",
	"blowgun|phb",
	"flail|phb",
	"glaive|phb",
	"greataxe|phb",
	"greatsword|phb",
	"halberd|phb",
	"hand crossbow|phb",
	"heavy crossbow|phb",
	"lance|phb",
	"longbow|phb",
	"longsword|phb",
	"maul|phb",
	"morningstar|phb",
	"net|phb",
	"pike|phb",
	"rapier|phb",
	"scimitar|phb",
	"shortsword|phb",
	"trident|phb",
	"war pick|phb",
	"warhammer|phb",
	"whip|phb",
];
UtilDataConverter.WEAPONS_SIMPLE = [
	"club|phb",
	"dagger|phb",
	"dart|phb",
	"greatclub|phb",
	"handaxe|phb",
	"javelin|phb",
	"light crossbow|phb",
	"light hammer|phb",
	"mace|phb",
	"quarterstaff|phb",
	"shortbow|phb",
	"sickle|phb",
	"sling|phb",
	"spear|phb",
];

UtilDataConverter.CASTER_TYPE_TO_PROGRESSION = {
	"full": [
		[2, 0, 0, 0, 0, 0, 0, 0, 0],
		[3, 0, 0, 0, 0, 0, 0, 0, 0],
		[4, 2, 0, 0, 0, 0, 0, 0, 0],
		[4, 3, 0, 0, 0, 0, 0, 0, 0],
		[4, 3, 2, 0, 0, 0, 0, 0, 0],
		[4, 3, 3, 0, 0, 0, 0, 0, 0],
		[4, 3, 3, 1, 0, 0, 0, 0, 0],
		[4, 3, 3, 2, 0, 0, 0, 0, 0],
		[4, 3, 3, 3, 1, 0, 0, 0, 0],
		[4, 3, 3, 3, 2, 0, 0, 0, 0],
		[4, 3, 3, 3, 2, 1, 0, 0, 0],
		[4, 3, 3, 3, 2, 1, 0, 0, 0],
		[4, 3, 3, 3, 2, 1, 1, 0, 0],
		[4, 3, 3, 3, 2, 1, 1, 0, 0],
		[4, 3, 3, 3, 2, 1, 1, 1, 0],
		[4, 3, 3, 3, 2, 1, 1, 1, 0],
		[4, 3, 3, 3, 2, 1, 1, 1, 1],
		[4, 3, 3, 3, 3, 1, 1, 1, 1],
		[4, 3, 3, 3, 3, 2, 1, 1, 1],
		[4, 3, 3, 3, 3, 2, 2, 1, 1],
	],
	"artificer": [
		[2, 0, 0, 0, 0],
		[2, 0, 0, 0, 0],
		[3, 0, 0, 0, 0],
		[3, 0, 0, 0, 0],
		[4, 2, 0, 0, 0],
		[4, 2, 0, 0, 0],
		[4, 3, 0, 0, 0],
		[4, 3, 0, 0, 0],
		[4, 3, 2, 0, 0],
		[4, 3, 2, 0, 0],
		[4, 3, 3, 0, 0],
		[4, 3, 3, 0, 0],
		[4, 3, 3, 1, 0],
		[4, 3, 3, 1, 0],
		[4, 3, 3, 2, 0],
		[4, 3, 3, 2, 0],
		[4, 3, 3, 3, 1],
		[4, 3, 3, 3, 1],
		[4, 3, 3, 3, 2],
		[4, 3, 3, 3, 2],
	],
	"1/2": [
		[0, 0, 0, 0, 0],
		[2, 0, 0, 0, 0],
		[3, 0, 0, 0, 0],
		[3, 0, 0, 0, 0],
		[4, 2, 0, 0, 0],
		[4, 2, 0, 0, 0],
		[4, 3, 0, 0, 0],
		[4, 3, 0, 0, 0],
		[4, 3, 2, 0, 0],
		[4, 3, 2, 0, 0],
		[4, 3, 3, 0, 0],
		[4, 3, 3, 0, 0],
		[4, 3, 3, 1, 0],
		[4, 3, 3, 1, 0],
		[4, 3, 3, 2, 0],
		[4, 3, 3, 2, 0],
		[4, 3, 3, 3, 1],
		[4, 3, 3, 3, 1],
		[4, 3, 3, 3, 2],
		[4, 3, 3, 3, 2],
	],
	"1/3": [
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[2, 0, 0, 0],
		[3, 0, 0, 0],
		[3, 0, 0, 0],
		[3, 0, 0, 0],
		[4, 2, 0, 0],
		[4, 2, 0, 0],
		[4, 2, 0, 0],
		[4, 3, 0, 0],
		[4, 3, 0, 0],
		[4, 3, 0, 0],
		[4, 3, 2, 0],
		[4, 3, 2, 0],
		[4, 3, 2, 0],
		[4, 3, 3, 0],
		[4, 3, 3, 0],
		[4, 3, 3, 0],
		[4, 3, 3, 1],
		[4, 3, 3, 1],
	],
	"pact": [
		[1, 0, 0, 0, 0],
		[2, 0, 0, 0, 0],
		[0, 2, 0, 0, 0],
		[0, 2, 0, 0, 0],
		[0, 0, 2, 0, 0],
		[0, 0, 2, 0, 0],
		[0, 0, 0, 2, 0],
		[0, 0, 0, 2, 0],
		[0, 0, 0, 0, 2],
		[0, 0, 0, 0, 2],
		[0, 0, 0, 0, 3],
		[0, 0, 0, 0, 3],
		[0, 0, 0, 0, 3],
		[0, 0, 0, 0, 3],
		[0, 0, 0, 0, 3],
		[0, 0, 0, 0, 3],
		[0, 0, 0, 0, 4],
		[0, 0, 0, 0, 4],
		[0, 0, 0, 0, 4],
		[0, 0, 0, 0, 4],
	],
};
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
//#region UtilActiveEffects
class UtilActiveEffects {
	static PRIORITY_BASE = 4;
	static PRIORITY_BONUS = 7;

	static _PATHS_EXTRA__AC = [
		"system.attributes.ac.base", 		"system.attributes.ac.armor",
		"system.attributes.ac.dex",
		"system.attributes.ac.shield",
		"system.attributes.ac.bonus",
		"system.attributes.ac.cover",
	];

	static _AVAIL_EFFECTS_ACTOR_DND5E = [];

	static init () {
		this._AVAIL_EFFECTS_ACTOR_DND5E.push(
			new ActiveEffectMeta("system.attributes.prof", CONST.ACTIVE_EFFECT_MODES.OVERRIDE, 1),

			...Object.entries((CONFIG?.DND5E?.characterFlags) || {})
				.map(([k, meta]) => new ActiveEffectMeta(
					`flags.${SharedConsts.SYSTEM_ID_DND5E}.${k}`,
					CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
					meta.placeholder != null ? MiscUtil.copyFast(meta.placeholder) : meta.type()),
				),

									...Object.keys((CONFIG?.DND5E?.itemActionTypes) || {})
				.map(k => [
					new ActiveEffectMeta(
						`system.bonuses.${k}.attack`,
						CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
						"",
					),
					new ActiveEffectMeta(
						`system.bonuses.${k}.damage`,
						CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
						"",
					),
				])
				.flat(),
			
												...this._PATHS_EXTRA__AC.map(path => new ActiveEffectMeta(
				path,
				CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
				"",
			)),
					);
	}

		static getAvailableEffects (entity, opts) {
		opts = opts || {};

		if (game.system.id !== SharedConsts.SYSTEM_ID_DND5E) return [];

		let modelMeta;
		if (opts.isItemEffect) modelMeta = game.system.dataModels.item;
		else if (opts.isActorEffect) modelMeta = game.system.dataModels.actor;
		else throw new Error(`Unhandled effect mode, was neither an item effect nor an actor effect!`);

		const systemSchema = modelMeta.config[entity.type].defineSchema();

		const defaultModel = {};
		Object.entries(systemSchema)
			.map(([systemKey, subModel]) => {
				defaultModel[systemKey] = subModel.getInitialValue();
			});

		const baseEffects = Object.entries(foundry.utils.flattenObject(defaultModel))
						.map(([keyPath, defaultVal]) => new ActiveEffectMeta(`system.${keyPath}`, CONST.ACTIVE_EFFECT_MODES.OVERRIDE, defaultVal));

		if (opts.isItemEffect) return baseEffects;
		return [...baseEffects, ...this._AVAIL_EFFECTS_ACTOR_DND5E]
			.unique(it => it.path)
			.sort(SortUtil.ascSortLowerProp.bind(null, "path"));
	}

		static getAvailableEffectsLookup (entity, opts) {
		const effects = this.getAvailableEffects(entity, opts);
		const out = {};
		effects.forEach(it => out[it.path] = it);
		return out;
	}

	static getActiveEffectType (lookup, path) {
		if (!path) return undefined;

				path = this.getKeyFromCustomKey(path);

		if (!lookup[path]) return undefined;
		const meta = lookup[path];
		if (meta.default === undefined) return "undefined";
		if (meta.default === null) return "null";
		if (meta.default instanceof Array) return "array";
		return typeof meta.default;
	}

	static getExpandedEffects (
		rawEffects,
		{actor = null, sheetItem = null, parentName = "", img = null} = {},
		{isTuples = false} = {},
	) {
		if (!rawEffects || !rawEffects.length) return [];

		const tuples = [];

				for (const effectRaw of rawEffects) {
									const cpyEffectRaw = MiscUtil.copyFast(effectRaw);
			[
				"foundryId",

				"name",

				"priority",

				"icon",
				"img",

				"disabled",
				"transfer",

				"changes",

				"enchantmentLevelMin",
				"enchantmentLevelMax",
				"enchantmentRiderParent",

				"type",
			]
				.forEach(prop => delete cpyEffectRaw[prop]);

			const effect = UtilActiveEffects.getGenericEffect({
				id: effectRaw.foundryId
										|| (effectRaw.enchantmentRiderParent ? foundry.utils.randomID() : null),
				name: effectRaw.name ?? parentName,
				priority: effectRaw?.changes?.length
					? Math.max(...effectRaw.changes.map(it => UtilActiveEffects.getPriority(UtilActiveEffects.getFoundryMode({mode: it.mode}))))
					: 0,
				icon: effectRaw.img ?? img ?? sheetItem?.img ?? actor?.system?.img ?? actor?.system?.prototypeToken?.texture?.src,
				disabled: !!effectRaw.disabled,
				transfer: !!effectRaw.transfer,
			});

			if (actor && sheetItem) effect.origin = `Actor.${actor.id}.Item.${sheetItem.id}`;

			effect.changes = this._getExpandedEffects_getChanges({effect, effectRaw});

			effect.flags = this._getExpandedEffects_getFlags({effect, effectRaw});

						Object.entries(cpyEffectRaw)
				.filter(([k]) => k !== "flags")
				.forEach(([k, v]) => {
					effect[k] = v;
					delete cpyEffectRaw[k];
				});
						if (cpyEffectRaw.flags) effect.flags = foundry.utils.mergeObject(effect.flags || {}, cpyEffectRaw.flags);

			tuples.push({effect, effectRaw});
		}

				for (const {effect, effectRaw} of tuples) {
			if (!effectRaw.enchantmentRiderParent) continue;

			const parentTuple = tuples.find(({effect: effectParent}) => effectParent._id === effectRaw.enchantmentRiderParent);
			if (!parentTuple) {
				console.warn(...LGT, `Could not find parent effect "${effectRaw.enchantmentRiderParent}" to link in effect "${effectRaw.name || "(Unnamed)"}"!`);
				continue;
			}

			MiscUtil.getOrSet(parentTuple.effect, "flags", SharedConsts.SYSTEM_ID_DND5E, "enchantment", "riders", "effect", []).push(effect._id);
		}

		return isTuples ? tuples : tuples.map(it => it.effect);
	}

	static _getExpandedEffects_getChanges ({effect, effectRaw}) {
		const changes = [];

		(effectRaw.changes || []).forEach(rawChange => {
			const mode = UtilActiveEffects.getFoundryMode(rawChange.mode);

									const key = rawChange.key.replace(/^data\./, "system.");

			changes.push({
				key,
				mode,
				value: rawChange.value,
				priority: UtilActiveEffects.getPriority({mode, rawPriority: rawChange.priority}),
			});
		});

		return changes;
	}

	static _getExpandedEffects_getFlags ({effect, effectRaw}) {
		const flags = {};

		if (effectRaw.enchantmentLevelMin) MiscUtil.set(flags, SharedConsts.SYSTEM_ID_DND5E, "enchantment", "level", "min", effectRaw.enchantmentLevelMin);
		if (effectRaw.enchantmentLevelMax) MiscUtil.set(flags, SharedConsts.SYSTEM_ID_DND5E, "enchantment", "level", "max", effectRaw.enchantmentLevelMax);
		if (effectRaw.enchantmentRiderParent) MiscUtil.set(flags, SharedConsts.SYSTEM_ID_DND5E, "rider", true);
		if (effectRaw.type) MiscUtil.set(flags, SharedConsts.SYSTEM_ID_DND5E, "type", effectRaw.type);

		return flags;
	}

	static getGenericEffect (
		{
			id = null,

			name = "",
			icon = "icons/svg/aura.svg",
			disabled = false,
			transfer = true,

			key = "",
			value = "",
			mode = CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
			priority = null,

			durationSeconds = null,
			durationRounds = null,
			durationTurns = null,

			changes = null,

			originActor = null,
			originActorItem = null,
			originActorId = null,
			originActorItemId = null,

			flags = null,
		} = {},
	) {
		if (changes && (key || value)) throw new Error(`Generic effect args "key"/"value" and "changes" are mutually exclusive!`);

		const change = key || value ? this.getGenericChange({key, value, mode, priority}) : null;

		flags = flags || {};

		return {
			_id: id,
			id,
			name,
			icon,
			changes: changes ?? [change].filter(Boolean),
			disabled,
			duration: {
				startTime: null,
				seconds: durationSeconds,
				rounds: durationRounds,
				turns: durationTurns,
				startRound: null,
				startTurn: null,
			},
												origin: this._getGenericEffect_getOrigin({
				originActor,
				originActorItem,
				originActorId,
				originActorItemId,
			}),
			transfer,
			flags,
		};
	}

	static _getGenericEffect_getOrigin ({originActor, originActorItem, originActorId, originActorItemId}) {
		originActorId = originActorId ?? originActor?.id;
		originActorItemId = originActorItemId ?? originActorItem?.id;

		return originActorId
			? originActorItemId
				? `Actor.${originActorId}.Item.${originActorItemId}`
				: `Actor.${originActorId}`
			: null;
	}

	static getGenericChange (
		{
			key,
			value,
			mode = CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
			priority = null,
		},
	) {
		if (key == null || value === undefined) throw new Error(`Generic effect change "key" and "value" must be defined!`);
		return {
			key,
			mode,
			value,
			priority,
		};
	}

	static getCustomKey (key) { return `${SharedConsts.MODULE_ID_FAKE}.${key}`; }
	static getKeyFromCustomKey (customKey) { return customKey.replace(new RegExp(`${SharedConsts.MODULE_ID_FAKE}\\.`), ""); }

	static getFoundryMode (modeStrOrInt) {
		if (typeof modeStrOrInt === "number") return modeStrOrInt;
		const [, out = 0] = Object.entries(CONST.ACTIVE_EFFECT_MODES)
			.find(([k]) => k.toLowerCase() === `${modeStrOrInt}`.trim().toLowerCase()) || [];
		return out;
	}

	static getPriority ({mode, rawPriority = null}) {
		if (rawPriority != null && !isNaN(rawPriority)) return rawPriority;
		return mode >= CONST.ACTIVE_EFFECT_MODES.DOWNGRADE ? this.PRIORITY_BASE : this.PRIORITY_BONUS;
	}

	static _HINTS_DEFAULT_SIDE = {hintTransfer: false, hintDisabled: false};
	static getDisabledTransferHintsSideData (effectRaw) {
		const out = MiscUtil.copyFast(this._HINTS_DEFAULT_SIDE);
		if (effectRaw?.transfer != null) out.hintTransfer = effectRaw.transfer;
		if (effectRaw?.disabled != null) out.hintDisabled = effectRaw.disabled;
		return out;
	}

	
	static mutEffectsDisabledTransfer (effects, configGroup, opts = {}) {
		if (!effects) return;

		return effects.map(effect => this.mutEffectDisabledTransfer(effect, configGroup, opts));
	}

	static mutEffectDisabledTransfer (
		effect,
		configGroup,
		{
			hintDisabled = null,
			hintTransfer = null,
			hintSelfTarget = null,
		} = {},
	) {
		if (!effect) return;

		const disabled = Config.get(configGroup, "setEffectDisabled");
		switch (disabled) {
			case ConfigConsts.C_USE_PLUT_VALUE: effect.disabled = hintDisabled != null
				? hintDisabled
				: false;
				break;
			case ConfigConsts.C_BOOL_DISABLED: effect.disabled = false; break;
			case ConfigConsts.C_BOOL_ENABLED: effect.disabled = true; break;
		}

		const transfer = Config.get(configGroup, "setEffectTransfer");
		switch (transfer) {
			case ConfigConsts.C_USE_PLUT_VALUE: {
				if (hintTransfer != null) {
					effect.transfer = hintTransfer;
					break;
				}

												if (effect.statuses?.length) {
					effect.transfer = false;
					break;
				}

				effect.transfer = true;

				break;
			}
			case ConfigConsts.C_BOOL_DISABLED: effect.transfer = false; break;
			case ConfigConsts.C_BOOL_ENABLED: effect.transfer = true; break;
		}

		if (UtilCompat.isPlutoniumAddonAutomationActive()) {
			const val = hintTransfer != null ? hintSelfTarget : false;
			MiscUtil.set(effect, "flags", UtilCompat.MODULE_DAE, "selfTarget", val);
			MiscUtil.set(effect, "flags", UtilCompat.MODULE_DAE, "selfTargetAlways", val);
		}

		return effect;
	}

	
	static getEffectsMutDedupeId (effects) {
		if (!effects?.length) return effects;

		const usedDedupeIds = new Set();

		effects
			.forEach(eff => {
				const dedupeIdExisting = eff.flags?.[SharedConsts.MODULE_ID]?.dedupeId;
				if (dedupeIdExisting && !usedDedupeIds.has(dedupeIdExisting)) {
					usedDedupeIds.add(dedupeIdExisting);
					return;
				}

				if (!eff.name) throw new Error(`Effect did not have a name!`);

				const dedupeIdBase = dedupeIdExisting ?? eff.name.slugify({strict: true});
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
			});

		return effects;
	}
}
//#endregion
//#region UtilDocuments
class UtilDocuments {
	static async pCreateDocument (Clazz, docData, {isRender = true, isKeepId = true, isTemporary = false} = {}) {
		if (Config.get("misc", "isDebugDocumentOperations")) console.debug(...LGTD, `Creating "${Clazz.metadata.name}" document: ${docData.name || "(Unnamed)"}`, docData);

		docData = foundry.utils.flattenObject(docData);

						const out = await Clazz.create(docData, {renderSheet: false, render: isRender, keepId: isKeepId, temporary: isTemporary});

		if (isTemporary) out._isTempImportedDoc = true;

		return out;
	}

		static async pUpdateDocument (doc, docUpdate, {isRender = true, isTemporary = false, isDiff = null, isRecursive = null, isNoHook = null} = {}) {
		if (Config.get("misc", "isDebugDocumentOperations")) console.debug(...LGTD, `Updating "${doc.constructor.metadata.name}" document: ${doc.name || "(Unnamed)"}`, docUpdate);

		docUpdate = foundry.utils.flattenObject(docUpdate);

		if (Config.get("misc", "isSetDocumentOperationsCanaryFlags")) MiscUtil.set(docUpdate, "flags", "canary", "coalmine", Date.now());

				if (this.isTempDocument({doc, isTemporary})) {
						if (isDiff != null || isRecursive != null || isNoHook != null) {
								throw new Error(`Extra options ("isDiff", "isRecursive", "isNoHook") in temporary document updates are not supported!`);
			}

						foundry.utils.mergeObject(doc.system, docUpdate);

						return doc;
		}

		const opts = {render: isRender};
		if (isDiff != null) opts.diff = isDiff;
		if (isRecursive != null) opts.recursive = isRecursive;
		if (isNoHook != null) opts.noHook = isNoHook;

		return doc.update(docUpdate, opts);
	}

	static isTempDocument ({isTemporary, doc}) {
				return isTemporary
						|| doc?.id == null
						|| doc?._isTempImportedDoc;
	}

	static async pCreateEmbeddedDocuments (
		doc,
		embedArray,
		{
			isTemporary = false,
			ClsEmbed,
			isKeepId = true,
			isKeepEmbeddedIds = true,
			isRender = true,
			optionsCreateEmbeddedDocuments = null,
		},
	) {
		if (Config.get("misc", "isDebugDocumentOperations")) console.debug(...LGTD, `Creating ${embedArray?.length || 0} embedded "${ClsEmbed.metadata.name}" document(s): ${(embedArray || []).map(it => it?.name || "(Unnamed)")}`, embedArray);

		if (!embedArray?.length) return [];

		let createdEmbeds;

		if (this.isTempDocument({doc, isTemporary})) {
						embedArray.forEach(embed => {
				this._setTempId(embed);
				(embed.effects || []).forEach(effect => this._setTempId(effect));
			});

			createdEmbeds = await ClsEmbed.create(embedArray.map(it => foundry.utils.flattenObject(it)), {temporary: true, parent: doc});

			createdEmbeds.forEach(createdEmbed => {
								doc[ClsEmbed.metadata.collection].set(createdEmbed.id, createdEmbed);

												(createdEmbed.effects || []).forEach(effect => {
					doc.effects.set(effect.id, effect);
				});
			});
		} else {
			createdEmbeds = await doc.createEmbeddedDocuments(
				ClsEmbed.metadata.name,
				embedArray.map(it => foundry.utils.flattenObject(it)),
				{
					...(optionsCreateEmbeddedDocuments || {}),
					keepId: isKeepId,
					keepEmbeddedIds: isKeepEmbeddedIds,
					render: isRender,
				},
			);
		}

		if (embedArray.length !== createdEmbeds.length) throw new Error(`Number of returned items did not match number of input items!`); 		return embedArray.map((raw, i) => new UtilDocuments.ImportedEmbeddedDocument({raw, document: createdEmbeds[i]}));
	}

	static _setTempId (ent) {
		if (!ent._id && !ent.id) ent._id = foundry.utils.randomID();
		if (ent._id && !ent.id) ent.id = ent._id;
		if (!ent._id && ent.id) ent._id = ent.id;
	}

	static async pUpdateEmbeddedDocuments (
		doc,
		updateArray,
		{
			isTemporary = false,
			ClsEmbed,
						isRender = true,
		},
	) {
		if (Config.get("misc", "isDebugDocumentOperations")) console.debug(...LGTD, `Updating ${updateArray?.length || 0} embedded "${ClsEmbed.metadata.name}" document(s)`, updateArray);

		if (!updateArray?.length) return [];

		if (Config.get("misc", "isSetDocumentOperationsCanaryFlags")) updateArray.forEach(ud => MiscUtil.set(ud, "flags", "canary", "coalmine", Date.now()));

		const updatedEmbeds = this.isTempDocument({doc, isTemporary})
			? await this._pUpdateEmbeddedDocuments_temp({
				doc,
				updateArray,
				ClsEmbed,
				isRender,
			})
			: await this._pUpdateEmbeddedDocuments_standard({
				doc,
				updateArray,
				ClsEmbed,
				isRender,
			});

		if (updateArray.length !== updatedEmbeds.length) throw new Error(`Number of returned items did not match number of input items!`); 		return updateArray.map((raw, i) => new UtilDocuments.ImportedEmbeddedDocument({raw, document: updatedEmbeds[i], isUpdate: true}));
	}

	static async _pUpdateEmbeddedDocuments_temp (
		{
			doc,
			updateArray,
			ClsEmbed,
			isRender = true,
		},
	) {
		const updateTuples = updateArray.map(update => {
			if (!update._id) throw new Error(`Update had no "_id"!`);
			const embed = doc[ClsEmbed.metadata.collection].get(update._id);
			if (!embed) throw new Error(`${ClsEmbed.metadata.name} with id "${update._id}" not found in parent document!`);
			return {update, embed};
		});

		updateTuples.forEach(({update, embed}) => {
						foundry.utils.mergeObject(embed.system, MiscUtil.copyFast(update));

						Object.keys(embed.system._source)
				.filter(k => update[k])
				.forEach(k => foundry.utils.mergeObject(embed.system._source[k], MiscUtil.copyFast(update[k])));
		});

		return updateTuples.map(it => it.embed);
	}

	static async _pUpdateEmbeddedDocuments_standard (
		{
			doc,
			updateArray,
			ClsEmbed,
			isRender = true,
		},
	) {
		if (Config.get("misc", "isDebugDocumentOperations")) {
						updateArray.forEach(update => {
				if (!update._id) throw new Error(`Update had no "_id"!`);
				const embed = doc[ClsEmbed.metadata.collection].get(update._id);
				if (!embed) throw new Error(`${ClsEmbed.metadata.name} with id "${update._id}" not found in parent document!`);
			});
		}

		let updatedEmbedsRaw;
		const flatUpdateArray = updateArray.map(it => foundry.utils.flattenObject(it));

						if (UtilCompat.isEffectMacroActive()) {
			updatedEmbedsRaw = (
				await flatUpdateArray
					.pSerialAwaitMap(flatUpdate => {
						return doc.updateEmbeddedDocuments(
							ClsEmbed.metadata.name,
							[flatUpdate],
							{render: isRender},
						);
					})
			)
				.flat();
		} else {
			updatedEmbedsRaw = await doc.updateEmbeddedDocuments(
				ClsEmbed.metadata.name,
				flatUpdateArray,
				{render: isRender},
			);
		}

		if (updateArray.length === updatedEmbedsRaw.length) {
			return updatedEmbedsRaw;
		}

				return updateArray.map(({_id}) => updateArray.find(it => it.id === _id) || doc[ClsEmbed.metadata.collection].get(_id));
	}

	static async pDeleteEmbeddedDocuments (
		doc,
		deleteArray,
		{
			isTemporary = false,
			ClsEmbed,
		},
	) {
		if (Config.get("misc", "isDebugDocumentOperations")) console.debug(...LGTD, `Deleting ${deleteArray?.length || 0} embedded "${ClsEmbed.metadata.name}" document(s)`, deleteArray);

		if (!deleteArray?.length) return [];

		if (this.isTempDocument({doc, isTemporary})) {
			throw new Error(`Deleting embedded documents from a temporary document is not supported! This is a bug!`);
		} else {
			await doc.deleteEmbeddedDocuments(ClsEmbed.metadata.name, deleteArray);
		}

			}
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
//#region UtilCompendium
class UtilCompendium {
	static getAvailablePacks ({folderType}) {
		return game.packs.filter(it => !it.locked && it.metadata.type === folderType);
	}

	static async pGetUserCreatePack ({folderType}) {
		const $dispPackName = $(`<div class="w-100 italic"></div>`);
		const packLabel = await InputUiUtil.pGetUserString({
			title: `Enter New "${folderType}" Compendium Name`,
			fnIsValid: str => Parser.stringToSlug(str).length,
			$elePost: $$`<label class="mb-2 split-v-center ve-muted">
					<div class="mr-2 bold no-wrap">Compendium ID:</div>
					${$dispPackName}
				</label>`,
			cbPostRender: ({comp, propValue}) => {
				const hkId = () => $dispPackName.text(comp._state[propValue] ? (Parser.stringToSlug(comp._state[propValue]) || "(Invalid)") : "\u2014");
				comp._addHookBase(propValue, hkId);
				hkId();
			},
		});
		if (!packLabel || !packLabel.trim()) return null;

		return CompendiumCollection.createCompendium({
			type: "Item",
			label: packLabel,
			name: Parser.stringToSlug(packLabel),
			package: "world",
		});
	}

	static $getSelCompendium ({availablePacks = null, folderType = null}) {
		availablePacks = availablePacks || this.getAvailablePacks({folderType});
		return $(`<select class="form-control m-0">
			${availablePacks.map((pack) => `<option value="${pack.collection}">${pack.metadata.label}</option>`).join("")}
		</select>`);
	}

	static getPackByCollection ({collection}) {
		if (collection == null) return null;
		return game.packs.find(it => it.collection === collection);
	}

	
		static async pGetCreateBackingCompendium (
		{
			type,
			label,
			name,
			isOptional = false,
			optionalPromptHtmlDescription = null,
			isRender = true,
		},
	) {
		const packKey = `world.${name}`;

		const existingCompendium = game.packs.get(packKey);
		if (existingCompendium) {
			await existingCompendium.configure({
				ownership: this._pGetCreateBackingCompendium_getOwnership(),
			});
			return existingCompendium;
		}

		if (
			isOptional
		) {
			const isContinue = await InputUiUtil.pGetUserBoolean({
				title: "Create Backing Compendium?",
				htmlDescription: optionalPromptHtmlDescription,
			});
			if (!isContinue) return null;
		}

		const folderId = await this._pGetCreateBackingCompendium_pGetCreateFolderId({isRender});

		const pack = await CompendiumCollection.createCompendium({
			type,
			label,
			name,
			package: "world",
		});

		await pack.setFolder(folderId);

		await pack.configure({
			ownership: this._pGetCreateBackingCompendium_getOwnership(),
		});

		return pack;
	}

	static _pGetCreateBackingCompendium_getOwnership () {
		return Object.fromEntries(
			Object.keys(CONST.USER_ROLES)
				.filter(k => k !== "NONE")
				.map(k => [k, "OWNER"]),
		);
	}

	static async _pGetCreateBackingCompendium_pGetCreateFolderId ({isRender}) {
		try {
			return (await this._pGetCreateBackingCompendium_pGetCreateFolderId_({isRender}));
		} catch (e) {
			console.warn(...LGT, `Failed to create backing compendium folder: ${e.message}.`);
			return null;
		}
	}

	static async _pGetCreateBackingCompendium_pGetCreateFolderId_ ({isRender}) {
		return UtilFolders.pCreateFoldersGetId({
			folderType: "Compendium",
			folderNames: [`${SharedConsts.MODULE_TITLE_FAKE}`],
			sorting: "m",
			color: "#9e1612",
			isRender,
		});
	}
}
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
        return $(`<button class="btn ve-btn-primary mr-2">${opts.buttonText || "OK"}</button>`).click(evt=>{
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
        return $(`<button class="btn ve-btn-default">Cancel</button>`).click(evt=>{
            evt.stopPropagation();
            doClose(false);
        }
        );
    }

    static _$getBtnSkip({comp=null, opts, doClose}) {
        return !opts.isSkippable ? null : $(`<button class="btn ve-btn-default ml-3">Skip</button>`).click(evt=>{
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

        const $btnTrueRemember = opts.textYesRemember ? $(`<button class="btn ve-btn-primary ve-flex-v-center mr-2"><span class="glyphicon glyphicon-ok mr-2"></span><span>${opts.textYesRemember}</span></button>`).click(()=>{
            doClose(true, true);
            if (opts.fnRemember) {
                opts.fnRemember(true);
            } else {
                opts.isGlobal ? StorageUtil.pSet(opts.storageKey, true) : StorageUtil.pSetForPage(opts.storageKey, true);
            }
        }
        ) : null;

        const $btnTrue = $(`<button class="btn ve-btn-primary ve-flex-v-center mr-3"><span class="glyphicon glyphicon-ok mr-2"></span><span>${opts.textYes || "OK"}</span></button>`).click(evt=>{
            evt.stopPropagation();
            doClose(true, true);
        }
        );

        const $btnFalse = opts.isAlert ? null : $(`<button class="btn ve-btn-default btn-sm ve-flex-v-center"><span class="glyphicon glyphicon-remove mr-2"></span><span>${opts.textNo || "Cancel"}</span></button>`).click(evt=>{
            evt.stopPropagation();
            doClose(true, false);
        }
        );

        const $btnSkip = !opts.isSkippable ? null : $(`<button class="btn ve-btn-default btn-sm ml-3"><span class="glyphicon glyphicon-forward"></span><span>${opts.textSkip || "Skip"}</span></button>`).click(evt=>{
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
            const $btn = $$`<div class="m-2 btn ${v.buttonClass || "ve-btn-default"} ui__btn-xxl-square ve-flex-col ve-flex-h-center">
					${v.iconClass ? `<div class="ui-icn__wrp-icon ${v.iconClass} mb-1"></div>` : ""}
					${v.iconContent ? v.iconContent : ""}
					<div class="whitespace-normal w-100">${v.name}</div>
				</div>`.click(()=>{
                lastIx = i;
                onclicks.forEach(it=>it());
            }
            ).toggleClass(v.buttonClassActive || "active", opts.default === i);
            if (v.buttonClassActive && opts.default === i) {
                $btn.removeClass("ve-btn-default").addClass(v.buttonClassActive);
            }

            onclicks.push(()=>{
                $btn.toggleClass(v.buttonClassActive || "active", lastIx === i);
                if (v.buttonClassActive)
                    $btn.toggleClass("ve-btn-default", lastIx !== i);
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
                $btns.push($(`<button class="btn ve-btn-default btn-xxs absolute">${steps[i]}</button>`).css({
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
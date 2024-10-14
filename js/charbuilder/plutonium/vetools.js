globalThis.VeLock = function({name=null, isDbg=false}={}) {
    this._name = name;
    this._isDbg = isDbg;
    this._lockMeta = null;

    this._getCaller = ()=>{
        return (new Error()).stack.split("\n")[3].trim();
    }
    ;

    this.pLock = async({token=null}={})=>{
        if (token != null && this._lockMeta?.token === token) {
            ++this._lockMeta.depth;
            if (this._isDbg)
                console.warn(`Lock "${this._name || "(unnamed)"}" add (now ${this._lockMeta.depth}) at ${this._getCaller()}`);
            return token;
        }

        while (this._lockMeta)
            await this._lockMeta.lock;

        if (this._isDbg)
            console.warn(`Lock "${this._name || "(unnamed)"}" acquired at ${this._getCaller()}`);

        let unlock = null;
        const lock = new Promise(resolve=>unlock = resolve);
        this._lockMeta = {
            lock,
            unlock,
            token: CryptUtil.uid(),
            depth: 0,
        };

        return this._lockMeta.token;
    }
    ;

    this.unlock = ()=>{
        if (!this._lockMeta)
            return;

        if (this._lockMeta.depth > 0) {
            if (this._isDbg)
                console.warn(`Lock "${this._name || "(unnamed)"}" sub (now ${this._lockMeta.depth - 1}) at ${this._getCaller()}`);
            return --this._lockMeta.depth;
        }

        if (this._isDbg)
            console.warn(`Lock "${this._name || "(unnamed)"}" released at ${this._getCaller()}`);

        const lockMeta = this._lockMeta;
        this._lockMeta = null;
        lockMeta.unlock();
    }
    ;
}
;
class Vetools {
    static PRERELEASE_INDEX__SOURCE = {};
    static PRERELEASE_INDEX__PROP = {};
    static PRERELEASE_INDEX__META = {};

    static BREW_INDEX__SOURCE = {};
    static BREW_INDEX__PROP = {};
    static BREW_INDEX__META = {};

    static async pDoPreload() {
        if (Config.get("dataSources", "isNoPrereleaseBrewIndexes")){
            console.error(`Failed to get urlRoot from 'dataSources' with key 'isNoPrereleaseBrewIndexes'. Is config uninitialized?`);
            return;
        }

        await Vetools._pGetPrereleaseBrewIndices().then(({propPrerelease, sourcePrerelease, metaPrerelease, sourceBrew, propBrew, metaBrew})=>{
            Vetools.PRERELEASE_INDEX__PROP = propPrerelease;
            Vetools.PRERELEASE_INDEX__SOURCE = sourcePrerelease;
            Vetools.PRERELEASE_INDEX__META = metaPrerelease;

            Vetools.BREW_INDEX__PROP = propBrew;
            Vetools.BREW_INDEX__SOURCE = sourceBrew;
            Vetools.BREW_INDEX__META = metaBrew;

            console.log(...LGT, "Loaded prerelease/homebrew indexes.");
        }
        ).catch(e=>{
            Vetools.PRERELEASE_INDEX__SOURCE = {};
            Vetools.PRERELEASE_INDEX__PROP = {};
            Vetools.PRERELEASE_INDEX__META = {};

            Vetools.BREW_INDEX__PROP = {};
            Vetools.BREW_INDEX__SOURCE = {};
            Vetools.BREW_INDEX__META = {};

            //ui.notifications
            console.error(`Failed to load prerelease/homebrew indexes! ${VeCt.STR_SEE_CONSOLE}`);
            setTimeout(()=>{ throw e; });
        });
    }

    static withUnpatchedDiceRendering(fn) {
        Renderer.getRollableEntryDice = Vetools._CACHED_GET_ROLLABLE_ENTRY_DICE;
        const out = fn();
        Renderer.getRollableEntryDice = Vetools._PATCHED_GET_ROLLABLE_ENTRY_DICE;
        return out;
    }

    static withCustomDiceRenderingPatch(fn, fnRender) {
        Renderer.getRollableEntryDice = fnRender;
        const out = fn();
        Renderer.getRollableEntryDice = Vetools._PATCHED_GET_ROLLABLE_ENTRY_DICE;
        return out;
    }

    static getCleanDiceString(diceString) {
        return diceString.replace(/×/g, "*").replace(/÷/g, "/").replace(/#\$.*?\$#/g, "0");
    }

    static doMonkeyPatchPreConfig() {
        VeCt.STR_SEE_CONSOLE = "See the console (F12 or CTRL+SHIFT+J) for details.";

        //TEMPFIX
       /*  StorageUtil.pSet = GameStorage.pSetClient.bind(GameStorage);
        StorageUtil.pGet = GameStorage.pGetClient.bind(GameStorage);
        StorageUtil.pRemove = GameStorage.pRemoveClient.bind(GameStorage); */

        ["monster", "vehicle", "object", "trap", "race", "background"].forEach(prop=>{
            const propFullName = `${prop}Name`;
            const propFullSource = `${prop}Source`;
            (Renderer[prop].CHILD_PROPS_EXTENDED || Renderer[prop].CHILD_PROPS || ["feature"]).forEach(propChild=>{
                const propChildFull = `${prop}${propChild.uppercaseFirst()}`;
                if (UrlUtil.URL_TO_HASH_BUILDER[propChildFull])
                    return;
                UrlUtil.URL_TO_HASH_BUILDER[propChildFull] = it=>UrlUtil.encodeForHash([it.name, it[propFullName], it[propFullSource], it.source]);
            });
        });
    }

    static _CACHED_DATA_UTIL_LOAD_JSON = null;
    static _CACHED_DATA_UTIL_LOAD_RAW_JSON = null;

    static doMonkeyPatchPostConfig() {
        JqueryExtension.init();
        this._initSourceLookup();

        //TEMPFIX UtilsChangelog._RELEASE_URL = "https://github.com/TheGiddyLimit/plutonium-next/tags";

        const hkSetRendererUrls = ()=>{
            Renderer.get().setBaseUrl(Vetools.BASE_SITE_URL);

            if (Config.get("import", "isUseLocalImages")) {
                const localImageDirPath = `${Config.get("import", "localImageDirectoryPath")}/`.replace(/\/+$/, "/");
                Renderer.get().setBaseMediaUrl("img", localImageDirPath);
                return;
            }

            if (this._isCustomBaseSiteUrl()) {
                Renderer.get().setBaseMediaUrl("img", Vetools.BASE_SITE_URL);
                return;
            }

            Renderer.get().setBaseMediaUrl("img", null);
        }
        ;
        hkSetRendererUrls();

        if(SETTINGS.USE_FVTT){UtilHooks.on(UtilHooks.HK_CONFIG_UPDATE, hkSetRendererUrls);}

        Renderer.hover.MIN_Z_INDEX = Consts.Z_INDEX_MAX_FOUNDRY + 1;
        Renderer.hover._MAX_Z_INDEX = Renderer.hover.MIN_Z_INDEX + 10;

        Vetools._CACHED_GET_ROLLABLE_ENTRY_DICE = Renderer.getRollableEntryDice;
        Vetools._PATCHED_GET_ROLLABLE_ENTRY_DICE = (entry,name,toDisplay,{isAddHandlers=true, pluginResults=null, }={},)=>{
            const cpy = MiscUtil.copy(entry);

            if (typeof cpy.toRoll !== "string") {
                cpy.toRoll = Renderer.legacyDiceToString(cpy.toRoll);
            }

            if (cpy.prompt) {
                const minAdditionalDiceLevel = Math.min(...Object.keys(cpy.prompt.options).map(it=>Number(it)).filter(it=>cpy.prompt.options[it]));
                cpy.toRoll = cpy.prompt.options[minAdditionalDiceLevel];
            }

            const toRollClean = this.getCleanDiceString(cpy.toRoll);

            if (Config.get("import", "isRendererDiceDisabled"))
                return toDisplay || toRollClean;

            const ptDisplay = toRollClean.toLowerCase().trim() !== toDisplay.toLowerCase().trim() ? `{${toDisplay}}` : "";

            if (cpy.autoRoll)
                return `[[${toRollClean}]]${ptDisplay}`;

            if (Config.get("import", "isRenderCustomDiceEnrichers") && entry.subtype === "damage") {
                return `[[/damage ${toRollClean} ${cpy.damageType ? `type=${cpy.damageType}` : ""}]]${ptDisplay}`;
            }

            return `[[/r ${toRollClean}]]${ptDisplay}`;
        }
        ;

        Renderer.getRollableEntryDice = Vetools._PATCHED_GET_ROLLABLE_ENTRY_DICE;

        const cachedRenderHoverMethods = {};
        const renderHoverMethods = ["$getHoverContent_stats", "$getHoverContent_fluff", "$getHoverContent_statsCode", "$getHoverContent_miscCode", "$getHoverContent_generic", ];
        renderHoverMethods.forEach(methodName=>{
            cachedRenderHoverMethods[methodName] = Renderer.hover[methodName];
            Renderer.hover[methodName] = (...args)=>{
                Renderer.getRollableEntryDice = Vetools._CACHED_GET_ROLLABLE_ENTRY_DICE;
                const out = cachedRenderHoverMethods[methodName](...args);
                Renderer.getRollableEntryDice = Vetools._PATCHED_GET_ROLLABLE_ENTRY_DICE;
                return out;
            }
            ;
        }
        );

        const cachedGetMakePredefinedHover = Renderer.hover.getMakePredefinedHover.bind(Renderer.hover);
        Renderer.hover.getMakePredefinedHover = (entry,opts)=>{
            const out = cachedGetMakePredefinedHover(entry, opts);
            out.html = `data-plut-hover="${true}" data-plut-hover-preload="${true}" data-plut-hover-preload-id="${out.id}" ${opts ? `data-plut-hover-preload-options="${JSON.stringify(opts).qq()}"` : ""}`;
            return out;
        }
        ;

        const cachedGetInlineHover = Renderer.hover.getInlineHover.bind(Renderer.hover);
        Renderer.hover.getInlineHover = (entry,opts)=>{
            const out = cachedGetInlineHover(entry, opts);
            out.html = `data-plut-hover="${true}" data-plut-hover-inline="${true}" data-plut-hover-inline-entry="${JSON.stringify(entry).qq()}" ${opts ? `data-plut-hover-inline-options="${JSON.stringify(opts).qq()}"` : ""}`;
            return out;
        }
        ;

        Renderer.dice.rollerClick = (evtMock,ele,packed,name)=>{
            const entry = JSON.parse(packed);
            if (entry.toRoll)
                (new Roll(entry.toRoll)).toMessage();
        }
        ;

        Renderer.dice.pRollEntry = (entry,rolledBy,opts)=>{
            if (entry.toRoll)
                (new Roll(entry.toRoll)).toMessage();
        }
        ;

        Renderer.dice.pRoll2 = async(str,rolledBy,opts)=>{
            const roll = new Roll(str);
            await roll.evaluate({
                async: true
            });
            await roll.toMessage();
            return roll.total;
        }
        ;

        if(SETTINGS.USE_FVTT){
            Vetools._CACHED_MONSTER_DO_BIND_COMPACT_CONTENT_HANDLERS = Renderer.monster.doBindCompactContentHandlers;
            Renderer.monster.doBindCompactContentHandlers = (opts)=>{
            const nxtOpts = {
                ...opts
            };
            nxtOpts.fnRender = (...args)=>Vetools.withUnpatchedDiceRendering(()=>opts.fnRender(...args));
            return Vetools._CACHED_MONSTER_DO_BIND_COMPACT_CONTENT_HANDLERS(nxtOpts);
            };
        }
        

        JqueryUtil.doToast = (options)=>{
            if (typeof options === "string") {
                options = {
                    content: options,
                    type: "info",
                };
            }
            options.type = options.type || "info";

            switch (options.type) {
            case "warning":
                return ui.notifications.warn(options.content);
            case "danger":
                return ui.notifications.error(options.content);
            default:
                return ui.notifications.info(options.content);
            }
        };

        if(SETTINGS.USE_FVTT){
            //Switches pGetShowModal to instead use the FoundryVTT Application class
            UiUtil.pGetShowModal = opts=>UtilApplications.pGetShowApplicationModal(opts);
            InputUiUtil._pGetShowModal = opts=>UtilApplications.pGetShowApplicationModal(opts);
        }
        

        this._CACHED_DATA_UTIL_LOAD_JSON = DataUtil.loadJSON.bind(DataUtil);
        this._CACHED_DATA_UTIL_LOAD_RAW_JSON = DataUtil.loadRawJSON.bind(DataUtil);

        DataUtil.loadJSON = async(url,...rest)=>Vetools._CACHED_DATA_UTIL_LOAD_JSON(this._getMaybeLocalUrl(url), ...rest);
        DataUtil.loadRawJSON = async(url,...rest)=>Vetools._CACHED_DATA_UTIL_LOAD_RAW_JSON(this._getMaybeLocalUrl(url), ...rest);

        Vetools._CACHED_RENDERER_HOVER_CACHE_AND_GET = DataLoader.pCacheAndGet.bind(DataLoader);
        DataLoader.pCacheAndGet = async function(page, source, ...others) {
            const sourceLower = `${source}`.toLowerCase();
            if (!Vetools._VET_SOURCE_LOOKUP[sourceLower]) {
                Vetools._pCachingLocalPrerelease = Vetools._pCachingLocalPrerelease || Vetools._pDoCacheLocalPrerelease();
                Vetools._pCachingLocalBrew = Vetools._pCachingLocalBrew || Vetools._pDoCacheLocalBrew();

                await Promise.all([Vetools._pCachingLocalPrerelease, Vetools._pCachingLocalBrew, ]);
            }

            return Vetools._CACHED_RENDERER_HOVER_CACHE_AND_GET(page, source, ...others);
        }
        ;

        PrereleaseUtil._storage = new StorageUtilMemory();
        BrewUtil2._storage = new StorageUtilMemory();
    }

    static _initSourceLookup() {
        Object.keys(Parser.SOURCE_JSON_TO_FULL).forEach(source=>Vetools._VET_SOURCE_LOOKUP[source.toLowerCase()] = true);
    }

    static _pCachingLocalPrerelease = null;
    static _pCachingLocalBrew = null;

    static async _pDoCacheLocalPrerelease() {
        await this.pGetLocalPrereleaseSources();
    }
    static async _pDoCacheLocalBrew() {
        await this.pGetLocalBrewSources();
    }

    static _getMaybeLocalUrl(url) {
        if (!url.includes("?"))
            url = `${url}?t=${Consts.RUN_TIME}`;

        const parts = url.split(Vetools._RE_HTTP_URL).filter(Boolean);
        parts[parts.length - 1] = parts.last().replace(/\/+/g, "/");
        url = parts.join("");

        if (!Config.get("dataSources", "isNoLocalData") && (url.startsWith(`${Vetools.BASE_SITE_URL}data/`) || url.startsWith(`${Vetools.BASE_SITE_URL}search/`)) && url !== this._getChangelogUrl()) {
            const urlPart = url.split(Vetools.BASE_SITE_URL).slice(1).join(Vetools.BASE_SITE_URL);
            if(SETTINGS.LOCALPATH_REDIRECT){return urlPart;}
            return `modules/${SharedConsts.MODULE_ID}/${urlPart}`;
        } else {
            return url;
        }
    }

    static _CACHE_IMPORTER_SOURCE_SPECIAL = {};

    static async pLoadImporterSourceSpecial(source) {
        if (!source.special.cacheKey)
            return source.special.pGet();

        this._CACHE_IMPORTER_SOURCE_SPECIAL[source.special.cacheKey] = this._CACHE_IMPORTER_SOURCE_SPECIAL[source.special.cacheKey] || source.special.pGet();

        return this._CACHE_IMPORTER_SOURCE_SPECIAL[source.special.cacheKey];
    }

    static _getChangelogUrl() {
        return `${Vetools.BASE_SITE_URL}data/changelog.json`;
    }
    static async pGetChangelog() {
        return DataUtil.loadJSON(this._getChangelogUrl());
    }

    static async pGetPackageIndex() {
        return DataUtil.loadJSON(Config.get("importAdventure", "indexUrl"));
    }

    static async pGetItems() {
        return {
            item: (await Renderer.item.pBuildList()).filter(it=>!it._isItemGroup)
        };
    }

    static async pGetPrereleaseItems(data) {
        return this._pGetPrereleaseBrewItems({
            data,
            pFnGetItems: Renderer.item.pGetItemsFromPrerelease.bind(Renderer.item)
        });
    }

    static async pGetBrewItems(data) {
        return this._pGetPrereleaseBrewItems({
            data,
            pFnGetItems: Renderer.item.pGetItemsFromBrew.bind(Renderer.item)
        });
    }

    static async _pGetPrereleaseBrewItems({data, pFnGetItems}) {
        const sources = new Set();
        ["item", "magicvariant", "baseitem"].forEach(prop=>{
            if (!data[prop])
                return;
            data[prop].forEach(ent=>sources.add(SourceUtil.getEntitySource(ent)));
        }
        );
        return (await pFnGetItems()).filter(ent=>sources.has(SourceUtil.getEntitySource(ent)));
    }

    static async pGetRaces(opts) {
        return DataUtil.race.loadJSON(opts);
    }

    static async pGetClasses() {
        return DataUtil.class.loadRawJSON();
    }

    static async pGetClassSubclassFeatures() {
        return DataUtil.class.loadRawJSON();
    }

    static async pGetRollableTables() {
        return DataUtil.table.loadJSON();
    }

    static async pGetDecks() {
        return DataUtil.deck.loadJSON();
    }

    static async _pGetAdventureBookIndex(filename, {prop, fnGetUrl}) {
        const url = `${Vetools.BASE_SITE_URL}data/${filename}`;
        const index = await DataUtil.loadJSON(url);
        index[prop].forEach(it=>{
            it._pubDate = new Date(it.published || "1970-01-01");
            it._url = fnGetUrl(it.id);
        }
        );
        return index;
    }

    static async pGetAdventureIndex() {
        return this._pGetAdventureBookIndex("adventures.json", {
            prop: "adventure",
            fnGetUrl: Vetools.getAdventureUrl.bind(Vetools)
        });
    }

    static async pGetBookIndex() {
        return this._pGetAdventureBookIndex("books.json", {
            prop: "book",
            fnGetUrl: Vetools.getBookUrl.bind(Vetools)
        });
    }

    static _getAdventureBookUrl(type, id) {
        return `${Vetools.BASE_SITE_URL}data/${type}/${type}-${id.toLowerCase()}.json`;
    }

    static getAdventureUrl(id) {
        return this._getAdventureBookUrl("adventure", id);
    }

    static getBookUrl(id) {
        return this._getAdventureBookUrl("book", id);
    }

    static pGetImageUrlFromFluff(fluff) {
        if (!fluff?.images?.length)
            return;

        const imgEntry = fluff.images[0];
        if (!imgEntry?.href)
            return;

        const urlsWarn = [];
        const out = fluff.images.first(imgEntry=>{
            const url = this._pGetImageUrlFromFluff_getUrlFromEntry({
                imgEntry
            });
            if (!this._isValidImageUrl({
                url
            })) {
                urlsWarn.push(url);
                return null;
            }
            return url;
        }
        );

        if (urlsWarn.length)
            ui.notifications.warn(`Image URL${urlsWarn.length === 1 ? "" : "s"} did not have valid extensions: ${urlsWarn.map(it=>`"${it}"`).join(", ")}`);

        return out;
    }

    static _pGetImageUrlFromFluff_getUrlFromEntry({imgEntry}) {
        if (imgEntry.href.type === "internal") {
            return imgEntry.href.path ? `${Vetools.getInternalImageUrl(imgEntry.href.path)}` : null;
        }

        if (imgEntry.href.type === "external") {
            return imgEntry.href.url ? imgEntry.href.url : null;
        }
    }

    static _isValidImageUrl({url}) {
        return foundry.data.validators.hasFileExtension(url, Object.keys(CONST.IMAGE_FILE_EXTENSIONS));
    }

    static async pHasTokenUrl(entityType, it, opts) {
        return (await Vetools._pGetTokenUrl(entityType, it, opts))?.hasToken;
    }

    static async pGetTokenUrl(entityType, it, opts) {
        return (await Vetools._pGetTokenUrl(entityType, it, opts))?.url;
    }

    static _isSaveableToServerUrl(originalUrl) {
        return originalUrl && typeof originalUrl === "string" && Vetools._RE_HTTP_URL.test(originalUrl);
    }
    static _isSaveTypedImagesToServer({imageType="image"}={}) {
        switch (imageType) {
        case "image":
            return Config.get("import", "isSaveImagesToServer");
        case "token":
            return Config.get("import", "isSaveTokensToServer");
        default:
            throw new Error(`Unhandled type "${imageType}"!`);
        }
    }

    static async _pGetTokenUrl(entityType, it, {isSilent=false}={}) {
        if (it.tokenUrl)
            return {
                url: it.tokenUrl,
                hasToken: true
            };

        const fallbackMeta = {
            url: this.getBlankTokenUrl(),
            hasToken: false,
        };

        switch (entityType) {
        case "monster":
        case "vehicle":
        case "object":
            {
                const fnGets = {
                    "monster": Renderer.monster.getTokenUrl,
                    "vehicle": Renderer.vehicle.getTokenUrl,
                    "object": Renderer.object.getTokenUrl,
                };
                const fnGet = fnGets[entityType];
                if (!fnGet)
                    throw new Error(`Missing getter!`);

                if (it.hasToken)
                    return {
                        url: fnGet(it),
                        hasToken: true
                    };
                if (it._versionBase_hasToken)
                    return {
                        url: fnGet({
                            name: it._versionBase_name,
                            source: it._versionBase_source
                        }),
                        hasToken: true
                    };

                return fallbackMeta;
            }
        case "trap":
            return fallbackMeta;
        default:
            {
                if (isSilent)
                    return null;
                throw new Error(`Unhandled entity type "${entityType}"`);
            }
        }
    }

    static getBlankTokenUrl() {
        return UrlUtil.link(`${Renderer.get().baseMediaUrls["img"] || Renderer.get().baseUrl}img/blank.png`);
    }

    static getImageUrl(entry) {
        if (entry?.href.type === "internal")
            return Vetools.getInternalImageUrl(entry.href.path, {
                isSkipEncode: true
            });
        return entry.href?.url;
    }

    static getInternalImageUrl(path, {isSkipEncode=false}={}) {
        if (!path)
            return null;
        const fnEncode = isSkipEncode ? it=>it : encodeURI;

        const out = `${fnEncode(Renderer.get().baseMediaUrls["img"] || Renderer.get().baseUrl)}img/${fnEncode(path)}`;

        if (isSkipEncode)
            return out;
        return out.replace(/'/g, "%27");
    }

    static async pOptionallySaveImageToServerAndGetUrl(originalUrl, {imageType="image"}={}) {
        if (this._isLocalUrl({
            originalUrl
        }))
            return originalUrl;
        if (!this._isSaveTypedImagesToServer({
            imageType
        }))
            return originalUrl;
        return this.pSaveImageToServerAndGetUrl({
            originalUrl
        });
    }

    static _isLocalUrl({originalUrl}) {
        return new URL(document.baseURI).origin === new URL(originalUrl,document.baseURI).origin;
    }

    static getImageSavedToServerUrl({originalUrl=null, path, isSaveToRoot=false}={}) {
        if (!path && !this._isSaveableToServerUrl(originalUrl))
            return originalUrl;

        const pathPart = (new URL(path ? `https://example.com/${path}` : originalUrl)).pathname;
        return `${isSaveToRoot ? "" : `${Config.get("import", "localImageDirectoryPath")}/`}${decodeURI(pathPart)}`.replace(/\/+/g, "/");
    }

    static _getImageSavedToServerUrlMeta({originalUrl=null, path, isSaveToRoot=false}) {
        const cleanOutPath = this.getImageSavedToServerUrl({
            originalUrl,
            path,
            isSaveToRoot
        });
        const serverUrlPathParts = cleanOutPath.split("/");
        const serverUrlDirParts = serverUrlPathParts.slice(0, -1);
        const serverUrlDir = serverUrlDirParts.join("/");

        return {
            serverUrl: cleanOutPath,
            serverUrlPathParts,
            serverUrlDir,
            serverUrlDirParts,
        };
    }

    static async pSaveImageToServerAndGetUrl({originalUrl=null, blob, force=false, path=null, isSaveToRoot=false}={}) {
        if (blob && originalUrl)
            throw new Error(`"blob" and "originalUrl" arguments are mutually exclusive!`);

        if (!blob && !this._isSaveableToServerUrl(originalUrl))
            return originalUrl;

        let out;
        try {
            await Vetools._LOCK_DOWNLOAD_IMAGE.pLock();
            out = await this._pSaveImageToServerAndGetUrl_({
                originalUrl,
                blob,
                force,
                path,
                isSaveToRoot
            });
        } finally {
            Vetools._LOCK_DOWNLOAD_IMAGE.unlock();
        }
        return out;
    }

    static async _pSaveImageToServerAndGetUrl_({originalUrl=null, blob, force=false, path=null, isSaveToRoot=false}={}) {
        if (blob && originalUrl)
            throw new Error(`"blob" and "originalUrl" arguments are mutually exclusive!`);

        const {serverUrl, serverUrlPathParts, serverUrlDir, serverUrlDirParts, } = this._getImageSavedToServerUrlMeta({
            originalUrl,
            path,
            isSaveToRoot
        });

        const {dirListing, isDirExists, isError: isErrorDirListing, } = await this.pGetDirectoryListing({
            originalUrl,
            path,
            isSaveToRoot
        });

        if (isErrorDirListing) {
            const msgStart = `Could not check for existing files when saving imported images to server!`;
            if (!force && blob)
                throw new Error(msgStart);

            const msg = `${msgStart}${force ? "" : ` The original image URL will be used instead.`}`;
            UtilNotifications.notifyOnce({
                type: "warn",
                message: msg
            });
            return force ? serverUrl : originalUrl;
        }

        if (dirListing?.files && dirListing?.files.map(it=>UtilFileBrowser.decodeUrl(it)).includes(serverUrl))
            return serverUrl;

        if (!this._canUploadFiles()) {
            if (!force && blob)
                throw new Error(`Your permission levels do not allow you to upload files!`);

            const msg = `You have the "Save Imported Images to Server" config option enabled, but your permission levels do not allow you to upload files!${force ? "" : ` The original image URL will be used instead.`}`;
            UtilNotifications.notifyOnce({
                type: "warn",
                message: msg
            });
            return force ? serverUrl : originalUrl;
        }

        if (!isDirExists) {
            try {
                await this._pSaveImageToServerAndGetUrl_pCreateDirectories(serverUrlDirParts);
            } catch (e) {
                const msgStart = `Could not create required directories when saving imported images to server!`;
                if (!force && blob)
                    throw new Error(msgStart);

                const msg = `${msgStart}${force ? "" : ` The original image URL will be used instead.`}`;
                UtilNotifications.notifyOnce({
                    type: "warn",
                    message: msg
                });
                return force ? serverUrl : originalUrl;
            }
        }

        try {
            blob = blob || await this._pSaveImageToServerAndGetUrl_pGetBlob(originalUrl);
        } catch (e) {
            const msg = `Failed to download image "${originalUrl}" when saving imported images to server!${force ? "" : ` The original image URL will be used instead.`} ${VeCt.STR_SEE_CONSOLE}`;
            UtilNotifications.notifyOnce({
                type: "warn",
                message: msg
            });
            console.error(...LGT, e);
            return force ? serverUrl : originalUrl;
        }

        const name = serverUrlPathParts.last();
        let mimeType = `image/${(name.split(".").last() || "").trim().toLowerCase()}`;
        if (mimeType === "image/jpg")
            mimeType = "image/jpeg";

        const resp = await FilePicker.upload("data", serverUrlDir, new File([blob],name,{
            lastModified: Date.now(),
            type: mimeType,
        },), {}, {
            notify: false,
        }, );
        if (resp?.path)
            return UtilFileBrowser.decodeUrl(resp.path);

        return force ? serverUrl : originalUrl;
    }

    static async _pSaveImageToServerAndGetUrl_pGetBlob(originalUrl) {
        const isBackend = await UtilBackend.pGetBackendVersion();

        try {
            const blobResp = await fetch(originalUrl);
            return blobResp.blob();
        } catch (e) {
            if (!isBackend)
                throw e;
            console.warn(...LGT, `Could not directly load image from ${originalUrl}\u2014falling back on alternate loader (backend mod).`);
        }

        const blobResp = await fetch(Config.backendEndpoint, {
            method: "post",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type: "getBinaryData",
                url: originalUrl,
            }),
        }, );
        return blobResp.blob();
    }

    static async _pSaveImageToServerAndGetUrl_pCreateDirectories(serverUrlDirParts) {
        if (!serverUrlDirParts.length)
            return;
        for (let i = 0; i < serverUrlDirParts.length; ++i) {
            const dirPartSlice = serverUrlDirParts.slice(0, i + 1);
            try {
                await FilePicker.createDirectory("data", dirPartSlice.join("/"));
            } catch (e) {
                if (/EEXIST/.test(`${e}`))
                    continue;
                throw new Error(e);
            }
        }
    }

    static _canUploadFiles() {
        return game.isAdmin || (game.user && game.user.can("FILES_UPLOAD"));
    }

    static async pGetDirectoryListing({originalUrl=null, path=null, isSaveToRoot=false, isDirPath=false}) {
        if (originalUrl && isDirPath)
            throw new Error(`Arguments "originalUrl" and "isDirPath" are mutually exclusive`);
        if (!path && isDirPath)
            throw new Error(`Argument "isDirPath" requires the "path" argument to be passed!`);

        const {serverUrlDir} = this._getImageSavedToServerUrlMeta({
            originalUrl,
            path: path && isDirPath ? `${path}/stub` : path,
            isSaveToRoot,
        });

        let dirListing = null;
        let isDirExists = false;
        let isError = false;
        try {
            dirListing = await FilePicker.browse("data", serverUrlDir);
            if (dirListing?.target)
                isDirExists = true;
        } catch (e) {
            isError = !/Directory .*? does not exist/.test(`${e}`);
        }

        return {
            dirListing,
            isDirExists,
            isError,
        };
    }

    static async pGetAllSpells({isFilterNonStandard=false, additionalSourcesPrerelease=[], additionalSourcesBrew=[], isIncludeLoadedBrew=false, isIncludeLoadedPrerelease=false, isApplyBlocklist=false, }={}, ) {
        let spells = MiscUtil.copyFast(await DataUtil.spell.pLoadAll());
        if (isFilterNonStandard)
            spells = spells.filter(sp=>!SourceUtil.isNonstandardSource(sp.source));

        if (isIncludeLoadedPrerelease) {
            const prerelease = await PrereleaseUtil.pGetBrewProcessed();
            if (prerelease.spell?.length)
                spells = spells.concat(prerelease.spell);
        }

        if (isIncludeLoadedBrew) {
            const brew = await BrewUtil2.pGetBrewProcessed();
            if (brew.spell?.length)
                spells = spells.concat(brew.spell);
        }

        const pHandleAdditionalSources = async({additionalSources, pFnLoad})=>{
            for (const src of additionalSources) {
                const json = await pFnLoad(src);
                if (!json)
                    continue;
                if (json.spell?.length)
                    spells = spells.concat(json.spell);
            }
        }
        ;

        if (additionalSourcesPrerelease?.length)
            await pHandleAdditionalSources({
                additionalSources: additionalSourcesPrerelease,
                pFnLoad: DataUtil.pLoadPrereleaseBySource.bind(DataUtil)
            });
        if (additionalSourcesBrew?.length)
            await pHandleAdditionalSources({
                additionalSources: additionalSourcesBrew,
                pFnLoad: DataUtil.pLoadBrewBySource.bind(DataUtil)
            });

        if (isApplyBlocklist) {
            spells = spells.filter(sp=>!ExcludeUtil.isExcluded(UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_SPELLS](sp), "spell", sp.source, {
                isNoCount: true
            }, ), );
        }

        spells.forEach(sp=>Renderer.spell.initBrewSources(sp));

        return {
            spell: spells
        };
    }

    static async pGetAllCreatures(isFilterNonStandard=false) {
        let creatures = await DataUtil.monster.pLoadAll();

        if (isFilterNonStandard)
            creatures = creatures.filter(mon=>!SourceUtil.isNonstandardSource(mon.source));

        return {
            monster: creatures
        };
    }

    static async _pGetPrereleaseBrewIndices() {
        const out = {
            sourcePrerelease: {},
            propPrerelease: {},
            metaPrerelease: {},

            sourceBrew: {},
            propBrew: {},
            metaBrew: {},
        };

        try {
            const [sourceIndexPrerelease,propIndexPrerelease,metaIndexPrerelease,
            sourceIndexBrew,propIndexBrew,metaIndexBrew,] = await Promise.all([
                DataUtil.prerelease.pLoadSourceIndex(Config.get("dataSources", "basePrereleaseUrl")),
                DataUtil.prerelease.pLoadPropIndex(Config.get("dataSources", "basePrereleaseUrl")),
                DataUtil.prerelease.pLoadMetaIndex(Config.get("dataSources", "basePrereleaseUrl")),
                DataUtil.brew.pLoadSourceIndex(Config.get("dataSources", "baseBrewUrl")),
                DataUtil.brew.pLoadPropIndex(Config.get("dataSources", "baseBrewUrl")),
                DataUtil.brew.pLoadMetaIndex(Config.get("dataSources", "baseBrewUrl")), ]);

            out.sourcePrerelease = sourceIndexPrerelease;
            out.propPrerelease = propIndexPrerelease;
            out.metaPrerelease = metaIndexPrerelease;

            out.sourceBrew = sourceIndexBrew;
            out.propBrew = propIndexBrew;
            out.metaBrew = metaIndexBrew;
        } catch (e) {
            ui.notifications.error(`Failed to load prerelease/homebrew index! ${VeCt.STR_SEE_CONSOLE}`);
            setTimeout(()=>{ throw e; } );
        }

        return out;
    }

    static async pGetPrereleaseSources(...dirs) {
        return this._pGetPrereleaseBrewSources({
            dirs,
            brewUtil: PrereleaseUtil,
            indexProp: Vetools.PRERELEASE_INDEX__PROP,
            indexMeta: Vetools.PRERELEASE_INDEX__META,
            configKey: "basePrereleaseUrl",
        });
    }

    /**
     * @param {string[]} ...dirs
     * @returns {Promise<{name:string, url:string, abbreviations:string[]}>}
     */
    static async pGetBrewSources(...dirs) {
        return this._pGetPrereleaseBrewSources({
            dirs,
            brewUtil: BrewUtil2,
            indexProp: Vetools.BREW_INDEX__PROP,
            indexMeta: Vetools.BREW_INDEX__META,
            configKey: "baseBrewUrl",
        });
    }

    /**
     * @param {{dirs:string[], brewUtil:any, indexProp:any, indexMeta:any, configKey:string}}
     * @returns {Promise<any>}
     */
    static async _pGetPrereleaseBrewSources({dirs, brewUtil, indexProp, indexMeta, configKey}) {
        const urlRoot = Config.get("dataSources", configKey);

        let paths;
        if (dirs.includes("*")) {
            paths = Object.values(indexProp).map(obj=>Object.keys(obj)).flat().unique();
        } else {
            paths = dirs.map(dir=>Object.keys(indexProp[brewUtil.getDirProp(dir)] || {})).flat().unique();
        }

        return paths.map((path)=>{
            const metaName = UrlUtil.getFilename(path);
            //if(!urlRoot){console.error(`Failed to get urlRoot from 'dataSources' with key '${configKey}'. Is config uninitialized?`);}
            return ({
                url: brewUtil.getFileUrl(path, urlRoot),
                name: this._getPrereleaseBrewName(path),
                abbreviations: indexMeta[metaName]?.a || [],
            });
        }
        ).sort((a,b)=>SortUtil.ascSortLower(a.name, b.name));
    }

    static _getPrereleaseBrewName(brewPath) {
        return brewPath.split("/").slice(-1).join("").replace(/\.json$/i, "");
    }

    static _LOCAL_PRERELEASE_SOURCE_SEEN_URLS = new Set();
    static async pGetLocalPrereleaseSources(...dirs) {
        return this._pGetLocalPrereleaseBrewSources({
            brewUtil: PrereleaseUtil,
            dirs,
            displayName: "prerelease",
            configKeyLocal: "localPrerelease",
            configKeyIsLoadIndex: "isLoadLocalPrereleaseIndex",
            configKeyIsUseIndex: "isUseLocalPrereleaseIndexJson",
            configKeyDirectoryPath: "localPrereleaseDirectoryPath",
            setSeenUrls: this._LOCAL_PRERELEASE_SOURCE_SEEN_URLS,
        });
    }

    static _LOCAL_BREW_SOURCE_SEEN_URLS = new Set();
    static async pGetLocalBrewSources(...dirs) {
        return this._pGetLocalPrereleaseBrewSources({
            brewUtil: BrewUtil2,
            dirs,
            displayName: "homebrew",
            configKeyLocal: "localHomebrew",
            configKeyIsLoadIndex: "isLoadLocalHomebrewIndex",
            configKeyIsUseIndex: "isUseLocalHomebrewIndexJson",
            configKeyDirectoryPath: "localHomebrewDirectoryPath",
            setSeenUrls: this._LOCAL_BREW_SOURCE_SEEN_URLS,
        });
    }
    static async _pGetLocalPrereleaseBrewSources({brewUtil, dirs, displayName, configKeyLocal, configKeyIsLoadIndex, configKeyIsUseIndex, configKeyDirectoryPath, setSeenUrls}) {
        try {
            const listLocal = await this._pGetLocalPrereleaseBrewList({
                displayName,
                configKeyIsLoadIndex,
                configKeyIsUseIndex,
                configKeyDirectoryPath,
            });

            const allFilenames = [...(listLocal || []), ...(Config.get("dataSources", configKeyLocal) || []), ];

            if (!allFilenames.length)
                return [];

            await allFilenames.pSerialAwaitMap(async name=>{
                if (setSeenUrls.has(name))
                    return;
                setSeenUrls.add(name);
                await brewUtil.pAddBrewFromUrl(name, {
                    isLazy: true
                });
            }
            );
            await brewUtil.pAddBrewsLazyFinalize();

            const brews = await allFilenames.pSerialAwaitMap(async name=>({
                url: name,
                data: await DataUtil.loadJSON(name),
                name: this._getPrereleaseBrewName(name),
            }));

            const desiredProps = new Set(dirs.map(dir=>brewUtil.getDirProp(dir)));

            return brews.filter(({data})=>{
                if (desiredProps.has("*"))
                    return true;

                const propsInBrew = new Set([...Object.keys(data || {}).filter(it=>!it.startsWith("_")), ...Object.keys(data?._meta?.includes || {}), ]);

                return [...desiredProps].some(it=>propsInBrew.has(it));
            }
            ).map(it=>{
                it.abbreviations = (it.data?._meta?.sources || []).map(it=>it.abbreviation).filter(Boolean);
                return it;
            }
            ).map(({name, url, abbreviations})=>({
                name,
                url,
                abbreviations
            }));
        } catch (e) {
            const msg = `Failed to load local homebrew index!`;
            console.error(...LGT, msg, e);
            ui.notifications.error(`${msg} ${VeCt.STR_SEE_CONSOLE}`);
        }
        return [];
    }

    static async _pGetLocalPrereleaseBrewList({displayName, configKeyIsLoadIndex, configKeyIsUseIndex, configKeyDirectoryPath}) {
        if (!Config.get("dataSources", configKeyIsLoadIndex))
            return null;

        const isUseIndexJson = Config.get("dataSources", configKeyIsUseIndex);

        if (isUseIndexJson) {
            const indexUrl = `${Config.get("dataSources", configKeyDirectoryPath)}/index.json`.replace(/\/+/g, "/");
            const index = await DataUtil.loadJSON(indexUrl);
            if (!index?.toImport)
                return [];
            return index.toImport.map(it=>{
                if (Vetools._RE_HTTP_URL.test(it))
                    return it;

                return [...indexUrl.split("/").slice(0, -1), it].join("/");
            }
            );
        }

        try {
            const existingFiles = await FilePicker.browse("data", Config.get("dataSources", configKeyDirectoryPath));
            if (!existingFiles?.files?.length)
                return null;

            return existingFiles.files.map(it=>decodeURIComponent(it));
        } catch (e) {
            const ptReason = /You do not have permission to browse the host file system/i.test(e.message) ? `You do not have "Use File Browser" permissions!` : `Does the ${isUseIndexJson ? "file" : "directory"} "<data_dir>/${Config.get("dataSources", configKeyDirectoryPath)}${isUseIndexJson ? "/index.json" : ""}" exist?`;
            const msg = `Failed to load local ${displayName}${isUseIndexJson ? " index" : ""}! ${ptReason}`;
            console.error(...LGT, msg, e);
            ui.notifications.error(`${msg} ${VeCt.STR_SEE_CONSOLE}`);
            return null;
        }
    }

    static async pGetSpellSideData() {
        return DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/spells/foundry.json`);
    }
    static async pGetOptionalFeatureSideData() {
        return DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-optionalfeatures.json`);
    }
    static async pGetClassSubclassSideData() {
        return DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/class/foundry.json`);
    }
    static async pGetRaceSideData() {
        return DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-races.json`);
    }
    static async pGetItemSideData() {
        return DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-items.json`);
    }
    static async pGetFeatSideData() {
        return DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-feats.json`);
    }
    static async pGetRewardSideData() {
        return DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-rewards.json`);
    }
    static async pGetActionSideData() {
        return DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-actions.json`);
    }
    static async pGetVehicleUpgradeSideData() {
        return DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-vehicles.json`);
    }
    static async pGetCreatureSideData() {
        return DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/bestiary/foundry.json`);
    }
    static async pGeBackgroundSideData() {
        return DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-backgrounds.json`);
    }
    static async pGetPsionicsSideData() {
        return DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-psionics.json`);
    }

    static async pGetConditionDiseaseSideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-conditionsdiseases.json`);
    }
    static async pGetObjectSideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-objects.json`);
    }
    static async pGetVehicleSideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-vehicles.json`);
    }
    static async pGetCharCreationOptionSideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-charcreationoptions.json`);
    }
    static async pGetCultBoonSideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-cultsboons.json`);
    }
    static async pGetTrapHazardSideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-trapshazards.json`);
    }
    static async pGetDeckSideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-decks.json`);
    }
    static async pGetDeitySideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-deities.json`);
    }
    static async pGetTableSideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-tables.json`);
    }
    static async pGetLanguageSideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-languages.json`);
    }
    static async pGetRecipeSideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-recipes.json`);
    }
    static async pGetVariantruleSideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-variantrules.json`);
    }

    static async pGetCreatureFeatureSideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-todo.json`);
    }
    static async pGetObjectFeatureSideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-todo.json`);
    }
    static async pGetVehicleFeatureSideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-todo.json`);
    }
    static async pGetTrapFeatureSideData() {
        return {} || DataUtil.loadJSON(`${Vetools.BASE_SITE_URL}data/foundry-todo.json`);
    }

    static getModuleDataUrl(filename) {
        if(SETTINGS.LOCALPATH_REDIRECT){return `data/${filename}`;}
        return `modules/${SharedConsts.MODULE_ID}/data/${filename}`;
    }

    static async pGetIconLookup(entityType) {
        return DataUtil.loadJSON(this.getModuleDataUrl(`icon-${entityType}s.json`));
    }

    static get BASE_SITE_URL() {
        if (this._isCustomBaseSiteUrl()) {
            return Util.getCleanServerUrl(Config.get("dataSources", "baseSiteUrl"));
        }
        return Vetools._BASE_SITE_URL;
    }

    static _isCustomBaseSiteUrl() {
        const val = Config.get("dataSources", "baseSiteUrl");
        return !!(val && val.trim());
    }

    static get DATA_URL_FEATS() {
        return `${Vetools.BASE_SITE_URL}data/feats.json`;
    }
    static get DATA_URL_BACKGROUNDS() {
        return `${Vetools.BASE_SITE_URL}data/backgrounds.json`;
    }
    static get DATA_URL_VARIANTRULES() {
        return `${Vetools.BASE_SITE_URL}data/variantrules.json`;
    }
    static get DATA_URL_PSIONICS() {
        return `${Vetools.BASE_SITE_URL}data/psionics.json`;
    }
    static get DATA_URL_OPTIONALFEATURES() {
        return `${Vetools.BASE_SITE_URL}data/optionalfeatures.json`;
    }
    static get DATA_URL_CONDITIONSDISEASES() {
        return `${Vetools.BASE_SITE_URL}data/conditionsdiseases.json`;
    }
    static get DATA_URL_VEHICLES() {
        return `${Vetools.BASE_SITE_URL}data/vehicles.json`;
    }
    static get DATA_URL_REWARDS() {
        return `${Vetools.BASE_SITE_URL}data/rewards.json`;
    }
    static get DATA_URL_OBJECTS() {
        return `${Vetools.BASE_SITE_URL}data/objects.json`;
    }
    static get DATA_URL_DEITIES() {
        return `${Vetools.BASE_SITE_URL}data/deities.json`;
    }
    static get DATA_URL_RECIPES() {
        return `${Vetools.BASE_SITE_URL}data/recipes.json`;
    }
    static get DATA_URL_CHAR_CREATION_OPTIONS() {
        return `${Vetools.BASE_SITE_URL}data/charcreationoptions.json`;
    }
    static get DATA_URL_CULTSBOONS() {
        return `${Vetools.BASE_SITE_URL}data/cultsboons.json`;
    }
    static get DATA_URL_ACTIONS() {
        return `${Vetools.BASE_SITE_URL}data/actions.json`;
    }
    static get DATA_URL_LANGUAGES() {
        return `${Vetools.BASE_SITE_URL}data/languages.json`;
    }
    static get DATA_URL_TRAPS_HAZARDS() {
        return `${Vetools.BASE_SITE_URL}data/trapshazards.json`;
    }
}
Vetools._RE_HTTP_URL = /(^https?:\/\/)/;
Vetools._BASE_SITE_URL = "https://5etools-mirror-3.github.io/";
Vetools.BESTIARY_FLUFF_INDEX = null;
Vetools.BESTIARY_TOKEN_LOOKUP = null;
Vetools._CACHED_GET_ROLLABLE_ENTRY_DICE = null;
Vetools._PATCHED_GET_ROLLABLE_ENTRY_DICE = null;
Vetools._CACHED_MONSTER_DO_BIND_COMPACT_CONTENT_HANDLERS = null;
Vetools._CACHED_RENDERER_HOVER_CACHE_AND_GET = null;
Vetools._LOCK_DOWNLOAD_IMAGE = new VeLock();
Vetools._VET_SOURCE_LOOKUP = {};
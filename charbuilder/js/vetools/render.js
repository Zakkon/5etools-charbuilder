//#region Renderer
globalThis.Renderer = function() {
    this.wrapperTag = "div";
    this.baseUrl = "";
    this.baseMediaUrls = {};

    if (globalThis.DEPLOYED_IMG_ROOT) {
        this.baseMediaUrls["img"] = globalThis.DEPLOYED_IMG_ROOT;
    }

    this._lazyImages = false;
    this._subVariant = false;
    this._firstSection = true;
    this._isAddHandlers = true;
    this._headerIndex = 1;
    this._tagExportDict = null;
    this._roll20Ids = null;
    this._trackTitles = {
        enabled: false,
        titles: {}
    };
    this._enumerateTitlesRel = {
        enabled: false,
        titles: {}
    };
    this._isHeaderIndexIncludeTableCaptions = false;
    this._isHeaderIndexIncludeImageTitles = false;
    this._plugins = {};
    this._fnPostProcess = null;
    this._extraSourceClasses = null;
    this._depthTracker = null;
    this._depthTrackerAdditionalProps = [];
    this._depthTrackerAdditionalPropsInherited = [];
    this._lastDepthTrackerInheritedProps = {};
    this._isInternalLinksDisabled = false;
    this._isPartPageExpandCollapseDisabled = false;
    this._fnsGetStyleClasses = {};

    this.setLazyImages = function(bool) {
        if (typeof IntersectionObserver === "undefined")
            this._lazyImages = false;
        else
            this._lazyImages = !!bool;
        return this;
    }
    ;

    this.setWrapperTag = function(tag) {
        this.wrapperTag = tag;
        return this;
    }
    ;

    this.setBaseUrl = function(url) {
        this.baseUrl = url;
        return this;
    }
    ;

    this.setBaseMediaUrl = function(mediaDir, url) {
        this.baseMediaUrls[mediaDir] = url;
        return this;
    }
    ;

    this.setFirstSection = function(bool) {
        this._firstSection = bool;
        return this;
    }
    ;

    this.setAddHandlers = function(bool) {
        this._isAddHandlers = bool;
        return this;
    }
    ;

    this.setFnPostProcess = function(fn) {
        this._fnPostProcess = fn;
        return this;
    }
    ;

    this.setExtraSourceClasses = function(arr) {
        this._extraSourceClasses = arr;
        return this;
    }
    ;

    this.resetHeaderIndex = function() {
        this._headerIndex = 1;
        this._trackTitles.titles = {};
        this._enumerateTitlesRel.titles = {};
        return this;
    }
    ;

    this.getHeaderIndex = function() {
        return this._headerIndex;
    }
    ;

    this.setHeaderIndexTableCaptions = function(bool) {
        this._isHeaderIndexIncludeTableCaptions = bool;
        return this;
    }
    ;
    this.setHeaderIndexImageTitles = function(bool) {
        this._isHeaderIndexIncludeImageTitles = bool;
        return this;
    }
    ;

    this.doExportTags = function(toObj) {
        this._tagExportDict = toObj;
        return this;
    }
    ;

    this.resetExportTags = function() {
        this._tagExportDict = null;
        return this;
    }
    ;

    this.setRoll20Ids = function(roll20Ids) {
        this._roll20Ids = roll20Ids;
        return this;
    }
    ;

    this.resetRoll20Ids = function() {
        this._roll20Ids = null;
        return this;
    }
    ;

    this.setInternalLinksDisabled = function(val) {
        this._isInternalLinksDisabled = !!val;
        return this;
    }
    ;
    this.isInternalLinksDisabled = function() {
        return !!this._isInternalLinksDisabled;
    }
    ;

    this.setPartPageExpandCollapseDisabled = function(val) {
        this._isPartPageExpandCollapseDisabled = !!val;
        return this;
    }
    ;

    this.setFnGetStyleClasses = function(identifier, fn) {
        if (fn == null) {
            delete this._fnsGetStyleClasses[identifier];
            return this;
        }

        this._fnsGetStyleClasses[identifier] = fn;
        return this;
    }
    ;

    this.setEnumerateTitlesRel = function(bool) {
        this._enumerateTitlesRel.enabled = bool;
        return this;
    }
    ;

    this._getEnumeratedTitleRel = function(name) {
        if (this._enumerateTitlesRel.enabled && name) {
            const clean = name.toLowerCase();
            this._enumerateTitlesRel.titles[clean] = this._enumerateTitlesRel.titles[clean] || 0;
            return `data-title-relative-index="${this._enumerateTitlesRel.titles[clean]++}"`;
        } else
            return "";
    }
    ;

    this.setTrackTitles = function(bool) {
        this._trackTitles.enabled = bool;
        return this;
    }
    ;

    this.getTrackedTitles = function() {
        return MiscUtil.copyFast(this._trackTitles.titles);
    }
    ;

    this.getTrackedTitlesInverted = function({isStripTags=false}={}) {
        const trackedTitlesInverse = {};
        Object.entries(this._trackTitles.titles || {}).forEach(([titleIx,titleName])=>{
            if (isStripTags)
                titleName = Renderer.stripTags(titleName);
            titleName = titleName.toLowerCase().trim();
            (trackedTitlesInverse[titleName] = trackedTitlesInverse[titleName] || []).push(titleIx);
        }
        );
        return trackedTitlesInverse;
    }
    ;

    this._handleTrackTitles = function(name, {isTable=false, isImage=false}={}) {
        if (!this._trackTitles.enabled)
            return;
        if (isTable && !this._isHeaderIndexIncludeTableCaptions)
            return;
        if (isImage && !this._isHeaderIndexIncludeImageTitles)
            return;
        this._trackTitles.titles[this._headerIndex] = name;
    }
    ;

    this._handleTrackDepth = function(entry, depth) {
        if (!entry.name || !this._depthTracker)
            return;

        this._lastDepthTrackerInheritedProps = MiscUtil.copyFast(this._lastDepthTrackerInheritedProps);
        if (entry.source)
            this._lastDepthTrackerInheritedProps.source = entry.source;
        if (this._depthTrackerAdditionalPropsInherited?.length) {
            this._depthTrackerAdditionalPropsInherited.forEach(prop=>this._lastDepthTrackerInheritedProps[prop] = entry[prop] || this._lastDepthTrackerInheritedProps[prop]);
        }

        const additionalData = this._depthTrackerAdditionalProps.length ? this._depthTrackerAdditionalProps.mergeMap(it=>({
            [it]: entry[it]
        })) : {};

        this._depthTracker.push({
            ...this._lastDepthTrackerInheritedProps,
            ...additionalData,
            depth,
            name: entry.name,
            type: entry.type,
            ixHeader: this._headerIndex,
            source: this._lastDepthTrackerInheritedProps.source,
            data: entry.data,
            page: entry.page,
            alias: entry.alias,
            entry,
        });
    }
    ;

    this.addPlugin = function(pluginType, fnPlugin) {
        MiscUtil.getOrSet(this._plugins, pluginType, []).push(fnPlugin);
    }
    ;

    this.removePlugin = function(pluginType, fnPlugin) {
        if (!fnPlugin)
            return;
        const ix = (MiscUtil.get(this._plugins, pluginType) || []).indexOf(fnPlugin);
        if (~ix)
            this._plugins[pluginType].splice(ix, 1);
    }
    ;

    this.removePlugins = function(pluginType) {
        MiscUtil.delete(this._plugins, pluginType);
    }
    ;

    this._getPlugins = function(pluginType) {
        return this._plugins[pluginType] || [];
    }
    ;

    this.withPlugin = function({pluginTypes, fnPlugin, fn}) {
        for (const pt of pluginTypes)
            this.addPlugin(pt, fnPlugin);
        try {
            return fn(this);
        } finally {
            for (const pt of pluginTypes)
                this.removePlugin(pt, fnPlugin);
        }
    }
    ;

    this.pWithPlugin = async function({pluginTypes, fnPlugin, pFn}) {
        for (const pt of pluginTypes)
            this.addPlugin(pt, fnPlugin);
        try {
            const out = await pFn(this);
            return out;
        } finally {
            for (const pt of pluginTypes)
                this.removePlugin(pt, fnPlugin);
        }
    }
    ;

    this.setDepthTracker = function(arr, {additionalProps, additionalPropsInherited}={}) {
        this._depthTracker = arr;
        this._depthTrackerAdditionalProps = additionalProps || [];
        this._depthTrackerAdditionalPropsInherited = additionalPropsInherited || [];
        return this;
    }
    ;

    this.getLineBreak = function() {
        return "<br>";
    }
    ;

    this.recursiveRender = function(entry, textStack, meta, options) {
        if (entry instanceof Array) {
            entry.forEach(nxt=>this.recursiveRender(nxt, textStack, meta, options));
            setTimeout(()=>{
                throw new Error(`Array passed to renderer! The renderer only guarantees support for primitives and basic objects.`);
            }
            );
            return this;
        }

        if (textStack.length === 0)
            textStack[0] = "";
        else
            textStack.reverse();

        meta = meta || {};
        meta._typeStack = [];
        meta.depth = meta.depth == null ? 0 : meta.depth;

        this._recursiveRender(entry, textStack, meta, options);
        if (this._fnPostProcess)
            textStack[0] = this._fnPostProcess(textStack[0]);
        textStack.reverse();

        return this;
    }
    ;

    this._recursiveRender = function(entry, textStack, meta, options) {
        if (entry == null)
            return;
        if (!textStack)
            throw new Error("Missing stack!");
        if (!meta)
            throw new Error("Missing metadata!");
        if (entry.type === "section")
            meta.depth = -1;

        options = options || {};

        meta._didRenderPrefix = false;
        meta._didRenderSuffix = false;

        if (typeof entry === "object") {
            const type = entry.type == null || entry.type === "section" ? "entries" : entry.type;

            if (type === "wrapper")
                return this._recursiveRender(entry.wrapped, textStack, meta, options);

            meta._typeStack.push(type);

            switch (type) {
            case "entries":
                this._renderEntries(entry, textStack, meta, options);
                break;
            case "options":
                this._renderOptions(entry, textStack, meta, options);
                break;
            case "list":
                this._renderList(entry, textStack, meta, options);
                break;
            case "table":
                this._renderTable(entry, textStack, meta, options);
                break;
            case "tableGroup":
                this._renderTableGroup(entry, textStack, meta, options);
                break;
            case "inset":
                this._renderInset(entry, textStack, meta, options);
                break;
            case "insetReadaloud":
                this._renderInsetReadaloud(entry, textStack, meta, options);
                break;
            case "variant":
                this._renderVariant(entry, textStack, meta, options);
                break;
            case "variantInner":
                this._renderVariantInner(entry, textStack, meta, options);
                break;
            case "variantSub":
                this._renderVariantSub(entry, textStack, meta, options);
                break;
            case "spellcasting":
                this._renderSpellcasting(entry, textStack, meta, options);
                break;
            case "quote":
                this._renderQuote(entry, textStack, meta, options);
                break;
            case "optfeature":
                this._renderOptfeature(entry, textStack, meta, options);
                break;
            case "patron":
                this._renderPatron(entry, textStack, meta, options);
                break;

            case "abilityDc":
                this._renderAbilityDc(entry, textStack, meta, options);
                break;
            case "abilityAttackMod":
                this._renderAbilityAttackMod(entry, textStack, meta, options);
                break;
            case "abilityGeneric":
                this._renderAbilityGeneric(entry, textStack, meta, options);
                break;

            case "inline":
                this._renderInline(entry, textStack, meta, options);
                break;
            case "inlineBlock":
                this._renderInlineBlock(entry, textStack, meta, options);
                break;
            case "bonus":
                this._renderBonus(entry, textStack, meta, options);
                break;
            case "bonusSpeed":
                this._renderBonusSpeed(entry, textStack, meta, options);
                break;
            case "dice":
                this._renderDice(entry, textStack, meta, options);
                break;
            case "link":
                this._renderLink(entry, textStack, meta, options);
                break;
            case "actions":
                this._renderActions(entry, textStack, meta, options);
                break;
            case "attack":
                this._renderAttack(entry, textStack, meta, options);
                break;
            case "ingredient":
                this._renderIngredient(entry, textStack, meta, options);
                break;

            case "item":
                this._renderItem(entry, textStack, meta, options);
                break;
            case "itemSub":
                this._renderItemSub(entry, textStack, meta, options);
                break;
            case "itemSpell":
                this._renderItemSpell(entry, textStack, meta, options);
                break;

            case "statblockInline":
                this._renderStatblockInline(entry, textStack, meta, options);
                break;
            case "statblock":
                this._renderStatblock(entry, textStack, meta, options);
                break;

            case "image":
                this._renderImage(entry, textStack, meta, options);
                break;
            case "gallery":
                this._renderGallery(entry, textStack, meta, options);
                break;

            case "flowchart":
                this._renderFlowchart(entry, textStack, meta, options);
                break;
            case "flowBlock":
                this._renderFlowBlock(entry, textStack, meta, options);
                break;

            case "homebrew":
                this._renderHomebrew(entry, textStack, meta, options);
                break;

            case "code":
                this._renderCode(entry, textStack, meta, options);
                break;
            case "hr":
                this._renderHr(entry, textStack, meta, options);
                break;
            }

            meta._typeStack.pop();
        } else if (typeof entry === "string") {
            this._renderPrefix(entry, textStack, meta, options);
            this._renderString(entry, textStack, meta, options);
            this._renderSuffix(entry, textStack, meta, options);
        } else {
            this._renderPrefix(entry, textStack, meta, options);
            this._renderPrimitive(entry, textStack, meta, options);
            this._renderSuffix(entry, textStack, meta, options);
        }
    }
    ;

    this._RE_TEXT_CENTER = /\btext-center\b/;

    this._getMutatedStyleString = function(str) {
        if (!str)
            return str;
        return str.replace(this._RE_TEXT_CENTER, "ve-text-center");
    }
    ;

    this._adjustDepth = function(meta, dDepth) {
        const cachedDepth = meta.depth;
        meta.depth += dDepth;
        meta.depth = Math.min(Math.max(-1, meta.depth), 2);
        return cachedDepth;
    }
    ;

    this._renderPrefix = function(entry, textStack, meta, options) {
        if (meta._didRenderPrefix)
            return;
        if (options.prefix != null) {
            textStack[0] += options.prefix;
            meta._didRenderPrefix = true;
        }
    }
    ;

    this._renderSuffix = function(entry, textStack, meta, options) {
        if (meta._didRenderSuffix)
            return;
        if (options.suffix != null) {
            textStack[0] += options.suffix;
            meta._didRenderSuffix = true;
        }
    }
    ;

    this._renderImage = function(entry, textStack, meta, options) {
        if (entry.title)
            this._handleTrackTitles(entry.title, {
                isImage: true
            });

        textStack[0] += `<div class="float-clear"></div>`;

        if (entry.imageType === "map" || entry.imageType === "mapPlayer")
            textStack[0] += `<div class="rd__wrp-map">`;
        textStack[0] += `<div class="${meta._typeStack.includes("gallery") ? "rd__wrp-gallery-image" : ""}">`;

        const href = this._renderImage_getUrl(entry);
        const svg = this._lazyImages && entry.width != null && entry.height != null ? `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${entry.width}" height="${entry.height}"><rect width="100%" height="100%" fill="#ccc3"></rect></svg>`)}` : null;
        const ptTitleCreditTooltip = this._renderImage_getTitleCreditTooltipText(entry);
        const ptTitle = ptTitleCreditTooltip ? `title="${ptTitleCreditTooltip}"` : "";
        const pluginDataIsNoLink = this._getPlugins("image_isNoLink").map(plugin=>plugin(entry, textStack, meta, options)).some(Boolean);

        textStack[0] += `<div class="${this._renderImage_getWrapperClasses(entry, meta)}" ${entry.title && this._isHeaderIndexIncludeImageTitles ? `data-title-index="${this._headerIndex++}"` : ""}>
			${pluginDataIsNoLink ? "" : `<a href="${href}" target="_blank" rel="noopener noreferrer" ${ptTitle}>`}
				<img class="${this._renderImage_getImageClasses(entry, meta)}" src="${svg || href}" ${pluginDataIsNoLink ? ptTitle : ""} ${entry.altText || entry.title ? `alt="${Renderer.stripTags((entry.altText || entry.title)).qq()}"` : ""} ${svg ? `data-src="${href}"` : `loading="lazy"`} ${this._renderImage_getStylePart(entry)}>
			${pluginDataIsNoLink ? "" : `</a>`}
		</div>`;

        if (!this._renderImage_isComicStyling(entry) && (entry.title || entry.credit || entry.mapRegions)) {
            const ptAdventureBookMeta = entry.mapRegions && meta.adventureBookPage && meta.adventureBookSource && meta.adventureBookHash ? `data-rd-adventure-book-map-page="${meta.adventureBookPage.qq()}" data-rd-adventure-book-map-source="${meta.adventureBookSource.qq()}" data-rd-adventure-book-map-hash="${meta.adventureBookHash.qq()}"` : "";

            textStack[0] += `<div class="rd__image-title">`;

            if (entry.title && !entry.mapRegions)
                textStack[0] += `<div class="rd__image-title-inner">${this.render(entry.title)}</div>`;

            if (entry.mapRegions && !IS_VTT) {
                textStack[0] += `<button class="btn btn-xs btn-default rd__image-btn-viewer" onclick="RenderMap.pShowViewer(event, this)" data-rd-packed-map="${this._renderImage_getMapRegionData(entry)}" ${ptAdventureBookMeta} title="Open Dynamic Viewer (SHIFT to Open in New Window)"><span class="glyphicon glyphicon-picture"></span> ${Renderer.stripTags(entry.title) || "Dynamic Viewer"}</button>`;
            }

            if (entry.credit)
                textStack[0] += `<div class="rd__image-credit ve-muted"><span class="glyphicon glyphicon-pencil" title="Art Credit"></span> ${this.render(entry.credit)}</div>`;

            textStack[0] += `</div>`;
        }

        if (entry._galleryTitlePad)
            textStack[0] += `<div class="rd__image-title">&nbsp;</div>`;
        if (entry._galleryCreditPad)
            textStack[0] += `<div class="rd__image-credit">&nbsp;</div>`;

        textStack[0] += `</div>`;
        if (entry.imageType === "map" || entry.imageType === "mapPlayer")
            textStack[0] += `</div>`;
    }
    ;

    this._renderImage_getTitleCreditTooltipText = function(entry) {
        if (!entry.title && !entry.credit)
            return null;
        return Renderer.stripTags([entry.title, entry.credit ? `Art credit: ${entry.credit}` : null].filter(Boolean).join(". "), ).qq();
    }
    ;

    this._renderImage_getStylePart = function(entry) {
        const styles = [entry.maxWidth ? `max-width: min(100%, ${entry.maxWidth}${entry.maxWidthUnits || "px"})` : "", entry.maxHeight ? `max-height: min(60vh, ${entry.maxHeight}${entry.maxHeightUnits || "px"})` : "", ].filter(Boolean).join("; ");
        return styles ? `style="${styles}"` : "";
    }
    ;

    this._renderImage_getMapRegionData = function(entry) {
        return JSON.stringify(this.getMapRegionData(entry)).escapeQuotes();
    }
    ;

    this.getMapRegionData = function(entry) {
        return {
            regions: entry.mapRegions,
            width: entry.width,
            height: entry.height,
            href: this._renderImage_getUrl(entry),
            hrefThumbnail: this._renderImage_getUrlThumbnail(entry),
            page: entry.page,
            source: entry.source,
            hash: entry.hash,
        };
    }
    ;

    this._renderImage_isComicStyling = function(entry) {
        if (!entry.style)
            return false;
        return ["comic-speaker-left", "comic-speaker-right"].includes(entry.style);
    }
    ;

    this._renderImage_getWrapperClasses = function(entry) {
        const out = ["rd__wrp-image", "relative"];
        if (entry.style) {
            switch (entry.style) {
            case "comic-speaker-left":
                out.push("rd__comic-img-speaker", "rd__comic-img-speaker--left");
                break;
            case "comic-speaker-right":
                out.push("rd__comic-img-speaker", "rd__comic-img-speaker--right");
                break;
            }
        }
        return out.join(" ");
    }
    ;

    this._renderImage_getImageClasses = function(entry) {
        const out = ["rd__image"];
        if (entry.style) {
            switch (entry.style) {
            case "deity-symbol":
                out.push("rd__img-small");
                break;
            }
        }
        return out.join(" ");
    }
    ;

    this._renderImage_getUrl = function(entry) {
        let url = Renderer.utils.getMediaUrl(entry, "href", "img");
        for (const plugin of this._getPlugins(`image_urlPostProcess`)) {
            url = plugin(entry, url) || url;
        }
        return url;
    }
    ;

    this._renderImage_getUrlThumbnail = function(entry) {
        let url = Renderer.utils.getMediaUrl(entry, "hrefThumbnail", "img");
        for (const plugin of this._getPlugins(`image_urlThumbnailPostProcess`)) {
            url = plugin(entry, url) || url;
        }
        return url;
    }
    ;

    this._renderList_getListCssClasses = function(entry, textStack, meta, options) {
        const out = [`rd__list`];
        if (entry.style || entry.columns) {
            if (entry.style)
                out.push(...entry.style.split(" ").map(it=>`rd__${it}`));
            if (entry.columns)
                out.push(`columns-${entry.columns}`);
        }
        return out.join(" ");
    }
    ;

    this._renderTableGroup = function(entry, textStack, meta, options) {
        const len = entry.tables.length;
        for (let i = 0; i < len; ++i)
            this._recursiveRender(entry.tables[i], textStack, meta);
    }
    ;

    this._renderTable = function(entry, textStack, meta, options) {
        if (entry.intro) {
            const len = entry.intro.length;
            for (let i = 0; i < len; ++i) {
                this._recursiveRender(entry.intro[i], textStack, meta, {
                    prefix: "<p>",
                    suffix: "</p>"
                });
            }
        }

        textStack[0] += `<table class="w-100 rd__table ${this._getMutatedStyleString(entry.style || "")} ${entry.isStriped === false ? "" : "stripe-odd-table"}">`;

        const headerRowMetas = Renderer.table.getHeaderRowMetas(entry);

        const autoRollMode = Renderer.table.getAutoConvertedRollMode(entry, {headerRowMetas});

        const toRenderLabel = autoRollMode ? RollerUtil.getFullRollCol(headerRowMetas.last()[0]) : null;
        const isInfiniteResults = autoRollMode === RollerUtil.ROLL_COL_VARIABLE;

        if (entry.caption != null) {
            this._handleTrackTitles(entry.caption, {
                isTable: true
            });
            textStack[0] += `<caption ${this._isHeaderIndexIncludeTableCaptions ? `data-title-index="${this._headerIndex++}"` : ""}>${entry.caption}</caption>`;
        }

        const rollCols = [];
        let bodyStack = [""];
        bodyStack[0] += "<tbody>";
        const lenRows = entry.rows.length;
        for (let ixRow = 0; ixRow < lenRows; ++ixRow) {
            bodyStack[0] += "<tr>";
            const r = entry.rows[ixRow];
            let roRender = r.type === "row" ? r.row : r;

            const len = roRender.length;
            for (let ixCell = 0; ixCell < len; ++ixCell) {
                rollCols[ixCell] = rollCols[ixCell] || false;

                if (autoRollMode && ixCell === 0) {
                    roRender = Renderer.getRollableRow(roRender, {
                        isForceInfiniteResults: isInfiniteResults,
                        isFirstRow: ixRow === 0,
                        isLastRow: ixRow === lenRows - 1,
                    }, );
                    rollCols[ixCell] = true;
                }

                let toRenderCell;
                if (roRender[ixCell].type === "cell") {
                    if (roRender[ixCell].roll) {
                        rollCols[ixCell] = true;
                        if (roRender[ixCell].entry) {
                            toRenderCell = roRender[ixCell].entry;
                        } else if (roRender[ixCell].roll.exact != null) {
                            toRenderCell = roRender[ixCell].roll.pad ? StrUtil.padNumber(roRender[ixCell].roll.exact, 2, "0") : roRender[ixCell].roll.exact;
                        } else {

                            const dispMin = roRender[ixCell].roll.displayMin != null ? roRender[ixCell].roll.displayMin : roRender[ixCell].roll.min;
                            const dispMax = roRender[ixCell].roll.displayMax != null ? roRender[ixCell].roll.displayMax : roRender[ixCell].roll.max;

                            if (dispMax === Renderer.dice.POS_INFINITE) {
                                toRenderCell = roRender[ixCell].roll.pad ? `${StrUtil.padNumber(dispMin, 2, "0")}+` : `${dispMin}+`;
                            } else {
                                toRenderCell = roRender[ixCell].roll.pad ? `${StrUtil.padNumber(dispMin, 2, "0")}-${StrUtil.padNumber(dispMax, 2, "0")}` : `${dispMin}-${dispMax}`;
                            }
                        }
                    } else if (roRender[ixCell].entry) {
                        toRenderCell = roRender[ixCell].entry;
                    }
                } else {
                    toRenderCell = roRender[ixCell];
                }
                bodyStack[0] += `<td ${this._renderTable_makeTableTdClassText(entry, ixCell)} ${this._renderTable_getCellDataStr(roRender[ixCell])} ${roRender[ixCell].type === "cell" && roRender[ixCell].width ? `colspan="${roRender[ixCell].width}"` : ""}>`;
                if (r.style === "row-indent-first" && ixCell === 0)
                    bodyStack[0] += `<div class="rd__tab-indent"></div>`;
                const cacheDepth = this._adjustDepth(meta, 1);
                this._recursiveRender(toRenderCell, bodyStack, meta);
                meta.depth = cacheDepth;
                bodyStack[0] += "</td>";
            }
            bodyStack[0] += "</tr>";
        }
        bodyStack[0] += "</tbody>";

        if (headerRowMetas) {
            textStack[0] += "<thead>";

            for (let ixRow = 0, lenRows = headerRowMetas.length; ixRow < lenRows; ++ixRow) {
                textStack[0] += "<tr>";

                const headerRowMeta = headerRowMetas[ixRow];
                for (let ixCell = 0, lenCells = headerRowMeta.length; ixCell < lenCells; ++ixCell) {
                    const lbl = headerRowMeta[ixCell];
                    textStack[0] += `<th ${this._renderTable_getTableThClassText(entry, ixCell)} data-rd-isroller="${rollCols[ixCell]}" ${entry.isNameGenerator ? `data-rd-namegeneratorrolls="${headerRowMeta.length - 1}"` : ""}>`;
                    this._recursiveRender(autoRollMode && ixCell === 0 ? RollerUtil.getFullRollCol(lbl) : lbl, textStack, meta);
                    textStack[0] += `</th>`;
                }

                textStack[0] += "</tr>";
            }

            textStack[0] += "</thead>";
        }

        textStack[0] += bodyStack[0];

        if (entry.footnotes != null) {
            textStack[0] += "<tfoot>";
            const len = entry.footnotes.length;
            for (let i = 0; i < len; ++i) {
                textStack[0] += `<tr><td colspan="99">`;
                const cacheDepth = this._adjustDepth(meta, 1);
                this._recursiveRender(entry.footnotes[i], textStack, meta);
                meta.depth = cacheDepth;
                textStack[0] += "</td></tr>";
            }
            textStack[0] += "</tfoot>";
        }
        textStack[0] += "</table>";

        if (entry.outro) {
            const len = entry.outro.length;
            for (let i = 0; i < len; ++i) {
                this._recursiveRender(entry.outro[i], textStack, meta, {
                    prefix: "<p>",
                    suffix: "</p>"
                });
            }
        }
    }
    ;

    this._renderTable_getCellDataStr = function(ent) {
        function convertZeros(num) {
            if (num === 0)
                return 100;
            return num;
        }

        if (ent.roll) {
            return `data-roll-min="${convertZeros(ent.roll.exact != null ? ent.roll.exact : ent.roll.min)}" data-roll-max="${convertZeros(ent.roll.exact != null ? ent.roll.exact : ent.roll.max)}"`;
        }

        return "";
    }
    ;

    this._renderTable_getTableThClassText = function(entry, i) {
        return entry.colStyles == null || i >= entry.colStyles.length ? "" : `class="${this._getMutatedStyleString(entry.colStyles[i])}"`;
    }
    ;

    this._renderTable_makeTableTdClassText = function(entry, i) {
        if (entry.rowStyles != null)
            return i >= entry.rowStyles.length ? "" : `class="${this._getMutatedStyleString(entry.rowStyles[i])}"`;
        else
            return this._renderTable_getTableThClassText(entry, i);
    }
    ;

    this._renderEntries = function(entry, textStack, meta, options) {
        this._renderEntriesSubtypes(entry, textStack, meta, options, true);
    }
    ;

    this._getPagePart = function(entry, isInset) {
        if (!Renderer.utils.isDisplayPage(entry.page))
            return "";
        return ` <span class="rd__title-link ${isInset ? `rd__title-link--inset` : ""}">${entry.source ? `<span class="help-subtle" title="${Parser.sourceJsonToFull(entry.source)}">${Parser.sourceJsonToAbv(entry.source)}</span> ` : ""}p${entry.page}</span>`;
    }
    ;

    this._renderEntriesSubtypes = function(entry, textStack, meta, options, incDepth) {
        const type = entry.type || "entries";
        const isInlineTitle = meta.depth >= 2;
        const isAddPeriod = isInlineTitle && entry.name && !Renderer._INLINE_HEADER_TERMINATORS.has(entry.name[entry.name.length - 1]);
        const pagePart = !this._isPartPageExpandCollapseDisabled && !isInlineTitle ? this._getPagePart(entry) : "";
        const partExpandCollapse = !this._isPartPageExpandCollapseDisabled && !isInlineTitle ? `<span class="rd__h-toggle ml-2 clickable no-select" data-rd-h-toggle-button="true" title="Toggle Visibility (CTRL to Toggle All)">[\u2013]</span>` : "";
        const partPageExpandCollapse = !this._isPartPageExpandCollapseDisabled && (pagePart || partExpandCollapse) ? `<span class="ve-flex-vh-center">${[pagePart, partExpandCollapse].filter(Boolean).join("")}</span>` : "";
        const nextDepth = incDepth && meta.depth < 2 ? meta.depth + 1 : meta.depth;
        const styleString = this._renderEntriesSubtypes_getStyleString(entry, meta, isInlineTitle);
        const dataString = this._renderEntriesSubtypes_getDataString(entry);
        if (entry.name != null && Renderer.ENTRIES_WITH_ENUMERATED_TITLES_LOOKUP[entry.type])
            this._handleTrackTitles(entry.name);

        const headerTag = isInlineTitle ? "span" : `h${Math.min(Math.max(meta.depth + 2, 1), 6)}`;
        const headerClass = `rd__h--${meta.depth + 1}`;
        const cachedLastDepthTrackerProps = MiscUtil.copyFast(this._lastDepthTrackerInheritedProps);
        this._handleTrackDepth(entry, meta.depth);

        const pluginDataNamePrefix = this._getPlugins(`${type}_namePrefix`).map(plugin=>plugin(entry, textStack, meta, options)).filter(Boolean);

        const headerSpan = entry.name ? `<${headerTag} class="rd__h ${headerClass}" data-title-index="${this._headerIndex++}" ${this._getEnumeratedTitleRel(entry.name)}> <span class="entry-title-inner${!pagePart && entry.source ? ` help-subtle` : ""}"${!pagePart && entry.source ? ` title="Source: ${Parser.sourceJsonToFull(entry.source)}${entry.page ? `, p${entry.page}` : ""}"` : ""}>${pluginDataNamePrefix.join("")}${this.render({
            type: "inline",
            entries: [entry.name]
        })}${isAddPeriod ? "." : ""}</span>${partPageExpandCollapse}</${headerTag}> ` : "";

        if (meta.depth === -1) {
            if (!this._firstSection)
                textStack[0] += `<hr class="rd__hr rd__hr--section">`;
            this._firstSection = false;
        }

        if (entry.entries || entry.name) {
            textStack[0] += `<${this.wrapperTag} ${dataString} ${styleString}>${headerSpan}`;
            this._renderEntriesSubtypes_renderPreReqText(entry, textStack, meta);
            if (entry.entries) {
                const cacheDepth = meta.depth;
                const len = entry.entries.length;
                for (let i = 0; i < len; ++i) {
                    meta.depth = nextDepth;
                    this._recursiveRender(entry.entries[i], textStack, meta, {
                        prefix: "<p>",
                        suffix: "</p>"
                    });
                    if (i === 0 && cacheDepth >= 2)
                        textStack[0] += `<div class="rd__spc-inline-post"></div>`;
                }
                meta.depth = cacheDepth;
            }
            textStack[0] += `</${this.wrapperTag}>`;
        }

        this._lastDepthTrackerInheritedProps = cachedLastDepthTrackerProps;
    }
    ;

    this._renderEntriesSubtypes_getDataString = function(entry) {
        let dataString = "";
        if (entry.source)
            dataString += `data-source="${entry.source}"`;
        if (entry.data) {
            for (const k in entry.data) {
                if (!k.startsWith("rd-"))
                    continue;
                dataString += ` data-${k}="${`${entry.data[k]}`.escapeQuotes()}"`;
            }
        }
        return dataString;
    }
    ;

    this._renderEntriesSubtypes_renderPreReqText = function(entry, textStack, meta) {
        if (entry.prerequisite) {
            textStack[0] += `<span class="rd__prerequisite">Prerequisite: `;
            this._recursiveRender({
                type: "inline",
                entries: [entry.prerequisite]
            }, textStack, meta);
            textStack[0] += `</span>`;
        }
    }
    ;

    this._renderEntriesSubtypes_getStyleString = function(entry, meta, isInlineTitle) {
        const styleClasses = ["rd__b"];
        styleClasses.push(this._getStyleClass(entry.type || "entries", entry));
        if (isInlineTitle) {
            if (this._subVariant)
                styleClasses.push(Renderer.HEAD_2_SUB_VARIANT);
            else
                styleClasses.push(Renderer.HEAD_2);
        } else
            styleClasses.push(meta.depth === -1 ? Renderer.HEAD_NEG_1 : meta.depth === 0 ? Renderer.HEAD_0 : Renderer.HEAD_1);
        return styleClasses.length > 0 ? `class="${styleClasses.join(" ")}"` : "";
    }
    ;

    this._renderOptions = function(entry, textStack, meta, options) {
        if (!entry.entries)
            return;
        entry.entries = entry.entries.sort((a,b)=>a.name && b.name ? SortUtil.ascSort(a.name, b.name) : a.name ? -1 : b.name ? 1 : 0);

        if (entry.style && entry.style === "list-hang-notitle") {
            const fauxEntry = {
                type: "list",
                style: "list-hang-notitle",
                items: entry.entries.map(ent=>{
                    if (typeof ent === "string")
                        return ent;
                    if (ent.type === "item")
                        return ent;

                    const out = {
                        ...ent,
                        type: "item"
                    };
                    if (ent.name)
                        out.name = Renderer._INLINE_HEADER_TERMINATORS.has(ent.name[ent.name.length - 1]) ? out.name : `${out.name}.`;
                    return out;
                }
                ),
            };
            this._renderList(fauxEntry, textStack, meta, options);
        } else
            this._renderEntriesSubtypes(entry, textStack, meta, options, false);
    }
    ;

    this._renderList = function(entry, textStack, meta, options) {
        if (entry.items) {
            const tag = entry.start ? "ol" : "ul";
            const cssClasses = this._renderList_getListCssClasses(entry, textStack, meta, options);
            textStack[0] += `<${tag} ${cssClasses ? `class="${cssClasses}"` : ""} ${entry.start ? `start="${entry.start}"` : ""}>`;
            if (entry.name)
                textStack[0] += `<li class="rd__list-name">${entry.name}</li>`;
            const isListHang = entry.style && entry.style.split(" ").includes("list-hang");
            const len = entry.items.length;
            for (let i = 0; i < len; ++i) {
                const item = entry.items[i];
                if (item.type !== "list") {
                    const className = `${this._getStyleClass(entry.type, item)}${item.type === "itemSpell" ? " rd__li-spell" : ""}`;
                    textStack[0] += `<li class="rd__li ${className}">`;
                }
                if (isListHang && typeof item === "string")
                    textStack[0] += "<div>";
                this._recursiveRender(item, textStack, meta);
                if (isListHang && typeof item === "string")
                    textStack[0] += "</div>";
                if (item.type !== "list")
                    textStack[0] += "</li>";
            }
            textStack[0] += `</${tag}>`;
        }
    }
    ;

    this._getPtExpandCollapseSpecial = function() {
        return `<span class="rd__h-toggle ml-2 clickable no-select" data-rd-h-special-toggle-button="true" title="Toggle Visibility (CTRL to Toggle All)">[\u2013]</span>`;
    }
    ;

    this._renderInset = function(entry, textStack, meta, options) {
        const dataString = this._renderEntriesSubtypes_getDataString(entry);
        textStack[0] += `<${this.wrapperTag} class="rd__b-special rd__b-inset ${this._getMutatedStyleString(entry.style || "")}" ${dataString}>`;

        const cachedLastDepthTrackerProps = MiscUtil.copyFast(this._lastDepthTrackerInheritedProps);
        this._handleTrackDepth(entry, 1);

        const pagePart = this._getPagePart(entry, true);
        const partExpandCollapse = this._getPtExpandCollapseSpecial();
        const partPageExpandCollapse = `<span class="ve-flex-vh-center">${[pagePart, partExpandCollapse].filter(Boolean).join("")}</span>`;

        if (entry.name != null) {
            if (Renderer.ENTRIES_WITH_ENUMERATED_TITLES_LOOKUP[entry.type])
                this._handleTrackTitles(entry.name);
            textStack[0] += `<span class="rd__h rd__h--2-inset" data-title-index="${this._headerIndex++}" ${this._getEnumeratedTitleRel(entry.name)}><h4 class="entry-title-inner">${entry.name}</h4>${partPageExpandCollapse}</span>`;
        } else {
            textStack[0] += `<span class="rd__h rd__h--2-inset rd__h--2-inset-no-name">${partPageExpandCollapse}</span>`;
        }

        if (entry.entries) {
            const len = entry.entries.length;
            for (let i = 0; i < len; ++i) {
                const cacheDepth = meta.depth;
                meta.depth = 2;
                this._recursiveRender(entry.entries[i], textStack, meta, {
                    prefix: "<p>",
                    suffix: "</p>"
                });
                meta.depth = cacheDepth;
            }
        }
        textStack[0] += `<div class="float-clear"></div>`;
        textStack[0] += `</${this.wrapperTag}>`;

        this._lastDepthTrackerInheritedProps = cachedLastDepthTrackerProps;
    }
    ;

    this._renderInsetReadaloud = function(entry, textStack, meta, options) {
        const dataString = this._renderEntriesSubtypes_getDataString(entry);
        textStack[0] += `<${this.wrapperTag} class="rd__b-special rd__b-inset rd__b-inset--readaloud ${this._getMutatedStyleString(entry.style || "")}" ${dataString}>`;

        const cachedLastDepthTrackerProps = MiscUtil.copyFast(this._lastDepthTrackerInheritedProps);
        this._handleTrackDepth(entry, 1);

        const pagePart = this._getPagePart(entry, true);
        const partExpandCollapse = this._getPtExpandCollapseSpecial();
        const partPageExpandCollapse = `<span class="ve-flex-vh-center">${[pagePart, partExpandCollapse].filter(Boolean).join("")}</span>`;

        if (entry.name != null) {
            if (Renderer.ENTRIES_WITH_ENUMERATED_TITLES_LOOKUP[entry.type])
                this._handleTrackTitles(entry.name);
            textStack[0] += `<span class="rd__h rd__h--2-inset" data-title-index="${this._headerIndex++}" ${this._getEnumeratedTitleRel(entry.name)}><h4 class="entry-title-inner">${entry.name}</h4>${this._getPagePart(entry, true)}</span>`;
        } else {
            textStack[0] += `<span class="rd__h rd__h--2-inset rd__h--2-inset-no-name">${partPageExpandCollapse}</span>`;
        }

        const len = entry.entries.length;
        for (let i = 0; i < len; ++i) {
            const cacheDepth = meta.depth;
            meta.depth = 2;
            this._recursiveRender(entry.entries[i], textStack, meta, {
                prefix: "<p>",
                suffix: "</p>"
            });
            meta.depth = cacheDepth;
        }
        textStack[0] += `<div class="float-clear"></div>`;
        textStack[0] += `</${this.wrapperTag}>`;

        this._lastDepthTrackerInheritedProps = cachedLastDepthTrackerProps;
    }
    ;

    this._renderVariant = function(entry, textStack, meta, options) {
        const dataString = this._renderEntriesSubtypes_getDataString(entry);

        if (entry.name != null && Renderer.ENTRIES_WITH_ENUMERATED_TITLES_LOOKUP[entry.type])
            this._handleTrackTitles(entry.name);
        const cachedLastDepthTrackerProps = MiscUtil.copyFast(this._lastDepthTrackerInheritedProps);
        this._handleTrackDepth(entry, 1);

        const pagePart = this._getPagePart(entry, true);
        const partExpandCollapse = this._getPtExpandCollapseSpecial();
        const partPageExpandCollapse = `<span class="ve-flex-vh-center">${[pagePart, partExpandCollapse].filter(Boolean).join("")}</span>`;

        textStack[0] += `<${this.wrapperTag} class="rd__b-special rd__b-inset" ${dataString}>`;
        textStack[0] += `<span class="rd__h rd__h--2-inset" data-title-index="${this._headerIndex++}" ${this._getEnumeratedTitleRel(entry.name)}><h4 class="entry-title-inner">Variant: ${entry.name}</h4>${partPageExpandCollapse}</span>`;
        const len = entry.entries.length;
        for (let i = 0; i < len; ++i) {
            const cacheDepth = meta.depth;
            meta.depth = 2;
            this._recursiveRender(entry.entries[i], textStack, meta, {
                prefix: "<p>",
                suffix: "</p>"
            });
            meta.depth = cacheDepth;
        }
        if (entry.source)
            textStack[0] += Renderer.utils.getSourceAndPageTrHtml({
                source: entry.source,
                page: entry.page
            });
        textStack[0] += `</${this.wrapperTag}>`;

        this._lastDepthTrackerInheritedProps = cachedLastDepthTrackerProps;
    }
    ;

    this._renderVariantInner = function(entry, textStack, meta, options) {
        const dataString = this._renderEntriesSubtypes_getDataString(entry);

        if (entry.name != null && Renderer.ENTRIES_WITH_ENUMERATED_TITLES_LOOKUP[entry.type])
            this._handleTrackTitles(entry.name);
        const cachedLastDepthTrackerProps = MiscUtil.copyFast(this._lastDepthTrackerInheritedProps);
        this._handleTrackDepth(entry, 1);

        textStack[0] += `<${this.wrapperTag} class="rd__b-inset-inner" ${dataString}>`;
        textStack[0] += `<span class="rd__h rd__h--2-inset" data-title-index="${this._headerIndex++}" ${this._getEnumeratedTitleRel(entry.name)}><h4 class="entry-title-inner">${entry.name}</h4></span>`;
        const len = entry.entries.length;
        for (let i = 0; i < len; ++i) {
            const cacheDepth = meta.depth;
            meta.depth = 2;
            this._recursiveRender(entry.entries[i], textStack, meta, {
                prefix: "<p>",
                suffix: "</p>"
            });
            meta.depth = cacheDepth;
        }
        if (entry.source)
            textStack[0] += Renderer.utils.getSourceAndPageTrHtml({
                source: entry.source,
                page: entry.page
            });
        textStack[0] += `</${this.wrapperTag}>`;

        this._lastDepthTrackerInheritedProps = cachedLastDepthTrackerProps;
    }
    ;

    this._renderVariantSub = function(entry, textStack, meta, options) {
        this._subVariant = true;
        const fauxEntry = entry;
        fauxEntry.type = "entries";
        const cacheDepth = meta.depth;
        meta.depth = 3;
        this._recursiveRender(fauxEntry, textStack, meta, {
            prefix: "<p>",
            suffix: "</p>"
        });
        meta.depth = cacheDepth;
        this._subVariant = false;
    }
    ;

    this._renderSpellcasting_getEntries = function(entry) {
        const hidden = new Set(entry.hidden || []);
        const toRender = [{
            type: "entries",
            name: entry.name,
            entries: entry.headerEntries ? MiscUtil.copyFast(entry.headerEntries) : []
        }];

        if (entry.constant || entry.will || entry.recharge || entry.charges || entry.rest || entry.daily || entry.weekly || entry.yearly || entry.ritual) {
            const tempList = {
                type: "list",
                style: "list-hang-notitle",
                items: [],
                data: {
                    isSpellList: true
                }
            };
            if (entry.constant && !hidden.has("constant"))
                tempList.items.push({
                    type: "itemSpell",
                    name: `Constant:`,
                    entry: this._renderSpellcasting_getRenderableList(entry.constant).join(", ")
                });
            if (entry.will && !hidden.has("will"))
                tempList.items.push({
                    type: "itemSpell",
                    name: `At will:`,
                    entry: this._renderSpellcasting_getRenderableList(entry.will).join(", ")
                });

            this._renderSpellcasting_getEntries_procPerDuration({
                entry,
                tempList,
                hidden,
                prop: "recharge",
                fnGetDurationText: num=>`{@recharge ${num}|m}`,
                isSkipPrefix: true
            });
            this._renderSpellcasting_getEntries_procPerDuration({
                entry,
                tempList,
                hidden,
                prop: "charges",
                fnGetDurationText: num=>` charge${num === 1 ? "" : "s"}`
            });
            this._renderSpellcasting_getEntries_procPerDuration({
                entry,
                tempList,
                hidden,
                prop: "rest",
                durationText: "/rest"
            });
            this._renderSpellcasting_getEntries_procPerDuration({
                entry,
                tempList,
                hidden,
                prop: "daily",
                durationText: "/day"
            });
            this._renderSpellcasting_getEntries_procPerDuration({
                entry,
                tempList,
                hidden,
                prop: "weekly",
                durationText: "/week"
            });
            this._renderSpellcasting_getEntries_procPerDuration({
                entry,
                tempList,
                hidden,
                prop: "yearly",
                durationText: "/year"
            });

            if (entry.ritual && !hidden.has("ritual"))
                tempList.items.push({
                    type: "itemSpell",
                    name: `Rituals:`,
                    entry: this._renderSpellcasting_getRenderableList(entry.ritual).join(", ")
                });
            tempList.items = tempList.items.filter(it=>it.entry !== "");
            if (tempList.items.length)
                toRender[0].entries.push(tempList);
        }

        if (entry.spells && !hidden.has("spells")) {
            const tempList = {
                type: "list",
                style: "list-hang-notitle",
                items: [],
                data: {
                    isSpellList: true
                }
            };

            const lvls = Object.keys(entry.spells).map(lvl=>Number(lvl)).sort(SortUtil.ascSort);

            for (const lvl of lvls) {
                const spells = entry.spells[lvl];
                if (spells) {
                    let levelCantrip = `${Parser.spLevelToFull(lvl)}${(lvl === 0 ? "s" : " level")}`;
                    let slotsAtWill = ` (at will)`;
                    const slots = spells.slots;
                    if (slots >= 0)
                        slotsAtWill = slots > 0 ? ` (${slots} slot${slots > 1 ? "s" : ""})` : ``;
                    if (spells.lower && spells.lower !== lvl) {
                        levelCantrip = `${Parser.spLevelToFull(spells.lower)}-${levelCantrip}`;
                        if (slots >= 0)
                            slotsAtWill = slots > 0 ? ` (${slots} ${Parser.spLevelToFull(lvl)}-level slot${slots > 1 ? "s" : ""})` : ``;
                    }
                    tempList.items.push({
                        type: "itemSpell",
                        name: `${levelCantrip}${slotsAtWill}:`,
                        entry: this._renderSpellcasting_getRenderableList(spells.spells).join(", ") || "\u2014"
                    });
                }
            }

            toRender[0].entries.push(tempList);
        }

        if (entry.footerEntries)
            toRender.push({
                type: "entries",
                entries: entry.footerEntries
            });
        return toRender;
    }
    ;

    this._renderSpellcasting_getEntries_procPerDuration = function({entry, hidden, tempList, prop, durationText, fnGetDurationText, isSkipPrefix}) {
        if (!entry[prop] || hidden.has(prop))
            return;

        for (let lvl = 9; lvl > 0; lvl--) {
            const perDur = entry[prop];
            if (perDur[lvl]) {
                tempList.items.push({
                    type: "itemSpell",
                    name: `${isSkipPrefix ? "" : lvl}${fnGetDurationText ? fnGetDurationText(lvl) : durationText}:`,
                    entry: this._renderSpellcasting_getRenderableList(perDur[lvl]).join(", "),
                });
            }

            const lvlEach = `${lvl}e`;
            if (perDur[lvlEach]) {
                const isHideEach = !perDur[lvl] && perDur[lvlEach].length === 1;
                tempList.items.push({
                    type: "itemSpell",
                    name: `${isSkipPrefix ? "" : lvl}${fnGetDurationText ? fnGetDurationText(lvl) : durationText}${isHideEach ? "" : ` each`}:`,
                    entry: this._renderSpellcasting_getRenderableList(perDur[lvlEach]).join(", "),
                });
            }
        }
    }
    ;

    this._renderSpellcasting_getRenderableList = function(spellList) {
        return spellList.filter(it=>!it.hidden).map(it=>it.entry || it);
    }
    ;

    this._renderSpellcasting = function(entry, textStack, meta, options) {
        const toRender = this._renderSpellcasting_getEntries(entry);
        if (!toRender?.[0].entries?.length)
            return;
        this._recursiveRender({
            type: "entries",
            entries: toRender
        }, textStack, meta);
    }
    ;

    this._renderQuote = function(entry, textStack, meta, options) {
        textStack[0] += `<div class="${this._renderList_getQuoteCssClasses(entry, textStack, meta, options)}">`;

        const len = entry.entries.length;
        for (let i = 0; i < len; ++i) {
            textStack[0] += `<p class="rd__quote-line ${i === len - 1 && entry.by ? `rd__quote-line--last` : ""}">${i === 0 && !entry.skipMarks ? "&ldquo;" : ""}`;
            this._recursiveRender(entry.entries[i], textStack, meta, {
                prefix: entry.skipItalics ? "" : "<i>",
                suffix: entry.skipItalics ? "" : "</i>"
            });
            textStack[0] += `${i === len - 1 && !entry.skipMarks ? "&rdquo;" : ""}</p>`;
        }

        if (entry.by || entry.from) {
            textStack[0] += `<p>`;
            const tempStack = [""];
            const byArr = this._renderQuote_getBy(entry);
            if (byArr) {
                for (let i = 0, len = byArr.length; i < len; ++i) {
                    const by = byArr[i];
                    this._recursiveRender(by, tempStack, meta);
                    if (i < len - 1)
                        tempStack[0] += "<br>";
                }
            }
            textStack[0] += `<span class="rd__quote-by">\u2014 ${byArr ? tempStack.join("") : ""}${byArr && entry.from ? `, ` : ""}${entry.from ? `<i>${entry.from}</i>` : ""}</span>`;
            textStack[0] += `</p>`;
        }

        textStack[0] += `</div>`;
    }
    ;

    this._renderList_getQuoteCssClasses = function(entry, textStack, meta, options) {
        const out = [`rd__quote`];
        if (entry.style) {
            if (entry.style)
                out.push(...entry.style.split(" ").map(it=>`rd__${it}`));
        }
        return out.join(" ");
    }
    ;

    this._renderQuote_getBy = function(entry) {
        if (!entry.by?.length)
            return null;
        return entry.by instanceof Array ? entry.by : [entry.by];
    }
    ;

    this._renderOptfeature = function(entry, textStack, meta, options) {
        this._renderEntriesSubtypes(entry, textStack, meta, options, true);
    }
    ;

    this._renderPatron = function(entry, textStack, meta, options) {
        this._renderEntriesSubtypes(entry, textStack, meta, options, false);
    }
    ;

    this._renderAbilityDc = function(entry, textStack, meta, options) {
        this._renderPrefix(entry, textStack, meta, options);
        textStack[0] += `<div class="ve-text-center"><b>`;
        this._recursiveRender(entry.name, textStack, meta);
        textStack[0] += ` save DC</b> = 8 + your proficiency bonus + your ${Parser.attrChooseToFull(entry.attributes)}</div>`;
        this._renderSuffix(entry, textStack, meta, options);
    }
    ;

    this._renderAbilityAttackMod = function(entry, textStack, meta, options) {
        this._renderPrefix(entry, textStack, meta, options);
        textStack[0] += `<div class="ve-text-center"><b>`;
        this._recursiveRender(entry.name, textStack, meta);
        textStack[0] += ` attack modifier</b> = your proficiency bonus + your ${Parser.attrChooseToFull(entry.attributes)}</div>`;
        this._renderSuffix(entry, textStack, meta, options);
    }
    ;

    this._renderAbilityGeneric = function(entry, textStack, meta, options) {
        this._renderPrefix(entry, textStack, meta, options);
        textStack[0] += `<div class="ve-text-center">`;
        if (entry.name)
            this._recursiveRender(entry.name, textStack, meta, {
                prefix: "<b>",
                suffix: "</b> = "
            });
        textStack[0] += `${entry.text}${entry.attributes ? ` ${Parser.attrChooseToFull(entry.attributes)}` : ""}</div>`;
        this._renderSuffix(entry, textStack, meta, options);
    }
    ;

    this._renderInline = function(entry, textStack, meta, options) {
        if (entry.entries) {
            const len = entry.entries.length;
            for (let i = 0; i < len; ++i)
                this._recursiveRender(entry.entries[i], textStack, meta);
        }
    }
    ;

    this._renderInlineBlock = function(entry, textStack, meta, options) {
        this._renderPrefix(entry, textStack, meta, options);
        if (entry.entries) {
            const len = entry.entries.length;
            for (let i = 0; i < len; ++i)
                this._recursiveRender(entry.entries[i], textStack, meta);
        }
        this._renderSuffix(entry, textStack, meta, options);
    }
    ;

    this._renderBonus = function(entry, textStack, meta, options) {
        textStack[0] += (entry.value < 0 ? "" : "+") + entry.value;
    }
    ;

    this._renderBonusSpeed = function(entry, textStack, meta, options) {
        textStack[0] += entry.value === 0 ? "\u2014" : `${entry.value < 0 ? "" : "+"}${entry.value} ft.`;
    }
    ;

    this._renderDice = function(entry, textStack, meta, options) {
        const pluginResults = this._getPlugins("dice").map(plugin=>plugin(entry, textStack, meta, options)).filter(Boolean);

        //TEMPFIX
        if(!SETTINGS.DO_RENDER_DICE){textStack[0] += entry.displayText; return;}
        textStack[0] += Renderer.getEntryDice(entry, entry.name, {
            isAddHandlers: this._isAddHandlers, pluginResults
        });
    };

    this._renderActions = function(entry, textStack, meta, options) {
        const dataString = this._renderEntriesSubtypes_getDataString(entry);

        if (entry.name != null && Renderer.ENTRIES_WITH_ENUMERATED_TITLES_LOOKUP[entry.type])
            this._handleTrackTitles(entry.name);
        const cachedLastDepthTrackerProps = MiscUtil.copyFast(this._lastDepthTrackerInheritedProps);
        this._handleTrackDepth(entry, 2);

        textStack[0] += `<${this.wrapperTag} class="${Renderer.HEAD_2}" ${dataString}><span class="rd__h rd__h--3" data-title-index="${this._headerIndex++}" ${this._getEnumeratedTitleRel(entry.name)}><span class="entry-title-inner">${entry.name}.</span></span> `;
        const len = entry.entries.length;
        for (let i = 0; i < len; ++i)
            this._recursiveRender(entry.entries[i], textStack, meta, {
                prefix: "<p>",
                suffix: "</p>"
            });
        textStack[0] += `</${this.wrapperTag}>`;

        this._lastDepthTrackerInheritedProps = cachedLastDepthTrackerProps;
    }
    ;

    this._renderAttack = function(entry, textStack, meta, options) {
        this._renderPrefix(entry, textStack, meta, options);
        textStack[0] += `<i>${Parser.attackTypeToFull(entry.attackType)}:</i> `;
        const len = entry.attackEntries.length;
        for (let i = 0; i < len; ++i)
            this._recursiveRender(entry.attackEntries[i], textStack, meta);
        textStack[0] += ` <i>Hit:</i> `;
        const len2 = entry.hitEntries.length;
        for (let i = 0; i < len2; ++i)
            this._recursiveRender(entry.hitEntries[i], textStack, meta);
        this._renderSuffix(entry, textStack, meta, options);
    }
    ;

    this._renderIngredient = function(entry, textStack, meta, options) {
        this._renderPrefix(entry, textStack, meta, options);
        this._recursiveRender(entry.entry, textStack, meta);
        this._renderSuffix(entry, textStack, meta, options);
    }
    ;

    this._renderItem = function(entry, textStack, meta, options) {
        this._renderPrefix(entry, textStack, meta, options);
        textStack[0] += `<p class="rd__p-list-item"><span class="${this._getMutatedStyleString(entry.style) || "bold"} rd__list-item-name">${this.render(entry.name)}${this._renderItem_isAddPeriod(entry) ? "." : ""}</span> `;
        if (entry.entry)
            this._recursiveRender(entry.entry, textStack, meta);
        else if (entry.entries) {
            const len = entry.entries.length;
            for (let i = 0; i < len; ++i)
                this._recursiveRender(entry.entries[i], textStack, meta, {
                    prefix: i > 0 ? `<span class="rd__p-cont-indent">` : "",
                    suffix: i > 0 ? "</span>" : ""
                });
        }
        textStack[0] += "</p>";
        this._renderSuffix(entry, textStack, meta, options);
    }
    ;

    this._renderItem_isAddPeriod = function(entry) {
        return entry.name && entry.nameDot !== false && !Renderer._INLINE_HEADER_TERMINATORS.has(entry.name[entry.name.length - 1]);
    }
    ;

    this._renderItemSub = function(entry, textStack, meta, options) {
        this._renderPrefix(entry, textStack, meta, options);
        const isAddPeriod = entry.name && entry.nameDot !== false && !Renderer._INLINE_HEADER_TERMINATORS.has(entry.name[entry.name.length - 1]);
        this._recursiveRender(entry.entry, textStack, meta, {
            prefix: `<p class="rd__p-list-item"><span class="italic rd__list-item-name">${entry.name}${isAddPeriod ? "." : ""}</span> `,
            suffix: "</p>"
        });
        this._renderSuffix(entry, textStack, meta, options);
    }
    ;

    this._renderItemSpell = function(entry, textStack, meta, options) {
        this._renderPrefix(entry, textStack, meta, options);

        const tempStack = [""];
        this._recursiveRender(entry.name || "", tempStack, meta);

        this._recursiveRender(entry.entry, textStack, meta, {
            prefix: `<p>${tempStack.join("")} `,
            suffix: "</p>"
        });
        this._renderSuffix(entry, textStack, meta, options);
    }
    ;

    this._InlineStatblockStrategy = function({pFnPreProcess, }, ) {
        this.pFnPreProcess = pFnPreProcess;
    }
    ;

    this._INLINE_STATBLOCK_STRATEGIES = {
        "item": new this._InlineStatblockStrategy({
            pFnPreProcess: async(ent)=>{
                await Renderer.item.pPopulatePropertyAndTypeReference();
                Renderer.item.enhanceItem(ent);
                return ent;
            }
            ,
        }),
    };

    this._renderStatblockInline = function(entry, textStack, meta, options) {
        const fnGetRenderCompact = Renderer.hover.getFnRenderCompact(entry.dataType);

        const headerName = entry.displayName || entry.data?.name;
        const headerStyle = entry.style;

        if (!fnGetRenderCompact) {
            this._renderPrefix(entry, textStack, meta, options);
            this._renderDataHeader(textStack, headerName, headerStyle);
            textStack[0] += `<tr>
				<td colspan="6">
					<i class="text-danger">Cannot render &quot;${entry.type}&quot;&mdash;unknown data type &quot;${entry.dataType}&quot;!</i>
				</td>
			</tr>`;
            this._renderDataFooter(textStack);
            this._renderSuffix(entry, textStack, meta, options);
            return;
        }

        const strategy = this._INLINE_STATBLOCK_STRATEGIES[entry.dataType];

        if (!strategy?.pFnPreProcess && !entry.data?._copy) {
            this._renderPrefix(entry, textStack, meta, options);
            this._renderDataHeader(textStack, headerName, headerStyle, {
                isCollapsed: entry.collapsed
            });
            textStack[0] += fnGetRenderCompact(entry.data, {
                isEmbeddedEntity: true
            });
            this._renderDataFooter(textStack);
            this._renderSuffix(entry, textStack, meta, options);
            return;
        }

        this._renderPrefix(entry, textStack, meta, options);
        this._renderDataHeader(textStack, headerName, headerStyle, {
            isCollapsed: entry.collapsed
        });

        const id = CryptUtil.uid();
        Renderer._cache.inlineStatblock[id] = {
            pFn: async(ele)=>{
                const entLoaded = entry.data?._copy ? (await DataUtil.pDoMetaMergeSingle(entry.dataType, {
                    dependencies: {
                        [entry.dataType]: entry.dependencies
                    }
                }, entry.data, )) : entry.data;

                const ent = strategy?.pFnPreProcess ? await strategy.pFnPreProcess(entLoaded) : entLoaded;

                const tbl = ele.closest("table");
                const nxt = e_({
                    outer: Renderer.utils.getEmbeddedDataHeader(headerName, headerStyle, {
                        isCollapsed: entry.collapsed
                    }) + fnGetRenderCompact(ent, {
                        isEmbeddedEntity: true
                    }) + Renderer.utils.getEmbeddedDataFooter(),
                });
                tbl.parentNode.replaceChild(nxt, tbl, );
            }
            ,
        };

        textStack[0] += `<tr><td colspan="6"><style data-rd-cache-id="${id}" data-rd-cache="inlineStatblock" onload="Renderer._cache.pRunFromEle(this)"></style></td></tr>`;
        this._renderDataFooter(textStack);
        this._renderSuffix(entry, textStack, meta, options);
    }
    ;

    this._renderDataHeader = function(textStack, name, style, {isCollapsed=false}={}) {
        textStack[0] += Renderer.utils.getEmbeddedDataHeader(name, style, {
            isCollapsed
        });
    }
    ;

    this._renderDataFooter = function(textStack) {
        textStack[0] += Renderer.utils.getEmbeddedDataFooter();
    }
    ;

    this._renderStatblock = function(entry, textStack, meta, options) {
        this._renderPrefix(entry, textStack, meta, options);

        const page = entry.prop || Renderer.tag.getPage(entry.tag);
        const source = Parser.getTagSource(entry.tag, entry.source);
        const hash = entry.hash || (UrlUtil.URL_TO_HASH_BUILDER[page] ? UrlUtil.URL_TO_HASH_BUILDER[page]({
            ...entry,
            name: entry.name,
            source
        }) : null);

        const asTag = `{@${entry.tag} ${entry.name}|${source}${entry.displayName ? `|${entry.displayName}` : ""}}`;

        if (!page || !source || !hash) {
            this._renderDataHeader(textStack, entry.name, entry.style);
            textStack[0] += `<tr>
				<td colspan="6">
					<i class="text-danger">Cannot load ${entry.tag ? `&quot;${asTag}&quot;` : entry.displayName || entry.name}! An unknown tag/prop, source, or hash was provided.</i>
				</td>
			</tr>`;
            this._renderDataFooter(textStack);
            this._renderSuffix(entry, textStack, meta, options);

            return;
        }

        this._renderDataHeader(textStack, entry.displayName || entry.name, entry.style, {
            isCollapsed: entry.collapsed
        });
        textStack[0] += `<tr>
			<td colspan="6" data-rd-tag="${(entry.tag || "").qq()}" data-rd-page="${(page || "").qq()}" data-rd-source="${(source || "").qq()}" data-rd-hash="${(hash || "").qq()}" data-rd-name="${(entry.name || "").qq()}" data-rd-display-name="${(entry.displayName || "").qq()}" data-rd-style="${(entry.style || "").qq()}">
				<i>Loading ${entry.tag ? `${Renderer.get().render(asTag)}` : entry.displayName || entry.name}...</i>
				<style onload="Renderer.events.handleLoad_inlineStatblock(this)"></style>
			</td>
		</tr>`;
        this._renderDataFooter(textStack);
        this._renderSuffix(entry, textStack, meta, options);
    }
    ;

    this._renderGallery = function(entry, textStack, meta, options) {
        if (entry.name)
            textStack[0] += `<h5 class="rd__gallery-name">${entry.name}</h5>`;
        textStack[0] += `<div class="rd__wrp-gallery">`;
        const len = entry.images.length;
        const anyNamed = entry.images.some(it=>it.title);
        const isAnyCredited = entry.images.some(it=>it.credit);
        for (let i = 0; i < len; ++i) {
            const img = MiscUtil.copyFast(entry.images[i]);

            if (anyNamed && !img.title)
                img._galleryTitlePad = true;
            if (isAnyCredited && !img.credit)
                img._galleryCreditPad = true;

            delete img.imageType;
            this._recursiveRender(img, textStack, meta, options);
        }
        textStack[0] += `</div>`;
    }
    ;

    this._renderFlowchart = function(entry, textStack, meta, options) {
        textStack[0] += `<div class="rd__wrp-flowchart">`;
        const len = entry.blocks.length;
        for (let i = 0; i < len; ++i) {
            this._recursiveRender(entry.blocks[i], textStack, meta, options);
            if (i !== len - 1) {
                textStack[0] += `<div class="rd__s-v-flow"></div>`;
            }
        }
        textStack[0] += `</div>`;
    }
    ;

    this._renderFlowBlock = function(entry, textStack, meta, options) {
        const dataString = this._renderEntriesSubtypes_getDataString(entry);
        textStack[0] += `<${this.wrapperTag} class="rd__b-special rd__b-flow ve-text-center" ${dataString}>`;

        const cachedLastDepthTrackerProps = MiscUtil.copyFast(this._lastDepthTrackerInheritedProps);
        this._handleTrackDepth(entry, 1);

        if (entry.name != null) {
            if (Renderer.ENTRIES_WITH_ENUMERATED_TITLES_LOOKUP[entry.type])
                this._handleTrackTitles(entry.name);
            textStack[0] += `<span class="rd__h rd__h--2-flow-block" data-title-index="${this._headerIndex++}" ${this._getEnumeratedTitleRel(entry.name)}><h4 class="entry-title-inner">${this.render({
                type: "inline",
                entries: [entry.name]
            })}</h4></span>`;
        }
        if (entry.entries) {
            const len = entry.entries.length;
            for (let i = 0; i < len; ++i) {
                const cacheDepth = meta.depth;
                meta.depth = 2;
                this._recursiveRender(entry.entries[i], textStack, meta, {
                    prefix: "<p>",
                    suffix: "</p>"
                });
                meta.depth = cacheDepth;
            }
        }
        textStack[0] += `<div class="float-clear"></div>`;
        textStack[0] += `</${this.wrapperTag}>`;

        this._lastDepthTrackerInheritedProps = cachedLastDepthTrackerProps;
    }
    ;

    this._renderHomebrew = function(entry, textStack, meta, options) {
        this._renderPrefix(entry, textStack, meta, options);
        textStack[0] += `<div class="homebrew-section"><div class="homebrew-float"><span class="homebrew-notice"></span>`;

        if (entry.oldEntries) {
            const hoverMeta = Renderer.hover.getInlineHover({
                type: "entries",
                name: "Homebrew",
                entries: entry.oldEntries
            });
            let markerText;
            if (entry.movedTo) {
                markerText = "(See moved content)";
            } else if (entry.entries) {
                markerText = "(See replaced content)";
            } else {
                markerText = "(See removed content)";
            }
            textStack[0] += `<span class="homebrew-old-content" href="#${window.location.hash}" ${hoverMeta.html}>${markerText}</span>`;
        }

        textStack[0] += `</div>`;

        if (entry.entries) {
            const len = entry.entries.length;
            for (let i = 0; i < len; ++i)
                this._recursiveRender(entry.entries[i], textStack, meta, {
                    prefix: "<p>",
                    suffix: "</p>"
                });
        } else if (entry.movedTo) {
            textStack[0] += `<i>This content has been moved to ${entry.movedTo}.</i>`;
        } else {
            textStack[0] += "<i>This content has been deleted.</i>";
        }

        textStack[0] += `</div>`;
        this._renderSuffix(entry, textStack, meta, options);
    }
    ;

    this._renderCode = function(entry, textStack, meta, options) {
        const isWrapped = !!StorageUtil.syncGet("rendererCodeWrap");
        textStack[0] += `
			<div class="ve-flex-col h-100">
				<div class="ve-flex no-shrink pt-1">
					<button class="btn btn-default btn-xs mb-1 mr-2" onclick="Renderer.events.handleClick_copyCode(event, this)">Copy Code</button>
					<button class="btn btn-default btn-xs mb-1 ${isWrapped ? "active" : ""}" onclick="Renderer.events.handleClick_toggleCodeWrap(event, this)">Word Wrap</button>
				</div>
				<pre class="h-100 w-100 mb-1 ${isWrapped ? "rd__pre-wrap" : ""}">${entry.preformatted}</pre>
			</div>
		`;
    }
    ;

    this._renderHr = function(entry, textStack, meta, options) {
        textStack[0] += `<hr class="rd__hr">`;
    }
    ;

    this._getStyleClass = function(entryType, entry) {
        const outList = [];

        const pluginResults = this._getPlugins(`${entryType}_styleClass_fromSource`).map(plugin=>plugin(entryType, entry)).filter(Boolean);

        if (!pluginResults.some(it=>it.isSkip)) {
            if (SourceUtil.isNonstandardSource(entry.source) || (typeof PrereleaseUtil !== "undefined" && PrereleaseUtil.hasSourceJson(entry.source)))
                outList.push("spicy-sauce");
            if (typeof BrewUtil2 !== "undefined" && BrewUtil2.hasSourceJson(entry.source))
                outList.push("refreshing-brew");
        }

        if (this._extraSourceClasses)
            outList.push(...this._extraSourceClasses);
        for (const k in this._fnsGetStyleClasses) {
            const fromFn = this._fnsGetStyleClasses[k](entry);
            if (fromFn)
                outList.push(...fromFn);
        }
        if (entry.style)
            outList.push(this._getMutatedStyleString(entry.style));
        return outList.join(" ");
    }
    ;

    this._renderString = function(entry, textStack, meta, options) {
        const tagSplit = Renderer.splitByTags(entry);
        const len = tagSplit.length;
        for (let i = 0; i < len; ++i) {
            const s = tagSplit[i];
            if (!s)
                continue;
            if (s.startsWith("{@")) {
                const [tag,text] = Renderer.splitFirstSpace(s.slice(1, -1));
                this._renderString_renderTag(textStack, meta, options, tag, text);
            } else
                textStack[0] += s;
        }
    }
    ;

    this._renderString_renderTag = function(textStack, meta, options, tag, text) {
        for (const plugin of this._getPlugins("string_tag")) {
            const out = plugin(tag, text, textStack, meta, options);
            if (out)
                return void (textStack[0] += out);
        }

        for (const plugin of this._getPlugins(`string_${tag}`)) {
            const out = plugin(tag, text, textStack, meta, options);
            if (out)
                return void (textStack[0] += out);
        }

        switch (tag) {
        case "@b":
        case "@bold":
            textStack[0] += `<b>`;
            this._recursiveRender(text, textStack, meta);
            textStack[0] += `</b>`;
            break;
        case "@i":
        case "@italic":
            textStack[0] += `<i>`;
            this._recursiveRender(text, textStack, meta);
            textStack[0] += `</i>`;
            break;
        case "@s":
        case "@strike":
            textStack[0] += `<s>`;
            this._recursiveRender(text, textStack, meta);
            textStack[0] += `</s>`;
            break;
        case "@u":
        case "@underline":
            textStack[0] += `<u>`;
            this._recursiveRender(text, textStack, meta);
            textStack[0] += `</u>`;
            break;
        case "@sup":
            textStack[0] += `<sup>`;
            this._recursiveRender(text, textStack, meta);
            textStack[0] += `</sup>`;
            break;
        case "@sub":
            textStack[0] += `<sub>`;
            this._recursiveRender(text, textStack, meta);
            textStack[0] += `</sub>`;
            break;
        case "@kbd":
            textStack[0] += `<kbd>`;
            this._recursiveRender(text, textStack, meta);
            textStack[0] += `</kbd>`;
            break;
        case "@code":
            textStack[0] += `<span class="code">`;
            this._recursiveRender(text, textStack, meta);
            textStack[0] += `</span>`;
            break;
        case "@style":
            {
                const [displayText,styles] = Renderer.splitTagByPipe(text);
                const classNames = (styles || "").split(";").map(it=>Renderer._STYLE_TAG_ID_TO_STYLE[it.trim()]).filter(Boolean).join(" ");
                textStack[0] += `<span class="${classNames}">`;
                this._recursiveRender(displayText, textStack, meta);
                textStack[0] += `</span>`;
                break;
            }
        case "@font":
            {
                const [displayText,fontFamily] = Renderer.splitTagByPipe(text);
                textStack[0] += `<span style="font-family: '${fontFamily}'">`;
                this._recursiveRender(displayText, textStack, meta);
                textStack[0] += `</span>`;
                break;
            }
        case "@note":
            textStack[0] += `<i class="ve-muted">`;
            this._recursiveRender(text, textStack, meta);
            textStack[0] += `</i>`;
            break;
        case "@tip":
            {
                const [displayText,titielText] = Renderer.splitTagByPipe(text);
                textStack[0] += `<span title="${titielText.qq()}">`;
                this._recursiveRender(displayText, textStack, meta);
                textStack[0] += `</span>`;
                break;
            }
        case "@atk":
            textStack[0] += `<i>${Renderer.attackTagToFull(text)}</i>`;
            break;
        case "@h":
            textStack[0] += `<i>Hit:</i> `;
            break;
        case "@m":
            textStack[0] += `<i>Miss:</i> `;
            break;
        case "@color":
            {
                const [toDisplay,color] = Renderer.splitTagByPipe(text);
                const ptColor = this._renderString_renderTag_getBrewColorPart(color);

                textStack[0] += `<span class="rd__color" style="color: ${ptColor}">`;
                this._recursiveRender(toDisplay, textStack, meta);
                textStack[0] += `</span>`;
                break;
            }
        case "@highlight":
            {
                const [toDisplay,color] = Renderer.splitTagByPipe(text);
                const ptColor = this._renderString_renderTag_getBrewColorPart(color);

                textStack[0] += ptColor ? `<span style="background-color: ${ptColor}">` : `<span class="rd__highlight">`;
                textStack[0] += toDisplay;
                textStack[0] += `</span>`;
                break;
            }
        case "@help":
            {
                const [toDisplay,title=""] = Renderer.splitTagByPipe(text);
                textStack[0] += `<span class="help" title="${title.qq()}">`;
                this._recursiveRender(toDisplay, textStack, meta);
                textStack[0] += `</span>`;
                break;
            }

        case "@unit":
            {
                const [amount,unitSingle,unitPlural] = Renderer.splitTagByPipe(text);
                textStack[0] += isNaN(amount) ? unitSingle : Number(amount) > 1 ? (unitPlural || unitSingle.toPlural()) : unitSingle;
                break;
            }

        case "@comic":
            textStack[0] += `<span class="rd__comic">`;
            this._recursiveRender(text, textStack, meta);
            textStack[0] += `</span>`;
            break;
        case "@comicH1":
            textStack[0] += `<span class="rd__comic rd__comic--h1">`;
            this._recursiveRender(text, textStack, meta);
            textStack[0] += `</span>`;
            break;
        case "@comicH2":
            textStack[0] += `<span class="rd__comic rd__comic--h2">`;
            this._recursiveRender(text, textStack, meta);
            textStack[0] += `</span>`;
            break;
        case "@comicH3":
            textStack[0] += `<span class="rd__comic rd__comic--h3">`;
            this._recursiveRender(text, textStack, meta);
            textStack[0] += `</span>`;
            break;
        case "@comicH4":
            textStack[0] += `<span class="rd__comic rd__comic--h4">`;
            this._recursiveRender(text, textStack, meta);
            textStack[0] += `</span>`;
            break;
        case "@comicNote":
            textStack[0] += `<span class="rd__comic rd__comic--note">`;
            this._recursiveRender(text, textStack, meta);
            textStack[0] += `</span>`;
            break;

        case "@dc":
            {
                const [dcText,displayText] = Renderer.splitTagByPipe(text);
                textStack[0] += `DC <span class="rd__dc">${displayText || dcText}</span>`;
                break;
            }

        case "@dcYourSpellSave":
            {
                const [displayText] = Renderer.splitTagByPipe(text);
                textStack[0] += displayText || "your spell save DC";
                break;
            }

        case "@dice":
        case "@autodice":
        case "@damage":
        case "@hit":
        case "@d20":
        case "@chance":
        case "@coinflip":
        case "@recharge":
        case "@ability":
        case "@savingThrow":
        case "@skillCheck":
            {
                const fauxEntry = Renderer.utils.getTagEntry(tag, text);

                if (tag === "@recharge") {
                    const [,flagsRaw] = Renderer.splitTagByPipe(text);
                    const flags = flagsRaw ? flagsRaw.split("") : null;
                    textStack[0] += `${flags && flags.includes("m") ? "" : "("}Recharge `;
                    this._recursiveRender(fauxEntry, textStack, meta);
                    textStack[0] += `${flags && flags.includes("m") ? "" : ")"}`;
                } else {
                    this._recursiveRender(fauxEntry, textStack, meta);
                }

                break;
            }

        case "@hitYourSpellAttack":
            this._renderString_renderTag_hitYourSpellAttack(textStack, meta, options, tag, text);
            break;

        case "@scaledice":
        case "@scaledamage":
            {
                const fauxEntry = Renderer.parseScaleDice(tag, text);
                this._recursiveRender(fauxEntry, textStack, meta);
                break;
            }

        case "@filter":
            {
                const [displayText,page,...filters] = Renderer.splitTagByPipe(text);

                const filterSubhashMeta = Renderer.getFilterSubhashes(filters);

                const fauxEntry = {
                    type: "link",
                    text: displayText,
                    href: {
                        type: "internal",
                        path: `${page}.html`,
                        hash: HASH_BLANK,
                        hashPreEncoded: true,
                        subhashes: filterSubhashMeta.subhashes,
                    },
                };

                if (filterSubhashMeta.customHash)
                    fauxEntry.href.hash = filterSubhashMeta.customHash;

                this._recursiveRender(fauxEntry, textStack, meta);

                break;
            }
        case "@link":
            {
                const [displayText,url] = Renderer.splitTagByPipe(text);
                let outUrl = url == null ? displayText : url;
                if (!outUrl.startsWith("http"))
                    outUrl = `http://${outUrl}`;
                const fauxEntry = {
                    type: "link",
                    href: {
                        type: "external",
                        url: outUrl,
                    },
                    text: displayText,
                };
                this._recursiveRender(fauxEntry, textStack, meta);

                break;
            }
        case "@5etools":
            {
                const [displayText,page,hash] = Renderer.splitTagByPipe(text);
                const fauxEntry = {
                    type: "link",
                    href: {
                        type: "internal",
                        path: page,
                    },
                    text: displayText,
                };
                if (hash) {
                    fauxEntry.hash = hash;
                    fauxEntry.hashPreEncoded = true;
                }
                this._recursiveRender(fauxEntry, textStack, meta);

                break;
            }

        case "@footnote":
            {
                const [displayText,footnoteText,optTitle] = Renderer.splitTagByPipe(text);
                const hoverMeta = Renderer.hover.getInlineHover({
                    type: "entries",
                    name: optTitle ? optTitle.toTitleCase() : "Footnote",
                    entries: [footnoteText, optTitle ? `{@note ${optTitle}}` : ""].filter(Boolean),
                });
                textStack[0] += `<span class="help" ${hoverMeta.html}>`;
                this._recursiveRender(displayText, textStack, meta);
                textStack[0] += `</span>`;

                break;
            }
        case "@homebrew":
            {
                const [newText,oldText] = Renderer.splitTagByPipe(text);
                const tooltipEntries = [];
                if (newText && oldText) {
                    tooltipEntries.push("{@b This is a homebrew addition, replacing the following:}");
                } else if (newText) {
                    tooltipEntries.push("{@b This is a homebrew addition.}");
                } else if (oldText) {
                    tooltipEntries.push("{@b The following text has been removed with this homebrew:}");
                }
                if (oldText) {
                    tooltipEntries.push(oldText);
                }
                const hoverMeta = Renderer.hover.getInlineHover({
                    type: "entries",
                    name: "Homebrew Modifications",
                    entries: tooltipEntries,
                });
                textStack[0] += `<span class="homebrew-inline" ${hoverMeta.html}>`;
                this._recursiveRender(newText || "[...]", textStack, meta);
                textStack[0] += `</span>`;

                break;
            }
        case "@area":
            {
                const {areaId, displayText} = Renderer.tag.TAG_LOOKUP.area.getMeta(tag, text);

                if (typeof BookUtil === "undefined") {
                    textStack[0] += displayText;
                } else {
                    const area = BookUtil.curRender.headerMap[areaId] || {
                        entry: {
                            name: ""
                        }
                    };
                    const hoverMeta = Renderer.hover.getInlineHover(area.entry, {
                        isLargeBookContent: true,
                        depth: area.depth
                    });
                    textStack[0] += `<a href="#${BookUtil.curRender.curBookId},${area.chapter},${UrlUtil.encodeForHash(area.entry.name)},0" ${hoverMeta.html}>${displayText}</a>`;
                }

                break;
            }

        case "@loader":
            {
                const {name, path, mode} = this._renderString_getLoaderTagMeta(text);

                const brewUtilName = mode === "homebrew" ? "BrewUtil2" : mode === "prerelease" ? "PrereleaseUtil" : null;
                const brewUtil = globalThis[brewUtilName];

                if (!brewUtil) {
                    textStack[0] += `<span class="text-danger" title="Unknown loader mode &quot;${mode.qq()}&quot;!">${name}<span class="glyphicon glyphicon-alert rd__loadbrew-icon rd__loadbrew-icon"></span></span>`;

                    break;
                }

                textStack[0] += `<span onclick="${brewUtilName}.pAddBrewFromLoaderTag(this)" data-rd-loader-path="${path.escapeQuotes()}" data-rd-loader-name="${name.escapeQuotes()}" class="rd__wrp-loadbrew--ready" title="Click to install ${brewUtil.DISPLAY_NAME}">${name}<span class="glyphicon glyphicon-download-alt rd__loadbrew-icon rd__loadbrew-icon"></span></span>`;
                break;
            }

        case "@book":
        case "@adventure":
            {
                const page = tag === "@book" ? "book.html" : "adventure.html";
                const [displayText,book,chapter,section,rawNumber] = Renderer.splitTagByPipe(text);
                const number = rawNumber || 0;
                const hash = `${book}${chapter ? `${HASH_PART_SEP}${chapter}${section ? `${HASH_PART_SEP}${UrlUtil.encodeForHash(section)}${number != null ? `${HASH_PART_SEP}${UrlUtil.encodeForHash(number)}` : ""}` : ""}` : ""}`;
                const fauxEntry = {
                    type: "link",
                    href: {
                        type: "internal",
                        path: page,
                        hash,
                        hashPreEncoded: true,
                    },
                    text: displayText,
                };
                this._recursiveRender(fauxEntry, textStack, meta);

                break;
            }

        default:
            {
                const {name, source, displayText, others, page, hash, hashPreEncoded, pageHover, hashHover, hashPreEncodedHover, preloadId, linkText, subhashes, subhashesHover, isFauxPage} = Renderer.utils.getTagMeta(tag, text);

                const fauxEntry = {
                    type: "link",
                    href: {
                        type: "internal",
                        path: page,
                        hash,
                        hover: {
                            page,
                            isFauxPage,
                            source,
                        },
                    },
                    text: (displayText || name),
                };

                if (hashPreEncoded != null)
                    fauxEntry.href.hashPreEncoded = hashPreEncoded;
                if (pageHover != null)
                    fauxEntry.href.hover.page = pageHover;
                if (hashHover != null)
                    fauxEntry.href.hover.hash = hashHover;
                if (hashPreEncodedHover != null)
                    fauxEntry.href.hover.hashPreEncoded = hashPreEncodedHover;
                if (preloadId != null)
                    fauxEntry.href.hover.preloadId = preloadId;
                if (linkText)
                    fauxEntry.text = linkText;
                if (subhashes)
                    fauxEntry.href.subhashes = subhashes;
                if (subhashesHover)
                    fauxEntry.href.hover.subhashes = subhashesHover;

                this._recursiveRender(fauxEntry, textStack, meta);

                break;
            }
        }
    }
    ;

    this._renderString_renderTag_getBrewColorPart = function(color) {
        if (!color)
            return "";
        const scrubbedColor = BrewUtilShared.getValidColor(color, {
            isExtended: true
        });
        return scrubbedColor.startsWith("--") ? `var(${scrubbedColor})` : `#${scrubbedColor}`;
    }
    ;

    this._renderString_renderTag_hitYourSpellAttack = function(textStack, meta, options, tag, text) {
        const [displayText] = Renderer.splitTagByPipe(text);

        const fauxEntry = {
            type: "dice",
            rollable: true,
            subType: "d20",
            displayText: displayText || "your spell attack modifier",
            toRoll: `1d20 + #$prompt_number:title=Enter your Spell Attack Modifier$#`,
        };
        return this._recursiveRender(fauxEntry, textStack, meta);
    }
    ;

    this._renderString_getLoaderTagMeta = function(text, {isDefaultUrl=false}={}) {
        const [name,file,mode="homebrew"] = Renderer.splitTagByPipe(text);

        if (!isDefaultUrl)
            return {
                name,
                path: file,
                mode
            };

        const path = /^.*?:\/\//.test(file) ? file : `${VeCt.URL_ROOT_BREW}${file}`;
        return {
            name,
            path,
            mode
        };
    }
    ;

    this._renderPrimitive = function(entry, textStack, meta, options) {
        textStack[0] += entry;
    }
    ;

    this._renderLink = function(entry, textStack, meta, options) {
        let href = this._renderLink_getHref(entry);

        if (entry.href.hover && this._roll20Ids) {
            const procHash = UrlUtil.encodeForHash(entry.href.hash);
            const id = this._roll20Ids[procHash];
            if (id) {
                href = `http://journal.roll20.net/${id.type}/${id.roll20Id}`;
            }
        }

        const pluginData = this._getPlugins("link").map(plugin=>plugin(entry, textStack, meta, options)).filter(Boolean);
        const isDisableEvents = pluginData.some(it=>it.isDisableEvents);
        const additionalAttributes = pluginData.map(it=>it.attributes).filter(Boolean);

        if (this._isInternalLinksDisabled && entry.href.type === "internal") {
            textStack[0] += `<span class="bold" ${isDisableEvents ? "" : this._renderLink_getHoverString(entry)} ${additionalAttributes.join(" ")}>${this.render(entry.text)}</span>`;
        } else if (entry.href.hover?.isFauxPage) {
            textStack[0] += `<span class="help help--hover" ${isDisableEvents ? "" : this._renderLink_getHoverString(entry)} ${additionalAttributes.join(" ")}>${this.render(entry.text)}</span>`;
        } else {
            textStack[0] += `<a href="${href.qq()}" ${entry.href.type === "internal" ? "" : `target="_blank" rel="noopener noreferrer"`} ${isDisableEvents ? "" : this._renderLink_getHoverString(entry)} ${additionalAttributes.join(" ")}>${this.render(entry.text)}</a>`;
        }
    }
    ;

    this._renderLink_getHref = function(entry) {
        let href;
        if (entry.href.type === "internal") {
            href = `${this.baseUrl}${entry.href.path}#`;
            if (entry.href.hash != null) {
                href += entry.href.hashPreEncoded ? entry.href.hash : UrlUtil.encodeForHash(entry.href.hash);
            }
            if (entry.href.subhashes != null) {
                href += Renderer.utils.getLinkSubhashString(entry.href.subhashes);
            }
        } else if (entry.href.type === "external") {
            href = entry.href.url;
        }
        return href;
    }
    ;

    this._renderLink_getHoverString = function(entry) {
        if (!entry.href.hover || !this._isAddHandlers)
            return "";

        let procHash = entry.href.hover.hash ? entry.href.hover.hashPreEncoded ? entry.href.hover.hash : UrlUtil.encodeForHash(entry.href.hover.hash) : entry.href.hashPreEncoded ? entry.href.hash : UrlUtil.encodeForHash(entry.href.hash);

        if (this._tagExportDict) {
            this._tagExportDict[procHash] = {
                page: entry.href.hover.page,
                source: entry.href.hover.source,
                hash: procHash,
            };
        }

        if (entry.href.hover.subhashes) {
            procHash += Renderer.utils.getLinkSubhashString(entry.href.hover.subhashes);
        }

        const pluginData = this._getPlugins("link_attributesHover").map(plugin=>plugin(entry, procHash)).filter(Boolean);
        const replacementAttributes = pluginData.map(it=>it.attributesHoverReplace).filter(Boolean);
        if (replacementAttributes.length)
            return replacementAttributes.join(" ");

        return `onmouseover="Renderer.hover.pHandleLinkMouseOver(event, this)" onmouseleave="Renderer.hover.handleLinkMouseLeave(event, this)" onmousemove="Renderer.hover.handleLinkMouseMove(event, this)" data-vet-page="${entry.href.hover.page.qq()}" data-vet-source="${entry.href.hover.source.qq()}" data-vet-hash="${procHash.qq()}" ${entry.href.hover.preloadId != null ? `data-vet-preload-id="${`${entry.href.hover.preloadId}`.qq()}"` : ""} ${entry.href.hover.isFauxPage ? `data-vet-is-faux-page="true"` : ""} ${Renderer.hover.getPreventTouchString()}`;
    }
    ;

    this.render = function(entry, depth=0) {
        const tempStack = [];
        this.recursiveRender(entry, tempStack, {
            depth
        });
        return tempStack.join("");
    }
    ;
};

Renderer.ENTRIES_WITH_ENUMERATED_TITLES = [{
    type: "section",
    key: "entries",
    depth: -1
}, {
    type: "entries",
    key: "entries",
    depthIncrement: 1
}, {
    type: "options",
    key: "entries"
}, {
    type: "inset",
    key: "entries",
    depth: 2
}, {
    type: "insetReadaloud",
    key: "entries",
    depth: 2
}, {
    type: "variant",
    key: "entries",
    depth: 2
}, {
    type: "variantInner",
    key: "entries",
    depth: 2
}, {
    type: "actions",
    key: "entries",
    depth: 2
}, {
    type: "flowBlock",
    key: "entries",
    depth: 2
}, {
    type: "optfeature",
    key: "entries",
    depthIncrement: 1
}, {
    type: "patron",
    key: "entries"
}, ];

Renderer.ENTRIES_WITH_ENUMERATED_TITLES_LOOKUP = Renderer.ENTRIES_WITH_ENUMERATED_TITLES.mergeMap(it=>({
    [it.type]: it
}));

Renderer.ENTRIES_WITH_CHILDREN = [...Renderer.ENTRIES_WITH_ENUMERATED_TITLES, {
    type: "list",
    key: "items"
}, {
    type: "table",
    key: "rows"
}, ];

Renderer._INLINE_HEADER_TERMINATORS = new Set([".", ",", "!", "?", ";", ":", `"`]);

Renderer._STYLE_TAG_ID_TO_STYLE = {
    "small-caps": "small-caps",
    "small": "ve-small",
    "capitalize": "capitalize",
    "dnd-font": "dnd-font",
};

Renderer.get = ()=>{
    if (!Renderer.defaultRenderer)
        Renderer.defaultRenderer = new Renderer();
    return Renderer.defaultRenderer;
}
;

Renderer.applyProperties = function(entry, object) {
    const propSplit = Renderer.splitByPropertyInjectors(entry);
    const len = propSplit.length;
    if (len === 1)
        return entry;

    let textStack = "";

    for (let i = 0; i < len; ++i) {
        const s = propSplit[i];
        if (!s)
            continue;

        if (!s.startsWith("{=")) {
            textStack += s;
            continue;
        }

        if (s.startsWith("{=")) {
            const [path,modifiers] = s.slice(2, -1).split("/");
            let fromProp = object[path];

            if (!modifiers) {
                textStack += fromProp;
                continue;
            }

            if (fromProp == null)
                throw new Error(`Could not apply property in "${s}"; "${path}" value was null!`);

            modifiers.split("").sort((a,b)=>Renderer.applyProperties._OP_ORDER.indexOf(a) - Renderer.applyProperties._OP_ORDER.indexOf(b));

            for (const modifier of modifiers) {
                switch (modifier) {
                case "a":
                    fromProp = Renderer.applyProperties._LEADING_AN.has(fromProp[0].toLowerCase()) ? "an" : "a";
                    break;

                case "l":
                    fromProp = fromProp.toLowerCase();
                    break;
                case "t":
                    fromProp = fromProp.toTitleCase();
                    break;
                case "u":
                    fromProp = fromProp.toUpperCase();
                    break;
                case "v":
                    fromProp = Parser.numberToVulgar(fromProp);
                    break;
                case "x":
                    fromProp = Parser.numberToText(fromProp);
                    break;
                case "r":
                    fromProp = Math.round(fromProp);
                    break;
                case "f":
                    fromProp = Math.floor(fromProp);
                    break;
                case "c":
                    fromProp = Math.ceil(fromProp);
                    break;
                default:
                    throw new Error(`Unhandled property modifier "${modifier}"`);
                }
            }

            textStack += fromProp;
        }
    }

    return textStack;
}
;
Renderer.applyProperties._LEADING_AN = new Set(["a", "e", "i", "o", "u"]);
Renderer.applyProperties._OP_ORDER = ["r", "f", "c", "v", "x", "l", "t", "u", "a", ];

Renderer.applyAllProperties = function(entries, object=null) {
    let lastObj = null;
    const handlers = {
        object: (obj)=>{
            lastObj = obj;
            return obj;
        }
        ,
        string: (str)=>Renderer.applyProperties(str, object || lastObj),
    };
    return MiscUtil.getWalker().walk(entries, handlers);
}
;

Renderer.attackTagToFull = function(tagStr) {
    function renderTag(tags) {
        return `${tags.includes("m") ? "Melee " : tags.includes("r") ? "Ranged " : tags.includes("g") ? "Magical " : tags.includes("a") ? "Area " : ""}${tags.includes("w") ? "Weapon " : tags.includes("s") ? "Spell " : tags.includes("p") ? "Power " : ""}`;
    }

    const tagGroups = tagStr.toLowerCase().split(",").map(it=>it.trim()).filter(it=>it).map(it=>it.split(""));
    if (tagGroups.length > 1) {
        const seen = new Set(tagGroups.last());
        for (let i = tagGroups.length - 2; i >= 0; --i) {
            tagGroups[i] = tagGroups[i].filter(it=>{
                const out = !seen.has(it);
                seen.add(it);
                return out;
            }
            );
        }
    }
    return `${tagGroups.map(it=>renderTag(it)).join(" or ")}Attack:`;
}
;

Renderer.splitFirstSpace = function(string) {
    const firstIndex = string.indexOf(" ");
    return firstIndex === -1 ? [string, ""] : [string.substr(0, firstIndex), string.substr(firstIndex + 1)];
}
;

Renderer._splitByTagsBase = function(leadingCharacter) {
    return function(string) {
        let tagDepth = 0;
        let char, char2;
        const out = [];
        let curStr = "";
        let isLastOpen = false;

        const len = string.length;
        for (let i = 0; i < len; ++i) {
            char = string[i];
            char2 = string[i + 1];

            switch (char) {
            case "{":
                isLastOpen = true;
                if (char2 === leadingCharacter) {
                    if (tagDepth++ > 0) {
                        curStr += "{";
                    } else {
                        out.push(curStr.replace(/<VE_LEAD>/g, leadingCharacter));
                        curStr = `{${leadingCharacter}`;
                        ++i;
                    }
                } else
                    curStr += "{";
                break;

            case "}":
                isLastOpen = false;
                curStr += "}";
                if (tagDepth !== 0 && --tagDepth === 0) {
                    out.push(curStr.replace(/<VE_LEAD>/g, leadingCharacter));
                    curStr = "";
                }
                break;

            case leadingCharacter:
                {
                    if (!isLastOpen)
                        curStr += "<VE_LEAD>";
                    else
                        curStr += leadingCharacter;
                    break;
                }

            default:
                isLastOpen = false;
                curStr += char;
                break;
            }
        }

        if (curStr)
            out.push(curStr.replace(/<VE_LEAD>/g, leadingCharacter));

        return out;
    }
    ;
}
;

Renderer.splitByTags = Renderer._splitByTagsBase("@");
Renderer.splitByPropertyInjectors = Renderer._splitByTagsBase("=");

Renderer._splitByPipeBase = function(leadingCharacter) {
    return function(string) {
        let tagDepth = 0;
        let char, char2;
        const out = [];
        let curStr = "";

        const len = string.length;
        for (let i = 0; i < len; ++i) {
            char = string[i];
            char2 = string[i + 1];

            switch (char) {
            case "{":
                if (char2 === leadingCharacter)
                    tagDepth++;
                curStr += "{";

                break;

            case "}":
                if (tagDepth)
                    tagDepth--;
                curStr += "}";

                break;

            case "|":
                {
                    if (tagDepth)
                        curStr += "|";
                    else {
                        out.push(curStr);
                        curStr = "";
                    }
                    break;
                }

            default:
                {
                    curStr += char;
                    break;
                }
            }
        }

        if (curStr)
            out.push(curStr);
        return out;
    }
    ;
}
;

Renderer.splitTagByPipe = Renderer._splitByPipeBase("@");

Renderer.getEntryDice = function(entry, name, opts={}) {
    const toDisplay = Renderer.getEntryDiceDisplayText(entry);

    if (entry.rollable === true)
        return Renderer.getRollableEntryDice(entry, name, toDisplay, opts);
    else
        return toDisplay;
}
;

Renderer.getRollableEntryDice = function(entry, name, toDisplay, {isAddHandlers=true, pluginResults=null, }={}, ) {
    const toPack = MiscUtil.copyFast(entry);
    if (typeof toPack.toRoll !== "string") {
        toPack.toRoll = Renderer.legacyDiceToString(toPack.toRoll);
    }

    const handlerPart = isAddHandlers ? `onmousedown="event.preventDefault()" data-packed-dice='${JSON.stringify(toPack).qq()}'` : "";

    const rollableTitlePart = isAddHandlers ? Renderer.getEntryDiceTitle(toPack.subType) : null;
    const titlePart = isAddHandlers ? `title="${[name, rollableTitlePart].filter(Boolean).join(". ").qq()}" ${name ? `data-roll-name="${name}"` : ""}` : name ? `title="${name.qq()}" data-roll-name="${name.qq()}"` : "";

    const additionalDataPart = (pluginResults || []).filter(it=>it.additionalData).map(it=>{
        return Object.entries(it.additionalData).map(([dataKey,val])=>`${dataKey}='${typeof val === "object" ? JSON.stringify(val).qq() : `${val}`.qq()}'`).join(" ");
    }
    ).join(" ");

    toDisplay = (pluginResults || []).filter(it=>it.toDisplay)[0]?.toDisplay ?? toDisplay;

    const ptRoll = Renderer.getRollableEntryDice._getPtRoll(toPack);

    return `<span class="roller render-roller" ${titlePart} ${handlerPart} ${additionalDataPart}>${toDisplay}</span>${ptRoll}`;
}
;

Renderer.getRollableEntryDice._getPtRoll = (toPack)=>{
    if (!toPack.autoRoll)
        return "";

    const r = Renderer.dice.parseRandomise2(toPack.toRoll);
    return ` (<span data-rd-is-autodice-result="true">${r}</span>)`;
}
;

Renderer.getEntryDiceTitle = function(subType) {
    return `Click to roll. ${subType === "damage" ? "SHIFT to roll a critical hit, CTRL to half damage (rounding down)." : subType === "d20" ? "SHIFT to roll with advantage, CTRL to roll with disadvantage." : "SHIFT/CTRL to roll twice."}`;
}
;

Renderer.legacyDiceToString = function(array) {
    let stack = "";
    array.forEach(r=>{
        stack += `${r.neg ? "-" : stack === "" ? "" : "+"}${r.number || 1}d${r.faces}${r.mod ? r.mod > 0 ? `+${r.mod}` : r.mod : ""}`;
    }
    );
    return stack;
}
;

Renderer.getEntryDiceDisplayText = function(entry) {
    if (entry.displayText)
        return entry.displayText;
    return Renderer._getEntryDiceDisplayText_getDiceAsStr(entry);
}
;

Renderer._getEntryDiceDisplayText_getDiceAsStr = function(entry) {
    if (entry.successThresh != null)
        return `${entry.successThresh} percent`;
    if (typeof entry.toRoll === "string")
        return entry.toRoll;
    return Renderer.legacyDiceToString(entry.toRoll);
}
;

Renderer.parseScaleDice = function(tag, text) {
    const [baseRoll,progression,addPerProgress,renderMode,displayText] = Renderer.splitTagByPipe(text);
    const progressionParse = MiscUtil.parseNumberRange(progression, 1, 9);
    const baseLevel = Math.min(...progressionParse);
    const options = {};
    const isMultableDice = /^(\d+)d(\d+)$/i.exec(addPerProgress);

    const getSpacing = ()=>{
        let diff = null;
        const sorted = [...progressionParse].sort(SortUtil.ascSort);
        for (let i = 1; i < sorted.length; ++i) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            if (diff == null)
                diff = curr - prev;
            else if (curr - prev !== diff)
                return null;
        }
        return diff;
    }
    ;

    const spacing = getSpacing();
    progressionParse.forEach(k=>{
        const offset = k - baseLevel;
        if (isMultableDice && spacing != null) {
            options[k] = offset ? `${Number(isMultableDice[1]) * (offset / spacing)}d${isMultableDice[2]}` : "";
        } else {
            options[k] = offset ? [...new Array(Math.floor(offset / spacing))].map(_=>addPerProgress).join("+") : "";
        }
    }
    );

    const out = {
        type: "dice",
        rollable: true,
        toRoll: baseRoll,
        displayText: displayText || addPerProgress,
        prompt: {
            entry: renderMode === "psi" ? "Spend Psi Points..." : "Cast at...",
            mode: renderMode,
            options,
        },
    };
    if (tag === "@scaledamage")
        out.subType = "damage";

    return out;
}
;

Renderer.getAbilityData = function(abArr, {isOnlyShort, isCurrentLineage}={}) {
    if (isOnlyShort && isCurrentLineage)
        return new Renderer._AbilityData({
            asTextShort: "Lineage (choose)"
        });

    const outerStack = (abArr || [null]).map(it=>Renderer.getAbilityData._doRenderOuter(it));
    if (outerStack.length <= 1)
        return outerStack[0];
    return new Renderer._AbilityData({
        asText: `Choose one of: ${outerStack.map((it,i)=>`(${Parser.ALPHABET[i].toLowerCase()}) ${it.asText}`).join(" ")}`,
        asTextShort: `${outerStack.map((it,i)=>`(${Parser.ALPHABET[i].toLowerCase()}) ${it.asTextShort}`).join(" ")}`,
        asCollection: [...new Set(outerStack.map(it=>it.asCollection).flat())],
        areNegative: [...new Set(outerStack.map(it=>it.areNegative).flat())],
    });
}
;

Renderer.getAbilityData._doRenderOuter = function(abObj) {
    const mainAbs = [];
    const asCollection = [];
    const areNegative = [];
    const toConvertToText = [];
    const toConvertToShortText = [];

    if (abObj != null) {
        handleAllAbilities(abObj);
        handleAbilitiesChoose();
        return new Renderer._AbilityData({
            asText: toConvertToText.join("; "),
            asTextShort: toConvertToShortText.join("; "),
            asCollection: asCollection,
            areNegative: areNegative,
        });
    }

    return new Renderer._AbilityData();

    function handleAllAbilities(abObj, targetList) {
        MiscUtil.copyFast(Parser.ABIL_ABVS).sort((a,b)=>SortUtil.ascSort(abObj[b] || 0, abObj[a] || 0)).forEach(shortLabel=>handleAbility(abObj, shortLabel, targetList));
    }

    function handleAbility(abObj, shortLabel, optToConvertToTextStorage) {
        if (abObj[shortLabel] != null) {
            const isNegMod = abObj[shortLabel] < 0;
            const toAdd = `${shortLabel.uppercaseFirst()} ${(isNegMod ? "" : "+")}${abObj[shortLabel]}`;

            if (optToConvertToTextStorage) {
                optToConvertToTextStorage.push(toAdd);
            } else {
                toConvertToText.push(toAdd);
                toConvertToShortText.push(toAdd);
            }

            mainAbs.push(shortLabel.uppercaseFirst());
            asCollection.push(shortLabel);
            if (isNegMod)
                areNegative.push(shortLabel);
        }
    }

    function handleAbilitiesChoose() {
        if (abObj.choose != null) {
            const ch = abObj.choose;
            let outStack = "";
            if (ch.weighted) {
                const w = ch.weighted;
                const froms = w.from.map(it=>it.uppercaseFirst());
                const isAny = froms.length === 6;
                const isAllEqual = w.weights.unique().length === 1;
                let cntProcessed = 0;

                const weightsIncrease = w.weights.filter(it=>it >= 0).sort(SortUtil.ascSort).reverse();
                const weightsReduce = w.weights.filter(it=>it < 0).map(it=>-it).sort(SortUtil.ascSort);

                const areIncreaseShort = [];
                const areIncrease = isAny && isAllEqual && w.weights.length > 1 && w.weights[0] >= 0 ? (()=>{
                    weightsIncrease.forEach(it=>areIncreaseShort.push(`+${it}`));
                    return [`${cntProcessed ? "choose " : ""}${Parser.numberToText(w.weights.length)} different +${weightsIncrease[0]}`];
                }
                )() : weightsIncrease.map(it=>{
                    areIncreaseShort.push(`+${it}`);
                    if (isAny)
                        return `${cntProcessed ? "choose " : ""}any ${cntProcessed++ ? `other ` : ""}+${it}`;
                    return `one ${cntProcessed++ ? `other ` : ""}ability to increase by ${it}`;
                }
                );

                const areReduceShort = [];
                const areReduce = isAny && isAllEqual && w.weights.length > 1 && w.weights[0] < 0 ? (()=>{
                    weightsReduce.forEach(it=>areReduceShort.push(`-${it}`));
                    return [`${cntProcessed ? "choose " : ""}${Parser.numberToText(w.weights.length)} different -${weightsReduce[0]}`];
                }
                )() : weightsReduce.map(it=>{
                    areReduceShort.push(`-${it}`);
                    if (isAny)
                        return `${cntProcessed ? "choose " : ""}any ${cntProcessed++ ? `other ` : ""}-${it}`;
                    return `one ${cntProcessed++ ? `other ` : ""}ability to decrease by ${it}`;
                }
                );

                const startText = isAny ? `Choose ` : `From ${froms.joinConjunct(", ", " and ")} choose `;

                const ptAreaIncrease = isAny ? areIncrease.concat(areReduce).join("; ") : areIncrease.concat(areReduce).joinConjunct(", ", isAny ? "; " : " and ");
                toConvertToText.push(`${startText}${ptAreaIncrease}`);
                toConvertToShortText.push(`${isAny ? "Any combination " : ""}${areIncreaseShort.concat(areReduceShort).join("/")}${isAny ? "" : ` from ${froms.join("/")}`}`);
            } else {
                const allAbilities = ch.from.length === 6;
                const allAbilitiesWithParent = isAllAbilitiesWithParent(ch);
                let amount = ch.amount === undefined ? 1 : ch.amount;
                amount = (amount < 0 ? "" : "+") + amount;
                if (allAbilities) {
                    outStack += "any ";
                } else if (allAbilitiesWithParent) {
                    outStack += "any other ";
                }
                if (ch.count != null && ch.count > 1) {
                    outStack += `${Parser.numberToText(ch.count)} `;
                }
                if (allAbilities || allAbilitiesWithParent) {
                    outStack += `${ch.count > 1 ? "unique " : ""}${amount}`;
                } else {
                    for (let j = 0; j < ch.from.length; ++j) {
                        let suffix = "";
                        if (ch.from.length > 1) {
                            if (j === ch.from.length - 2) {
                                suffix = " or ";
                            } else if (j < ch.from.length - 2) {
                                suffix = ", ";
                            }
                        }
                        let thsAmount = ` ${amount}`;
                        if (ch.from.length > 1) {
                            if (j !== ch.from.length - 1) {
                                thsAmount = "";
                            }
                        }
                        outStack += ch.from[j].uppercaseFirst() + thsAmount + suffix;
                    }
                }
            }

            if (outStack.trim()) {
                toConvertToText.push(`Choose ${outStack}`);
                toConvertToShortText.push(outStack.uppercaseFirst());
            }
        }
    }

    function isAllAbilitiesWithParent(chooseAbs) {
        const tempAbilities = [];
        for (let i = 0; i < mainAbs.length; ++i) {
            tempAbilities.push(mainAbs[i].toLowerCase());
        }
        for (let i = 0; i < chooseAbs.from.length; ++i) {
            const ab = chooseAbs.from[i].toLowerCase();
            if (!tempAbilities.includes(ab))
                tempAbilities.push(ab);
            if (!asCollection.includes(ab.toLowerCase))
                asCollection.push(ab.toLowerCase());
        }
        return tempAbilities.length === 6;
    }
}
;

Renderer._AbilityData = function({asText, asTextShort, asCollection, areNegative}={}) {
    this.asText = asText || "";
    this.asTextShort = asTextShort || "";
    this.asCollection = asCollection || [];
    this.areNegative = areNegative || [];
}
;

Renderer.getFilterSubhashes = function(filters, namespace=null) {
    let customHash = null;

    const subhashes = filters.map(f=>{
        const [fName,fVals,fMeta,fOpts] = f.split("=").map(s=>s.trim());
        const isBoxData = fName.startsWith("fb");
        const key = isBoxData ? `${fName}${namespace ? `.${namespace}` : ""}` : `flst${namespace ? `.${namespace}` : ""}${UrlUtil.encodeForHash(fName)}`;

        let value;
        if (isBoxData) {
            return {
                key,
                value: fVals,
                preEncoded: true,
            };
        } else if (fName === "search") {
            return {
                key: VeCt.FILTER_BOX_SUB_HASH_SEARCH_PREFIX,
                value: UrlUtil.encodeForHash(fVals),
                preEncoded: true,
            };
        } else if (fName === "hash") {
            customHash = fVals;
            return null;
        } else if (fVals.startsWith("[") && fVals.endsWith("]")) {
            const [min,max] = fVals.substring(1, fVals.length - 1).split(";").map(it=>it.trim());
            if (max == null) {
                value = [`min=${min}`, `max=${min}`, ].join(HASH_SUB_LIST_SEP);
            } else {
                value = [min ? `min=${min}` : "", max ? `max=${max}` : "", ].filter(Boolean).join(HASH_SUB_LIST_SEP);
            }
        } else if (fVals.startsWith("::") && fVals.endsWith("::")) {
            value = fVals.substring(2, fVals.length - 2).split(";").map(it=>it.trim()).map(it=>{
                if (it.startsWith("!"))
                    return `${UrlUtil.encodeForHash(it.slice(1))}=${UrlUtil.mini.compress(false)}`;
                return `${UrlUtil.encodeForHash(it)}=${UrlUtil.mini.compress(true)}`;
            }
            ).join(HASH_SUB_LIST_SEP);
        } else {
            value = fVals.split(";").map(s=>s.trim()).filter(Boolean).map(s=>{
                if (s.startsWith("!"))
                    return `${UrlUtil.encodeForHash(s.slice(1))}=2`;
                return `${UrlUtil.encodeForHash(s)}=1`;
            }
            ).join(HASH_SUB_LIST_SEP);
        }

        const out = [{
            key,
            value,
            preEncoded: true,
        }];

        if (fMeta) {
            out.push({
                key: `flmt${UrlUtil.encodeForHash(fName)}`,
                value: fMeta,
                preEncoded: true,
            });
        }

        if (fOpts) {
            out.push({
                key: `flop${UrlUtil.encodeForHash(fName)}`,
                value: fOpts,
                preEncoded: true,
            });
        }

        return out;
    }
    ).flat().filter(Boolean);

    return {
        customHash,
        subhashes,
    };
}
;

Renderer._cache = {
    inlineStatblock: {},

    async pRunFromEle(ele) {
        const cached = Renderer._cache[ele.dataset.rdCache][ele.dataset.rdCacheId];
        await cached.pFn(ele);
    },
};

Renderer.utils = {
    getBorderTr: (optText=null)=>{
        return `<tr><th class="border" colspan="6">${optText || ""}</th></tr>`;
    }
    ,

    getDividerTr: ()=>{
        return `<tr><td class="divider" colspan="6"><div></div></td></tr>`;
    }
    ,

    getSourceSubText(it) {
        return it.sourceSub ? ` \u2014 ${it.sourceSub}` : "";
    },

    getNameTr: (it,opts)=>{
        opts = opts || {};

        let dataPart = "";
        let pageLinkPart;
        if (opts.page) {
            const hash = UrlUtil.URL_TO_HASH_BUILDER[opts.page](it);
            dataPart = `data-page="${opts.page}" data-source="${it.source.escapeQuotes()}" data-hash="${hash.escapeQuotes()}" ${opts.extensionData != null ? `data-extension='${JSON.stringify(opts.extensionData).escapeQuotes()}` : ""}'`;
            pageLinkPart = SourceUtil.getAdventureBookSourceHref(it.source, it.page);

            if (opts.isEmbeddedEntity)
                ExtensionUtil.addEmbeddedToCache(opts.page, it.source, hash, it);
        }

        const tagPartSourceStart = `<${pageLinkPart ? `a href="${Renderer.get().baseUrl}${pageLinkPart}"` : "span"}`;
        const tagPartSourceEnd = `</${pageLinkPart ? "a" : "span"}>`;

        const ptBrewSourceLink = Renderer.utils._getNameTr_getPtPrereleaseBrewSourceLink({
            ent: it,
            brewUtil: PrereleaseUtil
        }) || Renderer.utils._getNameTr_getPtPrereleaseBrewSourceLink({
            ent: it,
            brewUtil: BrewUtil2
        });

        const $ele = $$`<tr>
			<th class="rnd-name ${opts.extraThClasses ? opts.extraThClasses.join(" ") : ""}" colspan="6" ${dataPart}>
				<div class="name-inner">
					<div class="ve-flex-v-center">
						<h1 class="stats-name copyable m-0" onmousedown="event.preventDefault()" onclick="Renderer.utils._pHandleNameClick(this)">${opts.prefix || ""}${it._displayName || it.name}${opts.suffix || ""}</h1>
						${opts.controlRhs || ""}
						${!IS_VTT && ExtensionUtil.ACTIVE && opts.page ? Renderer.utils.getBtnSendToFoundryHtml() : ""}
					</div>
					<div class="stats-source ve-flex-v-baseline">
						${tagPartSourceStart} class="help-subtle stats-source-abbreviation ${it.source ? `${Parser.sourceJsonToColor(it.source)}" title="${Parser.sourceJsonToFull(it.source)}${Renderer.utils.getSourceSubText(it)}` : ""}" ${Parser.sourceJsonToStyle(it.source)}>${it.source ? Parser.sourceJsonToAbv(it.source) : ""}${tagPartSourceEnd}

						${Renderer.utils.isDisplayPage(it.page) ? ` ${tagPartSourceStart} class="rd__stats-name-page ml-1" title="Page ${it.page}">p${it.page}${tagPartSourceEnd}` : ""}

						${ptBrewSourceLink}
					</div>
				</div>
			</th>
		</tr>`;

        if (opts.asJquery)
            return $ele;
        else
            return $ele[0].outerHTML;
    }
    ,

    _getNameTr_getPtPrereleaseBrewSourceLink({ent, brewUtil}) {
        if (!brewUtil.hasSourceJson(ent.source) || !brewUtil.sourceJsonToSource(ent.source)?.url)
            return "";

        return `<a href="${brewUtil.sourceJsonToSource(ent.source).url}" title="View ${brewUtil.DISPLAY_NAME.toTitleCase()} Source" class="ve-self-flex-center ml-2 ve-muted rd__stats-name-brew-link" target="_blank" rel="noopener noreferrer"><span class="	glyphicon glyphicon-share"></span></a>`;
    },

    getBtnSendToFoundryHtml({isMb=true}={}) {
        return `<button title="Send to Foundry (SHIFT for Temporary Import)" class="btn btn-xs btn-default btn-stats-name mx-2 ${isMb ? "mb-2" : ""} ve-self-flex-end" onclick="ExtensionUtil.pDoSendStats(event, this)" draggable="true" ondragstart="ExtensionUtil.doDragStart(event, this)"><span class="glyphicon glyphicon-send"></span></button>`;
    },

    isDisplayPage(page) {
        return page != null && ((!isNaN(page) && page > 0) || isNaN(page));
    },

    getExcludedTr({entity, dataProp, page, isExcluded}) {
        const excludedHtml = Renderer.utils.getExcludedHtml({
            entity,
            dataProp,
            page,
            isExcluded
        });
        if (!excludedHtml)
            return "";
        return `<tr><td colspan="6" class="pt-3">${excludedHtml}</td></tr>`;
    },

    getExcludedHtml({entity, dataProp, page, isExcluded}) {
        if (isExcluded != null && !isExcluded)
            return "";
        if (isExcluded == null) {
            if (!ExcludeUtil.isInitialised)
                return "";
            if (page && !UrlUtil.URL_TO_HASH_BUILDER[page])
                return "";
            const hash = page ? UrlUtil.URL_TO_HASH_BUILDER[page](entity) : UrlUtil.autoEncodeHash(entity);
            isExcluded = isExcluded || dataProp === "item" ? Renderer.item.isExcluded(entity, {
                hash
            }) : ExcludeUtil.isExcluded(hash, dataProp, entity.source);
        }
        return isExcluded ? `<div class="ve-text-center text-danger"><b><i>Warning: This content has been <a href="blocklist.html">blocklisted</a>.</i></b></div>` : "";
    },

    getSourceAndPageTrHtml(it, {tag, fnUnpackUid}={}) {
        const html = Renderer.utils.getSourceAndPageHtml(it, {
            tag,
            fnUnpackUid
        });
        return html ? `<b>Source:</b> ${html}` : "";
    },

    _getAltSourceHtmlOrText(it, prop, introText, isText) {
        if (!it[prop] || !it[prop].length)
            return "";

        return `${introText} ${it[prop].map(as=>{
            if (as.entry)
                return (isText ? Renderer.stripTags : Renderer.get().render)(as.entry);
            return `${isText ? "" : `<i class="help-subtle" title="${Parser.sourceJsonToFull(as.source).qq()}">`}${Parser.sourceJsonToAbv(as.source)}${isText ? "" : `</i>`}${Renderer.utils.isDisplayPage(as.page) ? `, page ${as.page}` : ""}`;
        }
        ).join("; ")}`;
    },

    _getReprintedAsHtmlOrText(ent, {isText, tag, fnUnpackUid}={}) {
        if (!ent.reprintedAs)
            return "";
        if (!tag || !fnUnpackUid)
            return "";

        const ptReprinted = ent.reprintedAs.map(it=>{
            const uid = it.uid ?? it;
            const tag_ = it.tag ?? tag;

            const {name, source, displayText} = fnUnpackUid(uid);

            if (isText) {
                return `${Renderer.stripTags(displayText || name)} in ${Parser.sourceJsonToAbv(source)}`;
            }

            const asTag = `{@${tag_} ${name}|${source}${displayText ? `|${displayText}` : ""}}`;

            return `${Renderer.get().render(asTag)} in <i class="help-subtle" title="${Parser.sourceJsonToFull(source).qq()}">${Parser.sourceJsonToAbv(source)}</i>`;
        }
        ).join("; ");

        return `Reprinted as ${ptReprinted}`;
    },

    getSourceAndPageHtml(it, {tag, fnUnpackUid}={}) {
        return this._getSourceAndPageHtmlOrText(it, {
            tag,
            fnUnpackUid
        });
    },
    getSourceAndPageText(it, {tag, fnUnpackUid}={}) {
        return this._getSourceAndPageHtmlOrText(it, {
            isText: true,
            tag,
            fnUnpackUid
        });
    },

    _getSourceAndPageHtmlOrText(it, {isText, tag, fnUnpackUid}={}) {
        const sourceSub = Renderer.utils.getSourceSubText(it);
        const baseText = `${isText ? `` : `<i title="${Parser.sourceJsonToFull(it.source)}${sourceSub}">`}${Parser.sourceJsonToAbv(it.source)}${sourceSub}${isText ? "" : `</i>`}${Renderer.utils.isDisplayPage(it.page) ? `, page ${it.page}` : ""}`;
        const reprintedAsText = Renderer.utils._getReprintedAsHtmlOrText(it, {
            isText,
            tag,
            fnUnpackUid
        });
        const addSourceText = Renderer.utils._getAltSourceHtmlOrText(it, "additionalSources", "Additional information from", isText);
        const otherSourceText = Renderer.utils._getAltSourceHtmlOrText(it, "otherSources", "Also found in", isText);
        const externalSourceText = Renderer.utils._getAltSourceHtmlOrText(it, "externalSources", "External sources:", isText);

        const srdText = it.srd ? `${isText ? "" : `the <span title="Systems Reference Document">`}SRD${isText ? "" : `</span>`}${typeof it.srd === "string" ? ` (as &quot;${it.srd}&quot;)` : ""}` : "";
        const basicRulesText = it.basicRules ? `the Basic Rules${typeof it.basicRules === "string" ? ` (as &quot;${it.basicRules}&quot;)` : ""}` : "";
        const srdAndBasicRulesText = (srdText || basicRulesText) ? `Available in ${[srdText, basicRulesText].filter(it=>it).join(" and ")}` : "";

        return `${[baseText, addSourceText, reprintedAsText, otherSourceText, srdAndBasicRulesText, externalSourceText].filter(it=>it).join(". ")}${baseText && (addSourceText || otherSourceText || srdAndBasicRulesText || externalSourceText) ? "." : ""}`;
    },

    async _pHandleNameClick(ele) {
        await MiscUtil.pCopyTextToClipboard($(ele).text());
        JqueryUtil.showCopiedEffect($(ele));
    },

    getPageTr(it, {tag, fnUnpackUid}={}) {
        return `<tr><td colspan=6>${Renderer.utils.getSourceAndPageTrHtml(it, {
            tag,
            fnUnpackUid
        })}</td></tr>`;
    },

    getAbilityRollerEntry(statblock, ability) {
        if (statblock[ability] == null)
            return "\u2014";
        return `{@ability ${ability} ${statblock[ability]}}`;
    },

    getAbilityRoller(statblock, ability) {
        return Renderer.get().render(Renderer.utils.getAbilityRollerEntry(statblock, ability));
    },

    getEmbeddedDataHeader(name, style, {isCollapsed=false}={}) {
        return `<table class="rd__b-special rd__b-data ${style ? `rd__b-data--${style}` : ""}">
		<thead><tr><th class="rd__data-embed-header" colspan="6" data-rd-data-embed-header="true"><span class="rd__data-embed-name ${isCollapsed ? "" : `ve-hidden`}">${name}</span><span class="rd__data-embed-toggle">[${isCollapsed ? "+" : "\u2013"}]</span></th></tr></thead><tbody class="${isCollapsed ? `ve-hidden` : ""}" data-rd-embedded-data-render-target="true">`;
    },

    getEmbeddedDataFooter() {
        return `</tbody></table>`;
    },

    TabButton: function({label, fnChange, fnPopulate, isVisible}) {
        this.label = label;
        this.fnChange = fnChange;
        this.fnPopulate = fnPopulate;
        this.isVisible = isVisible;
    },

    _tabs: {},
    _curTab: null,
    _tabsPreferredLabel: null,
    bindTabButtons({tabButtons, tabLabelReference, $wrpTabs, $pgContent}) {
        Renderer.utils._tabs = {};
        Renderer.utils._curTab = null;

        $wrpTabs.find(`.stat-tab-gen`).remove();

        tabButtons.forEach((tb,i)=>{
            tb.ix = i;

            tb.$t = $(`<button class="ui-tab__btn-tab-head btn btn-default stat-tab-gen">${tb.label}</button>`).click(()=>tb.fnActivateTab({
                isUserInput: true
            }));

            tb.fnActivateTab = ({isUserInput=false}={})=>{
                const curTab = Renderer.utils._curTab;
                const tabs = Renderer.utils._tabs;

                if (!curTab || curTab.label !== tb.label) {
                    if (curTab)
                        curTab.$t.removeClass(`ui-tab__btn-tab-head--active`);
                    Renderer.utils._curTab = tb;
                    tb.$t.addClass(`ui-tab__btn-tab-head--active`);
                    if (curTab)
                        tabs[curTab.label].$content = $pgContent.children().detach();

                    tabs[tb.label] = tb;
                    if (!tabs[tb.label].$content && tb.fnPopulate)
                        tb.fnPopulate();
                    else
                        $pgContent.append(tabs[tb.label].$content);
                    if (tb.fnChange)
                        tb.fnChange();
                }

                if (isUserInput)
                    Renderer.utils._tabsPreferredLabel = tb.label;
            }
            ;
        }
        );

        if (tabButtons.length !== 1)
            tabButtons.slice().reverse().forEach(tb=>$wrpTabs.prepend(tb.$t));

        if (!Renderer.utils._tabsPreferredLabel)
            return tabButtons[0].fnActivateTab();

        const tabButton = tabButtons.find(tb=>tb.label === Renderer.utils._tabsPreferredLabel);
        if (tabButton)
            return tabButton.fnActivateTab();

        const ixDesired = tabLabelReference.indexOf(Renderer.utils._tabsPreferredLabel);
        if (!~ixDesired)
            return tabButtons[0].fnActivateTab();
        const ixsAvailableMetas = tabButtons.map(tb=>{
            const ixMapped = tabLabelReference.indexOf(tb.label);
            if (!~ixMapped)
                return null;
            return {
                ixMapped,
                label: tb.label,
            };
        }
        ).filter(Boolean);
        if (!ixsAvailableMetas.length)
            return tabButtons[0].fnActivateTab();
        const ixMetaHigher = ixsAvailableMetas.find(({ixMapped})=>ixMapped > ixDesired);
        if (ixMetaHigher != null)
            return (tabButtons.find(it=>it.label === ixMetaHigher.label) || tabButtons[0]).fnActivateTab();

        const ixMetaMax = ixsAvailableMetas.last();
        (tabButtons.find(it=>it.label === ixMetaMax.label) || tabButtons[0]).fnActivateTab();
    },

    _pronounceButtonsBound: false,
    bindPronounceButtons() {
        if (Renderer.utils._pronounceButtonsBound)
            return;
        Renderer.utils._pronounceButtonsBound = true;
        $(`body`).on("click", ".btn-name-pronounce", function() {
            const audio = $(this).find(`.name-pronounce`)[0];
            audio.currentTime = 0;
            audio.play();
        });
    },

    async pHasFluffText(entity, prop) {
        return entity.hasFluff || ((await Renderer.utils.pGetPredefinedFluff(entity, prop))?.entries?.length || 0) > 0;
    },

    async pHasFluffImages(entity, prop) {
        return entity.hasFluffImages || (((await Renderer.utils.pGetPredefinedFluff(entity, prop))?.images?.length || 0) > 0);
    },

    async pGetPredefinedFluff(entry, prop) {
        if (!entry.fluff)
            return null;

        const mappedProp = `_${prop}`;
        const mappedPropAppend = `_append${prop.uppercaseFirst()}`;
        const fluff = {};

        const assignPropsIfExist = (fromObj,...props)=>{
            props.forEach(prop=>{
                if (fromObj[prop])
                    fluff[prop] = fromObj[prop];
            }
            );
        }
        ;

        assignPropsIfExist(entry.fluff, "name", "type", "entries", "images");

        if (entry.fluff[mappedProp]) {
            const fromList = [...((await PrereleaseUtil.pGetBrewProcessed())[prop] || []), ...((await BrewUtil2.pGetBrewProcessed())[prop] || []), ].find(it=>it.name === entry.fluff[mappedProp].name && it.source === entry.fluff[mappedProp].source, );
            if (fromList) {
                assignPropsIfExist(fromList, "name", "type", "entries", "images");
            }
        }

        if (entry.fluff[mappedPropAppend]) {
            const fromList = [...((await PrereleaseUtil.pGetBrewProcessed())[prop] || []), ...((await BrewUtil2.pGetBrewProcessed())[prop] || []), ].find(it=>it.name === entry.fluff[mappedPropAppend].name && it.source === entry.fluff[mappedPropAppend].source, );
            if (fromList) {
                if (fromList.entries) {
                    fluff.entries = MiscUtil.copyFast(fluff.entries || []);
                    fluff.entries.push(...MiscUtil.copyFast(fromList.entries));
                }
                if (fromList.images) {
                    fluff.images = MiscUtil.copyFast(fluff.images || []);
                    fluff.images.push(...MiscUtil.copyFast(fromList.images));
                }
            }
        }

        return fluff;
    },

    async pGetFluff({entity, pFnPostProcess, fnGetFluffData, fluffUrl, fluffBaseUrl, fluffProp}={}) {
        let predefinedFluff = await Renderer.utils.pGetPredefinedFluff(entity, fluffProp);
        if (predefinedFluff) {
            if (pFnPostProcess)
                predefinedFluff = await pFnPostProcess(predefinedFluff);
            return predefinedFluff;
        }
        if (!fnGetFluffData && !fluffBaseUrl && !fluffUrl)
            return null;

        const fluffIndex = fluffBaseUrl ? await DataUtil.loadJSON(`${Renderer.get().baseUrl}${fluffBaseUrl}fluff-index.json`) : null;
        if (fluffIndex && !fluffIndex[entity.source])
            return null;

        const data = fnGetFluffData ? await fnGetFluffData() : fluffIndex && fluffIndex[entity.source] ? await DataUtil.loadJSON(`${Renderer.get().baseUrl}${fluffBaseUrl}${fluffIndex[entity.source]}`) : await DataUtil.loadJSON(`${Renderer.get().baseUrl}${fluffUrl}`);
        if (!data)
            return null;

        let fluff = (data[fluffProp] || []).find(it=>it.name === entity.name && it.source === entity.source);
        if (!fluff && entity._versionBase_name && entity._versionBase_source)
            fluff = (data[fluffProp] || []).find(it=>it.name === entity._versionBase_name && it.source === entity._versionBase_source);
        if (!fluff)
            return null;

        if (pFnPostProcess)
            fluff = await pFnPostProcess(fluff);
        return fluff;
    },

    _TITLE_SKIP_TYPES: new Set(["entries", "section"]),
    async pBuildFluffTab({isImageTab, $content, entity, $headerControls, pFnGetFluff}={}) {
        $content.append(Renderer.utils.getBorderTr());
        $content.append(Renderer.utils.getNameTr(entity, {
            controlRhs: $headerControls,
            asJquery: true
        }));
        const $td = $(`<td colspan="6" class="text"></td>`);
        $$`<tr class="text">${$td}</tr>`.appendTo($content);
        $content.append(Renderer.utils.getBorderTr());

        const fluff = MiscUtil.copyFast((await pFnGetFluff(entity)) || {});
        fluff.entries = fluff.entries || [Renderer.utils.HTML_NO_INFO];
        fluff.images = fluff.images || [Renderer.utils.HTML_NO_IMAGES];

        $td.fastSetHtml(Renderer.utils.getFluffTabContent({
            entity,
            fluff,
            isImageTab
        }));
    },

    getFluffTabContent({entity, fluff, isImageTab=false}) {
        Renderer.get().setFirstSection(true);
        return (fluff[isImageTab ? "images" : "entries"] || []).map((ent,i)=>{
            if (isImageTab)
                return Renderer.get().render(ent);

            if (i === 0 && ent.name && entity.name && (Renderer.utils._TITLE_SKIP_TYPES).has(ent.type)) {
                const entryLowName = ent.name.toLowerCase().trim();
                const entityLowName = entity.name.toLowerCase().trim();

                if (entryLowName.includes(entityLowName) || entityLowName.includes(entryLowName)) {
                    const cpy = MiscUtil.copyFast(ent);
                    delete cpy.name;
                    return Renderer.get().render(cpy);
                } else
                    return Renderer.get().render(ent);
            } else {
                if (typeof ent === "string")
                    return `<p>${Renderer.get().render(ent)}</p>`;
                else
                    return Renderer.get().render(ent);
            }
        }
        ).join("");
    },

    HTML_NO_INFO: "<i>No information available.</i>",
    HTML_NO_IMAGES: "<i>No images available.</i>",

    prerequisite: class {
        static _WEIGHTS = ["level", "pact", "patron", "spell", "race", "alignment", "ability", "proficiency", "spellcasting", "spellcasting2020", "spellcastingFeature", "spellcastingPrepared", "psionics", "feature", "feat", "background", "item", "itemType", "itemProperty", "campaign", "group", "other", "otherSummary", undefined, ].mergeMap((k,i)=>({
            [k]: i
        }));

        static _getShortClassName(className) {
            const ixFirstVowel = /[aeiou]/.exec(className).index;
            const start = className.slice(0, ixFirstVowel + 1);
            let end = className.slice(ixFirstVowel + 1);
            end = end.replace(/[aeiou]/g, "");
            return `${start}${end}`.toTitleCase();
        }

        static getHtml(prerequisites, {isListMode=false, blocklistKeys=new Set(), isTextOnly=false, isSkipPrefix=false}={}) {
            if (!prerequisites?.length)
                return isListMode ? "\u2014" : "";

            const prereqsShared = prerequisites.length === 1 ? {} : Object.entries(prerequisites.slice(1).reduce((a,b)=>CollectionUtil.objectIntersect(a, b), prerequisites[0]), ).filter(([k,v])=>prerequisites.every(pre=>CollectionUtil.deepEquals(pre[k], v))).mergeMap(([k,v])=>({
                [k]: v
            }));

            const shared = Object.keys(prereqsShared).length ? this.getHtml([prereqsShared], {
                isListMode,
                blocklistKeys,
                isTextOnly,
                isSkipPrefix: true
            }) : null;

            let cntPrerequisites = 0;
            let hasNote = false;
            const listOfChoices = prerequisites.map(pr=>{
                const ptNote = !isListMode && pr.note ? Renderer.get().render(pr.note) : null;
                if (ptNote) {
                    hasNote = true;
                }

                const prereqsToJoin = Object.entries(pr).filter(([k])=>!prereqsShared[k]).sort(([kA],[kB])=>this._WEIGHTS[kA] - this._WEIGHTS[kB]).map(([k,v])=>{
                    if (k === "note" || blocklistKeys.has(k))
                        return false;

                    cntPrerequisites += 1;

                    switch (k) {
                    case "level":
                        return this._getHtml_level({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "pact":
                        return this._getHtml_pact({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "patron":
                        return this._getHtml_patron({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "spell":
                        return this._getHtml_spell({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "feat":
                        return this._getHtml_feat({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "feature":
                        return this._getHtml_feature({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "item":
                        return this._getHtml_item({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "itemType":
                        return this._getHtml_itemType({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "itemProperty":
                        return this._getHtml_itemProperty({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "otherSummary":
                        return this._getHtml_otherSummary({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "other":
                        return this._getHtml_other({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "race":
                        return this._getHtml_race({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "background":
                        return this._getHtml_background({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "ability":
                        return this._getHtml_ability({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "proficiency":
                        return this._getHtml_proficiency({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "spellcasting":
                        return this._getHtml_spellcasting({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "spellcasting2020":
                        return this._getHtml_spellcasting2020({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "spellcastingFeature":
                        return this._getHtml_spellcastingFeature({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "spellcastingPrepared":
                        return this._getHtml_spellcastingPrepared({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "psionics":
                        return this._getHtml_psionics({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "alignment":
                        return this._getHtml_alignment({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "campaign":
                        return this._getHtml_campaign({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    case "group":
                        return this._getHtml_group({
                            v,
                            isListMode,
                            isTextOnly
                        });
                    default:
                        throw new Error(`Unhandled key: ${k}`);
                    }
                }
                ).filter(Boolean);

                const ptPrereqs = prereqsToJoin.join(prereqsToJoin.some(it=>/ or /.test(it)) ? "; " : ", ");

                return [ptPrereqs, ptNote].filter(Boolean).join(". ");
            }
            ).filter(Boolean);

            if (!listOfChoices.length && !shared)
                return isListMode ? "\u2014" : "";
            if (isListMode)
                return [shared, listOfChoices.join("/")].filter(Boolean).join(" + ");

            const sharedSuffix = MiscUtil.findCommonSuffix(listOfChoices, {
                isRespectWordBoundaries: true
            });
            const listOfChoicesTrimmed = sharedSuffix ? listOfChoices.map(it=>it.slice(0, -sharedSuffix.length)) : listOfChoices;

            const joinedChoices = (hasNote ? listOfChoicesTrimmed.join(" Or, ") : listOfChoicesTrimmed.joinConjunct(listOfChoicesTrimmed.some(it=>/ or /.test(it)) ? "; " : ", ", " or ")) + sharedSuffix;
            return `${isSkipPrefix ? "" : `Prerequisite${cntPrerequisites === 1 ? "" : "s"}: `}${[shared, joinedChoices].filter(Boolean).join(", plus ")}`;
        }

        static _getHtml_level({v, isListMode}) {
            if (typeof v === "number") {
                if (isListMode)
                    return `Lvl ${v}`;
                else
                    return `${Parser.getOrdinalForm(v)} level`;
            } else if (!v.class && !v.subclass) {
                if (isListMode)
                    return `Lvl ${v.level}`;
                else
                    return `${Parser.getOrdinalForm(v.level)} level`;
            }

            const isLevelVisible = v.level !== 1;
            const isSubclassVisible = v.subclass && v.subclass.visible;
            const isClassVisible = v.class && (v.class.visible || isSubclassVisible);
            if (isListMode) {
                const shortNameRaw = isClassVisible ? this._getShortClassName(v.class.name) : null;
                return `${isClassVisible ? `${shortNameRaw.slice(0, 4)}${isSubclassVisible ? "*" : "."}` : ""}${isLevelVisible ? ` Lvl ${v.level}` : ""}`;
            } else {
                let classPart = "";
                if (isClassVisible && isSubclassVisible)
                    classPart = ` ${v.class.name} (${v.subclass.name})`;
                else if (isClassVisible)
                    classPart = ` ${v.class.name}`;
                else if (isSubclassVisible)
                    classPart = ` &lt;remember to insert class name here&gt; (${v.subclass.name})`;
                return `${isLevelVisible ? `${Parser.getOrdinalForm(v.level)} level` : ""}${isClassVisible ? ` ${classPart}` : ""}`;
            }
        }

        static _getHtml_pact({v, isListMode}) {
            return Parser.prereqPactToFull(v);
        }

        static _getHtml_patron({v, isListMode}) {
            return isListMode ? `${Parser.prereqPatronToShort(v)} patron` : `${v} patron`;
        }

        static _getHtml_spell({v, isListMode, isTextOnly}) {
            return isListMode ? v.map(sp=>{
                if (typeof sp === "string")
                    return sp.split("#")[0].split("|")[0].toTitleCase();
                return sp.entrySummary || sp.entry;
            }
            ).join("/") : v.map(sp=>{
                if (typeof sp === "string")
                    return Parser.prereqSpellToFull(sp, {
                        isTextOnly
                    });
                return isTextOnly ? Renderer.stripTags(sp.entry) : Renderer.get().render(`{@filter ${sp.entry}|spells|${sp.choose}}`);
            }
            ).joinConjunct(", ", " or ");
        }

        static _getHtml_feat({v, isListMode, isTextOnly}) {
            return isListMode ? v.map(x=>x.split("|")[0].toTitleCase()).join("/") : v.map(it=>(isTextOnly ? Renderer.stripTags.bind(Renderer) : Renderer.get().render.bind(Renderer.get()))(`{@feat ${it}} feat`)).joinConjunct(", ", " or ");
        }

        static _getHtml_feature({v, isListMode, isTextOnly}) {
            return isListMode ? v.map(x=>Renderer.stripTags(x).toTitleCase()).join("/") : v.map(it=>isTextOnly ? Renderer.stripTags(it) : Renderer.get().render(it)).joinConjunct(", ", " or ");
        }

        static _getHtml_item({v, isListMode}) {
            return isListMode ? v.map(x=>x.toTitleCase()).join("/") : v.joinConjunct(", ", " or ");
        }

        static _getHtml_itemType({v, isListMode}) {
            return isListMode ? v.map(it=>Renderer.item.getType(it)).map(it=>it?.abbreviation).join("+") : v.map(it=>Renderer.item.getType(it)).map(it=>it?.name?.toTitleCase()).joinConjunct(", ", " and ");
        }

        static _getHtml_itemProperty({v, isListMode}) {
            if (v == null)
                return isListMode ? "No Prop." : "No Other Properties";

            return isListMode ? v.map(it=>Renderer.item.getProperty(it)).map(it=>it?.abbreviation).join("+") : (`${v.map(it=>Renderer.item.getProperty(it)).map(it=>it?.name?.toTitleCase()).joinConjunct(", ", " and ")} Property`);
        }

        static _getHtml_otherSummary({v, isListMode, isTextOnly}) {
            return isListMode ? (v.entrySummary || Renderer.stripTags(v.entry)) : (isTextOnly ? Renderer.stripTags(v.entry) : Renderer.get().render(v.entry));
        }

        static _getHtml_other({v, isListMode, isTextOnly}) {
            return isListMode ? "Special" : (isTextOnly ? Renderer.stripTags(v) : Renderer.get().render(v));
        }

        static _getHtml_race({v, isListMode, isTextOnly}) {
            const parts = v.map((it,i)=>{
                if (isListMode) {
                    return `${it.name.toTitleCase()}${it.subrace != null ? ` (${it.subrace})` : ""}`;
                } else {
                    const raceName = it.displayEntry ? (isTextOnly ? Renderer.stripTags(it.displayEntry) : Renderer.get().render(it.displayEntry)) : i === 0 ? it.name.toTitleCase() : it.name;
                    return `${raceName}${it.subrace != null ? ` (${it.subrace})` : ""}`;
                }
            }
            );
            return isListMode ? parts.join("/") : parts.joinConjunct(", ", " or ");
        }

        static _getHtml_background({v, isListMode, isTextOnly}) {
            const parts = v.map((it,i)=>{
                if (isListMode) {
                    return `${it.name.toTitleCase()}`;
                } else {
                    return it.displayEntry ? (isTextOnly ? Renderer.stripTags(it.displayEntry) : Renderer.get().render(it.displayEntry)) : i === 0 ? it.name.toTitleCase() : it.name;
                }
            }
            );
            return isListMode ? parts.join("/") : parts.joinConjunct(", ", " or ");
        }

        static _getHtml_ability({v, isListMode, isTextOnly}) {

            let hadMultipleInner = false;
            let hadMultiMultipleInner = false;
            let allValuesEqual = null;

            outer: for (const abMeta of v) {
                for (const req of Object.values(abMeta)) {
                    if (allValuesEqual == null)
                        allValuesEqual = req;
                    else {
                        if (req !== allValuesEqual) {
                            allValuesEqual = null;
                            break outer;
                        }
                    }
                }
            }

            const abilityOptions = v.map(abMeta=>{
                if (allValuesEqual) {
                    const abList = Object.keys(abMeta);
                    hadMultipleInner = hadMultipleInner || abList.length > 1;
                    return isListMode ? abList.map(ab=>ab.uppercaseFirst()).join(", ") : abList.map(ab=>Parser.attAbvToFull(ab)).joinConjunct(", ", " and ");
                } else {
                    const groups = {};

                    Object.entries(abMeta).forEach(([ab,req])=>{
                        (groups[req] = groups[req] || []).push(ab);
                    }
                    );

                    let isMulti = false;
                    const byScore = Object.entries(groups).sort(([reqA],[reqB])=>SortUtil.ascSort(Number(reqB), Number(reqA))).map(([req,abs])=>{
                        hadMultipleInner = hadMultipleInner || abs.length > 1;
                        if (abs.length > 1)
                            hadMultiMultipleInner = isMulti = true;

                        abs = abs.sort(SortUtil.ascSortAtts);
                        return isListMode ? `${abs.map(ab=>ab.uppercaseFirst()).join(", ")} ${req}+` : `${abs.map(ab=>Parser.attAbvToFull(ab)).joinConjunct(", ", " and ")} ${req} or higher`;
                    }
                    );

                    return isListMode ? `${isMulti || byScore.length > 1 ? "(" : ""}${byScore.join(" & ")}${isMulti || byScore.length > 1 ? ")" : ""}` : isMulti ? byScore.joinConjunct("; ", " and ") : byScore.joinConjunct(", ", " and ");
                }
            }
            );

            if (isListMode) {
                return `${abilityOptions.join("/")}${allValuesEqual != null ? ` ${allValuesEqual}+` : ""}`;
            } else {
                const isComplex = hadMultiMultipleInner || hadMultipleInner || allValuesEqual == null;
                const joined = abilityOptions.joinConjunct(hadMultiMultipleInner ? " - " : hadMultipleInner ? "; " : ", ", isComplex ? (isTextOnly ? ` /or/ ` : ` <i>or</i> `) : " or ", );
                return `${joined}${allValuesEqual != null ? ` ${allValuesEqual} or higher` : ""}`;
            }
        }

        static _getHtml_proficiency({v, isListMode}) {
            const parts = v.map(obj=>{
                return Object.entries(obj).map(([profType,prof])=>{
                    switch (profType) {
                    case "armor":
                        {
                            return isListMode ? `Prof ${Parser.armorFullToAbv(prof)} armor` : `Proficiency with ${prof} armor`;
                        }
                    case "weapon":
                        {
                            return isListMode ? `Prof ${Parser.weaponFullToAbv(prof)} weapon` : `Proficiency with a ${prof} weapon`;
                        }
                    case "weaponGroup":
                        {
                            return isListMode ? `Prof ${Parser.weaponFullToAbv(prof)} weapons` : `${prof.toTitleCase()} Proficiency`;
                        }
                    default:
                        throw new Error(`Unhandled proficiency type: "${profType}"`);
                    }
                }
                );
            }
            );
            return isListMode ? parts.join("/") : parts.joinConjunct(", ", " or ");
        }

        static _getHtml_spellcasting({v, isListMode}) {
            return isListMode ? "Spellcasting" : "The ability to cast at least one spell";
        }

        static _getHtml_spellcasting2020({v, isListMode}) {
            return isListMode ? "Spellcasting" : "Spellcasting or Pact Magic feature";
        }

        static _getHtml_spellcastingFeature({v, isListMode}) {
            return isListMode ? "Spellcasting" : "Spellcasting Feature";
        }

        static _getHtml_spellcastingPrepared({v, isListMode}) {
            return isListMode ? "Spellcasting" : "Spellcasting feature from a class that prepares spells";
        }

        static _getHtml_psionics({v, isListMode, isTextOnly}) {
            return isListMode ? "Psionics" : (isTextOnly ? Renderer.stripTags : Renderer.get().render.bind(Renderer.get()))("Psionic Talent feature or Wild Talent feat");
        }

        static _getHtml_alignment({v, isListMode}) {
            return isListMode ? Parser.alignmentListToFull(v).replace(/\bany\b/gi, "").trim().replace(/\balignment\b/gi, "align").trim().toTitleCase() : Parser.alignmentListToFull(v);
        }

        static _getHtml_campaign({v, isListMode}) {
            return isListMode ? v.join("/") : `${v.joinConjunct(", ", " or ")} Campaign`;
        }

        static _getHtml_group({v, isListMode}) {
            return isListMode ? v.map(it=>it.toTitleCase()).join("/") : `${v.map(it=>it.toTitleCase()).joinConjunct(", ", " or ")} Group`;
        }
    }
    ,

    getRepeatableEntry(ent) {
        if (!ent.repeatable)
            return null;
        return `{@b Repeatable:} ${ent.repeatableNote || (ent.repeatable ? "Yes" : "No")}`;
    },

    getRepeatableHtml(ent, {isListMode=false}={}) {
        const entryRepeatable = Renderer.utils.getRepeatableEntry(ent);
        if (entryRepeatable == null)
            return isListMode ? "\u2014" : "";
        return Renderer.get().render(entryRepeatable);
    },

    getRenderedSize(size) {
        return [...(size ? [size].flat() : [])].sort(SortUtil.ascSortSize).map(sz=>Parser.sizeAbvToFull(sz)).joinConjunct(", ", " or ");
    },

    getMediaUrl(entry, prop, mediaDir) {
        if (!entry[prop])
            return "";

        let href = "";
        if (entry[prop].type === "internal") {
            const baseUrl = Renderer.get().baseMediaUrls[mediaDir] || Renderer.get().baseUrl;
            const mediaPart = `${mediaDir}/${entry[prop].path}`;
            href = baseUrl !== "" ? `${baseUrl}${mediaPart}` : UrlUtil.link(mediaPart);
        } else if (entry[prop].type === "external") {
            href = entry[prop].url;
        }
        return href;
    },

    getTagEntry(tag, text) {
        switch (tag) {
        case "@dice":
        case "@autodice":
        case "@damage":
        case "@hit":
        case "@d20":
        case "@chance":
        case "@recharge":
            {
                const fauxEntry = {
                    type: "dice",
                    rollable: true,
                };
                const [rollText,displayText,name,...others] = Renderer.splitTagByPipe(text);
                if (displayText)
                    fauxEntry.displayText = displayText;

                if ((!fauxEntry.displayText && (rollText || "").includes("summonSpellLevel")) || (fauxEntry.displayText && fauxEntry.displayText.includes("summonSpellLevel")))
                    fauxEntry.displayText = (fauxEntry.displayText || rollText || "").replace(/summonSpellLevel/g, "the spell's level");

                if ((!fauxEntry.displayText && (rollText || "").includes("summonClassLevel")) || (fauxEntry.displayText && fauxEntry.displayText.includes("summonClassLevel")))
                    fauxEntry.displayText = (fauxEntry.displayText || rollText || "").replace(/summonClassLevel/g, "your class level");

                if (name)
                    fauxEntry.name = name;

                switch (tag) {
                case "@dice":
                case "@autodice":
                case "@damage":
                    {
                        fauxEntry.toRoll = rollText;

                        if (!fauxEntry.displayText && (rollText || "").includes(";"))
                            fauxEntry.displayText = rollText.replace(/;/g, "/");
                        if ((!fauxEntry.displayText && (rollText || "").includes("#$")) || (fauxEntry.displayText && fauxEntry.displayText.includes("#$")))
                            fauxEntry.displayText = (fauxEntry.displayText || rollText).replace(/#\$prompt_number[^$]*\$#/g, "(n)");
                        fauxEntry.displayText = fauxEntry.displayText || fauxEntry.toRoll;

                        if (tag === "@damage")
                            fauxEntry.subType = "damage";
                        if (tag === "@autodice")
                            fauxEntry.autoRoll = true;

                        return fauxEntry;
                    }
                case "@d20":
                case "@hit":
                    {
                        let mod;
                        if (!isNaN(rollText)) {
                            const n = Number(rollText);
                            mod = `${n >= 0 ? "+" : ""}${n}`;
                        } else
                            mod = /^\s+[-+]/.test(rollText) ? rollText : `+${rollText}`;
                        fauxEntry.displayText = fauxEntry.displayText || mod;
                        fauxEntry.toRoll = `1d20${mod}`;
                        fauxEntry.subType = "d20";
                        fauxEntry.d20mod = mod;
                        if (tag === "@hit")
                            fauxEntry.context = {
                                type: "hit"
                            };
                        return fauxEntry;
                    }
                case "@chance":
                    {
                        const [textSuccess,textFailure] = others;
                        fauxEntry.toRoll = `1d100`;
                        fauxEntry.successThresh = Number(rollText);
                        fauxEntry.chanceSuccessText = textSuccess;
                        fauxEntry.chanceFailureText = textFailure;
                        return fauxEntry;
                    }
                case "@recharge":
                    {
                        const flags = displayText ? displayText.split("") : null;
                        fauxEntry.toRoll = "1d6";
                        const asNum = Number(rollText || 6);
                        fauxEntry.successThresh = 7 - asNum;
                        fauxEntry.successMax = 6;
                        fauxEntry.displayText = `${asNum}${asNum < 6 ? `\u20136` : ""}`;
                        fauxEntry.chanceSuccessText = "Recharged!";
                        fauxEntry.chanceFailureText = "Did not recharge";
                        fauxEntry.isColorSuccessFail = true;
                        return fauxEntry;
                    }
                }

                return fauxEntry;
            }

        case "@ability":
        case "@savingThrow":
            {
                const fauxEntry = {
                    type: "dice",
                    rollable: true,
                    subType: "d20",
                    context: {
                        type: tag === "@ability" ? "abilityCheck" : "savingThrow"
                    },
                };

                const [abilAndScoreOrScore,displayText,name,...others] = Renderer.splitTagByPipe(text);

                let[abil,...rawScoreOrModParts] = abilAndScoreOrScore.split(" ").map(it=>it.trim()).filter(Boolean);
                abil = abil.toLowerCase();

                fauxEntry.context.ability = abil;

                if (name)
                    fauxEntry.name = name;
                else {
                    if (tag === "@ability")
                        fauxEntry.name = Parser.attAbvToFull(abil);
                    else if (tag === "@savingThrow")
                        fauxEntry.name = `${Parser.attAbvToFull(abil)} save`;
                }

                const rawScoreOrMod = rawScoreOrModParts.join(" ");
                if (isNaN(rawScoreOrMod) && tag === "@savingThrow") {
                    if (displayText)
                        fauxEntry.displayText = displayText;
                    else
                        fauxEntry.displayText = rawScoreOrMod;

                    fauxEntry.toRoll = `1d20${rawScoreOrMod}`;
                    fauxEntry.d20mod = rawScoreOrMod;
                } else {
                    const scoreOrMod = Number(rawScoreOrMod) || 0;
                    const mod = (tag === "@ability" ? Parser.getAbilityModifier : UiUtil.intToBonus)(scoreOrMod);

                    if (displayText)
                        fauxEntry.displayText = displayText;
                    else {
                        if (tag === "@ability")
                            fauxEntry.displayText = `${scoreOrMod} (${mod})`;
                        else
                            fauxEntry.displayText = mod;
                    }

                    fauxEntry.toRoll = `1d20${mod}`;
                    fauxEntry.d20mod = mod;
                }

                return fauxEntry;
            }

        case "@skillCheck":
            {
                const fauxEntry = {
                    type: "dice",
                    rollable: true,
                    subType: "d20",
                    context: {
                        type: "skillCheck"
                    },
                };

                const [skillAndMod,displayText,name,...others] = Renderer.splitTagByPipe(text);

                const parts = skillAndMod.split(" ").map(it=>it.trim()).filter(Boolean);
                const namePart = parts.shift();
                const bonusPart = parts.join(" ");
                const skill = namePart.replace(/_/g, " ");

                let mod = bonusPart;
                if (!isNaN(bonusPart))
                    mod = UiUtil.intToBonus(Number(bonusPart) || 0);
                else if (bonusPart.startsWith("#$"))
                    mod = `+${bonusPart}`;

                fauxEntry.context.skill = skill;
                fauxEntry.displayText = displayText || mod;

                if (name)
                    fauxEntry.name = name;
                else
                    fauxEntry.name = skill.toTitleCase();

                fauxEntry.toRoll = `1d20${mod}`;
                fauxEntry.d20mod = mod;

                return fauxEntry;
            }

        case "@coinflip":
            {
                const [displayText,name,textSuccess,textFailure] = Renderer.splitTagByPipe(text);

                const fauxEntry = {
                    type: "dice",
                    toRoll: "1d2",
                    successThresh: 1,
                    successMax: 2,
                    displayText: displayText || "flip a coin",
                    chanceSuccessText: textSuccess || `Heads`,
                    chanceFailureText: textFailure || `Tails`,
                    isColorSuccessFail: !textSuccess && !textFailure,
                    rollable: true,
                };

                return fauxEntry;
            }

        default:
            throw new Error(`Unhandled tag "${tag}"`);
        }
    },

    getTagMeta(tag, text) {
        switch (tag) {
        case "@deity":
            {
                let[name,pantheon,source,displayText,...others] = Renderer.splitTagByPipe(text);
                pantheon = pantheon || "forgotten realms";
                source = source || Parser.getTagSource(tag, source);
                const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_DEITIES]({
                    name,
                    pantheon,
                    source
                });

                return {
                    name,
                    displayText,
                    others,

                    page: UrlUtil.PG_DEITIES,
                    source,
                    hash,

                    hashPreEncoded: true,
                };
            }

        case "@card":
            {
                const unpacked = DataUtil.deck.unpackUidCard(text);
                const {name, set, source, displayText} = unpacked;
                const hash = UrlUtil.URL_TO_HASH_BUILDER["card"]({
                    name,
                    set,
                    source
                });

                return {
                    name,
                    displayText,

                    isFauxPage: true,
                    page: "card",
                    source,
                    hash,
                    hashPreEncoded: true,
                };
            }

        case "@classFeature":
            {
                const unpacked = DataUtil.class.unpackUidClassFeature(text);

                const classPageHash = `${UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_CLASSES]({
                    name: unpacked.className,
                    source: unpacked.classSource
                })}${HASH_PART_SEP}${UrlUtil.getClassesPageStatePart({
                    feature: {
                        ixLevel: unpacked.level - 1,
                        ixFeature: 0
                    }
                })}`;

                return {
                    name: unpacked.name,
                    displayText: unpacked.displayText,

                    page: UrlUtil.PG_CLASSES,
                    source: unpacked.source,
                    hash: classPageHash,
                    hashPreEncoded: true,

                    pageHover: "classfeature",
                    hashHover: UrlUtil.URL_TO_HASH_BUILDER["classFeature"](unpacked),
                    hashPreEncodedHover: true,
                };
            }

        case "@subclassFeature":
            {
                const unpacked = DataUtil.class.unpackUidSubclassFeature(text);

                const classPageHash = `${UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_CLASSES]({
                    name: unpacked.className,
                    source: unpacked.classSource
                })}${HASH_PART_SEP}${UrlUtil.getClassesPageStatePart({
                    feature: {
                        ixLevel: unpacked.level - 1,
                        ixFeature: 0
                    }
                })}`;

                return {
                    name: unpacked.name,
                    displayText: unpacked.displayText,

                    page: UrlUtil.PG_CLASSES,
                    source: unpacked.source,
                    hash: classPageHash,
                    hashPreEncoded: true,

                    pageHover: "subclassfeature",
                    hashHover: UrlUtil.URL_TO_HASH_BUILDER["subclassFeature"](unpacked),
                    hashPreEncodedHover: true,
                };
            }

        case "@quickref":
            {
                const unpacked = DataUtil.quickreference.unpackUid(text);

                const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_QUICKREF](unpacked);

                return {
                    name: unpacked.name,
                    displayText: unpacked.displayText,

                    page: UrlUtil.PG_QUICKREF,
                    source: unpacked.source,
                    hash,
                    hashPreEncoded: true,
                };
            }

        default:
            return Renderer.utils._getTagMeta_generic(tag, text);
        }
    },

    _getTagMeta_generic(tag, text) {
        const {name, source, displayText, others} = DataUtil.generic.unpackUid(text, tag);
        const hash = UrlUtil.encodeForHash([name, source]);

        const out = {
            name,
            displayText,
            others,

            page: null,
            source,
            hash,

            preloadId: null,
            subhashes: null,
            linkText: null,

            hashPreEncoded: true,
        };

        switch (tag) {
        case "@spell":
            out.page = UrlUtil.PG_SPELLS;
            break;
        case "@item":
            out.page = UrlUtil.PG_ITEMS;
            break;
        case "@condition":
        case "@disease":
        case "@status":
            out.page = UrlUtil.PG_CONDITIONS_DISEASES;
            break;
        case "@background":
            out.page = UrlUtil.PG_BACKGROUNDS;
            break;
        case "@race":
            out.page = UrlUtil.PG_RACES;
            break;
        case "@optfeature":
            out.page = UrlUtil.PG_OPT_FEATURES;
            break;
        case "@reward":
            out.page = UrlUtil.PG_REWARDS;
            break;
        case "@feat":
            out.page = UrlUtil.PG_FEATS;
            break;
        case "@psionic":
            out.page = UrlUtil.PG_PSIONICS;
            break;
        case "@object":
            out.page = UrlUtil.PG_OBJECTS;
            break;
        case "@boon":
        case "@cult":
            out.page = UrlUtil.PG_CULTS_BOONS;
            break;
        case "@trap":
        case "@hazard":
            out.page = UrlUtil.PG_TRAPS_HAZARDS;
            break;
        case "@variantrule":
            out.page = UrlUtil.PG_VARIANTRULES;
            break;
        case "@table":
            out.page = UrlUtil.PG_TABLES;
            break;
        case "@vehicle":
        case "@vehupgrade":
            out.page = UrlUtil.PG_VEHICLES;
            break;
        case "@action":
            out.page = UrlUtil.PG_ACTIONS;
            break;
        case "@language":
            out.page = UrlUtil.PG_LANGUAGES;
            break;
        case "@charoption":
            out.page = UrlUtil.PG_CHAR_CREATION_OPTIONS;
            break;
        case "@recipe":
            out.page = UrlUtil.PG_RECIPES;
            break;
        case "@deck":
            out.page = UrlUtil.PG_DECKS;
            break;

        case "@legroup":
            {
                out.page = "legendaryGroup";
                out.isFauxPage = true;
                break;
            }

        case "@creature":
            {
                out.page = UrlUtil.PG_BESTIARY;

                if (others.length) {
                    const [type,value] = others[0].split("=").map(it=>it.trim().toLowerCase()).filter(Boolean);
                    if (type && value) {
                        switch (type) {
                        case VeCt.HASH_SCALED:
                            {
                                const targetCrNum = Parser.crToNumber(value);
                                out.preloadId = Renderer.monster.getCustomHashId({
                                    name,
                                    source,
                                    _isScaledCr: true,
                                    _scaledCr: targetCrNum
                                });
                                out.subhashes = [{
                                    key: VeCt.HASH_SCALED,
                                    value: targetCrNum
                                }, ];
                                out.linkText = displayText || `${name} (CR ${value})`;
                                break;
                            }

                        case VeCt.HASH_SCALED_SPELL_SUMMON:
                            {
                                const scaledSpellNum = Number(value);
                                out.preloadId = Renderer.monster.getCustomHashId({
                                    name,
                                    source,
                                    _isScaledSpellSummon: true,
                                    _scaledSpellSummonLevel: scaledSpellNum
                                });
                                out.subhashes = [{
                                    key: VeCt.HASH_SCALED_SPELL_SUMMON,
                                    value: scaledSpellNum
                                }, ];
                                out.linkText = displayText || `${name} (Spell Level ${value})`;
                                break;
                            }

                        case VeCt.HASH_SCALED_CLASS_SUMMON:
                            {
                                const scaledClassNum = Number(value);
                                out.preloadId = Renderer.monster.getCustomHashId({
                                    name,
                                    source,
                                    _isScaledClassSummon: true,
                                    _scaledClassSummonLevel: scaledClassNum
                                });
                                out.subhashes = [{
                                    key: VeCt.HASH_SCALED_CLASS_SUMMON,
                                    value: scaledClassNum
                                }, ];
                                out.linkText = displayText || `${name} (Class Level ${value})`;
                                break;
                            }
                        }
                    }
                }

                break;
            }

        case "@class":
            {
                out.page = UrlUtil.PG_CLASSES;

                if (others.length) {
                    const [subclassShortName,subclassSource,featurePart] = others;

                    if (subclassSource)
                        out.source = subclassSource;

                    const classStateOpts = {
                        subclass: {
                            shortName: subclassShortName.trim(),
                            source: subclassSource ? subclassSource.trim() : Parser.SRC_PHB,
                        },
                    };

                    const hoverSubhashObj = UrlUtil.unpackSubHash(UrlUtil.getClassesPageStatePart(classStateOpts));
                    out.subhashesHover = [{
                        key: "state",
                        value: hoverSubhashObj.state,
                        preEncoded: true
                    }];

                    if (featurePart) {
                        const featureParts = featurePart.trim().split("-");
                        classStateOpts.feature = {
                            ixLevel: featureParts[0] || "0",
                            ixFeature: featureParts[1] || "0",
                        };
                    }

                    const subhashObj = UrlUtil.unpackSubHash(UrlUtil.getClassesPageStatePart(classStateOpts));

                    out.subhashes = [{
                        key: "state",
                        value: subhashObj.state.join(HASH_SUB_LIST_SEP),
                        preEncoded: true
                    }, {
                        key: "fltsource",
                        value: "clear"
                    }, {
                        key: "flstmiscellaneous",
                        value: "clear"
                    }, ];
                }

                break;
            }

        case "@skill":
            {
                out.isFauxPage = true;
                out.page = "skill";
                break;
            }
        case "@sense":
            {
                out.isFauxPage = true;
                out.page = "sense";
                break;
            }
        case "@itemMastery":
            {
                out.isFauxPage = true;
                out.page = "itemMastery";
                break;
            }
        case "@cite":
            {
                out.isFauxPage = true;
                out.page = "citation";
                break;
            }

        default:
            throw new Error(`Unhandled tag "${tag}"`);
        }

        return out;
    },

    applyTemplate(ent, templateString, {fnPreApply, mapCustom}={}) {
        return templateString.replace(/{{([^}]+)}}/g, (fullMatch,strArgs)=>{
            if (fnPreApply)
                fnPreApply(fullMatch, strArgs);

            if (strArgs === "item.dmg1") {
                return Renderer.item._getTaggedDamage(ent.dmg1);
            } else if (strArgs === "item.dmg2") {
                return Renderer.item._getTaggedDamage(ent.dmg2);
            }

            if (mapCustom && mapCustom[strArgs])
                return mapCustom[strArgs];

            const args = strArgs.split(" ").map(arg=>arg.trim()).filter(Boolean);

            if (args.length === 1) {
                return Renderer.utils._applyTemplate_getValue(ent, args[0]);
            } else if (args.length === 2) {
                const val = Renderer.utils._applyTemplate_getValue(ent, args[1]);
                switch (args[0]) {
                case "getFullImmRes":
                    return Parser.getFullImmRes(val);
                default:
                    throw new Error(`Unknown template function "${args[0]}"`);
                }
            } else
                throw new Error(`Unhandled number of arguments ${args.length}`);
        }
        );
    },

    _applyTemplate_getValue(ent, prop) {
        const spl = prop.split(".");
        switch (spl[0]) {
        case "item":
            {
                const path = spl.slice(1);
                if (!path.length)
                    return `{@i missing key path}`;
                return MiscUtil.get(ent, ...path);
            }
        default:
            return `{@i unknown template root: "${spl[0]}"}`;
        }
    },

    getFlatEntries(entry) {
        const out = [];
        const depthStack = [];

        const recurse = ({obj})=>{
            let isPopDepth = false;

            Renderer.ENTRIES_WITH_ENUMERATED_TITLES.forEach(meta=>{
                if (obj.type !== meta.type)
                    return;

                const kName = "name";
                if (obj[kName] == null)
                    return;

                isPopDepth = true;

                const curDepth = depthStack.length ? depthStack.last() : 0;
                const nxtDepth = meta.depth ? meta.depth : meta.depthIncrement ? curDepth + meta.depthIncrement : curDepth;

                depthStack.push(Math.min(nxtDepth, 2, ), );

                const cpyObj = MiscUtil.copyFast(obj);

                out.push({
                    depth: curDepth,
                    entry: cpyObj,
                    key: meta.key,
                    ix: out.length,
                    name: cpyObj.name,
                });

                cpyObj[meta.key] = cpyObj[meta.key].map(child=>{
                    if (!child.type)
                        return child;
                    const childMeta = Renderer.ENTRIES_WITH_ENUMERATED_TITLES_LOOKUP[child.type];
                    if (!childMeta)
                        return child;

                    const kNameChild = "name";
                    if (child[kName] == null)
                        return child;

                    const ixNextRef = out.length;

                    recurse({
                        obj: child
                    });

                    return {
                        IX_FLAT_REF: ixNextRef
                    };
                }
                );
            }
            );

            if (isPopDepth)
                depthStack.pop();
        }
        ;

        recurse({
            obj: entry
        });

        return out;
    },

    getLinkSubhashString(subhashes) {
        let out = "";
        const len = subhashes.length;
        for (let i = 0; i < len; ++i) {
            const subHash = subhashes[i];
            if (subHash.preEncoded)
                out += `${HASH_PART_SEP}${subHash.key}${HASH_SUB_KV_SEP}`;
            else
                out += `${HASH_PART_SEP}${UrlUtil.encodeForHash(subHash.key)}${HASH_SUB_KV_SEP}`;
            if (subHash.value != null) {
                if (subHash.preEncoded)
                    out += subHash.value;
                else
                    out += UrlUtil.encodeForHash(subHash.value);
            } else {
                out += subHash.values.map(v=>UrlUtil.encodeForHash(v)).join(HASH_SUB_LIST_SEP);
            }
        }
        return out;
    },

    initFullEntries_(ent, {propEntries="entries", propFullEntries="_fullEntries"}={}) {
        ent[propFullEntries] = ent[propFullEntries] || (ent[propEntries] ? MiscUtil.copyFast(ent[propEntries]) : []);
    },

    lazy: {
        _getIntersectionConfig() {
            return {
                rootMargin: "150px 0px",
                threshold: 0.01,
            };
        },

        _OBSERVERS: {},
        getCreateObserver({observerId, fnOnObserve}) {
            if (!Renderer.utils.lazy._OBSERVERS[observerId]) {
                const observer = Renderer.utils.lazy._OBSERVERS[observerId] = new IntersectionObserver(Renderer.utils.lazy.getFnOnIntersect({
                    observerId,
                    fnOnObserve,
                }),Renderer.utils.lazy._getIntersectionConfig(),);

                observer._TRACKED = new Set();

                observer.track = it=>{
                    observer._TRACKED.add(it);
                    return observer.observe(it);
                }
                ;

                observer.untrack = it=>{
                    observer._TRACKED.delete(it);
                    return observer.unobserve(it);
                }
                ;

                observer._printListener = evt=>{
                    if (!observer._TRACKED.size)
                        return;

                    [...observer._TRACKED].forEach(it=>{
                        observer.untrack(it);
                        fnOnObserve({
                            observer,
                            entry: {
                                target: it,
                            },
                        });
                    }
                    );

                    alert(`All content must be loaded prior to printing. Please cancel the print and wait a few moments for loading to complete!`);
                }
                ;
                window.addEventListener("beforeprint", observer._printListener);
            }
            return Renderer.utils.lazy._OBSERVERS[observerId];
        },

        destroyObserver({observerId}) {
            const observer = Renderer.utils.lazy._OBSERVERS[observerId];
            if (!observer)
                return;

            observer.disconnect();
            window.removeEventListener("beforeprint", observer._printListener);
        },

        getFnOnIntersect({observerId, fnOnObserve}) {
            return obsEntries=>{
                const observer = Renderer.utils.lazy._OBSERVERS[observerId];

                obsEntries.forEach(entry=>{
                    if (entry.intersectionRatio <= 0)
                        return;

                    observer.untrack(entry.target);
                    fnOnObserve({
                        observer,
                        entry,
                    });
                }
                );
            }
            ;
        },
    },
};

Renderer.tag = class {
    static _TagBase = class {
        tagName;
        defaultSource = null;
        page = null;

        get tag() {
            return `@${this.tagName}`;
        }

        getStripped(tag, text) {
            text = text.replace(/<\$([^$]+)\$>/gi, "");
            return this._getStripped(tag, text);
        }

        _getStripped(tag, text) {
            throw new Error("Unimplemented!");
        }

        getMeta(tag, text) {
            return this._getMeta(tag, text);
        }
        _getMeta(tag, text) {
            throw new Error("Unimplemented!");
        }
    }
    ;

    static _TagBaseAt = class extends this._TagBase {
        get tag() {
            return `@${this.tagName}`;
        }
    }
    ;

    static _TagBaseHash = class extends this._TagBase {
        get tag() {
            return `#${this.tagName}`;
        }
    }
    ;

    static _TagTextStyle = class extends this._TagBaseAt {
        _getStripped(tag, text) {
            return text;
        }
    }
    ;

    static TagBoldShort = class extends this._TagTextStyle {
        tagName = "b";
    }
    ;

    static TagBoldLong = class extends this._TagTextStyle {
        tagName = "bold";
    }
    ;

    static TagItalicShort = class extends this._TagTextStyle {
        tagName = "i";
    }
    ;

    static TagItalicLong = class extends this._TagTextStyle {
        tagName = "italic";
    }
    ;

    static TagStrikethroughShort = class extends this._TagTextStyle {
        tagName = "s";
    }
    ;

    static TagStrikethroughLong = class extends this._TagTextStyle {
        tagName = "strike";
    }
    ;

    static TagUnderlineShort = class extends this._TagTextStyle {
        tagName = "u";
    }
    ;

    static TagUnderlineLong = class extends this._TagTextStyle {
        tagName = "underline";
    }
    ;

    static TagSup = class extends this._TagTextStyle {
        tagName = "sup";
    }
    ;

    static TagSub = class extends this._TagTextStyle {
        tagName = "sub";
    }
    ;

    static TagKbd = class extends this._TagTextStyle {
        tagName = "kbd";
    }
    ;

    static TagCode = class extends this._TagTextStyle {
        tagName = "code";
    }
    ;

    static TagStyle = class extends this._TagTextStyle {
        tagName = "style";
    }
    ;

    static TagFont = class extends this._TagTextStyle {
        tagName = "font";
    }
    ;

    static TagComic = class extends this._TagTextStyle {
        tagName = "comic";
    }
    ;

    static TagComicH1 = class extends this._TagTextStyle {
        tagName = "comicH1";
    }
    ;

    static TagComicH2 = class extends this._TagTextStyle {
        tagName = "comicH2";
    }
    ;

    static TagComicH3 = class extends this._TagTextStyle {
        tagName = "comicH3";
    }
    ;

    static TagComicH4 = class extends this._TagTextStyle {
        tagName = "comicH4";
    }
    ;

    static TagComicNote = class extends this._TagTextStyle {
        tagName = "comicNote";
    }
    ;

    static TagNote = class extends this._TagTextStyle {
        tagName = "note";
    }
    ;

    static TagTip = class extends this._TagTextStyle {
        tagName = "tip";
    }
    ;

    static TagUnit = class extends this._TagBaseAt {
        tagName = "unit";

        _getStripped(tag, text) {
            const [amount,unitSingle,unitPlural] = Renderer.splitTagByPipe(text);
            return isNaN(amount) ? unitSingle : Number(amount) > 1 ? (unitPlural || unitSingle.toPlural()) : unitSingle;
        }
    }
    ;

    static TagHit = class extends this._TagBaseAt {
        tagName = "h";

        _getStripped(tag, text) {
            return "Hit: ";
        }
    }
    ;

    static TagMiss = class extends this._TagBaseAt {
        tagName = "m";

        _getStripped(tag, text) {
            return "Miss: ";
        }
    }
    ;

    static TagAtk = class extends this._TagBaseAt {
        tagName = "atk";

        _getStripped(tag, text) {
            return Renderer.attackTagToFull(text);
        }
    }
    ;

    static TagHitYourSpellAttack = class extends this._TagBaseAt {
        tagName = "hitYourSpellAttack";

        _getStripped(tag, text) {
            const [displayText] = Renderer.splitTagByPipe(text);
            return displayText || "your spell attack modifier";
        }
    }
    ;

    static TagDc = class extends this._TagBaseAt {
        tagName = "dc";

        _getStripped(tag, text) {
            const [dcText,displayText] = Renderer.splitTagByPipe(text);
            return `DC ${displayText || dcText}`;
        }
    }
    ;

    static TagDcYourSpellSave = class extends this._TagBaseAt {
        tagName = "dcYourSpellSave";

        _getStripped(tag, text) {
            const [displayText] = Renderer.splitTagByPipe(text);
            return displayText || "your spell save DC";
        }
    }
    ;

    static _TagDiceFlavor = class extends this._TagBaseAt {
        _getStripped(tag, text) {
            const [rollText,displayText] = Renderer.splitTagByPipe(text);
            switch (tag) {
            case "@damage":
            case "@dice":
            case "@autodice":
                {
                    return displayText || rollText.replace(/;/g, "/");
                }
            case "@d20":
            case "@hit":
                {
                    return displayText || (()=>{
                        const n = Number(rollText);
                        if (!isNaN(n))
                            return `${n >= 0 ? "+" : ""}${n}`;
                        return rollText;
                    }
                    )();
                }
            case "@recharge":
                {
                    const asNum = Number(rollText || 6);
                    if (isNaN(asNum)) {
                        throw new Error(`Could not parse "${rollText}" as a number!`);
                    }
                    return `(Recharge ${asNum}${asNum < 6 ? `\u20136` : ""})`;
                }
            case "@chance":
                {
                    return displayText || `${rollText} percent`;
                }
            case "@ability":
                {
                    const [,rawScore] = rollText.split(" ").map(it=>it.trim().toLowerCase()).filter(Boolean);
                    const score = Number(rawScore) || 0;
                    return displayText || `${score} (${Parser.getAbilityModifier(score)})`;
                }
            case "@savingThrow":
            case "@skillCheck":
                {
                    return displayText || rollText;
                }
            }
            throw new Error(`Unhandled tag: ${tag}`);
        }
    }
    ;

    static TaChance = class extends this._TagDiceFlavor {
        tagName = "chance";
    }
    ;

    static TaD20 = class extends this._TagDiceFlavor {
        tagName = "d20";
    }
    ;

    static TaDamage = class extends this._TagDiceFlavor {
        tagName = "damage";
    }
    ;

    static TaDice = class extends this._TagDiceFlavor {
        tagName = "dice";
    }
    ;

    static TaAutodice = class extends this._TagDiceFlavor {
        tagName = "autodice";
    }
    ;

    static TaHit = class extends this._TagDiceFlavor {
        tagName = "hit";
    }
    ;

    static TaRecharge = class extends this._TagDiceFlavor {
        tagName = "recharge";
    }
    ;

    static TaAbility = class extends this._TagDiceFlavor {
        tagName = "ability";
    }
    ;

    static TaSavingThrow = class extends this._TagDiceFlavor {
        tagName = "savingThrow";
    }
    ;

    static TaSkillCheck = class extends this._TagDiceFlavor {
        tagName = "skillCheck";
    }
    ;

    static _TagDiceFlavorScaling = class extends this._TagBaseAt {
        _getStripped(tag, text) {
            const [,,addPerProgress,,displayText] = Renderer.splitTagByPipe(text);
            return displayText || addPerProgress;
        }
    }
    ;

    static TagScaledice = class extends this._TagDiceFlavorScaling {
        tagName = "scaledice";
    }
    ;

    static TagScaledamage = class extends this._TagDiceFlavorScaling {
        tagName = "scaledamage";
    }
    ;

    static TagCoinflip = class extends this._TagBaseAt {
        tagName = "coinflip";

        _getStripped(tag, text) {
            const [displayText] = Renderer.splitTagByPipe(text);
            return displayText || "flip a coin";
        }
    }
    ;

    static _TagPipedNoDisplayText = class extends this._TagBaseAt {
        _getStripped(tag, text) {
            const parts = Renderer.splitTagByPipe(text);
            return parts[0];
        }
    }
    ;

    static Tag5etools = class extends this._TagPipedNoDisplayText {
        tagName = "5etools";
    }
    ;

    static TagAdventure = class extends this._TagPipedNoDisplayText {
        tagName = "adventure";
    }
    ;

    static TagBook = class extends this._TagPipedNoDisplayText {
        tagName = "book";
    }
    ;

    static TagFilter = class extends this._TagPipedNoDisplayText {
        tagName = "filter";
    }
    ;

    static TagFootnote = class extends this._TagPipedNoDisplayText {
        tagName = "footnote";
    }
    ;

    static TagLink = class extends this._TagPipedNoDisplayText {
        tagName = "link";
    }
    ;

    static TagLoader = class extends this._TagPipedNoDisplayText {
        tagName = "loader";
    }
    ;

    static TagColor = class extends this._TagPipedNoDisplayText {
        tagName = "color";
    }
    ;

    static TagHighlight = class extends this._TagPipedNoDisplayText {
        tagName = "highlight";
    }
    ;

    static TagHelp = class extends this._TagPipedNoDisplayText {
        tagName = "help";
    }
    ;

    static _TagPipedDisplayTextThird = class extends this._TagBaseAt {
        _getStripped(tag, text) {
            const parts = Renderer.splitTagByPipe(text);
            return parts.length >= 3 ? parts[2] : parts[0];
        }
    }
    ;

    static TagAction = class extends this._TagPipedDisplayTextThird {
        tagName = "action";
        defaultSource = Parser.SRC_PHB;
        page = UrlUtil.PG_ACTIONS;
    }
    ;

    static TagBackground = class extends this._TagPipedDisplayTextThird {
        tagName = "background";
        defaultSource = Parser.SRC_PHB;
        page = UrlUtil.PG_BACKGROUNDS;
    }
    ;

    static TagBoon = class extends this._TagPipedDisplayTextThird {
        tagName = "boon";
        defaultSource = Parser.SRC_MTF;
        page = UrlUtil.PG_CULTS_BOONS;
    }
    ;

    static TagCharoption = class extends this._TagPipedDisplayTextThird {
        tagName = "charoption";
        defaultSource = Parser.SRC_MOT;
        page = UrlUtil.PG_CHAR_CREATION_OPTIONS;
    }
    ;

    static TagClass = class extends this._TagPipedDisplayTextThird {
        tagName = "class";
        defaultSource = Parser.SRC_PHB;
        page = UrlUtil.PG_CLASSES;
    }
    ;

    static TagCondition = class extends this._TagPipedDisplayTextThird {
        tagName = "condition";
        defaultSource = Parser.SRC_PHB;
        page = UrlUtil.PG_CONDITIONS_DISEASES;
    }
    ;

    static TagCreature = class extends this._TagPipedDisplayTextThird {
        tagName = "creature";
        defaultSource = Parser.SRC_MM;
        page = UrlUtil.PG_BESTIARY;
    }
    ;

    static TagCult = class extends this._TagPipedDisplayTextThird {
        tagName = "cult";
        defaultSource = Parser.SRC_MTF;
        page = UrlUtil.PG_CULTS_BOONS;
    }
    ;

    static TagDeck = class extends this._TagPipedDisplayTextThird {
        tagName = "deck";
        defaultSource = Parser.SRC_DMG;
        page = UrlUtil.PG_DECKS;
    }
    ;

    static TagDisease = class extends this._TagPipedDisplayTextThird {
        tagName = "disease";
        defaultSource = Parser.SRC_DMG;
        page = UrlUtil.PG_CONDITIONS_DISEASES;
    }
    ;

    static TagFeat = class extends this._TagPipedDisplayTextThird {
        tagName = "feat";
        defaultSource = Parser.SRC_PHB;
        page = UrlUtil.PG_FEATS;
    }
    ;

    static TagHazard = class extends this._TagPipedDisplayTextThird {
        tagName = "hazard";
        defaultSource = Parser.SRC_DMG;
        page = UrlUtil.PG_TRAPS_HAZARDS;
    }
    ;

    static TagItem = class extends this._TagPipedDisplayTextThird {
        tagName = "item";
        defaultSource = Parser.SRC_DMG;
        page = UrlUtil.PG_ITEMS;
    }
    ;

    static TagItemMastery = class extends this._TagPipedDisplayTextThird {
        tagName = "itemMastery";
        defaultSource = VeCt.STR_GENERIC;
        page = "itemMastery";
    }
    ;

    static TagLanguage = class extends this._TagPipedDisplayTextThird {
        tagName = "language";
        defaultSource = Parser.SRC_PHB;
        page = UrlUtil.PG_LANGUAGES;
    }
    ;

    static TagLegroup = class extends this._TagPipedDisplayTextThird {
        tagName = "legroup";
        defaultSource = Parser.SRC_MM;
        page = "legendaryGroup";
    }
    ;

    static TagObject = class extends this._TagPipedDisplayTextThird {
        tagName = "object";
        defaultSource = Parser.SRC_DMG;
        page = UrlUtil.PG_OBJECTS;
    }
    ;

    static TagOptfeature = class extends this._TagPipedDisplayTextThird {
        tagName = "optfeature";
        defaultSource = Parser.SRC_PHB;
        page = UrlUtil.PG_OPT_FEATURES;
    }
    ;

    static TagPsionic = class extends this._TagPipedDisplayTextThird {
        tagName = "psionic";
        defaultSource = Parser.SRC_UATMC;
        page = UrlUtil.PG_PSIONICS;
    }
    ;

    static TagRace = class extends this._TagPipedDisplayTextThird {
        tagName = "race";
        defaultSource = Parser.SRC_PHB;
        page = UrlUtil.PG_RACES;
    }
    ;

    static TagRecipe = class extends this._TagPipedDisplayTextThird {
        tagName = "recipe";
        defaultSource = Parser.SRC_HF;
        page = UrlUtil.PG_RECIPES;
    }
    ;

    static TagReward = class extends this._TagPipedDisplayTextThird {
        tagName = "reward";
        defaultSource = Parser.SRC_DMG;
        page = UrlUtil.PG_REWARDS;
    }
    ;

    static TagVehicle = class extends this._TagPipedDisplayTextThird {
        tagName = "vehicle";
        defaultSource = Parser.SRC_GoS;
        page = UrlUtil.PG_VEHICLES;
    }
    ;

    static TagVehupgrade = class extends this._TagPipedDisplayTextThird {
        tagName = "vehupgrade";
        defaultSource = Parser.SRC_GoS;
        page = UrlUtil.PG_VEHICLES;
    }
    ;

    static TagSense = class extends this._TagPipedDisplayTextThird {
        tagName = "sense";
        defaultSource = Parser.SRC_PHB;
        page = "sense";
    }
    ;

    static TagSkill = class extends this._TagPipedDisplayTextThird {
        tagName = "skill";
        defaultSource = Parser.SRC_PHB;
        page = "skill";
    }
    ;

    static TagSpell = class extends this._TagPipedDisplayTextThird {
        tagName = "spell";
        defaultSource = Parser.SRC_PHB;
        page = UrlUtil.PG_SPELLS;
    }
    ;

    static TagStatus = class extends this._TagPipedDisplayTextThird {
        tagName = "status";
        defaultSource = Parser.SRC_PHB;
        page = UrlUtil.PG_CONDITIONS_DISEASES;
    }
    ;

    static TagTable = class extends this._TagPipedDisplayTextThird {
        tagName = "table";
        defaultSource = Parser.SRC_DMG;
        page = UrlUtil.PG_TABLES;
    }
    ;

    static TagTrap = class extends this._TagPipedDisplayTextThird {
        tagName = "trap";
        defaultSource = Parser.SRC_DMG;
        page = UrlUtil.PG_TRAPS_HAZARDS;
    }
    ;

    static TagVariantrule = class extends this._TagPipedDisplayTextThird {
        tagName = "variantrule";
        defaultSource = Parser.SRC_DMG;
        page = UrlUtil.PG_VARIANTRULES;
    }
    ;

    static TagCite = class extends this._TagPipedDisplayTextThird {
        tagName = "cite";
        defaultSource = Parser.SRC_PHB;
        page = "citation";
    }
    ;

    static _TagPipedDisplayTextFourth = class extends this._TagBaseAt {
        _getStripped(tag, text) {
            const parts = Renderer.splitTagByPipe(text);
            return parts.length >= 4 ? parts[3] : parts[0];
        }
    }
    ;

    static TagCard = class extends this._TagPipedDisplayTextFourth {
        tagName = "card";
        defaultSource = Parser.SRC_DMG;
        page = "card";
    }
    ;

    static TagDeity = class extends this._TagPipedDisplayTextFourth {
        tagName = "deity";
        defaultSource = Parser.SRC_PHB;
        page = UrlUtil.PG_DEITIES;
    }
    ;

    static _TagPipedDisplayTextSixth = class extends this._TagBaseAt {
        _getStripped(tag, text) {
            const parts = Renderer.splitTagByPipe(text);
            return parts.length >= 6 ? parts[5] : parts[0];
        }
    }
    ;

    static TagClassFeature = class extends this._TagPipedDisplayTextSixth {
        tagName = "classFeature";
        defaultSource = Parser.SRC_PHB;
        page = UrlUtil.PG_CLASSES;
    }
    ;

    static _TagPipedDisplayTextEight = class extends this._TagBaseAt {
        _getStripped(tag, text) {
            const parts = Renderer.splitTagByPipe(text);
            return parts.length >= 8 ? parts[7] : parts[0];
        }
    }
    ;

    static TagSubclassFeature = class extends this._TagPipedDisplayTextEight {
        tagName = "subclassFeature";
        defaultSource = Parser.SRC_PHB;
        page = UrlUtil.PG_CLASSES;
    }
    ;

    static TagQuickref = class extends this._TagBaseAt {
        tagName = "quickref";
        defaultSource = Parser.SRC_PHB;
        page = UrlUtil.PG_QUICKREF;

        _getStripped(tag, text) {
            const {name, displayText} = DataUtil.quickreference.unpackUid(text);
            return displayText || name;
        }
    }
    ;

    static TagArea = class extends this._TagBaseAt {
        tagName = "area";

        _getStripped(tag, text) {
            const [compactText,,flags] = Renderer.splitTagByPipe(text);

            return flags && flags.includes("x") ? compactText : `${flags && flags.includes("u") ? "A" : "a"}rea ${compactText}`;
        }

        _getMeta(tag, text) {
            const [compactText,areaId,flags] = Renderer.splitTagByPipe(text);

            const displayText = flags && flags.includes("x") ? compactText : `${flags && flags.includes("u") ? "A" : "a"}rea ${compactText}`;

            return {
                areaId,
                displayText,
            };
        }
    }
    ;

    static TagHomebrew = class extends this._TagBaseAt {
        tagName = "homebrew";

        _getStripped(tag, text) {
            const [newText,oldText] = Renderer.splitTagByPipe(text);
            if (newText && oldText) {
                return `${newText} [this is a homebrew addition, replacing the following: "${oldText}"]`;
            } else if (newText) {
                return `${newText} [this is a homebrew addition]`;
            } else if (oldText) {
                return `[the following text has been removed due to homebrew: ${oldText}]`;
            } else
                throw new Error(`Homebrew tag had neither old nor new text!`);
        }
    }
    ;

    static TagItemEntry = class extends this._TagBaseHash {
        tagName = "itemEntry";
        defaultSource = Parser.SRC_DMG;
    }
    ;

    static TAGS = [new this.TagBoldShort(), new this.TagBoldLong(), new this.TagItalicShort(), new this.TagItalicLong(), new this.TagStrikethroughShort(), new this.TagStrikethroughLong(), new this.TagUnderlineShort(), new this.TagUnderlineLong(), new this.TagSup(), new this.TagSub(), new this.TagKbd(), new this.TagCode(), new this.TagStyle(), new this.TagFont(),
    new this.TagComic(), new this.TagComicH1(), new this.TagComicH2(), new this.TagComicH3(), new this.TagComicH4(), new this.TagComicNote(),
    new this.TagNote(), new this.TagTip(),
    new this.TagUnit(),
    new this.TagHit(), new this.TagMiss(),
    new this.TagAtk(),
    new this.TagHitYourSpellAttack(),
    new this.TagDc(),
    new this.TagDcYourSpellSave(),
    new this.TaChance(), new this.TaD20(), new this.TaDamage(), new this.TaDice(), new this.TaAutodice(), new this.TaHit(), new this.TaRecharge(), new this.TaAbility(), new this.TaSavingThrow(), new this.TaSkillCheck(),
    new this.TagScaledice(), new this.TagScaledamage(),
    new this.TagCoinflip(),
    new this.Tag5etools(), new this.TagAdventure(), new this.TagBook(), new this.TagFilter(), new this.TagFootnote(), new this.TagLink(), new this.TagLoader(), new this.TagColor(), new this.TagHighlight(), new this.TagHelp(),
    new this.TagQuickref(),
    new this.TagArea(),
    new this.TagAction(), new this.TagBackground(), new this.TagBoon(), new this.TagCharoption(), new this.TagClass(), new this.TagCondition(), new this.TagCreature(), new this.TagCult(), new this.TagDeck(), new this.TagDisease(), new this.TagFeat(), new this.TagHazard(), new this.TagItem(), new this.TagItemMastery(), new this.TagLanguage(), new this.TagLegroup(), new this.TagObject(), new this.TagOptfeature(), new this.TagPsionic(), new this.TagRace(), new this.TagRecipe(), new this.TagReward(), new this.TagVehicle(), new this.TagVehupgrade(), new this.TagSense(), new this.TagSkill(), new this.TagSpell(), new this.TagStatus(), new this.TagTable(), new this.TagTrap(), new this.TagVariantrule(), new this.TagCite(),
    new this.TagCard(), new this.TagDeity(),
    new this.TagClassFeature({
        tagName: "classFeature"
    }),
    new this.TagSubclassFeature({
        tagName: "subclassFeature"
    }),
    new this.TagHomebrew(),
    new this.TagItemEntry(), ];

    static TAG_LOOKUP = {};

    static _init() {
        this.TAGS.forEach(tag=>{
            this.TAG_LOOKUP[tag.tag] = tag;
            this.TAG_LOOKUP[tag.tagName] = tag;
        }
        );

        return null;
    }

    static _ = this._init();

    static getPage(tag) {
        const tagInfo = this.TAG_LOOKUP[tag];
        return tagInfo?.page;
    }
}
;

Renderer.events = class {
    static handleClick_copyCode(evt, ele) {
        const $e = $(ele).parent().next("pre");
        MiscUtil.pCopyTextToClipboard($e.text());
        JqueryUtil.showCopiedEffect($e);
    }

    static handleClick_toggleCodeWrap(evt, ele) {
        const nxt = !StorageUtil.syncGet("rendererCodeWrap");
        StorageUtil.syncSet("rendererCodeWrap", nxt);
        const $btn = $(ele).toggleClass("active", nxt);
        const $e = $btn.parent().next("pre");
        $e.toggleClass("rd__pre-wrap", nxt);
    }

    static bindGeneric({element=document.body}={}) {
        const $ele = $(element).on("click", `[data-rd-data-embed-header]`, evt=>{
            Renderer.events.handleClick_dataEmbedHeader(evt, evt.currentTarget);
        }
        );

        Renderer.events._HEADER_TOGGLE_CLICK_SELECTORS.forEach(selector=>{
            $ele.on("click", selector, evt=>{
                Renderer.events.handleClick_headerToggleButton(evt, evt.currentTarget, {
                    selector
                });
            }
            );
        }
        );
    }

    static handleClick_dataEmbedHeader(evt, ele) {
        evt.stopPropagation();
        evt.preventDefault();

        const $ele = $(ele);
        $ele.find(".rd__data-embed-name").toggleVe();
        $ele.find(".rd__data-embed-toggle").text($ele.text().includes("+") ? "[\u2013]" : "[+]");
        $ele.closest("table").find("tbody").toggleVe();
    }

    static _HEADER_TOGGLE_CLICK_SELECTORS = [`[data-rd-h-toggle-button]`, `[data-rd-h-special-toggle-button]`, ];

    static handleClick_headerToggleButton(evt, ele, {selector=false}={}) {
        evt.stopPropagation();
        evt.preventDefault();

        const isShow = this._handleClick_headerToggleButton_doToggleEle(ele, {
            selector
        });

        if (!EventUtil.isCtrlMetaKey(evt))
            return;

        Renderer.events._HEADER_TOGGLE_CLICK_SELECTORS.forEach(selector=>{
            [...document.querySelectorAll(selector)].filter(eleOther=>eleOther !== ele).forEach(eleOther=>{
                Renderer.events._handleClick_headerToggleButton_doToggleEle(eleOther, {
                    selector,
                    force: isShow
                });
            }
            );
        }
        );
    }

    static _handleClick_headerToggleButton_doToggleEle(ele, {selector=false, force=null}={}) {
        const isShow = force != null ? force : ele.innerHTML.includes("+");

        let eleNxt = ele.closest(".rd__h").nextElementSibling;

        while (eleNxt) {
            if (eleNxt.classList.contains("float-clear")) {
                eleNxt = eleNxt.nextElementSibling;
                continue;
            }

            if (selector !== `[data-rd-h-special-toggle-button]`) {
                const eleToCheck = Renderer.events._handleClick_headerToggleButton_getEleToCheck(eleNxt);
                if (eleToCheck.classList.contains("rd__b-special") || (eleToCheck.classList.contains("rd__h") && !eleToCheck.classList.contains("rd__h--3")) || (eleToCheck.classList.contains("rd__b") && !eleToCheck.classList.contains("rd__b--3")))
                    break;
            }

            eleNxt.classList.toggle("rd__ele-toggled-hidden", !isShow);
            eleNxt = eleNxt.nextElementSibling;
        }

        ele.innerHTML = isShow ? "[\u2013]" : "[+]";

        return isShow;
    }

    static _handleClick_headerToggleButton_getEleToCheck(eleNxt) {
        if (eleNxt.type === 3)
            return eleNxt;
        if (!eleNxt.classList.contains("rd__b") || eleNxt.classList.contains("rd__b--3"))
            return eleNxt;
        const childNodes = [...eleNxt.childNodes].filter(it=>(it.type === 3 && (it.textContent || "").trim()) || it.type !== 3);
        if (childNodes.length !== 1)
            return eleNxt;
        if (childNodes[0].classList.contains("rd__b"))
            return Renderer.events._handleClick_headerToggleButton_getEleToCheck(childNodes[0]);
        return eleNxt;
    }

    static handleLoad_inlineStatblock(ele) {
        const observer = Renderer.utils.lazy.getCreateObserver({
            observerId: "inlineStatblock",
            fnOnObserve: Renderer.events._handleLoad_inlineStatblock_fnOnObserve.bind(Renderer.events),
        });

        observer.track(ele.parentNode);
    }

    static _handleLoad_inlineStatblock_fnOnObserve({entry}) {
        const ele = entry.target;

        const tag = ele.dataset.rdTag.uq();
        const page = ele.dataset.rdPage.uq();
        const source = ele.dataset.rdSource.uq();
        const name = ele.dataset.rdName.uq();
        const displayName = ele.dataset.rdDisplayName.uq();
        const hash = ele.dataset.rdHash.uq();
        const style = ele.dataset.rdStyle.uq();

        DataLoader.pCacheAndGet(page, Parser.getTagSource(tag, source), hash).then(toRender=>{
            const tr = ele.closest("tr");

            if (!toRender) {
                tr.innerHTML = `<td colspan="6"><i class="text-danger">Failed to load ${tag ? Renderer.get().render(`{@${tag} ${name}|${source}${displayName ? `|${displayName}` : ""}}`) : displayName || name}!</i></td>`;
                throw new Error(`Could not find tag: "${tag}" (page/prop: "${page}") hash: "${hash}"`);
            }

            const headerName = displayName || (name ?? toRender.name ?? (toRender.entries?.length ? toRender.entries?.[0]?.name : "(Unknown)"));

            const fnRender = Renderer.hover.getFnRenderCompact(page);
            const tbl = tr.closest("table");
            const nxt = e_({
                outer: Renderer.utils.getEmbeddedDataHeader(headerName, style) + fnRender(toRender, {
                    isEmbeddedEntity: true
                }) + Renderer.utils.getEmbeddedDataFooter(),
            });
            tbl.parentNode.replaceChild(nxt, tbl, );

            const nxtTgt = nxt.querySelector(`[data-rd-embedded-data-render-target="true"]`);

            const fnBind = Renderer.hover.getFnBindListenersCompact(page);
            if (fnBind)
                fnBind(toRender, nxtTgt);
        }
        );
    }
}
;

Renderer.feat = class {
    static _mergeAbilityIncrease_getListItemText(abilityObj) {
        return Renderer.feat._mergeAbilityIncrease_getText(abilityObj);
    }

    static _mergeAbilityIncrease_getListItemItem(abilityObj) {
        return {
            type: "item",
            name: "Ability Score Increase.",
            entry: Renderer.feat._mergeAbilityIncrease_getText(abilityObj),
        };
    }

    static _mergeAbilityIncrease_getText(abilityObj) {
        const maxScore = abilityObj.max ?? 20;

        if (!abilityObj.choose) {
            return Object.keys(abilityObj).filter(k=>k !== "max").map(ab=>`Increase your ${Parser.attAbvToFull(ab)} score by ${abilityObj[ab]}, to a maximum of ${maxScore}.`).join(" ");
        }

        if (abilityObj.choose.from.length === 6) {
            return abilityObj.choose.entry ? Renderer.get().render(abilityObj.choose.entry) : `Increase one ability score of your choice by ${abilityObj.choose.amount ?? 1}, to a maximum of ${maxScore}.`;
        }

        const abbChoicesText = abilityObj.choose.from.map(it=>Parser.attAbvToFull(it)).joinConjunct(", ", " or ");
        return `Increase your ${abbChoicesText} by ${abilityObj.choose.amount ?? 1}, to a maximum of ${maxScore}.`;
    }

    static initFullEntries(feat) {
        if (!feat.ability || feat._fullEntries || !feat.ability.length)
            return;

        const abilsToDisplay = feat.ability.filter(it=>!it.hidden);
        if (!abilsToDisplay.length)
            return;

        Renderer.utils.initFullEntries_(feat);

        const targetList = feat._fullEntries.find(e=>e.type === "list");

        if (targetList && targetList.items.every(it=>it.type === "item")) {
            abilsToDisplay.forEach(abilObj=>targetList.items.unshift(Renderer.feat._mergeAbilityIncrease_getListItemItem(abilObj)));
            return;
        }

        if (targetList) {
            abilsToDisplay.forEach(abilObj=>targetList.items.unshift(Renderer.feat._mergeAbilityIncrease_getListItemText(abilObj)));
            return;
        }

        abilsToDisplay.forEach(abilObj=>feat._fullEntries.unshift(Renderer.feat._mergeAbilityIncrease_getListItemText(abilObj)));

        setTimeout(()=>{
            throw new Error(`Could not find object of type "list" in "entries" for feat "${feat.name}" from source "${feat.source}" when merging ability scores! Reformat the feat to include a "list"-type entry.`);
        }
        , 1);
    }

    static getFeatRendereableEntriesMeta(ent) {
        Renderer.feat.initFullEntries(ent);
        return {
            entryMain: {
                entries: ent._fullEntries || ent.entries
            },
        };
    }

    static getJoinedCategoryPrerequisites(category, rdPrereqs) {
        const ptCategory = category ? `${category.toTitleCase()} Feat` : "";

        return ptCategory && rdPrereqs ? `${ptCategory} (${rdPrereqs})` : (ptCategory || rdPrereqs);
    }

    static getCompactRenderedString(feat, opts) {
        opts = opts || {};

        const renderer = Renderer.get().setFirstSection(true);
        const renderStack = [];

        const ptCategoryPrerequisite = Renderer.feat.getJoinedCategoryPrerequisites(feat.category, Renderer.utils.prerequisite.getHtml(feat.prerequisite), );
        const ptRepeatable = Renderer.utils.getRepeatableHtml(feat);

        renderStack.push(`
			${Renderer.utils.getExcludedTr({
            entity: feat,
            dataProp: "feat",
            page: UrlUtil.PG_FEATS
        })}
			${opts.isSkipNameRow ? "" : Renderer.utils.getNameTr(feat, {
            page: UrlUtil.PG_FEATS
        })}
			<tr class="text"><td colspan="6" class="text">
			${ptCategoryPrerequisite ? `<p>${ptCategoryPrerequisite}</p>` : ""}
			${ptRepeatable ? `<p>${ptRepeatable}</p>` : ""}
		`);
        renderer.recursiveRender(Renderer.feat.getFeatRendereableEntriesMeta(feat)?.entryMain, renderStack, {
            depth: 2
        });
        renderStack.push(`</td></tr>`);

        return renderStack.join("");
    }

    static pGetFluff(feat) {
        return Renderer.utils.pGetFluff({
            entity: feat,
            fnGetFluffData: DataUtil.featFluff.loadJSON.bind(DataUtil.featFluff),
            fluffProp: "featFluff",
        });
    }
}
;

Renderer.class = class {
    static getCompactRenderedString(cls) {
        if (cls.__prop === "subclass")
            return Renderer.subclass.getCompactRenderedString(cls);

        const clsEntry = {
            type: "section",
            name: cls.name,
            source: cls.source,
            page: cls.page,
            entries: MiscUtil.copyFast((cls.classFeatures || []).flat()),
        };

        return Renderer.hover.getGenericCompactRenderedString(clsEntry);
    }

    static getHitDiceEntry(clsHd) {
        return clsHd ? {
            toRoll: `${clsHd.number}d${clsHd.faces}`,
            rollable: true
        } : null;
    }
    static getHitPointsAtFirstLevel(clsHd) {
        return clsHd ? `${clsHd.number * clsHd.faces} + your Constitution modifier` : null;
    }
    static getHitPointsAtHigherLevels(className, clsHd, hdEntry) {
        return className && clsHd && hdEntry ? `${Renderer.getEntryDice(hdEntry, "Hit die")} (or 
            ${((clsHd.number * clsHd.faces) / 2 + 1)}) + your Constitution modifier per ${className} level after 1st` : null;
    }

    static getRenderedArmorProfs(armorProfs) {
        return armorProfs.map(a=>Renderer.get().render(a.full ? a.full : a === "light" || a === "medium" || a === "heavy" ? `{@filter ${a} armor|items|type=${a} armor}` : a)).join(", ");
    }
    static getRenderedWeaponProfs(weaponProfs) {
        return weaponProfs.map(w=>Renderer.get().render(w === "simple" || w === "martial" ? `{@filter ${w} weapons|items|type=${w} weapon}` : w.optional ? `<span class="help help--hover" title="Optional Proficiency">${w.proficiency}</span>` : w)).join(", ");
    }
    static getRenderedToolProfs(toolProfs) {
        return toolProfs.map(it=>Renderer.get().render(it)).join(", ");
    }
    static getRenderedSkillProfs(skills) {
        return `${Parser.skillProficienciesToFull(skills).uppercaseFirst()}.`;
    }

    static getWalkerFilterDereferencedFeatures() {
        return MiscUtil.getWalker({
            keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST,
            isAllowDeleteObjects: true,
            isDepthFirst: true,
        });
    }

    static mutFilterDereferencedClassFeatures({walker, cpyCls, pageFilter, filterValues, isUseSubclassSources=false, }, ) {
        walker = walker || Renderer.class.getWalkerFilterDereferencedFeatures();

        cpyCls.classFeatures = cpyCls.classFeatures.map((lvlFeatures,ixLvl)=>{
            return walker.walk(lvlFeatures, {
                object: (obj)=>{
                    if (!obj.source)
                        return obj;
                    const fText = obj.isClassFeatureVariant ? {
                        isClassFeatureVariant: true
                    } : null;

                    const isDisplay = [obj.source, ...(obj.otherSources || []).map(it=>it.source)].some(src=>pageFilter.filterBox.toDisplayByFilters(filterValues, ...[{
                        filter: pageFilter.sourceFilter,
                        value: isUseSubclassSources && src === cpyCls.source ? pageFilter.getActiveSource(filterValues) : src,
                    }, pageFilter.levelFilter ? {
                        filter: pageFilter.levelFilter,
                        value: ixLvl + 1,
                    } : null, {
                        filter: pageFilter.optionsFilter,
                        value: fText,
                    }, ].filter(Boolean), ));

                    return isDisplay ? obj : null;
                }
                ,
                array: (arr)=>{
                    return arr.filter(it=>it != null);
                }
                ,
            }, );
        }
        );
    }

    static mutFilterDereferencedSubclassFeatures({walker, cpySc, pageFilter, filterValues, }, ) {
        walker = walker || Renderer.class.getWalkerFilterDereferencedFeatures();

        cpySc.subclassFeatures = cpySc.subclassFeatures.map(lvlFeatures=>{
            const level = CollectionUtil.bfs(lvlFeatures, {
                prop: "level"
            });

            return walker.walk(lvlFeatures, {
                object: (obj)=>{
                    if (obj.entries && !obj.entries.length)
                        return null;
                    if (!obj.source)
                        return obj;
                    const fText = obj.isClassFeatureVariant ? {
                        isClassFeatureVariant: true
                    } : null;

                    const isDisplay = [obj.source, ...(obj.otherSources || []).map(it=>it.source)].some(src=>pageFilter.filterBox.toDisplayByFilters(filterValues, ...[{
                        filter: pageFilter.sourceFilter,
                        value: src,
                    }, pageFilter.levelFilter ? {
                        filter: pageFilter.levelFilter,
                        value: level,
                    } : null, {
                        filter: pageFilter.optionsFilter,
                        value: fText,
                    }, ].filter(Boolean), ));

                    return isDisplay ? obj : null;
                }
                ,
                array: (arr)=>{
                    return arr.filter(it=>it != null);
                }
                ,
            }, );
        }
        );
    }
}
;

Renderer.subclass = class {
    static getCompactRenderedString(sc) {
        const scEntry = {
            type: "section",
            name: sc.name,
            source: sc.source,
            page: sc.page,
            entries: MiscUtil.copyFast((sc.subclassFeatures || []).flat()),
        };

        return Renderer.hover.getGenericCompactRenderedString(scEntry);
    }
}
;

Renderer.spell = class {
    static getCompactRenderedString(spell, opts) {
        opts = opts || {};

        const renderer = Renderer.get();
        const renderStack = [];

        renderStack.push(`
			${Renderer.utils.getExcludedTr({
            entity: spell,
            dataProp: "spell",
            page: UrlUtil.PG_SPELLS
        })}
			${Renderer.utils.getNameTr(spell, {
            page: UrlUtil.PG_SPELLS,
            isEmbeddedEntity: opts.isEmbeddedEntity
        })}
			<tr><td colspan="6">
				<table class="w-100 summary stripe-even-table">
					<tr>
						<th colspan="1">Level</th>
						<th colspan="1">School</th>
						<th colspan="2">Casting Time</th>
						<th colspan="2">Range</th>
					</tr>
					<tr>
						<td colspan="1">${Parser.spLevelToFull(spell.level)}${Parser.spMetaToFull(spell.meta)}</td>
						<td colspan="1">${Parser.spSchoolAndSubschoolsAbvsToFull(spell.school, spell.subschools)}</td>
						<td colspan="2">${Parser.spTimeListToFull(spell.time)}</td>
						<td colspan="2">${Parser.spRangeToFull(spell.range)}</td>
					</tr>
					<tr>
						<th colspan="4">Components</th>
						<th colspan="2">Duration</th>
					</tr>
					<tr>
						<td colspan="4">${Parser.spComponentsToFull(spell.components, spell.level)}</td>
						<td colspan="2">${Parser.spDurationToFull(spell.duration)}</td>
					</tr>
				</table>
			</td></tr>
		`);

        renderStack.push(`<tr class="text"><td colspan="6" class="text">`);
        const entryList = {
            type: "entries",
            entries: spell.entries
        };
        renderer.recursiveRender(entryList, renderStack, {
            depth: 1
        });
        if (spell.entriesHigherLevel) {
            const higherLevelsEntryList = {
                type: "entries",
                entries: spell.entriesHigherLevel
            };
            renderer.recursiveRender(higherLevelsEntryList, renderStack, {
                depth: 2
            });
        }
        const fromClassList = Renderer.spell.getCombinedClasses(spell, "fromClassList");
        if (fromClassList.length) {
            const [current] = Parser.spClassesToCurrentAndLegacy(fromClassList);
            renderStack.push(`<div><span class="bold">Classes: </span>${Parser.spMainClassesToFull(current)}</div>`);
        }
        renderStack.push(`</td></tr>`);

        return renderStack.join("");
    }

    static _SpellSourceManager = class {
        _cache = null;

        populate({brew, isForce=false}) {
            if (this._cache && !isForce)
                return;

            this._cache = {
                classes: {},

                groups: {},

                races: {},
                backgrounds: {},
                feats: {},
                optionalfeatures: {},
            };

            (brew.class || []).forEach(c=>{
                c.source = c.source || Parser.SRC_PHB;

                (c.classSpells || []).forEach(itm=>{
                    this._populate_fromClass_classSubclass({
                        itm,
                        className: c.name,
                        classSource: c.source,
                    });

                    this._populate_fromClass_group({
                        itm,
                        className: c.name,
                        classSource: c.source,
                    });
                }
                );
            }
            );

            (brew.subclass || []).forEach(sc=>{
                sc.classSource = sc.classSource || Parser.SRC_PHB;
                sc.shortName = sc.shortName || sc.name;
                sc.source = sc.source || sc.classSource;

                (sc.subclassSpells || []).forEach(itm=>{
                    this._populate_fromClass_classSubclass({
                        itm,
                        className: sc.className,
                        classSource: sc.classSource,
                        subclassShortName: sc.shortName,
                        subclassName: sc.name,
                        subclassSource: sc.source,
                    });

                    this._populate_fromClass_group({
                        itm,
                        className: sc.className,
                        classSource: sc.classSource,
                        subclassShortName: sc.shortName,
                        subclassName: sc.name,
                        subclassSource: sc.source,
                    });
                }
                );

                Object.entries(sc.subSubclassSpells || {}).forEach(([subSubclassName,arr])=>{
                    arr.forEach(itm=>{
                        this._populate_fromClass_classSubclass({
                            itm,
                            className: sc.className,
                            classSource: sc.classSource,
                            subclassShortName: sc.shortName,
                            subclassName: sc.name,
                            subclassSource: sc.source,
                            subSubclassName,
                        });

                        this._populate_fromClass_group({
                            itm,
                            className: sc.className,
                            classSource: sc.classSource,
                            subclassShortName: sc.shortName,
                            subclassName: sc.name,
                            subclassSource: sc.source,
                            subSubclassName,
                        });
                    }
                    );
                }
                );
            }
            );

            (brew.spellList || []).forEach(spellList=>this._populate_fromGroup_group({
                spellList
            }));
        }

        _populate_fromClass_classSubclass({itm, className, classSource, subclassShortName, subclassName, subclassSource, subSubclassName, }, ) {
            if (itm.groupName)
                return;

            if (itm.className) {
                return this._populate_fromClass_doAdd({
                    tgt: MiscUtil.getOrSet(this._cache.classes, "class", (itm.classSource || Parser.SRC_PHB).toLowerCase(), itm.className.toLowerCase(), {}, ),
                    className,
                    classSource,
                    subclassShortName,
                    subclassName,
                    subclassSource,
                    subSubclassName,
                });
            }

            let[name,source] = `${itm}`.toLowerCase().split("|");
            source = source || Parser.SRC_PHB.toLowerCase();

            this._populate_fromClass_doAdd({
                tgt: MiscUtil.getOrSet(this._cache.classes, "spell", source, name, {
                    fromClassList: [],
                    fromSubclass: []
                }, ),
                className,
                classSource,
                subclassShortName,
                subclassName,
                subclassSource,
                subSubclassName,
            });
        }

        _populate_fromClass_doAdd({tgt, className, classSource, subclassShortName, subclassName, subclassSource, subSubclassName, schools, }, ) {
            if (subclassShortName) {
                const toAdd = {
                    class: {
                        name: className,
                        source: classSource
                    },
                    subclass: {
                        name: subclassName || subclassShortName,
                        shortName: subclassShortName,
                        source: subclassSource
                    },
                };
                if (subSubclassName)
                    toAdd.subclass.subSubclass = subSubclassName;
                if (schools)
                    toAdd.schools = schools;

                tgt.fromSubclass = tgt.fromSubclass || [];
                tgt.fromSubclass.push(toAdd);
                return;
            }

            const toAdd = {
                name: className,
                source: classSource
            };
            if (schools)
                toAdd.schools = schools;

            tgt.fromClassList = tgt.fromClassList || [];
            tgt.fromClassList.push(toAdd);
        }

        _populate_fromClass_group({itm, className, classSource, subclassShortName, subclassName, subclassSource, subSubclassName, }, ) {
            if (!itm.groupName)
                return;

            return this._populate_fromClass_doAdd({
                tgt: MiscUtil.getOrSet(this._cache.classes, "group", (itm.groupSource || Parser.SRC_PHB).toLowerCase(), itm.groupName.toLowerCase(), {}, ),
                className,
                classSource,
                subclassShortName,
                subclassName,
                subclassSource,
                subSubclassName,
                schools: itm.spellSchools,
            });
        }

        _populate_fromGroup_group({spellList, }, ) {
            const spellListSourceLower = (spellList.source || "").toLowerCase();
            const spellListNameLower = (spellList.name || "").toLowerCase();

            spellList.spells.forEach(spell=>{
                if (typeof spell === "string") {
                    const {name, source} = DataUtil.proxy.unpackUid("spell", spell, "spell", {
                        isLower: true
                    });
                    return MiscUtil.set(this._cache.groups, "spell", source, name, spellListSourceLower, spellListNameLower, {
                        name: spellList.name,
                        source: spellList.source
                    });
                }

                throw new Error(`Grouping spells based on other spell lists is not yet supported!`);
            }
            );
        }

        mutateSpell({spell: sp, lowName, lowSource}) {
            lowName = lowName || sp.name.toLowerCase();
            lowSource = lowSource || sp.source.toLowerCase();

            this._mutateSpell_brewGeneric({
                sp,
                lowName,
                lowSource,
                propSpell: "races",
                prop: "race"
            });
            this._mutateSpell_brewGeneric({
                sp,
                lowName,
                lowSource,
                propSpell: "backgrounds",
                prop: "background"
            });
            this._mutateSpell_brewGeneric({
                sp,
                lowName,
                lowSource,
                propSpell: "feats",
                prop: "feat"
            });
            this._mutateSpell_brewGeneric({
                sp,
                lowName,
                lowSource,
                propSpell: "optionalfeatures",
                prop: "optionalfeature"
            });
            this._mutateSpell_brewGroup({
                sp,
                lowName,
                lowSource
            });
            this._mutateSpell_brewClassesSubclasses({
                sp,
                lowName,
                lowSource
            });
        }

        _mutateSpell_brewClassesSubclasses({sp, lowName, lowSource}) {
            if (!this._cache?.classes)
                return;

            if (this._cache.classes.spell?.[lowSource]?.[lowName]?.fromClassList?.length) {
                sp._tmpClasses.fromClassList = sp._tmpClasses.fromClassList || [];
                sp._tmpClasses.fromClassList.push(...this._cache.classes.spell[lowSource][lowName].fromClassList);
            }

            if (this._cache.classes.spell?.[lowSource]?.[lowName]?.fromSubclass?.length) {
                sp._tmpClasses.fromSubclass = sp._tmpClasses.fromSubclass || [];
                sp._tmpClasses.fromSubclass.push(...this._cache.classes.spell[lowSource][lowName].fromSubclass);
            }

            if (this._cache.classes.class && sp.classes?.fromClassList) {
                (sp._tmpClasses = sp._tmpClasses || {}).fromClassList = sp._tmpClasses.fromClassList || [];

                outer: for (const srcLower in this._cache.classes.class) {
                    const searchForClasses = this._cache.classes.class[srcLower];

                    for (const clsLowName in searchForClasses) {
                        const spellHasClass = sp.classes?.fromClassList?.some(cls=>(cls.source || "").toLowerCase() === srcLower && cls.name.toLowerCase() === clsLowName);
                        if (!spellHasClass)
                            continue;

                        const fromDetails = searchForClasses[clsLowName];

                        if (fromDetails.fromClassList) {
                            sp._tmpClasses.fromClassList.push(...this._mutateSpell_getListFilteredBySchool({
                                sp,
                                arr: fromDetails.fromClassList
                            }));
                        }

                        if (fromDetails.fromSubclass) {
                            sp._tmpClasses.fromSubclass = sp._tmpClasses.fromSubclass || [];
                            sp._tmpClasses.fromSubclass.push(...this._mutateSpell_getListFilteredBySchool({
                                sp,
                                arr: fromDetails.fromSubclass
                            }));
                        }

                        break outer;
                    }
                }
            }

            if (this._cache.classes.group && (sp.groups?.length || sp._tmpGroups?.length)) {
                const groups = Renderer.spell.getCombinedGeneric(sp, {
                    propSpell: "groups"
                });

                (sp._tmpClasses = sp._tmpClasses || {}).fromClassList = sp._tmpClasses.fromClassList || [];

                outer: for (const srcLower in this._cache.classes.group) {
                    const searchForGroups = this._cache.classes.group[srcLower];

                    for (const groupLowName in searchForGroups) {
                        const spellHasGroup = groups?.some(grp=>(grp.source || "").toLowerCase() === srcLower && grp.name.toLowerCase() === groupLowName);
                        if (!spellHasGroup)
                            continue;

                        const fromDetails = searchForGroups[groupLowName];

                        if (fromDetails.fromClassList) {
                            sp._tmpClasses.fromClassList.push(...this._mutateSpell_getListFilteredBySchool({
                                sp,
                                arr: fromDetails.fromClassList
                            }));
                        }

                        if (fromDetails.fromSubclass) {
                            sp._tmpClasses.fromSubclass = sp._tmpClasses.fromSubclass || [];
                            sp._tmpClasses.fromSubclass.push(...this._mutateSpell_getListFilteredBySchool({
                                sp,
                                arr: fromDetails.fromSubclass
                            }));
                        }

                        break outer;
                    }
                }
            }
        }

        _mutateSpell_getListFilteredBySchool({arr, sp}) {
            return arr.filter(it=>{
                if (!it.schools)
                    return true;
                return it.schools.includes(sp.school);
            }
            ).map(it=>{
                if (!it.schools)
                    return it;
                const out = MiscUtil.copyFast(it);
                delete it.schools;
                return it;
            }
            );
        }

        _mutateSpell_brewGeneric({sp, lowName, lowSource, propSpell, prop}) {
            if (!this._cache?.[propSpell])
                return;

            const propTmp = `_tmp${propSpell.uppercaseFirst()}`;

            if (this._cache[propSpell]?.spell?.[lowSource]?.[lowName]?.length) {
                (sp[propTmp] = sp[propTmp] || []).push(...this._cache[propSpell].spell[lowSource][lowName]);
            }

            if (this._cache?.[propSpell]?.[prop] && sp[propSpell]) {
                sp[propTmp] = sp[propTmp] || [];

                outer: for (const srcLower in this._cache[propSpell][prop]) {
                    const searchForExisting = this._cache[propSpell][prop][srcLower];

                    for (const lowName in searchForExisting) {
                        const spellHasEnt = sp[propSpell].some(it=>(it.source || "").toLowerCase() === srcLower && it.name.toLowerCase() === lowName);
                        if (!spellHasEnt)
                            continue;

                        const fromDetails = searchForExisting[lowName];

                        sp[propTmp].push(...fromDetails);

                        break outer;
                    }
                }
            }
        }

        _mutateSpell_brewGroup({sp, lowName, lowSource}) {
            if (!this._cache?.groups)
                return;

            if (this._cache.groups.spell?.[lowSource]?.[lowName]) {
                Object.values(this._cache.groups.spell[lowSource][lowName]).forEach(bySource=>{
                    Object.values(bySource).forEach(byName=>{
                        sp._tmpGroups.push(byName);
                    }
                    );
                }
                );
            }

        }
    }
    ;

    static populatePrereleaseLookup(brew, {isForce=false}={}) {
        Renderer.spell._spellSourceManagerPrerelease.populate({
            brew,
            isForce
        });
    }

    static populateBrewLookup(brew, {isForce=false}={}) {
        Renderer.spell._spellSourceManagerBrew.populate({
            brew,
            isForce
        });
    }

    static prePopulateHover(data) {
        (data.spell || []).forEach(sp=>Renderer.spell.initBrewSources(sp));
    }

    static prePopulateHoverPrerelease(data) {
        Renderer.spell.populatePrereleaseLookup(data);
    }

    static prePopulateHoverBrew(data) {
        Renderer.spell.populateBrewLookup(data);
    }

    static _BREW_SOURCES_TMP_PROPS = ["_tmpSourcesInit", "_tmpClasses", "_tmpRaces", "_tmpBackgrounds", "_tmpFeats", "_tmpOptionalfeatures", "_tmpGroups", ];
    static uninitBrewSources(sp) {
        Renderer.spell._BREW_SOURCES_TMP_PROPS.forEach(prop=>delete sp[prop]);
    }

    static initBrewSources(sp) {
        if (sp._tmpSourcesInit)
            return;
        sp._tmpSourcesInit = true;

        sp._tmpClasses = {};
        sp._tmpRaces = [];
        sp._tmpBackgrounds = [];
        sp._tmpFeats = [];
        sp._tmpOptionalfeatures = [];
        sp._tmpGroups = [];

        const lowName = sp.name.toLowerCase();
        const lowSource = sp.source.toLowerCase();

        for (const manager of [Renderer.spell._spellSourceManagerPrerelease, Renderer.spell._spellSourceManagerBrew]) {
            manager.mutateSpell({
                spell: sp,
                lowName,
                lowSource
            });
        }
    }

    static getCombinedClasses(sp, prop) {
        return [...((sp.classes || {})[prop] || []), ...((sp._tmpClasses || {})[prop] || []), ].filter(it=>{
            if (!ExcludeUtil.isInitialised)
                return true;

            switch (prop) {
            case "fromClassList":
            case "fromClassListVariant":
                {
                    const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_CLASSES](it);
                    if (ExcludeUtil.isExcluded(hash, "class", it.source, {
                        isNoCount: true
                    }))
                        return false;

                    if (prop !== "fromClassListVariant")
                        return true;
                    if (it.definedInSource)
                        return !ExcludeUtil.isExcluded("*", "classFeature", it.definedInSource, {
                            isNoCount: true
                        });

                    return true;
                }
            case "fromSubclass":
            case "fromSubclassVariant":
                {
                    const hash = UrlUtil.URL_TO_HASH_BUILDER["subclass"]({
                        name: it.subclass.name,
                        shortName: it.subclass.shortName,
                        source: it.subclass.source,
                        className: it.class.name,
                        classSource: it.class.source,
                    });

                    if (prop !== "fromSubclassVariant")
                        return !ExcludeUtil.isExcluded(hash, "subclass", it.subclass.source, {
                            isNoCount: true
                        });
                    if (it.class.definedInSource)
                        return !Renderer.spell.isExcludedSubclassVariantSource({
                            classDefinedInSource: it.class.definedInSource
                        });

                    return true;
                }
            default:
                throw new Error(`Unhandled prop "${prop}"`);
            }
        }
        );
    }

    static isExcludedSubclassVariantSource({classDefinedInSource, subclassDefinedInSource}) {
        return (classDefinedInSource != null && ExcludeUtil.isExcluded("*", "classFeature", classDefinedInSource, {
            isNoCount: true
        })) || (subclassDefinedInSource != null && ExcludeUtil.isExcluded("*", "subclassFeature", subclassDefinedInSource, {
            isNoCount: true
        }));
    }

    static getCombinedGeneric(sp, {propSpell, prop}) {
        const propSpellTmp = `_tmp${propSpell.uppercaseFirst()}`;
        return [...(sp[propSpell] || []), ...(sp[propSpellTmp] || []), ].filter(it=>{
            if (!ExcludeUtil.isInitialised || !prop)
                return true;
            const hash = UrlUtil.URL_TO_HASH_BUILDER[prop](it);
            return !ExcludeUtil.isExcluded(hash, prop, it.source, {
                isNoCount: true
            });
        }
        ).sort(SortUtil.ascSortGenericEntity.bind(SortUtil));
    }

    static pGetFluff(sp) {
        return Renderer.utils.pGetFluff({
            entity: sp,
            fluffBaseUrl: `data/spells/`,
            fluffProp: "spellFluff",
        });
    }
}
;

Renderer.spell._spellSourceManagerPrerelease = new Renderer.spell._SpellSourceManager();
Renderer.spell._spellSourceManagerBrew = new Renderer.spell._SpellSourceManager();

Renderer.condition = class {
    static getCompactRenderedString(cond) {
        const renderer = Renderer.get();
        const renderStack = [];

        renderStack.push(`
			${Renderer.utils.getExcludedTr({
            entity: cond,
            dataProp: cond.__prop || cond._type,
            page: UrlUtil.PG_CONDITIONS_DISEASES
        })}
			${Renderer.utils.getNameTr(cond, {
            page: UrlUtil.PG_CONDITIONS_DISEASES
        })}
			<tr class="text"><td colspan="6">
		`);
        renderer.recursiveRender({
            entries: cond.entries
        }, renderStack);
        renderStack.push(`</td></tr>`);

        return renderStack.join("");
    }

    static pGetFluff(it) {
        return Renderer.utils.pGetFluff({
            entity: it,
            fnGetFluffData: it.__prop === "condition" ? DataUtil.conditionFluff.loadJSON.bind(DataUtil.conditionFluff) : null,
            fluffProp: it.__prop === "condition" ? "conditionFluff" : "diseaseFluff",
        });
    }
}
;

Renderer.background = class {
    static getCompactRenderedString(bg) {
        return Renderer.generic.getCompactRenderedString(bg, {
            dataProp: "background",
            page: UrlUtil.PG_BACKGROUNDS,
        }, );
    }

    static pGetFluff(bg) {
        return Renderer.utils.pGetFluff({
            entity: bg,
            fnGetFluffData: DataUtil.backgroundFluff.loadJSON.bind(DataUtil.backgroundFluff),
            fluffProp: "backgroundFluff",
        });
    }
}
;

Renderer.backgroundFeature = class {
    static getCompactRenderedString(ent) {
        return Renderer.generic.getCompactRenderedString(ent);
    }
}
;

Renderer.optionalfeature = class {
    static getListPrerequisiteLevelText(prerequisites) {
        if (!prerequisites || !prerequisites.some(it=>it.level))
            return "\u2014";
        const levelPart = prerequisites.find(it=>it.level).level;
        return levelPart.level || levelPart;
    }

    static getPreviouslyPrintedEntry(ent) {
        if (!ent.previousVersion)
            return null;
        return `{@i An earlier version of this ${ent.featureType.map(t=>Parser.optFeatureTypeToFull(t)).join("/")} is available in }${Parser.sourceJsonToFull(ent.previousVersion.source)} {@i as {@optfeature ${ent.previousVersion.name}|${ent.previousVersion.source}}.}`;
    }

    static getTypeEntry(ent) {
        return `{@note Type: ${Renderer.optionalfeature.getTypeText(ent)}}`;
    }

    static getCostEntry(ent) {
        if (!ent.consumes?.name)
            return null;

        const ptPrefix = "Cost: ";
        const tksUnit = ent.consumes.name.split(" ").map(it=>it.trim()).filter(Boolean);
        tksUnit.last(tksUnit.last()[ent.consumes.amount != null && ent.consumes.amount !== 1 ? "toPlural" : "toString"]());
        const ptUnit = ` ${tksUnit.join(" ")}`;

        if (ent.consumes?.amountMin != null && ent.consumes?.amountMax != null)
            return `{@i ${ptPrefix}${ent.consumes.amountMin}\u2013${ent.consumes.amountMax}${ptUnit}}`;
        return `{@i ${ptPrefix}${ent.consumes.amount ?? 1}${ptUnit}}`;
    }

    static getPreviouslyPrintedText(ent) {
        const entry = Renderer.optionalfeature.getPreviouslyPrintedEntry(ent);
        if (!entry)
            return "";
        return `<tr><td colspan="6"><p class="mt-2">${Renderer.get().render(entry)}</p></td></tr>`;
    }

    static getTypeText(ent) {
        const commonPrefix = ent.featureType.length > 1 ? MiscUtil.findCommonPrefix(ent.featureType.map(fs=>Parser.optFeatureTypeToFull(fs)), {
            isRespectWordBoundaries: true
        }) : "";

        return [commonPrefix.trim() || null, ent.featureType.map(ft=>Parser.optFeatureTypeToFull(ft).substring(commonPrefix.length)).join("/"), ].filter(Boolean).join(" ");
    }

    static getCostHtml(ent) {
        const entry = Renderer.optionalfeature.getCostEntry(ent);
        if (!entry)
            return "";

        return Renderer.get().render(entry);
    }

    static getCompactRenderedString(ent) {
        const ptCost = Renderer.optionalfeature.getCostHtml(ent);
        return `
			${Renderer.utils.getExcludedTr({
            entity: ent,
            dataProp: "optionalfeature",
            page: UrlUtil.PG_OPT_FEATURES
        })}
			${Renderer.utils.getNameTr(ent, {
            page: UrlUtil.PG_OPT_FEATURES
        })}
			<tr class="text"><td colspan="6">
			${ent.prerequisite ? `<p>${Renderer.utils.prerequisite.getHtml(ent.prerequisite)}</p>` : ""}
			${ptCost ? `<p>${ptCost}</p>` : ""}
			${Renderer.get().render({
            entries: ent.entries
        }, 1)}
			</td></tr>
			${Renderer.optionalfeature.getPreviouslyPrintedText(ent)}
			<tr><td colspan="6"><p>${Renderer.get().render(Renderer.optionalfeature.getTypeEntry(ent))}</p></td></tr>
		`;
    }
}
;

Renderer.reward = class {
    static getRewardRenderableEntriesMeta(ent) {
        const ptSubtitle = [(ent.type || "").toTitleCase(), ent.rarity ? ent.rarity.toTitleCase() : "", ].filter(Boolean).join(", ");

        return {
            entriesContent: [ptSubtitle ? `{@i ${ptSubtitle}}` : "", ...ent.entries, ].filter(Boolean),
        };
    }

    static getRenderedString(ent) {
        const entriesMeta = Renderer.reward.getRewardRenderableEntriesMeta(ent);
        return `<tr class="text"><td colspan="6">${Renderer.get().setFirstSection(true).render({
            entries: entriesMeta.entriesContent
        }, 1)}</td></tr>`;
    }

    static getCompactRenderedString(ent) {
        return `
			${Renderer.utils.getExcludedTr({
            entity: ent,
            dataProp: "reward",
            page: UrlUtil.PG_REWARDS
        })}
			${Renderer.utils.getNameTr(ent, {
            page: UrlUtil.PG_REWARDS
        })}
			${Renderer.reward.getRenderedString(ent)}
		`;
    }

    static pGetFluff(ent) {
        return Renderer.utils.pGetFluff({
            entity: ent,
            fnGetFluffData: DataUtil.rewardFluff.loadJSON.bind(DataUtil.rewardFluff),
            fluffProp: "rewardFluff",
        });
    }
}
;

Renderer.race = class {
    static getRaceRenderableEntriesMeta(race) {
        return {
            entryMain: race._isBaseRace ? {
                type: "entries",
                entries: race._baseRaceEntries
            } : {
                type: "entries",
                entries: race.entries
            },
        };
    }

    static getCompactRenderedString(race, {isStatic=false}={}) {
        const renderer = Renderer.get();
        const renderStack = [];

        renderStack.push(`
			${Renderer.utils.getExcludedTr({
            entity: race,
            dataProp: "race",
            page: UrlUtil.PG_RACES
        })}
			${Renderer.utils.getNameTr(race, {
            page: UrlUtil.PG_RACES
        })}
			<tr><td colspan="6">
				<table class="w-100 summary stripe-even-table">
					<tr>
						<th class="col-4 ve-text-center">Ability Scores</th>
						<th class="col-4 ve-text-center">Size</th>
						<th class="col-4 ve-text-center">Speed</th>
					</tr>
					<tr>
						<td class="ve-text-center">${Renderer.getAbilityData(race.ability).asText}</td>
						<td class="ve-text-center">${(race.size || [Parser.SZ_VARIES]).map(sz=>Parser.sizeAbvToFull(sz)).join("/")}</td>
						<td class="ve-text-center">${Parser.getSpeedString(race)}</td>
					</tr>
				</table>
			</td></tr>
			<tr class="text"><td colspan="6">
		`);
        renderer.recursiveRender(Renderer.race.getRaceRenderableEntriesMeta(race).entryMain, renderStack, {
            depth: 1
        });
        renderStack.push("</td></tr>");

        const ptHeightWeight = Renderer.race.getHeightAndWeightPart(race, {
            isStatic
        });
        if (ptHeightWeight)
            renderStack.push(`<tr class="text"><td colspan="6"><hr class="rd__hr">${ptHeightWeight}</td></tr>`);

        return renderStack.join("");
    }

    static getRenderedSize(race) {
        return (race.size || [Parser.SZ_VARIES]).map(sz=>Parser.sizeAbvToFull(sz)).join("/");
    }

    static getHeightAndWeightPart(race, {isStatic=false}={}) {
        if (!race.heightAndWeight)
            return null;
        if (race._isBaseRace)
            return null;
        return Renderer.get().render({
            entries: Renderer.race.getHeightAndWeightEntries(race, {
                isStatic
            })
        });
    }

    static getHeightAndWeightEntries(race, {isStatic=false}={}) {
        const colLabels = ["Base Height", "Base Weight", "Height Modifier", "Weight Modifier"];
        const colStyles = ["col-2-3 ve-text-center", "col-2-3 ve-text-center", "col-2-3 ve-text-center", "col-2 ve-text-center"];

        const cellHeightMod = !isStatic ? `+<span data-race-heightmod="true">${race.heightAndWeight.heightMod}</span>` : `+${race.heightAndWeight.heightMod}`;
        const cellWeightMod = !isStatic ? `× <span data-race-weightmod="true">${race.heightAndWeight.weightMod || "1"}</span> lb.` : `× ${race.heightAndWeight.weightMod || "1"} lb.`;

        const row = [Renderer.race.getRenderedHeight(race.heightAndWeight.baseHeight), `${race.heightAndWeight.baseWeight} lb.`, cellHeightMod, cellWeightMod, ];

        if (!isStatic) {
            colLabels.push("");
            colStyles.push("col-3-1 ve-text-center");
            row.push(`<div class="ve-flex-vh-center">
				<div class="ve-hidden race__disp-result-height-weight ve-flex-v-baseline">
					<div class="mr-1">=</div>
					<div class="race__disp-result-height"></div>
					<div class="mr-2">; </div>
					<div class="race__disp-result-weight mr-1"></div>
					<div class="small">lb.</div>
				</div>
				<button class="btn btn-default btn-xs my-1 race__btn-roll-height-weight">Roll</button>
			</div>`);
        }

        return ["You may roll for your character's height and weight on the Random Height and Weight table. The roll in the Height Modifier column adds a number (in inches) to the character's base height. To get a weight, multiply the number you rolled for height by the roll in the Weight Modifier column and add the result (in pounds) to the base weight.", {
            type: "table",
            caption: "Random Height and Weight",
            colLabels,
            colStyles,
            rows: [row],
        }, ];
    }

    static getRenderedHeight(height) {
        const heightFeet = Number(Math.floor(height / 12).toFixed(3));
        const heightInches = Number((height % 12).toFixed(3));
        return `${heightFeet ? `${heightFeet}'` : ""}${heightInches ? `${heightInches}"` : ""}`;
    }

    static mergeSubraces(races, opts) {
        opts = opts || {};

        const out = [];
        races.forEach(r=>{
            if (r.size && typeof r.size === "string")
                r.size = [r.size];

            if (r.lineage && r.lineage !== true) {
                r = MiscUtil.copyFast(r);

                if (r.lineage === "VRGR") {
                    r.ability = r.ability || [{
                        choose: {
                            weighted: {
                                from: [...Parser.ABIL_ABVS],
                                weights: [2, 1],
                            },
                        },
                    }, {
                        choose: {
                            weighted: {
                                from: [...Parser.ABIL_ABVS],
                                weights: [1, 1, 1],
                            },
                        },
                    }, ];
                } else if (r.lineage === "UA1") {
                    r.ability = r.ability || [{
                        choose: {
                            weighted: {
                                from: [...Parser.ABIL_ABVS],
                                weights: [2, 1],
                            },
                        },
                    }, ];
                }

                r.entries = r.entries || [];
                r.entries.push({
                    type: "entries",
                    name: "Languages",
                    entries: ["You can speak, read, and write Common and one other language that you and your DM agree is appropriate for your character."],
                });

                r.languageProficiencies = r.languageProficiencies || [{
                    "common": true,
                    "anyStandard": 1
                }];
            }

            if (r.subraces && !r.subraces.length)
                delete r.subraces;

            if (r.subraces) {
                r.subraces.forEach(sr=>{
                    sr.source = sr.source || r.source;
                    sr._isSubRace = true;
                }
                );

                r.subraces.sort((a,b)=>SortUtil.ascSortLower(a.name || "_", b.name || "_") || SortUtil.ascSortLower(Parser.sourceJsonToAbv(a.source), Parser.sourceJsonToAbv(b.source)));
            }

            if (opts.isAddBaseRaces && r.subraces) {
                const baseRace = MiscUtil.copyFast(r);

                baseRace._isBaseRace = true;

                const isAnyNoName = r.subraces.some(it=>!it.name);
                if (isAnyNoName) {
                    baseRace._rawName = baseRace.name;
                    baseRace.name = `${baseRace.name} (Base)`;
                }

                const nameCounts = {};
                r.subraces.filter(sr=>sr.name).forEach(sr=>nameCounts[sr.name.toLowerCase()] = (nameCounts[sr.name.toLowerCase()] || 0) + 1);
                nameCounts._ = r.subraces.filter(sr=>!sr.name).length;

                const lst = {
                    type: "list",
                    items: r.subraces.map(sr=>{
                        const count = nameCounts[(sr.name || "_").toLowerCase()];
                        const idName = Renderer.race.getSubraceName(r.name, sr.name);
                        return `{@race ${idName}|${sr.source}${count > 1 ? `|${idName} (<span title="${Parser.sourceJsonToFull(sr.source).escapeQuotes()}">${Parser.sourceJsonToAbv(sr.source)}</span>)` : ""}}`;
                    }
                    ),
                };

                Renderer.race._mutBaseRaceEntries(baseRace, lst);
                baseRace._subraces = r.subraces.map(sr=>({
                    name: Renderer.race.getSubraceName(r.name, sr.name),
                    source: sr.source
                }));

                delete baseRace.subraces;

                out.push(baseRace);
            }

            out.push(...Renderer.race._mergeSubraces(r));
        }
        );

        return out;
    }

    static _mutMakeBaseRace(baseRace) {
        if (baseRace._isBaseRace)
            return;

        baseRace._isBaseRace = true;

        Renderer.race._mutBaseRaceEntries(baseRace, {
            type: "list",
            items: []
        });
    }

    static _mutBaseRaceEntries(baseRace, lst) {
        baseRace._baseRaceEntries = [{
            type: "section",
            entries: ["This race has multiple subraces, as listed below:", lst, ],
        }, {
            type: "section",
            entries: [{
                type: "entries",
                entries: [{
                    type: "entries",
                    name: "Traits",
                    entries: [...MiscUtil.copyFast(baseRace.entries), ],
                }, ],
            }, ],
        }, ];
    }

    static getSubraceName(raceName, subraceName) {
        if (!subraceName)
            return raceName;

        const mBrackets = /^(.*?)(\(.*?\))$/i.exec(raceName || "");
        if (!mBrackets)
            return `${raceName} (${subraceName})`;

        const bracketPart = mBrackets[2].substring(1, mBrackets[2].length - 1);
        return `${mBrackets[1]}(${[bracketPart, subraceName].join("; ")})`;
    }

    static _mergeSubraces(race) {
        if (!race.subraces)
            return [race];
        return MiscUtil.copyFast(race.subraces).map(s=>Renderer.race._getMergedSubrace(race, s));
    }

    static _getMergedSubrace(race, cpySr) {
        const cpy = MiscUtil.copyFast(race);
        cpy._baseName = cpy.name;
        cpy._baseSource = cpy.source;
        cpy._baseSrd = cpy.srd;
        cpy._baseBasicRules = cpy.basicRules;
        delete cpy.subraces;
        delete cpy.srd;
        delete cpy.basicRules;
        delete cpy._versions;
        delete cpy.hasFluff;
        delete cpy.hasFluffImages;
        delete cpySr.__prop;

        if (cpySr.name) {
            cpy._subraceName = cpySr.name;

            if (cpySr.alias) {
                cpy.alias = cpySr.alias.map(it=>Renderer.race.getSubraceName(cpy.name, it));
                delete cpySr.alias;
            }

            cpy.name = Renderer.race.getSubraceName(cpy.name, cpySr.name);
            delete cpySr.name;
        }
        if (cpySr.ability) {
            if ((cpySr.overwrite && cpySr.overwrite.ability) || !cpy.ability)
                cpy.ability = cpySr.ability.map(()=>({}));

            if (cpy.ability.length !== cpySr.ability.length)
                throw new Error(`Race and subrace ability array lengths did not match!`);
            cpySr.ability.forEach((obj,i)=>Object.assign(cpy.ability[i], obj));
            delete cpySr.ability;
        }
        if (cpySr.entries) {
            cpySr.entries.forEach(ent=>{
                if (!ent.data?.overwrite)
                    return cpy.entries.push(ent);

                const toOverwrite = cpy.entries.findIndex(it=>it.name?.toLowerCase()?.trim() === ent.data.overwrite.toLowerCase().trim());
                if (~toOverwrite)
                    cpy.entries[toOverwrite] = ent;
                else
                    cpy.entries.push(ent);
            }
            );
            delete cpySr.entries;
        }

        if (cpySr.traitTags) {
            if (cpySr.overwrite && cpySr.overwrite.traitTags)
                cpy.traitTags = cpySr.traitTags;
            else
                cpy.traitTags = (cpy.traitTags || []).concat(cpySr.traitTags);
            delete cpySr.traitTags;
        }

        if (cpySr.languageProficiencies) {
            if (cpySr.overwrite && cpySr.overwrite.languageProficiencies)
                cpy.languageProficiencies = cpySr.languageProficiencies;
            else
                cpy.languageProficiencies = cpy.languageProficiencies = (cpy.languageProficiencies || []).concat(cpySr.languageProficiencies);
            delete cpySr.languageProficiencies;
        }

        if (cpySr.skillProficiencies) {
            if (!cpy.skillProficiencies || (cpySr.overwrite && cpySr.overwrite["skillProficiencies"]))
                cpy.skillProficiencies = cpySr.skillProficiencies;
            else {
                if (!cpySr.skillProficiencies.length || !cpy.skillProficiencies.length)
                    throw new Error(`No items!`);
                if (cpySr.skillProficiencies.length > 1 || cpy.skillProficiencies.length > 1)
                    throw new Error(`Subrace merging does not handle choices!`);
                if (cpySr.skillProficiencies.choose) {
                    if (cpy.skillProficiencies.choose)
                        throw new Error(`Subrace choose merging is not supported!!`);
                    cpy.skillProficiencies.choose = cpySr.skillProficiencies.choose;
                    delete cpySr.skillProficiencies.choose;
                }
                Object.assign(cpy.skillProficiencies[0], cpySr.skillProficiencies[0]);
            }

            delete cpySr.skillProficiencies;
        }

        Object.assign(cpy, cpySr);

        Object.entries(cpy).forEach(([k,v])=>{
            if (v != null)
                return;
            delete cpy[k];
        }
        );

        return cpy;
    }

    static adoptSubraces(allRaces, subraces) {
        const nxtData = [];

        subraces.forEach(sr=>{
            if (!sr.raceName || !sr.raceSource)
                throw new Error(`Subrace was missing parent "raceName" and/or "raceSource"!`);

            const _baseRace = allRaces.find(r=>r.name === sr.raceName && r.source === sr.raceSource);
            if (!_baseRace)
                throw new Error(`Could not find parent race for subrace "${sr.name}" (${sr.source})!`);

            if ((_baseRace._seenSubraces || []).some(it=>it.name === sr.name && it.source === sr.source))
                return;
            (_baseRace._seenSubraces = _baseRace._seenSubraces || []).push({
                name: sr.name,
                source: sr.source
            });

            if (!_baseRace._isBaseRace && (PrereleaseUtil.hasSourceJson(_baseRace.source) || BrewUtil2.hasSourceJson(_baseRace.source))) {
                Renderer.race._mutMakeBaseRace(_baseRace);
            }

            if (_baseRace._isBaseRace) {
                const subraceListEntry = ((_baseRace._baseRaceEntries[0] || {}).entries || []).find(it=>it.type === "list");
                subraceListEntry.items.push(`{@race ${_baseRace._rawName || _baseRace.name} (${sr.name})|${sr.source || _baseRace.source}}`);
            }

            let baseRace = nxtData.find(r=>r.name === sr.raceName && r.source === sr.raceSource);
            if (!baseRace) {
                baseRace = MiscUtil.copyFast(_baseRace);
                if (baseRace._rawName) {
                    baseRace.name = baseRace._rawName;
                    delete baseRace._rawName;
                }
                delete baseRace._isBaseRace;
                delete baseRace._baseRaceEntries;

                nxtData.push(baseRace);
            }

            baseRace.subraces = baseRace.subraces || [];
            baseRace.subraces.push(sr);
        }
        );

        return nxtData;
    }

    static bindListenersHeightAndWeight(race, ele) {
        if (!race.heightAndWeight)
            return;
        if (race._isBaseRace)
            return;

        const $render = $(ele);

        const $dispResult = $render.find(`.race__disp-result-height-weight`);
        const $dispHeight = $render.find(`.race__disp-result-height`);
        const $dispWeight = $render.find(`.race__disp-result-weight`);

        const lock = new VeLock();
        let hasRolled = false;
        let resultHeight;
        let resultWeightMod;

        const $btnRollHeight = $render.find(`[data-race-heightmod="true"]`).html(race.heightAndWeight.heightMod).addClass("roller").mousedown(evt=>evt.preventDefault()).click(async()=>{
            try {
                await lock.pLock();

                if (!hasRolled)
                    return pDoFullRoll(true);
                await pRollHeight();
                updateDisplay();
            } finally {
                lock.unlock();
            }
        }
        );

        const isWeightRoller = race.heightAndWeight.weightMod && isNaN(race.heightAndWeight.weightMod);
        const $btnRollWeight = $render.find(`[data-race-weightmod="true"]`).html(isWeightRoller ? `(<span class="roller">${race.heightAndWeight.weightMod}</span>)` : race.heightAndWeight.weightMod || "1").click(async()=>{
            try {
                await lock.pLock();

                if (!hasRolled)
                    return pDoFullRoll(true);
                await pRollWeight();
                updateDisplay();
            } finally {
                lock.unlock();
            }
        }
        );
        if (isWeightRoller)
            $btnRollWeight.mousedown(evt=>evt.preventDefault());

        const $btnRoll = $render.find(`button.race__btn-roll-height-weight`).click(async()=>pDoFullRoll());

        const pRollHeight = async()=>{
            const mResultHeight = await Renderer.dice.pRoll2(race.heightAndWeight.heightMod, {
                isUser: false,
                label: "Height Modifier",
                name: race.name,
            });
            if (mResultHeight == null)
                return;
            resultHeight = mResultHeight;
        }
        ;

        const pRollWeight = async()=>{
            const weightModRaw = race.heightAndWeight.weightMod || "1";
            const mResultWeightMod = isNaN(weightModRaw) ? await Renderer.dice.pRoll2(weightModRaw, {
                isUser: false,
                label: "Weight Modifier",
                name: race.name,
            }) : Number(weightModRaw);
            if (mResultWeightMod == null)
                return;
            resultWeightMod = mResultWeightMod;
        }
        ;

        const updateDisplay = ()=>{
            const renderedHeight = Renderer.race.getRenderedHeight(race.heightAndWeight.baseHeight + resultHeight);
            const totalWeight = race.heightAndWeight.baseWeight + (resultWeightMod * resultHeight);
            $dispHeight.text(renderedHeight);
            $dispWeight.text(Number(totalWeight.toFixed(3)));
        }
        ;

        const pDoFullRoll = async isPreLocked=>{
            try {
                if (!isPreLocked)
                    await lock.pLock();

                $btnRoll.parent().removeClass(`ve-flex-vh-center`).addClass(`split-v-center`);
                await pRollHeight();
                await pRollWeight();
                $dispResult.removeClass(`ve-hidden`);
                updateDisplay();

                hasRolled = true;
            } finally {
                if (!isPreLocked)
                    lock.unlock();
            }
        }
        ;
    }

    static bindListenersCompact(race, ele) {
        Renderer.race.bindListenersHeightAndWeight(race, ele);
    }

    static pGetFluff(race) {
        return Renderer.utils.pGetFluff({
            entity: race,
            fnGetFluffData: DataUtil.raceFluff.loadJSON.bind(DataUtil.raceFluff),
            fluffProp: "raceFluff",
        });
    }
}
;

Renderer.raceFeature = class {
    static getCompactRenderedString(ent) {
        return Renderer.generic.getCompactRenderedString(ent);
    }
}
;

Renderer.deity = class {
    static _BASE_PART_TRANSLATORS = {
        "alignment": {
            name: "Alignment",
            displayFn: (it)=>it.map(a=>Parser.alignmentAbvToFull(a)).join(" ").toTitleCase(),
        },
        "pantheon": {
            name: "Pantheon",
        },
        "category": {
            name: "Category",
            displayFn: it=>typeof it === "string" ? it : it.join(", "),
        },
        "domains": {
            name: "Domains",
            displayFn: (it)=>it.join(", "),
        },
        "province": {
            name: "Province",
        },
        "altNames": {
            name: "Alternate Names",
            displayFn: (it)=>it.join(", "),
        },
        "symbol": {
            name: "Symbol",
        },
    };

    static getDeityRenderableEntriesMeta(ent) {
        return {
            entriesAttributes: [...Object.entries(Renderer.deity._BASE_PART_TRANSLATORS).map(([prop,{name, displayFn}])=>{
                if (ent[prop] == null)
                    return null;

                const displayVal = displayFn ? displayFn(ent[prop]) : ent[prop];
                return {
                    name,
                    entry: `{@b ${name}:} ${displayVal}`,
                };
            }
            ).filter(Boolean), ...Object.entries(ent.customProperties || {}).map(([name,val])=>({
                name,
                entry: `{@b ${name}:} ${val}`,
            })), ].sort(({name: nameA},{name: nameB})=>SortUtil.ascSortLower(nameA, nameB)).map(({entry})=>entry),
        };
    }

    static getCompactRenderedString(ent) {
        const renderer = Renderer.get();
        const entriesMeta = Renderer.deity.getDeityRenderableEntriesMeta(ent);
        return `
			${Renderer.utils.getExcludedTr({
            entity: ent,
            dataProp: "deity",
            page: UrlUtil.PG_DEITIES
        })}
			${Renderer.utils.getNameTr(ent, {
            suffix: ent.title ? `, ${ent.title.toTitleCase()}` : "",
            page: UrlUtil.PG_DEITIES
        })}
			<tr><td colspan="6">
				${entriesMeta.entriesAttributes.map(entry=>`<div class="my-1p">${Renderer.get().render(entry)}</div>`).join("")}
			</td>
			${ent.entries ? `<tr><td colspan="6"><div class="border"></div></td></tr><tr><td colspan="6">${renderer.render({
            entries: ent.entries
        }, 1)}</td></tr>` : ""}
		`;
    }
}
;

Renderer.object = class {
    static CHILD_PROPS = ["actionEntries"];

    static RENDERABLE_ENTRIES_PROP_ORDER__ATTRIBUTES = ["entryCreatureCapacity", "entryCargoCapacity", "entryArmorClass", "entryHitPoints", "entrySpeed", "entryAbilityScores", "entryDamageImmunities", "entryDamageResistances", "entryDamageVulnerabilities", "entryConditionImmunities", ];

    static getObjectRenderableEntriesMeta(ent) {
        return {
            entrySize: `{@i ${ent.objectType !== "GEN" ? `${Renderer.utils.getRenderedSize(ent.size)} ${ent.creatureType ? Parser.monTypeToFullObj(ent.creatureType).asText : "object"}` : `Variable size object`}}`,

            entryCreatureCapacity: ent.capCrew != null || ent.capPassenger != null ? `{@b Creature Capacity:} ${Renderer.vehicle.getShipCreatureCapacity(ent)}` : null,
            entryCargoCapacity: ent.capCargo != null ? `{@b Cargo Capacity:} ${Renderer.vehicle.getShipCargoCapacity(ent)}` : null,
            entryArmorClass: ent.ac != null ? `{@b Armor Class:} ${ent.ac.special ?? ent.ac}` : null,
            entryHitPoints: ent.hp != null ? `{@b Hit Points:} ${ent.hp.special ?? ent.hp}` : null,
            entrySpeed: ent.speed != null ? `{@b Speed:} ${Parser.getSpeedString(ent)}` : null,
            entryAbilityScores: Parser.ABIL_ABVS.some(ab=>ent[ab] != null) ? `{@b Ability Scores:} ${Parser.ABIL_ABVS.filter(ab=>ent[ab] != null).map(ab=>`${ab.toUpperCase()} ${Renderer.utils.getAbilityRollerEntry(ent, ab)}`).join(", ")}` : null,
            entryDamageImmunities: ent.immune != null ? `{@b Damage Immunities:} ${Parser.getFullImmRes(ent.immune)}` : null,
            entryDamageResistances: ent.resist ? `{@b Damage Resistances:} ${Parser.getFullImmRes(ent.resist)}` : null,
            entryDamageVulnerabilities: ent.vulnerable ? `{@b Damage Vulnerabilities:} ${Parser.getFullImmRes(ent.vulnerable)}` : null,
            entryConditionImmunities: ent.conditionImmune ? `{@b Condition Immunities:} ${Parser.getFullCondImm(ent.conditionImmune, {
                isEntry: true
            })}` : null,
        };
    }

    static getCompactRenderedString(obj, opts) {
        return Renderer.object.getRenderedString(obj, {
            ...opts,
            isCompact: true
        });
    }

    static getRenderedString(ent, opts) {
        opts = opts || {};

        const renderer = Renderer.get().setFirstSection(true);

        const hasToken = ent.tokenUrl || ent.hasToken;
        const extraThClasses = !opts.isCompact && hasToken ? ["objs__name--token"] : null;

        const entriesMeta = Renderer.object.getObjectRenderableEntriesMeta(ent);

        const ptAttribs = Renderer.object.RENDERABLE_ENTRIES_PROP_ORDER__ATTRIBUTES.filter(prop=>entriesMeta[prop]).map(prop=>`${Renderer.get().render(entriesMeta[prop])}<br>`).join("");

        return `
			${Renderer.utils.getExcludedTr({
            entity: ent,
            dataProp: "object",
            page: opts.page || UrlUtil.PG_OBJECTS
        })}
			${Renderer.utils.getNameTr(ent, {
            page: opts.page || UrlUtil.PG_OBJECTS,
            extraThClasses,
            isEmbeddedEntity: opts.isEmbeddedEntity
        })}
			<tr class="text"><td colspan="6">${Renderer.get().render(entriesMeta.entrySize)}</td></tr>
			<tr class="text"><td colspan="6">${ptAttribs}</td></tr>
			<tr class="text"><td colspan="6">
			${ent.entries ? renderer.render({
            entries: ent.entries
        }, 2) : ""}
			${ent.actionEntries ? renderer.render({
            entries: ent.actionEntries
        }, 2) : ""}
			</td></tr>
		`;
    }

    static getTokenUrl(obj) {
        return obj.tokenUrl || UrlUtil.link(`${Renderer.get().baseMediaUrls["img"] || Renderer.get().baseUrl}img/objects/tokens/${Parser.sourceJsonToAbv(obj.source)}/${Parser.nameToTokenName(obj.name)}.png`);
    }

    static pGetFluff(obj) {
        return Renderer.utils.pGetFluff({
            entity: obj,
            fnGetFluffData: DataUtil.objectFluff.loadJSON.bind(DataUtil.objectFluff),
            fluffProp: "objectFluff",
        });
    }
}
;

Renderer.trap = class {
    static CHILD_PROPS = ["trigger", "effect", "eActive", "eDynamic", "eConstant", "countermeasures"];

    static getTrapRenderableEntriesMeta(ent) {
        return {
            entriesAttributes: [ent.trigger ? {
                type: "entries",
                name: "Trigger",
                entries: ent.trigger,
            } : null,
            ent.effect ? {
                type: "entries",
                name: "Effect",
                entries: ent.effect,
            } : null,
            ent.initiative ? {
                type: "entries",
                name: "Initiative",
                entries: Renderer.trap.getTrapInitiativeEntries(ent),
            } : null, ent.eActive ? {
                type: "entries",
                name: "Active Elements",
                entries: ent.eActive,
            } : null, ent.eDynamic ? {
                type: "entries",
                name: "Dynamic Elements",
                entries: ent.eDynamic,
            } : null, ent.eConstant ? {
                type: "entries",
                name: "Constant Elements",
                entries: ent.eConstant,
            } : null,
            ent.countermeasures ? {
                type: "entries",
                name: "Countermeasures",
                entries: ent.countermeasures,
            } : null, ].filter(Boolean),
        };
    }

    static getTrapInitiativeEntries(ent) {
        return [`The trap acts on ${Parser.trapInitToFull(ent.initiative)}${ent.initiativeNote ? ` (${ent.initiativeNote})` : ""}.`];
    }

    static getRenderedTrapPart(renderer, ent) {
        const entriesMeta = Renderer.trap.getTrapRenderableEntriesMeta(ent);
        if (!entriesMeta.entriesAttributes.length)
            return "";
        return renderer.render({
            entries: entriesMeta.entriesAttributes
        }, 1);
    }

    static getCompactRenderedString(ent, opts) {
        return Renderer.traphazard.getCompactRenderedString(ent, opts);
    }

    static pGetFluff(ent) {
        return Renderer.traphazard.pGetFluff(ent);
    }
}
;

Renderer.hazard = class {
    static getCompactRenderedString(ent, opts) {
        return Renderer.traphazard.getCompactRenderedString(ent, opts);
    }

    static pGetFluff(ent) {
        return Renderer.traphazard.pGetFluff(ent);
    }
}
;

Renderer.traphazard = class {
    static getSubtitle(ent) {
        const type = ent.trapHazType || "HAZ";
        if (type === "GEN")
            return null;

        const ptThreat = ent.threat ? ent.threat.toTitleCase() : null;

        const ptTypeThreat = [Parser.trapHazTypeToFull(type), ent.threat ? ent.threat.toTitleCase() : null, ].filter(Boolean).join(", ");

        const parenPart = [ent.tier ? Parser.tierToFullLevel(ent.tier) : null, Renderer.traphazard.getTrapLevelPart(ent), ].filter(Boolean).join(", ");

        return parenPart ? `${ptTypeThreat} (${parenPart})` : ptTypeThreat;
    }

    static getTrapLevelPart(ent) {
        return ent.level?.min != null && ent.level?.max != null ? `level ${ent.level.min}${ent.level.min !== ent.level.max ? `\u2013${ent.level.max}` : ""}` : null;
    }

    static getCompactRenderedString(ent, opts) {
        opts = opts || {};

        const renderer = Renderer.get();
        const subtitle = Renderer.traphazard.getSubtitle(ent);
        return `
			${Renderer.utils.getExcludedTr({
            entity: ent,
            dataProp: ent.__prop,
            page: UrlUtil.PG_TRAPS_HAZARDS
        })}
			${Renderer.utils.getNameTr(ent, {
            page: UrlUtil.PG_TRAPS_HAZARDS,
            isEmbeddedEntity: opts.isEmbeddedEntity
        })}
			${subtitle ? `<tr class="text"><td colspan="6"><i>${subtitle}</i></td></tr>` : ""}
			<tr class="text"><td colspan="6">
			${renderer.render({
            entries: ent.entries
        }, 2)}
			${Renderer.trap.getRenderedTrapPart(renderer, ent)}
			</td></tr>
		`;
    }

    static pGetFluff(ent) {
        return Renderer.utils.pGetFluff({
            entity: ent,
            fnGetFluffData: ent.__prop === "trap" ? DataUtil.trapFluff.loadJSON.bind(DataUtil.trapFluff) : DataUtil.hazardFluff.loadJSON.bind(DataUtil.hazardFluff),
            fluffProp: ent.__prop === "trap" ? "trapFluff" : "hazardFluff",
        });
    }
}
;

Renderer.cultboon = class {
    static getCultRenderableEntriesMeta(ent) {
        if (!ent.goal && !ent.cultists && !ent.signaturespells)
            return null;

        const fauxList = {
            type: "list",
            style: "list-hang-notitle",
            items: [],
        };

        if (ent.goal) {
            fauxList.items.push({
                type: "item",
                name: "Goals:",
                entry: ent.goal.entry,
            });
        }

        if (ent.cultists) {
            fauxList.items.push({
                type: "item",
                name: "Typical Cultists:",
                entry: ent.cultists.entry,
            });
        }
        if (ent.signaturespells) {
            fauxList.items.push({
                type: "item",
                name: "Signature Spells:",
                entry: ent.signaturespells.entry,
            });
        }

        return {
            listGoalsCultistsSpells: fauxList
        };
    }

    static doRenderCultParts(ent, renderer, renderStack) {
        const cultEntriesMeta = Renderer.cultboon.getCultRenderableEntriesMeta(ent);
        if (!cultEntriesMeta)
            return;
        renderer.recursiveRender(cultEntriesMeta.listGoalsCultistsSpells, renderStack, {
            depth: 2
        });
    }

    static getBoonRenderableEntriesMeta(ent) {
        if (!ent.ability && !ent.signaturespells)
            return null;

        const benefits = {
            type: "list",
            style: "list-hang-notitle",
            items: []
        };

        if (ent.ability) {
            benefits.items.push({
                type: "item",
                name: "Ability Score Adjustment:",
                entry: ent.ability ? ent.ability.entry : "None",
            });
        }

        if (ent.signaturespells) {
            benefits.items.push({
                type: "item",
                name: "Signature Spells:",
                entry: ent.signaturespells ? ent.signaturespells.entry : "None",
            });
        }

        return {
            listBenefits: benefits
        };
    }

    static doRenderBoonParts(ent, renderer, renderStack) {
        const boonEntriesMeta = Renderer.cultboon.getBoonRenderableEntriesMeta(ent);
        if (!boonEntriesMeta)
            return;
        renderer.recursiveRender(boonEntriesMeta.listBenefits, renderStack, {
            depth: 1
        });
    }

    static _getCompactRenderedString_cult({ent, renderer}) {
        const renderStack = [];

        Renderer.cultboon.doRenderCultParts(ent, renderer, renderStack);
        renderer.recursiveRender({
            entries: ent.entries
        }, renderStack, {
            depth: 2
        });

        return `${Renderer.utils.getExcludedTr({
            entity: ent,
            dataProp: "cult",
            page: UrlUtil.PG_CULTS_BOONS
        })}
		${Renderer.utils.getNameTr(ent, {
            page: UrlUtil.PG_CULTS_BOONS
        })}
		<tr id="text"><td class="divider" colspan="6"><div></div></td></tr>
		<tr class="text"><td colspan="6" class="text">${renderStack.join("")}</td></tr>`;
    }

    static _getCompactRenderedString_boon({ent, renderer}) {
        const renderStack = [];

        Renderer.cultboon.doRenderBoonParts(ent, renderer, renderStack);
        renderer.recursiveRender({
            entries: ent.entries
        }, renderStack, {
            depth: 1
        });
        ent._displayName = ent._displayName || ent.name;

        return `${Renderer.utils.getExcludedTr({
            entity: ent,
            dataProp: "boon",
            page: UrlUtil.PG_CULTS_BOONS
        })}
		${Renderer.utils.getNameTr(ent, {
            page: UrlUtil.PG_CULTS_BOONS
        })}
		<tr class="text"><td colspan="6">${renderStack.join("")}</td></tr>`;
    }

    static getCompactRenderedString(ent) {
        const renderer = Renderer.get();
        switch (ent.__prop) {
        case "cult":
            return Renderer.cultboon._getCompactRenderedString_cult({
                ent,
                renderer
            });
        case "boon":
            return Renderer.cultboon._getCompactRenderedString_boon({
                ent,
                renderer
            });
        default:
            throw new Error(`Unhandled prop "${ent.__prop}"`);
        }
    }
}
;

Renderer.monster = class {
    static CHILD_PROPS = ["action", "bonus", "reaction", "trait", "legendary", "mythic", "variant", "spellcasting"];

    static getShortName(mon, {isTitleCase=false, isSentenceCase=false, isUseDisplayName=false}={}) {
        const name = isUseDisplayName ? (mon._displayName ?? mon.name) : mon.name;
        const shortName = isUseDisplayName ? (mon._displayShortName ?? mon.shortName) : mon.shortName;

        const prefix = mon.isNamedCreature ? "" : isTitleCase || isSentenceCase ? "The " : "the ";
        if (shortName === true)
            return `${prefix}${name}`;
        else if (shortName)
            return `${prefix}${!prefix && isTitleCase ? shortName.toTitleCase() : shortName.toLowerCase()}`;

        const out = Renderer.monster.getShortNameFromName(name, {
            isNamedCreature: mon.isNamedCreature
        });
        return `${prefix}${out}`;
    }

    static getShortNameFromName(name, {isNamedCreature=false}={}) {
        const base = name.split(",")[0];
        let out = base.replace(/(?:adult|ancient|young) \w+ (dragon|dracolich)/gi, "$1");
        out = isNamedCreature ? out.split(" ")[0] : out.toLowerCase();
        return out;
    }

    static getLegendaryActionIntro(mon, {renderer=Renderer.get(), isUseDisplayName=false}={}) {
        return renderer.render(Renderer.monster.getLegendaryActionIntroEntry(mon, {
            isUseDisplayName
        }));
    }

    static getLegendaryActionIntroEntry(mon, {isUseDisplayName=false}={}) {
        if (mon.legendaryHeader) {
            return {
                entries: mon.legendaryHeader
            };
        }

        const legendaryActions = mon.legendaryActions || 3;
        const legendaryNameTitle = Renderer.monster.getShortName(mon, {
            isTitleCase: true,
            isUseDisplayName
        });
        return {
            entries: [`${legendaryNameTitle} can take ${legendaryActions} legendary action${legendaryActions > 1 ? "s" : ""}, choosing from the options below. Only one legendary action can be used at a time and only at the end of another creature's turn. ${legendaryNameTitle} regains spent legendary actions at the start of its turn.`, ],
        };
    }

    static getSectionIntro(mon, {renderer=Renderer.get(), prop}) {
        const headerProp = `${prop}Header`;
        if (mon[headerProp])
            return renderer.render({
                entries: mon[headerProp]
            });
        return "";
    }

    static getSave(renderer, attr, mod) {
        if (attr === "special")
            return renderer.render(mod);
        return renderer.render(`<span>${attr.uppercaseFirst()} {@savingThrow ${attr} ${mod}}</span>`);
    }

    static dragonCasterVariant = class {
        static _LVL_TO_COLOR_TO_SPELLS__UNOFFICIAL = {
            2: {
                black: ["darkness", "Melf's acid arrow", "fog cloud", "scorching ray"],
                green: ["ray of sickness", "charm person", "detect thoughts", "invisibility", "suggestion"],
                white: ["ice knife|XGE", "Snilloc's snowball swarm|XGE"],
                brass: ["see invisibility", "magic mouth", "blindness/deafness", "sleep", "detect thoughts"],
                bronze: ["gust of wind", "misty step", "locate object", "blur", "witch bolt", "thunderwave", "shield"],
                copper: ["knock", "sleep", "detect thoughts", "blindness/deafness", "tasha's hideous laughter"],
            },
            3: {
                blue: ["wall of sand|XGE", "thunder step|XGE", "lightning bolt", "blink", "magic missile", "slow"],
                red: ["fireball", "scorching ray", "haste", "erupting earth|XGE", "Aganazzar's scorcher|XGE"],
                gold: ["slow", "fireball", "dispel magic", "counterspell", "Aganazzar's scorcher|XGE", "shield"],
                silver: ["sleet storm", "protection from energy", "catnap|XGE", "locate object", "identify", "Leomund's tiny hut"],
            },
            4: {
                black: ["vitriolic sphere|XGE", "sickening radiance|XGE", "Evard's black tentacles", "blight", "hunger of Hadar"],
                white: ["fire shield", "ice storm", "sleet storm"],
                brass: ["charm monster|XGE", "sending", "wall of sand|XGE", "hypnotic pattern", "tongues"],
                copper: ["polymorph", "greater invisibility", "confusion", "stinking cloud", "major image", "charm monster|XGE"],
            },
            5: {
                blue: ["telekinesis", "hold monster", "dimension door", "wall of stone", "wall of force"],
                green: ["cloudkill", "charm monster|XGE", "modify memory", "mislead", "hallucinatory terrain", "dimension door"],
                bronze: ["steel wind strike|XGE", "control winds|XGE", "watery sphere|XGE", "storm sphere|XGE", "tidal wave|XGE"],
                gold: ["hold monster", "immolation|XGE", "wall of fire", "greater invisibility", "dimension door"],
                silver: ["cone of cold", "ice storm", "teleportation circle", "skill empowerment|XGE", "creation", "Mordenkainen's private sanctum"],
            },
            6: {
                white: ["cone of cold", "wall of ice"],
                brass: ["scrying", "Rary's telepathic bond", "Otto's irresistible dance", "legend lore", "hold monster", "dream"],
            },
            7: {
                black: ["power word pain|XGE", "finger of death", "disintegrate", "hold monster"],
                blue: ["chain lightning", "forcecage", "teleport", "etherealness"],
                green: ["project image", "mirage arcane", "prismatic spray", "teleport"],
                bronze: ["whirlwind|XGE", "chain lightning", "scatter|XGE", "teleport", "disintegrate", "lightning bolt"],
                copper: ["symbol", "simulacrum", "reverse gravity", "project image", "Bigby's hand", "mental prison|XGE", "seeming"],
                silver: ["Otiluke's freezing sphere", "prismatic spray", "wall of ice", "contingency", "arcane gate"],
            },
            8: {
                gold: ["sunburst", "delayed blast fireball", "antimagic field", "teleport", "globe of invulnerability", "maze"],
            },
        };
        static _LVL_TO_COLOR_TO_SPELLS__FTD = {
            1: {
                deep: ["command", "dissonant whispers", "faerie fire"],
            },
            2: {
                black: ["blindness/deafness", "create or destroy water"],
                green: ["invisibility", "speak with animals"],
                white: ["gust of wind"],
                brass: ["create or destroy water", "speak with animals"],
                bronze: ["beast sense", "detect thoughts", "speak with animals"],
                copper: ["lesser restoration", "phantasmal force"],
            },
            3: {
                blue: ["create or destroy water", "major image"],
                red: ["bane", "heat metal", "hypnotic pattern", "suggestion"],
                gold: ["bless", "cure wounds", "slow", "suggestion", "zone of truth"],
                silver: ["beacon of hope", "calm emotions", "hold person", "zone of truth"],
                deep: ["command", "dissonant whispers", "faerie fire", "water breathing"],
            },
            4: {
                black: ["blindness/deafness", "create or destroy water", "plant growth"],
                white: ["gust of wind"],
                brass: ["create or destroy water", "speak with animals", "suggestion"],
                copper: ["lesser restoration", "phantasmal force", "stone shape"],
            },
            5: {
                blue: ["arcane eye", "create or destroy water", "major image"],
                red: ["bane", "dominate person", "heat metal", "hypnotic pattern", "suggestion"],
                green: ["invisibility", "plant growth", "speak with animals"],
                bronze: ["beast sense", "control water", "detect thoughts", "speak with animals"],
                gold: ["bless", "commune", "cure wounds", "geas", "slow", "suggestion", "zone of truth"],
                silver: ["beacon of hope", "calm emotions", "hold person", "polymorph", "zone of truth"],
            },
            6: {
                white: ["gust of wind", "ice storm"],
                brass: ["create or destroy water", "locate creature", "speak with animals", "suggestion"],
                deep: ["command", "dissonant whispers", "faerie fire", "passwall", "water breathing"],
            },
            7: {
                black: ["blindness/deafness", "create or destroy water", "insect plague", "plant growth"],
                blue: ["arcane eye", "create or destroy water", "major image", "project image"],
                red: ["bane", "dominate person", "heat metal", "hypnotic pattern", "power word stun", "suggestion"],
                green: ["invisibility", "mass suggestion", "plant growth", "speak with animals"],
                bronze: ["beast sense", "control water", "detect thoughts", "heroes' feast", "speak with animals"],
                copper: ["lesser restoration", "move earth", "phantasmal force", "stone shape"],
                silver: ["beacon of hope", "calm emotions", "hold person", "polymorph", "teleport", "zone of truth"],
            },
            8: {
                gold: ["bless", "commune", "cure wounds", "geas", "plane shift", "slow", "suggestion", "word of recall", "zone of truth"],
            },
        };

        static getAvailableColors() {
            const out = new Set();

            const add = (lookup)=>Object.values(lookup).forEach(obj=>Object.keys(obj).forEach(k=>out.add(k)));
            add(Renderer.monster.dragonCasterVariant._LVL_TO_COLOR_TO_SPELLS__UNOFFICIAL);
            add(Renderer.monster.dragonCasterVariant._LVL_TO_COLOR_TO_SPELLS__FTD);

            return [...out].sort(SortUtil.ascSortLower);
        }

        static hasCastingColorVariant(dragon) {
            return dragon.dragonCastingColor && !dragon.spellcasting;
        }

        static getMeta(dragon) {
            const chaMod = Parser.getAbilityModNumber(dragon.cha);
            const pb = Parser.crToPb(dragon.cr);
            const maxSpellLevel = Math.floor(Parser.crToNumber(dragon.cr) / 3);

            return {
                chaMod,
                pb,
                maxSpellLevel,
                spellSaveDc: pb + chaMod + 8,
                spellToHit: pb + chaMod,
                exampleSpellsUnofficial: Renderer.monster.dragonCasterVariant._getMeta_getExampleSpells({
                    dragon,
                    maxSpellLevel,
                    spellLookup: Renderer.monster.dragonCasterVariant._LVL_TO_COLOR_TO_SPELLS__UNOFFICIAL,
                }),
                exampleSpellsFtd: Renderer.monster.dragonCasterVariant._getMeta_getExampleSpells({
                    dragon,
                    maxSpellLevel,
                    spellLookup: Renderer.monster.dragonCasterVariant._LVL_TO_COLOR_TO_SPELLS__FTD,
                }),
            };
        }

        static _getMeta_getExampleSpells({dragon, maxSpellLevel, spellLookup}) {
            if (spellLookup[maxSpellLevel]?.[dragon.dragonCastingColor])
                return spellLookup[maxSpellLevel][dragon.dragonCastingColor];

            const flatKeys = Object.entries(spellLookup).map(([lvl,group])=>{
                return Object.keys(group).map(color=>`${lvl}${color}`);
            }
            ).flat().mergeMap(it=>({
                [it]: true
            }));

            while (--maxSpellLevel > -1) {
                const lookupKey = `${maxSpellLevel}${dragon.dragonCastingColor}`;
                if (flatKeys[lookupKey])
                    return spellLookup[maxSpellLevel][dragon.dragonCastingColor];
            }
            return [];
        }

        static getSpellcasterDetailsPart({chaMod, maxSpellLevel, spellSaveDc, spellToHit, isSeeSpellsPageNote=false}) {
            const levelString = maxSpellLevel === 0 ? `${chaMod === 1 ? "This" : "These"} spells are Cantrips.` : `${chaMod === 1 ? "The" : "Each"} spell's level can be no higher than ${Parser.spLevelToFull(maxSpellLevel)}.`;

            return `This dragon can innately cast ${Parser.numberToText(chaMod)} spell${chaMod === 1 ? "" : "s"}, once per day${chaMod === 1 ? "" : " each"}, requiring no material components. ${levelString} The dragon's spell save DC is {@dc ${spellSaveDc}}, and it has {@hit ${spellToHit}} to hit with spell attacks.${isSeeSpellsPageNote ? ` See the {@filter spell page|spells|level=${[...new Array(maxSpellLevel + 1)].map((it,i)=>i).join(";")}} for a list of spells the dragon is capable of casting.` : ""}`;
        }

        static getVariantEntries(dragon) {
            if (!Renderer.monster.dragonCasterVariant.hasCastingColorVariant(dragon))
                return [];

            const meta = Renderer.monster.dragonCasterVariant.getMeta(dragon);
            const {exampleSpellsUnofficial, exampleSpellsFtd} = meta;

            const vFtd = exampleSpellsFtd?.length ? {
                type: "variant",
                name: "Dragons as Innate Spellcasters",
                source: Parser.SRC_FTD,
                entries: [`${Renderer.monster.dragonCasterVariant.getSpellcasterDetailsPart(meta)}`, `A suggested spell list is shown below, but you can also choose spells to reflect the dragon's character. A dragon who innately casts {@filter druid|spells|class=druid} spells feels different from one who casts {@filter warlock|spells|class=warlock} spells. You can also give a dragon spells of a higher level than this rule allows, but such a tweak might increase the dragon's challenge rating\u2014especially if those spells deal damage or impose conditions on targets.`, {
                    type: "list",
                    items: exampleSpellsFtd.map(it=>`{@spell ${it}}`),
                }, ],
            } : null;

            const vBasic = {
                type: "variant",
                name: "Dragons as Innate Spellcasters",
                entries: ["Dragons are innately magical creatures that can master a few spells as they age, using this variant.", `A young or older dragon can innately cast a number of spells equal to its Charisma modifier. Each spell can be cast once per day, requiring no material components, and the spell's level can be no higher than one-third the dragon's challenge rating (rounded down). The dragon's bonus to hit with spell attacks is equal to its proficiency bonus + its Charisma bonus. The dragon's spell save DC equals 8 + its proficiency bonus + its Charisma modifier.`, `{@note ${Renderer.monster.dragonCasterVariant.getSpellcasterDetailsPart({
                    ...meta,
                    isSeeSpellsPageNote: true
                })}${exampleSpellsUnofficial?.length ? ` A selection of examples are shown below:` : ""}}`, ],
            };
            if (dragon.source !== Parser.SRC_MM) {
                vBasic.source = Parser.SRC_MM;
                vBasic.page = 86;
            }
            if (exampleSpellsUnofficial) {
                const ls = {
                    type: "list",
                    style: "list-italic",
                    items: exampleSpellsUnofficial.map(it=>`{@spell ${it}}`),
                };
                vBasic.entries.push(ls);
            }

            return [vFtd, vBasic].filter(Boolean);
        }

        static getHtml(dragon, {renderer=null}={}) {
            const variantEntrues = Renderer.monster.dragonCasterVariant.getVariantEntries(dragon);
            if (!variantEntrues.length)
                return null;
            return variantEntrues.map(it=>renderer.render(it)).join("");
        }
    }
    ;

    static getCrScaleTarget({win, $btnScale, initialCr, cbRender, isCompact, }, ) {
        const evtName = "click.cr-scaler";

        let slider;

        const $body = $(win.document.body);
        function cleanSliders() {
            $body.find(`.mon__cr_slider_wrp`).remove();
            $btnScale.off(evtName);
            if (slider)
                slider.destroy();
        }

        cleanSliders();

        const $wrp = $(`<div class="mon__cr_slider_wrp ${isCompact ? "mon__cr_slider_wrp--compact" : ""}"></div>`);

        const cur = Parser.CRS.indexOf(initialCr);
        if (cur === -1)
            throw new Error(`Initial CR ${initialCr} was not valid!`);

        const comp = BaseComponent.fromObject({
            min: 0,
            max: Parser.CRS.length - 1,
            cur,
        });
        slider = new ComponentUiUtil.RangeSlider({
            comp,
            propMin: "min",
            propMax: "max",
            propCurMin: "cur",
            fnDisplay: ix=>Parser.CRS[ix],
        });
        slider.$get().appendTo($wrp);

        $btnScale.off(evtName).on(evtName, (evt)=>evt.stopPropagation());
        $wrp.on(evtName, (evt)=>evt.stopPropagation());
        $body.off(evtName).on(evtName, cleanSliders);

        comp._addHookBase("cur", ()=>{
            cbRender(Parser.crToNumber(Parser.CRS[comp._state.cur]));
            $body.off(evtName);
            cleanSliders();
        }
        );

        $btnScale.after($wrp);
    }

    static getSelSummonSpellLevel(mon) {
        if (mon.summonedBySpellLevel == null)
            return;

        return e_({
            tag: "select",
            clazz: "input-xs form-control form-control--minimal w-initial inline-block ve-popwindow__hidden",
            name: "mon__sel-summon-spell-level",
            children: [e_({
                tag: "option",
                val: "-1",
                text: "\u2014"
            }), ...[...new Array(VeCt.SPELL_LEVEL_MAX + 1 - mon.summonedBySpellLevel)].map((_,i)=>e_({
                tag: "option",
                val: i + mon.summonedBySpellLevel,
                text: i + mon.summonedBySpellLevel,
            })), ],
        });
    }

    static getSelSummonClassLevel(mon) {
        if (mon.summonedByClass == null)
            return;

        return e_({
            tag: "select",
            clazz: "input-xs form-control form-control--minimal w-initial inline-block ve-popwindow__hidden",
            name: "mon__sel-summon-class-level",
            children: [e_({
                tag: "option",
                val: "-1",
                text: "\u2014"
            }), ...[...new Array(VeCt.LEVEL_MAX)].map((_,i)=>e_({
                tag: "option",
                val: i + 1,
                text: i + 1,
            })), ],
        });
    }

    static getCompactRenderedStringSection(mon, renderer, title, key, depth) {
        if (!mon[key])
            return "";

        const noteKey = `${key}Note`;

        const toRender = key === "lairActions" || key === "regionalEffects" ? [{
            type: "entries",
            entries: mon[key]
        }] : mon[key];

        const ptHeader = mon[key] ? Renderer.monster.getSectionIntro(mon, {
            prop: key
        }) : "";

        return `<tr class="mon__stat-header-underline"><td colspan="6"><h3 class="mon__sect-header-inner">${title}${mon[noteKey] ? ` (<span class="ve-small">${mon[noteKey]}</span>)` : ""}</h3></td></tr>
		<tr class="text"><td colspan="6">
		${key === "legendary" && mon.legendary ? `<p>${Renderer.monster.getLegendaryActionIntro(mon)}</p>` : ""}
		${ptHeader ? `<p>${ptHeader}</p>` : ""}
		${toRender.map(it=>it.rendered || renderer.render(it, depth)).join("")}
		</td></tr>`;
    }

    static getTypeAlignmentPart(mon) {
        const typeObj = Parser.monTypeToFullObj(mon.type);

        return `${mon.level ? `${Parser.getOrdinalForm(mon.level)}-level ` : ""}${typeObj.asTextSidekick ? `${typeObj.asTextSidekick}; ` : ""}${Renderer.utils.getRenderedSize(mon.size)}${mon.sizeNote ? ` ${mon.sizeNote}` : ""} ${typeObj.asText}${mon.alignment ? `, ${mon.alignmentPrefix ? Renderer.get().render(mon.alignmentPrefix) : ""}${Parser.alignmentListToFull(mon.alignment).toTitleCase()}` : ""}`;
    }
    static getSavesPart(mon) {
        return `${Object.keys(mon.save || {}).sort(SortUtil.ascSortAtts).map(s=>Renderer.monster.getSave(Renderer.get(), s, mon.save[s])).join(", ")}`;
    }
    static getSensesPart(mon) {
        return `${mon.senses ? `${Renderer.monster.getRenderedSenses(mon.senses)}, ` : ""}passive Perception ${mon.passive || "\u2014"}`;
    }

    static getRenderWithPlugins({renderer, mon, fn}) {
        return renderer.withPlugin({
            pluginTypes: ["dice", ],
            fnPlugin: ()=>{
                if (mon.summonedBySpellLevel == null && mon._summonedByClass_level == null)
                    return null;
                if (mon._summonedByClass_level) {
                    return {
                        additionalData: {
                            "data-summoned-by-class-level": mon._summonedByClass_level,
                        },
                    };
                }
                return {
                    additionalData: {
                        "data-summoned-by-spell-level": mon._summonedBySpell_level ?? mon.summonedBySpellLevel,
                    },
                };
            }
            ,
            fn,
        });
    }

    static getCompactRenderedString(mon, opts) {
        const renderer = Renderer.get();
        return Renderer.monster.getRenderWithPlugins({
            renderer,
            mon,
            fn: ()=>Renderer.monster._getCompactRenderedString(mon, renderer, opts),
        });
    }

    static _getCompactRenderedString(mon, renderer, opts) {
        opts = opts || {};
        if (opts.isCompact === undefined)
            opts.isCompact = true;

        const renderStack = [];
        const legGroup = DataUtil.monster.getMetaGroup(mon);
        const hasToken = mon.tokenUrl || mon.hasToken;
        const extraThClasses = !opts.isCompact && hasToken ? ["mon__name--token"] : null;

        const isShowCrScaler = ScaleCreature.isCrInScaleRange(mon);
        const isShowSpellLevelScaler = opts.isShowScalers && !isShowCrScaler && mon.summonedBySpellLevel != null;
        const isShowClassLevelScaler = opts.isShowScalers && !isShowSpellLevelScaler && mon.summonedByClass != null;

        const fnGetSpellTraits = Renderer.monster.getSpellcastingRenderedTraits.bind(Renderer.monster, renderer);
        const allTraits = Renderer.monster.getOrderedTraits(mon, {
            fnGetSpellTraits
        });
        const allActions = Renderer.monster.getOrderedActions(mon, {
            fnGetSpellTraits
        });
        const allBonusActions = Renderer.monster.getOrderedBonusActions(mon, {
            fnGetSpellTraits
        });
        const allReactions = Renderer.monster.getOrderedReactions(mon, {
            fnGetSpellTraits
        });

        let ptCrSpellLevel = `<td colspan="2">\u2014</td>`;
        if (isShowSpellLevelScaler || isShowClassLevelScaler) {
            const selHtml = isShowSpellLevelScaler ? Renderer.monster.getSelSummonSpellLevel(mon)?.outerHTML : Renderer.monster.getSelSummonClassLevel(mon)?.outerHTML;
            ptCrSpellLevel = `<td colspan="2">${selHtml || ""}</td>`;
        } else if (isShowCrScaler) {
            ptCrSpellLevel = `<td colspan="2">
				${Parser.monCrToFull(mon.cr, {
                isMythic: !!mon.mythic
            })}
				${opts.isShowScalers && !opts.isScaledCr && Parser.isValidCr(mon.cr ? (mon.cr.cr || mon.cr) : null) ? `
				<button title="Scale Creature By CR (Highly Experimental)" class="mon__btn-scale-cr btn btn-xs btn-default">
					<span class="glyphicon glyphicon-signal"></span>
				</button>
				` : ""}
				${opts.isScaledCr ? `
				<button title="Reset CR Scaling" class="mon__btn-reset-cr btn btn-xs btn-default">
					<span class="glyphicon glyphicon-refresh"></span>
				</button>
				` : ""}
			</td>`;
        }

        renderStack.push(`
			${Renderer.utils.getExcludedTr({
            entity: mon,
            dataProp: "monster",
            page: opts.page || UrlUtil.PG_BESTIARY
        })}
			${Renderer.utils.getNameTr(mon, {
            page: opts.page || UrlUtil.PG_BESTIARY,
            extensionData: {
                _scaledCr: mon._scaledCr,
                _scaledSpellSummonLevel: mon._scaledSpellSummonLevel,
                _scaledClassSummonLevel: mon._scaledClassSummonLevel
            },
            extraThClasses,
            isEmbeddedEntity: opts.isEmbeddedEntity
        })}
			<tr><td colspan="6"><i>${Renderer.monster.getTypeAlignmentPart(mon)}</i></td></tr>
			<tr><td colspan="6"><div class="border"></div></td></tr>
			<tr><td colspan="6">
				<table class="w-100 summary-noback relative table-layout-fixed my-1">
					<tr>
						<th colspan="2">Armor Class</th>
						<th colspan="2">Hit Points</th>
						<th colspan="2">Speed</th>
						<th colspan="2">${isShowSpellLevelScaler ? "Spell Level" : isShowClassLevelScaler ? "Class Level" : "Challenge"}</th>
						${mon.pbNote || Parser.crToNumber(mon.cr) < VeCt.CR_CUSTOM ? `<th colspan="1" title="Proficiency Bonus">PB</th>` : ""}
						${hasToken && !opts.isCompact ? `<th colspan="1"></th>` : ""}
					</tr>
					<tr>
						<td colspan="2">${Parser.acToFull(mon.ac)}</td>
						<td colspan="2">${Renderer.monster.getRenderedHp(mon.hp)}</td>
						<td colspan="2">${Parser.getSpeedString(mon)}</td>
						${ptCrSpellLevel}
						${mon.pbNote || Parser.crToNumber(mon.cr) < VeCt.CR_CUSTOM ? `<td colspan="1">${mon.pbNote ?? UiUtil.intToBonus(Parser.crToPb(mon.cr), {
            isPretty: true
        })}</td>` : ""}
						${hasToken && !opts.isCompact ? `<td colspan="1"></td>` : ""}
					</tr>
				</table>
			</td></tr>
			<tr><td colspan="6"><div class="border mb-1"></div></td></tr>
			${Renderer.monster.getRenderedAbilityScores(mon)}
			<tr><td colspan="6"><div class="border mt-1"></div></td></tr>
			<tr><td colspan="6">
				<div class="rd__compact-stat mt-2">
					${mon.resource ? mon.resource.map(res=>`<p><b>${res.name}</b> ${Renderer.monster.getRenderedResource(res)}</p>`).join("") : ""}
					${mon.save ? `<p><b>Saving Throws</b> ${Renderer.monster.getSavesPart(mon)}</p>` : ""}
					${mon.skill ? `<p><b>Skills</b> ${Renderer.monster.getSkillsString(renderer, mon)}</p>` : ""}
					${mon.vulnerable ? `<p><b>Damage Vuln.</b> ${Parser.getFullImmRes(mon.vulnerable)}</p>` : ""}
					${mon.resist ? `<p><b>Damage Res.</b> ${Parser.getFullImmRes(mon.resist)}</p>` : ""}
					${mon.immune ? `<p><b>Damage Imm.</b> ${Parser.getFullImmRes(mon.immune)}</p>` : ""}
					${mon.conditionImmune ? `<p><b>Condition Imm.</b> ${Parser.getFullCondImm(mon.conditionImmune)}</p>` : ""}
					${opts.isHideSenses ? "" : `<p><b>Senses</b> ${Renderer.monster.getSensesPart(mon)}</p>`}
					${opts.isHideLanguages ? "" : `<p><b>Languages</b> ${Renderer.monster.getRenderedLanguages(mon.languages)}</p>`}
				</div>
			</td></tr>
			${allTraits ? `<tr><td colspan="6"><div class="border"></div></td></tr>
			<tr class="text"><td colspan="6">
			${allTraits.map(it=>it.rendered || renderer.render(it, 2)).join("")}
			</td></tr>` : ""}
			${Renderer.monster.getCompactRenderedStringSection({
            ...mon,
            action: allActions
        }, renderer, "Actions", "action", 2)}
			${Renderer.monster.getCompactRenderedStringSection({
            ...mon,
            bonus: allBonusActions
        }, renderer, "Bonus Actions", "bonus", 2)}
			${Renderer.monster.getCompactRenderedStringSection({
            ...mon,
            reaction: allReactions
        }, renderer, "Reactions", "reaction", 2)}
			${Renderer.monster.getCompactRenderedStringSection(mon, renderer, "Legendary Actions", "legendary", 2)}
			${Renderer.monster.getCompactRenderedStringSection(mon, renderer, "Mythic Actions", "mythic", 2)}
			${legGroup && legGroup.lairActions ? Renderer.monster.getCompactRenderedStringSection(legGroup, renderer, "Lair Actions", "lairActions", 1) : ""}
			${legGroup && legGroup.regionalEffects ? Renderer.monster.getCompactRenderedStringSection(legGroup, renderer, "Regional Effects", "regionalEffects", 1) : ""}
			${mon.variant || (mon.dragonCastingColor && !mon.spellcasting) || mon.summonedBySpell ? `
			<tr class="text"><td colspan="6">
			${mon.variant ? mon.variant.map(it=>it.rendered || renderer.render(it)).join("") : ""}
			${mon.dragonCastingColor ? Renderer.monster.dragonCasterVariant.getHtml(mon, {
            renderer
        }) : ""}
			${mon.footer ? renderer.render({
            entries: mon.footer
        }) : ""}
			${mon.summonedBySpell ? `<div><b>Summoned By:</b> ${renderer.render(`{@spell ${mon.summonedBySpell}}`)}<div>` : ""}
			</td></tr>
			` : ""}
		`);

        return renderStack.join("");
    }

    static _getFormulaMax(formula) {
        return Renderer.dice.parseRandomise2(`dmax(${formula})`);
    }

    static getRenderedHp(hp, isPlainText) {
        if (hp.special != null)
            return isPlainText ? Renderer.stripTags(hp.special) : Renderer.get().render(hp.special);

        if (/^\d+d1$/.exec(hp.formula)) {
            return hp.average;
        }

        if (isPlainText)
            return `${hp.average} (${hp.formula})`;

        const maxVal = Renderer.monster._getFormulaMax(hp.formula);
        const maxStr = maxVal ? `Maximum: ${maxVal}` : "";
        return `${maxStr ? `<span title="${maxStr}" class="help-subtle">` : ""}${hp.average}${maxStr ? "</span>" : ""} ${Renderer.get().render(`({@dice ${hp.formula}|${hp.formula}|Hit Points})`)}`;
    }

    static getRenderedResource(res, isPlainText) {
        if (!res.formula)
            return `${res.value}`;

        if (isPlainText)
            return `${res.value} (${res.formula})`;

        const maxVal = Renderer.monster._getFormulaMax(res.formula);
        const maxStr = maxVal ? `Maximum: ${maxVal}` : "";
        return `${maxStr ? `<span title="${maxStr}" class="help-subtle">` : ""}${res.value}${maxStr ? "</span>" : ""} ${Renderer.get().render(`({@dice ${res.formula}|${res.formula}|${res.name}})`)}`;
    }

    static getSafeAbilityScore(mon, abil, {isDefaultTen=false}={}) {
        if (!mon || abil == null)
            return isDefaultTen ? 10 : 0;
        if (mon[abil] == null)
            return isDefaultTen ? 10 : 0;
        return typeof mon[abil] === "number" ? mon[abil] : (isDefaultTen ? 10 : 0);
    }

    static getRenderedAbilityScores(mon) {
        const byAbil = {};
        const byValue = {};

        Parser.ABIL_ABVS.forEach(ab=>{
            if (mon[ab] == null || typeof mon[ab] === "number")
                return;

            const meta = {
                abil: ab,
                value: mon[ab].special
            };
            byAbil[meta.abil] = meta;
            meta.family = (byValue[meta.value] = byValue[meta.value] || []);
            meta.family.push(meta);
        }
        );

        const seenAbs = new Set();
        const ptSpecial = Parser.ABIL_ABVS.map(ab=>{
            const meta = byAbil[ab];
            if (!meta)
                return null;
            if (seenAbs.has(meta.abil))
                return null;
            meta.family.forEach(meta=>seenAbs.add(meta.abil));
            return `<b>${meta.family.map(meta=>meta.abil.toUpperCase()).join(", ")}</b> ${meta.value}`;
        }
        ).filter(Boolean).map(r=>`<tr><td colspan="6">${r}</td></tr>`).join("");

        if (Parser.ABIL_ABVS.every(ab=>mon[ab] != null && typeof mon[ab] !== "number"))
            return ptSpecial;

        const absRemaining = Parser.ABIL_ABVS.filter(ab=>!seenAbs.has(ab));

        return `<tr>
			${absRemaining.map(ab=>`<th class="col-2 ve-text-center bold">${ab.toUpperCase()}</th>`).join("")}
		</tr>
		<tr>
			${absRemaining.map(ab=>`<td class="ve-text-center">${Renderer.utils.getAbilityRoller(mon, ab)}</td>`).join("")}
		</tr>`;
    }

    static getSpellcastingRenderedTraits(renderer, mon, displayAsProp="trait") {
        const out = [];
        (mon.spellcasting || []).filter(it=>(it.displayAs || "trait") === displayAsProp).forEach(entry=>{
            entry.type = entry.type || "spellcasting";
            const renderStack = [];
            renderer.recursiveRender(entry, renderStack, {
                depth: 2
            });
            const rendered = renderStack.join("");
            if (!rendered.length)
                return;
            out.push({
                name: entry.name,
                rendered
            });
        }
        );
        return out;
    }

    static getOrderedTraits(mon, {fnGetSpellTraits}={}) {
        let traits = mon.trait ? MiscUtil.copyFast(mon.trait) : null;

        if (fnGetSpellTraits) {
            const spellTraits = fnGetSpellTraits(mon, "trait");
            if (spellTraits.length)
                traits = traits ? traits.concat(spellTraits) : spellTraits;
        }

        if (traits?.length)
            return traits.sort((a,b)=>SortUtil.monTraitSort(a, b));
        return null;
    }

    static getOrderedActions(mon, {fnGetSpellTraits}={}) {
        return Renderer.monster._getOrderedActionsBonusActions({
            mon,
            fnGetSpellTraits,
            prop: "action"
        });
    }
    static getOrderedBonusActions(mon, {fnGetSpellTraits}={}) {
        return Renderer.monster._getOrderedActionsBonusActions({
            mon,
            fnGetSpellTraits,
            prop: "bonus"
        });
    }
    static getOrderedReactions(mon, {fnGetSpellTraits}={}) {
        return Renderer.monster._getOrderedActionsBonusActions({
            mon,
            fnGetSpellTraits,
            prop: "reaction"
        });
    }

    static _getOrderedActionsBonusActions({mon, fnGetSpellTraits, prop}={}) {
        let actions = mon[prop] ? MiscUtil.copyFast(mon[prop]) : null;

        let spellActions;
        if (fnGetSpellTraits) {
            spellActions = fnGetSpellTraits(mon, prop);
        }

        if (!spellActions?.length && !actions?.length)
            return null;
        if (!actions?.length)
            return spellActions;
        if (!spellActions?.length)
            return actions;

        const ixLastAttack = actions.findLastIndex(it=>it.entries && it.entries.length && typeof it.entries[0] === "string" && it.entries[0].includes(`{@atk `));
        const ixNext = actions.findIndex((act,ix)=>ix > ixLastAttack && act.name && SortUtil.ascSortLower(act.name, "Spellcasting") >= 0);
        if (~ixNext)
            actions.splice(ixNext, 0, ...spellActions);
        else
            actions.push(...spellActions);
        return actions;
    }

    static getSkillsString(renderer, mon) {
        if (!mon.skill)
            return "";

        function doSortMapJoinSkillKeys(obj, keys, joinWithOr) {
            const toJoin = keys.sort(SortUtil.ascSort).map(s=>`<span data-mon-skill="${s.toTitleCase()}|${obj[s]}">${renderer.render(`{@skill ${s.toTitleCase()}}`)} ${Renderer.get().render(`{@skillCheck ${s.replace(/ /g, "_")} ${obj[s]}}`)}</span>`);
            return joinWithOr ? toJoin.joinConjunct(", ", " or ") : toJoin.join(", ");
        }

        const skills = doSortMapJoinSkillKeys(mon.skill, Object.keys(mon.skill).filter(k=>k !== "other" && k !== "special"));
        if (mon.skill.other || mon.skill.special) {
            const others = mon.skill.other && mon.skill.other.map(it=>{
                if (it.oneOf) {
                    return `plus one of the following: ${doSortMapJoinSkillKeys(it.oneOf, Object.keys(it.oneOf), true)}`;
                }
                throw new Error(`Unhandled monster "other" skill properties!`);
            }
            );
            const special = mon.skill.special && Renderer.get().render(mon.skill.special);
            return [skills, others, special].filter(Boolean).join(", ");
        }
        return skills;
    }

    static getTokenUrl(mon) {
        return mon.tokenUrl || UrlUtil.link(`${Renderer.get().baseMediaUrls["img"] || Renderer.get().baseUrl}img/${Parser.sourceJsonToAbv(mon.source)}/${Parser.nameToTokenName(mon.name)}.png`);
    }

    static postProcessFluff(mon, fluff) {
        const cpy = MiscUtil.copyFast(fluff);

        const thisGroup = DataUtil.monster.getMetaGroup(mon);
        const handleGroupProp = (prop,name)=>{
            if (thisGroup && thisGroup[prop]) {
                cpy.entries = cpy.entries || [];
                cpy.entries.push({
                    type: "entries",
                    entries: [{
                        type: "entries",
                        name,
                        entries: MiscUtil.copyFast(thisGroup[prop]),
                    }, ],
                });
            }
        }
        ;

        handleGroupProp("lairActions", "Lair Actions");
        handleGroupProp("regionalEffects", "Regional Effects");
        handleGroupProp("mythicEncounter", `${mon.name} as a Mythic Encounter`);

        return cpy;
    }

    static _FN_TAG_SENSES = null;
    static _SENSE_TAG_METAS = null;
    static getRenderedSenses(senses, isPlainText) {
        if (typeof senses === "string")
            senses = [senses];
        if (isPlainText)
            return senses.join(", ");

        if (!Renderer.monster._FN_TAG_SENSES) {
            Renderer.monster._SENSE_TAG_METAS = [...MiscUtil.copyFast(Parser.SENSES), ...(PrereleaseUtil.getBrewProcessedFromCache("sense") || []), ...(BrewUtil2.getBrewProcessedFromCache("sense") || []), ];
            const seenNames = new Set();
            Renderer.monster._SENSE_TAG_METAS.filter(it=>{
                if (seenNames.has(it.name.toLowerCase()))
                    return false;
                seenNames.add(it.name.toLowerCase());
                return true;
            }
            ).forEach(it=>it._re = new RegExp(`\\b(?<sense>${it.name.escapeRegexp()})\\b`,"gi"));
            Renderer.monster._FN_TAG_SENSES = str=>{
                Renderer.monster._SENSE_TAG_METAS.forEach(({name, source, _re})=>str = str.replace(_re, (...m)=>`{@sense ${m.last().sense}|${source}}`));
                return str;
            }
            ;
        }

        const senseStr = senses.map(str=>{
            const tagSplit = Renderer.splitByTags(str);
            str = "";
            const len = tagSplit.length;
            for (let i = 0; i < len; ++i) {
                const s = tagSplit[i];

                if (!s)
                    continue;

                if (s.startsWith("{@")) {
                    str += s;
                    continue;
                }

                str += Renderer.monster._FN_TAG_SENSES(s);
            }
            return str;
        }
        ).join(", ").replace(/(^| |\()(blind|blinded)(\)| |$)/gi, (...m)=>`${m[1]}{@condition blinded||${m[2]}}${m[3]}`);

        return Renderer.get().render(senseStr);
    }

    static getRenderedLanguages(languages) {
        if (typeof languages === "string")
            languages = [languages];
        return languages ? languages.map(it=>Renderer.get().render(it)).join(", ") : "\u2014";
    }

    static initParsed(mon) {
        mon._pTypes = mon._pTypes || Parser.monTypeToFullObj(mon.type);
        if (!mon._pCr) {
            if (Parser.crToNumber(mon.cr) === VeCt.CR_CUSTOM)
                mon._pCr = "Special";
            else if (Parser.crToNumber(mon.cr) === VeCt.CR_UNKNOWN)
                mon._pCr = "Unknown";
            else
                mon._pCr = mon.cr == null ? "\u2014" : (mon.cr.cr || mon.cr);
        }
        if (!mon._fCr) {
            mon._fCr = [mon._pCr];
            if (mon.cr) {
                if (mon.cr.lair)
                    mon._fCr.push(mon.cr.lair);
                if (mon.cr.coven)
                    mon._fCr.push(mon.cr.coven);
            }
        }
    }

    static updateParsed(mon) {
        delete mon._pTypes;
        delete mon._pCr;
        delete mon._fCr;
        Renderer.monster.initParsed(mon);
    }

    static getRenderedVariants(mon, {renderer=null}={}) {
        renderer = renderer || Renderer.get();
        const dragonVariant = Renderer.monster.dragonCasterVariant.getHtml(mon, {
            renderer
        });
        const variants = mon.variant;
        if (!variants && !dragonVariant)
            return null;

        const rStack = [];
        (variants || []).forEach(v=>renderer.recursiveRender(v, rStack));
        if (dragonVariant)
            rStack.push(dragonVariant);
        return rStack.join("");
    }

    static getRenderedEnvironment(envs) {
        return (envs || []).sort(SortUtil.ascSortLower).map(it=>it.toTitleCase()).join(", ");
    }

    static getRenderedAltArtEntry(meta, {isPlainText=false}={}) {
        return `${isPlainText ? "" : `<div>`}${meta.displayName || meta.name}; ${isPlainText ? "" : `<span title="${Parser.sourceJsonToFull(meta.source)}">`}${Parser.sourceJsonToAbv(meta.source)}${Renderer.utils.isDisplayPage(meta.page) ? ` p${meta.page}` : ""}${isPlainText ? "" : `</span></div>`}`;
    }

    static pGetFluff(mon) {
        return Renderer.utils.pGetFluff({
            entity: mon,
            pFnPostProcess: Renderer.monster.postProcessFluff.bind(null, mon),
            fluffBaseUrl: `data/bestiary/`,
            fluffProp: "monsterFluff",
        });
    }

    static getCustomHashId(mon) {
        if (!mon._isScaledCr && !mon._isScaledSpellSummon && !mon._scaledClassSummonLevel)
            return null;

        const {name, source, _scaledCr: scaledCr, _scaledSpellSummonLevel: scaledSpellSummonLevel, _scaledClassSummonLevel: scaledClassSummonLevel, } = mon;

        return [name, source, scaledCr ?? "", scaledSpellSummonLevel ?? "", scaledClassSummonLevel ?? "", ].join("__").toLowerCase();
    }

    static getUnpackedCustomHashId(customHashId) {
        if (!customHashId)
            return null;

        const [,,scaledCr,scaledSpellSummonLevel,scaledClassSummonLevel] = customHashId.split("__").map(it=>it.trim());

        if (!scaledCr && !scaledSpellSummonLevel && !scaledClassSummonLevel)
            return null;

        return {
            _scaledCr: scaledCr ? Number(scaledCr) : null,
            _scaledSpellSummonLevel: scaledSpellSummonLevel ? Number(scaledSpellSummonLevel) : null,
            _scaledClassSummonLevel: scaledClassSummonLevel ? Number(scaledClassSummonLevel) : null,
            customHashId,
        };
    }

    static async pGetModifiedCreature(monRaw, customHashId) {
        if (!customHashId)
            return monRaw;
        const {_scaledCr, _scaledSpellSummonLevel, _scaledClassSummonLevel} = Renderer.monster.getUnpackedCustomHashId(customHashId);
        if (_scaledCr)
            return ScaleCreature.scale(monRaw, _scaledCr);
        if (_scaledSpellSummonLevel)
            return ScaleSpellSummonedCreature.scale(monRaw, _scaledSpellSummonLevel);
        if (_scaledClassSummonLevel)
            return ScaleClassSummonedCreature.scale(monRaw, _scaledClassSummonLevel);
        throw new Error(`Unhandled custom hash ID "${customHashId}"`);
    }

    static _bindListenersScale(mon, ele) {
        const page = UrlUtil.PG_BESTIARY;
        const source = mon.source;
        const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_BESTIARY](mon);

        const fnRender = Renderer.hover.getFnRenderCompact(page);

        const $content = $(ele);

        $content.find(".mon__btn-scale-cr").click(evt=>{
            evt.stopPropagation();
            const win = (evt.view || {}).window;

            const $btn = $(evt.target).closest("button");
            const initialCr = mon._originalCr != null ? mon._originalCr : mon.cr.cr || mon.cr;
            const lastCr = mon.cr.cr || mon.cr;

            Renderer.monster.getCrScaleTarget({
                win,
                $btnScale: $btn,
                initialCr: lastCr,
                isCompact: true,
                cbRender: async(targetCr)=>{
                    const original = await DataLoader.pCacheAndGet(page, source, hash);
                    const toRender = Parser.numberToCr(targetCr) === initialCr ? original : await ScaleCreature.scale(original, targetCr);

                    $content.empty().append(fnRender(toRender));

                    Renderer.monster._bindListenersScale(toRender, ele);
                }
                ,
            });
        }
        );

        $content.find(".mon__btn-reset-cr").click(async()=>{
            const toRender = await DataLoader.pCacheAndGet(page, source, hash);
            $content.empty().append(fnRender(toRender));

            Renderer.monster._bindListenersScale(toRender, ele);
        }
        );

        const $selSummonSpellLevel = $content.find(`[name="mon__sel-summon-spell-level"]`).change(async()=>{
            const original = await DataLoader.pCacheAndGet(page, source, hash);
            const spellLevel = Number($selSummonSpellLevel.val());

            const toRender = ~spellLevel ? await ScaleSpellSummonedCreature.scale(original, spellLevel) : original;

            $content.empty().append(fnRender(toRender));

            Renderer.monster._bindListenersScale(toRender, ele);
        }
        ).val(mon._summonedBySpell_level != null ? `${mon._summonedBySpell_level}` : "-1");

        const $selSummonClassLevel = $content.find(`[name="mon__sel-summon-class-level"]`).change(async()=>{
            const original = await DataLoader.pCacheAndGet(page, source, hash);
            const classLevel = Number($selSummonClassLevel.val());

            const toRender = ~classLevel ? await ScaleClassSummonedCreature.scale(original, classLevel) : original;

            $content.empty().append(fnRender(toRender));

            Renderer.monster._bindListenersScale(toRender, ele);
        }
        ).val(mon._summonedByClass_level != null ? `${mon._summonedByClass_level}` : "-1");
    }

    static bindListenersCompact(mon, ele) {
        Renderer.monster._bindListenersScale(mon, ele);
    }

    static hover = class {
        static bindFluffImageMouseover({mon, $ele}) {
            $ele.on("mouseover", evt=>this._pOnFluffImageMouseover({
                evt,
                mon,
                $ele
            }));
        }

        static async _pOnFluffImageMouseover({evt, mon, $ele}) {
            $ele.off("mouseover");

            const fluff = mon ? await Renderer.monster.pGetFluff(mon) : null;

            if (fluff?.images?.length)
                return this._pOnFluffImageMouseover_hasImage({
                    mon,
                    $ele,
                    fluff
                });
            return this._pOnFluffImageMouseover_noImage({
                mon,
                $ele
            });
        }

        static _pOnFluffImageMouseover_noImage({mon, $ele}) {
            const hoverMeta = this.getMakePredefinedFluffImageHoverNoImage({
                name: mon?.name
            });
            $ele.on("mouseover", evt=>hoverMeta.mouseOver(evt, $ele[0])).on("mousemove", evt=>hoverMeta.mouseMove(evt, $ele[0])).on("mouseleave", evt=>hoverMeta.mouseLeave(evt, $ele[0])).trigger("mouseover");
        }

        static _pOnFluffImageMouseover_hasImage({mon, $ele, fluff}) {
            const hoverMeta = this.getMakePredefinedFluffImageHoverHasImage({
                imageHref: fluff.images[0].href,
                name: mon.name
            });
            $ele.on("mouseover", evt=>hoverMeta.mouseOver(evt, $ele[0])).on("mousemove", evt=>hoverMeta.mouseMove(evt, $ele[0])).on("mouseleave", evt=>hoverMeta.mouseLeave(evt, $ele[0])).trigger("mouseover");
        }

        static getMakePredefinedFluffImageHoverNoImage({name}) {
            return Renderer.hover.getMakePredefinedHover({
                type: "entries",
                entries: [Renderer.utils.HTML_NO_IMAGES, ],
                data: {
                    hoverTitle: name ? `Image \u2014 ${name}` : "Image",
                },
            }, {
                isBookContent: true
            }, );
        }

        static getMakePredefinedFluffImageHoverHasImage({imageHref, name}) {
            return Renderer.hover.getMakePredefinedHover({
                type: "image",
                href: imageHref,
                data: {
                    hoverTitle: name ? `Image \u2014 ${name}` : "Image",
                },
            }, {
                isBookContent: true
            }, );
        }
    }
    ;
}
;
Renderer.monster.CHILD_PROPS_EXTENDED = [...Renderer.monster.CHILD_PROPS, "lairActions", "regionalEffects"];

Renderer.monster.CHILD_PROPS_EXTENDED.forEach(prop=>{
    const propFull = `monster${prop.uppercaseFirst()}`;
    Renderer[propFull] = {
        getCompactRenderedString(ent) {
            return Renderer.generic.getCompactRenderedString(ent);
        },
    };
}
);

Renderer.monsterAction.getWeaponLookupName = act=>{
    return (act.name || "").replace(/\(.*\)$/, "").trim().toLowerCase();
}
;

Renderer.legendaryGroup = class {
    static getCompactRenderedString(legGroup, opts) {
        opts = opts || {};

        const ent = Renderer.legendaryGroup.getSummaryEntry(legGroup);
        if (!ent)
            return "";

        return `
		${Renderer.utils.getNameTr(legGroup, {
            isEmbeddedEntity: opts.isEmbeddedEntity
        })}
		<tr class="text"><td colspan="6">
		${Renderer.get().setFirstSection(true).render(ent)}
		</td></tr>
		${Renderer.utils.getPageTr(legGroup)}`;
    }

    static getSummaryEntry(legGroup) {
        if (!legGroup || (!legGroup.lairActions && !legGroup.regionalEffects && !legGroup.mythicEncounter))
            return null;

        return {
            type: "section",
            entries: [legGroup.lairActions ? {
                name: "Lair Actions",
                type: "entries",
                entries: legGroup.lairActions
            } : null, legGroup.regionalEffects ? {
                name: "Regional Effects",
                type: "entries",
                entries: legGroup.regionalEffects
            } : null, legGroup.mythicEncounter ? {
                name: "As a Mythic Encounter",
                type: "entries",
                entries: legGroup.mythicEncounter
            } : null, ].filter(Boolean),
        };
    }
}
;

Renderer.item = class {
    static _sortProperties(a, b) {
        return SortUtil.ascSort(Renderer.item.getProperty(a, {
            isIgnoreMissing: true
        })?.name || "", Renderer.item.getProperty(b, {
            isIgnoreMissing: true
        })?.name || "");
    }

    static _getPropertiesText(item, {renderer=null}={}) {
        renderer = renderer || Renderer.get();

        if (!item.property) {
            const parts = [];
            if (item.dmg2)
                parts.push(`alt. ${Renderer.item._renderDamage(item.dmg2, {
                    renderer
                })}`);
            if (item.range)
                parts.push(`range ${item.range} ft.`);
            return `${item.dmg1 && parts.length ? " - " : ""}${parts.join(", ")}`;
        }

        let renderedDmg2 = false;

        const renderedProperties = item.property.sort(Renderer.item._sortProperties).map(p=>{
            const pFull = Renderer.item.getProperty(p);

            if (pFull.template) {
                const toRender = Renderer.utils.applyTemplate(item, pFull.template, {
                    fnPreApply: (fullMatch,variablePath)=>{
                        if (variablePath === "item.dmg2")
                            renderedDmg2 = true;
                    }
                    ,
                    mapCustom: {
                        "prop_name": pFull.name
                    },
                }, );

                return renderer.render(toRender);
            } else
                return pFull.name;
        }
        );

        if (!renderedDmg2 && item.dmg2)
            renderedProperties.unshift(`alt. ${Renderer.item._renderDamage(item.dmg2, {
                renderer
            })}`);

        return `${item.dmg1 && renderedProperties.length ? " - " : ""}${renderedProperties.join(", ")}`;
    }

    static _getTaggedDamage(dmg, {renderer=null}={}) {
        if (!dmg)
            return "";

        renderer = renderer || Renderer.get();

        Renderer.stripTags(dmg.trim());

        return renderer.render(`{@damage ${dmg}}`);
    }

    static _renderDamage(dmg, {renderer=null}={}) {
        renderer = renderer || Renderer.get();
        return renderer.render(Renderer.item._getTaggedDamage(dmg, {
            renderer
        }));
    }

    static getDamageAndPropertiesText(item, {renderer=null}={}) {
        renderer = renderer || Renderer.get();

        const damagePartsPre = [];
        const damageParts = [];

        if (item.mastery)
            damagePartsPre.push(`Mastery: ${item.mastery.map(it=>renderer.render(`{@itemMastery ${it}}`)).join(", ")}`);

        if (item.ac != null) {
            const prefix = item.type === "S" ? "+" : "";
            const suffix = (item.type === "LA" || item.bardingType === "LA") || ((item.type === "MA" || item.bardingType === "MA") && item.dexterityMax === null) ? " + Dex" : (item.type === "MA" || item.bardingType === "MA") ? ` + Dex (max ${item.dexterityMax ?? 2})` : "";
            damageParts.push(`AC ${prefix}${item.ac}${suffix}`);
        }
        if (item.acSpecial != null)
            damageParts.push(item.ac != null ? item.acSpecial : `AC ${item.acSpecial}`);

        if (item.dmg1)
            damageParts.push(Renderer.item._renderDamage(item.dmg1, {
                renderer
            }));

        if (item.speed != null)
            damageParts.push(`Speed: ${item.speed}`);
        if (item.carryingCapacity)
            damageParts.push(`Carrying Capacity: ${item.carryingCapacity} lb.`);

        if (item.vehSpeed || item.capCargo || item.capPassenger || item.crew || item.crewMin || item.crewMax || item.vehAc || item.vehHp || item.vehDmgThresh || item.travelCost || item.shippingCost) {
            const vehPartUpper = item.vehSpeed ? `Speed: ${Parser.numberToVulgar(item.vehSpeed)} mph` : null;

            const vehPartMiddle = item.capCargo || item.capPassenger ? `Carrying Capacity: ${[item.capCargo ? `${Parser.numberToFractional(item.capCargo)} ton${item.capCargo === 0 || item.capCargo > 1 ? "s" : ""} cargo` : null, item.capPassenger ? `${item.capPassenger} passenger${item.capPassenger === 1 ? "" : "s"}` : null].filter(Boolean).join(", ")}` : null;

            const {travelCostFull, shippingCostFull} = Parser.itemVehicleCostsToFull(item);

            const vehPartLower = [item.crew ? `Crew ${item.crew}` : null, item.crewMin && item.crewMax ? `Crew ${item.crewMin}-${item.crewMax}` : null, item.vehAc ? `AC ${item.vehAc}` : null, item.vehHp ? `HP ${item.vehHp}${item.vehDmgThresh ? `, Damage Threshold ${item.vehDmgThresh}` : ""}` : null, ].filter(Boolean).join(", ");

            damageParts.push([vehPartUpper, vehPartMiddle,
            travelCostFull ? `Personal Travel Cost: ${travelCostFull} per mile per passenger` : null, shippingCostFull ? `Shipping Cost: ${shippingCostFull} per 100 pounds per mile` : null,
            vehPartLower, ].filter(Boolean).join(renderer.getLineBreak()));
        }

        const damage = [damagePartsPre.join(", "), damageParts.join(", "), ].filter(Boolean).join(renderer.getLineBreak());
        const damageType = item.dmgType ? Parser.dmgTypeToFull(item.dmgType) : "";
        const propertiesTxt = Renderer.item._getPropertiesText(item, {
            renderer
        });

        return [damage, damageType, propertiesTxt];
    }

    static getTypeRarityAndAttunementText(item) {
        const typeRarity = [item._typeHtml === "other" ? "" : item._typeHtml, (item.rarity && Renderer.item.doRenderRarity(item.rarity) ? item.rarity : ""), ].filter(Boolean).join(", ");

        return [item.reqAttune ? `${typeRarity} ${item._attunement}` : typeRarity, item._subTypeHtml || "", item.tier ? `${item.tier} tier` : "", ];
    }

    static getAttunementAndAttunementCatText(item, prop="reqAttune") {
        let attunement = null;
        let attunementCat = VeCt.STR_NO_ATTUNEMENT;
        if (item[prop] != null && item[prop] !== false) {
            if (item[prop] === true) {
                attunementCat = "Requires Attunement";
                attunement = "(requires attunement)";
            } else if (item[prop] === "optional") {
                attunementCat = "Attunement Optional";
                attunement = "(attunement optional)";
            } else if (item[prop].toLowerCase().startsWith("by")) {
                attunementCat = "Requires Attunement By...";
                attunement = `(requires attunement ${Renderer.get().render(item[prop])})`;
            } else {
                attunementCat = "Requires Attunement";
                attunement = `(requires attunement ${Renderer.get().render(item[prop])})`;
            }
        }
        return [attunement, attunementCat];
    }

    static getHtmlAndTextTypes(item) {
        const typeHtml = [];
        const typeListText = [];
        const subTypeHtml = [];

        let showingBase = false;
        if (item.wondrous) {
            typeHtml.push(`wondrous item${item.tattoo ? ` (tattoo)` : ""}`);
            typeListText.push("wondrous item");
        }
        if (item.tattoo) {
            typeListText.push("tattoo");
        }
        if (item.staff) {
            typeHtml.push("staff");
            typeListText.push("staff");
        }
        if (item.ammo) {
            typeHtml.push(`ammunition`);
            typeListText.push("ammunition");
        }
        if (item.firearm) {
            subTypeHtml.push("firearm");
            typeListText.push("firearm");
        }
        if (item.age) {
            subTypeHtml.push(item.age);
            typeListText.push(item.age);
        }
        if (item.weaponCategory) {
            typeHtml.push(`weapon${item.baseItem ? ` (${Renderer.get().render(`{@item ${item.baseItem}}`)})` : ""}`);
            subTypeHtml.push(`${item.weaponCategory} weapon`);
            typeListText.push(`${item.weaponCategory} weapon`);
            showingBase = true;
        }
        if (item.staff && (item.type !== "M" && item.typeAlt !== "M")) {
            subTypeHtml.push("melee weapon");
            typeListText.push("melee weapon");
        }
        if (item.type)
            Renderer.item._getHtmlAndTextTypes_type({
                type: item.type,
                typeHtml,
                typeListText,
                subTypeHtml,
                showingBase,
                item
            });
        if (item.typeAlt)
            Renderer.item._getHtmlAndTextTypes_type({
                type: item.typeAlt,
                typeHtml,
                typeListText,
                subTypeHtml,
                showingBase,
                item
            });
        if (item.poison) {
            typeHtml.push(`poison${item.poisonTypes ? ` (${item.poisonTypes.joinConjunct(", ", " or ")})` : ""}`);
            typeListText.push("poison");
        }
        return [typeListText, typeHtml.join(", "), subTypeHtml.join(", ")];
    }

    static _getHtmlAndTextTypes_type({type, typeHtml, typeListText, subTypeHtml, showingBase, item}) {
        const fullType = Renderer.item.getItemTypeName(type);

        const isSub = (typeListText.some(it=>it.includes("weapon")) && fullType.includes("weapon")) || (typeListText.some(it=>it.includes("armor")) && fullType.includes("armor"));

        if (!showingBase && !!item.baseItem)
            (isSub ? subTypeHtml : typeHtml).push(`${fullType} (${Renderer.get().render(`{@item ${item.baseItem}}`)})`);
        else if (type === "S")
            (isSub ? subTypeHtml : typeHtml).push(Renderer.get().render(`armor ({@item shield|phb})`));
        else
            (isSub ? subTypeHtml : typeHtml).push(fullType);

        typeListText.push(fullType);
    }

    static _GET_RENDERED_ENTRIES_WALKER = null;

    static getRenderedEntries(item, {isCompact=false, wrappedTypeAllowlist=null}={}) {
        const renderer = Renderer.get();

        Renderer.item._GET_RENDERED_ENTRIES_WALKER = Renderer.item._GET_RENDERED_ENTRIES_WALKER || MiscUtil.getWalker({
            keyBlocklist: new Set([...MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST, "data", ]),
        });

        const handlersName = {
            string: (str)=>Renderer.item._getRenderedEntries_handlerConvertNamesToItalics.bind(Renderer.item, item, item.name)(str),
        };

        const handlersVariantName = item._variantName == null ? null : {
            string: (str)=>Renderer.item._getRenderedEntries_handlerConvertNamesToItalics.bind(Renderer.item, item, item._variantName)(str),
        };

        const renderStack = [];
        if (item._fullEntries || item.entries?.length) {
            const entry = MiscUtil.copyFast({
                type: "entries",
                entries: item._fullEntries || item.entries
            });
            let procEntry = Renderer.item._GET_RENDERED_ENTRIES_WALKER.walk(entry, handlersName);
            if (handlersVariantName)
                procEntry = Renderer.item._GET_RENDERED_ENTRIES_WALKER.walk(entry, handlersVariantName);
            if (wrappedTypeAllowlist)
                procEntry.entries = procEntry.entries.filter(it=>!it?.data?.[VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG] || wrappedTypeAllowlist.has(it?.data?.[VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]));
            renderer.recursiveRender(procEntry, renderStack, {
                depth: 1
            });
        }

        if (item._fullAdditionalEntries || item.additionalEntries) {
            const additionEntries = MiscUtil.copyFast({
                type: "entries",
                entries: item._fullAdditionalEntries || item.additionalEntries
            });
            let procAdditionEntries = Renderer.item._GET_RENDERED_ENTRIES_WALKER.walk(additionEntries, handlersName);
            if (handlersVariantName)
                procAdditionEntries = Renderer.item._GET_RENDERED_ENTRIES_WALKER.walk(additionEntries, handlersVariantName);
            if (wrappedTypeAllowlist)
                procAdditionEntries.entries = procAdditionEntries.entries.filter(it=>!it?.data?.[VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG] || wrappedTypeAllowlist.has(it?.data?.[VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]));
            renderer.recursiveRender(procAdditionEntries, renderStack, {
                depth: 1
            });
        }

        if (!isCompact && item.lootTables) {
            renderStack.push(`<div><span class="bold">Found On: </span>${item.lootTables.sort(SortUtil.ascSortLower).map(tbl=>renderer.render(`{@table ${tbl}}`)).join(", ")}</div>`);
        }

        return renderStack.join("").trim();
    }

    static _getRenderedEntries_handlerConvertNamesToItalics(item, baseName, str) {
        if (item._fIsMundane)
            return str;

        const stack = [];
        let depth = 0;

        const tgtLen = baseName.length;
        const tgtName = item.sentient ? baseName : baseName.toLowerCase();

        const tgtNamePlural = tgtName.toPlural();
        const tgtLenPlural = tgtNamePlural.length;

        const tgtNameNoBraces = tgtName.replace(/ \(.*$/, "");
        const tgtLenNoBraces = tgtNameNoBraces.length;

        const len = str.length;
        for (let i = 0; i < len; ++i) {
            const c = str[i];

            switch (c) {
            case "{":
                {
                    if (str[i + 1] === "@")
                        depth++;
                    stack.push(c);
                    break;
                }
            case "}":
                {
                    if (depth)
                        depth--;
                    stack.push(c);
                    break;
                }
            default:
                stack.push(c);
                break;
            }

            if (depth)
                continue;

            if (stack.slice(-tgtLen).join("")[item.sentient ? "toString" : "toLowerCase"]() === tgtName) {
                stack.splice(stack.length - tgtLen, tgtLen, `{@i ${stack.slice(-tgtLen).join("")}}`);
            } else if (stack.slice(-tgtLenPlural).join("")[item.sentient ? "toString" : "toLowerCase"]() === tgtNamePlural) {
                stack.splice(stack.length - tgtLenPlural, tgtLenPlural, `{@i ${stack.slice(-tgtLenPlural).join("")}}`);
            } else if (stack.slice(-tgtLenNoBraces).join("")[item.sentient ? "toString" : "toLowerCase"]() === tgtNameNoBraces) {
                stack.splice(stack.length - tgtLenNoBraces, tgtLenNoBraces, `{@i ${stack.slice(-tgtLenNoBraces).join("")}}`);
            }
        }

        return stack.join("");
    }

    static getCompactRenderedString(item, opts) {
        opts = opts || {};

        const [damage,damageType,propertiesTxt] = Renderer.item.getDamageAndPropertiesText(item);
        const [typeRarityText,subTypeText,tierText] = Renderer.item.getTypeRarityAndAttunementText(item);

        return `
		${Renderer.utils.getExcludedTr({
            entity: item,
            dataProp: "item",
            page: UrlUtil.PG_ITEMS
        })}
		${Renderer.utils.getNameTr(item, {
            page: UrlUtil.PG_ITEMS,
            isEmbeddedEntity: opts.isEmbeddedEntity
        })}
		<tr><td class="rd-item__type-rarity-attunement" colspan="6">${Renderer.item.getTypeRarityAndAttunementHtml(typeRarityText, subTypeText, tierText)}</td></tr>
		<tr>
			<td colspan="2">${[Parser.itemValueToFullMultiCurrency(item), Parser.itemWeightToFull(item)].filter(Boolean).join(", ").uppercaseFirst()}</td>
			<td class="text-right" colspan="4">${damage} ${damageType} ${propertiesTxt}</td>
		</tr>
		${Renderer.item.hasEntries(item) ? `${Renderer.utils.getDividerTr()}<tr class="text"><td colspan="6" class="text">${Renderer.item.getRenderedEntries(item, {
            isCompact: true
        })}</td></tr>` : ""}`;
    }

    static hasEntries(item) {
        return item._fullAdditionalEntries?.length || item._fullEntries?.length || item.entries?.length;
    }

    static getTypeRarityAndAttunementHtml(typeRarityText, subTypeText, tierText) {
        return `<div class="ve-flex-col">
			${typeRarityText || tierText ? `<div class="split ${subTypeText ? "mb-1" : ""}">
				<div class="italic">${(typeRarityText || "").uppercaseFirst()}</div>
				<div class="no-wrap ${tierText ? `ml-2` : ""}">${(tierText || "").uppercaseFirst()}</div>
			</div>` : ""}
			${subTypeText ? `<div class="italic">${subTypeText.uppercaseFirst()}</div>` : ""}
		</div>`;
    }

    static _hiddenRarity = new Set(["none", "unknown", "unknown (magic)", "varies"]);
    static doRenderRarity(rarity) {
        return !Renderer.item._hiddenRarity.has(rarity);
    }

    static _propertyMap = {};
    static _addProperty(prt) {
        if (Renderer.item._propertyMap[prt.abbreviation])
            return;
        const cpy = MiscUtil.copyFast(prt);
        Renderer.item._propertyMap[prt.abbreviation] = prt.name ? cpy : {
            ...cpy,
            name: (prt.entries || prt.entriesTemplate)[0].name.toLowerCase(),
        };
    }

    static getProperty(abbv, {isIgnoreMissing=false}={}) {
        if (!isIgnoreMissing && !Renderer.item._propertyMap[abbv])
            throw new Error(`Item property ${abbv} not found. You probably meant to load the property reference first.`);
        return Renderer.item._propertyMap[abbv];
    }

    static _typeMap = {};
    static _addType(typ) {
        if (Renderer.item._typeMap[typ.abbreviation]?.entries || Renderer.item._typeMap[typ.abbreviation]?.entriesTemplate)
            return;
        const cpy = MiscUtil.copyFast(typ);

        Object.entries(Renderer.item._typeMap[typ.abbreviation] || {}).forEach(([k,v])=>{
            if (cpy[k])
                return;
            cpy[k] = v;
        }
        );

        cpy.name = cpy.name || (cpy.entries || cpy.entriesTemplate)[0].name.toLowerCase();

        Renderer.item._typeMap[typ.abbreviation] = cpy;
    }

    static getType(abbv) {
        if (!Renderer.item._typeMap[abbv])
            throw new Error(`Item type ${abbv} not found. You probably meant to load the type reference first.`);
        return Renderer.item._typeMap[abbv];
    }

    static entryMap = {};
    static _addEntry(ent) {
        if (Renderer.item.entryMap[ent.source]?.[ent.name])
            return;
        MiscUtil.set(Renderer.item.entryMap, ent.source, ent.name, ent);
    }

    static _additionalEntriesMap = {};
    static _addAdditionalEntries(ent) {
        if (Renderer.item._additionalEntriesMap[ent.appliesTo])
            return;
        Renderer.item._additionalEntriesMap[ent.appliesTo] = MiscUtil.copyFast(ent.entries);
    }

    static _masteryMap = {};
    static _addMastery(ent) {
        const lookupSource = ent.source.toLowerCase();
        const lookupName = ent.name.toLowerCase();
        if (Renderer.item._masteryMap[lookupSource]?.[lookupName])
            return;
        MiscUtil.set(Renderer.item._masteryMap, lookupSource, lookupName, ent);
    }

    static _getMastery(uid) {
        const {name, source} = DataUtil.proxy.unpackUid("itemMastery", uid, "itemMastery", {
            isLower: true
        });
        const out = MiscUtil.get(Renderer.item._masteryMap, source, name);
        if (!out)
            throw new Error(`Item mastry ${uid} not found. You probably meant to load the mastery reference first.`);
        return out;
    }

    static async _pAddPrereleaseBrewPropertiesAndTypes() {
        if (typeof PrereleaseUtil !== "undefined")
            Renderer.item.addPrereleaseBrewPropertiesAndTypesFrom({
                data: await PrereleaseUtil.pGetBrewProcessed()
            });
        if (typeof BrewUtil2 !== "undefined")
            Renderer.item.addPrereleaseBrewPropertiesAndTypesFrom({
                data: await BrewUtil2.pGetBrewProcessed()
            });
    }

    static addPrereleaseBrewPropertiesAndTypesFrom({data}) {
        (data.itemProperty || []).forEach(it=>Renderer.item._addProperty(it));
        (data.itemType || []).forEach(it=>Renderer.item._addType(it));
        (data.itemEntry || []).forEach(it=>Renderer.item._addEntry(it));
        (data.itemTypeAdditionalEntries || []).forEach(it=>Renderer.item._addAdditionalEntries(it));
        (data.itemMastery || []).forEach(it=>Renderer.item._addMastery(it));
    }

    static _addBasePropertiesAndTypes(baseItemData) {
        Object.entries(Parser.ITEM_TYPE_JSON_TO_ABV).forEach(([abv,name])=>Renderer.item._addType({
            abbreviation: abv,
            name
        }));

        (baseItemData.itemProperty || []).forEach(it=>Renderer.item._addProperty(it));
        (baseItemData.itemType || []).forEach(it=>Renderer.item._addType(it));
        (baseItemData.itemEntry || []).forEach(it=>Renderer.item._addEntry(it));
        (baseItemData.itemTypeAdditionalEntries || []).forEach(it=>Renderer.item._addAdditionalEntries(it));
        (baseItemData.itemMastery || []).forEach(it=>Renderer.item._addMastery(it));

        baseItemData.baseitem.forEach(it=>it._isBaseItem = true);
    }

    static async _pGetSiteUnresolvedRefItems_pLoadItems() {
        const itemData = await DataUtil.loadJSON(`${Renderer.get().baseUrl}data/items.json`);
        const items = itemData.item;
        itemData.itemGroup.forEach(it=>it._isItemGroup = true);
        return [...items, ...itemData.itemGroup];
    }

    static async pGetSiteUnresolvedRefItems() {
        const itemList = await Renderer.item._pGetSiteUnresolvedRefItems_pLoadItems();
        const baseItemsJson = await DataUtil.loadJSON(`${Renderer.get().baseUrl}data/items-base.json`);
        const baseItems = await Renderer.item._pGetAndProcBaseItems(baseItemsJson);
        const {genericVariants, linkedLootTables} = await Renderer.item._pGetCacheSiteGenericVariants();
        const specificVariants = Renderer.item._createSpecificVariants(baseItems, genericVariants, {
            linkedLootTables
        });
        const allItems = [...itemList, ...baseItems, ...genericVariants, ...specificVariants];
        Renderer.item._enhanceItems(allItems);

        return {
            item: allItems,
            itemEntry: baseItemsJson.itemEntry,
        };
    }

    static _pGettingSiteGenericVariants = null;
    static async _pGetCacheSiteGenericVariants() {
        Renderer.item._pGettingSiteGenericVariants = Renderer.item._pGettingSiteGenericVariants || (async()=>{
            const [genericVariants,linkedLootTables] = Renderer.item._getAndProcGenericVariants(await DataUtil.loadJSON(`${Renderer.get().baseUrl}data/magicvariants.json`));
            return {
                genericVariants,
                linkedLootTables
            };
        }
        )();
        return Renderer.item._pGettingSiteGenericVariants;
    }

    static async pBuildList() {
        return DataLoader.pCacheAndGetAllSite(UrlUtil.PG_ITEMS);
    }

    static async _pGetAndProcBaseItems(baseItemData) {
        Renderer.item._addBasePropertiesAndTypes(baseItemData);
        await Renderer.item._pAddPrereleaseBrewPropertiesAndTypes();
        return baseItemData.baseitem;
    }

    static _getAndProcGenericVariants(variantData) {
        variantData.magicvariant.forEach(Renderer.item._genericVariants_addInheritedPropertiesToSelf);
        return [variantData.magicvariant, variantData.linkedLootTables];
    }

    static _initFullEntries(item) {
        Renderer.utils.initFullEntries_(item);
    }

    static _initFullAdditionalEntries(item) {
        Renderer.utils.initFullEntries_(item, {
            propEntries: "additionalEntries",
            propFullEntries: "_fullAdditionalEntries"
        });
    }

    static _createSpecificVariants(baseItems, genericVariants, opts) {
        opts = opts || {};

        const genericAndSpecificVariants = [];
        baseItems.forEach((curBaseItem)=>{
            curBaseItem._category = "Basic";
            if (curBaseItem.entries == null)
                curBaseItem.entries = [];

            if (curBaseItem.packContents)
                return;
            genericVariants.forEach((curGenericVariant)=>{
                if (!Renderer.item._createSpecificVariants_hasRequiredProperty(curBaseItem, curGenericVariant))
                    return;
                if (Renderer.item._createSpecificVariants_hasExcludedProperty(curBaseItem, curGenericVariant))
                    return;

                genericAndSpecificVariants.push(Renderer.item._createSpecificVariants_createSpecificVariant(curBaseItem, curGenericVariant, opts));
            }
            );
        }
        );
        return genericAndSpecificVariants;
    }

    static _createSpecificVariants_hasRequiredProperty(baseItem, genericVariant) {
        return genericVariant.requires.some(req=>Renderer.item._createSpecificVariants_isRequiresExcludesMatch(baseItem, req, "every"));
    }

    static _createSpecificVariants_hasExcludedProperty(baseItem, genericVariant) {
        const curExcludes = genericVariant.excludes || {};
        return Renderer.item._createSpecificVariants_isRequiresExcludesMatch(baseItem, genericVariant.excludes, "some");
    }

    static _createSpecificVariants_isRequiresExcludesMatch(candidate, requirements, method) {
        if (candidate == null || requirements == null)
            return false;

        return Object.entries(requirements)[method](([reqKey,reqVal])=>{
            if (reqVal instanceof Array) {
                return candidate[reqKey]instanceof Array ? candidate[reqKey].some(it=>reqVal.includes(it)) : reqVal.includes(candidate[reqKey]);
            }

            if (reqVal != null && typeof reqVal === "object") {
                return Renderer.item._createSpecificVariants_isRequiresExcludesMatch(candidate[reqKey], reqVal, method);
            }

            return candidate[reqKey]instanceof Array ? candidate[reqKey].some(it=>reqVal === it) : reqVal === candidate[reqKey];
        }
        );
    }

    static _createSpecificVariants_createSpecificVariant(baseItem, genericVariant, opts) {
        const inherits = genericVariant.inherits;
        const specificVariant = MiscUtil.copyFast(baseItem);

        specificVariant.__prop = "item";

        delete specificVariant._isBaseItem;

        specificVariant._isEnhanced = false;
        delete specificVariant._fullEntries;

        specificVariant._baseName = baseItem.name;
        specificVariant._baseSrd = baseItem.srd;
        specificVariant._baseBasicRules = baseItem.basicRules;
        if (baseItem.source !== inherits.source)
            specificVariant._baseSource = baseItem.source;

        specificVariant._variantName = genericVariant.name;

        delete specificVariant.value;

        delete specificVariant.srd;
        delete specificVariant.basicRules;
        delete specificVariant.page;

        delete specificVariant.hasFluff;
        delete specificVariant.hasFluffImages;

        specificVariant._category = "Specific Variant";
        Object.entries(inherits).forEach(([inheritedProperty,val])=>{
            switch (inheritedProperty) {
            case "namePrefix":
                specificVariant.name = `${val}${specificVariant.name}`;
                break;
            case "nameSuffix":
                specificVariant.name = `${specificVariant.name}${val}`;
                break;
            case "entries":
                {
                    Renderer.item._initFullEntries(specificVariant);

                    const appliedPropertyEntries = Renderer.applyAllProperties(val, Renderer.item._getInjectableProps(baseItem, inherits));
                    appliedPropertyEntries.forEach((ent,i)=>specificVariant._fullEntries.splice(i, 0, ent));
                    break;
                }
            case "vulnerable":
            case "resist":
            case "immune":
                {
                    break;
                }
            case "conditionImmune":
                {
                    specificVariant[inheritedProperty] = [...specificVariant[inheritedProperty] || [], ...val].unique();
                    break;
                }
            case "nameRemove":
                {
                    specificVariant.name = specificVariant.name.replace(new RegExp(val.escapeRegexp(),"g"), "");

                    break;
                }
            case "weightExpression":
            case "valueExpression":
                {
                    const exp = Renderer.item._createSpecificVariants_evaluateExpression(baseItem, specificVariant, inherits, inheritedProperty);

                    const result = Renderer.dice.parseRandomise2(exp);
                    if (result != null) {
                        switch (inheritedProperty) {
                        case "weightExpression":
                            specificVariant.weight = result;
                            break;
                        case "valueExpression":
                            specificVariant.value = result;
                            break;
                        }
                    }

                    break;
                }
            case "barding":
                {
                    specificVariant.bardingType = baseItem.type;
                    break;
                }
            case "propertyAdd":
                {
                    specificVariant.property = [...(specificVariant.property || []), ...val.filter(it=>!specificVariant.property || !specificVariant.property.includes(it)), ];
                    break;
                }
            case "propertyRemove":
                {
                    if (specificVariant.property) {
                        specificVariant.property = specificVariant.property.filter(it=>!val.includes(it));
                        if (!specificVariant.property.length)
                            delete specificVariant.property;
                    }
                    break;
                }
            default:
                specificVariant[inheritedProperty] = val;
            }
        }
        );

        Renderer.item._createSpecificVariants_mergeVulnerableResistImmune({
            specificVariant,
            inherits
        });

        genericVariant.variants = genericVariant.variants || [];
        if (!genericVariant.variants.some(it=>it.base?.name === baseItem.name && it.base?.source === baseItem.source))
            genericVariant.variants.push({
                base: baseItem,
                specificVariant
            });

        specificVariant.genericVariant = {
            name: genericVariant.name,
            source: genericVariant.source,
        };

        if (opts.linkedLootTables && opts.linkedLootTables[specificVariant.source] && opts.linkedLootTables[specificVariant.source][specificVariant.name]) {
            (specificVariant.lootTables = specificVariant.lootTables || []).push(...opts.linkedLootTables[specificVariant.source][specificVariant.name]);
        }

        if (baseItem.source !== Parser.SRC_PHB && baseItem.source !== Parser.SRC_DMG) {
            Renderer.item._initFullEntries(specificVariant);
            specificVariant._fullEntries.unshift({
                type: "wrapper",
                wrapped: `{@note The {@item ${baseItem.name}|${baseItem.source}|base item} can be found in ${Parser.sourceJsonToFull(baseItem.source)}${baseItem.page ? `, page ${baseItem.page}` : ""}.}`,
                data: {
                    [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "note",
                },
            });
        }

        return specificVariant;
    }

    static _createSpecificVariants_evaluateExpression(baseItem, specificVariant, inherits, inheritedProperty) {
        return inherits[inheritedProperty].replace(/\[\[([^\]]+)]]/g, (...m)=>{
            const propPath = m[1].split(".");
            return propPath[0] === "item" ? MiscUtil.get(specificVariant, ...propPath.slice(1)) : propPath[0] === "baseItem" ? MiscUtil.get(baseItem, ...propPath.slice(1)) : MiscUtil.get(specificVariant, ...propPath);
        }
        );
    }

    static _PROPS_VULN_RES_IMMUNE = ["vulnerable", "resist", "immune", ];
    static _createSpecificVariants_mergeVulnerableResistImmune({specificVariant, inherits}) {
        const fromBase = {};
        Renderer.item._PROPS_VULN_RES_IMMUNE.filter(prop=>specificVariant[prop]).forEach(prop=>fromBase[prop] = [...specificVariant[prop]]);

        Renderer.item._PROPS_VULN_RES_IMMUNE.forEach(prop=>{
            const val = inherits[prop];

            if (val === undefined)
                return;

            if (val == null)
                return delete fromBase[prop];

            const valSet = new Set();
            val.forEach(it=>{
                if (typeof it === "string")
                    valSet.add(it);
                if (!it?.[prop]?.length)
                    return;
                it?.[prop].forEach(itSub=>{
                    if (typeof itSub === "string")
                        valSet.add(itSub);
                }
                );
            }
            );

            Renderer.item._PROPS_VULN_RES_IMMUNE.filter(it=>it !== prop).forEach(propOther=>{
                if (!fromBase[propOther])
                    return;

                fromBase[propOther] = fromBase[propOther].filter(it=>{
                    if (typeof it === "string")
                        return !valSet.has(it);

                    if (it?.[propOther]?.length) {
                        it[propOther] = it[propOther].filter(itSub=>{
                            if (typeof itSub === "string")
                                return !valSet.has(itSub);
                            return true;
                        }
                        );
                    }

                    return true;
                }
                );

                if (!fromBase[propOther].length)
                    delete fromBase[propOther];
            }
            );
        }
        );

        Renderer.item._PROPS_VULN_RES_IMMUNE.forEach(prop=>{
            if (fromBase[prop] || inherits[prop])
                specificVariant[prop] = [...(fromBase[prop] || []), ...(inherits[prop] || [])].unique();
            else
                delete specificVariant[prop];
        }
        );
    }

    static _enhanceItems(allItems) {
        allItems.forEach((item)=>Renderer.item.enhanceItem(item));
        return allItems;
    }

    static async pGetGenericAndSpecificVariants(genericVariants, opts) {
        opts = opts || {};

        let baseItems;
        if (opts.baseItems) {
            baseItems = opts.baseItems;
        } else {
            const baseItemData = await DataUtil.loadJSON(`${Renderer.get().baseUrl}data/items-base.json`);
            Renderer.item._addBasePropertiesAndTypes(baseItemData);
            baseItems = [...baseItemData.baseitem, ...(opts.additionalBaseItems || [])];
        }

        await Renderer.item._pAddPrereleaseBrewPropertiesAndTypes();
        genericVariants.forEach(Renderer.item._genericVariants_addInheritedPropertiesToSelf);
        const specificVariants = Renderer.item._createSpecificVariants(baseItems, genericVariants);
        const outSpecificVariants = Renderer.item._enhanceItems(specificVariants);

        if (opts.isSpecificVariantsOnly)
            return outSpecificVariants;

        const outGenericVariants = Renderer.item._enhanceItems(genericVariants);
        return [...outGenericVariants, ...outSpecificVariants];
    }

    static _getInjectableProps(baseItem, inherits) {
        return {
            baseName: baseItem.name,
            dmgType: baseItem.dmgType ? Parser.dmgTypeToFull(baseItem.dmgType) : null,
            bonusAc: inherits.bonusAc,
            bonusWeapon: inherits.bonusWeapon,
            bonusWeaponAttack: inherits.bonusWeaponAttack,
            bonusWeaponDamage: inherits.bonusWeaponDamage,
            bonusWeaponCritDamage: inherits.bonusWeaponCritDamage,
            bonusSpellAttack: inherits.bonusSpellAttack,
            bonusSpellSaveDc: inherits.bonusSpellSaveDc,
            bonusSavingThrow: inherits.bonusSavingThrow,
        };
    }

    static _INHERITED_PROPS_BLOCKLIST = new Set(["entries", "rarity",
    "namePrefix", "nameSuffix", ]);
    static _genericVariants_addInheritedPropertiesToSelf(genericVariant) {
        if (genericVariant._isInherited)
            return;
        genericVariant._isInherited = true;

        for (const prop in genericVariant.inherits) {
            if (Renderer.item._INHERITED_PROPS_BLOCKLIST.has(prop))
                continue;

            const val = genericVariant.inherits[prop];

            if (val == null)
                delete genericVariant[prop];
            else if (genericVariant[prop]) {
                if (genericVariant[prop]instanceof Array && val instanceof Array)
                    genericVariant[prop] = MiscUtil.copyFast(genericVariant[prop]).concat(val);
                else
                    genericVariant[prop] = val;
            } else
                genericVariant[prop] = genericVariant.inherits[prop];
        }

        if (!genericVariant.entries && genericVariant.inherits.entries) {
            genericVariant.entries = MiscUtil.copyFast(Renderer.applyAllProperties(genericVariant.inherits.entries, genericVariant.inherits));
        }

        if (genericVariant.inherits.rarity == null)
            delete genericVariant.rarity;
        else if (genericVariant.inherits.rarity === "varies") {} else
            genericVariant.rarity = genericVariant.inherits.rarity;

        if (genericVariant.requires.armor)
            genericVariant.armor = genericVariant.requires.armor;
    }

    static getItemTypeName(t) {
        return Renderer.item.getType(t).name?.toLowerCase() || t;
    }

    static enhanceItem(item) {
        if (item._isEnhanced)
            return;
        item._isEnhanced = true;
        if (item.noDisplay)
            return;
        if (item.type === "GV")
            item._category = "Generic Variant";
        if (item._category == null)
            item._category = "Other";
        if (item.entries == null)
            item.entries = [];
        if (item.type && (Renderer.item.getType(item.type)?.entries || Renderer.item.getType(item.type)?.entriesTemplate)) {
            Renderer.item._initFullEntries(item);

            const propetyEntries = Renderer.item._enhanceItem_getItemPropertyTypeEntries({
                item,
                ent: Renderer.item.getType(item.type)
            });
            propetyEntries.forEach(e=>item._fullEntries.push({
                type: "wrapper",
                wrapped: e,
                data: {
                    [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "type"
                }
            }));
        }
        if (item.property) {
            item.property.forEach(p=>{
                const entProperty = Renderer.item.getProperty(p);
                if (!entProperty.entries && !entProperty.entriesTemplate)
                    return;

                Renderer.item._initFullEntries(item);

                const propetyEntries = Renderer.item._enhanceItem_getItemPropertyTypeEntries({
                    item,
                    ent: entProperty
                });
                propetyEntries.forEach(e=>item._fullEntries.push({
                    type: "wrapper",
                    wrapped: e,
                    data: {
                        [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "property"
                    }
                }));
            }
            );
        }
        if (item.type === "LA" || item.type === "MA" || item.type === "HA") {
            if (item.stealth) {
                Renderer.item._initFullEntries(item);
                item._fullEntries.push({
                    type: "wrapper",
                    wrapped: "The wearer has disadvantage on Dexterity ({@skill Stealth}) checks.",
                    data: {
                        [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "type"
                    }
                });
            }
            if (item.type === "HA" && item.strength) {
                Renderer.item._initFullEntries(item);
                item._fullEntries.push({
                    type: "wrapper",
                    wrapped: `If the wearer has a Strength score lower than ${item.strength}, their speed is reduced by 10 feet.`,
                    data: {
                        [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "type"
                    }
                });
            }
        }
        if (item.type === "SCF") {
            if (item._isItemGroup) {
                if (item.scfType === "arcane" && item.source !== Parser.SRC_ERLW) {
                    Renderer.item._initFullEntries(item);
                    item._fullEntries.push({
                        type: "wrapper",
                        wrapped: "An arcane focus is a special item\u2014an orb, a crystal, a rod, a specially constructed staff, a wand-like length of wood, or some similar item\u2014designed to channel the power of arcane spells. A sorcerer, warlock, or wizard can use such an item as a spellcasting focus.",
                        data: {
                            [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "type.SCF"
                        }
                    });
                }
                if (item.scfType === "druid") {
                    Renderer.item._initFullEntries(item);
                    item._fullEntries.push({
                        type: "wrapper",
                        wrapped: "A druidic focus might be a sprig of mistletoe or holly, a wand or scepter made of yew or another special wood, a staff drawn whole out of a living tree, or a totem object incorporating feathers, fur, bones, and teeth from sacred animals. A druid can use such an object as a spellcasting focus.",
                        data: {
                            [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "type.SCF"
                        }
                    });
                }
                if (item.scfType === "holy") {
                    Renderer.item._initFullEntries(item);
                    item._fullEntries.push({
                        type: "wrapper",
                        wrapped: "A holy symbol is a representation of a god or pantheon. It might be an amulet depicting a symbol representing a deity, the same symbol carefully engraved or inlaid as an emblem on a shield, or a tiny box holding a fragment of a sacred relic. A cleric or paladin can use a holy symbol as a spellcasting focus. To use the symbol in this way, the caster must hold it in hand, wear it visibly, or bear it on a shield.",
                        data: {
                            [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "type.SCF"
                        }
                    });
                }
            } else {
                if (item.scfType === "arcane") {
                    Renderer.item._initFullEntries(item);
                    item._fullEntries.push({
                        type: "wrapper",
                        wrapped: "An arcane focus is a special item designed to channel the power of arcane spells. A sorcerer, warlock, or wizard can use such an item as a spellcasting focus.",
                        data: {
                            [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "type.SCF"
                        }
                    });
                }
                if (item.scfType === "druid") {
                    Renderer.item._initFullEntries(item);
                    item._fullEntries.push({
                        type: "wrapper",
                        wrapped: "A druid can use this object as a spellcasting focus.",
                        data: {
                            [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "type.SCF"
                        }
                    });
                }
                if (item.scfType === "holy") {
                    Renderer.item._initFullEntries(item);

                    item._fullEntries.push({
                        type: "wrapper",
                        wrapped: "A holy symbol is a representation of a god or pantheon.",
                        data: {
                            [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "type.SCF"
                        }
                    });
                    item._fullEntries.push({
                        type: "wrapper",
                        wrapped: "A cleric or paladin can use a holy symbol as a spellcasting focus. To use the symbol in this way, the caster must hold it in hand, wear it visibly, or bear it on a shield.",
                        data: {
                            [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "type.SCF"
                        }
                    });
                }
            }
        }

        (item.mastery || []).forEach(uid=>{
            const mastery = Renderer.item._getMastery(uid);

            if (!mastery)
                throw new Error(`Item mastery ${uid} not found. You probably meant to load the property/type reference first; see \`Renderer.item.pPopulatePropertyAndTypeReference()\`.`);
            if (!mastery.entries && !mastery.entriesTemplate)
                return;

            Renderer.item._initFullEntries(item);

            item._fullEntries.push({
                type: "wrapper",
                wrapped: {
                    type: "entries",
                    name: `Mastery: ${mastery.name}`,
                    source: mastery.source,
                    page: mastery.page,
                    entries: Renderer.item._enhanceItem_getItemPropertyTypeEntries({
                        item,
                        ent: mastery
                    }),
                },
                data: {
                    [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "mastery",
                },
            });
        }
        );

        if (item.type === "T" || item.type === "AT" || item.type === "INS" || item.type === "GS") {
            Renderer.item._initFullAdditionalEntries(item);
            item._fullAdditionalEntries.push({
                type: "wrapper",
                wrapped: {
                    type: "hr"
                },
                data: {
                    [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "type"
                }
            });
            item._fullAdditionalEntries.push({
                type: "wrapper",
                wrapped: `{@note See the {@variantrule Tool Proficiencies|XGE} entry for more information.}`,
                data: {
                    [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "type"
                }
            });
        }

        if (item.type === "INS" || item.type === "GS")
            item.additionalSources = item.additionalSources || [];
        if (item.type === "INS") {
            if (!item.additionalSources.find(it=>it.source === "XGE" && it.page === 83))
                item.additionalSources.push({
                    "source": "XGE",
                    "page": 83
                });
        } else if (item.type === "GS") {
            if (!item.additionalSources.find(it=>it.source === "XGE" && it.page === 81))
                item.additionalSources.push({
                    "source": "XGE",
                    "page": 81
                });
        }

        if (item.type && Renderer.item._additionalEntriesMap[item.type]) {
            Renderer.item._initFullAdditionalEntries(item);
            const additional = Renderer.item._additionalEntriesMap[item.type];
            item._fullAdditionalEntries.push({
                type: "wrapper",
                wrapped: {
                    type: "entries",
                    entries: additional
                },
                data: {
                    [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "type"
                }
            });
        }

        const [typeListText,typeHtml,subTypeHtml] = Renderer.item.getHtmlAndTextTypes(item);
        item._typeListText = typeListText;
        item._typeHtml = typeHtml;
        item._subTypeHtml = subTypeHtml;

        const [attune,attuneCat] = Renderer.item.getAttunementAndAttunementCatText(item);
        item._attunement = attune;
        item._attunementCategory = attuneCat;

        if (item.reqAttuneAlt) {
            const [attuneAlt,attuneCatAlt] = Renderer.item.getAttunementAndAttunementCatText(item, "reqAttuneAlt");
            item._attunementCategory = [attuneCat, attuneCatAlt];
        }

        if (item._isItemGroup) {
            Renderer.item._initFullEntries(item);
            item._fullEntries.push({
                type: "wrapper",
                wrapped: "Multiple variations of this item exist, as listed below:",
                data: {
                    [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "magicvariant"
                }
            });
            item._fullEntries.push({
                type: "wrapper",
                wrapped: {
                    type: "list",
                    items: item.items.map(it=>typeof it === "string" ? `{@item ${it}}` : `{@item ${it.name}|${it.source}}`),
                },
                data: {
                    [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "magicvariant"
                },
            });
        }

        if (item.variants && item.variants.length) {
            item.variants.sort((a,b)=>SortUtil.ascSortLower(a.base.name, b.base.name) || SortUtil.ascSortLower(a.base.source, b.base.source));

            Renderer.item._initFullEntries(item);
            item._fullEntries.push({
                type: "wrapper",
                wrapped: {
                    type: "entries",
                    name: "Base items",
                    entries: ["This item variant can be applied to the following base items:", {
                        type: "list",
                        items: item.variants.map(({base, specificVariant})=>{
                            return `{@item ${base.name}|${base.source}} ({@item ${specificVariant.name}|${specificVariant.source}})`;
                        }
                        ),
                    }, ],
                },
                data: {
                    [VeCt.ENTDATA_ITEM_MERGED_ENTRY_TAG]: "magicvariant"
                },
            });
        }
    }

    static _enhanceItem_getItemPropertyTypeEntries({item, ent}) {
        if (!ent.entriesTemplate)
            return MiscUtil.copyFast(ent.entries);
        return MiscUtil.getWalker({
            keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST,
        }).walk(MiscUtil.copyFast(ent.entriesTemplate), {
            string: (str)=>{
                return Renderer.utils.applyTemplate(item, str, );
            }
            ,
        }, );
    }

    static unenhanceItem(item) {
        if (!item._isEnhanced)
            return;
        delete item._isEnhanced;
        delete item._fullEntries;
    }

    static async pGetSiteUnresolvedRefItemsFromPrereleaseBrew({brewUtil, brew=null}) {
        if (brewUtil == null && brew == null)
            return [];

        brew = brew || await brewUtil.pGetBrewProcessed();

        (brew.itemProperty || []).forEach(p=>Renderer.item._addProperty(p));
        (brew.itemType || []).forEach(t=>Renderer.item._addType(t));
        (brew.itemEntry || []).forEach(it=>Renderer.item._addEntry(it));
        (brew.itemTypeAdditionalEntries || []).forEach(it=>Renderer.item._addAdditionalEntries(it));

        let items = [...(brew.baseitem || []), ...(brew.item || [])];

        if (brew.itemGroup) {
            const itemGroups = MiscUtil.copyFast(brew.itemGroup);
            itemGroups.forEach(it=>it._isItemGroup = true);
            items = [...items, ...itemGroups];
        }

        Renderer.item._enhanceItems(items);

        let isReEnhanceVariants = false;

        if (brew.baseitem && brew.baseitem.length) {
            isReEnhanceVariants = true;

            const {genericVariants} = await Renderer.item._pGetCacheSiteGenericVariants();

            const variants = await Renderer.item.pGetGenericAndSpecificVariants(genericVariants, {
                baseItems: brew.baseitem || [],
                isSpecificVariantsOnly: true
            }, );
            items = [...items, ...variants];
        }

        if (brew.magicvariant && brew.magicvariant.length) {
            isReEnhanceVariants = true;

            const variants = await Renderer.item.pGetGenericAndSpecificVariants(brew.magicvariant, {
                additionalBaseItems: brew.baseitem || []
            }, );
            items = [...items, ...variants];
        }

        if (isReEnhanceVariants) {
            const {genericVariants} = await Renderer.item._pGetCacheSiteGenericVariants();
            genericVariants.forEach(item=>{
                Renderer.item.unenhanceItem(item);
                Renderer.item.enhanceItem(item);
            }
            );
        }

        return items;
    }

    static async pGetItemsFromPrerelease() {
        return DataLoader.pCacheAndGetAllPrerelease(UrlUtil.PG_ITEMS);
    }

    static async pGetItemsFromBrew() {
        return DataLoader.pCacheAndGetAllBrew(UrlUtil.PG_ITEMS);
    }

    static _pPopulatePropertyAndTypeReference = null;
    static pPopulatePropertyAndTypeReference() {
        return Renderer.item._pPopulatePropertyAndTypeReference || (async()=>{
            const data = await DataUtil.loadJSON(`${Renderer.get().baseUrl}data/items-base.json`);

            Object.entries(Parser.ITEM_TYPE_JSON_TO_ABV).forEach(([abv,name])=>Renderer.item._addType({
                abbreviation: abv,
                name
            }));
            data.itemProperty.forEach(p=>Renderer.item._addProperty(p));
            data.itemType.forEach(t=>Renderer.item._addType(t));
            data.itemEntry.forEach(it=>Renderer.item._addEntry(it));
            data.itemTypeAdditionalEntries.forEach(e=>Renderer.item._addAdditionalEntries(e));

            await Renderer.item._pAddPrereleaseBrewPropertiesAndTypes();
        }
        )();
    }

    static async getAllIndexableItems(rawVariants, rawBaseItems) {
        const basicItems = await Renderer.item._pGetAndProcBaseItems(rawBaseItems);
        const [genericVariants,linkedLootTables] = await Renderer.item._getAndProcGenericVariants(rawVariants);
        const specificVariants = Renderer.item._createSpecificVariants(basicItems, genericVariants, {
            linkedLootTables
        });

        [...genericVariants, ...specificVariants].forEach(item=>{
            if (item.variants)
                delete item.variants;
        }
        );

        return specificVariants;
    }

    static isMundane(item) {
        return item.rarity === "none" || item.rarity === "unknown" || item._category === "Basic";
    }

    static isExcluded(item, {hash=null}={}) {
        const name = item.name;
        const source = item.source || item.inherits?.source;

        hash = hash || UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS]({
            name,
            source
        });

        if (ExcludeUtil.isExcluded(hash, "item", source))
            return true;

        if (item._isBaseItem)
            return ExcludeUtil.isExcluded(hash, "baseitem", source);
        if (item._isItemGroup)
            return ExcludeUtil.isExcluded(hash, "itemGroup", source);
        if (item._variantName) {
            if (ExcludeUtil.isExcluded(hash, "_specificVariant", source))
                return true;

            const baseHash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS]({
                name: item._baseName,
                source: item._baseSource || source
            });
            if (ExcludeUtil.isExcluded(baseHash, "baseitem", item._baseSource || source))
                return true;

            const variantHash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS]({
                name: item._variantName,
                source: source
            });
            return ExcludeUtil.isExcluded(variantHash, "magicvariant", source);
        }
        if (item.type === "GV")
            return ExcludeUtil.isExcluded(hash, "magicvariant", source);

        return false;
    }

    static pGetFluff(item) {
        return Renderer.utils.pGetFluff({
            entity: item,
            fnGetFluffData: DataUtil.itemFluff.loadJSON.bind(DataUtil.itemFluff),
            fluffProp: "itemFluff",
        });
    }
}
;

Renderer.psionic = class {
    static enhanceMode(mode) {
        if (mode._isEnhanced)
            return;

        mode.name = [mode.name, Renderer.psionic._enhanceMode_getModeTitleBracketPart({
            mode: mode
        })].filter(Boolean).join(" ");

        if (mode.submodes) {
            mode.submodes.forEach(sm=>{
                sm.name = [sm.name, Renderer.psionic._enhanceMode_getModeTitleBracketPart({
                    mode: sm
                })].filter(Boolean).join(" ");
            }
            );
        }

        mode._isEnhanced = true;
    }

    static _enhanceMode_getModeTitleBracketPart({mode}) {
        const modeTitleBracketArray = [];

        if (mode.cost)
            modeTitleBracketArray.push(Renderer.psionic._enhanceMode_getModeTitleCost({
                mode
            }));
        if (mode.concentration)
            modeTitleBracketArray.push(Renderer.psionic._enhanceMode_getModeTitleConcentration({
                mode
            }));

        if (modeTitleBracketArray.length === 0)
            return null;
        return `(${modeTitleBracketArray.join("; ")})`;
    }

    static _enhanceMode_getModeTitleCost({mode}) {
        const costMin = mode.cost.min;
        const costMax = mode.cost.max;
        const costString = costMin === costMax ? costMin : `${costMin}-${costMax}`;
        return `${costString} psi`;
    }

    static _enhanceMode_getModeTitleConcentration({mode}) {
        return `conc., ${mode.concentration.duration} ${mode.concentration.unit}.`;
    }

    static getPsionicRenderableEntriesMeta(ent) {
        const entriesContent = [];

        return {
            entryTypeOrder: `{@i ${Renderer.psionic.getTypeOrderString(ent)}}`,
            entryContent: ent.entries ? {
                entries: ent.entries,
                type: "entries"
            } : null,
            entryFocus: ent.focus ? `{@b {@i Psychic Focus.}} ${ent.focus}` : null,
            entriesModes: ent.modes ? ent.modes.flatMap(mode=>Renderer.psionic._getModeEntries(mode)) : null,
        };
    }

    static _getModeEntries(mode, renderer) {
        Renderer.psionic.enhanceMode(mode);

        return [{
            type: mode.type || "entries",
            name: mode.name,
            entries: mode.entries,
        }, mode.submodes ? Renderer.psionic._getSubModesEntry(mode.submodes) : null, ].filter(Boolean);
    }

    static _getSubModesEntry(subModes) {
        return {
            type: "list",
            style: "list-hang-notitle",
            items: subModes.map(sm=>({
                type: "item",
                name: sm.name,
                entries: sm.entries,
            })),
        };
    }

    static getTypeOrderString(psi) {
        const typeMeta = Parser.psiTypeToMeta(psi.type);
        return typeMeta.hasOrder ? typeMeta.isAltDisplay ? `${typeMeta.full} (${psi.order})` : `${psi.order} ${typeMeta.full}` : typeMeta.full;
    }

    static getBodyHtml(ent, {renderer=null, entriesMeta=null}={}) {
        renderer ||= Renderer.get().setFirstSection(true);
        entriesMeta ||= Renderer.psionic.getPsionicRenderableEntriesMeta(ent);

        return `${entriesMeta.entryContent ? renderer.render(entriesMeta.entryContent) : ""}
		${entriesMeta.entryFocus ? `<p>${renderer.render(entriesMeta.entryFocus)}</p>` : ""}
		${entriesMeta.entriesModes ? entriesMeta.entriesModes.map(entry=>renderer.render(entry, 2)).join("") : ""}`;
    }

    static getCompactRenderedString(ent) {
        const renderer = Renderer.get().setFirstSection(true);
        const entriesMeta = Renderer.psionic.getPsionicRenderableEntriesMeta(ent);

        return `
			${Renderer.utils.getExcludedTr({
            entity: ent,
            dataProp: "psionic",
            page: UrlUtil.PG_PSIONICS
        })}
			${Renderer.utils.getNameTr(ent, {
            page: UrlUtil.PG_PSIONICS
        })}
			<tr class="text"><td colspan="6">
			<p>${renderer.render(entriesMeta.entryTypeOrder)}</p>
			${Renderer.psionic.getBodyHtml(ent, {
            renderer,
            entriesMeta
        })}
			</td></tr>
		`;
    }
}
;

Renderer.rule = class {
    static getCompactRenderedString(rule) {
        return `
			<tr><td colspan="6">
			${Renderer.get().setFirstSection(true).render(rule)}
			</td></tr>
		`;
    }
}
;

Renderer.variantrule = class {
    static getCompactRenderedString(rule) {
        const cpy = MiscUtil.copyFast(rule);
        delete cpy.name;
        return `
			${Renderer.utils.getExcludedTr({
            entity: rule,
            dataProp: "variantrule",
            page: UrlUtil.PG_VARIANTRULES
        })}
			${Renderer.utils.getNameTr(rule, {
            page: UrlUtil.PG_VARIANTRULES
        })}
			<tr><td colspan="6">
			${Renderer.get().setFirstSection(true).render(cpy)}
			</td></tr>
		`;
    }
}
;

Renderer.table = class {
    static getCompactRenderedString(it) {
        it.type = it.type || "table";
        const cpy = MiscUtil.copyFast(it);
        delete cpy.name;
        return `
			${Renderer.utils.getExcludedTr({
            entity: it,
            dataProp: "table",
            page: UrlUtil.PG_TABLES
        })}
			${Renderer.utils.getNameTr(it, {
            page: UrlUtil.PG_TABLES
        })}
			<tr><td colspan="6">
			${Renderer.get().setFirstSection(true).render(it)}
			</td></tr>
		`;
    }

    static getConvertedEncounterOrNamesTable({group, tableRaw, fnGetNameCaption, colLabel1}) {
        const getPadded = (number)=>{
            if (tableRaw.diceExpression === "d100")
                return String(number).padStart(2, "0");
            return String(number);
        }
        ;

        const nameCaption = fnGetNameCaption(group, tableRaw);
        return {
            name: nameCaption,
            type: "table",
            source: group?.source,
            page: group?.page,
            caption: nameCaption,
            colLabels: [`{@dice ${tableRaw.diceExpression}}`, colLabel1, tableRaw.rollAttitude ? `Attitude` : null, ].filter(Boolean),
            colStyles: ["col-2 text-center", tableRaw.rollAttitude ? "col-8" : "col-10", tableRaw.rollAttitude ? `col-2 text-center` : null, ].filter(Boolean),
            rows: tableRaw.table.map(it=>[`${getPadded(it.min)}${it.max != null && it.max !== it.min ? `-${getPadded(it.max)}` : ""}`, it.result, tableRaw.rollAttitude ? it.resultAttitude || "\u2014" : null, ].filter(Boolean)),
            footnotes: tableRaw.footnotes,
        };
    }

    static getConvertedEncounterTableName(group, tableRaw) {
        return `${group.name}${tableRaw.caption ? ` ${tableRaw.caption}` : ""}${/\bencounters?\b/i.test(group.name) ? "" : " Encounters"}${tableRaw.minlvl && tableRaw.maxlvl ? ` (Levels ${tableRaw.minlvl}\u2014${tableRaw.maxlvl})` : ""}`;
    }

    static getConvertedNameTableName(group, tableRaw) {
        return `${group.name} Names \u2013 ${tableRaw.option}`;
    }

    static getHeaderRowMetas(ent) {
        if (!ent.colLabels?.length && !ent.colLabelGroups?.length)
            return null;

        if (ent.colLabels?.length)
            return [ent.colLabels];

        const maxHeight = Math.max(...ent.colLabelGroups.map(clg=>clg.colLabels?.length || 0));

        const padded = ent.colLabelGroups.map(clg=>{
            const out = [...(clg.colLabels || [])];
            while (out.length < maxHeight)
                out.unshift("");
            return out;
        }
        );

        return [...new Array(maxHeight)].map((_,i)=>padded.map(lbls=>lbls[i]));
    }

    static _RE_TABLE_ROW_DASHED_NUMBERS = /^\d+([-\u2012\u2013]\d+)?/;
    static getAutoConvertedRollMode(table, {headerRowMetas}={}) {
        if (headerRowMetas === undefined)
            headerRowMetas = Renderer.table.getHeaderRowMetas(table);

        if (!headerRowMetas || headerRowMetas.last().length < 2)
            return RollerUtil.ROLL_COL_NONE;

        const rollColMode = RollerUtil.getColRollType(headerRowMetas.last()[0]);
        if (!rollColMode)
            return RollerUtil.ROLL_COL_NONE;

        if (!Renderer.table.isEveryRowRollable(table.rows))
            return RollerUtil.ROLL_COL_NONE;

        return rollColMode;
    }

    static isEveryRowRollable(rows) {
        return rows.every(row=>{
            if (!row)
                return false;
            const [cell] = row;
            return Renderer.table.isRollableCell(cell);
        }
        );
    }

    static isRollableCell(cell) {
        if (cell == null)
            return false;
        if (cell?.roll)
            return true;

        if (typeof cell === "number")
            return Number.isInteger(cell);

        return typeof cell === "string" && Renderer.table._RE_TABLE_ROW_DASHED_NUMBERS.test(cell);
    }
}
;

Renderer.vehicle = class {
    static CHILD_PROPS = ["movement", "weapon", "other", "action", "trait", "reaction", "control", "actionStation"];

    static getVehicleRenderableEntriesMeta(ent) {
        return {
            entryDamageImmunities: ent.immune ? `{@b Damage Immunities} ${Parser.getFullImmRes(ent.immune)}` : null,
            entryConditionImmunities: ent.conditionImmune ? `{@b Condition Immunities} ${Parser.getFullCondImm(ent.conditionImmune, {
                isEntry: true
            })}` : null,
        };
    }

    static getCompactRenderedString(veh, opts) {
        return Renderer.vehicle.getRenderedString(veh, {
            ...opts,
            isCompact: true
        });
    }

    static getRenderedString(ent, opts) {
        opts = opts || {};

        if (ent.upgradeType)
            return Renderer.vehicleUpgrade.getCompactRenderedString(ent, opts);

        ent.vehicleType ||= "SHIP";
        switch (ent.vehicleType) {
        case "SHIP":
            return Renderer.vehicle._getRenderedString_ship(ent, opts);
        case "SPELLJAMMER":
            return Renderer.vehicle._getRenderedString_spelljammer(ent, opts);
        case "INFWAR":
            return Renderer.vehicle._getRenderedString_infwar(ent, opts);
        case "CREATURE":
            return Renderer.monster.getCompactRenderedString(ent, {
                ...opts,
                isHideLanguages: true,
                isHideSenses: true,
                isCompact: opts.isCompact ?? false,
                page: UrlUtil.PG_VEHICLES
            });
        case "OBJECT":
            return Renderer.object.getCompactRenderedString(ent, {
                ...opts,
                isCompact: opts.isCompact ?? false,
                page: UrlUtil.PG_VEHICLES
            });
        default:
            throw new Error(`Unhandled vehicle type "${ent.vehicleType}"`);
        }
    }

    static ship = class {
        static PROPS_RENDERABLE_ENTRIES_ATTRIBUTES = ["entryCreatureCapacity", "entryCargoCapacity", "entryTravelPace", "entryTravelPaceNote", ];

        static getVehicleShipRenderableEntriesMeta(ent) {
            const entriesOtherActions = (ent.other || []).filter(it=>it.name === "Actions");
            const entriesOtherOthers = (ent.other || []).filter(it=>it.name !== "Actions");

            return {
                entrySizeDimensions: `{@i ${Parser.sizeAbvToFull(ent.size)} vehicle${ent.dimensions ? ` (${ent.dimensions.join(" by ")})` : ""}}`,
                entryCreatureCapacity: ent.capCrew != null || ent.capPassenger != null ? `{@b Creature Capacity} ${Renderer.vehicle.getShipCreatureCapacity(ent)}` : null,
                entryCargoCapacity: ent.capCargo != null ? `{@b Cargo Capacity} ${Renderer.vehicle.getShipCargoCapacity(ent)}` : null,
                entryTravelPace: ent.pace != null ? `{@b Travel Pace} ${ent.pace} miles per hour (${ent.pace * 24} miles per day)` : null,
                entryTravelPaceNote: ent.pace != null ? `[{@b Speed} ${ent.pace * 10} ft.]` : null,
                entryTravelPaceNoteTitle: ent.pace != null ? `Based on "Special Travel Pace," DMG p242` : null,

                entriesOtherActions: entriesOtherActions.length ? entriesOtherActions : null,
                entriesOtherOthers: entriesOtherOthers.length ? entriesOtherOthers : null,
            };
        }

        static getLocomotionEntries(loc) {
            return {
                type: "list",
                style: "list-hang-notitle",
                items: [{
                    type: "item",
                    name: `Locomotion (${loc.mode})`,
                    entries: loc.entries,
                }, ],
            };
        }

        static getSpeedEntries(spd) {
            return {
                type: "list",
                style: "list-hang-notitle",
                items: [{
                    type: "item",
                    name: `Speed (${spd.mode})`,
                    entries: spd.entries,
                }, ],
            };
        }

        static getActionPart_(renderer, veh) {
            return renderer.render({
                entries: veh.action
            });
        }

        static getSectionTitle_(title) {
            return `<tr class="mon__stat-header-underline"><td colspan="6"><h3 class="mon__sect-header-inner">${title}</h3></td></tr>`;
        }

        static getSectionHpEntriesMeta_({entry, isEach=false}) {
            return {
                entryArmorClass: entry.ac ? `{@b Armor Class} ${entry.ac}` : null,
                entryHitPoints: entry.hp ? `{@b Hit Points} ${entry.hp}${isEach ? ` each` : ""}${entry.dt ? ` (damage threshold ${entry.dt})` : ""}${entry.hpNote ? `; ${entry.hpNote}` : ""}` : null,
            };
        }

        static getSectionHpPart_(renderer, entry, isEach) {
            const entriesMetaSection = Renderer.vehicle.ship.getSectionHpEntriesMeta_({
                entry,
                isEach
            });

            const props = ["entryArmorClass", "entryHitPoints", ];

            if (!props.some(prop=>entriesMetaSection[prop]))
                return "";

            return props.map(prop=>`<div>${renderer.render(entriesMetaSection[prop])}</div>`).join("");
        }

        static getControlSection_(renderer, control) {
            if (!control)
                return "";
            return `
				<tr class="mon__stat-header-underline"><td colspan="6"><h3 class="mon__sect-header-inner">Control: ${control.name}</h3></td></tr>
				<tr><td colspan="6" class="mon__sect-row-inner">
				${Renderer.vehicle.ship.getSectionHpPart_(renderer, control)}
				<div class="rd__b--1">${renderer.render({
                entries: control.entries
            })}</div>
				</td></tr>
			`;
        }

        static _getMovementSection_getLocomotionSection({renderer, entry}) {
            const asList = Renderer.vehicle.ship.getLocomotionEntries(entry);
            return `<div class="rd__b--1">${renderer.render(asList)}</div>`;
        }

        static _getMovementSection_getSpeedSection({renderer, entry}) {
            const asList = Renderer.vehicle.ship.getSpeedEntries(entry);
            return `<div class="rd__b--1">${renderer.render(asList)}</div>`;
        }

        static getMovementSection_(renderer, move) {
            if (!move)
                return "";

            return `
				<tr class="mon__stat-header-underline"><td colspan="6"><h3 class="mon__sect-header-inner">${move.isControl ? `Control and ` : ""}Movement: ${move.name}</h3></td></tr>
				<tr><td colspan="6" class="mon__sect-row-inner">
				${Renderer.vehicle.ship.getSectionHpPart_(renderer, move)}
				${(move.locomotion || []).map(entry=>Renderer.vehicle.ship._getMovementSection_getLocomotionSection({
                renderer,
                entry
            })).join("")}
				${(move.speed || []).map(entry=>Renderer.vehicle.ship._getMovementSection_getSpeedSection({
                renderer,
                entry
            })).join("")}
				</td></tr>
			`;
        }

        static getWeaponSection_(renderer, weap) {
            return `
				<tr class="mon__stat-header-underline"><td colspan="6"><h3 class="mon__sect-header-inner">Weapons: ${weap.name}${weap.count ? ` (${weap.count})` : ""}</h3></td></tr>
				<tr><td colspan="6" class="mon__sect-row-inner">
				${Renderer.vehicle.ship.getSectionHpPart_(renderer, weap, !!weap.count)}
				${renderer.render({
                entries: weap.entries
            })}
				</td></tr>
			`;
        }

        static getOtherSection_(renderer, oth) {
            return `
				<tr class="mon__stat-header-underline"><td colspan="6"><h3 class="mon__sect-header-inner">${oth.name}</h3></td></tr>
				<tr><td colspan="6" class="mon__sect-row-inner">
				${Renderer.vehicle.ship.getSectionHpPart_(renderer, oth)}
				${renderer.render({
                entries: oth.entries
            })}
				</td></tr>
			`;
        }

        static getCrewCargoPaceSection_(ent, {entriesMetaShip=null}={}) {
            entriesMetaShip ||= Renderer.vehicle.ship.getVehicleShipRenderableEntriesMeta(ent);
            if (!Renderer.vehicle.ship.PROPS_RENDERABLE_ENTRIES_ATTRIBUTES.some(prop=>entriesMetaShip[prop]))
                return "";

            return `<tr class="text"><td colspan="6">
				${entriesMetaShip.entryCreatureCapacity ? `<div>${Renderer.get().render(entriesMetaShip.entryCreatureCapacity)}</div>` : ""}
				${entriesMetaShip.entryCargoCapacity ? `<div>${Renderer.get().render(entriesMetaShip.entryCargoCapacity)}</div>` : ""}
				${entriesMetaShip.entryTravelPace ? `<div>${Renderer.get().render(entriesMetaShip.entryTravelPace)}</div>` : ""}
				${entriesMetaShip.entryTravelPaceNote ? `<div class="ve-muted ve-small help-subtle ml-2" ${entriesMetaShip.entryTravelPaceNoteTitle ? `title="${entriesMetaShip.entryTravelPaceNote.qq()}"` : ""}>${Renderer.get().render(entriesMetaShip.entryTravelPaceNote)}</div>` : ""}
			</td></tr>`;
        }
    }
    ;

    static spelljammer = class {
        static getVehicleSpelljammerRenderableEntriesMeta(ent) {
            const ptAc = ent.hull?.ac ? `${ent.hull.ac}${ent.hull.acFrom ? ` (${ent.hull.acFrom.join(", ")})` : ""}` : "\u2014";

            const ptSpeed = ent.speed != null ? Parser.getSpeedString(ent, {
                isSkipZeroWalk: true
            }) : "";
            const ptPace = Renderer.vehicle.spelljammer._getVehicleSpelljammerRenderableEntriesMeta_getPtPace({
                ent
            });

            const ptSpeedPace = [ptSpeed, ptPace].filter(Boolean).join(" ");

            return {
                entryTableSummary: {
                    type: "table",
                    style: "summary",
                    colStyles: ["col-6", "col-6"],
                    rows: [[`{@b Armor Class:} ${ptAc}`, `{@b Cargo:} ${ent.capCargo ? `${ent.capCargo} ton${ent.capCargo === 1 ? "" : "s"}` : "\u2014"}`, ], [`{@b Hit Points:} ${ent.hull?.hp ?? "\u2014"}`, `{@b Crew:} ${ent.capCrew ?? "\u2014"}${ent.capCrewNote ? ` ${ent.capCrewNote}` : ""}`, ], [`{@b Damage Threshold:} ${ent.hull?.dt ?? "\u2014"}`, `{@b Keel/Beam:} ${(ent.dimensions || ["\u2014"]).join("/")}`, ], [`{@b Speed:} ${ptSpeedPace}`, `{@b Cost:} ${ent.cost != null ? Parser.vehicleCostToFull(ent) : "\u2014"}`, ], ],
                },
            };
        }

        static _getVehicleSpelljammerRenderableEntriesMeta_getPtPace(ent) {
            if (!ent.pace)
                return "";

            const isMulti = Object.keys(ent.pace).length > 1;

            const out = Parser.SPEED_MODES.map(mode=>{
                const pace = ent.pace[mode];
                if (!pace)
                    return null;

                const asNum = Parser.vulgarToNumber(pace);
                return `{@tip ${isMulti && mode !== "walk" ? `${mode} ` : ""}${pace} mph|${asNum * 24} miles per day}`;
            }
            ).filter(Boolean).join(", ");

            return `(${out})`;
        }

        static getSummarySection_(renderer, ent) {
            const entriesMetaSpelljammer = Renderer.vehicle.spelljammer.getVehicleSpelljammerRenderableEntriesMeta(ent);

            return `<tr><td colspan="6">${renderer.render(entriesMetaSpelljammer.entryTableSummary)}</td></tr>`;
        }

        static getSectionWeaponEntriesMeta(entry) {
            const isMultiple = entry.count != null && entry.count > 1;

            return {
                entryName: `${isMultiple ? `${entry.count} ` : ""}${entry.name}${entry.crew ? ` (Crew: ${entry.crew}${isMultiple ? " each" : ""})` : ""}`,
            };
        }

        static getWeaponSection_(renderer, entry) {
            const entriesMetaSectionWeapon = Renderer.vehicle.spelljammer.getSectionWeaponEntriesMeta(entry);

            const ptAction = entry.action?.length ? entry.action.map(act=>`<div class="mt-1">${renderer.render(act, 2)}</div>`).join("") : "";
            return `
				<tr class="mon__stat-header-underline"><td colspan="6"><h3 class="mon__sect-header-inner">${entriesMetaSectionWeapon.entryName}</h3></td></tr>
				<tr><td colspan="6" class="mon__sect-row-inner">
				${Renderer.vehicle.spelljammer.getSectionHpCostPart_(renderer, entry)}
				${entry.entries?.length ? `<div>${renderer.render({
                entries: entry.entries
            })}</div>` : ""}
				${ptAction}
				</td></tr>
			`;
        }

        static getSectionHpCostEntriesMeta(entry) {
            const ptCosts = entry.costs?.length ? entry.costs.map(cost=>{
                return `${Parser.vehicleCostToFull(cost) || "\u2014"}${cost.note ? ` (${cost.note})` : ""}`;
            }
            ).join(", ") : "\u2014";

            return {
                entryArmorClass: `{@b Armor Class:} ${entry.ac == null ? "\u2014" : entry.ac}`,
                entryHitPoints: `{@b Hit Points:} ${entry.hp == null ? "\u2014" : entry.hp}`,
                entryCost: `{@b Cost:} ${ptCosts}`,
            };
        }

        static getSectionHpCostPart_(renderer, entry) {
            const entriesMetaSectionHpCost = Renderer.vehicle.spelljammer.getSectionHpCostEntriesMeta(entry);

            return `
				<div>${renderer.render(entriesMetaSectionHpCost.entryArmorClass)}</div>
				<div>${renderer.render(entriesMetaSectionHpCost.entryHitPoints)}</div>
				<div class="mb-2">${renderer.render(entriesMetaSectionHpCost.entryCost)}</div>
			`;
        }
    }
    ;

    static _getAbilitySection(veh) {
        return Parser.ABIL_ABVS.some(it=>veh[it] != null) ? `<tr><td colspan="6">
			<table class="w-100 summary stripe-even-table">
				<tr>
					<th class="col-2 ve-text-center">STR</th>
					<th class="col-2 ve-text-center">DEX</th>
					<th class="col-2 ve-text-center">CON</th>
					<th class="col-2 ve-text-center">INT</th>
					<th class="col-2 ve-text-center">WIS</th>
					<th class="col-2 ve-text-center">CHA</th>
				</tr>
				<tr>
					<td class="ve-text-center">${Renderer.utils.getAbilityRoller(veh, "str")}</td>
					<td class="ve-text-center">${Renderer.utils.getAbilityRoller(veh, "dex")}</td>
					<td class="ve-text-center">${Renderer.utils.getAbilityRoller(veh, "con")}</td>
					<td class="ve-text-center">${Renderer.utils.getAbilityRoller(veh, "int")}</td>
					<td class="ve-text-center">${Renderer.utils.getAbilityRoller(veh, "wis")}</td>
					<td class="ve-text-center">${Renderer.utils.getAbilityRoller(veh, "cha")}</td>
				</tr>
			</table>
		</td></tr>` : "";
    }

    static _getResImmVulnSection(ent, {entriesMeta=null}={}) {
        entriesMeta ||= Renderer.vehicle.getVehicleRenderableEntriesMeta(ent);

        const props = ["entryDamageImmunities", "entryConditionImmunities", ];

        if (!props.some(prop=>entriesMeta[prop]))
            return "";

        return `<tr class="text"><td colspan="6">
			${props.filter(prop=>entriesMeta[prop]).map(prop=>`<div>${Renderer.get().render(entriesMeta[prop])}</div>`).join("")}
		</td></tr>`;
    }

    static _getTraitSection(renderer, veh) {
        return veh.trait ? `<tr class="mon__stat-header-underline"><td colspan="6"><h3 class="mon__sect-header-inner">Traits</h3></td></tr>
		<tr><td colspan="6"><div class="border"></div></td></tr>
		<tr class="text"><td colspan="6">
		${Renderer.monster.getOrderedTraits(veh, renderer).map(it=>it.rendered || renderer.render(it, 2)).join("")}
		</td></tr>` : "";
    }

    static _getRenderedString_ship(ent, opts) {
        const renderer = Renderer.get();
        const entriesMeta = Renderer.vehicle.getVehicleRenderableEntriesMeta(ent);
        const entriesMetaShip = Renderer.vehicle.ship.getVehicleShipRenderableEntriesMeta(ent);

        const hasToken = ent.tokenUrl || ent.hasToken;
        const extraThClasses = !opts.isCompact && hasToken ? ["veh__name--token"] : null;

        return `
			${Renderer.utils.getExcludedTr({
            entity: ent,
            dataProp: "vehicle",
            page: UrlUtil.PG_VEHICLES
        })}
			${Renderer.utils.getNameTr(ent, {
            extraThClasses,
            page: UrlUtil.PG_VEHICLES
        })}
			<tr class="text"><td colspan="6">${Renderer.get().render(entriesMetaShip.entrySizeDimensions)}</td></tr>
			${Renderer.vehicle.ship.getCrewCargoPaceSection_(ent, {
            entriesMetaShip
        })}
			${Renderer.vehicle._getAbilitySection(ent)}
			${Renderer.vehicle._getResImmVulnSection(ent, {
            entriesMeta
        })}
			${ent.action ? Renderer.vehicle.ship.getSectionTitle_("Actions") : ""}
			${ent.action ? `<tr><td colspan="6" class="mon__sect-row-inner">${Renderer.vehicle.ship.getActionPart_(renderer, ent)}</td></tr>` : ""}
			${(entriesMetaShip.entriesOtherActions || []).map(Renderer.vehicle.ship.getOtherSection_.bind(this, renderer)).join("")}
			${ent.hull ? `${Renderer.vehicle.ship.getSectionTitle_("Hull")}
			<tr><td colspan="6" class="mon__sect-row-inner">
			${Renderer.vehicle.ship.getSectionHpPart_(renderer, ent.hull)}
			</td></tr>` : ""}
			${Renderer.vehicle._getTraitSection(renderer, ent)}
			${(ent.control || []).map(Renderer.vehicle.ship.getControlSection_.bind(this, renderer)).join("")}
			${(ent.movement || []).map(Renderer.vehicle.ship.getMovementSection_.bind(this, renderer)).join("")}
			${(ent.weapon || []).map(Renderer.vehicle.ship.getWeaponSection_.bind(this, renderer)).join("")}
			${(entriesMetaShip.entriesOtherOthers || []).map(Renderer.vehicle.ship.getOtherSection_.bind(this, renderer)).join("")}
		`;
    }

    static getShipCreatureCapacity(veh) {
        return [veh.capCrew ? `${veh.capCrew} crew` : null, veh.capPassenger ? `${veh.capPassenger} passenger${veh.capPassenger === 1 ? "" : "s"}` : null, ].filter(Boolean).join(", ");
    }

    static getShipCargoCapacity(veh) {
        return typeof veh.capCargo === "string" ? veh.capCargo : `${veh.capCargo} ton${veh.capCargo === 1 ? "" : "s"}`;
    }

    static _getRenderedString_spelljammer(veh, opts) {
        const renderer = Renderer.get();

        const hasToken = veh.tokenUrl || veh.hasToken;
        const extraThClasses = !opts.isCompact && hasToken ? ["veh__name--token"] : null;

        return `
			${Renderer.utils.getExcludedTr({
            entity: veh,
            dataProp: "vehicle",
            page: UrlUtil.PG_VEHICLES
        })}
			${Renderer.utils.getNameTr(veh, {
            extraThClasses,
            page: UrlUtil.PG_VEHICLES
        })}
			${Renderer.vehicle.spelljammer.getSummarySection_(renderer, veh)}
			${(veh.weapon || []).map(Renderer.vehicle.spelljammer.getWeaponSection_.bind(this, renderer)).join("")}
		`;
    }

    static infwar = class {
        static PROPS_RENDERABLE_ENTRIES_ATTRIBUTES = ["entryCreatureCapacity", "entryCargoCapacity", "entryArmorClass", "entryHitPoints", "entrySpeed", ];

        static getVehicleInfwarRenderableEntriesMeta(ent) {
            const dexMod = Parser.getAbilityModNumber(ent.dex);

            return {
                entrySizeWeight: `{@i ${Parser.sizeAbvToFull(ent.size)} vehicle (${ent.weight.toLocaleString()} lb.)}`,
                entryCreatureCapacity: `{@b Creature Capacity} ${Renderer.vehicle.getInfwarCreatureCapacity(ent)}`,
                entryCargoCapacity: `{@b Cargo Capacity} ${Parser.weightToFull(ent.capCargo)}`,
                entryArmorClass: `{@b Armor Class} ${dexMod === 0 ? `19` : `${19 + dexMod} (19 while motionless)`}`,
                entryHitPoints: `{@b Hit Points} ${ent.hp.hp} (damage threshold ${ent.hp.dt}, mishap threshold ${ent.hp.mt})`,
                entrySpeed: `{@b Speed} ${ent.speed} ft.`,
                entrySpeedNote: `[{@b Travel Pace} ${Math.floor(ent.speed / 10)} miles per hour (${Math.floor(ent.speed * 24 / 10)} miles per day)]`,
                entrySpeedNoteTitle: `Based on "Special Travel Pace," DMG p242`,
            };
        }
    }
    ;

    static _getRenderedString_infwar(ent, opts) {
        const renderer = Renderer.get();
        const entriesMeta = Renderer.vehicle.getVehicleRenderableEntriesMeta(ent);
        const entriesMetaInfwar = Renderer.vehicle.infwar.getVehicleInfwarRenderableEntriesMeta(ent);

        const hasToken = ent.tokenUrl || ent.hasToken;
        const extraThClasses = !opts.isCompact && hasToken ? ["veh__name--token"] : null;

        return `
			${Renderer.utils.getExcludedTr({
            entity: ent,
            datProp: "vehicle",
            page: UrlUtil.PG_VEHICLES
        })}
			${Renderer.utils.getNameTr(ent, {
            extraThClasses,
            page: UrlUtil.PG_VEHICLES
        })}
			<tr class="text"><td colspan="6">${renderer.render(entriesMetaInfwar.entrySizeWeight)}</td></tr>
			<tr class="text"><td colspan="6">
				${Renderer.vehicle.infwar.PROPS_RENDERABLE_ENTRIES_ATTRIBUTES.map(prop=>`<div>${renderer.render(entriesMetaInfwar[prop])}</div>`).join("")}
				<div class="ve-muted ve-small help-subtle ml-2" title="${entriesMetaInfwar.entrySpeedNoteTitle.qq()}">${renderer.render(entriesMetaInfwar.entrySpeedNote)}</div>
			</td></tr>
			${Renderer.vehicle._getAbilitySection(ent)}
			${Renderer.vehicle._getResImmVulnSection(ent, {
            entriesMeta
        })}
			${Renderer.vehicle._getTraitSection(renderer, ent)}
			${Renderer.monster.getCompactRenderedStringSection(ent, renderer, "Action Stations", "actionStation", 2)}
			${Renderer.monster.getCompactRenderedStringSection(ent, renderer, "Reactions", "reaction", 2)}
		`;
    }

    static getInfwarCreatureCapacity(veh) {
        return `${veh.capCreature} Medium creatures`;
    }

    static pGetFluff(veh) {
        return Renderer.utils.pGetFluff({
            entity: veh,
            fnGetFluffData: DataUtil.vehicleFluff.loadJSON.bind(DataUtil.vehicleFluff),
            fluffProp: "vehicleFluff",
        });
    }

    static getTokenUrl(veh) {
        return veh.tokenUrl || UrlUtil.link(`${Renderer.get().baseMediaUrls["img"] || Renderer.get().baseUrl}img/vehicles/tokens/${Parser.sourceJsonToAbv(veh.source)}/${Parser.nameToTokenName(veh.name)}.png`);
    }
}
;

Renderer.vehicleUpgrade = class {
    static getUpgradeSummary(ent) {
        return [ent.upgradeType ? ent.upgradeType.map(t=>Parser.vehicleTypeToFull(t)) : null, ent.prerequisite ? Renderer.utils.prerequisite.getHtml(ent.prerequisite) : null, ].filter(Boolean).join(", ");
    }

    static getCompactRenderedString(ent, opts) {
        return `${Renderer.utils.getExcludedTr({
            entity: ent,
            dataProp: "vehicleUpgrade",
            page: UrlUtil.PG_VEHICLES
        })}
		${Renderer.utils.getNameTr(ent, {
            page: UrlUtil.PG_VEHICLES
        })}
		<tr><td colspan="6"><i>${Renderer.vehicleUpgrade.getUpgradeSummary(ent)}</i></td></tr>
		<tr><td class="divider" colspan="6"><div></div></td></tr>
		<tr><td colspan="6">${Renderer.get().render({
            entries: ent.entries
        }, 1)}</td></tr>`;
    }
}
;

Renderer.action = class {
    static getCompactRenderedString(it) {
        const cpy = MiscUtil.copyFast(it);
        delete cpy.name;
        return `${Renderer.utils.getExcludedTr({
            entity: it,
            dataProp: "action",
            page: UrlUtil.PG_ACTIONS
        })}
		${Renderer.utils.getNameTr(it, {
            page: UrlUtil.PG_ACTIONS
        })}
		<tr><td colspan="6">${Renderer.get().setFirstSection(true).render(cpy)}</td></tr>`;
    }
}
;

Renderer.language = class {
    static getLanguageRenderableEntriesMeta(ent) {
        const hasMeta = ent.typicalSpeakers || ent.script;

        const entriesContent = [];

        if (ent.entries)
            entriesContent.push(...ent.entries);
        if (ent.dialects) {
            entriesContent.push(`This language is a family which includes the following dialects: ${ent.dialects.sort(SortUtil.ascSortLower).join(", ")}. Creatures that speak different dialects of the same language can communicate with one another.`);
        }

        if (!entriesContent.length && !hasMeta)
            entriesContent.push("{@i No information available.}");

        return {
            entryType: ent.type ? `{@i ${ent.type.toTitleCase()} language}` : null,
            entryTypicalSpeakers: ent.typicalSpeakers ? `{@b Typical Speakers:} ${ent.typicalSpeakers.join(", ")}` : null,
            entryScript: ent.script ? `{@b Script:} ${ent.script}` : null,
            entriesContent: entriesContent.length ? entriesContent : null,
        };
    }

    static getCompactRenderedString(ent) {
        return Renderer.language.getRenderedString(ent);
    }

    static getRenderedString(ent, {isSkipNameRow=false}={}) {
        const entriesMeta = Renderer.language.getLanguageRenderableEntriesMeta(ent);

        return `
		${Renderer.utils.getExcludedTr({
            entity: ent,
            dataProp: "language",
            page: UrlUtil.PG_LANGUAGES
        })}
		${isSkipNameRow ? "" : Renderer.utils.getNameTr(ent, {
            page: UrlUtil.PG_LANGUAGES
        })}
		${entriesMeta.entryType ? `<tr class="text"><td colspan="6" class="pt-0">${Renderer.get().render(entriesMeta.entryType)}</td></tr>` : ""}
		${entriesMeta.entryTypicalSpeakers || entriesMeta.entryScript ? `<tr class="text"><td colspan="6">
		${[entriesMeta.entryTypicalSpeakers, entriesMeta.entryScript].filter(Boolean).map(entry=>`<div>${Renderer.get().render(entry)}</div>`).join("")}
		</td></tr>` : ""}
		${entriesMeta.entriesContent ? `<tr class="text"><td colspan="6">
		${Renderer.get().setFirstSection(true).render({
            entries: entriesMeta.entriesContent
        })}
		</td></tr>` : ""}`;
    }

    static pGetFluff(it) {
        return Renderer.utils.pGetFluff({
            entity: it,
            fnGetFluffData: DataUtil.languageFluff.loadJSON.bind(DataUtil.languageFluff),
            fluffProp: "languageFluff",
        });
    }
}
;

Renderer.adventureBook = class {
    static getEntryIdLookup(bookData, doThrowError=true) {
        const out = {};
        const titlesRel = {};
        const titlesRelChapter = {};

        let chapIx;
        const depthStack = [];
        const handlers = {
            object: (obj)=>{
                Renderer.ENTRIES_WITH_ENUMERATED_TITLES.forEach(meta=>{
                    if (obj.type !== meta.type)
                        return;

                    const curDepth = depthStack.length ? depthStack.last() : 0;
                    const nxtDepth = meta.depth ? meta.depth : meta.depthIncrement ? curDepth + meta.depthIncrement : curDepth;

                    depthStack.push(Math.min(nxtDepth, 2, ), );

                    if (obj.id) {
                        if (out[obj.id]) {
                            (out.__BAD = out.__BAD || []).push(obj.id);
                        } else {
                            out[obj.id] = {
                                chapter: chapIx,
                                entry: obj,
                                depth: depthStack.last(),
                            };

                            if (obj.name) {
                                out[obj.id].name = obj.name;

                                const cleanName = obj.name.toLowerCase();
                                out[obj.id].nameClean = cleanName;

                                titlesRel[cleanName] = titlesRel[cleanName] || 0;
                                out[obj.id].ixTitleRel = titlesRel[cleanName]++;

                                MiscUtil.getOrSet(titlesRelChapter, chapIx, cleanName, -1);
                                out[obj.id].ixTitleRelChapter = ++titlesRelChapter[chapIx][cleanName];
                            }
                        }
                    }
                }
                );

                return obj;
            }
            ,
            postObject: (obj)=>{
                Renderer.ENTRIES_WITH_ENUMERATED_TITLES.forEach(meta=>{
                    if (obj.type !== meta.type)
                        return;

                    depthStack.pop();
                }
                );
            }
            ,
        };

        bookData.forEach((chap,_chapIx)=>{
            chapIx = _chapIx;
            MiscUtil.getWalker({
                isNoModification: true
            }).walk(chap, handlers);
        }
        );

        if (doThrowError)
            if (out.__BAD)
                throw new Error(`IDs were already in storage: ${out.__BAD.map(it=>`"${it}"`).join(", ")}`);

        return out;
    }

    static _isAltMissingCoverUsed = false;
    static getCoverUrl(contents) {
        return contents.coverUrl || `${Renderer.get().baseMediaUrls["img"] || Renderer.get().baseUrl}img/covers/blank${Math.random() <= 0.05 && !Renderer.adventureBook._isAltMissingCoverUsed && (Renderer.adventureBook._isAltMissingCoverUsed = true) ? "-alt" : ""}.webp`;
    }
}
;

Renderer.charoption = class {
    static getCompactRenderedString(ent) {
        const prerequisite = Renderer.utils.prerequisite.getHtml(ent.prerequisite);
        const preText = Renderer.charoption.getOptionTypePreText(ent);
        return `
		${Renderer.utils.getExcludedTr({
            entity: ent,
            dataProp: "charoption",
            page: UrlUtil.PG_CHAR_CREATION_OPTIONS
        })}
		${Renderer.utils.getNameTr(ent, {
            page: UrlUtil.PG_CHAR_CREATION_OPTIONS
        })}
		<tr class="text"><td colspan="6">
		${prerequisite ? `<p>${prerequisite}</p>` : ""}
		${preText || ""}${Renderer.get().setFirstSection(true).render({
            type: "entries",
            entries: ent.entries
        })}
		</td></tr>
		`;
    }

    static getCharoptionRenderableEntriesMeta(ent) {
        const optsMapped = ent.optionType.map(it=>Renderer.charoption._OPTION_TYPE_ENTRIES[it]).filter(Boolean);
        if (!optsMapped.length)
            return null;

        return {
            entryOptionType: {
                type: "entries",
                entries: optsMapped
            },
        };
    }

    static _OPTION_TYPE_ENTRIES = {
        "RF:B": `{@note You may replace the standard feature of your background with this feature.}`,
        "CS": `{@note See the {@adventure Character Secrets|IDRotF|0|character secrets} section for more information.}`,
    };

    static getOptionTypePreText(ent) {
        const meta = Renderer.charoption.getCharoptionRenderableEntriesMeta(ent);
        if (!meta)
            return "";
        return Renderer.get().render(meta.entryOptionType);
    }

    static pGetFluff(it) {
        return Renderer.utils.pGetFluff({
            entity: it,
            fnGetFluffData: DataUtil.charoptionFluff.loadJSON.bind(DataUtil.charoptionFluff),
            fluffProp: "charoptionFluff",
        });
    }
}
;

Renderer.recipe = class {
    static _getEntryMetasTime(ent) {
        if (!Object.keys(ent.time || {}).length)
            return null;

        return ["total", "preparation", "cooking", ...Object.keys(ent.time), ].unique().filter(prop=>ent.time[prop]).map((prop,i,arr)=>{
            const val = ent.time[prop];

            const ptsTime = (val.min != null && val.max != null ? [Parser.getMinutesToFull(val.min), Parser.getMinutesToFull(val.max), ] : [Parser.getMinutesToFull(val)]);

            const suffix = MiscUtil.findCommonSuffix(ptsTime, {
                isRespectWordBoundaries: true
            });
            const ptTime = ptsTime.map(it=>!suffix.length ? it : it.slice(0, -suffix.length)).join(" to ");

            return {
                entryName: `{@b {@style ${prop.toTitleCase()} Time:|small-caps}}`,
                entryContent: `${ptTime}${suffix}`,
            };
        }
        );
    }

    static getRecipeRenderableEntriesMeta(ent) {
        return {
            entryMakes: ent.makes ? `{@b {@style Makes|small-caps}} ${ent._scaleFactor ? `${ent._scaleFactor}× ` : ""}${ent.makes}` : null,
            entryServes: ent.serves ? `{@b {@style Serves|small-caps}} ${ent.serves.min ?? ent.serves.exact}${ent.serves.min != null ? " to " : ""}${ent.serves.max ?? ""}` : null,
            entryMetasTime: Renderer.recipe._getEntryMetasTime(ent),
            entryIngredients: {
                entries: ent._fullIngredients
            },
            entryEquipment: ent._fullEquipment?.length ? {
                entries: ent._fullEquipment
            } : null,
            entryCooksNotes: ent.noteCook ? {
                entries: ent.noteCook
            } : null,
            entryInstructions: {
                entries: ent.instructions
            },
        };
    }

    static getCompactRenderedString(ent) {
        return `${Renderer.utils.getExcludedTr({
            entity: ent,
            dataProp: "recipe",
            page: UrlUtil.PG_RECIPES
        })}
		${Renderer.utils.getNameTr(ent, {
            page: UrlUtil.PG_RECIPES
        })}
		<tr><td colspan="6">
		${Renderer.recipe.getBodyHtml(ent)}
		</td></tr>`;
    }

    static getBodyHtml(ent) {
        const entriesMeta = Renderer.recipe.getRecipeRenderableEntriesMeta(ent);

        const ptTime = Renderer.recipe.getTimeHtml(ent, {
            entriesMeta
        });
        const {ptMakes, ptServes} = Renderer.recipe.getMakesServesHtml(ent, {
            entriesMeta
        });

        return `<div class="ve-flex w-100 rd-recipes__wrp-recipe">
			<div class="ve-flex-1 ve-flex-col br-1p pr-2">
				${ptTime || ""}

				${ptMakes || ""}
				${ptServes || ""}

				<div class="rd-recipes__wrp-ingredients ${ptMakes || ptServes ? "mt-1" : ""}">${Renderer.get().render(entriesMeta.entryIngredients, 0)}</div>

				${entriesMeta.entryEquipment ? `<div class="rd-recipes__wrp-ingredients mt-4"><div class="ve-flex-vh-center bold mb-1 small-caps">Equipment</div><div>${Renderer.get().render(entriesMeta.entryEquipment)}</div></div>` : ""}

				${entriesMeta.entryCooksNotes ? `<div class="w-100 ve-flex-col mt-4"><div class="ve-flex-vh-center bold mb-1 small-caps">Cook's Notes</div><div class="italic">${Renderer.get().render(entriesMeta.entryCooksNotes)}</div></div>` : ""}
			</div>

			<div class="pl-2 ve-flex-2 rd-recipes__wrp-instructions overflow-x-auto">
				${Renderer.get().setFirstSection(true).render(entriesMeta.entryInstructions, 2)}
			</div>
		</div>`;
    }

    static getMakesServesHtml(ent, {entriesMeta=null}={}) {
        entriesMeta ||= Renderer.recipe.getRecipeRenderableEntriesMeta(ent);
        const ptMakes = entriesMeta.entryMakes ? `<div class="mb-2">${Renderer.get().render(entriesMeta.entryMakes)}</div>` : null;
        const ptServes = entriesMeta.entryServes ? `<div class="mb-2">${Renderer.get().render(entriesMeta.entryServes)}</div>` : null;
        return {
            ptMakes,
            ptServes
        };
    }

    static getTimeHtml(ent, {entriesMeta=null}={}) {
        entriesMeta ||= Renderer.recipe.getRecipeRenderableEntriesMeta(ent);
        if (!entriesMeta.entryMetasTime)
            return "";

        return entriesMeta.entryMetasTime.map(({entryName, entryContent},i,arr)=>{
            return `<div class="split-v-center ${i === arr.length - 1 ? "mb-2" : "mb-1p"}">
					${Renderer.get().render(entryName)}
					<span>${Renderer.get().render(entryContent)}</span>
				</div>`;
        }
        ).join("");
    }

    static pGetFluff(it) {
        return Renderer.utils.pGetFluff({
            entity: it,
            fnGetFluffData: DataUtil.recipeFluff.loadJSON.bind(DataUtil.recipeFluff),
            fluffProp: "recipeFluff",
        });
    }

    static populateFullIngredients(r) {
        r._fullIngredients = Renderer.applyAllProperties(MiscUtil.copyFast(r.ingredients));
        if (r.equipment)
            r._fullEquipment = Renderer.applyAllProperties(MiscUtil.copyFast(r.equipment));
    }

    static _RE_AMOUNT = /(?<tagAmount>{=amount\d+(?:\/[^}]+)?})/g;
    static _SCALED_PRECISION_LIMIT = 10 ** 6;
    static getScaledRecipe(r, scaleFactor) {
        const cpyR = MiscUtil.copyFast(r);

        ["ingredients", "equipment"].forEach(prop=>{
            if (!cpyR[prop])
                return;

            MiscUtil.getWalker({
                keyBlocklist: MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST
            }).walk(cpyR[prop], {
                object: (obj)=>{
                    if (obj.type !== "ingredient")
                        return obj;

                    const objOriginal = MiscUtil.copyFast(obj);

                    Object.keys(obj).filter(k=>/^amount\d+/.test(k)).forEach(k=>{
                        let base = obj[k];

                        if (Math.round(base) !== base && base < 20) {
                            const divOneSixth = obj[k] / 0.166;
                            if (Math.abs(divOneSixth - Math.round(divOneSixth)) < 0.05)
                                base = (1 / 6) * Math.round(divOneSixth);
                        }

                        let scaled = base * scaleFactor;
                        obj[k] = Math.round(base * scaleFactor * Renderer.recipe._SCALED_PRECISION_LIMIT) / Renderer.recipe._SCALED_PRECISION_LIMIT;
                    }
                    );

                    const amountsOriginal = Object.keys(objOriginal).filter(k=>/^amount\d+$/.test(k)).map(k=>objOriginal[k]);
                    const amountsScaled = Object.keys(obj).filter(k=>/^amount\d+$/.test(k)).map(k=>obj[k]);

                    const entryParts = obj.entry.split(Renderer.recipe._RE_AMOUNT).filter(Boolean);
                    const entryPartsOut = entryParts.slice(0, entryParts.findIndex(it=>Renderer.recipe._RE_AMOUNT.test(it)) + 1);
                    let ixAmount = 0;
                    for (let i = entryPartsOut.length; i < entryParts.length; ++i) {
                        let pt = entryParts[i];

                        if (Renderer.recipe._RE_AMOUNT.test(pt)) {
                            ixAmount++;
                            entryPartsOut.push(pt);
                            continue;
                        }

                        if (amountsOriginal[ixAmount] == null || amountsScaled[ixAmount] == null) {
                            entryPartsOut.push(pt);
                            continue;
                        }

                        const isSingleToPlural = amountsOriginal[ixAmount] <= 1 && amountsScaled[ixAmount] > 1;
                        const isPluralToSingle = amountsOriginal[ixAmount] > 1 && amountsScaled[ixAmount] <= 1;

                        if (!isSingleToPlural && !isPluralToSingle) {
                            entryPartsOut.push(pt);
                            continue;
                        }

                        if (isSingleToPlural)
                            pt = Renderer.recipe._getPluralizedUnits(pt);
                        else if (isPluralToSingle)
                            pt = Renderer.recipe._getSingleizedUnits(pt);
                        entryPartsOut.push(pt);
                    }

                    obj.entry = entryPartsOut.join("");

                    Renderer.recipe._mutWrapOriginalAmounts({
                        obj,
                        objOriginal
                    });

                    return obj;
                }
                ,
            }, );
        }
        );

        Renderer.recipe.populateFullIngredients(cpyR);

        if (cpyR.serves) {
            if (cpyR.serves.min)
                cpyR.serves.min *= scaleFactor;
            if (cpyR.serves.max)
                cpyR.serves.max *= scaleFactor;
            if (cpyR.serves.exact)
                cpyR.serves.exact *= scaleFactor;
        }

        cpyR._displayName = `${cpyR.name} (×${scaleFactor})`;
        cpyR._scaleFactor = scaleFactor;

        return cpyR;
    }

    static _UNITS_SINGLE_TO_PLURAL_S = ["bundle", "cup", "handful", "ounce", "packet", "piece", "pound", "slice", "sprig", "square", "strip", "tablespoon", "teaspoon", "wedge", ];
    static _UNITS_SINGLE_TO_PLURAL_ES = ["dash", "inch", ];
    static _FNS_SINGLE_TO_PLURAL = [];
    static _FNS_PLURAL_TO_SINGLE = [];

    static _getSingleizedUnits(str) {
        if (!Renderer.recipe._FNS_PLURAL_TO_SINGLE.length) {
            Renderer.recipe._FNS_PLURAL_TO_SINGLE = [...Renderer.recipe._UNITS_SINGLE_TO_PLURAL_S.map(word=>str=>str.replace(new RegExp(`\\b${word.escapeRegexp()}s\\b`,"gi"), (...m)=>m[0].slice(0, -1))), ...Renderer.recipe._UNITS_SINGLE_TO_PLURAL_ES.map(word=>str=>str.replace(new RegExp(`\\b${word.escapeRegexp()}es\\b`,"gi"), (...m)=>m[0].slice(0, -2))), ];
        }

        Renderer.recipe._FNS_PLURAL_TO_SINGLE.forEach(fn=>str = fn(str));

        return str;
    }

    static _getPluralizedUnits(str) {
        if (!Renderer.recipe._FNS_SINGLE_TO_PLURAL.length) {
            Renderer.recipe._FNS_SINGLE_TO_PLURAL = [...Renderer.recipe._UNITS_SINGLE_TO_PLURAL_S.map(word=>str=>str.replace(new RegExp(`\\b${word.escapeRegexp()}\\b`,"gi"), (...m)=>`${m[0]}s`)), ...Renderer.recipe._UNITS_SINGLE_TO_PLURAL_ES.map(word=>str=>str.replace(new RegExp(`\\b${word.escapeRegexp()}\\b`,"gi"), (...m)=>`${m[0]}es`)), ];
        }

        Renderer.recipe._FNS_SINGLE_TO_PLURAL.forEach(fn=>str = fn(str));

        return str;
    }

    static _mutWrapOriginalAmounts({obj, objOriginal}) {
        const parts = [];
        let stack = "";
        let depth = 0;
        for (let i = 0; i < obj.entry.length; ++i) {
            const c = obj.entry[i];
            switch (c) {
            case "{":
                {
                    if (!depth && stack) {
                        parts.push(stack);
                        stack = "";
                    }
                    depth++;
                    stack += c;
                    break;
                }
            case "}":
                {
                    depth--;
                    stack += c;
                    if (!depth && stack) {
                        parts.push(stack);
                        stack = "";
                    }
                    break;
                }
            default:
                stack += c;
            }
        }
        if (stack)
            parts.push(stack);
        obj.entry = parts.map(pt=>pt.replace(Renderer.recipe._RE_AMOUNT, (...m)=>{
            const ixStart = m.slice(-3, -2)[0];
            if (ixStart !== 0 || m[0].length !== pt.length)
                return m[0];

            const originalValue = Renderer.applyProperties(m.last().tagAmount, objOriginal);
            return `{@help ${m.last().tagAmount}|In the original recipe: ${originalValue}}`;
        }
        )).join("");
    }

    static getCustomHashId(it) {
        if (!it._scaleFactor)
            return null;

        const {name, source, _scaleFactor: scaleFactor, } = it;

        return [name, source, scaleFactor ?? "", ].join("__").toLowerCase();
    }

    static getUnpackedCustomHashId(customHashId) {
        if (!customHashId)
            return null;

        const [,,scaleFactor] = customHashId.split("__").map(it=>it.trim());

        if (!scaleFactor)
            return null;

        return {
            _scaleFactor: scaleFactor ? Number(scaleFactor) : null,
            customHashId,
        };
    }

    static async pGetModifiedRecipe(ent, customHashId) {
        if (!customHashId)
            return ent;
        const {_scaleFactor} = Renderer.recipe.getUnpackedCustomHashId(customHashId);
        if (_scaleFactor == null)
            return ent;
        return Renderer.recipe.getScaledRecipe(ent, _scaleFactor);
    }
}
;

Renderer.card = class {
    static getFullEntries(ent) {
        const entries = [...ent.entries || []];
        if (ent.suit && (ent.valueName || ent.value)) {
            const suitAndValue = `${((ent.valueName || "") || Parser.numberToText(ent.value)).toTitleCase()} of ${ent.suit.toTitleCase()}`;
            if (suitAndValue.toLowerCase() !== ent.name.toLowerCase())
                entries.unshift(`{@i ${suitAndValue}}`);
        }
        return entries;
    }

    static getCompactRenderedString(ent) {
        const fullEntries = Renderer.card.getFullEntries(ent);
        return `
			${Renderer.utils.getNameTr(ent)}
			<tr class="text"><td colspan="6">
			${Renderer.get().setFirstSection(true).render({
            ...ent.face,
            maxHeight: 40,
            maxHeightUnits: "vh"
        })}
			${fullEntries?.length ? `<hr class="hr-3">
			${Renderer.get().setFirstSection(true).render({
            type: "entries",
            entries: fullEntries
        }, 1)}` : ""}
			</td></tr>
		`;
    }
}
;

Renderer.deck = class {
    static getCompactRenderedString(ent) {
        const lstCards = {
            name: "Cards",
            entries: [{
                type: "list",
                columns: 3,
                items: ent.cards.map(card=>`{@card ${card.name}|${card.set}|${card.source}}`),
            }, ],
        };

        return `
			${Renderer.utils.getNameTr(ent)}
			<tr class="text"><td colspan="6">
			${Renderer.get().setFirstSection(true).render({
            type: "entries",
            entries: ent.entries
        }, 1)}
			<hr class="hr-3">
			${Renderer.get().setFirstSection(true).render(lstCards, 1)}
			</td></tr>
		`;
    }
}
;

Renderer.skill = class {
    static getCompactRenderedString(ent) {
        return Renderer.generic.getCompactRenderedString(ent);
    }
}
;

Renderer.sense = class {
    static getCompactRenderedString(ent) {
        return Renderer.generic.getCompactRenderedString(ent);
    }
}
;

Renderer.itemMastery = class {
    static getCompactRenderedString(ent) {
        return Renderer.generic.getCompactRenderedString(ent);
    }
}
;

Renderer.generic = class {
    static getCompactRenderedString(ent, opts) {
        opts = opts || {};
        const prerequisite = Renderer.utils.prerequisite.getHtml(ent.prerequisite);

        return `
		${opts.dataProp && opts.page ? Renderer.utils.getExcludedTr({
            entity: ent,
            dataProp: opts.dataProp,
            page: opts.page
        }) : ""}
		${opts.isSkipNameRow ? "" : Renderer.utils.getNameTr(ent, {
            page: opts.page
        })}
		<tr class="text"><td colspan="6">
		${prerequisite ? `<p>${prerequisite}</p>` : ""}
		${Renderer.get().setFirstSection(true).render({
            entries: ent.entries
        })}
		</td></tr>
		${opts.isSkipPageRow ? "" : Renderer.utils.getPageTr(ent)}`;
    }

    static FEATURE__SKILLS_ALL = Object.keys(Parser.SKILL_TO_ATB_ABV).sort(SortUtil.ascSortLower);

    static FEATURE__TOOLS_ARTISANS = ["alchemist's supplies", "brewer's supplies", "calligrapher's supplies", "carpenter's tools", "cartographer's tools", "cobbler's tools", "cook's utensils", "glassblower's tools", "jeweler's tools", "leatherworker's tools", "mason's tools", "painter's supplies", "potter's tools", "smith's tools", "tinker's tools", "weaver's tools", "woodcarver's tools", ];
    static FEATURE__TOOLS_MUSICAL_INSTRUMENTS = ["bagpipes", "drum", "dulcimer", "flute", "horn", "lute", "lyre", "pan flute", "shawm", "viol", ];
    static FEATURE__TOOLS_ALL = ["artisan's tools",
    ...this.FEATURE__TOOLS_ARTISANS, ...this.FEATURE__TOOLS_MUSICAL_INSTRUMENTS,
    "disguise kit", "forgery kit", "gaming set", "herbalism kit", "musical instrument", "navigator's tools", "thieves' tools", "poisoner's kit", "vehicles (land)", "vehicles (water)", "vehicles (air)", "vehicles (space)", ];

    static FEATURE__LANGUAGES_ALL = Parser.LANGUAGES_ALL.map(it=>it.toLowerCase());
    static FEATURE__LANGUAGES_STANDARD__CHOICE_OBJ = {
        from: [...Parser.LANGUAGES_STANDARD.map(it=>({
            name: it.toLowerCase(),
            prop: "languageProficiencies",
            group: "languagesStandard",
        })), ...Parser.LANGUAGES_EXOTIC.map(it=>({
            name: it.toLowerCase(),
            prop: "languageProficiencies",
            group: "languagesExotic",
        })), ...Parser.LANGUAGES_SECRET.map(it=>({
            name: it.toLowerCase(),
            prop: "languageProficiencies",
            group: "languagesSecret",
        })), ],
        groups: {
            languagesStandard: {
                name: "Standard Languages",
            },
            languagesExotic: {
                name: "Exotic Languages",
                hint: "With your DM's permission, you can choose an exotic language.",
            },
            languagesSecret: {
                name: "Secret Languages",
                hint: "With your DM's permission, you can choose a secret language.",
            },
        },
    };

    static FEATURE__SAVING_THROWS_ALL = [...Parser.ABIL_ABVS];

    static _SKILL_TOOL_LANGUAGE_KEYS__SKILL_ANY = new Set(["anySkill"]);
    static _SKILL_TOOL_LANGUAGE_KEYS__TOOL_ANY = new Set(["anyTool", "anyArtisansTool"]);
    static _SKILL_TOOL_LANGUAGE_KEYS__LANGAUGE_ANY = new Set(["anyLanguage", "anyStandardLanguage", "anyExoticLanguage"]);

    static getSkillSummary({skillProfs, skillToolLanguageProfs, isShort=false}) {
        return this._summariseProfs({
            profGroupArr: skillProfs,
            skillToolLanguageProfs,
            setValid: new Set(this.FEATURE__SKILLS_ALL),
            setValidAny: this._SKILL_TOOL_LANGUAGE_KEYS__SKILL_ANY,
            isShort,
            hoverTag: "skill",
        });
    }

    static getToolSummary({toolProfs, skillToolLanguageProfs, isShort=false}) {
        return this._summariseProfs({
            profGroupArr: toolProfs,
            skillToolLanguageProfs,
            setValid: new Set(this.FEATURE__TOOLS_ALL),
            setValidAny: this._SKILL_TOOL_LANGUAGE_KEYS__TOOL_ANY,
            isShort,
        });
    }

    static getLanguageSummary({languageProfs, skillToolLanguageProfs, isShort=false}) {
        return this._summariseProfs({
            profGroupArr: languageProfs,
            skillToolLanguageProfs,
            setValid: new Set(this.FEATURE__LANGUAGES_ALL),
            setValidAny: this._SKILL_TOOL_LANGUAGE_KEYS__LANGAUGE_ANY,
            isShort,
        });
    }

    static _summariseProfs({profGroupArr, skillToolLanguageProfs, setValid, setValidAny, isShort, hoverTag}) {
        if (!profGroupArr?.length && !skillToolLanguageProfs?.length)
            return {
                summary: "",
                collection: []
            };

        const collectionSet = new Set();

        const handleProfGroup = (profGroup,{isValidate=true}={})=>{
            let sep = ", ";

            const toJoin = Object.entries(profGroup).sort(([kA],[kB])=>this._summariseProfs_sortKeys(kA, kB)).filter(([k,v])=>v && (!isValidate || setValid.has(k) || setValidAny.has(k))).map(([k,v],i)=>{
                const vMapped = this.getMappedAnyProficiency({
                    keyAny: k,
                    countRaw: v
                }) ?? v;

                if (k === "choose") {
                    sep = "; ";

                    const chooseProfs = vMapped.from.filter(s=>!isValidate || setValid.has(s)).map(s=>{
                        collectionSet.add(s);
                        return this._summariseProfs_getEntry({
                            str: s,
                            isShort,
                            hoverTag
                        });
                    }
                    );
                    return `${isShort ? `${i === 0 ? "C" : "c"}hoose ` : ""}${v.count || 1} ${isShort ? `of` : `from`} ${chooseProfs.joinConjunct(", ", " or ")}`;
                }

                collectionSet.add(k);
                return this._summariseProfs_getEntry({
                    str: k,
                    isShort,
                    hoverTag
                });
            }
            );

            return toJoin.join(sep);
        }
        ;

        const summary = [...(profGroupArr || []).map(profGroup=>handleProfGroup(profGroup, {
            isValidate: false
        })), ...(skillToolLanguageProfs || []).map(profGroup=>handleProfGroup(profGroup)), ].filter(Boolean).join(` <i>or</i> `);

        return {
            summary,
            collection: [...collectionSet].sort(SortUtil.ascSortLower)
        };
    }

    static _summariseProfs_sortKeys(a, b, {setValidAny=null}={}) {
        if (a === b)
            return 0;
        if (a === "choose")
            return 2;
        if (b === "choose")
            return -2;
        if (setValidAny) {
            if (setValidAny.has(a))
                return 1;
            if (setValidAny.has(b))
                return -1;
        }
        return SortUtil.ascSort(a, b);
    }

    static _summariseProfs_getEntry({str, isShort, hoverTag}) {
        return isShort ? str.toTitleCase() : hoverTag ? `{@${hoverTag} ${str.toTitleCase()}}` : str.toTitleCase();
    }

    static getMappedAnyProficiency({keyAny, countRaw}) {
        const mappedCount = !isNaN(countRaw) ? Number(countRaw) : 1;
        if (mappedCount <= 0)
            return null;

        switch (keyAny) {
        case "anySkill":
            return {
                name: mappedCount === 1 ? `Any Skill` : `Any ${mappedCount} Skills`,
                from: this.FEATURE__SKILLS_ALL.map(it=>({
                    name: it,
                    prop: "skillProficiencies"
                })),
                count: mappedCount,
            };
        case "anyTool":
            return {
                name: mappedCount === 1 ? `Any Tool` : `Any ${mappedCount} Tools`,
                from: this.FEATURE__TOOLS_ALL.map(it=>({
                    name: it,
                    prop: "toolProficiencies"
                })),
                count: mappedCount,
            };
        case "anyArtisansTool":
            return {
                name: mappedCount === 1 ? `Any Artisan's Tool` : `Any ${mappedCount} Artisan's Tools`,
                from: this.FEATURE__TOOLS_ARTISANS.map(it=>({
                    name: it,
                    prop: "toolProficiencies"
                })),
                count: mappedCount,
            };
        case "anyMusicalInstrument":
            return {
                name: mappedCount === 1 ? `Any Musical Instrument` : `Any ${mappedCount} Musical Instruments`,
                from: this.FEATURE__TOOLS_MUSICAL_INSTRUMENTS.map(it=>({
                    name: it,
                    prop: "toolProficiencies"
                })),
                count: mappedCount,
            };
        case "anyLanguage":
            return {
                name: mappedCount === 1 ? `Any Language` : `Any ${mappedCount} Languages`,
                from: this.FEATURE__LANGUAGES_ALL.map(it=>({
                    name: it,
                    prop: "languageProficiencies"
                })),
                count: mappedCount,
            };
        case "anyStandardLanguage":
            return {
                name: mappedCount === 1 ? `Any Standard Language` : `Any ${mappedCount} Standard Languages`,
                ...MiscUtil.copyFast(this.FEATURE__LANGUAGES_STANDARD__CHOICE_OBJ),
                count: mappedCount,
            };
        case "anyExoticLanguage":
            return {
                name: mappedCount === 1 ? `Any Exotic Language` : `Any ${mappedCount} Exotic Languages`,
                ...MiscUtil.copyFast(this.FEATURE__LANGUAGES_STANDARD__CHOICE_OBJ),
                count: mappedCount,
            };
        case "anySavingThrow":
            return {
                name: mappedCount === 1 ? `Any Saving Throw` : `Any ${mappedCount} Saving Throws`,
                from: this.FEATURE__SAVING_THROWS_ALL.map(it=>({
                    name: it,
                    prop: "savingThrowProficiencies"
                })),
                count: mappedCount,
            };

        case "anyWeapon":
            throw new Error(`Property handling for "anyWeapon" is unimplemented!`);
        case "anyArmor":
            throw new Error(`Property handling for "anyArmor" is unimplemented!`);

        default:
            return null;
        }
    }
}
;

Renderer.hover = {
    LinkMeta: function() {
        this.isHovered = false;
        this.isLoading = false;
        this.isPermanent = false;
        this.windowMeta = null;
    },

    _BAR_HEIGHT: 16,

    _linkCache: {},
    _eleCache: new Map(),
    _entryCache: {},
    _isInit: false,
    _dmScreen: null,
    _lastId: 0,
    _contextMenu: null,
    _contextMenuLastClicked: null,

    bindDmScreen(screen) {
        this._dmScreen = screen;
    },

    _getNextId() {
        return ++Renderer.hover._lastId;
    },

    _doInit() {
        if (!Renderer.hover._isInit) {
            Renderer.hover._isInit = true;

            $(document.body).on("click", ()=>Renderer.hover.cleanTempWindows());

            Renderer.hover._contextMenu = ContextUtil.getMenu([new ContextUtil.Action("Maximize All",()=>{
                const $permWindows = $(`.hoverborder[data-perm="true"]`);
                $permWindows.attr("data-display-title", "false");
            }
            ,), new ContextUtil.Action("Minimize All",()=>{
                const $permWindows = $(`.hoverborder[data-perm="true"]`);
                $permWindows.attr("data-display-title", "true");
            }
            ,), null, new ContextUtil.Action("Close Others",()=>{
                const hoverId = Renderer.hover._contextMenuLastClicked?.hoverId;
                Renderer.hover._doCloseAllWindows({
                    hoverIdBlocklist: new Set([hoverId])
                });
            }
            ,), new ContextUtil.Action("Close All",()=>Renderer.hover._doCloseAllWindows(),), ]);
        }
    },

    cleanTempWindows() {
        for (const [key,meta] of Renderer.hover._eleCache.entries()) {
            if (!meta.isPermanent && meta.windowMeta && typeof key === "number") {
                meta.windowMeta.doClose();
                Renderer.hover._eleCache.delete(key);
                return;
            }

            if (!meta.isPermanent && meta.windowMeta && !document.body.contains(key)) {
                meta.windowMeta.doClose();
                return;
            }

            if (!meta.isPermanent && meta.isHovered && meta.windowMeta) {
                const bounds = key.getBoundingClientRect();
                if (EventUtil._mouseX < bounds.x || EventUtil._mouseY < bounds.y || EventUtil._mouseX > bounds.x + bounds.width || EventUtil._mouseY > bounds.y + bounds.height) {
                    meta.windowMeta.doClose();
                }
            }
        }
    },

    _doCloseAllWindows({hoverIdBlocklist=null}={}) {
        Object.entries(Renderer.hover._WINDOW_METAS).filter(([hoverId,meta])=>hoverIdBlocklist == null || !hoverIdBlocklist.has(Number(hoverId))).forEach(([,meta])=>meta.doClose());
    },

    _getSetMeta(ele) {
        if (!Renderer.hover._eleCache.has(ele))
            Renderer.hover._eleCache.set(ele, new Renderer.hover.LinkMeta());
        return Renderer.hover._eleCache.get(ele);
    },

    _handleGenericMouseOverStart({evt, ele}) {
        if (Renderer.hover.isSmallScreen(evt) && !evt.shiftKey)
            return;

        Renderer.hover.cleanTempWindows();

        const meta = Renderer.hover._getSetMeta(ele);
        if (meta.isHovered || meta.isLoading)
            return;
        ele.style.cursor = "progress";

        meta.isHovered = true;
        meta.isLoading = true;
        meta.isPermanent = evt.shiftKey;

        return meta;
    },

    _doPredefinedShowStart({entryId}) {
        Renderer.hover.cleanTempWindows();

        const meta = Renderer.hover._getSetMeta(entryId);

        meta.isPermanent = true;

        return meta;
    },

    async pHandleLinkMouseOver(evt, ele, opts) {
        Renderer.hover._doInit();

        let page, source, hash, preloadId, customHashId, isFauxPage;
        if (opts) {
            page = opts.page;
            source = opts.source;
            hash = opts.hash;
            preloadId = opts.preloadId;
            customHashId = opts.customHashId;
            isFauxPage = !!opts.isFauxPage;
        } else {
            page = ele.dataset.vetPage;
            source = ele.dataset.vetSource;
            hash = ele.dataset.vetHash;
            preloadId = ele.dataset.vetPreloadId;
            isFauxPage = ele.dataset.vetIsFauxPage;
        }

        let meta = Renderer.hover._handleGenericMouseOverStart({
            evt,
            ele
        });
        if (meta == null)
            return;

        if ((EventUtil.isCtrlMetaKey(evt)) && Renderer.hover._pageToFluffFn(page))
            meta.isFluff = true;

        let toRender;
        if (preloadId != null) {
            switch (page) {
            case UrlUtil.PG_BESTIARY:
                {
                    const {_scaledCr: scaledCr, _scaledSpellSummonLevel: scaledSpellSummonLevel, _scaledClassSummonLevel: scaledClassSummonLevel} = Renderer.monster.getUnpackedCustomHashId(preloadId);

                    const baseMon = await DataLoader.pCacheAndGet(page, source, hash);
                    if (scaledCr != null) {
                        toRender = await ScaleCreature.scale(baseMon, scaledCr);
                    } else if (scaledSpellSummonLevel != null) {
                        toRender = await ScaleSpellSummonedCreature.scale(baseMon, scaledSpellSummonLevel);
                    } else if (scaledClassSummonLevel != null) {
                        toRender = await ScaleClassSummonedCreature.scale(baseMon, scaledClassSummonLevel);
                    }
                    break;
                }
            }
        } else if (customHashId) {
            toRender = await DataLoader.pCacheAndGet(page, source, hash);
            toRender = await Renderer.hover.pApplyCustomHashId(page, toRender, customHashId);
        } else {
            if (meta.isFluff)
                toRender = await Renderer.hover.pGetHoverableFluff(page, source, hash);
            else
                toRender = await DataLoader.pCacheAndGet(page, source, hash);
        }

        meta.isLoading = false;

        if (opts?.isDelay) {
            meta.isDelayed = true;
            ele.style.cursor = "help";
            await MiscUtil.pDelay(1100);
            meta.isDelayed = false;
        }

        ele.style.cursor = "";

        if (!meta || (!meta.isHovered && !meta.isPermanent))
            return;

        const tmpEvt = meta._tmpEvt;
        delete meta._tmpEvt;

        const win = (evt.view || {}).window;

        const $content = meta.isFluff ? Renderer.hover.$getHoverContent_fluff(page, toRender) : Renderer.hover.$getHoverContent_stats(page, toRender);

        const compactReferenceData = {
            page,
            source,
            hash,
        };

        if (meta.windowMeta && !meta.isPermanent) {
            meta.windowMeta.doClose();
            meta.windowMeta = null;
        }

        meta.windowMeta = Renderer.hover.getShowWindow($content, Renderer.hover.getWindowPositionFromEvent(tmpEvt || evt, {
            isPreventFlicker: !meta.isPermanent
        }), {
            title: toRender ? toRender.name : "",
            isPermanent: meta.isPermanent,
            pageUrl: isFauxPage ? null : `${Renderer.get().baseUrl}${page}#${hash}`,
            cbClose: ()=>meta.isHovered = meta.isPermanent = meta.isLoading = meta.isFluff = false,
            isBookContent: page === UrlUtil.PG_RECIPES,
            compactReferenceData,
            sourceData: toRender,
        }, );

        if (!meta.isFluff && !win?._IS_POPOUT) {
            const fnBind = Renderer.hover.getFnBindListenersCompact(page);
            if (fnBind)
                fnBind(toRender, $content);
        }
    },

    handleInlineMouseOver(evt, ele, entry, opts) {
        Renderer.hover._doInit();

        entry = entry || JSON.parse(ele.dataset.vetEntry);

        let meta = Renderer.hover._handleGenericMouseOverStart({
            evt,
            ele
        });
        if (meta == null)
            return;

        meta.isLoading = false;

        ele.style.cursor = "";

        if (!meta || (!meta.isHovered && !meta.isPermanent))
            return;

        const tmpEvt = meta._tmpEvt;
        delete meta._tmpEvt;

        const win = (evt.view || {}).window;

        const $content = Renderer.hover.$getHoverContent_generic(entry, opts);

        if (meta.windowMeta && !meta.isPermanent) {
            meta.windowMeta.doClose();
            meta.windowMeta = null;
        }

        meta.windowMeta = Renderer.hover.getShowWindow($content, Renderer.hover.getWindowPositionFromEvent(tmpEvt || evt, {
            isPreventFlicker: !meta.isPermanent
        }), {
            title: entry?.name || "",
            isPermanent: meta.isPermanent,
            pageUrl: null,
            cbClose: ()=>meta.isHovered = meta.isPermanent = meta.isLoading = false,
            isBookContent: true,
            sourceData: entry,
        }, );
    },

    async pGetHoverableFluff(page, source, hash, opts) {
        let toRender = await DataLoader.pCacheAndGet(`${page}Fluff`, source, hash, opts);

        if (!toRender) {
            const entity = await DataLoader.pCacheAndGet(page, source, hash, opts);

            const pFnGetFluff = Renderer.hover._pageToFluffFn(page);
            if (!pFnGetFluff && opts?.isSilent)
                return null;

            toRender = await pFnGetFluff(entity);
        }

        if (!toRender)
            return toRender;

        if (toRender && (!toRender.name || !toRender.source)) {
            const toRenderParent = await DataLoader.pCacheAndGet(page, source, hash, opts);
            toRender = MiscUtil.copyFast(toRender);
            toRender.name = toRenderParent.name;
            toRender.source = toRenderParent.source;
        }

        return toRender;
    },

    handleLinkMouseLeave(evt, ele) {
        const meta = Renderer.hover._eleCache.get(ele);
        ele.style.cursor = "";

        if (!meta || meta.isPermanent)
            return;

        if (evt.shiftKey) {
            meta.isPermanent = true;
            meta.windowMeta.setIsPermanent(true);
            return;
        }

        meta.isHovered = false;
        if (meta.windowMeta) {
            meta.windowMeta.doClose();
            meta.windowMeta = null;
        }
    },

    handleLinkMouseMove(evt, ele) {
        const meta = Renderer.hover._eleCache.get(ele);
        if (!meta || meta.isPermanent)
            return;

        if (meta.isDelayed) {
            meta._tmpEvt = evt;
            return;
        }

        if (!meta.windowMeta)
            return;

        meta.windowMeta.setPosition(Renderer.hover.getWindowPositionFromEvent(evt, {
            isPreventFlicker: !evt.shiftKey && !meta.isPermanent
        }));

        if (evt.shiftKey && !meta.isPermanent) {
            meta.isPermanent = true;
            meta.windowMeta.setIsPermanent(true);
        }
    },

    handlePredefinedMouseOver(evt, ele, entryId, opts) {
        opts = opts || {};

        const meta = Renderer.hover._handleGenericMouseOverStart({
            evt,
            ele
        });
        if (meta == null)
            return;

        Renderer.hover.cleanTempWindows();

        const toRender = Renderer.hover._entryCache[entryId];

        meta.isLoading = false;
        if (!meta.isHovered && !meta.isPermanent)
            return;

        const $content = Renderer.hover.$getHoverContent_generic(toRender, opts);
        meta.windowMeta = Renderer.hover.getShowWindow($content, Renderer.hover.getWindowPositionFromEvent(evt, {
            isPreventFlicker: !meta.isPermanent
        }), {
            title: toRender.data && toRender.data.hoverTitle != null ? toRender.data.hoverTitle : toRender.name,
            isPermanent: meta.isPermanent,
            cbClose: ()=>meta.isHovered = meta.isPermanent = meta.isLoading = false,
            sourceData: toRender,
        }, );

        ele.style.cursor = "";
    },

    doPredefinedShow(entryId, opts) {
        opts = opts || {};

        const meta = Renderer.hover._doPredefinedShowStart({
            entryId
        });
        if (meta == null)
            return;

        Renderer.hover.cleanTempWindows();

        const toRender = Renderer.hover._entryCache[entryId];

        const $content = Renderer.hover.$getHoverContent_generic(toRender, opts);
        meta.windowMeta = Renderer.hover.getShowWindow($content, Renderer.hover.getWindowPositionExact((window.innerWidth / 2) - (Renderer.hover._DEFAULT_WIDTH_PX / 2), 100), {
            title: toRender.data && toRender.data.hoverTitle != null ? toRender.data.hoverTitle : toRender.name,
            isPermanent: meta.isPermanent,
            cbClose: ()=>meta.isHovered = meta.isPermanent = meta.isLoading = false,
            sourceData: toRender,
        }, );
    },

    handlePredefinedMouseLeave(evt, ele) {
        return Renderer.hover.handleLinkMouseLeave(evt, ele);
    },

    handlePredefinedMouseMove(evt, ele) {
        return Renderer.hover.handleLinkMouseMove(evt, ele);
    },

    _WINDOW_POSITION_PROPS_FROM_EVENT: ["isFromBottom", "isFromRight", "clientX", "window", "isPreventFlicker", "bcr", ],

    getWindowPositionFromEvent(evt, {isPreventFlicker=false}={}) {
        const ele = evt.target;
        const win = evt?.view?.window || window;

        const bcr = ele.getBoundingClientRect().toJSON();

        const isFromBottom = bcr.top > win.innerHeight / 2;
        const isFromRight = bcr.left > win.innerWidth / 2;

        return {
            mode: "autoFromElement",
            isFromBottom,
            isFromRight,
            clientX: EventUtil.getClientX(evt),
            window: win,
            isPreventFlicker,
            bcr,
        };
    },

    getWindowPositionExact(x, y, evt=null) {
        return {
            window: evt?.view?.window || window,
            mode: "exact",
            x,
            y,
        };
    },

    getWindowPositionExactVisibleBottom(x, y, evt=null) {
        return {
            ...Renderer.hover.getWindowPositionExact(x, y, evt),
            mode: "exactVisibleBottom",
        };
    },

    _WINDOW_METAS: {},
    MIN_Z_INDEX: 200,
    _MAX_Z_INDEX: 300,
    _DEFAULT_WIDTH_PX: 600,
    _BODY_SCROLLER_WIDTH_PX: 15,

    _getZIndex() {
        const zIndices = Object.values(Renderer.hover._WINDOW_METAS).map(it=>it.zIndex);
        if (!zIndices.length)
            return Renderer.hover.MIN_Z_INDEX;
        return Math.max(...zIndices);
    },

    _getNextZIndex(hoverId) {
        const cur = Renderer.hover._getZIndex();
        if (hoverId != null && Renderer.hover._WINDOW_METAS[hoverId].zIndex === cur)
            return cur;
        const out = cur + 1;

        if (out > Renderer.hover._MAX_Z_INDEX) {
            const sortedWindowMetas = Object.entries(Renderer.hover._WINDOW_METAS).sort(([kA,vA],[kB,vB])=>SortUtil.ascSort(vA.zIndex, vB.zIndex));

            if (sortedWindowMetas.length >= (Renderer.hover._MAX_Z_INDEX - Renderer.hover.MIN_Z_INDEX)) {
                sortedWindowMetas.forEach(([k,v])=>{
                    v.setZIndex(Renderer.hover.MIN_Z_INDEX);
                }
                );
            } else {
                sortedWindowMetas.forEach(([k,v],i)=>{
                    v.setZIndex(Renderer.hover.MIN_Z_INDEX + i);
                }
                );
            }

            return Renderer.hover._getNextZIndex(hoverId);
        } else
            return out;
    },

    _isIntersectRect(r1, r2) {
        return r1.left <= r2.right && r2.left <= r1.right && r1.top <= r2.bottom && r2.top <= r1.bottom;
    },

    getShowWindow($content, position, opts) {
        opts = opts || {};

        Renderer.hover._doInit();

        const initialWidth = opts.width == null ? Renderer.hover._DEFAULT_WIDTH_PX : opts.width;
        const initialZIndex = Renderer.hover._getNextZIndex();

        const $body = $(position.window.document.body);
        const $hov = $(`<div class="hwin"></div>`).css({
            "right": -initialWidth,
            "width": initialWidth,
            "zIndex": initialZIndex,
        });
        const $wrpContent = $(`<div class="hwin__wrp-table"></div>`);
        if (opts.height != null)
            $wrpContent.css("height", opts.height);
        const $hovTitle = $(`<span class="window-title min-w-0 overflow-ellipsis" title="${`${opts.title || ""}`.qq()}">${opts.title || ""}</span>`);

        const hoverWindow = {};
        const hoverId = Renderer.hover._getNextId();
        Renderer.hover._WINDOW_METAS[hoverId] = hoverWindow;
        const mouseUpId = `mouseup.${hoverId} touchend.${hoverId}`;
        const mouseMoveId = `mousemove.${hoverId} touchmove.${hoverId}`;
        const resizeId = `resize.${hoverId}`;
        const drag = {};

        const $brdrTopRightResize = $(`<div class="hoverborder__resize-ne"></div>`).on("mousedown touchstart", (evt)=>Renderer.hover._getShowWindow_handleDragMousedown({
            hoverWindow,
            hoverId,
            $hov,
            drag,
            $wrpContent
        }, {
            evt,
            type: 1
        }));

        const $brdrRightResize = $(`<div class="hoverborder__resize-e"></div>`).on("mousedown touchstart", (evt)=>Renderer.hover._getShowWindow_handleDragMousedown({
            hoverWindow,
            hoverId,
            $hov,
            drag,
            $wrpContent
        }, {
            evt,
            type: 2
        }));

        const $brdrBottomRightResize = $(`<div class="hoverborder__resize-se"></div>`).on("mousedown touchstart", (evt)=>Renderer.hover._getShowWindow_handleDragMousedown({
            hoverWindow,
            hoverId,
            $hov,
            drag,
            $wrpContent
        }, {
            evt,
            type: 3
        }));

        const $brdrBtm = $(`<div class="hoverborder hoverborder--btm ${opts.isBookContent ? "hoverborder-book" : ""}"><div class="hoverborder__resize-s"></div></div>`).on("mousedown touchstart", (evt)=>Renderer.hover._getShowWindow_handleDragMousedown({
            hoverWindow,
            hoverId,
            $hov,
            drag,
            $wrpContent
        }, {
            evt,
            type: 4
        }));

        const $brdrBtmLeftResize = $(`<div class="hoverborder__resize-sw"></div>`).on("mousedown touchstart", (evt)=>Renderer.hover._getShowWindow_handleDragMousedown({
            hoverWindow,
            hoverId,
            $hov,
            drag,
            $wrpContent
        }, {
            evt,
            type: 5
        }));

        const $brdrLeftResize = $(`<div class="hoverborder__resize-w"></div>`).on("mousedown touchstart", (evt)=>Renderer.hover._getShowWindow_handleDragMousedown({
            hoverWindow,
            hoverId,
            $hov,
            drag,
            $wrpContent
        }, {
            evt,
            type: 6
        }));

        const $brdrTopLeftResize = $(`<div class="hoverborder__resize-nw"></div>`).on("mousedown touchstart", (evt)=>Renderer.hover._getShowWindow_handleDragMousedown({
            hoverWindow,
            hoverId,
            $hov,
            drag,
            $wrpContent
        }, {
            evt,
            type: 7
        }));

        const $brdrTopResize = $(`<div class="hoverborder__resize-n"></div>`).on("mousedown touchstart", (evt)=>Renderer.hover._getShowWindow_handleDragMousedown({
            hoverWindow,
            hoverId,
            $hov,
            drag,
            $wrpContent
        }, {
            evt,
            type: 8
        }));

        const $brdrTop = $(`<div class="hoverborder hoverborder--top ${opts.isBookContent ? "hoverborder-book" : ""}" ${opts.isPermanent ? `data-perm="true"` : ""}></div>`).on("mousedown touchstart", (evt)=>Renderer.hover._getShowWindow_handleDragMousedown({
            hoverWindow,
            hoverId,
            $hov,
            drag,
            $wrpContent
        }, {
            evt,
            type: 9
        })).on("contextmenu", (evt)=>{
            Renderer.hover._contextMenuLastClicked = {
                hoverId,
            };
            ContextUtil.pOpenMenu(evt, Renderer.hover._contextMenu);
        }
        );

        $(position.window.document).on(mouseUpId, (evt)=>{
            if (drag.type) {
                if (drag.type < 9) {
                    $wrpContent.css("max-height", "");
                    $hov.css("max-width", "");
                }
                Renderer.hover._getShowWindow_adjustPosition({
                    $hov,
                    $wrpContent,
                    position
                });

                if (drag.type === 9) {
                    if (EventUtil.isUsingTouch() && evt.target.classList.contains("hwin__top-border-icon")) {
                        evt.preventDefault();
                        drag.type = 0;
                        $(evt.target).click();
                        return;
                    }

                    if (this._dmScreen && opts.compactReferenceData) {
                        const panel = this._dmScreen.getPanelPx(EventUtil.getClientX(evt), EventUtil.getClientY(evt));
                        if (!panel)
                            return;
                        this._dmScreen.setHoveringPanel(panel);
                        const target = panel.getAddButtonPos();

                        if (Renderer.hover._getShowWindow_isOverHoverTarget({
                            evt,
                            target
                        })) {
                            panel.doPopulate_Stats(opts.compactReferenceData.page, opts.compactReferenceData.source, opts.compactReferenceData.hash);
                            Renderer.hover._getShowWindow_doClose({
                                $hov,
                                position,
                                mouseUpId,
                                mouseMoveId,
                                resizeId,
                                hoverId,
                                opts,
                                hoverWindow
                            });
                        }
                        this._dmScreen.resetHoveringButton();
                    }
                }
                drag.type = 0;
            }
        }
        ).on(mouseMoveId, (evt)=>{
            const args = {
                $wrpContent,
                $hov,
                drag,
                evt
            };
            switch (drag.type) {
            case 1:
                Renderer.hover._getShowWindow_handleNorthDrag(args);
                Renderer.hover._getShowWindow_handleEastDrag(args);
                break;
            case 2:
                Renderer.hover._getShowWindow_handleEastDrag(args);
                break;
            case 3:
                Renderer.hover._getShowWindow_handleSouthDrag(args);
                Renderer.hover._getShowWindow_handleEastDrag(args);
                break;
            case 4:
                Renderer.hover._getShowWindow_handleSouthDrag(args);
                break;
            case 5:
                Renderer.hover._getShowWindow_handleSouthDrag(args);
                Renderer.hover._getShowWindow_handleWestDrag(args);
                break;
            case 6:
                Renderer.hover._getShowWindow_handleWestDrag(args);
                break;
            case 7:
                Renderer.hover._getShowWindow_handleNorthDrag(args);
                Renderer.hover._getShowWindow_handleWestDrag(args);
                break;
            case 8:
                Renderer.hover._getShowWindow_handleNorthDrag(args);
                break;
            case 9:
                {
                    const diffX = drag.startX - EventUtil.getClientX(evt);
                    const diffY = drag.startY - EventUtil.getClientY(evt);
                    $hov.css("left", drag.baseLeft - diffX).css("top", drag.baseTop - diffY);
                    drag.startX = EventUtil.getClientX(evt);
                    drag.startY = EventUtil.getClientY(evt);
                    drag.baseTop = parseFloat($hov.css("top"));
                    drag.baseLeft = parseFloat($hov.css("left"));

                    if (this._dmScreen) {
                        const panel = this._dmScreen.getPanelPx(EventUtil.getClientX(evt), EventUtil.getClientY(evt));
                        if (!panel)
                            return;
                        this._dmScreen.setHoveringPanel(panel);
                        const target = panel.getAddButtonPos();

                        if (Renderer.hover._getShowWindow_isOverHoverTarget({
                            evt,
                            target
                        }))
                            this._dmScreen.setHoveringButton(panel);
                        else
                            this._dmScreen.resetHoveringButton();
                    }
                    break;
                }
            }
        }
        );
        $(position.window).on(resizeId, ()=>Renderer.hover._getShowWindow_adjustPosition({
            $hov,
            $wrpContent,
            position
        }));

        $brdrTop.attr("data-display-title", false);
        $brdrTop.on("dblclick", ()=>Renderer.hover._getShowWindow_doToggleMinimizedMaximized({
            $brdrTop,
            $hov
        }));
        $brdrTop.append($hovTitle);
        const $brdTopRhs = $(`<div class="ve-flex ml-auto no-shrink"></div>`).appendTo($brdrTop);

        if (opts.pageUrl && !position.window._IS_POPOUT && !Renderer.get().isInternalLinksDisabled()) {
            const $btnGotoPage = $(`<a class="hwin__top-border-icon glyphicon glyphicon-modal-window" title="Go to Page" href="${opts.pageUrl}"></a>`).appendTo($brdTopRhs);
        }

        if (!position.window._IS_POPOUT && !opts.isPopout) {
            const $btnPopout = $(`<span class="hwin__top-border-icon glyphicon glyphicon-new-window hvr__popout" title="Open as Popup Window"></span>`).on("click", evt=>{
                evt.stopPropagation();
                return Renderer.hover._getShowWindow_pDoPopout({
                    $hov,
                    position,
                    mouseUpId,
                    mouseMoveId,
                    resizeId,
                    hoverId,
                    opts,
                    hoverWindow,
                    $content
                }, {
                    evt
                });
            }
            ).appendTo($brdTopRhs);
        }

        if (opts.sourceData) {
            const btnPopout = e_({
                tag: "span",
                clazz: `hwin__top-border-icon hwin__top-border-icon--text`,
                title: "Show Source Data",
                text: "{}",
                click: evt=>{
                    evt.stopPropagation();
                    evt.preventDefault();

                    const $content = Renderer.hover.$getHoverContent_statsCode(opts.sourceData);
                    Renderer.hover.getShowWindow($content, Renderer.hover.getWindowPositionFromEvent(evt), {
                        title: [opts.sourceData._displayName || opts.sourceData.name, "Source Data"].filter(Boolean).join(" \u2014 "),
                        isPermanent: true,
                        isBookContent: true,
                    }, );
                }
                ,
            });
            $brdTopRhs.append(btnPopout);
        }

        const $btnClose = $(`<span class="hwin__top-border-icon glyphicon glyphicon-remove" title="Close (CTRL to Close All)"></span>`).on("click", (evt)=>{
            evt.stopPropagation();

            if (EventUtil.isCtrlMetaKey(evt)) {
                Renderer.hover._doCloseAllWindows();
                return;
            }

            Renderer.hover._getShowWindow_doClose({
                $hov,
                position,
                mouseUpId,
                mouseMoveId,
                resizeId,
                hoverId,
                opts,
                hoverWindow
            });
        }
        ).appendTo($brdTopRhs);

        $wrpContent.append($content);

        $hov.append($brdrTopResize).append($brdrTopRightResize).append($brdrRightResize).append($brdrBottomRightResize).append($brdrBtmLeftResize).append($brdrLeftResize).append($brdrTopLeftResize)
        .append($brdrTop).append($wrpContent).append($brdrBtm);

        $body.append($hov);

        Renderer.hover._getShowWindow_setPosition({
            $hov,
            $wrpContent,
            position
        }, position);

        hoverWindow.$windowTitle = $hovTitle;
        hoverWindow.zIndex = initialZIndex;
        hoverWindow.setZIndex = Renderer.hover._getNextZIndex.bind(this, {
            $hov,
            hoverWindow
        });

        hoverWindow.setPosition = Renderer.hover._getShowWindow_setPosition.bind(this, {
            $hov,
            $wrpContent,
            position
        });
        hoverWindow.setIsPermanent = Renderer.hover._getShowWindow_setIsPermanent.bind(this, {
            opts,
            $brdrTop
        });
        hoverWindow.doClose = Renderer.hover._getShowWindow_doClose.bind(this, {
            $hov,
            position,
            mouseUpId,
            mouseMoveId,
            resizeId,
            hoverId,
            opts,
            hoverWindow
        });
        hoverWindow.doMaximize = Renderer.hover._getShowWindow_doMaximize.bind(this, {
            $brdrTop,
            $hov
        });
        hoverWindow.doZIndexToFront = Renderer.hover._getShowWindow_doZIndexToFront.bind(this, {
            $hov,
            hoverWindow,
            hoverId
        });

        if (opts.isPopout)
            Renderer.hover._getShowWindow_pDoPopout({
                $hov,
                position,
                mouseUpId,
                mouseMoveId,
                resizeId,
                hoverId,
                opts,
                hoverWindow,
                $content
            });

        return hoverWindow;
    },

    _getShowWindow_doClose({$hov, position, mouseUpId, mouseMoveId, resizeId, hoverId, opts, hoverWindow}) {
        $hov.remove();
        $(position.window.document).off(mouseUpId);
        $(position.window.document).off(mouseMoveId);
        $(position.window).off(resizeId);

        delete Renderer.hover._WINDOW_METAS[hoverId];

        if (opts.cbClose)
            opts.cbClose(hoverWindow);
    },

    _getShowWindow_handleDragMousedown({hoverWindow, hoverId, $hov, drag, $wrpContent}, {evt, type}) {
        if (evt.which === 0 || evt.which === 1)
            evt.preventDefault();
        hoverWindow.zIndex = Renderer.hover._getNextZIndex(hoverId);
        $hov.css({
            "z-index": hoverWindow.zIndex,
            "animation": "initial",
        });
        drag.type = type;
        drag.startX = EventUtil.getClientX(evt);
        drag.startY = EventUtil.getClientY(evt);
        drag.baseTop = parseFloat($hov.css("top"));
        drag.baseLeft = parseFloat($hov.css("left"));
        drag.baseHeight = $wrpContent.height();
        drag.baseWidth = parseFloat($hov.css("width"));
        if (type < 9) {
            $wrpContent.css({
                "height": drag.baseHeight,
                "max-height": "initial",
            });
            $hov.css("max-width", "initial");
        }
    },

    _getShowWindow_isOverHoverTarget({evt, target}) {
        return EventUtil.getClientX(evt) >= target.left && EventUtil.getClientX(evt) <= target.left + target.width && EventUtil.getClientY(evt) >= target.top && EventUtil.getClientY(evt) <= target.top + target.height;
    },

    _getShowWindow_handleNorthDrag({$wrpContent, $hov, drag, evt}) {
        const diffY = Math.max(drag.startY - EventUtil.getClientY(evt), 80 - drag.baseHeight);
        $wrpContent.css("height", drag.baseHeight + diffY);
        $hov.css("top", drag.baseTop - diffY);
        drag.startY = EventUtil.getClientY(evt);
        drag.baseHeight = $wrpContent.height();
        drag.baseTop = parseFloat($hov.css("top"));
    },

    _getShowWindow_handleEastDrag({$wrpContent, $hov, drag, evt}) {
        const diffX = drag.startX - EventUtil.getClientX(evt);
        $hov.css("width", drag.baseWidth - diffX);
        drag.startX = EventUtil.getClientX(evt);
        drag.baseWidth = parseFloat($hov.css("width"));
    },

    _getShowWindow_handleSouthDrag({$wrpContent, $hov, drag, evt}) {
        const diffY = drag.startY - EventUtil.getClientY(evt);
        $wrpContent.css("height", drag.baseHeight - diffY);
        drag.startY = EventUtil.getClientY(evt);
        drag.baseHeight = $wrpContent.height();
    },

    _getShowWindow_handleWestDrag({$wrpContent, $hov, drag, evt}) {
        const diffX = Math.max(drag.startX - EventUtil.getClientX(evt), 150 - drag.baseWidth);
        $hov.css("width", drag.baseWidth + diffX).css("left", drag.baseLeft - diffX);
        drag.startX = EventUtil.getClientX(evt);
        drag.baseWidth = parseFloat($hov.css("width"));
        drag.baseLeft = parseFloat($hov.css("left"));
    },

    _getShowWindow_doToggleMinimizedMaximized({$brdrTop, $hov}) {
        const curState = $brdrTop.attr("data-display-title");
        const isNextMinified = curState === "false";
        $brdrTop.attr("data-display-title", isNextMinified);
        $brdrTop.attr("data-perm", true);
        $hov.toggleClass("hwin--minified", isNextMinified);
    },

    _getShowWindow_doMaximize({$brdrTop, $hov}) {
        $brdrTop.attr("data-display-title", false);
        $hov.toggleClass("hwin--minified", false);
    },

    async _getShowWindow_pDoPopout({$hov, position, mouseUpId, mouseMoveId, resizeId, hoverId, opts, hoverWindow, $content}, {evt}={}) {
        const dimensions = opts.fnGetPopoutSize ? opts.fnGetPopoutSize() : {
            width: 600,
            height: $content.height()
        };
        const win = window.open("", opts.title || "", `width=${dimensions.width},height=${dimensions.height}location=0,menubar=0,status=0,titlebar=0,toolbar=0`, );

        if (!win._IS_POPOUT) {
            win._IS_POPOUT = true;
            win.document.write(`
				<!DOCTYPE html>
				<html lang="en" class="ve-popwindow ${typeof styleSwitcher !== "undefined" ? styleSwitcher.getDayNightClassNames() : ""}"><head>
					<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
					<title>${opts.title}</title>
					${$(`link[rel="stylesheet"][href]`).map((i,e)=>e.outerHTML).get().join("\n")}
					<!-- Favicons -->
					<link rel="icon" type="image/svg+xml" href="favicon.svg">
					<link rel="icon" type="image/png" sizes="256x256" href="favicon-256x256.png">
					<link rel="icon" type="image/png" sizes="144x144" href="favicon-144x144.png">
					<link rel="icon" type="image/png" sizes="128x128" href="favicon-128x128.png">
					<link rel="icon" type="image/png" sizes="64x64" href="favicon-64x64.png">
					<link rel="icon" type="image/png" sizes="48x48" href="favicon-48x48.png">
					<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
					<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">

					<!-- Chrome Web App Icons -->
					<link rel="manifest" href="manifest.webmanifest">
					<meta name="application-name" content="5etools">
					<meta name="theme-color" content="#006bc4">

					<!-- Windows Start Menu tiles -->
					<meta name="msapplication-config" content="browserconfig.xml"/>
					<meta name="msapplication-TileColor" content="#006bc4">

					<!-- Apple Touch Icons -->
					<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon-180x180.png">
					<link rel="apple-touch-icon" sizes="360x360" href="apple-touch-icon-360x360.png">
					<link rel="apple-touch-icon" sizes="167x167" href="apple-touch-icon-167x167.png">
					<link rel="apple-touch-icon" sizes="152x152" href="apple-touch-icon-152x152.png">
					<link rel="apple-touch-icon" sizes="120x120" href="apple-touch-icon-120x120.png">
					<meta name="apple-mobile-web-app-title" content="5etools">

					<!-- macOS Safari Pinned Tab and Touch Bar -->
					<link rel="mask-icon" href="safari-pinned-tab.svg" color="#006bc4">

					<style>
						html, body { width: 100%; height: 100%; }
						body { overflow-y: scroll; }
						.hwin--popout { max-width: 100%; max-height: 100%; box-shadow: initial; width: 100%; overflow-y: auto; }
					</style>
				</head><body class="rd__body-popout">
				<div class="hwin hoverbox--popout hwin--popout"></div>
				<script type="text/javascript" src="js/parser.js"></script>
				<script type="text/javascript" src="js/utils.js"></script>
				<script type="text/javascript" src="lib/jquery.js"></script>
				</body></html>
			`);

            win.Renderer = Renderer;

            let ticks = 50;
            while (!win.document.body && ticks-- > 0)
                await MiscUtil.pDelay(5);

            win.$wrpHoverContent = $(win.document).find(`.hoverbox--popout`);
        }

        let $cpyContent;
        if (opts.$pFnGetPopoutContent) {
            $cpyContent = await opts.$pFnGetPopoutContent();
        } else {
            $cpyContent = $content.clone(true, true);
        }

        $cpyContent.appendTo(win.$wrpHoverContent.empty());

        Renderer.hover._getShowWindow_doClose({
            $hov,
            position,
            mouseUpId,
            mouseMoveId,
            resizeId,
            hoverId,
            opts,
            hoverWindow
        });
    },

    _getShowWindow_setPosition({$hov, $wrpContent, position}, positionNxt) {
        switch (positionNxt.mode) {
        case "autoFromElement":
            {
                const bcr = $hov[0].getBoundingClientRect();

                if (positionNxt.isFromBottom)
                    $hov.css("top", positionNxt.bcr.top - (bcr.height + 10));
                else
                    $hov.css("top", positionNxt.bcr.top + positionNxt.bcr.height + 10);

                if (positionNxt.isFromRight)
                    $hov.css("left", (positionNxt.clientX || positionNxt.bcr.left) - (bcr.width + 10));
                else
                    $hov.css("left", (positionNxt.clientX || (positionNxt.bcr.left + positionNxt.bcr.width)) + 10);

                if (position !== positionNxt) {
                    Renderer.hover._WINDOW_POSITION_PROPS_FROM_EVENT.forEach(prop=>{
                        position[prop] = positionNxt[prop];
                    }
                    );
                }

                break;
            }
        case "exact":
            {
                $hov.css({
                    "left": positionNxt.x,
                    "top": positionNxt.y,
                });
                break;
            }
        case "exactVisibleBottom":
            {
                $hov.css({
                    "left": positionNxt.x,
                    "top": positionNxt.y,
                    "animation": "initial",
                });

                let yPos = positionNxt.y;

                const {bottom: posBottom, height: winHeight} = $hov[0].getBoundingClientRect();
                const height = position.window.innerHeight;
                if (posBottom > height) {
                    yPos = position.window.innerHeight - winHeight;
                    $hov.css({
                        "top": yPos,
                        "animation": "",
                    });
                }

                break;
            }
        default:
            throw new Error(`Positiong mode unimplemented: "${positionNxt.mode}"`);
        }

        Renderer.hover._getShowWindow_adjustPosition({
            $hov,
            $wrpContent,
            position
        });
    },

    _getShowWindow_adjustPosition({$hov, $wrpContent, position}) {
        const eleHov = $hov[0];
        const wrpContent = $wrpContent[0];

        const bcr = eleHov.getBoundingClientRect().toJSON();
        const screenHeight = position.window.innerHeight;
        const screenWidth = position.window.innerWidth;

        if (bcr.top < 0) {
            bcr.top = 0;
            bcr.bottom = bcr.top + bcr.height;
            eleHov.style.top = `${bcr.top}px`;
        } else if (bcr.top >= screenHeight - Renderer.hover._BAR_HEIGHT) {
            bcr.top = screenHeight - Renderer.hover._BAR_HEIGHT;
            bcr.bottom = bcr.top + bcr.height;
            eleHov.style.top = `${bcr.top}px`;
        }

        if (bcr.left < 0) {
            bcr.left = 0;
            bcr.right = bcr.left + bcr.width;
            eleHov.style.left = `${bcr.left}px`;
        } else if (bcr.left + bcr.width + Renderer.hover._BODY_SCROLLER_WIDTH_PX > screenWidth) {
            bcr.left = Math.max(screenWidth - bcr.width - Renderer.hover._BODY_SCROLLER_WIDTH_PX, 0);
            bcr.right = bcr.left + bcr.width;
            eleHov.style.left = `${bcr.left}px`;
        }

        if (position.isPreventFlicker && Renderer.hover._isIntersectRect(bcr, position.bcr)) {
            if (position.isFromBottom) {
                bcr.height = position.bcr.top - 5;
                wrpContent.style.height = `${bcr.height}px`;
            } else {
                bcr.height = screenHeight - position.bcr.bottom - 5;
                wrpContent.style.height = `${bcr.height}px`;
            }
        }
    },

    _getShowWindow_setIsPermanent({opts, $brdrTop}, isPermanent) {
        opts.isPermanent = isPermanent;
        $brdrTop.attr("data-perm", isPermanent);
    },

    _getShowWindow_setZIndex({$hov, hoverWindow}, zIndex) {
        $hov.css("z-index", zIndex);
        hoverWindow.zIndex = zIndex;
    },

    _getShowWindow_doZIndexToFront({$hov, hoverWindow, hoverId}) {
        const nxtZIndex = Renderer.hover._getNextZIndex(hoverId);
        Renderer.hover._getNextZIndex({
            $hov,
            hoverWindow
        }, nxtZIndex);
    },

    getMakePredefinedHover(entry, opts) {
        opts = opts || {};

        const id = opts.id ?? Renderer.hover._getNextId();
        Renderer.hover._entryCache[id] = entry;
        return {
            id,
            html: `onmouseover="Renderer.hover.handlePredefinedMouseOver(event, this, ${id}, ${JSON.stringify(opts).escapeQuotes()})" onmousemove="Renderer.hover.handlePredefinedMouseMove(event, this)" onmouseleave="Renderer.hover.handlePredefinedMouseLeave(event, this)" ${Renderer.hover.getPreventTouchString()}`,
            mouseOver: (evt,ele)=>Renderer.hover.handlePredefinedMouseOver(evt, ele, id, opts),
            mouseMove: (evt,ele)=>Renderer.hover.handlePredefinedMouseMove(evt, ele),
            mouseLeave: (evt,ele)=>Renderer.hover.handlePredefinedMouseLeave(evt, ele),
            touchStart: (evt,ele)=>Renderer.hover.handleTouchStart(evt, ele),
            show: ()=>Renderer.hover.doPredefinedShow(id, opts),
        };
    },

    updatePredefinedHover(id, entry) {
        Renderer.hover._entryCache[id] = entry;
    },

    getInlineHover(entry, opts) {
        return {
            html: `onmouseover="Renderer.hover.handleInlineMouseOver(event, this)" onmouseleave="Renderer.hover.handleLinkMouseLeave(event, this)" onmousemove="Renderer.hover.handleLinkMouseMove(event, this)" data-vet-entry="${JSON.stringify(entry).qq()}" ${opts ? `data-vet-opts="${JSON.stringify(opts).qq()}"` : ""} ${Renderer.hover.getPreventTouchString()}`,
        };
    },

    getPreventTouchString() {
        return `ontouchstart="Renderer.hover.handleTouchStart(event, this)"`;
    },

    handleTouchStart(evt, ele) {
        if (!Renderer.hover.isSmallScreen(evt)) {
            $(ele).data("href", $(ele).data("href") || $(ele).attr("href"));
            $(ele).attr("href", "javascript:void(0)");
            setTimeout(()=>{
                const data = $(ele).data("href");
                if (data) {
                    $(ele).attr("href", data);
                    $(ele).data("href", null);
                }
            }
            , 100);
        }
    },

    getEntityLink(ent, {displayText=null, prop=null, isLowerCase=false, isTitleCase=false, }={}, ) {
        if (isLowerCase && isTitleCase)
            throw new Error(`"isLowerCase" and "isTitleCase" are mutually exclusive!`);

        const name = isLowerCase ? ent.name.toLowerCase() : isTitleCase ? ent.name.toTitleCase() : ent.name;

        let parts = [name, ent.source, displayText || "", ];

        switch (prop || ent.__prop) {
        case "monster":
            {
                if (ent._isScaledCr) {
                    parts.push(`${VeCt.HASH_SCALED}=${Parser.numberToCr(ent._scaledCr)}`);
                }

                if (ent._isScaledSpellSummon) {
                    parts.push(`${VeCt.HASH_SCALED_SPELL_SUMMON}=${ent._scaledSpellSummonLevel}`);
                }

                if (ent._isScaledClassSummon) {
                    parts.push(`${VeCt.HASH_SCALED_CLASS_SUMMON}=${ent._scaledClassSummonLevel}`);
                }

                break;
            }

        case "deity":
            {
                parts.splice(1, 0, ent.pantheon);
                break;
            }
        }

        while (parts.length && !parts.last()?.length)
            parts.pop();

        return Renderer.get().render(`{@${Parser.getPropTag(prop || ent.__prop)} ${parts.join("|")}}`);
    },

    getRefMetaFromTag(str) {
        str = str.slice(2, -1);
        const [tag,...refParts] = str.split(" ");
        const ref = refParts.join(" ");
        const type = `ref${tag.uppercaseFirst()}`;
        return {
            type,
            [tag]: ref
        };
    },

    async pApplyCustomHashId(page, ent, customHashId) {
        switch (page) {
        case UrlUtil.PG_BESTIARY:
            {
                const out = await Renderer.monster.pGetModifiedCreature(ent, customHashId);
                Renderer.monster.updateParsed(out);
                return out;
            }

        case UrlUtil.PG_RECIPES:
            return Renderer.recipe.pGetModifiedRecipe(ent, customHashId);

        default:
            return ent;
        }
    },

    getGenericCompactRenderedString(entry, depth=0) {
        return `
			<tr class="text homebrew-hover"><td colspan="6">
			${Renderer.get().setFirstSection(true).render(entry, depth)}
			</td></tr>
		`;
    },

    getFnRenderCompact(page, {isStatic=false}={}) {
        switch (page) {
        case "generic":
        case "hover":
            return Renderer.hover.getGenericCompactRenderedString;
        case UrlUtil.PG_QUICKREF:
            return Renderer.hover.getGenericCompactRenderedString;
        case UrlUtil.PG_CLASSES:
            return Renderer.class.getCompactRenderedString;
        case UrlUtil.PG_SPELLS:
            return Renderer.spell.getCompactRenderedString;
        case UrlUtil.PG_ITEMS:
            return Renderer.item.getCompactRenderedString;
        case UrlUtil.PG_BESTIARY:
            return it=>Renderer.monster.getCompactRenderedString(it, {
                isShowScalers: !isStatic,
                isScaledCr: it._originalCr != null,
                isScaledSpellSummon: it._isScaledSpellSummon,
                isScaledClassSummon: it._isScaledClassSummon
            });
        case UrlUtil.PG_CONDITIONS_DISEASES:
            return Renderer.condition.getCompactRenderedString;
        case UrlUtil.PG_BACKGROUNDS:
            return Renderer.background.getCompactRenderedString;
        case UrlUtil.PG_FEATS:
            return Renderer.feat.getCompactRenderedString;
        case UrlUtil.PG_OPT_FEATURES:
            return Renderer.optionalfeature.getCompactRenderedString;
        case UrlUtil.PG_PSIONICS:
            return Renderer.psionic.getCompactRenderedString;
        case UrlUtil.PG_REWARDS:
            return Renderer.reward.getCompactRenderedString;
        case UrlUtil.PG_RACES:
            return it=>Renderer.race.getCompactRenderedString(it, {
                isStatic
            });
        case UrlUtil.PG_DEITIES:
            return Renderer.deity.getCompactRenderedString;
        case UrlUtil.PG_OBJECTS:
            return Renderer.object.getCompactRenderedString;
        case UrlUtil.PG_TRAPS_HAZARDS:
            return Renderer.traphazard.getCompactRenderedString;
        case UrlUtil.PG_VARIANTRULES:
            return Renderer.variantrule.getCompactRenderedString;
        case UrlUtil.PG_CULTS_BOONS:
            return Renderer.cultboon.getCompactRenderedString;
        case UrlUtil.PG_TABLES:
            return Renderer.table.getCompactRenderedString;
        case UrlUtil.PG_VEHICLES:
            return Renderer.vehicle.getCompactRenderedString;
        case UrlUtil.PG_ACTIONS:
            return Renderer.action.getCompactRenderedString;
        case UrlUtil.PG_LANGUAGES:
            return Renderer.language.getCompactRenderedString;
        case UrlUtil.PG_CHAR_CREATION_OPTIONS:
            return Renderer.charoption.getCompactRenderedString;
        case UrlUtil.PG_RECIPES:
            return Renderer.recipe.getCompactRenderedString;
        case UrlUtil.PG_CLASS_SUBCLASS_FEATURES:
            return Renderer.hover.getGenericCompactRenderedString;
        case UrlUtil.PG_CREATURE_FEATURES:
            return Renderer.hover.getGenericCompactRenderedString;
        case UrlUtil.PG_DECKS:
            return Renderer.deck.getCompactRenderedString;
        case "classfeature":
        case "classFeature":
            return Renderer.hover.getGenericCompactRenderedString;
        case "subclassfeature":
        case "subclassFeature":
            return Renderer.hover.getGenericCompactRenderedString;
        case "citation":
            return Renderer.hover.getGenericCompactRenderedString;
        default:
            if (Renderer[page]?.getCompactRenderedString)
                return Renderer[page].getCompactRenderedString;
            return null;
        }
    },

    getFnBindListenersCompact(page) {
        switch (page) {
        case UrlUtil.PG_BESTIARY:
            return Renderer.monster.bindListenersCompact;
        case UrlUtil.PG_RACES:
            return Renderer.race.bindListenersCompact;
        default:
            return null;
        }
    },

    _pageToFluffFn(page) {
        switch (page) {
        case UrlUtil.PG_BESTIARY:
            return Renderer.monster.pGetFluff;
        case UrlUtil.PG_ITEMS:
            return Renderer.item.pGetFluff;
        case UrlUtil.PG_CONDITIONS_DISEASES:
            return Renderer.condition.pGetFluff;
        case UrlUtil.PG_SPELLS:
            return Renderer.spell.pGetFluff;
        case UrlUtil.PG_RACES:
            return Renderer.race.pGetFluff;
        case UrlUtil.PG_BACKGROUNDS:
            return Renderer.background.pGetFluff;
        case UrlUtil.PG_FEATS:
            return Renderer.feat.pGetFluff;
        case UrlUtil.PG_LANGUAGES:
            return Renderer.language.pGetFluff;
        case UrlUtil.PG_VEHICLES:
            return Renderer.vehicle.pGetFluff;
        case UrlUtil.PG_CHAR_CREATION_OPTIONS:
            return Renderer.charoption.pGetFluff;
        case UrlUtil.PG_RECIPES:
            return Renderer.recipe.pGetFluff;
        default:
            return null;
        }
    },

    isSmallScreen(evt) {
        if (typeof window === "undefined")
            return false;

        evt = evt || {};
        const win = (evt.view || {}).window || window;
        return win.innerWidth <= 768;
    },

    $getHoverContent_stats(page, toRender, opts, renderFnOpts) {
        opts = opts || {};
        if (page === UrlUtil.PG_RECIPES)
            opts = {
                ...MiscUtil.copyFast(opts),
                isBookContent: true
            };

        const fnRender = opts.fnRender || Renderer.hover.getFnRenderCompact(page, {
            isStatic: opts.isStatic
        });
        const $out = $$`<table class="w-100 stats ${opts.isBookContent ? `stats--book` : ""}">${fnRender(toRender, renderFnOpts)}</table>`;

        if (!opts.isStatic) {
            const fnBind = Renderer.hover.getFnBindListenersCompact(page);
            if (fnBind)
                fnBind(toRender, $out[0]);
        }

        return $out;
    },

    $getHoverContent_fluff(page, toRender, opts, renderFnOpts) {
        opts = opts || {};
        if (page === UrlUtil.PG_RECIPES)
            opts = {
                ...MiscUtil.copyFast(opts),
                isBookContent: true
            };

        if (!toRender) {
            return $$`<table class="w-100 stats ${opts.isBookContent ? `stats--book` : ""}"><tr class="text"><td colspan="6" class="p-2 ve-text-center">${Renderer.utils.HTML_NO_INFO}</td></tr></table>`;
        }

        toRender = MiscUtil.copyFast(toRender);

        if (toRender.images && toRender.images.length) {
            const cachedImages = MiscUtil.copyFast(toRender.images);
            delete toRender.images;

            toRender.entries = toRender.entries || [];
            const hasText = toRender.entries.length > 0;
            if (hasText)
                toRender.entries.unshift({
                    type: "hr"
                });
            cachedImages[0].maxHeight = 33;
            cachedImages[0].maxHeightUnits = "vh";
            toRender.entries.unshift(cachedImages[0]);

            if (cachedImages.length > 1) {
                if (hasText)
                    toRender.entries.push({
                        type: "hr"
                    });
                toRender.entries.push(...cachedImages.slice(1));
            }
        }

        return $$`<table class="w-100 stats ${opts.isBookContent ? `stats--book` : ""}">${Renderer.generic.getCompactRenderedString(toRender, renderFnOpts)}</table>`;
    },

    $getHoverContent_statsCode(toRender, {isSkipClean=false, title=null}={}) {
        const cleanCopy = isSkipClean ? toRender : DataUtil.cleanJson(MiscUtil.copyFast(toRender));
        return Renderer.hover.$getHoverContent_miscCode(title || [cleanCopy.name, "Source Data"].filter(Boolean).join(" \u2014 "), JSON.stringify(cleanCopy, null, "\t"), );
    },

    $getHoverContent_miscCode(name, code) {
        const toRenderCode = {
            type: "code",
            name,
            preformatted: code,
        };
        return $$`<table class="w-100 stats stats--book">${Renderer.get().render(toRenderCode)}</table>`;
    },

    $getHoverContent_generic(toRender, opts) {
        opts = opts || {};

        return $$`<table class="w-100 stats ${opts.isBookContent || opts.isLargeBookContent ? "stats--book" : ""} ${opts.isLargeBookContent ? "stats--book-large" : ""}">${Renderer.hover.getGenericCompactRenderedString(toRender, opts.depth || 0)}</table>`;
    },

    doPopoutCurPage(evt, entity) {
        const page = UrlUtil.getCurrentPage();
        const $content = Renderer.hover.$getHoverContent_stats(page, entity);
        Renderer.hover.getShowWindow($content, Renderer.hover.getWindowPositionFromEvent(evt), {
            pageUrl: `#${UrlUtil.autoEncodeHash(entity)}`,
            title: entity._displayName || entity.name,
            isPermanent: true,
            isBookContent: page === UrlUtil.PG_RECIPES,
            sourceData: entity,
        }, );
    },
};

Renderer.getNames = function(nameStack, entry, opts) {
    opts = opts || {};
    if (opts.maxDepth == null)
        opts.maxDepth = false;
    if (opts.depth == null)
        opts.depth = 0;

    if (opts.typeBlocklist && entry.type && opts.typeBlocklist.has(entry.type))
        return;

    if (opts.maxDepth !== false && opts.depth > opts.maxDepth)
        return;
    if (entry.name)
        nameStack.push(Renderer.stripTags(entry.name));
    if (entry.entries) {
        let nextDepth = entry.type === "section" ? -1 : entry.type === "entries" ? opts.depth + 1 : opts.depth;
        for (const eX of entry.entries) {
            const nxtOpts = {
                ...opts
            };
            nxtOpts.depth = nextDepth;
            Renderer.getNames(nameStack, eX, nxtOpts);
        }
    } else if (entry.items) {
        for (const eX of entry.items) {
            Renderer.getNames(nameStack, eX, opts);
        }
    }
}
;

Renderer.getNumberedNames = function(entry) {
    const renderer = new Renderer().setTrackTitles(true);
    renderer.render(entry);
    const titles = renderer.getTrackedTitles();
    const out = {};
    Object.entries(titles).forEach(([k,v])=>{
        v = Renderer.stripTags(v);
        out[v] = Number(k);
    }
    );
    return out;
}
;

Renderer.findName = function(entry) {
    return CollectionUtil.dfs(entry, {
        prop: "name"
    });
}
;
Renderer.findSource = function(entry) {
    return CollectionUtil.dfs(entry, {
        prop: "source"
    });
}
;
Renderer.findEntry = function(entry) {
    return CollectionUtil.dfs(entry, {
        fnMatch: obj=>obj.name && obj?.entries?.length
    });
}
;

Renderer.stripTags = function(str) {
    if (!str)
        return str;
    let nxtStr = Renderer._stripTagLayer(str);
    while (nxtStr.length !== str.length) {
        str = nxtStr;
        nxtStr = Renderer._stripTagLayer(str);
    }
    return nxtStr;
}
;

Renderer._stripTagLayer = function(str) {
    if (str.includes("{@")) {
        const tagSplit = Renderer.splitByTags(str);
        return tagSplit.filter(it=>it).map(it=>{
            if (it.startsWith("{@")) {
                let[tag,text] = Renderer.splitFirstSpace(it.slice(1, -1));
                const tagInfo = Renderer.tag.TAG_LOOKUP[tag];
                if (!tagInfo)
                    throw new Error(`Unhandled tag: "${tag}"`);
                return tagInfo.getStripped(tag, text);
            } else
                return it;
        }
        ).join("");
    }
    return str;
}
;

Renderer.getRollableRow = function(row, opts) {
    opts = opts || {};

    if (row[0]?.type === "cell" && (row[0]?.roll?.exact != null || (row[0]?.roll?.min != null && row[0]?.roll?.max != null)))
        return row;

    row = MiscUtil.copyFast(row);
    try {
        const cleanRow = String(row[0]).trim();

        const mLowHigh = /^(\d+) or (lower|higher)$/i.exec(cleanRow);
        if (mLowHigh) {
            row[0] = {
                type: "cell",
                entry: cleanRow
            };
            if (mLowHigh[2].toLowerCase() === "lower") {
                row[0].roll = {
                    min: -Renderer.dice.POS_INFINITE,
                    max: Number(mLowHigh[1]),
                };
            } else {
                row[0].roll = {
                    min: Number(mLowHigh[1]),
                    max: Renderer.dice.POS_INFINITE,
                };
            }

            return row;
        }

        const m = /^(\d+)([-\u2012\u2013](\d+))?$/.exec(cleanRow);
        if (m) {
            if (m[1] && !m[2]) {
                row[0] = {
                    type: "cell",
                    roll: {
                        exact: Number(m[1]),
                    },
                };
                if (m[1][0] === "0")
                    row[0].roll.pad = true;
                Renderer.getRollableRow._handleInfiniteOpts(row, opts);
            } else {
                row[0] = {
                    type: "cell",
                    roll: {
                        min: Number(m[1]),
                        max: Number(m[3]),
                    },
                };
                if (m[1][0] === "0" || m[3][0] === "0")
                    row[0].roll.pad = true;
                Renderer.getRollableRow._handleInfiniteOpts(row, opts);
            }
        } else {
            const m = /^(\d+)\+$/.exec(row[0]);
            row[0] = {
                type: "cell",
                roll: {
                    min: Number(m[1]),
                    max: Renderer.dice.POS_INFINITE,
                },
            };
        }
    } catch (e) {
        if (opts.cbErr)
            opts.cbErr(row[0], e);
    }
    return row;
}
;
Renderer.getRollableRow._handleInfiniteOpts = function(row, opts) {
    if (!opts.isForceInfiniteResults)
        return;

    const isExact = row[0].roll.exact != null;

    if (opts.isFirstRow) {
        if (!isExact)
            row[0].roll.displayMin = row[0].roll.min;
        row[0].roll.min = -Renderer.dice.POS_INFINITE;
    }

    if (opts.isLastRow) {
        if (!isExact)
            row[0].roll.displayMax = row[0].roll.max;
        row[0].roll.max = Renderer.dice.POS_INFINITE;
    }
}
;

Renderer.initLazyImageLoaders = function() {
    const images = document.querySelectorAll(`img[data-src]`);

    Renderer.utils.lazy.destroyObserver({
        observerId: "images"
    });

    const observer = Renderer.utils.lazy.getCreateObserver({
        observerId: "images",
        fnOnObserve: ({entry})=>{
            const $img = $(entry.target);
            $img.attr("src", $img.attr("data-src")).removeAttr("data-src");
        }
        ,
    });

    images.forEach(img=>observer.track(img));
}
;

Renderer.HEAD_NEG_1 = "rd__b--0";
Renderer.HEAD_0 = "rd__b--1";
Renderer.HEAD_1 = "rd__b--2";
Renderer.HEAD_2 = "rd__b--3";
Renderer.HEAD_2_SUB_VARIANT = "rd__b--4";
Renderer.DATA_NONE = "data-none";

"use strict";

Renderer.dice = {
    SYSTEM_USER: {
        name: "Avandra",
    },
    POS_INFINITE: 100000000000000000000,
    _SYMBOL_PARSE_FAILED: Symbol("parseFailed"),

    _$wrpRoll: null,
    _$minRoll: null,
    _$iptRoll: null,
    _$outRoll: null,
    _$head: null,
    _hist: [],
    _histIndex: null,
    _$lastRolledBy: null,
    _storage: null,

    _isManualMode: false,

    DICE: [4, 6, 8, 10, 12, 20, 100],
    getNextDice(faces) {
        const idx = Renderer.dice.DICE.indexOf(faces);
        if (~idx)
            return Renderer.dice.DICE[idx + 1];
        else
            return null;
    },

    getPreviousDice(faces) {
        const idx = Renderer.dice.DICE.indexOf(faces);
        if (~idx)
            return Renderer.dice.DICE[idx - 1];
        else
            return null;
    },

    _panel: null,
    bindDmScreenPanel(panel, title) {
        if (Renderer.dice._panel) {
            Renderer.dice.unbindDmScreenPanel();
        }
        Renderer.dice._showBox();
        Renderer.dice._panel = panel;
        panel.doPopulate_Rollbox(title);
    },

    unbindDmScreenPanel() {
        if (Renderer.dice._panel) {
            $(`body`).append(Renderer.dice._$wrpRoll);
            Renderer.dice._panel.close$TabContent();
            Renderer.dice._panel = null;
            Renderer.dice._hideBox();
            Renderer.dice._$wrpRoll.removeClass("rollbox-panel");
        }
    },

    get$Roller() {
        return Renderer.dice._$wrpRoll;
    },

    parseRandomise2(str) {
        if (!str || !str.trim())
            return null;
        const wrpTree = Renderer.dice.lang.getTree3(str);
        if (wrpTree)
            return wrpTree.tree.evl({});
        else
            return null;
    },

    parseAverage(str) {
        if (!str || !str.trim())
            return null;
        const wrpTree = Renderer.dice.lang.getTree3(str);
        if (wrpTree)
            return wrpTree.tree.avg({});
        else
            return null;
    },

    _showBox() {
        Renderer.dice._$minRoll.hideVe();
        Renderer.dice._$wrpRoll.showVe();
        Renderer.dice._$iptRoll.prop("placeholder", `${Renderer.dice._getRandomPlaceholder()} or "/help"`);
    },

    _hideBox() {
        Renderer.dice._$minRoll.showVe();
        Renderer.dice._$wrpRoll.hideVe();
    },

    _getRandomPlaceholder() {
        const count = RollerUtil.randomise(10);
        const faces = Renderer.dice.DICE[RollerUtil.randomise(Renderer.dice.DICE.length - 1)];
        const mod = (RollerUtil.randomise(3) - 2) * RollerUtil.randomise(10);
        const drop = (count > 1) && RollerUtil.randomise(5) === 5;
        const dropDir = drop ? RollerUtil.randomise(2) === 2 ? "h" : "l" : "";
        const dropAmount = drop ? RollerUtil.randomise(count - 1) : null;
        return `${count}d${faces}${drop ? `d${dropDir}${dropAmount}` : ""}${mod < 0 ? mod : mod > 0 ? `+${mod}` : ""}`;
    },

    async _pInit() {
        const $wrpRoll = $(`<div class="rollbox ve-flex-col min-h-0"></div>`).hideVe();
        const $minRoll = $(`<button class="rollbox-min"><span class="glyphicon glyphicon-chevron-up"></span></button>`).on("click", ()=>{
            Renderer.dice._showBox();
            Renderer.dice._$iptRoll.focus();
        }
        );
        const $head = $(`<div class="head-roll"><span class="hdr-roll">Dice Roller</span><span class="p-2 glyphicon glyphicon-remove"></span></div>`).on("click", ()=>{
            if (!Renderer.dice._panel)
                Renderer.dice._hideBox();
        }
        );
        const $outRoll = $(`<div class="out-roll">`);
        const $iptRoll = $(`<input class="ipt-roll form-control" autocomplete="off" spellcheck="false">`).on("keypress", async evt=>{
            evt.stopPropagation();
            if (evt.key !== "Enter")
                return;

            const strDice = $iptRoll.val();
            const result = await Renderer.dice.pRoll2(strDice, {
                isUser: true,
                name: "Anon",
            }, );
            $iptRoll.val("");

            if (result === Renderer.dice._SYMBOL_PARSE_FAILED) {
                Renderer.dice._showInvalid();
                $iptRoll.addClass("form-control--error");
            }
        }
        ).on("keydown", (evt)=>{
            $iptRoll.removeClass("form-control--error");

            if (evt.key === "ArrowUp") {
                evt.preventDefault();
                Renderer.dice._prevHistory();
                return;
            }

            if (evt.key === "ArrowDown") {
                evt.preventDefault();
                Renderer.dice._nextHistory();
            }
        }
        );
        $wrpRoll.append($head).append($outRoll).append($iptRoll);

        Renderer.dice._$wrpRoll = $wrpRoll;
        Renderer.dice._$minRoll = $minRoll;
        Renderer.dice._$head = $head;
        Renderer.dice._$outRoll = $outRoll;
        Renderer.dice._$iptRoll = $iptRoll;

        $(`body`).append($minRoll).append($wrpRoll);

        $wrpRoll.on("click", ".out-roll-item-code", (evt)=>Renderer.dice._$iptRoll.val($(evt.target).text()).focus());

        Renderer.dice.storage = await StorageUtil.pGet(VeCt.STORAGE_ROLLER_MACRO) || {};
    },

    _prevHistory() {
        Renderer.dice._histIndex--;
        Renderer.dice._prevNextHistory_load();
    },
    _nextHistory() {
        Renderer.dice._histIndex++;
        Renderer.dice._prevNextHistory_load();
    },

    _prevNextHistory_load() {
        Renderer.dice._cleanHistoryIndex();
        const nxtVal = Renderer.dice._hist[Renderer.dice._histIndex];
        Renderer.dice._$iptRoll.val(nxtVal);
        if (nxtVal)
            Renderer.dice._$iptRoll[0].selectionStart = Renderer.dice._$iptRoll[0].selectionEnd = nxtVal.length;
    },

    _cleanHistoryIndex: ()=>{
        if (!Renderer.dice._hist.length) {
            Renderer.dice._histIndex = null;
        } else {
            Renderer.dice._histIndex = Math.min(Renderer.dice._hist.length, Math.max(Renderer.dice._histIndex, 0));
        }
    }
    ,

    _addHistory: (str)=>{
        Renderer.dice._hist.push(str);
        Renderer.dice._histIndex = Renderer.dice._hist.length;
    }
    ,

    _scrollBottom: ()=>{
        Renderer.dice._$outRoll.scrollTop(1e10);
    }
    ,

    async pRollerClickUseData(evt, ele) {
        evt.stopPropagation();
        evt.preventDefault();

        const $ele = $(ele);
        const rollData = $ele.data("packed-dice");
        let name = $ele.data("roll-name");
        let shiftKey = evt.shiftKey;
        let ctrlKey = EventUtil.isCtrlMetaKey(evt);

        const options = rollData.toRoll.split(";").map(it=>it.trim()).filter(Boolean);

        let chosenRollData;
        if (options.length > 1) {
            const cpyRollData = MiscUtil.copyFast(rollData);
            const menu = ContextUtil.getMenu([new ContextUtil.Action("Choose Roll",null,{
                isDisabled: true
            },), null, ...options.map(it=>new ContextUtil.Action(`Roll ${it}`,evt=>{
                shiftKey = shiftKey || evt.shiftKey;
                ctrlKey = ctrlKey || (EventUtil.isCtrlMetaKey(evt));
                cpyRollData.toRoll = it;
                return cpyRollData;
            }
            ,)), ]);

            chosenRollData = await ContextUtil.pOpenMenu(evt, menu);
        } else
            chosenRollData = rollData;

        if (!chosenRollData)
            return;

        const rePrompt = /#\$prompt_number:?([^$]*)\$#/g;
        const results = [];
        let m;
        while ((m = rePrompt.exec(chosenRollData.toRoll))) {
            const optionsRaw = m[1];
            const opts = {};
            if (optionsRaw) {
                const spl = optionsRaw.split(",");
                spl.map(it=>it.trim()).forEach(part=>{
                    const [k,v] = part.split("=").map(it=>it.trim());
                    switch (k) {
                    case "min":
                    case "max":
                        opts[k] = Number(v);
                        break;
                    default:
                        opts[k] = v;
                        break;
                    }
                }
                );
            }

            if (opts.min == null)
                opts.min = 0;
            if (opts.max == null)
                opts.max = Renderer.dice.POS_INFINITE;
            if (opts.default == null)
                opts.default = 0;

            const input = await InputUiUtil.pGetUserNumber(opts);
            if (input == null)
                return;
            results.push(input);
        }

        const rollDataCpy = MiscUtil.copyFast(chosenRollData);
        rePrompt.lastIndex = 0;
        rollDataCpy.toRoll = rollDataCpy.toRoll.replace(rePrompt, ()=>results.shift());

        let rollDataCpyToRoll;
        if (rollData.prompt) {
            const sortedKeys = Object.keys(rollDataCpy.prompt.options).sort(SortUtil.ascSortLower);
            const menu = ContextUtil.getMenu([new ContextUtil.Action(rollDataCpy.prompt.entry,null,{
                isDisabled: true
            }), null, ...sortedKeys.map(it=>{
                const title = rollDataCpy.prompt.mode === "psi" ? `${it} point${it === "1" ? "" : "s"}` : `${Parser.spLevelToFull(it)} level`;

                return new ContextUtil.Action(title,evt=>{
                    shiftKey = shiftKey || evt.shiftKey;
                    ctrlKey = ctrlKey || (EventUtil.isCtrlMetaKey(evt));

                    const fromScaling = rollDataCpy.prompt.options[it];
                    if (!fromScaling) {
                        name = "";
                        return rollDataCpy;
                    } else {
                        name = rollDataCpy.prompt.mode === "psi" ? `${it} psi activation` : `${Parser.spLevelToFull(it)}-level cast`;
                        rollDataCpy.toRoll += `+${fromScaling}`;
                        return rollDataCpy;
                    }
                }
                ,);
            }
            ), ]);

            rollDataCpyToRoll = await ContextUtil.pOpenMenu(evt, menu);
        } else
            rollDataCpyToRoll = rollDataCpy;

        if (!rollDataCpyToRoll)
            return;
        await Renderer.dice.pRollerClick({
            shiftKey,
            ctrlKey
        }, ele, JSON.stringify(rollDataCpyToRoll), name);
    },

    __rerollNextInlineResult(ele) {
        const $ele = $(ele);
        const $result = $ele.next(`.result`);
        const r = Renderer.dice.__rollPackedData($ele);
        $result.text(r);
    },

    __rollPackedData($ele) {
        const wrpTree = Renderer.dice.lang.getTree3($ele.data("packed-dice").toRoll);
        return wrpTree.tree.evl({});
    },

    $getEleUnknownTableRoll(total) {
        return $(Renderer.dice._pRollerClick_getMsgBug(total));
    },

    _pRollerClick_getMsgBug(total) {
        return `<span class="message">No result found matching roll ${total}?! <span class="help-subtle" title="Bug!">🐛</span></span>`;
    },

    async pRollerClick(evtMock, ele, packed, name) {
        const $ele = $(ele);
        const entry = JSON.parse(packed);
        const additionalData = {
            ...ele.dataset
        };

        const rolledBy = {
            name: Renderer.dice._pRollerClick_attemptToGetNameOfRoller({
                $ele
            }),
            label: name != null ? name : Renderer.dice._pRollerClick_attemptToGetNameOfRoll({
                entry,
                $ele
            }),
        };

        const modRollMeta = Renderer.dice.getEventModifiedRollMeta(evtMock, entry);
        const $parent = $ele.closest("th, p, table");

        const rollResult = await this._pRollerClick_pGetResult({
            $parent,
            $ele,
            entry,
            modRollMeta,
            rolledBy,
            additionalData,
        });

        if (!entry.autoRoll)
            return;

        const $tgt = $ele.next(`[data-rd-is-autodice-result="true"]`);
        const curTxt = $tgt.text();
        $tgt.text(rollResult);
        JqueryUtil.showCopiedEffect($tgt, curTxt, true);
    },

    async _pRollerClick_pGetResult({$parent, $ele, entry, modRollMeta, rolledBy, additionalData}) {
        const sharedRollOpts = {
            rollCount: modRollMeta.rollCount,
            additionalData,
            isHidden: !!entry.autoRoll,
        };

        if ($parent.is("th") && $parent.attr("data-rd-isroller") === "true") {
            if ($parent.attr("data-rd-namegeneratorrolls")) {
                return Renderer.dice._pRollerClick_pRollGeneratorTable({
                    $parent,
                    $ele,
                    rolledBy,
                    modRollMeta,
                    rollOpts: sharedRollOpts,
                });
            }

            return Renderer.dice.pRollEntry(modRollMeta.entry, rolledBy, {
                ...sharedRollOpts,
                fnGetMessage: Renderer.dice._pRollerClick_fnGetMessageTable.bind(Renderer.dice, $ele),
            }, );
        }

        return Renderer.dice.pRollEntry(modRollMeta.entry, rolledBy, {
            ...sharedRollOpts,
        }, );
    },

    _pRollerClick_fnGetMessageTable($ele, total) {
        const elesTd = Renderer.dice._pRollerClick_$getTdsFromTotal($ele, total);
        if (elesTd) {
            const tableRow = elesTd.map(ele=>ele.innerHTML.trim()).filter(it=>it).join(" | ");
            const $row = $(`<span class="message">${tableRow}</span>`);
            Renderer.dice._pRollerClick_rollInlineRollers($ele);
            return $row.html();
        }
        return Renderer.dice._pRollerClick_getMsgBug(total);
    },

    _pRollerClick_attemptToGetNameOfRoll({entry, $ele}) {
        if (entry.name)
            return entry.name;

        let titleMaybe = $ele.closest(`table:not(.stats)`).children(`caption`).text();
        if (titleMaybe)
            return titleMaybe.trim();

        titleMaybe = $ele.parent().children(`.rd__list-item-name`).text();
        if (titleMaybe)
            return titleMaybe.trim().replace(/[.,:]$/, "");

        titleMaybe = $ele.closest(`div`).children(`.rd__h`).first().find(`.entry-title-inner`).text();
        if (titleMaybe) {
            titleMaybe = titleMaybe.trim().replace(/[.,:]$/, "");
            return titleMaybe;
        }

        titleMaybe = $ele.closest(`table.stats`).children(`tbody`).first().children(`tr`).first().find(`.rnd-name .stats-name`).text();
        if (titleMaybe)
            return titleMaybe.trim();

        if (UrlUtil.getCurrentPage() === UrlUtil.PG_CHARACTERS) {
            titleMaybe = ($ele.closest(`.chr-entity__row`).find(".chr-entity__ipt-name").val() || "").trim();
            if (titleMaybe)
                return titleMaybe;
        }

        return titleMaybe;
    },

    _pRollerClick_attemptToGetNameOfRoller({$ele}) {
        const $hov = $ele.closest(`.hwin`);
        if ($hov.length)
            return $hov.find(`.stats-name`).first().text();
        const $roll = $ele.closest(`.out-roll-wrp`);
        if ($roll.length)
            return $roll.data("name");
        const $dispPanelTitle = $ele.closest(`.dm-screen-panel`).children(`.panel-control-title`);
        if ($dispPanelTitle.length)
            return $dispPanelTitle.text().trim();
        let name = document.title.replace("- 5etools", "").trim();
        return name === "DM Screen" ? "Dungeon Master" : name;
    },

    _pRollerClick_$getTdsFromTotal($ele, total) {
        const $table = $ele.closest(`table`);
        const $tdRoll = $table.find(`td`).filter((i,e)=>{
            const $e = $(e);
            if (!$e.closest(`table`).is($table))
                return false;
            return total >= Number($e.data("roll-min")) && total <= Number($e.data("roll-max"));
        }
        );
        if ($tdRoll.length && $tdRoll.nextAll().length) {
            return $tdRoll.nextAll().get();
        }
        return null;
    },

    _pRollerClick_rollInlineRollers($ele) {
        $ele.find(`.render-roller`).each((i,e)=>{
            const $e = $(e);
            const r = Renderer.dice.__rollPackedData($e);
            $e.attr("onclick", `Renderer.dice.__rerollNextInlineResult(this)`);
            $e.after(` (<span class="result">${r}</span>)`);
        }
        );
    },

    _pRollerClick_fnGetMessageGeneratorTable($ele, ix, total) {
        const elesTd = Renderer.dice._pRollerClick_$getTdsFromTotal($ele, total);
        if (elesTd) {
            const $row = $(`<span class="message">${elesTd[ix].innerHTML.trim()}</span>`);
            Renderer.dice._pRollerClick_rollInlineRollers($ele);
            return $row.html();
        }
        return Renderer.dice._pRollerClick_getMsgBug(total);
    },

    async _pRollerClick_pRollGeneratorTable({$parent, $ele, rolledBy, modRollMeta, rollOpts}) {
        Renderer.dice.addElement({
            rolledBy,
            html: `<i>${rolledBy.label}:</i>`,
            isMessage: true
        });

        let total = 0;

        const out = [];
        const numRolls = Number($parent.attr("data-rd-namegeneratorrolls"));
        const $ths = $ele.closest(`table`).find(`th`);
        for (let i = 0; i < numRolls; ++i) {
            const cpyRolledBy = MiscUtil.copyFast(rolledBy);
            cpyRolledBy.label = $($ths.get(i + 1)).text().trim();

            const result = await Renderer.dice.pRollEntry(modRollMeta.entry, cpyRolledBy, {
                ...rollOpts,
                fnGetMessage: Renderer.dice._pRollerClick_fnGetMessageGeneratorTable.bind(Renderer.dice, $ele, i),
            }, );
            total += result;
            const elesTd = Renderer.dice._pRollerClick_$getTdsFromTotal($ele, result);

            if (!elesTd) {
                out.push(`(no result)`);
                continue;
            }

            out.push(elesTd[i].innerHTML.trim());
        }

        Renderer.dice.addElement({
            rolledBy,
            html: `= ${out.join(" ")}`,
            isMessage: true
        });

        return total;
    },

    getEventModifiedRollMeta(evt, entry) {
        const out = {
            rollCount: 1,
            entry
        };

        if (evt.shiftKey) {
            if (entry.subType === "damage") {
                const dice = [];
                entry.toRoll.replace(/\s+/g, "").replace(/\d*?d\d+/gi, m0=>dice.push(m0));
                entry.toRoll = `${entry.toRoll}${dice.length ? `+${dice.join("+")}` : ""}`;
            } else if (entry.subType === "d20") {
                if (entry.d20mod != null)
                    entry.toRoll = `2d20dl1${entry.d20mod}`;
                else
                    entry.toRoll = entry.toRoll.replace(/^\s*1?\s*d\s*20/, "2d20dl1");
            } else
                out.rollCount = 2;
        }

        if (EventUtil.isCtrlMetaKey(evt)) {
            if (entry.subType === "damage") {
                entry.toRoll = `floor((${entry.toRoll}) / 2)`;
            } else if (entry.subType === "d20") {
                if (entry.d20mod != null)
                    entry.toRoll = `2d20dh1${entry.d20mod}`;
                else
                    entry.toRoll = entry.toRoll.replace(/^\s*1?\s*d\s*20/, "2d20dh1");
            } else
                out.rollCount = 2;
        }

        return out;
    },

    async pRoll2(str, rolledBy, opts) {
        opts = opts || {};
        str = str.trim().replace(/\/r(?:oll)? /gi, "").trim();
        if (!str)
            return;
        if (rolledBy.isUser)
            Renderer.dice._addHistory(str);

        if (str.startsWith("/"))
            return Renderer.dice._pHandleCommand(str, rolledBy);
        if (str.startsWith("#"))
            return Renderer.dice._pHandleSavedRoll(str, rolledBy, opts);

        const [head,...tail] = str.split(":");
        if (tail.length) {
            str = tail.join(":");
            rolledBy.label = head;
        }
        const wrpTree = Renderer.dice.lang.getTree3(str);
        if (!wrpTree)
            return Renderer.dice._SYMBOL_PARSE_FAILED;
        return Renderer.dice._pHandleRoll2(wrpTree, rolledBy, opts);
    },

    async pRollEntry(entry, rolledBy, opts) {
        opts = opts || {};

        const rollCount = Math.round(opts.rollCount || 1);
        delete opts.rollCount;
        if (rollCount <= 0)
            throw new Error(`Invalid roll count: ${rollCount} (must be a positive integer)`);

        const wrpTree = Renderer.dice.lang.getTree3(entry.toRoll);
        wrpTree.tree.successThresh = entry.successThresh;
        wrpTree.tree.successMax = entry.successMax;
        wrpTree.tree.chanceSuccessText = entry.chanceSuccessText;
        wrpTree.tree.chanceFailureText = entry.chanceFailureText;
        wrpTree.tree.isColorSuccessFail = entry.isColorSuccessFail;

        const results = [];
        if (rollCount > 1 && !opts.isHidden)
            Renderer.dice._showMessage(`Rolling twice...`, rolledBy);
        for (let i = 0; i < rollCount; ++i) {
            const result = await Renderer.dice._pHandleRoll2(wrpTree, rolledBy, opts);
            if (result == null)
                return null;
            results.push(result);
        }
        return Math.max(...results);
    },

    async _pHandleRoll2(wrpTree, rolledBy, opts) {
        opts = {
            ...opts
        };

        if (wrpTree.meta && wrpTree.meta.hasPb) {
            const userPb = await InputUiUtil.pGetUserNumber({
                min: 0,
                int: true,
                title: "Enter Proficiency Bonus",
                default: 2,
                storageKey_default: "dice.playerProficiencyBonus",
                isGlobal_default: true,
            });
            if (userPb == null)
                return null;
            opts.pb = userPb;
        }

        if (wrpTree.meta && wrpTree.meta.hasSummonSpellLevel) {
            const predefinedSpellLevel = opts.additionalData?.summonedBySpellLevel != null && !isNaN(opts.additionalData?.summonedBySpellLevel) ? Number(opts.additionalData.summonedBySpellLevel) : null;

            const userSummonSpellLevel = await InputUiUtil.pGetUserNumber({
                min: predefinedSpellLevel ?? 0,
                int: true,
                title: "Enter Spell Level",
                default: predefinedSpellLevel ?? 1,
            });
            if (userSummonSpellLevel == null)
                return null;
            opts.summonSpellLevel = userSummonSpellLevel;
        }

        if (wrpTree.meta && wrpTree.meta.hasSummonClassLevel) {
            const predefinedClassLevel = opts.additionalData?.summonedByClassLevel != null && !isNaN(opts.additionalData?.summonedByClassLevel) ? Number(opts.additionalData.summonedByClassLevel) : null;

            const userSummonClassLevel = await InputUiUtil.pGetUserNumber({
                min: predefinedClassLevel ?? 0,
                int: true,
                title: "Enter Class Level",
                default: predefinedClassLevel ?? 1,
            });
            if (userSummonClassLevel == null)
                return null;
            opts.summonClassLevel = userSummonClassLevel;
        }

        if (Renderer.dice._isManualMode)
            return Renderer.dice._pHandleRoll2_manual(wrpTree.tree, rolledBy, opts);
        else
            return Renderer.dice._pHandleRoll2_automatic(wrpTree.tree, rolledBy, opts);
    },

    _pHandleRoll2_automatic(tree, rolledBy, opts) {
        opts = opts || {};

        if (!opts.isHidden)
            Renderer.dice._showBox();
        Renderer.dice._checkHandleName(rolledBy.name);
        const $out = Renderer.dice._$lastRolledBy;

        if (tree) {
            const meta = {};
            if (opts.pb)
                meta.pb = opts.pb;
            if (opts.summonSpellLevel)
                meta.summonSpellLevel = opts.summonSpellLevel;
            if (opts.summonClassLevel)
                meta.summonClassLevel = opts.summonClassLevel;

            const result = tree.evl(meta);
            const fullHtml = (meta.html || []).join("");
            const allMax = meta.allMax && meta.allMax.length && !(meta.allMax.filter(it=>!it).length);
            const allMin = meta.allMin && meta.allMin.length && !(meta.allMin.filter(it=>!it).length);

            const lbl = rolledBy.label && (!rolledBy.name || rolledBy.label.trim().toLowerCase() !== rolledBy.name.trim().toLowerCase()) ? rolledBy.label : null;

            const ptTarget = opts.target != null ? result >= opts.target ? ` <b>&geq;${opts.target}</b>` : ` <span class="ve-muted">&lt;${opts.target}</span>` : "";

            const isThreshSuccess = tree.successThresh != null && result > (tree.successMax || 100) - tree.successThresh;
            const isColorSuccess = tree.isColorSuccessFail || !tree.chanceSuccessText;
            const isColorFail = tree.isColorSuccessFail || !tree.chanceFailureText;
            const totalPart = tree.successThresh != null ? `<span class="roll ${isThreshSuccess && isColorSuccess ? "roll-max" : !isThreshSuccess && isColorFail ? "roll-min" : ""}">${isThreshSuccess ? (tree.chanceSuccessText || "Success!") : (tree.chanceFailureText || "Failure")}</span>` : `<span class="roll ${allMax ? "roll-max" : allMin ? "roll-min" : ""}">${result}</span>`;

            const title = `${rolledBy.name ? `${rolledBy.name} \u2014 ` : ""}${lbl ? `${lbl}: ` : ""}${tree}`;

            const message = opts.fnGetMessage ? opts.fnGetMessage(result) : null;
            ExtensionUtil.doSendRoll({
                dice: tree.toString(),
                result,
                rolledBy: rolledBy.name,
                label: [lbl, message].filter(Boolean).join(" \u2013 "),
            });

            if (!opts.isHidden) {
                $out.append(`
					<div class="out-roll-item" title="${title}">
						<div>
							${lbl ? `<span class="roll-label">${lbl}: </span>` : ""}
							${totalPart}
							${ptTarget}
							<span class="all-rolls ve-muted">${fullHtml}</span>
							${message ? `<span class="message">${message}</span>` : ""}
						</div>
						<div class="out-roll-item-button-wrp">
							<button title="Copy to input" class="btn btn-default btn-xs btn-copy-roll" onclick="Renderer.dice._$iptRoll.val('${tree.toString().replace(/\s+/g, "")}'); Renderer.dice._$iptRoll.focus()"><span class="glyphicon glyphicon-pencil"></span></button>
						</div>
					</div>`);

                Renderer.dice._scrollBottom();
            }

            return result;
        } else {
            if (!opts.isHidden) {
                $out.append(`<div class="out-roll-item">Invalid input! Try &quot;/help&quot;</div>`);
                Renderer.dice._scrollBottom();
            }
            return null;
        }
    },

    _pHandleRoll2_manual(tree, rolledBy, opts) {
        opts = opts || {};

        if (!tree)
            return JqueryUtil.doToast({
                type: "danger",
                content: `Invalid roll input!`
            });

        const title = (rolledBy.label || "").toTitleCase() || "Roll Dice";
        const $dispDice = $(`<div class="p-2 bold ve-flex-vh-center rll__prompt-header">${tree.toString()}</div>`);
        if (opts.isResultUsed) {
            return InputUiUtil.pGetUserNumber({
                title,
                $elePre: $dispDice,
            });
        } else {
            const {$modalInner} = UiUtil.getShowModal({
                title,
                isMinHeight0: true,
            });
            $dispDice.appendTo($modalInner);
            return null;
        }
    },

    _showMessage(message, rolledBy) {
        Renderer.dice._showBox();
        Renderer.dice._checkHandleName(rolledBy.name);
        const $out = Renderer.dice._$lastRolledBy;
        $out.append(`<div class="out-roll-item out-roll-item--message">${message}</div>`);
        Renderer.dice._scrollBottom();
    },

    _showInvalid() {
        Renderer.dice._showMessage("Invalid input! Try &quot;/help&quot;", Renderer.dice.SYSTEM_USER);
    },

    _validCommands: new Set(["/c", "/cls", "/clear", "/iterroll"]),
    async _pHandleCommand(com, rolledBy) {
        Renderer.dice._showMessage(`<span class="out-roll-item-code">${com}</span>`, rolledBy);
        const comParsed = Renderer.dice._getParsedCommand(com);
        const [comOp] = comParsed;

        if (comOp === "/help" || comOp === "/h") {
            Renderer.dice._showMessage(`<ul class="rll__list">
					<li>Keep highest; <span class="out-roll-item-code">4d6kh3</span></li>
					<li>Drop lowest; <span class="out-roll-item-code">4d6dl1</span></li>
					<li>Drop highest; <span class="out-roll-item-code">3d4dh1</span></li>
					<li>Keep lowest; <span class="out-roll-item-code">3d4kl1</span></li>

					<li>Reroll equal; <span class="out-roll-item-code">2d4r1</span></li>
					<li>Reroll less; <span class="out-roll-item-code">2d4r&lt;2</span></li>
					<li>Reroll less or equal; <span class="out-roll-item-code">2d4r&lt;=2</span></li>
					<li>Reroll greater; <span class="out-roll-item-code">2d4r&gt;2</span></li>
					<li>Reroll greater equal; <span class="out-roll-item-code">2d4r&gt;=3</span></li>

					<li>Explode equal; <span class="out-roll-item-code">2d4x4</span></li>
					<li>Explode less; <span class="out-roll-item-code">2d4x&lt;2</span></li>
					<li>Explode less or equal; <span class="out-roll-item-code">2d4x&lt;=2</span></li>
					<li>Explode greater; <span class="out-roll-item-code">2d4x&gt;2</span></li>
					<li>Explode greater equal; <span class="out-roll-item-code">2d4x&gt;=3</span></li>

					<li>Count Successes equal; <span class="out-roll-item-code">2d4cs=4</span></li>
					<li>Count Successes less; <span class="out-roll-item-code">2d4cs&lt;2</span></li>
					<li>Count Successes less or equal; <span class="out-roll-item-code">2d4cs&lt;=2</span></li>
					<li>Count Successes greater; <span class="out-roll-item-code">2d4cs&gt;2</span></li>
					<li>Count Successes greater equal; <span class="out-roll-item-code">2d4cs&gt;=3</span></li>

					<li>Margin of Success; <span class="out-roll-item-code">2d4ms=4</span></li>

					<li>Dice pools; <span class="out-roll-item-code">{2d8, 1d6}</span></li>
					<li>Dice pools with modifiers; <span class="out-roll-item-code">{1d20+7, 10}kh1</span></li>

					<li>Rounding; <span class="out-roll-item-code">floor(1.5)</span>, <span class="out-roll-item-code">ceil(1.5)</span>, <span class="out-roll-item-code">round(1.5)</span></li>

					<li>Average; <span class="out-roll-item-code">avg(8d6)</span></li>
					<li>Maximize dice; <span class="out-roll-item-code">dmax(8d6)</span></li>
					<li>Minimize dice; <span class="out-roll-item-code">dmin(8d6)</span></li>

					<li>Other functions; <span class="out-roll-item-code">sign(1d6-3)</span>, <span class="out-roll-item-code">abs(1d6-3)</span>, ...etc.</li>
				</ul>
				Up and down arrow keys cycle input history.<br>
				Anything before a colon is treated as a label (<span class="out-roll-item-code">Fireball: 8d6</span>)<br>
Use <span class="out-roll-item-code">/macro list</span> to list saved macros.<br>
				Use <span class="out-roll-item-code">/macro add myName 1d2+3</span> to add (or update) a macro. Macro names should not contain spaces or hashes.<br>
				Use <span class="out-roll-item-code">/macro remove myName</span> to remove a macro.<br>
				Use <span class="out-roll-item-code">#myName</span> to roll a macro.<br>
				Use <span class="out-roll-item-code">/iterroll roll count [target]</span> to roll multiple times, optionally against a target.
				Use <span class="out-roll-item-code">/clear</span> to clear the roller.`, Renderer.dice.SYSTEM_USER, );
            return;
        }

        if (comOp === "/macro") {
            const [,mode,...others] = comParsed;

            if (!["list", "add", "remove", "clear"].includes(mode))
                Renderer.dice._showInvalid();
            else {
                switch (mode) {
                case "list":
                    if (!others.length) {
                        Object.keys(Renderer.dice.storage).forEach(name=>{
                            Renderer.dice._showMessage(`<span class="out-roll-item-code">#${name}</span> \u2014 ${Renderer.dice.storage[name]}`, Renderer.dice.SYSTEM_USER);
                        }
                        );
                    } else {
                        Renderer.dice._showInvalid();
                    }
                    break;
                case "add":
                    {
                        if (others.length === 2) {
                            const [name,macro] = others;
                            if (name.includes(" ") || name.includes("#"))
                                Renderer.dice._showInvalid();
                            else {
                                Renderer.dice.storage[name] = macro;
                                await Renderer.dice._pSaveMacros();
                                Renderer.dice._showMessage(`Saved macro <span class="out-roll-item-code">#${name}</span>`, Renderer.dice.SYSTEM_USER);
                            }
                        } else {
                            Renderer.dice._showInvalid();
                        }
                        break;
                    }
                case "remove":
                    if (others.length === 1) {
                        if (Renderer.dice.storage[others[0]]) {
                            delete Renderer.dice.storage[others[0]];
                            await Renderer.dice._pSaveMacros();
                            Renderer.dice._showMessage(`Removed macro <span class="out-roll-item-code">#${others[0]}</span>`, Renderer.dice.SYSTEM_USER);
                        } else {
                            Renderer.dice._showMessage(`Macro <span class="out-roll-item-code">#${others[0]}</span> not found`, Renderer.dice.SYSTEM_USER);
                        }
                    } else {
                        Renderer.dice._showInvalid();
                    }
                    break;
                }
            }
            return;
        }

        if (Renderer.dice._validCommands.has(comOp)) {
            switch (comOp) {
            case "/c":
            case "/cls":
            case "/clear":
                Renderer.dice._$outRoll.empty();
                Renderer.dice._$lastRolledBy.empty();
                Renderer.dice._$lastRolledBy = null;
                return;

            case "/iterroll":
                {
                    let[,exp,count,target] = comParsed;

                    if (!exp)
                        return Renderer.dice._showInvalid();
                    const wrpTree = Renderer.dice.lang.getTree3(exp);
                    if (!wrpTree)
                        return Renderer.dice._showInvalid();

                    count = count && !isNaN(count) ? Number(count) : 1;
                    target = target && !isNaN(target) ? Number(target) : undefined;

                    for (let i = 0; i < count; ++i) {
                        await Renderer.dice.pRoll2(exp, {
                            name: "Anon",
                        }, {
                            target,
                        }, );
                    }
                }
            }
            return;
        }

        Renderer.dice._showInvalid();
    },

    async _pSaveMacros() {
        await StorageUtil.pSet(VeCt.STORAGE_ROLLER_MACRO, Renderer.dice.storage);
    },

    _getParsedCommand(str) {
        return str.split(/\s+/);
    },

    _pHandleSavedRoll(id, rolledBy, opts) {
        id = id.replace(/^#/, "");
        const macro = Renderer.dice.storage[id];
        if (macro) {
            rolledBy.label = id;
            const wrpTree = Renderer.dice.lang.getTree3(macro);
            return Renderer.dice._pHandleRoll2(wrpTree, rolledBy, opts);
        } else
            Renderer.dice._showMessage(`Macro <span class="out-roll-item-code">#${id}</span> not found`, Renderer.dice.SYSTEM_USER);
    },

    addRoll({rolledBy, html, $ele}) {
        if (html && $ele)
            throw new Error(`Must specify one of html or $ele!`);

        if (html != null && !html.trim())
            return;

        Renderer.dice._showBox();
        Renderer.dice._checkHandleName(rolledBy.name);

        if (html) {
            Renderer.dice._$lastRolledBy.append(`<div class="out-roll-item" title="${(rolledBy.name || "").qq()}">${html}</div>`);
        } else {
            $$`<div class="out-roll-item" title="${(rolledBy.name || "").qq()}">${$ele}</div>`.appendTo(Renderer.dice._$lastRolledBy);
        }

        Renderer.dice._scrollBottom();
    },

    addElement({rolledBy, html, $ele}) {
        if (html && $ele)
            throw new Error(`Must specify one of html or $ele!`);

        if (html != null && !html.trim())
            return;

        Renderer.dice._showBox();
        Renderer.dice._checkHandleName(rolledBy.name);

        if (html) {
            Renderer.dice._$lastRolledBy.append(`<div class="out-roll-item out-roll-item--message" title="${(rolledBy.name || "").qq()}">${html}</div>`);
        } else {
            $$`<div class="out-roll-item out-roll-item--message" title="${(rolledBy.name || "").qq()}">${$ele}</div>`.appendTo(Renderer.dice._$lastRolledBy);
        }

        Renderer.dice._scrollBottom();
    },

    _checkHandleName(name) {
        if (!Renderer.dice._$lastRolledBy || Renderer.dice._$lastRolledBy.data("name") !== name) {
            Renderer.dice._$outRoll.prepend(`<div class="ve-muted out-roll-id">${name}</div>`);
            Renderer.dice._$lastRolledBy = $(`<div class="out-roll-wrp"></div>`).data("name", name);
            Renderer.dice._$outRoll.prepend(Renderer.dice._$lastRolledBy);
        }
    },
};

Renderer.dice.util = {
    getReducedMeta(meta) {
        return {
            pb: meta.pb
        };
    },
};

Renderer.dice.lang = {
    validate3(str) {
        str = str.trim();

        let lexed;
        try {
            lexed = Renderer.dice.lang._lex3(str).lexed;
        } catch (e) {
            return e.message;
        }

        try {
            Renderer.dice.lang._parse3(lexed);
        } catch (e) {
            return e.message;
        }

        return null;
    },

    getTree3(str, isSilent=true) {
        str = str.trim();
        if (isSilent) {
            try {
                const {lexed, lexedMeta} = Renderer.dice.lang._lex3(str);
                return {
                    tree: Renderer.dice.lang._parse3(lexed),
                    meta: lexedMeta
                };
            } catch (e) {
                return null;
            }
        } else {
            const {lexed, lexedMeta} = Renderer.dice.lang._lex3(str);
            return {
                tree: Renderer.dice.lang._parse3(lexed),
                meta: lexedMeta
            };
        }
    },

    _M_NUMBER_CHAR: /[0-9.]/,
    _M_SYMBOL_CHAR: /[-+/*^=><florceidhkxunavgsmpbtqw,]/,

    _M_NUMBER: /^[\d.,]+$/,
    _lex3(str) {
        const self = {
            tokenStack: [],
            parenCount: 0,
            braceCount: 0,
            mode: null,
            token: "",
            hasPb: false,
            hasSummonSpellLevel: false,
            hasSummonClassLevel: false,
        };

        str = str.trim().replace(/\bPBd(?=\d)/g, "(PB)d").toLowerCase().replace(/\s*?\bplus\b\s*?/g, " + ").replace(/\s*?\bminus\b\s*?/g, " - ").replace(/\s*?\btimes\b\s*?/g, " * ").replace(/\s*?\bover\b\s*?/g, " / ").replace(/\s*?\bdivided by\b\s*?/g, " / ").replace(/\s+/g, "").replace(/[\u2012\u2013\u2014]/g, "-").replace(/[×]/g, "*").replace(/\*\*/g, "^").replace(/÷/g, "/").replace(/--/g, "+").replace(/\+-|-\+/g, "-");

        if (!str)
            return {
                lexed: [],
                lexedMeta: {}
            };

        this._lex3_lex(self, str);

        return {
            lexed: self.tokenStack,
            lexedMeta: {
                hasPb: self.hasPb,
                hasSummonSpellLevel: self.hasSummonSpellLevel,
                hasSummonClassLevel: self.hasSummonClassLevel
            }
        };
    },

    _lex3_lex(self, l) {
        const len = l.length;

        for (let i = 0; i < len; ++i) {
            const c = l[i];

            switch (c) {
            case "(":
                self.parenCount++;
                this._lex3_outputToken(self);
                self.token = "(";
                this._lex3_outputToken(self);
                break;
            case ")":
                self.parenCount--;
                if (self.parenCount < 0)
                    throw new Error(`Syntax error: closing <code>)</code> without opening <code>(</code>`);
                this._lex3_outputToken(self);
                self.token = ")";
                this._lex3_outputToken(self);
                break;
            case "{":
                self.braceCount++;
                this._lex3_outputToken(self);
                self.token = "{";
                this._lex3_outputToken(self);
                break;
            case "}":
                self.braceCount--;
                if (self.parenCount < 0)
                    throw new Error(`Syntax error: closing <code>}</code> without opening <code>(</code>`);
                this._lex3_outputToken(self);
                self.token = "}";
                this._lex3_outputToken(self);
                break;
            case "+":
            case "-":
            case "*":
            case "/":
            case "^":
            case ",":
                this._lex3_outputToken(self);
                self.token += c;
                this._lex3_outputToken(self);
                break;
            default:
                {
                    if (Renderer.dice.lang._M_NUMBER_CHAR.test(c)) {
                        if (self.mode === "symbol")
                            this._lex3_outputToken(self);
                        self.token += c;
                        self.mode = "text";
                    } else if (Renderer.dice.lang._M_SYMBOL_CHAR.test(c)) {
                        if (self.mode === "text")
                            this._lex3_outputToken(self);
                        self.token += c;
                        self.mode = "symbol";
                    } else
                        throw new Error(`Syntax error: unexpected character <code>${c}</code>`);
                    break;
                }
            }
        }

        this._lex3_outputToken(self);
    },

    _lex3_outputToken(self) {
        if (!self.token)
            return;

        switch (self.token) {
        case "(":
            self.tokenStack.push(Renderer.dice.tk.PAREN_OPEN);
            break;
        case ")":
            self.tokenStack.push(Renderer.dice.tk.PAREN_CLOSE);
            break;
        case "{":
            self.tokenStack.push(Renderer.dice.tk.BRACE_OPEN);
            break;
        case "}":
            self.tokenStack.push(Renderer.dice.tk.BRACE_CLOSE);
            break;
        case ",":
            self.tokenStack.push(Renderer.dice.tk.COMMA);
            break;
        case "+":
            self.tokenStack.push(Renderer.dice.tk.ADD);
            break;
        case "-":
            self.tokenStack.push(Renderer.dice.tk.SUB);
            break;
        case "*":
            self.tokenStack.push(Renderer.dice.tk.MULT);
            break;
        case "/":
            self.tokenStack.push(Renderer.dice.tk.DIV);
            break;
        case "^":
            self.tokenStack.push(Renderer.dice.tk.POW);
            break;
        case "pb":
            self.tokenStack.push(Renderer.dice.tk.PB);
            self.hasPb = true;
            break;
        case "summonspelllevel":
            self.tokenStack.push(Renderer.dice.tk.SUMMON_SPELL_LEVEL);
            self.hasSummonSpellLevel = true;
            break;
        case "summonclasslevel":
            self.tokenStack.push(Renderer.dice.tk.SUMMON_CLASS_LEVEL);
            self.hasSummonClassLevel = true;
            break;
        case "floor":
            self.tokenStack.push(Renderer.dice.tk.FLOOR);
            break;
        case "ceil":
            self.tokenStack.push(Renderer.dice.tk.CEIL);
            break;
        case "round":
            self.tokenStack.push(Renderer.dice.tk.ROUND);
            break;
        case "avg":
            self.tokenStack.push(Renderer.dice.tk.AVERAGE);
            break;
        case "dmax":
            self.tokenStack.push(Renderer.dice.tk.DMAX);
            break;
        case "dmin":
            self.tokenStack.push(Renderer.dice.tk.DMIN);
            break;
        case "sign":
            self.tokenStack.push(Renderer.dice.tk.SIGN);
            break;
        case "abs":
            self.tokenStack.push(Renderer.dice.tk.ABS);
            break;
        case "cbrt":
            self.tokenStack.push(Renderer.dice.tk.CBRT);
            break;
        case "sqrt":
            self.tokenStack.push(Renderer.dice.tk.SQRT);
            break;
        case "exp":
            self.tokenStack.push(Renderer.dice.tk.EXP);
            break;
        case "log":
            self.tokenStack.push(Renderer.dice.tk.LOG);
            break;
        case "random":
            self.tokenStack.push(Renderer.dice.tk.RANDOM);
            break;
        case "trunc":
            self.tokenStack.push(Renderer.dice.tk.TRUNC);
            break;
        case "pow":
            self.tokenStack.push(Renderer.dice.tk.POW);
            break;
        case "max":
            self.tokenStack.push(Renderer.dice.tk.MAX);
            break;
        case "min":
            self.tokenStack.push(Renderer.dice.tk.MIN);
            break;
        case "d":
            self.tokenStack.push(Renderer.dice.tk.DICE);
            break;
        case "dh":
            self.tokenStack.push(Renderer.dice.tk.DROP_HIGHEST);
            break;
        case "kh":
            self.tokenStack.push(Renderer.dice.tk.KEEP_HIGHEST);
            break;
        case "dl":
            self.tokenStack.push(Renderer.dice.tk.DROP_LOWEST);
            break;
        case "kl":
            self.tokenStack.push(Renderer.dice.tk.KEEP_LOWEST);
            break;
        case "r":
            self.tokenStack.push(Renderer.dice.tk.REROLL_EXACT);
            break;
        case "r>":
            self.tokenStack.push(Renderer.dice.tk.REROLL_GT);
            break;
        case "r>=":
            self.tokenStack.push(Renderer.dice.tk.REROLL_GTEQ);
            break;
        case "r<":
            self.tokenStack.push(Renderer.dice.tk.REROLL_LT);
            break;
        case "r<=":
            self.tokenStack.push(Renderer.dice.tk.REROLL_LTEQ);
            break;
        case "x":
            self.tokenStack.push(Renderer.dice.tk.EXPLODE_EXACT);
            break;
        case "x>":
            self.tokenStack.push(Renderer.dice.tk.EXPLODE_GT);
            break;
        case "x>=":
            self.tokenStack.push(Renderer.dice.tk.EXPLODE_GTEQ);
            break;
        case "x<":
            self.tokenStack.push(Renderer.dice.tk.EXPLODE_LT);
            break;
        case "x<=":
            self.tokenStack.push(Renderer.dice.tk.EXPLODE_LTEQ);
            break;
        case "cs=":
            self.tokenStack.push(Renderer.dice.tk.COUNT_SUCCESS_EXACT);
            break;
        case "cs>":
            self.tokenStack.push(Renderer.dice.tk.COUNT_SUCCESS_GT);
            break;
        case "cs>=":
            self.tokenStack.push(Renderer.dice.tk.COUNT_SUCCESS_GTEQ);
            break;
        case "cs<":
            self.tokenStack.push(Renderer.dice.tk.COUNT_SUCCESS_LT);
            break;
        case "cs<=":
            self.tokenStack.push(Renderer.dice.tk.COUNT_SUCCESS_LTEQ);
            break;
        case "ms=":
            self.tokenStack.push(Renderer.dice.tk.MARGIN_SUCCESS_EXACT);
            break;
        case "ms>":
            self.tokenStack.push(Renderer.dice.tk.MARGIN_SUCCESS_GT);
            break;
        case "ms>=":
            self.tokenStack.push(Renderer.dice.tk.MARGIN_SUCCESS_GTEQ);
            break;
        case "ms<":
            self.tokenStack.push(Renderer.dice.tk.MARGIN_SUCCESS_LT);
            break;
        case "ms<=":
            self.tokenStack.push(Renderer.dice.tk.MARGIN_SUCCESS_LTEQ);
            break;
        default:
            {
                if (Renderer.dice.lang._M_NUMBER.test(self.token)) {
                    if (self.token.split(Parser._decimalSeparator).length > 2)
                        throw new Error(`Syntax error: too many decimal separators <code>${self.token}</code>`);
                    self.tokenStack.push(Renderer.dice.tk.NUMBER(self.token));
                } else
                    throw new Error(`Syntax error: unexpected token <code>${self.token}</code>`);
            }
        }

        self.token = "";
    },

    _parse3(lexed) {
        const self = {
            ixSym: -1,
            syms: lexed,
            sym: null,
            lastAccepted: null,
            isIgnoreCommas: true,
        };

        this._parse3_nextSym(self);
        return this._parse3_expression(self);
    },

    _parse3_nextSym(self) {
        const cur = self.syms[self.ixSym];
        self.ixSym++;
        self.sym = self.syms[self.ixSym];
        return cur;
    },

    _parse3_match(self, symbol) {
        if (self.sym == null)
            return false;
        if (symbol.type)
            symbol = symbol.type;
        return self.sym.type === symbol;
    },

    _parse3_accept(self, symbol) {
        if (this._parse3_match(self, symbol)) {
            const out = self.sym;
            this._parse3_nextSym(self);
            self.lastAccepted = out;
            return out;
        }
        return false;
    },

    _parse3_expect(self, symbol) {
        const accepted = this._parse3_accept(self, symbol);
        if (accepted)
            return accepted;
        if (self.sym)
            throw new Error(`Unexpected input: Expected <code>${symbol}</code> but found <code>${self.sym}</code>`);
        else
            throw new Error(`Unexpected end of input: Expected <code>${symbol}</code>`);
    },

    _parse3_factor(self, {isSilent=false}={}) {
        if (this._parse3_accept(self, Renderer.dice.tk.TYP_NUMBER)) {
            if (self.isIgnoreCommas) {
                const syms = [self.lastAccepted];
                while (this._parse3_accept(self, Renderer.dice.tk.COMMA)) {
                    const sym = this._parse3_expect(self, Renderer.dice.tk.TYP_NUMBER);
                    syms.push(sym);
                }
                const sym = Renderer.dice.tk.NUMBER(syms.map(it=>it.value).join(""));
                return new Renderer.dice.parsed.Factor(sym);
            }

            return new Renderer.dice.parsed.Factor(self.lastAccepted);
        } else if (this._parse3_accept(self, Renderer.dice.tk.PB)) {
            return new Renderer.dice.parsed.Factor(Renderer.dice.tk.PB);
        } else if (this._parse3_accept(self, Renderer.dice.tk.SUMMON_SPELL_LEVEL)) {
            return new Renderer.dice.parsed.Factor(Renderer.dice.tk.SUMMON_SPELL_LEVEL);
        } else if (this._parse3_accept(self, Renderer.dice.tk.SUMMON_CLASS_LEVEL)) {
            return new Renderer.dice.parsed.Factor(Renderer.dice.tk.SUMMON_CLASS_LEVEL);
        } else if (this._parse3_match(self, Renderer.dice.tk.FLOOR) || this._parse3_match(self, Renderer.dice.tk.CEIL) || this._parse3_match(self, Renderer.dice.tk.ROUND) || this._parse3_match(self, Renderer.dice.tk.AVERAGE) || this._parse3_match(self, Renderer.dice.tk.DMAX) || this._parse3_match(self, Renderer.dice.tk.DMIN) || this._parse3_match(self, Renderer.dice.tk.SIGN) || this._parse3_match(self, Renderer.dice.tk.ABS) || this._parse3_match(self, Renderer.dice.tk.CBRT) || this._parse3_match(self, Renderer.dice.tk.SQRT) || this._parse3_match(self, Renderer.dice.tk.EXP) || this._parse3_match(self, Renderer.dice.tk.LOG) || this._parse3_match(self, Renderer.dice.tk.RANDOM) || this._parse3_match(self, Renderer.dice.tk.TRUNC)) {
            const children = [];

            children.push(this._parse3_nextSym(self));
            this._parse3_expect(self, Renderer.dice.tk.PAREN_OPEN);
            children.push(this._parse3_expression(self));
            this._parse3_expect(self, Renderer.dice.tk.PAREN_CLOSE);

            return new Renderer.dice.parsed.Function(children);
        } else if (this._parse3_match(self, Renderer.dice.tk.POW)) {
            self.isIgnoreCommas = false;

            const children = [];

            children.push(this._parse3_nextSym(self));
            this._parse3_expect(self, Renderer.dice.tk.PAREN_OPEN);
            children.push(this._parse3_expression(self));
            this._parse3_expect(self, Renderer.dice.tk.COMMA);
            children.push(this._parse3_expression(self));
            this._parse3_expect(self, Renderer.dice.tk.PAREN_CLOSE);

            self.isIgnoreCommas = true;

            return new Renderer.dice.parsed.Function(children);
        } else if (this._parse3_match(self, Renderer.dice.tk.MAX) || this._parse3_match(self, Renderer.dice.tk.MIN)) {
            self.isIgnoreCommas = false;

            const children = [];

            children.push(this._parse3_nextSym(self));
            this._parse3_expect(self, Renderer.dice.tk.PAREN_OPEN);
            children.push(this._parse3_expression(self));
            while (this._parse3_accept(self, Renderer.dice.tk.COMMA))
                children.push(this._parse3_expression(self));
            this._parse3_expect(self, Renderer.dice.tk.PAREN_CLOSE);

            self.isIgnoreCommas = true;

            return new Renderer.dice.parsed.Function(children);
        } else if (this._parse3_accept(self, Renderer.dice.tk.PAREN_OPEN)) {
            const exp = this._parse3_expression(self);
            this._parse3_expect(self, Renderer.dice.tk.PAREN_CLOSE);
            return new Renderer.dice.parsed.Factor(exp,{
                hasParens: true
            });
        } else if (this._parse3_accept(self, Renderer.dice.tk.BRACE_OPEN)) {
            self.isIgnoreCommas = false;

            const children = [];

            children.push(this._parse3_expression(self));
            while (this._parse3_accept(self, Renderer.dice.tk.COMMA))
                children.push(this._parse3_expression(self));

            this._parse3_expect(self, Renderer.dice.tk.BRACE_CLOSE);

            self.isIgnoreCommas = true;

            const modPart = [];
            this._parse3__dice_modifiers(self, modPart);

            return new Renderer.dice.parsed.Pool(children,modPart[0]);
        } else {
            if (isSilent)
                return null;

            if (self.sym)
                throw new Error(`Unexpected input: <code>${self.sym}</code>`);
            else
                throw new Error(`Unexpected end of input`);
        }
    },

    _parse3_dice(self) {
        const children = [];

        if (this._parse3_match(self, Renderer.dice.tk.DICE))
            children.push(new Renderer.dice.parsed.Factor(Renderer.dice.tk.NUMBER(1)));
        else
            children.push(this._parse3_factor(self));

        while (this._parse3_match(self, Renderer.dice.tk.DICE)) {
            this._parse3_nextSym(self);
            children.push(this._parse3_factor(self));
            this._parse3__dice_modifiers(self, children);
        }
        return new Renderer.dice.parsed.Dice(children);
    },

    _parse3__dice_modifiers(self, children) {
        const modsMeta = new Renderer.dice.lang.DiceModMeta();

        while (this._parse3_match(self, Renderer.dice.tk.DROP_HIGHEST) || this._parse3_match(self, Renderer.dice.tk.KEEP_HIGHEST) || this._parse3_match(self, Renderer.dice.tk.DROP_LOWEST) || this._parse3_match(self, Renderer.dice.tk.KEEP_LOWEST) || this._parse3_match(self, Renderer.dice.tk.REROLL_EXACT) || this._parse3_match(self, Renderer.dice.tk.REROLL_GT) || this._parse3_match(self, Renderer.dice.tk.REROLL_GTEQ) || this._parse3_match(self, Renderer.dice.tk.REROLL_LT) || this._parse3_match(self, Renderer.dice.tk.REROLL_LTEQ) || this._parse3_match(self, Renderer.dice.tk.EXPLODE_EXACT) || this._parse3_match(self, Renderer.dice.tk.EXPLODE_GT) || this._parse3_match(self, Renderer.dice.tk.EXPLODE_GTEQ) || this._parse3_match(self, Renderer.dice.tk.EXPLODE_LT) || this._parse3_match(self, Renderer.dice.tk.EXPLODE_LTEQ) || this._parse3_match(self, Renderer.dice.tk.COUNT_SUCCESS_EXACT) || this._parse3_match(self, Renderer.dice.tk.COUNT_SUCCESS_GT) || this._parse3_match(self, Renderer.dice.tk.COUNT_SUCCESS_GTEQ) || this._parse3_match(self, Renderer.dice.tk.COUNT_SUCCESS_LT) || this._parse3_match(self, Renderer.dice.tk.COUNT_SUCCESS_LTEQ) || this._parse3_match(self, Renderer.dice.tk.MARGIN_SUCCESS_EXACT) || this._parse3_match(self, Renderer.dice.tk.MARGIN_SUCCESS_GT) || this._parse3_match(self, Renderer.dice.tk.MARGIN_SUCCESS_GTEQ) || this._parse3_match(self, Renderer.dice.tk.MARGIN_SUCCESS_LT) || this._parse3_match(self, Renderer.dice.tk.MARGIN_SUCCESS_LTEQ)) {
            const nxtSym = this._parse3_nextSym(self);
            const nxtFactor = this._parse3__dice_modifiers_nxtFactor(self, nxtSym);

            if (nxtSym.isSuccessMode)
                modsMeta.isSuccessMode = true;
            modsMeta.mods.push({
                modSym: nxtSym,
                numSym: nxtFactor
            });
        }

        if (modsMeta.mods.length)
            children.push(modsMeta);
    },

    _parse3__dice_modifiers_nxtFactor(self, nxtSym) {
        if (nxtSym.diceModifierImplicit == null)
            return this._parse3_factor(self, {
                isSilent: true
            });

        const fallback = new Renderer.dice.parsed.Factor(Renderer.dice.tk.NUMBER(nxtSym.diceModifierImplicit));
        if (self.sym == null)
            return fallback;

        const out = this._parse3_factor(self, {
            isSilent: true
        });
        if (out)
            return out;

        return fallback;
    },

    _parse3_exponent(self) {
        const children = [];
        children.push(this._parse3_dice(self));
        while (this._parse3_match(self, Renderer.dice.tk.POW)) {
            this._parse3_nextSym(self);
            children.push(this._parse3_dice(self));
        }
        return new Renderer.dice.parsed.Exponent(children);
    },

    _parse3_term(self) {
        const children = [];
        children.push(this._parse3_exponent(self));
        while (this._parse3_match(self, Renderer.dice.tk.MULT) || this._parse3_match(self, Renderer.dice.tk.DIV)) {
            children.push(this._parse3_nextSym(self));
            children.push(this._parse3_exponent(self));
        }
        return new Renderer.dice.parsed.Term(children);
    },

    _parse3_expression(self) {
        const children = [];
        if (this._parse3_match(self, Renderer.dice.tk.ADD) || this._parse3_match(self, Renderer.dice.tk.SUB))
            children.push(this._parse3_nextSym(self));
        children.push(this._parse3_term(self));
        while (this._parse3_match(self, Renderer.dice.tk.ADD) || this._parse3_match(self, Renderer.dice.tk.SUB)) {
            children.push(this._parse3_nextSym(self));
            children.push(this._parse3_term(self));
        }
        return new Renderer.dice.parsed.Expression(children);
    },

    DiceModMeta: class {
        constructor() {
            this.isDiceModifierGroup = true;
            this.isSuccessMode = false;
            this.mods = [];
        }
    }
    ,
};

Renderer.dice.tk = {
    Token: class {
        constructor(type, value, asString, opts) {
            opts = opts || {};
            this.type = type;
            this.value = value;
            this._asString = asString;
            if (opts.isDiceModifier)
                this.isDiceModifier = true;
            if (opts.diceModifierImplicit)
                this.diceModifierImplicit = true;
            if (opts.isSuccessMode)
                this.isSuccessMode = true;
        }

        eq(other) {
            return other && other.type === this.type;
        }

        toString() {
            if (this._asString)
                return this._asString;
            return this.toDebugString();
        }

        toDebugString() {
            return `${this.type}${this.value ? ` :: ${this.value}` : ""}`;
        }
    }
    ,

    _new(type, asString, opts) {
        return new Renderer.dice.tk.Token(type,null,asString,opts);
    },

    TYP_NUMBER: "NUMBER",
    TYP_DICE: "DICE",
    TYP_SYMBOL: "SYMBOL",
    NUMBER(val) {
        return new Renderer.dice.tk.Token(Renderer.dice.tk.TYP_NUMBER,val);
    },
};
Renderer.dice.tk.PAREN_OPEN = Renderer.dice.tk._new("PAREN_OPEN", "(");
Renderer.dice.tk.PAREN_CLOSE = Renderer.dice.tk._new("PAREN_CLOSE", ")");
Renderer.dice.tk.BRACE_OPEN = Renderer.dice.tk._new("BRACE_OPEN", "{");
Renderer.dice.tk.BRACE_CLOSE = Renderer.dice.tk._new("BRACE_CLOSE", "}");
Renderer.dice.tk.COMMA = Renderer.dice.tk._new("COMMA", ",");
Renderer.dice.tk.ADD = Renderer.dice.tk._new("ADD", "+");
Renderer.dice.tk.SUB = Renderer.dice.tk._new("SUB", "-");
Renderer.dice.tk.MULT = Renderer.dice.tk._new("MULT", "*");
Renderer.dice.tk.DIV = Renderer.dice.tk._new("DIV", "/");
Renderer.dice.tk.POW = Renderer.dice.tk._new("POW", "^");
Renderer.dice.tk.PB = Renderer.dice.tk._new("PB", "pb");
Renderer.dice.tk.SUMMON_SPELL_LEVEL = Renderer.dice.tk._new("SUMMON_SPELL_LEVEL", "summonspelllevel");
Renderer.dice.tk.SUMMON_CLASS_LEVEL = Renderer.dice.tk._new("SUMMON_CLASS_LEVEL", "summonclasslevel");
Renderer.dice.tk.FLOOR = Renderer.dice.tk._new("FLOOR", "floor");
Renderer.dice.tk.CEIL = Renderer.dice.tk._new("CEIL", "ceil");
Renderer.dice.tk.ROUND = Renderer.dice.tk._new("ROUND", "round");
Renderer.dice.tk.AVERAGE = Renderer.dice.tk._new("AVERAGE", "avg");
Renderer.dice.tk.DMAX = Renderer.dice.tk._new("DMAX", "avg");
Renderer.dice.tk.DMIN = Renderer.dice.tk._new("DMIN", "avg");
Renderer.dice.tk.SIGN = Renderer.dice.tk._new("SIGN", "sign");
Renderer.dice.tk.ABS = Renderer.dice.tk._new("ABS", "abs");
Renderer.dice.tk.CBRT = Renderer.dice.tk._new("CBRT", "cbrt");
Renderer.dice.tk.SQRT = Renderer.dice.tk._new("SQRT", "sqrt");
Renderer.dice.tk.EXP = Renderer.dice.tk._new("EXP", "exp");
Renderer.dice.tk.LOG = Renderer.dice.tk._new("LOG", "log");
Renderer.dice.tk.RANDOM = Renderer.dice.tk._new("RANDOM", "random");
Renderer.dice.tk.TRUNC = Renderer.dice.tk._new("TRUNC", "trunc");
Renderer.dice.tk.POW = Renderer.dice.tk._new("POW", "pow");
Renderer.dice.tk.MAX = Renderer.dice.tk._new("MAX", "max");
Renderer.dice.tk.MIN = Renderer.dice.tk._new("MIN", "min");
Renderer.dice.tk.DICE = Renderer.dice.tk._new("DICE", "d");
Renderer.dice.tk.DROP_HIGHEST = Renderer.dice.tk._new("DH", "dh", {
    isDiceModifier: true,
    diceModifierImplicit: 1
});
Renderer.dice.tk.KEEP_HIGHEST = Renderer.dice.tk._new("KH", "kh", {
    isDiceModifier: true,
    diceModifierImplicit: 1
});
Renderer.dice.tk.DROP_LOWEST = Renderer.dice.tk._new("DL", "dl", {
    isDiceModifier: true,
    diceModifierImplicit: 1
});
Renderer.dice.tk.KEEP_LOWEST = Renderer.dice.tk._new("KL", "kl", {
    isDiceModifier: true,
    diceModifierImplicit: 1
});
Renderer.dice.tk.REROLL_EXACT = Renderer.dice.tk._new("REROLL", "r", {
    isDiceModifier: true
});
Renderer.dice.tk.REROLL_GT = Renderer.dice.tk._new("REROLL_GT", "r>", {
    isDiceModifier: true
});
Renderer.dice.tk.REROLL_GTEQ = Renderer.dice.tk._new("REROLL_GTEQ", "r>=", {
    isDiceModifier: true
});
Renderer.dice.tk.REROLL_LT = Renderer.dice.tk._new("REROLL_LT", "r<", {
    isDiceModifier: true
});
Renderer.dice.tk.REROLL_LTEQ = Renderer.dice.tk._new("REROLL_LTEQ", "r<=", {
    isDiceModifier: true
});
Renderer.dice.tk.EXPLODE_EXACT = Renderer.dice.tk._new("EXPLODE", "x", {
    isDiceModifier: true
});
Renderer.dice.tk.EXPLODE_GT = Renderer.dice.tk._new("EXPLODE_GT", "x>", {
    isDiceModifier: true
});
Renderer.dice.tk.EXPLODE_GTEQ = Renderer.dice.tk._new("EXPLODE_GTEQ", "x>=", {
    isDiceModifier: true
});
Renderer.dice.tk.EXPLODE_LT = Renderer.dice.tk._new("EXPLODE_LT", "x<", {
    isDiceModifier: true
});
Renderer.dice.tk.EXPLODE_LTEQ = Renderer.dice.tk._new("EXPLODE_LTEQ", "x<=", {
    isDiceModifier: true
});
Renderer.dice.tk.COUNT_SUCCESS_EXACT = Renderer.dice.tk._new("COUNT_SUCCESS_EXACT", "cs=", {
    isDiceModifier: true,
    isSuccessMode: true
});
Renderer.dice.tk.COUNT_SUCCESS_GT = Renderer.dice.tk._new("COUNT_SUCCESS_GT", "cs>", {
    isDiceModifier: true,
    isSuccessMode: true
});
Renderer.dice.tk.COUNT_SUCCESS_GTEQ = Renderer.dice.tk._new("COUNT_SUCCESS_GTEQ", "cs>=", {
    isDiceModifier: true,
    isSuccessMode: true
});
Renderer.dice.tk.COUNT_SUCCESS_LT = Renderer.dice.tk._new("COUNT_SUCCESS_LT", "cs<", {
    isDiceModifier: true,
    isSuccessMode: true
});
Renderer.dice.tk.COUNT_SUCCESS_LTEQ = Renderer.dice.tk._new("COUNT_SUCCESS_LTEQ", "cs<=", {
    isDiceModifier: true,
    isSuccessMode: true
});
Renderer.dice.tk.MARGIN_SUCCESS_EXACT = Renderer.dice.tk._new("MARGIN_SUCCESS_EXACT", "ms=", {
    isDiceModifier: true
});
Renderer.dice.tk.MARGIN_SUCCESS_GT = Renderer.dice.tk._new("MARGIN_SUCCESS_GT", "ms>", {
    isDiceModifier: true
});
Renderer.dice.tk.MARGIN_SUCCESS_GTEQ = Renderer.dice.tk._new("MARGIN_SUCCESS_GTEQ", "ms>=", {
    isDiceModifier: true
});
Renderer.dice.tk.MARGIN_SUCCESS_LT = Renderer.dice.tk._new("MARGIN_SUCCESS_LT", "ms<", {
    isDiceModifier: true
});
Renderer.dice.tk.MARGIN_SUCCESS_LTEQ = Renderer.dice.tk._new("MARGIN_SUCCESS_LTEQ", "ms<=", {
    isDiceModifier: true
});

Renderer.dice.AbstractSymbol = class {
    constructor() {
        this.type = Renderer.dice.tk.TYP_SYMBOL;
    }
    eq(symbol) {
        return symbol && this.type === symbol.type;
    }
    evl(meta) {
        this.meta = meta;
        return this._evl(meta);
    }
    avg(meta) {
        this.meta = meta;
        return this._avg(meta);
    }
    min(meta) {
        this.meta = meta;
        return this._min(meta);
    }
    max(meta) {
        this.meta = meta;
        return this._max(meta);
    }
    _evl() {
        throw new Error("Unimplemented!");
    }
    _avg() {
        throw new Error("Unimplemented!");
    }
    _min() {
        throw new Error("Unimplemented!");
    }
    _max() {
        throw new Error("Unimplemented!");
    }
    toString() {
        throw new Error("Unimplemented!");
    }
    addToMeta(meta, {text, html=null, md=null}={}) {
        if (!meta)
            return;
        html = html || text;
        md = md || text;
        (meta.html = meta.html || []).push(html);
        (meta.text = meta.text || []).push(text);
        (meta.md = meta.md || []).push(md);
    }
}
;

Renderer.dice.parsed = {
    _PARTITION_EQ: (r,compareTo)=>r === compareTo,
    _PARTITION_GT: (r,compareTo)=>r > compareTo,
    _PARTITION_GTEQ: (r,compareTo)=>r >= compareTo,
    _PARTITION_LT: (r,compareTo)=>r < compareTo,
    _PARTITION_LTEQ: (r,compareTo)=>r <= compareTo,

    _handleModifiers(fnName, meta, vals, nodeMod, opts) {
        opts = opts || {};

        const displayVals = vals.slice();
        const {mods} = nodeMod;

        for (const mod of mods) {
            vals.sort(SortUtil.ascSortProp.bind(null, "val")).reverse();
            const valsAlive = vals.filter(it=>!it.isDropped);

            const modNum = mod.numSym[fnName]();

            switch (mod.modSym.type) {
            case Renderer.dice.tk.DROP_HIGHEST.type:
            case Renderer.dice.tk.KEEP_HIGHEST.type:
            case Renderer.dice.tk.DROP_LOWEST.type:
            case Renderer.dice.tk.KEEP_LOWEST.type:
                {
                    const isHighest = mod.modSym.type.endsWith("H");

                    const splitPoint = isHighest ? modNum : valsAlive.length - modNum;

                    const highSlice = valsAlive.slice(0, splitPoint);
                    const lowSlice = valsAlive.slice(splitPoint, valsAlive.length);

                    switch (mod.modSym.type) {
                    case Renderer.dice.tk.DROP_HIGHEST.type:
                    case Renderer.dice.tk.KEEP_LOWEST.type:
                        highSlice.forEach(val=>val.isDropped = true);
                        break;
                    case Renderer.dice.tk.KEEP_HIGHEST.type:
                    case Renderer.dice.tk.DROP_LOWEST.type:
                        lowSlice.forEach(val=>val.isDropped = true);
                        break;
                    default:
                        throw new Error(`Unimplemented!`);
                    }
                    break;
                }

            case Renderer.dice.tk.REROLL_EXACT.type:
            case Renderer.dice.tk.REROLL_GT.type:
            case Renderer.dice.tk.REROLL_GTEQ.type:
            case Renderer.dice.tk.REROLL_LT.type:
            case Renderer.dice.tk.REROLL_LTEQ.type:
                {
                    let fnPartition;
                    switch (mod.modSym.type) {
                    case Renderer.dice.tk.REROLL_EXACT.type:
                        fnPartition = Renderer.dice.parsed._PARTITION_EQ;
                        break;
                    case Renderer.dice.tk.REROLL_GT.type:
                        fnPartition = Renderer.dice.parsed._PARTITION_GT;
                        break;
                    case Renderer.dice.tk.REROLL_GTEQ.type:
                        fnPartition = Renderer.dice.parsed._PARTITION_GTEQ;
                        break;
                    case Renderer.dice.tk.REROLL_LT.type:
                        fnPartition = Renderer.dice.parsed._PARTITION_LT;
                        break;
                    case Renderer.dice.tk.REROLL_LTEQ.type:
                        fnPartition = Renderer.dice.parsed._PARTITION_LTEQ;
                        break;
                    default:
                        throw new Error(`Unimplemented!`);
                    }

                    const toReroll = valsAlive.filter(val=>fnPartition(val.val, modNum));
                    toReroll.forEach(val=>val.isDropped = true);

                    const nuVals = opts.fnGetRerolls(toReroll);

                    vals.push(...nuVals);
                    displayVals.push(...nuVals);
                    break;
                }

            case Renderer.dice.tk.EXPLODE_EXACT.type:
            case Renderer.dice.tk.EXPLODE_GT.type:
            case Renderer.dice.tk.EXPLODE_GTEQ.type:
            case Renderer.dice.tk.EXPLODE_LT.type:
            case Renderer.dice.tk.EXPLODE_LTEQ.type:
                {
                    let fnPartition;
                    switch (mod.modSym.type) {
                    case Renderer.dice.tk.EXPLODE_EXACT.type:
                        fnPartition = Renderer.dice.parsed._PARTITION_EQ;
                        break;
                    case Renderer.dice.tk.EXPLODE_GT.type:
                        fnPartition = Renderer.dice.parsed._PARTITION_GT;
                        break;
                    case Renderer.dice.tk.EXPLODE_GTEQ.type:
                        fnPartition = Renderer.dice.parsed._PARTITION_GTEQ;
                        break;
                    case Renderer.dice.tk.EXPLODE_LT.type:
                        fnPartition = Renderer.dice.parsed._PARTITION_LT;
                        break;
                    case Renderer.dice.tk.EXPLODE_LTEQ.type:
                        fnPartition = Renderer.dice.parsed._PARTITION_LTEQ;
                        break;
                    default:
                        throw new Error(`Unimplemented!`);
                    }

                    let tries = 999;
                    let lastLen;
                    let toExplodeNext = valsAlive;
                    do {
                        lastLen = vals.length;

                        const [toExplode] = toExplodeNext.partition(roll=>!roll.isExploded && fnPartition(roll.val, modNum));
                        toExplode.forEach(roll=>roll.isExploded = true);

                        const nuVals = opts.fnGetExplosions(toExplode);

                        toExplodeNext = nuVals;

                        vals.push(...nuVals);
                        displayVals.push(...nuVals);
                    } while (tries-- > 0 && vals.length !== lastLen);

                    if (!~tries)
                        JqueryUtil.doToast({
                            type: "warning",
                            content: `Stopped exploding after 999 additional rolls.`
                        });

                    break;
                }

            case Renderer.dice.tk.COUNT_SUCCESS_EXACT.type:
            case Renderer.dice.tk.COUNT_SUCCESS_GT.type:
            case Renderer.dice.tk.COUNT_SUCCESS_GTEQ.type:
            case Renderer.dice.tk.COUNT_SUCCESS_LT.type:
            case Renderer.dice.tk.COUNT_SUCCESS_LTEQ.type:
                {
                    let fnPartition;
                    switch (mod.modSym.type) {
                    case Renderer.dice.tk.COUNT_SUCCESS_EXACT.type:
                        fnPartition = Renderer.dice.parsed._PARTITION_EQ;
                        break;
                    case Renderer.dice.tk.COUNT_SUCCESS_GT.type:
                        fnPartition = Renderer.dice.parsed._PARTITION_GT;
                        break;
                    case Renderer.dice.tk.COUNT_SUCCESS_GTEQ.type:
                        fnPartition = Renderer.dice.parsed._PARTITION_GTEQ;
                        break;
                    case Renderer.dice.tk.COUNT_SUCCESS_LT.type:
                        fnPartition = Renderer.dice.parsed._PARTITION_LT;
                        break;
                    case Renderer.dice.tk.COUNT_SUCCESS_LTEQ.type:
                        fnPartition = Renderer.dice.parsed._PARTITION_LTEQ;
                        break;
                    default:
                        throw new Error(`Unimplemented!`);
                    }

                    const successes = valsAlive.filter(val=>fnPartition(val.val, modNum));
                    successes.forEach(val=>val.isSuccess = true);

                    break;
                }

            case Renderer.dice.tk.MARGIN_SUCCESS_EXACT.type:
            case Renderer.dice.tk.MARGIN_SUCCESS_GT.type:
            case Renderer.dice.tk.MARGIN_SUCCESS_GTEQ.type:
            case Renderer.dice.tk.MARGIN_SUCCESS_LT.type:
            case Renderer.dice.tk.MARGIN_SUCCESS_LTEQ.type:
                {
                    const total = valsAlive.map(it=>it.val).reduce((valA,valB)=>valA + valB, 0);

                    const subDisplayDice = displayVals.map(r=>`[${Renderer.dice.parsed._rollToNumPart_html(r, opts.faces)}]`).join("+");

                    let delta;
                    let subDisplay;
                    switch (mod.modSym.type) {
                    case Renderer.dice.tk.MARGIN_SUCCESS_EXACT.type:
                    case Renderer.dice.tk.MARGIN_SUCCESS_GT.type:
                    case Renderer.dice.tk.MARGIN_SUCCESS_GTEQ.type:
                        {
                            delta = total - modNum;

                            subDisplay = `(${subDisplayDice})-${modNum}`;

                            break;
                        }
                    case Renderer.dice.tk.MARGIN_SUCCESS_LT.type:
                    case Renderer.dice.tk.MARGIN_SUCCESS_LTEQ.type:
                        {
                            delta = modNum - total;

                            subDisplay = `${modNum}-(${subDisplayDice})`;

                            break;
                        }
                    default:
                        throw new Error(`Unimplemented!`);
                    }

                    while (vals.length) {
                        vals.pop();
                        displayVals.pop();
                    }

                    vals.push({
                        val: delta
                    });
                    displayVals.push({
                        val: delta,
                        htmlDisplay: subDisplay
                    });

                    break;
                }

            default:
                throw new Error(`Unimplemented!`);
            }
        }

        return displayVals;
    },

    _rollToNumPart_html(r, faces) {
        if (faces == null)
            return r.val;
        return r.val === faces ? `<span class="rll__max--muted">${r.val}</span>` : r.val === 1 ? `<span class="rll__min--muted">${r.val}</span>` : r.val;
    },

    Function: class extends Renderer.dice.AbstractSymbol {
        constructor(nodes) {
            super();
            this._nodes = nodes;
        }

        _evl(meta) {
            return this._invoke("evl", meta);
        }
        _avg(meta) {
            return this._invoke("avg", meta);
        }
        _min(meta) {
            return this._invoke("min", meta);
        }
        _max(meta) {
            return this._invoke("max", meta);
        }

        _invoke(fnName, meta) {
            const [symFunc] = this._nodes;
            switch (symFunc.type) {
            case Renderer.dice.tk.FLOOR.type:
            case Renderer.dice.tk.CEIL.type:
            case Renderer.dice.tk.ROUND.type:
            case Renderer.dice.tk.SIGN.type:
            case Renderer.dice.tk.CBRT.type:
            case Renderer.dice.tk.SQRT.type:
            case Renderer.dice.tk.EXP.type:
            case Renderer.dice.tk.LOG.type:
            case Renderer.dice.tk.RANDOM.type:
            case Renderer.dice.tk.TRUNC.type:
            case Renderer.dice.tk.POW.type:
            case Renderer.dice.tk.MAX.type:
            case Renderer.dice.tk.MIN.type:
                {
                    const [,...symExps] = this._nodes;
                    this.addToMeta(meta, {
                        text: `${symFunc.toString()}(`
                    });
                    const args = [];
                    symExps.forEach((symExp,i)=>{
                        if (i !== 0)
                            this.addToMeta(meta, {
                                text: `, `
                            });
                        args.push(symExp[fnName](meta));
                    }
                    );
                    const out = Math[symFunc.toString()](...args);
                    this.addToMeta(meta, {
                        text: ")"
                    });
                    return out;
                }
            case Renderer.dice.tk.AVERAGE.type:
                {
                    const [,symExp] = this._nodes;
                    return symExp.avg(meta);
                }
            case Renderer.dice.tk.DMAX.type:
                {
                    const [,symExp] = this._nodes;
                    return symExp.max(meta);
                }
            case Renderer.dice.tk.DMIN.type:
                {
                    const [,symExp] = this._nodes;
                    return symExp.min(meta);
                }
            default:
                throw new Error(`Unimplemented!`);
            }
        }

        toString() {
            let out;
            const [symFunc,symExp] = this._nodes;
            switch (symFunc.type) {
            case Renderer.dice.tk.FLOOR.type:
            case Renderer.dice.tk.CEIL.type:
            case Renderer.dice.tk.ROUND.type:
            case Renderer.dice.tk.AVERAGE.type:
            case Renderer.dice.tk.DMAX.type:
            case Renderer.dice.tk.DMIN.type:
            case Renderer.dice.tk.SIGN.type:
            case Renderer.dice.tk.ABS.type:
            case Renderer.dice.tk.CBRT.type:
            case Renderer.dice.tk.SQRT.type:
            case Renderer.dice.tk.EXP.type:
            case Renderer.dice.tk.LOG.type:
            case Renderer.dice.tk.RANDOM.type:
            case Renderer.dice.tk.TRUNC.type:
            case Renderer.dice.tk.POW.type:
            case Renderer.dice.tk.MAX.type:
            case Renderer.dice.tk.MIN.type:
                out = symFunc.toString();
                break;
            default:
                throw new Error(`Unimplemented!`);
            }
            out += `(${symExp.toString()})`;
            return out;
        }
    }
    ,

    Pool: class extends Renderer.dice.AbstractSymbol {
        constructor(nodesPool, nodeMod) {
            super();
            this._nodesPool = nodesPool;
            this._nodeMod = nodeMod;
        }

        _evl(meta) {
            return this._invoke("evl", meta);
        }
        _avg(meta) {
            return this._invoke("avg", meta);
        }
        _min(meta) {
            return this._invoke("min", meta);
        }
        _max(meta) {
            return this._invoke("max", meta);
        }

        _invoke(fnName, meta) {
            const vals = this._nodesPool.map(it=>{
                const subMeta = {};
                return {
                    node: it,
                    val: it[fnName](subMeta),
                    meta: subMeta
                };
            }
            );

            if (this._nodeMod && vals.length) {
                const isSuccessMode = this._nodeMod.isSuccessMode;

                const modOpts = {
                    fnGetRerolls: toReroll=>toReroll.map(val=>{
                        const subMeta = {};
                        return {
                            node: val.node,
                            val: val.node[fnName](subMeta),
                            meta: subMeta
                        };
                    }
                    ),
                    fnGetExplosions: toExplode=>toExplode.map(val=>{
                        const subMeta = {};
                        return {
                            node: val.node,
                            val: val.node[fnName](subMeta),
                            meta: subMeta
                        };
                    }
                    ),
                };

                const displayVals = Renderer.dice.parsed._handleModifiers(fnName, meta, vals, this._nodeMod, modOpts);

                const asHtml = displayVals.map(v=>{
                    const html = v.meta.html.join("");
                    if (v.isDropped)
                        return `<span class="rll__dropped">(${html})</span>`;
                    else if (v.isExploded)
                        return `<span class="rll__exploded">(</span>${html}<span class="rll__exploded">)</span>`;
                    else if (v.isSuccess)
                        return `<span class="rll__success">(${html})</span>`;
                    else
                        return `(${html})`;
                }
                ).join("+");

                const asText = displayVals.map(v=>`(${v.meta.text.join("")})`).join("+");
                const asMd = displayVals.map(v=>`(${v.meta.md.join("")})`).join("+");

                this.addToMeta(meta, {
                    html: asHtml,
                    text: asText,
                    md: asMd
                });

                if (isSuccessMode) {
                    return vals.filter(it=>!it.isDropped && it.isSuccess).length;
                } else {
                    return vals.filter(it=>!it.isDropped).map(it=>it.val).sum();
                }
            } else {
                this.addToMeta(meta, ["html", "text", "md"].mergeMap(prop=>({
                    [prop]: `${vals.map(it=>`(${it.meta[prop].join("")})`).join("+")}`,
                })), );
                return vals.map(it=>it.val).sum();
            }
        }

        toString() {
            return `{${this._nodesPool.map(it=>it.toString()).join(", ")}}${this._nodeMod ? this._nodeMod.toString() : ""}`;
        }
    }
    ,

    Factor: class extends Renderer.dice.AbstractSymbol {
        constructor(node, opts) {
            super();
            opts = opts || {};
            this._node = node;
            this._hasParens = !!opts.hasParens;
        }

        _evl(meta) {
            return this._invoke("evl", meta);
        }
        _avg(meta) {
            return this._invoke("avg", meta);
        }
        _min(meta) {
            return this._invoke("min", meta);
        }
        _max(meta) {
            return this._invoke("max", meta);
        }

        _invoke(fnName, meta) {
            switch (this._node.type) {
            case Renderer.dice.tk.TYP_NUMBER:
                {
                    this.addToMeta(meta, {
                        text: this.toString()
                    });
                    return Number(this._node.value);
                }
            case Renderer.dice.tk.TYP_SYMBOL:
                {
                    if (this._hasParens)
                        this.addToMeta(meta, {
                            text: "("
                        });
                    const out = this._node[fnName](meta);
                    if (this._hasParens)
                        this.addToMeta(meta, {
                            text: ")"
                        });
                    return out;
                }
            case Renderer.dice.tk.PB.type:
                {
                    this.addToMeta(meta, {
                        text: this.toString(meta)
                    });
                    return meta.pb == null ? 0 : meta.pb;
                }
            case Renderer.dice.tk.SUMMON_SPELL_LEVEL.type:
                {
                    this.addToMeta(meta, {
                        text: this.toString(meta)
                    });
                    return meta.summonSpellLevel == null ? 0 : meta.summonSpellLevel;
                }
            case Renderer.dice.tk.SUMMON_CLASS_LEVEL.type:
                {
                    this.addToMeta(meta, {
                        text: this.toString(meta)
                    });
                    return meta.summonClassLevel == null ? 0 : meta.summonClassLevel;
                }
            default:
                throw new Error(`Unimplemented!`);
            }
        }

        toString(indent) {
            let out;
            switch (this._node.type) {
            case Renderer.dice.tk.TYP_NUMBER:
                out = this._node.value;
                break;
            case Renderer.dice.tk.TYP_SYMBOL:
                out = this._node.toString();
                break;
            case Renderer.dice.tk.PB.type:
                out = this.meta ? (this.meta.pb || 0) : "PB";
                break;
            case Renderer.dice.tk.SUMMON_SPELL_LEVEL.type:
                out = this.meta ? (this.meta.summonSpellLevel || 0) : "the spell's level";
                break;
            case Renderer.dice.tk.SUMMON_CLASS_LEVEL.type:
                out = this.meta ? (this.meta.summonClassLevel || 0) : "your class level";
                break;
            default:
                throw new Error(`Unimplemented!`);
            }
            return this._hasParens ? `(${out})` : out;
        }
    }
    ,

    Dice: class extends Renderer.dice.AbstractSymbol {
        static _facesToValue(faces, fnName) {
            switch (fnName) {
            case "evl":
                return RollerUtil.randomise(faces);
            case "avg":
                return (faces + 1) / 2;
            case "min":
                return 1;
            case "max":
                return faces;
            }
        }

        constructor(nodes) {
            super();
            this._nodes = nodes;
        }

        _evl(meta) {
            return this._invoke("evl", meta);
        }
        _avg(meta) {
            return this._invoke("avg", meta);
        }
        _min(meta) {
            return this._invoke("min", meta);
        }
        _max(meta) {
            return this._invoke("max", meta);
        }

        _invoke(fnName, meta) {
            if (this._nodes.length === 1)
                return this._nodes[0][fnName](meta);

            const view = this._nodes.slice();
            const numSym = view.shift();
            let tmp = numSym[fnName](Renderer.dice.util.getReducedMeta(meta));

            while (view.length) {
                if (Math.round(tmp) !== tmp)
                    throw new Error(`Number of dice to roll (${tmp}) was not an integer!`);

                const facesSym = view.shift();
                const faces = facesSym[fnName]();
                if (Math.round(faces) !== faces)
                    throw new Error(`Dice face count (${faces}) was not an integer!`);

                const isLast = view.length === 0 || (view.length === 1 && view.last().isDiceModifierGroup);
                tmp = this._invoke_handlePart(fnName, meta, view, tmp, faces, isLast);
            }

            return tmp;
        }

        _invoke_handlePart(fnName, meta, view, num, faces, isLast) {
            const rolls = [...new Array(num)].map(()=>({
                val: Renderer.dice.parsed.Dice._facesToValue(faces, fnName)
            }));
            let displayRolls;
            let isSuccessMode = false;

            if (view.length && view[0].isDiceModifierGroup) {
                const nodeMod = view[0];

                if (fnName === "evl" || fnName === "min" || fnName === "max") {
                    isSuccessMode = nodeMod.isSuccessMode;

                    const modOpts = {
                        faces,
                        fnGetRerolls: toReroll=>[...new Array(toReroll.length)].map(()=>({
                            val: Renderer.dice.parsed.Dice._facesToValue(faces, fnName)
                        })),
                        fnGetExplosions: toExplode=>[...new Array(toExplode.length)].map(()=>({
                            val: Renderer.dice.parsed.Dice._facesToValue(faces, fnName)
                        })),
                    };

                    displayRolls = Renderer.dice.parsed._handleModifiers(fnName, meta, rolls, nodeMod, modOpts);
                }

                view.shift();
            } else
                displayRolls = rolls;

            if (isLast) {
                const asHtml = displayRolls.map(r=>{
                    if (r.htmlDisplay)
                        return r.htmlDisplay;

                    const numPart = Renderer.dice.parsed._rollToNumPart_html(r, faces);

                    if (r.isDropped)
                        return `<span class="rll__dropped">[${numPart}]</span>`;
                    else if (r.isExploded)
                        return `<span class="rll__exploded">[</span>${numPart}<span class="rll__exploded">]</span>`;
                    else if (r.isSuccess)
                        return `<span class="rll__success">[${numPart}]</span>`;
                    else
                        return `[${numPart}]`;
                }
                ).join("+");

                const asText = displayRolls.map(r=>`[${r.val}]`).join("+");

                const asMd = displayRolls.map(r=>{
                    if (r.isDropped)
                        return `~~[${r.val}]~~`;
                    else if (r.isExploded)
                        return `_[${r.val}]_`;
                    else if (r.isSuccess)
                        return `**[${r.val}]**`;
                    else
                        return `[${r.val}]`;
                }
                ).join("+");

                this.addToMeta(meta, {
                    html: asHtml,
                    text: asText,
                    md: asMd,
                }, );
            }

            if (fnName === "evl") {
                const maxRolls = rolls.filter(it=>it.val === faces && !it.isDropped);
                const minRolls = rolls.filter(it=>it.val === 1 && !it.isDropped);
                meta.allMax = meta.allMax || [];
                meta.allMin = meta.allMin || [];
                meta.allMax.push(maxRolls.length && maxRolls.length === rolls.length);
                meta.allMin.push(minRolls.length && minRolls.length === rolls.length);
            }

            if (isSuccessMode) {
                return rolls.filter(it=>!it.isDropped && it.isSuccess).length;
            } else {
                return rolls.filter(it=>!it.isDropped).map(it=>it.val).sum();
            }
        }

        toString() {
            if (this._nodes.length === 1)
                return this._nodes[0].toString();
            const [numSym,facesSym] = this._nodes;
            let out = `${numSym.toString()}d${facesSym.toString()}`;

            for (let i = 2; i < this._nodes.length; ++i) {
                const n = this._nodes[i];
                if (n.isDiceModifierGroup)
                    out += n.mods.map(it=>`${it.modSym.toString()}${it.numSym.toString()}`).join("");
                else
                    out += `d${n.toString()}`;
            }

            return out;
        }
    }
    ,

    Exponent: class extends Renderer.dice.AbstractSymbol {
        constructor(nodes) {
            super();
            this._nodes = nodes;
        }

        _evl(meta) {
            return this._invoke("evl", meta);
        }
        _avg(meta) {
            return this._invoke("avg", meta);
        }
        _min(meta) {
            return this._invoke("min", meta);
        }
        _max(meta) {
            return this._invoke("max", meta);
        }

        _invoke(fnName, meta) {
            const view = this._nodes.slice();
            let val = view.pop()[fnName](meta);
            while (view.length) {
                this.addToMeta(meta, {
                    text: "^"
                });
                val = view.pop()[fnName](meta) ** val;
            }
            return val;
        }

        toString() {
            const view = this._nodes.slice();
            let out = view.pop().toString();
            while (view.length)
                out = `${view.pop().toString()}^${out}`;
            return out;
        }
    }
    ,

    Term: class extends Renderer.dice.AbstractSymbol {
        constructor(nodes) {
            super();
            this._nodes = nodes;
        }

        _evl(meta) {
            return this._invoke("evl", meta);
        }
        _avg(meta) {
            return this._invoke("avg", meta);
        }
        _min(meta) {
            return this._invoke("min", meta);
        }
        _max(meta) {
            return this._invoke("max", meta);
        }

        _invoke(fnName, meta) {
            let out = this._nodes[0][fnName](meta);

            for (let i = 1; i < this._nodes.length; i += 2) {
                if (this._nodes[i].eq(Renderer.dice.tk.MULT)) {
                    this.addToMeta(meta, {
                        text: " × "
                    });
                    out *= this._nodes[i + 1][fnName](meta);
                } else if (this._nodes[i].eq(Renderer.dice.tk.DIV)) {
                    this.addToMeta(meta, {
                        text: " ÷ "
                    });
                    out /= this._nodes[i + 1][fnName](meta);
                } else
                    throw new Error(`Unimplemented!`);
            }

            return out;
        }

        toString() {
            let out = this._nodes[0].toString();
            for (let i = 1; i < this._nodes.length; i += 2) {
                if (this._nodes[i].eq(Renderer.dice.tk.MULT))
                    out += ` * ${this._nodes[i + 1].toString()}`;
                else if (this._nodes[i].eq(Renderer.dice.tk.DIV))
                    out += ` / ${this._nodes[i + 1].toString()}`;
                else
                    throw new Error(`Unimplemented!`);
            }
            return out;
        }
    }
    ,

    Expression: class extends Renderer.dice.AbstractSymbol {
        constructor(nodes) {
            super();
            this._nodes = nodes;
        }

        _evl(meta) {
            return this._invoke("evl", meta);
        }
        _avg(meta) {
            return this._invoke("avg", meta);
        }
        _min(meta) {
            return this._invoke("min", meta);
        }
        _max(meta) {
            return this._invoke("max", meta);
        }

        _invoke(fnName, meta) {
            const view = this._nodes.slice();

            let isNeg = false;
            if (view[0].eq(Renderer.dice.tk.ADD) || view[0].eq(Renderer.dice.tk.SUB)) {
                isNeg = view.shift().eq(Renderer.dice.tk.SUB);
                if (isNeg)
                    this.addToMeta(meta, {
                        text: "-"
                    });
            }

            let out = view[0][fnName](meta);
            if (isNeg)
                out = -out;

            for (let i = 1; i < view.length; i += 2) {
                if (view[i].eq(Renderer.dice.tk.ADD)) {
                    this.addToMeta(meta, {
                        text: " + "
                    });
                    out += view[i + 1][fnName](meta);
                } else if (view[i].eq(Renderer.dice.tk.SUB)) {
                    this.addToMeta(meta, {
                        text: " - "
                    });
                    out -= view[i + 1][fnName](meta);
                } else
                    throw new Error(`Unimplemented!`);
            }

            return out;
        }

        toString(indent=0) {
            let out = "";
            const view = this._nodes.slice();

            let isNeg = false;
            if (view[0].eq(Renderer.dice.tk.ADD) || view[0].eq(Renderer.dice.tk.SUB)) {
                isNeg = view.shift().eq(Renderer.dice.tk.SUB);
                if (isNeg)
                    out += "-";
            }

            out += view[0].toString(indent);
            for (let i = 1; i < view.length; i += 2) {
                if (view[i].eq(Renderer.dice.tk.ADD))
                    out += ` + ${view[i + 1].toString(indent)}`;
                else if (view[i].eq(Renderer.dice.tk.SUB))
                    out += ` - ${view[i + 1].toString(indent)}`;
                else
                    throw new Error(`Unimplemented!`);
            }
            return out;
        }
    }
    ,
};

if (!IS_VTT && typeof window !== "undefined") {
    window.addEventListener("load", Renderer.dice._pInit);
}

Renderer.getRollableRow = function(row, opts) {
    opts = opts || {};

    if (row[0]?.type === "cell" && (row[0]?.roll?.exact != null || (row[0]?.roll?.min != null && row[0]?.roll?.max != null)))
        return row;

    row = MiscUtil.copyFast(row);
    try {
        const cleanRow = String(row[0]).trim();

        const mLowHigh = /^(\d+) or (lower|higher)$/i.exec(cleanRow);
        if (mLowHigh) {
            row[0] = {
                type: "cell",
                entry: cleanRow
            };
            if (mLowHigh[2].toLowerCase() === "lower") {
                row[0].roll = {
                    min: -Renderer.dice.POS_INFINITE,
                    max: Number(mLowHigh[1]),
                };
            } else {
                row[0].roll = {
                    min: Number(mLowHigh[1]),
                    max: Renderer.dice.POS_INFINITE,
                };
            }

            return row;
        }

        const m = /^(\d+)([-\u2012\u2013](\d+))?$/.exec(cleanRow);
        if (m) {
            if (m[1] && !m[2]) {
                row[0] = {
                    type: "cell",
                    roll: {
                        exact: Number(m[1]),
                    },
                };
                if (m[1][0] === "0")
                    row[0].roll.pad = true;
                Renderer.getRollableRow._handleInfiniteOpts(row, opts);
            } else {
                row[0] = {
                    type: "cell",
                    roll: {
                        min: Number(m[1]),
                        max: Number(m[3]),
                    },
                };
                if (m[1][0] === "0" || m[3][0] === "0")
                    row[0].roll.pad = true;
                Renderer.getRollableRow._handleInfiniteOpts(row, opts);
            }
        } else {
            const m = /^(\d+)\+$/.exec(row[0]);
            row[0] = {
                type: "cell",
                roll: {
                    min: Number(m[1]),
                    max: Renderer.dice.POS_INFINITE,
                },
            };
        }
    } catch (e) {
        if (opts.cbErr)
            opts.cbErr(row[0], e);
    }
    return row;
}
;
Renderer.getRollableRow._handleInfiniteOpts = function(row, opts) {
    if (!opts.isForceInfiniteResults)
        return;

    const isExact = row[0].roll.exact != null;

    if (opts.isFirstRow) {
        if (!isExact)
            row[0].roll.displayMin = row[0].roll.min;
        row[0].roll.min = -Renderer.dice.POS_INFINITE;
    }

    if (opts.isLastRow) {
        if (!isExact)
            row[0].roll.displayMax = row[0].roll.max;
        row[0].roll.max = Renderer.dice.POS_INFINITE;
    }
}
;

//#endregion

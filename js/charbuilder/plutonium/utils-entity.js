//#region UtilEntity
class UtilEntityBase {
    static _PropNamespacer = null;

    static getCompendiumDeepKeys() {
        return null;
    }

    static getCompendiumAliases(ent, {isStrict=false}={}) {
        return [];
    }

    static getEntityAliases(ent, {isStrict=false}={}) {
        return [];
    }

    static getNamespacedProp(prop) {
        if (!this._PropNamespacer)
            throw new Error("Unimplemented!");
        return this._PropNamespacer.getNamespacedProp(prop);
    }

    static getUnNamespacedProp(propNamespaced) {
        if (!this._PropNamespacer)
            throw new Error("Unimplemented!");
        return this._PropNamespacer.getUnNamespacedProp(propNamespaced);
    }
}
class UtilEntityClassSubclassFeature extends UtilEntityBase {
    static getBrewProp(feature) {
        const type = this.getEntityType(feature);
        switch (type) {
        case "classFeature":
            return "foundryClassFeature";
        case "subclassFeature":
            return "foundrySubclassFeature";
        default:
            throw new Error(`Unhandled feature type "${type}"`);
        }
    }

    static getEntityType(feature) {
        if (feature.subclassShortName)
            return "subclassFeature";
        if (feature.className)
            return "classFeature";
        return null;
    }

    static getCompendiumAliases(ent, {isStrict=false}={}) {
        return this.getEntityAliases(ent).map(it=>it.name);
    }

    static _FEATURE_SRD_ALIAS_WITH_CLASSNAME = new Set(["unarmored defense", "channel divinity", "expertise", "land's stride", "timeless body", "spellcasting", ]);

    static getEntityAliases(ent, {isStrict=false}={}) {
        if (!ent.name)
            return [];

        const out = [];

        const lowName = ent.name.toLowerCase().trim();

        const noBrackets = ent.name.replace(/\([^)]+\)/g, "").replace(/\s+/g, " ").trim();
        if (noBrackets !== ent.name)
            out.push({
                ...ent,
                name: noBrackets
            });

        const splitColon = ent.name.split(":")[0].trim();
        const isSplitColonName = splitColon !== ent.name;
        if (isSplitColonName) {
            out.push({
                ...ent,
                name: splitColon
            });

            if (this._FEATURE_SRD_ALIAS_WITH_CLASSNAME.has(splitColon.toLowerCase())) {
                out.push({
                    ...ent,
                    name: `${splitColon} (${ent.className})`
                });
            }
        }

        if (this._FEATURE_SRD_ALIAS_WITH_CLASSNAME.has(lowName)) {
            out.push({
                ...ent,
                name: `${ent.name} (${ent.className})`
            });
        }

        if (lowName.startsWith("mystic arcanum")) {
            out.push({
                ...ent,
                name: `${ent.name} (${ent.className})`
            });
        }

        if (!isSplitColonName) {
            out.push({
                ...ent,
                name: `Channel Divinity: ${ent.name}`
            });
            out.push({
                ...ent,
                name: `Ki: ${ent.name}`
            });
        }

        return out;
    }
}

class UtilEntityBackground extends UtilEntityBase {
    static getCompendiumAliases(ent, {isStrict=false}={}) {
        return this.getEntityAliases(ent).map(it=>it.name);
    }

    static getEntityAliases(ent, {isStrict=false}={}) {
        if (!ent.name)
            return [];
        return [];
    }

    static isCustomBackground(ent) {
        return ent?.name === "Custom Background" && ent?.source === Parser.SRC_PHB;
    }
}

class UtilEntityGeneric extends UtilEntityBase {
    static getName(ent) {
        if (ent._fvttCustomizerState) {
            const rename = CustomizerStateBase.fromJson(ent._fvttCustomizerState)?.rename?.rename;
            if (rename)
                return rename;
        }

        return ent._displayName || ent.name || "";
    }

    static _RE_RECHARGE_TAG = /{@recharge(?: (?<rechargeValue>\d+))?}/gi;
    static _RE_RECHARGE_TEXT = /\(Recharge (?<rechargeValue>\d+)(?:[-\u2011-\u2014]\d+)?\)/gi;

    static isRecharge(ent) {
        if (!ent.name)
            return false;

        this._RE_RECHARGE_TAG.lastIndex = 0;
        this._RE_RECHARGE_TEXT.lastIndex = 0;

        return this._RE_RECHARGE_TAG.test(ent.name) || this._RE_RECHARGE_TEXT.test(ent.name);
    }

    static getRechargeMeta(name) {
        if (!name)
            return null;

        let rechargeValue = null;

        name = name.replace(this._RE_RECHARGE_TAG, (...m)=>{
            rechargeValue ??= Number(m.last().rechargeValue || 6);
            return "";
        }
        ).trim().replace(/ +/g, " ").replace(this._RE_RECHARGE_TEXT, (...m)=>{
            rechargeValue ??= Number(m.last().rechargeValue);
            return "";
        }
        ).trim().replace(/ +/g, " ");

        return {
            name,
            rechargeValue,
        };
    }
}
//#endregion


//#region UtilActors
class UtilActors {
    static init() {
        UtilActors.VALID_DAMAGE_TYPES = Object.keys(MiscUtil.get(CONFIG, "DND5E", "damageTypes") || {});
        UtilActors.VALID_CONDITIONS = Object.keys(MiscUtil.get(CONFIG, "DND5E", "conditionTypes") || {});
    }

    static async pGetActorSpellItemOpts({actor, isAllowAutoDetectPreparationMode=false}={}) {
        const opts = {
            isActorItem: true,
            isActorItemNpc: actor?.type === "npc",
            isPrepared: !!Config.get("importSpell", "prepareActorSpells"),
            preparationMode: Config.get("importSpell", "actorSpellPreparationMode"),
        };

        if (!actor || this.isImporterTempActor(actor))
            return opts;

        const spellcastingAbility = MiscUtil.get(actor, "system", "attributes", "spellcasting");
        if (spellcastingAbility)
            opts.ability = spellcastingAbility.value;

        if (actor && isAllowAutoDetectPreparationMode) {
            const autoPreparationMode = await this._pGetActorSpellItemOpts_getAutoPreparationMode({
                actor
            });
            if (autoPreparationMode != null)
                opts.preparationMode = autoPreparationMode;
        }

        return opts;
    }

    static isImporterTempActor(actor) {
        return !!MiscUtil.get(actor, "flags", SharedConsts.MODULE_ID, "isImporterTempActor");
    }

    static async _pGetActorSpellItemOpts_getAutoPreparationMode({actor}) {
        if (!Config.get("importSpell", "isAutoDetectActorSpellPreparationMode"))
            return null;

        const classItems = actor.items.filter(it=>it.type === "class" && it.system?.spellcasting?.progression !== "none");
        if (!classItems.length || classItems.length > 1)
            return null;

        const sheetItem = classItems[0];

        const spellProgression = sheetItem.system.spellcasting.progression;
        switch (spellProgression) {
        case "full":
        case "half":
        case "third":
        case "artificer":
            {
                const classSubclassMeta = await UtilDataConverter.pGetClassItemClassAndSubclass({
                    sheetItem,
                    subclassSheetItems: actor.items.filter(it=>it.type === "subclass")
                });
                if (classSubclassMeta.matchingClasses.length !== 1)
                    return null;
                return (classSubclassMeta.matchingClasses[0].preparedSpells || classSubclassMeta.matchingClasses[0].preparedSpellsProgression) ? "prepared" : "always";
            }
        case "pact":
            return "pact";
        default:
            return null;
        }
    }

    static getSpellItemItemOpts() {
        const opts = {};

        opts.isPrepared = !!Config.get("importSpell", "prepareSpellItems");
        opts.preparationMode = Config.get("importSpell", "spellItemPreparationMode");

        return opts;
    }

    static getMappedTool(str) {
        str = str.toLowerCase().trim();
        if (this.VALID_TOOL_PROFICIENCIES[str])
            return this.VALID_TOOL_PROFICIENCIES[str];
        str = str.split("|")[0];
        return this.VALID_TOOL_PROFICIENCIES[str];
    }

    static getUnmappedTool(str) {
        if (!str)
            return null;
        return Parser._parse_bToA(this.VALID_TOOL_PROFICIENCIES, str, null);
    }

    static getMappedLanguage(str) {
        str = str.toLowerCase().trim();
        return this.VALID_LANGUAGES[str];
    }

    static getMappedCasterType(str) {
        if (!str)
            return str;
        return this._VET_CASTER_TYPE_TO_FVTT[str];
    }

    static getMappedArmorProficiency(str) {
        if (!str)
            return null;
        return Parser._parse_aToB(this.VALID_ARMOR_PROFICIENCIES, str, null);
    }

    static getUnmappedArmorProficiency(str) {
        if (!str)
            return null;
        return Parser._parse_bToA(this.VALID_ARMOR_PROFICIENCIES, str, null);
    }

    static getMappedWeaponProficiency(str) {
        if (!str)
            return null;
        return Parser._parse_aToB(this.VALID_WEAPON_PROFICIENCIES, str, null);
    }

    static getUnmappedWeaponProficiency(str) {
        if (!str)
            return null;
        return Parser._parse_bToA(this.VALID_WEAPON_PROFICIENCIES, str, null);
    }

    static getItemUIdFromWeaponProficiency(str) {
        if (!str)
            return null;
        str = str.trim();
        const tagItemUid = this._getItemUidFromTag(str);
        if (tagItemUid)
            return tagItemUid;
        return Parser._parse_aToB(this._WEAPON_PROFICIENCIES_TO_ITEM_UIDS, str, null);
    }

    static getItemUIdFromToolProficiency(str) {
        if (!str)
            return null;
        str = str.trim();
        const tagItemUid = this._getItemUidFromTag(str);
        if (tagItemUid)
            return tagItemUid;
        return Parser._parse_aToB(this._TOOL_PROFICIENCIES_TO_ITEM_UIDS, str, null);
    }

    static _getItemUidFromTag(str) {
        const mItem = /^{@item ([^}]+)}$/.exec(str);
        if (!mItem)
            return null;
        const {name, source} = DataUtil.generic.unpackUid(mItem[1], "item", {
            isLower: true
        });
        return `${name}|${source}`;
    }

    static getActorBarAttributes(actor) {
        if (!actor)
            return [];

        const attributeSource = actor?.system instanceof foundry.abstract.DataModel ? actor?.type : actor?.system;
        const attributes = MiscUtil.copyFast(TokenDocument.implementation.getTrackedAttributes(attributeSource), );

        return TokenDocument.implementation.getTrackedAttributeChoices(attributes);
    }

    static getTotalClassLevels(actor) {
        return actor.items.filter(it=>it.type === "class").map(it=>it.system.levels || 0).reduce((a,b)=>a + b, 0);
    }

    static isLevelUp(actor) {
        let xpCur = Number(actor?.system?.details?.xp?.value);
        if (isNaN(xpCur))
            xpCur = 0;

        const lvlTarget = actor.items.filter(it=>it.type === "class").map(it=>it.system.levels || 0).sum();
        let xpMax = game.system.config.CHARACTER_EXP_LEVELS[lvlTarget];
        if (isNaN(xpMax))
            xpMax = Number.MAX_SAFE_INTEGER;

        return xpCur >= xpMax;
    }

    static ICON_SPELL_POINTS_ = "icons/magic/light/explosion-star-glow-silhouette.webp";
    static _SPELL_POINTS_SLOT_COUNT = 99;
    static async pGetCreateActorSpellPointsSlotsEffect({actor, isTemporary, isRender}) {
        if (this.hasActorSpellPointSlotEffect({
            actor
        }))
            return;

        await UtilDocuments.pCreateEmbeddedDocuments(actor, this.getActorSpellPointsSlotsEffectData({
            actor
        }), {
            ClsEmbed: ActiveEffect,
            isTemporary,
            isRender
        }, );

        await UtilDocuments.pUpdateDocument(actor, this.getActorSpellPointsSlotsUpdateSys());
    }

    static hasActorSpellPointSlotEffect({actor}) {
        return (actor?.effects || []).some(it=>it.flags[SharedConsts.MODULE_ID]?.["isSpellPointsSlotUnlocker"]);
    }

    static getActorSpellPointsSlotsEffectData({actor=null, sheetItem=null}={}) {
        return UtilActiveEffects.getExpandedEffects([{
            name: `Spell Points Spell Slot Unlock`,
            changes: [...new Array(9)].map((_,i)=>({
                "key": `system.spells.spell${i + 1}.override`,
                "mode": "OVERRIDE",
                "value": this._SPELL_POINTS_SLOT_COUNT,
            })),
            flags: {
                [SharedConsts.MODULE_ID]: {
                    isSpellPointsSlotUnlocker: true,
                    dedupeId: "spellPointsSlotUnlocker",
                },
            },
        }, ], {
            img: this.ICON_SPELL_POINTS_,
            actor,
            sheetItem,
        }, );
    }

    static getActorSpellPointsSlotsUpdateSys() {
        return {
            system: {
                spells: [...new Array(9)].mergeMap((_,i)=>({
                    [`spell${i + 1}`]: {
                        value: 99,
                    },
                })),
            },
        };
    }

    static getActorSpellPointsItem({actor}) {
        return SpellPointsItemBuilder.getItem({
            actor
        });
    }

    static async pGetCreateActorSpellPointsItem({actor, totalSpellcastingLevels=null}) {
        return SpellPointsItemBuilder.pGetCreateItem({
            actor,
            totalLevels: totalSpellcastingLevels
        });
    }

    static getActorPsiPointsItem({actor}) {
        return PsiPointsItemBuilder.getItem({
            actor
        });
    }

    static async pGetCreateActorPsiPointsItem({actor, totalMysticLevels=null}) {
        return PsiPointsItemBuilder.pGetCreateItem({
            actor,
            totalLevels: totalMysticLevels
        });
    }

    static getActorSpellcastingInfo({actor, sheetItems, isForceSpellcastingMulticlass=false, }={}, ) {
        if (actor && sheetItems)
            throw new Error(`Only one of "actor" or "sheetItems" may be specified!`);

        const spellcastingClassItems = (actor?.items || sheetItems).filter(it=>it.type === "class").filter(it=>it.system?.spellcasting);

        if (!spellcastingClassItems.length) {
            return {
                totalSpellcastingLevels: 0,
                casterClassCount: 0,
                maxPactCasterLevel: 0,
                isSpellcastingMulticlass: isForceSpellcastingMulticlass,
            };
        }

        let totalSpellcastingLevels = 0;
        let maxPactCasterLevel = 0;

        const isSpellcastingMulticlass = isForceSpellcastingMulticlass || spellcastingClassItems.length > 1;

        const getSpellcastingLevel = (lvl,type)=>{
            switch (type) {
            case "half":
                return Math.ceil(lvl / 2);
            case "third":
                return Math.ceil(lvl / 3);
            case "artificer":
                return lvl === 1 ? 1 : getSpellcastingLevel(lvl, "half");
            default:
                throw new Error(`Unhandled spellcaster type "${type}"`);
            }
        }
        ;

        const getSpellcastingLevelMulticlass = (lvl,type)=>{
            switch (type) {
            case "half":
                return Math.floor(lvl / 2);
            case "third":
                return Math.floor(lvl / 3);
            case "artificer":
                return Math.ceil(lvl / 2);
            default:
                throw new Error(`Unhandled spellcaster type "${type}"`);
            }
        }
        ;

        const fnGetSpellcastingLevelHalfThird = isSpellcastingMulticlass ? getSpellcastingLevelMulticlass : getSpellcastingLevel;

        spellcastingClassItems.forEach(it=>{
            const lvl = it.system.levels || 0;

            switch (it.system.spellcasting.progression) {
            case "full":
                totalSpellcastingLevels += lvl;
                break;
            case "half":
                totalSpellcastingLevels += fnGetSpellcastingLevelHalfThird(lvl, it.system.spellcasting.progression);
                break;
            case "third":
                totalSpellcastingLevels += fnGetSpellcastingLevelHalfThird(lvl, it.system.spellcasting.progression);
                break;
            case "pact":
                Math.max(maxPactCasterLevel, lvl);
                break;
            case "artificer":
                totalSpellcastingLevels += fnGetSpellcastingLevelHalfThird(lvl, it.system.spellcasting.progression);
                break;
            }
        }
        );

        return {
            totalSpellcastingLevels,
            casterClassCount: spellcastingClassItems.length,
            maxPactCasterLevel,
            isSpellcastingMulticlass
        };
    }

    static async pLinkTempUuids({actor}) {
        const SENTINEL = `__${SharedConsts.MODULE_ID_FAKE}_REPLACE_TARGET__`;

        const reUuid = new RegExp(`(?<prefix>@UUID\\[[^\\]]+\\.)temp-${SharedConsts.MODULE_ID_FAKE}-(?<packed>[^.\\]]+)(?<suffix>](?:\\{[^}]+})?)`,"g");
        const reSentinelLi = new RegExp(`<li[^>]*>\\s*${SENTINEL}\\s*<\\/li>`,"g");
        const reSentinelP = new RegExp(`<p[^>]*>\\s*${SENTINEL}\\s*<\\/p>`,"g");
        const reSentinel = new RegExp(SENTINEL,"g");

        const updates = actor.items.map(item=>{
            const desc = item.system.description.value || "";
            const nxtDesc = desc.replace(reUuid, (...m)=>{
                const packed = m.last().packed;
                try {
                    const {page, source, hash} = JSON.parse(decodeURIComponent(atob(packed)));
                    if (!page || !source || !hash)
                        return SENTINEL;

                    const matchedItem = actor.items.find(it=>it.flags?.[SharedConsts.MODULE_ID]?.page === page && it.flags?.[SharedConsts.MODULE_ID]?.source === source && it.flags?.[SharedConsts.MODULE_ID]?.hash === hash);

                    if (!matchedItem)
                        return SENTINEL;

                    return `${m.last().prefix}${matchedItem.id}${m.last().suffix}`;
                } catch (e) {
                    console.error(...LGT, `Failed to unpack temp page/source/hash`, e);
                    return "";
                }
            }
            ).replace(reSentinelLi, "").replace(reSentinelP, "").replace(reSentinel, "");

            if (desc === nxtDesc)
                return null;

            return {
                _id: item.id,
                system: {
                    description: {
                        value: nxtDesc,
                    },
                },
            };
        }
        ).filter(Boolean);

        if (!updates.length)
            return;

        await UtilDocuments.pUpdateEmbeddedDocuments(actor, updates, {
            ClsEmbed: Item
        });
    }

    static isSetMaxHp({actor}) {
        if (!UtilVersions.getSystemVersion().isVersionTwoOnePlus)
            return true;
        return actor._source.system.attributes.hp.max != null;
    }

    static getProficiencyBonusNumber({actor}) {
        const prof = actor.getRollData().prof;
        if (typeof prof === "number")
            return prof;
        return prof.flat;
    }
}
UtilActors.SKILL_ABV_TO_FULL = {
    acr: "acrobatics",
    ani: "animal handling",
    arc: "arcana",
    ath: "athletics",
    dec: "deception",
    his: "history",
    ins: "insight",
    itm: "intimidation",
    inv: "investigation",
    med: "medicine",
    nat: "nature",
    prc: "perception",
    prf: "performance",
    per: "persuasion",
    rel: "religion",
    slt: "sleight of hand",
    ste: "stealth",
    sur: "survival",
};
UtilActors.TOOL_ABV_TO_FULL = {
    art: "artisan's tools",
    alchemist: "alchemist's supplies",
    brewer: "brewer's supplies",
    calligrapher: "calligrapher's supplies",
    carpenter: "carpenter's tools",
    cartographer: "cartographer's tools",
    cobbler: "cobbler's tools",
    cook: "cook's utensils",
    glassblower: "glassblower's tools",
    jeweler: "jeweler's tools",
    leatherworker: "leatherworker's tools",
    mason: "mason's tools",
    painter: "painter's supplies",
    potter: "potter's tools",
    smith: "smith's tools",
    tinker: "tinker's tools",
    weaver: "weaver's tools",
    woodcarver: "woodcarver's tools",

    disg: "disguise kit",
    forg: "forgery kit",

    game: "gaming set",
    chess: "dragonchess set",
    dice: "dice set",
    card: "three-dragon ante set",

    herb: "herbalism kit",

    music: "musical instrument",
    bagpipes: "bagpipes",
    drum: "drum",
    dulcimer: "dulcimer",
    flute: "flute",
    horn: "horn",
    lute: "lute",
    lyre: "lyre",
    panflute: "pan flute",
    shawm: "shawm",
    viol: "viol",

    navg: "navigator's tools",

    pois: "poisoner's kit",

    thief: "thieves' tools",

    vehicle: "vehicles",
    air: "vehicles (air)",
    land: "vehicles (land)",
    space: "vehicles (space)",
    water: "vehicles (water)",
};
UtilActors.PROF_TO_ICON_CLASS = {
    "1": "fa-check",
    "2": "fa-check-double",
    "0.5": "fa-adjust",
};
UtilActors.PROF_TO_TEXT = {
    "1": "Proficient",
    "2": "Proficient with Expertise",
    "0.5": "Half-Proficient",
    "0": "",
};
UtilActors.VET_SIZE_TO_ABV = {
    [Parser.SZ_TINY]: "tiny",
    [Parser.SZ_SMALL]: "sm",
    [Parser.SZ_MEDIUM]: "med",
    [Parser.SZ_LARGE]: "lg",
    [Parser.SZ_HUGE]: "huge",
    [Parser.SZ_GARGANTUAN]: "grg",
};
UtilActors.VET_SPELL_SCHOOL_TO_ABV = {
    A: "abj",
    C: "con",
    D: "div",
    E: "enc",
    V: "evo",
    I: "ill",
    N: "nec",
    T: "trs",
};

UtilActors.PACT_CASTER_MAX_SPELL_LEVEL = 5;

UtilActors.VALID_DAMAGE_TYPES = null;
UtilActors.VALID_CONDITIONS = null;

UtilActors.TOOL_PROFICIENCIES_TO_UID = {
    "alchemist's supplies": "alchemist's supplies|phb",
    "brewer's supplies": "brewer's supplies|phb",
    "calligrapher's supplies": "calligrapher's supplies|phb",
    "carpenter's tools": "carpenter's tools|phb",
    "cartographer's tools": "cartographer's tools|phb",
    "cobbler's tools": "cobbler's tools|phb",
    "cook's utensils": "cook's utensils|phb",
    "glassblower's tools": "glassblower's tools|phb",
    "jeweler's tools": "jeweler's tools|phb",
    "leatherworker's tools": "leatherworker's tools|phb",
    "mason's tools": "mason's tools|phb",
    "painter's supplies": "painter's supplies|phb",
    "potter's tools": "potter's tools|phb",
    "smith's tools": "smith's tools|phb",
    "tinker's tools": "tinker's tools|phb",
    "weaver's tools": "weaver's tools|phb",
    "woodcarver's tools": "woodcarver's tools|phb",
    "disguise kit": "disguise kit|phb",
    "forgery kit": "forgery kit|phb",
    "gaming set": "gaming set|phb",
    "herbalism kit": "herbalism kit|phb",
    "musical instrument": "musical instrument|phb",
    "navigator's tools": "navigator's tools|phb",
    "thieves' tools": "thieves' tools|phb",
    "poisoner's kit": "poisoner's kit|phb",
};
UtilActors.VALID_TOOL_PROFICIENCIES = {
    "artisan's tools": "art",
    "alchemist's supplies": "alchemist",
    "brewer's supplies": "brewer",
    "calligrapher's supplies": "calligrapher",
    "carpenter's tools": "carpenter",
    "cartographer's tools": "cartographer",
    "cobbler's tools": "cobbler",
    "cook's utensils": "cook",
    "glassblower's tools": "glassblower",
    "jeweler's tools": "jeweler",
    "leatherworker's tools": "leatherworker",
    "mason's tools": "mason",
    "painter's supplies": "painter",
    "potter's tools": "potter",
    "smith's tools": "smith",
    "tinker's tools": "tinker",
    "weaver's tools": "weaver",
    "woodcarver's tools": "woodcarver",

    "disguise kit": "disg",

    "forgery kit": "forg",

    "gaming set": "game",
    "dice set": "dice",
    "dragonchess set": "chess",
    "playing card set": "card",
    "three-dragon ante set": "card",

    "herbalism kit": "herb",

    "musical instrument": "music",
    "bagpipes": "bagpipes",
    "drum": "drum",
    "dulcimer": "dulcimer",
    "flute": "flute",
    "lute": "lute",
    "lyre": "lyre",
    "horn": "horn",
    "pan flute": "panflute",
    "shawm": "shawm",
    "viol": "viol",

    "navigator's tools": "navg",

    "poisoner's kit": "pois",

    "thieves' tools": "thief",

    "vehicle (land or water)": "vehicle",
    "vehicle (air)": "air",
    "vehicle (land)": "land",
    "vehicle (water)": "water",
    "vehicle (space)": "space",
};
UtilActors.VALID_LANGUAGES = {
    "common": "common",
    "aarakocra": "aarakocra",
    "abyssal": "abyssal",
    "aquan": "aquan",
    "auran": "auran",
    "celestial": "celestial",
    "deep speech": "deep",
    "draconic": "draconic",
    "druidic": "druidic",
    "dwarvish": "dwarvish",
    "elvish": "elvish",
    "giant": "giant",
    "gith": "gith",
    "gnomish": "gnomish",
    "goblin": "goblin",
    "gnoll": "gnoll",
    "halfling": "halfling",
    "ignan": "ignan",
    "infernal": "infernal",
    "orc": "orc",
    "primordial": "primordial",
    "sylvan": "sylvan",
    "terran": "terran",
    "thieves' cant": "cant",
    "undercommon": "undercommon",
};
UtilActors.LANGUAGES_PRIMORDIAL = ["aquan", "auran", "ignan", "terran", ];
UtilActors._VET_CASTER_TYPE_TO_FVTT = {
    "full": "full",
    "1/2": "half",
    "1/3": "third",
    "pact": "pact",
    "artificer": "artificer",
};
UtilActors.ARMOR_PROFICIENCIES = ["light", "medium", "heavy", "shield|phb", ];
UtilActors.VALID_ARMOR_PROFICIENCIES = {
    "light": "lgt",
    "medium": "med",
    "heavy": "hvy",
    "shield|phb": "shl",
};
UtilActors.WEAPON_PROFICIENCIES = ["battleaxe|phb", "club|phb", "dagger|phb", "flail|phb", "glaive|phb", "greataxe|phb", "greatclub|phb", "greatsword|phb", "halberd|phb", "handaxe|phb", "javelin|phb", "lance|phb", "light hammer|phb", "longsword|phb", "mace|phb", "maul|phb", "morningstar|phb", "pike|phb", "quarterstaff|phb", "rapier|phb", "scimitar|phb", "shortsword|phb", "sickle|phb", "spear|phb", "staff|phb", "trident|phb", "war pick|phb", "warhammer|phb", "whip|phb", "blowgun|phb", "dart|phb", "hand crossbow|phb", "heavy crossbow|phb", "light crossbow|phb", "longbow|phb", "net|phb", "shortbow|phb", "sling|phb", ];
UtilActors.VALID_WEAPON_PROFICIENCIES = {
    "simple": "sim",
    "martial": "mar",

    "club|phb": "club",
    "dagger|phb": "dagger",
    "dart|phb": "dart",
    "greatclub|phb": "greatclub",
    "handaxe|phb": "handaxe",
    "javelin|phb": "javelin",
    "light crossbow|phb": "lightcrossbow",
    "light hammer|phb": "lighthammer",
    "mace|phb": "mace",
    "quarterstaff|phb": "quarterstaff",
    "shortbow|phb": "shortbow",
    "sickle|phb": "sickle",
    "sling|phb": "sling",
    "spear|phb": "spear",

    "battleaxe|phb": "battleaxe",
    "blowgun|phb": "blowgun",
    "flail|phb": "flail",
    "glaive|phb": "glaive",
    "greataxe|phb": "greataxe",
    "greatsword|phb": "greatsword",
    "halberd|phb": "halberd",
    "hand crossbow|phb": "handcrossbow",
    "heavy crossbow|phb": "heavycrossbow",
    "lance|phb": "lance",
    "longbow|phb": "longbow",
    "longsword|phb": "longsword",
    "maul|phb": "maul",
    "morningstar|phb": "morningstar",
    "net|phb": "net",
    "pike|phb": "pike",
    "rapier|phb": "rapier",
    "scimitar|phb": "scimitar",
    "shortsword|phb": "shortsword",
    "trident|phb": "trident",
    "war pick|phb": "warpick",
    "warhammer|phb": "warhammer",
    "whip|phb": "whip",
};
UtilActors._WEAPON_PROFICIENCIES_TO_ITEM_UIDS = {
    "battleaxes": "battleaxe|phb",
    "clubs": "club|phb",
    "daggers": "dagger|phb",
    "flails": "flail|phb",
    "glaives": "glaive|phb",
    "greataxes": "greataxe|phb",
    "greatclubs": "greatclub|phb",
    "greatswords": "greatsword|phb",
    "halberds": "halberd|phb",
    "handaxes": "handaxe|phb",
    "javelins": "javelin|phb",
    "lances": "lance|phb",
    "light hammers": "light hammer|phb",
    "longswords": "longsword|phb",
    "maces": "mace|phb",
    "mauls": "maul|phb",
    "morningstars": "morningstar|phb",
    "pikes": "pike|phb",
    "quarterstaffs": "quarterstaff|phb",
    "rapiers": "rapier|phb",
    "scimitars": "scimitar|phb",
    "shortswords": "shortsword|phb",
    "sickles": "sickle|phb",
    "spears": "spear|phb",
    "staffs": "staff|phb",
    "tridents": "trident|phb",
    "war picks": "war pick|phb",
    "warhammers": "warhammer|phb",
    "whips": "whip|phb",

    "blowguns": "blowgun|phb",
    "darts": "dart|phb",
    "hand crossbows": "hand crossbow|phb",
    "heavy crossbows": "heavy crossbow|phb",
    "light crossbows": "light crossbow|phb",
    "longbows": "longbow|phb",
    "nets": "net|phb",
    "shortbows": "shortbow|phb",
    "slings": "sling|phb",

    "battleaxe": "battleaxe|phb",
    "club": "club|phb",
    "dagger": "dagger|phb",
    "flail": "flail|phb",
    "glaive": "glaive|phb",
    "greataxe": "greataxe|phb",
    "greatclub": "greatclub|phb",
    "greatsword": "greatsword|phb",
    "halberd": "halberd|phb",
    "handaxe": "handaxe|phb",
    "javelin": "javelin|phb",
    "lance": "lance|phb",
    "light hammer": "light hammer|phb",
    "longsword": "longsword|phb",
    "mace": "mace|phb",
    "maul": "maul|phb",
    "morningstar": "morningstar|phb",
    "pike": "pike|phb",
    "quarterstaff": "quarterstaff|phb",
    "rapier": "rapier|phb",
    "scimitar": "scimitar|phb",
    "shortsword": "shortsword|phb",
    "sickle": "sickle|phb",
    "spear": "spear|phb",
    "staff": "staff|phb",
    "trident": "trident|phb",
    "war pick": "war pick|phb",
    "warhammer": "warhammer|phb",
    "whip": "whip|phb",

    "blowgun": "blowgun|phb",
    "dart": "dart|phb",
    "hand crossbow": "hand crossbow|phb",
    "heavy crossbow": "heavy crossbow|phb",
    "light crossbow": "light crossbow|phb",
    "longbow": "longbow|phb",
    "net": "net|phb",
    "shortbow": "shortbow|phb",
    "sling": "sling|phb",
};
UtilActors._TOOL_PROFICIENCIES_TO_ITEM_UIDS = {
    "alchemist's supplies": "alchemist's supplies|phb",
    "artisan's tools": "artisan's tools|phb",
    "bagpipes": "bagpipes|phb",
    "brewer's supplies": "brewer's supplies|phb",
    "calligrapher's supplies": "calligrapher's supplies|phb",
    "carpenter's tools": "carpenter's tools|phb",
    "cartographer's tools": "cartographer's tools|phb",
    "cobbler's tools": "cobbler's tools|phb",
    "cook's utensils": "cook's utensils|phb",
    "disguise kit": "disguise kit|phb",
    "drum": "drum|phb",
    "dulcimer": "dulcimer|phb",
    "flute": "flute|phb",
    "forgery kit": "forgery kit|phb",
    "glassblower's tools": "glassblower's tools|phb",
    "herbalism kit": "herbalism kit|phb",
    "horn": "horn|phb",
    "jeweler's tools": "jeweler's tools|phb",
    "leatherworker's tools": "leatherworker's tools|phb",
    "lute": "lute|phb",
    "lyre": "lyre|phb",
    "mason's tools": "mason's tools|phb",
    "musical instrument": "musical instrument|phb",
    "navigator's tools": "navigator's tools|phb",
    "painter's supplies": "painter's supplies|phb",
    "pan flute": "pan flute|phb",
    "poisoner's kit": "poisoner's kit|phb",
    "potter's tools": "potter's tools|phb",
    "shawm": "shawm|phb",
    "smith's tools": "smith's tools|phb",
    "thieves' tools": "thieves' tools|phb",
    "tinker's tools": "tinker's tools|phb",
    "viol": "viol|phb",
    "weaver's tools": "weaver's tools|phb",
    "woodcarver's tools": "woodcarver's tools|phb",
};

UtilActors.BG_SKILL_PROFS_CUSTOMIZE = [{
    choose: {
        from: Object.keys(Parser.SKILL_TO_ATB_ABV),
        count: 2,
    },
}, ];

UtilActors.LANG_TOOL_PROFS_CUSTOMIZE = [{
    anyStandardLanguage: 2,
}, {
    anyStandardLanguage: 1,
    anyTool: 1,
}, {
    anyTool: 2,
}, ];
//#endregion

class UtilItems {
	static PROFICIENCY_LEVELS = {
		AUTO: null,
		NONE: 0,
		PROFICIENT: 1,
		EXPERTISE: 2,
		JACK_OF_ALL_TRADES: 0.5,
	};
}
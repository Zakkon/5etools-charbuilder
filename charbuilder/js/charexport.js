class CharacterExportFvtt{

    /* CONCEPT =====================

    */

    /**
     * @param {CharacterBuilder} builder
     */
    static async exportCharacter(builder){
        //lets not be verbose here

        //Ids of brew sources that are fully loaded into memory
        const brewSourceIds = CharacterExportFvtt.getBrewSourceIds();

        const _meta = {};
        const _char = {race:null, classes:null};

        //probably needs to be cleaned of duplicates later
        let metaDataStack = [];

        //#region CLASS
        const classData = await CharacterExportFvtt.getClassData(builder.compClass);
        let classArray = null;
        for(let i = 0; i < classData.length; ++i){
            const data = classData[i];
            if(!data.cls){continue;}
            const hash = UrlUtil.URL_TO_HASH_BUILDER.class(data.cls);
            if(!classArray){classArray = [];}

            //Create a block with some more easily accessible properties (thank me later when you are loading this)
            const block = {
                name: data.cls.name,
                source: data.cls.source,
                hash: hash,
                srd: data.cls.srd,
                level: data.targetLevel,
                isPrimary: data.isPrimary
            };
            //Add some data to block that may or may not always be in our given data (depends on class)
            //TODO: Language, etc here?
            if(data.skillProficiencies){block.skillProficiencies = data.skillProficiencies;}
            if(data.toolProficiencies){block.toolProficiencies = data.toolProficiencies;}
            if(data.featureOptSel){block.featureOptSel = data.featureOptSel;}

            //Create some meta information (so we can track where this class came from)
            metaDataStack.push({uid: data.cls.name+"|"+data.cls.source,
                name: data.cls.name,
                source: data.cls.source,
                type: "class",
                _data: CharacterExportFvtt.getSourceMetaData(data.cls, brewSourceIds)});

            //Check if high enough level for subclass here?
            if(data.sc){
                const schash = UrlUtil.URL_TO_HASH_BUILDER.subclass(data.sc);
                //Add the subclass to block, if present
                block.subclass = {
                    name: data.sc.name,
                    source: data.sc.source, //maybe we should include some info here (and in class, race, etc) if this is brewed content
                    hash: schash
                }
                //Create some meta information (so we can track where this subclass came from)
                //Subclasses generally dont have the 'srd' property, by the way
                metaDataStack.push({uid: data.sc.name+"|"+data.sc.source,
                    name:data.sc.name,
                    source:data.sc.source,
                    type:"subclass",
                    _data:CharacterExportFvtt.getSourceMetaData(data.sc, brewSourceIds)});
            }
            classArray.push(block);
        }
        _char.classes = classArray;
        //#endregion

        //#region RACE
        const raceData = this.getRaceData(builder.compRace);
        if(!!raceData){
            let race = raceData.meta.race;
            const hash = UrlUtil.URL_TO_HASH_BUILDER.race(race);
            //Set the .race entry in the _char output
            _char.race = {stateInfo: raceData.stateInfo, race: {name:race.name, source:race.source, hash: hash, srd:race.srd,
                isSubRace: race._isSubRace, raceName:race.raceName, raceSource:race.raceSource, isBaseSrd:race._baseSrd,
                versionBaseName:race._versionBase_name, versionBaseSource:race._versionBase_source }};
            //Remember some metadata about what source this race is from
            metaDataStack.push({uid: race.name+"|"+race.source,
            name:race.name,
            source:race.source,
            type:"race",
            _data: CharacterExportFvtt.getSourceMetaData(race, brewSourceIds)});
        }
        //#endregion

        //#region BACKGROUND
        const background = await CharacterExportFvtt.getBackground(builder.compBackground);
        if(!!background){
            //Add background to character output
            _char.background = background;
            //Create some meta information (so we know where the background came from)
            metaDataStack.push({uid: CharacterExportFvtt.entityToUID(background),
            name:background.name,
            source:background.source,
            type:"background",
            _data:CharacterExportFvtt.getSourceMetaData(background, brewSourceIds)});
        }
        //#endregion

        //#region ABILITY SCORES (our choices, maybe not the total)
        const abilities = await CharacterExportFvtt.getAbilityScoreData(builder.compAbility);
        //Add abilities to character output
        _char.abilities = abilities;
        //Don't think any meta information is needed here
        //#endregion

        //#region EQUIPMENT (including gold, and bought items)
        const equipment = await CharacterExportFvtt.getEquipmentData(builder.compEquipment);
        //Add equipment to character output
        _char.equipment = equipment;
        for(let it of equipment.boughtItems){
            let uid = it.uid; //plate_armor|phb
            //TODO: get the full source of the item (assuming its not a PHB item or something)
        }
        //#endregion

        //#region SPELLS
        const deletedClasses = CharacterExportFvtt.getDeletedClassIds(builder.compClass);
        const spellSources = await CharacterExportFvtt.getAllSpellSources(builder.compSpell, deletedClasses);
        //Loop through each source for spells
        for(let srcIx = 0; srcIx < spellSources.length; ++srcIx){
            let spellSource = spellSources[srcIx];
            //Loop through each spell level in the source
            for(let lvlix = 0; lvlix < spellSource.spellsByLvl.length; ++lvlix){
                let lvl = spellSource.spellsByLvl[lvlix];
                //Loop through each spell in the spell level
                for(let spix = 0; spix < lvl.length; ++spix){
                    let sp = lvl[spix];
                    //Create some meta information (so we know where the spell came from)
                    metaDataStack.push({uid: sp.name+"|"+sp.source,
                        _data:CharacterExportFvtt.getSourceMetaData(sp.spell, brewSourceIds)});
                    //delete .spell info
                    delete sp.spell;
                    lvl[spix] = sp;
                }
                spellSource.spellsByLvl[lvlix] = lvl;
            }
            spellSources[srcIx] = spellSource;
        }
        _char.spellsBySource = spellSources;
        //#endregion

        //#region FEATS
        //const feats =
        await CharacterExportFvtt.getFeats(builder.compFeat);
        //Check featureOptionSelects available from race
        CharacterExportFvtt.getChosenSpellsFromFeats(builder.compFeat);
        
        //#endregion


        //optional feature stuff?

        //Character description
        _char.about = {
            name: builder.compDescription.__state["description_name"],
            alignment: builder.compDescription.__state["description_alignment"],
            height: builder.compDescription.__state["description_height"],
            weight: builder.compDescription.__state["description_weight"],
            hair: builder.compDescription.__state["description_hair"],
            skin: builder.compDescription.__state["description_skin"],
            eyes: builder.compDescription.__state["description_eyes"],
            faith: builder.compDescription.__state["description_faith"],
            text: builder.compDescription.__state["description_text"],
        };

        //Build meta

        //Optionally, instead of tracking each and every item, race, subclass, etc that we incorporated on our character,
        //we can just check which sources were enabled at the time of the exporting of the character
        //This does of course include bloat, but it's more accurate than what we have going right now
        _meta.sourceIds = SourceManager.cachedSourceIds.map(id => SourceManager.minifySourceId(id));
        _meta.uploadedFileMetas = SourceManager.cachedUploadedFileMetas;
        console.log("CUSTOM URLS", SourceManager.cachedCustomUrls);
        _meta.customUrls = SourceManager.cachedCustomUrls;

        //Filter settings
        let filters = {};
        filters.class = builder.compClass.modalFilterClasses._pageFilter._filterBox.getValues();
        filters.race = builder.compRace.modalFilterRaces._pageFilter._filterBox.getValues();
        filters.background = builder.compBackground.modalFilterBackgrounds._pageFilter._filterBox.getValues();
        filters.shop = builder.compEquipment._compEquipmentShopGold._modalFilter._pageFilter._filterBox.getValues();
        filters.spell = builder.compSpell.modalFilterSpells._pageFilter._filterBox.getValues();
        filters.feat = builder.compFeat.modalFilterFeats._pageFilter._filterBox.getValues();
        _meta.filters = filters;


        const output = {character: _char, _meta:_meta};

        console.log("Export Character", output);
        let importStr = this.test_printExportJsonAsString(output);

        localStorage.setItem("lastCharacter", importStr);

        const currentUid = CharacterBuilder.currentUid;
        CookieManager.saveCharacterInfo(output, currentUid);
        
    }
    /**
     * @param {CharacterBuilder} builder
     */
    static async exportCharacterFvtt(builder){

        const deletePropIfNull = (obj, prop) => {
            if(obj[prop] == null){delete obj[prop];}
        }
        const grabFormsFromComponents = async (components, toObj, toObjProp) => {
            let forms = [];
            if(components == null){toObj[toObjProp] = forms; return;}
            if(!(components.constructor === Array)){components = [components];}
            for(let comp of components){
                if(!comp){continue;}
                const form = await comp.pGetFormData();
                forms.push(form);
            }
            toObj[toObjProp] = forms;
        }
        let output = {};

        //#region ABILITY SCORES
        let outAbi = {};
        const totals = builder.compAbility.getTotals();
        outAbi.totals = totals;
        output.abilities = outAbi;
        //#endregion
        //#region CLASSES
        let classes = [];
        const primaryClassIndex = builder.compClass._state['class_ixPrimaryClass'] || 0;
        for (let ix = 0; ix < builder.compClass.state['class_ixMax'] + 1; ++ix) {
            let out = {};
            const { propIxClass: propIxClass, propIxSubclass: propIxSubclass, propCurLevel:propCurLevel, propTargetLevel: propTargetLevel } = ActorCharactermancerBaseComponent.class_getProps(ix);
            const cls = builder.compClass.getClass_({ propIxClass: propIxClass });
            if (!cls) { continue; }
            //out.classUid = cls.name + "|" + cls.source;
            //We will send the entire class entity, instead of a UID
            out.classEntity = cls;
            out.targetLevel = builder.compClass.state[propTargetLevel];
            out.isPrimary = ix == primaryClassIndex;
            const sc = builder.compClass.getSubclass_({ cls: cls, propIxSubclass: propIxSubclass });
            if(sc){
                //out.subclassUid = sc.name + "|" + sc.source;
                //We will send the entire subclass entity, instead of a UID
                out.subclassEntity = sc;
            }
            //HITPOINTS
            const {mode, customFormula} = (await builder.compClass.compsClassHpIncreaseMode[ix].pGetFormData()).data;
            out.hpMode = mode;
            out.hpCustomFormula = customFormula;
            //FEATURE OPTIONS SELECT
            let featureOptionsSelectForms = [];
            for(let fosComp of builder.compClass.compsClassFeatureOptionsSelect[ix]){
                if(!fosComp){continue;}
                const form = await fosComp.pGetFormData();
                featureOptionsSelectForms.push(form);
            }
            out.featureOptSel = featureOptionsSelectForms;
            //CLASS SKILL PROFICIENCIES
            let skillProfForms = [];
            for(let comp of builder.compClass.compsClassSkillProficiencies){
                if(!comp){continue;}
                const form = await comp.pGetFormData();
                skillProfForms.push(form);
            }
            out.skillProfs = skillProfForms;
            //CLASS TOOL PROFICIENCIES
            let toolProfForms = [];
            for(let comp of builder.compClass.compsClassToolProficiencies){
                if(!comp){continue;}
                const form = await comp.pGetFormData();
                toolProfForms.push(form);
            }
            out.toolProfs = toolProfForms;
            //SPELL SLOT LEVEL SELECT
            const slotLevelSelectComp = builder.compSpell.compsSpellSpellSlotLevelSelect[ix];
            out.spellSlotLevelSelection = slotLevelSelectComp?.isAnyChoice()? slotLevelSelectComp.getFlagsChoicesState() : null;
            classes.push(out);
        }
        if(classes.length > 0){output.classes = classes;}
        //#endregion
        //#region RACE
        let outRace = {};
        const curRace = builder.compRace.getRace_();
        if(curRace){
            //We need to include the entire race entity into the exported json
            outRace.raceEntity = curRace;
            if(builder.compRace.compRaceSize){
                outRace.size = [(await builder.compRace.compRaceSize.pGetFormData().data) || Parser.SZ_VARIES];
            }
            //RACE SKILL PROFICIENCIES
            await grabFormsFromComponents([...(builder.compRace.compRaceSkillProficiencies || []),
            ...(builder.compRace.compRaceSkillToolLanguageProficiencies || [])], outRace, "skillProfs");
            //RACE TOOL PROFICIENCIES
            await grabFormsFromComponents([...(builder.compRace.compRaceToolProficiencies || []),
                ...(builder.compRace.compRaceSkillToolLanguageProficiencies || [])], outRace, "toolProfs");
            //RACE LANGUAGE PROFICIENCIES
            await grabFormsFromComponents(builder.compClass.compRaceLanguageProficiencies, outRace, "langProfs");
            //RACE EXPERTISE
            await grabFormsFromComponents(builder.compClass.compRaceExpertise, outRace, "expertises");
            //RACE ARMOR PROFICIENCIES
            await grabFormsFromComponents(builder.compClass.compRaceArmorProficiencies, outRace, "armorProfs");
            //RACE WEAPON PROFICIENCIES
            await grabFormsFromComponents(builder.compClass.compRaceWeaponProficiencies, outRace, "weaponProfs");
            //RACE DAMAGE IMMUNITIES
            await grabFormsFromComponents(builder.compClass.compRaceDamageImmunity, outRace, "dmgImmunities");
            //RACE DAMAGE RESISTANCE
            await grabFormsFromComponents(builder.compClass.compRaceDamageResistance, outRace, "dmgResistances");
            //RACE DAMAGE VULNERABILITY
            await grabFormsFromComponents(builder.compClass.compRaceDamageVulnerability, outRace, "dmgVulnerabilities");
            //RACE CONDITION IMMUNITIES
            await grabFormsFromComponents(builder.compClass.compRaceConditionImmunity, outRace, "conImmunities");
            output.race = outRace;
        }
        //#endregion
        //#region BACKGROUND
        let outBk = {};
        const bkInfo = builder.compBackground.getFeatureCustomizedBackground_({isAllowStub:false});
        if(bkInfo){
            //outBk.backgroundUid = CharacterExportFvtt.entityToUID(bkInfo);
            //We will include the entire background entity instead
            bkInfo.backgroundEntity = builder.compBackground.getBackground_();
            await grabFormsFromComponents(builder.compBackground.compBackgroundFeatures, outBk, "features");
            //BACKGROUND SKILL PROFICIENCIES
            await grabFormsFromComponents(builder.compBackground.compBackgroundSkillProficiencies, outBk, "skillProfs");
            //BACKGROUND TOOL PROFICIENCIES
            await grabFormsFromComponents(builder.compBackground.isCustomizeLanguagesTools? 
                builder.compBackground.compBackgroundLanguageToolProficiencies : builder.compBackground.compBackgroundToolProficiencies, outBk, "toolProfs");
            //BACKGROUND LANGUAGE PROFICIENCIES
            await grabFormsFromComponents(builder.compBackground.isCustomizeLanguagesTools ?
                builder.compBackground.compBackgroundLanguageToolProficiencies : builder.compBackground.compBackgroundLanguageProficiencies, outBk, "langProfs");
            //BACKGROUND EXPERTISE
            await grabFormsFromComponents(builder.compBackground.compBackgroundExpertise, outBk, "expertises");
            //BACKGROUND ARMOR PROFICIENCIES
            await grabFormsFromComponents(builder.compBackground.compBackgroundArmorProficiencies, outBk, "armorProfs");
            //BACKGROUND WEAPON PROFICIENCIES
            await grabFormsFromComponents(builder.compBackground.compBackgroundWeaponProficiencies, outBk, "weaponProfs");
            //BACKGROUND DAMAGE IMMUNITIES
            await grabFormsFromComponents(builder.compBackground.compBackgroundDamageImmunity, outBk, "dmgImmunities");
            //BACKGROUND DAMAGE RESISTANCE
            await grabFormsFromComponents(builder.compBackground.compBackgroundDamageResistance, outBk, "dmgResistances");
            //BACKGROUND DAMAGE VULNERABILITY
            await grabFormsFromComponents(builder.compBackground.compBackgroundDamageVulnerability, outBk, "dmgVulnerabilities");
            //BACKGROUND CONDITION IMMUNITIES
            await grabFormsFromComponents(builder.compBackground.compBackgroundConditionImmunity, outBk, "conImmunities");
            if(builder.compBackground.compBackgroundCharacteristics){
                await grabFormsFromComponents(builder.compBackground.compBackgroundCharacteristics, outBk, "characteristics");
            }
            output.background = outBk;
        }
        //#endregion
        //#region FEATS
        let outFeats = {};
        const additionalFeatFormData = await builder.compFeat.feat_pGetAdditionalFeatFormData();
        if(additionalFeatFormData.isAnyData){
            outFeats.additionalFeats = additionalFeatFormData;
            const asi = builder.compAbility.compStatgen.getFormDataAsi();
            outFeats.asi = asi;
        }
        output.feats = outFeats;
        //#endregion
        //#region SPELLS
        const simplifySpellForm = (formData) => {
            for(let i = 0; i < formData.data.spells.length; ++i){
                let name = formData.data.spells[i].spell.name;
                let source = formData.data.spells[i].spell.source;
                formData.data.spells[i].spellEntity = formData.data.spells[i].spell;
                delete formData.data.spells[i].spell;
                //formData.data.spells[i].spellId = `${name}|${source}`;
                deletePropIfNull(formData.data.spells[i], "usesMax");
                deletePropIfNull(formData.data.spells[i], "usesPer");
                deletePropIfNull(formData.data.spells[i], "usesValue");
                deletePropIfNull(formData.data.spells[i], "existingItemId");
            }
            return formData;
        }
        const filterValues = builder.compSpell.filterValuesSpellsCache || builder.compSpell.filterBoxSpells.getValues();
        let spellsBySource = [];
        for (let ix = 0; ix < builder.compClass.state['class_ixMax'] + 1; ++ix) {
            let out = {};
            const { propIxClass: propIxClass, propIxSubclass: propIxSubclass } = ActorCharactermancerBaseComponent.class_getProps(ix);
            const cls = builder.compClass.getClass_({ propIxClass: propIxClass });
            if (!cls) { continue; }
            const sc = builder.compClass.getSubclass_({ cls: cls, propIxSubclass: propIxSubclass });
            if (builder.compSpell.compsSpellSpells[ix]) {
                let formData = await builder.compSpell.compsSpellSpells[ix].pGetFormData(filterValues);
                out.spells = simplifySpellForm(formData);
            }
            if (builder.compSpell.compsSpellAdditionalSpellClass[ix]) {
                const formData = await builder.compSpell.compsSpellAdditionalSpellClass[ix].pGetFormData();
                out.additionalSpells = formData;
            }
            if (!sc) { spellsBySource.push(out); continue; }
            if (builder.compSpell.compsSpellAdditionalSpellSubclass[ix]) {
                const formData = await builder.compSpell.compsSpellAdditionalSpellSubclass[ix].pGetFormData();
                out.additionalSpellsSubclass = formData;
            }
            spellsBySource.push(out);
        }
        output.spells = {spellsBySource:spellsBySource};
        //#endregion
        //#region EQUIPMENT
        let outEqu = {};
        outEqu.currency = await builder.compEquipment.compEquipmentCurrency.pGetFormData();
        outEqu.starting = await builder.compEquipment.compEquipmentStartingDefault.pGetFormData();
        outEqu.shop = await builder.compEquipment.compEquipmentShopGold.pGetFormData();
        output.equipment = outEqu;
        //#endregion
        console.log(output);
        const str = JSON.stringify(output);
        console.log(str);
        navigator.clipboard.writeText(str); //Write to browser clipboard
        return str;
    }
    

    //#region Pull Info From Builder
    /**
     * @param {ActorCharactermancerClass} compClass
     * @returns {{cls: any, isPrimary: boolean, propIxClass:string, propIxSubclass:string, targetLevel:number, sc:any}[]}
     */
    static async getClassData(compClass) {
        const primaryClassIndex = compClass._state.class_ixPrimaryClass;
        //If we have 2 classes, this will be 1
        const highestClassIndex = compClass._state.class_ixMax;
        let deletedClassesCount = 0;

        const classList = [];
        for(let i = 0; i <= highestClassIndex; ++i){
            const isPrimary = i == primaryClassIndex;
            //Get a string property that will help us grab actual class data
            let { propIxClass: propIxClass, propIxSubclass: propIxSubclass, propCurLevel:propCurLevel, propTargetLevel: propTargetLevel } =
            ActorCharactermancerBaseComponent.class_getProps(i);
            const isDeleted = ActorCharactermancerBaseComponent.class_isDeleted(i);
            if(isDeleted){deletedClassesCount++; continue;}

            //Grab actual class data
            const cls = compClass.getClass_({propIxClass: propIxClass});
            if(!cls){continue;}
            const targetLevel = compClass._state[propTargetLevel];
            if(deletedClassesCount>0){
                //If there were deleted classes before us, we need to shift the indices
                //Create a lower index
                const newProps = ActorCharactermancerBaseComponent.class_getProps(i-deletedClassesCount);
                //Use the new index instead
                propIxClass = newProps.propIxClass;
                propIxSubclass = newProps.propIxSubclass;
            }

            const block = {
                cls: cls,
                isPrimary: isPrimary,
                propIxClass: propIxClass,
                propIxSubclass:propIxSubclass,
                targetLevel:targetLevel
            }
            let skillProficienciesForm = this.getClassSkills(compClass, i);
            if(skillProficienciesForm != null){
                block.skillProficiencies = skillProficienciesForm;
            }
            let toolProficienciesForm = this.getClassTools(compClass, i);
            if(toolProficienciesForm != null){
                block.toolProficiencies = toolProficienciesForm;
            }
            //Get choices from the featureOptionsSelect components
            let featureOptSel = await this.getClassFeatureChoices(compClass, i);
            if(featureOptSel != null){ block.featureOptSel = featureOptSel; }
            //Now we want to ask compClass if there is a subclass selected for this index
            const sc = compClass.getSubclass_({cls:cls, propIxSubclass:propIxSubclass});
            if(sc != null) { block.sc = sc; }
            classList.push(block);
        }
        return classList;
    }
    /**
     * @param {ActorCharactermancerRace} compRace
     * @returns {{stateInfo:{subcomps:any, _compRaceSize:any}}}
     */
    static getRaceData(compRace){
        let out = null;
        const grabForm = (subCompName) => {
            if(compRace[subCompName]){
                const form = compRace[subCompName].pGetFormData();
                out.formInfo.subcomps[subCompName] = form;
            }
        }
        const grabState = (subCompName) => {
            if(compRace[subCompName]){
                out.stateInfo.subcomps[subCompName] = compRace[subCompName].__state;
            }
        }
        const race = compRace.getRace_();
        if(!!race){
            out = {meta:{race:race}, stateInfo:{subcomps:{}}};
            
            //Get states from subcomponents
            grabState("_compRaceSkillProficiencies");
            grabState("_compRaceArmorProficiencies");
            grabState("_compRaceConditionImmunity");
            grabState("_compRaceDamageImmunity");
            grabState("_compRaceDamageResistance");
            grabState("_compRaceDamageVulnerability");
            grabState("_compRaceExpertise");
            grabState("_compRaceLanguageProficiencies");
            grabState("_compRaceSkillToolLanguageProficiencies");
            grabState("_compRaceToolProficiencies");
            grabState("_compRaceWeaponProficiencies");

            if(compRace.compRaceSize){out.stateInfo._compRaceSize = compRace.compRaceSize.__state;}
            
        }
        else{
            console.error("Race is null");
        }
        return out;
    }
    /**
     * @param {ActorCharactermancerClass} compClass
     * @param {number} ix
     * @returns {any} returns a form
     */
    static getClassSkills(compClass, ix){
        if(compClass.compsClassSkillProficiencies.length<=ix){return null;}
        const comp = compClass.compsClassSkillProficiencies[ix];
        if(comp==null){return null;}
        const form = comp._getFormData();
        return form;
    }
    /**
     * @param {ActorCharactermancerClass} compClass
     * @param {number} ix
     * @returns {any} returns a form
     */
    static getClassTools(compClass, ix){
        if(compClass.compsClassToolProficiencies.length<=ix){return null;}
        const comp = compClass.compsClassToolProficiencies[ix];
        if(comp==null){return null;}
        const form = comp._getFormData();
        return form;
    }
    /**
     * @param {ActorCharactermancerClass} compClass
     * @param {number} classIx
     * @returns {{compIx:number, state:any, subCompDatas:{parentCompIx:number, subCompProp:string, state:any}[]}}
     */
    static async getClassFeatureChoices(compClass, classIx){
        if(compClass.compsClassFeatureOptionsSelect.length<=classIx){return null;}
        const compArray = compClass.compsClassFeatureOptionsSelect[classIx];
        let compDatas = [];
        for(let k = 0; k < compArray.length; ++k){
            let comp = compArray[k];
            if(comp==null){return null;}
            //let hashes = comp._optionsSet.map(set => {return set.hash});

            //Most of the time, comp will just have subcomponents that deal with specialized questions (pick language, skill, etc)
            let subCompDatas = [];
            const subCompsNames = comp.allSubComponentNames; //Get all the names of the possible kinds of subcomponents
            for(let j = 0; j < subCompsNames.length; ++j){
                let prop = subCompsNames[j];
                let subCompArray = comp[prop];
                if(!subCompArray){continue;}
                for(let i = 0; i < subCompArray.length; ++i){
                    let subComp = subCompArray[i];
                    //apparently the array can have null entries. huh.
                    if(!subComp){continue;}
                    //Now that we have found a subcomponent, copy the __state and include pointers on how to find it
                    //No need to include class ix here, that is already handled by the code that wraps this one
                    subCompDatas.push({parentCompIx: k, subCompProp:prop, subCompIx: i, state: subComp.__state});
                }
            }

            //In some cases (like Fighting Style for lvl 1 fighters), comp renders itself, instead of having subcomponents
            //In this case, we need to get the __state from comp itself
            //Alternatively, we will also grab __state even if it's not rendered, and we just found subcomponents
            let isSelfRendered = !!comp._lastMeta; //lazy but for now working way to dictate if this component is rendered
            if(isSelfRendered || subCompDatas.length > 0){
                compDatas.push({compIx: k, state: comp.__state, subCompDatas:subCompDatas});
            }
            //The important thing here is, we dont want to include *all* components in compArray, as some are never rendered and we just get issues trying to read/write their states
        }
        return compDatas;
    }
    /**
     * @param {ActorCharactermancerAbility} compAbility
     * @returns {any}
     */
    static async getAbilityScoreData(compAbility){
        const statgen = compAbility._compStatgen;
        const s = statgen.__state;
        const chosenModeIx = statgen._meta.ixActiveTab___default;
        //const chosenMode = (["none", "rolled", "std_array", "pointbuy", "manual"])[chosenModeIx];
        let out = {};
        if(chosenModeIx == 1){ //ROLL
            out = {rolled_str_abilSelectedRollIx:s["rolled_str_abilSelectedRollIx"],
            rolled_dex_abilSelectedRollIx:s["rolled_dex_abilSelectedRollIx"],
            rolled_con_abilSelectedRollIx:s["rolled_con_abilSelectedRollIx"],
            rolled_wis_abilSelectedRollIx:s["rolled_wis_abilSelectedRollIx"],
            rolled_int_abilSelectedRollIx:s["rolled_int_abilSelectedRollIx"],
            rolled_cha_abilSelectedRollIx:s["rolled_cha_abilSelectedRollIx"],
            rolled_formula:s["rolled_formula"],
            pb_isCustom:s["pb_isCustom"],
            rolled_rolls:s["rolled_rolls"]};
        }
        else if(chosenModeIx == 2){ //STANDARD ARRAY
            out = {array_str_abilSelectedScoreIx:s["array_str_abilSelectedScoreIx"],
            array_dex_abilSelectedScoreIx:s["array_dex_abilSelectedScoreIx"],
            array_con_abilSelectedScoreIx:s["array_con_abilSelectedScoreIx"],
            array_int_abilSelectedScoreIx:s["array_int_abilSelectedScoreIx"],
            array_wis_abilSelectedScoreIx:s["array_wis_abilSelectedScoreIx"],
            array_cha_abilSelectedScoreIx:s["array_cha_abilSelectedScoreIx"]};
        }
        else if(chosenModeIx == 3){ //POINT BUY
            out = {pb_str:s["pb_str"], pb_dex:s["pb_dex"], pb_con:s["pb_con"],
            pb_wis:s["pb_wis"], pb_int:s["pb_int"], pb_cha:s["pb_cha"],
            pb_budget:s["pb_budget"], pb_isCustom:s["pb_isCustom"], pb_points:s["pb_points"]};
        }
        else if(chosenModeIx == 4){ //MANUAL
            out = {manual_str_abilValue:s["manual_str_abilValue"],
            manual_dex_abilValue:s["manual_dex_abilValue"],
            manual_con_abilValue:s["manual_con_abilValue"],
            manual_wis_abilValue:s["manual_wis_abilValue"],
            manual_int_abilValue:s["manual_int_abilValue"],
            manual_cha_abilValue:s["manual_cha_abilValue"]};
        }

        const specifiedSave = true; //Keep true for now, otherwise for some reason ASI feats dont get properly saved/loaded

        if(specifiedSave){
            //ASI data
            let asiData = {};
            //We can get feats from ASIs, Races, and... what else? Backgrounds?
            //TODO: Add background support here
            for(let prop of Object.keys(s)){
                if(prop.startsWith("common_asi_") || prop.startsWith("common_additionalFeats_")){
                    asiData[prop] = s[prop];
                }
                //Some races provide ASI choices, include them here while we are at it
                else if(prop.startsWith("common_raceChoice")){
                    out[prop] = s[prop];
                }
                //Keep track of number of custom feats
                //TODO: only include custom feats with index lower than this number
                else if (prop.startsWith("common_cntFeatsCustom")){
                    out[prop] = s[prop];
                }
            }

            return {state:out, stateAsi:asiData, mode:chosenModeIx};
        }
        else{
            //We can just grab every property starting with common_ and include that
            for(let prop of Object.keys(s)){
                if(prop.startsWith("common_")){
                    out[prop] = s[prop];
                }
            }
            return {state:out, mode:chosenModeIx};
        }
      
    }
    /**
     * @param {ActorCharactermancerEquipment} compEquipment
     */
    static async getEquipmentData(compEquipment){
        //Get gold
        const compGold = compEquipment._compEquipmentCurrency;

        const compDefault = compEquipment._compEquipmentStartingDefault;
        //Get the _state from compDefault, it contains info about which items were selected
        const stateDefault = compDefault.__state;
        //We also need info on if we rolled for gold or not. We can get this from compGold
        const cpRolled = compGold.__state.cpRolled;
        //Then we need info on which items were purchased in the item shop
        const compShop = compEquipment._compEquipmentShopGold;
        const boughtItems = compShop.__state.itemPurchases.map(it =>  { 
            return {isIgnoreCost: it.data.isIgnoreCost, quantity: it.data.quantity, value: it.data.value, uid: it.data.uid};});

        const out = {stateDefault:stateDefault, cpRolled:cpRolled, boughtItems:boughtItems};

        return out;
    }
    /**
     * @param {ActorCharactermancerSpell} compSpell
     * @returns {{className:string, classSource:string, spellsByLvl:Charactermancer_Spell_SpellMeta[][]}[]}
     */
    static getAllSpellSources(compSpell, deletedClasses){
        const filterValues = compSpell.filterValuesSpellsCache || compSpell.filterBoxSpells.getValues();
        let spellsBySource = [];
        let forms = [];
        for(let j = 0; j < compSpell.compsSpellSpells.length; ++j){
            //Assume this component handles spells for a certain class
            let comp = compSpell.compsSpellSpells[j];
            if(!comp){continue;}
            let className = comp._className;
            let classSource = comp._classSource;
            let classIx = j;
            //If previous classes were deleted, we are going to shift our classIx down to compensate
            classIx = this.downgradeClassIx_deletedClassCompensation(classIx, deletedClasses);
            forms.push(compSpell.compsSpellSpells[j].pGetFormData(filterValues));
            let spellsByLvl = compSpell.compsSpellSpells[j]._test_getKnownSpells().map(arr => arr.map(
                spell => {return {name: spell.spell.name, source:spell.spell.source,
                    isLearned:spell.isLearned, isPrepared:spell.isPrepared, spell:spell.spell};}
            ));
            spellsBySource.push({className: className, classSource:classSource, ix:classIx, spellsByLvl: spellsByLvl});
        }
        return spellsBySource;
    }
    static getDeletedClassIds(compClass){
        let ar = [];
        for(let i = 0; i <= compClass._state.class_ixMax; ++i){
            if(ActorCharactermancerBaseComponent.class_isDeleted(i)){ar.push(i);}
        }
        return ar;
    }
    static downgradeClassIx_deletedClassCompensation(classIx, deletedClasses){
        let mod = 0;
        for(let i = 0; i < deletedClasses.length; ++i){
            if(i < classIx){mod++;}
        }
        classIx -= mod;
        return classIx;
    }
    /**
     * Get background save data
     * @param {ActorCharactermancerBackground} compBackground
     * @returns {any}
     */
    static getBackground(compBackground){
        let bk = compBackground.getBackground_();
        if(!bk){return null;}
        const bkSource = bk.source;
        const bkName = bk.name;
        const isCompletelyCustom = bk.name == "Custom Background";

        let out = { name: bkName, source: bkSource};
        //Skill proficiencies
        out.isCustomizeSkills = !!compBackground.__state.background_isCustomizeSkills;
        out.stateSkillProficiencies = compBackground.compBackgroundSkillProficiencies?.__state;
        //Languages & tools
        out.isCustomizeLanguagesTools = !!compBackground.__state.background_isCustomizeLanguagesTools;
        out.stateLanguageToolProficiencies = compBackground.compBackgroundLanguageToolProficiencies?.__state;
        out.stateToolProficiencies = compBackground.compBackgroundToolProficiencies?.__state;
        out.stateLanguageProficiencies = compBackground.compBackgroundLanguageProficiencies?.__state;
        //Others
        out.stateArmorProficiencies = compBackground.compBackgroundArmorProficiencies?.__state;
        out.stateWeaponProficiencies = compBackground.compBackgroundWeaponProficiencies?.__state;
        out.stateImmunity = compBackground.compBackgroundDamageImmunity?.__state;
        out.stateResistance = compBackground.compBackgroundDamageResistance?.__state;
        out.stateVulnerability = compBackground.compBackgroundDamageVulnerability?.__state;
        out.stateExpertises = compBackground.compBackgroundExpertise?.__state;
        out.stateConditionImmunities = compBackground.compBackgroundConditionImmunity?.__state;
        //Characteristics
        out.stateCharacteristics = compBackground.compBackgroundCharacteristics.__state;
        //features
        out.stateFeatures = compBackground.compBackgroundFeatures.__state;

        //Delete all properties that are null
        out = Object.fromEntries(Object.entries(out).filter(([_, v]) => v != null));

        return out;
    }
    static getFeats(compFeat){
        compFeat._getFeats();
    }
    static getChosenSpellsFromFeats(compFeat){

        //Return an array, each entry containing a key pointing to the choiceObj, and an array containing the choiceComponents
        const getChoiceComponents = (compAdditionalFeatMetas) => {
            let chooseObj = compAdditionalFeatMetas._compsFeatFeatureOptionsSelect.choose;
            //chooseObj:
            //- 0: {
            //-- Array[
            let toReturn = [];
            for(let choiceKey of Object.keys(chooseObj)){
                let subArray = chooseObj[choiceKey];
                toReturn.push({key:choiceKey, components:subArray});
            }
            return toReturn;
        }
        const getSpellChoices = (choiceComp) => {
            let toReturn = {_subCompsAdditionalSpells:[]};
            for(let subComp of choiceComp._subCompsAdditionalSpells){
                console.log(subComp);
                for(let a of subComp._additionalSpellsFlat){
                    for(let key of Object.keys(a.spells)){
                        let spObj = a.spells[key];
                        console.log(spObj);
                        if(spObj.type == "choose"){
                            let spellUid = subComp.__state[spObj.key];
                            console.log(spellUid);
                            toReturn._subCompsAdditionalSpells.push({data:spObj, value:spellUid});
                        }
                    }
                }
            }
            return toReturn;
        }
        const setSpellChoice = (choiceComponent, key, value) => {

        }

        const getSpellChoicesFromFeats = (compAdditionalFeatMetas) =>{
            let chooseObjs = getChoiceComponents(compAdditionalFeatMetas);
            let returnObj = [];
            for(let i = 0; i < chooseObjs.length; ++i){
                let outAr = [];
                for(let choiceComp of chooseObjs[i].components){
                    let val = getSpellChoices(choiceComp);
                    outAr.push(val);
                }
                returnObj.push(outAr);
            }
            return returnObj;
        }

        const fromRace = () => {
            return getSpellChoicesFromFeats(compFeat._compAdditionalFeatsMetas.race.comp);
        }

        let val = fromRace();
        console.log(val);

        let chooseObj = compFeat._compAdditionalFeatsMetas.race.comp._compsFeatFeatureOptionsSelect.choose;
        for(let key of Object.keys(val)){
            for(let choiceComp of chooseObj[key]){

                for(let subComp of choiceComp._subCompsAdditionalSpells){
                    console.log(subComp);
                    for(let a of subComp._additionalSpellsFlat){
                        for(let key of Object.keys(a.spells)){
                            let spObj = a.spells[key];
                            console.log(spObj);
                            if(spObj.type == "choose"){
                                let spellUid = subComp.__state[spObj.key];
                                console.log(spellUid);
                                toReturn._subCompsAdditionalSpells.push({data:spObj, value:spellUid});
                            }
                        }
                    }
                }
                returnObj[choiceKey].push(toReturn);
            }
        }
    }
    //#endregion


    /**
     * @param {{name:string, source:string}} entity a subclass, race, class etc
     * @param {string} type "subclass", "class", "race", etc
     * @returns {{filename:string, url:string, isLocal:string, checksum:string}[]}
     */
    static async _test_MatchEntityToSource(entity, type){
        const returnOnFirstMatch = false;
        //Let's get all enabled sources first (one of them might Be 'Upload File')
        const enabledSources = CharacterExportFvtt.getBrewSourceIds();
        const brew = await BrewUtil2.pGetBrew();
        let matchedSources = [];
        for(let source of brew){
            //Even an uploaded file can appear here
            //source.head.filename
            //source.head.url (might be that uploaded files have this as null)

            const content = source.body[type]; //type array. subclass, class, race, etc
            if(!content){continue;}
            let matchedEntity = false; //This loop will close once a match is made
            for(let ci = 0; !matchedEntity && ci < content.length; ++ci){
                //Let's do a simple match: just 'name' and 'source'
                matchedEntity = (content[ci].name == entity.name && content[ci].source == entity.source);
            }
            if(matchedEntity){
                if(returnOnFirstMatch){return [source.head];}
                matchedSources.push(source.head);
            }
        }
        return matchedSources;
    }
    /**
     * @param {{name:string, source:string}} entity a subclass, race, class etc
     * @param {string} type "subclass", "class", "race", etc
     * @returns {{filename:string, url:string, isLocal:string, checksum:string}[]}
     */
    static async _test_MatchEntityToSourceGet(entity, type){
        const returnOnFirstMatch = false;
        //Let's get all enabled sources first (one of them might Be 'Upload File')
        const enabledSources = CharacterExportFvtt.getBrewSourceIds();
        const brew = await BrewUtil2.pGetBrew();
        let matchedSources = [];
        for(let source of brew){
            //Even an uploaded file can appear here
            //source.head.filename
            //source.head.url (might be that uploaded files have this as null)

            const content = source.body[type]; //type array. subclass, class, race, etc
            console.log("content", content);
            if(!content){continue;}
            let matchedEntity = false; //This loop will close once a match is made
            for(let ci = 0; !matchedEntity && ci < content.length; ++ci){
                //Let's do a simple match: just 'name' and 'source'
                matchedEntity = (content[ci].name.toLowerCase() == entity.name.toLowerCase()
                && content[ci].source.toLowerCase() == entity.source.toLowerCase());
            }
            if(matchedEntity){
                let obj = {source:source.head, content:content};
                if(returnOnFirstMatch){return [obj];}
                matchedSources.push(obj);
            }
        }
        return matchedSources;
    }
    /**
     * @param {{filename:string}} source
     * @returns {boolean}
     */
    static isUploadedFileSource(source){
        //First, get all the brew sourceIds from somewhere
        let srcIds = CharacterExportFvtt.getLoadedSources();
        //Next, filter the sources until we get one called 'Upload File'.
        //Alternatively, just check if source.isFile
        srcIds = srcIds.filter(srcId => srcId.isFile);
        if(!srcIds || srcIds.length < 1){return false;}
        //Now that we have confirmed the user did include an 'Upload File' source, we need to check if any uploaded files match
        //We need the uploadedFileMetas for this
        const fileMetas = SourceManager._testUploadedFileMetas;
        return fileMetas.filter(meta => meta.name == source.filename).length > 0;
    }

    //#region Get Source Metadata
    /**
     * Gets source metadata for an object (race/class/subclass/spell/etc)
     * @param {{name:string, source:string}} item
     * @param {{name:string, url:string, abbreviations:string[], isDefault:boolean, isFile:boolean}[]} brewSourceIds
     * @returns {{isOfficialContent:boolean, brewSource:{name:string, url:string, abbreviations:string[]}}}
     */
    static getSourceMetaData(item, brewSourceIds){
        //This is not a trustable way to confirm if something is from official sources or not. Yet.
        if(item.srd || this.isFromOfficialSource(item)){
            return {isOfficialContent:true};
        }
        else {
            const match = this.matchToBrewSourceID(item, brewSourceIds);
            if(!match){ console.log(item, brewSourceIds);
                throw new Error(`Failed to get brew source for ${item.name}|${item.source}`);}
            return {isOfficialContent:false, brewSource:match};
        }
    }
     /**
     * @returns {{name:string, url:string, isDefault:boolean, isFile:boolean, isWorldSelectable:boolean, cacheKey:string, _brewUtil: any
     * filterTypes:string[], _pPostLoad:Function, _isExistingPrereleaseBrew:boolean, _isAutoDetectPrereleaseBrew:boolean,
     * abbreviations:string[] _isAutoDetectPrereleaseBrew:boolean, _isExistingPrereleaseBrew:boolean}[]}
     */
    static getLoadedSources(){
        return [...SourceManager.cachedSourceIds, ...SourceManager.cachedCustomUrls];
    }
    static getBrewSourceIds(){
        //Only return non-default sources for now
        return this.getLoadedSources().filter(src => !src.isDefault);
    }
    /**
     * @param {{name:string, source:string}} item a class, subclass, race, item, feat, background, etc
     * @param {{name:string, url:string, abbreviations:string[], isFile:boolean, isDefault:boolean}} sourceId
     * * @param {boolean} pendanticMode (default is true) in pedantic mode, we don't just check that abbreviations match, we do a deeper match
     * @returns {boolean}
     */
    static doesMatchToBrewSource(item, sourceId, pendanticMode=false){

        if((typeof sourceId) == "string"){sourceId = {url:sourceId};}

        //NEW STUFF
        //check if custom upload or default source, we do not handle those
        if(sourceId.isFile){return false;}
        if(sourceId.isDefault){return false;}

        //All items should have an abbreviation for the source in the 'source' property (for example, "PHB")
        //const itemAbbreviation = item.source? item.source.toLowerCase() : null;
        //Unfortunately, no source IDs contain this kind of information, so we cant match them this way
        //But the source id *does* have an url
        const srcUrl = sourceId.url;
        //And the item should have an array with cached urls (hopefully just one) associated with it
        const itemSrcUrls = item.sourceCacheKeys;
        if(itemSrcUrls==null){console.log(item.name+" does not have sourceCacheKeys", item);}
        const urlMatch = itemSrcUrls.includes(srcUrl);
        if(!urlMatch){return false;}

        if(!pendanticMode){return true;}

        //Since we can't rely on the itemAbbreviation alone to find us the correct source, we need to be more rough
        //We probably need to use the sourceId to load a source, then check if it mentions this item
        //const src = BrewUtil2.sourceJsonToSource(item.source);
        
        //Lets get the full name of the source. We expect the name to be split like this: "AUTHOR; BREW_NAME"
        let sourceFullName = "";
        if(!sourceId.name.includes(";")){sourceFullName = sourceId.name;} //Let's have a fallback in case for some reason the name doesnt have a section for the author
        else { sourceFullName = sourceId.name.substring(sourceId.name.indexOf(";") + 1).trim(); } //This is the expected outcome

        //Now we need the source full name on the end of the item in question (like a subclass, feat, or spell)
        //Parser should have this information
        let itemSourceFull = Parser.sourceJsonToFull(item.source); //Expect a full name of the brew here
        //Remove all non-latin and non-numeral characters (sometimes people misplace ' and ´, among other things)
        const removeNonAlphanumericCharacters = (inputString) => {
            return inputString.replace(/[^a-zA-Z0-9]/gi, '');
        }


        //If the brewer made a typo between any two (of the numerous places) where you define the source's full name, this will fail and return null

        sourceFullName = removeNonAlphanumericCharacters(sourceFullName).toLowerCase();
        itemSourceFull = removeNonAlphanumericCharacters(itemSourceFull).toLowerCase();

        return sourceFullName == itemSourceFull;
    }
    /**
     * @param {{name:string, source:string}} item
     * @param {{full:string, url:string, abbreviation:string}} fileSourceId
     * @returns {boolean}
     */
    static doesMatchToUploadedFileSource(item, fileSourceId){

        //test
        let itemSourceFull = Parser.sourceJsonToFull(item.source); //Ok so we cant rely on this to get the correct source name from an abbreviation

        if(item.source == fileSourceId.abbreviation){return true;}
        //Fallback - not sure if this will ever work, but perhaps the sourceId has 'abbreviations' (a string array)
        if(!!fileSourceId.abbreviations && fileSourceId.abbreviations.includes(item.source)){return true;}
        //There might be a way to ask BrewUtil2 for the source by just using this abbreviation
        return false;
    }
    /**
     * Matches an item to a brew source ID
     * @param {{name:string, source:string}} item a class, subclass, race, item, feat, background, etc
     * @param {{name:string, abbreviations:string[]}[]} brewSourceIds
     * @returns {{name:string, abbreviations:string[]}}
     */
    static matchToBrewSourceID(item, brewSourceIds){

        let matchedIds = brewSourceIds.filter(srcId => this.doesMatchToBrewSource(item, srcId));

        //DEBUG - try to only match to uploaded files
        const uploadedFileSources = brewSourceIds.filter(srcId => srcId.isFile);
        if(uploadedFileSources.length > 0){
            const fileMetas = SourceManager._testUploadedFileMetas;
            for(let file of fileMetas){
                if(!file.contents?._meta){continue;}
                for(let src of file.contents._meta.sources){
                    let isMatch = this.doesMatchToUploadedFileSource(item, src);
                    if(isMatch){matchedIds.push(src);}
                }
            }
        }

        
        if(matchedIds.length < 1){return null;}
        if(matchedIds.length > 1){ console.error("Matched item to multiple brew sources", item, matchedIds); } //something went wrong
        return matchedIds[0];
    }

    /**
     * Checks if an object(race/class/subclass/etc) is from an official source 
     * @param {{__diagnostic:any}} item
     * @returns {boolean}
     */
    static isFromOfficialSource(item){
        return [Parser.SOURCES_VANILLA,
            ...Parser.SOURCES_CORE_SUPPLEMENTS,
            ...Parser.SOURCES_PARTNERED_WOTC,
            ...Parser.SOURCES_NON_STANDARD_WOTC,
            ...Parser.SOURCES_NON_FR,
            ...Parser.SOURCES_CORE_SUPPLEMENTS,
            ...Parser.SOURCES_COMEDY,
            ...Parser.SOURCES_ADVENTURES,
            //...Parser.SOURCES_AVAILABLE_DOCS_BOOK,
            //...Parser.SOURCES_AVAILABLE_DOCS_ADVENTURE,
        ].includes(item.source);


        //we can check check if parser knows of the name
        //actually, SOURCE_JSON_TO_FULL probably gets filled by properties from homebrew.
        //So we cant rely on it to validate official sources
        //return !!Parser.SOURCE_JSON_TO_FULL[item.source];
        return false;
    }
    static matchToOfficialSource(item){
        return Parser.sourceJsonToFull(item.source);
    }
    //#endregion

    static test_getSourceFromSubclass(){
        const item = {
            className: "Sorcerer",
            classSource: "PHB",
            name: "Blood Magic",
            shortName: "Blood Magic",
            source: "FFBloodSorc",
            __diagnostic: {filename: "Foxfire94; Blood Magic Sorcerous Origin.json" },
            __prop: "subclass"
        };

         //First of all, try to figure out if this is a brewed subclass
        //one easy way (maybe?) of doing this is to check the __diagnostic property (only brewed (and maybe prerelease?) stuff has this)
        const isBrewedContent = CharacterExportFvtt.isFromOfficialSource(item);

        if(!isBrewedContent){
            const sourceNameFull = this.matchToOfficialSource(item);
            const meta = {
                isOfficial: true,
                source: item.source,
                sourceFull: sourceNameFull
            };
            return meta;
        }


        const brewSources = CharacterExportFvtt.getBrewSourceIds();

        const matchedBrewSources = brewSources.filter(src => this.doesMatchToBrewSource(item, src));
        if(matchedBrewSources.length<1){}
    }

    static test_printExportJsonAsString(exportJson){
        const str = JSON.stringify(exportJson);
        return str;
    }
    /**
     * Creates an UID for the entity. Example: "Ranger|PHB"
     * @param {{name:string, source:string}} entity
     * @returns {string}
     */
    static entityToUID(entity){
        return entity.name + "|" + entity.source;
    }
    
    /**
     * Save file schema
     * _meta:
     * character:
     * -classes (array)
     * --[0]
     * ---name (string)
     * ---source (string)
     * ---skillsTools
     * ---
    */
}
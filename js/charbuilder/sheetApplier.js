class SheetApplier {

    updatePool = {};
    constructor(actor, choiceData){
        this.actor = actor;
        this.choiceData = choiceData;
    }
    /**
   * Parses choices made in the charactermancer, and applies them to the sheet
   * @param {Actor5e} actor
   * @param {any} choiceData
   * @returns {any}
   */
    static async parseMancerChoiceData(actor, choiceData){

        console.log("ChoiceData", choiceData);
        //System5e.applyClassChoiceData(actor, choiceData);
        const addFeatureItem = async(type, hash, dependencyPath, data={}) =>
            {return await SheetApplier._addFeatureItem(type, hash, dependencyPath, data); }
        const removeFeatureItem = (it) => {
          //Or just add to removal pool
          actor.removeEmbeddedDocuments("item", [it]);
        }
        const isMancerGranted = (item) => {
          console.log("Is Granted?", item.isMancerCreated, item);
          return item.isMancerCreated;
        }
        const findItemMatch = (path, uid) => {
          for(let i = 0; i < allItems.length; ++i){
            if(allItems[i].isMancerDependencyMatch(path) && allItems[i].uid == uid){return i;}
          }
          return -1;
        }
        
        const pullProperties = (forms, propertyParentName) => {
          let properties = [];
          for(let form of forms??[]){
            if(!form.data[propertyParentName] && !form.isFormComplete){continue;}
            for(let [key, value] of Object.entries(form.data[propertyParentName])){properties.push(key);}
          }
          return properties;
        }
        const mergeUpdatePool = (prop, array) => {
          if(updatePool[prop] == null){updatePool[prop] = array; return;}
          updatePool[prop] = updatePool[prop].concat(array);
        }
        
        
        const pullSenses = (data) => {
          for(let [senseKey, input] of Object.entries(data)){
            let currentVal = updatePool[`senses.${senseKey}`] ?? 0;
            let nextVal = currentVal;
            if(currentVal > 0 && input.bonus_hasFromRaceAlready != null){nextVal = currentVal + input.bonus_hasFromRaceAlready;}
            else{nextVal = input.value;}
            updatePool[`senses.${senseKey}`] = nextVal;
          }
        }
    
        const handleConditionals = (conditionals) => {
          
          for(let cond of conditionals){
            //If this conditional has a condition, try to evaluate. If we fail, abort
            if(cond.condition != null)
            {
              console.log("Resolve", cond.condition, "on", actor);
              const func = new Function("actor", `return ${cond.condition}`);
              if(!func(actor)){continue;}
            }
            //Since we succeeded, look for a "mod" object, and the entries within
            for(let [modName, mod] of Object.entries(cond.mod ?? {})){
              const val = mod.value;
              console.log("apply mod", mod);
              switch(mod.mode.toLowerCase()){
                case "set": updatePool[modName] = val; break;
                case "add": updatePool[modName] = (updatePool[modName] ?? 0) + val; break;
                default: continue;
              }
            }
          }
        }
        //Reset actor if settings demand it
        if(SETTINGS.SHEET_MANCER_RECREATES_SHEET){
          actor = new Actor5e();
          CharacterBuilder.instance._actor = actor;
          ActorCharactermancerSheet2.instance.setup(actor);
        }
        console.assert(SETTINGS.SHEET_MANCER_RECREATES_SHEET == true, "Sheet recreation mode is currently the only mode supported");
        //Mark all mancer-given features on actor as unverified
        let allItems = actor.getItemsByUid("*").filter(it => isMancerGranted(it) == true);
        let itemsVerified = new Array(allItems.length).fill(false);
        //Then try to verify each one, and add new (already verified) features on to the sheet if needed
    
    
        let updatePool = {};
    
        
        //#region Parse Race
        for(let race of choiceData.races){
          let raceItem = await addFeatureItem("race", race.uid, race.path);
          console.log("RaceItem", raceItem);
          updatePool["system.details.race"] = {name:raceItem.name, system:raceItem.system};
          //Movement speed
          mergeUpdatePool("traits.traits.languages.selected", pullProperties(race.languages, "languageProficiencies"));
          mergeUpdatePool("traits.traits.languages.selected", pullProperties(race.skillsToolsLanguages, "languageProficiencies"));
          pullSkillProperties(race.skills);
          pullToolProperties(race.tools);
          pullSkillProperties(race.skillsToolsLanguages);
          pullToolProperties(race.skillsToolsLanguages);
          pullSkillProperties(race.expertise, true);
          mergeUpdatePool("traits.traits.dr.selected", pullProperties(race.damRes, "resist"));
          mergeUpdatePool("traits.traits.di.selected", pullProperties(race.damImm, "immune"));
          mergeUpdatePool("traits.traits.dv.selected", pullProperties(race.damVul, "vulnerable"));
          mergeUpdatePool("traits.traits.ci.selected", pullProperties(race.conImm, "conditionImmune"));
          mergeUpdatePool("traits.traits.expertise.selected", pullProperties(race.expertise, "expertise"));
          mergeUpdatePool("traits.traits.weaponProf.selected", pullProperties(race.weaponProficiencies, "weaponProficiencies"));
          mergeUpdatePool("traits.traits.armorProf.selected", pullProperties(race.armorProficiencies, "armorProficiencies"));
          const sizeAbbr = race.size?.[0]?.data??"M";
          const sizeConversion = {m:"med", t:"tiny", s:"sm", g:"grg", h:"huge", l:"large"};
          updatePool["traits.size"] = sizeConversion[sizeAbbr.toLowerCase()];
        }
        //#endregion
        //#region Parse Background
        
        //#endregion
        //#region Parse Ability Scores
        //#region Parse Classes
        console.log(updatePool);
        actor.update(updatePool, {doNotFireUpdate:true}); //Test update before class
        let totalLevel = 0;
        for(let cls of choiceData.classes){
          let addedFeatureHashes = [];
          const clsData = CharacterBuilder.getEntityByUid("class", {uid: cls.uid});
          console.log("CLASS DATA", clsData);
          let sclsData = null;
          let classItem = await addFeatureItem("class", cls.uid, cls.path); //Add the class item itself to our sheet
          classItem.targetLevel = cls.targetLevel;
          totalLevel += cls.targetLevel;
          //Subclass
    
          const hasSubclass = cls.ixSubclass != null;
          if(hasSubclass){
    
            sclsData = CharacterBuilder._getEntityByUid(clsData.subclasses, {uid: cls.subclassUid});
            //Add subclass's additionalSpells
            for(let addSpells of sclsData.additionalSpells??[]){
              for(let [knownType, value] of Object.entries(addSpells)){
                for(let [gainedAtLvl, spellHashes] of Object.entries(value)){
                  if(cls.targetLevel < gainedAtLvl){continue;} //Must be high enough level
                  let preparationMode = knownType; if(knownType == "known"){preparationMode = "alwaysKnown";} //Assume they mean alwaysKnown when they say known
                  for(let hash of spellHashes){await addSpellItem(hash, preparationMode);}
                }
              }
            }
            console.log("SUBCLASS DATA", sclsData);
            
            //Try to import the subclass itself (TEST)
            /* let subclassItem = await addFeatureItem("subclass", cls.subclassUid, null,
              {className: clsData.name, classSource: clsData.source,
                subclassName: sclsData.name, subclassSource: sclsData.source}); */
              
    
            //Go through scData's features and add them to the inventory (the ones that were not added by FOS)
            for(let f of sclsData.subclassFeatures){
              //console.log(f);
              //probably best to look in f.loadeds
              /* await addFeatureItem(feature.type, feature.hash, cls.path,
                {className:clsData.name.toLowerCase(), classSource:clsData.source.toLowerCase()}); */
            }
    
            //We need to get senses from hardcodings, unfortunately
            //const senses = Hardcodings.getSenses("subclass", sclsData);
            //pullSenses(senses);
          }
    
    
          //HIT POINTS
          for(let form of cls.hpInfo){
            let hpFormula = form.data.hitPointsAtFirstLevel;
            let hpNum = Roll._evaluateSync(Roll.replaceFormulaData(hpFormula, actor.system));
            updatePool[`hp.value`] = hpNum;
            updatePool[`hp.max`] = hpNum;
            //updatePool["attributes.hd"] = ???
          }
    
          //SKILL PROFICIENCIES
          //First, reset existing skills
          if(!SETTINGS.SHEET_MANCER_RECREATES_SHEET){
            for(let [skillName, skill] of Object.entries(actor.skills)){
            skill.baseProf = 0; //No proficiency
            const newSkill = System5e.calcSkillEmbed(skill, actor.system.abilities, actor.system.attributes.prof);
            updatePool[`skills.${skillName}`] = newSkill;
            }
          }
          //Then, apply skills we gained from class
          pullSkillProperties(cls.skillProficiencies);
          //FEATURE OPTIONS SELECT
          for(let fos of cls.featureOptionsSelect){
            //FEATURES
            for(let feature of fos.data.features??[]){
              //.isRequiredOption is a good teller if they want us to load a subclassFeature from within a loadeds
              if(feature.type == "subclassFeature" && (feature.isRequiredOption === false
                && feature.isRequiredOption !== null) && !SETTINGS.SUBCLASS_IMPORT_LOADEDS){continue;}
              const featureItem = await addFeatureItem(feature.type, feature.hash, cls.path,
                {className:clsData.name.toLowerCase(), classSource:clsData.source.toLowerCase(),
                  subclassName:sclsData?.name.toLowerCase(), subclassSource:sclsData?.source.toLowerCase()});
              //if(!!featureItem.actorTokenMod){parseActorTokenMod(featureItem.actorTokenMod);}
    
              if(featureItem.name == "Umbral Sight"){
                //Try to load it from cache
                const foundryItem = CharacterBuilder.getFeatureByUid("foundrySubclassFeature",
                  null, {name:featureItem.name, source:featureItem.subclassSource, subclassName:feature.subclassName,
                    className:featureItem.className, classSource:featureItem.classSource});
                console.log("Foundry Item", foundryItem, featureItem);
    
                handleConditionals(foundryItem.entryData.senses[0].conditionals);
              }
              
              addedFeatureHashes.push(feature.hash);
            }
            pullSkillProperties(fos.data.formDatasExpertise, true);
            pullSkillProperties(fos.data.formDatasSkillProficiencies);
            pullSkillProperties(fos.data.formDatasSkillToolLanguageProficiencies);
            mergeUpdatePool("traits.traits.languages.selected", pullProperties(fos.data.formDatasLanguageProficiencies, "languageProficiencies"));
            mergeUpdatePool("traits.traits.languages.selected", pullProperties(fos.data.formDatasSkillToolLanguageProficiencies, "languageProficiencies"));
            mergeUpdatePool("traits.traits.dr.selected", pullProperties(fos.data.formDatasDamageResistances, "resist"));
            mergeUpdatePool("traits.traits.di.selected", pullProperties(fos.data.formDatasDamageImmunities, "immune"));
            mergeUpdatePool("traits.traits.dv.selected", pullProperties(fos.data.formDatasDamageVulnerabilities, "vulnerable"));
            mergeUpdatePool("traits.traits.ci.selected", pullProperties(fos.data.formDatasConditionImmunities, "conditionImmune"));
            mergeUpdatePool("traits.traits.weaponProf.selected", pullProperties(fos.data.formDatasWeaponProficiencies, "weaponProficiencies"));
            mergeUpdatePool("traits.traits.armorProf.selected", pullProperties(fos.data.formDatasArmorProficiencies, "armorProficiencies"));
            //senses
            //resources
            //saving throw proficiencies
            //additional spells
          }
        }
        updatePool["system.details.level"] = totalLevel;
        updatePool["system.attributes.prof"] = System5e.calcProficiencyBonus(totalLevel);
        //#endregion
        
        //This should be done after class, we need the proficiency modifier (based on class level)
        const abilityAbbr = ["str", "dex", "con", "int", "wis", "cha"];
        for(let a of abilityAbbr){
          updatePool[`system.abilities${a}`] = System5e.calcAbilityScoreEmbed(actor.system.abilities[`${a}`], choiceData.ability[`${a}`], actor.system.attributes.prof); }
        //#endregion
    
        //Then remove all unverified features
        for(let i = 0; i < itemsVerified.length; ++i){
          let it = allItems[i];
          let isVerified = itemsVerified[i];
          if(!isVerified){console.log(it.uid, "remains unverified!"); removeFeatureItem(it);}
        }
        
        console.log(updatePool);
        //TODO: check for language duplicates
        actor.update(updatePool, {doNotFireUpdate:true});
        //Movement speed?
        actor.prepareEmbeddedDocuments();
        actor.prepareDerivedData();
        actor.update(); //Forces render
    }


    static resetActor(){
        //Reset actor if settings demand it
        actor = new Actor5e();
        CharacterBuilder.instance._actor = actor;
        ActorCharactermancerSheet2.instance.setup(actor);
    }

    /**
     * Adds a feature item to the character sheet.
     * @param {Actor5e} actor
     * @param {string} type
     * @param {string} hash
     * @param {any} dependencyPath
     * @param {any} data={}
     * @returns {Feature5e}
     */
    static async addFeatureItem(actor, type, hash, dependencyPath, data={}) {
        //f.type should be either "optionalfeature"(lowercase spelling), "feat", "classFeature", or "subclassFeature"
        switch(type){
          case "optionalfeature":
            await OptionalFeature5e.verifySystemData(hash);
            let featureItem = new OptionalFeature5e(hash, null, false);
            featureItem.markMancerDependency(new MancerDependencyLink(dependencyPath));
            System5e.tryAddToInventory(actor, featureItem, "passive", {doNotRender:true});
            return featureItem;
          case "class":
            //await Class5e.verifySystemData(hash);
            let classItem = new Class5e(hash, null, false);
            classItem.markMancerDependency(new MancerDependencyLink(dependencyPath));
            System5e.tryAddToInventory(actor, classItem, "class", {doNotRender:true});
            return classItem;
          case "subclass":
            await Subclass5e.verifySystemData(data.className, data.classSource, data.subclassName, data.subclassSource);
            let subclassItem = new Subclass5e(hash, data.className, data.classSource, null, false);
            //subclassItem.markMancerDependency(new MancerDependencyLink(dependencyPath));
            System5e.tryAddToInventory(actor, subclassItem, "class", {doNotRender:true});
            return subclassItem;
          case "background":
            //await Class5e.verifySystemData(hash);
            let backgroundItem = new Background5e(hash, null, false);
            backgroundItem.markMancerDependency(new MancerDependencyLink(dependencyPath));
            System5e.tryAddToInventory(actor, backgroundItem, "background", {doNotRender:true});
            return backgroundItem;
          case "race":
            await Race5e.verifySystemData(hash);
            let raceItem = new Race5e(hash, null, false);
            raceItem.markMancerDependency(new MancerDependencyLink(dependencyPath));
            System5e.tryAddToInventory(actor, raceItem, "race", {doNotRender:true});
            return raceItem;
          case "classFeature":
            await ClassFeature5e.verifySystemData(hash, data.className, data.classSource);
            let clsFeatureItem = new ClassFeature5e(hash, data.className, data.classSource, null, false);
            clsFeatureItem.markMancerDependency(new MancerDependencyLink(dependencyPath));
            System5e.tryAddToInventory(actor, clsFeatureItem, this.isActivePassive(clsFeatureItem), {doNotRender:true});
            return clsFeatureItem;
          case "subclassFeature":
            await SubclassFeature5e.verifySystemData(hash, data.className, data.classSource, data.subclassName, data.subclassSource);
            let sclsFeatureItem = new SubclassFeature5e(hash, data.className, data.classSource, data.subclassName, data.subclassSource, null, false);
            sclsFeatureItem.markMancerDependency(new MancerDependencyLink(dependencyPath));
            System5e.tryAddToInventory(actor, sclsFeatureItem, this.isActivePassive(sclsFeatureItem), {doNotRender:true});
            return sclsFeatureItem;
        case "feat":
            //await Feat5e.verifySystemData(hash);
            let featItem = new Feat5e(hash, null, false); //TODO: apply ixFeatAbility
            //featItem.markMancerDependency(new MancerDependencyLink(dependencyPath));
            System5e.tryAddToInventory(actor, featItem, this.isActivePassive(featItem), {doNotRender:true});
            return featItem;
        default:
            console.error("Could not recognize entity type", type);
            return null;
        }
        
    }
    static isActivePassive(feature){
        if(feature.system.activation?.type){return "active";}
        return "passive";
    }
    static async addSpellItem(actor, hash, preparationMode, usagePeriod, maxUses, dependencyPath){
        hash = hash.replace("|", "_");
        const hashIncludesSource = hash.includes("_");
        const hashIncludesSuffix = hash.includes("#");
        let suffix;
        if(hashIncludesSuffix){
            const parts = hash.split("#");
            hash = parts[0]; suffix = parts[1];
        }
        if(!hashIncludesSource){
            const spell = CharacterBuilder.getEntityByProps("spell", {name:hash}, {caseInsensitive:true});
            hash = UrlUtil.URL_TO_HASH_GENERIC(spell).toLowerCase();
        }
        //Make sure hash doesn't include spaces
        if(hash.includes(" ")){hash = encodeURI(hash);}

        console.log("Add spell", hash, preparationMode);
        await Spell5e.verifySystemData(hash);
        let spellItem = new Spell5e(hash, null, false);
        //If spell is a cantrip, assume that anyone claiming it should be "known" mean it to be "prepared" (which means always prepared)
        if(spellItem.system.level == 0 && preparationMode == "known"){preparationMode = "prepared";}
        spellItem.system.preparationMode = preparationMode;
        if(maxUses != null){
          spellItem.system.uses.max = maxUses;
        }
        if(usagePeriod != null){
          spellItem.system.uses.per = usagePeriod;
        }
        //TODO: include usagePeriod, maxUses
        console.log("Added spell", spellItem);
        System5e.tryAddToInventory(actor, spellItem, "spell", {doNotRender:true});
        return spellItem;
    }
    static handleConditionals(conditionals, actor, updatePool){
      
        for(let cond of conditionals){
          //If this conditional has a condition, try to evaluate. If we fail, abort
          if(cond.condition != null)
          {
            console.log("Resolve", cond.condition, "on", actor);
            const func = new Function("actor", `return ${cond.condition}`);
            if(!func(actor)){continue;}
          }
          //Since we succeeded, look for a "mod" object, and the entries within
          for(let [modName, mod] of Object.entries(cond.mod ?? {})){
            const val = mod.value;
            console.log("apply mod", modName, mod, updatePool["senses.darkvision"], updatePool, updatePool["senses"]);
            switch(mod.mode.toLowerCase()){
              case "set": updatePool[modName] = val; break;
              case "add": updatePool[modName] = (updatePool[modName] ?? 0) + val; break;
              default: continue;
            }
          }
        }
    }

    static async _handleBackground(actor, choiceData, pool){
        for(let bg of choiceData.backgrounds){
            let bgItem = await addFeatureItem("background", bg.uid, bg.path);
            //updatePool["system.details.background"] = {name:bgItem.name};
            pool.set("system.details.background", {name:bgItem.name});
            this._handleSkillProperties(bg.skills);
            this._handleToolProperties(bg.languagesTools);
            pool.merge("traits.traits.languages.selected", bg.languages, "languageProficiencies");
            pool.merge("traits.traits.languages.selected", bg.languagesTools, "languageProficiencies");
        }
    }
    async _handleRace(actor, choiceData, pool){

    }

    _handleSkillProperties(forms, isExpertise=false){
        const pool = this.updatePool;
        const actor = this.actor;
        const skillNameToAbbr = (name) => {
            name = name.toLowerCase();
            for(let [key, value] of Object.entries(CONFIG.DND5E.skills)){
              if(value.label.toLowerCase() === name){return key;}
            }
            return null;
        }
    
        for(let form of forms??[]){
            for(let [skillName, profValue] of Object.entries(form.data[isExpertise? "expertise" : "skillProficiencies"]??{})){
                const skillAbbr = skillNameToAbbr(skillName);
                let skill = actor.skills[skillAbbr];
                if(skill.baseProf > profValue){continue;} //Do not try to overwrite a higher proficiency (replacing expertise with normal proficiency, for example)
                skill.baseProf = profValue;
                const newSkill = System5e.calcSkillEmbed(skill, actor.system.abilities, actor.system.attributes.prof);
                pool.set(`skills.${skillAbbr}`, newSkill);
            }
        }
    }
    handleToolProperties(forms, actor, pool){
        const toolNameToAbbr = (name) => {
            name = name.toLowerCase();
            for(let [key, value] of Object.entries(CONFIG.DND5E.tools)){
              if(value.label.toLowerCase() === name){return key;}
            }
            return null;
        }
          
        for(let form of forms){
            for(let [toolName, profValue] of Object.entries(form.data.toolProficiencies??{})){
                const toolAbbr = toolNameToAbbr(toolName);
                if(toolAbbr == null){console.error("Failed to find any tool with name", toolName);}
                let tool = actor.tools[toolAbbr];
                if(tool == null){console.error("Failed to find any tool with abbr", toolAbbr, actor.tools);}
                if(tool.baseProf > profValue){continue;} //Do not try to overwrite a higher proficiency (replacing expertise with normal proficiency, for example)
                tool.baseProf = profValue;
                const newTool = System5e.calcToolEmbed(tool, actor.system.attributes.prof);
                pool[`tools.${toolAbbr}`] = newTool;
            }
        }
    }

    static handleHitPoints(form, actor, updatePool){
        let hpFormula = form.data.hitPointsAtFirstLevel;
        let hpNum = Roll._evaluateSync(Roll.replaceFormulaData(hpFormula, actor.system));
        updatePool[`hp.value`] = hpNum;
        updatePool[`hp.max`] = hpNum;
        //updatePool["attributes.hd"] = ???
    }


    /**
     * Adds spells granted by subclass.additionalSpells.
     * Aborts if additionalSpells.length > 1, as that case should be handled by "foundrySubclassFeature" objects instead
     * @param {{additionalSpells:any[]}} subclass
     * @param {Actor} actor
     * @param {number} targetLevel
     */
    static async handleSubclassAdditionalSpells(subclass, actor, targetLevel){
        if(!subclass.additionalSpells){return;}
        //If our subclass has more than one additionalSpells object, it indicates that there is a choice to be made between different spell lists
        //We won't try to handle that choice here. It is better to handle that in a "foundrySubclassFeature" object in the class json instead, where we can be more specific
        if(subclass.additionalSpells.length > 1){ return; }

        const addSpell = async(hash, args) => {

          if(args.levelGained > targetLevel){return;}

          //a spell that ends in #c is a cantrip
          //you can also do #3 for a spell that is always cast at third level which happens on some races
          if(typeof hash == "object"){
            //This probably contains the "all" property
            console.error("Cannot handle ", hash); return;
          }
          else{
            let parts;
            try{parts = hash.split("#");}
            catch(e){console.error(e); console.log(hash);}
            if(parts.length > 1){hash = parts[0];}
            console.warn("TODO: make sure that this spell is upgraded to a higher level, unless it is a cantrip");
          }

          //Figure out what to do with the hashes
          //TODO: include usagePeriod, maxUses
          
          await this.addSpellItem(actor, hash, args.knownType, args.usagePeriod, args.maxUses);
        }
        const parseHashes = async(spellHashes, args, level=0) => {
          if(!Array.isArray(spellHashes)){
            if(typeof spellHashes == "object"){
              for(let [key, value] of Object.entries(spellHashes)){
                let newArgs = {};
                newArgs = Object.assign(newArgs, args);
                if(level == 0){
                  //Parse knowntype
                  newArgs.knownType = key;
                }
                else if(level == 1){
                  //Parse level learned
                  newArgs.levelGained = key;
                }
                else if(level == 2){
                  //parse usage per "daily/monthly,etc"
                  newArgs.usagePeriod = key;
                }
                else if(level == 3){
                  //Parse max usage
                  newArgs.maxUses = key;
                }
                else{
                  throw new Error("AdditionalSpells configuration too complicated");
                }
                
                parseHashes(value, newArgs, level+1); 
              }
            }
            else{
              throw new Error("Expected spellhashes to be type object");
            }
          }
          else{
            for(let hash of spellHashes){addSpell(hash, args);}
          }
        }

        for(let i = 0; i < subclass.additionalSpells.length; ++i){
            const choiceColumn = subclass.additionalSpells[i];
            await parseHashes(choiceColumn, {}, 0);
        }

        
    }
}

class ActorUpdatePool {
    mergeProps(path, forms, formsProp){

    }
    set(path, value){

    }
    get(path){

    }
}
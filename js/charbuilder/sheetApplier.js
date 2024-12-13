class SheetApplier {

    updatePool = {};
    constructor(actor, choiceData){
        this.actor = actor;
        this.choiceData = choiceData;
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
     * @param {object} dependencyPath not used at the moment
     * @param {object} data={} contains additional data such as className, classSource, subclassName, subclassSource
     * @returns {Feature5e}
     */
    static async addFeatureItem(actor, type, hash, dependencyPath, data={}) {
        //f.type should be either "optionalfeature"(lowercase spelling), "feat", "classFeature", or "subclassFeature"
        switch(type){
          case "optionalfeature":
            await OptionalFeature5e.verifySystemData(hash, actor);
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
            await Subclass5e.verifySystemData(actor, data.className, data.classSource, data.subclassName, data.subclassSource);
            let subclassItem = new Subclass5e(hash, data.className, data.classSource, null, false);
            //subclassItem.markMancerDependency(new MancerDependencyLink(dependencyPath));
            System5e.tryAddToInventory(actor, subclassItem, "class", {doNotRender:true});
            return subclassItem;
          case "background":
            await Background5e.verifySystemData(hash);
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
            await ClassFeature5e.verifySystemData(hash, actor, data.className, data.classSource);
            let clsFeatureItem = new ClassFeature5e(hash, data.className, data.classSource, null, false);
            clsFeatureItem.markMancerDependency(new MancerDependencyLink(dependencyPath));
            System5e.tryAddToInventory(actor, clsFeatureItem, this.isActivePassive(clsFeatureItem), {doNotRender:true});
            return clsFeatureItem;
          case "subclassFeature":
            await SubclassFeature5e.verifySystemData(actor, hash, data.className, data.classSource, data.subclassName, data.subclassSource);
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
    /**
     * Checks if feature is active or passive, based on feature.system.activation.type
     * @param {any} feature
     * @returns {string} "active" or "passive"
     */
    static isActivePassive(feature){
        if(feature.system.activation?.type){return "active";}
        return "passive";
    }
    /**
     * Adds a spell item to the character sheet
     * @param {Actor5e} actor
     * @param {string} hash
     * @param {string} preparationMode
     * @returns {Spell5e}
     */
    static async addSpellItem(actor, hash, preparationMode, isPrepared){
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
        if(hash.includes(" ") || hash.includes("/")){hash = encodeURIComponent(hash).toLowerCase();}

        console.log("Add spell", hash, preparationMode);
        await Spell5e.verifySystemData(hash);
        let spellItem = new Spell5e(hash, null, false);
        //If spell is a cantrip, assume that anyone claiming it should be "known" mean it to be "always" (which means always prepared)
        if(spellItem.system.level == 0 && preparationMode == "known"){preparationMode = "always"; isPrepared=true;}
        spellItem.system.preparationMode = preparationMode;
        spellItem.system.equipped = isPrepared;
        System5e.tryAddToInventory(actor, spellItem, "spell", {doNotRender:true});
        return spellItem;
    }
    static async addInventoryItem(actor, hash, quantity){
        if(typeof hash == "object"){ hash = UrlUtil.URL_TO_HASH_GENERIC(hash).toLowerCase(); }
        else{hash = hash.replace("|", "_");}
        if(hash.includes(" ") || hash.includes("/")){hash = encodeURIComponent(hash).toLowerCase();}
        let success = await Item5e.verifySystemData(hash);
        if(!success){return;}
        let item = new Item5e(hash, quantity, null);
        if(item.packContents != null && item.packContents.length > 0)
        {
            //Add pack contents instead
            for(let o of item.packContents){
                let quantity = 1;
                let subHash = o;
                if(typeof o == "object"){quantity = o.quantity; subHash = o.item;}
                await SheetApplier.addInventoryItem(actor, subHash, quantity);
            }
            return null;
        }
        System5e.tryAddToInventory(actor, item, "item", {doNotRender:true});
        return item;
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

    /**
     * Reads the hit point form and pushes updates to the update pool.
     * @param {{data:{hitPointsAtFirstLevel:string}}} form
     * @param {Actor5e} actor
     * @param {object} updatePool
     */
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

        for(let i = 0; i < subclass.additionalSpells.length; ++i){
            const choiceColumn = subclass.additionalSpells[i];
            for(let [knownType, value] of Object.entries(choiceColumn)){
                for(let [gainedAtLvl, spellHashes] of Object.entries(value)){
                    if(targetLevel < gainedAtLvl){continue;} //Must be high enough level
                    let preparationMode = knownType;
                    for(let hash of spellHashes){
                        await this.addSpellItem(actor, hash, preparationMode);
                    }
                }
            }
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
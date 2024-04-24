class ActorCharactermancerSheet extends ActorCharactermancerBaseComponent{
    
    /**
     * What to display on the sheet:
     * 
     * Character name
     * Class
     * Race
     * Size
     * Background - Just the name, right? So custom background is just "Custom Background", nothing else
     * Ability scores (and modifiers) - Not sure if we can get ability score improvements from items, feats (and maybe subclass features?) to work
     * Hit points - This needs CON modifier. Not sure if items, feats (and maybe subclass features?) can be considered
     * Speed - Should be pulled from race. Not sure if we can consider items, class features, feats etc
     * AC - Not sure if we can consider armor, features, items, etc. Unarmored defense?
     * Darkvision
     * Proficiency bonus
     * Inititative bonus - Not sure if we can consider items, class features, feats
     * Proficiencies - armor, weapons, tools, saves, skills
     * Passive proficiency
     * Languages
     * Skills (and their modifiers, with * for proficient, and ** for expertise) (what about half proficiency?)
     * Saves (modifiers, with * for proficient)
     * Encumberance (lift & carry)
     * Item list - (armor has AC in parenthesis) - then total weight
     * Coins + total weight
     * Spell list (known cantrips, lvl1, lvl2, etc. each category shows number of spell slots)
     * 
     * Things we probably can't display on the sheet:
     * 
     * Race features (too long, not sure what would be useful info)
     * Class features (too long, not sure what would be useful info)
     * Subclass features (too long, not sure what would be useful info)
     * Warlock pact magic
     * Battle master manouvers
     * Resistances (comes from items and subclass features, needs serious parsing)
     * Immunities
     * Vulnerabilities
     * Ranger pets
     * Druid shapes
     * Cleric channel divinity
     * Rogue sneak attack
     * Any mystic related stuff
     * Any artificer related stuff
     * Extra attacks
     * Ki points
     * 
    */

    /**
     * @param {{parent:CharacterBuilder}} parentInfo
     */
    constructor(parentInfo) {
        parentInfo = parentInfo || {};
        super();
        this._actor = parentInfo.actor;
        this._data = parentInfo.data; //data is an object containing information about all classes, subclasses, feats, etc
        this._parent = parentInfo.parent;
        this._tabSheet = parentInfo.tabSheet;
  
    }
    render(charInfo){
      ActorCharactermancerSheet.characterName = null;
      if(!!charInfo?.character?.about?.name?.length){ActorCharactermancerSheet.characterName = charInfo.character.about.name;}
      const tabSheet = this._tabSheet?.$wrpTab;
      if (!tabSheet) { return; }
      const wrapper = $$`<div class="ve-flex-col w-100 h-100 px-1 pt-1 overflow-y-auto ve-grow veapp__bg-foundry"></div>`;
      //const noFeatsWarningLbl = $("<div><i class=\"ve-muted\">No feats are available for your current build.</i><hr class=\"hr-1\"></div>").appendTo(wrapper);

      const sheet = $$`<div></div>`.appendTo(wrapper);

      const $form = $$`<form class="charsheet"></form>`;
      const $lblClass = $$`<label class="lblResult"></label>`;
      const $lblRace = $$`<label class="lblResult"/></label>`;
      const $lblBackground = $$`<label class="lblResult"/></label>`;
      const $inputName = $$`<label class="lblResultName"></label>`;
      const $inputAlignment = $$`<label class="lblResult"></label>`;
      

      const headerSection = $$`<header><section class="charname">
        <label for="charname">Character Name</label>${$inputName}
      </section>
      <section class="misc">
        <ul>
          <li>
            <label class="lblTitle">Class & Level</label>${$lblClass}
          </li>
          <li>
            <label  class="lblTitle">Background</label>${$lblBackground}
          </li>
          <li>
            <label  class="lblTitle">Race</label>${$lblRace}
          </li>
          <li>
            <label class="lblTitle">Alignment</label>${$inputAlignment}
          </li>
        </ul>
      </section>
      </header>`.appendTo($form);

      const $sectionAttributeScores = $$`<div class="scores"></div>`;
      const $lblProfBonus = $$`<label class ="lblProfScore">+2</label>`;
      const $lblPassivePerception = $$`<label class="score"></label>`;
      const $sectionSkills = $$`<ul></ul>`;
      const $lblArmorClass = $$`<label class="score"></label>`;
      const $lblInitiative = $$`<label class="score"></label>`;
      const $sectionSaves = $$`<ul></ul>`;
      const $lblSpeed = $$`<label class="score"></label>`;
      const $armorWornText = $$`<span></span>`;
      const $spanWeaponProf = $$`<span></span>`;
      const $spanArmorProf = $$`<span></span>`;
      const $spanToolsProf = $$`<span></span>`;
      const $spanLanguages = $$`<span></span>`;
      const $divFeatures = $$`<div class ="featureTextArea textbox"></div>`;
      const $divClassFeatures = $$`<div></div>`;
      const $divSubclassFeatures = $$`<div></div>`;
      const $divSpellAttackMod = $$`<div></div>`;
      const $divSpellDC = $$`<div class="mb10"></div>`;
      const $divSpells = $$`<div>${$divSpellAttackMod}${$divSpellDC}</div>`;
      const $divFeatFeatures = $$`<div></div>`;
      const $divBackgroundFeatures = $$`<div class="bkFeatures"></div>`;
      const $divEquipment = $$`<div class ="equipmentTextArea textbox"></div>`;
      const $attacksTextArea = $$`<div class ="attacksTextArea textbox"></div>`;
      const $lblMaxHP = $$`<label class="score"></label>`;
      const $lblHitDice = $$`<label class="scoreHitDice"></label>`;
      const $lblCoinage = $$`<span></span>`;
      const $divCarry = $$`<div class="textbox"></div>`;

      const mainSection = $$`<main>
    <section>
      <section class="attributes">
        ${$sectionAttributeScores}
        <div class="attr-applications">
          <div class="proficiencybonus box">
            <div class="label-container">
              <label class="upperCase">Proficiency Bonus</label>
            </div>
            ${$lblProfBonus}
          </div>
          <div class="saves list-section box">
            ${$sectionSaves}
            <div class="label">
              Saving Throws
            </div>
          </div>
          <div class="skills list-section box">
            ${$sectionSkills}
            <div class="label">Skills</div>
          </div>
        </div>
      </section>
      <div class="passive-perception box">
        <div class="label-container">
          <label class="upperCase">Passive Wisdom (Perception)</label>
        </div>
        ${$lblPassivePerception}
      </div>
      <div class="otherprofs box textblock">
        <label class="footerLabel upperCase">Other Proficiencies and Languages</label>
        <div class="profTextArea textbox">
          <div><b>Armor: </b>${$spanArmorProf}</div>
          <div><b>Weapons: </b>${$spanWeaponProf}</div>
          <div><b>Tools: </b>${$spanToolsProf}</div>
          <div><b>Languages: </b>${$spanLanguages}</div>
        </div>
      </div>
    </section>
    <section>
      <section class="combat">
        <div class="scoreBubble">
          <div>
            <label class="title upperCase">Armor Class</label>${$lblArmorClass}
          </div>
        </div>
        <div class="scoreBubble">
          <div>
            <label class="title upperCase">Initiative</label>${$lblInitiative}
          </div>
        </div>
        <div class="scoreBubble">
          <div>
            <label class="title upperCase">Speed</label>${$lblSpeed}
          </div>
        </div>
        <div class="armorWornText"><b>Armor worn: </b>${$armorWornText}</div>
        <div class="scoreBubbleWide">
          <div>
            <label class="title upperCase">Max HP</label>${$lblMaxHP}
          </div>
        </div>
        <div class="scoreBubbleWide">
          <div>
            <label class="title upperCase">Hit Dice</label>${$lblHitDice}
          </div>
        </div>
      </section>
      <section class="attacksandspellcasting">
        <div>
          <label class="upperCase">Attacks</label>
          ${$attacksTextArea}
        </div>
      </section>
      <section class="equipment">
        <div>
          <label class="upperCase">Equipment</label>
          ${$divEquipment}
          <div class="coinage"><b>Currency: </b>${$lblCoinage}</div>
        </div>
      </section>
      
      ${$divCarry}
    </section>
    <section>
      <section class="features">
        <div>
          <label class="upperCase">Features & Traits</label>
          <div class ="featureTextArea textbox">
          ${$divBackgroundFeatures}
          ${$divClassFeatures}
          ${$divSubclassFeatures}
          ${$divFeatFeatures}
          </div>
        </div>
      </section>
      <section class="spells">
        <div>
          <label class="upperCase">Spells</label>
          <div class ="spellsTextArea textbox">
          ${$divSpells}
          </div>
        </div>
      </section>
    </section>
      </main>`;
      mainSection.appendTo($form);

      $form.appendTo(sheet);


      const $wrpDisplay = $(`<div class="ve-flex-col min-h-0 ve-small"></div>`).appendTo(wrapper);

      //#region Class
      //When class changes, redraw the elements
      const hkClass = () => {
          $divClassFeatures.empty();
          $divSubclassFeatures.empty();
          $lblProfBonus.text("+2"); //Default, even for lvl 0 characters
          let classData = ActorCharactermancerSheet.getClassData(this._parent.compClass);
          //If there are no classes selected, just print none and return
          let textOut = "";
          if(!classData?.length){ $lblClass.html(textOut); return; }
          for(let i = 0; i < classData.length; ++i){
              const d = classData[i];
              if(d.isDeleted){continue;}
              textOut += `${textOut.length > 0? " / " : ""}${d.cls.name} ${d.targetLevel}${d.sc? ` (${d.sc.name})` : ""}`;
              //Try to get features from class
              let classFeaturesText = "";

              const tryPrintFeature = (feature, text, bannedFeatureNames=[], bannedLoadedsNames=[]) => {
                if(feature.level > d.targetLevel){return text;}
                let drawParentFeature = true;
                for(let l of feature.loadeds){
                  if(l.type=="optionalfeature" && !l.isRequiredOption){continue;}
                  drawParentFeature = false;
                  if(bannedLoadedsNames.includes(l.entity.name)){continue;}
                  if(l.entity.level > d.targetLevel){continue;} //Must not be from a higher level than we are
                  text += `${text.length > 0? ", " : ""}${l.entity.name}`;
                }
                if(!drawParentFeature || bannedFeatureNames.includes(feature.name)){return text;}
                text += `${text.length > 0? ", " : ""}${feature.name}`;
                return text;
              }
              
              for(let f of d.cls.classFeatures){
                classFeaturesText = tryPrintFeature(f, classFeaturesText);
              }
              if(classFeaturesText.length > 0){
                $$`<div><b>${d.cls.name} Class Features:</b></div>`.appendTo($divClassFeatures);
                $$`<div>${classFeaturesText}</div>`.appendTo($divClassFeatures);
              }

              if(d.sc){
                let subclassFeaturesText = "";
                for(let f of d.sc.subclassFeatures){
                  //Do not print subclass features named after the subclass (normally the first feature)
                  
                  subclassFeaturesText = tryPrintFeature(f, subclassFeaturesText, [d.sc.name], [d.sc.name]);
                }
                if(subclassFeaturesText.length > 0){
                  $$`<div><b>${d.sc.name} Subclass Features:</b></div>`.appendTo($divSubclassFeatures);
                  $$`<div>${subclassFeaturesText}</div>`.appendTo($divSubclassFeatures);
                }
                
              }
          }
          $lblClass.html(textOut);

          //Calculate proficiency bonus
          const profBonus = this._getProfBonus(this._parent.compClass);
          $lblProfBonus.text(`${(profBonus > 0? "+":"")}${profBonus}`);
      };
      //We need some hooks to redraw class info
      this._parent.compClass.addHookBase("class_ixPrimaryClass", hkClass);
      this._parent.compClass.addHookBase("class_ixMax", hkClass); 
      this._parent.compClass.addHookBase("class_totalLevels", hkClass);
      this._parent.compClass.addHookBase("class_pulseChange", hkClass); //This also senses when subclass is changed
      hkClass();
      //#endregion

      //#region Race
      //When race version changes, redraw the elements
      const hkRace = () => {
          let curRace = this.getRace_();
          const n = curRace? curRace.name : "None";
          $lblRace.text(n);
      };
      this._parent.compRace.addHookBase("race_ixRace_version", hkRace);
      hkRace();
      //#endregion
      
      //#region Background
      const hkBackground = () => {
          $divBackgroundFeatures.empty();
          let curBackground = this.getBackground();
          const n = curBackground? curBackground.name : "None";
          $lblBackground.text(n);

          //Lets also do some info for the personalities, ideals, bonds and flaws
          if(!curBackground){return;}
          $$`<div><b>${curBackground.name} Background:</b></div>`.appendTo($divBackgroundFeatures);
          //Get feature from background
          let foundFeature = "";
          for(let i = 0; i < curBackground.entries.length && foundFeature.length < 1; ++i){
            let e = curBackground.entries[i];
            if(e.type=="entries" && e.name.startsWith("Feature: ")){
              foundFeature = e.name.substr(("Feature: ").length);
            }
          }
          let list = $$`<ul></ul>`;
          if(foundFeature){
            $$`<li><div><b>Feature: </b>${foundFeature}</div></li>`.appendTo(list);
          }
          list.appendTo($divBackgroundFeatures);
          let characteristics = this.getBackgroundChoices();
          let bonds = [];
          let flaws = [];
          let ideals = [];
          let personalityTraits = [];
          for(let key of Object.keys(characteristics)){
            const val = characteristics[key];
            if(!val){continue;}
            key = key.toLowerCase();
            if(key.startsWith("bond")){bonds.push(val);}
            else if(key.startsWith("flaw")){flaws.push(val);}
            else if(key.startsWith("ideal")){ideals.push(val);}
            else if(key.startsWith("personalitytrait")){personalityTraits.push(val);}
          }

          const createSubElements = (strings, title) => {
            let firstString = "";
            let subElements = [];
            for(let s of strings){
              if(firstString.length<1){
                firstString = s;
              }
              else{
                subElements.push($$`<div class="ml10">${s}</div>`);
              }
            }

            const mainElement = $$`<div><b>${title}</b>${firstString}</div>`;
            for(let sub of subElements){mainElement.append(sub);}
            return $$`<li>${mainElement}</li>`;
          }
          if(personalityTraits.length>0){
            createSubElements(personalityTraits, `Trait${personalityTraits.length>1?"s":""}: `).appendTo(list);
          }
          if(ideals.length > 0){
            createSubElements(ideals, `Ideal${ideals.length>1?"s":""}: `).appendTo(list);
          }
          if(bonds.length > 0){
            createSubElements(bonds, `Bond${bonds.length>1?"s":""}: `).appendTo(list);
          }
          if(flaws.length > 0){
            createSubElements(flaws, `Flaw${flaws.length>1?"s":""}: `).appendTo(list);
          }
      };
      this._parent.compBackground.addHookBase("background_pulseBackground", hkBackground);
      hkBackground();
      //#endregion

      //#region Ability Scores
      const hkAbilities = () => {
          let totals = this.test_grabAbilityScoreTotals(this._parent.compAbility);


          //NEW UI STUFF
          const createAbilityScoreElement = (label, score) => {
              const modifier = Math.floor((score-10) / 2);
              return $$`<li>
              <div class="score">
                <label class="ablName upperCase">${label}</label><label class="stat"/>${score}</label>
              </div>
              <div class="modifier">
                <label class="statmod"/>${modifier>=0?"+"+modifier : modifier}</label>
              </div>
            </li>`;
          }
          $sectionAttributeScores.empty();
          const ul = $$`<ul></ul>`;
          ul.append(createAbilityScoreElement("Strength", totals.values.str));
          ul.append(createAbilityScoreElement("Dexterity", totals.values.dex));
          ul.append(createAbilityScoreElement("Constitution", totals.values.con));
          ul.append(createAbilityScoreElement("Wisdom", totals.values.wis,));
          ul.append(createAbilityScoreElement("Intelligence", totals.values.int));
          ul.append(createAbilityScoreElement("Charisma", totals.values.cha));
          ul.appendTo($sectionAttributeScores);

          //Calculate saving throws
          let saves = this._grabSavingThrowProficiencies();
          const createSavingThrowElement = (label, attr, totals, proficiencies, profBonus) => {

              const isProficient = !!proficiencies[attr];
              const modifier = this._getAbilityModifier(attr, totals.values[attr]) + (isProficient? profBonus : 0);
              const checkbox = $$`<input type="checkbox"></input>`;

              let iconClass = "fa-regular fa-circle";
              if(isProficient){iconClass = "fas fa-fw fa-check";}
              //else if(isExpertised){iconClass = "fas fa-fw fa-check-double";}
              const icon = $$`<i class="${iconClass} ptb2"></i>`;

              return $$`<li>
                  <label>${label}</label>
                  <label class="modifier">${modifier>=0?"+"+modifier : modifier}</label>
                  ${icon}
              </li>`;
          }

          const profBonus = this._getProfBonus(this._parent.compClass);
          $sectionSaves.empty();
          $sectionSaves.append(createSavingThrowElement("Strength", "str", totals, saves, profBonus));
          $sectionSaves.append(createSavingThrowElement("Dexterity", "dex", totals, saves, profBonus));
          $sectionSaves.append(createSavingThrowElement("Constitution", "con", totals, saves, profBonus));
          $sectionSaves.append(createSavingThrowElement("Wisdom",  "wis", totals, saves, profBonus));
          $sectionSaves.append(createSavingThrowElement("Intelligence",  "int", totals, saves, profBonus));
          $sectionSaves.append(createSavingThrowElement("Charisma",  "cha", totals, saves, profBonus));
      };
      this._parent.compAbility.compStatgen.addHookBase("common_export_str", hkAbilities);
      this._parent.compAbility.compStatgen.addHookBase("common_export_dex", hkAbilities);
      this._parent.compAbility.compStatgen.addHookBase("common_export_con", hkAbilities);
      this._parent.compAbility.compStatgen.addHookBase("common_export_int", hkAbilities);
      this._parent.compAbility.compStatgen.addHookBase("common_export_wis", hkAbilities);
      this._parent.compAbility.compStatgen.addHookBase("common_export_cha", hkAbilities);
      this._parent.compAbility.compStatgen.addHookBase("common_pulseAsi", hkAbilities);
      hkAbilities();
      //#endregion

      //#region HP, Speed, Initiative
      const hkHpSpeed = () => {
          //Let's try to estimate HP
          //Grab constitution score
          const conMod = this._getAbilityModifier("con");
          const dexMod = this._getAbilityModifier("dex");
          //Grab HP increase mode from class component (from each of the classes!)
          const classList = ActorCharactermancerSheet.getClassData(this._parent.compClass);
          let hpTotal = 0; //Calculate max
          let levelTotal = 0;
          let hitDiceInfo = {};
          for(let ix = 0; ix < classList.length; ++ix){
              const data = classList[ix];
              if(!data.cls){continue;}
              //A problem is we dont know what hp increase mode the class is using when a class is first picked (and this hook fires)
              //This is because the components that handle that choice arent built yet
              //So we will need a backup
              let hpMode = -1; let customFormula = "";
              const hpModeComp = this._parent.compClass._compsClassHpIncreaseMode[ix];
              const hpInfoComp = this._parent.compClass._compsClassHpInfo[ix];
              const targetLevel = data.targetLevel || 1;
              
              if(hpModeComp && hpInfoComp){
                  const formData = hpModeComp.pGetFormData();
                  if(formData.isFormComplete){
                      hpMode = formData.data.mode;
                      customFormula = formData.data.formula;
                  }
              }
              if(hpMode<0){ //Fallback
                  hpMode = Config.get("importClass", "hpIncreaseMode") ?? ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__TAKE_AVERAGE;
                  customFormula = Config.get("importClass", "hpIncreaseModeCustomRollFormula") ?? "(2 * @hd.number)d(@hd.faces / 2)";
              }
              
              const hp = ActorCharactermancerSheet.calcHitPointsAtLevel(data.cls.hd.number, data.cls.hd.faces, targetLevel, hpMode, customFormula);
              hpTotal += hp;
              levelTotal += targetLevel;

              if(!hitDiceInfo[data.cls.hd.faces]){
                hitDiceInfo[data.cls.hd.faces] = data.cls.hd.number;
              }
              else{
                hitDiceInfo[data.cls.hd.faces] += data.cls.hd.number;
              }
          }

          hpTotal += (conMod * levelTotal);

          $lblMaxHP.text(hpTotal);
          $lblHitDice.empty();
          for(let diceSize of Object.keys(hitDiceInfo)){
            let str = hitDiceInfo[diceSize]+"d"+diceSize;
            $$`<div>${str}</div>`.appendTo($lblHitDice);
          }


          const scoreInitiative = dexMod;
          $lblInitiative.html(`${scoreInitiative>=0?"+"+scoreInitiative : scoreInitiative}`);

          const speedFt = 30;
          $lblSpeed.html(`${speedFt}`);
      };
      this._parent.compClass.addHookBase("class_ixMax", hkHpSpeed); 
      this._parent.compClass.addHookBase("class_totalLevels", hkHpSpeed);
      this._parent.compAbility.compStatgen.addHookBase("common_export_con", hkHpSpeed);
      this._parent.compAbility.compStatgen.addHookBase("common_export_dex", hkHpSpeed);
      this._parent.compClass.addHookBase("class_pulseChange", hkHpSpeed);
      //needs a hook here in case any of the classes change their HP mode
      hkHpSpeed();
      //#endregion

      //#region Proficiencies
      //#region Skills
      const hkSkills = () => {
          $sectionSkills.empty();
          //We need to get the proficiency bonus, which is based upon combined class levels
          const profBonus = this._getProfBonus(this._parent.compClass);
          //We now need to get the names of all skill proficiencies
          const proficientSkills = this._grabSkillProficiencies();
          const allSkillNames = Parser.SKILL_TO_ATB_ABV;
          for(let skillName of Object.keys(allSkillNames)){
              //Get the modifier for the ability score
              let score = this._getAbilityModifier(Parser.SKILL_TO_ATB_ABV[skillName]);
              //Get proficiency / expertise if we are proficient in the skill
              let iconClass = "fa-regular fa-circle";
              if(proficientSkills[skillName] == 1){score += profBonus; iconClass = "fas fa-fw fa-check";}
              else if(proficientSkills[skillName] == 2){score += (profBonus * 2); iconClass = "fas fa-fw fa-check-double";}
              const icon = $$`<i class="${iconClass} ptb2"></i>`;
              
              $$`<li>
              <label for="Acrobatics">${skillName} <span class="skill">(${Parser.SKILL_TO_ATB_ABV[skillName]})</span></label>
              <label class="modifier">${score>=0?"+"+score : score}</label>${icon}
              </li>`.appendTo($sectionSkills);

              if(skillName.toLowerCase() == "perception"){
                $lblPassivePerception.text(`${(10 + score)}`);
              }
          }
      }
      this._parent.compAbility.compStatgen.addHookBase("common_export_str", hkSkills);
      this._parent.compAbility.compStatgen.addHookBase("common_export_dex", hkSkills);
      this._parent.compAbility.compStatgen.addHookBase("common_export_con", hkSkills);
      this._parent.compAbility.compStatgen.addHookBase("common_export_int", hkSkills);
      this._parent.compAbility.compStatgen.addHookBase("common_export_wis", hkSkills);
      this._parent.compAbility.compStatgen.addHookBase("common_export_cha", hkSkills);
      //We need a hook here to understand when proficiencies are lost/gained, and when we level up
      //We can listen to feature source tracker for a pulse regarding skill proficiencies
      this._parent.featureSourceTracker_._addHookBase("pulseSkillProficiencies", hkSkills);
      this._parent.compClass.addHookBase("class_totalLevels", hkSkills);
      hkSkills();
      //#endregion

      //#region Tools
      const hkTools = () => {
          $spanToolsProf.text("");
          //We now need to get the names of all tool proficiencies
          const proficientTools = this._grabToolProficiencies();
          let outStr = "";
          for(let toolName of Object.keys(proficientTools)){
              outStr += outStr.length>0? ", " : "";
              outStr += toolName;
          }
          $spanToolsProf.text(outStr);
      }
      //We need a hook here to understand when proficiencies are lost/gained, and when we level up
      //We can listen to feature source tracker for a pulse regarding skill proficiencies
      this._parent.featureSourceTracker_._addHookBase("pulseToolsProficiencies", hkTools);
      this._parent.compClass.addHookBase("class_totalLevels", hkTools);
      hkTools();
      //#endregion
      //#region Weapons
      const hkWeaponsArmor = () => {
          $spanWeaponProf.text("");
          $spanArmorProf.text("");
          let outStrWep = "";
          let outStrArm = "";
          //We now need to get the names of all tool proficiencies
          const weapons = this._grabWeaponProficiencies();
          for(let name of Object.keys(weapons)){
              outStrWep += outStrWep.length>0? ", " : "";
              outStrWep += name;
          }
          const armors = this._grabArmorProficiencies();
          for(let name of Object.keys(armors)){
              outStrArm += outStrArm.length>0? ", " : "";
              outStrArm += name;
          }
          $spanWeaponProf.text(outStrWep);
          $spanArmorProf.text(outStrArm);
      }
      //We need a hook here to understand when proficiencies are lost/gained, and when we level up
      //We can listen to feature source tracker for a pulse regarding skill proficiencies
      this._parent.featureSourceTracker_._addHookBase("pulseToolsProficiencies", hkWeaponsArmor);
      this._parent.compClass.addHookBase("class_totalLevels", hkWeaponsArmor);
      hkWeaponsArmor();
      //#endregion
      //#region Language
      const hkLanguages = () => {
          $spanLanguages.text("");
          let outStr = "";
          const languages = this._grabLanguageProficiencies();
          for(let name of Object.keys(languages)){
              outStr += outStr.length>0? ", " : "";
              outStr += name;
          }
          $spanLanguages.text(outStr);
      }
      this._parent.featureSourceTracker_._addHookBase("pulseLanguageProficiencies", hkLanguages);
      this._parent.compClass.addHookBase("class_totalLevels", hkLanguages);
      hkLanguages();
      //#endregion
      //#region Saving Throws
      //#endregion
      //#endregion

      //#region Attacks
      const hkCalcAttacks = () => {
        this._getOurItems().then(result => {
          $attacksTextArea.empty();
          //Try to fill in weapon attacks
          const weaponProfs = this._grabWeaponProficiencies();
          const strMod = this._getAbilityModifier("str");
          const dexMod = this._getAbilityModifier("dex");
          const profBonus = this._getProfBonus();
          const calcMeleeAttack = (it, strMod, dexMod, weaponProfs) => {
            const isProficient = !!weaponProfs[it.item.weaponCategory.toLowerCase()];
            const attr = (it.item.property?.includes("F") && dexMod > strMod)? dexMod : strMod; //If weapon is finesse and our dex is better, use dex
            const toHit = attr + (isProficient? profBonus : 0);
            const dmg = it.item.dmg1 + (attr>=0? "+" : "") + attr.toString();
            return {toHit:(toHit>=0? "+" : "")+toHit.toString(), dmg:dmg, dmgType:it.item.dmgType};
          }
          const calcRangedAttack = (it, strMod, dexMod, weaponProfs) => {
            const isProficient = !!weaponProfs[it.item.weaponCategory.toLowerCase()];
            const attr = dexMod; //For now, always assume all ranged weapons use dex
            const toHit = attr + (isProficient? profBonus : 0);
            const dmg = it.item.dmg1 + (attr>=0? "+" : "") + attr.toString();
            return {toHit:(toHit>=0? "+" : "")+toHit.toString(), dmg:dmg, dmgType:it.item.dmgType};
          }
          const printWeaponAttack = (it) => {
            const isMeleeWeapon = it.item._typeListText.includes("melee weapon");
            const isRangedWeapon = it.item._typeListText.includes("ranged weapon");
            const isMeleeAndThrown = isMeleeWeapon && it.item.property?.includes("T");
            if(!isMeleeWeapon && !isRangedWeapon){console.error("weapon type not recognized:", it.item, it.item._typeListText);}

            if(isMeleeWeapon){
              const result = calcMeleeAttack(it, strMod, dexMod, weaponProfs);
              let str = `<i>Melee Weapon Attack</i>, ${result.toHit} to hit, ${result.dmg} ${Parser.dmgTypeToFull(result.dmgType)}.`;
              $$`<div><b>${it.item.name}.</b> ${str}</div>`.appendTo($attacksTextArea);
            }
            else if(isRangedWeapon){
              const result = calcRangedAttack(it, strMod, dexMod, weaponProfs);
              let str = `<i>Ranged Weapon Attack</i>, Range ${it.item.range} ft, ${result.toHit} to hit, ${result.dmg} ${Parser.dmgTypeToFull(result.dmgType)}.`;
              $$`<div><b>${it.item.name}.</b> ${str}</div>`.appendTo($attacksTextArea);
            }
            if(isMeleeAndThrown && !isRangedWeapon){
              const result = calcRangedAttack(it, strMod, dexMod, weaponProfs);
              let str = `<i>Ranged Weapon Attack</i>, Range ${it.item.range} ft, ${result.toHit} to hit, ${result.dmg} ${Parser.dmgTypeToFull(result.dmgType)}.`;
              $$`<div><b>${it.item.name} (Thrown).</b> ${str}</div>`.appendTo($attacksTextArea);
            }
          }

          for(let it of result.startingItems){
            if(!it.item.weapon){continue;}
            printWeaponAttack(it);
          }
          for(let it of result.boughtItems){
            if(!it.item.weapon){continue;}
            printWeaponAttack(it);
            
          }
          
        //TODO: cantrip attacks
        //Get cantrips
        //const cantrips = ActorCharactermancerSheet.getAllSpellsKnown(this._parent.compSpell)[0];
        });
      }
      this._parent.compEquipment._compEquipmentShopGold._addHookBase("itemPurchases", hkCalcAttacks);
      this._parent.compEquipment._compEquipmentCurrency._addHookBase("cpRolled", hkCalcAttacks);
      this._parent.compEquipment._compEquipmentStartingDefault._addHookBase("defaultItemPulse", hkCalcAttacks);
      this._parent.compAbility.compStatgen.addHookBase("common_export_str", hkCalcAttacks);
      this._parent.compAbility.compStatgen.addHookBase("common_export_dex", hkCalcAttacks);
      
      hkCalcAttacks();
      //#endregion

      //#region Spells

      const hkSpells = () => {
          $divSpells.empty();
          $divSpells.append($divSpellAttackMod);
          $divSpells.append($divSpellDC);
          
          const spellsListStr = (spells) => {
            let spellsStr = "";
            for(let i = 0; i < spells.length; ++i){
              let uid = spells[i].name.toLowerCase() + "|" + spells[i].source.toLowerCase();
              //spellsStr += spells[i].name;
              spellsStr += Renderer.get().render(`{@spell ${uid}}`);
                if(i+1 < spells.length){spellsStr += ", ";}
            }
            return spellsStr;
          };

          
          
          const spellsKnownByLvl = ActorCharactermancerSheet.getAllSpellsKnown(this._parent.compSpell);
          //List cantrips known (these never change)
          $$`<div class="mb10"><b>Cantrips Known: </b><i>${spellsListStr(spellsKnownByLvl[0])}</i></div>`.appendTo($divSpells);
          //Add a bit of a spacing here

          $$`<div><b>Prepared Spells</b></div>`.appendTo($divSpells);
          for(let lvl = 1; lvl < spellsKnownByLvl.length; ++lvl){
              const knownSpellsAtLvl = spellsKnownByLvl[lvl] || null;
              if(!knownSpellsAtLvl || !knownSpellsAtLvl.length){continue;}
              let str = "Cantrips";
              switch(lvl){
                  case 0: str = "Cantrips"; break;
                  case 1: str = "1st Level"; break;
                  case 2: str = "2nd Level"; break;
                  case 3: str = "3rd Level"; break;
                  case 4: str = "4th Level"; break;
                  case 5: str = "5th Level"; break;
                  case 6: str = "6th Level"; break;
                  case 7: str = "7th Level"; break;
                  case 8: str = "8th Level"; break;
                  case 9: str = "9th Level"; break;
                  default: throw new Error("Unimplemented!"); break;
              }
              const slots = ActorCharactermancerSheet.getSpellSlotsAtLvl(lvl, this._parent.compClass);
              $$`<div class="mb10">${str} (${slots} slots): <i>${spellsListStr(knownSpellsAtLvl)}</i></div>`.appendTo($divSpells);
          }

          hkCalcAttacks(); //Calculate attacks as well, since it displays cantrip attacks
      };
      this._parent.compSpell.addHookBase("pulsePreparedLearned", hkSpells);
      this._parent.compSpell.addHookBase("pulseAlwaysPrepared", hkSpells);
      this._parent.compSpell.addHookBase("pulseAlwaysKnown", hkSpells);
      this._parent.compSpell.addHookBase("pulseExpandedSpells", hkSpells); //Not sure if this one is needed
      hkSpells();

      const hkSpellDC = () => {
        $divSpellAttackMod.empty();
        $divSpellDC.empty();
        //Show spellcasting modifier (prof bonus + ability modifier (differs between classes))
        //Look through each class
        let classData = ActorCharactermancerSheet.getClassData(this._parent.compClass);
        let bestAbilityAbv = "";
        let bestAbilityScore = -100;
        const profBonus = this._getProfBonus();
        for(let d of classData){;
          if(d?.cls?.spellcastingAbility){
            let score = this._getAbilityModifier(d.cls.spellcastingAbility);
            if(score > bestAbilityScore){bestAbilityScore = score; bestAbilityAbv = d.cls.spellcastingAbility;}
          }
        }
        if(bestAbilityAbv.length<1){bestAbilityScore = 0;}
        bestAbilityScore += profBonus;
        $$`<b>Spell Attack Modifier: ${(bestAbilityScore>=0?"+":"")}${bestAbilityScore}</b>`.appendTo($divSpellAttackMod);
        //Show spell save DC
        bestAbilityScore += 8;
        $$`<div class="mb10"><b>Spell Save DC ${bestAbilityScore}</b>`.appendTo($divSpellDC);
      }
      this._parent.compAbility.compStatgen.addHookBase("common_export_str", hkSpellDC);
      this._parent.compAbility.compStatgen.addHookBase("common_export_dex", hkSpellDC);
      this._parent.compAbility.compStatgen.addHookBase("common_export_con", hkSpellDC);
      this._parent.compAbility.compStatgen.addHookBase("common_export_int", hkSpellDC);
      this._parent.compAbility.compStatgen.addHookBase("common_export_wis", hkSpellDC);
      this._parent.compAbility.compStatgen.addHookBase("common_export_cha", hkSpellDC);
      this._parent.compAbility.compStatgen.addHookBase("common_pulseAsi", hkSpellDC);
      this._parent.compClass.addHookBase("class_totalLevels", hkSpellDC);
      //#endregion

      //#region Equipment
      const hkEquipment = () => {

        const strScore = this._getAbilityScore("str");

          this._calcArmorClass().then(result=>{
              const str = `AC: ${result.ac} (${result.name})`;
              $lblArmorClass.text(result.ac);
              $armorWornText.text(result.name);
          });

          //Fill UI list of items
          $divEquipment.empty();
          $divCarry.empty();
          
          //Calculate currency
          const currency = this._getRemainingCoinage();
          $lblCoinage.text(`${currency.gold}gp, ${currency.silver}sp, ${currency.copper}cp`);

          
          let coinWeight = (currency.gold + currency.silver + currency.copper) * (1/50); //50 coins weigh 1 lbs
          let weightLbs = 0;

          this._getOurItems().then(result => {
            $divEquipment.empty();
            $divCarry.empty();
            let outStr = "";
            for(let it of result.startingItems){
              outStr += (outStr.length>0? ", " : "") + (it.quantity>1? it.quantity+"x " : "") + it.item.name;
              if(!it.item.weight){continue;}
              weightLbs += (it.item.weight * it.quantity);
            }
            for(let it of result.boughtItems){
              outStr += (outStr.length>0? ", " : "") + (it.quantity>1? it.quantity+"x " : "") + it.item.name;
              if(!it.item.weight){continue;}
              weightLbs += (it.item.weight * it.quantity);
            }
            const span = $$`<span>${outStr}</span>`;
            $$`<label><b>Carried Gear: </b>${span}</label>`.appendTo($divEquipment);

            //Print carrying capacity info
            const USE_COIN_WEIGHT = true;
            const USE_VARIANT_ENCUMBERANCE = true;
            if(USE_COIN_WEIGHT){weightLbs += coinWeight;}
            const size = this.getCharacterSize().toUpperCase();
            const sizeModifier = size == "T"? 1/4 : size == "S"? 1/2 : size == "M"? 1 :
              size == "L"? 2 : size == "H"? 4 : size == "G"? 8 : 1; //fallback is 1
            const pushDragLiftCapacity = strScore * 30 * sizeModifier;
            const carryCapacityMax = strScore * 15 * sizeModifier;
            const carryCapacityEncumberance = strScore * 5 * sizeModifier;
            const carryCapacityHeavyEncumberance = strScore * 10 * sizeModifier;
            let encumberanceText = "";
            if(USE_VARIANT_ENCUMBERANCE){
              if(weightLbs >= carryCapacityHeavyEncumberance){encumberanceText =
                " (heavily encumbered: -20ft speed, disadv. on ability checks, attacks, and saves that use STR, DEX or CON)";}
              if(weightLbs >= carryCapacityEncumberance){encumberanceText =
                " (heavily encumbered: -5ft speed)";}
                $$`<label><b>Carrying Capacity: </b>${carryCapacityMax} lbs. (max), ${carryCapacityEncumberance} lbs. (light enc), ${carryCapacityHeavyEncumberance} lbs. (heavy enc.)</label>`.appendTo($divCarry);
            }
            else{
              $$`<div><label><b>Carrying Capacity: </b>${carryCapacityMax} lbs.</label></div>`.appendTo($divCarry);
            }
            $$`<div><label><b>Carried Weight: </b>${weightLbs} lbs.${USE_COIN_WEIGHT? " (coins included)":""}</label></div>`.appendTo($divCarry);
            $$`<div><label><b>Lifting, Pushing & Dragging: </b>${pushDragLiftCapacity} lbs.</label></div>`.appendTo($divCarry);
          });

          
      }
      this._parent.compRace.addHookBase("race_ixRace_version", hkEquipment); //needed to refresh race size, which impacts carrying capacity
      this._parent.compRace.addHookBase("pulseSize", hkEquipment); //needed to refresh race size, which impacts carrying capacity
      this._parent.compEquipment._compEquipmentCurrency._addHookBase("cpRolled", hkEquipment);
      this._parent.compEquipment._compEquipmentShopGold._addHookBase("itemPurchases", hkEquipment);
      this._parent.compEquipment._compEquipmentStartingDefault._addHookBase("defaultItemPulse", hkEquipment);
      this._parent.compAbility.compStatgen.addHookBase("common_export_str", hkEquipment);
      this._parent.compAbility.compStatgen.addHookBase("common_export_dex", hkEquipment);
      this._parent.compAbility.compStatgen.addHookBase("common_export_cha", hkEquipment);
      hkEquipment();
      //#endregion

      //#region Feats
      const hkFeats = () => {
        $divFeatFeatures.empty();
        //We need to get all our feats somehow
        let featInfo = this._getFeats();
        
        let featsText = "";
        for(let asiFeat of featInfo.asiFeats){
          featsText += (featsText.length>0? ", " : "") + asiFeat.feat.name;
        }

        const race = this.getRace_();
        if(race != null){
          for(let raceFeat of featInfo.raceFeats){
            featsText += (featsText.length>0? ", " : "") + raceFeat.feat.name;
            // + ` (${race.name})`;
          }
        }

        const bk = this.getBackground();
        for(let bkFeat of featInfo.backgroundFeats){
          featsText += (featsText.length>0? ", " : "") + bkFeat.feat.name;
          // + ` (${bk.name})`;
        }

        for(let customFeat of featInfo.customFeats){
          featsText += (featsText.length>0? ", " : "") + customFeat.feat.name;
          // + ` (${bk.name})`;
        }
        if(featsText.length<1){return;}
        $$`<div><b>Feats:</b></div>`.appendTo($divFeatFeatures);
        $$`<div>${featsText}</div>`.appendTo($divFeatFeatures);
      }
      this._parent.compClass.addHookBase("class_ixPrimaryClass", hkFeats);
      this._parent.compClass.addHookBase("class_ixMax", hkFeats); 
      this._parent.compClass.addHookBase("class_totalLevels", hkFeats);
      this._parent.compClass.addHookBase("class_pulseChange", hkFeats); //This also senses when subclass is changed
      this._parent.compAbility.compStatgen.addHookBase("common_pulseAsi", hkFeats); //This gets fired like all the time feats get added/removed/altered
      //#endregion
      
      //#region Character Description
      const hkName = () => {
        let name = this._parent.compDescription.__state["description_name"] || " ";
        if(name.length < 1){name = " ";} //Make this at least a blankspace so the label isnt empty (and dissaspears)
        $inputName.text(name);
      }
      this._parent.compDescription.addHookBase("description_name", hkName);
      hkName();
      const hkAlignment = () => {
        let al = this._parent.compDescription.__state["description_alignment"] || "";
        if(al.length === 0){al = "None";} //Make this at least a blankspace so the label isnt empty (and dissaspears)
        $inputAlignment.text(al);
      }
      this._parent.compDescription.addHookBase("description_alignment", hkAlignment);
      hkAlignment();
      //#endregion

      wrapper.appendTo(tabSheet);
    }

    getRace_() { return this._parent.compRace.getRace_(); }
    getCharacterSize(fallback="M"){
      const race = this.getRace_();
      if(!race){return fallback;}
      const compSize = this._parent.compRace.compRaceSize;
      if(!compSize){return fallback;}
      const form = compSize.pGetFormData();
      if(!form || !form.isFormComplete){return fallback;}
      return form.data;
    }
    static getClassData(compClass) {
        const primaryClassIndex = compClass._state.class_ixPrimaryClass;
        //If we have 2 classes, this will be 1
        const highestClassIndex = compClass._state.class_ixMax;

        const classList = [];
        for(let i = 0; i <= highestClassIndex; ++i){
            const isPrimary = i == primaryClassIndex;
            //Get a string property that will help us grab actual class data
            const { propIxClass: propIxClass, propIxSubclass: propIxSubclass, propCurLevel:propCurLevel, propTargetLevel: propTargetLevel } =
            ActorCharactermancerBaseComponent.class_getProps(i);
            //Grab actual class data
            const cls = compClass.getClass_({propIxClass: propIxClass});
            if(!cls){continue;}
            const targetLevel = compClass._state[propTargetLevel];
            const block = {
                cls: cls,
                isPrimary: isPrimary,
                propIxClass: propIxClass,
                propIxSubclass:propIxSubclass,
                targetLevel:targetLevel,
                isDeleted:ActorCharactermancerBaseComponent.class_isDeleted(i),
            }
            //Now we want to ask compClass if there is a subclass selected for this index
            const sc = compClass.getSubclass_({cls:cls, propIxSubclass:propIxSubclass});
            if(sc != null) { block.sc = sc; }
            classList.push(block);
        }
        return classList;
    }
    /**
     * Description
     * @param {ActorCharactermancerClass} compClass
     * @param {number} ix
     * @param {number} conMod
     * @returns {number}
     */
    getClassHpInfo(compClass, ix, conMod){
        const hpModeComp = compClass._compsClassHpIncreaseMode[ix];
        const hpInfoComp = compClass._compsClassHpInfo[ix];

        //HP at level 1
        const lvl1Hp = (((hpInfoComp._hitDice.faces / 2) + 1) * hpInfoComp._hitDice.number) + conMod;
        let totalHp = lvl1Hp;
    }
    getBackground(){
        return this._parent.compBackground.getBackground_(); 
    }
    getBackgroundChoices(){
      let compBk = this._parent.compBackground;
      let form = compBk.compBackgroundCharacteristics.pGetFormData();
      return form.data;
    }

    test_gatherExportInfo() {
        //Get class(es) selected
        const p = this._parent;
        //Grab class data
        const classNames = this.test_grabClassNames(p.compClass);

        //Time to grab race data
        const raceName = this.test_grabRaceName(p.compRace);

         //Grab background name
         const bkName = this.test_grabBackgroundName(p.compBackground);

         //Grab Ability scores
         const abs = this.test_grabAbilityScoreTotals(p.compAbility);

         //Grab spells
         const spells = this.test_grabSpells(p.compSpell);
    }
    test_grabClassNames(compClass){
        const primaryClassIndex = compClass._state.class_ixPrimaryClass;
        //If we have 2 classes, this will be 1
        const highestClassIndex = compClass._state.class_ixMax;

        const classList = []; //lets make this an array of names
        for(let i = 0; i <= highestClassIndex; ++i){
            const isPrimary = i == primaryClassIndex;
            //Get a string property that will help us grab actual class data
            const { propIxClass: propIxClass } =
            ActorCharactermancerBaseComponent.class_getProps(i);
            //Grab actual class data
            const cls = compClass.getClass_({propIxClass: propIxClass});
            if(!cls){continue;}
            classList.push(cls.name + (isPrimary? " (Primary)" : ""));
        }
        return classList;
    }
    test_grabRaceName(compRace){
        const race = compRace.getRace_();
        if(race==null){return "no race";}
        return race.name;
    }
    test_grabBackgroundName(compBackground){
        const b = compBackground.getBackground_();
        if(b==null){return "no background";}
        return b.name;
    }
    test_grabAbilityScoreTotals(compAbility) {
        const info = compAbility.getTotals();
        if(info.mode == "none"){return {mode: info.mode, values: {str:0,dex:0, con:0, int:0, wis:0, cha:0}};}
        const result = info.totals[info.mode];
        return {mode: info.mode, values: result};
    }
    _getFeats(){
      const s = this._parent.compAbility.compStatgen.__state;
      let asiData = {};
      //We can get feats from ASIs, Races, and... what else? Backgrounds?
      //TODO: Add background support here
      for(let prop of Object.keys(s)){
          if(prop.startsWith("common_asi_") || prop.startsWith("common_additionalFeats_")){
              asiData[prop] = s[prop];
          }
          //Some races provide ASI choices, include them here while we are at it
          else if(prop.startsWith("common_raceChoice")){
            asiData[prop] = s[prop];
          }
          //Keep track of number of custom feats
          //TODO: only include custom feats with index lower than this number
          else if (prop.startsWith("common_cntFeatsCustom")){
            asiData[prop] = s[prop];
          }
      }

      //Figure out feats gained through ASI's
      const numASIFeatOpportunities = Object.keys(asiData).filter((prop, val) => prop.startsWith("common_asi_ability_") && prop.endsWith("_mode")).length;
      const asiFeats = [];
      for(let i = 0; i < numASIFeatOpportunities; ++i){
        const mode = asiData[(`common_asi_ability_${i}_mode`)];
        if(mode != "feat"){continue;} //Mode must be feat, else it means the user choise an ASI instead
        const ixFeat = asiData[(`common_asi_ability_${i}_ixFeat`)];
        if(ixFeat==null || ixFeat<0){continue;} //No feat selected yet
        const feat = this._parent.compAbility._data.feat[ixFeat];
        asiFeats.push({asiIx:i, ixFeat:ixFeat, feat:feat});
      }

      //Figure out feats gained through race
      const numRaceFeats = Object.keys(asiData).filter((prop, val) => prop.startsWith("common_additionalFeats_race_fromFilter_") && prop.endsWith("_ixFeat")).length;
      const raceFeats = [];
      for(let i = 0; i < numRaceFeats; ++i){
        const ixFeat = asiData[(`common_additionalFeats_race_fromFilter_${i}_ixFeat`)];
        if(ixFeat==null || ixFeat<0){continue;} //No feat selected yet
        const feat = this._parent.compAbility._data.feat[ixFeat];
        raceFeats.push({raceFeatIx:i, ixFeat:ixFeat, feat:feat});
      }
      

      //Get feats from backgrounds
      //For now, assume we get ALL feats from the background (i dont know of a background that lets you choose between feats)
      const bkFeats = [];
      const bk = this.getBackground();
      if(bk && bk.feats){
        for(let f of bk.feats){
          //find feat by uid
          //TODO: improve this
          const featUid = Object.keys(f)[0];
          let parts = featUid.split("|");
          if(parts.length!=2){console.error("Feat UID does not seem to be structured correctly:", featUid);}
          let name = parts[0].toLowerCase();
          let source = parts[1].toLowerCase();
          const feat = this._parent.compAbility._data.feat.filter(f => f.name.toLowerCase() == name && f.source.toLowerCase() == source)[0];
          bkFeats.push({feat:feat});
        }
      }

      //Add custom added feats
      const numCustomASIFeatOpportunities = Object.keys(asiData).filter((prop, val) => prop.startsWith("common_asi_custom_") && prop.endsWith("_mode")).length;
      const customFeats = [];
      for(let i = 0; i < numCustomASIFeatOpportunities; ++i){
        const mode = asiData[(`common_asi_custom_${i}_mode`)];
        if(mode != "feat"){continue;} //Mode must be feat, else it means the user choise an ASI instead
        const ixFeat = asiData[(`common_asi_custom_${i}_ixFeat`)];
        if(ixFeat==null || ixFeat<0){continue;} //No feat selected yet
        const feat = this._parent.compAbility._data.feat[ixFeat];
        customFeats.push({asiIx:i, ixFeat:ixFeat, feat:feat});
      }

      return {asiFeats: asiFeats, raceFeats: raceFeats, backgroundFeats:bkFeats, customFeats:customFeats};
    }

    _pullProficienciesFromComponentForm(component, output, prop, isStringArray = false){
        const pasteVals = (fromSkills, isStringArray) => {
            if(fromSkills){
                if(isStringArray){
                    for(let str of fromSkills){
                        output[str] = 1;
                    }
                }
                else{
                    for(let skillName of Object.keys(fromSkills)){
                        skillName = skillName.toLowerCase(); //enforce lower case, just for safety
                        let skillVal = fromSkills[skillName];
                        let existingSkillVal = output[skillName] || 0;
                        //Only replace values if higher
                        //1 means proficiency, 2 means expertise
                        if(skillVal > existingSkillVal){output[skillName] = skillVal;}
                    }
                }
            }
        }

        if(!component){return;}
        const form = component.pGetFormData();
        pasteVals(form.data[prop], isStringArray);
    }
    async _getOurItems() {
      let boughtItems = [];
      let startingItems = [];
      //Try to get bought items first
      const compEquipShop = this._parent.compEquipment._compEquipmentShopGold;
      //Go through bought items
      const itemKeys = compEquipShop.__state.itemPurchases;
      const itemDatas = compEquipShop.__state.itemDatas.item;
      for(let item of itemKeys){
          //cant be trusted to not be null
          const foundItem = ActorCharactermancerEquipment.findItemByUID(item.data.uid, itemDatas);
          if(!foundItem){continue;}
          boughtItems.push({item:foundItem, quantity:item.data.quantity});
      }

      //We also need to go through starting items, but only if we didnt roll for gold instead
      const rolledForGold = !!this._parent.compEquipment._compEquipmentCurrency._state.cpRolled;
      if(!rolledForGold)
      {
          //If we rolled for gold, it means we dont get any default starting equipment
          const compEquipDefault = this._parent.compEquipment._compEquipmentStartingDefault;
          const form = await compEquipDefault.pGetFormData();
          const items = form.data.equipmentItemEntries;
          for(let it of items){ startingItems.push(it); }
      }

      return {boughtItems: boughtItems, startingItems:startingItems};
    }
    _getRemainingCoinage(){
      const compGold = this._parent.compEquipment._compEquipmentCurrency;
      const state = compGold.__state;
      let startingCp = state.cpRolled != null? state.cpRolled : state.cpFromDefault;
      let spentCp = state.cpSpent;
      let remainingCp = startingCp - spentCp;
      const totalCp = remainingCp;

      //const ratio_pp = Parser.COIN_CONVERSIONS[Parser.COIN_ABVS.indexOf("pp")];
      const ratio_gp = Parser.COIN_CONVERSIONS[Parser.COIN_ABVS.indexOf("gp")];
      //const ratio_el = Parser.COIN_CONVERSIONS[Parser.COIN_ABVS.indexOf("ep")];
      const ratio_sp = Parser.COIN_CONVERSIONS[Parser.COIN_ABVS.indexOf("sp")];
      //let platinum = Math.floor(remainingCp / ratio_pp); remainingCp -= (platinum * ratio_pp);
      let gold = Math.floor(remainingCp / ratio_gp); remainingCp -= (gold * ratio_gp);
      let silver = Math.floor(remainingCp / ratio_sp); remainingCp -= (silver * ratio_sp);
      

      return {copper:remainingCp, silver:silver, gold:gold};
    }

    /**
     * @param {ActorCharactermancerClass} compClass
     * @param {ActorCharactermancerBackground} compBackground
     * @param {ActorCharactermancerRace} compRace
     * @returns {{acrobatics:number, athletics:number}} Returned object has a bunch of parameters named after skills, their values are either 1 (proficient) or 2 (expertise)
     */
    _grabSkillProficiencies(){
        //What can give us proficiencies?
        //Classes
        //Subclasses
        //Backgrounds
        //Races
        //Feats

        const compClass = this._parent.compClass;
        const compBackground = this._parent.compBackground;
        const compRace = this._parent.compRace;
        const dataProp = "skillProficiencies";

        let out = {};

        //Get number of classes
        const highestClassIndex = compClass._state.class_ixMax;
        //Then paste skills gained from each class
        for(let ix = 0; ix <= highestClassIndex; ++ix){
            this._pullProficienciesFromComponentForm(compClass.compsClassSkillProficiencies[ix], out, dataProp);
            for(let fos of compClass.compsClassFeatureOptionsSelect[ix]){
              if(fos._subCompsExpertise){for(let subcomp of fos._subCompsExpertise){this._pullProficienciesFromComponentForm(subcomp, out, dataProp);}}
              if(fos._subCompsExpertise){for(let subcomp of fos._subCompsSkillProficiencies){this._pullProficienciesFromComponentForm(subcomp, out, dataProp);}}
              if(fos._subCompsExpertise){for(let subcomp of fos._subCompsSkillToolLanguageProficiencies){this._pullProficienciesFromComponentForm(subcomp, out, dataProp);}}
            }
        }
        this._pullProficienciesFromComponentForm(compRace.compRaceSkillProficiencies, out, dataProp);
        this._pullProficienciesFromComponentForm(compBackground.compBackgroundSkillProficiencies, out, dataProp);

        return out;
    }
     /**
     * @param {ActorCharactermancerClass} compClass
     * @param {ActorCharactermancerBackground} compBackground
     * @param {ActorCharactermancerRace} compRace
     * @returns {{"disguise kit":number, "musical instrument":number}} Returned object has a bunch of parameters named after skills, their values are either 1 (proficient) or 2 (expertise)
     */
     _grabToolProficiencies(){
        //What can give us proficiencies?
        //Classes
        //Subclasses
        //Backgrounds
        //Races
        //Feats
        const compClass = this._parent.compClass;
        const compBackground = this._parent.compBackground;
        const compRace = this._parent.compRace;
        const dataProp = "toolProficiencies";

        let out = {};
        //Get number of classes
        const highestClassIndex = compClass._state.class_ixMax;
        //Then paste skills gained from each class
        for(let ix = 0; ix <= highestClassIndex; ++ix){
            this._pullProficienciesFromComponentForm(compClass.compsClassToolProficiencies[ix], out, dataProp);
        }
        this._pullProficienciesFromComponentForm(compRace.compRaceToolProficiencies, out, dataProp);
        this._pullProficienciesFromComponentForm(compBackground.compBackgroundToolProficiencies, out, dataProp);

        return out;
    }
    
    /**
     * @returns {{"simple":number, "dagger":number}} Returned object has a bunch of parameters named after skills, their values are either 1 (proficient) or 2 (expertise)
     */
     _grabWeaponProficiencies(){
        //What can give us proficiencies?
        //Classes
        //Feats?
        const compClass = this._parent.compClass;
        const dataProp = "weapons";

        let out = {};
        //Get number of classes
        const highestClassIndex = compClass._state.class_ixMax;
        //Then paste skills gained from each class
        for(let ix = 0; ix <= highestClassIndex; ++ix){
            this._pullProficienciesFromComponentForm(compClass.compsClassStartingProficiencies[ix], out, dataProp, true);
        }

        //We need to do some additional parsing (we will get stuff like "shortsword|phb", "dart|phb");
        for(let prop of Object.keys(out)){
            if(!prop.includes("|")){continue;}
            out[prop.split("|")[0]] = out[prop];
            delete out[prop];
        }

        return out;
    }
     /**
     * @returns {{"light":number, "medium":number}} Returned object has a bunch of parameters named after skills, their values are either 1 (proficient) or 2 (expertise)
     */
     _grabArmorProficiencies(){
        //What can give us proficiencies?
        //Classes
        //Feats?
        const compClass = this._parent.compClass;
        const dataProp = "armor";

        let out = {};
        //Get number of classes
        const highestClassIndex = compClass._state.class_ixMax;
        //Then paste skills gained from each class
        for(let ix = 0; ix <= highestClassIndex; ++ix){
            this._pullProficienciesFromComponentForm(compClass.compsClassStartingProficiencies[ix], out, dataProp, true);
        }

        //We need to do some additional parsing (we will get stuff like "light|phb", "medium|phb");
        for(let prop of Object.keys(out)){
            if(!prop.includes("|")){continue;}
            out[prop.split("|")[0]] = out[prop];
            delete out[prop];
        }

        return out;
    }
    /**
     * @returns {{"common":number, "dwarvish":number}} Returned object has a bunch of parameters named after skills, their values are either 1 (proficient) or 2 (expertise)
     */
    _grabLanguageProficiencies(){
        //What can give us proficiencies?
        //Races
        //Backgrounds
        //Classes
        const compClass = this._parent.compClass;
        const compRace = this._parent.compRace;
        const dataProp = "languageProficiencies";

        let out = {};
        //Get number of classes
        const highestClassIndex = compClass._state.class_ixMax;
        //Then paste languages gained from each class
        for(let ix = 0; ix <= highestClassIndex; ++ix){
            for(let fos of compClass.compsClassFeatureOptionsSelect[ix]){
                for(let subcomp of fos._subCompsLanguageProficiencies){
                    this._pullProficienciesFromComponentForm(subcomp, out, dataProp);
                }
                for(let subcomp of fos._subCompsSkillToolLanguageProficiencies){
                    this._pullProficienciesFromComponentForm(subcomp, out, dataProp);
                }
                
            }
            
        }

        this._pullProficienciesFromComponentForm(compRace._compRaceSkillToolLanguageProficiencies, out, dataProp);
        this._pullProficienciesFromComponentForm(compRace._compRaceLanguageProficiencies, out, dataProp);

        //We need to do some additional parsing (we will get stuff like "light|phb", "medium|phb");
        /* for(let prop of Object.keys(out)){
            if(!prop.includes("|")){continue;}
            out[prop.split("|")[0]] = out[prop];
            delete out[prop];
        } */

        return out;
    }
     /**
     * @returns {{"str":number, "dex":number}} Returned object has a bunch of parameters named after skills, their values are either 1 (proficient) or 2 (expertise)
     */
     _grabSavingThrowProficiencies(){
        //What can give us proficiencies?
        //Races
        //Backgrounds
        //Classes
        const compClass = this._parent.compClass;
        const compRace = this._parent.compRace;
        const dataProp = "savingThrows";

        let out = {};
        //Get number of classes
        const highestClassIndex = compClass._state.class_ixMax;
        //Then paste languages gained from each class
        for(let ix = 0; ix <= highestClassIndex; ++ix){
            this._pullProficienciesFromComponentForm(compClass.compsClassStartingProficiencies[ix], out, dataProp, true);
        }

        this._pullProficienciesFromComponentForm(compRace._compRaceSkillToolLanguageProficiencies, out, dataProp);
        this._pullProficienciesFromComponentForm(compRace._compRaceLanguageProficiencies, out, dataProp);

        return out;
    }

    /**
     * Get the proficiency bonus of our character (depends on character level)
     * @returns {number}
     */
    _getProfBonus(){
        const classList = ActorCharactermancerSheet.getClassData(this._parent.compClass);
        let levelTotal = 0;
        for(let ix = 0; ix < classList.length; ++ix){
            const data = classList[ix];
            if(!data.cls){continue;}
            const targetLevel = data.targetLevel || 1;
            levelTotal += targetLevel;
        }

        return Parser.levelToPb(levelTotal);
    }
    _getAbilityModifier(abl_abbreviation, total=null){
        if(total == null){
            const totals = this.test_grabAbilityScoreTotals(this._parent.compAbility);
            total = totals.values[abl_abbreviation];
        }
        return Math.floor((total-10) / 2);
    }
    _getAbilityScore(abl_abbreviation){
      const totals = this.test_grabAbilityScoreTotals(this._parent.compAbility);
      return totals.values[abl_abbreviation];
    }

    async _calcArmorClass(){
        const dexModifier = this._getAbilityModifier("dex");
        //Try to get items from bought items (we will do starting items later)
        const compEquipShop = this._parent.compEquipment._compEquipmentShopGold;

        let bestArmorAC = Number.MIN_VALUE;
        let bestArmor = null;

        const tryUseArmor = (item) => {
            //Account for if proficient in armor? nah not yet
            //check if strength requirement is met?
            const armorAC = item.ac;
            const armorType = item.type.toUpperCase(); //LA, MA, HA
            //Light armor has no dex cap. Medium and heavy has +2 as an upper cap
            const dexBonus = armorType == "LA"? dexModifier : Math.min(dexModifier, 2);
            const finalAC = armorAC + dexBonus;
            if(finalAC > bestArmorAC){bestArmor = {ac:armorAC, dexBonus:dexBonus, name:item.name}; bestArmorAC = finalAC; }
        }

        const tryGetArmors = async () => {
            //Go through bought items
            const itemKeys = compEquipShop.__state.itemPurchases;
            const itemDatas = compEquipShop.__state.itemDatas.item;
            for(let item of itemKeys){
                //cant be trusted to not be null
                const foundItem = ActorCharactermancerEquipment.findItemByUID(item.data.uid, itemDatas);
                if(!foundItem){continue;}
                if(foundItem.armor == true){tryUseArmor(foundItem);}
            }
    
            //We also need to go through starting items
            const rolledForGold = !!this._parent.compEquipment._compEquipmentCurrency._state.cpRolled;
            if(!rolledForGold)
            {
                //If we rolled for gold, it means we dont get any default starting equipment
                const compEquipDefault = this._parent.compEquipment._compEquipmentStartingDefault;
                const form = await compEquipDefault.pGetFormData();
                const items = form.data.equipmentItemEntries;
                for(let it of items){if(it.armor == true){tryUseArmor(it);}}
            }
        }

        await tryGetArmors();
        //TODO: unarmored defense?
        //TODO: shield?

        const naturalAC = 10 + dexModifier; //unarmored defense here?
        if(bestArmorAC > naturalAC){
            return {ac:bestArmorAC, name:bestArmor.name};
        }
        else{
            return {ac:naturalAC, name:"Natural Armor"};
        }
    }

    /**
     * @param {ActorCharactermancerSpell} compSpells
     */
    test_grabSpells(compSpells){
        let spellsKnown = new Array(10);
        for(let j = 0; j < compSpells.compsSpellSpells.length; ++j)
        {
            const comp1 = compSpells.compsSpellSpells[j];
            for(let spellLevelIx = 0; spellLevelIx < comp1._compsLevel.length; ++spellLevelIx)
            {
                const comp2 = comp1._compsLevel[spellLevelIx];
                const known = comp2.getSpellsKnown();
                for(let arrayEntry of known){
                    spellsKnown[spellLevelIx].push(arrayEntry.spell.name);
                }
            }
        }
    }

    /**
     * * @param {number} hitDiceNumber
     * @param {number} hitDiceFaces
     * @param {number} level
     * @param {number} mode
     * @param {string} customFormula
     * @returns {number}
     */
    static calcHitPointsAtLevel(hitDiceNumber, hitDiceFaces, level, mode, customFormula){
        switch(mode){
            case 0: //Take Average
                return (hitDiceFaces * hitDiceNumber) + ((((hitDiceFaces * hitDiceNumber) / 2)+1) * (level-1));
            case 1: //Minimum Value
                return (hitDiceFaces * hitDiceNumber) + ((1) * (level-1));
            case 2: //Maximum Value
                return (hitDiceFaces * hitDiceNumber) + (((hitDiceFaces * hitDiceNumber)) * (level-1));
            case 3: //Roll
                console.error("Roll mode not yet implemented!"); return;
            case 4: //Custom Formula
                console.error("Custom Formula mode not yet implemented!"); return;
            case 5: //Do Not Increase HP
                return (hitDiceFaces * hitDiceNumber);
            default: console.error("Unimplemented!"); return 0;
        }
    }

    /**
     * @param {ActorCharactermancerSpell} compSpells
     * @returns {any[][]}
     */
    static getAllSpellsKnown(compSpells){
        let spellsBylevel = [[],[],[],[],[],[],[],[],[],[]];
        //Go through each component that can add spells
        for(let j = 0; j < compSpells.compsSpellSpells.length; ++j)
        {
            //console.log(compSpells.compsSpellSpells);
            const comp1 = compSpells.compsSpellSpells[j];
            if(comp1 == null){continue;} //Switching classes can make components here be null
            //Go through each level for the component
            for(let spellLevelIx = 0; spellLevelIx < comp1._compsLevel.length; ++spellLevelIx)
            {
                //Grab the subcomponent that handles that specific level
                const subcomponent = comp1._compsLevel[spellLevelIx];
                const known = subcomponent.getSpellsKnown(true); //Get the spells known by that subcomponent
                for(let i = 0; i < known.length; ++i){
                    spellsBylevel[spellLevelIx].push(known[i].spell);
                }
            }
        }

        return spellsBylevel;
    }
    static getSpellSlotsAtLvl(spellLevel, compClass){
      
      let total = 0;
      let classData = ActorCharactermancerSheet.getClassData(compClass);
      for(let d of classData){

        //Ask class for spellslots
        if(d.cls?.classTableGroups){
          //What is the level we have achieved for this class?
          let classLevel = d.targetLevel; //this is base 1, so value 1 = level 1
          let foundSpellSlotsTable = false;
          for(let i = 0; i < d.cls.classTableGroups.length && !foundSpellSlotsTable; ++i){
            const t = d.cls.classTableGroups[i];
            if(!t.rowsSpellProgression){continue;}
            foundSpellSlotsTable = true;
            total += t.rowsSpellProgression[classLevel-1][spellLevel-1]; //0 is level 1, 1 is level 2, etc (this applies for both)
          }
        }
        //TODO: Ask subclass for spells lots
        /* if(d.sc?.classTableGroups){
          let foundSpellSlotsTable = false;
          for(let i = 0; i < d.cls.classTableGroups.length && !foundSpellSlotsTable; ++i){
            const t = d.cls.classTableGroups[i];
            if(!t.rowsSpellProgression){continue;}
            foundSpellSlotsTable = true;
            total += t.rowsSpellProgression[level-1]; //0 is level 1, 1 is level 2, etc
          }
        } */
      }
      return total;
    }
}
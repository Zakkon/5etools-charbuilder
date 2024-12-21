document.addEventListener('DOMContentLoaded', function () {
    JqueryUtil.initEnhancements();
});
window.addEventListener('load', function () {
   
  //Run init, ready, and then load the program
  handleInit().then(() => handleReady().then(() => 
  {
    //Try to get a state cookie (telling us which page the user last visited, and which character)
    const cookie = CookieManager.getState();
    const charExists = (cookie && cookie.uid) && !!CookieManager.getCharacterInfo(cookie.uid)?.result;
    //Fallback: go to character select screen
    if(!charExists || cookie.page == "select"){
      const charSelect = new CharacterSelectScreen();
      charSelect.render();
      //Write a new cookie saying we are at char select screen
      CookieManager.setState(CharacterBuilder.createStateCookie("select", null, false));
    }
    else {
      //Tell sourcemanager to load sources to display the character who's uid was in the cookie, then switch to the right page
      SourceManager.defaultStart({cookieUid: cookie.uid, page:cookie.page, viewMode:cookie.viewMode});
    }
  }));
});
async function handleInit(){
  console.log("Init begin");
  //UtilGameSettings.prePreInit();
  //Vetools.doMonkeyPatchPreConfig();
  Config.prePreInit(); //Important
  Vetools.doMonkeyPatchPostConfig(); //Makes roll buttons work
  HandlebarsHelper.registerHelpers();
  HandlebarsHelper.registerPartials();


  //We need this to be true, since BrewUtil freaks out otherwise and tries to grab json from a url that is 404
  Object.defineProperty(globalThis, "IS_DEPLOYED", {
    get() { return true; },
    set(val) {},
  });

  
  //Localize
  const en_json = await HelperFunctions.loadJSONFile("js/charbuilder/lang/en.json");
  HelperFunctions.setLocalizationLanguage(en_json);
  performPreLocalization(CONFIG.DND5E);

  console.log("Init complete");
}
async function handleReady(){
  await Config.pInit(); //Important
  //Prepare indexes of homebrew content
  await Vetools.pDoPreload();
  SideDataInterfaces.init(); //Important
  //Hide rollbox ui
  Renderer.dice._$minRoll.hideVe();
  Renderer.dice._$wrpRoll.hideVe();
  console.log("Ready complete");
}

class SourceManager {
  static _BREW_DIRS = ["class", 'subclass', "race", "subrace", "background",
    "item", 'baseitem', "magicvariant", "spell", "feat", "optionalfeature"];
  static _DATA_PROPS_EXPECTED = ['class', "subclass", 'classFeature', "subclassFeature",
    "race", "background", "item", "spell", "feat", 'optionalfeature'];
  static _curWindow;

  /**
   * Fetches sourceIds from a saved character (or default ones as fallback),
   * and creates a character builder window that can play around with those sources
   * @param {string} cookieUid The uid which is attached to the character
   * @param {string} page The page the character builder will jump to upon launch
   */
  static async defaultStart({ cookieUid, page, viewMode=false }) {

    //Try to load source ids from localstorage by referring to a character saved in localstorage under 'cookieUid'
    const attemptedLoad = await this._loadSourceIdsFromSave(cookieUid);
    let {sourceIds, uploadedFileMetas, customUrls} = attemptedLoad || {sourceIds: null, uploadedFileMetas:null, customUrls:null};
    //If that failed, just load default source ids
    if(!sourceIds){sourceIds = await this._getDefaultSourceIds(); uploadedFileMetas = []; customUrls = []; }

    //Cache which sources we chose, and let them process the source ids into ready data entries (classes, races, etc)
    const data = await SourceManager._loadSources({sourceIds: sourceIds, uploadedFileMetas: uploadedFileMetas, customUrls: customUrls});
    //Create the character builder UI, and try to navigate to the correct page, showing the correct character
    const window = new CharacterBuilder(data, cookieUid, page, viewMode);
    this._curWindow = window;
  }
  
  /**
   * Load sources and return parsed entities
   * @param {{sourceIds:any[], uploadedFileMetas:any, customUrls:any}} sourceInfo
   * @returns {{class:{}[], background:{}[], classFeature:{}[], race:{}[], monster:{}[], item:{}[]
  * , spell:{}[], subclassFeature:{}[], feat:{}[], optionalFeature:{}[], foundryClass:{}[]}}
  */
  static async _loadSources(sourceInfo){
    //Process and post-process the data
    //Get entities such as classes, races, backgrounds using the source ids
    const {content, cacheKeys} = await SourceManager._getOutputEntities(sourceInfo.sourceIds, sourceInfo.uploadedFileMetas, sourceInfo.customUrls, true);
    //Then perform some post processing
    const postProcessedData = await SourceManager._postProcessAllSelectedData(content);
    const mergedData = postProcessedData;
    //Make sure that the data always has an array for classes, races, feats, etc, even if none were provided by the sources
    SourceManager._DATA_PROPS_EXPECTED.forEach(propExpected => mergedData[propExpected] = mergedData[propExpected] || []);
    SourceManager._setUsedSourceIds(sourceInfo, cacheKeys);

    return mergedData;
  }

  /**
   * Perform some post-processing on entities extracted from sources
   * @param {{class:{}[], background:{}[], classFeature:{}[], race:{}[], monster:{}[], item:{}[]
   * , spell:{}[], subclass:{}[], subclassFeature:{}[], feat:{}[], optionalFeature:{}[], foundryClass:{}[]}} data
   * @returns {{class:{}[], background:{}[], classFeature:{}[], race:{}[], monster:{}[], item:{}[]
   * , spell:{}[], subclassFeature:{}[], feat:{}[], optionalFeature:{}[], foundryClass:{}[]}}
   */
  static async _postProcessAllSelectedData(data) {

    data = ImportListClass.Utils.getDedupedData({allContentMerged: data});

    data = ImportListClass.Utils.getBlocklistFilteredData({dedupedAllContentMerged: data});

    delete data.subclass;
    Charactermancer_Feature_Util.addFauxOptionalFeatureEntries(data, data.optionalfeature);

    Charactermancer_Class_Util.addFauxOptionalFeatureFeatures(data.class, data.optionalfeature);

    await SourceManager.plutoniumConvertDataTest(data);

    return data;
  }

  /**
   * Get objects containing information about sources, such as urls, abbreviations and names. Doesn't include any game content itself
   * @returns {{name:string, isDefault:boolean, cacheKey:string}[]}
   */
  static async _pGetSources() {

    const isStreamerMode = true;//Config.get('ui', 'isStreamerMode');

    return [new UtilDataSource.DataSourceSpecial(isStreamerMode ? "SRD" : "5etools", SourceManager._pLoadVetoolsSource.bind(this), {
      cacheKey: '5etools-charactermancer',
      filterTypes: [UtilDataSource.SOURCE_TYP_OFFICIAL_ALL],
      isDefault: true,
      pPostLoad: SourceManager._pPostLoad.bind(this, {})
    }), ...UtilDataSource.getSourcesCustomUrl({
      pPostLoad: SourceManager._pPostLoad.bind(this, {
        isBrewOrPrerelease: true
      })
    }), ...UtilDataSource.getSourcesUploadFile({
      pPostLoad: SourceManager._pPostLoad.bind(this, {
        isBrewOrPrerelease: true
      })
    }), ...(await UtilDataSource.pGetSourcesPrerelease(ActorCharactermancerSourceSelector._BREW_DIRS, {
      pPostLoad: SourceManager._pPostLoad.bind(this, { isPrerelease: true})
    })), ...(await UtilDataSource.pGetSourcesBrew(ActorCharactermancerSourceSelector._BREW_DIRS, {
      pPostLoad: SourceManager._pPostLoad.bind(this, { isBrew: true})
    }))].filter(dataSource => !UtilWorldDataSourceSelector.isFiltered(dataSource));
  }

  /**
   * Extracts entities such as classes, subclasses, races and backgrounds out of an array of sources
   * @param {{name:string, isDefault:boolean, cacheKey:string}[]} sourceIds
   * @param {any} uploadedFileMetas
   * @param {any} customUrls
   * @returns {{class:{}[], background:{}[], classFeature:{}[], race:{}[], monster:{}[], item:{}[]
   * , spell:{}[], subclass:{}[], subclassFeature:{}[], feat:{}[], optionalFeature:{}[], foundryClass:{}[]}}
   */
  static async _getOutputEntities(sourceIds, uploadedFileMetas, customUrls, getDeduped=false) {

    //Should contain all spells, classes, etc from every source we provide
    const allContentMeta = await UtilDataSource.pGetAllContent({
    sources: sourceIds,
    uploadedFileMetas: uploadedFileMetas,
    customUrls: customUrls,
    cacheKeys: [],
    /*
    isBackground,

    page: this._page,

    isDedupable: this._isDedupable,
    fnGetDedupedData: this._fnGetDedupedData,

    fnGetBlocklistFilteredData: this._fnGetBlocklistFilteredData,

    isAutoSelectAll, */
    });
    const cacheKeys = allContentMeta.cacheKeys;
    const out = getDeduped? allContentMeta.dedupedAllContentMerged : allContentMeta;

    //TEMPFIX
    /*  Renderer.spell.populatePrereleaseLookup(await PrereleaseUtil.pGetBrewProcessed(), {isForce: true});
Renderer.spell.populateBrewLookup(await BrewUtil2.pGetBrewProcessed(), {isForce: true});

(out.spell || []).forEach(sp => { Renderer.spell.uninitBrewSources(sp); Renderer.spell.initBrewSources(sp); }); */

    return {content: out, cacheKeys:cacheKeys};
  }

  /**
   * Callback function to handle parsing JSON for "core" content hosted on 5eTools
   * @returns {any}
   */
  static async _pLoadVetoolsSource() {
      const combinedSource = {};
      const [classResult, raceResult, backgroundResult, itemResults, spellResults, featResults, optionalFeatureResults]
      = await Promise.all([Vetools.pGetClasses(), Vetools.pGetRaces(), DataUtil.loadJSON(Vetools.DATA_URL_BACKGROUNDS),
          Vetools.pGetItems(), Vetools.pGetAllSpells(), DataUtil.loadJSON(Vetools.DATA_URL_FEATS), DataUtil.loadJSON(Vetools.DATA_URL_OPTIONALFEATURES)]);
      Object.assign(combinedSource, classResult);
      combinedSource.race = raceResult.race;
      combinedSource.background = backgroundResult.background;
      combinedSource.item = itemResults.item;
      combinedSource.spell = spellResults.spell;
      combinedSource.feat = featResults.feat;
      combinedSource.optionalfeature = optionalFeatureResults.optionalfeature;
      return combinedSource;
  }
  /**
   * Called when a source has been loaded
   * @param {any} data
   * @param {{isBrewOrPrerelease:boolean}} opts
   * @returns {any} data
   */
  static async _pPostLoad(opts, data) {
    let isBrew = false; let isPrerelease = false;
    const isBrewOrPrerelease = opts.isBrewOrPrerelease || false;
    if (isBrewOrPrerelease) {
      const { isPrerelease: _isPre, isBrew: _isBrew } =
      UtilDataSource.getSourceType(data, { isErrorOnMultiple: true });
      isPrerelease = _isPre;
      isBrew = _isBrew;
    }

    //Load the actual content
    data = await UtilDataSource.pPostLoadGeneric({ isBrew: isBrew, isPrerelease: isPrerelease }, data);


    if (data.class || data.subclass) {
      //TEMPFIX
      /* const { DataConverterClassSubclassFeature: convSubclFeature  } = await Promise.resolve().then(function () {
        return DataConverterClassSubclassFeature;
      });
      const isIgnoredLookup = await convSubclFeature.pGetClassSubclassFeatureIgnoredLookup({ data: data });
      */

      const isIgnoredLookup = await DataConverterClassSubclassFeature.pGetClassSubclassFeatureIgnoredLookup({ data: data });
      const postLoadedData = await PageFilterClassesFoundry.pPostLoad({
        class: data.class,
        subclass: data.subclass,
        classFeature: data.classFeature,
        subclassFeature: data.subclassFeature
      }, {
        actor: null,
        isIgnoredLookup: isIgnoredLookup
      });
      Object.assign(data, postLoadedData);
      if (data.class) {
        data.class.forEach(cls => PageFilterClasses.mutateForFilters(cls));
      }
    }
    if (data.feat) { data.feat = MiscUtil.copy(data.feat); }
    if (data.optionalfeature) {
      data.optionalfeature = MiscUtil.copy(data.optionalfeature);
    }
    return data;
  }
  /**
   * Apply new source IDs, and fetch entities from them. Completely reloads the entire character builder.
   * @param {{sourceIds:any[], uploadedFileMetas:any, customUrls:any}} sourceInfo
   */
  static async changeSources(sourceInfo){
    //Cache which sources we chose, and let them process the source ids into ready data entries (classes, races, etc)
    const data = await SourceManager._loadSources(sourceInfo);
    //Get a cookie explaining the existing character shown, and what page
    let state = CookieManager.getState();
    if(!state){
      //This really shouldn't happen, but it is good form to have a fallback anyway
      state = {uid: CharacterBuilder.uid, page: "class", viewMode :false};
    }
    //Tear down the existing window
    this._curWindow.teardown();
    //Create a new window, open up the saved character using the uid
    //If we didn't save the character yet, just provide a null id
    if(!CookieManager.getCharacterExists(state.uid)){state.uid = null;}
    const window = new CharacterBuilder(data, state.uid, state.page, state.viewMode);
    this._curWindow = window;
  }
  /**
   * @param {{sourceIds:any[], uploadedFileMetas:any[], customUrls:any[]}} opts
   */
  static async _setUsedSourceIds(opts, cacheKeys){
    SourceManager.cachedSourceIds = opts.sourceIds;
    SourceManager.cachedUploadedFileMetas = opts.uploadedFileMetas;
    SourceManager.cachedCustomUrls = opts.customUrls;
    SourceManager.cacheKeys = cacheKeys;
  }
  /**
   * @param {string} cookieUid 
   * @returns {{name:string, isDefault:boolean, cacheKey:string}[]}
   */
  static async _loadSourceIdsFromSave(cookieUid){
    let ids = [];
    let metas = [];
    let customUrls = [];
    try {
      //Load a character from localstorage using the cookie ID, that character contains info about the sources
      const info = CookieManager.getCharacterInfo(cookieUid);
      if(!info?.result?._meta?.sourceIds?.length){return null;}
      ids = info?.result._meta?.sourceIds;
      metas = info?.result._meta?.uploadedFileMetas || [];
      customUrls = info?.result._meta?.customUrls || [];
    }
    catch(e){
      console.error("Failed to parse saved source ids!");
      throw e;
    }
    //Assume something is wrong if no source id is in the array
    if(ids.length < 1){
      console.error("Found no source IDs in the array");
      return null;}
    //Get all sources. These contain more info than is in the minified version
    const allSources = await this._pGetSources();

    //Match the full sources to the minified sources we pulled from localstorage
    //Then return the full sources that were matched
    const matchedSourceIds = allSources.filter(src => {
      let match = false; //loop will stop when match is made
      for(let i = 0; !match && i < ids.length; ++i){
        match = ids[i].name == src.name; //Simple name match for now
      }
      return match;
    });
    return {sourceIds: matchedSourceIds, uploadedFileMetas: metas, customUrls: customUrls}
  }
  static async _getDefaultSourceIds(){
    const isStreamerMode = true;
      //Create a source obj that contains all the official sources (PHB, XGE, TCE, etc)
      //This object will have the 'isDefault' property set to true
      const officialSources = new UtilDataSource.DataSourceSpecial(
        isStreamerMode? "SRD" : "5etools", this._pLoadVetoolsSource.bind(this),
        {
          cacheKey: '5etools-charactermancer',
          filterTypes: [UtilDataSource.SOURCE_TYP_OFFICIAL_ALL],
          isDefault: true,
          pPostLoad: this._pPostLoad.bind(this, { })
      });

      /* const allBrews = await Vetools.pGetBrewSources(...SourceManager._BREW_DIRS);

      const chosenBrewSourceUrl = new UtilDataSource.DataSourceUrl(chosenBrew.name, chosenBrew.url,{
        pPostLoad: this._pPostLoad.bind(this, { isBrew: true, actor: actor }),
        filterTypes: [UtilDataSource.SOURCE_TYP_BREW],
        abbreviations: chosenBrew.abbreviations,
        brewUtil: BrewUtil2,
      }); */

      return [officialSources];
  }
  static minifySourceId(sourceId){
    let out = {name:sourceId.name};
    if(!!sourceId.isDefault){out.isDefault = sourceId.isDefault;}
    //if(!!s._isAutoDetectPrereleaseBrew){out._isAutoDetectPrereleaseBrew = s._isAutoDetectPrereleaseBrew;}
    //if(!!s._isExistingPrereleaseBrew){out._isExistingPrereleaseBrew = s._isExistingPrereleaseBrew;}
    //if(!!sourceId.cacheKey){out.cacheKey = sourceId.cacheKey;}
    return out;
  }

  static async plutoniumConvertDataTest(data){
    console.log("DATA IN", data);
    return;
  }
  static async plutoniumConvertData(data, type, actor, additionalData){
    const tester = new ImportTester();
    let result = await tester.runTest(data, type, actor, additionalData);
    return result;
  }
}
class SETTINGS{
    static FILTERS = true;
    static PARENTLESS_MODE = true;
    static DO_RENDER_DICE = false;
    static USE_EXISTING = false;
    static LOCK_EXISTING_CHOICES = false;
    /**This boolean toggles loading from a cookie save file */
    static USE_EXISTING_WEB = true;
    static LOCALPATH_REDIRECT = true;
    static USE_FVTT = false;
    /**Should changing class/race that transfer the already set choices (for like proficiencies?), so if both the new and the old race could pick Perception as a proficiency, and the old one did, make sure the new one also has that choice set */
    static TRANSFER_CHOICES = false;
    static DICE_TOMESSAGE = false;
    //By default, this is off. This means that loading in a high level character, they dont get to pick any spells that they would have gained at earlier levels
    //Turning this to true fixes that, and lets us pick spells from lower levels
    static GET_CASTERPROG_UP_TO_CURLEVEL = true;
    static GET_FEATOPTSEL_UP_TO_CURLEVEL = true;
    static SPECIFIED_ABILITY_SAVE = false;
    static LOCK_SUBCLASS_LOWLVL = false;
    static ENABLE_SOURCE_UPLOAD_FILE = false;
    static ENABLE_SOURCE_CUSTOM_URL = false;
    static SHEET_ISEDITABLE = false;
    static SHEET_MANCER_RECREATES_SHEET = false;
     //Set this to true if you want to import one big subclassFeature detailing several subclassFeatures (gained at the same level, likely) within itself,
    //set it to false if you want to import each subclassFeature individually
    static SUBCLASS_IMPORT_LOADEDS = true;
    static PLUT_IMPORT_ADDITIONALSPELLS_TO_ACTOR = false;
    static SPELLS_TAB_ACCESSED_FROM_SPELLBOOK = false;
}
class CharacterBuilder {
    tabButtonParent;
    tabClass;
    tabRace;
    tabAbilities;
    tabBackground;
    tabSpells;
    tabEquipment;
    tabShop;
    tabFeats;
    tabSheet;
    compClass;
    compRace;
    compAbility;
    compBackground;
    compEquipment;
    compSpell;
    compFeat;
    compSheet;
    tabs;
    _featureSourceTracker;
    _actor;
    _mancerData;
    /** @type {CharacterBuilder} */
    static instance;
    get actor(){return this._actor;}
    get mancerData(){return this._mancerData;}
    static useHeaderTitleAndReturnButton = false;
    static enableSaveToFile = true;
    
    /**
    * @param {{class:{}[], background:{}[], classFeature:{}[], race:{}[], monster:{}[], item:{}[]
    * , spell:{}[], subclassFeature:{}[], feat:{}[], optionalFeature:{}[], foundryClass:{}[]}} data
    * @param {string} existingUid
    * @param {string} page
    * @returns {CharacterBuilder}
    */
    constructor(data, existingUid, page, viewMode=false){

      ActorCharactermancerBaseComponent.class_clearDeleted();
      CharacterBuilder.currentUid = null; //Reset the publicly readable uid
      this.parent = this;
      CharacterBuilder.instance = this;
      this._data = data;

      const _root = $("#window-root");

      //Create header
      this._createHeader(_root);

      this.VIEW_MODE = viewMode;
      if(this.VIEW_MODE){page = "sheet";} //If we are in view mode, set page to sheet, since we wont be editing the character anyway
      this._createTabs(_root); //Create the small tab buttons
      this._createPanels(_root); //Create the panels that hold components
      
      //Try to load a character from cookies using a cookie uid
      const charInfo = existingUid? CookieManager.getCharacterInfo(existingUid).result : null;
      if(!!charInfo){ //If that succeded, load the character stored in the cookie
        console.log("loaded charinfo", charInfo);
        this._actor = new Actor5e(charInfo.actor); //Charinfo.actor contains actor data
        this._mancerData = charInfo.mancerData; //Contains the save data used by the charactermancer
        CharacterBuilder.currentUid = existingUid; //And cache the uid we used, available publicly to read
      }
      else { //If that failed, just create a fresh uid for the blank character we are about to show
        this._actor = new Actor5e();
        this._mancerData = null;
        CharacterBuilder.currentUid = CookieManager.createUid();
      }

      //Test overrides
      //this.actor.character = System5e.extendSchema_Character(this.actor.character, this.actor.character?.system);

      //Create a feature source tracker (this one gets used alot by the components)
      this._featureSourceTracker = new Charactermancer_FeatureSourceTracker();

      //Create components
      this.compClass = new ActorCharactermancerClass(this);
      this.compRace = new ActorCharactermancerRace(this);
      this.compAbility = new ActorCharactermancerAbility(this);
      this.compBackground = new ActorCharactermancerBackground(this);
      this.compEquipment = new ActorCharactermancerEquipment(this);
      this.compSpell = new ActorCharactermancerSpell(this);
      this.compFeat = new ActorCharactermancerFeat(this);
      this.compDescription = new ActorCharactermancerDescription(this);
      this.compSheet = new ActorCharactermancerSheet2(this);
          
      this._pRenderTest(charInfo)
      .then(
        () =>  {
          this.e_switchTab(page);
        }
      );
    }

    async _pRenderTest(charInfo){
      const mancerData = charInfo?.mancerData;
      const doLoad = !!mancerData;
      if(doLoad){
        //this.actor.character = System5e.extendSchema_Character(this.actor.character, character.character?.system);
      }

      await this._pLoad(mancerData);

      
      //APPLY FILTERS
      if(doLoad){await this.loadCachedFilters(charInfo);} //Seems to reset FOS components (like expertise choices)

      //RENDER COMPONENTS
      await this.compClass.render();

      await this.compRace.render();
      await this.compAbility.render();

      await this.compBackground.render();

      await this.compEquipment.pRenderStarting();
      await this.compEquipment.pRenderShop();

      await this.compSpell.pRender();
      await this.compFeat.render();
      if(doLoad){this.compDescription.setStateFromSaveFile(mancerData);}
      await this.compDescription.render();


      if(doLoad){this.compBackground.setStateFromSaveFile(mancerData);}
      if(doLoad){this.compRace.setStateFromSaveFile(mancerData);}
      if(doLoad){this.compAbility.setStateFromSaveFile(mancerData);}
      if(doLoad){this.compSpell.setStateFromSaveFile(mancerData);}
      if(doLoad){this.compEquipment.setStateFromSaveFile(mancerData);}
      if(doLoad){await this.compClass.setStateFromSaveFile(mancerData);}

      
      if(doLoad){await this.compFeat.setStateFromSaveFile(mancerData);}

      if(doLoad){this.compSheet.loadFromState(charInfo._meta.sheet);}
      this.compSheet.render(charInfo);
      

      return true;

    }
    

    _createTabs($wrp){
        const tabHolder = $$`<div class="w-100 no-shrink ui-tab__wrp-tab-heads--border tab_button_holder"></div>`.appendTo($wrp);
        const createTabBtn = (label) => {
            return $$`<button class="btn ve-btn-default ui-tab__btn-tab-head btn-sm">${label}</button>`.appendTo(tabHolder);
        }
        const createRightSideBtn = (label, icon="") => {
          let spanIcon = icon != null && icon.length > 0?
            $$`<span class="${"glyphicon " + icon}"></span>` : null;
          return $$`<button class="btn ve-btn-default btn-sm pb-0">${spanIcon}${label}</button>`.appendTo(tabHolder);
        }
        const createLabel = (label) => {
          return $$`<label class="btn-sm">${label}</label>`.appendTo(tabHolder);
        }

        //Create the tabs
        if(!this.VIEW_MODE){ //If we are in VIEW MODE, do not show any tabs that contain character choices
          createTabBtn("Class").click(()=>{ this.e_switchTab("class"); }).addClass("active"); //Set class button as active
          createTabBtn("Race").click(()=>{ this.e_switchTab("race"); });
          createTabBtn("Abilities").click(()=>{ this.e_switchTab("abilities"); });
          createTabBtn("Background").click(()=>{ this.e_switchTab("background"); });
          createTabBtn("Starting Equipment").click(()=>{ this.e_switchTab("startingEquipment"); });
          createTabBtn("Equipment Shop").click(()=>{ this.e_switchTab("shop"); });
          if(!SETTINGS.SPELLS_TAB_ACCESSED_FROM_SPELLBOOK){createTabBtn("Spells").click(()=>{ this.e_switchTab("spells"); });}
          createTabBtn("Feats").click(()=>{ this.e_switchTab("feats"); });
          createTabBtn("Description").click(()=>{ this.e_switchTab("description"); });
        }
        else{
          //Create a label that says we are in view mode?
          createLabel("View Mode Active").addClass("lblDanger");
        }
        createTabBtn("Sheet").click(()=>{ this.e_switchTab("sheet"); });

        //add an invisible button between the tabs and the rest of the buttons
        //createRightSideBtn("", "").addClass("btn-invis");
        $$`<div class="btn-invis"></div>`.appendTo(tabHolder);

        if(!this.VIEW_MODE){
          createRightSideBtn("Finalize", "glyphicon-floppy-disk").click(()=>{
            //Exit charactermancer, go to sheet view
            console.log("CompClass", this.compClass);



            this.getChoiceData().then(async (choiceData)=>{

              const allItems = this._actor.getItemsByUid("*");
              const foundCustomizations = allItems.filter(i => i.isCustomized == true);
              const foundCustomItems = allItems.filter(i => i.isCustom == true);
              console.log("Found custom", foundCustomizations.length, foundCustomItems.length, allItems);
              const isSure = (foundCustomizations.length < 1 && foundCustomItems.length < 1) || await InputUiUtil.pGetUserBoolean({
                title: `Are you sure?`,
                htmlDescription: `Custom changes to the sheet, such as added items or modifications on class features may be deleted. Do you wish to proceed?`,
                textYes: "Yes",
                textNo: "Cancel",
              });
              if (!isSure){return;}

              await CharacterBuilder.parseMancerChoiceData(this._actor, choiceData);
              this.e_switchTab("sheet");
              
            });
            
          });
          createRightSideBtn("Save", "glyphicon-floppy-disk").click(()=>{
            CharacterExportFvtt.exportCharacter(this);
          });
          createRightSideBtn(" Configure Sources", "glyphicon-cog").click(async()=>{
            await this.e_changeSourcesDialog();
          });
        }
        
        if(CharacterBuilder.enableSaveToFile){
          createRightSideBtn("Save to File", "glyphicon-download").click(async ()=>{
            this.downloadCharacterCookieData();
          });
        }
        
        if(!CharacterBuilder.useHeaderTitleAndReturnButton){
          
          createRightSideBtn(" Return To Select", "glyphicon-log-out").addClass("ve-btn-danger").click(() => {
            this._returnToCharSelect();
          })
        }
        

        this.tabButtonParent = tabHolder;
    }
    _createPanels($wrp){
        const newPanel = () => {return new CharacterBuilderPanel($(`<div class="ui-tab__wrp-tab-body ve-flex-col ui-tab__wrp-tab-body--border"></div>`).appendTo($wrp)); }

        this.tabClass = newPanel();
        this.tabRace = newPanel();
        this.tabAbilities = newPanel();
        this.tabBackground = newPanel();
        this.tabEquipment = newPanel();
        this.tabShop = newPanel();
        this.tabSpells = newPanel();
        this.tabFeats = newPanel();
        this.tabDescription = newPanel();
        this.tabSheet = newPanel();
    }
    async _pLoad(character){
        if(!SETTINGS.FILTERS){return;}
        await this.compRace.pLoad(character);
        await this.compBackground.pLoad(character);
        //This sets state based on what is in the savefile (if USE_EXISTING_WEB) is true
        //Only handles class, subclass, level and isPrimary
        await this.compClass.pLoad(character);
        await this.compSpell.pLoad(character);
        await this.compFeat.pLoad(character);
    }
    async loadCachedFilters(charInfo){
      if(charInfo?._meta?.filters == null){return;}
      const filters = charInfo._meta.filters;
      function applyCachedFilters(cachedFilters, modal) {
        if(!cachedFilters){return;}
        modal.pageFilter.filterBox.setFromValues(cachedFilters);
      }
      applyCachedFilters(filters.class, this.compClass.modalFilterClasses);
      /* applyCachedFilters(filters.race, this.compRace.modalFilterRaces);
      applyCachedFilters(filters.background, this.compBackground.modalFilterBackgrounds);
      applyCachedFilters(filters.shop, this.compEquipment._compEquipmentShopGold._modalFilter);
      applyCachedFilters(filters.spell, this.compSpell.modalFilterSpells);
      applyCachedFilters(filters.feat, this.compFeat.modalFilterFeats); */
    }
    async _renderComponents(opts){
        //this.compClass.render(); //Goes on for quite long, and will trigger hooks for many ms after
        const doLoad = SETTINGS.USE_EXISTING_WEB && !!this.actor;

      
        this.compClass.render().then(() => {

          if(doLoad){ this.compClass.setStateFromSaveFile(this.actor); }
          this.compRace.render();
          if(doLoad){this.compRace.setStateFromSaveFile(this.actor);}
          this.compAbility.render();
          

          this.compBackground.render();
          
          //compEquipment's modalfilters are only created in pRenderShop
          this.compEquipment.pRenderStarting()
          //.then(() => this.compEquipment.compEquipmentShopGold._modalFilter = new ModalFilterEquipment(this.compEquipment.compEquipmentShopGold))
          //.then(() => this.compEquipment.compEquipmentShopGold._modalFilter.pageFilter.filterBox.setFromValues(
            //opts.charInfo._meta.filters.shop))
          .then(() => this.compEquipment.pRenderShop())
            .then(() => {
              const shop = this.compEquipment.compEquipmentShopGold;
              if(doLoad){
                console.log("Setting state to compequipment", shop._modalFilter.pageFilter.filterBox != null);
                this.compEquipment.setStateFromSaveFile(this.actor);
                if(opts?.charInfo._meta.filters){
                  /* console.log("Setting filters to shop modal via then");
                  this.compEquipment.compEquipmentShopGold._modalFilter.pageFilter.filterBox.setFromValues(
                  opts.charInfo._meta.filters.shop); */
                }
              }});
          this.compSpell.pRender().then(() => {if(doLoad){this.compSpell.setStateFromSaveFile(this.actor);}});
          this.compFeat.render();
        
          if(doLoad){this.compDescription.setStateFromSaveFile(this.actor);}
          this.compDescription.render();

          if(doLoad){this.compAbility.setStateFromSaveFile(this.actor);}
          if(doLoad){this.compBackground.setStateFromSaveFile(this.actor);}
          console.log("Rendering complete");
          //this.loadCachedFilters(null, opts.charInfo)
      }).then(()=> {
        this.compSheet.render({charInfo: opts?.charInfo});
      });

      

      console.log("RenderComponents complete");
    }

    _createHeader($wrp){

      if(!CharacterBuilder.useHeaderTitleAndReturnButton){return;}
      const btnBackToSelect = $$`<button>Return To Select</button>`;
      btnBackToSelect.click(() => {
        this._returnToCharSelect();
      });

      const header = $$`
      <div class="character-builder-header">
          <h1>5e Character Builder</h1>
          ${btnBackToSelect}
      </div>`;

      header.appendTo($wrp);
    }

    //#region Events
    e_switchTab(tabName){
        this.tabButtonParent.children().each(function() {$(this).removeClass("active");});
        this._setActive(this.tabClass.$wrpTab, false);
        this._setActive(this.tabRace.$wrpTab, false);
        this._setActive(this.tabAbilities.$wrpTab, false);
        this._setActive(this.tabBackground.$wrpTab, false);
        this._setActive(this.tabEquipment.$wrpTab, false);
        this._setActive(this.tabShop.$wrpTab, false);
        this._setActive(this.tabSpells.$wrpTab, false);
        this._setActive(this.tabFeats.$wrpTab, false);
        this._setActive(this.tabDescription.$wrpTab, false);
        this._setActive(this.tabSheet.$wrpTab, false);

        
        let newActivePanel = null;
        let tabString = "";
        switch(tabName){
            case "race": newActivePanel = this.tabRace; tabString = "Race"; break;
            case "abilities": newActivePanel = this.tabAbilities; tabString = "Abilities"; break;
            case "background": newActivePanel = this.tabBackground; tabString = "Background"; break;
            case "startingEquipment": newActivePanel = this.tabEquipment; tabString = "Starting Equipment"; break;
            case "shop": newActivePanel = this.tabShop; tabString = "Equipment Shop"; break;
            case "spells": newActivePanel = this.tabSpells; tabString = "Spells"; break;
            case "feats": newActivePanel = this.tabFeats; tabString = "Feats"; break;
            case "description": newActivePanel = this.tabDescription; tabString = "Description"; break;
            case "sheet": newActivePanel = this.tabSheet; tabString = "Sheet"; break;
            default: newActivePanel = this.tabClass; tabString = "Class"; break;
        }
        const pressedBtn = this.tabButtonParent.children().filter(function(){return $(this).html() === tabString});//.eq(tabIx);
        pressedBtn.addClass("active");
        this._setActive(newActivePanel.$wrpTab, true);

        //Write to localstorage that we are on this tab now, so if browser refreshes, we go back to it
        const cookie = CharacterBuilder.createStateCookie(tabName, CharacterBuilder.currentUid, this.VIEW_MODE);
        CookieManager.setState(cookie);
    }
    async e_changeSourcesDialog(){
      //Get all available sources
      const allSources = await SourceManager._pGetSources();
      //Get the names of the sources we already have set as enabled
      const preEnabledSources = SourceManager.cachedSourceIds;
      const customUrls = SourceManager.cachedCustomUrls;
      //Open up the source selector window and wait for a reply
      const sourceSelector = new ActorCharactermancerSourceSelector({
        title: "Select Sources",
        filterNamespace: 'ActorCharactermancerSourceSelector_filter',
        savedSelectionKey: "ActorCharactermancerSourceSelector_savedSelection",
        sourcesToDisplay: allSources,
        preEnabledSources: preEnabledSources,
        preEnabledCustomUrls: customUrls,
      });
      const result = await sourceSelector.pWaitForUserInput();
      //If user just tried to simply exit the dialog without confirming any choices, an empty array should be returned
      //Since the dialog won't let the user confirm without choosing at least one source, this is a good way to tell if user aborted
      if(result == null || result.length < 1){return;} //User aborted
      //Then tell SourceManager that we have these new sourceIds, and let them take it from here
      SourceManager.changeSources(result);
    }
    //#endregion
    //#region Getters
    /**
     * @returns {{class:{}[], background:{}[], classFeature:{}[], race:{}[], monster:{}[], item:{}[]
   * , spell:{}[], subclassFeature:{}[], feat:{}[], optionalFeature:{}[], foundryClass:{}[]}}
     */
    get data(){
      return this._data;
    }
    get featureSourceTracker_() {
        return this._featureSourceTracker;
    }
    //#endregion
    
    _returnToCharSelect(){
      this.teardown();
      const charSelect = new CharacterSelectScreen();
      charSelect.render();

      const cookie = CharacterBuilder.createStateCookie("select", null, false);
      CookieManager.setState(cookie);
    }

    _setActive($tab, active){
        const hi = "ve-hidden";
        if(!$tab){return;}
        if(active && $tab.hasClass(hi)){$tab.removeClass(hi);}
        else if(!active && !$tab.hasClass(hi)){$tab.addClass(hi);}
    }
    teardown(){
      CharacterBuilder.currentUid = null;
      $(`#window-root`).empty();
    }
    /**
     * Create a cookie to remember which page and character the browser is viewing
     * @param {string} tabName
     * @param {string} charUid
     * @param {boolean} viewMode
     * @returns {{uid:string, page:string}}
     */
    static createStateCookie(tabName, charUid, viewMode=false){
      return {
        page: tabName,
        uid: charUid,
        viewMode: viewMode
      };
    }

    /** Downloads the cookie data from localstorage and saves it to a .txt file. Note that this save file is only readable by this website, not any FVTT or human. */
    downloadCharacterCookieData(){
      try{
        let curState = CookieManager.getState();
        let text = JSON.stringify(CookieManager.getCharacterInfo(curState.uid));
        let filename = "export";
        //Figure out a fitting filename
        let charName = this.compDescription.__state["description_name"];
        filename = "export_" + (charName != null && charName.length > 0? charName+"_": "") +CookieManager.getState().uid;
        //Download this as a text file
        this.downloadTxtFile(filename+".txt", text);
      }
      catch(e){
        alert("Failed to download character safe file: " + e.message);
      }
      
    }
    downloadTxtFile(filename, text) {
      var element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
      element.setAttribute('download', filename);
  
      element.style.display = 'none';
      document.body.appendChild(element);
  
      element.click();
  
      document.body.removeChild(element);
  }

  //#region Helper Functions
  /**
   * Search loaded content for an entity with the given type and uid (example: "class", {uid:"barbarian_phb"})
   * @param {string} type
   * @param {object} [options]
   * @param {string} [options.name] Name of the entity.
   * @param {string} [options.source] Source of the entity.
   * @param {string} [options.uid]  If you already have a precompiled uid (or hash, if you prefer that term), provide that here instead of name and source.
   * @returns {object}
   */
  static getEntityByUid(type, options){
    if(type == "subclass"){
      //Subclasses are stored within the .subclasses array of each class, so search there instead
      const classDatas = CharacterBuilder.instance._data["class"];
      for(let cls of classDatas){ //Search through each class
        if(!cls?.subclasses){continue;}
        const match = this._getEntityByUid(cls.subclasses, options);
        if(match){return match;}
      }
      return null;
    }
    const datas = CharacterBuilder.instance._data[type];
    return this._getEntityByUid(datas, options);
  }
  static _getEntityByUid(from, options){
    const match = (e, hash) => {
      const hash2 = UrlUtil.URL_TO_HASH_GENERIC(e).toLowerCase();
      return hash2 == hash;
    }
    if(typeof options === "string"){options = {uid:options};}
    const hash = (options.uid ?? UrlUtil.URL_TO_HASH_GENERIC(options)).toLowerCase();
    const matches = from.filter(e => match(e, hash));
    if(matches.length > 1){console.error("More than one of", type, "found with hash", hash); return matches[0];s}
    else if(matches.length < 1){return null;}
    else{return matches[0];}
  }
  /**
   * @param {string} type
   * @param {{key:value}} propMatches
   * @param {{caseInsensitive:boolean}} options
   * @returns {Entity5e}
   */
  static getEntityByProps(type, propMatches, options){
    const datas = CharacterBuilder.instance._data[type];
    return this._getEntityByProps(datas, propMatches, options);
  }
  /**
   * @param {any} from
   * @param {any} propMatches
   * @param {{caseInsensitive:boolean}} options
   * @returns {Entity5e}
   */
  static _getEntityByProps(from, propMatches, options){
    const matches = from.filter(e => Object.entries(propMatches).every(([key, value]) => {
      const itemValue = e[key];
      if (options?.caseInsensitive && typeof itemValue === 'string' && typeof value === 'string') {
        return itemValue.toLowerCase() === value.toLowerCase();
      }
      return itemValue === value;
    }));
    if(matches.length > 1){
      if(matches.length == 2){ //If two objects were found, and the difference is classic vs 2024 rules, default to classic
        const a = matches[0].source.toLowerCase();
        const b = matches[1].source.toLowerCase();
        if(a == "phb" && b == "xphb"){return matches[0];}
        if(a == "xphb" && b == "phb"){return matches[1];}
      }
      console.error("More than one result matches props", propMatches, matches);
      return matches[0];
    }
    else if(matches.length < 1){return null;}
    else{return matches[0];}
  }
  static getItemByUid(itemUid){
    const itemDatas = CharacterBuilder.instance._data.item;
    const foundItem = ActorCharactermancerEquipment.findItemByUID(itemUid, itemDatas);
    return foundItem;
  }
  /**
   * Looks through the database for any class feature with a matching uid(a.k.a. "hash")
   * @param {string} hash
   * @param {string} className
   * @param {string} classSource
   * @returns {ClassFeature5e}
   */
  static getClassFeatureByUid(hash, className, classSource){
    const cls = this.getEntityByUid("class", {name:className, source:classSource});
    let matches = [];
    for(let e of cls.classFeatures){
      if(e.hash.toLowerCase() == hash){matches.push(e); continue;}
      for(let loaded of e.loadeds ?? []){
        if(loaded.hash.toLowerCase() == hash){matches.push(loaded); break;}
      }
    }
    if(matches.length > 1){console.error("More than one class feature found with hash", hash); return matches[0];}
    else if(matches.length < 1){return null;}
    else{return matches[0];}
  }
  /**
   * Looks through the database for any subclass feature with a matching uid(a.k.a. "hash")
   * @param {string} hash
   * @param {string} className
   * @param {string} classSource
   * @param {string} subclassName
   * @param {string} subclassSource
   * @returns {ClassFeature5e}
   */
  static getSubclassFeatureByUid(hash, className, classSource, subclassName, subclassSource){
    const scls = this.getSubclass(className, classSource, subclassName, subclassSource);
    let matches = [];
    if(SETTINGS.SUBCLASS_IMPORT_LOADEDS){
      for(let f of scls.subclassFeatures){
        matches = matches.concat(f.loadeds.filter(e => e.hash.toLowerCase() == hash));
      }
    }
    else{
      matches = scls.subclassFeatures.filter(e => e.hash.toLowerCase() == hash);
    }
    if(matches.length > 1){console.error("More than one subclass feature found with hash", hash); return matches[0];s}
    else if(matches.length < 1){return null;}
    else{return matches[0];}
  }
  static getFeatureByUid(featureType, hash, data){
    const match = (a, b, propName, caseInsensitive = true) => {
        let _a = a[propName];
        let _b = b[propName];
        if(caseInsensitive){_a = _a.toLowerCase(); _b = _b.toLowerCase();}
        return _a === _b;
    }
    let matches = [];
    if(featureType == "subclassFeature"){
      return this.getSubclassFeatureByUid(hash, data.className, data.classSource, data.subclassName, data.subclassSource);
    }
    else if(featureType == "classFeature"){
      return this.getClassFeatureByUid(hash, data.className, data.classSource);
    }
    else if(featureType == "foundrySubclassFeature"){
      const from = CharacterBuilder.instance._data.foundrySubclassFeature;
      if(!from){return null;}
      matches = from.filter(e => match(e, data, "name") && match(e, data, "source") && match(e, data, "className") && match(e, data, "classSource"));
    }
    if(matches.length > 1){console.error("More than one feature found with hash", hash); return matches[0];s}
    else if(matches.length < 1){return null;}
    else{return matches[0];}
  }
  static getSubclass(className, classSource, subclassName, subclassSource){
    const cls = this.getEntityByUid("class", {name:className, source:classSource});
    return this._getEntityByUid(cls.subclasses, {name:subclassName, source:subclassSource});
  }
  static getClassFeatureEntries(name, source){
    const featureDatas = CharacterBuilder.instance._data.classFeature;
    const hash = `${name}_${source}`.toLowerCase();
    if(hash == "undefined_undefined"){console.error("Undefined class name and source");} 
    const matches = featureDatas.filter(f => {
        const h = `${f.name}_${f.source}`.toLowerCase();
        return h == hash;
    });
    if(matches.length > 1){throw new Error("Not supposed to return more than one result", hash);}
    else if(matches.length < 1){
        console.error("Could not find a match to class", hash, "among our loaded classes. Did you forget to load a source?");
    }
    return matches[0]?.entries;
  }
  static getClassByNameSource(className, classSource){
    const classDatas = CharacterBuilder.instance._data.class;
    const classUid = `${className}|${classSource}`.toLowerCase();
    if(classUid == "undefined|undefined"){console.error("Undefined class name and source");} 
    const matches = classDatas.filter(cls => {
        //Create a uid from the item
        const uid = `${cls.name}|${cls.source}`.toLowerCase();//UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS]({ name:n, source:src });
        //then try to match it
        return classUid == uid;
    });
    if(matches.length > 1){throw new Error("Not supposed to return more than one result", classUid);}
    else if(matches.length < 1){
        console.error("Could not find a match to class", classUid, "among our loaded classes. Did you forget to load a source?");
    }
    return matches[0];
  }
  static getSpellByUid(uid, name, source){
    const fnBuildUid = (sp) => {return UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_SPELLS](sp);}
    if(!uid){uid = fnBuildUid({name:name, source:source});}
    return CharacterBuilder._runDatasMatch("spell", uid, fnBuildUid);
  }
  static _runDatasMatch(prop, uid, fnBuildUid){
    uid = uid.toLowerCase();
    const datas = CharacterBuilder.instance._data[prop];
    const matches = datas.filter(sp => {
        let uid2 = fnBuildUid(sp).toLowerCase();
        return uid == uid2;
    });
    if(matches.length > 1){console.log("Matches:",matches); throw new Error("Not supposed to return more than one result", uid);}
    else if(matches.length < 1){
        console.error("Could not find a match to spell", uid, "among our loaded spells. Did you forget to load a source?");
    }
    return matches[0];
  }
  
  //#endregion

  async getChoiceData(){
    let classData = await this.compClass.getChoiceData();
    let raceData = await this.compRace.getChoiceData();
    let backgroundData = await this.compBackground.getChoiceData();
    let abilityData = await this.compAbility.getChoiceData();
    let featData = await this.compFeat.getChoiceData();
    let spellData = await this.compSpell?.getChoiceData(); //Is null on non-caster classes
    let startingItemData = await this.compEquipment._compEquipmentStartingDefault.getChoiceData();
    let boughtItemData = await this.compEquipment._compEquipmentShopGold.getChoiceData();
    let targetData = {};
    targetData = Object.assign(targetData, classData, raceData, backgroundData, abilityData, featData, spellData, startingItemData);
    return targetData;
  }
  //#region Parse Mancher Choice Data
  /**
   * Parses choices made in the charactermancer, and applies them to the sheet
   * @param {Actor5e} actor
   * @param {any} choiceData
   * @returns {any}
   */
  static async parseMancerChoiceData(actor, choiceData){
    console.log("ChoiceData", choiceData);
    //System5e.applyClassChoiceData(actor, choiceData);
    const addFeatureItem = async(type, hash, dependencyPath, data={}) => {
      return await SheetApplier.addFeatureItem(actor, type, hash, dependencyPath, data);
    }
    const addSpellItem = async(actor, hash, preparationMode, isPrepared, dependencyPath)=>{
      return await SheetApplier.addSpellItem(actor, hash, preparationMode, isPrepared, dependencyPath);
    }
    const removeItemsNow = (items, fireEvents=false) => {
      if(!Array.isArray(items)){items = [items];}
      if(fireEvents){actor.removeEmbeddedDocuments("item", items);}
      else{actor._removeEntities(items);}
      //Or just add to removal pool
    }
    const isMancerGranted = (item) => {
      //console.log("Is Granted?", item.isMancerCreated, item);
      return !!item.isMancerCreated;
    }
    
    const pull = (forms, propertyParentName) => {
      let properties = [];
      for(let form of forms??[]){
        if(!form.data[propertyParentName] && !form.isFormComplete){continue;}
        for(let [key, value] of Object.entries(form.data[propertyParentName])){properties.push(key);}
      }
      return properties;
    }
    const mergePool = (prop, array) => {
      if(updatePool[prop] == null){updatePool[prop] = array; return;}
      updatePool[prop] = updatePool[prop].concat(array);
    }
    
    const pullSkills = (forms, isExpertise=false) => {
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
          const skill = actor.system.skills[skillAbbr];
          if(skill.baseProf > profValue){continue;} //Do not try to overwrite a higher proficiency (replacing expertise with normal proficiency, for example)
          skill.baseProf = profValue;
          const newSkill = System5e.calcSkillEmbed(skill, actor.system.abilities, actor.system.attributes.prof);
          updatePool[`skills.${skillAbbr}`] = newSkill;
        }
      }
    }
    const pullTools = (forms) => {
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
          const tool = actor.tools[toolAbbr];
          if(tool == null){console.error("Failed to find any tool with abbr", toolAbbr, actor.tools);}
          if(tool.baseProf > profValue){continue;} //Do not try to overwrite a higher proficiency (replacing expertise with normal proficiency, for example)
          tool.baseProf = profValue;
          const newTool = System5e.calcToolEmbed(tool, actor.system.attributes.prof);
          updatePool[`tools.${toolAbbr}`] = newTool;
        }
      }
    }
    const handleEntryData = (entryData) => {

      const tryConditionals = (array) => {
        for(let entry of array){
          if(entry.conditionals){
            SheetApplier.handleConditionals(entry.conditionals, actor, updatePool);
          }
        }
      }

      for (let [arrayName, array] of Object.entries(entryData)){
        if(!Array.isArray(array)){continue;}
        switch(arrayName){
          case "senses": tryConditionals(array);break;
          default: break;
        }
      }
    }

    let forceAdd = false;
    //Reset actor if settings demand it
    if(SETTINGS.SHEET_MANCER_RECREATES_SHEET){
      actor = new Actor5e();
      CharacterBuilder.instance._actor = actor;
      ActorCharactermancerSheet2.instance.setup(actor);
      forceAdd = true;
    }
    const REMOVE_UNTRACEABLE_ITEMS = false;
    const REMOVE_ALL_ITEMS = false; //Remove all items prior to (attempting) to add new ones?
    const REMOVE_CUSTOM_ITEMS = false; //If REMOVE_ALL_ITEMS is true, do we remove custom items as well?
    const REPLACE_EXISTING_ITEMS = true; //If an item is found with the same uid, do we replace it?
    const ADD_WHEN_EXISTING_ITEMS = false; //If an item is found with the same uid, do we add a new item anyway? Requires REPLACE_EXISTING_ITEMS to be false
    const RESET_ALL_PROFICIENCIES = true;
    const RESET_ABILITY_SCORES = true;
    //console.assert(SETTINGS.SHEET_MANCER_RECREATES_SHEET == true, "Sheet recreation mode is currently the only mode supported");
    //Mark all mancer-given features on actor as unverified
    let allItems = actor.getItemsByUid("*", false).filter(it => isMancerGranted(it) == true);
    if(REMOVE_ALL_ITEMS){removeItemsNow(actor.getItemsByUid("*", REMOVE_CUSTOM_ITEMS));}
    let allSpells = actor.getItemsByUid("*", false).filter(it => it.entityType == "spell");
    console.log("All current spells:", allSpells);

    allSpells = allSpells.filter(it => it.dependency != null);
    for(let sp of allSpells){
      if(sp.isCustom || !sp.dependency){continue;}
      const hash = sp.dependency.uid;
      let hasDependencyNow = false;
      let hasDependencySoon = false;
      if(sp.dependency.type == "class"){
        hasDependencyNow = actor.getItemsByUid(hash).length > 0;
        hasDependencySoon = choiceData.classes.filter(it => it.uid == hash).length > 0;
        //console.log("hash", hash, "now", hasClassNow, "soon", hasClassSoon, choiceData.classes);
      }
      else if(sp.dependency.type == "subclass"){
        hasDependencyNow = actor.getItemsByUid(hash).length > 0;
        hasDependencySoon = choiceData.classes.filter(it => it.subclassUid == hash).length > 0;
        //console.log("hash", hash, "now", hasClassNow, "soon", hasClassSoon, choiceData.classes);
      }
      else if(sp.dependency.type == "race"){
        hasDependencyNow = actor.getItemsByUid(hash).length > 0;
        hasDependencySoon = choiceData.races.filter(it => it.uid == hash).length > 0;
      }
      else{
        console.log("Unknown dependency type:", sp.dependency);
      }
      if(!hasDependencySoon){
        //Remove item?
        console.log("Removing item", sp.uid, "because dependency", sp.dependency, "will no longer be present");
        removeItemsNow(sp);
      }
    }

    //Look at class to try and see if it could give this spell
    let allClasses = actor.getItemsByUid("*").filter(it => it.featureType == "class")[0];
    console.log(allClasses);

    let itemsVerified = new Array(allItems.length).fill(false);
    //Then try to verify each one, and add new (already verified) features on to the sheet if needed

    if(RESET_ABILITY_SCORES){
      for(let [key, value] of Object.entries(actor.system.abilities)){
        value.baseProf = 0; //No save proficiency
        actor.system.abilities[key] = System5e.calcAbilityScoreEmbed(value, 8, actor.system.attributes.prof);
      }
    }

    if(RESET_ALL_PROFICIENCIES){
      //Set each skill proficiency to non-proficient (keep in mind that this depends on what the ability scores are currently set to)
      for(let [key, value] of Object.entries(actor.system.skills)??{}){
        value.baseProf = 0;
        actor.system.skills[key] = System5e.calcSkillEmbed(value, actor.system.abilities, actor.system.attributes.prof);
      }
      //Set each skill proficiency to zero
      for(let [key, value] of Object.entries(actor.tools)??{}){
        value.baseProf = 0;
        actor.tools[key] = System5e.calcToolEmbed(value, actor.system.abilities, actor.system.attributes.prof);
      }
      //Reset all "traits" (armor prof, language, expertises, weapon prof, cond immunities, etc)
      for(let [key, value] of Object.entries(actor.traits.traits??{})){
        actor.traits.traits[key].selected = [];
      }
      //Resetting speed as well
      actor.system.attributes.movement = {walk: 0, units: "ft"};
      //Also resetting size
      actor.traits.size = "med";
    }

    let updatePool = {};

    
    //#region Parse Race
    for(let race of choiceData.races){
      if(!forceAdd && actor.hasItem(race.uid)){continue;}
      let raceItem = await addFeatureItem("race", race.uid, race.path);
      console.log("RaceItem", raceItem);
      updatePool["system.details.race"] = {name:raceItem.name, system:raceItem.system};
      for(let [key, value] of Object.entries(raceItem.system.senses)){if(key != "units" && value != null) {updatePool[`senses.${key}`] = value;}}
      //Movement speed
      mergePool("traits.traits.languages.selected", pull(race.languages, "languageProficiencies"));
      mergePool("traits.traits.languages.selected", pull(race.skillsToolsLanguages, "languageProficiencies"));
      pullSkills(race.skills);
      pullTools(race.tools);
      pullSkills(race.skillsToolsLanguages);
      pullTools(race.skillsToolsLanguages);
      pullSkills(race.expertise, true);
      mergePool("traits.traits.dr.selected", pull(race.damRes, "resist"));
      mergePool("traits.traits.di.selected", pull(race.damImm, "immune"));
      mergePool("traits.traits.dv.selected", pull(race.damVul, "vulnerable"));
      mergePool("traits.traits.ci.selected", pull(race.conImm, "conditionImmune"));
      mergePool("traits.traits.expertise.selected", pull(race.expertise, "expertise"));
      mergePool("traits.traits.weaponProf.selected", pull(race.weaponProficiencies, "weaponProficiencies"));
      mergePool("traits.traits.armorProf.selected", pull(race.armorProficiencies, "armorProficiencies"));
      const sizeAbbr = race.size?.[0]?.data??"M";
      const sizeConversion = {m:"med", t:"tiny", s:"sm", g:"grg", h:"huge", l:"large"};
      updatePool["traits.size"] = sizeConversion[sizeAbbr.toLowerCase()];
    }
    //#endregion

    //#region Parse Background
    for(let bg of choiceData.backgrounds){
      const existing = actor.getItemsByUid(bg.uid);
      if(existing.length > 0 && REPLACE_EXISTING_ITEMS){removeItemsNow(existing);}
      else if(existing.length > 0 && !ADD_WHEN_EXISTING_ITEMS){continue;}
      const bgItem = await addFeatureItem("background", bg.uid, bg.path);
      updatePool["system.details.background"] = {name:bgItem.name};
      pullSkills(bg.skills);
      pullTools(bg.languagesTools);
      mergePool("traits.traits.languages.selected", pull(bg.languages, "languageProficiencies"));
      mergePool("traits.traits.languages.selected", pull(bg.languagesTools, "languageProficiencies"));
    }
    //#endregion
    //#region Feats
    for(let f of choiceData.featsFromCustom){
      const existing = actor.getItemsByUid(f.hash);
      if(existing.length > 0 && REPLACE_EXISTING_ITEMS){removeItemsNow(existing);}
      else if(existing.length > 0 && !ADD_WHEN_EXISTING_ITEMS){continue;}
      await addFeatureItem(actor, "feat", f.hash, null, f);
    }
    //#endregion

    //#region Spells
    let inputSpells = [];
    inputSpells = inputSpells.concat(choiceData.spells??[], choiceData.additionalSpells?.fromSubclass??[], choiceData.additionalSpells?.fromRace??[]);
    for(let sp of inputSpells){
      //It's theoretically possible for a character to have multiple instances of the same spell, but with different preparation modes
      //TODO: some spells may be locked to be upcast, we need to compare for that as well
      
      if(sp.dependency && !sp.uid){sp.dependency = MancerDependencyLink.fill(sp.dependency, choiceData);}
      const existing = actor.getItemsByUid(sp.hash).filter(s => s.system.preparationMode == sp.prepMode);
      if(existing.length > 0 && REPLACE_EXISTING_ITEMS){removeItemsNow(existing);}
      else if(existing.length > 0 && !ADD_WHEN_EXISTING_ITEMS){continue;}
      await SheetApplier.addSpellItem(actor, sp.hash, sp.prepMode, sp.isPrepared, sp.dependency);
    }
    //#endregion

    //#region Parse Classes
    //Do a small update on the actor already, since some subclass features can vary depending on what powers were given by race (Umbral Sight, for example)
    actor.update(updatePool, {doNotFireUpdate:true});
    let spellcastingAbility = null;
    let totalLevel = 0;
    for(let clsIx = 0; clsIx < choiceData.classes.length; ++clsIx){
      const cls = choiceData.classes[clsIx];
      const existing = actor.getItemsByUid(cls.uid);
      if(existing.length > 0 && REPLACE_EXISTING_ITEMS){removeItemsNow(existing);}
      else if(existing.length > 0 && !ADD_WHEN_EXISTING_ITEMS){continue;}
      let addedFeatureHashes = [];
      const clsData = CharacterBuilder.getEntityByUid("class", {uid: cls.uid});
      console.log("CLASS DATA", clsData);
      let sclsData = null;
      let classItem = await addFeatureItem("class", cls.uid, cls.path); //Add the class item itself to our sheet
      classItem.targetLevel = cls.targetLevel;
      totalLevel += cls.targetLevel;
      if(spellcastingAbility == null){spellcastingAbility = clsData.spellcastingAbility;}
      //Subclass

      const hasSubclass = cls.ixSubclass != null;
      let subclassName = null;
      if(hasSubclass){
        let addSubclass = true;
        const existingSC = actor.getItemsByUid(cls.subclassUid);
        if(existingSC.length > 0 && REPLACE_EXISTING_ITEMS){removeItemsNow(existingSC);}
        else if(existingSC.length > 0 && !ADD_WHEN_EXISTING_ITEMS){addSubclass = false;}

        if(addSubclass){
          sclsData = CharacterBuilder._getEntityByUid(clsData.subclasses, {uid: cls.subclassUid});
          subclassName = sclsData.name;
          //Add subclass's additionalSpells, unless there is more than one spell list
          //SheetApplier.handleSubclassAdditionalSpells(sclsData, actor, cls.targetLevel);
          
          //Try to import the subclass itself
          let subclassItem = await addFeatureItem("subclass", cls.subclassUid, null,
            {className: clsData.name, classSource: clsData.source,
              subclassName: sclsData.name, subclassSource: sclsData.source});

          

          for(let i = 1; i <= 9; ++i){
            //TODO: make this be combinable with other classes
            let slots = ActorCharactermancerSheet.getSpellSlotsAtLvl(i, cls.targetLevel, clsData, sclsData);
            updatePool[`spellbook.${i}.uses`] = slots;
            updatePool[`spellbook.${i}.slots`] = slots;
          }
        }
      }

      //HIT POINTS
      SheetApplier.handleHitPoints(cls.hpInfo[0], actor, updatePool);

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
      pullSkills(cls.skillProficiencies);

      //FEATURE OPTIONS SELECT
      for(let fos of cls.featureOptionsSelect){
        //FEATURES
        for(let feature of fos.data.features??[]){
          //.isRequiredOption is a good teller if they want us to load a subclassFeature from within a loadeds
          if(feature.type == "subclassFeature" && (feature.isRequiredOption === false
            && feature.isRequiredOption !== null) && !SETTINGS.SUBCLASS_IMPORT_LOADEDS){continue;}

          const isCoreSubclassFeature = feature.type == "subclassFeature" && feature.entity.name == subclassName;
          if(!isCoreSubclassFeature){
            //If this is the core subclass feature, we should just avoid importing the feature item to the sheet. But we can still do the rest
            let add = true;
            const existing = actor.getItemsByUid(feature.hash);
            if(existing.length > 0 && REPLACE_EXISTING_ITEMS){removeItemsNow(existing);}
            else if(existing.length > 0 && !ADD_WHEN_EXISTING_ITEMS){add = false;}
            if(add){
              const sheetItem = await addFeatureItem(feature.type, feature.hash, cls.path,
                {className:clsData.name.toLowerCase(), classSource:clsData.source.toLowerCase(),
                  subclassName:sclsData?.name.toLowerCase(), subclassSource:sclsData?.source.toLowerCase()});
              addedFeatureHashes.push(feature.hash);
            }
          }

          //Try to read the feature's entrydata
          if(!!feature.entity?.entryData){handleEntryData(feature.entity.entryData);}

          //Try to load a foundrySubclassFeature
          if(feature.type == "subclassFeature"){
            const foundryItem = CharacterBuilder.getFeatureByUid("foundrySubclassFeature",
              null, {name:sclsData.name, source:sclsData.source, subclassName:sclsData.name,
                className:clsData.name, classSource:clsData.source});
            //And try to read .entryData from that
            if(!!foundryItem){handleEntryData(foundryItem.entryData);}
          }
        }
        pullSkills(fos.data.formDatasExpertise, true);
        pullSkills(fos.data.formDatasSkillProficiencies);
        pullSkills(fos.data.formDatasSkillToolLanguageProficiencies);
        mergePool("traits.traits.languages.selected", pull(fos.data.formDatasLanguageProficiencies, "languageProficiencies"));
        mergePool("traits.traits.languages.selected", pull(fos.data.formDatasSkillToolLanguageProficiencies, "languageProficiencies"));
        mergePool("traits.traits.dr.selected", pull(fos.data.formDatasDamageResistances, "resist"));
        mergePool("traits.traits.di.selected", pull(fos.data.formDatasDamageImmunities, "immune"));
        mergePool("traits.traits.dv.selected", pull(fos.data.formDatasDamageVulnerabilities, "vulnerable"));
        mergePool("traits.traits.ci.selected", pull(fos.data.formDatasConditionImmunities, "conditionImmune"));
        mergePool("traits.traits.weaponProf.selected", pull(fos.data.formDatasWeaponProficiencies, "weaponProficiencies"));
        mergePool("traits.traits.armorProf.selected", pull(fos.data.formDatasArmorProficiencies, "armorProficiencies"));
        //senses
        //resources
        //saving throw proficiencies
        //additional spells
        //pullAdditionalSpells(fos.data.formDatasAdditionalSpells);
      }
    }
    updatePool["system.attributes.spellcasting"] = spellcastingAbility;
    updatePool["system.details.level"] = totalLevel;
    updatePool["system.attributes.prof"] = System5e.calcProficiencyBonus(totalLevel);
    
    //#endregion


    //#region Parse Starting Equipment
    for(let o of choiceData.startingItems){
      let item = o.item;
      //Some items granted by backgrounds aren't added to 5etools yet (like 2014 Acolyte's sticks of incense)
      await SheetApplier.addInventoryItem(actor, {name:item.name, source:item.source}, item.quantity);
    }
    for(let o of choiceData.boughtItems ?? []){
      let item = o.item;
      await SheetApplier.addInventoryItem(actor, {name:item.name, source:item.source}, item.quantity);
    }
    //#endregion

    //This should be done after class, we need the proficiency modifier (based on class level)
    const abilityAbbr = ["str", "dex", "con", "int", "wis", "cha"];
    for(let a of abilityAbbr){
      updatePool[`system.abilities.${a}`] = System5e.calcAbilityScoreEmbed(actor.system.abilities[`${a}`], choiceData.ability[`${a}`], actor.system.attributes.prof); }
    //#endregion

    //Then remove all unverified features
    for(let i = 0; REMOVE_UNTRACEABLE_ITEMS && i < itemsVerified.length; ++i){
      let it = allItems[i];
      let isVerified = itemsVerified[i];
      if(!isVerified){console.log(it.uid, "remains unverified!"); removeItemsNow(it);}
    }
    
    console.log("updatepool after class", updatePool);
    //TODO: check for language duplicates
    actor.update(updatePool, {doNotFireUpdate:true});
    //Movement speed?
    actor.prepareEmbeddedDocuments();
    actor.prepareDerivedData();
    actor.update(); //Forces render
  }
  //#endregion
}
/**A wrapper for a div that contains components. Only used by CharacterBuilder */
class CharacterBuilderPanel {
    $wrpTab;
    constructor(parentDiv){
        this.$wrpTab = parentDiv;
    }
    
}
class CookieManager {
  /**
   * @returns {number}
   */
  static getNumCharacters(){
    const registry = this.getCharacterRegistry();
    return registry?.uids?.length || 0;
  }
  /**
   * @returns {{uid:string, page:string, viewMode:boolean}}
   */
  static getState(){
    const foundState = localStorage.getItem("lastState"); //may be null
    if(!foundState){return null;}
    return JSON.parse(foundState);
  }
  /**
   * Saves the state where the user is (which page and which character), so refreshing the browser will put us back on the same page
   * @param {{uid:string, page:string, viewMode:boolean}} state
   */
  static setState(state){
    localStorage.setItem("lastState", JSON.stringify(state));
  }
  /**
   * @param {string} uid
   * @returns {boolean}
   */
  static getCharacterExists(uid){
    const character = this.getCharacterInfo(uid);
    return !!character;
  }
  /**
   * @param {string} uid
   * @returns {{result:{_meta:any, character:any}, uid:string}}
   */
  static getCharacterInfo(uid){
    const str = localStorage.getItem(`"char_"${uid}`);
    if(!str){
      console.error("Failed to load character with uid ", uid, " Is browser localStorage corrupted?");
      return null;
    }
    const character = JSON.parse(str);
    return {result: character, uid:uid};
  }
  /**
   * @returns {{result:{_meta:any, character:any}, uid:string}[]}
   */
  static getAllCharacterInfos(){
    const registry = this.getCharacterRegistry();
    if(!registry || !registry.uids){return [];}
    let output = [];
    for(let i = 0; i < registry.uids.length; ++i){
      output.push(this.getCharacterInfo(registry.uids[i]));
    }
    return output;
  }
  /**
   * @param {any} character
   * @param {string} uid
   */
  static saveCharacterInfo(character, uid){
    this.setCharacterToRegistry(uid);
    const str = JSON.stringify(character);
    localStorage.setItem(`"char_"${uid}`, str);
  }
  /**
   * @param {any} character
   */
  static saveNewCharacter(character){
    const uid = this.createUid();
    this.saveCharacterInfo(character, uid);
    return uid;
  }
  /**
   * @param {string} uid
   */
  static setCharacterToRegistry(uid){
    const existingRegistry = this.getCharacterRegistry();
    if(!existingRegistry){
      const newRegistry = {uids:[uid]};
      this.setCharacterRegistry(newRegistry);
      return;
    }
    
    if(!existingRegistry.uids.includes(uid)){
      existingRegistry.uids.push(uid);
    }
    else{
      existingRegistry.uids[existingRegistry.uids.indexOf(uid)] = uid;
    }

    
    this.setCharacterRegistry(existingRegistry);
  }
  /**
   * @param {string} uid
   * @returns {boolean}
   */
  static getCharacterExistsInRegistry(uid){
    const existingRegistry = this.getCharacterRegistry();
    if(!existingRegistry){
      return false;
    }
    
    return existingRegistry.includes(uid);
  }
  /**
   * @param {{uids:string[]}} registry
   */
  static setCharacterRegistry(registry){
    const str = JSON.stringify(registry);
    localStorage.setItem("character_registry", str);
  }
  /**
   * @returns {{uids:string[]}}
   */
  static getCharacterRegistry(){
    const str = localStorage.getItem("character_registry");
    if(!str){return null;}
    return JSON.parse(str);
  }
  /**
   * @returns {string}
   */
  static createUid(){
    const generateUid = () => {
      return "id" + Math.random().toString(16).slice(2);
    }
    const registry = this.getCharacterRegistry();
    if(!registry || !registry.uids.length){
      return generateUid();
    }
    const MAX_ATTEMPTS = 256;
    for(let i = 0; i < MAX_ATTEMPTS; ++i){
      const id = generateUid();
      if(!registry.uids.includes(id)){return id;}
    }
    throw new Error("Failed to generate a unique ID for character!");
  }
  /**
   * @param {string} uid
   */
  static deleteCharacter(uid){
    let existingRegistry = this.getCharacterRegistry();
    if(existingRegistry){
      const ix = existingRegistry.uids.indexOf(uid);
      existingRegistry.uids.splice(ix, 1);
    }
    this.setCharacterRegistry(existingRegistry);
    localStorage.removeItem(`"char_"${uid}`);
  }
}
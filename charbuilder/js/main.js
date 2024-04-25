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
  //UtilGameSettings.prePreInit();
  //Vetools.doMonkeyPatchPreConfig();
  Config.prePreInit(); //Important
  Vetools.doMonkeyPatchPostConfig(); //Makes roll buttons work

  //We need this to be true, since BrewUtil freaks out otherwise and tries to grab json from a url that is 404
  Object.defineProperty(globalThis, "IS_DEPLOYED", {
    get() { return true; },
    set(val) {},
  });
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
    const postProcessedData = SourceManager._postProcessAllSelectedData(content);
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
  static _postProcessAllSelectedData(data) {

    data = ImportListClass.Utils.getDedupedData({allContentMerged: data});

    data = ImportListClass.Utils.getBlocklistFilteredData({dedupedAllContentMerged: data});

    delete data.subclass;
    Charactermancer_Feature_Util.addFauxOptionalFeatureEntries(data, data.optionalfeature);

    Charactermancer_Class_Util.addFauxOptionalFeatureFeatures(data.class, data.optionalfeature);
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
    static useHeaderTitleAndReturnButton = false;
    static enableFVTTExport = false;
    
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
        this.actor = charInfo.character;
        CharacterBuilder.currentUid = existingUid; //And cache the uid we used, available publicly to read
      }
      else { //If that failed, just create a fresh uid for the blank character we are about to show
        CharacterBuilder.currentUid = CookieManager.createUid();
      }

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
      this.compSheet = new ActorCharactermancerSheet(this);
          
      this._pRenderTest(charInfo)
      .then(
        () =>  {
          this.e_switchTab(page);
        }
      );
    }

    async _pRenderTest(charInfo){
      const character = charInfo?.character;
      const doLoad = !!character;

      

      await this._pLoad();

      
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
      this.compFeat.render();
      await this.compDescription.render();


      if(doLoad){this.compBackground.setStateFromSaveFile(character);}
      if(doLoad){this.compRace.setStateFromSaveFile(character);}
      if(doLoad){this.compAbility.setStateFromSaveFile(character);}
      if(doLoad){this.compSpell.setStateFromSaveFile(character);}
      if(doLoad){this.compEquipment.setStateFromSaveFile(character);}
      if(doLoad){await this.compClass.setStateFromSaveFile(character);}

      
      this.compSheet.render(charInfo);

      return true;

    }

    _createTabs($wrp){
        const tabHolder = $$`<div class="w-100 no-shrink ui-tab__wrp-tab-heads--border tab_button_holder"></div>`.appendTo($wrp);
        const createTabBtn = (label) => {
            return $$`<button class="btn btn-default ui-tab__btn-tab-head btn-sm">${label}</button>`.appendTo(tabHolder);
        }
        const createRightSideBtn = (label, icon="") => {
          let spanIcon = icon != null && icon.length > 0?
            $$`<span class="glyphicon ${icon}"></span>` : null;
          return $$`<button class="hugRight btn btn-default btn-sm pb-0">${spanIcon}${label}</button>`.appendTo(tabHolder);
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
          createTabBtn("Spells").click(()=>{ this.e_switchTab("spells"); });
          createTabBtn("Feats").click(()=>{ this.e_switchTab("feats"); });
          createTabBtn("Description").click(()=>{ this.e_switchTab("description"); });
        }
        else{
          //Create a label that says we are in view mode?
          createLabel("View Mode Active").addClass("lblDanger");
        }
        createTabBtn("Sheet").click(()=>{ this.e_switchTab("sheet"); });
        
        if(!CharacterBuilder.useHeaderTitleAndReturnButton){
          createRightSideBtn(" Return To Select", "glyphicon-log-out").addClass("btn-danger").click(() => {
            this._returnToCharSelect();
          });
        }
        
        if(CharacterBuilder.enableFVTTExport){
          createRightSideBtn("Export to FVTT").click(async ()=>{
            const json = await CharacterExportFvtt.exportCharacterFvtt(this);
          });
        }
        if(!this.VIEW_MODE){
          createRightSideBtn(" Configure Sources", "glyphicon-cog").click(async()=>{
            await this.e_changeSourcesDialog();
          });
          createRightSideBtn("Save").click(()=>{
            CharacterExportFvtt.exportCharacter(this);
          });
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
    async _pLoad(){
        if(!SETTINGS.FILTERS){return;}
        await this.compRace.pLoad();
        await this.compBackground.pLoad();
        //This sets state based on what is in the savefile (if USE_EXISTING_WEB) is true
        //Only handles class, subclass, level and isPrimary
        await this.compClass.pLoad();
        await this.compSpell.pLoad();
        await this.compFeat.pLoad();
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
        let newActivePanel = null;
        let tabIx = 0;
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

        switch(tabName){
            case "race": newActivePanel = this.tabRace; tabIx = 1; break;
            case "abilities": newActivePanel = this.tabAbilities; tabIx = 2; break;
            case "background": newActivePanel = this.tabBackground; tabIx = 3; break;
            case "startingEquipment": newActivePanel = this.tabEquipment; tabIx = 4; break;
            case "shop": newActivePanel = this.tabShop; tabIx = 5; break;
            case "spells": newActivePanel = this.tabSpells; tabIx = 6; break;
            case "feats": newActivePanel = this.tabFeats; tabIx = 7; break;
            case "description": newActivePanel = this.tabDescription; tabIx = 8; break;
            case "sheet": newActivePanel = this.tabSheet; tabIx = 9; break;
            default: newActivePanel = this.tabClass; tabIx = 0; break;
        }
        const pressedBtn = this.tabButtonParent.children().eq(tabIx);
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
      if(!result || result.length < 1){return;}

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
      console.error("Failed to load character with uid ", uid);
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
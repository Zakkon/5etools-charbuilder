//#region Base Components
class ActorCharactermancerBaseComponent extends BaseComponent {
    get state() {return this._state; }
    addHookBase(prop, hook) {
      this._addHookBase(prop, hook);
    }
    proxyAssignSimple(hookProp, toObj, isOverwrite) {
      return this._proxyAssignSimple(hookProp, toObj, isOverwrite);
    }
    /**Simply creates a property out of an index, to use for asking _state for information */
    static class_getProps(ix) {
    return {
        'propPrefixClass': 'class_' + ix + '_',
        'propIxClass': "class_" + ix + "_ixClass",
        'propPrefixSubclass': "class_" + ix + "_subclass_",
        'propIxSubclass': "class_" + ix + "_subclass_ixSubclass",
        'propCntAsi': "class_" + ix + "_cntAsi",
        'propCurLevel': "class_" + ix + "_curLevel",
        'propTargetLevel': "class_" + ix + "_targetLevel"
      };
    }
    //This is static! Make sure to clear this once we switch viewed character
    static deletedClassIndices = [];
    
    /**
     * Returns true if a class with this index has been marked as deleted.
     * @param {number} ix
     * @returns {boolean}
     */
    static class_isDeleted(ix){
        return this.deletedClassIndices.includes(ix);
    }
    static class_clearDeleted(){
        this.deletedClassIndices = []
    }
    _shared_renderEntity_stgOtherProficiencies({
        $stg: element,
        ent: entity,
        propComp: propComp,
        propProficiencies: propProf,
        title: title,
        CompClass: CompClass,
        propPathActorExistingProficiencies: propPathActorExistingProficiencies,
        fnGetExistingFvtt: fnGetExistingFvtt,
        fnGetMappedProficiencies: fnGetMappedProficiencies
        }) {
        element.empty();
        this._parent.featureSourceTracker_.unregister(this[propComp]);
        if (entity && entity[propProf]) {
            element.showVe().append("<hr class=\"hr-2\"><div class=\"bold mb-2\">" + title + "</div>");
            const existingFvtt = fnGetExistingFvtt ? fnGetExistingFvtt(this._actor) : {
                [propProf]: MiscUtil.get(this._actor, '_source', ...propPathActorExistingProficiencies)
            };
            this[propComp] = new CompClass({
                'featureSourceTracker': this._parent.featureSourceTracker_,
                'existing': CompClass.getExisting(existingFvtt),
                'existingFvtt': existingFvtt,
                'available': fnGetMappedProficiencies ? fnGetMappedProficiencies(entity[propProf], propProf) : entity[propProf]
            });
            this[propComp].render(element);
        }
        else { element.hideVe(); this[propComp] = null; }
    }
    _shared_renderEntity_stgDiDrDvCi({
      $stg: $stg,
      ent: ent,
      propComp: propComp,
      CompClass: compClass,
      title: title,
      propRaceData: propRaceData,
      propTraits: propTraits
    }) {
      $stg.empty();
      if (ent && ent[propRaceData]) {
        $stg.showVe().append("<hr class=\"hr-2\"><div class=\"bold mb-2\">" + title + "</div>");
        const actorRaceData = {[propRaceData]: MiscUtil.get(this._actor, "_source", "system", "traits", propTraits)};
        this[propComp] = new compClass({
          existing: compClass.getExisting(actorRaceData),
          existingFvtt: actorRaceData,
          available: ent[propRaceData]
        });
        this[propComp].render($stg);
      }
      else {
        $stg.hideVe();
        this[propComp] = null;
      }
    }

    /**
     * @param {string} type
     * @param {{name:string, source:string}} item
     * @returns {any}
     */
    matchItemToData(type, item){
        const handleStrangeResults = (matches) => {
            if(matches.length > 1){console.error("Found more than 1 instance of ", (item.name + "_"+item.source).toLowerCase(), "in data ", type);}
            else if(matches.length < 1){console.error("Could not find item", (item.name + "_"+item.source).toLowerCase(), "in data ", type);}
        }
        switch(type){
            case "background": {
                const matches = this._data[type].filter((it) => it.name == item.name && it.source == item.source);
                handleStrangeResults(matches);
                return matches[0] || null;
            }
            default: {
                console.error("Not implemented");
                return null;
            }
        }
    }
}
//#endregion

//#region Charactermancer Class
class ActorCharactermancerClass extends ActorCharactermancerBaseComponent {
    _data;
    _tabClass;
    _actor;

    /**
     * @param {{parent:CharacterBuilder}} parentInfo
     * @returns {any}
     */
    constructor(parentInfo) {
      parentInfo = parentInfo || {};
      super();
      this._actor = parentInfo.actor;
      this._data = parentInfo.data; //data is an object containing information about all classes, subclasses, feats, etc
      this._parent = parentInfo.parent;
      this._tabClass = parentInfo.tabClass;
      this._modalFilterClasses = new ModalFilterClasses({
        namespace: "ActorCharactermancer.classes", allData: this._data.class
      });
      this._metaHksClassStgSubclass = [];
      this._compsClassStartingProficiencies = [];
      this._compsClassHpIncreaseMode = [];
      this._compsClassHpInfo = [];
      this._compsClassLevelSelect = [];
      this._compsClassFeatureOptionsSelect = [];
      this._compsClassSkillProficiencies = [];
      this._compsClassToolProficiencies = [];
      this._metaHksClassStgSkills = [];
      this._metaHksClassStgTools = [];
      this._metaHksClassStgStartingProficiencies = [];
      this._$wrpsClassTable = [];
      this._existingClassMetas = [];

    }
    async render() {
        let wrptab = this._tabClass?.$wrpTab;
        if (!wrptab) { return; }
        let classChoiceElement = $(`<div class="ve-flex-col w-100 h-100 px-1 pt-1 overflow-y-auto ve-grow veapp__bg-foundry"></div>`);
        let sidebarElement = $(`<div class="ve-flex-col w-100 h-100 px-1 overflow-y-auto ve-grow veapp__bg-foundry"></div>`);
        for (let i = 0; i < this._state.class_ixMax + 1; ++i) {
          await this._class_renderClass(classChoiceElement, sidebarElement, i);
        }
        //Fire a pulse change whenever primary class is switched
        this._addHookBase("class_ixPrimaryClass", () => this._state.class_pulseChange = !this._state.class_pulseChange);
  
        //ADD CLASS BUTTON
        const addClassBtn = $(`<button class="btn btn-default btn-5et btn-sm">Add Another Class</button>`)
        .click(() => {
          this._class_renderClass(classChoiceElement, sidebarElement, ++this._state.class_ixMax);
        });
  
  
        let o = $$`<div class="ve-flex w-100 h-100">
        <div class="ve-flex-col w-100">
            ${classChoiceElement}
            <div class="mt-2">${addClassBtn}</div>
        </div>
        <div class="vr-1"></div>
        ${sidebarElement}
        </div>`.appendTo(wrptab);
    }
    async _class_renderClass(parentDiv_left, parentDiv_right, ix) {
        //Main properties for asking our _state for information on this class
        const {
            propPrefixClass: propPrefixClass,
            propIxClass: propIxClass,
            propPrefixSubclass: propPrefixSubclass,
            propIxSubclass: propIxSubclass,
            propCntAsi: propCntAsi,
            propCurLevel: propCurLevel,
            propTargetLevel: propTargetLevel
        } = ActorCharactermancerBaseComponent.class_getProps(ix);
        const filter_evnt_valchange_class = FilterBox.EVNT_VALCHANGE + ".class_" + ix + "_classLevels";
        const filter_evnt_valchange_subclass = FilterBox.EVNT_VALCHANGE + ".class_" + ix + "_subclass";

        const {
            lockChangeClass: lockChangeClass,
            lockChangeSubclass: lockChangeSubclass,
            lockRenderFeatureOptionsSelects: lockRenderFeatureOptionsSelects
        } = this.constructor._class_getLocks(ix);

        this._addHookBase(propIxClass, () => this._state.class_pulseChange = !this._state.class_pulseChange);
        //TEMPFIX, add a hook for when subclass is changed. This is so sheets can sense when we change subclass
        this._addHookBase(propIxSubclass, () => this._state.class_pulseChange = !this._state.class_pulseChange);

        //Create a searchable select field for choosing a class
        const {
            $wrp: wrapper, //Wrapper DOM for the dropdown menu DOM object
            $iptDisplay: inputDisplay, //a function that returns the visible name of a class that you provide the index for
            $iptSearch: inputSearch,
            fnUpdateHidden: fnUpdateHidden
        } = ComponentUiUtil.$getSelSearchable(this, propIxClass, {
            values: this._data.class.map((key, val) => val), //Think this is just the ix's of the classes
            isAllowNull: true,
            fnDisplay: clsIx => {
                //Using a simple index, ask _data for the class
            const cls = this.getClass_({ix: clsIx });
            if (!cls) {
                console.warn(...LGT, "Could not find class with index " + clsIx + " (" + this._data.class.length + " classes were available)");
                return '(Unknown)';
            }
            //Then return what should be the displayed name
            return cls.name + " " + (cls.source !== Parser.SRC_PHB ? '[' + Parser.sourceJsonToAbv(cls.source) + ']' : '');
            },
            fnGetAdditionalStyleClasses: classIx => {
                if (classIx == null) { return null; }
                const cls = this.getClass_({ix: classIx});
                if (!cls) { return; }
                return cls._versionBase_isVersion ? ['italic'] : null;
            },
            asMeta: true,
            isDisabled: this._class_isClassSelectionDisabled({ix: ix })
        });

        inputDisplay.addClass("bl-0");
        inputSearch.addClass("bl-0");

        const updateHiddenClasses = () => {
            const filterValues = this._modalFilterClasses.pageFilter.filterBox.getValues();
            const classes = this._data.class.map(cls => !this._modalFilterClasses.pageFilter.toDisplay(filterValues, cls));
            fnUpdateHidden(classes, false);
        };

        /**
         * Apply the filter on which subclasses can be picked from the dropdown menu
         */
        const applySubclassFilter = () => {
            const cls = this.getClass_({propIxClass: propIxClass});
            if (!cls || !this._metaHksClassStgSubclass[ix]) { return; }
            const filteredValues = this._modalFilterClasses.pageFilter.filterBox.getValues();
            const displayableSubclasses = cls.subclasses.map(val => !this._modalFilterClasses.pageFilter.toDisplay(filteredValues, val));
            this._metaHksClassStgSubclass[ix].fnUpdateHidden(displayableSubclasses, false);
        };

        if(SETTINGS.FILTERS){
            this._modalFilterClasses.pageFilter.filterBox.on(FilterBox.EVNT_VALCHANGE, () => updateHiddenClasses());
            updateHiddenClasses();
        }
        //Filter button and what happens when we click it
        const filterBtn = $("<button class=\"btn btn-xs btn-default btn-5et h-100 btr-0 bbr-0 pr-2\" title=\"Filter for Class and Subclass\"><span class=\"glyphicon glyphicon-filter\"></span> Filter</button>")
        .click(async () => {
            const cls = this.getClass_({propIxClass: propIxClass });
            const subcls = this.getSubclass_({cls: cls, propIxSubclass: propIxSubclass});
            const classSelectDisabled = this._class_isClassSelectionDisabled({ ix: ix });
            const subclassSelectDisabled = this._class_isSubclassSelectionDisabled({ ix: ix });
            const userSelection = await this._modalFilterClasses.pGetUserSelection({
                selectedClass: cls,
                selectedSubclass: subcls,
                isClassDisabled: classSelectDisabled,
                isSubclassDisabled: subclassSelectDisabled
            });
            if (classSelectDisabled && subclassSelectDisabled) {
            return;
            }
            if (userSelection == null || !userSelection.class) {
            return;
            }
            const class_index = this._data.class.findIndex(ix => ix.name === userSelection.class.name && ix.source === userSelection['class'].source);
            if (!~class_index) { throw new Error("Could not find selected class: " + JSON.stringify(userSelection["class"])); }
            this._state[propIxClass] = class_index;
            await this._pGate(lockChangeClass);

            if (userSelection.subclass != null) {
                const cls = this.getClass_({
                    propIxClass: propIxClass
                });
                const subcls_index = cls.subclasses.findIndex(ix => ix.name === userSelection.subclass.name && ix.source === userSelection.subclass.source);
                if (!~subcls_index) { throw new Error("Could not find selected subclass: " + JSON.stringify(userSelection.subclass)); }
                this._state[propIxSubclass] = subcls_index;
            }
            else { this._state[propIxSubclass] = null; }
        });

        //#region Render Class
        const renderClassComponents = async doClearState => {
            if(SETTINGS.FILTERS){this._modalFilterClasses.pageFilter.filterBox.off(filter_evnt_valchange_subclass);}
            //FIXME SET STATE!
            if (doClearState) {
                const toObj = Object.keys(this.__state).filter(propName => 
                    propName.startsWith(propPrefixClass) && propName !== propIxClass).mergeMap(p => ({
                    [p]: null
                }));
                this._proxyAssignSimple("state", toObj);
            }
            //First time this function is called, we will probably not get anything out of getClass since we haven't set anything to _state yet
            const cls = this.getClass_({propIxClass: propIxClass});

            const subcls = this.getSubclass_({ cls: cls, propIxSubclass: propIxSubclass });

            //Render the dropdown for choosing a subclass
            this._class_renderClass_stgSelectSubclass({
                $stgSelectSubclass: holder_selectSubclass,
                cls: cls,
                ix: ix,
                propIxSubclass: propIxSubclass,
                idFilterBoxChangeSubclass: filter_evnt_valchange_subclass,
                doApplyFilterToSelSubclass: applySubclassFilter
            });
            this._class_renderClass_stgHpMode({
                $stgHpMode: holder_hpMode,
                ix: ix,
                cls: cls
            });
            this._class_renderClass_stgHpInfo({
                $stgHpInfo: holder_hpInfo,
                ix: ix,
                cls: cls
            });
            //Element that shows which proficiencies we always start with (usually weapons and armor)
            this._class_renderClass_stgStartingProficiencies({
                $stgStartingProficiencies: holder_startingProf,
                ix: ix,
                cls: cls
            });

            //Now create the level select UI
            await this._class_renderClass_pStgLevelSelect({
                $stgLevelSelect: holder_levelSelect,
                $stgFeatureOptions: holder_featureOptions,
                ix: ix,
                cls: cls,
                sc: subcls,
                propIxSubclass: propIxSubclass,
                propCurLevel: propCurLevel,
                propTargetLevel: propTargetLevel,
                propCntAsi: propCntAsi,
                lockRenderFeatureOptionsSelects: lockRenderFeatureOptionsSelects,
                idFilterBoxChangeClassLevels: filter_evnt_valchange_class
            });
            this._state.class_totalLevels = this.class_getTotalLevels();

            //Create the element that lets us choose skill proficiencies
            this._class_renderClass_stgSkills({ $stgSkills: holder_skills, ix: ix, propIxClass: propIxClass });

            //Create the element that lets us choose tool proficiencies
            this._class_renderClass_stgTools({ $stgTools: holder_tools, ix: ix, propIxClass: propIxClass })

            //Create the element that handles drawing info about our class
            await this._class_renderClass_pDispClass({
                ix: ix,
                $dispClass: holder_dispClass,
                cls: cls,
                sc: subcls
            });
            //Also clear the element that displays info about our subclass
            disp_subclass.empty();
        };

        const renderClassComponents_safe = async doClearState => {
            try {
                await this._pLock(lockChangeClass);
                await renderClassComponents(doClearState);
            }
            finally { this._unlock(lockChangeClass); }
        };

        //Add a hook so that when propIxClass changes, we try to render the class components again
        this._addHookBase(propIxClass, renderClassComponents_safe);
        //#endregion

        //#region Render Subclass
        const renderSubclassComponents = async () => {
            if(SETTINGS.FILTERS){this._modalFilterClasses.pageFilter.filterBox.off(filter_evnt_valchange_subclass);}
            const toObj = Object.keys(this.__state).filter(prop => prop.startsWith(propPrefixSubclass) && prop !== propIxSubclass).mergeMap(key => ({
            [key]: null
            }));
            this._proxyAssignSimple("state", toObj);
            const cls = this.getClass_({ propIxClass: propIxClass });
            const subcls = this.getSubclass_({ cls: cls, propIxSubclass: propIxSubclass });
            const filteredFeatures = this._class_getFilteredFeatures(cls, subcls);
            if (this._compsClassLevelSelect[ix]) { this._compsClassLevelSelect[ix].setFeatures(filteredFeatures); }

            //Re-render feature options select, since we changed subclass
            await this._class_pRenderFeatureOptionsSelects({
                ix: ix,
                propCntAsi: propCntAsi,
                filteredFeatures: filteredFeatures,
                $stgFeatureOptions: holder_featureOptions,
                lockRenderFeatureOptionsSelects: lockRenderFeatureOptionsSelects
            });
            if(SETTINGS.FILTERS){this._modalFilterClasses.pageFilter.filterBox.on(filter_evnt_valchange_subclass, () => applySubclassFilter());}
            applySubclassFilter();
            //Render the text for the subclass on the right-side panel
            await this._class_renderClass_pDispSubclass({
                ix: ix,
                $dispSubclass: disp_subclass,
                cls: cls,
                sc: subcls
            });
        };
        const renderSubclass_safe = async () => {
            try {
                await this._pLock(lockChangeClass); //Use the same lock as for change class, otherwise they can run on top of eachother and cause chaos
                await renderSubclassComponents();
            }
            finally {
                await this._unlock(lockChangeClass);
            }
        };
        this._addHookBase(propIxSubclass, renderSubclass_safe);
        //#endregion

        //Create parent objects to hold subcomponents, hide the later ones
        const header = $("<div class=\"bold\">Select a Class</div>");
        const holder_selectSubclass = $(`<div class="ve-flex-col w-100"></div>`).hideVe();
        const holder_hpMode = $(`<div class="ve-flex-col"></div>`).hideVe();
        const holder_hpInfo = $(`<div class="ve-flex-col"></div>`).hideVe();
        const holder_startingProf = $(`<div class="ve-flex-col"></div>`).hideVe();
        const holder_levelSelect = $(`<div class="ve-flex-col"></div>`).hideVe();
        const holder_featureOptions = $(`<div class="ve-flex-col"></div>`).hideVe();
        const holder_skills = $(`<div class="ve-flex-col"></div>`).hideVe();
        const holder_tools = $(`<div class="ve-flex-col"></div>`).hideVe();

        let primaryBtn = null;
        let removeClassBtn = null;
        if (!this._existingClassMetas.length || !SETTINGS.LOCK_EXISTING_CHOICES) {
            primaryBtn = $("<button class=\"btn btn-default btn-5et btn-xs mr-2\"></button>").click(() => this._state.class_ixPrimaryClass = ix);
            const primaryBtnHook = () => {
                primaryBtn.text(this._state.class_ixPrimaryClass === ix ? "Primary Class" : "Make Primary")
                .title(this._state.class_ixPrimaryClass === ix ? "This is your primary class, i.e. the one you chose at level 1 for the purposes of proficiencies/etc." 
                : "Make this your primary class, i.e. the one you chose at level 1 for the purposes of proficiencies/etc.")
                .prop("disabled", this._state.class_ixPrimaryClass === ix);
            };
            this._addHookBase("class_ixPrimaryClass", primaryBtnHook);
            primaryBtnHook();

           removeClassBtn = $("<button class=\"btn btn-default btn-5et btn-xs mr-2\"></button>").click(() => {console.log("Remove class " + ix);

                this.wipeClassState(ix);
                //Honestly, we might just have to re-render all the class components
                //If we delete class of index 1, that means class of index 2 should become 1, and that breaks so many hooks
                //A better approach could just be to mark index 1 as unused. When the character is serialized, THEN we rearrange indices
                classChoicePanelsWrapper.remove();
            });
            const removeClassBtnHook = () => {
                removeClassBtn.text("Remove Class")
                .title(this._state.class_ixPrimaryClass === ix ? "Cannot remove your primary class." 
                : "Remove this class and all features and abilities gained from it.")
                .prop("disabled", this._state.class_ixPrimaryClass === ix);
            };
            this._addHookBase("class_ixPrimaryClass", removeClassBtnHook);
            removeClassBtnHook();
        }

       

        const minimizerToggle = $("<div class=\"py-1 clickable ve-muted\">[‒]</div>").click(() => {
            const isMinimized = minimizerToggle.text() === '[+]';
            minimizerToggle.text(isMinimized ? "[‒]" : "[+]");
            if (isMinimized) {
            header.text("Select a Class");
            } else {
            const cls = this.getClass_({'propIxClass': propIxClass});
            const subcls = this.getSubclass_({
                'cls': cls,
                'propIxSubclass': propIxSubclass
            });
            if (cls) { header.text('' + cls.name + (subcls ? " (" + subcls.name + ')' : ''));}
            else { header.text("Select a Class"); }
            }
            classChoicePanels.toggleVe();
        });
        
        const holder_dispClass = $(`<div class="ve-flex-col w-100"></div>`);
        const disp_subclass = $(`<div class="ve-flex-col w-100"></div>`);

        const classChoicePanels = $$`<div class="ve-flex-col w-100 mt-2">
            <div class="ve-flex btn-group w-100">
                <div class="ve-flex no-shrink">
                    ${filterBtn}
                </div>
                <div class="ve-flex-col w-100">
                    ${wrapper}
                    ${holder_selectSubclass}
                </div>
            </div>
            ${holder_hpMode}
            ${holder_hpInfo}
            ${holder_startingProf}
            ${holder_skills}
            ${holder_tools}
            ${holder_levelSelect}
            ${holder_featureOptions}
        </div>`;

        const classChoicePanelsWrapper = $$`<div class="ve-flex-col">
            ${ix>0? `<hr class=\"hr-3 hr--heavy\">`:''}
            <div class="split-v-center">
                ${header}
                <div class="ve-flex-v-center">
                    ${removeClassBtn}
                    ${primaryBtn}
                    ${minimizerToggle}
                </div>
            </div>

            ${classChoicePanels}
        </div>`;
        classChoicePanelsWrapper.appendTo(parentDiv_left);

        //Sidebar display (class text info)
        const sidebarContent = $$`<div>
            ${ix>0?'<hr\x20class=\x22hr-2\x20hr--heavy\x22>':''}

            ${holder_dispClass}
            ${disp_subclass}
        </div>`.appendTo(parentDiv_right);

        const onHookPulse = () => { 
            //If class is marked as deleted, then hide the ui
            if(ActorCharactermancerBaseComponent.class_isDeleted(ix)){
                sidebarContent.hideVe();
            }
        }
        this._parent.compClass.addHookBase("class_pulseChange", onHookPulse);

        //TEMPFIX
        //renderClassComponents_safe().then(() => renderSubclass_safe()).then(() => this._test_tryLoadFOS(ix));
        await renderClassComponents_safe();
        await renderSubclass_safe();
    }

    get modalFilterClasses() {
      return this._modalFilterClasses;
    }
    get compsClassStartingProficiencies() {
      return this._compsClassStartingProficiencies;
    }
    get compsClassHpIncreaseMode() {
      return this._compsClassHpIncreaseMode;
    }
    get compsClassLevelSelect() {
      return this._compsClassLevelSelect;
    }
    /**
     * @returns {Charactermancer_FeatureOptionsSelect[][]}
     */
    get compsClassFeatureOptionsSelect() {
      return this._compsClassFeatureOptionsSelect;
    }

    /**
     * @returns {Charactermancer_OtherProficiencySelect[]}
     */
    get compsClassSkillProficiencies() {
      return this._compsClassSkillProficiencies;
    }
    get compsClassToolProficiencies() {
      return this._compsClassToolProficiencies;
    }
    get existingClassMetas() {
      return this._existingClassMetas;
    }
    /**Load some information prior to first rendering. Just to do with loading from the modal and loading existing data from actor */
    async pLoad() {
      await this._modalFilterClasses.pPreloadHidden();
      if(this._actor){await this._doHandleExistingClassItems(this._actor.classes);}
    }
    async setStateFromSaveFile(actor){
        //Some of this loading logic has been moved to pLoad, which runs right before render
        for (let ix = 0; ix < this._state.class_ixMax + 1; ++ix) {
            await this.loadFeatureOptionsSelectFromState(ix); //needs to be async so FOS components have time to create their subcpomponents
        }
    }
    /**
     * @param {{name:string, source:string, hash:string, isPrimary:boolean, subclass:{name:string, source:string, hash:string}}[]} classes
     * @returns {any}
     */
    async _doHandleExistingClassItems(classes){

        if(!classes){return;}
        //Collect metas
        this._existingClassMetas = classes.map(cls => {
            const _clsIx = this.getExistingClassIndex(cls);
            const _scIx = this.getExistingSubclassIndex(_clsIx, cls.subclass);
            const isPrimaryClass = cls.isPrimary || false;

            const failMatchCls = _clsIx>=0 ? null : "Could not find class \"" + cls.name + "\" (\"" 
                + UtilDocumentSource.getDocumentSourceDisplayString(cls) + "\") in loaded data. " + Charactermancer_Util.STR_WARN_SOURCE_SELECTION;
            if (failMatchCls) {
                //ui.notifications.warn(failMatchCls);
                console.warn(...LGT, failMatchCls, "Strict source matching is: " + Config.get("import", "isStrictMatching") + '.');
            }
            const failMatchSc = _scIx>=0 ? null : "Could not find subclass \"" + cls.subclass.name + "\" in loaded data. " + Charactermancer_Util.STR_WARN_SOURCE_SELECTION;
            if (failMatchSc) {
                //ui.notifications.warn(failMatchSc);
                console.warn(...LGT, failMatchSc, "Strict source matching is: " + Config.get("import", "isStrictMatching") + '.');
            }

            //Should be (class level - 1) or 0, whichever is higher
            const classLevel = Math.max((cls.level||0) - 1, 0); //Keep in mind that our save file schema currently stores levels with base 1, whereas in this program we could 0 as lvl 1
            //Create one ExistingClassMeta per class
            return new ActorCharactermancerClass.ExistingClassMeta({
                item: cls, //Class data object
                ixClass: _clsIx, //index of this class
                isUnknownClass: _clsIx < 0,//!~_clsIx,
                ixSubclass: _scIx, //index of the subclass
                isUnknownSubclass: _scIx != null && _scIx < 0,//_scIx == null && !~_scIx,
                level: classLevel, //level
                isPrimary: isPrimaryClass, //is this the primary class?
                //TEMPFIX 'spellSlotLevelSelection': cls?.flags?.[SharedConsts.MODULE_ID]?.['spellSlotLevelSelection']
            });
        });

        const VERIFY_CLASS_SANITY = true;
        if(VERIFY_CLASS_SANITY){
             //Do a pass to remove any unknown classes
            for(let i = 0; i < this._existingClassMetas.length; ++i){
                const meta = this._existingClassMetas[i];
                if(meta.isUnknownClass){
                    //Wipe this from the class list
                    this._existingClassMetas.splice(i);
                    continue;
                }
                else if(meta.isUnknownSubclass){
                    //Reset the subclass index
                    //meta.ixSubclass = null;
                    //To avoid a lot of work, we're just going to wipe the entire class instead
                    //It's theoretically possible to just wipe the subclass, but it requres a lot of bugfixing
                    this._existingClassMetas.splice(i);
                    continue;
                }
            }
            //Let's verify that we still have a primary class
            let hasPrimaryClass = false;
            for(let i = 0; i < this._existingClassMetas.length; ++i){
                if(this._existingClassMetas[i].isPrimary){hasPrimaryClass = true;}
            }
            if(!hasPrimaryClass && this._existingClassMetas.length > 0){
                //Some class *has* to be the primary class
                console.warn("No primary class found, setting class 0("+this._existingClassMetas[0].item.name+" lvl "+this._existingClassMetas[0].level+") to primary");
                this._existingClassMetas[0].isPrimary = 0;
            }
        }
       


        if (!this._existingClassMetas.length) { return; }
      
        //Write to state
        this._state.class_ixMax = this._existingClassMetas.length - 1;
        for (let i = 0; i < this._existingClassMetas.length; ++i) {
            const meta = this._existingClassMetas[i];
            const { propIxClass: propIxClass, propIxSubclass: propIxSubclass } = ActorCharactermancerBaseComponent.class_getProps(i);
            await this._pDoProxySetBase(propIxClass, meta.ixClass);
            await this._pDoProxySetBase(propIxSubclass, meta.ixSubclass);
            if (meta.isPrimary) { this._state.class_ixPrimaryClass = i; }
        }
        //Set first class as primary, if none is marked already
        if (!this._existingClassMetas.some(meta => meta.isPrimary)) { this._state.class_ixPrimaryClass = 0; }

        //Prepare some data for FeatureOptionsSelect components to load into their state (only once) after first render
        if(SETTINGS.USE_EXISTING_WEB){
            this.loadedSaveData_FeatureOptSel = [];
            for(let classIndex = 0; classIndex < classes.length; ++classIndex){
                const cls = classes[classIndex];
                if(!cls.featureOptSel){ this.loadedSaveData_FeatureOptSel.push(null); continue;}
                this.loadedSaveData_FeatureOptSel.push(cls.featureOptSel);
            }
        }
    }
    async pLoadLate(){
        
    }
    /**
     * @param {any} cls
     * @returns {number} Returns index of class. Returns -1 on failure
     */
    getExistingClassIndex(cls){
        if (cls.source && cls.hash) {
            const ix = this._data.class.findIndex(ourDataClass => cls.source === ourDataClass.source
                && cls.hash === UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_CLASSES](ourDataClass));
            if (ix>=0) { return ix; }
        }
        //const _classNameLower = cls.name.toLowerCase().trim(); //(IntegrationBabele.getOriginalName(cls) || '').toLowerCase().trim();

        //FALLBACK 1
        /* const clsIndex = this._data.class.findIndex(ourDataClass => {
            return _classNameLower === ourDataClass.name.toLowerCase().trim() &&
            (!Config.get("import", "isStrictMatching") ||
            (UtilDocumentSource.getDocumentSource(cls).source || '').toLowerCase() === Parser.sourceJsonToAbv(ourDataClass.source).toLowerCase());
        });
        if (~clsIndex) { return clsIndex; } */

        return this._data.class.findIndex(c => c.name.toLowerCase().trim() === cls.name.toLowerCase().trim());

        //return false;

        //FALLBACK 2
        /* const filteredName = /^(.*?)\(.*\)$/.exec(_classNameLower);
        if (!filteredName) { return -1; }
        return this._data.class.findIndex(_cls => {
            return filteredName[1].trim() === _cls.name.toLowerCase().trim()
            && (!Config.get("import", "isStrictMatching") ||
            (UtilDocumentSource.getDocumentSource(cls).source || '').toLowerCase() === Parser.sourceJsonToAbv(_cls.source).toLowerCase());
        }); */
    }
     /**
     * @param {number} classIx
     * @param {any} subclass
     * @returns {number} Returns index of subclass. Returns -1 on failure
     */
    getExistingSubclassIndex(classIx, subclass) {
        if (!subclass || !~classIx) { return null; }
        const ourDataClass = this._data.class[classIx]; //Grab our class from data
        if (subclass.source && subclass.hash) {
          const subclassIx = ourDataClass.subclasses.findIndex(ourDataSubclass => subclass.source === ourDataSubclass.source
            && subclass.hash === UrlUtil.URL_TO_HASH_BUILDER.subclass(ourDataSubclass));
          if (~subclassIx) { return subclassIx; }
        }
        //FALLBACK
        /* return ourDataClass.subclasses.findIndex(sc => 
            (IntegrationBabele.getOriginalName(subclass) || '').toLowerCase().trim() 
            === sc.name.toLowerCase().trim() && (!Config.get("import", 'isStrictMatching') 
            || (UtilDocumentSource.getDocumentSource(subclass).source || '').toLowerCase() 
            === Parser.sourceJsonToAbv(sc.source).toLowerCase())); */

        return ourDataClass.subclasses.findIndex(sc => sc.name.toLowerCase().trim() === subclass.name.toLowerCase().trim());
    }
    //#endregion
    getExistingClassTotalLevels_() {
        if(!this.existingClassMetas?.length){return 0;}
        return this._existingClassMetas.filter(Boolean).map(cls => cls.level).sum();
    }
    _getExistingClassCount() {
      return this._existingClassMetas.filter(Boolean).length;
    }
    /**
     * @param {number} ix used to get a class directly from cached memory (this._data[ix]). 
     * @param {string} propIxClass Used to get the class that propIxClass points to
     * @returns {any} Returns a full class object, or a stub of one if all else fails
     */
    getClass_({ix: ix, propIxClass: propIxClass}) {
      if (ix == null && propIxClass == null) { throw new Error("At least one argument must be provided!"); }
      //If a propIxClass was provived, try to get the class from this._state
      if (propIxClass != null) {
        if (this._state[propIxClass] == null) { return null;  }
        if (!~this._state[propIxClass]) { return DataConverterClass.getClassStub(); }
        return this._data.class[this._state[propIxClass]];
      }
      //Otherwise, try to get it from this._data, if we have an ix
      if (ix != null && ~ix) { return this._data.class[ix];}
      return DataConverterClass.getClassStub();
    }
    /**
     * @param {any} cls A class object
     * @param {string} propIxSubclass
     * @param {number} ix optional, only used if propIxSubclass is not provided
     * @returns {any} Returns a full subclass object, or a stub of one if all else fails
     */
    getSubclass_({ cls: cls, propIxSubclass: propIxSubclass, ix: ix })
    {
        if (ix == null && propIxSubclass == null) {
            throw new Error("At least one argument must be provided!");
        }
        if (!cls) { return null; } //We need to have the class object to continue
        if (propIxSubclass != null) {
            if (this._state[propIxSubclass] == null) { return null; }
            //If state doesnt have an entry for this prop, just return a stub
            if (!~this._state[propIxSubclass]) {
                return DataConverterClass.getSubclassStub({ 'cls': cls });
            }
            //If the class doesnt seem to have any subclasses to choose from, just return a stub
            if (!cls.subclasses?.length) {
                return DataConverterClass.getSubclassStub({ 'cls': cls });
            }
            //Now we use state to find the subclass from the class object
            return cls.subclasses[this._state[propIxSubclass]];
        }
        if (ix != null && ~ix) { return cls.subclasses[ix];  }
        return DataConverterClass.getSubclassStub({ 'cls': cls });
    }
    _class_isClassSelectionDisabled({ ix: ix }) {
        //TEMPFIX
      return SETTINGS.LOCK_EXISTING_CHOICES && !!this._existingClassMetas[ix];
    }
    _class_isSubclassSelectionDisabled({ ix: ix }) {

        //TODO: Make subclass selection be locked when class level is too low
        /* if(SETTINGS.LOCK_SUBCLASS_LOWLVL){
            const meta = this._existingClassMetas[ix];
            if(meta){
                const curLvl = meta.level; //Should perhaps be target level instead
                //Figure out what level subclass choice turns on
                //const fullClassData = 
                const classes = HelperFunctions.getClassFromData(this._data, meta.item.name, meta.item.source);
                console.log(curLvl);
                const myClass = classes[0];
                const classFeatures = myClass.classFeatures;
                let firstGainSubclassFeatureLevel = 0;
                for(let i = 0; i < classFeatures.length; ++i){
                    const f = classFeatures[i];
                    //Check if this feature gives a subclass feature, and end the loop
                    if(f.gainSubclassFeature){firstGainSubclassFeatureLevel = f.level; i=Number.MAX_VALUE;}
                }
                //Assume that the first level we gain a subclass feature is the level where we pick a subclass
                //If our current level is lower than this, we should lock the subclass selection

            }
            console.log("META", meta, this);
        } */

        //TEMPFIX
      return SETTINGS.LOCK_EXISTING_CHOICES && this._existingClassMetas[ix]
      && (this._existingClassMetas[ix].ixSubclass != null || this._existingClassMetas[ix].isUnknownClass);
    }
    
    static _class_getLocks(ix) {
      return {
        lockChangeClass: 'class_' + ix + '_pHkChangeClass',
        lockChangeSubclass: "class_" + ix + '_pHkChangeSubclass',
        lockRenderFeatureOptionsSelects: 'class_' + ix + "_renderFeatureOptionsSelects"
      };
    }
    
    _class_renderClass_stgSelectSubclass({
      $stgSelectSubclass: stgSelectSubclass,
      cls: cls,
      ix: ix,
      propIxSubclass: propIxSubclass,
      idFilterBoxChangeSubclass: idFilterBoxChangeSubclass,
      doApplyFilterToSelSubclass: doApplyFilterToSelSubclass
    }) {
        stgSelectSubclass.empty();
        if (this._metaHksClassStgSubclass[ix]) { this._metaHksClassStgSubclass[ix].unhook(); }
        //We will be looking att cls.subclasses to see which subclasses we have to choose from
        if (cls && cls.subclasses && cls.subclasses.length) {
            const uiSearchElement = ComponentUiUtil.$getSelSearchable(this, propIxSubclass, {
            values: cls.subclasses.map((a, b) => b),
            isAllowNull: true,
            fnDisplay: ix => {
                const subcls = this.getSubclass_({cls: cls, ix: ix });
                if (!subcls) {
                console.warn(...LGT, "Could not find subclass with index " + ix + " (" + cls.subclasses.length + " subclasses were available for class " + cls.name + ')');
                return '(Unknown)';
                }
                return subcls.name + " " + (subcls.source !== Parser.SRC_PHB ? '[' + Parser.sourceJsonToAbv(subcls.source) + ']' : '');
            },
            fnGetAdditionalStyleClasses: ix => {
                if (ix == null) { return null; }
                const subcls = this.getSubclass_({cls: cls, ix: ix });
                if (!subcls) { return; }
                return subcls._versionBase_isVersion ? ['italic'] : null;
            },
            asMeta: true,
            isDisabled: this._class_isSubclassSelectionDisabled({ix: ix}),
            displayNullAs: "Select a Subclass"
            });
            uiSearchElement.$iptDisplay.addClass('bl-0');
            uiSearchElement.$iptSearch.addClass("bl-0");
            this._metaHksClassStgSubclass[ix] = uiSearchElement;
            this._modalFilterClasses.pageFilter.filterBox.on(idFilterBoxChangeSubclass, () => doApplyFilterToSelSubclass());
            doApplyFilterToSelSubclass();
            const wrp = $$`<div class="ve-flex-col w-100 mt-1">${uiSearchElement.$wrp}</div>`;
            stgSelectSubclass.showVe().append(wrp);
        }
        else {
            if(cls){
                console.error("No subclasses found for class " + cls.name + ". Is the class.subclasses property not set?", cls);
            }
            
            stgSelectSubclass.hideVe();
            this._metaHksClassStgSubclass[ix] = null;
        }
    }
    
    //#region Health
    /**Create the display for the choice of HP gain mode for our class (average, roll, etc) */
    _class_renderClass_stgHpMode({
      $stgHpMode: parentElement,
      ix: ix,
      cls: cls
    }) {
      parentElement.empty();
      if (cls && Charactermancer_Class_HpIncreaseModeSelect.isHpAvailable(cls)) {
        parentElement.showVe().append("<hr class=\"hr-2\"><div class=\"bold mb-2\">Hit Points Increase Mode</div>");
        this._compsClassHpIncreaseMode[ix] = new Charactermancer_Class_HpIncreaseModeSelect();
        this._compsClassHpIncreaseMode[ix].render(parentElement);
      }
      else {
        parentElement.hideVe();
        this._compsClassHpIncreaseMode[ix] = null;
      }
    }
    /**Create the display for how our health will look as we level up */
    _class_renderClass_stgHpInfo({
      $stgHpInfo: parentElement,
      ix: ix,
      cls: cls
    }) {
      parentElement.empty();
      if (cls && Charactermancer_Class_HpIncreaseModeSelect.isHpAvailable(cls)) {
        parentElement.showVe().append("<hr class=\"hr-2\"><div class=\"bold mb-2\">Hit Points</div>");
        this._compsClassHpInfo[ix] = new Charactermancer_Class_HpInfo({
          'className': cls.name,
          'hitDice': cls.hd
        });
        this._compsClassHpInfo[ix].render(parentElement);
      }
      else {
        parentElement.hideVe();
        this._compsClassHpInfo[ix] = null;
      }
    }
    //#endregion

    //#region Level Select
    /**Render a LevelSelect element */
    async _class_renderClass_pStgLevelSelect({
        $stgLevelSelect: ele_levelSelect,
        $stgFeatureOptions: ele_featureOptions,
        ix: ix,
        cls: cls,
        sc: sc,
        propIxSubclass: propIxSubclass,
        propCurLevel: propCurLevel,
        propTargetLevel: propTargetLevel,
        propCntAsi: propCntAsi,
        lockRenderFeatureOptionsSelects: lockRenderFeatureOptionsSelects,
        idFilterBoxChangeClassLevels: idFilterBoxChangeClassLevels
    }) {
        ele_levelSelect.empty();
        if (cls) {
            ele_levelSelect.showVe().append("<hr class=\"hr-2\"><div class=\"bold mb-2\">Select Levels</div>");
            const filteredFeatures = this._class_getFilteredFeatures(cls, sc);

            //Load existingClassMeta, or create a new one if needed
            //TEMPFIX
            const existingClassMeta = (SETTINGS.USE_EXISTING || SETTINGS.USE_EXISTING_WEB)? this._class_getExistingClassMeta(ix) : null;
            //Any level <= this will be forcefully locked in, and we cannot choose them as options Default is 0
            const maxPrevLevel = existingClassMeta?.level || 0;
            //Are we going to forcefully select a level?
            //Default is true
            //TODO: improve this, depending on if we have existingClassMeta and if SETTINGS.LOCK_EXISTING_CHOICES is true
            const isForceSelect = true; //!existingClassMeta || (this.getExistingClassTotalLevels_() === 0 && SETTINGS.LOCK_EXISTING_CHOICES);
            //Create a level select UI component
            this._compsClassLevelSelect[ix] = new Charactermancer_Class_LevelSelect({
                features: filteredFeatures,
                isRadio: true,
                isForceSelect: isForceSelect,
                maxPreviousLevel: maxPrevLevel,
                isSubclass: true
            });
            //Render it
            this._compsClassLevelSelect[ix].render(ele_levelSelect);

            //Create a hook for re-rendering it again if needed
            const e_onChangeLevelSelected = async () => {
                const subclass = this.getSubclass_({cls: cls, propIxSubclass: propIxSubclass});
                const _features = this._class_getFilteredFeatures(cls, subclass);
                //_features should have loadeds, an each in loadeds should have entity
                //some of these entity should have an entryData, but this is only for specific choice class features

                //Re-render the Feature Options Selects, since we changed level
                await this._class_pRenderFeatureOptionsSelects({
                    ix: ix,
                    propCntAsi: propCntAsi,
                    filteredFeatures: _features,
                    $stgFeatureOptions: ele_featureOptions,
                    lockRenderFeatureOptionsSelects: lockRenderFeatureOptionsSelects
                });
                this._state[propCurLevel] = this._compsClassLevelSelect[ix].getCurLevel();
                this._state[propTargetLevel] = this._compsClassLevelSelect[ix].getTargetLevel();
                this._state.class_totalLevels = this.class_getTotalLevels();
            };

            this._compsClassLevelSelect[ix].onchange(e_onChangeLevelSelected);
            await e_onChangeLevelSelected();



            if(SETTINGS.FILTERS){ //TEMPFIX
                this._modalFilterClasses.pageFilter.filterBox.on(idFilterBoxChangeClassLevels, () => {
                    if (!this._compsClassLevelSelect[ix]) { return; }
                    const subclass = this.getSubclass_({cls: cls, propIxSubclass: propIxSubclass});
                    const filteredFeatures = this._class_getFilteredFeatures(cls, subclass);
                    if (this._compsClassLevelSelect[ix]) {
                        this._compsClassLevelSelect[ix].setFeatures(filteredFeatures);
                    }
                    this._class_pRenderFeatureOptionsSelects({
                        ix: ix,
                        propCntAsi: propCntAsi,
                        filteredFeatures: filteredFeatures,
                        $stgFeatureOptions: ele_featureOptions,
                        lockRenderFeatureOptionsSelects: lockRenderFeatureOptionsSelects
                    });

                });
            }
        }
        else {
            ele_levelSelect.hideVe();
            this._compsClassLevelSelect[ix] = null;
            ele_featureOptions.empty().hideVe();
            this._class_unregisterFeatureSourceTrackingFeatureComps(ix);
            this._state[propCntAsi] = null;
            if(SETTINGS.FILTERS){this._modalFilterClasses.pageFilter.filterBox.off(idFilterBoxChangeClassLevels);}
        }
    }
    //#endregion

    //#region Skill and Tool proficiencies
    /**Create an element to display skill proficiency choices that our class gives us*/
    _class_renderClass_stgSkills({ $stgSkills: parentElement, ix: ix, propIxClass: propIxClass }) {
      this._class_renderClass_stgSkillsTools({
        '$stg': parentElement,
        'ix': ix,
        'propIxClass': propIxClass,
        'propMetaHks': "_metaHksClassStgSkills",
        'propCompsClass': '_compsClassSkillProficiencies',
        'propSystem': 'skills',
        'fnGetProfs': ({ cls: cls, isPrimaryClass: isPrimaryClass }) => {
          if (!cls) { return null; }
          return isPrimaryClass ? cls.startingProficiencies?.skills : cls.multiclassing?.proficienciesGained?.skills;
        },
        'headerText': "Skill Proficiencies",
        'fnGetMapped': Charactermancer_OtherProficiencySelect.getMappedSkillProficiencies.bind(Charactermancer_OtherProficiencySelect)
      });
    }
     /**Create an element to display tool proficiency choices that our class gives us*/
    _class_renderClass_stgTools({ $stgTools: parentElement, ix: ix, propIxClass: propIxClass }) {
      this._class_renderClass_stgSkillsTools({
        '$stg': parentElement,
        'ix': ix,
        'propIxClass': propIxClass,
        'propMetaHks': "_metaHksClassStgTools",
        'propCompsClass': '_compsClassToolProficiencies',
        'propSystem': "tools",
        'fnGetProfs': ({ cls: cls, isPrimaryClass: isPrimaryClass  }) => {
          if (!cls) { return null; }
          return isPrimaryClass ? Charactermancer_Class_Util.getToolProficiencyData(cls.startingProficiencies) : Charactermancer_Class_Util.getToolProficiencyData(cls.multiclassing?.['proficienciesGained']);
        },
        'headerText': "Tool Proficiencies",
        'fnGetMapped': Charactermancer_OtherProficiencySelect.getMappedToolProficiencies.bind(Charactermancer_OtherProficiencySelect)
      });
    }

    /**
     * Create an element to display skill or tool proficiency choices that our class gives us.
     * Use _class_renderClass_stgSkills or _class_renderClass_stgTools if you specifically know which one you want to use 
     * */
    _class_renderClass_stgSkillsTools({
        $stg: parentElement,
        ix: ix,
        propIxClass: propIxClass,
        propMetaHks: propMetaHks,
        propCompsClass: propCompsClass,
        propSystem: propSystem,
        fnGetProfs: fnGetProfs,
        headerText: headerText,
        fnGetMapped: fnGetMapped
        }) {
        
        if(SETTINGS.USE_EXISTING){
            const existingMeta = this._class_getExistingClassMeta(ix);
            if (existingMeta?.profSkillsTools) { return; }
        }
        
        if (this[propMetaHks][ix]) { this[propMetaHks][ix].unhook(); }

        const doRenderSkillsTools = () => {
            parentElement.empty();
            const cls = this.getClass_({ propIxClass: propIxClass });
            const isPrimaryClass = this._state.class_ixPrimaryClass === ix;
            this._parent.featureSourceTracker_.unregister(this[propCompsClass][ix]);
            const proficiencies = fnGetProfs({ cls: cls, isPrimaryClass: isPrimaryClass });

            if (cls && proficiencies) {
                parentElement.showVe().append("<hr class=\"hr-2\"><div class=\"bold mb-2\">" + headerText + "</div>");
                //TEMPFIX
                let existing = {};
                let existingFvtt = null;
                if (SETTINGS.USE_EXISTING && this._actor){
                    existingFvtt = { skillProficiencies: MiscUtil.get(this._actor, "_source", "system", propSystem) };
                    existing = Charactermancer_OtherProficiencySelect.getExisting(existingFvtt);
                }
                else if(SETTINGS.USE_EXISTING_WEB && this._actor){
                    //Filling in 'existing' will only mark a choice as (you already have this proficiency from another source)
                    //existing = this._actor.classes[ix].skillProficiencies.data;
                }
                //Create the component
                this[propCompsClass][ix] = new Charactermancer_OtherProficiencySelect({
                    featureSourceTracker: this._parent.featureSourceTracker_,
                    existing: existing,
                    existingFvtt: existingFvtt,
                    available: fnGetMapped(proficiencies)
                });

                this[propCompsClass][ix].render(parentElement);

                //LOAD FROM SAVE FILE
                //Set state to component AFTER first render, this way all other components have hooks set up and can react to the changes we are about to make
                if(SETTINGS.USE_EXISTING_WEB && ix < this._actor?.classes?.length){
                    //So we can set the state of the proficiency select component here
                    const comp = this[propCompsClass][ix];
                    //Make sure this is the same class
                    if(SETTINGS.TRANSFER_CHOICES || (this._actor.classes[ix].name == cls.name && this._actor.classes[ix].source == cls.source)){
                        const chooseOptions =  proficiencies[0]; //Proficiencies is an array, usually only with one entry
                        //This should be a secure way to get the options we have to pick from, regardless if it is choose from, or choose any
                        
                        if(comp._available[0].choose){
                            const numToPick = comp._available[0].choose[0].count;
                            const namesToPickFrom = comp._available[0].choose[0].from.map(n=>n.name.toLowerCase());
                            const staticNames = comp._available[0].static? comp._available[0].static.map(n=>n.name.toLowerCase()) : [];

                            let mode = "skills";
                            if(propCompsClass == "_compsClassToolProficiencies"){mode = "tools"};

                            let chosenProficiencies = {}
                            if(mode == "skills"){chosenProficiencies = this._actor.classes[ix].skillProficiencies?.data?.skillProficiencies;}
                            else if (mode == "tools"){chosenProficiencies = this._actor.classes[ix].toolProficiencies?.data?.toolProficiencies;}

                            //Its possible that one class outputs null on either tools or skills because they dont provide an option
                            const chosenNames = !!chosenProficiencies? Object.keys(chosenProficiencies) : [];
                            for(let i = 0; i < chosenNames.length; ++i){ //Not going to double-check that we aren't adding more proficiencies than numToPick
                                //Make sure we go from a {name:string} to just an array of strings, then match index
                                //push to lowercase just for simplicity
                                const profName = chosenNames[i].toLowerCase();
                                let profIx = namesToPickFrom.indexOf(profName);
                                //Make sure a match is made
                                if(profIx<0){
                                    if(staticNames.includes(profName)){
                                        continue; //This was just tool part of the static choices, no need for alarm
                                    }
                                    console.warn("Failed to match ", profName, "to any option in",
                                        namesToPickFrom);
                                }
                                else{
                                    const prop = `otherProfSelect_${ix}__isActive_${profIx}`;
                                    comp._state[prop] = true;
                                }
                            }
                        }
                        
                    }
                }

            }
            else { parentElement.hideVe(); this[propCompsClass][ix] = null; }
        };

        this._addHookBase("class_ixPrimaryClass", doRenderSkillsTools);
        this[propMetaHks][ix] = {
            'unhook': () => this._removeHookBase("class_ixPrimaryClass", doRenderSkillsTools)
        };

        doRenderSkillsTools();
    }

    /**Create the element displaying starting proficiencies for our class */
    _class_renderClass_stgStartingProficiencies({
        $stgStartingProficiencies: element, ix: ix, cls: cls}) {

        const existingClassMeta = SETTINGS.USE_EXISTING? this._class_getExistingClassMeta(ix) : null;
        if (existingClassMeta) {return;}
        if (this._metaHksClassStgStartingProficiencies[ix]) {
            this._metaHksClassStgStartingProficiencies[ix].unhook();
        }
        element.empty();

        //Our parent should be an ActorCharactermancer
        this._parent.featureSourceTracker_.unregister(this._compsClassStartingProficiencies[ix]);

        if (cls && (cls.startingProficiencies || cls.multiclassing?.proficienciesGained)) {
            element.showVe().append("<hr class=\"hr-2\"><div class=\"bold mb-2\">Proficiencies</div>");
            this._compsClassStartingProficiencies[ix] = Charactermancer_Class_StartingProficiencies.get({
                'featureSourceTracker': this._parent.featureSourceTracker_,
                'primaryProficiencies': cls.startingProficiencies,
                'multiclassProficiencies': cls.multiclassing?.proficienciesGained,
                'savingThrowsProficiencies': cls.proficiency,
                'existingProficienciesFvttArmor': MiscUtil.get(this._actor, "_source", "system", "traits", "armorProf"),
                'existingProficienciesFvttWeapons': MiscUtil.get(this._actor, '_source', "system", "traits", "weaponProf"),
                'existingProficienciesFvttSavingThrows': Charactermancer_Class_StartingProficiencies.getExistingProficienciesFvttSavingThrows(this._actor)
            });
            this._compsClassStartingProficiencies[ix].render(element);
        }
        else {
            element.hideVe();
            this._compsClassStartingProficiencies[ix] = null;
        }

        const onPrimaryClassChanged = () => {
            if (this._compsClassStartingProficiencies[ix]) {
            this._compsClassStartingProficiencies[ix].mode =
            this._state.class_ixPrimaryClass === ix ? Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY
            : Charactermancer_Class_ProficiencyImportModeSelect.MODE_MULTICLASS;
            }
        };

        this._addHookBase("class_ixPrimaryClass", onPrimaryClassChanged);
        this._metaHksClassStgStartingProficiencies[ix] = {
            'unhook': () => this._removeHookBase("class_ixPrimaryClass", onPrimaryClassChanged)
        };

        onPrimaryClassChanged();
    }
    /**
     * Each class component we're handling should have an ExistingClassMeta. This function returns the one that matches classIx. If none exists, try to create a new one.
     * @param {number} classIx
     * @returns {ActorCharactermancerClass.ExistingClassMeta}
     */
    _class_getExistingClassMeta(classIx) {
      if (this._existingClassMetas[classIx]) {return this._existingClassMetas[classIx];}
      console.warn("Creating new ExistingClassMeta. Not tested!");
      if(!this._actor){return null;}

      const {propIxClass: propIxClass } = ActorCharactermancerBaseComponent.class_getProps(classIx);

      const cls = this.getClass_({'propIxClass': propIxClass });

      const classItems = Charactermancer_Class_Util.getExistingClassItems(this._actor, cls);
      const firstItem = classItems.length ? classItems[0] : null;
      if (!firstItem) { return null; }
      return {'item': firstItem, 'level': Number(firstItem.system.levels || 0)};
    }
    //#endregion

    //#region Text Roller Display
    async _class_renderClass_pDispClass({ ix: ix, $dispClass: parentElement, cls: cls, sc: sc }) {
        if (this._$wrpsClassTable[ix]) {this._$wrpsClassTable[ix].detach(); }
        else {this._$wrpsClassTable[ix] = $("<div class=\"ve-flex-col w-100\"></div>");}
        parentElement.empty();

        if (cls) {
            //A problem is that the class.classFeatures array doesn't contain the text content that we want to display. It only has the name
            //So what we need to do is get that text information from somewhere

            const classInfo = cls._isStub ? cls : await DataLoader.pCacheAndGet("class", cls.source,
            UrlUtil.URL_TO_HASH_BUILDER["class"](cls)); //The hash will look something like 'barbarian_phb' (depending on class name and source)
            let entries = MiscUtil.copy(classInfo.classFeatures || []).flat();
            if(SETTINGS.FILTERS){entries = Charactermancer_Class_Util.getFilteredEntries_bySource(entries,
                this._modalFilterClasses.pageFilter, this._modalFilterClasses.pageFilter.filterBox.getValues());}
            else {
                //if we dont use the filters (the intended method), the 'entries' array is hidden deep within loadeds
                //we can still use that entries array, but for simplicities sake we can just get the raw classfeatures again
                entries = ContentGetter.getFeaturesFromClass(cls);
            }
            
            const toRender = { 'type': "section", 'entries': entries};
            this._class_renderEntriesSection(parentElement, cls.name, toRender, { '$wrpTable': this._$wrpsClassTable[ix] });
            //Render the class table
            await this._class_renderClass_pClassTable({ 'ix': ix, 'cls': cls, 'sc': sc });
        }
    }
    async _class_renderClass_pDispSubclass({ix: ix, $dispSubclass: parentElement, cls: cls, sc: sc }) {
      parentElement.empty();
      if (sc) {
        parentElement.append("<hr class=\"hr-1\">");
        const subclassInfo = sc._isStub ? sc : await DataLoader.pCacheAndGet("subclass", sc.source, UrlUtil.URL_TO_HASH_BUILDER.subclass(sc));
        let scFeatures = MiscUtil.copy(subclassInfo.subclassFeatures).flat();
        scFeatures = Charactermancer_Class_Util.getFilteredEntries_bySource(scFeatures, this._modalFilterClasses.pageFilter, this._modalFilterClasses.pageFilter.filterBox.getValues());
        const obj = { type: "section", entries: scFeatures };
        if (obj.entries[0] && obj.entries[0].name) { delete obj.entries[0].name; }
        this._class_renderEntriesSection(parentElement, sc.name, obj);
      }
      await this._class_renderClass_pClassTable({
        'ix': ix,
        'cls': cls,
        'sc': sc
      });
    }
    async _class_renderClass_pClassTable({ ix: ix, cls: cls, sc: sc }) {
      const classInfo = cls ? cls._isStub ? cls : await DataLoader.pCacheAndGet('class', cls.source, UrlUtil.URL_TO_HASH_BUILDER["class"](cls)) : null;
      const subclassInfo = sc ? sc._isStub ? sc : await DataLoader.pCacheAndGet("subclass", sc.source, UrlUtil.URL_TO_HASH_BUILDER.subclass(sc)) : null;
      const features = classInfo?.["classFeatures"] || subclassInfo?.["subclassFeatures"] ? this._modalFilterClasses.pageFilter.filterBox.getValues() : null;
      if (classInfo?.["classFeatures"]) {
        classInfo.classFeatures = classInfo.classFeatures.map(f => {
          f = MiscUtil.copy(f);
          f = Charactermancer_Class_Util.getFilteredEntries_bySource(f, this._modalFilterClasses.pageFilter, features);
          return f;
        });
      }
      if (subclassInfo?.["subclassFeatures"]) {
        subclassInfo.subclassFeatures = subclassInfo.subclassFeatures.map(f => {
          f = MiscUtil.copy(f);
          f = Charactermancer_Class_Util.getFilteredEntries_bySource(f, this._modalFilterClasses.pageFilter, features);
          return f;
        });
      }
      const table = DataConverterClass.getRenderedClassTableFromDereferenced(classInfo, subclassInfo);
      this._$wrpsClassTable[ix].html('').fastSetHtml(table);
    }
    _class_renderEntriesSection(parentElement, cls, toRender, { $wrpTable = null } = {}) {
        const minimizeButton = $("<div class=\"py-1 pl-2 clickable ve-muted\">[‒]</div>").click(() => {
            minimizeButton.text(minimizeButton.text() === '[+]' ? '[‒]' : "[+]");
            if ($wrpTable) { $wrpTable.toggleVe(); }
            displayedElement.toggleVe();
        });
        const displayedElement = Renderer.hover.$getHoverContent_generic(toRender);
        $$`<div class="ve-flex-col">
                <div class="split-v-center">
                    <div class="rd__h rd__h--0"><div class="entry-title-inner">${(cls || '').qq()}</div></div>
                    ${minimizeButton}
                </div>
                ${$wrpTable}
                ${displayedElement}
        </div>`.appendTo(parentElement);
    }
    //#endregion

    /**Get the features of our current class and subclass */
    _class_getFilteredFeatures(cls, sc) {
        if (!cls) {return [];}
        cls = MiscUtil.copy(cls);
        cls.subclasses = [sc].filter(Boolean);

        //TEMPFIX
        if(!SETTINGS.FILTERS) {
            return Charactermancer_Class_Util.getAllFeatures(cls);
        }
        return Charactermancer_Util.getFilteredFeatures(Charactermancer_Class_Util.getAllFeatures(cls),
        this._modalFilterClasses.pageFilter, this._modalFilterClasses.pageFilter.filterBox.getValues());
    }

    //#region Feature Options Selects
    /**
     * HOW FEATURE OPTIONS SELECTS WORKS
     * -------------------------------------
     * Whenever our class or subclass levels up, it might need to create a FeatureOptionsSelect component
     * These components may also be deleted when we are leveled down
     * A FeatureOptionsSelect component has subcomponents (like expertise choice, language choice, etc) that are created during rendering
     * Whenever a FeatureOptionsSelect is to be rendered, it deletes its old version of itself, but copies over the list of subcomponents from the old one
     * It then creates new subcomponents, but copies over the state from the old ones
    */

    /**
     * Safely creates and then renders FeatureOptionsSelect components
     * @param {any} options
     */
    async _class_pRenderFeatureOptionsSelects(options) {
        const { lockRenderFeatureOptionsSelects: lockRenderFeatureOptionsSelects } = options;
        try {
            await this._pLock(lockRenderFeatureOptionsSelects);
            return this._class_pRenderFeatureOptionsSelects_(options);
        }
        finally { this._unlock(lockRenderFeatureOptionsSelects); }
    }
    /**
     * Creates and then renders FeatureOptionsSelect components, deleting the previous ones but copying over their states
     */
    async _class_pRenderFeatureOptionsSelects_({ix: ix, propCntAsi: propCntAsi, filteredFeatures: filteredFeatures, $stgFeatureOptions: stgFeatureOptions
        }) {

        //Get the previous components we had
        const previousComponents = this._compsClassFeatureOptionsSelect[ix] || [];
        previousComponents.forEach(e => this._parent.featureSourceTracker_.unregister(e)); //Unregister each of them from the feature source tracker
        stgFeatureOptions.empty();
        const existingFeatureChecker = this._existingClassMetas[ix] ? new Charactermancer_Class_Util.ExistingFeatureChecker(this._actor) : null;
        const importableFeatures = Charactermancer_Util.getImportableFeatures(filteredFeatures);
        const features = MiscUtil.copy(importableFeatures);
        if(SETTINGS.FILTERS){ //TEMPFIX
            Charactermancer_Util.doApplyFilterToFeatureEntries_bySource(features,
                this._modalFilterClasses.pageFilter, this._modalFilterClasses.pageFilter.filterBox.getValues());
        }

        //by this point, 'features' should be an array of classFeatures with property 'loadeds'
        const groupedByOptionsSet = Charactermancer_Util.getFeaturesGroupedByOptionsSet(features);
        //groupedByOptionsSet should be an array of objects like this: {optionsSets: [...], topLevelFeature: {...}}
        const {lvlMin: lvlMin, lvlMax: lvlMax } = await this._class_pGetMinMaxLevel(ix);
        //Unregister and delete previousComponents
        this._class_unregisterFeatureSourceTrackingFeatureComps(ix);

        

        let asiCount = 0;
        for (const grp of groupedByOptionsSet) {
            const { topLevelFeature: topLevelFeature, optionsSets: optionsSets} = grp;
            //Only render features of the right level (using a setting to always render features of lower level than we are)
            if ((topLevelFeature.level < lvlMin && !SETTINGS.GET_FEATOPTSEL_UP_TO_CURLEVEL) || topLevelFeature.level > lvlMax) {continue; }
            const featureName = topLevelFeature.name.toLowerCase();
            if (featureName === "ability score improvement") { asiCount++; continue; }
            for (const set of optionsSets) {
                //Create the new FeatureOptionsSelect for this optionset
                const component = new Charactermancer_FeatureOptionsSelect({
                    featureSourceTracker: this._parent.featureSourceTracker_,
                    existingFeatureChecker: existingFeatureChecker,
                    //TEMPFIX 'actor': this._actor,
                    optionsSet: set,
                    level: topLevelFeature.level,
                    modalFilterSpells: this._parent.compSpell.modalFilterSpells
                });
                //Add a featureoptionselect component for the class 'ix'
                this._compsClassFeatureOptionsSelect[ix].push(component);
                //Copy the state from a previous component that matches our optionsset
                //Doesnt copy over states from subcomponents, instead just adds those subcomponents to the memory of component, preserving the state
                component.findAndCopyStateFrom(previousComponents);
            }
        }

        //Remember the amount of ASI's
        this._state[propCntAsi] = asiCount;

        //Do a first render on these freshly created components
        await this._class_pRenderFeatureComps(ix, {'$stgFeatureOptions': stgFeatureOptions});
    }
    
    /**
     * Render the FeatureOptionsSelects and create their subcomponents
     * @param {any} ix
     * @param {any} {$stgFeatureOptions:stgFeatureOptions}
     * @returns {any}
     */
    async _class_pRenderFeatureComps(ix, { $stgFeatureOptions: stgFeatureOptions }) {
        for (let i = 0; i < this.compsClassFeatureOptionsSelect[ix].length; ++i) {
            let component = this.compsClassFeatureOptionsSelect[ix][i];
            
            //component._optionsSet[0].entity.entryData exists
            if ((await component.pIsNoChoice()) && !(await component.pIsAvailable())) {continue;}
            
            if (!(await component.pIsNoChoice()) || (await component.pIsForceDisplay())) {
                stgFeatureOptions.showVe().append('' + (component.modalTitle ?
                     "<hr class=\"hr-2\"><div class=\"mb-2 bold w-100\">" + component.modalTitle + "</div>" : ''));
            }
            await component.render(stgFeatureOptions);
        }
    }
    async loadFeatureOptionsSelectFromState(classIx){
        //Try to load saved cached save data
        if(SETTINGS.USE_EXISTING_WEB && this.loadedSaveData_FeatureOptSel && classIx < this.loadedSaveData_FeatureOptSel.length){
            if(this.loadedSaveData_FeatureOptSel[classIx] != null){
                await this._loadFeatureOptionsSelectFromState(classIx, this.loadedSaveData_FeatureOptSel[classIx]);
            }
            //Then wipe the cached save data so we cant accidentally set it again
            this.loadedSaveData_FeatureOptSel[classIx] = null;
        }
    }
    /**
     * Description
     * @param {any} classIx
     * @param {{compIx:number, state:any, subCompDatas:{parentCompIx:number, subCompProp:string, subCompIx:number, state:any}[]}[]} saveData
     * @returns {any}
     */
    async _loadFeatureOptionsSelectFromState(classIx, saveData){

        async function waitForHook2(myComp, fosData){
            myComp.__state["ixsChosen"] = fosData.state["ixsChosen"]; //Set the state without firing the hook
            //Then manually call the render hook instead
            await myComp._render_pHkIxsChosen({$stgSubChoiceData: myComp.$stgSubChoiceData});
        }

        for(let fosData of saveData){ //Go through the feature opt sel data

            const myComp = this.compsClassFeatureOptionsSelect[classIx][fosData.compIx];
            if(myComp==null){
                console.error(`Failed to grab the ix ${fosData.compIx} FOS component from class ${classIx}`, fosData);
                continue;
            }

            //First give state to ourselves
            const parentState = fosData.state;
            for(let propName of Object.keys(parentState)){
                let propValue = parentState[propName];
                if(propName == "ixsChosen"){continue;} //We do not want to fire the ixsChosen hook yet
                myComp._state[propName] = propValue;
            }
            await waitForHook2(myComp, fosData);

            //Then give state to subcomponents
            //A problem here might be that our parents havent created the subcomponents yet
            for(let subData of fosData.subCompDatas){
                //Grab the subcomponent that we want to paste the state onto
                const subComp = await this._getFeatureOptionsSelectComponent(classIx, subData.parentCompIx, subData.subCompProp, subData.subCompIx);
                if(subComp==null){
                    console.error("Failed to load data to FOS subcomponent("+Object.getPrototypeOf(myComp).constructor.name+")", "Component:", myComp, "SubData:", subData);
                }
                
                //Paste the state onto the subcomponent
                const subState = subData.state;
                for(let propName of Object.keys(subState)){
                    let propValue = subState[propName];
                    subComp._state[propName] = propValue;
                }
            }
        }
    }
    async _getFeatureOptionsSelectComponent(classIx, parentCompIx, subCompName, subCompIx){

        function getVar(classIx, parentCompIx, subCompName, subCompIx){
            return this._compsClassFeatureOptionsSelect[classIx][parentCompIx][subCompName][subCompIx];
        }
        async function createTimeout(fos, classIx, parentCompIx, subCompName, subCompIx, ms) {
            return new Promise(resolve => {
              setTimeout(() => {
                // Create the object after 5 seconds
                var newObj = fos[classIx][parentCompIx][subCompName][subCompIx];
                resolve(newObj);
              }, ms); // 5 seconds timeout
            });
        }
          
        async function checkAndCreateTimeout(obj, fos, classIx, parentCompIx, subCompName, subCompIx, ms) {
            if (obj === undefined) {
                return await createTimeout(fos, classIx, parentCompIx, subCompName, subCompIx, ms);
            }
            else { return obj; }
        }

        if(!this._compsClassFeatureOptionsSelect[classIx]?.length){
            console.error("FeatureOptionsSelect components have not been created for class " + classIx + " yet!");
        }
        try{
            let c = this._compsClassFeatureOptionsSelect[classIx][parentCompIx][subCompName][subCompIx];
            //In some rare and unfortunate cases, the FOS subcomponent that we are looking for may not be initialized yet
            //A way to deal with this is to just wait for it to become initialized, and try getting it again
            c = await checkAndCreateTimeout(c, this._compsClassFeatureOptionsSelect, classIx, parentCompIx, subCompName, subCompIx, 100);
            //Hopefully the object should not be undefined at this point anymore
            return c;
        }
        catch(e){
            console.error(classIx, parentCompIx, subCompName, subCompIx, this._compsClassFeatureOptionsSelect.length);
            console.error(this._compsClassFeatureOptionsSelect);
            throw e;
        }
        
    }

    matchFeatureOptionSelectSaveDataToComponent(componentData, optionSet){
        const hashes = optionSet.map(set => {return set.hash}); //Use this to pull choices from parentData
        //if(!componentData.hashes){continue;} //This shouldnt happen
        for(let hash of hashes){
            if(componentData.hashes.includes(hash)){return f;}
        }
        return null;
    }
    //#endregion

    /**
     * Unregisters FeatureOptionsSelect components specific to the class from the featureSourceTracker and wipes them from memory
     * @param {number} ix ix of the class we are talking about
     */
    _class_unregisterFeatureSourceTrackingFeatureComps(ix) {
      (this._compsClassFeatureOptionsSelect[ix] || []).forEach(comp => comp.unregisterFeatureSourceTracking());
      this._compsClassFeatureOptionsSelect[ix] = [];
    }
    async _class_pGetMinMaxLevel(ix) {
        let lvlMin = 0;
        let lvlMax = 0;
        if (this._compsClassLevelSelect[ix]) {
            const data = await this._compsClassLevelSelect[ix].pGetFormData().data;
            lvlMin = Math.min(...data) + 1;
            lvlMax = Math.max(...data) + 1;
        }
        return { lvlMin: lvlMin, lvlMax: lvlMax };
    }
    
    
    class_getPrimaryClass() {
      if (!~this._state.class_ixPrimaryClass) { return null; }
      const { propIxClass: propIxClass } = ActorCharactermancerBaseComponent.class_getProps(this._state.class_ixPrimaryClass);
      return this._data.class[this._state[propIxClass]];
    }
    class_getTotalLevels() {
      return this._compsClassLevelSelect.filter(Boolean).map(comp => comp.getTargetLevel()
      || comp.getCurLevel()).reduce((a, b) => a + b, 0);
    }
    class_getMinMaxSpellLevel() {
      const spellLevelLows = [];
      const spellLevelHighs = [];
      let isAnyCantrips = false;
      for (let classIx = 0; classIx < this._state.class_ixMax + 1; ++classIx) {
        const {
          propIxClass: propIxClass,
          propIxSubclass: propIxSubclass,
          propCurLevel: propCurLevel,
          propTargetLevel: propTargetLevel
        } = ActorCharactermancerBaseComponent.class_getProps(classIx);
        const cls = this.getClass_({ propIxClass: propIxClass });
        if (!cls) { continue; }
        const subcls = this.getSubclass_({
          'cls': cls,
          'propIxSubclass': propIxSubclass
        });
        const curLevel = this._state[propCurLevel];
        const targetLevel = this._state[propTargetLevel];
        const casterProgression = DataConverter.getMaxCasterProgression(cls.casterProgression, subcls?.["casterProgression"]);
        const spellLevelLow = Charactermancer_Spell_Util.getCasterProgressionMeta({
          'casterProgression': casterProgression,
          'curLevel': curLevel,
          'targetLevel': targetLevel,
          'isBreakpointsOnly': true
        })?.spellLevelLow;

        if (spellLevelLow != null) {
          spellLevelLows.push(spellLevelLow);
        }
        const spellLevelHigh = Charactermancer_Spell_Util.getCasterProgressionMeta({
          'casterProgression': casterProgression,
          'curLevel': curLevel,
          'targetLevel': targetLevel,
          'isBreakpointsOnly': true
        })?.spellLevelHigh;

        if (spellLevelHigh != null) {
          spellLevelHighs.push(spellLevelHigh);
        }
        isAnyCantrips = isAnyCantrips || Charactermancer_Spell_Util.getMaxLearnedCantrips({
          'cls': cls,
          'sc': subcls,
          'targetLevel': targetLevel
        }) != null;
      }
      return {
        'min': spellLevelLows.length ? Math.min(...spellLevelLows) : null,
        'max': spellLevelHighs.length ? Math.max(...spellLevelHighs) : null,
        'isAnyCantrips': isAnyCantrips
      };
    }

    wipeClassState(ix){
        const wipe = (comp) => {
            if(comp){
                try {
                    
                    //We need to loop through each value in state and set it to null
                    //This should fire some hooks
                    const propNames = Object.keys(comp._state);
                    for(let prop of propNames){
                        comp._setStateValue(prop, null, {isForceTriggerHooks: true});
                    }
                    //Then we can go in and completely reset the _state, wiping hooks
                    comp._setState(comp._getDefaultState());
                    //Needs to be called last
                    this._parent.featureSourceTracker_.unregister(comp);
                }
                catch (e){
                    console.error("Failed to wipe component ", comp, comp.constructor.name, "belonging to ix ", ix);
                    throw e;
                }
            }
        } 
        //Wipe states in each subcomponent belonging to the ix of my class
        wipe(this.compsClassSkillProficiencies[ix]);
        wipe(this.compsClassToolProficiencies[ix]);
        wipe(this.compsClassLevelSelect[ix]);
        wipe(this.compsClassHpIncreaseMode[ix]);
        wipe(this.compsClassStartingProficiencies[ix]);
        for(let comp of this.compsClassFeatureOptionsSelect[ix]){
            if(comp) { wipe(comp); }
        }
        //We need to reduce class_ixMax, OR mark this class index as unused somehow
        //Simplest is probably to just mark the class as unused. It will be ignored until the next time we save
        ActorCharactermancerBaseComponent.deletedClassIndices.push(ix);
        this.state.class_pulseChange = !this.state.class_pulseChange;

        //List all classes
        console.log("Still active classes:");
        for(let i = 0; i <= this._state.class_ixMax; ++i){
            if(ActorCharactermancerBaseComponent.class_isDeleted(i)){continue;}
            const clsInfo = ActorCharactermancerBaseComponent.class_getProps(i);
            const cls = this.getClass_({propIxClass:clsInfo.propIxClass});
            console.log(cls);
        }


        //This should be enough wiping for now
    }

    /**Defines the starting default values of our _state proxy  */
    _getDefaultState() {
      return {
        'class_ixPrimaryClass': 0,
        'class_ixMax': 0,
        'class_totalLevels': 0,
        'class_pulseChange': false
      };
    }
}
class Charactermancer_Class_HpIncreaseModeSelect extends BaseComponent {
    static async pGetUserInput() {
        if (this.isNoChoice()) {
            const comp = new this();
            return comp.pGetFormData();
        }

        return UtilApplications.pGetImportCompApplicationFormData({
            comp: new this(),
            width: 480,
            height: 150,
        });
    }

    static isHpAvailable(cls) {
        return cls.hd && cls.hd.number && !isNaN(cls.hd.number) && cls.hd.faces && !isNaN(cls.hd.faces);
    }

    static isNoChoice() {
        if (game.user.isGM)
            return false;

        if (Config.get("importClass", "hpIncreaseMode") === ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL_CUSTOM && Config.get("importClass", "hpIncreaseModeCustomRollFormula") == null)
            return false;

        return Config.get("importClass", "hpIncreaseMode") != null;
    }

    /**
     * @returns {{isFormComplete:boolean, data{mode:number, customFormula:string}}}
     */
    pGetFormData() {
        return {
            isFormComplete: true,
            data: {
                mode: this._state.mode,
                customFormula: this._state.customFormula,
            },
        };
    }

    get modalTitle() {
        return `Select Hit Points Increase Mode`;
    }

    render($wrp) {
        const $sel = ComponentUiUtil.$getSelEnum(this, "mode", {
            values: [ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__TAKE_AVERAGE, ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__MIN, ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__MAX, ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL, ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL_CUSTOM, ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__DO_NOT_INCREASE, ],
            fnDisplay: mode=>ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE___NAMES[mode],
        }, );

        /* if (!game.user.isGM && Config.get("importClass", "hpIncreaseMode") != null)
            $sel.disable(); */

        const $iptCustom = ComponentUiUtil.$getIptStr(this, "customFormula").addClass("code");

        /* if (!game.user.isGM && Config.get("importClass", "hpIncreaseModeCustomRollFormula") != null)
            $iptCustom.disable(); */

        const $stgCustom = $$`<div class="mt-2 ve-flex-v-center">
			<div class="inline-block bold mr-1 no-wrap">Custom Formula:</div>
			${$iptCustom}
		</div>`;
        
        const hkMode = ()=>{
            $stgCustom.toggleVe(this._state.mode === ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__ROLL_CUSTOM);
        };
        this._addHookBase("mode", hkMode);
        hkMode();

        $$`<div class="ve-flex-col min-h-0">
			${$sel}
			${$stgCustom}
		</div>`.appendTo($wrp);
    }

    _getDefaultState() {
        return {
            mode: Config.get("importClass", "hpIncreaseMode") ?? ConfigConsts.C_IMPORT_CLASS_HP_INCREASE_MODE__TAKE_AVERAGE,
            customFormula: Config.get("importClass", "hpIncreaseModeCustomRollFormula") ?? "(2 * @hd.number)d(@hd.faces / 2)",
        };
    }
}
class Charactermancer_Class_HpInfo extends BaseComponent {
    constructor({className, hitDice}) {
        super();
        this._className = className;
        this._hitDice = hitDice;
    }

    render($wrp) {
        const hdEntry = Renderer.class.getHitDiceEntry(this._hitDice);

        const we = $$`<div class="ve-flex-col min-h-0 ve-small">
			<div class="block"><div class="inline-block bold mr-1">Hit Dice:</div>${SETTINGS.DO_RENDER_DICE? Vetools.withUnpatchedDiceRendering(()=>
                Renderer.getEntryDice(hdEntry, "Hit die")) : hdEntry.toRoll}</div>
			<div class="block"><div class="inline-block bold mr-1">Hit Points:</div>${Renderer.class.getHitPointsAtFirstLevel(this._hitDice)}</div>
			<div class="block"><div class="inline-block bold mr-1">Hit Points at Higher Levels:</div>
            ${Vetools.withUnpatchedDiceRendering(()=>Renderer.class.getHitPointsAtHigherLevels(this._className, this._hitDice, hdEntry))}</div>
		</div>`;
        we.appendTo($wrp);
    }

    //Functions in case some external party wants to get some info
    get hitDice(){return this._hitDice;} //How many faces, not how many dice
    get hitPointsAtFirstLevel() { return Renderer.class.getHitPointsAtFirstLevel(this._hitDice); }
   
}
class Charactermancer_AdditionalSpellsUtil {
    static getFlatData(additionalSpells) {
        additionalSpells = MiscUtil.copy(additionalSpells);

        return additionalSpells.map(additionalSpellBlock=>{
            const outMeta = {};
            const outSpells = {};

            const keyPath = [];

            Object.entries(additionalSpellBlock).forEach(([additionType,additionMeta])=>{
                keyPath.push(additionType);

                switch (additionType) {
                case "name":
                case "ability":
                    outMeta[additionType] = additionMeta;
                    break;

                case "resourceName":
                    break;

                case "innate":
                case "known":
                case "prepared":
                case "expanded":
                    {
                        this._getFlatData_doProcessAdditionMeta({
                            additionType,
                            additionMeta,
                            outSpells,
                            keyPath,
                            resourceName: additionalSpellBlock.resourceName
                        });
                        break;
                    }

                default:
                    throw new Error(`Unhandled spell addition type "${additionType}"`);
                }

                keyPath.pop();
            }
            );

            return {
                meta: outMeta,
                spells: outSpells
            };
        }
        );
    }

    static _getFlatData_doProcessAdditionMeta(opts) {
        const {additionMeta, keyPath} = opts;

        Object.entries(additionMeta).forEach(([levelOrCasterLevel,levelMeta])=>{
            keyPath.push(levelOrCasterLevel);

            if (levelMeta instanceof Array) {
                levelMeta.forEach((spellItem,ix)=>this._getFlatData_doProcessSpellItem({
                    ...opts,
                    levelOrCasterLevel,
                    spellItem,
                    ix
                }));
            } else {
                Object.entries(levelMeta).forEach(([rechargeType,levelMetaInner])=>{
                    this._getFlatData_doProcessSpellRechargeBlock({
                        ...opts,
                        levelOrCasterLevel,
                        rechargeType,
                        levelMetaInner
                    });
                }
                );
            }

            keyPath.pop();
        }
        );
    }

    static _getFlatData_doProcessSpellItem(opts) {
        const {additionType, additionMeta, outSpells, keyPath, spellItem, ix, rechargeType, uses, usesPer, levelOrCasterLevel, consumeType, consumeAmount, consumeTarget, vetConsumes} = opts;

        keyPath.push(ix);

        const outSpell = {
            isExpanded: additionType === "expanded",
            isAlwaysPrepared: additionType === "prepared",
            isAlwaysKnown: additionType === "known",
            isPrepared: additionType === "prepared" || additionType === "innate" || additionType === "known",
            preparationMode: (additionType === "prepared" || additionType === "known") ? "always" : "innate",
            consumeType,
            consumeAmount,
            consumeTarget,
            vetConsumes,
        };

        if (levelOrCasterLevel !== "_") {
            const mCasterLevel = /^s(\d+)$/.exec(levelOrCasterLevel);
            if (mCasterLevel)
                outSpell.requiredCasterLevel = Number(mCasterLevel[1]);
            else if (!isNaN(levelOrCasterLevel))
                outSpell.requiredLevel = Number(levelOrCasterLevel);
        }

        if (rechargeType) {
            switch (rechargeType) {
            case "rest":
            case "daily":
                break;
            case "will":
            case "ritual":
            case "resource":
                {
                    outSpell.preparationMode = "atwill";
                    outSpell.isPrepared = rechargeType !== "ritual";
                    break;
                }

            case "_":
                break;

            default:
                throw new Error(`Unhandled recharge type "${rechargeType}"`);
            }
        }

        if (uses)
            outSpell.uses = uses;
        if (usesPer)
            outSpell.usesPer = usesPer;

        if (typeof spellItem === "string") {
            const key = keyPath.join("__");

            outSpells[key] = new Charactermancer_AdditionalSpellsUtil.FlatSpell({
                type: "spell",

                key,
                ...outSpell,
                uid: spellItem,
            });
        } else {
            if (spellItem.all != null) {
                const key = keyPath.join("__");

                outSpells[key] = new Charactermancer_AdditionalSpellsUtil.FlatSpell({
                    type: "all",

                    key,
                    ...outSpell,
                    filterExpression: spellItem.all,
                });
            } else if (spellItem.choose != null) {
                if (typeof spellItem.choose === "string") {
                    const count = spellItem.count || 1;

                    for (let i = 0; i < count; ++i) {
                        keyPath.push(i);

                        const key = keyPath.join("__");

                        outSpells[key] = new Charactermancer_AdditionalSpellsUtil.FlatSpell({
                            type: "choose",

                            key,
                            ...outSpell,
                            filterExpression: spellItem.choose,
                        });

                        keyPath.pop();
                    }
                } else if (spellItem.choose.from) {
                    const count = spellItem.choose.count || 1;

                    const groupId = CryptUtil.uid();
                    [...spellItem.choose.from].sort((a,b)=>SortUtil.ascSortLower(a, b)).forEach((uid,i)=>{
                        keyPath.push(i);

                        const key = keyPath.join("__");

                        outSpells[key] = new Charactermancer_AdditionalSpellsUtil.FlatSpell({
                            type: "chooseFrom",

                            key,
                            ...outSpell,
                            uid: uid,
                            chooseFromGroup: groupId,
                            chooseFromCount: count,
                        });

                        keyPath.pop();
                    }
                    );
                } else {
                    throw new Error(`Unhandled additional spell format: "${JSON.stringify(spellItem)}"`);
                }
            } else
                throw new Error(`Unhandled additional spell format: "${JSON.stringify(spellItem)}"`);
        }

        keyPath.pop();
    }

    static _getFlatData_doProcessSpellRechargeBlock(opts) {
        const {additionType, additionMeta, outSpells, keyPath, resourceName, levelOrCasterLevel, rechargeType, levelMetaInner} = opts;

        keyPath.push(rechargeType);

        switch (rechargeType) {
        case "rest":
        case "daily":
            {
                const usesPer = rechargeType === "rest" ? "sr" : "lr";

                Object.entries(levelMetaInner).forEach(([numTimesCast,spellList])=>{
                    keyPath.push(numTimesCast);

                    numTimesCast = numTimesCast.replace(/^(\d+)e$/, "$1");
                    const uses = Number(numTimesCast);

                    spellList.forEach((spellItem,ix)=>this._getFlatData_doProcessSpellItem({
                        ...opts,
                        spellItem,
                        ix,
                        uses,
                        usesPer
                    }));

                    keyPath.pop();
                }
                );

                break;
            }

        case "resource":
            {
                Object.entries(levelMetaInner).forEach(([consumeAmount,spellList])=>{
                    keyPath.push(consumeAmount);

                    spellList.forEach((spellItem,ix)=>this._getFlatData_doProcessSpellItem({
                        ...opts,
                        spellItem,
                        ix,
                        vetConsumes: {
                            name: resourceName,
                            amount: Number(consumeAmount)
                        }
                    }));

                    keyPath.pop();
                }
                );

                break;
            }

        case "will":
        case "ritual":
        case "_":
            {
                levelMetaInner.forEach((spellItem,ix)=>this._getFlatData_doProcessSpellItem({
                    ...opts,
                    spellItem,
                    ix
                }));
                break;
            }

        default:
            throw new Error(`Unhandled spell recharge type "${rechargeType}"`);
        }

        keyPath.pop();
    }
}
Charactermancer_AdditionalSpellsUtil.FlatSpell = class {
    #opts = null;
    constructor(opts) {
        this.#opts = opts;

        this.type = opts.type;
        this.key = opts.key;
        this.isExpanded = opts.isExpanded;
        this.isPrepared = opts.isPrepared;
        this.isAlwaysKnown = opts.isAlwaysKnown;
        this.isAlwaysPrepared = opts.isAlwaysPrepared;
        this.preparationMode = opts.preparationMode;
        this.requiredCasterLevel = opts.requiredCasterLevel;
        this.requiredLevel = opts.requiredLevel;

        this.uses = opts.uses;
        this.usesPer = opts.usesPer;

        this.consumeType = opts.consumeType;
        this.consumeAmount = opts.consumeAmount;
        this.consumeTarget = opts.consumeTarget;

        this.vetConsumes = opts.vetConsumes;

        this.isCantrip = false;

        this.uid = null;
        this.castAtLevel = null;
        if (opts.uid) {
            const {uid, isCantrip, castAtLevel} = Charactermancer_AdditionalSpellsUtil.FlatSpell._getExpandedUid(opts.uid);
            this.uid = uid;
            this.isCantrip = isCantrip;
            this.castAtLevel = castAtLevel;
        }

        this.filterExpression = opts.filterExpression;
        if (opts.filterExpression && opts.filterExpression.split("|").filter(Boolean).some(it=>/^level=0$/i.test(it.trim()))) {
            this.isCantrip = true;
        }

        this.chooseFromGroup = opts.chooseFromGroup;
        this.chooseFromCount = opts.chooseFromCount;

        if (this.isCantrip && !this.isExpanded)
            this.isAlwaysKnown = true;
    }

    static _getExpandedUid(uidRaw) {
        const [uidPart,castAtLevelPart] = uidRaw.split("#").map(it=>it.trim()).filter(Boolean);

        let[name,source] = Renderer.splitTagByPipe(uidPart.toLowerCase());
        source = source || Parser.SRC_PHB.toLowerCase();
        const uid = `${name}|${source}`;

        const isCantrip = castAtLevelPart && castAtLevelPart.toLowerCase() === "c";
        const castAtLevel = isCantrip ? null : (castAtLevelPart && !isNaN(castAtLevelPart)) ? Number(castAtLevelPart) : null;

        return {
            uid,
            isCantrip,
            castAtLevel
        };
    }

    getCopy(optsNxt=null) {
        return new this.constructor({
            ...this.#opts,
            ...optsNxt || {},
        });
    }

    toObject() {
        return MiscUtil.copy(this);
    }
};

class Charactermancer_AdditionalSpellsSelect extends BaseComponent {
    static async pGetUserInput(opts) {
        opts = opts || {};
        const {additionalSpells} = opts;

        if (!additionalSpells || !additionalSpells.length)
            return {
                isFormComplete: true,
                data: []
            };

        const comp = this.getComp(opts);

        if (comp.isNoChoice({
            curLevel: opts.curLevel,
            targetLevel: opts.targetLevel,
            isStandalone: opts.isStandalone
        }))
            return comp.pGetFormData();

        return UtilApplications.pGetImportCompApplicationFormData({
            comp,
            width: 640,
            height: 220,
        });
    }

    static _MODAL_FILTER_SPELLS_DEFAULT = null;

    static async pGetInitModalFilterSpells() {
        if (!this._MODAL_FILTER_SPELLS_DEFAULT) {
            this._MODAL_FILTER_SPELLS_DEFAULT = new ModalFilterSpellsFvtt({
                namespace: "Charactermancer_AdditionalSpellsSelect.spells",
                isRadio: true
            });
            await this._MODAL_FILTER_SPELLS_DEFAULT.pPreloadHidden();
        }
        return this._MODAL_FILTER_SPELLS_DEFAULT;
    }

    static getComp(opts) {
        opts = opts || {};

        const comp = new this({
            ...opts
        });
        comp.curLevel = opts.curLevel;
        comp.targetLevel = opts.targetLevel;
        comp.spellLevelLow = opts.spellLevelLow;
        comp.spellLevelHigh = opts.spellLevelHigh;
        comp.isAnyCantrips = !!opts.isAnyCantrips;

        return comp;
    }

    static async pApplyFormDataToActor(actor, formData, opts) {
        opts = opts || {};

        if (!formData || !formData?.data?.length)
            return [];

        const ability = ((opts.abilityAbv === "inherit" ? opts.parentAbilityAbv : opts.abilityAbv) || (formData.abilityAbv === "inherit" ? opts.parentAbilityAbv : formData.abilityAbv)) ?? undefined;

        const {ImportListSpell} = await Promise.resolve().then(function() {
            return ImportListSpell$1;
        });
        const importListSpell = new ImportListSpell({
            actor
        });

        const out = [];

        for (const spellMeta of formData.data) {
            if (spellMeta.isExpanded)
                continue;

            let[name,source] = spellMeta.uid.split("|");
            if (!source)
                source = Parser.SRC_PHB;
            const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_SPELLS]({
                name,
                source
            });

            const spell = await DataLoader.pCacheAndGet(UrlUtil.PG_SPELLS, source, hash);
            if (!spell) {
                const message = `Could not find spell "${hash}" when applying additional spells!`;
                ui.notifications.warn(message);
                console.warn(...LGT, message);
                continue;
            }

            const importSummary = await importListSpell.pImportEntry(spell, {
                taskRunner: opts.taskRunner,
                opts_pGetSpellItem: {
                    ability,
                    usesMax: spellMeta.uses,
                    usesValue: spellMeta.uses,
                    usesPer: spellMeta.usesPer,
                    consumeType: spellMeta.consumeType,
                    consumeAmount: spellMeta.consumeAmount,
                    consumeTarget: spellMeta.consumeTarget,
                    vetConsumes: spellMeta.vetConsumes,
                    isPrepared: spellMeta.isPrepared,
                    preparationMode: spellMeta.preparationMode,
                    castAtLevel: spellMeta.castAtLevel,

                    isIgnoreExisting: true,
                },
            }, );
            out.push(importSummary);
        }

        return out;
    }

    static isNoChoice(additionalSpells, {additionalSpellsFlat=null, curLevel=null, targetLevel=null, isStandalone=false}={}) {
        if (additionalSpells.length !== 1)
            return false;
        additionalSpellsFlat = additionalSpellsFlat || Charactermancer_AdditionalSpellsUtil.getFlatData(additionalSpells);

        const minLevel = curLevel ?? Number.MIN_SAFE_INTEGER;
        const maxLevel = targetLevel ?? Number.MAX_SAFE_INTEGER;

        const spellsInRange = additionalSpellsFlat.some(it=>Object.values(it.spells).some(it=>(!isStandalone || !it.isExpanded) && (it.requiredLevel == null || (it.requiredLevel >= minLevel && it.requiredLevel <= maxLevel))), );

        if (!spellsInRange)
            return true;

        return !additionalSpellsFlat.some(it=>it.meta.ability?.choose || Object.values(it.spells).some(it=>(it.type !== "all" && it.filterExpression != null) || it.chooseFromGroup != null));
    }

    constructor(opts) {
        opts = opts || {};
        super();

        this._additionalSpells = opts.additionalSpells;
        this._sourceHintText = opts.sourceHintText;
        this._modalFilterSpells = opts.modalFilterSpells;

        this._additionalSpellsFlat = Charactermancer_AdditionalSpellsUtil.getFlatData(opts.additionalSpells);

    }

    get modalTitle() {
        return `Choose Additional Spell Set${this._sourceHintText ? ` (${this._sourceHintText})` : ""}`;
    }

    set curLevel(val) {
        this._state.curLevel = val;
    }
    set targetLevel(val) {
        this._state.targetLevel = val;
    }
    set spellLevelLow(val) {
        this._state.spellLevelLow = val;
    }
    set spellLevelHigh(val) {
        this._state.spellLevelHigh = val;
    }
    set isAnyCantrips(val) {
        this._state.isAnyCantrips = !!val;
    }

    addHookAlwaysPreparedSpells(hk) {
        this._addHookBase("spellsAlwaysPrepared", hk);
    }
    addHookExpandedSpells(hk) {
        this._addHookBase("spellsExpanded", hk);
    }
    addHookAlwaysKnownSpells(hk) {
        this._addHookBase("spellsAlwaysKnown", hk);
    }

    get spellsAlwaysPrepared() {
        return this._state.spellsAlwaysPrepared;
    }
    get spellsExpanded() {
        return this._state.spellsExpanded;
    }
    get spellsAlwaysKnown() {
        return this._state.spellsAlwaysKnown;
    }

    _render_addLastAlwaysPreparedSpellsHook() {
        return this._render_addLastBoolSpellsHook({
            propState: "spellsAlwaysPrepared",
            propIsBool: "isAlwaysPrepared"
        });
    }
    _render_addLastExpandedSpellsHook() {
        return this._render_addLastBoolSpellsHook({
            propState: "spellsExpanded",
            propIsBool: "isExpanded"
        });
    }
    _render_addLastAlwaysKnownSpellsHook() {
        return this._render_addLastBoolSpellsHook({
            propState: "spellsAlwaysKnown",
            propIsBool: "isAlwaysKnown"
        });
    }

    _render_addLastBoolSpellsHook({propState, propIsBool}) {
        const hk = ()=>{
            const formData = this.getFormData();
            const nxt = formData.data.filter(it=>it[propIsBool]).map(it=>it.uid.toLowerCase());

            const setCurr = new Set(this._state[propState]);
            const setNxt = new Set(nxt);
            if (!CollectionUtil.setEq(setCurr, setNxt))
                this._state[propState] = nxt;
        };
        this._addHookBase("ixSet", hk);
        this._addHookBase("curLevel", hk);
        this._addHookBase("targetLevel", hk);
        this._addHookBase("spellLevelLow", hk);
        this._addHookBase("spellLevelHigh", hk);
        this._addHookBase("isAnyCantrips", hk);
        this._addHookBase("pulseChoose", hk);
        hk();
    }

    render($wrp) {
        this._render_addLastAlwaysPreparedSpellsHook();
        this._render_addLastExpandedSpellsHook();
        this._render_addLastAlwaysKnownSpellsHook();

        const $wrpOptionsButtons = $(`<div class="ve-flex-v-center ve-flex-wrap w-100 btn-group ${this._additionalSpellsFlat.length > 1 ? "mb-1" : ""}"></div>`);
        const $wrpOptions = $(`<div class="ve-flex-col w-100"></div>`);

        for (let i = 0; i < this._additionalSpellsFlat.length; ++i)
            this._render_renderOptions($wrpOptionsButtons, $wrpOptions, i);

        $$($wrp)`
			${$wrpOptionsButtons}
			${$wrpOptions}
		`;
    }

    _render_renderOptions($wrpOptionsButtons, $wrpOptions, ix) {
        const additionalSpellsFlatBlock = this._additionalSpellsFlat[ix];

        //Make a button for selecting which set we want to use (for example one set per class spell list)
        const $btnSelect = this._additionalSpellsFlat.length === 1 ? null : 
        $(`<button class="btn btn-xs ve-flex-1" title="Select Spell Set">${additionalSpellsFlatBlock.meta.name ?? `Spell Set ${ix + 1}`}</button>`).click(()=>this._state.ixSet = ix);

        const isInnatePreparedList = this._isAnyInnatePrepared(ix);
        const isExpandedList = this._isAnyExpanded(ix);


        const sortedSpells = Object.values(additionalSpellsFlatBlock.spells).sort((a,b)=>SortUtil.ascSort(a.requiredLevel || 0,
            b.requiredLevel || 0) || SortUtil.ascSort(a.requiredCasterLevel || 0, b.requiredCasterLevel || 0));

        const $wrpInnatePreparedHeaders = isInnatePreparedList ? $(`<div class="ve-flex-v-center py-1">
			<div class="col-3 ve-text-center">Level</div>
			<div class="col-9">Spells</div>
		</div>`) : null;

        const $wrpExpandedHeaders = isExpandedList ? $(`<div class="ve-flex-v-center py-1">
			<div class="col-3 ve-text-center">Spell Level</div>
			<div class="col-9">Spells</div>
		</div>`) : null;


        const $rowsInnatePrepared = isInnatePreparedList ? this._render_$getRows(ix, sortedSpells, {
            isExpandedMatch: false
        }) : null;
        const $rowsExpanded = isExpandedList ? this._render_$getRows(ix, sortedSpells, {
            isExpandedMatch: true
        }) : null;


        const $wrpNoneAvailableInnatePrepared = isInnatePreparedList ? $(`<div class="ve-small ve-flex-v-center my-1 w-100 italic ve-muted">No spells at this level</div>`) : null;
        const $wrpNoneAvailableExpanded = isExpandedList ? $(`<div class="ve-small ve-flex-v-center my-1 w-100 italic ve-muted">No spells at this level</div>`) : null;

        const hkSpellsAvailable = ()=>{
            const isInnatePreparedAvailable = !!this._getFlatInnatePreparedSpellsInRange(ix).length;
            if ($wrpInnatePreparedHeaders)
                $wrpInnatePreparedHeaders.toggleVe(isInnatePreparedAvailable);
            if ($wrpNoneAvailableInnatePrepared)
                $wrpNoneAvailableInnatePrepared.toggleVe(!isInnatePreparedAvailable);

            const isExpandedAvailable = !!this._getFlatExpandedSpellsInRange(ix).length;
            if ($wrpExpandedHeaders)
                $wrpExpandedHeaders.toggleVe(isExpandedAvailable);
            if ($wrpNoneAvailableExpanded)
                $wrpNoneAvailableExpanded.toggleVe(!isExpandedAvailable);
        };
        this._addHookBase("spellLevelLow", hkSpellsAvailable);
        this._addHookBase("spellLevelHigh", hkSpellsAvailable);
        this._addHookBase("isAnyCantrips", hkSpellsAvailable);
        this._addHookBase("curLevel", hkSpellsAvailable);
        this._addHookBase("targetLevel", hkSpellsAvailable);
        this._addHookBase("ixSet", hkSpellsAvailable);
        hkSpellsAvailable();

        const clarification = additionalSpellsFlatBlock?.meta?.name? ` (${additionalSpellsFlatBlock.meta.name})` : "";

        const $stgInnatePrepared = isInnatePreparedList ? $$`<div class="ve-flex-col">
			<div class="bold my-0">Innate/Prepared/Known Spells${clarification}</div>
			${$wrpInnatePreparedHeaders}
			${$rowsInnatePrepared}
			${$wrpNoneAvailableInnatePrepared}
		</div>` : null;

        const $stgExpanded = isExpandedList ? $$`<div class="ve-flex-col">
			<div class="bold my-0">Expanded Spell List${clarification}</div>
			${$wrpExpandedHeaders}
			${$rowsExpanded}
			${$wrpNoneAvailableExpanded}
		</div>` : null;

        const isChooseAbility = this._isChooseAbility(ix);

        const $wrpChooseAbility = isChooseAbility ? this._render_$getSelChooseAbility(ix) : null;

        const $stgAbility = isChooseAbility ? $$`<div class="split-v-center">
			<div class="bold my-0 no-shrink mr-2">Ability Score</div>
			${$wrpChooseAbility}
		</div>` : null;

        if ($btnSelect)
            $wrpOptionsButtons.append($btnSelect);

        const $stg = $$`<div class="ve-flex-col">
			${$stgInnatePrepared}
			${$stgExpanded}
			${$stgAbility}
		</div>`.appendTo($wrpOptions);

        if (this._additionalSpellsFlat.length !== 1) {
            const hkIsActive = ()=>{
                console.log("hkisactive disabled");
               /*  $btnSelect.toggleClass("active", this._state.ixSet === ix);
                $stg.toggleVe(this._state.ixSet === ix); */
            }
            ;
            this._addHookBase("ixSet", hkIsActive);
            hkIsActive();

            const hkResetActive = (prop,value,prevValue)=>{
                const prevBlock = this._additionalSpellsFlat[prevValue];
                const nxtState = Object.values(prevBlock.spells).mergeMap(it=>({
                    [it.key]: null
                }));
                this._proxyAssignSimple("state", nxtState);
            }
            ;
            this._addHookBase("ixSet", hkResetActive);
        }
    }

    _getProps_chooseFrom({groupUid}) {
        return {
            propBase: `chooseFrom_${groupUid}`,
        };
    }

    _render_$getRows(ix, spells, {isExpandedMatch}) {
        if (!spells.length)
            return null;

        const byLevel = {};
        spells.forEach(flat=>{
            if (flat.isExpanded !== isExpandedMatch)
                return;

            const level = flat.requiredCasterLevel || flat.requiredLevel;
            (byLevel[level] = byLevel[level] || []).push(flat);
        }
        );

        const getFlatVars = flat=>({
            requiredLevel: flat.requiredLevel,
            requiredCasterLevel: flat.requiredCasterLevel,
            isRequiredCasterLevel: flat.requiredCasterLevel != null,
            isRequiredLevel: flat.requiredLevel != null,
            isExpanded: flat.isExpanded,
        });

        return Object.entries(byLevel).sort(([kA],[kB])=>SortUtil.ascSort(Number(kA), Number(kB))).map(([,flats])=>{
            const {requiredLevel, requiredCasterLevel, isRequiredCasterLevel, isRequiredLevel, isExpanded: isAnyExpanded, } = getFlatVars(flats[0]);

            const metasRenderedFlats = [];

            const chooseFromGroups = {};
            flats = flats.filter(flat=>{
                if (!flat.chooseFromGroup)
                    return true;

                chooseFromGroups[flat.chooseFromGroup] = chooseFromGroups[flat.chooseFromGroup] || {
                    from: [],
                    count: flat.chooseFromCount ?? 1,
                    ...getFlatVars(flat),
                };
                chooseFromGroups[flat.chooseFromGroup].from.push(flat);

                return false;
            }
            );

            const [flatsBasic,flatsFilter] = flats.segregate(it=>it.filterExpression == null);
            flatsBasic.sort((a,b)=>SortUtil.ascSortLower(a.uid, b.uid));
            flatsFilter.sort((a,b)=>SortUtil.ascSortLower(a.filterExpression, b.filterExpression));

            const $colSpells = $$`<div class="col-9 ve-flex-v-center ve-flex-wrap"></div>`;

            flatsBasic.forEach(flat=>{
                const $pt = $(`<div class="ve-flex-v-center"></div>`).fastSetHtml(Renderer.get().render(`{@spell ${flat.uid.toSpellCase()}}`)).appendTo($colSpells);
                const $sep = $(`<div class="mr-1">,</div>`).appendTo($colSpells);

                metasRenderedFlats.push({
                    flat,
                    $pt,
                    $sep,
                    ...getFlatVars(flat),
                });
            }
            );

            const [flatsFilterChoose,flatsFilterAll] = flatsFilter.segregate(it=>it.type !== "all");

            flatsFilterChoose.forEach(flat=>{
                const $dispSpell = $(`<div class="ve-flex-v-center"></div>`);
                const hkChosenSpell = ()=>{
                    $dispSpell.html(this._state[flat.key] != null && this._state.ixSet === ix ? `<div>${Renderer.get().render(`{@spell ${this._state[flat.key].toLowerCase()}}`)}</div>` : `<div class="italic ve-muted">(select a spell)</div>`, );
                }
                ;
                this._addHookBase(flat.key, hkChosenSpell);
                if (this._additionalSpellsFlat.length !== 1) {
                    this._addHookBase("ixSet", hkChosenSpell);
                }
                hkChosenSpell();

                const $btnFilter = $(`<button class="btn btn-default btn-xxs mx-1" title="Choose a Spell"><span class="fas fa-fw fa-search"></span></button>`).click(async()=>{
                    const selecteds = await this._modalFilterSpells.pGetUserSelection({
                        filterExpression: flat.filterExpression
                    });
                    if (selecteds == null || !selecteds.length)
                        return;

                    const selected = selecteds[0];

                    //Save the spell uid to our state, and fire a pulsechoose
                    this._state[flat.key] = DataUtil.proxy.getUid("spell", {
                        name: selected.name,
                        source: selected.values.sourceJson
                    });
                    this._state.pulseChoose = !this._state.pulseChoose;
                }
                );

                if (this._additionalSpellsFlat.length !== 1) {
                    const hkDisableBtnFilter = ()=>$btnFilter.prop("disabled", this._state.ixSet !== ix);
                    this._addHookBase("ixSet", hkDisableBtnFilter);
                    hkDisableBtnFilter();
                }

                const $pt = $$`<div class="ve-flex-v-center">${$btnFilter}${$dispSpell}</div>`.appendTo($colSpells);
                const $sep = $(`<div class="mr-1">,</div>`).appendTo($colSpells);

                metasRenderedFlats.push({
                    flat,
                    $pt,
                    $sep,
                    ...getFlatVars(flat),
                });
            }
            );

            flatsFilterAll.forEach(flat=>{
                const ptFilter = this._modalFilterSpells.getRenderedFilterExpression({
                    filterExpression: flat.filterExpression
                });
                const $pt = $$`<div class="ve-flex-v-center"><i class="mr-2 ve-muted">Spells matching:</i> ${ptFilter ? `${ptFilter} ` : ""}</div>`.appendTo($colSpells);
                const $sep = $(`<div class="mr-1">,</div>`).appendTo($colSpells);

                metasRenderedFlats.push({
                    flat,
                    $pt,
                    $sep,
                    ...getFlatVars(flat),
                });
            }
            );

            Object.entries(chooseFromGroups).forEach(([groupUid,group])=>{
                const {propBase} = this._getProps_chooseFrom({
                    groupUid
                });

                const meta = ComponentUiUtil.getMetaWrpMultipleChoice(this, propBase, {
                    values: group.from.map(it=>it.uid),
                    fnDisplay: v=>Renderer.get().render(`{@spell ${v}}`),
                    count: group.count,
                }, );

                const hkPulse = ()=>this._state.pulseChoose = !this._state.pulseChoose;
                this._addHookBase(meta.propPulse, hkPulse);

                if (this._additionalSpellsFlat.length !== 1) {
                    const hkDisableUi = ()=>{
                        meta.rowMetas.forEach(({$cb})=>$cb.prop("disabled", this._state.ixSet !== ix));
                    }
                    ;
                    this._addHookBase("ixSet", hkDisableUi);
                    hkDisableUi();
                }

                const $ptsInline = meta.rowMetas.map(({$cb, displayValue})=>{
                    return $$`<div class="ve-flex-v-center mr-2 no-wrap">${displayValue}${$cb.addClass("ml-1")}</div>`;
                }
                );

                const $pt = $$`<div class="ve-flex-v-center ve-flex-wrap"><i class="mr-1 ve-muted no-wrap">Choose ${group.count === 1 ? "" : `${group.count} `}from:</i>${$ptsInline}</div>`.appendTo($colSpells);
                const $sep = $(`<div class="mr-1">,</div>`).appendTo($colSpells);

                metasRenderedFlats.push({
                    flat: null,
                    $pt,
                    $sep,
                    ...group,
                });
            }
            );

            const $row = $$`<div class="py-1 ve-flex-v-center stripe-even">
					<div class="col-3 ve-text-center">${Parser.getOrdinalForm(requiredCasterLevel || requiredLevel) || `<i class="ve-muted">Current</i>`}</div>
					${$colSpells}
				</div>`;

            const doShowInitialPts = ()=>{
                metasRenderedFlats.forEach(({$pt, $sep},i)=>{
                    $pt.showVe();
                    $sep.toggleVe(i !== metasRenderedFlats.length - 1);
                }
                );
            }
            ;

            const doShowExpandedPts = ()=>{
                let isExpandedVisible;
                let isAllVisible;
                if (isRequiredCasterLevel) {
                    isExpandedVisible = this._isRequiredCasterLevelInRangeUpper(requiredCasterLevel);
                    isAllVisible = this._isRequiredCasterLevelInRange(requiredCasterLevel);
                } else if (isRequiredLevel) {
                    isExpandedVisible = this._isRequiredLevelInRangeUpper(requiredCasterLevel);
                    isAllVisible = this._isRequiredLevelInRange(requiredCasterLevel);
                } else
                    throw new Error(`No need to use this method!`);

                if (isAllVisible || !isExpandedVisible)
                    return doShowInitialPts();

                metasRenderedFlats.forEach((meta,i)=>{
                    meta.$pt.toggleVe(meta.isExpanded);
                    meta.$sep.toggleVe(i !== metasRenderedFlats.length - 1);
                }
                );

                let isFoundFirst = false;
                for (let i = metasRenderedFlats.length - 1; i >= 0; --i) {
                    const meta = metasRenderedFlats[i];

                    meta.$sep.hideVe();
                    if (!meta.isExpanded)
                        continue;

                    if (isFoundFirst) {
                        meta.$sep.showVe();
                        break;
                    }

                    isFoundFirst = true;
                }
            }
            ;

            if (isRequiredCasterLevel) {
                const hkLevel = ()=>{
                    const isVisible = isAnyExpanded ? this._isRequiredCasterLevelInRangeUpper(requiredCasterLevel) : this._isRequiredCasterLevelInRange(requiredCasterLevel);
                    $row.toggleVe(isVisible);
                    if (!isVisible || !isAnyExpanded)
                        return doShowInitialPts();
                    doShowExpandedPts();
                };
                this._addHookBase("spellLevelLow", hkLevel);
                this._addHookBase("spellLevelHigh", hkLevel);
                this._addHookBase("isAnyCantrips", hkLevel);
                hkLevel();
            } else if (isRequiredLevel) {
                const hkLevel = ()=>{
                    //TODO: Fix this bug properly
                    //TEMP: setting isAnyExpanded to true for the meanwhile, since it makes us not care about what curLevel is (curLevel is often incorrectly set after load)
                    let isExpanded = isAnyExpanded;
                    isExpanded = true;

                    const isVisible = /* isAnyExpanded */ isExpanded? this._isRequiredLevelInRangeUpper(requiredLevel) : this._isRequiredLevelInRange(requiredLevel);
                    //const isVisible = isAnyExpanded
                    $row.toggleVe(isVisible);
                    if (!isVisible && !isExpanded)
                        return doShowInitialPts();
                    doShowExpandedPts();
                }
                ;
                this._addHookBase("curLevel", hkLevel);
                this._addHookBase("targetLevel", hkLevel);
                hkLevel();
            } else {
                $row.showVe();
                doShowInitialPts();
            }

            return $row;
        }
        );
    }

    _render_$getSelChooseAbility(ix) {
        return ComponentUiUtil.$getSelEnum(this, "ability", {
            values: this._additionalSpells[ix].ability.choose,
            fnDisplay: abv=>Parser.attAbvToFull(abv),
            isAllowNull: true,
        }, );
    }

    _isRequiredLevelInRange(requiredLevel) {
        //The spell's required level has to be between curLevel and targetLevel (or equal to targetLevel)
        return this._isRequiredLevelInRangeLower(requiredLevel) && this._isRequiredLevelInRangeUpper(requiredLevel);
    }

    _isRequiredLevelInRangeLower(requiredLevel) {
        //The spell's required level has to be above the curlevel (not to  be mixed up with targetLevel)
        return requiredLevel > (this._state.curLevel ?? Number.MAX_SAFE_INTEGER);
    }

    _isRequiredLevelInRangeUpper(requiredLevel) {
        //The spell's required level has to be below or equal the targetLevel (not to  be mixed up with curlevel)
        return requiredLevel <= (this._state.targetLevel ?? Number.MIN_SAFE_INTEGER);
    }

    _isRequiredCasterLevelInRange(requiredCasterLevel) {
        if (requiredCasterLevel === 0)
            return this._state.isAnyCantrips;

        return this._isRequiredCasterLevelInRangeLower(requiredCasterLevel) && this._isRequiredCasterLevelInRangeUpper(requiredCasterLevel);
    }

    _isRequiredCasterLevelInRangeLower(requiredCasterLevel) {
        if (requiredCasterLevel === 0)
            return this._state.isAnyCantrips;

        return requiredCasterLevel >= (this._state.spellLevelLow ?? Number.MAX_SAFE_INTEGER);
    }

    _isRequiredCasterLevelInRangeUpper(requiredCasterLevel) {
        if (requiredCasterLevel === 0)
            return this._state.isAnyCantrips;

        return requiredCasterLevel <= (this._state.spellLevelHigh == null ? Number.MIN_SAFE_INTEGER : this._state.spellLevelHigh);
    }

    _getFlatSpellsInRange(ixSet=null, {isExpandedMatch=null}={}) {
        if (ixSet == null)
            ixSet = this._state.ixSet;

        return Object.values((this._additionalSpellsFlat[ixSet] || {
            spells: []
        }).spells).filter(flat=>{
            if (isExpandedMatch != null) {
                if (flat.isExpanded !== isExpandedMatch)
                    return false;
            }

            if (flat.isExpanded) {
                if (flat.requiredCasterLevel != null)
                    return this._isRequiredCasterLevelInRangeUpper(flat.requiredCasterLevel);
                else if (flat.requiredLevel != null)
                    return this._isRequiredLevelInRangeUpper(flat.requiredLevel);
                return true;
            }

            if (flat.requiredCasterLevel != null)
                return this._isRequiredCasterLevelInRange(flat.requiredCasterLevel);
            else if (flat.requiredLevel != null)
                {
                    return this._isRequiredLevelInRange(flat.requiredLevel);
                }
            return true;
        }
        );
    }

    _getFlatInnatePreparedSpellsInRange(ixSet) {
        return this._getFlatSpellsInRange(ixSet, {
            isExpandedMatch: false
        });
    }
    _getFlatExpandedSpellsInRange(ixSet) {
        return this._getFlatSpellsInRange(ixSet, {
            isExpandedMatch: true
        });
    }

    _isAnyInnatePrepared(ixSet) {
        return this._isAnyInnatePreparedExpanded(ixSet, {
            isExpandedMatch: false
        });
    }
    _isAnyExpanded(ixSet) {
        return this._isAnyInnatePreparedExpanded(ixSet, {
            isExpandedMatch: true
        });
    }

    _isAnyInnatePreparedExpanded(ixSet, {isExpandedMatch}) {
        if (ixSet == null)
            ixSet = this._state.ixSet;

        return Object.values((this._additionalSpellsFlat[ixSet] || {
            spells: []
        }).spells).some(flat=>flat.isExpanded === isExpandedMatch);
    }

    _isChooseAbility(ixSet) {
        if (ixSet == null)
            ixSet = this._state.ixSet;
        return (this._additionalSpells[ixSet]?.ability?.choose?.length ?? 0) > 1;
    }

    isNoChoice({curLevel, targetLevel, isStandalone}={}) {
        return this.constructor.isNoChoice(this._additionalSpells, {
            additionalSpellsFlat: this._additionalSpellsFlat,
            curLevel,
            targetLevel,
            isStandalone
        });
    }

    getFormData() {
        let flatSpellsInRange = this._getFlatSpellsInRange().map(it=>it.getCopy());

        const chooseFromGroups = {};
        flatSpellsInRange.forEach(flat=>{
            if (!flat.chooseFromGroup)
                return;

            chooseFromGroups[flat.chooseFromGroup] = chooseFromGroups[flat.chooseFromGroup] || {
                from: [],
                selectedValues: [],
                isAcceptable: false,
                count: flat.chooseFromCount ?? 1,
            };
            chooseFromGroups[flat.chooseFromGroup].from.push(flat);
        }
        );

        Object.entries(chooseFromGroups).forEach(([groupUid,groupMeta])=>{
            const {propBase} = this._getProps_chooseFrom({
                groupUid
            });

            groupMeta.isAcceptable = this._state[ComponentUiUtil.getMetaWrpMultipleChoice_getPropIsAcceptable(propBase)];

            groupMeta.selectedValues = ComponentUiUtil.getMetaWrpMultipleChoice_getSelectedValues(this, propBase, {
                values: groupMeta.from.map(it=>it.uid)
            });
        }
        );

        let cntNotChosen = 0;
        flatSpellsInRange = flatSpellsInRange.filter(flat=>{
            if (flat.type === "all")
                return true;
            if (flat.filterExpression != null) {
                const choiceMade = this._state[flat.key];
                if (!choiceMade) {
                    cntNotChosen++;
                    return false;
                }

                flat.filterExpression = null;
                flat.uid = this._state[flat.key];
                return true;
            }

            if (flat.chooseFromGroup != null) {
                return chooseFromGroups[flat.chooseFromGroup].selectedValues.includes(flat.uid);
            }

            return true;
        }
        );

        flatSpellsInRange = flatSpellsInRange.flatMap(flat=>{
            if (flat.type !== "all")
                return flat;

            if (flat.filterExpression != null) {
                const filterExpression = flat.filterExpression;
                flat.filterExpression = null;
                return this._modalFilterSpells.getItemsMatchingFilterExpression({
                    filterExpression
                }).map((li,i)=>flat.getCopy({
                    type: "spell",
                    key: `${flat.key}__${i}`,
                    uid: DataUtil.proxy.getUid("spell", {
                        name: li.name,
                        source: li.values.sourceJson
                    }),
                }, ));
            }

            if (flat.chooseFromGroup != null) {
                if (chooseFromGroups[flat.chooseFromGroup].selectedValues.includes(flat.uid))
                    return flat;
            }

            return null;
        }
        ).filter(Boolean);

        let abilityAbv;
        if (this._isChooseAbility(this._state.ixSet)) {
            abilityAbv = this._state.ability;
            if (abilityAbv == null)
                cntNotChosen++;
        } else
            abilityAbv = (this._additionalSpellsFlat[this._state.ixSet] || {
                meta: {}
            }).meta.ability;

        return {
            isFormComplete: cntNotChosen === 0 && Object.values(chooseFromGroups).every(it=>it.isAcceptable),
            data: flatSpellsInRange.map(it=>it.toObject()),
            abilityAbv,
        };
    }

    pGetFormData() {
        return this.getFormData();
    }

    _getDefaultState() {
        return {
            ixSet: 0,

            curLevel: null,
            targetLevel: null,
            spellLevelLow: null,
            spellLevelHigh: null,
            isAnyCantrips: false,

            spellsAlwaysPrepared: [],
            spellsExpanded: [],
            spellsAlwaysKnown: [],

            ability: null,

            pulseChoose: false,
        };
    }
}
class Charactermancer_Class_LevelSelect extends BaseComponent {
    static async pGetUserInput(opts) {
        return UtilApplications.pGetImportCompApplicationFormData({
            comp: new this(opts),
            isUnskippable: true,
            fnGetInvalidMeta: (formData)=>{
                if (formData.data.length === 0)
                    return {
                        type: "error",
                        message: `Please select some levels first!`
                    };
            }
            ,
            isAutoResize: true,
            width: 640,
        });
    }

    constructor(opts) {
        super();

        this._isSubclass = !!opts.isSubclass;
        this._isRadio = !!opts.isRadio;
        this._isForceSelect = !!opts.isForceSelect;
        this._featureArr = this.constructor._getLevelGroupedFeatures(opts.features, this._isSubclass);
        this._maxPreviousLevel = opts.maxPreviousLevel || 0;

        this._list = null;
        this._listSelectClickHandler = null;

        this._fnsOnChange = [];
    }

    get modalTitle() {
        return `Select ${this._isSubclass ? "Subclass" : "Class"} Levels`;
    }

    onchange(fn) {
        this._fnsOnChange.push(fn);
    }

    _doRunFnsOnchange() {
        this._fnsOnChange.forEach(fn=>fn());
    }

    setFeatures(features) {
        this._featureArr = this.constructor._getLevelGroupedFeatures(features, this._isSubclass);
        this._list.items.forEach(it=>it.data.fnUpdateRowText());
    }

    render($wrp) {
        const $cbAll = this._isRadio ? null : $(`<input type="checkbox" name="cb-select-all">`);
        const $wrpList = $(`<div class="veapp__list mb-1"></div>`);

        this._list = new List({ $wrpList: $wrpList, fnSort: null, isUseJquery: true, });

        this._listSelectClickHandler = new ListSelectClickHandler({ list: this._list });

        for (let ix = 0; ix < this._featureArr.length; ++ix) {
            const $cb = this._render_$getCbRow(ix);

            const $dispFeatures = $(`<span class="col-9-5"></span>`);
            const fnUpdateRowText = ()=>$dispFeatures.text(this.constructor._getRowText(this._featureArr[ix]));
            fnUpdateRowText();

            const $li = $$`<label class="w-100 ve-flex veapp__list-row veapp__list-row-hoverable ${this._isRadio 
                && this._isForceSelect && ix <= this._maxPreviousLevel ? `list-multi-selected` : ""} ${ix < this._maxPreviousLevel ? `ve-muted` : ""}">
				<span class="col-1 ve-flex-vh-center">${$cb}</span>
				<span class="col-1-5 ve-text-center">${ix + 1}</span>
				${$dispFeatures}
			</label>`.click((evt)=>{
                this._handleSelectClick(listItem, evt);
            }
            );

            const listItem = new ListItem(ix,$li,"",{},{ cbSel: $cb[0], fnUpdateRowText, },);
            this._list.addItem(listItem);
        }

        if (!this._isRadio) { this._listSelectClickHandler.bindSelectAllCheckbox($cbAll); }

        this._list.init();

        $$`<div class="ve-flex-col min-h-0">
			<div class="ve-flex-v-stretch input-group mb-1 no-shrink">
				<label class="btn btn-default btn-5et col-1 px-1 ve-flex-vh-center">${$cbAll}</label>
				<button class="btn-5et btn-default col-1-5">Level</button>
				<button class="btn-5et btn-default col-9-5">Features</button>
			</div>

			${$wrpList}
		</div>`.appendTo($wrp);
    }

    _render_$getCbRow(ix) {
        if (!this._isRadio) { return $(`<input type="checkbox" class="no-events">`); }

        const $cb = $(`<input type="radio" class="no-events">`);

        if(!SETTINGS.LOCK_EXISTING_CHOICES){
            //If we dont want to be hardlocked into a level after we loaded a save file, we can avoid disabling checkboxes of a lower level
            if (ix === this._maxPreviousLevel && this._isForceSelect) {$cb.prop("checked", true); }

            return $cb; 
        }

        if (ix === this._maxPreviousLevel && this._isForceSelect) {$cb.prop("checked", true); }
        else if (ix < this._maxPreviousLevel){$cb.prop("disabled", true);}

        return $cb;
    }

    _handleSelectClick(listItem, evt) {
        if (!this._isRadio) { return this._listSelectClickHandler.handleSelectClick(listItem, evt);}

        const isCheckedOld = listItem.data.cbSel.checked;

        const isDisabled = this._handleSelectClickRadio(this._list, listItem, evt);
        if (isDisabled) { return; }

        const isCheckedNew = listItem.data.cbSel.checked;
        if (isCheckedOld !== isCheckedNew) {this._doRunFnsOnchange();}
    }

    /**
     * @param {any} list list of elements, each one has a radio button
     * @param {any} item the element with our radio button
     * @param {any} evt the click event
     * @returns {boolean} true if the radio button is disabled
     */
    _handleSelectClickRadio(list, item, evt) {
        evt.preventDefault();
        evt.stopPropagation();

        if (item.data.cbSel.disabled) { return true; }

        list.items.forEach(it=>{
            if (it === item) { //For the radio button we clicked
                //You can uncheck radio buttons if forceSelect is off
                if (it.data.cbSel.checked && !this._isForceSelect) {
                    it.data.cbSel.checked = false;
                    it.ele.removeClass("list-multi-selected");
                    return;
                }

                //Otherwise just check button
                it.data.cbSel.checked = true;
                it.ele.addClass("list-multi-selected");
            }
            else { //For the radio buttons we didnt click
                //Make sure they are unchecked
                it.data.cbSel.checked = false;
                //But also mark all levels lower than the one we clicked as selected (grayed)
                if (it.ix < item.ix) { it.ele.addClass("list-multi-selected");}
                else { it.ele.removeClass("list-multi-selected"); }
            }
        });
    }

    pGetFormData() {
        let out = this._list.items.filter(it=>it.data.cbSel.checked).map(it=>it.ix);

        if (this._isRadio && out.length) {
            const max = out[0] + 1;
            out = [];
            for (let i = this._maxPreviousLevel; i < max; ++i)
                out.push(i);
        }

        return {
            isFormComplete: !!out.length,
            data: out,
        };
    }

    getCurLevel() {
        if (this._maxPreviousLevel) { return this._maxPreviousLevel; }
        return 0;
    }

    getTargetLevel() {
        const ixs = this._list.items.filter(it=>it.data.cbSel.checked).map(it=>it.ix);
        if (!ixs.length) { return null; }
        return Math.max(...ixs) + 1;
    }

    static _getRowText(lvl) {
        return lvl.map(f=>f.tableDisplayName || f.name).join(", ") || "\u2014";
    }

    static _getLevelGroupedFeatures(allFeatures, isSubclass) {
        allFeatures = MiscUtil.copy(allFeatures);
        if (!isSubclass)
            allFeatures = allFeatures.filter(it=>it.classFeature);
        const allFeaturesByLevel = [];

        let level = 1;
        let stack = [];
        const output = ()=>{
            allFeaturesByLevel.push(stack);
            stack = [];
        }
        ;
        allFeatures.forEach(f=>{
            while (level < f.level) {
                output();
                level++;
            }
            stack.push(f);
            level = f.level;
        }
        );
        output();

        while (level < Consts.CHAR_MAX_LEVEL) {
            output();
            level++;
        }

        return allFeaturesByLevel;
    }
}
class Charactermancer_Class_ProficiencyImportModeSelect extends BaseComponent {
    static async pGetUserInput() {
        return UtilApplications.pGetImportCompApplicationFormData({
            comp: new this(),
            isUnskippable: true,
            isAutoResize: true,
        });
    }

    pGetFormData() {
        return {
            isFormComplete: true,
            data: this._state.mode,
        };
    }

    get modalTitle() {
        return `Select Class Proficiency Import Mode`;
    }

    render($wrp) {
        const $sel = ComponentUiUtil.$getSelEnum(this, "mode", {
            values: [Charactermancer_Class_ProficiencyImportModeSelect.MODE_MULTICLASS, Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY, Charactermancer_Class_ProficiencyImportModeSelect.MODE_NONE, ],
            fnDisplay: mode=>Charactermancer_Class_ProficiencyImportModeSelect.DISPLAY_MODES[mode],
        }, );

        $$`<div class="ve-flex-col min-h-0">
			${$sel}
		</div>`.appendTo($wrp);
    }

    _getDefaultState() {
        return {
            mode: Charactermancer_Class_ProficiencyImportModeSelect.MODE_MULTICLASS,
        };
    }
}
Charactermancer_Class_ProficiencyImportModeSelect.MODE_MULTICLASS = 0;
Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY = 1;
Charactermancer_Class_ProficiencyImportModeSelect.MODE_NONE = 2;
Charactermancer_Class_ProficiencyImportModeSelect.DISPLAY_MODES = {
    [Charactermancer_Class_ProficiencyImportModeSelect.MODE_MULTICLASS]: "Add multiclass proficiencies (this is my second+ class)",
    [Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY]: "Add base class proficiencies and equipment (this is my first class)",
    [Charactermancer_Class_ProficiencyImportModeSelect.MODE_NONE]: "Do not add proficiencies or equipment",
};

class Charactermancer_Class_StartingProficiencies extends BaseComponent {
    
    constructor({featureSourceTracker, primaryProficiencies, multiclassProficiencies, savingThrowsProficiencies, existingProficienciesVetArmor, existingProficienciesVetWeapons, existingProficienciesVetSavingThrows, existingProficienciesFvttArmor, existingProficienciesFvttWeapons, existingProficienciesFvttSavingThrows, existingProficienciesCustomArmor, existingProficienciesCustomWeapons, }={}, ) {
        super();
        this._featureSourceTracker = featureSourceTracker;
        this._primaryProficiencies = Charactermancer_Class_StartingProficiencies._getCleanVetProfs(primaryProficiencies);
        this._multiclassProficiencies = Charactermancer_Class_StartingProficiencies._getCleanVetProfs(multiclassProficiencies);
        this._savingThrowsProficiencies = savingThrowsProficiencies;

        this._existingProficienciesVetArmor = existingProficienciesVetArmor;
        this._existingProficienciesVetWeapons = existingProficienciesVetWeapons;
        this._existingProficienciesVetSavingThrows = existingProficienciesVetSavingThrows;

        this._existingProficienciesCustomArmor = existingProficienciesCustomArmor;
        this._existingProficienciesCustomWeapons = existingProficienciesCustomWeapons;
        this._existingProficienciesFvttArmor = existingProficienciesFvttArmor ? MiscUtil.copy(existingProficienciesFvttArmor) : null;
        this._existingProficienciesFvttWeapons = existingProficienciesFvttWeapons ? MiscUtil.copy(existingProficienciesFvttWeapons) : null;
        this._existingProficienciesFvttSavingThrows = existingProficienciesFvttSavingThrows ? MiscUtil.copy(existingProficienciesFvttSavingThrows) : null;
    }
    
    
    /**
     * @param {any} {featureSourceTracker
     * @param {any} primaryProficiencies
     * @param {any} multiclassProficiencies
     * @param {any} savingThrowsProficiencies
     * @param {any} mode
     * @param {any} existingProficienciesFvttArmor
     * @param {any} existingProficienciesFvttWeapons
     * @param {any} existingProficienciesFvttSavingThrows
     * @param {any} }={}
     * @returns {Charactermancer_Class_StartingProficiencies}
     */
    static get({featureSourceTracker, primaryProficiencies, multiclassProficiencies, savingThrowsProficiencies, mode, existingProficienciesFvttArmor, existingProficienciesFvttWeapons, existingProficienciesFvttSavingThrows, }={}, ) {
        const {existingProficienciesVetArmor, existingProficienciesCustomArmor,
        existingProficienciesVetWeapons, existingProficienciesCustomWeapons,
        existingProficienciesVetSavingThrows, } = this._getExistingProficienciesVet({
            existingProficienciesFvttArmor,
            existingProficienciesFvttWeapons,
            existingProficienciesFvttSavingThrows,
        });

        const comp = new this({
            featureSourceTracker,
            primaryProficiencies,
            multiclassProficiencies,
            savingThrowsProficiencies,
            existingProficienciesVetArmor,
            existingProficienciesVetWeapons,
            existingProficienciesVetSavingThrows,

            existingProficienciesCustomArmor,
            existingProficienciesCustomWeapons,

            existingProficienciesFvttArmor,
            existingProficienciesFvttWeapons,
            existingProficienciesFvttSavingThrows,
        });

        if (mode != null)
            comp.mode = mode;

        return comp;
    }

    static async pGetUserInput({featureSourceTracker, primaryProficiencies, multiclassProficiencies, savingThrowsProficiencies, mode, existingProficienciesFvttArmor, existingProficienciesFvttWeapons, existingProficienciesFvttSavingThrows, }={}, ) {
        return this.get({
            featureSourceTracker,
            primaryProficiencies,
            multiclassProficiencies,
            savingThrowsProficiencies,
            mode,
            existingProficienciesFvttArmor,
            existingProficienciesFvttWeapons,
            existingProficienciesFvttSavingThrows,
        }).pGetFormData();
    }

    static applyFormDataToActorUpdate(actUpdate, formData) {
        MiscUtil.getOrSet(actUpdate, "system", "traits", {});

        this._applyFormDataToActorUpdate_applyProfList({
            actUpdate,
            profList: formData?.data?.armor || [],
            profsExisting: formData?.existingDataFvtt?.existingProficienciesArmor || {},
            propTrait: "armorProf",
            fnGetMapped: UtilActors.getMappedArmorProficiency.bind(UtilActors),
        });

        this._applyFormDataToActorUpdate_applyProfList({
            actUpdate,
            profList: formData.data?.weapons || [],
            profsExisting: formData?.existingDataFvtt?.existingProficienciesWeapons || {},
            propTrait: "weaponProf",
            fnGetMapped: UtilActors.getMappedWeaponProficiency.bind(UtilActors),
            fnGetPreMapped: UtilActors.getItemUIdFromWeaponProficiency.bind(UtilActors),
        });

        const tgtAbils = MiscUtil.getOrSet(actUpdate, "system", "abilities", {});
        [...(formData.data?.savingThrows || []), ...(formData.existingDataFvtt?.savingThrows || [])].forEach(abv=>(tgtAbils[abv] = tgtAbils[abv] || {}).proficient = 1);
    }

    static _applyFormDataToActorUpdate_addIfNotExists(arr, itm) {
        if (!arr.some(it=>it.toLowerCase().trim() === itm.toLowerCase().trim()))
            arr.push(itm);
    }

    static _applyFormDataToActorUpdate_applyProfList({actUpdate, profList, profsExisting, propTrait, fnGetMapped, fnGetPreMapped, }, ) {
        if (!profList?.length)
            return;

        const tgt = MiscUtil.getOrSet(actUpdate, "system", "traits", propTrait, {});
        tgt.value = tgt.value || [];
        tgt.custom = tgt.custom || "";

        const customArr = tgt.custom.split(";").map(it=>it.trim()).filter(Boolean);

        (profsExisting.value || []).forEach(it=>this._applyFormDataToActorUpdate_addIfNotExists(tgt.value, it));

        (profsExisting.custom || "").split(";").map(it=>it.trim()).filter(Boolean).forEach(it=>this._applyFormDataToActorUpdate_addIfNotExists(customArr, it));

        profList.forEach(it=>{
            const clean = (fnGetPreMapped ? fnGetPreMapped(it) : null) ?? Renderer.stripTags(it).toLowerCase();
            const mapped = fnGetMapped(clean);
            if (mapped)
                return this._applyFormDataToActorUpdate_addIfNotExists(tgt.value, mapped);

            const [itemTag] = /{@item [^}]+}/i.exec(it) || [];
            if (itemTag) {
                const mappedAlt = fnGetMapped(Renderer.stripTags(itemTag));
                if (mappedAlt)
                    return this._applyFormDataToActorUpdate_addIfNotExists(tgt.value, mappedAlt);
            }

            this._applyFormDataToActorUpdate_addIfNotExists(customArr, Renderer.stripTags(it));
        }
        );

        tgt.custom = customArr.join("; ");
    }

    static getExistingProficienciesFvttSavingThrows(actor) {
        return Object.entries(MiscUtil.get(actor, "_source", "system", "abilities") || {}).filter(([,abMeta])=>abMeta.proficient).map(([ab])=>ab);
    }

    static _getExistingProficienciesVet({existingProficienciesFvttArmor, existingProficienciesFvttWeapons, existingProficienciesFvttSavingThrows}) {
        const vetValidWeapons = new Set();
        const customWeapons = new Set();
        const vetValidArmors = new Set();
        const customArmors = new Set();

        this._getExistingProficienciesVet_({
            existingFvtt: existingProficienciesFvttWeapons,
            fnGetUnmapped: UtilActors.getUnmappedWeaponProficiency.bind(UtilActors),
            fnCheckUnmappedAlt: UtilActors.getItemUIdFromWeaponProficiency.bind(UtilActors),
            vetValidSet: vetValidWeapons,
            customSet: customWeapons,
        });

        this._getExistingProficienciesVet_({
            existingFvtt: existingProficienciesFvttArmor,
            fnGetUnmapped: UtilActors.getUnmappedArmorProficiency.bind(UtilActors),
            vetValidSet: vetValidArmors,
            customSet: customArmors,
        });

        return {
            existingProficienciesVetWeapons: [...vetValidWeapons],
            existingProficienciesCustomWeapons: [...customWeapons],
            existingProficienciesVetArmor: [...vetValidArmors],
            existingProficienciesCustomArmor: [...customArmors],
            existingProficienciesVetSavingThrows: existingProficienciesFvttSavingThrows,
        };
    }

    static _getExistingProficienciesVet_({existingFvtt, vetValidSet, customSet, fnGetUnmapped, fnCheckUnmappedAlt, }) {
        (existingFvtt?.value || []).forEach(it=>{
            const unmapped = fnGetUnmapped(it);
            if (unmapped)
                vetValidSet.add(unmapped);
            else {
                if (fnCheckUnmappedAlt) {
                    const unmappedVet = fnCheckUnmappedAlt(it);
                    if (unmappedVet)
                        vetValidSet.add(it);
                    else
                        customSet.add(it);
                } else {
                    customSet.add(it);
                }
            }
        }
        );

        (existingFvtt?.custom || "").trim().split(";").map(it=>it.trim()).filter(Boolean).forEach(it=>{
            const low = it.toLowerCase();
            const unmapped = fnGetUnmapped(low);
            if (unmapped)
                vetValidSet.add(unmapped);
            else {
                if (fnCheckUnmappedAlt) {
                    const unmappedVet = fnCheckUnmappedAlt(low);
                    if (unmappedVet)
                        vetValidSet.add(low);
                    else
                        customSet.add(it);
                } else {
                    customSet.add(it);
                }
            }
        }
        );
    }

    static _getCleanVetProfs(vetProfs) {
        if (!vetProfs)
            return {};

        const out = {};

        if (vetProfs.armor)
            out.armor = this._getCleanVetProfs_getMappedItemTags(vetProfs.armor.map(it=>it.proficiency || it));
        if (vetProfs.weapons)
            out.weapons = this._getCleanVetProfs_getMappedItemTags(vetProfs.weapons.map(it=>(it.proficiency || it).toLowerCase().trim()));

        return out;
    }

    static _getCleanVetProfs_getMappedItemTags(arr) {
        return arr.map(it=>it.replace(/^{@item ([^}]+)}$/g, (...m)=>{
            const [name,source] = Renderer.splitTagByPipe(m[1]);
            return `${name}|${source || Parser.SRC_DMG}`.toLowerCase();
        }
        ));
    }

    

    set mode(mode) {
        this._state.mode = mode;
    }

    _getFormData() {
        const isPrimary = this._state.mode === Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY;
        const profs = isPrimary ? this._primaryProficiencies : this._multiclassProficiencies;

        if (!profs)
            return {
                isFormComplete: true,
                data: {},
                existingData: {}
            };

        return {
            isFormComplete: true,
            data: {
                armor: profs.armor || [],
                weapons: profs.weapons || [],
                savingThrows: isPrimary ? (this._savingThrowsProficiencies || []) : [],
            },
            existingDataFvtt: {
                existingProficienciesArmor: this._existingProficienciesFvttArmor,
                existingProficienciesWeapons: this._existingProficienciesFvttWeapons,
                existingProficienciesSavingThrows: this._existingProficienciesFvttSavingThrows,
            },
        };
    }

    pGetFormData() {
        return this._getFormData();
    }

    render($wrp) {
        const $wrpDisplay = $(`<div class="ve-flex-col min-h-0 ve-small"></div>`).appendTo($wrp);

        const fnsCleanup = [];

        const hkMode = ()=>{
            fnsCleanup.forEach(fn=>fn());
            fnsCleanup.splice(0, fnsCleanup.length);

            $wrpDisplay.empty();
            const isPrimary = this._state.mode === Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY;


            const profs = isPrimary ? this._primaryProficiencies : this._multiclassProficiencies;
            if (profs) {
                this._render_profType({
                    profList: profs.armor,
                    title: "Armor",
                    $wrpDisplay,
                    propTracker: "armorProficiencies",
                    propTrackerPulse: "pulseArmorProficiencies",
                    fnsCleanup,
                    existing: this._existingProficienciesVetArmor,
                    existingProficienciesCustom: this._existingProficienciesCustomArmor,
                    fnDisplay: str=>["light", "medium", "heavy"].includes(str) ? `${str} armor` : str.includes("|") ? `{@item ${str}}` : str,
                });

                this._render_profType({
                    profList: profs.weapons,
                    title: "Weapons",
                    $wrpDisplay,
                    propTracker: "weaponProficiencies",
                    propTrackerPulse: "pulseWeaponProficiencies",
                    fnsCleanup,
                    existing: this._existingProficienciesVetWeapons,
                    existingProficienciesCustom: this._existingProficienciesCustomWeapons,
                    fnDisplay: str=>["simple", "martial"].includes(str) ? `${str} weapons` : str.includes("|") ? `{@item ${str}}` : str,
                });
            }

            if (isPrimary && this._savingThrowsProficiencies) {
                this._render_profType({
                    profList: this._savingThrowsProficiencies,
                    title: "Saving Throws",
                    $wrpDisplay,
                    propTracker: "savingThrowProficiencies",
                    propTrackerPulse: "pulseSavingThrowProficiencies",
                    fnsCleanup,
                    existing: this._existingProficienciesVetSavingThrows,
                    fnDisplay: str=>Parser.attAbvToFull(str),
                });
            }

            if (this._featureSourceTracker) {this._featureSourceTracker.setState(this, this._getStateTrackerData());}
        };
        this._addHookBase("mode", hkMode);
        hkMode();
    }

    _getStateTrackerData() {
        const formData = this._getFormData();

        const getNoTags = (arr)=>arr.map(it=>this.constructor._getUid(it)).filter(Boolean);

        return {
            armorProficiencies: getNoTags(formData.data?.armor || []).mergeMap(it=>({
                [it]: true
            })),
            weaponProficiencies: getNoTags(formData.data?.weapons || []).mergeMap(it=>({
                [it]: true
            })),
        };
    }

    static _getUid(str) {
        if (!str.startsWith("{@item"))
            return str;

        let[name,source] = Renderer.splitTagByPipe((Renderer.splitFirstSpace(str.slice(1, -1))[1] || "").toLowerCase());
        source = source || Parser.SRC_DMG.toLowerCase();
        if (!name)
            return null;

        return `${name}|${source}`;
    }

    _render_profType({profList, title, $wrpDisplay, propTracker, propTrackerPulse, fnsCleanup, existing, existingProficienciesCustom, fnDisplay}) {
        if (!profList?.length)
            return;

        const profListUids = profList.map(prof=>this.constructor._getUid(prof));

        const $ptsExisting = {};

        const $wrps = profList.map((it,i)=>{
            const $ptExisting = $(`<div class="ve-small veapp__msg-warning inline-block"></div>`);
            const uid = profListUids[i];
            $ptsExisting[uid] = $ptExisting;
            const isNotLast = i < profList.length - 1;
            return $$`<div class="inline-block ${isNotLast ? "mr-1" : ""}">${Renderer.get().render(fnDisplay ? fnDisplay(it) : it)}${$ptExisting}${isNotLast ? `,` : ""}</div>`;
        }
        );

        $$`<div class="block">
			<div class="mr-1 bold inline-block">${title}:</div>${$wrps}
		</div>`.appendTo($wrpDisplay);

        const pHkUpdatePtsExisting = async()=>{
            try {
                await this._pLock("updateExisting");
                await pHkUpdatePtsExisting_();
            }
            finally {
                this._unlock("updateExisting");
            }
        };

        const pHkUpdatePtsExisting_ = async()=>{
            const otherStates = this._featureSourceTracker ? this._featureSourceTracker.getStatesForKey(propTracker, {
                ignore: this
            }) : null;

            for (const v of profListUids) {
                if (!$ptsExisting[v])
                    return;

                const parentGroup = await UtilDataConverter.pGetItemWeaponType(v);

                let isExisting = (existing || []).includes(v) || (parentGroup && (existing || []).includes(parentGroup)) || (existingProficienciesCustom || []).includes(v) || (parentGroup && (existingProficienciesCustom || []).includes(parentGroup));

                isExisting = isExisting || (otherStates || []).some(otherState=>!!otherState[v] || (parentGroup && !!otherState[parentGroup]));

                $ptsExisting[v].title(isExisting ? "Proficient from Another Source" : "").toggleClass("ml-1", isExisting).html(isExisting ? `(<i class="fas fa-fw ${UtilActors.PROF_TO_ICON_CLASS[1]}"></i>)` : "");
            }
        };
        if (this._featureSourceTracker) {
            this._featureSourceTracker.addHook(this, propTrackerPulse, pHkUpdatePtsExisting);
            fnsCleanup.push(()=>this._featureSourceTracker.removeHook(this, propTrackerPulse, pHkUpdatePtsExisting));
        }
        pHkUpdatePtsExisting();
    }

    _getDefaultState() {
        return {
            mode: Charactermancer_Class_ProficiencyImportModeSelect.MODE_PRIMARY,
        };
    }
}

ActorCharactermancerClass.ExistingClassMeta = class {
    constructor({
      item: item,
      ixClass: ixClass,
      isUnknownClass: isUnknownClass,
      ixSubclass: ixSubclass,
      isUnknownSubclass: isUnknownSubclass,
      level: level,
      isPrimary: isPrimary,
      spellSlotLevelSelection: spellSlotLevelSelection
    }) {
      this.item = item;
      this.ixClass = ixClass;
      this.isUnknownClass = isUnknownClass;
      this.ixSubclass = ixSubclass;
      this.isUnknownSubclass = isUnknownSubclass;
      this.level = level;
      this.isPrimary = isPrimary;
      this.spellSlotLevelSelection = spellSlotLevelSelection;
      if (isNaN(this.level)) { this.level = 0; }
    }
  };

//#endregion

//#region Charactermancer Ability
/**The panel that handles adjusting ability scores */
class ActorCharactermancerAbility extends ActorCharactermancerBaseComponent {
    static _STORAGE_KEY__PB_CUSTOM = "actor_charactermancer_ability";
    constructor(parentInfo) {
      parentInfo = parentInfo || {};
      super();
      this._actor = parentInfo.actor;
      this._data = parentInfo.data;
      this._parent = parentInfo.parent;
      this._tabAbilities = parentInfo.tabAbilities;
      this._compStatgen = null;
    }
    render() {
        const parentDiv = this._tabAbilities?.$wrpTab;
        if (!parentDiv) {return;}

        //This element will handle the heavy lifting, both UI wise and logic wise
        this._compStatgen = new StatGenUiCharactermancer({
            'isCharacterMode': true,
            'isFvttMode': true,
            'races': this._data.race,
            'backgrounds': this._data.background,
            'feats': this._data.feat,
            'modalFilterRaces': this._parent.compRace.modalFilterRaces,
            'modalFilterBackgrounds': this._parent.compBackground.modalFilterBackgrounds,
            'modalFilterFeats': this._parent.compFeat.modalFilterFeats,
            /* 'existingScores': this._getExistingScores() */
        });

        /* const clientThenWorld = GameStorage.getClientThenWorld(this.constructor._STORAGE_KEY__PB_CUSTOM);
        if (clientThenWorld != null) {this._compStatgen.setStateFrom(clientThenWorld);} */

        const pbRulesHook = MiscUtil.throttle(this._doSavePbRules.bind(this), 100); 
        this._compStatgen.addHookPointBuyCustom(pbRulesHook);

        //Render the ui for changing ability scores
        this._compStatgen.render(parentDiv);

        //Create a hook for recounting ASI
        const e_recountASI = () => {
            let asiCount = 0;
            //Go through each class open on the class component
            for (let ix = 0; ix < this._parent.compClass.state.class_ixMax + 1; ++ix) {
                //Get the index the component uses for the class, and get the ASI count that this class has unlocked
                const { propIxClass: propIxClass, propCntAsi: propCntAsi } =
                    ActorCharactermancerBaseComponent.class_getProps(ix);
                //Get the class
                const cls = this._parent.compClass.getClass_({ propIxClass: propIxClass });
                if (!cls) { continue; }
                asiCount += Number(this._parent.compClass.state[propCntAsi]) || 0;
            }
            this._compStatgen.common_cntAsi = asiCount;
        };
        this._parent.compClass.addHookBase("class_pulseChange", e_recountASI);
        this._parent.compClass.addHookBase('class_totalLevels', e_recountASI);
        e_recountASI();

        const onAsiPulse = () => this._parent.compFeat.setAdditionalFeatStateFromStatgen_();
        this._compStatgen.addHookPulseAsi(onAsiPulse);

        this._parent.compFeat.setAdditionalFeatStateFromStatgen_();

        //If we change our race or background, call these events to change it elsewhere too
        const onRaceChangedHere = () => this._parent.compRace.state.race_ixRace = this._compStatgen.ixRace;
        this._compStatgen.addHookIxRace(onRaceChangedHere);
        const onBackgroundChangedHere = () => this._parent.compBackground.state.background_ixBackground = this._compStatgen.ixBackground;
        this._compStatgen.addHookIxBackground(onBackgroundChangedHere);

        //If state changes their race or background, call these events to change it here too
        const onRaceChangedThere = () => this._compStatgen.ixRace = this._parent.compRace.state.race_ixRace;
        this._parent.compRace.addHookBase("race_ixRace", onRaceChangedThere);
        const onBackgroundChangedThere = () => this._compStatgen.ixBackground = this._parent.compBackground.state.background_ixBackground;
        this._parent.compBackground.addHookBase("background_ixBackground", onBackgroundChangedThere);

        //Set our race and background to be what state says it is
        this._compStatgen.ixRace = this._parent.compRace.state.race_ixRace;
        this._compStatgen.ixBackground = this._parent.compBackground.state.background_ixBackground;
    }

    get compStatgen() { return this._compStatgen; }
    addHookAbilityScores(...hook) {
      return this._compStatgen.addHookAbilityScores(...hook);
    }
    getMode(...ix) {
      return this._compStatgen.getMode(...ix);
    }
    getTotals(...ix) {
      return this._compStatgen.getTotals(...ix);
    }
    
    _doSavePbRules() {
      const pointBuySavedState = this._compStatgen.getSaveableStatePointBuyCustom();
      GameStorage.pSetWorldThenClient(this.constructor._STORAGE_KEY__PB_CUSTOM, pointBuySavedState).then(null);
    }
    _getExistingScores() {
      if (!Charactermancer_Util.getCurrentLevel(this._actor)) {
        return null;
      }
      return Charactermancer_Util.getBaseAbilityScores(this._actor);
    }
    _getDefaultState() {
      return {};
    }

    /**
     * Sets the state of the StatgenUI based on a save file. This should be called just after first render.
     * @param {{abilities:{mode:number, state:any}} actor
     */
    setStateFromSaveFile(actor){
        const data = actor.abilities;

        //Set the mode for the state
        this._compStatgen._meta.ixActiveTab___default = data.mode;
        //Set the UI select element to have the right value selected
        this._compStatgen._selModeElement[0].value = data.mode;

        //Print values over onto state
        for(let prop of Object.keys(data.state)){
            let val = data.state[prop];
            this._compStatgen._state[prop] = val;
        }

        //Now do the same for props regarding ASI's and feat choices
        if(data.stateAsi){
            for(let prop of Object.keys(data.stateAsi)){
                let val = data.stateAsi[prop];
                this._compStatgen._state[prop] = val;
            }
        }
    }
}

class StatGenUi extends BaseComponent {
    static _PROPS_POINT_BUY_CUSTOM = ["pb_rules", "pb_budget", "pb_isCustom", ];

    constructor(opts) {
        super();
        opts = opts || {};

        TabUiUtilSide.decorate(this, {
            isInitMeta: true
        });

        this._races = opts.races; //Set races
        this._backgrounds = opts.backgrounds;
        this._feats = opts.feats;
        this._tabMetasAdditional = opts.tabMetasAdditional;
        this._isCharacterMode = opts.isCharacterMode;
        this._isFvttMode = opts.isFvttMode;

        this._MODES = this._isFvttMode ? StatGenUi.MODES_FVTT : StatGenUi.MODES;
        if (this._isFvttMode) {
            let cnt = 0;
            this._IX_TAB_NONE = cnt++;
            this._IX_TAB_ROLLED = cnt++;
            this._IX_TAB_ARRAY = cnt++;
            this._IX_TAB_PB = cnt++;
            this._IX_TAB_MANUAL = cnt;
        }
        else {
            this._IX_TAB_NONE = -1;
            let cnt = 0;
            this._IX_TAB_ROLLED = cnt++;
            this._IX_TAB_ARRAY = cnt++;
            this._IX_TAB_PB = cnt++;
            this._IX_TAB_MANUAL = cnt;
        }

        this._modalFilterRaces = opts.modalFilterRaces || new ModalFilterRaces({
            namespace: "statgen.races",
            isRadio: true,
            allData: this._races
        });
        this._modalFilterBackgrounds = opts.modalFilterBackgrounds || new ModalFilterBackgrounds({
            namespace: "statgen.backgrounds",
            isRadio: true,
            allData: this._backgrounds
        });
        this._modalFilterFeats = opts.modalFilterFeats || new ModalFilterFeats({
            namespace: "statgen.feats",
            isRadio: true,
            allData: this._feats
        });

        this._isLevelUp = !!opts.existingScores;
        this._existingScores = opts.existingScores;

        this._$rollIptFormula = null;

        this._compAsi = new StatGenUi.CompAsi({ parent: this });
    }

    get MODES() {
        return this._MODES;
    }

    render($parent) {
        $parent.empty().addClass("statgen");

        //If we are leveling up, some UI changes
        const iptTabMetas = this._isLevelUp ? [new TabUiUtil.TabMeta({
            name: "Existing",
            icon: this._isFvttMode ? `fas fa-fw fa-user` : `far fa-fw fa-user`,
            hasBorder: true
        }), ...this._tabMetasAdditional || [], ] : [this._isFvttMode ? new TabUiUtil.TabMeta({
            name: "Select...",
            icon: this._isFvttMode ? `fas fa-fw fa-square` : `far fa-fw fa-square`,
            hasBorder: true,
            isNoPadding: this._isFvttMode
        }) : null, new TabUiUtil.TabMeta({
            name: "Roll",
            icon: this._isFvttMode ? `fas fa-fw fa-dice` : `far fa-fw fa-dice`,
            hasBorder: true,
            isNoPadding: this._isFvttMode
        }), new TabUiUtil.TabMeta({
            name: "Standard Array",
            icon: this._isFvttMode ? `fas fa-fw fa-signal` : `far fa-fw fa-signal-alt`,
            hasBorder: true,
            isNoPadding: this._isFvttMode
        }), new TabUiUtil.TabMeta({
            name: "Point Buy",
            icon: this._isFvttMode ? `fas fa-fw fa-chart-bar` : `far fa-fw fa-chart-bar`,
            hasBorder: true,
            isNoPadding: this._isFvttMode
        }), new TabUiUtil.TabMeta({
            name: "Manual",
            icon: this._isFvttMode ? `fas fa-fw fa-tools` : `far fa-fw fa-tools`,
            hasBorder: true,
            isNoPadding: this._isFvttMode
        }), ...this._tabMetasAdditional || [], ].filter(Boolean);

        const tabMetas = this._renderTabs(iptTabMetas, {$parent: this._isFvttMode ? null : $parent});
        if (this._isFvttMode) {
            if (!this._isLevelUp) {
                const {propActive: propActiveTab, propProxy: propProxyTabs} = this._getTabProps();
                const $selMode = ComponentUiUtil.$getSelEnum(this, propActiveTab, {
                    values: iptTabMetas.map((_,ix)=>ix),
                    fnDisplay: ix=>iptTabMetas[ix].name,
                    propProxy: propProxyTabs,
                }, ).addClass("max-w-200p");
                $$`<div class="ve-flex-v-center statgen-shared__wrp-header">
					<div class="mr-2"><b>Mode</b></div>
					${$selMode}
				</div>
				<hr class="hr-2">`.appendTo($parent);
                this._selModeElement = $selMode; //just caching this here so we can access it and change it from elsewhere if we want to
            }

            tabMetas.forEach(it=>it.$wrpTab.appendTo($parent));
        }

        const $wrpAll = $(`<div class="ve-flex-col w-100 h-100"></div>`);
        this._render_all($wrpAll);

        const hkTab = ()=> { tabMetas[this.ixActiveTab || 0].$wrpTab.append($wrpAll); };

        this._addHookActiveTab(hkTab);
        hkTab();

        this._addHookBase("common_cntAsi", ()=>this._state.common_pulseAsi = !this._state.common_pulseAsi);
        this._addHookBase("common_cntFeatsCustom", ()=>this._state.common_pulseAsi = !this._state.common_pulseAsi);
    }

    _render_all($wrpTab) {
        if (this._isLevelUp){return this._render_isLevelUp($wrpTab);}
        this._render_isLevelOne($wrpTab);
    }

    _render_isLevelOne($wrpTab) {
        let $stgNone;
        let $stgMain;
        const $elesRolled = [];
        const $elesArray = [];
        const $elesPb = [];
        const $elesManual = [];

        const $stgRolledHeader = this._render_$getStgRolledHeader();
        const hkStgRolled = ()=>$stgRolledHeader.toggleVe(this.ixActiveTab === this._IX_TAB_ROLLED);
        this._addHookActiveTab(hkStgRolled);
        hkStgRolled();

        const $stgPbHeader = this._render_$getStgPbHeader();
        const $stgPbCustom = this._render_$getStgPbCustom();
        const $vrPbCustom = $(`<div class="vr-5 mobile-ish__hidden"></div>`);
        const $hrPbCustom = $(`<hr class="hr-5 mobile-ish__visible">`);
        const hkStgPb = ()=>{
            $stgPbHeader.toggleVe(this.ixActiveTab === this._IX_TAB_PB);
            $stgPbCustom.toggleVe(this.ixActiveTab === this._IX_TAB_PB);
            $vrPbCustom.toggleVe(this.ixActiveTab === this._IX_TAB_PB);
            $hrPbCustom.toggleVe(this.ixActiveTab === this._IX_TAB_PB);
        };
        this._addHookActiveTab(hkStgPb);
        hkStgPb();

        const $stgArrayHeader = this._render_$getStgArrayHeader();
        const hkStgArray = ()=>$stgArrayHeader.toggleVe(this.ixActiveTab === this._IX_TAB_ARRAY);
        this._addHookActiveTab(hkStgArray);
        hkStgArray();

        const $stgManualHeader = this._render_$getStgManualHeader();
        const hkStgManual = ()=>$stgManualHeader.toggleVe(this.ixActiveTab === this._IX_TAB_MANUAL);
        this._addHookActiveTab(hkStgManual);
        hkStgManual();

        const hkElesMode = ()=>{
            $stgNone.toggleVe(this.ixActiveTab === this._IX_TAB_NONE);
            $stgMain.toggleVe(this.ixActiveTab !== this._IX_TAB_NONE);

            $elesRolled.forEach($ele=>$ele.toggleVe(this.ixActiveTab === this._IX_TAB_ROLLED));
            $elesArray.forEach($ele=>$ele.toggleVe(this.ixActiveTab === this._IX_TAB_ARRAY));
            $elesPb.forEach($ele=>$ele.toggleVe(this.ixActiveTab === this._IX_TAB_PB));
            $elesManual.forEach($ele=>$ele.toggleVe(this.ixActiveTab === this._IX_TAB_MANUAL));
        };
        this._addHookActiveTab(hkElesMode);

        const $btnResetRolledOrArrayOrManual = $(`<button class="btn btn-default btn-xxs relative statgen-shared__btn-reset" title="Reset"><span class="glyphicon glyphicon-refresh"></span></button>`).click(()=>this._doReset());
        const hkRolledOrArray = ()=>$btnResetRolledOrArrayOrManual.toggleVe(this.ixActiveTab === this._IX_TAB_ROLLED || this.ixActiveTab === this._IX_TAB_ARRAY || this.ixActiveTab === this._IX_TAB_MANUAL);
        this._addHookActiveTab(hkRolledOrArray);
        hkRolledOrArray();

        const $wrpsBase = Parser.ABIL_ABVS.map(ab=>{
            const {propAbilSelectedRollIx} = this.constructor._rolled_getProps(ab);

            const $selRolled = $(`<select class="form-control input-xs form-control--minimal statgen-shared__ipt statgen-shared__ipt--sel"></select>`).change(()=>{
                const ix = Number($selRolled.val());

                const nxtState = {
                    ...Parser.ABIL_ABVS.map(ab=>this.constructor._rolled_getProps(ab).propAbilSelectedRollIx).filter(prop=>ix != null && this._state[prop] === ix).mergeMap(prop=>({
                        [prop]: null
                    })),
                    [propAbilSelectedRollIx]: ~ix ? ix : null,
                };
                this._proxyAssignSimple("state", nxtState);
            }
            );
            $(`<option/>`, { value: -1, text: "\u2014" }).appendTo($selRolled);

            let $optionsRolled = [];
            const hkRolls = ()=>{
                $optionsRolled.forEach($opt=>$opt.remove());

                this._state.rolled_rolls.forEach((it,i)=>{
                    const cntPrevRolls = this._state.rolled_rolls.slice(0, i).filter(r=>r.total === it.total).length;
                    const $opt = $(`<option/>`, {
                        value: i,
                        text: `${it.total}${cntPrevRolls ? Parser.numberToSubscript(cntPrevRolls) : ""}`
                    }).appendTo($selRolled);
                    $optionsRolled.push($opt);
                }
                );

                let nxtSelIx = this._state[propAbilSelectedRollIx];
                if (nxtSelIx >= this._state.rolled_rolls.length)
                    nxtSelIx = null;
                $selRolled.val(`${nxtSelIx == null ? -1 : nxtSelIx}`);
                if ((nxtSelIx) !== this._state[propAbilSelectedRollIx])
                    this._state[propAbilSelectedRollIx] = nxtSelIx;
            };

            this._addHookBase("rolled_rolls", hkRolls);
            hkRolls();

            const hookIxRolled = ()=>{
                const ix = this._state[propAbilSelectedRollIx] == null ? -1 : this._state[propAbilSelectedRollIx];
                $selRolled.val(`${ix}`);
            };

            this._addHookBase(propAbilSelectedRollIx, hookIxRolled);
            hookIxRolled();

            $elesRolled.push($selRolled);

            const {propAbilSelectedScoreIx} = this.constructor._array_getProps(ab);

            const $selArray = $(`<select class="form-control input-xs form-control--minimal statgen-shared__ipt statgen-shared__ipt--sel"></select>`).change(()=>{
                const ix = Number($selArray.val());

                const nxtState = {
                    ...Parser.ABIL_ABVS.map(ab=>this.constructor._array_getProps(ab).propAbilSelectedScoreIx).filter(prop=>ix != null && this._state[prop] === ix).mergeMap(prop=>({
                        [prop]: null
                    })),
                    [propAbilSelectedScoreIx]: ~ix ? ix : null,
                };
                this._proxyAssignSimple("state", nxtState);
            }
            );

            $(`<option/>`, {
                value: -1,
                text: "\u2014"
            }).appendTo($selArray);

            StatGenUi._STANDARD_ARRAY.forEach((it,i)=>$(`<option/>`, {
                value: i,
                text: it
            }).appendTo($selArray));

            const hookIxArray = ()=>{
                const ix = this._state[propAbilSelectedScoreIx] == null ? -1 : this._state[propAbilSelectedScoreIx];
                $selArray.val(`${ix}`);
            };

            this._addHookBase(propAbilSelectedScoreIx, hookIxArray);
            hookIxArray();

            $elesArray.push($selArray);

            const propPb = `pb_${ab}`;
            const $iptPb = ComponentUiUtil.$getIptInt(this, propPb, 0, {
                fallbackOnNaN: 0,
                min: 0,
                html: `<input class="form-control form-control--minimal statgen-shared__ipt text-right" type="number">`,
            }, );

            const hkPb = ()=>{
                const {min: minScore, max: maxScore} = this._pb_getMinMaxScores();
                this._state[propPb] = Math.min(maxScore, Math.max(minScore, this._state[propPb]));
            };
            
            this._addHookBase(propPb, hkPb);
            hkPb();

            $elesPb.push($iptPb);

            const {propAbilValue} = this.constructor._manual_getProps(ab);
            const $iptManual = ComponentUiUtil.$getIptInt(this, propAbilValue, 0, {
                fallbackOnNaN: 0,
                html: `<input class="form-control form-control--minimal statgen-shared__ipt text-right" type="number">`,
            }, );

            $elesManual.push($iptManual);

            return $$`<label class="my-1 statgen-pb__cell">
				${$selRolled}
				${$selArray}
				${$iptPb}
				${$iptManual}
			</label>`;
        }
        );

        const $wrpsUser = this._render_$getWrpsUser();

        const metasTotalAndMod = this._render_getMetasTotalAndMod();
        const {$wrpOuter: $wrpRaceOuter, $stgSel: $stgRaceSel, $dispPreview: $dispPreviewRace, $hrPreview: $hrPreviewRaceTashas, $dispTashas, } = this._renderLevelOneRace.render();
        const {$wrpOuter: $wrpBackgroundOuter, $stgSel: $stgBackgroundSel, $dispPreview: $dispPreviewBackground, $hrPreview: $hrPreviewBackground, } = this._renderLevelOneBackground.render();


        const $wrpAsi = this._render_$getWrpAsi();

        $stgNone = $$`<div class="ve-flex-col w-100 h-100">
			<div class="ve-flex-v-center"><i>Please select a mode.</i></div>
		</div>`;

        $stgMain = $$`<div class="ve-flex-col w-100 h-100">
			${$stgRolledHeader}
			${$stgArrayHeader}
			${$stgManualHeader}

			<div class="ve-flex mobile-ish__ve-flex-col w-100 px-3">
				<div class="ve-flex-col">
					${$stgPbHeader}

					<div class="ve-flex">
						<div class="ve-flex-col mr-3">
							<div class="my-1 statgen-pb__header"></div>
							<div class="my-1 statgen-pb__header ve-flex-h-right">${$btnResetRolledOrArrayOrManual}</div>

							${Parser.ABIL_ABVS.map(it=>`<div class="my-1 bold statgen-pb__cell ve-flex-v-center ve-flex-h-right" title="${Parser.attAbvToFull(it)}">${it.toUpperCase()}</div>`)}
						</div>

						<div class="ve-flex-col mr-3">
							<div class="my-1 statgen-pb__header"></div>
							<div class="my-1 bold statgen-pb__header ve-flex-vh-center">Base</div>
							${$wrpsBase}
						</div>

						${$wrpRaceOuter}

						${$wrpBackgroundOuter}

						<div class="ve-flex-col mr-3">
							<div class="my-1 statgen-pb__header"></div>
							<div class="my-1 statgen-pb__header ve-flex-vh-center help text-muted" title="Input any additional/custom bonuses here">User</div>
							${$wrpsUser}
						</div>

						<div class="ve-flex-col mr-3">
							<div class="my-1 statgen-pb__header"></div>
							<div class="my-1 statgen-pb__header ve-flex-vh-center">Total</div>
							${metasTotalAndMod.map(it=>it.$wrpIptTotal)}
						</div>

						<div class="ve-flex-col mr-3">
							<div class="my-1 statgen-pb__header"></div>
							<div class="my-1 statgen-pb__header ve-flex-vh-center" title="Modifier">Mod.</div>
							${metasTotalAndMod.map(it=>it.$wrpIptMod)}
						</div>
					</div>

					${$stgRaceSel}
					${$stgBackgroundSel}
				</div>

				${$vrPbCustom}
				${$hrPbCustom}

				${$stgPbCustom}
			</div>

			<hr class="hr-3">

			${$dispPreviewRace}
			${$hrPreviewRaceTashas}
			${$dispTashas}

			${$dispPreviewBackground}
			${$hrPreviewBackground}

			${$wrpAsi}
		</div>`;

        hkElesMode();

        $wrpTab.append($stgMain).append($stgNone);
    }

    _render_$getStgRolledHeader() {
        this._$rollIptFormula = ComponentUiUtil.$getIptStr(this, "rolled_formula").addClass("ve-text-center max-w-100p").keydown(evt=>{
            if (evt.key === "Enter")
                setTimeout(()=>$btnRoll.click());
        }
        ).change(()=>this._$rollIptFormula.removeClass("form-control--error"));

        const $iptRollCount = this._isCharacterMode ? null : ComponentUiUtil.$getIptInt(this, "rolled_rollCount", 1, {
            min: 1,
            fallbackOnNaN: 1,
            html: `<input type="text" class="form-control input-xs form-control--minimal ve-text-center max-w-100p">`
        }).keydown(evt=>{
            if (evt.key === "Enter")
                setTimeout(()=>$btnRoll.click());
        }
        ).change(()=>this._$rollIptFormula.removeClass("form-control--error"));

        const $btnRoll = $(`<button class="btn btn-primary bold">Roll</button>`).click(()=>{
            this._state.rolled_rolls = this._roll_getRolledStats();
        });

        const $btnRandom = $(`<button class="btn btn-xs btn-default mt-2">Randomly Assign</button>`).hideVe().click(()=>{
            const abs = [...Parser.ABIL_ABVS].shuffle();
            abs.forEach((ab,i)=>{
                const {propAbilSelectedRollIx} = this.constructor._rolled_getProps(ab);
                this._state[propAbilSelectedRollIx] = i;
            });
        });

        const $wrpRolled = $(`<div class="ve-flex-v-center mr-auto statgen-rolled__wrp-results py-1"></div>`);
        const $wrpRolledOuter = $$`<div class="ve-flex-v-center"><div class="mr-2">=</div>${$wrpRolled}</div>`;

        const hkRolled = ()=>{
            $wrpRolledOuter.toggleVe(this._state.rolled_rolls.length);
            $btnRandom.toggleVe(this._state.rolled_rolls.length);
            let html = this._state.rolled_rolls.map((it,i)=>{
                const cntPrevRolls = this._state.rolled_rolls.slice(0, i).filter(r=>r.total === it.total).length;
                return $$`<div class="px-3 py-1 help-subtle ve-flex-vh-center" title="${it.text}">
                    <div class="ve-muted">[</div>
                    <div class="ve-flex-vh-center statgen-rolled__disp-result">${it.total}${cntPrevRolls ? Parser.numberToSubscript(cntPrevRolls) : ""}</div>
                    <div class="ve-muted">]</div>
                </div>`;
            });
            $wrpRolled.html(html);

        };
        this._addHookBase("rolled_rolls", hkRolled);
        hkRolled();

        return $$`<div class="ve-flex-col mb-3 mr-auto px-3">
			<div class="ve-flex mb-2">
				<div class="ve-flex-col ve-flex-h-center mr-3">
					<label class="ve-flex-v-center"><div class="mr-2 no-shrink w-100p">Formula:</div>${this._$rollIptFormula}</label>

					${this._isCharacterMode ? null : $$`<label class="ve-flex-v-center mt-2"><div class="mr-2 no-shrink w-100p">Number of rolls:</div>${$iptRollCount}</label>`}
				</div>
				${$btnRoll}
			</div>

			${$wrpRolledOuter}

			<div class="ve-flex-v-center">${$btnRandom}</div>
		</div>`;
    }

    _render_$getStgArrayHeader() {
        const $btnRandom = $(`<button class="btn btn-xs btn-default">Randomly Assign</button>`).click(()=>{
            const abs = [...Parser.ABIL_ABVS].shuffle();
            abs.forEach((ab,i)=>{
                const {propAbilSelectedScoreIx} = this.constructor._array_getProps(ab);
                this._state[propAbilSelectedScoreIx] = i;
            }
            );
        }
        );

        return $$`<div class="ve-flex-col mb-3 mr-auto px-3">
			<div class="mb-2">Assign these numbers to your abilities as desired:</div>
			<div class="bold mb-2">${StatGenUi._STANDARD_ARRAY.join(", ")}</div>
			<div class="ve-flex">${$btnRandom}</div>
		</div>`;
    }

    _render_$getStgManualHeader() {
        return $$`<div class="ve-flex-col mb-3 mr-auto px-3">
			<div>Enter your desired ability scores in the &quot;Base&quot; column below.</div>
		</div>`;
    }

    get ixActiveTab() {
        return this._getIxActiveTab();
    }
    set ixActiveTab(ix) {
        this._setIxActiveTab({
            ixActiveTab: ix
        });
    }

    addHookPointBuyCustom(hook) {
        this.constructor._PROPS_POINT_BUY_CUSTOM.forEach(prop=>this._addHookBase(prop, hook));
    }

    addHookAbilityScores(hook) {
        Parser.ABIL_ABVS.forEach(ab=>this._addHookBase(`common_export_${ab}`, hook));
    }
    addHookPulseAsi(hook) {
        this._addHookBase("common_pulseAsi", hook);
    }
    getFormDataAsi() {
        return this._compAsi.getFormData();
    }

    getMode(ix, namespace) {
        const {propMode} = this.getPropsAsi(ix, namespace);
        return this._state[propMode];
    }

    setIxFeat(ix, namespace, ixFeat) {
        const {propMode, propIxFeat} = this.getPropsAsi(ix, namespace);

        if (ixFeat == null && (this._state[propMode] === "asi" || this._state[propMode] == null)) {
            this._state[propIxFeat] = null; return;
        }

        this._state[propMode] = "feat";
        this._state[propIxFeat] = ixFeat;
    }

    setIxFeatSet(namespace, ixSet) {
        const {propIxSel} = this.getPropsAdditionalFeats_(namespace);
        this._state[propIxSel] = ixSet;
    }

    setIxFeatSetIxFeats(namespace, metaFeats) {
        const nxtState = {};
        metaFeats.forEach(({ix, ixFeat})=>{
            const {propIxFeat} = this.getPropsAdditionalFeatsFeatSet_(namespace, "fromFilter", ix);
            nxtState[propIxFeat] = ixFeat;
        }
        );
        this._proxyAssignSimple("state", nxtState);
    }

    set common_cntAsi(val) {
        this._state.common_cntAsi = val;
    }

    addHookIxRace(hook) {
        this._addHookBase("common_ixRace", hook);
    }
    get ixRace() {
        return this._state.common_ixRace;
    }
    set ixRace(ixRace) {
        this._state.common_ixRace = ixRace;
    }

    addHookIxBackground(hook) {
        this._addHookBase("common_ixBackground", hook);
    }
    get ixBackground() {
        return this._state.common_ixBackground;
    }
    set ixBackground(ixBackground) {
        this._state.common_ixBackground = ixBackground;
    }

    addCustomFeat() {
        this._state.common_cntFeatsCustom = Math.min(StatGenUi._MAX_CUSTOM_FEATS, (this._state.common_cntFeatsCustom || 0) + 1);
    }
    setCntCustomFeats(val) {
        this._state.common_cntFeatsCustom = Math.min(StatGenUi._MAX_CUSTOM_FEATS, val || 0);
    }

    get isCharacterMode() {
        return this._isCharacterMode;
    }
    get state() {
        return this._state;
    }
    get modalFilterFeats() {
        return this._modalFilterFeats;
    }
    get feats() {
        return this._feats;
    }
    addHookBase(prop, hook) {
        return this._addHookBase(prop, hook);
    }
    removeHookBase(prop, hook) {
        return this._removeHookBase(prop, hook);
    }
    proxyAssignSimple(hookProp, toObj, isOverwrite) {
        return this._proxyAssignSimple(hookProp, toObj, isOverwrite);
    }
    get race() {
        return this._races[this._state.common_ixRace];
    }
    get background() {
        return this._backgrounds[this._state.common_ixBackground];
    }
    get isLevelUp() {
        return this._isLevelUp;
    }

    getTotals() {
        if (this._isLevelUp) {
            return {
                mode: "levelUp",
                totals: {
                    levelUp: this._getTotals_levelUp(),
                },
            };
        }

        return {
            mode: this._MODES[this.ixActiveTab || 0],
            totals: {
                rolled: this._getTotals_rolled(),
                array: this._getTotals_array(),
                pointbuy: this._getTotals_pb(),
                manual: this._getTotals_manual(),
            },
        };
    }

    _getTotals_rolled() {
        return Parser.ABIL_ABVS.mergeMap(ab=>({
            [ab]: this._rolled_getTotalScore(ab)
        }));
    }
    _getTotals_array() {
        return Parser.ABIL_ABVS.mergeMap(ab=>({
            [ab]: this._array_getTotalScore(ab)
        }));
    }
    _getTotals_pb() {
        return Parser.ABIL_ABVS.mergeMap(ab=>({
            [ab]: this._pb_getTotalScore(ab)
        }));
    }
    _getTotals_manual() {
        return Parser.ABIL_ABVS.mergeMap(ab=>({
            [ab]: this._manual_getTotalScore(ab)
        }));
    }
    _getTotals_levelUp() {
        return Parser.ABIL_ABVS.mergeMap(ab=>({
            [ab]: this._levelUp_getTotalScore(ab)
        }));
    }

    addHook(hookProp, prop, hook) {
        return this._addHook(hookProp, prop, hook);
    }
    addHookAll(hookProp, hook) {
        this._addHookAll(hookProp, hook);
        this._compAsi._addHookAll(hookProp, hook);
    }

    addHookActiveTag(hook) {
        this._addHookActiveTab(hook);
    }

    async pInit() {
        await this._modalFilterRaces.pPreloadHidden();
        await this._modalFilterBackgrounds.pPreloadHidden();
        await this._modalFilterFeats.pPreloadHidden();
    }

    getPropsAsi(ix, namespace) {
        return {
            prefix: `common_asi_${namespace}_${ix}_`,
            propMode: `common_asi_${namespace}_${ix}_mode`,
            propIxAsiPointOne: `common_asi_${namespace}_${ix}_asiPointOne`,
            propIxAsiPointTwo: `common_asi_${namespace}_${ix}_asiPointTwo`,
            propIxFeat: `common_asi_${namespace}_${ix}_ixFeat`,
            propIxFeatAbility: `common_asi_${namespace}_${ix}_ixFeatAbility`,
            propFeatAbilityChooseFrom: `common_asi_${namespace}_${ix}_featAbilityChooseFrom`,
        };
    }

    getPropsAdditionalFeats_(namespace) {
        return {
            propPrefix: `common_additionalFeats_${namespace}_`,
            propIxSel: `common_additionalFeats_${namespace}_ixSel`,
        };
    }

    getPropsAdditionalFeatsFeatSet_(namespace, type, ix) {
        return {
            propIxFeat: `common_additionalFeats_${namespace}_${type}_${ix}_ixFeat`,
            propIxFeatAbility: `common_additionalFeats_${namespace}_${type}_${ix}_ixFeatAbility`,
            propFeatAbilityChooseFrom: `common_additionalFeats_${namespace}_${type}_${ix}_featAbilityChooseFrom`,
        };
    }

    _roll_getRolledStats() {
        const wrpTree = Renderer.dice.lang.getTree3(this._state.rolled_formula);
        if (!wrpTree){return this._$rollIptFormula.addClass("form-control--error");}

        const rolls = [];
        for (let i = 0; i < this._state.rolled_rollCount; i++) {
            const meta = {};
            meta.total = wrpTree.tree.evl(meta);
            rolls.push(meta);
        }
        rolls.sort((a,b)=>SortUtil.ascSort(b.total, a.total));
        return rolls.map(r=>({ total: r.total, text: (r.text || []).join("") }));
    }

    _doReset() {
        if (this._isLevelUp)
            return;
        const nxtState = this._getDefaultStateCommonResettable();

        switch (this.ixActiveTab) {
        case this._IX_TAB_NONE:
            Object.assign(nxtState, this._getDefaultStateNoneResettable());
            break;
        case this._IX_TAB_ROLLED:
            Object.assign(nxtState, this._getDefaultStateRolledResettable());
            break;
        case this._IX_TAB_ARRAY:
            Object.assign(nxtState, this._getDefaultStateArrayResettable());
            break;
        case this._IX_TAB_PB:
            Object.assign(nxtState, this._getDefaultStatePointBuyResettable());
            break;
        case this._IX_TAB_MANUAL:
            Object.assign(nxtState, this._getDefaultStateManualResettable());
            break;
        }

        this._proxyAssignSimple("state", nxtState);
    }

    doResetAll() {
        this._proxyAssignSimple("state", this._getDefaultState(), true);
    }

    _render_$getStgPbHeader() {
        const $iptBudget = ComponentUiUtil.$getIptInt(this, "pb_budget", 0, {
            html: `<input type="text" class="form-control statgen-pb__ipt-budget ve-text-center statgen-shared__ipt">`,
            min: 0,
            fallbackOnNaN: 0,
        }, );
        const hkIsCustom = ()=>{
            $iptBudget.attr("readonly", !this._state.pb_isCustom);
        }
        ;
        this._addHookBase("pb_isCustom", hkIsCustom);
        hkIsCustom();

        const $iptRemaining = ComponentUiUtil.$getIptInt(this, "pb_points", 0, {
            html: `<input type="text" class="form-control statgen-pb__ipt-budget ve-text-center statgen-shared__ipt">`,
            min: 0,
            fallbackOnNaN: 0,
        }, ).attr("readonly", true);

        const hkPoints = ()=>{
            this._state.pb_points = this._pb_getPointsRemaining(this._state);
            $iptRemaining.toggleClass(`statgen-pb__ipt-budget--error`, this._state.pb_points < 0);
        }
        ;
        this._addHookAll("state", hkPoints);
        hkPoints();

        const $btnReset = $(`<button class="btn btn-default">Reset</button>`).click(()=>this._doReset());

        const $btnRandom = $(`<button class="btn btn-default">Random</button>`).click(()=>{
            this._doReset();

            let canIncrease = Parser.ABIL_ABVS.map(it=>`pb_${it}`);
            const cpyBaseState = canIncrease.mergeMap(it=>({
                [it]: this._state[it]
            }));
            const cntRemaining = this._pb_getPointsRemaining(cpyBaseState);
            if (cntRemaining <= 0)
                return;

            for (let step = 0; step < 10000; ++step) {
                if (!canIncrease.length)
                    break;

                const prop = RollerUtil.rollOnArray(canIncrease);
                if (!this._state.pb_rules.some(rule=>rule.entity.score === cpyBaseState[prop] + 1)) {
                    canIncrease = canIncrease.filter(it=>it !== prop);
                    continue;
                }

                const draftCpyBaseState = MiscUtil.copy(cpyBaseState);
                draftCpyBaseState[prop]++;

                const cntRemaining = this._pb_getPointsRemaining(draftCpyBaseState);

                if (cntRemaining > 0) {
                    Object.assign(cpyBaseState, draftCpyBaseState);
                } else if (cntRemaining === 0) {
                    this._proxyAssignSimple("state", draftCpyBaseState);
                    break;
                } else {
                    canIncrease = canIncrease.filter(it=>it !== prop);
                }
            }
        }
        );

        return $$`<div class="ve-flex mobile__ve-flex-col mb-2">
			<div class="ve-flex-v-center">
				<div class="statgen-pb__cell mr-4 mobile__hidden"></div>

				<label class="ve-flex-col mr-2">
					<div class="mb-1 ve-text-center">Budget</div>
					${$iptBudget}
				</label>

				<label class="ve-flex-col mr-2">
					<div class="mb-1 ve-text-center">Remain</div>
					${$iptRemaining}
				</label>
			</div>

			<div class="ve-flex-v-center mobile__mt-2">
				<div class="ve-flex-col mr-2">
					<div class="mb-1 ve-text-center mobile__hidden">&nbsp;</div>
					${$btnReset}
				</div>

				<div class="ve-flex-col">
					<div class="mb-1 ve-text-center mobile__hidden">&nbsp;</div>
					${$btnRandom}
				</div>
			</div>
		</div>`;
    }

    _render_$getStgPbCustom() {
        const $btnAddLower = $(`<button class="btn btn-default btn-xs">Add Lower Score</button>`).click(()=>{
            const prevLowest = this._state.pb_rules[0];
            const score = prevLowest.entity.score - 1;
            const cost = prevLowest.entity.cost;
            this._state.pb_rules = [this._getDefaultState_pb_rule(score, cost), ...this._state.pb_rules];
        }
        );

        const $btnAddHigher = $(`<button class="btn btn-default btn-xs">Add Higher Score</button>`).click(()=>{
            const prevHighest = this._state.pb_rules.last();
            const score = prevHighest.entity.score + 1;
            const cost = prevHighest.entity.cost;
            this._state.pb_rules = [...this._state.pb_rules, this._getDefaultState_pb_rule(score, cost)];
        }
        );

        const $btnResetRules = $(`<button class="btn btn-danger btn-xs mr-2">Reset</button>`).click(()=>{
            this._state.pb_rules = this._getDefaultStatePointBuyCosts().pb_rules;
        }
        );

        const menuCustom = ContextUtil.getMenu([new ContextUtil.Action("Export as Code",async()=>{
            await MiscUtil.pCopyTextToClipboard(this._serialize_pb_rules());
            JqueryUtil.showCopiedEffect($btnContext);
        }
        ,), new ContextUtil.Action("Import from Code",async()=>{
            const raw = await InputUiUtil.pGetUserString({
                title: "Enter Code",
                isCode: true
            });
            if (raw == null)
                return;
            const parsed = this._deserialize_pb_rules(raw);
            if (parsed == null)
                return;

            const {pb_rules, pb_budget} = parsed;
            this._proxyAssignSimple("state", {
                pb_rules,
                pb_budget,
                pb_isCustom: true,
            }, );
            JqueryUtil.doToast("Imported!");
        }
        ,), ]);

        const $btnContext = $(`<button class="btn btn-default btn-xs" title="Menu"><span class="glyphicon glyphicon-option-vertical"></span></button>`).click(evt=>ContextUtil.pOpenMenu(evt, menuCustom));

        const $stgCustomCostControls = $$`<div class="ve-flex-col mb-auto ml-2 mobile__ml-0 mobile__mt-3">
			<div class="btn-group-vertical ve-flex-col mb-2">${$btnAddLower}${$btnAddHigher}</div>
			<div class="ve-flex-v-center">
				${$btnResetRules}
				${$btnContext}
			</div>
		</div>`;

        const $stgCostRows = $$`<div class="ve-flex-col"></div>`;

        const renderableCollectionRules = new StatGenUi.RenderableCollectionPbRules(this,$stgCostRows,);
        const hkRules = ()=>{
            renderableCollectionRules.render();

            const {min: minScore, max: maxScore} = this._pb_getMinMaxScores();
            Parser.ABIL_ABVS.forEach(it=>{
                const prop = `pb_${it}`;
                this._state[prop] = Math.min(maxScore, Math.max(minScore, this._state[prop]));
            }
            );
        };
        this._addHookBase("pb_rules", hkRules);
        hkRules();

        let lastIsCustom = this._state.pb_isCustom;
        const hkIsCustomReset = ()=>{
            $stgCustomCostControls.toggleVe(this._state.pb_isCustom);

            if (lastIsCustom === this._state.pb_isCustom)
                return;
            lastIsCustom = this._state.pb_isCustom;

            if (!this._state.pb_isCustom)
                this._state.pb_rules = this._getDefaultStatePointBuyCosts().pb_rules;
        }
        ;
        this._addHookBase("pb_isCustom", hkIsCustomReset);
        hkIsCustomReset();

        return $$`<div class="ve-flex-col">
			<h4>Ability Score Point Cost</h4>

			<div class="ve-flex-col">
				<div class="ve-flex mobile__ve-flex-col">
					<div class="ve-flex-col mr-3mobile__mr-0">
						<div class="ve-flex-v-center mb-1">
							<div class="statgen-pb__col-cost ve-flex-vh-center bold">Score</div>
							<div class="statgen-pb__col-cost ve-flex-vh-center bold">Modifier</div>
							<div class="statgen-pb__col-cost ve-flex-vh-center bold">Point Cost</div>
							<div class="statgen-pb__col-cost-delete"></div>
						</div>

						${$stgCostRows}
					</div>

					${$stgCustomCostControls}
				</div>
			</div>

			<hr class="hr-4 mb-2">

			<label class="ve-flex-v-center">
				<div class="mr-2">Custom Rules</div>
				${ComponentUiUtil.$getCbBool(this, "pb_isCustom")}
			</label>
		</div>`;
    }

    _serialize_pb_rules() {
        const out = [this._state.pb_budget, ...MiscUtil.copyFast(this._state.pb_rules).map(it=>[it.entity.score, it.entity.cost]), ];
        return JSON.stringify(out);
    }

    static _DESERIALIZE_MSG_INVALID = "Code was not valid!";

    _deserialize_pb_rules(raw) {
        let json;
        try {
            json = JSON.parse(raw);
        } catch (e) {
            JqueryUtil.doToast({
                type: "danger",
                content: `Failed to decode JSON! ${e.message}`
            });
            return null;
        }

        if (!(json instanceof Array))
            return void JqueryUtil.doToast({
                type: "danger",
                content: this.constructor._DESERIALIZE_MSG_INVALID
            });

        const [budget,...rules] = json;

        if (isNaN(budget))
            return void JqueryUtil.doToast({
                type: "danger",
                content: this.constructor._DESERIALIZE_MSG_INVALID
            });

        if (!rules.every(it=>it instanceof Array && it[0] != null && !isNaN(it[0]) && it[1] != null && !isNaN(it[1])))
            return void JqueryUtil.doToast({
                type: "danger",
                content: this.constructor._DESERIALIZE_MSG_INVALID
            });

        return {
            pb_budget: budget,
            pb_rules: rules.map(it=>this._getDefaultState_pb_rule(it[0], it[1])),
        };
    }

    

    static _RenderLevelOneEntity = class {
        _title;
        _titleShort;
        _propIxEntity;
        _propIxAbilityScoreSet;
        _propData;
        _propModalFilter;
        _propIsPreview;
        _propEntity;
        _page;
        _propChoiceMetasFrom;
        _propChoiceWeighted;

        constructor({parent}) {
            this._parent = parent;

            this._pbHookMetas = [];
        }

        render() {
            const $wrp = $(`<div class="ve-flex"></div>`);
            const $wrpOuter = $$`<div class="ve-flex-col">
				<div class="my-1 statgen-pb__header statgen-pb__header--group mr-3 ve-text-center italic ve-small help-subtle" title="Ability Score Changes from ${this._title}">${this._titleShort}</div>

				${$wrp}
			</div>`;

            this._parent._addHookBase(this._propIxEntity, ()=>this._parent.__state[this._propIxAbilityScoreSet] = 0);

            const hkIxEntity = (prop)=>{
                this._pb_unhookRender();
                const isInitialLoad = prop == null;
                if (!isInitialLoad)
                    this._parent._state[this._propChoiceMetasFrom] = [];
                if (!isInitialLoad)
                    this._parent._state[this._propChoiceWeighted] = [];
                const isAnyFromEntity = this._render_pointBuy($wrp);
                $wrpOuter.toggleVe(isAnyFromEntity);
            };

            this._parent._addHookBase(this._propIxEntity, hkIxEntity);
            this._bindAdditionalHooks_hkIxEntity(hkIxEntity);
            this._parent._addHookBase(this._propIxAbilityScoreSet, hkIxEntity);
            hkIxEntity();

            //Try to get races here
            const {$wrp: $selEntity, fnUpdateHidden: fnUpdateSelEntityHidden} = ComponentUiUtil.$getSelSearchable(this._parent, this._propIxEntity, {
                values: this._parent[this._propData].map((_,i)=>i),
                isAllowNull: true,
                fnDisplay: ix=>{
                    const r = this._parent[this._propData][ix];
                    if (!r){return "(Unknown)";}
                    return `${r.name} ${r.source !== Parser.SRC_PHB ? `[${Parser.sourceJsonToAbv(r.source)}]` : ""}`;
                }
                ,
                asMeta: true,
            }, );

            const doApplyFilterToSelEntity = ()=>{
                const f = this._parent[this._propModalFilter].pageFilter.filterBox.getValues();
                const isHiddenPerEntity = this._parent[this._propData].map(it=>!this._parent[this._propModalFilter].pageFilter.toDisplay(f, it));
                fnUpdateSelEntityHidden(isHiddenPerEntity, false);
            };

            //TEMPFIX
            if(SETTINGS.FILTERS){this._parent[this._propModalFilter].pageFilter.filterBox.on(FilterBox.EVNT_VALCHANGE, ()=>doApplyFilterToSelEntity());
            doApplyFilterToSelEntity();}

            const $btnFilterForEntity = $(`<button class="btn btn-xs btn-default br-0 pr-2" title="Filter for ${this._title}"><span class="glyphicon glyphicon-filter"></span> Filter</button>`).click(async()=>{
                const selected = await this._parent[this._propModalFilter].pGetUserSelection();
                if (selected == null || !selected.length)
                    return;

                const selectedEntity = selected[0];
                const ixEntity = this._parent[this._propData].findIndex(it=>it.name === selectedEntity.name && it.source === selectedEntity.values.sourceJson);
                if (!~ixEntity)
                    throw new Error(`Could not find selected ${this._title.toLowerCase()}: ${JSON.stringify(selectedEntity)}`);
                this._parent._state[this._propIxEntity] = ixEntity;
            }
            );

            const $btnPreview = ComponentUiUtil.$getBtnBool(this._parent, this._propIsPreview, {
                html: `<button class="btn btn-xs btn-default" title="Toggle ${this._title} Preview"><span class="glyphicon glyphicon-eye-open"></span></button>`,
            }, );
            const hkBtnPreviewEntity = ()=>$btnPreview.toggleVe(this._parent._state[this._propIxEntity] != null && ~this._parent._state[this._propIxEntity]);
            this._parent._addHookBase(this._propIxEntity, hkBtnPreviewEntity);
            hkBtnPreviewEntity();

            const {$sel: $selAbilitySet, setValues: setValuesSelAbilitySet} = ComponentUiUtil.$getSelEnum(this._parent, this._propIxAbilityScoreSet, {
                values: [],
                asMeta: true,
                fnDisplay: ixAbSet=>{
                    const lst = this._pb_getAbilityList();
                    if (!lst?.[ixAbSet])
                        return "(Unknown)";
                    return Renderer.getAbilityData([lst[ixAbSet]]).asText;
                }
                ,
            }, );

            const $stgAbilityScoreSet = $$`<div class="ve-flex-v-center mb-2">
				<div class="mr-2">Ability Score Increase</div>
				<div>${$selAbilitySet}</div>
			</div>`;

            const hkSetValuesSelAbilitySet = ()=>{
                const entity = this._parent[this._propEntity];
                $stgAbilityScoreSet.toggleVe(!!entity && entity.ability?.length > 1);
                setValuesSelAbilitySet([...new Array(entity?.ability?.length || 0)].map((_,ix)=>ix), {
                    isForce: true
                }, );
            };

            this._parent._addHookBase(this._propIxEntity, hkSetValuesSelAbilitySet);
            this._bindAdditionalHooks_hkSetValuesSelAbilitySet(hkSetValuesSelAbilitySet);
            hkSetValuesSelAbilitySet();

            const $dispPreview = $(`<div class="ve-flex-col mb-2"></div>`);
            const hkPreviewEntity = ()=>{
                if (!this._parent._state[this._propIsPreview])
                    return $dispPreview.hideVe();

                const entity = this._parent._state[this._propIxEntity] != null ? this._parent[this._propData][this._parent._state[this._propIxEntity]] : null;
                if (!entity)
                    return $dispPreview.hideVe();

                $dispPreview.empty().showVe().append(Renderer.hover.$getHoverContent_stats(this._page, entity));
            };
            this._parent._addHookBase(this._propIxEntity, hkPreviewEntity);
            this._parent._addHookBase(this._propIsPreview, hkPreviewEntity);
            hkPreviewEntity();

            const {$hrPreview} = this._getHrPreviewMeta();

            const $stgSel = $$`<div class="ve-flex-col mt-3">
				<div class="mb-1">Select a ${this._title}</div>
				<div class="ve-flex-v-center mb-2">
					<div class="ve-flex-v-center btn-group w-100 mr-2">${$btnFilterForEntity}${$selEntity}</div>
					<div>${$btnPreview}</div>
				</div>
				${$stgAbilityScoreSet}
			</div>`;

            return {
                $wrpOuter,

                $stgSel,

                $dispPreview,
                $hrPreview,
            };
        }

        _pb_unhookRender() {
            this._pbHookMetas.forEach(it=>it.unhook());
            this._pbHookMetas = [];
        }

        _render_pointBuy($wrp) {
            $wrp.empty();

            const fromEntity = this._pb_getAbility();
            if (fromEntity == null)
                return false;

            let $ptBase = null;
            if (Parser.ABIL_ABVS.some(it=>fromEntity[it])) {
                const $wrpsEntity = Parser.ABIL_ABVS.map(ab=>{
                    return $$`<div class="my-1 statgen-pb__cell">
						<input class="form-control form-control--minimal statgen-shared__ipt text-right" type="number" readonly value="${fromEntity[ab] || 0}">
					</div>`;
                }
                );

                $ptBase = $$`<div class="ve-flex-col mr-3">
					<div class="my-1 statgen-pb__header ve-flex-vh-center">Static</div>
					${$wrpsEntity}
				</div>`;
            }

            let $ptChooseFrom = null;
            if (fromEntity.choose && fromEntity.choose.from) {
                const amount = fromEntity.choose.amount || 1;
                const count = fromEntity.choose.count || 1;

                const $wrpsChoose = Parser.ABIL_ABVS.map(ab=>{
                    if (!fromEntity.choose.from.includes(ab))
                        return `<div class="my-1 statgen-pb__cell"></div>`;

                    const $cb = $(`<input type="checkbox">`).change(()=>{
                        const existing = this._parent._state[this._propChoiceMetasFrom].find(it=>it.ability === ab);
                        if (existing) {
                            this._parent._state[this._propChoiceMetasFrom] = this._parent._state[this._propChoiceMetasFrom].filter(it=>it !== existing);
                            return;
                        }

                        if (this._parent._state[this._propChoiceMetasFrom].length >= count) {
                            while (this._parent._state[this._propChoiceMetasFrom].length >= count)
                                this._parent._state[this._propChoiceMetasFrom].shift();
                            this._parent._state[this._propChoiceMetasFrom] = [...this._parent._state[this._propChoiceMetasFrom]];
                        }

                        this._parent._state[this._propChoiceMetasFrom] = [...this._parent._state[this._propChoiceMetasFrom], {
                            ability: ab,
                            amount
                        }, ];
                    }
                    );

                    const hk = ()=>$cb.prop("checked", this._parent._state[this._propChoiceMetasFrom].some(it=>it.ability === ab));
                    this._parent._addHookBase(this._propChoiceMetasFrom, hk);
                    this._pbHookMetas.push({
                        unhook: ()=>this._parent._removeHookBase(this._propChoiceMetasFrom, hk)
                    });
                    hk();

                    return $$`<label class="my-1 statgen-pb__cell ve-flex-vh-center">${$cb}</label>`;
                }
                );

                $ptChooseFrom = $$`<div class="ve-flex-col mr-3">
					<div class="my-1 statgen-pb__header statgen-pb__header--choose-from ve-flex-vh-center">
						<div class="${count !== 1 ? `mr-1` : ""}">${UiUtil.intToBonus(amount, {
                    isPretty: true
                })}</div>${count !== 1 ? `<div class="ve-small ve-muted">(x${count})</div>` : ""}
					</div>
					${$wrpsChoose}
				</div>`;
            }

            let $ptsChooseWeighted = null;
            if (fromEntity.choose && fromEntity.choose.weighted && fromEntity.choose.weighted.weights) {
                $ptsChooseWeighted = fromEntity.choose.weighted.weights.map((weight,ixWeight)=>{
                    const $wrpsChoose = Parser.ABIL_ABVS.map(ab=>{
                        if (!fromEntity.choose.weighted.from.includes(ab))
                            return `<div class="my-1 statgen-pb__cell"></div>`;

                        const $cb = $(`<input type="checkbox">`).change(()=>{
                            const existing = this._parent._state[this._propChoiceWeighted].find(it=>it.ability === ab && it.ix === ixWeight);
                            if (existing) {
                                this._parent._state[this._propChoiceWeighted] = this._parent._state[this._propChoiceWeighted].filter(it=>it !== existing);
                                return;
                            }

                            const withSameAbil = this._parent._state[this._propChoiceWeighted].filter(it=>it.ability === ab || it.ix === ixWeight);
                            if (withSameAbil.length) {
                                this._parent._state[this._propChoiceWeighted] = this._parent._state[this._propChoiceWeighted].filter(it=>it.ability !== ab && it.ix !== ixWeight);
                            }

                            this._parent._state[this._propChoiceWeighted] = [...this._parent._state[this._propChoiceWeighted], {
                                ability: ab,
                                amount: weight,
                                ix: ixWeight
                            }, ];
                        }
                        );

                        const hk = ()=>{
                            $cb.prop("checked", this._parent._state[this._propChoiceWeighted].some(it=>it.ability === ab && it.ix === ixWeight));
                        }
                        ;
                        this._parent._addHookBase(this._propChoiceWeighted, hk);
                        this._pbHookMetas.push({
                            unhook: ()=>this._parent._removeHookBase(this._propChoiceWeighted, hk)
                        });
                        hk();

                        return $$`<label class="my-1 statgen-pb__cell ve-flex-vh-center">${$cb}</label>`;
                    }
                    );

                    return $$`<div class="ve-flex-col mr-3">
						<div class="my-1 statgen-pb__header statgen-pb__header--choose-from ve-flex-vh-center">${UiUtil.intToBonus(weight, {
                        isPretty: true
                    })}</div>
						${$wrpsChoose}
					</div>`;
                }
                );
            }

            $$($wrp)`
				${$ptBase}
				${$ptChooseFrom}
				${$ptsChooseWeighted}
			`;

            return $ptBase || $ptChooseFrom || $ptsChooseWeighted;
        }

        _pb_getAbilityList() {
            throw new Error("Unimplemented!");
        }

        _pb_getAbility() {
            throw new Error("Unimplemented!");
        }

        _bindAdditionalHooks_hkIxEntity(hkIxEntity) {}
        _bindAdditionalHooks_hkSetValuesSelAbilitySet(hkSetValuesSelAbilitySet) {}

        _getHrPreviewMeta() {
            const $hrPreview = $(`<hr class="hr-3">`);
            const hkPreview = this._getHkPreview({
                $hrPreview
            });
            this._parent._addHookBase(this._propIsPreview, hkPreview);
            hkPreview();

            return {
                $hrPreview,
                hkPreview,
            };
        }

        _getHkPreview({$hrPreview}) {
            return ()=>$hrPreview.toggleVe(this._parent._state[this._propIsPreview]);
        }
    };

    static _RenderLevelOneRace = class extends this._RenderLevelOneEntity {
        _title = "Race";
        _titleShort = "Race";
        _propIxEntity = "common_ixRace";
        _propIxAbilityScoreSet = "common_ixAbilityScoreSetRace";
        _propData = "_races";
        _propModalFilter = "_modalFilterRaces";
        _propIsPreview = "common_isPreviewRace";
        _propEntity = "race";
        _page = UrlUtil.PG_RACES;
        _propChoiceMetasFrom = "common_raceChoiceMetasFrom";
        _propChoiceWeighted = "common_raceChoiceMetasWeighted";

        render() {
            const out = super.render();

            const {$btnToggleTashasPin, $dispTashas} = this._$getPtsTashas();

            out.$stgSel.append($$`<label class="ve-flex-v-center mb-1">
				<div class="mr-2">Allow Origin Customization</div>
				${ComponentUiUtil.$getCbBool(this._parent, "common_isTashas")}
			</label>`);

            out.$stgSel.append($$`<div class="ve-flex">
				<div class="ve-small ve-muted italic mr-1">${Renderer.get().render(`An {@variantrule Customizing Your Origin|TCE|optional rule}`)}</div>
				${$btnToggleTashasPin}
				<div class="ve-small ve-muted italic ml-1">${Renderer.get().render(`from Tasha's Cauldron of Everything, page 8.`)}</div>
			</div>`);

            out.$dispTashas = $dispTashas;

            return out;
        }

        _pb_getAbilityList() { return this._parent._pb_getRaceAbilityList(); }

        _pb_getAbility() {
            return this._parent._pb_getRaceAbility();
        }

        _bindAdditionalHooks_hkIxEntity(hkIxEntity) {
            this._parent._addHookBase("common_isTashas", hkIxEntity);
        }

        _bindAdditionalHooks_hkSetValuesSelAbilitySet(hkSetValuesSelAbilitySet) {
            this._parent._addHookBase("common_isTashas", hkSetValuesSelAbilitySet);
        }

        _getHrPreviewMeta() {
            const out = super._getHrPreviewMeta();
            const {hkPreview} = out;
            this._parent._addHookBase("common_isShowTashasRules", hkPreview);
            return out;
        }

        _getHkPreview({$hrPreview}) {
            return ()=>$hrPreview.toggleVe(this._parent._state[this._propIsPreview] && this._parent._state.common_isShowTashasRules);
        }

        _$getPtsTashas() {
            const $btnToggleTashasPin = ComponentUiUtil.$getBtnBool(this._parent, "common_isShowTashasRules", {
                html: `<button class="btn btn-xxs btn-default ve-small p-0 statgen-shared__btn-toggle-tashas-rules ve-flex-vh-center" title="Toggle &quot;Customizing Your Origin&quot; Section">
                <span class="glyphicon glyphicon-eye-open"></span></button>`,
            }, );

            const $dispTashas = $(`<div class="ve-flex-col"><div class="italic ve-muted">Loading...</div></div>`);


            DataLoader.pCacheAndGet(UrlUtil.PG_VARIANTRULES, Parser.SRC_TCE, UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_VARIANTRULES]({
                name: "Customizing Your Origin",
                source: Parser.SRC_TCE
            })).then(rule=>{
                $$($dispTashas.empty())`${Renderer.hover.$getHoverContent_stats(UrlUtil.PG_VARIANTRULES, rule)}<hr class="hr-3">`;
            });

            const hkIsShowTashas = ()=>{ $dispTashas.toggleVe(this._parent._state.common_isShowTashasRules); };
            this._parent._addHookBase("common_isShowTashasRules", hkIsShowTashas);
            hkIsShowTashas();

            return { $btnToggleTashasPin, $dispTashas, };
        }
    };

    _renderLevelOneRace = new this.constructor._RenderLevelOneRace({ parent: this });

    static _RenderLevelOneBackground = class extends this._RenderLevelOneEntity {
        _title = "Background";
        _titleShort = "Backg.";
        _propIxEntity = "common_ixBackground";
        _propIxAbilityScoreSet = "common_ixAbilityScoreSetBackground";
        _propData = "_backgrounds";
        _propModalFilter = "_modalFilterBackgrounds";
        _propIsPreview = "common_isPreviewBackground";
        _propEntity = "background";
        _page = UrlUtil.PG_BACKGROUNDS;
        _propChoiceMetasFrom = "common_backgroundChoiceMetasFrom";
        _propChoiceWeighted = "common_backgroundChoiceMetasWeighted";

        _pb_getAbilityList() {
            return this._parent._pb_getBackgroundAbilityList();
        }

        _pb_getAbility() {
            return this._parent._pb_getBackgroundAbility();
        }
    };

    _renderLevelOneBackground = new this.constructor._RenderLevelOneBackground({
        parent: this
    });

    _render_isLevelUp($wrpTab) {
        const $wrpsExisting = Parser.ABIL_ABVS.map(ab=>{
            const $iptExisting = $(`<input class="form-control form-control--minimal statgen-shared__ipt text-right" type="number" readonly>`).val(this._existingScores[ab]);

            return $$`<label class="my-1 statgen-pb__cell">
				${$iptExisting}
			</label>`;
        }
        );

        const $wrpsUser = this._render_$getWrpsUser();

        const metasTotalAndMod = this._render_getMetasTotalAndMod();

        const $wrpAsi = this._render_$getWrpAsi();

        $$($wrpTab)`
			<div class="ve-flex mobile-ish__ve-flex-col w-100 px-3">
				<div class="ve-flex-col">
					<div class="ve-flex">
						<div class="ve-flex-col mr-3">
							<div class="my-1 statgen-pb__header"></div>

							${Parser.ABIL_ABVS.map(it=>`<div class="my-1 bold statgen-pb__cell ve-flex-v-center ve-flex-h-right" title="${Parser.attAbvToFull(it)}">${it.toUpperCase()}</div>`)}
						</div>

						<div class="ve-flex-col mr-3">
							<div class="my-1 bold statgen-pb__header ve-flex-vh-center" title="Current">Curr.</div>
							${$wrpsExisting}
						</div>

						<div class="ve-flex-col mr-3">
							<div class="my-1 statgen-pb__header ve-flex-vh-center help text-muted" title="Input any additional/custom bonuses here">User</div>
							${$wrpsUser}
						</div>

						<div class="ve-flex-col mr-3">
							<div class="my-1 statgen-pb__header ve-flex-vh-center">Total</div>
							${metasTotalAndMod.map(it=>it.$wrpIptTotal)}
						</div>

						<div class="ve-flex-col mr-3">
							<div class="my-1 statgen-pb__header ve-flex-vh-center" title="Modifier">Mod.</div>
							${metasTotalAndMod.map(it=>it.$wrpIptMod)}
						</div>
					</div>
				</div>
			</div>

			<hr class="hr-3">

			${$wrpAsi}
		`;
    }

    _render_$getWrpsUser() {
        return Parser.ABIL_ABVS.map(ab=>{
            const {propUserBonus} = this.constructor._common_getProps(ab);
            const $ipt = ComponentUiUtil.$getIptInt(this, propUserBonus, 0, {
                fallbackOnNaN: 0,
                html: `<input class="form-control form-control--minimal statgen-shared__ipt text-right" type="number">`,
            }, );
            return $$`<label class="my-1 statgen-pb__cell">${$ipt}</label>`;
        }
        );
    }

    _render_getMetasTotalAndMod() {
        return Parser.ABIL_ABVS.map(ab=>{
            const $iptTotal = $(`<input class="form-control form-control--minimal statgen-shared__ipt ve-text-center" type="text" readonly>`);
            const $iptMod = $(`<input class="form-control form-control--minimal statgen-shared__ipt ve-text-center" type="text" readonly>`);

            const $wrpIptTotal = $$`<label class="my-1 statgen-pb__cell">${$iptTotal}</label>`;
            const $wrpIptMod = $$`<label class="my-1 statgen-pb__cell">${$iptMod}</label>`;

            const exportedStateProp = `common_export_${ab}`;

            const getTotalScore = ()=>{
                if (this._isLevelUp)
                    return this._levelUp_getTotalScore(ab);
                switch (this.ixActiveTab) {
                case this._IX_TAB_ROLLED:
                    return this._rolled_getTotalScore(ab);
                case this._IX_TAB_ARRAY:
                    return this._array_getTotalScore(ab);
                case this._IX_TAB_PB:
                    return this._pb_getTotalScore(ab);
                case this._IX_TAB_MANUAL:
                    return this._manual_getTotalScore(ab);
                default:
                    return 0;
                }
            }
            ;

            const hk = ()=>{
                const totalScore = getTotalScore();

                const isOverLimit = totalScore > 20;
                $iptTotal.val(totalScore).toggleClass("form-control--error", isOverLimit).title(isOverLimit ? `In general, you can't increase an ability score above 20.` : "");
                $iptMod.val(Parser.getAbilityModifier(totalScore));

                this._state[exportedStateProp] = totalScore;
            };

            this._addHookAll("state", hk);
            this._addHookActiveTab(hk);
            hk();

            return { $wrpIptTotal, $wrpIptMod, };
        });
    }

    _render_$getWrpAsi() {
        const $wrpAsi = $(`<div class="ve-flex-col w-100"></div>`);
        this._compAsi.render($wrpAsi);
        return $wrpAsi;
    }

    static _common_getProps(ab) {
        return {
            propUserBonus: `${StatGenUi._PROP_PREFIX_COMMON}${ab}_user`,
        };
    }

    static _rolled_getProps(ab) {
        return {
            propAbilSelectedRollIx: `${StatGenUi._PROP_PREFIX_ROLLED}${ab}_abilSelectedRollIx`,
        };
    }

    static _array_getProps(ab) {
        return {
            propAbilSelectedScoreIx: `${StatGenUi._PROP_PREFIX_ARRAY}${ab}_abilSelectedScoreIx`,
        };
    }

    static _manual_getProps(ab) {
        return {
            propAbilValue: `${StatGenUi._PROP_PREFIX_MANUAL}${ab}_abilValue`,
        };
    }

    _pb_getRaceAbilityList() {
        const race = this.race;
        if (!race?.ability?.length){return null;}

        return race.ability.map(fromRace=>{
            if (this._state.common_isTashas) {
                const weights = [];

                if (fromRace.choose && fromRace.choose.weighted && fromRace.choose.weighted.weights) {
                    weights.push(...fromRace.choose.weighted.weights);
                }

                Parser.ABIL_ABVS.forEach(it=>{
                    if (fromRace[it])
                        weights.push(fromRace[it]);
                }
                );

                if (fromRace.choose && fromRace.choose.from) {
                    const count = fromRace.choose.count || 1;
                    const amount = fromRace.choose.amount || 1;
                    for (let i = 0; i < count; ++i)
                        weights.push(amount);
                }

                weights.sort((a,b)=>SortUtil.ascSort(b, a));

                fromRace = {
                    choose: {
                        weighted: {
                            from: [...Parser.ABIL_ABVS],
                            weights,
                        },
                    },
                };
            }

            return fromRace;
        });
    }

    _pb_getBackgroundAbilityList() {
        const background = this.background;
        if (!background?.ability?.length)
            return null;
        return background.ability;
    }

    _pb_getRaceAbility() {
        return this._pb_getRaceAbilityList()?.[this._state.common_ixAbilityScoreSetRace || 0];
    }

    _pb_getBackgroundAbility() {
        return this._pb_getBackgroundAbilityList()?.[this._state.common_ixAbilityScoreSetBackground || 0];
    }

    _pb_getPointsRemaining(baseState) {
        const spent = Parser.ABIL_ABVS.map(it=>{
            const prop = `pb_${it}`;
            const score = baseState[prop];
            const rule = this._state.pb_rules.find(it=>it.entity.score === score);
            if (!rule)
                return 0;
            return rule.entity.cost;
        }
        ).reduce((a,b)=>a + b, 0);

        return this._state.pb_budget - spent;
    }

    _rolled_getTotalScore(ab) {
        const {propAbilSelectedRollIx} = this.constructor._rolled_getProps(ab);
        const {propUserBonus} = this.constructor._common_getProps(ab);
        return (this._state.rolled_rolls[this._state[propAbilSelectedRollIx]] || {
            total: 0
        }).total + this._state[propUserBonus] + this._getTotalScore_getBonuses(ab);
    }

    _array_getTotalScore(ab) {
        const {propAbilSelectedScoreIx} = this.constructor._array_getProps(ab);
        const {propUserBonus} = this.constructor._common_getProps(ab);
        return (StatGenUi._STANDARD_ARRAY[this._state[propAbilSelectedScoreIx]] || 0) + this._state[propUserBonus] + this._getTotalScore_getBonuses(ab);
    }

    _pb_getTotalScore(ab) {
        const prop = `pb_${ab}`;
        const {propUserBonus} = this.constructor._common_getProps(ab);
        return this._state[prop] + this._state[propUserBonus] + this._getTotalScore_getBonuses(ab);
    }

    _manual_getTotalScore(ab) {
        const {propAbilValue} = this.constructor._manual_getProps(ab);
        const {propUserBonus} = this.constructor._common_getProps(ab);
        return (this._state[propAbilValue] || 0) + this._state[propUserBonus] + this._getTotalScore_getBonuses(ab);
    }

    _levelUp_getTotalScore(ab) {
        const {propUserBonus} = this.constructor._common_getProps(ab);
        return (this._existingScores[ab] || 0) + this._state[propUserBonus] + this._getTotalScore_getBonuses(ab);
    }

    _getTotalScore_getBonuses(ab) {
        let total = 0;

        if (!this._isLevelUp) {
            const handleEntityAbility = ({fromEntity, propChoiceMetasFrom, propChoiceWeighted})=>{
                if (fromEntity) {
                    if (fromEntity[ab])
                        total += fromEntity[ab];

                    if (fromEntity.choose && fromEntity.choose.from) {
                        total += this._state[propChoiceMetasFrom].filter(it=>it.ability === ab).map(it=>it.amount).reduce((a,b)=>a + b, 0);
                    }

                    if (fromEntity.choose && fromEntity.choose.weighted && fromEntity.choose.weighted.weights) {
                        total += this._state[propChoiceWeighted].filter(it=>it.ability === ab).map(it=>it.amount).reduce((a,b)=>a + b, 0);
                    }
                }
            }
            ;

            handleEntityAbility({
                fromEntity: this._pb_getRaceAbility(),
                propChoiceMetasFrom: "common_raceChoiceMetasFrom",
                propChoiceWeighted: "common_raceChoiceMetasWeighted",
            });

            handleEntityAbility({
                fromEntity: this._pb_getBackgroundAbility(),
                propChoiceMetasFrom: "common_backgroundChoiceMetasFrom",
                propChoiceWeighted: "common_backgroundChoiceMetasWeighted",
            });
        }

        const formDataAsi = this._compAsi.getFormData();
        if (formDataAsi)
            total += formDataAsi.data[ab] || 0;

        return total;
    }

    getSaveableState() {
        const out = super.getSaveableState();

        const handleEntity = ({propIxEntity, page, propData, propHash})=>{
            if (out[propIxEntity] != null && !~this._state[propIxEntity]) {
                out[propHash] = UrlUtil.URL_TO_HASH_BUILDER[page](this[propData][out[propIxEntity]]);
                delete out[propIxEntity];
            }
        }
        ;

        handleEntity({
            propIxEntity: "common_ixRace",
            page: UrlUtil.PG_RACES,
            propData: "_races",
            propHash: "_pb_raceHash",
        });

        handleEntity({
            propIxEntity: "common_ixBackground",
            page: UrlUtil.PG_BACKGROUNDS,
            propData: "_backgrounds",
            propHash: "_pb_backgroundHash",
        });

        return out;
    }

    getSaveableStatePointBuyCustom() {
        const base = this.getSaveableState();
        return {
            state: this.constructor._PROPS_POINT_BUY_CUSTOM.mergeMap(k=>({
                [k]: base.state[k]
            })),
        };
    }

    setStateFrom(saved, isOverwrite=false) {
        saved = MiscUtil.copy(saved);

        MiscUtil.getOrSet(saved, "state", {});

        const handleEntityHash = ({propHash, page, propData, propIxEntity})=>{
            if (!saved[propHash])
                return;

            const ixEntity = this[propData].findIndex(it=>{
                const hash = UrlUtil.URL_TO_HASH_BUILDER[page](it);
                return hash === saved[propHash];
            }
            );
            if (~ixEntity)
                saved[propIxEntity] = ixEntity;
        }
        ;

        handleEntityHash({
            propHash: "_pb_raceHash",
            page: UrlUtil.PG_RACES,
            propData: "_races",
            propIxEntity: "common_ixRace",
        });

        handleEntityHash({
            propHash: "_pb_backgroundHash",
            page: UrlUtil.PG_BACKGROUNDS,
            propData: "_backgrounds",
            propIxEntity: "common_ixBackground",
        });

        const validKeys = new Set(Object.keys(this._getDefaultState()));
        const validKeyPrefixes = [StatGenUi._PROP_PREFIX_COMMON, StatGenUi._PROP_PREFIX_ROLLED, StatGenUi._PROP_PREFIX_ARRAY, StatGenUi._PROP_PREFIX_MANUAL, ];

        Object.keys(saved.state).filter(k=>!validKeys.has(k) && !validKeyPrefixes.some(it=>k.startsWith(it))).forEach(k=>delete saved.state[k]);

        for (let i = saved.state.common_cntAsi || 0; i < 1000; ++i) {
            const {propMode, prefix} = this.getPropsAsi(i, "ability");
            if (saved.state[propMode])
                Object.keys(saved.state).filter(k=>k.startsWith(prefix)).forEach(k=>delete saved.state[k]);
        }

        for (let i = saved.state.common_cntFeatsCustom || 0; i < 1000; ++i) {
            const {propMode, prefix} = this.getPropsAsi(i, "custom");
            if (saved.state[propMode])
                Object.keys(saved.state).filter(k=>k.startsWith(prefix)).forEach(k=>delete saved.state[k]);
        }

        super.setStateFrom(saved, isOverwrite);
    }

    _pb_getMinMaxScores() {
        return {
            min: Math.min(...this._state.pb_rules.map(it=>it.entity.score)),
            max: Math.max(...this._state.pb_rules.map(it=>it.entity.score)),
        };
    }

    _getDefaultStateCommonResettable() {
        return {
            ...Parser.ABIL_ABVS.mergeMap(ab=>({
                [this.constructor._common_getProps(ab).propUserBonus]: 0
            })),

            common_raceChoiceMetasFrom: [],
            common_raceChoiceMetasWeighted: [],

            common_backgroundChoiceMetasFrom: [],
            common_backgroundChoiceMetasWeighted: [],
        };
    }

    _getDefaultStateNoneResettable() {
        return {};
    }

    _getDefaultStateRolledResettable() {
        return {
            ...Parser.ABIL_ABVS.mergeMap(ab=>({
                [this.constructor._rolled_getProps(ab).propAbilSelectedRollIx]: null
            })),
        };
    }

    _getDefaultStateArrayResettable() {
        return {
            ...Parser.ABIL_ABVS.mergeMap(ab=>({
                [this.constructor._array_getProps(ab).propAbilSelectedScoreIx]: null
            })),
        };
    }

    _getDefaultStatePointBuyResettable() {
        return {
            pb_str: 8,
            pb_dex: 8,
            pb_con: 8,
            pb_int: 8,
            pb_wis: 8,
            pb_cha: 8,
        };
    }

    _getDefaultStatePointBuyCosts() {
        return {
            pb_rules: [{
                score: 8,
                cost: 0
            }, {
                score: 9,
                cost: 1
            }, {
                score: 10,
                cost: 2
            }, {
                score: 11,
                cost: 3
            }, {
                score: 12,
                cost: 4
            }, {
                score: 13,
                cost: 5
            }, {
                score: 14,
                cost: 7
            }, {
                score: 15,
                cost: 9
            }, ].map(({score, cost})=>this._getDefaultState_pb_rule(score, cost)),
        };
    }

    _getDefaultState_pb_rule(score, cost) {
        return {
            id: CryptUtil.uid(),
            entity: {
                score,
                cost,
            },
        };
    }

    _getDefaultStateManualResettable() {
        return {
            ...Parser.ABIL_ABVS.mergeMap(ab=>({
                [this.constructor._manual_getProps(ab).propAbilValue]: null
            })),
        };
    }

    _getDefaultState() {
        return {
            common_isPreviewRace: false,
            common_isTashas: false,
            common_isShowTashasRules: false,
            common_ixRace: null,
            common_ixAbilityScoreSet: 0,

            common_isPreviewBackground: false,
            common_ixBackground: null,
            common_ixAbilityScoreSetBackground: 0,

            common_pulseAsi: false,
            common_cntAsi: 0,
            common_cntFeatsCustom: 0,

            common_export_str: null,
            common_export_dex: null,
            common_export_con: null,
            common_export_int: null,
            common_export_wis: null,
            common_export_cha: null,

            ...this._getDefaultStateCommonResettable(),

            rolled_formula: "4d6dl1",
            rolled_rollCount: 6,
            rolled_rolls: [],
            ...this._getDefaultStateRolledResettable(),

            ...this._getDefaultStateArrayResettable(),

            ...this._getDefaultStatePointBuyResettable(),
            ...this._getDefaultStatePointBuyCosts(),

            pb_points: 27,
            pb_budget: 27,

            pb_isCustom: false,

            ...this._getDefaultStateManualResettable(),
        };
    }
};

StatGenUi._STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
StatGenUi._PROP_PREFIX_COMMON = "common_";
StatGenUi._PROP_PREFIX_ROLLED = "rolled_";
StatGenUi._PROP_PREFIX_ARRAY = "array_";
StatGenUi._PROP_PREFIX_MANUAL = "manual_";
StatGenUi.MODE_NONE = "none";
StatGenUi.MODES = ["rolled", "array", "pointbuy", "manual", ];
StatGenUi.MODES_FVTT = [StatGenUi.MODE_NONE, ...StatGenUi.MODES, ];
StatGenUi._MAX_CUSTOM_FEATS = 20;

StatGenUi.CompAsi = class extends BaseComponent {
    constructor({parent}) {
        super();
        this._parent = parent;

        this._metasAsi = { ability: [], race: [], background: [], custom: [] };

        this._doPulseThrottled = MiscUtil.throttle(this._doPulse_.bind(this), 50);
    }

    _doPulse_() {
        this._parent.state.common_pulseAsi = !this._parent.state.common_pulseAsi;
    }

    _render_renderAsiFeatSection(propCnt, namespace, $wrpRows) {
        const hk = ()=>{
            let ix = 0;

            for (; ix < this._parent.state[propCnt]; ++ix) {
                const ix_ = ix;
                const {propMode, propIxFeat, propIxAsiPointOne, propIxAsiPointTwo, propIxFeatAbility, propFeatAbilityChooseFrom} = this._parent.getPropsAsi(ix_, namespace);

                if (!this._metasAsi[namespace][ix_]) {
                    this._parent.state[propMode] = this._parent.state[propMode] || (namespace === "ability" ? "asi" : "feat");

                    const $btnAsi = namespace !== "ability" ? null : $(`<button class="btn btn-xs btn-default w-50p">ASI</button>`).click(()=>{
                        this._parent.state[propMode] = "asi";
                        this._doPulseThrottled();
                    }
                    );

                    const $btnFeat = namespace !== "ability" ? $(`<div class="w-100p ve-text-center">Feat</div>`) : $(`<button class="btn btn-xs btn-default w-50p">Feat</button>`).click(()=>{
                        this._parent.state[propMode] = "feat";
                        this._doPulseThrottled();
                    }
                    );

                    let $stgAsi;
                    if (namespace === "ability") {
                        const $colsAsi = Parser.ABIL_ABVS.map((it,ixAsi)=>{
                            const updateDisplay = ()=>$ipt.val(Number(this._parent.state[propIxAsiPointOne] === ixAsi) + Number(this._parent.state[propIxAsiPointTwo] === ixAsi));

                            const $ipt = $(`<input class="form-control form-control--minimal text-right input-xs statgen-shared__ipt" type="number" style="width: 42px;">`).disableSpellcheck().keydown(evt=>{
                                if (evt.key === "Escape")
                                    $ipt.blur();
                            }
                            ).change(()=>{
                                const raw = $ipt.val().trim();
                                const asNum = Number(raw);

                                const activeProps = [propIxAsiPointOne, propIxAsiPointTwo].filter(prop=>this._parent.state[prop] === ixAsi);

                                if (isNaN(asNum) || asNum <= 0) {
                                    this._parent.proxyAssignSimple("state", {
                                        ...activeProps.mergeMap(prop=>({
                                            [prop]: null
                                        })),
                                    }, );
                                    updateDisplay();
                                    return this._doPulseThrottled();
                                }

                                if (asNum >= 2) {
                                    this._parent.proxyAssignSimple("state", {
                                        [propIxAsiPointOne]: ixAsi,
                                        [propIxAsiPointTwo]: ixAsi,
                                    }, );
                                    updateDisplay();
                                    return this._doPulseThrottled();
                                }

                                if (activeProps.length === 2) {
                                    this._parent.state[propIxAsiPointTwo] = null;
                                    updateDisplay();
                                    return this._doPulseThrottled();
                                }

                                if (this._parent.state[propIxAsiPointOne] == null) {
                                    this._parent.state[propIxAsiPointOne] = ixAsi;
                                    updateDisplay();
                                    return this._doPulseThrottled();
                                }

                                this._parent.state[propIxAsiPointTwo] = ixAsi;
                                updateDisplay();
                                this._doPulseThrottled();
                            }
                            );

                            const hkSelected = ()=>updateDisplay();
                            this._parent.addHookBase(propIxAsiPointOne, hkSelected);
                            this._parent.addHookBase(propIxAsiPointTwo, hkSelected);
                            hkSelected();

                            return $$`<div class="ve-flex-col h-100 mr-2">
							<div class="statgen-asi__cell ve-text-center pb-1" title="${Parser.attAbvToFull(it)}">${it.toUpperCase()}</div>
							<div class="ve-flex-vh-center statgen-asi__cell relative">
								<div class="absolute no-events statgen-asi__disp-plus">+</div>
								${$ipt}
							</div>
						</div>`;
                        }
                        );

                        $stgAsi = $$`<div class="ve-flex-v-center">
							${$colsAsi}
						</div>`;
                    }

                    const {$stgFeat, $btnChooseFeat, hkIxFeat} = this._render_getMetaFeat({
                        propIxFeat,
                        propIxFeatAbility,
                        propFeatAbilityChooseFrom
                    });

                    const hkMode = ()=>{
                        if (namespace === "ability") {
                            $btnAsi.toggleClass("active", this._parent.state[propMode] === "asi");
                            $btnFeat.toggleClass("active", this._parent.state[propMode] === "feat");
                        }

                        $btnChooseFeat.toggleVe(this._parent.state[propMode] === "feat");

                        if (namespace === "ability")
                            $stgAsi.toggleVe(this._parent.state[propMode] === "asi");
                        $stgFeat.toggleVe(this._parent.state[propMode] === "feat");

                        hkIxFeat();
                    }
                    ;
                    this._parent.addHookBase(propMode, hkMode);
                    hkMode();

                    const $row = $$`<div class="ve-flex-v-end py-3 px-1">
						<div class="btn-group">${$btnAsi}${$btnFeat}</div>
						<div class="vr-4"></div>
						${$stgAsi}
						${$stgFeat}
					</div>`.appendTo($wrpRows);

                    this._metasAsi[namespace][ix_] = {
                        $row,
                    };
                }

                this._metasAsi[namespace][ix_].$row.showVe().addClass("statgen-asi__row");
            }

            if (this._metasAsi[namespace][ix - 1])
                this._metasAsi[namespace][ix - 1].$row.removeClass("statgen-asi__row");

            for (; ix < this._metasAsi[namespace].length; ++ix) {
                if (!this._metasAsi[namespace][ix])
                    continue;
                this._metasAsi[namespace][ix].$row.hideVe().removeClass("statgen-asi__row");
            }
        };
        this._parent.addHookBase(propCnt, hk);
        hk();
    }

    _render_renderAdditionalFeatSection({namespace, $wrpRows, propEntity}) {
        const fnsCleanupEnt = [];
        const fnsCleanupGroup = [];

        const {propIxSel, propPrefix} = this._parent.getPropsAdditionalFeats_(namespace);

        const resetGroupState = ()=>{
            const nxtState = Object.keys(this._parent.state).filter(k=>k.startsWith(propPrefix) && k !== propIxSel).mergeMap(k=>({
                [k]: null
            }));
            this._parent.proxyAssignSimple("state", nxtState);
        }
        ;

        const hkEnt = (isNotFirstRun)=>{
            fnsCleanupEnt.splice(0, fnsCleanupEnt.length).forEach(fn=>fn());
            fnsCleanupGroup.splice(0, fnsCleanupGroup.length).forEach(fn=>fn());
            $wrpRows.empty();

            if (isNotFirstRun)
                resetGroupState();

            const ent = this._parent[namespace];
            if ((ent?.feats?.length || 0) > 1) {
                const {$sel: $selGroup, unhook: unhookIxGroup} = UtilAdditionalFeats.getSelIxSetMeta({
                    comp: this._parent,
                    prop: propIxSel,
                    available: ent.feats
                });
                fnsCleanupEnt.push(unhookIxGroup);
                $$`<div class="ve-flex-col mb-2">
					<div class="ve-flex-v-center mb-2">
						<div class="mr-2">Feat Set:</div>
						${$selGroup.addClass("max-w-200p")}
					</div>
				</div>`.appendTo($wrpRows);
            } else {
                this._parent.state[propIxSel] = 0;
            }

            const $wrpRowsInner = $(`<div class="w-100 ve-flex-col min-h-0"></div>`).appendTo($wrpRows);

            const hkIxSel = (isNotFirstRun)=>{
                fnsCleanupGroup.splice(0, fnsCleanupGroup.length).forEach(fn=>fn());
                $wrpRowsInner.empty();

                if (isNotFirstRun)
                    resetGroupState();

                const featSet = ent?.feats?.[this._parent.state[propIxSel]];

                const uidsStatic = UtilAdditionalFeats.getUidsStatic(featSet);

                const $rows = [];

                uidsStatic.map((uid,ix)=>{
                    const {propIxFeatAbility, propFeatAbilityChooseFrom} = this._parent.getPropsAdditionalFeatsFeatSet_(namespace, "static", ix);
                    const {name, source} = DataUtil.proxy.unpackUid("feat", uid, "feat", {
                        isLower: true
                    });
                    const feat = this._parent.feats.find(it=>it.name.toLowerCase() === name && it.source.toLowerCase() === source);
                    const {$stgFeat, hkIxFeat, cleanup} = this._render_getMetaFeat({
                        featStatic: feat,
                        propIxFeatAbility,
                        propFeatAbilityChooseFrom
                    });
                    fnsCleanupGroup.push(cleanup);
                    hkIxFeat();

                    const $row = $$`<div class="ve-flex-v-end py-3 px-1 statgen-asi__row">
						<div class="btn-group"><div class="w-100p ve-text-center">Feat</div></div>
						<div class="vr-4"></div>
						${$stgFeat}
					</div>`.appendTo($wrpRowsInner);
                    $rows.push($row);
                }
                );

                [...new Array(featSet?.any || 0)].map((_,ix)=>{
                    const {propIxFeat, propIxFeatAbility, propFeatAbilityChooseFrom} = this._parent.getPropsAdditionalFeatsFeatSet_(namespace, "fromFilter", ix);
                    const {$stgFeat, hkIxFeat, cleanup} = this._render_getMetaFeat({
                        propIxFeat,
                        propIxFeatAbility,
                        propFeatAbilityChooseFrom
                    });
                    fnsCleanupGroup.push(cleanup);
                    hkIxFeat();

                    const $row = $$`<div class="ve-flex-v-end py-3 px-1 statgen-asi__row">
						<div class="btn-group"><div class="w-100p ve-text-center">Feat</div></div>
						<div class="vr-4"></div>
						${$stgFeat}
					</div>`.appendTo($wrpRowsInner);
                    $rows.push($row);
                }
                );

                if ($rows.last())
                    $rows.last().removeClass("statgen-asi__row");

                this._doPulseThrottled();
            }
            ;
            this._parent.addHookBase(propIxSel, hkIxSel);
            fnsCleanupEnt.push(()=>this._parent.removeHookBase(propIxSel, hkIxSel));
            hkIxSel();
            this._doPulseThrottled();
        }
        ;
        this._parent.addHookBase(propEntity, hkEnt);
        hkEnt();
    }

    _render_getMetaFeat({featStatic=null, propIxFeat=null, propIxFeatAbility, propFeatAbilityChooseFrom}) {
        if (featStatic && propIxFeat)
            throw new Error(`Cannot combine static feat and feat property!`);
        if (featStatic == null && propIxFeat == null)
            throw new Error(`Either a static feat or a feat property must be specified!`);

        const $btnChooseFeat = featStatic ? null : $(`<button class="btn btn-xxs btn-default mr-2" title="Choose a Feat"><span class="glyphicon glyphicon-search"></span></button>`).click(async()=>{
            const selecteds = await this._parent.modalFilterFeats.pGetUserSelection();
            if (selecteds == null || !selecteds.length){return;}

            const selected = selecteds[0];
            const ix = this._parent.feats.findIndex(it=>it.name === selected.name && it.source === selected.values.sourceJson);
            if (!~ix)
                throw new Error(`Could not find selected entity: ${JSON.stringify(selected)}`);
            this._parent.state[propIxFeat] = ix;

            this._doPulseThrottled();
        });

        const $dispFeat = $(`<div class="ve-flex-v-center mr-2"></div>`);
        const $stgSelectAbilitySet = $$`<div class="ve-flex-v-center mr-2"></div>`;
        const $stgFeatNoChoice = $$`<div class="ve-flex-v-center mr-2"></div>`;
        const $stgFeatChooseAsiFrom = $$`<div class="ve-flex-v-end"></div>`;
        const $stgFeatChooseAsiWeighted = $$`<div class="ve-flex-v-center"></div>`;

        const $stgFeat = $$`<div class="ve-flex-v-center">
			${$btnChooseFeat}
			${$dispFeat}
			${$stgSelectAbilitySet}
			${$stgFeatNoChoice}
			${$stgFeatChooseAsiFrom}
			${$stgFeatChooseAsiWeighted}
		</div>`;

        const fnsCleanup = [];
        const fnsCleanupFeat = [];
        const fnsCleanupFeatAbility = [];

        const hkIxFeat = (isNotFirstRun)=>{
            fnsCleanupFeat.splice(0, fnsCleanupFeat.length).forEach(fn=>fn());
            fnsCleanupFeatAbility.splice(0, fnsCleanupFeatAbility.length).forEach(fn=>fn());

            if (isNotFirstRun) {
                const nxtState = Object.keys(this._parent.state).filter(it=>it.startsWith(propFeatAbilityChooseFrom)).mergeMap(it=>({
                    [it]: null
                }));
                this._parent.proxyAssignSimple("state", nxtState);
            }

            const feat = featStatic || this._parent.feats[this._parent.state[propIxFeat]];

            $stgFeat.removeClass("ve-flex-v-end").addClass("ve-flex-v-center");
            $dispFeat.toggleClass("italic ve-muted", !feat);
            $dispFeat.html(feat ? Renderer.get().render(`{@feat ${feat.name.toLowerCase()}|${feat.source}}`) : `(Choose a feat)`);

            this._parent.state[propIxFeatAbility] = 0;

            $stgSelectAbilitySet.hideVe();
            if (feat) {
                if (feat.ability && feat.ability.length > 1) {
                    const metaChooseAbilitySet = ComponentUiUtil.$getSelEnum(this._parent, propIxFeatAbility, {
                        values: feat.ability.map((_,i)=>i),
                        fnDisplay: ix=>Renderer.getAbilityData([feat.ability[ix]]).asText,
                        asMeta: true,
                    }, );

                    $stgSelectAbilitySet.showVe().append(metaChooseAbilitySet.$sel);
                    metaChooseAbilitySet.$sel.change(()=>this._doPulseThrottled());
                    fnsCleanupFeat.push(()=>metaChooseAbilitySet.unhook());
                }

                const hkAbilitySet = ()=>{
                    fnsCleanupFeatAbility.splice(0, fnsCleanupFeatAbility.length).forEach(fn=>fn());

                    if (!feat.ability) {
                        $stgFeatNoChoice.empty().hideVe();
                        $stgFeatChooseAsiFrom.empty().hideVe();
                        return;
                    }

                    const abilitySet = feat.ability[this._parent.state[propIxFeatAbility]];

                    const ptsNoChoose = Parser.ABIL_ABVS.filter(ab=>abilitySet[ab]).map(ab=>`${Parser.attAbvToFull(ab)} ${UiUtil.intToBonus(abilitySet[ab], {
                        isPretty: true
                    })}`);
                    $stgFeatNoChoice.empty().toggleVe(ptsNoChoose.length).html(`<div><span class="mr-2">\u2014</span>${ptsNoChoose.join(", ")}</div>`);

                    if (abilitySet.choose && abilitySet.choose.from) {
                        $stgFeat.removeClass("ve-flex-v-center").addClass("ve-flex-v-end");
                        $stgFeatChooseAsiFrom.showVe().empty();
                        $stgFeatChooseAsiWeighted.empty().hideVe();

                        const count = abilitySet.choose.count || 1;
                        const amount = abilitySet.choose.amount || 1;

                        const {rowMetas, cleanup: cleanupAsiPicker} = ComponentUiUtil.getMetaWrpMultipleChoice(this._parent, propFeatAbilityChooseFrom, {
                            values: abilitySet.choose.from,
                            fnDisplay: v=>`${Parser.attAbvToFull(v)} ${UiUtil.intToBonus(amount, {
                                isPretty: true
                            })}`,
                            count,
                        }, );
                        fnsCleanupFeatAbility.push(()=>cleanupAsiPicker());

                        $stgFeatChooseAsiFrom.append(`<div><span class="mr-2">\u2014</span>choose ${count > 1 ? `${count} ` : ""}${UiUtil.intToBonus(amount, {
                            isPretty: true
                        })}</div>`);

                        rowMetas.forEach(meta=>{
                            meta.$cb.change(()=>this._doPulseThrottled());

                            $$`<label class="ve-flex-col no-select">
								<div class="ve-flex-vh-center statgen-asi__cell-feat" title="${Parser.attAbvToFull(meta.value)}">${meta.value.toUpperCase()}</div>
								<div class="ve-flex-vh-center statgen-asi__cell-feat">${meta.$cb}</div>
							</label>`.appendTo($stgFeatChooseAsiFrom);
                        }
                        );
                    } else if (abilitySet.choose && abilitySet.choose.weighted) {
                        $stgFeatChooseAsiFrom.empty().hideVe();
                        $stgFeatChooseAsiWeighted.showVe().html(`<i class="ve-muted">The selected ability score format is currently unsupported. Please check back later!</i>`);
                    } else {
                        $stgFeatChooseAsiFrom.empty().hideVe();
                        $stgFeatChooseAsiWeighted.empty().hideVe();
                    }

                    this._doPulseThrottled();
                }
                ;
                this._parent.addHookBase(propIxFeatAbility, hkAbilitySet);
                fnsCleanupFeat.push(()=>this._parent.removeHookBase(propIxFeatAbility, hkAbilitySet));
                hkAbilitySet();
            } else {
                $stgFeatNoChoice.empty().hideVe();
                $stgFeatChooseAsiFrom.empty().hideVe();
                $stgFeatChooseAsiWeighted.empty().hideVe();
            }

            this._doPulseThrottled();
        }
        ;

        if (!featStatic) {
            this._parent.addHookBase(propIxFeat, hkIxFeat);
            fnsCleanup.push(()=>this._parent.removeHookBase(propIxFeat, hkIxFeat));
        }

        const cleanup = ()=>{
            fnsCleanup.splice(0, fnsCleanup.length).forEach(fn=>fn());
            fnsCleanupFeat.splice(0, fnsCleanupFeat.length).forEach(fn=>fn());
            fnsCleanupFeatAbility.splice(0, fnsCleanupFeatAbility.length).forEach(fn=>fn());
        }
        ;

        return {
            $btnChooseFeat,
            $stgFeat,
            hkIxFeat,
            cleanup
        };
    }

    render($wrpAsi) {
        const $wrpRowsAsi = $(`<div class="ve-flex-col w-100 overflow-y-auto"></div>`);
        const $wrpRowsRace = $(`<div class="ve-flex-col w-100 overflow-y-auto"></div>`);
        const $wrpRowsBackground = $(`<div class="ve-flex-col w-100 overflow-y-auto"></div>`);
        const $wrpRowsCustom = $(`<div class="ve-flex-col w-100 overflow-y-auto"></div>`);

        this._render_renderAsiFeatSection("common_cntAsi", "ability", $wrpRowsAsi);
        this._render_renderAsiFeatSection("common_cntFeatsCustom", "custom", $wrpRowsCustom);
        this._render_renderAdditionalFeatSection({
            propEntity: "common_ixRace",
            namespace: "race",
            $wrpRows: $wrpRowsRace
        });
        this._render_renderAdditionalFeatSection({
            propEntity: "common_ixBackground",
            namespace: "background",
            $wrpRows: $wrpRowsBackground
        });

        const $getStgEntity = ({title, $wrpRows, propEntity, propIxEntity})=>{
            const $stg = $$`<div class="ve-flex-col">
				<hr class="hr-3 hr--dotted">
				<h4 class="my-2 bold">${title} Feats</h4>
				${$wrpRows}
			</div>`;

            const hkIxEntity = ()=>{
                const entity = this._parent[propEntity];
                $stg.toggleVe(!this._parent.isLevelUp && !!entity?.feats);
            }
            ;
            this._parent.addHookBase(propIxEntity, hkIxEntity);
            hkIxEntity();

            return $stg;
        }
        ;

        const $stgRace = $getStgEntity({
            title: "Race",
            $wrpRows: $wrpRowsRace,
            propEntity: "race",
            propIxEntity: "common_ixRace"
        });

        const $stgBackground = $getStgEntity({
            title: "Background",
            $wrpRows: $wrpRowsBackground,
            propEntity: "background",
            propIxEntity: "common_ixBackground"
        });

        const $iptCountFeatsCustom = ComponentUiUtil.$getIptInt(this._parent, "common_cntFeatsCustom", 0, {
            min: 0,
            max: StatGenUi._MAX_CUSTOM_FEATS
        }).addClass("w-100p ve-text-center");

        $$($wrpAsi)`
			<h4 class="my-2 bold">Ability Score Increases</h4>
			${this._render_$getStageCntAsi()}
			${$wrpRowsAsi}

			${$stgRace}

			${$stgBackground}

			<hr class="hr-3 hr--dotted">
			<h4 class="my-2 bold">Additional Feats</h4>
			<label class="w-100 ve-flex-v-center mb-2">
				<div class="mr-2 no-shrink">Number of additional feats:</div>${$iptCountFeatsCustom}
			</label>
			${$wrpRowsCustom}
		`;
    }

    _render_$getStageCntAsi() {
        if (!this._parent.isCharacterMode) {
            const $iptCountAsi = ComponentUiUtil.$getIptInt(this._parent, "common_cntAsi", 0, {
                min: 0,
                max: 20
            }).addClass("w-100p ve-text-center");
            return $$`<label class="w-100 ve-flex-v-center mb-2"><div class="mr-2 no-shrink">Number of Ability Score Increases to apply:</div>${$iptCountAsi}</label>`;
        }

        const $out = $$`<div class="w-100 ve-flex-v-center mb-2 italic ve-muted">No ability score increases available.</div>`;
        const hkCntAsis = ()=>$out.toggleVe(this._parent.state.common_cntAsi === 0);
        this._parent.addHookBase("common_cntAsi", hkCntAsis);
        hkCntAsis();
        return $out;
    }

    _getFormData_getForNamespace_basic(outs, outIsFormCompletes, outFeats, propCnt, namespace) {
        for (let i = 0; i < this._parent.state[propCnt]; ++i) {
            const {propMode, propIxFeat, propIxAsiPointOne, propIxAsiPointTwo, propIxFeatAbility, propFeatAbilityChooseFrom} = this._parent.getPropsAsi(i, namespace);

            if (this._parent.state[propMode] === "asi") {
                const out = {};

                let ttlChosen = 0;

                Parser.ABIL_ABVS.forEach((ab,abI)=>{
                    const increase = [this._parent.state[propIxAsiPointOne] === abI, this._parent.state[propIxAsiPointTwo] === abI].filter(Boolean).length;
                    if (increase)
                        out[ab] = increase;
                    ttlChosen += increase;
                }
                );

                const isFormComplete = ttlChosen === 2;

                outFeats[namespace].push(null);
                outs.push(out);
                outIsFormCompletes.push(isFormComplete);
            } else if (this._parent.state[propMode] === "feat") {
                const {isFormComplete, out} = this._getFormData_doAddFeatMeta({
                    namespace,
                    outFeats,
                    propIxFeat,
                    propIxFeatAbility,
                    propFeatAbilityChooseFrom,
                    type: "choose",
                });
                outs.push(out);
                outIsFormCompletes.push(isFormComplete);
            }
        }
    }

    _getFormData_getForNamespace_additional(outs, outIsFormCompletes, outFeats, namespace) {
        const ent = this._parent[namespace];
        if (!ent?.feats?.length)
            return;

        const {propIxSel} = this._parent.getPropsAdditionalFeats_(namespace);

        const featSet = ent.feats[this._parent.state[propIxSel]];
        if (!featSet) {
            outIsFormCompletes.push(false);
            return;
        }

        const uidsStatic = UtilAdditionalFeats.getUidsStatic(featSet);

        uidsStatic.map((uid,ix)=>{
            const {propIxFeatAbility, propFeatAbilityChooseFrom} = this._parent.getPropsAdditionalFeatsFeatSet_(namespace, "static", ix);
            const {name, source} = DataUtil.proxy.unpackUid("feat", uid, "feat", {
                isLower: true
            });
            const feat = this._parent.feats.find(it=>it.name.toLowerCase() === name && it.source.toLowerCase() === source);

            const {isFormComplete, out} = this._getFormData_doAddFeatMeta({
                namespace,
                outFeats,
                featStatic: feat,
                propIxFeatAbility,
                propFeatAbilityChooseFrom,
                type: "static",
            });

            outs.push(out);
            outIsFormCompletes.push(isFormComplete);
        }
        );

        [...new Array(featSet.any || 0)].map((_,ix)=>{
            const {propIxFeat, propIxFeatAbility, propFeatAbilityChooseFrom} = this._parent.getPropsAdditionalFeatsFeatSet_(namespace, "fromFilter", ix);

            const {isFormComplete, out} = this._getFormData_doAddFeatMeta({
                namespace,
                outFeats,
                propIxFeat,
                propIxFeatAbility,
                propFeatAbilityChooseFrom,
                type: "choose",
            });

            outs.push(out);
            outIsFormCompletes.push(isFormComplete);
        }
        );
    }

    _getFormData_doAddFeatMeta({namespace, outFeats, propIxFeat=null, featStatic=null, propIxFeatAbility, propFeatAbilityChooseFrom, type}) {
        if (featStatic && propIxFeat)
            throw new Error(`Cannot combine static feat and feat property!`);
        if (featStatic == null && propIxFeat == null)
            throw new Error(`Either a static feat or a feat property must be specified!`);

        const out = {};

        const feat = featStatic || this._parent.feats[this._parent.state[propIxFeat]];

        const featMeta = feat ? {
            ix: this._parent.state[propIxFeat],
            uid: `${feat.name}|${feat.source}`,
            type
        } : {
            ix: -1,
            uid: null,
            type
        };
        outFeats[namespace].push(featMeta);

        if (!~featMeta.ix)
            return {
                isFormComplete: false,
                out
            };
        if (!feat.ability)
            return {
                isFormComplete: true,
                out
            };

        const abilitySet = feat.ability[this._parent.state[propIxFeatAbility] || 0];

        Parser.ABIL_ABVS.forEach(ab=>{
            if (abilitySet[ab])
                out[ab] = abilitySet[ab];
        }
        );

        if (!abilitySet.choose)
            return {
                isFormComplete: true,
                out
            };

        let isFormComplete = true;

        featMeta.abilityChosen = {};

        if (abilitySet.choose.from) {
            if (isFormComplete)
                isFormComplete = !!this._parent.state[ComponentUiUtil.getMetaWrpMultipleChoice_getPropIsAcceptable(propFeatAbilityChooseFrom)];

            const ixs = ComponentUiUtil.getMetaWrpMultipleChoice_getSelectedIxs(this._parent, propFeatAbilityChooseFrom);
            ixs.map(it=>abilitySet.choose.from[it]).forEach(ab=>{
                const amount = abilitySet.choose.amount || 1;
                out[ab] = (out[ab] || 0) + amount;
                featMeta.abilityChosen[ab] = amount;
            }
            );
        }

        return {
            isFormComplete,
            out
        };
    }

    getFormData() {
        const outs = [];
        const isFormCompletes = [];
        const feats = {
            ability: [],
            race: [],
            background: [],
            custom: []
        };

        this._getFormData_getForNamespace_basic(outs, isFormCompletes, feats, "common_cntAsi", "ability");
        this._getFormData_getForNamespace_basic(outs, isFormCompletes, feats, "common_cntFeatsCustom", "custom");
        this._getFormData_getForNamespace_additional(outs, isFormCompletes, feats, "race");
        this._getFormData_getForNamespace_additional(outs, isFormCompletes, feats, "background");

        const data = {};
        outs.filter(Boolean).forEach(abilBonuses=>Object.entries(abilBonuses).forEach(([ab,bonus])=>data[ab] = (data[ab] || 0) + bonus));

        return {
            isFormComplete: isFormCompletes.every(Boolean),
            dataPerAsi: outs,
            data,
            feats,
        };
    }
};
StatGenUi.RenderableCollectionPbRules = class extends RenderableCollectionGenericRows {
    constructor(statGenUi, $wrp) {
        super(statGenUi, "pb_rules", $wrp);
    }

    getNewRender(rule, i) {
        const parentComp = this._comp;

        const comp = this._utils.getNewRenderComp(rule, i);

        const $dispCost = $(`<div class="ve-flex-vh-center"></div>`);
        const hkCost = ()=>$dispCost.text(comp._state.cost);
        comp._addHookBase("cost", hkCost);
        hkCost();

        const $iptCost = ComponentUiUtil.$getIptInt(comp, "cost", 0, {
            html: `<input class="form-control input-xs form-control--minimal ve-text-center">`,
            fallbackOnNaN: 0
        });

        const hkIsCustom = ()=>{
            $dispCost.toggleVe(!parentComp.state.pb_isCustom);
            $iptCost.toggleVe(parentComp.state.pb_isCustom);
        };
        parentComp._addHookBase("pb_isCustom", hkIsCustom);
        hkIsCustom();

        const $btnDelete = $(`<button class="btn btn-xxs btn-danger" title="Delete"><span class="glyphicon glyphicon-trash"></span></button>`).click(()=>{
            if (parentComp.state.pb_rules.length === 1)
                return;
            parentComp.state.pb_rules = parentComp.state.pb_rules.filter(it=>it !== rule);
        }
        );

        const $wrpRow = $$`<div class="ve-flex py-1 stripe-even statgen-pb__row-cost">
			<div class="statgen-pb__col-cost ve-flex-vh-center">${comp._state.score}</div>
			<div class="statgen-pb__col-cost ve-flex-vh-center">${Parser.getAbilityModifier(comp._state.score)}</div>
			<div class="statgen-pb__col-cost ve-flex-vh-center px-3">
				${$dispCost}
				${$iptCost}
			</div>
			<div class="statgen-pb__col-cost-delete">${$btnDelete}</div>
		</div>`.appendTo(this._$wrpRows);

        const hkRules = ()=>{
            //$btnDelete.toggleVe((parentComp.state.pb_rules[0] === rule || parentComp.state.pb_rules.last() === rule) && parentComp.state.pb_isCustom);
        };
        parentComp._addHookBase("pb_rules", hkRules);
        parentComp._addHookBase("pb_isCustom", hkRules);
        hkRules();

        return {
            comp,
            $wrpRow,
            fnCleanup: ()=>{
                parentComp._removeHookBase("pb_isCustom", hkIsCustom);
                parentComp._removeHookBase("pb_isCustom", hkRules);
                parentComp._removeHookBase("pb_rules", hkRules);
            }
            ,
        };
    }

    doDeleteExistingRender(renderedMeta) {
        renderedMeta.fnCleanup();
    }
};

class StatGenUiCharactermancer extends StatGenUi {
    _roll_getRolledStats() {
        try {
            //Make a test roll
            const roll = new Roll(this._state.rolled_formula);
            roll.evaluate({ async: false });
        }
        //Catch the error if it shows up, and return an error ui
        catch (err) { console.error(err); return this._$rollIptFormula.addClass("form-control--error"); }

        const result = [];
        for (let i = 0; i < this._state.rolled_rollCount; i++) {
            const roll = new Roll(this._state.rolled_formula);
            roll.evaluate({ async: false });
            result.push(roll);
            if(SETTINGS.DICE_TOMESSAGE){roll.toMessage({ sound: null }).then(null);}
        }
        result.sort((r1, r2) => SortUtil.ascSort(r2.total, r1.total));
        let outputs = result.map(r => ({
            total: r.total,
            text: (r?.terms || []).map(term => (term?.results || []).map(result => '[' + (result.result || '‒') + ']').join('+'))
        }));
        return outputs;
    }
}

class UtilAdditionalFeats {
    static isNoChoice(available) {
        if (!available?.length)
            return true;
        if (available.length > 1)
            return false;
        return !available[0].any;
    }

    static getUidsStatic(availableSet) {
        return Object.entries(availableSet || {}).filter(([k,v])=>k !== "any" && v).sort(([kA],[kB])=>SortUtil.ascSortLower(kA, kB)).map(([k])=>k);
    }

    static getSelIxSetMeta({comp, prop, available}) {
        return ComponentUiUtil.$getSelEnum(comp, prop, {
            values: available.map((_,i)=>i),
            fnDisplay: ix=>{
                const featSet = available[ix];

                const out = [];

                if (featSet.any) {
                    out.push(`Choose any${featSet.any > 1 ? ` ${Parser.numberToText(featSet.any)}` : ""}`);
                }

                this.getUidsStatic(featSet).forEach(uid=>{
                    const {name} = DataUtil.proxy.unpackUid("feat", uid, "feat", {
                        isLower: true
                    });
                    out.push(name.toTitleCase());
                }
                );

                return out.filter(Boolean).join("; ");
            }
            ,
            asMeta: true,
        }, );
    }
}

/* StatGenUi.RenderableCollectionPbRules = class extends RenderableCollectionGenericRows {
    constructor(statGenUi, $wrp) {
        super(statGenUi, "pb_rules", $wrp);
    }

    getNewRender(rule, i) {
        const parentComp = this._comp;

        const comp = this._utils.getNewRenderComp(rule, i);

        const $dispCost = $(`<div class="ve-flex-vh-center"></div>`);
        const hkCost = ()=>$dispCost.text(comp._state.cost);
        comp._addHookBase("cost", hkCost);
        hkCost();

        const $iptCost = ComponentUiUtil.$getIptInt(comp, "cost", 0, {
            html: `<input class="form-control input-xs form-control--minimal ve-text-center">`,
            fallbackOnNaN: 0
        });

        const hkIsCustom = ()=>{
            $dispCost.toggleVe(!parentComp.state.pb_isCustom);
            $iptCost.toggleVe(parentComp.state.pb_isCustom);
        }
        ;
        parentComp._addHookBase("pb_isCustom", hkIsCustom);
        hkIsCustom();

        const $btnDelete = $(`<button class="btn btn-xxs btn-danger" title="Delete"><span class="glyphicon glyphicon-trash"></span></button>`).click(()=>{
            if (parentComp.state.pb_rules.length === 1)
                return;
            parentComp.state.pb_rules = parentComp.state.pb_rules.filter(it=>it !== rule);
        }
        );

        const $wrpRow = $$`<div class="ve-flex py-1 stripe-even statgen-pb__row-cost">
			<div class="statgen-pb__col-cost ve-flex-vh-center">${comp._state.score}</div>
			<div class="statgen-pb__col-cost ve-flex-vh-center">${Parser.getAbilityModifier(comp._state.score)}</div>
			<div class="statgen-pb__col-cost ve-flex-vh-center px-3">
				${$dispCost}
				${$iptCost}
			</div>
			<div class="statgen-pb__col-cost-delete">${$btnDelete}</div>
		</div>`.appendTo(this._$wrpRows);

        const hkRules = ()=>{
            $btnDelete.toggleVe((parentComp.state.pb_rules[0] === rule || parentComp.state.pb_rules.last() === rule) && parentComp.state.pb_isCustom);
        }
        ;
        parentComp._addHookBase("pb_rules", hkRules);
        parentComp._addHookBase("pb_isCustom", hkRules);
        hkRules();

        return {
            comp,
            $wrpRow,
            fnCleanup: ()=>{
                parentComp._removeHookBase("pb_isCustom", hkIsCustom);
                parentComp._removeHookBase("pb_isCustom", hkRules);
                parentComp._removeHookBase("pb_rules", hkRules);
            }
            ,
        };
    }

    doDeleteExistingRender(renderedMeta) {
        renderedMeta.fnCleanup();
    }
}; */

//#endregion

//#region Charactermancer Race
class ActorCharactermancerRace extends ActorCharactermancerBaseComponent {
    constructor(parentInfo) {
      parentInfo = parentInfo || {};
      super();
      this._actor = parentInfo.actor;
      this._data = parentInfo.data;
      this._parent = parentInfo.parent;
      this._tabRace = parentInfo.tabRace;
      //TEMPFIX
      this._modalFilterRaces = new ModalFilterRaces({//ModalFilterRacesFvtt({
        'namespace': 'ActorCharactermancer.races',
        'isRadio': true,
        'allData': this._data.race
      });
      this._compRaceSize = null;
      this._compRaceSkillToolLanguageProficiencies = null;
      this._compRaceSkillProficiencies = null;
      this._compRaceLanguageProficiencies = null;
      this._compRaceToolProficiencies = null;
      this._compRaceExpertise = null;
      this._compRaceWeaponProficiencies = null;
      this._compRaceArmorProficiencies = null;
      this._compRaceDamageImmunity = null;
      this._compRaceDamageResistance = null;
      this._compRaceDamageVulnerability = null;
      this._compRaceConditionImmunity = null;
    }

    render() {
        const parentDiv = this._tabRace?.$wrpTab;
        if (!parentDiv) {return;}
        if(!this._data.race || this._data.race.length < 1){console.error("No races provided!");}
        
        //Create a searchable selector field that uses the modalfilter to only show filtered content
        const {$sel: ele_sel, $btnFilter: ele_btnFilter, $stgSelVersion: ele_selVersion }
        = Charactermancer_Util.getFilterSearchMeta({
            'comp': this,
            'prop': "race_ixRace",
            'propVersion': "race_ixRace_version",
            'data': this._data.race,
            'modalFilter': this._modalFilterRaces,
            'title': "Race"
        });

        //When race changes, reset the race version
        const onRaceChanged = () => this._setStateValue('race_ixRace_version', null);
        this._addHookBase('race_ixRace', onRaceChanged);

        const createExtraInfoElements = () => {
            //Take all child names of __state
            //Get only the child names that start with "race_" and arent 'race_ixRace' or 'race_ixRace_version'
            //From those, return them all as an array? not sure
            const racePropertyNames = Object.keys(this.__state).filter(prop => prop.startsWith('race_')
                && !['race_ixRace', 'race_ixRace_version'].includes(prop)).mergeMap(props => ({
                [props]: null
            }));

            this._proxyAssignSimple("state", racePropertyNames);
            const curRace = this.getRace_();
            if(this._data.race.length<1){console.error("data has no races?");}

            //#region Render proficiencies
            this._race_renderRace_stgSize({'$stgSize': ele_size, 'race': curRace });
            
            this._shared_renderEntity_stgOtherProficiencies({
                '$stg': ele_skillToolLang,
                'ent': curRace,
                'propComp': '_compRaceSkillToolLanguageProficiencies',
                'propProficiencies': 'skillToolLanguageProficiencies',
                'CompClass': Charactermancer_OtherProficiencySelect,
                'fnGetExistingFvtt': Charactermancer_OtherProficiencySelect.getExistingFvttFromActor.bind(Charactermancer_OtherProficiencySelect)
            });
            this._shared_renderEntity_stgOtherProficiencies({
                '$stg': ele_skill,
                'ent': curRace,
                'propComp': "_compRaceSkillProficiencies",
                'propProficiencies': "skillProficiencies",
                'title': "Skill Proficiencies",
                'CompClass': Charactermancer_OtherProficiencySelect,
                'propPathActorExistingProficiencies': ["system", "skills"],
                'fnGetMappedProficiencies': Charactermancer_OtherProficiencySelect.getMappedSkillProficiencies.bind(Charactermancer_OtherProficiencySelect)
            });
            this._shared_renderEntity_stgOtherProficiencies({
                '$stg': ele_lang,
                'ent': curRace,
                'propComp': '_compRaceLanguageProficiencies',
                'propProficiencies': "languageProficiencies",
                'title': "Language Proficiencies",
                'CompClass': Charactermancer_OtherProficiencySelect,
                'propPathActorExistingProficiencies': ['system', "traits", "languages"],
                'fnGetMappedProficiencies': Charactermancer_OtherProficiencySelect.getMappedLanguageProficiencies.bind(Charactermancer_OtherProficiencySelect)
            });
            this._shared_renderEntity_stgOtherProficiencies({
                '$stg': ele_tools,
                'ent': curRace,
                'propComp': "_compRaceToolProficiencies",
                'propProficiencies': "toolProficiencies",
                'title': "Tool Proficiencies",
                'CompClass': Charactermancer_OtherProficiencySelect,
                'propPathActorExistingProficiencies': ["system", "tools"],
                'fnGetMappedProficiencies': Charactermancer_OtherProficiencySelect.getMappedToolProficiencies.bind(Charactermancer_OtherProficiencySelect)
            });
            this._shared_renderEntity_stgOtherProficiencies({
                '$stg': ele_expertise,
                'ent': curRace,
                'propComp': '_compRaceExpertise',
                'propProficiencies': "expertise",
                'title': "Expertise",
                'CompClass': Charactermancer_ExpertiseSelect,
                'fnGetExistingFvtt': Charactermancer_ExpertiseSelect.getExistingFvttFromActor.bind(Charactermancer_ExpertiseSelect)
            });
            this._shared_renderEntity_stgOtherProficiencies({
                '$stg': ele_wep,
                'ent': curRace,
                'propComp': "_compRaceWeaponProficiencies",
                'propProficiencies': 'weaponProficiencies',
                'title': "Weapon Proficiencies",
                'CompClass': Charactermancer_OtherProficiencySelect,
                'propPathActorExistingProficiencies': ["system", 'traits', 'weaponProf'],
                'fnGetMappedProficiencies': Charactermancer_OtherProficiencySelect.getMappedWeaponProficiencies.bind(Charactermancer_OtherProficiencySelect)
            });
            this._shared_renderEntity_stgOtherProficiencies({
                '$stg': ele_armor,
                'ent': curRace,
                'propComp': "_compRaceArmorProficiencies",
                'propProficiencies': "armorProficiencies",
                'title': "Armor Proficiencies",
                'CompClass': Charactermancer_OtherProficiencySelect,
                'propPathActorExistingProficiencies': ["system", "traits", "armorProf"],
                'fnGetMappedProficiencies': Charactermancer_OtherProficiencySelect.getMappedArmorProficiencies.bind(Charactermancer_OtherProficiencySelect)
            });
            this._shared_renderEntity_stgDiDrDvCi({
                '$stg': ele_damImm,
                'ent': curRace,
                'propComp': "_compRaceDamageImmunity",
                'CompClass': Charactermancer_DamageImmunitySelect,
                'title': "Damage Immunity",
                'propRaceData': "immune",
                'propTraits': 'di'
            });
            this._shared_renderEntity_stgDiDrDvCi({
                '$stg': ele_damRes,
                'ent': curRace,
                'propComp': "_compRaceDamageResistance",
                'CompClass': Charactermancer_DamageResistanceSelect,
                'title': "Damage Resistance",
                'propRaceData': "resist",
                'propTraits': 'dr'
            });
            this._shared_renderEntity_stgDiDrDvCi({
                '$stg': ele_damVul,
                'ent': curRace,
                'propComp': "_compRaceDamageVulnerability",
                'CompClass': Charactermancer_DamageVulnerabilitySelect,
                'title': "Damage Vulnerability",
                'propRaceData': 'vulnerable',
                'propTraits': 'dv'
            });
            this._shared_renderEntity_stgDiDrDvCi({
                '$stg': ele_conImm,
                'ent': curRace,
                'propComp': '_compRaceConditionImmunity',
                'CompClass': Charactermancer_ConditionImmunitySelect,
                'title': "Condition Immunity",
                'propRaceData': "conditionImmune",
                'propTraits': 'ci'
            });
            //#endregion
            
            ele_textRoller.empty();

            if (curRace) {
                //PG_RACES = "Races.html"
                ele_textRoller.append(Renderer.hover.$getHoverContent_stats(UrlUtil.PG_RACES, MiscUtil.copy(curRace)));
                const race = this._data.race[this._state.race_ixRace];
                //TEMPFIX
                /* DataLoader.pCacheAndGet("raceFluff", race.source, UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_RACES](race)).then(o => {
                    if (!o) { return; }
                    if (o.name !== race.name || o.source !== race.source) { return; }
                    if (!o.images?.["length"]) { return; }
                    ele_textRoller.append("<hr class=\"hr-1\">");
                    ele_textRoller.append(Renderer.get().render(o.images[0]));
                }); */
            }
        };

        //When race version changes, redraw the elements
        this._addHookBase("race_ixRace_version", createExtraInfoElements);

        const ele_size = $$`<div class="ve-flex-col"></div>`.hideVe();
        const ele_skillToolLang = $$`<div class="ve-flex-col"></div>`.hideVe();
        const ele_skill = $$`<div class="ve-flex-col"></div>`.hideVe();
        const ele_lang = $$`<div class="ve-flex-col"></div>`.hideVe();
        const ele_tools = $$`<div class="ve-flex-col"></div>`.hideVe();
        const ele_wep = $$`<div class="ve-flex-col"></div>`.hideVe();
        const ele_armor = $$`<div class="ve-flex-col"></div>`.hideVe();
        const ele_expertise = $$`<div class="ve-flex-col"></div>`.hideVe();
        const ele_damImm = $$`<div class="ve-flex-col"></div>`.hideVe();
        const ele_damRes = $$`<div class="ve-flex-col"></div>`.hideVe();
        const ele_damVul = $$`<div class="ve-flex-col"></div>`.hideVe();
        const ele_conImm = $$`<div class="ve-flex-col"></div>`.hideVe();
        const ele_textRoller = $$`<div class="ve-flex-col w-100"></div>`;

        $$`
        <div class="ve-flex w-100 h-100">
        <div class="ve-flex-col w-100 h-100 px-1 pt-1 overflow-y-auto ve-grow veapp__bg-foundry">
            <div class="bold mb-2">Select a Race</div>
            <div class="ve-flex-v-center btn-group w-100">${ele_btnFilter}${ele_sel}</div>
            ${ele_selVersion}
            ${ele_skillToolLang}
            ${ele_size}
            ${ele_skill}
            ${ele_lang}
            ${ele_tools}
            ${ele_expertise}
            ${ele_wep}
            ${ele_armor}
            ${ele_damImm}
            ${ele_damRes}
            ${ele_damVul}
            ${ele_conImm}
            </div>
    
            <div class="vr-1"></div>
    
            <div class="ve-flex-col w-100 h-100 px-1 overflow-y-auto ve-grow veapp__bg-foundry">
                ${ele_textRoller}
            </div>
        </div>`.appendTo(parentDiv);

        createExtraInfoElements();
    }
    
    get modalFilterRaces() { return this._modalFilterRaces; }
    get compRaceSize() { return this._compRaceSize; }
    get ["compRaceSkillToolLanguageProficiencies"]() {
      return this._compRaceSkillToolLanguageProficiencies;
    }
    /**
     * @returns {Charactermancer_OtherProficiencySelect}
     */
    get compRaceSkillProficiencies() {
      return this._compRaceSkillProficiencies;
    }
    get ["compRaceLanguageProficiencies"]() {
      return this._compRaceLanguageProficiencies;
    }
    get ["compRaceToolProficiencies"]() {
      return this._compRaceToolProficiencies;
    }
    get ["compRaceExpertise"]() {
      return this._compRaceExpertise;
    }
    get ['compRaceWeaponProficiencies']() {
      return this._compRaceWeaponProficiencies;
    }
    get ["compRaceArmorProficiencies"]() {
      return this._compRaceArmorProficiencies;
    }
    get ["compRaceDamageImmunity"]() {
      return this._compRaceDamageImmunity;
    }
    get ["compRaceDamageResistance"]() {
      return this._compRaceDamageResistance;
    }
    get ['compRaceDamageVulnerability']() {
      return this._compRaceDamageVulnerability;
    }
    get ["compRaceConditionImmunity"]() {
      return this._compRaceConditionImmunity;
    }
    async pLoad() {
      await this._modalFilterRaces.pPreloadHidden();
      if(SETTINGS.USE_EXISTING_WEB){
        //console.log(this._actor?.race);
        //this._test_DoHandleExistingRace(this._actor?.race);
        return;
      }
      if(!SETTINGS.USE_EXISTING){return;}
      this._pLoad_pDoHandleExistingRace();
    }
    //#region Handle Loading Existing
    //#region FVTT
    /**This function grabs existing race from a foundryVTT actor */
    _pLoad_pDoHandleExistingRace() {
        const myRace = this._actor.system.details?.race;
        if (!myRace) { return; }
        const { ixRace: ixRace, ixRaceVersion: ixRaceVersion, isRacePresent: isRacePresent }
        = this._pLoad_getExistingRaceIndex(myRace);
        if (isRacePresent && ixRace == null) {
            const errorStr = "Could not find race \"" + myRace + "\" in loaded data. " + Charactermancer_Util.STR_WARN_SOURCE_SELECTION;
            ui.notifications.warn(errorStr);
            console.warn(...LGT, errorStr, "Strict source matching is: " + Config.get('import', "isStrictMatching") + '.');
        }
        this._state.race_ixRace = ixRace;
        this._state.race_ixRace_version = ixRaceVersion;
    }
    _pLoad_getExistingRaceIndex(race) {
        const raceNameLower = (IntegrationBabele.getOriginalName(race) || '').trim().toLowerCase();
        const moduleRaceFlag = race?.flags?.[SharedConsts.MODULE_ID];
        const hasModuleInfo = moduleRaceFlag?.propDroppable === "race" && moduleRaceFlag?.source && moduleRaceFlag?.hash;
        let outIxRace = null;
        let outIxRaceVersion = null;
        topLoop: for (let ix = 0; ix < this._data.race.length; ++ix) {
            const ourDataRace = this._data.race[ix];
            if (hasModuleInfo && moduleRaceFlag.source === ourDataRace.source && moduleRaceFlag.hash 
                === UrlUtil.URL_TO_HASH_BUILDER.race(ourDataRace) ||
                this._pLoad_pDoHandleExistingRace_isMatch({race: ourDataRace, existingRaceClean: raceNameLower}))
            {
                outIxRace = ix; break;
            }
            const versions = DataUtil.generic.getVersions(ourDataRace);
            for (let j = 0; j < versions.length; ++j) {
                const version = versions[j];
                if (hasModuleInfo && moduleRaceFlag.source === version.source && moduleRaceFlag.hash
                    === UrlUtil.URL_TO_HASH_BUILDER.race(version) ||
                    this._pLoad_pDoHandleExistingRace_isMatch({ race: version, existingRaceClean: raceNameLower })) {
                    outIxRace = ix; outIxRaceVersion = j; break topLoop;
                }
            }
        }
        return { ixRace: outIxRace, ixRaceVersion: outIxRaceVersion, isRacePresent: raceNameLower || hasModuleInfo };
    }
    _pLoad_pDoHandleExistingRace_isMatch({ race: race, existingRaceClean: existingRaceNameLower }) {
        if (!existingRaceNameLower) { return false; }
        return race.name.toLowerCase().trim() === existingRaceNameLower || (PageFilterRaces.getInvertedName(race.name) 
        || '').toLowerCase().trim() === existingRaceNameLower;
    }
    //#endregion
    //#region WEB
    _test_DoHandleExistingRace(existingRace){
        if(!existingRace || !existingRace.race){return;}
        const raceInfo = existingRace.race;
        const { ixRace: ixRace, ixRaceVersion: ixRaceVersion } = this._test_getExistingRaceIndex(raceInfo);
        const isRacePresent = !!ixRace;
        if(!isRacePresent){
            //throw error
            throw new Error("Could not match cached race to any race in data", existingRace);
            return;
        }
        this._state.race_ixRace = ixRace;
        this._state.race_ixRace_version = ixRaceVersion;

        //Apply state info to subcomponents
        for(let subCompName of Object.keys(existingRace.stateInfo.subcomps)){
            if(!this[subCompName]){continue;}
            const subComp = this[subCompName];
            for(let prop of Object.keys(existingRace.stateInfo[subCompName])){
                this._state[prop] = existingRace.stateInfo[subCompName][prop];
            }
        }
    }
    _test_getExistingRaceIndex(race){
        const raceNameLower = race.name.trim().toLowerCase();//(IntegrationBabele.getOriginalName(race) || '').trim().toLowerCase();
        let outIxRace = -1;
        let outIxRaceVersion = null;
        topLoop: for (let ix = 0; ix < this._data.race.length; ++ix) {
            const ourDataRace = this._data.race[ix];
            const raceHash = UrlUtil.URL_TO_HASH_BUILDER.race(ourDataRace);
            if (race.source === ourDataRace.source && race.hash === raceHash ||
                this._pLoad_pDoHandleExistingRace_isMatch({race: ourDataRace, existingRaceClean: raceNameLower}))
            {
                outIxRace = ix; break;
            }
            const versions = DataUtil.generic.getVersions(ourDataRace);
            for (let j = 0; j < versions.length; ++j) {
                const version = versions[j];
                if (race.source === version.source && race.hash === UrlUtil.URL_TO_HASH_BUILDER.race(version) ||
                    this._pLoad_pDoHandleExistingRace_isMatch({ race: version, existingRaceClean: raceNameLower })) {
                    outIxRace = ix; outIxRaceVersion = j; break topLoop;
                }
            }
        }
        return { ixRace: outIxRace, ixRaceVersion: outIxRaceVersion };
    }
    /**
     * Sets the state of the StatgenUI based on a save file. This should be called just after first render.
     * @param {{race:{race:any, stateInfo:any}}} actor
     */
    setStateFromSaveFile(actor){
        if(!actor || !actor.race){return;}
        const data = actor.race;
        const raceInfo = data.race;
        const { ixRace: ixRace, ixRaceVersion: ixRaceVersion } = this._test_getExistingRaceIndex(raceInfo);
        const isRacePresent = ixRace>=0;
        if(!isRacePresent){
            //throw error
            throw new Error("Could not match cached race to any race in data", data);
            return;
        }
        this._state.race_ixRace = ixRace;
        this._state.race_ixRace_version = ixRaceVersion;

        //Apply state to size component (if it exists)
        if(!!this.compRaceSize && !!data.stateInfo._compRaceSize){
            for(let prop of Object.keys(data.stateInfo._compRaceSize)){
                this.compRaceSize._state[prop] = data.stateInfo._compRaceSize[prop];
            }
        }

        //Apply state info to subcomponents
        for(let subCompName of Object.keys(data.stateInfo.subcomps)){
            if(!this[subCompName]){continue;}
            const subComp = this[subCompName];
            for(let prop of Object.keys(data.stateInfo.subcomps[subCompName])){
                subComp._state[prop] = data.stateInfo.subcomps[subCompName][prop];
            }
        }
    }
    //#endregion
    //#endregion

    /**
     * @returns {{name:string, source:string, srd:boolean, _baseSrd:boolean, _baseName:string, raceName:string, raceSource:string, _isSubRace:boolean,
     * _versionBase_name:string, _versionBase_source:string }}
     */
    getRace_() {
        const curRace = this._data.race[this._state.race_ixRace];
        if (!curRace) { return null; }
        if (this._state.race_ixRace_version == null) { return curRace; }
        const raceVersions = DataUtil.generic.getVersions(curRace);
        return raceVersions[this._state.race_ixRace_version];
    }
    _race_renderRace_stgSize({$stgSize: parentDiv, race: race}) {
        const hkFireSizePulse = () => {
            this._state["pulseSize"] = !this._state["pulseSize"];
        }
        parentDiv.empty();
        if (race && race.size) {
            parentDiv.showVe().append("<hr class=\"hr-2\"><div class=\"bold mb-2\">Size</div>");
            this._compRaceSize = new Charactermancer_Race_SizeSelect({sizes: race.size});
            this._compRaceSize._addHookBase("size", hkFireSizePulse);
            this._compRaceSize.render(parentDiv);
        }
        else {
            parentDiv.hideVe();
            this._compRaceSize = null;
        }
    }
    _getDefaultState() { return {race_ixRace: null, race_ixRace_version: null}; }
}

class Charactermancer_Race_Util {
    static async pPostLoadPrereleaseBrew(fileData) {
        const out = {
            race: []
        };

        if (fileData.race)
            out.race.push(...Renderer.race.mergeSubraces(fileData.race, {
                isAddBaseRaces: true
            }));

        if (fileData.subrace) {
            const baseListSite = MiscUtil.copy((await Vetools.pGetRaces({
                isAddBaseRaces: true
            })).race);
            baseListSite.forEach(it=>PageFilterRaces.mutateForFilters(it));

            const baseListBrew = MiscUtil.copy([...fileData.race || []]);
            baseListBrew.forEach(it=>PageFilterRaces.mutateForFilters(it));
            const baseList = [...baseListBrew, ...baseListSite];

            const nxtData = Renderer.race.adoptSubraces(baseList, fileData.subrace);
            const mergedNxtData = Renderer.race.mergeSubraces(nxtData);

            out.race.push(...mergedNxtData);
        }

        return out;
    }
}

class Charactermancer_Race_SizeSelect extends BaseComponent {
    static async pGetUserInput({sizes}) {
        if (!sizes || !sizes.length)
            return {
                isFormComplete: true,
                data: Parser.SZ_MEDIUM
            };
        const comp = new this({
            sizes
        });
        if (comp.isNoChoice())
            return comp.pGetFormData();
        return UtilApplications.pGetImportCompApplicationFormData({
            comp,
            isAutoResize: true
        });
    }

    constructor(opts) {
        opts = opts || {};
        super();

        this._sizes = opts.sizes || [Parser.SZ_MEDIUM];
    }

    get modalTitle() {
        return `Choose Size`;
    }

    render($wrp) {
        if (this._sizes.length === 1) {
            $wrp.append(`<div>${Parser.sizeAbvToFull(this._sizes[0])}</div>`);
            return;
        }

        ComponentUiUtil.$getSelEnum(this, "size", {
            values: this._sizes,
            isAllowNull: true,
            fnDisplay: Parser.sizeAbvToFull,
        }, ).appendTo($wrp);
    }

    isNoChoice() {
        return this._sizes.length <= 1;
    }

    pGetFormData() {
        return {
            isFormComplete: this._state.size != null,
            data: this._sizes.length === 1 ? this._sizes[0] : this._state.size,
        };
    }
}
//#endregion

//#region Charactermancer Background
class ActorCharactermancerBackground extends ActorCharactermancerBaseComponent {
    constructor(parentInfo) {
        parentInfo = parentInfo || {};
        super();
        this._actor = parentInfo.actor;
        this._data = parentInfo.data;
        this._parent = parentInfo.parent;
        this._tabBackground = parentInfo.tabBackground;
        this._modalFilterBackgrounds = new ModalFilterBackgroundsFvtt({
            'namespace': "ActorCharactermancer.backgrounds",
            'isRadio': true,
            'allData': this._data.background
        });
        this._metaCompBackgroundFeatures = null;
        this._compBackgroundSkillProficiencies = null;
        this._compBackgroundLanguageProficiencies = null;
        this._compBackgroundToolProficiencies = null;
        this._compBackgroundLanguageToolProficiencies = null;
        this._compBackgroundCharacteristics = null;
        this._compBackgroundExpertise = null;
        this._compBackgroundWeaponProficiencies = null;
        this._compBackgroundArmorProficiencies = null;
        this._compBackgroundDamageImmunity = null;
        this._compBackgroundDamageResistance = null;
        this._compBackgroundDamageVulnerability = null;
        this._compBackgroundConditionImmunity = null;
    }
    render() {
        const parentDiv = this._tabBackground?.["$wrpTab"];
        if (!parentDiv) { return; }
        const { $sel: ele_sel, $btnFilter: btnFilter }
        = Charactermancer_Util.getFilterSearchMeta({
          comp: this,
          prop: 'background_ixBackground',
          data: this._data.background,
          modalFilter: this._modalFilterBackgrounds,
          title: "Background"
        });
        const wrpCustomize0 = this._background_renderBackground_$getWrpCbCustomize(ComponentUiUtil.$getCbBool(this, 'background_isCustomizeSkills'));
        const wrpCustomize1 = this._background_renderBackground_$getWrpCbCustomize(ComponentUiUtil.$getCbBool(this, "background_isCustomizeLanguagesTools"));
        const wrpCustomize2 = this._background_renderBackground_$getWrpCbCustomize(ComponentUiUtil.$getCbBool(this, "background_isCustomizeLanguagesTools"));
        const wrpCustomize3 = this._background_renderBackground_$getWrpCbCustomize(ComponentUiUtil.$getCbBool(this, "background_isCustomizeLanguagesTools"));
        const wrpCustomize4 = this._background_renderBackground_$getWrpCbCustomize(ComponentUiUtil.$getCbBool(this, "background_isCustomizeLanguagesTools"));
        const wrpCustomize5 = [wrpCustomize0, wrpCustomize1, wrpCustomize2, wrpCustomize3, wrpCustomize4];
        const renderShowCustomizingRules = () => this._background_hk_showCustomizingRules({'$stgRulesCustomize': holderRulesCustomize});

        this._addHookBase('background_isCustomizeSkills', renderShowCustomizingRules);
        this._addHookBase("background_isCustomizeLanguagesTools", renderShowCustomizingRules);

        const toggleLangCustomizeLabel = {
            1: $$`<label class="ve-flex-v-center ve-muted mb-1" title="Toggling this off will disable customization for the whole Language &amp; Tool proficiencies section.">${wrpCustomize4}</label>`
        };

        const renderBackground = input => {
            const background = this.getFeatureCustomizedBackground_({'isAllowStub': false});
            this._background_renderBackground_stgSkills({
                '$stgSkills': holderSkills,
                'background': background,
                '$wrpCbIsCustomizeSkills': wrpCustomize0
            });
            this._background_renderBackground_stgLanguages({
                '$stgLanguages': holderLanguages,
                'background': background,
                '$wrpCbIsCustomizeLanguagesTools': wrpCustomize1
            });
            this._background_renderBackground_stgTools({
                '$stgTools': holderTools,
                'background': background,
                '$wrpCbIsCustomizeLanguagesTools': wrpCustomize2
            });
            this._background_renderBackground_stgLanguagesTools({
                '$stgLanguagesTools': holderLanguageTools,
                'background': background,
                '$wrpCbIsCustomizeLanguagesTools': wrpCustomize3,
                '$elesPreFromGroups': toggleLangCustomizeLabel
            });
            this._background_renderBackground_stgCharacteristics({
                '$stgCharacteristics': holderCharacteristics, 'background': background});
            this._background_hk_showCustomizingRules({'$stgRulesCustomize': holderRulesCustomize});
            this._hk_shared_doRenderBackground({'$dispBackground': newCol});
            if (!input) {
                this._state.background_pulseBackground = !this._state.background_pulseBackground;
            }
        };
        this._addHookBase('background_pulseBackground', renderBackground);
  
        const refresh = () => {
            const stateProps = Object.keys(this.__state).filter(prop =>
                prop.startsWith('background_') && prop !== 'background_ixBackground').mergeMap(p => ({[p]: null}));

            this._proxyAssignSimple("state", stateProps);
            const curBackground = this._data.background[this._state.background_ixBackground];

            if (UtilEntityBackground.isCustomBackground(curBackground)) {
                this._proxyAssignSimple('state', {
                    'background_isCustomizeSkills': true,
                    'background_isCustomizeLanguagesTools': true
                });
                wrpCustomize5.forEach(ele => ele.hideVe());
            }
            else {wrpCustomize5.forEach(ele => ele.showVe());}

            this._background_renderBackground_stgFeatures({'$stgFeatures': holderFeatures, 'background': curBackground});
            renderBackground();

            this._shared_renderEntity_stgOtherProficiencies({
                '$stg': holderExpertise,
                'ent': curBackground,
                'propComp': "_compBackgroundExpertise",
                'propProficiencies': 'expertise',
                'title': "Expertise",
                'CompClass': Charactermancer_ExpertiseSelect,
                'fnGetExistingFvtt': Charactermancer_ExpertiseSelect.getExistingFvttFromActor.bind(Charactermancer_ExpertiseSelect)
            });
            this._shared_renderEntity_stgOtherProficiencies({
                '$stg': holderWepProf,
                'ent': curBackground,
                'propComp': "_compBackgroundWeaponProficiencies",
                'propProficiencies': "weaponProficiencies",
                'title': "Weapon Proficiencies",
                'CompClass': Charactermancer_OtherProficiencySelect,
                'propPathActorExistingProficiencies': ["system", 'traits', 'weaponProf'],
                'fnGetMappedProficiencies': Charactermancer_OtherProficiencySelect.getMappedWeaponProficiencies.bind(Charactermancer_OtherProficiencySelect)
            });
            this._shared_renderEntity_stgOtherProficiencies({
                '$stg': holderArmorProf,
                'ent': curBackground,
                'propComp': "_compBackgroundArmorProficiencies",
                'propProficiencies': "armorProficiencies",
                'title': "Armor Proficiencies",
                'CompClass': Charactermancer_OtherProficiencySelect,
                'propPathActorExistingProficiencies': ['system', 'traits', "armorProf"],
                'fnGetMappedProficiencies': Charactermancer_OtherProficiencySelect.getMappedArmorProficiencies.bind(Charactermancer_OtherProficiencySelect)
            });
            this._shared_renderEntity_stgDiDrDvCi({
                '$stg': holderDamImm,
                'ent': curBackground,
                'propComp': "_compBackgroundDamageImmunity",
                'CompClass': Charactermancer_DamageImmunitySelect,
                'title': "Damage Immunity",
                'propRaceData': "immune",
                'propTraits': 'di'
            });
            this._shared_renderEntity_stgDiDrDvCi({
                '$stg': holderDamRes,
                'ent': curBackground,
                'propComp': "_compBackgroundDamageResistance",
                'CompClass': Charactermancer_DamageResistanceSelect,
                'title': "Damage Resistance",
                'propRaceData': "resist",
                'propTraits': 'dr'
            });
            this._shared_renderEntity_stgDiDrDvCi({
                '$stg': holderDamVul,
                'ent': curBackground,
                'propComp': "_compBackgroundDamageVulnerability",
                'CompClass': Charactermancer_DamageVulnerabilitySelect,
                'title': "Damage Vulnerability",
                'propRaceData': "vulnerable",
                'propTraits': 'dv'
            });
            this._shared_renderEntity_stgDiDrDvCi({
                '$stg': holderConImm,
                'ent': curBackground,
                'propComp': "_compBackgroundConditionImmunity",
                'CompClass': Charactermancer_ConditionImmunitySelect,
                'title': "Condition Immunity",
                'propRaceData': "conditionImmune",
                'propTraits': 'ci'
            });
        };

        this._addHookBase("background_ixBackground", refresh);

        const holderFeatures = $$`<div class="ve-flex-col"></div>`.hideVe();
        const holderSkills = $$`<div class="ve-flex-col"></div>`.hideVe();
        const holderLanguages = $$`<div class="ve-flex-col"></div>`.hideVe();
        const holderTools = $$`<div class="ve-flex-col"></div>`.hideVe();
        const holderLanguageTools = $$`<div class="ve-flex-col"></div>`.hideVe();
        const holderWepProf = $$`<div class="ve-flex-col"></div>`.hideVe();
        const holderArmorProf = $$`<div class="ve-flex-col"></div>`.hideVe();
        const holderExpertise = $$`<div class="ve-flex-col"></div>`.hideVe();
        const holderDamImm = $$`<div class="ve-flex-col"></div>`.hideVe();
        const holderDamRes = $$`<div class="ve-flex-col"></div>`.hideVe();
        const holderDamVul = $$`<div class="ve-flex-col"></div>`.hideVe();
        const holderConImm = $$`<div class="ve-flex-col"></div>`.hideVe();
        const holderRulesCustomize = $$`<div class="ve-flex-col"></div>`.hideVe();
        const holderCharacteristics = $$`<div class="ve-flex-col"></div>`.hideVe();

        const renderCustomizeSkills = () => {
            const background = this._data.background[this._state.background_ixBackground];
            this._background_renderBackground_stgSkills({
                $stgSkills: holderSkills,
                background: background,
                $wrpCbIsCustomizeSkills: wrpCustomize0
            });
        };

        this._addHookBase("background_isCustomizeSkills", renderCustomizeSkills);

        const renderCustomizeLanguagesTools = () => {
            const background = this._data.background[this._state.background_ixBackground];
            this._background_renderBackground_stgLanguages({
                '$stgLanguages': holderLanguages,
                'background': background,
                '$wrpCbIsCustomizeLanguagesTools': wrpCustomize1
            });
            this._background_renderBackground_stgTools({
                '$stgTools': holderTools,
                'background': background,
                '$wrpCbIsCustomizeLanguagesTools': wrpCustomize2
            });
            this._background_renderBackground_stgLanguagesTools({
                '$stgLanguagesTools': holderLanguageTools,
                'background': background,
                '$wrpCbIsCustomizeLanguagesTools': wrpCustomize3,
                '$elesPreFromGroups': toggleLangCustomizeLabel
            });
        };

        this._addHookBase('background_isCustomizeLanguagesTools', renderCustomizeLanguagesTools);
        const newCol = $$`<div class="ve-flex-col w-100"></div>`;

        $$`<div class="ve-flex w-100 h-100">
        <div class="ve-flex-col w-100 h-100 px-1 pt-1 overflow-y-auto ve-grow veapp__bg-foundry">
            <div class="bold mb-2">Select a Background</div>
            <div class="ve-flex-v-center btn-group w-100">${btnFilter}${ele_sel}</div>
            ${holderFeatures}
            ${holderSkills}
            ${holderLanguages}
            ${holderTools}
            ${holderLanguageTools}
            ${holderWepProf}
            ${holderArmorProf}
            ${holderExpertise}
            ${holderDamImm}
            ${holderDamRes}
            ${holderDamVul}
            ${holderConImm}
            ${holderCharacteristics}
        </div>

        <div class="vr-1"></div>

        <div class="ve-flex-col w-100 h-100 px-1 overflow-y-auto ve-grow veapp__bg-foundry">
            ${holderRulesCustomize}
            ${newCol}
        </div>
        </div>`.appendTo(parentDiv);
    }

    /**
     * Sets the state of the component and subcomponents based on a save file. This should be called just after first render.
     * @param {{background:{name:string, source:string, isFullyCustom:boolean, stateSkillProficiencies:any, stateLanguageToolProficiencies:any,
     * stateCharacteristics:any, isCustomizeSkills:boolean, isCustomizeLanguagesTools:boolean}} actor
     */
    setStateFromSaveFile(actor){
        const data = actor.background;
        if(!data || !data.name || !data.source){return;}

        const printToState = (input, state) => {
            for(let prop of Object.keys(input)){
                let val = input[prop];
                state[prop] = val;
            }
        }

        //Go through our data and try to match to the background
        const matches = this._data.background.filter((b, ix) => {if(b.name == data.name && b.source == data.source){
            return {ix:ix, match:b};
        }
        else{return null;}});
        if(matches.length > 1){}
        else if(matches.length < 1){
        }
        else{
            //Get the index of the match
            const ixOf = this._data.background.indexOf(matches[0]);
            //Set it to state
            this._state.background_ixBackground = ixOf;
            //Then set other values
            if(data.stateFeatures){
                printToState(data.stateFeatures, this.compBackgroundFeatures._state);
            }
            if(data.isCustomizeSkills){this._state.background_isCustomizeSkills = true;}
            if(data.isCustomizeLanguagesTools){this._state.background_isCustomizeLanguagesTools = true;}
            if(data.stateSkillProficiencies){
                printToState(data.stateSkillProficiencies, this.compBackgroundSkillProficiencies._state);
            }
            if(data.stateLanguageToolProficiencies){
                printToState(data.stateLanguageToolProficiencies, this.compBackgroundLanguageToolProficiencies._state);
            }
            if(data.stateToolProficiencies){
                printToState(data.stateToolProficiencies, this.compBackgroundToolProficiencies._state);
            }
            if(data.stateLanguageProficiencies){
                printToState(data.stateLanguageProficiencies, this.compBackgroundLanguageProficiencies._state);
            }
            if(data.stateArmorProficiencies){
                printToState(data.stateArmorProficiencies, this.compBackgroundArmorProficiencies._state);
            }
            if(data.stateWeaponProficiencies){
                printToState(data.stateWeaponProficiencies, this.compBackgroundWeaponProficiencies._state);
            }
            if(data.stateExpertises){
                printToState(data.stateExpertises, this.compBackgroundExpertise._state);
            }
            if(data.stateImmunity){
                printToState(data.stateImmunity, this.compBackgroundDamageImmunity._state);
            }
            if(data.stateResistance){
                printToState(data.stateResistance, this.compBackgroundDamageResistance._state);
            }
            if(data.stateVulnerability){
                printToState(data.stateVulnerability, this.compBackgroundDamageVulnerability._state);
            }
            if(data.stateConditionImmunities){
                printToState(data.stateConditionImmunities, this.compBackgroundConditionImmunity._state);
            }
            printToState(data.stateCharacteristics, this.compBackgroundCharacteristics._state);
        }
    }

    get modalFilterBackgrounds() {
      return this._modalFilterBackgrounds;
    }
    get compBackgroundFeatures() {
      return this._metaCompBackgroundFeatures?.comp;
    }
    get compBackgroundSkillProficiencies() {
      return this._compBackgroundSkillProficiencies;
    }
    get compBackgroundLanguageProficiencies() {
      return this._compBackgroundLanguageProficiencies;
    }
    get compBackgroundToolProficiencies() {
      return this._compBackgroundToolProficiencies;
    }
    get compBackgroundLanguageToolProficiencies() {
      return this._compBackgroundLanguageToolProficiencies;
    }
    get compBackgroundCharacteristics() {
      return this._compBackgroundCharacteristics;
    }
    get compBackgroundExpertise() {
      return this._compBackgroundExpertise;
    }
    get compBackgroundWeaponProficiencies() {
      return this._compBackgroundWeaponProficiencies;
    }
    get compBackgroundArmorProficiencies() {
      return this._compBackgroundArmorProficiencies;
    }
    get compBackgroundDamageImmunity() {
      return this._compBackgroundDamageImmunity;
    }
    get compBackgroundDamageResistance() {
      return this._compBackgroundDamageResistance;
    }
    get compBackgroundDamageVulnerability() {
      return this._compBackgroundDamageVulnerability;
    }
    get compBackgroundConditionImmunity() {
      return this._compBackgroundConditionImmunity;
    }
    get isCustomizeLanguagesTools() {
      return this._state.background_isCustomizeLanguagesTools;
    }
    async pLoad() {
      await this._modalFilterBackgrounds.pPreloadHidden();
    }
    getFeatureCustomizedBackground_({
      ix: ix,
      isAllowStub = true
    } = {}) {
      if (ix != null) {
        if (~ix) { return this._data.background[ix]; }
        if (!isAllowStub) { return null; }
        return DataConverterBackground.getBackgroundStub();
      }
      const bk = this._data.background[this._state.background_ixBackground];
      if (!bk) {
        return isAllowStub ? DataConverterBackground.getBackgroundStub() : null;
      }
      const bkCopy = MiscUtil.copy(bk);
      if (!this._metaCompBackgroundFeatures?.comp) { return bkCopy; }
      const form = this._metaCompBackgroundFeatures.comp.getFormData();
      return form.data?.background;
    }
    getBackground_() {
      return this._data.background[this._state.background_ixBackground];
    }
    
    _background_renderBackground_$getWrpCbCustomize(content) {
      return $$`<label class="ve-flex-v-center ml-auto"><span class="mr-1">Customize</span>${content}</label>`;
    }
    _background_renderBackground_stgFeatures({
      $stgFeatures: parentDiv,
      background: background
    }) {
      if (this._state.background_ixBackground === this._metaCompBackgroundFeatures?.["ixBackground"]) {return;}
      parentDiv.empty();
      if (background) {
        parentDiv.showVe().append("<hr class=\"hr-2\"><div class=\"bold mb-2\">Features</div>");
        const component = new Charactermancer_Background_Features({
          'background': background,
          'modalFilter': this._modalFilterBackgrounds
        });
        this._metaCompBackgroundFeatures = {
          comp: component, ixBackground: this._state.background_ixBackground
        };
        component.render(parentDiv);
        component.addHookPulseFeatures(() => {
          this._state.background_pulseBackground = !this._state.background_pulseBackground;
        });
      }
      else { parentDiv.hideVe(); this._metaCompBackgroundFeatures = null; }
    }
    _background_renderBackground_stgSkills({
        $stgSkills: parentDiv,
        background: background,
        $wrpCbIsCustomizeSkills: wrapperCheckboxIsCustomizeSkills
    }) {
      wrapperCheckboxIsCustomizeSkills.detach();
      parentDiv.empty();
      this._parent.featureSourceTracker_.unregister(this._compBackgroundSkillProficiencies);
      if (background && background.skillProficiencies) {
        $$`<hr class="hr-2">
                  <div class="mb-2 split-v-center">
                      <div class="bold">Skill Proficiencies</div>
                      ${wrapperCheckboxIsCustomizeSkills}
                  </div>`.appendTo(parentDiv.showVe());

        //TEMPFIX
        //const existingFvtt = {'skillProficiencies': MiscUtil.get(this._actor, "_source", 'system', 'skills') };
        this._compBackgroundSkillProficiencies = new Charactermancer_OtherProficiencySelect({
          'featureSourceTracker': this._parent.featureSourceTracker_,
          //TEMPFIX 'existing': Charactermancer_OtherProficiencySelect.getExisting(existingFvtt),
          //TEMPFIX 'existingFvtt': existingFvtt,
          'available': Charactermancer_OtherProficiencySelect.getMappedSkillProficiencies(this._state.background_isCustomizeSkills ?
             UtilActors.BG_SKILL_PROFS_CUSTOMIZE : background.skillProficiencies)
        });
        this._compBackgroundSkillProficiencies.render(parentDiv);
      }
      else { parentDiv.hideVe(); this._compBackgroundSkillProficiencies = null; }
    }
    _background_renderBackground_stgLanguages({
      $stgLanguages: parentDiv,
      background: background,
      $wrpCbIsCustomizeLanguagesTools: wrapperCheckboxIsCustomizeLanguagesTools
    }) {
      wrapperCheckboxIsCustomizeLanguagesTools.detach();
      parentDiv.empty();
      this._parent.featureSourceTracker_.unregister(this._compBackgroundLanguageProficiencies);
      if (background && background.languageProficiencies && !this._state.background_isCustomizeLanguagesTools) {
        $$`<hr class="hr-2">
                  <div class="mb-2 split-v-center">
                      <div class="bold">Language Proficiencies</div>
                      ${wrapperCheckboxIsCustomizeLanguagesTools}
                  </div>`.appendTo(parentDiv.showVe());
        //TEMPFIX const existingFvtt = {'languageProficiencies': MiscUtil.get(this._actor, '_source', 'system', "traits", "languages")};
        this._compBackgroundLanguageProficiencies = new Charactermancer_OtherProficiencySelect({
          'featureSourceTracker': this._parent.featureSourceTracker_,
          //TEMPFIX 'existing': Charactermancer_OtherProficiencySelect.getExisting(existingFvtt),
          //TEMPFIX 'existingFvtt': existingFvtt,
          'available': Charactermancer_OtherProficiencySelect.getMappedLanguageProficiencies(background.languageProficiencies)
        });
        this._compBackgroundLanguageProficiencies.render(parentDiv);
      }
      else { parentDiv.hideVe(); this._compBackgroundLanguageProficiencies = null; }
    }
    _background_renderBackground_stgTools({
      $stgTools: parentDiv,
      background: background,
      $wrpCbIsCustomizeLanguagesTools: wrapperCheckboxIsCustomizeLanguagesTools
    }) {
      wrapperCheckboxIsCustomizeLanguagesTools.detach();
      parentDiv.empty();
      this._parent.featureSourceTracker_.unregister(this._compBackgroundToolProficiencies);
      if (background && background.toolProficiencies && !this._state.background_isCustomizeLanguagesTools) {
        $$`<hr class="hr-2">
                  <div class="mb-2 split-v-center">
                      <div class="bold">Tool Proficiencies</div>
                      ${wrapperCheckboxIsCustomizeLanguagesTools}
                  </div>`.appendTo(parentDiv.showVe());
        const existingFvtt = {'toolProficiencies': MiscUtil.get(this._actor, '_source', "system", 'tools')};
        this._compBackgroundToolProficiencies = new Charactermancer_OtherProficiencySelect({
          'featureSourceTracker': this._parent.featureSourceTracker_,
          //TEMPFIX 'existing': Charactermancer_OtherProficiencySelect.getExisting(existingFvtt),
          //TEMPFIX 'existingFvtt': existingFvtt,
          'available': Charactermancer_OtherProficiencySelect.getMappedToolProficiencies(background.toolProficiencies)
        });
        this._compBackgroundToolProficiencies.render(parentDiv);
      }
      else {  parentDiv.hideVe(); this._compBackgroundToolProficiencies = null;}
    }
    _background_renderBackground_stgLanguagesTools({
      $stgLanguagesTools: parentDiv,
      background: background,
      $wrpCbIsCustomizeLanguagesTools: wrapperCheckboxIsCustomizeLanguagesTools,
      $elesPreFromGroups: elesPreFromGroups
    }) {
      wrapperCheckboxIsCustomizeLanguagesTools.detach();
      Object.values(elesPreFromGroups).forEach(e => e.detach());
      parentDiv.empty();
      this._parent.featureSourceTracker_.unregister(this._compBackgroundLanguageToolProficiencies);
      if (background && (background.skillProficiencies || background.toolProficiencies) && this._state.background_isCustomizeLanguagesTools) {
        $$`<hr class="hr-2">
                  <div class="mb-2 split-v-center">
                      <div class="bold">Language &amp; Tool Proficiencies</div>
                      ${wrapperCheckboxIsCustomizeLanguagesTools}
                  </div>`.appendTo(parentDiv.showVe());
        //TEMPFIX
        /* const existingFvtt = {
          'languageProficiencies': MiscUtil.get(this._actor, "_source", 'system', "traits", "languages"),
          'toolProficiencies': MiscUtil.get(this._actor, "_source", 'system', "tools")
        }; */
        this._compBackgroundLanguageToolProficiencies = new Charactermancer_OtherProficiencySelect({
          'featureSourceTracker': this._parent.featureSourceTracker_,
          //TEMPFIX 'existing': Charactermancer_OtherProficiencySelect.getExisting(existingFvtt),
          //TEMPFIX 'existingFvtt': existingFvtt,
          'available': MiscUtil.copy(UtilActors.LANG_TOOL_PROFS_CUSTOMIZE),
          '$elesPreFromGroups': elesPreFromGroups
        });
        this._compBackgroundLanguageToolProficiencies.render(parentDiv);
      }
      else { parentDiv.hideVe(); this._compBackgroundLanguageToolProficiencies = null; }
    }
    _background_hk_showCustomizingRules({
      $stgRulesCustomize: rulesCustomizeElement
    }) {
      const bk = this._data.background[this._state.background_ixBackground];
      rulesCustomizeElement.empty();
      if (bk && (this._state.background_isCustomizeSkills ||
        this._state.background_isCustomizeLanguagesTools ||
        this._metaCompBackgroundFeatures?.["comp"] &&
        this._metaCompBackgroundFeatures.comp?.["mode"] !== Charactermancer_Background_Features._MODE_DEFAULT)) {
        $$(rulesCustomizeElement.showVe())`
                  <div class="w-100">${Renderer.get().setFirstSection(true).render(ActorCharactermancerBackground._ENTRY_CUSTOMIZING, -1)}</div>
                  <hr class="hr-3 hr--heavy">`;
      }
      else { rulesCustomizeElement.hideVe(); }
    }
    _background_renderBackground_stgCharacteristics({
      $stgCharacteristics: parentDiv,
      background: background
    }) {
      parentDiv.empty();
      if (background) {
        const wrpHeaderControls = $("<div class=\"ve-flex-v-center\"></div>");
        $$`<hr class="hr-2">
                  <div class="split-v-center mb-2">
                      <div class="bold">Characteristics</div>
                      ${wrpHeaderControls}
                  </div>`.appendTo(parentDiv.showVe());
        this._compBackgroundCharacteristics = new Charactermancer_Background_Characteristics({
          'entries': background.entries,
          '$wrpHeaderControls': wrpHeaderControls
        });
        this._compBackgroundCharacteristics.render(parentDiv);
      }
      else { parentDiv.hideVe(); this._compBackgroundCharacteristics = null; }
    }
    _getRenderableBackground() {
      const bk = this._data.background[this._state.background_ixBackground];
      const background = MiscUtil.copy(bk);
      const walker = MiscUtil.getWalker({
        'keyBlocklist': MiscUtil.GENERIC_WALKER_ENTRIES_KEY_BLOCKLIST,
        'isAllowDeleteArrays': true,
        'isAllowDeleteObjects': true
      });
      background.entries = walker.walk(background.entries || [], {
        'array': ar => {
          ar = ar.filter(entry => entry != null && !entry?.["data"]?.["isFeature"]);
          if (!ar.length) {
            return undefined;
          }
          return ar;
        },
        'object': ar => {
          if (ar.type === "list") {
            ar.items = (ar.items || []).filter(it => {
              const nameLower = (it.name || '').trim().toLowerCase();
              return !(it.type === "item" && (/^skill/.test(nameLower) || /^language/.test(nameLower) || /^tool/.test(nameLower)));
            });
            if (!ar.items.length) {
              return undefined;
            }
          }
          return ar;
        }
      });
      return background;
    }
    _hk_shared_doRenderBackground({
      $dispBackground: parentDiv
    }) {
      const background = this._data.background[this._state.background_ixBackground];
      parentDiv.empty();
      if (background) {
        parentDiv.append(Renderer.hover.$getHoverContent_stats(UrlUtil.PG_BACKGROUNDS, this._getRenderableBackground()));
      }
    }
    _getDefaultState() {
      return {
        'background_ixBackground': null,
        'background_isCustomizeSkills': false,
        'background_isCustomizeLanguagesTools': false,
        'background_pulseBackground': false
      };
    }
}
ActorCharactermancerBackground._ENTRY_CUSTOMIZING = {
'type': 'entries',
'name': "Customizing a Background",
'page': 125,
'source': Parser.SRC_PHB,
'entries': ["You might want to tweak some of the features of a background so it better fits your character or the campaign setting. To customize a background, you can replace one feature with any other one, choose any two skills, and choose a total of two tool proficiencies or languages from the sample backgrounds. [...] Finally, choose two personality traits, one ideal, one bond, and one flaw.", "If you can't find a feature that matches your desired background, work with your DM to create one."]
};

class Charactermancer_Background_Characteristics extends BaseComponent {
    static async pGetUserInput({entries}={}) {
        if (!entries || !entries.length)
            return {
                isFormComplete: true,
                data: {}
            };

        const comp = new this({
            entries
        });
        return UtilApplications.pGetImportCompApplicationFormData({
            comp,
            width: Util.getMaxWindowWidth(640),
            height: Util.getMaxWindowHeight(),
        });
    }

    static async pFillActorCharacteristicsData(entries, actUpdate, opts) {
        if (!entries || !entries.length)
            return;

        const formData = await this.pGetUserInput({
            entries
        });
        if (!formData)
            return opts.isCancelled = true;
        if (formData === VeCt.SYM_UI_SKIP)
            return;

        this.applyFormDataToActorUpdate(actUpdate, formData);
    }

    static applyFormDataToActorUpdate(actUpdate, formData) {
        MiscUtil.getOrSet(actUpdate, "system", "details", {});
        Charactermancer_Background_Characteristics._PROP_METAS.forEach(propMeta=>{
            const propDetails = Charactermancer_Background_Characteristics._PROP_TO_ACTOR_DETAILS_PROP[propMeta.prop];
            actUpdate.system.details[propDetails] = [(actUpdate.system.details[propDetails] || "").trim(), ...[...new Array(propMeta.count || 1)].map((_,i)=>{
                const {propValue} = this._getProps(propMeta.prop, i);
                if (!formData.data[propValue])
                    return null;
                return formData.data[propValue];
            }
            ), ].filter(Boolean).join("\n\n");
        }
        );
    }

    static applyExistingActorDataToActorUpdate(actUpdate, actor) {
        const tgt = MiscUtil.getOrSet(actUpdate, "system", "details", {});

        Object.keys(Charactermancer_Background_Characteristics._PROP_TO_ACTOR_DETAILS_PROP).forEach(propDetails=>{
            tgt[propDetails] = MiscUtil.get(actor, "system", "details", propDetails);
        }
        );
    }

    constructor(opts) {
        opts = opts || {};
        super();
        this._tables = Charactermancer_Background_Characteristics._getCharacteristicTables(opts.entries);
        this._$wrpHeaderControls = opts.$wrpHeaderControls;

        Object.assign(this.__state, Charactermancer_Background_Characteristics._PROP_METAS.mergeMap(propMeta=>({
            [Charactermancer_Background_Characteristics._getProps(propMeta.prop).propMode]: this._tables[propMeta.prop] != null ? "standard" : "custom"
        })), );
    }

    static _getProps(prop, ix) {
        return {
            propValue: `${prop}_${ix}_value`,
            propMode: `${prop}_mode`,
        };
    }

    static _getCpyTableCell(tbl, ixRow) {
        const cell = tbl.rows[ixRow]?.[1];
        if (!cell) {
            ui.notifications.error(`No cell found for row ${ixRow}!`);
            return null;
        }
        return Renderer.stripTags(MiscUtil.copy(cell));
    }

    get modalTitle() {
        return `Characteristics`;
    }

    render($wrp) {
        const $wrpsProp = Charactermancer_Background_Characteristics._PROP_METAS.map((propMeta,ixPt)=>{
            const count = propMeta.count || 1;
            const {propMode} = this.constructor._getProps(propMeta.prop);

            let $stgToggleMode;
            let $stgStandard;
            if (this._tables[propMeta.prop]) {
                const $btnToggleMode = $(`<button class="btn btn-default btn-xs" title="Show/Hide Table">View Table</button>`)
                .click(()=>this._state[propMode] = this._state[propMode] === "custom" ? "standard" : "custom");

                $stgToggleMode = $$`<div class="ve-flex-v-center">
					${$btnToggleMode}
				</div>`;

                const tbl = this._tables[propMeta.prop];

                const $rendered = Vetools.withCustomDiceRenderingPatch(()=>{ //fn
                    const $rendered = $(`${Renderer.get().render(tbl)}`);

                    $rendered.find(`[data-plut-temp-dice]`).each((i,e)=>{
                        const $e = $(e);

                        const $btnsRoller = [...new Array(count)].map((_,i)=>{
                            return $(`<button class="btn btn-xs btn-default">Roll${count > 1 ? ` ${Parser.getOrdinalForm(i + 1)}` : ""}</button>`).click(async()=>{
                                const {propValue} = this.constructor._getProps(propMeta.prop, i);
                                const headerRowMetas = Renderer.table.getHeaderRowMetas(tbl);

                                let roll;
                                try {
                                    roll = new Roll(Renderer.stripTags(headerRowMetas.last()[0]));
                                    await roll.evaluate({async: true});
                                    roll.toMessage({sound: null});
                                }
                                catch (e) {return ui.notifications.error(`Failed to roll dice! ${VeCt.STR_SEE_CONSOLE}`);}

                                const cell = tbl.rows[roll.total - 1]?.[1];
                                if (!cell){return ui.notifications.error(`No result found for roll of ${roll.total}!`);}

                                this._state[propValue] = Renderer.stripTags(MiscUtil.copy(cell));
                            });
                        });

                        const $wrpBtnsRoller = $$`<div class="ve-flex-vh-center btn-group">${$btnsRoller}</div>`;

                        $e.replaceWith($wrpBtnsRoller);
                    });

                    $rendered.find(`[data-roll-min]`).each((i,e)=>{
                        const $e = $(e);
                        const html = $e.html();
                        $(`<div class="render-roller">${html}</div>`).click(evt=>{
                            const {propValue} = this.constructor._getProps(propMeta.prop, evt.ctrlKey ? 1 : 0);
                            this._state[propValue] = this.constructor._getCpyTableCell(tbl, i);
                        }
                        ).title(count > 1 ? `Left-click to set the first field; CTRL-click to set the second field.` : null).appendTo($e.empty());
                    });
                    return $rendered;
                },
                ()=>{ return `<span data-plut-temp-dice="true"></span>`; }, //fnRender
                );

                $stgStandard = $$`<div class="ve-flex-col w-100 ve-small">${$rendered}</div>`;

                const hkMode = ()=>{
                    $btnToggleMode.toggleClass("active", this._state[propMode] === "standard");
                    $stgStandard.toggleVe(this._state[propMode] === "standard");
                };
                this._addHookBase(propMode, hkMode);
                hkMode();
            }

            const $iptsText = [...new Array(count)].map((_,i)=>ComponentUiUtil.$getIptEntries(this, this.constructor._getProps(propMeta.prop, i).propValue).addClass("resize-vertical"));

            if (count !== 1) {
                const iptsText = $iptsText.map(it=>it[0]);
                const resizeObserver = new ResizeObserver(entries=>{
                    if (entries.length !== 1)
                        return;
                    const eleResized = entries[0].target;
                    iptsText.filter(ipt=>ipt !== eleResized).forEach(ipt=>ipt.style.height = eleResized.style.height);
                });
                iptsText.forEach(ipt=>resizeObserver.observe(ipt));
            }

            return $$`<div class="ve-flex-col ${ixPt < Charactermancer_Background_Characteristics._PROP_METAS.length - 1 ? `mb-2` : ""}">
				<div class="split-v-center mb-1">
					<div>${Charactermancer_Background_Characteristics._PROP_TO_FULL[propMeta.prop]}:</div>
					${$stgToggleMode}
				</div>

				${$stgStandard}

				<div class="ve-flex">${$iptsText}</div>
			</div>`;
        });

        const hasAnyTable = !!Object.keys(this._tables).length;
        let $btnToggleAllTables;
        if (hasAnyTable) {
            $btnToggleAllTables = $(`<button class="btn btn-default btn-xs">Hide Tables</button>`).click(()=>{
                const isDoHide = $btnToggleAllTables.text() === "Hide Tables";

                this._proxyAssignSimple("state", Charactermancer_Background_Characteristics._PROP_METAS.mergeMap(propMeta=>({
                    [Charactermancer_Background_Characteristics._getProps(propMeta.prop).propMode]: this._tables[propMeta.prop] != null && !isDoHide ? "standard" : "custom"
                })), );

                $btnToggleAllTables.text(isDoHide ? "Show Tables" : "Hide Tables");
            });

            const hkAllHidden = ()=>{
                const allModes = Charactermancer_Background_Characteristics._PROP_METAS.filter(propMeta=>this._tables[propMeta.prop]).map(propMeta=>this._state[Charactermancer_Background_Characteristics._getProps(propMeta.prop).propMode] === "custom");

                if (allModes.every(Boolean))
                    $btnToggleAllTables.text("Show Tables");
                else if (allModes.every(it=>!it))
                    $btnToggleAllTables.text("Hide Tables");
            };
            Charactermancer_Background_Characteristics._PROP_METAS.map(propMeta=>Charactermancer_Background_Characteristics._getProps(propMeta.prop).propMode).forEach(propMode=>this._addHookBase(propMode, hkAllHidden));
            hkAllHidden();
        }

        let $stgHeaderControls;
        if (!this._$wrpHeaderControls && hasAnyTable) {
            $stgHeaderControls = $$`<div class="mb-2 ve-flex-h-right">${$btnToggleAllTables}</div>`;
        } else if (this._$wrpHeaderControls && hasAnyTable) {
            this._$wrpHeaderControls.append($btnToggleAllTables);
        }

        $$`
			${$stgHeaderControls}
			${$wrpsProp}
		`.appendTo($wrp);
    }

    pGetFormData() {
        const rendered = Charactermancer_Background_Characteristics._PROP_METAS.map(propMeta=>[...new Array(propMeta.count || 1)].map((_,i)=>this.constructor._getProps(propMeta.prop, i).propValue)).flat().mergeMap(propValue=>({
            [propValue]: UiUtil.getEntriesAsText(this._state[propValue])
        }));

        return {
            isFormComplete: Object.values(rendered).every(txt=>txt.trim()),
            data: rendered,
        };
    }

    _getDefaultState() {
        return Charactermancer_Background_Characteristics._PROP_METAS.map(propMeta=>[...new Array(propMeta.count || 1)].map((_,i)=>this.constructor._getProps(propMeta.prop, i).propValue)).flat().mergeMap(propValue=>({
            [propValue]: ""
        }));
    }

    static _getCharacteristicTables(entries) {
        if (!entries)
            return {};

        const out = {};

        UtilDataConverter.WALKER_READONLY_GENERIC.walk(entries, {
            object: (obj)=>{
                if (obj.type !== "table")
                    return;

                const headerRowMetas = Renderer.table.getHeaderRowMetas(obj);
                if (headerRowMetas?.last()?.length !== 2 || Renderer.table.getAutoConvertedRollMode(obj) !== RollerUtil.ROLL_COL_STANDARD)
                    return;

                const captionFlat = headerRowMetas.last()[1].toLowerCase().replace(/\s+/g, "");
                const mCaption = /^(personalitytrait|ideal|bond|flaw)s?$/i.exec(captionFlat);
                if (!mCaption)
                    return;

                out[captionFlat] = MiscUtil.copy(obj);
            }
            ,
        }, );

        return out;
    }
}
Charactermancer_Background_Characteristics._PROP_METAS = [{
    prop: "personalitytrait",
    count: 2
}, {
    prop: "ideal"
}, {
    prop: "bond"
}, {
    prop: "flaw"
}, ];
Charactermancer_Background_Characteristics._PROP_TO_FULL = {
    "personalitytrait": "Personality Traits",
    "ideal": "Ideal",
    "bond": "Bond",
    "flaw": "Flaw",
};
Charactermancer_Background_Characteristics._PROP_TO_ACTOR_DETAILS_PROP = {
    "personalitytrait": "trait",
    "ideal": "ideal",
    "bond": "bond",
    "flaw": "flaw",
};

class Charactermancer_Background_Features extends BaseComponent {
    

    constructor(opts) {
        opts = opts || {};
        super();

        this._background = opts.background;
        if (UtilEntityBackground.isCustomBackground(opts.background))
            this._state.mode = Charactermancer_Background_Features._MODE_OTHER_BACKGROUND;

        this._modalFilter = opts.modalFilter;
    }
    render($wrp) {
        const modesAvail = [UtilEntityBackground.isCustomBackground(this._background) ? null : Charactermancer_Background_Features._MODE_DEFAULT, Charactermancer_Background_Features._MODE_OTHER_BACKGROUND, Charactermancer_Background_Features._MODE_MANUAL, ].filter(mode=>mode != null);

        const $selMode = ComponentUiUtil.$getSelEnum(this, "mode", {
            values: modesAvail,
            fnDisplay: v=>Charactermancer_Background_Features._MODE_TO_FULL[v],
        }, );
        this._addHookBase("mode", ()=>this._state.pulseFeatures = !this._state.pulseFeatures);

        const $btnAddManual = $(`<button class="btn btn-default btn-xs btn-5et ml-1"><span class="glyphicon glyphicon-plus"></span> Add Feature</button>`).click(()=>{
            const nxt = this._getDefaultState_manualEntryMeta();
            this._state.manualEntryMetas = [...this._state.manualEntryMetas, nxt];
        });
        const hkMode = ()=>$btnAddManual.toggleVe(this._state.mode === Charactermancer_Background_Features._MODE_MANUAL);
        this._addHookBase("mode", hkMode);
        hkMode();

        const $stgDefault = this._render_default();
        const $stgOther = this._render_other();
        const $stgManual = this._render_manual();

        $$`
			<div class="ve-flex-v-center mb-1">
				${$selMode}
				${$btnAddManual}
			</div>
			${$stgDefault}
			${$stgOther}
			${$stgManual}
		`.appendTo($wrp);
    }

    static getFeatureEntries(bg) {
        return (bg?.entries || []).filter(it=>it.data?.isFeature).map(ent=>{
            const cpyEnt = MiscUtil.copy(ent);
            if (cpyEnt.name)
                cpyEnt.name = cpyEnt.name.replace(/^.*?:\s*/, "");
            cpyEnt.source = cpyEnt.source || bg.source;
            cpyEnt.backgroundName = bg.name;
            cpyEnt.backgroundSource = bg.source;
            cpyEnt.srd = !!bg.srd;
            cpyEnt.basicRules = !!bg.basicRules;
            cpyEnt.page = bg.page;
            cpyEnt.__prop = "backgroundFeature";
            return cpyEnt;
        }
        );
    }

    get modalTitle() {
        return `Customize Background: Features`;
    }

    get mode() {
        return this._state.mode;
    }

    get ixBackgroundOther() {
        return this._state.ixBackgroundOther;
    }

    addHookPulseFeatures(hk) {
        this._addHookBase("pulseFeatures", hk);
    }

    _render_default() {
        const $stg = $$`<div class="ve-flex-col mt-1">
			<div class="w-100">${Vetools.withUnpatchedDiceRendering(()=>Renderer.get().render({
            type: "entries",
            entries: this.constructor.getFeatureEntries(this._background)
        }))}</div>
		</div>`;

        const hkMode = ()=>$stg.toggleVe(this._state.mode === Charactermancer_Background_Features._MODE_DEFAULT);
        this._addHookBase("mode", hkMode);
        hkMode();

        return $stg;
    }

    _getOtherBackground() {
        return this._modalFilter.allData[this._state.ixBackgroundOther];
    }

    _render_other() {
        const $btnSelect = $(`<button class="btn btn-default btn-5et w-100 mr-2 mb-2">Choose Background</button>`).click(async()=>{
            const selecteds = await this._modalFilter.pGetUserSelection();
            if (selecteds == null || !selecteds.length){return;}

            this._state.ixBackgroundOther = selecteds[0]?.ix;
        });

        const $dispOther = $(`<div class="w-100"></div>`);
        const hkOther = ()=>{
            const otherBackground = this._getOtherBackground();
            if (!otherBackground) {
                $dispOther.html(`<i class="ve-muted">Select an alternate background, whose feature(s) will replace your current background's feature(s).</i>`);
                return;
            }

            const otherBackgroundFeatureEntries = this.constructor.getFeatureEntries(otherBackground);
            $dispOther.html(Vetools.withUnpatchedDiceRendering(()=>Renderer.get().render(otherBackgroundFeatureEntries?.length ? {
                type: "entries",
                entries: otherBackgroundFeatureEntries
            } : {
                type: "entries",
                entries: ["{@note (No feature(s)).}"]
            })));
            this._state.pulseFeatures = !this._state.pulseFeatures;
        };
        this._addHookBase("ixBackgroundOther", hkOther);
        hkOther();

        const $stg = $$`<div class="ve-flex-col mt-1">
			${$btnSelect}
			${$dispOther}
		</div>`;

        const hkMode = ()=>$stg.toggleVe(this._state.mode === Charactermancer_Background_Features._MODE_OTHER_BACKGROUND);
        this._addHookBase("mode", hkMode);
        hkMode();

        return $stg;
    }

    _render_manual() {
        const $dispNoRows = $(`<div class="italic ve-text-center ve-muted my-1">No features.</div>`);
        const $wrpRows = $(`<div class="ve-flex-col"></div>`);

        const hkManualMetas = ()=>{
            this._renderCollection({
                prop: "manualEntryMetas",
                fnDeleteExisting: ()=>{
                    this._state.pulseFeatures = !this._state.pulseFeatures;
                }
                ,
                fnUpdateExisting: (renderedMeta,featureMeta)=>{
                    renderedMeta.comp._proxyAssignSimple("state", featureMeta.data, true);
                    this._state.pulseFeatures = !this._state.pulseFeatures;
                }
                ,
                fnGetNew: featureMeta=>{
                    const comp = BaseComponent.fromObject(featureMeta.data, "*");
                    comp._addHookAll("state", ()=>{
                        featureMeta.data = comp.toObject("*");
                        this._triggerCollectionUpdate("manualEntryMetas");
                    }
                    );

                    const $iptName = ComponentUiUtil.$getIptStr(comp, "name");

                    const $iptText = ComponentUiUtil.$getIptEntries(comp, "entries");

                    const $btnDelete = $(`<button class="btn btn-5et btn-xs btn-danger ml-1" title="Delete"><span class="glyphicon glyphicon-trash"></span></button>`).click(()=>this._state.manualEntryMetas = this._state.manualEntryMetas.filter(it=>it !== featureMeta));

                    const $wrpRow = $$`<div class="ve-flex-col py-1 w-100 stripe-even">
						<div class="split-v-center mb-1">
							<label class="ve-flex-v-center w-100"><div class="mr-1 text-right pr-1 no-shrink w-50p">Name</div>${$iptName}</label>
							${$btnDelete}
						</div>
						<label class="ve-flex-v-center w-100"><div class="mr-1 text-right pr-1 no-shrink w-50p">Text</div>${$iptText}</label>
					</div>`.appendTo($wrpRows);

                    return {
                        comp,
                        $wrpRow,
                    };
                }
                ,
            });

            $dispNoRows.toggleVe(!this._state.manualEntryMetas?.length);
        }
        ;
        hkManualMetas();
        this._addHookBase("manualEntryMetas", hkManualMetas);

        const $stg = $$`<div class="ve-flex-col">
			<hr class="hr-1">
			${$dispNoRows}
			${$wrpRows}
		</div>`;

        const hkMode = ()=>$stg.toggleVe(this._state.mode === Charactermancer_Background_Features._MODE_MANUAL);
        this._addHookBase("mode", hkMode);
        hkMode();

        return $stg;
    }

    getFormData() {
        let isComplete = true;
        const entries = [];
        const background = MiscUtil.copy(this._background);

        const fromFeature = Object.entries(background.fromFeature || {}).filter(([,v])=>v).map(([k])=>k);

        switch (this._state.mode) {
        case Charactermancer_Background_Features._MODE_DEFAULT:
            {
                entries.push(...this.constructor.getFeatureEntries(this._background));
                break;
            }
        case Charactermancer_Background_Features._MODE_OTHER_BACKGROUND:
            {
                const otherBackground = this._getOtherBackground();

                if (!otherBackground) {
                    isComplete = false;
                    fromFeature.forEach(k=>delete background[k]);
                    break;
                }

                entries.push(...this.constructor.getFeatureEntries(otherBackground));

                this._getFormData_doMergeOtherBackground({
                    background,
                    otherBackground,
                    fromFeature
                });

                break;
            }
        case Charactermancer_Background_Features._MODE_MANUAL:
            {
                const ents = this._state.manualEntryMetas.filter(({data})=>data.entries && data.entries.length).map(({data})=>{
                    data = MiscUtil.copy(data);
                    data.name = data.name || "(Unnamed Feature)";
                    data.type = "entries";
                    return data;
                }
                );

                if (!ents.length)
                    isComplete = false;

                entries.push(...ents);

                fromFeature.forEach(k=>delete background[k]);

                break;
            }
        }

        return {
            isFormComplete: isComplete,
            data: {
                entries,
                isCustomize: this._state.mode !== Charactermancer_Background_Features._MODE_DEFAULT,
                background,
            },
        };
    }

    _getFormData_doMergeOtherBackground({background, otherBackground, fromFeature}) {
        fromFeature.forEach(k=>{
            if (!otherBackground[k])
                return delete background[k];
            background[k] = MiscUtil.copy(otherBackground[k]);
        }
        );

        const fromFeatureOtherBackground = Object.entries(otherBackground.fromFeature || {}).filter(([,v])=>v).map(([k])=>k);
        fromFeatureOtherBackground.forEach(prop=>{
            if (!otherBackground[prop])
                return;
            if (!background[prop]) {
                background[prop] = MiscUtil.copy(otherBackground[prop], {
                    isSafe: true
                });
                return;
            }

            switch (prop) {
            default:
                {
                    const typeA = typeof background[prop];
                    const typeB = typeof otherBackground[prop];

                    if (typeA !== typeB || (typeA === "object" && (Array.isArray(background[prop]) !== Array.isArray(otherBackground[prop])))) {
                        return;
                    }

                    if (typeA !== "object")
                        return;

                    if (Array.isArray(background[prop])) {
                        this._getFormData_doMergeOtherBackground_array({
                            background,
                            otherBackground,
                            prop
                        });
                        return;
                    }

                    this._getFormData_doMergeOtherBackground_object({
                        background,
                        otherBackground,
                        prop
                    });
                }
            }
        }
        );
    }

    _getFormData_doMergeOtherBackground_array({background, otherBackground, prop}) {
        switch (prop) {
        case "additionalSpells":
            {
                if (background[prop].length !== 1 || background[prop].length !== otherBackground[prop].length)
                    return;

                Object.entries(otherBackground[prop][0]).forEach(([addSpellK,addSpellV])=>{
                    if (!["innate", "known", "prepared", "expanded"].includes(addSpellK)) {
                        console.warn(...LGT, `Could not merge additionalSpell property "${addSpellK}"--no merge strategy defined!`);
                        return;
                    }

                    if (!background[prop][0][addSpellK])
                        background[prop][0][addSpellK] = {};

                    Object.entries(addSpellV).forEach(([kLevel,spellList])=>{
                        background[prop][0][addSpellK][kLevel] = background[prop][0][addSpellK][kLevel] || [];
                        background[prop][0][addSpellK][kLevel].push(...spellList);
                    }
                    );
                }
                );

                break;
            }

        case "feats":
            {
                if (background[prop].length !== 1 || background[prop].length !== otherBackground[prop].length)
                    return;

                const out = {};
                Object.entries(background[prop][0]).forEach(([k,v])=>out[k] = (out[k] || 0) + Number(v));
                Object.entries(otherBackground[prop][0]).forEach(([k,v])=>out[k] = (out[k] || 0) + Number(v));
                background[prop][0] = out;

                break;
            }

        default:
            {
                background[prop] = [...background[prop], ...otherBackground[prop]].unique();
            }
        }
    }

    _getFormData_doMergeOtherBackground_object({background, otherBackground, prop}) {
        switch (prop) {
        default:
            Object.assign(background[prop], otherBackground[prop]);
        }
    }

    pGetFormData() {
        return this.getFormData();
    }

    _getDefaultState_manualEntryMeta() {
        return {
            id: CryptUtil.uid(),
            data: {
                name: "",
                entries: [],
            },
        };
    }

    _getDefaultState() {
        return {
            mode: Charactermancer_Background_Features._MODE_DEFAULT,

            ixBackgroundOther: null,

            manualEntryMetas: [this._getDefaultState_manualEntryMeta()],

            pulseFeatures: false,
        };
    }

    static async pGetUserInput({background, modalFilter, ...opts}={}) {
        const comp = new this({
            background,
            modalFilter
        });
        return UtilApplications.pGetImportCompApplicationFormData({
            comp,
            width: Util.getMaxWindowWidth(640),
            height: Util.getMaxWindowHeight(480),
            ...opts,
        });
    }
}
Charactermancer_Background_Features._MODE_DEFAULT = 0;
Charactermancer_Background_Features._MODE_OTHER_BACKGROUND = 1;
Charactermancer_Background_Features._MODE_MANUAL = 2;

Charactermancer_Background_Features._MODE_TO_FULL = {
    [Charactermancer_Background_Features._MODE_DEFAULT]: "Add Features from This Background",
    [Charactermancer_Background_Features._MODE_OTHER_BACKGROUND]: "Customize your Background: Add Feature(s) from Another Background",
    [Charactermancer_Background_Features._MODE_MANUAL]: "Customize your Background: Add Custom Feature(s)",
};

//#endregion

//#region Charactermancer Equipment
class ActorCharactermancerEquipment extends ActorCharactermancerBaseComponent {
    constructor(parentInfo) {
      parentInfo = parentInfo || {};
      super();
      this._actor = parentInfo.actor;
      this._data = parentInfo.data;
      this._parent = parentInfo.parent;
      this._tabEquipment = parentInfo.tabEquipment;
      this._tabShop = parentInfo.tabShop;
      const {
        compCurrency: compCurrency,
        compDefault: compDefault,
        compGold: compGold
      } = Charactermancer_StartingEquipment.getComponents(this._actor, {
        itemDatas: { item: this._data.item },
        fnDoShowShop: () => this._parent.activeTab_ = this._tabShop
      });
      this._compEquipmentCurrency = compCurrency;
      this._compEquipmentStartingDefault = compDefault;
      this._compEquipmentShopGold = compGold;
    }

    async pRenderStarting() {
        const wrpTab = this._tabEquipment?.$wrpTab;
        if (!wrpTab) { return; }

        const redraw = () => {
            const primaryClass = this._parent.compClass.class_getPrimaryClass();
            const customizedBackground = this._parent.compBackground.getFeatureCustomizedBackground_({ isAllowStub: false });
            const startingEquipment = MiscUtil.copy(primaryClass?.startingEquipment || {});
            //Check if we should push more options to choose from by looking at the background
            if ((!primaryClass || primaryClass && !primaryClass.startingEquipment || primaryClass && primaryClass.startingEquipment.additionalFromBackground)
            && customizedBackground?.startingEquipment?.length) {
                startingEquipment.defaultData = startingEquipment.defaultData || [];
                startingEquipment.defaultData.push(...MiscUtil.copy(customizedBackground.startingEquipment));
            }

            //Let our components know what we're working with
            this._compEquipmentCurrency.startingEquipment = startingEquipment;
            this._compEquipmentStartingDefault.equiSpecialSource = customizedBackground?.source || primaryClass?.source || null;
            this._compEquipmentStartingDefault.equiSpecialPage = customizedBackground?.page || primaryClass?.page || null;
        };

        this._parent.compClass.addHookBase('class_pulseChange', redraw);
        this._parent.compBackground.addHookBase("background_ixBackground", redraw);
        redraw();
        await this._compEquipmentStartingDefault.pRender(wrpTab);
    }
    async pRenderShop() {
        const wrpTab = this._tabShop?.$wrpTab;
        if (!wrpTab) { return; }
        await this._compEquipmentShopGold.pRender(wrpTab);
    }

    /**
     * Sets the state of the component based on a save file. This should be called just after first render.
     * @param {{stateDefault:any, cpRolled:number, boughtItems:{uid:string, quantity:number, isIgnoreCost:boolean, value:number}[]}} actor
    */
    setStateFromSaveFile(actor){
        const data = actor.equipment;
        const compDefault = this._compEquipmentStartingDefault;
        const compGold = this._compEquipmentCurrency;
        const compShop = this._compEquipmentShopGold;
        
        const printToState = (input, state) => {
            for(let prop of Object.keys(input)){
                let val = input[prop];
                state[prop] = val;
            }
        }

        //If we rolled gold instead of picking default starting items, no need to paste default starting items state
        if(!data.cpRolled){
            printToState(data.stateDefault, compDefault._state);
        }
        else{
            compGold._state.cpRolled = data.cpRolled;
        }

        for(let it of data.boughtItems){
            let matchedItem = ActorCharactermancerEquipment.findItemByUID(it.uid, compShop.__state.itemDatas.item);
            if(!matchedItem){continue;}
            //Add it to list of bought items (it will auto draw from remaining currency)
            compShop.addBoughtItem(it.uid, {quantity:it.quantity, isIgnoreCost:it.isIgnoreCost});
        }
    }

    get compEquipmentCurrency() {
      return this._compEquipmentCurrency;
    }
    get compEquipmentStartingDefault() {
      return this._compEquipmentStartingDefault;
    }
    get compEquipmentShopGold() {
      return this._compEquipmentShopGold;
    }
   
    isStandardStartingEquipmentActive_() {
      return this._compEquipmentCurrency.isStandardStartingEquipmentActive();
    }

    static findItemByUID(itemUid, itemDatas){
        const matches = itemDatas.filter(it => {
            //Create a uid from the item
            const uid = `${it.name}|${it.source}`.toLowerCase();//UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS]({ name:n, source:src });
            //then try to match it
            return itemUid == uid;
        });
        if(matches.length > 1){throw new Error("Not supposed to return more than one result", itemUid);}
        else if(matches.length < 1){
            console.error("Could not find a match to item", itemUid, "among our loaded items. Did you forget to load a source?");
        }
        return matches[0];
    }
}

//TEMPFIX
class Charactermancer_StartingEquipment // extends Application 
{

    constructor(opts) {
        opts = opts || {};

        const compCurrency = opts.actor ? Charactermancer_StartingEquipment.Currency.fromActor(opts.actor, {
            isStandalone: !!opts.isStandalone
        }) : new Charactermancer_StartingEquipment.Currency({
            isStandalone: !!opts.isStandalone
        });
        const compDefault = new Charactermancer_StartingEquipment.ComponentDefault({
            ...opts,
            compCurrency,
            fnDoShowShop: ()=>{
                this._mode = "gold";
                this._doHandleModeSwitch();
            }
        });
        const compGold = new Charactermancer_StartingEquipment.ComponentGold({
            ...opts,
            compCurrency
        });

        if (opts.startingEquipment)
            compCurrency.startingEquipment = opts.startingEquipment;
        if (opts.equiSpecialSource)
            compDefault.equiSpecialSource = opts.equiSpecialSource;
        if (opts.equiSpecialPage)
            compDefault.equiSpecialPage = opts.equiSpecialPage;

            //TEMPFIX
        /* super({
            title: `${compCurrency.rollableExpressionGold ? `Starting ` : ""}Equipment${opts.appSubTitle ? `\u2014${opts.appSubTitle}` : ""}${opts.actor ? ` (Actor "${opts.actor.name}")` : ""}`,
            template: `${SharedConsts.MODULE_LOCATION}/template/ImportListCharacterEquipment.hbs`,
            width: Util.getMaxWindowWidth(1000),
            height: Util.getMaxWindowHeight(),
            resizable: true,
        });
 */
        this._compCurrency = compCurrency;
        this._compDefault = compDefault;
        this._compGold = compGold;

        this._isStandalone = opts.isStandalone;

        this._cntModesAvailable = Number(this._compDefault.isAvailable) + Number(this._compGold.isAvailable);

        if (this._cntModesAvailable) {
            this._resolve = null;
            this._reject = null;
            this._pUserInput = new Promise((resolve,reject)=>{
                this._resolve = resolve;
                this._reject = reject;
            });
        }

        this._mode = null;
        this._$wrpTabs = null;
        this._$btnShowTabStandard = null;
        this._$btnShowTabGoldAlternative = null;
    }

    static prePreInit() {
        this._preInit_registerKeybinds();
    }

    static _preInit_registerKeybinds() {
        const doKeybindingOpenForCharacter = ()=>{
            const actor = UtilKeybinding.getPlayerActor({
                minRole: Config.get("equipmentShop", "minimumRole")
            });
            if (!actor){return true;}
            this._pOpen({ actor });
            return true;
        };

        const doKeybindingOpenForCurrentSheet = ()=>{
            const meta = UtilKeybinding.getCurrentImportableSheetDocumentMeta({
                isRequireActor: true,
                isRequireOwnership: true,
                minRole: Config.get("equipmentShop", "minimumRole")
            });
            if (!meta?.actor)
                return true;
            this._pOpen({
                ...meta
            });
            return true;
        }
        ;

        game.keybindings.register(SharedConsts.MODULE_ID, "Charactermancer_StartingEquipment__openForCharacter", {
            name: "Open Equipment Shop Targeting Player Character",
            editable: [],
            onDown: ()=>doKeybindingOpenForCharacter(),
        }, );

        game.keybindings.register(SharedConsts.MODULE_ID, "Charactermancer_StartingEquipment__openForCurrentSheet", {
            name: "Open Equipment Shop Targeting Current Sheet",
            editable: [],
            onDown: ()=>doKeybindingOpenForCurrentSheet(),
        }, );
    }

    static init() {
        UtilHooks.on(UtilHooks.HK_CONFIG_UPDATE, async(diff)=>{
            if (!diff)
                return;

            const prev = MiscUtil.get(diff, "previous", "equipmentShop");
            const curr = MiscUtil.get(diff, "current", "equipmentShop");

            if (!prev || !curr)
                return;

            if (CollectionUtil.deepEquals(prev, curr))
                return;

            const toClose = Object.values(ui.windows).filter(it=>it.constructor === Charactermancer_StartingEquipment);
            if (!toClose.length)
                return;

            if (!await (InputUiUtil.pGetUserBoolean({
                title: `Existing Shop Windows`,
                htmlDescription: `You have ${toClose.length === 1 ? `an existing shop window` : `existing shop windows`} open, which will not be affected by your updated Equipment Shop config.<br>Would you like to close ${toClose.length === 1 ? "this window" : "these windows"}?`,
                textYes: "Yes",
                textNo: "No",
            })))
                return;

            toClose.forEach(it=>it.close());
        }
        );
    }

    static async pHandleButtonClick(evt, app) {
        return this._pOpen({
            actor: app.actor
        });
    }

    static async _pOpen({actor}) {
        const instance = new this({
            actor,
            isStandalone: true,
        });

        const formData = await instance.pWaitForUserInput();

        if (!formData)
            return;
        if (formData === VeCt.SYM_UI_SKIP)
            return;
        await this.pImportEquipmentItemEntries(actor, formData);
        await this.pUpdateActorCurrency(actor, formData);
    }

    static async pImportEquipmentItemEntries(actor, formData, {taskRunner=null}={}) {
        if (!formData?.data?.equipmentItemEntries?.length)
            return;
        const {ImportListItem} = await Promise.resolve().then(function() {
            return ImportListItem;
        });
        const importListItem = new ImportListItem({
            actor: actor
        });
        await importListItem.pInit();
        for (const it of formData.data.equipmentItemEntries) {
            if (it.item && it.name == null && it.source == null) {
                await importListItem.pImportEntry(it.item, {
                    taskRunner
                }, {
                    quantity: it.quantity || 1
                }, );
            } else
                await importListItem.pImportEntry(it, {
                    taskRunner
                });
        }
    }

    static async pUpdateActorCurrency(actor, formData) {
        if (!formData?.data?.currency)
            return;

        await UtilDocuments.pUpdateDocument(actor, {
            system: {
                currency: formData.data.currency,
            },
        }, );
    }

    static getComponents(actor, opts) {
        opts = opts || {};

        const compCurrency = actor?.currency ? Charactermancer_StartingEquipment.Currency.fromActor(actor) : new Charactermancer_StartingEquipment.Currency();
        compCurrency.init();

        const compDefault = new Charactermancer_StartingEquipment.ComponentDefault({
            compCurrency, actor, fnDoShowShop: opts.fnDoShowShop
        });
        const compGold = new Charactermancer_StartingEquipment.ComponentGold({
            compCurrency, actor, itemDatas: opts.itemDatas
        });

        return { compCurrency, compDefault, compGold, };
    }

    async _pResolveAndClose(resolveAs) {
        this._resolve(resolveAs);
        await this.close();
    }

    activateListeners($html) {
        if (!this._cntModesAvailable)
            return;
        const activeComps = [this._compDefault, this._compGold].filter(it=>it.isAvailable);

        if (this._cntModesAvailable === 2) {
            this._mode = this._compCurrency.cpRolled ? "gold" : "default";

            this._$wrpTabs = activeComps.map(it=>{
                const $wrpTab = $(`<div class="w-100 h-100 min-h-0 ve-flex-col"></div>`).hideVe();
                this._activateListeners_renderTab($wrpTab, it);
                return $wrpTab;
            }
            );

            this._$btnShowTabStandard = $(`<button class="btn btn-default w-50 btn-5et">${this._compCurrency.rollableExpressionGold ? `Standard Starting Equipment` : `Starting Equipment`}</button>`).click(()=>{
                this._mode = "default";
                this._doHandleModeSwitch();
            }
            );

            this._$btnShowTabGoldAlternative = $(`<button class="btn btn-default w-50 btn-5et">${this._compCurrency.rollableExpressionGold ? `Gold Alternative/Shop` : `Shop`}</button>`).click(()=>{
                this._mode = "gold";
                this._doHandleModeSwitch();
            }
            );

            this._doHandleModeSwitch();

            $$($html)`<div class="ve-flex-col w-100 h-100">
				<div class="ve-flex no-shrink btn-group mb-1">${this._$btnShowTabStandard}${this._$btnShowTabGoldAlternative}</div>
				${this._$wrpTabs[0]}
				${this._$wrpTabs[1]}
			</div>`;

            return;
        }

        this._activateListeners_renderTab($html, activeComps[0]);
    }

    _doHandleModeSwitch() {
        this._$btnShowTabStandard.toggleClass("active", this._mode === "default");
        this._$btnShowTabGoldAlternative.toggleClass("active", this._mode === "gold");
        this._$wrpTabs[0].toggleVe(this._mode === "default");
        this._$wrpTabs[1].toggleVe(this._mode === "gold");
    }

    _activateListeners_renderTab($html, comp) {
        comp.pRender($html).then($wrpTabInner=>{
            const $btnAccept = $(`<button class="btn btn-default btn-5et ${this._isStandalone ? "mr-3" : "mr-2"}">Confirm</button>`).click(async()=>{
                const activeComps = [this._compDefault, this._compGold].filter(it=>it.isAvailable);

                const formDatas = await Promise.all(activeComps.map(comp=>comp.pGetFormData()));

                for (const formData of formDatas) {
                    if (!formData.isFormComplete && !(await InputUiUtil.pGetUserBoolean({
                        title: formData.messageInvalid
                    })))
                        return;
                }

                const formDataCurrency = await this._compCurrency.pGetFormData();

                const combinedFormData = {
                    isFormComplete: formDatas.every(it=>it.isFormComplete),
                    data: {
                        equipmentItemEntries: formDatas.map(it=>it.data?.equipmentItemEntries || []).flat(),
                        currency: formDataCurrency?.data?.currency,
                    },
                };

                await this._pResolveAndClose(combinedFormData);
            }
            );

            const $btnSkip = this._isStandalone ? null : $(`<button class="btn btn-default mr-3">Skip</button>`).click(()=>this._pResolveAndClose(VeCt.SYM_UI_SKIP));

            $wrpTabInner.append(`<hr class=hr-1>`);
            $$`<div class="ve-flex-v-center ve-flex-h-right w-100">${$btnAccept}${$btnSkip}</div>`.appendTo($wrpTabInner);
        }
        );
    }

    async close() {
        await super.close();
        if (this._resolve)
            this._resolve(null);
    }

    async pWaitForUserInput() {
        if (!this._cntModesAvailable)
            return VeCt.SYM_UI_SKIP;

        await this.render(true);
        return this._pUserInput;
    }
}

Charactermancer_StartingEquipment.Currency = class extends BaseComponent {
    static fromActor(actor, {isStandalone=false}={}) {
        const initialCurrency = CurrencySheetAdapter.getActorCurrency({
            actor
        });
        const comp = new this({
            isStandalone
        });
        comp.init();
        comp.setCurrencyFromActor(initialCurrency);
        return comp;
    }

    constructor(opts) {
        super();

        opts = opts || {};

        this._isStandalone = !!opts.isStandalone;
        this._prevActorCurrency = null;
        this.__state.startingEquipment = opts.startingEquipment ? MiscUtil.copy(opts.startingEquipment) : null;
        this.__state.cpRolled = this._getInitialCpRolled();
    }

    init() {
        const hkStartingEquipment = ()=>{
            this._state.cpRolled = this._getInitialCpRolled();
            this._state.rollableExpressionGold = this.constructor._getRollableExpressionGold(this._state.startingEquipment);
        }
        ;
        this._addHookBase("startingEquipment", hkStartingEquipment);
        hkStartingEquipment();
    }

    static _getRollableExpressionGold(startingEquipment) {
        if (!startingEquipment?.goldAlternative)
            return null;
        const m = /{@dice ([^|]+)/.exec(startingEquipment.goldAlternative);
        if (m)
            return m[1].replace(/×/g, "*");
        if (!isNaN(`${startingEquipment.goldAlternative}`.trim()))
            return startingEquipment.goldAlternative.trim();
        return null;
    }

    get startingEquipment() {
        return this._state.startingEquipment;
    }
    set startingEquipment(val) {
        this._state.startingEquipment = val;
    }

    get isStandalone() {
        return this._isStandalone;
    }

    get rollableExpressionGold() {
        return this._state.rollableExpressionGold;
    }

    get cpSpent() {
        return this._state.cpSpent;
    }
    set cpSpent(val) {
        this._state.cpSpent = val;
    }

    get cpRolled() {
        return this._state.cpRolled;
    }
    set cpRolled(val) {
        this._state.cpRolled = val;
    }

    get hasShownGoldWarning() {
        return this._state.hasShownGoldWarning;
    }
    set hasShownGoldWarning(val) {
        this._state.hasShownGoldWarning = val;
    }

    set cpFromDefault(val) {
        this._state.cpFromDefault = val;
    }

    setCurrencyFromActor(startingCurrency) {
        this._prevActorCurrency = MiscUtil.copy(startingCurrency);

        const out = {};
        Parser.COIN_ABVS.forEach(k=>out[k] = startingCurrency[k] || 0);
        this._proxyAssignSimple("state", out);
    }

    _getAvailableCp() {
        return (this._state.cpRolled || 0) + (this._state.cpFromDefault || 0) + CurrencyUtil.getAsCopper({
            cp: this._state.cp,
            sp: this._state.sp,
            gp: this._state.gp,
            ep: this._state.ep,
            pp: this._state.pp
        });
    }

    _getOriginalCurrency() {
        const out = Parser.COIN_ABVS.mergeMap(it=>({
            [it]: 0
        }));
        Object.entries(this._prevActorCurrency || {}).forEach(([coin,amount])=>out[coin] = (out[coin] || 0) + amount);

        const fromRolled = CurrencyUtil.doSimplifyCoins({
            cp: this._state.cpRolled || 0
        });
        Object.entries(fromRolled || {}).forEach(([coin,amount])=>out[coin] = (out[coin] || 0) + amount);

        const fromDefault = CurrencyUtil.doSimplifyCoins({
            cp: this._state.cpFromDefault || 0
        });
        Object.entries(fromDefault || {}).forEach(([coin,amount])=>out[coin] = (out[coin] || 0) + amount);

        return out;
    }

    isStandardStartingEquipmentActive() {
        return Object.keys(this.startingEquipment || {}).length && this.cpRolled == null;
    }

    async pGetFormData() {
        return {
            isFormComplete: true,
            data: {
                currency: CurrencyUtil.doSimplifyCoins({
                    cp: this.getRemainingCp(),
                }, {
                    originalCurrency: this._getOriginalCurrency(),
                    isPopulateAllValues: true,
                    currencyConversionTable: Parser.FULL_CURRENCY_CONVERSION_TABLE,
                }, ),
            },
        };
    }

    getRemainingCp() {
        return this._getAvailableCp() - this._state.cpSpent;
    }

    addHookCurrency(hk) {
        this._addHookAll("state", hk);
    }
    addHookCpRolled(hk) {
        this._addHookBase("cpRolled", hk);
    }
    addHookStartingEquipment(hk) {
        this._addHookBase("startingEquipment", hk);
    }
    addHookRollableExpressionGold(hk) {
        this._addHookBase("rollableExpressionGold", hk);
    }

    removeHookCpRolled(hk) {
        this._removeHookBase("cpRolled", hk);
    }

    _getInitialCpRolled() {
        if (this._isStandalone)
            return null;
        const startingGp = Config.get("equipmentShop", "startingGold");
        return startingGp ? CurrencyUtil.getAsCopper({
            gp: startingGp
        }) : null;
    }

    _getDefaultState() {
        return {
            startingEquipment: null,
            rollableExpressionGold: null,

            ...Parser.COIN_ABVS.mergeMap(it=>({
                [it]: 0
            })),
            cpSpent: 0,
            cpRolled: this._getInitialCpRolled(),
            cpFromDefault: 0,

            hasShownGoldWarning: false,
        };
    }
};

Charactermancer_StartingEquipment.ComponentBase = class extends BaseComponent {
    constructor(opts) {
        super();
        this._compCurrency = opts.compCurrency;
        this._actor = opts.actor;
    }

    static _getHumanReadableCoinage(copper) {
        const asCoins = CurrencyUtil.doSimplifyCoins({
            cp: copper
        });
        return [...Parser.COIN_ABVS].reverse().map(coin=>asCoins[coin] ? `${asCoins[coin].toLocaleString()} ${coin}` : null).filter(Boolean).join(", ") || "0 gp";
    }

    /**
     * Show a popup dialog that warns the user that rolling for gold is an alternative to using starting equipment.
     * If the user has already been shown this warning, it does not appear again
     * @returns {any}
     */
    async _pIsIgnoreGoldWarning() {
        if (!Object.keys(this._compCurrency.startingEquipment || {}).length
        || this._compCurrency.hasShownGoldWarning){return true;}

        const isUseGold = await InputUiUtil.pGetUserBoolean({
            title: `Are you sure?`,
            htmlDescription: `Using gold to buy starting equipment is an alternative to standard starting equipment.<br>Are you sure you want to use gold?`,
            textYes: "Yes",
            textNo: "Cancel",
        });
        if (!isUseGold){return false;}

        this._compCurrency.hasShownGoldWarning = true;
        return true;
    }

    /**
     * Returns a button that handles rolling for starting gold
     * @returns {any}
     */
    _$getBtnRollStartingGold() {
        return $(`<button class="btn btn-default btn-xs btn-5et">Roll Starting Gold</button>`).click(async()=>{
            //Wait for a popup warning to return true. If it returns false, it means the user cancelled
            //if (!(await this._pIsIgnoreGoldWarning())){return;}
            console.error("Roll gold warning not implemented");

            //Expression can be "2d12 * 10"
            const expression = this._compCurrency.rollableExpressionGold;
            //Assume every part after index 0 is a multiplier
            let expressionParts = expression.replace(/\s/g, '').split("*");
            const roll = new Roll(expressionParts[0]);
            await roll.evaluate({async: true});
            let result = roll.total;
            //Apply multipliers
            for(let i = 1; i < expressionParts.length; ++i){
                result *= expressionParts[i];
            }
            //Convert gold pieces to copper pieces
            this._compCurrency.cpRolled = result * 100;

            //Print how much gold we rolled to chat in FoundryVTT
            if(SETTINGS.USE_FVTT){
                const optsToMessage = {sound: null};
                if (this._actor) {
                    optsToMessage.speaker = {actor: this._actor.id};
                    optsToMessage.flavor = `<div>${this._actor.name} rolls starting gold!</div>`;
                }
                roll.toMessage(optsToMessage).then(null);
            }
            else{
            }
        });
    }

    _$getBtnEnterStartingGold() {
        return $(`<button class="btn btn-default btn-xs btn-5et" title="Manually enter a starting gold amount, as an alternate to rolling.">Enter Starting Gold</button>`).click(async()=>{
            if (!(await this._pIsIgnoreGoldWarning()))
                return;

            const opts = {
                min: 0,
                title: "Enter Gold Amount",
                int: true,
            };
            if (this._compCurrency.cpRolled != null)
                opts.default = Math.round(this._compCurrency.cpRolled / 100);

            const amount = await InputUiUtil.pGetUserNumber(opts);
            if (amount == null)
                return;

            this._compCurrency.cpRolled = amount * 100;
        }
        );
    }

    _$getDispRolledGold() {
        const $dispRolled = $(`<div></div>`);

        const hkRolled = ()=>{
            if (this._compCurrency.cpRolled == null && this._compCurrency.rollableExpressionGold != null)
                $dispRolled.html(`<i class="ve-muted">${this._compCurrency.rollableExpressionGold}</i>`);
            else
                $dispRolled.html(this.constructor._getHumanReadableCoinage(this._compCurrency.cpRolled || 0));
        }
        ;
        hkRolled();
        this._compCurrency.addHookRollableExpressionGold(hkRolled);
        this._compCurrency.addHookCpRolled(hkRolled);

        return $dispRolled;
    }

    _$getWrpRollOrManual({$btnRoll, $dispRollOrManual, $btnManual, $dispRolled}) {
        const $stgDispRolled = $dispRolled ? $$`<div class="m-1"> = </div>${$dispRolled}` : null;
        return $$`<div class="ve-flex-v-center">${$btnRoll}${$dispRollOrManual}${$btnManual}${$stgDispRolled}</div>`;
    }

    _doBindRollableExpressionHooks({$dispRollOrManual, $btnRoll, $btnManual, $spcRollOrManual, $wrpRollOrManual}) {
        const hkRollableExpressionGold = ()=>{
            $dispRollOrManual.toggleVe(this._compCurrency.rollableExpressionGold);
            $btnRoll.toggleVe(this._compCurrency.rollableExpressionGold).title(`Rolling ${this._compCurrency.rollableExpressionGold}`);

            $btnManual.toggleVe(this._compCurrency.startingEquipment);

            if ($spcRollOrManual)
                $spcRollOrManual.toggleVe(!this._isPredefinedItemDatas && this._compCurrency.startingEquipment);
            $wrpRollOrManual.toggleVe(this._compCurrency.startingEquipment);
        };
        this._compCurrency.addHookStartingEquipment(hkRollableExpressionGold);
        this._compCurrency.addHookRollableExpressionGold(hkRollableExpressionGold);
        hkRollableExpressionGold();
    }
};

/**A component for displaying choices related to default starting equipment. Includes a button for rolling starting gold */
Charactermancer_StartingEquipment.ComponentDefault = class extends Charactermancer_StartingEquipment.ComponentBase {
    constructor(opts) {
        super(opts);

        opts = opts || {};

        this._equiSpecialSource = opts.equiSpecialSource;
        this._equiSpecialPage = opts.equiSpecialPage;
        this._fnDoShowShop = opts.fnDoShowShop;

        this._fnsUnhook = [];
    }

    async pRender($wrpTab) {
        const $wrpTabInner = $(`<div class="ve-flex-col w-100 h-100 min-h-0"></div>`).appendTo($wrpTab);
        this._render_standard($wrpTabInner);
        return $wrpTabInner;
    }
    _render_standard($wrpTabStandard) {

        //Buttons for rolling or manually inputting gold
        const $btnRoll = this._$getBtnRollStartingGold();
        const $dispRollOrManual = $(`<i class="mx-1">\u2013 or \u2013</i>`);
        const $btnManual = this._$getBtnEnterStartingGold();

        const $wrpRollOrManual = this._$getWrpRollOrManual({
            $dispRollOrManual, $btnRoll, $btnManual
        });

        this._doBindRollableExpressionHooks({
            $dispRollOrManual, $btnRoll, $btnManual, $wrpRollOrManual
        });

        const $rowSkipToShop = $$`<div class="w-100 py-1 ve-flex-v-center">
			<div class="mr-1">Alternatively, </div>
			${$wrpRollOrManual}
			<div class="ml-1">to skip to the shop.</div>
		</div>`.appendTo($wrpTabStandard);

        const $btnResetStartingGold = $(`<button class="btn btn-default btn-xs btn-5et">Reset Starting Gold</button>`).click(async()=>{
            //Create a popup that asks the user if they are sure
            const isSure = await InputUiUtil.pGetUserBoolean({
                title: `Are you sure?`,
                htmlDescription: `This will discard your current starting gold roll or value.`,
            });
            if (!isSure){return;}
            this._compCurrency.cpRolled = null;
        }
        );
        const $rowHasCpRolled = $$`<div class="w-100 py-1 ve-flex-v-center">
			<div class="mr-2">You have rolled or entered a value for starting gold instead of using starting equipment.</div>
			${$btnResetStartingGold}
			<div class="ml-1">to use the equipment listed below.</div>
		</div>`.appendTo($wrpTabStandard);

        const hkCpRolled = ()=>{
            $rowSkipToShop.toggleVe(this._compCurrency.cpRolled == null);
            $rowHasCpRolled.toggleVe(this._compCurrency.cpRolled != null);
        };

        this._compCurrency.addHookCpRolled(hkCpRolled);
        hkCpRolled();

        if (this._fnDoShowShop) {
            const hkOnChangeCurrency = (prop, val, prevVal)=>{
                if (prevVal == null && val != null)
                    this._fnDoShowShop();
            };
            this._compCurrency.addHookCpRolled(hkOnChangeCurrency);
        }

        //Now lets create some rows for the different choices we have
        const $wrpRows = $$`<div class="ve-flex-col w-100 h-100 min-h-0 overflow-y-auto"></div>`.appendTo($wrpTabStandard);

        //Add a hook for when our starting equipment choices change
        const hkStartingEquipment = ()=>{
            //Get the data
            const defaultData = this._compCurrency.startingEquipment?.defaultData || [];

            //Call the unhook functions to let them know we are dropping them
            this._fnsUnhook.forEach(fn=>fn());
            this._fnsUnhook = [];
            //Delete existing states relating to starting equipment
            Object.keys(this._state).filter(k=>k.startsWith(`std__`)).forEach(k=>delete this._state[k]);
            //Clear the existing ui elements
            $wrpRows.empty();

            //Create a row for each of the group sections
            const $rows = defaultData.map((group,ixGroup)=>{
                const isSingleOption = Object.keys(group).length === 1;
                const propGroup = `std__choice__${ixGroup}`;
                this._state[propGroup] = 0;
                const choices = Object.entries(group);


                const $wrpsChoices = choices.map(([choiceName,choice],ixChoice)=>{
                    const children = [];
                    choice.forEach((equi,ixEqui)=>{
                        if (typeof equi === "string"){children.push(Renderer.get().render(`{@item ${equi}}`));}
                        else if (equi.item) {
                            const itemId = this.constructor._getItemIdWithDisplayName(equi.item, equi.displayName);

                            children.push(Renderer.get().render(`${equi.quantity ? `${equi.quantity}× ` : ""}{@item ${itemId}}${equi.containsValue ? ` containing ${this.constructor._getHumanReadableCoinage(equi.containsValue)}` : ""}`));
                        }
                        //If the choice is of an equipment type, things get complicated as we need to show several sub-choices
                        else if (equi.equipmentType) {
                            //Get an array of string choices we have
                            const equiChoices = Charactermancer_StartingEquipment._EQUIPMENT_SETS[equi.equipmentType];
                            if (!equiChoices) {throw new Error(`Unhandled equipmentType "${equi.equipmentType}"`);}

                            const num = equi.quantity || 1;
                            for (let i = 0; i < num; ++i) {
                                const $dispEqui = $(`<div class="inline"></div>`);
                                const propEqui = `std__equi__${ixGroup}__${ixChoice}__${i}`;

                                const hkDispEqui = ()=>{
                                    if (!this._state[propEqui]) {
                                        $dispEqui.html(`<i class="ve-muted">(select an item)</i>`);
                                        return;
                                    }

                                    $dispEqui.html(Renderer.get().render(`{@item ${this._state[propEqui]}}`));
                                };
                                this._addHookBase(propEqui, hkDispEqui);
                                this._fnsUnhook.push(()=>this._removeHookBase(propEqui, hkDispEqui));
                                hkDispEqui();

                                //Lets create a submenu
                                const $listOptions = $$`<div class="col-2"></div>`;
                                const sel = Charactermancer_StartingEquipment.ComponentDefault._createUiUtilDropdown(
                                    this, propEqui, equiChoices, it=>{ const {name} = DataUtil.generic.unpackUid(it, "@item"); return name.toTitleCase()}); 
                                //I want a callback function when this is selected
                                sel.change(()=>{
                                    const val = sel.val();
                                    this._state[propGroup] = ixChoice;
                                    //fire a pulse here too
                                    this._state["defaultItemPulse"] = !this._state["defaultItemPulse"];
                                });
                                sel.appendTo($listOptions);

                                //children.push($$`<div class="inline">${$btnPick} ${$dispEqui} ${$listOptions}</div>`);
                                children.push($$`<div class="inline">${$listOptions} ${$dispEqui}</div>`);

                                if (i < num - 1) {children.push(", ");}
                            }
                        }
                        else if (equi.special) {
                            children.push(Renderer.get().render(`${equi.quantity ? `${equi.quantity}× ` : ""}${equi.special}${equi.containsValue ? ` containing ${this.constructor._getHumanReadableCoinage(equi.containsValue)}` : ""}${equi.worthValue ? `, worth ${this.constructor._getHumanReadableCoinage(equi.worthValue)}` : ""}`));
                        }
                        else if (equi.value != null) {
                            children.push(this.constructor._getHumanReadableCoinage(equi.value));
                        }
                        else
                            throw new Error(`Unknown equipment data format: ${JSON.stringify(equi)}`);

                        if (ixEqui < choice.length - 1) {children.push(", ");}
                    });

                    const $btnSelGroup = $(`<button class="btn btn-default btn-sm no-shrink ve-flex-vh-center imp-cls__disp-equi-choice-key mr-2 bold" ${isSingleOption ? "" 
                    : `title="Select Equipment Group ${choiceName}"`}>${isSingleOption ? "&nbsp;" : `(${choiceName})`}</button>`).click(async()=>{
                        if (this._compCurrency.cpRolled != null) {
                            const isSure = await InputUiUtil.pGetUserBoolean({
                                title: `Are you sure?`,
                                htmlDescription: `You have already rolled or set gold for equipment!<br>Selecting default starting equipment will discard this roll or value.`,
                            });
                            if (!isSure){return;}

                            this._compCurrency.cpRolled = null;
                        }
                        
                        if (isSingleOption){return;}

                        this._state[propGroup] = ixChoice;
                        this._state["defaultItemPulse"] = !this._state["defaultItemPulse"];
                    });

                    const $wrpChildren = $$`<div class="w-100">${children}</div>`;

                    const hkSelGroup = ()=>{
                        $btnSelGroup.toggleClass("ve-muted", this._compCurrency.cpRolled != null);
                        $wrpChildren.toggleClass("ve-muted", this._compCurrency.cpRolled != null);

                        if (this._compCurrency.cpRolled != null) {
                            $btnSelGroup.removeClass("active");
                            $btnSelGroup.prop("disabled", false);
                            return;
                        }

                        if (isSingleOption){$btnSelGroup.prop("disabled", true);}

                        if (this._state[propGroup] === ixChoice){$btnSelGroup.addClass("active");}
                        else{$btnSelGroup.removeClass("active");}

                    };
                    this._addHookBase(propGroup, hkSelGroup);
                    this._compCurrency.addHookCpRolled(hkSelGroup);
                    this._fnsUnhook.push(()=>this._removeHookBase(propGroup, hkSelGroup));
                    this._fnsUnhook.push(()=>this._compCurrency.removeHookCpRolled(hkSelGroup));
                    hkSelGroup();

                    if (ixChoice < choices.length - 1)
                        $btnSelGroup.addClass("mb-1");

                    return $$`<div class="ve-flex-vh-center">
							${$btnSelGroup}
							${$wrpChildren}
						</div>`;
                }
                );

                return $$`<div class="ve-flex-col w-100 p-1 my-1 imp-cls__wrp-equi-group">${$wrpsChoices}</div>`;
            });

            $rows.forEach($row=>$wrpRows.append($row));

            //If there are no rows available, just show a sad message
            if (!$rows.length) {
                $wrpRows.append(`<div class="ve-flex-vh-center w-100 h-100 italic ve-muted">No starting equipment available.</div>`);
            }

        };
        
        this._compCurrency.addHookStartingEquipment(hkStartingEquipment);
        hkStartingEquipment();

        //Add a hook for when the amount of coins we get to use with starting equipment changes
        const hkSetCoinsFromDefault = ()=>{
            if (Config.get("equipmentShop", "startingGold") != null) {
                this._compCurrency.cpFromDefault = 0; return;
            }

            let cpValue = 0;

            const fnEqui = (ixGroup, ixChoice, equi)=>{
                if (equi.item) {
                    if (equi.containsValue) {cpValue += equi.containsValue;}
                }
                else if (equi.special) {
                    if (equi.containsValue) {cpValue += equi.containsValue;}
                }
                else if (equi.value) { cpValue += equi.value; }
            };

            this._iterChosenStartingEquipment(fnEqui);
            this._compCurrency.cpFromDefault = cpValue;
        };

        this._addHookAll("state", hkSetCoinsFromDefault);
        hkSetCoinsFromDefault();
    }

    set equiSpecialSource(val) {
        this._equiSpecialSource = val;
    }
    set equiSpecialPage(val) {
        this._equiSpecialPage = val;
    }

    get isAvailable() {
        return !!(this._compCurrency.startingEquipment?.defaultData?.length);
    }

    async pGetFormData() {
        const equipmentItemEntries = [];

        const itemDatasDefault = await this._pGetItemDatasDefault();
        if (itemDatasDefault) {
            equipmentItemEntries.push(...itemDatasDefault);
        }

        const isValid = this._isValid_standard();
        const messageInvalid = isValid ? null : `You have not made all available choices. Are you sure you want to continue?`;

        return {
            isFormComplete: isValid,
            messageInvalid: messageInvalid,
            data: {
                equipmentItemEntries,
            },
        };
    }

    static _getItemIdWithDisplayName(itemId, displayName) {
        if (!displayName)
            return itemId;

        const itemIdParts = itemId.split("|");

        while (itemIdParts.length > 2)
            itemIdParts.pop();
        while (itemIdParts.length < 2)
            itemIdParts.push("");

        itemIdParts.push(displayName);

        return itemIdParts.join("|");
    }

    _iterChosenStartingEquipment(fnEqui) {
        const defaultData = (this._compCurrency.startingEquipment?.defaultData || []);

        for (let ixGroup = 0; ixGroup < defaultData.length; ++ixGroup) {
            const group = defaultData[ixGroup];
            const propGroup = `std__choice__${ixGroup}`;

            const choices = Object.entries(group);
            for (let ixChoice = 0; ixChoice < choices.length; ++ixChoice) {
                const [_,choice] = choices[ixChoice];

                if (this._state[propGroup] !== ixChoice)
                    continue;

                for (let ixEqui = 0; ixEqui < choice.length; ++ixEqui) {
                    const equi = choice[ixEqui];

                    const out = fnEqui(ixGroup, ixChoice, equi);
                    if (out !== undefined)
                        return out;
                }
            }
        }
    }

    _isValid_standard() {
        if (!this.isAvailable || this._compCurrency.cpRolled != null)
            return true;

        const fnEqui = (ixGroup,ixChoice,equi)=>{
            if (equi.equipmentType) {
                const num = equi.quantity || 1;
                for (let i = 0; i < num; ++i) {
                    const propEqui = `std__equi__${ixGroup}__${ixChoice}__${i}`;
                    if (this._state[propEqui] == null)
                        return false;
                }
            }
        }
        ;

        const out = this._iterChosenStartingEquipment(fnEqui);
        if (out !== undefined)
            return out;
        return true;
    }

    async _pGetItemDatasDefault() {
        if (this._compCurrency.cpRolled)
            return [];

        const outUidMetas = [];
        const outPreloaded = [];

        const addOutUidMeta = (itemUid,quantity)=>{
            const existing = outUidMetas.find(it=>it.itemUid === itemUid);
            if (existing)
                existing.quantity += quantity;
            else
                outUidMetas.push({
                    itemUid,
                    quantity: quantity
                });
        }
        ;

        const fnEqui = (ixGroup,ixChoice,equi)=>{
            if (typeof equi === "string")
                addOutUidMeta(equi, 1);
            else if (equi.item) {
                addOutUidMeta(this.constructor._getItemIdWithDisplayName(equi.item, equi.displayName), equi.quantity || 1);
            } else if (equi.equipmentType) {
                const num = equi.quantity || 1;
                for (let i = 0; i < num; ++i) {
                    const propEqui = `std__equi__${ixGroup}__${ixChoice}__${i}`;
                    const itemUid = this._state[propEqui];
                    if (itemUid != null)
                        addOutUidMeta(itemUid, 1);
                }
            } else if (equi.special) {
                outPreloaded.push({
                    item: {
                        name: Renderer.stripTags(equi.special).toTitleCase(),
                        source: this._equiSpecialSource,
                        page: this._equiSpecialPage,
                        type: "OTH",
                        rarity: "unknown",
                    },
                    quantity: equi.quantity || 1,
                });
            }
        }
        ;

        this._iterChosenStartingEquipment(fnEqui);

        const loadedItems = [];
        for (const itemUidMeta of outUidMetas) {
            const [name,source,displayName] = itemUidMeta.itemUid.split("|");
            const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS]({
                name,
                source
            });

            const loadedItem = await DataLoader.pCacheAndGetHash(UrlUtil.PG_ITEMS, hash);
            if (!loadedItem) {
                console.warn(...LGT, `Failed to load item "${itemUidMeta.itemUid}"!`);
                continue;
            }

            if (displayName)
                loadedItem._displayName = Renderer.stripTags(displayName).toTitleCase();
            loadedItems.push({
                item: loadedItem,
                quantity: itemUidMeta.quantity,
            });
        }
        //TEMPFIX
        /* const {ImportListItem} = await Promise.resolve().then(function() {
            return ImportListItem;
        });
        const outFromUids = loadedItems.sort((a,b)=>ImportListItem.sortEntries(a.item, b.item)); */

        
        const outFromUids = loadedItems.sort((a,b)=>Charactermancer_StartingEquipment.ComponentDefault.sortEntries(a.item, b.item));

        return [...outFromUids, ...outPreloaded];
    }

    _getDefaultState() {
        return {};
    }

    static sortEntries(a, b) {
        if (a.ammoType && !b.ammoType)
            return 1;
        if (!a.ammoType && b.ammoType)
            return -1;
        return SortUtil.ascSortLower(a.name, b.name) || SortUtil.ascSortLower(Parser.sourceJsonToFull(a.source), Parser.sourceJsonToFull(b.source));
    }

    static _createUiUtilDropdown(component, prop, values, fnDisplay, displayNullAs=null, isAllowNull=true, asMeta=true){
        const selMeta = ComponentUiUtil.$getSelEnum(component, prop, {
            values: values,
            isAllowNull: isAllowNull,
            asMeta: asMeta,
            displayNullAs: displayNullAs,
            fnDisplay: fnDisplay
        });
        if(!asMeta){return selMeta};
        return selMeta.$sel;
    }
    static _createCustomDropdown(values, fnDisplay, displayNullAs=null, isAllowNull=true){
        const select = document.createElement("select");
        select.className = "form-control input-xs";
        const sel = $(select);
        if(isAllowNull){
            const opt = document.createElement("option");
            opt.value = "-1";
            opt.text = displayNullAs || "\u2014";
            sel.append(opt);
        }
        values.forEach((it, i)=> {
            const opt = document.createElement("option");
            opt.value = `${i}`;
            opt.text = fnDisplay ? fnDisplay(it) : it;
            sel.append(opt);
        });
        return sel;
    }
};

Charactermancer_StartingEquipment.ComponentGold = class extends Charactermancer_StartingEquipment.ComponentBase {
    constructor(opts) {
        super(opts);
        this._isPredefinedItemDatas = !!opts.itemDatas;
        this._state.itemDatas = opts.itemDatas;

        this._modalFilter = null;
    }

    async pRender($wrpTab) {
        const $wrpTabInner = $(`<div class="ve-flex-col w-100 h-100 min-h-0"><div class="ve-flex-vh-center w-100 h-100 italic">Loading...</div></div>`).appendTo($wrpTab);
        await this._render_pGoldAlternative($wrpTabInner);
        return $wrpTabInner;
    }

    async _render_pGoldAlternative($wrpTabGoldAlternative) {
        await Renderer.item.pPopulatePropertyAndTypeReference();

        //TEMPFIX
       /*  const {ImportListItem} = await Promise.resolve().then(function() { return ImportListItem;});
        const importListItemSources = await (new ImportListItem()).pGetSources();
        const appSourceSelector = new AppSourceSelectorMulti({
            title: `Select Item Sources`,
            filterNamespace: `ImportListCharacter_StartingEquipment_filter`,
            savedSelectionKey: `ImportListCharacter_StartingEquipment_savedSelection`,
            sourcesToDisplay: importListItemSources,
            page: UrlUtil.PG_ITEMS,
            isDedupable: true,
        }); */

        const $btnChooseSources = this._isPredefinedItemDatas ? null : $(`<button class="btn btn-xs btn-default btn-5et">Choose Item Sources</button>`).click(async()=>{
            const choices = await appSourceSelector.pWaitForUserInput();
            if (choices == null)
                return;

            this._state.itemDatas = choices;
        }
        );

        if (!this._isPredefinedItemDatas) {
            appSourceSelector.pLoadInitialSelection().then(choices=>{
                if (!choices)
                    return;
                this._state.itemDatas = choices;
            });
        }

        const $dispCurrencyRemaining = $(`<div class="ml-auto ve-flex-v-center"></div>`);
        const hkCurrency = ()=>{
            const remainingCp = this._compCurrency.getRemainingCp();
            $dispCurrencyRemaining.html(`
				<div title="The total cost of all items in the &quot;shopping basket,&quot; listed below.">
					<b class="mr-1">Total:</b>
					<span>${this.constructor._getHumanReadableCoinage(this._compCurrency.cpSpent)}</span>
				</div>
				<div class="vr-1"></div>
				<span>(</span>
				<div title="The total remaining gold available to this character. This amount is a combination of the currency on their sheet, plus any contextual modifiers (such as class starting gold when importing a class).">
					<b class="mr-1">Remaining:</b>
					<span ${remainingCp < 0 ? `class="veapp__msg-error bold"` : ""}>${this.constructor._getHumanReadableCoinage(remainingCp)}</span>
				</div>
				<span>)</span>
			`);
        }
        ;
        this._compCurrency.addHookCurrency(hkCurrency);
        hkCurrency();

        const $dispRollOrManual = $(`<i class="mx-1">\u2013 or \u2013</i>`);
        const $btnRoll = this._$getBtnRollStartingGold();
        const $btnManual = this._$getBtnEnterStartingGold();
        const $dispRolled = this._$getDispRolledGold();

        const $spcRollOrManual = $(`<div class="vr-1"></div>`);
        const $wrpRollOrManual = this._$getWrpRollOrManual({
            $dispRollOrManual,
            $btnRoll,
            $btnManual,
            $dispRolled
        }).addClass("mr-3");

        this._doBindRollableExpressionHooks({
            $dispRollOrManual,
            $btnRoll,
            $btnManual,
            $spcRollOrManual,
            $wrpRollOrManual
        });

        //TEMPFIX
        const isStandaloneGmInstance = /* game.user.isGM && */ this._compCurrency.isStandalone;
        const $btnEditPriceMultiplier = !isStandaloneGmInstance ? null : $(`<button class="btn btn-xs btn-default btn-5et">Edit Config</button>`).on("click", evt=>Config.pOpen({
            evt,
            initialVisibleGroup: "equipmentShop"
        }));
        const $wrpGmPriceMultiplier = !isStandaloneGmInstance ? null : $$`<div class="ml-auto">
			${$btnEditPriceMultiplier}
		</div>`;

        this._modalFilter = new ModalFilterEquipment(this);

        const $wrpItemList = $(`<div class="ve-flex-col w-50 h-100 min-h-0"><div class="ve-flex-vh-center italic w-100 h-100">Loading...</div></div>`);

        this._modalFilter.pPopulateWrapper($wrpItemList, {
            isBuildUi: true,
            $btnOpen: $(`<button class="btn-5et btn-default veapp__btn-filter" name="btn-filter">Filter</button>`),
            $btnToggleSummaryHidden: $(`<button class="btn btn-default btn-5et" title="Toggle Filter Summary Display" name="btn-toggle-summary"><span class="glyphicon glyphicon-resize-small"></span></button>`),
            $btnReset: $(`<button class="btn-5et btn-default veapp__btn-list-reset" name="btn-reset">Reset</button>`),
        }, ).then(meta=>{
            const {list, $btnSendAllToRight} = meta;
            //A button for adding ALL items to the cart of bought items
            $btnSendAllToRight.addClass("btn-5et ve-grow").click(async evt=>{

                if (list.visibleItems.length > 10 && !(await InputUiUtil.pGetUserBoolean({
                    title: `You are about to add ${list.visibleItems.length} items. Are you sure?`
                    }))){return;}

                
                const quantity = evt.shiftKey ? 5 : 1;
                //Buy the items
                list.visibleItems.forEach(it=>this.addBoughtItem(`${it.name}|${it.values.source}`, { quantity, isTriggerUpdate: false }));
                this._triggerCollectionUpdate("itemPurchases");
            });

            //Populate the list of items to click to buy
            hkItemDatas();
        });

        const $wrpBoughtList = $(`<div class="w-100 h-100 min-h-0 overflow-y-auto"></div>`);

        //Call this whenever user clicks to buy (or sell) an item
        const hkGoldItemUids = ()=>{
            this._renderCollection({
                prop: "itemPurchases",
                fnUpdateExisting: (renderedMeta, itemPurchase)=>{
                    renderedMeta.comp._proxyAssignSimple("state", itemPurchase.data, true);
                },
                fnGetNew: (itemPurchase)=>{
                    const comp = BaseComponent.fromObject(itemPurchase.data);
                    comp._addHookAll("state", ()=>{
                        itemPurchase.data = comp.toObject();
                        this._triggerCollectionUpdate("itemPurchases");
                    });

                    const [name,source] = itemPurchase.data.uid.split("|");
                    const priceMult = Config.get("equipmentShop", "priceMultiplier") || 1;

                    DataLoader.pCacheAndGetHash(UrlUtil.PG_ITEMS, UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS]({ name, source })).then(item=>{
                        comp._state.name = item.name;
                        comp._state.value = item.value * priceMult;
                    });

                    const hkNoQuantity = ()=>{
                        if (comp._state.quantity > 0) { return; }
                        this._state.itemPurchases = this._state.itemPurchases.filter(it=>it !== itemPurchase);
                    };
                    comp._addHookBase("quantity", hkNoQuantity);

                    const $btnSubtract = $(`<button class="btn btn-xxs btn-5et btn-danger" title="Remove One (SHIFT to remove  5)"><span class="glyphicon glyphicon-minus"></span></button>`).click(evt=>{
                        if (evt.shiftKey)
                            comp._state.quantity -= 5;
                        else
                            comp._state.quantity--;
                    });

                    const $btnAdd = $(`<button class="btn btn-xxs btn-5et btn-success" title="Add Another (SHIFT to add 5)"><span class="glyphicon glyphicon-plus"></span></button>`).click(evt=>{
                        if (evt.shiftKey)
                            comp._state.quantity += 5;
                        else
                            comp._state.quantity++;
                    });

                    const $dispQuantity = $(`<div class="ve-text-center no-shrink imp-cls__disp-equi-count"></div>`);
                    const hkQuantity = ()=>$dispQuantity.text(comp._state.quantity);
                    comp._addHookBase("quantity", hkQuantity);
                    hkQuantity();

                    const $dispName = $(`<div class="w-100"></div>`);
                    const hkName = ()=>$dispName.html(Renderer.get().render(`{@item ${comp._state.uid}|${comp._state.name || ""}}`));
                    comp._addHookBase("name", hkName);
                    hkName();

                    const $dispCostIndividual = $(`<div class="no-shrink text-right imp-cls__disp-equi-cost px-1"></div>`);
                    const hkCostIndividual = ()=>$dispCostIndividual.html(comp._state.isIgnoreCost ? `<span class="ve-muted" title="Cost Ignored">\u2014</span>` : this.constructor._getHumanReadableCoinage(comp._state.value));
                    comp._addHookBase("value", hkCostIndividual);
                    hkCostIndividual();

                    const $dispCostTotal = $(`<div class="no-shrink text-right imp-cls__disp-equi-cost px-1"></div>`);
                    const hkCostTotal = ()=>{
                        if (comp._state.value == null || comp._state.quantity == null)
                            return;
                        $dispCostTotal.html(comp._state.isIgnoreCost ? `<span class="ve-muted" title="Cost Ignored">\u2014</span>` : this.constructor._getHumanReadableCoinage(comp._state.value * comp._state.quantity));
                    };
                    comp._addHookBase("value", hkCostTotal);
                    comp._addHookBase("quantity", hkCostTotal);
                    hkCostTotal();

                    const $wrpRow = $$`<div class="py-1p my-0 veapp__list-row ve-flex-v-center w-100">
						<div class="btn-group ve-flex-vh-center no-shrink imp-cls__wrp-equi-btns">
							${$btnSubtract}
							${$btnAdd}
						</div>
						${$dispQuantity}
						${$dispName}
						${$dispCostIndividual}
						${$dispCostTotal}
					</div>`.appendTo($wrpBoughtList);

                    return {
                        comp,
                        $wrpRow,
                    };
                },
            });
        };
        this._addHookBase("itemPurchases", hkGoldItemUids);
        hkGoldItemUids();

        //Call this whenever user clicks to buy (or sell) an item
        const pHkItemsPurchased = async()=>{
            try {
                await this._pLock("pHkItemsPurchased");
                this._compCurrency.cpSpent = await this._pGetCpSpent();
            } finally {
                this._unlock("pHkItemsPurchased");
            }
        };
        this._addHookBase("itemPurchases", pHkItemsPurchased);
        pHkItemsPurchased();

        const hkItemDatas = ()=>{
            //Refresh the list of items that we can click and buy
            this._modalFilter.setDataList(this._state.itemDatas);
        };
        this._addHookBase("itemDatas", hkItemDatas);

        const $btnClearPurchases = $(`<button class="btn btn-xxs btn-5et btn-danger" title="Remove All Purchases"><span class="glyphicon glyphicon-minus"></span></button>`).click(async()=>{
            if (!(await InputUiUtil.pGetUserBoolean({
                title: `Are you sure you want to remove all purchased items from the list?`
            })))
                return;
            this._state.itemPurchases = [];
        }
        );

        $$($wrpTabGoldAlternative.empty())`
		<div class="ve-flex-v-center">
			<div class="w-50 ve-flex-v-center">
				${$btnChooseSources}
				${$spcRollOrManual}
				${$wrpRollOrManual}
				${$wrpGmPriceMultiplier}
			</div>

			<div class="vr-1"></div>

			<div class="w-50 split-v-center">
				${$dispCurrencyRemaining}
			</div>
		</div>

		<hr class="hr-1">

		<div class="ve-flex h-100 min-h-0 w-100">
			${$wrpItemList}

			<div class="vr-1"></div>

			<div class="w-50 min-h-0 ve-flex-col">
				<div class="ve-flex-v-center pb-1">
					<div class="imp-cls__wrp-equi-btns no-shrink ve-flex-vh-center">${$btnClearPurchases}</div>
					<div class="imp-cls__disp-equi-count no-shrink ve-text-center" title="Quantity">Qt.</div>
					<div class="w-100">Name</div>
					<div class="imp-cls__disp-equi-cost no-shrink ve-text-center">Cost</div>
					<div class="imp-cls__disp-equi-cost no-shrink ve-text-center">Line Total</div>
				</div>

				${$wrpBoughtList}
			</div>
		</div>`;
    }

    get isAvailable() {
        return true;
    }

    async pGetFormData() {
        const equipmentItemEntries = [];

        const itemDatas = await this._pGetItemEntries();
        if (itemDatas) {
            equipmentItemEntries.push(...itemDatas);
        }

        const isValid = await this._isValid_gold();
        const messageInvalid = isValid ? null : `You have spent more gold than you possess. Are you sure you want to go into debt?`;

        return {
            isFormComplete: isValid,
            messageInvalid,
            data: {
                equipmentItemEntries,
            },
        };
    }

   

    

    _isValid_gold() {
        return this._compCurrency.getRemainingCp() >= 0;
    }

    async _pGetCpSpent() {
        const priceMult = Config.get("equipmentShop", "priceMultiplier") || 1;
        const expenses = await Promise.all(this._state.itemPurchases.map(async itemMeta=>{
            if (itemMeta.data.isIgnoreCost)
                return 0;

            const [name,source] = itemMeta.data.uid.split("|");
            const item = await DataLoader.pCacheAndGetHash(UrlUtil.PG_ITEMS, UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS]({
                name,
                source
            }));
            return item.value * priceMult * (itemMeta.data.quantity || 1);
        }
        ));
        return expenses.reduce((a,b)=>a + b, 0);
    }

    async _pGetItemEntries() {
        if (!this._state.itemPurchases.length)
            return null;

        const combinedItems = {};

        for (const itemPurchase of this._state.itemPurchases) {
            combinedItems[itemPurchase.data.uid] = combinedItems[itemPurchase.data.uid] || 0;
            combinedItems[itemPurchase.data.uid] += itemPurchase.data.quantity || 1;
        }

        const out = [];
        const entries = Object.entries(combinedItems);
        for (const [uid,quantity] of entries) {
            const [name,source] = uid.split("|");
            const item = await DataLoader.pCacheAndGetHash(UrlUtil.PG_ITEMS, UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS]({
                name,
                source
            }));
            out.push({
                item,
                quantity,
            });
        }

        return out;
    }

    /**
     * Add an item to our cart of bought items
     * @param {string} itemUid
     * @param {{quantity:number, isTriggerUpdate:boolean, isIgnoreCost:boolean}} opts
     * @returns {any}
     */
    addBoughtItem(itemUid, opts) {
        opts = opts || {};
        opts.quantity = opts.quantity === undefined ? 1 : opts.quantity;
        opts.isTriggerUpdate = opts.isTriggerUpdate === undefined ? true : opts.isTriggerUpdate;
        opts.isIgnoreCost = opts.isIgnoreCost === undefined ? false : opts.isIgnoreCost;

        itemUid = itemUid.toLowerCase();
        const collectionId = `${itemUid}__${opts.isIgnoreCost}`;

        //See if we already bought an item like this, and if so, just add to its quantity
        const existing = this._state.itemPurchases.find(it=>it.id === collectionId);
        if (existing) { existing.data.quantity += opts.quantity; }
        else {
            this._state.itemPurchases.push({
                id: collectionId,
                data: {
                    uid: itemUid,
                    quantity: opts.quantity,
                    isIgnoreCost: opts.isIgnoreCost,
                },
            });
        }

        if (opts.isTriggerUpdate) { this._triggerCollectionUpdate("itemPurchases"); }
    }

    _getDefaultState() {
        return {
            itemPurchases: [],

            itemDatas: [],
        };
    }
};
Charactermancer_StartingEquipment._EQUIPMENT_SET_NAMES = {
    weaponAny: "Weapon",
    weaponSimple: "Simple Weapon",
    weaponSimpleMelee: "Simple Melee Weapon",
    weaponSimpleRanged: "Simple Ranged Weapon",
    weaponMartial: "Martial Weapon",
    weaponMartialMelee: "Martial Melee Weapon",
    weaponMartialRanged: "Martial Ranged Weapon",
    instrumentMusical: "Musical Instrument",
    armorLight: "Light Armor",
    armorMedium: "Medium Armor",
    armorHeavy: "Heavy Armor",
    weaponMelee: "Melee Weapon",
    weaponRanged: "Ranged Weapon",
    focusSpellcasting: "Spellcasting Focus",
    setGaming: "Gaming Set",
    toolArtisan: "Artisan's Tool",
};
Charactermancer_StartingEquipment._EQUIPMENT_SETS = {
    weapon: [...UtilDataConverter.WEAPONS_SIMPLE, ...UtilDataConverter.WEAPONS_MARTIAL, ],
    weaponSimple: [...UtilDataConverter.WEAPONS_SIMPLE, ],
    weaponSimpleMelee: ["club|phb", "dagger|phb", "greatclub|phb", "handaxe|phb", "javelin|phb", "light hammer|phb", "mace|phb", "quarterstaff|phb", "sickle|phb", "spear|phb", ],
    weaponSimpleRanged: ["light crossbow|phb", "shortbow|phb", ],
    weaponMartial: [...UtilDataConverter.WEAPONS_MARTIAL, ],
    weaponMartialMelee: ["battleaxe|phb", "flail|phb", "glaive|phb", "greataxe|phb", "greatsword|phb", "halberd|phb", "lance|phb", "longsword|phb", "maul|phb", "morningstar|phb", "pike|phb", "rapier|phb", "scimitar|phb", "shortsword|phb", "trident|phb", "war pick|phb", "warhammer|phb", "whip|phb", ],
    weaponMartialRanged: ["blowgun|phb", "hand crossbow|phb", "heavy crossbow|phb", "longbow|phb", ],
    instrumentMusical: ["bagpipes|phb", "drum|phb", "dulcimer|phb", "flute|phb", "horn|phb", "lute|phb", "lyre|phb", "pan flute|phb", "shawm|phb", "viol|phb", ],
    armorLight: ["leather armor|phb", "padded armor|phb", "studded leather armor|phb", ],
    armorMedium: ["hide armor|phb", "chain shirt|phb", "scale mail|phb", "breastplate|phb", "half plate armor|phb", ],
    armorHeavy: ["ring mail|phb", "chain mail|phb", "splint armor|phb", "plate armor|phb", ],
    weaponMelee: ["battleaxe|phb", "club|phb", "dagger|phb", "flail|phb", "glaive|phb", "greataxe|phb", "greatclub|phb", "greatsword|phb", "halberd|phb", "handaxe|phb", "javelin|phb", "lance|phb", "light hammer|phb", "longsword|phb", "mace|phb", "maul|phb", "morningstar|phb", "pike|phb", "quarterstaff|phb", "rapier|phb", "scimitar|phb", "shortsword|phb", "sickle|phb", "spear|phb", "staff|phb", "trident|phb", "war pick|phb", "warhammer|phb", "whip|phb", ],
    weaponRanged: ["blowgun|phb", "dart|phb", "hand crossbow|phb", "heavy crossbow|phb", "light crossbow|phb", "longbow|phb", "net|phb", "shortbow|phb", "sling|phb", ],
    focusSpellcasting: ["crystal|phb", "orb|phb", "rod|phb", "staff|phb", "wand|phb", ],
    focusSpellcastingHoly: ["amulet|phb","emblem|phb","reliquary|phb","holy symbol|phb"],
    focusSpellcastingDruidic: ["sprig of mistletoe|phb","totem|phb","wooden staff|phb","yew wand|phb", "druidic focus|phb"],
    focusSpellcastingArcane: ["crystal|phb", "orb|phb", "rod|phb", "staff|phb", "wand|phb", "arcane focus|phb" ],
    setGaming: ["dice set|phb", "dragonchess set|phb", "playing card set|phb", "three-dragon ante set|phb", ],
    toolArtisan: ["alchemist's supplies|phb", "brewer's supplies|phb", "calligrapher's supplies|phb", "carpenter's tools|phb", "cartographer's tools|phb", "cobbler's tools|phb", "cook's utensils|phb", "glassblower's tools|phb", "jeweler's tools|phb", "leatherworker's tools|phb", "mason's tools|phb", "painter's supplies|phb", "potter's tools|phb", "smith's tools|phb", "tinker's tools|phb", "weaver's tools|phb", "woodcarver's tools|phb", ],
};


//#endregion

//#region Charactermancer Spell
/**The main component that handles selection of known spells. */
class ActorCharactermancerSpell extends ActorCharactermancerBaseComponent {
    constructor(parentInfo) {
      parentInfo = parentInfo || {};
      super();
      this._actor = parentInfo.actor;
      this._data = parentInfo.data;
      this._parent = parentInfo.parent;
      this._tabSpells = parentInfo.tabSpells;
      this._pageFilterSpells = new PageFilterSpells();
      //TEMPFIX
      this._modalFilterSpells = new ModalFilterSpells({//new ModalFilterSpellsFvtt({
        'namespace': "ActorCharactermancer.spells",
        'isRadio': true,
        'allData': this._data.spell
      });
      this._filterValuesSpellsCache = null;
      this._lastSearchTermSpells = '';
      this._compsSpellSpells = [];
      this._compsSpellSpellSlotLevelSelect = [];
      this._compSpellAdditionalSpellRace = null;
      this._compSpellAdditionalSpellBackground = null;
      this._compsSpellAdditionalSpellClass = [];
      this._compsSpellAdditionalSpellSubclass = [];
    }

    async pRender() {
        const wrpTab = this._tabSpells?.$wrpTab;
        if (!wrpTab) { return; }
        const leftContent = $$`<div class="ve-flex-col w-100 h-100 px-1 overflow-y-auto ve-grow veapp__bg-foundry smooth-scroll"></div>`;
        const rightContent = $$`<div class="ve-flex-col w-100"></div>`;
        const dispSpell = $$`<div class="ve-flex-col w-100 h-100"></div>`;
        //Render the filterbox
        await this._spell_pRenderFilterBox(leftContent);
        //For each class, render a section
        for (let classIx = 0; classIx < this._parent.compClass.state.class_ixMax + 1; ++classIx) {
            this._spell_renderClassSection(leftContent, rightContent, dispSpell, classIx);
        }
        //Prepare a hook if another class is added/removed
        const refreshClassMax = () => {
          this._spell_renderClassSection(leftContent, rightContent, dispSpell, this._parent.compClass.state.class_ixMax);
        };
        this._parent.compClass.addHookBase("class_ixMax", refreshClassMax);
        //Render the race section
        this._spell_renderRaceSection(leftContent);
        //Then the background
        this._spell_renderBackgroundSection(leftContent);
        //And refresh the filter
        this._spell_handleFilterChange();
        //Then put everything in the DOM
        $$`<div class="ve-flex w-100 h-100">
                ${leftContent}
    
                <div class="vr-1"></div>
    
                <div class="ve-flex-col w-100 h-100 px-1 overflow-y-auto ve-grow veapp__bg-foundry smooth-scroll">
                    ${rightContent}
                    ${dispSpell}
                </div>
            </div>`.appendTo(wrpTab);
    }

        /**
         * Sets the state of the component and subcomponents based on a save file. This should be called just after first render.
         * @param {{spellsBySource:{className: string, classSource: string, spellsByLvl: Charactermancer_Spell_SpellMeta[][]}} actor
        */
    setStateFromSaveFile(actor){
        const data = actor.spellsBySource; //This needs to be updated whenever a class is removed from the character
        
        for(let j = 0; j < data.length; ++j){
                //Assume this is for a class, and it is going to _compsSpellSpells
                //const ix = this._getIxOfSpell(src.spellsByLvl[0][0].spell);

                //WARNING: Not 100% sure about this one
                console.log(actor);
                const classIx = data[j].ix;

                for(let lvlIx = 0; lvlIx < data[j].spellsByLvl.length; ++lvlIx){
                    for(let sp of  data[j].spellsByLvl[lvlIx]){
                        this.markSpellAsLearnedKnown(classIx, sp);
                    }
                }
        }
        /* this._setSpellAsLearned(0, {name:"Guidance", source:"PHB"});
        this._setSpellAsLearned(0, {name:"Goodberry", source:"PHB"}); */
        
    }
    /**
        * @param {{name:string, source:string, school:string}} spell
        * @returns {any}
        */
    _getIxOfSpell(spell){
            const match = this._data.spell.filter(v => v.name == spell.name && v.source == spell.source);
            if(!match?.length){return null;}
            const ix = this._data.spell.indexOf(match[0]);
            return ix;
    }
    /**
        * Mark a spell as prepared or learned. Only used when loading from a save file.
        * @param {number} classIx Index of the class we are learning the spell on
        * @param {{name:string, source:string}} spellStub
        */
    markSpellAsLearnedKnown(classIx, spellStub){
            //Get the uid index of the spells
            const ix = this._getIxOfSpell(spellStub);
            //Use that to grab the full spell info from data
            const actualSpell = this._data.spell[ix];
            const comp = this.compsSpellSpells[classIx]; //Grab the component that handles spells for our class
            //Use the level of the spell to determine which subcomponent to grab
            const subComp = comp._compsLevel[actualSpell.level];
            //Tell the subcomponent to mark the spell as learned/known
            subComp.markSpellAsLearnedKnown(ix);
    }
    
    /**
     * Create a section to handle drawing spells for a class, and set up hooks for it
     * @param {any} div1
     * @param {any} div2
     * @param {any} dispSpell
     * @param {number} classIndex
     * @returns {any}
     */
    _spell_renderClassSection(div1, div2, dispSpell, classIndex) {
        
        if(ActorCharactermancerBaseComponent.class_isDeleted(classIndex)){return;}

        const {
          propIxClass: propIxClass,
          propIxSubclass: propIxSubclass,
          propTargetLevel: propTargetLevel
        } = ActorCharactermancerBaseComponent.class_getProps(classIndex);
        const dispClassNameLeft = $("<h2 class=\"m-0 b-0 py-1\"></h2>");
        const wrpPreparedLearnedLhs = $$`<div class="mb-1 ve-muted ve-small manc-sp__disp-prepared ve-flex-v-center"></div>`;
        const wrpPreparedLearnedRhs = $$`<div class="mb-1 ve-muted ve-small manc-sp__disp-prepared ve-flex-v-center"></div>`;
        const wrpSlotLevelSelect = $$`<div class="mb-1 ve-flex-col"></div>`;
        const dispClassNameRight = $("<h2 class=\"m-0 b-0 py-1\"></h2>");
        const classSpells = $$`<div class="ve-flex-col"></div>`;
        const classAdditionalSpells = $$`<div class="ve-flex-col"></div>`.hideVe();
        const subclassAdditionalSpells = $$`<div class="ve-flex-col"></div>`.hideVe();
        const spellsTable = $$`<div class="ve-flex-col"></div>`;

        const $leftContentToggle = $("<div class=\"py-1 clickable ve-muted\">[‒]</div>").click(() => {
          $leftContentToggle.text($leftContentToggle.text() === "[+]" ? "[‒]" : "[+]");
          wrpSlotLevelSelect.toggleVe();
          $leftContent.toggleVe();
        });
        const $leftContent = $$`<div class="ve-flex-col w-100">
                ${classSpells}
                ${classAdditionalSpells}
                ${subclassAdditionalSpells}
            </div>`;
        const wrpLeftInner = $$`<div class="ve-flex-col mb-2">
                <div class="split-v-center">
                    ${dispClassNameLeft}
                    ${$leftContentToggle}
                </div>
                ${wrpPreparedLearnedLhs}
                ${wrpSlotLevelSelect}
    
                ${$leftContent}
            </div>`.appendTo(div1);

        const $spellsTableToggle = $("<div class=\"py-1 clickable ve-muted\">[‒]</div>").click(() => {
          $spellsTableToggle.text($spellsTableToggle.text() === "[+]" ? "[‒]" : '[+]');
          $spellsTable.toggleVe();
        });
        const $spellsTable = $$`<div class="ve-flex-col w-100">
                ${spellsTable}
            </div>`;
        const wrpRightInner = $$`<div class="ve-flex-col w-100">
                <div class="split-v-center">
                    ${dispClassNameRight}
                    ${$spellsTableToggle}
                </div>
                ${wrpPreparedLearnedRhs}
    
                ${$spellsTable}
    
                <hr class="hr-2">
            </div>`.appendTo(div2);
        
        const hook_onChangeClass = this._hk_onChangeClass.bind(this, classIndex, {
          '$dispClassNameLeft': dispClassNameLeft,
          '$dispClassNameRight': dispClassNameRight,
          '$stgClassAdditionalSpells': classAdditionalSpells,
          '$stgSubclassAdditionalSpells': subclassAdditionalSpells,
          '$wrpLeftInner': wrpLeftInner,
          '$wrpRightInner': wrpRightInner,
          '$stgClassSpells': classSpells,
          '$stgSpellsTable': spellsTable,
          '$dispSpell': dispSpell,
          '$wrpSlotLevelSelect': wrpSlotLevelSelect,
          '$wrpPreparedLearnedLhs': wrpPreparedLearnedLhs,
          '$wrpPreparedLearnedRhs': wrpPreparedLearnedRhs
        });
        const hook_onChangeSubclass = this._hk_onChangeSubclass.bind(this, classIndex, {
          '$dispClassNameLeft': dispClassNameLeft,
          '$dispClassNameRight': dispClassNameRight,
          '$stgSubclassAdditionalSpells': subclassAdditionalSpells,
          '$wrpLeftInner': wrpLeftInner,
          '$wrpRightInner': wrpRightInner,
          '$stgClassSpells': classSpells,
          '$stgSpellsTable': spellsTable,
          '$dispSpell': dispSpell,
          '$wrpSlotLevelSelect': wrpSlotLevelSelect,
          '$wrpPreparedLearnedLhs': wrpPreparedLearnedLhs,
          '$wrpPreparedLearnedRhs': wrpPreparedLearnedRhs
        });
        const hook_onChangeLevel = this._hk_onChangeLevel.bind(this, classIndex, {
          $wrpLeftInner: wrpLeftInner,
          $wrpRightInner: wrpRightInner
        });
        const onHookPulse = () => { 
            //If class is marked as deleted, then hide the ui
            if(ActorCharactermancerBaseComponent.class_isDeleted(classIndex)){
                wrpLeftInner.hideVe();
                wrpRightInner.hideVe();
            }
        }
        const hook_onChangeAbilityScores = this._hk_onChangeAbilityScores.bind(this, classIndex);
        
        this._parent.compClass.addHookBase(propIxClass, hook_onChangeClass);
        this._parent.compClass.addHookBase(propIxSubclass, hook_onChangeSubclass);
        this._parent.compClass.addHookBase(propTargetLevel, hook_onChangeLevel);
        this._parent.compClass.addHookBase("class_pulseChange", onHookPulse);
        this._parent.compAbility.addHookAbilityScores(hook_onChangeAbilityScores);
        //Fire the onChangeClass hook straight away, to build the UI
        hook_onChangeClass();
    }
    _spell_renderRaceSection(wrapperDiv) {
        return this._spell_renderRaceBackgroundSection({
            '$wrpLeft': wrapperDiv,
            'propPulse': 'race_ixRace_version',
            'propCompAdditionalSpells': "_compSpellAdditionalSpellRace",
            'propAlwaysPreparedSpells': "alwaysPreparedSpellsRace",
            'propExpandedSpells': 'expandedSpellsRace',
            'propAlwaysKnownSpells': "alwaysKnownSpellsRace",
            'compEntity': this._parent.compRace,
            'fnGetEntity': () => this._parent.compRace.getRace_()
        });
    }
    _spell_renderBackgroundSection(wrapperDiv) {
    return this._spell_renderRaceBackgroundSection({
        '$wrpLeft': wrapperDiv,
        'propPulse': 'background_pulseBackground',
        'propCompAdditionalSpells': '_compSpellAdditionalSpellBackground',
        'propAlwaysPreparedSpells': 'alwaysPreparedSpellsBackground',
        'propExpandedSpells': "expandedSpellsBackground",
        'propAlwaysKnownSpells': "alwaysKnownSpellsBackground",
        'compEntity': this._parent.compBackground,
        'fnGetEntity': () => this._parent.compBackground.getFeatureCustomizedBackground_({
        'isAllowStub': false
        })
    });
    }
    _spell_renderRaceBackgroundSection({
    $wrpLeft: $wrpLeft,
    propPulse: propPulse,
    propCompAdditionalSpells: compAdditionalSpells,
    propAlwaysPreparedSpells: compAlwaysPreparedSpells,
    propExpandedSpells: propExpandedSpells,
    propAlwaysKnownSpells: propAlwaysKnownSpells,
    compEntity: compEntity,
    fnGetEntity: fnGetEntity
    }) {
        const content = $$`<div class="ve-flex-col"></div>`.hideVe();
        const hkLevelChange = () => {
            const existingLevel = this._parent.compClass.getExistingClassTotalLevels_();
            const newLevel = this._parent.compClass.state.class_totalLevels;
            if (this[compAdditionalSpells]) {
            this[compAdditionalSpells].curLevel = existingLevel;
            this[compAdditionalSpells].targetLevel = Math.max(1, newLevel);
            const { min, max, isAnyCantrips } = this._parent.compClass.class_getMinMaxSpellLevel();
            this[compAdditionalSpells].spellLevelLow = min;
            this[compAdditionalSpells].spellLevelHigh = max;
            this[compAdditionalSpells].isAnyCantrips = isAnyCantrips;
            }
        };
        this._parent.compClass.addHookBase("class_totalLevels", hkLevelChange);
        this._parent.compClass.addHookBase("class_pulseChange", hkLevelChange);
        const header = $("<h2 class=\"m-0 b-0 py-1\"></h2>");
        const minimizer = $("<div class=\"py-1 clickable ve-muted\">[‒]</div>").click(() => {
            minimizer.text(minimizer.text() === "[+]" ? "[‒]" : "[+]");
            contentWrapper.toggleVe();
        });
        const contentWrapper = $$`<div class="ve-flex-col w-100"> ${content} </div>`;
        const mainWrapper = $$`<div class="ve-flex-col w-100 mb-2">
                <div class="split-v-center">
                    ${header}
                    ${minimizer}
                </div>

                ${contentWrapper}
            </div>`.hideVe().appendTo($wrpLeft);
        const hkPulse = () => {
            content.empty();
            const e = fnGetEntity();
            let hasAdditionalSpells = false;
            if (e && e.additionalSpells) {
                hasAdditionalSpells = true;
                content.showVe();
                this[compAdditionalSpells] = new Charactermancer_AdditionalSpellsSelect({
                    spellDatas: this._data.spell,
                    additionalSpells: e.additionalSpells,
                    modalFilterSpells: this._modalFilterSpells
                });
                this[compAdditionalSpells].render(content);
                const fnAlwaysPrepared = () => this._compsSpellSpells.filter(Boolean).forEach(comp => comp[compAlwaysPreparedSpells]
                    = MiscUtil.copy(this[compAdditionalSpells].spellsAlwaysPrepared));
                this[compAdditionalSpells].addHookAlwaysPreparedSpells(fnAlwaysPrepared);
                fnAlwaysPrepared();
                const fnExpanded = () => this._compsSpellSpells.filter(Boolean).forEach(comp => comp[propExpandedSpells]
                    = MiscUtil.copy(this[compAdditionalSpells].spellsExpanded));
                this[compAdditionalSpells].addHookExpandedSpells(fnExpanded);
                fnExpanded();
                const fnAlwaysKnown = () => this._compsSpellSpells.filter(Boolean).forEach(comp => comp[propAlwaysKnownSpells]
                    = MiscUtil.copy(this[compAdditionalSpells].spellsAlwaysKnown));
                this[compAdditionalSpells].addHookAlwaysKnownSpells(fnAlwaysKnown);
                fnAlwaysKnown();
            }
            else {
            content.hideVe();
            this[compAdditionalSpells] = null;
            this._compsSpellSpells.filter(Boolean).forEach(comp => comp[propExpandedSpells] = []);
            }
            if (e && hasAdditionalSpells) {
                mainWrapper.showVe();
                header.text(e.name);
            }
            else { mainWrapper.hideVe(); }
            hkLevelChange();
        };
        compEntity.addHookBase(propPulse, hkPulse);
        hkPulse();
    }

    get modalFilterSpells() {
      return this._modalFilterSpells;
    }
    get filterValuesSpellsCache() {
      return this._filterValuesSpellsCache;
    }
    get filterBoxSpells() {
      return this._pageFilterSpells?.filterBox;
    }
    
    /**
     * The cached array of Charactermancer_Spell components. These components handle the selection of known spells from some source
     * (like class, subclass, or a feat). Atm really only used for class & subclass (merged as one component)
     * @returns {Charactermancer_Spell[]}
     */
    get compsSpellSpells() {
      return this._compsSpellSpells;
    }
    get compsSpellSpellSlotLevelSelect() {
      return this._compsSpellSpellSlotLevelSelect;
    }
    get compSpellAdditionalSpellRace() {
      return this._compSpellAdditionalSpellRace;
    }
    get compSpellAdditionalSpellBackground() {
      return this._compSpellAdditionalSpellBackground;
    }
    get compsSpellAdditionalSpellClass() {
      return this._compsSpellAdditionalSpellClass;
    }
    get compsSpellAdditionalSpellSubclass() {
      return this._compsSpellAdditionalSpellSubclass;
    }
    async pLoad() {
      await this._modalFilterSpells.pPreloadHidden();
    }
    
    async _spell_pRenderFilterBox(leftContent) {
      const btnFilter = $("<button class=\"btn-default btn-5et veapp__btn-filter\">Filter</button>");
      const btnFilterSummary = $("<button class=\"btn btn-default btn-5et\" title=\"Toggle Filter Summary Display\"><span class=\"glyphicon glyphicon-resize-small\"></span></button>");
      const inputFind = $("<input type=\"search\" class=\"search w-100 form-control h-initial\" placeholder=\"Find spell...\">");
      const btnReset = $("<button class=\"btn-5et btn-default veapp__btn-list-reset\">Reset</button>").click(() => inputFind.val('').keyup());
      const view = $("<div class=\"fltr__mini-view btn-group\"></div>");
      const btnSaveCopy = $("<button class=\"btn btn-default btn-xs mr-1\" title=\"Save a copy of the current filters, to use when filtering spell lists during import of &quot;prepared spell&quot; casters. For example, if you want your Cleric's spell list to include only PHB spells, you would filter (using the interface above) for PHB spells, then click this button. Note that all the spells that you have selected as learned or that you have selected as prepared will be imported regardless.\">Set Prepared Spell Filter</button>").click(() => {
        this._filterValuesSpellsCache = this._pageFilterSpells.filterBox.getValues();
        //ui.notifications.info("Set!");
        console.log("Set!");
      });
      const btnIncludeUA = ComponentUiUtil.$getBtnBool(this, "spells_isIncludeUaEtcSpellLists", {
        '$ele': $("<button class=\"btn btn-default btn-xs\" title=\"Include spell lists defined in Unearthed Arcana, Plane Shift, and other semi-official products when generating the list of spells which can be learned/prepared.\">Include UA/etc. Spell Lists</button>")
      });
      const hkSpellLists = () => this._compsSpellSpells.filter(Boolean).forEach(comp => comp.isIncludeUaEtcSpellLists = this._state.spells_isIncludeUaEtcSpellLists);
      this._addHookBase("spells_isIncludeUaEtcSpellLists", hkSpellLists);
      hkSpellLists();
      $$(leftContent)`
              <div class="ve-flex-v-stretch input-group input-group--top no-shrink">
                  ${btnFilter}
                  ${btnFilterSummary}
                  ${inputFind}
                  ${btnReset}
              </div>
              ${view}
              <div class="ve-flex-v-stretch input-group input-group--bottom mb-1 no-shrink">
                  <button class="btn-5et w-100" disabled></button>
              </div>
  
              <div class="mb-1 ve-flex-v-center">${btnSaveCopy}${btnIncludeUA}</div>
          `;
      await this._pageFilterSpells.pInitFilterBox({
        $iptSearch: inputFind,
        $btnReset: btnReset,
        $btnOpen: btnFilter,
        $btnToggleSummaryHidden: btnFilterSummary,
        $wrpMiniPills: view,
        namespace: "ActorCharactermancer.spells_page"
      });
      this._data.spell.forEach(sp => this._pageFilterSpells.mutateAndAddToFilters(sp));
      this._pageFilterSpells.trimState();
      this._pageFilterSpells.filterBox.render();
      this._filterValuesSpellsCache = this._pageFilterSpells.filterBox.getValues();
      UiUtil.bindTypingEnd({
        $ipt: inputFind,
        fnKeyup: () => {
          const term = List.getCleanSearchTerm(inputFind.val());
          if (this._lastSearchTermSpells === term) { return; }
          this._lastSearchTermSpells = term;
          this._compsSpellSpells.filter(Boolean).forEach(comp => comp.handleSearch(term));
        }
      });
      this._pageFilterSpells.filterBox.on(FilterBox.EVNT_VALCHANGE, this._spell_handleFilterChange.bind(this));
    }
    _spell_handleFilterChange() {
      const filterVals = this._pageFilterSpells.filterBox.getValues();
      this._compsSpellSpells.filter(Boolean).forEach(spell => spell.handleFilterChange(filterVals));
    }
    _spell_getFixedLearnedProgression(ix, cls, sc, targetLevel, { isExistingClass, isDefault = false } = {}) {
      const formData = this._compsSpellSpellSlotLevelSelect[ix] ? this._compsSpellSpellSlotLevelSelect[ix].getFormData() : null;
      return Charactermancer_Spell_Util.getFixedLearnedProgression({
        cls: cls,
        sc: sc,
        targetLevel: targetLevel,
        isExistingClass: isExistingClass,
        isDefault: isDefault,
        formDataSlotSelectFromComp: formData
      });
    }
    _spell_getMaxPreparedSpells(cls, subclass, targetLevel, {
      existingAbilityScores: existingAbilityScores
    } = {}) {
      const abilityScoresFromComp = this._parent.compAbility.getTotals();
      return Charactermancer_Spell_Util.getMaxPreparedSpells({
        cls: cls,
        sc: subclass,
        targetLevel: targetLevel,
        existingAbilityScores: existingAbilityScores,
        abilityScoresFromComp: abilityScoresFromComp
      });
    }

    //#region Hooks
    /**
     * @param {number} classIndex
     * @param {any} elements
     */
    _hk_onChangeClass(classIndex, {
        $stgClassSpells: stgClassSpells,
        $stgSpellsTable: stgSpellsTable,
        $dispClassNameLeft: dispClassNameLeft,
        $dispClassNameRight: dispClassNameRight,
        $stgClassAdditionalSpells: stgClassAdditionalSpells,
        $stgSubclassAdditionalSpells: stgSubclassAdditionalSpells,
        $wrpLeftInner: wrpLeftInner,
        $wrpRightInner: wrpRightInner,
        $dispSpell: dispSpell,
        $wrpSlotLevelSelect: wrpSlotLevelSelect,
        $wrpPreparedLearnedLhs: preparedLearnedLhs,
        $wrpPreparedLearnedRhs: preparedLearnedRhs
        }) {
        const {
            propIxClass: propIxClass,
            propIxSubclass: propIxSubclass,
            propTargetLevel: propTargetLevel
        } = ActorCharactermancerBaseComponent.class_getProps(classIndex);

        const cls = this._parent.compClass.getClass_({ propIxClass: propIxClass });
        const subcls = this._parent.compClass.getSubclass_({ cls: cls, propIxSubclass: propIxSubclass });

        //If our class is null or it is not a caster, wipe the spells component for it (if it exists) and abort
        if (!cls || !this.constructor._spell_isClassCaster(cls, subcls)) {
            this._hk_shared_doCleanupClassSubclass({
                $stgClassSpells: stgClassSpells,
                $stgSpellsTable: stgSpellsTable,
                $wrpLeftInner: wrpLeftInner,
                $wrpRightInner: wrpRightInner,
                ix: classIndex
            });
            return;
        }

        stgClassSpells.empty();
        stgSpellsTable.empty();

        //Create a component that can be found at this._compsSpellSpells[classIndex]
        this._hk_shared_doInitClassSubclass({
            ix: classIndex,
            cls: cls,
            sc: subcls,
            $wrpPreparedLearnedLhs: preparedLearnedLhs,
            $wrpPreparedLearnedRhs: preparedLearnedRhs,
            propTargetLevel: propTargetLevel
        });
        stgClassAdditionalSpells.empty();

        //If the class grants additional spells
        if (cls && cls.additionalSpells) {
            stgClassAdditionalSpells.showVe().append("<div class=\"bold mb-2\">Class Spells (" + cls.name + ")</div>");
            //Create an element to display this
            this._compsSpellAdditionalSpellClass[classIndex] = new Charactermancer_AdditionalSpellsSelect({
                spellDatas: this._data.spell,
                additionalSpells: cls.additionalSpells,
                modalFilterSpells: this._modalFilterSpells
            });
            this._compsSpellAdditionalSpellClass[classIndex].render(stgClassAdditionalSpells);

            //Create hooks to always mark these spells as prepared (just incase the component forgets sometime)
            const setAlwaysPrepared = () => {
                if (this._compsSpellSpells[classIndex]) {
                    this._compsSpellSpells[classIndex].alwaysPreparedSpellsClass =
                        MiscUtil.copy(this._compsSpellAdditionalSpellClass[classIndex].spellsAlwaysPrepared);
                }
            };
            this._compsSpellAdditionalSpellClass[classIndex].addHookAlwaysPreparedSpells(setAlwaysPrepared);
            const setExpandedSpells = () => {
                if (this._compsSpellSpells[classIndex]) {
                    this._compsSpellSpells[classIndex].expandedSpellsClass = 
                        MiscUtil.copy(this._compsSpellAdditionalSpellClass[classIndex].spellsExpanded);
                }
            };
            this._compsSpellAdditionalSpellClass[classIndex].addHookExpandedSpells(setExpandedSpells);
            const setAlwaysKnown = () => {
                if (this._compsSpellSpells[classIndex]) {
                    this._compsSpellSpells[classIndex].alwaysKnownSpellsClass = 
                    MiscUtil.copy(this._compsSpellAdditionalSpellClass[classIndex].spellsAlwaysKnown);
                }
            };
            this._compsSpellAdditionalSpellClass[classIndex].addHookAlwaysKnownSpells(setAlwaysKnown);
        }
        else {
            //Hide the element responsible for additional class spells
            stgClassAdditionalSpells.hideVe();
            this._compsSpellAdditionalSpellClass[classIndex] = null;
        }

        //Fire the hook responsible for subclass stuff
        this._hk_onChangeSubclass(classIndex, {
            $dispClassNameLeft: dispClassNameLeft,
            $dispClassNameRight: dispClassNameRight,
            $stgClassSpells: stgClassSpells,
            $stgSpellsTable: stgSpellsTable,
            $stgSubclassAdditionalSpells: stgSubclassAdditionalSpells,
            $wrpLeftInner: wrpLeftInner,
            $wrpRightInner: wrpRightInner
        });

        if (this._compsSpellSpells[classIndex] && this._compsSpellAdditionalSpellClass[classIndex]) {
            this._compsSpellSpells[classIndex].alwaysPreparedSpellsClass = MiscUtil.copy(this._compsSpellAdditionalSpellClass[classIndex].spellsAlwaysPrepared);
            this._compsSpellSpells[classIndex].expandedSpellsClass = MiscUtil.copy(this._compsSpellAdditionalSpellClass[classIndex].spellsExpanded);
            this._compsSpellSpells[classIndex].alwaysKnownSpellsClass = MiscUtil.copy(this._compsSpellAdditionalSpellClass[classIndex].spellsAlwaysKnown);
        }
        else {
            if (this._compsSpellSpells[classIndex]) {
            this._compsSpellSpells[classIndex].alwaysPreparedSpellsClass = [];
            }
            if (this._compsSpellSpells[classIndex]) {
            this._compsSpellSpells[classIndex].expandedSpellsClass = [];
            }
            if (this._compsSpellSpells[classIndex]) {
            this._compsSpellSpells[classIndex].alwaysKnownSpellsClass = [];
            }
        }

        //And finally, render
        this._hk_shared_doRenderClassSubclass({
            ix: classIndex,
            $stgClassSpells: stgClassSpells,
            $stgSpellsTable: stgSpellsTable,
            $dispSpell: dispSpell,
            $wrpSlotLevelSelect: wrpSlotLevelSelect
        });
    }
    _hk_shared_doCleanupClassSubclass({
      $stgClassSpells: stgClassSpells,
      $stgSpellsTable: stgSpellsTable,
      $wrpLeftInner: wrpLeftInner,
      $wrpRightInner: wrpRightInner,
      ix: ix
    }) {
      stgClassSpells.empty();
      stgSpellsTable.empty();
      wrpLeftInner.hideVe();
      wrpRightInner.hideVe();
      this._compsSpellSpells[ix] = null;
      this._compsSpellSpellSlotLevelSelect[ix] = null;
    }
    /**
     * Creates a Charactermancer_Spell and a Charactermancer_Spell_SlotLevelSelect for our class, and sets up hooks for updating learned progression. Does not render them.
     * @param {number} {ix:ix
     * @param {any} cls:cls
     * @param {any} sc:subcls
     * @param {any} $wrpPreparedLearnedLhs:wrpPreparedLearnedLhs
     * @param {any} $wrpPreparedLearnedRhs:wrpPreparedLearnedRhs
     * @param {number} propTargetLevel:propTargetLevel}
     * @returns {any}
     */
    _hk_shared_doInitClassSubclass({
        ix: ix,
        cls: cls,
        sc: subcls,
        $wrpPreparedLearnedLhs: wrpPreparedLearnedLhs,
        $wrpPreparedLearnedRhs: wrpPreparedLearnedRhs,
        propTargetLevel: propTargetLevel
        }) {
        const classMeta = this._parent.compClass.existingClassMetas[ix];

        //Create a component that handles spells originating from our class and subclass
        this._compsSpellSpells[ix] = new Charactermancer_Spell({
            actor: this._actor,
            existingClass: classMeta ? this._data.class[classMeta.ixClass] : null,
            existingCasterMeta: this._spell_getExistingCasterMeta({
                ix: ix,
                cls: cls,
                sc: subcls,
                existingClassMeta: classMeta
            }),
            spellDatas: this._data.spell,
            className: cls.name,
            classSource: cls.source,
            brewClassSpells: cls.classSpells,
            subclassName: subcls?.name,
            subclassShortName: subcls?.shortname,
            subclassSource: subcls?.source,
            brewSubclassSpells: subcls?.subclassSpells,
            brewSubSubclassSpells: subcls?.subSubclassSpells,
            pageFilter: this._pageFilterSpells,
            $wrpsPreparedLearned: [wrpPreparedLearnedLhs, wrpPreparedLearnedRhs],
            parent: this
        });

        this._compsSpellSpellSlotLevelSelect[ix] = new Charactermancer_Spell_SlotLevelSelect({
            className: cls.name,
            spellSlotLevelSelection: classMeta?.spellSlotLevelSelection
        });
        //Create a hook for updating how many spells we can learn
        const onPulseFixedLearnedProgression = () => {
            //Figure out the target level for this class
            const targetLevel = this._parent.compClass.state[propTargetLevel];
            if (this._compsSpellSpells[ix]) { //Make sure we have a component to handle spells for this class
                //Then update the component about how many spells we can learn
                this._compsSpellSpells[ix].fixedLearnedProgression = this._spell_getFixedLearnedProgression(ix, cls, subcls, targetLevel);
                this._compsSpellSpells[ix].fixedLearnedProgressionDefault = this._spell_getFixedLearnedProgression(ix, cls, subcls, targetLevel, { isDefault: true });
            }
        };
        this._compsSpellSpellSlotLevelSelect[ix].addHookPulseFixedLearnedProgression(onPulseFixedLearnedProgression);
        //Then fire the hook once
        onPulseFixedLearnedProgression();
    }
    _hk_shared_doRenderClassSubclass({
      ix: ix,
      $stgClassSpells: stgClassSpells,
      $stgSpellsTable: stgSpellsTable,
      $dispSpell: dispSpell,
      $wrpSlotLevelSelect: wrpSlotLevelSelect
    }) {
        //Render the spells component
      this.compsSpellSpells[ix].render(stgClassSpells, dispSpell);
      //Then render the spellslotlevelselect component
      this._compsSpellSpellSlotLevelSelect[ix].render(wrpSlotLevelSelect);
      //Get some filter values and apply them
      const filterValues = this._pageFilterSpells.filterBox.getValues();
      this._compsSpellSpells[ix].handleFilterChange(filterValues);
      //If our race grants us additional spells, we need to make sure this component is aware of that
      if (this._compSpellAdditionalSpellRace) {
        this._compsSpellSpells[ix].expandedSpellsRace =
            MiscUtil.copy(this._compSpellAdditionalSpellRace.spellsExpanded);
      }
      //If our background grants us additional spells, we need to make sure this component is aware of that
      if (this._compSpellAdditionalSpellBackground) {
        this._compsSpellSpells[ix].expandedSpellsBackground = 
            MiscUtil.copy(this._compSpellAdditionalSpellBackground.spellsExpanded);
      }
    }
    _hk_shared_doUpdateRenderedClassSubclass({ ix }) {
      if (!this._compsSpellSpells[ix]) { return; }
      const filterValues = this._pageFilterSpells.filterBox.getValues();
      this._compsSpellSpells[ix].handleFilterChange(filterValues);
    }
    _hk_onChangeAbilityScores(classIx) {
      const { propIxClass, propTargetLevel, propIxSubclass } = ActorCharactermancerBaseComponent.class_getProps(classIx);
      const classInfo = this._parent.compClass.getClass_({ propIxClass: propIxClass });
      const subclassInfo = this._parent.compClass.getSubclass_({ cls: classInfo, propIxSubclass: propIxSubclass });
      const level = this._parent.compClass.state[propTargetLevel];
      if (this._compsSpellSpells[classIx]) {
        this._compsSpellSpells[classIx].maxPrepared = this._spell_getMaxPreparedSpells(classInfo, subclassInfo, level);
      }
    }
    _hk_onChangeSubclass(classIndex, {
      $stgClassSpells: stgClassSpells,
      $stgSpellsTable: stgSpellsTable,
      $dispClassNameLeft: dispClassNameLeft,
      $dispClassNameRight: dispClassNameRight,
      $stgSubclassAdditionalSpells: stgSubclassAdditionalSpells,
      $wrpLeftInner: wrpLeftInner,
      $wrpRightInner: wrpRightInner,
      $wrpPreparedLearnedLhs: wrpPreparedLearnedLhs,
      $wrpPreparedLearnedRhs: wrpPreparedLearnedRhs,
      $dispSpell: dispSpell,
      $wrpSlotLevelSelect: wrpSlotLevelSelect
    }) {
      const {
        propIxClass: propIxClass,
        propIxSubclass: propIxSubclass,
        propTargetLevel: propTargetLevel
      } = ActorCharactermancerBaseComponent.class_getProps(classIndex);
      const cls = this._parent.compClass.getClass_({ propIxClass: propIxClass });
      const subcls = this._parent.compClass.getSubclass_({ cls: cls, propIxSubclass: propIxSubclass });
      const title = cls ? '' + cls.name + (subcls ? " (" + subcls.name + ')' : '') : '';
      dispClassNameLeft.text(title);
      dispClassNameRight.text(title);

      this._hk_onChangeSubclass_pRenderSpellTable(classIndex, {
        cls: cls,
        sc: subcls,
        $stgSpellsTable: stgSpellsTable
      });
      const isClassCaster = this.constructor._spell_isClassCaster(cls, subcls);
      const isMissingClassComp = isClassCaster && !this._compsSpellSpells[classIndex];
      if (!isClassCaster && this._compsSpellSpells[classIndex]) {
        this._hk_shared_doCleanupClassSubclass({
          '$stgClassSpells': stgClassSpells,
          '$stgSpellsTable': stgSpellsTable,
          '$wrpLeftInner': wrpLeftInner,
          '$wrpRightInner': wrpRightInner,
          'ix': classIndex
        });
        return;
      }
      else if (isMissingClassComp) {
        this._hk_shared_doInitClassSubclass({
          'ix': classIndex,
          'cls': cls,
          'sc': subcls,
          '$wrpPreparedLearnedLhs': wrpPreparedLearnedLhs,
          '$wrpPreparedLearnedRhs': wrpPreparedLearnedRhs,
          'propTargetLevel': propTargetLevel
        });
      }

      //Handle if our subclass grants additional spells
      stgSubclassAdditionalSpells.empty();
      if (subcls && subcls.additionalSpells) {
        stgSubclassAdditionalSpells.showVe().append("<div class=\"bold mb-2\">Subclass Spells (" + subcls.name + ")</div>");
        this._compsSpellAdditionalSpellSubclass[classIndex] = new Charactermancer_AdditionalSpellsSelect({
          spellDatas: this._data.spell,
          additionalSpells: subcls.additionalSpells,
          modalFilterSpells: this._modalFilterSpells
        });
        this._compsSpellAdditionalSpellSubclass[classIndex].render(stgSubclassAdditionalSpells);
        const fnAlwaysPrepared = () => {
          if (this._compsSpellSpells[classIndex]) {
            this._compsSpellSpells[classIndex].alwaysPreparedSpellsSubclass = MiscUtil.copy(this._compsSpellAdditionalSpellSubclass[classIndex].spellsAlwaysPrepared);
          }
        };
        this._compsSpellAdditionalSpellSubclass[classIndex].addHookAlwaysPreparedSpells(fnAlwaysPrepared);
        const fnExpanded = () => {
          if (this._compsSpellSpells[classIndex]) {
            this._compsSpellSpells[classIndex].expandedSpellsSubclass = MiscUtil.copy(this._compsSpellAdditionalSpellSubclass[classIndex].spellsExpanded);
          }
        };
        this._compsSpellAdditionalSpellSubclass[classIndex].addHookExpandedSpells(fnExpanded);
        const fnAlwaysKnown = () => {
          if (this._compsSpellSpells[classIndex]) {
            this._compsSpellSpells[classIndex].alwaysKnownSpellsSubclass = MiscUtil.copy(this._compsSpellAdditionalSpellSubclass[classIndex].spellsAlwaysKnown);
          }
        };
        this._compsSpellAdditionalSpellSubclass[classIndex].addHookAlwaysKnownSpells(fnAlwaysKnown);
      }
      else {
        stgSubclassAdditionalSpells.hideVe();
        this._compsSpellAdditionalSpellSubclass[classIndex] = null;
      }

      this._hk_onChangeLevel(classIndex, {
        '$wrpLeftInner': wrpLeftInner,
        '$wrpRightInner': wrpRightInner
      });
      const maxCasterProgression = DataConverter.getMaxCasterProgression(cls?.casterProgression, subcls?.casterProgression);
      if (this._compsSpellSpells[classIndex]) {
        this._compsSpellSpells[classIndex].subclassName = subcls?.["name"];
        this._compsSpellSpells[classIndex].subclassShortName = subcls?.["shortName"];
        this._compsSpellSpells[classIndex].subclassSource = subcls?.['source'];
        this._compsSpellSpells[classIndex].casterProgression = maxCasterProgression;
      }
      if (this._compsSpellSpellSlotLevelSelect[classIndex]) {
        this._compsSpellSpellSlotLevelSelect[classIndex].casterProgression = maxCasterProgression;
      }
      if (this._compsSpellSpells[classIndex] && this._compsSpellAdditionalSpellSubclass[classIndex]) {
        this._compsSpellSpells[classIndex].alwaysPreparedSpellsSubclass = MiscUtil.copy(this._compsSpellAdditionalSpellSubclass[classIndex].spellsAlwaysPrepared);
        this._compsSpellSpells[classIndex].expandedSpellsSubclass = MiscUtil.copy(this._compsSpellAdditionalSpellSubclass[classIndex].spellsExpanded);
        this._compsSpellSpells[classIndex].alwaysKnownSpellsSubclass = MiscUtil.copy(this._compsSpellAdditionalSpellSubclass[classIndex].spellsAlwaysKnown);
      } else {
        if (this._compsSpellSpells[classIndex]) {
          this._compsSpellSpells[classIndex].alwaysPreparedSpellsSubclass = [];
        }
        if (this._compsSpellSpells[classIndex]) {
          this._compsSpellSpells[classIndex].expandedSpellsSubclass = [];
        }
        if (this._compsSpellSpells[classIndex]) {
          this._compsSpellSpells[classIndex].alwaysKnownSpellsSubclass = [];
        }
      }
      if (isMissingClassComp) {
        this._hk_shared_doRenderClassSubclass({
          ix: classIndex,
          $stgClassSpells: stgClassSpells,
          $dispSpell: dispSpell,
          $wrpSlotLevelSelect: wrpSlotLevelSelect
        });
      }
      else {
        this._hk_shared_doUpdateRenderedClassSubclass({ ix: classIndex });
      }
    }
    async _hk_onChangeSubclass_pRenderSpellTable(classIndex, { cls, sc, $stgSpellsTable }) {
      const {
        lockChangeSubclassTable: lockChangeSubclassTable
      } = this.constructor._spell_getLocks(classIndex);
      try {
        await this._pLock(lockChangeSubclassTable);
        await this._hk_onChangeSubclass_pRenderSpellTable_(classIndex, {
          cls: cls,
          sc: sc,
          $stgSpellsTable: $stgSpellsTable
        });
      }
      finally {
        this._unlock(lockChangeSubclassTable);
      }
    }
    async _hk_onChangeSubclass_pRenderSpellTable_(classIndex, { cls, sc, $stgSpellsTable }) {
      const classInfo = cls ? await DataLoader.pCacheAndGet("class", cls.source, UrlUtil.URL_TO_HASH_BUILDER["class"](cls)) : null;
      const subclassInfo = sc ? await DataLoader.pCacheAndGet("subclass", sc.source, UrlUtil.URL_TO_HASH_BUILDER.subclass(sc)) : null;
      const table = DataConverterClass.getRenderedClassTableFromDereferenced(classInfo, subclassInfo, { isSpellsOnly: true });
      $stgSpellsTable.html('').fastSetHtml(table);
    }
    static _spell_getLocks(ix) {
      return { lockChangeSubclassTable: "spell_" + ix + '_changeSubclassTable' };
    }
    _hk_onChangeLevel(classIx, {
        $wrpLeftInner: wrpLeftInner,
        $wrpRightInner: wrpRightInner
        }) {
        const {
            propIxClass: propIxClass,
            propIxSubclass: propIxSubclass,
            propCurLevel: propCurLevel,
            propTargetLevel: propTargetLevel
        } = ActorCharactermancerBaseComponent.class_getProps(classIx);
        const cls = this._parent.compClass.getClass_({
            'propIxClass': propIxClass
        });
        const subcls = this._parent.compClass.getSubclass_({
            'cls': cls,
            'propIxSubclass': propIxSubclass
        });
        const curLevel = this._parent.compClass.state[propCurLevel] ?? 0;
        const targetLevel = this._parent.compClass.state[propTargetLevel];
        const casterProgression = DataConverter.getMaxCasterProgression(cls?.casterProgression, subcls?.casterProgression);
        const casterProgressionMeta = Charactermancer_Spell_Util.getCasterProgressionMeta({
            casterProgression: casterProgression,
            curLevel: curLevel,
            targetLevel: targetLevel
        });

        if (this._compsSpellSpells[classIx]) {
            //Set high and low levels
            if (casterProgressionMeta) {
                const { spellLevelLow: spellLvlLow, spellLevelHigh: spellLvlHigh } = casterProgressionMeta;
                this._compsSpellSpells[classIx].spellLevelLow = spellLvlLow;
                this._compsSpellSpells[classIx].spellLevelHigh = spellLvlHigh;
            }
            else {
                this._compsSpellSpells[classIx].spellLevelLow = null;
                this._compsSpellSpells[classIx].spellLevelHigh = null;
            }

            //Set max learned cantrips
            this._compsSpellSpells[classIx].maxLearnedCantrips = Charactermancer_Spell_Util.getMaxLearnedCantrips({
                cls: cls,
                sc: subcls,
                targetLevel: targetLevel
            });
            this._compsSpellSpells[classIx].fixedLearnedProgression = this._spell_getFixedLearnedProgression(classIx, cls, subcls, targetLevel);
            this._compsSpellSpells[classIx].fixedLearnedProgressionDefault = this._spell_getFixedLearnedProgression(classIx, cls, subcls, targetLevel, {
            'isDefault': true
            });
            this._compsSpellSpells[classIx].isIncludeUaEtcSpellLists = this._state.spells_isIncludeUaEtcSpellLists;
        }
        this._hk_onChangeAbilityScores(classIx);
        if (this._compsSpellSpellSlotLevelSelect[classIx]) {
            this._compsSpellSpellSlotLevelSelect[classIx].curLevel = curLevel;
            this._compsSpellSpellSlotLevelSelect[classIx].targetLevel = targetLevel;
            this._compsSpellSpellSlotLevelSelect[classIx].spellsKnownProgression = cls?.["spellsKnownProgression"] || subcls?.["spellsKnownProgression"];
            this._compsSpellSpellSlotLevelSelect[classIx].casterProgression = casterProgression;
            this._compsSpellSpellSlotLevelSelect[classIx].spellsKnownProgressionFixed = cls?.["spellsKnownProgressionFixed"] || subcls?.["spellsKnownProgressionFixed"];
            this._compsSpellSpellSlotLevelSelect[classIx].spellsKnownProgressionFixedAllowLowerLevel = cls?.['spellsKnownProgressionFixedAllowLowerLevel'] || subcls?.["spellsKnownProgressionFixedAllowLowerLevel"];
        }
        if (this._compsSpellAdditionalSpellClass[classIx]) {
            this._compsSpellAdditionalSpellClass[classIx].curLevel = curLevel;
            this._compsSpellAdditionalSpellClass[classIx].targetLevel = targetLevel;
            if (casterProgressionMeta) {
            const { spellLevelLow, spellLevelHigh } = casterProgressionMeta;
            this._compsSpellAdditionalSpellClass[classIx].spellLevelLow = spellLevelLow;
            this._compsSpellAdditionalSpellClass[classIx].spellLevelHigh = spellLevelHigh;
            } else {
            this._compsSpellAdditionalSpellClass[classIx].spellLevelLow = null;
            this._compsSpellAdditionalSpellClass[classIx].spellLevelHigh = null;
            }
        }
        if (this._compsSpellAdditionalSpellSubclass[classIx]) {
            this._compsSpellAdditionalSpellSubclass[classIx].curLevel = curLevel;
            this._compsSpellAdditionalSpellSubclass[classIx].targetLevel = targetLevel;
            if (casterProgressionMeta) {
                const { spellLevelLow, spellLevelHigh } = casterProgressionMeta;
                this._compsSpellAdditionalSpellSubclass[classIx].spellLevelLow = spellLevelLow;
                this._compsSpellAdditionalSpellSubclass[classIx].spellLevelHigh = spellLevelHigh;
            }
            else {
                this._compsSpellAdditionalSpellSubclass[classIx].spellLevelLow = null;
                this._compsSpellAdditionalSpellSubclass[classIx].spellLevelHigh = null;
            }
        }
        if (cls) {
            const isCasterClassAtLevel = this.constructor._spell_isCasterClassAtLevel(cls, subcls, targetLevel);
            wrpLeftInner.toggleVe(isCasterClassAtLevel);
            const isClassCaster = this.constructor._spell_isClassCaster(cls, subcls);
            wrpRightInner.toggleVe(isClassCaster);
        }
    }
    //#endregion
    
    static _spell_isClassCaster(_class, _subclass) {
      return _class?.casterProgression || _subclass?.casterProgression
       || _class?.additionalSpells || _subclass?.additionalSpells
        || _class?.cantripProgression || _subclass?.cantripProgression;
    }
    static _spell_isCasterClassAtLevel(_class, _subclass, _level) {
      if (!this._spell_isClassCaster(_class, _subclass)) { return false; }
      if (_level == null) { return false; }
      const { casterProgression: casterProgression } = Charactermancer_Class_Util.getCasterProgression(_class, _subclass, {targetLevel: _level });
      const progression = UtilDataConverter.CASTER_TYPE_TO_PROGRESSION[casterProgression];
      if ((progression?.[_level - 1] || []).some(Boolean)) { return true; }
      if (this._spell_isCasterClassAtLevel_additionalSpells(_class?.["additionalSpells"], _level)) { return true; }
      if (this._spell_isCasterClassAtLevel_additionalSpells(_subclass?.["additionalSpells"], _level)) { return true; }
      if (this._spell_isCasterClassAtLevel_cantrips(_class?.["cantripProgression"], _level)) { return true; }
      if (this._spell_isCasterClassAtLevel_cantrips(_subclass?.['cantripProgression'], _level)) { return true; }
      return false;
    }
    static _spell_isCasterClassAtLevel_additionalSpells(spells, level) {
      if (!spells) { return false; }
      if (level == null) { return false; }
      return spells.some(sp => this._spell_isCasterClassAtLevel_additionalSpellsBlock(sp, level));
    }
    static _spell_isCasterClassAtLevel_additionalSpellsBlock(spells, level) {
      const types = Object.keys(spells);
      for (const type of types) {
        switch (type) {
          case "innate":
          case "prepared":
          case "expanded":
            {
              const isOk = Object.keys(spells[type] || {}).some(lvl => {
                const regex = /^s(\d+)$/i.exec(lvl);
                if (regex) { return false; }
                if (isNaN(lvl)) { return false; }
                return Number(lvl) <= level;
              });
              if (isOk) { return true; }
            }
        }
      }
      return false;
    }
    static _spell_isCasterClassAtLevel_cantrips(spells, level) {
      return !!spells?.[level - 1];
    }
    _spell_getExistingCasterMeta({
      ix: ix,
      cls: cls,
      sc: sc,
      existingClassMeta: existingClassMeta
    }) {
      if (!existingClassMeta?.level) {
        return null;
      }
      const slotForm = this._compsSpellSpellSlotLevelSelect[ix] ?
        this._compsSpellSpellSlotLevelSelect[ix].getFormData() : null;
      const abilityTotals = this._parent.compAbility.getTotals();
      return Charactermancer_Spell_Util.getExistingCasterMeta({
        cls: cls,
        sc: sc,
        actor: this._actor,
        targetLevel: existingClassMeta.level,
        formDataSlotSelectFromComp: slotForm,
        abilityScoresFromComp: abilityTotals
      });
    }
    _getDefaultState() {
      return {
        'spells_isIncludeUaEtcSpellLists': false
      };
    }

    static findSpellByUID(spellUid, spellDatas){
        const matches = spellDatas.filter(sp => {
            //Create a uid from the spell
            const uid = `${sp.name}|${sp.source}`.toLowerCase();//UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_ITEMS]({ name:n, source:src });
            //then try to match it
            return spellUid.toLowerCase() == uid;
        });
        if(matches.length > 1){throw new Error("Not supposed to return more than one result", spellUid);}
        else if(matches.length < 1){
            console.error("Could not find a match to spell", spellUid, "among our loaded spells. Did you forget to load a source?");
        }
        return matches[0];
    }
    
}
class Charactermancer_Spell_Util {
    /**
     * Description
     * @param {{casterProgression:any, curLevel:number, targetLevel:number, isBreakpointsOnly:boolean}} options
     * @returns {any}
     */
    static getCasterProgressionMeta({casterProgression, curLevel, targetLevel, isBreakpointsOnly=false}) {
        if (casterProgression == null || curLevel == null || targetLevel == null){return null;}

        if(SETTINGS.GET_CASTERPROG_UP_TO_CURLEVEL){curLevel = 0;}

        const progression = UtilDataConverter.CASTER_TYPE_TO_PROGRESSION[casterProgression];
        if (!progression){return null;}

        const levelToSpellLevel = [];
        let lastSpellLevel = 0;
        progression.forEach(slots=>{
            let isFound = false;
            for (let i = 0; i < slots.length; ++i) {
                const spellLevel = i + 1;
                if (slots[i] && spellLevel > lastSpellLevel) {
                    levelToSpellLevel.push(spellLevel);
                    lastSpellLevel = spellLevel;
                    isFound = true;
                    break;
                }
            }
            if (!isFound) {
                if (isBreakpointsOnly){levelToSpellLevel.push(null);}
                else{levelToSpellLevel.push(levelToSpellLevel.length ? levelToSpellLevel.last() : null);}
            }
        }
        );

        const spannedLevels = levelToSpellLevel.slice(curLevel, targetLevel).filter(Boolean);
        if (!spannedLevels.length){return null;}

        const spellLevelLow = Math.min(...spannedLevels);
        const spellLevelHigh = Math.max(...spannedLevels);

        const deltaLevels = Math.max(0, targetLevel - curLevel);
        const deltaSpellLevels = spellLevelHigh - spellLevelLow;

        return {
            spellLevelLow,
            spellLevelHigh,
            deltaLevels,
            deltaSpellLevels,
        };
    }

    static getCasterCantripProgressionMeta({cls, sc, curLevel, targetLevel}) {
        if (cls == null || curLevel == null || targetLevel == null)
            return null;

        const atCurLevel = curLevel === 0 ? 0 : this.getMaxLearnedCantrips({
            cls,
            sc,
            targetLevel: curLevel
        });
        const atTargetLevel = this.getMaxLearnedCantrips({
            cls,
            sc,
            targetLevel: targetLevel
        });
        if (atCurLevel == null || atTargetLevel == null)
            return null;

        const deltaLevels = Math.max(0, targetLevel - curLevel);
        const deltaMaxCantrips = atTargetLevel - atCurLevel;

        return {
            maxCantripsLow: atCurLevel,
            maxCantripsHigh: atTargetLevel,
            deltaLevels,
            deltaMaxCantrips,
        };
    }

    static getMaxLearnedCantrips({cls, sc, targetLevel}) {
        if (!cls || targetLevel == null){return null;}

        let cantripProgression = DataConverter.getMaxCantripProgression(cls.cantripProgression, sc?.cantripProgression);

        if (PrereleaseUtil.hasSourceJson(cls.source) || (sc && PrereleaseUtil.hasSourceJson(sc.source)))
            cantripProgression = cantripProgression || this._getApproximateCantripProgression({
                cls,
                sc
            });
        if (BrewUtil2.hasSourceJson(cls.source) || (sc && BrewUtil2.hasSourceJson(sc.source)))
            cantripProgression = cantripProgression || this._getApproximateCantripProgression({
                cls,
                sc
            });

        if (!cantripProgression)
            return null;

        return cantripProgression[targetLevel - 1];
    }

    static _getApproximateCantripProgression({cls, sc}) {
        return this._getApproximateNumberCol({
            cls,
            sc,
            colNameLower: "cantrips known"
        });
    }

    static _getApproximateSpellsKnownProgression(cls, sc) {
        return this._getApproximateNumberCol({
            cls,
            sc,
            colNameLower: "spells known"
        });
    }

    static _getApproximateNumberCol({cls, sc, colNameLower}) {
        const tableGroups = (PrereleaseUtil.hasSourceJson(cls.source) ? cls.classTableGroups : null) || ((sc && PrereleaseUtil.hasSourceJson(sc.source)) ? sc?.subclassTableGroups : null) || (BrewUtil2.hasSourceJson(cls.source) ? cls.classTableGroups : null) || ((sc && BrewUtil2.hasSourceJson(sc.source)) ? sc?.subclassTableGroups : null);
        if (!tableGroups)
            return;
        for (const tblGroup of tableGroups) {
            const ixCol = (tblGroup.colLabels || []).findIndex(it=>`${it}`.toLowerCase().includes(colNameLower));
            if (!~ixCol)
                continue;

            const numbers = (tblGroup.rowsSpellProgression || tblGroup.rows || []).map(row=>row.filter((_,ixCell)=>ixCell === ixCol)).flat();

            if (numbers.every(it=>!isNaN(it)))
                return numbers.map(it=>Number(it));
        }
    }

    static getFixedLearnedProgression({cls, sc, targetLevel, isExistingClass, isDefault=false, formDataSlotSelectFromComp}={}) {
        if (targetLevel == null)
            return null;

        const casterProgression = DataConverter.getMaxCasterProgression(cls.casterProgression, sc?.casterProgression);

        if (!casterProgression || !UtilDataConverter.CASTER_TYPE_TO_PROGRESSION[casterProgression])
            return null;

        const totalKnownPerLevel = [...new Array(9)].map(()=>0);

        let isAnyData = false;

        const formDataSlotSelect = (isExistingClass || isDefault) ? Charactermancer_Spell_SlotLevelSelect.getDefaultFormData({
            targetLevel,
            casterProgression,
            spellsKnownProgression: cls?.spellsKnownProgression || sc?.spellsKnownProgression,
            spellsKnownProgressionFixed: cls?.spellsKnownProgressionFixed || sc?.spellsKnownProgressionFixed,
        }) : formDataSlotSelectFromComp;

        if (formDataSlotSelect) {
            isAnyData = isAnyData || formDataSlotSelect?.isAnyData;
            if (formDataSlotSelect?.data)
                formDataSlotSelect.data.forEach((it,i)=>totalKnownPerLevel[i] += it);
        }

        if (cls.spellsKnownProgressionFixedByLevel) {
            isAnyData = true;

            Object.entries(cls.spellsKnownProgressionFixedByLevel).forEach(([lvl,spellSummary])=>{
                if (Number(lvl) > targetLevel)
                    return;

                Object.entries(spellSummary).forEach(([lvlSpell,count])=>{
                    lvlSpell = Number(lvlSpell);
                    totalKnownPerLevel[lvlSpell - 1] += count;
                }
                );
            }
            );
        }

        if (!isAnyData)
            return null;

        return totalKnownPerLevel;
    }

    static getMaxPreparedSpells({cls, sc, targetLevel, existingAbilityScores, abilityScoresFromComp}={}) {
        if (!cls || targetLevel == null)
            return null;

        const casterProgression = DataConverter.getMaxCasterProgression(cls.casterProgression, sc?.casterProgression);

        if (!casterProgression || !UtilDataConverter.CASTER_TYPE_TO_PROGRESSION[casterProgression])
            return null;

        const spellSlotsAtLevel = UtilDataConverter.CASTER_TYPE_TO_PROGRESSION[casterProgression][targetLevel - 1];
        if (!spellSlotsAtLevel)
            return null;

        if (!spellSlotsAtLevel.some(Boolean))
            return null;

        if (cls.preparedSpellsProgression || sc?.preparedSpellsProgression)
            return this._getMaxPreparedSpells_preparedSpellsProgression({
                cls,
                sc,
                targetLevel,
                existingAbilityScores,
                abilityScoresFromComp
            });
        return this._getMaxPreparedSpells_preparedSpells({
            cls,
            sc,
            targetLevel,
            existingAbilityScores,
            abilityScoresFromComp
        });
    }

    static _getMaxPreparedSpells_preparedSpells({cls, sc, targetLevel, existingAbilityScores, abilityScoresFromComp}) {
        let preparedSpellExpression = cls.preparedSpells;

        if ((PrereleaseUtil.hasSourceJson(cls.source) || BrewUtil2.hasSourceJson(cls.source)) && !this._hasWellDefinedSpellData(cls, sc)) {
            preparedSpellExpression = preparedSpellExpression || this._getApproximatePreparedFormula(cls, sc);
        }

        if (!preparedSpellExpression)
            return null;

        const totalsAsi = abilityScoresFromComp;
        const preparedSpellExpressionEvaluable = preparedSpellExpression.replace(/<\$([^$]+)\$>/g, (...m)=>{
            switch (m[1]) {
            case "level":
                return targetLevel;
            case "str_mod":
                return this._getMaxPreparedSpells_getAbilityScore({
                    ability: "str",
                    totalsAsi,
                    existingAbilityScores
                });
            case "dex_mod":
                return this._getMaxPreparedSpells_getAbilityScore({
                    ability: "dex",
                    totalsAsi,
                    existingAbilityScores
                });
            case "con_mod":
                return this._getMaxPreparedSpells_getAbilityScore({
                    ability: "con",
                    totalsAsi,
                    existingAbilityScores
                });
            case "int_mod":
                return this._getMaxPreparedSpells_getAbilityScore({
                    ability: "int",
                    totalsAsi,
                    existingAbilityScores
                });
            case "wis_mod":
                return this._getMaxPreparedSpells_getAbilityScore({
                    ability: "wis",
                    totalsAsi,
                    existingAbilityScores
                });
            case "cha_mod":
                return this._getMaxPreparedSpells_getAbilityScore({
                    ability: "cha",
                    totalsAsi,
                    existingAbilityScores
                });
            default:
                throw new Error(`Unknown variable "${m[1]}"`);
            }
        }
        );

        const outRaw = eval(preparedSpellExpressionEvaluable);
        if (isNaN(outRaw)) {
            console.warn(...LGT, `Could not evaluate expression "${preparedSpellExpressionEvaluable}" (originally "${preparedSpellExpression}") as a number!`);
            return null;
        }

        return Math.max(1, Math.floor(outRaw));
    }

    static _getMaxPreparedSpells_preparedSpellsProgression({cls, sc, targetLevel}) {
        const progression = sc?.preparedSpellsProgression || cls.preparedSpellsProgression;
        return progression[Math.max(0, targetLevel - 1)] || 0;
    }

    static getMaxPreparedSpellsFormula({cls, sc}={}) {
        if (!cls)
            return null;

        const casterProgression = DataConverter.getMaxCasterProgression(cls.casterProgression, sc?.casterProgression);

        if (!casterProgression || !UtilDataConverter.CASTER_TYPE_TO_PROGRESSION[casterProgression])
            return null;

        let preparedSpellExpression = cls.preparedSpells;

        if ((PrereleaseUtil.hasSourceJson(cls.source) || BrewUtil2.hasSourceJson(cls.source)) && !this._hasWellDefinedSpellData(cls, sc)) {
            preparedSpellExpression = preparedSpellExpression || this._getApproximatePreparedFormula(cls, sc);
        }

        if (!preparedSpellExpression)
            return null;

        const preparedSpellExpressionEvaluable = preparedSpellExpression.replace(/<\$([^$]+)\$>/g, (...m)=>{
            switch (m[1]) {
            case "level":
                return `@classes.${Parser.stringToSlug(cls.name)}.levels`;
            case "str_mod":
            case "dex_mod":
            case "con_mod":
            case "int_mod":
            case "wis_mod":
            case "cha_mod":
                return `@abilities.${m[1].toLowerCase().slice(0, 3)}.mod`;
            default:
                throw new Error(`Unknown variable "${m[1]}"`);
            }
        }
        );

        return `max(1, floor(${preparedSpellExpressionEvaluable}))`;
    }

    static _getMaxPreparedSpells_getAbilityScore({totalsAsi, existingAbilityScores, ability}) {
        if (existingAbilityScores)
            return existingAbilityScores[ability] || 0;
        return Parser.getAbilityModNumber(totalsAsi?.totals?.[totalsAsi.mode]?.[ability] || 0);
    }

    static _hasWellDefinedSpellData(cls, sc) {
        return ["cantripProgression", "preparedSpells", "preparedSpellsProgression", "spellsKnownProgression", "spellsKnownProgressionFixed", "spellsKnownProgressionFixedAllowLowerLevel", "spellsKnownProgressionFixedByLevel", ].some(prop=>cls?.[prop] != null || sc?.[prop] != null);
    }

    static _getApproximatePreparedFormula(cls, sc) {
        if (!cls)
            return null;

        const casterProgression = DataConverter.getMaxCasterProgression(cls.casterProgression, sc?.casterProgression);

        if (!casterProgression || (!cls.classTableGroups && !sc?.subclassTableGroups) || casterProgression === "pact")
            return null;

        const hasSpellsKnown = [cls.classTableGroups, sc?.subclassTableGroups].filter(Boolean).some(tableGroups=>{
            tableGroups.map(it=>it.colLabels || []).flat().map(lbl=>Renderer.stripTags(`${lbl}`.trim())).some(it=>{
                const parts = it.toLowerCase().split(/[^a-z0-9]/g).map(it=>it.trim()).filter(Boolean);
                return parts.some(pt=>pt === "spell" || pt === "spells") && parts.some(pt=>pt === "known");
            }
            );
        }
        );

        if (hasSpellsKnown)
            return null;

        return `<$level$> ${casterProgression !== "full" ? `/ 2 ` : ""}+ ${cls.spellcastingAbility ? `<$${cls.spellcastingAbility}_mod$>` : "5"}`;
    }

    /**
     * Description
     * @param {any} {cls
     * @param {any} sc
     * @param {any} actor
     * @param {any} targetLevel
     * @param {any} formDataSlotSelectFromComp=null
     * @param {any} abilityScoresFromComp=null}
     * @returns {{maxLearnedCantrips:any, fixedLearnedProgression:any,
     * maxPreparedSpells:any, spellLevelLow:any, spellLevelLowHigh:any}}
     */
    static getExistingCasterMeta({cls, sc, actor, targetLevel, formDataSlotSelectFromComp=null, abilityScoresFromComp=null}) {
        if (!targetLevel){return null;}

        const casterProgression = DataConverter.getMaxCasterProgression(cls?.casterProgression, sc?.casterProgression);
        const casterProgressionMeta = Charactermancer_Spell_Util.getCasterProgressionMeta({
            casterProgression,
            curLevel: 0,
            targetLevel: targetLevel
        });

        return {
            maxLearnedCantrips: this.getMaxLearnedCantrips({
                cls,
                sc,
                targetLevel
            }),
            fixedLearnedProgression: this.getFixedLearnedProgression({
                cls,
                sc,
                targetLevel,
                isExistingClass: true,
                formDataSlotSelectFromComp
            }),
            maxPreparedSpells: this.getMaxPreparedSpells({
                cls,
                sc,
                targetLevel,
                existingAbilityScores: Charactermancer_Util.getCurrentAbilityScores(actor),
                abilityScoresFromComp
            }),
            spellLevelLow: casterProgressionMeta?.spellLevelLow,
            spellLevelLowHigh: casterProgressionMeta?.spellLevelHigh,
        };
    }
}

class Charactermancer_Spell_SlotLevelSelect extends BaseComponent {
    constructor({className, spellSlotLevelSelection}) {
        super();
        this._className = className;
        this._prevSpellSlotLevelSelection = spellSlotLevelSelection;
    }

    render($wrp) {
        const $wrpInner = $(`<div class="ve-flex-col w-100"></div>`).appendTo($wrp.empty());

        const hkIsVisible = ()=>$wrpInner.toggleVe(this._isAnyChoice());
        this._addHookBase("curLevel", hkIsVisible);
        this._addHookBase("targetLevel", hkIsVisible);
        this._addHookBase("casterProgression", hkIsVisible);
        this._addHookBase("spellsKnownProgressionFixed", hkIsVisible);
        this._addHookBase("spellsKnownProgressionFixedAllowLowerLevel", hkIsVisible);
        this._addHookBase("spellsKnownProgressionFixedAllowHigherLevel", hkIsVisible);
        this._addHookBase("spellsKnownProgression", hkIsVisible);
        hkIsVisible();

        const hkPopulateGenericKnownState = ()=>this._doPopulateGenericKnownState();
        this._addHookBase("curLevel", hkPopulateGenericKnownState);
        this._addHookBase("targetLevel", hkPopulateGenericKnownState);
        this._addHookBase("casterProgression", hkPopulateGenericKnownState);
        this._addHookBase("spellsKnownProgression", hkPopulateGenericKnownState);
        this._addHookBase("spellsKnownAllowLowerLevel", hkPopulateGenericKnownState);
        this._addHookBase("spellsKnownAllowHigherLevel", hkPopulateGenericKnownState);
        hkPopulateGenericKnownState();

        const hkPopulateFixedKnownState = ()=>this._doPopulateFixedKnownState();
        this._addHookBase("curLevel", hkPopulateFixedKnownState);
        this._addHookBase("targetLevel", hkPopulateFixedKnownState);
        this._addHookBase("casterProgression", hkPopulateFixedKnownState);
        this._addHookBase("spellsKnownProgressionFixed", hkPopulateFixedKnownState);
        this._addHookBase("spellsKnownProgressionFixedAllowLowerLevel", hkPopulateFixedKnownState);
        this._addHookBase("spellsKnownProgressionFixedAllowHigherLevel", hkPopulateFixedKnownState);
        hkPopulateFixedKnownState();

        const $btnToggle = $(`<div class="py-1 clickable ve-muted">[+]</div>`).click(()=>{
            $btnToggle.text($btnToggle.text() === "[+]" ? "[\u2012]" : "[+]");
            $stgBody.toggleVe();
        });

        const $rows = [...new Array(Consts.CHAR_MAX_LEVEL)].map((_,ixLvl)=>{
            const lvl = ixLvl + 1;
            const $cellSpells = $(`<div class="col-9 ve-flex-v-center ve-flex-wrap"></div>`);

            const {propSpellLevelMax} = this.constructor._getPropsGeneral(lvl);
            const {propCnt: propCntGeneric} = this.constructor._getPropsLevel(lvl, "generic");
            const {propCnt: propCntFixed} = this.constructor._getPropsLevel(lvl, "fixed");

            const selMetasGeneric = [];
            const selMetasFixed = [];

            const $row = $$`<div class="ve-flex-v-center stripe-odd">
				<div class="col-3 ve-text-center">${ixLvl + 1}</div>
				${$cellSpells}
			</div>`;

            const $dispNone = $(`<div>\u2014</div>`).appendTo($cellSpells);

            const hk = ()=>{
                let cntVisible = 0;

                cntVisible = cntVisible + this._hkRow_doAdjustElements({
                    namespace: "generic",
                    selMetas: selMetasGeneric,
                    propCnt: propCntGeneric,
                    propIsAllowLower: "spellsKnownAllowLowerLevel",
                    propIsAllowHigher: "spellsKnownAllowHigherLevel",
                    lvl,
                    propSpellLevelMax,
                    $cellSpells,
                });

                cntVisible = cntVisible + this._hkRow_doAdjustElements({
                    namespace: "fixed",
                    selMetas: selMetasFixed,
                    propCnt: propCntFixed,
                    propIsAllowLower: "spellsKnownProgressionFixedAllowLowerLevel",
                    propIsAllowHigher: "spellsKnownProgressionFixedAllowHigherLevel",
                    lvl,
                    propSpellLevelMax,
                    $cellSpells,
                });

                $dispNone.toggleVe(cntVisible === 0);

                $row.toggleVe((this._state.targetLevel ?? 0) >= lvl);
            }
            ;
            this._addHookBase(propCntFixed, hk);
            this._addHookBase(propCntGeneric, hk);
            this._addHookBase(propSpellLevelMax, hk);
            this._addHookBase("curLevel", hk);
            this._addHookBase("targetLevel", hk);
            this._addHookBase("spellsKnownAllowLowerLevel", hk);
            this._addHookBase("spellsKnownAllowHigherLevel", hk);
            this._addHookBase("spellsKnownProgressionFixedAllowLowerLevel", hk);
            this._addHookBase("spellsKnownProgressionFixedAllowHigherLevel", hk);
            hk();

            return $row;
        });

        const $stgBody = $$`<div class="ve-flex-col w-100">
			<div class="ve-muted italic ve-small mb-1">If you wish to swap out learned spell levels for lower/higher (for example, when you swap out a spell on gaining a level as a Bard), you may do so here. Note that your final choices are not validated, so swap with caution, and according to the rules!</div>
			<div class="ve-flex-v-center">
				<div class="col-3 ve-text-center">${this._className} Level</div>
				<div class="col-9">Learned Spell Levels</div>
			</div>
			${$rows}
		</div>`.toggleVe();

        $$($wrpInner)`<div class="ve-flex-col w-100">
			<div class="split-v-center">
				<div class="bold">Learned Slot Level</div>
				${$btnToggle}
			</div>

			${$stgBody}
		</div>`;

        if (this._prevSpellSlotLevelSelection)
            this._proxyAssignSimple("state", {
                ...this._prevSpellSlotLevelSelection
            });
    }

    set curLevel(val) {
        this._state.curLevel = val;
    }
    set targetLevel(val) {
        this._state.targetLevel = val;
    }
    set spellsKnownProgression(val) {
        this._state.spellsKnownProgression = val;
    }
    set casterProgression(val) {
        this._state.casterProgression = val;
    }
    set spellsKnownProgressionFixed(val) {
        this._state.spellsKnownProgressionFixed = val;
    }
    set spellsKnownProgressionFixedAllowLowerLevel(val) {
        this._state.spellsKnownProgressionFixedAllowLowerLevel = val;
    }
    set spellsKnownProgressionFixedAllowHigherLevel(val) {
        this._state.spellsKnownProgressionFixedAllowHigherLevel = val;
    }

    isAnyChoice() {
        return this._isAnyChoice();
    }

    getFlagsChoicesState() {
        return {
            ...this._getFlagsChoicesState_namespace({
                namespace: "generic"
            }),
            ...this._getFlagsChoicesState_namespace({
                namespace: "fixed"
            }),
        };
    }

    _getFlagsChoicesState_namespace({namespace}) {
        const out = {};

        [...new Array(this._state.targetLevel)].forEach((_,ixLvl)=>{
            const lvl = ixLvl + 1;

            const {propCnt} = this.constructor._getPropsLevel(lvl, namespace);

            const numSpells = this._state[propCnt];
            for (let i = 0; i < numSpells; ++i) {
                const {propSpellLevel} = this.constructor._getPropsSpell(lvl, namespace, i);

                out[propSpellLevel] = this._state[propSpellLevel];
            }
        }
        );

        return out;
    }

    addHookPulseFixedLearnedProgression(hk) {
        this._addHookBase("pulseFixedLearnedProgression", hk);
    }

    _doPulseFixedLearnedProgression() {
        this._state.pulseFixedLearnedProgression = !this._state.pulseFixedLearnedProgression;
    }

    

    _hkRow_doAdjustElements({namespace, propCnt, selMetas, lvl, propSpellLevelMax, $cellSpells, propIsAllowLower, propIsAllowHigher}) {
        let cntVisible = 0;

        const numSpellsAtLevel = this._state[propCnt];
        for (let i = 0, len = Math.max(numSpellsAtLevel, selMetas.length); i < len; ++i) {
            let selMeta = selMetas[i];

            if (i > numSpellsAtLevel) {
                selMeta.$sel.hideVe();
                selMeta.$dispStatic.hideVe();
                continue;
            }

            const {propSpellLevel} = this.constructor._getPropsSpell(lvl, namespace, i);

            if (!selMetas[i]) {
                selMeta = ComponentUiUtil.$getSelEnum(this, propSpellLevel, {
                    values: this._geSpellLevelSelValues(propIsAllowLower, propIsAllowHigher, propSpellLevelMax),
                    asMeta: true,
                    fnDisplay: it=>this.constructor._getSpellLevelDisplay(it),
                }, );
                selMeta.$sel.addClass("manc-sp__sel-slot-level ve-text-center p-0 clickable").appendTo($cellSpells);
                selMetas[i] = selMeta;

                const hkSelTitle = ()=>selMeta.$sel.title(`You have selected to learn a ${this._state[propSpellLevel]}-level spell at this level.`);
                this._addHookBase(propSpellLevel, hkSelTitle);
                hkSelTitle();

                this._addHookBase(propSpellLevel, ()=>this._doPulseFixedLearnedProgression());

                const $dispStatic = $(`<div class="ve-flex-vh-center manc-sp__sel-slot-level ve-text-center ve-muted"></div>`).appendTo($cellSpells);
                const hkStatic = ()=>{
                    $dispStatic.toggleVe(this._isShowStaticFixedValue(propIsAllowLower, propIsAllowHigher, propSpellLevelMax));
                    $dispStatic.text(this.constructor._getSpellLevelDisplay(this._state[propSpellLevelMax])).title(`This box indicates you will learn a ${this._state[propSpellLevelMax]}-level spell at this level.`);
                }
                ;
                this._addHookBase(propSpellLevel, hkStatic);
                this._addHookBase(propSpellLevelMax, hkStatic);
                this._addHookBase(propIsAllowLower, hkStatic);
                this._addHookBase(propIsAllowHigher, hkStatic);
                this._addHookBase("curLevel", hkStatic);
                this._addHookBase("targetLevel", hkStatic);
                hkStatic();

                selMeta.$dispStatic = $dispStatic;

                const hkMaxSpellLevel = ()=>{
                    selMeta.setValues(this._geSpellLevelSelValues(propIsAllowLower, propIsAllowHigher, propSpellLevelMax));
                }
                ;
                this._addHookBase(propSpellLevelMax, hkMaxSpellLevel);
                this._addHookBase(propIsAllowLower, hkMaxSpellLevel);
                this._addHookBase(propIsAllowHigher, hkMaxSpellLevel);
                this._addHookBase("curLevel", hkMaxSpellLevel);
                this._addHookBase("targetLevel", hkMaxSpellLevel);
            }

            cntVisible++;

            const isShowStatic = this._isShowStaticFixedValue(propIsAllowLower, propIsAllowHigher, propSpellLevelMax);
            selMeta.$sel.toggleVe(!isShowStatic);
            selMeta.$dispStatic.toggleVe(isShowStatic);
        }

        return cntVisible;
    }

    static _getSpellLevelDisplay(lvl) {
        return `${Parser.getOrdinalForm(lvl)}-level sp.`;
    }

    static _getPropsSpell(lvl, namespace, ix) {
        return {
            propSpellLevel: `${lvl}_${namespace}_${ix}_spellLevel`,
        };
    }

    static _getPropsLevel(lvl, namespace) {
        return {
            propCnt: `${lvl}_${namespace}_cntFixed`,
        };
    }

    static _getPropsGeneral(lvl) {
        return {
            propSpellLevelMax: `${lvl}_spellLevelMax`,
        };
    }

    _isAnyChoice() {
        if (this._state.curLevel == null || this._state.targetLevel == null || this._state.casterProgression == null)
            return false;

        return !!((this._state.spellsKnownProgressionFixed && (this._state.spellsKnownProgressionFixedAllowLowerLevel || this._state.spellsKnownProgressionFixedAllowHigherLevel)) || (this._state.spellsKnownProgression && (this._state.spellsKnownAllowLowerLevel || this._state.spellsKnownAllowHigherLevel)));
    }

    _geSpellLevelSelValues(propIsAllowLower, propIsAllowHigher, propSpellLevelMax) {
        const maxSpellLevel = Charactermancer_Spell_Util.getCasterProgressionMeta({
            casterProgression: this._state.casterProgression,
            curLevel: this._state.curLevel,
            targetLevel: this._state.targetLevel,
        })?.spellLevelHigh || 0;

        const min = this._state[propIsAllowLower] ? 1 : maxSpellLevel;
        const max = this._state[propIsAllowHigher] ? maxSpellLevel : this._state[propSpellLevelMax];

        const out = [];
        for (let i = min; i <= max; ++i)
            out.push(i);
        return out;
    }

    _doPopulateGenericKnownState() {
        [...new Array(Consts.CHAR_MAX_LEVEL)].forEach((_,ixLvl)=>this._doPopulateGenericKnownState_forLevel(ixLvl + 1));

        this._doPulseFixedLearnedProgression();
    }

    _doPopulateGenericKnownState_forLevel(lvl) {
        if (this._doPopulateState_forLevel_isDoReset() || !this._state.spellsKnownProgression) {
            this._doPopulateState_forLevel_doReset({
                lvl,
                namespace: "generic"
            });
            return;
        }

        const prevCntSpells = this._state.spellsKnownProgression[lvl - 2] || 0;
        const curCntSpells = this._state.spellsKnownProgression[lvl - 1] || 0;
        const numSpells = curCntSpells - prevCntSpells;

        this._doPopulateState_forLevel_doPopulateForNumSpells({
            lvl,
            namespace: "generic",
            numSpells,
            propIsAllowLower: "spellsKnownAllowLowerLevel",
            propIsAllowHigher: "spellsKnownAllowHigherLevel",
        });
    }

    _doPopulateState_forLevel_isDoReset() {
        return this._state.curLevel == null || this._state.targetLevel == null || this._state.casterProgression == null || UtilDataConverter.CASTER_TYPE_TO_PROGRESSION[this._state.casterProgression] == null;
    }

    _doPopulateState_forLevel_doReset({lvl, namespace}) {
        const {propCnt} = this.constructor._getPropsLevel(lvl, namespace);
        this._state[propCnt] = null;
    }

    _doPopulateState_forLevel_doPopulateForNumSpells({lvl, namespace, numSpells, propIsAllowLower, propIsAllowHigher}) {
        const maxSpellLevel = Charactermancer_Spell_Util.getCasterProgressionMeta({
            casterProgression: this._state.casterProgression,
            curLevel: 0,
            targetLevel: lvl,
        })?.spellLevelHigh || 0;

        [...new Array(numSpells)].map((_,i)=>{
            const {propSpellLevel} = this.constructor._getPropsSpell(lvl, namespace, i);

            if (this._state[propSpellLevel] == null)
                this._state[propSpellLevel] = maxSpellLevel;
            else {
                let nxtVal = this._state[propSpellLevel];

                if (!this._state[propIsAllowLower])
                    nxtVal = Math.max(nxtVal, maxSpellLevel);
                if (!this._state[propIsAllowHigher])
                    nxtVal = Math.min(nxtVal, maxSpellLevel);

                this._state[propSpellLevel] = nxtVal;
            }
        }
        );

        const {propCnt} = this.constructor._getPropsLevel(lvl, namespace);
        this._state[propCnt] = numSpells;

        const {propSpellLevelMax} = this.constructor._getPropsGeneral(lvl);
        this._state[propSpellLevelMax] = maxSpellLevel;
    }

    _doPopulateFixedKnownState() {
        [...new Array(Consts.CHAR_MAX_LEVEL)].forEach((_,ixLvl)=>this._doPopulateFixedKnownState_forLevel(ixLvl + 1));

        this._doPulseFixedLearnedProgression();
    }

    _doPopulateFixedKnownState_forLevel(lvl) {
        if (this._doPopulateState_forLevel_isDoReset() || !this._state.spellsKnownProgressionFixed) {
            this._doPopulateState_forLevel_doReset({
                lvl,
                namespace: "fixed"
            });
            return;
        }

        const numSpells = this._state.spellsKnownProgressionFixed[lvl - 1] || 0;
        this._doPopulateState_forLevel_doPopulateForNumSpells({
            lvl,
            namespace: "fixed",
            numSpells,
            propIsAllowLower: "spellsKnownProgressionFixedAllowLowerLevel",
            propIsAllowHigher: "spellsKnownProgressionFixedAllowHigherLevel",
        });
    }

    _isShowStaticFixedValue(propIsAllowLower, propIsAllowHigher, propSpellLevelMax) {
        const maxSpellLevel = Charactermancer_Spell_Util.getCasterProgressionMeta({
            casterProgression: this._state.casterProgression,
            curLevel: this._state.curLevel,
            targetLevel: this._state.targetLevel,
        })?.spellLevelHigh || 0;
        if (maxSpellLevel <= 1)
            return true;

        const isAllowLower = this._state[propIsAllowLower] && this._state[propSpellLevelMax] !== 1;
        const isAllowHigher = this._state[propIsAllowHigher] && this._state[propSpellLevelMax] !== 9;
        return !isAllowLower && !isAllowHigher;
    }

    static getDefaultFormData({targetLevel, casterProgression, spellsKnownProgression, spellsKnownProgressionFixed}) {
        const out = [...new Array(9)].map(()=>0);
        let isAnyData = false;

        if (spellsKnownProgression && targetLevel != null && casterProgression) {
            isAnyData = true;
            this._getFormData_handleKnownProgressionGeneric_noChoice(out, {
                targetLevel,
                casterProgression,
                spellsKnownProgression
            });
        }

        if (spellsKnownProgressionFixed && targetLevel != null && casterProgression) {
            isAnyData = true;
            this._getFormData_handleKnownProgressionFixed_noChoice(out, {
                targetLevel,
                casterProgression,
                spellsKnownProgressionFixed
            });
        }

        return {
            isFormComplete: true,
            isAnyData,
            data: out,
        };
    }

    getFormData() {
        const out = [...new Array(9)].map(()=>0);
        let isAnyData = false;

        if (this._state.spellsKnownProgression && this._state.targetLevel != null && this._state.casterProgression) {
            isAnyData = true;
            this._getFormData_handleKnownProgressionGeneric(out);
        }

        if (this._state.spellsKnownProgressionFixed && this._state.targetLevel != null && this._state.casterProgression) {
            isAnyData = true;
            this._getFormData_handleKnownProgressionFixed(out);
        }

        return {
            isFormComplete: true,
            isAnyData,
            data: out,
        };
    }

    _getFormData_handleKnownProgressionGeneric(totalKnownPerLevel) {
        if (!this._state.spellsKnownAllowLowerLevel && !this._state.spellsKnownAllowHigherLevel) {
            this.constructor._getFormData_handleKnownProgressionGeneric_noChoice(totalKnownPerLevel, {
                targetLevel: this._state.targetLevel,
                casterProgression: this._state.casterProgression,
                spellsKnownProgression: this._state.spellsKnownProgression,
            }, );
        } else
            this._getFormData_handleKnownProgressionGeneric_choice(totalKnownPerLevel);
    }

    _getFormData_handleKnownProgressionFixed(totalKnownPerLevel) {
        if (!this._state.spellsKnownProgressionFixedAllowLowerLevel && this._state.spellsKnownProgressionFixedAllowHigherLevel) {
            this.constructor._getFormData_handleKnownProgressionFixed_noChoice(totalKnownPerLevel, {
                targetLevel: this._state.targetLevel,
                casterProgression: this._state.casterProgression,
                spellsKnownProgressionFixed: this._state.spellsKnownProgressionFixed,
            }, );
        } else
            this._getFormData_handleKnownProgressionFixed_choice(totalKnownPerLevel);
    }

    static _getFormData_handleKnownProgressionGeneric_noChoice(totalKnownPerLevel, {targetLevel, casterProgression, spellsKnownProgression}) {
        [...new Array(targetLevel)].forEach((_,i)=>{
            const maxSpellLevel = Charactermancer_Spell_Util.getCasterProgressionMeta({
                casterProgression: casterProgression,
                curLevel: 0,
                targetLevel: i + 1,
            })?.spellLevelHigh || 0;

            const ixLastSlot = maxSpellLevel - 1;
            if (ixLastSlot < 0)
                return;

            const prevCntSpells = spellsKnownProgression[i - 1] || 0;
            const curCntSpells = spellsKnownProgression[i] || 0;
            const numSpells = curCntSpells - prevCntSpells;

            totalKnownPerLevel[ixLastSlot] += numSpells;
        }
        );
    }

    _getFormData_handleKnownProgressionGeneric_choice(totalKnownPerLevel) {
        this._getFormData_handleKnownProgression_choice({
            namespace: "generic",
            totalKnownPerLevel,
            propIsAllowLower: "spellsKnownAllowLowerLevel",
            propIsAllowHigher: "spellsKnownAllowHigherLevel",
        });
    }

    static _getFormData_handleKnownProgressionFixed_noChoice(totalKnownPerLevel, {targetLevel, casterProgression, spellsKnownProgressionFixed}) {
        spellsKnownProgressionFixed.slice(0, targetLevel).forEach((lvlFixedValue,i)=>{
            const maxSpellLevel = Charactermancer_Spell_Util.getCasterProgressionMeta({
                casterProgression: casterProgression,
                curLevel: 0,
                targetLevel: i + 1,
            })?.spellLevelHigh || 0;

            const ixLastSlot = maxSpellLevel - 1;
            if (ixLastSlot < 0)
                return;

            totalKnownPerLevel[ixLastSlot] += lvlFixedValue;
        }
        );
    }

    _getFormData_handleKnownProgressionFixed_choice(totalKnownPerLevel) {
        this._getFormData_handleKnownProgression_choice({
            namespace: "fixed",
            totalKnownPerLevel,
            propIsAllowLower: "spellsKnownProgressionFixedAllowLowerLevel",
            propIsAllowHigher: "spellsKnownProgressionFixedAllowHigherLevel",
        });
    }

    _getFormData_handleKnownProgression_choice({namespace, totalKnownPerLevel, propIsAllowLower, propIsAllowHigher}) {
        const maxOverallSpellLevel = Charactermancer_Spell_Util.getCasterProgressionMeta({
            casterProgression: this._state.casterProgression,
            curLevel: this._state.curLevel,
            targetLevel: this._state.targetLevel,
        })?.spellLevelHigh || 0;

        [...new Array(this._state.targetLevel)].map((_,ixLvl)=>{
            const lvl = ixLvl + 1;

            const maxSpellLevel = Charactermancer_Spell_Util.getCasterProgressionMeta({
                casterProgression: this._state.casterProgression,
                curLevel: 0,
                targetLevel: lvl,
            })?.spellLevelHigh || 0;

            const {propCnt} = this.constructor._getPropsLevel(lvl, namespace);

            const numSpells = this._state[propCnt];
            for (let i = 0; i < numSpells; ++i) {
                const {propSpellLevel} = this.constructor._getPropsSpell(lvl, namespace, i);

                let spellLevel = this._state[propSpellLevel];

                if (!this._state[propIsAllowLower])
                    spellLevel = Math.max(spellLevel, maxSpellLevel);
                if (!this._state[propIsAllowHigher])
                    spellLevel = Math.min(spellLevel, maxSpellLevel);

                spellLevel = Math.min(spellLevel, maxOverallSpellLevel);

                totalKnownPerLevel[spellLevel - 1]++;
            }
        }
        );
    }

    _getDefaultState() {
        return {
            curLevel: null,
            targetLevel: null,

            casterProgression: null,

            spellsKnownProgression: null,
            spellsKnownAllowLowerLevel: true,
            spellsKnownAllowHigherLevel: true,
            spellsKnownProgressionFixed: null,
            spellsKnownProgressionFixedAllowLowerLevel: false,
            spellsKnownProgressionFixedAllowHigherLevel: false,

            pulseFixedLearnedProgression: false,
        };
    }
}

class Charactermancer_Spell_SpellMeta {
    /**
     * @param {number} ix
     * @param {{name:string, source:string, level:number}} spell
     * @param {boolean} isPrepared
     * @param {boolean} isLearned
     * @param {boolean} isUpdateOnly
     * @param {any} existingItemId
     * @param {string} preparationMode
     * @param {number} usesValue
     * @param {number} usesMax
     * @param {string} usesPer
     */
    constructor({ix, spell, isPrepared, isLearned, isUpdateOnly, existingItemId, preparationMode, usesValue, usesMax, usesPer}) {
        this.ix = ix;
        this.spell = spell;
        this.isPrepared = isPrepared;
        this.isLearned = isLearned;

        this.isUpdateOnly = isUpdateOnly;
        this.existingItemId = existingItemId;

        this.preparationMode = preparationMode;
        this.usesValue = usesValue;
        this.usesMax = usesMax;
        this.usesPer = usesPer;
    }
}

class Charactermancer_Spell extends BaseComponent {
    
    /**
     * @param {{spellDatas:{name:string, source:string, level:number}}} opts
     */
    constructor(opts) {
        opts = opts || {};
        super();

        this._actor = opts.actor;
        this._existingClass = opts.existingClass;
        this._existingCasterMeta = opts.existingCasterMeta;
        this._spellDatas = opts.spellDatas;
        this._className = opts.className;
        this._classSource = opts.classSource;
        this._subclassName = opts.subclassName;
        this._subclassShortName = opts.subclassShortName;
        this._subclassSource = opts.subclassSource;
        this._parent = opts.parent;
        //Create an array of new components to handle picking spells at each level
        this._compsLevel = [...new Array(opts.maxLevel != null ? (opts.maxLevel + 1) : 10)]
            .map((_,i)=>new Charactermancer_Spell_Level({
            spellDatas: opts.spellDatas,
            spellLevel: i,
            parent: this
        }));
        this._pageFilter = opts.pageFilter;
        this._$wrpsPreparedLearned = opts.$wrpsPreparedLearned;

        this._spellDataLookup = this._getSpellDataLookup();
        this._existingSpellLookup = this._getExistingSpellLookup();

        this._cacheSelectedListItem = null;
        this._cacheFilterValues = null;
        this._cacheBrewClassSpells = Charactermancer_Spell._getBrewClassSubclassSpellCache(opts.brewClassSpells, opts.brewSubclassSpells, opts.brewSubSubclassSpells);
    }

    render($wrp, $dispSpell) {
        const hkPreparedLearned = ()=>{
            const parts = [this._state.maxLearnedCantrips ? `Cantrips learned: ${this._state.cntLearnedCantrips}/${this._state.maxLearnedCantrips}` : null, this._state.fixedLearnedProgression ? `Spells learned: ${this._getCntSpellsKnown()}/${this._getTotalSpellsKnown()}` : null, this._state.maxPrepared ? `Prepared: ${this._state.cntPrepared}/${this._state.maxPrepared}` : null, ].filter(Boolean);

            (this._$wrpsPreparedLearned || []).forEach($it=>{
                $it.toggleVe(parts.length).html(parts.join(`<div class="mx-1">\u2014</div>`));
            });
            //Adding a pulse here so other components can listen to CompSpell for a pulse instead of listening to its subcomponents (like us)
            this._parent._state["pulsePreparedLearned"] = !this._parent.state["pulsePreparedLearned"];
        };
        this._addHookBase("cntPrepared", hkPreparedLearned);
        this._addHookBase("maxPrepared", hkPreparedLearned);
        this._addHookBase("fixedLearnedProgression", hkPreparedLearned);
        this._addHookBase("pulseFixedLearned", hkPreparedLearned);
        this._addHookBase("cntLearnedCantrips", hkPreparedLearned);
        this._addHookBase("maxLearnedCantrips", hkPreparedLearned);
        hkPreparedLearned();

        const hkAlwaysPreparedSpells = ()=>{
            this._handleAlwaysPreparedSpells();
            this._parent._state["pulseAlwaysPrepared"] = !this._parent.state["pulseAlwaysPrepared"];
        }
        this._addHookBase("alwaysPreparedSpellsRace", hkAlwaysPreparedSpells);
        this._addHookBase("alwaysPreparedSpellsBackground", hkAlwaysPreparedSpells);
        this._addHookBase("alwaysPreparedSpellsClass", hkAlwaysPreparedSpells);
        this._addHookBase("alwaysPreparedSpellsSubclass", hkAlwaysPreparedSpells);
        hkAlwaysPreparedSpells();

        const hkExpandedSpells = ()=>{
            this.handleFilterChange();
            this._parent._state["pulseExpandedSpells"] = !this._parent.state["pulseExpandedSpells"];
        }
        this._addHookBase("expandedSpellsRace", hkExpandedSpells);
        this._addHookBase("expandedSpellsBackground", hkExpandedSpells);
        this._addHookBase("expandedSpellsClass", hkExpandedSpells);
        this._addHookBase("expandedSpellsSubclass", hkExpandedSpells);

        this._addHookBase("isIncludeUaEtcSpellLists", hkExpandedSpells);
        hkExpandedSpells();

        const hkAlwaysKnownSpells = ()=>{
            this._handleAlwaysKnownSpells();
            this._parent._state["pulseAlwaysKnown"] = !this._parent.state["pulseAlwaysKnown"];
        }
        this._addHookBase("alwaysKnownSpellsRace", hkAlwaysKnownSpells);
        this._addHookBase("alwaysKnownSpellsBackground", hkAlwaysKnownSpells);
        this._addHookBase("alwaysKnownSpellsClass", hkAlwaysKnownSpells);
        this._addHookBase("alwaysKnownSpellsSubclass", hkAlwaysKnownSpells);
        hkAlwaysKnownSpells();

        this._compsLevel.forEach(it=>it.render($wrp));

        const hkDisplaySpell = ()=>{
            $dispSpell.empty();
            const spell = this._spellDatas[this._state.ixViewedSpell];
            if (!spell)
                return $dispSpell.append(`<div class="ve-flex-vh-center w-100 h-100 italic">Select a spell to view</div>`);

            $dispSpell.append(Renderer.hover.$getHoverContent_stats(UrlUtil.PG_SPELLS, MiscUtil.copy(spell)));
        };
        this._addHookBase("ixViewedSpell", hkDisplaySpell);
        hkDisplaySpell();
    }

    static async pApplyFormDataToActor(actor, formData, {cls, sc, taskRunner=null}) {
        const spells = formData?.data?.spells || [];
        for (let i = 0; i < spells.length; ++i) {
            const {spell, isPrepared,
            isUpdateOnly, existingItemId,
            preparationMode, usesValue, usesMax, usesPer, castAtLevel, } = spells[i];

            if (isUpdateOnly && existingItemId) {
                await DataConverterSpell.pSetSpellItemIsPrepared(actor.items.get(existingItemId), isPrepared);
                continue;
            }

            if (!Charactermancer_Spell._IMPORT_LIST_SPELL || Charactermancer_Spell._IMPORT_LIST_SPELL.actor !== actor) {
                const {ImportListSpell} = await Promise.resolve().then(function() {
                    return ImportListSpell$1;
                });
                Charactermancer_Spell._IMPORT_LIST_SPELL = new ImportListSpell({
                    actor: actor
                });
                await Charactermancer_Spell._IMPORT_LIST_SPELL.pInit();
            }

            await Charactermancer_Spell._IMPORT_LIST_SPELL.pImportEntry(spell, {
                taskRunner,
                isCharactermancer: true,
                opts_pGetSpellItem: {
                    isActorItem: true,

                    isPrepared: isPrepared,
                    ability: sc?.spellcastingAbility || cls.spellcastingAbility,

                    preparationMode,
                    usesValue,
                    usesMax,
                    usesPer,
                    castAtLevel,

                    parentClassName: cls.name,
                    parentClassSource: cls.source,
                    parentSubclassName: sc?.name,
                    parentSubclassShortName: sc?.shortName,
                    parentSubclassSource: sc?.source,
                },
            }, );
        }
    }
    _getSpellDataLookup() {
        const out = {
            hash: {},
            slug: {}
        };
        this._spellDatas.forEach(sp=>{
            MiscUtil.set(out, "hash", UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_SPELLS](sp), sp);
            MiscUtil.set(out, "slug", Parser.stringToSlug(Parser.sourceJsonToAbv(sp.source)), Parser.stringToSlug(sp.name), sp);
        }
        );
        return out;
    }

    _getExistingSpellLookup() {
        if (!this._existingClass || !this._existingCasterMeta) { return null; }

        //TEMPFIX
        const spItems = []; //this._actor.items.filter(it=>it.type === "spell");

        const cntsSeenLearnedPerLevel = {};
        const cntsSeenPreparedPerLevel = {};

        const out = {};

        [...spItems].sort((a,b)=>{
            const flagsA = a.flags?.[SharedConsts.MODULE_ID];
            const flagsB = b.flags?.[SharedConsts.MODULE_ID];
            const a_ = flagsA?.parentClassName && flagsA?.parentClassSource ? 1 : 0;
            const b_ = flagsB?.parentClassName && flagsB?.parentClassSource ? 1 : 0;
            return b_ - a_;
        }
        ).forEach(spItem=>{
            const level = Number(spItem.system.level || 0);
            const lookupName = (spItem.name || "").trim().toLowerCase();
            const itemSourceMeta = UtilDocumentSource.getDocumentSource(spItem);
            const lookupSource = (itemSourceMeta.source || "").toLowerCase();

            const flags = spItem.flags?.[SharedConsts.MODULE_ID];
            const parentClassName = flags?.parentClassName;
            const parentClassSource = flags?.parentClassSource;

            const isItemPrepared = spItem.system.preparation?.mode === "prepared" && spItem.system.preparation?.prepared;
            const isItemAlwaysPrepared = spItem.system.preparation?.mode === "always" || level === 0;

            if (parentClassName && parentClassSource && parentClassName !== this._existingClass.name && parentClassSource !== this._existingClass.source)
                return;

            if (parentClassName && parentClassSource && parentClassName === this._existingClass.name && parentClassSource === this._existingClass.source) {
                const isLearned = level === 0 || (level !== 0 && this._existingCasterMeta.fixedLearnedProgression != null);
                const isPrepared = this._existingCasterMeta.maxPreparedSpells != null && isItemPrepared;

                if (isLearned)
                    cntsSeenLearnedPerLevel[level] = (cntsSeenLearnedPerLevel[level] || 0) + 1;
                if (isPrepared)
                    cntsSeenPreparedPerLevel[level] = (cntsSeenPreparedPerLevel[level] || 0) + 1;

                MiscUtil.set(out, level, lookupSource, lookupName, new Charactermancer_Spell.ExistingSpell({
                    item: spItem,
                    isLearned,
                    isPrepared,
                    isAlwaysPrepared: isItemAlwaysPrepared,
                }));

                return;
            }

            const isItemLearned = level === 0 || (spItem.system.preparation?.mode === "prepared" || spItem.system.preparation?.mode === "pact");

            const isLearned = level === 0 ? isItemLearned && this._existingCasterMeta.maxLearnedCantrips != null && ((cntsSeenLearnedPerLevel[level] || 0) < this._existingCasterMeta.maxLearnedCantrips) : isItemLearned && this._canLearnMoreFixedSpellsOfLevel({
                lvl: level,
                fixedLearnedProgression: this._existingCasterMeta.fixedLearnedProgression,
                cntSpellsKnown: cntsSeenLearnedPerLevel[level] || 0
            });

            const isPrepared = isItemPrepared && this._existingCasterMeta.maxPreparedSpells != null && (cntsSeenPreparedPerLevel[level] || 0) < this._existingCasterMeta.maxPreparedSpells;

            if (!this._getExistingSpellLookup_isOnSpellList(spItem))
                return;

            if (!isLearned && this._isLearnedFixedSpellCasterAtLevel({
                lvl: level,
                fixedLearnedProgression: this._existingCasterMeta.fixedLearnedProgression
            }))
                return;

            if (isLearned)
                cntsSeenLearnedPerLevel[level] = (cntsSeenLearnedPerLevel[level] || 0) + 1;
            if (isPrepared)
                cntsSeenPreparedPerLevel[level] = (cntsSeenPreparedPerLevel[level] || 0) + 1;

            MiscUtil.set(out, level, lookupSource, lookupName, new Charactermancer_Spell.ExistingSpell({
                item: spItem,
                isLearned,
                isPrepared,
                isAlwaysPrepared: isItemAlwaysPrepared,
            }));
        }
        );

        return out;
    }

    _getExistingSpellLookup_isOnSpellList(spItem) {
        const flags = spItem.flags?.[SharedConsts.MODULE_ID];

        if (flags?.page && flags?.source && flags?.hash) {
            const sp = this._spellDataLookup.hash[flags.hash];
            if (!sp)
                return false;
            return this.isAvailableClassSpell_(sp) || this.isAvailableSubclassSpell_(sp) || this.isAvailableExpandedSpell_(sp);
        }

        const itemSourceClean = UtilDocumentSource.getDocumentSource(spItem).source || Parser.SRC_PHB;
        const itemNameClean = spItem.name.trim().replace(/\s+/g, " ").toLowerCase();
        const sp = MiscUtil.get(this._spellDataLookup.slug, Parser.stringToSlug(itemSourceClean), Parser.stringToSlug(itemNameClean));
        if (!sp)
            return false;
        return this.isAvailableClassSpell_(sp) || this.isAvailableSubclassSpell_(sp) || this.isAvailableExpandedSpell_(sp);
    }

    static _getBrewClassSubclassSpellCache(brewClassSpells, brewSubclassSpells, brewSubSubclassSpells) {
        const out = {};
        (brewClassSpells || []).forEach(it=>this._getBrewClassSubclassSpellCache_addItem(out, it));
        (brewSubclassSpells || []).forEach(it=>this._getBrewClassSubclassSpellCache_addItem(out, it));
        (brewSubSubclassSpells || []).forEach(it=>this._getBrewClassSubclassSpellCache_addItem(out, it));
        return out;
    }

    static _getBrewClassSubclassSpellCache_addItem(out, it) {
        if (typeof it === "string") {
            const {name, source} = DataUtil.proxy.unpackUid("spell", it.trim(), "spell", {
                isLower: true
            });
            MiscUtil.set(out, "spell", source, name, true);
            return;
        }

        if (it.name)
            return MiscUtil.set(out, "spell", (it.source || Parser.SRC_PHB).trim().toLowerCase(), it.name.trim().toLowerCase(), true);

        if (it.className) {
            let prop = "class";
            const classSource = it.classSource || Parser.SRC_PHB;
            const path = [classSource, it.className];
            if (it.subclassName) {
                prop = "subclass";
                const subclassSource = it.subclassSource || classSource;
                path.push(subclassSource, it.subclassName);
                if (it.subSubclassName) {
                    prop = "subSubclass";
                    path.push(it.subSubclassName);
                }
            }
            MiscUtil.set(out, prop, ...path.map(it=>it.trim().toLowerCase()), true);
        }
    }

    get pageFilter() {
        return this._pageFilter;
    }

    set subclassName(val) {
        this._subclassName = val;
    }
    set subclassShortName(val) {
        this._subclassShortName = val;
    }
    set subclassSource(val) {
        this._subclassSource = val;
    }

    get cacheSelectedListItem() {
        return this._cacheSelectedListItem;
    }
    set cacheSelectedListItem(val) {
        this._cacheSelectedListItem = val;
    }

    get isPreparedCaster() {
        return this._state.maxPrepared != null;
    }

    
    set spellLevelLow(val) {
        this._state.spellLevelLow = val;
    }
    /**
     * @returns {number}
     */
    get spellLevelLow() {
        return this._state.spellLevelLow;
    }

    set spellLevelHigh(val) {
        this._state.spellLevelHigh = val;
    }
     /**
     * @returns {number}
     */
    get spellLevelHigh() {
        return this._state.spellLevelHigh;
    }

    get ixViewedSpell() {
        return this._state.ixViewedSpell;
    }
    set ixViewedSpell(val) {
        this._state.ixViewedSpell = val;
    }

    get maxLearnedCantrips() {
        return this._state.maxLearnedCantrips;
    }
    set maxLearnedCantrips(val) {
        this._state.maxLearnedCantrips = val;
    }

    get fixedLearnedProgression() {
        return this._state.fixedLearnedProgression;
    }
    set fixedLearnedProgression(val) {
        this._state.fixedLearnedProgression = val;
    }

    get fixedLearnedProgressionDefault() {
        return this._state.fixedLearnedProgressionDefault;
    }
    set fixedLearnedProgressionDefault(val) {
        this._state.fixedLearnedProgressionDefault = val;
    }

    get pulseFixedLearned() {
        return this._state.pulseFixedLearned;
    }
    set pulseFixedLearned(val) {
        this._state.pulseFixedLearned = val;
    }

    set maxPrepared(val) {
        this._state.maxPrepared = val;
        if (val != null)
            this._state.maxLearned = null;
    }

    get cntLearnedSpells() {
        return this._state.cntLearnedSpells;
    }
    set cntLearnedSpells(val) {
        this._state.cntLearnedSpells = val;
    }

    get cntLearnedCantrips() {
        return this._state.cntLearnedCantrips;
    }
    set cntLearnedCantrips(val) {
        this._state.cntLearnedCantrips = val;
    }

    get cntPrepared() {
        return this._state.cntPrepared;
    }
    set cntPrepared(val) {
        this._state.cntPrepared = val;
    }

    get casterProgression() {
        return this._state.casterProgression;
    }
    set casterProgression(val) {
        this._state.casterProgression = val;
    }

    set isIncludeUaEtcSpellLists(val) {
        this._state.isIncludeUaEtcSpellLists = val;
    }

    addHookMaxLearnedCantrips(hk) {
        this._addHookBase("maxLearnedCantrips", hk);
    }
    addHookSpellLevelLow(hk) {
        this._addHookBase("spellLevelLow", hk);
    }
    addHookSpellLevelHigh(hk) {
        this._addHookBase("spellLevelHigh", hk);
    }
    addHookFixedLearnedProgression(hk) {
        this._addHookBase("fixedLearnedProgression", hk);
    }

    addHookIsPreparedCaster(hk) {
        this._addHookBase("maxPrepared", hk);
    }

    addHookIsMaxLearnedSpells(hk) {
        this._addHookBase("fixedLearnedProgression", hk);
        this._addHookBase("pulseFixedLearned", hk);
        this._addHookBase("spellLevelLow", hk);
        this._addHookBase("spellLevelHigh", hk);
    }

    addHookIsMaxLearnedCantrips(hk) {
        this._addHookBase("cntLearnedCantrips", hk);
        this._addHookBase("maxLearnedCantrips", hk);
    }

    addHookIsMaxPrepared(hk) {
        this._addHookBase("cntPrepared", hk);
        this._addHookBase("maxPrepared", hk);
    }

    isLearnedFixedSpellCasterAtLevel_(lvl) {
        return this._isLearnedFixedSpellCasterAtLevel({
            lvl,
            fixedLearnedProgression: this._state.fixedLearnedProgressionDefault
        });
    }

    _isLearnedFixedSpellCasterAtLevel({lvl, fixedLearnedProgression}) {
        return lvl > 0 && fixedLearnedProgression != null && fixedLearnedProgression[lvl - 1] > 0;
    }

    canLearnMoreFixedSpellsOfLevel_(lvl) {
        return this._canLearnMoreFixedSpellsOfLevel({
            lvl,
            fixedLearnedProgression: this._state.fixedLearnedProgression,
            cntSpellsKnown: this._compsLevel[lvl].getSpellsKnown().length,
        });
    }

    _canLearnMoreFixedSpellsOfLevel({lvl, fixedLearnedProgression, cntSpellsKnown}) {
        if (!fixedLearnedProgression)
            return false;
        if (!fixedLearnedProgression[lvl - 1])
            return false;
        return cntSpellsKnown < fixedLearnedProgression[lvl - 1];
    }

    isOverLearnFixedSpellsLimitOfLevel_(lvl) {
        if (!this._state.fixedLearnedProgression)
            return false;
        if (!this._state.fixedLearnedProgression[lvl - 1])
            return false;
        const spellsKnown = this._compsLevel[lvl].getSpellsKnown();
        return spellsKnown.length > this._state.fixedLearnedProgression[lvl - 1];
    }

    canLearnMoreCantrips_() {
        return this._state.cntLearnedCantrips < (this._state.maxLearnedCantrips || 0);
    }
    isOverLearnCantripsLimit_() {
        return this._state.cntLearnedCantrips > (this._state.maxLearnedCantrips || 0);
    }

    canPrepareMore_() {
        return this._state.cntPrepared < (this._state.maxPrepared || 0);
    }
    isOverPrepareLimit_() {
        return this._state.cntPrepared > (this._state.maxPrepared || 0);
    }

    _getCntSpellsKnown() {
        return this._compsLevel.map(it=>it.getSpellsKnown().length).sum();
    }
    _getTotalSpellsKnown() {
        return (this._state.fixedLearnedProgression || []).sum();
    }

    _handleAlwaysPreparedSpells() {
        this._compsLevel.forEach(it=>it.handleAlwaysPreparedSpells_());
    }
    _handleAlwaysKnownSpells() {
        this._compsLevel.forEach(it=>it.handleAlwaysKnownSpells_());
    }

    handleFilterChange(f) {
        this._cacheFilterValues = f || this._cacheFilterValues;
        if (!this._cacheFilterValues)
            return;
        this._compsLevel.forEach(it=>it.handleFilterChange(this._cacheFilterValues));
    }

    handleSearch(searchTerm) {
        this._compsLevel.forEach(it=>it.handleSearch(searchTerm));
    }

    /**
     * @param {{name:string, source:string, level:number}} spell
     * @returns {{isPrepared:boolean, item:{id:any}}}
     */
    getExistingSpellMeta_(spell) {
        if (!this._existingCasterMeta || !this._existingSpellLookup){return null;}
        const lookupName = spell.name.toLowerCase();
        const lookupSource = spell.source.toLowerCase();
        const lookupSourceAlt = Parser.sourceJsonToAbv(spell.source).toLowerCase();
        return this._existingSpellLookup[spell.level]?.[lookupSource]?.[lookupName] || this._existingSpellLookup[spell.level]?.[lookupSourceAlt]?.[lookupName];
    }

    /**
     * Returns true if this class has the spell available
     * @param {*} sp 
     * @returns 
     */
    isAvailableClassSpell_(sp) {
        if (!this._className || !this._classSource) { return false; }

        const fromClassList = Renderer.spell.getCombinedClasses(sp, "fromClassList"); //This line is probably the problem, we always get an empty array back
        const fromClassListVariant = Renderer.spell.getCombinedClasses(sp, "fromClassListVariant").filter(it=>this._state.isIncludeUaEtcSpellLists ? true 
            : !SourceUtil.isNonstandardSource(it.definedInSource));

        const {className, classSource} = this.constructor._getMappedClassDetails({
            className: this._className,
            classSource: this._classSource
        });

        if (!fromClassList.some(it=>it.name === className && it.source === classSource)
        && !fromClassListVariant.some(it=>it.name === className && it.source === classSource)
        && !this._hasBrewClassSpell(sp, fromClassList, fromClassListVariant)) { return false; }

        return true;
    }

    isAvailableSubclassSpell_(sp) {
        if ((!this._subclassName && !this._subclassShortName) || !this._subclassSource)
            return false;

        const fromSubclassList = Renderer.spell.getCombinedClasses(sp, "fromSubclass");

        const scName = this._subclassShortName || this._subclassName;

        if (!fromSubclassList.some(it=>it?.class.name === this._className && it?.class.source === this._classSource && (it?.subclass.shortName || it?.subclass.name) === scName && it?.subclass.source === this._subclassSource) && !this._hasBrewSubclassSpell(sp, fromSubclassList))
            return false;

        return true;
    }

    _hasBrewClassSpell(sp, fromClassList, fromClassListVariant) {
        if (MiscUtil.get(this._cacheBrewClassSpells, "spell", sp.source.toLowerCase(), sp.name.toLowerCase()))
            return true;
        if (fromClassList.some(it=>MiscUtil.get(this._cacheBrewClassSpells, "class", it.source.toLowerCase(), it.name.toLowerCase())))
            return true;
        if (fromClassListVariant.some(it=>MiscUtil.get(this._cacheBrewClassSpells, "class", it.source.toLowerCase(), it.name.toLowerCase())))
            return true;
        return false;
    }

    _hasBrewSubclassSpell(sp, fromSubclassList) {
        if (MiscUtil.get(this._cacheBrewClassSpells, "spell", sp.source.toLowerCase(), sp.name.toLowerCase()))
            return true;
        if (fromSubclassList.some(it=>!it.subSubclass && MiscUtil.get(this._cacheBrewClassSpells, "subclass", it.class.source.toLowerCase(), it.class.name.toLowerCase(), it.subclass.source.toLowerCase(), it.subclass.name.toLowerCase())))
            return true;
        if (fromSubclassList.some(it=>it.subSubclass && MiscUtil.get(this._cacheBrewClassSpells, "subSubclass", it.class.source.toLowerCase(), it.class.name.toLowerCase(), it.subclass.source.toLowerCase(), it.subclass.name.toLowerCase(), it.subclass.subSubclass.toLowerCase())))
            return true;
        return false;
    }

    isAlwaysPreparedSpell_(sp) {
        const spellUid = this.constructor._getSpellUid(sp);
        if (this._state.alwaysPreparedSpellsRace.includes(spellUid))
            return true;
        if (this._state.alwaysPreparedSpellsBackground.includes(spellUid))
            return true;
        if (this._state.alwaysPreparedSpellsClass.includes(spellUid))
            return true;
        if (this._state.alwaysPreparedSpellsSubclass.includes(spellUid))
            return true;
        return false;
    }

    isAvailableExpandedSpell_(sp) {
        const spellUid = this.constructor._getSpellUid(sp);
        if (this._state.expandedSpellsRace.includes(spellUid))
            return true;
        if (this._state.expandedSpellsBackground.includes(spellUid))
            return true;
        if (this._state.expandedSpellsClass.includes(spellUid))
            return true;
        if (this._state.expandedSpellsSubclass.includes(spellUid))
            return true;
        return false;
    }

    isAlwaysKnownSpell_(sp) {
        const spellUid = this.constructor._getSpellUid(sp);
        if (this._state.alwaysKnownSpellsRace.includes(spellUid))
            return true;
        if (this._state.alwaysKnownSpellsBackground.includes(spellUid))
            return true;
        if (this._state.alwaysKnownSpellsClass.includes(spellUid))
            return true;
        if (this._state.alwaysKnownSpellsSubclass.includes(spellUid))
            return true;
        return false;
    }

    static _getSpellUid(sp) {
        return `${sp.name.toLowerCase()}|${sp.source.toLowerCase()}`;
    }

    set alwaysPreparedSpellsRace(val) {
        this._state.alwaysPreparedSpellsRace = val;
    }
    set alwaysPreparedSpellsBackground(val) {
        this._state.alwaysPreparedSpellsBackground = val;
    }
    set alwaysPreparedSpellsClass(val) {
        this._state.alwaysPreparedSpellsClass = val;
    }
    set alwaysPreparedSpellsSubclass(val) {
        this._state.alwaysPreparedSpellsSubclass = val;
    }

    set expandedSpellsRace(val) {
        this._state.expandedSpellsRace = val;
    }
    set expandedSpellsBackground(val) {
        this._state.expandedSpellsBackground = val;
    }
    set expandedSpellsClass(val) {
        this._state.expandedSpellsClass = val;
    }
    set expandedSpellsSubclass(val) {
        this._state.expandedSpellsSubclass = val;
    }

    set alwaysKnownSpellsRace(val) {
        this._state.alwaysKnownSpellsRace = val;
    }
    set alwaysKnownSpellsBackground(val) {
        this._state.alwaysKnownSpellsBackground = val;
    }
    set alwaysKnownSpellsClass(val) {
        this._state.alwaysKnownSpellsClass = val;
    }
    set alwaysKnownSpellsSubclass(val) {
        this._state.alwaysKnownSpellsSubclass = val;
    }

    //const filterValues = this._compSpell.filterValuesSpellsCache || this._compSpell.filterBoxSpells.getValues();
    /**
     * Description
     * @param {any} filterValues
     * @returns {{isFormComplete:boolean, data:{spells:any[]}}}
     */
    async pGetFormData(filterValues) {
        return {
            isFormComplete: (this._state.cntLearnedCantrips === this._state.maxLearnedCantrips || 0)
            && (this._state.cntPrepared === this._state.maxPrepared || 0),
            data: {
                spells: this._compsLevel.map(comp=>comp.getFormSubData(filterValues)).flat(),
            },
        };
    }

    _getDefaultState() {
        return {
            spellLevelLow: null,
            spellLevelHigh: null,
            ixViewedSpell: null,

            cntLearnedCantrips: 0,
            maxLearnedCantrips: null,

            fixedLearnedProgression: null,
            pulseFixedLearned: false,

            cntPrepared: 0,
            maxPrepared: null,

            alwaysPreparedSpellsRace: [],
            alwaysPreparedSpellsBackground: [],
            alwaysPreparedSpellsClass: [],
            alwaysPreparedSpellsSubclass: [],
            alwaysPreparedSpellsFeat: {},

            expandedSpellsRace: [],
            expandedSpellsBackground: [],
            expandedSpellsClass: [],
            expandedSpellsSubclass: [],
            expandedSpellsFeat: {},

            alwaysKnownSpellsRace: [],
            alwaysKnownSpellsBackground: [],
            alwaysKnownSpellsClass: [],
            alwaysKnownSpellsSubclass: [],
            alwaysKnownSpellsFeat: {},

            casterProgression: null,

            isIncludeUaEtcSpellLists: false,
        };
    }

    static _getMappedClassDetails({className, classSource}) {
        return Charactermancer_Spell._CLASS_MAP?.[classSource]?.[className] || {
            className,
            classSource
        };
    }

    /**
     * Get the known spells sorted by level
     * @returns {Charactermancer_Spell_SpellMeta[][]}
     */
    _test_getKnownSpells(){
        let spellsByLvl = [];
        for(let lvl = 0; lvl < this._compsLevel.length; ++lvl){
            if(!spellsByLvl[lvl]){spellsByLvl[lvl] = [];}
            //Get the component that handles spells for this level
            let comp = this._compsLevel[lvl];
            //Ask it for the known spells
            let known = comp.getKnownSpells().filter(sp => sp.isPrepared || sp.isLearned);
            //Add the known spells onto the array slot
            spellsByLvl[lvl] = spellsByLvl[lvl].concat(known);
        }
        return spellsByLvl;
    }
}
Charactermancer_Spell._IMPORT_LIST_SPELL = null;
Charactermancer_Spell._CLASS_MAP = {
    [Parser.SRC_UATRR]: {
        "Ranger (Revised)": {
            className: "Ranger",
            classSource: Parser.SRC_PHB,
        },
    },
};

Charactermancer_Spell.ExistingSpell = class {
    constructor({item, isLearned, isPrepared, isAlwaysPrepared}) {
        this.item = item;
        this.isLearned = isLearned;
        this.isPrepared = isPrepared;
        this.isAlwaysPrepared = isAlwaysPrepared;
    }
};

class Charactermancer_Spell_Modal extends Charactermancer_Spell {
    constructor(opts) {
        opts.pageFilter = new PageFilterSpells();

        super(opts);
    }

    static pGetUserInput(opts) {
        const comp = new this(opts);
        comp.maxLearnedCantrips = opts.maxLearnedCantrips;

        return UtilApplications.pGetImportCompApplicationFormData({
            comp,
            width: Util.getMaxWindowWidth(1200),
            height: Util.getMaxWindowHeight(),
        });
    }

    get modalTitle() {
        return `Select Cantrips`;
    }

    pRender($wrpModalInner) {
        const $wrpLhs = $(`<div class="ve-flex-col h-100 w-50"></div>`);
        const $wrpRhs = $(`<div class="ve-flex-col h-100 w-50"></div>`);

        const pRender = this._render_pFilterBox($wrpLhs);
        $wrpRhs.append(`<i class="ve-muted ve-text-center">Select a spell to view it here.</i>`);

        $$`<div class="split w-100 h-100">
			${$wrpLhs}
			<div class="vr-1 h-100"></div>
			${$wrpRhs}
		</div>`.appendTo($wrpModalInner);

        super.render($wrpLhs, $wrpRhs);

        return pRender.then(()=>{
            this.handleFilterChange(this._pageFilter.filterBox.getValues());
        }
        );
    }

    _render_pFilterBox($wrp) {
        const $btnFilter = $(`<button class="btn-5et veapp__btn-filter">Filter</button>`);
        const $btnToggleFilterSummary = $(`<button class="btn btn-5et" title="Toggle Filter Summary Display"><span class="glyphicon glyphicon-resize-small"></span></button>`);
        const $iptSearch = $(`<input type="search" class="search w-100 form-control h-initial" placeholder="Find spell...">`);
        const $btnReset = $(`<button class="btn-5et veapp__btn-list-reset">Reset</button>`).click(()=>$iptSearch.val("").keyup());

        const $wrpMiniPills = $(`<div class="fltr__mini-view btn-group"></div>`);

        $$($wrp)`
			<div class="ve-flex-v-stretch input-group input-group--top no-shrink">
				${$btnFilter}
				${$btnToggleFilterSummary}
				${$iptSearch}
				${$btnReset}
			</div>
			${$wrpMiniPills}
			<div class="ve-flex-v-stretch input-group input-group--bottom mb-1 no-shrink">
				<button class="btn-5et w-100" disabled></button>
			</div>
		`;

        return this._pageFilter.pInitFilterBox({
            $iptSearch: $iptSearch,
            $btnReset: $btnReset,
            $btnOpen: $btnFilter,
            $btnToggleSummaryHidden: $btnToggleFilterSummary,
            $wrpMiniPills: $wrpMiniPills,
            namespace: `Charactermancer_Spell_Modal.filter`,
        }).then(()=>{
            this._spellDatas.forEach(it=>this._pageFilter.mutateAndAddToFilters(it));

            this._pageFilter.trimState();
            this._pageFilter.filterBox.render();

            UiUtil.bindTypingEnd({
                $ipt: $iptSearch,
                fnKeyup: ()=>{
                    const val = List.getCleanSearchTerm($iptSearch.val());
                    if (this._lastSearchTermSpells === val)
                        return;
                    this._lastSearchTermSpells = val;

                    this.handleSearch(val);
                }
                ,
            });

            this._pageFilter.filterBox.on(FilterBox.EVNT_VALCHANGE, ()=>{
                this.handleFilterChange(this._pageFilter.filterBox.getValues());
            }
            );
        }
        );
    }
}
/**
 * An object that handles choosing spells for a particular level (including cantrips)
 */
class Charactermancer_Spell_Level extends BaseComponent {
    /**
     * @param {{parent:Charactermancer_Spell, spellLevel:number, spellDatas:{name:string, source:string, level:number}[]}} opts
     */
    constructor(opts) {
        super();
        opts = opts || {};

        this._spellDatas = opts.spellDatas;
        this._spellLevel = opts.spellLevel;
        this._parent = opts.parent;

        this._$wrpRows = null;
        this._$dispNoRows = null;
        this._list = null;
    }

    _isAvailableSpell(sp) { return sp.level === this._spellLevel; }

    render($wrp) {
        this._$wrpRows = $$`<div class="ve-flex-col manc__list mt-1 mb-3"></div>`;

        //This is only shown when we can't find any spells to offer
        this._$dispNoRows = $(`<div class="ve-flex-vh-center italic ve-muted ve-small mt-1">No matching spells</div>`).hideVe(); //Hide by default
        const doUpdateDispNoRows = ()=>{
            if(this._spellLevel == 0){
                //why is visible items not searched items?
                //Something is making them not be visible
            }
            this._$dispNoRows.toggleVe(!this._list.visibleItems.length && $btnToggle.text() !== "[+]");
        };

        const $wrpBtnsSort = $(`<div class="ve-flex-v-stretch input-group no-shrink">
			<button class="btn-default btn-5et btn-xxs col-3-2 pr-1 sort" data-sort="name">Name</button>
			<button class="btn-default btn-5et btn-xxs col-1-2 px-1 sort" data-sort="time">Time</button>
			<button class="btn-default btn-5et btn-xxs col-1-2 px-1 sort" data-sort="school">School</button>
			<button class="btn-default btn-5et btn-xxs col-0-5 px-1 sort" data-sort="concentration" title="Concentration">C.</button>
			<button class="btn-default btn-5et btn-xxs col-0-5 px-1 sort" data-sort="ritual" title="Ritual">R.</button>
			<button class="btn-default btn-5et btn-xxs col-2-6 px-1 sort" data-sort="range">Range</button>
			<button class="btn-default btn-5et btn-xxs col-1-2 px-1 sort" data-sort="source">Source</button>
			<button class="btn-default btn-5et btn-xxs col-1-6 pl-1" disabled>&nbsp;</button>
		</div>`);

        this._list = new List({
            $wrpList: this._$wrpRows,
            fnSort: PageFilterSpells.sortSpells, //this function is important
            fnSearch: (li,searchTerm)=>{
                return true; //TEMPFIX DEBUG
                const {ixLearned, ixPrepared, ixAlwaysPrepared, ixAlwaysKnownSpell} = this.constructor._getProps(li.ix);
                if ([ixLearned, ixPrepared, ixAlwaysPrepared, ixAlwaysKnownSpell].some(k=>this._state[k])) { return true; }
                if(!searchTerm || !searchTerm.length){return true;} //TEMPFIX DEBUG maybe this helps?
                return li.searchText.includes(searchTerm);
            },
        });
        SortUtil.initBtnSortHandlers($wrpBtnsSort, this._list);

        this._list.on("updated", ()=>doUpdateDispNoRows()); //Whenever the graphical list of spells is updated, check if we have any list items to show

        const $btnToggle = $(`<div class="py-1 clickable ve-muted">[\u2012]</div>`).click(()=>{
            $btnToggle.text($btnToggle.text() === "[+]" ? "[\u2012]" : "[+]");
            this._$wrpRows.toggleVe();
            $wrpBtnsSort.toggleVe();
            doUpdateDispNoRows();
        }
        );

        const $wrpInner = $$`<div class="ve-flex-col w-100">
			<div class="split-v-center">
				<div class="bold">${Parser.spLevelToFullLevelText(this._spellLevel)}</div>
				${$btnToggle}
			</div>
			${$wrpBtnsSort}
			${this._$dispNoRows}
			${this._$wrpRows}
		</div>`.appendTo($wrp);

        //Go through spellDatas and add spells that are available to us to _list
        const len = this._spellDatas.length;
        for (let i = 0; i < len; ++i) {
            const sp = this._spellDatas[i];
            if (!this._isAvailableSpell(sp)){continue;}
            const listItem = this._getListItem(sp, i); //Create an item to show in the list of choices
            if (!listItem){continue;}
            this._list.addItem(listItem);
        }

        this._list.init();


        const hkSpellLevel = ()=>{
            const isWithinRange = this._isWithinLevelRange();
            $wrpInner.toggleVe(isWithinRange);
            if (!isWithinRange){this._resetLevelSpells();}
        };

        this._parent.addHookMaxLearnedCantrips(hkSpellLevel);
        this._parent.addHookSpellLevelLow(hkSpellLevel);
        this._parent.addHookSpellLevelHigh(hkSpellLevel);
        this._parent.addHookFixedLearnedProgression(hkSpellLevel);
        hkSpellLevel();

        if (this._spellLevel === 0){this._render_bindCantripHooks();}
        else {this._render_bindLevelledSpellHooks();}
    }

    _render_bindCantripHooks() {
        const hkIsMaxLearnedCantrips = ()=>{
            this._$wrpRows.toggleClass("manc-sp__is-max-learned-cantrips", !this._parent.canLearnMoreCantrips_());
            this._$wrpRows.toggleClass("manc-sp__is-max-learned-cantrips--is-over-limit", this._parent.isOverLearnCantripsLimit_());
        };
        this._parent.addHookIsMaxLearnedCantrips(hkIsMaxLearnedCantrips);
        hkIsMaxLearnedCantrips();
    }

    _render_bindLevelledSpellHooks() {
        const hkIsPrepared = ()=>this._$wrpRows.toggleClass("manc-sp__is-prepared-caster", this._parent.isPreparedCaster);
        this._parent.addHookIsPreparedCaster(hkIsPrepared);
        hkIsPrepared();

        const hkIsMaxLearnedSpells = ()=>{
            const isLearnCaster = this._parent.isLearnedFixedSpellCasterAtLevel_(this._spellLevel);

            let isMaxLearnedSpells = true;
            let isOverMaxLearnedSpells = true;

            if (isLearnCaster) {
                if (this._parent.canLearnMoreFixedSpellsOfLevel_(this._spellLevel))
                    isMaxLearnedSpells = false;
                if (!this._parent.isOverLearnFixedSpellsLimitOfLevel_(this._spellLevel))
                    isOverMaxLearnedSpells = false;
            }

            this._$wrpRows.toggleClass("manc-sp__is-learn-caster", isLearnCaster);
            this._$wrpRows.toggleClass("manc-sp__is-max-learned-spells", isLearnCaster && isMaxLearnedSpells);
            this._$wrpRows.toggleClass("manc-sp__is-max-learned-spells--is-over-limit", isLearnCaster && isOverMaxLearnedSpells);
        }
        ;
        this._parent.addHookIsMaxLearnedSpells(hkIsMaxLearnedSpells);
        hkIsMaxLearnedSpells();

        const hkIsMaxPrepared = ()=>{
            this._$wrpRows.toggleClass("manc-sp__is-max-prepared-spells", !this._parent.canPrepareMore_());
            this._$wrpRows.toggleClass("manc-sp__is-max-prepared-spells--is-over-limit", this._parent.isOverPrepareLimit_());
        }
        ;
        this._parent.addHookIsMaxPrepared(hkIsMaxPrepared);
        hkIsMaxPrepared();
    }

    _isWithinLevelRange() {
        if (this._spellLevel !== 0 && this._parent.fixedLearnedProgression != null
            && this._parent.fixedLearnedProgression[this._spellLevel - 1])
            {return true;}

        //Check that we are allowed to learn at least one cantrip max
        if (this._spellLevel === 0) {
            return !!this._parent.maxLearnedCantrips;
        }

        return this._spellLevel >= (this._parent.spellLevelLow ?? Number.MAX_SAFE_INTEGER)
        && this._spellLevel <= (this._parent.spellLevelHigh ?? Number.MIN_SAFE_INTEGER);
    }

    /**
     * Create a new list item UI element
     * @param {{source:string, _isConc:boolean, school:string}} spell
     * @param {number} spI
     * @returns {any}
     */
    _getListItem(spell, spI) {
        const {ixLearned, ixPrepared, ixAlwaysPrepared, ixAlwaysKnownSpell} = this.constructor._getProps(spI);

        const existingSpellMeta = this._parent.getExistingSpellMeta_(spell);
        if (existingSpellMeta) {
            if (existingSpellMeta.isLearned) {
                this._state[ixLearned] = true;
                if (spell.level === 0)
                    this._parent.cntLearnedCantrips++;
            }

            if (existingSpellMeta.isPrepared && !existingSpellMeta.isAlwaysPrepared) {
                this._state[ixPrepared] = true;
                this._parent.cntPrepared++;
            }

            if (existingSpellMeta.isAlwaysPrepared) {
                this._state[ixAlwaysPrepared] = true;
            }
        }

        const eleRow = document.createElement("div");
        eleRow.className = `ve-flex-v-center manc__list-row clickable veapp__list-row veapp__list-row-hoverable`;
        eleRow.dataset.ix = spI;

        const source = Parser.sourceJsonToAbv(spell.source);
        const time = PageFilterSpells.getTblTimeStr(spell.time[0]);
        const school = Parser.spSchoolAndSubschoolsAbvsShort(spell.school, spell.subschools);
        const concentration = spell._isConc ? "×" : "";
        const ritual = spell.meta?.ritual ? "×" : "";
        const range = Parser.spRangeToFull(spell.range);

        const isLearnDisabled = existingSpellMeta || this._state[ixAlwaysKnownSpell];

        const isPrepareDisabledExistingSpell = existingSpellMeta && (this._spellLevel === 0 || existingSpellMeta.isLearned);
        const isPrepareDisabled = isPrepareDisabledExistingSpell || this._state[ixAlwaysPrepared];

        eleRow.innerHTML = `
			<div class="col-3-2 pl-0">${spell.name}</div>
			<div class="col-1-2 ve-text-center">${time}</div>
			<div class="col-1-2 sp__school-${spell.school} ve-text-center" title="${Parser.spSchoolAndSubschoolsAbvsToFull(spell.school, spell.subschools)}" ${Parser.spSchoolAbvToStyle(spell.school)}>${school}</div>
			<div class="col-0-5 ve-text-center bold imp-sp__disp-conc" title="Concentration">${concentration}</div>
			<div class="col-0-5 ve-text-center bold imp-sp__disp-ritual" title="Ritual">${ritual}</div>
			<div class="col-2-6 text-right">${range}</div>
			<div class="col-1-2 ve-text-center ${Parser.sourceJsonToColor(spell.source)}" title="${Parser.sourceJsonToFull(spell.source)}" ${Parser.sourceJsonToStyle(spell.source)}>${source}</div>

			<div class="ve-flex-vh-center col-1-6 pr-0">
				<button
					class="btn btn-default manc__list-row-button ${this._spellLevel === 0 ? "manc-sp__btn-learn-cantrip" : "manc-sp__btn-learn-spell"} ${this._state[ixLearned] || existingSpellMeta?.isLearned || this._state[ixAlwaysKnownSpell] ? "active" : ""}"
					name="${this._spellLevel === 0 ? "btn-learn-cantrip" : "btn-learn-spell"}"
					${isLearnDisabled ? `disabled` : ""}
					${existingSpellMeta ? `data-plut-is-existing-spell="true"` : ""}
					${existingSpellMeta ? `title="(Previously Learned Spell)"` : ""}
				>Learn</button>

				${this._spellLevel !== 0 ? `<button
					class="btn-default btn manc__list-row-button manc-sp__btn-prepare ${this._state[ixPrepared] || this._state[ixAlwaysPrepared] || existingSpellMeta?.isPrepared || existingSpellMeta?.isAlwaysPrepared ? "active" : ""}"
					name="btn-prepare"
					title="${isPrepareDisabledExistingSpell ? `(Previously Added Spell)` : `Prepare`}"
					${isPrepareDisabled ? `disabled` : ""}
					${isPrepareDisabledExistingSpell ? `data-plut-is-existing-spell="true"` : ""}
				>Prep.</button>` : ""}
			</div>
		`;

        const elesBtns = eleRow.querySelectorAll("button");
        const [btnLearn,btnPrepare] = elesBtns;

        const listItem = new ListItem(spI,eleRow,spell.name,{
            source,
            level: spell.level,
            time,
            school: Parser.spSchoolAbvToFull(spell.school),
            concentration,
            ritual,
            normalisedTime: spell._normalisedTime,
            normalisedRange: spell._normalisedRange,
        },{
            btnLearn,
            btnPrepare,
        },);

        elesBtns.forEach(btn=>{
            btn.addEventListener("click", evt=>{
                evt.stopPropagation();
                evt.preventDefault();
                document.activeElement.blur();

                const isActive = btn.classList.contains("active");

                switch (btn.name) {
                case "btn-learn-cantrip":
                    {
                        if (!isActive && !this._parent.canLearnMoreCantrips_())
                            return;

                        btn.classList.toggle("active");
                        this._state[ixLearned] = !this._state[ixLearned];
                        if (this._state[ixLearned])
                            this._parent.cntLearnedCantrips++;
                        else
                            this._parent.cntLearnedCantrips--;

                        break;
                    }

                case "btn-learn-spell":
                    {
                        this._handleListItemBtnLearnClick_doFixed({
                            btnLearn,
                            btnPrepare,
                            isActive,
                            ixPrepared,
                            ixLearned
                        });
                        break;
                    }

                case "btn-prepare":
                    {
                        if (!isActive && !this._parent.canPrepareMore_())
                            return;

                        if (!isActive && this._parent.isLearnedFixedSpellCasterAtLevel_(this._spellLevel) && !this._state[ixLearned]) {
                            const isLearned = this._handleListItemBtnLearnClick_doFixed({
                                btnLearn,
                                btnPrepare,
                                isActive: this._state[ixLearned],
                                ixPrepared,
                                ixLearned
                            });
                            if (!isLearned)
                                return;
                        }

                        btn.classList.toggle("active");
                        this._state[ixPrepared] = !this._state[ixPrepared];
                        if (this._state[ixPrepared])
                            this._parent.cntPrepared++;
                        else
                            this._parent.cntPrepared--;

                        break;
                    }

                default:
                    throw new Error(`Unhandled button name: "${btn.name}"`);
                }
            }
            );
        }
        );

        eleRow.addEventListener("click", evt=>{
            evt.stopPropagation();
            evt.preventDefault();

            if (this._parent.cacheSelectedListItem)
                this._parent.cacheSelectedListItem.ele.classList.remove("list-multi-selected");

            eleRow.classList.add("list-multi-selected");
            this._parent.ixViewedSpell = spI;
            this._parent.cacheSelectedListItem = listItem;
        }
        );

        return listItem;
    }
    /**
     * Mark a spell as prepared or learned. Only used when loading from a save file.
     * @param {number} spI index of the spell
     */
    markSpellAsLearnedKnown(spI){
        const items = this._list._items; //or _filteredItems?
        const matches = items.filter(it => it.ix == spI);
        const m = matches[0];
        const lvl = this._spellLevel;

        //We need to know if this spell is learned, prepared, alwaysPrepared, or alwaysKnown
        //We can also assume the spell is the same level as this._spellLevel
        //We can assume that cantrips are always learn

        //Get the spell
        const spell = this._spellDatas[spI];
        const existingSpellMeta = this._parent.getExistingSpellMeta_(spell);
        const {ixLearned, ixPrepared, ixAlwaysPrepared, ixAlwaysKnownSpell} = this.constructor._getProps(spI);

        const isLearnDisabled = existingSpellMeta || this._state[ixAlwaysKnownSpell];

        const isPrepareDisabledExistingSpell = !!existingSpellMeta && (lvl == 0 || existingSpellMeta.isLearned);
        const isPrepareDisabled = isPrepareDisabledExistingSpell || this._state[ixAlwaysPrepared];

        const isPreparedCaster = this._parent.isPreparedCaster;
        //console.log("INFO", isLearnDisabled, isPrepareDisabledExistingSpell, isPrepareDisabled, existingSpellMeta, spell);

        const doLearn = !isPreparedCaster || lvl == 0;
        if(doLearn){
            m.data.btnLearn.classList.add("active");
            this._state[ixLearned] = true;
            if (lvl == 0){this._parent.cntLearnedCantrips++;}
            else{this._parent.cntPrepared++;}
        }
        else {
            m.data.btnPrepare.classList.add("active");
            this._state[ixPrepared] = true;
            if (lvl == 0){this._parent.cntLearnedCantrips++;} //Should not happen, we never prepare cantrips
            else{this._parent.cntPrepared++;}
        }
    }

    _handleListItemBtnLearnClick_do_doLearn({btnLearn, btnPrepare, isActive, ixPrepared, ixLearned}) {
        if(this._spellLevel == 0){console.error("_handleListItemBtnLearnClick_do_doLearn");}
        if (isActive && this._parent.isPreparedCaster && this._state[ixPrepared]) {
            this._state[ixPrepared] = false;
            btnPrepare.classList.remove("active");
            this._parent.cntPrepared--;
        }

        btnLearn.classList.toggle("active");
        this._state[ixLearned] = !this._state[ixLearned];
    }

    _handleListItemBtnLearnClick_doFixed({btnLearn, btnPrepare, isActive, ixPrepared, ixLearned}) {
        if(this._spellLevel == 0){console.error("_handleListItemBtnLearnClick_doFixed");}
        if (!isActive && !this._parent.canLearnMoreFixedSpellsOfLevel_(this._spellLevel))
            return false;

        this._handleListItemBtnLearnClick_do_doLearn({
            btnLearn,
            btnPrepare,
            isActive,
            ixPrepared,
            ixLearned
        });
        this._parent.pulseFixedLearned = !this._parent.pulseFixedLearned;

        return true;
    }

    handleFilterChange(f) {
        if (!this._list){return;}

        this._list.filter(it=>{
            const sp = this._spellDatas[it.ix];

            //_parent is a Charactermancer_Spell object
            if (!this._parent.isAvailableClassSpell_(sp)
            && !this._parent.isAvailableSubclassSpell_(sp)
            && !this._parent.isAvailableExpandedSpell_(sp))
            { return false; }

            const {ixLearned, ixPrepared, ixAlwaysPrepared, ixAlwaysKnownSpell} = this.constructor._getProps(it.ix);

            if ([ixLearned, ixPrepared, ixAlwaysPrepared, ixAlwaysKnownSpell].some(k=>this._state[k]))
            {return true;}

            return this._parent.pageFilter.toDisplay(f, sp);
        });
    }

    handleSearch(searchTerm) {
        this._list.search(searchTerm);
    }

    handleAlwaysPreparedSpells_() {
        return this._handleAlwaysStateSpells_({
            propIx: "ixPrepared",
            propParentCnt: "cntPrepared",
            propIxAlways: "ixAlwaysPrepared",
            propBtn: "btnPrepare",
            propExistingSpellMetaAlways: "isAlwaysPrepared",
            fnParentCheckAlways: this._parent.isAlwaysPreparedSpell_.bind(this._parent),
        }, );
    }

    handleAlwaysKnownSpells_() {
        return this._handleAlwaysStateSpells_({
            propIx: "ixLearned",
            propParentCnt: this._spellLevel === 0 ? "cntLearnedCantrips" : "cntLearnedSpells",
            propIxAlways: "ixAlwaysKnownSpell",
            propBtn: "btnLearn",
            fnParentCheckAlways: this._parent.isAlwaysKnownSpell_.bind(this._parent),
        }, );
    }

    _handleAlwaysStateSpells_({propIx, propParentCnt, propIxAlways, propBtn, propExistingSpellMetaAlways, fnParentCheckAlways, fnFilterSpell, }, ) {
        if (!this._list)
            return;

        this._list.items.forEach(it=>{
            const sp = this._spellDatas[it.ix];

            if (fnFilterSpell && !fnFilterSpell(sp))
                return;

            const existingSpellMeta = this._parent.getExistingSpellMeta_(sp);
            if (existingSpellMeta?.isLearned || existingSpellMeta?.isPrepared)
                return;

            const allProps = this.constructor._getProps(it.ix);
            const propIxProp = allProps[propIx];
            const propIxAlwaysProp = allProps[propIxAlways];

            const isAlways = (propExistingSpellMetaAlways && existingSpellMeta?.[propExistingSpellMetaAlways]) || fnParentCheckAlways(sp);

            if (isAlways) {
                if (this._state[propIxProp]) {
                    this._state[propIxProp] = false;
                    this._parent[propParentCnt]--;
                }

                if (!this._state[propIxAlwaysProp] && it.data[propBtn]) {
                    it.data[propBtn].classList.add("active");
                    it.data[propBtn].disabled = true;
                }
            }
            else {
                if (this._state[propIxAlwaysProp] && it.data[propBtn]) {
                    it.data[propBtn].classList.remove("active");
                    it.data[propBtn].disabled = false;
                }
            }

            this._state[propIxAlwaysProp] = isAlways;
        }
        );
    }

    static _getProps(ix) {
        return {
            ixLearned: `ix_learned_${ix}`,
            ixPrepared: `ix_prepared_${ix}`,
            ixAlwaysPrepared: `ix_always_prepared_${ix}`,
            ixAlwaysKnownSpell: `ix_always_known_spell_${ix}`,
        };
    }

    /**
     * This function will reset(clear) any learned or prepared spells
     */
    _resetLevelSpells() {
        let numDeLearned = 0;
        let numDePrepared = 0;
        //Create a new blank state
        const nxtState = {};

        const len = this._spellDatas.length;
        for (let i = 0; i < len; ++i) {
            const sp = this._spellDatas[i];

            if (!this._isAvailableSpell(sp)){continue;}

            const existingSpellMeta = this._parent.getExistingSpellMeta_(sp);
            if (existingSpellMeta){continue;}

            const {ixLearned, ixPrepared, ixAlwaysPrepared, ixAlwaysKnownSpell} = this.constructor._getProps(i);

            //If the spell was learned, de-learn it
            if (this._state[ixLearned]) { nxtState[ixLearned] = false; numDeLearned++; }

            if (this._state[ixPrepared]) { nxtState[ixPrepared] = false; numDePrepared++; }

            if (this._state[ixAlwaysPrepared]){nxtState[ixAlwaysPrepared] = false;}

            if (this._state[ixAlwaysKnownSpell]){nxtState[ixAlwaysKnownSpell] = false;}
        }

        this._proxyAssignSimple("state", nxtState);

        
        

        if (numDeLearned) {
            if (this._spellLevel === 0) {
                this._parent.cntLearnedCantrips -= numDeLearned;
                this._$wrpRows[0].querySelectorAll(`.manc-sp__btn-learn-cantrip`).forEach(it=>{
                    if (it.dataset?.["plut-is-existing-spell"]){return;}
                    it.classList.remove("active");
                });
            }
            else {
                this._parent.cntLearnedSpells -= numDeLearned;
                this._$wrpRows[0].querySelectorAll(`.manc-sp__btn-learn-spell`).forEach(it=>{
                    if (it.dataset?.["plut-is-existing-spell"]){return;}
                    it.classList.remove("active");
                });
            }
        }

        if (numDePrepared) {
            this._parent.cntPrepared -= numDePrepared;
            this._$wrpRows[0].querySelectorAll(`.manc-sp__btn-prepare`).forEach(it=>{
                if (it.dataset?.["plut-is-existing-spell"]){return;}
                it.classList.remove("active");
            }
            );
        }
    }

    /**
     * Returns all spells chosen to be learned at this level. Does not handle level 0 (cantrips)
     * @returns {{ix:number, spell:any}[]}
     */
    getSpellsKnown(includeCantrips = false, includeLearned = true, includePrepared = true, includeAlwaysPrepared=true, includeAlwaysKnown=true) {
        //TEMPFIX, quite lazy
        if ((!this._isWithinLevelRange() || this._spellLevel === 0) && !includeCantrips) {return [];}

        const out = [];

        const len = this._spellDatas.length;
        for (let i = 0; i < len; ++i) {
            const sp = this._spellDatas[i];

            if (!this._isAvailableSpell(sp)){continue;}
            if (!this._parent.isAvailableClassSpell_(sp) && !this._parent.isAvailableSubclassSpell_(sp)
            && !this._parent.isAvailableExpandedSpell_(sp)){continue;}

            const {ixLearned, ixPrepared, ixAlwaysPrepared, ixAlwaysKnownSpell} = this.constructor._getProps(i);

            let isLearned = includeLearned && this._state[ixLearned];
            let isPrepared = includePrepared && this._state[ixPrepared];
            let isAlwaysPrepared = includeAlwaysPrepared && this._state[ixAlwaysPrepared];
            let isAlwaysKnown = includeAlwaysKnown && this._state[ixAlwaysKnownSpell];
            if (!isLearned && !isPrepared && !isAlwaysPrepared && !isAlwaysKnown){continue;}

            out.push({ ix: i, spell: this._spellDatas[i]});
        }

        return out;
    }

    /**
     * @param {any} filterValues
     * @returns {Charactermancer_Spell_SpellMeta[]}
     */
    getFormSubData(filterValues) {
        if (!this._isWithinLevelRange()){return [];}
        const out = [];

        const isLearnedAtLevel = this._parent.isLearnedFixedSpellCasterAtLevel_(this._spellLevel);

        const len = this._spellDatas.length;
        for (let i = 0; i < len; ++i) {
            const sp = this._spellDatas[i];

            if (!this._isAvailableSpell(sp))
                continue;
            if (!this._parent.isAvailableClassSpell_(sp) && !this._parent.isAvailableSubclassSpell_(sp) && !this._parent.isAvailableExpandedSpell_(sp))
                continue;

            const {ixLearned, ixPrepared, ixAlwaysPrepared, ixAlwaysKnownSpell} = this.constructor._getProps(i);

            if (this._state[ixAlwaysPrepared] || this._state[ixAlwaysKnownSpell])
                continue;

            const isLearned = !!this._state[ixLearned];
            const isPrepared = this._state[ixPrepared] || (this._spellLevel === 0 && isLearned);

            if (this._spellLevel === 0 && !isLearned)
                continue;

            let isUpdatePrepared = false;
            const existingSpellMeta = this._parent.getExistingSpellMeta_(sp);
            if (existingSpellMeta) {
                if (this._spellLevel === 0)
                    continue;
                if (isLearnedAtLevel)
                    continue;
                isUpdatePrepared = existingSpellMeta.isPrepared !== isPrepared;
                if (!isUpdatePrepared)
                    continue;
            }

            if (!isLearned && isLearnedAtLevel){continue;}

            if (this._parent.isPreparedCaster && !isLearned && !isPrepared && !this._parent.pageFilter.toDisplay(filterValues, sp))
                continue;

            const spellImportOpts = this._getFormSubData_getSpellImportOpts({
                isLearned
            });

            out.push(new Charactermancer_Spell_SpellMeta({
                ...spellImportOpts,
                ix: i,
                spell: this._spellDatas[i],
                isPrepared,
                isLearned,
                isUpdateOnly: isUpdatePrepared,
                existingItemId: existingSpellMeta?.item?.id,
            }));
        }

        return out;
    }

    _getFormSubData_getSpellImportOpts({isLearned}) {
        let preparationMode = "always";
        let usesValue = null;
        let usesMax = null;
        let usesPer = null;

        if (this._spellLevel === 0) {
            preparationMode = "always";
        } else if (this._parent.casterProgression === "pact") {
            if (isLearned) {
                if (this._spellLevel > UtilActors.PACT_CASTER_MAX_SPELL_LEVEL) {
                    preparationMode = "atwill";
                    usesValue = 1;
                    usesMax = 1;
                    usesPer = "lr";
                } else
                    preparationMode = "pact";
            }
        } else {
            preparationMode = this._parent.isPreparedCaster ? "prepared" : "always";
        }

        return {
            preparationMode,
            usesValue,
            usesMax,
            usesPer
        };
    }

    /**Just a lazy copy of  getFormSubData but without the filter crap*/
    getKnownSpells(){
        if (!this._isWithinLevelRange()){return [];}
        const out = [];

        const isLearnedAtLevel = this._parent.isLearnedFixedSpellCasterAtLevel_(this._spellLevel);

        const len = this._spellDatas.length;
        for (let i = 0; i < len; ++i) {
            const sp = this._spellDatas[i];

            if (!this._isAvailableSpell(sp)){continue;}
            if (!this._parent.isAvailableClassSpell_(sp) && !this._parent.isAvailableSubclassSpell_(sp)
            && !this._parent.isAvailableExpandedSpell_(sp)){continue;}
                

            const {ixLearned, ixPrepared, ixAlwaysPrepared, ixAlwaysKnownSpell} = this.constructor._getProps(i);

            if (this._state[ixAlwaysPrepared] || this._state[ixAlwaysKnownSpell]){continue;}

            const isLearned = this._state[ixLearned];
            const isPrepared = this._state[ixPrepared] || (this._spellLevel === 0 && isLearned);

            if (this._spellLevel === 0 && !isLearned){continue;}

            let isUpdatePrepared = false;
            const existingSpellMeta = this._parent.getExistingSpellMeta_(sp);
            if (existingSpellMeta) {
                if (this._spellLevel === 0){continue;}
                if (isLearnedAtLevel){continue;}
                isUpdatePrepared = existingSpellMeta.isPrepared !== isPrepared;
                if (!isUpdatePrepared){continue;}
            }

            if (!isLearned && isLearnedAtLevel){continue;}

                //Hopefully commenting this out wont do any harm
            /* if (this._parent.isPreparedCaster && !isLearned && !isPrepared && !this._parent.pageFilter.toDisplay(filterValues, sp))
                continue; */

            const spellImportOpts = this._getFormSubData_getSpellImportOpts({ isLearned });

            out.push(new Charactermancer_Spell_SpellMeta({
                ...spellImportOpts,
                ix: i,
                spell: this._spellDatas[i],
                isPrepared,
                isLearned,
                isUpdateOnly: isUpdatePrepared,
                existingItemId: existingSpellMeta?.item?.id,
            }));
        }

        return out;
    }
}
//#endregion

//#region Charactermancer Feats
class ActorCharactermancerFeat extends ActorCharactermancerBaseComponent {
    constructor(parentInfo) {
      parentInfo = parentInfo || {};
      super();
      this._actor = parentInfo.actor;
      this._data = parentInfo.data;
      this._parent = parentInfo.parent;
      this._tabFeats = parentInfo.tabFeats;
      this._modalFilterFeats = new ModalFilterFeatsFvtt({
        'namespace': "ActorCharactermancer.feats",
        'isRadio': true,
        'allData': this._data.feat
      });
      this._compAdditionalFeatsMetas = {};
      this._isSuspendSyncToStatgen = false;
    }

    render() {
        const tabFeats = this._tabFeats?.$wrpTab;
        if (!tabFeats) { return; }
        const wrapper = $$`<div class="ve-flex-col w-100 h-100 px-1 pt-1 overflow-y-auto ve-grow veapp__bg-foundry"></div>`;
        const sectionParent = $$`<div class="ve-flex-col w-100 h-100 px-1 overflow-y-auto ve-grow veapp__bg-foundry"></div>`;
        const noFeatsWarningLbl = $("<div><i class=\"ve-muted\">No feats are available for your current build.</i><hr class=\"hr-1\"></div>").appendTo(wrapper);
        const setAlertNoFeatsAvailable = () => {
          const elements = ["feat_availableFromAsi", "feat_availableFromRace", 'feat_availableFromBackground', "feat_availableFromCustom"]
          .some(prop => this._state[prop]?.length);
          noFeatsWarningLbl.toggleVe(!elements);
        };
        this._addHookBase("feat_availableFromAsi", setAlertNoFeatsAvailable);
        this._addHookBase('feat_availableFromRace', setAlertNoFeatsAvailable);
        this._addHookBase("feat_availableFromBackground", setAlertNoFeatsAvailable);
        this._addHookBase("feat_availableFromCustom", setAlertNoFeatsAvailable);
        setAlertNoFeatsAvailable();
        this._feat_addFeatSection(wrapper, sectionParent, "feat_availableFromAsi", "ability");
        this._feat_addFeatSection(wrapper, sectionParent, "feat_availableFromRace", "race");
        this._feat_addFeatSection(wrapper, sectionParent, "feat_availableFromBackground", "background");
        this._feat_addFeatSection(wrapper, sectionParent, "feat_availableFromCustom", "custom");
        const btnAddCustomFeat = $("<button class=\"btn btn-5et btn-sm\">Add Feat</button>").click(() => this._parent.compAbility.compStatgen.addCustomFeat());
        
        $$`<div class="ve-flex w-100 h-100">
                <div class="ve-flex-col w-100">
                    ${wrapper}
                    <div class="mt-2">${btnAddCustomFeat}</div>
                </div>
                <div class="vr-1"></div>
                ${sectionParent}
            </div>`.appendTo(tabFeats);

        this.setAdditionalFeatStateFromStatgen_();
        const onBackgroundPulse = () => this._state.feat_availableFromBackground = this._parent.compBackground.getFeatureCustomizedBackground_({
          'isAllowStub': false
        })?.["feats"];
        this._parent.compBackground.addHookBase("background_pulseBackground", onBackgroundPulse);

        this._state.feat_availableFromBackground = this._parent.compBackground.getFeatureCustomizedBackground_({
          'isAllowStub': false
        })?.["feats"];
    }

    get modalFilterFeats() {
      return this._modalFilterFeats;
    }
    async pLoad() {
      await this._modalFilterFeats.pPreloadHidden();
    }

    setAdditionalFeatStateFromStatgen_() {
      const formData = this._parent.compAbility.compStatgen.getFormDataAsi();
      if (!formData.feats) {
        const defaultState = this._getDefaultState();
        const newState = ["feat_availableFromAsi", "feat_availableFromRace", "feat_availableFromBackground", 'feat_availableFromCustom'].mergeMap(val => ({
          prop: defaultState[val]
        }));
        this._proxyAssignSimple("state", newState);
        return;
      }
      const newState = {};
      Object.entries(formData.feats).forEach(([key, value]) => {
        const num = value.filter(Boolean).length;
        switch (key) {
          case "ability":
            newState.feat_availableFromAsi = num ? [{ any: num }] : [];
            break;
          case "race":
            newState.feat_availableFromRace = this._parent.compRace.getRace_()?.["feats"];
            break;
          case "background":
            newState.feat_availableFromBackground = this._parent.compBackground.getBackground_()?.['feats'];
            break;
          case "custom":
            newState.feat_availableFromCustom = num ? [{ any: num }] : [];
            break;
          default:
            throw new Error("Unhandled feat namespace \"" + key + "\"");
        }
      });
      this._parent.compFeat.proxyAssignSimple('state', newState);
      try {
        this._isSuspendSyncToStatgen = true;
        Object.entries(formData.feats).forEach(([key, value]) => {
          const additional = this._compAdditionalFeatsMetas[key]?.['comp'];
          if (!additional) { return; }
          additional.setStateFromStatgenFeatList_(value);
        });
      }
      finally { this._isSuspendSyncToStatgen = false; }
    }
    
    _feat_addFeatSection(wrpLeft, wrpRight, prop, namespace) {
      let prevComp = null;
      const hook = () => {
        const val = this._state[prop];
        this._parent.featureSourceTracker_.unregister(prevComp);
        if (prevComp) { prevComp.unregisterFeatureSourceTracking(); }
        prevComp = this._feat_renderAdditionalFeats({
          $wrpLeft: wrpLeft,
          $wrpRight: wrpRight,
          namespace: namespace,
          available: val,
          prevComp: prevComp
        });
      };
      this._addHookBase(prop, hook);
      hook();
    }
    _feat_renderAdditionalFeats({ $wrpLeft, $wrpRight, namespace, available, prevComp = null }) {
      if (this._compAdditionalFeatsMetas[namespace]) {
        this._compAdditionalFeatsMetas[namespace].cleanup();
      }
      if (!available?.length) { return; }
      const colLeft = $("<div class=\"ve-flex-col w-100\"></div>").appendTo($wrpLeft);
      const colRight = $("<div class=\"ve-flex-col w-100\"></div>").appendTo($wrpRight);
      const addFeatsSelect = new Charactermancer_AdditionalFeatsSelect({
        available: available,
        actor: this._actor,
        featDatas: this._data.feat,
        modalFilterFeats: this._modalFilterFeats,
        modalFilterSpells: this._parent.compSpell.modalFilterSpells,
        featureSourceTracker: this._parent.featureSourceTracker_,
        isFeatureSelect: true,
        prevComp: prevComp
      });
      this._feat_renderAdditionalFeats_addStatgenHandling({
        compAdditionalFeats: addFeatsSelect,
        namespace: namespace
      });
      this._compAdditionalFeatsMetas[namespace] = {
        comp: addFeatsSelect,
        cleanup: () => { colLeft.remove(); colRight.remove(); }
      };
      addFeatsSelect.renderTwoColumn({ $wrpLeft: colLeft, $wrpRight: colRight });
      return addFeatsSelect;
    }
    _feat_renderAdditionalFeats_addStatgenHandling({ compAdditionalFeats, namespace }) {
      if (!ActorCharactermancerFeat._NAMESPACES_STATGEN.has(namespace)) { return; }
      const hkFeats = () => {
        if (this._isSuspendSyncToStatgen) {
          return;
        }
        const formData = compAdditionalFeats.getFormDataReduced();
        const avail = compAdditionalFeats.ixSetAvailable;
        if (["race", 'background'].includes(namespace)) {
          this._parent.compAbility.compStatgen.setIxFeatSet(namespace, avail);
          const filtered = formData.data.filter(({ type: type }) => type === "choose").map(({
            ix: ix,
            ixFeat: ixFeat
          }) => ({
            ix: ix,
            ixFeat: ixFeat
          }));
          this._parent.compAbility.compStatgen.setIxFeatSetIxFeats(namespace, filtered);
        }
        else {
          if (['ability'].includes(namespace)) {
            let aa = -1;
            let bb = 0;
            (formData.ixsStatgen || []).forEach(ix => {
              if (ix > aa + bb + 1) { bb += ix - (aa + bb + 1); }
              const feat = formData.data.find(val => val.ix + bb === ix);
              this._parent.compAbility.compStatgen.setIxFeat(ix, namespace, feat?.["ixFeat"] ?? -1);
              aa++;
            });
          }
          else if (['custom'].includes(namespace)) {
            formData.data.forEach(val => {
              this._parent.compAbility.compStatgen.setIxFeat(val.ix, namespace, val.ixFeat);
            });
          }
        }
      };
      compAdditionalFeats.addHookPulseFeats(hkFeats);
      hkFeats();
    }
    async feat_pGetAdditionalFeatFormData() {
      const out = {
        ability: null,
        race: null,
        background: null,
        custom: null,
        isAnyData: false
      };
      for (const prop of ["ability", "race", "background", "custom"]) {
        if (!this._compAdditionalFeatsMetas[prop]) { continue; }
        const { comp } = this._compAdditionalFeatsMetas[prop];
        out[prop] = await comp.pGetFormData();
        out.isAnyData = true;
      }
      return out;
    }
    _getDefaultState() {
      return {
        feat_availableFromAsi: [],
        feat_availableFromRace: null,
        feat_availableFromBackground: null,
        feat_availableFromCustom: [],
        feat_pulseChange: false
      };
    }

    //Return an array, each entry containing a key pointing to the choiceObj, and an array containing the choiceComponents
    static getChoiceComponents(compAdditionalFeatMetas, type) {
        let chooseObj = compAdditionalFeatMetas._compsFeatFeatureOptionsSelect.choose;
        console.log("CHOOSEOBJ", chooseObj);
        //chooseObj:
        //- 0: { //this index counting is going to be seperate for each kind of feat source (ASI feat, race feat, etc)
        //-- Array[
        let toReturn = [];
        if(chooseObj == null){ console.error("chooseObj was null"); return toReturn;}
        //We should know which type this chooseObj is (race feat, ASI feat, custom feat, etc)
        for(let choiceKey of Object.keys(chooseObj)){
            let subArray = chooseObj[choiceKey];
            toReturn.push({sourceType: type, key:choiceKey, components:subArray});
        }
        return toReturn;
    }
    static async wait(seconds){
        return new Promise(resolve => {
            setTimeout(() => resolve(), 1000 * seconds); 
          });
    }
    static getCompAdditionalFeatMetas(compFeat, fromType){
        if(fromType == "race"){
            return compFeat._compAdditionalFeatsMetas?.race?.comp;
        }
        if(fromType == "custom"){
            return compFeat._compAdditionalFeatsMetas?.custom?.comp;
        }
        return null;
    }
    //Return an array, each entry containing a key pointing to the choiceObj, and an array containing the choiceComponents
    static async getChoiceComponentsAsync(compAdditionalFeatMetas) {
        let chooseObj = compAdditionalFeatMetas._compsFeatFeatureOptionsSelect.choose;
        if(chooseObj == null){
            //wait for a sec while the UI loads
            //TODO: improve this
            await ActorCharactermancerFeat.wait(0.05);
            chooseObj = compAdditionalFeatMetas._compsFeatFeatureOptionsSelect.choose;
        }
        //console.log(chooseObj);
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
    
    async setSpellChoice(input) {
        if(input.value == null){return;}
        //Get components that handle feats specific to the from type (ASI feat, race feat, custom feat, etc)
        let typeSet = ActorCharactermancerFeat.getCompAdditionalFeatMetas(this, input.from);
        if(typeSet == null){console.error("no spell source defined?", input.from); return;}
        //Get each of the feat components (one per feat). We call this a "choice set", as they can contain subcomponents
        let choiceSet = await ActorCharactermancerFeat.getChoiceComponentsAsync(typeSet);
        for(let set of choiceSet){
            //input.choiceSetKey should match the key of the set
            if(set.key != input.choiceSetKey){continue;}
            //the input should point to the subcomponent index it wants to alter
            let subComp = set.components[input.choiceComponentIx];
            //subcomp may include some spells that are pre-determined. the un-determined spells are under "additional spells"
            //Use our additionalspellIx to know exactly which additional spell property we want to alter
            let addSpellComp = subComp._subCompsAdditionalSpells[input.additionalSpellIx];
            addSpellComp._state[input.key] = input.value;
            //TODO: Make this not be set when every single spell is set, just have ixSet be set once at the start before spells are set
            addSpellComp._state["ixSet"] = input.ixSet;
        }
    }

    async setStateFromSaveFile(actor){
        const data = actor.featSpells;
        if(data==null){return;}
        
        for(let j = 0; j < data.length; ++j){
            await this.setSpellChoice(data[j]);
        }
    }
    
    _getFeats() {
        console.log("getfeats", this);
    }
    /**
     * Return all spells that we get from feats
     * @returns {{featName:string, featIx:number, spells:[{spell:string, isChoice:string, choiceData:any, uses:string, knownInnate:string, regularity:string}]}[]}
     */
    async getAllSpellsFromFeats(){
        //console.error("not implemented");

        //Probably best to start by going through all the feats we have

        //console.log(this);

        const result = await this.feat_pGetAdditionalFeatFormData();
        //console.log("result", result);

        /**
         * Return all spells that we get from feats
         * @returns {{isChoice:boolean, choiceData:any, gainedSpell:string}[]}
         */
        function searchRechargedSpells(spells){
            let spellsOut = [];
            for(let sp of spells)
            {
                let returnData = {};
                if(typeof(sp) == "string"){
                    //This is just a spell, no choice
                    returnData.isChoice = false;
                    if(!sp.includes("|")){
                        //sp is not an uid
                        sp = DataUtil.proxy.getUid("spell", {
                            name: sp,
                            source: "phb"
                        });
                    }
                    returnData.spell = sp; //Uid
                }
                else{
                    returnData.isChoice = true;
                    returnData.choiceData = sp.choice;
                }
                spellsOut.push(returnData);
            }
            return spellsOut;
        }
        function searchRechargeUses(rechargeType){
            let spellsOut = [];
            for(const [uses, content] of Object.entries(rechargeType)){
                let spells = searchRechargedSpells(content);
                for(let spell of spells){
                    spell.uses = uses;
                }
                spellsOut = spellsOut.concat(spells);
            }
            return spellsOut;
        }
        function searchRechargeRegularity(innateKnown){
            let spellsOut = [];
            for(let regularity of Object.keys(innateKnown)){
                let spells = searchRechargeUses(innateKnown[regularity]);
                for(let spell of spells){
                    spell.regularity = regularity;
                }
                spellsOut = spellsOut.concat(spells);
            }
            
            return spellsOut;
        }
        function searchInnateKnown(additionalSpellGroup){
            let spellsOut = [];
            //Look through innate spells
            for(const innate of Object.values(additionalSpellGroup.innate)){
                let spells = searchRechargeRegularity(innate);
                for(let spell of spells){
                    spell.knownInnate = "innate";
                }
                spellsOut = spellsOut.concat(spells);
            }
            return spellsOut;
        }
        function getAdditionalSpellData(compAdditionalSpell){
            //_additionalSpellsFlat
            //__state
            let testKeyMistyStep = "innate__" + "_" + "__1e__" + "0"; 
            let testKeyChoiceSpell = "innate_____daily__1e__1__0"; //"innate__" + "_" + "__1e__" + "1__" + "0";
            let featIndex = 0; //This may actually be the index of which choice set to use. A feat may have many choice sets, for example magic initiate
            return compAdditionalSpell.__state[testKeyChoiceSpell];
        }
        function searchFeatsForSpells(feats, type, compFeat){
            let featsOut = [];
            //Get chosen spells that derive from that feat
            //When it comes to no-choice spells, that is fairly easy, we can just look into the feat itself to know what we are granted
            for(let i = 0; i < feats.data.length; ++i){
                let feat = feats.data[i];
                //Look for additional spells granted by the feat
                let spellsOut = [];
                for(let as of feat.feat.additionalSpells){
                    let ability = as.ability; //"inherit"
                    let spellsGained = searchInnateKnown(as);
                    for(let sp of spellsGained){
                        if(sp.isChoice){
                            //we can ask the UI if they know if a spell is set for this choice already
                            let compRaceMetas = ActorCharactermancerFeat.getCompAdditionalFeatMetas(compFeat, type);
                            let choose = compRaceMetas._compsFeatFeatureOptionsSelect.choose;
                            let choice = choose[i][0]; //test
                            let spellUid = getAdditionalSpellData(choice._subCompsAdditionalSpells[0]);
                            sp.spell = spellUid; //uid
                            //Trying my best to not hardcode keys here
                            let additionalSpellsUIKey = `${sp.knownInnate}__${"_"}__${sp.regularity}__${sp.uses}__${i}__${0}`;
                            sp.uiKey = additionalSpellsUIKey;
                        }
                    }
                    spellsOut = spellsOut.concat(spellsGained);
                }
                featsOut.push({featName:feat.feat.name, featSource:feat.feat.source, featIx:feat.ixFeat, spells:spellsOut});
            }
            return featsOut;
        }

        
        let output = [];
        output = output.concat(searchFeatsForSpells(result.race, "race", this));
        output = output.concat(searchFeatsForSpells(result.custom, "custom", this));
        return output;
    }
}
ActorCharactermancerFeat._NAMESPACES_STATGEN = new Set(['ability', "race", "background", "custom"]);

class Charactermancer_AdditionalFeatsSelect extends BaseComponent {
    static async pGetUserInput({available, actor}) {
        if (!available?.length)
            return {
                isFormComplete: true,
                data: {}
            };

        if (UtilAdditionalFeats.isNoChoice(available)) {
            const comp = new this({
                available
            });
            return comp.pGetFormData();
        }

        const {ImportListFeat} = await Promise.resolve().then(function() {
            return ImportListFeat$1;
        });
        const ImportListFeatSources = await (new ImportListFeat()).pGetSources();
        const appSourceSelector = new AppSourceSelectorMulti({
            title: `Select Feat Sources`,
            filterNamespace: `Charactermancer_AdditionalFeatsSelect_filter`,
            savedSelectionKey: `Charactermancer_AdditionalFeatsSelect_savedSelection`,
            sourcesToDisplay: ImportListFeatSources,
            props: ["feat"],
            page: UrlUtil.PG_FEATS,
            isDedupable: true,
        });

        const allData = await appSourceSelector.pWaitForUserInput();
        if (allData == null){return null;}
        const modalFilterFeats = await this._pGetUserInput_pGetModalFilterFeats({
            allData
        });
        const modalFilterSpells = await this._pGetUserInput_pGetModalFilterSpells({
            allData
        });

        const comp = new this({
            available,
            actor,
            featDatas: allData.feat,
            modalFilterFeats,
            modalFilterSpells,
        });
        return UtilApplications.pGetImportCompApplicationFormData({
            comp,
            width: 800,
            height: 640,
        });
    }

    static async _pGetUserInput_pGetModalFilterFeats({allData}) {
        const modalFilterFeats = new ModalFilterFeatsFvtt({
            namespace: "Charactermancer_AdditionalFeatsSelect.feats",
            isRadio: true,
            allData: allData.feat,
        });
        await modalFilterFeats.pPreloadHidden();
        return modalFilterFeats;
    }

    static async _pGetUserInput_pGetModalFilterSpells({allData}) {
        const modalFilterSpells = new ModalFilterSpellsFvtt({
            namespace: "Charactermancer_AdditionalFeatsSelect.spells",
            isRadio: true,
            allData: allData.spell,
        });
        await modalFilterSpells.pPreloadHidden();
        return modalFilterSpells;
    }

    constructor(opts) {
        opts = opts || {};
        super();

        this._available = opts.available;
        this._actor = opts.actor;
        this._featDatas = opts.featDatas || [];
        this._modalFilterFeats = opts.modalFilterFeats;
        this._modalFilterSpells = opts.modalFilterSpells;
        this._featureSourceTracker = opts.featureSourceTracker;
        this._isFeatureSelect = !!opts.isFeatureSelect;

        this._featDatas.forEach(it=>it._hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_FEATS]({
            name: it.name,
            source: it.source
        }));
        this._compsFeatFeatureOptionsSelect = {};

        this._prevComp = opts.prevComp;
        this._cache_featFeatureLoadeds = opts.prevComp?._cache_featFeatureLoadeds || new Map();
    }

    get modalTitle() {
        return `Feats`;
    }

    get cntAny() {
        const featSet = this._available[this._state.ixSet];
        return featSet?.any || 0;
    }

    get ixSetAvailable() {
        return this._state.ixSet;
    }

    addHookIxSet(hk) {
        this._addHookBase("ixSet", hk);
    }

    addHookPulseFeats(hk) {
        this._addHookBase("pulse_feats", hk);
    }

    setStateFromStatgenFeatList_(featList) {
        const featListChoose = featList.filter(it=>it == null || it.type === "choose");

        let offsetIx = 0;
        const nxtState = {};
        const ixsStatgen = [];
        featListChoose.forEach((featMeta,ixRaw)=>{
            if (!featMeta)
                return offsetIx++;
            ixsStatgen.push(ixRaw);

            const ix = ixRaw - offsetIx;

            const {type, ix: ixFeatRaw} = featMeta;
            const {propIxFeat} = this._getProps({
                ix,
                type
            });

            nxtState[propIxFeat] = ixFeatRaw === -1 ? null : ixFeatRaw;
        }
        );

        nxtState.readonly_ixsStatgen = ixsStatgen;
        this._proxyAssignSimple("state", nxtState);
    }

    _getProps({ix, type}) {
        return {
            propPrefixFeat: `feat_${ix}_${type}_`,
            propIxFeat: `feat_${ix}_${type}_ixFeat`,
        };
    }

    _getLocks({ix, type}) {
        return {
            lockChangeFeat: `feat_${ix}_${type}_pHkChangeFeat`,
            lockRenderFeatureOptionsSelects: `feat_${ix}_${type}_renderFeatureOptionsSelects`,
        };
    }

    unregisterFeatureSourceTracking() {
        if (this._featureSourceTracker)
            this._featureSourceTracker.unregister(this);
        this._unregisterSubComps();
    }

    _unregisterSubComps() {
        if (!this._featureSourceTracker)
            return;

        Object.entries(this._compsFeatFeatureOptionsSelect).forEach(([type,ixToArr])=>{
            Object.keys(ixToArr).forEach(ix=>{
                (this._compsFeatFeatureOptionsSelect[type]?.[ix] || []).forEach(comp=>comp.unregisterFeatureSourceTracking());
            }
            );
        }
        );
    }

    render($wrp) {
        const $wrpLeft = $(`<div class="ve-flex-col w-100 h-100 min-h-0 overflow-y-auto"></div>`);
        const $wrpRight = $(`<div class="ve-flex-col w-100 h-100 min-h-0 overflow-y-auto"></div>`);

        this.renderTwoColumn({
            $wrpLeft,
            $wrpRight
        });

        $$($wrp)`<div class="ve-flex w-100 h-100 min-h-0">
			${$wrpLeft}
			<div class="vr-3"></div>
			${$wrpRight}
		</div>
		`;
    }

    renderTwoColumn({$wrpLeft, $wrpRight}) {
        this._render_$getStgSelGroup({
            $wrpLeft
        });
        const $stgGroupLeft = $$`<div class="ve-flex-col"></div>`.appendTo($wrpLeft);
        const $stgGroupRight = $$`<div class="ve-flex-col"></div>`.appendTo($wrpRight);

        const lastMetas = [];
        const boundHkIxSet = this._hk_ixSet.bind(this, {
            $stgGroupLeft,
            $stgGroupRight,
            lastMetas
        });
        this._addHookBase("ixSet", boundHkIxSet);
        boundHkIxSet();
    }

    _render_$getStgSelGroup({$wrpLeft}) {
        if (this._available.length <= 1)
            return;

        const {$sel: $selGroup} = UtilAdditionalFeats.getSelIxSetMeta({
            comp: this,
            prop: "ixSet",
            available: this._available,
        });

        return $$`<div class="w-100 mb-2 ve-flex-v-center">
			<div class="mr-2 no-shrink bold">Feat Set:</div>
			${$selGroup}
		</div>`.appendTo($wrpLeft);
    }

    _hk_ixSet({$stgGroupLeft, $stgGroupRight, lastMetas}) {
        $stgGroupLeft.empty();
        $stgGroupRight.empty();
        lastMetas.splice(0, lastMetas.length).forEach(it=>it.cleanup());
        const featSet = this._available[this._state.ixSet];
        this._hk_ixSet_renderPts({
            $stgGroupLeft,
            $stgGroupRight,
            featSet,
            lastMetas
        });
        this._state.pulse_feats = !this._state.pulse_feats;
    }

    _hk_ixSet_renderPts({$stgGroupLeft, $stgGroupRight, featSet, lastMetas}) {
        const hasStatic = Object.keys(featSet).some(it=>it !== "any");
        const hasChoose = !!featSet.any;

        if (hasStatic)
            this._render_renderPtStatic({
                $stgGroupLeft,
                $stgGroupRight,
                featSet
            });
        if (hasStatic && hasChoose)
            $stgGroupLeft.append(`<hr class="hr-2 mt-0 hr--dotted">`);
        if (hasChoose)
            this._render_renderPtChooseFromFilter({
                $stgGroupLeft,
                $stgGroupRight,
                featSet,
                lastMetas
            });
        if (hasStatic || hasChoose)
            $stgGroupLeft.append(`<hr class="hr-2>`);
    }

    _render_renderPtStatic({$stgGroupLeft, $stgGroupRight, featSet}) {
        const type = "static";
        const uidsStatic = UtilAdditionalFeats.getUidsStatic(featSet);

        const rowMetas = uidsStatic.map((uid,ix)=>{
            const {lockRenderFeatureOptionsSelects, } = this._getLocks({
                ix,
                type
            });

            const {name, source} = DataUtil.proxy.unpackUid("feat", uid, "feat");
            const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_FEATS]({
                name,
                source
            });
            const feat = this._featDatas.find(it=>it._hash === hash);

            if (!feat) {
                console.warn(...LGT, `Could not find feat "${hash}" in loaded feat data!`);
                return null;
            }

            const $stgFeatureOptions = this._isFeatureSelect ? $(`<div class="ve-flex-col w-100"></div>`) : null;

            const $rowLeft = $$`<div class="mb-2">
				<div class="ve-flex-v-center">
					<div class="bold mr-2 no-shrink">Feat:</div>
					${Renderer.get().render(`{@feat ${feat.name}|${feat.source}}`)}
				</div>
				${$stgFeatureOptions}
			</div>`;

            const $rowRight = $(`<div class="ve-flex-col w-100"></div>`);
            this._render_displayFeat({
                $wrp: $rowRight,
                feat
            });

            if (this._isFeatureSelect) {
                this._feat_pGetFilteredFeatures(feat).then(async filteredFeatures=>{
                    await this._feat_pRenderFeatureOptionsSelects({
                        ix,
                        type,
                        $stgFeatureOptions,
                        filteredFeatures,
                        lockRenderFeatureOptionsSelects
                    });
                }
                );
            }

            return {
                $rowLeft,
                $rowRight,
            };
        }
        ).filter(Boolean);

        $$`<div class="ve-flex-col w-100">
			${rowMetas.map(it=>it.$rowLeft)}
		</div>`.appendTo($stgGroupLeft);

        $$`<div class="ve-flex-col w-100">
			${rowMetas.map(it=>it.$rowRight)}
		</div>`.appendTo($stgGroupRight);
    }

    _render_displayFeat({$wrp, feat}) {
        $wrp.empty();
        if (!feat) {
            $wrp.append(`<div class="ve-muted mb-2 italic ve-flex-vh-center">No feat selected.</div>`);
        } else {
            $wrp.append(Vetools.withUnpatchedDiceRendering(()=>Renderer.hover.$getHoverContent_stats(UrlUtil.PG_FEATS, feat)));
        }
        $wrp.append(`<hr class="hr-0">`);
    }

    _render_renderPtChooseFromFilter({$stgGroupLeft, $stgGroupRight, featSet, lastMetas}) {
        const type = "choose";

        const rowMetas = [...new Array(featSet.any)].map((_,ix)=>{
            const {propIxFeat, propPrefixFeat} = this._getProps({
                ix,
                type
            });

            const {lockChangeFeat, lockRenderFeatureOptionsSelects, } = this._getLocks({
                ix,
                type
            });

            const {$sel: $selFeat, $btnFilter: $btnFilterForFeat, unhook} = Charactermancer_Util.getFilterSearchMeta({
                comp: this,
                prop: propIxFeat,
                data: this._featDatas,
                modalFilter: this._modalFilterFeats,
                title: "Feat",
            });
            lastMetas.push({
                cleanup: unhook
            });

            const $dispFeat = $(`<div class="ve-flex-col w-100"></div>`);

            const $stgFeatureOptions = this._isFeatureSelect ? $(`<div class="ve-flex-col w-100 mt-2"></div>`) : null;

            const $rowLeft = $$`<div class="ve-flex-col w-100">
				<div class="bold mb-2">Select a Feat</div>
				<div class="ve-flex-v-center btn-group w-100">${$btnFilterForFeat}${$selFeat}</div>
				${$stgFeatureOptions}
				<hr class="hr-1">
			</div>`;

            const _pHkChangeFeat = async()=>{
                const nxtState = Object.keys(this.__state).filter(it=>it.startsWith(propPrefixFeat) && it !== propIxFeat).mergeMap(it=>({
                    [it]: null
                }));
                this._proxyAssignSimple("state", nxtState);

                const feat = this._featDatas[this._state[propIxFeat]];

                this._render_displayFeat({
                    $wrp: $dispFeat,
                    feat
                });

                if (this._isFeatureSelect) {
                    const filteredFeatures = await this._feat_pGetFilteredFeatures(feat);

                    await this._feat_pRenderFeatureOptionsSelects({
                        ix,
                        type,
                        $stgFeatureOptions,
                        filteredFeatures,
                        lockRenderFeatureOptionsSelects
                    });
                }

                this._state.pulse_feats = !this._state.pulse_feats;
            }
            ;
            const pHkChangeFeat = async(isLaterRun)=>{
                try {
                    await this._pLock(lockChangeFeat);
                    await _pHkChangeFeat(isLaterRun);
                } finally {
                    this._unlock(lockChangeFeat);
                }
            }
            ;
            this._addHookBase(propIxFeat, pHkChangeFeat);
            lastMetas.push({
                cleanup: ()=>this._removeHookBase(propIxFeat, pHkChangeFeat)
            });

            _pHkChangeFeat();

            return {
                $rowLeft,
                $rowRight: $dispFeat,
            };
        }
        );

        $$`<div class="ve-flex-col w-100">
			${rowMetas.map(it=>it.$rowLeft)}
		</div>`.appendTo($stgGroupLeft);

        $$`<div class="ve-flex-col w-100">
			${rowMetas.map(it=>it.$rowRight)}
		</div>`.appendTo($stgGroupRight);
    }

    async _feat_pGetFilteredFeatures(feat) {
        if (!feat)
            return [];

        const feature = await this._feat_pGetFilteredFeatures_getCacheFeature(feat);

        return Charactermancer_Util.getFilteredFeatures([feature], this._modalFilterFeats.pageFilter, this._modalFilterFeats.pageFilter.filterBox.getValues(), );
    }

    async _feat_pGetFilteredFeatures_getCacheFeature(feat) {
        const fromCache = this._cache_featFeatureLoadeds.get(feat);
        if (fromCache)
            return fromCache;

        const feature = await DataConverterFeat.pGetInitFeatureLoadeds(feat, {
            actor: this._actor
        });
        this._cache_featFeatureLoadeds.set(feat, feature);
        return feature;
    }

    async _feat_pRenderFeatureOptionsSelects(opts) {
        const {lockRenderFeatureOptionsSelects} = opts;

        try {
            await this._pLock(lockRenderFeatureOptionsSelects);
            await this._feat_pRenderFeatureOptionsSelects_(opts);
        } finally {
            this._unlock(lockRenderFeatureOptionsSelects);
        }
    }

    async _feat_pRenderFeatureOptionsSelects_({ix, type, filteredFeatures, $stgFeatureOptions}) {
        const prevCompsFeatures = this._compsFeatFeatureOptionsSelect[type]?.[ix] || this._prevComp?._compsFeatFeatureOptionsSelect[type]?.[ix] || [];

        $stgFeatureOptions.empty();

        const existingFeatureChecker = new Charactermancer_Class_Util.ExistingFeatureChecker(this._actor);

        const importableFeatures = Charactermancer_Util.getImportableFeatures(filteredFeatures);
        const cpyImportableFeatures = MiscUtil.copy(importableFeatures);
        Charactermancer_Util.doApplyFilterToFeatureEntries_bySource(cpyImportableFeatures, this._modalFilterFeats.pageFilter, this._modalFilterFeats.pageFilter.filterBox.getValues(), );
        const importableFeaturesGrouped = Charactermancer_Util.getFeaturesGroupedByOptionsSet(cpyImportableFeatures);

        this._feat_unregisterFeatureSourceTrackingFeatureComps(ix, type);

        for (const topLevelFeatureMeta of importableFeaturesGrouped) {
            const {topLevelFeature, optionsSets} = topLevelFeatureMeta;

            for (const optionsSet of optionsSets) {
                const compFeatureOptionsSelect = new Charactermancer_FeatureOptionsSelect({
                    featureSourceTracker: this._featureSourceTracker,
                    existingFeatureChecker,
                    //actor: this._actor,
                    optionsSet,
                    level: topLevelFeature.level,
                    modalFilterSpells: this._modalFilterSpells,
                    isSkipRenderingFirstFeatureTitle: true,
                });
                const tgt = MiscUtil.getOrSet(this._compsFeatFeatureOptionsSelect, type, ix, []);
                tgt.push(compFeatureOptionsSelect);
                compFeatureOptionsSelect.findAndCopyStateFrom(prevCompsFeatures);
            }
        }

        await this._feat_pRenderFeatureComps(ix, type, { $stgFeatureOptions });
    }

    _feat_unregisterFeatureSourceTrackingFeatureComps(ix, type) {
        (this._compsFeatFeatureOptionsSelect[type]?.[ix] || []).forEach(comp=>comp.unregisterFeatureSourceTracking());
        delete this._compsFeatFeatureOptionsSelect[type]?.[ix];
    }

    async _feat_pRenderFeatureComps(ix, type, {$stgFeatureOptions}) {
        for (const compFeatureOptionsSelect of (this._compsFeatFeatureOptionsSelect[type]?.[ix] || [])) {
            if (await compFeatureOptionsSelect.pIsNoChoice() && !(await compFeatureOptionsSelect.pIsAvailable()))
                continue;

            if (!(await compFeatureOptionsSelect.pIsNoChoice()) || await compFeatureOptionsSelect.pIsForceDisplay()) {
                $stgFeatureOptions.showVe().append(`${compFeatureOptionsSelect.modalTitle ? `<hr class="hr-2"><div class="mb-2 bold w-100">${compFeatureOptionsSelect.modalTitle}</div>` : ""}`);
            }
            compFeatureOptionsSelect.render($stgFeatureOptions);
        }
    }

    async pGetFormData() {
        const out = [];

        const ptrIsComplete = {
            _: true
        };

        const featSet = this._available[this._state.ixSet];
        await this._pGetFormData_static({
            out,
            featSet,
            ptrIsComplete
        });
        await this._pGetFormData_choose({
            out,
            featSet,
            ptrIsComplete
        });

        return {
            isFormComplete: ptrIsComplete._,
            data: out,
            ixsStatgen: this._state.readonly_ixsStatgen ? MiscUtil.copy(this._state.readonly_ixsStatgen) : null,
        };
    }

    async _pGetFormData_static({out, featSet, ptrIsComplete}) {
        const uidsStatic = UtilAdditionalFeats.getUidsStatic(featSet);
        if (!uidsStatic?.length)
            return;

        const type = "static";

        for (let ix = 0; ix < uidsStatic.length; ++ix) {
            const outItem = this._getFormData_static_ix({
                uidsStatic,
                ix
            });
            if (outItem)
                out.push(outItem);

            if (!this._isFeatureSelect || !outItem)
                continue;

            const formDatasFeatureOptionsSelect = await (this._compsFeatFeatureOptionsSelect[type]?.[ix] || []).filter(Boolean).pSerialAwaitMap(it=>it.pGetFormData());

            if (formDatasFeatureOptionsSelect.some(it=>!it.isFormComplete))
                ptrIsComplete._ = false;

            outItem.formDatasFeatureOptionsSelect = formDatasFeatureOptionsSelect;
        }
    }

    async _pGetFormData_choose({out, featSet, ptrIsComplete}) {
        if (!featSet.any)
            return;

        const type = "choose";

        for (let ix = 0; ix < featSet.any; ++ix) {
            const outItem = this._getFormData_choose_ix({
                ix,
                ptrIsComplete
            });
            if (outItem)
                out.push(outItem);

            if (!this._isFeatureSelect || !outItem)
                continue;

            const formDatasFeatureOptionsSelect = await (this._compsFeatFeatureOptionsSelect[type]?.[ix] || []).filter(Boolean).pSerialAwaitMap(it=>it.pGetFormData());

            if (formDatasFeatureOptionsSelect.some(it=>!it.isFormComplete))
                ptrIsComplete._ = false;

            outItem.formDatasFeatureOptionsSelect = formDatasFeatureOptionsSelect;
        }
    }

    getFormDataReduced() {
        const out = [];

        const ptrIsComplete = {
            _: true
        };

        const featSet = this._available[this._state.ixSet];
        this._getFormDataReduced_static({
            out,
            featSet
        });
        this._getFormDataReduced_choose({
            out,
            featSet,
            ptrIsComplete
        });

        return {
            isFormComplete: ptrIsComplete._,
            data: out,
            ixsStatgen: this._state.readonly_ixsStatgen ? MiscUtil.copy(this._state.readonly_ixsStatgen) : null,
        };
    }

    _getFormDataReduced_static({out, featSet}) {
        const uidsStatic = UtilAdditionalFeats.getUidsStatic(featSet);
        if (!uidsStatic?.length)
            return;

        for (let ix = 0; ix < uidsStatic.length; ++ix) {
            const outItem = this._getFormData_static_ix({
                uidsStatic,
                ix
            });
            if (outItem)
                out.push(outItem);
        }
    }

    _getFormDataReduced_choose({out, featSet, ptrIsComplete}) {
        if (!featSet.any)
            return;

        for (let ix = 0; ix < featSet.any; ++ix) {
            const outItem = this._getFormData_choose_ix({
                ix,
                ptrIsComplete
            });
            if (outItem)
                out.push(outItem);
        }
    }

    _getFormData_static_ix({uidsStatic, ix}) {
        const uid = uidsStatic[ix];

        const {name, source} = DataUtil.proxy.unpackUid("feat", uid, "feat");
        const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_FEATS]({
            name,
            source
        });
        const ixFeat = this._featDatas.findIndex(it=>it._hash === hash);
        const feat = this._featDatas[ixFeat];

        return {
            page: UrlUtil.PG_FEATS,
            source,
            hash,
            feat: MiscUtil.copy(feat, {
                isSafe: true
            }),
            ixFeat,
            type: "static",
            ix,
        };
    }

    _getFormData_choose_ix({ix, ptrIsComplete}) {
        const {propIxFeat} = this._getProps({
            ix,
            type: "choose"
        });
        const ixFeat = this._state[propIxFeat];
        if (ixFeat == null || !~ixFeat) {
            ptrIsComplete._ = false;
            return;
        }

        const feat = this._featDatas[ixFeat];
        const hash = UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_FEATS](feat);

        return {
            page: UrlUtil.PG_FEATS,
            source: feat.source,
            hash,
            feat: MiscUtil.copy(feat, {
                isSafe: true
            }),
            ixFeat,
            type: "choose",
            ix,
        };
    }

    _getDefaultState() {
        return {
            ixSet: 0,

            pulse_feats: false,
            readonly_ixsStatgen: null,
        };
    }
}
//#endregion

//#region FeatureSourceTracker
class Charactermancer_FeatureSourceTracker extends BaseComponent {
    constructor() {
        super();
        this._registered = new Map();
    }

    register(comp) {
        this._registered.set(comp, { state: null, hookMetas: [] });
    }

    _validateProp(propPulse) {
        if (!Charactermancer_FeatureSourceTracker._VALID_HOOK_PROPS.has(propPulse))
            throw new Error(`Unhandled pulse prop "${propPulse}"`);
    }

    addHook(comp, propPulse, hk) {
        this._validateProp(propPulse);

        if (!this._registered.has(comp))
            this.register(comp);

        this._registered.get(comp).hookMetas.push({ propPulse, hook: hk });
        this._addHookBase(propPulse, hk);
    }

    removeHook(comp, propPulse, hk) {
        this._validateProp(propPulse);

        if (!this._registered.has(comp))
            return;

        const compMeta = this._registered.get(comp);
        const ixHook = compMeta.hookMetas.findIndex(it=>it.hook === hk);
        if (~ixHook)
            compMeta.hookMetas.splice(ixHook, 1);
        this._removeHookBase(propPulse, hk);
    }

    setState(comp, state) {
        if (!this._registered.has(comp)){this.register(comp);}
        const compMeta = this._registered.get(comp);

        const prevState = compMeta.state ? MiscUtil.copy(compMeta.state) : compMeta.state;
        compMeta.state = state;

        const allKeys = new Set([...Object.keys(prevState || {}), ...Object.keys(state || {}), ]);

        allKeys.forEach(k=>{
            const oldVal = prevState?.[k];
            const nuVal = state?.[k];

            if (CollectionUtil.deepEquals(oldVal, nuVal)){return;}

            this._doPulseForProp(k);
        });
    }

    /**
     * @param {string} key
     * @param {any} {ignore=null}={}
     * @returns {any}
     */
    getStatesForKey(key, {ignore=null}={}) {
        let out = [];
        for (const [comp, compMeta] of this._registered.entries()) {
            if (ignore === comp){ continue;}
            if (compMeta?.state?.[key]){out.push(compMeta.state[key]);}
        }
        return out;
    }

    unregister(comp) {
        if (!comp) { return; }

        const registered = this._registered.get(comp);
        if (!registered) { return; }

        this._registered.delete(comp);

        registered.hookMetas.forEach(({propPulse, hook})=>{
            this._removeHookBase(propPulse, hook);
        });

        if (registered.state) {
            Object.keys(registered.state).forEach(k=>{
                this._doPulseForProp(k);
            });
        }
    }

    _doPulseForProp(k) {
        switch (k) {
        case "skillProficiencies":
            return this._state.pulseSkillProficiencies = !this._state.pulseSkillProficiencies;
        case "languageProficiencies":
            return this._state.pulseLanguageProficiencies = !this._state.pulseLanguageProficiencies;
        case "toolProficiencies":
            return this._state.pulseToolProficiencies = !this._state.pulseToolProficiencies;
        case "armorProficiencies":
            return this._state.pulseArmorProficiencies = !this._state.pulseArmorProficiencies;
        case "weaponProficiencies":
            return this._state.pulseWeaponProficiencies = !this._state.pulseWeaponProficiencies;
        case "features":
            return this._state.pulseFeatures = !this._state.pulseFeatures;
        case "savingThrowProficiencies":
            return this._state.pulseSavingThrowProficiencies = !this._state.pulseSavingThrowProficiencies;
        case "immune":
            return this._state.pulseImmune = !this._state.pulseImmune;
        case "resist":
            return this._state.pulseResist = !this._state.pulseResist;
        case "vulnerable":
            return this._state.pulseVulnerable = !this._state.pulseVulnerable;
        case "conditionImmune":
            return this._state.pulseConditionImmune = !this._state.pulseConditionImmune;
        case "expertise":
            return this._state.pulseExpertise = !this._state.pulseExpertise;
        default:
            throw new Error(`Unhandled tracked state key ${k}`);
        }
    }

    _getDefaultState() {
        return [...Charactermancer_FeatureSourceTracker._VALID_HOOK_PROPS].mergeMap(it=>({
            [it]: false
        }));
    }
}
Charactermancer_FeatureSourceTracker._VALID_HOOK_PROPS = new Set(["pulseSkillProficiencies", "pulseLanguageProficiencies", "pulseToolProficiencies", "pulseArmorProficiencies", "pulseWeaponProficiencies", "pulseFeatures", "pulseSavingThrowProficiencies", "pulseImmune", "pulseResist", "pulseVulnerable", "pulseConditionImmune", "pulseExpertise", ]);

//#endregion

//#region Charactermancer Description
class ActorCharactermancerDescription extends ActorCharactermancerBaseComponent {
    constructor(parentInfo) {
        parentInfo = parentInfo || {};
        super();
        this._actor = parentInfo.actor;
        //this._data = parentInfo.data;
        this._parent = parentInfo.parent;
        this._tabDescription = parentInfo.tabDescription;
    }
    render() {
        const parentDiv = this._tabDescription?.["$wrpTab"];
        if (!parentDiv) { return; }

        const getVal = (prop, fallback = "") => {
            const val = this.__state[prop] || fallback;
            return val;
        }

        const $inputName = $$`<input class="form-control" type="text"></input>`;
        $inputName.val(getVal("description_name"));
        $inputName.change(() => {
            this._state["description_name"] = $inputName.val();
        });

        const $inputAlignment = $$`<select class="form-control chooseAlignment"></select>`;
        $$`<option value=""></option>`.appendTo($inputAlignment);
        for(let i = 0; i < ActorCharactermancerDescription.ALIGNMENTS.length; ++i){
            const n = ActorCharactermancerDescription.ALIGNMENTS[i];
            $$`<option value="${n}">${n}</option>`.appendTo($inputAlignment);
        }
        $inputAlignment.val(getVal("description_alignment"));
        $inputAlignment.change(() => {
            this._state["description_alignment"] = $inputAlignment.val();
        });
        

        const $inputHair = $$`<input class="form-control" type="text"></input>`;
        $inputHair.val(getVal("description_hair"));
        $inputHair.change(() => {
            this._state["description_hair"] = $inputHair.val();
        });
        const $inputSkin = $$`<input class="form-control" type="text"></input>`;
        $inputSkin.val(getVal("description_skin"));
        $inputSkin.change(() => {
            this._state["description_skin"] = $inputSkin.val();
        });
        const $inputEyes = $$`<input class="form-control" type="text"></input>`;
        $inputEyes.val(getVal("description_eyes"));
        $inputEyes.change(() => {
            this._state["description_eyes"] = $inputEyes.val();
        });
        const $inputWeight = $$`<input class="form-control" type="text"></input>`;
        $inputWeight.val(getVal("description_weight"));
        $inputWeight.change(() => {
            this._state["description_weight"] = $inputWeight.val();
        });
        const $inputHeight = $$`<input class="form-control" type="text"></input>`;
        $inputHeight.val(getVal("description_height"));
        $inputHeight.change(() => {
            this._state["description_height"] = $inputHeight.val();
        });
        const $inputFaith = $$`<input class="form-control" type="text"></input>`;
        $inputFaith.val(getVal("description_faith"));
        $inputFaith.change(() => {
            this._state["description_faith"] = $inputFaith.val();
        });
        
        const startHeight = "300px";
        const $inputDescription = $$`<textarea class="form-control input-xs form-control--minimal resize-vertical" style="height: ${startHeight}"></textarea>`;
        $inputDescription.val(getVal("description_text"));
        $inputDescription.change(() => {
            this._state["description_text"] = $inputDescription.val();
        });

        const ui = $$`<section class="character-builder-description">
        <ul class="inputul">
          <li>
            <label>Character Name </label>${$inputName}
          </li>
          <li>
            <label>Alignment </label>${$inputAlignment}
          </li>
          <li>
            <label>Height </label>${$inputHeight}
          </li>
          <li>
            <label>Weight </label>${$inputWeight}
          </li>
          <li>
            <label>Hair </label>${$inputHair}
          </li>
          <li>
            <label>Skin </label>${$inputSkin}
          </li>
          <li>
            <label>Eyes </label>${$inputEyes}
          </li>
          <li>
          <label>Eyes </label>${$inputFaith}
        </li>
        <ul>
        </section>`;
        const ui2 = $$`<div class="character-builder-description"><ul class="inputtext"><li><label>Description </label>${$inputDescription}</li></ul></div>`;


        
        $$`<div class="ve-flex w-100 h-100">
        <div class="ve-flex-col w-100 h-100 px-1 pt-1 overflow-y-auto ve-grow veapp__bg-foundry">
            ${ui}
            ${ui2}
        </div>
        </div>`.appendTo(parentDiv);
    }

    /**
     * Sets the state of the component and subcomponents based on a save file. This should be called just after first render.
     * @param {{background:{name:string, source:string, isFullyCustom:boolean, stateSkillProficiencies:any, stateLanguageToolProficiencies:any,
     * stateCharacteristics:any, isCustomizeSkills:boolean, isCustomizeLanguagesTools:boolean}} actor
     */
    setStateFromSaveFile(actor){
        const data = actor.about;
        if(!data){return;}

        const printToState = (input, state) => {
            for(let prop of Object.keys(input)){
                let val = input[prop];
                state["description_"+prop] = val;
            }
        }
        printToState(data, this.state);
    }
    async pLoad() {

    }
    _getDefaultState() {
      return {
        'description_name': "",
        'description_alignment': "",
        'description_height': "",
        'description_weight': "",
        'description_hair': "",
        'description_skin': "",
        'description_eyes': "",
        'description_faith': "",
        'description_text': "",
      };
    }

    static ALIGNMENTS = [
        "Lawful Good",
        "Lawful Neutral",
        "Lawful Evil",
        "Neutral Good",
        "Neutral",
        "Neutral Evil",
        "Chaotic Good",
        "Chaotic Neutral",
        "Chaotic Evil"
    ]
}
//#endregion

//#region CHARACTERMANCER UTILS
class Charactermancer_Util {
    static getCurrentLevel(actor) {
        return actor.items.filter(it=>it.type === "class").map(it=>Number(it.system.levels || 0)).sum();
    }

    static getBaseAbilityScores(actor) {
        return this._getAbilityScores(actor, true);
    }

    static getCurrentAbilityScores(actor) {
        return this._getAbilityScores(actor, false);
    }

    static _getAbilityScores(actor, isBase) {
        const actorData = isBase ? (actor.system._source || actor.system) : actor.system;
        const out = {
            str: Number(MiscUtil.get(actorData, "abilities", "str", "value") || 0),
            dex: Number(MiscUtil.get(actorData, "abilities", "dex", "value") || 0),
            con: Number(MiscUtil.get(actorData, "abilities", "con", "value") || 0),
            int: Number(MiscUtil.get(actorData, "abilities", "int", "value") || 0),
            wis: Number(MiscUtil.get(actorData, "abilities", "wis", "value") || 0),
            cha: Number(MiscUtil.get(actorData, "abilities", "cha", "value") || 0),
        };
        Object.entries(out).forEach(([abv,val])=>{
            if (isNaN(val))
                out[abv] = 0;
        }
        );
        return out;
    }

    static getBaseHp(actor) {
        return this._getHp(actor, true);
    }

    static _getHp(actor, isBase) {
        const actorData = isBase ? (actor.system._source || actor.system) : actor.system;
        return {
            value: (actorData?.attributes?.hp?.value || 0),
            max: actorData?.attributes?.hp?.max,
        };
    }

    static getAttackAbilityScore(itemAttack, abilityScores, mode) {
        if (!itemAttack || !abilityScores)
            return null;
        switch (mode) {
        case "melee":
            {
                const isFinesse = !!MiscUtil.get(itemAttack, "system", "properties", "fin");
                if (!isFinesse)
                    return abilityScores.str;
                return abilityScores.str > abilityScores.dex ? abilityScores.str : abilityScores.dex;
            }
        case "ranged":
            {
                const isThrown = !!MiscUtil.get(itemAttack, "system", "properties", "thr");
                if (!isThrown)
                    return abilityScores.dex;
                return abilityScores.str > abilityScores.dex ? abilityScores.str : abilityScores.dex;
            }
        default:
            throw new Error(`Unhandled mode "${mode}"`);
        }
    }

    static getFilteredFeatures(allFeatures, pageFilter, filterValues) {
        return allFeatures.filter(f=>{
            //Try to get the source of the feature
            const source = f.source || (f.classFeature ? DataUtil.class.unpackUidClassFeature(f.classFeature).source 
            : f.subclassFeature ? DataUtil.class.unpackUidSubclassFeature(f.subclassFeature) : null);

            //Then filter out this feature if we don't allow the source
            if (!pageFilter.sourceFilter.toDisplay(filterValues, source)){return false;}

            f.loadeds = f.loadeds.filter(meta=>{
                return Charactermancer_Class_Util.isClassEntryFilterMatch(meta.entity, pageFilter, filterValues);
            });

            return f.loadeds.length;
        });
    }

    /**Filters an array of features to only those we should import. For example removes features such as those that grant you a subclass */
    static getImportableFeatures(allFeatures) {
        return allFeatures.filter(f=>{
            if (f.gainSubclassFeature && !f.gainSubclassFeatureHasContent){return false;}
            if(!f.name){console.error("Feature does not have property 'name' assigned!", f);}

            const lowName = f.name.toLowerCase();
            switch (lowName) {
                case "proficiency versatility": return false;
                default: return true;
            }
        });
    }

    static doApplyFilterToFeatureEntries_bySource(allFeatures, pageFilter, filterValues) {
        allFeatures.forEach(f=>{
            f.loadeds.forEach(loaded=>{
                switch (loaded.type) {
                case "classFeature":
                case "subclassFeature":
                    {
                        if (loaded.entity.entries)
                            loaded.entity.entries = Charactermancer_Class_Util.getFilteredEntries_bySource(loaded.entity.entries, pageFilter, filterValues);
                        break;
                    }
                }
            }
            );
        }
        );

        return allFeatures;
    }

    /**
     * Expects each feature to have a .loadeds property
     * @param {any} allFeatures
     * @returns {{topLevelFeature:{name:string, level:number}, optionSets:any[]}[]}
     */
    static getFeaturesGroupedByOptionsSet(allFeatures) {
        return allFeatures.map(topLevelFeature=>{

            if(!topLevelFeature.loadeds){console.error("Feature does not have any loadeds!", topLevelFeature);}
            const optionsSets = []; //Blank optionsSets array
            let optionsStack = [];
            let lastOptionsSetId = null;
            //Go through each loadeds
            topLevelFeature.loadeds.forEach(l=>{
                //try to get l.optionsMeta.setId;
                const optionsSetId = MiscUtil.get(l, "optionsMeta", "setId") || null;
                if (lastOptionsSetId !== optionsSetId) {
                    if (optionsStack.length) { optionsSets.push(optionsStack); }
                    optionsStack = [l];
                    lastOptionsSetId = optionsSetId;
                }
                else { optionsStack.push(l); }
            });
            if (optionsStack.length) { optionsSets.push(optionsStack); }

            return {topLevelFeature, optionsSets};
        });
    }

    /**
     * Create a select element that can search for its options and can use a modalfilter
     * @param {any} comp
     * @param {string} prop
     * @param {string} propVersion
     * @param {any} data
     * @param {ModalFilter} modalFilter
     * @param {any} title
     * @returns {any}
     */
    static getFilterSearchMeta({comp, prop, propVersion=null, data, modalFilter, title}) {
        const {$wrp: $sel, fnUpdateHidden: fnUpdateSelHidden, unhook} =
        ComponentUiUtil.$getSelSearchable(comp, prop, {
            values: data.map((_,i)=>i),
            isAllowNull: true,
            fnDisplay: ix=>{
                const it = data[ix];

                if (!it) {
                    console.warn(...LGT, `Could not find ${prop} with index ${ix} (${data.length} ${prop} entries were available)`);
                    return "(Unknown)";
                }

                return `${it.name} ${it.source !== Parser.SRC_PHB ? `[${Parser.sourceJsonToAbv(it.source)}]` : ""}`;
            }
            ,
            fnGetAdditionalStyleClasses: ix=>{
                if (ix == null)
                    return null;
                const it = data[ix];
                if (!it)
                    return;
                return it._versionBase_isVersion ? ["italic"] : null;
            }
            ,
            asMeta: true,
        }, );

        const doApplyFilterToSel = ()=>{
            //try to set filterbox to only be PHB
            const f = modalFilter.pageFilter.filterBox.getValues();
            let sourcesEnabled = []; for(let key of Object.keys(f.Source)){ if(f.Source[key] > 0){sourcesEnabled[key] = f.Source[key];}}
            const isHiddenPer = data.map(it=>!modalFilter.pageFilter.toDisplay(f, it));
            fnUpdateSelHidden(isHiddenPer, false);
        };

        //TEMPFIX
        if(SETTINGS.FILTERS){modalFilter.pageFilter.filterBox.on(FilterBox.EVNT_VALCHANGE, doApplyFilterToSel, );
        doApplyFilterToSel();}

        const $btnFilter = $(`<button class="btn btn-xs btn-default btn-5et br-0 pr-2" title="Filter for a ${title}"><span class="glyphicon glyphicon-filter"></span> Filter</button>`).click(async()=>{
            const selecteds = await modalFilter.pGetUserSelection();
            if (selecteds == null || !selecteds.length)
                return;

            const selected = selecteds[0];
            const ix = data.findIndex(it=>it.name === selected.name && it.source === selected.values.sourceJson);
            if (!~ix)
                throw new Error(`Could not find selected entity: ${JSON.stringify(selected)}`);
            comp._state[prop] = ix;
        }
        );

        const {$stg: $stgSelVersion=null, unhook: unhookVersion=null} = this._getFilterSearchMeta_getVersionMeta({
            comp,
            prop,
            propVersion,
            data
        }) || {};

        return {
            $sel,
            $btnFilter,
            $stgSelVersion,
            unhook: ()=>{
                unhook();
                modalFilter.pageFilter.filterBox.off(FilterBox.EVNT_VALCHANGE, doApplyFilterToSel);
                if (unhookVersion)
                    unhookVersion();
            }
            ,
        };
    }

    static _getFilterSearchMeta_getVersionMeta({comp, prop, propVersion, data}) {
        if (!propVersion)
            return;

        const {$sel, setValues, unhook} = ComponentUiUtil.$getSelEnum(comp, propVersion, {
            values: [],
            isAllowNull: true,
            displayNullAs: "(Base version)",
            fnDisplay: it=>`${it.name}${it.source !== data[comp._state[prop]]?.source ? ` (${Parser.sourceJsonToAbv(it.source)})` : ""}`,
            asMeta: true,
            isSetIndexes: true,
        }, );

        const hkProp = ()=>{
            const ent = data[comp._state[prop]];
            if (ent == null) {
                setValues([]);
                return $stg.hideVe();
            }

            const versions = DataUtil.generic.getVersions(ent);
            setValues(versions);
            $stg.toggleVe(versions.length);
        }
        ;
        comp._addHookBase(prop, hkProp);

        const $stg = $$`<div class="ve-flex-col mt-2">
			<label class="split-v-center btn-group w-100">
				<div class="mr-2">Version:</div>
				${$sel}
			</label>
		</div>`;

        hkProp();

        return {
            $stg,
            unhook: ()=>{
                unhook();
                comp._removeHookBase(prop, hkProp);
            }
            ,
        };
    }
}
Charactermancer_Util.STR_WARN_SOURCE_SELECTION = `Did you change your source selection since using the Charactermancer initially?`;

class Charactermancer_Class_Util {
    /**return all features from a class (UID string format, except for gainSubclass features, which are objects with properties)*/
    static getAllFeatures(cls) {
        let allFeatures = [];
        const seenSubclassFeatureHashes = new Set();

        const gainSubclassFeatureLevels = cls.classFeatures.filter(it=>it.gainSubclassFeature).map(cf=>cf.level ??
            DataUtil.class.unpackUidClassFeature(cf.classFeature || cf).level);

        cls.classFeatures.forEach(cf=>{
            allFeatures.push(cf);

            const cfLevel = cf.level ?? DataUtil.class.unpackUidClassFeature(cf.classFeature || cf).level;
            const nxtCfLevel = gainSubclassFeatureLevels.includes(cfLevel) ? gainSubclassFeatureLevels[gainSubclassFeatureLevels.indexOf(cfLevel) + 1] : null;

            cls.subclasses.forEach(sc=>{
                sc.subclassFeatures.filter(scf=>{
                    const scfHash = scf.hash ?? DataUtil.class.unpackUidSubclassFeature(scf.subclassFeature || scf).hash;
                    const scfLevel = scf.level ?? DataUtil.class.unpackUidSubclassFeature(scf.subclassFeature || scf).level;

                    if (seenSubclassFeatureHashes.has(scfHash))
                        return false;

                    if (scf.isGainAtNextFeatureLevel) {
                        if (!cf.gainSubclassFeature)
                            return false;

                        if (cfLevel === gainSubclassFeatureLevels[0] && scfLevel <= cfLevel)
                            return true;

                        if (scfLevel <= cfLevel && (nxtCfLevel == null || scfLevel < nxtCfLevel))
                            return true;

                        return false;
                    }

                    return scfLevel === cfLevel;
                }
                ).forEach(scf=>{
                    const scfHash = scf.hash ?? DataUtil.class.unpackUidSubclassFeature(scf.subclassFeature || scf).hash;
                    seenSubclassFeatureHashes.add(scfHash);

                    scf.level = cfLevel;

                    allFeatures.push(scf);
                }
                );
            }
            );
        }
        );

        return MiscUtil.copy(allFeatures);
    }

    static isClassEntryFilterMatch(entry, pageFilter, filterValues) {
        const source = entry.source;
        const options = entry.isClassFeatureVariant ? {isClassFeatureVariant: true} : null;

        if (pageFilter.filterBox) {
            return pageFilter.filterBox.toDisplayByFilters(filterValues, ...[{
                filter: pageFilter.sourceFilter, value: source, }, pageFilter.optionsFilter ? {
                filter: pageFilter.optionsFilter,
                value: options,
            } : null, ].filter(Boolean), );
        }

        return pageFilter.sourceFilter.toDisplay(filterValues, source) && (!pageFilter.optionsFilter
            || pageFilter.optionsFilter.toDisplay(filterValues, options));
    }

    static getFilteredEntries_bySource(entries, pageFilter, filterValues) {
        const isDisplayableEntry = ({entry, filterValues, pageFilter})=>{
            if (!entry.source){return true;}

            return this.isClassEntryFilterMatch(entry, pageFilter, filterValues);
        };

        return this._getFilteredEntries({
            entries,
            pageFilter,
            filterValues,
            fnIsDisplayableEntry: isDisplayableEntry,
        }, );
    }
    static _getFilteredEntries({entries, pageFilter, filterValues, fnIsDisplayableEntry, }, ) {
        const recursiveFilter = (entry)=>{
            if (entry == null)
                return entry;
            if (typeof entry !== "object")
                return entry;

            if (entry instanceof Array) {
                entry = entry.filter(it=>fnIsDisplayableEntry({
                    entry: it, pageFilter, filterValues, }));

                return entry.map(it=>recursiveFilter(it));
            }

            Object.keys(entry).forEach(k=>{
                if (entry[k]instanceof Array) {
                    entry[k] = recursiveFilter(entry[k]);
                    if (!entry[k].length)
                        delete entry[k];
                } else
                    entry[k] = recursiveFilter(entry[k]);
            }
            );
            return entry;
        };

        entries = MiscUtil.copy(entries);
        return recursiveFilter(entries);
    }

    static async pGetPreparableSpells(spells, cls, spellLevelLow, spellLevelHigh) {
        Renderer.spell.populatePrereleaseLookup(await PrereleaseUtil.pGetBrewProcessed(), {
            isForce: true
        });
        Renderer.spell.populateBrewLookup(await BrewUtil2.pGetBrewProcessed(), {
            isForce: true
        });

        return spells.filter(it=>{
            if (!(it.level > 0 && it.level >= spellLevelLow && it.level <= spellLevelHigh))
                return false;

            Renderer.spell.uninitBrewSources(it);
            Renderer.spell.initBrewSources(it);

            const fromClassList = Renderer.spell.getCombinedClasses(it, "fromClassList");
            return fromClassList.some(c=>(c.name || "").toLowerCase() === cls.name.toLowerCase() && (c.source || Parser.SRC_PHB).toLowerCase() === cls.source.toLowerCase());
        }
        );
    }

    static getCasterProgression(cls, sc, {targetLevel, otherExistingClassItems=null, otherExistingSubclassItems=null}) {
        otherExistingClassItems = otherExistingClassItems || [];
        otherExistingSubclassItems = otherExistingSubclassItems || [];

        const isSpellcastingMulticlass = [...otherExistingClassItems.filter(it=>it.system?.spellcasting && it.system?.spellcasting !== "none"), ...otherExistingSubclassItems.filter(it=>it.system?.spellcasting && it.system?.spellcasting !== "none"), cls.casterProgression != null || sc?.casterProgression != null, ].filter(Boolean).length > 1;

        let {totalSpellcastingLevels, casterClassCount, maxPactCasterLevel, } = UtilActors.getActorSpellcastingInfo({
            sheetItems: [...otherExistingClassItems, ...otherExistingSubclassItems],
            isForceSpellcastingMulticlass: isSpellcastingMulticlass,
        });

        maxPactCasterLevel = Math.max(maxPactCasterLevel, targetLevel);

        const casterProgression = sc?.casterProgression || cls.casterProgression;
        const spellAbility = sc?.spellcastingAbility || cls.spellcastingAbility;

        if (casterProgression) {
            const fnRound = casterClassCount ? Math.floor : Math.ceil;
            switch (casterProgression) {
            case "full":
                totalSpellcastingLevels += targetLevel;
                break;
            case "1/2":
                totalSpellcastingLevels += fnRound(targetLevel / 2);
                break;
            case "1/3":
                totalSpellcastingLevels += fnRound(targetLevel / 3);
                break;
            }
        }

        return {
            casterProgression,
            spellAbility,
            totalSpellcastingLevels,
            maxPactCasterLevel,
        };
    }

    static getMysticProgression({cls=null, targetLevel=0, otherExistingClassItems=null, otherExistingSubclassItems=null}) {
        otherExistingClassItems = otherExistingClassItems || [];
        otherExistingSubclassItems = otherExistingSubclassItems || [];
        let totalMysticLevels = 0;

        if (cls?.name === "Mystic" && cls?.source === Parser.SRC_UATMC)
            totalMysticLevels += targetLevel;

        if (otherExistingClassItems) {
            totalMysticLevels += otherExistingClassItems.filter(it=>it.name.toLowerCase().trim() === "mystic").map(it=>it.system.levels).sum();
        }

        return {
            totalMysticLevels,
        };
    }

    static addFauxOptionalFeatureFeatures(classList, optfeatList) {
        for (const cls of classList) {
            if (cls.classFeatures && cls.optionalfeatureProgression?.length) {
                for (const optFeatProgression of cls.optionalfeatureProgression) {
                    this._addFauxOptionalFeatureFeatures_handleClassProgression(optfeatList, cls, null, optFeatProgression, );
                }
            }

            for (const sc of cls.subclasses) {
                if (sc.subclassFeatures && sc.optionalfeatureProgression?.length) {
                    for (const optFeatProgression of sc.optionalfeatureProgression) {
                        this._addFauxOptionalFeatureFeatures_handleClassProgression(optfeatList, cls, sc, optFeatProgression, );
                    }
                }
            }
        }
    }

    static _addFauxOptionalFeatureFeatures_handleClassProgression(optfeatList, cls, sc, optFeatProgression) {
        const fauxLoadeds = this._addFauxOptionalFeatureFeatures_getLoadeds(optfeatList, cls, optFeatProgression);

        let progression = optFeatProgression.progression;
        if (!(progression instanceof Array)) {
            if (progression["*"]) {
                progression = MiscUtil.copy(progression);
                progression[1] = progression["*"];
            }

            const populated = new Set(Object.keys(progression).map(it=>Number(it)).sort(SortUtil.ascSort));
            const nxt = [];
            const lvlMax = Math.max(...populated, Consts.CHAR_MAX_LEVEL);
            for (let i = 0; i < lvlMax; ++i) {
                nxt[i] = populated.has(i + 1) ? progression[i + 1] : nxt.length ? nxt.last() : 0;
            }
            progression = nxt;
        }

        let required = optFeatProgression.required;
        if (required && !(required instanceof Array)) {
            const populated = new Set(Object.keys(required).map(it=>Number(it)).sort(SortUtil.ascSort));
            const nxt = [];
            const lvlMax = Math.max(...populated, Consts.CHAR_MAX_LEVEL);
            for (let i = 0; i < lvlMax; ++i) {
                nxt[i] = populated.has(i + 1) ? required[i + 1] : [];
            }
            required = nxt;
        }

        const propFeatures = sc ? "subclassFeatures" : "classFeatures";
        const propFeature = sc ? "subclassFeature" : "classFeature";
        const fnUnpackUidFeature = sc ? DataUtil.class.unpackUidSubclassFeature : DataUtil.class.unpackUidClassFeature;

        let cntPrev = 0;
        progression.forEach((cntOptFeats,ixLvl)=>{
            if (cntOptFeats === cntPrev)
                return;
            const cntDelta = cntOptFeats - cntPrev;
            if (!~cntDelta)
                return;
            const lvl = ixLvl + 1;
            const requiredUidsUnpacked = (required?.[ixLvl] || []).map(it=>DataUtil.proxy.unpackUid("optionalfeature", it, "optfeature", {
                isLower: true
            }));

            const feature = this._addFauxOptionalFeatureFeatures_getFauxFeature(cls, sc, optFeatProgression, lvl, fauxLoadeds, cntDelta, requiredUidsUnpacked);

            const ixInsertBefore = (sc || cls)[propFeatures].findIndex(it=>{
                return (it.level || fnUnpackUidFeature(it[propFeature] || it).level) > lvl;
            }
            );
            if (~ixInsertBefore)
                (sc || cls)[propFeatures].splice(ixInsertBefore, 0, feature);
            else
                (sc || cls)[propFeatures].push(feature);

            cntPrev = cntOptFeats;
        }
        );
    }

    static _addFauxOptionalFeatureFeatures_getLoadeds(optfeatList, clsSc, optFeatProgression) {
        const availOptFeats = optfeatList.filter(it=>optFeatProgression.featureType instanceof Array && (optFeatProgression.featureType || []).some(ft=>it.featureType.includes(ft)));
        const optionsMeta = {
            setId: CryptUtil.uid(),
            name: optFeatProgression.name
        };
        return availOptFeats.map(it=>{
            return {
                type: "optionalfeature",
                entry: `{@optfeature ${it.name}|${it.source}}`,
                entity: MiscUtil.copy(it),
                optionsMeta,
                page: UrlUtil.PG_OPT_FEATURES,
                source: it.source,
                hash: UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_OPT_FEATURES](it),
                isRequiredOption: false,
            };
        }
        );
    }

    static _addFauxOptionalFeatureFeatures_getFauxFeature(cls, sc, optFeatProgression, lvl, fauxLoadeds, cntOptions, requiredUidsUnpacked) {
        const loadeds = MiscUtil.copy(fauxLoadeds).filter(l=>!ExcludeUtil.isExcluded(UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_OPT_FEATURES]({
            name: l.entity.name,
            source: l.entity.source
        }), "optionalfeature", l.entity.source, {
            isNoCount: true
        }, ));

        loadeds.forEach(l=>{
            l.isRequiredOption = requiredUidsUnpacked.some(it=>it.name === l.entity.name.toLowerCase() && it.source === l.entity.source.toLowerCase());
            l.optionsMeta.count = cntOptions;
            PageFilterClassesFoundry.populateEntityTempData({
                entity: l.entity,
                ancestorClassName: cls.name,
                ancestorSubclassName: sc?.name,
                level: lvl,
                ancestorType: "optionalfeature",
                displayName: `${optFeatProgression.name}: ${l.entity.name}`,
                foundrySystem: {
                    requirements: cls.name ? `${cls.name}${sc ? ` (${sc.name})` : ""} ${lvl}` : null,
                },
            });
        }
        );

        const out = {
            name: optFeatProgression.name,
            level: lvl,
            loadeds: loadeds,
        };

        if (sc) {
            Object.assign(out, {
                source: sc.source,
                subclassFeature: `${optFeatProgression.name}|${cls.name}|${cls.source}|${sc.shortName}|${sc.source}|${lvl}|${Parser.SRC_5ETOOLS_TMP}`,
                hash: UrlUtil.URL_TO_HASH_BUILDER["subclassFeature"]({
                    name: optFeatProgression.name,
                    subclassName: sc.name,
                    subclassSource: sc.source,
                    className: cls.name,
                    classSource: cls.source,
                    level: lvl,
                    source: Parser.SRC_5ETOOLS_TMP,
                }),
            }, );
        } else {
            Object.assign(out, {
                source: cls.source,
                classFeature: `${optFeatProgression.name}|${cls.name}|${cls.source}|${lvl}|${Parser.SRC_5ETOOLS_TMP}`,
                hash: UrlUtil.URL_TO_HASH_BUILDER["classFeature"]({
                    name: optFeatProgression.name,
                    className: cls.name,
                    classSource: cls.source,
                    level: lvl,
                    source: Parser.SRC_5ETOOLS_TMP,
                }),
            }, );
        }

        return out;
    }

    static getExistingClassItems(actor, cls) {
        if (!cls || !actor?.items){return [];}

        return actor.items.filter(actItem=>{
            if (actItem.type !== "class"){return;}

            const {page, source, hash, propDroppable} = MiscUtil.get(actItem, "flags", SharedConsts.MODULE_ID) || {};
            if (page === UrlUtil.PG_CLASSES && propDroppable === "class" && source === cls.source && hash === UrlUtil.URL_TO_HASH_BUILDER["class"](cls))
                return true;

            return (actItem.name || "").toLowerCase().trim() === cls.name.toLowerCase().trim() && (!Config.get("import", "isStrictMatching") || (UtilDocumentSource.getDocumentSource(actItem).source || "").toLowerCase() === Parser.sourceJsonToAbv(cls.source).toLowerCase());
        }
        );
    }

    static getExistingSubclassItems(actor, cls, sc) {
        if (!cls || !sc)
            return [];

        return actor.items.filter(actItem=>{
            if (actItem.type !== "subclass")
                return false;

            const {page, source, hash, propDroppable} = MiscUtil.get(actItem, "flags", SharedConsts.MODULE_ID) || {};
            if (page === UrlUtil.PG_CLASSES && propDroppable === "subclass" && source === sc.source && hash === UrlUtil.URL_TO_HASH_BUILDER["subclass"](sc))
                return true;

            return (actItem.name || "").toLowerCase().trim() === sc.name.toLowerCase().trim() && (!Config.get("import", "isStrictMatching") || (UtilDocumentSource.getDocumentSource(actItem).source || "").toLowerCase() === Parser.sourceJsonToAbv(sc.source).toLowerCase());
        }
        );
    }

    static getClassFromExistingClassItem(existingClassItem, classes) {
        if (!existingClassItem || existingClassItem.type !== "class" || !classes?.length)
            return null;

        classes = [...classes].sort(this._sortByOfficialAndRecent.bind(this));

        return classes.find(cls=>cls.name.toLowerCase().trim() === existingClassItem.name.toLowerCase().trim() && (!Config.get("import", "isStrictMatching") || (UtilDocumentSource.getDocumentSource(existingClassItem).source || "").toLowerCase() === Parser.sourceJsonToAbv(cls.source).toLowerCase()), );
    }

    static getSubclassFromExistingSubclassItem(existingSubclassItem, cls, subclasses) {
        if (!existingSubclassItem || existingSubclassItem.type !== "subclass" || !subclasses?.length)
            return null;

        subclasses = subclasses.filter(it=>it.className === cls.name && it.classSource === cls.source);

        subclasses = [...subclasses].sort(this._sortByOfficialAndRecent.bind(this));

        return subclasses.find(sc=>sc.name.toLowerCase().trim() === existingSubclassItem.name.toLowerCase().trim() || sc.shortName.toLowerCase().trim() === existingSubclassItem.name.toLowerCase().trim(), );
    }

    static _sortByOfficialAndRecent(a, b) {
        const isNonStandardSourceA = SourceUtil.isNonstandardSource(a.source);
        const isNonStandardSourceB = SourceUtil.isNonstandardSource(b.source);

        if (isNonStandardSourceA === isNonStandardSourceB) {
            return SortUtil.ascSortDateString(Parser.sourceJsonToDate(a.source), Parser.sourceJsonToDate(b.source)) || SortUtil.ascSortLower(a.name, b.name);
        }

        return isNonStandardSourceA ? 1 : -1;
    }

    static getClassSubclassFeatureReferences(obj) {
        const refsClassFeature = [];
        const refsSubclassFeature = [];

        MiscUtil.getWalker({
            isNoModification: true
        }).walk(obj, {
            object: (obj)=>{
                if (obj.type === "refClassFeature") {
                    refsClassFeature.push(MiscUtil.copy(obj));
                    return;
                }

                if (obj.type === "refSubclassFeature") {
                    refsSubclassFeature.push(MiscUtil.copy(obj));
                }
            }
            ,
        }, );

        return {
            refsClassFeature,
            refsSubclassFeature
        };
    }

    static getClassSubclassItemTuples({classItems, subclassItems}) {
        if (!classItems?.length)
            return [];

        subclassItems = subclassItems || [];

        return classItems.map(classItem=>({
            classItem,
            subclassItem: subclassItems.find(it=>it.system.classIdentifier === classItem.system.identifier),
        }));
    }

    static getToolProficiencyData(profs) {
        if (!profs)
            return null;
        if (profs.toolProficiencies)
            return profs.toolProficiencies;
        if (!profs.tools)
            return null;

        const out = {};
        profs.tools.forEach(str=>{
            const itemUid = UtilActors.getItemUIdFromToolProficiency(str);
            if (!itemUid)
                return;
            const mappedTool = UtilActors.getMappedTool(itemUid);
            if (!mappedTool)
                return;
            const unmappedTool = UtilActors.getUnmappedTool(mappedTool);
            if (!unmappedTool)
                return;
            out[unmappedTool] = true;
        }
        );

        return [out];
    }
}

Charactermancer_Class_Util.ExistingFeatureChecker = class {
    constructor(actor, cachedCharacter) {
        this._actor = actor;
        this._cachedCharacter = cachedCharacter;

        this._existingSheetFeatures = {};
        this._existingImportFeatures = {};

        if(SETTINGS.USE_EXISTING_WEB){
            //TODO: Fix this
            if(!cachedCharacter?.feats){return;}
            cachedCharacter.feats.forEach(it=>{
                const cleanSource = (UtilDocumentSource.getDocumentSource(it).source || "").trim().toLowerCase();
                Charactermancer_Class_Util.ExistingFeatureChecker._getNameAliases(it.name).forEach(alias=>this._existingSheetFeatures[alias] = cleanSource);
    
                const {page, source, hash} = it.flags?.[SharedConsts.MODULE_ID] || {};
                if (page && source && hash) { this.addImportFeature(page, source, hash); }
            });
            return;
        }
        if(SETTINGS.USE_EXISTING){
            actor.items.filter(it=>it.type === "feat").forEach(it=>{
                const cleanSource = (UtilDocumentSource.getDocumentSource(it).source || "").trim().toLowerCase();
                Charactermancer_Class_Util.ExistingFeatureChecker._getNameAliases(it.name).forEach(alias=>this._existingSheetFeatures[alias] = cleanSource);
    
                const {page, source, hash} = it.flags?.[SharedConsts.MODULE_ID] || {};
                if (page && source && hash)
                    this.addImportFeature(page, source, hash);
            });
        }
    }

    static _getNameAliases(name) {
        const cleanName = name.trim().toLowerCase();
        const out = [cleanName, ];

        const mTrailingParens = /^(.*?)\(.*\)$/.exec(cleanName);
        if (mTrailingParens)
            out.push(mTrailingParens[1].trim());

        if (cleanName.includes(": ")) {
            const cleanNamePostColon = cleanName.split(":").slice(1).join(":").trim();
            out.push(cleanNamePostColon);
            const mTrailingParensPostColon = /^(.*?)\(.*\)$/.exec(cleanNamePostColon);
            if (mTrailingParensPostColon)
                out.push(mTrailingParensPostColon[1].trim());
        }

        return out;
    }

    isExistingFeature(name, page, source, hash) {
        if (MiscUtil.get(this._existingImportFeatures, page, source, hash))
            return true;

        const searchNameAliases = Charactermancer_Class_Util.ExistingFeatureChecker._getNameAliases(name);
        if (!searchNameAliases.some(it=>this._existingSheetFeatures[it]))
            return false;

        if (!Config.get("import", "isStrictMatching"))
            return true;

        const searchSource = Parser.sourceJsonToAbv(source).trim().toLowerCase();
        return searchNameAliases.some(it=>this._existingSheetFeatures[it] === searchSource);
    }

    addImportFeature(page, source, hash) {
        MiscUtil.set(this._existingImportFeatures, page, source, hash, true);
    }
};

class Charactermancer_ProficiencySelect extends BaseComponent {
}

Charactermancer_ProficiencySelect.PropGroup = class {
    constructor({prop, propTrackerPulse, propTracker}) {
        this.prop = prop;
        this.propTrackerPulse = propTrackerPulse;
        this.propTracker = propTracker;
    }
};

class Charactermancer_OtherProficiencySelect extends Charactermancer_ProficiencySelect {
    
    constructor(opts) {
        opts = opts || {};
        super();

        this._existing = opts.existing; //Just used to determine if ANYTHING else on our character already is giving us proficiency/expertise for something
        this._available = Charactermancer_OtherProficiencySelect._getNormalizedAvailableProficiencies(opts.available);
        this._titlePrefix = opts.titlePrefix;
        this._featureSourceTracker = opts.featureSourceTracker || new Charactermancer_FeatureSourceTracker();
        this._$elesPreFromGroups = opts.$elesPreFromGroups;
        this._$elesPostFromGroups = opts.$elesPostFromGroups;

        this._lastMetas = [];
        this._hkExisting = null;
    }
    
    static async pGetUserInput(opts) {
        opts = opts || {};

        if (!opts.available)
            return {
                isFormComplete: true,
                data: {}
            };

        const comp = new this({
            ...opts,
            existing: this.getExisting(opts.existingFvtt),
            existingFvtt: opts.existingFvtt,
        });
        if (comp.isNoChoice())
            return comp.pGetFormData();

        return UtilApplications.pGetImportCompApplicationFormData({
            comp,
            width: 640,
            isAutoResize: true,
        });
    }

    static getExistingFvttFromActor(actor) {
        return {
            skillProficiencies: MiscUtil.get(actor, "_source", "system", "skills"),
            toolProficiencies: MiscUtil.get(actor, "_source", "system", "tools"),
            languageProficiencies: MiscUtil.get(actor, "_source", "system", "traits", "languages"),
            armorProficiencies: MiscUtil.get(actor, "_source", "system", "traits", "armorProf"),
            weaponProficiencies: MiscUtil.get(actor, "_source", "system", "traits", "weaponProf"),
            savingThrowProficiencies: MiscUtil.get(actor, "_source", "system", "abilities"),
        };
    }

    static getExisting(existingFvtt) {
        if(!SETTINGS.USE_EXISTING){return null;} //TEMPFIX
        return {
            skillProficiencies: this._getExistingSkillToolProficiencies({
                existingProficienciesSetFvtt: existingFvtt.skillProficiencies,
                mapAbvToFull: UtilActors.SKILL_ABV_TO_FULL,
            }),
            toolProficiencies: this._getExistingSkillToolProficiencies({
                existingProficienciesSetFvtt: existingFvtt.toolProficiencies,
                mapAbvToFull: UtilActors.SKILL_ABV_TO_FULL,
            }),
            languageProficiencies: this._getExistingProficiencies({
                existingProficienciesSetFvtt: existingFvtt?.languageProficiencies,
                vetToFvttProfs: UtilActors.VALID_LANGUAGES,
                allProfsVet: Parser.LANGUAGES_ALL,
            }),
            armorProficiencies: this._getExistingProficiencies({
                existingProficienciesSetFvtt: existingFvtt?.armorProficiencies,
                vetToFvttProfs: UtilActors.VALID_ARMOR_PROFICIENCIES,
                allProfsVet: UtilActors.ARMOR_PROFICIENCIES,
            }),
            weaponProficiencies: this._getExistingProficiencies({
                existingProficienciesSetFvtt: existingFvtt?.weaponProficiencies,
                vetToFvttProfs: UtilActors.VALID_WEAPON_PROFICIENCIES,
                allProfsVet: UtilActors.WEAPON_PROFICIENCIES,
            }),
            savingThrowProficiencies: this._getExistingSavingThrowProficiencies(existingFvtt),
        };
    }

    static isNoChoice(available) {
        return this._isNoChoice({
            available
        });
    }

    static _isNoChoice({available, isAlreadyMapped}) {
        if (!available?.length)
            return true;
        if (isAlreadyMapped && !this._isValidAvailableData(available))
            throw new Error(`Proficiency data was not valid! Data was:\n${JSON.stringify(available)}`);

        if (!isAlreadyMapped)
            available = Charactermancer_OtherProficiencySelect._getNormalizedAvailableProficiencies(available);

        return available.length === 1 && !available[0].choose;
    }

    static _isValidAvailableData(available) {
        if (!(available instanceof Array))
            return false;

        for (const profSet of available) {
            const badKeys = Object.keys(profSet).filter(it=>it !== "static" && it !== "choose");
            if (badKeys.length)
                return false;

            if ((profSet.static || []).filter(it=>!it.prop).length)
                return false;
            if ((profSet.choose || []).filter(it=>it.from && it.from.some(from=>!from.prop)).length)
                return false;
            if ((profSet.choose || []).filter(it=>it.fromFilter && !it.prop).length)
                return false;
        }

        return true;
    }

    static getMappedSkillProficiencies(skillProficiencies) {
        if (!skillProficiencies)
            return skillProficiencies;
        return skillProficiencies.map(it=>{
            it = MiscUtil.copy(it);
            if (it.any) {
                it.anySkill = it.any;
                delete it.any;
            }
            if (it.choose?.from && CollectionUtil.setEq(new Set(it.choose.from), new Set(Renderer.generic.FEATURE__ALL_SKILLS))) {
                it.anySkill = it.choose.count ?? 1;
                delete it.choose;
            }
            this._getMappedProficiencies_expandChoose({
                proficienciesSet: it,
                prop: "skillProficiencies"
            });
            return it;
        }
        );
    }

    static getMappedLanguageProficiencies(languageProficiencies) {
        if (!languageProficiencies)
            return languageProficiencies;
        return languageProficiencies.map(it=>{
            it = MiscUtil.copy(it);
            if (it.any) {
                it.anyLanguage = it.any;
                delete it.any;
            }
            if (it.anyStandard) {
                it.anyStandardLanguage = it.anyStandard;
                delete it.anyStandard;
            }
            if (it.anyExotic) {
                it.anyExoticLanguage = it.anyExotic;
                delete it.anyExotic;
            }
            this._getMappedProficiencies_expandChoose({
                proficienciesSet: it,
                prop: "languageProficiencies"
            });
            this._getMappedProficiencies_expandStatic({
                proficienciesSet: it,
                prop: "languageProficiencies"
            });
            return it;
        }
        );
    }

    static getMappedToolProficiencies(toolProficiencies) {
        if (!toolProficiencies)
            return toolProficiencies;
        return toolProficiencies.map(it=>{
            it = MiscUtil.copy(it);
            if (it.any) {
                it.anyTool = it.any;
                delete it.any;
            }
            if (it.anyArtisans) {
                it.anyArtisansTool = it.anyArtisans;
                delete it.anyArtisans;
            }
            this._getMappedProficiencies_expandChoose({
                proficienciesSet: it,
                prop: "toolProficiencies"
            });
            this._getMappedProficiencies_expandStatic({
                proficienciesSet: it,
                prop: "toolProficiencies"
            });
            return it;
        }
        );
    }

    static getMappedArmorProficiencies(armorProficiencies) {
        if (!armorProficiencies)
            return armorProficiencies;
        return armorProficiencies.map(it=>{
            it = MiscUtil.copy(it);
            if (it.any) {
                it.anyArmor = it.any;
                delete it.any;
            }
            this._getMappedProficiencies_expandChoose({
                proficienciesSet: it,
                prop: "armorProficiencies"
            });
            this._getMappedProficiencies_expandStatic({
                proficienciesSet: it,
                prop: "armorProficiencies"
            });
            return it;
        }
        );
    }

    static getMappedWeaponProficiencies(weaponProficiencies) {
        if (!weaponProficiencies)
            return weaponProficiencies;
        return weaponProficiencies.map(it=>{
            it = MiscUtil.copy(it);
            if (it.any) {
                it.anyWeapon = it.any;
                delete it.any;
            }
            this._getMappedProficiencies_expandChoose({
                proficienciesSet: it,
                prop: "weaponProficiencies"
            });
            this._getMappedProficiencies_expandStatic({
                proficienciesSet: it,
                prop: "weaponProficiencies"
            });
            return it;
        }
        );
    }

    static getMappedSavingThrowProficiencies(savingThrowProficiencies) {
        if (!savingThrowProficiencies)
            return savingThrowProficiencies;
        return savingThrowProficiencies.map(it=>{
            it = MiscUtil.copy(it);
            if (it.any) {
                it.anySavingThrow = it.any;
                delete it.any;
            }
            this._getMappedProficiencies_expandChoose({
                proficienciesSet: it,
                prop: "savingThrowProficiencies"
            });
            this._getMappedProficiencies_expandStatic({
                proficienciesSet: it,
                prop: "savingThrowProficiencies"
            });
            return it;
        }
        );
    }

    static _getMappedProficiencies_expandChoose({proficienciesSet, prop}) {
        if (!proficienciesSet.choose)
            return;
        if (proficienciesSet.choose.fromFilter)
            proficienciesSet.choose.prop = prop;
        if (proficienciesSet.choose.from) {
            proficienciesSet.choose.from = proficienciesSet.choose.from.map(it=>{
                if (typeof it !== "string")
                    return it;
                return {
                    prop,
                    name: it
                };
            }
            );
        }
        proficienciesSet.choose = [proficienciesSet.choose];
    }

    static _getMappedProficiencies_expandStatic({proficienciesSet, prop, ignoredKeys}) {
        Object.entries(proficienciesSet).forEach(([k,v])=>{
            if ((ignoredKeys && ignoredKeys.has(k)) || Charactermancer_OtherProficiencySelect._MAPPED_IGNORE_KEYS.has(k))
                return;

            if (typeof v === "boolean") {
                proficienciesSet[k] = {
                    prop
                };
                return;
            }
            if (typeof v === "number") {
                proficienciesSet[k] = {
                    prop,
                    count: v
                };
                return;
            }

            throw new Error(`Unhandled type "${typeof v}" for value of proficiency "${k}"`);
        }
        );
    }

    static _getExistingFvttProficiencySetsMeta(existingFvtt) {
        return {
            existingProficienciesFvttSet: new Set(existingFvtt?.value || []),
            existingProficienciesFvttSetCustom: new Set((existingFvtt?.custom || "").split(";").map(it=>it.trim().toLowerCase()).filter(Boolean)),
        };
    }

    

    static _getNormalizedAvailableProficiencies(availProfs) {
        return availProfs.map(availProfSet=>{
            const out = {};

            Object.entries(availProfSet).forEach(([k,v])=>{
                if (!v)
                    return;

                switch (k) {
                case "choose":
                    {
                        v.forEach(choose=>{
                            const mappedCount = choose.count != null && !isNaN(choose.count) ? Number(choose.count) : 1;
                            if (mappedCount <= 0)
                                return;

                            const mappedFroms = (choose?.from || []).map(it=>Renderer.generic.getMappedAnyProficiency({
                                keyAny: it,
                                countRaw: mappedCount
                            }) || this._getNormalizedProficiency(null, it)).filter(Boolean);

                            const mappedFromFilter = (choose?.fromFilter || "").trim();

                            if (!mappedFroms.length && !mappedFromFilter)
                                return;
                            if (mappedFroms.length && mappedFromFilter)
                                throw new Error(`Invalid proficiencies! Only one of "from" and "fromFilter" may be provided. Data was:\n${JSON.stringify(choose)}`);

                            const tgt = (out.choose = out.choose || []);

                            if (mappedFromFilter) {
                                if (!choose.type && !choose.prop)
                                    throw new Error(`"fromFilter" did not have an associated "type"!`);
                                tgt.push({
                                    fromFilter: mappedFromFilter,
                                    count: mappedCount,
                                    prop: choose.prop || this._getNormalizedProficiencyPropFromType(choose.type)
                                });
                                return;
                            }

                            if (!mappedFroms.length)
                                return;

                            const subOut = {
                                from: [],
                                count: mappedCount
                            };
                            mappedFroms.forEach(it=>{
                                if (it.from) {
                                    subOut.from = [...subOut.from, ...it.from];
                                    if (it.groups)
                                        Object.assign((subOut.groups = subOut.groups || {}), it.groups);
                                    return;
                                }

                                subOut.from.push(it);
                            }
                            );
                            tgt.push(subOut);
                        }
                        );

                        break;
                    }

                case "anySkill":
                case "anyTool":
                case "anyArtisansTool":
                case "anyMusicalInstrument":
                case "anyLanguage":
                case "anyStandardLanguage":
                case "anyExoticLanguage":
                case "anyWeapon":
                case "anyArmor":
                case "anySavingThrow":
                    {
                        const mappedAny = Renderer.generic.getMappedAnyProficiency({
                            keyAny: k,
                            countRaw: v
                        });
                        if (!mappedAny)
                            break;
                        (out.choose = out.choose || []).push(mappedAny);
                        break;
                    }

                default:
                    {
                        if (k === "static")
                            throw new Error(`Property handling for "static" is unimplemented!`);

                        if (v?.prop) {
                            (out.static = out.static || []).push({
                                name: k,
                                prop: v.prop
                            });
                            break;
                        }
                        if (v?.type) {
                            (out.static = out.static || []).push({
                                name: k,
                                prop: this._getNormalizedProficiencyPropFromType(v.type)
                            });
                            break;
                        }

                        const normalized = this._getNormalizedProficiency(k, v);
                        if (normalized)
                            (out.static = out.static || []).push(normalized);
                    }
                }
            }
            );

            if (out.static && out.choose) {
                out.choose.forEach(choose=>{
                    if (choose.fromFilter)
                        return;

                    choose.from = choose.from.filter(({name, prop})=>!out.static.some(({name: nameStatic, prop: propStatic})=>nameStatic === name && propStatic === prop));
                }
                );
            }

            return out;
        }
        );
    }

    static _getNormalizedProficiency(k, v) {
        if (!v){return null;}

        let name = v?.name ?? k ?? v;
        if (!name || typeof name !== "string"){return null;}
        name = name.trim();

        if (v?.prop) {
            return {
                name,
                prop: v.prop
            };
        }

        if (v?.type) {
            const prop = this._getNormalizedProficiencyPropFromType(v.type);
            return {
                name,
                prop
            };
        }

        if (Charactermancer_OtherProficiencySelect._VALID_SKILLS.has(name))
            return {
                name,
                prop: "skillProficiencies"
            };
        if (Charactermancer_OtherProficiencySelect._VALID_TOOLS.has(name))
            return {
                name,
                prop: "toolProficiencies"
            };
        if (Charactermancer_OtherProficiencySelect._VALID_LANGUAGES.has(name))
            return {
                name,
                prop: "languageProficiencies"
            };
        if (Charactermancer_OtherProficiencySelect._VALID_WEAPONS.has(name))
            return {
                name,
                prop: "weaponProficiencies"
            };
        if (Charactermancer_OtherProficiencySelect._VALID_ARMORS.has(name))
            return {
                name,
                prop: "armorProficiencies"
            };
        if (Charactermancer_OtherProficiencySelect._VALID_SAVING_THROWS.has(name))
            return {
                name,
                prop: "savingThrowProficiencies"
            };

        console.warn(...LGT, `Could not discern the type of proficiency "${name}"\u2014you may need to specify it directly with "type".`);

        return null;
    }

    static _getNormalizedProficiencyPropFromType(type) {
        type = type.trim().toLowerCase();
        switch (type) {
        case "skill":
            return "skillProficiencies";
        case "tool":
            return "toolProficiencies";
        case "language":
            return "languageProficiencies";
        case "weapon":
            return "weaponProficiencies";
        case "armor":
            return "armorProficiencies";
        case "savingThrow":
            return "savingThrowProficiencies";
        default:
            throw new Error(`Type "${type}" did not have an associated proficiency property!`);
        }
    }

    static _getTagFromProp(prop) {
        switch (prop) {
        case "armorProficiencies":
            return "@item";
        case "weaponProficiencies":
            return "@item";
        default:
            throw new Error(`Cannot get @tag from prop "${prop}"`);
        }
    }

    _getTitle() {
        const props = this._getAllPossibleProps();
        return `${props.map(prop=>this.constructor._getPropDisplayName({
            prop
        })).join("/")} Proficiency`;
    }

    _getTitlePlural() {
        const props = this._getAllPossibleProps();
        return `${props.map(prop=>this.constructor._getPropDisplayName({
            prop,
            isPlural: true
        })).join("/")} Proficiencies`;
    }

    _getAllPossibleProps() {
        const propSet = new Set();

        this._available.forEach(profSet=>{
            const subSet = this.constructor._getAllPossiblePropsForProfSet(profSet);
            subSet.forEach(prop=>propSet.add(prop));
        }
        );

        return [...propSet];
    }

    static _getAllPossiblePropsForProfSet(profSet) {
        const out = new Set();
        (profSet.static || []).forEach(it=>out.add(it.prop));
        (profSet.choose || []).forEach(it=>{
            if (it.prop)
                return out.add(it.prop);
            it.from.forEach(from=>out.add(from.prop));
        }
        );
        return out;
    }

    get modalTitle() {
        return this._getTitlePlural();
    }

    render($wrp) {

        const $stgSelGroup = this._render_$getStgSelGroup();

        const $stgGroup = $$`<div class="ve-flex-col"></div>`;
        const hkIxSet = ()=>{
            $stgGroup.empty();

            if (this._featureSourceTracker && this._hkExisting) {
                Object.values(Charactermancer_OtherProficiencySelect._PROP_GROUPS).forEach(({propTrackerPulse})=>this._featureSourceTracker.removeHook(this, propTrackerPulse, this._hkExisting));
            }
            this._lastMetas.forEach(it=>it.cleanup());
            this._lastMetas = [];

            //Get information about choices or if static
            const selProfs = this._available[this._state.ixSet];

             //This should only occur when we completely wipe the component state as part of 'remove class' button
            if(!selProfs){ return; }

            if (this._featureSourceTracker){this._doSetTrackerState();}

            const $ptsExistingStatic = selProfs.static?.length ? this._render_renderPtStatic($stgGroup, selProfs.static) : null;

            if ($ptsExistingStatic && selProfs.choose?.length){$stgGroup.append(`<hr class="hr-2">`);}

            
            const $ptsExistingChoose = (selProfs.choose || []).map(({count, from, groups, fromFilter, prop},i)=>{
                if (this._$elesPreFromGroups?.[i])
                    $stgGroup.append(this._$elesPreFromGroups?.[i]);

                const $outPtsExisting = fromFilter ? this._render_renderPtChooseFromFilter($stgGroup, { ix: i, count, fromFilter, prop })
                : this._render_renderPtChooseFrom($stgGroup, { ix: i, count, from, groups });

                if (this._$elesPostFromGroups?.[i])
                    $stgGroup.append(this._$elesPostFromGroups?.[i]);

                if (selProfs.choose.length > 1 && (i < selProfs.choose.length - 1)) {
                    $stgGroup.append(`<hr class="hr-2">`);
                }

                return $outPtsExisting;
            });

            this._hkExisting = ()=>this._hk_pUpdatePtsExisting($ptsExistingStatic, $ptsExistingChoose);
            if (this._featureSourceTracker) {
                Object.values(Charactermancer_OtherProficiencySelect._PROP_GROUPS).forEach(({propTrackerPulse})=>this._featureSourceTracker.addHook(this, propTrackerPulse, this._hkExisting));
            }
            this._hkExisting();
        };
        this._addHookBase("ixSet", hkIxSet);
        hkIxSet();

        $$`
			${$stgSelGroup}
			${$stgGroup}
		`.appendTo($wrp);
    }

    _doSetTrackerState() {
        const formData = this._getFormData();
        this._featureSourceTracker.setState(this, Object.keys(Charactermancer_OtherProficiencySelect._PROP_GROUPS).mergeMap(prop=>({
            [prop]: formData.data?.[prop]
        })), );
    }

    static _render_getStaticKeyFullText({name, prop}) {
        switch (prop) {
        case "weaponProficiencies":
            return name.split("|")[0].toTitleCase();

        case "armorProficiencies":
            {
                switch (name) {
                case "light":
                case "medium":
                case "heavy":
                    return name.toTitleCase();
                case "shield|phb":
                    return "Shields";
                default:
                    return name.split("|")[0].toTitleCase();
                }
            }

        case "savingThrowProficiencies":
            return Parser.attAbvToFull(name).toTitleCase();

        default:
            return name.toTitleCase();
        }
    }

    static _render_getStaticKeyFullTextOther({prop}) {
        switch (prop) {
        case "skillProficiencies":
            return "(Other skill proficiency)";
        case "toolProficiencies":
            return "(Other tool proficiency)";
        case "languageProficiencies":
            return "(Other language proficiency)";
        case "weaponProficiencies":
            return "(Other weapon proficiency)";
        case "armorProficiencies":
            return "(Other armor proficiency)";
        case "savingThrowProficiencies":
            return "(Other saving throw proficiency)";
        default:
            throw new Error(`Unhandled prop "${prop}"`);
        }
    }

    static async _pGetParentGroup({prop, name}) {
        switch (prop) {
        case "weaponProficiencies":
            return UtilDataConverter.pGetItemWeaponType(name);
        default:
            return null;
        }
    }

    static _getRenderedStatic({prop, name}) {
        switch (prop) {
        case "skillProficiencies":
            return this._getRenderedStatic_skillProficiencies(name);
        case "languageProficiencies":
            return this._getRenderedStatic_languageProficiencies(name);
        case "toolProficiencies":
            return this._getRenderedStatic_toolProficiencies(name);
        case "armorProficiencies":
            return this._getRenderedStatic_armorProficiencies(name);
        case "weaponProficiencies":
            return Renderer.get().render(`{@item ${name.split("|").map(sub=>sub.toTitleCase()).join("|")}}`);
        case "savingThrowProficiencies":
            return Parser.attAbvToFull(name).toTitleCase();
        default:
            return name.toTitleCase();
        }
    }

    static _getRenderedStatic_skillProficiencies(name) {
        const atb = Parser.skillToAbilityAbv(name);
        const ptAbility = `<div class="ml-1 ve-small ve-muted" title="${Parser.attAbvToFull(atb)}">(${atb.toTitleCase()})</div>`;

        return `<div class="ve-inline-flex-v-center">${Renderer.get().render(`{@skill ${name.toTitleCase()}}`)}${ptAbility}</div>`;
    }

    static _getRenderedStatic_languageProficiencies(name) {
        if (name === "other"){return name.toTitleCase();}
        if (UtilActors.LANGUAGES_PRIMORDIAL.includes(name))
            {return Renderer.get().render(`{@language primordial||${name.toTitleCase()}}`);}
        return Renderer.get().render(`{@language ${name.toTitleCase()}}`);
    }

    static _getRenderedStatic_toolProficiencies(name) {
        if (UtilActors.TOOL_PROFICIENCIES_TO_UID[name])
            return Renderer.get().render(`{@item ${UtilActors.TOOL_PROFICIENCIES_TO_UID[name].toTitleCase()}}`);
        return name.toTitleCase();
    }

    static _getRenderedStatic_armorProficiencies(key) {
        if (key === "light" || key === "medium" || key === "heavy")
            return key.toTitleCase();
        if (key === "shield|phb")
            return Renderer.get().render(`{@item shield|phb|Shields}`);
        return Renderer.get().render(`{@item ${key.split("|").map(sub=>sub.toTitleCase()).join("|")}}`);
    }

    static _getPropDisplayName({prop}) {
        switch (prop) {
        case "skillProficiencies":
            return `Skill`;
        case "toolProficiencies":
            return `Tool`;
        case "languageProficiencies":
            return `Language`;
        case "weaponProficiencies":
            return `Weapon`;
        case "armorProficiencies":
            return `Armor`;
        case "savingThrowProficiencies":
            return `Saving Throw`;
        default:
            throw new Error(`Unhandled prop "${prop}"`);
        }
    }

    _render_$getStgSelGroup() {
        if (this._available.length <= 1)
            return null;

        const $selIxSet = ComponentUiUtil.$getSelEnum(this, "ixSet", {
            placeholder: `Select ${this._getTitle()} Set`,
            values: this._available.map((_,i)=>i),
            fnDisplay: ix=>{
                const selProfs = this._available[ix];

                const out = [];

                if (selProfs.static) {
                    const pt = MiscUtil.copy(selProfs.static).sort((a,b)=>SortUtil.ascSortLower(a.name, b.name)).map(({name, prop})=>{
                        if (name === "other")
                            return this.constructor._render_getStaticKeyFullTextOther({
                                prop
                            });
                        return this.constructor._render_getStaticKeyFullText({
                            name,
                            prop
                        });
                    }
                    ).join(", ");
                    out.push(pt);
                }

                if (selProfs.choose) {
                    selProfs.choose.forEach(fromBlock=>{
                        if (fromBlock.name) {
                            out.push(`Choose ${fromBlock.name.toLowerCase()}`);
                            return;
                        }

                        if (fromBlock.fromFilter) {
                            out.push(`Choose ${Parser.numberToText(fromBlock.count)} from filtered selection`);
                            return;
                        }

                        if (fromBlock.groups) {
                            out.push(`Choose ${Parser.numberToText(fromBlock.count)} from ${Object.values(fromBlock.groups).map(({name})=>name).joinConjunct(", ", " or ")}`);
                            return;
                        }

                        out.push(`Choose ${Parser.numberToText(fromBlock.count || 1)} from ${fromBlock.from.map(({name})=>name.toTitleCase()).join(", ")}`);
                    }
                    );
                }

                return out.filter(Boolean).join("; ") || "(Nothing)";
            }
            ,
        }, );

        if (this._featureSourceTracker) {
            const hk = ()=>{
                const formData = this._getFormData().data;
                const trackerState = Object.keys(formData.data || {}).filter(k=>Charactermancer_OtherProficiencySelect._PROP_GROUPS[k]).mergeMap(it=>it);
                this._featureSourceTracker.setState(this, trackerState);
            }
            ;
            this._addHookBase("ixSet", hk);
        }

        return $$`<div class="w-100 mb-2 ve-flex-vh-center">
			${$selIxSet}
		</div>`;
    }

    _getAllValuesMaybeInUseLookup() {
        const out = {};

        const activeSet = this._available[this._state.ixSet] || {};

        if (activeSet.static) {
            activeSet.static.forEach(({name, prop})=>{
                out[prop] = out[prop] || new Set();
                out[prop].add(name);
            }
            );
        }

        if (activeSet.choose) {
            activeSet.choose.forEach(({from, fromFilter})=>{
                if (fromFilter) {
                    const prefix = `${this._getStateKeyPrefix()}_chooseFilter_`;
                    Object.entries(this._state).filter(([k,v])=>k.startsWith(prefix) && v).forEach(([,{prop, name}])=>{
                        if (!name)
                            throw new Error(`"fromFilter" choice had no "name"--this should never occur!`);
                        out[prop] = out[prop] || new Set();
                        out[prop].add(name);
                    }
                    );
                    return;
                }

                from.forEach(({name, prop})=>{
                    out[prop] = out[prop] || new Set();
                    out[prop].add(name);
                }
                );
            }
            );
        }

        return out;
    }

    _getStateKeyPrefix() {
        return "otherProfSelect";
    }

    _getPropsChooseFromFilter({ixChoose, ixCount}) {
        return {
            propState: `${this._getStateKeyPrefix()}_chooseFilter_${ixChoose}_${ixCount}`,
        };
    }

    _getPropsChooseFrom({ixChoose}) {
        return {
            propState: `${this._getStateKeyPrefix()}_${ixChoose}`,
        };
    }

    async _hk_pUpdatePtsExisting($ptsExistingStatic, $ptsExistingChooseFrom) {
        try {
            await this._pLock("updateExisting");
            await this._hk_pUpdatePtsExisting_({ $ptsExistingStatic, $ptsExistingChooseFrom });
        } finally {
            this._unlock("updateExisting");
        }
    }

    async _hk_pUpdatePtsExisting_({$ptsExistingStatic, $ptsExistingChooseFrom}) {
        const allValueLookupEntries = Object.entries(this._getAllValuesMaybeInUseLookup());

        if ($ptsExistingStatic)
            await this._hk_pUpdatePtsExisting_part({ allValueLookupEntries, $ptsExisting: $ptsExistingStatic });
        if (!$ptsExistingChooseFrom)
            return;
        for (const $ptsExisting of $ptsExistingChooseFrom)
            await this._hk_pUpdatePtsExisting_part({ allValueLookupEntries, $ptsExisting });
    }

    async _hk_pUpdatePtsExisting_part({allValueLookupEntries, $ptsExisting}) {
        for (const [prop,allProfs] of allValueLookupEntries) {
            const otherStates = this._featureSourceTracker ? this._featureSourceTracker.getStatesForKey(prop, { ignore: this }) : null;

            for (const v of allProfs) {
                const parentGroup = await this.constructor._pGetParentGroup({ prop, name: v });

                if (!$ptsExisting[prop]?.[v] && !parentGroup){continue;}

                //Check our actor already has proficiency or expertise in this skill from anywhere else
                let maxExisting = this._existing?.[prop]?.[v] || (parentGroup && this._existing?.[prop]?.[parentGroup]) || 0;

                if (otherStates)
                    otherStates.forEach(otherState=>maxExisting = Math.max(maxExisting, otherState[v] || 0, (parentGroup ? otherState[parentGroup] : 0) || 0));

                //1 is proficiency, 2 is expertise
                const helpText = maxExisting === 0 ? "" : `${UtilActors.PROF_TO_TEXT[maxExisting]} from Another Source`;

                //Show a warning text
                $ptsExisting[prop][v].title(helpText).toggleClass("ml-1", !!maxExisting).html(maxExisting ? `(<i class="fas fa-fw ${UtilActors.PROF_TO_ICON_CLASS[maxExisting]}"></i>)` : "");
            }
        }
    }

    _render_renderPtStatic($stgGroup, profsStatic) {
        const $ptsExisting = {};

        const byProp = {};
        profsStatic.forEach(({prop, name})=>MiscUtil.set(byProp, prop, name, true));
        const isMultiProp = this.constructor._getAllPossiblePropsForProfSet(this._available[this._state.ixSet]).size > 1;

        const $wrps = Object.entries(byProp).map(([prop,profsStaticSet])=>{
            const ptPropType = isMultiProp ? ` (${this.constructor._getPropDisplayName({
                prop
            })} Proficiency)` : "";
            const profsStaticSetKeys = Object.keys(profsStaticSet);
            return profsStaticSetKeys.sort(SortUtil.ascSortLower).map((name,i)=>{
                const $ptExisting = $(`<div class="ve-small veapp__msg-warning inline-block"></div>`);
                MiscUtil.set($ptsExisting, prop, name, $ptExisting);
                const isNotLast = i < profsStaticSetKeys.length - 1;
                return $$`<div class="inline-block ${isNotLast ? "mr-1" : ""}">${this.constructor._getRenderedStatic({
                    prop,
                    name
                })}${ptPropType}${$ptExisting}${isNotLast ? `,` : ""}</div>`;
            }
            );
        }
        ).flat();

        $$`<div class="block">
			${$wrps}
		</div>`.appendTo($stgGroup);

        return $ptsExisting;
    }

    _render_renderPtChooseFrom($stgGroup, {ix, count, from, groups}) {
        const {propState} = this._getPropsChooseFrom({ ixChoose: ix });
        const $ptsExisting = {};
        const compOpts = {
            count,
            fnDisplay: ({prop, name})=>{
                const $ptExisting = $(`<div class="ve-small veapp__msg-warning"></div>`);
                MiscUtil.set($ptsExisting, prop, name, $ptExisting);

                return $$`<div class="ve-flex-v-center w-100">
					<div class="ve-flex-v-center">${this.constructor._getRenderedStatic({
                    prop,
                    name
                })}</div>
					${$ptExisting}
				</div>`;
            }
            ,
        };

        const fromProps = new Set(from.map(({prop})=>prop));

        const byPropThenGroup = {};

        from.forEach(({name, prop, group})=>{
            group = group ?? "_";
            MiscUtil.set(byPropThenGroup, prop, group, name, Charactermancer_OtherProficiencySelect._PROFICIENT);
        });

        const isMultiProp = Object.keys(byPropThenGroup).length > 1;
        const isGrouped = Object.values(byPropThenGroup).some(groupMeta=>Object.keys(groupMeta).some(group=>group !== "_"));

        if (isMultiProp || isGrouped) {
            const valueGroups = [];
            Object.entries(byPropThenGroup).forEach(([prop,groupMeta])=>{
                Object.entries(groupMeta).forEach(([groupId,names])=>{
                    const groupDetails = groups?.[groupId];

                    valueGroups.push({
                        name: [(isMultiProp ? `${this.constructor._getPropDisplayName({
                            prop
                        })} Proficiencies` : ""), groupDetails?.name, ].filter(Boolean).join(""),
                        text: groupDetails?.hint,
                        values: Object.keys(names).map(name=>({ prop, name })),
                    });
                }
                );
            });

            compOpts.valueGroups = valueGroups;
        }
        else { compOpts.values = from; }

        //Create the UI element
        const meta = ComponentUiUtil.getMetaWrpMultipleChoice(this, propState, compOpts, );

        let hkSetTrackerInfo = null;
        if (this._featureSourceTracker) {
            hkSetTrackerInfo = ()=>this._doSetTrackerState();
            this._addHookBase(meta.propPulse, hkSetTrackerInfo);
        }

        this._lastMetas.push({
            cleanup: ()=>{
                meta.cleanup();
                if (hkSetTrackerInfo)
                    this._removeHookBase(meta.propPulse, hkSetTrackerInfo);
            },
        });

        const header = fromProps.size === 1 ? (`${this.constructor._getPropDisplayName({
            prop: [...fromProps][0]
        })} ${count === 1 ? "Proficiency" : "Proficiencies"}`) : (count === 1 ? this._getTitle() : this._getTitlePlural());
        $stgGroup.append(`<div class="mb-1">${this._titlePrefix ? `${this._titlePrefix}: ` : ""}Choose ${Parser.numberToText(count)} ${header}:</div>`);
        meta.$ele.appendTo($stgGroup);

        return $ptsExisting;
    }

    _render_renderPtChooseFromFilter($stgGroup, {ix, fromFilter, count, prop}) {
        const $ptsExisting = {};

        const $row = $(`<div class="ve-flex-v-center"></div>`);

        [...new Array(count)].forEach((_,i)=>{
            const {propState} = this._getPropsChooseFromFilter({
                ixChoose: ix,
                ixCount: i
            });

            const $ptExisting = $(`<div class="ve-small veapp__msg-warning"></div>`);

            const $disp = $(`<div class="ve-flex-v-center"></div>`);
            const hkChosen = (propHk,valueHk,prevValueHk)=>{
                const isFirstRun = !propHk;
                if (!isFirstRun) {
                    if (prevValueHk) {
                        const {prop: propPrev, name: namePrev} = prevValueHk;
                        const uidPrev = (namePrev || "").toLowerCase();
                        MiscUtil.delete($ptsExisting, propPrev, uidPrev, $ptExisting);
                    }

                    if (valueHk) {
                        const {prop, name} = valueHk || {};
                        const uid = (name || "").toLowerCase();
                        MiscUtil.set($ptsExisting, prop, uid, $ptExisting);
                    }
                }

                $disp.html(this._state[propState] != null ? `<div>${Renderer.get().render(`{${this.constructor._getTagFromProp(prop)} ${this._state[propState].name.toLowerCase()}}`)}</div>` : `<div class="italic ve-muted">(select a ${this.constructor._getPropDisplayName({
                    prop
                }).toLowerCase()} proficiency)</div>`, );

                if (!isFirstRun && this._featureSourceTracker)
                    this._doSetTrackerState();
            };
            this._addHookBase(propState, hkChosen);
            this._lastMetas.push({
                cleanup: ()=>this._removeHookBase(propState, hkChosen)
            });
            hkChosen();

            const $btnFilter = $(`<button class="btn btn-default btn-xxs mx-1" title="Choose a ${this.constructor._getPropDisplayName({
                prop
            })} Proficiency"><span class="fas fa-fw fa-search"></span></button>`).click(async()=>{
                const selecteds = await this._pGetFilterChoice({
                    prop,
                    fromFilter
                });
                if (selecteds == null || !selecteds.length)
                    return;

                const selected = selecteds[0];
                this._state[propState] = {
                    prop,
                    name: `${selected.name}|${selected.values.sourceJson}`.toLowerCase()
                };
            }
            );

            $$`<div class="ve-flex-v-center mr-1">${$btnFilter}${$disp}${$ptExisting}</div>`.appendTo($row);
        }
        );

        $$`<div class="py-1 ve-flex-v-center">
			${$row}
		</div>`.appendTo($stgGroup);

        return $ptsExisting;
    }

    _pGetFilterChoice({prop, fromFilter}) {
        switch (prop) {
        case "armorProficiencies":
        case "weaponProficiencies":
            {
                const modalFilterItems = new ModalFilterItemsFvtt({
                    filterExpression: fromFilter,
                    namespace: "Charactermancer_OtherProficiencySelect.items",
                    isRadio: true,
                });
                return modalFilterItems.pGetUserSelection({
                    filterExpression: fromFilter
                });
            }

        default:
            throw new Error(`Filter choices for "${prop}" are unimplemented!`);
        }
    }

    isNoChoice() {
        return this.constructor._isNoChoice({
            available: this._available,
            isAlreadyMapped: true
        });
    }

    _getFormData() {
        let isFormComplete = true;
        const out = {};

        const selProfs = this._available[this._state.ixSet];

        //This should only occur when we completely wipe the component state as part of 'remove class' button
        if(!selProfs){ return {isFormComplete:false, data:null};}

        (selProfs.static || []).forEach(({prop, name})=>MiscUtil.set(out, prop, name, Charactermancer_OtherProficiencySelect._PROFICIENT));

        (selProfs.choose || []).forEach(({count, from, groups, fromFilter, prop},ixChoose)=>{
            if (fromFilter) {
                [...new Array(count)].forEach((_,ixCount)=>{
                    const {propState} = this._getPropsChooseFromFilter({
                        ixChoose,
                        ixCount
                    });

                    if (!this._state[propState])
                        return isFormComplete = false;

                    const {prop, name} = this._state[propState];
                    MiscUtil.set(out, prop, name, Charactermancer_OtherProficiencySelect._PROFICIENT);
                }
                );

                return;
            }

            const {propState} = this._getPropsChooseFrom({ ixChoose });

            const ixs = ComponentUiUtil.getMetaWrpMultipleChoice_getSelectedIxs(this, propState);
            ixs.map(ix=>from[ix]).forEach(({prop, name})=>MiscUtil.set(out, prop, name, Charactermancer_OtherProficiencySelect._PROFICIENT));

            if (!this._state[ComponentUiUtil.getMetaWrpMultipleChoice_getPropIsAcceptable(propState)])
                isFormComplete = false;
        });

        return { isFormComplete, data: out, };
    }

    pGetFormData() {
        return this._getFormData();
    }

    _getDefaultState() {
        return {
            ixSet: 0,
        };
    }

    static _getExistingProficiencies({existingProficienciesSetFvtt, vetToFvttProfs, allProfsVet}) {
        const {existingProficienciesFvttSet, existingProficienciesFvttSetCustom} = this._getExistingFvttProficiencySetsMeta(existingProficienciesSetFvtt);

        const existing = {};

        Object.entries(vetToFvttProfs).filter(([_,fvtt])=>existingProficienciesFvttSet.has(fvtt)).forEach(([vet,fvtt])=>{
            existing[vet] = Charactermancer_OtherProficiencySelect._PROFICIENT;
            existingProficienciesFvttSet.delete(fvtt);
        }
        );

        allProfsVet.forEach(vet=>{
            if (existingProficienciesFvttSet.has(vet)) {
                existing[vet] = Charactermancer_OtherProficiencySelect._PROFICIENT;
                existingProficienciesFvttSet.delete(vet);
            } else if (existingProficienciesFvttSetCustom.has(vet)) {
                existing[vet] = Charactermancer_OtherProficiencySelect._PROFICIENT;
                existingProficienciesFvttSetCustom.delete(vet);
            }
        }
        );

        if (existingProficienciesFvttSet.size || existingProficienciesFvttSetCustom.size) {
            existing.other = existingProficienciesFvttSet.size + existingProficienciesFvttSetCustom.size;
        }

        return existing;
    }

    static _getExistingSkillToolProficiencies({existingProficienciesSetFvtt, mapAbvToFull}) {
        const existing = {};

        Object.entries(existingProficienciesSetFvtt || {}).forEach(([abv,data])=>{
            if (!data.value)
                return;
            existing[mapAbvToFull[abv]] = data.value;
        });

        return existing;
    }

    static _getExistingSavingThrowProficiencies(existingFvtt) {
        const existing = {};

        Object.entries(existingFvtt?.savingThrowProficiencies || {}).forEach(([ab,data])=>{
            if (!data.proficient)
                return;
            existing[ab] = data.proficient;
        }
        );

        return existing;
    }
}

Charactermancer_OtherProficiencySelect._PROFICIENT = 1;
Charactermancer_OtherProficiencySelect._PROP_GROUPS = {
    "skillProficiencies": {
        propTrackerPulse: "pulseSkillProficiencies",
    },
    "toolProficiencies": {
        propTrackerPulse: "pulseToolProficiencies",
    },
    "languageProficiencies": {
        propTrackerPulse: "pulseLanguageProficiencies",
    },
    "weaponProficiencies": {
        propTrackerPulse: "pulseWeaponProficiencies",
    },
    "armorProficiencies": {
        propTrackerPulse: "pulseArmorProficiencies",
    },
    "savingThrowProficiencies": {
        propTrackerPulse: "pulseSavingThrowProficiencies",
    },
};

Charactermancer_OtherProficiencySelect._MAPPED_IGNORE_KEYS = new Set(["choose", "any", "anySkill", "anyTool", "anyArtisansTool", "anyMusicalInstrument", "anyLanguage", "anyStandardLanguage", "anyExoticLanguage", "anyWeapon", "anyArmor", "anySavingThrow", ]);

Charactermancer_OtherProficiencySelect._VALID_SKILLS = new Set([...Renderer.generic.FEATURE__SKILLS_ALL, "anySkill", ]);
Charactermancer_OtherProficiencySelect._VALID_TOOLS = new Set([...Renderer.generic.FEATURE__TOOLS_ALL, "anyTool", "anyArtisansTool", "anyMusicalInstrument", ]);
Charactermancer_OtherProficiencySelect._VALID_LANGUAGES = new Set([...Renderer.generic.FEATURE__LANGUAGES_ALL, "anyLanguage", "anyStandardLanguage", "anyExoticLanguage", ]);
Charactermancer_OtherProficiencySelect._VALID_WEAPONS = new Set([...UtilActors.WEAPON_PROFICIENCIES, "anyWeapon", ]);
Charactermancer_OtherProficiencySelect._VALID_ARMORS = new Set([...UtilActors.ARMOR_PROFICIENCIES, "anyArmor", ]);
Charactermancer_OtherProficiencySelect._VALID_SAVING_THROWS = new Set([...Parser.ABIL_ABVS, "anySavingThrow", ]);

class Charactermancer_SkillSaveProficiencySelect extends Charactermancer_ProficiencySelect {
    static async pGetUserInput(opts) {
        opts = opts || {};

        if (!opts.available)
            return {
                isFormComplete: true,
                data: {}
            };

        const comp = new this({
            ...opts,
            existing: this.getExisting(opts.existingFvtt),
            existingFvtt: opts.existingFvtt,
        });
        if (comp.isNoChoice())
            return comp.pGetFormData();

        return UtilApplications.pGetImportCompApplicationFormData({
            comp,
            isAutoResize: true
        });
    }

    static getExisting(existingFvtt) {
        throw new Error(`Unimplemented!`);
    }

    static isNoChoice(available) {
        if (!available?.length)
            return true;
        return available.length === 1 && !available[0].choose;
    }

    constructor(opts) {
        opts = opts || {};
        super();

        this._propGroup = opts.propGroup;
        this._existing = opts.existing;
        this._existingFvtt = opts.existingFvtt;
        this._available = opts.available;
        this._titlePrefix = opts.titlePrefix;
        this._featureSourceTracker = opts.featureSourceTracker;
        this._modalTitle = opts.modalTitle;
        this._title = opts.title;
        this._titlePlural = opts.titlePlural;

        this._hkUpdateExisting = null;
        this._$stgGroup = null;
        this._lastMeta = null;
    }

    get modalTitle() {
        return this._modalTitle;
    }

    _getStaticDisplay(prof, {isPlainText=false}={}) {
        throw new Error(`Unimplemented!`);
    }
    _getMultiChoiceDisplay($ptsExisting, profOrObj) {
        throw new Error(`Unimplemented!`);
    }
    _getMultiChoiceTitle(cpyProfSet, count) {
        throw new Error(`Unimplemented!`);
    }

    _getNonStaticDisplay(key, value, {isPlainText=false}={}) {
        switch (key) {
        case "choose":
            return this._getChooseFromDisplay(key, value, {
                isPlainText
            });
        default:
            throw new Error(`Unhandled non-static key "${key}" (value was ${JSON.stringify(value)})`);
        }
    }

    _getChooseFromDisplay(key, value, {isPlainText=false}={}) {
        return `Choose ${value.count || 1} from ${value.from.map(it=>this._getStaticDisplay(it, {
            isPlainText
        })).join(", ")}`;
    }

    render($wrp) {
        const $stgSelGroup = this._render_$getStgSelGroup();
        this._$stgGroup = $$`<div class="ve-flex-col"></div>`;

        this._addHookBase("ixSet", this._hk_ixSet.bind(this));
        this._hk_ixSet();

        $$`
			${$stgSelGroup}
			${this._$stgGroup}
		`.appendTo($wrp);
    }

    _render_$getStgSelGroup() {
        if (this._available.length <= 1)
            return null;

        const $selIxSet = ComponentUiUtil.$getSelEnum(this, "ixSet", {
            values: this._available.map((_,i)=>i),
            fnDisplay: ix=>{
                const v = this._available[ix];

                const out = [];

                out.push(Object.keys(v).sort(SortUtil.ascSortLower).filter(it=>this._isStaticKey(it)).map(k=>this._getStaticDisplay(k, {
                    isPlainText: true
                })).join(", "), );

                Object.keys(v).filter(it=>!this._isStaticKey(it)).forEach(k=>out.push(this._getNonStaticDisplay(k, v[k], {
                    isPlainText: true
                })));

                return out.filter(Boolean).join("; ") || "(Nothing)";
            }
            ,
        }, );

        if (this._featureSourceTracker)
            this._addHookBase("ixSet", ()=>this._doSetTrackerState());

        return $$`<div class="w-100 mb-2 ve-flex-vh-center">
			${$selIxSet}
		</div>`;
    }

    _doSetTrackerState() {
        this._featureSourceTracker.setState(this, {
            [this._propGroup.propTracker]: this._getFormData().data?.[this._propGroup.prop]
        });
    }

    static _getSortedProfSet(profSet) {
        if (!profSet)
            return profSet;

        profSet = MiscUtil.copy(profSet);

        if (profSet.choose?.from) {
            profSet.choose.from.sort((a,b)=>{
                if (typeof a === "object" && typeof b === "object")
                    return 0;
                if (typeof a === "object")
                    return 1;
                if (typeof b === "object")
                    return -1;
                return SortUtil.ascSortLower(a, b);
            }
            );
        }

        return profSet;
    }

    _render_renderPtStatic($stgGroup, profSet) {
        const $ptsExisting = {};

        const profList = this._getStaticKeys_profSet().filter(key=>profSet[key]);

        const $wrps = profList.map((it,i)=>{
            const $ptExisting = $(`<div class="ve-small veapp__msg-warning inline-block"></div>`);
            ($ptsExisting[it] = $ptsExisting[it] || []).push($ptExisting);
            const isNotLast = i < profList.length - 1;
            return $$`<div class="inline-block ${isNotLast ? "mr-1" : ""}">${this._getStaticDisplay(it)}${$ptExisting}${isNotLast ? `,` : ""}</div>`;
        }
        );

        $$`<div class="block">
			${$wrps}
		</div>`.appendTo($stgGroup);

        return $ptsExisting;
    }

    _getStaticKeys_all() {
        throw new Error("Unimplemented!");
    }

    _getStaticKeys_profSet() {
        throw new Error("Unimplemented!");
    }

    _hk_ixSet() {
        this._$stgGroup.empty();

        if (this._featureSourceTracker && this._hkUpdateExisting)
            this._featureSourceTracker.removeHook(this, this._propGroup.propTrackerPulse, this._hkUpdateExisting);
        if (this._lastMeta)
            this._lastMeta.cleanup();

        const profSet = this._available[this._state.ixSet];

        if (this._featureSourceTracker)
            this._doSetTrackerState();

        this._hk_ixSet_renderPts(profSet);

        if (this._featureSourceTracker)
            this._featureSourceTracker.addHook(this, this._propGroup.propTrackerPulse, this._hkUpdateExisting);
        this._hkUpdateExisting();
    }

    _hk_ixSet_renderPts(profSet) {
        const $ptsExistingStatic = Object.keys(profSet).some(it=>this._isStaticKey(it)) ? this._render_renderPtStatic(this._$stgGroup, profSet) : null;

        if ($ptsExistingStatic && profSet.choose)
            this._$stgGroup.append(`<hr class="hr-2 hr--dotted">`);
        const $ptsExistingChooseFrom = profSet.choose ? this._render_renderPtChooseFrom(this._$stgGroup, profSet) : null;

        this._hkUpdateExisting = ()=>this._hk_updatePtsExisting($ptsExistingStatic, $ptsExistingChooseFrom);
    }

    _isStaticKey(key) {
        return this._getStaticKeys_all().includes(key);
    }

    _hk_updatePtsExisting($ptsExistingStatic, $ptsExistingChoose) {
        const otherStates = this._featureSourceTracker ? this._featureSourceTracker.getStatesForKey(this._propGroup.propTracker, {
            ignore: this
        }) : null;

        const $ptsExistings = [$ptsExistingStatic, $ptsExistingChoose].filter(Boolean);

        this._getStaticKeys_all().forEach(prof=>{
            $ptsExistings.forEach($ptsExisting=>{
                if (!$ptsExisting[prof])
                    return;

                let maxExisting = this._existing?.[prof] || 0;

                if (otherStates)
                    otherStates.forEach(otherState=>maxExisting = Math.max(maxExisting, otherState[prof] || 0));

                if (maxExisting) {
                    const helpText = maxExisting === 1 ? `Proficient from Another Source` : maxExisting === 2 ? `Proficient with Expertise from Another Source` : `Half-Proficient from Another Source`;

                    $ptsExisting[prof].forEach($ptExisting=>{
                        $ptExisting.title(helpText).addClass("ml-1").html(`(<i class="fas fa-fw ${UtilActors.PROF_TO_ICON_CLASS[maxExisting]}"></i>)`);
                    }
                    );
                }
                else {
                    $ptsExisting[prof].forEach($ptExisting=>{
                        $ptExisting.title("").removeClass("ml-1").html("");
                    }
                    );
                }
            });
        });
    }

    _render_renderPtChooseFrom($stgGroup, profSet) {
        const count = profSet.choose.count || 1;

        const cpyProfSet = this.constructor._getSortedProfSet(profSet);

        const $ptsExisting = {};
        const multiChoiceMeta = ComponentUiUtil.getMetaWrpMultipleChoice(this, "proficiencyChoice", {
            count,
            values: cpyProfSet.choose.from,
            fnDisplay: profOrObj=>this._getMultiChoiceDisplay($ptsExisting, profOrObj),
        }, );

        let hkSetTrackerInfo = null;
        if (this._featureSourceTracker) {
            hkSetTrackerInfo = ()=>this._doSetTrackerState();
            this._addHookBase(multiChoiceMeta.propPulse, hkSetTrackerInfo);
        }

        $stgGroup.append(`<div class="mb-1">${this._getMultiChoiceTitle(cpyProfSet, count)}:</div>`);
        multiChoiceMeta.$ele.appendTo($stgGroup);

        this._lastMeta = {
            cleanup: ()=>{
                multiChoiceMeta.cleanup();
                if (hkSetTrackerInfo)
                    this._removeHookBase(multiChoiceMeta.propPulse, hkSetTrackerInfo);
            }
            ,
        };

        return $ptsExisting;
    }

    isNoChoice() {
        return this.constructor.isNoChoice(this._available);
    }

    _getFormData() {
        const out = {};

        const profSet = this._available[this._state.ixSet];

        const cpyProfSet = this.constructor._getSortedProfSet(profSet);

        this._getStaticKeys_all().filter(name=>cpyProfSet[name]).map(name=>out[name] = 1);

        if (cpyProfSet.choose) {
            const ixs = ComponentUiUtil.getMetaWrpMultipleChoice_getSelectedIxs(this, "proficiencyChoice");
            ixs.map(it=>cpyProfSet.choose.from[it]).forEach(name=>out[name] = 1);
        }

        return {
            isFormComplete: !!this._state[ComponentUiUtil.getMetaWrpMultipleChoice_getPropIsAcceptable("proficiencyChoice")],
            data: {
                [this._propGroup.prop]: out,
            },
        };
    }

    pGetFormData() {
        return this._getFormData();
    }

    _getDefaultState() {
        return {
            ixSet: 0,
        };
    }
}
class Charactermancer_ImmResVulnSelect extends BaseComponent {
    static async pGetUserInput(opts) {
        opts = opts || {};

        if (!opts.available)
            return {
                isFormComplete: true,
                data: {}
            };

        const comp = new this({
            ...opts,
            existing: this.getExisting(opts.existingFvtt),
            existingFvtt: opts.existingFvtt,
        });
        if (comp.isNoChoice())
            return comp.pGetFormData();

        return UtilApplications.pGetImportCompApplicationFormData({
            comp,
            isAutoResize: true
        });
    }

    static getExisting() {
        throw new TypeError(`Unimplemented!`);
    }

    static isNoChoice(available) {
        let cntChoices = 0;
        UtilDataConverter.WALKER_READONLY_GENERIC.walk(available, {
            object: (obj)=>{
                if (obj.choose)
                    cntChoices++;
            }
        });
        return cntChoices === 0;
    }

    constructor(opts) {
        opts = opts || {};
        super();

        this._existing = opts.existing;
        this._available = opts.available;
        this._prop = opts.prop;
        this._modalTitle = opts.modalTitle;
        this._titlePlural = opts.titlePlural;
        this._titleSingle = opts.titleSingle;

        this._lastChoiceMeta = null;

        Object.assign(this.__state.readonly_selectedValues, this._getOutputObject());
    }

    get modalTitle() {
        return this._modalTitle;
    }

    render($wrp) {
        this._lastChoiceMeta = {
            isActive: true,
            children: []
        };
        this._render_recurse($wrp, MiscUtil.copy(this._available), this._lastChoiceMeta, false);
    }

    _render_recurse($wrp, arr, outMeta, isChoices) {
        const arrStrings = arr.filter(it=>typeof it === "string").sort(SortUtil.ascSortLower);

        if (!isChoices) {
            const staticValues = arrStrings.map(it=>{
                outMeta.children.push({
                    isActive: true,
                    value: it
                });
                return it.toTitleCase();
            }
            );
            $wrp.append(`<div>${staticValues.join(", ")}</div>`);
        } else {
            arrStrings.forEach(it=>{
                const $cb = $(`<input type="checkbox" class="ml-1 mr-2">`).change(()=>{
                    if ($cb.prop("checked")) {
                        const numChecked = outMeta.children.filter(it=>it.isChoosable && it.isActive()).length;
                        if (numChecked > outMeta.count) {
                            const toDeActive = outMeta.lastChecked || outMeta.children.filter(it=>it.isChoosable).last();
                            toDeActive.setActive(false);
                        }
                        outMeta.lastChecked = node;
                    } else {
                        if (outMeta.lastChecked === node)
                            outMeta.lastChecked = null;
                    }

                    this._state.readonly_selectedValues = this._getOutputObject();
                }
                );

                const node = {
                    isActive: ()=>$cb.prop("checked") ? it : null,
                    value: it,
                    isChoosable: true,
                    setActive: (val)=>$cb.prop("checked", val),
                };
                outMeta.children.push(node);

                return $$`<label class="py-1 stripe-even ve-flex-v-center">
						${$cb}
						<span>${it.toTitleCase()}</span>
					</label>`.appendTo($wrp);
            }
            );
        }

        arr.filter(it=>typeof it !== "string").forEach((it,i)=>{
            if (!it.choose)
                throw new Error(`Unhandled immune/resist/vulnerability properties "${Object.keys(it).join(", ")}"`);

            if (isChoices) {

                const $btnSetActive = $(`<button class="btn btn-primary btn-5et btn-xs">Set Group Active</button>`).click(()=>{
                    outMeta.children.forEach(it=>it.isActive = false);
                    nxtMeta.isActive = true;
                    this._state.readonly_selectedValues = this._getOutputObject();
                }
                );

                const nxtMeta = {
                    isActive: false,
                    children: []
                };

                const $wrpChoice = $(`<div class="ve-flex-col my-1"></div>`);
                this._render_recurse($wrpChoice, it.choose.from, nxtMeta, true);

                $$`<div class="ve-flex-col pl-2 stripe-even">
						<div class="ve-flex-v-center my-1">${$btnSetActive}</div>
						${$wrpChoice}
					</div>`;

                return;
            }

            const count = it.choose.count || 1;
            const nxtMeta = {
                isActive: true,
                children: [],
                count,
                lastChecked: null
            };
            outMeta.children.push(nxtMeta);

            const $wrpChoice = $(`<div class="ve-flex-col py-1 pt-0">
					${arrStrings.length || i > 0 ? `<hr class="hr-2 hr--dotted">` : ""}
					<div class="py-1">Choose ${count} ${count === 1 ? this._titleSingle : this._titlePlural}:</div>
				</div>`).appendTo($wrp);
            this._render_recurse($wrpChoice, it.choose.from, nxtMeta, true);
        }
        );
    }

    isNoChoice() {
        return this.constructor.isNoChoice(this._available);
    }

    _getOutputSet() {
        const outSet = new Set(this._existing[this._prop] || []);
        if (this._lastChoiceMeta)
            this._getOutputSet_recurse(outSet, this._lastChoiceMeta);
        else
            UtilDataConverter.WALKER_READONLY_GENERIC.walk(this._available, {
                string: (str)=>{
                    outSet.add(str);
                }
            });

        return outSet;
    }

    _getOutputSet_recurse(outSet, node) {
        if (!node.isActive)
            return;
        const isNodeActive = node.isActive === true || node.isActive();
        if (!isNodeActive)
            return;

        if (node.value)
            outSet.add(node.value);
        if (node.children)
            node.children.forEach(it=>this._getOutputSet_recurse(outSet, it));
    }

    _getOutputObject() {
        return [...this._getOutputSet()].sort(SortUtil.ascSortLower).mergeMap(it=>({
            [it]: true
        }));
    }

    pGetFormData() {
        let isFormComplete = true;

        return {
            isFormComplete,
            data: {
                [this._prop]: MiscUtil.copy(this._state.readonly_selectedValues),
            },
        };
    }

    _getDefaultState() {
        return {
            readonly_selectedValues: {},
        };
    }
}

class Charactermancer_DamageImmunitySelect extends Charactermancer_ImmResVulnSelect {
    static getExisting(existingFvtt) {
        return MiscUtil.copy([existingFvtt?.immune?.value || []]);
    }

    constructor(opts) {
        opts = opts || {};
        super({
            ...opts,
            modalTitle: `Damage Immunities`,
            titlePlural: `Damage Immunities`,
            titleSingle: `Damage Immunity`,
            prop: "immune",
        });
    }
}

class Charactermancer_DamageResistanceSelect extends Charactermancer_ImmResVulnSelect {
    static getExisting(existingFvtt) {
        return MiscUtil.copy([existingFvtt?.resist?.value || []]);
    }

    constructor(opts) {
        opts = opts || {};
        super({
            ...opts,
            modalTitle: `Damage Resistances`,
            titlePlural: `Damage Resistances`,
            titleSingle: `Damage Resistance`,
            prop: "resist",
        });
    }
}

class Charactermancer_DamageVulnerabilitySelect extends Charactermancer_ImmResVulnSelect {
    static getExisting(existingFvtt) {
        return MiscUtil.copy([existingFvtt?.vulnerable?.value || []]);
    }

    constructor(opts) {
        opts = opts || {};
        super({
            ...opts,
            modalTitle: `Damage Vulnerabilities`,
            titlePlural: `Damage Vulnerabilities`,
            titleSingle: `Damage Vulnerability`,
            prop: "vulnerable",
        });
    }
}

class Charactermancer_ConditionImmunitySelect extends Charactermancer_ImmResVulnSelect {
    static getExisting(existingFvtt) {
        return [existingFvtt?.conditionImmune?.value || []].map(it=>it === "diseased" ? "disease" : it);
    }

    constructor(opts) {
        opts = opts || {};
        super({
            ...opts,
            modalTitle: `Condition Immunities`,
            titlePlural: `Condition Immunities`,
            titleSingle: `Condition Immunity`,
            prop: "conditionImmune",
        });
    }
}

class Charactermancer_ExpertiseSelect extends Charactermancer_SkillSaveProficiencySelect {
    constructor(opts) {
        super({
            ...opts,
            propGroup: new Charactermancer_ProficiencySelect.PropGroup({
                prop: "expertise",
                propTrackerPulse: "pulseExpertise",
                propTracker: "expertise",
            }),
            modalTitle: "Expertise",
            title: "Expertise",
            titlePlural: "Expertise",
        });
    }
    
    static getExisting(existingFvtt) {
        const existingSkills = Object.entries(Charactermancer_OtherProficiencySelect.getExisting({
            skillProficiencies: existingFvtt.skillProficiencies
        })?.skillProficiencies || {}).filter(([,profLevel])=>Number(profLevel) === 2).mergeMap(([prof,profLevel])=>({
            [prof]: profLevel
        }));

        const existingTools = Object.entries(Charactermancer_OtherProficiencySelect.getExisting({
            skillProficiencies: existingFvtt.toolProficiencies
        })?.toolProficiencies || {}).filter(([,profLevel])=>Number(profLevel) === 2).mergeMap(([prof,profLevel])=>({
            [prof]: profLevel
        }));

        return {
            ...existingSkills,
            ...existingTools
        };
    }

    static getExistingFvttFromActor(actor) {
        return {
            skillProficiencies: MiscUtil.get(actor, "_source", "system", "skills"),
            toolProficiencies: MiscUtil.get(actor, "_source", "system", "tools"),
        };
    }

    static isNoChoice(available) {
        if (!available?.length)
            return true;
        return available.length === 1 && !available[0].choose && !available[0].anyProficientSkill && !available[0].anyProficientTool;
    }

    

    _getStaticDisplay(key, {isPlainText=false}={}) {
        if (isPlainText)
            return key.toTitleCase();

        if (Parser.SKILL_TO_ATB_ABV[key])
            return Renderer.get().render(`{@skill ${key.toTitleCase()}}`);
        return key.toTitleCase();
    }

    _getNonStaticDisplay(key, value, {isPlainText=false}={}) {
        switch (key) {
        case "anyProficientSkill":
            return `Choose ${value || 1} existing skill ${value > 1 ? "proficiencies" : "proficiency"}`;
        case "anyProficientTool":
            return `Choose ${value || 1} existing tool ${value > 1 ? "proficiencies" : "proficiency"}`;
        default:
            return super._getNonStaticDisplay(key, value, {
                isPlainText
            });
        }
    }

    _getStaticKeys_all() {
        return this._available.map(profSet=>this._getStaticKeys_profSet({
            profSet
        })).flat().unique();
    }

    _getStaticKeys_profSet({profSet=null}={}) {
        profSet = profSet || this._available[this._state.ixSet];
        return Object.keys(profSet).filter(it=>this._isStaticKey(it));
    }

    _isStaticKey(key) {
        return !["anyProficientSkill", "anyProficientTool"].includes(key);
    }

    _isSkillKey(key) {
        return key === "anyProficientSkill" || Object.keys(Parser.SKILL_TO_ATB_ABV).includes(key);
    }

    _hk_ixSet_renderPts(profSet) {
        this._lastMeta = {
            cleanup: ()=>{
                this._lastMeta._fnsCleanup.forEach(fn=>fn());
            }
            ,
            _fnsCleanup: [],
        };

        const $ptsExistingStatic = Object.keys(profSet).some(it=>this._isStaticKey(it)) ? this._render_renderPtStatic(this._$stgGroup, profSet) : null;
        let needsHr = $ptsExistingStatic != null;

        if (needsHr && profSet.anyProficientSkill) {
            needsHr = false;
            this._$stgGroup.append(`<hr class="hr-2 hr--dotted">`);
        }
        const $ptsExistingChooseAnyProficientSkill = profSet.anyProficientSkill ? this._render_renderPtChooseAnyProficientSkill(this._$stgGroup, profSet) : null;
        needsHr = needsHr || $ptsExistingChooseAnyProficientSkill != null;

        if (needsHr && profSet.anyProficientTool) {
            needsHr = false;
            this._$stgGroup.append(`<hr class="hr-2 hr--dotted">`);
        }
        const $ptsExistingChooseAnyProficientTool = profSet.anyProficientTool ? this._render_renderPtChooseAnyProficientTool(this._$stgGroup, profSet) : null;

        this._hkUpdateExisting = ()=>this._hk_updatePtsExisting($ptsExistingStatic, $ptsExistingChooseAnyProficientSkill, $ptsExistingChooseAnyProficientTool);
    }

    _getProps(prop, ix) {
        return {
            propAnyProficientSkill: `${prop}_ix_skill_${ix}`,
            propAnyProficientTool: `${prop}_ix_tool_${ix}`,
        };
    }

    _render_$getPtExisting() {
        return $(`<div class="ve-small veapp__msg-warning inline-block ml-1 no-shrink" title="Expertise from Another Source">(<i class="fas fa-fw ${UtilActors.PROF_TO_ICON_CLASS[2]}"></i>)</div>`);
    }

    _render_renderPtStatic($stgGroup, profSet) {
        const $ptsExisting = [];

        const profList = this._getStaticKeys_profSet().filter(key=>profSet[key]);

        const $wrps = profList.map((it,i)=>{
            const $ptExisting = this._render_$getPtExisting();

            $ptsExisting.push({
                prof: it,
                $ptExisting,
            });

            const isNotLast = i < profList.length - 1;
            return $$`<div class="inline-block ${isNotLast ? "mr-1" : ""}">${this._getStaticDisplay(it)}${$ptExisting}${isNotLast ? `,` : ""}</div>`;
        }
        );

        $$`<div class="block">
			${$wrps}
		</div>`.appendTo($stgGroup);

        return $ptsExisting;
    }

    _render_renderPtChooseAnyProficientSkill($stgGroup, profSet) {
        return this._render_renderPtChooseAnyProficient({
            $stgGroup,
            profSet,
            propProfSet: "anyProficientSkill",
            propIxProps: "propAnyProficientSkill",
            fnGetValues: this._getAvailableSkills.bind(this),
            propPulse: "pulseSkillProficiencies",
            titleRow: "Existing Skill",
        });
    }

    _render_renderPtChooseAnyProficientTool($stgGroup, profSet) {
        return this._render_renderPtChooseAnyProficient({
            $stgGroup,
            profSet,
            propProfSet: "anyProficientTool",
            propIxProps: "propAnyProficientTool",
            fnGetValues: this._getAvailableTools.bind(this),
            propPulse: "pulseToolProficiencies",
            titleRow: "Existing Tool",
        });
    }

    _render_renderPtChooseAnyProficient({$stgGroup, profSet, propProfSet, propIxProps, fnGetValues, propPulse, titleRow, }, ) {
        const numChoices = Number(profSet[propProfSet] || 1);

        const $wrp = $(`<div class="ve-flex-col"></div>`).appendTo($stgGroup);

        const $ptsExisting = [];

        for (let i = 0; i < numChoices; ++i) {
            const ixProps = this._getProps(propProfSet, i);

            const selMeta = ComponentUiUtil.$getSelEnum(this, ixProps[propIxProps], {
                values: fnGetValues(),
                isAllowNull: true,
                asMeta: true,
                fnDisplay: it=>it.toTitleCase(),
            }, );
            this._lastMeta._fnsCleanup.push(selMeta.unhook);

            const $ptExisting = this._render_$getPtExisting();
            $ptsExisting.push({
                prop: ixProps[propIxProps],
                $ptExisting,
            });

            const hk = ()=>selMeta.setValues(fnGetValues(), {
                isResetOnMissing: true
            });
            if (this._featureSourceTracker) {
                this._featureSourceTracker.addHook(this, propPulse, hk);
                this._lastMeta._fnsCleanup.push(()=>this._featureSourceTracker.removeHook(this, propPulse, hk));

                const hkSetTrackerInfo = ()=>this._doSetTrackerState();
                this._addHookBase(ixProps[propIxProps], hkSetTrackerInfo);
                this._lastMeta._fnsCleanup.push(()=>this._removeHookBase(ixProps[propIxProps], hkSetTrackerInfo));
            }
            hk();

            this._lastMeta._fnsCleanup.push(()=>delete this._state[ixProps[propIxProps]]);

            $$`<div class="ve-flex-v-center ${i ? "mt-2" : ""}">
					<div class="mr-2 no-wrap">${titleRow}:</div>
					${selMeta.$sel}
					${$ptExisting}
				</div>`.appendTo($wrp);
        }

        return $ptsExisting;
    }

    _getAvailableSkills() {
        return this._getAvailableByType({
            propExistingFvtt: "skillProficiencies",
            propFeatureTracker: "skillProficiencies",
        });
    }

    _getAvailableTools() {
        return this._getAvailableByType({
            propExistingFvtt: "toolProficiencies",
            propFeatureTracker: "toolProficiencies",
        });
    }

    _getAvailableByType({propExistingFvtt, propFeatureTracker, }, ) {
        //Read existing proficencies on the foundry character
       /*  const existingAnyProfLevel = Charactermancer_OtherProficiencySelect.getExisting({
            [propExistingFvtt]: this._existingFvtt[propExistingFvtt],
        });
        const out = new Set(Object.entries(existingAnyProfLevel[propExistingFvtt]).filter(([,profLevel])=>profLevel >= 1).map(([prof])=>prof)); */

        const out = new Set();
        if (this.featureSourceTracker) { //this is a Charactermancer_FeatureSourceTracker
            (this.featureSourceTracker.getStatesForKey(propFeatureTracker, {
                ignore: this
            }) || []).forEach(otherState=>{
                Object.entries(otherState).filter(([,isAvailable])=>isAvailable).forEach(([prof])=>out.add(prof));
            });
        }
        else{
            console.error("No FeatureSourceTracker provided. Could not read existing proficiencies and learn what expertise options are available");
        }

        return [...out].sort(SortUtil.ascSortLower);
    }

    _hk_updatePtsExisting($ptsExistingStatic, $ptsExistingChooseAnyProficientSkill, $ptsExistingChooseAnyProficientTool) {
        const otherStates = this._featureSourceTracker ? this._featureSourceTracker.getStatesForKey(this._propGroup.propTracker, {
            ignore: this
        }) : null;

        const ptsExistingMetas = [$ptsExistingStatic, $ptsExistingChooseAnyProficientSkill, $ptsExistingChooseAnyProficientTool].filter(Boolean).flat();

        ptsExistingMetas.forEach(ptExistingMeta=>{
            const prof = ptExistingMeta.prof ?? this._state[ptExistingMeta.prop];

            if (prof == null) {
                ptExistingMeta.$ptExisting.hideVe();
                return;
            }

            let maxExisting = this._existing?.[prof] || 0;

            if (otherStates)
                otherStates.forEach(otherState=>maxExisting = Math.max(maxExisting, otherState[prof] || 0));

            ptExistingMeta.$ptExisting.toggleVe(maxExisting === 2);
        }
        );
    }

    _doSetTrackerState() {
        const formData = this._getFormData();
        this._featureSourceTracker.setState(this, {
            [this._propGroup.propTracker]: formData.data?.[this._propGroup.prop],
            "skillProficiencies": formData.data?.skillProficiencies,
            "toolProficiencies": formData.data?.toolProficiencies,
        });
    }

    _getFormData() {
        const outSkills = {};
        const outTools = {};
        const outExpertise = {};

        let isFormComplete = true;

        const profSet = this._available[this._state.ixSet];

        Object.entries(profSet).forEach(([k,v])=>{
            if (k === "anyProficientSkill" || k === "anyProficientTool") {
                const numChoices = Number(v || 1);
                for (let i = 0; i < numChoices; ++i) {
                    const {propAnyProficientSkill, propAnyProficientTool} = this._getProps(k, i);
                    const prop = this._isSkillKey(k) ? propAnyProficientSkill : propAnyProficientTool;
                    const chosenProf = this._state[prop];
                    if (chosenProf == null) {
                        isFormComplete = false;
                        continue;
                    }
                    (this._isSkillKey(k) ? outSkills : outTools)[chosenProf] = outExpertise[chosenProf] = 2;
                }
                return;
            }

            (this._isSkillKey(k) ? outSkills : outTools)[k] = outExpertise[k] = 2;
        });

        return {
            isFormComplete,
            data: {
                skillProficiencies: outSkills,
                toolProficiencies: outTools,
                expertise: outExpertise,
            },
        };
    }

    pGetFormData() {
        return this._getFormData();
    }

    _getDefaultState() {
        return {
            ixSet: 0,
        };
    }

    /**
     * @returns {Charactermancer_FeatureSourceTracker}
     */
    get featureSourceTracker(){
        return this._featureSourceTracker;
    }
}

class Charactermancer_ResourceSelect extends BaseComponent {
    static isNoChoice() {
        return true;
    }

    static async pApplyFormDataToActor(actor, formData) {
        if (!formData?.data?.length)
            return;

        const itemLookup = {};
        actor.items.contents.forEach(it=>itemLookup[it.name.toLowerCase().trim()] = it);

        const toCreate = [];

        formData.data.forEach(res=>{
            const existing = itemLookup[res.name.toLowerCase().trim()];

            if (existing)
                return;

            toCreate.push({
                name: res.name,
                type: "feat",
                data: this._getItemDataData({
                    res
                }),
                img: this._getItemDataImg({
                    res
                }),
            });
        }
        );

        await UtilDocuments.pCreateEmbeddedDocuments(actor, toCreate, {
            ClsEmbed: Item,
            isRender: false,
        }, );
    }

    render() {}

    static _getItemDataData({res}) {
        switch (res.type) {
        case "dicePool":
            return this._getItemDataData_dicePool({
                res
            });
        default:
            throw new Error(`Unhandled resource type "${res.type}"`);
        }
    }

    static _getItemDataData_dicePool({res}) {
        return {
            actionType: "other",
            formula: `${res.number}d${res.faces}`,
            activation: {
                type: "special",
            },
            uses: {
                value: 0,
                max: res.count,
                per: UtilDataConverter.getFvttUsesPer(res.recharge),
            },
        };
    }

    static _IMAGES = {
        "Superiority Die": `icons/sundries/gaming/dice-runed-brown.webp`,
        "Psionic Energy Die": "icons/sundries/gaming/dice-pair-white-green.webp",
    };
    static _getItemDataImg({res}) {
        if (this._IMAGES[res.name])
            return this._IMAGES[res.name];

        if (/\b(?:dice|die)\b/i.test((res.name || "")))
            return `icons/sundries/gaming/dice-runed-brown.webp`;

        return `modules/${SharedConsts.MODULE_ID}/media/icon/mighty-force.svg`;
    }

    constructor({resources, className, classSource, subclassShortName, subclassSource}) {
        super();
        this._resources = resources;
        this._className = className;
        this._classSource = classSource;
        this._subclassShortName = subclassShortName;
        this._subclassSource = subclassSource;

        this._mappedResources = this._getMappedResources();
    }

    _getMappedResources() {
        return (this._resources || []).map(res=>{
            switch (res.type) {
            case "dicePool":
                return this._getMappedResources_dicePool({
                    res
                });
            default:
                throw new Error(`Unhandled resource type "${res.type}"`);
            }
        }
        );
    }

    _getMappedResources_dicePool({res}) {
        res = MiscUtil.copy(res);
        res.number = this._getMappedResources_getReplacedVars(res.number || 1);
        res.faces = this._getMappedResources_getReplacedVars(res.faces);
        res.count = this._getMappedResources_getReplacedVars(res.count || 1);
        return res;
    }

    _getMappedResources_getReplacedVars(val) {
        return `${val}`.replace(/\bPB\b/g, "@attributes.prof").replace(/<\$(?<variable>[^$]+)\$>/g, (...m)=>{
            switch (m.last().variable) {
            case "level":
                return `@classes.${Parser.stringToSlug(this._className || "unknown")}.levels`;
            default:
                return m[0];
            }
        }
        );
    }

    pGetFormData() {
        return {
            isFormComplete: true,
            data: MiscUtil.copy(this._mappedResources || []),
        };
    }
}

class Charactermancer_SenseSelect extends BaseComponent {
    static isNoChoice() {
        return true;
    }

    static getExistingFvttFromActor(actor) {
        return {
            senses: MiscUtil.get(actor, "_source", "system", "attributes", "senses"),
        };
    }

    static getExisting(existingFvtt) {
        return Object.keys(CONFIG.DND5E.senses).filter(sense=>existingFvtt?.senses[sense]).mergeMap(sense=>({
            [sense]: existingFvtt?.senses[sense]
        }));
    }

    render() {}

    constructor({senses, existing, existingFvtt}) {
        super();
        this._senses = senses;
        this._existing = existing;
        this._existingFvtt = existingFvtt;
    }

    static getFormDataFromRace(race) {
        return {
            isFormComplete: true,
            data: {
                darkvision: race.darkvision,
                blindsight: race.blindsight,
                truesight: race.truesight,
                tremorsense: race.tremorsense,
            },
        };
    }

    pGetFormData() {
        return {
            isFormComplete: true,
            data: MiscUtil.copy(this._senses[0] || {}),
        };
    }
}

/**
 * This component handles choices presented by class features and feats.
 * It can create several sub-components that handle specific choices like expertise, language proficiencies, etc
 * The state information is kept within these sub-components themselves.
 */
class Charactermancer_FeatureOptionsSelect extends BaseComponent {
    constructor(opts) {
        super();

        this._optionsSet = opts.optionsSet;
        this._actor = opts.actor;
        this._level = opts.level;
        this._existingFeatureChecker = opts.existingFeatureChecker;
        this._featureSourceTracker = opts.featureSourceTracker;
        this._isModal = !!opts.isModal;
        this._modalFilterSpells = opts.modalFilterSpells;
        this._isSkipCharactermancerHandled = !!opts.isSkipCharactermancerHandled;
        this._isSkipRenderingFirstFeatureTitle = !!opts.isSkipRenderingFirstFeatureTitle;

        if (this._isOptions()) {
            this._optionsSet.sort((a,b)=>SortUtil.ascSortLower(a.entity.name, b.entity.name)
            || SortUtil.ascSortLower(Parser.sourceJsonToAbv(a.entity.source), Parser.sourceJsonToAbv(b.entity.source)));
        }

        this._lastMeta = null;
        this._lastSubMetas = [];

        this._subCompsSkillToolLanguageProficiencies = [];
        this._subCompsSkillProficiencies = [];
        this._subCompsLanguageProficiencies = [];
        this._subCompsToolProficiencies = [];
        this._subCompsWeaponProficiencies = [];
        this._subCompsArmorProficiencies = [];
        this._subCompsSavingThrowProficiencies = [];
        this._subCompsDamageImmunities = [];
        this._subCompsDamageResistances = [];
        this._subCompsDamageVulnerabilities = [];
        this._subCompsConditionImmunities = [];
        this._subCompsExpertise = [];
        this._subCompsResources = [];
        this._subCompsSenses = [];
        this._subCompsAdditionalSpells = [];

        //Arrays to store previous sub-components. We will pull state from them when creating new ones at re-render
        this._prevSubCompsSkillToolLanguageProficiencies = null;
        this._prevSubCompsSkillProficiencies = null;
        this._prevSubCompsLanguageProficiencies = null;
        this._prevSubCompsToolProficiencies = null;
        this._prevSubCompsWeaponProficiencies = null;
        this._prevSubCompsArmorProficiencies = null;
        this._prevSubCompsSavingThrowProficiencies = null;
        this._prevSubCompsDamageImmunities = [];
        this._prevSubCompsDamageResistances = [];
        this._prevSubCompsDamageVulnerabilities = [];
        this._prevSubCompsConditionImmunities = [];
        this._prevSubCompsExpertise = [];
        this._prevSubCompsResources = [];
        this._prevSubCompsSenses = null;
        this._prevSubCompsAdditionalSpells = null;
    }

    /**
     * @returns {string[]}
     */
    get allSubComponentNames(){
        return [
            "_subCompsSkillToolLanguageProficiencies",
            "_subCompsSkillProficiencies",
            "_subCompsLanguageProficiencies",
            "_subCompsToolProficiencies",
            "_subCompsWeaponProficiencies",
            "_subCompsArmorProficiencies",
            "_subCompsSavingThrowProficiencies",
            "_subCompsDamageImmunities",
            "_subCompsDamageResistances",
            "_subCompsDamageVulnerabilities",
            "_subCompsConditionImmunities",
            "_subCompsExpertise",
            "_subCompsResources",
            "_subCompsSenses",
            "_subCompsAdditionalSpells",
        ];
    }
     /**
     * @returns {BaseComponent[]}
     */
    allSubComponents(){
        const names = this.allSubComponentNames;
        let arr = [];
        for(let n of names){
            let a = this[n];
            if(a && a.length > 0){arr = arr.concat(a);}
        }
        return arr;
    }

    render($wrp) {
        const $stgSubChoiceData = $$`<div class="w-100 ve-flex-col mt-2"></div>`.hideVe();
        this.$stgSubChoiceData = $stgSubChoiceData; //need this to be publicly accessible so we can call _render_pHkIxsChosen elsewhere 

        this._render_options();

        $$`<div class="ve-flex-col min-h-0 overflow-y-auto">
			${this._lastMeta?.$ele}
			${$stgSubChoiceData}
		</div>`.appendTo($wrp);

        this._addHookBase(ComponentUiUtil.getMetaWrpMultipleChoice_getPropPulse("ixsChosen"), ()=>this._render_pHkIxsChosen({
            $stgSubChoiceData
        }), );

        return this._render_pHkIxsChosen({$stgSubChoiceData});
    }

    async pRender($wrp) {
        return this.render($wrp);
    }

    async _render_pHkIxsChosen({$stgSubChoiceData}) {
        try {
            await this._pLock("ixsChosen");
            await this._render_pHkIxsChosen_({ $stgSubChoiceData });
        }
        finally { this._unlock("ixsChosen"); }
    }

    async _render_pHkIxsChosen_({$stgSubChoiceData}) {
        const {prefixSubComps} = this._getProps();
        Object.keys(this._state).filter(k=>k.startsWith(prefixSubComps)).forEach(k=>delete this._state[k]);

        const selectedLoadeds = this._getSelectedLoadeds();

        //If no loadeds are found, just don't render any subcomponents
        if (!selectedLoadeds.length){return this._render_noSubChoices({ $stgSubChoiceData });}

        const isSubChoiceForceDisplay = await this._pIsSubChoiceForceDisplay(selectedLoadeds);
        const isSubChoiceAvailable = await this._pIsSubChoiceAvailable(selectedLoadeds);
        //Or if no choices are available for display, also dont render any subcomponents
        if (!isSubChoiceForceDisplay && !isSubChoiceAvailable){return this._render_noSubChoices({ $stgSubChoiceData });}

        $stgSubChoiceData.empty();
        this._unregisterSubComps();

        //TEMPFIX
        const sideDataRaws = null;//await this._pGetLoadedsSideDataRaws(selectedLoadeds);
        const ptrIsFirstSection = {_: true };

        for (let i = 0; i < selectedLoadeds.length; ++i) {
            const loaded = selectedLoadeds[i];

            if (!(await this._pIsSubChoiceForceDisplay([selectedLoadeds[i]]) || await this._pIsSubChoiceAvailable([selectedLoadeds[i]])))
                continue;
            
            //TEMPFIX
            const isSubChoice_sideDataChooseSystem = false; //await this._pHasChoiceInSideData_chooseSystem([selectedLoadeds[i]]);
            const isSubChoice_sideDataChooseFlags = false; //await this._pHasChoiceInSideData_chooseFlags([selectedLoadeds[i]]);

            //Check if force display
            const isForceDisplay_entryDataSkillToolLanguageProficiencies = await this._pIsForceDisplay_skillToolLanguageProficiencies([selectedLoadeds[i]]);
            const isForceDisplay_entryDataSkillProficiencies = await this._pIsForceDisplay_skillProficiencies([selectedLoadeds[i]]);
            const isForceDisplay_entryDataLanguageProficiencies = await this._pIsForceDisplay_languageProficiencies([selectedLoadeds[i]]);
            const isForceDisplay_entryDataToolProficiencies = await this._pIsForceDisplay_toolProficiencies([selectedLoadeds[i]]);
            const isForceDisplay_entryDataWeaponProficiencies = await this._pIsForceDisplay_weaponProficiencies([selectedLoadeds[i]]);
            const isForceDisplay_entryDataArmorProficiencies = await this._pIsForceDisplay_armorProficiencies([selectedLoadeds[i]]);
            const isForceDisplay_entryDataSavingThrowProficiencies = await this._pIsForceDisplay_savingThrowProficiencies([selectedLoadeds[i]]);
            const isForceDisplay_entryDataDamageImmunities = await this._pIsForceDisplay_damageImmunities([selectedLoadeds[i]]);
            const isForceDisplay_entryDataDamageResistances = await this._pIsForceDisplay_damageResistances([selectedLoadeds[i]]);
            const isForceDisplay_entryDataDamageVulnerabilities = await this._pIsForceDisplay_damageVulnerabilities([selectedLoadeds[i]]);
            const isForceDisplay_entryDataConditionImmunities = await this._pIsForceDisplay_conditionImmunities([selectedLoadeds[i]]);
            const isForceDisplay_entryDataExpertise = await this._pIsForceDisplay_expertise([selectedLoadeds[i]]);
            const isForceDisplay_entryDataResources = await this._pIsForceDisplay_resources([selectedLoadeds[i]]);
            const isForceDisplay_entryDataSenses = await this._pIsForceDisplay_senses([selectedLoadeds[i]]);
            const isForceDisplay_entryDataAdditionalSpells = await this._pIsForceDisplay_additionalSpells([selectedLoadeds[i]]);

            //Check if available
            const isAvailable_entryDataSkillToolLanguageProficiencies = await this._pIsAvailable_skillToolLanguageProficiencies([selectedLoadeds[i]]);
            const isAvailable_entryDataSkillProficiencies = await this._pIsAvailable_skillProficiencies([selectedLoadeds[i]]);
            const isAvailable_entryDataLanguageProficiencies = await this._pIsAvailable_languageProficiencies([selectedLoadeds[i]]);
            const isAvailable_entryDataToolProficiencies = await this._pIsAvailable_toolProficiencies([selectedLoadeds[i]]);
            const isAvailable_entryDataWeaponProficiencies = await this._pIsAvailable_weaponProficiencies([selectedLoadeds[i]]);
            const isAvailable_entryDataArmorProficiencies = await this._pIsAvailable_armorProficiencies([selectedLoadeds[i]]);
            const isAvailable_entryDataSavingThrowProficiencies = await this._pIsAvailable_savingThrowProficiencies([selectedLoadeds[i]]);
            const isAvailable_entryDataDamageImmunities = await this._pIsAvailable_damageImmunities([selectedLoadeds[i]]);
            const isAvailable_entryDataDamageResistances = await this._pIsAvailable_damageResistances([selectedLoadeds[i]]);
            const isAvailable_entryDataDamageVulnerabilities = await this._pIsAvailable_damageVulnerabilities([selectedLoadeds[i]]);
            const isAvailable_entryDataConditionImmunities = await this._pIsAvailable_conditionImmunities([selectedLoadeds[i]]);
            const isAvailable_entryDataExpertise = await this._pIsAvailable_expertise([selectedLoadeds[i]]);
            const isAvailable_entryDataResources = await this._pIsAvailable_resources([selectedLoadeds[i]]);
            const isAvailable_entryDataSenses = await this._pIsAvailable_senses([selectedLoadeds[i]]);
            const isAvailable_entryDataAdditionalSpells = await this._pIsAvailable_additionalSpells([selectedLoadeds[i]]);

            const {entity, type} = loaded;

            if (i !== 0 || !this._isSkipRenderingFirstFeatureTitle)
                $stgSubChoiceData.append(this._render_getSubCompTitle(entity));

            //Try to render any subcomponent possible (will self-cancel if requirements are not met)

            //TEMPFIX
           /*  if (isSubChoice_sideDataChooseSystem) {
                const sideDataRaw = sideDataRaws[i];
                if (sideDataRaw?.chooseSystem) {
                    ptrIsFirstSection._ = false;
                    this._render_renderSubComp_chooseSystem(i, $stgSubChoiceData, entity, type, sideDataRaw);
                }
            }

            if (isSubChoice_sideDataChooseFlags) {
                const sideDataRaw = sideDataRaws[i];
                if (sideDataRaw?.chooseFlags) {
                    ptrIsFirstSection._ = false;
                    this._render_renderSubComp_chooseFlags(i, $stgSubChoiceData, entity, type, sideDataRaw);
                }
            } */

            this._render_pHkIxsChosen_comp({
                ix: i,
                $stgSubChoiceData,
                selectedLoadeds,
                propSubComps: "_subCompsSkillToolLanguageProficiencies",
                propPrevSubComps: "_prevSubCompsSkillToolLanguageProficiencies",
                isAvailable: isAvailable_entryDataSkillToolLanguageProficiencies,
                isForceDisplay: isForceDisplay_entryDataSkillToolLanguageProficiencies,
                prop: "skillToolLanguageProficiencies",
                ptrIsFirstSection,
                CompClass: Charactermancer_OtherProficiencySelect,
                fnGetExistingFvtt: Charactermancer_OtherProficiencySelect.getExistingFvttFromActor.bind(Charactermancer_OtherProficiencySelect),
                fnSetComp: this._render_pHkIxsChosen_setCompOtherProficiencies.bind(this),
            });

            this._render_pHkIxsChosen_comp({
                ix: i,
                $stgSubChoiceData,
                selectedLoadeds,
                propSubComps: "_subCompsSkillProficiencies",
                propPrevSubComps: "_prevSubCompsSkillProficiencies",
                isAvailable: isAvailable_entryDataSkillProficiencies,
                isForceDisplay: isForceDisplay_entryDataSkillProficiencies,
                prop: "skillProficiencies",
                title: "Skill Proficiencies",
                ptrIsFirstSection,
                CompClass: Charactermancer_OtherProficiencySelect,
                propPathActorExistingProficiencies: ["system", "skills"],
                fnSetComp: this._render_pHkIxsChosen_setCompOtherProficiencies.bind(this),
                fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedSkillProficiencies.bind(Charactermancer_OtherProficiencySelect),
            });

            this._render_pHkIxsChosen_comp({
                ix: i,
                $stgSubChoiceData,
                selectedLoadeds,
                propSubComps: "_subCompsLanguageProficiencies",
                propPrevSubComps: "_prevSubCompsLanguageProficiencies",
                isAvailable: isAvailable_entryDataLanguageProficiencies,
                isForceDisplay: isForceDisplay_entryDataLanguageProficiencies,
                prop: "languageProficiencies",
                title: "Language Proficiencies",
                ptrIsFirstSection,
                CompClass: Charactermancer_OtherProficiencySelect,
                propPathActorExistingProficiencies: ["system", "traits", "languages"],
                fnSetComp: this._render_pHkIxsChosen_setCompOtherProficiencies.bind(this),
                fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedLanguageProficiencies.bind(Charactermancer_OtherProficiencySelect),
            });

            this._render_pHkIxsChosen_comp({
                ix: i,
                $stgSubChoiceData,
                selectedLoadeds,
                propSubComps: "_subCompsToolProficiencies",
                propPrevSubComps: "_prevSubCompsToolProficiencies",
                isAvailable: isAvailable_entryDataToolProficiencies,
                isForceDisplay: isForceDisplay_entryDataToolProficiencies,
                prop: "toolProficiencies",
                title: "Tool Proficiencies",
                ptrIsFirstSection,
                CompClass: Charactermancer_OtherProficiencySelect,
                propPathActorExistingProficiencies: ["system", "tools"],
                fnSetComp: this._render_pHkIxsChosen_setCompOtherProficiencies.bind(this),
                fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedToolProficiencies.bind(Charactermancer_OtherProficiencySelect),
            });

            this._render_pHkIxsChosen_comp({
                ix: i,
                $stgSubChoiceData,
                selectedLoadeds,
                propSubComps: "_subCompsWeaponProficiencies",
                propPrevSubComps: "_prevSubCompsWeaponProficiencies",
                isAvailable: isAvailable_entryDataWeaponProficiencies,
                isForceDisplay: isForceDisplay_entryDataWeaponProficiencies,
                prop: "weaponProficiencies",
                title: "Weapon Proficiencies",
                ptrIsFirstSection,
                CompClass: Charactermancer_OtherProficiencySelect,
                propPathActorExistingProficiencies: ["system", "traits", "weaponProf"],
                fnSetComp: this._render_pHkIxsChosen_setCompOtherProficiencies.bind(this),
                fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedWeaponProficiencies.bind(Charactermancer_OtherProficiencySelect),
            });

            this._render_pHkIxsChosen_comp({
                ix: i,
                $stgSubChoiceData,
                selectedLoadeds,
                propSubComps: "_subCompsArmorProficiencies",
                propPrevSubComps: "_prevSubCompsArmorProficiencies",
                isAvailable: isAvailable_entryDataArmorProficiencies,
                isForceDisplay: isForceDisplay_entryDataArmorProficiencies,
                prop: "armorProficiencies",
                title: "Armor Proficiencies",
                ptrIsFirstSection,
                CompClass: Charactermancer_OtherProficiencySelect,
                propPathActorExistingProficiencies: ["system", "traits", "armorProf"],
                fnSetComp: this._render_pHkIxsChosen_setCompOtherProficiencies.bind(this),
                fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedArmorProficiencies.bind(Charactermancer_OtherProficiencySelect),
            });

            this._render_pHkIxsChosen_comp({
                ix: i,
                $stgSubChoiceData,
                selectedLoadeds,
                propSubComps: "_subCompsSavingThrowProficiencies",
                propPrevSubComps: "_prevSubCompsSavingThrowProficiencies",
                isAvailable: isAvailable_entryDataSavingThrowProficiencies,
                isForceDisplay: isForceDisplay_entryDataSavingThrowProficiencies,
                prop: "savingThrowProficiencies",
                title: "Saving Throw Proficiencies",
                ptrIsFirstSection,
                CompClass: Charactermancer_OtherProficiencySelect,
                propPathActorExistingProficiencies: ["system", "abilities"],
                fnSetComp: this._render_pHkIxsChosen_setCompOtherProficiencies.bind(this),
                fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedSavingThrowProficiencies.bind(Charactermancer_OtherProficiencySelect),
            });

            this._render_pHkIxsChosen_comp({
                ix: i,
                $stgSubChoiceData,
                selectedLoadeds,
                propSubComps: "_subCompsDamageImmunities",
                propPrevSubComps: "_prevSubCompsDamageImmunities",
                isAvailable: isAvailable_entryDataDamageImmunities,
                isForceDisplay: isForceDisplay_entryDataDamageImmunities,
                prop: "immune",
                title: "Damage Immunities",
                ptrIsFirstSection,
                CompClass: Charactermancer_DamageImmunitySelect,
                propPathActorExistingProficiencies: ["system", "traits", "di"],
                fnSetComp: this._render_pHkIxsChosen_setCompOtherProficiencies.bind(this),
            });

            this._render_pHkIxsChosen_comp({
                ix: i,
                $stgSubChoiceData,
                selectedLoadeds,
                propSubComps: "_subCompsDamageResistances",
                propPrevSubComps: "_prevSubCompsDamageResistances",
                isAvailable: isAvailable_entryDataDamageResistances,
                isForceDisplay: isForceDisplay_entryDataDamageResistances,
                prop: "resist",
                title: "Damage Resistances",
                ptrIsFirstSection,
                CompClass: Charactermancer_DamageResistanceSelect,
                propPathActorExistingProficiencies: ["system", "traits", "dr"],
                fnSetComp: this._render_pHkIxsChosen_setCompOtherProficiencies.bind(this),
            });

            this._render_pHkIxsChosen_comp({
                ix: i,
                $stgSubChoiceData,
                selectedLoadeds,
                propSubComps: "_subCompsDamageVulnerabilities",
                propPrevSubComps: "_prevSubCompsDamageVulnerabilities",
                isAvailable: isAvailable_entryDataDamageVulnerabilities,
                isForceDisplay: isForceDisplay_entryDataDamageVulnerabilities,
                prop: "vulnerable",
                title: "Damage Vulnerabilities",
                ptrIsFirstSection,
                CompClass: Charactermancer_DamageVulnerabilitySelect,
                propPathActorExistingProficiencies: ["system", "traits", "dv"],
                fnSetComp: this._render_pHkIxsChosen_setCompOtherProficiencies.bind(this),
            });

            this._render_pHkIxsChosen_comp({
                ix: i,
                $stgSubChoiceData,
                selectedLoadeds,
                propSubComps: "_subCompsConditionImmunities",
                propPrevSubComps: "_prevSubCompsConditionImmunities",
                isAvailable: isAvailable_entryDataConditionImmunities,
                isForceDisplay: isForceDisplay_entryDataConditionImmunities,
                prop: "conditionImmune",
                title: "Condition Immunities",
                CompClass: Charactermancer_ConditionImmunitySelect,
                propPathActorExistingProficiencies: ["system", "traits", "ci"],
                ptrIsFirstSection,
                fnSetComp: this._render_pHkIxsChosen_setCompOtherProficiencies.bind(this),
            });

            this._render_pHkIxsChosen_comp({
                ix: i,
                $stgSubChoiceData,
                selectedLoadeds,
                propSubComps: "_subCompsExpertise",
                propPrevSubComps: "_prevSubCompsExpertise",
                isAvailable: isAvailable_entryDataExpertise,
                isForceDisplay: isForceDisplay_entryDataExpertise,
                prop: "expertise",
                title: "Expertise",
                ptrIsFirstSection,
                fnSetComp: this._render_pHkIxsChosen_setCompExpertise.bind(this),
            });

            this._render_pHkIxsChosen_comp({
                ix: i,
                $stgSubChoiceData,
                selectedLoadeds,
                propSubComps: "_subCompsResources",
                propPrevSubComps: "_prevSubCompsResources",
                isAvailable: isAvailable_entryDataResources,
                isForceDisplay: isForceDisplay_entryDataResources,
                prop: "resources",
                ptrIsFirstSection,
                fnSetComp: this._render_pHkIxsChosen_setCompResources.bind(this),
            });

            this._render_pHkIxsChosen_comp({
                ix: i,
                $stgSubChoiceData,
                selectedLoadeds,
                propSubComps: "_subCompsSenses",
                propPrevSubComps: "_prevSubCompsSenses",
                isAvailable: isAvailable_entryDataSenses,
                isForceDisplay: isForceDisplay_entryDataSenses,
                prop: "senses",
                ptrIsFirstSection,
                fnSetComp: this._render_pHkIxsChosen_setCompSenses.bind(this),
            });

            this._render_pHkIxsChosen_comp({
                ix: i,
                $stgSubChoiceData,
                selectedLoadeds,
                propSubComps: "_subCompsAdditionalSpells",
                propPrevSubComps: "_prevSubCompsAdditionalSpells",
                isAvailable: isAvailable_entryDataAdditionalSpells,
                isForceDisplay: isForceDisplay_entryDataAdditionalSpells,
                prop: "additionalSpells",
                ptrIsFirstSection,
                fnSetComp: this._render_pHkIxsChosen_setCompAdditionalSpells.bind(this),
            });
        }

        this._prevSubCompsSkillToolLanguageProficiencies = null;
        this._prevSubCompsSkillProficiencies = null;
        this._prevSubCompsLanguageProficiencies = null;
        this._prevSubCompsToolProficiencies = null;
        this._prevSubCompsWeaponProficiencies = null;
        this._prevSubCompsArmorProficiencies = null;
        this._prevSubCompsSavingThrowProficiencies = null;
        this._prevSubCompsDamageImmunities = null;
        this._prevSubCompsDamageResistances = null;
        this._prevSubCompsDamageVulnerabilities = null;
        this._prevSubCompsConditionImmunities = null;
        this._prevSubCompsExpertise = null;
        this._prevSubCompsResources = null;
        this._prevSubCompsSenses = null;
        this._prevSubCompsAdditionalSpells = null;

        $stgSubChoiceData.toggleVe(isSubChoiceForceDisplay);
    }

    /**
     * Try to render a subcomponent. Will self-cancel if isAvailable is false
     * @param {{ix:number, isAvailable:boolean, isForceDisplay:boolean, propSubComps:string, propPrevSubComps:string, prop:string, propPathActorExistingProficiencies:string[],
     * ptrIsFirstSection: {_:boolean,}}}
     */
    _render_pHkIxsChosen_comp({ix, $stgSubChoiceData, propSubComps, propPrevSubComps, isAvailable, isForceDisplay, selectedLoadeds, prop, title, CompClass, propPathActorExistingProficiencies, ptrIsFirstSection, fnSetComp, fnGetMappedProficiencies, fnGetExistingFvtt, }, ) {
        this[propSubComps][ix] = null;
        if (!isAvailable){return;}

        const {entity} = selectedLoadeds[ix];

        if (!entity?.[prop] && !entity?.entryData?.[prop]){return;}

        //Create the sub-component (can be found at this[propSubComps][ix])
        //Use the function we were passed
        fnSetComp({
            ix,
            propSubComps,
            prop,
            CompClass,
            propPathActorExistingProficiencies,
            entity,
            fnGetMappedProficiencies,
            fnGetExistingFvtt,
        });

        //Copy the state over from previous sub-components
        if (this[propPrevSubComps] && this[propPrevSubComps][ix]) {
            this[propSubComps][ix]._proxyAssignSimple("state", MiscUtil.copy(this[propPrevSubComps][ix].__state));
        }

        if (!isForceDisplay){return;}

        if (!title){title = this[propSubComps][ix]?.modalTitle;}

        if (title)
            $stgSubChoiceData.append(`${ptrIsFirstSection._ ? "" : `<div class="w-100 mt-1 mb-2"></div>`}<div class="bold mb-2">${title}</div>`);

        //Render the subcomponent
        this[propSubComps][ix].render($stgSubChoiceData);
        ptrIsFirstSection._ = false;
    }

    /**
     * @param {{ix:number, prop:string, propPathActorExistingProficiencies:string[]}}
     */
    _render_pHkIxsChosen_setCompOtherProficiencies({ix, propSubComps, prop, CompClass, propPathActorExistingProficiencies, entity, fnGetMappedProficiencies, fnGetExistingFvtt, }, ) {
        const availableRaw = entity[prop] || entity.entryData[prop];
        //If existingFvtt is null, we can try to pull the info we need from _actor by using the fnGetExistingFvtt function that was passed to us
        const existingFvtt = fnGetExistingFvtt ? fnGetExistingFvtt() : {
            [prop]: MiscUtil.get(this._actor, ...propPathActorExistingProficiencies)
        };
        this[propSubComps][ix] = new CompClass({
            featureSourceTracker: this._featureSourceTracker,
            existing: CompClass.getExisting(existingFvtt),
            existingFvtt,
            available: fnGetMappedProficiencies ? fnGetMappedProficiencies(availableRaw) : availableRaw,
        });
    }

    _render_pHkIxsChosen_setCompExpertise({ix, propSubComps, prop, entity, }, ) {
        const existingFvtt = Charactermancer_ExpertiseSelect.getExistingFvttFromActor(this._actor);
        this[propSubComps][ix] = new Charactermancer_ExpertiseSelect({
            featureSourceTracker: this._featureSourceTracker,
            existing: Charactermancer_ExpertiseSelect.getExisting(existingFvtt),
            existingFvtt,
            available: entity[prop] || entity.entryData[prop],
        });
    }

    _render_pHkIxsChosen_setCompResources({ix, propSubComps, prop, entity, }, ) {
        this[propSubComps][ix] = new Charactermancer_ResourceSelect({
            resources: entity[prop] || entity.entryData[prop],
            className: entity.className,
            classSource: entity.classSource,
            subclassShortName: entity.subclassShortName,
            subclassSource: entity.subclassSource,
        });
    }

    _render_pHkIxsChosen_setCompSenses({ix, propSubComps, prop, entity, }, ) {
        const existingFvtt = Charactermancer_SenseSelect.getExistingFvttFromActor(this._actor);
        this[propSubComps][ix] = new Charactermancer_SenseSelect({
            //existing: Charactermancer_SenseSelect.getExisting(existingFvtt),
            existingFvtt,
            senses: entity[prop] || entity.entryData[prop],
        });
    }

    _render_pHkIxsChosen_setCompAdditionalSpells({ix, propSubComps, prop, entity, }, ) {
        this[propSubComps][ix] = Charactermancer_AdditionalSpellsSelect.getComp({
            additionalSpells: entity[prop] || entity.entryData[prop],
            modalFilterSpells: this._modalFilterSpells,
            curLevel: 0,
            targetLevel: Consts.CHAR_MAX_LEVEL,
            spellLevelLow: 0,
            spellLevelHigh: 9,
        });
    }

    get optionSet_() {
        return this._optionsSet;
    }

    async pIsNoChoice() {
        if (this._isOptions())
            return false;
        //TEMPFIX
        /* if (await this._pHasChoiceInSideData_chooseSystem())
            return false;
        if (await this._pHasChoiceInSideData_chooseFlags())
            return false; */
        if (await this._pHasSubChoice_entryData_skillToolLanguageProficiencies())
            return false;
        if (await this._pHasSubChoice_entryData_skillProficiencies())
            return false;
        if (await this._pHasSubChoice_entryData_languageProficiencies())
            return false;
        if (await this._pHasSubChoice_entryData_toolProficiencies())
            return false;
        if (await this._pHasSubChoice_entryData_weaponProficiencies())
            return false;
        if (await this._pHasSubChoice_entryData_armorProficiencies())
            return false;
        if (await this._pHasSubChoice_entryData_savingThrowProficiencies())
            return false;
        if (await this._pHasSubChoice_damageImmunities())
            return false;
        if (await this._pHasSubChoice_damageResistances())
            return false;
        if (await this._pHasSubChoice_damageVulnerabilities())
            return false;
        if (await this._pHasSubChoice_conditionImmunities())
            return false;
        if (await this._pHasSubChoice_expertise())
            return false;
        if (await this._pHasSubChoice_resources())
            return false;
        if (await this._pHasSubChoice_entryData_senses())
            return false;
        if (await this._pHasSubChoice_entryData_additionalSpells())
            return false;
        return true;
    }

    async pIsForceDisplay() {
        if (await this._pIsForceDisplay_skillToolLanguageProficiencies())
            return true;
        if (await this._pIsForceDisplay_skillProficiencies())
            return true;
        if (await this._pIsForceDisplay_languageProficiencies())
            return true;
        if (await this._pIsForceDisplay_toolProficiencies())
            return true;
        if (await this._pIsForceDisplay_weaponProficiencies())
            return true;
        if (await this._pIsForceDisplay_armorProficiencies())
            return true;
        if (await this._pIsForceDisplay_savingThrowProficiencies())
            return true;
        if (await this._pIsForceDisplay_damageImmunities())
            return true;
        if (await this._pIsForceDisplay_damageResistances())
            return true;
        if (await this._pIsForceDisplay_damageVulnerabilities())
            return true;
        if (await this._pIsForceDisplay_conditionImmunities())
            return true;
        if (await this._pIsForceDisplay_expertise())
            return true;
        if (await this._pIsForceDisplay_resources())
            return true;
        if (await this._pIsForceDisplay_senses())
            return true;
        if (await this._pIsForceDisplay_additionalSpells())
            return true;
        return false;
    }

    async pIsAvailable() {
        if (await this._pIsAvailable_skillToolLanguageProficiencies())
            return true;
        if (await this._pIsAvailable_skillProficiencies())
            return true;
        if (await this._pIsAvailable_languageProficiencies())
            return true;
        if (await this._pIsAvailable_toolProficiencies())
            return true;
        if (await this._pIsAvailable_weaponProficiencies())
            return true;
        if (await this._pIsAvailable_armorProficiencies())
            return true;
        if (await this._pIsAvailable_savingThrowProficiencies())
            return true;
        if (await this._pIsAvailable_damageImmunities())
            return true;
        if (await this._pIsAvailable_damageResistances())
            return true;
        if (await this._pIsAvailable_damageVulnerabilities())
            return true;
        if (await this._pIsAvailable_conditionImmunities())
            return true;
        if (await this._pIsAvailable_expertise())
            return true;
        if (await this._pIsAvailable_resources())
            return true;
        if (await this._pIsAvailable_senses())
            return true;
        if (await this._pIsAvailable_additionalSpells())
            return true;
        return false;
    }

    _isOptions() {
        return !!(this._optionsSet[0] && this._optionsSet[0].optionsMeta);
    }

    unregisterFeatureSourceTracking() {
        if (this._featureSourceTracker)
            this._featureSourceTracker.unregister(this);
        this._unregisterSubComps();
    }

    async _pIsSubChoiceForceDisplay(selectedLoadeds) {
        //TEMPFIX
        const isSubChoice_sideDataChooseSystem = false;//await this._pHasChoiceInSideData_chooseSystem(selectedLoadeds);
        const isSubChoice_sideDataChooseFlags = false; //await this._pHasChoiceInSideData_chooseFlags(selectedLoadeds);
        const isForceDisplay_entryDataSkillToolLanguageProficiencies = await this._pIsForceDisplay_skillToolLanguageProficiencies(selectedLoadeds);
        const isForceDisplay_entryDataSkillProficiencies = await this._pIsForceDisplay_skillProficiencies(selectedLoadeds);
        const isForceDisplay_entryDataLanguageProficiencies = await this._pIsForceDisplay_languageProficiencies(selectedLoadeds);
        const isForceDisplay_entryDataToolProficiencies = await this._pIsForceDisplay_toolProficiencies(selectedLoadeds);
        const isForceDisplay_entryDataWeaponProficiencies = await this._pIsForceDisplay_weaponProficiencies(selectedLoadeds);
        const isForceDisplay_entryDataArmorProficiencies = await this._pIsForceDisplay_armorProficiencies(selectedLoadeds);
        const isForceDisplay_entryDataSavingThrowProficiencies = await this._pIsForceDisplay_savingThrowProficiencies(selectedLoadeds);
        const isForceDisplay_entryDataDamageImmunities = await this._pIsForceDisplay_damageImmunities(selectedLoadeds);
        const isForceDisplay_entryDataDamageResistances = await this._pIsForceDisplay_damageResistances(selectedLoadeds);
        const isForceDisplay_entryDataDamageVulnerabilities = await this._pIsForceDisplay_damageVulnerabilities(selectedLoadeds);
        const isForceDisplay_entryDataConditionImmunities = await this._pIsForceDisplay_conditionImmunities(selectedLoadeds);
        const isForceDisplay_entryDataExpertise = await this._pIsForceDisplay_expertise(selectedLoadeds);
        const isForceDisplay_entryDataResources = await this._pIsForceDisplay_resources(selectedLoadeds);
        const isForceDisplay_entryDataSenses = await this._pIsForceDisplay_senses(selectedLoadeds);
        const isForceDisplay_entryDataAdditionalSpells = await this._pIsForceDisplay_additionalSpells(selectedLoadeds);

        return [isSubChoice_sideDataChooseSystem, isSubChoice_sideDataChooseFlags, isForceDisplay_entryDataSkillToolLanguageProficiencies, isForceDisplay_entryDataSkillProficiencies, isForceDisplay_entryDataLanguageProficiencies, isForceDisplay_entryDataToolProficiencies, isForceDisplay_entryDataWeaponProficiencies, isForceDisplay_entryDataArmorProficiencies, isForceDisplay_entryDataSavingThrowProficiencies, isForceDisplay_entryDataDamageImmunities, isForceDisplay_entryDataDamageResistances, isForceDisplay_entryDataDamageVulnerabilities, isForceDisplay_entryDataConditionImmunities, isForceDisplay_entryDataExpertise, isForceDisplay_entryDataResources, isForceDisplay_entryDataSenses, isForceDisplay_entryDataAdditionalSpells, ].some(Boolean);
    }
    async _pIsSubChoiceAvailable(selectedLoadeds) {
        //TEMPFIX
        const isSubChoice_sideDataChooseSystem = false; //await this._pHasChoiceInSideData_chooseSystem(selectedLoadeds);
        const isSubChoice_sideDataChooseFlags = false; //await this._pHasChoiceInSideData_chooseFlags(selectedLoadeds);
        const isAvailable_entryDataSkillToolLanguageProficiencies = await this._pIsAvailable_skillToolLanguageProficiencies(selectedLoadeds);
        const isAvailable_entryDataSkillProficiencies = await this._pIsAvailable_skillProficiencies(selectedLoadeds);
        const isAvailable_entryDataLanguageProficiencies = await this._pIsAvailable_languageProficiencies(selectedLoadeds);
        const isAvailable_entryDataToolProficiencies = await this._pIsAvailable_toolProficiencies(selectedLoadeds);
        const isAvailable_entryDataWeaponProficiencies = await this._pIsAvailable_weaponProficiencies(selectedLoadeds);
        const isAvailable_entryDataArmorProficiencies = await this._pIsAvailable_armorProficiencies(selectedLoadeds);
        const isAvailable_entryDataSavingThrowProficiencies = await this._pIsAvailable_savingThrowProficiencies(selectedLoadeds);
        const isAvailable_entryDataDamageImmunities = await this._pIsAvailable_damageImmunities(selectedLoadeds);
        const isAvailable_entryDataDamageResistances = await this._pIsAvailable_damageResistances(selectedLoadeds);
        const isAvailable_entryDataDamageVulnerabilities = await this._pIsAvailable_damageVulnerabilities(selectedLoadeds);
        const isAvailable_entryDataConditionImmunities = await this._pIsAvailable_conditionImmunities(selectedLoadeds);
        const isAvailable_entryDataExpertise = await this._pIsAvailable_expertise(selectedLoadeds);
        const isAvailable_entryDataResources = await this._pIsAvailable_resources(selectedLoadeds);
        const isAvailable_entryDataSenses = await this._pIsAvailable_senses(selectedLoadeds);
        const isAvailable_entryDataAdditionalSpells = await this._pIsAvailable_additionalSpells(selectedLoadeds);

        return [isSubChoice_sideDataChooseSystem, isSubChoice_sideDataChooseFlags, isAvailable_entryDataSkillToolLanguageProficiencies, isAvailable_entryDataSkillProficiencies, isAvailable_entryDataLanguageProficiencies, isAvailable_entryDataToolProficiencies, isAvailable_entryDataWeaponProficiencies, isAvailable_entryDataArmorProficiencies, isAvailable_entryDataSavingThrowProficiencies, isAvailable_entryDataDamageImmunities, isAvailable_entryDataDamageResistances, isAvailable_entryDataDamageVulnerabilities, isAvailable_entryDataConditionImmunities, isAvailable_entryDataExpertise, isAvailable_entryDataResources, isAvailable_entryDataSenses, isAvailable_entryDataAdditionalSpells, ].some(Boolean);
    }

    

    async _pHasChoiceInSideData_chooseSystem(optionsSet) {
        return this._pHasChoiceInSideData_chooseSystemOrFlags({
            optionsSet,
            propChoose: "chooseSystem"
        });
    }
    async _pHasChoiceInSideData_chooseFlags(optionsSet) {
        return this._pHasChoiceInSideData_chooseSystemOrFlags({
            optionsSet,
            propChoose: "chooseFlags"
        });
    }
    async _pHasChoiceInSideData_chooseSystemOrFlags({optionsSet, propChoose}) {
        optionsSet = optionsSet || this._optionsSet;

        if (this._isSkipCharactermancerHandled)
            return false;

        for (const loaded of optionsSet) {
            const {entity, type} = loaded;

            const sideDataConverterMeta = this.constructor._ENTITY_TYPE_TO_SIDE_DATA_META[type];

            if (sideDataConverterMeta) {
                if (!sideDataConverterMeta.file.startsWith("SideDataInterface"))
                    throw new Error(`Expected side-data interface to start with "SideDataInterface"!`);
                const mod = await __variableDynamicImportRuntime2__(`./SideDataInterface/SideDataInterface${sideDataConverterMeta.file.replace(/^SideDataInterface/, "")}.js`);

                const sideData = await mod[sideDataConverterMeta.sideDataInterface].pGetSideLoaded(entity);
                if (sideData?.[propChoose]?.length)
                    return true;
            }
        }
        return false;
    }
    static _ENTITY_TYPE_TO_SIDE_DATA_META = {
        "backgroundFeature": {
            file: "SideDataInterfaceBackgroundFeature",
            sideDataInterface: "SideDataInterfaceBackgroundFeature"
        },
        "charoption": {
            file: "SideDataInterfaceCharCreationOption",
            sideDataInterface: "SideDataInterfaceCharCreationOption"
        },
        "classFeature": {
            file: "SideDataInterfaceClassSubclassFeature",
            sideDataInterface: "SideDataInterfaceClassSubclassFeature"
        },
        "subclassFeature": {
            file: "SideDataInterfaceClassSubclassFeature",
            sideDataInterface: "SideDataInterfaceClassSubclassFeature"
        },
        "feat": {
            file: "SideDataInterfaceFeat",
            sideDataInterface: "SideDataInterfaceFeat"
        },
        "optionalfeature": {
            file: "SideDataInterfaceOptionalfeature",
            sideDataInterface: "SideDataInterfaceOptionalfeature"
        },
        "raceFeature": {
            file: "SideDataInterfaceRaceFeature",
            sideDataInterface: "SideDataInterfaceRaceFeature"
        },
        "reward": {
            file: "SideDataInterfaceReward",
            sideDataInterface: "SideDataInterfaceReward"
        },
        "vehicleUpgrade": {
            file: "SideDataInterfaceVehicleUpgrade",
            sideDataInterface: "SideDataInterfaceVehicleUpgrade"
        },
    };

    async _pHasSubChoice_entryData_skillToolLanguageProficiencies(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_OtherProficiencySelect,
            prop: "skillToolLanguageProficiencies",
            isRequireChoice: true,
        });
    }

    async _pHasSubChoice_entryData_skillProficiencies(optionsSet) {
        //Check if optionsSet has the property "skillProficiencies" in its entryData (or in the root object), and checks if its a choice between several
        //Also provides it a function to map the choices
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_OtherProficiencySelect,
            prop: "skillProficiencies",
            isRequireChoice: true,
            fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedSkillProficiencies.bind(Charactermancer_OtherProficiencySelect),
        });
    }

    async _pHasSubChoice_entryData_languageProficiencies(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_OtherProficiencySelect,
            prop: "languageProficiencies",
            isRequireChoice: true,
            fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedLanguageProficiencies.bind(Charactermancer_OtherProficiencySelect),
        });
    }

    async _pHasSubChoice_entryData_toolProficiencies(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_OtherProficiencySelect,
            prop: "toolProficiencies",
            isRequireChoice: true,
            fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedToolProficiencies.bind(Charactermancer_OtherProficiencySelect),
        });
    }

    async _pHasSubChoice_entryData_weaponProficiencies(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_OtherProficiencySelect,
            prop: "weaponProficiencies",
            isRequireChoice: true,
            fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedWeaponProficiencies.bind(Charactermancer_OtherProficiencySelect),
        });
    }

    async _pHasSubChoice_entryData_armorProficiencies(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_OtherProficiencySelect,
            prop: "armorProficiencies",
            isRequireChoice: true,
            fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedArmorProficiencies.bind(Charactermancer_OtherProficiencySelect),
        });
    }

    async _pHasSubChoice_entryData_savingThrowProficiencies(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_OtherProficiencySelect,
            prop: "savingThrowProficiencies",
            isRequireChoice: true,
            fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedSavingThrowProficiencies.bind(Charactermancer_OtherProficiencySelect),
        });
    }

    async _pHasSubChoice_damageImmunities(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_DamageImmunitySelect,
            prop: "immune",
            isRequireChoice: true,
        });
    }

    async _pHasSubChoice_damageResistances(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_DamageResistanceSelect,
            prop: "resist",
            isRequireChoice: true,
        });
    }

    async _pHasSubChoice_damageVulnerabilities(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_DamageVulnerabilitySelect,
            prop: "vulnerable",
            isRequireChoice: true,
        });
    }

    async _pHasSubChoice_conditionImmunities(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_ConditionImmunitySelect,
            prop: "conditionImmune",
            isRequireChoice: true,
        });
    }

    async _pHasSubChoice_expertise(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_ExpertiseSelect,
            prop: "expertise",
            isRequireChoice: true,
        });
    }

    async _pHasSubChoice_resources(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_ResourceSelect,
            prop: "resources",
            isRequireChoice: true,
        });
    }

    async _pHasSubChoice_entryData_senses(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_SenseSelect,
            prop: "senses",
            isRequireChoice: true,
        });
    }

    async _pHasSubChoice_entryData_additionalSpells(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_AdditionalSpellsSelect,
            prop: "additionalSpells",
            isRequireChoice: true,
        });
    }

    /**Checks if an object has a property in their entryData called 'prop'*/
    async _pHasEntryData_prop({optionsSet, CompClass, prop, isRequireChoice, fnGetMappedProficiencies}) {
        optionsSet = optionsSet || this._optionsSet;

        if (this._isSkipCharactermancerHandled){return false;}

        for (const loaded of optionsSet) {
            if(loaded === undefined){continue;} //TEMPFIX, remove this
            const {entity} = loaded;

            let proficiencies = entity?.[prop] || entity?.entryData?.[prop];
            if (proficiencies) {
                if (fnGetMappedProficiencies){proficiencies = fnGetMappedProficiencies(proficiencies);}

                if (!isRequireChoice){return true;}
                else {
                    const isNoChoice = CompClass.isNoChoice(proficiencies);
                    if (!isNoChoice){return true;}
                }
            }
        }
        return false;
    }

    async _pIsForceDisplay_skillToolLanguageProficiencies(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_OtherProficiencySelect,
            prop: "skillToolLanguageProficiencies",
        });
    }

    async _pIsForceDisplay_skillProficiencies(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_OtherProficiencySelect,
            prop: "skillProficiencies",
            fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedSkillProficiencies.bind(Charactermancer_OtherProficiencySelect),
        });
    }

    async _pIsForceDisplay_languageProficiencies(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_OtherProficiencySelect,
            prop: "languageProficiencies",
            fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedLanguageProficiencies.bind(Charactermancer_OtherProficiencySelect),
        });
    }

    async _pIsForceDisplay_toolProficiencies(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_OtherProficiencySelect,
            prop: "toolProficiencies",
            fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedToolProficiencies.bind(Charactermancer_OtherProficiencySelect),
        });
    }

    async _pIsForceDisplay_weaponProficiencies(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_OtherProficiencySelect,
            prop: "weaponProficiencies",
            fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedWeaponProficiencies.bind(Charactermancer_OtherProficiencySelect),
        });
    }

    async _pIsForceDisplay_armorProficiencies(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_OtherProficiencySelect,
            prop: "armorProficiencies",
            fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedArmorProficiencies.bind(Charactermancer_OtherProficiencySelect),
        });
    }

    async _pIsForceDisplay_savingThrowProficiencies(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_OtherProficiencySelect,
            prop: "savingThrowProficiencies",
            fnGetMappedProficiencies: Charactermancer_OtherProficiencySelect.getMappedSavingThrowProficiencies.bind(Charactermancer_OtherProficiencySelect),
        });
    }

    async _pIsForceDisplay_damageImmunities(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_ConditionImmunitySelect,
            prop: "immune",
        });
    }

    async _pIsForceDisplay_damageResistances(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_DamageResistanceSelect,
            prop: "resist",
        });
    }

    async _pIsForceDisplay_damageVulnerabilities(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_DamageVulnerabilitySelect,
            prop: "vulnerable",
        });
    }

    async _pIsForceDisplay_conditionImmunities(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_ConditionImmunitySelect,
            prop: "conditionImmune",
        });
    }

    async _pIsForceDisplay_expertise(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_ExpertiseSelect,
            prop: "expertise",
        });
    }

    async _pIsForceDisplay_resources(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_ResourceSelect,
            prop: "resources",
            isRequireChoice: true,
        });
    }

    _pIsForceDisplay_senses(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_SenseSelect,
            prop: "senses",
            isRequireChoice: true,
        });
    }

    _pIsForceDisplay_additionalSpells(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_AdditionalSpellsSelect,
            prop: "additionalSpells",
        });
    }

    _pIsAvailable_skillToolLanguageProficiencies(...args) {
        return this._pIsForceDisplay_skillToolLanguageProficiencies(...args);
    }
    _pIsAvailable_skillProficiencies(...args) {
        return this._pIsForceDisplay_skillProficiencies(...args);
    }
    _pIsAvailable_languageProficiencies(...args) {
        return this._pIsForceDisplay_languageProficiencies(...args);
    }
    _pIsAvailable_toolProficiencies(...args) {
        return this._pIsForceDisplay_toolProficiencies(...args);
    }
    _pIsAvailable_weaponProficiencies(...args) {
        return this._pIsForceDisplay_weaponProficiencies(...args);
    }
    _pIsAvailable_armorProficiencies(...args) {
        return this._pIsForceDisplay_armorProficiencies(...args);
    }
    _pIsAvailable_savingThrowProficiencies(...args) {
        return this._pIsForceDisplay_savingThrowProficiencies(...args);
    }
    _pIsAvailable_damageImmunities(...args) {
        return this._pIsForceDisplay_damageImmunities(...args);
    }
    _pIsAvailable_damageResistances(...args) {
        return this._pIsForceDisplay_damageResistances(...args);
    }
    _pIsAvailable_damageVulnerabilities(...args) {
        return this._pIsForceDisplay_damageVulnerabilities(...args);
    }
    _pIsAvailable_conditionImmunities(...args) {
        return this._pIsForceDisplay_conditionImmunities(...args);
    }
    _pIsAvailable_expertise(...args) {
        return this._pIsForceDisplay_expertise(...args);
    }

    async _pIsAvailable_resources(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_ResourceSelect,
            prop: "resources",
        });
    }

    _pIsAvailable_senses(optionsSet) {
        return this._pHasEntryData_prop({
            optionsSet,
            CompClass: Charactermancer_SenseSelect,
            prop: "senses",
        });
    }

    _pIsAvailable_additionalSpells(...args) {
        return this._pIsForceDisplay_additionalSpells(...args);
    }

    async _pGetLoadedsSideDataRaws(optionsSet) {
        optionsSet = optionsSet || this._optionsSet;
        const out = [];
        for (const loaded of optionsSet) {
            const {entity, type} = loaded;

            switch (type) {
                case "classFeature":
                case "subclassFeature":
                    {
                        /* const {SideDataInterfaceClassSubclassFeature} = await Promise.resolve().then(function() {
                            return SideDataInterfaceClassSubclassFeature;
                        }); */
                        const sideData = await SideDataInterfaceClassSubclassFeature.pGetSideLoaded(entity);
                        out.push(sideData);
                        break;
                    }

                default: { out.push(null); break; }
            }
        }
        return out;
    }

   

    _getTrackableFeatures() {
        const ixs = ComponentUiUtil.getMetaWrpMultipleChoice_getSelectedIxs(this, "ixsChosen");
        const selectedLoadeds = ixs.map(ix=>this._optionsSet[ix]);

        return selectedLoadeds.map(({page, hash})=>({
            page,
            hash
        }));
    }

    /**
     * Copies over state from any component within 'comps' that has a matching optionset to ours
     * @param {any[]} comps
     */
    findAndCopyStateFrom(comps) {
        if (!comps?.length){ return;}

        const match = comps.find(it=>CollectionUtil.deepEquals(it.optionSet_, this.optionSet_));
        if (match) {
            this._proxyAssignSimple("state", MiscUtil.copy(match.__state));
            this._prevSubCompsSkillToolLanguageProficiencies = match._subCompsSkillToolLanguageProficiencies;
            this._prevSubCompsSkillProficiencies = match._subCompsSkillProficiencies;
            this._prevSubCompsLanguageProficiencies = match._subCompsLanguageProficiencies;
            this._prevSubCompsToolProficiencies = match._subCompsToolProficiencies;
            this._prevSubCompsWeaponProficiencies = match._subCompsWeaponProficiencies;
            this._prevSubCompsArmorProficiencies = match._subCompsArmorProficiencies;
            this._prevSubCompsSavingThrowProficiencies = match._subCompsSavingThrowProficiencies;
            this._prevSubCompsDamageImmunities = match._prevSubCompsDamageImmunities;
            this._prevSubCompsDamageResistances = match._prevSubCompsDamageResistances;
            this._prevSubCompsDamageVulnerabilities = match._prevSubCompsDamageVulnerabilities;
            this._prevSubCompsConditionImmunities = match._prevSubCompsConditionImmunities;
            this._prevSubCompsExpertise = match._prevSubCompsExpertise;
            this._prevSubCompsResources = match._prevSubCompsResources;
            this._prevSubCompsSenses = match._subCompsSenses;
            this._prevSubCompsAdditionalSpells = match._subCompsAdditionalSpells;
        }
    }

    async pGetFormData() {
        if (await this.pIsNoChoice() && !await this.pIsAvailable()) {
            const sideDatas = await this._pGetLoadedsSideDataRaws();
            const cpyOptionsSet = MiscUtil.copy(this._optionsSet);
            cpyOptionsSet.forEach((loaded,i)=>{
                const sideData = sideDatas[i];
                if (!sideData)
                    return;

                const {entity} = loaded;
                if (sideData.data)
                    entity.foundryAdditionalSystem = MiscUtil.copy(sideData.data);
                if (sideData.flags)
                    entity.foundryAdditionalFlags = MiscUtil.copy(sideData.flags);
                if (sideData.effects)
                    entity.effectsRaw = MiscUtil.copy(sideData.effects);
            }
            );

            return {
                isFormComplete: true,
                data: {
                    features: cpyOptionsSet,
                },
            };
        }

        await this._pGate("ixsChosen");

        const selectedLoadeds = this._getSelectedLoadeds();

        const sideDatas = await this._pGetLoadedsSideDataRaws(selectedLoadeds);
        const cpySelectedLoadeds = MiscUtil.copy(selectedLoadeds);

        const outSkillToolLanguageProficiencies = [];
        const outSkillProficiencies = [];
        const outLanguageProficiencies = [];
        const outToolProficiencies = [];
        const outWeaponProficiencies = [];
        const outArmorProficiencies = [];
        const outSavingThrowProficiencies = [];
        const outDamageImmunities = [];
        const outDamageResistances = [];
        const outDamageVulnerabilities = [];
        const outConditionImmunities = [];
        const outExpertise = [];
        const outResources = [];
        const outSenses = [];
        const outAdditionalSpells = [];

        for (let i = 0; i < cpySelectedLoadeds.length; ++i) {
            const loaded = cpySelectedLoadeds[i];

            const sideData = sideDatas[i];

            const {entity} = loaded;

            if (sideData) {
                if (sideData.data)
                    entity.foundryAdditionalSystem = MiscUtil.copy(sideData.data);
                if (sideData.flags)
                    entity.foundryAdditionalFlags = MiscUtil.copy(sideData.flags);
                if (sideData.effects)
                    entity.effectsRaw = MiscUtil.copy(sideData.effects);

                const selectedChooseDataSystem = this._getFormData_getChooseSystemOrChooseFlags({
                    sideData,
                    ixCpySelectedLoaded: i,
                    propChoose: "chooseSystem",
                    propCompProp: "propChooseSystem",
                });
                if (selectedChooseDataSystem) {
                    entity.foundryAdditionalSystem = entity.foundryAdditionalSystem || {};
                    Object.assign(entity.foundryAdditionalSystem, MiscUtil.copy(selectedChooseDataSystem.system));
                }

                const selectedChooseDataFlags = this._getFormData_getChooseSystemOrChooseFlags({
                    sideData,
                    ixCpySelectedLoaded: i,
                    propChoose: "chooseFlags",
                    propCompProp: "propChooseFlags",
                });
                if (selectedChooseDataFlags) {
                    entity.foundryAdditionalFlags = entity.foundryAdditionalFlags || {};
                    foundry.utils.mergeObject(entity.foundryAdditionalFlags, MiscUtil.copy(selectedChooseDataFlags.flags));
                }
            }

            if (!this._isSkipCharactermancerHandled) {
                if ((entity?.skillToolLanguageProficiencies || entity?.entryData?.skillToolLanguageProficiencies) && this._subCompsSkillToolLanguageProficiencies[i]) {
                    const formData = await this._subCompsSkillToolLanguageProficiencies[i].pGetFormData();
                    outSkillToolLanguageProficiencies.push(formData);
                }

                if ((entity?.skillProficiencies || entity?.entryData?.skillProficiencies) && this._subCompsSkillProficiencies[i]) {
                    const formData = await this._subCompsSkillProficiencies[i].pGetFormData();
                    outSkillProficiencies.push(formData);
                }

                if ((entity?.languageProficiencies || entity?.entryData?.languageProficiencies) && this._subCompsLanguageProficiencies[i]) {
                    const formData = await this._subCompsLanguageProficiencies[i].pGetFormData();
                    outLanguageProficiencies.push(formData);
                }

                if ((entity?.toolProficiencies || entity?.entryData?.toolProficiencies) && this._subCompsToolProficiencies[i]) {
                    const formData = await this._subCompsToolProficiencies[i].pGetFormData();
                    outToolProficiencies.push(formData);
                }

                if ((entity?.weaponProficiencies || entity?.entryData?.weaponProficiencies) && this._subCompsWeaponProficiencies[i]) {
                    const formData = await this._subCompsWeaponProficiencies[i].pGetFormData();
                    outWeaponProficiencies.push(formData);
                }

                if ((entity?.armorProficiencies || entity?.entryData?.armorProficiencies) && this._subCompsArmorProficiencies[i]) {
                    const formData = await this._subCompsArmorProficiencies[i].pGetFormData();
                    outArmorProficiencies.push(formData);
                }

                if ((entity?.savingThrowProficiencies || entity?.entryData?.savingThrowProficiencies) && this._subCompsSavingThrowProficiencies[i]) {
                    const formData = await this._subCompsSavingThrowProficiencies[i].pGetFormData();
                    outSavingThrowProficiencies.push(formData);
                }

                if ((entity?.immune || entity?.entryData?.immune) && this._subCompsDamageImmunities[i]) {
                    const formData = await this._subCompsDamageImmunities[i].pGetFormData();
                    outDamageImmunities.push(formData);
                }

                if ((entity?.resist || entity?.entryData?.resist) && this._subCompsDamageResistances[i]) {
                    const formData = await this._subCompsDamageResistances[i].pGetFormData();
                    outDamageResistances.push(formData);
                }

                if ((entity?.vulnerable || entity?.entryData?.vulnerable) && this._subCompsDamageVulnerabilities[i]) {
                    const formData = await this._subCompsDamageVulnerabilities[i].pGetFormData();
                    outDamageVulnerabilities.push(formData);
                }

                if ((entity?.conditionImmune || entity?.entryData?.conditionImmune) && this._subCompsConditionImmunities[i]) {
                    const formData = await this._subCompsConditionImmunities[i].pGetFormData();
                    outConditionImmunities.push(formData);
                }

                if ((entity?.expertise || entity?.entryData?.expertise) && this._subCompsExpertise[i]) {
                    const formData = await this._subCompsExpertise[i].pGetFormData();
                    outExpertise.push(formData);
                }

                if ((entity?.resources || entity?.entryData?.resources) && this._subCompsResources[i]) {
                    const formData = await this._subCompsResources[i].pGetFormData();
                    outResources.push(formData);
                }

                if ((entity?.senses || entity?.entryData?.senses) && this._subCompsSenses[i]) {
                    const formData = await this._subCompsSenses[i].pGetFormData();
                    outSenses.push(formData);
                }

                if ((entity?.additionalSpells || entity?.entryData?.additionalSpells) && this._subCompsAdditionalSpells[i]) {
                    const formData = await this._subCompsAdditionalSpells[i].pGetFormData();
                    outAdditionalSpells.push(formData);
                }
            }
        }

        return {
            isFormComplete: true,
            data: {
                features: cpySelectedLoadeds,
                formDatasSkillToolLanguageProficiencies: outSkillToolLanguageProficiencies,
                formDatasSkillProficiencies: outSkillProficiencies,
                formDatasLanguageProficiencies: outLanguageProficiencies,
                formDatasToolProficiencies: outToolProficiencies,
                formDatasWeaponProficiencies: outWeaponProficiencies,
                formDatasArmorProficiencies: outArmorProficiencies,
                formDatasSavingThrowProficiencies: outSavingThrowProficiencies,
                formDatasDamageImmunities: outDamageImmunities,
                formDatasDamageResistances: outDamageResistances,
                formDatasDamageVulnerabilities: outDamageVulnerabilities,
                formDatasConditionImmunities: outConditionImmunities,
                formDatasExpertise: outExpertise,
                formDatasResources: outResources,
                formDatasSenses: outSenses,
                formDatasAdditionalSpells: outAdditionalSpells,
            },
        };
    }

    _getFormData_getChooseSystemOrChooseFlags({sideData, ixCpySelectedLoaded, propChoose, propCompProp}) {
        if (!sideData[propChoose])
            return null;

        const compProps = this._getProps(ixCpySelectedLoaded);

        const ixs = ComponentUiUtil.getMetaWrpMultipleChoice_getSelectedIxs(this, compProps[propCompProp]);
        const selectedChoose = ixs.map(ix=>sideData[propChoose][ix]);

        if (!selectedChoose.length)
            return null;

        return selectedChoose[0];
    }

    _getOptionsNameAndCount() {
        const {name, count} = this._optionsSet[0].optionsMeta;
        const required = this._optionsSet.map((it,ix)=>({
            it,
            ix
        })).filter(({it})=>it.isRequiredOption).map(({ix})=>ix);
        const dispCount = count - required.length;

        return {
            name,
            count,
            dispCount,
            required
        };
    }

    get modalTitle() {
        if (!this._isOptions())
            return null;

        const {dispCount, name} = this._getOptionsNameAndCount();
        return `Choose ${dispCount === 1 ? "" : `${dispCount} `}Option${dispCount === 1 ? "" : "s"}: ${name}${this._level != null ? ` (Level ${this._level})` : ""}`;
    }

    static _getLoadedTmpUid(loaded) {
        return `${loaded.page}__${loaded.hash}`;
    }

    _getSelectedLoadeds() {
        if (this._isOptions()) {
            const ixs = ComponentUiUtil.getMetaWrpMultipleChoice_getSelectedIxs(this, "ixsChosen");
            const {required} = this._getOptionsNameAndCount();
            return [...ixs, ...required].map(ix=>this._optionsSet[ix]);
        }
        else { return this._optionsSet; }
    }

    _getProps(ix) {
        return {
            prefixSubComps: "subComp_",
            propChooseSystem: `subComp_${ix}_chooseSystem`,
            propChooseFlags: `subComp_${ix}_chooseFlags`,
        };
    }

    /**
     * Unregister all existing subcomponents from the featureSourceTracker.
     * Doesn't clear our cache of existing subcomponents.
     */
    _unregisterSubComps() {
        if (!this._featureSourceTracker){return;}

        this._subCompsSkillToolLanguageProficiencies.filter(Boolean).forEach(comp=>this._featureSourceTracker.unregister(comp));
        this._subCompsSkillProficiencies.filter(Boolean).forEach(comp=>this._featureSourceTracker.unregister(comp));
        this._subCompsLanguageProficiencies.filter(Boolean).forEach(comp=>this._featureSourceTracker.unregister(comp));
        this._subCompsToolProficiencies.filter(Boolean).forEach(comp=>this._featureSourceTracker.unregister(comp));
        this._subCompsWeaponProficiencies.filter(Boolean).forEach(comp=>this._featureSourceTracker.unregister(comp));
        this._subCompsArmorProficiencies.filter(Boolean).forEach(comp=>this._featureSourceTracker.unregister(comp));
        this._subCompsSavingThrowProficiencies.filter(Boolean).forEach(comp=>this._featureSourceTracker.unregister(comp));
        this._subCompsDamageImmunities.filter(Boolean).forEach(comp=>this._featureSourceTracker.unregister(comp));
        this._subCompsDamageResistances.filter(Boolean).forEach(comp=>this._featureSourceTracker.unregister(comp));
        this._subCompsDamageVulnerabilities.filter(Boolean).forEach(comp=>this._featureSourceTracker.unregister(comp));
        this._subCompsConditionImmunities.filter(Boolean).forEach(comp=>this._featureSourceTracker.unregister(comp));
        this._subCompsExpertise.filter(Boolean).forEach(comp=>this._featureSourceTracker.unregister(comp));
        this._subCompsResources.filter(Boolean).forEach(comp=>this._featureSourceTracker.unregister(comp));
        this._subCompsSenses.filter(Boolean).forEach(comp=>this._featureSourceTracker.unregister(comp));
        this._subCompsAdditionalSpells.filter(Boolean).forEach(comp=>this._featureSourceTracker.unregister(comp));
    }

    /**
     * Render this FeatureOptionsSelect without any visible subcomponents.
     * Unregisters and clears cache of existing subcomponents.
     * @param {any} {$stgSubChoiceData}
     */
    _render_noSubChoices({$stgSubChoiceData}) {
        this._lastSubMetas.forEach(it=>it.unhook());
        this._lastSubMetas = [];

        this._unregisterSubComps();

        this._subCompsSkillToolLanguageProficiencies = [];
        this._subCompsSkillProficiencies = [];
        this._subCompsLanguageProficiencies = [];
        this._subCompsToolProficiencies = [];
        this._subCompsWeaponProficiencies = [];
        this._subCompsArmorProficiencies = [];
        this._subCompsSavingThrowProficiencies = [];
        this._subCompsDamageImmunities = [];
        this._subCompsDamageResistances = [];
        this._subCompsDamageVulnerabilities = [];
        this._subCompsConditionImmunities = [];
        this._subCompsExpertise = [];
        this._subCompsResources = [];
        this._subCompsSenses = [];
        this._subCompsAdditionalSpells = [];

        $stgSubChoiceData.empty().hideVe();
    }

    _render_options() {
        if (!this._isOptions())
            return;

        const {count, required} = this._getOptionsNameAndCount();

        const $ptsExisting = {};
        this._lastMeta = ComponentUiUtil.getMetaWrpMultipleChoice(this, "ixsChosen", {
            values: this._optionsSet,
            ixsRequired: required,
            count,
            fnDisplay: v=>{
                const ptName = Renderer.get().render(v.entry);

                const $ptExisting = $(`<div class="ml-1 ve-small ve-muted"></div>`);
                $ptsExisting[this.constructor._getLoadedTmpUid(v)] = $ptExisting;

                return $$`<div class="w-100 split-v-center">
						<div class="mr-2 ve-flex-v-center">${ptName}${$ptExisting}</div>
						<div class="${Parser.sourceJsonToColor(v.entity.source)} pr-1" title="${Parser.sourceJsonToFull(v.entity.source)}">${Parser.sourceJsonToAbv(v.entity.source)}</div>
					</div>`;
            },
        }, );

        const hkUpdatePtsExisting = ()=>{
            const otherStates = this._featureSourceTracker ? this._featureSourceTracker.getStatesForKey("features", {
                ignore: this
            }) : null;

            //Check if we already gain this feature from somewhere else
            this._optionsSet.forEach(v=>{
                const tmpUid = this.constructor._getLoadedTmpUid(v);

                if (!$ptsExisting[tmpUid])
                    return;

                let isExists = this._existingFeatureChecker
                && this._existingFeatureChecker.isExistingFeature(UtilEntityGeneric.getName(v.entity), v.page, v.source, v.hash);

                if (otherStates)
                    isExists = isExists || otherStates.some(arr=>arr.some(it=>it.page === v.page && it.hash === v.hash));

                $ptsExisting[tmpUid].title(isExists ? `Gained from Another Source` : "").html(isExists ? `(<i class="fas fa-fw fa-check"></i>)` : "").toggleClass("ml-1", isExists);
            });
        };
        if (this._featureSourceTracker){this._featureSourceTracker.addHook(this, "pulseFeatures", hkUpdatePtsExisting);}
        hkUpdatePtsExisting();

        if (this._featureSourceTracker) {
            const hkSetTrackerState = ()=>this._featureSourceTracker.setState(this, { features: this._getTrackableFeatures() });
            this._addHookBase(this._lastMeta.propPulse, hkSetTrackerState);
            hkSetTrackerState();
        }
    }

    _render_getSubCompTitle(entity) {
        const titleIntro = [entity.className, entity.subclassShortName ? `(${entity.subclassShortName})` : "", entity.level ? `Level ${entity.level}` : "", ].filter(Boolean).join(" ");
        const title = `${titleIntro}${titleIntro ? ": " : ""}${entity.name}`;
        return `${this._isModal ? "" : `<hr class="hr-2">`}<div class="mb-2 bold w-100">${title}</div>`;
    }

    _render_renderSubComp_chooseSystem(ix, $stgSubChoice, entity, type, sideData) {
        return this._render_renderSubComp_chooseSystemChooseFlags({
            ix,
            $stgSubChoice,
            entity,
            type,
            sideData,
            propChoose: "chooseSystem",
            propCompProp: "propChooseSystem",
            propIsRenderEntries: "isChooseSystemRenderEntries",
        });
    }

    _render_renderSubComp_chooseFlags(ix, $stgSubChoice, entity, type, sideData) {
        return this._render_renderSubComp_chooseSystemChooseFlags({
            ix,
            $stgSubChoice,
            entity,
            type,
            sideData,
            propChoose: "chooseFlags",
            propCompProp: "propChooseFlags",
            propIsRenderEntries: "isChooseFlagsRenderEntries",
        });
    }

    _render_renderSubComp_chooseSystemChooseFlags({ix, $stgSubChoice, entity, type, sideData, propChoose, propCompProp, propIsRenderEntries}) {
        const compProps = this._getProps(ix);

        const htmlDescription = sideData[propIsRenderEntries] ? Vetools.withUnpatchedDiceRendering(()=>`${(entity.entries || []).map(ent=>`<div>${Renderer.get().render(ent)}</div>`).join("")}`) : null;

        const choiceMeta = ComponentUiUtil.getMetaWrpMultipleChoice(this, compProps[propCompProp], {
            count: 1,
            fnDisplay: val=>val.name,
            values: sideData[propChoose],
        }, );

        this._lastSubMetas.push(choiceMeta);

        $$`<div class="ve-flex-col w-100">
			${htmlDescription}
			${choiceMeta.$ele}
		</div>`.appendTo($stgSubChoice);
    }

    _getDefaultState() {
        return {
            ixsChosen: [],
        };
    }

    static async pGetUserInput(opts) {
        const comp = new this({
            ...opts,
            featureSourceTracker: opts.featureSourceTracker || new Charactermancer_FeatureSourceTracker(),
            isModal: true,
        });
        if (await comp.pIsNoChoice()) {
            comp.render($(document.createElement("div")));
            return comp.pGetFormData();
        }

        return UtilApplications.pGetImportCompApplicationFormData({
            comp,
            width: 640,
            height: Util.getMaxWindowHeight(),
            isAutoResize: true,
        });
    }

    static async pDoApplyProficiencyFormDataToActorUpdate(actor, actorUpdate, formData) {
        const formDataData = formData.data;
        if (!formDataData)
            return;

        const {DataConverter} = await Promise.resolve().then(function() {
            return DataConverter$1;
        });

        actorUpdate.system = actorUpdate.system || {};

        for (const formData of formDataData.formDatasSkillToolLanguageProficiencies || []) {
            DataConverter.doApplySkillFormDataToActorUpdate({
                existingProfsActor: MiscUtil.get(actor, "_source", "system", "skills"),
                formData: formData,
                actorData: actorUpdate.system,
            });

            DataConverter.doApplyLanguageProficienciesFormDataToActorUpdate({
                existingProfsActor: MiscUtil.get(actor, "_source", "system", "traits", "languages"),
                formData,
                actorData: actorUpdate.system,
            });

            DataConverter.doApplyToolProficienciesFormDataToActorUpdate({
                existingProfsActor: MiscUtil.get(actor, "_source", "system", "tools"),
                formData,
                actorData: actorUpdate.system,
            });
        }

        for (const formData of formDataData.formDatasSkillProficiencies || []) {
            DataConverter.doApplySkillFormDataToActorUpdate({
                existingProfsActor: MiscUtil.get(actor, "_source", "system", "skills"),
                formData: formData,
                actorData: actorUpdate.system,
            });
        }

        for (const formData of formDataData.formDatasLanguageProficiencies || []) {
            DataConverter.doApplyLanguageProficienciesFormDataToActorUpdate({
                existingProfsActor: MiscUtil.get(actor, "_source", "system", "traits", "languages"),
                formData,
                actorData: actorUpdate.system,
            });
        }

        for (const formData of formDataData.formDatasToolProficiencies || []) {
            DataConverter.doApplyToolProficienciesFormDataToActorUpdate({
                existingProfsActor: MiscUtil.get(actor, "_source", "system", "tools"),
                formData,
                actorData: actorUpdate.system,
            });
        }

        for (const formData of formDataData.formDatasWeaponProficiencies || []) {
            DataConverter.doApplyWeaponProficienciesFormDataToActorUpdate({
                existingProfsActor: MiscUtil.get(actor, "_source", "system", "traits", "weaponProf"),
                formData,
                actorData: actorUpdate.system,
            });
        }

        for (const formData of formDataData.formDatasArmorProficiencies || []) {
            DataConverter.doApplyArmorProficienciesFormDataToActorUpdate({
                existingProfsActor: MiscUtil.get(actor, "_source", "system", "traits", "armorProf"),
                formData,
                actorData: actorUpdate.system,
            });
        }

        for (const formData of formDataData.formDatasSavingThrowProficiencies || []) {
            DataConverter.doApplySavingThrowProficienciesFormDataToActorUpdate({
                existingProfsActor: MiscUtil.get(actor, "_source", "system", "abilities"),
                formData,
                actorData: actorUpdate.system,
            });
        }

        for (const formData of formDataData.formDatasDamageImmunities || []) {
            DataConverter.doApplyDamageImmunityFormDataToActorUpdate({
                existingProfsActor: MiscUtil.get(actor, "_source", "system", "traits", "di"),
                formData,
                actorData: actorUpdate.system,
            });
        }

        for (const formData of formDataData.formDatasDamageResistances || []) {
            DataConverter.doApplyDamageResistanceFormDataToActorUpdate({
                existingProfsActor: MiscUtil.get(actor, "_source", "system", "traits", "dr"),
                formData,
                actorData: actorUpdate.system,
            });
        }

        for (const formData of formDataData.formDatasDamageVulnerabilities || []) {
            DataConverter.doApplyDamageVulnerabilityFormDataToActorUpdate({
                existingProfsActor: MiscUtil.get(actor, "_source", "system", "traits", "dv"),
                formData,
                actorData: actorUpdate.system,
            });
        }

        for (const formData of formDataData.formDatasConditionImmunities || []) {
            DataConverter.doApplyConditionImmunityFormDataToActorUpdate({
                existingProfsActor: MiscUtil.get(actor, "_source", "system", "traits", "ci"),
                formData,
                actorData: actorUpdate.system,
            });
        }

        for (const formData of formDataData.formDatasExpertise || []) {
            DataConverter.doApplyExpertiseFormDataToActorUpdate({
                existingProfsActor: {
                    skillProficiencies: MiscUtil.get(actor, "_source", "system", "skills"),
                    toolProficiencies: MiscUtil.get(actor, "_source", "system", "tools"),
                },
                formData: formData,
                actorData: actorUpdate.system,
            });
        }
    }

    static async pDoApplyResourcesFormDataToActor({actor, formData}) {
        const formDataData = formData.data;

        if (!formDataData?.formDatasResources?.length)
            return;

        for (const formDataResources of formDataData.formDatasResources) {
            await Charactermancer_ResourceSelect.pApplyFormDataToActor(actor, formDataResources, );
        }
    }

    static async pDoApplySensesFormDataToActor({actor, actorUpdate, formData, configGroup}) {
        const formDataData = formData.data;
        if (!formDataData || !formDataData.formDatasSenses?.length)
            return;

        const {DataConverter} = await Promise.resolve().then(function() {
            return DataConverter$1;
        });

        actorUpdate.prototypeToken = actorUpdate.prototypeToken || {};
        actorUpdate.system = actorUpdate.system || {};

        for (const formData of formDataData.formDatasSenses || []) {
            DataConverter.doApplySensesFormDataToActorUpdate({
                existingSensesActor: MiscUtil.get(actor, "_source", "system", "attributes", "senses"),
                existingTokenActor: MiscUtil.get(actor, "_source", "prototypeToken"),
                formData: formData,
                actorData: actorUpdate.system,
                actorToken: actorUpdate.prototypeToken,
                configGroup,
            });
        }
    }

    static async pDoApplyAdditionalSpellsFormDataToActor({actor, formData, abilityAbv, parentAbilityAbv=null, taskRunner=null}) {
        const formDataData = formData.data;
        if (!formDataData || !formDataData.formDatasAdditionalSpells?.length)
            return;

        for (const formDataAdditionalSpells of formDataData.formDatasAdditionalSpells) {
            await Charactermancer_AdditionalSpellsSelect.pApplyFormDataToActor(actor, formDataAdditionalSpells, {
                taskRunner,
                abilityAbv,
                parentAbilityAbv,
            }, );
        }
    }
}

class Charactermancer_Feature_Util {
    static addFauxOptionalFeatureEntries(featureList, optfeatList) {
        if (!featureList || !optfeatList)
            return;

        Object.values(featureList).forEach(arr=>{
            if (!(arr instanceof Array))
                return;

            for (const feature of arr) {
                if (!feature.entries?.length || !feature.optionalfeatureProgression)
                    continue;

                for (const optFeatProgression of feature.optionalfeatureProgression) {
                    this._addFauxOptionalFeatureFeatures_handleFeatProgression(optfeatList, feature, optFeatProgression, );
                }
            }
        }
        );
    }

    static _addFauxOptionalFeatureFeatures_handleFeatProgression(optfeatList, feature, optFeatProgression) {
        if (optFeatProgression.progression instanceof Array)
            return;

        if (!optFeatProgression.progression["*"])
            return;

        const availOptFeats = optfeatList.filter(it=>optFeatProgression.featureType instanceof Array && (optFeatProgression.featureType || []).some(ft=>it.featureType.includes(ft))).filter(it=>!ExcludeUtil.isExcluded(UrlUtil.URL_TO_HASH_BUILDER[UrlUtil.PG_OPT_FEATURES](it), "optionalfeature", it.source, {
            isNoCount: true
        }, ));

        feature.entries.push({
            type: "options",
            count: optFeatProgression.progression["*"],
            entries: availOptFeats.map(it=>({
                type: "refOptionalfeature",
                optionalfeature: DataUtil.proxy.getUid("optionalfeature", it, {
                    isMaintainCase: true
                }),
            })),
            data: {
                _plut_tmpOptionalfeatureList: true,
            },
        });
    }

    static getCleanedFeature_tmpOptionalfeatureList(feature) {
        const cpyFeature = MiscUtil.copy(feature);
        MiscUtil.getWalker().walk(cpyFeature, {
            array: (arr)=>{
                return arr.filter(it=>it.data == null || !it.data._plut_tmpOptionalfeatureList);
            }
            ,
        }, );
        return cpyFeature;
    }
}
//#endregion
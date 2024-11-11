class ActorCharactermancerSheet2 extends ActorCharactermancerSheet {
    $sheet;
    render(charInfo){
        ActorCharactermancerSheet.characterName = null;
        if(!!charInfo?.character?.about?.name?.length){ActorCharactermancerSheet.characterName = charInfo.character.about.name;}
        const tabSheet = this._tabSheet?.$wrpTab;
        if (!tabSheet) { return; }

        const wrapper = $$`<div class="ve-flex-col w-100 h-100 px-1 pt-1 overflow-y-auto ve-grow veapp__bg-foundry"></div>`;
        wrapper.appendTo(tabSheet);
        const sheet = $$`<div class="c5e sheet actor" ></div>`.appendTo(wrapper);
        this.$sheet = sheet;
        this.renderHandlebarsTemplate(sheet);

        C5e_Inventory.setupListeners();
      }

      renderHandlebarsTemplate(parentElement){

        const data = this.createFakeCharacterData();
        let template = new LoadTemplate(parentElement, "character-sheet", data);
        template.create((e)=>{
            this.activateTabNavigation();
            this.activateListeners();
        });
      }

      activateListeners(){
        //Make navigation respond to being clicked
        const nav = this.$sheet.find(".sheet-navigation.tabs");
        nav.click(evt=>{
            const targetTab = evt.target.getAttribute("data-tab");
            this.navigation_switchTab(targetTab);
        });
      }

      activateTabNavigation(activeTabName=null){
        //Choose an open tab name if none was specified
        if(activeTabName==null){
            const nav_tabs = this.$sheet.find(".sheet-navigation.tabs > [data-tab]");
            activeTabName = nav_tabs.eq(0).attr("data-tab");
        }

        this.navigation_switchTab(activeTabName);
      }
      navigation_switchTab(activeTabName){
        //Disable all tabs
        let nav_tabs = this.$sheet.find(".sheet-navigation.tabs > [data-tab]");
        let tabDivs = this.$sheet.find(".sheet-body > .tab");
        nav_tabs.toggleClass("active", false);
        tabDivs.toggleClass("active", false);
        //Enable the specific tab we want open
        nav_tabs = this.$sheet.find(`.sheet-navigation.tabs > [data-tab="${activeTabName}"]`);
        tabDivs = this.$sheet.find(`.sheet-body > .tab[data-tab="${activeTabName}"]`);
        nav_tabs.toggleClass("active", true);
        tabDivs.toggleClass("active", true);
      }

      createFakeCharacterData(){

        let abilities = [];
        const addAbility = (label, value, mod, save, baseProf, icon) => {
            abilities.push({label, value, mod, save, baseProf, icon});
        }
        addAbility("Strength", 10, 0, 0, 0, null);
        addAbility("Dexterity", 10, 0, 0, 0, null);

        let skills = {};
        let configSkills = [];
        const addSkill = (label, value, ability, baseValue, hover, icon, abbreviation, total, passive) => {
            skills[label.toLowerCase()] = {label, value, ability, baseValue, hover, icon, abbreviation, total, passive};
            configSkills.push(label.toLowerCase());
        }
        addSkill("Investigation", 10, "int", null, null, "Inv", 10, 12);

        let system = {
            attributes: {
                
            }
        };

        let hp = {
            value: 10,
            max: 20,
        };

        let inventory = {
            weapons: {
                label: "Weapons",
                items: [
                    { //Make this be an Item5e
                        name: "ItemName123",
                        type: "weapon",
                        system: {
                            quantity: 1,

                        }
                    }
                ]
            }
            
        };
        let elements = {inventory: "dnd5e-inventory"};

        return {actor:{name: "testName"}, system, hp, inventory, elements, labels:{}, movement:{}, abilities, skills, config:{skills:configSkills}};
      }
}
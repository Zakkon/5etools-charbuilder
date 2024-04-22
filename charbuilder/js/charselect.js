class CharacterSelectScreen {
    constructor(){

    }

    myContent;

    render(){

        ActorCharactermancerBaseComponent.class_clearDeleted();

        const _root = $("#window-root");

        const content = $$`<div></div>`;

        const btnNew = $$`<button>Create New Character</button>`;
        btnNew.click(() => {
            this.createNewCharacter();
        });

        const header = $$`
        <div class="character-screen-header">
            <h1>My Characters</h1>
            ${btnNew}
        </div>`;

        header.appendTo(content);

        const list = $$`<ul class="character-listing my-characters-listing">
        </ul>`;

        const hierarchy = $$`
        <div>
        ${list}
        </div>
        `;
        hierarchy.appendTo(content);

        content.appendTo(_root);
        this.myContent = content;

        const infos = CookieManager.getAllCharacterInfos();
        for(let ix = 0; ix < infos.length; ++ix){
            const result = infos[ix];
            if(!result){continue;}
            const card = this.createCharacterElement(this, result.uid);
            card.appendTo(list);
        }
    }

    createCharacterElement(parent, charUid){
        const defaultIconUrl = `charbuilder/img/default_img.jpg`;
        const url = `url(${defaultIconUrl})`;

        const btnView = $$`<button class="character-card-footer-links-button">View</button>`;
        btnView.click(() => {
            parent.openCharacter(charUid, true);
        });
        const btnEdit = $$`<button class="character-card-footer-links-button">Edit</button>`;
        btnEdit.click(() => {
            parent.openCharacter(charUid, false);
        });
        const btnDelete = $$`<button class="character-card-footer-links-button btn-dangerous">Delete</button>`;
        btnDelete.click(() => {
            parent.deleteCharacter(charUid);
            this.close();
            this.render();
        });

        //Get the character data
        const charData = CookieManager.getCharacterInfo(charUid).result.character;
        let classString = "";
        let totalLevels = 0;
        for(let ix = 0; ix < charData?.classes?.length || 0; ++ix){
            const d = charData.classes[ix];
            const mode = "classOnly";
            totalLevels += d.level;
            if(mode == "classOnly"){
                if(ix>0){classString+="/";}
                classString += `${d.name}`;
            }
            else { //classSubclass
                if(ix>0){classString+=" ";}
                classString += `${d.name}${d.subclass? `/${d.subclass.name}` : ""}`;
            }
        }
        if(classString == ""){classString = "No class";}
        let nameString = charData.about?.name || "Unnamed Character";
        let raceString = charData.race?.race?.name || "";
        let infoString = "";
        const addToInfoString = (str) => {if(str.length>0){infoString += (infoString.length>0?" | ":"") + str;}}
        addToInfoString(`Level ${totalLevels}`);
        addToInfoString(raceString);
        addToInfoString(classString);

        let div = $$`
        <li class="character-card-wrapper">
            <div class="character-card">
                <div class="character-card-header">
                    <div class="character-card-background-image">
                    </div>
                    <div class="character-card-header-upper">
                        <div class="character-card-header-upper-portrait">
                            <div class="user-selected-avatar image" style="background-image: ${url}"></div>
                        </div>
                        <div class="character-card-header-upper-info">
                            <h2 class="character-card-header-upper-info-header">${nameString}</h2>
                            <div class="character-card-header-upper-info-secondary">${infoString}</div>
                        </div>
                    </div>
                </div>
                <div class="character-card-footer">
                    <div class="character-card-footer-links">
                        ${btnView}
                        ${btnEdit}
                        ${btnDelete}
                    </div>
                </div>
            </div>
        </li>`;
        return div;
    }

    close(){
        this.myContent.remove();
    }
    createNewCharacter(){
        this.close();
        SourceManager.defaultStart({actor:null});
    }
    deleteCharacter(uid){
        CookieManager.deleteCharacter(uid);
    }
    openCharacter(uid, viewMode=false){
        console.log("Open character", uid);
        this.close();
        SourceManager.defaultStart({actor:null, cookieUid:uid, page:"sheet", viewMode:viewMode});
    }
}
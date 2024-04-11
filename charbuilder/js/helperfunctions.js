class HelperFunctions{

    /**
     * Will set the modal to only have the sources provided enabled (all others will be set to 0)
     * @param {ModalFilter} modalFilter
     * @param {String[]} sourcesToUse example: ["PHB", "XGE", "TCE"]
     */
    static setModalFilterSourcesStrings(modalFilter, sourcesToUse){
        let sources = {};
        for(let src of sourcesToUse){
            sources[src] = 1;
        }
        modalFilter.pageFilter.filterBox.setFromValues({Source: sources});
    }

    static getClassFeaturesFromClassInData(myData, cls){
        return myData.classFeature.filter(f => !!f && f.className == cls.name && f.classSource == cls.source);
    }

    static async loadJSONFile(localURL){
        //const localURL = "data/class/index.json";
        const result = await DataUtil.loadRawJSON(localURL);
        return result;
    }
}
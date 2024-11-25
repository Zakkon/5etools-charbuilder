class Hardcodings{

    static __data = {
        subclass: {
            "ranger_phb_gloom stalker_xge":{
                senses: {
                    darkvision: {
                        value: 120,
                        bonus_hasFromRaceAlready: 30
                    }
                }
            }
        }
    }

    static subclassToHash(scData){
        return `${scData.className}_${scData.classSource}_${scData.name}_${scData.source}`.toLowerCase();
    }
    static getSenses(type, entity){
        let hash;
        if(type == "subclass"){hash = this.subclassToHash(entity);}

        const data = Hardcodings.__data[type][hash];
        if(data == null){return null;}
        return data.senses;
    }
}
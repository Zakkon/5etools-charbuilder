class Roll{

    constructor(formula){
        this._formula = formula;
        this._roller = new rpgDiceRoller.DiceRoller();
    }

    /**
     * @param {{async:boolean}} options right now async does nothing, we always run sync
     * @returns {any}
     */
    evaluate(options){
        let roll = this._roller.roll(this._formula);
        let total = roll.total;
        let terms = [];
        let ex = roll.export(rpgDiceRoller.exportFormats.OBJECT);
        for(let r of ex.rolls){
            let results = [];
            for(let r2 of r.rolls){
                results.push({result: r2.initialValue});
            }
            terms.push({results:results});
        }
        this._roller.clearLog();
        this.total = total;
        this.terms = terms;
    }
    
}
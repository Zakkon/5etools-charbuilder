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
    evaluateSync(){
        return Roll._evaluateSync(this._formula);
    }
    static _evaluateSync(formula){
        // Use a regular expression to validate that the formula only contains numbers, spaces, and arithmetic operators
        if (/^[\d\s+\-*/().]+$/.test(formula)) {
            try {
                // Evaluate the formula using eval
                return eval(formula);
            } catch (error) {
                console.error("Error evaluating formula:", formula, error);
                return null;
            }
        } else {
            console.error("Invalid formula format", formula);
            return null;
        }
    }
    toMessage({sound}){
        //Do nothing atm
    }

    /**
     * Replace referenced data attributes in the roll formula with values from the provided data.
     * Data references in the formula use the @attr syntax and would reference the corresponding attr key.
     *
     * @param {string} formula          The original formula within which to replace
     * @param {object} data             The data object which provides replacements
     * @param {object} [options]        Options which modify formula replacement
     * @param {string} [options.missing]      The value that should be assigned to any unmatched keys.
     *                                        If null, the unmatched key is left as-is.
     * @param {boolean} [options.warn=false]  Display a warning notification when encountering an un-matched key.
     * @static
     */
    static replaceFormulaData(formula, data, {missing, warn=true}={}) {
        let dataRgx = new RegExp(/@([a-z.0-9_-]+)/gi);
        return formula.replace(dataRgx, (match, term) => {
            let value = PropUtils.getProperty(data, term);
            if ( value == null ) {
                if (warn) console.error("Missing data!", "match:", match, "term:", term, "data:", data);
                return (missing !== undefined) ? String(missing) : match;
            }
            return String(value).trim();
        });
    }
    /**
     * Convert a bonus value to a simple integer for displaying on the sheet.
     * @param {number|string|null} bonusFormula  Bonus formula.
     * @param {object} [data={}]          Data to use for replacing @ strings.
     * @returns {number}                  Simplified bonus as an integer.
     * @protected
     */
    static simplifyBonus(bonusFormula, data={}) {
        if (!bonusFormula) return 0;
        if (Number.isNumeric(bonusFormula)) {return Number(bonusFormula);}
        try {
            const roll = new Roll(bonusFormula, data);
            return roll.isDeterministic ? roll.evaluateSync().total : 0;
        }
        catch(error) {
            console.error(error);
            return 0;
        }
    }
}
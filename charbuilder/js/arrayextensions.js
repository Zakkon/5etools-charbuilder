Array.prototype.joinConjunct || Object.defineProperty(Array.prototype, "joinConjunct", {
    enumerable: false,
    writable: true,
    value: function(joiner, lastJoiner, nonOxford) {
        if (this.length === 0)
            return "";
        if (this.length === 1)
            return this[0];
        if (this.length === 2)
            return this.join(lastJoiner);
        else {
            let outStr = "";
            for (let i = 0; i < this.length; ++i) {
                outStr += this[i];
                if (i < this.length - 2)
                    outStr += joiner;
                else if (i === this.length - 2)
                    outStr += `${(!nonOxford && this.length > 2 ? joiner.trim() : "")}${lastJoiner}`;
            }
            return outStr;
        }
    },
});
Array.prototype.last || Object.defineProperty(Array.prototype, "last", {
    enumerable: false,
    writable: true,
    value: function(arg) {
        if (arg !== undefined)
            this[this.length - 1] = arg;
        else
            return this[this.length - 1];
    },
});

Array.prototype.filterIndex || Object.defineProperty(Array.prototype, "filterIndex", {
    enumerable: false,
    writable: true,
    value: function(fnCheck) {
        const out = [];
        this.forEach((it,i)=>{
            if (fnCheck(it))
                out.push(i);
        }
        );
        return out;
    },
});

Array.prototype.equals || Object.defineProperty(Array.prototype, "equals", {
    enumerable: false,
    writable: true,
    value: function(array2) {
        const array1 = this;
        if (!array1 && !array2)
            return true;
        else if ((!array1 && array2) || (array1 && !array2))
            return false;

        let temp = [];
        if ((!array1[0]) || (!array2[0]))
            return false;
        if (array1.length !== array2.length)
            return false;
        let key;
        for (let i = 0; i < array1.length; i++) {
            key = `${(typeof array1[i])}~${array1[i]}`;
            if (temp[key])
                temp[key]++;
            else
                temp[key] = 1;
        }
        for (let i = 0; i < array2.length; i++) {
            key = `${(typeof array2[i])}~${array2[i]}`;
            if (temp[key]) {
                if (temp[key] === 0)
                    return false;
                else
                    temp[key]--;
            } else
                return false;
        }
        return true;
    },
});

Array.prototype.segregate || Object.defineProperty(Array.prototype, "segregate", {
    enumerable: false,
    writable: true,
    value: function(fnIsValid) {
        return this.reduce(([pass,fail],elem)=>fnIsValid(elem) ? [[...pass, elem], fail] : [pass, [...fail, elem]], [[], []]);
    },
});

Array.prototype.partition || Object.defineProperty(Array.prototype, "partition", {
    enumerable: false,
    writable: true,
    value: Array.prototype.segregate,
});

Array.prototype.getNext || Object.defineProperty(Array.prototype, "getNext", {
    enumerable: false,
    writable: true,
    value: function(curVal) {
        let ix = this.indexOf(curVal);
        if (!~ix)
            throw new Error("Value was not in array!");
        if (++ix >= this.length)
            ix = 0;
        return this[ix];
    },
});

Array.prototype.shuffle || Object.defineProperty(Array.prototype, "shuffle", {
    enumerable: false,
    writable: true,
    value: function() {
        const len = this.length;
        const ixLast = len - 1;
        for (let i = 0; i < len; ++i) {
            const j = i + Math.floor(Math.random() * (ixLast - i + 1));
            [this[i],this[j]] = [this[j], this[i]];
        }
        return this;
    },
});

Array.prototype.mergeMap || Object.defineProperty(Array.prototype, "mergeMap", {
    enumerable: false,
    writable: true,
    value: function(fnMap) {
        return this.map((...args)=>fnMap(...args)).filter(it=>it != null).reduce((a,b)=>Object.assign(a, b), {});
    },
});

Array.prototype.first || Object.defineProperty(Array.prototype, "first", {
    enumerable: false,
    writable: true,
    value: function(fnMapFind) {
        for (let i = 0, len = this.length; i < len; ++i) {
            const result = fnMapFind(this[i], i, this);
            if (result)
                return result;
        }
    },
});

Array.prototype.pMap || Object.defineProperty(Array.prototype, "pMap", {
    enumerable: false,
    writable: true,
    value: async function(fnMap) {
        return Promise.all(this.map((it,i)=>fnMap(it, i, this)));
    },
});

Array.prototype.pSerialAwaitMap || Object.defineProperty(Array.prototype, "pSerialAwaitMap", {
    enumerable: false,
    writable: true,
    value: async function(fnMap) {
        const out = [];
        for (let i = 0, len = this.length; i < len; ++i)
            out.push(await fnMap(this[i], i, this));
        return out;
    },
});

Array.prototype.pSerialAwaitFilter || Object.defineProperty(Array.prototype, "pSerialAwaitFilter", {
    enumerable: false,
    writable: true,
    value: async function(fnFilter) {
        const out = [];
        for (let i = 0, len = this.length; i < len; ++i) {
            if (await fnFilter(this[i], i, this))
                out.push(this[i]);
        }
        return out;
    },
});

Array.prototype.pSerialAwaitFind || Object.defineProperty(Array.prototype, "pSerialAwaitFind", {
    enumerable: false,
    writable: true,
    value: async function(fnFind) {
        for (let i = 0, len = this.length; i < len; ++i)
            if (await fnFind(this[i], i, this))
                return this[i];
    },
});

Array.prototype.pSerialAwaitSome || Object.defineProperty(Array.prototype, "pSerialAwaitSome", {
    enumerable: false,
    writable: true,
    value: async function(fnSome) {
        for (let i = 0, len = this.length; i < len; ++i)
            if (await fnSome(this[i], i, this))
                return true;
        return false;
    },
});

Array.prototype.pSerialAwaitFirst || Object.defineProperty(Array.prototype, "pSerialAwaitFirst", {
    enumerable: false,
    writable: true,
    value: async function(fnMapFind) {
        for (let i = 0, len = this.length; i < len; ++i) {
            const result = await fnMapFind(this[i], i, this);
            if (result)
                return result;
        }
    },
});

Array.prototype.pSerialAwaitReduce || Object.defineProperty(Array.prototype, "pSerialAwaitReduce", {
    enumerable: false,
    writable: true,
    value: async function(fnReduce, initialValue) {
        let accumulator = initialValue === undefined ? this[0] : initialValue;
        for (let i = (initialValue === undefined ? 1 : 0), len = this.length; i < len; ++i) {
            accumulator = await fnReduce(accumulator, this[i], i, this);
        }
        return accumulator;
    },
});

Array.prototype.unique || Object.defineProperty(Array.prototype, "unique", {
    enumerable: false,
    writable: true,
    value: function(fnGetProp) {
        const seen = new Set();
        return this.filter((...args)=>{
            const val = fnGetProp ? fnGetProp(...args) : args[0];
            if (seen.has(val))
                return false;
            seen.add(val);
            return true;
        }
        );
    },
});

Array.prototype.zip || Object.defineProperty(Array.prototype, "zip", {
    enumerable: false,
    writable: true,
    value: function(otherArray) {
        const out = [];
        const len = Math.max(this.length, otherArray.length);
        for (let i = 0; i < len; ++i) {
            out.push([this[i], otherArray[i]]);
        }
        return out;
    },
});

Array.prototype.nextWrap || Object.defineProperty(Array.prototype, "nextWrap", {
    enumerable: false,
    writable: true,
    value: function(item) {
        const ix = this.indexOf(item);
        if (~ix) {
            if (ix + 1 < this.length)
                return this[ix + 1];
            else
                return this[0];
        } else
            return this.last();
    },
});

Array.prototype.prevWrap || Object.defineProperty(Array.prototype, "prevWrap", {
    enumerable: false,
    writable: true,
    value: function(item) {
        const ix = this.indexOf(item);
        if (~ix) {
            if (ix - 1 >= 0)
                return this[ix - 1];
            else
                return this.last();
        } else
            return this[0];
    },
});

Array.prototype.findLast || Object.defineProperty(Array.prototype, "findLast", {
    enumerable: false,
    writable: true,
    value: function(fn) {
        for (let i = this.length - 1; i >= 0; --i)
            if (fn(this[i]))
                return this[i];
    },
});

Array.prototype.findLastIndex || Object.defineProperty(Array.prototype, "findLastIndex", {
    enumerable: false,
    writable: true,
    value: function(fn) {
        for (let i = this.length - 1; i >= 0; --i)
            if (fn(this[i]))
                return i;
        return -1;
    },
});

Array.prototype.sum || Object.defineProperty(Array.prototype, "sum", {
    enumerable: false,
    writable: true,
    value: function() {
        let tmp = 0;
        const len = this.length;
        for (let i = 0; i < len; ++i)
            tmp += this[i];
        return tmp;
    },
});

Array.prototype.mean || Object.defineProperty(Array.prototype, "mean", {
    enumerable: false,
    writable: true,
    value: function() {
        return this.sum() / this.length;
    },
});

Array.prototype.meanAbsoluteDeviation || Object.defineProperty(Array.prototype, "meanAbsoluteDeviation", {
    enumerable: false,
    writable: true,
    value: function() {
        const mean = this.mean();
        return (this.map(num=>Math.abs(num - mean)) || []).mean();
    },
});

Map.prototype.getOrSet || Object.defineProperty(Map.prototype, "getOrSet", {
    enumerable: false,
    writable: true,
    value: function(k, orV) {
        if (this.has(k))
            return this.get(k);
        this.set(k, orV);
        return orV;
    },
});
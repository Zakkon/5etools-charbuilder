String.prototype.uppercaseFirst = String.prototype.uppercaseFirst || function() {
    const str = this.toString();
    if (str.length === 0)
        return str;
    if (str.length === 1)
        return str.charAt(0).toUpperCase();
    return str.charAt(0).toUpperCase() + str.slice(1);
}
;

String.prototype.lowercaseFirst = String.prototype.lowercaseFirst || function() {
    const str = this.toString();
    if (str.length === 0)
        return str;
    if (str.length === 1)
        return str.charAt(0).toLowerCase();
    return str.charAt(0).toLowerCase() + str.slice(1);
}
;

String.prototype.toTitleCase = String.prototype.toTitleCase || function() {
    let str = this.replace(/([^\W_]+[^-\u2014\s/]*) */g, m0=>m0.charAt(0).toUpperCase() + m0.substring(1).toLowerCase());

    StrUtil._TITLE_LOWER_WORDS_RE = StrUtil._TITLE_LOWER_WORDS_RE || StrUtil.TITLE_LOWER_WORDS.map(it=>new RegExp(`\\s${it}\\s`,"gi"));
    StrUtil._TITLE_UPPER_WORDS_RE = StrUtil._TITLE_UPPER_WORDS_RE || StrUtil.TITLE_UPPER_WORDS.map(it=>new RegExp(`\\b${it}\\b`,"g"));
    StrUtil._TITLE_UPPER_WORDS_PLURAL_RE = StrUtil._TITLE_UPPER_WORDS_PLURAL_RE || StrUtil.TITLE_UPPER_WORDS_PLURAL.map(it=>new RegExp(`\\b${it}\\b`,"g"));

    const len = StrUtil.TITLE_LOWER_WORDS.length;
    for (let i = 0; i < len; i++) {
        str = str.replace(StrUtil._TITLE_LOWER_WORDS_RE[i], txt=>txt.toLowerCase(), );
    }

    const len1 = StrUtil.TITLE_UPPER_WORDS.length;
    for (let i = 0; i < len1; i++) {
        str = str.replace(StrUtil._TITLE_UPPER_WORDS_RE[i], StrUtil.TITLE_UPPER_WORDS[i].toUpperCase(), );
    }

    for (let i = 0; i < len1; i++) {
        str = str.replace(StrUtil._TITLE_UPPER_WORDS_PLURAL_RE[i], `${StrUtil.TITLE_UPPER_WORDS_PLURAL[i].slice(0, -1).toUpperCase()}${StrUtil.TITLE_UPPER_WORDS_PLURAL[i].slice(-1).toLowerCase()}`, );
    }

    str = str.split(/([;:?!.])/g).map(pt=>pt.replace(/^(\s*)([^\s])/, (...m)=>`${m[1]}${m[2].toUpperCase()}`)).join("");

    return str;
}
;

String.prototype.toSentenceCase = String.prototype.toSentenceCase || function() {
    const out = [];
    const re = /([^.!?]+)([.!?]\s*|$)/gi;
    let m;
    do {
        m = re.exec(this);
        if (m) {
            out.push(m[0].toLowerCase().uppercaseFirst());
        }
    } while (m);
    return out.join("");
}
;

String.prototype.toSpellCase = String.prototype.toSpellCase || function() {
    return this.toLowerCase().replace(/(^|of )(bigby|otiluke|mordenkainen|evard|hadar|agathys|abi-dalzim|aganazzar|drawmij|leomund|maximilian|melf|nystul|otto|rary|snilloc|tasha|tenser|jim)('s|$| )/g, (...m)=>`${m[1]}${m[2].toTitleCase()}${m[3]}`);
}
;

String.prototype.toCamelCase = String.prototype.toCamelCase || function() {
    return this.split(" ").map((word,index)=>{
        if (index === 0)
            return word.toLowerCase();
        return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
    }
    ).join("");
};
String.prototype.capitalizeEachWord = String.prototype.capitalizeEachWord || function(){
    return this
    .toLowerCase()
    .split(' ')
    .map(function(word) {
        return word[0].toUpperCase() + word.substr(1);
    })
    .join(' ');
};

String.prototype.toPlural = String.prototype.toPlural || function() {
    let plural;
    if (StrUtil.IRREGULAR_PLURAL_WORDS[this.toLowerCase()])
        plural = StrUtil.IRREGULAR_PLURAL_WORDS[this.toLowerCase()];
    else if (/(s|x|z|ch|sh)$/i.test(this))
        plural = `${this}es`;
    else if (/[bcdfghjklmnpqrstvwxyz]y$/i.test(this))
        plural = this.replace(/y$/i, "ies");
    else
        plural = `${this}s`;

    if (this.toLowerCase() === this)
        return plural;
    if (this.toUpperCase() === this)
        return plural.toUpperCase();
    if (this.toTitleCase() === this)
        return plural.toTitleCase();
    return plural;
}
;

String.prototype.escapeQuotes = String.prototype.escapeQuotes || function() {
    return this.replace(/'/g, `&apos;`).replace(/"/g, `&quot;`).replace(/</g, `&lt;`).replace(/>/g, `&gt;`);
}
;

String.prototype.qq = String.prototype.qq || function() {
    return this.escapeQuotes();
}
;

String.prototype.unescapeQuotes = String.prototype.unescapeQuotes || function() {
    return this.replace(/&apos;/g, `'`).replace(/&quot;/g, `"`).replace(/&lt;/g, `<`).replace(/&gt;/g, `>`);
}
;

String.prototype.uq = String.prototype.uq || function() {
    return this.unescapeQuotes();
}
;

String.prototype.encodeApos = String.prototype.encodeApos || function() {
    return this.replace(/'/g, `%27`);
}
;

String.prototype.distance = String.prototype.distance || function(target) {
    let source = this;
    let i;
    let j;
    if (!source)
        return target ? target.length : 0;
    else if (!target)
        return source.length;

    const m = source.length;
    const n = target.length;
    const INF = m + n;
    const score = new Array(m + 2);
    const sd = {};
    for (i = 0; i < m + 2; i++)
        score[i] = new Array(n + 2);
    score[0][0] = INF;
    for (i = 0; i <= m; i++) {
        score[i + 1][1] = i;
        score[i + 1][0] = INF;
        sd[source[i]] = 0;
    }
    for (j = 0; j <= n; j++) {
        score[1][j + 1] = j;
        score[0][j + 1] = INF;
        sd[target[j]] = 0;
    }

    for (i = 1; i <= m; i++) {
        let DB = 0;
        for (j = 1; j <= n; j++) {
            const i1 = sd[target[j - 1]];
            const j1 = DB;
            if (source[i - 1] === target[j - 1]) {
                score[i + 1][j + 1] = score[i][j];
                DB = j;
            } else {
                score[i + 1][j + 1] = Math.min(score[i][j], Math.min(score[i + 1][j], score[i][j + 1])) + 1;
            }
            score[i + 1][j + 1] = Math.min(score[i + 1][j + 1], score[i1] ? score[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1) : Infinity);
        }
        sd[source[i - 1]] = i;
    }
    return score[m + 1][n + 1];
}
;

String.prototype.isNumeric = String.prototype.isNumeric || function() {
    return !isNaN(parseFloat(this)) && isFinite(this);
}
;

String.prototype.last = String.prototype.last || function() {
    return this[this.length - 1];
};

String.prototype.escapeRegexp = String.prototype.escapeRegexp || function() {
    return this.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
};

String.prototype.toUrlified = String.prototype.toUrlified || function() {
    return encodeURIComponent(this.toLowerCase()).toLowerCase();
}
;

String.prototype.toChunks = String.prototype.toChunks || function(size) {
    const numChunks = Math.ceil(this.length / size);
    const chunks = new Array(numChunks);
    for (let i = 0, o = 0; i < numChunks; ++i,
    o += size)
        chunks[i] = this.substr(o, size);
    return chunks;
}
;

String.prototype.toAscii = String.prototype.toAscii || function() {
    return this.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/Æ/g, "AE").replace(/æ/g, "ae");
}
;

String.prototype.trimChar = String.prototype.trimChar || function(ch) {
    let start = 0;
    let end = this.length;
    while (start < end && this[start] === ch)
        ++start;
    while (end > start && this[end - 1] === ch)
        --end;
    return (start > 0 || end < this.length) ? this.substring(start, end) : this;
}
;

String.prototype.trimAnyChar = String.prototype.trimAnyChar || function(chars) {
    let start = 0;
    let end = this.length;
    while (start < end && chars.indexOf(this[start]) >= 0)
        ++start;
    while (end > start && chars.indexOf(this[end - 1]) >= 0)
        --end;
    return (start > 0 || end < this.length) ? this.substring(start, end) : this;
};
/**
   * Test whether a value is numeric.
   * This is the highest performing algorithm currently available, per https://jsperf.com/isnan-vs-typeof/5
   * @memberof Number
   * @param {*} n       A value to test
   * @return {boolean}  Is it a number?
   */
function isNumeric(n) {
    if ( n instanceof Array ) return false;
    else if ( [null, ""].includes(n) ) return false;
    return +n === +n;
  }
Object.defineProperties(Number, {
    isNumeric: {value: isNumeric},
});
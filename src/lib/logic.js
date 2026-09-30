/* Binary addition from logic gates.
 * Full adder: p = a XOR b, sum = p XOR cin, g = a AND b, t = p AND cin, cout = g OR t.
 */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});

  function fullAdder(a, b, cin) {
    const p = a ^ b;
    const s = p ^ cin;
    const g = a & b;
    const t = p & cin;
    return { a, b, cin, p, s, g, t, cout: g | t };
  }

  // Bits are least-significant first: bits[0] is the ones column.
  function add(A, B, cin) {
    const stages = [];
    let c = cin || 0;
    for (let i = 0; i < A.length; i++) {
      const st = fullAdder(A[i], B[i], c);
      stages.push(st);
      c = st.cout;
    }
    return { stages, sum: stages.map((s) => s.s), cout: c };
  }

  const toBits = (n, w) => Array.from({ length: w }, (_, i) => (n >> i) & 1);
  const toInt = (bits) => bits.reduce((acc, b, i) => acc + (b << i), 0);

  const api = { fullAdder, add, toBits, toInt };
  OM.logic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

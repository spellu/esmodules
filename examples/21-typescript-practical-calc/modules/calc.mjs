var calc;
(function (calc) {
    function add(...args) {
        return args.reduce((previous, current) => previous + current, 0);
    }
    calc.add = add;
})(calc || (calc = {}));
(function (calc) {
    function sub(...args) {
        return args.reduce((previous, current) => previous - current, 0);
    }
    calc.sub = sub;
})(calc || (calc = {}));
export default calc;
//# sourceMappingURL=calc.mjs.map
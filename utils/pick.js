"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// utils/pick.ts
const pick = (obj, keys // ← accept readonly
) => keys.reduce((acc, k) => {
    if (obj[k] !== undefined)
        acc[k] = obj[k];
    return acc;
}, {});
exports.default = pick;

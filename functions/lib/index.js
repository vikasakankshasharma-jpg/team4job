"use strict";
'use server';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
admin.initializeApp();
const app = express();
app.post("/cashfree-webhook", (req, res) => {
    console.log("Received Cashfree webhook data:", req.body);
    res.json({ status: "received" });
});
exports.api = functions.https.onRequest(app);
// Zero-Cost Migration:
// Using /api/notifications/send (Brevo Proxy).
// Legacy Cloud Functions disabled to save costs.
// Enabled for Phase 10: Saved Search Alerts
__exportStar(require("./alerts"), exports);
//# sourceMappingURL=index.js.map
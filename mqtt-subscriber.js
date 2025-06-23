"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var mqtt_1 = require("mqtt");
var node_opcua_1 = require("node-opcua");
var fs = require("fs/promises");
var path = require("path");
var MQTT_URL = process.env.MQTT_BROKER_URL || "mqtt://192.168.0.211:1883";
var OPCUA_ENDPOINT = process.env.OPCUA_ENDPOINT || "opc.tcp://192.168.0.212:26543";
var CONFIG_DIR = path.join(__dirname, "Config");
function loadMappings() {
    return __awaiter(this, void 0, void 0, function () {
        var files, mappings, _i, files_1, file, raw, arr, _a, arr_1, entry;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, fs.readdir(CONFIG_DIR)];
                case 1:
                    files = _b.sent();
                    mappings = [];
                    _i = 0, files_1 = files;
                    _b.label = 2;
                case 2:
                    if (!(_i < files_1.length)) return [3 /*break*/, 5];
                    file = files_1[_i];
                    if (!file.endsWith(".json"))
                        return [3 /*break*/, 4];
                    return [4 /*yield*/, fs.readFile(path.join(CONFIG_DIR, file), "utf-8")];
                case 3:
                    raw = _b.sent();
                    try {
                        arr = JSON.parse(raw);
                        for (_a = 0, arr_1 = arr; _a < arr_1.length; _a++) {
                            entry = arr_1[_a];
                            if ((entry === null || entry === void 0 ? void 0 : entry.tag) && (entry === null || entry === void 0 ? void 0 : entry.topic) && (entry === null || entry === void 0 ? void 0 : entry.nodeId)) {
                                mappings.push(entry);
                            }
                        }
                        console.log("Loaded ".concat(file, " (").concat(arr.length, " topics)"));
                    }
                    catch (err) {
                        console.error("Failed to parse ".concat(file, ": ").concat(err.message));
                    }
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/, mappings];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var mappings, mqttClient, opcClient, session;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, loadMappings()];
                case 1:
                    mappings = _a.sent();
                    mqttClient = mqtt_1.default.connect(MQTT_URL, {
                        reconnectPeriod: 1000,
                        clientId: "mqtt-publisher-client"
                    });
                    opcClient = node_opcua_1.OPCUAClient.create({
                        applicationName: "MQTT-PLC-Bridge",
                        connectionStrategy: {
                            initialDelay: 1000,
                            maxRetry: 3
                        },
                        securityMode: node_opcua_1.MessageSecurityMode.None,
                        securityPolicy: node_opcua_1.SecurityPolicy.None,
                        endpointMustExist: false
                    });
                    console.log("Connecting to OPC-UA...");
                    return [4 /*yield*/, opcClient.connect(OPCUA_ENDPOINT)];
                case 2:
                    _a.sent();
                    console.log("Connected to OPC-UA at", OPCUA_ENDPOINT);
                    return [4 /*yield*/, opcClient.createSession()];
                case 3:
                    session = _a.sent();
                    console.log("OPC-UA session created");
                    mqttClient.on("connect", function () {
                        console.log("Connected to MQTT broker at ".concat(MQTT_URL));
                    });
                    setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                        var nodesToRead, results_1, valueMap_1, payload_1, err_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    nodesToRead = mappings.map(function (m) { return ({
                                        nodeId: m.nodeId,
                                        attributeId: node_opcua_1.AttributeIds.Value
                                    }); });
                                    return [4 /*yield*/, session.read(nodesToRead)];
                                case 1:
                                    results_1 = _a.sent();
                                    valueMap_1 = {};
                                    mappings.forEach(function (m, i) {
                                        var _a;
                                        valueMap_1[m.tag] = (_a = results_1[i].value) === null || _a === void 0 ? void 0 : _a.value;
                                    });
                                    payload_1 = {
                                        Timestamp: new Date().toISOString(),
                                        Robot: {
                                            Name: "R3",
                                            Status: {
                                                IsInitialized: valueMap_1["HMI_GVL.M.Rob2.INITIALIZED"],
                                                IsRunning: valueMap_1["HMI_GVL.M.Rob2.RUNNING"],
                                                IsPaused: valueMap_1["HMI_GVL.M.Rob2.PAUSED"],
                                                HasWorkcellViolation: valueMap_1["HMI_GVL.M.Rob2.WSVIOLATION"]
                                            },
                                            SpeedPercent: valueMap_1["HMI_GVL.M.Rob2.SPEEDPERCENTAGE"],
                                            Position: {
                                                X: valueMap_1["HMI_GVL.M.Rob2.ROBOTPOS.X"],
                                                Y: valueMap_1["HMI_GVL.M.Rob2.ROBOTPOS.Y"],
                                                Z: valueMap_1["HMI_GVL.M.Rob2.ROBOTPOS.Z"],
                                                W: valueMap_1["HMI_GVL.M.Rob2.ROBOTPOS.W"]
                                            },
                                            Torque: {
                                                T1: valueMap_1["HMI_GVL.M.Rob2.MACTTORQUE [1]"],
                                                T2: valueMap_1["HMI_GVL.M.Rob2.MACTTORQUE [2]"],
                                                T3: valueMap_1["HMI_GVL.M.Rob2.MACTTORQUE [3]"],
                                                T4: valueMap_1["HMI_GVL.M.Rob2.MACTTORQUE [4]"]
                                            }
                                        },
                                        Machine: {
                                            Status: {
                                                IsInitialized: valueMap_1["HMI_GVL.M.INITIALIZED"],
                                                IsRunning: valueMap_1["HMI_GVL.M.RUNNING"],
                                                IsPaused: valueMap_1["HMI_GVL.M.PAUSED"],
                                                IsSafetyEnabled: valueMap_1["HMI_GVL.M.SAFETY_ENABLE"],
                                                FinishedPartCount: valueMap_1["HMI_GVL.M.FINISHEDPARTNUM"]
                                            }
                                        }
                                    };
                                    mqttClient.publish("m/conestoga/capstone/recycling/team3/line/sorter/R3", JSON.stringify(payload_1), { qos: 1 }, function (err) {
                                        if (err)
                                            console.error("Publish failed:", err.message);
                                        else
                                            console.log(" Published robot/summary →", payload_1);
                                    });
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_1 = _a.sent();
                                    console.error(" OPC-UA read error:", err_1.message);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); }, 5000);
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (err) {
    console.error("Fatal startup error:", err);
    process.exit(1);
});

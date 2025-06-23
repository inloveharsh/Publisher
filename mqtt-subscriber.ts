import "dotenv/config";
import mqtt, { MqttClient } from "mqtt";
import {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  AttributeIds
} from "node-opcua";
import * as fs from "fs/promises";
import * as path from "path";

interface Mapping {
  tag: string;
  topic: string;
  nodeId: string;
}

const MQTT_URL = process.env.MQTT_BROKER_URL || "mqtt://192.168.0.211:1883";
const OPCUA_ENDPOINT = process.env.OPCUA_ENDPOINT || "opc.tcp://192.168.0.212:26543";
const CONFIG_DIR = path.join(__dirname, "Config");

async function loadMappings(): Promise<Mapping[]> {
  const files = await fs.readdir(CONFIG_DIR);
  const mappings: Mapping[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(CONFIG_DIR, file), "utf-8");
    try {
      const arr = JSON.parse(raw);
      for (const entry of arr) {
        if (entry?.tag && entry?.topic && entry?.nodeId) {
          mappings.push(entry);
        }
      }
      console.log(`Loaded ${file} (${arr.length} topics)`);
    } catch (err: any) {
      console.error(`Failed to parse ${file}: ${err.message}`);
    }
  }

  return mappings;
}

async function main(): Promise<void> {
  const mappings = await loadMappings();

  const mqttClient: MqttClient = mqtt.connect(MQTT_URL, {
    reconnectPeriod: 1000,
    clientId: "mqtt-publisher-client"
  });

  const opcClient = OPCUAClient.create({
    applicationName: "MQTT-PLC-Bridge",
    connectionStrategy: {
      initialDelay: 1000,
      maxRetry: 3
    },
    securityMode: MessageSecurityMode.None,
    securityPolicy: SecurityPolicy.None,
    endpointMustExist: false
  });

  console.log("Connecting to OPC-UA...");
  await opcClient.connect(OPCUA_ENDPOINT);
  console.log("Connected to OPC-UA at", OPCUA_ENDPOINT);

  const session = await opcClient.createSession();
  console.log("OPC-UA session created");

  mqttClient.on("connect", () => {
    console.log(`Connected to MQTT broker at ${MQTT_URL}`);
  });

  setInterval(async () => {
    try {
      const nodesToRead = mappings.map(m => ({
        nodeId: m.nodeId,
        attributeId: AttributeIds.Value
      }));

      const results = await session.read(nodesToRead);
      const valueMap: Record<string, any> = {};
      mappings.forEach((m, i) => {
        valueMap[m.tag] = results[i].value?.value;
      });

      const payload = {
        Timestamp: new Date().toISOString(),
        Robot: {
          Name: "R3",
          Status: {
            IsInitialized: valueMap["HMI_GVL.M.Rob2.INITIALIZED"],
            IsRunning: valueMap["HMI_GVL.M.Rob2.RUNNING"],
            IsPaused: valueMap["HMI_GVL.M.Rob2.PAUSED"],
            HasWorkcellViolation: valueMap["HMI_GVL.M.Rob2.WSVIOLATION"]
          },
          SpeedPercent: valueMap["HMI_GVL.M.Rob2.SPEEDPERCENTAGE"],
          Position: {
            X: valueMap["HMI_GVL.M.Rob2.ROBOTPOS.X"],
            Y: valueMap["HMI_GVL.M.Rob2.ROBOTPOS.Y"],
            Z: valueMap["HMI_GVL.M.Rob2.ROBOTPOS.Z"],
            W: valueMap["HMI_GVL.M.Rob2.ROBOTPOS.W"]
          },
          Torque: {
            T1: valueMap["HMI_GVL.M.Rob2.MACTTORQUE [1]"],
            T2: valueMap["HMI_GVL.M.Rob2.MACTTORQUE [2]"],
            T3: valueMap["HMI_GVL.M.Rob2.MACTTORQUE [3]"],
            T4: valueMap["HMI_GVL.M.Rob2.MACTTORQUE [4]"]
          }
        },
        Machine: {
          Status: {
            IsInitialized: valueMap["HMI_GVL.M.INITIALIZED"],
            IsRunning: valueMap["HMI_GVL.M.RUNNING"],
            IsPaused: valueMap["HMI_GVL.M.PAUSED"],
            IsSafetyEnabled: valueMap["HMI_GVL.M.SAFETY_ENABLE"],
            FinishedPartCount: valueMap["HMI_GVL.M.FINISHEDPARTNUM"]
          }
        }
      };

      mqttClient.publish("m/conestoga/capstone/recycling/team3/line/sorter/R3", JSON.stringify(payload), { qos: 1 }, err => {
        if (err) console.error("Publish failed:", err.message);
        else console.log(" Published robot/summary →", payload);
      });
    } catch (err: any) {
      console.error(" OPC-UA read error:", err.message);
    }
  }, 5000);
}

main().catch(err => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

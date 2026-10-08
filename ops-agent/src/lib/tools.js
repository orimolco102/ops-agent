// first tool: check_service_health
// second tool: get_recent_logs
// third tool: get_production_info


import { tool } from "@openai/agents";
import { z } from "zod";
import { callDemoService } from "./demo-service";

export const checkServiceHealth = tool({
    name: "check_service_health",
    description: "checks the orders api / health. request GET /api/orders",
    parameters: z.object({}),

    async execute() {
        console.log("check_service_health is running");
        const health = await callDemoService("/halth");
        const order = await callDemoService("/api/orders");

        return { health, order};
    },
});

export const GetRecentLogs = tool({
    name: "get_recent_logs",
        description: "gets the last 20 lines of orders api, newes first",
        parameters: z.object({}),

        async execute() {
            console.log("get_recent_logs is running");
            const result = await callDemoService("/logs");

            if(!result.body) return result;

            return result.body.map((line) => ({
                ...line,
                message: line.message.slice(0,200),
            }));
        }, 
});

export const GetProductionInfo = tool({
    name: "get_production_info",
    description: "returns which version of orders api is currently running",
    parameters: z.object({}),

    async execute() {
        console.log("get_production_info is running");
        await callDemoService("/version");
    }
});  
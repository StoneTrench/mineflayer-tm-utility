import { AddBot, BotProfile, Bots, ServerProfile } from "./swarmManager";
import { taskManager } from "mineflayer-task-manager";
import { goals, pathfinder } from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import { utility } from "./plugins/utility-tm";
import { deforest } from "./plugins/deforest-tm";
import { music } from "./plugins/music-tm";
import { excavate } from "./plugins/excavate-tm";
import { crafting } from "./plugins/crafting-tm";
import { build } from "./plugins/build-tm";
import { gather } from "./plugins/gather.tm";
import { Plugin } from "mineflayer";
import CreateInterface from "./plugins/controlInterface-tm";

async function main() {
    const controlInterface = CreateInterface();

    for (let i = 0; i < 3; i++) {
        const bot = await MakeBot("Steven" + i, controlInterface.plugin);

        bot.on("whisper", (username, message) => {
            console.log(`${username} > ${message}`)
            if (username != "StoneTrench") return;
            const command = message.split(" ")[0];
            controlInterface.callAddTmFunc(-1, command, message.substring(command.length + 1));
        })
    }

    const playerPos = Bots[0].players["StoneTrench"].entity.position;
    const goal = new goals.GoalNear(playerPos.x, playerPos.y, playerPos.z, 3);
}

function SortPositions(voxels: Vec3[]) {
    const strSorted: Vec3[] = []

    let currStr = voxels[0];
    for (let index = 0; index < voxels.length; index++) {
        strSorted.push(currStr)
        const filtered = voxels.filter(e => !strSorted.includes(e));
        if (filtered.length == 0) break;
        currStr = filtered.reduce((a, b) => currStr.distanceSquared(b.clone().offset(0, -1, 0)) < currStr.distanceSquared(a.clone().offset(0, 1, 0)) ? b : a)
    }

    return strSorted;
}
function dec2bin(dec: number) {
    return (dec >>> 0).toString(2);
}
function bin2dec(binary: string) {
    let result = 0
    for (let i = 0; i < binary.length; i++) result = result << 1 | (binary[i] == "1" ? 1 : 0)
    return result;
}
main();

export async function MakeBot(name: string, controlPlugin: Plugin) {
    const bot = await AddBot(
        new BotProfile(name, "00000000"),
        new ServerProfile("BenisLand", "localhost", 25565),
        [
            taskManager, pathfinder, utility, deforest, music, excavate, crafting, build, gather, controlPlugin
        ]
    );

    bot.debugU.on("totalLog", console.log)

    return bot;
}
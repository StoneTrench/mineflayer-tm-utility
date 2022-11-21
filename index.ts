import { AddBot, BotProfile, Bots, ServerProfile } from "./swarmManager";
import { taskManager } from "mineflayer-task-manager";
import { goals, pathfinder } from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import { utility } from "./plugins/utility-tm";
import { chat } from "./plugins/chat-tm";
import { deforest } from "./plugins/deforest-tm";
import { music } from "./plugins/music-tm";
import { excavate } from "./plugins/excavate-tm";
import { crafting } from "./plugins/crafting-tm";
import { build, PlanBlock } from "./plugins/build-tm";
import { gather } from "./plugins/gather.tm";

async function main() {
    const bot = await MakeBot("Steven0")

    //await bot.crafting.CraftCascadeItem(bot.mcData.itemsByName.stick.id, null, 1)

    //bot.qta(bot.crafting.CraftCItem(bot.mcData.itemsByName.chest.id, null, 16, bot.findBlock({ matching: bot.mcData.blocksByName.crafting_table.id })))
    //bot.qta(bot.utility.DigBlock(new Vec3(-381, 67, -888)))
    //bot.qta(bot.utility.PlaceBlock(new Vec3(-381, 67, -888), "furnace"))

    // await bot.craft(recipes[0], 4);
    // await bot.craft(recipes[1], 1);

    return;

    // bot.on("physicsTick", () => {
    //     const elyItem = bot.inventory.items().find(e => e.name.includes('elytra'))
    //     if (elyItem != null)
    //         bot.equip(elyItem, "torso");

    //     if (bot.entity.equipment.find(e => e != null && e.name.includes('elytra')) != null) {
    //         bot.setControlState("jump", true);
    //         bot.setControlState("jump", false);
    //         bot.setControlState("jump", true);
    //         bot.setControlState("jump", false);
    //         bot.setControlState("sprint", true);
    //         bot.setControlState("sprint", false);
    //         bot.elytraPlus.controlHeight(true);
    //     }
    // })

    // bot.music.DetectNoteblocks();

    // const song = bot.music.LoadSong("midi.sh");
    // //song.notes = song.notes.map(e => { return { note: e.note == -1 ? -1 : e.note + 2, duration: e.duration } })

    // const NoteMap = song.notes.map(e => e.note).filter((e, i, a) => a.indexOf(e) == i);
    // console.log(NoteMap);

    // bot.taskManager.Add("T", bot.music.TuneNoteBlocks(NoteMap));
    // bot.taskManager.Add("T", bot.music.Play(song), 1000);

    // let HearingSong = false;
    // let time = 0;
    // let recording = []
    // bot.on("noteHeard", (bloc, instrument, pitch) => {
    //     if (!HearingSong) {
    //         HearingSong = true;
    //         time = Date.now();
    //     }
    //     recording.push({ note: pitch, duration: Math.round((Date.now() - time) / 10) / 100 });
    //     time = Date.now();
    // })
    // bot.on("chat", (username, message) => {
    //     if (username == bot.username) return;

    //     if (message.includes("Tell me")) {
    //         console.log(recording.map((e, i, a) => `${bot.music.NoteBlockData.GetNoteFromNoteIndex(e.note)} ${a[i + 1] ? a[i + 1].duration : 0}`).join("\r\n"))
    //         HearingSong = false;
    //     }
    // })

    return;

    //#region OLD
    bot.on("physicsTick", () => {
        // const tasks = bot.taskManager.GetWholeQueue();
        // if (tasks.length > 0)
        //     console.log(tasks.map(e => e.name).join(", "))
    })

    //bot.taskManager.Add("Dig", Task_DigArea(new Vec3(88, 71, -15), new Vec3(83, 70, -22)));

    const grass = bot.findBlocks({
        matching: bot.mcData.blocksByName["tallgrass"].id, count: 128, maxDistance: 128
    })//.sort((a, b) => bot.entity.position.distanceSquared(a) - bot.entity.position.distanceSquared(b))
    console.log(grass)

    // for (let g = 0; g < grass.length; g++) {
    //     bot.taskManager.Add("Grass", bot.utility.DigBlock(grass[g]));
    // }

    bot.taskManager.Add("Toss", bot.utility.ThrowItemsAt(bot.players["StoneTrench"].entity.position))

    // function Loop() {
    //     const target = bot.players["StoneTrench"].entity.position;
    //     if (grass.length > 0) {
    //         bot.taskManager.Add("Loop", Loop)
    //     }
    // }
    // bot.taskManager.Add("Loop", Loop)
    //#endregion
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

export async function MakeBot(name: string) {
    const plugins = [
        taskManager, pathfinder, utility, deforest, music, excavate, crafting, chat, build, gather
    ]

    const bot = await AddBot(
        new BotProfile(name, "00000000"),
        new ServerProfile("BenisLand", "localhost", 25565),
        plugins
    );
    
    bot.debugU.on("totalLog", console.log)

    return bot;
}
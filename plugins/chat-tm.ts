import { Bot, Player } from "mineflayer";
import { goals } from "mineflayer-pathfinder";
import { Action } from "mineflayer-task-manager";
import { Vec3 } from "vec3";
import { MakeBot } from "..";
import { Bots } from "../swarmManager";
import { PlanBlock } from "./build-tm";
import { faceChecks } from "./utility-tm";

type CommandAction = (bot: Bot, player: Player, words: string[]) => void | Promise<void>;
class Command {
    keyWords: string[][];
    action: CommandAction;
    match: (words: string[]) => boolean
    setFunction: (action: CommandAction) => Command;
    constructor(keyWords: string[][]) {
        this.keyWords = keyWords;
        this.match = (words) => {
            return keyWords.some(a => a.every(b => words.includes(b)))
        }
        this.setFunction = (action) => {
            this.action = action
            return this;
        }
    }
}
const commands: Command[] = [
    new Command([["come", "here"], ["here"], ["come"], ["come", "to", "me"]]).setFunction((bot, player) => {
        const target = player.entity.position;
        const goal = new goals.GoalNear(target.x, target.y, target.z, 3);
        bot.taskManager.Add("Goto", bot.utility.PathTo(goal, 10));
    }),
    new Command([["give"], ["give", "me"], ["give", "me", "your", "stuff"]]).setFunction((bot, player) => {
        bot.qta(bot.utility.ThrowItemsAt(player.entity.position.offset(0, 0.1, 0)));
    }),
    new Command([["stop"], ["halt"], ["cancel"], ["reset"]]).setFunction((bot, player) => {
        bot.utility.Reset();
    }),
    new Command([["craft"], ["make"]]).setFunction((bot, player, words) => {
        let count = parseInt(words[1]);
        let item = words[2];

        if (bot.mcData.itemsByName[item])
            bot.qta(bot.crafting.CraftCItem(bot.mcData.itemsByName[item].id, null, count, bot.findBlock({ matching: bot.mcData.blocksByName.crafting_table.id })))
    }),
    new Command([["gather"]]).setFunction((bot, player, words) => {
        let count = parseInt(words[1]);
        let item = words[2];

        if (bot.mcData.itemsByName[item])
            bot.qta(bot.gather.Gather(bot.mcData.itemsByName[item].id, count, false))
    }),
    new Command([["find"], ["bring"]]).setFunction((bot, player, words) => {
        let count = parseInt(words[1]);
        let item = words[2];

        if (bot.mcData.itemsByName[item])
            bot.qta(bot.crafting.FindItemInChests({ itemType: bot.mcData.itemsByName[item].id, metadata: null, count: count }));
    }),
    new Command([["dump"]]).setFunction((bot, player, words) => {
        const items = bot.inventory.items().sort((a, b) => a.name.localeCompare(b.name));

        for (let i = 0; i < items.length; i++) {
            const e = items[i];
            bot.taskManager.Add("Dump", bot.crafting.DumpItemInChests({ itemType: e.type, metadata: e.metadata, count: e.count }))
        }
    }),
    new Command([["mine"]]).setFunction((bot, player, words) => {
        if (bot.username != Bots[0].username) return;

        for (let i = 0; i < Bots.length; i++) {
            Bots[i].qta(Bots[i].excavate.SpiralStaircase(player.entity.position.floored().offset(0, 0, 3 * i), 32))
        }
    }),
    new Command([["deforest"]]).setFunction((bot, player, words) => {
        const trees = bot.deforest.FindTrees(words[1] as any, 32);
        bot.qta(bot.deforest.CutDownTree(trees[0]));
    }),
    // new Command([["multiply"]]).setFunction((bot, player, words) => {
    //     if (bot.username != Bots[0].username) return;
    //     bot.qta(() => { MakeBot(words[1]) })
    // }),
    new Command([["collect"]]).setFunction((bot, player, words) => {
        if (bot.username != Bots[0].username) return;
        bot.qta(bot.utility.PickUpItems())
    }),
    new Command([["test"]]).setFunction((bot, player, words) => {
        for (let i = 0; i < 20; i++) {
            Tower(bot.entity.position.offset(Math.random() * 50, 0, Math.random() * 50).floor(), Math.floor(Math.random() * 10) + 4);
        }

        function Tower(pos: Vec3, height: number) {
            for (let iter = 0; iter < 8; iter++) {
                let blocks: PlanBlock[] = []

                let map: boolean[][] = []

                const size = 4;
                const PanelSize = 3;

                for (let x = 0; x < size; x++) {
                    map.push([]);
                    for (let y = 0; y < size; y++) {
                        map[x].push(Math.random() > 0.5)
                    }
                }

                const surr = [
                    [-1, 0],
                    [1, 0],
                    [0, -1],
                    [0, 1],
                ]
                const surrToEnum = ["-x", "x", "-z", "z"]

                for (let x = 0; x < size; x++) {
                    for (let y = 0; y < size; y++) {

                        if (!map[x][y]) continue;

                        blocks = blocks.concat(
                            bot.build.generateShapes.Panels(pos.floored().offset(PanelSize * x, PanelSize * iter, PanelSize * y), new Vec3(PanelSize, PanelSize, PanelSize), surr.map(e => {
                                if (map[e[0] + x] == null) return false;
                                if (map[e[0] + x][e[1] + y] == null) return false;

                                return map[e[0] + x][e[1] + y];
                            }).map((e, i) => e ? null : surrToEnum[i]).filter(e => e).concat(["-y", "y"]) as any, {
                                type: "loopStep", itemType: [
                                    bot.mcData.itemsByName.cobblestone.id,
                                    bot.mcData.itemsByName.andesite.id,
                                    bot.mcData.itemsByName.stone.id,
                                ]
                            })
                        );
                    }
                }

                bot.qta(bot.build.PlaceBlocks(blocks))
            }
        }

        // bot.build.generateShapes.Panels(player.entity.position.floored(), new Vec3(5, 8, 5), ["x", "-z", "-y"], {
        //     type: "loopStep", itemType: [
        //         bot.mcData.itemsByName.cobblestone.id,
        //         bot.mcData.itemsByName.andesite.id,
        //         bot.mcData.itemsByName.stone.id,
        //     ]
        // })
    })
]

export function chat(bot: Bot) {
    bot.on("chat", (username, message) => {
        console.log(`${username} : ${message}`)
        if (username == bot.username) return;

        const player = bot.players[username];
        if (player == null) return;
        const words = message.toLowerCase().split(" ")

        const cmd = commands.find(e => e.match(words))
        if (cmd != null) {
            cmd.action(bot, player, words)
        }
    })
}
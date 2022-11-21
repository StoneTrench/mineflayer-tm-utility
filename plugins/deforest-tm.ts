import { Bot, Player } from "mineflayer";
import { goals } from "mineflayer-pathfinder";
import { Action } from "mineflayer-task-manager";
import { Vec3 } from "vec3";
import { surroundChecks } from "./utility-tm";

export const belowSurroundChecks = surroundChecks.filter(e => e.y == -1)

declare type TreeTypes = "oak" | "spruce" | "birch" | "dark_oak" | "jungle" | "acacia";
declare type Tree = { position: Vec3; logs: Vec3[]; type: TreeTypes };

declare module "mineflayer" {
    interface Bot {
        deforest: {
            FindTrees: (type: TreeTypes, range: number) => Tree[];
            CutDownTree: (tree: Tree) => Action;
        }
    }
}

export function deforest(bot: Bot) {
    bot.deforest = {} as any;

    bot.deforest.FindTrees = (type, range) => {
        let logs = bot.findBlocks({
            matching: (block) => block.name == `${type}_log`,
            maxDistance: range,
            count: range * 8,
        })

        // Basically we step through each log, we check if they have logs below them, if they do they're not stumps.
        let stumps = logs.filter((log, index, arr) =>
            !belowSurroundChecks.some(surr =>
                arr.some(e =>
                    log.plus(surr).equals(e)
                )
            )
        )

        let Trees: Vec3[][] = [];

        for (let i = 0; i < stumps.length; i++)
            Trees.push([stumps[i]])

        for (let i = 0; i < logs.length; i++) {
            const log = logs[i];
            for (let s = 0; s < belowSurroundChecks.length; s++) {
                if (logs.some(e => log.plus(belowSurroundChecks[s]).equals(e)))
                    Trees[stumps.indexOf(stumps.reduce((a, b) => a.distanceSquared(log) < b.distanceSquared(log) ? a : b))].push(log);
            }
        }

        Trees = Trees.filter(a => a.some(b => surroundChecks.some(c => bot.blockAt(b.plus(c)).name.includes("leaves"))))

        return Trees.map(e => {
            return {
                position: e[0],
                logs: e.slice(1).sort((a, b) => a.y - b.y).concat([e[0]]),
                type: type
            } as Tree;
        });
    }
    bot.deforest.CutDownTree = (tree) => {
        return () => {
            if (tree == null) return;
            bot.taskManager.Insert("Collect", bot.utility.PickUpItems(8));
            bot.taskManager.Insert("CutDownTree", bot.utility.DigBlocks(tree.logs, false));
        }
    }
}
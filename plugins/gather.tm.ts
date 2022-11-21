import { Bot } from "mineflayer";
import { goals } from "mineflayer-pathfinder";
import { Action } from "mineflayer-task-manager";
import { Vec3 } from "vec3";
import { faceChecks } from "./utility-tm";

declare type Direction = "north" | "south" | "east" | "west";

declare module "mineflayer" {
    interface Bot {
        gather: {
            Gather: (itemType: number, count: number, requireTool?: boolean) => Action;
        }
    }
}

// West: -x North: -z East: x South: z

export function gather(bot: Bot) {
    bot.gather = {} as any;

    bot.gather.Gather = (itemType, count, requireTool = true) => {
        return () => {
            const blocks = bot.findBlocks({
                matching: (b) => bot.build.IsItemEqualToBlock(b.type, itemType),
                count: count
            })
            
            bot.taskManager.Insert("Gather", bot.utility.DigBlocks(blocks, requireTool, true));
        }
    }
}

// + 10 / e.manhattanDistanceTo(position)  + (blocks.find(b => b.equals(e.offset(0, 1, 0))) ? 0 : 10)
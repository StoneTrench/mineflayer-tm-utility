import { Bot } from "mineflayer";
import { goals } from "mineflayer-pathfinder";
import { Action } from "mineflayer-task-manager";
import { Vec3 } from "vec3";
import { faceChecks } from "./utility-tm";

declare type Direction = "north" | "south" | "east" | "west";

declare module "mineflayer" {
    interface Bot {
        excavate: {
            SpiralStaircase: (position: Vec3, depth: number) => Action;
            Staircase: (position: Vec3, depth: number, direction: Direction, width?: number, height?: number) => Action;
            Tunnel: (position: Vec3, length: number, direction: Direction, width?: number, height?: number) => Action;
            Quarry: (position: Vec3, depth: number, size?: number) => Action;
            DigArea: (pos1: Vec3, pos2: Vec3) => Action;
        }
    }
}

// West: -x North: -z East: x South: z

export function excavate(bot: Bot) {
    bot.excavate = {} as any;

    bot.excavate.SpiralStaircase = (position, depth) => {
        return () => {
            var blocks: Vec3[] = []

            const spiral = [0, 1, 3, 2];

            for (let i = 0; i < 4; i++) {
                for (let d = 0; d < depth; d++) {
                    if ((spiral[i] + d) % 4 != 0) {
                        blocks.push(position.offset(Math.floor(i / 2) - 1, -d, (i % 2)))
                    }
                }
            }

            GoAndDig(position, blocks);
        }
    }
    bot.excavate.Staircase = (position, depth, direction, width = 3, height = 3) => {
        return () => {
            var blocks: Vec3[] = []

            const [forward, right] = GetDirectionVectors(direction);

            for (let d = 0; d < depth; d++) {
                for (let w = 0; w < width; w++) {
                    for (let h = 0; h < height; h++) {
                        blocks.push(position.plus(forward.scaled(d)).plus(right.scaled(w)).offset(0, -d + h, 0))
                    }
                }
            }

            GoAndDig(position, blocks);
        }
    }
    bot.excavate.Tunnel = (position, length, direction, width = 3, height = 3) => {
        return () => {
            var blocks: Vec3[] = []

            const [forward, right] = GetDirectionVectors(direction);

            for (let d = 0; d < length; d++) {
                for (let w = 0; w < width; w++) {
                    for (let h = 0; h < height; h++) {
                        blocks.push(position.plus(forward.scaled(d)).plus(right.scaled(w)).offset(0, h, 0))
                    }
                }
            }

            GoAndDig(position, blocks);
        }
    }
    bot.excavate.Quarry = (position, depth, size = 2) => {
        return () => {
            var blocks: Vec3[] = []

            var ignore: Vec3 = new Vec3(0, 0, 0);
            var direction: Vec3 = new Vec3(1, 0, 0)

            const width = size * 2;

            for (let y = 1; y < depth; y++) {
                for (let x = 0; x <= width; x++) {
                    for (let z = 0; z <= width; z++) {
                        if (ignore.x == x && ignore.z == z) continue;
                        blocks.push(position.offset(x, -y, z))
                    }
                }
                if (ignore.x == width && direction.x == 1) direction.set(0, 0, 1)
                if (ignore.z == width && direction.z == 1) direction.set(-1, 0, 0)

                if (ignore.x == 0 && direction.x == -1) direction.set(0, 0, -1)
                if (ignore.z == 0 && direction.z == -1) direction.set(1, 0, 0)

                ignore.add(direction);
            }

            GoAndDig(position, blocks);
        }
    }
    bot.excavate.DigArea = (pos1, pos2) => {
        return async () => {
            const min = pos1.min(pos2);
            const max = pos1.max(pos2);

            var blocks: Vec3[] = []
            for (let y = min.y; y <= max.y; y++) {
                for (let x = min.x; x <= max.x; x++) {
                    for (let z = min.z; z <= max.z; z++) {
                        blocks.push(new Vec3(x, y, z))
                    }
                }
            }

            bot.taskManager.Insert("DigArea", bot.utility.DigBlocks(blocks.reverse(), true, true))
        }
    }

    function DigWithCommands(position: Vec3, blocks: Vec3[]) {
        blocks = SortBlocks(position, blocks);
        var tasks: Action[] = [];
        var delays: number[] = [];

        for (let i = 0; i < blocks.length; i++) {
            const b = blocks[i];
            tasks.push(() => bot.chat(`/setblock ${b.x} ${b.y} ${b.z} air destroy`))
            delays.push(25);
        }

        bot.taskManager.InsertQueue("Commands", tasks, false, delays)
    }
    function GoAndDig(position: Vec3, blocks: Vec3[]) {
        blocks = SortBlocks(position, blocks);

        bot.taskManager.Insert("Dig", bot.utility.DigBlocks(blocks, true, true));
        bot.taskManager.Insert("PathTo", bot.utility.PathTo(new goals.GoalNearXZ(position.x, position.z, 4), 20));
    }
    function SortBlocks(position: Vec3, blocks: Vec3[]) {
        return blocks.map(e => e.floored()).filter(e => {
            const b = bot.blockAt(e);
            return b.name != "air" && !b.name.endsWith("_air") && b.shapes.length > 0
        }).sort((a, b) => a.z - b.z).map(e => {
            return {
                p: e,
                cost: (e.y - position.y) + (blocks.find(b => b.equals(e.offset(0, 1, 0)) == null) ? 1 : -1)
            }
        }).sort((a, b) => b.cost - a.cost).map(e => e.p)
    }
    function GetDirectionVectors(direction: Direction) {
        if (direction == "east")
            return [
                new Vec3(1, 0, 0),
                new Vec3(0, 0, 1)
            ]
        if (direction == "west")
            return [
                new Vec3(-1, 0, 0),
                new Vec3(0, 0, -1)
            ]
        if (direction == "north")
            return [
                new Vec3(0, 0, -1),
                new Vec3(1, 0, 0)
            ]
        if (direction == "south")
            return [
                new Vec3(0, 0, 1),
                new Vec3(-1, 0, 0)
            ]
    }
}

// + 10 / e.manhattanDistanceTo(position)  + (blocks.find(b => b.equals(e.offset(0, 1, 0))) ? 0 : 10)
import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import mcData, { IndexedData } from "minecraft-data";
import { Vec3 } from "vec3";
import { goals, Movements } from "mineflayer-pathfinder";
import { Block } from "prismarine-block"
import { Action } from "mineflayer-task-manager";
import { EventEmitter } from "events"
import { Item } from "prismarine-item";

export const faceChecks = [
    new Vec3(0, 1, 0),
    new Vec3(0, -1, 0),

    new Vec3(1, 0, 0),
    new Vec3(-1, 0, 0),

    new Vec3(0, 0, 1),
    new Vec3(0, 0, -1),
]
export const surroundChecks = [
    new Vec3(-1, -1, -1),
    new Vec3(-1, -1, 0),
    new Vec3(-1, -1, 1),
    new Vec3(0, -1, -1),
    new Vec3(0, -1, 0),
    new Vec3(0, -1, 1),
    new Vec3(1, -1, -1),
    new Vec3(1, -1, 0),
    new Vec3(1, -1, 1),

    new Vec3(-1, 0, -1),
    new Vec3(-1, 0, 0),
    new Vec3(-1, 0, 1),
    new Vec3(0, 0, -1),
    //new Vec3(0, 0, 0),
    new Vec3(0, 0, 1),
    new Vec3(1, 0, -1),
    new Vec3(1, 0, 0),
    new Vec3(1, 0, 1),

    new Vec3(-1, 1, -1),
    new Vec3(-1, 1, 0),
    new Vec3(-1, 1, 1),
    new Vec3(0, 1, -1),
    new Vec3(0, 1, 0),
    new Vec3(0, 1, 1),
    new Vec3(1, 1, -1),
    new Vec3(1, 1, 0),
    new Vec3(1, 1, 1),
]

declare module "mineflayer" {
    interface Bot {
        entityAtCursor: (maxDistance?: number) => Entity;
        mcData: IndexedData;

        qta: (action: Action, delay?: number) => void;
        utility: {
            isInWater: boolean;
            enableAutoSwim: boolean;
            enableAutoEat: boolean;
            enableClearOnDeath: boolean;
            Foods: string[];

            LookAt: (position: Vec3) => Action;
            //WalkTo: (position: Vec3, maxTries: number, sprint: boolean) => Action;
            PathTo: (goal: goals.Goal, maxTries: number) => Action;
            DigBlock: (position: Vec3, requireTool?: boolean, collectItem?: boolean) => Action;
            DigBlocks: (positions: Vec3[], requireTool?: boolean, collectItem?: boolean) => Action;
            Eat: (foodName?: string) => Action;
            ThrowItems: () => Action;
            ThrowItemsAt: (position: Vec3) => Action;
            PickUpItems: (range?: number, count?: number) => Action;
            BestArmor: () => Action;

            CompareEquipment: (a: Item, b: Item) => number;

            BestHarvestTool: (block: Block) => Promise<boolean>;
            Reset: () => void;

            IsAir: (block: Block) => boolean;
            IsNotSolid: (block: Block) => boolean;
        };
        debugU: DebugU;
    }
}
declare module "prismarine-entity" {
    interface Entity {
        isCollidedHorizontally: boolean;
    }
}

declare interface DebugU extends EventEmitter {
    EmitError: (func: string, err: string) => void;
    EmitWarning: (func: string, warn: string) => void;
    EmitLog: (func: string, log: string) => void;
    TotalLog: (func: string, log: string) => void;


    on(event: 'failure', listener: (err: string) => void): this;
    on(event: 'warn', listener: (warn: string) => void): this;
    on(event: 'log', listener: (msg: string) => void): this;

    on(event: 'totalLog', listener: (err: string) => void): this;
}

export function utility(bot: Bot) {
    bot.mcData = mcData(bot.version)
    bot.utility = {} as any;

    bot.utility.isInWater = false;
    bot.utility.enableAutoSwim = false;
    bot.utility.enableAutoEat = true;
    bot.utility.enableClearOnDeath = true;
    bot.utility.Foods = Object.keys(bot.mcData.foodsByName);

    const movements = new Movements(bot, bot.mcData);
    movements.placeCost = 100000;
    movements.canDig = false;
    movements.allowParkour = false;
    movements.allowFreeMotion = true;
    movements.allow1by1towers = false;

    bot.on("physicsTick", () => {
        bot.utility.isInWater = (() => {
            const p = bot.entity.position;
            var a = bot.blockAt(p.offset(0, -1, 0));
            var b = bot.blockAt(p.offset(0, 0, 0));
            var c = bot.blockAt(p.offset(0, 1, 0));
            return (a != null && a.name.includes("water")) || (b != null && b.name.includes("water")) || (c != null && c.name.includes("water"));
        })();

        if (bot.utility.enableAutoSwim) {
            if (bot.utility.isInWater) bot.setControlState("jump", true)
            else bot.setControlState("jump", false)
        }
        if (bot.utility.enableAutoEat) {
            if (bot.entity.food <= 6) {
                bot.taskManager.Insert("Eat", bot.utility.Eat())
            }
        }
    })
    bot.on("death", () => {
        if (bot.utility.enableClearOnDeath)
            bot.taskManager.Clear();
    })

    bot.qta = (action, delay = 0) => {
        bot.taskManager.Add("qta", action, delay);
    }

    // Movement
    bot.utility.LookAt = (position: Vec3) => {
        return async () => {
            await bot.lookAt(position)
            // const relativePos = position.minus(bot.entity.position.offset(0, bot.entity.height, 0)).normalize();

            // const yaw = Math.atan2(relativePos.x, relativePos.z) + Math.PI;
            // const pitch = Math.asin(relativePos.y);

            // const rotVec = new Vec3((pitch - bot.entity.pitch), (yaw - bot.entity.yaw), 0)
            // const steps = rotVec.norm() / delta;
            // rotVec.normalize();
            // rotVec.scale(steps / delta);

            // var tasks: Action[] = [];
            // for (let s = 0; s < steps; s++) {
            //     tasks.push(() => {
            //         bot.entity.yaw += rotVec.y;
            //         bot.entity.pitch += rotVec.x;
            //     })
            // }
            // QueueTasks("Look", tasks);
        }
    }
    // bot.utility.WalkTo = (position: Vec3, maxTries: number, sprint: boolean) => {
    //     return async () => {
    //         position = position.floored().offset(0.5, 0, 0.5);

    //         if (position.distanceSquared(bot.entity.position) < 0.2 * 0.2) return;

    //         bot.taskManager.Insert("Move", () => Move(10000, maxTries))
    //         bot.taskManager.Insert("LookAt", bot.utility.LookAt(position.offset(0, bot.entity.height * 0.9, 0)))

    //         function Move(prevDist: number, t: number) {
    //             bot.setControlState("forward", true)
    //             let distance = bot.entity.position.distanceSquared(position);

    //             if (distance < prevDist && t > 0 && distance >= 0.2 * 0.2) {
    //                 bot.taskManager.Insert("Move", () => Move(distance, t - 1))
    //             }
    //             else {
    //                 bot.setControlState("forward", false);
    //                 bot.setControlState("sprint", false);
    //             }

    //             if (bot.entity.position.y < position.y || bot.entity.isCollidedHorizontally) {
    //                 bot.setControlState("jump", true)
    //                 bot.setControlState("jump", false)
    //             } else if (sprint) bot.setControlState("sprint", true);
    //         }
    //     }
    // }
    bot.utility.PathTo = (goal: goals.Goal, maxTries: number) => {
        return async () => {
            bot.pathfinder.setMovements(movements);
            await bot.pathfinder.goto(goal).catch(() => { });
            // bot.taskManager.Insert("Path", () => Path(maxTries))

            // function Path(t: number) {
            //     if (t < 0 && maxTries > 0) return;

            //     const computedPath = bot.pathfinder.getPathTo(movements, goal, 30000);
            //     const nodes = computedPath.path.map(e => new Vec3(e.x, e.y, e.z));

            //     var tasks: Action[] = [];
            //     for (let i = 0; i < nodes.length; i++) tasks.push(bot.utility.WalkTo(nodes[i], 5, false));
            //     if (computedPath.status == "partial" as any) tasks.push(() => Path(t - 1));

            //     bot.taskManager.InsertQueue("PathTo", tasks);
            // }
        }
    }

    // Dig
    bot.utility.DigBlock = (position: Vec3, requireTool: boolean = false, collectItem: boolean = false) => {
        return async () => {
            var tasks: Action[] = [];
            const blockStart = bot.blockAt(position);

            if (requireTool && !await bot.utility.BestHarvestTool(blockStart)) {
                bot.debugU.EmitError("DigBlock", "No harvest tool found!")
                return;
            }

            if (blockStart != null && SkipBlock(blockStart)) {
                bot.debugU.EmitLog("DigBlock", "Block skipped, either null, not diggable or air!")
                return;
            }

            if (!bot.canSeeBlock(blockStart) || bot.entity.position.distanceSquared(position) > 16)
                tasks.push(bot.utility.PathTo(new goals.GoalGetToBlock(position.x, position.y, position.z), 10)) // new goals.GoalLookAtBlock(position, bot.world, {} as any)

            tasks.push(async () => {
                const block = bot.blockAt(position);
                await bot.lookAt(block.position.offset(0.5, 0.5, 0.5))
                if (!SkipBlock(block)) {
                    await bot.dig(block, true)
                }
                else
                    bot.debugU.EmitLog("DigBlock", "Block skipped, either null, not diggable, air!")
            })

            if (collectItem) {
                tasks.push(async () => {
                    const block = bot.blockAt(position);
                    if (block.name != blockStart.name)
                        bot.taskManager.Insert("Collect", bot.utility.PathTo(new goals.GoalNear(position.x, position.y, position.z, 2), 10))
                })
            }

            bot.taskManager.InsertQueue("DigBlock", tasks)
        }

        function SkipBlock(block: Block) {
            return !block.diggable || block.name.includes("_air") || block.name == "air";
        }
    }
    bot.utility.DigBlocks = (positions: Vec3[], requireTool: boolean = false, collectItem: boolean = false) => {
        return async () => {
            var tasks: Action[] = [];
            for (let i = 0; i < positions.length; i++) {
                tasks.push(bot.utility.DigBlock(positions[i].floored(), requireTool, collectItem))
            }

            bot.taskManager.InsertQueue("Dig", tasks);
        }
    }

    // Items
    bot.utility.ThrowItems = () => {
        return async () => {
            const items = bot.inventory.items();
            for (let i = 0; i < items.length; i++) {
                await bot.tossStack(items[i]);
            }
        }
    }
    bot.utility.ThrowItemsAt = (position) => {
        return async () => {
            var tasks: Action[] = [];

            tasks.push(bot.utility.PathTo(new goals.GoalNear(position.x, position.y, position.z, 3), 10))
            tasks.push(bot.utility.LookAt(position))
            tasks.push(bot.utility.ThrowItems())

            bot.taskManager.InsertQueue("Give", tasks);
        }
    }
    bot.utility.PickUpItems = (range = 16, count = 32) => {
        return () => {
            const position = bot.entity.position.clone();

            bot.taskManager.Insert("Pick", () => Pick(count))

            function Pick(i: number) {
                const item = bot.nearestEntity(e => e.name == "item" && e.position.distanceSquared(position) < range * range)

                if (item == null) return;
                if (i <= 0) return;

                bot.taskManager.Insert("Pick", () => Pick(i - 1))
                bot.taskManager.Insert("WalkToPick", bot.utility.PathTo(new goals.GoalBlock(item.position.x, item.position.y, item.position.z), range));
            }
        }
    }
    bot.utility.Eat = (name = null) => {
        return async () => {
            let food = name == null ? null : bot.inventory.items().find(e => e.name == name);
            if (food == null) { // Find the best food in the bots inventory.
                food = bot.inventory.items().filter(e =>
                    bot.utility.Foods.includes(e.name)
                ).reduce((a, b) =>
                    bot.mcData.foods[a.type].foodPoints > bot.mcData.foods[b.type].foodPoints ? a : b
                )
            }
            if (food == null) {
                bot.debugU.EmitError("Eat", "No food in inventory to consume!")
                return;
            }

            await bot.equip(food, "hand");
            await bot.consume()
        }
    }
    bot.utility.Reset = () => {
        bot.taskManager.Clear();
        bot.look(0, 0);
        bot.clearControlStates();
        bot.stopDigging();
        if (bot.isSleeping) bot.wake();
    }
    bot.utility.BestHarvestTool = async (block) => {
        if (block == null) {
            bot.debugU.EmitError("BestHarvestTool", "Block is null!")
            return false;
        }
        if (block.harvestTools != null) {
            const keys = Object.keys(block.harvestTools)

            const availableTools: Item[] = []
            for (let i = 0; i < keys.length; i++) {
                const element = keys[i];
                const tool = bot.inventory.items().find(e => e.type == parseInt(element));
                if (block.harvestTools[element] == true && tool != null) {
                    availableTools.push(tool)
                }
            }

            if (availableTools.length != 0) {
                const item = availableTools.reduce((a, b) => bot.utility.CompareEquipment(a, b) > 0 ? a : b);
                await bot.equip(item, "hand")
                return true;
            }
        }
        else if (block.material) {
            let items = bot.inventory.items();

            if (block.material.endsWith("mineable/axe")) items = items.filter(e => e.name.endsWith("_axe"))
            else if (block.material.endsWith("mineable/hoe")) items = items.filter(e => e.name.endsWith("_hoe"))
            else if (block.material.endsWith("mineable/sword")) items = items.filter(e => e.name.endsWith("_sword"))
            else if (block.material.endsWith("mineable/shovel")) items = items.filter(e => e.name.endsWith("_shovel"))
            else if (block.material.endsWith("mineable/pickaxe")) items = items.filter(e => e.name.endsWith("_pickaxe"))

            if (items.length != 0) {
                const item = items.reduce((a, b) => bot.utility.CompareEquipment(a, b) > 0 ? a : b);
                await bot.equip(item, "hand")
                return true;
            }
        }
        else bot.debugU.EmitError("BestHarvestTool", "Faliure. Block = " + JSON.stringify(block))

        return false;
    }

    bot.utility.BestArmor = () => {
        const armorTypes = [
            "helmet",
            "chestplate",
            "leggings",
            "boots"
        ];
        const armorDestinations = [
            "head",
            "torso",
            "legs",
            "feet"
        ];

        return async () => {
            const armor = bot.inventory.items().filter(e => armorTypes.find(b => e.name.endsWith(b)))

            for (let i = 0; i < armorDestinations.length; i++) {
                const armType = armor.filter(e => e.name.endsWith(armorTypes[i]))
                if (armType.length > 0)
                    await bot.equip(armType.reduce((a, b) => bot.utility.CompareEquipment(a, b) > 0 ? a : b), armorDestinations[i] as any)
            }
        }
    }

    bot.utility.CompareEquipment = (a, b) => {
        const equpmentMaterials = [
            "leather",
            "wooden",
            "stone",
            "golden",
            "turtle",
            "chainmail",
            "iron",
            "diamond",
            "netherite",
        ];
        return equpmentMaterials.findIndex(mat => a.name.startsWith(mat)) - equpmentMaterials.findIndex(mat => b.name.startsWith(mat));
    }

    bot.utility.IsAir = (block) => {
        return block.name == "air" || block.name.endsWith("_air");
    }
    bot.utility.IsNotSolid = (block) => {
        return bot.utility.IsAir(block) || block.boundingBox == "empty";
    }


    bot.debugU = new EventEmitter() as any;
    bot.debugU.EmitError = (func: string, err: string) => {
        bot.debugU.TotalLog("Error: " + func, err);
        bot.debugU.emit('faliure', `\x1b[31m${func}: ${err}\x1b[0m`);
    }
    bot.debugU.EmitWarning = (func: string, warn: string) => {
        bot.debugU.TotalLog("Warn: " + func, warn);
        bot.debugU.emit('warn', `\x1b[33m${func}: ${warn}\x1b[0m`);
    }
    bot.debugU.EmitLog = (func: string, log: string) => {
        bot.debugU.TotalLog("Log: " + func, log);
        bot.debugU.emit('log', `${func}: ${log}`);
    }
    bot.debugU.TotalLog = (func: string, log: string) => {
        bot.debugU.emit('totalLog', `T => ${func}: ${log}`);
    }
}
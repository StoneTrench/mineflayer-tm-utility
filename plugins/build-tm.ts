import { Bot } from "mineflayer";
import { goals } from "mineflayer-pathfinder";
import { Action } from "mineflayer-task-manager";
import { Vec3 } from "vec3";
import { belowSurroundChecks } from "./deforest-tm";
import { faceChecks, surroundChecks } from "./utility-tm";

export declare type PlanBlock = { position: Vec3, itemType: number };
export declare type Axies = "x" | "z" | "y" | "-x" | "-z" | "-y";

declare module "mineflayer" {
    interface Bot {
        build: {
            PlaceBlock: (position: Vec3, itemType: number) => Action;
            PlaceBlocks: (blocks: PlanBlock[]) => Action;
            IsItemEqualToBlock: (blockType: number, itemType: number) => boolean;

            generateShapes: {
                Box: (position: Vec3, size: Vec3, material: Material, predicate?: ((position: Vec3, itemType: number) => boolean)) => PlanBlock[];
                HBox: (position: Vec3, size: Vec3, material: Material) => PlanBlock[];
                Walls: (position: Vec3, size: Vec3, material: Material) => PlanBlock[];
                Stair: (position: Vec3, size: Vec3, direction: Axies, material: Material) => PlanBlock[];

                Panels: (position: Vec3, size: Vec3, sides: Axies[], material: Material) => PlanBlock[];
                Panel: (position: Vec3, size: Vec3, side: Axies, material: Material) => PlanBlock[];
            }
        }
    }
}

export function build(bot: Bot) {
    bot.build = {} as any;
    bot.build.generateShapes = {} as any;


    bot.build.PlaceBlock = (position, itemType) => {
        return async () => {
            var tasks: Action[] = [];

            tasks.push(async () => {
                if (bot.inventory.count(itemType, null) == 0) {
                    bot.debugU.EmitError("PlaceBlock", "No block of this type in inventory!")
                    return;
                }

                await bot.equip(itemType, "hand")
            });
            tasks.push(() => {
                if (bot.heldItem != null && bot.heldItem.type == itemType) {
                    var tasks: Action[] = [];
                    const block = bot.blockAt(position);

                    if (!bot.utility.IsAir(block)) {
                        bot.debugU.EmitWarning("PlaceBlock", "Block is not air!")
                        return;
                    }

                    //tasks.push(bot.utility.PathTo(new goals.GoalPlaceBlock(block.position, bot.world, {} as any), 20))

                    const dist = bot.entity.position.distanceSquared(position.offset(0.5, 0.5, 0.5));
                    if (!bot.canSeeBlock(block) || dist > 16 || dist < 4) {
                        const gotoBlock = surroundChecks.map(e => e.plus(position)).find(e =>
                            bot.utility.IsNotSolid(bot.blockAt(e.offset(0, 1, 0))) &&
                            bot.utility.IsNotSolid(bot.blockAt(e)) &&
                            !bot.utility.IsNotSolid(bot.blockAt(e.offset(0, -1, 0)))
                        )
                        if (gotoBlock != null)
                            tasks.push(bot.utility.PathTo(new goals.GoalBlock(gotoBlock.x, gotoBlock.y, gotoBlock.z), 20))
                    }

                    tasks.push(async () => {
                        if (bot.entity.position.distanceSquared(position) <= 16) {
                            let face = faceChecks.find(e => !bot.utility.IsAir(bot.blockAt(e.plus(position))));
                            if (face == null) face = new Vec3(0, 1, 0);
                            const refB = bot.blockAt(face.plus(position))
                            await bot.placeBlock(refB, face.scaled(-1)).catch(() => { })
                        }
                        else
                            bot.debugU.EmitError("PlaceBlock", "Too far away from block!")
                    })

                    bot.taskManager.InsertQueue("PlaceBlock", tasks);
                }
            })

            bot.taskManager.InsertQueue("Place", tasks);
        }
    }
    bot.build.PlaceBlocks = (blocks) => {
        return () => {
            blocks = blocks.reverse(
            ).filter((e, i, a) => a.findIndex(f => f.position.equals(e.position)) == i
            ).reverse(
            ).sort((a, b) => a.position.y - b.position.y);

            var tasks: Action[] = [];
            var delays: number[] = [];

            const commands = BlocksToCommands(blocks);

            for (let i = 0; i < commands.length; i++) {
                const b = commands[i];
                let cmd = "";
                if (b.min.equals(b.max))
                    cmd = `/setblock ${b.min.x} ${b.min.y} ${b.min.z} ${bot.mcData.items[b.itemType].name} destroy`;
                else
                    cmd = `/fill ${b.min.x} ${b.min.y} ${b.min.z} ${b.max.x} ${b.max.y} ${b.max.z} ${bot.mcData.items[b.itemType].name} destroy`;
                tasks.push(() => bot.chat(cmd))
                delays.push(1);
            }

            // for (let i = 0; i < blocks.length; i++) {
            //     const b = bot.blockAt(blocks[i].position);
            //     if (!bot.build.IsItemEqualToBlock(b.type, blocks[i].itemType) && !bot.utility.IsAir(b))
            //         tasks.push(bot.utility.DigBlock(blocks[i].position, false, false))
            //     if (!bot.build.IsItemEqualToBlock(b.type, blocks[i].itemType))
            //         tasks.push(bot.build.PlaceBlock(blocks[i].position, blocks[i].itemType))
            // }

            bot.taskManager.InsertQueue("Build", tasks, false, delays);
        }
    }
    bot.build.IsItemEqualToBlock = (blockType, itemType) => {
        return bot.mcData.blocks[blockType].name == bot.mcData.items[itemType].name;
    }

    bot.build.generateShapes.Box = (position, size, material, predicate = null) => {
        var blocks: PlanBlock[] = [];

        for (let y = 0; y < size.y; y++) {
            for (let x = 0; x < size.x; x++) {
                for (let z = 0; z < size.z; z++) {
                    const p = position.offset(x, y, z).floored();
                    const i = MaterialHandler(material, new Vec3(x, y, z), size);

                    if (predicate != null && !predicate(p, i)) continue;

                    blocks.push({
                        position: p,
                        itemType: i
                    })
                }
            }
        }

        return blocks;
    }
    bot.build.generateShapes.HBox = (position, size, material) => {
        return bot.build.generateShapes.Box(position, size, material, (pos) => {
            pos = pos.minus(position);
            return ((pos.x == 0 || pos.x == size.x - 1) || (pos.y == 0 || pos.y == size.y - 1) || (pos.z == 0 || pos.z == size.z - 1))
        })
    }
    bot.build.generateShapes.Walls = (position, size, material) => {
        return bot.build.generateShapes.Box(position, size, material, (pos) => {
            pos = pos.minus(position);
            return ((pos.x == 0 || pos.x == size.x - 1) || (pos.z == 0 || pos.z == size.z - 1))
        })
    }
    bot.build.generateShapes.Stair = (position, size, dir, material) => {
        let axis: string = dir;
        const inverted = axis.startsWith("-");
        if (inverted) {
            position = position.minus(size).offset(1, size.y, 1);
            axis = axis.substring(1)
        }

        return bot.build.generateShapes.Box(position, size, material, (pos) => {
            pos = pos.minus(position);

            if (inverted)
                return (size[axis] - pos[axis]) / size[axis] > pos.y / size.y;
            else
                return pos[axis] / size[axis] >= pos.y / size.y;
        })
    }
    bot.build.generateShapes.Panel = (position, size, side, material) => {
        let axis: string = side;
        const inverted = axis.startsWith("-");
        if (inverted) axis = axis.substring(1)

        return bot.build.generateShapes.Box(position, size, material, (pos) => {
            pos = pos.minus(position);
            if (inverted)
                return pos[axis] == 0;
            else
                return pos[axis] == size[axis] - 1;
        })
    }
    bot.build.generateShapes.Panels = (position, size, side, material) => {
        return side.map(e => bot.build.generateShapes.Panel(position, size, e, material)).reduce((a, b) => a.concat(b)
        ).filter((v, i, a) => a.findIndex(e => e.position.equals(v.position)) == i)
    }
}

function BlocksToCommands(voxels: PlanBlock[]) {
    console.log("constructing")

    const commands: { min: Vec3, max: Vec3, itemType: number }[] = [];
    console.log("voxels")

    // Find boxes of voxels with the same item.
    while (voxels.length > 0) {
        const cmd = commands[commands.length - 1]

        let oneTrue = true;

        if (cmd != null) {
            for (let f = 0; f < faceChecks.length; f++) {
                const face = faceChecks[f];
                const positions = checkBox(cmd.min, cmd.max, cmd.itemType, face);

                if (positions.length > 0) {
                    for (let i = 0; i < positions.length; i++)
                        voxels.splice(voxels.findIndex(e => e.position.equals(positions[i])), 1);

                    if (face.x < 0 || face.y < 0 || face.z < 0)
                        cmd.min.add(face)
                    else
                        cmd.max.add(face)

                    oneTrue = false;
                }
            }

            commands[commands.length - 1] = cmd;
        }

        if (oneTrue) {
            const vox = voxels.splice(0, 1)[0];
            commands.push({
                min: vox.position.clone(),
                max: vox.position.clone(),
                itemType: vox.itemType
            })
        }
    }

    return commands;

    function checkBox(min: Vec3, max: Vec3, itemType: number, faceVector: Vec3) {
        const size: Vec3 = max.minus(min);
        const sizeArray = size.toArray();

        const positive = faceVector.x > 0 || faceVector.y > 0 || faceVector.z > 0;
        const positiveMult = multiplyVectors(size.offset(1, 1, 1), faceVector);

        const Max = faceVector.abs().toArray().map((e, i) => (e > 0 ? 0 : sizeArray[i]) + 1)

        const positions: Vec3[] = []

        for (let x = 0; x < Max[0]; x++) {
            for (let y = 0; y < Max[1]; y++) {
                for (let z = 0; z < Max[2]; z++) {
                    const pos = positive ? min.offset(x, y, z).add(positiveMult) : min.offset(x, y, z).add(faceVector)
                    const vox = voxels.find(e => e.position.equals(pos))

                    positions.push(pos)

                    if (vox == null) return [];
                    if (vox.itemType == null && itemType == null) continue;
                    if (vox.itemType != null && itemType != null && vox.itemType == itemType) continue;

                    return [];
                }
            }
        }

        return positions;
    }

    function multiplyVectors(a: Vec3, b: Vec3) {
        return new Vec3(a.x * b.x, a.y * b.y, a.z * b.z)
    }
}

export declare type Material = number | { itemType: number[], type: "random" | "step" | "gradient" | "loopStep" };
function MaterialHandler(mat: Material, pos: Vec3, max: Vec3, min: Vec3 = new Vec3(0, 0, 0)): number {
    if (typeof mat == "number") return mat as number;

    if (mat.type == "random") return mat.itemType[Math.floor(Math.random() * mat.itemType.length) % mat.itemType.length];
    if (mat.type == "step") return mat.itemType[gradient(pos.y, min.y, max.y, mat.itemType.length)];
    if (mat.type == "gradient") return mat.itemType[gradient(pos.y + Math.round(Math.random() * 2 - 1), min.y, max.y, mat.itemType.length)];
    if (mat.type == "loopStep") return mat.itemType[Math.floor(pos.y - min.y) % mat.itemType.length];
}
function gradient(value: number, min: number, max: number, arrLen: number) {
    return Clamp(Math.floor((value - min) / (max - min) * arrLen), 0, arrLen - 1);
}
function Clamp(value: number, min: number, max: number) {
    return value < min ? min : (value > max ? max : value)
}

export declare type Hole = { material: Material, size: Vec3, offset: Vec3 };
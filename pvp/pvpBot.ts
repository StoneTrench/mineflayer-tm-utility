import { pathfinder, goals } from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import attackSpeeds from "./attackSpeeds";
import { AddBot, BotProfile, ServerProfile } from "./swarmManager";
import { taskManager } from "mineflayer-task-manager";
import { utility } from "./utility-tm";

function getAttackSpeed(itemName: string) {
    const speed = attackSpeeds[itemName];
    if (speed == null)
        return attackSpeeds.other;
    else
        return speed;
}

async function main(BotIndex: number) {
    const bot = await AddBot(
        new BotProfile("Stalin" + BotIndex, "00000000"),
        new ServerProfile("Arena", "localhost", 25565),
        [taskManager, pathfinder, utility]
    );
    let target = bot.nearestEntity();


    async function PVP_Loop(attackCooldown: number) {
        target = bot.players["StoneTrench"].entity

        if (target) {
            var size = new Vec3(target.width, target.height, target.width).scaled(0.5);
            var targPos = target.position.offset(size.x, size.y, size.z)
            //var goal: goals.Goal = new goals.GoalNear(targPos.x, targPos.y, targPos.z, 1);

            if (bot.entity.position.distanceTo(targPos) > 2)
                bot.utility.WalkTo(bot.entity.position.plus(targPos).scaled(0.5), 20, true);

            bot.taskManager.Add("PVP_Attack", async () => {
                bot.lookAt(targPos);//bot.utility.LookAtSpeed(targPos.offset(0, target.height / 2, 0).plus(target.velocity))
                bot.setControlState("jump", true)
                setTimeout(() => { // FroTheLeaf
                    //if (atCursor != null && atCursor.uuid == target.uuid && attackCooldown <= 0) {
                    if (target != null)
                        bot.attack(target)
                    //}
                }, 500);
                attackCooldown = getAttackSpeed(bot.heldItem == null ? "" : bot.heldItem.name);
            });
        }

        bot.taskManager.Add("PVP_Loop", () => PVP_Loop(attackCooldown - 1));
    }
    PVP_Loop(0);
    bot.on("death", () => PVP_Loop(0))

    var start = new Vec3(88, 80, -20)
    var end = new Vec3(88, 72, -20)

    function t0(time: number) {
        if (time > 1) {
            time = 0;
            bot.taskManager.Clear();
        }

        const ent = bot.players["StoneTrench"].entity;

        if (ent) {
            bot.utility.PathTo(new goals.GoalBlock(ent.position.x, ent.position.y, ent.position.z), 20);
        }

        bot.taskManager.Add("t0", () => t0(time + 1))
    }
    //t0(0);

    // for (let y = start.y; y >= end.y; y--) {
    //     bot.utility.DigBlock(new Vec3(start.x, y, start.z))
    // }

    bot.on("physicsTick", () => {
        var tasks = bot.taskManager.GetWholeQueue();
        if (tasks.length > 0)
            console.log(">>> " + tasks.map(e => e.name).join(" => ").substring(0, 100) + "...")
    })
}

function RandomInBox(pos: Vec3, size: Vec3) {
    var x = RandomRange(pos.x - size.x, pos.x + size.x)
    var y = RandomRange(pos.y - size.y, pos.y + size.y)
    var z = RandomRange(pos.z - size.z, pos.z + size.z)
    return new Vec3(x, y, z);
}

function RandomRange(min: number, max: number) {
    var diff = max - min;
    return Math.random() * diff + min;
}
import { Bot } from "mineflayer";
import { Block } from "prismarine-block";
import { Action } from "mineflayer-task-manager";
import { Recipe, RecipeItem } from "minecraft-data";
import { goals } from "mineflayer-pathfinder";

declare module "mineflayer" {
    interface Bot {
        crafting: {
            CraftCItem: (itemType: number, metadata?: number, count?: number, craftingTable?: false | Block) => Action;
            GetMissingItemsForItem: (itemType: number, metadata: number, count: number, craftingTable?: false | Block) => CraftingItem[][];

            FindItem: (itemType: number, metadata?: number, count?: number) => Action;
        }
    }
}

declare type CraftingItem = { id: number, m: number, count: number };

export function crafting(bot: Bot) {
    bot.crafting = {} as any;


    bot.crafting.CraftCItem = (itemType: number, metadata = null, count = 1, craftingTable = false) => {
        return async () => {
            var tasks: Action[] = [];
            const _rec = bot.recipesFor(itemType, metadata, count, craftingTable);

            if (craftingTable)
                tasks.push(bot.utility.PathTo(new goals.GoalGetToBlock(craftingTable.position.x, craftingTable.position.y, craftingTable.position.z), 20));

            if (_rec.length != 0) {
                tasks.push(async () => await bot.craft(_rec[0], count, craftingTable ? craftingTable : null) as any);
            }
            else {
                var craftingTree: CraftingItem[] = [];

                let MissingItems: CraftingItem[] = [{ id: itemType, m: metadata, count: count }];
                let currentItemToCraft: CraftingItem;

                for (let i = 0; i < 500; i++) {
                    if (MissingItems.length == 0) break;

                    currentItemToCraft = MissingItems.pop();

                    currentItemToCraft.count -= bot.inventory.count(currentItemToCraft.id, currentItemToCraft.m)
                    if (currentItemToCraft.count <= 0) {
                        bot.debugU.EmitLog("CraftCItem", "Found item in inventory.")
                        continue;
                    }
                    if (CanCraft(currentItemToCraft, craftingTable)) {
                        craftingTree.push(currentItemToCraft)
                        continue;
                    }
                    // An array of recipes
                    const missing = bot.crafting.GetMissingItemsForItem(currentItemToCraft.id, currentItemToCraft.m, currentItemToCraft.count, craftingTable);
                    if (missing.length == 0) {
                        bot.debugU.EmitError("CraftCItem", "No missing, error " + bot.mcData.items[currentItemToCraft.id].name)
                        return;
                    }
                    craftingTree.push(currentItemToCraft)
                    MissingItems = MissingItems.concat(missing[0]);
                }

                craftingTree = craftingTree.reverse();

                for (let i = 0; i < craftingTree.length; i++) {
                    const r = craftingTree[i];
                    tasks.push(async () => {
                        const recipe = bot.recipesFor(r.id, r.m, 1, craftingTable)[0];
                        bot.debugU.EmitLog("CraftCItem", "Crafting...")
                        await bot.craft(recipe, Math.ceil(r.count / recipe["result"]["count"]), craftingTable ? craftingTable : null).catch(console.log)
                    });
                }
            }

            bot.taskManager.InsertQueue("CraftCItem", tasks);
        }
    }
    bot.crafting.GetMissingItemsForItem = (itemType, metadata = null, count = 1, craftingTable = false) => {
        const recipeDeltas: CraftingItem[][] = bot.recipesAll(itemType, metadata, craftingTable).map((r: Recipe) => {
            return r["delta"].slice(0, r["delta"].length - 1).map((e: RecipeItem) => {
                return {
                    id: e["id"],
                    m: e["metadata"],
                    count: -e["count"] * Math.ceil(count / r["result"]["count"])
                }
            })
        });
        const bestDeltas = recipeDeltas.sort((a, b) =>
            b.map(e => bot.inventory.count(e.id, e.m) - e.count).reduce((e, f) => e + f) -
            a.map(e => bot.inventory.count(e.id, e.m) - e.count).reduce((e, f) => e + f)
        )
        return bestDeltas.map(a => a.filter(b => bot.inventory.count(b.id, b.m) - b.count < 0));
    }

    bot.crafting.FindItem = (itemType, metadata, count) => {
        return () => {
            const chests = bot.findBlocks({
                matching: bot.mcData.blocksByName.chest.id,
                count: 64
            }).reverse()

            bot.taskManager.Insert("OpenChest", () => CheckChest(chests.length - 1, count))

            function CheckChest(index: number, c: number) {
                if (index < 0) return;

                bot.taskManager.Insert("Open", async () => {

                    const block = bot.blockAt(chests[index]);
                    if (block == null) return;
                    const chest = await bot.openChest(block)
                    const ChestCount = Math.min(chest.containerCount(itemType, metadata), c);
                    console.log(ChestCount, index, chest.containerCount(itemType, metadata))

                    if (ChestCount > 0) {

                        await chest.withdraw(itemType, metadata, ChestCount);
                        c -= ChestCount;
                        chest.close();
                        if (c <= 0) return;
                    }

                    chest.close();
                    bot.taskManager.Insert("OpenChest", () => CheckChest(index - 1, c), 500)
                })
                bot.taskManager.Insert("PathTo", bot.utility.PathTo(new goals.GoalLookAtBlock(chests[index], bot.world, {} as any), 20))
            }
        }
    }
    function CanCraft(CI: CraftingItem, craftingTable: false | Block) {
        return bot.recipesFor(CI.id, CI.m, 1, craftingTable).length > 0;
    }
}

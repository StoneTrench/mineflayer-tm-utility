import { Bot } from "mineflayer";
import { Action } from "mineflayer-task-manager";

declare type BotContainer = { id: number, bot: Bot }
declare type BotGroup = { id: number, botIds: number[] }

export default function CreateInterface() {
    const bots: BotContainer[] = [];
    const botGroups: BotGroup[] = [{ id: -1, botIds: [] }];
    let addedBotCounter = -1;
    let addedBotGroupCounter = -1;

    return {
        CreateGroup: (botNames: string[]) => {
            addedBotGroupCounter++;

            botGroups.push({
                id: addedBotGroupCounter,
                botIds: botNames.map(e => bots.find(b => b.bot.username == e).id),
            })
            return addedBotGroupCounter;
        },
        DeleteGroup: (groupID: number) => {
            botGroups.splice(botGroups.findIndex(e => e.id == groupID));
        },
        callFunc: (groupID: number, funcName: string, ...args: any[]): any[] => {
            const results: any[] = [];

            const group = GetGroupByID(groupID);

            for (let i = 0; i < group.botIds.length; i++) {
                const bot = GetBotByID(group.botIds[i]).bot;
                const func = GetThing(funcName, bot) as any;
                if (func && func.call) {
                    results.push(func(...args));
                }
            }

            return results;
        },
        callAddTmFunc: (groupID: number, funcName: string, ...args: any[]) => {

            const group = GetGroupByID(groupID);

            for (let i = 0; i < group.botIds.length; i++) {
                const bot = GetBotByID(group.botIds[i]).bot;
                const func = GetThing(funcName, bot) as any;
                if (func && func.call) {
                    bot.taskManager.Add(funcName, func(...args) as Action);
                }
            }
        },
        plugin: (bot: Bot) => {
            addedBotCounter++;

            const botID = addedBotCounter;
            bots.push({ bot: bot, id: botID });

            GetGroupByID(-1).botIds.push(botID);

            bot.on("end", () => {
                bots.splice(bots.findIndex(e => e.id == botID), 1)
            });
        }
    }

    function GetBotByID(id: Number) {
        return bots.find(e => e.id == id);
    }
    function GetGroupByID(id: Number) {
        return botGroups.find(e => e.id == id);
    }

    function GetThing(thingName: string, object: object) {
        const names = thingName.split(".");

        let currObj = object;
        for (let i = 0; i < names.length; i++) {
            currObj = currObj[names[i]]
        }
        
        return currObj;
    }
}
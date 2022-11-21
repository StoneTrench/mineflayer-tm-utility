import { createBot, Bot, Plugin } from "mineflayer"
import EventEmitter from "events";

export class BotProfile {
    username: string;
    password: string;

    constructor(username: string, password: string) {
        this.username = username;
        this.password = password;
    }
}
export class ServerProfile {
    name: string;
    host: string;
    port: number;

    constructor(name: string, host: string, port: number) {
        this.name = name;
        this.host = host;
        this.port = port;
    }
}

export const Bots: Bot[] = []
export const emitter = new EventEmitter();

declare module "mineflayer" {
    interface Bot {
        profile: BotProfile;
    }
}

export function AddBot(profile: BotProfile, server: ServerProfile, plugins: Plugin[] = []): Promise<Bot> {
    return new Promise((resolve) => {
        const options = {
            username: profile.username,
            password: profile.password,
            host: server.host,
            port: server.port,
            skipValidation: true
        }

        const bot = createBot(options)
        bot.profile = profile;

        bot.loadPlugins(plugins);

        bot.once("spawn", async () => {
            Bots.push(bot);
            emitter.emit("swarm_bot_added", bot);
            bot.waitForChunksToLoad().finally(() => resolve(bot))
        })

        bot.once("end", (reason) => {
            RemoveBot(profile)
        })
    });
}

export function RemoveBot(profile: BotProfile) {
    const index = Bots.findIndex(e => e.profile == profile)
    if (index != -1)
        Bots.splice(index, 1);
}
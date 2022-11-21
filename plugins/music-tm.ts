import { Bot } from "mineflayer";
import { Action } from "mineflayer-task-manager";
import { Block } from "prismarine-block"
import { Vec3 } from "vec3";
import prismarineItem from "prismarine-item";
import { readFileSync } from "fs";

// Notes є [0; 24];

declare type Song = { time: number, notes: { note: number, duration: number }[] };
declare type NoteBlock = { position: Vec3; type: string; note: number };
const Notes = [
    "f#",
    "g",
    "g#",
    "a",
    "a#",
    "b",
    "c",
    "c#",
    "d",
    "d#",
    "e",
    "f",
]

declare module "mineflayer" {
    interface Bot {
        music: {
            NoteBlockData: {
                BlockToNumber: { [blockid: string]: number };
                NumberToBlock: { [blockid: number]: string };
                BlockToName: { [blockid: string]: string };
                NameToBlock: { [name: string]: string };
                GetNoteFromNoteIndex: (index: number) => string;
                GetNoteIndexFromNote: (note: string) => number[];
            }
            noteBlocks: NoteBlock[];
            DetectNoteblocks: (point?: Vec3) => void;
            HitBlock: (position: Vec3, forceLook?: boolean) => Action;
            FastActivateBlock: (block: Block) => Action;
            TuneNoteBlock: (nblock: NoteBlock, note: number) => Action;
            TuneNoteBlocks: (notes: number[]) => Action;
            Play: (song: Song, time?: number) => Action;
            LoadSong: (path: string) => Song;

            GetNoteBlock: (block: Block) => NoteBlock;
        }
    }
}

export function music(bot: Bot) {
    const Item = prismarineItem(bot.version);

    bot.music = {} as any;
    bot.music.NoteBlockData = {} as any;
    bot.music.NoteBlockData.BlockToNumber = {
        glowstone: 751,
        hay_block: 701,
        emerald_block: 651,
        pumpkin: 601,
        soul_sand: 551,
        iron_block: 501,
        bone_block: 451,
        white_wool: 351,
        packed_ice: 401,
        clay: 251,
        gold_block: 301,
        stone: 51,
        glass: 151,
        sand: 101,
        oak_planks: 201,
        air: 1
    };
    bot.music.NoteBlockData.NumberToBlock = {
        '1': 'air',
        '51': 'stone',
        '101': 'sand',
        '151': 'glass',
        '201': 'oak_planks',
        '251': 'clay',
        '301': 'gold_block',
        '351': 'white_wool',
        '401': 'packed_ice',
        '451': 'bone_block',
        '501': 'iron_block',
        '551': 'soul_sand',
        '601': 'pumpkin',
        '651': 'emerald_block',
        '701': 'hay_block',
        '751': 'glowstone'
    };
    bot.music.NoteBlockData.BlockToName = {
        glowstone: "pling",
        hay_block: "banjo",
        emerald_block: "bit",
        pumpkin: "didgeridoo",
        soul_sand: "cow_bell",
        iron_block: "iron_xylophone",
        bone_block: "xylophone",
        white_wool: "guitar",
        packed_ice: "chime",
        clay: "flute",
        gold_block: "bell",
        stone: "basedrum",
        glass: "hat",
        sand: "snare",
        oak_planks: "bass",
        air: "harp"
    };
    bot.music.NoteBlockData.NameToBlock = {
        pling: 'glowstone',
        banjo: 'hay_block',
        bit: 'emerald_block',
        didgeridoo: 'pumpkin',
        cow_bell: 'soul_sand',
        iron_xylophone: 'iron_block',
        xylophone: 'bone_block',
        guitar: 'white_wool',
        chime: 'packed_ice',
        flute: 'clay',
        bell: 'gold_block',
        basedrum: 'stone',
        hat: 'glass',
        snare: 'sand',
        bass: 'oak_planks',
        harp: 'air'
    };

    bot.music.noteBlocks = [];

    bot.music.DetectNoteblocks = (point = bot.entity.position) => {
        let nblocks = bot.findBlocks({
            matching: bot.mcData.blocksByName.note_block.id,
            point: point,
            maxDistance: 12,
            count: 18
        })

        let min = new Vec3(
            Math.min.apply(Math.min, nblocks.map(e => e.x)),
            Math.min.apply(Math.min, nblocks.map(e => e.y)),
            Math.min.apply(Math.min, nblocks.map(e => e.z))
        );

        nblocks = nblocks.sort((a, b) => a.z - b.z).sort((a, b) => a.y - b.y)

        bot.music.noteBlocks = nblocks.map(e => {
            return bot.music.GetNoteBlock(bot.blockAt(e));
        })
    }
    bot.music.HitBlock = (position, forceLook = false) => {
        return async () => {
            await bot.lookAt(position, forceLook)
            bot._client.write('block_dig', {
                status: 0,
                location: position,
                face: 1
            });
            bot.swingArm(bot.settings.mainHand);
            bot._client.write('block_dig', {
                status: 1,
                location: position,
                face: 1
            });
        }
    }
    bot.music.FastActivateBlock = (block) => {
        return () => { // The packet needs a number as the direction

            const direction = new Vec3(0, 1, 0)
            const directionNum = vectorToDirection(direction) // The packet needs a number as the direction
            const cursorPos = new Vec3(0.5, 0.5, 0.5);
            if (bot.supportFeature('blockPlaceHasHeldItem')) {
                bot._client.write('block_place', {
                    location: block.position,
                    direction: directionNum,
                    heldItem: Item.toNotch(bot.heldItem),
                    cursorX: cursorPos.scaled(16).x,
                    cursorY: cursorPos.scaled(16).y,
                    cursorZ: cursorPos.scaled(16).z
                })
            } else if (bot.supportFeature('blockPlaceHasHandAndIntCursor')) {
                bot._client.write('block_place', {
                    location: block.position,
                    direction: directionNum,
                    hand: 0,
                    cursorX: cursorPos.scaled(16).x,
                    cursorY: cursorPos.scaled(16).y,
                    cursorZ: cursorPos.scaled(16).z
                })
            } else if (bot.supportFeature('blockPlaceHasHandAndFloatCursor')) {
                bot._client.write('block_place', {
                    location: block.position,
                    direction: directionNum,
                    hand: 0,
                    cursorX: cursorPos.x,
                    cursorY: cursorPos.y,
                    cursorZ: cursorPos.z
                })
            } else if (bot.supportFeature('blockPlaceHasInsideBlock')) {
                bot._client.write('block_place', {
                    location: block.position,
                    direction: directionNum,
                    hand: 0,
                    cursorX: cursorPos.x,
                    cursorY: cursorPos.y,
                    cursorZ: cursorPos.z,
                    insideBlock: false
                })
            }
            bot.swingArm(bot.settings.mainHand);

            function vectorToDirection(v) {
                if (v.y < 0) {
                    return 0
                } else if (v.y > 0) {
                    return 1
                } else if (v.z < 0) {
                    return 2
                } else if (v.z > 0) {
                    return 3
                } else if (v.x < 0) {
                    return 4
                } else if (v.x > 0) {
                    return 5
                }
            }
        }
    }
    bot.music.TuneNoteBlock = (nblock, note) => {
        return async () => {
            if (nblock.note == note) return;

            note %= 25;

            await bot.lookAt(nblock.position);

            const block = bot.blockAt(nblock.position);

            var tasks: Action[] = [];
            var delays: number[] = [];

            let hits = note - nblock.note;
            if (nblock.note > note) hits = (25 - nblock.note) + note;

            for (let h = 0; h < hits; h++) {
                tasks.push(bot.music.FastActivateBlock(block));
                delays.push(149.6)
            }

            bot.taskManager.InsertQueue("TuneNoteBlock", tasks, false, delays);
        }
    }
    bot.music.TuneNoteBlocks = (notes) => {
        return () => {
            var tasks: Action[] = [];

            const unusedNoteBlocks = bot.music.noteBlocks.filter((a, index, array) => notes.find(b => b == a.note) == null || array.indexOf(a) != index);
            notes = notes.filter(a => bot.music.noteBlocks.find(b => b.note == a) == null);

            if (notes.length > unusedNoteBlocks.length) console.warn("Not enough note blocks to play all the notes!");

            for (let i = 0; i < unusedNoteBlocks.length; i++) {
                if (i == notes.length) break;
                tasks.push(bot.music.TuneNoteBlock(unusedNoteBlocks[i], notes[i]))
            }
            tasks.push(() => bot.music.DetectNoteblocks())

            bot.taskManager.InsertQueue("TuneInstrument", tasks);
        }
    }
    bot.music.Play = (song) => {
        return () => {
            var tasks: Action[] = [];
            var delays: number[] = [];
            var names: string[] = [];

            for (let i = 0; i < song.notes.length; i++) {
                delays.push(i > 0 ? song.time * song.notes[i - 1].duration : 0);
                const note = song.notes[i];

                if (note.note == -1) {
                    tasks.push(() => { })
                    names.push("PlayPause")
                }
                else {
                    let noteBlock = bot.music.noteBlocks.find(e => e.note == note.note);
                    if (noteBlock == null) noteBlock = bot.music.noteBlocks.reduce((a, b) => Math.abs(a.note - note.note) < Math.abs(b.note - note.note) ? a : b);
                    tasks.push(bot.music.HitBlock(noteBlock.position, true))
                    names.push("Play " + bot.music.NoteBlockData.GetNoteFromNoteIndex(noteBlock.note))
                }
            }

            names.push("Bow")
            tasks.push(() => bot.setControlState("sneak", true))
            delays.push(500);
            names.push("Bow")
            tasks.push(() => bot.setControlState("sneak", false))
            delays.push(500);
            names.push("Bow")
            tasks.push(() => bot.setControlState("sneak", true))
            delays.push(500);
            names.push("Bow")
            tasks.push(() => bot.setControlState("sneak", false))
            delays.push(500);

            bot.taskManager.InsertQueue(names, tasks, false, delays);
        }
    }
    bot.music.LoadSong = (path) => {
        let textMidi: string[] = readFileSync(path, "utf-8").split("\n").filter(e => !e.startsWith("# ")).map(e => e.replace("\r", ""));

        const time = parseInt(textMidi[0]);
        textMidi = textMidi.splice(1)

        let currentSection: string[] = [" "]
        for (let i = 0; i < textMidi.length; i++) {
            const line = textMidi[i];
            if (line == '') currentSection = [""]
            else if (line.startsWith("R")) {
                textMidi.splice(i, 1)

                const count = parseInt(line.substring(1));
                for (let seR = 0; seR < count; seR++)
                    textMidi = textMidi.slice(0, i).concat(currentSection).concat(textMidi.slice(i))
                i += currentSection.length * count;
                currentSection = [""]
            }
            else {
                currentSection.push(line);
            }
        }

        console.log(textMidi.join("\r\n"));

        let notes: { note: number, duration: number }[] = textMidi.map(e => {
            const curr = e.split(" ");
            const dur = parseFloat(curr[2])

            const note = bot.music.NoteBlockData.GetNoteIndexFromNote(curr[0])[parseInt(curr[1])] || -2;

            return {
                note: note,
                duration: curr[2] ? dur : 0,
            }
        })

        return {
            time: time,
            notes: notes
        }
    }

    bot.music.GetNoteBlock = (block) => {
        const TypeValueRaw = Math.floor(block.metadata / 50) * 50 + 1;
        return {
            position: block.position,
            type: bot.music.NoteBlockData.BlockToName[bot.music.NoteBlockData.NumberToBlock[TypeValueRaw]],
            note: (block.metadata - TypeValueRaw) / 2
        } as NoteBlock;
    }
    bot.music.NoteBlockData.GetNoteFromNoteIndex = (index) => {
        const offset = Math.floor(index / Notes.length)
        return Notes[index % Notes.length] + " " + offset;
    }
    bot.music.NoteBlockData.GetNoteIndexFromNote = (note) => {
        const result = []
        note = note.toLowerCase();
        for (let i = 0; i < 3; i++) {
            const value = Notes.indexOf(note) + Notes.length * i
            if (value == -1 || value >= 25) return result;
            result.push(value)
        }
        return result;
    }
}

function InvertObject(obj: Object) {
    const keys = Object.keys(obj)
    const values = Object.values(obj)

    return Object.fromEntries(keys.map((e, i) => [values[i], e]))
}